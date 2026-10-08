// @ts-nocheck
// R129 (GO 08/10, Jannik's FX catalogue, effects 01/03/06/10): a visual-only feedback layer for every character.
//  01 hit-stop: a landed strike freezes the world ~110 ms, the enemy flashes white, sparks burst, the camera shakes.
//  03 telegraph: the bosses' existing ground mark gets a full-size base and a ring that blinks faster as the fill grows.
//  06 loot magnet: picked-up combat loot flies in an arc to its counter in the HUD, which pops when it lands.
//  10 resource feedback: wood splinters, stone chips + dust, clay clods, fiber leaves, and a floating +N.
// Combat, boss and gathering logic stay untouched (damage, timings, AI, rewards): they only call in here, and the
// camera keeps its own logic (the shake is the same per-frame offset the bosses already use). Fails soft.
import * as THREE from 'three';

const HIT_STOP = .11, STOP_SCALE = .04, SHAKE = .3, FLASH = .16, MAX_PARTS = 140;
const GOLD = 0xffe6a0, WHITE = new THREE.Color(1, 1, 1);
const KIND = {
  wood: { col: 0xd9b483, debris: 'splinter' }, stone: { col: 0x8e8a7e, debris: 'chip', dust: 0xbdb5a5 },
  clay: { col: 0xb9764a, debris: 'chip', dust: 0xc9a07a }, fiber: { col: 0x8fbf5a, debris: 'leaf' }
};
const rnd = (a, b) => a + Math.random() * (b - a), ease = k => 1 - (1 - k) * (1 - k), easeIn = k => k * k;
const NO_FLASH = /Ring|Bit|Spark|Light|Glow|Ghost|Aura|FX|Bar|Eye|Mound|Hole|Clod|Dirt|Ground|Shadow/i;   // only the creature flashes, not its mound

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function textTexture(txt) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.font = '800 84px Manrope, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = 14; x.strokeStyle = 'rgba(38,48,31,.85)'; x.strokeText(txt, 128, 66); x.fillStyle = '#fffdf0'; x.fillText(txt, 128, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const LEAF = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(.5, .45, 0, 1); s.quadraticCurveTo(-.5, .45, 0, 0); const g = new THREE.ShapeGeometry(s, 4); g.translate(0, -.5, 0); g.scale(.12, .17, .12); return g; })();   // sized for the game camera (farther than the catalogue's close-ups)
const SPLINTER = new THREE.BoxGeometry(.03, .03, .17), CHIP = new THREE.IcosahedronGeometry(1, 0), PUFF = new THREE.SphereGeometry(1, 10, 8), GEM = new THREE.IcosahedronGeometry(.12, 0);

export class ImpactFx {
  constructor(game) {
    this.g = game; this.parts = []; this.freeze = 0; this.shake = 0; this.flashes = []; this.flies = []; this.teleT = 0;
    this.root = new THREE.Group(); this.root.name = 'R129_IMPACT_FX'; game.scene.add(this.root);
    this.glow = glowTexture(); this.text = new Map();
    game.state?.events?.on?.('fx:gather', e => { try { this.gather(e.kind, e.x, e.y, e.z, e.n); } catch {} });
  }
  // ---- 01 hit-stop: the world runs at 4 % for ~110 ms of real time ----
  timeScale(rawDt) { if (this.freeze <= 0) return 1; this.freeze -= rawDt; return STOP_SCALE; }
  get shakeNow() { return this.freeze > 0 ? 0 : this.shake; }   // the shake starts when the freeze ends
  hit(t) {
    if (!t) return;
    const obj = this.objFor(t), p = new THREE.Vector3(t.x, 0, t.z);
    if (obj) { const b = new THREE.Box3().setFromObject(obj); if (!b.isEmpty()) { b.getCenter(p); p.y = b.min.y + (b.max.y - b.min.y) * .55; } }
    else p.y = this.ground(t.x, t.z) + .45;
    this.freeze = HIT_STOP; this.shake = SHAKE; if (obj) this.flash(obj);
    this.burst(p, GOLD, 16, 1);
  }
  objFor(t) {
    const m = t.m; if (!m) return null;
    if (t.kind === 'giant' || t.kind === 'bear') return m.root || null;
    return m.model?.root || m.root || null;
  }
  flash(obj) {
    let mats = obj.userData.r129Mats;
    if (!mats) {
      mats = []; obj.traverse(o => {
        if (!o.isMesh || NO_FLASH.test(o.name)) return;
        const own = (Array.isArray(o.material) ? o.material : [o.material]).map(m => {
          if (!m?.emissive || m.transparent) return m;
          if (m.emissive.getHex() !== 0 || (m.emissiveIntensity ?? 1) > 1) return m;   // glowing parts (eyes) keep their own light
          const c = m.clone(); mats.push({ m: c, base: c.emissive.clone(), bi: c.emissiveIntensity ?? 1 }); return c;
        });
        o.material = Array.isArray(o.material) ? own : own[0];   // own copy: enemies that share a material do not flash together
      });
      obj.userData.r129Mats = mats;
    }
    const f = this.flashes.find(e => e.obj === obj); if (f) f.t = FLASH; else this.flashes.push({ obj, mats, t: FLASH });
  }
  // ---- 03 telegraph: base disc + a ring that blinks faster as the attack nears ----
  telegraph(b, dt) {
    if (!b?.tele?.visible || !b.teleRing || !b.teleFill) { if (b?.r129Base) b.r129Base.visible = false; return; }
    if (!b.r129Base) {
      b.r129Base = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: 0, depthWrite: false }));
      b.r129Base.position.y = -.002; b.tele.add(b.r129Base); b.r129Ph = 0;
    }
    const k = Math.min(1, Math.max(0, b.teleFill.scale.x)); b.r129Ph += dt * (8 + 34 * k); const blink = .5 + .5 * Math.sin(b.r129Ph);
    b.r129Base.visible = true; b.r129Base.material.opacity = .08 + .12 * blink;
    b.teleRing.material.opacity = .45 + .55 * blink;
  }
  // ---- 06 loot magnet: small gems arc up to the HUD counter ----
  lootFly(kind, pos, amount = 1) {
    const n = Math.max(1, Math.min(4, amount | 0)), col = KIND[kind]?.col ?? 0xf0c463;
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(GEM, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: .35, roughness: .35 }));
      const halo = this.sprite(col); halo.scale.setScalar(.45); mesh.add(halo);   // glow so the eye can follow it
      mesh.position.copy(pos); mesh.position.y += .35; this.root.add(mesh);
      this.flies.push({ mesh, kind, from: mesh.position.clone(), t: -i * .07, dur: .6 });
    }
  }
  chip(kind) {
    const el = kind === 'golden_seed' || kind === 'rare_seed' ? document.querySelector('.seed-card') : document.querySelector(`.material-chip.${kind}`);
    const r = el?.getBoundingClientRect(); return r && r.width > 0 && getComputedStyle(el).visibility !== 'hidden' ? { el, x: r.left + Math.min(r.width / 2, 18), y: r.top + r.height / 2 } : { el: null, x: innerWidth / 2, y: 30 };
  }
  // ---- 10 resource feedback ----
  gather(kind, x, y, z, n = 1) {
    const def = KIND[kind] || { col: 0x9fb87a }, p = new THREE.Vector3(x, y, z), floor = y + .01;
    this.burst(new THREE.Vector3(x, y + .35, z), GOLD, 10, .75);
    if (def.debris === 'splinter') for (let i = 0; i < 10; i++) this.part(new THREE.Mesh(SPLINTER, this.mat(def.col)), p.clone().add(new THREE.Vector3(0, .12, 0)), { v: new THREE.Vector3(rnd(-1.2, 1.2), rnd(.8, 2), rnd(-1.2, 1.2)), g: 6, spin: 12, life: .9, floor });
    if (def.debris === 'chip') { for (let i = 0; i < 9; i++) this.part(new THREE.Mesh(CHIP, this.mat(def.col, true)), p.clone().add(new THREE.Vector3(rnd(-.08, .08), .15, rnd(-.08, .08))), { v: new THREE.Vector3(rnd(-1.3, 1.3), rnd(.6, 1.8), rnd(-1.3, 1.3)), g: 7, spin: 8, life: 1.2, floor: floor + .03, s: rnd(.065, .11) }); this.puff(p, def.dust, 9); }
    if (def.debris === 'leaf') for (let i = 0; i < 14; i++) this.part(new THREE.Mesh(LEAF, this.mat(i % 2 ? 0x8fbf5a : 0x6f9a4a, false, true)), p.clone().add(new THREE.Vector3(rnd(-.2, .2), .18, rnd(-.2, .2))), { v: new THREE.Vector3(rnd(-.9, .9), rnd(1, 2.2), rnd(-.9, .9)), g: 3.5, drag: 1.4, spin: 7, life: 1.1, floor });
    this.floatText(`+${n}`, new THREE.Vector3(x, y + .75, z));
  }
  // ---- particles ----
  mat(col, flat = false, side = false) { return new THREE.MeshStandardMaterial({ color: col, roughness: .9, flatShading: flat, transparent: true, side: side ? THREE.DoubleSide : THREE.FrontSide }); }
  sprite(col) { return new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); }
  part(obj, p, o = {}) {
    if (this.parts.length >= MAX_PARTS) { const old = this.parts.shift(); this.drop(old); }
    obj.position.copy(p); this.root.add(obj);
    this.parts.push({ obj, v: o.v ? o.v.clone() : new THREE.Vector3(), g: o.g || 0, drag: o.drag || 0, spin: o.spin || 0, life: o.life || .5, age: 0, floor: o.floor, s: o.s ?? 1, grow: o.grow, pop: o.pop, fade: o.fade !== false });
    obj.scale.setScalar(o.s ?? 1);
  }
  burst(p, col, n, size) {
    this.part(this.sprite(col), p, { life: .28, s: size * .4, grow: 2.6 });
    for (let i = 0; i < n; i++) { const d = new THREE.Vector3(rnd(-1, 1), rnd(-.4, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(2.2, 4)); this.part(this.sprite(col), p, { v: d, drag: 5, life: rnd(.28, .45), s: rnd(.1, .18) }); }
  }
  puff(p, col, n) { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(PUFF, new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: .7, roughness: 1 })); this.part(m, p.clone().add(new THREE.Vector3(rnd(-.15, .15), .05, rnd(-.15, .15))), { v: new THREE.Vector3(rnd(-.6, .6), rnd(.2, .7), rnd(-.6, .6)), drag: 3, life: rnd(.5, .8), s: rnd(.08, .13), grow: 2.6 }); } }
  floatText(txt, p) {
    let tex = this.text.get(txt); if (!tex) { tex = textTexture(txt); this.text.set(txt, tex); }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.renderOrder = 6;
    this.part(s, p, { v: new THREE.Vector3(0, .9, 0), drag: 2, life: 1.1, s: .5, pop: true });
    s.userData.ax = 2;   // 2:1 canvas
  }
  drop(p) { this.root.remove(p.obj); p.obj.material?.dispose?.(); }   // shared geometry and textures stay
  ground(x, z) { return this.g.world?.sharedLandscape?.groundHeight?.(x, z) ?? 0; }

  update(dt) {
    const rdt = Math.max(dt, 1 / 240);
    this.shake = Math.max(0, this.shake - (this.freeze > 0 ? 0 : rdt * 1.1));
    // white flash
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]; f.t -= this.freeze > 0 ? 0 : rdt; const k = Math.max(0, f.t / FLASH);
      for (const e of f.mats) { e.m.emissive.copy(e.base).lerp(WHITE, k); e.m.emissiveIntensity = e.bi + (1.4 - e.bi) * k; }
      if (f.t <= 0) this.flashes.splice(i, 1);
    }
    // telegraphs (after the bosses set them this frame)
    this.telegraph(this.g.combat?.boss, rdt); this.telegraph(this.g.combat?.bear, rdt);
    // loot magnet
    const cam = this.g.camera;
    for (let i = this.flies.length - 1; i >= 0; i--) {
      const f = this.flies[i]; f.t += rdt; if (f.t < 0) { f.mesh.visible = false; continue; } f.mesh.visible = true;
      const k = Math.min(1, f.t / f.dur), q = easeIn(k) * .55 + k * .45, c = this.chip(f.kind);
      const tg = new THREE.Vector3((c.x / innerWidth) * 2 - 1, -(c.y / innerHeight) * 2 + 1, .5).unproject(cam).sub(cam.position).normalize().multiplyScalar(1.6).add(cam.position);
      const mid = f.from.clone().lerp(tg, .35); mid.y = Math.max(f.from.y, tg.y) + 1.2;
      f.mesh.position.copy(f.from).multiplyScalar((1 - q) * (1 - q)).addScaledVector(mid, 2 * (1 - q) * q).addScaledVector(tg, q * q);
      f.mesh.scale.setScalar(1 - .55 * q); f.mesh.rotation.y += rdt * 8;
      if (k >= 1) {
        this.root.remove(f.mesh); f.mesh.material.dispose(); f.mesh.children[0]?.material?.dispose?.(); this.flies.splice(i, 1);
        if (c.el) { c.el.classList.remove('fx-arrive'); void c.el.offsetWidth; c.el.classList.add('fx-arrive'); clearTimeout(c.el._r129); c.el._r129 = setTimeout(() => c.el.classList.remove('fx-arrive'), 320); }
      }
    }
    // particles
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.age += rdt; const k = p.age / p.life;
      if (k >= 1) { this.drop(p); this.parts.splice(i, 1); continue; }
      p.v.y -= p.g * rdt; if (p.drag) p.v.multiplyScalar(Math.max(0, 1 - p.drag * rdt)); p.obj.position.addScaledVector(p.v, rdt);
      if (p.floor != null && p.obj.position.y < p.floor) { p.obj.position.y = p.floor; p.v.y *= -.3; p.v.x *= .5; p.v.z *= .5; p.spin *= .5; }
      if (p.spin) { p.obj.rotation.x += p.spin * rdt; p.obj.rotation.z += p.spin * .7 * rdt; }
      let s = p.s * (p.grow ? 1 + (p.grow - 1) * ease(k) : 1); if (p.pop) { const a = Math.min(1, p.age / .16); s *= .4 + .6 * a + .25 * Math.sin(Math.PI * a); }
      p.obj.scale.set(s * (p.obj.userData.ax || 1), s, s);
      if (p.fade && p.obj.material) p.obj.material.opacity = (p.obj.material.userData.o0 ??= p.obj.material.opacity) * (1 - easeIn(k));
    }
  }
}
