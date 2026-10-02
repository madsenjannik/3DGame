// @ts-nocheck
// DEV-only performance HUD: FPS, frame time, draw calls, triangles, textures, geometries, DPR,
// quality profile, WebGL contexts and JS heap (Chrome). Toggled from the Dev menu.
export class PerfHud {
  constructor(game) {
    this.g = game; this.on = false; this.frames = 0; this.acc = 0; this.worst = 0; this.last = performance.now();
    const el = document.createElement('div'); el.className = 'perf-hud'; el.hidden = true; document.body.appendChild(el); this.el = el;
    try { this.set(localStorage.getItem('tgw.perfHud') === '1'); } catch {}
  }
  set(on) { this.on = !!on; this.el.hidden = !this.on; try { localStorage.setItem('tgw.perfHud', this.on ? '1' : '0'); } catch {} }
  contexts() {
    // Live WebGL canvases in this page plus same-origin iframes that are actually loaded.
    let n = document.querySelectorAll('canvas').length ? 1 : 0;
    for (const f of document.querySelectorAll('iframe')) { const s = f.getAttribute('src') || ''; if (s && s !== 'about:blank') n++; }
    return n;
  }
  tick() {
    if (!this.on) return;
    const now = performance.now(), dt = now - this.last; this.last = now;
    this.frames++; this.acc += dt; this.worst = Math.max(this.worst, dt);
    if (this.acc < 500) return;
    const r = this.g.renderer, i = r.info, fps = this.frames * 1000 / this.acc, avg = this.acc / this.frames;
    const mem = performance.memory ? ` · heap ${(performance.memory.usedJSHeapSize / 1048576).toFixed(0)}MB` : '';
    this.el.textContent = `${fps.toFixed(0)} fps · ${avg.toFixed(1)}ms (max ${this.worst.toFixed(0)})\n` +
      `calls ${i.render.calls} · tris ${(i.render.triangles / 1000).toFixed(0)}k\n` +
      `tex ${i.memory.textures} · geo ${i.memory.geometries} · dpr ${r.getPixelRatio().toFixed(2)}\n` +
      `quality ${this.g.quality?.id || 'default'} · contexts ${this.contexts()}${mem}`;
    this.el.classList.toggle('bad', fps < 30); this.el.classList.toggle('ok', fps >= 50);
    this.frames = 0; this.acc = 0; this.worst = 0;
  }
}
