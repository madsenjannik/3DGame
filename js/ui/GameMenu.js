// @ts-nocheck
// R121 (GO 07/10): small in-game menu. Round button under the quest card (phone + desktop E) and Esc on desktop when
// nothing else is open. No pause: the day/night clock follows real time, so the menu is only a layer over the game. Fails soft.
// R200 (Jannik GO 19/10): the premium card of the start screen's Settings (frosted cream, dark pill buttons). Resume · Settings
// (Graphics Auto/High/Medium/Low applied live, Sound, Reduce motion; the same values as the start screen, js/core/settings.js) ·
// Controls (shows the first-time tips again) · Quit to start screen. 'Switch character' is gone (Jannik: switching happens at the Ring).
import { ControlTips } from './ControlTips.js?build=SAVE-R159-20261014A';

const BUSY_CLASSES = ['fishing-active', 'boating-active', 'stable-talk-active', 'stable-race-active', 'lakerun-active', 'mobile-bag-open', 'choice-open', 'rotate-gated'];

export class GameMenu {
  constructor(game) {
    this.g = game; this.open = false;
    const btn = document.createElement('button'); btn.id = 'game-menu-btn'; btn.type = 'button'; btn.setAttribute('aria-label', 'Menu');
    btn.innerHTML = '<i></i><i></i><i></i>';
    const obj = document.getElementById('objective'); if (obj?.parentNode) obj.after(btn); else document.body.appendChild(btn);
    const el = document.createElement('div'); el.id = 'game-menu';
    el.innerHTML = '<div class="gm-card" role="dialog" aria-label="Menu"><small>The Growing Wilds</small><h2>Menu</h2>'
      + '<div class="gm-main"><button type="button" data-a="resume" class="gm-primary">Resume</button><button type="button" data-a="settings">Settings</button>'
      + '<button type="button" data-a="controls">Controls</button><button type="button" data-a="start">Quit to start screen</button></div>'
      + '<div class="gm-settings" hidden></div>'
      + `<span class="gm-ver">v${globalThis.TGW_VERSION?.version || ''}</span></div>`;
    document.body.appendChild(el); this.btn = btn; this.el = el; el.inert = true;   // R156: closed = not focusable
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
      // R156: while the menu is open only Esc / Tab / Enter / Space reach the page (B, M and 1-0 opened things under it);
      // Tab stays inside the menu; Esc with the Bag open closes the Bag first
      if (this.open && e.key === 'Tab') { const f = [...this.el.querySelectorAll('button:not([hidden]):not(:disabled)')].filter(b => b.offsetParent !== null); if (f.length) { const i = f.indexOf(document.activeElement), n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i + 1) % f.length; e.preventDefault(); f[n].focus(); } return; }
      if (this.open && !['Escape', 'Enter', ' ', 'Tab'].includes(e.key)) { e.stopImmediatePropagation(); return; }
      if (e.key === 'Escape' && !e.repeat && !this.open && document.querySelector('.gear-panel.open')) { e.preventDefault(); e.stopPropagation(); this.g.hud?.toggleGear?.(false); return; }
      if (e.key !== 'Escape' || e.repeat) return;
      if (this.open) { e.preventDefault(); e.stopPropagation(); if (performance.now() - (this.openedAt || 0) > 250) this.toggle(false); return; }   // R210: the Esc that freed the mouse (pointer lock) and opened the menu must not close it again
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
    this.open = !!on; if (this.open) this.openedAt = performance.now(); if (!this.open) this.settings(false); this.el.inert = !this.open; this.el.classList.toggle('open', this.open); document.body.classList.toggle('game-menu-open', this.open);
    if (this.open) { const i = this.g.input; i?.resetTouchPointers?.(); if (i) { i.actionPressed = i.hopPressed = i.strikePressed = false; for (const k in i.keys) i.keys[k] = false; }
      this.el.querySelector('.gm-primary')?.focus?.({ preventScroll: true }); }
  }
  // R200: the Settings view inside the same card (Back returns to the menu)
  settings(on) {
    const S = globalThis.TGW_SETTINGS, v = this.el.querySelector('.gm-settings'), main = this.el.querySelector('.gm-main'), h = this.el.querySelector('h2'); if (!v || !main) return;
    v.hidden = !on; main.hidden = !!on; if (h) h.textContent = on ? 'Settings' : 'Menu'; if (!on) { main.querySelector('[data-a="settings"]')?.focus?.({ preventScroll: true }); return; }
    const cur = S?.graphics?.() ?? '', motion = !!this.g.reduceMotion, sound = S?.sound?.() !== false;
    const row = (title, sub, ctl) => `<div class="gm-row"><div class="gm-copy"><b>${title}</b><span>${sub}</span></div>${ctl}</div>`;
    const tog = (a, on) => `<button type="button" data-a="${a}" class="gm-toggle${on ? ' on' : ''}" role="switch" aria-checked="${on}" aria-label="${a}"></button>`;
    v.innerHTML = (S ? row('Graphics', 'Auto picks the best look your device runs smoothly.', `<div class="gm-seg" role="radiogroup" aria-label="Graphics">${S.GRAPHICS.map(([k, l]) => `<button type="button" data-a="gfx:${k}" role="radio" aria-checked="${k === cur}" class="${k === cur ? 'on' : ''}">${l}</button>`).join('')}</div>`)
      + row('Sound', 'Music and effects.', tog('sound', sound)) : '')
      + row('Reduce motion', 'Less wind and movement, no camera shake or flashes.', tog('motion', motion))
      + '<button type="button" data-a="back" class="gm-primary">Back</button>';
    v.querySelector('.gm-primary')?.focus?.({ preventScroll: true });
  }
  run(a) {
    const g = this.g;
    if (a === 'resume') return this.toggle(false);
    // R200: Settings (live; stored for the start screen too)
    const S = globalThis.TGW_SETTINGS;
    if (a === 'settings') return this.settings(true);
    if (a === 'back') return this.settings(false);
    if (a.startsWith('gfx:')) { const v = a.slice(4); try { S?.setGraphics(v); g.quality?.set?.(v || null); } catch {} return this.settings(true); }
    if (a === 'sound') { try { S?.setSound(!S.sound()); } catch {} return this.settings(true); }
    if (a === 'motion') { const on = !g.reduceMotion; try { S ? S.setMotion(on) : localStorage.setItem('dymGame.entry.reduceMotion', on ? '1' : '0'); } catch {} g.reduceMotion = on; document.body.classList.toggle('reduce-motion', on); return this.settings(true); }
    if (a === 'controls') {
      this.toggle(false);
      if (g.tips && !g.tips.off) return;
      try { localStorage.removeItem('tgw.controlTips.v1'); } catch {}
      try { g.tips = new ControlTips(g); } catch {}
      return;
    }
    try { g.save?.flush(); } catch {}
    if (a === 'start') location.href = './index.html';
  }
}
