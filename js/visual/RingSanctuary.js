// @ts-nocheck
// R157 experimental (GO 14/10, branch claude/sprouting-ring-premium; only with ?ring=premium): the Sprouting Ring in the
// look of Jannik's 'Sprouting Ring Concept Scene' (Claude Design). Choice A: the concept's botanical pods replace the nine
// terracotta pots; positions, unlock states, the planting moment, colliders, interactions and the save stay the Ring's own.
// Everything here is LOCAL to the ring (a child of its group): no global light, fog, exposure or post pass, so the rest of
// the garden and the three locked greenhouse levels keep their exact look. Techniques come from the concept (tapered root
// tubes, cupped petals, moss cushions, sculpted grass blades, leaf cards with back-light translucency, extruded flagstones,
// noise rocks) at the ring's scale, with per-device budgets: instancing everywhere, counts and shadow casting per quality
// tier (the game's QualityManager), wind in the vertex shader, no point lights (magic = emissive + additive light pools).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V3 = THREE.Vector3, C = h => new THREE.Color(h);
// budgets per quality tier (the game drops phones to mobile-low when they run slow; setTier follows it)
export const TIERS = {
  'desktop':     { grass: 15000, leaves: 1, shadows: 'full', petals: 'physical', motes: 160, shafts: true },
  'mobile-high': { grass: 6000,  leaves: .6, shadows: 'pods', petals: 'standard', motes: 90, shafts: false },
  'mobile-low':  { grass: 3000,  leaves: .35, shadows: 'none', petals: 'standard', motes: 50, shafts: false }
};

// ---------- noise + rng (the concept's) ----------
function rng(seed) { return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rnd = rng(11); const R = (a, b) => a + (b - a) * rnd(), lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function h2(x, y) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vn(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, o = 4) { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vn(x * f + i * 17.3, y * f - i * 9.1); n += a; f *= 2; a *= .5; } return s / n; }

// ---------- canvas textures ----------
function canvasTex(w, h, fn, srgb) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function makeTextures() {
  const grain = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { const v = R(60, 200) | 0; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, R(.5, 2.2), 0, 7); g.fill(); } });
  const barkPaint = (g, w, h) => { g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1100; i++) { const v = R(50, 215) | 0; g.fillStyle = `rgba(${v},${v},${v},${R(.25, .7)})`; const x = rnd() * w, y = rnd() * h, ww = R(2, 8), hh = R(30, 170); g.fillRect(x, y, ww, hh); g.fillRect(x - w, y, ww, hh); g.fillRect(x, y - h, ww, hh); } };
  const bark = canvasTex(256, 512, barkPaint, true), barkBump = canvasTex(256, 512, barkPaint);
  const leaf = canvasTex(64, 128, g => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(32, 127); g.bezierCurveTo(-4, 92, 2, 30, 32, 1); g.bezierCurveTo(62, 30, 68, 92, 32, 127); g.fill();
    const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(90,90,90,.55)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
    g.strokeStyle = 'rgba(150,150,150,.8)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(32, 126); g.lineTo(32, 12); g.stroke(); g.lineWidth = 1; for (let i = 0; i < 6; i++) { const y = 110 - i * 16; g.beginPath(); g.moveTo(32, y); g.lineTo(12, y - 14); g.moveTo(32, y); g.lineTo(52, y - 14); g.stroke(); } }, true);
  leaf.wrapS = leaf.wrapT = THREE.ClampToEdgeWrapping;
  const radial = canvasTex(128, 128, g => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const petalGlow = canvasTex(8, 128, g => { const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, '#888'); gr.addColorStop(.7, '#111'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 8, 128); }, true);
  return { grain, bark, barkBump, leaf, radial, petalGlow };
}

// ---------- shader patches: back-light translucency (concept) + wind ----------
function patch(m, { translucency = 0, wind = 0, lift = 0, U }) {
  m.onBeforeCompile = s => {
    s.uniforms.uSunView = U.sunView; s.uniforms.uSunCol = U.sunCol; s.uniforms.uTime = U.time; s.uniforms.uDay = U.day;
    if (wind) {
      s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
 vec2 wp = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
#else
 vec2 wp = vec2(0.0);
#endif
 float wk = ${wind.toFixed(3)} * position.y * position.y;
 transformed.x += sin(uTime * 1.7 + wp.x * 1.3 + wp.y * .7) * wk;
 transformed.z += cos(uTime * 1.3 + wp.y * 1.1) * wk * .6;`);
    }
    if (translucency || lift) s.fragmentShader = 'uniform vec3 uSunView;uniform vec3 uSunCol;uniform float uDay;\n' + s.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
 float bl = pow(max(dot(normalize(-vViewPosition), uSunView), 0.0), 3.0); totalEmissiveRadiance += diffuseColor.rgb * (uSunCol * bl * ${translucency.toFixed(2)} + ${lift.toFixed(2)} * uDay);`);
  };
  m.customProgramCacheKey = () => `ring-${translucency}-${wind}-${lift}`;
  return m;
}

// ---------- geometry (concept helpers) ----------
function taperTube(pts, r0, r1, o = {}) {
  const radial = o.radial || 8, seg = o.seg || 16, lump = o.lump ?? .12, pw = o.pow || 1, flare = o.flare || 0;
  const curve = new THREE.CatmullRomCurve3(pts), fr = curve.computeFrenetFrames(seg, false), len = curve.getLength(), pos = [], uv = [], idx = [], s0 = rnd() * 100;
  for (let i = 0; i <= seg; i++) { const t = i / seg, P = curve.getPointAt(t), N = fr.normals[i], B = fr.binormals[i]; let r = lerp(r0, r1, Math.pow(t, pw)); if (flare) r *= 1 + flare * Math.pow(1 - t, 5);
    for (let j = 0; j <= radial; j++) { const a = j / radial * Math.PI * 2, cx = Math.cos(a), sx = Math.sin(a), nz = 1 + lump * (vn(cx * 1.6 + s0, t * len * 2.4 + sx * 1.6) - .5) * 2;
      pos.push(P.x + (N.x * cx + B.x * sx) * r * nz, P.y + (N.y * cx + B.y * sx) * r * nz, P.z + (N.z * cx + B.z * sx) * r * nz); uv.push(j / radial, t * len * .7); } }
  for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function closedProfile(nv) { const a = []; for (let i = 0; i <= nv; i++) { const v = i / nv; a.push([.045 + .4 * Math.pow(Math.sin(Math.PI * Math.pow(v, .78)), .85) * (1 - .05 * v), v * 1.48, v]); } return a; }
function openProfile(nv, len) { const a = []; let r = .1, y = .02; for (let i = 0; i <= nv; i++) { const v = i / nv; a.push([r, y, v]); const ang = .4 + 1.85 * Math.pow(v, 1.35); r += Math.sin(ang) * len / nv; y += Math.cos(ang) * len / nv; } return a; }
function petals(open, n, len, width, cols, phase) {
  const nv = 14, nu = 6, pos = [], col = [], uv = [], idx = []; const prof = open ? openProfile(nv, len) : closedProfile(nv);
  for (let k = 0; k < n; k++) { const phi = phase + k * Math.PI * 2 / n, base = pos.length / 3, jit = R(-.06, .06);
    for (let i = 0; i <= nv; i++) { const [r, y, v] = prof[i], w = width * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.02 + .001)), .6) * (1 - .2 * v) + .015;
      const nx = i < nv ? prof[i + 1][1] - y : y - prof[i - 1][1], ny = -(i < nv ? prof[i + 1][0] - r : r - prof[i - 1][0]), nl = Math.hypot(nx, ny) || 1;
      for (let j = 0; j <= nu; j++) { const u = j / nu * 2 - 1, lat = u * w, cup = (1 - u * u) * w * (open ? .42 : .18); const rr = r + nx / nl * cup, yy = y + ny / nl * cup; const th = Math.max(-.7, Math.min(.7, lat / Math.max(rr, .06))) + jit * v;
        pos.push(rr * Math.cos(phi + th), yy, rr * Math.sin(phi + th)); const c = C(cols[0]).lerp(C(cols[1]), ss(0, .45, v)).lerp(C(cols[2]), ss(.5, 1, v) * (1 - .5 * u * u)); c.multiplyScalar(1 - .18 * Math.abs(u) + .06 * Math.sin(u * 9)); col.push(c.r, c.g, c.b); uv.push(j / nu, v); } }
    for (let i = 0; i < nv; i++) for (let j = 0; j < nu; j++) { const a = base + i * (nu + 1) + j, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function moss(rad, hy, detail = 3) {
  const g = new THREE.IcosahedronGeometry(rad, detail), p = g.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (fbm(x * 9 + 3, z * 9 + y * 5) - .5) * .35; p.setXYZ(i, x * k, Math.max(y * hy * k, -.02), z * k); const c = C('#4f6c26').lerp(C('#8a9a3e'), fbm(x * 14, z * 14) * .9); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}

// R159 (Jannik 14/10 'A 70% GO'): the concept's Sprouting Ring built new, not dressed over the old one. Jannik's concept
// measures at 70 % (K): the Sanctuary Oak in the middle, the stone path ring (RING), nine pods on PODR (one per character,
// the concept had eight), the double flagstone lanes, the lane out to the garden path with the vine arch, lantern stalks
// between the pods. It stands on the free east lawn (it does not fit at the old spot: the house is 4 m and the Perk Shrine
// 2.7 m from it). Everything is built in concept units inside one group scaled by K; heights, colliders and the
// interaction point are handed to the game in world units. The old Ring stays loaded and comes back on ?ring=classic.
const K = .7, RING = 3.4, PODR = 4.9, RT = 6.6, LANE_END = 9.4, HEDGE = 6.15, GATE = 1.05, ARCH_Z = HEDGE;   // R164: a hedge closes the Ring; the arch in it is the only way in
export const CONCEPT = { K, RING, PODR, RT, LANE_END };
const podTh = k => (20 + 40 * k) * Math.PI / 180;   // nine pods round the ring, the gap faces the lane (+z)
function laneX(z) { return .12 * Math.sin(z * .8); }
function pathMaskC(x, z) { const r = Math.hypot(x, z), ring = 1 - ss(.38, .62, Math.abs(r - RING)), lane = (1 - ss(.38, .62, Math.abs(x - laneX(z)))) * ss(RING - .1, RING + .3, z); return Math.max(ring, lane); }

// the lane from the arch out to the garden path, in world units, for the garden's vegetation mask (its stones and shrubs go)
export function laneRect(center, yaw) { const w = (x, z) => new V3(x * K, 0, z * K).applyAxisAngle(new V3(0, 1, 0), yaw).add(new V3(center.x, 0, center.z));
  const a = w(-GATE - .3, HEDGE - .2), b = w(GATE + .3, LANE_END + .3); return { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z), colliders: true }; }

// R169: Jannik's GLB plants (assets/garden/plants: bush_a-c, tree_a-c, fern_a-b; <Name>_LOD0/_LOD1, materials Bark/Leaves,
// COLOR_0.r = wind weight). Each plant is drawn instanced per (kind, LOD, material); every 0.25 s each placement takes LOD0 near
// the camera and LOD1 further away. Wind comes from the plant's own vertex weight (material.vertexColors stays off).
const PLANT_AMP = { tree: .14, bush: .05, fern: .05 };
// R190 (Jannik's v5 plants): LOD by the plant's own height h = max(height, 1.5 m): LOD1 from 4.5 h, LOD2 from 13 h, 5 % hysteresis,
// a 0.3 s dithered cross-fade between steps, no shadows from LOD2
const LOD_D1 = 4.5, LOD_D2 = 13, LOD_HYST = .05, LOD_FADE = .3;
const plantType = k => k.startsWith('tree') ? 'tree' : k.startsWith('bush') ? 'bush' : 'fern';
function preparePlants(gltfs, U) {
  const out = {};
  for (const [kind, gltf] of Object.entries(gltfs || {})) { try {
    const sc = gltf.scene; sc.updateMatrixWorld(true); const lod = [[], [], []], mats = new Set(); let box = new THREE.Box3();
    sc.traverse(o => { if (!o.isMesh) return; let L = -1; for (let q = o; q; q = q.parent) { const m = /_LOD([012])$/.exec(q.name); if (m) { L = +m[1]; break; } } if (L < 0) return;
      const g = o.geometry.clone().applyMatrix4(o.matrixWorld); if (L === 0) { g.computeBoundingBox(); box.union(g.boundingBox); } lod[L].push({ geometry: g, material: o.material }); mats.add(o.material); });
    if (!lod[0].length) continue; if (!lod[1].length) lod[1] = lod[0]; if (!lod[2].length) lod[2] = lod[1];   // R190: v5 files have LOD0/1/2; older two-step files reuse their far step
    const amp = PLANT_AMP[plantType(kind)];
    for (const m of mats) { m.vertexColors = false; const leaf = /leaves/i.test(m.name || '') || m.alphaTest > 0; m.onBeforeCompile = sh => { sh.uniforms.uTime = U.time;
      // R190 (v5 spec): the leaf cards are lit with the same normal on both sides (no faceDirection flip, else the backs go dark), and every
      // instance carries a fade (aFade) for the dithered LOD cross-fade: 1 = whole, 0..1 = fading in, -1..0 = fading out (complementary dither)
      sh.vertexShader = 'uniform float uTime;\nattribute vec3 color;\nvarying float vFade;\n#ifdef USE_INSTANCING\nattribute float aFade;\n#endif\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
 #ifdef USE_INSTANCING
 vec2 wp = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
 vFade = aFade;
 #else
 vec2 wp = vec2(0.0);
 vFade = 1.0;
 #endif
 float wk = color.r * ${amp.toFixed(3)};
 transformed.x += sin(uTime * 1.6 + wp.x * 1.3 + wp.y * .7 + position.y * .6) * wk;
 transformed.z += cos(uTime * 1.2 + wp.y * 1.1 + position.y * .4) * wk * .6;`);
      sh.fragmentShader = 'varying float vFade;\nfloat tgwBayer(vec2 p){ivec2 i=ivec2(mod(p,4.));int k=i.x+i.y*4;float m[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);return (m[k]+.5)/16.;}\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n if (vFade < .999) { float b = tgwBayer(gl_FragCoord.xy); if (vFade < 0. ? b < -vFade : b >= vFade) discard; }');
      if (leaf) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', '')); };
      m.customProgramCacheKey = () => `r190-plant-${amp}-${leaf ? 1 : 0}`; }
    const size = box.getSize(new V3()); out[kind] = { lod, h: size.y || 1, w: Math.max(size.x, size.z) || 1, type: plantType(kind) };
  } catch (e) { console.warn('[TGW] plant prepare failed', kind, e); } }
  return out;
}
class PlantField {
  constructor(g, P, tier, opt = {}) { this.opt = opt; this.g = g; this.P = P; this.tier = tier; this.items = []; this.ims = {}; this.root = new THREE.Group(); this.root.name = 'R158_PLANTS'; this.t = 1; this.cam = new V3(); }
  has(k) { return !!this.P[k]; } h(k) { return this.P[k].h; } w(k) { return this.P[k].w; }
  add(kind, x, y, z, ry, s, ref = null) { if (!this.P[kind]) return false; const h = Math.max(this.P[kind].h * s, 1.5); this.items.push({ kind, ref, p: new V3(x, y, z), m: new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), ry), new V3(s, s, s)), d1: LOD_D1 * h, d2: LOD_D2 * h, L: -1, from: -1, t: 1 }); return true; }
  build(parent) {
    const n = {}; for (const it of this.items) n[it.kind] = (n[it.kind] || 0) + 1; const desk = this.tier === 'desktop';
    // each instanced mesh gets its own light geometry wrapper (shared buffers) so its per-instance fade does not touch the other plant field
    for (const [kind, cnt] of Object.entries(n)) { const P = this.P[kind]; this.ims[kind] = P.lod.map((parts, L) => parts.map(pt => {
      const g = new THREE.BufferGeometry(); for (const [k, a] of Object.entries(pt.geometry.attributes)) g.setAttribute(k, a); g.setIndex(pt.geometry.index); g.boundingSphere = pt.geometry.boundingSphere; g.boundingBox = pt.geometry.boundingBox;
      const fade = new THREE.InstancedBufferAttribute(new Float32Array(cnt * 2).fill(1), 1); fade.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aFade', fade);
      const im = new THREE.InstancedMesh(g, pt.material, cnt * 2); im.count = 0; im.frustumCulled = false; im.receiveShadow = true; im.castShadow = desk && P.type !== 'fern' && L < 2 && !(this.opt.nearShadowOnly && L > 0); im.fade = fade; this.root.add(im); return im; })); }
    parent.add(this.root); this.refresh(0);
  }
  // LOD choice with hysteresis; a change starts a cross-fade (drawn in both steps for LOD_FADE seconds with complementary dither)
  pick(it, d) { const up = 1 + LOD_HYST, dn = 1 - LOD_HYST, L = it.L;
    if (L < 0) return d < it.d1 ? 0 : d < it.d2 ? 1 : 2;
    if (L === 0) return d > it.d2 * up ? 2 : d > it.d1 * up ? 1 : 0;
    if (L === 1) return d < it.d1 * dn ? 0 : d > it.d2 * up ? 2 : 1;
    return d < it.d1 * dn ? 0 : d < it.d2 * dn ? 1 : 2; }
  refresh(dt, decide = true) {
    const cam = this.g.camera; if (cam) cam.getWorldPosition(this.cam); const c = {}; let fading = false;
    for (const kind of Object.keys(this.ims)) c[kind] = [0, 0, 0];
    const put = (it, L, f) => { const k = c[it.kind][L]++; for (const im of this.ims[it.kind][L]) { im.setMatrixAt(k, it.m); im.fade.setX(k, f); } };
    for (const it of this.items) { if (it.ref?.hidden) { it.L = -1; continue; }
      if (decide) { const L = this.pick(it, it.p.distanceTo(this.cam)); if (it.L < 0) { it.L = L; it.t = 1; } else if (L !== it.L) { it.from = it.L; it.L = L; it.t = 0; } }
      if (it.t < 1) { it.t = Math.min(1, it.t + dt / LOD_FADE); }
      if (it.t < 1 && it.from >= 0) { fading = true; put(it, it.L, Math.max(it.t, 0)); put(it, it.from, -Math.max(it.t, .001)); } else put(it, it.L, 1); }
    for (const [kind, arr] of Object.entries(this.ims)) arr.forEach((parts, L) => parts.forEach(im => { im.count = c[kind][L]; im.instanceMatrix.needsUpdate = true; im.fade.needsUpdate = true; }));
    this.fading = fading;
  }
  // decisions every 0.25 s as before; while a cross-fade runs the instance data is rewritten every frame until it ends
  update(dt) { this.t += dt; if (this.t >= .25) { const d = this.t; this.t = 0; this.refresh(Math.min(d, .25), true); } else if (this.fading) this.refresh(dt, false); }
  stats() { let n = 0; const lod = [0, 0, 0]; for (const arr of Object.values(this.ims)) arr.forEach((parts, L) => { n += parts[0]?.count || 0; lod[L] += parts[0]?.count || 0; }); return { placed: this.items.length, drawn: n, lod }; }
}

// R165: the concept's bloom (strength .32, radius .45, threshold 2.1: only the glow blooms) + a soft vignette, desktop only, garden only.
// Game.frame() asks g.postFx.render() first and draws plainly when it returns false.
class RingPost {
  constructor(g, M) {
    this.g = g; const r = g.renderer, sz = r.getDrawingBufferSize(new THREE.Vector2()); this.w = sz.x; this.h = sz.y; this.on = true;
    this.rt = new THREE.WebGLRenderTarget(sz.x, sz.y, { type: THREE.HalfFloatType, samples: 4 });
    const c = this.c = new M.EffectComposer(r, this.rt); c.setPixelRatio(1); c.setSize(sz.x, sz.y);
    c.addPass(new M.RenderPass(g.scene, g.camera));
    // R187 (Jannik 16/10: dotted dark lines round the light shafts): the shaft and stone-column shaders took pow() of 1-uv.y, which a
    // pixel just outside a triangle edge extrapolates past 1 (NaN); they now clamp, and the guard fills a bad pixel from its neighbours, not black.
    // R172 (Jannik: black blocks by the Ring in Chrome): one invalid pixel (NaN/Inf from any shader on some GPUs) is smeared by the
    // bloom's blur chain into large black rectangles. This pass turns such a pixel into black and caps over-bright HDR values before
    // the bloom sees them, so the worst case is one dark pixel instead of a block.
    c.addPass(new M.ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform sampler2D tDiffuse;varying vec2 vUv;bool bad(vec4 c){return any(isnan(c))||any(isinf(c))||!(c.r+c.g+c.b+c.a<1e4);}void main(){vec4 c=texture2D(tDiffuse,vUv);if(bad(c)){vec2 px=1./vec2(textureSize(tDiffuse,0));vec4 s=vec4(0.);float n=0.;for(int i=0;i<4;i++){vec2 o=i==0?vec2(px.x,0.):i==1?vec2(-px.x,0.):i==2?vec2(0.,px.y):vec2(0.,-px.y);vec4 q=texture2D(tDiffuse,vUv+o*1.5);if(!bad(q)){s+=q;n+=1.;}}c=n>0.?s/n:vec4(0.,0.,0.,1.);}gl_FragColor=max(min(c,vec4(64.)),vec4(0.));}' }));
    this.bloom = new M.UnrealBloomPass(new THREE.Vector2(sz.x / 2, sz.y / 2), .32, .45, 2.1); c.addPass(this.bloom);
    c.addPass(new M.ShaderPass({ uniforms: { tDiffuse: { value: null }, uDark: { value: .32 } }, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform sampler2D tDiffuse;uniform float uDark;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);vec2 d=(vUv-.5)*vec2(1.25,1.);float v=smoothstep(.82,.28,length(d));c.rgb*=mix(1.-uDark,1.,v);gl_FragColor=c;}' }));
    c.addPass(new M.OutputPass());
  }
  render() {
    if (!this.on || (this.g.world?.space !== 'garden' && !(this.world && this.g.world?.space === 'world'))) return false;   // R179: the premium world gets it too
    const sz = this.g.renderer.getDrawingBufferSize(new THREE.Vector2()); if (sz.x !== this.w || sz.y !== this.h) { this.w = sz.x; this.h = sz.y; this.c.setSize(sz.x, sz.y); }
    this.c.render(); return true;
  }
  dispose() { this.on = false; this.c.dispose?.(); this.rt.dispose(); }
}

// R166 (phones): a leaf as a leaf-shaped polygon, opaque (no alpha test). iPhone GPUs pay heavily for cut-out cards
// (every discarded pixel defeats their hidden-surface removal); a few more triangles cost far less. Desktop keeps the card.
const PHONE = id => id !== 'desktop';
function leafGeometry(phone) {
  if (!phone) return new THREE.PlaneGeometry(1, 1).translate(0, .5, 0);
  const o = [[0, 0], [.3, .2], [.38, .5], [.24, .8], [0, 1], [-.24, .8], [-.38, .5], [-.3, .2]], pos = [0, .45, 0], uv = [.5, .45], idx = [];   // 8 triangles
  for (const [x, y] of o) { pos.push(x, y, 0); uv.push(x + .5, y); }
  for (let i = 1; i <= o.length; i++) idx.push(0, i, i % o.length + 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function leafMaterial(T, U, tier) {
  const phone = PHONE(tier);
  return patch(new THREE.MeshStandardMaterial({ map: T.leaf, alphaTest: phone ? 0 : .5, side: THREE.DoubleSide, roughness: .6 }), { translucency: phone ? 0 : .7, wind: .12, lift: .12, U });
}

export class RingSanctuary {
  // spot: the CharacterSwapSpot; center: world {x, z} of the new Ring; facing: world yaw so the lane (+z) points at the garden path
  constructor(spot, ids, center, yaw, gltfPlants) {
    this.s = spot; this.g = spot.g; this.ids = ids; rnd = rng(11); this.t0 = performance.now(); this.center = center;
    this.tierId = TIERS[this.g.quality?.id] ? this.g.quality.id : (this.g.input?.isTouch ? 'mobile-high' : 'desktop');
    this.T = makeTextures(); this.U = { sunView: { value: new V3(0, 1, 0) }, sunCol: { value: C('#ffe3b8').multiplyScalar(.9) }, time: { value: 0 }, day: { value: 1 } }; this.sunBase = 2.7; this.sunCol0 = this.U.sunCol.value.clone();
    this.root = new THREE.Group(); this.root.name = 'R157_RING_SANCTUARY'; this.root.position.set(center.x, 0, center.z); this.root.rotation.y = yaw; this.root.scale.setScalar(K);
    this.g.world.privateRoot.add(this.root); this.root.updateMatrixWorld(true); this.inv = this.root.matrixWorld.clone().invert();
    this.pods = new Map(); this.cast = []; this.glows = []; this.seams = []; this.cols = []; this.leaves = []; this.rocks = []; this.shrooms = []; this.hedgeStems = []; this.lights = [];
    this.clearR = RT * K; this.stoneC = new V3(laneX(RING), 0, RING);
    try { const P = preparePlants(gltfPlants, this.U); if (Object.keys(P).length) this.plants = new PlantField(this.g, P, this.tierId); } catch (e) { console.warn('[TGW] plants unavailable; code plants kept', e); }
    this.mats(); this.terrain(); this.flagstones(); this.oak(); this.podsBuild(); this.lanterns(); this.arch(); this.hedge(); this.understory(); this.instanced(); this.grass(); this.atmosphere(); this.stone(); for (const g of this.hedgeStems) this.add(g, this.m.bark, true, true); this.hedgeStems = []; this.batch();
    this.solid();
    this.lane = laneRect(center, yaw);
    try { this.env = new RingEnvironment(this); } catch (e) { console.warn('[TGW] ring environment failed; garden kept', e); try { this.env?.restore(); } catch {} this.g.world.privateRoot.getObjectByName('R158_RING_ENVIRONMENT')?.removeFromParent(); this.env = null; }
    try { this.plants?.build(this.g.world.privateRoot); } catch (e) { console.warn('[TGW] plant field failed', e); this.plants?.root.removeFromParent(); }
    try { if (this.plants) this.wenv = new WorldEnvironment(this); } catch (e) { console.warn('[TGW] world premium look failed; world kept', e); try { this.wenv?.restore(); } catch {} this.wenv = null; }   // R179
    try { this.warmth(); } catch (e) { console.warn('[TGW] ring warmth failed', e); }
    this.setTier(this.tierId); this.buildMs = performance.now() - this.t0;
    this.warm();
  }
  // ---------- concept-space helpers ----------
  Hc(x, z) { const r = Math.hypot(x, z), fade = 1 - ss(RT - 1.4, RT - .1, r); let h = .38 * Math.exp(-(r * r) / (1.7 * 1.7));
    h += ((fbm(x * .35, z * .35) - .5) * .32 + (fbm(x * 1.4, z * 1.4) - .5) * .05) * fade;
    for (let k = 0; k < 9; k++) { const th = podTh(k), d = Math.hypot(x - Math.sin(th) * PODR, z - Math.cos(th) * PODR); h += .12 * (1 - ss(.6, 1.05, d)); }
    const ds = Math.hypot(x - this.stoneC.x, z - this.stoneC.z); if (ds < .72) h += .19 * (1 - ss(.55, .72, ds));   // the stone's top is walkable (as before)
    return r >= RT ? 0 : h * fade; }
  // world-space height for the game (W.gardenHeight); 0 outside the Ring's ground
  height(x, z) { const v = new V3(x, 0, z).applyMatrix4(this.inv); return Math.hypot(v.x, v.z) >= RT ? 0 : this.Hc(v.x, v.z) * K; }
  toWorld(x, y, z) { return new V3(x, y, z).applyMatrix4(this.root.matrixWorld); }
  mats() {
    const T = this.T, U = this.U, phys = TIERS[this.tierId].petals === 'physical';
    this.m = {
      bark: new THREE.MeshStandardMaterial({ color: '#7a5a40', map: T.bark, bumpMap: T.barkBump, bumpScale: 3, roughness: .92 }),
      root: new THREE.MeshStandardMaterial({ color: '#c4ae8c', map: T.bark, bumpMap: T.barkBump, bumpScale: 2, roughness: .8 }),
      husk: new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .9, map: T.bark, bumpMap: T.barkBump, bumpScale: 1.5 }),
      petal: patch(phys ? new THREE.MeshPhysicalMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .55, sheen: .6, sheenColor: C('#ffd9a8'), emissive: C('#ff8a30'), emissiveMap: T.petalGlow, emissiveIntensity: .9, bumpMap: T.grain, bumpScale: .6 })
        : new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .55, emissive: C('#ff8a30'), emissiveMap: T.petalGlow, emissiveIntensity: .95 }), { translucency: PHONE(this.tierId) ? 0 : .8, U }),
      ember: new THREE.MeshStandardMaterial({ color: '#5a2a10', emissive: C('#ff9a30'), emissiveIntensity: 3 }),
      moss: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .97, bumpMap: T.grain, bumpScale: 3 }),
      stone: new THREE.MeshStandardMaterial({ color: '#b0a790', roughness: .86, bumpMap: T.grain, bumpScale: 2 }),
      rock: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, bumpMap: T.grain, bumpScale: 2.5 }),
      leaf: leafMaterial(T, U, this.tierId),
      grass: patch(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .75 }), { translucency: PHONE(this.tierId) ? 0 : .55, wind: .07, lift: .03, U }),
      lantern: new THREE.MeshStandardMaterial({ color: '#ffcf8a', emissive: C('#f2a93b'), emissiveIntensity: 1.5, roughness: .4 }),
      cap: new THREE.MeshStandardMaterial({ color: '#c8603a', roughness: .5 }), stem: new THREE.MeshStandardMaterial({ color: '#efe3c8', roughness: .7 })
    };
  }
  add(geo, mat, cast = true, recv = true, parent = this.root, pod = false) { const o = new THREE.Mesh(geo, mat); o.castShadow = cast; o.receiveShadow = recv; o.userData.pod = pod; if (cast) this.cast.push(o); parent.add(o); return o; }
  addLeaf(p, n, sx, sy, c, roll) { const Z = new V3(0, 0, 1); n = n.clone().normalize(); const q = new THREE.Quaternion().setFromUnitVectors(Z, n); q.premultiply(new THREE.Quaternion().setFromAxisAngle(n, roll ?? R(0, 6.28))); this.leaves.push({ p: p.clone(), q, sx, sy, c }); }
  cluster(cx, cy, cz, rad, n, base, vr, size, flat = .75) { for (let i = 0; i < n; i++) { const d = new V3(R(-1, 1), R(-1, 1) * flat, R(-1, 1)); if (d.length() > 1) { i--; continue; } const p = new V3(cx, cy, cz).addScaledVector(d, rad), nrm = d.clone().normalize().add(new V3(R(-.6, .6), R(-.3, .6), R(-.6, .6)));
    const c = C(base).lerp(C(vr), rnd() * rnd()); c.multiplyScalar(lerp(.6, 1.2, d.length() * (.5 + .5 * Math.max(0, d.y)))); const s = size * R(.75, 1.25); this.addLeaf(p, nrm, s * .7, s, c); } }
  rock(x, z, s, sy = .6, sink = .35) { this.rocks.push([x, z, s, sy, sink]); }
  fern(x, z, s) { if (this.plants) { const w = this.toWorld(x, this.Hc(x, z), z), k = rnd() < .5 ? 'fern_a' : 'fern_b'; if (this.plants.add(k, w.x, w.y, w.z, R(0, 6.28), s * K * 1.05)) return; } const y = this.Hc(x, z), n = 7 + (rnd() * 3 | 0); for (let f = 0; f < n; f++) { const a = f / n * 6.28 + R(-.3, .3), dir = new V3(Math.cos(a), 0, Math.sin(a)), L = R(.5, .75) * s, up = R(.35, .55) * s, side = new V3(-dir.z, 0, dir.x);
    for (let i = 1; i < 12; i++) { const t = i / 12, P = new V3(x, y, z).addScaledVector(dir, L * t).add(new V3(0, up * Math.sin(Math.PI * t * .85), 0));
      for (const sd of [-1, 1]) { const pp = P.clone().addScaledVector(side, sd * .02 * s), n2 = new V3(0, 1, 0).addScaledVector(dir, -.4 + t * .9).addScaledVector(side, sd * .3), lf = (1 - t * .65) * s; this.addLeaf(pp, n2, .05 * lf, .16 * lf, C('#456a28').lerp(C('#8aa448'), t * .6 + rnd() * .2), Math.atan2(sd, 1) + sd * 1.2); } } } }
  toad(x, z) { for (let i = 0; i < 3 + (rnd() * 3 | 0); i++) this.shrooms.push([x + R(-.25, .25), z + R(-.25, .25), R(.12, .26)]); }
  collider(x, z, r, kind) { const v = this.toWorld(x, 0, z), c = { x: v.x, z: v.z, r: r * K, kind, traversal: 'blocked', space: 'garden' }; this.cols.push(c); }

  // ---------- ground (the concept's palette; melts into the graded garden ground at the edge) ----------
  terrain() {
    const rings = 52, segs = 150, pos = [], col = [], idx = [], W = this.g.world, gc = new THREE.Color();
    const soil = C('#4a3526'), grass = C('#4c6629'), moss = C('#3d5522'), joint = C('#4a5a2a'), dust = C('#8b7858');
    for (let i = 0; i <= rings; i++) { const r = Math.pow(i / rings, 1.15) * RT;
      for (let j = 0; j <= segs; j++) { const a = j / segs * Math.PI * 2, x = Math.sin(a) * r, z = Math.cos(a) * r, edge = ss(RT - 1.6, RT, r);
        const gd = ss(.4, .62, fbm(x * .55 + 3, z * .55)), pm = pathMaskC(x, z);
        const c = soil.clone().lerp(grass, gd * .8 + ss(4.5, 6.2, r) * .3); c.lerp(moss, Math.exp(-(r * r) / 4) * .8); c.lerp(joint.clone().lerp(dust, fbm(x * 3, z * 3) * .8), pm * .95);
        let ao = 1 - .4 * Math.exp(-(r * r) / 1.6); for (let k = 0; k < 9; k++) { const th = podTh(k), d = Math.hypot(x - Math.sin(th) * PODR, z - Math.cos(th) * PODR); ao *= 1 - .45 * Math.exp(-(d * d) / .45); }
        c.multiplyScalar(ao * (.85 + .3 * fbm(x * 1.7, z * 1.7)));
        if (edge > 0) { const w = this.toWorld(x, 0, z); W.groundColorAt?.(w.x, w.z, gc); gradeGround(gc, w.x, w.z); c.lerp(gc, edge); }
        pos.push(x, this.Hc(x, z) + .012, z); col.push(c.r, c.g, c.b); } }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) { const a = i * (segs + 1) + j, b = a + segs + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    this.T.grain.repeat.set(30, 30);
    this.ground = this.add(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .97, bumpMap: this.T.grain, bumpScale: 1.2, polygonOffset: true, polygonOffsetFactor: -1 }), false, true); this.ground.name = 'R159_GROUND';
  }
  // ---------- the double flagstone ring and the lane out to the garden path ----------
  flagstones() {
    const variants = []; for (let v = 0; v < 6; v++) { const s = new THREE.Shape(), n = 7; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + R(-.2, .2), r = R(.72, 1); i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      const g = new THREE.ExtrudeGeometry(s, { depth: .25, bevelEnabled: true, bevelThickness: .2, bevelSize: .17, bevelSegments: 2, curveSegments: 1 }); g.rotateX(-Math.PI / 2);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > .2) p.setY(i, p.getY(i) + (vn(p.getX(i) * 2 + v * 7, p.getZ(i) * 2) - .5) * .14); g.computeVertexNormals(); variants.push({ g, list: [] }); }
    this.flagVariants = variants; const put = (x, z, s) => variants[(rnd() * variants.length) | 0].list.push([x, z, s]);
    for (const lane of [-.25, .25]) { const n = 46; for (let i = 0; i < n; i++) { if (rnd() < .07) continue; const a = (i + (lane > 0 ? .5 : 0)) / n * Math.PI * 2 + R(-.02, .02), r = RING + lane + R(-.04, .04); const x = Math.sin(a) * r, z = Math.cos(a) * r; if (Math.hypot(x - this.stoneC.x, z - this.stoneC.z) < .8) continue; put(x, z, R(.17, .22)); } }
    for (let z = RING + .55; z < LANE_END; z += .43) { const x = laneX(z); if (rnd() < .5) { put(x - .2 + R(-.03, .03), z, R(.16, .2)); put(x + .2, z + R(-.08, .08), R(.16, .2)); } else put(x + R(-.08, .08), z, R(.22, .27)); }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (const v of variants) { if (!v.list.length) continue; const im = new THREE.InstancedMesh(v.g, this.m.stone, v.list.length);
      v.list.forEach(([x, z, s], i) => { q.setFromEuler(new THREE.Euler(R(-.04, .04), R(0, 6.28), R(-.04, .04))); m4.compose(new V3(x, this.Hc(x, z) - .045, z), q, new V3(s, .19, s)); im.setMatrixAt(i, m4); im.setColorAt(i, C('#ffffff').multiplyScalar(R(.78, 1.08)).lerp(C('#c9c09a'), rnd() * .4)); });
      im.castShadow = false; im.receiveShadow = true; this.root.add(im); }
  }
  // ---------- the Sanctuary Oak (the concept's, in the middle) ----------
  oak() {
    const h0 = this.Hc(0, 0), T = (pts, r0, r1, o) => this.add(taperTube(pts, r0, r1, o), this.m.bark, true, true);
    T([new V3(0, h0 - .4, 0), new V3(.08, h0 + .9, .04), new V3(-.06, h0 + 1.8, .1), new V3(.12, h0 + 2.6, 0), new V3(.05, h0 + 3.1, -.05)], .5, .24, { radial: 16, seg: 30, lump: .16, flare: .9 });
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28 + R(-.25, .25), L = R(1.4, 2.1), c = Math.cos(a), s = Math.sin(a), pt = (d, y) => new V3(c * d, y, s * d);
      T([pt(.15, h0 + .7), pt(.55, h0 + .18), pt(L * .6, this.Hc(c * L * .6, s * L * .6) + .04), pt(L, this.Hc(c * L, s * L) - .12)], .26, .03, { radial: 9, seg: 18, lump: .18, pow: .7 }); }
    const ends = []; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + R(-.3, .3), L = R(2, 2.8), c = Math.cos(a), s = Math.sin(a), y0 = h0 + R(2.2, 2.9), e = new V3(c * L, h0 + R(3.6, 4.4), s * L); ends.push(e);
      T([new V3(c * .1, y0, s * .1), new V3(c * L * .4, y0 + .6, s * L * .4), new V3(c * L * .75, e.y - .1, s * L * .75), e], .17, .04, { radial: 8, seg: 16, lump: .15 }); }
    ends.forEach(e => this.cluster(e.x, e.y + .2, e.z, 1.35, 820, '#3f5a2a', '#7f9a3e', .28, .6));
    for (let i = 0; i < 5; i++) { const a = R(0, 6.28), d = R(.5, 1.6); this.cluster(Math.cos(a) * d, h0 + R(4.3, 4.9), Math.sin(a) * d, 1.2, 650, '#3a5426', '#86a042', .28, .55); }
    for (let i = 0; i < 7; i++) this.rock(Math.cos(i * .9) * R(1.2, 1.8), Math.sin(i * .9) * R(1.2, 1.8), R(.12, .22));
    this.collider(0, 0, .62, 'ring-oak');
  }
  // ---------- nine pods (open = petals, cushion, the character's sprout; locked = husk, ember seams, spiral roots, its padlock) ----------
  podsBuild() {
    const M = this.s.model, prof = closedProfile(40);
    this.ids.forEach((id, k) => { const th = podTh(k), x = Math.sin(th) * PODR, z = Math.cos(th) * PODR;
      const g = new THREE.Group(); g.name = `R159_POD_${id}`; g.position.set(x, this.Hc(x, z) - .02, z); g.rotation.y = Math.atan2(-x, -z); this.root.add(g);
      this.add(moss(.62, .22, 3), this.m.moss, true, true, g, true).position.y = -.02;
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + R(-.3, .3), c = Math.cos(a), s = Math.sin(a), L = R(.8, 1.15); this.add(taperTube([new V3(c * .28, .28, s * .28), new V3(c * .55, .1, s * .55), new V3(c * L, -.06, s * L)], .07, .015, { radial: 7, seg: 12, lump: .2 }), this.m.root, true, true, g, true); }
      const open = new THREE.Group(); g.add(open);
      this.add(petals(true, 6, 1.0, .36, ['#7a3220', '#c8603a', '#f2dcbc'], R(0, 1)), this.m.petal, true, true, open, true);
      this.add(moss(.36, .42, 2), this.m.moss, false, true, open, true).position.y = .1;
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.T.radial, color: '#ff9a3c', transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
      pool.position.set(0, .06, .5); pool.renderOrder = 3; open.add(pool); this.glows.push(pool);
      const closed = new THREE.Group(); g.add(closed);
      this.add(petals(false, 6, 0, .3, ['#3f3a2e', '#857d68', '#a39a84'], Math.PI / 2 + Math.PI / 6), this.m.husk, true, true, closed, true);
      for (const sa of [Math.PI / 2, Math.PI / 2 + Math.PI / 3 * 2]) { const pts = prof.filter((q, i) => i > 3 && i < 36).map(([r, y]) => new V3((r + .01) * Math.cos(sa), y, (r + .01) * Math.sin(sa))); this.seams.push(this.add(taperTube(pts, .011, .006, { radial: 6, seg: 40, lump: .3 }), this.m.ember, false, false, closed, true)); }
      for (const a0 of [R(0, 1), R(3, 4)]) { const pts = [new V3(.75 * Math.cos(a0 - .6), -.12, .75 * Math.sin(a0 - .6))]; for (let i = 0; i <= 24; i++) { const t = i / 24, v = .04 + t * .72, ix = Math.round(v * 40), r = prof[ix][0] + .035, a = a0 + t * Math.PI * 2 * 1.35; pts.push(new V3(r * Math.cos(a), prof[ix][1], r * Math.sin(a))); }
        this.add(taperTube(pts, .055, .014, { radial: 7, seg: 60, lump: .25 }), this.m.root, true, true, closed, true); }
      // the character's own sprout (a copy of the Ring model's) lives in the open pod; its padlock sits on the ring path side
      let sprout = null, lock = null; const src = M?.getObjectByName(`Sprout_${id}`), lk = M?.getObjectByName(`Lock_${id}`);
      if (src) { sprout = src.clone(true); sprout.visible = true; sprout.position.set(0, .2, .02); sprout.rotation.set(0, 0, 0); sprout.scale.setScalar(1.1 / K); open.add(sprout); }
      if (lk) { lock = lk.clone(true); lock.visible = true; lock.position.set(0, .12, .72); lock.rotation.set(0, 0, 0); lock.scale.setScalar(1 / K); g.add(lock); }
      for (let i = 0; i < 5; i++) { const a = R(0, 6.28), d = R(.75, 1.05); this.rock(x + Math.cos(a) * d, z + Math.sin(a) * d, R(.08, .17)); }
      this.collider(x, z, .58, 'ring-pod');
      this.pods.set(id, { g, open, closed, sprout, lock, sway: sprout?.getObjectByName(`Sprout_${id}_Sway`), k: 0, target: 0, base: { id, x, z }, ph: k * .9 }); });
  }
  // ---------- R165: the Ring's own warm light. The stone glows (a gold column and a pool of light, stronger while a seed waits);
  // on desktop also real warm lights at the stone and four lanterns, and the concept's bloom + a soft vignette (garden only) ----------
  warmth() {
    const sc = this.stoneC, sy = this.Hc(sc.x, sc.z), desk = this.tierId === 'desktop';
    this.colMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uK: { value: .3 }, uCol: { value: C('#ffc85a') }, uT: { value: 0 } },
      vertexShader: 'varying vec2 vU;varying float vF;void main(){vU=uv;vec3 n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vF=abs(dot(n,normalize(-mv.xyz)));gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform float uK;uniform vec3 uCol;uniform float uT;varying vec2 vU;varying float vF;void main(){float y=clamp(vU.y,0.,1.);float a=uK*pow(1.-y,1.6)*smoothstep(0.,.08,y)*pow(clamp(vF,0.,1.),1.4)*(.82+.18*sin(uT*3.+vU.y*12.));gl_FragColor=vec4(uCol*a,1.);}' });
    this.column = new THREE.Mesh(new THREE.CylinderGeometry(.5, .66, 3.6, 28, 1, true), this.colMat); this.column.position.set(sc.x, sy + 1.6, sc.z); this.column.renderOrder = 6; this.root.add(this.column);
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.T.radial, color: '#ffbf55', transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    this.halo.position.set(sc.x, sy + .03, sc.z); this.halo.renderOrder = 4; this.root.add(this.halo);
    if (!desk) return;
    const L = (col, i, pos, dist) => { const l = new THREE.PointLight(col, i, dist, 1.6); l.position.copy(pos); l.userData.base = i; this.root.add(l); this.lights.push(l); return l; };
    this.stoneLight = L('#ffc46a', 7, new V3(sc.x, sy + 1.1, sc.z), 5.5);
    (this.bulbs || []).filter((b, i) => i % 2 === 1).forEach(b => L('#ffad55', 4, b, 4.5));
    Promise.all(['EffectComposer', 'RenderPass', 'UnrealBloomPass', 'OutputPass', 'ShaderPass'].map(n => import(`three/addons/postprocessing/${n}.js`)))
      .then(mods => { if (!this.root.parent) return; const m = Object.assign({}, ...mods); this.post = new RingPost(this.g, m); this.post.world = !!this.wenv; this.g.postFx = this.post; this.warm(); })
      .catch(e => console.warn('[TGW] ring bloom unavailable; plain render kept', e));
  }
  // R167: the 'hitch the first time you come near the Ring' was the GPU compiling the new shaders on first sight; compile them all now
  warm() { try { const r = this.g.renderer, p = r.compileAsync ? r.compileAsync(this.g.scene, this.g.camera) : (r.compile(this.g.scene, this.g.camera), null); p?.catch?.(() => {}); } catch {} }
  glowUpdate(t, dt) {
    if (!this.colMat) return; const calling = !!this.g.specialSeeds?.inBag?.().length; this.callK = (this.callK || 0) + ((calling ? 1 : 0) - (this.callK || 0)) * Math.min(1, dt * 2);
    const c = this.callK, br = .5 + .5 * Math.sin(t * 1.7), day = this.U.day.value; this.colMat.uniforms.uT.value = t; this.colMat.uniforms.uK.value = .22 + .12 * br + .45 * c;
    this.halo.material.opacity = .38 + .14 * br + .3 * c; this.halo.scale.setScalar(1 + .25 * c);
    if (this.stoneLight) this.stoneLight.intensity = this.stoneLight.userData.base * (.8 + .25 * br + 1.2 * c);
    for (const l of this.lights) if (l !== this.stoneLight) l.intensity = l.userData.base * (.75 + .5 * (1 - day));   // lanterns warm the day, more at dusk
    if (this.post) this.post.on = this.tierId === 'desktop';
  }
  // R166 (phones only): the shadow map is redrawn every 2nd (mobile-high) or 3rd (mobile-low) frame instead of every frame (the
  // garden stands still; only the player and creatures move), and the render resolution follows the frame rate (down to 0.85,
  // back up to the tier's own when there is headroom). Both are handed back when leaving the garden or the premium Ring.
  phoneBudget(dt) {
    const r = this.g.renderer, phone = PHONE(this.tierId); if (!phone) { this.leaveGarden(); return; }
    const every = this.tierId === 'mobile-low' ? 3 : 2; this.sf = ((this.sf || 0) + 1) % every; r.shadowMap.autoUpdate = false; if (this.sf === 0) r.shadowMap.needsUpdate = true; this.shadowHeld = true;
    this.fpsT = (this.fpsT || 0) + dt; this.fpsN = (this.fpsN || 0) + 1; if (this.fpsT < 1.5) return;
    const fps = this.fpsN / this.fpsT; this.fpsT = 0; this.fpsN = 0; const top = Math.min(devicePixelRatio || 1, { 'mobile-high': 1.5, 'mobile-low': 1.15 }[this.tierId] || 1.5);
    this.dpr ??= r.getPixelRatio(); const was = this.dpr;
    if (fps < 45) this.dpr = Math.max(.85, this.dpr - .1); else if (fps > 56) this.dpr = Math.min(top, this.dpr + .05);
    if (Math.abs(this.dpr - r.getPixelRatio()) > .001) { r.setPixelRatio(this.dpr); const { w, h } = this.g.viewSize?.() || { w: innerWidth, h: innerHeight }; r.setSize(w, h, false); }
    if (this.dpr !== was) this.dprMoved = true;
  }
  leaveGarden() {
    const r = this.g.renderer; if (this.shadowHeld) { r.shadowMap.autoUpdate = true; this.shadowHeld = false; }
    if (this.dprMoved) { this.dprMoved = false; this.dpr = null; try { this.g.resize?.(); } catch {} }
  }
  setOpen(openSet) { for (const [id, P] of this.pods) { const o = openSet.has(id) ? 1 : 0; P.target = o; if (!P.anim) P.k = o; this.applyPod(P); } }
  applyPod(P) { const e = P.k * P.k * (3 - 2 * P.k); P.open.visible = e > .02; P.open.scale.setScalar(Math.max(.02, e)); P.closed.visible = e < .98; P.closed.scale.set(1 - e * .6, 1 - e, 1 - e * .6);
    if (P.sprout) P.sprout.scale.setScalar(Math.max(.01, ss(.5, 1, e)) * 1.1 / K / Math.max(.02, e)); if (P.lock) P.lock.visible = e < .5; }
  // ---------- lantern stalks between the pods (emissive bulbs + halos; no lights) ----------
  lanterns() {
    for (let k = 1; k < 9; k++) { const th = k * 40 * Math.PI / 180, r = 4.25, x = Math.sin(th) * r, z = Math.cos(th) * r, y = this.Hc(x, z), ix = -Math.sin(th), iz = -Math.cos(th), top = new V3(x + ix * .32, y + 1.15, z + iz * .32);
      this.add(taperTube([new V3(x, y - .1, z), new V3(x + ix * .02, y + .6, z + iz * .02), new V3(x + ix * .08, y + 1.08, z + iz * .08), new V3(x + ix * .25, y + 1.25, z + iz * .25), top], .05, .014, { radial: 7, seg: 22, lump: .15, flare: .8 }), this.m.bark, true, true);
      const bulb = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.05, .02], [.075, .08], [.06, .14], [.025, .18], [0, .19]].map(v => new THREE.Vector2(v[0], v[1])), 14), this.m.lantern); bulb.position.copy(top).add(new V3(0, -.26, 0)); this.root.add(bulb); (this.bulbs ||= []).push(bulb.position.clone());
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.T.radial, color: '#ffb35a', transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(1.1); halo.position.copy(bulb.position).add(new V3(0, .09, 0)); halo.renderOrder = 6; this.root.add(halo); this.glows.push(halo);
      this.cluster(x, y + .12, z, .3, 60, '#41602a', '#7f9a3e', .14, .5); this.rock(x + R(-.2, .2), z + R(-.2, .2), R(.08, .12)); this.collider(x, z, .14, 'ring-lantern'); }
  }
  // ---------- the vine arch over the lane ----------
  arch() {
    const z0 = ARCH_Z, h = this.Hc(0, z0);
    for (const s of [-1, 1]) { const pts = [new V3(s * GATE, h - .25, z0), new V3(s * (GATE + .05), h + .85, z0), new V3(s * (GATE - .12), h + 1.7, z0 + .05), new V3(s * .45, h + 2.2, z0), new V3(s * .02, h + 2.3, z0)];
      this.add(taperTube(pts, .13, .07, { radial: 10, seg: 30, lump: .2, flare: 1.2 }), this.m.bark, true, true);
      const cur = new THREE.CatmullRomCurve3(pts), vine = []; for (let i = 0; i <= 40; i++) { const t = i / 40, P = cur.getPointAt(t), a = t * 18 * s; vine.push(P.clone().add(new V3(Math.cos(a) * .12, Math.sin(a) * .1, Math.sin(a) * .12))); }
      this.add(taperTube(vine, .03, .015, { radial: 6, seg: 80, lump: .2 }), this.m.bark, false, true);
      for (let i = 0; i < 70; i++) { const t = R(.15, 1), P = cur.getPointAt(t); this.addLeaf(P.clone().add(new V3(R(-.15, .15), R(-.1, .1), R(-.15, .15))), new V3(R(-1, 1), R(.2, 1), R(-1, 1)), .09, .13, C('#4d6e2a').lerp(C('#93a84a'), rnd())); }
      for (let i = 0; i < 3; i++) this.rock(s * R(GATE + .25, GATE + .6), z0 + R(-.35, .1), R(.12, .2));   // beside the legs, never in the opening
      this.collider(s * GATE, z0, .2, 'ring-arch'); }
  }
  // ---------- the hedge: leafy clumps round the whole Ring on HEDGE, solid, open only where the arch stands ----------
  // R165: a living hedge, not a clipped one: uneven height and depth, taller shrubs now and then, ferns at its foot; solid, open only at the arch
  hedge() {
    const step = .55, n = Math.round(Math.PI * 2 * HEDGE / step);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + R(-.03, .03), rr = HEDGE + R(-.22, .3), x = Math.sin(a) * rr, z = Math.cos(a) * rr; if (Math.cos(a) > 0 && Math.abs(Math.sin(a) * HEDGE) < GATE + .3) continue;
      const y = this.Hc(x, z), wave = .5 + .5 * Math.sin(a * 5 + 1.3) * Math.sin(a * 2.3), hgt = lerp(.7, 1.6, wave) * R(.85, 1.15), rad = R(.45, .75);
      if (this.plants) { const k = ['bush_a', 'bush_b', 'bush_c'][(rnd() * 3) | 0], w = this.toWorld(x, y, z); if (this.plants.add(k, w.x, w.y, w.z, R(0, 6.28), hgt * K * 1.1 / this.plants.h(k))) { this.collider(x, z, .5, 'ring-hedge'); continue; } }
      const tone = rnd(), base = tone < .3 ? '#2a4220' : tone < .8 ? '#2f4a24' : '#3b5a28', hi = tone < .3 ? '#5f7a34' : '#7a9640';
      this.cluster(x, y + hgt * .5, z, rad, Math.round(110 * rad / .6), base, hi, .2, hgt / (2 * rad) * .9);
      if (rnd() < .45) this.cluster(x + R(-.25, .25), y + hgt * R(.85, 1.05), z + R(-.25, .25), R(.3, .5), 60, '#36522a', '#86a042', .18, .8);
      if (rnd() < .09) { const th = R(1.9, 2.6); this.tube(this.hedgeStems, [new V3(x, y - .1, z), new V3(x + R(-.1, .1), y + th * .5, z + R(-.1, .1)), new V3(x + R(-.2, .2), y + th * .85, z + R(-.2, .2))], .06, .02, { radial: 6, seg: 8, lump: .2 });
        this.cluster(x, y + th * .8, z, R(.55, .8), 150, '#2c4622', '#6f8a3a', .22, .85); }
      this.collider(x, z, .5, 'ring-hedge'); }
    for (let i = 0; i < 26; i++) { const a = R(0, 6.28), d = HEDGE + R(-.75, -.45), x = Math.sin(a) * d, z = Math.cos(a) * d; if (Math.cos(a) > 0 && Math.abs(Math.sin(a) * d) < GATE + .6) continue; this.fern(x, z, R(.55, .9)); }
  }
  tube(list, pts, r0, r1, o) { list.push(taperTube(pts, r0, r1, o)); }
  // the lane from the arch out to the garden path, in world units (its garden stones and shrubs are cleared)
  // ---------- understory (ferns, toadstools, fallen petals) ----------
  understory() {
    for (let k = 0; k < 9; k++) { const th = podTh(k), x = Math.sin(th) * PODR, z = Math.cos(th) * PODR, out = new V3(x, 0, z).normalize(), side = new V3(-out.z, 0, out.x);
      this.fern(x + out.x * 1.1 + side.x * .9, z + out.z * 1.1 + side.z * .9, R(.8, 1.1)); this.fern(x + out.x * 1.0 - side.x * 1.0, z + out.z * 1.0 - side.z * 1.0, R(.7, 1));
      if (k % 2 === 0) this.toad(x + side.x * .95 - out.x * .1, z + side.z * .95 - out.z * .1);
    }
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + .4; this.toad(Math.cos(a) * 1.3, Math.sin(a) * 1.3); }
    for (let i = 0; i < 4; i++) { const z = R(HEDGE - 1.2, HEDGE - .5), x = laneX(z) + (rnd() < .5 ? -1 : 1) * R(GATE + .2, GATE + .7); this.fern(x, z, R(.6, .9)); }
    for (let i = 0; i < 420; i++) { const a = R(0, 6.28), r = rnd() < .6 ? RING + R(-.9, .9) : R(.6, 3), x = Math.sin(a) * r, z = Math.cos(a) * r; this.addLeaf(new V3(x, this.Hc(x, z) + .015, z), new V3(R(-.25, .25), 1, R(-.25, .25)), .05, .075, C(['#b0703a', '#c99a4a', '#8a5a2a', '#d8a060'][(rnd() * 4) | 0]).multiplyScalar(R(.7, 1))); }
  }
  instanced() {
    const leafK = { 'desktop': 1, 'mobile-high': .6, 'mobile-low': .4 }[this.tierId] ?? 1, ls = this.leaves; ls.forEach(l => l.rank = rnd()); ls.sort((a, b) => a.rank - b.rank);
    const g = leafGeometry(PHONE(this.tierId)), m4 = new THREE.Matrix4(); const im = new THREE.InstancedMesh(g, this.m.leaf, ls.length);
    ls.forEach((l, i) => { m4.compose(l.p, l.q, new V3(l.sx, l.sy, 1)); im.setMatrixAt(i, m4); im.setColorAt(i, l.c); }); im.receiveShadow = true; this.leafMesh = im; this.leafAll = ls.length; this.root.add(im); void leafK;
    const rockGeos = [0, 1, 2, 3].map(v => { const gg = new THREE.IcosahedronGeometry(1, 2), p = gg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (fbm(x * 1.2 + y * .7 + v * 5, z * 1.2 - y * .9) - .5) * .75; p.setXYZ(i, x * k, Math.max(y * k, -.35), z * k); }
      gg.computeVertexNormals(); const n = gg.attributes.normal, col = []; for (let i = 0; i < p.count; i++) { const c = C('#958c78').lerp(C('#6f6857'), rnd() * .4).lerp(C('#4d6a26'), ss(.45, .85, n.getY(i)) * .85); col.push(c.r, c.g, c.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return gg; });
    this.rockGeos = rockGeos; const per = [[], [], [], []]; this.rocks.forEach(r => per[(rnd() * 4) | 0].push(r)); const q = new THREE.Quaternion(); this.rockMeshes = [];
    per.forEach((list, v) => { if (!list.length) return; const ri = new THREE.InstancedMesh(rockGeos[v], this.m.rock, list.length); list.forEach(([x, z, s, sy, sink], i) => { q.setFromEuler(new THREE.Euler(R(-.3, .3), R(0, 6), R(-.3, .3))); m4.compose(new V3(x, this.Hc(x, z) - s * sink * .6, z), q, new V3(s * R(.9, 1.3), s * sy, s)); ri.setMatrixAt(i, m4); }); ri.receiveShadow = true; this.rockMeshes.push(ri); this.root.add(ri); });
    const capGeo = new THREE.LatheGeometry([[0, .62], [.25, .6], [.45, .52], [.52, .4], [.48, .36], [.15, .4], [0, .42]].map(a => new THREE.Vector2(a[0], a[1])), 14), stemGeo = new THREE.LatheGeometry([[0, 0], [.13, 0], [.1, .2], [.09, .42], [0, .44]].map(a => new THREE.Vector2(a[0], a[1])), 8);
    for (const [geo, mat] of [[stemGeo, this.m.stem], [capGeo, this.m.cap]]) { const ti = new THREE.InstancedMesh(geo, mat, this.shrooms.length); this.shrooms.forEach(([x, z, s], i) => { q.setFromEuler(new THREE.Euler(R(-.15, .15), R(0, 6), R(-.15, .15))); m4.compose(new V3(x, this.Hc(x, z) - .01, z), q, new V3(s, s, s)); ti.setMatrixAt(i, m4); }); ti.receiveShadow = true; this.root.add(ti); }
    this.leaves = null; this.rocks = null;
  }
  // ---------- sculpted grass (the concept's density rule; count per tier) ----------
  grass() {
    const seg = 4, pos = [], col = [], nor = [], idx = []; for (let i = 0; i <= seg; i++) { const t = i / seg, w = .5 * (1 - t) + .04, c = C('#26351a').lerp(C('#b4c06a'), Math.pow(t, 1.1)); pos.push(-w, t, .3 * t * t, w, t, .3 * t * t); col.push(c.r, c.g, c.b, c.r, c.g, c.b); nor.push(-.15, 1, .25, .15, 1, .25); }
    for (let i = 0; i < seg; i++) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
    const max = 26000, items = [];
    for (let a = 0; a < max * 8 && items.length < max; a++) { const x = R(-RT, RT), z = R(-RT, RT), r = Math.hypot(x, z); if (r > RT - .15 || r < .55) continue;
      let d = ss(.36, .6, fbm(x * .55 + 3, z * .55)) * .95 + .05; d *= 1 - pathMaskC(x, z); const e = Math.abs(r - RING); if (e > .5 && e < .85) d = Math.max(d, .55);
      for (let k = 0; k < 9; k++) { const th = podTh(k), dd = Math.hypot(x - Math.sin(th) * PODR, z - Math.cos(th) * PODR); if (dd < .62) d = 0; else if (dd < 1.2) d = Math.max(d, .6); }
      if (Math.hypot(x - this.stoneC.x, z - this.stoneC.z) < .75) d = 0; d *= 1 - .6 * Math.exp(-(r * r) / 2.5); d *= 1 - ss(RT - 1, RT - .15, r) * .5; if (rnd() > d) continue; items.push([x, z, rnd()]); }
    items.sort((a, b) => a[2] - b[2]);
    const im = new THREE.InstancedMesh(g, this.m.grass, items.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    items.forEach(([x, z], i) => { const h = R(.12, .3) * (1 + .5 * ss(4, 6.4, Math.hypot(x, z))); e.set(R(-.25, .25), R(0, 6.28), R(-.25, .25)); q.setFromEuler(e); m4.compose(new V3(x, this.Hc(x, z) - .01, z), q, new V3(R(.03, .05), h, h)); im.setMatrixAt(i, m4);
      im.setColorAt(i, C('#ffffff').lerp(C('#e9e2a0'), fbm(x * .3 + 9, z * .3) * .7).multiplyScalar(R(.75, 1.12))); });
    im.receiveShadow = true; im.castShadow = false; this.grassMesh = im; this.root.add(im);
  }
  atmosphere() {
    const n = 380, p = []; for (let i = 0; i < n; i++) { const a = R(0, 6.28), r = Math.sqrt(rnd()) * 6; p.push(Math.sin(a) * r, R(.2, 2.6) + this.Hc(Math.sin(a) * r, Math.cos(a) * r), Math.cos(a) * r); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    this.motes = new THREE.Points(g, new THREE.PointsMaterial({ size: .04, map: this.T.radial, color: '#ffe2a0', transparent: true, opacity: .85, depthWrite: false, blending: THREE.AdditiveBlending })); this.motes.renderOrder = 5; this.root.add(this.motes);
    this.shaftMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uK: { value: .06 }, uCol: { value: C('#ffe6b8') } },
      vertexShader: 'varying vec2 vU;varying float vF;void main(){vU=uv;vec3 n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vF=abs(dot(n,normalize(-mv.xyz)));gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform float uK;uniform vec3 uCol;varying vec2 vU;varying float vF;void main(){float y=clamp(vU.y,0.,1.);float a=uK*smoothstep(0.,.3,y)*pow(1.-y,.6)*pow(clamp(vF,0.,1.),2.5);gl_FragColor=vec4(uCol*a,1.);}' });
    this.shafts = [[-1.6, 2.2], [2.4, -.6], [.9, 3.1]].map(([x, z]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.35, .75, 8, 20, 1, true), this.shaftMat); m.userData.g = new V3(x, this.Hc(x, z), z); this.root.add(m); return m; });
  }
  // the Ring model's own stone (a copy) at the head of the lane: the planting and switch point
  stone() {
    const M = this.s.model, g = new THREE.Group(); g.name = 'R159_STONE'; g.position.set(this.stoneC.x, this.Hc(this.stoneC.x, this.stoneC.z) - .19, this.stoneC.z); g.scale.setScalar(1 / K); this.root.add(g);
    for (const n of ['Stone', 'Stone_Inner', 'Stone_Glow', 'Stone_Emblem']) { const o = M?.getObjectByName(n); if (!o) continue; const c = o.clone(true); c.position.set(o.position.x, o.position.y, o.position.z); g.add(c); }
    this.stoneGroup = g; const w = this.toWorld(this.stoneC.x, 0, this.stoneC.z); this.stoneWorld = { x: w.x, z: w.z };
  }
  // the colliders go to the game's world (garden space); dispose takes them out again
  solid() { const W = this.g.world; for (const c of this.cols) W.colliders.push(c); }
  batch() {
    this.root.updateMatrixWorld(true); const inv = new THREE.Matrix4(), m = new THREE.Matrix4();
    const merge = (meshes, parent, pod) => { const by = new Map(); for (const o of meshes) { if (!o.isMesh || o.isInstancedMesh || this.glows.includes(o)) continue; (by.get(o.material) || by.set(o.material, []).get(o.material)).push(o); }
      inv.copy(parent.matrixWorld).invert();
      for (const [mat, list] of by) { if (list.length < 2) continue; const geos = list.map(o => { m.multiplyMatrices(inv, o.matrixWorld); return o.geometry.clone().applyMatrix4(m); });
        const geo = mergeGeometries(geos, false); if (!geo) continue; const cast = list.some(o => o.castShadow);
        for (const o of list) { o.removeFromParent(); o.geometry.dispose(); const i = this.cast.indexOf(o); if (i >= 0) this.cast.splice(i, 1); }
        const out = new THREE.Mesh(geo, mat); out.castShadow = cast; out.receiveShadow = true; out.userData.pod = pod; parent.add(out); if (cast) this.cast.push(out); } };
    const base = []; for (const P of this.pods.values()) { for (const o of P.g.children) if (o.isMesh) base.push(o); merge(P.open.children.filter(o => o.isMesh), P.open, true); merge(P.closed.children.filter(o => o.isMesh), P.closed, true); }
    merge(base, this.root, true); merge(this.root.children.filter(o => o.isMesh && o !== this.ground && (o.material === this.m.bark || o.material === this.m.lantern || o.material === this.m.root)), this.root, false);
  }
  setTier(id) {
    const t = TIERS[id] || TIERS.desktop; this.tierId = TIERS[id] ? id : 'desktop'; this.dpr = null;
    const grassK = { 'desktop': 1, 'mobile-high': .42, 'mobile-low': .25 }[this.tierId], leafK = { 'desktop': 1, 'mobile-high': .6, 'mobile-low': .4 }[this.tierId];
    if (this.grassMesh) this.grassMesh.count = Math.floor(this.grassMesh.instanceMatrix.count * grassK);
    if (this.leafMesh) { this.leafMesh.count = Math.max(1, Math.floor(this.leafAll * leafK)); this.leafMesh.castShadow = t.shadows === 'full'; }
    for (const r of this.rockMeshes || []) r.castShadow = t.shadows === 'full';
    if (this.motes) this.motes.geometry.setDrawRange(0, Math.round(380 * t.motes / 160));
    for (const s of this.shafts || []) s.visible = t.shafts;
    for (const o of this.cast) o.castShadow = t.shadows === 'full' || (t.shadows === 'pods' && !!o.userData.pod);
    this.env?.setTier(this.tierId);
  }
  update(dt, camera) {
    const t = (performance.now() - this.t0) / 1000; this.U.time.value = t;
    if (this.env) try { this.env.mood(); } catch (e) { console.warn('[TGW] ring mood', e); this.env.restore(); this.env = null; }
    if (this.g.quality?.id && this.g.quality.id !== this.tierId) this.setTier(this.g.quality.id);
    const sun = this.g.world?.sun; if (sun) { const k = Math.min(1, Math.max(0, (sun.intensity - 1.15) / (this.sunBase - 1.15))); this.U.day.value = k; this.U.sunCol.value.copy(this.sunCol0).multiplyScalar(k); }
    const sd = this.g.world?.sunDir; if (sd && camera) this.U.sunView.value.copy(sd).transformDirection(camera.matrixWorldInverse);
    for (const P of this.pods.values()) { if (P.k !== P.target) { P.k += Math.sign(P.target - P.k) * Math.min(Math.abs(P.target - P.k), Math.min(dt, .1) / 1.6); if (P.k === P.target) P.anim = false; this.applyPod(P); }
      if (P.sway && P.open.visible) P.sway.rotation.z = Math.sin(t * 1.3 + P.ph) * .07; }
    this.glowUpdate(t, dt); this.phoneBudget(dt); this.plants?.update(dt);
    const br = .5 + .5 * Math.sin(t * 2.1); this.m.ember.emissiveIntensity = 2 + 1.5 * br; for (const gl of this.glows) gl.material.opacity = (gl.isSprite ? .4 : .24) + .12 * br;
    if (this.motes) this.motes.rotation.y = t * .02;
    if (sd && this.shafts) for (const m of this.shafts) { if (!m.visible) continue; m.position.copy(m.userData.g).addScaledVector(sd, 3.6); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), sd); }
  }
  bloom(id) { const P = this.pods.get(id); if (!P) return; P.k = 0; P.target = 1; P.anim = true; this.applyPod(P);
    try { this.g.fx?.burst?.(this.podWorld(id), 0xffb35a, 18, 1.4); } catch {} }
  podWorld(id) { const P = this.pods.get(id); const v = new V3(); P?.g.getWorldPosition(v); v.y += .5; return v; }
  // R179: called by the swap spot every frame while the player is in the shared world
  worldUpdate(dt) { if (!this.wenv) return; try { this.U.time.value = (performance.now() - this.t0) / 1000; this.wenv.update(dt); } catch (e) { console.warn('[TGW] world premium look failed; world restored', e); try { this.wenv.restore(); } catch {} this.wenv = null; if (this.post) this.post.world = false; } }
  dispose() { try { this.wenv?.restore(); } catch {} this.wenv = null; try { this.plants?.root.removeFromParent(); } catch {} try { this.leaveGarden(); } catch {} try { this.env?.restore(); } catch {} this.env = null; if (this.g.postFx === this.post) this.g.postFx = null; try { this.post?.dispose(); } catch {} const W = this.g.world; for (const c of this.cols) { const i = W.colliders.indexOf(c); if (i >= 0) W.colliders.splice(i, 1); } this.cols = []; this.root.removeFromParent(); }
  stats() { let tris = 0, draws = 0; this.root.traverse(o => { if (!o.visible || !o.geometry) return; draws++; const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; tris += n * (o.isInstancedMesh ? o.count : 1); }); return { draws, tris: Math.round(tris), buildMs: Math.round(this.buildMs) }; }
}

// ======================================================================================================================
// R158 experimental (Jannik 14/10: 'try it; if it does not work we delete it'): the whole VISIBLE garden in the concept's
// look while ?ring=premium is on. Nothing is rebuilt or moved: the garden's own trees, shrubs, backdrop conifers, ground,
// path stones and grass are hidden or re-tinted in place and replaced by concept-style meshes at the SAME positions, so
// every collider, path, bed and the greenhouse stay exactly where they are. restore() puts every original back.
// Mood: after DayNight sets the garden's light each frame, the concept's morning grade (haze, hemisphere, sun, sky) is
// blended over the day part; DayNight is asked to re-apply every frame so nothing accumulates. Garden space only.
// ======================================================================================================================
// R180 (Jannik 15/10: 'more like this, with the fog', option B as no concept values came): the garden's haze is denser,
// near 4 / far 34 (was 6 / 46, the Ring concept's FogExp2 .03 equivalent): ~53 % haze at 20 m instead of ~35 %.
const MOOD = { fog: C('#c8d3c3'), near: 4, far: 34, zenith: C('#86abc4'), hemiSky: C('#c6d8e2'), hemiGround: C('#5e4c2e'), hemiI: 1.05, sunC: C('#fff0d6'), sunI: 3.0, exposure: .98, env: .55 };
// the garden ground's colour graded to the concept's loam, moss and trodden paths (water keeps its colour); shared with the Ring's ground edge
export function gradeGround(c, x, z) {
  if (c.b > c.r * .95 && c.b > .25) return c;
  const orange = c.r > c.g * 1.12, n1 = fbm(x * .35, z * .35), n2 = fbm(x * 1.3 + 5, z * 1.3);
  if (orange) { const k = Math.min(1, (c.r - c.g) * 4); c.lerp(C('#4a3a27').lerp(C('#6e5c40'), n2 * .7), .7 + .3 * k); }
  else { const t = C('#4a6327').lerp(C('#3a5220'), ss(.45, .7, n1)).lerp(C('#45311f'), ss(.62, .82, n2) * .55); c.lerp(t, .85); }
  return c.multiplyScalar(.74 + .22 * n2);
}
const _m4 = new THREE.Matrix4();
function m4set(im, i, p, q, sc) { _m4.compose(p, q, sc); im.setMatrixAt(i, _m4); }
const LEAF_BUDGET = { 'desktop': 1, 'mobile-high': .4, 'mobile-low': .25 };

export class RingEnvironment {
  constructor(sanctuary) {
    this.S = sanctuary; this.g = sanctuary.g; this.W = this.g.world; this.undo = []; rnd = rng(23);
    this.root = new THREE.Group(); this.root.name = 'R158_RING_ENVIRONMENT'; this.W.privateRoot.add(this.root);
    this.leaves = []; this.bark = []; this.birch = []; this.reeds = []; this.cattails = []; this.rocksAt = []; this.ferns = [];
    this.tier = sanctuary.tierId; const k = LEAF_BUDGET[this.tier] ?? 1; this.leafK = k; this.leafSize = 1 / Math.sqrt(Math.max(.3, k));
    this.M = {
      bark: new THREE.MeshStandardMaterial({ color: '#6e5038', map: sanctuary.T.bark, bumpMap: sanctuary.T.barkBump, bumpScale: 3, roughness: .92 }),
      birch: new THREE.MeshStandardMaterial({ color: '#d9d2bf', map: sanctuary.T.bark, bumpMap: sanctuary.T.barkBump, bumpScale: 1.5, roughness: .85 }),
      leaf: leafMaterial(sanctuary.T, sanctuary.U, sanctuary.tierId)
    };
    this.trees(); this.backdrop(); this.shrubs(); this.pond(); this.ground(); this.stones(); this.rocks(); this.oldStones(); this.fence(); this.homeTrees(); this.oldTrees(); this.meadow(); this.finish(); this.treeColliders();
  }
  H(x, z) { return this.W.groundHeight?.(x, z) || 0; }
  hide(o) { if (!o || !o.visible) return; o.visible = false; this.undo.push(() => { o.visible = true; }); }
  // the concept's leaf clusters (cupped cards, darker inside, lighter on top) and tapered bark tubes
  cluster(cx, cy, cz, rad, n, base, vr, size, flat = .75) {
    n = Math.round(n * this.leafK); size *= this.leafSize; const Z = new V3(0, 0, 1), q2 = new THREE.Quaternion();
    for (let i = 0; i < n; i++) { const d = new V3(R(-1, 1), R(-1, 1) * flat, R(-1, 1)); if (d.length() > 1) { i--; continue; }
      const p = new V3(cx, cy, cz).addScaledVector(d, rad), nrm = d.clone().normalize().add(new V3(R(-.6, .6), R(-.3, .6), R(-.6, .6))).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(Z, nrm); q2.setFromAxisAngle(nrm, R(0, 6.28)); q.premultiply(q2);
      const c = C(base).lerp(C(vr), rnd() * rnd()); c.multiplyScalar(lerp(.6, 1.2, d.length() * (.5 + .5 * Math.max(0, d.y)))); const s = size * R(.75, 1.25);
      this.leaves.push({ p, q, sx: s * .7, sy: s, c }); } }
  tube(list, pts, r0, r1, o) { list.push(taperTube(pts, r0, r1, o)); }

  fernAt(x, z, sc) { const P = this.S.plants; if (P && P.add(rnd() < .5 ? 'fern_a' : 'fern_b', x, this.H(x, z), z, R(0, 6.28), sc * .8)) return; const y = this.H(x, z), n = 7, Z = new V3(0, 0, 1); for (let f = 0; f < n; f++) { const a = f / n * 6.28 + R(-.3, .3), dir = new V3(Math.cos(a), 0, Math.sin(a)), L = R(.5, .75) * sc, up = R(.35, .55) * sc, side = new V3(-dir.z, 0, dir.x);
    for (let i = 1; i < 10; i++) { const t = i / 10, P = new V3(x, y, z).addScaledVector(dir, L * t).add(new V3(0, up * Math.sin(Math.PI * t * .85), 0));
      for (const sd of [-1, 1]) { const n2 = new V3(0, 1, 0).addScaledVector(dir, -.4 + t * .9).addScaledVector(side, sd * .3).normalize(), q = new THREE.Quaternion().setFromUnitVectors(Z, n2), lf = (1 - t * .65) * sc; q.premultiply(new THREE.Quaternion().setFromAxisAngle(n2, Math.atan2(sd, 1) + sd * 1.2)); this.leaves?.push({ p: P.clone().addScaledVector(side, sd * .02 * sc), q, sx: .05 * lf * this.leafSize, sy: .16 * lf * this.leafSize, c: C('#456a28').lerp(C('#8aa448'), t * .6 + rnd() * .2) }); } } } }
  // ---------- the garden's eight trees -> concept oaks (round) and birches at their own spots; the one behind the Ring is the hero ----------
  trees() {
    const defs = this.W.treeDefs || [], ring = this.S.center, kids = this.W.privateRoot.children;
    const bark = [0x675442, 0xd8d2bf], foliage = 0x718b4e;
    for (const o of kids) { if (!o.isMesh || o.isInstancedMesh) continue; const t = o.geometry?.type, hex = o.material?.color?.getHex?.();
      if ((t === 'CylinderGeometry' && bark.includes(hex)) || (t === 'IcosahedronGeometry' && hex === foliage)) { const near = defs.some(d => Math.hypot(o.position.x - d.x, o.position.z - d.z) < 2.2 * d.s); if (near) this.hide(o); } }
    for (const d of defs) { if (Math.hypot(d.x - ring.x, d.z - ring.z) < this.S.clearR + .8) continue;   // the Ring's own oak stands there now
      d.t === 'birch' ? this.birchTree(d.x, d.z, d.s) : this.oak(d.x, d.z, d.s * .82, false); }
  }
  plantTree(x, z, height, kind) { const P = this.S.plants; if (!P?.has(kind)) return false; return P.add(kind, x, this.H(x, z), z, R(0, 6.28), height / P.h(kind)); }
  oak(x, z, sc, hero) {
    if (!hero && this.plantTree(x, z, 6.1 * sc, (this.tk = (this.tk || 0) + 1) % 2 ? 'tree_a' : 'tree_c')) return;
    const y = this.H(x, z), P = (dx, dy, dz) => new V3(x + dx * sc, y + dy * sc, z + dz * sc);
    this.tube(this.bark, [P(0, -.4, 0), P(.08, .9, .04), P(-.06, 1.8, .1), P(.12, 2.6, 0), P(.05, 3.1, -.05)], .5 * sc, .24 * sc, { radial: hero ? 14 : 10, seg: hero ? 26 : 16, lump: .16, flare: .9 });
    const nr = hero ? 7 : 5; for (let i = 0; i < nr; i++) { const a = i / nr * 6.28 + R(-.25, .25), L = R(1.2, 1.9), c = Math.cos(a), s = Math.sin(a);
      this.tube(this.bark, [P(c * .15, .7, s * .15), P(c * .55, .18, s * .55), P(c * L * .6, .04, s * L * .6), P(c * L, -.12, s * L)], .26 * sc, .03 * sc, { radial: 8, seg: 14, lump: .18, pow: .7 }); }
    const ne = hero ? 6 : 5, ends = []; for (let i = 0; i < ne; i++) { const a = i / ne * 6.28 + R(-.3, .3), L = R(2, 2.7), c = Math.cos(a), s = Math.sin(a), y0 = R(2.2, 2.9), e = P(c * L, R(3.6, 4.3), s * L); ends.push(e);
      this.tube(this.bark, [P(c * .1, y0, s * .1), P(c * L * .4, y0 + .6, s * L * .4), P(c * L * .75, (e.y - y) / sc - .1, s * L * .75), e], .17 * sc, .04 * sc, { radial: 7, seg: 12, lump: .15 }); }
    const nb = hero ? 820 : 520; ends.forEach(e => this.cluster(e.x, e.y + .2 * sc, e.z, 1.35 * sc, nb, '#3f5a2a', '#7f9a3e', .28 * sc, .6));
    for (let i = 0; i < 5; i++) { const a = R(0, 6.28), d = R(.5, 1.6) * sc; this.cluster(x + Math.cos(a) * d, y + R(4.3, 4.9) * sc, z + Math.sin(a) * d, 1.2 * sc, hero ? 650 : 380, '#3a5426', '#86a042', .28 * sc, .55); }
  }
  birchTree(x, z, sc) {
    if (this.plantTree(x, z, 4.9 * sc, 'tree_b')) return;
    const y = this.H(x, z), P = (dx, dy, dz) => new V3(x + dx * sc, y + dy * sc, z + dz * sc);
    this.tube(this.birch, [P(0, -.2, 0), P(.06, 1.4, .03), P(-.05, 2.8, .06), P(.04, 4.0, 0)], .17 * sc, .07 * sc, { radial: 9, seg: 16, lump: .1, flare: .5 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + R(-.3, .3), y0 = R(1.8, 3.3), L = R(.7, 1.2), c = Math.cos(a), s = Math.sin(a), e = P(c * L, y0 + .7, s * L);
      this.tube(this.birch, [P(0, y0, 0), P(c * L * .5, y0 + .45, s * L * .5), e], .06 * sc, .02 * sc, { radial: 6, seg: 8, lump: .1 });
      this.cluster(e.x, e.y + .15 * sc, e.z, .75 * sc, 260, '#4c6a2c', '#a3b85a', .2 * sc, .7); }
    this.cluster(x, y + 4.0 * sc, z, .9 * sc, 300, '#4c6a2c', '#a3b85a', .2 * sc, .7);
  }

  // ---------- the cone conifers on the garden's edge -> tall concept trees (trunk + two crowns) on the same spots; far cone backdrop hidden in the haze ----------
  backdrop() {
    const m4 = new THREE.Matrix4(), v = new V3(), sc = new V3(), q = new THREE.Quaternion(); let spots = null;
    for (const o of this.W.privateRoot.children) { if (!o.isInstancedMesh) continue; const p = o.geometry?.parameters || {};
      if (o.geometry?.type === 'ConeGeometry' && p.radius === 1 && p.height === 1.5) { if (!spots) { spots = []; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); m4.decompose(v, q, sc); spots.push([v.x, v.z, sc.x / 1.12]); } } this.hide(o); }
      else if (o.geometry?.type === 'CylinderGeometry' && p.radiusTop === .08 && p.radiusBottom === .12) this.hide(o); }
    const ctx = this.W.privateRoot.getObjectByName('PRIVATE_GARDEN_WORLD_CONTEXT_BACKDROP'); if (ctx) for (const o of ctx.children) if (o.isInstancedMesh && /Cone|Cylinder/.test(o.geometry?.type)) this.hide(o);
    for (const [x, z, s] of spots || []) { const y = this.H(x, z), ht = R(4.5, 6.5) * s; if (this.plantTree(x, z, ht + 1.2, rnd() < .5 ? 'tree_b' : 'tree_c')) continue;
      this.tube(this.bark, [new V3(x, y - .3, z), new V3(x + R(-.3, .3), y + ht * .5, z + R(-.3, .3)), new V3(x + R(-.4, .4), y + ht, z + R(-.4, .4))], R(.28, .4) * s, .1 * s, { radial: 7, seg: 10, lump: .15, flare: .6 });
      this.cluster(x, y + ht + .3, z, R(1.8, 2.4) * s, 260, '#2f4a26', '#5d7a34', .5, .65); this.cluster(x + R(-.8, .8), y + ht - 1.1, z + R(-.8, .8), 1.4 * s, 120, '#2f4a26', '#5d7a34', .45, .6); }
  }

  // ---------- the round shrubs (beds and garden edge) -> leafy concept clumps per shrub instance (masked instances stay away) ----------
  shrubs() {
    const m4 = new THREE.Matrix4(), v = new V3(), sc = new V3(), q = new THREE.Quaternion();
    for (const o of this.W.privateRoot.children) { if (!o.isInstancedMesh || o.geometry?.type !== 'IcosahedronGeometry') continue; const r = o.geometry.parameters.radius; if (r !== .55 && r !== .32) continue;
      for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); m4.decompose(v, q, sc); if (sc.x < .01) continue; const rad = r * sc.x * 1.05;
        const P = this.S.plants, k = ['bush_a', 'bush_b', 'bush_c'][(rnd() * 3) | 0];
        if (P?.has(k) && P.add(k, v.x, this.H(v.x, v.z), v.z, R(0, 6.28), rad * 2.1 / P.h(k))) continue;
        this.cluster(v.x, v.y + rad * .1, v.z, rad, r === .55 ? 150 : 55, '#33502a', '#6f8a3a', r === .55 ? .17 : .12, .75); }
      this.hide(o); }
  }

  // ---------- ground: the garden's own colours graded to the concept's loam, moss and trodden paths (water and the pond bank keep theirs) ----------
  ground() {
    const mesh = this.W.privateRoot.children.find(o => o.isMesh && o.geometry?.type === 'PlaneGeometry' && o.geometry.parameters?.width === 36 && o.material?.vertexColors);
    if (!mesh) return; const col = mesh.geometry.attributes.color, pos = mesh.geometry.attributes.position, orig = col.array.slice(), c = new THREE.Color();
    const mud = C('#3b3022'), bed = C('#1d2a22'), moss = C('#3a5220');
    for (let i = 0; i < col.count; i++) { c.fromBufferAttribute(col, i); const x = pos.getX(i), z = pos.getZ(i), q = this.pondQ ? this.pondQ(x, z) : 9;
      if (q < 1.45) { if (q < .98) c.copy(bed); else c.copy(mud).lerp(moss, ss(1.08, 1.45, q)).multiplyScalar(.85 + .25 * fbm(x * 2, z * 2)); }   // R167: the new shore's mud and mossy bank
      else gradeGround(c, x, z);
      col.setXYZ(i, c.r, c.g, c.b); }
    col.needsUpdate = true; this.undo.push(() => { col.array.set(orig); col.needsUpdate = true; });
  }
  // the garden path's flat grey stepping stones become the concept's flagstones on the same spots; boulders get its warm sandstone
  stones() {
    const vars = this.S.flagVariants || [], list = vars.map(() => []), v = new V3();
    for (const o of [...this.W.privateRoot.children]) { if (!o.isMesh || o.geometry?.type !== 'DodecahedronGeometry' || o.scale.y > .07 || !o.visible) continue;
      o.getWorldPosition(v); list[(rnd() * Math.max(1, vars.length)) | 0]?.push([v.x, v.z, Math.max(o.scale.x, o.scale.z) * .95, o.rotation.y]); this.hide(o); }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    vars.forEach((va, k) => { const L = list[k]; if (!L?.length) return; const im = new THREE.InstancedMesh(va.g, this.S.m.stone, L.length);
      L.forEach(([x, z, s, ry], i) => { q.setFromEuler(new THREE.Euler(R(-.04, .04), ry + R(-.3, .3), R(-.04, .04))); m4.compose(new V3(x, this.H(x, z) - .04, z), q, new V3(s, .13, s)); im.setMatrixAt(i, m4); im.setColorAt(i, C('#ffffff').multiplyScalar(R(.8, 1.05)).lerp(C('#c9c09a'), rnd() * .4)); });
      im.receiveShadow = true; this.root.add(im); });
    this.W.privateRoot.traverse(o => { if (!o.isMesh || o.isInstancedMesh || o.geometry?.type !== 'DodecahedronGeometry' || !o.material?.color) return; const m = o.material, c0 = m.color.clone(), f = m.flatShading;
      m.color.lerp(C('#b0a790'), .7); this.undo.push(() => { m.color.copy(c0); }); if (f !== undefined) { m.flatShading = f; } });
  }
  // R165: the garden's low-poly stones and boulders become the concept's rounded, moss-capped rocks on the same spots (colliders are theirs)
  rocks() {
    const geos = this.S.rockGeos; if (!geos?.length) return; const list = geos.map(() => []), m4 = new THREE.Matrix4();
    this.W.privateRoot.traverse(o => { if (!o.visible || o.geometry?.type !== 'DodecahedronGeometry' || o.parent?.name?.startsWith('R15')) return;
      if (o.isInstancedMesh) { for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); const e = m4.elements; if (Math.hypot(e[0], e[1], e[2]) < .01) continue; list[(rnd() * geos.length) | 0].push(m4.clone().premultiply(o.matrixWorld)); } this.hide(o); return; }
      if (o.isMesh && o.scale.y > .07) { o.updateWorldMatrix(true, false); list[(rnd() * geos.length) | 0].push(o.matrixWorld.clone()); this.hide(o); } });
    list.forEach((L, k) => { if (!L.length) return; const im = new THREE.InstancedMesh(geos[k], this.S.m.rock, L.length); L.forEach((mm, i) => im.setMatrixAt(i, mm)); im.castShadow = this.tier === 'desktop'; im.receiveShadow = true; this.root.add(im); });
  }
  // R168: the older 'foundation sample' grey stones (icosahedrons) by the pond and the side path: big -> concept rocks, flat -> flagstones
  oldStones() {
    const fs = this.W.privateRoot.getObjectByName('World foundation sample'), geos = this.S.rockGeos, vars = this.S.flagVariants; if (!fs || !geos?.length) return;
    const rocks = [], flats = [], v = new V3();
    for (const o of [...fs.children]) { if (!o.isMesh || o.geometry?.type !== 'IcosahedronGeometry' || o.material?.color?.getHex?.() !== 0x777b75 || !o.visible) continue; o.updateWorldMatrix(true, false); o.getWorldPosition(v);
      if (o.scale.y > .1) rocks.push(o.matrixWorld.clone()); else flats.push([v.x, v.z, Math.max(o.scale.x, o.scale.z) * .95, o.rotation.y]); this.hide(o); }
    if (rocks.length) { const im = new THREE.InstancedMesh(geos[1 % geos.length], this.S.m.rock, rocks.length); rocks.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = this.tier === 'desktop'; im.receiveShadow = true; this.root.add(im); }
    if (flats.length && vars?.length) { const im = new THREE.InstancedMesh(vars[0].g, this.S.m.stone, flats.length), q = new THREE.Quaternion(); flats.forEach(([x, z, sz, ry], i) => { q.setFromEuler(new THREE.Euler(0, ry, 0)); m4set(im, i, new V3(x, this.H(x, z) - .04, z), q, new V3(sz, .13, sz)); }); im.receiveShadow = true; this.root.add(im); }
  }
  // R165: the garden fence in the concept's rustic wood (bark posts, sagging rails, ivy) on its own line; its collision is the garden's
  fence() {
    const posts = [];
    for (const o of [...this.W.privateRoot.children]) { if (!o.isMesh || o.geometry?.type !== 'BoxGeometry' || o.material?.color?.getHex?.() !== 0xa99a7a) continue; if (o.geometry.parameters.height > .5) posts.push(o.position.clone()); this.hide(o); }
    if (!posts.length) return; const key = p => Math.abs(p.z + 13.95) < .2 ? 'n' : Math.abs(p.z - 12.25) < .2 ? 's' : Math.abs(p.x + 12.95) < .2 ? 'w' : Math.abs(p.x - 12.95) < .2 ? 'e' : '?', sides = {};
    for (const p of posts) (sides[key(p)] ||= []).push(p);
    for (const [k, L] of Object.entries(sides)) { if (k === '?') continue; L.sort((a, b) => (k === 'n' || k === 's') ? a.x - b.x : a.z - b.z);
      L.forEach((p, i) => { const h = R(.78, .95); this.tube(this.bark, [new V3(p.x, -.1, p.z), new V3(p.x + R(-.03, .03), h * .55, p.z + R(-.03, .03)), new V3(p.x + R(-.04, .04), h, p.z + R(-.04, .04))], .07, .045, { radial: 6, seg: 6, lump: .25 });
        if (rnd() < .3) this.cluster(p.x, h * .7, p.z, .28, 45, '#3a5426', '#7a9640', .12, .9);
        const q = L[i + 1]; if (!q || p.distanceTo(q) > 1.6) return;
        for (const y of [.3, .62]) { const m = p.clone().lerp(q, .5); this.tube(this.bark, [new V3(p.x, y + R(-.02, .02), p.z), new V3(m.x, y - .05, m.z), new V3(q.x, y + R(-.02, .02), q.z)], .032, .028, { radial: 5, seg: 6, lump: .2 }); } }); }
  }
  // R165 (Jannik: yes): the character home's own swaying trees (its pine and round tree) become concept trees on their spots; the house stays
  homeTrees() {
    const home = this.g.scene.getObjectByProperty?.('name', `PLAYER_HOME_GARDEN_${this.g.homePortal?.characterId}`) || (() => { let f = null; this.g.scene.traverse(o => { if (!f && /^PLAYER_HOME_GARDEN_/.test(o.name)) f = o; }); return f; })();
    if (!home) return; if (home.getObjectByProperty?.('name', 'Aloe_v2') || (() => { let v = false; home.traverse(o => { if (/_v2$/.test(o.name)) v = true; }); return v; })()) return;   // R177: a v2 (concept-look) home has no old trees; its Sway groups are its own roof leaves
    home.updateMatrixWorld(true); const groups = new Map();
    home.traverse(o => { if (!o.isMesh) return; let n = null; for (let q = o; q && q !== home; q = q.parent) { const m = /(Sway\d+)/.exec(q.name); if (m) { n = m[1]; break; } } if (n) (groups.get(n) || groups.set(n, []).get(n)).push(o); });
    const box = new THREE.Box3(), size = new V3(), ctr = new V3(), trees = [];
    // R172: one tree sways in several parts (Sway1/2/3); parts whose centres are within 1.2 m are one tree, not three stacked ones
    for (const list of groups.values()) { box.makeEmpty(); for (const o of list) box.expandByObject(o); box.getCenter(ctr); const t = trees.find(t => Math.hypot(t.c.x - ctr.x, t.c.z - ctr.z) < 1.2); if (t) t.list.push(...list); else trees.push({ c: ctr.clone(), list: [...list] }); }
    for (const { list } of trees) { box.makeEmpty(); for (const o of list) box.expandByObject(o); box.getSize(size); box.getCenter(ctr); if (size.y < 1.6) continue;
      for (const o of list) this.hide(o); const x = ctr.x, z = ctr.z;
      if (size.y / Math.max(size.x, size.z) > 1.9) this.birchTree(x, z, size.y / 4.9); else this.oak(x, z, size.y / 6, false); }
  }
  // R172 (Jannik GO 15/10): the 'foundation sample' broadleaf tree and small layered pine (old low-poly look) become the new GLB trees on
  // their own spots; their colliders stay the garden's (treeColliders() widens them to the new trunks)
  oldTrees() {
    const fs = this.W.privateRoot.getObjectByName('World foundation sample'); if (!fs) return;
    for (const o of fs.children) { const t = o.geometry?.type;
      if ((o.isMesh && !o.isInstancedMesh && t === 'TubeGeometry') || (o.isInstancedMesh && t === 'IcosahedronGeometry' && o.count === 11) || (o.isMesh && !o.isInstancedMesh && t === 'BufferGeometry' && o.material?.color?.getHex?.() === 0x34593d)) this.hide(o); }
    this.oak(-7.2, -3.05, .72, false); this.birchTree(-8.15, -4.7, .9);
  }
  // R172 (Jannik: 'collider on ALL trees'): every GLB tree gets a blocking circle the size of its trunk (90th percentile of the bark at
  // 5-10 % of its height, roots excluded) unless a garden collider at least that big already stands on it. restore() takes them out.
  treeColliders() {
    const P = this.S.plants, W = this.W; if (!P?.items?.length) return; const trunk = {}, sc = new V3(), added = [];
    const radius = k => { if (trunk[k] != null) return trunk[k]; const h = P.h(k), rs = [];
      for (const pt of P.P[k].lod[0]) { if (!/bark/i.test(pt.material?.name || '')) continue; const a = pt.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const y = a.getY(i) / h; if (y >= .05 && y < .1) rs.push(Math.hypot(a.getX(i), a.getZ(i))); } }
      rs.sort((a, b) => a - b); return (trunk[k] = rs.length ? rs[(rs.length * .9) | 0] : .4); };
    for (const it of P.items) { if (P.P[it.kind]?.type !== 'tree') continue; sc.setFromMatrixScale(it.m); const r = radius(it.kind) * sc.x;
      if (W.colliders.some(c => c.space === 'garden' && Math.hypot(c.x - it.p.x, c.z - it.p.z) + r <= (c.r || 0) + .05)) continue;
      const c = { x: it.p.x, z: it.p.z, r, kind: 'ring-tree', traversal: 'blocked', space: 'garden' }; W.colliders.push(c); added.push(c); }
    this.treeCols = added.length; this.undo.push(() => { for (const c of added) { const i = W.colliders.indexOf(c); if (i >= 0) W.colliders.splice(i, 1); } });
  }
  // ---------- R167: the pond, asymmetric (Jannik: 'not just round'), dark and still, with lily pads, reeds and mossy stones ----------
  // Its shoreline uses the garden's own water-body rule (organic ellipse + harmonics) with new harmonics, so walking stops at
  // the new edge; it stays inside the pond's build reservation (2.15 x 2.85) and the shore path point stays dry.
  pond() {
    const W = this.W, body = (W.localWaterBodies || []).find(b => b.kind === 'organic-ellipse'); if (!body) return;
    const keep = { base: body.base, waveA: body.waveA, freqA: body.freqA, waveB: body.waveB, freqB: body.freqB, phaseB: body.phaseB };
    const keep2 = { rx: body.rx, rz: body.rz }; Object.assign(body, { base: .96, waveA: .1, freqA: 1, waveB: .05, freqB: 2, phaseB: 1.1, rx: body.rx * 1.1, rz: body.rz * 1.1 }); this.undo.push(() => Object.assign(body, keep, keep2));   // R168: 10 % larger
    const edge = a => body.base + body.waveA * Math.sin(a * body.freqA) + body.waveB * Math.sin(a * body.freqB + body.phaseB); this.pondQ = (x, z) => { const ux = (x - body.cx) / body.rx, uz = (z - body.cz) / body.rz; return Math.hypot(ux, uz) / edge(Math.atan2(uz, ux)); };
    // the garden ground: a basin under the new shore (the old one is put back on restore)
    const gm = W.privateRoot.children.find(o => o.isMesh && o.geometry?.type === 'PlaneGeometry' && o.geometry.parameters?.width === 36 && o.material?.vertexColors);
    if (gm) { const pos = gm.geometry.attributes.position, orig = pos.array.slice();
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); if (Math.hypot((x - body.cx) / body.rx, (z - body.cz) / body.rz) > 1.6) continue; const q = this.pondQ(x, z); pos.setY(i, -.24 * (1 - ss(.75, 1.22, q))); }
      pos.needsUpdate = true; gm.geometry.computeVertexNormals(); this.undo.push(() => { pos.array.set(orig); pos.needsUpdate = true; gm.geometry.computeVertexNormals(); }); }
    const water = W.privateRoot.getObjectByName('POND_WATER_SINGLE_SURFACE'); this.hide(water);
    const seg = 96, P = [body.cx, -.06, body.cz], I = []; for (let i = 0; i < seg; i++) { const a = i / seg * Math.PI * 2, e = edge(a) * 1.02; P.push(body.cx + Math.cos(a) * body.rx * e, -.06, body.cz + Math.sin(a) * body.rz * e); }
    for (let i = 0; i < seg; i++) I.push(0, 1 + (i + 1) % seg, 1 + i);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
    const wm = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: '#21403c', roughness: .06, metalness: 0, clearcoat: .6, clearcoatRoughness: .05, envMapIntensity: 1.1 })); wm.name = 'R167_POND'; wm.receiveShadow = true; this.root.add(wm);
    const at = (a, e) => new V3(body.cx + Math.cos(a) * body.rx * edge(a) * e, 0, body.cz + Math.sin(a) * body.rz * edge(a) * e);
    // lily pads (some in flower), reeds and cattails at the shore, mossy stones and ferns on the bank
    const padGeo = new THREE.CircleGeometry(1, 18, .35, Math.PI * 2 - .7).rotateX(-Math.PI / 2), pads = new THREE.InstancedMesh(padGeo, new THREE.MeshStandardMaterial({ color: '#4d7a2c', roughness: .55, side: THREE.DoubleSide }), 16), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < 16; i++) { const p = at(R(0, 6.28), Math.sqrt(rnd()) * .78); q.setFromAxisAngle(new V3(0, 1, 0), R(0, 6.28)); const s = R(.12, .24); m4.compose(new V3(p.x, -.045, p.z), q, new V3(s, 1, s)); pads.setMatrixAt(i, m4); pads.setColorAt(i, C('#ffffff').multiplyScalar(R(.75, 1.1))); }
    this.root.add(pads); for (let i = 0; i < 5; i++) { const p = at(R(0, 6.28), R(.25, .7)); this.cluster(p.x, .0, p.z, .06, 9, '#f4b8c8', '#fff0f4', .07, .5); }
    for (let i = 0; i < 26; i++) { const a = R(0, 6.28), p = at(a, R(.95, 1.12)), n = 5 + (rnd() * 6 | 0); for (let k = 0; k < n; k++) { const h = R(.45, 1.0), x = p.x + R(-.15, .15), z = p.z + R(-.15, .15); this.tube(this.reeds, [new V3(x, -.05, z), new V3(x + R(-.05, .05), h * .6, z + R(-.05, .05)), new V3(x + R(-.12, .12), h, z + R(-.12, .12))], .014, .003, { radial: 4, seg: 4, lump: 0 }); if (rnd() < .18) { const c = new V3(x, h * .8, z); this.cattails.push(c); } } }
    for (let i = 0; i < 14; i++) { const p = at(R(0, 6.28), R(1.05, 1.3)); this.rocksAt.push([p.x, p.z, R(.12, .3)]); }
    for (let i = 0; i < 8; i++) { const p = at(R(0, 6.28), R(1.2, 1.45)); this.ferns.push([p.x, p.z, R(.6, .9)]); }
    // the low-poly 'Pure Poly' tree and grass tufts beside it give way to a concept tree and the meadow below
    const ppTree = (W.obstacles || []).find(o => o.kind === 'purepoly-tree'); if (ppTree) this.oak(ppTree.x, ppTree.z, .55, false);
    this.lateHide();
  }
  // R168: the 'Pure Poly' sample (its pine, its grass tufts) loads after the garden is built; hide it whenever it is there
  lateHide() { const pp = this.W.privateRoot.getObjectByName('Pure Poly import sample'); if (!pp || this.ppDone) return; let found = false;
    const hit = []; pp.traverse(o => { if (o.name === 'PP_Tree_02' || o.name === 'PP_Grass_11') hit.push(o); });
    for (const o of hit) { const par = o.parent; if (!par) continue; o.removeFromParent(); this.undo.push(() => par.add(o)); found = true; }   // taken out, not just hidden: another system turns its visibility back on
    if (found) this.ppDone = true; }
  // ---------- R167: the garden's meadow becomes the concept's sculpted grass everywhere (it bends away from the player like before) ----------
  meadow() {
    const W = this.W; for (const o of [...W.privateRoot.children]) if (o.isInstancedMesh && ['grass', 'wisp', 'tall'].includes(o.userData?.calmType)) this.hide(o);
    const seg = 4, pos = [], col = [], nor = [], idx = []; for (let i = 0; i <= seg; i++) { const t = i / seg, w = .5 * (1 - t) + .04, c = C('#2a4219').lerp(C('#a8c460'), Math.pow(t, 1.1)); pos.push(-w, t, .3 * t * t, w, t, .3 * t * t); col.push(c.r, c.g, c.b, c.r, c.g, c.b); nor.push(-.15, 1, .25, .15, 1, .25); }
    for (let i = 0; i < seg; i++) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
    const S = this.S, ring = S.center, rr = S.clearR, lane = S.lane, max = 70000, items = [];
    for (let a = 0; a < max * 3 && items.length < max; a++) { const x = R(-12.45, 12.45), z = R(-13.35, 11.75);
      if (W.vegetationBlocked?.(x, z, .02) || Math.hypot(x - ring.x, z - ring.z) < rr - .2 || (lane && x > lane.x0 && x < lane.x1 && z > lane.z0 && z < lane.z1) || (this.pondQ && this.pondQ(x, z) < 1.08)) continue;
      let d = (W.grassReadabilityDensity?.(x, z) ?? 1) * (ss(.3, .62, fbm(x * .35 + 3, z * .35)) * .8 + .2); if (rnd() > d) continue; items.push([x, z, rnd()]); }
    items.sort((a, b) => a[2] - b[2]);
    const mat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .78 }), { translucency: this.tier === 'desktop' ? .45 : 0, lift: .03, U: S.U });
    const inner = mat.onBeforeCompile; mat.onBeforeCompile = sh => { inner(sh); sh.uniforms.uPlayer = W.uPlayer; sh.uniforms.uTime = S.U.time;
      sh.vertexShader = 'uniform vec3 uPlayer;\n' + sh.vertexShader.replace('uniform float uTime;\n', '').replace('#include <project_vertex>', `
 vec4 gw = modelMatrix * instanceMatrix * vec4(transformed, 1.0); float hh = max(position.y, 0.0); hh *= hh;
 float wv = sin(uTime * 1.6 + gw.x * .35 + gw.z * .25) * .6 + sin(uTime * 2.7 + gw.x * .9 - gw.z * .7) * .25 + .35; gw.x += wv * .07 * hh; gw.z += wv * .045 * hh;
 vec2 dp = gw.xz - uPlayer.xz; float dl = length(dp), push = (1.0 - smoothstep(0.0, .78, dl)) * .34 * hh; gw.xz += normalize(dp + vec2(1e-4)) * push; gw.y -= push * .55;
 vec4 mvPosition = viewMatrix * gw; gl_Position = projectionMatrix * mvPosition;`);
      if (!/uniform float uTime/.test(sh.vertexShader)) sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader; };
    mat.customProgramCacheKey = () => `r167-meadow-${this.tier}`;
    const im = new THREE.InstancedMesh(g, mat, items.length), q = new THREE.Quaternion(), e = new THREE.Euler();
    items.forEach(([x, z], i) => { const h = R(.16, .38) * (1 + .35 * ss(.5, .75, fbm(x * .2, z * .2))); e.set(R(-.2, .2), R(0, 6.28), R(-.2, .2)); q.setFromEuler(e); m4set(im, i, new V3(x, this.H(x, z) - .01, z), q, new V3(R(.035, .055), h, h));
      im.setColorAt(i, C('#ffffff').lerp(C('#e6dd96'), fbm(x * .3 + 9, z * .3) * .55).multiplyScalar(R(.72, 1.08))); });
    im.receiveShadow = true; im.name = 'R167_MEADOW'; im.frustumCulled = false; this.meadowMesh = im; this.meadowAll = items.length;
    const grp = new THREE.Group(); grp.name = 'R167_MEADOW_ROOT'; grp.add(im); W.privateRoot.add(grp); this.undo.push(() => grp.removeFromParent());
    this.setTier(this.tier);
    try { this.g.vegetationMask?.apply?.(); } catch {}   // grass under a moved structure is hidden like the garden's own
  }
  grassTint() {
    this.W.privateRoot.traverse(o => { if (o.userData?.calmType !== 'grass' || !o.material?.color) return; const m = o.material, c0 = m.color.clone(); m.color.set('#bdb87c'); this.undo.push(() => m.color.copy(c0)); });
  }

  finish() {
    const add = (list, mat, cast) => { if (!list.length) return; const g = mergeGeometries(list, false); list.forEach(x => x.dispose()); const m = new THREE.Mesh(g, mat); m.castShadow = cast; m.receiveShadow = true; this.root.add(m); };
    add(this.bark, this.M.bark, this.tier === 'desktop'); add(this.birch, this.M.birch, this.tier === 'desktop');   // R166: phones keep the Ring's own casters only
    add(this.reeds, new THREE.MeshStandardMaterial({ color: '#5f7a34', roughness: .8 }), false);
    if (this.cattails.length) { const ct = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.025, .12, 3, 6), new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: .9 }), this.cattails.length); this.cattails.forEach((c, i) => m4set(ct, i, c, new THREE.Quaternion(), new V3(1, 1, 1))); this.root.add(ct); }
    const geos = this.S.rockGeos; if (geos?.length && this.rocksAt.length) { const ri = new THREE.InstancedMesh(geos[0], this.S.m.rock, this.rocksAt.length), qq = new THREE.Quaternion(); this.rocksAt.forEach(([x, z, sz], i) => { qq.setFromEuler(new THREE.Euler(R(-.3, .3), R(0, 6), R(-.3, .3))); m4set(ri, i, new V3(x, this.H(x, z) - sz * .25, z), qq, new V3(sz * R(1, 1.4), sz * .6, sz)); }); ri.receiveShadow = true; this.root.add(ri); }
    for (const [x, z, sc] of this.ferns) this.fernAt(x, z, sc);
    const ls = this.leaves; ls.forEach(l => l.rank = rnd()); ls.sort((a, b) => a.rank - b.rank);
    const g = leafGeometry(PHONE(this.tier)), m4 = new THREE.Matrix4(), im = new THREE.InstancedMesh(g, this.M.leaf, Math.max(1, ls.length));
    ls.forEach((l, i) => { m4.compose(l.p, l.q, new V3(l.sx, l.sy, 1)); im.setMatrixAt(i, m4); im.setColorAt(i, l.c); });
    im.castShadow = this.tier === 'desktop'; im.receiveShadow = true; this.leafMesh = im; this.leafAll = ls.length; this.root.add(im); this.leaves = null;
  }
  setTier(id) { if (this.meadowMesh) this.meadowMesh.count = Math.floor(this.meadowAll * ({ 'desktop': 1, 'mobile-high': .3, 'mobile-low': .18 }[id] ?? 1)); if (!this.leafMesh) return; const k = (LEAF_BUDGET[id] ?? 1) / this.leafK; this.leafMesh.count = Math.max(1, Math.floor(this.leafAll * Math.min(1, k))); this.leafMesh.castShadow = id === 'desktop'; }

  // the concept's morning grade over the garden's day light (DayNight re-applies its own values first, every frame)
  mood() {
    const g = this.g, w = this.W, s = g.scene, dn = g.dayNight, u = w.sky?.material?.uniforms;
    if (!dn || !s.fog || !w.hemi || !w.sun) return;
    dn.lastN = null; if (w.space !== 'garden') return;
    if (!this.ppDone && performance.now() - (this.ppAt || 0) > 500) { this.ppAt = performance.now(); this.lateHide(); }
    const k = Math.max(0, 1 - (dn.n || 0) * 2), t = new THREE.Color();   // the morning grade fades out through dusk; the night stays DayNight's
    s.fog.color.lerp(MOOD.fog, k); s.background?.copy?.(s.fog.color); g.renderer.setClearColor(s.fog.color, 1); if (u?.uH) u.uH.value.copy(s.fog.color); if (u?.uZ) u.uZ.value.lerp(MOOD.zenith, k);
    s.fog.near = lerp(s.fog.near, MOOD.near, k); s.fog.far = lerp(s.fog.far, MOOD.far, k);
    w.hemi.color.lerp(MOOD.hemiSky, k); w.hemi.groundColor.lerp(MOOD.hemiGround, k); w.hemi.intensity = lerp(w.hemi.intensity, MOOD.hemiI, k);
    w.sun.color.lerp(MOOD.sunC, k); w.sun.intensity = lerp(w.sun.intensity, MOOD.sunI, k);
    g.renderer.toneMappingExposure = lerp(g.renderer.toneMappingExposure, MOOD.exposure, k); if (s.environmentIntensity !== undefined) s.environmentIntensity = lerp(s.environmentIntensity, MOOD.env, k); void t;
  }
  restore() { this.root.removeFromParent(); for (const f of this.undo.splice(0).reverse()) try { f(); } catch {} if (this.g.dayNight) this.g.dayNight.lastN = null; }
  stats() { return { leaves: this.leafMesh?.count || 0, hidden: this.undo.length, plants: this.S.plants?.stats?.(), treeCols: this.treeCols || 0 }; }
}

// ======================================================================================================================
// R179 (Jannik's overnight GO 16/10: 'expand, add, fix; make it WOW'): the shared world in the concept look while
// ?ring=premium is on, the same way the garden got it (R158): nothing is moved. The world's 1,200 low-poly conifers and
// round trees become Jannik's GLB trees on their own spots (instanced, near/far LOD, the Root Bear grove's cleared core
// stays clear), their colliders shrink to the new trunks, the terrain is graded to the concept's loam and moss (paths and
// water kept), and the concept's morning grade lies over DayNight with a longer view than the garden's. restore() puts
// every original back. Fails soft: any error restores the world.
// ======================================================================================================================
const WMOOD = { near: 12, far: 118 };
export class WorldEnvironment {
  constructor(S) {
    this.S = S; this.g = S.g; this.W = this.g.world; this.L = this.W.sharedLandscape; this.undo = [];
    if (!this.L?.forestItems?.length || !S.plants) throw Error('no world forest or plants');
    this.forest(); this.ground(); this.stones(); this.water(); this.motes();
    try { this.grass = new WorldGrass(this); } catch (e) { console.warn('[TGW] world grass failed; world without it', e); this.grass?.dispose?.(); this.grass = null; }
  }
  forest() {
    const L = this.L, P = S_P(this.S), sc = new V3(), f = this.field = new PlantField(this.g, P, this.S.tierId, { nearShadowOnly: true });
    const kinds = { conifer: ['tree_b', 'tree_c'], round: ['tree_a', 'tree_c'] }, trunk = {};
    const trunkR = k => { if (trunk[k] != null) return trunk[k]; const h = P[k].h, rs = []; for (const pt of P[k].lod[0]) { if (!/bark/i.test(pt.material?.name || '')) continue; const a = pt.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const y = a.getY(i) / h; if (y >= .05 && y < .1) rs.push(Math.hypot(a.getX(i), a.getZ(i))); } } rs.sort((a, b) => a - b); return (trunk[k] = rs.length ? rs[(rs.length * .9) | 0] : .4); };
    for (const it of L.forestItems) {
      const list = it.k < 4 ? kinds.conifer : kinds.round, k = list[(it.i + it.k) % 2]; if (!P[k]) continue;
      const height = 3.6 * it.s * 1.25, s = height / P[k].h;
      f.add(k, it.x, it.y + .1, it.z, it.ry, s, it);
      if (it.o) { const r0 = it.o.r; it.o.r = Math.max(.3, trunkR(k) * s); this.undo.push(() => { it.o.r = r0; }); }
    }
    for (const m of L.forestMeshes || []) if (m && m.visible) { m.visible = false; this.undo.push(() => { m.visible = true; }); }
    f.build(L.root); this.undo.push(() => f.root.removeFromParent());
  }
  // the dry-stone walls and the viewpoint's boulders become the concept's rounded, moss-capped rocks on the same transforms
  stones() {
    const geos = this.S.rockGeos; if (!geos?.length) return; const list = geos.map(() => []), m4 = new THREE.Matrix4(), sc = new THREE.Matrix4(), r = rng(29);
    this.L.root.traverse(o => {
      if (o.isInstancedMesh && o.name === 'WORLD_V2_CLAUDE_DRY_STONE_WALLS' && o.visible) { const gs = o.geometry.boundingSphere || (o.geometry.computeBoundingSphere(), o.geometry.boundingSphere), k0 = gs.radius * .8; sc.makeScale(k0, k0, k0);
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); if (Math.hypot(m4.elements[0], m4.elements[1], m4.elements[2]) < .01) continue; list[(r() * geos.length) | 0].push(m4.clone().multiply(sc).premultiply(o.matrixWorld)); }
        o.visible = false; this.undo.push(() => { o.visible = true; }); }
      else if (o.isMesh && !o.isInstancedMesh && o.geometry?.type === 'IcosahedronGeometry' && o.material?.color?.getHex?.() === 0x8e8a7e && o.visible) { o.updateWorldMatrix(true, false); const rad = o.geometry.parameters.radius || 1; list[(r() * geos.length) | 0].push(o.matrixWorld.clone().multiply(sc.makeScale(rad, rad, rad))); o.visible = false; this.undo.push(() => { o.visible = true; }); } });
    const grp = new THREE.Group(); grp.name = 'R180_WORLD_ROCKS';
    list.forEach((Lm, k) => { if (!Lm.length) return; const im = new THREE.InstancedMesh(geos[k], this.S.m.rock, Lm.length); Lm.forEach((mm, i) => im.setMatrixAt(i, mm)); im.castShadow = this.S.tierId === 'desktop'; im.receiveShadow = true; grp.add(im); });
    this.L.root.add(grp); this.undo.push(() => grp.removeFromParent()); this.rockCount = list.reduce((a, b) => a + b.length, 0);
  }
  // the lake, pond and river in the concept's dark, still water (the garden pond's look)
  water() {
    const w = this.L.water?.material; if (!w) return; const k = { c: w.color.clone(), o: w.opacity, r: w.roughness, e: w.envMapIntensity };
    w.color.set('#2f4a46'); w.opacity = .92; w.roughness = .05; w.envMapIntensity = 1.1; w.needsUpdate = true;
    this.undo.push(() => { w.color.copy(k.c); w.opacity = k.o; w.roughness = k.r; w.envMapIntensity = k.e; w.needsUpdate = true; });
  }
  // warm pollen motes drifting around the player (the garden has them at the Ring); each one that falls 14 m behind is reborn ahead
  motes() {
    const n = this.S.tierId === 'desktop' ? 260 : 110, pos = new Float32Array(n * 3), r = rng(41); this.mv = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (r() - .5) * 26; pos[i * 3 + 1] = .4 + r() * 3.2; pos[i * 3 + 2] = (r() - .5) * 26; this.mv[i * 3] = (r() - .5) * .25; this.mv[i * 3 + 1] = (r() - .5) * .08; this.mv[i * 3 + 2] = (r() - .5) * .25; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.boundingSphere = new THREE.Sphere(new V3(), 1e5);
    const pts = this.motePts = new THREE.Points(g, new THREE.PointsMaterial({ size: .05, map: this.S.T.radial, color: '#ffe2a0', transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.renderOrder = 5; pts.frustumCulled = false; pts.name = 'R180_WORLD_MOTES'; this.L.root.add(pts); this.undo.push(() => pts.removeFromParent()); this.moteInit = false;
  }
  moteUpdate(dt) {
    const pts = this.motePts, p = this.g.character?.position; if (!pts || !p) return; const a = pts.geometry.attributes.position, A = a.array, v = this.mv, t = performance.now() / 1000, day = Math.max(0, 1 - (this.g.dayNight?.n || 0) * 1.5);
    if (!this.moteInit) { for (let i = 0; i < a.count; i++) { A[i * 3] += p.x; A[i * 3 + 2] += p.z; A[i * 3 + 1] += this.L.groundHeight(A[i * 3], A[i * 3 + 2]); } this.moteInit = true; }
    for (let i = 0; i < a.count; i++) { const j = i * 3; A[j] += (v[j] + Math.sin(t * .7 + i) * .08) * dt; A[j + 1] += (v[j + 1] + Math.sin(t * 1.3 + i * 1.7) * .05) * dt; A[j + 2] += (v[j + 2] + Math.cos(t * .6 + i) * .08) * dt;
      const dx = A[j] - p.x, dz = A[j + 2] - p.z; if (dx * dx + dz * dz > 196) { A[j] = p.x - dx * .85; A[j + 2] = p.z - dz * .85; A[j + 1] = this.L.groundHeight(A[j], A[j + 2]) + .4 + Math.random() * 3.2; } }
    a.needsUpdate = true; pts.material.opacity = .8 * day; pts.visible = day > .02;
  }
  // the terrain's vertex colours in the concept palette: moss and loam on the grass, trodden loam on the paths, water/shore kept
  ground() {
    const t = this.L.terrain; if (!t?.geometry?.attributes?.color) return;
    const col = t.geometry.attributes.color, pos = t.geometry.attributes.position, orig = col.array.slice(), c = new THREE.Color(), path = C('#6e5c40'), path2 = C('#8a7656');
    for (let i = 0; i < col.count; i++) { c.fromBufferAttribute(col, i); const x = pos.getX(i), z = pos.getZ(i);
      if (c.b > c.r * .95 && c.b > .25) continue;   // water bed / wet shore
      const pd = this.L.pathDistance(x, z);
      if (pd < 2.6) { const n = fbm(x * .4, z * .4); c.copy(path).lerp(path2, n * .7).multiplyScalar(.82 + .25 * fbm(x * 1.3 + 3, z * 1.3)); if (pd > 1.6) { const g = gradeGround(new THREE.Color().fromBufferAttribute(col, i), x, z); c.lerp(g, ss(1.6, 2.6, pd)); } }
      else gradeGround(c, x, z);
      col.setXYZ(i, c.r, c.g, c.b); }
    col.needsUpdate = true; this.undo.push(() => { col.array.set(orig); col.needsUpdate = true; });
  }
  // after DayNight: the concept's morning grade over the day part, with the world's longer view (the night stays DayNight's)
  mood() {
    const g = this.g, w = this.W, s = g.scene, dn = g.dayNight, u = w.sky?.material?.uniforms;
    if (!dn || !s.fog || !w.hemi || !w.sun) return; dn.lastN = null;
    const k = Math.max(0, 1 - (dn.n || 0) * 2);
    s.fog.color.lerp(MOOD.fog, k); s.background?.copy?.(s.fog.color); g.renderer.setClearColor(s.fog.color, 1); if (u?.uH) u.uH.value.copy(s.fog.color); if (u?.uZ) u.uZ.value.lerp(MOOD.zenith, k);
    s.fog.near = lerp(s.fog.near, WMOOD.near, k); s.fog.far = lerp(s.fog.far, WMOOD.far, k);
    w.hemi.color.lerp(MOOD.hemiSky, k); w.hemi.groundColor.lerp(MOOD.hemiGround, k); w.hemi.intensity = lerp(w.hemi.intensity, MOOD.hemiI, k);
    w.sun.color.lerp(MOOD.sunC, k); w.sun.intensity = lerp(w.sun.intensity, MOOD.sunI, k);
    g.renderer.toneMappingExposure = lerp(g.renderer.toneMappingExposure, MOOD.exposure, k); if (s.environmentIntensity !== undefined) s.environmentIntensity = lerp(s.environmentIntensity, MOOD.env, k);
  }
  update(dt) { this.mood(); this.field?.update(dt); this.grass?.update(dt); this.moteUpdate(Math.min(dt, .1)); }
  restore() { try { this.grass?.dispose(); } catch {} this.grass = null; for (const f of this.undo.splice(0).reverse()) try { f(); } catch {} if (this.g.dayNight) this.g.dayNight.lastN = null; }
  stats() { return { trees: this.field?.items.length || 0, drawn: this.field?.stats().drawn || 0, rocks: this.rockCount || 0, grass: this.grass?.stats() }; }
}
function S_P(S) { return S.plants.P; }

// R179: the concept's sculpted grass in the shared world, in 8 m chunks around the player (the world is 500 m wide, so it
// cannot be one field like the garden's). Each chunk is built once at full density with its blades in random order and
// cached; how many of them are drawn falls off with the chunk's ring (dense at the feet, sparse into the haze). New chunks
// are built a few per frame, so walking never stalls. Grass only grows where the world's own ground colour is grass (paths,
// gravel, sand, soil, water stay clear), never on decks/floors, inside solid buildings, or in the home's yard.
const GC = 8;
class WorldGrass {
  constructor(E) {
    this.E = E; this.g = E.g; this.W = E.W; this.L = E.L; this.S = E.S; const desk = this.S.tierId === 'desktop';
    this.R = desk ? 3 : 2; this.max = Math.round(GC * GC * (desk ? 70 : 34)); this.dens = desk ? [1, .42, .14, .06] : [1, .32, .1];
    this.root = new THREE.Group(); this.root.name = 'R179_WORLD_GRASS'; this.L.root.add(this.root);
    this.cache = new Map(); this.live = new Map(); this.pool = []; this.queue = []; this.cx = null; this.cz = null; this.tmpC = new THREE.Color();
    const seg = 4, pos = [], col = [], nor = [], idx = []; for (let i = 0; i <= seg; i++) { const t = i / seg, w = .5 * (1 - t) + .04, c = C('#2a4219').lerp(C('#a8c460'), Math.pow(t, 1.1)); pos.push(-w, t, .3 * t * t, w, t, .3 * t * t); col.push(c.r, c.g, c.b, c.r, c.g, c.b); nor.push(-.15, 1, .25, .15, 1, .25); }
    for (let i = 0; i < seg; i++) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    const g = this.geo = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
    const S = this.S, W = this.W, mat = this.mat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .78 }), { translucency: desk ? .45 : 0, lift: .03, U: S.U });
    const inner = mat.onBeforeCompile; mat.onBeforeCompile = sh => { inner(sh); sh.uniforms.uPlayer = W.uPlayer; sh.uniforms.uTime = S.U.time;
      sh.vertexShader = 'uniform vec3 uPlayer;\n' + sh.vertexShader.replace('uniform float uTime;\n', '').replace('#include <project_vertex>', `
 vec4 gw = modelMatrix * instanceMatrix * vec4(transformed, 1.0); float hh = max(position.y, 0.0); hh *= hh;
 float wv = sin(uTime * 1.6 + gw.x * .35 + gw.z * .25) * .6 + sin(uTime * 2.7 + gw.x * .9 - gw.z * .7) * .25 + .35; gw.x += wv * .07 * hh; gw.z += wv * .045 * hh;
 vec2 dp = gw.xz - uPlayer.xz; float dl = length(dp), push = (1.0 - smoothstep(0.0, .78, dl)) * .34 * hh; gw.xz += normalize(dp + vec2(1e-4)) * push; gw.y -= push * .55;
 vec4 mvPosition = viewMatrix * gw; gl_Position = projectionMatrix * mvPosition;`);
      if (!/uniform float uTime/.test(sh.vertexShader)) sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader; };
    mat.customProgramCacheKey = () => `r179-world-grass-${S.tierId}`;
    const home = this.g.homePortal?.worldHome; this.homeBox = home ? new THREE.Box3().setFromObject(home).expandByScalar(.4) : null;
  }
  ok(x, z, y) {
    const L = this.L, c = this.tmpC;
    if (y < L.WL + .18) return false;
    if (L.groundHeight(x, z) - y > .03) return false;   // a deck, floor or bridge
    if (this.homeBox && x > this.homeBox.min.x && x < this.homeBox.max.x && z > this.homeBox.min.z && z < this.homeBox.max.z) return false;
    for (const r of L.solidRects || []) if (x > r.minX - .3 && x < r.maxX + .3 && z > r.minZ - .3 && z < r.maxZ + .3) return false;
    L.worldColor(x, z, y, c); return c.g > c.r * 1.06 && c.g > c.b * 1.2;   // the world's own colour says grass
  }
  build(key, cx, cz) {
    // heights and the grass test on a 0.5 m grid (17 x 17 per chunk), blades interpolate it: ~20x cheaper than per blade
    const L = this.L, out = [], r = rng((cx * 73856093) ^ (cz * 19349663)), x0 = cx * GC, z0 = cz * GC, N = 17, st = GC / (N - 1), hy = new Float32Array(N * N), okg = new Uint8Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = x0 + i * st, z = z0 + j * st, y = L.terrainHeight(x, z); hy[j * N + i] = y; okg[j * N + i] = this.ok(x, z, y) ? 1 : 0; }
    for (let a = 0; a < this.max * 1.6 && out.length < this.max; a++) { const fx = r() * (N - 1), fz = r() * (N - 1), i = Math.min(N - 2, fx | 0), j = Math.min(N - 2, fz | 0), u = fx - i, v = fz - j, k = j * N + i;
      if (!(okg[k] && okg[k + 1] && okg[k + N] && okg[k + N + 1])) continue;
      const x = x0 + fx * st, z = z0 + fz * st; if (r() > ss(.2, .55, fbm(x * .3 + 3, z * .3)) * .85 + .15) continue;
      const y = (hy[k] * (1 - u) + hy[k + 1] * u) * (1 - v) + (hy[k + N] * (1 - u) + hy[k + N + 1] * u) * v; out.push([x, y, z]); }
    const m = new Float32Array(out.length * 16), col = new Float32Array(out.length * 3), q = new THREE.Quaternion(), e = new THREE.Euler(), M = new THREE.Matrix4(), c = new THREE.Color();
    out.forEach(([x, y, z], i) => { const h = (.16 + r() * .22) * (1 + .35 * ss(.5, .75, fbm(x * .2, z * .2))), w = .035 + r() * .02; e.set((r() - .5) * .4, r() * 6.28, (r() - .5) * .4); q.setFromEuler(e);
      M.compose(new V3(x, y - .01, z), q, new V3(w, h, h)); M.toArray(m, i * 16); c.set('#ffffff').lerp(C('#e6dd96'), fbm(x * .3 + 9, z * .3) * .55).multiplyScalar(.72 + r() * .36); c.toArray(col, i * 3); });
    const d = { m, col, n: out.length }; this.cache.set(key, d); if (this.cache.size > 160) this.cache.delete(this.cache.keys().next().value); return d;
  }
  mesh() { let im = this.pool.pop(); if (!im) { im = new THREE.InstancedMesh(this.geo, this.mat, this.max); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.max * 3), 3); im.frustumCulled = false; im.receiveShadow = true; im.count = 0; this.root.add(im); } im.visible = true; return im; }
  fill(im, d) { im.instanceMatrix.array.set(d.m); im.instanceColor.array.set(d.col); im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.userData.n = d.n;
    if (d.n) { im.geometry.boundingSphere = null; } }
  update() {
    const p = this.g.character?.position; if (!p) return; const cx = Math.floor(p.x / GC), cz = Math.floor(p.z / GC);
    if (cx !== this.cx || cz !== this.cz) { this.cx = cx; this.cz = cz; const want = new Map();
      for (let dz = -this.R; dz <= this.R; dz++) for (let dx = -this.R; dx <= this.R; dx++) want.set(`${cx + dx},${cz + dz}`, [cx + dx, cz + dz, Math.max(Math.abs(dx), Math.abs(dz))]);
      for (const [k, im] of this.live) if (!want.has(k)) { im.visible = false; im.count = 0; this.pool.push(im); this.live.delete(k); }
      this.queue = [...want].filter(([k]) => !this.live.has(k)).sort((a, b) => a[1][2] - b[1][2]);
      for (const [k, [, , ring]] of want) { const im = this.live.get(k); if (im) im.count = Math.round((im.userData.n || 0) * this.dens[ring]); } }
    const t0 = performance.now();   // build new chunks for up to ~3 ms a frame (at least one); cached ones cost nothing
    while (this.queue.length && (performance.now() - t0 < 3 || t0 === performance.now())) { const [k, [x, z, ring]] = this.queue.shift(); let d = this.cache.get(k); if (!d) d = this.build(k, x, z);
      const im = this.mesh(); this.fill(im, d); im.count = Math.round(d.n * this.dens[ring]); this.live.set(k, im); }
  }
  dispose() { this.root.removeFromParent(); for (const im of [...this.live.values(), ...this.pool]) im.dispose?.(); this.geo.dispose(); this.mat.dispose(); }
  stats() { let n = 0; for (const im of this.live.values()) n += im.count; return { chunks: this.live.size, blades: n, queued: this.queue.length }; }
}
