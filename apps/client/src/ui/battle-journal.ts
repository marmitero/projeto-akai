import type { BattleReport, LocalSnapshot } from "@akai/shared";

const amount = (value: string): string => {
  const n = BigInt(value),
    whole = n / 1000n,
    fraction = (n % 1000n).toString().padStart(3, "0").replace(/0+$/, "");
  return whole.toLocaleString("pt-BR") + (fraction ? `,${fraction}` : "");
};
export function describeBattleReport(r: BattleReport): string {
  const location = `Andar ${r.floor} · Onda ${r.wave}`;
  if (r.kind === "victory") return `${location} — Vitória!`;
  if (r.kind === "defeat") return `${location} — Derrota. Seu guerreiro caiu.`;
  if (r.kind === "timeout")
    return `${location} — Derrota: o tempo do boss acabou.`;
  const rewards: string[] = [];
  if (BigInt(r.coin) > 0n) rewards.push(`+${amount(r.coin)} Coins`);
  if (r.heroXp)
    rewards.push(`+${r.heroXp.toLocaleString("pt-BR")} XP do guerreiro`);
  if (r.accountXp)
    rewards.push(`+${r.accountXp.toLocaleString("pt-BR")} XP do rei`);
  if (BigInt(r.iron) > 0n) rewards.push(`+${amount(r.iron)} ferro`);
  if (r.loot) rewards.push(r.loot);
  return `${location} — Inimigo derrotado.${rewards.length ? ` ${rewards.join(" · ")}` : ""}`;
}

export function createBattleJournal(
  root: HTMLElement,
  online: boolean,
  openCommunity: () => void,
) {
  const tabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-battle-tab]"),
  );
  const list = root.querySelector<HTMLOListElement>("#battle-system-log")!;
  const empty = root.querySelector<HTMLElement>("#battle-log-empty")!;
  const latest = root.querySelector<HTMLButtonElement>("#battle-log-latest")!;
  const globalStatus = root.querySelector<HTMLElement>(
    "#battle-global-status",
  )!;
  const globalOpen = root.querySelector<HTMLButtonElement>(
    "#battle-global-open",
  )!;
  globalStatus.textContent = online
    ? "Converse com outros jogadores no chat da Comunidade."
    : "Entre no modo online para conversar com outros jogadores.";
  globalOpen.hidden = !online;
  globalOpen.addEventListener("click", openCommunity);
  let active = "system",
    signature = "",
    previousIds = new Set<number>(),
    unseen = 0;
  const showLatest = () => {
    list.scrollTop = list.scrollHeight;
    unseen = 0;
    latest.hidden = true;
  };
  const select = (tab: HTMLButtonElement, focus = false) => {
    active = tab.dataset["battleTab"]!;
    for (const button of tabs) {
      const selected = button === tab;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
      root.querySelector<HTMLElement>(
        `#${button.getAttribute("aria-controls")}`,
      )!.hidden = !selected;
    }
    if (focus) tab.focus();
    if (active === "system" && unseen === 0) showLatest();
  };
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      const next =
        event.key === "ArrowRight"
          ? (index + 1) % tabs.length
          : event.key === "ArrowLeft"
            ? (index + tabs.length - 1) % tabs.length
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? tabs.length - 1
                : -1;
      if (next >= 0) {
        event.preventDefault();
        select(tabs[next]!, true);
      }
    });
  }
  latest.addEventListener("click", showLatest);
  list.addEventListener("scroll", () => {
    if (list.scrollHeight - list.clientHeight - list.scrollTop < 12) {
      unseen = 0;
      latest.hidden = true;
    }
  });
  return {
    render(state: LocalSnapshot) {
      const reports = state.battle.reports;
      const nextSignature = JSON.stringify(reports);
      if (signature === nextSignature) return;
      const initial = signature === "";
      signature = nextSignature;
      const nearBottom =
        list.scrollHeight - list.clientHeight - list.scrollTop < 12;
      const oldTop = list.scrollTop;
      const first = Array.from(list.children).find((item) => {
        const row = item as HTMLElement;
        return row.offsetTop + row.offsetHeight > list.scrollTop;
      }) as HTMLElement | undefined;
      const anchorId = first?.dataset["reportId"];
      const anchorTop = first?.offsetTop ?? 0;
      const added = reports.filter((r) => !previousIds.has(r.id)).length;
      previousIds = new Set(reports.map((r) => r.id));
      const fragment = document.createDocumentFragment();
      for (const report of reports) {
        const item = document.createElement("li");
        item.dataset["reportId"] = String(report.id);
        item.dataset["kind"] = report.kind;
        item.textContent = describeBattleReport(report);
        fragment.append(item);
      }
      list.replaceChildren(fragment);
      empty.hidden = reports.length > 0;
      list.hidden = reports.length === 0;
      if (initial || (active === "system" && nearBottom)) showLatest();
      else {
        // Preserve the reading position while the bounded journal receives new results.
        const anchor = anchorId
          ? list.querySelector<HTMLElement>(`[data-report-id="${anchorId}"]`)
          : null;
        list.scrollTop = Math.max(
          0,
          oldTop + (anchor ? anchor.offsetTop - anchorTop : 0),
        );
        unseen += added;
        latest.hidden = unseen === 0;
        latest.textContent = `${unseen} nova(s) · Ver recentes`;
      }
    },
  };
}
