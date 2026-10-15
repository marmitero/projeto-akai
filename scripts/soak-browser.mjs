import { chromium } from "playwright";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { cpus, platform, arch } from "node:os";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  LocalSnapshotSchema,
  newLoopState,
  CONFIG_VERSION,
  createEquipment,
} from "../packages/shared/dist/index.js";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../", import.meta.url));
const requireClient = createRequire(
  new URL("../apps/client/package.json", import.meta.url),
);
const vite = resolve(
  dirname(requireClient.resolve("vite/package.json")),
  "bin/vite.js",
);
const server = spawn(
  process.execPath,
  [vite, "preview", "--host", "127.0.0.1", "--port", "5185", "--strictPort"],
  { cwd: resolve(root, "apps/client"), stdio: "ignore" },
);
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:5185")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.env.AKAI_BROWSER_EXECUTABLE
      ? {
          executablePath: process.env.AKAI_BROWSER_EXECUTABLE,
          args: [
            "--no-sandbox",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--disable-dev-shm-usage",
            "--no-zygote",
          ],
        }
      : {}),
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5185");
  await page.locator("#game[data-load-status=ready]").waitFor();
  // Funded fixture stresses bounded inventory/DOM, not organic progression or grants.
  const payload = LocalSnapshotSchema.parse({
    ...newLoopState(),
    schemaVersion: 3,
    configVersion: CONFIG_VERSION,
    mode: "local",
    generation: 0,
    savedAt: Date.now(),
    lastReconciledAt: Date.now(),
    profile: { id: "local-test", name: "Soak RPG" },
    screen: "mine",
    activeMs: 0,
    balances: {
      coin: "1000000000000000",
      iron: "1000000000000000",
      coal: "1000000000000000",
      gold: "1000000000000000",
      jade: "1000000000000000",
      ruby: "0",
    },
  });
  payload.battle.highest = 999;
  payload.rpg.heroXp = 100000000;
  payload.rpg.accountXp = 20000000;
  payload.rpg.castIron = "1000000000000";
  payload.rpg.petLevel = 100;
  payload.rpg.petActive = true;
  payload.rpg.goldLevel = 1;
  payload.rpg.jadeLevel = 1;
  for (let i = 0; i < 120; i++)
    payload.rpg.inventory.push(
      createEquipment(payload, "sword", 100, "common"),
    );
  const raw = JSON.stringify({
    formatVersion: 1,
    payload,
    checksum: createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex"),
  });
  await page.evaluate(async (raw) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("akai-local", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
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
  await page.evaluate(() => {
    window.__akaiFps = { frames: 0, start: performance.now() };
    const frame = () => {
      window.__akaiFps.frames++;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  const cdp = await page.context().newCDPSession(page);
  const samples = [];
  const minutes = Number(process.env.AKAI_SOAK_MINUTES ?? 30),
    start = Date.now();
  let cycles = 0;
  while (Date.now() - start < minutes * 60000) {
    await page.evaluate(() => {
      const click = (s) => {
        const e = document.querySelector(s);
        if (e && !e.disabled && !e.hidden) e.click();
      };
      click("[data-route=mine]");
      for (let i = 0; i < 3; i++) click("#mine-target");
      click("[data-upgrade=click]");
      click("[data-route=production]");
      click("[data-upgrade=coal]");
      click("[data-route=battle]");
      click("[data-upgrade=attack]");
      click("[data-upgrade=vitality]");
      click("#train-battle");
      click("#retry-battle");
      click("#more");
      click("[data-shortcut=bag]");
      click("[data-rpg-tab=forge]");
      const tier = document.querySelector("#craft-level");
      tier.value = "100";
      tier.dispatchEvent(new Event("change", { bubbles: true }));
      click("[data-rpg-action=craft][data-definition=sword]");
      click("[data-rpg-action=attackTonic]");
      click("[data-rpg-action=productionTonic]");
      click("[data-rpg-tab=equipment]");
      click("[data-rpg-action=equip][data-slot=weapon]:not(:disabled)");
      if (
        document.querySelector("#inventory-capacity").textContent === "120/120"
      )
        click("[data-rpg-action=salvage]:not(:disabled)");
      click("[data-route=battle]");
    });
    cycles++;
    if (samples.length === 0 || Date.now() - start >= samples.length * 60000) {
      await cdp.send("HeapProfiler.collectGarbage");
      const heap = await cdp.send("Runtime.getHeapUsage"),
        dom = await cdp.send("Memory.getDOMCounters");
      const visual = await page.evaluate(() => {
        const game = document.querySelector("#game"),
          f = window.__akaiFps,
          now = performance.now(),
          fps = (f.frames * 1000) / (now - f.start);
        f.frames = 0;
        f.start = now;
        return {
          inventoryCount: Number(
            document
              .querySelector("#inventory-capacity")
              .textContent.split("/")[0],
          ),
          textures: game.dataset.textureCount,
          objects: game.dataset.objectCount,
          fps,
        };
      });
      samples.push({
        elapsedMs: Date.now() - start,
        cycles,
        usedHeapBytes: heap.usedSize,
        documents: dom.documents,
        nodes: dom.nodes,
        listeners: dom.jsEventListeners,
        ...visual,
      });
      console.log(JSON.stringify(samples.at(-1)));
      assert.equal(visual.textures, "35");
      assert.equal(visual.objects, "38");
      assert.deepEqual(errors, []);
    }
    await page.waitForTimeout(1000);
  }
  const stable = samples.slice(2);
  assert.ok(
    stable.every((s) => s.inventoryCount >= 119),
    "inventory stress fixture not exercised",
  );
  assert.ok(
    Math.max(...stable.map((s) => s.listeners)) <= stable[0].listeners + 2,
    "listener accumulation",
  );
  assert.ok(
    stable.at(-1).listeners <= stable[0].listeners + 1,
    "sustained listener growth",
  );
  assert.ok(
    stable.at(-1).usedHeapBytes < stable[0].usedHeapBytes + 5 * 1024 * 1024,
    "sustained heap growth",
  );
  const report = {
    browser: browser.version(),
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0]?.model,
    rendering: process.env.AKAI_BROWSER_EXECUTABLE
      ? "headless software"
      : "headless default",
    configVersion: CONFIG_VERSION,
    scenario:
      "funded RPG inventory120/craft/equip/salvage/mines/tonics/navigation; no organic pace claim",
    requestedMinutes: minutes,
    actualElapsedMs: Date.now() - start,
    cycles,
    errors,
    samples,
  };
  await writeFile(
    resolve(root, "docs/phase4-browser-soak.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify({ soak: "passed", minutes, cycles }));
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
