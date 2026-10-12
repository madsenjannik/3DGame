# R36 — TECHNICAL STARTUP / INPUT STABILITY PASS

Status: CANDIDATE
Build ID: TECH-STARTUP-R36-20260930A
Base: R35B WORLD MAP FEATHERED EDGE LOCKED

## Scope
This pass implements only low-risk items already identified by the external technical review.

### 1. Startup load scheduling
The existing runtime waited for several independent GLB systems one after another. R36 keeps the exact same pre-game readiness gate, but overlaps independent asset I/O in two controlled waves:

- world-critical: Home/MoveIn shed + North Stable + selected character
- progression/world systems: Golden Seed + Meaningful Choice + Greenhouse + Orangery
- World Map readiness overlaps Fishing startup

Nothing is lazy-loaded in R36. No system is allowed to become usable before its previous R35B ready point. This is scheduling only, not a gameplay redesign.

### 2. Startup metrics
`window.__TGW_STARTUP_METRICS__` is populated after Game ready.
Open the game with `?perf=1` to also print the timings and slowest GLB resource requests to the browser console.

Recorded milestones:
- worldConstructedMs
- worldCriticalReadyMs
- progressionSystemsReadyMs
- uiAndFishingReadyMs
- gameReadyMs
- slowest GLB resource timings where supported by the browser

This gives real cold/warm startup measurements before any later lazy-loading decision.

### 3. E / Enter autorepeat
Held E/Enter can no longer retrigger action input through browser keyboard autorepeat. One physical key press creates one intended action.

Browser blur clearing was already present in R35B and remains unchanged.

## Explicitly not included
- no SaveGame refactor
- no lazy loading yet
- no asset compression/re-export
- no fixed timestep
- no multiplayer/networking architecture
- no Game.js split
- no visual/gameplay/camera/movement changes

## Required runtime regression
1. Normal start and MoveIn.
2. Walk/movement/camera unchanged.
3. Hold E at an interaction: only one trigger per press.
4. Fishing + Catch Log.
5. Boat Cabin -> Waterfall -> Cabin.
6. Stable/riding/jumping.
7. Private Garden + Golden Seed + Greenhouse.
8. Orangery.
9. World Map/minimap.
10. `?perf=1`: confirm startup metrics appear in console.
