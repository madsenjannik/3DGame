# THE GROWING WILDS — MASTER PROJECT DOCUMENT

**Status:** Canonical project guardrails + current baseline + backlog  
**Date:** 01/10/2026  
**Purpose:** One durable project document for the active The Growing Wilds build chat. This document consolidates the current handover, locked systems, project rules, deferred work, current priorities, and the external technical review.

> **Important:** This document is not permission to build. It is the source of truth for *how* the project must be handled.

---


## CURRENT WORKING STATUS — 02/10/2026

- **Active baseline: GitHub HEAD** of `madsenjannik/3DGame`, branch `claude/magical-lovelace-nuka97`, live at
  `https://madsenjannik.github.io/3DGame/`. `version.js` holds the version/build label. ZIP packages are no longer produced.
- **v0.8.21 (R67.1, `LANDSCAPE-R67.1-20261003A`) is LOCKED** (Jannik, 03/10/2026) and is now the baseline for all new work: R51–R67.1 incl. boat economy, combat, Wood Giant, Lake Run, specials, minimal phone HUD and landscape-only phones. Changing any of it needs a GO for that exact scope.
- Previous lock: **R50.3 (v0.5.30, `CAMERA-R50.3-20261002A`)** (Jannik's plan, 02/10/2026):
  R46.2 start/splash, offline cleanup, wilds core loop (R47–R49), dev menu (R50), free camera everywhere (R50.3).
- **R45 is historical** — a rollback reference only. New builds do **not** start from R45.
- **In progress: gameplay C (section 31)**: Boat economy (R58) → combat foundation + Mole (R61) → snail (R62) → Wood Giant (R63) → Lake Run (R64) done → Thora next.
- Rules: no build without **GO**; every build updates HANDOVER + MASTER in the same commit (§1.7); never change the three greenhouse levels;
  building happens in the private garden.

## R45 LOCKED STATUS (historical — superseded by R50.3)

- **Current canonical locked working base:** `THE-GROWING-WILDS-v0.3.96-R45-HOLO-INDICATOR-LOCKED.zip`.
- **R45 is the branch/source-of-truth baseline** for all new work unless Jannik explicitly chooses another base.
- R45 inherits the approved current Stable Result / Podium / Standings implementation from the R41/R42 line and locks the final RIDE / JUMP / FISH world-indicator treatment.
- Result/Standings uses the supplied Claude coded prototype as presentation source of truth while **TGW remains source of truth for real race time, penalties, PB, medal, ranks, ghost, leaderboard data and persistence**.
- Physical podium occupancy follows the **live Today leaderboard**: actual #1/#2/#3 occupy the podium; a player outside top 3 is not placed on the podium. Medal award remains independent from leaderboard position.
- Standings supports **Today / This week / All time**, a **Done** action, and `Race the ghost` where available.
- `DEV / TEST -> Leaderboard / Result` remains the direct QA route for Result/Standings without repeatedly completing a race. DEV test state must remain non-persistent.
- The canonical world interaction marker for **RIDE / JUMP / FISH** is Claude's `holo-indicator.js`: gold vertical holo cylinder + base ring/ground halo + clean floating label.
- `RIDE` is anchored to the **actual Fastest Lap START position**; `JUMP` and `FISH` remain at their approved world positions.
- RIDE/JUMP/FISH labels have **no container and no text stroke** and use the approved subtle floating/wave motion.
- Stable race interaction remains available from world mode as well as while mounted; the marker visual and actual interaction location must stay aligned.
- R34B remains **MOBILE-TEST LOCKED** and still needs final real-device mobile approval before it is promoted to final mobile lock.
- No new build is authorized by this document. Every implementation still requires Jannik's explicit **GO**.

### Project tooling rule
Do **not** use the Thronemarch skill/workflow for THE GROWING WILDS. It is unrelated to this project. Use the TGW project files, current locked/candidate packages and explicit project guardrails directly.

# 0. CANONICAL GAME IDENTITY / VISION

**Game title:** The Growing Wilds

**Primary visual brand/logo:** GROWING WILDS!  
**Tagline:** *Grow. Explore. Survive.*

**Brief:**  
*The Growing Wilds* is a stylized third-person survival adventure set in a vibrant, living world where nature is both your greatest resource and your greatest threat.

Players explore a growing open world, gather natural materials, discover rare Golden Seeds, craft equipment, build and expand their own base, and develop their character over time. Different regions introduce new resources, creatures, challenges and powerful bosses, while cooperation, rivalry and alliances shape how players survive and progress.

With a distinctive low-poly botanical art style, expressive plant-inspired characters and a world that continuously rewards exploration, *The Growing Wilds* combines survival, progression, discovery and social gameplay in an accessible world designed to keep players coming back.

**Grow your world. Explore the unknown. Survive the wilds.**

### Vision vs. current implementation
The brief above is the canonical product vision. Crafting depth, bosses, alliances/co-op and the complete base-building/progression loop are not all fully implemented yet and must not be represented as completed runtime systems until they exist.

### Naming rule
- All new public-facing naming uses **THE GROWING WILDS**.
- All new build/package naming uses `THE-GROWING-WILDS-*`.
- Existing internal `dym...` compatibility IDs/keys/events may remain until a separately approved migration exists.
- Historical `DYM-GAME-*` package references remain unchanged when they identify real previous builds.

---

# 1. ABSOLUTE PROJECT RULES

## 1.1 Never build without explicit GO

**ALDRIG build, kode, implementér eller ændr noget uden Janniks eksplicitte `GO`.**

Before GO, only:
- analyze
- inspect
- debug
- review files/code/assets
- identify root cause
- propose a precise scope
- define regression tests

A request for analysis is not a build approval.

## 1.2 Locked means runtime locked

When a system is marked **LÅST**:
- no “small improvements”
- no visual tweaks
- no refactors that change behavior
- no movement/camera changes
- no re-positioning
- no substitutions or reinterpretations

A locked system may only be changed after a new explicit GO for that exact scope.

## 1.3 User runtime approval outranks technical PASS

Priority of truth:
1. **Jannik’s runtime/visual test**
2. Verified runtime behavior
3. Static/code analysis
4. Assumptions

If runtime contradicts static analysis, runtime is source of truth.

## 1.4 Root cause before patch

When something is wrong:
- find the actual cause first
- do not stack arbitrary offsets
- do not trial-and-error camera/Y-position patches
- do not “fix” symptoms by disturbing locked systems

## 1.5 Work from candidate copies

Never edit a locked baseline directly.

Workflow:
**locked baseline → candidate copy → isolated change → regression → user test → lock**

## 1.6 Preserve working gameplay

No technical cleanup may alter functioning:
- gameplay
- camera
- movement
- visuals
- interactions

unless the change is explicitly intended to solve a documented problem.

## 1.7 Update MASTER + HANDOVER with every build (Jannik, 02/10/2026)

Every commit that changes the game must, in the same commit, update:
- `docs/HANDOVER.md`: current build/version line, the build table, open/pending items;
- `docs/MASTER-PROJECT-DOCUMENT.md`: current working status and the section describing the changed system.

A build whose docs are not updated is not finished. No exceptions for "small" fixes.

---

# 2. VERSIONING / CURRENT SOURCE OF TRUTH

## 2.1 Previous Stable baseline

`DYM-GAME-v0.3.66-NORTH-STABLE-SHADOW-SPRINT-R23O-CANDIDATE.zip`

R23-series ends at **R23O**. There must be no R23P/R23Q/etc.

## 2.2 Historical locked baseline

`DYM-GAME-v0.3.67-HOME-MOVEIN-R24-LOCKED.zip` was the first locked Home/MoveIn baseline after the R23 Stable line. It remains historical only and is not the current branch base.

## 2.3 Current canonical locked working base

**`THE-GROWING-WILDS-v0.3.96-R45-HOLO-INDICATOR-LOCKED.zip`**

Status: **LOCKED — runtime/visual approval + explicit LÅS received 2026-10-01.**

R45 is the canonical working package and supersedes R39 as the branch base. It carries forward all approved/retained systems from R39 through the R41/R42 result/podium line and locks the final RIDE / JUMP / FISH holo-indicator treatment.

Current inherited/locked behavior includes:
- R38A premium Ride Setup + Thora in-world 3D Tack Shop;
- R39/R41/R42 Result / Podium / Standings presentation with real TGW runtime data;
- live Today leaderboard podium occupancy (#1/#2/#3 only) independent from medal class;
- Standings Today / This week / All time switching, `Done`, and ghost-race action;
- R37 HUD/minimap layout;
- R36 startup/input stability and regression tooling;
- R35B World Map/minimap;
- R33J Fishing presentation/gameplay lock;
- R32D Summer water vegetation;
- R31 Boat -> Waterfall foundation;
- protected R23O Stable/riding/Jumping and R24 MoveIn/home behavior;
- R45 Claude holo indicators and clean floating labels for RIDE / JUMP / FISH.

R34B mobile gesture controls remain **MOBILE-TEST LOCKED** pending final real-device approval.

Future development must branch from a copy of R45 unless Jannik explicitly approves another base.

### Active R29 Normal Start / iPhone stabilization candidate

**`THE-GROWING-WILDS-v0.3.72-NORMAL-START-IPHONE-R29-CANDIDATE.zip`**

Build ID: **`ENTRY-R29-20260929A`**

R29 keeps the approved title, START position, uploaded TGW splash visual direction, current-world map and R26-style calm camera feel. It stabilizes Normal Start on iPhone by serializing splash/world/selector workloads, replacing the splash authoring/export runtime with direct existing GLBs, rendering a presentation-only current world instead of initializing hidden/private/gameplay-heavy systems, loading the active selector character first on touch devices, then staggering only the immediate-neighbour prefetch, and disposing superseded WebGL contexts. Locked gameplay systems remain unchanged.

### R24 locked behavior

- first normal spawn per character runs that shed's authored `MoveIn` once;
- MoveIn completion persists per character;
- DEV routes bypass MoveIn and do not consume the first-time flag;
- Private Garden copy does not replay MoveIn;
- all 9 characters use one canonical world-home spawn centered between the front gate posts;
- normal home arrival faces inward toward the shed;
- Private Garden → `Back to the world` returns at the same gate center facing outward toward the shared world;
- world and Private Garden player collision use the authored 4 × 4 m structural shed footprint rather than decorative visual bounds;
- full visual shed bounds remain available to camera occlusion;
- decorative leaves/roof/smoke no longer create invisible early-stop walls before doors;
- MoveIn camera, normal camera, movement, assets and all previously locked Stable/riding/Jumping/Fishing systems remain preserved.

### Lock receipt

Jannik explicitly requested **LÅS** after runtime validation of the final R24C structural collision fix. R24 is therefore no longer a candidate. No locked R24 behavior may be changed without a new explicit GO.

# 3. LOCKED WORLD / CORE BASELINE

## 3.1 World direction

The Growing Wilds is a large shared-world landscape with:
- Home Garden / character homes
- lake
- stream
- waterfall
- bridge
- meadow
- forest
- Cabin / Fishing
- Greenhouse
- Orangery
- Lookout
- North Stable
- paths
- stone walls
- signs
- wildlife zones

Style:

**premium simple low-poly nature**

Not realistic high-poly.

## 3.2 Shared-world camera — LOCKED

Normal third-person camera:
- normal distance when LOS is clear
- smooth retract around obstacles
- may not pass through world geometry

Special camera systems must retain ownership where designed:
- Fishing
- Stable tunnel
- riding/race
- conversations
- MoveIn intro while active

## 3.3 Cutaway — LOCKED

Cutaway applies to:
- Cabin roof/interior backing as required
- Greenhouse L1/L2/L3 roof/rafters
- Orangery roof

Player Home/Shed:
- **no normal cutaway**
- use normal camera retract

---

# 4. CHARACTER HOMES / PRIVATE GARDEN

Each selected character has:
- matching shed
- themed front yard
- shared-world home position
- shed door portal to a separate Private Garden

Private Garden:
- returns to same world home on exit
- other players’ gardens private by default
- shared world can appear as distant/fog-softened backdrop
- shared-world AI/wildlife/collisions do not continue actively behind Garden

Future:
- alliance/team garden access is not implemented

## 4.1 First-time MoveIn — R24 candidate

All 9 shed GLBs contain:
- `Idle`
- `Door_Open`
- `Door_Close`
- `MoveIn`

MoveIn rule:
- normal game entry only
- first time for that selected character
- world-shed only
- stop Idle/door animations first
- play `MoveIn` once
- clamp at final state
- restart Idle after animation
- temporary cinematic camera ownership
- lock player control during sequence
- then return to standard third-person camera
- persist completion per character
- DEV world-home routes must never consume/mark first MoveIn

The exported GLBs carry the animation; game code should use the clip duration rather than hardcoded assumptions.

---

# 5. CHARACTERS — LOCKED BASELINE

9 playable characters:
- Tulip
- Daisy
- Hyacinth
- Cactus
- Fern
- Succulent
- Spire
- Swamp
- Aloe Vera

Character Selector:
- one character at a time
- large character presentation
- 01/09 counter
- stats/bars
- swipe on iPhone
- `Se alle`
- `Start i haven`
- no unnecessary `< >` on mobile

Gameplay character scale around +10% is approved.

Idle / Walk / Hop assets exist.

---

# 6. GOLDEN SEED — LOCKED

Golden Seed:
- organic seed/pod
- golden/beige shell
- luminous core
- small sprout
- simple premium low-poly look
- not pot/ceramic

Animations:
- `Idle`
- `Awaken`
- `Collect`

Flow:
**Discover → Approach → Awaken → Collect → Plant / Donate**

Golden ring/glow must clearly communicate an important collectible.

Golden Seed does **not** unlock Greenhouse progression.

---

# 7. GREENHOUSE — LOCKED BASELINE

Progression:
**L1 → L2 → L3**

Separate resource/build progression.

Preserve:
- collision
- cutaway
- existing progression logic

---

# 8. WILDLIFE — LOCKED BASELINE

Wildlife uses habitat-based spawning.

Preserve:
- habitat regions
- path/cover realism
- day/night weighting
- aquatic grounding

Mallard/swan must be grounded correctly against water.

Do not change wildlife cloning unless a real multi-animal animation bug is reproduced.

---

# 9. CABIN / FISHING — LOCKED CURRENT STATUS

Canonical Fishing gameplay/presentation is the **R33J lock**, carried forward into R45.

Preserve:
- terrace/dock physics, terrain access, waterline and pier collision;
- Boat floor / Boat_Idle / ropes / bridge and terrace water safety;
- Sigurd conversation framing with no wall/facade camera clipping;
- visible dialog replies, rod+bait handover, worms tin, pipe smoke and shop/dialog flow;
- Bamboo Rod + Worms progression into the fishing spot;
- **R71 (GO 03/10):** the fixed dock-end fishing spot is retired; fishing on foot works along any shore of the lake, stream and waterfall basin (`shoreDir`), the dock-end gold circle now starts the Lake Race. Cast/bite/reel/catch loop unchanged.
- approved cast / bite / reel / catch / Catch Log loop;
- approved Fishing camera, FishButton, visible hooked-fish fight and final catch presentation;
- Fish Board / Catch Log / boat fishing / docking / Boat -> Waterfall integration;
- final caught-fish hero pose from R33J: belly down, back up, side profile, head left / tail right;
- R45 `FISH` holo indicator at the approved cabin bridge fishing spot, with clean floating text and no label container/stroke.

Fishing flow:
**Sigurd -> Bamboo Rod + Worms -> FISH holo spot -> Cast -> Bite -> Reel -> Catch -> Catch Log**

Do not reopen Fishing polish during unrelated work. Any new Fishing change requires its own explicit GO and must branch from the R45 locked base.

---

# 10. NORTH STABLE — LOCKED BASELINE

Stable remains north in the world.

Preserve:
- footprint
- world integration
- terrain/path connection
- building
- oval race track
- Thora
- horses
- riding systems

## Thora — LOCKED behavior

Thora:
- behind tack-room hatch
- interaction local to hatch
- dedicated conversation camera
- player out of shot
- speech bubble
- dialog choices
- Close/Esc
- enter/exit flow

Hatch:
- use `Hatch_Open`
- no manual replacement rotation

Stable doors:
- use `Doors_Open`
- correct collision in closed/opening/open states
- open passage must actually be free

## Stable quest — DEFERRED

Future intended progression:
**Find Stable → Meet Thora → small quest → return → Thora approval → Stable permanently unlocked**

Quest content is not final.

“Bring carrots to earn her trust” is reference only.

Do not build without separate GO.

---

# 11. STABLE SYSTEMS — LOCKED

## 11.1 Stable tunnel camera

**DO NOT TOUCH WITHOUT EXPLICIT GO.**

Preserve:
- hard camera ownership in tunnel
- auto alignment
- compressed distance
- pitch/framing
- smooth blend back to normal third-person

## 11.2 Race camera

Locked:
- automatic horse-heading follow
- third-person chase behavior
- player does not need mouse-look to keep direction

## 11.3 Horse grounding

Closed bug.

Runtime proved horse grounding correct.

The former “floating” visual was missing shadow, not Y-position.

Do not add:
- Y offsets
- pivot hacks
- Box3 grounding experiments
- terrain guess offsets

without new runtime evidence.

## 11.4 Horses + hitching rail

Birk, Kul, Solvej + hitching rail:
- inside Stable after tunnel
- locked location

## 11.5 Riding speed

Fastest Lap:
- W = cruise
- W + Shift = full pace
- release Shift = gradual deceleration toward cruise
- release W = coast down
- off-track penalty/cap stays track-specific

Normal riding:
- W + Shift = full pace

Jumping:
- W + Shift = full pace
- must not inherit Fastest Lap off-track `.62` cap

## 11.6 Jump-hit behavior

Mounted horse may:
- hit pole/jump
- receive penalty
- lose speed
- continue forward

Mounted horse must not:
- hard-block
- become stuck at obstacle

## 11.7 Jumping layout

Locked:
- long arena
- 4 jumps
- one shared START/FINISH

Flow:
**START/FINISH → #1 → #2 → #3 → #4 → same FINISH**

Do not confuse with oval race track.

## 11.8 Jumping ghost

Locked:
- same canonical START as player
- same course origin
- current 4-jump course
- no old incompatible route coordinates

---

# 12. STABLE UI / RESULT / WORLD INTERACTIONS — LOCKED CURRENT BASELINE

## Ride Setup / Tack Shop

Status: **R38A LOCKED and carried forward into R45.**

Ride Setup shows only real choices and data. Thora's Tack Shop remains an in-world 3D presentation with dedicated camera, physical tack/care props, browsing and selected-item highlight. No active purchase economy is implied unless separately implemented.

## Result / Podium / Standings

Current canonical presentation is the Claude-prototype-derived Result/Podium/Chalkboard flow carried into R45.

Locked/current behavior:
- cinematic Result presentation after completed/DQ state only — never during an active run;
- timed result choreography: time reveal, penalty reveal, medal animation/material effects, rank settle, typed Thora bubble and delayed actions;
- Gold/Silver/Bronze presentation remains performance/medal driven;
- physical podium occupancy is **live leaderboard driven**, not medal driven;
- only the actual Today #1/#2/#3 occupy podium positions 1/2/3;
- if the player is #4 or lower, the player is not placed on the podium;
- Today / This week / All time are clickable and redraw the standings from real TGW data;
- Standings includes `Done` and `Race the ghost` where available;
- `Leaderboard / Result` DEV QA remains available and must not persist fake QA times into the save.

TGW remains source of truth for:
- race time;
- penalties;
- personal best;
- medal thresholds;
- leaderboard ranks/rows;
- ghost data;
- save/progression.

Claude/demo seeded leaderboard values must never replace real TGW runtime data.

## World interaction indicators — R45 LOCKED

Canonical RIDE / JUMP / FISH markers use the supplied Claude `holo-indicator.js` component:
- gold vertical holo cylinder with scanline/breathing treatment;
- base ring + ground halo;
- no old custom marker beam/ring stack;
- floating `RIDE`, `JUMP`, `FISH` text only;
- no text container;
- no text stroke;
- subtle floating/wave motion;
- marker and interaction trigger must share the same world location.

Placement:
- `RIDE` = actual Fastest Lap START position;
- `JUMP` = approved Jumping start position;
- `FISH` = approved cabin bridge fishing spot.

---

# 13. CURRENT DEFERRED DEVELOPMENT BACKLOG — ORDER

The recent Stable Result / Podium / Standings redesign and RIDE / JUMP / FISH indicator work are complete in the R45 locked baseline. Do not reopen them without a new explicit GO.

Status 01/10/2026: items 3 and (partly) 4 now exist as CANDIDATES (R47–R50, see section 30). Lookout is retired.
Unless a runtime bug appears, the remaining content/progression order is:

1. **Test + lock R47–R50** (garden builds, pots, threat, dev menu) after Jannik's runtime test
2. **Boat rent/buy economy**
3. ~~Lookout Scout Mode~~ — retired by Jannik ("fuck lookout"); do not rebuild without a new GO
4. **Snail → real basic-enemy framework** (today: placeholder snails that eat pots, 2 swats; no health/combat)
5. **Mole integration**
6. **Wood Giant integration**
7. **Lake Run integration**
8. **Thora quest / real Stable unlock progression**
8b. **Open combat follow-ups (Jannik 02/10):** arena colliders + FIGHT marker done (R65.1). Later the Wood Giant appears at random spots in an area (temporary root ring as boundary) instead of the fixed arena, and the arena may become a character-vs-character venue (needs the multiplayer foundation, item 10).
9. **Alliance/team garden permissions**
10. **Multiplayer/social foundation**
11. **Season/progression meta-system**

Separate validation/technical items:
- final real-device approval of R34B mobile gesture controls;
- SaveGame: new progression uses `tgw.save` (SaveGameV2, per character). Stable/Greenhouse/MoveIn/Fishing keys are NOT migrated yet — separate GO;
- performance work remains measurement-first; do not optimize without evidence;
- central interaction resolver / broader architecture seams are only introduced when a concrete need justifies them.

Priority rule if a new problem appears:
**gameplay/UX bug -> progression/save correctness -> content/gameplay loops -> regression -> measured performance -> small multiplayer seams -> backend later.**

---

# 14. BOAT — CURRENT FOUNDATION / DEFERRED WORK

Boat already has meaningful runtime infrastructure.

Future work:
- Boat → Waterfall gameplay/navigation
- rent/buy economy
- progression/economy integration

Boat economy should follow meaningful boat gameplay, not precede it.

Boat collision remains separate from ordinary character-water blocking.

---

# 15. LOOKOUT / RESOURCE LOOP

**R49: the private-garden Lookout build loop (`ResourceBuildLoopSystem`) is retired** and no longer constructed;
the wilds workbench took its site. The world landmark Lookout is untouched. Text below is historical.

Lookout exists as a world landmark.

Future feature:
**binocular / scout view**

Resource/build direction already supports:
- resource gathering
- build requirements
- Lookout build progression

Natural future chain:
**Gather resources → Build Lookout → Unlock Scout Mode**

Do not treat Scout Mode as an isolated random feature if it can be connected to this loop.

---

# 16. ENEMIES / BOSS — DEFERRED

Existing asset/direction:
- Snail
- Mole
- Wood Giant

Recommended system order:
1. Snail establishes reusable basic enemy framework
2. Mole adds a second behavior/mechanic
3. Wood Giant uses the established combat/progression framework

Wood Giant:
- giant movable tree boss
- rooted/long legs
- much larger than characters
- evil/boss read
- DYM low-poly compatible
- not cute

Do not build boss-specific special architecture before ordinary combat exists.

---

# 17. LAKE RUN — v1 BUILT (R64, CANDIDATE)

R64 v1: buoy course on the lake (see the R64 status line in §31 and HANDOVER). Original direction below; ghosts, limited (rewarded) attempts, obstacles (drifting logs) and touch play are in v1; the weekly part is a weekly board + weekly gold bonus (no rotating course yet).

Direction includes:
- weekly activity
- limited attempts
- ghosts
- obstacles
- mobile interaction

v1 is built (R64); next steps only with a new GO.

---

# 18. MOBILE — IMPORTANT BACKLOG

iPhone is an important target.

Maintain:
- swipe selector
- touch interaction
- movement
- run
- jump
- large DEV targets
- no desktop-only assumptions

Known polish task:
**mobile run + jump/control feel**

---

# 19. MULTIPLAYER / SOCIAL — NOT CURRENT BUILD SCOPE

Overall game direction includes:
- departments
- alliances
- enemies
- internal competitions
- leaderboards
- shared/open world

Do **not** assume a complete multiplayer foundation already exists.

Do **not** build multiplayer now.

When multiplayer eventually becomes an explicit scope, preferred sequence:
1. two browsers see each other
2. position/rotation/animation sync
3. one small shared action
4. reconnect
5. server-authoritative shared state
6. server validation of rewards/inventory
7. persistence
8. load test
9. then evaluate actual player count

---

# 20. CORE GAME LOOP / LONG-TERM DIRECTION

Core natural resources include:
- rattan
- clay
- glass
- bamboo
- fiber

Long-term gameplay:
- gathering
- building
- crafting
- combat
- progression
- competition
- alliances
- enemies/bosses

The game must not become a one-hour demo.

Target:
**something employees want to return to repeatedly**

Seasons:
- at least approximately 30 days

---

# 21. EXTERNAL TECHNICAL REVIEW — HOW TO USE IT

The external review is **not a build plan**.

Use it as guardrails.

Core principle:

> Preserve what works. Technical cleanup must solve a concrete problem.

Priority:
**Gameplay/UX bugs → progression/save → more game content → regression → measure performance → small multiplayer seams → multiplayer later**

Do not stop active game development for a broad architectural rewrite.

---

# 22. TECHNICAL REVIEW — DO RELATIVELY SOON

## 22.1 E / Enter autorepeat + browser blur

Known concern:
- held action key can potentially retrigger
- `actionPressed` may remain pending after browser focus loss

Desired fix when scoped:
- one intended interaction per physical press
- held E must not retrigger dialog/pickup/door/fishing/etc.
- alt-tab/focus loss clears pending action
- no unnecessary changes to movement/jump/input behavior

This should be a small isolated change.

## 22.2 SaveGame unification

Current progression/save state is distributed across:
- GameState
- separate localStorage keys
- system-specific runtime state

This is the most important future architecture task, but:

**Do not do a large save refactor in the middle of active gameplay fixes.**

Future target:
`SaveGameV1`

Flow:
**load → validate/migrate → hydrate → play → persist**

Potential persisted domains:
- inventory
- Golden Seed progression
- greenhouse
- lookout/build progression
- fishing progression
- stable progression
- quests/unlocks
- other intentional personal progression

Only save state the design actually promises to preserve.

## 22.3 Regression checklist

Before/after larger changes, verify:
- Character selector
- World ↔ Private Garden
- camera/collision
- Golden Seed
- Lookout
- Greenhouse
- Orangery
- Fishing
- Stable
- Wildlife
- asset failure / missing GLB
- desktop + touch/mobile

Full automated testing is not required yet.

A reliable manual regression checklist is better than a large unused test platform.

---

# 23. TECHNICAL REVIEW — ONLY WHEN NEEDED

## 23.1 Central interaction resolver

Potential future issue:
interaction priority currently may depend on check order when multiple systems overlap.

Possible candidates:
- NPC
- door
- item
- fishing spot
- stable
- boat
- resource
- portal
- quest object

A simple central resolver may later return:
- type
- distance
- priority
- label
- source

But:

**Do not build a large interaction framework unless real overlap/conflicts occur.**

## 23.2 Asset loading / startup

Measure before changing:
- cold startup time
- warm startup time
- assets required before gameplay
- large GLBs
- distant/non-immediate areas

Only if startup becomes measurably slow consider:
- critical
- nearby/lazy
- optional

No lazy-loading project purely on theory.

## 23.3 State ownership

Conceptual ownership:
- `local_visual`
- `player`
- `world`

Examples:
- camera/shaders/local FX → local_visual
- personal inventory → player
- fishing log → player
- Private Garden → player
- Community Bloom → world
- shared world progression → world

Document this as a design rule.

Do not build a large state framework now.

## 23.4 Small GameActions seams

Where a feature touches personal progression and potential future shared state, a small action boundary can help.

Examples:
- `donateSeed()`
- `buildLookout()`
- `requestGreenhouseUpgrade()`

Purpose:
gameplay code does not need to care whether the action later runs:
- locally
- through a server
- through another adapter

Keep this tiny.

Do **not** introduce:
- generic command bus
- event sourcing
- broad networking framework
- abstraction for abstraction’s sake

---

# 24. TECHNICAL REVIEW — WATCH, DO NOT TOUCH WITHOUT EVIDENCE

## Wildlife cloning

If two same-species animals animate correctly simultaneously:
**do nothing.**

Only investigate skeleton-aware cloning if an actual defect appears.

## Performance / GPU

Measure when relevant:
- FPS
- frame time
- draw calls
- triangles
- active mixers
- wildlife count
- GPU memory
- load time

**No performance refactor without measurements.**

## Dispose / teardown

Do not build a large lifecycle refactor now.

Relevant only if we see:
- game reinitialization without reload
- hot-reload instances
- duplicate events
- memory growth

## localStorage failure UX

Game can continue if browser storage fails.

Later:
- subtle warning if progression cannot save

Not high priority now.

---

# 25. TECHNICAL REVIEW — IGNORE UNTIL CONCRETE NEED

Do not implement solely because a review mentioned it:
- full multiplayer backend
- WebSocket architecture
- fixed timestep refactor
- large TypeScript conversion
- generic networking layer
- event sourcing
- broad dependency injection
- large Game.js split
- complete dispose architecture
- offline packaging of everything
- performance optimization without profiling

---

# 26. PRODUCT RULE

The largest risk is not only technical quality.

The key question is:

**Why does the player open The Growing Wilds again tomorrow?**

Technical work must support:
- gameplay loops
- progression
- rewards
- discovery
- world content
- quests
- social/future shared goals
- reasons to return

Do not let architecture become the product.

---

# 27. BUILD DECISION CHECKLIST

Before any implementation after GO:

1. What exact problem are we solving?
2. Is the scope isolated?
3. Which locked systems could be touched?
4. Can it affect gameplay, movement, camera or visuals?
5. What is the root cause?
6. What is the regression plan?
7. Is this actually necessary now?
8. What is the new candidate version/name?
9. What must remain byte-for-byte or behaviorally unchanged?
10. What runtime test must Jannik perform before lock?

If the change is not necessary now:
**leave it alone.**

---

# 28. LOCK / RELEASE WORKFLOW

For each scope:

**1. Analyze**  
No changes.

**2. Define exact scope**  
List touched files/systems and regression risks.

**3. Wait for explicit GO**

**4. Build candidate**  
Never overwrite locked baseline.

**5. Static checks**
- syntax
- asset availability
- version
- package integrity
- lock-sensitive diffs

**6. Runtime/regression**
- test target feature
- test nearby systems
- confirm no lock regression

**7. Jannik visual/runtime approval**

**8. Lock**

Only after lock can the candidate become the new source of truth.

---

# 29. CURRENT NEXT ACTION

**Current canonical locked working base:** `THE-GROWING-WILDS-v0.3.96-R45-HOLO-INDICATOR-LOCKED.zip`.

The following current presentation/gameplay state is now the source of truth:
- Claude-derived Stable Result / Podium / Chalkboard presentation with TGW real data;
- live Today top-3 podium occupancy independent from medal class;
- clickable Today / This week / All time Standings;
- Standings `Done` + ghost-race action;
- DEV `Leaderboard / Result` QA route with non-persistent test state;
- Claude holo-indicator world markers for RIDE / JUMP / FISH;
- RIDE at the actual Fastest Lap START;
- JUMP and FISH at approved positions;
- clean floating RIDE/JUMP/FISH labels with no container and no stroke.

Locked beneath/currently carried forward: R38A Stable premium UI/Tack Shop, R37 HUD/minimap layout, R36 technical startup/input stability, R35B World Map, R33J Fishing, R32D Summer vegetation, R31 Boat -> Waterfall foundation and protected R23O/R24 gameplay/home systems.

Separate pending validation:
- R34B mobile gesture controls still need final real-device approval.

**Update 01/10/2026:** R47–R50 (wilds core loop, garden builds, greenhouse pots, dev menu) are built as CANDIDATES on GitHub
and await Jannik's runtime test. Next scope after that is OPEN; nothing is authorized without **GO**.

**No build is authorized by this document itself. Explicit GO is always required.**

────────

31. ACTIVE R32B CANDIDATE — SUMMER WATER VEGETATION FIX

Build ID: `SUMMER-WATER-VEG-R32B-20260929A`

R31 remains the locked source of truth until runtime approval. R32B is built from R31 LOCKED and fixes only the Summer vegetation GLB hierarchy lookup. Summer vegetation remains visual-only and owns no collision/gameplay/season state. R23O/R24 and R31 Boat → Waterfall remain protected.


────────

32. ACTIVE R32C CANDIDATE — SUMMER WATER VEGETATION PLACEMENT

Build ID: `SUMMER-WATER-VEG-R32C-20260930A`

R31 remains the locked source of truth until runtime approval. R32C preserves the working R32B Summer vegetation integration and changes only visual placement: bridge clearance plus clustered tall shoreline/stream vegetation. Summer vegetation remains visual-only and owns no collision/gameplay/season state. R23O/R24 and R31 Boat → Waterfall remain protected.

### R32D candidate — Summer water vegetation grounding
Runtime follow-up after R32C: vegetation placement/clustering is preserved; candidate only fixes visual grounding using transformed bounds and corrects rooted pondweed to the water bed. No gameplay/collision/camera/movement/Boat/Fishing/Stable/season-state changes. R32D is now the canonical locked working base after explicit runtime approval and lock.


────────

33. R32D LOCKED — SUMMER WATER VEGETATION

Build ID: `SUMMER-WATER-VEG-R32D-20260930A`
Canonical locked package: `THE-GROWING-WILDS-v0.3.75-SUMMER-WATER-VEGETATION-R32D-LOCKED.zip`
Status: **LOCKED — runtime approval received 2026-09-30**

Locked result:
- Summer vegetation is active at Lake, Pond, Stream and Waterfall.
- R32B hierarchy extraction, R32C clustering/clearance and R32D grounding are all retained.
- Vegetation remains visual-only with no collision.
- Lily/duckweed remain surface plants; pondweed is rooted to the water bed.
- R31 Boat → Waterfall navigation remains protected and unchanged.
- Spring/Autumn/Winter remain deferred until season scope is separately approved.

Future builds must branch from R32D LOCKED unless Jannik explicitly selects another base.


────────

34. R33D LOCKED — FISHING POLISH

Build ID: `FISHING-POLISH-R33D-20260930A`
Canonical locked package: `THE-GROWING-WILDS-v0.3.76-FISHING-POLISH-R33D-LOCKED.zip`
Status: **LOCKED — runtime/visual approval received 2026-09-30**

Locked result:
- Fishing presentation is approved through R33D.
- Cast range is 2.0–6.6 m with oscillating charge/power.
- Fishing camera is angled over-shoulder and distance-aware.
- Olive FishButton has exactly one fixed outer ring; the inner control scales with live cast power.
- R33B landing/result presentation is retained.
- Sigurd, Catch Log, Fish Board, boat fishing, docking and Boat → Waterfall remain protected.
- R32D Summer vegetation and all R23O/R24 protected systems remain unchanged.

Future builds must branch from R33D LOCKED unless Jannik explicitly selects another base.


────────

35. R33E CANDIDATE — FISHING CATCH PRESENTATION (SUPERSEDED BY R33F)

Build ID: `FISHING-POLISH-R33E-20260930A`
Status: **CANDIDATE — runtime/visual approval required**

Direct base: R33D LOCKED.

Candidate scope:
- Ports only the supplied Claude Design catch/result presentation.
- Caught fish becomes the hero element with size-aware catch camera framing.
- Player is hidden only during landing/result so the catch is unobstructed.
- Result card sits at the bottom and shows First catch/New record/Caught, fish name, size, session count/best and Keep fishing.
- Approved R33D olive FishButton, 2.0–6.6 m cast, over-shoulder fishing camera, reel mechanics, Catch Log, Sigurd and Boat → Waterfall remain protected and unchanged.

R33D remains the canonical locked working base. R33E was not locked and is superseded by R33F.


────────

36. ACTIVE R33F CANDIDATE — FISHING CATCH HERO COMPOSITION

Build ID: `FISHING-POLISH-R33F-20260930A`
Status: **CANDIDATE — runtime/visual approval required**

Direct candidate base: R33E, which itself branches from R33D LOCKED. Canonical locked base remains R33D.

Candidate scope:
- fixes only the visual catch-result composition seen in R33E runtime
- caught fish is rotated to the vertical/hanging Claude Design orientation
- fish is centered and lifted as the hero element above the result card
- result camera is reframed for the vertical fish silhouette
- rod is hidden only during final result state so it cannot cut across the hero shot
- R33E result card/data and all approved R33D fishing gameplay remain unchanged

Protected unchanged systems include FishButton, 2.0–6.6 m cast, charge loop, reel/tension, Sigurd, Catch Log, Boat → Waterfall, SharedLandscape, movement, normal world camera, Stable/riding/Jumping and R24 MoveIn.

R33D remains the canonical locked working base until R33F receives runtime approval and explicit lock.

────────

37. R33G CANDIDATE — FISH FIGHT VISIBILITY + SIDE CATCH (SUPERSEDED)

Build ID: `FISHING-POLISH-R33G-20260930A`

R33G added the approved visible hooked-fish fight presentation and presentation-only surge motion while preserving all R33D locked fishing mechanics. Its first catch-orientation attempt was superseded by R33H/R33I/R33J.

Scope retained in the final lock:
• hooked fish clearly visible at/just below the water surface while reeling
• presentation-only fight movement during surges
• R33F catch card/camera composition and all R33D locked fishing mechanics preserved

────────

38. R33H CANDIDATE — CATCH ORIENTATION PASS (SUPERSEDED)

Build ID: `FISHING-POLISH-R33H-20260930A`

R33H corrected only the result-fish orientation axis. It was not locked and was superseded by R33I.

────────

39. R33I CANDIDATE — CATCH BROADSIDE/LEFT PASS (SUPERSEDED)

Build ID: `FISHING-POLISH-R33I-20260930A`

R33I established the approved belly-down/back-up pose and broadside presentation, but the head direction still required one final yaw correction. It was not locked and was superseded by R33J.

────────

40. R33J LOCKED — FISHING POLISH + FINAL CATCH PRESENTATION

Build ID: `FISHING-POLISH-R33J-20260930A`
Canonical locked package: `THE-GROWING-WILDS-v0.3.76-FISHING-POLISH-R33J-LOCKED.zip`
Status: **LOCKED — runtime/visual approval + explicit LÅS received 2026-09-30**

Locked result:
- all approved R33D Fishing-polish behavior remains canonical: olive FishButton with one fixed outer ring, 2.0–6.6 m oscillating cast, angled over-shoulder Fishing camera and reel/tension gameplay;
- R33E result presentation is retained: fish-first result camera, player/rod removed from the final hero shot as needed, bottom result card, real catch/session/best data and Keep fishing;
- R33G visible hooked-fish fight is retained: the fish is clearly visible near the water surface during reel and receives presentation-only struggle/surge motion;
- final caught fish pose is locked with belly down, back up, side profile to camera, head left and tail right;
- Sigurd, Catch Log, Fish Board, boat fishing, docking, Boat → Waterfall, Summer water vegetation, movement, normal camera, Stable/riding/Jumping and R24 MoveIn remain protected.

Future builds must branch from R33J LOCKED unless Jannik explicitly selects another base.


────────

30. R34B MOBILE GESTURE CONTROLS — CANDIDATE (30/09/2026)

Base: R33J LOCKED. The earlier fixed-joystick + Jump-button R34 candidate was rejected and is not a source base.

Candidate direction:
• floating movement control from left-side touch origin
• right-side drag = camera look
• quick upward right-side flick = existing hop
• full movement input = automatic run, no run button
• mobile-only speed reduction while turning
• desktop controls unchanged
• hop physics unchanged
• Fishing, Boat → Waterfall, Stable/riding and locked special cameras unchanged

R34B is **MOBILE-TEST LOCKED** after Jannik approval on 2026-09-30, but still requires final real-device mobile runtime approval before becoming FINAL LOCKED.


41. R34B MOBILE-TEST LOCKED — MOBILE GESTURE CONTROLS (30/09/2026)

Package: `THE-GROWING-WILDS-v0.3.77-MOBILE-GESTURE-CONTROLS-R34B-MOBILE-TEST-LOCKED.zip`
Base: R33J LOCKED.

Status: **MOBILE-TEST LOCKED — PENDING FINAL MOBILE RUNTIME APPROVAL**.

R34B freezes the mobile-native control direction: floating left movement, right-side camera drag, upward-flick Jump, automatic run and mobile-only speed moderation while turning. The discarded fixed-joystick + permanent Jump-button R34 candidate remains rejected. Desktop controls and all R33J locked Fishing/Boat/Stable/MoveIn/world systems remain protected. No retuning is allowed during unrelated scopes. Final promotion to FINAL LOCKED requires Jannik's real-device mobile runtime approval.

42. R35 WORLD MAP / MINIMAP — CANDIDATE (30/09/2026)

R35 integrates the Claude-designed minimap/world-map direction with the live SharedLandscape as source of truth. It includes the circular top-right minimap, live player position/heading, real TGW landmarks, tap/M overview map, desktop fullscreen behavior, mobile transparent overlay, pan/zoom and ME recentering. No fake quests/enemies/bosses, fast travel, waypoint, multiplayer markers or fog-of-war progression were added.

43. R35A MINIMAP BLUR EDGE — CANDIDATE (30/09/2026)

R35A is a final visual polish candidate on R35 only: the static dark minimap ring is removed and replaced by a feathered radial edge so the top-right map dissolves into the world. Map size/position/data/controls are unchanged.

Handover next correction after R35 lock: reposition the HUD/status boxes that currently sit behind/underlap the minimap circle. This must be a separate layout-only scope and must not alter the map or gameplay.



44. R35B LOCKED — WORLD MAP + FEATHERED MINIMAP EDGE (30/09/2026)

Package: `THE-GROWING-WILDS-v0.3.78-WORLD-MAP-R35B-FEATHERED-EDGE-LOCKED.zip`
Build ID: `WORLD-MAP-R35B-20260930B`
Status: **LOCKED — runtime/visual approval + explicit LÅS received 2026-09-30**.

Locked result:
• Claude-inspired world map/minimap integrated against live SharedLandscape/world coordinates;
• circular top-right minimap with live player position/heading and real TGW landmarks;
• tap/M opens overview map with pan/zoom and ME recentering;
• R35B replaces the hard/static minimap edge with a true feathered canvas-alpha fade into the world;
• no fake quests/enemies/bosses, fast travel, waypoint system, multiplayer markers or fog-of-war progression;
• R34B remains MOBILE-TEST LOCKED pending final real-device mobile approval;
• R33J Fishing and all previously locked Boat, Summer vegetation, Stable/riding and MoveIn behavior remain protected.

**NEXT HANDOVER TASK:** reposition the HUD/status boxes that currently sit behind/underlap the top-right minimap. This is a separate layout-only scope. Do not alter the locked map or gameplay while correcting HUD placement.

Future work branches from R35B LOCKED unless Jannik explicitly selects another base.

---

# R36 TECHNICAL STARTUP PASS — LOCKED (2026-09-30)

Base: R35B LOCKED.

Approved scope:
- overlap independent startup asset loads while preserving the same Game-ready gate;
- expose real startup timing/resource metrics for cold/warm profiling;
- block E/Enter keyboard autorepeat from creating repeated actions;
- add a reusable manual regression checklist.

No lazy loading, SaveGame migration, broad architecture refactor, performance tuning, gameplay/camera/movement or visual changes are part of R36.

R36 received runtime approval and explicit LÅS on 2026-09-30 and is locked beneath R37.

---

# R37 LOCKED — HUD / MINIMAP LAYOUT

Build ID: `HUD-LAYOUT-R37-20260930A`  
Base: R36 LOCKED  
Status: LOCKED — runtime/visual approval + explicit LÅS received 2026-09-30.

Scope: reposition the top-right inventory/status stack so it no longer sits behind/under the locked R35B minimap. Minimap visuals/behavior and all gameplay remain protected and unchanged.


# R37 LOCK RECEIPT (2026-09-30)

Package: `THE-GROWING-WILDS-v0.3.80-HUD-LAYOUT-R37-LOCKED.zip`
Build ID: `HUD-LAYOUT-R37-20260930A`

R37 is the canonical locked working base. The only approved runtime change relative to R36 is HUD/status layout around the already locked minimap. Future builds branch from R37 unless Jannik explicitly selects another base.


# R38A LOCK RECEIPT (2026-09-30)

Package: `THE-GROWING-WILDS-v0.3.81-STABLE-PREMIUM-3D-SHOP-R38A-LOCKED.zip`  
Build ID: `STABLE-PREMIUM-3D-R38A-20260930B`

R38A received runtime/visual approval and explicit LÅS. It is now the canonical locked working base. The approved scope is premium Ride Setup plus Thora's in-world 3D Tack Shop presentation. No active economy was introduced, and the protected Stable riding/camera/collision/gameplay systems remain unchanged.


# R39 LOCK RECEIPT (2026-09-30)

Package: `THE-GROWING-WILDS-v0.3.82-STABLE-RESULT-R39-LOCKED.zip`  
Build ID: `STABLE-RESULT-R39-20260930A`

R39 received mobile runtime approval and explicit LÅS. It is now the canonical locked working base. Approved scope: cinematic Stable result presentation + premium Standings using existing TGW race/result/ghost/leaderboard data. No race, riding, penalty, save, camera, collision or economy logic was changed.

Known next isolated fix: Result/Standings text boxes on mobile need responsive layout parity with the approved desktop composition. Do not alter result data, riding/race behavior or protected systems while fixing this.


---

# R39D CANDIDATE — RESULT / STANDINGS POLISH (01/10/2026)

Build ID: `STABLE-RESULT-R39D-20261001A`  
Package: `THE-GROWING-WILDS-v0.3.86-STABLE-RESULT-R39D-POLISH-CANDIDATE.zip`  
Status: **CANDIDATE — runtime/visual approval required.**

R39D responds only to the approved visual delta from R39C: mobile Standings rider-name alignment, a Thora portrait derived from the existing in-game Thora model, a stronger desktop Result hero composition, and a stronger desktop Standings side sheet. TGW runtime race times, PB, penalties, medals, ranks, ghost and leaderboard content remain source of truth. No race/save/progression/economy/riding-physics changes are included.

Runtime validation required before lock: iPhone Result + Standings, desktop Result + Standings, Ride again / Done / close, and one Jumping penalty state.


---

# R39E CANDIDATE — RESULT LIFECYCLE + THORA MOTION + DEV QA (01/10/2026)

Build ID: `STABLE-RESULT-R39E-20261001A`  
Package: `THE-GROWING-WILDS-v0.3.87-STABLE-RESULT-R39E-CANDIDATE.zip`  
Status: **CANDIDATE — runtime approval required.**

R39E fixes the Result visibility leak discovered during PC runtime testing. Root cause was presentation-only: R39D desktop CSS forced the shared Stable Result stage to `display:block!important`, so the same bug applied to both Jumping and Fastest Lap whenever the race UI was active. R39E adds explicit DOM/CSS lifecycle gating so Result/Standings can only remain visible in completed/DQ state.

R39E also adds subtle motion/effects to the existing Thora portrait and replaces the obsolete DEV `Stable / Inside QA` route with a direct `Leaderboard / Result` QA route. The QA route supports Jumping/Fastest Lap and Result/Standings without riding and uses non-persistent in-memory test data. No real race timing, route, penalties, save schema, progression, economy, riding physics or protected gameplay systems are changed.


---

# R41 HISTORICAL CANDIDATE — CLAUDE RESULT CHOREOGRAPHY (2026-10-01)

Build ID: `STABLE-RESULT-R41-20261001A`

R41 was the intermediate Claude Result choreography candidate: timed result reveal, medal motion/material effects, rank settle, typed Thora bubble, clickable standings scopes and direct DEV medal-state QA. TGW remained source of truth for real race/result/leaderboard/ghost/save data. R41 itself is historical; its retained presentation behavior is carried forward into the current R45 locked package.


---

# R42 HISTORICAL CANDIDATE — LIVE PODIUM + RACE MARKERS (2026-10-01)

Build ID: `STABLE-R42-20261001A`

R42 was the intermediate live-podium/standings candidate. It changed physical podium occupancy to the real Today leaderboard top three, kept medal award independent from rank, added Standings `Done`, and introduced the first world-space race-start marker pass. The marker visuals were later superseded by R45's Claude holo-indicator treatment. The retained live-podium/Standings behavior is carried forward into R45.


---

# R45 HOLO INDICATOR LOCK — 2026-10-01

The RIDE / JUMP / FISH world interaction marker treatment is LOCKED. Canonical presentation uses the Claude holo-indicator component with clean floating text only (no label container and no text stroke). RIDE is anchored to the actual Fastest Lap start position; JUMP and FISH retain their approved positions. Label floating/wave motion and existing interaction behavior are retained.


# R45 FINAL LOCK RECEIPT — HOLO INDICATORS + CURRENT WORKING PACKAGE (01/10/2026)

Package: `THE-GROWING-WILDS-v0.3.96-R45-HOLO-INDICATOR-LOCKED.zip`  
Status: **LOCKED — explicit LÅS received 2026-10-01.**

R45 is the current canonical branch base. The final requested lock change removed the text stroke from the floating `RIDE`, `JUMP` and `FISH` labels. The labels have no container, retain their subtle floating/wave motion, and sit above the supplied Claude `holo-indicator.js` gold holo effect. `RIDE` is aligned with the actual Fastest Lap START location; `JUMP` and `FISH` retain their approved positions.

The package also carries forward the current approved Stable Result / Podium / Standings flow and protected gameplay systems. No movement, camera, race timing, checkpoint, ghost, save, Fishing mechanics, Result data, or leaderboard logic was altered by the R45 lock pass.

# R46.2 CLAUDE 1:1 SPLASH + START — CANDIDATE (2026-10-01)

**Candidate package:** `THE-GROWING-WILDS-v0.4.00-R46.2-CLAUDE-1TO1-START-CANDIDATE.zip`  
**Build ID:** `ENTRY-R46.2-20261001D`

R46.2 is the current candidate above the locked R45 gameplay baseline. It is **not locked until visual approval**.

## Branding lock carried into R46.2
- Canonical project/game title: **The Growing Wilds**.
- Primary visual brand/logo: **GROWING WILDS!**.
- Splash and Start are separate: Splash is a short loading/brand beat; Start is the interactive hero screen.
- Spire is the flagship character for this single authored Start scene.

## R46.2 Start direction
The supplied Claude Design file `Splash v2.dc.html` is the visual and motion source of truth for the Start presentation. It defines the authored motion language: background fade, wind-blown leaves/particles, burst-in, slow burst spin, GROWING drop, WILDS pop, leaf sprout/sway, logo bob, tagline rise, START button pop/breathe/shine and leave transition.

The Claude export referenced helper files (`hero3d.js` and `Character Sheds.html`) that were not included in the export. R46.2 therefore ports the Claude UI choreography directly and supplies a project-local live `Character Sheds.html` implementation using existing Three.js, `shed_spire.glb`, `spire.glb`, and `animal_assets_20.glb`. No screenshot is used for the Start scene.

## R46.2 live scene
- live Three.js scene;
- Spire shed with existing authored shed animations;
- Spire character with Idle and START-triggered Hop;
- squirrel, hare and butterfly from existing wildlife asset pack with existing animations;
- authored low-poly garden beds, fence, stepping stones and forest composition to reproduce the Claude garden presentation;
- subtle continuous camera drift;
- Claude-style moving foreground leaves and light particles.

## R46.2 Splash
Short branded loading beat: **“The world is growing...”** with sequential loader dots plus wind-blown leaves/particles. It transitions automatically into the live Start screen.

## Protected systems
R45 gameplay remains the regression baseline. R46.2 does not intentionally alter movement, gameplay camera, collision, Stable/Fishing/Boat systems, Golden Seed, Lookout, map/minimap, race/podium/standings, world holo markers, Home/MoveIn, selector gameplay data or character roster.

## Approval status
**OPEN / visual candidate.** Do not mark R46.2 locked until Jannik explicitly approves the Splash and Start presentation after testing.

---

# 30. WILDS CORE LOOP — R47–R50 (CANDIDATE, 01/10/2026)

**Loop:** explore the shared world → gather → craft at the garden workbench → cut Thornbrush → loot caches →
grow plants in greenhouse pots → upgrade the garden → defend it from overgrowth and snails → repeat. Daily requests
and Golden Seed perks give a reason to return.

## Where things live
- **Shared world (exploration only):** ~49 resource nodes (Fallen Branches, Loose Stones, Clay Bank, Wild Grass;
  Old Logs need the Stone Axe, Boulders the Stone Pickaxe), regrowing on real time; 6 Thornbrush patches with amber
  caches (3 also hold a Golden Seed). World map shows discovered caches.
- **Private garden (all building):** Workbench on the old Lookout site; upgrades L1 Rain Barrel & Compost, L2 Seed
  Shrine (Golden Seed perks), L3 Thorn Hedge; overgrowth weeds and snails attack here.
- **Greenhouse (pots and plants):** up to 3 Terracotta Pots (`pot-terracotta.glb`) on the current level's own
  furniture (L1 shelf, L2 plant table, L3 floor). Wild Seed → water (Watering Can, filled at the garden pond) →
  3 real-time stages × 4 min (only while watered) → harvest. Greenhouse code/models/collision untouched.

## Systems / files
`js/core/SaveGame.js` (tgw.save v2, per character, v1→v2 migration) · `js/gameplay/WildsLoopSystem.js` ·
`js/gameplay/GardenPotsSystem.js` · `js/gameplay/WildsThreatSystem.js` · `js/gameplay/DailyRequests.js` ·
`js/ui/WorkbenchPanel.js` · `js/ui/DevMenu.js` · all balancing in `js/data/wildsCatalog.js`.

## Character traits (one each)
Tulip +1 Fiber · Daisy home nodes regrow faster · Hyacinth +1 Clay · Cactus cuts thorns barehanded ·
Fern +1 Wood · Succulent slower overgrowth · Spire sees all caches · Swamp extra snail shell · Aloe +1 Stone.

## Dev menu (R50)
Start screen → Indstillinger → **Dev-menu** (per device). In game a **DEV** button gives: +20 materials, all tools,
3 pots + water, skip 5 min, teleports (bench, greenhouse, pond, gate, world, nearest node/thornbrush), greenhouse
level 0–3 (writes the greenhouse's own save key and reloads), spawn/clear weeds and snails, reset wilds save.
Works on the **real save**. Crafted tools show as a row under the materials in the HUD (water charges on the can).

## Camera/control variants (R50.1, DEV ONLY)
Dev menu → KAMERA & STYRING: **Standard** (unchanged, locked behavior), **A · Frit kamera** (Genshin/Roblox-style:
camera only turns on swipe, lazy recenter behind you after ~2.5 s of walking, 7.0/5.8 m, FOV 60/52) and **B · Cozy
ovenfra** (Animal Crossing-style: fixed high camera, never rotates, stick matches the screen, 11.5/9.8 m, FOV 46/40).
Implemented in `js/core/ControlProfiles.js` by swapping methods on the live camera instance; `ThirdPersonCamera.js`
and `CharacterController.js` are untouched.

**R50.2 (02/10/2026, Jannik: "A GO"):** A · Frit kamera is now the **default on touch devices** (iPhone/iPad).
Desktop keeps the classic R45 camera (no mouse-look yet). Dev menu can still switch between all three.

**R50.3 (02/10/2026, GO):** A is the default on **all devices**. Desktop adds mouse-look: hold the **right** mouse
button and drag (left button stays free for UI), mouse wheel zooms 0.65–1.45×. No pointer lock. The R45 camera is
still available as "Klassisk" in the dev menu.

## Known limits
Placeholder procedural art for all new props; no real combat/health; no global day/night lighting; balancing is a
first guess. Older systems' saves not unified.

---

# 31. TECHNICAL FOUNDATION + ROADMAP (Jannik's plan, GO 02/10/2026)

Principle: **instrument and measure first, then fix concrete hotspots.** No big optimization refactor; locked systems
are only touched where a measured hotspot requires it, minimally.

## Order (Claude's adjustments in *italics*)
**A. Baseline** — R50.3 LOCKED (done, R51); MASTER cleanup (done, R51).
**B. Technical foundation**
1. Performance instrumentation: DEV performance HUD + structured DEV logger (done, R51).
2. *Error boundaries early*: optional subsystems warn + continue; only the player character is critical. **Done (R52):** home, stable, golden seed, seed choice, greenhouse, orangery, fishing, map, wildlife are optional (`[LOAD] … failed` + toast listing what's missing); a failed character GLB falls back to the procedural sprout. Verified with 7 GLBs blocked: game starts, player moves, no page errors.
3. *PWA standalone early* (manifest + Apple metadata; no service worker) — biggest iPhone viewport win. **Done (R53):** `manifest.webmanifest` (standalone, orientation any, icons 192/512/1024) + apple-mobile-web-app-capable / black-translucent status bar / title / touch icon on index, selector and game (selector viewport-fit=cover).
4. Asset/load profiling → central small AssetManager (loadOnce, dedupe, clone, priority, fallback). **Done (R54):** `js/core/AssetManager.js` (`loadGLTF` cached + deduped, failed loads evicted, `cloneStatic`); only real duplicate found was `pot-terracotta.glb` (seed-choice + greenhouse pots) → now 1 request. New code must load GLBs through it. **Largest remaining load waste: the greenhouse preloads L1+L2+L3 (~7.5 MB) at startup — locked; changing it needs Jannik's explicit GO.**
5. Staged loading: critical path first (character, home, nearby landscape, HUD), background/proximity for Stable,
   Cabin/Fishing, wildlife, Result/Podium (*first concrete hotspot: the Result Stage iframe — a second WebGL renderer —
   is loaded at game start; load it when a race starts, unload after*). **Done (R54):** first playable frame waits only for
   world + home + character (headless: playable 2.6 s vs 8.8 s before); Stable, Golden Seed, seed choice, greenhouse,
   Orangery and Fishing attach in the background (`allSystemsReadyMs` metric). DEV routes still wait for everything.
   Result Stage iframe: `about:blank` at start, loaded by `NorthStableSystem.ensureResultStage()` on race start/result,
   released 5 s after the result closes. Background load competes with rendering — on software GL it took 31 s; real
   iPhone timing must be checked with the performance HUD.
6. Lifecycle contract: visibilitychange/pagehide → pause rendering, flush save; resume with offline catch-up, no dt jump;
   no hidden 3D scene rendering behind another. **Done (R55):** hidden → `setAnimationLoop(null)` + save flush; visible →
   clock reset + loop restart (verified 0 frames while hidden). Timestamp systems (nodes, pots, weeds, daily) catch up by design;
   SaveGame also flushes on pagehide. Result Stage iframe unloads after use (R54).
7. Adaptive quality profiles (mobile-low / mobile-high / desktop): DPR, shadow map size, density — same visual style.
   **Done (R55):** `js/core/Quality.js` — desktop DPR≤2 / shadow 2048 (unchanged look), mobile-high DPR≤1.5 / 1536,
   mobile-low DPR≤1.15 / 1024. Touch starts high, drops to low after 2×2 s windows under 42 fps (after a 6 s settle),
   remembered in `tgw.quality`; Dev menu can force a profile. Density (wildlife/vegetation) not yet profiled —
   needs on-device numbers first. Note: three r165 `renderer.info` does not count the shadow pass, so shadow cost must be
   judged by on-device FPS, not draw calls.
8. Interaction resolver (one active interaction from candidates by priority/distance/context) — before combat.
   **Done (R56):** `js/core/InteractionResolver.js` — systems `offer(source, interaction)`, `resolve()` picks highest
   priority then nearest. Priorities keep the established precedence: fishing 60 > stable 50 > home 45 > greenhouse 35 >
   first-seed 30 > wilds 10. New interactive systems (combat, boat) must offer through it.
9. SaveGame v3 robustness: schema validation, migration chain, last-known-good backup, build/version stamp,
   DEV export/import/download. **Done (R56):** v1→v2→v3 chain; first write per session copies the loaded save to
   `tgw.save.bak`; unreadable main save falls back to the backup; `meta {build, version, savedAt}`; writes are
   read-back-checked. Dev menu → SAVE: copy JSON (to paste in chat), download, import (current save kept as backup).
10. Short-landscape HUD (max-height ~430px) + progression-aware objectives (replace hardcoded "Find the Golden Seed").
   **Done (R56):** `WildsLoopSystem.goal()` = single next step (gather → axe → greenhouse → pot → can → seed → plant →
   water → harvest → threats → tools → caches → upgrades → perks), shared by the objective card (1 Hz, real time) and the
   workbench panel; the first-Golden-Seed story still owns the card in the private garden until the plant/donate choice.
   ≤620 px high: objective shows as a compact title; ≤430 px: smaller seed card, materials, tools, action and DEV buttons.
11. Automated regression smoke (desktop + 390×844 + 844×390 + 667×375, missing-asset, save migration, reload, DEV off).
   **Done (R57):** `node tests/smoke.mjs` — serves the repo itself, blocks all external requests, 8 checks, exit code 1 on
   failure. Must pass before every push (CLAUDE.md rule 5).

**B status 02/10/2026: complete (R51–R57).** On-device check (iPhone, Jannik 02/10): 60 fps steady (frame max 20–24 ms), 217 draw calls / 370k tris in the garden, 363 / 433k at the lake, mobile-high, 1 WebGL context → no perf work needed before C.
**v0.8.72:** R72.1 merged with Jannik's HUD test R73.1 (DEV toggle), both kept.
**R72.1 (v0.8.71, GO 04/10):** sleeping Wood Giant gets a torso collider (sleep only); phone Cast button bottom right; locked Lake Race circle truly grey (normal blending).
**R72 big pass (v0.8.70, GO 03/10):** Jannik's SVG action icons; Lake Race circle grey + LOCKED without boat access; Wood Giant sits asleep (Sleep) and wakes on FIGHT (WakeUp + FX, eyes light up); Thora talk on phones like Sigurd (bubble above, compact choices, Back from panels); compact phone race HUD; podium fits phones; general 'Locked' rule.
**GENERAL RULE: LOCKED ACTIONS (Jannik 03/10, R72):** if an action is not possible because of a missing resource, tool, quest, purchase or access, its button is still shown, grey and not tappable, with the label **'Locked'** and the lock icon. Never hide the button for a missing requirement. (Status states like 'Growing · 3 min' keep their own text.)
**R71 fix list (v0.8.61, GO 03/10):** contextual action icons (hammer at the workbench …); Lake Run → **Lake Race**, course hidden until started at the gold circle at the end of Sigurd's dock; Wood Giant hidden until the FIGHT circle (rises from the floor); phone HUD: quest + resources fold to round buttons, minimap = map icon; fishing on foot along the whole lake/stream/waterfall shore + from the boat; stronger golden look pass; DEV stable teleport.
**3D look pass (R70, v0.8.60):** mild shared-world grade (exposure, sky, sun, haze), parameter-only, off in the private garden (greenhouses unchanged), DEV toggle.
**Fishing + stable race HUD (R69, v0.8.50):** dark glass/cream/gold like the rest (CSS only, scoped; Thora talk, shop, podium unchanged).
**Landscape gameplay HUD (R69a, v0.8.40):** one top row (objective chip, Golden Seed chip, horizontal resource chips), minimap top right with a cream ring; phone = resting joystick + round action button; desktop = key hints. Supersedes R66's hidden phone HUD (Jannik's HUD concept 03/10).
**HUD design system (R68, v0.8.30, step 1/3):** shared glass/cream/gold tokens; objective pill with clay leaf; hearts + special bar top left; red Wood Giant bar; Lake Run corner HUD + new result card. Only existing data/icons. Next: R69 fishing + stable restyle (CSS only), R70 3D look pass (measured).
**Rotate screen styled (R67.1, v0.8.21):** brand look (sun burst, logo, outlined phone with a sprout, Lilita One title, leaves).
**Landscape-only phones (R67, v0.8.20, Jannik's decision 03/10):** the game is played in landscape on phones; portrait shows a 'Turn your phone' screen and pauses (iOS cannot lock orientation for home-screen apps). New work is designed and tested for landscape phones, tablets and desktop only.
**Phone HUD (R66, v0.8.10):** on touch only the minimap + two buttons (! objective, bag) are always visible; inventory opens from the bag, gains peek for 2.5 s, a new objective peeks for 5 s. Canvas sizing no longer pins innerHeight px; the closed build bar is truly hidden.
**Knockback + legs (R65.3, v0.8.03):** only the Giant's feet block (you can run between its legs); hits throw you back with a short slide (big Stomp/Slam hits arc with a hop and lock control ~0.45 s) instead of a 0.75 m teleport. Tunables: `PLAYER.knockback/knockTime`, `GIANT.*.push`.
**Arena collision fix (R65.2, v0.8.02):** the Wood Giant blocks with body + both feet (bone-following colliders, world space); open gate leaves block outside the fight, the gate line during it.
**Arena (R65.1, v0.8.01):** stones/wall/gate posts collide (277 circles from the model's vertices), doors only while the fight is on; the Giant wakes only from the golden FIGHT holo marker outside the gate (no more 9 m auto-wake).
**Character specials (R65, v0.8.00):** melee plays Jannik's `Swing`; landed hits fill a per-character meter (6 hits); full → F / special button throws the character's own special (`SpecialSystem.js`, data `SPECIAL`): 9 kinds (lob/pool, pierce, chain, boomerang, cloud, fan, pearl, stun splat, roll). Wood Giant: 0 on bark, ×3 in weak windows. Character meshes stay the locked ones; only the new clips were merged in (Jannik's decimated meshes lose detail on Daisy/Aloe/Cactus).
**Shake fix (R64.2, v0.7.32):** a lethal Stomp/Slam no longer leaves the camera shaking in the garden (shake zeroed on fight end, never applied in the garden). **Throwing (proposal, not built):** each character GLB gets a `Throw` clip (same rig, `Hand_Socket_R` release) + one `assets/combat/proj_<character>.glb` (+Z forward, ≤300 tris, clips `Fly` loop + `Hit` burst); balance proposal: 1 damage, 1.2 s cooldown, 8 m, on the Wood Giant only weak points/root knots (bark 0). Needs its own GO.
**Combat fixes (R64.1, v0.7.31):** wilting mid-boss-fight now ends the fight (before, the portal fade paused the combat update, the Giant stayed in its fight and pulled you back into the arena on 'back to world'); boss camera higher/further back (3.0 m / 9.5 m, FOV 74/62) so the root warnings around you are visible, lifts over the wall at the edge, closed gate fades see-through. Tunables in `GIANT.camera`.
**Lake Run (R64, v0.7.30): C plan step 5 done.** `LakeRunSystem.js` + `LAKE_RUN` (wildsCatalog): buoy course on the lake for Sigurd's boat (start ~6 m off the dock → 6 gates → back), countdown, timer, +1 s shore bump / +2 s drifting log, splits vs PB, medals 45/53/65 s, 3 rewarded runs per day (then practice), first gold +2 Amber, weekly gold +1 Amber, PB ghost boat, seeded weekly board, result card. FishingV1/Boat and the Stable race untouched (reads `f.boat` only). Owned boat = no rent per race. Save `profile.lakeRun`. Not done: boat upgrades (needs a GO on the FishingV1 lock: top speed is capped there), weekly course rotation. Next in C: Thora quest (needs Thora in 3D).
**Wood Giant tuning (R63.1, v0.7.21):** harder (60 HP, bark 1 / weak ×3, no regen, shockwave to hop over, roots from phase 1) + low-angle boss camera looking up at the Giant; scale 0.65. Tunables in `GIANT` (combatCatalog).
**Wood Giant (R63, v0.7.20): first boss done** (`WoodGiantBoss.js`, phases, telegraphed Stomp/Slam, root attacks with weak points, weak windows ×2, arena gate/boundary, boss bar, camera pull-back, sink defeat, Golden Seed first win, 24 h rematch). Next in C: Lake Run → Thora quest.
**Snail enemy (R62, v0.7.10):** garden snails use the enemy contract + GLB; Strike works in the garden; garden = safe zone (min ½ heart).
**Combat (R61, v0.7.00): C plan step 2 done (combat foundation + Mole).** Enemy contract in `CombatSystem` (dormant/warning/emerge/up/attack/hit/burrow/hidden/defeat/gone; enemies only use player position + `hurt()`). Tuning in `combatCatalog.js` (PLAYER, WEAPONS, MOLE, WILT). Death = 'wilting': half the common materials in a recoverable pouch (20 min), mercy 10 min, tools/rare items safe. Next in C: snail as a real enemy on the same contract → Wood Giant + arena (models ready, wood-giant 11.8k tris) → Lake Run → Thora. Pack B (arm swing) replaces the lunge.
**Garden paths (R60.2, v0.6.51):** spine reserved; the greenhouse branch path follows the placed greenhouse (stones + soil repaint + cleared vegetation), default = authored path, bit-identical.
**GardenBuildSystem step 2 (R60.1, v0.6.50): done.** Build/move mode (ghost, walk-to-move, rotate, place/cancel, green/red with reason) from the workbench Home tab; moved structures hide vegetation + small-stone colliders under them (`GardenVegetationMask`, defaults hide nothing). Remaining: `garden_workshop.glb` (Jannik), greenhouse upgrade cost, hedge as a real wall, plot purchase UI (data model ready).
**GardenBuildSystem (R60, v0.6.40, step 1 of 2):** architecture is plot ownership → placement cells → placed structure transform → gameplay systems. Data in `js/data/gardenCatalog.js` (CELL 0.5, GRID_ORIGIN, PLOTS, RESERVED, GATE, MUST_REACH, STRUCTURES with footprint/access/interact/defaultAnchor/localOffset). Systems ask `garden.transformOf(id)` / `wilds.at(id, lx, lz)` / `greenhouse.localToWorld`; no movable private-garden structure keeps its own x/z. Future plots = new PLOTS rects on the same fixed grid + id in `profile.garden.plots`; existing gx/gz never change. Locked-greenhouse exception granted by Jannik 02/10: `setPlacement` only. Hedge effect fixed (`homeLevel >= 3`). **Step 2 (needs GO):** build/move mode UI (ghost, walk-to-move, rotate, confirm/cancel, green/red), vegetation hiding under moved structures, workshop as one `garden_workshop.glb`. Still open: greenhouse upgrade cost, hedge as a real wall.
**Garden visuals + readability (R59.1/R59.2, v0.6.30):** pack C replaces every private-garden placeholder (bench, L1–L3, weeds, potted plant, perk plants; next upgrade = ghost). Every usable wilds thing now has the same cues: glint (~30 m), bright ring + Highlight (6 m), icon bubble (8 m, lock if a tool is missing). Pack B (tools + rack + character use animation) comes from Jannik.
**Wilds visuals (R59, v0.6.20):** Jannik's wilds-loop GLBs replace the R47 placeholders for all six node kinds, the thornbrush and both cache types (`WildsModels.js`, `assets/wilds/`). Missing-asset list for the rest (tools, garden builds, weeds, potted plant stages, combat FX/UI, Thora, icons) was given to Jannik 02/10; pack B (tools) in progress.
**Camera collision (R58.2, v0.6.12, free profile only):** low (<1.3 m) and thin (r<0.7 m) obstacles no longer pull the camera in; a real block lifts the camera (≤1.7 m, ≤0.7 m at buildings) with a 0.9 m / 1.1 m floor instead of R21's 0.32 m (which put the camera inside the character). Tunables live on `CameraOcclusionSystem` (`free*`). Classic R45 keeps R21.
**C progress:** 1. **Boat economy — Done (R58, v0.6.10; boat camera fixed in R58.1 v0.6.11: the free camera followed only while walking, so it froze in the boat; now it glides behind the boat and a swipe gives a 1.2 s look-around):** `BoatEconomySystem` wraps Sigurd's dialog on the live FishingV1 instance (locked file untouched). Discover (Sigurd) → requirement (3 species + Life Vest; vest stitched by Sigurd from `BOAT.vestCost`) → rent per trip (`rentCost`; rental ends on docking as before) → use (waterfall: `waterfallReward` once per local day, `firstWaterfall` Golden Seed once) → own (after `buyAfterTrips` waterfall trips, `buyCost`; owned = no rent). Save: `profile.fishing {starter, own, log}` and `profile.boat {owned, trips, waterfall, lastReward}` (additive, still v3). Before R58 fishing progress was lost on every reload and the vest was 'Coming soon', so the boat could not be reached in normal play. Later: boat upgrades with Lake Run. Next: combat foundation. Next: Jannik's on-device check (performance HUD numbers on iPhone,
PWA from the home screen), then C starts with Boat economy.
**C. Gameplay** (*checkpoint with Jannik after B*): Boat economy → combat foundation → Mole (first combat slice) →
Wood Giant (first boss, reuses combat contract) → Lake Run → Thora quest.
**D. Scale**: asset compression pipeline (Draco/Meshopt/KTX2 decision, asset budgets), instancing, spatial grid/activation,
animation + shadow culling.
**E. Later**: social, alliances, multiplayer backend.
**Not now**: multiplayer backend, ECS/engine rewrite, WebGPU, physics engine, global state/event-bus rewrite, quest
framework, procedural streaming, day/night, skill tree, inventory grid, equipment, crafting tiers, many enemies/bosses.

## Performance budgets
Mobile FPS target 50–60 (minimum ~30 in heavy scenes) · frame budget 16.7 ms · avoid startup long-task series >50 ms ·
as few WebGL contexts as possible · draw calls and triangles measured, not guessed.

## Baseline measurement (R51, headless Chromium 844×390 touch, swiftshader — FPS not representative)
29.0 MB / 102 requests / 22 GLBs before first playable frame · gameReady 8.8 s after init (world-critical 4.4 s) ·
**465 draw calls, 464k triangles per frame** at the home gate · 11 textures, 491 geometries ·
Result Stage iframe loaded at startup with its own WebGL renderer (rAF throttled while hidden).

