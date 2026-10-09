// @ts-nocheck
// Core loop:
//   shared world: gather nodes, cut thornbrush, loot amber caches (exploration)
//   private garden: workbench, garden upgrades, greenhouse pots, overgrowth + snails (home)
// R59: wilds nodes, thornbrush and caches use Jannik's GLBs (WildsModels.js) once loaded; the procedural
// meshes below stay as the instant placeholder and as the fallback if a GLB fails.
import * as THREE from 'three';
import { damp, radialTexture } from '../visual/VisualKit.js';
import { MATERIALS, NODE_KINDS, TOOLS, HOME_UPGRADES, RULES, PASSIVES, PERKS, GOLDEN_CACHES } from '../data/wildsCatalog.js';
import { WildsThreatSystem } from './WildsThreatSystem.js?build=SELECT-R136-20261009A';
import { DailyRequests } from './DailyRequests.js';
import { GardenPotsSystem } from './GardenPotsSystem.js?build=SELECT-R136-20261009A';
import { loadWildsModels, loadGardenModels, WildsModel } from './WildsModels.js';
import { FIXED_HEDGE as HEDGE } from '../data/gardenCatalog.js';

const HOME = { x: 0, z: 4.7 };
// Private-garden placements (garden space, ground y = 0). The workbench replaces the old Lookout site.
// R60: workshop / rain / shrine positions come from GardenBuildSystem (placed transforms, profile.garden).
// These are only the fallback when no placement system is attached (identical to the catalog defaults).
const FALLBACK = { workshop: { x: 6.0, z: 7.6, rot: 3, yaw: -Math.PI / 2 }, rain: { x: -6.6, z: .8, rot: 0, yaw: 0 }, shrine: { x: -9.2, z: 2.8, rot: 0, yaw: 0 } };
const QSC = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const COMMON = ['wood', 'stone', 'clay', 'fiber'];
const big0 = kind => kind === 'oldlog' || kind === 'boulder';

function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ease = p => p * p * (3 - 2 * p);
const sstep = (a, b, x) => ease(Math.min(1, Math.max(0, (x - a) / (b - a))));
// R59.1 readability: every usable thing shows the same three cues. A soft glint from ~22 m, the bright
// ground ring + Highlight sparks within 6 m, and an icon bubble (material, or a lock) within ~8 m.
const CUE = { glintFar: 30, glintFull: 22, highlight: 6, bubbleFar: 8.5, bubbleFull: 6 };
const ICONS = {
  wood: ['▰', '#c89a66'], oldlog: ['▰', '#c89a66'], stone: ['◆', '#d4d7cb'], boulder: ['◆', '#d4d7cb'],
  clay: ['●', '#d98a60'], fiber: ['≋', '#a9d06f'], thorn: ['☾', '#e3ecbf'], amber: ['⬣', '#f2b24c'], golden: ['✦', '#ffd76a']
};

function labelSprite(text, width = 420) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  ctx.fillStyle = 'rgba(25,34,22,.72)'; ctx.beginPath(); ctx.roundRect(6, 12, width - 12, 72, 30); ctx.fill();
  ctx.fillStyle = '#f4f1e8'; ctx.font = '700 30px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, 49); texture.needsUpdate = true;
  sprite.scale.set(width / 260, .37, 1);
  return sprite;
}

function costMet(inv, cost) { return Object.entries(cost).every(([id, n]) => (inv.get(id) || 0) >= n); }

export class WildsLoopSystem {
  constructor({ world, state, save, hud, greenhouse, garden }) {
    this.garden = garden || null;
    this.world = world; this.L = world.sharedLandscape; this.state = state; this.save = save; this.hud = hud;
    this.profile = save.profile;
    this.root = new THREE.Group(); this.root.name = 'WILDS_CORE_LOOP'; this.L.root.add(this.root);
    this.gardenRoot = new THREE.Group(); this.gardenRoot.name = 'WILDS_PRIVATE_GARDEN'; world.privateRoot.add(this.gardenRoot);
    this.greenhouse = greenhouse;
    this.nodes = []; this.thorns = []; this.current = null; this.flashT = 0;
    this.listeners = new Set();
    this.passive = PASSIVES[state.player.characterId] || null;
  }

  init() {
    this.buildShared();
    this.hydrateInventory();
    this.placeNodes();
    this.buildWorkbench();
    this.buildHomeUpgrades();
    this.placeThorns();
    loadWildsModels().then(m => this.applyModels(m)).catch(e => console.warn('[TGW] wilds models unavailable', e));
    loadGardenModels().then(m => this.applyGardenModels(m)).catch(e => console.warn('[TGW] garden models unavailable', e));
    this.applyHomeLevel(false);
    this.pots = new GardenPotsSystem(this, this.greenhouse);
    this.threat = new WildsThreatSystem(this);
    this.daily = new DailyRequests(this);
    if (this.passive?.revealThorns) for (const t of this.thorns) if (!this.profile.thorns[t.id]) this.profile.thorns[t.id] = 'seen';
    if (Object.keys(this.profile.inventory).length) this.hud?.materials?.classList.add('show');
    return this;
  }

  // ---------- persistence ----------
  hydrateInventory() {
    for (const [id, n] of Object.entries(this.profile.inventory)) {
      const have = this.state.inventory.get(id) || 0;
      if (n > have) this.state.addItem(id, n - have);
    }
    this.state.events.on('inventory:changed', e => {
      if (!MATERIALS[e.id]) return;
      if (e.amount > 0) this.profile.inventory[e.id] = e.amount; else delete this.profile.inventory[e.id];
      this.save.persist(); this.emit();
    });
  }
  has(tool) { return !!this.profile.tools[tool]; }
  inv() { return this.state.inventory; }
  give(id, n) { if (n > 0) this.state.addItem(id, n); }
  pay(cost) { if (!costMet(this.inv(), cost)) return false; for (const [id, n] of Object.entries(cost)) this.state.removeItem(id, n); return true; }
  track(stat, n) { this.daily?.track(stat, n); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) fn(); }

  // Obstacles are removed from the world lists when inactive; a zero radius would still
  // block because resolveCollisions adds the player radius.
  setObstacle(o, on) {
    if (!o) return;
    const lists = [this.world.colliders, this.world.obstacles], present = this.world.colliders.includes(o);
    if (on && !present) lists.forEach(l => l.push(o));
    if (!on && present) lists.forEach(l => { const i = l.indexOf(o); if (i >= 0) l.splice(i, 1); });
  }

  // ---------- R60 placed structures ----------
  // (named `structureAt` because `this.placed` is the node-placement list)
  structureAt(id) { return this.garden?.transformOf(id) || FALLBACK[id]; }
  // Structure-local point (+z = front) to world for a placed structure.
  at(id, lx = 0, lz = 0) { const t = this.structureAt(id), [s, c] = QSC[t.rot & 3]; return { x: t.x + lx * c + lz * s, z: t.z - lx * s + lz * c }; }

  // R60 step 2: a structure was moved in build mode → move its group, colliders and threat layout.
  applyPlacements() {
    const put = (g, id) => { if (!g) return; const t = this.structureAt(id); g.position.set(t.x, 0, t.z); g.rotation.y = t.yaw; };
    put(this.workbench?.root, 'workshop'); put(this.upgradeL1, 'rain'); put(this.upgradeL2, 'shrine');
    const wb = this.at('workshop'); if (this.workbenchObstacle) { this.workbenchObstacle.x = wb.x; this.workbenchObstacle.z = wb.z; }
    if (this.upgradeObstacles) {
      const b = this.at('rain'), c = this.at('rain', -.95, 0), sh = this.at('shrine');
      [[0, b], [1, c], [2, sh]].forEach(([i, p]) => { this.upgradeObstacles[i].x = p.x; this.upgradeObstacles[i].z = p.z; });
    }
    this.threat?.relayout?.();
  }

  // R58 progression-aware guidance shared by the HUD objective card and the workbench panel.
  // Returns { title, copy } for the single most useful next step.
  goal() {
    const p = this.profile, inv = id => this.state.inventory.get(id) || 0, pots = this.pots, g = (title, copy) => ({ title, copy });
    const costText = cost => Object.entries(cost || {}).map(([id,n]) => `${n} ${MATERIALS[id]?.name || id}`).join(' · ');
    if (!Object.keys(p.inventory).length && !this.has('axe')) return g('Gather natural materials', 'Outside your garden gate · Gather Wood, Stone, Clay and Fiber from the resources that glint.');
    if (!this.has('axe')) { const axe = TOOLS.find(t => t.id === 'axe'); return g('Craft your first tool', `Workbench in your garden · Requires ${costText(axe?.cost)}. Craft the Stone Axe.`); }
    if (!pots?.available()) return g('Build your greenhouse', 'At the back of your garden. Pots and plants live there.');
    if (pots.owned() < 1) return g('Craft a pot', 'Workbench → Tools → Terracotta Pot. It goes straight onto the greenhouse shelf.');
    if (!this.has('can')) { const can = TOOLS.find(t => t.id === 'can'); return g('Craft a Watering Can', `Workbench in your garden · Requires ${costText(can?.cost)}. Fill it at the garden pond.`); }
    const slots = p.pots.slots;
    if (slots.every((x, i) => i >= pots.owned() || !x) && inv('wild_seed') < 1) return g('Find a Wild Seed', 'Wild Grass in the wilds sometimes drops one.');
    if (slots.some((x, i) => i < pots.owned() && !x) && inv('wild_seed') > 0) return g('Plant a Wild Seed', 'Plant it in an empty pot in your greenhouse.');
    if (slots.some(x => x && !x.wet && x.stage < 3)) return p.water > 0 ? g('Water your plant', 'A plant in your greenhouse is thirsty.') : g('Fill your Watering Can', 'A plant is thirsty. Fill the can at the garden pond.');
    if (slots.some(x => x && x.stage >= 3)) return g('Harvest your plant', 'A plant in your greenhouse has flowered.');
    if (this.threat?.weeds.some(x => x.state === 'alive')) return g('Pull the overgrowth', 'Weeds are creeping into your garden. Pull them before they reach the greenhouse.');
    const tool = TOOLS.find(t => !this.has(t.id));
    if (tool) return g(`Craft the ${tool.name}`, `Workbench in your garden · Requires ${costText(tool.cost)}. Gather anything missing in the wilds.`);
    if (inv('amber') < 1 && p.homeLevel < 2 && Object.values(p.thorns).filter(v => v === 'looted').length < this.thorns.length)
      return g('Clear Thornbrush', 'Cut Thornbrush in the wilds with your Sickle to reach hidden amber caches.');
    const up = HOME_UPGRADES[p.homeLevel];
    if (up) return g(`Build ${up.name}`, `Workbench in your garden · Requires ${costText(up.cost)}.`);
    if (inv('golden_seed') > 0 && PERKS.some(k => !p.perks[k.id])) return g('Plant your Golden Seed', 'At the Seed Shrine (workbench → Seeds).');
    const boat = this.boatGoal?.(); if (boat) return boat; // R58 boat economy (set by BoatEconomySystem)
    return g('Keep your garden growing', 'More of the wilds will open with the seasons.');
  }

  // Greenhouse loads in the background (R55); pots follow it once it exists.
  setGreenhouse(g) { this.greenhouse = g; if (this.pots) this.pots.gh = g; }

  gardenObstacle(x, z, r, kind) { const o = { x, z, r, height: 1, kind, traversal: 'blocked', space: 'garden' }; this.setObstacle(o, true); return o; }

  // ---------- shared assets ----------
  buildShared() {
    const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .9, ...o });
    this.mat = {
      bark: M(0x7f5f3e), cut: M(0xc4a06e), moss: M(0x6d8a45), stone: M(0x8e9285, { flatShading: true }), stoneDark: M(0x6f7368, { flatShading: true }),
      clay: M(0xa96f4c, { roughness: 1 }), clayLight: M(0xc48a61), stem: M(0x9caf72), band: M(0xd2a15f),
      thorn: M(0x4a5a30, { flatShading: true }), thornDark: M(0x3a2f22, { flatShading: true }), plank: M(0x8a6a45), plankLight: M(0xb08a5c),
      soil: M(0x5e4632, { roughness: 1 }), leaf: M(0x6f9a48), water: M(0x6f8f96, { roughness: .2 }),
      amber: new THREE.MeshPhysicalMaterial({ color: 0xe7a23a, roughness: .2, clearcoat: .9, emissive: 0xb86f16, emissiveIntensity: .55, transparent: true, opacity: .92 }),
      gold: new THREE.MeshPhysicalMaterial({ color: 0xd9a441, roughness: .25, clearcoat: .8, emissive: 0xb07a1a, emissiveIntensity: .4 })
    };
    this.glowTex = radialTexture([[0, 'rgba(255,245,196,.62)'], [.34, 'rgba(212,225,153,.22)'], [1, 'rgba(212,225,153,0)']]);
    this.amberTex = radialTexture([[0, 'rgba(255,214,140,.9)'], [.3, 'rgba(255,170,70,.35)'], [1, 'rgba(255,170,70,0)']]);
    this.ringGeo = new THREE.RingGeometry(.5, .57, 40);
  }

  mesh(geo, mat, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], shadow = true) {
    const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.scale.set(...s); m.rotation.set(...r);
    m.castShadow = shadow; m.receiveShadow = true; return m;
  }

  nodeVisual(kind, rand) {
    const g = new THREE.Group(), m = this.mat;
    if (kind === 'wood') {
      for (let i = 0; i < 3; i++) g.add(this.mesh(new THREE.CylinderGeometry(.06, .075, .7 + rand() * .2, 7), m.bark, [(i - 1) * .14, .07 + (i === 1 ? .1 : 0), (rand() - .5) * .1], [1, 1, 1], [0, rand() * 3, Math.PI / 2 + (rand() - .5) * .3]));
    } else if (kind === 'oldlog') {
      g.add(this.mesh(new THREE.CylinderGeometry(.24, .28, 2.1, 9), m.bark, [0, .24, 0], [1, 1, 1], [0, 0, Math.PI / 2]));
      g.add(this.mesh(new THREE.CylinderGeometry(.245, .245, .02, 9), m.cut, [1.05, .24, 0], [1, 1, 1], [0, 0, Math.PI / 2]));
      g.add(this.mesh(new THREE.SphereGeometry(.2, 7, 5), m.moss, [-.3, .45, .05], [2.2, .45, 1.1]));
    } else if (kind === 'stone') {
      [[0, .1, 0, .2], [-.2, .07, .1, .14], [.18, .07, .06, .13]].forEach(([x, y, z, s], i) => g.add(this.mesh(new THREE.DodecahedronGeometry(1, 0), m.stone, [x, y, z], [s, s * .7, s * .9], [i * .3, i * .7, 0])));
    } else if (kind === 'boulder') {
      g.add(this.mesh(new THREE.DodecahedronGeometry(.85, 0), m.stoneDark, [0, .45, 0], [1, .72, .9], [.2, rand() * 3, 0]));
      g.add(this.mesh(new THREE.DodecahedronGeometry(.4, 0), m.stone, [.62, .2, .25], [1, .7, 1], [.5, .2, 0]));
      g.add(this.mesh(new THREE.SphereGeometry(.3, 7, 5), m.moss, [-.15, .86, .1], [1.6, .3, 1.1]));
    } else if (kind === 'clay') {
      g.add(this.mesh(new THREE.SphereGeometry(.42, 12, 8), m.clay, [0, .06, 0], [1, .36, .8], [0, 0, 0], false));
      [-.17, .17].forEach((x, i) => g.add(this.mesh(new THREE.IcosahedronGeometry(.11, 0), m.clayLight, [x, .16, .05], [1, .55, .8], [i * .4, 0, i * .2])));
    } else if (kind === 'fiber') {
      for (let i = 0; i < 9; i++) { const a = (i - 4) * .12; g.add(this.mesh(new THREE.CylinderGeometry(.016, .026, .55 + rand() * .2, 5), m.stem, [Math.sin(a) * .16 + (rand() - .5) * .08, .3, (rand() - .5) * .12], [1, 1, 1], [(rand() - .5) * .2, 0, a], false)); }
    }
    return g;
  }

  // ---------- placement ----------
  freeAt(x, z, clear) {
    for (const c of this.world.colliders) { if ((c.space || 'garden') !== 'world') continue; const r = c.r + clear; if ((x - c.x) ** 2 + (z - c.z) ** 2 < r * r) return false; }
    return true;
  }
  valid(x, z, clear = .8, placed = []) {
    const L = this.L;
    if (Math.hypot(x - L.W0.x, z - L.W0.z) > 175) return false;
    const h = L.worldHeight(x, z); if (h < L.WL + .45 || h > 22) return false;
    if (L.terrainSlope(x, z) > .5) return false;
    if (L.pathDistance(x, z) < 1.6 || L.streamDistance(x, z) < 2.6) return false;
    if (Math.hypot(x - L.lake.x, z - L.lake.z) < L.lake.r + 2 || Math.hypot(x - L.pond.x, z - L.pond.z) < L.pond.r + 1.8) return false;
    if (Math.abs(x) < 10 && z > -9 && z < 19.5) return false; // home yard + workbench corner
    if (Math.hypot(x - L.orangery.x, z - L.orangery.z) < L.orangery.clearance + 3) return false;
    if (Math.hypot(x - L.stable.x, z - L.stable.z) < L.stable.clearance + 6) return false;
    if (Math.hypot(x - L.cabin.x, z - L.cabin.z) < 13 || Math.hypot(x - L.waterfall.x, z - L.waterfall.z) < 10) return false;
    if (Math.hypot(x - L.viewpoint.x, z - L.viewpoint.z) < 6.5 || Math.hypot(x - L.bridge.x, z - L.bridge.z) < 8) return false;
    for (const p of placed) if (Math.hypot(x - p.x, z - p.z) < Math.max(3.2, clear + (p.clear || 0) + 1)) return false;
    return this.freeAt(x, z, clear);
  }
  // Try `make()` candidates until one is valid (deterministic per seed).
  find(make, clear, placed, tries = 400) { for (let i = 0; i < tries; i++) { const p = make(); if (p && this.valid(p.x, p.z, clear, placed)) return p; } return null; }

  placeNodes() {
    const L = this.L, rand = rng(4711), placed = [], trees = L.treeXY;
    const nearTree = (minR, maxR) => () => {
      const i = Math.floor(rand() * trees.length / 2) * 2, a = rand() * 6.283, d = 2.1 + rand() * 1.2;
      const x = trees[i] + Math.cos(a) * d, z = trees[i + 1] + Math.sin(a) * d, r = Math.hypot(x - HOME.x, z - HOME.z);
      return r >= minR && r <= maxR ? { x, z } : null;
    };
    const nearWall = () => { const W = L.walls[Math.floor(rand() * L.walls.length)], k = Math.floor(rand() * (W.length - 1)), q = rand(), [ax, az] = W[k], [bx, bz] = W[k + 1], len = Math.hypot(bx - ax, bz - az) || 1, s = (rand() < .5 ? -1 : 1) * (2.4 + rand() * 2.4); return { x: ax + (bx - ax) * q - (bz - az) / len * s, z: az + (bz - az) * q + (bx - ax) / len * s }; };
    const nearView = () => { const a = rand() * 6.283, r = 7 + rand() * 7; return { x: L.viewpoint.x + Math.cos(a) * r, z: L.viewpoint.z + Math.sin(a) * r }; };
    const nearWater = () => {
      if (rand() < .55) { const k = Math.floor(rand() * (L.stream.length - 1)), q = rand(), [ax, az] = L.stream[k], [bx, bz] = L.stream[k + 1], len = Math.hypot(bx - ax, bz - az) || 1, s = (rand() < .5 ? -1 : 1) * (3 + rand() * 2); return { x: ax + (bx - ax) * q - (bz - az) / len * s, z: az + (bz - az) * q + (bx - ax) / len * s }; }
      const a = rand() * 6.283, r = L.lake.r + 2.4 + rand() * 2.5; return { x: L.lake.x + Math.cos(a) * r, z: L.lake.z + Math.sin(a) * r };
    };
    const meadow = () => { const a = rand() * 6.283, r = Math.sqrt(rand()) * (L.meadow.r - 2); return { x: L.meadow.x + Math.cos(a) * r, z: L.meadow.z + Math.sin(a) * r }; };
    const pathEdge = () => { const P = L.pathSamples[Math.floor(rand() * L.pathSamples.length)], v = P[Math.floor(rand() * P.length)], a = rand() * 6.283, d = 2.2 + rand() * 2; return { x: v.x + Math.cos(a) * d, z: v.z + Math.sin(a) * d }; };
    // Starter cluster: a few of each common node within a short walk of the gate.
    const starter = () => { const a = rand() * 6.283, r = 10 + rand() * 16; return { x: HOME.x + Math.cos(a) * r, z: 22 + Math.sin(a) * r * .8 }; };

    const plan = [
      ['wood', 3, starter, .7], ['stone', 2, starter, .7], ['fiber', 3, starter, .6], ['clay', 1, nearWater, .8],
      ['wood', 9, nearTree(14, 150), .7], ['oldlog', 4, nearTree(35, 165), 1.3],
      ['stone', 7, () => rand() < .6 ? nearWall() : pathEdge(), .7], ['boulder', 4, () => rand() < .5 ? nearView() : nearWall(), 1.2],
      ['clay', 7, nearWater, .8], ['fiber', 9, () => rand() < .6 ? meadow() : pathEdge(), .6]
    ];
    const count = {};
    for (const [kind, n, make, clear] of plan) {
      for (let i = 0; i < n; i++) {
        const p = this.find(make, clear, placed); if (!p) continue;
        count[kind] = (count[kind] || 0) + 1;
        const node = this.addNode(`${kind}-${count[kind]}`, kind, p.x, p.z, rand, clear);
        placed.push({ x: p.x, z: p.z, clear });
        this.nodes.push(node);
      }
    }
    this.placed = placed;
  }

  addNode(id, kind, x, z, rand, clear = .7) {
    const def = NODE_KINDS[kind], root = new THREE.Group();
    root.position.set(x, this.L.groundHeight(x, z), z); root.rotation.y = rand() * 6.283;
    const body = this.nodeVisual(kind, rand); root.add(body);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .22 }));
    glow.position.y = .5; glow.scale.setScalar(kind === 'oldlog' || kind === 'boulder' ? 2.4 : 1.5); root.add(glow);
    const ring = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: 0xf4e3a6, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .04; ring.scale.setScalar(kind === 'oldlog' || kind === 'boulder' ? 2 : 1); root.add(ring);
    const bubble = this.makeBubble(kind, big0(kind) ? 1.6 : 1.1); root.add(bubble);
    this.root.add(root);
    const big = kind === 'oldlog' || kind === 'boulder';
    // The log lies along its local X axis, so it gets three colliders along that axis.
    const ax = Math.cos(root.rotation.y), az = -Math.sin(root.rotation.y);
    const obstacles = kind === 'oldlog' ? [-.7, 0, .7].map(o => this.world.addObstacle({ x: x + ax * o, z: z + az * o, r: .4, height: .6, kind: 'wilds-oldlog' }))
      : kind === 'boulder' ? [this.world.addObstacle({ x, z, r: .75, height: .9, kind: 'wilds-boulder' })] : [];
    const node = { id, kind, def, x, z, root, body, glow, ring, bubble, near: 0, reach: big ? 2.1 : 1.45, state: 'ready', t: 0, obstacles };
    const regrowAt = this.profile.nodes[id];
    if (regrowAt && regrowAt > Date.now()) { node.state = 'regrowing'; body.scale.setScalar(.001); glow.visible = false; obstacles.forEach(o => this.setObstacle(o, false)); }
    return node;
  }

  regrowMs(def, node) {
    const nearHome = node && Math.hypot(node.x - HOME.x, node.z - HOME.z) < 40;
    return def.regrowSec * 1000 * (this.profile.homeLevel >= 1 ? RULES.rainBarrelRegrowFactor : 1) * (this.profile.perks.swift ? .75 : 1) * (nearHome && this.passive?.homeRegrow || 1);
  }
  yieldFor(def) {
    return def.yield + (def.tool && this.has(def.tool) ? 1 : 0) + (this.profile.homeLevel >= 2 ? RULES.shrineYieldBonus : 0)
      + (this.passive?.bonus?.[def.material] || 0) + (this.profile.perks.roots && (def.material === 'wood' || def.material === 'stone') ? 1 : 0);
  }
  canCut() { return this.has('sickle') || !!this.passive?.thornHands; }
  // Garden props a weed must not sprout on.
  homeProps() {
    const w = this.at('workshop'), b = this.at('rain'), c = this.at('rain', -.95, 0), sh = this.at('shrine');
    return [{ x: w.x, z: w.z, r: 1.1 }, { x: b.x, z: b.z, r: .9 }, { x: c.x, z: c.z, r: .8 }, { x: sh.x, z: sh.z, r: 1 }];
  }
  plantSeed(perkId) {
    const perk = PERKS.find(p => p.id === perkId);
    if (!perk || this.profile.perks[perkId] || this.profile.homeLevel < 2 || !this.pay({ golden_seed: 1 })) return false;
    this.profile.perks[perkId] = true; this.save.persist(); this.hud?.showToast(`${perk.name} takes root`); this.emit();
    if (this.shrineModel) { this.shrineModel.play(['Plant'], () => this.shrineModel.loop('Idle')); this.syncPerks(perkId); }
    return true;
  }
  mapMarkers() {
    // The map only shows the shared world, so only discovered caches are marked.
    const out = [];
    for (const t of this.thorns) if (this.profile.thorns[t.id] === 'seen' || this.profile.thorns[t.id] === 'cleared') out.push({ type: 'quest', x: t.x, z: t.z, label: 'Cache' });
    return out;
  }

  // ---------- workbench + home upgrades ----------
  buildWorkbench() {
    const g = new THREE.Group(), m = this.mat, w = this.structureAt('workshop');
    g.position.set(w.x, 0, w.z); g.rotation.y = w.yaw;
    g.add(this.mesh(new THREE.BoxGeometry(1.5, .1, .72), m.plankLight, [0, .78, 0]));
    for (const x of [-.66, .66]) for (const z of [-.28, .28]) g.add(this.mesh(new THREE.BoxGeometry(.09, .78, .09), m.plank, [x, .39, z]));
    g.add(this.mesh(new THREE.BoxGeometry(1.4, .06, .6), m.plank, [0, .25, 0]));
    g.add(this.mesh(new THREE.BoxGeometry(1.5, .72, .06), m.plank, [0, 1.2, -.36]));
    // Tool silhouettes on the backboard light up as tools are crafted.
    this.rack = {};
    const handle = new THREE.CylinderGeometry(.025, .025, .5, 6);
    [['axe', -.5, new THREE.BoxGeometry(.18, .12, .04)], ['pickaxe', -.15, new THREE.BoxGeometry(.36, .06, .04)], ['sickle', .2, new THREE.TorusGeometry(.1, .02, 5, 12, Math.PI)], ['can', .52, new THREE.CylinderGeometry(.08, .09, .14, 8)]].forEach(([id, x, headGeo]) => {
      const t = new THREE.Group(); t.position.set(x, 1.2, -.3);
      t.add(this.mesh(handle, m.plank, [0, 0, 0], [1, 1, 1], [0, 0, 0], false));
      t.add(this.mesh(headGeo, m.stoneDark, [0, .24, 0], [1, 1, 1], [0, 0, 0], false));
      t.visible = this.has(id); g.add(t); this.rack[id] = t;
    });
    g.add(this.mesh(new THREE.DodecahedronGeometry(.12, 0), m.stone, [-.4, .9, .1]));
    g.add(this.mesh(new THREE.CylinderGeometry(.13, .13, .14, 9), m.cut, [.35, .9, .12]));
    const label = labelSprite('WORKBENCH'); label.position.set(0, 2.05, 0); g.add(label);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .25 }));
    glow.position.y = 1.1; glow.scale.setScalar(2.6); g.add(glow);
    this.gardenRoot.add(g); this.workbench = { root: g, glow, near: 0 };
    this.workbenchObstacle = this.gardenObstacle(w.x, w.z, .8, 'wilds-workbench');
  }

  buildHomeUpgrades() {
    const m = this.mat, rand = rng(99);
    const at = (id) => { const t = this.structureAt(id), g = new THREE.Group(); g.position.set(t.x, 0, t.z); g.rotation.y = t.yaw; g.visible = false; this.gardenRoot.add(g); return g; };
    // L1: rain barrel + compost bin by the garden pond.
    const l1 = at('rain');
    l1.add(this.mesh(new THREE.CylinderGeometry(.36, .32, .9, 12), m.plank, [0, .45, 0]));
    l1.add(this.mesh(new THREE.CylinderGeometry(.33, .33, .03, 12), m.water, [0, .88, 0], [1, 1, 1], [0, 0, 0], false));
    for (const y of [.2, .7]) l1.add(this.mesh(new THREE.TorusGeometry(.355, .018, 5, 16), m.stoneDark, [0, y, 0], [1, 1, 1], [Math.PI / 2, 0, 0], false));
    l1.add(this.mesh(new THREE.BoxGeometry(.8, .55, .8), m.plank, [-.95, .28, 0]));
    l1.add(this.mesh(new THREE.SphereGeometry(.38, 8, 6), m.soil, [-.95, .5, 0], [1, .45, 1], [0, 0, 0], false));
    this.upgradeL1 = l1;
    // L2: seed shrine with a floating golden seed.
    const l2 = at('shrine');
    l2.add(this.mesh(new THREE.CylinderGeometry(.55, .7, .4, 8), m.stone, [0, .2, 0]));
    l2.add(this.mesh(new THREE.CylinderGeometry(.3, .4, .7, 8), m.stoneDark, [0, .75, 0]));
    const seed = this.mesh(new THREE.SphereGeometry(.16, 14, 10), m.gold, [0, 1.45, 0], [.82, 1.2, .82]); l2.add(seed);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.amberTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .7 }));
    halo.position.y = 1.45; halo.scale.setScalar(1.6); l2.add(halo);
    this.upgradeL2 = l2; this.shrineSeed = seed;
    // L3: thorn-hedge clumps along the inside of the garden fence (visual only).
    const l3 = new THREE.Group(); l3.visible = false; this.gardenRoot.add(l3); this.upgradeL3 = l3;
    for (const [hx, hz] of HEDGE) {
      const b = new THREE.Group(); b.position.set(hx, 0, hz); l3.add(b);
      b.add(this.mesh(new THREE.DodecahedronGeometry(.42, 0), m.thorn, [0, .32, 0], [1.25, .8, .9], [0, rand() * 3, 0]));
      b.add(this.mesh(new THREE.ConeGeometry(.05, .2, 4), m.thornDark, [.3, .5, .1], [1, 1, 1], [0, 0, -1.2], false));
      b.add(this.mesh(new THREE.ConeGeometry(.05, .2, 4), m.thornDark, [-.3, .45, -.1], [1, 1, 1], [0, 0, 1.2], false));
    }
    const mk = (x, z, r, kind) => { const o = { x, z, r, height: 1, kind, traversal: 'blocked', space: 'garden' }; return o; };
    const b = this.at('rain'), c = this.at('rain', -.95, 0), sh = this.at('shrine');
    this.upgradeObstacles = [mk(b.x, b.z, .55, 'wilds-barrel'), mk(c.x, c.z, .5, 'wilds-compost'), mk(sh.x, sh.z, .65, 'wilds-shrine')];
  }

  applyHomeLevel(celebrate) {
    const lvl = this.profile.homeLevel;
    this.upgradeL1.visible = lvl >= 1; this.setObstacle(this.upgradeObstacles[0], lvl >= 1); this.setObstacle(this.upgradeObstacles[1], lvl >= 1);
    this.upgradeL2.visible = lvl >= 2; this.setObstacle(this.upgradeObstacles[2], lvl >= 2);
    this.upgradeL3.visible = lvl >= 3;
    this.syncGardenModels(celebrate);
    if (celebrate) this.hud?.showToast(`${HOME_UPGRADES[lvl - 1].name} built`);
  }

  craft(toolId) {
    const tool = TOOLS.find(t => t.id === toolId);
    if (!tool || this.has(toolId) || !this.pay(tool.cost)) return false;
    this.profile.tools[toolId] = true; this.profile.stats.crafted++;
    if (this.rack[toolId]) this.rack[toolId].visible = !this.benchModel; this.save.persist();
    this.benchModel?.play(['Craft'], () => this.benchModel.loop('Idle'));
    this.hud?.showToast(`${tool.name} crafted`); this.emit();
    return true;
  }

  upgradeHome() {
    const next = HOME_UPGRADES[this.profile.homeLevel];
    if (!next || !this.pay(next.cost)) return false;
    this.profile.homeLevel = next.level; this.save.persist();
    this.applyHomeLevel(true); this.emit();
    return true;
  }

  // ---------- thornbrush + caches ----------
  placeThorns() {
    const rand = rng(31337), anchors = [[-24, 34], [50, 70], [36, -6], [-46, -46], [104, 74], [104, -30]];
    anchors.forEach(([ax, az], i) => {
      const p = this.find(() => { const a = rand() * 6.283, r = rand() * 24; return { x: ax + Math.cos(a) * r, z: az + Math.sin(a) * r }; }, 2.4, this.placed, 600);
      if (!p) return;
      this.placed.push({ x: p.x, z: p.z, clear: 2.4 });
      this.thorns.push(this.addThorn(`thorn-${i + 1}`, p.x, p.z, rand));
    });
  }

  addThorn(id, x, z, rand) {
    const m = this.mat, root = new THREE.Group(); root.position.set(x, this.L.groundHeight(x, z), z); this.root.add(root);
    // Cache (amber crystals in a small crate) sits inside the bramble ring.
    const cache = new THREE.Group(); root.add(cache);
    cache.add(this.mesh(new THREE.BoxGeometry(.6, .34, .44), m.plank, [0, .17, 0]));
    const crystals = [[0, .5, 0, .2], [-.14, .42, .08, .12], [.15, .44, -.05, .13]].map(([cx, cy, cz, s]) => { const c = this.mesh(new THREE.OctahedronGeometry(1, 0), m.amber, [cx, cy, cz], [s * .7, s * 1.4, s * .7]); cache.add(c); return c; });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.amberTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .65 }));
    halo.position.y = .7; halo.scale.setScalar(1.9); cache.add(halo);
    const brush = new THREE.Group(); root.add(brush);
    for (let k = 0; k < 13; k++) {
      const a = k / 13 * 6.283 + rand() * .3, r = .95 + rand() * .45, h = .9 + rand() * .8;
      brush.add(this.mesh(new THREE.ConeGeometry(.26 + rand() * .12, h, 5), k % 3 ? m.thorn : m.thornDark, [Math.cos(a) * r, h / 2 - .05, Math.sin(a) * r], [1, 1, 1], [(rand() - .5) * .5, rand() * 3, (rand() - .5) * .5]));
      for (let s = 0; s < 2; s++) brush.add(this.mesh(new THREE.ConeGeometry(.03, .22, 4), m.thornDark, [Math.cos(a) * (r + .18), .3 + rand() * h * .7, Math.sin(a) * (r + .18)], [1, 1, 1], [0, 0, Math.PI / 2 + a], false));
    }
    for (let k = 0; k < 4; k++) { const a = rand() * 6.283; brush.add(this.mesh(new THREE.TorusGeometry(.9 + rand() * .4, .035, 4, 18, Math.PI), m.thornDark, [0, .35 + k * .22, 0], [1, 1, 1], [Math.PI / 2 + (rand() - .5) * .6, 0, a], false)); }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    glow.position.y = .9; glow.scale.setScalar(3.2); root.add(glow);
    const bubble = this.makeBubble('thorn', 2.2); root.add(bubble);
    const saved = this.profile.thorns[id], t = { id, x, z, root, cache, brush, crystals, halo, glow, bubble, near: 0, t: 0, phase: saved === 'cleared' || saved === 'looted' ? saved : 'wild' };
    t.obstacle = this.world.addObstacle({ x, z, r: 1.45, height: 1.6, kind: 'wilds-thornbrush' });
    if (t.phase !== 'wild') { brush.visible = false; this.setObstacle(t.obstacle, false); }
    if (t.phase === 'looted') cache.visible = false;
    return t;
  }

  // ---------- R59.1 readability cues ----------
  iconTex(key, locked) {
    const id = key + (locked ? ':locked' : ''); this.iconCache ||= {};
    if (this.iconCache[id]) return this.iconCache[id];
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), [ch, col] = ICONS[key] || ['?', '#fff'];
    x.fillStyle = 'rgba(28,36,24,.82)'; x.beginPath(); x.arc(64, 64, 54, 0, Math.PI * 2); x.fill();
    x.lineWidth = 5; x.strokeStyle = 'rgba(255,241,184,.9)'; x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = locked ? 'rgba(255,255,255,.45)' : col; x.font = '700 62px Manrope, "Segoe UI Symbol", sans-serif'; x.fillText(ch, 64, 68);
    if (locked) { x.font = '40px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.fillText('🔒', 92, 94); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (this.iconCache[id] = t);
  }
  makeBubble(key, y) {
    const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.iconTex(key, false), transparent: true, depthWrite: false, depthTest: false, opacity: 0 }));
    b.scale.setScalar(.52); b.position.y = y; b.renderOrder = 10; b.visible = false; b.userData.baseY = y; return b;
  }
  // One place drives glint, ring, Highlight and bubble for a node or thornbrush. `on` = usable right now.
  cue(o, model, d, near, on, key, locked, time) {
    const vis = on ? 1 - sstep(CUE.glintFull, CUE.glintFar, d) : 0;
    if (o.glow) { o.glow.visible = vis > .01; o.glow.material.opacity = vis * (.34 + Math.sin(time * 2.4 + o.x) * .1) + near * .2; }
    model?.ring(Math.min(.8, vis * .3 + near * .45)); model?.highlight(on && d < CUE.highlight);
    const b = o.bubble; if (!b) return;
    const bo = on ? 1 - sstep(CUE.bubbleFull, CUE.bubbleFar, d) : 0;
    b.visible = bo > .01; if (!b.visible) return;
    b.material.opacity = bo; const tex = this.iconTex(key, locked); if (b.material.map !== tex) { b.material.map = tex; b.material.needsUpdate = true; }
    b.position.y = b.userData.baseY + Math.sin(time * 2 + o.x) * .05;
  }

  // ---------- R59.2 private-garden models ----------
  applyGardenModels(models) {
    const fresh = (group, keep = []) => { for (const c of [...group.children]) if (!keep.includes(c)) group.remove(c); };
    this.gardenMixers = [];
    const add = m => { this.gardenMixers.push(m); return m; };
    if (models.workbench) {
      const w = this.workbench, label = w.root.children.find(c => c.isSprite && c !== w.glow);
      fresh(w.root, [label, w.glow]); const m = this.benchModel = add(new WildsModel(models.workbench, 'workbench'));
      w.root.add(m.root); m.loop('Idle'); label.position.y = 1.75; w.glow.position.y = .8;
    }
    if (models.barrel) {
      fresh(this.upgradeL1); const m = this.barrelModel = add(new WildsModel(models.barrel, 'barrel'));
      m.root.rotation.y = Math.PI; m.root.position.x = -.43; this.upgradeL1.add(m.root);
    }
    if (models.shrine) {
      fresh(this.upgradeL2); const m = this.shrineModel = add(new WildsModel(models.shrine, 'shrine'));
      m.root.rotation.y = Math.PI / 2; this.upgradeL2.add(m.root); this.perkModels = {}; this.gardenPerkGltf = models;
    }
    if (models.hedge) {
      fresh(this.upgradeL3); this.hedgeModels = HEDGE.map(([hx, hz]) => {
        const m = add(new WildsModel(models.hedge, 'hedge', { node: 'Home_ThornHedge_Seg_Straight' }));
        m.root.position.set(hx, 0, hz); m.root.rotation.y = Math.abs(hx) > 11 ? Math.PI / 2 : 0; this.upgradeL3.add(m.root); return m;
      });
    }
    this.gardenModels = models;
    this.threat?.useModels?.(models); this.pots?.useModels?.(models);
    this.syncGardenModels(false);
    for (const k of PERKS) if (this.profile.perks[k.id]) this.syncPerks(null);
  }

  // Built levels idle; the NEXT level shows its ghost silhouette (Locked) as a "build me here" hint.
  syncGardenModels(celebrate) {
    const lvl = this.profile.homeLevel;
    const show = (group, model, level) => {
      if (!model) return;
      if (lvl >= level) { group.visible = true; if (celebrate && lvl === level) model.play(['Build'], () => model.loop('Idle')); else if (!model.busy()) model.loop('Idle'); }
      else if (lvl === level - 1 && model.has('Locked')) { group.visible = true; model.loop('Locked'); }
      else group.visible = false;
    };
    show(this.upgradeL1, this.barrelModel, 1); show(this.upgradeL2, this.shrineModel, 2);
    if (this.hedgeModels) { this.upgradeL3.visible = lvl >= 3; for (const m of this.hedgeModels) { if (lvl >= 3 && celebrate) m.play(['Build'], () => m.loop('Idle')); else if (lvl >= 3 && !m.busy()) m.loop('Idle'); } }
  }

  // Perk plants sit in the shrine's Slot_0-3 (PERKS order). `grown` = the one just planted (plays Grow).
  syncPerks(grown) {
    if (!this.shrineModel || !this.gardenPerkGltf) return;
    PERKS.forEach((k, i) => {
      if (!this.profile.perks[k.id] || this.perkModels[k.id] || !this.gardenPerkGltf[k.id]) return;
      const slot = this.shrineModel.root.getObjectByName(`Home_SeedShrine_Slot_${i}`); if (!slot) return;
      const m = this.perkModels[k.id] = new WildsModel(this.gardenPerkGltf[k.id], k.id); m.root.scale.setScalar(1); slot.add(m.root); this.gardenMixers.push(m);
      if (grown === k.id) m.play(['Grow'], () => m.loop('Idle')); else m.loop('Idle');
    });
  }

  // ---------- R59 authored models ----------
  applyModels(models) {
    const swap = (group, model) => { while (group.children.length) group.remove(group.children[0]); group.add(model.root); };
    for (const node of this.nodes) {
      const g = models[node.kind]; if (!g) continue;
      if (node.state === 'gathering') { node.body.position.y = 0; this.finishGather(node); } // placeholder anim was mid-way
      if (node.state === 'growing') { node.state = 'ready'; }
      const m = node.model = new WildsModel(g, node.kind); swap(node.body, m);
      node.ring.visible = false; node.body.position.y = 0;
      node.bubble.userData.baseY = m.top + .55; node.glow.position.y = Math.max(.35, m.top * .6);
      if (node.kind === 'oldlog') { // fit the three colliders to the authored log (≈1.5 m long)
        const ax = Math.cos(node.root.rotation.y), az = -Math.sin(node.root.rotation.y);
        node.obstacles.forEach((o, i) => { const off = (i - 1) * .48; o.x = node.x + ax * off; o.z = node.z + az * off; o.r = .36; o.height = .7; });
      }
      if (node.state === 'regrowing') { node.body.scale.setScalar(1); node.body.visible = false; }
      else { node.body.scale.setScalar(1); node.body.visible = true; m.loop('Idle'); }
    }
    for (const t of this.thorns) {
      const tg = models.thicket, cg = models[GOLDEN_CACHES.includes(t.id) ? 'golden' : 'amber'];
      if (t.phase === 'cutting') { t.brush.visible = false; this.clearThorn(t); }
      if (t.phase === 'looting') t.phase = 'looted';
      if (tg) {
        const m = t.thicket = new WildsModel(tg, 'thicket'); swap(t.brush, m); t.bubble.userData.baseY = m.top + .6; t.brush.scale.set(1, 1, 1); t.brush.rotation.y = 0;
        t.brush.visible = true; if (t.phase === 'wild') m.loop('Idle'); else m.loop('Cleared');
      }
      if (cg) {
        const m = t.cacheModel = new WildsModel(cg, GOLDEN_CACHES.includes(t.id) ? 'golden' : 'amber'); swap(t.cache, m); t.cache.scale.setScalar(1); t.cache.position.y = 0;
        t.cache.visible = true; m.loop(t.phase === 'looted' ? 'Looted' : 'Closed');
      }
    }
    this.modelsReady = true;
  }

  clearThorn(t) {
    this.setObstacle(t.obstacle, false); t.phase = 'cleared';
    for (const [id, n] of Object.entries(RULES.thornCutReward)) this.give(id, n);
    this.hud?.showToast(`Thornbrush cleared  Fiber +${RULES.thornCutReward.fiber}`);
    this.profile.thorns[t.id] = 'cleared'; this.save.persist();
  }

  // ---------- interaction ----------
  interact(hit, character) {
    if (!hit) return false;
    if (hit.type === 'wilds-workbench') { this.onOpenWorkbench?.(); return true; }
    if (hit.type === 'wilds-gather') return this.gather(hit.node, character);
    if (hit.type === 'wilds-cut') return this.cut(hit.thorn, character);
    if (hit.type === 'wilds-cache') return this.loot(hit.thorn, character);
    if (hit.type === 'wilds-weed') return this.threat.pull(hit.weed, character);
    if (hit.type === 'wilds-snail') return this.threat.swat(hit.snail, character);
    if (hit.type === 'wilds-pot') return this.pots.interact(hit, character);
    return false;
  }

  gather(node, character) {
    if (node.state !== 'ready') return false;
    if (node.def.requires && !this.has(node.def.requires)) return false;
    node.state = 'gathering'; node.t = 0; node.character = character;
    if (node.model) node.model.play(node.model.def.action, () => { node.body.visible = false; this.finishGather(node); });
    return true;
  }

  finishGather(node) {
    const def = node.def, n = this.yieldFor(def);
    this.give(def.material, n);
    let text = `${MATERIALS[def.material].name} +${n}`;
    for (const [id, b] of Object.entries(def.bonus || {})) { this.give(id, b); text += `  ${MATERIALS[id].name} +${b}`; }
    if (def.seedChance && Math.random() < def.seedChance) { this.give('wild_seed', 1); text += '  Wild Seed +1'; }
    this.hud?.materials?.classList.add('show'); this.hud?.showToast(text);
    node.character?.flash(); this.profile.stats.gathered++;
    try { this.state.events?.emit?.('fx:gather', { kind: def.material, n, x: node.x, y: node.root?.position?.y ?? 0, z: node.z }); } catch {}   // R129 resource feedback (visual only)
    node.state = 'regrowing'; node.obstacles.forEach(o => this.setObstacle(o, false)); this.profile.nodes[node.id] = Date.now() + this.regrowMs(def, node); this.save.persist();
    this.track(def.material, n); this.track('nodes', 1); for (const [id, b] of Object.entries(def.bonus || {})) this.track(id, b);
  }

  cut(thorn, character) {
    if (thorn.phase !== 'wild' || !this.canCut()) return false;
    thorn.phase = 'cutting'; thorn.t = 0; character.flash();
    if (thorn.thicket) thorn.thicket.play(['Cut'], () => { thorn.thicket.loop('Cleared'); this.clearThorn(thorn); });
    return true;
  }

  loot(thorn, character) {
    if (thorn.phase !== 'cleared') return false;
    thorn.phase = 'looting'; thorn.t = 0; character.flash();
    const extra = COMMON[Math.floor(Math.random() * COMMON.length)], amber = RULES.cacheReward.amber + (this.profile.perks.lucky ? 2 : 0), seed = GOLDEN_CACHES.includes(thorn.id);
    this.give('amber', amber); this.give(extra, RULES.cacheReward.extra); if (seed) this.give('golden_seed', 1);
    this.hud?.showToast(`Hidden cache: Amber +${amber}  ${MATERIALS[extra].name} +${RULES.cacheReward.extra}${seed ? '  Golden Seed +1!' : ''}`);
    this.profile.thorns[thorn.id] = 'looted'; this.save.persist();
    if (thorn.cacheModel) thorn.cacheModel.play(['Open'], () => { thorn.phase = 'looted'; thorn.cacheModel.loop('Looted'); });
    return true;
  }

  // ---------- frame ----------
  update(dt, time, character, space = 'world') {
    const px = character.position.x, pz = character.position.z, now = Date.now();
    let best = null; const offer = (c) => { if (!best || c.distance < best.distance) best = c; };
    this.daily?.update();
    this.threat?.tick(now);
    if (space === 'garden') return this.updateGarden(dt, time, character, offer, () => best);

    for (const node of this.nodes) {
      if (!node.root.visible) continue;
      const d = Math.hypot(px - node.x, pz - node.z);
      // Far away: skip visuals, but never freeze a gather/grow animation that is already running.
      if (d > 70 && (node.state === 'ready' || node.state === 'regrowing')) { if (node.state === 'regrowing' && now >= (this.profile.nodes[node.id] || 0)) this.regrown(node, true); continue; }
      const inReach = d < node.reach && node.state === 'ready';
      node.near += ((inReach ? 1 : 0) - node.near) * damp(6, dt);
      if (node.model && (d < 45 || node.model.busy())) node.model.update(dt);
      const nodeLocked = !!(node.def.requires && !this.has(node.def.requires));
      this.cue(node, node.model, d, node.near, node.state === 'ready', node.kind, nodeLocked, time);
      if (node.state === 'ready') {
        if (!node.model) { node.ring.material.opacity = node.near * .45; node.ring.rotation.z += dt * .2; }
        if (inReach) {
          const locked = node.def.requires && !this.has(node.def.requires);
          const tool = locked && TOOLS.find(t => t.id === node.def.requires);
          offer({ type: 'wilds-gather', node, distance: d, disabled: !!locked, locked: !!locked, label: locked ? 'Locked' : `Gather ${node.def.name}`, reason: locked && tool ? `Needs a ${tool.name}` : undefined });   // R116 reason   // R72: needs ${tool.name}
        }
      } else if (node.state === 'gathering') {
        if (node.model) continue;           // the GLB clip ends the gather (WildsModel.play callback)
        node.t += dt; const p = Math.min(1, node.t / .45), e = ease(p);
        node.body.scale.setScalar(Math.max(.001, 1 - e)); node.body.position.y = e * .4; node.glow.material.opacity *= .9;
        if (p >= 1) { node.body.position.y = 0; node.glow.visible = false; node.ring.material.opacity = 0; this.finishGather(node); }
      } else if (node.state === 'regrowing') {
        if (now >= (this.profile.nodes[node.id] || 0)) this.regrown(node, false);
      } else if (node.state === 'growing') {
        if (node.model) continue;           // Regrow clip → Idle (see regrown)
        node.t += dt; const p = Math.min(1, node.t / 1.2), s = ease(p) * (1 + Math.sin(p * Math.PI) * .12);
        node.body.scale.setScalar(Math.max(.001, s)); if (p >= 1) { node.body.scale.setScalar(1); node.state = 'ready'; }
      }
    }

    for (const t of this.thorns) {
      const d = Math.hypot(px - t.x, pz - t.z);
      if (d > 80 && (t.phase === 'wild' || t.phase === 'cleared' || t.phase === 'looted')) continue;
      if (t.thicket && (d < 45 || t.thicket.busy())) t.thicket.update(dt);
      if (t.cacheModel && (d < 45 || t.cacheModel.busy())) t.cacheModel.update(dt);
      t.near += (((t.phase === 'wild' && d < 2.65) || (t.phase === 'cleared' && d < 1.4) ? 1 : 0) - t.near) * damp(6, dt);
      const wild = t.phase === 'wild', open = t.phase === 'cleared', golden = GOLDEN_CACHES.includes(t.id);
      if (open) t.bubble.userData.baseY = (t.cacheModel?.top ?? .6) + .55;
      this.cue(t, wild ? t.thicket : t.cacheModel, d, t.near, wild || open, wild ? 'thorn' : golden ? 'golden' : 'amber', wild && !this.canCut(), time);
      if (wild) t.cacheModel?.ring(0); else t.thicket?.ring(0);
      t.halo.material.opacity = .5 + Math.sin(time * 2.2 + t.x) * .12;
      t.crystals.forEach((c, i) => { c.rotation.y += dt * (.5 + i * .2); });
      if (t.phase === 'wild') {
        if (d < 30 && !this.profile.thorns[t.id]) { this.profile.thorns[t.id] = 'seen'; this.save.persist(); this.hud?.showToast('Thornbrush spotted: something glows inside'); }
        if (d < 2.65) offer({ type: 'wilds-cut', thorn: t, distance: d, disabled: !this.canCut(), locked: !this.canCut(), label: this.canCut() ? 'Cut Thornbrush' : 'Locked', reason: this.canCut() ? undefined : 'Needs a Sickle' });
      } else if (t.phase === 'cutting') {
        if (t.thicket) continue;            // Cut clip → clearThorn
        t.t += dt; const p = Math.min(1, t.t / .7), e = ease(p);
        t.brush.scale.set(1 + e * .25, Math.max(.001, 1 - e), 1 + e * .25); t.brush.rotation.y += dt * 3;
        if (p >= 1) { t.brush.visible = false; this.clearThorn(t); }
      } else if (t.phase === 'cleared') {
        if (d < 1.4) offer({ type: 'wilds-cache', thorn: t, distance: d, label: 'Open hidden cache' });
      } else if (t.phase === 'looting') {
        if (t.cacheModel) continue;         // Open clip → Looted
        t.t += dt; const p = Math.min(1, t.t / .5), e = ease(p);
        t.cache.scale.setScalar(Math.max(.001, 1 - e)); t.cache.position.y = e * .5;
        if (p >= 1) { t.cache.visible = false; t.phase = 'looted'; }
      }
    }

    this.current = best;
    return { interaction: best };
  }

  updateGarden(dt, time, character, offer, result) {
    const px = character.position.x, pz = character.position.z;
    this.threat?.update(dt, time, character, offer);
    this.pots?.update(dt, time, character, offer);
    const wp = this.structureAt('workshop'), w = this.workbench, wd = Math.hypot(px - wp.x, pz - wp.z), wNear = wd < 1.9;
    w.near += ((wNear ? 1 : 0) - w.near) * damp(6, dt);
    w.glow.material.opacity = .16 + w.near * .3 + Math.sin(time * 1.6) * .04;
    if (wNear) offer({ type: 'wilds-workbench', distance: wd, label: 'Use Workbench' });
    for (const m of this.gardenMixers || []) m.update(dt);
    if (this.upgradeL2.visible && !this.shrineModel) { this.shrineSeed.position.y = 1.45 + Math.sin(time * 1.7) * .06; this.shrineSeed.rotation.y += dt * .8; }
    this.current = result();
    return { interaction: this.current };
  }

  regrown(node, instant) {
    delete this.profile.nodes[node.id]; this.save.persist();
    node.obstacles.forEach(o => this.setObstacle(o, true));
    if (node.model) {
      node.body.visible = true;
      if (instant) { node.state = 'ready'; node.model.loop('Idle'); }
      else { node.state = 'growing'; node.model.play(['Regrow'], () => { node.state = 'ready'; node.model.loop('Idle'); }); }
      return;
    }
    node.glow.visible = true;
    if (instant) { node.body.scale.setScalar(1); node.state = 'ready'; }
    else { node.state = 'growing'; node.t = 0; }
  }
}
