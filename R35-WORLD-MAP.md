# R35 — WORLD MAP / MINIMAP

Status: CANDIDATE — requires Jannik runtime/visual approval.
Base: R34B MOBILE-TEST LOCKED (which itself still requires final mobile runtime approval).

Scope implemented:
- Claude Design worldmap integrated nearly 1:1.
- Live SharedLandscape is the source of truth for terrain, water, paths and landmark coordinates.
- Rotating circular minimap in the top-right during normal shared-world traversal.
- Tap minimap / M opens overview map.
- Desktop: fullscreen map and movement is paused while open.
- Mobile: transparent overlay; R34B floating movement remains available on the left side and is visually above the overlay.
- Right-side map gestures pan/zoom the map while open; normal camera-look is suppressed while the map overlay is open.
- Real landmarks only. No fake quests, enemies, bosses, fast travel, waypoint system, multiplayer markers or fog-of-war progression.
- Private Garden, Fishing, Stable/special modes, MoveIn/portal and modal choices hide/close the map.

Protected systems intentionally unchanged:
- R33J Fishing runtime.
- Boat -> Waterfall navigation/collision.
- Summer water vegetation.
- Stable/riding/Jumping.
- Shared-world collision and normal camera behavior when map is closed.
- MoveIn/Home portal.
- R34B mobile gesture semantics except the map-open interaction boundary described above.
