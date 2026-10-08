// @ts-nocheck
// R126 (GO 08/10, phones): the special meter is a gold ring around the main action button and the special is used by
// holding that button. Tap = the normal action / strike (unchanged). When the ring is full, holding ~0.8 s charges
// (Throw_Charge on the character, the button fills and grows); releasing after that fires the existing special
// (SpecialSystem.use, locked logic untouched). Releasing early does nothing and keeps the full ring. Fails soft.
import { SPECIAL } from '../data/combatCatalog.js?build=DAYNIGHT-R81-20261005A';

const HOLD = .8;

export class SpecialHold {
  constructor(game) {
    this.g = game; this.btn = document.getElementById('action'); this.charging = false; this.id = null; this.t0 = 0;
    if (!this.btn) return;
    this.btn.addEventListener('pointerdown', e => this.down(e));
    addEventListener('pointerup', e => this.up(e)); addEventListener('pointercancel', e => { if (e.pointerId === this.id) this.end(); });
  }
  sp() { return this.g.combat?.special; }
  active() { return !!this.g.input?.isTouch && document.body.classList.contains('hud-classic'); }
  down(e) {
    if (!this.active() || !this.sp()?.ready?.()) return;
    this.charging = true; this.id = e.pointerId; this.t0 = performance.now(); this.btn.classList.add('sp-charging');
    this.g.character?.instance?.playOverlay?.('Throw_Charge', { loop: true });
  }
  up(e) {
    if (!this.charging || e.pointerId !== this.id) return;
    const held = (performance.now() - this.t0) / 1000; this.end();
    if (held >= HOLD) this.sp()?.use?.();
  }
  end() {
    this.charging = false; this.id = null; this.btn.classList.remove('sp-charging', 'sp-charged');
    this.g.character?.instance?.stopOverlay?.('Throw_Charge');
  }
  update() {
    if (!this.btn) return;
    const s = this.sp(), has = !!s?.def && this.active(), k = has ? Math.min(1, (s.charge || 0) / SPECIAL.chargeHits) : 0;
    this.btn.style.setProperty('--sp', `${Math.round(k * 360)}deg`);
    this.btn.classList.toggle('sp-has', has); this.btn.classList.toggle('sp-full', has && k >= 1);
    if (this.charging) {
      if (!s?.ready?.()) return this.end();
      if ((performance.now() - this.t0) / 1000 >= HOLD) this.btn.classList.add('sp-charged');
    }
  }
}
