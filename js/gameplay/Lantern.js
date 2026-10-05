// @ts-nocheck
// R81 lantern (Jannik's lantern_round.glb, 05/10): at night the player can switch it on (phone: the round button above
// Hop, desktop: L). It hangs from the left hand (Hand_Socket_L, pivot at the top of its handle), the flame flickers and
// one warm point light without shadow lights the way. Day or the private garden: put away. The light is added the
// first time it is switched on (one shader recompile then, none during the day for players who never use it).
// Fails soft: no GLB → no lantern and no button.
import * as THREE from 'three';
import { loadGLTF } from '../core/AssetManager.js';

const KEY = 'tgw.lantern';
const read = () => { try { return localStorage.getItem(KEY) === 'on'; } catch { return false; } };

export class Lantern {
  constructor(game) {
    this.g = game; this.on = read(); this.shown = false; this.t = 0;
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
  available() { return !!this.ready && this.g.world.space === 'world' && !!this.g.dayNight?.isNight(); }
  toggle() {
    if (!this.available()) return false;
    this.on = !this.on; try { localStorage.setItem(KEY, this.on ? 'on' : 'off'); } catch {}
    if (this.on && !this.light) { this.light = new THREE.PointLight(0xffb45a, 0, 9, 2); this.light.castShadow = false; this.light.name = 'LANTERN_R81_LIGHT'; this.g.scene.add(this.light); }
    this.g.hud?.showToast?.(this.on ? 'Lantern lit' : 'Lantern put away');
    return true;
  }
  update(dt) {
    if (!this.socket) return;
    const avail = this.available(), show = avail && this.on;
    document.body.classList.toggle('lantern-ready', avail); this.btn?.classList.toggle('on', this.on && avail);
    if (this.model) this.model.visible = show;
    this.t += dt; const f = .86 + .1 * Math.sin(this.t * 13.1) + .06 * Math.sin(this.t * 31.7);
    if (this.light) {
      this.light.intensity = show ? 4.5 * f : 0;
      if (show) { this.socket.getWorldPosition(this.light.position); this.light.position.y -= .1; }
    }
    if (show) { for (const m of this.glow || []) m.emissiveIntensity = 1.4 * f; if (this.flame) this.flame.scale.setScalar(.9 + .14 * f); }
  }
}
