# R23F — Thora / Sigurd interaction parity

Base: R23E candidate.

Scope authorized by user: fix Thora so the interaction behaves like Sigurd, while preserving the approved Stable gate status.

Changes:
- Directly matched Sigurd enter/greet/exit state timing.
- Fixed conversation camera contract through enter/greet/early exit; Stable uses Claude Stable-v2's intended talk composition at the canonical `SPOTS.talk` position.
- Player visibility follows the same Sigurd timing during the conversation shot.
- Thora speech bubble anchors to `thora_Head` rather than a generic bounding-box center.
- Existing shared `fishing-dialog`, `fishing-opt`, `fishing-bubble`, and close-button components remain the UI source of truth.
- `STABLE CLOSED / Talk to Thora` passive gate status unchanged.

Out of scope: quest, stable access unlock, riding, races, leaderboards, cosmetics, world placement, terrain, horses, DEV menu, and camera systems outside the Stable conversation.
