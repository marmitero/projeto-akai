// Vite only bundles this curated subset; never preload the full audit inventory.
export const assets = {
  heroRun: new URL("./derived/hero-run.png", import.meta.url).href,
  heroDead: new URL("./derived/hero-dead.png", import.meta.url).href,
  skeletonDead: new URL("./derived/skeleton-dead.png", import.meta.url).href,
  heroIdle: new URL("./derived/hero-idle.png", import.meta.url).href,
  heroAttack: new URL("./derived/hero-attack-01.png", import.meta.url).href,
  skeletonIdle: new URL("./derived/skeleton-idle.png", import.meta.url).href,
  skeletonAttack: new URL("./derived/skeleton-attack.png", import.meta.url)
    .href,
  grass: new URL("./derived/grass.png", import.meta.url).href,
  rockTop: new URL("./derived/rock-top.png", import.meta.url).href,
  rockSide: new URL("./derived/rock-side.png", import.meta.url).href,
  rockFill: new URL("./derived/rock-fill.png", import.meta.url).href,
  torch: new URL("./derived/torch.png", import.meta.url).href,
  dust: new URL("./derived/dust.png", import.meta.url).href,
  ironNode: new URL("../../../../sprites/Mine/ironNode.png", import.meta.url)
    .href,
  coalNode: new URL("../../../../sprites/Mine/coalNode.png", import.meta.url)
    .href,
  goldNode: new URL("../../../../sprites/Mine/goldNode.png", import.meta.url)
    .href,
  jadeNode: new URL("../../../../sprites/Mine/jadeNode.png", import.meta.url)
    .href,
  iron: new URL("../../../../sprites/Materials/Icon31_15.png", import.meta.url)
    .href,
  coal: new URL("../../../../sprites/Materials/Icon31_13.png", import.meta.url)
    .href,
  gold: new URL("../../../../sprites/Materials/Icon31_35.png", import.meta.url)
    .href,
  jade: new URL("../../../../sprites/Materials/Icon31_40.png", import.meta.url)
    .href,
  ruby: new URL(
    "../../../../sprites/Misc/Enchantment/Icon328.png",
    import.meta.url,
  ).href,
  sword: new URL(
    "../../../../sprites/Equipments/Swords/Icon1.png",
    import.meta.url,
  ).href,
  pickaxe: new URL(
    "../../../../sprites/Misc/Tools/Icon292.png",
    import.meta.url,
  ).href,
  bag: new URL("../../../../sprites/Misc/Tools/Icon290.png", import.meta.url)
    .href,
  shop: new URL("../../../../sprites/Misc/Tools/Icon291.png", import.meta.url)
    .href,
  panel: new URL(
    "../../../../sprites/Hud/20250420manaSoul9SlicesC-Sheet.png",
    import.meta.url,
  ).href,
  portrait: new URL(
    "../../../../sprites/Hud/20250425portraitFrame-Sheet.png",
    import.meta.url,
  ).href,
  bar: new URL(
    "../../../../sprites/Hud/20250421barB-Sheet.png",
    import.meta.url,
  ).href,
  navNormal: new URL("./derived/nav-normal.png", import.meta.url).href,
  navActive: new URL("./derived/nav-active.png", import.meta.url).href,
  navPressed: new URL("./derived/nav-pressed.png", import.meta.url).href,
  navDisabled: new URL("./derived/nav-disabled.png", import.meta.url).href,
  button: new URL("./derived/button-normal.png", import.meta.url).href,
  buttonPressed: new URL("./derived/button-active.png", import.meta.url).href,
  options: new URL("./derived/options.png", import.meta.url).href,
  close: new URL("./derived/close.png", import.meta.url).href,
  slot: new URL("./derived/slot.png", import.meta.url).href,
  sky: new URL(
    "../../../../sprites/Backgrounds/Normal BG/GandalfHardcore Background layers_layer 5.png",
    import.meta.url,
  ).href,
  hills: new URL(
    "../../../../sprites/Backgrounds/Normal BG/GandalfHardcore Background layers_layer 4.png",
    import.meta.url,
  ).href,
  castle: new URL(
    "../../../../sprites/Backgrounds/Normal BG/Background Castle .png",
    import.meta.url,
  ).href,
  forestFar: new URL(
    "../../../../sprites/Backgrounds/Normal BG/GandalfHardcore Background layers_layer 3.png",
    import.meta.url,
  ).href,
  forestMiddle: new URL(
    "../../../../sprites/Backgrounds/Normal BG/GandalfHardcore Background layers_layer 2.png",
    import.meta.url,
  ).href,
  forestNear: new URL(
    "../../../../sprites/Backgrounds/Normal BG/GandalfHardcore Background layers_layer 1.png",
    import.meta.url,
  ).href,
} as const;
export type AssetKey = keyof typeof assets;
export function installAssetStyles(root: HTMLElement): void {
  for (const key of [
    "panel",
    "portrait",
    "navNormal",
    "navActive",
    "navPressed",
    "navDisabled",
    "button",
    "buttonPressed",
    "slot",
  ] as const)
    root.style.setProperty(`--asset-${key}`, `url("${assets[key]}")`);
}
