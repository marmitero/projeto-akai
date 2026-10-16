import { describe, it, expect } from "vitest";
import {
  HERO_POSE,
  enemyPose,
  contactX,
  bodyGap,
  formation,
  approachFrame,
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

describe("confirmed melee approach", () => {
  it("only enters the attack phase at silhouette contact and returns home", () => {
    const contact = contactX(100, HERO_POSE, enemyPose(false));
    for (let ms = 0; ms < 680; ms += 20) {
      const frame = approachFrame(ms, 274.5, contact, 274.5);
      if (frame.phase === "attack")
        expect(bodyGap(100, frame.x, HERO_POSE, enemyPose(false))).toBe(16);
    }
    expect(approachFrame(-120, 274.5, contact, 274.5).x).toBe(274.5);
    expect(approachFrame(680, 274.5, contact, 216.5)).toEqual({
      phase: "done",
      x: 216.5,
    });
  });
  it("uses boss scale and preserves ranged stand-off through metadata", () => {
    for (const pose of [enemyPose(true), enemyPose(false, "ranged")]) {
      const contact = contactX(100, HERO_POSE, pose);
      expect(
        bodyGap(100, approachFrame(200, 300, contact, 300).x, HERO_POSE, pose),
      ).toBe(pose.reach);
    }
  });
});

it("keeps confirmed group swings separated while their approaches can overlap", () => {
  for (let ms = 0; ms < 1700; ms += 10) {
    const swinging = [0, 1, 2].filter(
      (i) =>
        approachFrame(ms - i * 480, 158.5 + i * 58, 158.5, 158.5 + i * 58)
          .phase === "attack",
    );
    expect(swinging.length).toBeLessThanOrEqual(1);
  }
});
