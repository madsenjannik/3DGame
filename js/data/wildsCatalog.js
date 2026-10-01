// @ts-nocheck
// Core loop v1 data: gather -> craft tools -> clear thornbrush -> loot caches -> upgrade home.
// All balancing lives here so tuning never touches system code.

export const MATERIALS = {
  wood:  { id: 'wood',  name: 'Wood',  icon: '▰' },
  stone: { id: 'stone', name: 'Stone', icon: '◆' },
  clay:  { id: 'clay',  name: 'Clay',  icon: '●' },
  fiber: { id: 'fiber', name: 'Fiber', icon: '≋' },
  amber: { id: 'amber', name: 'Amber', icon: '⬣' }
};

// kind -> gather rules. `tool` boosts yield by +1; `requires` gates the node entirely.
export const NODE_KINDS = {
  wood:    { material: 'wood',  name: 'Fallen Branches', tool: 'axe',     yield: 1, regrowSec: 120 },
  oldlog:  { material: 'wood',  name: 'Old Log',         requires: 'axe', yield: 3, regrowSec: 300 },
  stone:   { material: 'stone', name: 'Loose Stones',    tool: 'pickaxe', yield: 1, regrowSec: 120 },
  boulder: { material: 'stone', name: 'Boulder',         requires: 'pickaxe', yield: 3, regrowSec: 300 },
  clay:    { material: 'clay',  name: 'Clay Bank',       tool: 'pickaxe', yield: 1, regrowSec: 150 },
  fiber:   { material: 'fiber', name: 'Wild Grass',      tool: 'sickle',  yield: 1, regrowSec: 100 },
  bed:     { material: 'fiber', name: 'Planter Bed',     tool: 'sickle',  yield: 2, regrowSec: 90, bonus: { clay: 1 } }
};

export const TOOLS = [
  { id: 'axe',     name: 'Stone Axe',     icon: '🪓', cost: { wood: 4, stone: 2, fiber: 2 },
    effect: '+1 Wood from branches. Lets you chop Old Logs.' },
  { id: 'pickaxe', name: 'Stone Pickaxe', icon: '⛏', cost: { wood: 3, stone: 4, fiber: 2 },
    effect: '+1 Stone and Clay. Lets you break Boulders.' },
  { id: 'sickle',  name: 'Sickle',        icon: '☾', cost: { wood: 2, stone: 3, fiber: 3, clay: 2 },
    effect: '+1 Fiber. Cuts through Thornbrush to reach hidden caches.' }
];

export const HOME_UPGRADES = [
  { level: 1, name: 'Planter Beds',  cost: { wood: 6, clay: 4, fiber: 3 },
    effect: 'Two beds by your workbench regrow Fiber and a little Clay.' },
  { level: 2, name: 'Rain Barrel & Compost', cost: { wood: 8, stone: 6, clay: 4, amber: 1 },
    effect: 'Everything in the wilds regrows 40% faster.' },
  { level: 3, name: 'Seed Shrine', cost: { stone: 10, clay: 8, fiber: 6, amber: 4 },
    effect: '+1 to every gather. Your home is now a true wild garden.' }
];

export const RULES = {
  rainBarrelRegrowFactor: 0.6,
  shrineYieldBonus: 1,
  thornCutReward: { fiber: 3 },
  cacheReward: { amber: 2, extra: 3 } // extra = random common material amount
};
