// @ts-nocheck
// R189 Fase 0 (Jannik GO 16/10): a 20 s performance measurement for premium, started from the Dev menu ('Mål 20 s her').
// Per frame it records the real frame interval, the CPU time of the game step and of the render, draw calls and triangles
// (renderer.info is reset once per frame in Game.frame, so the numbers cover the whole scene, bloom passes included), and the
// time of every system run through Game.run. With the load timeline (loading gone, premium cover lifted, premium garden built,
// bloom on) and the downloads (count, MB, largest files) it makes a plain-text report that can be copied and pasted to Claude.
// Every run is kept for the session, so a garden run and a world run end up in one report.
import * as THREE from 'three';
const SECONDS = 20;
const q = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const f1 = n => (+n).toFixed(1), f0 = n => Math.round(+n);

export class PerfProbe {
  constructor(game) {
    this.g = game; this.runs = []; this.active = null; this.timeline = {};
    // R190 Fase 0b: the shadow pass's own draw calls and triangles, exactly (counted around three.js' shadow render)
    try { const r = game.renderer, sm = r.shadowMap, orig = sm.render.bind(sm); sm.render = (...args) => { const A = this.active, c = r.info.render.calls, t = r.info.render.triangles; this.inShadow = true; try { orig(...args); } finally { this.inShadow = false; } if (A) { A.shCalls += r.info.render.calls - c; A.shTris += r.info.render.triangles - t; } }; } catch {}
    // R198 A (Jannik GO 19/10): exact draw calls by group. On one frame every 5 s each real draw (three.js renderBufferDirect, which every
    // main, shadow and bloom draw goes through) is booked to its object's group, split into main view and shadow pass, with the calls and
    // triangles three.js itself counted for it. Off on every other frame (one flag test per draw).
    try { const r = game.renderer, orig = r.renderBufferDirect.bind(r), keyOf = new WeakMap();
      const key = o => { let k = keyOf.get(o); if (k) return k; const names = []; for (let q = o; q && !q.isScene; q = q.parent) if (q.name && !/^(Scene|AuxScene)$/.test(q.name)) names.unshift(q.name); k = (names.slice(0, 2).join(' > ') || o.type || '?').slice(0, 70); keyOf.set(o, k); return k; };
      r.renderBufferDirect = (cam, scene, geo, mat, obj, grp) => { const C = this.capture; if (!C) return orig(cam, scene, geo, mat, obj, grp);
        const i = r.info.render, c = i.calls, t = i.triangles; orig(cam, scene, geo, mat, obj, grp); const G = this.inShadow ? C.sh : C.main, k = key(obj), e = G[k] || (G[k] = { calls: 0, tris: 0 }); e.calls += i.calls - c; e.tris += i.triangles - t; }; } catch {}
    // R198 A: long main-thread tasks (> 50 ms; Chrome) for the hitch log and the load window
    this.long = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) { this.long.push([Math.round(e.startTime), Math.round(e.duration)]); if (this.long.length > 400) this.long.shift(); } }).observe({ type: 'longtask', buffered: true }); } catch {}
    // R198 B: when the cover is told to go (TGW_LOAD.done) and how many shader programs exist at each load mark
    try { const L = window.TGW_LOAD; if (L?.done) { const d = L.done; L.done = (...a) => { if (this.timeline.coverDone == null) { this.timeline.coverDone = Math.round(performance.now()); this.timeline.programsAtDone = this.programs(); } return d(...a); }; } } catch {}
    // load timeline, in ms since the page started (performance.now())
    const t0 = performance.now(), watch = () => {
      const T = this.timeline, mark = k => { if (T[k] == null) { T[k] = Math.round(performance.now()); (T.programs || (T.programs = {}))[k] = this.programs(); } }, S = this.g.swapSpot?.sanctuary;
      const ld = document.getElementById('loading'); if (!ld || ld.classList.contains('hide')) mark('loadingGone');
      if (T.coverSeen == null && document.getElementById('tgw-premium-veil')) T.coverSeen = Math.round(performance.now());
      if (T.coverSeen != null && !document.getElementById('tgw-premium-veil')) mark('coverLifted');
      if (S?.post) mark('ringBloomReady');   // R198 B: the Ring's own bloom pass exists (the cover waits for this)
      if (S) { mark('premiumGardenBuilt'); if (T.premiumBuildMs == null && S.buildMs) T.premiumBuildMs = Math.round(S.buildMs); }
      if (this.g.postFx) mark('bloomOn');
      if (performance.now() - t0 < 180000 && !(T.loadingGone != null && T.premiumGardenBuilt != null && T.bloomOn != null && (T.coverSeen == null || T.coverLifted != null))) setTimeout(watch, 100);
    };
    watch();
  }
  programs() { try { return this.g.renderer.info.programs?.length ?? null; } catch { return null; } }
  // Called by Game.frame around its parts; cheap no-ops while no run is active.
  sys(id, ms) { const A = this.active; if (A) { A.sys[id] = (A.sys[id] || 0) + ms; A.cur[id] = (A.cur[id] || 0) + ms; } }
  frame(stepMs, renderMs) {
    const A = this.active; if (!A) return; const now = performance.now(), i = this.g.renderer.info;
    if (this.capture) { this.book(A, this.capture); this.capture = null; }   // R198 A: the frame just drawn was the captured one
    if (now >= A.nextSample) { A.nextSample = now + 5000; try { this.sample(A); } catch {} this.capture = { main: {}, sh: {} }; }
    // R198 A: hitch log: a frame interval > 50 ms with what happened in it (new shader programs, the slowest system, long tasks, downloads that ended)
    const gap = A.last ? now - A.last : 0, progs = this.programs();
    if (gap > 50 && A.hitches.length < 12) { const top = Object.entries(A.cur).sort((a, b) => b[1] - a[1])[0], from = now - gap - 20;
      const longs = this.long.filter(([st, d]) => st + d >= from && st <= now).map(([, d]) => d), dl = performance.getEntriesByType('resource').filter(e => e.responseEnd >= from && e.responseEnd <= now).map(e => e.name.split('/').pop().split('?')[0]).slice(0, 4);
      A.hitches.push(`${f1((now - A.t0) / 1000)} s: ${f0(gap)} ms · step ${f1(stepMs)} render ${f1(renderMs)} · new programs ${progs != null && A.progs != null ? progs - A.progs : '?'} · slowest ${top ? `${top[0]} ${f1(top[1])}` : '-'} · long tasks ${longs.length ? longs.join('+') + ' ms' : 'none'} · ${A.space !== (this.g.world?.space || '?') ? 'space changed · ' : ''}loaded ${dl.join(', ') || 'nothing'}`); }
    A.progs = progs; A.cur = {};
    if (A.last) A.dt.push(gap); A.last = now; A.step.push(stepMs); A.render.push(renderMs); A.calls.push(i.render.calls); A.tris.push(i.render.triangles); A.frames++;
    if (now - A.t0 >= SECONDS * 1000) this.finish();
  }
  start(onDone) {
    if (this.active) return false;
    this.active = { t0: performance.now(), last: 0, frames: 0, dt: [], step: [], render: [], calls: [], tris: [], sys: {}, cur: {}, space: this.g.world?.space || '?', onDone, shCalls: 0, shTris: 0, groups: {}, samples: 0, nextSample: 0, exact: { main: {}, sh: {}, n: 0 }, hitches: [], progs: null };
    return true;
  }
  // R190 Fase 0b: what the main pass draws, by group: every visible mesh/sprite/points/line inside the camera frustum (the same test
  // three.js culls with), one draw call per material group, instanced meshes count their instances' triangles. Group = its first two named
  // ancestors under the scene. Sampled every 5 s and averaged.
  sample(A) {
    const cam = this.g.camera; if (!cam) return; cam.updateMatrixWorld(); const F = new THREE.Frustum(), M = new THREE.Matrix4();
    M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); F.setFromProjectionMatrix(M); const G = A.groups;
    const walk = (o, names) => { if (!o.visible) return; const nm = o.name && !/^(Scene|AuxScene)?$/.test(o.name) ? [...names, o.name] : names;
      if ((o.isMesh || o.isSprite || o.isPoints || o.isLine) && !(o.isMesh && o.material?.visible === false)) {
        const inView = o.frustumCulled === false || (o.isSprite ? F.intersectsSprite(o) : F.intersectsObject(o));
        if (inView && !(o.isInstancedMesh && o.count === 0)) { const geo = o.geometry, mats = Array.isArray(o.material) ? Math.max(1, geo?.groups?.length || o.material.length) : 1;
          const per = geo ? (geo.index ? geo.index.count : geo.attributes?.position?.count || 0) / 3 : 0, n = o.isInstancedMesh ? o.count : 1;
          const key = (nm.slice(0, 2).join(' > ') || o.type).slice(0, 70), e = G[key] || (G[key] = { calls: 0, tris: 0 }); e.calls += mats; e.tris += o.isMesh ? per * n : 0; } }
      for (const c of o.children) walk(c, nm); };
    walk(this.g.scene, []); A.samples++;
  }
  // R198 A: add one captured frame's exact per-group draws to the run
  book(A, C) { const E = A.exact; E.n++; for (const pass of ['main', 'sh']) for (const [k, v] of Object.entries(C[pass])) { const e = E[pass][k] || (E[pass][k] = { calls: 0, tris: 0 }); e.calls += v.calls; e.tris += v.tris; } }
  finish() {
    const A = this.active; this.active = null; const g = this.g, r = g.renderer, i = r.info;
    let gpu = '?'; try { const gl = r.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); gpu = e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch {}
    const n = Math.max(1, A.frames), secs = (performance.now() - A.t0) / 1000, sys = Object.entries(A.sys).map(([k, v]) => [k, v / n]).sort((a, b) => b[1] - a[1]).slice(0, 12);
    const run = {
      space: A.space, seconds: f1(secs), frames: A.frames, fps: f1(A.frames / secs),
      frameMs: { avg: f1(avg(A.dt)), p50: f1(q(A.dt, .5)), p95: f1(q(A.dt, .95)), p99: f1(q(A.dt, .99)), max: f0(Math.max(0, ...A.dt)) },
      hitches: { over33: A.dt.filter(d => d > 33.4).length, over50: A.dt.filter(d => d > 50).length, over100: A.dt.filter(d => d > 100).length },
      cpuMs: { step: f1(avg(A.step)), stepP95: f1(q(A.step, .95)), render: f1(avg(A.render)), renderP95: f1(q(A.render, .95)) },
      calls: { avg: f0(avg(A.calls)), max: f0(Math.max(0, ...A.calls)) }, trisK: { avg: f0(avg(A.tris) / 1000), max: f0(Math.max(0, ...A.tris) / 1000) },
      memory: { geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs?.length ?? '?', heapMB: performance.memory ? f0(performance.memory.usedJSHeapSize / 1048576) : '?' },
      view: { quality: g.quality?.id, dpr: f1(r.getPixelRatio()), canvas: `${r.domElement.width}x${r.domElement.height}`, bloom: !!g.postFx?.on, gpu },
      systemsMs: sys.map(([k, v]) => `${k} ${v.toFixed(2)}`),
      shadow: { calls: f0(A.shCalls / n), trisK: f0(A.shTris / n / 1000) },
      exactMain: this.top(A.exact.main, A.exact.n), exactShadow: this.top(A.exact.sh, A.exact.n), hitchLog: A.hitches,
      groups: Object.entries(A.groups).map(([k, v]) => [k, v.calls / Math.max(1, A.samples), v.tris / Math.max(1, A.samples)]).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, c, t]) => `${k}: ${f0(c)} calls, ${f0(t / 1000)}k tris`)
    };
    this.runs.push(run); try { A.onDone?.(run); } catch {}
  }
  top(G, n) { n = Math.max(1, n); return Object.entries(G).map(([k, v]) => [k, v.calls / n, v.tris / n]).filter(e => e[1] >= .5).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, c, t]) => `${k}: ${f0(c)} calls, ${f0(t / 1000)}k tris`); }
  downloads() {
    const res = performance.getEntriesByType('resource'), nav = performance.getEntriesByType('navigation')[0];
    const kb = e => (e.transferSize || e.encodedBodySize || 0) / 1024, total = res.reduce((s, e) => s + kb(e), 0) + (nav ? kb(nav) : 0);
    const cached = res.filter(e => e.transferSize === 0 && e.decodedBodySize > 0).length;
    const top = [...res].sort((a, b) => (b.encodedBodySize || 0) - (a.encodedBodySize || 0)).slice(0, 10).map(e => `${f0((e.encodedBodySize || 0) / 1024)} KB ${e.name.replace(location.origin, '').split('?')[0]} (${f0(e.startTime)}-${f0(e.responseEnd)} ms)`);
    return { requests: res.length, MB: f1(total / 1024), fromCache: cached, glbMB: f1(res.filter(e => /\.glb/.test(e.name)).reduce((s, e) => s + (e.encodedBodySize || 0), 0) / 1048576), top };
  }
  report() {
    const T = this.timeline, D = this.downloads(), v = window.TGW_VERSION || {};
    const L = [`TGW perf report · ${v.version || '?'} ${v.build || ''} · ${new Date().toISOString()}`, `UA ${navigator.userAgent}`,
      `LOAD (ms from page start): loading gone ${T.loadingGone ?? '-'} · premium garden built ${T.premiumGardenBuilt ?? '-'} (build ${T.premiumBuildMs ?? '-'} ms) · cover lifted ${T.coverLifted ?? '-'} · bloom on ${T.bloomOn ?? '-'}`,
      `LOAD DETAIL (R198): ring bloom ready ${T.ringBloomReady ?? '-'} · cover told to go ${T.coverDone ?? '-'} · shader programs ${Object.entries(T.programs || {}).map(([k, v]) => `${k} ${v}`).join(' · ') || '-'}${T.programsAtDone != null ? ` · coverDone ${T.programsAtDone}` : ''}`,
      `LONG TASKS > 50 ms in the load (to cover lifted + 1 s): ${this.long.filter(([st]) => st <= (T.coverLifted ?? 0) + 1000).map(([st, d]) => `${st}:${d}`).join(' ') || 'none (or not supported)'}`,
      `DOWNLOADS: ${D.requests} requests · ${D.MB} MB transferred · ${D.fromCache} from cache · GLB ${D.glbMB} MB`, ...D.top.map(s => '  ' + s)];
    for (const [k, R] of this.runs.entries()) L.push('', `RUN ${k + 1} · ${R.space} · ${R.seconds} s · ${R.frames} frames · ${R.fps} fps`,
      `  frame ms avg ${R.frameMs.avg} · p50 ${R.frameMs.p50} · p95 ${R.frameMs.p95} · p99 ${R.frameMs.p99} · max ${R.frameMs.max}`,
      `  hitches >33 ms ${R.hitches.over33} · >50 ms ${R.hitches.over50} · >100 ms ${R.hitches.over100}`,
      `  cpu ms step ${R.cpuMs.step} (p95 ${R.cpuMs.stepP95}) · render ${R.cpuMs.render} (p95 ${R.cpuMs.renderP95})`,
      `  draw calls avg ${R.calls.avg} max ${R.calls.max} · triangles avg ${R.trisK.avg}k max ${R.trisK.max}k`,
      `  memory geometries ${R.memory.geometries} · textures ${R.memory.textures} · programs ${R.memory.programs} · heap ${R.memory.heapMB} MB`,
      `  view ${R.view.quality} · dpr ${R.view.dpr} · canvas ${R.view.canvas} · bloom ${R.view.bloom} · ${R.view.gpu}`,
      `  systems (ms per frame) ${R.systemsMs.join(' · ')}`,
      `  shadow pass per frame: ${R.shadow.calls} calls, ${R.shadow.trisK}k tris (the rest of the calls are the main view + bloom)`,
      `  draws per frame by group, exact (R198; one frame every 5 s, averaged), main view + bloom:`, ...R.exactMain.map(g => '    ' + g),
      `  draws per frame by group, exact, SHADOW pass:`, ...(R.exactShadow.length ? R.exactShadow : ['none']).map(g => '    ' + g),
      `  hitches > 50 ms (first 12):`, ...(R.hitchLog.length ? R.hitchLog : ['none']).map(h => '    ' + h));
    if (!this.runs.length) L.push('', 'No 20 s run yet.');
    return L.join('\n');
  }
}
