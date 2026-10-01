# THE GROWING WILDS — MASTER PROJECT DOCUMENT

**Status:** Canonical project guardrails + current baseline + backlog  
**Date:** 29/09/2026  
**Purpose:** One durable project document for the active The Growing Wilds build chat. This document consolidates the current handover, locked systems, project rules, deferred work, current priorities, and the external technical review.

> **Important:** This document is not permission to build. It is the source of truth for *how* the project must be handled.

---


## CURRENT WORKING STATUS — 01/10/2026

- Last locked canonical baseline: **R39 — `THE-GROWING-WILDS-v0.3.82-STABLE-RESULT-R39-LOCKED.zip`**.
- Active candidate: **R40 — v0.3.90 Claude Podie / Result / Chalkboard 1:1 candidate**, built from R39G after explicit GO.
- R39A/R39B were visual fidelity attempts and are **not locked**.
- R39C uses the supplied `Result leaderboard.zip` as visual source of truth: Claude Variant A Result + mobile Standings bottom sheet.
- Runtime race/leaderboard data remains TGW source of truth. Claude seeded/demo data is never imported.
- R34B remains **MOBILE-TEST LOCKED**, not final.
- R40 requires PC runtime/visual validation before lock. It ports the supplied Claude coded Podie/Result/Chalkboard presentation while TGW remains source of truth for race/result/leaderboard data. R39 remains the last locked canonical baseline.
- Direct `Leaderboard / Result` DEV QA from R39E remains implemented with non-persistent test state and Jumping / Fastest Lap switching.

### Project tooling rule
Do **not** use the Thronemarch skill/workflow for THE GROWING WILDS. It is unrelated to this project. Use the TGW project files, current locked/candidate packages and explicit project guardrails directly.

# 0. CANONICAL GAME IDENTITY / VISION

**Game title:** THE GROWING WILDS  
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

---

# 2. VERSIONING / CURRENT SOURCE OF TRUTH

## 2.1 Previous Stable baseline

`DYM-GAME-v0.3.66-NORTH-STABLE-SHADOW-SPRINT-R23O-CANDIDATE.zip`

R23-series ends at **R23O**. There must be no R23P/R23Q/etc.

## 2.2 Current canonical locked baseline

**`DYM-GAME-v0.3.67-HOME-MOVEIN-R24-LOCKED.zip`**

Build ID: **`HOME-MOVEIN-R24-20260929C`**

Status: **LOCKED — runtime/visual approval received 2026-09-29.**

## 2.3 Current locked working base

**`THE-GROWING-WILDS-v0.3.82-STABLE-RESULT-R39-LOCKED.zip`**

Build ID: **`STABLE-RESULT-R39-20260930A`**

Status: **LOCKED — runtime/visual approval + explicit LÅS received 2026-09-30.**

R39 is the canonical locked working base. It preserves R38A Stable premium UI + in-world 3D Tack Shop, R37 HUD/minimap layout, R36 technical startup/input stability and R35B World Map while locking the approved cinematic Stable Result + Standings presentation. R34B remains MOBILE-TEST LOCKED pending final real-device approval.

Known follow-up: on mobile, some Result/Standings text boxes need a dedicated responsive layout pass relative to the approved desktop composition. This is not part of the R39 lock and must be handled as an isolated UI-only change.

R38A remains locked beneath R39; R37, R36, R35B, R33J Fishing, R32D Summer vegetation, R31 Boat → Waterfall and R23O/R24 protected gameplay remain intact. Future development must branch from a copy of R39 unless Jannik explicitly approves another base.

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

# 9. CABIN / FISHING — CURRENT STATUS

Preserve:
- terrace/dock physics
- terrain access
- waterline
- pier collision
- boat floor
- Boat_Idle
- ropes
- bridge/terrace water safety
- Sigurd conversation framing
- no wall/facade camera clipping
- visible dialog replies
- rod+bait handover
- worms tin
- shop/dialog flow
- fishing marker/rings
- pipe smoke

Fishing flow:
**Sigurd → Bamboo Rod + Worms → fishing spot → Cast → Bite → Reel → Catch → Catch Log**

## Still-open Fishing polish

1. rod visibility
2. better cast/fishing camera
3. clearer cast presentation
4. fishing-loop presentation/polish
5. reel/catch camera

These are backlog polish items, not active Stable bugs.

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

# 12. STABLE UI — RIDE SETUP / 3D TACK SHOP LOCKED; RESULT UI DEFERRED

## Ride Setup

Functionality exists.

Shows only real choices:
- Birk
- Kul
- Solvej
- discipline
- PB/target where relevant
- START
- EXIT

Do not show unimplemented cosmetics.

Status: **R38A LOCKED — premium Ride Setup presentation approved.**

Thora / Tack Shop:
- dedicated Stable conversation presentation
- in-world 3D Tack Room shop scene
- physical tack/care props
- dedicated shop camera; player out of shot; Thora remains visible
- prev/next browsing + selected-item highlight
- no active purchase economy yet

## Result / Leaderboard

Functionality exists:
- time
- penalties
- medal/new best
- Today
- This Week
- All Time
- leaderboard
- Ride Again
- Exit

Future:
**premium visual redesign**

---

# 13. CURRENT DEFERRED DEVELOPMENT BACKLOG — ORDER

This is the preferred sequence after R24 is locked unless a new runtime bug changes priority.

1. **Fishing polish**
   - rod visibility
   - cast/fishing camera
   - cast presentation
   - fishing-loop polish
   - reel/catch camera

2. **Mobile run + jump/control polish**

3. **Ride Setup premium redesign — LOCKED R38A**

4. **Result / Leaderboard premium redesign**

5. **Boat → Waterfall gameplay/navigation**

6. **Boat rent/buy economy**

7. **Lookout Scout Mode**

8. **Resource / Build / Crafting — next layer**

9. **Snail integration**

10. **Mole integration**

11. **Wood Giant integration**

12. **Lake Run integration**

13. **Alliance/team garden permissions**

14. **Multiplayer/social foundation**

15. **Season/progression meta-system**

Additional deferred Stable progression:
- Thora quest / real Stable unlock

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

# 17. LAKE RUN — DEFERRED

Prototype/design exists.

Direction includes:
- weekly activity
- limited attempts
- ghosts
- obstacles
- mobile interaction

Not current priority.

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

R39 is the current canonical locked working base. R37 HUD/minimap layout, R36 technical startup/input stability, R35B World Map, R33J Fishing, R32D Summer water vegetation, R31 Boat → Waterfall/DEV cleanup and the protected R23O/R24 gameplay systems remain locked beneath it. R34B mobile gesture controls remain MOBILE-TEST LOCKED pending final real-device approval.

Completed recent scopes:
- Mobile gesture controls — MOBILE-TEST LOCKED (R34B, final mobile approval still pending)
- World map / minimap + feathered edge — LOCKED (R35B)
- Technical startup/input stability — LOCKED (R36)
- HUD/status placement around minimap — LOCKED (R37)
- Ride Setup + Thora in-world 3D Tack Shop — LOCKED (R38A)

Preferred development order now:
1. Result / Leaderboard premium redesign
2. Boat rent/buy economy
3. Lookout Scout Mode
4. Resource / Build / Crafting — next layer
5. Snail integration / reusable basic enemy framework
6. Mole integration
7. Wood Giant integration
8. Lake Run integration
9. Thora quest / real Stable unlock
10. Alliance/team garden permissions
11. Multiplayer/social foundation
13. Season/progression meta-system

Separate pending validation:
- Final real-device approval of R34B mobile gesture controls.
- Performance profiling can continue from R36 metrics (`window.__TGW_STARTUP_METRICS__` / `?perf=1`) before any further load optimization.

Before any implementation, agree the next exact scope and wait for explicit **GO**.

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

# R41 ACTIVE CANDIDATE — CLAUDE RESULT CHOREOGRAPHY (2026-10-01)

Build ID: `STABLE-RESULT-R41-20261001A`

R41 branches from R40 candidate and completes the supplied Claude Result/Podie prototype choreography: timed result reveal, medal motion/material effects, rank settle, typed Thora bubble, medal-driven podium #1/#2/#3 semantics, clickable standings scopes and direct DEV medal-state QA. TGW remains source of truth for real race/result/leaderboard/ghost/save data. No protected riding/gameplay systems are changed. R39 remains the last locked canonical base until explicit runtime approval and lock.


---

# R42 ACTIVE CANDIDATE — LIVE PODIUM + RACE MARKERS (2026-10-01)

Build ID: `STABLE-R42-20261001A`

R42 branches from R41. R41 Claude Result choreography remains intact. Physical podium occupancy is now derived from the real Today leaderboard top three rather than medal class, keeping medal award and leaderboard placement independent. Standings gains a Done action. Normal Stable race entry no longer opens the old setup card: Fastest Lap and Jumping now use pulsing world-space start circles and direct mounted proximity interaction. Protected race timing/routes/checkpoints/ghost/save/riding/camera systems remain unchanged. R39 remains the last locked canonical base until explicit runtime approval and lock.


---

# R45 HOLO INDICATOR LOCK — 2026-10-01

The RIDE / JUMP / FISH world interaction marker treatment is LOCKED. Canonical presentation uses the Claude holo-indicator component with clean floating text only (no label container and no text stroke). RIDE is anchored to the actual Fastest Lap start position; JUMP and FISH retain their approved positions. Label floating/wave motion and existing interaction behavior are retained.
