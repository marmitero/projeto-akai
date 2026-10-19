import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mobileRequestAllowed, isPrivateIpv4 } from './mobile-network.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../package.json', import.meta.url));
const clientRequire = createRequire(new URL('../apps/client/package.json', import.meta.url));

export async function startMobilePreview({ ip, port = 5173, mode = 'online', openBrowser = false, listenHost = ip }) {
  if (!isPrivateIpv4(ip) || !Number.isInteger(port) || port<1024 || port>65535 || !['local','online'].includes(mode)) throw Error('Configuracao LAN invalida.');
  const origin = `http://${ip}:${port}`;
  if (listenHost !== ip && listenHost !== '127.0.0.1') throw Error('Binding deve ser a interface escolhida ou loopback para teste isolado.');
  const QRCode = require('qrcode');
  const { build, preview } = await import(pathToFileURL(clientRequire.resolve('vite')).href);
  const directory = await mkdtemp(join(tmpdir(), 'akai-mobile-'));
  let server;
  const sockets = new Set();
  try {
    const qr = await QRCode.toDataURL(origin, { width: 320, margin: 4, errorCorrectionLevel: 'M' });
    process.env.VITE_GAME_MODE = mode;
    // Only a compiled client is served on LAN; never the Vite dev filesystem or source.
    await build({ root: resolve(root, 'apps/client'), mode: 'development', build: { outDir: directory, emptyOutDir: true }, logLevel: 'warn' });
    server = await preview({ configFile:false, root: resolve(root, 'apps/client'), mode: 'development', build: { outDir: directory },
      preview: { host: listenHost, port, strictPort: true, open: openBrowser ? '/__mobile' : false, proxy: mode === 'online' ? { '/api/v1': { target:'http://127.0.0.1:3000',ws:true } } : undefined }, plugins: [{
        name: 'akai-private-mobile-preview',
        configurePreviewServer(instance) {
          const reject = (req, res, next) => {
            const path = (req.url ?? '').split('?')[0];
            let decoded;
            try { decoded = decodeURIComponent(path); } catch { res.writeHead(400).end(); return; }
            if (!mobileRequestAllowed(req, origin)) { res.writeHead(403).end('Rede/origem nao permitida.'); return; }
            if (decoded.split('/').some(p => p.startsWith('.')) || /\0|\\|^\/(?:@|src\/|node_modules\/)/.test(decoded)) { res.writeHead(404).end(); return; }
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Referrer-Policy', 'no-referrer');
            if (path === '/' || path.endsWith('.html') || path === '/__mobile') res.setHeader('Cache-Control','no-store');
            if (mode === 'local' && decoded.startsWith('/api/')) { res.writeHead(404).end(); return; }
            if (path !== '/__mobile') { next(); return; }
            res.setHeader('Content-Type','text/html; charset=utf-8');
            res.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Akai no celular</title><style>body{font:18px system-ui;background:#171522;color:#fff;max-width:620px;margin:32px auto;padding:16px}img{display:block;width:min(320px,100%);height:auto;background:white}a{color:#f5d68d;overflow-wrap:anywhere}li{margin:12px 0}</style><h1>Jogue no Android</h1><ol><li>Conecte o celular ao mesmo Wi-Fi do computador.</li><li>Escaneie o QR Code pela camera do celular.</li><li>Mantenha esta janela e o iniciador abertos no PC.</li></ol><img alt="QR Code para abrir o jogo" src="${qr}"><p>Endereco: <a href="${origin}">${origin}</a></p><p><a href="/">Jogar neste aparelho</a></p><p>${mode === 'online' ? 'Online: use sua chave de recuperacao para entrar na mesma conta. Contas ficam no computador.' : 'Teste local: o progresso fica apenas neste navegador e endereco.'}</p><p>Se nao abrir: confira a rede, o endereco e permita o Node.js no Firewall somente em redes privadas. Wi-Fi de visitantes pode bloquear a conexao.</p></html>`);
          };
          instance.middlewares.use(reject);
          // Connect middleware does not run for upgrades. Apply the same LAN/origin checks first.
          instance.httpServer.prependListener('upgrade', (req, socket) => {
            sockets.add(socket);socket.once('close',()=>sockets.delete(socket));
            if (!mobileRequestAllowed(req, origin) || req.headers.origin !== origin || req.url?.split('?')[0] !== '/api/v1/stream' || mode !== 'online') socket.destroy();
          });
        }
      }] });
    const close = async () => { for (const socket of sockets) socket.destroy(); await new Promise(ok => { server.httpServer.closeAllConnections?.(); server.httpServer.close(ok); }); await rm(directory,{recursive:true,force:true}); };
    console.log(`\nANDROID - ${origin}\nAbra ${origin}/__mobile no computador para ver o QR Code.\n`);
    console.log(await QRCode.toString(origin,{type:'terminal',small:true,errorCorrectionLevel:'M'}));
    console.log('Mesma rede Wi-Fi; PC ligado. Firewall: somente redes privadas. Ctrl+C encerra.\n');
    return { httpServer: server.httpServer, close, openBrowser: () => {}, origin, landing: `${origin}/__mobile` };
  } catch (error) {
    if (server) await new Promise(ok => server.httpServer.close(ok));
    await rm(directory,{recursive:true,force:true});throw error;
  }
}
