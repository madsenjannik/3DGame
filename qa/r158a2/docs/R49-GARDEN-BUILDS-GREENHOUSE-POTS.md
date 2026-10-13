# R49 — BUILDS IN THE PRIVATE GARDEN + GREENHOUSE POTS (CANDIDATE)

Build: `GARDEN-R49-20261001A` · v0.5.00 · base: R48.1. Status: **CANDIDATE**.

## Rule (Jannik)
Building happens in the **private garden**, not in the shared world (world building may come later).
The greenhouse is for pots and plants. **The three greenhouse levels are not changed** (models, progression,
collision, camera, save key untouched).

## Changed
- World keeps exploration only: resource nodes, Thornbrush + caches. Workbench/upgrades removed from the world;
  the world map shows only discovered caches.
- Private garden: Workbench on the old Lookout site (6.0, 7.6). The old Lookout resource loop
  (`ResourceBuildLoopSystem`: Lookout site, its 4 garden nodes and hotspot) is retired and no longer constructed.
- Garden upgrades: L1 Rain Barrel & Compost (by the pond), L2 Seed Shrine (Golden Seed perks), L3 Thorn Hedge.
  Planter Beds are gone; pots replace them.
- **Greenhouse pots** (greenhouse level 1+): craft up to 3 Terracotta Pots at the workbench (clay 3 + fiber 1;
  uses `assets/props/pot-terracotta.glb`). Pots stand on the authored furniture of the current level
  (L1 lower shelf, L2 left plant table, L3 floor along the back-left). Plant a **Wild Seed** (dropped by Wild Grass),
  water with the **Watering Can** filled at the garden pond, 3 stages × 4 min real time (only while watered),
  harvest Fiber + Clay (chance of Amber and a seed back).
- Threat moved into the garden: overgrowth spawns between the beds and around the greenhouse and pauses
  plant growth when stage 2+ is within 4.4 m; snails come in along the fence and nibble plants back a stage.
- Daily pool gains "Harvest a potted plant".

## Save
`tgw.save` v2. Migration from v1: home level −1 (Planter Beds removed); a paid-for bed level becomes one free pot.
