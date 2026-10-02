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

export const WILT = {
  dropShare: .5,                                  // half of each common material (rounded down)
  materials: ['wood', 'stone', 'clay', 'fiber'],  // amber, shells, seeds and tools are never lost
  pouchMinutes: 20, maxPouches: 3,
  mercyMinutes: 10                                // a second wilt inside this window drops nothing
};

export const LOOT_FILES = { clay: 'loot_clay', stone: 'loot_stone', fiber: 'loot_fiber', wood: 'loot_wood', golden_seed: 'loot_golden_seed', water: 'loot_water' };
