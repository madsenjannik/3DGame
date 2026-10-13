# THE GROWING WILDS — R31 BOAT → WATERFALL + DEV CLEANUP

Build ID: `BOAT-WATERFALL-R31-20260929A`
Canonical locked package: `THE-GROWING-WILDS-v0.3.74-BOAT-WATERFALL-DEV-CLEANUP-R31-LOCKED.zip`
Working base: R29 candidate
Protected systems: R23O / R24 locked gameplay

Authorized by explicit GO on 2026-09-29.

Status: **LOCKED — runtime approval + explicit LÅS received 2026-09-29.**

## Lock receipt
- Boat → Waterfall runtime flow approved by Jannik.
- DEV-menu cleanup approved in runtime.
- R31 becomes the current locked working base.
- R23O/R24 gameplay locks remain protected.
- Locking changes documentation/checksum/package metadata only; runtime implementation is unchanged from the approved candidate.

## Boat → Waterfall
- Preserve the existing boat asset, Boat_Idle ownership rules, rowing controls, fishing-from-boat flow, docking flow and camera behavior.
- Replace the lake-only navigation envelope with a narrow boat-only route over the already-authored lake → stream → waterfall basin.
- Do not alter ordinary player water collision.
- Reuse authored waterfall rocks as boat navigation blockers without moving or changing them.
- Give one lightweight arrival toast when the boat reaches the waterfall basin.
- No economy, persistence or reward is added in R31.

## DEV cleanup
- Remove duplicate `Home / Main Start` entry because it points to the same `index.html` as `Normal Game Start`.
- Keep `Normal Game Start` as canonical normal entry.
- Rename Cabin card to `Cabin / Fishing / Boat`.
- Rename direct inside Stable route to `Stable / Inside QA` so it is not confused with the normal locked Stable entry.
- Remove the redundant `main` command alias from `START-IPHONE.py`; keep `normal`.

## Runtime acceptance
1. From Cabin DEV entry, board the boat and retain existing rowing/steering/click-to-row behavior.
2. Boat can leave the lake and follow the visible stream continuously to the waterfall basin.
3. Boat cannot cross obvious banks or waterfall rocks.
4. `Waterfall reached` appears once on arrival and does not alter save/progression.
5. Return route to lake and existing dock still works.
6. Fishing from boat still works.
7. Character shoreline collision remains unchanged on foot.
8. Stable / Thora and Stable / Inside QA still route to their prior distinct runtime states.
9. R23O/R24 camera, movement, MoveIn, Stable/riding/Jumping behavior show no regression.
