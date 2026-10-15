import {
  LocalSnapshotSchema,
  type LocalSnapshot,
  type OnlineState,
  type OnlineAction,
  type OnlineCommand,
  type CommandResult,
  type RpgCommand,
  type Screen,
  type Upgrade,
} from "@akai/shared";
export class ApiFailure extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, {
    credentials: "same-origin",
    headers: {
      "X-Akai-Client": "1",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined
      ? {}
      : { method: "POST", body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok && !(result.commandId && result.status === "rejected"))
    throw new ApiFailure(
      result.error?.code ?? "REQUEST_FAILED",
      response.status,
    );
  return result as T;
}
export class OnlineSession {
  private state!: LocalSnapshot;
  private version = 0;
  private sequence = -1;
  private listeners = new Set<(s: LocalSnapshot) => void>();
  private busy = false;
  private retryAt = 0;
  private pending: OnlineCommand | undefined;
  private suspended = false;
  private disposed = false;
  private socket: WebSocket | undefined;
  private reconnect: ReturnType<typeof setTimeout> | undefined;
  offline = { ms: 0, coal: "0", gold: "0", jade: "0" };
  constructor(
    initial: OnlineState,
    private report: (s: string) => void,
  ) {
    this.accept(initial);
    this.connect();
  }
  getSnapshot() {
    return structuredClone(this.state);
  }
  private accept(s: OnlineState) {
    if (s.stateVersion <= this.sequence) return;
    this.sequence = s.stateVersion;
    this.version = s.commandVersion;
    const screen = this.state?.screen ?? "battle";
    this.state = LocalSnapshotSchema.parse({
      ...s.snapshot,
      mode: "local",
      profile: { id: "local-test", name: s.snapshot.profile.name },
      screen,
      rpg: { ...s.snapshot.rpg, rng: 1 },
    });
    this.emit();
  }
  subscribe(fn: (s: LocalSnapshot) => void) {
    this.listeners.add(fn);
    fn(this.getSnapshot());
    return () => {
      this.listeners.delete(fn);
    };
  }
  private emit() {
    for (const fn of this.listeners) fn(this.getSnapshot());
  }
  selectScreen(screen: Screen) {
    this.state.screen = screen;
    this.emit();
  }
  private connect() {
    if (this.disposed || this.suspended) return;
    const url = new URL("/api/v1/stream", location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(url);
    this.socket = socket;
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data));
        if (data.type === "snapshot") {
          this.accept(data);
          if (!this.pending)
            this.report("Online · progresso confirmado pelo servidor.");
        }
      } catch {
        socket.close();
      }
    };
    socket.onclose = () => {
      if (this.disposed || this.suspended) return;
      this.report("Reconectando · ações bloqueadas até confirmar o estado.");
      this.reconnect = setTimeout(() => {
        void this.sync()
          .then(() => this.connect())
          .catch((error) => {
            if (error instanceof ApiFailure && error.status === 401) {
              this.suspended = true;
              this.report(
                "Sessão encerrada. Recarregue para entrar novamente.",
              );
            } else this.connect();
          });
      }, 2000);
    };
  }
  private async sync() {
    this.accept(await api<OnlineState>("state"));
  }
  private send(action: OnlineAction): boolean {
    if (
      this.disposed ||
      this.suspended ||
      this.busy ||
      this.pending ||
      this.socket?.readyState !== WebSocket.OPEN
    )
      return false;
    this.pending = {
      commandId: crypto.randomUUID(),
      expectedVersion: this.version,
      action,
    };
    void this.flush();
    return true;
  }
  private async flush() {
    if (
      this.busy ||
      !this.pending ||
      this.suspended ||
      Date.now() < this.retryAt
    )
      return;
    this.busy = true;
    try {
      const result = await api<CommandResult>("commands", this.pending);
      this.pending = undefined;
      await this.sync();
      this.report(
        result.status === "applied"
          ? "Ação confirmada pelo servidor."
          : `Ação recusada: ${result.code}. Tente novamente após sincronizar.`,
      );
    } catch (error) {
      if (error instanceof ApiFailure && error.status === 401) {
        this.suspended = true;
        this.report("Sessão encerrada. Recarregue para entrar novamente.");
      } else {
        this.retryAt = Date.now() + 1000;
        this.report(
          "Resultado ainda não confirmado. Reconectando com o mesmo comando.",
        );
      }
    } finally {
      this.busy = false;
    }
  }
  tick() {
    if (!this.disposed && !this.suspended && this.pending) void this.flush();
  }
  mine() {
    return this.state.screen === "mine" && this.send({ type: "mining.click" });
  }
  buy(kind: Upgrade) {
    return this.send({ type: "upgrade", kind });
  }
  retry() {
    return this.send({ type: "battle", action: "retry" });
  }
  train() {
    return this.send({ type: "battle", action: "train" });
  }
  togglePause() {
    this.send({
      type: "battle",
      action: this.state.battle.paused ? "resume" : "pause",
    });
  }
  rpgCommand(command: RpgCommand) {
    return this.send({ type: "rpg", command });
  }
  suspend() {
    this.suspended = true;
    clearTimeout(this.reconnect);
    this.socket?.close();
    void api("presence/away", {}).catch(() => {});
  }
  resume() {
    if (!this.suspended) return;
    this.suspended = false;
    void this.sync()
      .then(() => this.connect())
      .catch(() => this.connect());
  }
  acknowledgeSave(_generation: number) {}
  dispose() {
    this.disposed = true;
    clearTimeout(this.reconnect);
    this.socket?.close();
    this.listeners.clear();
  }
}
export async function onlineBootstrap(
  status: HTMLElement,
): Promise<OnlineState> {
  try {
    return await api<OnlineState>("bootstrap");
  } catch (error) {
    if (!(error instanceof ApiFailure && error.status === 401)) throw error;
  }
  const container = document.createElement("section");
  container.className = "panel";
  container.innerHTML =
    '<h2>Entre no reino online</h2><p>Uma conta nova começa do zero. O perfil local permanece separado.</p><button id="guest-start">Criar convidado</button><form id="recover-online"><label>Chave de recuperação<input id="online-key" autocomplete="off" type="password" required minlength="43" maxlength="43"></label><button>Recuperar conta</button></form><p id="login-message" role="status"></p>';
  document.querySelector("#content")!.prepend(container);
  void googleControl(container, false).catch(() => {});
  await new Promise<void>((resolve) => {
    const run = async (path: string, body: unknown) => {
      const buttons = container.querySelectorAll("button");
      buttons.forEach((b) => (b.disabled = true));
      const message = container.querySelector<HTMLElement>("#login-message")!;
      try {
        const result = await api<{ recoveryKey: string }>(path, body);
        message.textContent =
          "Guarde esta chave em local seguro. Ela recupera a conta e substitui a chave anterior: " +
          result.recoveryKey;
        const proceed = document.createElement("button");
        proceed.textContent = "Guardei a chave. Entrar";
        proceed.onclick = () => resolve();
        container.append(proceed);
      } catch {
        message.textContent =
          "Não foi possível entrar. Confira a chave ou tente novamente.";
        buttons.forEach((b) => (b.disabled = false));
      }
    };
    container.querySelector("#guest-start")!.addEventListener("click", () => {
      void run("auth/guest", {});
    });
    container.querySelector("form")!.addEventListener("submit", (event) => {
      event.preventDefault();
      void run("auth/recover", {
        recoveryKey:
          container.querySelector<HTMLInputElement>("#online-key")!.value,
      });
    });
  });
  container.remove();
  status.textContent = "Conectando ao servidor…";
  return api<OnlineState>("bootstrap");
}
type GoogleApi = {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        nonce: string;
        callback: (response: { credential: string }) => void;
      }): void;
      renderButton(
        element: HTMLElement,
        options: { theme: string; size: string },
      ): void;
    };
  };
};
let googleScript: Promise<void> | undefined;
export async function googleControl(parent: HTMLElement, link: boolean) {
  const config = await api<{ googleClientId: string | null }>("auth/config");
  if (!config.googleClientId) return;
  const button = document.createElement("button");
  button.textContent = link ? "Vincular conta Google" : "Entrar com Google";
  parent.append(button);
  button.onclick = () => {
    button.disabled = true;
    void (async () => {
      googleScript ??= new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(Error("PROVIDER_UNAVAILABLE"));
        document.head.append(script);
      });
      await googleScript;
      const { nonce } = await api<{ nonce: string }>(
        link ? "auth/google/nonce" : "auth/google/login/nonce",
        {},
      );
      const google = (window as unknown as { google: GoogleApi }).google;
      google.accounts.id.initialize({
        client_id: config.googleClientId!,
        nonce,
        callback: (response) => {
          void api(link ? "auth/google/link" : "auth/google/login", {
            idToken: response.credential,
          })
            .then(() => {
              if (!link) location.reload();
              else button.textContent = "Conta Google vinculada.";
            })
            .catch(() => {
              button.disabled = false;
              button.textContent =
                "Não foi possível confirmar o Google. Tentar novamente";
            });
        },
      });
      const target = document.createElement("div");
      parent.append(target);
      google.accounts.id.renderButton(target, {
        theme: "outline",
        size: "large",
      });
    })().catch(() => {
      button.disabled = false;
      button.textContent = "Google indisponível. Tentar novamente";
    });
  };
}
