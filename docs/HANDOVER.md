# THE GROWING WILDS — HANDOVER — 2026-10-01 — R50 CANDIDATE

## Start here
- **Repo:** `madsenjannik/3DGame`, branch `claude/magical-lovelace-nuka97` (GitHub replaces ZIP packages).
- **Live test build:** `https://madsenjannik.github.io/3DGame/` (version shown bottom-left on the start screen).
- **Current build:** v0.5.20 · `CAMERA-R50.2-20261002A` (see `version.js`).
- **Last LOCKED baseline:** R45 (`v0.3.96-R45-HOLO-INDICATOR-LOCKED`). Everything newer is CANDIDATE.
- **Rules:** never build without Jannik's explicit **GO**; analyze, find root cause and define exact scope first.
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

Details: `docs/MASTER-PROJECT-DOCUMENT.md` section 30 and `docs/R47…R49*.md`.

## Quick test (with the dev menu)
1. Start screen → Indstillinger → turn on **Dev-menu** → START → pick a character.
2. DEV → **+20 materialer**, **Alle redskaber**, **Drivhus L1** (reloads).
3. DEV → **3 potter + vand** → **Drivhus** teleport → plant, water → DEV **Spol 5 min frem** ×3 → harvest.
4. DEV → **Ukrudt nu** / **Snegl nu** to see the threat; **Arbejdsbænk** teleport for crafting/upgrades.
5. DEV → **Nærmeste tornekrat** to test cutting + cache.

## Open / pending
- Camera A is default on touch (R50.2). Open: desktop mouse-look if A should also become the PC default.
- Jannik's runtime test + LÅS of R46.2–R50.
- R34B mobile gestures: still awaiting final real-device approval.
- Safari toolbars eat ~⅓ of landscape height: proposed (not built) web-app manifest for fullscreen "Add to Home Screen".
- Proposed (not built): compact HUD for very short landscape; objective card in the world still says "Find the Golden Seed".
- Claude Design project import is blocked in this environment (needs `/design-login` or files uploaded). `Brand_Export.dc.html` was read; its 3D icon needs the missing `icons3d.js`. No scope chosen.

## Regression checklist for the next change
World movement/camera/collision · Private Garden enter/exit + MoveIn · greenhouse build/upgrade untouched ·
Stable RIDE/JUMP + Result/Standings · Fishing marker + loop · map/minimap · desktop + iPhone portrait/landscape.

## First line for the next chat
`Fortsæt THE GROWING WILDS fra GitHub madsenjannik/3DGame (branch claude/magical-lovelace-nuka97). Brug docs/HANDOVER.md + docs/MASTER-PROJECT-DOCUMENT.md som source of truth. Ingen build uden mit GO.`
