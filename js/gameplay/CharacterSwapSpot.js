// @ts-nocheck
// R138 (GO 09/10, Jannik: 'Nyt sted ved skuret'): switch character at home. A gold circle beside your shed door in the
// private garden (never in the shared world) offers 'Switch character', which opens the selector with your open
// characters; its back button returns to the game. The spot is placed from the house's own garden spawn (the shed and
// gate are fixed, rule 7): on the open lawn beside the path, inside the fence. Offers through the InteractionResolver as
// 'home'. Fails soft.
import * as THREE from 'three';
import { createHoloIndicator } from '../visual/holo-indicator.js';

const RADIUS = 1.1, SIDE = -2.9, BACK = -.5;   // metres beside the garden spawn (the open lawn side), clear of the fence bushes

export class CharacterSwapSpot {
  constructor(game) { this.g = game; this.spot = null; this.m = null; this.holo = null; }
  build() {
    const sp = this.g.homePortal?.gardenSpawn?.(); if (!sp) return false;
    const p = { x: sp.x + SIDE, z: sp.z + BACK };
    this.spot = { x: p.x, z: p.z };
    this.holo = createHoloIndicator({ radius: .58, height: 1.3, intensity: .48, breath: 2.4, scanSpeed: 2.0, scanDensity: 90, baseRing: true, groundHalo: true, fadeIn: .35 });
    const cv = document.createElement('canvas'); cv.width = 330; cv.height = 78; const x = cv.getContext('2d');
    x.font = '800 44px Manrope, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 8; x.fillStyle = '#ffe9a3'; x.fillText('SWITCH', 165, 41);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); label.scale.set(1.8, .43, 1); label.position.y = 1.58;
    const m = this.m = new THREE.Group(); m.name = 'R138_CHARACTER_SWAP_SPOT'; m.add(this.holo.group, label);
    m.position.set(p.x, .015, p.z); (this.g.world.privateRoot || this.g.scene).add(m);
    return true;
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
    this.m.visible = this.g.world?.space === 'garden'; if (this.m.visible) this.holo.update(t, dt);
  }
}
