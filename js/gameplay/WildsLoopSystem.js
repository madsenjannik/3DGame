// @ts-nocheck
// Core loop v1 in the shared world:
//   gather nodes -> craft tools at the home workbench -> cut thornbrush -> loot amber caches
//   -> upgrade the home garden (which speeds up and boosts gathering) -> repeat.
// Visuals are procedural placeholders in the low-poly palette until authored GLBs exist.
import * as THREE from 'three';
import { damp, radialTexture } from '../visual/VisualKit.js';
import { MATERIALS, NODE_KINDS, TOOLS, HOME_UPGRADES, RULES } from '../data/wildsCatalog.js';

const HOME = { x: 0, z: 4.7 };
const WORKBENCH = { x: 3.9, z: 16.4, ry: -Math.PI / 2 };
const COMMON = ['wood', 'stone', 'clay', 'fiber'];

function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ease = p => p * p * (3 - 2 * p);

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
  constructor({ world, state, save, hud }) {
    this.world = world; this.L = world.sharedLandscape; this.state = state; this.save = save; this.hud = hud;
    this.profile = save.profile;
    this.root = new THREE.Group(); this.root.name = 'WILDS_CORE_LOOP'; this.L.root.add(this.root);
    this.nodes = []; this.thorns = []; this.current = null; this.flashT = 0;
    this.listeners = new Set();
  }

  init() {
    this.buildShared();
    this.hydrateInventory();
    this.placeNodes();
    this.buildWorkbench();
    this.buildHomeUpgrades();
    this.placeThorns();
    this.applyHomeLevel(false);
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
    this.root.add(root);
    const big = kind === 'oldlog' || kind === 'boulder';
    // The log lies along its local X axis, so it gets three colliders along that axis.
    const ax = Math.cos(root.rotation.y), az = -Math.sin(root.rotation.y);
    const obstacles = kind === 'oldlog' ? [-.7, 0, .7].map(o => this.world.addObstacle({ x: x + ax * o, z: z + az * o, r: .4, height: .6, kind: 'wilds-oldlog' }))
      : kind === 'boulder' ? [this.world.addObstacle({ x, z, r: .75, height: .9, kind: 'wilds-boulder' })] : [];
    const node = { id, kind, def, x, z, root, body, glow, ring, near: 0, reach: big ? 2.1 : 1.45, state: 'ready', t: 0, obstacles };
    const regrowAt = this.profile.nodes[id];
    if (regrowAt && regrowAt > Date.now()) { node.state = 'regrowing'; body.scale.setScalar(.001); glow.visible = false; obstacles.forEach(o => this.setObstacle(o, false)); }
    return node;
  }

  regrowMs(def) { return def.regrowSec * 1000 * (this.profile.homeLevel >= 2 ? RULES.rainBarrelRegrowFactor : 1); }
  yieldFor(def) { return def.yield + (def.tool && this.has(def.tool) ? 1 : 0) + (this.profile.homeLevel >= 3 ? RULES.shrineYieldBonus : 0); }

  // ---------- workbench + home upgrades ----------
  buildWorkbench() {
    const g = new THREE.Group(), m = this.mat, w = WORKBENCH;
    g.position.set(w.x, this.L.groundHeight(w.x, w.z), w.z); g.rotation.y = w.ry;
    g.add(this.mesh(new THREE.BoxGeometry(1.5, .1, .72), m.plankLight, [0, .78, 0]));
    for (const x of [-.66, .66]) for (const z of [-.28, .28]) g.add(this.mesh(new THREE.BoxGeometry(.09, .78, .09), m.plank, [x, .39, z]));
    g.add(this.mesh(new THREE.BoxGeometry(1.4, .06, .6), m.plank, [0, .25, 0]));
    g.add(this.mesh(new THREE.BoxGeometry(1.5, .72, .06), m.plank, [0, 1.2, -.36]));
    // Tool silhouettes on the backboard light up as tools are crafted.
    this.rack = {};
    const handle = new THREE.CylinderGeometry(.025, .025, .5, 6);
    [['axe', -.45, new THREE.BoxGeometry(.18, .12, .04)], ['pickaxe', 0, new THREE.BoxGeometry(.36, .06, .04)], ['sickle', .45, new THREE.TorusGeometry(.1, .02, 5, 12, Math.PI)]].forEach(([id, x, headGeo]) => {
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
    this.root.add(g); this.workbench = { root: g, glow, near: 0 };
    this.world.addObstacle({ x: w.x, z: w.z, r: .8, height: 1.4, kind: 'wilds-workbench' });
  }

  buildHomeUpgrades() {
    const m = this.mat, rand = rng(99);
    const at = (x, z, ry = 0) => { const g = new THREE.Group(); g.position.set(x, this.L.groundHeight(x, z), z); g.rotation.y = ry; g.visible = false; this.root.add(g); return g; };
    // L1: two planter beds that act as home gather nodes.
    this.beds = [[6.2, 15.0], [6.2, 17.9]].map(([x, z], i) => {
      const g = at(x, z, Math.PI / 2);
      g.add(this.mesh(new THREE.BoxGeometry(1.7, .26, .82), m.plank, [0, .13, 0]));
      g.add(this.mesh(new THREE.BoxGeometry(1.55, .06, .68), m.soil, [0, .25, 0], [1, 1, 1], [0, 0, 0], false));
      const node = this.addNode(`bed-${i + 1}`, 'bed', x, z, rand);
      node.root.rotation.y = 0; node.body.position.y = .22; node.reach = 1.5; node.root.visible = false;
      for (let k = 0; k < 2; k++) { const extra = this.nodeVisual('fiber', rand); extra.position.set((k ? .45 : -.45), .22, 0); node.body.add(extra); }
      this.nodes.push(node);
      return { root: g, node, obstacle: this.world.addObstacle({ x, z, r: .55, height: .3, kind: 'wilds-bed' }) };
    });
    // L2: rain barrel + compost bin.
    const l2 = at(-3.4, 17.2);
    l2.add(this.mesh(new THREE.CylinderGeometry(.36, .32, .9, 12), m.plank, [0, .45, 0]));
    l2.add(this.mesh(new THREE.CylinderGeometry(.33, .33, .03, 12), m.water, [0, .88, 0], [1, 1, 1], [0, 0, 0], false));
    for (const y of [.2, .7]) l2.add(this.mesh(new THREE.TorusGeometry(.355, .018, 5, 16), m.stoneDark, [0, y, 0], [1, 1, 1], [Math.PI / 2, 0, 0], false));
    l2.add(this.mesh(new THREE.BoxGeometry(.8, .55, .8), m.plank, [-.95, .28, 0]));
    l2.add(this.mesh(new THREE.SphereGeometry(.38, 8, 6), m.soil, [-.95, .5, 0], [1, .45, 1], [0, 0, 0], false));
    this.upgradeL2 = l2;
    // L3: seed shrine with a floating golden seed.
    const l3 = at(7.8, 21.0);
    l3.add(this.mesh(new THREE.CylinderGeometry(.55, .7, .4, 8), m.stone, [0, .2, 0]));
    l3.add(this.mesh(new THREE.CylinderGeometry(.3, .4, .7, 8), m.stoneDark, [0, .75, 0]));
    const seed = this.mesh(new THREE.SphereGeometry(.16, 14, 10), m.gold, [0, 1.45, 0], [.82, 1.2, .82]); l3.add(seed);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.amberTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .7 }));
    halo.position.y = 1.45; halo.scale.setScalar(1.6); l3.add(halo);
    this.upgradeL3 = l3; this.shrineSeed = seed;
    this.upgradeObstacles = [this.world.addObstacle({ x: -3.4, z: 17.2, r: .55, height: .9, kind: 'wilds-barrel' }), this.world.addObstacle({ x: -4.35, z: 17.2, r: .5, height: .6, kind: 'wilds-compost' }), this.world.addObstacle({ x: 7.8, z: 21.0, r: .65, height: 1.2, kind: 'wilds-shrine' })];

  }

  applyHomeLevel(celebrate) {
    const lvl = this.profile.homeLevel;
    for (const b of this.beds) { b.root.visible = lvl >= 1; b.node.root.visible = lvl >= 1; this.setObstacle(b.obstacle, lvl >= 1); }
    this.upgradeL2.visible = lvl >= 2; this.setObstacle(this.upgradeObstacles[0], lvl >= 2); this.setObstacle(this.upgradeObstacles[1], lvl >= 2);
    this.upgradeL3.visible = lvl >= 3; this.setObstacle(this.upgradeObstacles[2], lvl >= 3);
    if (celebrate) this.hud?.showToast(`${HOME_UPGRADES[lvl - 1].name} built`);
  }

  craft(toolId) {
    const tool = TOOLS.find(t => t.id === toolId);
    if (!tool || this.has(toolId) || !this.pay(tool.cost)) return false;
    this.profile.tools[toolId] = true; this.profile.stats.crafted++;
    this.rack[toolId].visible = true; this.save.persist();
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
    const t = { id, x, z, root, cache, brush, crystals, halo, near: 0, t: 0, phase: this.profile.thorns[id] || 'wild' };
    t.obstacle = this.world.addObstacle({ x, z, r: 1.45, height: 1.6, kind: 'wilds-thornbrush' });
    if (t.phase !== 'wild') { brush.visible = false; this.setObstacle(t.obstacle, false); }
    if (t.phase === 'looted') cache.visible = false;
    return t;
  }

  // ---------- interaction ----------
  interact(hit, character) {
    if (!hit) return false;
    if (hit.type === 'wilds-workbench') { this.onOpenWorkbench?.(); return true; }
    if (hit.type === 'wilds-gather') return this.gather(hit.node, character);
    if (hit.type === 'wilds-cut') return this.cut(hit.thorn, character);
    if (hit.type === 'wilds-cache') return this.loot(hit.thorn, character);
    return false;
  }

  gather(node, character) {
    if (node.state !== 'ready') return false;
    if (node.def.requires && !this.has(node.def.requires)) return false;
    node.state = 'gathering'; node.t = 0; node.character = character;
    return true;
  }

  finishGather(node) {
    const def = node.def, n = this.yieldFor(def);
    this.give(def.material, n);
    let text = `${MATERIALS[def.material].name} +${n}`;
    for (const [id, b] of Object.entries(def.bonus || {})) { this.give(id, b); text += `  ${MATERIALS[id].name} +${b}`; }
    this.hud?.materials?.classList.add('show'); this.hud?.showToast(text);
    node.character?.flash(); this.profile.stats.gathered++;
    node.state = 'regrowing'; node.obstacles.forEach(o => this.setObstacle(o, false)); this.profile.nodes[node.id] = Date.now() + this.regrowMs(def); this.save.persist();
  }

  cut(thorn, character) {
    if (thorn.phase !== 'wild' || !this.has('sickle')) return false;
    thorn.phase = 'cutting'; thorn.t = 0; character.flash();
    return true;
  }

  loot(thorn, character) {
    if (thorn.phase !== 'cleared') return false;
    thorn.phase = 'looting'; thorn.t = 0; character.flash();
    const extra = COMMON[Math.floor(Math.random() * COMMON.length)];
    this.give('amber', RULES.cacheReward.amber); this.give(extra, RULES.cacheReward.extra);
    this.hud?.showToast(`Hidden cache: Amber +${RULES.cacheReward.amber}  ${MATERIALS[extra].name} +${RULES.cacheReward.extra}`);
    this.profile.thorns[thorn.id] = 'looted'; this.save.persist();
    return true;
  }

  // ---------- frame ----------
  update(dt, time, character) {
    const px = character.position.x, pz = character.position.z, now = Date.now();
    let best = null; const offer = (c) => { if (!best || c.distance < best.distance) best = c; };

    for (const node of this.nodes) {
      if (!node.root.visible) continue;
      const d = Math.hypot(px - node.x, pz - node.z);
      // Far away: skip visuals, but never freeze a gather/grow animation that is already running.
      if (d > 70 && (node.state === 'ready' || node.state === 'regrowing')) { if (node.state === 'regrowing' && now >= (this.profile.nodes[node.id] || 0)) this.regrown(node, true); continue; }
      const inReach = d < node.reach && node.state === 'ready';
      node.near += ((inReach ? 1 : 0) - node.near) * damp(6, dt);
      if (node.state === 'ready') {
        node.glow.material.opacity = .14 + node.near * .3 + Math.sin(time * 2 + node.x) * .03;
        node.ring.material.opacity = node.near * .45; node.ring.rotation.z += dt * .2;
        if (inReach) {
          const locked = node.def.requires && !this.has(node.def.requires);
          const tool = locked && TOOLS.find(t => t.id === node.def.requires);
          offer({ type: 'wilds-gather', node, distance: d, disabled: !!locked, label: locked ? `${node.def.name} · needs ${tool.name}` : `Gather ${node.def.name}` });
        }
      } else if (node.state === 'gathering') {
        node.t += dt; const p = Math.min(1, node.t / .45), e = ease(p);
        node.body.scale.setScalar(Math.max(.001, 1 - e)); node.body.position.y = (node.kind === 'bed' ? .22 : 0) + e * .4; node.glow.material.opacity *= .9;
        if (p >= 1) { node.body.position.y = node.kind === 'bed' ? .22 : 0; node.glow.visible = false; node.ring.material.opacity = 0; this.finishGather(node); }
      } else if (node.state === 'regrowing') {
        if (now >= (this.profile.nodes[node.id] || 0)) this.regrown(node, false);
      } else if (node.state === 'growing') {
        node.t += dt; const p = Math.min(1, node.t / 1.2), s = ease(p) * (1 + Math.sin(p * Math.PI) * .12);
        node.body.scale.setScalar(Math.max(.001, s)); if (p >= 1) { node.body.scale.setScalar(1); node.state = 'ready'; }
      }
    }

    for (const t of this.thorns) {
      const d = Math.hypot(px - t.x, pz - t.z);
      if (d > 80 && (t.phase === 'wild' || t.phase === 'cleared' || t.phase === 'looted')) continue;
      t.halo.material.opacity = .5 + Math.sin(time * 2.2 + t.x) * .12;
      t.crystals.forEach((c, i) => { c.rotation.y += dt * (.5 + i * .2); });
      if (t.phase === 'wild') {
        if (d < 2.65) offer({ type: 'wilds-cut', thorn: t, distance: d, disabled: !this.has('sickle'), label: this.has('sickle') ? 'Cut Thornbrush' : 'Thornbrush · needs Sickle' });
      } else if (t.phase === 'cutting') {
        t.t += dt; const p = Math.min(1, t.t / .7), e = ease(p);
        t.brush.scale.set(1 + e * .25, Math.max(.001, 1 - e), 1 + e * .25); t.brush.rotation.y += dt * 3;
        if (p >= 1) {
          t.brush.visible = false; this.setObstacle(t.obstacle, false); t.phase = 'cleared';
          for (const [id, n] of Object.entries(RULES.thornCutReward)) this.give(id, n);
          this.hud?.showToast(`Thornbrush cleared  Fiber +${RULES.thornCutReward.fiber}`);
          this.profile.thorns[t.id] = 'cleared'; this.save.persist();
        }
      } else if (t.phase === 'cleared') {
        if (d < 1.4) offer({ type: 'wilds-cache', thorn: t, distance: d, label: 'Open hidden cache' });
      } else if (t.phase === 'looting') {
        t.t += dt; const p = Math.min(1, t.t / .5), e = ease(p);
        t.cache.scale.setScalar(Math.max(.001, 1 - e)); t.cache.position.y = e * .5;
        if (p >= 1) { t.cache.visible = false; t.phase = 'looted'; }
      }
    }

    const w = this.workbench, wd = Math.hypot(px - WORKBENCH.x, pz - WORKBENCH.z), wNear = wd < 1.9;
    w.near += ((wNear ? 1 : 0) - w.near) * damp(6, dt);
    w.glow.material.opacity = .16 + w.near * .3 + Math.sin(time * 1.6) * .04;
    if (wNear) offer({ type: 'wilds-workbench', distance: wd, label: 'Use Workbench' });
    if (this.upgradeL3.visible) { this.shrineSeed.position.y = 1.45 + Math.sin(time * 1.7) * .06; this.shrineSeed.rotation.y += dt * .8; }

    this.current = best;
    return { interaction: best };
  }

  regrown(node, instant) {
    delete this.profile.nodes[node.id]; this.save.persist();
    node.glow.visible = true; node.obstacles.forEach(o => this.setObstacle(o, true));
    if (instant) { node.body.scale.setScalar(1); node.state = 'ready'; }
    else { node.state = 'growing'; node.t = 0; }
  }
}
