import { assets, installAssetStyles } from "../assets/catalog.js";
import type { Screen } from "@akai/shared";
export type Route = Screen | "bag" | "shop" | "community" | "market";
const icon = (key: keyof typeof assets, className = ""): string =>
  `<img class="sprite ${className}" src="${assets[key]}" alt="" draggable="false">`;
function upgradeCard(kind: string, title: string): string {
  return `<article class="upgrade-card panel"><div><h3>${title}</h3><p id="level-${kind}" class="muted"></p><p id="cost-${kind}" class="cost"></p></div><button data-upgrade="${kind}" disabled>Melhorar</button></article>`;
}
export function createShell(root: HTMLElement): void {
  installAssetStyles(root);
  root.innerHTML = `<div class="game-shell">
  <header class="top-hud panel"><div class="identity"><div class="portrait" aria-label="Retrato do rei ainda não disponível"><span>AK</span></div><div><p class="eyebrow">PROJETO AKAI</p><strong>Reino em ascensão</strong><small>Local · <span data-balance="coin" data-compact>0</span> Coins</small></div></div><button class="icon-button" id="resources" aria-label="Ver recursos">${icon("iron")}<span data-balance="iron" data-compact>0</span></button></header>
  <div class="preview-strip"><span class="preview-mark">MVP LOCAL</span><span>Fase 4 · progresso salvo neste navegador</span></div>
  <main id="content" class="content" tabindex="-1">
    <p id="offline-summary" class="notice" role="status" hidden></p><p id="tutorial" class="tutorial panel"></p><p id="action-status" role="status" aria-live="polite"></p><header class="page-heading"><div><p id="page-kicker" class="eyebrow">A TORRE</p><h1 id="page-title">Batalha</h1></div><span id="page-badge" class="badge">Andar 1</span></header>
    <section id="visual-area" aria-label="Cenário da atividade selecionada">
      <div class="stage-frame"><div id="game" role="img" aria-label="Combate lateral automático"></div>
        <div id="asset-status" class="loading-message" role="status">Preparando o cenário…</div>
        <button id="mine-target" class="mine-target" aria-label="Minerar ferro" hidden disabled><span class="sr-only">Toque para receber ferro</span></button>
        <span id="scene-caption" class="scene-caption">Floresta do reino</span>
      </div>
      <p id="visual-description" class="sr-only">Batalha automática com vida, ondas e recompensas.</p>
    </section>
    <section data-pane="battle" class="activity-details" aria-label="Batalha automática">
      <div class="encounter panel"><div>${icon("sword")}<span>Guerreiro<span id="hero-stats" class="muted"></span></span></div><span class="versus">VS</span><div><span id="enemy-name">Esqueletos</span></div></div>
      <div class="combat-readout panel"><label>Vida do guerreiro <span id="hero-hp"></span><progress id="hero-health" max="100" value="100"></progress></label><div id="enemy-health"></div></div>
      <p id="battle-status" class="body-copy" role="status"></p><div class="battle-actions"><button id="pause-battle">Pausar batalha</button><button id="retry-battle" hidden>Tentar novamente</button><button id="train-battle" hidden>Treinar no andar anterior</button></div>
      <h2>Fortaleça seu guerreiro</h2><div class="upgrade-list">${upgradeCard("attack", "Força do guerreiro")}${upgradeCard("vitality", "Vitalidade")}</div>

    </section>
    <section data-pane="mine" class="activity-details" aria-label="Mineração de ferro" hidden>
      <div class="mine-summary panel">${icon("iron")}<div><span class="muted">Seu ferro</span><strong data-balance="iron">0</strong></div><span id="click-gain" class="badge">1 / toque</span></div>
      <h2>Ferro para o seu reino.</h2><p class="body-copy">Toque no minério. A batalha continua enquanto você minera.</p><div class="upgrade-list">${upgradeCard("click", "Poder da picareta")}</div>
      <p id="mining-feedback" class="sr-only" role="status" aria-live="polite"></p>
    </section>
    <section data-pane="production" class="activity-details" aria-label="Minas automáticas" hidden>
      <p class="body-copy">Carvão produzido automaticamente, inclusive por até 8 horas de ausência. Ouro requer carvão nível 50. Todos os minérios mantêm seus bônus durante o prazo válido.</p>
      <div class="mines-list">
        <article class="mine-card panel">${icon("coalNode")}<div><h2>Mina de carvão</h2><p id="coal-production">Bloqueada · 0/s</p><span id="cost-coal" class="muted"></span></div><button data-upgrade="coal" disabled>Desbloquear</button></article>
        <article class="mine-card panel">${icon("goldNode")}<div><h2>Mina de ouro</h2><p id="gold-production">Bloqueada · 0/s</p><span id="cost-gold" class="muted"></span></div><button data-rpg-action="gold" disabled>Desbloquear</button></article>
        <article class="mine-card panel">${icon("jadeNode")}<div><h2>Mina de jade</h2><p id="jade-production">Bloqueada · 0/s</p><span id="cost-jade" class="muted"></span></div><button data-rpg-action="jade" disabled>Desbloquear</button></article>
      </div>
    </section>
    <section data-pane="bag" class="extra-page" hidden><div id="rpg-root"></div></section>
    <section data-pane="market" class="extra-page" hidden><div id="market-root"></div></section>
    <section data-pane="community" class="extra-page" hidden><div id="community-root"></div></section>
    <section data-pane="shop" class="extra-page" hidden><div id="premium-root"></div></section>
  </main>
  <nav class="bottom-hud" aria-label="Menu principal">
    <button data-route="battle" aria-current="page">${icon("sword")}<span>Batalha</span></button>
    <button data-route="mine">${icon("pickaxe")}<span>Mina</span></button>
    <button data-route="production">${icon("coalNode")}<span>Produção</span></button>
    <button data-route="bag" class="wide-menu">${icon("bag")}<span>Mochila</span></button>
    <button data-route="shop" class="wide-menu">${icon("shop")}<span>Loja</span></button>
    <button id="more">${icon("options")}<span>Mais</span></button>
  </nav>
  <dialog id="menu-dialog" aria-labelledby="dialog-title"><div class="dialog-panel panel"><div class="dialog-heading"><h2 id="dialog-title">Seu reino</h2><button id="close-dialog" class="close-button" aria-label="Fechar menu">${icon("close")}</button></div>
    <div id="dialog-menu"><div class="shortcut-row"><button data-shortcut="bag">${icon("bag")}Mochila</button><button data-shortcut="shop">${icon("shop")}Loja</button></div>
    <button data-shortcut="community">Comunidade</button><button data-shortcut="market">Mercado</button>
    <h3 id="profile-heading">Perfil local de teste</h3><p class="body-copy">O retrato do rei ainda não foi definido. Seu perfil local é salvo somente neste navegador.</p>
    <label class="motion-setting"><input id="reduce-motion" type="checkbox"> Reduzir movimento e efeitos</label>
    <div class="save-actions"><button id="save" disabled>Salvar perfil local</button><button id="recover" hidden>Restaurar cópia anterior</button></div>
    <p id="save-status" role="status" aria-live="polite">Abrindo salvamento…</p>
    <details><summary>Outros destinos do reino</summary><p>Habilidades avançadas são futuras. Comunidade e Mercado estão no modo online; Loja depende da configuração de teste do servidor.</p></details></div>
    <div id="dialog-resources" hidden><p class="body-copy">Saldos do perfil local. Ouro e jade são gerados pelas minas desbloqueadas. Ruby permanece indisponível.</p><dl class="resources-list">${(
      [
        ["coin", "Coins", null],
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
  production: {
    title: "Produção",
    kicker: "RIQUEZAS DO REINO",
    badge: "Minas automáticas",
    caption: "Carvão · Ouro · Jade",
    description: "Produção automática de carvão. Ouro e jade ainda bloqueados.",
  },
  bag: {
    title: "Mochila",
    kicker: "SEU EQUIPAMENTO",
    badge: "Equipamento e Forja",
    caption: "",
    description: "",
  },
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
