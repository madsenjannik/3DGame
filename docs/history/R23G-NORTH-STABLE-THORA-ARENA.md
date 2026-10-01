# R23G — North Stable Thora parity + arena pass

Base: `DYM-GAME-v0.3.57-NORTH-STABLE-SIGURD-PARITY-R23F-CANDIDATE.zip`
Status: **CANDIDATE — human PC/iPhone visual/runtime approval required**

## Authorized scope
1. Make Thora conversation use the Sigurd interaction/camera contract more faithfully.
2. Restrict Thora interaction to Claude Stable-v2's canonical talk point/radius.
3. Use Claude Stable-v2's full Thora question/answer set now rather than a reduced temporary dialogue.
4. Preserve the approved passive `STABLE CLOSED / Talk to Thora` gate status.
5. Add collision to the interior Stable fences/gates where the visible geometry blocks traversal.
6. Enlarge the central jumping arena and spread the jumps within the existing Stable compound.

## Thora
- Canonical source positions retained: Thora `(3.3,-14.3)`, talk point `(3.3,-16.3)`.
- Talk prompt now appears only within **1.6 m** of the canonical talk point, matching Claude Stable-v2.
- Conversation shot is straight-on to the tack-room hatch/counter, with the player hidden during the settled conversation state.
- A final visibility ownership pass runs after Fishing's world update so Fishing cannot accidentally re-show the player during Thora's shot.
- Shared Sigurd UI primitives remain the source of truth: `fishing-bubble`, `fishing-dialog`, `fishing-opt`, Close/Esc pattern.

## Claude Thora dialogue now present
- `Can I ride the horse?`
- `Any riding tips?` after access
- `Leaderboards`
- `Wardrobe`
- `What do you sell?`
- `See you`
- Original opening/reopen lines, five riding tips, and original branch responses are retained.
- Current pre-quest behavior uses Claude's `Can I ride the horse?` approval to open the Stable doors for testing/access. The planned trust/quest gate can replace this approval condition later without rebuilding the dialogue UI.
- Riding/race/leaderboard/cosmetic systems themselves remain deferred.

## Arena
The Stable visual is now built from the supplied Claude `stable2.js` source at runtime so the arena can be enlarged without scaling the entire Stable.
- Previous arena: 18 x 12 m (`x=-9..9`, `z=2..14`).
- R23G arena: **23 x 15.5 m** (`x=-11.5..11.5`, `z=1..16.5`).
- South gate widened from 3.2 m to 4.4 m.
- Jump 1: `(-6.8, 5.8)`.
- Jump 2: `(0, 13.0)`.
- Jump 3: `(6.8, 5.8)`.
- Outer oval track, Stable building and overall North Stable placement remain unchanged.

## Collision
- Stable building wings remain solid; central tunnel remains the intended entry.
- Outer and inner oval rails collide while retaining authored openings.
- Enlarged arena perimeter now collides on all fence runs except the south gate.
- Jump standards have physical collision.
- Closed tunnel doors remain the access blocker until Thora grants access.

## Preserved / out of scope
- North Stable world placement and approach terrain/path.
- Horses remain ambient only; no mounting/riding physics yet.
- No timed races, ghost system, leaderboard data, medals or cosmetics yet.
- No quest implementation yet; the future Thora trust quest remains deferred.
- DEV menu unchanged.
- Fishing/Sigurd special cameras and gameplay are not intentionally changed.
