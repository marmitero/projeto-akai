import { LOOP } from "@akai/shared";
import { assets } from "../assets/catalog.js";

export function floorWindow(current: number, total = LOOP.floors): number[] {
  return Array.from({ length: 5 }, (_, i) => current - 2 + i).filter(
    (n) => n >= 1 && n <= total,
  );
}
export function createFloorBanner(host: HTMLElement) {
  const papers = [
    assets.floorPaper0,
    assets.floorPaper1,
    assets.floorPaper2,
    assets.floorPaper3,
  ];
  let previous = -1;
  return (current: number) => {
    if (current === previous) return;
    previous = current;
    host.replaceChildren(
      ...floorWindow(current).map((n) => {
        const paper = document.createElement("li");
        paper.style.backgroundImage = `url("${papers[(n - 1) % 4]}")`;
        paper.textContent = String(n);
        paper.setAttribute(
          "aria-label",
          `Andar ${n}${n === current ? ", atual" : ""}`,
        );
        paper.dataset["floor"] = String(n);
        paper.dataset["digits"] = String(String(n).length);
        if (n === current) paper.setAttribute("aria-current", "step");
        return paper;
      }),
    );
  };
}
