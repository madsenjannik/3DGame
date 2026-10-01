# R32B — SUMMER WATER VEGETATION FIX

Build ID: `SUMMER-WATER-VEG-R32B-20260929A`

## Root cause
R32 loaded `vegetation_10_summer.glb`, but its catalog lookup only inspected `gltf.scene.children`. The supplied GLB wraps the ten `Plant_XX_*` catalog nodes under an outer scene group, so no source plants were discovered and zero vegetation instances were created.

## Fix
The lookup now traverses the full GLB hierarchy and extracts the same ten authored plant entries. Placement logic remains the R32 visual-only design around Lake, Pond, Stream and Waterfall.

## Protected systems
No changes to R31 Boat → Waterfall navigation, player collision, Fishing, camera, movement, Stable/riding/Jumping, R24 MoveIn, save/progression or season state.

## Runtime test
Confirm visible Summer vegetation at Lake, Pond, Stream and Waterfall; then verify the R31 boat corridor remains open to the Waterfall and back.
