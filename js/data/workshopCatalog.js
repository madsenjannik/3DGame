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
// R173 (Jannik GO 15/10): the workshop in the Ring concept's look (Jannik's workshop_v2_l0..l3), only with ?ring=premium. Authored in
// metres (scale 1). L0 replaces the garden bench. Its posts are one merged mesh (Posts_*), split into one collider per post in the game.
export const WORKSHOP_V2_FILES = ['./assets/garden/workshop_v2_l0.glb', './assets/garden/workshop_v2_l1.glb', './assets/garden/workshop_v2_l2.glb', './assets/garden/workshop_v2_l3.glb'];
export const WORKSHOP_V2_SCALE = 1;
export function workshopV2() { try { return localStorage.getItem('tgw.ring') === 'premium'; } catch { return false; } }
