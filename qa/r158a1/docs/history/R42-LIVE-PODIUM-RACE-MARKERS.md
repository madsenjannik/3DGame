# THE GROWING WILDS v0.3.92 — R42 LIVE PODIUM + RACE MARKERS CANDIDATE

Build ID: `STABLE-R42-20261001A`
Date: 2026-10-01
Status: **CANDIDATE — PC runtime/visual approval required before lock**
Base: `THE-GROWING-WILDS-v0.3.91-STABLE-RESULT-R41-CLAUDE-CHOREOGRAPHY-CANDIDATE` (R39 remains last locked canonical baseline)

## R42 scope
- Keeps the approved R41 Claude Result choreography unchanged.
- Physical podium now follows the real live **Today leaderboard** rather than medal class: only the actual #1/#2/#3 occupy podium slots. A player ranked #4 or lower is staged off-podium even if the current run earns a medal.
- Medal class remains performance-based and independent from leaderboard placement.
- DEV Gold/Silver/Bronze controls remain for animation QA; they no longer hard-code the player's podium rank.
- Adds a real `Done` action to the chalkboard/Standings bottom action bar.
- Replaces the old race-start setup-popup path with two visible world-space glowing race circles: Fastest Lap and Jumping.
- While mounted and close to a race circle, the existing interaction prompt becomes `Start Fastest lap` / `Start Jumping` and starts the existing race logic directly.
- Race circles pulse subtly, brighten on approach, and hide while a timed race/result is active.
- Race routes, checkpoints, penalties, timing, ghost, save schema, economy, riding physics and normal camera logic are unchanged.

## Runtime validation
1. DEV / TEST → Leaderboard / Result: confirm R41 medal choreography is unchanged.
2. Use a result whose Today rank is #4 or lower: player must be off the physical podium; real top three remain on #1/#2/#3.
3. Use a result ranked #1/#2/#3: player must occupy that actual live podium slot regardless of medal class.
4. Open Standings: Today / This week / All time remain clickable, and `Done` exits the result flow.
5. In normal Stable world, confirm glowing Fastest Lap and Jumping circles are visible after Stable access is open.
6. Ride into each circle: only at close proximity should `Start Fastest lap` / `Start Jumping` appear; pressing E starts the existing race directly with no setup card.
7. Complete one real Jumping and one real Fastest Lap and verify Result still appears only after completion/DQ.
