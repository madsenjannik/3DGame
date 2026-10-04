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
import { createHoloIndicator } from '../visual/holo-indicator.js';

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
      // R72: eye glow (material 'eye_glow') is dark while it sleeps and lights up during WakeUp.
      this.eyes = []; s.traverse(o => { if (o.isMesh && o.material?.name === 'eye_glow') this.eyes.push(o); });
      this.eyeOn = this.eyes[0]?.material?.emissiveIntensity ?? 1;
      // R65.2/R65.3: only the two feet block and follow the animated bones every frame, so you can run between the
      // legs (a hip circle closed that gap). space = 'world' explicitly: before R65.1 it took the space active at
      // load time, so it could end up registered for the garden and never block in the world.
      this.bodyParts = [['Foot_L', .8], ['Foot_R', .8]].map(([n, r]) => ({ bone: s.getObjectByName(n), r, o: Object.assign(this.g.world.addObstacle({ x: this.site.x, z: this.site.z, r, height: 6, kind: 'boss-wood-giant' }), { space: 'world' }) }));
      this.obstacle = this.bodyParts[0].o;
      // R72.2: the sleeping Giant's colliders are built from the model itself (buildSleepColliders, after reset).
      this.buildArenaColliders(); this.buildFightMarker();   // R65.1
      this.reset(); this.buildSleepColliders();   // R72.2
    } catch (e) { console.warn('[TGW] Wood Giant unavailable (fails soft)', e); this.site = null; }
    return this;
  }

  // ---------- giant animation helpers ----------
  loop(name, speed = 1) { const a = this.mixer.clipAction(this.clips[name]); if (this.cur === a && a.isRunning()) { a.timeScale = speed; return; } this.mixer.stopAllAction(); a.reset().setLoop(THREE.LoopRepeat, Infinity); a.timeScale = speed; a.play(); this.cur = a; }
  once(name, speed = 1) { this.mixer.stopAllAction(); const a = this.mixer.clipAction(this.clips[name]); a.reset().setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = speed; a.play(); this.cur = a; return a.getClip().duration / speed; }
  fx(name) { const c = this.clips[name]; if (!c) return; this.fxMixer.stopAllAction(); const a = this.fxMixer.clipAction(c); a.reset().setLoop(THREE.LoopOnce, 1); a.play(); }
  local(lx, lz) { const y = this.giant.rotation.y, s = GIANT.scale, c = Math.cos(y), n = Math.sin(y); return { x: this.gx + (lx * c + lz * n) * s, z: this.gz + (-lx * n + lz * c) * s }; }
  setEyes(k) { for (const e of this.eyes || []) { e.visible = k > .02; if (e.material) e.material.emissiveIntensity = this.eyeOn * k; } }
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
    this.gx = this.site.x; this.gz = this.site.z - 2; this.giant.position.set(0, 0, -2); this.giant.rotation.set(0, 0, 0); this.giant.position.y = 0; this.giant.visible = this.state === 'sleep';   // R72: sits asleep in the arena (Sleep); only active after FIGHT
    if (this.clips.Sleep) this.loop('Sleep'); else this.loop('Idle', .6); this.setEyes(this.clips.Sleep ? 0 : 1); this.arena.loop('Idle');
    for (const r of this.roots) this.c.root.remove(r.model.root); this.roots = [];
    this.tele.visible = false; this.ui.classList.remove('show'); this.setZoom(false); this.syncObstacle();
    for (const wv of this.waves || []) this.c.root.remove(wv.mesh); this.waves = [];
  }
  syncObstacle() {
    if (this.bodyParts) {
      this.giant.updateMatrixWorld(true);
      for (const b of this.bodyParts) { const p = b.bone ? b.bone.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(this.gx, 0, this.gz); b.o.x = p.x; b.o.z = p.z; b.o.r = this.giant.visible ? b.r : 0.01; }
      const asleep = this.state === 'sleep' && this.giant.visible; for (const o of this.sleepObstacles || []) o.r = asleep ? o.r0 : 0.01;   // R72.2
    }
    const closed = this.fighting(); for (const o of this.doorObstacles || []) o.r = closed ? o.r0 : 0.01;   // closed line only during the fight
    for (const o of this.openDoorObstacles || []) o.r = closed ? 0.01 : o.r0;                               // open leaves otherwise
  }
  // R65.1: before this the stones, wall and gate had no collision at all (only the Giant's body); outside a fight
  // you walked straight through them. Colliders are circles laid over the arena model's own low vertices
  // (≤ 1.8 m), greedily thinned, so they follow the stones/wall exactly; the doors get their own set.
  // R72.2: while it sits asleep the whole body blocks (feet, legs, hands, torso). Same method as the arena walls:
  // circles over the skinned 'bark' vertices in the Sleep pose up to 2.2 m, greedily thinned. Only active in 'sleep';
  // in the fight the two foot bones stay the only body colliders (free between the legs).
  buildSleepColliders() {
    const s = this.giant, v = new THREE.Vector3(), base = this.site.y ?? 0, R = .55, GAP = .8, pts = [];
    this.mixer.update(0); this.root.updateMatrixWorld(true);
    s.traverse(m => {
      if (!m.isSkinnedMesh || m.material?.name !== 'bark') return; const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); v.applyMatrix4(m.matrixWorld); if (v.y - base < 2.2) pts.push([v.x, v.z]); }
    });
    const keep = []; for (const [x, z] of pts) if (!keep.some(c => Math.hypot(c.x - x, c.z - z) < GAP)) keep.push({ x, z });
    this.sleepObstacles = keep.map(c => { const o = this.g.world.addObstacle({ x: c.x, z: c.z, r: R, height: 2.2, kind: 'boss-wood-giant-sleep' }); o.space = 'world'; o.r0 = R; return o; });
    this.syncObstacle();
  }
  buildArenaColliders() {
    const arena = this.arena.root; arena.updateMatrixWorld(true);
    const v = new THREE.Vector3(), base = this.site.y, R = .42, GAP = .5;
    const circles = node => {
      const pts = [];
      node?.traverse(m => {
        if (!m.isMesh) return; const pos = m.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); if (v.y - base < 1.8) pts.push([v.x, v.z, v.y - base]); }
      });
      const keep = [];
      for (const [x, z, h] of pts) { const k = keep.find(c => Math.hypot(c.x - x, c.z - z) < GAP); if (k) k.h = Math.max(k.h, h); else keep.push({ x, z, h }); }
      return keep;
    };
    const add = (list, kind) => list.map(c => { const o = this.g.world.addObstacle({ x: c.x, z: c.z, r: R, height: Math.max(.6, c.h), kind }); o.space = 'world'; o.r0 = R; return o; });
    this.arenaObstacles = [];
    for (const n of ['Arena_WoodGiant_Stones', 'Arena_WoodGiant_Wall', 'Gate_Post_L', 'Gate_Post_R']) this.arenaObstacles.push(...add(circles(arena.getObjectByName(n)), 'arena-wall'));
    // Doors: the model rests with them open, so their vertices are the wrong place; block the closed line (z 12, post to post).
    const line = []; for (let x = -1.75; x <= 1.76; x += .5) { const p = arena.localToWorld(new THREE.Vector3(x, 0, 12)); line.push({ x: p.x, z: p.z, h: 2.2 }); }
    this.doorObstacles = add(line, 'arena-door');
    // ...and the open door leaves (rest pose) block outside the fight.
    this.openDoorObstacles = [];
    for (const n of ['Arena_WoodGiant_DoorL', 'Arena_WoodGiant_DoorR']) this.openDoorObstacles.push(...add(circles(arena.getObjectByName(n)), 'arena-door-open'));
    this.syncObstacle();
  }
  // R65.1: a golden holo marker just outside the gate (same indicator as RIDE / JUMP / FISH). The Giant no longer
  // wakes when you walk close: you start the fight here (InteractionResolver via CombatSystem, 'combat-fight').
  buildFightMarker() {
    const l = this.arena.root.getObjectByName('Arena_WoodGiant_DoorL'), r = this.arena.root.getObjectByName('Arena_WoodGiant_DoorR');
    const a = l.getWorldPosition(new THREE.Vector3()), b = r.getWorldPosition(new THREE.Vector3()), gx = (a.x + b.x) / 2, gz = (a.z + b.z) / 2;
    const ox = gx - this.site.x, oz = gz - this.site.z, ol = Math.hypot(ox, oz) || 1;
    this.fightPoint = { x: gx + ox / ol * 1.6, z: gz + oz / ol * 1.6 };                 // outside the gate
    this.enterPoint = { x: gx - ox / ol * 2.2, z: gz - oz / ol * 2.2 };                 // where the fight starts, inside
    const holo = createHoloIndicator({ radius: .58, height: 1.3, intensity: .48, breath: 2.4, scanSpeed: 2.0, scanDensity: 90, baseRing: true, groundHalo: true, fadeIn: .35 });
    const c = document.createElement('canvas'); c.width = 246; c.height = 78; const x = c.getContext('2d');
    x.font = '800 44px Manrope, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 8; x.fillStyle = '#ffe9a3'; x.fillText('FIGHT', 123, 41);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); label.scale.set(1.35, .43, 1); label.position.y = 1.58;
    const m = new THREE.Group(); m.name = 'WOOD_GIANT_FIGHT_MARKER'; m.add(holo.group, label);
    m.position.set(this.fightPoint.x, this.L.groundHeight(this.fightPoint.x, this.fightPoint.z) + .015, this.fightPoint.z); this.c.root.add(m);
    this.marker = { m, holo, label };
  }
  // The 'Fight' offer at the marker (CombatSystem passes it to the resolver).
  fightOffer(px, pz) {
    if (!this.fightPoint || this.state !== 'sleep' || this.c.wilting) return null;
    const d = Math.hypot(px - this.fightPoint.x, pz - this.fightPoint.z);
    return d < 1.4 ? { type: 'combat-fight', label: 'Fight the Wood Giant', distance: d } : null;
  }
  startFight() {
    if (this.state !== 'sleep') return false;
    const ch = this.g.character, p = this.enterPoint;
    ch.position.set(p.x, this.L.groundHeight(p.x, p.z), p.z); ch.root.position.copy(ch.position);
    ch.heading = Math.atan2(this.gx - p.x, this.gz - p.z); ch.root.rotation.y = ch.heading; ch.velocity?.set(0, 0, 0);
    this.begin(); this.syncObstacle(); return true;
  }
  // R63.1 boss camera: the free camera's yaw glides to 'behind you, facing the Giant' (swipe still looks
  // around), then applyCamera() places it low and looks up between your head and the Giant's chest.
  setZoom(on) {
    document.body.classList.toggle('boss-active', !!on);   // R69a: the normal top HUD steps aside for the boss bar
    const cam = this.g.followCamera; if (!cam) return;
    cam.lockYaw = on ? () => Math.atan2(this.g.character.position.x - this.gx, this.g.character.position.z - this.gz) : null;
    if (!on && this.camActive) { this.camActive = false; this.g.resize?.(); }
  }
  begin() {
    this.state = 'wake'; this.t = 0; this.arena.play(['GateClose'], () => this.arena.loop('Idle'));
    this.ui.classList.add('show'); this.renderUi(); this.setZoom(true);
    // R72: it stands up from its sleeping pose (WakeUp ends exactly in the Idle pose), leaves fall, then the fight starts.
    this.giant.visible = true; this.giant.position.y = 0;
    this.wakeLen = this.clips.WakeUp ? this.once('WakeUp') : 1.6; if (this.clips.WakeUp_FX) this.fx('WakeUp_FX'); else this.loop('Idle', 1.4);
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
    if (this.marker) { const on = this.state === 'sleep' && dC < 60; on ? this.marker.holo.show() : this.marker.holo.hide(); this.marker.holo.update(this.c.time, dt); this.marker.label.visible = on; }
    if (dC > 70 && (this.state === 'sleep' || this.state === 'resting')) return;
    this.mixer.update(dt); this.fxMixer.update(dt); this.arena.update(dt); this.t += dt;
    this.weak = Math.max(0, this.weak - dt); this.shake = Math.max(0, this.shake - dt);
    if (this.state === 'resting') { if (this.available()) this.reset(); return; }
    if (this.state === 'sleep') { this.syncObstacle(); return; }   // R65.1: woken only from the FIGHT marker (startFight)
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
      case 'wake': { const k = Math.min(1, Math.max(0, (this.t / this.wakeLen - .35) / .4)); this.setEyes(k); if (this.t >= this.wakeLen) { this.setEyes(1); this.state = 'walk'; this.t = 0; } } break;
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
          if (Math.hypot(px - P.x, pz - P.z) < A.radius) this.c.hurt(A.damage, P.x, P.z, A.push);   // R65.3 thrown back
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
    this.giant.position.set(this.gx - this.site.x, this.giant.position.y, this.gz - this.site.z); this.syncObstacle();
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
      if (!wv.hit && Math.abs(d - wv.r) < W.width && !airborne) { wv.hit = true; this.c.hurt(W.damage, wv.x, wv.z, W.push); }
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
        if (Math.hypot(px - r.x, pz - r.z) < GIANT.root.radius) this.c.hurt(GIANT.root.damage, r.x, r.z, GIANT.root.push);
      }
    }
    for (const r of this.roots) if (r.done) this.c.root.remove(r.model.root);
    this.roots = this.roots.filter(r => !r.done);
  }
}
