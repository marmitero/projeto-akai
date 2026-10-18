import { assets, installAssetStyles } from "../assets/catalog.js";
import type { Screen } from "@akai/shared";
export type Route =
  | Exclude<Screen, "production">
  | "upgrades"
  | "bag"
  | "shop"
  | "community"
  | "market"
  | "bestiary";
const icon = (key: keyof typeof assets, className = ""): string =>
  `<img class="sprite ${className}" src="${assets[key]}" alt="" draggable="false">`;
function upgradeCard(kind: string, title: string): string {
  return `<article class="upgrade-card panel"><div><h3>${title}</h3><p id="level-${kind}" class="muted"></p><p id="cost-${kind}" class="cost"></p></div><button data-upgrade="${kind}" disabled>Melhorar</button></article>`;
}
export function createShell(root: HTMLElement): void {
  installAssetStyles(root);
  root.innerHTML = `<div class="game-shell">
  <header class="top-hud panel"><button class="identity" id="profile-open" aria-label="Abrir perfil"><span class="portrait"><img src="${assets.heroPortrait}" alt="Retrato do protagonista" draggable="false"></span><span class="player-identity"><strong id="player-name">Aventureiro</strong><small id="player-guild" hidden></small></span></button><button class="resource-wallet" id="resources" aria-label="Ver recursos">${(
    [
      ["coin", "Coins"],
      ["iron", "Ferro"],
      ["coal", "Carvão"],
      ["ruby", "Ruby"],
      ["gold", "Ouro"],
    ] as const
  )
    .map(
      ([key, label]) =>
        `<span class="wallet-item" data-resource="${key}" title="${label}">${icon(key)}<span class="sr-only">${label}: </span><span data-balance="${key}" data-compact>0</span></span>`,
    )
    .join("")}</button></header>
  <main id="content" class="content" data-view="battle" tabindex="-1">
    <p id="offline-summary" class="notice" role="status" hidden></p><p id="tutorial" class="tutorial panel"></p><p id="action-status" role="status" aria-live="polite"></p><header class="page-heading"><div><p id="page-kicker" class="eyebrow">A TORRE</p><h1 id="page-title">Batalha</h1></div><span id="page-badge" class="badge">Andar 1</span></header>
    <section id="visual-area" aria-label="Cenário da atividade selecionada">
      <div class="stage-frame"><ol id="floor-banner" class="floor-banner" aria-label="Andares da torre"></ol><div id="game" role="img" aria-label="Combate lateral automático"></div>
        <div id="asset-status" class="loading-message" role="status">Preparando o cenário…</div>
        <button id="mine-target" class="mine-target" aria-label="Minerar ferro" hidden disabled><span class="sr-only">Toque para receber ferro</span></button>
        <div id="battle-controls"><p id="battle-status" class="body-copy" role="status"></p><div class="battle-actions"><button id="pause-battle">Pausar batalha</button><button id="retry-battle" hidden>Tentar novamente</button><button id="train-battle" hidden>Treinar no andar anterior</button></div></div>
        <span id="scene-caption" class="scene-caption">Floresta do reino</span>
      </div>
      <p id="visual-description" class="sr-only">Batalha automática com vida, ondas e recompensas.</p>
    </section>
    <section data-pane="battle" class="activity-details" aria-label="Batalha automática">
      <div class="encounter sr-only"><div>${icon("sword")}<span>Guerreiro<span id="hero-stats" class="muted"></span></span></div><span class="versus">VS</span><div><span id="enemy-name">Esqueletos</span></div></div>
      <div class="combat-readout sr-only" aria-label="Vida dos combatentes"><label>Vida do guerreiro <span id="hero-hp"></span><progress id="hero-health" max="100" value="100"></progress></label><div id="enemy-health"></div></div>
      <section id="battle-chat" class="battle-chat panel" aria-label="Conversa e registros da batalha">
        <div class="battle-chat-tabs" role="tablist" aria-label="Canais da batalha">
          <button id="battle-tab-global" data-battle-tab="global" role="tab" aria-controls="battle-global" aria-selected="false" tabindex="-1">Global</button>
          <button id="battle-tab-system" data-battle-tab="system" role="tab" aria-controls="battle-system" aria-selected="true">Sistema</button>
        </div>
        <div id="battle-global" role="tabpanel" aria-labelledby="battle-tab-global" hidden><p id="battle-global-status"></p><button id="battle-global-open" hidden>Abrir chat da Comunidade</button></div>
        <div id="battle-system" role="tabpanel" aria-labelledby="battle-tab-system"><p id="battle-log-empty">Os resultados das próximas batalhas aparecerão aqui.</p><ol id="battle-system-log" aria-label="Histórico de batalha" tabindex="0"></ol><button id="battle-log-latest" hidden>Ver recentes</button></div>
      </section>
      <form id="nickname-setup" class="nickname-setup" hidden><label for="starting-name">Seu nick</label><input id="starting-name" name="name" minlength="3" maxlength="24" placeholder="Nome do guerreiro" required><button>Começar</button></form>


    </section>
    <section data-pane="mine" class="activity-details" aria-label="Mineração e produção" hidden>
      <div class="mine-summary panel">${icon("iron")}<div><span class="muted">Seu ferro</span><strong data-balance="iron">0</strong></div><span id="click-gain" class="badge">1 / toque</span></div>
      <h2>Ferro para o seu reino.</h2><p class="body-copy">Toque no minério. A batalha continua enquanto você minera.</p><div class="upgrade-list">${upgradeCard("click", "Poder da picareta")}</div>
      <p id="mining-feedback" class="sr-only" role="status" aria-live="polite"></p>
      <h2 class="production-heading">Minas automáticas</h2>
      <p class="body-copy">Carvão produzido automaticamente, inclusive por até 8 horas de ausência. Ouro requer carvão nível 50. Todos os minérios mantêm seus bônus durante o prazo válido.</p>
      <div class="mines-list">
        <article class="mine-card panel">${icon("coalNode")}<div><h2>Mina de carvão</h2><p id="coal-production">Bloqueada · 0/s</p><span id="cost-coal" class="muted"></span></div><button data-upgrade="coal" disabled>Desbloquear</button></article>
        <article class="mine-card panel">${icon("goldNode")}<div><h2>Mina de ouro</h2><p id="gold-production">Bloqueada · 0/s</p><span id="cost-gold" class="muted"></span></div><button data-rpg-action="gold" disabled>Desbloquear</button></article>
        <article class="mine-card panel">${icon("jadeNode")}<div><h2>Mina de jade</h2><p id="jade-production">Bloqueada · 0/s</p><span id="cost-jade" class="muted"></span></div><button data-rpg-action="jade" disabled>Desbloquear</button></article>
      </div>
    </section>
    <section data-pane="upgrades" class="activity-details" aria-label="Melhorias do guerreiro" hidden>
      <p class="body-copy">Fortaleça seu guerreiro para os próximos andares.</p><div class="upgrade-list">${upgradeCard("attack", "Força do guerreiro")}${upgradeCard("vitality", "Vitalidade")}</div>
    </section>
    <section data-pane="bag" class="extra-page" hidden><div id="rpg-root"></div></section>
    <section data-pane="market" class="extra-page" hidden><div id="market-root"></div></section>
    <section data-pane="community" class="extra-page" hidden><div id="community-root"></div></section>
    <section data-pane="bestiary" class="extra-page" hidden><div id="bestiary-root"></div></section>
    <section data-pane="shop" class="extra-page" hidden><div id="premium-root"></div></section>
  </main>
  <nav class="bottom-hud" aria-label="Menu principal">
    <button data-route="battle" aria-current="page">${icon("sword")}<span>Batalha</span></button>
    <button data-route="mine">${icon("pickaxe")}<span>Mina</span></button>
    <button data-route="upgrades">${icon("sword")}<span>Melhorias</span></button>
    <button data-route="bag" class="wide-menu">${icon("bag")}<span>Mochila</span></button>
    <button data-route="shop" class="wide-menu">${icon("shop")}<span>Loja</span></button>
    <button id="more">${icon("options")}<span>Mais</span></button>
  </nav>
  <dialog id="menu-dialog" aria-labelledby="dialog-title"><div class="dialog-panel panel"><div class="dialog-heading"><h2 id="dialog-title">Seu reino</h2><button id="close-dialog" class="close-button" aria-label="Fechar menu">${icon("close")}</button></div>
    <div id="dialog-menu"><div class="shortcut-row"><button data-shortcut="bag">${icon("bag")}Mochila</button><button data-shortcut="shop">${icon("shop")}Loja</button></div>
    <button data-shortcut="bestiary">Bestiário</button><button data-shortcut="community">Comunidade</button><button data-shortcut="market">Mercado</button>
    <h3 id="profile-heading">Perfil local de teste</h3><p class="body-copy">Seu perfil é salvo neste navegador. Escolha como quer ser chamado.</p>
    <p id="profile-title" class="muted" hidden></p><form id="profile-name-form" class="community-form"><label>Nick do jogador<input name="name" minlength="3" maxlength="24" required autocomplete="nickname"></label><button>Salvar nick</button></form><p id="profile-name-status" role="status"></p>
    <label class="motion-setting"><input id="reduce-motion" type="checkbox"> Reduzir movimento e efeitos</label>
    <div class="save-actions"><button id="save" disabled>Salvar perfil local</button><button id="recover" hidden>Restaurar cópia anterior</button></div>
    <p id="save-status" role="status" aria-live="polite">Abrindo salvamento…</p>
    <details><summary>Outros destinos do reino</summary><p>Habilidades avançadas são futuras. Comunidade e Mercado estão no modo online; Loja depende da configuração de teste do servidor.</p></details></div>
    <div id="dialog-resources" hidden><p class="body-copy">Saldos do perfil local. Ouro e jade são gerados pelas minas desbloqueadas. Ruby permanece indisponível.</p><dl class="resources-list">${(
      [
        ["coin", "Coins", "coin"],
        ["iron", "Ferro", "iron"],
        ["coal", "Carvão", "coal"],
        ["gold", "Ouro", "gold"],
        ["jade", "Jade", "jade"],
        ["ruby", "Ruby", "ruby"],
      ] as const
    )
      .map(
        ([key, label, image]) =>
          `<div><dt>${image ? icon(image) : '<span class="coin-label" aria-hidden="true">C</span>'}${label}</dt><dd data-balance="${key}">0</dd></div>`,
      )
      .join("")}</dl></div>
  </div></dialog>
  </div>`;
}
export const routeLabels: Record<
  Route,
  {
    title: string;
    kicker: string;
    badge: string;
    caption: string;
    description: string;
  }
> = {
  battle: {
    title: "Batalha",
    kicker: "A TORRE",
    badge: "Andar 1",
    caption: "Floresta do reino",
    description: "Batalha automática do guerreiro contra os inimigos da torre.",
  },
  mine: {
    title: "Mina",
    kicker: "NAS PROFUNDEZAS",
    badge: "Ferro",
    caption: "Veio de ferro",
    description: "Caverna de ferro. Toque no minério para receber ferro.",
  },
  upgrades: {
    title: "Melhorias",
    kicker: "SEU GUERREIRO",
    badge: "Atributos",
    caption: "",
    description: "Melhorias de força e vitalidade do guerreiro.",
  },
  bag: {
    title: "Mochila",
    kicker: "SEU EQUIPAMENTO",
    badge: "Equipamento e Forja",
    caption: "",
    description: "",
  },
  bestiary: {title:"Bestiário",kicker:"CRIATURAS DA TORRE",badge:"Inimigos comuns",caption:"",description:"Catálogo de inimigos comuns e recompensas por andar."},
  market: {
    title: "Mercado",
    kicker: "ENTRE JOGADORES",
    badge: "Online",
    caption: "",
    description: "",
  },
  community: {
    title: "Comunidade",
    kicker: "O REINO",
    badge: "Online",
    caption: "",
    description: "",
  },
  shop: {
    title: "Loja",
    kicker: "O MERCADOR",
    badge: "Teste / desativada",
    caption: "",
    description: "",
  },
};
