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
    this.fixed = [];   // R139: fixed footprints that always clear vegetation (Spirebænken); { x0, x1, z0, z1 }
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

  apply() {
    this.collect();
    // R60.2: a moved greenhouse also clears a strip along its new branch path.
    const rects = this.rects(), g = this.garden, branch = g.isDefault('greenhouse') ? null : g.currentBranch();
    const onBranch = (x, z) => { if (!branch) return false; for (let i = 0; i < branch.length - 1; i++) { const a = branch[i], vx = branch[i + 1].x - a.x, vz = branch[i + 1].z - a.z, L = vx * vx + vz * vz || 1; let t = ((x - a.x) * vx + (z - a.z) * vz) / L; t = t < 0 ? 0 : t > 1 ? 1 : t; if (Math.hypot(x - a.x - vx * t, z - a.z - vz * t) < .72) return true; } return false; };
    const inside = (x, z) => rects.some(r => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) || onBranch(x, z);
    // R139: fixed footprints hide vegetation only (not counted in 'hidden', which stays 'under moved structures'); their
    // small-stone colliders stay (under Spirebænken they sit beneath the pots)
    const fixedIn = (x, z) => this.fixed.some(r => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
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
    for (const c of this.hiddenColliders.splice(0)) if (!inside(c.x, c.z)) { for (const l of lists) if (!l.includes(c)) l.push(c); } else this.hiddenColliders.push(c);
    for (const c of [...w.colliders]) {
      if ((c.space || 'garden') !== 'garden' || !COVERABLE.has(c.kind) || !inside(c.x, c.z)) continue;
      for (const l of lists) { const i = l.indexOf(c); if (i >= 0) l.splice(i, 1); }
      this.hiddenColliders.push(c);
    }
    return this.meshes.reduce((a, e) => a + e.hidden, 0);
  }
}
