import { spawn, execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer as netServer } from 'node:net';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { chooseLanAddress } from './mobile-network.mjs';
import { startMobilePreview } from './mobile-preview.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const clientRoot = resolve(root, 'apps/client');
const clientRequire = createRequire(resolve(clientRoot, 'package.json'));
const execute = promisify(execFile);
let origin = 'http://localhost:5173', mobileIp;
const mobile = process.argv.includes('--mobile');
const prepareOnly = process.argv.includes('--prepare-only');
const smokeTest = process.argv.includes('--smoke-test');
const noBrowser = smokeTest || process.argv.includes('--no-browser');
const children = new Set();
let vite, api, closing = false, startedDb = false;
const env = { ...process.env, NODE_ENV: 'development', LOG_LEVEL: 'warn', HOST: '127.0.0.1', PORT: '3000', PUBLIC_ORIGIN: origin, COOKIE_SECURE: 'false', VITE_GAME_MODE: 'online', MONETIZATION_MODE: 'off', MONETIZATION_TEST_DATABASE: 'false', LAN_PREVIEW: mobile ? 'true' : 'false' };
for (const key of ['DATABASE_URL', 'TEST_DATABASE_URL', 'MONETIZATION_KEY', 'PLAY_PACKAGE_NAME', 'PLAY_SERVICE_ACCOUNT_FILE', 'GOOGLE_CLIENT_ID']) delete env[key];
const wait = ms => new Promise(r => setTimeout(r, ms));
const compose = ['compose', '-f', resolve(root, 'compose.yaml')];
async function docker(args, timeout = 15000) {
  return execute('docker', args, { cwd: root, env, timeout, windowsHide: true, maxBuffer: 1024 * 1024 });
}
async function dockerReady() {
  try { return (await docker(['info', '--format', '{{.OSType}}'], 5000)).stdout.trim() === 'linux'; }
  catch { return false; }
}
async function ensureDocker() {
  try { await docker(['compose', 'version']); }
  catch { throw Error('Instale o Docker Desktop com Docker Compose e execute servidor.bat novamente.'); }
  const localEndpoint = value => /^(unix:\/\/|npipe:\/\/\/\/\.\/pipe\/)/i.test(value);
  let context;
  try { context = JSON.parse((await docker(['context', 'inspect'])).stdout)[0]; }
  catch { throw Error('Nao foi possivel conferir a conexao local do Docker Desktop.'); }
  if (!localEndpoint(context?.Endpoints?.docker?.Host ?? '') || (env.DOCKER_HOST && !localEndpoint(env.DOCKER_HOST))) throw Error('Este iniciador requer uma conexao local do Docker Desktop, sem contexto remoto.');
  if (await dockerReady()) return;
  const desktop = resolve(process.env.ProgramFiles ?? 'C:\\Program Files', 'Docker', 'Docker', 'Docker Desktop.exe');
  if (process.platform === 'win32') {
    try {
      await access(desktop);
      console.log('Abrindo Docker Desktop. Aguardando o mecanismo de containers Linux...');
      const child = spawn(desktop, [], { detached: true, stdio: 'ignore' });
      child.on('error', () => {});
      child.unref();
      for (let i = 0; i < 18; i++) { if (closing) throw Error('Inicio cancelado.'); if (await dockerReady()) return; await wait(1000); }
    } catch { /* A clear manual fallback follows; no administrator installation is attempted. */ }
  }
  throw Error('Abra o Docker Desktop e aguarde o mecanismo de containers Linux iniciar. Depois execute servidor.bat novamente.');
}
async function portFree(port, host) {
  const probe = netServer();
  try { await new Promise((ok, fail) => { probe.once('error', fail); probe.listen({ port, host, exclusive: true }, ok); }); }
  catch { throw Error(`A porta ${port} esta ocupada. Feche a outra janela do jogo/servidor e tente novamente.`); }
  finally { if (probe.listening) await new Promise(ok => probe.close(ok)); }
}
function start(args) {
  if (closing) throw Error('Inicio cancelado.');
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true });
  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
}
async function run(args) {
  const child = start(args);
  const [code] = await once(child, 'exit');
  if (code !== 0) throw Error('A preparacao falhou. Confira a mensagem acima.');
}
async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    try { await execute('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }); } catch {}
  } else {
    child.kill('SIGTERM');
    await Promise.race([once(child, 'exit'), wait(3000)]);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
}
async function shutdown() {
  if (closing) return;
  closing = true;
  await vite?.close();
  await Promise.all(Array.from(children, stopChild));
  if (startedDb) console.log('Jogo/API encerrados. Banco preservado no Docker; nenhum volume foi apagado.');
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void shutdown().catch(() => { process.exitCode = 1; }); });
try {
  if (Number(process.versions.node.split('.')[0]) !== 24) throw Error('Execute servidor.bat para usar o Node24 portatil.');
  console.log('\nPROJETO AKAI - Online no seu computador\n');
  if (mobile) {
    const at = process.argv.indexOf('--lan-ip');
    if (at >= 0 && (!process.argv[at+1] || process.argv[at+1].startsWith('--'))) throw Error('Informe o IPv4 apos --lan-ip.');
    mobileIp = chooseLanAddress(at < 0 ? undefined : process.argv[at+1]);
    origin = `http://${mobileIp}:5173`; env.PUBLIC_ORIGIN = origin;
  }
  await ensureDocker();
  await portFree(3000, '127.0.0.1');
  await portFree(5173, mobileIp ?? 'localhost');
  await run([resolve(root, 'scripts/jogar.mjs'), '--prepare-only']);
  if (closing) throw Error('Inicio cancelado.');
  const config = JSON.parse((await docker([...compose, 'config', '--format', 'json'])).stdout);
  const db = config.services?.db;
  if (!db || !db.ports?.length || db.ports.some(p => p.host_ip !== '127.0.0.1' || String(p.published) !== '5432' || Number(p.target) !== 5432)) throw Error('O Compose de teste deve manter o PostgreSQL apenas em 127.0.0.1:5432.');
  const settings = db.environment;
  if (!settings?.POSTGRES_USER || !settings.POSTGRES_PASSWORD || !settings.POSTGRES_DB) throw Error('Configuracao do banco local ausente no compose.yaml.');
  env.DATABASE_URL = `postgres://${encodeURIComponent(settings.POSTGRES_USER)}:${encodeURIComponent(settings.POSTGRES_PASSWORD)}@127.0.0.1:5432/${encodeURIComponent(settings.POSTGRES_DB)}`;
  console.log('Preparando PostgreSQL local. O primeiro download da imagem pode demorar...');
  await docker([...compose, 'up', '-d', 'db'], 300000);
  startedDb = true;
  let ready = false;
  for (let i = 0; i < 90; i++) {
    if (closing) throw Error('Inicio cancelado.');
    try { await docker([...compose, 'exec', '-T', 'db', 'pg_isready', '-U', settings.POSTGRES_USER, '-d', settings.POSTGRES_DB], 5000); ready = true; break; } catch {}
    await wait(1000);
  }
  if (!ready) throw Error('O PostgreSQL nao ficou pronto. Confira o container db no Docker Desktop.');
  console.log('Atualizando tabelas do banco local...');
  await run(['--import', 'tsx', resolve(root, 'apps/server/src/migrate.ts')]);
  if (prepareOnly) console.log('AKAI_ONLINE_PREPARED: dependencias, sprites e banco prontos.');
  else {
    api = start(['--import', 'tsx', resolve(root, 'apps/server/src/index.ts')]);
    let apiError;
    api.once('error', error => { apiError = error; });
    ready = false;
    for (let i = 0; i < 100; i++) {
      if (closing || apiError || api.exitCode !== null) throw Error('A API nao iniciou. Confira a mensagem acima e a porta3000.');
      try { const response = await fetch('http://127.0.0.1:3000/health', { signal: AbortSignal.timeout(1000) }); if (response.ok) { ready = true; break; } } catch {}
      await wait(200);
    }
    if (!ready) throw Error('A API nao ficou pronta.');
    const { createServer } = await import(pathToFileURL(clientRequire.resolve('vite')).href);
    // Vite gives explicit process environment precedence over .env files.
    process.env.VITE_GAME_MODE = 'online';
    if (mobile) vite = await startMobilePreview({ ip: mobileIp, mode: 'online', openBrowser: !noBrowser });
    else {
      vite = await createServer({ root: clientRoot, mode: 'development', clearScreen: false, server: { host: 'localhost', port: 5173, strictPort: true, open: false } });
      await vite.listen();
    }
    console.log(`\nPronto! Jogue online em ${origin}\nCrie uma conta de convidado e guarde sua chave de recuperacao.\nMantenha esta janela aberta. Ctrl+C encerra jogo e API.\nO banco permanece no Docker e conserva suas contas.\nEste servidor e somente para teste privado no seu computador/rede local.\n`);
    api.once('exit', () => { if (!closing) { console.error('A API foi encerrada. Reinicie servidor.bat.'); process.exitCode = 1; void shutdown(); } });
    if (!noBrowser) vite.openBrowser();
    if (smokeTest) {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true, ...(process.env.AKAI_CHROMIUM_EXECUTABLE ? { executablePath: process.env.AKAI_CHROMIUM_EXECUTABLE } : {}), args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
      try {
        const page = await browser.newPage(), errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        await page.goto(origin);
        await page.locator('#guest-start').click();
        await page.getByRole('button', { name: 'Guardei a chave. Entrar' }).click();
        await page.locator('#game[data-mode=online][data-load-status=ready]').waitFor();
        await page.locator('[data-route=mine]').click();
        await page.locator('#mine-target').click();
        await page.waitForFunction(() => document.querySelector('.mine-summary [data-balance=iron]')?.textContent?.trim() === '1');
        if (errors.length) throw Error(JSON.stringify(errors));
        console.log('AKAI_ONLINE_SMOKE_OK: conta online, sprites e credito de ferro confirmados.');
      } finally { await browser.close(); }
    } else await once(vite.httpServer, 'close');
  }
} catch (error) {
  console.error('\nNao foi possivel abrir o online:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally { await shutdown(); }
