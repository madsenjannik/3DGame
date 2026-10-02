// Regression smoke test (R57). Run from the repo root:  node tests/smoke.mjs
// Needs Playwright + a Chromium (uses $PLAYWRIGHT path or the global install). Serves the repo itself,
// blocks all non-local requests (proves offline), and prints PASS/FAIL per check. Exit code 1 on failure.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.glb': 'model/gltf-binary' };
const server = http.createServer((q, s) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(s);
}).listen(0);
const B = `http://localhost:${server.address().port}/`;
const results = []; const check = (name, ok, info = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };

const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
async function context(opts = {}, block = []) {
  const ctx = await browser.newContext(opts);
  await ctx.route('**/*', r => { const u = r.request().url(); return !u.startsWith(B) || block.some(re => re.test(u)) ? r.abort() : r.continue(); });
  return ctx;
}
async function startGame(ctx, char, { dev = true } = {}) {
  const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(([c, d]) => { localStorage.setItem(`dym.homeMovedIn.v1.${c}`, '1'); if (d) localStorage.setItem('tgw.devMenu', '1'); else localStorage.removeItem('tgw.devMenu'); }, [char, dev]);
  await p.goto(B + `game.html?char=${char}`, { waitUntil: 'load' });
  const ok = await p.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 240000 }).then(() => true, () => false);
  return { p, errors, ok };
}

try {
  // 1. Start screen -> selector (desktop)
  { const ctx = await context({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(B + 'index.html', { waitUntil: 'load' }); await p.waitForTimeout(5500); await p.click('#start', { force: true });
    await p.waitForURL(/selector\.html/, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(6000);
    check('desktop: start screen -> selector, selector renders', p.url().includes('selector.html') && await p.evaluate(() => document.querySelectorAll('canvas').length > 0) && !errs.length, errs[0]);
    await ctx.close(); }
  // 2. Game on desktop + three phone viewports; move + objective + no page errors
  for (const [name, opts] of [['desktop 1280x720', { viewport: { width: 1280, height: 720 } }], ['phone 390x844', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['phone 844x390', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }], ['phone 667x375', { viewport: { width: 667, height: 375 }, isMobile: true, hasTouch: true }]]) {
    const ctx = await context(opts); const { p, errors, ok } = await startGame(ctx, 'fern');
    const moved = ok && await p.evaluate(async () => { const g = window.__tgw, z = g.character.position.z; g.input.keys.KeyW = true; await new Promise(r => setTimeout(r, 2500)); g.input.keys.KeyW = false; return Math.abs(g.character.position.z - z) > .05; });
    const obj = ok && await p.evaluate(() => document.getElementById('objective-title').textContent);
    check(`game ${name}: loads, player moves, objective shown`, ok && moved && !!obj && !errors.length, errors[0] || obj);
    await ctx.close();
  }
  // 3. Missing assets must not black-screen the game
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }, [/assets\/stable\//, /lake_cabin|cabin_fishing_runtime/, /greenhouse-l1/, /characters\/fern\.glb/]);
    const { p, errors, ok } = await startGame(ctx, 'fern'); const failed = ok ? await p.evaluate(() => window.__tgw.failed) : [];
    check('missing GLBs: game still starts with fallbacks', ok && failed.includes('character') && !errors.length, failed.join(',')); await ctx.close(); }
  // 4. Save migration + reload persistence
  { const ctx = await context(); const p = await ctx.newPage(); await p.goto(B + 'index.html');
    const r = await p.evaluate(async () => { const { SaveGame } = await import('./js/core/SaveGame.js'); localStorage.clear();
      localStorage.setItem('tgw.save', JSON.stringify({ version: 1, profiles: { fern: { homeLevel: 3, inventory: { wood: 5 } } } }));
      const a = new SaveGame({ characterId: 'fern' }); const migrated = a.profile.homeLevel === 2 && a.profile.pots.count === 1; a.profile.inventory.stone = 4; a.flush();
      const b = new SaveGame({ characterId: 'fern' }); return { migrated, persisted: b.profile.inventory.stone === 4 && b.profile.inventory.wood === 5, version: JSON.parse(localStorage.getItem('tgw.save')).version }; });
    check('save: v1 -> v3 migration + reload persistence', r.migrated && r.persisted && r.version === 3, JSON.stringify(r)); await ctx.close(); }
  // 6. R58 boat economy: vest -> rent -> waterfall reward -> fishing + boat persist across reload
  { const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
    const ready = ok && await p.waitForFunction(() => window.__tgw?.boatEco, null, { timeout: 240000 }).then(() => true, () => false);
    let r = {};
    if (ready) r = await p.evaluate(async () => {
      const g = window.__tgw, f = g.fishing, d = g.devMenu, inv = id => g.state.inventory.get(id) || 0, wait = ms => new Promise(x => setTimeout(x, ms));
      d.run('boat:reset'); d.run('mats'); d.run('boat:ready');
      f.openShop(); for (let i = 0; i < 80 && f.mode !== 'greet'; i++) await wait(100);
      const opts = f.dialogOptions().map(o => o[0]).join(',');
      f.choose('vest'); const vest = !!f.own.vest && inv('shell') === 18;
      const wood = inv('wood'); f.choose('rent'); const rented = f.boat.rented && inv('wood') === wood - 3;
      const gs = inv('golden_seed'); f.boat.on = true; f.boat.reachedWaterfall = true; await wait(400);
      const reward = g.wilds.profile.boat.waterfall === 1 && inv('golden_seed') === gs + 1;
      f.boat.on = false; f.boat.reachedWaterfall = false; await wait(400);
      g.save.flush(); return { opts, vest, rented, reward, trips: g.wilds.profile.boat.trips };
    });
    let persisted = false;
    if (ready) { await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__tgw?.boatEco, null, { timeout: 240000 }).catch(() => {});
      persisted = await p.evaluate(() => { const f = window.__tgw.fishing; return !!f.own.vest && f.speciesN() === 3 && window.__tgw.wilds.profile.boat.waterfall === 1; }); }
    check('boat economy: vest, rent, waterfall reward, persists after reload', ready && r.opts?.includes('vest') && r.vest && r.rented && r.reward && r.trips === 1 && persisted && !errors.length, errors[0] || JSON.stringify(r) + ' persisted=' + persisted);
    await ctx.close(); }
  // 7. R58.1 boat camera (free profile): follows behind the boat after turning; a swipe looks around
  { const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
    const ready = ok && await p.waitForFunction(() => window.__tgw?.fishing, null, { timeout: 240000 }).then(() => true, () => false);
    const r = ready ? await p.evaluate(async () => {
      const g = window.__tgw, f = g.fishing, c = g.followCamera, w = ms => new Promise(x => setTimeout(x, ms)), off = () => Math.abs(Math.atan2(Math.sin(c.yaw - g.character.heading - Math.PI), Math.cos(c.yaw - g.character.heading - Math.PI)));
      g.devMenu.run('tp:dock'); await w(600); f.setBoatAccess({ rented: true }); f.boardBoat(); await w(600);
      g.input.keys.KeyW = g.input.keys.KeyD = true; await w(7000); g.input.keys.KeyW = g.input.keys.KeyD = false; await w(3000);
      const behind = off(); const y0 = c.freeYaw; g.input.lookAccum.x += 160; await w(500); const swiped = Math.abs(c.freeYaw - y0) > .2;
      return { mode: f.mode, behind: +behind.toFixed(2), swiped };
    }) : {};
    check('boat camera: follows behind the boat, swipe looks around', r.mode === 'boat' && r.behind < .45 && r.swiped && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 8. R58.2 free-camera collision: backing into the workbench, a tree or the cabin never puts the camera inside the character
  { const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
    const ready = ok && await p.waitForFunction(() => window.__tgw?.fishing, null, { timeout: 240000 }).then(() => true, () => false);
    const r = [];
    if (ready) { const probes = await p.evaluate(() => { const g = window.__tgw, t = g.world.obstacles.find(o => o.space !== 'garden' && o.height > 2 && o.r > .25 && o.r < .7), sp = g.fishing.shopPoint;
        return [['bench', 'garden', 6.0, 6.55, Math.PI], ['tree', 'world', t.x, t.z - (t.r + .45), Math.PI], ['cabin', 'world', sp.x, sp.z, 0]]; });
      for (const [n, sp, x, z, h] of probes) { await p.evaluate(a => window.__tgw.devMenu.teleport(...a), [sp, x, z, h]); await p.waitForTimeout(3000);
        r.push(await p.evaluate(n => { const g = window.__tgw, c = g.camera.position, q = g.character.position; return { n, horiz: +Math.hypot(c.x - q.x, c.z - q.z).toFixed(2), up: +(c.y - q.y).toFixed(2) }; }, n)); } }
    check('free camera collision: never inside the character (bench, tree, cabin)', r.length === 3 && r.every(x => x.horiz >= .85 && x.up >= 1.3) && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 9. R59 wilds GLBs: all nine models load, nodes/thornbrush/caches use them, a gather clip completes
  { const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
    const ready = ok && await p.waitForFunction(() => window.__tgw?.wilds?.modelsReady, null, { timeout: 240000 }).then(() => true, () => false);
    const r = ready ? await p.evaluate(async () => {
      const g = window.__tgw, w = g.wilds, kinds = new Set(w.nodes.filter(n => n.model).map(n => n.kind)), n = w.nodes.find(x => x.kind === 'wood' && x.state === 'ready');
      const wood = g.state.inventory.get('wood') || 0; w.gather(n, g.character);
      for (let i = 0; i < 90 && n.state === 'gathering'; i++) await new Promise(x => setTimeout(x, 1000));
      return { kinds: kinds.size, thorns: w.thorns.every(t => t.thicket && t.cacheModel), state: n.state, gained: (g.state.inventory.get('wood') || 0) > wood, hidden: !n.body.visible };
    }) : {};
    check('wilds GLBs: 6 node kinds + thicket + caches, gather clip completes', r.kinds === 6 && r.thorns && r.state === 'regrowing' && r.gained && r.hidden && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 5. DEV disabled: no dev UI or handles leak into normal play
  { const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'daisy', { dev: false });
    const leak = ok && await p.evaluate(() => !!document.querySelector('.dev-menu-btn') || !!window.__tgw || !document.getElementById('dev-badge').hidden);
    check('dev disabled: no dev button, handle or badge', ok && !leak && !errors.length, errors[0]); await ctx.close(); }
} finally {
  await browser.close(); server.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exitCode = failed ? 1 : 0;
}
