# R23A North Stable Pass 1 candidate

Base: locked R22B DEV-menu baseline. R22B was copied; it was not edited in place.

Implemented scope:
- North Stable world destination at approximately (70, -155), rotated 180 degrees.
- Stable terrain pad blended into shared terrain; exported circular grass plate hidden.
- New winding world path branch approaches the stable from the existing northeast/north route.
- Stable v2 building, arena, track, jumps and authored tunnel doors.
- Tidsel-Thora outside the locked tunnel; Birk, Kul and Solvej inside at the hitching rail.
- Stable wings, track rails and locked tunnel door have traversal collision.
- Pass 1 access remains locked in normal gameplay. Thora and gate interactions are placeholders only; no quest/unlock/riding/race systems are implemented.
- DEV menu adds Stable / Thora (locked outside) and Stable / Inside (QA forced-open).
- START-IPHONE.py supports `stable` and `stableinside`.

Deferred exactly as scoped:
- Thora quest and persistent stableAccess progression.
- Mount/dismount and riding physics.
- Timed rides, jumping competition, leaderboards/ghosts.
- Cosmetics, bike unlock and tack shop.
