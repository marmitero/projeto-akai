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
  port = 5192,
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
  // Keep the first boot write open so naming must queue behind a real IndexedDB transaction.
  await page.addInitScript(() => {
    if (sessionStorage.getItem("hud-save-gated")) return;
    sessionStorage.setItem("hud-save-gated", "1");
    const put = IDBObjectStore.prototype.put;
    let first = true;
    IDBObjectStore.prototype.put = function (value, key) {
      const request = put.call(this, value, key);
      if (first && this.name === "snapshots" && key === "current") {
        first = false;
        window.__hudSaveBlocked = true;
        const until = Date.now() + 10000;
        const pump = () => {
          if (window.__hudReleaseSave || Date.now() >= until) return;
          const keepAlive = this.get("current");
          keepAlive.onsuccess = pump;
        };
        pump();
      }
      return request;
    };
  });
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
  await page.waitForFunction(() => window.__hudSaveBlocked === true);
  await page.locator("#starting-name").fill("Jao Teste");
  await page.locator("#nickname-setup button").click();
  assert.equal(
    await page.locator("#profile-name-status").textContent(),
    "Salvando nick…",
  );
  await page.evaluate(() => {
    window.__hudReleaseSave = true;
  });
  await page.waitForFunction(
    () =>
      document.querySelector("#profile-name-status").textContent ===
      "Nick salvo.",
  );
  await page.reload();
  await page.locator("#game[data-load-status=ready]").waitFor();
  assert.equal(await page.locator("#player-name").textContent(), "Jao Teste");
  assert.equal(await page.locator("#nickname-setup").isVisible(), false);
  await page.locator("#profile-open").click();
  await page.locator("#profile-name-form input").fill("Novo Guerreiro");
  await page.locator("#profile-name-form button").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#profile-name-status").textContent ===
      "Nick salvo.",
  );
  await page.locator("#close-dialog").click();
  await page.reload();
  await page.locator("#game[data-load-status=ready]").waitFor();
  assert.equal(
    await page.locator("#player-name").textContent(),
    "Novo Guerreiro",
  );
  const layouts = [];
  const screenshotDir =
    process.env.AKAI_HUD_SCREENSHOTS ?? "docs/polish-p2-screenshots";
  await mkdir(screenshotDir, { recursive: true });
  for (const [width, height] of [
    [320, 640],
    [360, 740],
    [390, 844],
    [768, 1024],
  ]) {
    await seed(fixture());
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    const layout = await page.evaluate(() => {
      const content = document.querySelector("#content"),
        last = document.querySelector(".stage-frame").getBoundingClientRect(),
        nav = document.querySelector(".bottom-hud").getBoundingClientRect();
      return {
        width: innerWidth,
        height: innerHeight,
        scroll: content.scrollHeight - content.clientHeight,
        arenaWidth: last.width,
        availableWidth: document
          .querySelector("#visual-area")
          .getBoundingClientRect().width,
        navTop: nav.top,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.equal(layout.overflow, false);
    assert.ok(
      Math.abs(layout.arenaWidth - layout.availableWidth) < 1,
      JSON.stringify(layout),
    );
    assert.equal(
      await page.locator("[data-upgrade=vitality]").isVisible(),
      false,
    );
    assert.equal(await page.locator(".wallet-item").count(), 5);
    assert.equal(await page.locator("#player-guild").isVisible(), false);
    assert.equal(await page.locator(".page-heading").isVisible(), false);
    layouts.push(layout);
    await page.waitForFunction(
      () => document.querySelector("#game").dataset.enemiesArriving === "false",
    );
    await page.screenshot({
      path: `${screenshotDir}/battle-${width}.png`,
    });
  }
  for (const [floor, expected] of [
    [1, [1, 2, 3]],
    [500, [498, 499, 500, 501, 502]],
    [1000, [998, 999, 1000]],
  ]) {
    await seed(fixture(floor));
    assert.deepEqual(
      await page
        .locator("#floor-banner li")
        .evaluateAll((es) => es.map((e) => Number(e.dataset.floor))),
      expected,
    );
    assert.equal(
      await page.locator("#floor-banner [aria-current]").textContent(),
      String(floor),
    );
    assert.equal(
      await page.locator("#game").getAttribute("data-health-bar-count"),
      "4",
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(fixture(10));
  await page.waitForFunction(
    () => document.querySelector("#game").dataset.enemiesArriving === "false",
  );
  await page.screenshot({ path: `${screenshotDir}/boss.png` });
  await page.locator("#resources").click();
  assert.equal(await page.locator("#dialog-resources").isVisible(), true);
  await page.locator("#close-dialog").click();
  assert.deepEqual(errors, []);
  const result = {
    passed: true,
    mode: preview ? "preview" : "dev",
    checks: [
      "nickname-first-start-and-reload",
      "nickname-queued-during-indexeddb-write",
      "nickname-edit-through-portrait",
      "five-sprite-resources",
      "no-empty-guild-line",
      "full-width-arena-and-upgrades-in-dedicated-screen",
      "floor-window-boundaries",
      "in-arena-health-bars",
      "resource-details-accessible",
    ],
    layouts,
    pageErrors: errors,
  };
  await writeFile(
    `docs/${process.env.AKAI_HUD_EVIDENCE ?? "polish-battle-p2"}-${preview ? "preview" : "dev"}.json`,
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
