// @ts-nocheck
// R60 step 2: hide authored garden vegetation (grass, wisps, flowers, bed shrubs, small stones) under
// structures the player has MOVED away from their default spot, and restore it when they move again.
// Structures on their default spot hide nothing, so the authored garden stays exactly as it was.
// Everything here is instanced, so hiding = a zero-scale instance matrix (the original is kept).
// Small stones / bed shrubs under a moved structure also lose their collider while covered.
import * as THREE from 'three';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const SKIP = /^(WILDS_|GreenhouseProgression_|PRIVATE_SEED|Cabin)/;
const COVERABLE = new Set(['stone', 'static']); // authored small stones (addObstacle) and bed shrubs (addCollider)

export class GardenVegetationMask {
  constructor({ world, garden }) {
    this.world = world; this.garden = garden; this.meshes = null; this.hiddenColliders = [];
    this.fixed = [];   // R139/R140: fixed footprints that always clear vegetation (Spirebænken): { x0, x1, z0, z1 } or { cx, cz, r }; colliders: true also removes the small stones / bed shrubs there for good
  }

  // Collect instanced vegetation (new meshes only, so late-loading decor is picked up on the next apply).
  collect() {
    this.meshes ||= []; const known = new Set(this.meshes.map(e => e.mesh));
    const skip = o => { for (let p = o; p; p = p.parent) if (SKIP.test(p.name || '')) return true; return false; };
    this.world.privateRoot.updateMatrixWorld(true);
    const m = new THREE.Matrix4(), v = new THREE.Vector3();
    this.world.privateRoot.traverse(o => {
      if (!o.isInstancedMesh || known.has(o) || skip(o)) return;
      const n = o.count, original = new Float32Array(o.instanceMatrix.array), pos = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) { o.getMatrixAt(i, m); v.setFromMatrixPosition(m).applyMatrix4(o.matrixWorld); pos[i * 2] = v.x; pos[i * 2 + 1] = v.z; }
      this.meshes.push({ mesh: o, original, pos, hidden: 0 });
    });
  }

  // Rects of every structure that is not on its default spot (body footprint + 0.25 m).
  rects() {
    const g = this.garden; return g.p.garden.buildings.filter(b => !g.isDefault(b.id)).map(b => g.footprintRect(b.id, .25));
  }

  // R143 (GO 09/10): the authored garden was never planted under the greenhouse's default spot (a ~10.7 x 7.3 m rect), so
  // moving the greenhouse left it bare. A regrow patch fills that rect with the garden's own grass, wisps and tall grass
  // (instances copied from the authored layers, seeded, paths kept clear); it shows only while the greenhouse is moved.
  regrow() {
    const moved = !this.garden.isDefault('greenhouse');
    if (moved && !this.patch) this.patch = this.buildPatch();
    for (const m of this.patch || []) m.visible = moved;
  }
  buildPatch() {
    const W = this.world, gh = W.greenhouse; if (!gh) return [];
    const r = { x0: gh.x - gh.w - .55, x1: gh.x + gh.w + .55, z0: gh.z - gh.l - .55, z1: gh.z + gh.l + .55 }, area = (r.x1 - r.x0) * (r.z1 - r.z0);
    let seed = 4242; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), c = new THREE.Color(), srcs = [], out = [];
    W.privateRoot.traverse(o => { if (o.isInstancedMesh && !o.userData.regrow && ['grass', 'wisp', 'tall'].includes(o.userData.calmType)) srcs.push(o); });
    for (const src of srcs) {
      const n = Math.min(4000, Math.round(src.count / 625 * area)); if (!n) continue;   // the same density as the authored ~25 x 25 m garden
      const mesh = new THREE.InstancedMesh(src.geometry, src.material, n); mesh.userData = { calmType: src.userData.calmType, regrow: true }; mesh.name = `R143_REGROW_${src.userData.calmType}`;
      let k = 0;
      for (let i = 0; i < n * 3 && k < n; i++) {
        const x = r.x0 + rnd() * (r.x1 - r.x0), z = r.z0 + rnd() * (r.z1 - r.z0), j = Math.floor(rnd() * src.count);
        if (W.pathDistance?.(x, z) < .74) continue;
        src.getMatrixAt(j, m4); m4.decompose(p, q, sc); p.x = x; p.z = z; m4.compose(p, q, sc); mesh.setMatrixAt(k, m4);
        if (src.instanceColor) { src.getColorAt(j, c); mesh.setColorAt(k, c); } k++;
      }
      mesh.count = k; mesh.receiveShadow = src.receiveShadow; mesh.castShadow = src.castShadow; mesh.frustumCulled = false; src.parent.add(mesh); out.push(mesh);
    }
    return out;
  }

  apply() {
    try { this.regrow(); } catch (e) { console.warn('[TGW] regrow patch', e); }
    this.collect();
    // R60.2: a moved greenhouse also clears a strip along its new branch path.
    const rects = this.rects(), g = this.garden, branch = g.isDefault('greenhouse') ? null : g.currentBranch();
    const onBranch = (x, z) => { if (!branch) return false; for (let i = 0; i < branch.length - 1; i++) { const a = branch[i], vx = branch[i + 1].x - a.x, vz = branch[i + 1].z - a.z, L = vx * vx + vz * vz || 1; let t = ((x - a.x) * vx + (z - a.z) * vz) / L; t = t < 0 ? 0 : t > 1 ? 1 : t; if (Math.hypot(x - a.x - vx * t, z - a.z - vz * t) < .72) return true; } return false; };
    const inside = (x, z) => rects.some(r => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) || onBranch(x, z);
    // R139/R140: fixed footprints hide vegetation (not counted in 'hidden', which stays 'under moved structures');
    // only footprints marked colliders: true also take the small-stone / bed-shrub colliders under them
    const inFix = (r, x, z) => r.r != null ? Math.hypot(x - r.cx, z - r.cz) < r.r : x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;
    const fixedIn = (x, z) => this.fixed.some(r => inFix(r, x, z)), fixedCol = (x, z) => this.fixed.some(r => r.colliders && inFix(r, x, z));
    for (const e of this.meshes) {
      const arr = e.mesh.instanceMatrix.array; let hidden = 0, changed = false;
      for (let i = 0; i < e.mesh.count; i++) {
        const px = e.pos[i * 2], pz = e.pos[i * 2 + 1], moved = inside(px, pz), cover = moved || fixedIn(px, pz), o = i * 16;
        if (cover) { if (moved) hidden++; if (arr[o] !== 0 || arr[o + 5] !== 0 || arr[o + 10] !== 0) { ZERO.toArray(arr, o); changed = true; } }
        else if (arr[o] !== e.original[o] || arr[o + 5] !== e.original[o + 5] || arr[o + 10] !== e.original[o + 10]) { for (let k = 0; k < 16; k++) arr[o + k] = e.original[o + k]; changed = true; }
      }
      e.hidden = hidden; if (changed) e.mesh.instanceMatrix.needsUpdate = true;
    }
    // Colliders of covered small stones / bed shrubs.
    const w = this.world, lists = [w.colliders, w.obstacles];
    for (const c of this.hiddenColliders.splice(0)) if (!inside(c.x, c.z) && !fixedCol(c.x, c.z)) { for (const l of lists) if (!l.includes(c)) l.push(c); } else this.hiddenColliders.push(c);
    for (const c of [...w.colliders]) {
      if ((c.space || 'garden') !== 'garden' || !COVERABLE.has(c.kind) || !(inside(c.x, c.z) || fixedCol(c.x, c.z))) continue;
      for (const l of lists) { const i = l.indexOf(c); if (i >= 0) l.splice(i, 1); }
      this.hiddenColliders.push(c);
    }
    return this.meshes.reduce((a, e) => a + e.hidden, 0);
  }
}
