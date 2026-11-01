import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
if (!process.env.TEST_DATABASE_URL)
  throw Error(
    "TEST_DATABASE_URL must point at an isolated PostgreSQL database",
  );
const preview = process.argv.includes("--preview"),
  port = preview ? 4174 : 5174,
  origin = `http://localhost:${port}`;
const clientRequire = createRequire(
  new URL("../apps/client/package.json", import.meta.url),
);
const viteBin = resolve(
  dirname(clientRequire.resolve("vite/package.json")),
  "bin/vite.js",
);
const processes = [];
const start = (cmd, args, env = {}) => {
  const p = spawn(cmd, args, {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  p.stdout.on("data", (x) => {
    output += String(x);
  });
  p.stderr.on("data", (x) => {
    output += String(x);
  });
  p.on("exit", (code) => {
    if (code && code !== null && code !== 143)
      console.error(output.slice(-2000));
  });
  processes.push(p);
  return p;
};
async function ready(url) {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("not ready: " + url);
}
let browser;
try {
  const { Database } = await import("../apps/server/dist/database.js");
  const db = new Database(process.env.TEST_DATABASE_URL);
  await db.migrate();
  await db.close();
  const serverEnv = {
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    PUBLIC_ORIGIN: origin,
    PORT: "3000",
    HOST: "127.0.0.1",
    LOG_LEVEL: "silent",
  };
  let server = start("node", ["apps/server/dist/index.js"], serverEnv);
  await ready("http://127.0.0.1:3000/health");
  start(
    "node",
    [
      viteBin,
      ...(preview ? ["preview"] : []),
      "apps/client",
      "--host",
      "localhost",
      "--port",
      String(port),
      "--strictPort",
    ],
    { VITE_GAME_MODE: "online" },
  );
  await ready(origin);
  browser = await chromium.launch({
    ...(process.env.AKAI_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.AKAI_CHROMIUM_EXECUTABLE }
      : {}),
    headless: true,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(origin);
  await page.locator("#guest-start").click();
  await page.getByRole("button", { name: "Guardei a chave. Entrar" }).waitFor();
  const key = (await page.locator("#login-message").innerText())
    .split(": ")
    .at(-1);
  assert.match(key, /^[A-Za-z0-9_-]{43}$/);
  await page.getByRole("button", { name: "Guardei a chave. Entrar" }).click();
  await page.waitForFunction(() =>
    Boolean(document.querySelector("#game[data-mode=online][data-load-status=ready]")),
  );
  await page.waitForFunction(
    () => document.querySelector("#asset-status")?.hidden,
  );
  await page.locator('[data-route="mine"]').click();
  const state = () =>
    page.evaluate(async () => {
      const r = await fetch("/api/v1/state", {
        headers: { "X-Akai-Client": "1" },
      });
      return r.json();
    });
  const before = await state();
  for (let i = 0; i < 5; i++) {
    await page.locator("#mine-target").click();
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1200);
  const mined = await state();
  assert.ok(
    BigInt(mined.snapshot.balances.iron) >
      BigInt(before.snapshot.balances.iron),
  );
  if (process.env.AKAI_SCREENSHOT_DIR) {
    await mkdir(process.env.AKAI_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: process.env.AKAI_SCREENSHOT_DIR + "/online-mine-390.png",
      fullPage: true,
    });
  }
  assert.equal(
    await page.evaluate(() => document.cookie.includes("akai_session")),
    false,
  );
  assert.equal(
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const r = indexedDB.databases();
          r.then((d) => resolve(d.some((x) => x.name?.includes("akai"))));
        }),
    ),
    false,
  );
  await page.reload();
  await page.waitForFunction(() =>
    Boolean(document.querySelector("#game[data-mode=online][data-load-status=ready]")),
  );
  assert.equal(
    (await state()).snapshot.balances.iron,
    mined.snapshot.balances.iron,
  );
  // Lost HTTP response: server commits before the browser observes a timeout. Same UUID retry must apply once.
  let commandIds = [];
  let dropped = false;
  await page.route("**/api/v1/commands", async (route) => {
    const body = route.request().postDataJSON();
    commandIds.push(body.commandId);
    if (!dropped) {
      dropped = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page.locator('[data-route="mine"]').click();
  await page.waitForTimeout(1200);
  const beforeRetry = await state();
  await page.locator("#mine-target").click();
  await page.waitForTimeout(2500);
  await page.unroute("**/api/v1/commands");
  assert.ok(commandIds.length >= 2);
  assert.equal(new Set(commandIds).size, 1);
  assert.equal(
    BigInt((await state()).snapshot.balances.iron) -
      BigInt(beforeRetry.snapshot.balances.iron),
    1000n,
  );
  // Seed only this freshly created account in the isolated test DB; no debug endpoint is shipped.
  const journalDb = new Database(process.env.TEST_DATABASE_URL);
  const accountId = (await state()).snapshot.profile.id;
  try {
    const seeded = (await journalDb.pool.query("SELECT snapshot FROM akai_accounts WHERE id=$1", [accountId])).rows[0].snapshot;
    seeded.upgrades.attack = 100;
    seeded.battle.paused = false;
    seeded.battle.phase = "fighting";
    seeded.battle.failure = "none";
    seeded.battle.floor = 1;
    seeded.battle.wave = 1;
    seeded.battle.time = 0;
    seeded.battle.heroNextAt = 1000;
    seeded.battle.heroHp = 100;
    seeded.battle.deadline = 0;
    seeded.battle.enemies.forEach(e => {e.hp = 1; e.nextAt = 1000000;});
    delete seeded.battle.reports;
    delete seeded.battle.reportSerial;
    await journalDb.pool.query("UPDATE akai_accounts SET snapshot=$2 WHERE id=$1", [accountId, seeded]);
  } finally { await journalDb.close(); }
  // Discard the browser's pre-fixture journal before waiting for this seeded fight.
  // An old victory can otherwise satisfy the wait and pause the new encounter before it rewards.
  await page.reload();
  await page.locator('#game[data-mode=online][data-load-status=ready]').waitFor();
  await page.locator('[data-route="battle"]').click();
  await page.waitForFunction(() => {
    const log = document.querySelector('#battle-system-log');
    return Boolean(log?.querySelector('li[data-kind=victory]')) &&
      Array.from(log.querySelectorAll('li[data-kind=reward]')).some(item =>
        item.textContent.includes('Coins') && item.textContent.includes('XP do guerreiro'));
  });
  if (!(await state()).snapshot.battle.paused) await page.locator('#pause-battle').click();
  await page.waitForFunction(async () => (await (await fetch('/api/v1/state', {headers:{'X-Akai-Client':'1'}})).json()).snapshot.battle.paused);
  const journalState = await state();
  const journalTexts = await page.locator('#battle-system-log li').allTextContents();
  assert.equal(journalTexts.length, journalState.snapshot.battle.reports.length);
  assert(journalTexts.some(t => t.includes('Coins') && t.includes('XP do guerreiro')));
  await page.reload();
  await page.locator('#game[data-mode=online][data-load-status=ready]').waitFor();
  assert.deepEqual(await page.locator('#battle-system-log li').allTextContents(), journalTexts);
  if (process.env.AKAI_SCREENSHOT_DIR) await page.screenshot({path:process.env.AKAI_SCREENSHOT_DIR + '/online-system-390.png'});
  // Process restart, websocket recovery, and retained account state.
  server.kill("SIGTERM");
  await new Promise((resolve) => server.once("exit", resolve));
  await page.waitForTimeout(1200);
  server = start("node", ["apps/server/dist/index.js"], serverEnv);
  await ready("http://127.0.0.1:3000/health");
  await page.waitForTimeout(3500);
  assert.equal((await state()).snapshot.profile.id, mined.snapshot.profile.id);
  assert.deepEqual((await state()).snapshot.battle.reports, journalState.snapshot.battle.reports);
  assert.deepEqual(await page.locator('#battle-system-log li').allTextContents(), journalTexts);
  await page.locator('#more').click();
  await page.getByRole('button',{name:'Bestiário',exact:true}).click();
  assert.equal(await page.locator('.bestiary-card').count(),27);
  await page.keyboard.press('Escape');
  // New device recovery revokes the prior cookie and rotates the key.
  const second = await browser.newContext(),
    other = await second.newPage();
  await other.goto(origin);
  await other.locator("#online-key").fill(key);
  await other.locator("#recover-online button").click();
  await other
    .getByRole("button", { name: "Guardei a chave. Entrar" })
    .waitFor();
  await other.getByRole("button", { name: "Guardei a chave. Entrar" }).click();
  await other.waitForFunction(() =>
    Boolean(document.querySelector("#game[data-mode=online][data-load-status=ready]")),
  );
  const revoked = await page.evaluate(
    async () =>
      (await fetch("/api/v1/state", { headers: { "X-Akai-Client": "1" } }))
        .status,
  );
  assert.equal(revoked, 401);
  await other.locator("#more").click();
  await other.getByRole("button", { name: "Sair da conta online" }).click();
  await other.locator("#guest-start").waitFor();
  assert.deepEqual(errors, []);
  await writeFile(
    `docs/${process.env.AKAI_ONLINE_EVIDENCE ?? "phase5-browser"}-${preview ? "preview" : "dev"}.json`,
    JSON.stringify(
      {
        mode: preview ? "production" : "development",
        passed: true,
        checks: [
          "guest",
          "mining",
          "httpOnly",
          "local-save-isolation",
          "reload",
          "lost-response-single-effect",
          "server-restart",
          "confirmed-journal-rewards",
          "online-bestiary-catalogue",
          "legacy-journal-defaults",
          "journal-reload-and-restart-without-duplicates",
          "cross-device-recovery",
          "session-revocation",
          "logout",
        ],
        pageErrors: errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Online browser smoke passed (" +
      (preview ? "production" : "development") +
      ").",
  );
} finally {
  await browser?.close();
  for (const p of processes) p.kill("SIGTERM");
}
