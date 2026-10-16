import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import {
  LocalSnapshotSchema,
  newLoopState,
  startEncounter,
  CONFIG_VERSION,
} from "../packages/shared/dist/index.js";
const preview = process.argv.includes("--preview"),
  port = 5190,
  url = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    ...(preview ? ["preview"] : []),
    "apps/client",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ],
  { env: { ...process.env, VITE_GAME_MODE: "local" }, stdio: "ignore" },
);
let browser;
try {
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.env.AKAI_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.AKAI_CHROMIUM_EXECUTABLE }
      : {}),
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage({ viewport: { width: 480, height: 960 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.locator("#game[data-load-status=ready]").waitFor();
  const fixture = (floor = 1) => {
    const s = LocalSnapshotSchema.parse({
      ...newLoopState(),
      schemaVersion: 3,
      configVersion: CONFIG_VERSION,
      mode: "local",
      generation: 0,
      savedAt: Date.now(),
      lastReconciledAt: Date.now(),
      profile: { id: "local-test", name: "Polimento" },
      screen: "battle",
      activeMs: 0,
      balances: {
        coin: "0",
        iron: "0",
        coal: "0",
        gold: "0",
        jade: "0",
        ruby: "0",
      },
    });
    startEncounter(s, floor);
    return s;
  };
  async function seed(s) {
    const payload = LocalSnapshotSchema.parse(s),
      raw = JSON.stringify({
        formatVersion: 1,
        payload,
        checksum: createHash("sha256")
          .update(JSON.stringify(payload))
          .digest("hex"),
      });
    await page.evaluate(async (raw) => {
      const db = await new Promise((resolve, reject) => {
        const r = indexedDB.open("akai-local", 1);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction("snapshots", "readwrite");
        tx.objectStore("snapshots").put(raw, "current");
        tx.oncomplete = resolve;
        tx.onabort = reject;
      });
      db.close();
    }, raw);
    await page.reload();
    await page.locator("#game[data-load-status=ready]").waitFor();
  }
  const data = () => page.locator("#game").evaluate((e) => ({ ...e.dataset }));
  await seed(fixture());
  await page.waitForFunction(
    () => document.querySelector("#game")?.dataset.enemiesArriving === "true",
  );
  const entry = await data();
  assert.ok(
    JSON.parse(entry.enemyPositions)[0] > JSON.parse(entry.enemyTargets)[0],
  );
  await page.waitForFunction(
    () => document.querySelector("#game")?.dataset.enemiesArriving === "false",
  );
  const settled = await data();
  assert.equal(Number(settled.contactGap), 16);
  assert.ok(Math.abs(JSON.parse(settled.enemyPositions)[0] - 158.5) < 1);
  // Tutorial is hidden only in this visual fixture; production onboarding remains unchanged.
  await page.locator("#tutorial").evaluate((e) => (e.style.display = "none"));
  await page.locator(".stage-frame").scrollIntoViewIfNeeded();
  await mkdir(
    `docs/${process.env.AKAI_POLISH_SCREENSHOTS ?? "polish-screenshots"}`,
    { recursive: true },
  );
  await page
    .locator(".stage-frame")
    .screenshot({
      path: `docs/${process.env.AKAI_POLISH_SCREENSHOTS ?? "polish-screenshots"}/contact.png`,
    });
  await page.waitForFunction(
    () =>
      Number(document.querySelector("#game")?.dataset.damageFeedbackCount) > 0,
  );
  await page
    .locator(".stage-frame")
    .screenshot({
      path: `docs/${process.env.AKAI_POLISH_SCREENSHOTS ?? "polish-screenshots"}/damage.png`,
    });
  const transition = fixture();
  transition.battle.enemies.forEach((e) => (e.hp = 0));
  transition.battle.phase = "transition";
  transition.battle.transitionAt = transition.battle.time + 3000;
  await seed(transition);
  const offset = Number((await data()).parallaxOffset);
  await page.waitForTimeout(250);
  assert.ok(Number((await data()).parallaxOffset) > offset);
  await page.locator("#pause-battle").click();
  await page.waitForTimeout(100);
  const stopped = Number((await data()).parallaxOffset);
  await page.waitForTimeout(300);
  assert.equal(Number((await data()).parallaxOffset), stopped);
  await seed(fixture(10));
  await page.waitForFunction(
    () => document.querySelector("#game")?.dataset.enemiesArriving === "false",
  );
  assert.equal(Number((await data()).contactGap), 22);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(fixture());
  await page.waitForTimeout(200);
  const reduced = await data();
  assert.equal(reduced.enemiesArriving, "false");
  assert.ok(Math.abs(JSON.parse(reduced.enemyPositions)[0] - 158.5) < 1);
  await seed(transition);
  const still = Number((await data()).parallaxOffset);
  await page.waitForTimeout(250);
  assert.equal(Number((await data()).parallaxOffset), still);
  assert.deepEqual(errors, []);
  const result = {
    passed: true,
    mode: preview ? "preview" : "dev",
    fixture: "Isolated local saves, not a human playtest.",
    checks: [
      "enemy-entry-from-right",
      "melee-silhouette-gap-16",
      "boss-silhouette-gap-22",
      "confirmed-damage-feedback",
      "transition-parallax",
      "pause-stops-parallax",
      "reduced-motion-snap-and-static-background",
    ],
    entryPositions: JSON.parse(entry.enemyPositions),
    settledPositions: JSON.parse(settled.enemyPositions),
    textures: settled.textureCount,
    objects: settled.objectCount,
    pageErrors: errors,
  };
  await writeFile(
    `docs/${process.env.AKAI_POLISH_EVIDENCE ?? "polish-battle-p1"}-${preview ? "preview" : "dev"}.json`,
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
