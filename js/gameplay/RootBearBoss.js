// @ts-nocheck
// R79 Root Bear, second boss, on the same combat contract as the Wood Giant (hp, hurt(), telegraphs, weak window,
// drops). It lives in its own grove (SharedLandscape.bearGrove): a ring of old conifers around an open core, a
// darker forest floor and a few mossy rocks. No arena, no circle: it sleeps on its den and wakes on its own when you
// come within 8 m; for 1.5 of every real 10 min (clock-based, so it keeps going while the game is closed) it is
// awake and wanders the core, and then it attacks anyone within 8 m. Fight: Sweep (paw swipe in front, ground ring
// telegraph) and Roots (the GLB's own line of root spikes in front, with its own telegraph strip). After each
// attack it is stuck for a moment: hits there do ×3 (Hit reaction), the bark takes 1. Run out of the grove and it
// gives up (full HP again). First win: Golden Seed; rematch after 24 h. Fails soft: no GLB → no bear, no grove.
import * as THREE from 'three';
import { loadGLTF } from '../core/AssetManager.js';
import { DAY_MS } from '../visual/DayNight.js?build=DAYNIGHT-R81-20261005A';
import { ROOT_BEAR as RB } from '../data/combatCatalog.js?build=SAVE-R153-20261009A';

const DIR = './assets/combat/';
const ROCK = './assets/environment/pure-poly/PP_Rock_Moss_Grown_09.glb';
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const FIGHT = ['wake', 'chase', 'sweep', 'roots', 'stuck'];

export class RootBearBoss {
  constructor(combat) {
    this.c = combat; this.g = combat.g; this.w = combat.w; this.L = combat.L;
    this.p = combat.p.bear ||= { defeatedAt: 0, wins: 0 };
    this.G = this.L.bearGrove; this.state = 'off'; this.t = 0; this.hp = RB.hp; this.weak = 0; this.shake = 0; this.devAwakeUntil = 0; this.forceAwake = null;   // forceAwake: tests only (null = clock)
   
    this.root = new THREE.Group(); this.root.name = 'WILDS_BOSS_ROOT_BEAR'; combat.root.add(this.root);
    this.den = { x: this.G.x, z: this.G.z, heading: Math.atan2(.1 - this.G.x, 14.3 - this.G.z) };   // asleep facing the way you come from (the gate side)
    this.buildUi(); this.buildTelegraph();
    try { this.buildGrove(); } catch (e) { console.warn('[TGW] Root Bear grove unavailable (fails soft)', e); }
    this.ready = this.load();
  }

  // ---------- grove (built after nodes, Moles and the Wood Giant arena are placed, so none of them move) ----------
  buildGrove() {
    const L = this.L, G = this.G, C = RB.grove, rand = rng(C.seed), o = new THREE.Object3D();
    // 1) Open core: hide the shared-forest trees standing in it (instance scaled to 0, obstacle off). treeXY and the
    //    rand() sequence of the shared forest are untouched, so every other tree stays exactly where it was.
    const zero = new THREE.Matrix4().makeScale(0, 0, 0), touched = new Set();
    for (const it of L.forestItems || []) {
      if (Math.hypot(it.x - G.x, it.z - G.z) > G.core + 1.5) continue;
      const m = L.forestMeshes?.[it.k]; if (!m) continue;
      m.setMatrixAt(it.i, zero); touched.add(m); it.hidden = true; if (it.o) it.o.r = .01;
    }
    for (const m of touched) m.instanceMatrix.needsUpdate = true;
    // R79.1: the old reserved-plot tape posts inside the larger core go too (4 instances per plot, corner order as built).
    (L.plots || []).forEach((P, k) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], c) => {
      if (L.plotPosts && Math.hypot(P.x + sx * 14 - G.x, P.z + sz * 14 - G.z) < G.core + 1) { L.plotPosts.setMatrixAt(k * 4 + c, zero); L.plotPosts.instanceMatrix.needsUpdate = true; this.clearedPosts = (this.clearedPosts || 0) + 1; }
    }));
    this.clearedTrees = (L.forestItems || []).filter(it => it.hidden).length;
    // 2) ~30 old conifers in clusters of 3-5 on the ring, with walkable gaps between the clusters.
    const keep = (L.forestItems || []).filter(it => !it.hidden && Math.hypot(it.x - G.x, it.z - G.z) < G.r + 6);
    const posts = []; for (const P of L.plots || []) for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) posts.push({ x: P.x + sx * 14, z: P.z + sz * 14 });
    const trees = [], ok = (x, z) => {
      const d = Math.hypot(x - G.x, z - G.z); if (d < C.ring[0] || d > C.ring[1] + 2) return false;
      if (L.pathDistance(x, z) < 3.5 || L.streamDistance(x, z) < 4 || L.wallDistance(x, z) < 2.5) return false;
      if (L.worldHeight(x, z) < L.WL + .4) return false;
      if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 2.6) || keep.some(t => Math.hypot(t.x - x, t.z - z) < 2.2) || posts.some(p => Math.hypot(p.x - x, p.z - z) < 1.6)) return false;
      return true;
    };
    for (let c = 0; c < C.clusters * 2 && trees.length < C.trees; c++) {
      const a = (c % C.clusters) / C.clusters * 6.283 + (c >= C.clusters ? 3.1416 / C.clusters : 0) + (rand() - .5) * .45;
      const r = C.ring[0] + 2 + rand() * (C.ring[1] - C.ring[0] - 3), cx = G.x + Math.cos(a) * r, cz = G.z + Math.sin(a) * r;
      const n = 3 + Math.floor(rand() * 3);
      for (let i = 0, made = 0; i < 24 && made < n && trees.length < C.trees; i++) {
        const b = rand() * 6.283, q = i === 0 ? 0 : 1.6 + rand() * 2.2, x = cx + Math.cos(b) * q, z = cz + Math.sin(b) * q;
        if (!ok(x, z)) continue;
        trees.push({ x, z, y: L.worldHeight(x, z) - .1, k: Math.floor(rand() * 4), s: C.scale[0] + rand() * (C.scale[1] - C.scale[0]), ry: rand() * 6.28 }); made++;
      }
    }
    const byKind = [[], [], [], []]; for (const t of trees) byKind[t.k].push(t);
    this.groveMeshes = [];
    byKind.forEach((list, k) => {
      if (!list.length || !L.forestGeos?.[k]) return;
      const inst = new THREE.InstancedMesh(L.forestGeos[k], L.forestMat, list.length);
      list.forEach((t, i) => { o.position.set(t.x, t.y, t.z); o.rotation.set(0, t.ry, 0); o.scale.setScalar(t.s); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); });
      inst.castShadow = inst.receiveShadow = true; inst.name = 'ROOT_BEAR_GROVE'; this.root.add(inst); this.groveMeshes.push(inst);
    });
    this.groveTrees = trees;
    this.groveObstacles = trees.map(t => Object.assign(this.g.world.addObstacle({ x: t.x, z: t.z, r: 1.22 * t.s, height: 3.2 * t.s, kind: 'world-conifer' }), { space: 'world' }));
    // 3) Mossy rocks (Pure Poly, already in the repo) on the inner edge, between the clusters.
    this.rockSpots = [];
    for (let i = 0, tries = 0; this.rockSpots.length < C.rocks && tries < 60; tries++, i++) {
      const a = (this.rockSpots.length + .5) / C.rocks * 6.283 + (rand() - .5) * .6, r = G.core + .4 + rand() * 1.8, x = G.x + Math.cos(a) * r, z = G.z + Math.sin(a) * r;
      if (L.pathDistance(x, z) < 3 || [...trees, ...keep].some(t => Math.hypot(t.x - x, t.z - z) < 2.6)) continue;
      this.rockSpots.push({ x, z, s: .55 + rand() * .3, ry: rand() * 6.28 });
    }
    loadGLTF(ROCK).then(gl => {
      for (const R of this.rockSpots) {
        const m = gl.scene.clone(true); m.scale.setScalar(R.s); m.rotation.y = R.ry; m.position.set(R.x, L.worldHeight(R.x, R.z) - .15, R.z);
        m.traverse(q => { if (q.isMesh) { q.castShadow = q.receiveShadow = true; } }); m.name = 'ROOT_BEAR_ROCK'; this.root.add(m);
        R.o = Object.assign(this.g.world.addObstacle({ x: R.x, z: R.z, r: 1.45 * R.s, height: 1.6 * R.s, kind: 'world-rock' }), { space: 'world' });
      }
    }).catch(e => console.warn('[TGW] Root Bear rocks unavailable (fails soft)', e));
  }

  async load() {
    try {
      const gl = await loadGLTF(`${DIR}${RB.file}.glb`);
      const s = this.bear = gl.scene; s.scale.setScalar(RB.scale); this.root.add(s);
      s.traverse(o => { if (o.isMesh) { o.castShadow = !/FX_/.test(o.name); o.receiveShadow = true; o.frustumCulled = false; } });
      this.mixer = new THREE.AnimationMixer(s); this.fxMixer = new THREE.AnimationMixer(s);
      this.clips = Object.fromEntries(gl.animations.map(c => [c.name, c]));
      this.eyes = []; s.traverse(o => { if (o.isMesh && o.material?.name === 'eye_glow') this.eyes.push(o); });
      this.eyeOn = this.eyes[0]?.material?.emissiveIntensity ?? 1;
      this.spikes = []; for (let i = 0; i < 7; i++) { const n = s.getObjectByName(`FX_RootSpike_${i}`); if (n) this.spikes.push(n); }
      this.telegraph = s.getObjectByName('FX_RootTelegraph');
      if (this.telegraph) this.telegraph.position.y = .35;   // the authored strip (0.04) sinks under uneven ground
      this.bodyParts = RB.body.map(([n, r]) => ({ bone: s.getObjectByName(n), r, o: Object.assign(this.g.world.addObstacle({ x: this.den.x, z: this.den.z, r, height: 4, kind: 'boss-root-bear' }), { space: 'world' }) })).filter(b => b.bone);
      this.reset(); this.buildSleepColliders();
    } catch (e) { console.warn('[TGW] Root Bear unavailable (fails soft)', e); this.bear = null; }
    return this;
  }

  // ---------- animation helpers ----------
  play(name, { once = false, speed = 1, fade = 0 } = {}) {
    const clip = this.clips[name]; if (!clip) return 0;
    const a = this.mixer.clipAction(clip);
    if (!once && this.cur === a && a.isRunning()) { a.timeScale = speed; return clip.duration / speed; }
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity); a.clampWhenFinished = once; a.timeScale = speed;
    if (fade && this.cur && this.cur !== a) { a.play(); this.cur.crossFadeTo(a, fade, false); } else { this.mixer.stopAllAction(); a.play(); }
    this.cur = a; return clip.duration / speed;
  }
  fx(name, speed = 1) { const c = this.clips[name]; if (!c) return; this.fxMixer.stopAllAction(); const a = this.fxMixer.clipAction(c); a.reset().setLoop(THREE.LoopOnce, 1); a.timeScale = speed; a.play(); }
  clearRootFx() { this.fxMixer.stopAllAction(); for (const s of this.spikes) s.scale.set(0, 0, 0); this.telegraph?.scale.set(0, 1, 0); }
  setEyes(k) { for (const e of this.eyes || []) { e.visible = k > .02; if (e.material) e.material.emissiveIntensity = this.eyeOn * k; } }
  local(lx, lz) { const y = this.heading, c = Math.cos(y), n = Math.sin(y), s = RB.scale; return { x: this.bx + (lx * c + lz * n) * s, z: this.bz + (-lx * n + lz * c) * s }; }
  phase() { const f = this.hp / RB.hp; let ph = RB.phases[0]; for (const p of RB.phases) if (f <= p.at) ph = p; return ph; }
  place() { this.bear.position.set(this.bx, this.L.groundHeight(this.bx, this.bz) + (this.sink || 0), this.bz); this.bear.rotation.set(0, this.heading, this.tilt || 0); }
  turnTo(x, z, dt, rate = 2.2) { const want = Math.atan2(x - this.bx, z - this.bz); let d = want - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); this.heading = Math.atan2(Math.sin(this.heading + Math.max(-rate * dt, Math.min(rate * dt, d))), Math.cos(this.heading + Math.max(-rate * dt, Math.min(rate * dt, d)))); return Math.abs(d); }

  // ---------- clock + flow ----------
  awakeNow(now = Date.now()) { if (this.forceAwake != null) return this.forceAwake; return now < this.devAwakeUntil || (now / 1000) % RB.cycleSec < RB.awakeSec; }
  available(now = Date.now()) { return !this.p.defeatedAt || now - this.p.defeatedAt > (RB.rematchGameDays ? RB.rematchGameDays * DAY_MS : RB.rematchHours * 3600000); }   // R81: one in-game day
  fighting() { return FIGHT.includes(this.state); }
  reset() {
    this.hp = RB.hp; this.weak = 0; this.sink = 0; this.tilt = 0; this.hitT = 0; this.tele.visible = false; this.clearRootFx();
    this.ui.classList.remove('show'); this.setZoom(false);
    if (!this.available()) { this.state = 'resting'; this.bear.visible = false; this.syncObstacle(); return; }
    this.bear.visible = true;
    if (this.awakeNow()) { this.bx = this.bx ?? this.den.x; this.bz = this.bz ?? this.den.z; this.heading ??= this.den.heading; this.state = 'wander'; this.wanderTo = null; this.pause = 1; this.play('Idle'); this.setEyes(1); }
    else { this.bx = this.den.x; this.bz = this.den.z; this.heading = this.den.heading; this.state = 'sleep'; this.play('Sleep'); this.setEyes(0); }
    this.t = 0; this.place(); this.syncObstacle();
  }
  // Sleeping body = circles over its own bark/moss vertices up to 2.2 m in the Sleep pose on the den (Wood Giant R72.2
  // method). Awake, the bone circles follow it.
  buildSleepColliders() {
    if (this.state !== 'sleep') { this.pendingSleepColliders = true; return; }
    const s = this.bear, v = new THREE.Vector3(), base = this.L.groundHeight(this.den.x, this.den.z), R = .55, GAP = .8, pts = [];
    this.mixer.update(0); s.updateMatrixWorld(true);
    s.traverse(m => {
      if (!m.isSkinnedMesh || !/^(bark|moss)$/.test(m.material?.name || '')) return; const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 2) { v.fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); v.applyMatrix4(m.matrixWorld); if (v.y - base < 2.2) pts.push([v.x, v.z]); }
    });
    const keep = []; for (const [x, z] of pts) if (!keep.some(c => Math.hypot(c.x - x, c.z - z) < GAP)) keep.push({ x, z });
    this.sleepObstacles = keep.map(c => Object.assign(this.g.world.addObstacle({ x: c.x, z: c.z, r: R, height: 2.2, kind: 'boss-root-bear-sleep' }), { space: 'world', r0: R }));
    this.pendingSleepColliders = false; this.syncObstacle();
  }
  syncObstacle() {
    if (!this.bodyParts) return;
    const asleep = this.state === 'sleep' && this.bear.visible, awake = this.bear.visible && !asleep && this.state !== 'sinking';
    if (awake) this.bear.updateMatrixWorld(true);
    const p = new THREE.Vector3();
    for (const b of this.bodyParts) { if (awake) { b.bone.getWorldPosition(p); b.o.x = p.x; b.o.z = p.z; } b.o.r = awake ? b.r : .01; }
    for (const o of this.sleepObstacles || []) o.r = asleep ? o.r0 : .01;
  }

  // ---------- telegraph + UI ----------
  buildTelegraph() {
    const ring = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff8a4a, transparent: true, opacity: 0, depthWrite: false }));
    const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: 0, depthWrite: false }));
    this.tele = new THREE.Group(); this.tele.add(ring, fill); this.tele.visible = false; this.tele.renderOrder = 4; this.c.root.add(this.tele); this.teleRing = ring; this.teleFill = fill;
  }
  showTele(x, z, r, k) { this.tele.visible = true; this.tele.position.set(x, this.L.groundHeight(x, z) + .06, z); this.tele.scale.setScalar(r); this.teleRing.material.opacity = .85; this.teleFill.material.opacity = .12 + k * .3; this.teleFill.scale.setScalar(Math.max(.01, k)); }
  buildUi() { const el = document.createElement('div'); el.className = 'boss-bar'; el.innerHTML = '<b>Root Bear</b><div class="boss-track"><i></i></div>'; document.body.appendChild(el); this.ui = el; this.uiFill = el.querySelector('i'); }
  renderUi() { this.uiFill.style.width = `${Math.max(0, this.hp / RB.hp) * 100}%`; this.ui.classList.toggle('weak', this.weak > 0); }
  // Same boss camera rule as the Wood Giant's yaw part: the free camera glides behind you, facing the bear.
  setZoom(on) {
    if (!on && !this.zoomOn) return; this.zoomOn = !!on;
    document.body.classList.toggle('boss-active', !!on);
    const cam = this.g.followCamera; if (cam) cam.lockYaw = on ? () => Math.atan2(this.g.character.position.x - this.bx, this.g.character.position.z - this.bz) : null;
  }

  // ---------- fight ----------
  begin(fromSleep) {
    this.hp = RB.hp; this.weak = 0; this.t = 0; this.ui.classList.add('show'); this.renderUi(); this.setZoom(true); this.c.lastCombat = this.c.time;
    if (fromSleep) { this.state = 'wake'; this.wakeLen = this.play('WakeUp', { once: true }) || 1.6; this.fx('WakeUp_FX'); this.g.hud?.showToast('The Root Bear wakes!'); }
    else { this.state = 'chase'; this.play('Idle', { fade: .3 }); this.setEyes(1); this.g.hud?.showToast('The Root Bear charges!'); }
    this.syncObstacle();
  }
  end(won) {
    this.ui.classList.remove('show'); this.setZoom(false); this.tele.visible = false; this.shake = 0; this.clearRootFx();
    if (!won) { this.state = 'calm'; this.t = 0; this.weak = 0; this.hp = RB.hp; this.play('Idle', { fade: .4 }); return; }   // it gives up and goes back to its routine
    this.state = 'sinking'; this.t = 0; this.play('Hit', { once: true }); this.fx('Hit_FX');
    const first = !this.p.wins; this.p.wins++; this.p.defeatedAt = Date.now(); this.g.save.persist();
    const rw = first ? RB.reward.first : RB.reward.again, f = this.local(0, 6); let i = 0; const n = Object.keys(rw).length;
    for (const [id, k] of Object.entries(rw)) { if (this.c.models[`loot_${id}`]) this.c.dropLoot(id, k, f.x, f.z, i++, n); else this.w.give(id, k); }
    this.g.hud?.showToast(first ? 'The Root Bear sinks into its roots. Something glows where it stood!' : 'The Root Bear sinks into its roots again.');   // R149: the Hyacinth Seed follows
  }
  // Player strike: nearest body circle. Returns a target for CombatSystem.
  target(px, pz, reach) {
    if (!this.fighting() || !this.bodyParts) return null;
    let best = null; for (const b of this.bodyParts) { const d = Math.hypot(px - b.o.x, pz - b.o.z) - b.r; if (!best || d < best.d) best = { kind: 'bear', m: this, d: Math.max(0, d), x: b.o.x, z: b.o.z }; }
    return best && best.d < reach ? best : null;
  }
  hit(t, dmg) { const ch = this.g.character.position; this.damage(this.weak > 0 ? dmg * RB.weakMultiplier : RB.barkDamage, ch.x, ch.z, this.weak > 0); return true; }
  damage(n, x, z, big) {
    if (!this.fighting()) return;
    this.hp = Math.max(0, this.hp - n); this.renderUi(); this.c.spawnFx(big ? 'Hit_Big' : 'Hit_Leaves', x, z); this.c.lastCombat = this.c.time;
    if (this.hp <= 0) return this.end(true);
    if (big && this.state === 'stuck') { this.hitT = this.play('Hit', { once: true }); this.fx('Hit_FX'); }   // Hit reaction only inside the weak window (no stun-lock)
  }
  startAttack(kind, ph) {
    this.state = kind; this.t = 0; this.hitDone = false; this.spikeSeen = new Set();
    this.attackLen = this.play(kind === 'sweep' ? 'Sweep' : 'Roots', { once: true, speed: ph.speed }); this.fx(kind === 'sweep' ? 'Sweep_FX' : 'Roots_FX', ph.speed);
  }

  // ---------- frame ----------
  update(dt, ch) {
    if (!this.bear) return;
    const px = ch.position.x, pz = ch.position.z, dDen = Math.hypot(px - this.den.x, pz - this.den.z);
    if (this.state === 'resting') { if (this.available()) this.reset(); return; }
    const far = dDen > 90 && !this.fighting();
    if (far) {   // out of sight: keep the clock state only (no animation, no wandering)
      const want = this.awakeNow() ? 'wander' : 'sleep';
      if ((this.state === 'sleep' || this.state === 'wander' || this.state === 'calm' || this.state === 'rise' || this.state === 'lie') && this.state !== want) { this.bx = this.den.x; this.bz = this.den.z; this.heading = this.den.heading; this.reset(); }
      this.bear.visible = false; return;   // not drawn (or shadowed) from afar; the grove stays
    }
    if (!this.bear.visible && this.state !== 'sinking') this.bear.visible = true;
    this.mixer.update(dt); this.fxMixer.update(dt); this.t += dt;
    this.weak = Math.max(0, this.weak - dt); this.shake = Math.max(0, this.shake - dt); this.hitT = Math.max(0, this.hitT - dt);
    const quiet = this.c.wilting || this.g.world.space !== 'world' || this.g.fishing?.mode === 'boat';
    const dB = Math.hypot(px - this.bx, pz - this.bz), core = this.G.core - RB.coreMargin;
    switch (this.state) {
      case 'sleep':
        if (this.pendingSleepColliders) this.buildSleepColliders();
        if (!quiet && dB < RB.wakeRange) { this.begin(true); break; }
        if (this.awakeNow()) { this.state = 'rise'; this.t = 0; this.riseLen = this.play('WakeUp', { once: true }) || 1.6; this.syncObstacle(); }
        break;
      case 'rise': this.setEyes(Math.min(1, Math.max(0, (this.t / this.riseLen - .35) / .4))); if (this.t >= this.riseLen) { this.state = 'wander'; this.t = 0; this.pause = 1 + Math.random() * 2; this.play('Idle'); this.setEyes(1); } break;
      case 'calm': case 'wander': {
        if (!quiet && dB < RB.wakeRange && this.state === 'wander') { this.begin(false); break; }
        if (this.state === 'calm' && this.t > 2) { this.state = 'wander'; this.t = 0; this.pause = 0; }
        if (!this.awakeNow()) { this.state = 'lie'; this.t = 0; break; }
        if (this.pause > 0) { this.pause -= dt; this.play('Idle', { fade: .4 }); break; }
        if (!this.wanderTo) { const a = Math.random() * 6.283, r = Math.random() * (core - 1.5); this.wanderTo = { x: this.den.x + Math.cos(a) * r, z: this.den.z + Math.sin(a) * r }; }
        this.walkTo(this.wanderTo, RB.wanderSpeed, dt, () => { this.wanderTo = null; this.pause = 2 + Math.random() * 3; });
        break;
      }
      case 'lie':   // back to the den, turn to its sleeping heading, lie down
        if (Math.hypot(this.den.x - this.bx, this.den.z - this.bz) > .5) { this.walkTo(this.den, RB.wanderSpeed, dt, () => {}); break; }
        this.bx = this.den.x; this.bz = this.den.z;
        { let d = this.den.heading - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); this.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, d)); if (Math.abs(d) > .05) { this.play('Walk', { speed: .4, fade: .3 }); break; } }
        this.heading = this.den.heading; this.state = 'sleep'; this.t = 0; this.play('Sleep', { fade: .9 }); this.setEyes(0); break;
      case 'sinking': {
        const k = Math.min(1, this.t / 3.2); this.sink = -k * 6; this.tilt = k * .2;
        if (k >= 1) { this.bear.visible = false; this.state = 'resting'; this.bx = this.den.x; this.bz = this.den.z; this.heading = this.den.heading; this.sink = 0; this.tilt = 0; }
        break;
      }
      default: this.updateFight(dt, ch, px, pz, dB, dDen, core, quiet);
    }
    if (this.bear.visible) this.place();
    this.syncObstacle();
  }
  walkTo(T, speed, dt, arrived) {
    const d = Math.hypot(T.x - this.bx, T.z - this.bz); if (d < .4) { arrived(); return; }
    const off = this.turnTo(T.x, T.z, dt, 1.6); this.play('Walk', { speed: speed / RB.walkSpeed * 1.1, fade: .3 });
    if (off < 1.2) { const sp = speed * dt * (off < .5 ? 1 : .4); this.bx += (T.x - this.bx) / d * Math.min(sp, d); this.bz += (T.z - this.bz) / d * Math.min(sp, d); }
  }
  updateFight(dt, ch, px, pz, dB, dDen, core, quiet) {
    if (this.c.wilting) return this.end(false);
    if (dDen > RB.leash || this.g.world.space !== 'world') return this.end(false);   // ran out of the grove: it gives up
    const ph = this.phase(); this.c.lastCombat = this.c.time; this.ui.classList.add('show');
    switch (this.state) {
      case 'wake': { const k = Math.min(1, Math.max(0, (this.t / this.wakeLen - .35) / .4)); this.setEyes(k); if (this.t >= this.wakeLen) { this.setEyes(1); this.state = 'chase'; this.t = 0; } break; }
      case 'stuck': if (this.hitT <= 0) this.play('Idle', { speed: .5, fade: .2 }); if (this.t > this.stuckFor) { this.state = 'chase'; this.t = 0; } break;
      case 'chase': {
        this.turnTo(px, pz, dt, 2.6);
        if (dB > RB.sweep.range - .5) {
          this.play('Walk', { speed: ph.speed, fade: .25 }); const sp = RB.walkSpeed * ph.speed * dt;
          this.bx += (px - this.bx) / dB * sp; this.bz += (pz - this.bz) / dB * sp;
          const off = Math.hypot(this.bx - this.den.x, this.bz - this.den.z); if (off > core) { const k = core / off; this.bx = this.den.x + (this.bx - this.den.x) * k; this.bz = this.den.z + (this.bz - this.den.z) * k; }
        } else this.play('Idle', { fade: .25 });
        if (this.t > 1 && !quiet) {
          if (dB < RB.sweep.range) this.startAttack('sweep', ph);
          else if (dB < RB.roots.range && (this.rollT = (this.rollT || 0) + dt) > 1) { this.rollT = 0; if (Math.random() < ph.roots) { this.heading = Math.atan2(px - this.bx, pz - this.bz); this.startAttack('roots', ph); } }
        }
        break;
      }
      case 'sweep': {
        const A = RB.sweep, at = A.impactAt / ph.speed, P = this.local(0, A.center);
        if (!this.hitDone) this.showTele(P.x, P.z, A.radius, Math.min(1, this.t / at));
        if (!this.hitDone && this.t >= at) { this.hitDone = true; this.tele.visible = false; this.shake = .35; if (Math.hypot(px - P.x, pz - P.z) < A.radius) this.c.hurt(A.damage, P.x, P.z, A.push); }
        if (this.t >= this.attackLen) this.toStuck('sweep');
        break;
      }
      case 'roots': {
        // The GLB animates its own telegraph strip and 7 spikes (FX_RootSpike_0..6) along its front; each spike that
        // pops up checks you once.
        const A = RB.roots, v = new THREE.Vector3();
        if (this.t >= A.impactFrom / ph.speed - .05) for (const s of this.spikes) {
          if (this.spikeSeen.has(s) || s.scale.x < .3) continue; this.spikeSeen.add(s); if (this.spikeSeen.size === 1) this.shake = .4;
          s.getWorldPosition(v); if (!this.hitDone && Math.hypot(px - v.x, pz - v.z) < A.radius) { this.hitDone = true; this.c.hurt(A.damage, v.x, v.z, A.push); }
        }
        if (this.t >= this.attackLen) { this.clearRootFx(); this.toStuck('roots'); }
        break;
      }
    }
  }
  // Wood Giant R63.1/R64.1 camera, simplified for a grove without walls: low behind you, looking up between your head
  // and the bear's chest. While you are inside the open core it stays inside the core (pulled in + lifted at the
  // edge) so no ring tree comes between; outside the core the normal follow camera (with occlusion) takes over.
  applyCamera(camera, ch) {
    const px = ch.position.x, pz = ch.position.z, maxR = this.G.core - .5, inCore = Math.hypot(px - this.den.x, pz - this.den.z) < maxR;
    if (!this.bear || !this.fighting() || !inCore) { if (this.camActive) { this.camActive = false; this.g.resize?.(); } return; }
    const C = RB.camera, yaw = this.g.followCamera?.yaw ?? Math.atan2(px - this.bx, pz - this.bz);
    let x = px + Math.sin(yaw) * C.distance, z = pz + Math.cos(yaw) * C.distance;
    const dx = x - this.den.x, dz = z - this.den.z, d = Math.hypot(dx, dz);
    if (d > maxR) { x = this.den.x + dx * maxR / d; z = this.den.z + dz * maxR / d; }
    const lost = Math.max(0, C.distance - Math.hypot(x - px, z - pz)), lift = Math.min(lost * C.edgeLift, C.liftMax);
    camera.position.set(x, Math.max(ch.position.y + C.height + lift, this.L.groundHeight(x, z) + .8), z);
    const chest = this.L.groundHeight(this.bx, this.bz) + C.chestY, head = ch.position.y + 1.2, k = C.lookBlend;
    camera.lookAt(px + (this.bx - px) * k, head + (chest - head) * k, pz + (this.bz - pz) * k);
    const fov = camera.aspect < .8 ? C.fovPortrait : C.fovLandscape;
    if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    this.camActive = true;
  }
  toStuck(kind) { this.stuckFor = RB.weakWindow[kind]; this.weak = this.stuckFor; this.state = 'stuck'; this.t = 0; this.hitT = 0; this.renderUi(); }
}
