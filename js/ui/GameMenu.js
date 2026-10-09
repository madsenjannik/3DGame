// @ts-nocheck
// R121 (GO 07/10): small in-game menu. Round button under the quest card (phone + desktop E) and Esc on desktop when
// nothing else is open. Resume · Controls (shows the first-time tips again) · Choose character · Start screen.
// No pause: the day/night clock follows real time, so the menu is only a layer over the game. Fails soft.
import { ControlTips } from './ControlTips.js?build=SAVE-R153-20261009A';

const BUSY_CLASSES = ['fishing-active', 'boating-active', 'stable-talk-active', 'stable-race-active', 'lakerun-active', 'mobile-bag-open', 'choice-open', 'rotate-gated'];

export class GameMenu {
  constructor(game) {
    this.g = game; this.open = false;
    const btn = document.createElement('button'); btn.id = 'game-menu-btn'; btn.type = 'button'; btn.setAttribute('aria-label', 'Menu');
    btn.innerHTML = '<i></i><i></i><i></i>';
    const obj = document.getElementById('objective'); if (obj?.parentNode) obj.after(btn); else document.body.appendChild(btn);
    const el = document.createElement('div'); el.id = 'game-menu';
    el.innerHTML = '<div class="gm-card" role="dialog" aria-label="Menu"><small>The Growing Wilds</small><h2>Menu</h2>'
      + '<button type="button" data-a="resume" class="gm-primary">Resume</button><button type="button" data-a="controls">Controls</button>'
      + '<button type="button" data-a="chars">Switch character</button><button type="button" data-a="start">Start screen</button>'
      + '<div class="gm-confirm" hidden><p>All your characters share one garden and one game. Your progress is saved.</p>'
      + '<button type="button" data-a="chars-go" class="gm-primary">Switch character</button><button type="button" data-a="chars-no">Cancel</button></div>'
      + `<span class="gm-ver">v${globalThis.TGW_VERSION?.version || ''}</span></div>`;
    document.body.appendChild(el); this.btn = btn; this.el = el;
    for (const n of [btn, el]) for (const t of ['pointerdown', 'pointerup', 'pointermove']) n.addEventListener(t, e => e.stopPropagation());   // never moves or strikes
    // Act on pointerup, and only when the press also started on the same element: the click a browser sends after a
    // tap must never close the menu that tap just opened. Keyboard clicks (no pointer) still work.
    let downOn = null, viaPointer = 0;
    const onEl = e => { if (e.target === el) return this.toggle(false); const a = e.target.closest('[data-a]')?.dataset.a; if (a) this.run(a); };
    btn.addEventListener('pointerdown', () => { downOn = btn; });
    el.addEventListener('pointerdown', e => { downOn = e.target === el ? el : e.target.closest('[data-a]'); });
    btn.addEventListener('pointerup', () => { if (downOn === btn) { viaPointer = performance.now(); this.toggle(true); } downOn = null; });
    el.addEventListener('pointerup', e => { const t = e.target === el ? el : e.target.closest('[data-a]'); if (t && t === downOn) { viaPointer = performance.now(); onEl(e); } downOn = null; });
    const keyboardOnly = e => e.detail === 0 && performance.now() - viaPointer > 400;   // detail 0 = keyboard / programmatic click
    btn.addEventListener('click', e => { if (keyboardOnly(e)) this.toggle(true); });
    el.addEventListener('click', e => { if (keyboardOnly(e)) onEl(e); });
    // Capture phase: decide on the state before other Esc handlers (fishing, talks) close their own screens.
    addEventListener('keydown', e => {
      if (e.key !== 'Escape' || e.repeat) return;
      if (this.open) { e.preventDefault(); e.stopPropagation(); this.toggle(false); return; }
      if (!this.g.input?.isTouch && this.canOpen()) { e.preventDefault(); this.toggle(true); }
    }, true);
  }
  canOpen() {
    const b = document.body.classList, g = this.g;
    if (BUSY_CLASSES.some(c => b.contains(c))) return false;
    if (document.querySelector('.gear-panel.open')) return false;
    return !(g.state?.choice?.open || g.workbenchPanel?.open || g.devMenu?.open || g.buildMode?.active || g.worldMap?.isOpen || g.homePortal?.busy || g.lakeRun?.busy?.() || g.fishing?.isBusy?.() || g.stable?.isBusy?.());
  }
  toggle(on) {
    if (on && !this.canOpen()) return;
    this.open = !!on; if (!this.open) this.confirm(false); this.el.classList.toggle('open', this.open); document.body.classList.toggle('game-menu-open', this.open);
    if (this.open) { const i = this.g.input; i?.resetTouchPointers?.(); if (i) { i.actionPressed = i.hopPressed = i.strikePressed = false; for (const k in i.keys) i.keys[k] = false; }
      this.el.querySelector('.gm-primary')?.focus?.({ preventScroll: true }); }
  }
  confirm(on) {
    const c = this.el.querySelector('.gm-confirm'); if (!c) return;
    c.hidden = !on; this.el.querySelectorAll('.gm-card > button').forEach(b => { b.hidden = on; });
    if (on) c.querySelector('.gm-primary')?.focus?.({ preventScroll: true });
  }
  run(a) {
    const g = this.g, id = g.state?.player?.characterId || '';
    if (a === 'resume') return this.toggle(false);
    // R122: switching character asks first (each character has its own save)
    if (a === 'chars') return this.confirm(true);
    if (a === 'chars-no') return this.confirm(false);
    if (a === 'controls') {
      this.toggle(false);
      if (g.tips && !g.tips.off) return;
      try { localStorage.removeItem('tgw.controlTips.v1'); } catch {}
      try { g.tips = new ControlTips(g); } catch {}
      return;
    }
    try { g.save?.flush(); } catch {}
    if (a === 'chars-go') location.href = './selector.html?char=' + encodeURIComponent(id);
    else if (a === 'start') location.href = './index.html';
  }
}
