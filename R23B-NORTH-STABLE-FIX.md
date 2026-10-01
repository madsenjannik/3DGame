# R23B — North Stable fidelity fix

Base: R23A candidate. Scope deliberately limited to the two user-reported Stable issues.

- Thora restored to Claude Stable v2 canonical `SPOTS.thora` location `(3.3, -14.3)`, behind the tack-room hatch.
- Stable hatch is held open in world gameplay, matching the Stable v2 play presentation.
- Thora interaction uses canonical exterior `SPOTS.talk` `(3.3, -16.3)`.
- Added a local high-resolution Stable/approach terrain render patch driven by the exact same `terrainHeight()` function used for character grounding. This removes the visible character-above-path mismatch across the north Stable approach transition, especially on touch/iPhone terrain resolution.
- No quest, riding, race, leaderboard, cosmetics, mount logic, DEV menu layout, Stable placement, or camera changes.
