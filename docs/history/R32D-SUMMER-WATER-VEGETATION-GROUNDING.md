# R32D — Summer Water Vegetation Grounding

Build ID: `SUMMER-WATER-VEG-R32D-20260930A`

## Runtime issue
R32C placement/clustering was approved visually, but some vegetation still appeared to float above the visible world surface.

## Root cause
The Summer catalog contains different plant categories and authored pivots. R32C positioned every clone by its object origin and also treated `pondweed` as a surface-floating plant in the Pond ring. That can leave visible air gaps and makes rooted aquatic vegetation sit at the water plane instead of the bed.

## Fix
- Ground every vegetation clone against its actual transformed `Box3` minimum Y after scale/rotation.
- Rooted plants receive a small geometry-relative embed depth so low-poly terrain interpolation does not expose a gap.
- `lily` and `duckweed` remain water-surface plants.
- `pondweed` (and future `hornwort`) use the actual world/water-bed height rather than the water surface.
- R32C clustering, bridge clearance, Cabin clearance and Boat corridor are preserved.

## Protected systems
No collision, Boat → Waterfall navigation, Fishing, movement, camera, Stable/riding/Jumping, R24 MoveIn, save/progression, visuals outside Summer vegetation, or season-state logic changed.

## Runtime check
1. Inspect Lake/Pond/Stream/Waterfall from several angles: rooted vegetation should visibly contact terrain/bed with no air gap.
2. Verify lily/duckweed remain on the water surface.
3. Verify pondweed is rooted below the surface rather than standing on top of the water.
4. Recheck bridge clearance and Boat → Waterfall route.
