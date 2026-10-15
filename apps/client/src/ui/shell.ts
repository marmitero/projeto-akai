import { assets, installAssetStyles } from "../assets/catalog.js";
import type { Screen } from "@akai/shared";
export type Route = Screen | "bag" | "shop";
const icon = (key: keyof typeof assets, className = ""): string =>
  `<img class="sprite ${className}" src="${assets[key]}" alt="" draggable="false">`;
export function createShell(root: HTMLElement): void {
  installAssetStyles(root);
  root.innerHTML = `<div class="game-shell">
  <header class="top-hud panel"><div class="identity"><div class="portrait" aria-label="Retrato do rei ainda não disponível"><span>AK</span></div><div><p class="eyebrow">PROJETO AKAI</p><strong>Reino em ascensão</strong><small>Perfil local de teste</small></div></div><button class="icon-button" id="resources" aria-label="Ver recursos">${icon("iron")}<span data-balance="iron">0</span></button></header>
  <div class="preview-strip"><span class="preview-mark">PRÉVIA VISUAL</span><span>Fase 2 · sem ganhos de recursos</span></div>
  <main id="content" class="content" tabindex="-1">
    <header class="page-heading"><div><p id="page-kicker" class="eyebrow">A TORRE</p><h1 id="page-title">Batalha</h1></div><span id="page-badge" class="badge">Andar de teste</span></header>
    <section id="visual-area" aria-label="Cenário da atividade selecionada">
      <div class="stage-frame"><div id="game" role="img" aria-label="Prévia lateral de guerreiro e esqueletos"></div>
        <div id="asset-status" class="loading-message" role="status">Preparando o cenário…</div>
        <button id="mine-target" class="mine-target" aria-label="Testar impacto no minério" hidden disabled><span class="sr-only">Feedback visual, sem receber ferro</span></button>
        <span id="scene-caption" class="scene-caption">Floresta do reino</span>
      </div>
      <p id="visual-description" class="sr-only">Animação demonstrativa. Não há combate ou recompensas nesta fase.</p>
    </section>
    <section data-pane="battle" class="activity-details" aria-label="Prévia de batalha">
      <div class="encounter panel"><div>${icon("sword")}<span>Guerreiro<span class="muted">Aliado</span></span></div><span class="versus">VS</span><div><span>Esqueletos<span class="muted">3 inimigos</span></span></div></div>
      <div class="section-title"><h2>O próximo desafio</h2><span class="badge">Em preparação</span></div>
      <p class="body-copy">O guerreiro ataca por conta própria. Esta é uma prévia das animações; ondas, vida e recompensas entram na próxima fase.</p><button id="preview-defeat" class="preview-button">Testar animação de derrota</button>
    </section>
    <section data-pane="mine" class="activity-details" aria-label="Mineração de ferro" hidden>
      <div class="mine-summary panel">${icon("iron")}<div><span class="muted">Seu ferro</span><strong data-balance="iron">0</strong></div><span class="badge">Impacto visual</span></div>
      <h2>Um toque, uma faísca.</h2><p class="body-copy">Toque no minério para testar o impacto. O ferro e as melhorias serão ativados na próxima fase.</p>
      <p id="mining-feedback" class="sr-only" role="status" aria-live="polite"></p>
    </section>
    <section data-pane="production" class="activity-details" aria-label="Minas automáticas" hidden>
      <p class="body-copy">Minas que trabalharão pelo seu reino. Produção ainda inativa nesta prévia.</p>
      <div class="mines-list">
        <article class="mine-card panel">${icon("coalNode")}<div><h2>Mina de carvão</h2><p>Desbloqueio com ferro e coins</p><span class="muted">Nível — · Produção 0/s</span></div><button disabled aria-label="Mina de carvão indisponível">Em breve</button></article>
        <article class="mine-card panel">${icon("goldNode")}<div><h2>Mina de ouro</h2><p>Requer mina de carvão nível 50</p><span class="muted">Nível — · Produção 0/s</span></div><button disabled aria-label="Mina de ouro indisponível">Bloqueada</button></article>
        <article class="mine-card panel">${icon("jadeNode")}<div><h2>Mina de jade</h2><p>Progressão avançada do reino</p><span class="muted">Nível — · Produção 0/s</span></div><button disabled aria-label="Mina de jade indisponível">Bloqueada</button></article>
      </div>
    </section>
    <section data-pane="bag" class="extra-page" hidden><div class="empty-state panel">${icon("bag", "large-icon")}<h2>Sua jornada está começando</h2><p>Os equipamentos serão integrados na fase de progressão RPG. Nenhum item foi concedido nesta prévia.</p><div class="empty-slots" aria-hidden="true">${Array.from({ length: 6 }, () => icon("slot")).join("")}</div></div></section>
    <section data-pane="shop" class="extra-page" hidden><div class="empty-state panel">${icon("shop", "large-icon")}<h2>O mercador ainda está a caminho</h2><p>A loja está indisponível nesta fase. Não há produtos, preços ou compras ativas.</p></div></section>
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
    <h3>Perfil local de teste</h3><p class="body-copy">O retrato do rei ainda não foi definido. Seu perfil local é salvo somente neste navegador.</p>
    <label class="motion-setting"><input id="reduce-motion" type="checkbox"> Reduzir movimento e efeitos</label>
    <div class="save-actions"><button id="save" disabled>Salvar perfil local</button><button id="recover" hidden>Restaurar cópia anterior</button></div>
    <p id="save-status" role="status" aria-live="polite">Abrindo salvamento…</p>
    <details><summary>Outros destinos do reino</summary><p>Mascotes, habilidades, eventos, mercado, arena, guildas e rankings serão integrados nas fases seguintes.</p></details></div>
    <div id="dialog-resources" hidden><p class="body-copy">Saldos locais. Nenhum recurso é gerado nesta prévia.</p><dl class="resources-list">${(
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
    badge: "Cenário de teste",
    caption: "Floresta do reino",
    description:
      "Guerreiro e três esqueletos em prévia de ataque lateral, sem vida ou recompensas simuladas.",
  },
  mine: {
    title: "Mina",
    kicker: "NAS PROFUNDEZAS",
    badge: "Ferro",
    caption: "Veio de ferro",
    description:
      "Caverna com nó de ferro e tochas. Toque no minério para testar o impacto visual, sem ganho de recurso.",
  },
  production: {
    title: "Produção",
    kicker: "RIQUEZAS DO REINO",
    badge: "Minas automáticas",
    caption: "Carvão · Ouro · Jade",
    description: "Nós de carvão, ouro e jade. As minas ainda estão inativas.",
  },
  bag: {
    title: "Mochila",
    kicker: "SEU EQUIPAMENTO",
    badge: "Em preparação",
    caption: "",
    description: "",
  },
  shop: {
    title: "Loja",
    kicker: "O MERCADOR",
    badge: "Indisponível",
    caption: "",
    description: "",
  },
};
