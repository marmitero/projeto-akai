import { buildServer } from './app.js';
import { parseServerConfig } from './config.js';
let config;
try { config = parseServerConfig(process.env); }
catch { process.stderr.write('Invalid server configuration: check HOST, PORT and LOG_LEVEL.\n'); process.exit(1); }
const app = buildServer(config);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void app.close().catch(() => { process.exitCode = 1; }); });
}
try { await app.listen({ host: config.HOST, port: config.PORT }); }
catch { app.log.error('Unable to start server; check binding and configuration.'); process.exitCode = 1; await app.close(); }
