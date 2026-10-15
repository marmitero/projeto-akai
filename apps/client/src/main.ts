import "./style.css";
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
      status.textContent = "Novo perfil local. Nenhum recurso concedido.";
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
    document.querySelector("#page-badge")!.textContent = info.badge;
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
  const unsubscribe = session.subscribe((state) => {
    for (const output of document.querySelectorAll<HTMLElement>(
      "[data-balance]",
    )) {
      const key = output.dataset["balance"] as keyof typeof state.balances;
      output.textContent = (BigInt(state.balances[key]) / 1000n).toLocaleString(
        "pt-BR",
      );
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
      const current = session.getSnapshot();
      current.savedAt = Date.now();
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
    if (visualReady && route === "mine" && !dialog.open && visual.hitMine())
      document.querySelector("#mining-feedback")!.textContent =
        "Impacto visual. Nenhum ferro recebido nesta prévia.";
  });
  listen(document.querySelector("#preview-defeat")!, "click", () => {
    if (visualReady && route === "battle" && !dialog.open)
      visual.previewDefeat();
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
  const tick = window.setInterval(() => session.tick(), 1000);
  const autosave = window.setInterval(() => {
    void persist();
  }, 15_000);
  listen(document, "visibilitychange", () => {
    if (document.hidden) {
      session.suspend();
      void persist();
    } else session.resume();
  });
  if (document.hidden) session.suspend();
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
    "Falha ao iniciar a prévia local. Recarregue para tentar novamente.";
  saveButton.disabled = true;
});
