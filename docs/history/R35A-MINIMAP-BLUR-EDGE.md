# R35A — MINIMAP BLUR EDGE

Status: CANDIDATE — requires Jannik runtime/visual approval before R35 final lock.
Base: R35 WORLD MAP CANDIDATE.

Scope implemented:
- Replaced the static dark circular minimap border with a feathered radial edge.
- The map remains circular but now visually dissolves into the game world at the perimeter.
- No change to minimap size, position, map projection, player marker, heading, landmarks, overview map, pan/zoom or mobile map behavior.
- Only cache-bust imports outside WorldMap.js were changed so iPhone/desktop load the R35A code instead of a cached R35 module.

Protected systems unchanged:
- R34B mobile gesture semantics.
- R33J Fishing.
- Boat -> Waterfall.
- Stable/riding/Jumping.
- SharedLandscape and world gameplay.
- Third-person camera, collision, MoveIn/Home portal.

HANDOVER NOTE — NEXT UI CORRECTION AFTER R35 LOCK:
- Reposition the HUD/status boxes that currently sit behind/underlap the top-right minimap circle.
- Treat this as a separate layout-only scope after the map itself is locked.
