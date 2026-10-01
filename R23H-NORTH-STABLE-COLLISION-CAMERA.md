# R23H — North Stable collision + camera pass

Base: R23G candidate.

Scope implemented:
- Stable tunnel participates in the locked third-person camera occlusion/cutaway system.
- Stable roof tile assemblies fade only when critical camera clearance is too short.
- South tunnel threshold receives a single cobble cap to mask the terrain/floor seam.
- Static horse colliders: Birk, Kul, Solvej.
- Hitching rail collision.
- Arena fence collision preserved with authored gate opening.
- Jump standards and jump bars collide on foot.
- Reachable stable props/workstations collide (trough, hay rack, east workbench/racks/posts).
- Tunnel door colliders rotate with Doors_Open; open leaves remain physical while the centre passage stays traversable.

Protected / unchanged:
- Thora dialogue and R23G interaction flow.
- Stable access wording/status.
- Arena dimensions/layout.
- Riding/race/quest systems remain deferred.
- Fishing-owned special cameras remain protected.
