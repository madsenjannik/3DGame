# THE GROWING WILDS — HANDOVER R39E

Date: 2026-10-01
Last locked canonical base: `THE-GROWING-WILDS-v0.3.82-STABLE-RESULT-R39-LOCKED.zip`
Active candidate: `THE-GROWING-WILDS-v0.3.87-STABLE-RESULT-R39E-CANDIDATE.zip`
Build ID: `STABLE-RESULT-R39E-20261001A`

## Governance
- Never build/change without Jannik's explicit GO.
- Do not use the Thronemarch skill/workflow.
- Runtime/visual user approval outranks static analysis.
- Locked gameplay/camera/visual systems remain protected outside the approved scope.

## R39E scope
- Result overlay is now hard-gated to completed/DQ race state; the R39D desktop CSS leak affected both Jumping and Fastest Lap and is fixed for both.
- Thora portrait gains subtle motion/effects while retaining the R39D visual.
- DEV `Stable / Inside QA` entry is replaced by `Leaderboard / Result`, with direct non-persistent Jumping/Fastest Lap Result + Standings preview.

## Required runtime validation before lock
1. DEV / TEST → Leaderboard / Result.
2. Check Jumping Result + Standings.
3. Check Fastest Lap Result + Standings.
4. Confirm Thora motion/effects feel alive, not distracting.
5. Real Jumping: Result must not appear during run; it appears only after finish/DQ.
6. Real Fastest Lap: same lifecycle test.
7. Ride again / Done / Standings close still work in normal gameplay.

If approved: lock R39E. If not approved: screenshot/runtime delta first; no new build without GO.
