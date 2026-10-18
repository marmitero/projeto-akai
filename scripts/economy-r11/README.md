# R1.1 — pacing and equipment calibration

Python3.12+, standard library. No game/server/launcher imports this model. Run from repository root:

```sh
python scripts/economy-r11/tests.py
python scripts/economy-r11/acceptance.py
python scripts/economy-r11/builds.py
python scripts/economy-r11/refinement.py
python scripts/economy-r11/legacy.py
python scripts/economy-r11/report.py
```

Frozen acceptance criteria precede acceptance cohorts. Pilot seed2026101901; original rejected acceptance seeds78102001/99887101; candidate2 acceptance seed88452001/holdout99337001; candidate3 acceptance99545001/holdout67432001. Original R1 outputs remain intact. Changing parameters requires a fresh candidate/seed, never changing the gates after execution. All non-progressors stay in denominators and censored quantiles.

`calibrate.py` imports the frozen R1 Python harness, not game code. It replaces only independent simulation functions in process. Published content anchors are copied; **tower boss definitions are preserved unchanged**. Current game saves and XP units are not compatible with simulated mastery and are never opened/migrated here.

Mastery grants happen only on completed victories. Per victory: min(complete encounter cycle time, legal epic+9 reference cycle time) × min(1,(equivalent floor / hero level)²). Total credit cannot exceed the economic time actually used. Reference/build eligibility is recalculated at every crossed level, including offline batches. Threshold weights `.05 + 2*(destinationOffset/999)^1.7` sum to2304hours (96days at24h/day). This is a global throughput ceiling, **not a daily login quest or reset requirement**. Trivial low-floor fights and weak gear are inefficient. No purchase/buff/event may bypass that ceiling in a future implementation.

Equipment requires hero level `10*(itemLevel-1)+1`. Max item100 becomes equipable at hero991. Attribute point/currency budgets remain finite. The simulated agent first improves all usable slots to+7, then prioritizes the weapon, then armor; it refuses unprotected risky attempts. If the highest cleared hunt becomes unsafe, return to a lower cleared safe floor instead of declaring the material unavailable. This is one behavioral policy, not the only player strategy.

Content common HP and damage ramp beyond floor100. Final hunts have an encounter timer and rising damage. The tests compare max-level identical point budgets/common+0,rare+0,rare+7,epic+12,legendary+15. A proposed future raid uses this stat-budget envelope only; **no raid/boss mechanics implemented or claimed tested**.

+1–15 chances and all failure consequences remain original. Candidate +16–20 chances32/27/22/17/12%; protected failures still−1. High-level recipes consume more Coins/materials; no commercial shop activation. Hypothetical30event-scrolls/week,10paid/week and3jade/day remain explicitly scenario inputs pending definitive contracts.

Inventory future-item queue is bounded100 with explicit discard of excess candidates, in addition to the R1 stash policy. It is not a final UI/bag design. R1's incomplete affix/pet/crafting/market/migration models remain limitations; a numerical pass cannot mean production approval. Human behavior, RNG combat tails and multiaccount transfers need later validation.

`cohorts.json` is generated intermediate output; `report.py` splits it into reviewable cohort files for publication. Reported dates measure simulated elapsed calendar days, with at most24economic hours/day and8offline. Typical accounts at2online+8offline naturally take longer than the best-case target. All cash/resources obey source-minus-sink accounting. These outputs do not claim a live implementation.
