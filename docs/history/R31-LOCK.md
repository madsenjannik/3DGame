# THE GROWING WILDS — R31 LOCK RECEIPT

Build ID: `BOAT-WATERFALL-R31-20260929A`
Canonical locked package: `THE-GROWING-WILDS-v0.3.74-BOAT-WATERFALL-DEV-CLEANUP-R31-LOCKED.zip`
Lock date: 2026-09-29

Jannik runtime-tested R31, confirmed that Boat → Waterfall and the DEV-menu cleanup work, and explicitly requested **LÅS**.

## Locked R31 scope
- Existing boat can navigate the authored lake → stream → waterfall-basin route.
- Ordinary player shoreline/water collision remains separate and unchanged.
- Existing boat controls, Boat_Idle, camera, docking and fishing-from-boat behavior are preserved.
- Waterfall rocks remain boat-only navigation blockers without visual changes.
- `Waterfall reached` remains a non-persistent once-per-trip arrival toast.
- DEV menu duplicate `Home / Main Start` remains removed.
- Canonical DEV labels remain `Normal Game Start`, `Cabin / Fishing / Boat`, and `Stable / Inside QA` where applicable.
- No boat economy/reward/save progression is introduced by R31.

## Protected systems
R23O/R24 locked Stable, riding, Jumping, movement, camera, MoveIn, home collision and related gameplay remain protected.

## Lock rule
This lock operation changes documentation/checksum/package metadata only. Runtime files are byte-identical to the approved R31 candidate. Future work branches from a copy of this locked R31 package unless Jannik explicitly approves another base.
