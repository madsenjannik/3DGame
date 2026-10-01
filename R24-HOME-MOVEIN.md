# R24 — FIRST HOME MOVE-IN

Build ID: `HOME-MOVEIN-R24-20260929C`  
Direct base: `DYM-GAME-v0.3.66-NORTH-STABLE-SHADOW-SPRINT-R23O-CANDIDATE.zip`


## LOCK STATUS — 2026-09-29

**R24 is LOCKED.**

Human runtime approval confirmed:
- first-time MoveIn works as intended;
- subsequent normal starts do not replay MoveIn;
- all character homes use the canonical gate-center spawn;
- normal world-home arrival faces the shed;
- Private Garden → `Back to the world` returns at gate center facing outward;
- structural 4 × 4 m shed collision allows natural approach to the door from both World and Private Garden, including visually extended variants such as Aloe;
- no reported regression to locked Stable/riding/Jumping/Fishing behavior.

Canonical locked package: `DYM-GAME-v0.3.67-HOME-MOVEIN-R24-LOCKED.zip`

Future changes to any R24-locked behavior require a new explicit GO.

## Scope
The nine existing authored character sheds already contain `Idle`, `Door_Open`, `Door_Close` and `MoveIn`. R24 wires the existing `MoveIn` clip into the real normal-game first-spawn flow without replacing or editing the GLBs.

## Runtime contract
1. Normal game entry checks `dym.homeMovedIn.v1.<characterId>`.
2. If unset, the world shed is primed at frame zero of `MoveIn` before the loading layer is removed.
3. Collision/camera proxy data is built from the final authored pose first, so the animation's frame-zero scale does not alter approved home collision.
4. Character movement and home interactions are blocked through the existing portal `busy` contract.
5. The authored `MoveIn` clip runs once using its own GLB duration.
6. A dedicated front-gate cinematic camera frames the complete shed + yard and performs a small heading/dolly move.
7. On clip completion, the MoveIn action is stopped, authored final transforms are restored, `Idle` resumes, and completion is saved per character.
8. Camera blends for 0.58 s back to the existing ThirdPersonCamera, then normal control returns.
9. Private Garden shed never runs MoveIn.
10. Any `dev=1` route bypasses the system and does not mark the character as moved in.
11. All 9 characters use one canonical world-home gate spawn: centered between the two authored front gate posts.
12. Normal home arrival faces inward toward the shed. Private Garden → `Back to the world` returns to the exact same gate-center position but faces outward toward the shared world.
13. DEV → World Home resolves the same canonical gate spawn instead of maintaining a separate hardcoded offset.
14. Player collision around both world and Private Garden shed copies uses the shared authored 4 × 4 m structural footprint; decorative geometry outside that footprint does not block approach to the door. Camera occlusion still uses the full visual shed bounds.

## Locked systems preserved
- R23O horse grounding/shadows and horse/hitch placement.
- Stable tunnel camera.
- Race heading-follow camera.
- Track / normal riding / Jumping W+Shift behavior.
- Jumping 4-jump arena + shared START/FINISH + ghost course.
- Mounted jump-hit/no-hard-stop.
- Fishing/Cabin/Sigurd behavior.
- Existing world/private-garden home placement, doors and collision.

## Human runtime checks
- Clear only the selected character key (example: `localStorage.removeItem('dym.homeMovedIn.v1.succulent')`) and enter through Normal Game Start: MoveIn should run once.
- Refresh/re-enter with the same character: no MoveIn.
- Select a different character without its flag: that shed receives its own first MoveIn.
- DEV → World Home: no MoveIn and no completion flag written.
- After the intro, open/close the shed portal and verify Door_Open / Door_Close / Private Garden behavior remains unchanged.
- Verify Tulip, Daisy, Hyacinth, Cactus, Fern, Succulent, Spire, Swamp and Aloe all spawn visually centered in the same gate opening.
- Enter Private Garden, choose `Back to the world`, and verify the character returns at gate center facing away from the shed.
- On several visually different homes (especially Aloe plus at least two others), approach the shed door from World and Private Garden: the character must reach the real structural facade/door area without hitting an invisible decorative-bounds wall.

## Static verification completed
- All 9 packaged `assets/homes/shed_*.glb` files contain `Door_Open`, `Door_Close`, `Idle`, `MoveIn`.
- The exported `MoveIn` tracks reach 3.100 s in all 9 packaged GLBs; runtime reads `clip.duration` rather than assuming a fixed number.
- Syntax check passed for `PlayerHomePortalSystem.js`, `Game.js` and `main.js`.
- Locked Stable/Fishing/controller/camera runtime files remain byte-identical to R23O.
- Static door-reach check across all 9 packaged sheds passes: at the canonical 4 × 4 m collision facade, every authored door pivot remains well inside the unchanged `DOOR_RADIUS=2.15`; the largest calculated closest-center distance is ~1.12 m (Spire).
- Automated graphical localhost runtime could not be executed in the build environment because Chromium localhost navigation is administratively blocked; human runtime/visual approval remains required as for other candidates.
