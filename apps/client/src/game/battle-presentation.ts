/** Body bounds measured in the normalized 160x128 frames, relative to foot pivot (80,112).
 * Weapon trails/padding are excluded. Range is presentation metadata, never economic authority. */
export interface CombatPose {
  bodyLeft: number;
  bodyRight: number;
  scale: number;
  style: "melee" | "ranged";
  reach: number;
}
export const HERO_POSE: CombatPose = {
  bodyLeft: -9,
  bodyRight: 10,
  scale: 2,
  style: "melee",
  reach: 16,
};
export function enemyPose(
  boss: boolean,
  style: "melee" | "ranged" = "melee",
): CombatPose {
  return {
    bodyLeft: -9,
    bodyRight: 15,
    scale: boss ? 2.8 : 1.5,
    style,
    reach: style === "ranged" ? 105 : boss ? 22 : 16,
  };
}
export function contactX(heroX: number, hero: CombatPose, enemy: CombatPose) {
  // Enemies face left: their source right edge becomes their left silhouette edge.
  const leftEdge = -enemy.bodyRight * enemy.scale;
  const gap =
    enemy.style === "ranged" ? enemy.reach : Math.max(hero.reach, enemy.reach);
  return heroX + hero.bodyRight * hero.scale - leftEdge + gap;
}
export function bodyGap(
  heroX: number,
  enemyX: number,
  hero: CombatPose,
  enemy: CombatPose,
) {
  return (
    enemyX -
    enemy.bodyRight * enemy.scale -
    (heroX + hero.bodyRight * hero.scale)
  );
}
export function formation(
  heroX: number,
  alive: boolean[],
  boss: boolean,
  style: "melee" | "ranged" = "melee",
) {
  const pose = enemyPose(boss, style),
    front = contactX(heroX, HERO_POSE, pose);
  let rank = 0;
  return alive.map((living) => (living ? front + rank++ * 58 : null));
}
