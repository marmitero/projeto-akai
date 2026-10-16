import {
  CommunityActionSchema,
  EMBLEM_PALETTE,
  type CommunityAction,
  type CommunitySnapshot,
  type CommunityIdentity,
  type CommunityResult,
} from "@akai/shared";
import { api, ApiFailure } from "../online-session.js";
const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  return e;
};
function emblem(pixels: number[]) {
  const grid = element("span");
  grid.className = "guild-emblem";
  grid.setAttribute("role", "img");
  grid.setAttribute("aria-label", "Brasão da guilda");
  pixels.forEach((color) => {
    const cell = element("i");
    cell.style.backgroundColor = EMBLEM_PALETTE[color] ?? EMBLEM_PALETTE[0];
    grid.append(cell);
  });
  return grid;
}
const date = (at: number) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at) + " (Brasília)";
export function createCommunityUI(
  root: HTMLElement,
  online: boolean,
  onIdentity: (
    name: string,
    guild?: string,
    result?: CommunityResult,
  ) => void = () => {},
) {
  const host = root.querySelector<HTMLElement>("#community-root")!;
  if (!online) {
    host.innerHTML =
      '<div class="panel"><h2>Seu reino ainda é local</h2><p>Comunidade precisa de uma conta online e servidor configurado. O jogar.bat continua sendo o teste local; nenhum jogador ou evento falso é criado aqui.</p></div>';
    return {
      show: () => {},
      destroy: () => {},
      rename: (_name: string) => false,
    };
  }
  host.innerHTML = `<p class="body-copy">Comunidade online · horários de Brasília. Seus dados e resultados são confirmados pelo servidor.</p><p id="community-status" role="status" aria-live="polite"></p>
 <nav class="community-tabs" aria-label="Áreas da comunidade">${[
   ["chat", "Chat"],
   ["guild", "Guilda"],
   ["arena", "Arena"],
   ["events", "Eventos"],
   ["rank", "Rankings"],
 ]
   .map(
     ([id, name]) =>
       `<button type="button" data-community-tab="${id}">${name}</button>`,
   )
   .join("")}</nav>
 <p id="community-id" class="body-copy"></p><details class="panel community-profile-details"><summary>Editar apelido</summary><form id="community-profile" class="community-form"><label>Apelido<input name="name" minlength="3" maxlength="24" required autocomplete="off"></label><button>Salvar apelido</button></form></details>
 <section data-community-pane="chat"><h2>Chat do reino</h2><p>Disponível após vencer o andar 1. Intervalo de 3 segundos entre mensagens. Você pode bloquear e denunciar mensagens.</p><div id="community-chat" class="chat-list panel" role="log" aria-label="Chat global"></div><form id="community-chat-form" class="community-form"><label>Mensagem<input name="text" maxlength="500" required autocomplete="off"></label><button>Enviar ao reino</button></form><div id="community-blocks" class="community-form"><label>UUID do jogador para desbloquear<input id="community-unblock-id"></label><button id="community-unblock" type="button">Desbloquear jogador</button></div></section>
 <section data-community-pane="guild" hidden><h2>Sua guilda</h2><div id="community-guild"></div><form id="community-guild-create" class="panel community-form"><label>Nome da guilda<input name="name" minlength="3" maxlength="24" required></label><p>Criação: 500 Coins e andar 5 concluído.</p><button>Criar guilda</button></form><div id="community-invites"></div><div id="community-guild-controls" hidden><form id="community-invite-form" class="community-form"><label>UUID do convidado<input name="id" required></label><button>Convidar</button></form><div class="battle-actions"><button id="community-guild-upgrade">Evoluir guilda</button><button id="community-guild-leave">Sair da guilda</button><button id="community-war-enroll">Inscrever/atualizar guerra semanal</button></div><details id="community-emblem-editor"><summary>Editar brasão de 16 × 16 pixels</summary><label>Cor<select id="community-palette">${EMBLEM_PALETTE.map((_, i) => `<option value="${i}">Cor ${i + 1}</option>`).join("")}</select></label><div id="community-paint" class="emblem-editor" aria-label="Grade do brasão"></div><button id="community-save-emblem">Salvar brasão</button></details><h3>Chat da guilda</h3><div id="community-guild-chat" class="chat-list panel" role="log" aria-label="Chat da guilda"></div><form id="community-guild-chat-form" class="community-form"><label>Mensagem da guilda<input name="text" maxlength="500" required></label><button>Enviar à guilda</button></form></div><h3>Guerras</h3><p>Domingo, 18h–19h. Líder inscreve pelo menos dois membros com 24h de guilda. Um ataque por participante, usando atributos registrados na inscrição.</p><div id="community-wars"></div><h3>Guildas do reino</h3><div id="community-guilds"></div></section>
 <section data-community-pane="arena" hidden><h2>Arena</h2><p>Andar 5 concluído. Até cinco adversários imediatamente acima; intervalo de 60s, máximo de 20 desafios em 24h. Empate favorece a defesa. Não há bots.</p><p id="community-arena-position"></p><div id="community-opponents"></div><h3>Seus últimos desafios</h3><div id="community-matches"></div></section>
 <section data-community-pane="events" hidden><h2>Eventos do reino</h2><p id="community-clock"></p><p id="community-event-notice" role="status" aria-live="polite"></p><article class="panel"><h3>Guardião do reino · boss diário</h3><p>22h–22h30. Andar 10 concluído. Dano automático enquanto esta área estiver aberta e conectada; fechar/ausentar encerra a presença após até 3s.</p><p id="community-boss"></p><progress id="community-boss-hp" max="1000000" value="1000000"></progress><div class="battle-actions"><button id="community-boss-join">Participar do boss</button><button id="community-boss-leave">Sair do boss</button></div><div id="community-boss-leaders"></div></article><article class="panel"><h3>Relâmpagos</h3><p id="community-xp"></p><p id="community-lottery"></p><p>Loteria: 100 Rubies para uma conta Google vinculada, com ao menos 10 minutos de existência, andar 10 concluído e presença confirmada no instante do sorteio. Sem elegíveis, não há sorteio.</p><p id="community-raid"></p><button id="community-raid-join">Entrar na raid individual</button></article><h3>Recompensas confirmadas</h3><div id="community-rewards"></div></section>
 <section data-community-pane="rank" hidden><h2>Rankings</h2><p id="community-season"></p><div id="community-rankings"></div></section>`;
  let active = false,
    disposed = false,
    loading = false,
    pending: { commandId: string; action: CommunityAction } | undefined,
    retryAt = 0,
    latest: CommunitySnapshot | undefined,
    tab = "chat",
    eventKey = "",
    dirtyEmblem = false,
    pixels = Array<number>(256).fill(0);
  const status = host.querySelector<HTMLElement>("#community-status")!;
  const text = (id: string, value: string) => {
    const e = host.querySelector<HTMLElement>("#" + id)!;
    if (e.textContent !== value) e.textContent = value;
  };
  const button = (label: string, action: () => void) => {
    const b = element("button", label);
    b.type = "button";
    b.addEventListener("click", action);
    return b;
  };
  const list = (id: string, items: HTMLElement[]) => {
    const target = host.querySelector<HTMLElement>("#" + id)!;
    if (!items.length) items = [element("p", "Nenhum registro disponível.")];
    target.replaceChildren(...items);
  };
  const submit = (id: string, fn: (data: FormData) => CommunityAction) => {
    host
      .querySelector<HTMLFormElement>("#" + id)!
      .addEventListener("submit", (event) => {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement;
        const action = fn(new FormData(form));
        if (send(action) && "text" in action) form.reset();
      });
  };
  function send(action: CommunityAction) {
    const parsed = CommunityActionSchema.safeParse(action);
    if (!parsed.success) {
      status.textContent =
        "Dados inválidos. Confira o texto, o UUID e os limites.";
      return false;
    }
    if (pending || (!active && action.type !== "profile") || document.hidden) {
      status.textContent = "Aguarde a confirmação ou abra a comunidade.";
      return false;
    }
    pending = { commandId: crypto.randomUUID(), action };
    void refresh();
    return true;
  }
  async function refresh(identityOnly = false) {
    if (
      loading ||
      disposed ||
      (!active && !pending && !identityOnly) ||
      document.hidden ||
      Date.now() < retryAt
    )
      return;
    loading = true;
    try {
      let result: CommunityResult | undefined;
      if (pending) {
        const type = pending.action.type;
        result = await api<CommunityResult>("community/commands", pending);
        pending = undefined;
        if (result.status === "applied" && type === "guild.emblem")
          dirtyEmblem = false;
      }
      if (!active) {
        const identity = await api<CommunityIdentity>("community/identity");
        if (!disposed) onIdentity(identity.name, identity.guild, result);
        return;
      }
      const state = await api<CommunitySnapshot>("community");
      if (disposed) return;
      latest = state;
      onIdentity(state.name, state.guild?.name, result);
      if (active) render(state);
      status.textContent = result
        ? result.status === "applied"
          ? "Ação confirmada."
          : `Ação recusada: ${result.code}.`
        : "Comunidade sincronizada.";
    } catch (error) {
      if (
        error instanceof ApiFailure &&
        [400, 401, 403].includes(error.status)
      ) {
        pending = undefined;
        status.textContent =
          "Sessão indisponível ou acesso recusado. Recarregue para entrar novamente.";
        retryAt = Date.now() + 10000;
      } else {
        status.textContent =
          "Sem confirmação. Tentando reconectar; o comando pendente manterá o mesmo identificador.";
        retryAt = Date.now() + 2000;
      }
    } finally {
      loading = false;
    }
  }
  function renderChat(id: string, messages: CommunitySnapshot["chat"]) {
    list(
      id,
      messages.map((msg) => {
        const row = element("article");
        row.className = "chat-message";
        const author = element("strong", msg.name);
        if (msg.emblem) row.append(emblem(msg.emblem));
        row.append(author, element("p", msg.text));
        if (msg.authorId !== latest?.accountId) {
          row.append(
            button("Bloquear", () =>
              send({ type: "block", accountId: msg.authorId, blocked: true }),
            ),
            button("Denunciar", () => {
              const reason = window.prompt(
                "Motivo da denúncia (3 a 300 caracteres):",
              );
              if (reason) send({ type: "report", messageId: msg.id, reason });
            }),
          );
        }
        return row;
      }),
    );
  }
  function render(s: CommunitySnapshot) {
    text("community-id", `Seu UUID: ${s.accountId} · ${s.name}`);
    const field = host.querySelector<HTMLInputElement>(
      "#community-profile input",
    )!;
    if (!field.value) field.value = s.name;
    renderChat("community-chat", s.chat);
    renderChat("community-guild-chat", s.guildChat);
    const g = s.guild,
      own = g?.members.find((m) => m.id === s.accountId),
      leader = own?.role === "leader",
      officer = leader || own?.role === "officer";
    host.querySelector<HTMLElement>("#community-guild-create")!.hidden = !!g;
    host.querySelector<HTMLElement>("#community-guild-controls")!.hidden = !g;
    const guildRows: HTMLElement[] = [];
    if (g) {
      const info = element("article");
      info.append(
        emblem(g.emblem),
        element("h3", g.name),
        element(
          "p",
          `Nível ${g.level} · ${g.members.length}/${g.capacity} membros · ${g.xp} XP · bônus da semana anterior +${g.bonusBp / 100}% XP`,
        ),
      );
      guildRows.push(info);
      for (const member of g.members) {
        const row = element(
          "p",
          `${member.name} · ${member.role} · ${member.id}`,
        );
        if (member.id !== s.accountId && officer) {
          if (leader) {
            row.append(
              button(member.role === "officer" ? "Rebaixar" : "Promover", () =>
                send({
                  type: "guild.role",
                  accountId: member.id,
                  role: member.role === "officer" ? "member" : "officer",
                }),
              ),
              button("Transferir liderança", () => {
                if (confirm("Transferir a liderança para " + member.name + "?"))
                  send({
                    type: "guild.role",
                    accountId: member.id,
                    role: "leader",
                  });
              }),
            );
          }
          if (leader || member.role === "member")
            row.append(
              button("Remover", () =>
                send({
                  type: "guild.role",
                  accountId: member.id,
                  role: "kick",
                }),
              ),
            );
        }
        guildRows.push(row);
      }
      if (!dirtyEmblem) {
        pixels = [...g.emblem];
        paint();
      }
    }
    list("community-guild", guildRows);
    host.querySelector<HTMLDetailsElement>("#community-emblem-editor")!.hidden =
      !leader;
    host.querySelector<HTMLElement>("#community-invite-form")!.hidden =
      !officer;
    host.querySelector<HTMLButtonElement>("#community-guild-upgrade")!.hidden =
      !leader;
    host.querySelector<HTMLButtonElement>("#community-war-enroll")!.hidden =
      !leader;
    list(
      "community-invites",
      s.invites.map((i) => {
        const p = element("p", "Convite: " + i.name);
        p.append(
          button("Aceitar", () =>
            send({ type: "guild.accept", guildId: i.id }),
          ),
        );
        return p;
      }),
    );
    list(
      "community-guilds",
      s.guilds.map((g) => element("p", g.name + " · nível " + g.level)),
    );
    list(
      "community-wars",
      s.wars.map((w) => {
        const p = element(
          "p",
          `${w.name} · ${w.status} · ${w.score} · ${date(w.start)} até ${date(w.end)}`,
        );
        if (w.canAttack)
          p.append(
            button("Atacar na guerra", () =>
              send({ type: "war.attack", warId: w.id }),
            ),
          );
        return p;
      }),
    );
    text(
      "community-arena-position",
      s.arena.position
        ? `Posição #${s.arena.position} · ${s.arena.trophies} troféus · próximo desafio ${date(s.arena.nextAt || s.serverTime)}`
        : "Arena disponível após vencer o andar 5.",
    );
    list(
      "community-opponents",
      s.arena.opponents.map((p) => {
        const row = element("article");
        row.append(
          element("p", `#${p.position} ${p.name} · força ${p.power}`),
          button("Desafiar " + p.name, () =>
            send({ type: "arena", opponentId: p.id }),
          ),
        );
        return row;
      }),
    );
    list(
      "community-matches",
      s.arena.matches.map((m) =>
        element(
          "p",
          `${m.won ? "Vitória" : "Defesa venceu"} contra ${m.opponent} · ${date(m.at)}`,
        ),
      ),
    );
    const nextEventKey = [
      s.boss.status,
      s.flash.lottery.status,
      s.flash.raid.status,
      s.serverTime >= s.flash.xp.start && s.serverTime < s.flash.xp.end
        ? "xp-active"
        : "xp-inactive",
    ].join(":");
    if (nextEventKey !== eventKey) {
      eventKey = nextEventKey;
      text(
        "community-event-notice",
        `Boss: ${s.boss.status}. Loteria: ${s.flash.lottery.status}. Raid: ${s.flash.raid.status}. XP extra ${nextEventKey.includes("xp-active") ? "ativo" : "inativo"}.`,
      );
    }
    text("community-clock", "Servidor: " + date(s.serverTime));
    text(
      "community-boss",
      `${s.boss.status} · ${s.boss.hp}/${s.boss.maxHp} vida · sua contribuição ${s.boss.damage} · ${date(s.boss.start)} · último golpe: ${s.boss.lastHit ?? "ainda nenhum"}`,
    );
    const hp = host.querySelector<HTMLProgressElement>("#community-boss-hp")!;
    hp.max = s.boss.maxHp;
    hp.value = s.boss.hp;
    host.querySelector<HTMLButtonElement>("#community-boss-join")!.disabled =
      s.boss.status !== "active" || s.boss.joined;
    host.querySelector<HTMLButtonElement>("#community-boss-leave")!.disabled =
      !s.boss.joined;
    list(
      "community-boss-leaders",
      s.boss.leaders.map((p, i) =>
        element("p", `${i + 1}. ${p.name}: ${p.damage}`),
      ),
    );
    text(
      "community-xp",
      `XP +30%: ${date(s.flash.xp.start)} a ${date(s.flash.xp.end)} · ${s.serverTime >= s.flash.xp.start && s.serverTime < s.flash.xp.end ? "ativo" : "fora da janela"}`,
    );
    text(
      "community-lottery",
      `Loteria: ${date(s.flash.lottery.at)} · ${s.flash.lottery.status} · vencedor: ${s.flash.lottery.winner ?? "nenhum"}`,
    );
    text(
      "community-raid",
      `Raid individual: ${date(s.flash.raid.start)} a ${date(s.flash.raid.end)} · ${s.flash.raid.status} · vida do boss ${s.flash.raid.hp}, herói ${s.flash.raid.heroHp}`,
    );
    host.querySelector<HTMLButtonElement>("#community-raid-join")!.disabled =
      s.flash.raid.status !== "available" ||
      s.serverTime < s.flash.raid.start ||
      s.serverTime >= s.flash.raid.end;
    list(
      "community-rewards",
      s.rewards.map((r) => element("p", r.description)),
    );
    text(
      "community-season",
      `Temporada ${s.season.id}: ${date(s.season.start)} até ${date(s.season.end)}. Arquivo e premiação únicos no encerramento.`,
    );
    const boards: HTMLElement[] = [];
    const board = (title: string, rows: string[]) => {
      const article = element("article");
      article.className = "panel";
      article.append(element("h3", title));
      rows.forEach((row, i) =>
        article.append(element("p", `${i + 1}. ${row}`)),
      );
      if (!rows.length) article.append(element("p", "Sem participantes."));
      boards.push(article);
    };
    board(
      "Posição semanal da arena",
      s.rankings.positions.map((p) => p.name + ": #" + p.position),
    );
    board(
      "Temporadas arquivadas",
      s.archives.map((a) => a.id + ": " + a.leaders.join(", ")),
    );
    board(
      "Força permanente",
      s.rankings.power.map((p) => p.name + ": " + p.power),
    );
    board(
      "Maior andar permanente",
      s.rankings.floor.map((p) => p.name + ": " + p.floor),
    );
    board(
      "Coins atuais",
      s.rankings.coins.map(
        (p) => p.name + ": " + String(BigInt(p.coins) / 1000n),
      ),
    );
    board(
      "Troféus semanais",
      s.rankings.trophies.map((p) => p.name + ": " + p.score),
    );
    board(
      "Guildas semanais",
      s.rankings.guilds.map((p) => p.name + ": " + p.score),
    );
    board(
      "Dano semanal no boss",
      s.rankings.damage.map((p) => p.name + ": " + p.score),
    );
    board(
      "Últimos golpes (histórico)",
      s.rankings.lastHits.map((p) => p.name + ": " + p.edition),
    );
    list("community-rankings", boards);
  }
  const cells = Array.from({ length: 256 }, (_, i) => {
    const b = button("", () => {
      pixels[i] = Number(
        host.querySelector<HTMLSelectElement>("#community-palette")!.value,
      );
      dirtyEmblem = true;
      paint();
    });
    b.setAttribute(
      "aria-label",
      `Pixel ${(i % 16) + 1}, ${Math.floor(i / 16) + 1}`,
    );
    return b;
  });
  host.querySelector("#community-paint")!.append(...cells);
  function paint() {
    cells.forEach(
      (c, i) =>
        (c.style.backgroundColor =
          EMBLEM_PALETTE[pixels[i]!] ?? EMBLEM_PALETTE[0]),
    );
  }
  submit("community-profile", (d) => ({
    type: "profile",
    name: String(d.get("name")),
  }));
  submit("community-chat-form", (d) => ({
    type: "chat",
    scope: "global",
    text: String(d.get("text")),
  }));
  submit("community-guild-chat-form", (d) => ({
    type: "chat",
    scope: "guild",
    text: String(d.get("text")),
  }));
  submit("community-guild-create", (d) => ({
    type: "guild.create",
    name: String(d.get("name")),
  }));
  submit("community-invite-form", (d) => ({
    type: "guild.invite",
    accountId: String(d.get("id")),
  }));
  host.querySelector("#community-unblock")!.addEventListener("click", () =>
    send({
      type: "block",
      accountId: host.querySelector<HTMLInputElement>("#community-unblock-id")!
        .value,
      blocked: false,
    }),
  );
  for (const [id, action] of [
    ["community-guild-upgrade", { type: "guild.upgrade" }],
    ["community-guild-leave", { type: "guild.leave" }],
    ["community-war-enroll", { type: "war.enroll" }],
    ["community-boss-join", { type: "boss", join: true }],
    ["community-boss-leave", { type: "boss", join: false }],
    ["community-raid-join", { type: "raid" }],
  ] as const)
    host.querySelector("#" + id)!.addEventListener("click", () => send(action));
  host
    .querySelector("#community-save-emblem")!
    .addEventListener("click", () =>
      send({ type: "guild.emblem", pixels: [...pixels] }),
    );
  for (const b of host.querySelectorAll<HTMLButtonElement>(
    "[data-community-tab]",
  ))
    b.addEventListener("click", () => {
      tab = b.dataset["communityTab"]!;
      for (const pane of host.querySelectorAll<HTMLElement>(
        "[data-community-pane]",
      ))
        pane.hidden = pane.dataset["communityPane"] !== tab;
      for (const button of host.querySelectorAll("[data-community-tab]"))
        button.setAttribute("aria-pressed", String(button === b));
    });
  let identityAt = 0;
  const timer = setInterval(() => {
    const identityDue = Date.now() - identityAt > 15000;
    if (identityDue) identityAt = Date.now();
    void refresh(identityDue);
  }, 2000);
  void refresh(true);
  return {
    rename(name: string) {
      return send({ type: "profile", name });
    },
    show(value: boolean) {
      active = value;
      if (value) void refresh();
    },
    destroy() {
      disposed = true;
      clearInterval(timer);
    },
  };
}
