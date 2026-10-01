// @ts-nocheck
// Greenhouse pots: craft a pot at the workbench, plant a Wild Seed, water it from the garden
// pond with the Watering Can, harvest when it flowers. Pots sit on the authored greenhouse
// furniture of the current level; the greenhouse itself (levels, collision, camera) is untouched.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { POTS, MATERIALS } from '../data/wildsCatalog.js';

const GH = { x: 6.5, z: -11.2 };                 // GreenhouseProgressionSystem ROOT_X / ROOT_Z
// Slots per greenhouse level, local to the greenhouse root: [x, y(top of furniture), z].
const SLOTS = {
  1: [[-0.64, .67, -0.28], [0, .67, -0.64], [0.64, .67, 0.1]],    // L1 U-shaped lower shelf
  2: [[-0.9, .86, -1.0], [-0.9, .86, -0.2], [-0.9, .86, 0.6]],     // L2 left plant table
  3: [[-2.4, .04, -2.0], [-2.4, .04, -1.2], [-2.4, .04, -0.4]]     // L3 floor along the back-left
};
const POND = { x: -3.85, z: -1.6 };
const ease = p => p * p * (3 - 2 * p);

export class GardenPotsSystem {
  constructor(wilds, greenhouse) {
    this.w = wilds; this.gh = greenhouse; this.p = wilds.profile;
    this.root = new THREE.Group(); this.root.name = 'WILDS_GREENHOUSE_POTS'; wilds.gardenRoot.add(this.root);
    const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .85, ...o });
    this.m = { pot: M(0xb4643c), rim: M(0xc8784c), soil: M(0x4a3626, { roughness: 1 }), wet: M(0x2e2219, { roughness: .6 }), leaf: M(0x6fa548, { flatShading: true }), stem: M(0x5d8a3a),
      petal: [M(0xf2b8c6), M(0xf5d76e), M(0xb59ad8)], drop: new THREE.MeshStandardMaterial({ color: 0x6fb6e8, roughness: .2, emissive: 0x2a6da0, emissiveIntensity: .35 }) };
    this.slots = [0, 1, 2].map(i => this.makeSlot(i));
    this.potTemplate = null;
    new GLTFLoader().loadAsync('./assets/props/pot-terracotta.glb').then(g => {
      g.scene.traverse(o => { if (/Ghost|Seed/.test(o.name)) o.visible = false; if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.potTemplate = g.scene; for (const s of this.slots) this.swapPotModel(s);
    }).catch(e => console.warn('[TGW] pot-terracotta.glb missing; using placeholder pots', e));
    this.level = -1; this.placeForLevel();
  }

  // ---------- visuals ----------
  makeSlot(i) {
    const g = new THREE.Group(); g.visible = false; this.root.add(g);
    const pot = new THREE.Group(); g.add(pot);
    pot.add(this.mesh(new THREE.CylinderGeometry(.09, .07, .14, 10), this.m.pot, [0, .07, 0]));
    pot.add(this.mesh(new THREE.CylinderGeometry(.1, .1, .04, 10), this.m.rim, [0, .16, 0]));
    const soil = this.mesh(new THREE.CylinderGeometry(.088, .088, .012, 10), this.m.soil, [0, .168, 0]); g.add(soil);
    const plant = new THREE.Group(); plant.position.y = .17; g.add(plant);
    const stages = [this.seedling(0), this.seedling(1), this.seedling(2), this.flower(i)];
    stages.forEach(s => { s.visible = false; plant.add(s); });
    const drop = new THREE.Group(); drop.position.y = .62; drop.visible = false; g.add(drop);
    drop.add(this.mesh(new THREE.SphereGeometry(.05, 10, 8), this.m.drop, [0, 0, 0]));
    drop.add(this.mesh(new THREE.ConeGeometry(.05, .08, 10), this.m.drop, [0, .06, 0]));
    return { i, g, pot, soil, plant, stages, drop, shown: -2, pop: 1 };
  }
  mesh(geo, mat, p) { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.castShadow = true; return m; }
  seedling(stage) {
    const g = new THREE.Group();
    if (stage === 0) { g.add(this.mesh(new THREE.SphereGeometry(.018, 6, 5), this.m.stem, [0, .005, 0])); return g; }
    const h = stage === 1 ? .08 : .17, n = stage === 1 ? 2 : 5;
    g.add(this.mesh(new THREE.CylinderGeometry(.008, .01, h, 5), this.m.stem, [0, h / 2, 0]));
    for (let k = 0; k < n; k++) { const a = k / n * 6.28, l = this.mesh(new THREE.SphereGeometry(.035 + stage * .008, 6, 4), this.m.leaf, [Math.cos(a) * .035, h * (.55 + k * .08), Math.sin(a) * .035]); l.scale.set(1.5, .35, .8); l.rotation.y = -a; g.add(l); }
    return g;
  }
  flower(i) {
    const g = this.seedling(2), petal = this.m.petal[i % 3];
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * 6.28, head = new THREE.Group(); head.position.set(Math.cos(a) * .05, .2 + k * .02, Math.sin(a) * .05); g.add(head);
      for (let j = 0; j < 5; j++) { const b = j / 5 * 6.28, p = this.mesh(new THREE.SphereGeometry(.022, 6, 4), petal, [Math.cos(b) * .025, 0, Math.sin(b) * .025]); p.scale.set(1.3, .45, 1); head.add(p); }
      head.add(this.mesh(new THREE.SphereGeometry(.014, 6, 4), this.m.rim, [0, .006, 0]));
    }
    return g;
  }
  swapPotModel(s) {
    if (!this.potTemplate) return;
    s.pot.clear(); s.pot.add(this.potTemplate.clone(true));
  }

  placeForLevel() {
    const lvl = this.gh?.level || 0;
    if (lvl === this.level) return; this.level = lvl;
    const set = SLOTS[lvl];
    this.slots.forEach((s, i) => { if (set) s.g.position.set(GH.x + set[i][0], set[i][1], GH.z + set[i][2]); });
  }

  // ---------- state ----------
  owned() { return this.p.pots.count; }
  available() { return (this.gh?.level || 0) >= 1; }
  stageMs() { return POTS.stageSec * 1000 * (this.w.profile.homeLevel >= 1 ? POTS.barrelGrowFactor : 1); }
  craftPot() {
    if (!this.available() || this.owned() >= POTS.max || !this.w.pay(POTS.cost)) return false;
    this.p.pots.count++; this.w.save.persist(); this.w.hud?.showToast(`Terracotta Pot crafted (${this.owned()}/${POTS.max}) · it waits in your greenhouse`); this.w.emit();
    return true;
  }
  plant(i) {
    const slot = this.p.pots.slots;
    if (!this.available() || i < 0 || i >= this.owned() || slot[i] || !this.w.pay({ wild_seed: 1 })) return false;
    slot[i] = { stage: 0, wet: false, readyAt: 0 }; this.slots[i].pop = 0; this.w.save.persist(); this.w.hud?.showToast('Wild Seed planted · give it water'); this.w.emit();
    return true;
  }
  water(i) {
    const s = this.p.pots.slots[i];
    if (!s || s.wet || s.stage >= 3 || this.p.water < 1) return false;
    this.p.water--; s.wet = true; s.readyAt = Date.now() + this.stageMs(); this.w.save.persist();
    this.w.hud?.showToast(`Watered · ${this.p.water} water left in the can`); this.w.emit();
    return true;
  }
  harvest(i, character) {
    const s = this.p.pots.slots[i]; if (!s || s.stage < 3) return false;
    const got = { ...POTS.harvest };
    if (Math.random() < POTS.amberChance) got.amber = (got.amber || 0) + 1;
    if (Math.random() < POTS.seedBackChance) got.wild_seed = (got.wild_seed || 0) + 1;
    for (const [id, n] of Object.entries(got)) this.w.give(id, n);
    this.p.pots.slots[i] = null; this.w.save.persist(); character?.flash();
    this.w.hud?.showToast(`Harvest  ${Object.entries(got).map(([id, n]) => `${MATERIALS[id].name} +${n}`).join('  ')}`);
    this.w.track('harvest', 1); this.w.emit();
    return true;
  }
  fill() {
    if (!this.w.has('can') || this.p.water >= POTS.canCharges) return false;
    this.p.water = POTS.canCharges; this.w.save.persist(); this.w.hud?.showToast(`Watering Can filled (${POTS.canCharges})`); this.w.emit();
    return true;
  }
  // Snails nibble a plant back one stage (a seed is lost entirely).
  eat(i) {
    const s = this.p.pots.slots[i]; if (!s) return false;
    if (s.stage === 0) this.p.pots.slots[i] = null; else { s.stage--; s.wet = false; }
    this.w.save.persist(); return true;
  }
  targets() {
    if (!this.available()) return [];
    return this.slots.filter((s, i) => i < this.owned() && this.p.pots.slots[i]).map(s => ({ i: s.i, x: s.g.position.x, z: s.g.position.z }));
  }

  // Growth runs on real time while watered; stage 2+ overgrowth nearby pauses it.
  tick(now) {
    this.p.pots.slots.forEach((s, i) => {
      if (!s || !s.wet || s.stage >= 3) return;
      const pos = this.slots[i].g.position;
      if (this.w.threat?.chokesAt(pos.x, pos.z, true)) { s.readyAt = Math.max(s.readyAt, now + 1000); return; }
      if (now >= s.readyAt) { s.stage++; s.wet = false; this.w.save.persist(); }
    });
  }

  // ---------- frame (garden only) ----------
  update(dt, time, character, offer) {
    this.placeForLevel();
    const now = Date.now(), px = character.position.x, pz = character.position.z, visible = this.available() && !this.gh?.anim;
    this.tick(now);
    this.slots.forEach((v, i) => {
      v.g.visible = visible && i < this.owned(); if (!v.g.visible) return;
      const s = this.p.pots.slots[i], stage = s ? s.stage : -1;
      if (stage !== v.shown) { v.stages.forEach((g, k) => g.visible = k === stage); v.shown = stage; v.pop = 0; }
      if (v.pop < 1) { v.pop = Math.min(1, v.pop + dt * 2.5); v.plant.scale.setScalar(Math.max(.001, ease(v.pop))); }
      v.soil.material = s?.wet ? this.m.wet : this.m.soil;
      const thirsty = !!s && !s.wet && s.stage < 3;
      v.drop.visible = thirsty; if (thirsty) { v.drop.position.y = .62 + Math.sin(time * 3 + i) * .04; v.drop.rotation.y += dt; }
      v.plant.rotation.z = Math.sin(time * 1.4 + i) * .03;
      const d = Math.hypot(px - v.g.position.x, pz - v.g.position.z);
      if (d > 1.25) return;
      if (!s) offer({ type: 'wilds-pot', slot: i, act: 'plant', distance: d, disabled: !(this.w.inv().get('wild_seed') > 0), label: this.w.inv().get('wild_seed') > 0 ? 'Plant Wild Seed' : 'Empty pot · find Wild Seeds in Wild Grass' });
      else if (s.stage >= 3) offer({ type: 'wilds-pot', slot: i, act: 'harvest', distance: d, label: 'Harvest plant' });
      else if (!s.wet) {
        const can = this.w.has('can'), ok = can && this.p.water > 0;
        offer({ type: 'wilds-pot', slot: i, act: 'water', distance: d, disabled: !ok, label: ok ? 'Water plant' : can ? 'Thirsty · fill your can at the pond' : 'Thirsty · craft a Watering Can' });
      } else if (this.w.threat?.chokesAt(v.g.position.x, v.g.position.z, true)) offer({ type: 'wilds-pot', slot: i, act: 'none', distance: d, disabled: true, label: 'Growth paused · weeds nearby' });
      else offer({ type: 'wilds-pot', slot: i, act: 'none', distance: d, disabled: true, label: `Growing · ${Math.max(1, Math.ceil((s.readyAt - now) / 60000))} min` });
    });
    // Pond refill.
    if (this.w.has('can') && this.p.water < POTS.canCharges) {
      // Same ellipse the garden uses for the pond basin (1.65 x 2.35); the shore keeps you just outside it.
      const q = Math.hypot((px - POND.x) / 1.65, (pz - POND.z) / 2.35), d = q * 1.65;
      if (q < 1.75) offer({ type: 'wilds-pot', act: 'fill', distance: d, label: 'Fill Watering Can' });
    }
  }

  interact(hit, character) {
    if (hit.act === 'fill') return this.fill();
    if (hit.act === 'plant') return this.plant(hit.slot);
    if (hit.act === 'water') return this.water(hit.slot);
    if (hit.act === 'harvest') return this.harvest(hit.slot, character);
    return false;
  }
}
