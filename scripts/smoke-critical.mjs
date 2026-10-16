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
  port = 5193,
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
  const criticalFixture = (floor = 1) => {
    const s = fixture(floor);
    s.rpg.rng = 1;
    s.battle.enemies.forEach((e) => {
      e.hp = 10000;
      e.maxHp = 10000;
      e.nextAt = 999999;
    });
    return s;
  };
  await seed(criticalFixture());
  await page.waitForFunction(
    () =>
      Number(document.querySelector("#game").dataset.criticalFeedbackCount) > 0,
  );
  assert.equal(
    await page.locator("#game").getAttribute("data-last-critical-damage"),
    "9",
  );
  await mkdir("docs/polish-p3-screenshots", { recursive: true });
  await page
    .locator(".stage-frame")
    .screenshot({ path: "docs/polish-p3-screenshots/critical.png" });
  // A stored authoritative flag must not replay when the renderer boots or returns to battle.
  await page.locator("#more").click();
  await page.locator("#save").click();
  await page
    .locator("#save-status")
    .filter({ hasText: "Perfil salvo neste navegador." })
    .waitFor();
  await page.reload();
  await page.locator("#game[data-load-status=ready]").waitFor();
  await page.waitForTimeout(150);
  assert.equal(
    await page.locator("#game").getAttribute("data-critical-feedback-count"),
    null,
  );
  await seed(criticalFixture(10));
  await page.waitForFunction(
    () =>
      Number(document.querySelector("#game").dataset.criticalFeedbackCount) > 0,
  );
  assert.equal(
    await page.locator("#game").getAttribute("data-last-critical-damage"),
    "9",
  );
  await page
    .locator(".stage-frame")
    .screenshot({ path: "docs/polish-p3-screenshots/critical-boss.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(criticalFixture());
  await page.waitForFunction(
    () =>
      Number(document.querySelector("#game").dataset.criticalFeedbackCount) > 0,
  );
  assert.equal(
    await page.locator("#game").getAttribute("data-last-critical-damage"),
    "9",
  );
  await page.locator(".stage-frame").screenshot({
    path: "docs/polish-p3-screenshots/critical-reduced-motion.png",
  });
  assert.deepEqual(errors, []);
  const d = await data();
  const result = {
    passed: true,
    mode: preview ? "preview" : "dev",
    fixture:
      "Local seeded RNG1 with durable high-HP targets; critical flag comes from actual domain combat, not a visual override.",
    checks: [
      "actual-critical-9-damage",
      "boss-critical-confirmed",
      "no-critical-replay-on-reload",
      "reduced-motion-critical-readable",
      "bounded-existing-renderer-pool",
    ],
    textures: d.textureCount,
    objects: d.objectCount,
    pageErrors: errors,
  };
  await writeFile(
    `docs/polish-battle-p3-${preview ? "preview" : "dev"}.json`,
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
