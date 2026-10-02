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
  knockback: .75,            // metres
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
  stomp: { range: 4.6, impactAt: .8, clipImpact: 1.0, radius: 4.5, damage: 2, footLocal: [2.9, -.5] },  // 1 heart
  slam:  { range: 5.5, impactAt: 1.0, clipImpact: 1.18, radius: 3.6, damage: 4, frontLocal: [0, 3.2] }, // 2 hearts
  shockwave: { fromPhase: 1, speed: 6, maxRadius: 11, width: .75, damage: 2, airborne: .12 },          // hop over it
  phases: [ { at: 1, roots: 2, every: 7, speed: 1 }, { at: .6, roots: 4, every: 5, speed: 1 }, { at: .25, roots: 6, every: 4, speed: 1.3 } ],
  root: { warn: 1.2, radius: 1.05, damage: 2, weakRange: 1.9, weakDamage: 3, spacing: .9, lead: .6 },
  regenInFight: false,
  // R64.1: higher and further back so the root warnings on the ground around you are in view (was 7.5 / 1.4 / .45 / 68 / 58).
  camera: { distance: 9.5, height: 3.0, chestY: 5.2, lookBlend: .3, fovPortrait: 74, fovLandscape: 62, outside: 2, wallLift: .9, edgeLift: .3, liftMax: 3.5, gateFade: .2 },
  rematchHours: 24,
  reward: { first: { golden_seed: 1, amber: 3, wood: 10 }, again: { amber: 2, wood: 8 } }
};
