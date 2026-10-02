# The Growing Wilds — working rules for Claude

1. **Never build without Jannik's explicit `GO`.** Before GO: inspect, analyze, find the root cause and define the exact scope only.
2. **Every build updates `docs/HANDOVER.md` and `docs/MASTER-PROJECT-DOCUMENT.md` in the same commit** (current version, build table, status, the changed system). A build without updated docs is not finished.
3. Read `docs/HANDOVER.md` first, then `docs/MASTER-PROJECT-DOCUMENT.md` (rules §1, locks, backlog, §30 wilds loop).
4. Locked systems stay untouched without a GO for that exact scope. **Never change the three greenhouse levels.** Building happens in the private garden, not the shared world.
5. Bump `version.js` on every build; run `node tests/smoke.mjs` (must be all PASS) and check the change in a browser (touch + desktop) before pushing — the branch is the live GitHub Pages test site.
6. New GLBs load through `js/core/AssetManager.js`; new interactions offer through `js/core/InteractionResolver.js`; optional systems must fail soft (see MASTER §31).
