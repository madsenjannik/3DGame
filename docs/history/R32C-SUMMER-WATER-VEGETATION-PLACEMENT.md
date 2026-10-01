# R32C — Summer Water Vegetation Placement Polish

Build ID: `SUMMER-WATER-VEG-R32C-20260930A`

## Root cause / scope
R32B made the Summer vegetation visible, but runtime review showed tall vegetation intersecting the bridge and the shoreline distribution reading too evenly scattered.

## Change
- Added a deterministic bridge-clearance exclusion around the authored bridge footprint.
- Replaced the even tall-plant rings at Lake/Pond with grouped 3–5 plant shoreline clusters.
- Stream-bank tall vegetation now spawns as small clusters farther from the water centreline and skips the bridge clearance.
- Floating lily/duckweed/pondweed placement remains unchanged.
- Waterfall placement remains unchanged except that the global bridge exclusion also applies if ever relevant.

## Protected systems
No collision, Boat → Waterfall navigation, Fishing, movement, camera, Stable/riding/Jumping, R24 MoveIn, save/progression or season logic changed.

## Runtime check
1. Inspect bridge from both banks: no reeds/tall plants through deck or rails.
2. Inspect Lake and Pond: tall plants should read as natural clusters with open gaps between them.
3. Follow Stream to Waterfall and confirm boat route remains visually and physically open.
