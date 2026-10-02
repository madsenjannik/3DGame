// Regression smoke test (R57). Run from the repo root:  node tests/smoke.mjs
// Needs Playwright + a Chromium (uses $PLAYWRIGHT path or the global install). Serves the repo itself,
// blocks all non-local requests (proves offline), and prints PASS/FAIL per check. Exit code 1 on failure.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { SNAPSHOT_SAVE, collectGardenSnapshot } from './garden-snapshot.mjs';

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
  // 7b. R64 Lake Run: start offer at the buoys, countdown holds the boat, buoys in order, log penalty, finish, medal reward, PB + ghost saved
  { const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
    const ready = ok && await p.waitForFunction(() => window.__tgw?.lakeRun, null, { timeout: 240000 }).then(() => true, () => false);
    const r = ready ? await p.evaluate(async () => {
      const g = window.__tgw, f = g.fishing, L = g.lakeRun, B = f.boat, o = {}, inv = id => g.state.inventory.get(id) || 0;
      L.devToStart(); await new Promise(x => setTimeout(x, 600)); L.devToStart();
      o.offer = g.interactions.resolve()?.type === 'lakerun-start' || L.interaction()?.type === 'lakerun-start';
      const amber = inv('amber'); L.begin(); f.input.frameMove = { x: 0, y: 0 };
      const dt = 1 / 30; let t = 0; const step = () => { t += dt; f.updateBoat(dt, t, true); L.update(dt); };
      const x0 = B.pos.x; B.tgt = { x: x0 + 5, z: B.pos.z }; for (let i = 0; i < 60; i++) step(); o.held = Math.abs(B.pos.x - x0) < .2 && L.state === 'countdown';
      for (let i = 0; i < 60 && L.state === 'countdown'; i++) step();
      let order = true;
      for (let i = 0; i < 30 * 200 && L.state === 'racing'; i++) { const n = L.next, q = L.seq[n], l = f.boatWorldToLocal(B.homePos.clone().set(q.x, B.homePos.y, q.z)); B.tgt = { x: l.x, z: l.z }; step(); if (L.next > n + 1) order = false; }
      const res = L.p; o.order = order; o.state = L.state; o.pen = L.pen >= 2; o.pb = res.best > 30 && res.best < 80 && res.ghost.length > 300 && res.splits.length === L.seq.length;
      o.reward = inv('amber') > amber || inv('fiber') > 0; o.card = document.querySelector('.lakerun-result').classList.contains('show') && res.attempts === 1;
      g.save.flush(); o.saved = JSON.parse(localStorage.getItem('tgw.save')).profiles.fern.lakeRun.best === res.best;
      o.t = res.best; return o;
    }) : {};
    check('lake run: start at buoys, countdown hold, buoys in order, log penalty, finish + medal reward, PB + ghost saved', ready && r.offer && r.held && r.order && r.state === 'result' && r.pen && r.pb && r.reward && r.card && r.saved && !errors.length, errors[0] || JSON.stringify(r));
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
      for (let i = 0; i < 60 && !w.gardenModels; i++) await new Promise(x => setTimeout(x, 1000));
      const ring = n.model?.ringMat && n.model.root.getObjectByName(n.model.root.children[0].name + '_Ring')?.scale.x === 1;
      return { kinds: kinds.size, thorns: w.thorns.every(t => t.thicket && t.cacheModel), state: n.state, gained: (g.state.inventory.get('wood') || 0) > wood, hidden: !n.body.visible, ring, bubbles: w.nodes.every(x => x.bubble),
        garden: !!(w.benchModel && w.barrelModel && w.shrineModel && w.hedgeModels?.length && w.pots?.slots.every(v => v.pm) && w.threat?.weedGltf) };
    }) : {};
    check('wilds + garden GLBs: nodes, thicket, caches, ring/bubble cues, garden builds; gather clip completes', r.kinds === 6 && r.thorns && r.state === 'regrowing' && r.gained && r.hidden && r.ring && r.bubbles && r.garden && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 10. R60 GardenBuildSystem: migration leaves every private-garden transform identical to the pre-R60 reference
  { const ctx = await context({ viewport: { width: 844, height: 390 } }); const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(sv => { localStorage.setItem('dym.homeMovedIn.v1.fern', '1'); localStorage.setItem('tgw.devMenu', '1'); localStorage.setItem('dym-gh-level', '2'); if (!sessionStorage.getItem('seeded')) { localStorage.setItem('tgw.save', JSON.stringify(sv)); sessionStorage.setItem('seeded', '1'); } }, SNAPSHOT_SAVE);
    await p.goto(B + 'game.html?char=fern', { waitUntil: 'load' });
    const ok = await p.waitForFunction(() => window.__tgw?.wilds?.gardenModels && window.__tgw.greenhouse?.entries.size === 3 && window.__tgw.wilds.threat, null, { timeout: 240000 }).then(() => true, () => false);
    let diffs = ['not loaded'];
    if (ok) { const ref = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/garden-snapshot.ref.json'), 'utf8')), now = await p.evaluate(collectGardenSnapshot); diffs = [];
      const walk = (a, b, k) => { if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) { if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push(k); return; } for (const x of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[x], b[x], `${k}.${x}`); };
      walk(ref, now, 'garden'); }
    check('garden migration: 0 transform differences vs pre-R60 reference', ok && !diffs.length && !errors.length, errors[0] || diffs.slice(0, 4).join(' '));
    // 11. old saves + defaults valid + structures follow a moved greenhouse
    const r = ok ? await p.evaluate(async () => {
      const g = window.__tgw, gb = g.garden, { STRUCTURES } = await import('./js/data/gardenCatalog.js'), { SaveGame } = await import('./js/core/SaveGame.js');
      const valid = Object.entries(STRUCTURES).every(([type, d]) => gb.problem(type, d.defaultAnchor.gx, d.defaultAnchor.gz, d.defaultAnchor.rot) === null);
      const pondBlocked = !!gb.problem('shrine', 17, 24, 0), overlap = !!gb.problem('shrine', 13, 30, 0);
      const weedsXZ = g.save.profile.threat.weeds.every(w => Number.isFinite(w.x) && Number.isFinite(w.z));
      const saved = g.save.profile.garden?.buildings?.length === 4;
      // Follow test: move the greenhouse 90° somewhere else and back; interaction + pots must follow.
      const gh = g.greenhouse, i0 = gh.interactionPoint(), p0 = g.wilds.pots.slots[0].g.position.clone();
      gh.setPlacement(-6, -10, 1); g.wilds.pots.placeForLevel(); const i1 = gh.interactionPoint(), p1 = g.wilds.pots.slots[0].g.position.clone();
      const follows = Math.abs(i1.x - (-6 + (gh.level ? [0.86, 0.86, 1.65, 2.52][gh.level] + .7 : 1.56))) < 1e-6 && Math.abs(i1.z + 10) < 1e-6 && p1.distanceTo(p0) > 5;
      const t = gb.transformOf('greenhouse'); gh.setPlacement(t.x, t.z, t.rot); g.wilds.pots.placeForLevel(); const back = g.wilds.pots.slots[0].g.position.distanceTo(p0) < 1e-9 && gh.interactionPoint().z === i0.z;
      // Old saves: v1, v3 with old-format weeds, garbage garden data; nothing may throw, defaults come back.
      const keep = localStorage.getItem('tgw.save'); let oldOk = true;
      try {
        for (const raw of [{ version: 1, profiles: { fern: { homeLevel: 3 } } }, { version: 3, profiles: { fern: { threat: { started: 1, weeds: [{ id: 'a', spot: 2, bornAt: 1 }] } } } }, { version: 3, profiles: { fern: { garden: { plots: 'x', buildings: [{ id: 'shrine', type: 'shrine', gx: 'a' }, { id: 'greenhouse', type: 'greenhouse', gx: 17, gz: 24, rot: 0 }] } } } }]) {
          localStorage.setItem('tgw.save', JSON.stringify(raw)); const sv = new SaveGame({ characterId: 'fern', ephemeral: false }); sv.ephemeral = true;
          const b = new gb.constructor({ profile: sv.profile, world: g.world }), d = STRUCTURES.greenhouse.defaultAnchor, gh2 = b.get('greenhouse');
          if (b.p.garden.buildings.length !== 4 || gh2.gx !== d.gx || gh2.gz !== d.gz || !b.p.garden.plots.includes('home')) oldOk = false;
          if (raw.profiles.fern.threat && !(sv.profile.threat.weeds[0]?.spot === 2)) oldOk = false;
        }
      } catch (e) { oldOk = 'threw ' + e.message; }
      localStorage.setItem('tgw.save', keep);
      return { valid, pondBlocked, overlap, weedsXZ, saved, follows, back, oldOk };
    }) : {};
    check('garden build: defaults valid, pond/overlap rejected, old saves load, structures follow placement', r.valid && r.pondBlocked && r.overlap && r.weedsXZ && r.saved && r.follows && r.back && r.oldOk === true && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 12. R60 step 2 build mode: ghost validity, cancel = no change, place moves group/collider/vegetation, persists, reset restores
  { const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('dym.homeMovedIn.v1.fern', '1'); localStorage.setItem('tgw.devMenu', '1'); localStorage.setItem('dym-gh-level', '1'); });
    await p.goto(B + 'game.html?char=fern', { waitUntil: 'load' });
    const ok = await p.waitForFunction(() => window.__tgw?.wilds?.gardenModels && window.__tgw.greenhouse?.entries.size === 3, null, { timeout: 240000 }).then(() => true, () => false);
    const step = (fn, arg) => p.evaluate(fn, arg), W = ms => p.waitForTimeout(ms);
    let r = {};
    if (ok) {
      await step(() => { const g = window.__tgw; g.devMenu.run('mats'); g.wilds.upgradeHome(); g.wilds.upgradeHome(); g.devMenu.teleport('garden', -3.85, 3.6, Math.PI); g.buildMode.start('shrine'); }); await W(5000);
      r.pondBlocked = await step(() => window.__tgw.buildMode.placeBtn.disabled && /pond/.test(window.__tgw.buildMode.snap?.why || ''));
      r.cancelSame = await step(() => { const g = window.__tgw, before = JSON.stringify(g.garden.get('shrine')); g.buildMode.cancel(); return !g.buildMode.active && JSON.stringify(g.garden.get('shrine')) === before; });
      await step(() => { const g = window.__tgw; g.devMenu.teleport('garden', -3.6, 9.0, -Math.PI / 2); g.buildMode.start('shrine'); }); await W(5000);
      Object.assign(r, await step(() => { const g = window.__tgw, placed = g.buildMode.confirm(), t = g.garden.transformOf('shrine'), grp = g.wilds.upgradeL2.position, ob = g.wilds.upgradeObstacles[2];
        g.save.flush(); return { placed, moved: !g.garden.isDefault('shrine'), follows: grp.x === t.x && grp.z === t.z && ob.x === t.x && ob.z === t.z, hidden: g.vegetationMask.meshes.reduce((a, e) => a + e.hidden, 0) }; }));
      await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__tgw?.wilds?.gardenModels && window.__tgw.greenhouse?.entries.size === 3, null, { timeout: 240000 }).catch(() => {});
      Object.assign(r, await step(() => { const g = window.__tgw, persisted = !g.garden.isDefault('shrine') && g.wilds.upgradeL2.position.x === g.garden.transformOf('shrine').x;
        g.garden.resetToDefaults(); return { persisted, resetHidden: g.vegetationMask.meshes.reduce((a, e) => a + e.hidden, 0), resetPos: g.wilds.upgradeL2.position.x === -9.2 && g.wilds.upgradeL2.position.z === 2.8 }; }));
      // R60.2 paths: spine never buildable; a moved greenhouse gets its own branch (stones + paint) that others must avoid; reset restores the authored branch.
      Object.assign(r, await step(() => { const g = window.__tgw, gb = g.garden, A = (t, x, z, rot) => gb.anchorFor(t, x, z, rot);
        const spine = /path/.test(gb.problem('greenhouse', ...Object.values(A('greenhouse', 2.6, -3.5, 3))) || '');
        const a = A('greenhouse', 6.7, -4, 3), moved = gb.place('greenhouse', a.gx, a.gz, a.rot) === null;
        const stones = g.world.dynamicBranchStones.length > 0 && g.world.branchStones.every(m => !m.visible) && !!g.world.greenhouseBranch;
        const s = A('shrine', 2.3, -3.6, 0), branchBlocks = /greenhouse path/.test(gb.problem('shrine', s.gx, s.gz, s.rot) || '');
        gb.resetToDefaults(); const restored = !g.world.greenhouseBranch && g.world.branchStones.every(m => m.visible) && g.world.dynamicBranchStones.length === 0;
        return { spine, moved, stones, branchBlocks, restored }; }));
    }
    check('build mode + paths: invalid blocked, cancel unchanged, place moves + hides vegetation, persists, reset restores, spine reserved, branch follows greenhouse', ok && r.pondBlocked && r.cancelSame && r.placed && r.moved && r.follows && r.hidden > 0 && r.persisted && r.resetHidden === 0 && r.resetPos && r.spine && r.stones && r.branchBlocks && r.restored && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 13. R61 combat: Mole warning→emerge→up, strike with the axe, defeat → loot (walk over) + first bonus, Mole hurts,
  //     wilt drops half the common materials in a pouch + sends you home, pouch recovers them, mercy drops nothing
  { const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
    const ready = ok && await p.waitForFunction(() => window.__tgw?.combat?.models?.mole, null, { timeout: 240000 }).then(() => true, () => false);
    let r = {};
    if (ready) {
      r = await p.evaluate(() => { const g = window.__tgw, c = g.combat, m = c.moles[0], ch = g.character, out = {}; g.wilds.profile.tools.axe = true;
        g.devMenu.teleport('world', m.home.x + 2.0, m.home.z, -Math.PI / 2);
        const seq = []; for (let i = 0; i < 60 && m.state !== 'up'; i++) { c.updateMole(m, .1, ch); if (seq[seq.length - 1] !== m.state) seq.push(m.state); } out.seq = seq.join('>');
        for (let k = 0; k < 4 && m.state !== 'defeat' && m.state !== 'gone'; k++) { c.cd = 0; if (['up', 'hit', 'attack', 'emerge'].includes(m.state)) c.attack(); for (let i = 0; i < 8; i++) c.updateMole(m, .1, ch); }
        for (let i = 0; i < 30; i++) c.updateMole(m, .1, ch);
        out.defeated = m.state === 'gone' && !!c.p.moles[m.id] && c.p.firstMole && (g.state.inventory.get('amber') || 0) >= 1; out.loot = c.loot.length;
        const before = ['clay', 'stone', 'fiber'].reduce((a, k) => a + (g.state.inventory.get(k) || 0), 0);
        for (const it of [...c.loot]) { for (let i = 0; i < 14; i++) c.updateLoot(.1, ch); ch.position.x = it.x; ch.position.z = it.z; for (let i = 0; i < 12; i++) c.updateLoot(.1, ch); }
        out.collected = ['clay', 'stone', 'fiber'].reduce((a, k) => a + (g.state.inventory.get(k) || 0), 0) > before && c.loot.length === 0;
        const m2 = c.moles[1] || m; c.p.moles = {}; c.respawnTick(Date.now()); m2.state = 'dormant'; ch.position.set(m2.x + 1.0, ch.position.y, m2.z);
        for (let i = 0; i < 80 && c.hp === 10; i++) c.updateMole(m2, .1, ch); out.hurt = c.hp === 8;
        for (const k of ['wood', 'stone', 'clay', 'fiber']) g.wilds.give(k, 10); window.__wpos = [ch.position.x, ch.position.z]; window.__wood = g.state.inventory.get('wood');
        c.hp = 1; c.invuln = 0; c.hurt(2, ch.position.x + .1, ch.position.z); return out; });
      await p.waitForFunction(() => !window.__tgw.combat.wilting, null, { timeout: 60000 }).catch(() => {});
      Object.assign(r, await p.evaluate(() => { const g = window.__tgw, c = g.combat, w0 = window.__wood, w1 = g.state.inventory.get('wood');
        const wilt = g.world.space === 'garden' && c.hp === 10 && w1 === w0 - Math.floor(w0 / 2) && c.p.pouches.length === 1 && c.p.mercyUntil > Date.now();
        g.devMenu.teleport('world', ...window.__wpos, 0); const back = c.pickUpPouch() && g.state.inventory.get('wood') === w0 && c.p.pouches.length === 0;
        window.__wood = g.state.inventory.get('wood'); c.hp = 1; c.invuln = 0; c.hurt(2, g.character.position.x + .1, g.character.position.z); return { wilt, back }; }));
      await p.waitForFunction(() => !window.__tgw.combat.wilting, null, { timeout: 60000 }).catch(() => {});
      r.mercy = await p.evaluate(() => window.__tgw.state.inventory.get('wood') === window.__wood && window.__tgw.combat.p.pouches.length === 0);
      // R62 snail in the garden: bites half a heart, garden never goes below half a heart, Strike kills it for a shell.
      await p.waitForFunction(() => window.__tgw.wilds.threat.snailGltf, null, { timeout: 120000 }).catch(() => {});
      Object.assign(r, await p.evaluate(() => { const g = window.__tgw, w = g.wilds, t = w.threat, c = g.combat, ch = g.character; c.heal(true); c.invuln = 0;
        if (g.greenhouse && g.greenhouse.level < 1) { g.greenhouse.level = 1; w.pots.placeForLevel(); } g.devMenu.run('mats'); g.devMenu.run('pots'); w.profile.pots.slots = [{ stage: 1, wet: true, readyAt: 9e12 }, null, null]; if (!t.active()) t.start(Date.now());
        const sn = t.spawnSnail(); if (!sn) return { snail: 'no spawn' }; g.devMenu.teleport('garden', sn.x + (sn.x > 0 ? -.9 : .9), sn.z, 0);  // always on the garden side of the snail
        for (let i = 0; i < 40 && c.hp === 10; i++) w.update(.1, i * .1, ch, 'garden'); const bite = c.hp === 9;
        c.hp = 1; c.invuln = 0; for (let i = 0; i < 40; i++) w.update(.1, i * .1, ch, 'garden'); const safe = c.hp === 1; c.heal(true);
        const sh = g.state.inventory.get('shell') || 0, offer = c.update(.016, 99, ch, true).interaction?.type === 'combat-strike'; c.cd = 0; c.attack();
        for (let i = 0; i < 40; i++) w.update(.1, i * .1, ch, 'garden');
        const ok = !!sn.model && bite && safe && offer && sn.state === 'gone' && (g.state.inventory.get('shell') || 0) > sh; return { snail: ok || JSON.stringify({ m: !!sn.model, bite, safe, offer, st: sn.state, hp: c.hp }) }; }));
    }
    check('combat: mole cycle, strike + defeat + loot, mole hurts, wilt pouch (half), recover, mercy, garden snail', ready && r.seq === 'warning>emerge>up' && r.defeated && r.loot >= 2 && r.collected && r.hurt && r.wilt && r.back && r.mercy && r.snail === true && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 14. R63 Wood Giant: arena placed, wake + camera pull-back, stomp hurts 1 heart, weak window doubles damage,
  //     roots hurt + weak point damages the Giant, defeat → sinks, gate opens, Golden Seed loot, win saved
  { const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
    const ready = ok && await p.waitForFunction(() => window.__tgw?.combat?.boss?.giant, null, { timeout: 240000 }).then(() => true, () => false);
    const r = ready ? await p.evaluate(() => { const g = window.__tgw, c = g.combat, B = c.boss, ch = g.character, o = {}; g.wilds.profile.tools.axe = true;
      // R65.1: walking close no longer wakes it; arena walls collide; the FIGHT marker starts it and the doors close
      g.devMenu.teleport('world', B.site.x, B.site.z + 6, Math.PI); B.update(.1, ch); o.sleeps = B.state === 'sleep';
      const wo = B.arenaObstacles[5], q = { x: wo.x + .05, z: wo.z }; g.world.resolveCollisions(q, .3); o.walls = B.arenaObstacles.length > 30 && Math.hypot(q.x - wo.x, q.z - wo.z) >= wo.r + .29 && B.doorObstacles.every(d => d.r < .1);
      g.devMenu.teleport('world', B.fightPoint.x, B.fightPoint.z, 0); o.offer = c.update(.016, c.time, ch, true).interaction?.type === 'combat-fight';
      c.interact('combat-fight'); o.wake = o.sleeps && o.offer && B.state === 'wake' && typeof g.followCamera.lockYaw === 'function' && B.doorObstacles.every(d => d.r > .3);
      for (let i = 0; i < 20; i++) B.update(.1, ch);
      let hp0 = c.hp; for (let i = 0; i < 120 && B.state !== 'stuck'; i++) { if (B.state === 'walk') ch.position.set(B.gx, ch.position.y, B.gz + 3.5); else if (B.state === 'stomp' || B.state === 'slam') { const Q = B.local(...(B.state === 'stomp' ? [2.9, -.5] : [0, 3.2])); ch.position.set(Q.x + .3, ch.position.y, Q.z); } B.update(.1, ch); }
      o.stomp = hp0 - c.hp >= 2 && B.state === 'stuck'; c.heal(true); c.invuln = 0;
      const h = B.hp; ch.position.set(B.gx, ch.position.y, B.gz + 3); c.cd = 0; c.attack(); o.weak = h - B.hp === 6;
      B.weak = 0; const h2 = B.hp; c.cd = 0; c.attack(); o.bark = h2 - B.hp === 1;
      B.hp = 15; B.spawnRoots(3, ch.position.x, ch.position.z); hp0 = c.hp; c.invuln = 0; for (let i = 0; i < 14; i++) B.updateRoots(.1, ch.position.x, ch.position.z);
      const up = B.roots.find(x => x.state === 'up'); let wp = 0; if (up) { ch.position.set(up.x + .5, ch.position.y, up.z); const hh = B.hp; c.cd = 0; c.attack(); wp = hh - B.hp; }
      o.roots = hp0 - c.hp >= 2 && wp === 3;
      // shockwave (phase 2+): grounded = hurt, hopping = safe
      c.heal(true); c.invuln = 0; B.spawnWave(B.gx, B.gz); ch.position.set(B.gx + 3, ch.position.y, B.gz); ch.isGrounded = true; let w0 = c.hp; for (let i = 0; i < 12; i++) B.updateWaves(.1, ch); const waveHit = w0 - c.hp === 2;
      c.heal(true); c.invuln = 0; B.spawnWave(B.gx, B.gz); ch.isGrounded = false; w0 = c.hp; for (let i = 0; i < 12; i++) B.updateWaves(.1, ch); ch.isGrounded = true; o.wave = waveHit && c.hp === w0;
      c.heal(true); for (let k = 0; k < 90 && B.hp > 0; k++) { B.weak = 0; ch.position.set(B.gx, ch.position.y, B.gz + 3); c.cd = 0; c.invuln = 1; c.attack(); }
      for (let i = 0; i < 40; i++) B.update(.1, ch);
      o.win = B.state === 'resting' && B.p.wins === 1 && c.loot.some(l => l.kind === 'golden_seed') && !g.followCamera.bossZoom || g.followCamera.bossZoom === 1;
      o.win = o.win && B.state === 'resting' && B.p.wins === 1 && c.loot.some(l => l.kind === 'golden_seed');
      return o; }) : {};
    check('wood giant: sleeps when you walk in, arena walls collide, FIGHT marker starts it + doors close, camera lock, stomp hurts, weak window x3, bark 1, roots + weak point, shockwave (hop to dodge), defeat + golden seed + saved', ready && r.walls && r.wake && r.stomp && r.weak && r.bark && r.roots && r.wave && r.win && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 17c. R65 character specials: Swing/Throw overlays on the locked character, landed hits fill the meter, all nine
  // specials hurt a Mole, the Giant's bark takes 0 and its weak window takes damage, a garden snail can be hit
  { const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'spire');
    const ready = ok && await p.waitForFunction(() => window.__tgw?.combat?.boss?.giant && window.__tgw.combat.models?.mole && window.__tgw.combat.special, null, { timeout: 240000 }).then(() => true, () => false);
    const r = ready ? await p.evaluate(async () => {
      const g = window.__tgw, c = g.combat, S = c.special, m = c.moles[0], ch = g.character, B = c.boss, o = {}, w = ms => new Promise(x => setTimeout(x, ms));
      const { SPECIAL } = await import('./js/data/combatCatalog.js'); g.wilds.profile.tools.axe = true;
      o.clips = ch.instance.playOverlay('Swing') > .5 && ch.instance.playOverlay('Throw') > .5;
      g.devMenu.teleport('world', m.home.x + 2, m.home.z, -Math.PI / 2);
      for (let i = 0; i < 60 && m.state !== 'up'; i++) c.updateMole(m, .1, ch);
      m.hp = 99; m.stunUntil = Date.now() + 1e6; S.charge = 0; c.cd = 0; c.attack(); o.gain = S.charge === 1;
      o.notFull = S.use() === false; const dmg = {};
      for (const [id, def] of Object.entries(SPECIAL.chars)) {
        S.def = def; m.hp = 50; m.state = 'up'; ch.position.set(m.x + 5, ch.position.y, m.z); S.charge = SPECIAL.chargeHits; S.busy = 0; S.zones = [];
        S.use(); for (let i = 0; i < 150; i++) S.update(1 / 30); dmg[id] = 50 - m.hp;
      }
      o.all = Object.values(dmg).every(v => v >= 2); o.dmg = dmg; m.stunUntil = 0; S.def = SPECIAL.chars.spire;
      g.devMenu.teleport('world', B.fightPoint.x, B.fightPoint.z, 0); c.interact('combat-fight'); ch.position.set(B.site.x, ch.position.y, B.site.z + 6);
      const shoot = () => { S.charge = SPECIAL.chargeHits; S.busy = 0; S.use(); for (let i = 0; i < 120; i++) S.update(1 / 30); };
      B.weak = 0; let hp = B.hp; shoot(); o.bark = hp - B.hp === 0; B.weak = 5; hp = B.hp; shoot(); o.weak = hp - B.hp > 0;
      B.end(false); return o;
    }) : {};
    check('specials: Swing/Throw clips on the locked character, hits fill the meter, all 9 specials hurt, Giant bark 0 / weak window hurts', ready && r.clips && r.gain && r.notFull && r.all && r.bark && r.weak && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 17b. R64.1 wilting mid-fight in the real frame loop ends the fight; the shed door back to the world does not
  // drop you into it again; the boss camera keeps the ground around you in view (camera above head height)
  { const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
    const ready = ok && await p.waitForFunction(() => window.__tgw?.combat?.boss?.giant, null, { timeout: 240000 }).then(() => true, () => false);
    const r = ready ? await p.evaluate(async () => {
      const g = window.__tgw, c = g.combat, B = c.boss, o = {}, w = ms => new Promise(x => setTimeout(x, ms));
      g.devMenu.teleport('world', B.site.x, B.site.z + 6, Math.PI);
      g.devMenu.teleport('world', B.fightPoint.x, B.fightPoint.z, 0); c.interact('combat-fight');
      o.fight = B.fighting(); await w(1500); o.camHigh = g.camera.position.y - g.character.position.y > 2.5;
      B.shake = .45; c.invuln = 0; c.hurt(99, g.character.position.x + .1, g.character.position.z);  // lethal Stomp: shake still running
      for (let i = 0; i < 400 && (c.wilting || g.world.space !== 'garden'); i++) await w(100);
      await w(1500); const cp = []; for (let i = 0; i < 6; i++) { cp.push(g.camera.position.clone()); await w(120); }
      o.still = B.shake === 0 && cp.every(v => v.distanceTo(cp[0]) < .02);
      o.ended = g.world.space === 'garden' && !B.fighting() && !g.followCamera.lockYaw && B.hp === 60;
      g.homePortal.interact('home-exit', g.character, g.followCamera, g.hud);
      for (let i = 0; i < 400 && (g.homePortal.busy || g.world.space !== 'world'); i++) await w(100);
      await w(2500); const ch = g.character.position; o.d = Math.hypot(ch.x - B.site.x, ch.z - B.site.z); o.free = g.world.space === 'world' && !B.fighting() && o.d > 20;
      return o;
    }) : {};
    check('wood giant: wilt mid-fight ends the fight + camera shake, back to the world is not pulled into the arena, camera above head', ready && r.fight && r.camHigh && r.ended && r.still && r.free && !errors.length, errors[0] || JSON.stringify(r));
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
