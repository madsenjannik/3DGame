// @ts-nocheck
// R193 Fase 1c (Jannik GO 16/10): far wilds models drawn as one shared, frozen copy per kind.
// A wilds node / thorn thicket / cache is one GLB model of 19-76 parts, and every part was its own draw call (the world's wilds were
// ~300 calls for ~8k triangles). Beyond 45 m the game already stops updating a model's animation (WildsLoopSystem), so it stands frozen
// there anyway. For each kind this builds the model's rest pose once (its loop clip at t = 0), merges its parts by material and draws
// all far models of that kind as instances: a handful of calls per kind instead of ~25 per model. Near models stay the real, animated
// ones. Parts that are invisible at rest (ring at opacity 0, folded sparks) are left out. Fails soft: a kind that cannot be built is
// simply never proxied.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SKIP = /Ring|Bit|Spark|Light|Glow|Ghost|Aura/;

export class WildsFarProxy {
  constructor(parent) { this.root = new THREE.Group(); this.root.name = 'R193_WILDS_FAR'; parent.add(this.root); this.kinds = {}; }
  // key: proxy id; gltf: the kind's model; scale: its gameplay scale; clip: the rest loop (Idle / Closed); capacity: how many can be far at once
  kind(key, gltf, scale, clip, capacity, atEnd = false) {   // atEnd: the clip's last frame (a held pose, e.g. a dormant mole's Warning)
    if (this.kinds[key] !== undefined || !gltf || !capacity) return this.kinds[key] || null;
    try {
      const sc = gltf.scene.clone(true); sc.scale.setScalar(scale);
      const anim = gltf.animations?.find(a => a.name === clip); if (anim) { const mx = new THREE.AnimationMixer(sc), act = mx.clipAction(anim); if (atEnd) { act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; } act.play(); if (atEnd) act.time = anim.duration; mx.update(0); }
      sc.updateMatrixWorld(true); const by = new Map(), s = new THREE.Vector3();
      sc.traverse(o => { if (!o.isMesh || SKIP.test(o.name)) return; for (let q = o; q; q = q.parent) if (!q.visible) return;
        s.setFromMatrixScale(o.matrixWorld); if (Math.max(s.x, s.y, s.z) < 1e-4) return; if (o.material?.transparent && o.material.opacity < .01) return;
        const g = o.geometry.clone().applyMatrix4(o.matrixWorld); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); g.morphAttributes = {};
        if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
        const e = by.get(o.material) || by.set(o.material, { geos: [], cast: false }).get(o.material); e.geos.push(g); e.cast ||= o.castShadow; });
      const parts = [];
      for (const [mat, e] of by) {
        const keys = k => Object.keys(k.attributes).sort().join(','), sig = keys(e.geos[0]);
        const same = e.geos.filter(g => keys(g) === sig), rest = e.geos.filter(g => keys(g) !== sig);
        for (const list of [same, ...rest.map(g => [g])]) { if (!list.length) continue; const geo = list.length > 1 ? mergeGeometries(list, false) : list[0]; if (!geo) continue;
          const im = new THREE.InstancedMesh(geo, mat, capacity); im.count = 0; im.castShadow = e.cast; im.receiveShadow = true; im.frustumCulled = false; im.name = `R193_FAR_${key}`; this.root.add(im); parts.push(im); }
      }
      return (this.kinds[key] = parts.length ? { parts, n: 0 } : null);
    } catch (e) { console.warn('[TGW] wilds far copy failed for', key, e); return (this.kinds[key] = null); }
  }
  begin() { for (const k of Object.values(this.kinds)) if (k) k.n = 0; }
  add(key, matrix) { const k = this.kinds[key]; if (!k || k.n >= k.parts[0].instanceMatrix.count) return false; for (const im of k.parts) im.setMatrixAt(k.n, matrix); k.n++; return true; }
  end() { for (const k of Object.values(this.kinds)) if (k) for (const im of k.parts) { im.count = k.n; im.instanceMatrix.needsUpdate = true; } }
  stats() { const o = {}; for (const [key, k] of Object.entries(this.kinds)) if (k) o[key] = `${k.n}x${k.parts.length}`; return o; }
}
