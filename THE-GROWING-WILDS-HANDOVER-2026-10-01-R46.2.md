# THE GROWING WILDS — HANDOVER — 2026-10-01 — R46.2 CANDIDATE

## Start here
Current test package: **`THE-GROWING-WILDS-v0.4.00-R46.2-CLAUDE-1TO1-START-CANDIDATE.zip`**  
Build ID: **`ENTRY-R46.2-20261001D`**

**Important:** R45 remains the locked gameplay baseline underneath this candidate. R46.2 changes only the entry presentation / branding layer and is not locked yet.

## R46.2 review target
Test the sequence exactly in this order:
1. short Splash: `The world is growing...` with sequential dots and moving leaf/particle pass;
2. transition into live Start screen;
3. live Spire scene contains Spire shed, Spire character, squirrel, hare, butterfly, garden beds, fence and foreground composition;
4. logo choreography follows Claude direction: burst-in/spin, GROWING drop, WILDS pop, sprout/sway, bob;
5. tagline and START animate in; START breathes and receives shine pass;
6. START triggers Spire Hop and UI leave transition;
7. selector opens and normal character -> game flow continues.

## Canonical brand rule
- Formal title: **The Growing Wilds**
- Visual logo: **GROWING WILDS!**
- Flagship Start character: **Spire**

## Source-of-truth note
`Splash v2.dc.html` is the authored visual/motion reference. It explicitly defines the wind animation plus burst/drop/pop/sprout/sway/bob/button/shine choreography. Its scene iframe points to `Character Sheds.html`, and the export references `hero3d.js`; those helper files were not supplied, so the live scene has been rebuilt locally with existing project assets while retaining Claude's UI timing and choreography.

## Approval status
**OPEN.** Await explicit visual approval before locking R46.2 or making it the new canonical locked package.

---

## R45 locked baseline carried forward
# THE GROWING WILDS — HANDOVER R45 LOCKED

**Date:** 2026-10-01  
**Canonical package:** `THE-GROWING-WILDS-v0.3.96-R45-HOLO-INDICATOR-LOCKED.zip`  
**Master document:** `THE-GROWING-WILDS-MASTER-PROJECT-DOCUMENT-2026-10-01.md`  
**Status:** LOCKED

## Start here

Use **R45 LOCKED** as the source/base for all new work. Never edit an older candidate or R39 directly unless Jannik explicitly requests it.

**Never build without Jannik's explicit `GO`.** Before GO: inspect, analyze, identify root cause and define the exact scope only.

For implementation requests, deliver **working code/builds, not visual mockups**, unless Jannik explicitly asks for a mockup. When a Claude coded prototype is supplied as source of truth, port/integrate the actual code behavior rather than recreating it from screenshots.

## What is current / locked now

### Stable Result / Podium / Standings
- Claude coded Result/Podium/Chalkboard prototype is the presentation direction.
- TGW remains source of truth for real time, penalties, PB, medal, ranks, ghost, leaderboard and save data.
- Result appears only after completed/DQ state, never during an active race.
- Medal/result choreography includes the approved timed reveal/animation sequence.
- Physical podium is live leaderboard driven: actual Today #1/#2/#3 occupy 1/2/3. If the player is #4+, the player is not on the podium.
- Medal class is independent from leaderboard position.
- Standings tabs `Today`, `This week`, `All time` are interactive.
- Standings has `Done` plus `Race the ghost` where available.
- `DEV / TEST -> Leaderboard / Result` remains for QA and must use non-persistent test data.

### RIDE / JUMP / FISH world indicators — R45 LOCK
- The old custom rings/beam stack is replaced by the supplied Claude `holo-indicator.js` component.
- Visual: gold vertical holo cylinder + scanline/breathing effect + base ring + ground halo.
- Labels are **clean floating text only**: `RIDE`, `JUMP`, `FISH`.
- **No label container. No text stroke.**
- Labels retain subtle floating/wave motion.
- `RIDE` is at the **actual Fastest Lap START**.
- `JUMP` stays at the approved Jumping start.
- `FISH` stays at the approved cabin bridge fishing spot.
- The visual marker and its interaction trigger must remain spatially aligned.
- RIDE/JUMP interaction remains available from world mode; mounted flow continues to work. FISH uses the normal fishing progression/eligibility rules.

## Protected carried-forward systems

Do not change accidentally:
- movement / normal camera / collision;
- Stable horse/riding/jumping routes, checkpoints, penalties and ghost logic;
- Thora interaction/cameras and R38A Tack Shop/Ride Setup;
- R33J Fishing loop/presentation and Sigurd flow;
- R31 Boat -> Waterfall foundation;
- R32D Summer water vegetation;
- R35B world map/minimap;
- R37 HUD/minimap layout;
- R36 startup/input stability;
- R24 MoveIn/home behavior;
- Golden Seed and other previously locked world systems.

## Still pending / open

- **R34B mobile gesture controls:** MOBILE-TEST LOCKED, still awaiting final real-device approval.
- No next content build has been selected yet.
- Preferred future content options: Boat rent/buy economy -> Lookout Scout Mode -> Resource/Build/Crafting -> Snail/basic enemy framework -> Mole -> Wood Giant -> Lake Run -> Thora real unlock quest -> social/multiplayer later.
- SaveGame unification and broader architecture work stay deferred until there is a concrete need and active gameplay bugs are stable.

## Regression rule for next changes

For any new candidate, verify the affected scope plus at minimum:
- world movement/camera/collision;
- Stable RIDE + JUMP entry and completion;
- Result -> Standings -> Done;
- Today / This week / All time;
- live podium behavior for top 3 vs #4+;
- FISH marker + fishing entry;
- desktop + touch/mobile where relevant;
- asset-missing/failure fallback if assets are touched.

## Files to carry into a new chat

1. `THE-GROWING-WILDS-v0.3.96-R45-HOLO-INDICATOR-LOCKED.zip` — canonical code/build base.
2. `THE-GROWING-WILDS-HANDOVER-2026-10-01-R45-LOCKED.md` — immediate continuation state.
3. `THE-GROWING-WILDS-MASTER-PROJECT-DOCUMENT-2026-10-01.md` — durable project rules, history and backlog.

If the project already exposes the locked ZIP and master document in Project files, upload only the handover in the new chat and reference the existing R45 package.

## First line for the next chat

`Fortsæt THE GROWING WILDS fra R45 LOCKED. Brug handover + master som source of truth. Ingen build uden mit GO.`
