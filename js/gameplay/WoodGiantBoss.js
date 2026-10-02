// @ts-nocheck
// R63 Wood Giant — first boss, built on the R61 combat contract (hp, hurt(), telegraphs, drops).
// Arena (Ø24 m, gate toward +Z) somewhere open in the wilds. Walk in → GateClose, boss bar, camera
// pulls back. Phase 1: walk + Stomp (ground ring telegraph, 1 heart). Phase 2 (<60 %): + Slam (2 hearts)
// + root attacks under you (warn ring → strike; the risen root's weak point can be hit and hurts the
// Giant). Phase 3 (<25 %): more roots, faster. After every Stomp/Slam the Giant is stuck for a moment:
// hits there do double damage. Defeat → it sinks into the ground, GateOpen, loot (first win: Golden Seed).
// Wilting resets the fight. The Giant model is skinned, so the single instance uses the GLB scene itself.
import * as THREE from 'three';
import { loadGLTF } from '../core/AssetManager.js';
import { WildsModel } from './WildsModels.js';
import { GIANT } from '../data/combatCatalog.js';

const DIR = './assets/combat/';
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export class WoodGiantBoss {
  constructor(combat) {
    this.c = combat; this.g = combat.g; this.w = combat.w; this.L = combat.L;
    this.p = combat.p.giant ||= { defeatedAt: 0, wins: 0 };
    this.state = 'off'; this.t = 0; this.hp = GIANT.hp; this.roots = []; this.weak = 0; this.rootT = 0; this.shake = 0;
    this.root = new THREE.Group(); this.root.name = 'WILDS_BOSS_WOOD_GIANT'; combat.root.add(this.root);
    this.site = this.placeArena();
    if (this.site) this.root.position.set(this.site.x, this.site.y, this.site.z);
    this.buildUi(); this.buildTelegraph();
    this.ready = this.site ? this.load() : Promise.resolve(this);
  }

  // Open, flat-ish spot away from home, nodes, thornbrush and Moles (deterministic).
  placeArena() {
    const w = this.w, L = this.L, rand = rng(4242); let best = null;
    const busy = [...w.nodes, ...w.thorns, ...this.c.moles.map(m => m.home)];
    for (let i = 0; i < 900; i++) {
      const a = rand() * 6.283, r = 45 + rand() * 95, x = Math.cos(a) * r, z = 10 + Math.sin(a) * r;
      if (!w.valid(x, z, 12.5, [])) continue;
      if (busy.some(n => Math.hypot(n.x - x, n.z - z) < 14)) continue;
      let ok = true, min = Infinity, max = -Infinity;
      for (let k = 0; k < 16 && ok; k++) { const b = k / 16 * 6.283, px = x + Math.cos(b) * 12, pz = z + Math.sin(b) * 12; if (!w.valid(px, pz, .5, [])) ok = false; const h = L.groundHeight(px, pz); min = Math.min(min, h); max = Math.max(max, h); }
      if (!ok) continue;
      const score = max - min; if (!best || score < best.score) best = { x, z, y: L.groundHeight(x, z), score };
      if (best.score < .4) break;
    }
    return best;
  }

  async load() {
    try {
      const [giant, arena, root] = await Promise.all(['wood-giant', 'arena_wood_giant', 'arena_root_attack'].map(f => loadGLTF(`${DIR}${f}.glb`)));
      this.arena = new WildsModel(arena, 'arena', { scale: 1 }); this.root.add(this.arena.root); this.arena.loop('Idle');
      this.rootGltf = root;
      const s = this.giant = giant.scene; s.scale.setScalar(GIANT.scale); this.root.add(s);
      s.traverse(o => { if (o.isMesh) { o.castShadow = !/FX_/.test(o.name); o.receiveShadow = true; o.frustumCulled = false; } });
      this.mixer = new THREE.AnimationMixer(s); this.fxMixer = new THREE.AnimationMixer(s);
      this.clips = Object.fromEntries(giant.animations.map(c => [c.name, c]));
      this.obstacle = this.g.world.addObstacle({ x: this.site.x, z: this.site.z, r: GIANT.bodyRadius * .75, height: 6, kind: 'boss-wood-giant' });
      this.reset();
    } catch (e) { console.warn('[TGW] Wood Giant unavailable (fails soft)', e); this.site = null; }
    return this;
  }

  // ---------- giant animation helpers ----------
  loop(name, speed = 1) { const a = this.mixer.clipAction(this.clips[name]); if (this.cur === a && a.isRunning()) { a.timeScale = speed; return; } this.mixer.stopAllAction(); a.reset().setLoop(THREE.LoopRepeat, Infinity); a.timeScale = speed; a.play(); this.cur = a; }
  once(name, speed = 1) { this.mixer.stopAllAction(); const a = this.mixer.clipAction(this.clips[name]); a.reset().setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = speed; a.play(); this.cur = a; return a.getClip().duration / speed; }
  fx(name) { const c = this.clips[name]; if (!c) return; this.fxMixer.stopAllAction(); const a = this.fxMixer.clipAction(c); a.reset().setLoop(THREE.LoopOnce, 1); a.play(); }
  local(lx, lz) { const y = this.giant.rotation.y, s = GIANT.scale, c = Math.cos(y), n = Math.sin(y); return { x: this.gx + (lx * c + lz * n) * s, z: this.gz + (-lx * n + lz * c) * s }; }
  phase() { const f = this.hp / GIANT.hp; let ph = GIANT.phases[0]; for (const p of GIANT.phases) if (f <= p.at) ph = p; return ph; }

  // ---------- telegraph + UI ----------
  buildTelegraph() {
    const ring = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff8a4a, transparent: true, opacity: .0, depthWrite: false }));
    const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: 0, depthWrite: false }));
    this.tele = new THREE.Group(); this.tele.add(ring, fill); this.tele.visible = false; this.tele.renderOrder = 4; this.c.root.add(this.tele); this.teleRing = ring; this.teleFill = fill;
  }
  showTele(x, z, r, k) {
    this.tele.visible = true; this.tele.position.set(x, this.L.groundHeight(x, z) + .06, z); this.tele.scale.setScalar(r);
    this.teleRing.material.opacity = .85; this.teleFill.material.opacity = .12 + k * .3; this.teleFill.scale.setScalar(Math.max(.01, k));
  }
  buildUi() {
    const el = document.createElement('div'); el.className = 'boss-bar'; el.innerHTML = '<b>Wood Giant</b><div class="boss-track"><i></i></div>';
    document.body.appendChild(el); this.ui = el; this.uiFill = el.querySelector('i');
  }
  renderUi() { this.uiFill.style.width = `${Math.max(0, this.hp / GIANT.hp) * 100}%`; this.ui.classList.toggle('weak', this.weak > 0); }

  // ---------- fight flow ----------
  available(now = Date.now()) { return !this.p.defeatedAt || now - this.p.defeatedAt > GIANT.rematchHours * 3600000; }
  reset() {
    this.state = this.available() ? 'sleep' : 'resting'; this.t = 0; this.hp = GIANT.hp; this.weak = 0; this.rootT = 0;
    this.gx = this.site.x; this.gz = this.site.z - 2; this.giant.position.set(0, 0, -2); this.giant.rotation.set(0, 0, 0); this.giant.visible = this.state === 'sleep';
    this.loop('Idle', .6); this.arena.loop('Idle');
    for (const r of this.roots) this.c.root.remove(r.model.root); this.roots = [];
    this.tele.visible = false; this.ui.classList.remove('show'); this.setZoom(false); this.syncObstacle();
    for (const wv of this.waves || []) this.c.root.remove(wv.mesh); this.waves = [];
  }
  syncObstacle() { if (this.obstacle) { this.obstacle.x = this.gx; this.obstacle.z = this.gz; this.obstacle.r = this.giant.visible ? GIANT.bodyRadius * .75 : 0.01; } }
  // R63.1 boss camera: the free camera's yaw glides to 'behind you, facing the Giant' (swipe still looks
  // around), then applyCamera() places it low and looks up between your head and the Giant's chest.
  setZoom(on) {
    const cam = this.g.followCamera; if (!cam) return;
    cam.lockYaw = on ? () => Math.atan2(this.g.character.position.x - this.gx, this.g.character.position.z - this.gz) : null;
    if (!on && this.camActive) { this.camActive = false; this.g.resize?.(); }
  }
  begin() {
    this.state = 'wake'; this.t = 0; this.arena.play(['GateClose'], () => this.arena.loop('Idle'));
    this.ui.classList.add('show'); this.renderUi(); this.setZoom(true); this.loop('Idle', 1.4);
    this.g.hud?.showToast('The Wood Giant wakes!');
  }
  end(won) {
    this.ui.classList.remove('show'); this.setZoom(false); this.tele.visible = false; this.shake = 0; // R64.2: a lethal Stomp/Slam left the shake set (it only decays in the world)
    for (const wv of this.waves || []) this.c.root.remove(wv.mesh); this.waves = [];
    for (const r of this.roots) this.c.root.remove(r.model.root); this.roots = [];
    if (!won) return this.reset();
    this.state = 'sinking'; this.t = 0; this.fx('Slam_FX'); this.loop('Idle', .3);
    const first = !this.p.wins; this.p.wins++; this.p.defeatedAt = Date.now(); this.g.save.persist();
    const rw = first ? GIANT.reward.first : GIANT.reward.again;
    let i = 0; const n = Object.keys(rw).length;
    for (const [id, k] of Object.entries(rw)) { if (this.c.models[`loot_${id}`]) this.c.dropLoot(id, k, this.gx, this.gz + 3, i++, n); else this.w.give(id, k); }
    this.g.hud?.showToast(first ? 'The Wood Giant rests. A Golden Seed glows where it stood!' : 'The Wood Giant rests again.');
  }

  // Player strike: body (legs) or a risen root's weak point. Returns a target for CombatSystem.
  target(px, pz, reach) {
    if (!this.fighting()) return null;
    let best = null;
    for (const r of this.roots) if (r.state === 'up') { const d = Math.hypot(px - r.x, pz - r.z); if (d < GIANT.root.weakRange + .3 && (!best || d < best.d)) best = { kind: 'root', m: r, d, x: r.x, z: r.z }; }
    if (best) return best;
    const d = Math.hypot(px - this.gx, pz - this.gz) - GIANT.bodyRadius;
    return d < reach ? { kind: 'giant', m: this, d: Math.max(0, d), x: this.gx, z: this.gz } : null;
  }
  fighting() { return ['wake', 'walk', 'stomp', 'slam', 'stuck'].includes(this.state); }
  hit(t, dmg) {
    if (t.kind === 'root') { const r = t.m; r.state = 'retract'; r.model.play(['WeakHit', 'Retract'], () => r.done = true); this.damage(GIANT.root.weakDamage, r.x, r.z, true); return true; }
    this.damage(this.weak > 0 ? dmg * GIANT.weakMultiplier : GIANT.barkDamage, this.c.g.character.position.x, this.c.g.character.position.z, this.weak > 0);
    return true;
  }
  damage(n, x, z, big) {
    this.hp = Math.max(0, this.hp - n); this.renderUi(); this.c.spawnFx(big ? 'Hit_Big' : 'Hit_Leaves', x, z); this.c.lastCombat = this.c.time;
    if (this.hp <= 0) this.end(true);
  }

  // ---------- frame ----------
  update(dt, ch) {
    if (!this.site || !this.giant) return;
    const px = ch.position.x, pz = ch.position.z, dC = Math.hypot(px - this.site.x, pz - this.site.z);
    if (dC > 70 && (this.state === 'sleep' || this.state === 'resting')) return;
    this.mixer.update(dt); this.fxMixer.update(dt); this.arena.update(dt); this.t += dt;
    this.weak = Math.max(0, this.weak - dt); this.shake = Math.max(0, this.shake - dt);
    if (this.state === 'resting') { if (this.available()) this.reset(); return; }
    if (this.state === 'sleep') { if (dC < GIANT.wakeRange && !this.c.wilting) this.begin(); return; }
    if (this.state === 'sinking') {
      const k = Math.min(1, this.t / 3.2); this.giant.position.y = -k * 9; this.giant.rotation.z = k * .25;
      if (k >= 1) { this.giant.visible = false; this.state = 'resting'; this.arena.play(['GateOpen'], () => this.arena.loop('Idle')); this.syncObstacle(); }
      return;
    }
    if (this.c.wilting) { this.end(false); return; }
    // Arena boundary while fighting (the gate is closed).
    if (dC > GIANT.arenaRadius) { const k = GIANT.arenaRadius / dC; ch.position.x = this.site.x + (px - this.site.x) * k; ch.position.z = this.site.z + (pz - this.site.z) * k; }
    const ph = this.phase(), face = () => { this.giant.rotation.y = Math.atan2(px - this.gx, pz - this.gz); };
    const d = Math.hypot(px - this.gx, pz - this.gz);
    this.ui.classList.add('show'); this.c.lastCombat = this.c.time;
    switch (this.state) {
      case 'wake': if (this.t > 1.6) { this.state = 'walk'; this.t = 0; } break;
      case 'stuck': this.loop('Idle', .5); if (this.t > this.stuckFor) { this.state = 'walk'; this.t = 0; } break;
      case 'walk': {
        face(); this.loop('Walk', ph.speed);
        if (d > GIANT.stomp.range - .4) { const sp = GIANT.walkSpeed * ph.speed * dt; this.gx += (px - this.gx) / d * sp; this.gz += (pz - this.gz) / d * sp; const off = Math.hypot(this.gx - this.site.x, this.gz - this.site.z); if (off > GIANT.arenaRadius - 3) { const k = (GIANT.arenaRadius - 3) / off; this.gx = this.site.x + (this.gx - this.site.x) * k; this.gz = this.site.z + (this.gz - this.site.z) * k; } }
        if (this.t > 1.2 && d < GIANT.slam.range && ph.roots && Math.random() < .5) { this.startAttack('slam', ph); }
        else if (this.t > 1.2 && d < GIANT.stomp.range) this.startAttack('stomp', ph);
        break;
      }
      case 'stomp': case 'slam': {
        const A = GIANT[this.state], at = A.impactAt / ph.speed, k = Math.min(1, this.t / at), phIdx = GIANT.phases.indexOf(ph);
        const P = this.state === 'stomp' ? this.local(...A.footLocal) : this.local(...A.frontLocal);
        if (!this.hitDone) this.showTele(P.x, P.z, A.radius, k);
        if (!this.hitDone && this.t >= at) {
          this.hitDone = true; this.tele.visible = false; this.shake = .45; this.fx(this.state === 'stomp' ? 'Stomp_FX' : 'Slam_FX');
          if (Math.hypot(px - P.x, pz - P.z) < A.radius) this.c.hurt(A.damage, P.x, P.z);
          if (this.state === 'stomp' && phIdx >= GIANT.shockwave.fromPhase) this.spawnWave(P.x, P.z);
        }
        if (this.t >= this.attackLen) { this.stuckFor = GIANT.weakWindow[this.state]; this.weak = this.stuckFor; this.state = 'stuck'; this.t = 0; this.renderUi(); }
        break;
      }
    }
    // Root attacks under the player (phase 2+).
    if (ph.roots) { this.rootT += dt; if (this.rootT > ph.every) { this.rootT = 0; const v = ch.velocity || { x: 0, z: 0 }, L = GIANT.root.lead; this.spawnRoots(ph.roots, px + v.x * L, pz + v.z * L); } }  // aim where you are heading
    this.updateWaves(dt, ch);
    this.updateRoots(dt, px, pz);
    this.giant.position.set(this.gx - this.site.x, 0, this.gz - this.site.z); this.syncObstacle();
  }
  // R64.1: the closed gate (arch, doors, gate roots) turns see-through while the boss camera is right behind it.
  fadeGate(o) {
    if (!this.gateMats) {
      const arena = this.arena?.root; if (!arena) return; this.gateMats = [];
      const own = x => { const c = x.clone(); c.userData.base = { t: x.transparent, o: x.opacity, d: x.depthWrite }; this.gateMats.push(c); return c; };
      for (const n of ['Arena_WoodGiant_Gate', 'Arena_WoodGiant_DoorL', 'Arena_WoodGiant_DoorR', 'Arena_WoodGiant_GateRoots']) arena.getObjectByName(n)?.traverse(m => {
        if (m.isMesh) m.material = Array.isArray(m.material) ? m.material.map(own) : own(m.material);
      });
      const l = arena.getObjectByName('Arena_WoodGiant_DoorL'), r = arena.getObjectByName('Arena_WoodGiant_DoorR');
      if (l && r) { arena.updateMatrixWorld(true); const a = l.getWorldPosition(new THREE.Vector3()), b = r.getWorldPosition(new THREE.Vector3()); this.gatePos = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }; }
      this.gateO = 1;
    }
    if (Math.abs(o - this.gateO) < .01) return; this.gateO = o;
    for (const m of this.gateMats) { const B = m.userData.base; m.transparent = B.t || o < 1; m.opacity = B.o * o; m.depthWrite = o < 1 ? false : B.d; m.needsUpdate = true; }
  }
  // R63.1 low-angle boss camera (Shadow of the Colossus idea): low behind you, looking up between your head
  // and the Giant's chest, kept inside the arena while the gate is closed.
  applyCamera(camera, ch) {
    if (!this.site || !this.fighting()) { if (this.camActive) { this.camActive = false; this.g.resize?.(); this.fadeGate(1); } return; }
    const C = GIANT.camera, cam = this.g.followCamera, yaw = cam?.yaw ?? Math.atan2(ch.position.x - this.gx, ch.position.z - this.gz);
    // R64.1: always straight behind you (no swing: a swing at the edge ends up looking out of the arena). Near the edge
    // it may go up to `outside` m beyond the arena and rises over the wall by wallLift per metre outside; past that it
    // is pulled in (and lifted by edgeLift per metre lost).
    const px = ch.position.x, pz = ch.position.z, inner = GIANT.arenaRadius - 1.2, max = GIANT.arenaRadius + C.outside;
    let x = px + Math.sin(yaw) * C.distance, z = pz + Math.cos(yaw) * C.distance;
    const dx = x - this.site.x, dz = z - this.site.z, d = Math.hypot(dx, dz);
    if (d > max) { x = this.site.x + dx * max / d; z = this.site.z + dz * max / d; }
    const out = Math.max(0, Math.min(d, max) - inner), lost = Math.max(0, C.distance - Math.hypot(x - px, z - pz));
    const lift = Math.min(out * C.wallLift + lost * C.edgeLift, C.liftMax);
    const y = Math.max(ch.position.y + C.height + lift, this.L.groundHeight(x, z) + .8);
    camera.position.set(x, y, z);
    this.fadeGate(this.gatePos ? Math.min(1, Math.max(C.gateFade, (Math.hypot(x - this.gatePos.x, z - this.gatePos.z) - 3) / 3)) : 1);
    const chest = this.site.y + C.chestY, head = ch.position.y + 1.2, k = C.lookBlend;
    camera.lookAt(px + (this.gx - px) * k, head + (chest - head) * k, pz + (this.gz - pz) * k);
    const fov = camera.aspect < .8 ? C.fovPortrait : C.fovLandscape;
    if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    this.camActive = true;
  }
  // The clip is sped up so its authored impact lands on the (shorter) telegraph.
  startAttack(kind, ph) { const A = GIANT[kind]; this.state = kind; this.t = 0; this.hitDone = false; this.attackLen = this.once(kind === 'stomp' ? 'Stomp' : 'Slam', ph.speed * A.clipImpact / A.impactAt); }

  // Shockwave (phase 2+): a ring rolls outward from the Stomp; be in the air (hop) when it passes.
  spawnWave(x, z) {
    this.waves ||= [];
    const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffb05a, transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, this.L.groundHeight(x, z) + .08, z); m.renderOrder = 4; this.c.root.add(m);
    this.waves.push({ x, z, r: .5, mesh: m, hit: false });
  }
  updateWaves(dt, ch) {
    const W = GIANT.shockwave;
    for (const wv of this.waves || []) {
      wv.r += W.speed * dt; wv.mesh.scale.setScalar(wv.r); wv.mesh.material.opacity = .8 * (1 - wv.r / W.maxRadius);
      const d = Math.hypot(ch.position.x - wv.x, ch.position.z - wv.z), airborne = ch.isGrounded === false || (ch.hopOffset || 0) > W.airborne;
      if (!wv.hit && Math.abs(d - wv.r) < W.width && !airborne) { wv.hit = true; this.c.hurt(W.damage, wv.x, wv.z); }
      if (wv.r > W.maxRadius) { wv.done = true; this.c.root.remove(wv.mesh); }
    }
    this.waves = (this.waves || []).filter(w => !w.done);
  }

  spawnRoots(n, px, pz) {
    if (!this.rootGltf) return;
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283 + Math.random(), r = i === 0 ? 0 : GIANT.root.spacing + Math.random() * 1.6, x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
      if (Math.hypot(x - this.site.x, z - this.site.z) > GIANT.arenaRadius - .5) continue;
      const m = new WildsModel(this.rootGltf, 'root', { scale: 1.4 }); m.root.position.set(x, this.L.groundHeight(x, z) + .02, z); this.c.root.add(m.root);
      const root = { model: m, x, z, state: 'warn', t: -i * .25, done: false }; m.loop('Warn'); this.roots.push(root);
    }
  }
  updateRoots(dt, px, pz) {
    for (const r of this.roots) {
      r.model.update(dt); r.t += dt;
      if (r.state === 'warn' && r.t > GIANT.root.warn) {
        r.state = 'up'; r.t = 0; r.model.play(['Strike'], () => { if (r.state === 'up') { r.state = 'retract'; r.model.play(['Retract'], () => r.done = true); } });
        if (Math.hypot(px - r.x, pz - r.z) < GIANT.root.radius) this.c.hurt(GIANT.root.damage, r.x, r.z);
      }
    }
    for (const r of this.roots) if (r.done) this.c.root.remove(r.model.root);
    this.roots = this.roots.filter(r => !r.done);
  }
}
