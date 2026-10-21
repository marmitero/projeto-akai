import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { Database } from "../apps/server/dist/database.js";
import { OnlineService } from "../apps/server/dist/online.js";
import { CommunityService } from "../apps/server/dist/community.js";
import { MarketService } from "../apps/server/dist/market.js";
import {
  createEquipment,
  newLoopState,
  CONFIG_VERSION,
  LocalSnapshotSchema,
} from "../packages/shared/dist/index.js";
if (!process.env.TEST_DATABASE_URL)
  throw Error("An isolated TEST_DATABASE_URL is required.");
const preview = process.argv.includes("--preview"),
  port = preview ? 4187 : 5187,
  origin = `http://localhost:${port}`,
  base = new Database(process.env.TEST_DATABASE_URL),
  schema = "browser_f7_" + randomUUID().replaceAll("-", "");
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
  const market = new MarketService(service);
  start(["apps/server/dist/index.js"], {
    DATABASE_URL: url.toString(),
    PUBLIC_ORIGIN: origin,
    PORT: "3000",
    LOG_LEVEL: "silent",
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
    await page.locator("[data-shortcut=market]").click();
    await page
      .locator("#market-status")
      .filter({ hasText: "Mercado sincronizado" })
      .waitFor();
    return page;
  }

  const pa = await open(a),
    pb = await open(b);
  async function tab(p, name) {
    await p.locator(`[data-market-tab=${name}]`).click();
  }
  async function confirm(p) {
    // Observe the authoritative receipt, not only a status that the next poll replaces.
    const receipt = p.waitForResponse(r => r.url().endsWith('/api/v1/market/commands') && r.request().method() === 'POST');
    await p.locator("#market-confirm").click();
    const response = await receipt;
    assert.equal(response.ok(), true, 'Market command HTTP ' + response.status());
    const result = await response.json();
    assert.equal(result.status, 'applied', 'Market command rejected: ' + JSON.stringify(result));
    await p
      .locator("#market-status")
      .filter({ hasText: /Operação confirmada\.|Mercado sincronizado\./ })
      .waitFor();
  }
  await tab(pa, "sell");
  await pa.locator("#market-sell-item [name=price]").fill("25,001");
  await pa.locator("#market-sell-item button").click();
  // Lose the response after the server commits. Reload must replay the SAME persisted command.
  let lost = false;
  await pa.route("**/api/v1/market/commands", async (route) => {
    if (!lost) {
      lost = true;
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await pa.locator("#market-confirm").click();
  await pa
    .locator("#market-status")
    .filter({ hasText: "Sem confirmação" })
    .waitFor();
  const only = (await market.read(a.token)).mine;
  assert.equal(only.length, 1);
  const listingId = only[0].id;
  await pa.reload();
  await pa.locator("#game[data-load-status=ready]").waitFor();
  await pa.locator("#more").click();
  await pa.locator("[data-shortcut=market]").click();
  await pa
    .locator("#market-status")
    .filter({ hasText: "Operação confirmada." })
    .waitFor();
  assert.equal((await market.read(a.token)).mine.length, 1);
  assert.equal((await market.read(a.token)).balances.coin, "900000000");
  await pb.locator(`[data-listing-id="${listingId}"]`).waitFor();
  if (process.env.AKAI_SCREENSHOT_DIR) {
    await mkdir(process.env.AKAI_SCREENSHOT_DIR, { recursive: true });
    await pb.screenshot({
      path: resolve(process.env.AKAI_SCREENSHOT_DIR, "market-listing-390.png"),
      fullPage: true,
    });
  }
  const listing = pb.locator(`[data-listing-id="${listingId}"]`);
  await listing.locator("form input").fill("10,001");
  await listing.locator("form button").click();
  await confirm(pb);
  await tab(pa, "offers");
  await pa
    .locator("#market-offers")
    .getByRole("button", { name: "Aceitar oferta" })
    .click();
  await confirm(pa);
  await tab(pb, "history");
  await pb.locator("#market-history").filter({ hasText: "Compra" }).waitFor();
  const afterPurchase = await market.read(b.token);
  assert.equal(afterPurchase.inventory.length, 2);
  assert.equal(afterPurchase.history[0].fee, "1001");
  await tab(pa, "sell");
  await pa.locator("#market-sell-resource [name=quantity]").fill("1,125");
  await pa.locator("#market-sell-resource [name=price]").fill("2,001");
  await pa.locator("#market-sell-resource button").click();
  await confirm(pa);
  const resourceId = (await market.read(a.token)).mine[0].id;
  await tab(pb, "browse");
  await pb
    .locator(`[data-listing-id="${resourceId}"]`)
    .getByRole("button", { name: "Comprar", exact: true })
    .click();
  await confirm(pb);
  assert.equal((await market.read(b.token)).balances.iron, "10001125");
  // Cancel -> escrow -> full-bag-safe claim, visible cooldown, distinct marketplace/shop.
  await tab(pb, "sell");
  await pb.locator("#market-sell-item [name=price]").fill("3");
  await pb.locator("#market-sell-item button").click();
  await confirm(pb);
  await tab(pb, "mine");
  await pb
    .locator("#market-mine")
    .getByRole("button", { name: "Cancelar anúncio" })
    .click();
  await confirm(pb);
  await pb
    .locator("#market-mine")
    .getByRole("button", { name: "Resgatar bem" })
    .click();
  await confirm(pb);
  assert.equal((await market.read(b.token)).inventory.length, 2);
  await tab(pb, "sell");
  await pb
    .locator("#market-cooldowns")
    .filter({ hasText: "Relistagem bloqueada" })
    .waitFor();
  await tab(pb, "history");
  const before = await pb
    .locator("#market-root")
    .evaluate((e) => e.querySelectorAll("*").length);
  for (let i = 0; i < 30; i++) {
    await tab(pb, "browse");
    await tab(pb, "history");
  }
  const after = await pb
    .locator("#market-root")
    .evaluate((e) => e.querySelectorAll("*").length);
  assert.equal(after, before);
  for (const width of [320, 390, 768]) {
    await pb.setViewportSize({ width, height: 844 });
    assert.equal(
      await pb.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
  }
  if (process.env.AKAI_SCREENSHOT_DIR) {
    await mkdir(process.env.AKAI_SCREENSHOT_DIR, { recursive: true });
    await pb.setViewportSize({ width: 390, height: 844 });
    await pb.screenshot({
      path: resolve(process.env.AKAI_SCREENSHOT_DIR, "market-history-390.png"),
      fullPage: true,
    });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `docs/phase7-browser-${preview ? "preview" : "dev"}.json`,
    JSON.stringify(
      {
        mode: preview ? "production" : "development",
        passed: true,
        fixture:
          "Two isolated server-seeded accounts; not an organic progression playtest.",
        checks: [
          "equipment-escrow",
          "lost-response-reload-idempotency",
          "offer-accept-fee",
          "resource-direct-purchase",
          "cancel-claim-cooldown",
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
    "Market browser smoke passed:",
    preview ? "production" : "development",
  );
} finally {
  await browser?.close();
  for (const child of children) child.kill("SIGTERM");
  await Promise.all(
    children.map((p) =>
      p.exitCode !== null || p.signalCode !== null
        ? Promise.resolve()
        : new Promise((resolve) => p.once("exit", resolve)),
    ),
  );
  await db?.close();
  await base.pool.query("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
  await base.close();
}
