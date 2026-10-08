// @ts-nocheck
// R126 (GO 08/10, phones): the special meter is a gold ring around the main action button and the special is used by
// holding that button. Tap = the normal action / strike (unchanged). When the ring is full, holding ~0.8 s charges
// (Throw_Charge on the character); releasing after that fires the existing special (SpecialSystem.use, locked logic
// untouched). Releasing early does nothing and keeps the full ring. Fails soft.
// R127/R128 (GO 08/10): dark socket + glossy moss disc + one gold segment per hit around it. Every tap punches the
// button; a newly earned segment pops. Full = gold rim, pulsing glow and turning light rays; holding = gold light
// grows from the centre and the disc presses in; release = shockwave. The look is CSS (styles.css R127/R128).
import { SPECIAL } from '../data/combatCatalog.js?build=DAYNIGHT-R81-20261005A';

const HOLD = .8;
// R128: the meter is one gold segment per hit the special needs (SPECIAL.chargeHits), so every hit visibly counts.
const N = Math.max(1, SPECIAL.chargeHits | 0 || 6);
const segs = () => { const out = [], r = 45, c = 50, gap = 7, p = a => `${(c + r * Math.cos(a * Math.PI / 180)).toFixed(2)} ${(c + r * Math.sin(a * Math.PI / 180)).toFixed(2)}`;
  for (let i = 0; i < N; i++) { const a0 = -90 + i * 360 / N + gap / 2, a1 = -90 + (i + 1) * 360 / N - gap / 2; out.push(`<path class="sp-seg" d="M${p(a0)} A${r} ${r} 0 0 1 ${p(a1)}"/>`); }
  return out.join(''); };
const ARC = '<svg class="sp-arc" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="spGold" x1="0" y1="0" x2="1" y2="1">'
  + '<stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#f6c64e"/><stop offset="1" stop-color="#e09a22"/></linearGradient></defs>' + segs() + '</svg>';

export class SpecialHold {
  constructor(game) {
    this.g = game; this.btn = document.getElementById('action'); this.charging = false; this.id = null; this.t0 = 0; this.k = -1;
    if (!this.btn) return;
    try {
      this.btn.insertAdjacentHTML('afterbegin', '<span class="act-rays" aria-hidden="true"></span><span class="act-disc" aria-hidden="true"></span>' + ARC + '<span class="act-wave" aria-hidden="true"></span>');
      this.segs = [...this.btn.querySelectorAll('.sp-seg')];
    } catch {}
    this.btn.addEventListener('pointerdown', e => this.down(e));
    addEventListener('pointerup', e => this.up(e)); addEventListener('pointercancel', e => { if (e.pointerId === this.id) this.end(); });
  }
  sp() { return this.g.combat?.special; }
  active() { return !!this.g.input?.isTouch && document.body.classList.contains('hud-classic'); }
  down(e) {
    if (!this.active()) return;
    this.restart('act-punch', 300);   // R128: every tap punches the button in and lets it spring back
    if (!this.sp()?.ready?.()) return;
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
  // restarting a CSS animation needs the class off for one frame
  restart(cls, ms, el = this.btn) {
    el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls);
    clearTimeout(el['_t_' + cls]); el['_t_' + cls] = setTimeout(() => el.classList.remove(cls), ms);
  }
  burst() { this.restart('sp-burst', 700); }
  update() {
    if (!this.btn) return;
    const s = this.sp(), has = !!s?.def && this.active(), k = has ? Math.min(1, (s.charge || 0) / SPECIAL.chargeHits) : 0;
    if (k !== this.k) {
      const lit = Math.floor(k * N + 1e-6), was = this.k < 0 ? lit : Math.floor(this.k * N + 1e-6);
      this.k = k; this.btn.style.setProperty('--sp', `${Math.round(k * 360)}deg`);
      this.segs?.forEach((g, i) => { g.classList.toggle('on', i < lit); if (i < lit && i >= was) this.restart('pop', 500, g); });
    }
    this.btn.classList.toggle('sp-has', has); this.btn.classList.toggle('sp-full', has && k >= 1); this.btn.classList.toggle('sp-some', has && k > 0);
    if (this.charging) {
      if (!s?.ready?.()) return this.end();
      if ((performance.now() - this.t0) / 1000 >= HOLD) this.btn.classList.add('sp-charged');
    }
  }
}
