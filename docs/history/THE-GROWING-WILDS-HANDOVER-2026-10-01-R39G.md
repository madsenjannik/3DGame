# THE GROWING WILDS — HANDOVER R39G

Date: 2026-10-01  
Last locked canonical base: `THE-GROWING-WILDS-v0.3.82-STABLE-RESULT-R39-LOCKED.zip`  
Active candidate: `THE-GROWING-WILDS-v0.3.89-STABLE-RESULT-R39G-THORA-EDGE-CANDIDATE.zip`  
Build ID: `STABLE-RESULT-R39G-20261001A`

## Governance
- Never build/change without Jannik's explicit GO.
- Runtime/visual approval outranks static analysis.
- Locked systems stay protected outside the approved scope.

## R39G scope
R39G is a visual-only refinement of the R39F Thora cutout treatment. Thora now faces right into the card, is moved farther left so she visually sits on/pops from the outer left edge of the Result presentation, and no longer competes with the `#1 today` rank chip. The R39F pop-up and subtle idle animation remain intact.

R39E remains protected underneath:
- Result hidden during active Jumping and Fastest Lap; only appears after completion/DQ.
- `Leaderboard / Result` DEV QA remains available and non-persistent.

## Required runtime validation before lock
1. DEV / TEST → Leaderboard / Result on PC.
2. Confirm Thora faces right.
3. Confirm edge placement reads naturally and she does not cover any rank chip.
4. Confirm quote remains readable.
5. Confirm pop-up + idle motion still looks correct.
6. Toggle Jumping / Fastest Lap and Result / Standings.

If approved: lock R39G. If not approved: screenshot/runtime delta first; no new build without GO.
