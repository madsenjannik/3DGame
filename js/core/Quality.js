// @ts-nocheck
// R55 adaptive quality. Same visual style on every profile; only resolution and shadow-map cost
// change. Touch devices start on 'mobile-high' and drop to 'mobile-low' if the measured frame rate
// stays below target; the choice is remembered per device. The Dev menu can force a profile.
import { log } from '../dev/Log.js';

export const QUALITY = {
  'desktop':     { dpr: 2,    shadow: 2048 },
  'mobile-high': { dpr: 1.5,  shadow: 1536 },
  'mobile-low':  { dpr: 1.15, shadow: 1024 }
};
const KEY = 'tgw.quality', FORCE = 'tgw.qualityForce';
const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };

export class QualityManager {
  constructor(game, isTouch) {
    this.g = game; this.isTouch = isTouch;
    this.forced = read(FORCE);
    this.id = QUALITY[this.forced] ? this.forced : (isTouch ? (read(KEY) === 'mobile-low' ? 'mobile-low' : 'mobile-high') : 'desktop');
    this.frames = 0; this.acc = 0; this.slow = 0; this.settle = 8; // ignore the first ~16 s after start (R114: lazy systems still load then)
    this.apply();
  }
  apply() {
    const q = QUALITY[this.id], r = this.g.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, q.dpr));
    if (this.g.viewSize) { const { w, h } = this.g.viewSize(); r.setSize(w, h, false); } else r.setSize(innerWidth, innerHeight, false);   // R66: CSS owns the canvas box
    const sun = this.g.world?.sun;
    if (sun && sun.shadow.mapSize.x !== q.shadow) { sun.shadow.mapSize.set(q.shadow, q.shadow); sun.shadow.map?.dispose(); sun.shadow.map = null; }
    log('PERF', `quality ${this.id} (dpr ${r.getPixelRatio().toFixed(2)}, shadow ${q.shadow})`);
  }
  set(id) { // DEV: null = automatic
    this.forced = QUALITY[id] ? id : null; write(FORCE, this.forced);
    this.id = this.forced || (this.isTouch ? 'mobile-high' : 'desktop'); this.slow = 0; this.settle = 8; this.apply();
  }
  // Called once per frame with the real (unclamped) frame time in seconds.
  sample(dt) {
    if (this.forced || !this.isTouch || this.id === 'mobile-low' || document.hidden) return;
    if (dt > .25) return;   // R114: a single hitch (asset upload, shader compile) is not a slow device
    this.frames++; this.acc += dt; if (this.acc < 2) return;
    const fps = this.frames / this.acc; this.frames = 0; this.acc = 0;
    if (this.settle > 0) { this.settle--; return; }
    this.slow = fps < 42 ? this.slow + 1 : 0;
    if (this.slow >= 3) { this.id = 'mobile-low'; write(KEY, 'mobile-low'); this.apply(); log('PERF', `dropped to mobile-low at ${fps.toFixed(0)} fps`); }
  }
}
