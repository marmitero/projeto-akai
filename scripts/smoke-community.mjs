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
import { calendar } from "../apps/server/dist/community-domain.js";
import {
  newLoopState,
  CONFIG_VERSION,
  LocalSnapshotSchema,
} from "../packages/shared/dist/index.js";
if (!process.env.TEST_DATABASE_URL)
  throw Error("An isolated TEST_DATABASE_URL is required.");
const preview = process.argv.includes("--preview"),
  port = preview ? 4186 : 5186,
  origin = `http://localhost:${port}`,
  base = new Database(process.env.TEST_DATABASE_URL),
  schema = "browser_f6_" + randomUUID().replaceAll("-", "");
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
        coin: "50000000",
        iron: "0",
        coal: "0",
        gold: "0",
        jade: "0",
        ruby: "0",
      },
    });
    s.battle.highest = 10;
    s.battle.paused = true;
    s.upgrades.attack = attack;
    await db.transaction(async (c) => {
      await c.query("UPDATE akai_accounts SET snapshot=$2 WHERE id=$1", [
        u.accountId,
        s,
      ]);
      await c.query(
        "INSERT INTO akai_ledger(account_id,sequence,resource,delta,balance,reason) VALUES($1,0,'coin',50000000,50000000,'browser-fixture')",
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
  const k = calendar(now);
  await db.pool.query(
    "UPDATE akai_bosses SET start_at=$2,end_at=$3,status='active',hp=1000000 WHERE id=$1",
    ["boss:" + k.date, now - 1000, now + 120000],
  );
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
    await page.locator("[data-shortcut=community]").click();
    await page
      .locator("#community-id")
      .filter({ hasText: u.accountId })
      .waitFor();
    return page;
  }
  const pa = await open(a),
    pb = await open(b);
  await pa
    .locator("#community-chat-form input")
    .fill('<img src=x onerror="window.xss=true">');
  await pa.locator("#community-chat-form button").click();
  await pb
    .locator("#community-chat .chat-message")
    .filter({ hasText: "<img src=x" })
    .waitFor();
  assert.equal(await pb.locator("#community-chat img").count(), 0);
  assert.equal(await pb.evaluate(() => window.xss), undefined);
  await pa.locator("[data-community-tab=guild]").click();
  await pa.locator("#community-guild-create input").fill("Guardioes Teste");
  await pa.locator("#community-guild-create button").click();
  await pa
    .locator("#community-guild")
    .filter({ hasText: "Guardioes Teste" })
    .waitFor();
  await pa.locator("#community-invite-form input").fill(b.accountId);
  await pa.locator("#community-invite-form button").click();
  await pb.locator("[data-community-tab=guild]").click();
  await pb
    .locator("#community-invites")
    .getByRole("button", { name: "Aceitar" })
    .click();
  await pb
    .locator("#community-guild")
    .filter({ hasText: "Guardioes Teste" })
    .waitFor();
  await pa.locator("#community-emblem-editor summary").click();
  await pa.locator("#community-palette").selectOption("3");
  await pa.locator("#community-paint button").first().click();
  await pa.locator("#community-save-emblem").click();
  await pb.waitForFunction(() =>
    document
      .querySelector("#community-guild .guild-emblem i")
      ?.getAttribute("style")
      ?.includes("169, 52, 69"),
  );
  await pa
    .locator("#community-guild-chat-form input")
    .fill("Somente nossa guilda");
  await pa.locator("#community-guild-chat-form button").click();
  await pb
    .locator("#community-guild-chat")
    .filter({ hasText: "Somente nossa guilda" })
    .waitFor();
  await pb.locator("[data-community-tab=arena]").click();
  await pb.getByRole("button", { name: "Desafiar Cavaleiro Teste" }).click();
  await pb
    .locator("#community-matches")
    .filter({ hasText: "Defesa venceu" })
    .waitFor();
  await pa.locator("[data-community-tab=events]").click();
  await pa.locator("#community-boss-join").click();
  await pa.waitForFunction(() => {
    const t = document.querySelector("#community-boss")?.textContent ?? "";
    return /sua contribuição [1-9]/.test(t);
  });
  await pa.locator("#community-boss-leave").click();
  // Keep the same state across reload and repeated navigation. No extra listener/DOM accumulation.
  await pa.reload();
  await pa.locator("#game[data-load-status=ready]").waitFor();
  await pa.locator("#more").click();
  await pa.locator("[data-shortcut=community]").click();
  await pa.locator("[data-community-tab=guild]").click();
  await pa
    .locator("#community-guild")
    .filter({ hasText: "Guardioes Teste" })
    .waitFor();
  const before = await pa
    .locator("#community-root")
    .evaluate((e) => e.querySelectorAll("*").length);
  for (let i = 0; i < 30; i++) {
    await pa.locator("[data-community-tab=rank]").click();
    await pa.locator("[data-community-tab=guild]").click();
  }
  const after = await pa
    .locator("#community-root")
    .evaluate((e) => e.querySelectorAll("*").length);
  assert.ok(Math.abs(after - before) < 15);
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
      path: resolve(process.env.AKAI_SCREENSHOT_DIR, "community-guild-390.png"),
      fullPage: true,
    });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `docs/phase6-browser-${preview ? "preview" : "dev"}.json`,
    JSON.stringify(
      {
        mode: preview ? "production" : "development",
        passed: true,
        fixture:
          "Two server-seeded test accounts; not a human progression playtest.",
        checks: [
          "chat-literal-XSS",
          "guild-create-invite-join",
          "emblem-persisted",
          "private-chat",
          "arena-result",
          "boss-auto-damage-and-leave",
          "reload",
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
    "Community browser smoke passed (" +
      (preview ? "production" : "development") +
      ").",
  );
} finally {
  await browser?.close();
  for (const p of children) {
    if (p.exitCode === null) {
      p.kill("SIGTERM");
      await new Promise((resolve) => {
        p.once("exit", resolve);
        setTimeout(resolve, 3000);
      });
    }
  }
  await db?.close();
  await base.pool.query("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
  await base.close();
}
