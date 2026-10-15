import { createHash } from 'node:crypto';
import { readFile, writeFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const root = fileURLToPath(new URL('../', import.meta.url));
const clientRoot = resolve(root, 'apps/client');
const clientRequire = createRequire(resolve(clientRoot, 'package.json'));
const prepareOnly = process.argv.includes('--prepare-only');
const smokeTest = process.argv.includes('--smoke-test');
const noBrowser = smokeTest || process.argv.includes('--no-browser');
const origin = 'http://127.0.0.1:5173';
let server;
let closing = false;

function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', env: process.env });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolveRun() : reject(Error(`Comando interrompido (${signal ?? code}): ${command}`)));
  });
}
function npm(args) {
  // npm.cmd requires cmd.exe. Only fixed launcher commands enter this shell;
  // project paths stay in cwd, avoiding shell interpolation of user folder names.
  return process.platform === 'win32'
    ? run(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd ' + args.join(' ')])
    : run('npm', args);
}
async function dependenciesReady() {
  const hash = createHash('sha256');
  for (const path of ['package-lock.json', 'package.json', 'apps/client/package.json', 'packages/shared/package.json']) hash.update(await readFile(resolve(root, path)));
  const fingerprint = `${process.platform}:${process.arch}:node${process.versions.node.split('.')[0]}:${hash.digest('hex')}`;
  const marker = resolve(root, 'node_modules/.akai-preview-ready');
  let ready = false;
  try {
    ready = (await readFile(marker, 'utf8')) === fingerprint;
    await access(clientRequire.resolve('vite'));
    await access(clientRequire.resolve('phaser/package.json'));
    await access(resolve(root, 'node_modules/typescript/bin/tsc'));
  } catch { ready = false; }
  if (!ready) {
    console.log('\nInstalando dependencias do projeto (a primeira vez pode demorar)...');
    await npm(['ci', '--include=dev', '--no-audit', '--no-fund']);
    await writeFile(marker, fingerprint);
  } else console.log('Dependencias ja instaladas para esta versao do projeto.');
}
async function shutdown() {
  if (closing) return;
  closing = true;
  await server?.close();
}
try {
  if (Number(process.versions.node.split('.')[0]) !== 24) throw Error('Use Node.js 24 ou execute jogar.bat para preparar a versao portatil.');
  console.log('\nPROJETO AKAI - Preview local\n');
  process.env.VITE_GAME_MODE = 'local'; // takes precedence over .env and external online settings
  console.log('Conferindo integridade dos sprites...');
  await run(process.execPath, [resolve(root, 'scripts/check-visual-assets.mjs')]);
  await dependenciesReady();
  console.log('Preparando o jogo...');
  await run(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', resolve(root, 'packages/shared/tsconfig.json')]);
  if (prepareOnly) { console.log('AKAI_PREVIEW_PREPARED: dependencias e sprites prontos.'); process.exit(0); }
  const { createServer } = await import(pathToFileURL(clientRequire.resolve('vite')).href);
  server = await createServer({ root: clientRoot, mode: 'development', clearScreen: false, server: { host: '127.0.0.1', port: 5173, strictPort: true, open: false } });
  await server.listen();
  console.log(`\nPronto! Jogue em ${origin}\nMantenha esta janela aberta. Use Ctrl+C para encerrar.\nSeu progresso local fica salvo neste navegador e neste endereco.\n`);
  if (!noBrowser) server.openBrowser();
  if (smokeTest) {
    // End-to-end helper for CI: a real browser must load all runtime assets and mine.
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true, ...(process.env.AKAI_CHROMIUM_EXECUTABLE ? { executablePath: process.env.AKAI_CHROMIUM_EXECUTABLE } : {}) });
    try {
      const page = await browser.newPage(), errors = [], failedImages = [];
      page.on('pageerror', error => errors.push(String(error)));
      page.on('response', response => { if (response.request().resourceType() === 'image' && response.status() >= 400) failedImages.push(response.url()); });
      await page.goto(origin);
      await page.locator('#game[data-load-status=ready]').waitFor();
      await page.locator('[data-route="mine"]').click();
      await page.locator('#mine-target').click();
      await page.waitForFunction(() => document.querySelector('.mine-summary [data-balance=iron]')?.textContent?.trim() === '1');
      if (errors.length || failedImages.length) throw Error(JSON.stringify({ errors, failedImages }));
      console.log('AKAI_PREVIEW_SMOKE_OK: sprites carregados e mineracao local confirmada.');
    } finally { await browser.close(); await shutdown(); }
  } else {
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void shutdown().catch(() => { process.exitCode = 1; }); });
    await once(server.httpServer, 'close');
  }
} catch (error) {
  await shutdown();
  console.error('\nNao foi possivel abrir o preview:', error instanceof Error ? error.message : String(error));
  console.error('Se a porta 5173 estiver ocupada, feche a outra janela do preview e tente novamente.');
  process.exitCode = 1;
}
