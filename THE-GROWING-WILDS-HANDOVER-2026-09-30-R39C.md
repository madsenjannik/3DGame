# THE GROWING WILDS — HANDOVER R39C

Date: 2026-09-30
Last locked canonical base: `THE-GROWING-WILDS-v0.3.82-STABLE-RESULT-R39-LOCKED.zip`
Active candidate: `THE-GROWING-WILDS-v0.3.85-STABLE-RESULT-R39C-CLAUDE-1TO1-CANDIDATE.zip`
Build ID: `STABLE-RESULT-R39C-20260930A`

## Governance
- Never build/change without Jannik's explicit GO.
- Do not use the Thronemarch skill/workflow for this project.
- Runtime/visual user approval outranks static analysis.
- Locked gameplay/camera/visual systems stay untouched unless the approved scope explicitly requires them.

## Locks
- R31 Boat → Waterfall + DEV cleanup — LOCKED
- R32D Summer water vegetation — LOCKED
- R33J Fishing polish + catch presentation — LOCKED
- R34B Mobile gesture controls — MOBILE-TEST LOCKED, not final
- R35B World Map + feathered minimap — LOCKED
- R36 Startup/load + input stability — LOCKED
- R37 HUD/minimap layout — LOCKED
- R38A Ride Setup + Thora 3D Tack Shop — LOCKED
- R39 Stable Result + Standings functional baseline — LOCKED
- R39A/R39B visual attempts — NOT LOCKED
- R39C Claude 1:1 visual pass — CANDIDATE, awaiting iPhone runtime approval

## R39C source of truth
Visual reference: supplied `Result leaderboard.zip`, `Ride Result.dc.html`, Variant A mobile.
TGW runtime remains source of truth for times, PB, penalties, medals, ranks, ghost and leaderboard content. Do not import Claude demo/seeded rivals.

## R39C implementation
- Direct Claude mobile Result geometry/spacing/typography values.
- Direct Claude mobile Standings bottom-sheet geometry (80% height, bottom anchored).
- Manrope/JetBrains Mono font request added to game page.
- Legacy blue tab leakage explicitly blocked.
- Scene label/kicker restored to Claude wording.
- Portrait finish camera pulled back and target lowered to show mount + rider.
- No race logic/save/progression/economy changes.

## Runtime test required
1. Finish Fastest Lap on iPhone: compare Result card directly with approved Claude image 2.
2. Verify horse + rider are both readable behind the card.
3. Open Standings: compare with approved Claude image 3; it must be an 80% bottom sheet, not a centered compact card.
4. Verify Today / This week / All time are neutral TGW/Claude colors, never browser blue.
5. Test Ride again, Done and Standings close.
6. Repeat once with Jumping/penalty state.

If approved: lock R39C by metadata/docs/checksum only; runtime files must remain byte-identical to the tested candidate.
If not approved: analyze screenshot delta first; no build until new GO.

## Future DEV tooling note
Add a direct `Stable Result / Standings` DEV-menu shortcut with realistic, non-persistent test state. User explicitly asked that this be remembered, but said it is not part of the current fix.

## Backlog after Result/Standings is final
1. Boat rent/buy economy
2. Lookout Scout Mode
3. Resource / Build / Crafting
4. Snail / reusable enemy framework
5. Mole integration
6. Wood Giant
7. Lake Run
8. Thora quest / real Stable unlock
9. Alliance/team gardens
10. Multiplayer/social foundation
11. Season/progression meta-system
