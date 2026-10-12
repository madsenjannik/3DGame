// @ts-nocheck
// R120 (GO 07/10): first-time control tips, one short card at a time, per device. A tip completes when the player
// does the thing (or taps/clicks the card); 'Skip' ends them all. Shown once per device (localStorage), fails soft.
const KEY = 'tgw.controlTips.v1';
// R134 (GO 08/10, DEV toggle 'Tutorial-tip øverst'): on phones the card sits under the resource bar, above the
// character; the toast steps down under it while a tip shows (body.tip-top / body.ct-on, styles.css).
const tipTop = () => { try { return localStorage.getItem('tgw.devMenu') === '1' && localStorage.getItem('tgw.dev.tipTop') === '1'; } catch { return false; } };
const done = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const STEP = 'tgw.controlTips.step';   // R156: the step survives a reload
const savedStep = () => { try { return Math.max(0, localStorage.getItem(STEP) | 0); } catch { return 0; } };

const TOUCH = [
  { text: 'Drag on the left side to walk', when: g => g.input.moveMagnitude > .3 },
  { text: 'Swipe on the right side to look around', when: (g, t) => t.look },
  { text: 'The green button acts: gather, talk, or strike', when: (g, t) => t.action },
  { text: 'Hop jumps over small things', when: (g, t) => t.hop },
  { text: 'Tap the bag to see your gear. Tap a slot to hold it', when: () => document.body.classList.contains('mobile-bag-open') }
];
const DESKTOP = [
  { text: 'W A S D to walk · Shift to run', when: g => ['KeyW', 'KeyA', 'KeyS', 'KeyD'].some(k => g.input.keys[k]) },
  { text: 'Hold the right mouse button and drag to look', when: (g, t) => t.look },
  { text: 'Left click strikes and uses your tools · E interacts', when: (g, t) => t.action },   // R142
  { text: 'Space hops', when: g => g.input.keys.Space },
  { text: 'B opens the bag · 1 to 0 pick a quick slot · M map · L lantern', when: g => ['KeyB', 'KeyM', 'KeyL', 'Digit1', 'Digit2'].some(k => g.input.keys[k]) }
];

export class ControlTips {
  constructor(game) {
    document.body.classList.toggle('tip-top', tipTop());
    this.g = game; this.i = 0; this.t = { look: false, action: false, hop: false }; this.showAt = performance.now() + 2500; this.shownAt = 0;   // real time: frame dt is clamped, so slow devices would wait far longer
    if (done()) { this.off = true; return; }
    this.steps = game.input.isTouch ? TOUCH : DESKTOP; this.i = Math.min(savedStep(), this.steps.length - 1);
    const el = document.createElement('div'); el.id = 'control-tips'; el.setAttribute('role', 'status');
    el.innerHTML = '<span class="ct-step"></span><b class="ct-text"></b><button type="button" class="ct-skip">Skip</button>';
    document.body.appendChild(el); this.el = el; this.textEl = el.querySelector('.ct-text'); this.stepEl = el.querySelector('.ct-step');
    for (const t of ['pointerdown', 'pointerup', 'pointermove']) el.addEventListener(t, e => e.stopPropagation());   // never moves or strikes
    el.addEventListener('click', e => { if (e.target.closest('.ct-skip')) this.finish(); else this.next(); });
    // Signals the frame loop cannot see after InputManager consumed them
    this.onDown = e => {
      if (e.target?.closest?.('#action')) this.t.action = true;
      else if (e.target?.closest?.('#hop-btn')) this.t.hop = true;
      else if (game.input.isTouch ? (e.pointerType !== 'mouse' && e.clientX >= innerWidth * .42 && e.target?.tagName === 'CANVAS') : (e.pointerType === 'mouse' && e.button === 2)) this.t.look = true;
      else if (!game.input.isTouch && e.pointerType === 'mouse' && e.button === 0 && e.target?.tagName === 'CANVAS') this.t.action = true;
    };
    this.onKey = e => { if (e.code === 'KeyE') this.t.action = true; };
    addEventListener('pointerdown', this.onDown, true); addEventListener('keydown', this.onKey, true);
  }
  render() { const s = this.steps[this.i]; this.textEl.textContent = s.text; this.stepEl.textContent = `${this.i + 1}/${this.steps.length}`; this.shownAt = performance.now(); }
  vis(on) { this.el?.classList.toggle('show', on); document.body.classList.toggle('ct-on', on); }
  next() { this.i++; try { localStorage.setItem(STEP, String(this.i)); } catch {} this.t.look = this.t.action = this.t.hop = false; if (this.i >= this.steps.length) return this.finish(); this.vis(false); this.showAt = performance.now() + 600; }
  finish() {
    this.off = true; try { localStorage.setItem(KEY, '1'); } catch {}
    removeEventListener('pointerdown', this.onDown, true); removeEventListener('keydown', this.onKey, true);
    this.vis(false); setTimeout(() => this.el?.remove(), 500);
  }
  // blocked: a story choice, portal, panel, map, special mode or build mode owns the screen
  update(dt, blocked) {
    if (this.off) return;
    const showing = this.el.classList.contains('show');
    const now = performance.now();
    if (blocked) { if (showing) this.vis(false); this.showAt = Math.max(this.showAt, now + 600); return; }
    if (!showing) { if (now >= this.showAt) { this.render(); this.vis(true); } return; }
    if (now - this.shownAt > 800 && this.steps[this.i].when(this.g, this.t)) this.next();
    else if (now - this.shownAt > 20000) this.next();   // R156: a tip never waits forever (e.g. Hop)
  }
}
