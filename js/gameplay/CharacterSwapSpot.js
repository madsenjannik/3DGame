// @ts-nocheck
// R138 (GO 09/10, Jannik: 'Nyt sted ved skuret'): switch character at home, in the private garden only (never in the
// shared world). Standing on the stone offers 'Switch character', which opens the selector with your open characters;
// its back button returns to the game. Placed from the house's own garden spawn (the shed and gate are fixed, rule 7):
// on the open lawn beside the path, inside the fence. Offers through the InteractionResolver as 'home'. Fails soft.
// R139 (GO 09/10): Jannik's 'Spirebænken' model (assets/garden/spirebaenken.glb, via AssetManager): 9 pots round a
// stepping stone, front path toward the garden path. Open characters show their sprout, locked ones bare soil with a
// glowing seed (save.unlocked). Idle loops; the Pop_<id> clips wait for the seed unlocks. A magic cue on the stone says
// 'stand here': two rune rings turning, motes spiralling up, a faint light column and the Stone_Glow breathing; all of it
// brightens when you stand on it. If the model fails, the R138 gold circle comes back.
import * as THREE from 'three';
import { createHoloIndicator } from '../visual/holo-indicator.js';
import { loadGLTF } from '../core/AssetManager.js';

const MODEL = './assets/garden/spirebaenken.glb';
const IDS = ['daisy', 'cactus', 'swamp', 'aloe', 'tulip', 'hyacinth', 'succulent', 'spire', 'fern'];
const RADIUS = 1.1, NEAR = .7, SIDE = -2.9, BACK = -.5, MOTES = 16;   // metres; the spot sits beside the garden spawn, clear of the fence bushes
const GOLD = new THREE.Color(0xffd98a);

function canvasTex(draw, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glowTex = () => canvasTex((x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); }, 64);
// a ring of small diamonds between two thin circles (outer), or three broken arcs (inner)
const runeTex = outer => canvasTex((x, s) => {
  const c = s / 2; x.strokeStyle = x.fillStyle = '#fff'; x.lineCap = 'round';
  if (outer) {
    x.lineWidth = 3; for (const r of [.92, .74]) { x.beginPath(); x.arc(c, c, c * r, 0, Math.PI * 2); x.stroke(); }
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, r = c * .83, px = c + Math.cos(a) * r, py = c + Math.sin(a) * r; x.save(); x.translate(px, py); x.rotate(a); x.beginPath(); x.moveTo(-7, 0); x.lineTo(0, -4); x.lineTo(7, 0); x.lineTo(0, 4); x.closePath(); x.fill(); x.restore(); }
  } else { x.lineWidth = 5; for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; x.beginPath(); x.arc(c, c, c * .86, a + .25, a + 1.75); x.stroke(); } }
}, 256);

export class CharacterSwapSpot {
  constructor(game) { this.g = game; this.spot = null; this.m = null; this.model = null; this.mixer = null; this.near = 0; this.motes = []; this.glowMats = []; }
  build() {
    const sp = this.g.homePortal?.gardenSpawn?.(); if (!sp) return false;
    const p = { x: sp.x + SIDE, z: sp.z + BACK };
    this.spot = { x: p.x, z: p.z };
    const m = this.m = new THREE.Group(); m.name = 'R139_SPIREBAENKEN'; m.position.set(p.x, 0, p.z);
    m.rotation.y = Math.PI / 2;   // the model's front (+z, its path) faces the garden path
    (this.g.world.privateRoot || this.g.scene).add(m);
    this.buildMagic();
    // the authored garden grass would hide the pots and the stone: clear it under the footprint (the model brings its own patch)
    try { const vm = this.g.vegetationMask; if (vm?.fixed) { vm.fixed.push({ x0: p.x - 1.55, x1: p.x + 1.45, z0: p.z - 1.5, z1: p.z + 1.5 }); vm.apply(); } } catch {}
    loadGLTF(MODEL).then(g => this.useModel(g.scene, g.animations)).catch(e => { console.warn('[TGW] Spirebænken failed; gold circle instead', e); this.fallback(); });
    return true;
  }
  buildMagic() {
    const fx = this.fx = new THREE.Group(); fx.name = 'R139_STONE_MAGIC'; this.m.add(fx);
    const ring = (outer, size, y) => { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: runeTex(outer), color: GOLD, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      mesh.position.y = y; mesh.renderOrder = 4; fx.add(mesh); return mesh; };
    this.ringOut = ring(true, 1.42, .03); this.ringIn = ring(false, 1.05, .1);
    this.column = createHoloIndicator({ color: 0xffd98a, radius: .42, height: 1.2, intensity: .16, breath: 2.6, scanSpeed: 1.2, scanDensity: 60, baseRing: false, groundHalo: false });
    this.column.group.position.y = .09; fx.add(this.column.group);
    const tex = glowTex();
    for (let i = 0; i < MOTES; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: GOLD, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.renderOrder = 5; fx.add(s); this.motes.push({ s, a: i / MOTES * Math.PI * 2, r: .18 + (i % 4) * .08, ph: (i * .37) % 1, sz: .05 + (i % 3) * .02 });
    }
  }
  useModel(scene, clips) {
    this.model = scene; scene.name = 'SPIREBAENKEN_MODEL';
    scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      if (o.name === 'Stone_Glow' && o.material) { o.material = o.material.clone(); this.glowMats.push({ m: o.material, base: o.material.emissiveIntensity || 1 }); } });
    this.m.add(scene); this.applyUnlocked();
    const idle = clips?.find(c => c.name === 'Idle');
    if (idle) { this.mixer = new THREE.AnimationMixer(scene); this.mixer.clipAction(idle).play(); }
  }
  // open = its sprout, locked = bare soil with the glowing seed (the shared save's list)
  applyUnlocked() {
    if (!this.model) return; const open = new Set(this.g.save?.data?.unlocked || ['daisy', 'cactus', 'swamp']);
    for (const id of IDS) { const sp = this.model.getObjectByName(`Sprout_${id}`), so = this.model.getObjectByName(`Soil_${id}`); if (sp) sp.visible = open.has(id); if (so) so.visible = !open.has(id); }
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
    this.near += ((d < NEAR ? 1 : 0) - this.near) * Math.min(1, dt * 5); const k = this.near, br = .5 + .5 * Math.sin(t * 2.4);
    this.ringOut.rotation.y = t * .25; this.ringIn.rotation.y = -t * .6;
    this.ringOut.material.opacity = .32 + .18 * br + .45 * k; this.ringIn.material.opacity = .22 + .14 * br + .5 * k;
    const sc = 1 + .1 * k; this.ringOut.scale.setScalar(sc); this.ringIn.scale.setScalar(sc);
    this.column.group.scale.set(1, 1 + .35 * k, 1); this.column.update(t, dt);
    for (const g of this.glowMats) g.m.emissiveIntensity = g.base * (.8 + .5 * br + 1.2 * k);
    const speed = .22 + .3 * k;
    for (const o of this.motes) {
      const y = (o.ph + t * speed) % 1, a = o.a + t * (.7 + .6 * k) + y * 2.2, r = o.r * (1 - .35 * y);
      o.s.position.set(Math.cos(a) * r, .12 + y * (1.3 + .4 * k), Math.sin(a) * r);
      o.s.material.opacity = Math.sin(Math.PI * y) * (.55 + .4 * k); o.s.scale.setScalar(o.sz * (1 + .5 * k));
    }
  }
}
