import { enemyTemplate } from "@akai/shared";
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
  id?: string,
): CombatPose {
  const t = boss ? undefined : enemyTemplate(id);
  if(t) {
    const bounds: Record<string,[number,number]> = {
      Slime:[-26,22], Bat:[-17,17], Mushroom:[-15,15], Dude_Monster:[-18,16],
      "Owlet Monster":[-20,16], "Pink Monster":[-18,16], Skeleton:[-9,15],
      "Shield Skeleton":[-11,18], "Lancer Skeleton":[-10,15], Archer:[-2,21],
      Shadow:[-3,26], Inquisitor:[-17,19], Warrior:[-13,10],
      "Male Base":[-14,8], "Female Base":[-12,10],
      Zombie_1:[-16,16],Zombie_2:[-21,8],Zombie_3:[-18,15],Zombie_4:[-16,17],
    };
    const [left,right] = bounds[t.family] ?? [-9,15];
    return { bodyLeft:left, bodyRight:right, scale:1.5,
      style:t.role === "ranged" ? "ranged" : style,
      reach:t.role === "ranged" || style === "ranged" ? 180 : 16 };
  }
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
  ids?: Array<string | undefined>,
) {
  if (!boss && ids?.some(Boolean)) {
    let edge=heroX+HERO_POSE.bodyRight*HERO_POSE.scale+16;
    return alive.map((living,i)=> {
      if(!living) return null;
      const p=enemyPose(false,style,ids[i]), x=edge+p.bodyRight*p.scale;
      edge=x-p.bodyLeft*p.scale+12;
      return x;
    });
  }
  const pose = enemyPose(boss, style),
    front = contactX(heroX, HERO_POSE, pose);
  let rank = 0;
  return alive.map((living) => (living ? front + rank++ * 58 : null));
}

/** A confirmed attack moves to contact before its swing, then returns to the current formation. */
export function approachFrame(
  elapsed: number,
  from: number,
  contact: number,
  home: number,
) {
  const ease = (value: number) => value * value * (3 - 2 * value);
  if (elapsed < 0) return { phase: "waiting", x: from } as const;
  if (elapsed < 160)
    return {
      phase: "approach",
      x: from + (contact - from) * ease(elapsed / 160),
    } as const;
  if (elapsed < 520) return { phase: "attack", x: contact } as const;
  if (elapsed < 680)
    return {
      phase: "return",
      x: contact + (home - contact) * ease((elapsed - 520) / 160),
    } as const;
  return { phase: "done", x: home } as const;
}
