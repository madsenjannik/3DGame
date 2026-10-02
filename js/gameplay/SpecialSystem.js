// @ts-nocheck
// R65 character specials. A meter (Sap, Gel, Thorn …) fills from melee hits that land; when it is full,
// F / the special button throws the active character's own special. One generic projectile engine with
// seven kinds (line, fan, boomerang, chain, lob, pearl, roll); all numbers live in SPECIAL (combatCatalog).
// Targets are the same as Strike: Moles in the wilds, snails in the garden, the Wood Giant (weak window only)
// and its risen roots. Owned by CombatSystem; fails soft (no projectile GLB → simple sphere).
import * as THREE from 'three';
import { SPECIAL, GIANT } from '../data/combatCatalog.js';
import { loadGLTF } from '../core/AssetManager.js';
import { WildsModel } from './WildsModels.js';

const VULNERABLE = new Set(['emerge', 'up', 'attack', 'hit']);
const V = new THREE.Vector3();

export class SpecialSystem {
  constructor(combat) {
    this.c = combat; this.g = combat.g; this.L = combat.L;
    const id = this.g.character?.instance?.definition?.id;
    this.def = SPECIAL.chars[id] || null; this.id = id;
    this.charge = 0; this.busy = 0; this.release = null; this.shots = []; this.zones = [];
    this.root = new THREE.Group(); this.root.name = 'WILDS_SPECIALS'; this.g.scene.add(this.root);
    if (!this.def) return;
    this.buildUi();
    loadGLTF(`./assets/combat/specials/proj_${this.def.file}.glb`).then(g => { this.gltf = g; }, e => console.warn('[TGW] special projectile missing; using a sphere', e));
  }

  // ---------- UI ----------
  buildUi() {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'special-btn';
    b.innerHTML = `<i style="background-image:url(./assets/combat/specials/icon_${this.def.file}.png)"></i><span class="key">F</span><b>${this.def.meter}</b>`;
    b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); this.use(); });
    document.body.appendChild(b); this.btn = b;
    addEventListener('keydown', e => { if (e.code === 'KeyF' && !e.repeat && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) this.use(); });
    this.render();
  }
  render() {
    if (!this.btn) return;
    const k = Math.min(1, this.charge / SPECIAL.chargeHits);
    this.btn.style.setProperty('--k', `${k * 360}deg`); this.btn.classList.toggle('full', k >= 1);
    this.btn.title = `${this.def.name} (${this.def.meter} ${Math.round(k * 100)}%)`;
  }
  // Called by CombatSystem when a melee strike lands.
  gain(n = 1) { if (!this.def) return; this.charge = Math.min(SPECIAL.chargeHits, this.charge + n); this.render(); }
  ready() { return !!this.def && this.charge >= SPECIAL.chargeHits && !this.busy && !this.c.wilting && ['world', 'garden'].includes(this.g.world.space); }

  // ---------- throw ----------
  use() {
    if (!this.def) return false;
    if (this.charge < SPECIAL.chargeHits) { this.g.hud?.showToast(`${this.def.meter} is not full yet: land ${SPECIAL.chargeHits - this.charge} more hits`); return false; }
    if (!this.ready() || this.g.homePortal?.busy || this.g.fishing?.mode === 'boat') return false;
    const ch = this.g.character, t = this.aim();
    if (t) { ch.heading = Math.atan2(t.x - ch.position.x, t.z - ch.position.z); ch.root.rotation.y = ch.heading; }
    this.charge = 0; this.render();
    const len = ch.instance?.playOverlay?.('Throw') || .6;
    this.busy = len; this.release = { t: SPECIAL.releaseAt, target: t };
    this.c.lastCombat = this.c.time;
    return true;
  }
  // Nearest valid target within autoAim (soft lock like Strike).
  aim() {
    const ch = this.g.character; let best = null;
    for (const e of this.targets()) { const d = Math.hypot(e.x - ch.position.x, e.z - ch.position.z); if (d < SPECIAL.autoAim && (!best || d < best.d)) best = { ...e, d }; }
    return best;
  }
  targets() {
    const out = [], garden = this.g.world.space === 'garden';
    if (garden) { for (const s of this.c.w.threat?.snails || []) if (s.state !== 'dying' && s.state !== 'gone') out.push({ kind: 'snail', m: s, x: s.x, z: s.z, r: .6 }); return out; }
    for (const m of this.c.moles) if (VULNERABLE.has(m.state)) out.push({ kind: 'mole', m, x: m.x, z: m.z, r: .7 });
    const B = this.c.boss;
    if (B?.fighting()) {
      for (const r of B.roots) if (r.state === 'up') out.push({ kind: 'root', m: r, x: r.x, z: r.z, r: .9 });
      out.push({ kind: 'giant', m: B, x: B.gx, z: B.gz, r: GIANT.bodyRadius });
    }
    return out;
  }
  // Apply damage (+ status) to one target. Returns true when something took damage.
  damage(e, dmg, from) {
    const d = this.def, now = Date.now(), ch = this.g.character;
    if (e.kind === 'mole') { if (d.stun) e.m.stunUntil = now + d.stun * 1000; return this.c.hitMole(e.m, dmg); }
    if (e.kind === 'snail') {
      if (d.stun) e.m.stunUntil = now + d.stun * 1000; if (d.slow) e.m.slowUntil = now + (d.pool || 3) * 1000;
      this.c.lastCombat = this.c.time; return this.c.w.threat.swat(e.m, ch, dmg);
    }
    const B = this.c.boss;
    if (e.kind === 'root') { if (e.m.state !== 'up') return false; B.hit({ kind: 'root', m: e.m }, dmg); return true; }
    if (e.kind === 'giant') {
      if (B.weak > 0) { B.damage(dmg * GIANT.weakMultiplier, from.x, from.z, true); return true; }
      this.c.spawnFx('Hit_Dust', from.x, from.z); return false;   // bark: specials do nothing outside the weak window
    }
    return false;
  }
  near(x, z, r) { return this.targets().filter(e => Math.hypot(e.x - x, e.z - z) < r + e.r); }

  spawnModel() {
    let o;
    if (this.gltf) { const m = new WildsModel(this.gltf, 'proj', { scale: SPECIAL.scale }); m.loop('Fly'); o = { model: m, obj: m.root }; }
    else { const s = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), new THREE.MeshStandardMaterial({ color: 0x9bd36a, emissive: 0x2d5a14 })); o = { model: null, obj: s }; }
    this.root.add(o.obj); return o;
  }
  burst(s) {
    if (s.model?.has('Hit')) { const m = s.model; m.play(['Hit'], () => this.root.remove(s.obj)); s.dying = .35; }
    else { this.root.remove(s.obj); s.dead = true; }
  }

  fire(target) {
    const d = this.def, ch = this.g.character, hand = ch.instance?.socket?.('Hand_Socket_R');
    ch.root.position.copy(ch.position); ch.root.updateMatrixWorld(true);   // the hand must match the character's current position
    const from = hand ? hand.getWorldPosition(new THREE.Vector3()) : ch.position.clone().add(new THREE.Vector3(0, 1, 0));
    const dir = new THREE.Vector3(Math.sin(ch.heading), 0, Math.cos(ch.heading));
    const mk = (yawOff = 0, extra = {}) => {
      const v = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yawOff), o = this.spawnModel();
      o.obj.position.copy(from); const s = { ...o, kind: d.kind, pos: from.clone(), dir: v, dist: 0, hit: new Set(), t: 0, ...extra };
      this.shots.push(s); return s;
    };
    if (d.kind === 'fan') { const n = d.count; for (let i = 0; i < n; i++) mk((i - (n - 1) / 2) * d.spread); return; }
    if (d.kind === 'lob') {
      // Land on the target's current spot (within range), else straight ahead.
      const tx = target ? (target.kind === 'giant' ? target.m.gx : target.m.x) : 0, tz = target ? (target.kind === 'giant' ? target.m.gz : target.m.z) : 0;
      const td = target ? Math.hypot(tx - from.x, tz - from.z) : 0, dist = target ? Math.min(d.range, td) : d.range * .7;
      const land = target && td <= d.range ? new THREE.Vector3(tx, 0, tz) : new THREE.Vector3(from.x + dir.x * dist, 0, from.z + dir.z * dist);
      land.y = this.L.groundHeight(land.x, land.z); mk(0, { start: from.clone(), land, dur: .45 + dist * .06 }); return;
    }
    if (d.kind === 'chain') { mk(0, { target, jumps: d.jumps }); return; }
    if (d.kind === 'boomerang') { mk(0, { out: true }); return; }
    mk();
  }

  update(dt) {
    if (!this.def) return;
    if (this.busy > 0) this.busy = Math.max(0, this.busy - dt);
    if (this.release) { this.release.t -= dt; if (this.release.t <= 0) { const t = this.release.target; this.release = null; if (!this.c.wilting) this.fire(t); } }
    const d = this.def, ch = this.g.character;
    for (const s of this.shots) {
      s.model?.update(dt);
      if (s.dying !== undefined) { s.dying -= dt; if (s.dying <= 0) s.dead = true; continue; }
      s.t += dt;
      if (s.kind === 'lob') {
        const k = Math.min(1, s.t / s.dur); s.pos.lerpVectors(s.start, s.land, k); s.pos.y += Math.sin(k * Math.PI) * (1.2 + s.start.distanceTo(s.land) * .25);
        s.obj.position.copy(s.pos); s.obj.rotation.x += dt * 8;
        if (k >= 1) { this.land(s); this.burst(s); }
        continue;
      }
      let speed = d.speed;
      if (s.kind === 'chain' && s.target) { const tx = s.target.kind === 'giant' ? s.target.m.gx : s.target.m.x, tz = s.target.kind === 'giant' ? s.target.m.gz : s.target.m.z; s.dir.set(tx - s.pos.x, 0, tz - s.pos.z).normalize(); }
      if (s.kind === 'boomerang' && !s.out) s.dir.set(ch.position.x - s.pos.x, 0, ch.position.z - s.pos.z).normalize();
      const step = speed * dt; s.pos.addScaledVector(s.dir, step); s.dist += step;
      if (s.kind === 'roll') s.pos.y = this.L.groundHeight(s.pos.x, s.pos.z) + .2;
      else if (s.kind !== 'chain') s.pos.y += (this.L.groundHeight(s.pos.x, s.pos.z) + .8 - s.pos.y) * Math.min(1, dt * 3);
      s.obj.position.copy(s.pos); s.obj.lookAt(V.copy(s.pos).add(s.dir));
      // hits
      const hits = this.near(s.pos.x, s.pos.z, .35).filter(e => !s.hit.has(e.m));
      if (hits.length) {
        const e = hits[0];
        if (s.kind === 'pearl' || s.kind === 'roll') { this.explode(s.pos, d.r, d.dmg, s.kind === 'pearl' ? d.push : 0); this.burst(s); continue; }
        s.hit.add(e.m); this.damage(e, d.dmg, s.pos);
        if (s.kind === 'line' || s.kind === 'boomerang') { /* pierce: keep flying */ }
        else if (s.kind === 'chain' && s.jumps > 0) {
          const next = this.targets().filter(x => !s.hit.has(x.m) && Math.hypot(x.x - s.pos.x, x.z - s.pos.z) < d.jumpRange).sort((a, b) => Math.hypot(a.x - s.pos.x, a.z - s.pos.z) - Math.hypot(b.x - s.pos.x, b.z - s.pos.z))[0];
          if (next) { s.target = next; s.jumps--; continue; }
          this.burst(s); continue;
        } else { this.burst(s); continue; }
      }
      if (s.kind === 'boomerang') {
        if (s.out && s.dist >= d.range) { s.out = false; s.hit.clear(); }
        if (!s.out && Math.hypot(ch.position.x - s.pos.x, ch.position.z - s.pos.z) < .7) { this.root.remove(s.obj); s.dead = true; }
        if (s.dist > d.range * 3) { this.burst(s); }
        continue;
      }
      if (s.kind === 'chain' && s.target && !this.targets().some(x => x.m === s.target.m)) s.target = null;
      if (s.dist >= d.range) { if (s.kind === 'pearl' || s.kind === 'roll') this.explode(s.pos, d.r, d.dmg, s.kind === 'pearl' ? d.push : 0); this.burst(s); }
    }
    this.shots = this.shots.filter(s => !s.dead);
    // lingering zones (gel pool, scent cloud)
    for (const z of this.zones) {
      z.t += dt; z.mesh.material.opacity = .45 * Math.max(0, 1 - z.t / z.life) + .05;
      if (z.tick) { z.acc += dt; if (z.acc >= z.tick) { z.acc = 0; for (const e of this.near(z.x, z.z, z.r)) this.damage(e, z.dmg, z); } }
      if (z.slow) for (const e of this.near(z.x, z.z, z.r)) if (e.kind === 'snail') e.m.slowUntil = Date.now() + 400;
      if (z.t >= z.life) { this.root.remove(z.mesh); z.dead = true; }
    }
    this.zones = this.zones.filter(z => !z.dead);
  }

  // lob landing: area damage + optional pool / cloud / stun
  land(s) {
    const d = this.def, p = s.land;
    for (const e of this.near(p.x, p.z, d.r)) this.damage(e, d.dmg, p);
    if (d.pool || d.cloud) {
      const col = d.cloud ? 0xb79be8 : 0x9fd36a, mesh = new THREE.Mesh(new THREE.CircleGeometry(d.r, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .45, depthWrite: false }));
      mesh.position.set(p.x, this.L.groundHeight(p.x, p.z) + .06, p.z); mesh.renderOrder = 3; this.root.add(mesh);
      this.zones.push({ mesh, x: p.x, z: p.z, r: d.r, t: 0, life: d.pool || d.cloud, tick: d.cloud ? d.tick : 0, acc: 0, dmg: d.dmg, slow: !!d.slow });
    }
    this.c.spawnFx('Hit_Dust', p.x, p.z);
  }
  explode(p, r, dmg, push) {
    const ch = this.g.character;
    for (const e of this.near(p.x, p.z, r)) {
      this.damage(e, dmg, p);
      if (push && e.kind === 'snail') { const dx = e.m.x - ch.position.x, dz = e.m.z - ch.position.z, l = Math.hypot(dx, dz) || 1; e.m.x += dx / l * push; e.m.z += dz / l * push; }
    }
    this.c.spawnFx('Hit_Big', p.x, p.z);
  }
}
