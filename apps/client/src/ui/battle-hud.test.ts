import { describe, it, expect } from "vitest";
import { floorWindow } from "./battle-hud.js";
describe("floor banner bounds", () => {
  it("shows only available floors at tower boundaries", () => {
    expect(floorWindow(1)).toEqual([1, 2, 3]);
    expect(floorWindow(1000)).toEqual([998, 999, 1000]);
  });
  it("centers the current floor between two previous and two next floors", () => {
    expect(floorWindow(500)).toEqual([498, 499, 500, 501, 502]);
  });
});
