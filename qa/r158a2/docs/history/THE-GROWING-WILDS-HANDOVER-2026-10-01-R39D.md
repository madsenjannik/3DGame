# THE GROWING WILDS — HANDOVER R39D

Date: 2026-10-01
Last locked canonical base: `THE-GROWING-WILDS-v0.3.82-STABLE-RESULT-R39-LOCKED.zip`
Active candidate: `THE-GROWING-WILDS-v0.3.86-STABLE-RESULT-R39D-POLISH-CANDIDATE.zip`
Build ID: `STABLE-RESULT-R39D-20261001A`

## Governance
- Never build/change without Jannik's explicit GO.
- Do not use the Thronemarch skill/workflow for this project.
- Runtime/visual user approval outranks static analysis.
- Locked gameplay/camera/visual systems stay untouched unless the approved scope explicitly requires them.

## R39D visual scope
1. Mobile Standings: rider names are left-aligned and spaced like the supplied Claude Design reference; rank and time remain in their own columns.
2. Result quote: plain T badge replaced by a portrait derived from the real Thora model already shipped in `mount_assets.glb`.
3. Desktop Result: larger premium hero card positioned left so the 3D finish remains readable.
4. Desktop Standings: larger right-side sheet, stronger podium hierarchy, cleaner rows and stable-board accent.
5. TGW live result/leaderboard data remains authoritative.

## Protected unchanged
Race rules/timing, penalties, medals, PB, save/progression/economy, ghost data, riding physics, jump behavior, horse grounding, Stable tunnel/race gameplay cameras, Fishing, Boat, SharedLandscape, MoveIn and all unrelated locked systems.

## Runtime test required
1. iPhone Jumping result: inspect Thora portrait, card fit and buttons.
2. iPhone Standings: compare rider-name alignment directly to Claude reference image 4.
3. Desktop Result: confirm hero composition feels intentional and horse+rider remain readable.
4. Desktop Standings: confirm podium/list hierarchy and panel scale.
5. Test Today / This week / All time, Ride again, Done and close.
6. Repeat once with a Jumping penalty state.

If approved: lock R39D by metadata/docs/checksum only; tested runtime files remain byte-identical. If not approved: screenshot delta first, then new explicit GO before any further build.
