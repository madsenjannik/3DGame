// @ts-nocheck
// R174 (Jannik GO 15/10, ?ring=premium only): every build and upgrade gets its own camera moment.
// Buying one in the Workbench panel (workshop, greenhouse, home upgrades) or growing a perk at the shrine closes the panel; the camera glides out to a 3/4 view in front
// of what is being built, orbits slowly while its Build/Upgrade/Unlock/Grow clip plays, holds ~0.8 s on the result and glides back
// behind the character. The follow camera keeps running underneath, so the way back is a blend, never a jump. Any key or click
// skips. Movement waits while it plays; input pressed during it is dropped at the end. Garden only. Fails soft (no target = no shot).
// R175 (Jannik 15/10): the build itself (run) starts only once the camera has arrived, and the shot sits closer.
// R176 (Jannik 15/10: 'just the workbench in focus and a little pan, nothing else'): no orbit. The camera stands in front of the
// structure, framed so the whole of it fits the view, and pans 8 degrees across its front during the shot.
// R184 (Jannik 16/10: 'zoom further in on the chosen character, the tree is in front'): a caller can place the shot itself:
// at (the point to frame), yaw (world direction the camera stands in, seen from that point), dist, h, lookY, pan0 and pan.
import * as THREE from 'three';

const IN = .7, OUT = .7, HOLD = .8, RUN = IN + .1, PAN0 = .2, PAN = .14;   // seconds; when run() fires; start angle off the front and pan width (rad)
const ss = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export class UpgradeShowcase {
  constructor(game) {
    this.g = game; this.active = false; this.pos = new THREE.Vector3(); this.look = new THREE.Vector3(); this.q = new THREE.Quaternion(); this.m = new THREE.Matrix4();
    const skip = () => { if (this.active && this.t > .4 && this.end === Infinity) this.end = this.t; };
    addEventListener('keydown', skip, true); addEventListener('pointerdown', skip, true);
  }
  // target: the Object3D being built (its world +Z is its front). size/height: in metres, else measured from the target.
  // run(): starts the build (its clip) once the camera is in place. done(): true once that animation has finished.
  // min/max: seconds before 'done' is asked / the longest wait for it.
  start({ target, run = null, done = null, size = 0, height = 0, min = 1.6, max = 9, at = null, yaw = null, dist = 0, h = null, lookY = null, pan0 = PAN0, pan = PAN } = {}) {
    if (!target || this.g.world?.space !== 'garden') return false;
    if (this.active) this.stop();   // a pending build of the previous shot still starts
    target.updateWorldMatrix(true, true); const box = new THREE.Box3().setFromObject(target), c = new THREE.Vector3(), s = new THREE.Vector3();
    if (box.isEmpty()) target.getWorldPosition(c); else { box.getCenter(c); box.getSize(s); }
    if (at) c.copy(at);
    size = size || Math.max(2, Math.min(8, Math.max(s.x, s.z))); height = height || Math.max(1.5, Math.min(6, s.y));
    const f = new THREE.Vector3(0, 0, 1).transformDirection(target.matrixWorld); f.y = 0; if (f.lengthSq() < 1e-4) f.set(0, 0, 1); f.normalize();
    const gy = this.g.world?.groundHeight?.(c.x, c.z) || 0;
    Object.assign(this, { c: new THREE.Vector3(c.x, gy, c.z), yaw0: yaw ?? Math.atan2(f.x, f.z), size, height, h: h ?? height * .45 + .7, lookY: lookY ?? height * .42, dist, pan0, pan,
      run, done, min, max, t: 0, doneAt: null, end: Infinity, active: true });
    return true;
  }
  update(dt, cam) {
    if (!this.active || !cam) return;
    if (this.g.world?.space !== 'garden') { this.stop(); return; }
    this.t += dt;
    if (this.run && (this.t >= RUN || this.end !== Infinity)) this.fire();
    if (this.doneAt === null && this.t >= this.min) { let d = true; try { d = !this.done || !!this.done(); } catch {} if (d || this.t >= this.max) this.doneAt = this.t; }
    if (this.doneAt !== null && this.end === Infinity) this.end = this.doneAt + HOLD;
    if (this.t >= this.end + OUT) { this.stop(); return; }
    const w = ss(this.t / IN) * (1 - ss((this.t - this.end) / OUT));
    // framed to fit: the larger of width and height fills ~80 % of the view at the camera's own field of view
    const half = THREE.MathUtils.degToRad((cam.fov || 50) / 2), fitW = (this.size / 2) / (Math.tan(half) * (cam.aspect || 1.6)), fitH = (this.height / 2) / Math.tan(half), dist = this.dist || Math.max(3.5, Math.max(fitW, fitH) * 1.25 + this.size * .5);
    const p = this.end === Infinity ? Math.min(1, this.t / Math.max(this.min, 4)) : Math.min(1, this.end / Math.max(this.min, 4)), a = this.yaw0 + this.pan0 - this.pan * ss(p);   // 11 deg off the front, pans 8 deg
    this.pos.set(this.c.x + Math.sin(a) * dist, this.c.y + this.h, this.c.z + Math.cos(a) * dist);
    this.look.set(this.c.x, this.c.y + this.lookY, this.c.z);
    this.m.lookAt(this.pos, this.look, cam.up); this.q.setFromRotationMatrix(this.m);
    cam.position.lerp(this.pos, w); cam.quaternion.slerp(this.q, w); cam.updateMatrixWorld();
  }
  fire() { const r = this.run; this.run = null; try { r?.(); } catch (e) { console.warn('[TGW] build after the camera failed', e); } }
  stop() { this.fire(); this.active = false; const i = this.g.input; try { i?.consumeStrike?.(); i?.consumeAction?.(); i?.consumeHop?.(); } catch {} }
}
