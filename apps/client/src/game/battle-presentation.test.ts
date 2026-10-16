import { describe, it, expect } from "vitest";
import {
  HERO_POSE,
  enemyPose,
  contactX,
  bodyGap,
  formation,
} from "./battle-presentation.js";
describe("sprite contact geometry", () => {
  it("measures melee gap from body silhouette, with distinct boss scale", () => {
    for (const boss of [false, true]) {
      const enemy = enemyPose(boss),
        x = contactX(100, HERO_POSE, enemy);
      expect(bodyGap(100, x, HERO_POSE, enemy)).toBe(
        Math.max(HERO_POSE.reach, enemy.reach),
      );
      expect(x).toBeLessThan(200);
    }
    expect(contactX(100, HERO_POSE, enemyPose(true))).toBeGreaterThan(
      contactX(100, HERO_POSE, enemyPose(false)),
    );
  });
  it("reserves a real stand-off distance for future ranged metadata", () => {
    const ranged = enemyPose(false, "ranged");
    expect(
      bodyGap(100, contactX(100, HERO_POSE, ranged), HERO_POSE, ranged),
    ).toBe(105);
  });
  it("survivors close the front gap without reserving a dead enemy slot", () => {
    expect(formation(100, [false, true, true], false)).toEqual([
      null,
      158.5,
      216.5,
    ]);
    expect(formation(100, [true, true, true], false)).toEqual([
      158.5, 216.5, 274.5,
    ]);
  });
});
