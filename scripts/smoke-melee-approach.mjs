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
  port = 5194,
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
  const meleeFixture = () => {
    const s = fixture();
    s.upgrades.vitality = 100;
    s.battle.heroHp = 1600;
    s.battle.enemies.forEach((e) => {
      e.hp = 10000;
      e.maxHp = 10000;
    });
    return s;
  };
  const motions = () =>
    page
      .locator("#game")
      .evaluate((e) => JSON.parse(e.dataset.meleeMotions ?? "[]"));
  await seed(meleeFixture());
  await page.waitForFunction(
    () =>
      JSON.parse(
        document.querySelector("#game").dataset.meleeMotions ?? "[]",
      ).some((m) => m?.enemy === 2 && m.phase === "attack") &&
      JSON.parse(document.querySelector("#game").dataset.enemyPositions)[0] >
        210,
  );
  const attacking = await motions();
  assert.equal(attacking[2].gap, 16);
  assert.ok(
    Number(
      await page.locator("#game").getAttribute("data-hero-hit-contact-gap"),
    ) <= 17,
  );
  await mkdir("docs/polish-p4-screenshots", { recursive: true });
  await page
    .locator(".stage-frame")
    .screenshot({ path: "docs/polish-p4-screenshots/rear-enemy-contact.png" });
  await page.locator("#pause-battle").click();
  const before = await page
    .locator("#game")
    .getAttribute("data-enemy-positions");
  await page.waitForTimeout(250);
  assert.equal(
    await page.locator("#game").getAttribute("data-enemy-positions"),
    before,
  );
  await page.locator("#pause-battle").click();
  await page.waitForFunction(
    () =>
      !JSON.parse(
        document.querySelector("#game").dataset.meleeMotions ?? "[]",
      ).some(Boolean),
  );
  assert.deepEqual(
    JSON.parse(
      await page.locator("#game").getAttribute("data-enemy-positions"),
    ),
    [158.5, 216.5, 274.5],
  );
  assert.ok(
    Number(
      await page.locator("#game").getAttribute("data-melee-attack-count"),
    ) >= 3,
  );
  await seed(meleeFixture());
  await page.waitForFunction(() =>
    JSON.parse(
      document.querySelector("#game").dataset.meleeMotions ?? "[]",
    ).some(Boolean),
  );
  await page.locator("#more").click();
  assert.deepEqual(await motions(), []);
  await page.locator("#close-dialog").click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(meleeFixture());
  await page.waitForTimeout(2300);
  assert.deepEqual(await motions(), []);
  assert.equal(
    await page.locator("#game").getAttribute("data-melee-attack-count"),
    null,
  );
  assert.deepEqual(errors, []);
  const d = await page.locator("#game").evaluate((e) => ({ ...e.dataset }));
  const result = {
    passed: true,
    mode: preview ? "preview" : "dev",
    fixture:
      "Local resistant targets and upgraded vitality; engine schedules unchanged.",
    checks: [
      "rear-enemy-reaches-melee-contact-before-swing",
      "hero-target-in-reach-at-confirmed-hit",
      "return-to-formation",
      "pause-freezes-approach",
      "overlay-cancels-pending-visual-attack",
      "reduced-motion-skips-lunge",
    ],
    attacking,
    textures: d.textureCount,
    objects: d.objectCount,
    pageErrors: errors,
  };
  await writeFile(
    `docs/polish-battle-p4-${preview ? "preview" : "dev"}.json`,
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
