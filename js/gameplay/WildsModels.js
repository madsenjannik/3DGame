// @ts-nocheck
// R59: Jannik's wilds-loop GLBs (assets/wilds/) replace the R47 placeholder meshes.
// Each model is one GLB with node animations (no skins): nodes Idle → action → (hidden) → Regrow,
// thicket Idle → Cut → Cleared, caches Closed → Open → Looted. The `<root>_Ring` ground ring is
// driven by the game (opacity .11 → .49 when the player is close). Loading is optional: if a GLB
// fails, that kind keeps its procedural placeholder.
import * as THREE from 'three';
import { loadGLTF } from '../core/AssetManager.js';

const BASE = './assets/wilds/';
// kind -> file, gameplay scale (models are authored small; scaled to the existing footprints/colliders),
// action clips played on gather (in order).
export const WILDS_MODELS = {
  wood:    { file: 'wilds_fallen_branches', scale: 1.8, action: ['Gather'] },
  oldlog:  { file: 'wilds_old_log',         scale: 1.7, action: ['Chop', 'Gather'] },
  stone:   { file: 'wilds_loose_stones',    scale: 2.2, action: ['Gather'] },
  boulder: { file: 'wilds_boulder',         scale: 1.15, action: ['Break'] },
  clay:    { file: 'wilds_clay_bank',       scale: 1.3, action: ['Dig'] },
  fiber:   { file: 'wilds_wild_grass',      scale: 1.8, action: ['Cut'] },
  thicket: { file: 'wilds_thorn_thicket',   scale: 1.75 },
  amber:   { file: 'wilds_amber_cache',     scale: 1.3 },
  golden:  { file: 'wilds_golden_cache',    scale: 1.3 }
};

export async function loadWildsModels() {
  const out = {};
  await Promise.all(Object.entries(WILDS_MODELS).map(async ([kind, def]) => {
    try { out[kind] = await loadGLTF(`${BASE}${def.file}.glb`); }
    catch (e) { console.warn(`[TGW] wilds model ${def.file} failed; keeping the placeholder`, e); }
  }));
  return out;
}

// One placed instance: cloned scene + its own mixer and ring material.
export class WildsModel {
  constructor(gltf, kind) {
    const def = WILDS_MODELS[kind];
    this.def = def; this.root = gltf.scene.clone(true); this.root.scale.setScalar(def.scale);
    const top = this.root.children[0];
    this.root.traverse(o => { if (o.isMesh) { o.castShadow = !/Ring|Bit|Spark|Light|Glow/.test(o.name); o.receiveShadow = true; } });
    const ring = top && this.root.getObjectByName(`${top.name}_Ring`);
    this.ringMat = null;
    ring?.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.depthWrite = false; this.ringMat = o.material; } });
    this.mixer = new THREE.AnimationMixer(this.root);
    this.clips = Object.fromEntries(gltf.animations.map(c => [c.name, c]));
    this.current = null; this.queue = []; this.onDone = null;
    this.mixer.addEventListener('finished', () => this.next());
  }
  has(name) { return !!this.clips[name]; }
  // Loop a clip (idle states).
  loop(name) {
    const c = this.clips[name]; if (!c) return;
    if (this.current?.getClip() === c && this.current.loop === THREE.LoopRepeat) return;
    this.queue = []; this.onDone = null; this.mixer.stopAllAction();
    this.current = this.mixer.clipAction(c); this.current.reset().setLoop(THREE.LoopRepeat, Infinity).play();
  }
  // Play one-shot clips in order, then call done (the last pose is held).
  play(names, done) {
    this.queue = names.filter(n => this.clips[n]); this.onDone = done || null;
    if (!this.queue.length) { const d = this.onDone; this.onDone = null; d?.(); return; }
    this.next(true);
  }
  next(first) {
    if (!first && !this.queue.length && !this.onDone) return;
    if (!this.queue.length) { const d = this.onDone; this.onDone = null; d?.(); return; }
    const c = this.clips[this.queue.shift()];
    this.mixer.stopAllAction();
    this.current = this.mixer.clipAction(c); this.current.reset().setLoop(THREE.LoopOnce, 1); this.current.clampWhenFinished = true; this.current.play();
  }
  busy() { return !!this.onDone || this.queue.length > 0; }
  ring(near) { if (this.ringMat) this.ringMat.opacity = .11 + near * .38; }
  update(dt) { this.mixer.update(dt); }
}
