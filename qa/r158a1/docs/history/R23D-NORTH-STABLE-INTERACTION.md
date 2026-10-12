# R23D — North Stable interaction + UI semantics

Base: R23C candidate. Scope limited to the user-approved Stable/Thora interaction and presentation fixes.

- Thora remains at the authored Claude Stable v2 tack-room hatch position.
- Thora interaction is now a counter/hatch zone rather than one fragile point.
- `E / touch · Talk to Thora` is shown only when Thora is actually actionable.
- The locked Stable gate no longer exposes a fake action button. Near the locked entrance, a passive world-space status bubble shows `STABLE CLOSED / Talk to Thora`.
- Thora replies in a world-space NPC speech bubble anchored above her instead of using the global toast.
- Stable uses the embedded Claude `Hatch_Open` and `Doors_Open` animation clips rather than replacement hard-coded rotations.
- Stable placement, terrain/path fix, horses, DEV routes, camera, quest, riding, races, leaderboard and cosmetics are otherwise unchanged.
