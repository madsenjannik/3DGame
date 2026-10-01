# R23I - North Stable riding and timed rides

Candidate version: v0.3.60
Build id: `NORTH-STABLE-R23I-20260929A`

## Scope implemented
- Claude Stable-v2 tunnel-camera behavior ported into shared-world traversal.
- Stable-owned tunnel camera suppresses Stable occlusion/cutaway while active.
- Kul, Birk and Solvej are mountable after Stable access is open.
- Horse movement: forward/back, steering, Walk/Trot/Gallop animation selection, jump, refusal and dismount.
- Timed Ride - Fastest Lap.
- Timed Ride - Jumping.
- Race intro/countdown, timer, checkpoints/jump order, splits, penalties, disqualification and result panel.
- Today / This week / All time leaderboard data.
- Daily rival/ghost logic and best local ghost recording.
- Gold/Silver/Bronze medal thresholds from Claude race data.
- Medal-based horse saddle-blanket unlocks and local persistence.
- Thora Leaderboards and Wardrobe panels use the integrated minigame state.
- R23H collisions retained: horses, hitch rail, arena fence, jumps/poles, reachable workstations/props and animated entrance doors.

## Deliberately deferred
- Thora trust quest / carrot gate. Current temporary access remains `Can I ride the horse?` so the riding loop can be tested now.
- Bike riding / bike fastest-lap discipline and bike-frame cosmetics.
- Network/server leaderboard persistence. Current boards are local prototype data matching Claude's Stable-v2 model.

## DEV routes
- `Stable / Thora`: deterministic locked Stable, regardless of saved access progress.
- `Stable / Inside`: deterministic open Stable for direct horse/minigame QA.
- DEV routing does not erase stored times, medals or cosmetic rewards.

## Validation performed before packaging
- All JavaScript files pass `node --check`.
- START-PC.py and START-IPHONE.py pass Python bytecode compilation.
- All relative JavaScript import targets resolve on disk.
- Stable mount GLB contains the three horse nodes, Thora node, 12 required horse locomotion clips and Thora Idle/Talk clips.
- DOM IDs required by the Stable interaction/race system exist in game.html.
- Final manifest and ZIP integrity are verified after packaging.

## Human visual/runtime checks requested
1. Tunnel camera entering and leaving from both directions, on foot and mounted.
2. Mount/dismount all three horses and verify collisions remain physical.
3. Walk/Trot/Gallop transitions and jumping.
4. Fastest Lap start, three checkpoints, finish and result screen.
5. Jumping 1 -> 2 -> 3, pole penalties, refusal and wrong-order DQ.
6. Repeat a race to confirm ghost and leaderboard behavior.
7. Thora -> Leaderboards and Wardrobe after a completed run.
