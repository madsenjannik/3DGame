// @ts-nocheck
// R70 3D look pass (HUD step 3/3). Parameter-only grade for the shared world: bluer zenith, warmer sun,
// a little more exposure and atmospheric haze. No extra render passes, so it costs no frame time.
// It is applied only in the shared world and reverted in the private garden, so the garden and the
// three greenhouse levels keep their exact current look. DEV menu → 3D-LOOK toggles it (localStorage).
import * as THREE from 'three';

const KEY = 'tgw.look';
const LOOK = {
  exposure: 1.14,
  horizon: 0xe2ead8, zenith: 0x6fa9d6, sun: 0xfff3dc,
  fog: { near: 38, far: 240 },
  hemi: { sky: 0xd4e8f4, ground: 0x6f7d3c, intensity: 1.08 },
  sunLight: { color: 0xffe0b2, intensity: 3.25 },
  envIntensity: .56
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
  // Called every frame: on in the shared world (when enabled), off in the private garden.
  update(gardenSpace) {
    const want = this.enabled && !gardenSpace;
    if (want !== this.applied) this.set(want);
  }
  toggle() { this.enabled = !this.enabled; try { localStorage.setItem(KEY, this.enabled ? 'on' : 'off'); } catch {} return this.enabled; }
}
