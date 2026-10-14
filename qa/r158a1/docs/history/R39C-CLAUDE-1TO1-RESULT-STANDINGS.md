# R39C — Claude 1:1 Result / Standings

Status: CANDIDATE
Date: 2026-09-30
Build ID: `STABLE-RESULT-R39C-20260930A`

## Visual source of truth
`Result leaderboard.zip` → `R39 Ride Result/Ride Result.dc.html`, Variant A, mobile.

## Why R39C exists
R39A/R39B interpreted the supplied Claude design rather than transplanting it faithfully. Runtime screenshots showed incorrect proportions, typography, standings geometry and finish-camera composition. R39C treats Claude markup/CSS values as the visual specification.

## Changes
- Claude mobile Result card: width `min(calc(100% - 28px),400px)`, 28px radius, 68/20/18 padding, 14px rhythm.
- Claude 88px circular medal inside a 96×108 medal stage with ribbon tails.
- Claude 76px result time and exact rank-chip / Thora / action hierarchy.
- Claude mobile Standings: full-width, bottom anchored, 80% height, 30px top corners, drag handle, 18px horizontal padding.
- Tabs explicitly own their colors to prevent legacy link/button blue leakage.
- Claude scene label restored.
- Manrope + JetBrains Mono request restored in `game.html`.
- Finish camera on portrait is pulled back and target lowered to frame mount + rider.

## Protected runtime
No changes to race timing, penalties, PB calculation, medal thresholds, ghost data, leaderboard data generation, riding physics, course logic, save schema, Fishing, Boat, World Map or general movement.

## Future DEV note
A direct DEV-menu shortcut to Result / Standings is desirable for iteration, but is deliberately not part of R39C.
