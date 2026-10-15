import {
  ITEMS,
  ITEM_IDS,
  SLOT_IDS,
  SLOT_LABELS,
  RARITY,
  AFFIX_LABELS,
  CONTENT,
  levelFromXp,
  heroStats,
  gearStats,
  itemTierAvailable,
  craftCost,
  smeltCost,
  tonicCost,
  petCost,
  mineCost,
  mineEligible,
  enhancementCost,
  canPay,
  type LocalSnapshot,
  type RpgCommand,
  type ItemId,
} from "@akai/shared";
import { assets } from "../assets/catalog.js";
export const itemImages: Record<ItemId, string> = {
  sword: assets.sword,
  dagger: assets.itemDagger,
  axe: assets.itemAxe,
  mace: assets.itemMace,
  greatsword: assets.itemGreatsword,
  spear: assets.itemSpear,
  bow: assets.itemBow,
  shield: assets.itemShield,
  armor: assets.itemArmor,
  hat: assets.itemHat,
  gloves: assets.itemGloves,
  boots: assets.itemBoots,
  pendant: assets.itemPendant,
  ring: assets.itemRing,
};
const labels = {
  iron: "ferro",
  coin: "Coins",
  coal: "carvão",
  gold: "ouro",
  jade: "jade",
  castIron: "ferro fundido",
};
const costText = (cost: ReturnType<typeof craftCost>) =>
  Object.entries(cost)
    .map(
      ([k, v]) =>
        `${v.toLocaleString("pt-BR")} ${labels[k as keyof typeof labels]}`,
    )
    .join(" + ");
const icon = (url: string) =>
  `<img class="sprite" src="${url}" alt="" draggable="false">`;
export function createRpgUI(
  app: HTMLElement,
  run: (cmd: RpgCommand) => boolean,
) {
  const root = app.querySelector<HTMLElement>("#rpg-root")!;
  root.innerHTML = `<div class="rpg-summary panel"><h2>Seu guerreiro</h2><p id="rpg-levels"></p><p id="rpg-stats"></p><p id="rpg-materials"></p></div>
 <div class="rpg-tabs" role="tablist" aria-label="Mochila e progressão"><button role="tab" aria-selected="true" aria-controls="rpg-equipment" id="tab-equipment" data-rpg-tab="equipment">Equipamento</button><button role="tab" aria-selected="false" tabindex="-1" aria-controls="rpg-forge" id="tab-forge" data-rpg-tab="forge">Forja</button><button role="tab" aria-selected="false" tabindex="-1" aria-controls="rpg-pet" id="tab-pet" data-rpg-tab="pet">Companheiro</button></div>
 <section id="rpg-equipment" role="tabpanel" aria-labelledby="tab-equipment"><h2>Equipado</h2><div id="equipped-list" class="equipped-list"></div><div class="inventory-heading"><h2>Inventário <span id="inventory-capacity"></span></h2><label>Filtrar raridade <select id="rarity-filter"><option value="all">Todas</option>${Object.entries(
   RARITY,
 )
   .map(([k, r]) => `<option value="${k}">${r.label}</option>`)
   .join(
     "",
   )}</select></label></div><p class="body-copy">Escolha o equipamento e confira seus atributos. Dois anéis usam instâncias diferentes; armas de duas mãos bloqueiam escudo.</p><div id="inventory-list" class="inventory-list"></div></section>
 <section id="rpg-forge" role="tabpanel" aria-labelledby="tab-forge" hidden><h2>Forja das galerias</h2><p class="body-copy">Fabricar cria um equipamento comum. A raridade dos drops pode ser maior. Aprimorar acrescenta 5% aos atributos por nível, até +20, arredondando para cima, sem sortear novamente seus atributos.</p><label>Nível da peça <input id="craft-level" type="number" min="1" max="1" value="1" step="1"></label><p id="craft-requirement"></p><p id="craft-cost" class="cost"></p><div class="recipes">${ITEM_IDS.map((id) => `<button data-rpg-action="craft" data-definition="${id}">${icon(itemImages[id])}<span>${ITEMS[id].name}</span></button>`).join("")}</div><article class="upgrade-card panel"><div><h3>Ferro fundido</h3><p>${costText(smeltCost)} → 1 ferro fundido</p></div><button data-rpg-action="smelt">Fundir</button></article>
 <h2>Tônicos da forja</h2><p class="body-copy">Não acumulam com outro tônico do mesmo tipo. O prazo continua ao fechar o jogo.</p><article class="upgrade-card panel">${icon(assets.attackTonic)}<div><h3>Tônico de combate</h3><p>+20% ataque por 60s</p><p>${costText(tonicCost)}</p><p id="attack-tonic-time"></p></div><button data-rpg-action="attackTonic">Preparar e usar</button></article><article class="upgrade-card panel">${icon(assets.productionTonic)}<div><h3>Tônico das minas</h3><p>+25% produção por 5min</p><p>${costText(tonicCost)}</p><p id="production-tonic-time"></p></div><button data-rpg-action="productionTonic">Preparar e usar</button></article></section>
 <section id="rpg-pet" role="tabpanel" aria-labelledby="tab-pet" hidden><article class="pet-card panel">${icon(assets.petPortrait)}<h2>Musgo</h2><p>Slime domesticado das galerias · Incomum</p><p id="pet-stats"></p><p id="pet-cost" class="cost"></p><div class="battle-actions"><button data-rpg-action="adoptPet">Adotar</button><button data-rpg-action="upgradePet">Evoluir</button><button data-rpg-action="togglePet">Guardar</button></div></article><p class="body-copy">Um companheiro ativo. Musgo concede +2% de produção das minas e +5 de vida máxima por nível; equipar não cura o guerreiro.</p></section>`;
  let state: LocalSnapshot | undefined,
    itemKey = "",
    equippedKey = "";
  const text = (id: string, value: string) => {
    const e = app.querySelector<HTMLElement>("#" + id)!;
    if (e.textContent !== value) e.textContent = value;
  };
  function render(s: LocalSnapshot) {
    state = s;
    const r = s.rpg,
      stats = heroStats(s),
      gear = gearStats(s);
    text(
      "rpg-levels",
      `Guerreiro nível ${levelFromXp(r.heroXp)} · ${r.heroXp.toLocaleString("pt-BR")} XP | Rei nível ${levelFromXp(r.accountXp)} · ${r.accountXp.toLocaleString("pt-BR")} XP`,
    );
    text(
      "rpg-stats",
      `ATQ ${stats.attack.toLocaleString("pt-BR")} · Vida máx. ${stats.hp.toLocaleString("pt-BR")} · Defesa ${stats.defense} · Mineração +${gear.miningBp / 100}%`,
    );
    text(
      "rpg-materials",
      `Ferro fundido: ${(BigInt(r.castIron) / 1000n).toLocaleString("pt-BR")}`,
    );
    text("inventory-capacity", `${r.inventory.length}/${CONTENT.bagCapacity}`);
    const selected =
      app.querySelector<HTMLSelectElement>("#rarity-filter")!.value;
    const key = JSON.stringify([
      r.inventory,
      r.equipped,
      selected,
      levelFromXp(r.heroXp),
    ]);
    if (key !== itemKey) {
      itemKey = key;
      app.querySelector("#inventory-list")!.innerHTML =
        r.inventory
          .filter((i) => selected === "all" || i.rarity === selected)
          .map((i) => {
            const equipped = Object.values(r.equipped).includes(i.id),
              slot = ITEMS[i.definitionId].slot,
              blocked = equipped || i.level > levelFromXp(r.heroXp);
            return `<article class="item-card panel rarity-${i.rarity}" data-item="${i.id}">${icon(itemImages[i.definitionId])}<div><h3>${ITEMS[i.definitionId].name}</h3><p>${RARITY[i.rarity].label} · Requer nível ${i.level} · +${i.enhancement}${equipped ? " · Equipado" : ""}</p><p>Base · ATQ ${i.attributes.attack} · Vida ${i.attributes.hp} · DEF ${i.attributes.defense}</p><p>${i.affixes.map((a) => AFFIX_LABELS[a]).join(" · ") || "Sem afixos"}</p><div class="item-actions"><button data-rpg-action="equip" data-id="${i.id}" data-slot="${slot}" ${blocked ? "disabled" : ""}>Equipar${slot === "ring1" ? " no anel 1" : ""}</button>${slot === "ring1" ? `<button data-rpg-action="equip" data-id="${i.id}" data-slot="ring2" ${blocked ? "disabled" : ""}>Equipar no anel 2</button>` : ""}<button data-rpg-action="enhance" data-id="${i.id}">Aprimorar</button><button data-rpg-action="salvage" data-id="${i.id}" ${equipped ? "disabled" : ""}>Reciclar · ${i.level * 10} ferro</button></div><p class="cost" data-enhance-cost="${i.id}"></p></div></article>`;
          })
          .join("") ||
        '<p class="empty-state panel">Nenhuma peça neste filtro. Fabrique sua primeira peça na Forja ou encontre drops na torre.</p>';
    }
    const eqKey = JSON.stringify([
      r.equipped,
      r.inventory.map((i) => [i.id, i.enhancement]),
    ]);
    if (eqKey !== equippedKey) {
      equippedKey = eqKey;
      app.querySelector("#equipped-list")!.innerHTML = SLOT_IDS.map((slot) => {
        const item = r.inventory.find((i) => i.id === r.equipped[slot]);
        return `<div class="equipped-slot panel">${item ? icon(itemImages[item.definitionId]) : icon(assets.slot)}<span>${SLOT_LABELS[slot]}<small>${item ? ITEMS[item.definitionId].name : "Vazio"}</small></span><button data-rpg-action="unequip" data-slot="${slot}" ${item ? "" : "disabled"}>Retirar</button></div>`;
      }).join("");
    }
    const tierInput = app.querySelector<HTMLInputElement>("#craft-level")!;
    tierInput.max = String(
      Math.min(itemTierAvailable(s), levelFromXp(r.heroXp)),
    );
    const tier = Number(tierInput.value),
      validTier =
        Number.isInteger(tier) && tier >= 1 && tier <= Number(tierInput.max);
    text(
      "craft-requirement",
      `Peças até o nível ${tierInput.max}. Novo patamar a cada 10 andares concluídos; requer nível de guerreiro suficiente.`,
    );
    text(
      "craft-cost",
      validTier ? costText(craftCost(tier)) : "Selecione um nível válido.",
    );
    for (const button of app.querySelectorAll<HTMLButtonElement>(
      "[data-rpg-action]",
    )) {
      const action = button.dataset["rpgAction"];
      if (action === "craft")
        button.disabled =
          !validTier ||
          r.inventory.length >= CONTENT.bagCapacity ||
          !canPay(s, craftCost(tier));
      if (action === "smelt") button.disabled = !canPay(s, smeltCost);
      if (action === "enhance") {
        const item = r.inventory.find((i) => i.id === button.dataset["id"]);
        const cost = item && enhancementCost(item);
        button.disabled = !cost || !canPay(s, cost);
        const e = app.querySelector(
          `[data-enhance-cost="${button.dataset["id"]}"]`,
        )!;
        const label = cost
          ? `Aprimorar: ${costText(cost)}`
          : "Aprimoramento máximo";
        if (e.textContent !== label) e.textContent = label;
      }
      if (action === "adoptPet" || action === "upgradePet") {
        button.hidden = (action === "adoptPet") !== !r.petLevel;
        const cost = petCost(s);
        button.disabled = !cost || !canPay(s, cost);
      }
      if (action === "togglePet") {
        button.hidden = !r.petLevel;
        button.textContent = r.petActive ? "Guardar" : "Ativar";
      }
      if (action === "attackTonic" || action === "productionTonic") {
        const end =
          action === "attackTonic" ? r.attackBuffUntil : r.productionBuffUntil;
        button.disabled = end > s.lastReconciledAt || !canPay(s, tonicCost);
      }
      if (action === "gold" || action === "jade") {
        const cost = mineCost(s, action);
        button.disabled = !cost || !mineEligible(s, action) || !canPay(s, cost);
        button.textContent = (action === "gold" ? r.goldLevel : r.jadeLevel)
          ? "Melhorar"
          : "Desbloquear";
      }
    }
    for (const mine of ["coal", "gold", "jade"] as const) {
      const level =
          mine === "coal"
            ? s.upgrades.coal
            : mine === "gold"
              ? r.goldLevel
              : r.jadeLevel,
        cost = mine === "coal" ? undefined : mineCost(s, mine);
      const bp =
          10000 + gear.productionBp + (r.petActive ? r.petLevel * 200 : 0),
        boost = r.productionBuffUntil > s.lastReconciledAt ? 1.25 : 1;
      const rate =
        (((((mine === "coal" ? 100 : mine === "gold" ? 20 : 5) * level) /
          1000) *
          bp) /
          10000) *
        boost;
      text(
        `${mine}-production`,
        `${level ? "Nível " + level : "Bloqueada"} · ${rate.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} /s`,
      );
      if (mine !== "coal")
        text(
          `cost-${mine}`,
          mine === "gold" && !mineEligible(s, mine)
            ? "Requer carvão nível 50 · " + (cost ? costText(cost) : "")
            : cost
              ? costText(cost)
              : "Nível máximo",
        );
    }
    text(
      "pet-stats",
      r.petLevel
        ? `Nível ${r.petLevel} · ${r.petActive ? "Ativo" : "Guardado"} · +${r.petLevel * 2}% produção · +${r.petLevel * 5} vida`
        : "Disponível para adoção",
    );
    const pc = petCost(s);
    text("pet-cost", pc ? costText(pc) : "Nível máximo");
    text(
      "attack-tonic-time",
      r.attackBuffUntil > s.lastReconciledAt
        ? `${Math.ceil((r.attackBuffUntil - s.lastReconciledAt) / 1000)}s restantes`
        : "Inativo",
    );
    text(
      "production-tonic-time",
      r.productionBuffUntil > s.lastReconciledAt
        ? `${Math.ceil((r.productionBuffUntil - s.lastReconciledAt) / 1000)}s restantes`
        : "Inativo",
    );
  }
  function click(event: Event) {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button",
    );
    if (!target || target.disabled) return;
    const tab = target.dataset["rpgTab"];
    if (tab) {
      for (const button of root.querySelectorAll("[data-rpg-tab]")) {
        const selected = (button as HTMLElement).dataset["rpgTab"] === tab;
        button.setAttribute("aria-selected", String(selected));
        (button as HTMLButtonElement).tabIndex = selected ? 0 : -1;
      }
      for (const panel of root.querySelectorAll<HTMLElement>("[role=tabpanel]"))
        panel.hidden = panel.id !== `rpg-${tab}`;
      return;
    }
    const action = target.dataset["rpgAction"];
    if (!action || !state) return;
    let cmd: unknown = { type: action };
    if (action === "gold" || action === "jade")
      cmd = { type: "mine", mine: action };
    if (action === "craft")
      cmd = {
        type: "craft",
        definitionId: target.dataset["definition"],
        level: Number(
          app.querySelector<HTMLInputElement>("#craft-level")!.value,
        ),
      };
    if (action === "equip")
      cmd = {
        type: "equip",
        id: target.dataset["id"],
        slot: target.dataset["slot"],
      };
    if (action === "unequip")
      cmd = { type: "unequip", slot: target.dataset["slot"] };
    if (action === "salvage" || action === "enhance")
      cmd = { type: action, id: target.dataset["id"] };
    run(cmd as RpgCommand);
  }
  const keydown = (event: KeyboardEvent) => {
    const tab = (event.target as HTMLElement).closest("[data-rpg-tab]");
    if (!tab) return;
    const tabs = [
        ...root.querySelectorAll<HTMLButtonElement>("[data-rpg-tab]"),
      ],
      i = tabs.indexOf(tab as HTMLButtonElement);
    let next = i;
    if (event.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (i + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs[next]!.click();
    tabs[next]!.focus();
  };
  root.addEventListener("keydown", keydown);
  const change = () => {
    if (state) render(state);
  };
  app.addEventListener("click", click);
  root.addEventListener("change", change);
  return {
    render,
    destroy() {
      app.removeEventListener("click", click);
      root.removeEventListener("change", change);
      root.removeEventListener("keydown", keydown);
    },
  };
}
