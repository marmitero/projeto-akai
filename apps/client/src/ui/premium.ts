import { commandId } from '../browser-crypto.js';
import {
  PremiumCommandSchema,
  PREMIUM_PRODUCTS,
  REWARDED_TYPES,
  type PremiumCommand,
  type PremiumResult,
  type PremiumView,
  type RewardedType,
} from "@akai/shared";
import { api, ApiFailure } from "../online-session.js";
import { assets } from "../assets/catalog.js";
const labels: Record<RewardedType, string> = {
  autoclick: "Autoclick: 3 cliques/s por 2 minutos",
  battle_rewards:
    "Coins e XP da torre em dobro por 2 minutos (sem duplicar itens)",
  battle_damage: "Dano da torre em dobro por 2 minutos",
  coins: "Coins conforme o andar concluído",
};
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  return e;
};
const number = (value: string) =>
  `${BigInt(value) / 1000n}${BigInt(value) % 1000n ? "," + String(BigInt(value) % 1000n).padStart(3, "0") : ""}`;
export function createPremiumUI(root: HTMLElement, online: boolean) {
  const host = root.querySelector<HTMLElement>("#premium-root")!;
  if (!online) {
    host.innerHTML =
      '<article class="panel premium-card"><h2>Loja indisponível no perfil local</h2><p>Compras e recompensas premium exigem conta e servidor. O jogar.bat continua sem pagamentos ou anúncios.</p></article>';
    return { show: () => {}, destroy: () => {} };
  }
  host.innerHTML = `<p id="premium-mode" class="notice"></p><p id="premium-status" role="status" aria-live="polite"></p><p id="premium-balance"></p><section id="premium-review" class="panel premium-card" hidden><h2>Revisar simulação</h2><p></p><button id="premium-confirm">Confirmar teste</button><button id="premium-dismiss">Voltar</button></section><h2>Pacotes de Rubies</h2><p>Catálogo experimental. Quantidades e condições de venda real ainda não aprovadas. Rubies não podem ser negociados no mercado.</p><div id="premium-catalog"></div><h2>Compras e recompensas em andamento</h2><div id="premium-intents"></div><h2>Recompensas voluntárias</h2><p>Até 8 solicitações por 24h, intervalo de 5 minutos. Bônus duram 2 minutos e não acumulam. Valem enquanto a conta estiver presente; não acumulam ataques ou cliques offline. Não afetam arena, boss global ou guerra.</p><div id="premium-ads"></div><p id="premium-ad-limit"></p><h2>Benefícios confirmados</h2><div id="premium-benefits"></div><div id="premium-owned"></div><button id="premium-restore">Restaurar e verificar compras registradas</button><p>Restauração revalida recibos já conhecidos no servidor. O adaptador nativo deverá enviar também as compras retornadas pela loja da plataforma.</p><h2>Histórico</h2><div id="premium-history"></div>`;
  let active = false,
    disposed = false,
    loading = false,
    retry = 0,
    state: PremiumView | undefined,
    pending: PremiumCommand | undefined,
    review: Omit<PremiumCommand, "commandId"> | undefined,
    queuedSimulation: PremiumView["intents"][number] | undefined;
  const status = host.querySelector<HTMLElement>("#premium-status")!,
    box = host.querySelector<HTMLElement>("#premium-review")!;
  const cache = new Map<string, string>();
  const key = () => `akai-premium-pending:${state!.accountId}`;
  const persist = () => {
    if (!state) return;
    try {
      if (pending) sessionStorage.setItem(key(), JSON.stringify(pending));
      else sessionStorage.removeItem(key());
    } catch {}
  };
  const button = (label: string, fn: () => void) => {
    const b = el("button", label);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
  };
  function send(input: unknown) {
    if (pending) {
      status.textContent = "Aguarde a confirmação anterior.";
      return;
    }
    const parsed = PremiumCommandSchema.safeParse(input);
    if (!parsed.success) {
      status.textContent = "Operação inválida.";
      return;
    }
    pending = parsed.data;
    persist();
    status.textContent = "Aguardando confirmação do servidor…";
    void refresh();
  }
  function prepare(action: Omit<PremiumCommand, "commandId">, summary: string) {
    if (pending) return;
    review = action;
    box.querySelector("p")!.textContent = summary;
    box.hidden = false;
    host.querySelector<HTMLButtonElement>("#premium-confirm")!.focus();
    box.scrollIntoView({ block: "nearest" });
  }
  host.querySelector("#premium-confirm")!.addEventListener("click", () => {
    if (!review) return;
    const action = review;
    review = undefined;
    box.hidden = true;
    send({ ...action, commandId: commandId() });
  });
  host.querySelector("#premium-dismiss")!.addEventListener("click", () => {
    review = undefined;
    box.hidden = true;
  });
  host
    .querySelector("#premium-restore")!
    .addEventListener("click", () =>
      send({ type: "restore", commandId: commandId() }),
    );
  function list(id: string, data: unknown, make: () => HTMLElement[]) {
    const signature = JSON.stringify(data);
    if (cache.get(id) === signature) return;
    cache.set(id, signature);
    const rows = make();
    host
      .querySelector("#" + id)!
      .replaceChildren(
        ...(rows.length ? rows : [el("p", "Nenhum registro disponível.")]),
      );
  }
  async function simulate(intent: PremiumView["intents"][number]) {
    if (pending) {
      status.textContent = "Aguarde a confirmação da operação anterior.";
      return;
    }
    if (loading) {
      queuedSimulation = intent;
      status.textContent =
        "Concluindo a simulação assim que a sincronização terminar…";
      return;
    }
    loading = true;
    status.textContent = "Processando simulação local, sem cobrança…";
    try {
      const response = await api<{ purchaseToken?: string }>(
        "premium/sandbox",
        { intentId: intent.id },
      );
      if (response.purchaseToken) {
        pending = {
          type: "purchase.verify",
          intentId: intent.id,
          purchaseToken: response.purchaseToken,
          commandId: commandId(),
        };
        persist();
      } else status.textContent = "Recompensa de teste validada.";
    } catch (error) {
      status.textContent =
        error instanceof ApiFailure
          ? message(error.code)
          : "Sem resposta. Tente novamente; a simulação mantém o mesmo recibo.";
      retry = Date.now() + 2000;
    } finally {
      loading = false;
      void refresh();
    }
  }
  function message(code: string) {
    return (
      (
        {
          AD_COOLDOWN: "Aguarde 5 minutos entre solicitações.",
          AD_DAILY_LIMIT: "Limite de 8 solicitações em 24h atingido.",
          AD_ALREADY_PENDING: "Já há uma recompensa aguardando conclusão.",
          BONUS_ALREADY_ACTIVE: "Esse bônus ainda está ativo.",
          PURCHASE_ALREADY_PENDING:
            "Conclua ou cancele a compra de teste anterior.",
          ALREADY_OWNED: "Você já possui este cosmético.",
          COMPLETE_FLOOR_ONE: "Conclua o andar 1 primeiro.",
          SANDBOX_AD_NOT_FINISHED:
            "A simulação exige ao menos 5 segundos antes de concluir.",
          AD_EXPIRED:
            "A sessão de recompensa expirou. Nenhum benefício concedido.",
          INTENT_EXPIRED: "Esta simulação expirou.",
          ACCOUNT_SUSPENDED: "Conta indisponível para esta operação.",
          MONETIZATION_DISABLED: "A loja está desativada neste servidor.",
          AD_NATIVE_PROVIDER_REQUIRED:
            "Anúncios exigem o adaptador nativo e configuração do provedor.",
          INVALID_PURCHASE_PROOF: "O recibo não foi validado.",
          PROVIDER_UNAVAILABLE:
            "O provedor está indisponível; sua operação será verificada novamente.",
        } as Record<string, string>
      )[code] ??
      "Operação recusada. Atualize a loja e confira o estado da compra."
    );
  }
  function cosmetic(s: PremiumView) {
    const target = root.querySelector<HTMLElement>("#profile-title");
    if (target) {
      target.hidden = !s.entitlements.includes("title_miner");
      target.textContent = s.entitlements.includes("title_miner")
        ? "Guardião das Minas"
        : "";
    }
  }
  function render(s: PremiumView) {
    cosmetic(s);
    host.querySelector("#premium-mode")!.textContent =
      s.mode === "sandbox"
        ? "SANDBOX LOCAL · simulação explícita, sem anúncios reais ou cobrança. Use somente banco isolado."
        : s.mode === "google-play-test"
          ? "GOOGLE PLAY · somente compras de teste verificadas. Checkout nativo ainda depende do app Android."
          : "Loja desativada: nenhuma compra, anúncio ou recompensa premium disponível.";
    host.querySelector("#premium-balance")!.textContent =
      `Rubies: ${number(s.rubyBalance)}${s.rubyDebt !== "0" ? ` · ajuste pendente de estorno: ${number(s.rubyDebt)}` : ""}`;
    host.querySelector<HTMLButtonElement>("#premium-restore")!.disabled =
      s.mode === "off";
    list("premium-catalog", [s.mode, s.entitlements], () =>
      PREMIUM_PRODUCTS.map((p) => {
        const row = el("article");
        row.className = "panel premium-card";
        const img = el("img");
        img.src = p.kind === "entitlement" ? assets.pickaxe : assets.ruby;
        img.className = "sprite";
        img.alt = "";
        row.append(
          img,
          el("h3", p.name),
          el(
            "p",
            p.kind === "consumable"
              ? `${p.rubies} Rubies de teste`
              : "Título cosmético de conta, sem atributos ou poder",
          ),
          el("p", "Sem preço real definido."),
        );
        const b = button("Solicitar compra de teste", () =>
          prepare(
            { type: "purchase.intent", productId: p.id } as Omit<
              PremiumCommand,
              "commandId"
            >,
            `${p.name}: ${p.kind === "consumable" ? p.rubies + " Rubies de teste" : "título cosmético"}. Isto é uma simulação local, sem cobrança. Valores reais continuam indefinidos.`,
          ),
        );
        b.disabled = s.mode !== "sandbox" || s.entitlements.includes(p.id);
        b.dataset["premiumProduct"] = p.id;
        row.append(b);
        return row;
      }),
    );
    list("premium-ads", s.mode, () =>
      REWARDED_TYPES.map((reward) => {
        const row = el("article");
        row.className = "panel premium-card";
        row.append(el("h3", labels[reward]));
        const b = button("Iniciar simulação voluntária", () =>
          prepare(
            { type: "ad.intent", reward } as Omit<PremiumCommand, "commandId">,
            `${labels[reward]}. Simulador local, não é um anúncio. A recompensa depende da confirmação do ambiente de teste. A solicitação conta no limite e expira em 10 minutos.`,
          ),
        );
        b.disabled = s.mode !== "sandbox";
        b.dataset["premiumReward"] = reward;
        row.append(b);
        return row;
      }),
    );
    const current = s.intents.filter(
      (i) =>
        ["created", "pending"].includes(i.state) && i.expiresAt > s.serverTime,
    );
    list("premium-intents", [current, s.mode], () =>
      current.map((i) => {
        const row = el("article");
        row.className = "panel premium-card";
        row.dataset["premiumIntent"] = i.id;
        row.append(
          el(
            "p",
            `${i.kind === "ad" ? "Recompensa: " + labels[i.productId as RewardedType] : PREMIUM_PRODUCTS.find((p) => p.id === i.productId)?.name} · ${i.state === "pending" ? "aguardando provedor" : "aguardando conclusão"} · expira ${new Date(i.expiresAt).toLocaleTimeString("pt-BR")}`,
          ),
        );
        if (s.mode === "sandbox" && i.state === "created") {
          const b = button(
            i.kind === "ad"
              ? "Concluir simulação após 5 segundos"
              : "Concluir compra simulada",
            () => void simulate(i),
          );
          b.dataset["premiumSimulate"] = i.id;
          row.append(b);
        }
        if (i.state === "created")
          row.append(
            button("Cancelar solicitação", () =>
              send({
                type: "intent.cancel",
                intentId: i.id,
                commandId: commandId(),
              }),
            ),
          );
        return row;
      }),
    );
    list("premium-benefits", s.benefits, () =>
      s.benefits.map((b) =>
        el(
          "p",
          `${labels[b.kind]} · termina ${new Date(b.end).toLocaleTimeString("pt-BR")}`,
        ),
      ),
    );
    list("premium-owned", s.entitlements, () =>
      s.entitlements.map((id) =>
        el(
          "p",
          `Cosmético ativo: ${PREMIUM_PRODUCTS.find((p) => p.id === id)?.name ?? id}`,
        ),
      ),
    );
    host.querySelector("#premium-ad-limit")!.textContent =
      `Solicitações nas últimas 24h: ${s.adUsed}/8. ${s.adNextAt > s.serverTime ? "Próxima a partir de " + new Date(s.adNextAt).toLocaleTimeString("pt-BR") : ""}`;
    list("premium-history", s.purchases, () =>
      s.purchases.map((p) => {
        const row = el("article");
        row.className = "panel premium-card";
        row.append(
          el(
            "p",
            `${PREMIUM_PRODUCTS.find((x) => x.id === p.productId)?.name ?? labels[p.productId as RewardedType] ?? p.productId} · ${{ pending: "Pagamento pendente", granted: "Benefício concedido", cancelled: "Cancelado", revoked: "Estornado" }[p.state] ?? p.state} · ${p.delivery === "done" ? "entrega confirmada" : "confirmação do provedor pendente"}`,
          ),
        );
        return row;
      }),
    );
  }
  async function refresh() {
    if (loading || disposed || !active || document.hidden || Date.now() < retry)
      return;
    loading = true;
    try {
      let result: PremiumResult | undefined;
      if (pending) {
        result = await api<PremiumResult>("premium/commands", pending);
        pending = undefined;
        persist();
      }
      const s = await api<PremiumView>("premium");
      if (disposed) return;
      if (!state || state.accountId !== s.accountId) {
        state = s;
        try {
          const stored = sessionStorage.getItem(key());
          if (stored) {
            const parsed = PremiumCommandSchema.safeParse(JSON.parse(stored));
            if (parsed.success) pending = parsed.data;
            else sessionStorage.removeItem(key());
          }
        } catch {}
      }
      state = s;
      render(s);
      status.textContent = result
        ? result.status === "applied"
          ? "Operação confirmada."
          : message(result.code)
        : pending
          ? "Recuperando operação pendente…"
          : "Loja sincronizada.";
    } catch (error) {
      if (
        error instanceof ApiFailure &&
        [400, 401, 403, 409].includes(error.status)
      ) {
        if (error.status === 400 || error.status === 409) {
          pending = undefined;
          persist();
        }
        status.textContent =
          "Acesso ou operação indisponível. Recarregue para conferir sua conta.";
        retry = Date.now() + 10000;
      } else {
        status.textContent =
          "Sem confirmação. Reconectando com o mesmo identificador da operação.";
        retry = Date.now() + 3000;
      }
    } finally {
      loading = false;
      if (
        queuedSimulation &&
        !pending &&
        active &&
        !disposed &&
        !document.hidden
      ) {
        const intent = queuedSimulation;
        queuedSimulation = undefined;
        void simulate(intent);
      }
    }
  }
  void api<PremiumView>("premium")
    .then((s) => {
      if (!disposed) cosmetic(s);
    })
    .catch(() => {});
  const timer = setInterval(() => void refresh(), 2000);
  return {
    show: (on: boolean) => {
      active = on;
      if (!on) queuedSimulation = undefined;
      if (on) void refresh();
    },
    destroy: () => {
      disposed = true;
      clearInterval(timer);
    },
  };
}
