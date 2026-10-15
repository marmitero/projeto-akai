import "./style.css";
import { heroStats, upgradeCost, type Upgrade } from "@akai/shared";
import {
  LocalSession,
  createLocalSnapshot,
  systemClock,
} from "./local/session.js";
import { SaveRepository, SaveConflictError } from "./persistence/repository.js";
import { createGame } from "./game/create-game.js";
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
  if ((import.meta.env.VITE_GAME_MODE ?? "local") !== "local") {
    assetStatus.textContent =
      "Modo online indisponível. Nenhum perfil local será usado como conta online.";
    assetStatus.setAttribute("role", "alert");
    status.textContent = assetStatus.textContent;
    for (const button of document.querySelectorAll<HTMLButtonElement>("button"))
      button.disabled = true;
    return;
  }
  let repository: SaveRepository | undefined;
  let snapshot = createLocalSnapshot(Date.now());
  let writable = true;
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
  const session = new LocalSession(systemClock, snapshot);
  let route: Route = snapshot.screen;
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
    scroll.set(route, content.scrollTop);
    route = next;
    const info = routeLabels[next];
    document.querySelector("#page-title")!.textContent = info.title;
    document.querySelector("#page-kicker")!.textContent = info.kicker;
    document.querySelector("#page-badge")!.textContent =
      next === "battle"
        ? `Andar ${session.getSnapshot().battle.floor} / 20`
        : info.badge;
    document.querySelector("#scene-caption")!.textContent = info.caption;
    document.querySelector("#visual-description")!.textContent =
      info.description;
    stage.setAttribute("aria-label", info.description);
    const gameplay =
      next === "battle" || next === "mine" || next === "production";
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
  const text = (id: string, value: string): void => {
    const e = document.getElementById(id)!;
    if (e.textContent !== value) e.textContent = value;
  };
  let lastAnnouncement = "";
  const unsubscribe = session.subscribe((state) => {
    visual.setBattle(state);
    const b = state.battle,
      stats = heroStats(state),
      boss = b.enemies.length === 1;
    stage.dataset["heroHp"] = String(b.heroHp);
    text("hero-stats", `ATQ ${stats.attack} · Vida ${stats.hp}`);
    text("hero-hp", `${b.heroHp} / ${stats.hp}`);
    const bar = document.querySelector<HTMLProgressElement>("#hero-health")!;
    bar.max = stats.hp;
    bar.value = b.heroHp;
    const enemyKey = b.enemies.map((e) => `${e.hp}/${e.maxHp}`).join(",");
    const enemyList = document.querySelector<HTMLElement>("#enemy-health")!;
    if (enemyList.dataset["hp"] !== enemyKey) {
      enemyList.dataset["hp"] = enemyKey;
      enemyList.innerHTML = b.enemies
        .map(
          (e, i) =>
            `<label>${boss ? "Guardião Ossudo" : `Esqueleto ${i + 1}`} · ${e.hp}/${e.maxHp}<progress max="${e.maxHp}" value="${e.hp}"></progress></label>`,
        )
        .join("");
    }
    text(
      "enemy-name",
      boss
        ? "Guardião Ossudo"
        : `${b.enemies.filter((e) => e.hp > 0).length} esqueletos vivos`,
    );
    text(
      "battle-status",
      b.phase === "failed"
        ? `${b.failure === "trained" ? "Treino concluído." : b.failure === "timeout" ? "Tempo do boss esgotado." : "Seu guerreiro foi derrotado."} ${b.retryFloor % 10 === 0 ? `Andar atual ${b.floor}. ` : ""}Melhore seu guerreiro e tente o andar ${b.retryFloor} novamente.`
        : b.phase === "complete"
          ? "Torre local concluída! Você venceu os 20 andares. A expansão continua na próxima fase."
          : b.paused
            ? `Batalha pausada. ${boss ? Math.max(0, Math.ceil((b.deadline - b.time) / 1000)) + "s restantes no boss." : "Mineração e produção continuam."}`
            : b.phase === "transition"
              ? "Vitória! Seguindo para o próximo encontro…"
              : `Andar ${b.floor} ${b.training ? "· Treino " : ""}· ${boss ? "Boss" : `Onda ${b.wave}/3`} · ${boss ? `${Math.max(0, Math.ceil((b.deadline - b.time) / 1000))}s restantes` : "Combate automático"}`,
    );
    document.querySelector<HTMLButtonElement>("#retry-battle")!.hidden =
      b.phase !== "failed";
    document.querySelector<HTMLButtonElement>("#train-battle")!.hidden =
      b.phase !== "failed" || b.retryFloor % 10 !== 0;
    if (route === "battle") text("page-badge", `Andar ${b.floor} / 20`);
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
    text("click-gain", `${1 + state.upgrades.click} / toque`);
    text(
      "coal-production",
      state.upgrades.coal
        ? `Nível ${state.upgrades.coal} · ${(state.upgrades.coal / 10).toLocaleString("pt-BR")} /s`
        : "Bloqueada · 0/s",
    );
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
            ? "Use ferro e Coins para melhorar a força do guerreiro."
            : !state.upgrades.coal
              ? "Desbloqueie o carvão em Produção: 100 ferro + 50 Coins."
              : state.battle.highest < 10
                ? "Seu reino produz carvão! Fortaleça o guerreiro para o boss do andar 10."
                : "Continue fortalecendo o guerreiro até conquistar o andar 20.",
    );
    const offline = document.getElementById("offline-summary")!;
    if (BigInt(session.offline.coal) > 0n) {
      offline.hidden = false;
      offline.textContent = `Retomada: +${formatAmount(session.offline.coal)} carvão por ${Math.round(session.offline.ms / 1000)}s de ausência (limite 8h). Já creditado; não é necessário coletar.`;
    }

    for (const output of document.querySelectorAll<HTMLElement>(
      "[data-balance]",
    )) {
      const key = output.dataset["balance"] as keyof typeof state.balances;
      output.textContent = formatAmount(state.balances[key]);
    }
    if (route === "battle" || route === "mine" || route === "production") {
      if (route !== state.screen) renderRoute(state.screen);
    }
  });
  renderRoute(route);
  saveButton.disabled = !writable;
  let saving = false;
  async function persist(): Promise<void> {
    if (!repository || !writable || saving) return;
    saving = true;
    saveButton.disabled = true;
    try {
      session.tick();
      const current = session.getSnapshot();
      current.savedAt = current.lastReconciledAt;
      session.acknowledgeSave(await repository.save(current));
      status.textContent = "Perfil salvo neste navegador.";
    } catch (error) {
      writable = false;
      status.textContent =
        error instanceof SaveConflictError
          ? "Outro perfil/aba gravou uma versão mais recente. Recarregue antes de salvar."
          : "Falha de salvamento. Dados anteriores preservados; recarregue para tentar novamente.";
    } finally {
      saving = false;
      saveButton.disabled = !writable;
    }
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
    if (next === "battle" || next === "mine" || next === "production") {
      session.selectScreen(next);
      if (route !== next) renderRoute(next);
    } else renderRoute(next);
  }
  listen<KeyboardEvent>(document, "keydown", (event) => {
    if (
      event.key === "Escape" &&
      !dialog.open &&
      (route === "bag" || route === "shop")
    ) {
      navigate(session.getSnapshot().screen);
      event.preventDefault();
    }
  });
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
    visual.setOverlay(route === "bag" || route === "shop");
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
      navigate(button.dataset["shortcut"] as "bag" | "shop");
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
        `Ferro recebido. Saldo: ${formatAmount(session.getSnapshot().balances.iron)}.`,
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
          ? "Melhoria adquirida."
          : "Recursos insuficientes ou nível máximo.",
      );
      void persist();
    });
  listen(document.querySelector("#retry-battle")!, "click", () => {
    if (!dialog.open && session.retry()) {
      text("action-status", "Nova tentativa iniciada.");
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
    repository?.close();
    visual.destroy();
  });
}
void boot().catch(() => {
  assetStatus.hidden = false;
  assetStatus.textContent =
    "Falha ao iniciar o jogo local. Recarregue para tentar novamente.";
  saveButton.disabled = true;
});
