# THE GROWING WILDS — HANDOVER
Date: 2026-09-30

## CURRENT BASELINE
Canonical current package: `THE-GROWING-WILDS-v0.3.78-WORLD-MAP-R35B-FEATHERED-EDGE-LOCKED.zip`
Build ID: `WORLD-MAP-R35B-20260930B`
Status: **R35B LOCKED** after runtime/visual approval and explicit LÅS.

## GOVERNANCE
- Never build/edit/implement without Jannik's explicit `GO`.
- Analyse/scope first, then wait for GO.
- Locked systems must not be changed by unrelated work.
- User runtime/visual approval outranks static analysis.
- Root cause before patch; one isolated scope at a time.

## CURRENT LOCKS / STATUS
- R31 Boat → Waterfall + DEV cleanup: LOCKED.
- R32D Summer water vegetation: LOCKED. Spring/Autumn/Winter parked.
- R33J Fishing polish + visible fish fight + catch result/orientation: LOCKED.
- R34B mobile gesture controls: **MOBILE-TEST LOCKED**, NOT final; pending real-device mobile runtime approval.
- R35B World Map + feathered minimap edge: **LOCKED**.

## R35B LOCKED WORLD MAP
- Claude-inspired map direction, adapted to the actual TGW world.
- SharedLandscape/world coordinates are source of truth.
- Top-right circular minimap.
- Live player position + heading.
- Real TGW landmarks only.
- Tap minimap / `M` opens overview map.
- Pan/zoom + `ME` recenter.
- Desktop fullscreen overview; mobile transparent overlay.
- Minimap edge uses canvas-alpha feathering and visually dissolves into the world.
- No fake quests/enemies/bosses.
- No fast travel, waypoints, multiplayer markers or fog-of-war progression yet.

## NEXT TASK — DO THIS FIRST
**HUD/status box placement around the top-right minimap.**
Current issue: some HUD/status boxes sit behind/underlap the minimap circle.
Required scope: layout-only repositioning so all boxes remain readable and visually intentional around the locked minimap.
Do NOT change minimap size, position, fade, map data, controls, player marker, landmarks or gameplay during this task.
Scope first; wait for Jannik's explicit GO before implementation.

## PROTECTED SYSTEMS
Do not accidentally alter:
- R35B map/minimap visuals or behavior
- R34B mobile gesture implementation while it awaits final mobile testing
- R33J Fishing / Catch presentation
- Boat → Waterfall
- Summer water vegetation
- Stable / riding / jumping
- normal ThirdPersonCamera behavior
- movement/collision unless explicitly scoped
- R24 Home / MoveIn

## BACKLOG AFTER HUD PLACEMENT
- Final real-device mobile test / possible final promotion of R34B.
- Ride Setup premium redesign.
- Result / Leaderboard premium redesign.
- Boat rent/buy economy.
- Lookout Scout Mode.
- Resource / Build / Crafting next layer.
- Snail basic enemy framework/integration.
- Mole integration.
- Wood Giant integration.
- Lake Run integration.
- Thora quest / real Stable unlock deferred.
- Alliance/team garden permissions later.
- Multiplayer/social foundation later.
- Season/progression meta-system later.
- Spring/Autumn/Winter vegetation later; Summer remains current locked season baseline.
