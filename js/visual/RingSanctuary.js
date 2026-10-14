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
const OUTER = 3.4;   // radius of the sanctuary ground (the garden's own grass is cleared inside it); the pine at 3.3 m, the shrubs and the pond stay the garden's

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
    if (translucency) s.fragmentShader = 'uniform vec3 uSunView;uniform vec3 uSunCol;uniform float uDay;\n' + s.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
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

export class RingSanctuary {
  // spot: the CharacterSwapSpot (its group `m` is the local frame; its model holds Pot_<id>); ids: the nine characters
  constructor(spot, ids) {
    this.s = spot; this.g = spot.g; this.ids = ids; rnd = rng(11);
    this.tierId = TIERS[this.g.quality?.id] ? this.g.quality.id : (this.g.input?.isTouch ? 'mobile-high' : 'desktop');
    this.T = makeTextures(); this.U = { sunView: { value: new V3(0, 1, 0) }, sunCol: { value: C('#ffe3b8').multiplyScalar(.9) }, time: { value: 0 }, day: { value: 1 } }; this.sunBase = 2.7; this.sunCol0 = this.U.sunCol.value.clone();   // GardenEnvironment's day sun (DayNight's night sun is 1.15)
    this.root = new THREE.Group(); this.root.name = 'R157_RING_SANCTUARY'; spot.m.add(this.root);
    this.pods = new Map(); this.cast = []; this.glows = []; this.seams = []; this.t0 = performance.now(); this.clearR = OUTER;
    const W = this.g.world; this.H = (lx, lz) => { const v = new V3(lx, 0, lz); spot.m.localToWorld(v); return (W.gardenHeight?.(v.x, v.z) || 0); };
    this.blockers(); this.mats(); this.terrain(); this.flagstones(); this.podsBuild(); this.foliage(); this.grass(); this.atmosphere(); this.hideClassic(); this.batch();
    try { this.env = new RingEnvironment(this); } catch (e) { console.warn('[TGW] ring environment failed; garden kept', e); try { this.env?.restore(); } catch {} this.g.world.privateRoot.getObjectByName('R158_RING_ENVIRONMENT')?.removeFromParent(); this.env = null; }
    this.setTier(this.tierId);
    this.buildMs = performance.now() - this.t0;
  }
  mats() {
    const T = this.T, U = this.U, phys = TIERS[this.tierId].petals === 'physical';
    this.m = {
      bark: new THREE.MeshStandardMaterial({ color: '#7a5a40', map: T.bark, bumpMap: T.barkBump, bumpScale: 3, roughness: .92 }),
      root: new THREE.MeshStandardMaterial({ color: '#c4ae8c', map: T.bark, bumpMap: T.barkBump, bumpScale: 2, roughness: .8 }),
      husk: new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .9, map: T.bark, bumpMap: T.barkBump, bumpScale: 1.5 }),
      petal: patch(phys ? new THREE.MeshPhysicalMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .55, sheen: .6, sheenColor: C('#ffd9a8'), emissive: C('#ff8a30'), emissiveMap: T.petalGlow, emissiveIntensity: .9, bumpMap: T.grain, bumpScale: .6 })
        : new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .55, emissive: C('#ff8a30'), emissiveMap: T.petalGlow, emissiveIntensity: .95 }), { translucency: .8, U }),
      ember: new THREE.MeshStandardMaterial({ color: '#5a2a10', emissive: C('#ff9a30'), emissiveIntensity: 2.6 }),
      moss: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .97, bumpMap: T.grain, bumpScale: 3 }),
      stone: new THREE.MeshStandardMaterial({ color: '#b0a790', roughness: .86, bumpMap: T.grain, bumpScale: 2 }),
      rock: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, bumpMap: T.grain, bumpScale: 2.5 }),
      leaf: patch(new THREE.MeshStandardMaterial({ map: T.leaf, alphaTest: .5, side: THREE.DoubleSide, roughness: .6 }), { translucency: .7, wind: .5, lift: .22, U }),
      grass: patch(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .75 }), { translucency: .45, wind: .07, lift: .03, U }),
      lantern: new THREE.MeshStandardMaterial({ color: '#ffcf8a', emissive: C('#f2a93b'), emissiveIntensity: 1.6, roughness: .4 }),
      cap: new THREE.MeshStandardMaterial({ color: '#c8603a', roughness: .5 }), stem: new THREE.MeshStandardMaterial({ color: '#efe3c8', roughness: .7 })
    };
    this.m.petal.userData.phys = phys;
  }
  add(geo, mat, cast = true, recv = true, parent = this.root) { const o = new THREE.Mesh(geo, mat); o.castShadow = cast; o.receiveShadow = recv; if (cast) this.cast.push(o); parent.add(o); return o; }

  // ---------- ground: a polar patch that follows the mound (gardenHeight) and melts into the garden ground at the edge ----------
  terrain() {
    const rings = 46, segs = 120, pos = [], col = [], idx = [], W = this.g.world, wv = new V3(), gc = new THREE.Color();
    const soil = C('#4a3526'), grass = C('#4c6629'), mossC = C('#3d5522'), joint = C('#4a5a2a'), dust = C('#8b7858');
    for (let i = 0; i <= rings; i++) { const r = Math.pow(i / rings, 1.25) * OUTER;
      for (let j = 0; j <= segs; j++) { const a = j / segs * Math.PI * 2, x = Math.sin(a) * r, z = Math.cos(a) * r, edge = ss(OUTER * .78, OUTER, r);
        const y = this.H(x, z) + (fbm(x * 1.4, z * 1.4) - .5) * .03 * (1 - edge) + .008;
        const pm = this.pathMask(x, z); wv.set(x, 0, z); this.s.m.localToWorld(wv); W.groundColorAt?.(wv.x, wv.z, gc);
        // the garden's own ground colour, deepened toward the concept's mossy green on the mound, bare loam under each pod, dusty joints on the path
        const c = gc.clone().lerp(grass, .35 * (1 - edge)); c.lerp(mossC, Math.exp(-(r * r) / 2.2) * .55 * (1 - edge));
        let pod = 0; for (const q of this.potLocal()) { const d = Math.hypot(x - q.x, z - q.z); pod = Math.max(pod, Math.exp(-(d * d) / .09)); }
        c.lerp(soil, pod * .75); c.lerp(joint.clone().lerp(dust, fbm(x * 3, z * 3) * .8), pm * .85);
        c.multiplyScalar((1 - .25 * pod) * (.88 + .24 * fbm(x * 1.7, z * 1.7)));
        pos.push(x, y, z); col.push(c.r, c.g, c.b); } }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) { const a = i * (segs + 1) + j, b = a + segs + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    this.T.grain.repeat.set(14, 14);
    this.ground = this.add(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .97, bumpMap: this.T.grain, bumpScale: 1.2 }), false, true); this.ground.name = 'R157_GROUND';
  }
  // the stone circle path (between the stone and the pods) and the lane out over the steps (+z) toward the garden path
  pathMask(x, z) { const r = Math.hypot(x, z), ring = 1 - ss(.16, .3, Math.abs(r - 1.0)), lane = (1 - ss(.22, .38, Math.abs(x))) * ss(.75, .95, z) * (1 - ss(4.6, 5.4, z)); return Math.max(ring, lane); }
  // the pergola's post spots (their round colliders, kind ring-pot, r .14) in ring-local space
  postLocal() { const v = new V3(), out = []; for (const c of this.s.potColliders || []) { if (c.kind !== 'ring-pot' || c.r > .2) continue; v.set(c.x, 0, c.z); this.s.m.worldToLocal(v); out.push({ x: v.x, z: v.z }); } return out; }
  // undo what lives outside the ring group (the arch colliders, the garden-wide environment)
  dispose() { try { this.env?.restore(); } catch {} this.env = null; const W = this.g.world; for (const c of this.archCols || []) { const i = W.colliders.indexOf(c); if (i >= 0) W.colliders.splice(i, 1); } this.archCols = []; }
  potLocal() {
    if (this._pots) return this._pots; const M = this.s.model, v = new V3(); this._pots = [];
    if (M) { M.updateMatrixWorld(true); for (const id of this.ids) { const p = M.getObjectByName(`Pot_${id}`); if (!p) continue; p.getWorldPosition(v); this.s.m.worldToLocal(v); this._pots.push({ id, x: v.x, z: v.z, y: v.y }); } }
    return this._pots;
  }

  // the garden's own props near the ring (trees, rocks, shrubs: their colliders) in ring-local space; nothing of ours grows through them
  blockers() { const W = this.g.world, v = new V3(); this.blk = [];
    for (const c of W.colliders || []) { if ((c.space || 'garden') !== 'garden' || String(c.kind).startsWith('ring')) continue; v.set(c.x, 0, c.z); this.s.m.worldToLocal(v); if (Math.hypot(v.x, v.z) < OUTER + 1.2) this.blk.push([v.x, v.z, c.r || .3]); } }
  blocked(x, z, pad) { return this.blk.some(([bx, bz, r]) => Math.hypot(x - bx, z - bz) < r + pad); }
  flagstones() {
    const variants = []; for (let v = 0; v < 5; v++) { const s = new THREE.Shape(), n = 7; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + R(-.2, .2), r = R(.72, 1); i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      const g = new THREE.ExtrudeGeometry(s, { depth: .25, bevelEnabled: true, bevelThickness: .2, bevelSize: .17, bevelSegments: 2, curveSegments: 1 }); g.rotateX(-Math.PI / 2);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > .2) p.setY(i, p.getY(i) + (vn(p.getX(i) * 2 + v * 7, p.getZ(i) * 2) - .5) * .14); g.computeVertexNormals(); variants.push({ g, list: [] }); }
    const put = (x, z, s) => variants[(rnd() * variants.length) | 0].list.push([x, z, s]);
    const n = 22; for (let i = 0; i < n; i++) { if (rnd() < .06) continue; const a = i / n * Math.PI * 2 + R(-.03, .03), r = 1.0 + R(-.04, .04); if (Math.abs(Math.sin(a) * r) < .3 && Math.cos(a) > 0) continue; put(Math.sin(a) * r, Math.cos(a) * r, R(.12, .16)); }
    for (let z = 2.95; z < OUTER - .1; z += .4) { const x = .08 * Math.sin(z * 1.3); if (rnd() < .5) { put(x - .17, z, R(.12, .15)); put(x + .17, z + R(-.06, .06), R(.12, .15)); } else put(x + R(-.06, .06), z, R(.16, .2)); }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (const v of variants) { if (!v.list.length) continue; const im = new THREE.InstancedMesh(v.g, this.m.stone, v.list.length);
      v.list.forEach(([x, z, s], i) => { q.setFromEuler(new THREE.Euler(R(-.04, .04), R(0, 6.28), R(-.04, .04))); m4.compose(new V3(x, this.H(x, z) - .03, z), q, new V3(s, .15, s)); im.setMatrixAt(i, m4); im.setColorAt(i, C('#ffffff').multiplyScalar(R(.78, 1.08)).lerp(C('#c9c09a'), rnd() * .4)); });
      im.castShadow = false; im.receiveShadow = true; this.root.add(im); }
  }

  // ---------- the nine pods ----------
  podsBuild() {
    const S = .48, profile = closedProfile(30);
    for (const p of this.potLocal()) {
      const g = new THREE.Group(); g.name = `R157_POD_${p.id}`; g.position.set(p.x, this.H(p.x, p.z) - .01, p.z); g.rotation.y = Math.atan2(-p.x, -p.z); this.root.add(g);
      const s = new THREE.Group(); s.scale.setScalar(S); g.add(s); this.podS = S;
      this.add(moss(.62, .22, 3), this.m.moss, true, true, s).position.y = -.02;
      for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + R(-.3, .3), c = Math.cos(a), sn = Math.sin(a), L = R(.8, 1.1); this.add(taperTube([new V3(c * .28, .28, sn * .28), new V3(c * .55, .1, sn * .55), new V3(c * L, -.06, sn * L)], .07, .015, { radial: 6, seg: 10, lump: .2 }), this.m.root, true, true, s); }
      // open: cupped petals + a moss cushion for the character sprout (the GLB's Sprout_<id>) + a warm pool of light
      const open = new THREE.Group(); s.add(open); open.userData.full = 1.3;   // the open bloom is a little larger than the husk (as in the concept)
      this.add(petals(true, 6, 1.0, .36, ['#8a3a20', '#e0763f', '#ffe2bf'], R(0, 1)), this.m.petal, true, true, open);
      this.add(moss(.36, .42, 2), this.m.moss, false, true, open).position.y = .1;
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.T.radial, color: '#ff9a3c', transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
      pool.position.set(0, .07, .45); pool.renderOrder = 3; open.add(pool); this.glows.push(pool);
      // dormant: a closed husk with two glowing seams and spiral roots
      const closed = new THREE.Group(); s.add(closed);
      this.add(petals(false, 6, 0, .3, ['#4a3a2a', '#8a6e50', '#b09a78'], Math.PI / 2 + Math.PI / 6), this.m.husk, true, true, closed);
      for (const sa of [Math.PI / 2, Math.PI / 2 + Math.PI / 3 * 2]) { const pts = profile.filter((q, i) => i > 2 && i < 27).map(([r, y]) => new V3((r + .01) * Math.cos(sa), y, (r + .01) * Math.sin(sa))); const sm = this.add(taperTube(pts, .02, .01, { radial: 5, seg: 24, lump: .3 }), this.m.ember, false, false, closed); this.seams.push(sm); }
      for (const a0 of [R(0, 1), R(3, 4)]) { const pts = [new V3(.75 * Math.cos(a0 - .6), -.12, .75 * Math.sin(a0 - .6))]; for (let i = 0; i <= 16; i++) { const t = i / 16, v = .04 + t * .72, r = profile[Math.round(v * 30)][0] + .035, a = a0 + t * Math.PI * 2 * 1.35; pts.push(new V3(r * Math.cos(a), profile[Math.round(v * 30)][1], r * Math.sin(a))); }
        this.add(taperTube(pts, .055, .014, { radial: 6, seg: 48, lump: .25 }), this.m.root, true, true, closed); }
      // toadstools beside every other pod (instanced below)
      this.pods.set(p.id, { g, open, closed, k: 0, target: 0, base: p });
    }
  }
  // which pods are open (the Ring's own unlock list); a pod that is blooming (bloom) keeps animating toward it
  setOpen(openSet) {
    for (const [id, P] of this.pods) { const o = openSet.has(id) ? 1 : 0; P.target = o; if (!P.anim) P.k = o; this.applyPod(P); }
  }
  applyPod(P) { const e = P.k * P.k * (3 - 2 * P.k); P.open.visible = e > .02; P.open.scale.setScalar(Math.max(.02, e) * P.open.userData.full); P.closed.visible = e < .98; P.closed.scale.set(1 - e * .6, 1 - e, 1 - e * .6);
    const M = this.s.model, sp = M?.getObjectByName(`Sprout_${P.base.id}`), lock = M?.getObjectByName(`Lock_${P.base.id}`);
    if (sp) { sp.visible = e > .5; sp.position.y = .2; sp.scale.setScalar(Math.max(.01, ss(.5, 1, e))); }
    if (lock) lock.visible = e < .5; }

  // ---------- understory: leaf cards (ferns + bush clusters), rocks, toadstools, lantern stalks ----------
  foliage() {
    const leaves = [], Z = new V3(0, 0, 1), q2 = new THREE.Quaternion();
    const addLeaf = (p, n, sx, sy, c, roll) => { n = n.clone().normalize(); const q = new THREE.Quaternion().setFromUnitVectors(Z, n); q2.setFromAxisAngle(n, roll ?? R(0, 6.28)); q.premultiply(q2); leaves.push({ p: p.clone(), q, sx, sy, c }); };
    const cluster = (cx, cy, cz, rad, n, base, vr, size, flat = .75) => { for (let i = 0; i < n; i++) { const d = new V3(R(-1, 1), R(-1, 1) * flat, R(-1, 1)); if (d.length() > 1) { i--; continue; } const p = new V3(cx, cy, cz).addScaledVector(d, rad), nrm = d.clone().normalize().add(new V3(R(-.6, .6), R(-.3, .6), R(-.6, .6)));
      const c = C(base).lerp(C(vr), rnd() * rnd()); c.multiplyScalar(lerp(.8, 1.3, d.length() * (.5 + .5 * Math.max(0, d.y)))); const s = size * R(.75, 1.25); addLeaf(p, nrm, s * .7, s, c); } };
    const fern = (x, z, s) => { const y = this.H(x, z), n = 7 + (rnd() * 3 | 0); for (let f = 0; f < n; f++) { const a = f / n * 6.28 + R(-.3, .3), dir = new V3(Math.cos(a), 0, Math.sin(a)), L = R(.5, .75) * s, up = R(.35, .55) * s, side = new V3(-dir.z, 0, dir.x);
      for (let i = 1; i < 11; i++) { const t = i / 11, P = new V3(x, y, z).addScaledVector(dir, L * t).add(new V3(0, up * Math.sin(Math.PI * t * .85), 0));
        for (const sd of [-1, 1]) { const pp = P.clone().addScaledVector(side, sd * .02 * s), n2 = new V3(0, 1, 0).addScaledVector(dir, -.4 + t * .9).addScaledVector(side, sd * .3), lf = (1 - t * .65) * s; addLeaf(pp, n2, .05 * lf, .16 * lf, C('#5a8a32').lerp(C('#a6c25a'), t * .6 + rnd() * .2), Math.atan2(sd, 1) + sd * 1.2); } } } };
    const rocks = []; const rock = (x, z, s, sy = .6, sink = .35) => rocks.push([x, z, s, sy, sink]);
    const shrooms = []; const toad = (x, z) => { for (let i = 0; i < 3 + (rnd() * 2 | 0); i++) { const px = x + R(-.18, .18), pz = z + R(-.18, .18); shrooms.push([px, pz, R(.1, .2)]); } };
    const free = (x, z) => this.pathMask(x, z) < .2 && !(Math.abs(x) < .75 && z > 1.6) && !this.blocked(x, z, .35);   // keep the path, the steps lane and the garden's own props clear
    this.potLocal().forEach((p, i) => { const out = new V3(p.x, 0, p.z).normalize(), side = new V3(-out.z, 0, out.x);
      const f1 = [p.x + out.x * .95 + side.x * .55, p.z + out.z * .95 + side.z * .55]; if (free(...f1)) fern(f1[0], f1[1], R(.55, .7));
      if (i % 2 === 0) toad(p.x - out.x * .45 + side.x * .35, p.z - out.z * .45 + side.z * .35);
      for (let k = 0; k < 3; k++) { const a = R(0, 6.28), d = R(.32, .5); rock(p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, R(.05, .1)); } });
    // the outer bank: ferns and leafy clumps around the mound, never on the lane; a few under the pergola corners
    for (let i = 0; i < 22; i++) { const a = R(0, 6.28), r = R(2.7, 3.25), x = Math.sin(a) * r, z = Math.cos(a) * r; if (!free(x, z)) continue;
      if (rnd() < .55) fern(x, z, R(.6, .95)); else { const s = R(.6, 1); cluster(x, this.H(x, z) + .3 * s, z, .55 * s, (150 * s) | 0, '#33502a', '#6f8a3a', .17, .7); }
      if (rnd() < .5) rock(x + R(-.5, .5), z + R(-.5, .5), R(.12, .26)); }
    for (let i = 0; i < 6; i++) { const a = i * 1.1 + .3, r = R(2.65, 3.15), x = Math.cos(a) * r, z = Math.sin(a) * r; if (free(x, z)) toad(x, z); }
    // fallen petals and leaves on the stone circle
    for (let i = 0; i < 200; i++) { const a = R(0, 6.28), r = rnd() < .6 ? 1.0 + R(-.35, .35) : R(.7, 2.1), x = Math.sin(a) * r, z = Math.cos(a) * r; addLeaf(new V3(x, this.H(x, z) + .012, z), new V3(R(-.25, .25), 1, R(-.25, .25)), .04, .06, C(['#b0703a', '#c99a4a', '#8a5a2a', '#d8a060'][(rnd() * 4) | 0]).multiplyScalar(R(.7, 1))); }
    // R158: the pergola goes in premium; a concept lantern stalk stands on each of its post spots (the posts' colliders stay true)
    const posts = this.postLocal(); for (const { x, z } of posts) { const a = Math.atan2(x, z), y = this.H(x, z), ix = -Math.sin(a), iz = -Math.cos(a), top = new V3(x + ix * .35, y + 1.38, z + iz * .35);
      this.add(taperTube([new V3(x, y - .1, z), new V3(x + ix * .02, y + .66, z + iz * .02), new V3(x + ix * .09, y + 1.19, z + iz * .09), new V3(x + ix * .27, y + 1.37, z + iz * .27), top], .07, .016, { radial: 7, seg: 20, lump: .15, flare: .8 }), this.m.bark, TIERS[this.tierId].shadows === 'full', true);
      const bulb = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.05, .02], [.075, .08], [.06, .14], [.025, .18], [0, .19]].map(v => new THREE.Vector2(v[0], v[1])), 12), this.m.lantern); bulb.position.copy(top).add(new V3(0, -.27, 0)); this.root.add(bulb);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.T.radial, color: '#ffb35a', transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(.75); halo.position.copy(bulb.position).add(new V3(0, .09, 0)); halo.renderOrder = 6; this.root.add(halo); this.glows.push(halo);
      cluster(x, y + .12, z, .3, 60, '#41602a', '#7f9a3e', .14, .5); rock(x + R(-.2, .2), z + R(-.2, .2), R(.08, .12)); }
    // R158: the concept's vine arch frames the way up the steps (two solid legs beside the lane)
    { const z0 = 3.25, hy = this.H(0, z0); this.archCols = [];
      for (const sd of [-1, 1]) { const pts = [new V3(sd * .95, hy - .25, z0), new V3(sd * 1.0, hy + .9, z0), new V3(sd * .82, hy + 1.75, z0 + .05), new V3(sd * .4, hy + 2.28, z0), new V3(sd * .02, hy + 2.4, z0)];
        this.add(taperTube(pts, .13, .07, { radial: 10, seg: 26, lump: .2, flare: 1.2 }), this.m.bark, TIERS[this.tierId].shadows !== 'none', true);
        const cur = new THREE.CatmullRomCurve3(pts), vine = []; for (let i = 0; i <= 40; i++) { const t = i / 40, P = cur.getPointAt(t), a = t * 18 * sd; vine.push(P.clone().add(new V3(Math.cos(a) * .12, Math.sin(a) * .1, Math.sin(a) * .12))); }
        this.add(taperTube(vine, .03, .015, { radial: 5, seg: 60, lump: .2 }), this.m.bark, false, true);
        for (let i = 0; i < 70; i++) { const t = R(.15, 1), P = cur.getPointAt(t); addLeaf(P.clone().add(new V3(R(-.15, .15), R(-.1, .1), R(-.15, .15))), new V3(R(-1, 1), R(.2, 1), R(-1, 1)), .09, .13, C('#4d6e2a').lerp(C('#93a84a'), rnd())); }
        for (let i = 0; i < 3; i++) rock(sd * R(.8, 1.15), z0 + R(-.3, .3), R(.14, .24));
        const v = new V3(sd * .95, 0, z0); this.s.m.localToWorld(v); const c = { x: v.x, z: v.z, r: .16, kind: 'ring-arch', traversal: 'blocked', space: 'garden' }; this.g.world.colliders.push(c); this.archCols.push(c); } }
    // instanced leaves (one draw call), rocks (four), toadstools (two)
    this.leafAll = leaves; const g = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0), m4 = new THREE.Matrix4();
    const im = new THREE.InstancedMesh(g, this.m.leaf, leaves.length); leaves.forEach((l, i) => { m4.compose(l.p, l.q, new V3(l.sx, l.sy, 1)); im.setMatrixAt(i, m4); im.setColorAt(i, l.c); }); im.receiveShadow = true; im.castShadow = false; this.leaves = im; this.root.add(im);
    const rockGeos = [0, 1, 2, 3].map(v => { const gg = new THREE.IcosahedronGeometry(1, 2), p = gg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (fbm(x * 1.2 + y * .7 + v * 5, z * 1.2 - y * .9) - .5) * .75; p.setXYZ(i, x * k, Math.max(y * k, -.35), z * k); }
      gg.computeVertexNormals(); const n = gg.attributes.normal, col = []; for (let i = 0; i < p.count; i++) { const c = C('#958c78').lerp(C('#6f6857'), rnd() * .4).lerp(C('#4d6a26'), ss(.45, .85, n.getY(i)) * .85); col.push(c.r, c.g, c.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return gg; });
    const per = [[], [], [], []]; rocks.forEach(r => per[(rnd() * 4) | 0].push(r)); const q = new THREE.Quaternion();
    per.forEach((list, v) => { if (!list.length) return; const ri = new THREE.InstancedMesh(rockGeos[v], this.m.rock, list.length); list.forEach(([x, z, s, sy, sink], i) => { q.setFromEuler(new THREE.Euler(R(-.3, .3), R(0, 6), R(-.3, .3))); m4.compose(new V3(x, this.H(x, z) - s * sink * .6, z), q, new V3(s * R(.9, 1.3), s * sy, s)); ri.setMatrixAt(i, m4); }); ri.receiveShadow = true; ri.castShadow = TIERS[this.tierId].shadows === 'full'; this.root.add(ri); });
    const capGeo = new THREE.LatheGeometry([[0, .62], [.25, .6], [.45, .52], [.52, .4], [.48, .36], [.15, .4], [0, .42]].map(a => new THREE.Vector2(a[0], a[1])), 14), stemGeo = new THREE.LatheGeometry([[0, 0], [.13, 0], [.1, .2], [.09, .42], [0, .44]].map(a => new THREE.Vector2(a[0], a[1])), 8);
    for (const [geo, mat] of [[stemGeo, this.m.stem], [capGeo, this.m.cap]]) { const ti = new THREE.InstancedMesh(geo, mat, shrooms.length); shrooms.forEach(([x, z, s], i) => { q.setFromEuler(new THREE.Euler(R(-.15, .15), R(0, 6), R(-.15, .15))); m4.compose(new V3(x, this.H(x, z) - .01, z), q, new V3(s, s, s)); ti.setMatrixAt(i, m4); }); ti.receiveShadow = true; this.root.add(ti); }
    rnd = rng(77);
  }

  // ---------- sculpted grass blades (instanced, wind in the vertex shader, density per tier) ----------
  grass() {
    const seg = 4, pos = [], col = [], nor = [], idx = []; for (let i = 0; i <= seg; i++) { const t = i / seg, w = .5 * (1 - t) + .04, c = C('#2c4519').lerp(C('#a4c25a'), Math.pow(t, 1.1)); pos.push(-w, t, .3 * t * t, w, t, .3 * t * t); col.push(c.r, c.g, c.b, c.r, c.g, c.b); nor.push(-.15, 1, .25, .15, 1, .25); }
    for (let i = 0; i < seg; i++) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
    const max = TIERS.desktop.grass, items = [], pots = this.potLocal();
    for (let a = 0; a < max * 6 && items.length < max; a++) { const x = R(-OUTER, OUTER), z = R(-OUTER, OUTER), r = Math.hypot(x, z); if (r > OUTER * .97 || r < .72) continue;
      let d = ss(.3, .6, fbm(x * .9 + 3, z * .9)) * .9 + .1; d *= 1 - this.pathMask(x, z); if (Math.abs(x) < .62 && z > 1.7 && z < 3.0) d = 0;   // the steps
      for (const p of pots) { const dd = Math.hypot(x - p.x, z - p.z); if (dd < .3) d = 0; else if (dd < .55) d = Math.max(d, .7); }
      d *= ss(OUTER, OUTER * .6, r) * .85 + .15; if (r < 2.4) d *= .5; if (this.blocked(x, z, .1)) d = 0; if (rnd() > d) continue; items.push([x, z, rnd()]); }
    items.sort((a, b) => a[2] - b[2]);   // random order: lowering .count keeps an even spread
    const im = new THREE.InstancedMesh(g, this.m.grass, items.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    items.forEach(([x, z], i) => { const r = Math.hypot(x, z), h = R(.1, .2) + ss(2.2, 3.1, r) * R(.08, .2); e.set(R(-.25, .25), R(0, 6.28), R(-.25, .25)); q.setFromEuler(e); m4.compose(new V3(x, this.H(x, z) - .01, z), q, new V3(R(.03, .05), h, h)); im.setMatrixAt(i, m4);
      im.setColorAt(i, C('#ffffff').lerp(C('#e9d890'), fbm(x * .3 + 9, z * .3) * .45).multiplyScalar(R(.72, 1.05))); });
    im.receiveShadow = true; im.castShadow = false; this.grassMesh = im; this.root.add(im);
  }

  // ---------- atmosphere: motes over the ring, soft light shafts (desktop), pulsing seams ----------
  atmosphere() {
    const n = TIERS.desktop.motes, p = []; for (let i = 0; i < n; i++) { const a = R(0, 6.28), r = Math.sqrt(rnd()) * 3.4; p.push(Math.sin(a) * r, R(.25, 2.2) + this.H(Math.sin(a) * r, Math.cos(a) * r), Math.cos(a) * r); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    this.motes = new THREE.Points(g, new THREE.PointsMaterial({ size: .03, map: this.T.radial, color: '#ffe2a0', transparent: true, opacity: .85, depthWrite: false, blending: THREE.AdditiveBlending })); this.motes.renderOrder = 5; this.root.add(this.motes);
    this.shaftMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uK: { value: .05 }, uCol: { value: C('#ffe6b8') } },
      vertexShader: 'varying vec2 vU;varying float vF;void main(){vU=uv;vec3 n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vF=abs(dot(n,normalize(-mv.xyz)));gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform float uK;uniform vec3 uCol;varying vec2 vU;varying float vF;void main(){float a=uK*smoothstep(0.,.3,vU.y)*pow(1.-vU.y,.6)*pow(vF,2.5);gl_FragColor=vec4(uCol*a,1.);}' });
    this.shafts = [[-.9, .6], [1.1, -.4]].map(([x, z]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.22, .5, 5, 16, 1, true), this.shaftMat); m.userData.g = new V3(x, this.H(x, z), z); this.root.add(m); return m; });
  }

  // the classic pots, soil and mound give way to the sanctuary (sprouts, padlocks, stone, steps, pergola, vines and lanterns stay)
  hideClassic() {
    const M = this.s.model; if (!M) return;
    for (const id of this.ids) for (const n of [`Pot_${id}_Body`, `Pot_${id}_Earth`, `Soil_${id}`]) { const o = M.getObjectByName(n); if (o) o.visible = false; }
    for (const n of ['Mound', 'Ground_Moss', 'Pergola', 'Sign_Main']) { const o = M.getObjectByName(n); if (o) o.visible = false; }   // R158: the concept has no pergola or sign
    // the padlock moves to the front foot of its pod (it sat inside the pot)
    for (const P of this.pods.values()) { const lock = M.getObjectByName(`Lock_${P.base.id}`), pot = M.getObjectByName(`Pot_${P.base.id}`); if (!lock || !pot) continue;
      const v = new V3(P.base.x, 0, P.base.z).multiplyScalar(.74); v.y = this.H(v.x, v.z) + .12; this.s.m.localToWorld(v); pot.worldToLocal(v); lock.position.copy(v); lock.scale.setScalar(.8); }
  }

  // draw calls matter most on the iPhone: meshes that share a material are baked into one (pod bases + roots across all nine
  // pods, the lantern stalks, the bulbs; inside each pod its open bloom and its husk) so the ring costs ~60 calls, not ~150
  batch() {
    this.root.updateMatrixWorld(true); const inv = new THREE.Matrix4(), m = new THREE.Matrix4();
    const merge = (meshes, parent, pod) => { const by = new Map(); for (const o of meshes) { if (!o.isMesh || o.isInstancedMesh || this.glows.includes(o)) continue; (by.get(o.material) || by.set(o.material, []).get(o.material)).push(o); }
      inv.copy(parent.matrixWorld).invert();
      for (const [mat, list] of by) { if (list.length < 2) continue; const geos = list.map(o => { m.multiplyMatrices(inv, o.matrixWorld); return o.geometry.clone().applyMatrix4(m); });
        const geo = mergeGeometries(geos, false); if (!geo) continue; const cast = list.some(o => o.castShadow);
        for (const o of list) { o.removeFromParent(); o.geometry.dispose(); const i = this.cast.indexOf(o); if (i >= 0) this.cast.splice(i, 1); }
        const out = new THREE.Mesh(geo, mat); out.castShadow = cast; out.receiveShadow = true; out.userData.pod = pod; parent.add(out); if (cast) this.cast.push(out); } };
    const podBase = []; for (const P of this.pods.values()) { const s = P.open.parent; for (const o of s.children) if (o.isMesh) podBase.push(o); merge(P.open.children.slice(), P.open, true); merge(P.closed.children.slice(), P.closed, true); }
    merge(podBase, this.root, true); merge(this.root.children.filter(o => o.isMesh && (o.material === this.m.bark || o.material === this.m.lantern)), this.root, false);
  }
  setTier(id) {
    const t = TIERS[id] || TIERS.desktop; this.tierId = TIERS[id] ? id : 'desktop';
    if (this.grassMesh) this.grassMesh.count = Math.min(this.grassMesh.instanceMatrix.count, t.grass);
    if (this.leaves) this.leaves.count = Math.max(1, Math.floor(this.leafAll.length * t.leaves));
    if (this.motes) this.motes.geometry.setDrawRange(0, t.motes);
    for (const s of this.shafts || []) s.visible = t.shafts;
    for (const o of this.cast) o.castShadow = t.shadows === 'full' || (t.shadows === 'pods' && !!o.userData.pod);
    this.env?.setTier(this.tierId);
  }

  update(dt, camera) {
    const t = (performance.now() - this.t0) / 1000; this.U.time.value = t;
    if (this.env) try { this.env.mood(); } catch (e) { console.warn('[TGW] ring mood', e); this.env.restore(); this.env = null; }
    if (this.g.quality?.id && this.g.quality.id !== this.tierId) this.setTier(this.g.quality.id);
    const sun = this.g.world?.sun; if (sun) { const k = Math.min(1, Math.max(0, (sun.intensity - 1.15) / (this.sunBase - 1.15))); this.U.day.value = k; this.U.sunCol.value.copy(this.sunCol0).multiplyScalar(k); }   // night: no back-light glow
    const sd = this.g.world?.sunDir; if (sd && camera) this.U.sunView.value.copy(sd).transformDirection(camera.matrixWorldInverse);
    for (const P of this.pods.values()) if (P.k !== P.target) { P.k += Math.sign(P.target - P.k) * Math.min(Math.abs(P.target - P.k), Math.min(dt, .1) / 1.6); if (P.k === P.target) P.anim = false; this.applyPod(P); }
    const br = .5 + .5 * Math.sin(t * 2.1); this.m.ember.emissiveIntensity = 1.8 + 1.4 * br; for (const gl of this.glows) gl.material.opacity = .24 + .12 * br;
    if (this.motes) this.motes.rotation.y = t * .02;
    if (sd && this.shafts) for (const m of this.shafts) { if (!m.visible) continue; m.position.copy(m.userData.g).addScaledVector(sd, 2.4); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), sd); }
  }
  // the bloom moment when a Special Seed is planted: the husk parts, the petals unfold, sparks rise
  bloom(id) { const P = this.pods.get(id); if (!P) return; P.k = 0; P.target = 1; P.anim = true; this.applyPod(P);
    try { const v = new V3(); P.g.getWorldPosition(v); v.y += .5; this.g.fx?.burst?.(v, 0xffb35a, 18, 1.4); } catch {} }
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
const MOOD = { fog: C('#c8d3c3'), near: 6, far: 46, zenith: C('#86abc4'), hemiSky: C('#c6d8e2'), hemiGround: C('#5e4c2e'), hemiI: 1.05, sunC: C('#fff0d6'), sunI: 3.0, exposure: .98, env: .55 };
const LEAF_BUDGET = { 'desktop': 1, 'mobile-high': .4, 'mobile-low': .25 };

export class RingEnvironment {
  constructor(sanctuary) {
    this.S = sanctuary; this.g = sanctuary.g; this.W = this.g.world; this.undo = []; rnd = rng(23);
    this.root = new THREE.Group(); this.root.name = 'R158_RING_ENVIRONMENT'; this.W.privateRoot.add(this.root);
    this.leaves = []; this.bark = []; this.birch = [];
    this.tier = sanctuary.tierId; const k = LEAF_BUDGET[this.tier] ?? 1; this.leafK = k; this.leafSize = 1 / Math.sqrt(Math.max(.3, k));
    this.M = {
      bark: new THREE.MeshStandardMaterial({ color: '#6e5038', map: sanctuary.T.bark, bumpMap: sanctuary.T.barkBump, bumpScale: 3, roughness: .92 }),
      birch: new THREE.MeshStandardMaterial({ color: '#d9d2bf', map: sanctuary.T.bark, bumpMap: sanctuary.T.barkBump, bumpScale: 1.5, roughness: .85 }),
      leaf: patch(new THREE.MeshStandardMaterial({ map: sanctuary.T.leaf, alphaTest: .5, side: THREE.DoubleSide, roughness: .6 }), { translucency: .7, wind: .12, lift: .12, U: sanctuary.U })
    };
    this.trees(); this.backdrop(); this.shrubs(); this.ground(); this.stones(); this.grassTint(); this.finish();
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

  // ---------- the garden's eight trees -> concept oaks (round) and birches at their own spots; the one behind the Ring is the hero ----------
  trees() {
    const defs = this.W.treeDefs || [], ring = this.S.s.spot, kids = this.W.privateRoot.children;
    const bark = [0x675442, 0xd8d2bf], foliage = 0x718b4e;
    for (const o of kids) { if (!o.isMesh || o.isInstancedMesh) continue; const t = o.geometry?.type, hex = o.material?.color?.getHex?.();
      if ((t === 'CylinderGeometry' && bark.includes(hex)) || (t === 'IcosahedronGeometry' && hex === foliage)) { const near = defs.some(d => Math.hypot(o.position.x - d.x, o.position.z - d.z) < 2.2 * d.s); if (near) this.hide(o); } }
    let hero = null, best = 1e9; for (const d of defs) { const dd = Math.hypot(d.x - ring.x, d.z - ring.z); if (dd < best) { best = dd; hero = d; } }
    for (const d of defs) d.t === 'birch' ? this.birchTree(d.x, d.z, d.s) : this.oak(d.x, d.z, d === hero ? d.s * 1.05 : d.s * .82, d === hero);
  }
  oak(x, z, sc, hero) {
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
    for (const [x, z, s] of spots || []) { const y = this.H(x, z), ht = R(4.5, 6.5) * s;
      this.tube(this.bark, [new V3(x, y - .3, z), new V3(x + R(-.3, .3), y + ht * .5, z + R(-.3, .3)), new V3(x + R(-.4, .4), y + ht, z + R(-.4, .4))], R(.28, .4) * s, .1 * s, { radial: 7, seg: 10, lump: .15, flare: .6 });
      this.cluster(x, y + ht + .3, z, R(1.8, 2.4) * s, 260, '#2f4a26', '#5d7a34', .5, .65); this.cluster(x + R(-.8, .8), y + ht - 1.1, z + R(-.8, .8), 1.4 * s, 120, '#2f4a26', '#5d7a34', .45, .6); }
  }

  // ---------- the round shrubs (beds and garden edge) -> leafy concept clumps per shrub instance (masked instances stay away) ----------
  shrubs() {
    const m4 = new THREE.Matrix4(), v = new V3(), sc = new V3(), q = new THREE.Quaternion();
    for (const o of this.W.privateRoot.children) { if (!o.isInstancedMesh || o.geometry?.type !== 'IcosahedronGeometry') continue; const r = o.geometry.parameters.radius; if (r !== .55 && r !== .32) continue;
      for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); m4.decompose(v, q, sc); if (sc.x < .01) continue; const rad = r * sc.x * 1.05;
        this.cluster(v.x, v.y + rad * .1, v.z, rad, r === .55 ? 150 : 55, '#33502a', '#6f8a3a', r === .55 ? .17 : .12, .75); }
      this.hide(o); }
  }

  // ---------- ground: the garden's own colours graded to the concept's loam, moss and trodden paths (water and the pond bank keep theirs) ----------
  ground() {
    const mesh = this.W.privateRoot.children.find(o => o.isMesh && o.geometry?.type === 'PlaneGeometry' && o.geometry.parameters?.width === 36 && o.material?.vertexColors);
    if (!mesh) return; const col = mesh.geometry.attributes.color, pos = mesh.geometry.attributes.position, orig = col.array.slice(), c = new THREE.Color();
    const soil = C('#45311f'), moss = C('#3a5220'), grass = C('#4a6327'), loam = C('#4a3a27'), dust = C('#6e5c40');
    for (let i = 0; i < col.count; i++) { c.fromBufferAttribute(col, i); const x = pos.getX(i), z = pos.getZ(i);
      if (c.b > c.r * .95 && c.b > .25) continue;   // water
      const orange = c.r > c.g * 1.12, n1 = fbm(x * .35, z * .35), n2 = fbm(x * 1.3 + 5, z * 1.3);
      if (orange) { const k = Math.min(1, (c.r - c.g) * 4); c.lerp(loam.clone().lerp(dust, n2 * .7), .7 + .3 * k); }
      else { const t = grass.clone().lerp(moss, ss(.45, .7, n1)).lerp(soil, ss(.62, .82, n2) * .55); c.lerp(t, .85); }
      c.multiplyScalar(.74 + .22 * n2); col.setXYZ(i, c.r, c.g, c.b); }
    col.needsUpdate = true; this.undo.push(() => { col.array.set(orig); col.needsUpdate = true; });
  }
  // flat grey slab stones and boulders in the concept's warm sandstone
  stones() {
    this.W.privateRoot.traverse(o => { if (!o.isMesh || o.isInstancedMesh || o.geometry?.type !== 'DodecahedronGeometry' || !o.material?.color) return; const m = o.material, c0 = m.color.clone(), f = m.flatShading;
      m.color.lerp(C('#b0a790'), .7); this.undo.push(() => { m.color.copy(c0); }); if (f !== undefined) { m.flatShading = f; } });
  }
  // the garden's meadow grass toward the concept's olive-gold tint
  grassTint() {
    this.W.privateRoot.traverse(o => { if (o.userData?.calmType !== 'grass' || !o.material?.color) return; const m = o.material, c0 = m.color.clone(); m.color.set('#bdb87c'); this.undo.push(() => m.color.copy(c0)); });
  }

  finish() {
    const add = (list, mat, cast) => { if (!list.length) return; const g = mergeGeometries(list, false); list.forEach(x => x.dispose()); const m = new THREE.Mesh(g, mat); m.castShadow = cast; m.receiveShadow = true; this.root.add(m); };
    add(this.bark, this.M.bark, true); add(this.birch, this.M.birch, true);
    const ls = this.leaves; ls.forEach(l => l.rank = rnd()); ls.sort((a, b) => a.rank - b.rank);
    const g = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0), m4 = new THREE.Matrix4(), im = new THREE.InstancedMesh(g, this.M.leaf, Math.max(1, ls.length));
    ls.forEach((l, i) => { m4.compose(l.p, l.q, new V3(l.sx, l.sy, 1)); im.setMatrixAt(i, m4); im.setColorAt(i, l.c); });
    im.castShadow = this.tier === 'desktop'; im.receiveShadow = true; this.leafMesh = im; this.leafAll = ls.length; this.root.add(im); this.leaves = null;
  }
  setTier(id) { if (!this.leafMesh) return; const k = (LEAF_BUDGET[id] ?? 1) / this.leafK; this.leafMesh.count = Math.max(1, Math.floor(this.leafAll * Math.min(1, k))); this.leafMesh.castShadow = id === 'desktop'; }

  // the concept's morning grade over the garden's day light (DayNight re-applies its own values first, every frame)
  mood() {
    const g = this.g, w = this.W, s = g.scene, dn = g.dayNight, u = w.sky?.material?.uniforms;
    if (!dn || !s.fog || !w.hemi || !w.sun) return;
    dn.lastN = null; if (w.space !== 'garden') return;
    const k = Math.max(0, 1 - (dn.n || 0) * 2), t = new THREE.Color();   // the morning grade fades out through dusk; the night stays DayNight's
    s.fog.color.lerp(MOOD.fog, k); s.background?.copy?.(s.fog.color); g.renderer.setClearColor(s.fog.color, 1); if (u?.uH) u.uH.value.copy(s.fog.color); if (u?.uZ) u.uZ.value.lerp(MOOD.zenith, k);
    s.fog.near = lerp(s.fog.near, MOOD.near, k); s.fog.far = lerp(s.fog.far, MOOD.far, k);
    w.hemi.color.lerp(MOOD.hemiSky, k); w.hemi.groundColor.lerp(MOOD.hemiGround, k); w.hemi.intensity = lerp(w.hemi.intensity, MOOD.hemiI, k);
    w.sun.color.lerp(MOOD.sunC, k); w.sun.intensity = lerp(w.sun.intensity, MOOD.sunI, k);
    g.renderer.toneMappingExposure = lerp(g.renderer.toneMappingExposure, MOOD.exposure, k); if (s.environmentIntensity !== undefined) s.environmentIntensity = lerp(s.environmentIntensity, MOOD.env, k); void t;
  }
  restore() { this.root.removeFromParent(); for (const f of this.undo.splice(0).reverse()) try { f(); } catch {} if (this.g.dayNight) this.g.dayNight.lastN = null; }
  stats() { return { leaves: this.leafMesh?.count || 0, hidden: this.undo.length }; }
}
