import { chromium } from "playwright";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  LocalSnapshotSchema,
  newLoopState,
  CONFIG_VERSION,
  startEncounter,
} from "../packages/shared/dist/index.js";
import assert from "node:assert/strict";
const preview = process.argv.includes("--preview");
const root = fileURLToPath(new URL("../", import.meta.url));
const requireClient = createRequire(
  new URL("../apps/client/package.json", import.meta.url),
);
const viteBin = resolve(
  dirname(requireClient.resolve("vite/package.json")),
  "bin/vite.js",
);
const children = [];
let browser;
async function serve(port, mode) {
  const child = spawn(
    process.execPath,
    [
      viteBin,
      ...(preview && mode === "local" ? ["preview"] : []),
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    {
      cwd: resolve(root, "apps/client"),
      env: { ...process.env, VITE_GAME_MODE: mode },
      stdio: "ignore",
    },
  );
  children.push(child);
  const url = `http://127.0.0.1:${port}`;
  for (let n = 0; n < 150; n++) {
    if (child.exitCode !== null) throw Error(`Vite exited (${child.exitCode})`);
    try {
      if ((await fetch(url)).ok) return url;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Vite startup timeout");
}
async function capture(page, name) {
  if (process.env.AKAI_SCREENSHOT_DIR) {
    await mkdir(process.env.AKAI_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: resolve(process.env.AKAI_SCREENSHOT_DIR, `${name}.png`),
      fullPage: true,
    });
  }
}
try {
  const url = await serve(5182, "local");
  const executablePath = process.env.AKAI_BROWSER_EXECUTABLE;
  browser = await chromium.launch({
    ...(process.env.AKAI_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.AKAI_CHROMIUM_EXECUTABLE }
      : {}),
    headless: true,
    ...(executablePath
      ? {
          executablePath,
          args: [
            "--no-sandbox",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--disable-dev-shm-usage",
            "--no-zygote",
          ],
        }
      : {}),
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  const failures = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(response.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.locator("#game[data-load-status=ready]").waitFor();
  await page.locator("#game canvas").waitFor();
  assert.equal(
    await page.locator("#game").getAttribute("data-animation-count"),
    "11",
  );
  const textures = await page
    .locator("#game")
    .getAttribute("data-texture-count");
  const objects = await page.locator("#game").getAttribute("data-object-count");
  await page.locator("#pause-battle").click();
  const pausedHp = await page.locator("#game").getAttribute("data-hero-hp");
  await page.waitForTimeout(1100);
  assert.equal(
    await page.locator("#game").getAttribute("data-hero-hp"),
    pausedHp,
  );
  await page
    .getByRole("button", { name: "Retomar batalha", exact: true })
    .click();
  await capture(page, "battle-390");
  const navigate = async (name) => {
    const direct = page
      .locator(".bottom-hud")
      .getByRole("button", { name, exact: true });
    if (await direct.isVisible()) await direct.click();
    else {
      await page.locator("#more").click();
      await page
        .locator("#menu-dialog")
        .getByRole("button", { name, exact: true })
        .click();
    }
  };
  await navigate("Mina");
  await capture(page, "mine-390");
  await page
    .getByRole("button", { name: "Minerar ferro", exact: true })
    .click();
  assert.equal(
    await page.locator("#game").getAttribute("data-impact-count"),
    "1",
  );
  for (let i = 0; i < 9; i++) await page.locator("#mine-target").click();
  assert.equal(
    await page.locator("[data-pane=mine] [data-balance=iron]").textContent(),
    "10",
  );

  await navigate("Batalha");
  await page.locator("#mine-target").evaluate((button) => button.click());
  assert.equal(
    await page.locator("#game").getAttribute("data-impact-count"),
    "10",
  );
  for (let n = 0; n < 50; n++) {
    await navigate("Mina");
    await navigate("Produção");
    await navigate("Batalha");
  }
  assert.equal(
    await page.locator("#game").getAttribute("data-texture-count"),
    textures,
  );
  assert.equal(
    await page.locator("#game").getAttribute("data-object-count"),
    objects,
  );
  assert.ok(await page.locator("#game").getAttribute("data-encounter"));
  await navigate("Produção");
  assert.equal(
    await page
      .locator("[data-pane=production] article button:disabled")
      .count(),
    3,
  );
  await capture(page, "production-390");
  await navigate("Mina");
  await navigate("Mais");
  assert.equal(
    await page.locator("#menu-dialog").evaluate((d) => d.open),
    true,
  );
  await page.locator("#mine-target").evaluate((button) => button.click());
  assert.equal(
    await page.locator("#game").getAttribute("data-impact-count"),
    "10",
  );
  await page
    .getByRole("checkbox", { name: "Reduzir movimento e efeitos" })
    .check();
  assert.equal(
    await page.locator("#game").getAttribute("data-reduced-motion"),
    "true",
  );
  await page
    .getByRole("button", { name: "Salvar perfil local", exact: true })
    .click();
  await page
    .getByText("Perfil salvo neste navegador.", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Fechar menu", exact: true }).click();
  assert.equal(
    await page.locator("#more").evaluate((e) => e === document.activeElement),
    true,
  );
  await page.reload();
  await page.locator("#game[data-load-status=ready]").waitFor();
  assert.equal(
    await page.locator("[data-route=mine]").getAttribute("aria-current"),
    "page",
  );
  await page.getByRole("button", { name: "Ver recursos" }).click();
  assert.equal(
    await page
      .locator("#dialog-resources dd")
      .allTextContents()
      .then((v) => v[1] === "10" && v.slice(2).every((x) => x === "0")),
    true,
  );
  await page.keyboard.press("Escape");
  for (const [width, height] of [
    [320, 640],
    [360, 800],
    [390, 844],
    [768, 900],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    for (const name of ["Batalha", "Mina", "Produção"]) {
      await navigate(name);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      const box = await page.locator(".bottom-hud").boundingBox();
      assert.ok(box && box.y + box.height <= height + 1);
    }
    for (const button of await page
      .locator(".bottom-hud button:visible")
      .all()) {
      const box = await button.boundingBox();
      assert.ok(box && box.width >= 44 && box.height >= 44);
    }
    if (width === 320) {
      assert.equal(await page.locator("[data-route=bag]").isVisible(), false);
      await navigate("Mais");
      await page.getByRole("button", { name: "Mochila", exact: true }).click();
      assert.equal(await page.locator("#page-title").textContent(), "Mochila");
      await navigate("Mina");
    }
    await navigate("Produção");
    await page.locator("#content").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const lastMine = await page
      .locator("[data-pane=production] article")
      .last()
      .boundingBox();
    const navigation = await page.locator(".bottom-hud").boundingBox();
    assert.ok(
      lastMine &&
        navigation &&
        lastMine.y + lastMine.height <= navigation.y + 1,
    );
    await capture(page, `production-${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await navigate("Loja");
  await page
    .getByText("Loja indisponível no perfil local", { exact: true })
    .waitFor();
  await capture(page, "shop-390");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#page-title").textContent(), "Produção");
  await page.setViewportSize({ width: 390, height: 960 });
  await navigate("Produção");
  await page.locator("#content").evaluate((el) => {
    el.scrollTop = 0;
  });
  await capture(page, "production-full-390");
  // Controlled real saves exercise hard-to-reach states; no test API is shipped in the app.
  async function seed(snapshot) {
    const payload = LocalSnapshotSchema.parse(snapshot),
      raw = JSON.stringify({
        formatVersion: 1,
        payload,
        checksum: createHash("sha256")
          .update(JSON.stringify(payload))
          .digest("hex"),
      });
    await page.evaluate(async (raw) => {
      const db = await new Promise((resolve, reject) => {
        const r = indexedDB.open("akai-local", 1);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction("snapshots", "readwrite");
        tx.objectStore("snapshots").put(raw, "current");
        tx.oncomplete = resolve;
        tx.onabort = reject;
      });
      db.close();
    }, raw);
    await page.reload();
    await page.locator("#game[data-load-status=ready]").waitFor();
  }
  const fixture = () =>
    LocalSnapshotSchema.parse({
      ...newLoopState(),
      schemaVersion: 3,
      configVersion: CONFIG_VERSION,
      mode: "local",
      generation: 0,
      savedAt: Date.now(),
      lastReconciledAt: Date.now(),
      profile: { id: "local-test", name: "Smoke" },
      screen: "mine",
      activeMs: 0,
      balances: {
        coin: "1000000",
        iron: "1000000",
        coal: "0",
        gold: "0",
        jade: "0",
        ruby: "0",
      },
    });
  await seed(fixture());
  await page.locator("[data-upgrade=click]").click();
  assert.equal(await page.locator("#click-gain").textContent(), "2 / toque");
  await navigate("Produção");
  await page.locator("[data-upgrade=coal]").click();
  await page.waitForTimeout(1100);
  await navigate("Mais");
  await page.locator("#save").click();
  await page
    .getByText("Perfil salvo neste navegador.", { exact: true })
    .waitFor();
  await page.reload();
  await page.locator("#game[data-load-status=ready]").waitFor();
  await navigate("Produção");
  await page.getByText("Nível 1 · 0,1 /s", { exact: true }).waitFor();
  const offline = fixture();
  offline.upgrades.coal = 1;
  offline.lastReconciledAt = Date.now() - 24 * 3600000;
  await seed(offline);
  await page
    .locator("#offline-summary")
    .filter({ hasText: "+2.880 carvão" })
    .waitFor();
  await navigate("Mais");
  await page.locator("#save").click();
  await page
    .getByText("Perfil salvo neste navegador.", { exact: true })
    .waitFor();
  await page.reload();
  await page.locator("#game[data-load-status=ready]").waitFor();
  const coalAfterReload = await page
    .locator("#dialog-resources [data-balance=coal]")
    .textContent();
  assert.ok(
    Number(coalAfterReload.replaceAll(".", "").replace(",", ".")) >= 2880 &&
      Number(coalAfterReload.replaceAll(".", "").replace(",", ".")) < 2881,
  );
  // Automatic boot save atomically persisted the offline watermark; a reload cannot receive8h again.
  await navigate("Mais");
  await page.locator("#save").click();
  await page
    .getByText("Perfil salvo neste navegador.", { exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  // F4 end-to-end: no runtime debug API; all setup uses valid persisted test snapshots.
  const rpg = fixture();
  rpg.battle.paused = true;
  rpg.battle.highest = 20;
  rpg.rpg.heroXp = 40000;
  rpg.rpg.castIron = "100000";
  rpg.upgrades.coal = 49;
  for (const key of ["coin", "iron", "coal", "gold", "jade"])
    rpg.balances[key] = "1000000000000";
  await seed(rpg);
  await navigate("Mochila");
  await page.locator("[data-rpg-tab=forge]").click();
  await page.locator("[data-rpg-action=craft][data-definition=sword]").click();
  await page.locator("[data-rpg-tab=equipment]").click();
  assert.equal(await page.locator("[data-item]").count(), 1);
  await page.locator("[data-rpg-action=equip][data-slot=weapon]").click();
  await page.locator("[data-item]").filter({ hasText: "Equipado" }).waitFor();
  await page.locator("[data-rpg-action=enhance]").click();
  await page.locator("[data-item]").filter({ hasText: "+1" }).waitFor();
  await capture(page, "rpg-equipment-390");
  await page.locator("[data-rpg-tab=forge]").click();
  await page.locator("[data-rpg-action=smelt]").click();
  await page.locator("[data-rpg-action=attackTonic]").click();
  assert.equal(
    await page.locator("[data-rpg-action=attackTonic]").isDisabled(),
    true,
  );
  await capture(page, "rpg-forge-390");
  await page.locator("[data-rpg-tab=pet]").click();
  await page.locator("[data-rpg-action=adoptPet]").click();
  await page
    .locator("#pet-stats")
    .filter({ hasText: "Nível 1 · Ativo" })
    .waitFor();
  await capture(page, "rpg-pet-390");
  await navigate("Produção");
  assert.equal(await page.locator("[data-rpg-action=gold]").isDisabled(), true);
  await page.locator("[data-upgrade=coal]").click();
  await page.locator("[data-rpg-action=gold]").click();
  await page
    .locator("#gold-production")
    .filter({ hasText: "Nível 1" })
    .waitFor();
  await page.locator("[data-rpg-action=jade]").click();
  await page
    .locator("#jade-production")
    .filter({ hasText: "Nível 1" })
    .waitFor();
  await capture(page, "rpg-mines-390");
  await navigate("Batalha");
  await capture(page, "rpg-companion-battle-390");
  await navigate("Mais");
  await page.locator("#save").click();
  await page.waitForFunction(() => !document.querySelector("#save").disabled);
  await page.reload();
  await page.locator("#game[data-load-status=ready]").waitFor();
  await navigate("Mochila");
  assert.equal(await page.locator("[data-item]").count(), 1);
  await page
    .locator("[data-item]")
    .filter({ hasText: "Equipado" })
    .filter({ hasText: "+1" })
    .waitFor();
  await page.locator("[data-rpg-tab=pet]").click();
  await page
    .locator("#pet-stats")
    .filter({ hasText: "Nível 1 · Ativo" })
    .waitFor();
  // Roving tabs and horizontal viewport must remain usable with the full RPG controls.
  await page.locator("[data-rpg-tab=equipment]").focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page.locator("[data-rpg-tab=forge]").getAttribute("aria-selected"),
    "true",
  );
  await page.setViewportSize({ width: 320, height: 640 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.setViewportSize({ width: 390, height: 960 });
  const boss = fixture();
  boss.screen = "battle";
  startEncounter(boss, 10);
  boss.battle.deadline = 1000;
  boss.battle.heroNextAt = 1000;
  boss.battle.enemies[0].hp = 1;
  await seed(boss);
  await page.locator("#retry-battle:visible").waitFor();
  await page.getByText("Tempo do boss esgotado.", { exact: false }).waitFor();
  const stopped = await page.locator("#game").getAttribute("data-encounter");
  await navigate("Mina");
  await page.waitForTimeout(1200);
  assert.equal(
    await page.locator("#game").getAttribute("data-encounter"),
    stopped,
  );
  await navigate("Batalha");
  await page.locator("#train-battle").click();
  await page.getByText("Treino iniciado.", { exact: false }).waitFor();
  await capture(page, "training-390");
  const win = fixture();
  win.upgrades.attack = 100;
  startEncounter(win, 1000);
  win.battle.enemies[0].hp = 1;
  win.screen = "mine";
  await seed(win);
  await page.waitForTimeout(4200);
  await navigate("Batalha");
  await page.getByText("Torre local concluída!", { exact: false }).waitFor();
  await capture(page, "complete-390");
  const lose = fixture();
  lose.screen = "battle";
  lose.battle.heroHp = 1;
  await seed(lose);
  await page.locator("#game[data-defeat-complete=true]").waitFor();
  await capture(page, "defeat-390");
  assert.deepEqual(failures, []);
  assert.deepEqual(errors, []);
  // A missing required image must display an error and keep the node disabled.
  const broken = await browser.newContext();
  await broken.route("**/hero-attack*", (route) => route.abort());
  const brokenPage = await broken.newPage();
  await brokenPage.goto(url);
  await brokenPage.locator("#game[data-load-status=error]").waitFor();
  await brokenPage
    .getByText("Não foi possível carregar o cenário.", { exact: false })
    .waitFor();
  assert.equal(await brokenPage.locator("#mine-target").isDisabled(), true);
  await broken.close();
  const onlineUrl = await serve(5183, "online");
  const onlinePage = await context.newPage();
  await onlinePage.goto(onlineUrl);
  await onlinePage
    .locator("#asset-status")
    .filter({ hasText: "Servidor online indisponível." })
    .waitFor();
  assert.equal(await onlinePage.locator("canvas").count(), 0);
  console.log(
    JSON.stringify({
      browser: browser.version(),
      productionPreview: preview,
      navigationCycles: 50,
      unchangedTextures: textures,
      unchangedObjects: objects,
      saveReload: true,
      hiddenInputBlocked: true,
      modalInputBlocked: true,
      reducedMotion: true,
      widths: [320, 360, 390, 768, 844],
      landscape: true,
      menus: true,
      realMiningGrants: true,
      upgradesAndCoal: true,
      rpgCraftEquipEnhancePetMinesAndReload: true,
      offlineCapAndSingleCredit: true,
      bossTimeoutAndTraining: true,
      towerCompletedFromMine: true,
      missingAssetHandled: true,
      onlineFailsClosed: true,
      pageErrors: errors,
      failedAssetResponses: failures,
    }),
  );
} finally {
  await browser?.close();
  for (const child of children) child.kill("SIGTERM");
}
