// @ts-nocheck
// R144 (GO 09/10): the workshop grows around the bench (Jannik's workshop_l1..l3 GLBs in assets/garden/). The bench stands
// alone from the start; level 1 is the first upgrade. Prices agreed 09/10. What levels 2 and 3 unlock is decided later:
// until then the panel shows a padlock placeholder.
export const WORKSHOP_UPGRADES = [
  { level: 1, name: 'Workshop', cost: { wood: 10, stone: 5 }, effect: 'A roof, posts and a proper floor around your bench.', unlocks: null },
  { level: 2, name: 'Workshop · Level 2', cost: { wood: 20, stone: 10, clay: 5 }, effect: 'Walls, a tool wall, crates and firewood.', unlocks: 'Coming soon' },
  { level: 3, name: 'Workshop · Level 3', cost: { wood: 30, stone: 15, amber: 2 }, effect: 'An anvil, shelves and lamps.', unlocks: 'Coming soon' }
];
// Loaded on demand (only the level the player owns), scaled to the garden bench.
export const WORKSHOP_FILES = ['', './assets/garden/workshop_l1.glb', './assets/garden/workshop_l2.glb', './assets/garden/workshop_l3.glb'];
export const WORKSHOP_SCALE = 1.2;
