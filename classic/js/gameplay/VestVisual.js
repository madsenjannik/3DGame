// @ts-nocheck
// R125 (GO 07/10): the Life Vest is worn, not held. Jannik's life_vest.glb (Life_Vest > Fabric + Plastic) is fitted to
// each character from its own body: bottom just above the Hips bone, top just under the Head bone, width and depth from
// the skinned torso vertices in that band. Parented to Spine so it moves with the body. Loads on first wear; fails soft.
import * as THREE from 'three';
import { loadGLTF } from '../core/AssetManager.js';

const URL_VEST = './assets/props/life-vest.glb';
const v = new THREE.Vector3();

export class VestVisual {
  constructor(game) { this.g = game; this.on = false; this.model = null; this.loading = null; }
  set(on) {
    this.on = !!on;
    if (this.on && !this.model && !this.loading) this.loading = loadGLTF(URL_VEST).then(gl => { this.attach(gl.scene.clone(true)); }).catch(e => console.warn('[TGW] life vest unavailable (fails soft)', e));
    if (this.model) this.model.visible = this.on;
  }
  bones() {
    const root = this.g.character?.root, out = {}; if (!root) return out;
    root.traverse(n => { if (n.isBone && !out[n.name]) out[n.name] = n; });
    return out;
  }
  // Torso band in world space: y between hips and head, x/z spread of the skinned vertices in that band.
  measure(root, hipsY, headY) {
    const xs = [], zs = []; let cx = 0, cz = 0, n = 0;
    root.updateMatrixWorld(true);
    root.traverse(m => {
      if (!m.isSkinnedMesh || !m.geometry?.attributes?.position) return;
      const pos = m.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 1500));
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); m.localToWorld(v);
        if (v.y < hipsY || v.y > headY) continue;
        xs.push(v.x); zs.push(v.z); cx += v.x; cz += v.z; n++;
      }
    });
    if (n < 12) return null;
    cx /= n; cz /= n;
    const spread = (arr, c) => { const d = arr.map(a => Math.abs(a - c)).sort((a, b) => a - b); return d[Math.floor(d.length * .86)] || 0; };   // 86th percentile: arms and leaf tips do not stretch it
    return { cx, cz, hx: spread(xs, cx), hz: spread(zs, cz) };
  }
  attach(model) {
    const b = this.bones(), parent = b.Spine || b.Hips, hips = b.Hips || parent, head = b.Head, root = this.g.character?.root;
    if (!parent || !root) return;
    const yaw = this.g.character.heading || 0; root.updateMatrixWorld(true);
    const hipsY = hips.getWorldPosition(v).y, headY = head ? head.getWorldPosition(new THREE.Vector3()).y : hipsY + .4;
    const top = hipsY + (headY - hipsY) * .78;   // the Head bone sits mid-head on these round characters; the torso ends well below it
    const body = this.measure(root, hipsY, top) || { hx: .14, hz: .12 };
    const src = new THREE.Box3().setFromObject(model), size = src.getSize(new THREE.Vector3());   // vest authored with its bottom at y = 0
    const H = Math.max(.1, (top - hipsY) * .95), W = Math.max(.14, body.hx * 2 * 1.22), D = Math.max(.12, body.hz * 2 * 1.25);
    const ws = parent.getWorldScale(new THREE.Vector3()).x || 1;
    model.name = 'LIFE_VEST_R125'; model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    const holder = new THREE.Group(); holder.name = 'LIFE_VEST_HOLDER';
    holder.add(model); model.scale.set(W / size.x, H / size.y, D / size.z);
    parent.add(holder); holder.scale.setScalar(1 / ws);
    // place in world (character facing), then convert to the parent's local space
    const target = new THREE.Vector3(body.cx ?? hips.getWorldPosition(new THREE.Vector3()).x, hipsY + (headY - hipsY) * .04, body.cz ?? hips.getWorldPosition(new THREE.Vector3()).z);
    holder.position.copy(parent.worldToLocal(target.clone()));
    const pq = parent.getWorldQuaternion(new THREE.Quaternion()), want = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    holder.quaternion.copy(pq.invert().multiply(want));
    this.model = holder; holder.visible = this.on;
  }
}
