# R47 — CORE LOOP V1 (CANDIDATE)

Build: `CORELOOP-R47-20261001A` · v0.4.10 · base: cleanup pass on top of R46.2.
Status: **CANDIDATE** — needs Jannik's runtime test (desktop + iPhone) before lock.

## The loop
Gather → craft tools at the home workbench → cut Thornbrush → loot amber caches → upgrade home → gather faster/more → repeat.

- **Nodes (shared world, ~51):** Fallen Branches, Loose Stones, Clay Bank, Wild Grass near home, forests, walls, stream/lake and meadow.
  Old Logs need the Stone Axe; Boulders need the Stone Pickaxe. Nodes regrow on real time (90–300 s), also while offline.
- **Workbench** just right of the home path: Tools tab (Stone Axe, Stone Pickaxe, Sickle) and Home tab, plus a "Next goal" line.
- **Thornbrush (6):** blocks a hidden amber cache. Needs the Sickle. Cutting gives Fiber; the cache gives Amber + a random material.
- **Home upgrades:** L1 Planter Beds (two home nodes), L2 Rain Barrel & Compost (regrow 40% faster), L3 Seed Shrine (+1 to every gather).
- All balancing lives in `js/data/wildsCatalog.js`.

## Persistence
`js/core/SaveGame.js` — `SaveGameV1` under one key `tgw.save`, one profile per character
(inventory of wood/stone/clay/fiber/amber, tools, home level, node regrow times, thornbrush state).
Locked systems (Stable, Greenhouse, MoveIn, Fishing) keep their own keys; not migrated in this scope.
DEV routes use a throwaway profile and never write.

## Bug fix found while testing (pre-existing in R46.2)
`game.html` never closed `#stable-race-ui` (hidden unless a race runs). Joystick, the E / action button,
toasts, the movement hint and the loading screen were therefore nested inside it and invisible outside races.
On iPhone this meant no tappable interaction button at all. Fixed by closing the container; Stable result
screen verified unchanged.

## DEV / QA
`game.html?char=<id>&dev=1&devSpawn=home&devWilds=1` gives 40 of every material; `window.__tgw` exposes the game in dev mode only.

## Not in this candidate
Night overgrowth + snail threat, Golden Seed perks, character passives, daily requests, world-map markers for nodes.
