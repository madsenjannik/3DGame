// @ts-nocheck
// R126 (GO 08/10, phones): the special meter is a gold ring around the main action button and the special is used by
// holding that button. Tap = the normal action / strike (unchanged). When the ring is full, holding ~0.8 s charges
// (Throw_Charge on the character); releasing after that fires the existing special (SpecialSystem.use, locked logic
// untouched). Releasing early does nothing and keeps the full ring. Fails soft.
// R127 (GO 08/10): the button is drawn as a glass rim + moss disc + SVG gold arc with a glowing spark at its head.
// Full = pulsing glow and the spark circles; holding = gold light grows from the centre and the disc presses in;
// release = shockwave flash. The look is CSS (styles.css R127); this file only adds the parts and sets the state.
import { SPECIAL } from '../data/combatCatalog.js?build=DAYNIGHT-R81-20261005A';

const HOLD = .8;
const ARC = '<svg class="sp-arc" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="spGold" x1="0" y1="0" x2="1" y2="1">'
  + '<stop offset="0" stop-color="#fff0a8"/><stop offset=".5" stop-color="#f3c552"/><stop offset="1" stop-color="#d99a2b"/></linearGradient></defs>'
  + '<circle class="sp-track" cx="50" cy="50" r="45.5"/><circle class="sp-fill" cx="50" cy="50" r="45.5" pathLength="100" transform="rotate(-90 50 50)"/>'
  + '<g class="sp-head"><circle class="sp-spark" cx="50" cy="4.5" r="3.4"/></g></svg>';

export class SpecialHold {
  constructor(game) {
    this.g = game; this.btn = document.getElementById('action'); this.charging = false; this.id = null; this.t0 = 0; this.k = -1;
    if (!this.btn) return;
    try {
      this.btn.insertAdjacentHTML('afterbegin', '<span class="act-disc" aria-hidden="true"></span>' + ARC + '<span class="act-wave" aria-hidden="true"></span>');
      this.fill = this.btn.querySelector('.sp-fill'); this.head = this.btn.querySelector('.sp-head');
    } catch {}
    this.btn.addEventListener('pointerdown', e => this.down(e));
    addEventListener('pointerup', e => this.up(e)); addEventListener('pointercancel', e => { if (e.pointerId === this.id) this.end(); });
  }
  sp() { return this.g.combat?.special; }
  active() { return !!this.g.input?.isTouch && document.body.classList.contains('hud-classic'); }
  down(e) {
    if (!this.active() || !this.sp()?.ready?.()) return;
    this.charging = true; this.id = e.pointerId; this.t0 = performance.now(); this.btn.classList.add('sp-charging');
    clearTimeout(this._chT); this._chT = setTimeout(() => { if (this.charging) this.btn.classList.add('sp-charged'); }, HOLD * 1000);   // R127: not tied to the frame rate
    this.g.character?.instance?.playOverlay?.('Throw_Charge', { loop: true });
  }
  up(e) {
    if (!this.charging || e.pointerId !== this.id) return;
    const held = (performance.now() - this.t0) / 1000; this.end();
    if (held >= HOLD) { this.sp()?.use?.(); this.burst(); }
  }
  end() {
    clearTimeout(this._chT); this.charging = false; this.id = null; this.btn.classList.remove('sp-charging', 'sp-charged');
    this.g.character?.instance?.stopOverlay?.('Throw_Charge');
  }
  // release: the restart of the CSS animation needs the class off for one frame
  burst() {
    const b = this.btn; b.classList.remove('sp-burst'); void b.offsetWidth; b.classList.add('sp-burst');
    clearTimeout(this._burstT); this._burstT = setTimeout(() => b.classList.remove('sp-burst'), 700);
  }
  update() {
    if (!this.btn) return;
    const s = this.sp(), has = !!s?.def && this.active(), k = has ? Math.min(1, (s.charge || 0) / SPECIAL.chargeHits) : 0;
    if (k !== this.k) {
      this.k = k; this.btn.style.setProperty('--sp', `${Math.round(k * 360)}deg`);
      if (this.fill) this.fill.style.strokeDasharray = `${(k * 100).toFixed(2)} 100`;
      if (this.head) this.head.style.transform = `rotate(${(k * 360).toFixed(1)}deg)`;
    }
    this.btn.classList.toggle('sp-has', has); this.btn.classList.toggle('sp-full', has && k >= 1); this.btn.classList.toggle('sp-some', has && k > 0);
    if (this.charging) {
      if (!s?.ready?.()) return this.end();
      if ((performance.now() - this.t0) / 1000 >= HOLD) this.btn.classList.add('sp-charged');
    }
  }
}
