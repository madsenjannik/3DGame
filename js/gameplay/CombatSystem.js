// @ts-nocheck
// R61 combat foundation + first enemy (Mole). Kept TGW-sized: hearts, a strike with your best tool,
// a short invulnerability window, knockback, and one enemy contract
// (dormant → warning → emerge → up/attack → burrow → hidden → … → defeated → drop).
// Enemies only ask the player for position and deal damage through hurt(); they never touch the
// character controller. Wilting (0 hearts) drops half of your common materials in a pouch where
// you fell (20 min to fetch it), then your roots pull you home. Tunables: js/data/combatCatalog.js.
import * as THREE from 'three';
import { loadGLTF } from '../core/AssetManager.js';
import { WildsModel } from './WildsModels.js';
import { WoodGiantBoss } from './WoodGiantBoss.js';
import { SpecialSystem } from './SpecialSystem.js';
import { MATERIALS } from '../data/wildsCatalog.js';
import { PLAYER, WEAPONS, WEAPON_ORDER, ATTACK_COOLDOWN, MOLE, WILT, LOOT_FILES } from '../data/combatCatalog.js';

const DIR = './assets/combat/';
const MAX_HP = PLAYER.hearts * 2;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const VULNERABLE = new Set(['emerge', 'up', 'attack', 'hit']);

export class CombatSystem {
  constructor(game) {
    this.g = game; this.w = game.wilds; this.L = game.world.sharedLandscape;
    const pr = game.save.profile;
    this.p = pr.combat ||= { moles: {}, firstMole: false, pouches: [], mercyUntil: 0 };
    this.hp = MAX_HP; this.invuln = 0; this.cd = 0; this.lastHit = -99; this.lastCombat = -99; this.time = 0; this.wilting = false;
    this.root = new THREE.Group(); this.root.name = 'WILDS_COMBAT'; this.L.root.add(this.root);
    this.moles = []; this.loot = []; this.fx = []; this.pouchViews = new Map(); this.models = {};
    this.buildHud(); this.placeMoles(); this.syncPouches();
    try { this.boss = new WoodGiantBoss(this); } catch (e) { console.warn('[TGW] Wood Giant disabled', e); }  // R63
    try { this.special = new SpecialSystem(this); } catch (e) { console.warn('[TGW] specials disabled', e); }  // R65
    this.ready = this.loadModels();
  }

  // ---------- assets (optional: no GLB → no Moles, nothing else breaks) ----------
  async loadModels() {
    const load = async (k, f) => { try { this.models[k] = await loadGLTF(`${DIR}${f}.glb`); } catch (e) { console.warn(`[TGW] combat model ${f} failed`, e); } };
    await Promise.all([load('mole', 'enemy_mole'), load('fx', 'fx_hit'), ...Object.entries(LOOT_FILES).map(([k, f]) => load(`loot_${k}`, f))]);
    for (const m of this.moles) this.attachMoleModel(m);
    return this;
  }

  // ---------- Moles ----------
  placeMoles() {
    const w = this.w, rand = rng(9001), placed = w.placed || [], HOME = { x: 0, z: 22 };
    const near = () => { const a = rand() * 6.283, r = 14 + rand() * 10; return { x: HOME.x + Math.cos(a) * r, z: HOME.z + Math.sin(a) * r * .8 }; };
    const far = () => { const a = rand() * 6.283, r = 30 + rand() * 60; return { x: Math.cos(a) * r, z: 10 + Math.sin(a) * r }; };
    for (let i = 0; i < MOLE.count; i++) {
      const p = w.find(i === 0 ? near : far, 2.2, placed, 600); if (!p) continue;
      placed.push({ x: p.x, z: p.z, clear: 2.2 });
      const id = `mole-${i + 1}`, m = { id, home: { x: p.x, z: p.z }, x: p.x, z: p.z, hp: MOLE.hp, state: 'dormant', t: 0, attackCd: 0, didHit: false, model: null };
      m.root = new THREE.Group(); m.root.position.set(p.x, this.L.groundHeight(p.x, p.z), p.z); this.root.add(m.root);
      if ((this.p.moles[id] || 0) > Date.now()) { m.state = 'gone'; m.root.visible = false; }
      this.moles.push(m);
    }
  }
  attachMoleModel(m) {
    const g = this.models.mole; if (!g || m.model) return;
    m.model = new WildsModel(g, 'mole', { scale: MOLE.scale }); m.root.add(m.model.root); m.model.hold('Warning');
    const c = document.createElement('canvas'); c.width = 128; c.height = 18; m.barCtx = c.getContext('2d'); m.barTex = new THREE.CanvasTexture(c); m.barTex.colorSpace = THREE.SRGBColorSpace;
    m.bar = new THREE.Sprite(new THREE.SpriteMaterial({ map: m.barTex, transparent: true, depthWrite: false, depthTest: false })); m.bar.scale.set(.9, .13, 1); m.bar.position.y = 1.25; m.bar.renderOrder = 11; m.bar.visible = false; m.root.add(m.bar);
    this.drawBar(m);
  }
  drawBar(m) {
    const x = m.barCtx; if (!x) return; x.clearRect(0, 0, 128, 18);
    x.fillStyle = 'rgba(28,36,24,.85)'; x.beginPath(); x.roundRect(0, 0, 128, 18, 9); x.fill();
    x.fillStyle = '#e8794a'; x.beginPath(); x.roundRect(3, 3, 122 * Math.max(0, m.hp) / MOLE.hp, 12, 6); x.fill(); m.barTex.needsUpdate = true;
  }
  setState(m, s) { m.state = s; m.t = 0; }
  relocate(m, px, pz) {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * 6.283, r = MOLE.relocate[0] + Math.random() * (MOLE.relocate[1] - MOLE.relocate[0]);
      const x = m.x + Math.cos(a) * r, z = m.z + Math.sin(a) * r;
      if (Math.hypot(x - m.home.x, z - m.home.z) > MOLE.leash || Math.hypot(x - px, z - pz) < 1.4) continue;
      if (!this.w.valid(x, z, .8, [])) continue;
      m.x = x; m.z = z; m.root.position.set(x, this.L.groundHeight(x, z), z); return;
    }
  }

  updateMole(m, dt, ch) {
    const md = m.model; if (!md || m.state === 'gone') return;
    const px = ch.position.x, pz = ch.position.z, d = Math.hypot(px - m.x, pz - m.z);
    if (d > 60 && m.state === 'dormant') return;
    md.update(dt); if (m.stunUntil > Date.now()) return;  // R65 special stun: frozen in place (still hittable)
    m.t += dt; m.attackCd = Math.max(0, m.attackCd - dt);
    const face = () => { m.root.rotation.y = Math.atan2(px - m.x, pz - m.z); };
    m.bar.visible = VULNERABLE.has(m.state) && m.hp < MOLE.hp;
    switch (m.state) {
      case 'dormant':
        if (d < MOLE.detect && !this.wilting) { this.setState(m, 'warning'); md.loop('Warning'); this.lastCombat = this.time; }
        break;
      case 'warning':
        if (m.t > MOLE.warnTime) { this.setState(m, 'emerge'); face(); md.play(['Emerge'], () => { if (m.state === 'emerge') { this.setState(m, 'up'); md.loop('Idle'); } }); }
        break;
      case 'up':
        face(); this.lastCombat = this.time;
        if (d < MOLE.attackRange && m.attackCd <= 0 && !this.wilting) { this.setState(m, 'attack'); m.didHit = false; md.play(['Attack'], () => { if (m.state === 'attack') { m.attackCd = MOLE.attackCooldown; this.setState(m, 'up'); md.loop('Idle'); } }); }
        else if (m.t > MOLE.upTime || d > MOLE.detect + 3 || this.wilting) this.burrow(m);
        break;
      case 'attack':
        if (!m.didHit && m.t > MOLE.attackHitAt) { m.didHit = true; if (d < MOLE.attackRange + .4) this.hurt(MOLE.attackDamage, m.x, m.z); }
        break;
      case 'hidden':
        if (m.t > .9) {
          if (d < MOLE.detect + 3 && !this.wilting) { this.setState(m, 'warning'); md.loop('Warning'); }
          else { this.setState(m, 'dormant'); md.hold('Warning'); }
        }
        break;
    }
    // Calm down and heal when the player leaves.
    if ((m.state === 'dormant' || m.state === 'hidden') && d > MOLE.giveUp && m.hp < MOLE.hp) { m.hp = MOLE.hp; this.drawBar(m); }
  }
  burrow(m) {
    this.setState(m, 'burrow');
    m.model.play(['Burrow'], () => { if (m.state !== 'burrow') return; const ch = this.g.character; this.relocate(m, ch.position.x, ch.position.z); this.setState(m, 'hidden'); m.model.hold('Burrow'); });
  }
  hitMole(m, dmg) {
    if (!VULNERABLE.has(m.state)) { this.spawnFx('Hit_Dust', m.x, m.z); return false; }
    m.hp -= dmg; this.drawBar(m); this.spawnFx(m.hp <= 0 ? 'Hit_Big' : 'Hit_Dust', m.x, m.z); this.lastCombat = this.time;
    if (m.hp <= 0) { this.defeat(m); return true; }
    this.setState(m, 'hit'); m.model.play(['Hit'], () => { if (m.state === 'hit') { this.setState(m, 'up'); m.model.loop('Idle'); } });
    return true;
  }
  defeat(m) {
    this.setState(m, 'defeat'); m.bar.visible = false;
    m.model.play(['Defeat'], () => { m.state = 'gone'; m.root.visible = false; });
    this.p.moles[m.id] = Date.now() + MOLE.respawnMin * 60000;
    const n = MOLE.lootCount[0] + Math.floor(Math.random() * (MOLE.lootCount[1] - MOLE.lootCount[0] + 1));
    for (let i = 0; i < n; i++) { const [kind, a, b] = MOLE.loot[Math.floor(Math.random() * MOLE.loot.length)]; this.dropLoot(kind, a + Math.floor(Math.random() * (b - a + 1)), m.x, m.z, i, n); }
    if (!this.p.firstMole) { this.p.firstMole = true; for (const [id, k] of Object.entries(MOLE.firstBonus)) this.w.give(id, k); this.g.hud?.showToast(`First Mole! Amber +${MOLE.firstBonus.amber}`); }
    else this.g.hud?.showToast('Mole defeated');
    this.g.save.persist();
  }
  respawnTick(now) {
    for (const m of this.moles) if (m.state === 'gone' && (this.p.moles[m.id] || 0) <= now && m.model && !m.model.busy()) {
      delete this.p.moles[m.id]; m.hp = MOLE.hp; this.drawBar(m); m.x = m.home.x; m.z = m.home.z;
      m.root.position.set(m.x, this.L.groundHeight(m.x, m.z), m.z); m.root.visible = true; this.setState(m, 'dormant'); m.model.hold('Warning');
    }
  }

  // ---------- loot + FX ----------
  dropLoot(kind, amount, x, z, i, n) {
    const g = this.models[`loot_${kind}`], a = i / n * 6.283 + Math.random() * .5, r = .7 + Math.random() * .4, lx = x + Math.cos(a) * r, lz = z + Math.sin(a) * r;
    const item = { kind, amount, x: lx, z: lz, t: 0, state: 'drop', model: null, root: new THREE.Group() };
    item.root.position.set(lx, this.L.groundHeight(lx, lz), lz); this.root.add(item.root);
    if (g) { item.model = new WildsModel(g, 'loot', { scale: 1.7 }); item.root.add(item.model.root); item.model.play(['Drop'], () => { item.state = 'idle'; item.model.loop('Idle'); }); }
    else { item.state = 'idle'; item.root.add(new THREE.Mesh(new THREE.SphereGeometry(.14, 8, 6), new THREE.MeshStandardMaterial({ color: 0xc8a06e }))); }
    this.loot.push(item);
  }
  updateLoot(dt, ch) {
    for (const it of this.loot) {
      it.t += dt; it.model?.update(dt);
      if (it.state === 'collect' || it.state === 'gone') continue;
      const d = Math.hypot(ch.position.x - it.x, ch.position.z - it.z);
      if (it.state === 'idle' && d < 1.3) {                   // walk over it to pick it up
        it.state = 'collect'; this.w.give(it.kind, it.amount); this.g.hud?.materials?.classList.add('show');
        this.g.hud?.showToast(`${MATERIALS[it.kind]?.name || it.kind} +${it.amount}`);
        const done = () => { it.state = 'gone'; this.root.remove(it.root); };
        if (it.model) it.model.play(['Collect'], done); else done();
      } else if (it.t > 120) { it.state = 'gone'; this.root.remove(it.root); }
    }
    this.loot = this.loot.filter(it => it.state !== 'gone');
  }
  spawnFx(clip, x, z) {
    const g = this.models.fx; if (!g) return;
    let f = this.fx.find(e => !e.busy);
    if (!f) { f = { model: new WildsModel(g, 'fx', { scale: 1.6 }), busy: false }; this.root.add(f.model.root); this.fx.push(f); }
    f.busy = true; f.model.root.visible = true; f.model.root.position.set(x, this.L.groundHeight(x, z) + .45, z);
    f.model.play([clip], () => { f.busy = false; f.model.root.visible = false; });
  }

  // ---------- player ----------
  weapon() { const id = WEAPON_ORDER.find(t => this.w.has(t)); return id ? WEAPONS[id] : WEAPONS.hands; }
  // Nearest hittable enemy: Moles in the wilds, snails in the private garden (R62).
  target(reach) {
    const ch = this.g.character, garden = this.g.world.space === 'garden'; let best = null;
    const consider = (kind, e) => { const d = Math.hypot(ch.position.x - e.x, ch.position.z - e.z); if (d < reach && (!best || d < best.d)) best = { kind, m: e, d, x: e.x, z: e.z }; };
    if (garden) { for (const sn of this.w.threat?.snails || []) if (sn.state !== 'dying' && sn.state !== 'gone') consider('snail', sn); }
    else for (const m of this.moles) if (VULNERABLE.has(m.state)) consider('mole', m);
    if (!garden && this.boss) { const b = this.boss.target(ch.position.x, ch.position.z, reach); if (b && (!best || b.d <= best.d)) best = b; }  // R63
    return best;
  }
  attack() {
    if (this.cd > 0 || this.wilting) return false;
    const wpn = this.weapon(), t = this.target(wpn.reach + .6), ch = this.g.character; this.cd = ATTACK_COOLDOWN;
    if (t) { ch.heading = Math.atan2(t.x - ch.position.x, t.z - ch.position.z); ch.root.rotation.y = ch.heading; }
    // Lunge until pack B brings a real arm swing: a small step toward the target + the character flash.
    const step = t ? Math.max(0, Math.min(.6, t.d - 1.0)) : .2;
    ch.position.x += Math.sin(ch.heading) * step; ch.position.z += Math.cos(ch.heading) * step; this.g.world.resolveCollisions?.(ch.position, .3);
    ch.flash?.(); ch.instance?.playOverlay?.('Swing');   // R65: Jannik's Swing clip (upper body) on top of the lunge
    let landed = false;
    if (t?.kind === 'giant' || t?.kind === 'root') landed = this.boss.hit(t, wpn.dmg);
    else if (t?.kind === 'snail') { this.lastCombat = this.time; landed = this.w.threat.swat(t.m, ch, wpn.dmg); }
    else if (t) landed = this.hitMole(t.m, wpn.dmg);   // same range as the Strike prompt: what you are offered, you hit
    if (landed) this.special?.gain();                  // R65: landed hits fill the character's special meter
    return landed;
  }
  hurt(amount, fx, fz) {
    const space = this.g.world.space;
    if (this.invuln > 0 || this.wilting || (space !== 'world' && space !== 'garden')) return false;
    // The private garden is a safe zone (R62): snails can hurt you there, but never below half a heart.
    this.hp = space === 'garden' ? Math.max(Math.min(this.hp, 1), this.hp - amount) : Math.max(0, this.hp - amount); this.invuln = PLAYER.invuln; this.lastHit = this.time; this.lastCombat = this.time;
    const ch = this.g.character, dx = ch.position.x - fx, dz = ch.position.z - fz, l = Math.hypot(dx, dz) || 1;
    ch.position.x += dx / l * PLAYER.knockback; ch.position.z += dz / l * PLAYER.knockback; this.g.world.resolveCollisions?.(ch.position, .3);
    ch.flash?.(); document.body.classList.remove('hurt-flash'); void document.body.offsetWidth; document.body.classList.add('hurt-flash');
    this.renderHud();
    if (this.hp <= 0) this.wilt();
    return true;
  }
  heal(full) { this.hp = full ? MAX_HP : Math.min(MAX_HP, this.hp + 1); this.renderHud(); }

  // ---------- wilting (death) ----------
  async wilt() {
    if (this.wilting) return; this.wilting = true;
    // R64.1: end a boss fight right here. The portal fade below pauses the combat update, so the boss never saw
    // the wilt and the fight (arena pull-in, camera lock, no regen) resumed on the way back to the world.
    if (this.boss?.fighting()) this.boss.end(false);
    const g = this.g, hp = g.homePortal, ch = g.character, now = Date.now();
    const mercy = now < (this.p.mercyUntil || 0); let dropped = 0; const items = {};
    if (!mercy) {
      for (const id of WILT.materials) { const have = g.state.inventory.get(id) || 0, n = Math.floor(have * WILT.dropShare); if (n > 0) { g.state.removeItem(id, n); items[id] = n; dropped += n; } }
      if (dropped) { this.p.pouches.push({ id: `pouch-${now}`, x: ch.position.x, z: ch.position.z, until: now + WILT.pouchMinutes * 60000, items }); this.p.pouches = this.p.pouches.slice(-WILT.maxPouches); }
      this.p.mercyUntil = now + WILT.mercyMinutes * 60000;
    }
    this.g.save.persist(); this.syncPouches();
    if (hp) hp.busy = true;
    try {
      await hp?.fadeTo?.(1, 'You wilted… your roots pull you home');
      if (g.world.space !== 'garden') { g.world.setSpace('garden'); hp?.onSpaceChanged?.('garden'); }
      const s = hp?.gardenSpawn?.() || { x: 0, z: 9.65, heading: Math.PI };
      if (hp?.teleport) hp.teleport(ch, g.followCamera, s);
      await sleep(250); await hp?.fadeTo?.(0);
    } finally { if (hp) hp.busy = false; }
    this.heal(true); this.wilting = false;
    for (const m of this.moles) if (m.state !== 'gone' && m.model) { m.hp = MOLE.hp; this.drawBar(m); this.setState(m, 'dormant'); m.model.hold('Warning'); }
    g.hud?.showToast(mercy ? 'You wilted again, but your roots held on: nothing was lost' : dropped ? `You dropped ${dropped} materials where you wilted. Fetch them within ${WILT.pouchMinutes} min.` : 'You wilted. Nothing was lost.');
  }
  syncPouches() {
    const now = Date.now(); this.p.pouches = (this.p.pouches || []).filter(p => p.until > now);
    for (const [id, v] of this.pouchViews) if (!this.p.pouches.some(p => p.id === id)) { this.root.remove(v); this.pouchViews.delete(id); }
    for (const p of this.p.pouches) {
      if (this.pouchViews.has(p.id)) continue;
      const g = new THREE.Group(); g.position.set(p.x, this.L.groundHeight(p.x, p.z), p.z);
      const sack = new THREE.MeshStandardMaterial({ color: 0x9a7448, roughness: .9 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(.26, 12, 9), sack); body.scale.set(1, .85, 1); body.position.y = .22; body.castShadow = true; g.add(body);
      const neck = new THREE.Mesh(new THREE.ConeGeometry(.12, .2, 10), sack); neck.position.y = .48; g.add(neck);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 6, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 3; g.add(beam); this.root.add(g); this.pouchViews.set(p.id, g);   // ARK-style beam: findable from afar
    }
  }
  pickUpPouch() {
    const ch = this.g.character, p = this.p.pouches.find(q => Math.hypot(q.x - ch.position.x, q.z - ch.position.z) < 1.4); if (!p) return false;
    let n = 0; for (const [id, k] of Object.entries(p.items)) { this.w.give(id, k); n += k; }
    this.p.pouches = this.p.pouches.filter(q => q !== p); this.syncPouches(); this.g.save.persist();
    this.g.hud?.showToast(`Pouch recovered: ${n} materials`); return true;
  }

  // ---------- HUD ----------
  buildHud() {
    const el = document.createElement('div'); el.className = 'hearts'; el.setAttribute('aria-label', 'Health'); document.body.appendChild(el); this.hudEl = el; this.renderHud();
  }
  renderHud() {
    let h = ''; for (let i = 0; i < PLAYER.hearts; i++) { const v = this.hp - i * 2; h += `<i class="${v >= 2 ? 'full' : v === 1 ? 'half' : 'empty'}"></i>`; }
    this.hudEl.innerHTML = h;
  }

  // ---------- frame ----------
  // Returns { interaction } (strike a nearby Mole / pick up a pouch). `active` = world, not busy.
  update(dt, time, ch, active) {
    this.time = time; this.cd = Math.max(0, this.cd - dt); this.invuln = Math.max(0, this.invuln - dt);
    if (this.special) { this.special.update(dt); this.special.btn?.classList.toggle('show', !!this.special.charge || time - this.lastCombat < 6); }  // R65
    if (!this.wilting && this.hp < MAX_HP && !this.boss?.fighting() && time - this.lastHit > PLAYER.regenDelay && (time - (this.lastRegen || 0)) > PLAYER.regenEvery) { this.lastRegen = time; this.heal(false); }
    this.hudEl.classList.toggle('show', this.hp < MAX_HP || time - this.lastCombat < 4);
    if (this.g.world.space === 'garden') {
      if (!active || this.wilting) return { interaction: null };
      const wpn = this.weapon(), t = this.target(wpn.reach + .6);
      return { interaction: t ? { type: 'combat-strike', label: `Strike · ${wpn.name}`, distance: t.d } : null };
    }
    if (this.g.world.space !== 'world') return { interaction: null };
    const now = Date.now();
    if (!this._tick || time - this._tick > 1) { this._tick = time; this.respawnTick(now); if (this.p.pouches.some(p => p.until <= now)) this.syncPouches(); }
    for (const m of this.moles) this.updateMole(m, dt, ch);
    this.boss?.update(dt, ch);
    for (const f of this.fx) if (f.busy) f.model.update(dt);
    this.updateLoot(dt, ch);
    for (const v of this.pouchViews.values()) v.children[0].position.y = .22 + Math.sin(time * 2) * .02;
    if (!active || this.wilting) return { interaction: null };
    const wpn = this.weapon(), t = this.target(wpn.reach + .6);
    if (t) return { interaction: { type: 'combat-strike', label: `Strike · ${wpn.name}`, distance: t.d } };
    const p = this.p.pouches.find(q => Math.hypot(q.x - ch.position.x, q.z - ch.position.z) < 1.4);
    if (p) return { interaction: { type: 'combat-pouch', label: 'Pick up your pouch', distance: 0 } };
    return { interaction: null };
  }
  interact(type) { if (type === 'combat-strike') return this.attack(); if (type === 'combat-pouch') return this.pickUpPouch(); return false; }
}
