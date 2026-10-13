// @ts-nocheck
// R59: Jannik's wilds-loop GLBs (assets/wilds/) replace the R47 placeholder meshes.
// Each model is one GLB with node animations (no skins): nodes Idle → action → (hidden) → Regrow,
// thicket Idle → Cut → Cleared, caches Closed → Open → Looted. The `<root>_Ring` ground ring is
// driven by the game (opacity .11 → .49 when the player is close). Loading is optional: if a GLB
// fails, that kind keeps its procedural placeholder.
import * as THREE from 'three';
import { loadGLTF } from '../core/AssetManager.js';

const BASE = './assets/wilds/';
export const RING_COLOR = 0xfff1b8;
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

// R59.2: Jannik's private-garden pack (assets/garden/). Subtree models (hedge segments, weed stages)
// are cloned per node with their clips filtered to that subtree.
export const GARDEN_MODELS = {
  workbench: { file: 'garden_workbench', dir: './assets/garden/', scale: 1.3 },
  barrel:    { file: 'home_rain_compost', dir: './assets/garden/', scale: 1.35 },
  shrine:    { file: 'home_seed_shrine',  dir: './assets/garden/', scale: 1.35 },
  hedge:     { file: 'home_thorn_hedge',  dir: './assets/garden/', scale: 1.45 },
  weeds:     { file: 'garden_weeds',      dir: './assets/garden/', scale: 1.4 },
  potplant:  { file: 'garden_pot_plant',  dir: './assets/garden/', scale: 1 },
  swift:     { file: 'perk_swift',        dir: './assets/garden/', scale: 1 },
  roots:     { file: 'perk_roots',        dir: './assets/garden/', scale: 1 },
  ward:      { file: 'perk_ward',         dir: './assets/garden/', scale: 1 },
  lucky:     { file: 'perk_lucky',        dir: './assets/garden/', scale: 1 }
};

export function loadGardenModels() { return loadSet(GARDEN_MODELS); }
export function loadWildsModels() { return loadSet(WILDS_MODELS); }
async function loadSet(set) {
  const out = {};
  await Promise.all(Object.entries(set).map(async ([kind, def]) => {
    try { out[kind] = await loadGLTF(`${def.dir || BASE}${def.file}.glb`); }
    catch (e) { console.warn(`[TGW] wilds model ${def.file} failed; keeping the placeholder`, e); }
  }));
  return out;
}

// One placed instance: cloned scene + its own mixer and ring material.
export class WildsModel {
  // opts.node: clone only that named subtree (position reset), clips filtered to it.
  constructor(gltf, kind, opts = {}) {
    const def = WILDS_MODELS[kind] || GARDEN_MODELS[kind];
    this.def = def;
    if (opts.node) { const sub = gltf.scene.getObjectByName(opts.node).clone(true); sub.position.set(0, 0, 0); this.root = new THREE.Group(); this.root.add(sub); }
    else this.root = gltf.scene.clone(true);
    this.root.scale.setScalar(opts.scale ?? def.scale);
    const top = this.root.children[0];
    this.root.traverse(o => { if (o.isMesh) { o.castShadow = !/Ring|Bit|Spark|Light|Glow|Ghost|Aura/.test(o.name); o.receiveShadow = true; } });
    // R59.1: the authored ring rests at scale 0 (only the Highlight clip unfolds it) and its colour is the
    // muted material tone, so it was invisible. Rest at full size, one bright "usable" colour for every model.
    const ring = top && this.root.getObjectByName(`${top.name}_Ring`);
    this.ringMat = null;
    if (ring) ring.scale.set(1, 1, 1);
    ring?.traverse(o => { if (o.isMesh) { o.material = new THREE.MeshBasicMaterial({ color: RING_COLOR, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }); o.castShadow = false; o.renderOrder = 2; this.ringMat = o.material; } });
    this.root.updateMatrixWorld(true);
    this.top = new THREE.Box3().setFromObject(this.root).max.y; // for the icon bubble / glint height
    this.mixer = new THREE.AnimationMixer(this.root);
    const filter = c => { if (!opts.node) return c; const tracks = c.tracks.filter(t => this.root.getObjectByName(THREE.PropertyBinding.parseTrackName(t.name).nodeName)); return new THREE.AnimationClip(c.name, c.duration, tracks); };
    this.clips = Object.fromEntries(gltf.animations.map(c => [c.name, filter(c)]));
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
  // Hold the last frame of a clip (static pose, e.g. an underground Mole).
  hold(name) {
    const c = this.clips[name]; if (!c) return;
    this.queue = []; this.onDone = null; this.mixer.stopAllAction();
    this.current = this.mixer.clipAction(c); this.current.reset().setLoop(THREE.LoopOnce, 1); this.current.clampWhenFinished = true; this.current.play();
    this.current.time = c.duration; this.mixer.update(0);
  }
  ring(alpha) { if (this.ringMat) this.ringMat.opacity = alpha; }
  // Highlight (sparks + ring pulse) runs on top of the state clip while the player is close.
  highlight(on) {
    const c = this.clips.Highlight; if (!c) return;
    this.hl ||= this.mixer.clipAction(c).setLoop(THREE.LoopRepeat, Infinity);
    if (on && !this.hl.isRunning()) this.hl.reset().play(); else if (!on && this.hl.isRunning()) this.hl.stop();
  }
  update(dt) { this.mixer.update(dt); }
}
