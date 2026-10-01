# R32D LOCK — Summer Water Vegetation

Build ID: `SUMMER-WATER-VEG-R32D-20260930A`

Status: **LOCKED — Jannik runtime approval received 2026-09-30**

## Locked scope
- Summer water vegetation is integrated across Lake, Pond, Stream and Waterfall.
- Correct GLB hierarchy extraction is retained from R32B.
- Tall shoreline vegetation uses clustered deterministic placement with bridge/Cabin/Boat-corridor clearance from R32C.
- Rooted vegetation is grounded from transformed bounds with controlled embed depth.
- Lily and duckweed remain at the water surface.
- Pondweed is rooted to the water bed.
- Vegetation remains visual-only and adds no collision.

## Protected behavior preserved
- R31 Boat → Waterfall navigation remains unchanged and can travel Cabin → Lake → Stream → Waterfall → return → dock.
- Fishing, player movement, shared-world camera, Stable/riding/Jumping, R24 MoveIn, save/progression and season-state logic remain unchanged.
- Spring / Autumn / Winter variants remain deferred.

## Lock rule
No locked R32D vegetation placement/grounding behavior may change without a new explicit GO for that exact scope. Future builds branch from this locked package unless Jannik explicitly selects another base.
