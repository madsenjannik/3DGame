// @ts-nocheck
// R138 (GO 09/10, Jannik: 'Nyt sted ved skuret'): switch character at home, in the private garden only (never in the
// shared world). Standing on the stone offers 'Switch character', which opens the selector with your open characters;
// its back button returns to the game. Offers through the InteractionResolver as 'home'. Fails soft.
// R139 (GO 09/10): Jannik's 'Spirebænken' model (assets/garden/spirebaenken.glb, via AssetManager). Idle loops; the
// Pop_<id> clips wait for the seed unlocks. If the model fails, the R138 gold circle comes back.
// R140 (GO 09/10): model v2 ('Sprouting Ring': 9 terracotta pots, Lock_<id> padlocks, sign, bigger stone) moved to where
// the two authored bed shrubs stood (beside the garden path, placed from the house's garden spawn: rule 7). Made part of
// the garden: its own ground disc is hidden and the garden grass grows up to the pots (a round clearing only under the
// ring; the two shrubs and their collider go for good), each pot gets a small collider. 'This matters' comes from the
// stone only: a rune ring on the stone, motes rising from it and Stone_Glow breathing, all brighter when you stand on it.
// R141 (GO A 09/10): model v2.1: a raised mound (0.34 m) with front steps, a pergola with a swinging sign and 4 lanterns,
// one vine per character on the posts (Pop_<id> grows it), pollen in the model's own Idle. The mound is walkable: the
// garden gets a height function for it (top, steps as a ramp, outer slope), a ring of colliders along its rim leaves the
// steps as the only way up, and the pergola posts are solid. The model's pollen replaces my motes; the rune ring stays.
import * as THREE from 'three';
import { createHoloIndicator } from '../visual/holo-indicator.js';
import { loadGLTF } from '../core/AssetManager.js';

const MODEL = './assets/garden/spirebaenken.glb';
const IDS = ['daisy', 'cactus', 'swamp', 'aloe', 'tulip', 'hyacinth', 'succulent', 'spire', 'fern'];
// metres from the garden spawn to the ring's stone (the authored bed-shrub pair at -6.5, 6.7); clearing radius; stone reach
const EAST_DX = 6.8, EAST_DZ = -11.65;   // R159: the premium Ring's spot (the east lawn, ~(7, -2)) from the garden spawn, like SIDE/BACK
const SIDE = -6.7, BACK = -2.95, CLEAR = 2.5, RADIUS = 1.0, NEAR = .75, MOTES = 0, POT_R = .3;
// the mound in model space (+z = the steps): top height, flat top radius, outer foot radius, rim collider radius, steps strip
const TOP = .34, FLAT = 2.22, FOOT = 2.52, RIM = 2.27, STEP_W = .62, STEP_IN = 1.84, STEP_OUT = 2.78, POST_R = .14;
const GOLD = new THREE.Color(0xffd98a);

function canvasTex(draw, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glowTex = () => canvasTex((x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); }, 64);
// a ring of small diamonds between two thin circles
const runeTex = () => canvasTex((x, s) => {
  const c = s / 2; x.strokeStyle = x.fillStyle = '#fff';
  x.lineWidth = 3; for (const r of [.94, .76]) { x.beginPath(); x.arc(c, c, c * r, 0, Math.PI * 2); x.stroke(); }
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = c * .85, px = c + Math.cos(a) * r, py = c + Math.sin(a) * r; x.save(); x.translate(px, py); x.rotate(a); x.beginPath(); x.moveTo(-7, 0); x.lineTo(0, -4); x.lineTo(7, 0); x.lineTo(0, 4); x.closePath(); x.fill(); x.restore(); }
}, 256);

// R157: ?ring=premium switches the experimental sanctuary look on (remembered), ?ring=classic switches it off
export function ringMode() { try { const q = new URLSearchParams(location.search).get('ring'); if (q === 'premium' || q === 'classic') localStorage.setItem('tgw.ring', q); return localStorage.getItem('tgw.ring') === 'premium' ? 'premium' : 'classic'; } catch { return 'classic'; } }
export class CharacterSwapSpot {
  constructor(game) { this.g = game; this.spot = null; this.m = null; this.model = null; this.mixer = null; this.near = 0; this.motes = []; this.glowMats = []; this.potColliders = []; }
  build() {
    const sp = this.g.homePortal?.gardenSpawn?.(); if (!sp) return false;
    const p = { x: sp.x + SIDE, z: sp.z + BACK };
    this.spot = { x: p.x, z: p.z };
    // R154: nothing may be built on the Ring and no weed may sprout under its mound (it stays fixed, rule 7)
    try { this.g.garden?.trees?.push({ x: p.x, z: p.z, r: FOOT + .2, id: 'Sprouting Ring' }); const W = this.g.wilds; if (W) { W.extraProps = () => [{ x: p.x, z: p.z, r: FOOT + .3 }]; W.threat?.relayout?.(); } } catch {}
    const m = this.m = new THREE.Group(); m.name = 'R140_SPROUTING_RING'; m.position.set(p.x, 0, p.z);
    m.rotation.y = Math.PI / 2;   // the model's front (+z, its stepping stones) faces the garden path
    (this.g.world.privateRoot || this.g.scene).add(m);
    this.buildMagic();
    // part of the garden: a round clearing under the ring only; the two bed shrubs there and their collider go for good
    try { const vm = this.g.vegetationMask; if (vm?.fixed) { vm.fixed.push({ cx: p.x, cz: p.z, r: CLEAR, colliders: true }); vm.apply(); } } catch {}
    loadGLTF(MODEL).then(g => this.useModel(g.scene, g.animations)).catch(e => { console.warn('[TGW] Spirebænken failed; gold circle instead', e); this.fallback(); });
    return true;
  }
  buildMagic() {
    const fx = this.fx = new THREE.Group(); fx.name = 'R140_STONE_MAGIC'; this.m.add(fx);
    this.ring = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: runeTex(), color: GOLD, transparent: true, opacity: .4, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    this.ring.position.y = TOP + .135; this.ring.renderOrder = 4; fx.add(this.ring);   // on the stone's rim, around Stone_Inner (on the mound)
    const tex = glowTex();
    for (let i = 0; i < MOTES; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: GOLD, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.renderOrder = 5; fx.add(s); this.motes.push({ s, a: i / MOTES * Math.PI * 2, r: .2 + (i % 3) * .09, ph: (i * .37) % 1, sz: .045 + (i % 3) * .02 });
    }
  }
  useModel(scene, clips) {
    this.model = scene; scene.name = 'SPROUTING_RING_MODEL';
    scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      if (o.name === 'Stone_Glow' && o.material) { o.material = o.material.clone(); this.glowMats.push({ m: o.material, base: o.material.emissiveIntensity || 1 }); } });
    const disc = scene.getObjectByName('Ground_Patch'); if (disc) disc.visible = false;   // the garden's own grass meets the pots instead
    // R142 (GO 09/10): the mound wears the garden ground's own colours (vertex colours from the ground's pattern where it stands)
    try { const mound = scene.getObjectByName('Mound'), W = this.g.world; if (mound?.isMesh && W.groundColorAt) { this.m.add(scene); this.m.updateMatrixWorld(true);
      const geo = mound.geometry.clone(), pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), v = new THREE.Vector3(), c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mound.matrixWorld); W.groundColorAt(v.x, v.z, c); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); mound.geometry = geo;
      mound.material = mound.material.clone(); mound.material.vertexColors = true; mound.material.color.set(0xffffff); mound.material.roughness = 1; mound.material.metalness = 0; } } catch (e) { console.warn('[TGW] mound colour', e); }
    this.m.add(scene); this.applyUnlocked();
    // each pot and pergola post is solid; the rim is a wall except at the steps (round colliders, garden space only)
    try { this.m.updateMatrixWorld(true); const v = new THREE.Vector3(), W = this.g.world, add = (x, z, r) => { const c = { x, z, r, kind: 'ring-pot', traversal: 'blocked', space: 'garden' }; W.colliders.push(c); this.potColliders.push(c); };
      for (const id of IDS) { const pot = scene.getObjectByName(`Pot_${id}`); if (pot) { pot.getWorldPosition(v); add(v.x, v.z, POT_R); } }
      const posts = new Set(); for (const id of IDS) { const vine = scene.getObjectByName(`Vine_${id}`); if (!vine) continue; vine.getWorldPosition(v); const k = `${v.x.toFixed(2)},${v.z.toFixed(2)}`; if (!posts.has(k)) { posts.add(k); add(v.x, v.z, POST_R); } }
      for (let i = 0, n = 44; i < n; i++) { const a = i / n * Math.PI * 2, lx = Math.sin(a) * RIM, lz = Math.cos(a) * RIM; if (Math.abs(lx) < STEP_W + .12 && lz > 0) continue;
        v.set(lx, 0, lz); this.m.localToWorld(v); const c = { x: v.x, z: v.z, r: .17, kind: 'ring-rim', traversal: 'blocked', space: 'garden' }; W.colliders.push(c); this.potColliders.push(c); }
      // walkable mound: model-space height (top, steps as a ramp, outer slope down to the garden)
      const inv = new THREE.Matrix4().copy(this.m.matrixWorld).invert(), q = new THREE.Vector3();
      W.gardenHeight = (x, z) => { q.set(x, 0, z).applyMatrix4(inv); const r = Math.hypot(q.x, q.z); if (r >= FOOT + .3) return 0;
        if (Math.abs(q.x) < STEP_W && q.z > STEP_IN && q.z < STEP_OUT) return TOP * (STEP_OUT - q.z) / (STEP_OUT - STEP_IN);
        if (r < .5) return TOP + .13; if (r < .66) return TOP + .13 * (.66 - r) / .16;   // standing on the stone
        if (r <= FLAT) return TOP; if (r < FOOT) return TOP * (FOOT - r) / (FOOT - FLAT); return 0; }; } catch {}
    const idle = clips?.find(c => c.name === 'Idle'); this.clips = clips || [];
    if (idle) { this.mixer = new THREE.AnimationMixer(scene); this.mixer.clipAction(idle).play(); }
    if (ringMode() === 'premium') this.loadPremium();
  }
  // R157-R159 experimental (only with ?ring=premium): the concept's Sprouting Ring, built new at 70 % on the east lawn
  // (it does not fit at the old spot). The old Ring stays loaded but hidden; its colliders, mound, clearing and the
  // interaction point hand over to the new one, and restoreClassic() hands everything back (also on any failure).
  loadPremium() {
    const PLANTS = ['bush_a', 'bush_b', 'bush_c', 'tree_a', 'tree_b', 'tree_c', 'fern_a', 'fern_b'];   // R169: Jannik's GLB plants (each fails soft to the code plants)
    Promise.all([import('../visual/RingSanctuary.js?build=RING-R172-20261015A'), ...PLANTS.map(k => loadGLTF(`./assets/garden/plants/${k}.glb`).then(g => [k, g], e => { console.warn('[TGW] plant', k, e); return null; }))]).then(([{ RingSanctuary, laneRect }, ...pl]) => {
      const gltfPlants = Object.fromEntries(pl.filter(Boolean));
      const W = this.g.world, vm = this.g.vegetationMask, sp = this.g.homePortal.gardenSpawn(), center = { x: sp.x + EAST_DX, z: sp.z + EAST_DZ };
      const px = W.pathX?.(center.z) ?? 0, yaw = Math.atan2(px - center.x, 0);   // the lane (+z) points at the garden path
      this.prev = { spot: { ...this.spot }, height: W.gardenHeight, extra: this.g.wilds?.extraProps, oldClear: vm?.fixed?.find(c => c.cx === this.spot.x && c.cz === this.spot.z) };
      try {
        if (vm?.fixed) { if (this.prev.oldClear) vm.fixed.splice(vm.fixed.indexOf(this.prev.oldClear), 1); this.premiumClear = { cx: center.x, cz: center.z, r: 6.6 * .7, colliders: true }; this.premiumLane = laneRect(center, yaw); vm.fixed.push(this.premiumClear, this.premiumLane); vm.apply(); }   // R164: the lane to the arch is clear too
        for (const c of this.potColliders) { const i = W.colliders.indexOf(c); if (i >= 0) W.colliders.splice(i, 1); }
        const S = this.sanctuary = new RingSanctuary(this, IDS, center, yaw, gltfPlants);
        W.gardenHeight = (x, z) => S.height(x, z); this.spot = { ...S.stoneWorld };
        this.premiumTree = { x: center.x, z: center.z, r: S.clearR + .2, id: 'Sprouting Ring' }; this.g.garden?.trees?.push(this.premiumTree);
        if (this.g.wilds) { this.g.wilds.extraProps = () => [{ x: center.x, z: center.z, r: S.clearR + .3 }]; this.g.wilds.threat?.relayout?.(); }
        this.fx.position.y = -TOP; S.stoneGroup.add(this.fx); if (this.beacon) { S.stoneGroup.add(this.beacon.group); this.beacon.group.position.y = .14; }
        this.applyUnlocked();
      } catch (e) { console.warn('[TGW] ring premium failed; classic Ring kept', e); this.restoreClassic(); }
    }).catch(e => console.warn('[TGW] ring premium module failed; classic Ring kept', e));
  }
  restoreClassic() {
    const S = this.sanctuary, W = this.g.world, vm = this.g.vegetationMask; this.sanctuary = null;
    try { S?.dispose(); } catch {} W?.privateRoot?.getObjectByName('R157_RING_SANCTUARY')?.removeFromParent(); W?.privateRoot?.getObjectByName('R158_RING_ENVIRONMENT')?.removeFromParent();
    const P = this.prev; if (!P) return; this.prev = null;
    for (const c of this.potColliders) if (!W.colliders.includes(c)) W.colliders.push(c);
    W.gardenHeight = P.height; this.spot = P.spot;
    try { if (vm?.fixed) { for (const f of [this.premiumClear, this.premiumLane]) { const i = vm.fixed.indexOf(f); if (i >= 0) vm.fixed.splice(i, 1); } if (P.oldClear && !vm.fixed.includes(P.oldClear)) vm.fixed.push(P.oldClear); vm.apply(); } } catch {}
    const t = this.g.garden?.trees, ti = t?.indexOf(this.premiumTree) ?? -1; if (ti >= 0) t.splice(ti, 1);
    if (this.g.wilds) { this.g.wilds.extraProps = P.extra; this.g.wilds.threat?.relayout?.(); }
    this.fx.position.y = 0; this.m.add(this.fx); if (this.beacon) { this.m.add(this.beacon.group); this.beacon.group.position.y = this.model ? TOP + .14 : .02; }
    this.applyUnlocked();
  }
  // open = its sprout; locked = soil with a sprig and the padlock (the shared save's list)
  applyUnlocked() {
    if (!this.model) return; const open = new Set(this.g.save?.data?.unlocked || ['daisy', 'cactus', 'swamp']);
    for (const id of IDS) { const o = open.has(id), set = (n, v) => { const x = this.model.getObjectByName(n); if (x) x.visible = v; };
      set(`Sprout_${id}`, o); set(`Soil_${id}`, !o); set(`Lock_${id}`, !o); set(`Vine_${id}`, o); }   // R141: the vines climb the pergola as characters open
    if (this.sanctuary) { for (const id of IDS) { const x = this.model.getObjectByName(`Soil_${id}`); if (x) x.visible = false; } this.sanctuary.setOpen(open); }   // R157: the pods show the state
  }
  fallback() {
    const holo = this.holo = createHoloIndicator({ radius: .58, height: 1.3, intensity: .48, breath: 2.4, scanSpeed: 2.0, scanDensity: 90, baseRing: true, groundHalo: true, fadeIn: .35 });
    holo.group.position.y = .015; this.m.add(holo.group);
  }
  interaction(pos) {
    if (!this.spot || !pos || this.g.world?.space !== 'garden') return null;
    const d = Math.hypot(pos.x - this.spot.x, pos.z - this.spot.z); if (d > RADIUS) return null;
    const seed = this.g.specialSeeds?.inBag?.()[0];   // R149: a Special Seed in the Bag is planted here first
    if (seed) return { type: 'home-plant', label: `Plant ${seed.name}`, distance: d };   // R153: also on the gold-circle fallback (no model)
    return { type: 'home-swap', label: 'Switch character', distance: d };
  }
  // R149: plant the Special Seed: the character's pot grows (Pop_<id>), the padlock goes, the selector opens it
  plantSeed() {
    const d = this.g.specialSeeds?.plant?.(); if (!d) return false;
    // R153: the pot's own Pop_<id> clip lifts the padlock and the soil (it animates their scale), so they stay visible
    // until it has played; the sprout and vine appear at once. Then the normal open/locked state takes over.
    const clip = this.clips?.find(c => c.name === `Pop_${d.id}`), M = this.model, set = (n, v) => { const x = M?.getObjectByName(n); if (x) x.visible = v; };
    if (this.sanctuary) { this.sanctuary.bloom(d.id); this.applyUnlocked(); }   // R157: the husk parts and the pod unfolds instead of the pot's Pop
    else if (clip && this.mixer && M) {
      set(`Sprout_${d.id}`, true); set(`Vine_${d.id}`, true); const a = this.mixer.clipAction(clip); a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play();
      const done = e => { if (e.action !== a) return; this.mixer.removeEventListener('finished', done); this.applyUnlocked(); }; this.mixer.addEventListener('finished', done);
      setTimeout(() => this.applyUnlocked(), 4000);   // safety: never stuck half-open
    } else this.applyUnlocked();
    try { const pot = M?.getObjectByName(`Pot_${d.id}`), v = new THREE.Vector3(); if (this.sanctuary) v.copy(this.sanctuary.podWorld(d.id)); else if (pot) { pot.getWorldPosition(v); v.y += .6; } else v.set(this.spot.x, .6, this.spot.z); this.g.fx?.burst?.(v, 0xffd86b, 14, 1.2); this.g.fx?.floatText?.(d.id[0].toUpperCase() + d.id.slice(1) + '!', v.clone().setY(v.y + .4)); } catch {}
    this.g.hud?.showToast?.(`${d.name} planted. ${d.id[0].toUpperCase() + d.id.slice(1)} has sprouted and can be chosen here`, { milestone: true });
    return true;
  }
  interact() {
    try { this.g.save?.flush(); } catch {}
    location.href = `./selector.html?char=${encodeURIComponent(this.g.state.player.characterId)}&from=home`;
  }
  update(t, dt) {
    if (!this.spot) { if (this.g.homePortal?.gardenHome) this.build(); return; }
    const vis = this.g.world?.space === 'garden'; this.m.visible = vis && !this.sanctuary; if (!vis) { this.sanctuary?.leaveGarden?.(); return; }   // R166: shadows/resolution back to normal outside the garden
    this.mixer?.update(dt); this.holo?.update(t, dt); if (this.sanctuary) try { this.sanctuary.update(dt, this.g.camera); } catch (e) { console.warn('[TGW] ring premium update failed; classic Ring back', e); this.restoreClassic(); }
    // R153: the agreed 'calling' beacon: while a Special Seed waits in the Bag, a gold light rises from the stone
    const calling = !!this.g.specialSeeds?.inBag?.().length;
    if (calling && !this.beacon) { this.beacon = createHoloIndicator({ radius: .5, height: 2.4, intensity: .6, breath: 1.6, scanSpeed: 2.4, scanDensity: 80, baseRing: false, groundHalo: true, fadeIn: .4 }); this.beacon.group.position.y = this.sanctuary ? .14 : this.model ? TOP + .14 : .02; (this.sanctuary?.stoneGroup || this.m).add(this.beacon.group); }
    if (this.beacon) { this.beacon.group.visible = calling; if (calling) this.beacon.update(t, dt); }
    const c = this.g.character?.position, d = c ? Math.hypot(c.x - this.spot.x, c.z - this.spot.z) : 9;
    this.near += ((d < NEAR ? 1 : 0) - this.near) * Math.min(1, dt * 5); const k = this.near, br = .5 + .5 * Math.sin(t * 2.2);
    this.ring.rotation.y = t * .3; this.ring.material.opacity = .22 + .16 * br + .55 * k; this.ring.scale.setScalar(1 + .08 * k);
    for (const g of this.glowMats) g.m.emissiveIntensity = g.base * (.75 + .45 * br + 1.4 * k);
    const speed = .2 + .3 * k;
    for (const o of this.motes) {
      const y = (o.ph + t * speed) % 1, a = o.a + t * (.6 + .6 * k) + y * 2.2, r = o.r * (1 - .4 * y);
      o.s.position.set(Math.cos(a) * r, .2 + y * (1.0 + .5 * k), Math.sin(a) * r);
      o.s.material.opacity = Math.sin(Math.PI * y) * (.45 + .45 * k); o.s.scale.setScalar(o.sz * (1 + .5 * k));
    }
  }
}
