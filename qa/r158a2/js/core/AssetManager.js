// @ts-nocheck
// Small shared GLTF cache (R55). One download + parse per URL; concurrent requests share the same
// promise; a failed load is evicted so it can be retried. Callers that place a model in the scene
// more than once must clone it (cloneStatic for unskinned props). New code should load GLBs here.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { log } from '../dev/Log.js';

const cache = new Map();
const loader = new GLTFLoader();

export function loadGLTF(url) {
  if (!cache.has(url)) {
    const t0 = performance.now();
    cache.set(url, loader.loadAsync(url).then(g => { log('LOAD', `glb ${url.split('/').pop()} ${Math.round(performance.now() - t0)}ms`); return g; },
      e => { cache.delete(url); throw e; }));
  }
  return cache.get(url);
}

// Independent copy of an unskinned scene (shares geometry/materials; safe for static props).
export function cloneStatic(gltf) { return gltf.scene.clone(true); }

export function cachedUrls() { return [...cache.keys()]; }
