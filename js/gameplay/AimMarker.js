// @ts-nocheck
// R211 (Jannik GO 21/10, aim step 1): a small golden sprout floats over exactly what the next left click hits: the tool job the
// InteractionResolver chose (node, thornbrush, weed, snail), else the combat target (mole, snail, Wood Giant root/body, Root Bear).
// It reads the same choice the click uses and never picks its own, so it cannot lie. Fails soft.
// R215 (Jannik GO A 21/10, 'the ring must follow my mouse like a cursor on a PC, together with the character'): on desktop the
// mouse is a cursor again (R210's pointer-lock mouse-look is gone; the view turns while the right button is held). The R213 ring IS
// the cursor over the game view (the system cursor hides there, shows over the HUD); the aim point is where the cursor meets the
// ground; the character's body turns to face it all the time (only the visible body: the walking direction stays the controller's,
// so CharacterController is untouched) and a click strikes toward it. R214 stays: among tool jobs (and moles/snails) in their normal
// reach, the one nearest the aim point wins; bosses keep their own choice. Hidden in menus, panels, special cameras and on phones.
import * as THREE from 'three';

const KIND_H = { giant: 6.4, bear: 4.4, root: 1.7, mole: .9, snail: .75 };   // creatures move and animate: a fixed head height
const AIM_MAX = 25, TOOL = new Set(['wilds-gather', 'wilds-cut', 'wilds-weed', 'wilds-snail']);

function sproutTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const glow = x.createRadialGradient(64, 70, 0, 64, 70, 60); glow.addColorStop(0, 'rgba(255,226,140,.55)'); glow.addColorStop(1, 'rgba(255,226,140,0)');
  x.fillStyle = glow; x.fillRect(0, 0, 128, 128);
  const gold = x.createLinearGradient(0, 30, 0, 110); gold.addColorStop(0, '#fff3c4'); gold.addColorStop(.55, '#f2c75c'); gold.addColorStop(1, '#c98f2a');
  x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = 'rgba(92,60,18,.55)'; x.lineWidth = 3;
  // stem, then two leaves opening upward: the game's sprout, pointing down at the target
  x.beginPath(); x.moveTo(64, 108); x.quadraticCurveTo(62, 84, 64, 62); x.lineWidth = 7; x.strokeStyle = 'rgba(92,60,18,.45)'; x.stroke();
  x.lineWidth = 4.5; x.strokeStyle = '#e9b84c'; x.stroke();
  const leaf = s => { x.save(); x.translate(64, 66); x.scale(s, 1); x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(8, -28, 34, -38, 46, -34); x.bezierCurveTo(42, -12, 22, 4, 0, 0); x.closePath();
    x.fillStyle = gold; x.fill(); x.lineWidth = 2.5; x.strokeStyle = 'rgba(92,60,18,.5)'; x.stroke();
    x.beginPath(); x.moveTo(3, -3); x.quadraticCurveTo(20, -20, 40, -31); x.lineWidth = 1.6; x.strokeStyle = 'rgba(255,250,225,.85)'; x.stroke(); x.restore(); };
  leaf(-1); leaf(1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class AimMarker {
  constructor(game) {
    this.g = game; this.target = null; this.a = 0; this.t = 0; this.heights = new WeakMap(); this.pos = new THREE.Vector3(); this.base = new THREE.Vector3(); this.has = false;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sproutTexture(), transparent: true, depthTest: false, depthWrite: false, opacity: 0 }));
    this.sprite.name = 'AIM_SPROUT'; this.sprite.renderOrder = 999; this.sprite.visible = false; this.sprite.frustumCulled = false;
    game.scene.add(this.sprite);
    this.dot = document.createElement('div'); this.dot.id = 'aim-dot'; this.dot.setAttribute('aria-hidden', 'true'); document.body.appendChild(this.dot);
    this.dotA = 0; this.v = new THREE.Vector3(); this.point = null; this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2(); this.lock = 0; this.face = null; this.on = false;
  }
  // once per frame before the systems offer, so their choice and the click use this frame's aim: the cursor's ray on the ground
  updatePoint(active) {
    this.point = null; const g = this.g, cam = g.camera, ch = g.character, cur = g.followCamera?.cursor; if (!active || !cam || !ch || !cur) return;
    this.ray.setFromCamera(this.ndc.set(cur.x / innerWidth * 2 - 1, 1 - cur.y / innerHeight * 2), cam); const o = this.ray.ray.origin, d = this.ray.ray.direction, P = ch.position;
    let dx = NaN, dz = NaN; if (d.y < -1e-3) { const t = (P.y - o.y) / d.y; dx = o.x + d.x * t - P.x; dz = o.z + d.z * t - P.z; }
    let L = Math.hypot(dx, dz);
    if (!(L <= AIM_MAX)) { if (!(L > 0)) { dx = d.x; dz = d.z; L = Math.hypot(dx, dz) || 1; } dx *= AIM_MAX / L; dz *= AIM_MAX / L; }   // cursor on the sky: far along its direction
    this.point = { x: P.x + dx, y: P.y, z: P.z + dz };
  }
  aimDist(x, z) { const p = this.point; return p && Number.isFinite(x) && Number.isFinite(z) ? Math.hypot(x - p.x, z - p.z) : null; }
  posOf(it) { const o = it?.node || it?.thorn || it?.weed || it?.snail; return o ? { x: o.x ?? o.root?.position.x, z: o.z ?? o.root?.position.z } : null; }
  // the wilds' own pick (WildsLoopSystem offer): two tool jobs compare by the aim point, anything else by distance as before
  better(c, best) {
    if (this.point && TOOL.has(c.type) && TOOL.has(best.type)) { const a = this.posOf(c), b = this.posOf(best), da = a && this.aimDist(a.x, a.z), db = b && this.aimDist(b.x, b.z); if (da != null && db != null) return da < db; }
    return c.distance < best.distance;
  }
  // the R213 ring is the cursor over the game view; when a target is marked it widens and turns gold (lock-on)
  focusDot(dt, active) {
    const cur = this.g.followCamera?.cursor, on = !!(active && cur);
    if (on !== this.on) { this.on = on; document.body.classList.toggle('tgw-cursor-aim', on); }
    this.lock += ((this.target && on ? 1 : 0) - this.lock) * (1 - Math.exp(-dt * 14));
    if (!on) return;
    this.dot.style.transform = `translate(${cur.x}px, ${cur.y}px) translate(-50%, -50%) scale(${(1 + this.lock * .55).toFixed(3)})`;
    this.dot.classList.toggle('locked', this.lock > .5);
  }
  // the visible body faces the aim point (after the controller ran this frame; it set root.rotation.y = heading)
  faceAim(dt, on) {
    const ch = this.g.character, r = ch?.root; if (!r) return;
    const p = this.point, P = ch.position;
    if (!on || !p || Math.hypot(p.x - P.x, p.z - P.z) < .35) { this.face = on && this.face != null ? this.face : null; if (this.face != null) r.rotation.y = this.face; return; }
    const q = this.target || p, want = Math.atan2(q.x - P.x, q.z - P.z);   // a marked target wins: that is what the click hits if (this.face == null) this.face = r.rotation.y;
    this.face += Math.atan2(Math.sin(want - this.face), Math.cos(want - this.face)) * (1 - Math.exp(-dt * 16)); r.rotation.y = this.face;
  }
  // a click strikes where the body faces (combat still turns to its own target when it has one)
  faceNow() { const ch = this.g.character; if (ch && this.on && this.face != null) ch.heading = Math.atan2(Math.sin(this.face), Math.cos(this.face)); }
  // what the next click hits (same branches as Game's click): a tool job → that interaction, else the combat target
  pick(it, toolJob) {
    if (toolJob && it && it.type !== 'combat-strike') { const o = it.node || it.thorn || it.weed || it.snail; return o ? { o, x: o.x ?? o.root?.position.x, z: o.z ?? o.root?.position.z, kind: it.type } : null; }
    const c = this.g.combat; if (!c || c.wilting) return null;
    const t = c.target?.((c.weapon?.()?.reach ?? 1) + .6); return t ? { o: t.m, x: t.x, z: t.z, kind: t.kind } : null;
  }
  top(p) {
    const fixed = KIND_H[p.kind]; if (fixed) return fixed;
    const root = p.o?.root; if (!root) return 1.2;
    let h = this.heights.get(root);
    if (h == null) { const b = new THREE.Box3().setFromObject(root); h = Number.isFinite(b.max.y) ? Math.min(4, Math.max(.6, b.max.y - root.getWorldPosition(this.pos).y)) : 1.2; this.heights.set(root, h); }
    return h;
  }
  ground(p) {
    const r = p.o?.root; if (r && p.kind !== 'giant' && p.kind !== 'bear' && p.kind !== 'root') return r.getWorldPosition(this.pos).y;
    return this.g.world?.space === 'garden' ? 0 : (this.g.world?.sharedLandscape?.groundHeight?.(p.x, p.z) ?? 0);
  }
  update(dt, it, toolJob, active) {
    this.t += dt;
    const p = active ? this.pick(it, toolJob) : null; this.target = p && Number.isFinite(p.x) && Number.isFinite(p.z) ? p : null;
    if (this.target) {
      const y = this.ground(this.target) + this.top(this.target) + .35;
      const s = this.base;
      const far = Math.hypot(this.target.x - s.x, this.target.z - s.z) > 3;   // a new target far away: appear there, never glide across the view
      if (!this.has || this.a < .05 || far) { s.set(this.target.x, y, this.target.z); if (far && this.has) this.a = .15; } else { const k = 1 - Math.exp(-dt * 14); s.x += (this.target.x - s.x) * k; s.y += (y - s.y) * k; s.z += (this.target.z - s.z) * k; }
      this.has = true;
    }
    this.a += ((this.target ? 1 : 0) - this.a) * (1 - Math.exp(-dt * (this.target ? 12 : 8)));
    this.focusDot(dt, active); this.faceAim(dt, active);
    const vis = this.a > .02; this.sprite.visible = vis; if (!vis) { this.has = false; return; }
    const bob = this.g.reduceMotion ? 0 : Math.sin(this.t * 2.6) * .08, pulse = this.g.reduceMotion ? 1 : 1 + Math.sin(this.t * 3.4) * .05;
    this.sprite.position.set(this.base.x, this.base.y + bob, this.base.z);
    this.sprite.material.opacity = this.a * .95; this.sprite.scale.setScalar(.62 * pulse * (.7 + .3 * this.a));
  }
}
