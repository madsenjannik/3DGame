// @ts-nocheck
// R81 lantern (Jannik's lantern_round.glb, 05/10): at night the player can switch it on (phone: the round button above
// Hop, desktop: L). It hangs from the left hand (Hand_Socket_L, pivot at the top of its handle), the flame flickers and
// one warm point light without shadow lights the way (R84: ~16 m). Day: put away. World and garden. The light is added the
// first time it is switched on (one shader recompile then, none during the day for players who never use it).
// Fails soft: no GLB → no lantern and no button.
import * as THREE from 'three';
import { loadGLTF } from '../core/AssetManager.js';

const KEY = 'tgw.lantern';
const read = () => { try { return localStorage.getItem(KEY) === 'on'; } catch { return false; } };

export class Lantern {
  constructor(game) {
    this.g = game; this.on = read(); this.shown = false; this.t = 0; this.equipped = false;
    this.socket = game.character?.instance?.socket?.('Hand_Socket_L');
    if (!this.socket) return;
    this.buildButton();
    loadGLTF('./assets/props/lantern-round.glb').then(gl => {
      const m = this.model = gl.scene.clone(true); m.name = 'LANTERN_R81'; m.visible = false;
      m.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; if (/Emissive/.test(o.material?.name || '')) { o.material = o.material.clone(); (this.glow ||= []).push(o.material); } } });
      this.flame = m.getObjectByName('Flame');
      this.socket.add(m); const ws = this.socket.getWorldScale(new THREE.Vector3()).x || 1; m.scale.setScalar(.9 / ws);   // ~22 cm in the world
      this.ready = true;
    }).catch(e => console.warn('[TGW] lantern unavailable (fails soft)', e));
    addEventListener('keydown', e => { if (e.code === 'KeyL' && !e.repeat && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) this.toggle(); });
  }
  buildButton() {
    const b = document.createElement('button'); b.id = 'lantern-btn'; b.type = 'button'; b.setAttribute('aria-label', 'Lantern');
    b.innerHTML = '<span class="ico-mask" style="--ico:url(./brand/icons/svg/icon-lantern.svg)"></span>';
    b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); this.toggle(); });
    document.body.appendChild(b); this.btn = b;
  }
  available() { const s = this.g.world.space; return !!this.ready && (s === 'world' || s === 'garden') && !!this.g.dayNight?.isNight(); }   // R84: garden too
  setEquipped(v){this.equipped=!!v;}
  toggle() {
    if (!this.available()) return false;
    this.on = !this.on; try { localStorage.setItem(KEY, this.on ? 'on' : 'off'); } catch {}
    if (this.on && !this.light) { this.light = new THREE.PointLight(0xffb45a, 0, 16, 1.2); /* R84: reaches further (was 9 m, decay 2) */ this.light.castShadow = false; this.light.name = 'LANTERN_R81_LIGHT'; this.g.scene.add(this.light); }
    this.g.hud?.showToast?.(this.on ? 'Lantern lit' : 'Lantern put away');
    return true;
  }
  update(dt) {
    if (!this.socket) return;
    const avail = this.available();
    // R126 (Jannik 08/10): no button; the lantern lights by itself at dusk and goes out at dawn. The Bag (and L on
    // desktop) can still switch it during the night. Unlock / purchase comes later (backlog).
    if (avail !== this.wasAvail) { if (this.wasAvail !== undefined || avail) { if (avail && !this.on) { this.toggle(); } else if (!avail && this.on) { this.on = false; try { localStorage.setItem(KEY, 'off'); } catch {} } } this.wasAvail = avail; }
    const carry = !!this.ready && (this.g.world.space === 'world' || this.g.world.space === 'garden'), show = carry && (this.equipped || (avail && this.on));
    document.body.classList.toggle('lantern-ready', avail); this.btn?.classList.toggle('on', this.on && avail); document.body.classList.toggle('lantern-lit', avail && this.on);   // R110: lit quick slot on phones
    if (this.model) this.model.visible = show;
    this.t += dt; const f = .86 + .1 * Math.sin(this.t * 13.1) + .06 * Math.sin(this.t * 31.7);
    if (this.light) {
      const lit=avail&&this.on;this.light.intensity = lit ? 6 * f : 0;
      if (lit) { this.socket.getWorldPosition(this.light.position); this.light.position.y -= .1; }
    }
    if (show) { const lit=avail&&this.on;for (const m of this.glow || []) m.emissiveIntensity = lit?1.4*f:0; if (this.flame) { this.flame.visible=lit; if(lit)this.flame.scale.setScalar(.9 + .14 * f); } }
  }
}
