import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const preview = process.argv.includes("--preview");
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", ...(preview ? ["preview"] : []), "apps/client", "--host", "127.0.0.1", "--port", "5195", "--strictPort"], { stdio: "ignore", env: { ...process.env, VITE_GAME_MODE: "local" } });
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch("http://127.0.0.1:5195")).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.AKAI_CHROMIUM_EXECUTABLE ? { executablePath: process.env.AKAI_CHROMIUM_EXECUTABLE } : {}), args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage();
  const errors = [], results = [];
  page.on("pageerror", e => errors.push(e.message));
  await mkdir("docs/polish-p5-screenshots", { recursive: true });
  for (const [width, height] of [[484, 730], [320, 640], [390, 844], [844, 390], [1280, 800]]) {
    await page.setViewportSize({ width, height });
    await page.goto("http://127.0.0.1:5195");
    await page.locator("#game[data-load-status=ready]").waitFor();
    await page.waitForTimeout(400);
    const sizes = await page.evaluate(() => {
      const stage = document.querySelector(".stage-frame").getBoundingClientRect();
      const area = document.querySelector("#visual-area").getBoundingClientRect();
      const canvas = document.querySelector("#game canvas").getBoundingClientRect();
      return { stageWidth: stage.width, stageHeight: stage.height, areaWidth: area.width, canvasWidth: canvas.width, canvasHeight: canvas.height, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert(Math.abs(sizes.stageWidth - sizes.areaWidth) < 1);
    assert(Math.abs(sizes.stageWidth / sizes.stageHeight - 384 / 300) < 0.02);
    assert(Math.abs(sizes.canvasWidth - (sizes.stageWidth - 4)) < 2);
    assert(!sizes.overflow);
    results.push({ width, height, ...sizes });
    if (width === 484) await page.screenshot({ path: "docs/polish-p5-screenshots/full-width-arena.png" });
  }
  assert.deepEqual(errors, []);
  await writeFile(`docs/polish-battle-p5-${preview ? "preview" : "dev"}.json`, JSON.stringify({ viewports: results, pageErrors: errors }, null, 2) + "\n");
  console.log(JSON.stringify(results));
} finally {
  await browser?.close();
  server.kill();
}
