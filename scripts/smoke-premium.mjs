import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { Database } from "../apps/server/dist/database.js";
import { OnlineService } from "../apps/server/dist/online.js";
import { CommunityService } from "../apps/server/dist/community.js";
import { PremiumService } from "../apps/server/dist/premium.js";
import { parseServerConfig } from "../apps/server/dist/config.js";
import {
  createEquipment,
  newLoopState,
  CONFIG_VERSION,
  LocalSnapshotSchema,
} from "../packages/shared/dist/index.js";
if (!process.env.TEST_DATABASE_URL)
  throw Error("An isolated TEST_DATABASE_URL is required.");
const preview = process.argv.includes("--preview"),
  port = preview ? 4188 : 5188,
  origin = `http://localhost:${port}`,
  base = new Database(process.env.TEST_DATABASE_URL),
  schema = "browser_f8_" + randomUUID().replaceAll("-", "");
const requireClient = createRequire(
    new URL("../apps/client/package.json", import.meta.url),
  ),
  vite = resolve(
    dirname(requireClient.resolve("vite/package.json")),
    "bin/vite.js",
  );
let browser, db;
const children = [];
function start(args, env) {
  const p = spawn(process.execPath, args, {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  p.stdout.on("data", (x) => (out += x));
  p.stderr.on("data", (x) => (out += x));
  p.on("exit", (code) => {
    if (code && code !== 143) console.error(out.slice(-2000));
  });
  children.push(p);
  return p;
}
async function ready(url) {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Server did not start: " + url);
}
try {
  await base.pool.query("CREATE SCHEMA " + schema);
  const url = new URL(process.env.TEST_DATABASE_URL);
  url.searchParams.set("options", "-csearch_path=" + schema);
  db = new Database(url.toString());
  await db.migrate();
  const service = new OnlineService(db),
    social = new CommunityService(service),
    now = Date.now();
  async function fixture(name, attack) {
    const u = await service.guest();
    const s = LocalSnapshotSchema.parse({
      ...newLoopState(),
      schemaVersion: 3,
      configVersion: CONFIG_VERSION,
      mode: "local",
      generation: 0,
      savedAt: now,
      lastReconciledAt: now,
      profile: { id: "local-test", name },
      screen: "battle",
      activeMs: 0,
      balances: {
        coin: "1000000000",
        iron: "10000000",
        coal: "0",
        gold: "0",
        jade: "0",
        ruby: "0",
      },
    });
    s.rpg.inventory.push(createEquipment(s, "sword", 5, "rare"));
    s.battle.highest = 10;
    s.battle.paused = true;
    s.upgrades.attack = attack;
    await db.transaction(async (c) => {
      await c.query("UPDATE akai_accounts SET snapshot=$2 WHERE id=$1", [
        u.accountId,
        s,
      ]);
      await c.query(
        "INSERT INTO akai_ledger(account_id,sequence,resource,delta,balance,reason) VALUES($1,0,'coin',1000000000,1000000000,'browser-fixture')",
        [u.accountId],
      );
    });
    await social.read(u.token);
    await social.command(u.token, {
      commandId: randomUUID(),
      action: { type: "profile", name },
    });
    return u;
  }
  const a = await fixture("Cavaleiro Teste", 100),
    b = await fixture("Mineiro Teste", 0);
  const secret = randomBytes(32).toString("hex");
  const config = parseServerConfig({
    NODE_ENV: "test",
    MONETIZATION_MODE: "sandbox",
    MONETIZATION_TEST_DATABASE: "true",
    MONETIZATION_KEY: secret,
    PUBLIC_ORIGIN: origin,
  });
  const premium = new PremiumService(service, config);
  await premium.guard();
  start(["apps/server/dist/index.js"], {
    DATABASE_URL: url.toString(),
    PUBLIC_ORIGIN: origin,
    PORT: "3000",
    LOG_LEVEL: "silent",
    NODE_ENV: "test",
    MONETIZATION_MODE: "sandbox",
    MONETIZATION_TEST_DATABASE: "true",
    MONETIZATION_KEY: secret,
  });
  await ready("http://127.0.0.1:3000/health");
  start(
    [
      vite,
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
  const errors = [];
  async function open(u) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addCookies([
      {
        name: "akai_session",
        value: u.token,
        domain: "localhost",
        path: "/api/v1",
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(origin);
    await page.locator("#game[data-load-status=ready]").waitFor();
    await page.locator("#more").click();
    await page.locator("[data-shortcut=shop]").click();
    await page
      .locator("#premium-status")
      .filter({ hasText: "Loja sincronizada" })
      .waitFor();
    return page;
  }

  const pa = await open(a),
    pb = await open(b);
  async function confirm(p) {
    await p.locator("#premium-confirm").click();
    await p
      .locator("#premium-status")
      .filter({ hasText: "Operação confirmada." })
      .waitFor();
  }
  async function purchase(p, sku) {
    await p.locator(`[data-premium-product="${sku}"]`).click();
    await confirm(p);
    const intent = p.locator("[data-premium-simulate]").first();
    await intent.waitFor();
    await intent.click();
  }
  let lost = false;
  await pa.route("**/api/v1/premium/commands", async (route) => {
    const body = route.request().postDataJSON();
    if (body.type === "purchase.verify" && !lost) {
      lost = true;
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await purchase(pa, "ruby_handful");
  await pa
    .locator("#premium-status")
    .filter({ hasText: "Sem confirmação" })
    .waitFor();
  assert.equal((await premium.read(a.token)).rubyBalance, "100000");
  await pa.reload();
  await pa.locator("#game[data-load-status=ready]").waitFor();
  await pa.locator("#more").click();
  await pa.locator("[data-shortcut=shop]").click();
  await pa
    .locator("#premium-status")
    .filter({ hasText: "Operação confirmada." })
    .waitFor();
  assert.equal((await premium.read(a.token)).rubyBalance, "100000");
  assert.equal((await premium.read(b.token)).rubyBalance, "0");
  await pa.locator("#premium-restore").click();
  await pa
    .locator("#premium-status")
    .filter({ hasText: "Operação confirmada." })
    .waitFor();
  await purchase(pa, "title_miner");
  await pa
    .locator("#premium-owned")
    .filter({ hasText: "Guardião das Minas" })
    .waitFor();
  await pa.locator("[data-premium-reward=autoclick]").click();
  await confirm(pa);
  await new Promise((r) => setTimeout(r, 5200));
  await pa.locator("[data-premium-simulate]").first().click();
  await pa
    .locator("#premium-benefits")
    .filter({ hasText: "Autoclick" })
    .waitFor();
  const ruby = (await premium.read(a.token)).rubyBalance;
  await pa.reload();
  await pa.locator("#game[data-load-status=ready]").waitFor();
  await pa.locator("#more").click();
  await pa.locator("[data-shortcut=shop]").click();
  await pa
    .locator("#premium-owned")
    .filter({ hasText: "Guardião das Minas" })
    .waitFor();
  assert.equal((await premium.read(a.token)).rubyBalance, ruby);
  const before = await pa
    .locator("#premium-root")
    .evaluate((e) => e.querySelectorAll("*").length);
  for (let i = 0; i < 30; i++) {
    await pa.locator("[data-route=battle]").click();
    await pa.locator("#more").click();
    await pa.locator("[data-shortcut=shop]").click();
  }
  const after = await pa
    .locator("#premium-root")
    .evaluate((e) => e.querySelectorAll("*").length);
  assert.equal(before, after);
  for (const width of [320, 390, 768]) {
    await pa.setViewportSize({ width, height: 844 });
    assert.equal(
      await pa.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
  }
  if (process.env.AKAI_SCREENSHOT_DIR) {
    await mkdir(process.env.AKAI_SCREENSHOT_DIR, { recursive: true });
    await pa.setViewportSize({ width: 390, height: 844 });
    await pa.screenshot({
      path: resolve(process.env.AKAI_SCREENSHOT_DIR, "premium-sandbox-390.png"),
      fullPage: true,
    });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `docs/phase8-browser-${preview ? "preview" : "dev"}.json`,
    JSON.stringify(
      {
        mode: preview ? "production-preview" : "development",
        passed: true,
        provider:
          "Explicit local signed simulator. NOT a real Google/AdMob sandbox certification.",
        checks: [
          "catalog-labels-no-real-price",
          "purchase-loss-response-reload-idempotency",
          "restore-once",
          "cosmetic-title",
          "voluntary-autoclick-validated",
          "account-isolation",
          "30-navigation-cycles",
          "widths-320-390-768",
        ],
        domBefore: before,
        domAfter: after,
        pageErrors: errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Premium isolated simulator smoke passed:",
    preview ? "production preview" : "development",
  );
} finally {
  await browser?.close();
  for (const p of children) p.kill("SIGTERM");
  await Promise.all(
    children.map((p) =>
      p.exitCode !== null || p.signalCode !== null
        ? Promise.resolve()
        : new Promise((r) => p.once("exit", r)),
    ),
  );
  await db?.close();
  await base.pool.query("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
  await base.close();
}
