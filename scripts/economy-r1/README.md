# R1 — validation harness

Python **3.12+**, standard library only; Node24 and repository dependencies for exporting published definitions. Nothing here is imported by game, server, launchers or migrations. All currency amounts are **whole Coins/materials**, while current game persistence uses thousandths.

From the repository root:

```sh
npm ci
npm run build:shared
node scripts/economy-r1/export-content.mjs
python scripts/economy-r1/audit.py
python scripts/economy-r1/probes.py
python scripts/economy-r1/model.py
```

`model.py --sample 8 --mature-sample 8 --output /tmp/economy-smoke.json` is a smoke run, **not an acceptance run**. Default cohort sizes:120 accounts/profile for five new-account profiles;300/profile for seven mature stress scenarios. Each runs90days, six build preferences, fixed seeds recorded in results. Mature fixtures do not count as evidence of organic acquisition. A separate holdout changes only hunt material growth exponent from1.3 to0.65.

Read `docs/plans/hunts-builds/r1/VALIDATION_REPORT.md` before interpreting outputs. `approved:false` is an economic rejection, not a failing software test. `criteria.json` was committed before cohort execution; gates must not be loosened to rescue a candidate. Parameter corrections require a new version and fresh seed.

`audit.py`: executable invariants, independent protected-roll Markov crosscheck, finite closed-market transfer/conservation stress and exact first-floor hit/crit combat probe. This does not test server concurrency or general combat survival.

`probes.py`: six-build, no-random-drop access checks, organic progression snapshots and upper-bound scroll-budget sensitivity. These diagnostics are separate from acceptance cohorts.

The main model uses expected hit/critical damage, per-wave enemy timelines and a25%HP reserve. Current enemy HP/ATK/interval/Coins/XP budget are exported from shared definitions. New magic/evasion/AGI equipment assignments are explicit hypothetical scenarios. Equipment lacks future affix/pet/tonic rules. Full-runtime combat, real market demand, Ruby prices and future global boss cannot be inferred from these outputs. These unresolved inputs prevent approval, even if a numerical gate passes.

No successful test in this harness authorizes commercial activation, changes boss design, or applies a migration.
