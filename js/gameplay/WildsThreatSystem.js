// @ts-nocheck
// Nature fights back: overgrowth creeps toward the home and snails go for the planter beds.
// Both run on real time (overgrowth also while offline). Owned by WildsLoopSystem.
import * as THREE from 'three';
import { THREAT } from '../data/wildsCatalog.js';

const HOME_C = { x: 2.5, z: 16.5 };
const ease = p => p * p * (3 - 2 * p);
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export class WildsThreatSystem {
  constructor(wilds) {
    this.w = wilds; this.p = wilds.profile.threat; this.weeds = []; this.snails = []; this.snailSeq = 0;
    this.root = new THREE.Group(); this.root.name = 'WILDS_THREAT'; wilds.root.add(this.root);
    this.buildAssets(); this.buildSpots();
    for (const rec of this.p.weeds) if (this.spots[rec.spot]) this.weeds.push(this.makeWeed(rec));
    this.catchUp();
  }

  // ---------- setup ----------
  buildAssets() {
    const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .9, flatShading: true, ...o });
    this.m = { sprout: M(0x7fae4a), vine: M(0x55703a), thorn: M(0x3a2f22), flower: M(0x9b5fb0), shell: M(0x9a6a3c), shellDark: M(0x6e4a2a), body: M(0x8f9a7a), eye: M(0x2a2a24) };
    this.g = { leaf: new THREE.ConeGeometry(.08, .32, 4), vine: new THREE.ConeGeometry(.16, .7, 5), spike: new THREE.ConeGeometry(.025, .16, 4), bloom: new THREE.IcosahedronGeometry(.07, 0) };
  }

  buildSpots() {
    const rand = rng(2024), L = this.w.L, avoid = this.w.homeProps(), spots = [];
    for (let i = 0; i < 900 && spots.length < 22; i++) {
      const a = rand() * 6.283, r = 5 + rand() * 14, x = HOME_C.x + Math.cos(a) * r, z = HOME_C.z + Math.sin(a) * r * .85;
      if (Math.abs(x) < 5.4 && z > -4 && z < 13) continue;            // inside the yard fence
      if (avoid.some(o => Math.hypot(x - o.x, z - o.z) < o.r + 1.1)) continue;
      if (spots.some(s => Math.hypot(x - s.x, z - s.z) < 2.2)) continue;
      const h = L.worldHeight(x, z); if (h < L.WL + .4 || L.terrainSlope(x, z) > .55) continue;
      spots.push({ x, z });
    }
    this.spots = spots;
  }

  // ---------- timing ----------
  fence() { return this.w.profile.homeLevel >= 4; }
  weedEveryMs() { return THREAT.weedEverySec * 1000 * (this.fence() ? THREAT.fenceFactor : 1) * (this.w.profile.perks.ward ? 2 : 1); }
  snailEveryMs() { return THREAT.snailEverySec * 1000 * (this.fence() ? THREAT.fenceFactor : 1); }
  stageMs() { return THREAT.weedStageSec * 1000 * (this.w.passive?.weedSlow || 1); }
  stage(rec, now = Date.now()) { return Math.min(3, 1 + Math.floor((now - rec.bornAt) / this.stageMs())); }
  active() { return !!this.p.started; }

  start(now) {
    this.p.started = now; this.p.lastSpawn = now - this.weedEveryMs() + 60000; this.p.lastSnail = now; this.w.save.persist();
    this.w.hud?.showToast('The wilds noticed you. Watch your home.');
  }

  // Offline: weeds that would have appeared while away appear now (capped), already aged.
  catchUp() {
    if (!this.active()) return;
    const now = Date.now(), every = this.weedEveryMs(), due = Math.floor((now - this.p.lastSpawn) / every);
    if (due <= 0) return;
    for (let k = 0; k < Math.min(due, THREAT.offlineCatchUp); k++) this.spawnWeed(this.p.lastSpawn + (k + 1) * every, false);
    this.p.lastSpawn += due * every; this.p.lastSnail = now; this.w.save.persist();
  }

  // ---------- weeds ----------
  makeWeed(rec) {
    const s = this.spots[rec.spot], L = this.w.L, root = new THREE.Group(), rand = rng(rec.spot * 97 + 3);
    root.position.set(s.x, L.groundHeight(s.x, s.z), s.z); root.rotation.y = rand() * 6.28; this.root.add(root);
    const stages = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; stages[0].add(this.mesh(this.g.leaf, this.m.sprout, [Math.cos(a) * .12, .14, Math.sin(a) * .12], [(Math.cos(a)) * .3, 0, (Math.sin(a)) * .3])); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + .3, r = .25 + rand() * .2; stages[1].add(this.mesh(this.g.vine, this.m.vine, [Math.cos(a) * r, .3, Math.sin(a) * r], [Math.cos(a) * .35, rand(), Math.sin(a) * .35])); }
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * 6.28 + .6, r = .45 + rand() * .25;
      stages[2].add(this.mesh(this.g.vine, i % 2 ? this.m.thorn : this.m.vine, [Math.cos(a) * r, .42, Math.sin(a) * r], [Math.cos(a) * .4, rand(), Math.sin(a) * .4], [1.1, 1.4, 1.1]));
      stages[2].add(this.mesh(this.g.spike, this.m.thorn, [Math.cos(a) * (r + .14), .35, Math.sin(a) * (r + .14)], [0, 0, Math.PI / 2 + a]));
      if (i % 2 === 0) stages[2].add(this.mesh(this.g.bloom, this.m.flower, [Math.cos(a) * r * .7, .85, Math.sin(a) * r * .7]));
    }
    stages.forEach(g => { g.visible = false; root.add(g); });
    return { rec, x: s.x, z: s.z, root, stages, shown: 0, t: 0, state: 'alive' };
  }
  mesh(geo, mat, p, r = [0, 0, 0], s = [1, 1, 1]) { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r); m.scale.set(...s); m.castShadow = true; return m; }

  spawnWeed(bornAt, announce) {
    if (this.weeds.length >= THREAT.maxWeeds) return null;
    const taken = new Set(this.weeds.map(w => w.rec.spot)), free = this.spots.map((_, i) => i).filter(i => !taken.has(i));
    if (!free.length) return null;
    const rec = { id: `weed-${bornAt}`, spot: free[Math.floor(Math.random() * free.length)], bornAt };
    this.p.weeds.push(rec); const weed = this.makeWeed(rec); this.weeds.push(weed);
    if (announce) this.w.hud?.showToast('Overgrowth is creeping toward your home');
    return weed;
  }

  canPull(stage) { return stage < THREAT.sickleStage || this.w.has('sickle') || this.w.passive?.thornHands; }

  pull(weed, character) {
    if (weed.state !== 'alive') return false;
    const st = this.stage(weed.rec); if (!this.canPull(st)) return false;
    weed.state = 'pulling'; weed.t = 0; character.flash();
    const n = THREAT.weedReward[st - 1]; this.w.give('fiber', n); this.w.hud?.showToast(`Overgrowth pulled  Fiber +${n}`);
    this.p.weeds = this.p.weeds.filter(r => r !== weed.rec); this.w.profile.stats.weeds++; this.w.track('weeds', 1); this.w.save.persist();
    return true;
  }

  // A bed cannot regrow while stage 2+ overgrowth is close to it.
  chokes(node) { const now = Date.now(); return this.weeds.some(w => w.state === 'alive' && this.stage(w.rec, now) >= 2 && Math.hypot(w.x - node.x, w.z - node.z) < THREAT.bedChokeRadius); }

  // ---------- snails ----------
  spawnSnail() {
    const beds = this.w.beds.map(b => b.node); if (!beds.length || this.w.profile.homeLevel < 1) return;
    const L = this.w.L;
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * 6.28, r = 16 + Math.random() * 6, x = HOME_C.x + Math.cos(a) * r, z = HOME_C.z + Math.sin(a) * r;
      if (L.worldHeight(x, z) < L.WL + .4 || (Math.abs(x) < 5.4 && z > -4 && z < 13)) continue;
      const root = new THREE.Group(); root.position.set(x, L.groundHeight(x, z), z); this.root.add(root);
      const body = this.mesh(new THREE.CapsuleGeometry(.11, .42, 3, 8), this.m.body, [0, .1, 0], [0, 0, Math.PI / 2]); root.add(body);
      const shell = new THREE.Group(); shell.position.set(-.06, .27, 0); root.add(shell);
      shell.add(this.mesh(new THREE.SphereGeometry(.2, 10, 8), this.m.shell, [0, 0, 0], [0, 0, 0], [1, 1, .8]));
      shell.add(this.mesh(new THREE.TorusGeometry(.12, .035, 5, 14), this.m.shellDark, [0, 0, .15], [0, 0, 0]));
      for (const zz of [-.05, .05]) { root.add(this.mesh(new THREE.CylinderGeometry(.012, .012, .18, 4), this.m.body, [.26, .26, zz], [0, 0, -.35])); root.add(this.mesh(new THREE.SphereGeometry(.03, 6, 5), this.m.eye, [.3, .35, zz])); }
      const s = { id: ++this.snailSeq, root, shell, x, z, hp: THREAT.snailHp, state: 'crawl', t: 0, hitT: 0, target: null, eatT: 0, ph: Math.random() * 6 };
      root.scale.setScalar(.001); s.grow = 0; this.snails.push(s);
      return s;
    }
  }

  swat(snail, character) {
    if (snail.state === 'dying') return false;
    snail.hp--; snail.hitT = .35; character.flash();
    const dx = snail.x - character.position.x, dz = snail.z - character.position.z, d = Math.hypot(dx, dz) || 1;
    snail.x += dx / d * .9; snail.z += dz / d * .9; snail.eatT = 0;
    if (snail.hp <= 0) {
      snail.state = 'dying'; snail.t = 0;
      const n = THREAT.snailShells + (this.w.passive?.shellBonus || 0);
      this.w.give('shell', n); this.w.hud?.showToast(`Snail chased off  Shell +${n}`);
      this.w.profile.stats.snails++; this.w.track('snails', 1); this.w.save.persist();
    } else this.w.hud?.showToast('Swat it again!');
    return true;
  }

  // ---------- frame ----------
  update(dt, time, character, offer) {
    const now = Date.now(), px = character.position.x, pz = character.position.z;
    if (!this.active()) { if (this.w.has(THREAT.startsWithTool)) this.start(now); else return; }
    if (now - this.p.lastSpawn >= this.weedEveryMs()) { this.p.lastSpawn = now; if (this.spawnWeed(now, Math.hypot(px - HOME_C.x, pz - HOME_C.z) < 45)) this.w.save.persist(); }
    if (this.w.profile.homeLevel >= 1 && now - this.p.lastSnail >= this.snailEveryMs()) { this.p.lastSnail = now; if (this.snails.length < THREAT.maxSnails) this.spawnSnail(); }

    for (const w of this.weeds) {
      if (w.state === 'alive') {
        const st = this.stage(w.rec, now);
        if (st !== w.shown) { w.stages.forEach((g, i) => g.visible = i === st - 1); w.shown = st; w.root.scale.setScalar(.001); w.t = 0; }
        if (w.t < 1) { w.t = Math.min(1, w.t + dt * 1.5); w.root.scale.setScalar(Math.max(.001, ease(w.t))); }
        w.root.rotation.z = Math.sin(time * 1.3 + w.x) * .03;
        const d = Math.hypot(px - w.x, pz - w.z);
        if (d < 1.4) {
          const ok = this.canPull(st), names = ['Pull Sprouts', 'Pull Overgrowth', 'Cut Thorny Overgrowth'];
          offer({ type: 'wilds-weed', weed: w, distance: d, disabled: !ok, label: ok ? names[st - 1] : 'Thorny Overgrowth · needs Sickle' });
        }
      } else if (w.state === 'pulling') {
        w.t += dt; const p = Math.min(1, w.t / .45), e = ease(p);
        w.root.scale.set(Math.max(.001, 1 - e), Math.max(.001, 1 - e) * (1 + e), Math.max(.001, 1 - e)); w.root.position.y += dt * .6;
        if (p >= 1) { w.state = 'gone'; this.root.remove(w.root); }
      }
    }
    this.weeds = this.weeds.filter(w => w.state !== 'gone');

    for (const s of this.snails) {
      if (s.grow < 1) { s.grow = Math.min(1, s.grow + dt * 1.2); s.root.scale.setScalar(Math.max(.001, ease(s.grow))); }
      if (s.state === 'dying') {
        s.t += dt; const p = Math.min(1, s.t / .5); s.root.scale.setScalar(Math.max(.001, 1 - ease(p))); s.root.position.y += dt * .8; s.root.rotation.y += dt * 9;
        if (p >= 1) { s.state = 'gone'; this.root.remove(s.root); }
        continue;
      }
      // Head for the nearest bed that still has something to eat (else the nearest bed).
      const beds = this.w.beds.map(b => b.node); if (!beds.length) continue;
      const food = beds.filter(b => b.state === 'ready'), pool = food.length ? food : beds;
      let tgt = pool[0], best = 1e9; for (const b of pool) { const d = Math.hypot(b.x - s.x, b.z - s.z); if (d < best) { best = d; tgt = b; } }
      if (best > .95) {
        const sp = THREAT.snailSpeed * (s.hitT > 0 ? 0 : 1), dx = tgt.x - s.x, dz = tgt.z - s.z;
        s.x += dx / best * sp * dt; s.z += dz / best * sp * dt; s.root.rotation.y = Math.atan2(-dz, dx);
      } else if (tgt.state === 'ready') {
        s.eatT += dt;
        if (s.eatT > 4) { s.eatT = 0; this.w.eatBed(tgt); if (Math.hypot(px - s.x, pz - s.z) < 45) this.w.hud?.showToast('A snail ate your planter bed!'); }
      }
      s.hitT = Math.max(0, s.hitT - dt);
      const wob = Math.sin(time * 6 + s.ph) * .04;
      s.root.position.set(s.x, this.w.L.groundHeight(s.x, s.z) + (s.hitT > 0 ? Math.sin(s.hitT * 30) * .05 : 0), s.z);
      s.shell.scale.set(1 + wob, 1 - wob, 1);
      const d = Math.hypot(px - s.x, pz - s.z);
      if (d < 1.5) offer({ type: 'wilds-snail', snail: s, distance: d, label: 'Swat Snail' });
    }
    this.snails = this.snails.filter(s => s.state !== 'gone');
  }

  markers() {
    const out = [];
    for (const s of this.snails) if (s.state !== 'dying') out.push({ type: 'enemy', x: s.x, z: s.z });
    return out;
  }
}
