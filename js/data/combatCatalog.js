// @ts-nocheck
// R61 combat foundation + Mole. All tuning lives here (half-hearts as the health unit).
// Research basis (02/10/2026): Zelda BotW starts at 3 hearts with weak enemies hitting ~1 heart;
// ARK drops everything in a bag that despawns after 15–30 min; Valheim drops everything on a
// tombstone and gives a ~10 min mercy buff after a death. TGW is cozy + mobile, so: more hearts
// than Zelda (no shield/dodge yet), only HALF of the common materials are dropped, rare items and
// tools are never lost, and a 10 min mercy window means a second wilt drops nothing.

export const PLAYER = {
  hearts: 5,                 // 10 half-hearts
  invuln: 1.0,               // seconds after a hit
  knockback: .75,            // metres (R65.3: a short slide, not a jump; big hits pass their own push)
  knockTime: .22,            // seconds for the default push; pushes ≥ 2 m take 0.42 s with a hop arc and lock control
  regenDelay: 5,             // seconds without damage before hearts return
  regenEvery: 6              // seconds per half-heart
};

// Best owned tool is the weapon (Zelda-like soft lock: you turn to the target when you strike).
export const WEAPONS = {
  hands:   { name: 'Hands',         dmg: 1, reach: 1.5 },
  axe:     { name: 'Stone Axe',     dmg: 2, reach: 1.8 },
  pickaxe: { name: 'Stone Pickaxe', dmg: 2, reach: 1.8 },
  sickle:  { name: 'Sickle',        dmg: 2, reach: 2.1 }
};
export const WEAPON_ORDER = ['sickle', 'axe', 'pickaxe'];
export const ATTACK_COOLDOWN = .45;

// First combat slice: ground clue (shaking mound) → emerge → short attack pattern → burrow →
// reappear nearby → defeated → drop. Only hittable while above ground.
export const MOLE = {
  count: 4, scale: 2.2,
  hp: 4,                     // 2 tool hits, 4 with bare hands
  detect: 6.5,               // the mound starts to shake
  warnTime: 1.2,
  upTime: 3.2,               // above ground before it burrows again
  attackRange: 1.7, attackDamage: 2, attackCooldown: 1.4, attackHitAt: .45,
  relocate: [1.8, 3.6],      // reappears this far from where it burrowed (stays near its home mound)
  leash: 5,                  // never wanders further than this from its home mound
  giveUp: 14,                // player this far away → it calms down and heals
  respawnMin: 10,            // real-time minutes, also offline
  loot: [['clay', 1, 2], ['stone', 1, 2], ['fiber', 1, 1]], lootCount: [2, 3],
  firstBonus: { amber: 1 }   // first Mole ever (Golden Seeds stay reserved for caches/streaks/bosses)
};

// R62: garden snails on the same contract. They crawl to potted plants (eat them), turn on you when
// you stand next to them, and drop shells. The private garden is a safe zone: they can hurt, never wilt you.
export const SNAIL = { scale: 1.6, biteRange: 1.1, biteEvery: 2.2, biteHitAt: .45, biteDamage: 1 };

export const WILT = {
  dropShare: .5,                                  // half of each common material (rounded down)
  materials: ['wood', 'stone', 'clay', 'fiber'],  // amber, shells, seeds and tools are never lost
  pouchMinutes: 20, maxPouches: 3,
  mercyMinutes: 10                                // a second wilt inside this window drops nothing
};

export const LOOT_FILES = { clay: 'loot_clay', stone: 'loot_stone', fiber: 'loot_fiber', wood: 'loot_wood', golden_seed: 'loot_golden_seed', water: 'loot_water' };

// R63 Wood Giant (first boss) — reuses the contract (hp, hurt(), telegraphs, weak windows, drops) and adds
// phases, root ground attacks, weak windows, an arena boundary and a boss bar. No separate boss engine.
export const GIANT = {
  // R63.1 (Jannik: too easy, too big to see): smaller, harder, low-angle boss camera.
  scale: .65, hp: 60, bodyRadius: 2.1, walkSpeed: 1.8,
  wakeRange: 9, arenaRadius: 11.5,
  barkDamage: 1,              // body hits outside a weak window: the bark is hard
  weakMultiplier: 3,          // weapon damage ×3 while the Giant is stuck after a Stomp/Slam
  weakWindow: { stomp: 1.6, slam: 2.2 },
  // impactAt = when it lands (telegraph length); clipImpact = impact time inside the authored clip.
  stomp: { range: 4.6, impactAt: .8, clipImpact: 1.0, radius: 4.5, damage: 2, push: 3.5, footLocal: [2.9, -.5] },  // 1 heart
  slam:  { range: 5.5, impactAt: 1.0, clipImpact: 1.18, radius: 3.6, damage: 4, push: 5, frontLocal: [0, 3.2] }, // 2 hearts
  shockwave: { fromPhase: 1, speed: 6, maxRadius: 11, width: .75, damage: 2, push: 1.5, airborne: .12 },          // hop over it
  phases: [ { at: 1, roots: 2, every: 7, speed: 1 }, { at: .6, roots: 4, every: 5, speed: 1 }, { at: .25, roots: 6, every: 4, speed: 1.3 } ],
  root: { warn: 1.2, radius: 1.05, damage: 2, push: 1.5, weakRange: 1.9, weakDamage: 3, spacing: .9, lead: .6 },
  regenInFight: false,
  // R64.1: higher and further back so the root warnings on the ground around you are in view (was 7.5 / 1.4 / .45 / 68 / 58).
  camera: { distance: 9.5, height: 3.0, chestY: 5.2, lookBlend: .3, fovPortrait: 74, fovLandscape: 62, outside: 2, wallLift: .9, edgeLift: .3, liftMax: 3.5, gateFade: .2 },
  rematchHours: 24,
  reward: { first: { golden_seed: 1, amber: 3, wood: 10 }, again: { amber: 2, wood: 8 } }
};

// R79 Root Bear, second boss (Jannik 05/10, GO): lives in its own grove (SharedLandscape.bearGrove), 65 % of the Wood
// Giant's height, 35 HP and a little weaker. Awake 1.5 min of every real 10 min (clock-based, the same for everyone,
// runs while the game is closed) and wanders the open core; otherwise asleep. Wakes on its own within 8 m (no
// circle) and attacks when you come within 8 m while it wanders. Wood Giant rules: hard bark (1), weak window after
// each attack (×3), first win 1 Golden Seed, rematch after 24 h. Sweep = paw swipe in front (ground ring
// telegraph); Roots = the GLB's own line of root spikes in front (its own telegraph strip).
export const ROOT_BEAR = {
  file: 'root-bear', scale: .595,         // R79.1: 15 % smaller than R79 (0.70 = 0.65 × Wood Giant Idle height 11.66 m / bear Idle height 10.75 units)
  hp: 35, wakeRange: 8, leash: 33, coreMargin: 2.5, walkSpeed: 1.6, wanderSpeed: .9,
  cycleSec: 600, awakeSec: 90,           // awake 1.5 of every 10 min
  barkDamage: 1, weakMultiplier: 3, weakWindow: { sweep: 1.6, roots: 2.0 },
  sweep: { range: 3.6, impactAt: 1.4, center: 4.5, radius: 2.7, damage: 2, push: 3 },          // centre/impact in clip units/seconds; 1 heart
  roots: { range: 9.5, impactFrom: 1.6, radius: 1.15, damage: 3, push: 2.5 },                      // 1½ hearts per spike line
  phases: [{ at: 1, speed: 1, roots: .35 }, { at: .5, speed: 1.2, roots: .55 }],
  body: [['Hips', 1.3], ['Head', .85], ['Hand_L', .5], ['Hand_R', .5], ['Foot_L', .5], ['Foot_R', .5]],
  // Wood Giant's low boss camera, scaled to the bear (chest ≈ 0.65 × 5.2 m); kept inside the open core (no tree in view).
  camera: { distance: 8, height: 2.4, chestY: 3.1, lookBlend: .3, fovPortrait: 74, fovLandscape: 62, edgeLift: .35, liftMax: 3.5 },
  rematchHours: 24,
  reward: { first: { golden_seed: 1, amber: 3, wood: 10 }, again: { amber: 2, wood: 8 } },   // same as the Wood Giant
  grove: { seed: 7979, trees: 30, clusters: 8, ring: [17, 26], scale: [1.3, 1.8], rocks: 4 }
};

// R65 character specials (Jannik's specials pack, assets/combat/specials/). A Sap meter fills from melee hits
// that land; when full, F / the special button throws the character's own special (Throw clip, released at
// 0.375 s from Hand_Socket_R). On the Wood Giant specials only hurt during a weak window (×weakMultiplier) and
// root weak points; the bark takes 0, so a ranged burst can't replace the fight.
export const SPECIAL = {
  chargeHits: 6, releaseAt: .375, scale: 2.2, autoAim: 10,
  // kind: line (pierce) | fan | boomerang | chain | lob | pearl | roll. r = effect radius, dmg per hit.
  chars: {
    aloe:      { name: 'Gel Bomb',     meter: 'Gel',    file: 'aloe',      kind: 'lob',       range: 8,  dmg: 2, r: 1.8, pool: 4, slow: .4 },
    cactus:    { name: 'Thorn Shot',   meter: 'Thorn',  file: 'cactus',    kind: 'line',      range: 12, dmg: 3, speed: 18 },
    daisy:     { name: 'Petal Star',   meter: 'Pollen', file: 'daisy',     kind: 'chain',     range: 9,  dmg: 2, speed: 13, jumps: 3, jumpRange: 5 },
    fern:      { name: 'Leaf Boomerang', meter: 'Spore', file: 'fern',     kind: 'boomerang', range: 8,  dmg: 2, speed: 11 },
    hyacinth:  { name: 'Scent Cloud',  meter: 'Scent',  file: 'hyacinth',  kind: 'lob',       range: 8,  dmg: 1, r: 2.2, cloud: 3, tick: .75 },
    spire:     { name: 'Leaf Fan',     meter: 'Sap',    file: 'spire',     kind: 'fan',       range: 9,  dmg: 2, speed: 14, count: 3, spread: .26 },
    succulent: { name: 'Water Pearl',  meter: 'Dew',    file: 'succulent', kind: 'pearl',     range: 9,  dmg: 2, speed: 7, r: 2, push: 2.5 },
    swamp:     { name: 'Mud Splat',    meter: 'Mud',    file: 'swamp',     kind: 'lob',       range: 8,  dmg: 3, r: 2, stun: 1.5 },
    tulip:     { name: 'Bulb Roll',    meter: 'Bud',    file: 'tulip',     kind: 'roll',      range: 10, dmg: 3, speed: 9, r: 2 }
  }
};
