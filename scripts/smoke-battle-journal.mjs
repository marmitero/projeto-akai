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
  port = 5196,
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
  await mkdir("docs/polish-p7-screenshots", { recursive: true });
  const s = fixture();
  s.upgrades.attack = 100;
  await seed(s);
  await page.waitForFunction(
    () =>
      document.querySelectorAll("#battle-system-log li[data-kind=victory]")
        .length === 1,
  );
  await page.locator("#pause-battle").click();
  const initial = await page.locator("#battle-system-log li").allTextContents();
  assert.equal(initial.length, 4);
  assert(
    initial.some((t) => t.includes("Coins") && t.includes("XP do guerreiro")),
  );
  await page.waitForTimeout(250);
  await page.reload();
  await page.locator("#game[data-load-status=ready]").waitFor();
  assert.deepEqual(
    await page.locator("#battle-system-log li").allTextContents(),
    initial,
  );
  await page.locator("#battle-tab-global").click();
  assert.equal(await page.locator("#battle-global").isVisible(), true);
  assert.equal(await page.locator("#battle-global-form").isVisible(), false);
  await page.locator("#battle-tab-global").press("ArrowRight");
  assert.equal(
    await page.locator("#battle-tab-system").getAttribute("aria-selected"),
    "true",
  );
  await page.locator("[data-route=mine]").click();
  assert.equal(await page.locator("#battle-chat").isVisible(), false);
  await page.locator("[data-route=battle]").click();
  assert.deepEqual(
    await page.locator("#battle-system-log li").allTextContents(),
    initial,
  );
  const bounded = fixture();
  bounded.upgrades.attack = 100;
  bounded.battle.reportSerial = 60;
  bounded.battle.reports = Array.from({ length: 60 }, (_, i) => ({
    id: i + 1,
    kind: "reward",
    floor: 1,
    wave: 1,
    coin: "1250",
    iron: "0",
    heroXp: 10,
    accountXp: 2,
    loot: "<img src=x onerror=alert(1)>",
  }));
  await seed(bounded);
  await page.locator("#battle-system-log").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForFunction(
    () => !!document.querySelector('#battle-system-log [data-report-id="61"]'),
  );
  assert.equal(await page.locator("#battle-system-log li").count(), 60);
  assert.equal(await page.locator("#battle-system-log img").count(), 0);
  assert.equal(await page.locator("#battle-log-latest").isVisible(), true);
  assert(
    (await page.locator("#battle-system-log").evaluate((el) => el.scrollTop)) <
      5,
  );
  await page.locator("#battle-log-latest").click();
  assert.equal(await page.locator("#battle-log-latest").isVisible(), false);
  for (const [width, height] of [
    [320, 640],
    [390, 844],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.equal(await page.locator("#battle-tab-system").isVisible(), true);
  }
  const defeat = fixture(10);
  defeat.battle.heroHp = 1;
  defeat.battle.heroNextAt = 1000000;
  defeat.battle.enemies[0].nextAt = 1;
  await seed(defeat);
  await page.locator("#battle-system-log li[data-kind=defeat]").waitFor();
  assert(
    (await page.locator("#battle-system-log").textContent()).includes(
      "Andar 10",
    ),
  );
  const timeout = fixture(10);
  timeout.battle.deadline = 100;
  timeout.battle.heroNextAt = 1000000;
  timeout.battle.enemies[0].nextAt = 1000000;
  await seed(timeout);
  await page.locator("#battle-system-log li[data-kind=timeout]").waitFor();
  await page.setViewportSize({ width: 484, height: 730 });
  await page.screenshot({
    path: `docs/polish-p7-screenshots/timeout-${preview ? "preview" : "dev"}.png`,
  });
  await seed(s);
  await page.waitForFunction(
    () =>
      document.querySelectorAll("#battle-system-log li[data-kind=victory]")
        .length === 1,
  );
  await page.screenshot({
    path: `docs/polish-p7-screenshots/rewards-${preview ? "preview" : "dev"}.png`,
  });
  const fit = await page.evaluate(() => ({
    panelBottom: document.querySelector('#battle-chat').getBoundingClientRect().bottom,
    navTop: document.querySelector('.bottom-hud').getBoundingClientRect().top,
  }));
  assert(fit.panelBottom <= fit.navTop, JSON.stringify(fit));
  assert.deepEqual(errors, []);
  const result = {
    passed: true,
    mode: preview ? "preview" : "dev",
    rewardAndVictory: true,
    saveReloadWithoutDuplication: true,
    tabsAndKeyboard: true,
    globalLocalUnavailable: true,
    boundedHistory: 60,
    maliciousLootTextSafe: true,
    manualScrollPreserved: true,
    newResultsButton: true,
    defeatAndTimeout: true,
    viewports: [320, 390, 844],
    pageErrors: errors,
  };
  await writeFile(
    `docs/polish-battle-p7-${preview ? "preview" : "dev"}.json`,
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
