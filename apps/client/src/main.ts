import { createBestiaryUI } from "./ui/bestiary.js";
import { enemyTemplate } from "@akai/shared";
import { createCombatLab } from "./ui/combat-lab.js";
import { createBossBroadcast } from "./ui/boss-broadcast.js";
import { createBattleGlobal } from "./ui/battle-global.js";
import { createBattleJournal } from "./ui/battle-journal.js";
import "./style.css";
import { createFloorBanner } from "./ui/battle-hud.js";
import { createPremiumUI } from "./ui/premium.js";
import { createMarketUI } from "./ui/market.js";
import { createCommunityUI } from "./ui/community.js";
import {
  OnlineSession,
  onlineBootstrap,
  api,
  googleControl,
} from "./online-session.js";
import {
  heroStats,
  upgradeCost,
  LOOP,
  levelFromXp,
  ironPerClick,
  type Upgrade,
} from "@akai/shared";
import {
  LocalSession,
  createLocalSnapshot,
  systemClock,
} from "./local/session.js";
import { SaveRepository, SaveConflictError } from "./persistence/repository.js";
import { createGame } from "./game/create-game.js";
import { createRpgUI } from "./ui/rpg.js";
import { createShell, routeLabels, type Route } from "./ui/shell.js";
const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("APP_ROOT_MISSING");
createShell(root);
const status = document.querySelector<HTMLElement>("#save-status")!;
const saveButton = document.querySelector<HTMLButtonElement>("#save")!;
const recoverButton = document.querySelector<HTMLButtonElement>("#recover")!;
const dialog = document.querySelector<HTMLDialogElement>("#menu-dialog")!;
const mineTarget = document.querySelector<HTMLButtonElement>("#mine-target")!;
const stage = document.querySelector<HTMLElement>("#game")!;
const assetStatus = document.querySelector<HTMLElement>("#asset-status")!;
async function boot(): Promise<void> {
  const mode = import.meta.env.VITE_GAME_MODE ?? "local";
  if (mode !== "local" && mode !== "online") throw Error("INVALID_GAME_MODE");
  const online = mode === "online";
  stage.dataset["mode"] = mode;
  const onlineState = online ? await onlineBootstrap(status) : undefined;
  let repository: SaveRepository | undefined;
  let snapshot = createLocalSnapshot(Date.now());
  let writable = true;
  if (!online)
    try {
      repository = await SaveRepository.open(indexedDB);
      const result = await repository.load();
      if (result.status === "loaded") {
        snapshot = result.snapshot;
        status.textContent = "Perfil local carregado.";
      } else if (result.status === "empty")
        status.textContent = "Novo perfil local. Sua jornada começou.";
      else if (result.status === "backup-available") {
        snapshot = result.snapshot;
        writable = false;
        recoverButton.hidden = false;
        status.textContent =
          "Save atual inválido. Prévia da cópia anterior; confirme a restauração para salvar.";
      } else {
        writable = false;
        status.textContent =
          result.status === "unsupported"
            ? "Save de versão incompatível preservado. Gravação bloqueada."
            : "Save inválido preservado. Gravação bloqueada; nenhum dado foi apagado.";
      }
    } catch {
      writable = false;
      status.textContent =
        "Armazenamento indisponível. Sessão temporária, sem salvamento.";
    }
  const session = onlineState
    ? new OnlineSession(onlineState, (message) => {
        status.textContent = message;
        document.querySelector("#action-status")!.textContent = message;
      })
    : new LocalSession(systemClock, snapshot);
  if (session.getSnapshot().screen === "production")
    session.selectScreen("mine");
  snapshot = session.getSnapshot();
  if (online) {
    saveButton.textContent = "Sincronizar";
    document.querySelector("#profile-heading + p")!.textContent =
      "Conta online. Guarde sua chave de recuperação; o progresso fica no servidor.";
    document.querySelector("#dialog-resources > p")!.textContent =
      "Saldos confirmados da conta online.";
    const logout = document.createElement("button");
    logout.textContent = "Sair da conta online";
    logout.onclick = () => {
      void api("auth/logout", {}).then(() => location.reload());
    };
    document.querySelector(".save-actions")!.append(logout);
    void googleControl(document.querySelector("#dialog-menu")!, true).catch(
      () => {},
    );
  }
  const bestiaryUI = createBestiaryUI(document.querySelector<HTMLElement>("#bestiary-root")!);
  const premiumUI = createPremiumUI(root!, online);
  const marketUI = createMarketUI(root!, online);
  let onlineName: string | undefined;
  let submittedName: string | undefined;
  const combatLab = createCombatLab(root!);
  const battleGlobal = createBattleGlobal(root!, online);
  const bossBroadcast = createBossBroadcast(root!, online);
  const communityUI = createCommunityUI(
    root!,
    online,
    (name, guild, result) => {
      onlineName = name;
      if (submittedName && result) {
        document.querySelector("#profile-name-status")!.textContent =
          result.status === "applied"
            ? "Nick confirmado."
            : `Apelido recusado: ${result.code}.`;
        submittedName = undefined;
      }
      document.querySelector("#player-name")!.textContent = name;
      const line = document.querySelector<HTMLElement>("#player-guild")!;
      line.textContent = guild ?? "";
      line.hidden = !guild;
    },
  );
  const renderFloors = createFloorBanner(
    document.querySelector<HTMLElement>("#floor-banner")!,
  );
  const routeForScreen = (screen: typeof snapshot.screen): Route =>
    screen === "production" ? "mine" : screen;
  let route: Route = routeForScreen(snapshot.screen);
  const scroll = new Map<Route, number>();
  const content = document.querySelector<HTMLElement>("#content")!;
  let visualReady = false;
  const visual = createGame(stage, {
    screen: snapshot.screen,
    onReady() {
      visualReady = true;
      assetStatus.hidden = true;
      mineTarget.disabled = false;
    },
    onError() {
      assetStatus.hidden = false;
      assetStatus.textContent =
        "Não foi possível carregar o cenário. Recarregue para tentar novamente.";
      assetStatus.setAttribute("role", "alert");
    },
  });
  function renderRoute(next: Route): void {
    document.querySelector<HTMLElement>("#battle-controls")!.hidden =
      next !== "battle";
    scroll.set(route, content.scrollTop);
    route = next;
    content.dataset["view"] = next;
    document.querySelector<HTMLElement>("#floor-banner")!.hidden =
      next !== "battle";
    communityUI.show(next === "community");
    battleGlobal.show(next === "battle");
    bossBroadcast.show(next === "battle");
    marketUI.show(next === "market");
    premiumUI.show(next === "shop");
    bestiaryUI.show(next === "bestiary");
    document.querySelector<HTMLElement>("#tutorial")!.hidden =
      next === "community" || next === "market" || next === "shop" || next === "bestiary";
    document.querySelector<HTMLElement>("#action-status")!.hidden =
      next === "community" || next === "market" || next === "shop" || next === "bestiary";
    const info = routeLabels[next];
    document.querySelector("#page-title")!.textContent = info.title;
    document.querySelector("#page-kicker")!.textContent = info.kicker;
    document.querySelector("#page-badge")!.textContent =
      next === "battle"
        ? `Andar ${session.getSnapshot().battle.floor} / ${LOOP.floors}`
        : info.badge;
    document.querySelector("#scene-caption")!.textContent = info.caption;
    document.querySelector("#visual-description")!.textContent =
      info.description;
    stage.setAttribute("aria-label", info.description);
    const gameplay = next === "battle" || next === "mine";
    document.querySelector<HTMLElement>("#visual-area")!.hidden = !gameplay;
    mineTarget.hidden = next !== "mine";
    for (const pane of document.querySelectorAll<HTMLElement>("[data-pane]"))
      pane.hidden = pane.dataset["pane"] !== next;
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      "[data-route]",
    )) {
      if (button.dataset["route"] === next)
        button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    visual.setOverlay(dialog.open || !gameplay);
    if (gameplay) visual.setScreen(next);
    content.scrollTop = scroll.get(next) ?? 0;
  }
  const formatAmount = (value: string): string => {
    const n = BigInt(value);
    return `${(n / 1000n).toLocaleString("pt-BR")}${
      n % 1000n
        ? "," +
          String(n % 1000n)
            .padStart(3, "0")
            .replace(/0+$/, "")
        : ""
    }`;
  };
  const compactAmount = (value: string): string => {
    const n = BigInt(value) / 1000n;
    if (n < 1000n) return formatAmount(value);
    if (n >= 1000000000000000n) {
      const t = String(n);
      return t[0] + "," + t.slice(1, 3) + "e" + (t.length - 1);
    }
    for (const [unit, label] of [
      [1000000000000n, "tri"],
      [1000000000n, "bi"],
      [1000000n, "mi"],
      [1000n, "mil"],
    ] as const)
      if (n >= unit) {
        const tenth = (n * 10n) / unit;
        return `${tenth / 10n}${tenth % 10n ? "," + String(tenth % 10n) : ""} ${label}`;
      }
    return formatAmount(value);
  };
  const text = (id: string, value: string): void => {
    const e = document.getElementById(id)!;
    if (e.textContent !== value) e.textContent = value;
  };
  let lastAnnouncement = "";
  const rpgUI = createRpgUI(root!, (command) => {
    if (
      dialog.open ||
      document.hidden ||
      !(route === "bag" || route === "mine")
    )
      return false;
    const ok = session.rpgCommand(command);
    text(
      "action-status",
      ok
        ? online
          ? "Comando enviado; aguardando confirmação."
          : "Ação concluída."
        : "Ação indisponível: confira recursos, nível, slots e requisitos.",
    );
    if (ok) void persist();
    return ok;
  });
  const battleJournal = createBattleJournal(root!, (active) => battleGlobal.select(active));
  let lootSerial = snapshot.rpg.lootSerial;
  const unsubscribe = session.subscribe((state) => {
    visual.setBattle(state);
    battleJournal.render(state);
    renderFloors(state.battle.floor);
    const defaultName = state.profile.name === "Perfil local de teste";
    text(
      "player-name",
      onlineName ?? (defaultName ? "Aventureiro" : state.profile.name),
    );
    document.querySelector<HTMLElement>("#nickname-setup")!.hidden =
      online || !defaultName;
    const nameField = document.querySelector<HTMLInputElement>(
      "#profile-name-form input",
    )!;
    if (document.activeElement !== nameField)
      nameField.value = onlineName ?? (defaultName ? "" : state.profile.name);
    rpgUI.render(state);
    text(
      "profile-heading",
      `${online ? "Conta online" : "Perfil local"} · Rei nível ${levelFromXp(state.rpg.accountXp)}`,
    );
    if (state.rpg.lootSerial !== lootSerial) {
      lootSerial = state.rpg.lootSerial;
      text("action-status", state.rpg.lastLoot);
    }
    const b = state.battle,
      stats = heroStats(state),
      boss = b.enemies.length === 1;
    stage.dataset["heroHp"] = String(b.heroHp);
    text(
      "hero-stats",
      `Nv. ${levelFromXp(state.rpg.heroXp)} · ATQ ${stats.attack} · Vida ${stats.hp} · DEF ${stats.defense}`,
    );
    text("hero-hp", `${b.heroHp} / ${stats.hp}`);
    const bar = document.querySelector<HTMLProgressElement>("#hero-health")!;
    bar.max = stats.hp;
    bar.value = b.heroHp;
    const enemyKey = b.enemies.map((e) => `${e.templateId ?? "legacy"}:${e.hp}/${e.maxHp}`).join(",");
    const enemyList = document.querySelector<HTMLElement>("#enemy-health")!;
    if (enemyList.dataset["hp"] !== enemyKey) {
      enemyList.dataset["hp"] = enemyKey;
      enemyList.innerHTML = b.enemies
        .map(
          (e, i) =>
            `<label>${boss ? "Guardião Ossudo" : `${enemyTemplate(e.templateId)?.name ?? "Esqueleto"} ${i + 1}`} · ${e.hp}/${e.maxHp}<progress max="${e.maxHp}" value="${e.hp}"></progress></label>`,
        )
        .join("");
    }
    text(
      "enemy-name",
      boss
        ? "Guardião Ossudo"
        : b.enemies.filter(e=>e.hp>0).map(e=>enemyTemplate(e.templateId)?.name ?? "Esqueleto").join(" · "),
    );
    text(
      "battle-status",
      b.phase === "failed"
        ? `${b.failure === "trained" ? "Treino concluído." : b.failure === "timeout" ? "Tempo do boss esgotado." : "Seu guerreiro foi derrotado."} ${b.retryFloor % 10 === 0 ? `Andar atual ${b.floor}. ` : ""}Melhore seu guerreiro e tente o andar ${b.retryFloor} novamente.`
        : b.phase === "complete"
          ? "Torre local concluída! Você venceu os 1.000 andares."
          : b.paused
            ? `Batalha pausada. ${boss ? Math.max(0, Math.ceil((b.deadline - b.time) / 1000)) + "s restantes no boss." : "Mineração e produção continuam."}`
            : b.phase === "transition"
              ? "Vitória! Seguindo para o próximo encontro…"
              : `${b.training ? "Treino · " : ""}${boss ? `Boss · ${Math.max(0, Math.ceil((b.deadline - b.time) / 1000))}s restantes` : `Onda ${b.wave}/3`}`,
    );
    document.querySelector<HTMLButtonElement>("#retry-battle")!.hidden =
      b.phase !== "failed";
    document.querySelector<HTMLButtonElement>("#train-battle")!.hidden =
      b.phase !== "failed" || b.retryFloor % 10 !== 0;
    if (route === "battle")
      text("page-badge", `Andar ${b.floor} / ${LOOP.floors}`);
    const announcement =
      b.phase === "failed"
        ? `Batalha pausada. Tente novamente o andar ${b.retryFloor}.`
        : b.phase === "complete"
          ? "Torre local concluída."
          : "";
    if (!announcement) lastAnnouncement = "";
    if (announcement && announcement !== lastAnnouncement) {
      text("action-status", announcement);
      lastAnnouncement = announcement;
    }
    const pause = document.querySelector<HTMLButtonElement>("#pause-battle")!;
    pause.hidden = b.phase === "failed" || b.phase === "complete";
    pause.textContent = b.paused ? "Retomar batalha" : "Pausar batalha";
    text("click-gain", `${formatAmount(String(ironPerClick(state)))} / toque`);
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      "[data-upgrade]",
    )) {
      const kind = button.dataset["upgrade"] as Upgrade,
        cost = upgradeCost(state, kind);
      const level = document.getElementById(`level-${kind}`);
      if (level) level.textContent = `Nível ${state.upgrades[kind]}`;
      text(
        `cost-${kind}`,
        cost
          ? `${cost.iron.toLocaleString("pt-BR")} ferro + ${cost.coin.toLocaleString("pt-BR")} Coins`
          : "Nível máximo",
      );
      button.disabled =
        !cost ||
        BigInt(state.balances.iron) < BigInt(cost.iron) * 1000n ||
        BigInt(state.balances.coin) < BigInt(cost.coin) * 1000n;
      button.textContent =
        kind === "coal" && !state.upgrades.coal ? "Desbloquear" : "Melhorar";
    }
    text(
      "tutorial",
      !state.tutorial.victory
        ? "Primeiro passo: acompanhe sua primeira vitória. Você já pode visitar a Mina."
        : !state.tutorial.mined
          ? "Próximo passo: vá à Mina e toque no ferro."
          : !state.tutorial.upgraded
            ? "Abra Melhorias e use ferro e Coins para fortalecer o guerreiro."
            : !state.upgrades.coal
              ? "Desbloqueie o carvão na Mina: 100 ferro + 50 Coins."
              : state.battle.highest < 10
                ? "Seu reino produz carvão! Fortaleça o guerreiro para o boss do andar 10."
                : "Conquiste novos andares e evolua o equipamento na Mochila.",
    );
    const offline = document.getElementById("offline-summary")!;
    const showOffline =
      session.offline.ms >= 1000 &&
      [session.offline.coal, session.offline.gold, session.offline.jade].some(
        (v) => BigInt(v) > 0n,
      );
    offline.hidden = !showOffline;
    if (showOffline) {
      offline.textContent = `Retomada: +${formatAmount(session.offline.coal)} carvão, +${formatAmount(session.offline.gold)} ouro e +${formatAmount(session.offline.jade)} jade por ${Math.round(session.offline.ms / 1000)}s de ausência (limite 8h). Já creditado; não é necessário coletar.`;
    }

    for (const output of document.querySelectorAll<HTMLElement>(
      "[data-balance]",
    )) {
      const key = output.dataset["balance"] as keyof typeof state.balances;
      output.textContent = output.hasAttribute("data-compact")
        ? compactAmount(state.balances[key])
        : formatAmount(state.balances[key]);
    }
    if (route === "battle" || route === "mine") {
      if (route !== routeForScreen(state.screen))
        renderRoute(routeForScreen(state.screen));
    }
  });
  renderRoute(route);
  saveButton.disabled = online || !writable;
  let saveRequested = false;
  let saveInFlight: Promise<void> | undefined;
  function persist(): Promise<void> {
    if (online) {
      session.tick();
      return Promise.resolve();
    }
    if (!repository || !writable) return Promise.resolve();
    saveRequested = true;
    if (saveInFlight) return saveInFlight;
    saveButton.disabled = true;
    saveInFlight = (async () => {
      while (saveRequested && writable) {
        saveRequested = false;
        try {
          session.tick();
          const current = session.getSnapshot();
          current.savedAt = current.lastReconciledAt;
          session.acknowledgeSave(await repository!.save(current));
          status.textContent = "Perfil salvo neste navegador.";
        } catch (error) {
          writable = false;
          status.textContent =
            error instanceof SaveConflictError
              ? "Outro perfil/aba gravou uma versão mais recente. Recarregue antes de salvar."
              : "Falha de salvamento. Dados anteriores preservados; recarregue para tentar novamente.";
        }
      }
    })().finally(() => {
      saveInFlight = undefined;
      saveButton.disabled = online || !writable;
    });
    return saveInFlight;
  }
  const removers: Array<() => void> = [];
  function listen<T extends Event>(
    target: EventTarget,
    type: string,
    handler: (event: T) => void,
  ): void {
    target.addEventListener(type, handler as EventListener);
    removers.push(() =>
      target.removeEventListener(type, handler as EventListener),
    );
  }
  function navigate(next: Route): void {
    if (next === "battle" || next === "mine") {
      session.selectScreen(next);
      if (route !== next) renderRoute(next);
    } else renderRoute(next);
  }
  listen<KeyboardEvent>(document, "keydown", (event) => {
    if (
      event.key === "Escape" &&
      !dialog.open &&
      (route === "upgrades" ||
        route === "bag" ||
        route === "shop" ||
        route === "community" ||
        route === "market" || route === "bestiary")
    ) {
      navigate(routeForScreen(session.getSnapshot().screen));
      event.preventDefault();
    }
  });
  for (const id of ["nickname-setup", "profile-name-form"]) {
    listen<SubmitEvent>(
      document.getElementById(id)!,
      "submit",
      async (event) => {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement;
        const name = String(new FormData(form).get("name") ?? "").trim();
        if (name.length < 3 || name.length > 24) return;
        if (session instanceof LocalSession) {
          session.setName(name);
          text("profile-name-status", "Salvando nick…");
          await persist();
          text(
            "profile-name-status",
            writable
              ? "Nick salvo."
              : "Não foi possível salvar o nick; confira o estado do perfil.",
          );
        } else {
          const sent = communityUI.rename(name);
          if (sent) submittedName = name;
          text(
            "profile-name-status",
            sent
              ? "Apelido enviado; aguardando confirmação."
              : "Aguarde a operação atual e tente novamente.",
          );
        }
      },
    );
  }
  listen(document.getElementById("profile-open")!, "click", () =>
    openDialog("menu", document.getElementById("profile-open")!),
  );
  let returnFocus: HTMLElement | undefined;
  function openDialog(kind: "menu" | "resources", trigger: HTMLElement): void {
    returnFocus = trigger;
    document.querySelector<HTMLElement>("#dialog-menu")!.hidden =
      kind !== "menu";
    document.querySelector<HTMLElement>("#dialog-resources")!.hidden =
      kind !== "resources";
    document.querySelector("#dialog-title")!.textContent =
      kind === "menu" ? "Seu reino" : "Recursos";
    visual.setOverlay(true);
    dialog.showModal();
  }
  function closeDialog(): void {
    dialog.close();
  }
  listen(dialog, "close", () => {
    visual.setOverlay(
      route === "upgrades" ||
        route === "bag" ||
        route === "shop" ||
        route === "community" ||
        route === "market" || route === "bestiary",
    );
    returnFocus?.focus();
  });
  listen(dialog, "click", (event: MouseEvent) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        closeDialog();
    }
  });
  listen(document.querySelector("#more")!, "click", () =>
    openDialog("menu", document.querySelector<HTMLElement>("#more")!),
  );
  listen(document.querySelector("#resources")!, "click", () =>
    openDialog("resources", document.querySelector<HTMLElement>("#resources")!),
  );
  listen(document.querySelector("#close-dialog")!, "click", closeDialog);
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-route]",
  ))
    listen(button, "click", () => navigate(button.dataset["route"] as Route));
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-shortcut]",
  ))
    listen(button, "click", () => {
      closeDialog();
      navigate(
        button.dataset["shortcut"] as "bag" | "shop" | "community" | "market",
      );
    });
  listen(mineTarget, "click", () => {
    if (
      visualReady &&
      route === "mine" &&
      !dialog.open &&
      !document.hidden &&
      visual.hitMine() &&
      session.mine()
    )
      text(
        "mining-feedback",
        online
          ? "Toque enviado; aguardando confirmação."
          : `Ferro recebido. Saldo: ${formatAmount(session.getSnapshot().balances.iron)}.`,
      );
  });
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-upgrade]",
  ))
    listen(button, "click", () => {
      if (dialog.open || document.hidden) return;
      const kind = button.dataset["upgrade"] as Upgrade;
      text(
        "action-status",
        session.buy(kind)
          ? online
            ? "Compra enviada; aguardando confirmação."
            : "Melhoria adquirida."
          : "Recursos insuficientes ou nível máximo.",
      );
      void persist();
    });
  listen(document.querySelector("#retry-battle")!, "click", () => {
    if (!dialog.open && session.retry()) {
      text(
        "action-status",
        online ? "Tentativa solicitada." : "Nova tentativa iniciada.",
      );
      content.scrollTop = 0;
      void persist();
    }
  });
  listen(document.querySelector("#train-battle")!, "click", () => {
    if (!dialog.open && session.train()) {
      text(
        "action-status",
        "Treino iniciado. O boss aguardará uma tentativa manual.",
      );
      content.scrollTop = 0;
      void persist();
    }
  });
  listen(document.querySelector("#pause-battle")!, "click", () => {
    if (!dialog.open) {
      session.togglePause();
      void persist();
    }
  });
  const reduced = document.querySelector<HTMLInputElement>("#reduce-motion")!;
  reduced.checked = matchMedia("(prefers-reduced-motion: reduce)").matches;
  visual.setReducedMotion(reduced.checked);
  listen(reduced, "change", () => visual.setReducedMotion(reduced.checked));
  listen(saveButton, "click", () => {
    void persist();
  });
  listen(recoverButton, "click", () => {
    recoverButton.disabled = true;
    void repository
      ?.restoreBackup()
      .then(() => location.reload())
      .catch(() => {
        status.textContent =
          "Restauração não concluída; dados preservados. Recarregue para tentar novamente.";
        recoverButton.disabled = false;
      });
  });
  const tick = window.setInterval(() => session.tick(), 100);
  const autosave = window.setInterval(() => {
    void persist();
  }, 15_000);
  listen(document, "visibilitychange", () => {
    if (document.hidden) {
      session.suspend();
      void persist();
    } else {
      session.resume();
      void persist();
    }
  });
  if (document.hidden) session.suspend();
  void persist();
  listen(window, "pagehide", () => {
    session.suspend();
    void persist();
  });
  listen(window, "pageshow", () => {
    session.resume();
  });
  import.meta.hot?.dispose(() => {
    clearInterval(tick);
    clearInterval(autosave);
    removers.forEach((remove) => remove());
    unsubscribe();
    session.dispose();
    rpgUI.destroy();
    communityUI.destroy();
    battleGlobal.destroy();
    bossBroadcast.destroy();
    combatLab.destroy();
    marketUI.destroy();
    premiumUI.destroy();
    repository?.close();
    visual.destroy();
  });
}
void boot().catch(() => {
  assetStatus.hidden = false;
  assetStatus.textContent =
    import.meta.env.VITE_GAME_MODE === "online"
      ? "Servidor online indisponível. Recarregue para reconectar; o perfil local permanece separado."
      : "Falha ao iniciar o jogo local. Recarregue para tentar novamente.";
  saveButton.disabled = true;
});
