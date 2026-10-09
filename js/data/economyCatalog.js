// @ts-nocheck
// R148+ economy (Jannik 09/10, "Ressourceøkonomi" doc): three separate tracks.
//   Amber          -> Perk Shrine (personal perks, each costs more than the last)
//   Golden Seeds   -> the community tree in the Orangery (fed one seed at a time, long-term goal)
//   Special Seeds  -> one character each, planted at the Sprouting Ring
// New file (tagged import) so cached older modules never miss an export.

// Price of the next perk = PERK_PRICES[number of perks you already own].
import { LAKE_RUN } from './wildsCatalog.js';

export const PERK_PRICES = [10, 15, 20, 30];
export const perkPrice = owned => PERK_PRICES[Math.min(owned, PERK_PRICES.length - 1)];

// R149: Special Seeds, one per character (never a currency). Each is earned once while the character is still locked,
// sits in the Bag, and is planted at the Sprouting Ring (Pop_<id> grows it), which unlocks the character.
// `met` reads the shared save profile (+ the fishing system for the catch log), so a goal reached before R149 counts.
export const SPECIAL_SEEDS = [
  { id: 'tulip',     name: 'Tulip Seed',     how: 'Defeat the Wood Giant',              met: (p) => (p.combat?.giant?.wins | 0) > 0 },
  { id: 'hyacinth',  name: 'Hyacinth Seed',  how: 'Defeat the Root Bear',               met: (p) => (p.combat?.bear?.wins | 0) > 0 },
  { id: 'succulent', name: 'Succulent Seed', how: 'Catch all 5 fish species',           met: (p, g) => (g.fishing?.speciesN?.() | 0) >= 5 || ['roach', 'perch', 'bream', 'pike', 'eel'].every(k => p.fishing?.log?.[k]) },   // R153: the saved catch log counts too
  { id: 'spire',     name: 'Spire Seed',     how: 'Win gold in the Lake Race',          met: (p) => (p.lakeRun?.golds | 0) > 0 || ((p.lakeRun?.best || 0) > 0 && p.lakeRun.best <= LAKE_RUN.medals[0]) },   // R154: a gold time counts even on an unrewarded run
  { id: 'aloe',      name: 'Aloe Seed',      how: 'Harvest a golden greenhouse plant',  met: (p) => !!p.specialHarvest },
  { id: 'fern',      name: 'Fern Seed',      how: 'Hidden in the Dark Forest (coming)', met: () => false }
];

// R150: the community tree in the Orangery starts as bare soil (stage 0) and is fed one Golden Seed at a time.
// TREE_COSTS[s] = seeds that grow stage s into s + 1 (10 steps, 52 seeds to the last stage). Long-term on purpose.
export const TREE_COSTS = [1, 1, 2, 3, 4, 5, 6, 8, 10, 12];
// R153: player-facing stage names (manifest: Jord, Frø, Spire, Ungtræ, Træ, Fylder kuplen, Gennem lanternen, Over taget, Milestone 1-3)
export const TREE_NAMES = ['Soil', 'Seed', 'Sprout', 'Sapling', 'Young tree', 'Fills the dome', 'Through the lantern', 'Above the roof', 'Blossom', 'Golden fruit', 'Light'];

// R151: water the same greenhouse pot on 3 days in a row and the plant in it turns golden ('special'); harvesting a
// special plant the first time gives the Aloe Seed (SpecialSeeds, met = profile.specialHarvest).
export const SPECIAL_POT = { days: 3 };
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const prevDay = key => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d - 1)); };
