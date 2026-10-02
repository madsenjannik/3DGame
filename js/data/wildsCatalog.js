// @ts-nocheck
// Core loop v1 data: gather -> craft tools -> clear thornbrush -> loot caches -> upgrade home.
// All balancing lives here so tuning never touches system code.

export const MATERIALS = {
  wood:  { id: 'wood',  name: 'Wood',  icon: '▰' },
  stone: { id: 'stone', name: 'Stone', icon: '◆' },
  clay:  { id: 'clay',  name: 'Clay',  icon: '●' },
  fiber: { id: 'fiber', name: 'Fiber', icon: '≋' },
  amber: { id: 'amber', name: 'Amber', icon: '⬣' },
  shell: { id: 'shell', name: 'Snail Shell', icon: '◎' },
  golden_seed: { id: 'golden_seed', name: 'Golden Seed', icon: '✦' },
  wild_seed: { id: 'wild_seed', name: 'Wild Seed', icon: '❀' }
};

// kind -> gather rules. `tool` boosts yield by +1; `requires` gates the node entirely.
export const NODE_KINDS = {
  wood:    { material: 'wood',  name: 'Fallen Branches', tool: 'axe',     yield: 1, regrowSec: 120 },
  oldlog:  { material: 'wood',  name: 'Old Log',         requires: 'axe', yield: 3, regrowSec: 300 },
  stone:   { material: 'stone', name: 'Loose Stones',    tool: 'pickaxe', yield: 1, regrowSec: 120 },
  boulder: { material: 'stone', name: 'Boulder',         requires: 'pickaxe', yield: 3, regrowSec: 300 },
  clay:    { material: 'clay',  name: 'Clay Bank',       tool: 'pickaxe', yield: 1, regrowSec: 150 },
  fiber:   { material: 'fiber', name: 'Wild Grass',      tool: 'sickle',  yield: 1, regrowSec: 100, seedChance: .35 }
};

export const TOOLS = [
  { id: 'axe',     name: 'Stone Axe',     icon: '🪓', cost: { wood: 4, stone: 2, fiber: 2 },
    effect: '+1 Wood from branches. Lets you chop Old Logs.' },
  { id: 'can',     name: 'Watering Can',  icon: '💧', cost: { wood: 2, clay: 3 },
    effect: 'Fill it at your garden pond to water the pots in your greenhouse.' },
  { id: 'pickaxe', name: 'Stone Pickaxe', icon: '⛏', cost: { wood: 3, stone: 4, fiber: 2 },
    effect: '+1 Stone and Clay. Lets you break Boulders.' },
  { id: 'sickle',  name: 'Sickle',        icon: '☾', cost: { wood: 2, stone: 3, fiber: 3, clay: 2 },
    effect: '+1 Fiber. Cuts through Thornbrush to reach hidden caches.' }
];

export const HOME_UPGRADES = [
  { level: 1, name: 'Rain Barrel & Compost', cost: { wood: 8, stone: 6, clay: 4, amber: 1 },
    effect: 'Wild nodes regrow 40% faster and potted plants grow 25% faster.' },
  { level: 2, name: 'Seed Shrine', cost: { stone: 10, clay: 8, fiber: 6, amber: 4 },
    effect: '+1 to every gather. Plant Golden Seeds here for perks.' },
  { level: 3, name: 'Thorn Hedge Fence', cost: { wood: 12, fiber: 10, shell: 6 },
    effect: 'Overgrowth and snails reach your garden half as often.' }
];

// Greenhouse pots (greenhouse level 1+). Pots sit on the greenhouse's own furniture.
export const POTS = {
  max: 3, cost: { clay: 3, fiber: 1 },
  stageSec: 240, barrelGrowFactor: .75, canCharges: 3,
  harvest: { fiber: 3, clay: 2 }, amberChance: .25, seedBackChance: .6
};

// Nature fights back once you own your first tool. Timers run on real time, also offline.
export const THREAT = {
  startsWithTool: 'axe',
  weedEverySec: 210, weedStageSec: 240, maxWeeds: 8, offlineCatchUp: 5,
  weedReward: [1, 2, 3],          // fiber per stage when pulled
  sickleStage: 3,                 // stage 3 is thorny and needs the Sickle
  potChokeRadius: 4.4,            // a stage 2+ weed this close (outside or by the greenhouse) pauses potted plants
  snailEverySec: 150, maxSnails: 3, snailHp: 2, snailSpeed: .32, snailShells: 1, // snails only come once a pot has a plant
  fenceFactor: 2                  // Thorn Hedge Fence: intervals x2
};

// Each character brings one gameplay trait (identity, not power creep).
export const PASSIVES = {
  tulip:     { name: 'First Bloom',   text: '+1 Fiber from Wild Grass.', bonus: { fiber: 1 } },
  daisy:     { name: 'Sunny Disposition', text: 'Nodes near your home regrow 30% faster.', homeRegrow: .7 },
  hyacinth:  { name: 'Deep Bulb',     text: '+1 Clay from Clay Banks.', bonus: { clay: 1 } },
  cactus:    { name: 'Prickly Skin',  text: 'Cuts Thornbrush and thorny overgrowth without a Sickle.', thornHands: true },
  fern:      { name: 'Forest Kin',    text: '+1 Wood from branches and Old Logs.', bonus: { wood: 1 } },
  succulent: { name: 'Water Keeper',  text: 'Overgrowth grows 40% slower in your garden.', weedSlow: 1.4 },
  spire:     { name: 'Reach Higher',  text: 'Sees every Thornbrush cache on the map from the start.', revealThorns: true },
  swamp:     { name: 'Muck Friend',   text: 'Snails drop an extra Shell.', shellBonus: 1 },
  aloe:      { name: 'Soothing Sap',  text: '+1 Stone from Loose Stones and Boulders.', bonus: { stone: 1 } }
};

// Golden Seeds are planted at the Seed Shrine for one permanent perk each.
export const PERKS = [
  { id: 'swift',  name: 'Swift Growth', text: 'Everything regrows 25% faster.' },
  { id: 'roots',  name: 'Deep Roots',   text: '+1 Wood and Stone from every gather.' },
  { id: 'ward',   name: 'Thorn Ward',   text: 'Overgrowth spawns half as often.' },
  { id: 'lucky',  name: 'Amber Nose',   text: 'Hidden caches give +2 Amber.' }
];
export const GOLDEN_CACHES = ['thorn-2', 'thorn-4', 'thorn-6']; // these caches also hold a Golden Seed

// Three requests per day, picked deterministically from the date.
export const DAILY = {
  count: 3,
  pool: [
    { id: 'wood',   text: 'Gather 8 Wood',          stat: 'wood',  goal: 8,  reward: { amber: 1 } },
    { id: 'stone',  text: 'Gather 8 Stone',         stat: 'stone', goal: 8,  reward: { amber: 1 } },
    { id: 'clay',   text: 'Gather 5 Clay',          stat: 'clay',  goal: 5,  reward: { amber: 1 } },
    { id: 'fiber',  text: 'Gather 10 Fiber',        stat: 'fiber', goal: 10, reward: { amber: 1 } },
    { id: 'weeds',  text: 'Pull 4 overgrowth weeds', stat: 'weeds', goal: 4, reward: { amber: 1, wood: 3 } },
    { id: 'snails', text: 'Chase off 2 snails',     stat: 'snails', goal: 2, reward: { amber: 1, shell: 1 } },
    { id: 'nodes',  text: 'Gather from 12 nodes',   stat: 'nodes', goal: 12, reward: { amber: 2 } },
    { id: 'harvest', text: 'Harvest a potted plant', stat: 'harvest', goal: 1, reward: { amber: 1, wild_seed: 1 } }
  ],
  streakBonusEvery: 3, streakBonus: { golden_seed: 1 } // every 3rd full day in a row
};

export const RULES = {
  rainBarrelRegrowFactor: 0.6,
  shrineYieldBonus: 1,
  thornCutReward: { fiber: 3 },
  cacheReward: { amber: 2, extra: 3 } // extra = random common material amount
};

// R58 Boat economy: discover (Sigurd) -> requirement (3 species + Life Vest) -> rent per trip ->
// use (waterfall run) -> own after enough waterfall trips. Upgrades come later (Lake Run).
export const BOAT = {
  speciesNeeded: 3,
  vestCost: { fiber: 6, shell: 2 },          // Sigurd stitches a Life Vest from your materials
  rentCost: { wood: 3, fiber: 2 },           // paid per trip until you own her
  buyAfterTrips: 2,                          // waterfall trips before Sigurd will sell
  buyCost: { wood: 20, fiber: 12, clay: 6, amber: 4 },
  waterfallReward: { stone: 3, clay: 2, amber: 1 }, // once per day
  firstWaterfall: { golden_seed: 1 }         // the very first time only
};
