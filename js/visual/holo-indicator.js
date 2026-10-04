// Holo-indikator · "Jeg kan noget her"
// Én høj, stillestående lyscylinder i guld rundt om et objekt, man kan bruge.
// Scanlinjer, svagt skær og rolig vejrtrækning (2,4 s). Kun additive materialer, ingen skygger og ingen post-processing.
import * as THREE from 'three';

const DEFAULTS = {
  radius: 0.85,        // cylinderens radius (m), ca. objektets radius + 0,3
  height: 1.7,         // cylinderens højde (m)
  color: 0xf2c46b,     // guld (brand: Guldfrø-familien)
  intensity: 0.55,     // samlet styrke for cylinderen
  breath: 2.4,         // sekunder pr. vejrtrækning
  scanSpeed: 2.0,      // hvor hurtigt scanlinjerne glider
  scanDensity: 90.0,   // antal scanlinjer (frekvens)
  baseRing: true,      // blød ring på jorden ved foden
  groundHalo: true,    // blødt lysskær på jorden
  fadeIn: 0.35         // sekunder for at tone ind og ud ved show() og hide()
};

let _ringTex = null, _haloTex = null;
function ringTexture() {
  if (_ringTex) return _ringTex;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(242,184,107,0)'); g.addColorStop(0.52, 'rgba(242,184,107,0)');
  g.addColorStop(0.7, 'rgba(255,220,150,1)'); g.addColorStop(0.86, 'rgba(242,184,107,.25)'); g.addColorStop(1, 'rgba(242,184,107,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return (_ringTex = new THREE.CanvasTexture(c));
}
function haloTexture() {
  if (_haloTex) return _haloTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,214,140,1)'); g.addColorStop(0.35, 'rgba(242,184,107,.55)'); g.addColorStop(1, 'rgba(242,184,107,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return (_haloTex = new THREE.CanvasTexture(c));
}

const VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const FRAG = `
uniform float uT, uI, uBreath, uScanSpeed, uScanDensity, uVis; uniform vec3 uCol; varying vec2 vUv;
void main(){
  float y = vUv.y;
  float fade    = pow(1.0 - y, 1.6);                         // lysest ved jorden
  float base    = smoothstep(0.08, 0.0, y) * 0.8;            // lys kant ved foden
  float scan    = 0.75 + 0.25 * sin(y * uScanDensity - uT * uScanSpeed);
  float shimmer = 0.85 + 0.15 * sin(vUv.x * 18.8496 + uT * 0.8);
  float pulse   = 0.75 + 0.25 * sin(uT * 6.2832 / uBreath);
  float top     = smoothstep(1.0, 0.85, y);                  // blød top
  gl_FragColor  = vec4(uCol * 1.2, (fade * scan * shimmer + base) * pulse * top * uI * uVis);
}`;

export function createHoloIndicator(options = {}) {
  const o = { ...DEFAULTS, ...options };
  const group = new THREE.Group(); group.name = 'HoloIndicator';
  const col = new THREE.Color(o.color);
  // R72.1: blending 'normal' lets a grey (locked) indicator read as grey on bright ground; default stays additive.
  const BL = o.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending;
  let vis = 1, target = 1;

  const holoMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: BL,
    uniforms: { uT: { value: 0 }, uI: { value: o.intensity }, uBreath: { value: o.breath }, uScanSpeed: { value: o.scanSpeed }, uScanDensity: { value: o.scanDensity }, uVis: { value: 1 }, uCol: { value: col } },
    vertexShader: VERT, fragmentShader: FRAG
  });
  const holo = new THREE.Mesh(new THREE.CylinderGeometry(o.radius, o.radius, o.height, 48, 1, true), holoMat);
  holo.position.y = o.height / 2; holo.renderOrder = 3; holo.frustumCulled = false; group.add(holo);

  let ring = null, halo = null;
  if (o.baseRing) {
    const s = o.radius * 2.47;
    ring = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: ringTexture(), color: col, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: BL }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.renderOrder = 2; group.add(ring);
  }
  if (o.groundHalo) {
    const s = o.radius * 3.5;
    halo = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: haloTexture(), color: col, transparent: true, depthWrite: false, blending: BL }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.05; group.add(halo);
  }

  return {
    group,
    /** Kald hver frame. t = sekunder (fx clock.elapsedTime), dt = delta-sekunder. */
    update(t, dt = 1 / 60) {
      const step = o.fadeIn > 0 ? dt / o.fadeIn : 1;
      vis += Math.sign(target - vis) * Math.min(Math.abs(target - vis), step);
      const breath = Math.sin(t * Math.PI * 2 / o.breath);
      holoMat.uniforms.uT.value = t; holoMat.uniforms.uVis.value = vis;
      if (ring) ring.material.opacity = (0.7 + 0.3 * breath) * vis;
      if (halo) halo.material.opacity = (0.22 + 0.12 * breath) * vis;
      group.visible = vis > 0.001;
    },
    show() { target = 1; },
    hide() { target = 0; },
    setInstant(on) { target = vis = on ? 1 : 0; group.visible = !!on; },
    dispose() {
      group.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } });
      group.removeFromParent();
    }
  };
}
