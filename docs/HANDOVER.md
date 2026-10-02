# THE GROWING WILDS — HANDOVER — 2026-10-02 — R51 (foundation pass)

## Start here
- **Repo:** `madsenjannik/3DGame`, branch `claude/magical-lovelace-nuka97` (GitHub replaces ZIP packages).
- **Live test build:** `https://madsenjannik.github.io/3DGame/` (version shown bottom-left on the start screen).
- **Current build:** v0.6.11 · `BOATCAM-R58.1-20261002A` (see `version.js`).
- **LOCKED baseline:** R50.3 (v0.5.30). R45 is historical rollback reference only. Builds after R50.3 are CANDIDATE.
- **Now:** technical foundation pass (MASTER §31). Gameplay (Boat, combat, Mole …) after Jannik's runtime check.
- **Rules:** never build without Jannik's explicit **GO**; analyze, find root cause and define exact scope first.
  **Every build updates `docs/HANDOVER.md` and `docs/MASTER-PROJECT-DOCUMENT.md` in the same commit** (MASTER §1.7).
  Building lives in the **private garden**. **Do not change the three greenhouse levels.**

## What changed since R45 (all CANDIDATE)
| Build | What |
|---|---|
| R46.2 · v0.4.00 | Claude Start/Splash presentation (unapproved). |
| Cleanup · v0.4.01 | Runs fully offline (vendored three.js addons + React/Babel for the selector), duplicates removed, single version source, docs in `docs/`. |
| R47 · v0.4.10 | Core loop v1: world resource nodes, workbench + tools, Thornbrush + amber caches, SaveGameV1. **Fixed pre-existing bug**: `#stable-race-ui` was never closed in `game.html`, hiding joystick/action button/toasts/loading outside races. |
| R48 · v0.4.20 | Overgrowth + snails, character traits, Golden Seed perks, daily requests, map cache markers. |
| R48.1 · v0.4.21 | Mobile layout (compact HUD materials, landscape panel/start/selector). Built without GO — Jannik flagged this. |
| R49 · v0.5.00 | All building moved into the private garden; Lookout loop retired; greenhouse pots (plant/water/harvest); SaveGame v2 migration. |
| R50 · v0.5.10 | Dev menu (Indstillinger → Dev-menu, works on real save) + crafted tools shown in the HUD. |
| R50.1 · v0.5.11 | DEV-only camera/control variants: A Frit kamera (Genshin-style), B Cozy ovenfra (Animal Crossing-style). |
| R50.2 · v0.5.20 | Jannik chose A: Frit kamera is the default on touch devices; desktop keeps the classic camera. |
| R50.3 · v0.5.30 | A is default everywhere; desktop mouse-look (hold right button + drag) and wheel zoom. **LOCKED.** |
| R51 · v0.5.40 | DEV performance HUD (Dev menu → MÅLING) + DEV logger + startup-time viewer; baseline measured (MASTER §31). |
| R52 · v0.5.50 | Error boundaries: only world + player character are critical; failed subsystems warn and are skipped; character falls back to the procedural sprout. |
| R53 · v0.5.60 | PWA standalone: manifest + Apple metadata on start/selector/game. iPhone: Safari → Del → Føj til hjemmeskærm → opens fullscreen without Safari bars. |
| R54 · v0.5.70 | Staged loading: playable as soon as world + home + character are ready (headless 8.8 s → 2.6 s); Stable/garden/Orangery/Fishing attach in the background. Result Stage iframe loads on race start, unloads 5 s after. Small AssetManager (shared pot GLB loaded once). |
| R55 · v0.5.80 | Adaptive quality (desktop / mobile-high / mobile-low: resolution + shadow map only, same look; touch auto-drops to low below ~42 fps and remembers it) + lifecycle contract (hidden page stops rendering + flushes save; resume without dt jump). Dev menu: force Auto/Lav/Høj/Desktop. |
| R56 · v0.5.90 | Interaction resolver (one active interaction by priority + distance), SaveGame v3 (last-known-good backup, build stamp, corrupt-save recovery, Dev menu copy/download/import save), progression-aware objective card (replaces the stale "Find the Golden Seed" in the world) + short-landscape HUD. |
| R57 · v0.6.00 | Automated regression smoke: `node tests/smoke.mjs` (start→selector, game on desktop + 390×844 + 844×390 + 667×375, missing GLBs, save v1→v3 + reload, DEV-off leak check). 8/8 pass. **Technical foundation (MASTER §31 B) complete → checkpoint before gameplay C.** |
| R58 · v0.6.10 | **C starts: Boat economy v1** (`js/gameplay/BoatEconomySystem.js`, data `BOAT` in wildsCatalog). Discover Sigurd → requirement (3 species + Life Vest, which Sigurd stitches from 6 Fiber + 2 Snail Shell) → rent per trip (3 Wood + 2 Fiber) → waterfall reward once/day (3 Stone, 2 Clay, 1 Amber; first time +1 Golden Seed) → buy after 2 waterfall trips (20 Wood, 12 Fiber, 6 Clay, 4 Amber), no more rent. Fishing gear + catch log now persist in `tgw.save` (were memory-only). Locked FishingV1/Boat→Waterfall untouched (method swap on the instance). Objective falls back to boat steps. Dev menu → BÅD. Smoke 9/9. Device check on iPhone (R57): 60 fps, 217–363 calls, 370–433k tris, mobile-high. |
| R58.1 · v0.6.11 | **Boat camera fix** (Jannik: camera broken in the boat). Root cause: since R50.3 the free camera only recentred while the character walks (`currentSpeed > .6`); seated in the boat speed is always 0 and swipes were blocked, so the camera froze at the boarding angle (repro: boat heading changed, camera yaw stayed 3.14). Fix in `ControlProfiles.js` only: in the boat the free camera always glides behind the boat; swipe (and desktop right-drag) gives a 1.2 s look-around, then it returns. `Game.js` lets swipes through in boat mode for the free profile only. Locked FishingV1 boat camera/rowing untouched; classic R45 profile unchanged. Smoke 10/10 (new boat-camera check). |

Details: `docs/MASTER-PROJECT-DOCUMENT.md` section 30 and `docs/R47…R49*.md`.

## Automated check
`node tests/smoke.mjs` from the repo root (needs Playwright + Chromium). 10/10 must pass before a push (incl. the R58 boat economy and the R58.1 boat camera).

## Quick test (with the dev menu)
1. Start screen → Indstillinger → turn on **Dev-menu** → START → pick a character.
2. DEV → **+20 materialer**, **Alle redskaber**, **Drivhus L1** (reloads).
3. DEV → **3 potter + vand** → **Drivhus** teleport → plant, water → DEV **Spol 5 min frem** ×3 → harvest.
4. DEV → **Ukrudt nu** / **Snegl nu** to see the threat; **Arbejdsbænk** teleport for crafting/upgrades.
5. DEV → **Nærmeste tornekrat** to test cutting + cache.
6. Boat (R58): DEV → **+20 materialer** → **Stang + 3 fiskearter** → **Teleport: Sigurd / bro** → walk to the hatch, talk to Sigurd →
   "Could you make me a life vest?" → "Can I take the boat out?" → board at the dock, row the stream to the waterfall (reward toast) →
   dock. DEV **+2 vandfaldsture** → Sigurd offers "Would you sell me the boat?".

## Open / pending
- Proposed, needs GO (locked): greenhouse loads all three level GLBs (~7.5 MB) at startup; loading only the current level + next would cut startup bytes by ~5 MB.
- Camera A is default everywhere (R50.3) incl. desktop mouse-look; needs Jannik's runtime test.
- Jannik's runtime test + LÅS of R46.2–R50.
- R34B mobile gestures: still awaiting final real-device approval.
- Seen on Jannik's iPhone screenshot (02/10): in the garden the camera can sit right on top of the character (occlusion pull-in near walls?). Not investigated yet; needs a repro spot.
- Boat objective only appears once the garden goals are done (objectives are one linear chain). Parallel tracks = later scope.
- Claude Design project import is blocked in this environment (needs `/design-login` or files uploaded). `Brand_Export.dc.html` was read; its 3D icon needs the missing `icons3d.js`. No scope chosen.

## Regression checklist for the next change
World movement/camera/collision · Private Garden enter/exit + MoveIn · greenhouse build/upgrade untouched ·
Stable RIDE/JUMP + Result/Standings · Fishing marker + loop · map/minimap · desktop + iPhone portrait/landscape.

## First line for the next chat
`Fortsæt THE GROWING WILDS fra GitHub madsenjannik/3DGame (branch claude/magical-lovelace-nuka97). Brug docs/HANDOVER.md + docs/MASTER-PROJECT-DOCUMENT.md som source of truth. Ingen build uden mit GO.`
