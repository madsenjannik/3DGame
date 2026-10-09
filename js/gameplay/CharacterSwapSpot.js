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
import * as THREE from 'three';
import { createHoloIndicator } from '../visual/holo-indicator.js';
import { loadGLTF } from '../core/AssetManager.js';

const MODEL = './assets/garden/spirebaenken.glb';
const IDS = ['daisy', 'cactus', 'swamp', 'aloe', 'tulip', 'hyacinth', 'succulent', 'spire', 'fern'];
// metres from the garden spawn to the ring's stone (the authored bed-shrub pair at -6.5, 6.7); clearing radius; stone reach
const SIDE = -6.7, BACK = -2.95, CLEAR = 2.05, RADIUS = 1.0, NEAR = .75, MOTES = 10, POT_R = .3;
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

export class CharacterSwapSpot {
  constructor(game) { this.g = game; this.spot = null; this.m = null; this.model = null; this.mixer = null; this.near = 0; this.motes = []; this.glowMats = []; this.potColliders = []; }
  build() {
    const sp = this.g.homePortal?.gardenSpawn?.(); if (!sp) return false;
    const p = { x: sp.x + SIDE, z: sp.z + BACK };
    this.spot = { x: p.x, z: p.z };
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
    this.ring.position.y = .135; this.ring.renderOrder = 4; fx.add(this.ring);   // on the stone's rim, around Stone_Inner
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
    this.m.add(scene); this.applyUnlocked();
    // each pot is solid (small round colliders at the pots' world positions; garden space only)
    try { this.m.updateMatrixWorld(true); const v = new THREE.Vector3(), W = this.g.world;
      for (const id of IDS) { const pot = scene.getObjectByName(`Pot_${id}`); if (!pot) continue; pot.getWorldPosition(v);
        const c = { x: v.x, z: v.z, r: POT_R, kind: 'ring-pot', traversal: 'blocked', space: 'garden' }; W.colliders.push(c); this.potColliders.push(c); } } catch {}
    const idle = clips?.find(c => c.name === 'Idle');
    if (idle) { this.mixer = new THREE.AnimationMixer(scene); this.mixer.clipAction(idle).play(); }
  }
  // open = its sprout; locked = soil with a sprig and the padlock (the shared save's list)
  applyUnlocked() {
    if (!this.model) return; const open = new Set(this.g.save?.data?.unlocked || ['daisy', 'cactus', 'swamp']);
    for (const id of IDS) { const o = open.has(id), set = (n, v) => { const x = this.model.getObjectByName(n); if (x) x.visible = v; };
      set(`Sprout_${id}`, o); set(`Soil_${id}`, !o); set(`Lock_${id}`, !o); }
  }
  fallback() {
    const holo = this.holo = createHoloIndicator({ radius: .58, height: 1.3, intensity: .48, breath: 2.4, scanSpeed: 2.0, scanDensity: 90, baseRing: true, groundHalo: true, fadeIn: .35 });
    holo.group.position.y = .015; this.m.add(holo.group);
  }
  interaction(pos) {
    if (!this.spot || !pos || this.g.world?.space !== 'garden') return null;
    const d = Math.hypot(pos.x - this.spot.x, pos.z - this.spot.z); if (d > RADIUS) return null;
    return { type: 'home-swap', label: 'Switch character', distance: d };
  }
  interact() {
    try { this.g.save?.flush(); } catch {}
    location.href = `./selector.html?char=${encodeURIComponent(this.g.state.player.characterId)}&from=home`;
  }
  update(t, dt) {
    if (!this.spot) { if (this.g.homePortal?.gardenHome) this.build(); return; }
    const vis = this.m.visible = this.g.world?.space === 'garden'; if (!vis) return;
    this.mixer?.update(dt); this.holo?.update(t, dt);
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
