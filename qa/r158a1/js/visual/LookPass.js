// @ts-nocheck
// R70 3D look pass (HUD step 3/3), R71 stronger. Parameter-only grade for the shared world: bluer zenith, warmer sun,
// a little more exposure and atmospheric haze. No extra render passes, so it costs no frame time.
// It is applied only in the shared world and reverted in the private garden, so the garden and the
// three greenhouse levels keep their exact current look. DEV menu → 3D-LOOK toggles it (localStorage).
import * as THREE from 'three';

const KEY = 'tgw.look';
// R71: R70's grade sat too close to the base (Jannik could not see it). Now a clear 'golden afternoon':
// warmer, stronger low sun against a weaker sky fill (more light/shadow contrast), deeper blue zenith,
// warm horizon haze that starts nearer (depth), a touch more exposure.
export const LOOK = {
  exposure: 1.30,
  horizon: 0xf3d9ad, zenith: 0x3f86d4, sun: 0xffdc98,
  fog: { near: 22, far: 175 },
  hemi: { sky: 0xb4d2ee, ground: 0x4a5626, intensity: .64 },
  sunLight: { color: 0xffbd70, intensity: 4.6 },
  envIntensity: .34
};
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

export class LookPass {
  constructor(game) {
    this.g = game; this.enabled = read() !== 'off'; this.applied = false; this.base = null;
  }
  capture() {
    const g = this.g, w = g.world, s = g.scene, u = w.sky?.material?.uniforms;
    if (!u || !w.hemi || !w.sun || !s.fog) return false;
    this.base = {
      exposure: g.renderer.toneMappingExposure, bg: s.background?.clone?.(), fogColor: s.fog.color.clone(), near: s.fog.near, far: s.fog.far,
      uH: u.uH.value.clone(), uZ: u.uZ.value.clone(), uS: u.uS.value.clone(),
      hemiSky: w.hemi.color.clone(), hemiGround: w.hemi.groundColor.clone(), hemiI: w.hemi.intensity,
      sunC: w.sun.color.clone(), sunI: w.sun.intensity, env: s.environmentIntensity
    };
    return true;
  }
  set(on) {
    if (!this.base && !this.capture()) return;
    const g = this.g, w = g.world, s = g.scene, u = w.sky.material.uniforms, b = this.base, c = v => new THREE.Color(v);
    if (on) {
      g.renderer.toneMappingExposure = LOOK.exposure;
      const h = c(LOOK.horizon); s.background?.copy?.(h); s.fog.color.copy(h); s.fog.near = LOOK.fog.near; s.fog.far = LOOK.fog.far;
      u.uH.value.copy(h); u.uZ.value.copy(c(LOOK.zenith)); u.uS.value.copy(c(LOOK.sun));
      w.hemi.color.set(LOOK.hemi.sky); w.hemi.groundColor.set(LOOK.hemi.ground); w.hemi.intensity = LOOK.hemi.intensity;
      w.sun.color.set(LOOK.sunLight.color); w.sun.intensity = LOOK.sunLight.intensity; s.environmentIntensity = LOOK.envIntensity;
      g.renderer.setClearColor(h, 1);
    } else {
      g.renderer.toneMappingExposure = b.exposure; if (b.bg) s.background?.copy?.(b.bg); s.fog.color.copy(b.fogColor); s.fog.near = b.near; s.fog.far = b.far;
      u.uH.value.copy(b.uH); u.uZ.value.copy(b.uZ); u.uS.value.copy(b.uS);
      w.hemi.color.copy(b.hemiSky); w.hemi.groundColor.copy(b.hemiGround); w.hemi.intensity = b.hemiI;
      w.sun.color.copy(b.sunC); w.sun.intensity = b.sunI; s.environmentIntensity = b.env;
      if (b.bg) g.renderer.setClearColor(b.bg, 1);
    }
    this.applied = on;
  }
  // R81: the 'day' values the day/night cycle blends from (the grade when it is applied, else the base look).
  dayValues() {
    if (!this.base && !this.capture()) return null;
    const b = this.base, c = v => new THREE.Color(v);
    if (!this.applied) return { exposure: b.exposure, horizon: b.fogColor, zenith: b.uZ, sunGlow: b.uS, near: b.near, far: b.far, hemiSky: b.hemiSky, hemiGround: b.hemiGround, hemiI: b.hemiI, sunC: b.sunC, sunI: b.sunI, env: b.env };
    return this._lookVals ||= { exposure: LOOK.exposure, horizon: c(LOOK.horizon), zenith: c(LOOK.zenith), sunGlow: c(LOOK.sun), near: LOOK.fog.near, far: LOOK.fog.far, hemiSky: c(LOOK.hemi.sky), hemiGround: c(LOOK.hemi.ground), hemiI: LOOK.hemi.intensity, sunC: c(LOOK.sunLight.color), sunI: LOOK.sunLight.intensity, env: LOOK.envIntensity };
  }
  // Called every frame: on in the shared world (when enabled), off in the private garden.
  update(gardenSpace) {
    const want = this.enabled && !gardenSpace;
    if (want !== this.applied) this.set(want);
  }
  toggle() { this.enabled = !this.enabled; try { localStorage.setItem(KEY, this.enabled ? 'on' : 'off'); } catch {} return this.enabled; }
}
