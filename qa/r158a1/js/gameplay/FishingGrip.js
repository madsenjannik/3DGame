// @ts-nocheck
// R80 fishing grip (Jannik's Cactus_Fiskestang_Test, GO 05/10 incl. the Fishing R33J + character locks): the existing
// bamboo rod sits in the character's right hand instead of floating beside it. Each fishing frame the upper arm is
// aimed so the hand points along a pose direction, the spine leans a little, the rod is laid along its own pose
// direction from the fist, and a small closed clay fist (the character's own hand colour) wraps the grip. Poses
// follow the test (ready hold, wind-up with the cast power, release, wait with nibble dips, bite, reel with the
// left hand cranking, landing). Only while the player is actively fishing; the bones go back when fishing ends.
// Runtime only: no character mesh or clip is changed. Fails soft: missing bones → the old floating rod.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = x => Math.min(1, Math.max(0, x)), ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const P = (arm, rod, spine, bend) => ({ arm: V(...arm), rod: V(...rod), spine, bend });
// Character-local directions (actor faces +Z, right hand on −X), from the test file.
const POSE = {
  ready: P([-0.4, -0.45, 0.8], [-0.42, 0.5, 0.76], 0, .08),
  back: P([-0.25, 0.85, 0.15], [-0.12, 0.78, -0.62], -0.13, .22),
  whip: P([-0.22, 0.05, 1], [-0.1, 0.55, 0.85], 0.12, -0.28),
  follow: P([-0.22, -0.2, 1], [-0.1, 0.3, 1], 0.12, .16),
  fish: P([-0.25, -0.38, 0.9], [-0.12, 0.3, 1], 0.05, .1),
  hook: P([-0.25, 0.25, 0.95], [-0.12, 0.88, 0.5], -0.16, .62),
  reel: P([-0.22, 0.1, 0.95], [-0.1, 0.72, 0.7], -0.1, .5),
  land: P([-0.25, 0.38, 0.9], [-0.12, 0.95, 0.35], -0.08, .12)
};
const CAST = [[0, null], [.11, POSE.whip], [.27, POSE.follow], [.45, POSE.fish]];   // cast timer (s) → pose; null = pose at release
const lerpPose = (a, b, s, out = {}) => { out.arm = (out.arm || V()).copy(a.arm).lerp(b.arm, s); out.rod = (out.rod || V()).copy(a.rod).lerp(b.rod, s); out.spine = a.spine + (b.spine - a.spine) * s; out.bend = a.bend + (b.bend - a.bend) * s; return out; };
const copyPose = (a, out = {}) => lerpPose(a, a, 0, out);

const _pw = new THREE.Quaternion(), _A = V(0, 0, 0), _H = V(0, 0, 0), _D = V(0, 0, 0), _I = new THREE.Quaternion(), _q = new THREE.Quaternion(), _x = new THREE.Quaternion();
// Rotate a bone by a world-space rotation.
function applyW(o, qw) { o.parent.updateWorldMatrix(true, false); o.parent.getWorldQuaternion(_pw); _x.copy(_pw).invert().multiply(qw).multiply(_pw); o.quaternion.premultiply(_x); }
function rodQuat(d, out) { const y = d.clone().normalize(), up = Math.abs(y.y) > .97 ? V(0, 0, 1) : V(0, 1, 0), z = up.sub(y.clone().multiplyScalar(up.dot(y))).normalize(), x = V().crossVectors(y, z); return out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); }

export class FishingGrip {
  constructor(fishing) {
    this.f = fishing; const inst = fishing.character?.instance, bn = n => inst?.socket?.(n);
    this.B = { aR: bn('Arm_R'), hR: bn('Hand_R'), aL: bn('Arm_L'), hL: bn('Hand_L'), sp: bn('Spine') };
    this.ok = !!(this.B.aR && this.B.hR && this.B.sp && fishing._rod);
    if (!this.ok) return;
    this.vis = inst.root.children[0]; this.S = this.vis.scale.x || 1;   // the test was authored on the unscaled GLB
    this.saved = new Map(); this.pose = copyPose(POSE.ready); this.from = copyPose(POSE.ready); this.active = false;
    this.fist = this.buildFist(this.handColour()); this.fist.visible = false; fishing.scene.add(this.fist);
    this.bob = { p: V(), v: V() };
  }
  // The character's own hand colour: average colour of the vertices skinned mostly to Hand_R (material colour × vertex colour).
  handColour() {
    // The rigs are split into one skinned mesh per material; among the meshes bound to Hand_R prefer 'hand', then 'limb',
    // else the one with the most Hand_R vertices.
    const fallback = new THREE.Color(0x356a1c); let best = null;
    try {
      this.vis.traverse(o => {
        if (!o.isSkinnedMesh) return; const g = o.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, col = g.attributes.color, j = o.skeleton.bones.indexOf(this.B.hR), m = Array.isArray(o.material) ? o.material[0] : o.material;
        if (j < 0 || !si || !m?.color || /^fx_/.test(m.name || '')) return;
        const sum = new THREE.Color(0, 0, 0); let n = 0;
        for (let v = 0; v < si.count; v++) {
          let w = 0; for (let q = 0; q < 4; q++) if (si.getComponent(v, q) === j) w += sw.getComponent(v, q);
          if (w < .5) continue; n++; const c = m.color.clone(); if (col && m.vertexColors) c.multiply(new THREE.Color(col.getX(v), col.getY(v), col.getZ(v))); sum.add(c);
        }
        const rank = m.name === 'hand' ? 2 : m.name === 'limb' ? 1 : 0;   // a material named 'hand' (then 'limb') is the hand's skin
        if (n && (!best || rank > best.rank || (rank === best.rank && n > best.n))) best = { n, rank, c: sum.multiplyScalar(1 / n) };
      });
    } catch (e) { /* fails soft: default clay green */ }
    return best ? best.c : fallback;
  }
  buildFist(colour) {
    const g = new THREE.Group(); g.name = 'FISHING_R80_FIST'; const m = new THREE.MeshStandardMaterial({ color: colour, roughness: .8 });
    const roll = new THREE.Mesh(new THREE.TorusGeometry(.058, .04, 10, 18).rotateX(Math.PI / 2), m); roll.scale.set(1.05, 1.15, .95); g.add(roll);
    for (let i = -1; i <= 1; i++) { const k = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), m); k.position.set(-.07, i * .032, .012); g.add(k); }
    const th = new THREE.Mesh(new THREE.SphereGeometry(.034, 10, 8), m); th.scale.set(.9, 1.35, .9); th.position.set(.012, .05, .05); th.rotation.x = .5; g.add(th);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(this.S); this.fistMat = m; return g;
  }
  // Bones the clips do not drive keep our rotation; put them back before posing again (and when fishing ends).
  restore() { for (const [b, s] of this.saved) if (b.quaternion.equals(s.set)) b.quaternion.copy(s.base); }
  remember() { for (const b of [this.B.aR, this.B.aL, this.B.sp]) if (b) { let s = this.saved.get(b); if (!s) { s = { base: new THREE.Quaternion(), set: new THREE.Quaternion() }; this.saved.set(b, s); } s.base.copy(b.quaternion); } }
  mark() { for (const [b, s] of this.saved) s.set.copy(b.quaternion); }
  world(v, out) { const h = this.f.character.heading, c = Math.cos(h), s = Math.sin(h); return out.set(v.x * c + v.z * s, v.y, -v.x * s + v.z * c); }
  aim(a, hnd, dirLocal, w = 1) {
    if (!a || !hnd || w < 1e-4) return; a.updateWorldMatrix(true, true); a.getWorldPosition(_A); hnd.getWorldPosition(_H); _D.subVectors(_H, _A).normalize();
    applyW(a, _I.identity().slerp(_q.setFromUnitVectors(_D, this.world(dirLocal, V()).normalize()), w));
  }
  stop() {
    if (!this.ok || !this.active) return; this.active = false; this.restore(); this.saved.clear(); this.fist.visible = false;
    this.f.character.instance.updateVisual?.({ dt: 0, time: 0, speed: 0, maxSpeed: this.f.character.runSpeed, turnRate: 0, velocity: V(), heading: this.f.character.heading });
  }
  target(dt, t) {
    const f = this.f, ph = f.phase, out = this.want ||= copyPose(POSE.ready);
    if (ph === 'charge') { lerpPose(POSE.ready, POSE.back, ease(f.castPower), out); this.from = copyPose(out, this.from); return { pose: out, snap: false }; }
    if (ph === 'cast') {
      const u = f.timer; let i = 0; while (i < CAST.length - 2 && u > CAST[i + 1][0]) i++;
      const [ta, pa] = CAST[i], [tb, pb] = CAST[i + 1]; lerpPose(pa || this.from, pb, ease((u - ta) / (tb - ta)), out); return { pose: out, snap: true };
    }
    if (ph === 'wait') { copyPose(POSE.fish, out); out.rod.y -= (f._nibblePulse || 0) * .09; out.bend += .02 * Math.sin(t * 2.2); return { pose: out, snap: false }; }
    if (ph === 'bite') { copyPose(POSE.fish, out); out.rod.y -= .12; out.bend = .32 + .1 * Math.sin(t * 24); return { pose: out, snap: false }; }
    if (ph === 'reel') { lerpPose(POSE.hook, POSE.reel, clamp(f.timer / .5), out); out.bend = .25 + .6 * (f.tension || 0) + (f.surge > 0 ? .15 : 0); out.rod.x += Math.sin(t * 5) * .05; out.spine += Math.sin(t * 13) * .025; return { pose: out, snap: false, crank: true }; }
    if (ph === 'land') { copyPose(POSE.land, out); return { pose: out, snap: false }; }
    copyPose(POSE.ready, out); const b = Math.sin(t * 1.9) * .03; out.arm.y += b * .5; out.rod.y += b; return { pose: out, snap: false };   // ready / failed
  }
  update(dt, t) {
    if (!this.ok) return false;
    const f = this.f, ch = f.character, B = this.B, rod = f._rod;
    if (!rod.visible) { this.stop(); return true; }
    if (!this.active) { this.active = true; copyPose(POSE.ready, this.pose); this.bob.p.set(0, -99, 0); }
    // Let Idle breathe while fishing (the controller is paused), then pose on top.
    this.restore();
    ch.instance.updateVisual?.({ dt, time: t, speed: 0, maxSpeed: ch.runSpeed, turnRate: 0, velocity: V(), heading: ch.heading });
    this.remember();
    const T = this.target(dt, t), k = T.snap ? 1 : 1 - Math.exp(-dt * 10); lerpPose(this.pose, T.pose, k, this.pose);
    const pose = this.pose, h = ch.heading;
    if (B.sp && pose.spine) applyW(B.sp, new THREE.Quaternion().setFromAxisAngle(V(Math.cos(h), 0, -Math.sin(h)), pose.spine));
    this.aim(B.aR, B.hR, pose.arm);
    if (T.crank && B.aL) this.aim(B.aL, B.hL, V(.32 + Math.cos(t * 12) * .12, -.15 + Math.sin(t * 12) * .12, .9));
    if (f.phase === 'cast' && B.aL) this.aim(B.aL, B.hL, V(.45, -.35, .85), Math.sin(Math.PI * clamp(f.timer / .45)) * .8);
    this.mark();
    // Fist + rod from the hand.
    ch.root.updateMatrixWorld(true);
    const hand = B.hR.getWorldPosition(V()), armW = this.world(pose.arm, V()).normalize(), d = this.world(pose.rod, V()).normalize();
    hand.addScaledVector(armW, .03 * this.S);
    const q = rodQuat(d, new THREE.Quaternion());
    this.fist.visible = true; this.fist.position.copy(hand); this.fist.quaternion.copy(q);
    rod.rotation.set(0, 0, 0); rod.position.copy(hand).addScaledVector(d, -.13 * this.S); rod.quaternion.copy(q);
    const n = f._rodJoints.length; for (let i = 0; i < n; i++) f._rodJoints[i].rotation.x = -pose.bend * (i / n) * .35;
    rod.updateMatrixWorld(true); f._rodTip?.getWorldPosition(f._rodTipWorld);
    return true;
  }
  // Ready / wind-up: the float dangles under the tip (simple pendulum), as in the test.
  dangle(dt) {
    const f = this.f, tip = f._rodTipWorld, len = .34 * this.S, b = this.bob;
    if (b.p.y < -50) { b.p.copy(tip); b.p.y -= len; b.v.set(0, 0, 0); }
    b.v.y -= 9.8 * dt; b.v.multiplyScalar(Math.pow(.12, dt)); b.p.addScaledVector(b.v, dt);
    const r = V().subVectors(b.p, tip), l = r.length();
    if (l > len) { r.multiplyScalar(len / l); const np = tip.clone().add(r); b.v.add(np.clone().sub(b.p).multiplyScalar(.5 / Math.max(dt, 1e-3))); b.p.copy(np); }
    f.bobber.position.copy(b.p); f.bobber.visible = true;
  }
}
