import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const requireClient = createRequire(new URL('../apps/client/package.json', import.meta.url));
const viteBin = resolve(dirname(requireClient.resolve('vite/package.json')), 'bin/vite.js');
const children = [];
let browser;
async function serve(port, mode) {
  const child = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: resolve(root, 'apps/client'), env: { ...process.env, VITE_GAME_MODE: mode }, stdio: 'ignore',
  });
  children.push(child);
  const url = `http://127.0.0.1:${port}`;
  for (let n = 0; n < 150; n++) {
    if (child.exitCode !== null) throw new Error(`Vite exited (${child.exitCode}); port ${port} may be occupied.`);
    try { if ((await fetch(url)).ok) return url; } catch { /* wait for server */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Vite startup timeout');
}
try {
  const url = await serve(5182, 'local');
  const executablePath = process.env.AKAI_BROWSER_EXECUTABLE;
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath, args: ['--no-sandbox', '--disable-gpu', '--disable-software-rasterizer', '--disable-dev-shm-usage', '--no-zygote'] } : {}) });
  const context = await browser.newContext(); const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 360, height: 800 }); await page.goto(url);
  await page.locator('#save:not([disabled])').waitFor(); await page.locator('#game canvas').waitFor();
  for (let n = 0; n < 50; n++) {
    await page.getByRole('button', { name: 'Mina', exact: true }).click();
    await page.getByRole('button', { name: 'Produção', exact: true }).click();
    await page.getByRole('button', { name: 'Batalha', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Mina', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar perfil local', exact: true }).click();
  await page.getByText('Perfil salvo neste navegador.', { exact: false }).waitFor();
  await page.reload(); await page.getByText('Perfil local carregado.', { exact: true }).waitFor();
  assert.equal(await page.locator('[data-screen=mine]').getAttribute('aria-current'), 'true');
  for (const width of [320, 360, 390, 768]) {
    await page.setViewportSize({ width, height: 800 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `horizontal overflow at ${width}`);
  }
  const onlineUrl = await serve(5183, 'online'); const onlinePage = await context.newPage();
  onlinePage.on('pageerror', e => errors.push(e.message)); await onlinePage.goto(onlineUrl);
  await onlinePage.getByText('Modo online indisponível.', { exact: false }).waitFor();
  assert.equal(await onlinePage.locator('canvas').count(), 0);
  assert.equal(await onlinePage.locator('#save').isDisabled(), true);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ browser: browser.version(), canvas: true, navigationCycles: 50, saveReload: true, widths: [320, 360, 390, 768], onlineFailsClosed: true, pageErrors: errors }));
} finally {
  await browser?.close();
  for (const child of children) child.kill('SIGTERM');
}
