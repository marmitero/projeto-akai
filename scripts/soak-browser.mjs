import { chromium } from "playwright";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { cpus, platform, arch } from "node:os";
import { writeFile } from "node:fs/promises";
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
  [vite, "preview", "--host", "127.0.0.1", "--port", "5184", "--strictPort"],
  { cwd: resolve(root, "apps/client"), stdio: "ignore" },
);
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:5184")).ok) break;
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
  await page.goto("http://127.0.0.1:5184");
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
      assert.equal(visual.textures, "34");
      assert.equal(visual.objects, "37");
      assert.deepEqual(errors, []);
    }
    await page.waitForTimeout(1000);
  }
  const stable = samples.slice(2);
  assert.ok(stable.every((s) => s.listeners === stable[0].listeners));
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
    requestedMinutes: minutes,
    actualElapsedMs: Date.now() - start,
    cycles,
    errors,
    samples,
  };
  await writeFile(
    resolve(root, "docs/phase3-browser-soak.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify({ soak: "passed", minutes, cycles }));
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
