# R48 — WILDS THREAT, TRAITS, GOLDEN SEEDS, DAILY (CANDIDATE)

Build: `WILDS-R48-20261001A` · v0.4.20 · base: R47 core loop v1.
Status: **CANDIDATE** — needs Jannik's runtime test before lock.

## Added
- **Overgrowth** (starts once you own the Stone Axe): weeds sprout around the home every ~3.5 min, grow through
  3 stages (~4 min each, also offline, max 5 caught up). Stage 2+ near a Planter Bed stops it regrowing.
  Stage 1–2 pull by hand, stage 3 needs the Sickle. Rewards Fiber.
- **Snails** (once Planter Beds exist): up to 3, crawl to the beds and eat them. Swat twice → Snail Shell.
- **Thorn Hedge Fence** (home L4, costs shells): overgrowth and snails come half as often.
- **Character traits**: one per character (see `PASSIVES` in `js/data/wildsCatalog.js`), shown in the workbench.
- **Golden Seeds**: 3 of the 6 thornbrush caches hold one; every 3rd consecutive full daily set gives one.
  Plant them in the Workbench Seeds tab (needs Seed Shrine) for a permanent perk.
- **Daily requests**: 3 per local day, stable per day + character, streak counter (Today tab).
- **World map**: workbench, discovered caches and snails are now shown as markers.
- HUD: Shell chip; the Golden Seed counter includes wild Golden Seeds.

## Persistence
Same `tgw.save` v1 profile, new fields: `threat`, `perks`, `daily`, `stats.weeds/snails`, thornbrush `seen`.
Older R47 saves load unchanged (missing fields default).

## Not in this candidate
Global day/night lighting (the locked world lighting is untouched), real enemy combat/health, authored GLBs.
