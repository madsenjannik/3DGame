// @ts-nocheck
// R211 (Jannik GO 21/10, aim step 1): while the mouse steers (pointer lock, R210) a small golden sprout floats over exactly what the
// next left click hits: the tool job the InteractionResolver chose (node, thornbrush, weed, snail), else the combat target
// (mole, snail, Wood Giant root/body, Root Bear). It reads the same choice the click uses and never picks its own, so it cannot lie.
// The click turns the character toward the marked target when it is inside a cone in front of the view (ControlProfiles asks
// aimHeading()). Hidden in menus, special cameras and without pointer lock. No camera change. Visual only, fails soft.
// R212 (GO 21/10): a quiet focus dot while the mouse steers. The camera looks at the character's head, so a dot in the exact
// screen centre would sit on the head: it marks the point 4.5 m ahead in the view direction instead (where a click strikes when
// nothing is marked). Faint at rest, clearer while the mouse turns, gone while the sprout shows a target.
import * as THREE from 'three';

const KIND_H = { giant: 6.4, bear: 4.4, root: 1.7, mole: .9, snail: .75 };   // creatures move and animate: a fixed head height
const CONE = 1.2;   // rad either side of the view a click may turn toward the target

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
    this.dotA = 0; this.v = new THREE.Vector3();
  }
  focusDot(dt, active) {
    const g = this.g, cam = g.followCamera, ch = g.character; let want = 0;
    if (active && cam && ch) {
      const h = cam.yaw + Math.PI, p = this.v.set(ch.position.x + Math.sin(h) * 4.5, ch.position.y + .7, ch.position.z + Math.cos(h) * 4.5).project(g.camera);
      if (p.z > -1 && p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1) {
        want = ((cam.idleLook ?? 9) < .6 ? .75 : .38) * (1 - Math.min(1, this.a * 1.6));
        this.dot.style.transform = `translate(${((p.x + 1) / 2 * innerWidth).toFixed(1)}px, ${((1 - p.y) / 2 * innerHeight).toFixed(1)}px) translate(-50%, -50%)`;
      }
    }
    this.dotA += (want - this.dotA) * (1 - Math.exp(-dt * 10));
    const o = this.dotA < .01 ? '0' : this.dotA.toFixed(2); if (this.dot.style.opacity !== o) this.dot.style.opacity = o;
  }
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
    this.focusDot(dt, active);
    const vis = this.a > .02; this.sprite.visible = vis; if (!vis) { this.has = false; return; }
    const bob = this.g.reduceMotion ? 0 : Math.sin(this.t * 2.6) * .08, pulse = this.g.reduceMotion ? 1 : 1 + Math.sin(this.t * 3.4) * .05;
    this.sprite.position.set(this.base.x, this.base.y + bob, this.base.z);
    this.sprite.material.opacity = this.a * .95; this.sprite.scale.setScalar(.62 * pulse * (.7 + .3 * this.a));
  }
  // heading toward the marked target for a click, when it lies inside the cone in front of the view (else null)
  aimHeading(viewHeading) {
    const t = this.target, ch = this.g.character; if (!t || !ch) return null;
    const h = Math.atan2(t.x - ch.position.x, t.z - ch.position.z), d = Math.atan2(Math.sin(h - viewHeading), Math.cos(h - viewHeading));
    return Math.abs(d) <= CONE ? h : null;
  }
}
