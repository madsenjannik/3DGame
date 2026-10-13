# R39E — RESULT LIFECYCLE + THORA MOTION + DEV QA

Build ID: `STABLE-RESULT-R39E-20261001A`
Package: `THE-GROWING-WILDS-v0.3.87-STABLE-RESULT-R39E-CANDIDATE.zip`
Base: R39D candidate; R39 remains the last locked canonical baseline.
Status: **CANDIDATE — runtime approval required.**

## Approved scope implemented
1. Result visibility bug
   - Root cause: R39D desktop presentation set `.stable-result-stage { display:block!important; }`, overriding the base hidden Result state while the race UI itself was active.
   - Because Jumping and Fastest Lap share the same Result stage, the bug applied to both disciplines.
   - Fix: explicit hidden guard unless `.show` is present, plus runtime defensive gating to `mode === race && race.phase === done`.
   - `hideRaceResult()` now also force-closes any Standings sheet/scrim rather than depending on the done-only toggle path.

2. Thora presentation
   - Existing in-game-derived portrait retained.
   - Added subtle float, breathing/parallax scale, glow pulse, sheen pass and restrained ambient particles.
   - Respects `prefers-reduced-motion`.

3. Result / Leaderboard DEV QA
   - Removed the old `Stable / Inside QA` DEV card.
   - Added `Leaderboard / Result`.
   - Opens directly in completed-result state with no riding required.
   - DEV-only toolbar switches Jumping / Fastest Lap and Result / Standings.
   - Test leaderboard state is synthetic and session-memory-only; it never writes to the player's save.

## Runtime test
- DEV / TEST → Leaderboard / Result.
- Switch Jumping ↔ Fastest lap.
- Switch Result ↔ Standings.
- Confirm Thora motion is alive but restrained.
- Then start one real Jumping run and one real Fastest Lap: Result must remain completely absent until completion/DQ.
- On completion, Result and Standings must still work normally.
