# R39F — THORA CUTOUT POP-UP POLISH

Build ID: `STABLE-RESULT-R39F-20261001A`  
Base: R39E candidate; R39 remains the last locked canonical baseline.  
Status: **CANDIDATE — runtime/visual approval required.**

## Approved scope implemented
- Removed the circular/badge treatment behind Thora in the Result quote card.
- Removed R39E portrait glow, sheen and ambient particles so only the character cutout remains.
- Created `assets/ui/thora-result-cutout.png` by cropping transparent dead space from the existing in-game-derived Thora portrait; no new character design was introduced.
- Thora is larger and visually emerges from the quote box rather than sitting inside an avatar circle.
- Intro motion: rise from inside/below the box → small overshoot → settle.
- After settling, only a very subtle idle bob remains.
- Reduced-motion users receive the static final state.

## Protected unchanged
- R39E completion-only Result lifecycle for both Jumping and Fastest Lap.
- Direct `Leaderboard / Result` DEV QA and non-persistent test state.
- Result/Standings data, layout hierarchy, race/penalty/medal/PB/ghost/save logic.
- Horse movement, jumping, cameras, collision, grounding and all other locked gameplay.

## Runtime test
1. DEV / TEST → `Leaderboard / Result`.
2. Confirm there is **no circle, plate, ring, glow or particle decoration behind Thora**.
3. On Result reveal, Thora should visibly rise/pop out of the left side of the quote box, slightly overshoot and settle.
4. Confirm the character is large enough to read but does not obscure the quote or rank chips.
5. Toggle Jumping ↔ Fastest Lap and Result ↔ Standings to confirm R39E DEV QA still works.
6. One real Jumping and one real Fastest Lap should still keep Result hidden until completion/DQ.
