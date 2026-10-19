import { commandId } from '../browser-crypto.js';
import {
  MARKET_CURRENCIES,
  MARKET_RESOURCES,
  MarketCommandSchema,
  MarketActionSchema,
  marketFee,
  ITEMS,
  RARITY,
  AFFIX_LABELS,
  type MarketAction,
  type MarketSnapshot,
  type MarketListing,
  type MarketResult,
  type MarketAsset,
} from "@akai/shared";
import { itemImages } from "./rpg.js";
import { assets } from "../assets/catalog.js";
import { api, ApiFailure } from "../online-session.js";
const names = {
  coin: "Coins",
  iron: "Ferro",
  coal: "Carvão",
  gold: "Ouro",
  jade: "Jade",
};
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  return e;
};
const amount = (s: string) => {
  const b = BigInt(s);
  return `${b / 1000n}${
    b % 1000n
      ? "," +
        String(b % 1000n)
          .padStart(3, "0")
          .replace(/0+$/, "")
      : ""
  }`;
};
const units = (s: string) => {
  if (!/^\d{1,27}([,.]\d{1,3})?$/.test(s))
    throw Error("Informe um valor positivo com até três casas decimais.");
  const [w, f = ""] = s.replace(",", ".").split(".");
  return String(BigInt(w!) * 1000n + BigInt(f.padEnd(3, "0")));
};
const date = (n: number) =>
  new Date(n).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) +
  " (Brasília)";
function assetName(a: MarketAsset) {
  return a.kind === "item"
    ? `${ITEMS[a.item!.definitionId].name} · ${RARITY[a.item!.rarity].label} · nível ${a.item!.level} · +${a.item!.enhancement}`
    : `${amount(a.quantity)} ${names[a.resource!]}`;
}

function marketError(code: string) {
  const messages: Record<string, string> = {
    BAG_FULL: "A mochila está cheia. Libere uma vaga e tente novamente.",
    INSUFFICIENT_FUNDS: "Saldo insuficiente para concluir a compra ou oferta.",
    INSUFFICIENT_ASSET: "Você não possui a quantidade anunciada.",
    LISTING_FEE_REQUIRED: "Anunciar exige 100.000 Coins disponíveis.",
    COMPLETE_FLOOR_TEN: "Conclua o andar 10 para negociar.",
    RELIST_COOLDOWN:
      "Aguarde 24h após o cancelamento para relistar este equipamento ou recurso.",
    LISTING_CLOSED: "Este anúncio já foi vendido, cancelado ou expirou.",
    OFFER_CLOSED: "Esta oferta já foi encerrada ou expirou.",
    OFFER_EXISTS: "Você já tem uma oferta pendente neste anúncio.",
    ITEM_EQUIPPED: "Desequipe o item antes de anunciar.",
    ITEM_NOT_FOUND: "O equipamento não está disponível na sua mochila.",
    SELF_TRADE: "Você não pode comprar nem ofertar no próprio anúncio.",
    SAME_RESOURCE: "Escolha uma moeda diferente do recurso anunciado.",
    PRICE_TOO_LOW: "O preço deve deixar um valor positivo após a taxa.",
    FORBIDDEN: "Esta operação pertence a outro jogador.",
    ACCOUNT_SUSPENDED: "Uma das contas está indisponível para negociar.",
    NOT_CLAIMABLE: "Este bem não está disponível para resgate.",
    LISTING_LIMIT:
      "Resgate ou encerre anúncios antes de publicar outro. Limite de 20 pendências.",
    OFFER_LIMIT:
      "Encerre uma de suas 20 ofertas pendentes antes de ofertar novamente.",
    MARKET_CAPACITY:
      "O mercado atingiu a capacidade do piloto. Tente mais tarde.",
    BALANCE_LIMIT:
      "A operação ultrapassaria o limite de saldo e foi cancelada.",
  };
  return (
    messages[code] ??
    "A operação foi recusada. Atualize o mercado e tente novamente."
  );
}

export function createMarketUI(root: HTMLElement, online: boolean) {
  const host = root.querySelector<HTMLElement>("#market-root")!;
  if (!online) {
    host.innerHTML =
      '<article class="panel"><h2>Mercado entre jogadores</h2><p>Disponível no modo online com servidor e conta. O jogar.bat abre o perfil local de teste.</p></article>';
    return { show: () => {}, destroy: () => {} };
  }
  const currencies = MARKET_CURRENCIES.map(
    (k) => `<option value="${k}">${names[k]}</option>`,
  ).join("");
  host.innerHTML = `<p class="body-copy">Equipamentos e recursos · andar 10 concluído para negociar. Rubies não são negociáveis.</p><p id="market-status" role="status" aria-live="polite"></p><section id="market-review" class="panel" hidden aria-label="Revisar operação"><h2>Confirmar operação</h2><p></p><button id="market-confirm">Confirmar</button><button id="market-dismiss">Voltar</button></section><nav class="community-tabs" aria-label="Áreas do mercado"><button data-market-tab="browse">Anúncios</button><button data-market-tab="sell">Anunciar</button><button data-market-tab="mine">Meus anúncios</button><button data-market-tab="offers">Ofertas</button><button data-market-tab="history">Histórico</button></nav>
 <section data-market-pane="browse"><form id="market-filter" class="community-form"><label>Categoria<select name="kind"><option value="">Todas</option><option value="item">Equipamentos</option><option value="resource">Recursos</option></select></label><label>Moeda<select name="currency"><option value="">Todas</option>${currencies}</select></label><button>Filtrar</button></form><div id="market-listings"></div><div class="battle-actions"><button id="market-prev">Anterior</button><span id="market-page"></span><button id="market-next">Próxima</button></div></section>
 <section data-market-pane="sell" hidden><h2>Anunciar</h2><p>Prazo: 3 dias. Publicar custa 100.000 Coins, sem reembolso. Taxa de venda: 10%, arredondada para cima na unidade mínima (0,001). Cancelar impõe 24h para relistar o mesmo equipamento ou qualquer quantidade do recurso cancelado.</p><p id="market-balances"></p><form id="market-sell-item" class="panel community-form"><label>Equipamento não equipado<select name="itemId" id="market-items" required></select></label><label>Preço total<input name="price" inputmode="decimal" placeholder="1000,000" required></label><label>Receber em<select name="currency">${currencies}</select></label><button>Revisar anúncio de equipamento</button></form><form id="market-sell-resource" class="panel community-form"><label>Recurso<select name="resource">${MARKET_RESOURCES.map((k) => `<option value="${k}">${names[k]}</option>`).join("")}</select></label><label>Quantidade<input name="quantity" inputmode="decimal" required></label><label>Preço total<input name="price" inputmode="decimal" required></label><label>Receber em<select name="currency">${currencies}</select></label><button>Revisar anúncio de recurso</button></form><div id="market-cooldowns"></div></section>
 <section data-market-pane="mine" hidden><h2>Meus anúncios e resgates</h2><p>Cancelados, expirados e removidos ficam guardados até resgate. Mochila cheia impede o resgate de equipamento, sem converter ou perder o item.</p><div id="market-mine"></div></section><section data-market-pane="offers" hidden><h2>Contraofertas</h2><p>Valem até 24h ou o fim do anúncio. Saldo não fica reservado: a aceitação verifica novamente saldo, mochila e anúncio.</p><div id="market-offers"></div></section><section data-market-pane="history" hidden><h2>Suas últimas 50 transações</h2><div id="market-history"></div></section>`;
  let active = false,
    disposed = false,
    loading = false,
    retry = 0,
    state: MarketSnapshot | undefined,
    review: MarketAction | undefined,
    pending: { commandId: string; action: MarketAction } | undefined,
    offset = 0,
    kind = "",
    currency = "",
    tab = "browse";
  const cache = new Map<string, string>();
  const status = host.querySelector<HTMLElement>("#market-status")!;
  const box = host.querySelector<HTMLElement>("#market-review")!;
  const storageKey = () => `akai-market-pending:${state!.accountId}`;
  const persist = () => {
    try {
      if (pending)
        sessionStorage.setItem(storageKey(), JSON.stringify(pending));
      else sessionStorage.removeItem(storageKey());
    } catch {}
  };
  function prepare(action: unknown, summary: string) {
    const parsed = MarketActionSchema.safeParse(action);
    if (!parsed.success) {
      status.textContent = "Dados inválidos. Confira quantidade, preço e item.";
      return;
    }
    if (pending) {
      status.textContent = "Aguarde a confirmação da operação anterior.";
      return;
    }
    review = parsed.data;
    box.querySelector("p")!.textContent = summary;
    box.hidden = false;
    host.querySelector<HTMLButtonElement>("#market-confirm")!.focus();
    box.scrollIntoView({ block: "nearest" });
  }
  host.querySelector("#market-confirm")!.addEventListener("click", () => {
    if (!review || pending || !state) return;
    pending = { commandId: commandId(), action: review };
    review = undefined;
    box.hidden = true;
    status.textContent = "Enviando operação…";
    persist();
    void refresh();
  });
  host.querySelector("#market-dismiss")!.addEventListener("click", () => {
    review = undefined;
    box.hidden = true;
  });
  for (const b of host.querySelectorAll<HTMLButtonElement>("[data-market-tab]"))
    b.addEventListener("click", () => {
      tab = b.dataset["marketTab"]!;
      for (const p of host.querySelectorAll<HTMLElement>("[data-market-pane]"))
        p.hidden = p.dataset["marketPane"] !== tab;
      for (const x of host.querySelectorAll("[data-market-tab]"))
        x.setAttribute("aria-pressed", String(x === b));
    });
  const form = (id: string, fn: (d: FormData) => void) =>
    host
      .querySelector<HTMLFormElement>("#" + id)!
      .addEventListener("submit", (e) => {
        e.preventDefault();
        try {
          fn(new FormData(e.currentTarget as HTMLFormElement));
        } catch (error) {
          status.textContent = (error as Error).message;
        }
      });
  form("market-filter", (d) => {
    kind = String(d.get("kind"));
    currency = String(d.get("currency"));
    offset = 0;
    void refresh();
  });
  const listingSummary = (price: string, c: string) =>
    `Publicar por ${amount(price)} ${names[c as keyof typeof names]}. Líquido após a venda: ${amount(String(BigInt(price) - marketFee(price)))}. Custo imediato: 100.000 Coins, sem reembolso. Bem reservado por até 3 dias.`;
  form("market-sell-item", (d) => {
    const price = units(String(d.get("price"))),
      c = String(d.get("currency"));
    prepare(
      { type: "list.item", itemId: d.get("itemId"), price, currency: c },
      listingSummary(price, c),
    );
  });
  form("market-sell-resource", (d) => {
    const price = units(String(d.get("price"))),
      c = String(d.get("currency")),
      quantity = units(String(d.get("quantity")));
    prepare(
      {
        type: "list.resource",
        resource: d.get("resource"),
        quantity,
        price,
        currency: c,
      },
      `${amount(quantity)} ${names[String(d.get("resource")) as keyof typeof names]}. ${listingSummary(price, c)}`,
    );
  });
  host.querySelector("#market-prev")!.addEventListener("click", () => {
    offset = Math.max(0, offset - 50);
    void refresh();
  });
  host.querySelector("#market-next")!.addEventListener("click", () => {
    offset += 50;
    void refresh();
  });
  const button = (label: string, fn: () => void) => {
    const b = el("button", label);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
  };
  function list(id: string, data: unknown, make: () => HTMLElement[]) {
    const signature = JSON.stringify(data);
    if (cache.get(id) === signature) return;
    cache.set(id, signature);
    const rows = make();
    const target = host.querySelector("#" + id)!;
    const empty =
      target.tagName === "SELECT"
        ? el("option", "Nenhum equipamento disponível.")
        : el("p", "Nenhum registro disponível.");
    if (empty instanceof HTMLOptionElement) {
      empty.value = "";
      empty.disabled = true;
    }
    target.replaceChildren(...(rows.length ? rows : [empty]));
  }
  function card(l: MarketListing, own: boolean) {
    const row = el("article");
    row.className = "panel market-card";
    row.dataset["listingId"] = l.id;
    const img = el("img");
    img.className = "sprite market-asset";
    img.alt = "";
    img.draggable = false;
    img.src = l.asset.item
      ? itemImages[l.asset.item.definitionId]
      : {
          iron: assets.ironNode,
          coal: assets.coalNode,
          gold: assets.goldNode,
          jade: assets.jadeNode,
        }[l.asset.resource!];
    row.append(
      img,
      el("h3", assetName(l.asset)),
      el(
        "p",
        `${amount(l.price)} ${names[l.currency]} · vendedor ${l.sellerName}`,
      ),
      el(
        "p",
        `Estado: ${{ active: "Ativo", sold: "Vendido", cancelled: "Cancelado", expired: "Expirado", removed: "Removido" }[l.status]} · expira ${date(l.expiresAt)}`,
      ),
    );
    if (l.asset.item) {
      const i = l.asset.item;
      row.append(
        el(
          "p",
          `Atributos base · ATQ ${i.attributes.attack} · HP ${i.attributes.hp} · DEF ${i.attributes.defense} · Mineração ${i.attributes.miningBp / 100}% · Produção ${i.attributes.productionBp / 100}% · Afixos: ${i.affixes.map((k) => AFFIX_LABELS[k]).join(", ") || "nenhum"}`,
        ),
      );
    }
    if (own) {
      if (l.status === "active")
        row.append(
          button("Cancelar anúncio", () =>
            prepare(
              { type: "cancel", listingId: l.id },
              "Cancelar sem devolver o custo de anúncio. O bem ficará disponível para resgate; relistagem bloqueada por 24h.",
            ),
          ),
        );
      else if (!l.claimed)
        row.append(
          button("Resgatar bem", () =>
            prepare(
              { type: "claim", listingId: l.id },
              `Resgatar ${assetName(l.asset)}. Não há cobrança.`,
            ),
          ),
        );
    } else if (l.seller !== state!.accountId) {
      row.append(
        button("Comprar", () =>
          prepare(
            { type: "buy", listingId: l.id },
            `Comprar ${assetName(l.asset)} por ${amount(l.price)} ${names[l.currency]}. O vendedor recebe ${amount(String(BigInt(l.price) - marketFee(l.price)))} após a taxa.`,
          ),
        ),
      );
      const f = el("form");
      f.className = "community-form";
      const label = el("label", "Sua contraoferta"),
        input = el("input");
      input.name = "price";
      input.inputMode = "decimal";
      input.required = true;
      input.setAttribute("aria-label", "Valor da contraoferta");
      label.append(input);
      const select = el("select");
      select.name = "currency";
      select.setAttribute("aria-label", "Moeda da contraoferta");
      for (const k of MARKET_CURRENCIES) {
        const o = el("option", names[k]);
        o.value = k;
        select.append(o);
      }
      select.value = l.currency;
      const send = el("button", "Revisar contraoferta");
      f.append(label, select, send);
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        try {
          const price = units(input.value);
          prepare(
            { type: "offer", listingId: l.id, price, currency: select.value },
            `Oferecer ${amount(price)} ${names[select.value as keyof typeof names]}. Válida por até 24h. O saldo será verificado na aceitação.`,
          );
        } catch (error) {
          status.textContent = (error as Error).message;
        }
      });
      row.append(f);
    }
    return row;
  }
  function render(s: MarketSnapshot) {
    list("market-listings", s.listings, () =>
      s.listings.map((l) => card(l, false)),
    );
    list("market-mine", s.mine, () => s.mine.map((l) => card(l, true)));
    list("market-offers", s.offers, () =>
      s.offers.map((o) => {
        const r = el("article");
        r.className = "panel market-card";
        r.append(
          el(
            "p",
            `Anúncio ${o.listingId} · oferta ${amount(o.price)} ${names[o.currency]} · expira ${date(o.expiresAt)}`,
          ),
        );
        if (o.buyer === s.accountId)
          r.append(
            button("Retirar oferta", () =>
              prepare(
                { type: "offer.withdraw", offerId: o.id },
                "Retirar esta contraoferta, sem cobrança.",
              ),
            ),
          );
        else
          r.append(
            button("Aceitar oferta", () =>
              prepare(
                { type: "offer.accept", offerId: o.id },
                `Aceitar ${amount(o.price)} ${names[o.currency]} e receber ${amount(String(BigInt(o.price) - marketFee(o.price)))} após taxa. A venda transfere o bem ao comprador.`,
              ),
            ),
            button("Recusar oferta", () =>
              prepare(
                { type: "offer.reject", offerId: o.id },
                "Recusar esta contraoferta.",
              ),
            ),
          );
        return r;
      }),
    );
    list("market-history", s.history, () =>
      s.history.map((t) => {
        const r = el("article");
        r.className = "panel market-card";
        r.append(
          el("h3", assetName(t.asset)),
          el(
            "p",
            `${t.buyer === s.accountId ? "Compra" : "Venda"} · ${amount(t.price)} ${names[t.currency]} · taxa ${amount(t.fee)} · líquido ${amount(t.net)} · ${date(t.at)}`,
          ),
        );
        return r;
      }),
    );
    list("market-cooldowns", s.cooldowns, () =>
      s.cooldowns.map((c) =>
        el("p", `Relistagem bloqueada: ${c.key} até ${date(c.until)}`),
      ),
    );
    list("market-items", s.inventory, () =>
      s.inventory.map((i) => {
        const o = el(
          "option",
          `${ITEMS[i.definitionId].name} · ${RARITY[i.rarity].label} · nível ${i.level} · +${i.enhancement}`,
        );
        o.value = i.id;
        return o;
      }),
    );
    host.querySelector("#market-balances")!.textContent = MARKET_CURRENCIES.map(
      (k) => `${amount(s.balances[k])} ${names[k]}`,
    ).join(" · ");
    host.querySelector<HTMLButtonElement>("#market-prev")!.disabled =
      offset === 0;
    host.querySelector<HTMLButtonElement>("#market-next")!.disabled =
      !s.hasMore || offset >= 5000;
    host.querySelector("#market-page")!.textContent =
      `Página ${offset / 50 + 1}`;
  }
  async function refresh() {
    if (loading || disposed || !active || document.hidden || Date.now() < retry)
      return;
    loading = true;
    try {
      let result: MarketResult | undefined;
      if (pending) {
        result = await api<MarketResult>("market/commands", pending);
        pending = undefined;
        persist();
      }
      const query = new URLSearchParams({ offset: String(offset) });
      if (kind) query.set("kind", kind);
      if (currency) query.set("currency", currency);
      const s = await api<MarketSnapshot>("market?" + query);
      if (disposed) return;
      if (!state || state.accountId !== s.accountId) {
        state = s;
        try {
          const stored = sessionStorage.getItem(storageKey());
          if (stored) {
            const parsed = MarketCommandSchema.safeParse(JSON.parse(stored));
            if (parsed.success) pending = parsed.data;
            else sessionStorage.removeItem(storageKey());
          }
        } catch {}
      }
      state = s;
      render(s);
      status.textContent = result
        ? result.status === "applied"
          ? "Operação confirmada."
          : marketError(result.code)
        : pending
          ? "Reconectando operação pendente…"
          : "Mercado sincronizado.";
    } catch (error) {
      if (
        error instanceof ApiFailure &&
        [400, 401, 403, 409].includes(error.status)
      ) {
        if (error.status === 409) {
          pending = undefined;
          persist();
        }
        status.textContent =
          error.status === 409
            ? "Este identificador já foi usado em outra operação. Revise e tente novamente."
            : "Acesso indisponível. Recarregue para entrar novamente.";
        retry = Date.now() + 10000;
      } else {
        status.textContent =
          "Sem confirmação. Reconectando com o mesmo identificador da operação.";
        retry = Date.now() + 3000;
      }
    } finally {
      loading = false;
    }
  }
  const timer = setInterval(() => void refresh(), 3000);
  return {
    show: (on: boolean) => {
      active = on;
      if (on) void refresh();
    },
    destroy: () => {
      disposed = true;
      clearInterval(timer);
    },
  };
}
