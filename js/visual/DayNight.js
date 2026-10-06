// @ts-nocheck
// R81 day/night cycle (Jannik 05/10: 30 min per in-game day, time keeps running while the game is closed, night dark
// but readable). The clock is the real clock, so every session agrees on the time of day and nothing is saved:
// minute 0–21 of each real half hour is day (dawn in its first 1.5 min), 21–30 night (dusk 21–22.5). Like the R70 look
// pass it is a parameter-only blend of the light (sky, fog, hemisphere, sun → moon, exposure). R84: the shared world and
// the private garden both get night (greenhouse models untouched). Daily systems stay on real calendar days.
// DEV → TID: night now / day now / follow the clock.
import * as THREE from 'three';

export const DAY_MS = 30 * 60000;   // one in-game day (day + night)
const NIGHT = { exposure: 1.0, horizon: 0x2f3d5c, zenith: 0x0b1631, sunGlow: 0x9fb6e0, near: 14, far: 120, hemiSky: 0x7088bb, hemiGround: 0x1d2616, hemiI: .72, sunC: 0x9db8ec, sunI: 1.15, env: .16 };
const DUSK = { horizon: 0xe39a62, sunGlow: 0xff9a5a, sunC: 0xff8f52 };
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// 0 = full day, 1 = full night, for a real time.
export function nightAt(now = Date.now()) { const m = (now % DAY_MS) / 60000; return m < 1.5 ? 1 - sm(0, 1.5, m) : sm(21, 22.5, m); }
// Minutes into the current in-game day (0–30).
export const dayMinute = (now = Date.now()) => (now % DAY_MS) / 60000;

export class DayNight {
  constructor(game) {
    this.g = game; this.force = null; this.n = 0; this.lastN = -1; this.lastLook = null;
    const c = v => new THREE.Color(v); this.N = Object.fromEntries(Object.entries(NIGHT).map(([k, v]) => [k, typeof v === 'number' && v > 255 ? c(v) : /horizon|zenith|Glow|hemiSky|hemiGround|sunC/.test(k) ? c(v) : v]));
    this.D = Object.fromEntries(Object.entries(DUSK).map(([k, v]) => [k, c(v)])); this.tmp = { a: new THREE.Color(), b: new THREE.Color() };
  }
  night() { return this.force ?? nightAt(); }
  isNight() { return this.n > .5; }
  // colour through day → dusk → night (dusk peaks half way)
  col(day, key, n, out) { const nightC = this.N[key], dusk = this.D[key]; if (!dusk) return out.copy(day).lerp(nightC, n); const k = Math.sin(Math.PI * Math.min(1, n * 1.6)) * (1 - n); return out.copy(day).lerp(nightC, n).lerp(dusk, Math.max(0, k) * .75); }
  apply(n) {
    const g = this.g, w = g.world, s = g.scene, u = w.sky?.material?.uniforms, D = g.look?.dayValues?.();
    if (!u || !D || !w.hemi || !w.sun || !s.fog) return;
    const N = this.N, L = (a, b) => a + (b - a) * n, t = this.tmp.a;
    g.renderer.toneMappingExposure = L(D.exposure, N.exposure);
    this.col(D.horizon, 'horizon', n, t); s.background?.copy?.(t); s.fog.color.copy(t); u.uH.value.copy(t); g.renderer.setClearColor(t, 1);
    s.fog.near = L(D.near, N.near); s.fog.far = L(D.far, N.far);
    u.uZ.value.copy(D.zenith).lerp(N.zenith, n); this.col(D.sunGlow, 'sunGlow', n, u.uS.value);
    w.hemi.color.copy(D.hemiSky).lerp(N.hemiSky, n); w.hemi.groundColor.copy(D.hemiGround).lerp(N.hemiGround, n); w.hemi.intensity = L(D.hemiI, N.hemiI);
    this.col(D.sunC, 'sunC', n, w.sun.color); w.sun.intensity = L(D.sunI, N.sunI); s.environmentIntensity = L(D.env, N.env);
  }
  // Called every frame after the look pass.
  // R84 (Jannik 06/10): the private garden gets night too (it blends from the garden's own day look; the greenhouse
  // models are untouched, they are only lit darker at night).
  update(gardenSpace) {
    const n = this.night(), look = this.g.look?.applied ?? null;
    this.n = n; document.body.classList.toggle('is-night', n > .5);
    if (n <= 0 && this.lastN === 0 && look === this.lastLook) return;
    this.apply(n); this.lastN = n; this.lastLook = look;
  }
}
