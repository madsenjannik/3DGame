# THE GROWING WILDS — HANDOVER

Date: 2026-09-30
Current canonical locked working base: `THE-GROWING-WILDS-v0.3.80-HUD-LAYOUT-R37-LOCKED.zip`
Build ID: `HUD-LAYOUT-R37-20260930A`

## Locked recent layers

- R31 — Boat → Waterfall navigation + DEV cleanup — LOCKED
- R32D — Summer water vegetation / grounding — LOCKED
- R33J — Fishing polish + fish fight + catch hero presentation — LOCKED
- R35B — World Map + feathered minimap edge — LOCKED
- R36 — Technical startup/input stability — LOCKED
- R37 — HUD/status placement around minimap — LOCKED
- R34B — Mobile gesture controls — MOBILE-TEST LOCKED, final real-device approval still pending

## R37 locked change

Top-right Golden Seed/material/status boxes now sit left of the minimap on desktop and touch/mobile. The minimap itself and all gameplay are unchanged.

## Technical/performance guardrail

R36 added startup metrics and controlled parallel startup loading. Do not add more load/performance work without profiling first. Use `?perf=1` and `window.__TGW_STARTUP_METRICS__`. SaveGame unification remains a future architecture task, not current scope.

## Preferred next development list

1. Ride Setup premium redesign
2. Result / Leaderboard premium redesign
3. Boat rent/buy economy
4. Lookout Scout Mode
5. Resource / Build / Crafting — next layer
6. Snail integration / reusable basic enemy framework
7. Mole integration
8. Wood Giant integration
9. Lake Run integration
10. Thora quest / real Stable unlock
11. Alliance/team garden permissions
12. Multiplayer/social foundation
13. Season/progression meta-system

Separate pending test: final real-device approval of R34B mobile gesture controls.

## Absolute rule

Never build or change anything without Jannik's explicit GO. Start every future build from a copy of R37 LOCKED and preserve all locked gameplay/camera/movement/visual systems unless that exact scope is explicitly reopened.
