# R39G — THORA EDGE STAGING

Build ID: `STABLE-RESULT-R39G-20261001A`  
Base: R39F candidate; R39 remains the last locked canonical baseline.  
Status: **CANDIDATE — runtime/visual approval required.**

## Approved scope implemented
- Flipped Thora horizontally so she looks right, into the Result card and quote.
- Repositioned the cutout to sit farther left, partially outside the Result/quote card edge.
- Kept the existing rise/pop + settle + subtle idle animation from R39F.
- Reserved quote text space so the character can overlap the card edge without obscuring the quote.
- Kept the character clear of the rank chips, especially `#1 today`.

## Protected unchanged
- Jumping and Fastest Lap completion gating from R39E.
- Direct `Leaderboard / Result` DEV QA and its non-persistent test state.
- Result/Standings runtime data, PB, medals, penalties, ghost and save behavior.
- Horse movement, jump physics, Stable cameras/collision/grounding and all other locked gameplay.

## Runtime test
1. DEV / TEST → `Leaderboard / Result`.
2. Confirm Thora faces right toward the quote.
3. Confirm she reads as sitting/popping from the outer left edge of the Result card.
4. Confirm `#1 today`, `#1 this week` and `#1 all time` are fully readable and untouched.
5. Confirm pop/settle/idle motion still works.
6. Toggle Jumping ↔ Fastest Lap and Result ↔ Standings.
