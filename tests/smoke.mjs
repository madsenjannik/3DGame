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
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary' };
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
async function startGame(ctx, char, { dev = true, hud = '', tips = false } = {}) {   // R120: tips = show the first-time control tips (off by default so they never cover what a check clicks)   // R110: hud = DEV HUD variant ('classic' = mobile HUD D, 'desktop-e'); R102–R109 checks assumed it was on
  const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(([c, d, h, t]) => { if (!t) localStorage.setItem('tgw.controlTips.v1', '1'); localStorage.setItem(`dym.homeMovedIn.v1.${c}`, '1'); if (d) localStorage.setItem('tgw.devMenu', '1'); else localStorage.removeItem('tgw.devMenu'); if (h) localStorage.setItem('tgw.hudTestB', h); }, [char, dev, hud, tips]);
  await p.goto(B + `game.html?char=${char}`, { waitUntil: 'load' });
  const ok = await p.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 240000 }).then(() => true, () => false);
  return { p, errors, ok };
}

try {
  // 1. Start screen -> selector (desktop)
  { const ctx = await context({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(B + 'index.html', { waitUntil: 'load' }); await p.waitForTimeout(5500); await p.click('#start', { force: true });
    await p.waitForURL(/selector\.html/, { timeout: 20000 }).catch(() => {}); await p.waitForFunction(() => document.body.classList.contains('cs-ready'), null, { timeout: 60000 }).catch(() => {});
    check('desktop: start screen -> selector, selector renders (R135: the new card selector)', p.url().includes('selector.html') && await p.evaluate(() => document.querySelectorAll('.cs-card').length === 3 && document.querySelectorAll('.cs-thumb').length === 9) && !errs.length, errs[0]);
    await ctx.close(); }
  // 2. Game on desktop + three phone viewports; move + objective + no page errors
  for (const [name, opts] of [['desktop 1280x720', { viewport: { width: 1280, height: 720 } }], ['phone 844x390', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }], ['phone 667x375', { viewport: { width: 667, height: 375 }, isMobile: true, hasTouch: true }]]) {
    const ctx = await context(opts); const { p, errors, ok } = await startGame(ctx, 'fern');
    const moved = ok && await p.evaluate(async () => { const g = window.__tgw, z = g.character.position.z; g.input.keys.KeyW = true; await new Promise(r => setTimeout(r, 2500)); g.input.keys.KeyW = false; return Math.abs(g.character.position.z - z) > .05; });
    const obj = ok && await p.evaluate(() => document.getElementById('objective-title').textContent);
    check(`game ${name}: loads, player moves, objective shown`, ok && moved && !!obj && !errors.length, errors[0] || obj);
    await ctx.close();
  }
  // 2a. R67 landscape-only on phones: portrait shows the rotate screen and pauses the loop; turning resumes and you can move
  { const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
    let r = {};
    if (ok) {
      r = await p.evaluate(async () => { const g = window.__tgw, w = ms => new Promise(x => setTimeout(x, ms)), t0 = g.time; await w(1500); return { gate: document.body.classList.contains('rotate-gated') && getComputedStyle(document.getElementById('rotate-gate')).display === 'flex', paused: g.time === t0 }; });
      await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(1500);
      Object.assign(r, await p.evaluate(async () => { const g = window.__tgw, z = g.character.position.z, t0 = g.time; g.input.keys.KeyW = true; await new Promise(x => setTimeout(x, 2500)); g.input.keys.KeyW = false;
        return { open: !document.body.classList.contains('rotate-gated'), runs: g.time > t0, moved: Math.abs(g.character.position.z - z) > .05 }; }));
    }
    check('landscape-only phones: portrait shows rotate screen + pauses, landscape resumes + moves', ok && r.gate && r.paused && r.open && r.runs && r.moved && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 2b. R69a unified landscape HUD, R71 phone fold: quest + resources behind two round buttons, map icon, resting joystick,
  //     gains pulse the chip, canvas fills, build bar hidden; desktop shows key hints and no joystick
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'tulip');
    const r = ok ? await p.evaluate(async () => { const g = window.__tgw, w = ms => new Promise(x => setTimeout(x, ms)), op = el => +getComputedStyle(el).opacity, o = {};
      await w(1500); const obj = document.getElementById('objective'), seed = document.querySelector('.seed-card'), wood = document.querySelector('.material-chip.wood'), stone = document.querySelector('.material-chip.stone');
      const b = el => el.getBoundingClientRect();
      // R71: quest + resources fold to two round buttons top left; tapping the bag opens the resource row
      const bag = document.getElementById('hud-bag'), inv = document.getElementById('inventory');
      obj.classList.remove('open', 'fresh'); await w(50);
      o.row = obj.parentElement.id === 'hud' && op(obj) > .9 && b(obj).width > 100 && b(obj).height <= 46 && getComputedStyle(document.getElementById('objective-title')).display !== 'none' && b(obj).top < 60 && !!bag && b(bag).left > b(obj).left && getComputedStyle(inv).display !== 'none' && inv.classList.contains('open');   // R75: quest = one title line; R84: resources always visible
      { const act = document.getElementById('action'), hop = document.getElementById('hop-btn'); o.row = o.row && act.classList.contains('show') && act.dataset.icon === 'sword' && !!hop && b(hop).width >= 44 && getComputedStyle(hop).display !== 'none'; }   // R75: main button always (Strike), Hop button
      o.row = o.row && Math.abs(b(wood).top - b(stone).top) < 2 && b(stone).left > b(wood).left && b(wood).left > b(seed).left;
      { const gp = document.getElementById('gear-panel'); bag.click(); await w(200); o.row = o.row && gp.classList.contains('open') && inv.classList.contains('open') && gp.querySelector('.gear-title'); bag.click(); await w(100); o.row = o.row && !gp.classList.contains('open'); }   // R84: the bag is what you carry
      const mini = document.querySelector('.tgw-minimap'); o.minimap = !!mini && b(mini).width <= 50 && !mini.querySelector('canvas').getBoundingClientRect().width && b(wood).right < b(mini).left;
      obj.click(); await w(100); o.row = o.row && obj.classList.contains('open') && b(obj).width > 120; obj.click();
      o.joy = getComputedStyle(document.getElementById('joy-rest')).display === 'block';
      g.state.addItem('wood', 2); await w(100); o.bump = wood.classList.contains('bump') && document.getElementById('wood-count').textContent !== '0' && document.getElementById('inventory').classList.contains('open');   // R71: a gain peeks the row open
      const c = document.querySelector('#app canvas'); o.fill = c.getBoundingClientRect().height === innerHeight && !c.style.height;
      o.bar = getComputedStyle(document.querySelector('.build-bar')).visibility === 'hidden'; o.keys = getComputedStyle(document.getElementById('key-hints')).display === 'none'; return o; }) : {};
    check('landscape HUD (phone): quest line + bag (R75), persistent Strike + Hop, tap opens them, map is an icon, resting joystick, gain pulse, canvas fills, no desktop hints', ok && r.row && r.minimap && r.joy && r.bump && r.fill && r.bar && r.keys && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  { const ctx = await context({ viewport: { width: 1280, height: 720 } }); const { p, errors, ok } = await startGame(ctx, 'tulip');
    const r = ok ? await p.evaluate(async () => { const g = window.__tgw, w = ms => new Promise(x => setTimeout(x, ms)), o = { keys: getComputedStyle(document.getElementById('key-hints')).display === 'flex', joy: getComputedStyle(document.getElementById('joy-rest')).display === 'none', mats: +getComputedStyle(document.getElementById('materials')).opacity === 1 };
      if (g.dayNight) g.dayNight.force = 0; g.devMenu.teleport('world', .1, 20, Math.PI); await w(600);   // R81: the R70 grade is checked by day (the real clock may be at night)
      o.lookWorld = g.look?.applied === true && g.renderer.toneMappingExposure > 1.05;
      g.devMenu.teleport('garden', 0, 6, Math.PI); await w(600); o.lookGarden = g.look?.applied === false && Math.abs(g.renderer.toneMappingExposure - 1.02) < 1e-6; return o; }) : {};
    check('landscape HUD (desktop): key hints, no joystick, resources visible; R70 look on in the world, off in the garden', ok && r.keys && r.joy && r.mats && r.lookWorld && r.lookGarden && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 2c. R102 desktop hotbar: keys/B, real pointer hold+drag, real held 3D source mesh, reload persistence
  { const ctx = await context({ viewport: { width: 1280, height: 720 } }); const { p, errors, ok } = await startGame(ctx, 'tulip', { hud: 'desktop-e' });
    let r = {};
    if (ok) r = await p.evaluate(async () => {
      const g=window.__tgw,w=ms=>new Promise(x=>setTimeout(x,ms));Object.assign(g.wilds.profile.tools,{axe:true,pickaxe:true,sickle:true,can:true});g.refreshHotbar(true);await w(100);
      const key=code=>window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));
      key('Digit2');await w(80);
      const held=g.equippedToolVisual?.current;
      const selected2=g.save.profile.hotbar.selected===1&&g.activeHotbarId()==='pickaxe'&&document.querySelector('.desktop-hotbar-slot[data-slot="1"]').classList.contains('selected');
      const real3d=!!held&&!held.isSprite&&held.parent?.name==='Hand_Socket_R'&&held.children?.some?.(x=>x.isMesh);
      key('KeyB');await w(80);const bag=document.getElementById('gear-panel').classList.contains('open');key('KeyB');await w(80);
      return{selected2,real3d,bag};
    });
    if(ok){
      const from=await p.locator('.desktop-hotbar-slot[data-slot="1"]').boundingBox(),to=await p.locator('.desktop-hotbar-slot[data-slot="6"]').boundingBox();
      if(from&&to){await p.mouse.move(from.x+from.width/2,from.y+from.height/2);await p.mouse.down();await p.mouse.move(from.x+from.width/2+10,from.y+from.height/2,{steps:2});await p.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:8});await p.mouse.up();await p.waitForTimeout(100);}
      Object.assign(r,await p.evaluate(()=>{const g=window.__tgw;return{moved:g.save.profile.hotbar.slots[6]==='pickaxe',selected7:g.save.profile.hotbar.selected===6&&g.activeHotbarId()==='pickaxe',pointer:getComputedStyle(document.getElementById('desktop-hotbar-e')).pointerEvents==='auto'};}));
      await p.evaluate(()=>window.__tgw.save.flush());await p.reload({waitUntil:'load'});await p.waitForFunction(()=>window.__tgw?.save?.profile?.hotbar,null,{timeout:240000}).catch(()=>{});
      r.persisted=await p.evaluate(()=>window.__tgw.save.profile.hotbar.slots[6]==='pickaxe'&&window.__tgw.save.profile.hotbar.selected===6);
    }
    check('desktop hotbar R102: 1–0/B, source 3D in hand, mouse hold+drag, reload persistence',ok&&r.selected2&&r.real3d&&r.bag&&r.pointer&&r.moved&&r.selected7&&r.persisted&&!errors.length,errors[0]||JSON.stringify(r));await ctx.close(); }

  // 2d. R103 water vegetation: brown triangular Plant_05_reed is retired everywhere in the shared root
  { const ctx = await context({ viewport: { width: 1280, height: 720 } }); const { p, errors, ok } = await startGame(ctx, 'succulent');
    let r = {};
    if (ok) r = await p.evaluate(async () => {
      const land=window.__tgw?.world?.sharedLandscape;
      await land?.waterVegetationReady;
      const names=(land?.waterVegetationRoot?.children||[]).map(o=>o.name||'');
      return {
        reed:names.filter(n=>n==='SummerWater_reed').length,
        bulrush:names.filter(n=>n==='SummerWater_bulrush').length,
        total:names.length,
        ready:!!land?.waterVegetationRoot
      };
    });
    check('water vegetation R103: no brown triangular reed clones; replacement vegetation present',
      ok&&r.ready&&r.reed===0&&r.bulrush>0&&r.total>0&&!errors.length,errors[0]||JSON.stringify(r));await ctx.close(); }

  // 2e. R122/R123 phone HUD (approved Bag mockup): menu icon left of day/night, day/night + resources without cards (dividers),
  //     objective = small icon that opens on tap, round Bag left of 3 slots, compact map and controls
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'succulent', { hud: 'classic' });
    let r = {};
    if (ok) r = await p.evaluate(async () => {
      const g = window.__tgw, w = ms => new Promise(x => setTimeout(x, ms)); Object.assign(g.wilds.profile.tools, { axe: true, pickaxe: true, sickle: true, can: true }); g.refreshHotbar(true); await w(150);
      const $ = s => document.querySelector(s), box = e => e?.getBoundingClientRect?.(), cs = e => getComputedStyle(e);
      const menu = $('#game-menu-btn'), world = $('#desktop-world-status'), inv = $('#inventory'), obj = $('#objective'), bag = $('#hud-bag'), map = $('.tgw-minimap');
      const slots = [...document.querySelectorAll('#desktop-hotbar-e .desktop-hotbar-slot')].filter(e => cs(e).display !== 'none' && box(e).width > 0);
      obj.classList.remove('open', 'pinned'); await w(60); const closed = box(obj);
      obj.click(); await w(150); const opened = box(obj); obj.click(); await w(60);
      const chips = [...inv.querySelectorAll('.material-chip')].filter(e => cs(e).display !== 'none');
      return {
        menuLeft: box(menu).right <= box(world).left + 2 && box(menu).left < 60,
        noCards: cs(world).backgroundImage === 'none' && cs(world).backgroundColor === 'rgba(0, 0, 0, 0)' && cs(inv).backgroundImage === 'none' && cs(inv).backgroundColor === 'rgba(0, 0, 0, 0)',
        dividers: chips.length > 1 && chips.slice(1).every(e => parseFloat(cs(e).borderLeftWidth) >= 1),
        questIcon: closed.width <= 46 && closed.height <= 46 && Math.abs(closed.right - box(map).right) <= 2,
        questOpens: opened.width >= 200 && opened.height < 180,
        bagRound: cs(bag).borderRadius === '50%' && box(bag).right <= box(slots[0]).left,
        threeSlots: slots.length === 3,
        compact: box(map).width <= 60 && box($('#hop-btn')).width <= 52 && box($('#action')).width >= 70 && box($('#joy-rest')).width <= 94   // R126 thumb arc: big action, small Hop
      };
    });
    check('phone HUD R122/R123/R126: menu icon left, day/night + resources without cards, objective icon opens on tap, round Bag + 3 slots, thumb-arc controls', ok && Object.values(r).length === 8 && Object.values(r).every(Boolean) && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }

  // 2f. R124 phone Bag: fullscreen, gameplay input reset, tool grid with 3D art, detail card with the game's own text + strike,
  //     Hold puts the real 3D tool in the hand, Add to slot places it, auto tool while gathering, close works
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'succulent', { hud: 'classic' });
    let r = {};
    if (ok) r = await p.evaluate(async () => {
      const g = window.__tgw, w = ms => new Promise(x => setTimeout(x, ms)); Object.assign(g.wilds.profile.tools, { axe: true, pickaxe: true, sickle: true, can: true }); g.refreshHotbar(true); await w(120);
      g.input.move.x = .7; g.input.move.y = .4; g.input.actionPressed = true; g.input.hopPressed = true;
      document.getElementById('hud-bag').click(); await w(120); g.input.update();
      const gp = document.getElementById('gear-panel'), b = gp.getBoundingClientRect(), o = {};
      o.full = document.body.classList.contains('mobile-bag-open') && Math.abs(b.width - innerWidth) < 2 && Math.abs(b.height - innerHeight) < 2;
      o.reset = g.input.moveMagnitude === 0 && !g.input.actionPressed && !g.input.hopPressed;
      const tile = gp.querySelector('.bag2-tile[data-item-id="pickaxe"]'); o.art = !!tile && getComputedStyle(tile.querySelector('.bag2-art')).backgroundImage.includes('tool3d/icon-pickaxe.png');
      tile.click(); await w(80);
      const d = gp.querySelector('.bag2-detail'); o.detail = /Stone Pickaxe/.test(d.textContent) && /Lets you break Boulders/.test(d.textContent) && /Strike 2/.test(d.textContent);
      gp.querySelector('.bag2-act[data-act="hold"]').click(); await w(150);
      const held = g.equippedToolVisual?.current; o.hold = g.activeHotbarId() === 'pickaxe' && !!held && held.parent?.name === 'Hand_Socket_R' && held.children?.some?.(x => x.isMesh);
      gp.querySelector('.bag2-tile[data-item-id="can"]').click(); await w(60); gp.querySelector('.bag2-act[data-act="slot"]').click(); await w(60); gp.querySelector('.bag2-slot[data-q="0"]').click(); await w(80);
      o.slot = g.save.profile.hotbar.slots[0] === 'can';
      gp.querySelector('.gear-close').click(); await w(100); o.closed = !document.body.classList.contains('mobile-bag-open') && !gp.classList.contains('open');
      g.equipHotbarSlot(-1); g.autoTool({ type: 'wilds-gather', node: { def: { requires: 'axe' } } }); o.auto = g.equippedToolVisual.id === 'axe';
      return o;
    });
    check('phone Bag R124: fullscreen + input reset, 3D tool art, detail with game text + strike, Hold = real tool in hand, Add to slot, auto tool, close', ok && Object.values(r).length === 8 && Object.values(r).every(Boolean) && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }

  // 2g. R125 Life Vest: worn from the Bag (saved), shown on the body (Spine), the boat needs it on
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern', { hud: 'classic' });
    let r = {};
    if (ok) { await p.waitForFunction(() => window.__tgw?.fishing, null, { timeout: 120000 }).catch(() => {});
      r = await p.evaluate(async () => {
        const g = window.__tgw, w = ms => new Promise(x => setTimeout(x, ms)), o = {}; g.fishing.own.vest = 1; g.boatEco?.persist?.(); g.refreshHotbar(true);
        const fi = g.fishing.interaction.bind(g.fishing); g.fishing.interaction = () => ({ type: 'boat-board', label: 'Board boat', distance: 0 });
        g.hud.showToast = (orig => t => { o.toast = t; orig.call(g.hud, t); })(g.hud.showToast);
        g._whyAt = 0; await w(1200); g.input.actionPressed = true; await w(2500); o.blocked = /Wear your Life Vest/.test(o.toast || '');
        document.getElementById('hud-bag').click(); await w(100); const gp = document.getElementById('gear-panel');
        gp.querySelector('.bag2-tile[data-item-id="vest"]').click(); await w(60); gp.querySelector('.bag2-act[data-act="wear"]').click(); await w(60); gp.querySelector('.gear-close').click();
        for (let i = 0; i < 60 && !g.vest?.model; i++) await w(250);
        o.worn = g.save.profile.wear?.vest === true && g.vestWorn(); o.onBody = !!g.vest?.model?.visible && /Spine|Hips/.test(g.vest.model.parent?.name || '');
        g.fishing.interaction = fi; g.save.flush(); return o;
      });
      await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 240000 }).catch(() => {});
      await p.waitForFunction(() => window.__tgw?.fishing, null, { timeout: 120000 }).catch(() => {});
      r.kept = await p.evaluate(async () => { const g = window.__tgw; for (let i = 0; i < 60 && !g.vest?.model; i++) await new Promise(x => setTimeout(x, 250)); return g.vestWorn() && !!g.vest?.model?.visible; }); }
    check('life vest R125: boat needs it on, Wear in the Bag puts it on the body, stays on after reload', ok && r.blocked && r.worn && r.onBody && r.kept && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }

  // 2g2. R146 desktop: the Bag (B) wears the Life Vest too (it was list-only, so desktop could never board the boat or race)
  { const ctx = await context({ viewport: { width: 1280, height: 720 } }); const { p, errors, ok } = await startGame(ctx, 'fern', { hud: 'desktop-e' }); let r = {};
    if (ok) { await p.waitForFunction(() => window.__tgw?.fishing && window.__tgw.boatEco, null, { timeout: 240000 }).catch(() => {});
      await p.evaluate(() => { const g = window.__tgw; g.fishing.own.vest = 1; g.boatEco?.persist?.(); g.refreshHotbar(true); });
      await p.keyboard.press('KeyB'); await p.waitForTimeout(400);
      r = await p.evaluate(async () => { const g = window.__tgw, w = ms => new Promise(x => setTimeout(x, ms)), gp = document.getElementById('gear-panel'), o = {};
        const row = () => gp.querySelector('.gear-item[data-item-id="vest"]'); o.row = !!row() && row().dataset.wear === '1' && /Click to wear/.test(row().textContent);
        row().click(); await w(100); o.worn = g.vestWorn() && /Worn/.test(row()?.textContent || '') && row()?.classList.contains('selected');
        row().click(); await w(100); o.off = !g.vestWorn(); row().click(); await w(100); return o; });
      r.stays = await p.evaluate(() => window.__tgw.vestWorn()); }
    check('R146 desktop Bag: click the Life Vest to wear it, again to take it off', ok && r.row && r.worn && r.off && r.stays && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }
  // 2i. R126 phone thumb arc: special ring on the action button, tap = strike (keeps the full ring), hold 0.8 s = special,
  //     no separate special or lantern button; the lantern lights by itself at dusk
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern', { hud: 'classic' });
    const r = {};
    if (ok) { await p.waitForFunction(() => window.__tgw?.combat?.special && window.__tgw?.lantern?.ready, null, { timeout: 120000 }).catch(() => {});
      Object.assign(r, await p.evaluate(async () => { const g = window.__tgw, w = ms => new Promise(x => setTimeout(x, ms)); g.devMenu.run('tid:day'); await w(800); g.combat.special.charge = 6; await w(600);
        const a = document.getElementById('action'), cs = getComputedStyle;
        const arc = a.querySelector('.sp-arc'), segs = a.querySelectorAll('.sp-seg'), ib = a.querySelector('#action-ico .ico-mask').getBoundingClientRect(), ab = a.getBoundingClientRect(), hb = document.getElementById('hop-btn').getBoundingClientRect();   // R127/R128: gold segments, icon centred, action in the corner, Hop up-left
        const corner = innerWidth - ab.right <= 12 && innerHeight - ab.bottom <= 12 && hb.right < ab.right && hb.bottom < ab.top + 20 && hb.right > ab.left;
        document.body.classList.add('boss-active'); const bossOk = () => +cs(document.getElementById('game-menu-btn')).opacity > .9 && +cs(document.getElementById('objective')).opacity < .1; for (let i = 0; i < 20 && !bossOk(); i++) await w(250); const menuBoss = bossOk(); document.body.classList.remove('boss-active');   // R128
        return { corner, menuBoss, ring: a.classList.contains('sp-full') && !!arc && cs(arc).display !== 'none' && segs.length === 6 && a.querySelectorAll('.sp-seg.on').length === 6 && Math.abs(ib.x + ib.width / 2 - ab.x - ab.width / 2) < 1.5 && Math.abs(ib.y + ib.height / 2 - ab.y - ab.height / 2) < 1.5, noSpecialBtn: cs(document.querySelector('.special-btn')).display === 'none', noLanternBtn: cs(document.getElementById('lantern-btn')).display === 'none' }; }));
      const b = await p.evaluate(() => { const x = document.getElementById('action').getBoundingClientRect(); return [x.x + x.width / 2, x.y + x.height / 2]; });
      await p.touchscreen.tap(b[0], b[1]); await p.waitForTimeout(400); r.tapKeeps = await p.evaluate(() => window.__tgw.combat.special.charge === 6);
      const cdp = await ctx.newCDPSession(p); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b[0], y: b[1] }] }); await p.waitForTimeout(900);
      r.charged = await p.waitForFunction(() => document.getElementById('action').classList.contains('sp-charged'), null, { timeout: 5000 }).then(() => true, () => false);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400);
      r.fired = await p.evaluate(() => { const s = window.__tgw.combat.special; return s.charge === 0 && (s.busy > 0 || !!s.release); });
      r.dusk = await p.evaluate(async () => { const g = window.__tgw, w = ms => new Promise(x => setTimeout(x, ms)); g.lantern.on = false; g.devMenu.run('tid:night'); for (let i = 0; i < 20 && !g.lantern.on; i++) await w(250); const lit = g.lantern.on; await w(400); const nightBtn = /rgba\(255, 255, 255, 0\.88\)/.test(getComputedStyle(document.getElementById('hop-btn')).backgroundColor);   /* R128: light buttons near solid at night */ g.devMenu.run('tid:day'); for (let i = 0; i < 20 && g.lantern.on; i++) await w(250); return lit && nightBtn && !g.lantern.on; }); }
    check('phone thumb arc (R126-R128): action in the corner + Hop up-left, menu stays in boss fights, night buttons near solid, 6 gold segments, icon centred, tap keeps it, hold 0.8 s fires it, no special/lantern buttons, lantern lights at dusk and goes out at dawn', ok && Object.values(r).length === 9 && Object.values(r).every(Boolean) && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }

  // 2h. R138 (replaces R125's per-character test): greenhouse = the highest level any character reached, Stable = the winning/last played profile's
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('tgw.controlTips.v1', '1'); localStorage.setItem('dym.homeMovedIn.v1.cactus', '1'); localStorage.setItem('tgw.devMenu', '1');
      if (!sessionStorage.getItem('r125')) { sessionStorage.setItem('r125', '1'); localStorage.setItem('tgw.lastChar', JSON.stringify({ id: 'fern', name: 'Fern' })); localStorage.setItem('dym-gh-level', '3'); localStorage.setItem('dym.thoraStable.v1', JSON.stringify({ lent: true })); } });
    await p.goto(B + 'game.html?char=cactus', { waitUntil: 'load' }); const ok = await p.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 240000 }).then(() => true, () => false);
    const r = ok ? await p.evaluate(async () => { const g = window.__tgw; for (let i = 0; i < 80 && !(g.greenhouse && g.stable); i++) await new Promise(x => setTimeout(x, 250));
      return { shared: g.greenhouse?.level === 3 && g.stable?.saveData?.lent === true, keys: localStorage.getItem('dym-gh-level.shared') === '3' && localStorage.getItem('dym.homeMovedIn.v1.shared') === '1', once: !!localStorage.getItem('tgw.shared.v1') }; }) : {};
    check('greenhouse + Stable shared (R138): a new character gets the highest greenhouse and the last played Stable progress, moved in is shared', ok && r.shared && r.keys && r.once && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }

  // 3. Missing assets must not black-screen the game
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }, [/assets\/stable\//, /lake_cabin|cabin_fishing_runtime/, /greenhouse-l1/, /characters\/fern\.glb/]);
    const { p, errors, ok } = await startGame(ctx, 'fern'); const failed = ok ? await p.evaluate(() => window.__tgw.failed) : [];
    check('missing GLBs: game still starts with fallbacks', ok && failed.includes('character') && !errors.length, failed.join(',')); await ctx.close(); }
  // 4. Save migration + reload persistence
  { const ctx = await context(); const p = await ctx.newPage(); await p.goto(B + 'index.html');
    const r = await p.evaluate(async () => { const { SaveGame } = await import('./js/core/SaveGame.js'); localStorage.clear();
      localStorage.setItem('tgw.save', JSON.stringify({ version: 1, profiles: { fern: { homeLevel: 3, inventory: { wood: 5 } } } }));
      const a = new SaveGame({ characterId: 'fern' }); const migrated = a.profile.homeLevel === 2 && a.profile.pots.count === 1; a.profile.inventory.stone = 4; a.flush();
      const b = new SaveGame({ characterId: 'fern' }), d = JSON.parse(localStorage.getItem('tgw.save'));
      return { migrated, persisted: b.profile.inventory.stone === 4 && b.profile.inventory.wood === 5, version: d.version, open: ['daisy', 'cactus', 'swamp', 'fern'].every(x => d.unlocked.includes(x)) && !d.unlocked.includes('tulip'), premerge: JSON.parse(localStorage.getItem('tgw.save.premerge') || '{}').version === 1 }; });
    check('save: v1 -> v4 migration (R138: one shared profile, played characters stay open, the old save kept) + reload persistence', r.migrated && r.persisted && r.version === 4 && r.open && r.premerge, JSON.stringify(r));
    // R138: the most advanced profile wins the merge (a boss win beats more wood); ties go to the character played last
    const m = await p.evaluate(async () => { const { SaveGame } = await import('./js/core/SaveGame.js?r138'); localStorage.clear();
      localStorage.setItem('tgw.save', JSON.stringify({ version: 3, profiles: { tulip: { inventory: { wood: 90 } }, fern: { inventory: { wood: 2 }, combat: { giant: { wins: 1, defeatedAt: 1 } } } } }));
      const a = new SaveGame({ characterId: 'daisy' }); a.flush(); const d = JSON.parse(localStorage.getItem('tgw.save'));
      localStorage.clear(); localStorage.setItem('tgw.lastChar', JSON.stringify({ id: 'aloe' })); localStorage.setItem('tgw.save', JSON.stringify({ version: 3, profiles: { tulip: { inventory: { wood: 1 } }, aloe: { inventory: { wood: 1 } } } }));
      const t = new SaveGame({ characterId: 'daisy' });
      return { boss: a.profile.inventory.wood === 2 && d.mergedFrom === 'fern' && Object.keys(d.profiles).join() === 'shared' && d.unlocked.includes('tulip'), tie: t.profile && t.data.mergedFrom === 'aloe' }; });
    check('save merge (R138): the most advanced profile becomes the shared game, ties go to the last played', m.boss && m.tie, JSON.stringify(m));
    // R113: two open tabs (two characters) never wipe each other; an unreadable save + backup is kept aside, not overwritten
    const t = await p.evaluate(async () => { const { SaveGame } = await import('./js/core/SaveGame.js?r113'); localStorage.clear();
      const a = new SaveGame({ characterId: 'fern' }), b = new SaveGame({ characterId: 'tulip' });   /* R138: one shared game; the open characters of both tabs survive */
      a.unlock('fern'); a.profile.inventory.wood = 5; a.flush(); b.unlock('tulip'); b.profile.inventory.stone = 3; b.flush(); a.profile.inventory.wood = 6; a.flush();
      const d = JSON.parse(localStorage.getItem('tgw.save')); const tabs = d.profiles.shared?.inventory.wood === 6 && d.unlocked.includes('fern') && d.unlocked.includes('tulip');
      localStorage.setItem('tgw.save', '{broken'); localStorage.setItem('tgw.save.bak', '{broken too'); new SaveGame({ characterId: 'fern' }).flush();
      return { tabs, corruptKept: localStorage.getItem('tgw.save.corrupt') === '{broken' }; });
    check('save (R113/R138): two tabs keep both open characters, corrupt save text is kept aside', t.tabs && t.corruptKept, JSON.stringify(t)); await ctx.close(); }
  // 6. R58 boat economy: vest -> rent -> waterfall reward -> fishing + boat persist across reload
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
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
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
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
  // 7b. R64 Lake Run / R71 Lake Race: hidden course, start at the dock circle, countdown holds the boat, buoys in order, log penalty, finish, medal reward, PB + ghost saved
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
    const ready = ok && await p.waitForFunction(() => window.__tgw?.lakeRun, null, { timeout: 240000 }).then(() => true, () => false);
    const r = ready ? await p.evaluate(async () => {
      const g = window.__tgw, f = g.fishing, L = g.lakeRun, B = f.boat, o = {}, inv = id => g.state.inventory.get(id) || 0;
      // R71: the course is hidden until you start at the gold circle at the end of Sigurd's dock (on foot)
      // R71: shore fishing anywhere along the lake and the stream (on foot)
      { const Ld = g.world.sharedLandscape, [a, b] = [Ld.stream[3], Ld.stream[4]], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
        // R72 general rule: a missing requirement keeps the button, grey 'Locked' (no rod yet / no boat access)
        f.starter = false; g.devMenu.teleport('world', Ld.lake.x, Ld.lake.z - Ld.lake.r - 1.2, 0); const lf = f.interaction(g.character.position);
        g.devMenu.teleport('world', L.spot.x, L.spot.z, 0); const ll = f.hasBoatAccess() ? { locked: true, label: 'Locked' } : L.interaction();
        o.locked = lf?.locked && lf.disabled && lf.label === 'Locked' && ll?.locked && ll.label === 'Locked';
        f.starter = true;
        const at = (x, z) => { g.devMenu.teleport('world', x, z, 0); return f.interaction(g.character.position)?.type; };
        o.shore = at((a[0] + b[0]) / 2 - dz / l * 3.2, (a[1] + b[1]) / 2 + dx / l * 3.2) === 'fishing-shore' && at(Ld.lake.x, Ld.lake.z - Ld.lake.r - 1.2) === 'fishing-shore' && at(.1, 20) !== 'fishing-shore'; }
      g.devMenu.run('lr:start'); await new Promise(x => setTimeout(x, 600)); L.update(.016);
      o.hidden = !L.root.visible && f.mode === 'world';
      o.offer = o.hidden && L.interaction()?.type === 'lakerun-start';
      const amber = inv('amber'); o.offer = o.offer && L.startFromSpot() && L.state === 'countdown' && f.mode === 'boat'; L.update(.016); o.offer = o.offer && L.root.visible; f.input.frameMove = { x: 0, y: 0 };
      const dt = 1 / 30; let t = 0; const step = () => { t += dt; f.updateBoat(dt, t, true); L.update(dt); };
      const x0 = B.pos.x; B.tgt = { x: x0 + 5, z: B.pos.z }; for (let i = 0; i < 60; i++) step(); o.held = Math.abs(B.pos.x - x0) < .2 && L.state === 'countdown';
      for (let i = 0; i < 60 && L.state === 'countdown'; i++) step();
      let order = true;
      for (let i = 0; i < 30 * 200 && L.state === 'racing'; i++) { const n = L.next, q = L.seq[n], l = f.boatWorldToLocal(B.homePos.clone().set(q.x, B.homePos.y, q.z)); B.tgt = { x: l.x, z: l.z }; step(); if (L.next > n + 1) order = false; }
      const res = L.p; o.order = order; o.state = L.state; o.pen = L.pen >= 2; o.pb = res.best > 30 && res.best < 80 && res.ghost.length > 300 && res.splits.length === L.seq.length;
      o.reward = inv('amber') > amber || inv('fiber') > 0; o.card = document.querySelector('.lakerun-result').classList.contains('show') && res.attempts === 1;
      g.save.flush(); o.saved = JSON.parse(localStorage.getItem('tgw.save')).profiles.shared.lakeRun.best === res.best;
      o.t = res.best; return o;
    }) : {};
    check('lake race: hidden until the dock circle, start there, shore fishing on lake + stream, grey Locked without rod/boat (R72), countdown hold, buoys in order, log penalty, finish + medal reward, PB + ghost saved', ready && r.offer && r.shore && r.locked && r.held && r.order && r.state === 'result' && r.pen && r.pb && r.reward && r.card && r.saved && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 8. R58.2 free-camera collision: backing into the workbench, a tree or the cabin never puts the camera inside the character
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
    const ready = ok && await p.waitForFunction(() => window.__tgw?.fishing, null, { timeout: 240000 }).then(() => true, () => false);
    const r = [];
    if (ready) { const probes = await p.evaluate(() => { const g = window.__tgw, t = g.world.obstacles.find(o => o.space !== 'garden' && o.height > 2 && o.r > .25 && o.r < .7), sp = g.fishing.shopPoint;
        return [['bench', 'garden', 6.0, 6.55, Math.PI], ['tree', 'world', t.x, t.z - (t.r + .45), Math.PI], ['cabin', 'world', sp.x, sp.z, 0]]; });
      for (const [n, sp, x, z, h] of probes) { await p.evaluate(a => window.__tgw.devMenu.teleport(...a), [sp, x, z, h]); await p.waitForTimeout(3000);
        r.push(await p.evaluate(n => { const g = window.__tgw, c = g.camera.position, q = g.character.position; return { n, horiz: +Math.hypot(c.x - q.x, c.z - q.z).toFixed(2), up: +(c.y - q.y).toFixed(2) }; }, n)); } }
    check('free camera collision: never inside the character (bench, tree, cabin)', r.length === 3 && r.every(x => x.horiz >= .85 && x.up >= 1.3) && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 9. R59 wilds GLBs: all nine models load, nodes/thornbrush/caches use them, a gather clip completes
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
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
    await p.addInitScript(sv => { localStorage.setItem('tgw.controlTips.v1', '1'); localStorage.setItem('dym.homeMovedIn.v1.fern', '1'); localStorage.setItem('tgw.devMenu', '1'); localStorage.setItem('dym-gh-level', '2'); if (!sessionStorage.getItem('seeded')) { localStorage.setItem('tgw.save', JSON.stringify(sv)); sessionStorage.setItem('seeded', '1'); } }, SNAPSHOT_SAVE);
    await p.goto(B + 'game.html?char=fern', { waitUntil: 'load' });
    const ok = await p.waitForFunction(() => window.__tgw?.wilds?.gardenModels && window.__tgw.greenhouse?.entries.size === 3 && window.__tgw.wilds.threat, null, { timeout: 240000 }).then(() => true, () => false);
    let diffs = ['not loaded'];
    if (ok) await p.waitForFunction(() => window.__tgw.swapSpot?.model, null, { timeout: 60000 }).catch(() => {});   // R140: the ring is in place first
    if (ok) { const ref = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/garden-snapshot.ref.json'), 'utf8')), now = await p.evaluate(collectGardenSnapshot); diffs = [];
      // R140: the Sprouting Ring replaced the two bed shrubs on purpose (their collider is gone, its pots have their own); compare everything else exactly
      const ring = await p.evaluate(() => (window.__tgw.vegetationMask?.fixed || []).filter(f => f.colliders));
      const keep = c => c[0] !== 'ring-pot' && !ring.some(f => Math.hypot(c[1] - f.cx, c[2] - f.cz) < f.r); ref.colliders = ref.colliders.filter(keep); now.colliders = now.colliders.filter(keep);
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
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('tgw.controlTips.v1', '1'); localStorage.setItem('dym.homeMovedIn.v1.fern', '1'); localStorage.setItem('tgw.devMenu', '1'); localStorage.setItem('dym-gh-level', '1'); });
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
        const regrow = (g.vegetationMask.patch || []).some(m => m.visible && m.count > 100);   /* R143: grass grows back where the greenhouse stood */
        gb.resetToDefaults(); const restored = !g.world.greenhouseBranch && g.world.branchStones.every(m => m.visible) && g.world.dynamicBranchStones.length === 0 && (g.vegetationMask.patch || []).every(m => !m.visible);
        return { spine, moved, stones, branchBlocks, regrow, restored }; }));
    }
    check('build mode + paths: invalid blocked, cancel unchanged, place moves + hides vegetation, persists, reset restores, spine reserved, branch follows greenhouse', ok && r.pondBlocked && r.cancelSame && r.placed && r.moved && r.follows && r.hidden > 0 && r.persisted && r.resetHidden === 0 && r.resetPos && r.spine && r.stones && r.branchBlocks && r.regrow && r.restored && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 13. R61 combat: Mole warning→emerge→up, strike with the axe, defeat → loot (walk over) + first bonus, Mole hurts,
  //     wilt drops half the common materials in a pouch + sends you home, pouch recovers them, mercy drops nothing
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
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
  //     roots hurt + weak point damages the Giant, defeat → sinks, gate opens, no Golden Seed (R149: the Tulip Seed instead), win saved
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
    const ready = ok && await p.waitForFunction(() => window.__tgw?.combat?.boss?.giant, null, { timeout: 240000 }).then(() => true, () => false);
    const r = ready ? await p.evaluate(() => { const g = window.__tgw, c = g.combat, B = c.boss, ch = g.character, o = {}; g.wilds.profile.tools.axe = true;
      // R65.1: walking close no longer wakes it; arena walls collide; the FIGHT marker starts it and the doors close
      g.devMenu.teleport('world', B.site.x, B.site.z + 6, Math.PI); B.update(.1, ch); o.sleeps = B.state === 'sleep';
      const wo = B.arenaObstacles[5], q = { x: wo.x + .05, z: wo.z }; g.world.resolveCollisions(q, .3); o.walls = B.arenaObstacles.length > 30 && Math.hypot(q.x - wo.x, q.z - wo.z) >= wo.r + .29 && B.doorObstacles.every(d => d.r < .1) && B.openDoorObstacles.length > 0 && B.openDoorObstacles.every(d => d.r > .3) && B.bodyParts.length === 2 && B.bodyParts.every(b => b.bone && b.o.space === 'world' && b.o.r > .5) && B.giant.visible && B.cur?.getClip().name === 'Sleep' && !B.target(B.gx, B.gz, 9) && B.eyes.every(e => !e.visible);   // R72: sits asleep (Sleep), solid, not hittable, eyes dark
      g.devMenu.teleport('world', B.fightPoint.x, B.fightPoint.z, 0); o.offer = c.update(.016, c.time, ch, true).interaction?.type === 'combat-fight';
      c.interact('combat-fight'); o.wake = o.sleeps && o.offer && B.state === 'wake' && B.cur?.getClip().name === 'WakeUp' && typeof g.followCamera.lockYaw === 'function' && B.doorObstacles.every(d => d.r > .3) && B.openDoorObstacles.every(d => d.r < .1);
      for (let i = 0; i < 20; i++) B.update(.1, ch);
      const mid = { x: (B.bodyParts[0].o.x + B.bodyParts[1].o.x) / 2, z: (B.bodyParts[0].o.z + B.bodyParts[1].o.z) / 2 }, mq = { ...mid }; g.world.resolveCollisions(mq, .3); o.between = B.giant.visible && B.bodyParts.every(b => b.o.r > .5) && Math.hypot(mq.x - mid.x, mq.z - mid.z) < .01;   // R71: checked once it has risen
      let hp0 = c.hp; for (let i = 0; i < 120 && B.state !== 'stuck'; i++) { if (B.state === 'walk') ch.position.set(B.gx, ch.position.y, B.gz + 3.5); else if (B.state === 'stomp' || B.state === 'slam') { const Q = B.local(...(B.state === 'stomp' ? [2.9, -.5] : [0, 3.2])); ch.position.set(Q.x + .3, ch.position.y, Q.z); } B.update(.1, ch); }
      o.stomp = hp0 - c.hp >= 2 && B.state === 'stuck'; c.heal(true); c.invuln = 0;
      { const s0 = { x: ch.position.x, z: ch.position.z }; c.hurt(2, s0.x - 1, s0.z, 3.5); const lock = ch.controlLock > .3; for (let i = 0; i < 20; i++) c.update(.03, c.time + .03, ch, true); o.thrown = lock && Math.hypot(ch.position.x - s0.x, ch.position.z - s0.z) > 2 && !c.kb; c.heal(true); c.invuln = 0; }
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
      o.win = B.state === 'resting' && B.p.wins === 1 && !c.loot.some(l => l.kind === 'golden_seed') && !g.followCamera.bossZoom || g.followCamera.bossZoom === 1;
      o.win = o.win && B.state === 'resting' && B.p.wins === 1 && !c.loot.some(l => l.kind === 'golden_seed');
      return o; }) : {};
    check('wood giant: asleep until the FIGHT circle (R72 Sleep/WakeUp), arena walls collide, free between the legs, thrown back by big hits, FIGHT marker starts it + doors close, camera lock, stomp hurts, weak window x3, bark 1, roots + weak point, shockwave (hop to dodge), defeat + no golden seed (R149) + saved', ready && r.walls && r.between && r.thrown && r.wake && r.stomp && r.weak && r.bark && r.roots && r.wave && r.win && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 17c. R65 character specials: Swing/Throw overlays on the locked character, landed hits fill the meter, all nine
  // specials hurt a Mole, the Giant's bark takes 0 and its weak window takes damage, a garden snail can be hit
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'spire');
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
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
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
  // 17d. R79 Root Bear: grove (30 conifers on the ring, open core, mossy rocks), asleep + solid, wakes on its own at
  // 8 m (no circle), Sweep ring + its own Roots spike line hurt, weak window x3 / bark 1, gives up outside the grove,
  // awake window = wanders the core + attacks within 8 m, lies down on its den again, defeat = Hyacinth Seed (R149, no Golden Seed) + 24 h
  // rematch saved, wilting ends the fight, Wood Giant arena unchanged
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
    const ready = ok && await p.waitForFunction(() => window.__tgw?.combat?.bear?.bear && window.__tgw.combat.models?.loot_golden_seed, null, { timeout: 240000 }).then(() => true, () => false);
    const r = ready ? await p.evaluate(async () => { const g = window.__tgw, c = g.combat, B = c.bear, L = g.world.sharedLandscape, G = L.bearGrove, ch = g.character, o = {}, w = ms => new Promise(x => setTimeout(x, ms)); g.wilds.profile.tools.axe = true;
  const run = (n, dt = .1, each, stop) => { for (let i = 0; i < n; i++) { each?.(); B.update(dt, ch); if (stop?.()) break; } };
  const put = (x, z) => { ch.position.set(x, ch.position.y, z); ch.root.position.copy(ch.position); };
  // grove: 30 extra conifers on the ring, rocks, open core (no shared-forest tree blocks inside it), world colliders
  for (let i = 0; i < 100 && !B.rockSpots.every(r => r.o); i++) await w(100);
  const coreBlock = g.world.colliders.filter(q => q.space === 'world' && /world-(conifer|tree)/.test(q.kind) && q.r > .1 && Math.hypot(q.x - G.x, q.z - G.z) < G.core);
  o.grove = B.groveTrees.length === 30 && B.groveTrees.every(t => { const d = Math.hypot(t.x - G.x, t.z - G.z); return d >= 17 && d <= 28 && t.s >= 1.3; }) && B.clearedPosts >= 1 && G.core === 15 && B.groveObstacles.every(q => q.space === 'world') && B.rockSpots.length === 4 && B.rockSpots.every(r => r.o?.space === 'world') && !coreBlock.length && B.groveMeshes.length > 0;
  // asleep on its den (clock forced to night side), solid, eyes dark, not hittable
  B.forceAwake = false; B.p.defeatedAt = 0; B.bx = B.den.x; B.bz = B.den.z; B.heading = B.den.heading; B.reset(); put(B.den.x + 30, B.den.z); run(1);
  const so = B.sleepObstacles[3], q = { x: so.x + .05, z: so.z }; g.world.resolveCollisions(q, .3);
  o.sleep = B.state === 'sleep' && B.cur?.getClip().name === 'Sleep' && B.sleepObstacles.length > 20 && Math.hypot(q.x - so.x - .05, q.z - so.z) > .3 && B.eyes.every(e => !e.visible) && !B.target(B.bx, B.bz, 9) && B.bodyParts.every(b => b.o.r < .1);
  // 8 m: wakes on its own (no circle), boss bar, camera yaw lock
  const h = B.den.heading; put(B.den.x + Math.sin(h) * 9, B.den.z + Math.cos(h) * 9); run(1); const still = B.state === 'sleep';
  put(B.den.x + Math.sin(h) * 7.5, B.den.z + Math.cos(h) * 7.5); run(1);
  o.wake = still && B.state === 'wake' && B.cur?.getClip().name === 'WakeUp' && typeof g.followCamera.lockYaw === 'function' && B.ui.classList.contains('show') && document.body.classList.contains('boss-active');
  run(45); o.risen = B.state === 'chase' && B.eyes.every(e => e.visible) && B.bodyParts.every(b => b.o.r === b.r) && B.sleepObstacles.every(s => s.r < .1);
  // Sweep: ring telegraph in front, 1 heart
  c.heal(true); c.invuln = 0; let hp0 = c.hp;
  run(80, .1, () => { if (B.state === 'chase') { const f = B.local(0, 5); put(f.x, f.z); } else if (B.state === 'sweep') { const P = B.local(0, 4.5); put(P.x + .2, P.z); } }, () => B.state === 'stuck');
  o.sweep = hp0 - c.hp === 2 && B.state === 'stuck' && B.weak > 0;
  // weak window ×3 (axe 2 → 6), bark 1
  const f0 = B.local(0, 5); put(f0.x, f0.z); let hh = B.hp; c.cd = 0; c.attack(); o.weak = hh - B.hp === 6;
  B.weak = 0; hh = B.hp; c.cd = 0; c.attack(); o.bark = hh - B.hp === 1;
  // R79.1: a lobbed special (Mud Splat / Gel Bomb / Scent Cloud) aimed at the bear lands on it (was NaN: bear keeps bx/bz)
  { const S = c.special, d0 = S.def; S.def = { ...d0, kind: 'lob', range: 8, dmg: 3, r: 2 }; S.fire({ kind: 'bear', m: B, x: B.bx, z: B.bz }); const s = S.shots[S.shots.length - 1]; o.lob = !!s && Number.isFinite(s.land.x) && Math.hypot(s.land.x - B.bx, s.land.z - B.bz) < .1; S.root.remove(s.obj); S.shots.pop(); S.def = d0; }
  // Roots: its own spike line in front, 1½ hearts
  c.heal(true); c.invuln = 0; hp0 = c.hp; B.state = 'chase'; B.t = 0; B.startAttack('roots', B.phase()); const R = B.local(.6, 9.1); put(R.x, R.z);
  run(40, .1, () => { if (B.state !== 'roots') return; c.invuln = Math.min(c.invuln, .01); });
  o.roots = hp0 - c.hp === 3 && B.state === 'stuck' && B.spikes.length === 7 && B.spikes.every(s => s.scale.x === 0);
  // run out of the grove: it gives up, full HP, camera free
  B.hp = 20; put(B.den.x + 40, B.den.z); run(1); o.leash = B.state === 'calm' && B.hp === 35 && !g.followCamera.lockYaw && !B.ui.classList.contains('show');
  // awake window: walks the core, never out of it; attacks within 8 m while wandering
  B.forceAwake = true; run(30); let maxOff = 0; const p0 = { x: B.bx, z: B.bz }; run(300, .1, () => { maxOff = Math.max(maxOff, Math.hypot(B.bx - B.den.x, B.bz - B.den.z)); });
  o.wander = B.state === 'wander' && Math.hypot(B.bx - p0.x, B.bz - p0.z) + maxOff > 1 && maxOff <= G.core - 2.4;
  put(B.bx + 6, B.bz); run(1); o.aggro = B.state === 'chase';
  // back to sleep when the window ends: walks to the den and lies down
  B.end(false); put(B.den.x + 40, B.den.z); B.forceAwake = false; run(400); o.lie = B.state === 'sleep' && Math.hypot(B.bx - B.den.x, B.bz - B.den.z) < .1 && Math.abs(B.heading - B.den.heading) < .01;
  // defeat: sinks, no Golden Seed loot (R149), win + 24 h rematch saved
  put(B.den.x + Math.sin(h) * 7, B.den.z + Math.cos(h) * 7); run(1); run(45);
  c.heal(true); for (let k = 0; k < 90 && B.hp > 0; k++) { B.weak = 1; const f = B.local(0, 5); put(f.x, f.z); c.cd = 0; c.invuln = 1; c.attack(); }
  run(40); o.win = B.state === 'resting' && !B.bear.visible && B.p.wins === 1 && B.p.defeatedAt > 0 && !c.loot.some(l => l.kind === 'golden_seed') && !B.available() && B.bodyParts.every(b => b.o.r < .1);
  g.save.persist(); const saved = JSON.parse(JSON.stringify(g.save.profile.combat.bear)); o.saved = saved.wins === 1 && saved.defeatedAt === B.p.defeatedAt;
  // R79 the giant arena did not move
  o.arena = Math.round(c.boss.site.x) === 14 && Math.round(c.boss.site.z) === -79;
  // wilting mid-fight ends it (no camera lock, full HP again)
  B.p.defeatedAt = 0; B.bx = B.den.x; B.bz = B.den.z; B.heading = B.den.heading; B.reset(); put(B.den.x + Math.sin(h) * 7, B.den.z + Math.cos(h) * 7); run(1); const fought = B.fighting();
  c.invuln = 0; c.hurt(99, ch.position.x + .1, ch.position.z); for (let i = 0; i < 400 && c.wilting; i++) await w(100);
  o.wilt = fought && !B.fighting() && !g.followCamera.lockYaw && B.hp === 35;
  B.forceAwake = null; return o; }) : {};
    check('root bear: grove + open core, asleep + solid, wakes at 8 m, sweep + roots hurt, weak x3 / bark 1, leash, wanders the core + aggro, lies down again, defeat (no golden seed, R149) + saved, wilt ends it, giant arena unchanged', ready && ['grove', 'sleep', 'wake', 'risen', 'sweep', 'weak', 'bark', 'roots', 'lob', 'leash', 'wander', 'aggro', 'lie', 'win', 'saved', 'arena', 'wilt'].every(k => r[k]) && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 17e. R80 fishing grip: the bamboo rod sits in the right hand only while fishing (fist in the hand's own colour, float
  // dangling under the tip, cast from the tip, wind-up moves the rod back, reel cranks the left hand), bones go back after
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'swamp');
    const ready = ok && await p.waitForFunction(() => window.__tgw?.fishing?._rod, null, { timeout: 240000 }).then(() => true, () => false);
    const r = ready ? await p.evaluate(() => { const g = window.__tgw, f = g.fishing, ch = g.character, Ld = g.world.sharedLandscape, o = {}, step = (n, dt = .05) => { for (let i = 0; i < n; i++) f.update(dt, (f._tt = (f._tt || 0) + dt), ch); };
      f.starter = true; g.devMenu.teleport('world', Ld.lake.x, Ld.lake.z - Ld.lake.r - 1.2, 0); step(1); o.hidden = !f._rod.visible;
      f.enterFish(); step(20); const G = f.grip, V = f._rodTipWorld.constructor, hand = G.B.hR.getWorldPosition(new V());
      o.inHand = G.ok && G.active && f._rod.visible && f._rod.position.distanceTo(hand) < .15 && G.fist.visible && G.fist.position.distanceTo(hand) < .1;
      o.colour = G.fistMat.color.getHexString() !== '356a1c';   // swamp's own hand, not the default green
      o.dangle = f.bobber.visible && f.line.visible && f.bobber.position.y < f._rodTipWorld.y && f.bobber.position.distanceTo(f._rodTipWorld) < .5;
      const tip0 = f._rodTipWorld.clone(), back = new V(-Math.sin(ch.heading), 0, -Math.cos(ch.heading));
      f.pressFishing(); f.timer = .8; step(12, .03); const tip1 = f._rodTipWorld.clone(); o.windUp = tip1.clone().sub(tip0).dot(back) > .3;
      f.releaseFishing(); step(1, .03); o.castFromTip = f.bobber.position.distanceTo(tip1) < 1.2 && f.phase === 'cast';
      step(30); f.waitDur = 99; step(2); o.wait = f.phase === 'wait' && f.line.visible;
      f.phase = 'bite'; f.timer = 0; f.biteWindow = 9; f.pressFishing(); const l0 = G.B.hL.getWorldPosition(new V()); let moved = 0; for (let i = 0; i < 6; i++) { f.holding = true; step(1); moved = Math.max(moved, G.B.hL.getWorldPosition(new V()).distanceTo(l0)); } o.crank = f.phase === 'reel' && moved > .02;
      f.phase = 'ready'; step(2); const base = G.saved.get(G.B.aR)?.base.clone(); f.leaveFish(); step(2); o.back = f.mode === 'world' && !f._rod.visible && !G.fist.visible && !G.active && (!base || G.B.aR.quaternion.angleTo(base) < .05);
      return o; }) : {};
    check('fishing grip (R80): rod in the right hand only while fishing, own hand colour, float dangles, wind-up, cast from the tip, reel cranks, bones back after', ready && ['hidden', 'inHand', 'colour', 'dangle', 'windUp', 'castFromTip', 'wait', 'crank', 'back'].every(k => r[k]) && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 17f. R81 day/night + lantern + mud splat: the clock gives 21 min day / 9 min night per real half hour; night darkens
  // the shared world only (garden untouched); the lantern can only be lit at night in the world, hangs from the left hand
  // with its own light and is put away by day; Swamp's Mud Splat leaves a brown splat while it stuns; the Root Bear's
  // rematch is one in-game day
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'swamp');
    const ready = ok && await p.waitForFunction(() => window.__tgw?.lantern?.ready && window.__tgw.dayNight && window.__tgw.combat?.special?.gltf, null, { timeout: 240000 }).then(() => true, () => false);
    const r = ready ? await p.evaluate(async () => { const g = window.__tgw, dn = g.dayNight, L = g.lantern, o = {}, { nightAt, DAY_MS } = await import('./js/visual/DayNight.js');
      const base = Math.floor(Date.now() / DAY_MS) * DAY_MS, m = x => base + x * 60000;
      o.clock = DAY_MS === 1800000 && nightAt(m(10)) === 0 && nightAt(m(25)) === 1 && nightAt(m(21.7)) > 0 && nightAt(m(21.7)) < 1 && nightAt(m(.5)) > 0;
      g.devMenu.teleport('world', 30, 40, 0); dn.force = 0; dn.update(false); const dayExp = g.renderer.toneMappingExposure, dayFog = g.scene.fog.color.getHex();
      L.update(.016); o.dayLocked = !L.toggle() && !document.body.classList.contains('lantern-ready');
      dn.force = 1; dn.update(false); L.update(.016); o.night = document.body.classList.contains('is-night') && g.scene.fog.color.getHex() !== dayFog && g.world.hemi.intensity < 1 && document.body.classList.contains('lantern-ready');
      const lit = L.on; L.update(.016); const sock = g.character.instance.socket('Hand_Socket_L'); let up = L.model.parent; o.lantern = lit && L.on && L.model.visible && L.model.parent === sock && L.light?.intensity > 0 && !L.light.castShadow;
      g.world.setSpace('garden'); g.look.update(true); dn.update(true); L.update(.016); o.garden = document.body.classList.contains('is-night') && g.renderer.toneMappingExposure < 1.01 && L.model.visible && L.light.intensity > 0 && L.light.distance === 16;   // R84: night in the garden too, lantern there too
      g.world.setSpace('world'); g.look.update(false); dn.force = 0; dn.update(false); L.update(.016); o.dayAgain = !L.model.visible && Math.abs(g.renderer.toneMappingExposure - dayExp) < .01; L.on = false; dn.force = null;
      const S = g.combat.special, d = S.def; S.land({ land: { x: 30, z: 42 } }); const z = S.zones[S.zones.length - 1]; o.mud = d.stun > 0 && z?.mesh?.name === 'SPECIAL_MUD_SPLAT' && z.life === d.stun + .5; for (let i = 0; i < 50; i++) S.update(.05); o.mudGone = !S.zones.includes(z);
      const B = g.combat.bear; if (B?.bear) { B.p.defeatedAt = Date.now() - 29 * 60000; const a = B.available(); B.p.defeatedAt = Date.now() - 31 * 60000; o.rematch = !a && B.available(); B.p.defeatedAt = 0; } else o.rematch = false;
      return o; }) : {};
    check('day/night + lantern (R81/R84): 21/9 min clock, night in the world and the garden, lantern only at night (lights itself at dusk, R126) in the left hand with its own light, mud splat, bear rematch = 1 in-game day', ready && ['clock', 'dayLocked', 'night', 'lantern', 'garden', 'dayAgain', 'mud', 'mudGone', 'rematch'].every(k => r[k]) && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 17g. R114 robustness: an optional system that throws mid-game is switched off and frames keep rendering; a lost WebGL
  // context that comes back leaves no overlay, one that stays lost offers tap-to-reload; no 12 s 'Startup error'
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern');
    const r = ok ? await p.evaluate(async () => { const g = window.__tgw, w = ms => new Promise(r => setTimeout(r, ms)); await w(2500);
      const f0 = g.renderer.info.render.frame; g.lantern.update = () => { throw new Error('R114 test'); }; await w(4000);
      const o = { frames: g.renderer.info.render.frame > f0 + 1, off: g.failed.includes('lantern') };
      const ext = g.renderer.getContext().getExtension('WEBGL_lose_context'); ext.loseContext(); await w(1500); ext.restoreContext(); await w(5000);
      o.restored = !document.getElementById('gl-lost'); ext.loseContext(); await w(5000); o.overlay = !!document.getElementById('gl-lost');
      o.noStartupError = !document.body.innerHTML.includes('within 12 seconds');
      // R116: toasts queue instead of overwriting; a Locked action says why
      g.hud.toast.classList.remove('show'); g.hud._toastQ = []; g.hud.showToast('A'); g.hud.showToast('B'); o.queue = g.hud.toast.textContent === 'A' && g.hud._toastQ[0] === 'B';
      g.hud.toast.classList.remove('show'); g.hud._toastQ = []; const res = g.interactions.resolve.bind(g.interactions);
      g.interactions.resolve = () => ({ type: 'wilds-gather', label: 'Locked', disabled: true, locked: true, reason: 'Needs a Stone Axe' }); g._whyAt = 0; await w(1500); g.input.actionPressed = true; await w(2500);
      o.why = g.hud.toast.textContent === 'Needs a Stone Axe'; g.interactions.resolve = res; return o; }) : {};
    check('robustness (R114) + feedback (R116): a throwing system is switched off and rendering continues, WebGL loss recovers or offers reload, toasts queue, Locked says why', ok && ['frames', 'off', 'restored', 'overlay', 'noStartupError', 'queue', 'why'].every(k => r[k]) && !errors.length, errors[0] || JSON.stringify(r));
    await ctx.close(); }
  // 17i. R119 Golden Seed story: a saved 'plant' restores the grown lotus at rest, hides the seed and moves the quest on (no replay)
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('tgw.controlTips.v1', '1'); localStorage.setItem('dym.homeMovedIn.v1.fern', '1'); localStorage.setItem('tgw.devMenu', '1'); if (!sessionStorage.getItem('r119')) { sessionStorage.setItem('r119', '1'); localStorage.setItem('tgw.save', JSON.stringify({ version: 3, profiles: { fern: { story: { seed: 'plant' } } } })); } });
    await p.goto(B + 'game.html?char=fern', { waitUntil: 'load' }); const ok = await p.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 240000 }).then(() => true, () => false);
    const r = ok ? await p.evaluate(async () => { const g = window.__tgw; await new Promise(r => setTimeout(r, 4000));
      return { resolved: g.state.choice.resolved && g.state.choice.result === 'plant', seedHidden: g.collectible?.status === 'collected' && g.collectible?.root?.visible === false,
        lotus: g.choiceWorld?.lotusPhase === 'idle' && g.choiceWorld?.lotusRoot?.visible === true, quest: document.getElementById('objective-title').textContent !== 'Find the Golden Seed',
        kept: JSON.parse(localStorage.getItem('tgw.save')).profiles.shared.story?.seed === 'plant' }; }) : {};
    check('golden seed story (R119): saved plant restores the lotus at rest, hides the seed, quest moves on, choice stays saved', ok && Object.values(r).length === 5 && Object.values(r).every(Boolean) && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }
  // 17j. R120 first-time control tips: phone shows touch tips, a tap advances, Skip ends them and they never come back
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'daisy', { dev: false, tips: true });
    const r = { shown: false };
    if (ok) { r.shown = await p.waitForFunction(() => document.querySelector('#control-tips.show'), null, { timeout: 30000 }).then(() => true, () => false);
      r.first = await p.evaluate(() => document.querySelector('#control-tips .ct-text')?.textContent || '');
      const box = await p.evaluate(() => { const b = document.querySelector('#control-tips .ct-text').getBoundingClientRect(), h = [...document.querySelectorAll('.desktop-hotbar-slot')].map(e => e.getBoundingClientRect()).filter(x => x.width); return { x: b.x + b.width / 2, y: b.y + b.height / 2, clear: h.every(x => b.bottom <= x.top) }; });
      r.clearOfHotbar = box.clear; await p.touchscreen.tap(box.x, box.y);
      r.second = await p.waitForFunction(f => { const t = document.querySelector('#control-tips.show .ct-text'); return t && t.textContent !== f; }, r.first, { timeout: 30000 }).then(() => true, () => false);
      await p.evaluate(() => document.querySelector('#control-tips .ct-skip').click()); await p.waitForTimeout(1500);
      r.gone = await p.evaluate(() => !document.querySelector('#control-tips.show') && localStorage.getItem('tgw.controlTips.v1') === '1');
      // R121: quest card flush with the minimap and never faded; menu button opens the menu by touch, Resume closes it
      r.card = await p.evaluate(() => { const o = document.getElementById('objective'); o.classList.add('complete'); const c = o.getBoundingClientRect(), m = document.querySelector('.tgw-minimap')?.getBoundingClientRect(); return !!m && Math.abs(c.right - m.right) <= 1 && getComputedStyle(o).opacity === '1'; });
      const mb = await p.evaluate(() => { document.getElementById('objective').classList.remove('open'); const b = document.getElementById('game-menu-btn').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
      await p.touchscreen.tap(mb.x, mb.y); r.menuOpen = await p.waitForFunction(() => document.body.classList.contains('game-menu-open'), null, { timeout: 8000 }).then(() => true, () => false);
      const rb = await p.evaluate(() => { const b = document.querySelector('#game-menu [data-a=resume]').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
      await p.touchscreen.tap(rb.x, rb.y); r.menuClosed = await p.waitForFunction(() => !document.body.classList.contains('game-menu-open'), null, { timeout: 8000 }).then(() => true, () => false);
      r.lastChar = await p.evaluate(() => JSON.parse(localStorage.getItem('tgw.lastChar') || '{}').id === 'daisy'); }
    check('control tips (R120): touch tips appear clear of the hotbar, tap advances, Skip ends and remembers', ok && r.shown && /left side to walk/.test(r.first) && r.clearOfHotbar && r.second && r.gone && !errors.length, errors[0] || JSON.stringify(r));
    check('phone quest card + menu (R121): card flush with the minimap and not faded, menu opens by tap, Resume closes, last character remembered', ok && r.card && r.menuOpen && r.menuClosed && r.lastChar && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close();
    // R121 Continue: the start screen offers the last played character and goes straight into the game
    const c3 = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const q = await c3.newPage(); const qe = []; q.on('pageerror', e => qe.push(e.message));
    await q.addInitScript(() => localStorage.setItem('tgw.lastChar', JSON.stringify({ id: 'fern', name: 'Fern' }))); await q.goto(B + 'index.html', { waitUntil: 'load' }); await q.waitForTimeout(2500);
    const lbl = await q.evaluate(() => ({ label: document.getElementById('start-label').textContent, choose: !document.getElementById('choose-char').hidden }));
    await q.click('#start', { force: true }); const went = await q.waitForURL(/game\.html\?char=fern/, { timeout: 8000 }).then(() => true, () => false);
    check('continue (R121): start screen says CONTINUE AS FERN, offers Choose character, and starts the game as Fern', lbl.label === 'CONTINUE AS FERN' && lbl.choose && went && !qe.length, qe[0] || JSON.stringify({ lbl, went })); await c3.close(); }
  // 17k. R129 FX (visual only): a landed strike starts the hit-stop, white flash and shake without changing the damage;
  //      picked-up loot flies to its counter; a gather bursts debris + '+N'; a boss telegraph gets its blinking base
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'fern', { hud: 'classic' });
    const ready = ok && await p.waitForFunction(() => window.__tgw?.combat?.models?.mole && window.__tgw?.fx, null, { timeout: 240000 }).then(() => true, () => false);
    const r = ready ? await p.evaluate(() => { const g = window.__tgw, c = g.combat, m = c.moles[0], ch = g.character, fx = g.fx, o = {}; g.wilds.profile.tools.axe = true;
      g.devMenu.teleport('world', m.home.x + 2.0, m.home.z, -Math.PI / 2); for (let i = 0; i < 60 && m.state !== 'up'; i++) c.updateMole(m, .1, ch);
      m.hp = 99; c.cd = 0; const landed = c.attack(); o.hit = landed && fx.freeze > 0 && fx.shake > 0 && fx.flashes[0]?.mats.length > 0 && m.hp === 99 - c.weapon().dmg && fx.timeScale(0) < .1;
      fx.freeze = 0; fx.update(.5); o.restored = fx.flashes.length === 0;
      m.hp = 1; c.cd = 0; c.attack(); for (let i = 0; i < 30; i++) c.updateMole(m, .1, ch); const it = c.loot[0];
      if (it) { for (let i = 0; i < 14; i++) c.updateLoot(.1, ch); ch.position.x = it.x; ch.position.z = it.z; c.updateLoot(.016, ch); } o.loot = !!it && fx.flies.length > 0;
      for (let i = 0; i < 40; i++) fx.update(.05); o.landedFly = fx.flies.length === 0;
      const n0 = fx.parts.length; g.state.events.emit('fx:gather', { kind: 'stone', n: 2, x: ch.position.x, y: ch.position.y, z: ch.position.z + 1 }); o.gather = fx.parts.length > n0 + 10;
      const B = c.boss; if (B) { B.showTele(ch.position.x, ch.position.z + 2, 1.5, .5); fx.update(.016); o.tele = !!B.r129Base?.visible; B.tele.visible = false; fx.update(.016); o.teleOff = !B.r129Base.visible; } else o.tele = o.teleOff = false;
      const RB = c.bear; fx.hit({ kind: 'giant', m: B, x: B.gx, z: B.gz }); if (RB) fx.hit({ kind: 'bear', m: RB, x: ch.position.x, z: ch.position.z }); fx.freeze = 0; fx.update(.5);   /* R129.1: only the creature flashes, never the arena or the grove */
      o.arenaSafe = !!B && !B.root.userData.r129Mats && !B.arena?.root?.userData?.r129Mats && (!RB || !RB.root.userData.r129Mats);
      return o; }) : {};
    check('R129 FX: only the creature flashes (never the boss arena/grove), landed strike = hit-stop + white flash + shake (damage unchanged), loot flies to its counter, gather bursts debris + +N, boss telegraph blinks with a base', ready && Object.values(r).length === 8 && Object.values(r).every(Boolean) && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }
  // 17l. R132 character select TEST PAGE (Jannik's reference style): 9 characters, starters open, locked ones say how to grow them
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(B + 'selector.html?locks=1', { waitUntil: 'load' });   // R135: ?locks=1 previews the locked design (locks arrive with the seeds)
    const ok = await p.waitForFunction(() => document.body.classList.contains('cs-ready'), null, { timeout: 60000 }).then(() => true, () => false);
    const r = ok ? await p.evaluate(async () => { const $ = s => document.querySelector(s), w = ms => new Promise(x => setTimeout(x, ms)), o = {};
      o.start = document.querySelectorAll('.cs-thumb').length === 9 && $('.cs-card.main b').textContent === 'Cactus' && !$('#cs-play').disabled && $('#cs-stats').children.length === 4 && /Thorn Shot/.test($('#cs-ab-name').textContent);
      $('.cs-thumb[data-i="4"]').click(); await w(400); o.locked = $('.cs-card.main b').textContent === 'Tulip' && $('#cs-play').disabled && /Grow me/.test($('#cs-desc').textContent) && !$('#cs-ab-text').textContent && !!$('.cs-mystery') && !$('.cs-stat');   /* R133: locked = a mystery */
      document.getElementById('cs-prev').click(); await w(400); o.prev = $('.cs-card.main b').textContent === 'Aloe Vera';
      $('.cs-thumb[data-i="0"]').click(); await w(400); o.open = $('.cs-card.main b').textContent === 'Daisy' && !$('#cs-play').disabled && /Play as Daisy/.test($('#cs-play').textContent);
      /* R134: phone layout from the device screen, no arrows on touch, a big special icon, equal column dividers, the vest for Courage */
      const cols = [...document.querySelectorAll('.cs-col')].map(c => Math.round(c.getBoundingClientRect().height));
      o.r134 = document.documentElement.classList.contains('cs-phone') && getComputedStyle($('#cs-prev')).display === 'none' && $('#cs-ab-icon').getBoundingClientRect().width >= 48 && cols.every(h => h === cols[0]) && /icon-vest/.test($('.cs-stat:nth-child(2) .cs-ico').getAttribute('style')) && document.documentElement.scrollWidth <= innerWidth;
      return o; }) : {};
    /* R135/R138: the game's selector: locks on (starters + played characters open), opens on ?char or the last played, the old test address lands here */
    await p.evaluate(() => { localStorage.setItem('tgw.lastChar', JSON.stringify({ id: 'fern', name: 'Fern' })); localStorage.setItem('tgw.save', JSON.stringify({ version: 4, profiles: {}, unlocked: ['daisy', 'cactus', 'swamp', 'fern'] })); });
    const at = async (u, f) => { await p.goto(B + u, { waitUntil: 'load' }); await p.waitForFunction(() => document.body.classList.contains('cs-ready'), null, { timeout: 60000 }).catch(() => {}); return p.evaluate(f).catch(() => false); };
    r.r135 = await at('selector.html?char=tulip', () => document.querySelector('.cs-card.main b').textContent === 'Tulip' && document.querySelector('#cs-play').disabled && document.querySelectorAll('.cs-thumb:not(.locked)').length === 4)
      && await at('selector.html', () => document.querySelector('.cs-card.main b').textContent === 'Fern' && !document.querySelector('#cs-play').disabled)
      && await at('selector.html?locks=0&char=tulip', () => !document.querySelector('#cs-play').disabled)
      && await at('selector-wilds.html?char=swamp', () => location.pathname.endsWith('/selector.html') && document.querySelector('.cs-card.main b').textContent === 'Swamp');
    /* R136: the back button takes the tap (the stage used to cover it) and leads home; ?debug=1 shows the viewport readout */
    r.r136 = await at('selector.html?debug=1', () => { const b = document.getElementById('cs-home').getBoundingClientRect(); return !!document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.closest('#cs-home') && /inner \d+×\d+/.test(document.getElementById('cs-debug')?.textContent || '') && /load: zoom min/.test(document.getElementById('cs-debug').textContent) && document.querySelector('meta[name=viewport]').content.includes('minimum-scale=1'); })   /* R137: no zoom-out on iOS */
      && await p.click('#cs-home').then(() => p.waitForURL(/index\.html/, { timeout: 15000 })).then(() => true, () => false);
    check('character select test page (R132–R134): English, 9 characters, Daisy/Cactus/Swamp open, locked ones a mystery that says how to grow them, browse by thumb and arrow; phone layout from the screen, no arrows on touch, big special icon, equal dividers; R135/R138 the game\'s selector: starters + played open, opens on ?char / last played; R136 back button works, debug readout', ok && Object.values(r).length === 7 && Object.values(r).every(Boolean) && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }
  // 17n. R138 switch character at home: a gold SWITCH circle on the garden lawn (garden only, away from the door) opens the selector and its back button returns; a locked character cannot be started outside DEV
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'cactus', { hud: 'classic' }); let r = {};
    if (ok) { r = await p.evaluate(async () => { const g = window.__tgw, w = ms => new Promise(x => setTimeout(x, ms)), o = {};
        for (let i = 0; i < 60 && !g.swapSpot?.spot; i++) await w(250); const s = g.swapSpot?.spot; if (!s) return { spot: false };
        o.worldNone = g.world.space !== 'garden' && !g.swapSpot.interaction({ x: s.x, z: s.z });
        g.devMenu.teleport('garden', s.x, s.z, 0); for (let i = 0; i < 30 && g.interactions.last?.interaction?.type !== 'home-swap'; i++) await w(250);
        const d = g.homePortal.gardenDoorPoint; o.offer = g.interactions.last?.interaction?.type === 'home-swap' && Math.hypot(s.x - d.x, s.z - d.z) > 2.15 && g.swapSpot.m.visible;
        /* R139: Jannik's Spirebænken: open characters show their sprout, locked ones soil with the seed; Idle runs; the stone magic brightens when you stand on it */
        for (let i = 0; i < 240 && !g.swapSpot.model; i++) await w(250); const M = g.swapSpot.model, vis = n => M?.getObjectByName(n)?.visible;
        g.devMenu.teleport('garden', s.x, s.z, 0);   // the mound's height arrives with the model; under load the first teleport can land before it (y 0 on a 0.47 stone)
        for (let i = 0; i < 240 && (g.swapSpot.near < .6 || g.swapSpot.ring.material.opacity <= .6 || !g.swapSpot.mixer); i++) await w(250);   // the stone brightens over a few frames (headless runs ~1 fps)
        o.model = !!M && vis('Sprout_cactus') && !vis('Soil_cactus') && !vis('Sprout_tulip') && vis('Soil_tulip') && vis('Lock_tulip') && !vis('Lock_cactus') && !!g.swapSpot.mixer && g.swapSpot.near > .5 && g.swapSpot.ring.material.opacity > .6 && g.swapSpot.potColliders.filter(c => c.kind === 'ring-pot').length >= 14 && !g.world.colliders.some(c => c.kind === 'static' && Math.hypot(c.x - s.x, c.z - s.z) < 2)   /* R140: padlocks, pots solid, the bed shrubs gone */
          && Math.abs(g.character.position.y - .47) < .03 && g.world.groundHeight(s.x + 1.2, s.z) > .3 && vis('Vine_cactus') && !vis('Vine_tulip');   /* R141: you stand on the stone on top of the mound; pots + posts solid; vines = open characters */
        { const walk = (x0, z0) => { const q = { x: x0, y: 0, z: z0 }; for (let i = 0; i < 120; i++) { const dx = s.x - q.x, dz = s.z - q.z, d = Math.hypot(dx, dz); if (d < .25) break; q.x += dx / d * .07; q.z += dz / d * .07; g.world.resolveCollisions(q, .3); } return Math.hypot(q.x - s.x, q.z - s.z); };
          o.walk = walk(s.x + 4, s.z) < .3 && walk(s.x, s.z + 4) > 2.4 && walk(s.x - 4, s.z) > 2.4; }   /* R141: up the steps to the stone; the rim stops you elsewhere */
        return o; });
      await p.evaluate(() => window.__tgw.swapSpot.interact()); r.nav = await p.waitForURL(/selector\.html\?char=cactus&from=home/, { timeout: 20000 }).then(() => true, () => false);
      if (r.nav) { await p.waitForFunction(() => document.body.classList.contains('cs-ready'), null, { timeout: 60000 }).catch(() => {}); await p.click('#cs-home'); r.back = await p.waitForURL(/game\.html\?char=cactus/, { timeout: 20000 }).then(() => true, () => false); } }
    const c2 = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const q = await c2.newPage(); await q.addInitScript(() => localStorage.removeItem('tgw.devMenu'));
    await q.goto(B + 'game.html?char=tulip'); r.guard = await q.waitForURL(/selector\.html\?char=tulip/, { timeout: 30000 }).then(() => true, () => false); await c2.close();
    check('R138–R141 switch at home: the Sprouting Ring in the garden (walkable mound, sprouts + vines = open, padlocks = locked, pots/posts solid, shrubs gone, magic on the stone) opens the selector, back returns to the game; a locked character is sent to the selector', ok && r.worldNone && r.offer && r.model && r.walk && r.nav && r.back && r.guard && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }
  // 17o. R142 desktop: tool work is a left click (the pill shows a mouse), E no longer gathers; the Sprouting Ring's mound wears the garden ground colours
  { const ctx = await context({ viewport: { width: 1280, height: 720 } }); const { p, errors, ok } = await startGame(ctx, 'cactus', { hud: 'desktop-e' }); let r = {};
    if (ok) { r = await p.evaluate(async () => { const g = window.__tgw, w = ms => new Promise(x => setTimeout(x, ms)); g.devMenu.run('tools'); g.devMenu.run('tp:node');
        for (let i = 0; i < 40 && g.interactions.last?.interaction?.type !== 'wilds-gather'; i++) await w(250); const it = g.interactions.last?.interaction; window.__n = it?.node;
        const M = g.swapSpot?.model?.getObjectByName('Mound'), T = (await import('./js/ui/actionIcons.js')).isToolJob; return { pill: it?.type === 'wilds-gather' && !!document.querySelector('#action .key.mouse'), mound: !!M?.material?.vertexColors && !!M?.geometry?.attributes?.color,
          pots: ['plant', 'water', 'harvest'].every(act => !T({ type: 'wilds-pot', act })) && T({ type: 'wilds-gather' }) }; });   /* R144: pot work stays on E */
      await p.keyboard.press('KeyE'); await p.waitForTimeout(2500); r.eNo = await p.evaluate(() => window.__n?.state === 'ready');
      await p.mouse.click(640, 400); for (let i = 0; i < 20 && !r.click; i++) { await p.waitForTimeout(500); r.click = await p.evaluate(() => window.__n?.state !== 'ready'); } }
    check('R142 desktop: tool work is a left click (mouse on the pill), E no longer gathers, pot work stays on E (R144); the mound wears the garden ground colours', ok && r.pill && r.eNo && r.click && r.mound && r.pots && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }
  // 17p. R144 workshop: the bench alone at the start; building level 1 (10 wood + 5 stone) loads the L1 workshop around it (its own bench, solid posts), levels 2/3 swap the model; the panel lists the levels with the padlock placeholder
  { const ctx = await context({ viewport: { width: 1280, height: 720 } }); const { p, errors, ok } = await startGame(ctx, 'cactus', { hud: 'desktop-e' }); let r = {};
    if (ok) r = await p.evaluate(async () => { const g = window.__tgw, W = g.wilds, w = ms => new Promise(x => setTimeout(x, ms)), o = {};
      for (let i = 0; i < 60 && !W.benchModel; i++) await w(250);
      o.start = (W.profile.workshop | 0) === 0 && !W.workshopModel && W.benchModel?.root.visible !== false;
      W.state.inventory.set('wood', 12); W.state.inventory.set('stone', 6); W.emit?.();
      const bought = W.upgradeWorkshop(); for (let i = 0; i < 60 && !W.workshopModel; i++) await w(250);
      o.l1 = bought && W.profile.workshop === 1 && W.workshopLevel === 1 && W.benchModel.root.visible === false && (W.workshopPosts || []).length === 6 && (W.state.inventory.get('wood') | 0) === 2;
      g.devMenu.run('ws:3'); for (let i = 0; i < 60 && W.workshopLevel !== 3; i++) await w(250);
      o.l3 = W.workshopLevel === 3 && !!W.workshopModel.root.getObjectByName('Workshop_L3_Anvil');
      W.onOpenWorkbench?.(); await w(300); const panel = document.querySelector('.wilds-panel.open'); panel?.querySelector('[data-tab="home"]')?.click(); await w(300);
      o.panel = !!panel && panel.querySelectorAll('.wilds-unlock').length === 2 && /Workshop/.test(panel.textContent);
      return o; });
    check('R144 workshop: bench alone at the start, L1 bought (10 wood + 5 stone) builds the workshop with solid posts, L3 swaps the model, the panel shows the levels with the padlock placeholder', ok && r.start && r.l1 && r.l3 && r.panel && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }
  // 17q. R148 Perk Shrine (Jannik 09/10): perks cost amber, each new one more (10 / 15 / 20 / 30); Golden Seeds no longer buy perks
  { const ctx = await context({ viewport: { width: 1280, height: 720 } }); const { p, errors, ok } = await startGame(ctx, 'cactus', { hud: 'desktop-e' }); let r = {};
    if (ok) r = await p.evaluate(async () => { const g = window.__tgw, W = g.wilds, inv = g.state.inventory, o = {}; for (let i = 0; i < 60 && !W.profile; i++) await new Promise(x => setTimeout(x, 250));
      W.profile.homeLevel = 2; W.profile.perks = {}; inv.set('amber', 9); inv.set('golden_seed', 5);
      o.noSeed = !W.plantSeed('swift') && !W.profile.perks.swift && inv.get('golden_seed') === 5;
      inv.set('amber', 10); o.first = W.plantSeed('swift') && inv.get('amber') === 0 && W.perkPrice() === 15;
      inv.set('amber', 75); o.rest = W.plantSeed('roots') && W.plantSeed('ward') && W.plantSeed('lucky') && inv.get('amber') === 10 && inv.get('golden_seed') === 5;
      g.workbenchPanel?.show?.(); const P = g.workbenchPanel; if (P) { P.tab = 'seeds'; P.render(); o.panel = /Perks/.test(P.el.textContent) && /Perk Shrine|amber/i.test(P.el.textContent); P.hide?.(); } else o.panel = false;
      return o; });
    check('R148 Perk Shrine: perks cost amber (10, then 15 / 20 / 30), Golden Seeds do not buy them, the tab says Perks', ok && r.noSeed && r.first && r.rest && r.panel && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }
  // 17r. R149 Special Seeds (Jannik 09/10): a met goal (here: the Wood Giant beaten) puts the Tulip Seed in the Bag (not in a quick
  // slot); at the Sprouting Ring E offers 'Plant Tulip Seed', planting opens Tulip (sprout, no padlock); bosses give no Golden Seed
  { const ctx = await context({ viewport: { width: 1280, height: 720 } }); const { p, errors, ok } = await startGame(ctx, 'cactus', { hud: 'desktop-e' }); let r = {};
    if (ok) r = await p.evaluate(async () => { const g = window.__tgw, w = ms => new Promise(x => setTimeout(x, ms)), o = {}, S = g.specialSeeds;
      const { GIANT, ROOT_BEAR } = await import('./js/data/combatCatalog.js'); o.noGolden = !GIANT.reward.first.golden_seed && !ROOT_BEAR.reward.first.golden_seed;
      o.start = !!S && !S.s.tulip && !g.save.isUnlocked('tulip');
      g.save.profile.combat.giant.wins = 1; for (let i = 0; i < 40 && S.s.tulip !== 1; i++) await w(250);
      const bag = g.hud.gearItems().map(x => x.id); o.bag = S.s.tulip === 1 && bag.includes('seed-tulip') && !g.save.profile.hotbar.slots.includes('seed-tulip');
      for (let i = 0; i < 240 && !g.swapSpot?.model; i++) await w(250); const s = g.swapSpot.spot; g.devMenu.teleport('garden', s.x, s.z, 0); await w(600);
      o.offer = g.swapSpot.interaction({ x: s.x, z: s.z })?.label === 'Plant Tulip Seed';
      o.planted = g.swapSpot.plantSeed() && S.s.tulip === 2 && g.save.isUnlocked('tulip') && !g.hud.gearItems().some(x => x.id === 'seed-tulip');
      const M = g.swapSpot.model, vis = n => M.getObjectByName(n)?.visible; o.ring = vis('Sprout_tulip') && !vis('Lock_tulip') && g.swapSpot.interaction({ x: s.x, z: s.z })?.type === 'home-swap';
      await w(1500); o.once = S.s.tulip === 2 && !g.hud.gearItems().some(x => x.id === 'seed-tulip');   // never earned twice
      return o; });
    check('R149 Special Seeds: Giant beaten -> Tulip Seed in the Bag (no quick slot), Ring offers Plant Tulip Seed, planting opens Tulip, bosses give no Golden Seed', ok && ['noGolden', 'start', 'bag', 'offer', 'planted', 'ring', 'once'].every(k => r[k]) && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }
  // 17m. R134 DEV toggles (visual only, off by default): resource icons fly into their counter; the tutorial tip sits under the resource bar on phones
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); await ctx.addInitScript(() => { localStorage.setItem('tgw.dev.flyIcons', '1'); localStorage.setItem('tgw.dev.tipTop', '1'); });
    const { p, errors, ok } = await startGame(ctx, 'cactus', { hud: 'classic', tips: true }); let r = {};
    if (ok) { await p.waitForFunction(() => document.querySelector('#control-tips.show'), null, { timeout: 120000 }).catch(() => {}); await p.waitForTimeout(600);
      r = await p.evaluate(async () => { const g = window.__tgw, ch = g.character?.root?.position || g.character?.position, o = {}, n = () => document.querySelectorAll('.fx-fly').length;
        const bar = document.querySelector('.material-chip.wood').getBoundingClientRect(), tip = document.getElementById('control-tips').getBoundingClientRect();
        o.tip = document.body.classList.contains('ct-on') && tip.top >= bar.bottom - 1 && tip.bottom < innerHeight * .45;
        g.state.events.emit('fx:gather', { kind: 'wood', n: 2, x: ch.x + 1, y: ch.y, z: ch.z }); o.fly = n() === 2;
        localStorage.setItem('tgw.dev.flyIcons', '0'); const gems = g.fx.flies.length; g.fx.lootFly('clay', ch, 1); o.off = n() === 2 && g.fx.flies.length === gems + 1;   // off: the R129 3D gem as before
        return o; }); }
    check('R134 DEV toggles: resource icons fly into the bar, tutorial tip under the resource bar on phones, both off = as before', ok && r.tip && r.fly && r.off && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }
  // 17h. R117 desktop: the click that closes the Bag does not swing; the next click on the view does
  { const ctx = await context({ viewport: { width: 1280, height: 720 } }); const { p, errors, ok } = await startGame(ctx, 'fern', { hud: 'desktop-e' });
    let r = {};
    if (ok) { await p.evaluate(() => { const g = window.__tgw; g.__hits = 0; const a = g.combat.attack.bind(g.combat); g.combat.attack = (...x) => { g.__hits++; return a(...x); }; document.getElementById('hud-bag')?.click(); });
      await p.waitForTimeout(1500); r.opened = await p.evaluate(() => !!document.querySelector('.gear-panel.open'));
      await p.mouse.click(640, 420); await p.waitForTimeout(2500); r.closeNoSwing = await p.evaluate(() => window.__tgw.__hits === 0 && !document.querySelector('.gear-panel.open'));
      await p.mouse.click(640, 420); await p.waitForTimeout(2500); r.nextSwings = await p.evaluate(() => window.__tgw.__hits === 1);
      await p.keyboard.press('Escape'); await p.waitForTimeout(800); r.escOpens = await p.evaluate(() => document.body.classList.contains('game-menu-open'));
      await p.keyboard.press('Escape'); await p.waitForTimeout(800); r.escCloses = await p.evaluate(() => !document.body.classList.contains('game-menu-open')); }
    check('desktop input (R117/R121): closing the Bag by clicking the view does not swing, the next click does, Esc opens and closes the menu', ok && r.opened && r.closeNoSwing && r.nextSwings && r.escOpens && r.escCloses && !errors.length, errors[0] || JSON.stringify(r)); await ctx.close(); }
  // 5. DEV disabled: no dev UI or handles leak into normal play
  { const ctx = await context({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const { p, errors, ok } = await startGame(ctx, 'daisy', { dev: false });
    const leak = ok && await p.evaluate(() => !!document.querySelector('.dev-menu-btn') || !!window.__tgw || !document.getElementById('dev-badge').hidden);
    const phoneHud = ok && await p.evaluate(() => ({ d: document.body.classList.contains('hud-classic') && !document.body.classList.contains('hud-desktop-e'), slots: [...document.querySelectorAll('.desktop-hotbar-slot')].filter(e => e.getBoundingClientRect().width > 0).length }));
    // R115 phone HUD fixes: toast below the resource bar, readable quest text, joystick hidden while fishing
    const phoneFix = ok && await p.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms)), t = document.getElementById('toast'); t.textContent = 'Test'; t.classList.add('show'); await w(500);
      const bar = document.querySelector('#hud .inventory-stack')?.getBoundingClientRect(), toast = t.getBoundingClientRect(); t.classList.remove('show');
      const j = document.getElementById('joy-rest'); j.style.transition = 'none'; document.body.classList.add('fishing-active'); await w(400); const joy = getComputedStyle(j).opacity; document.body.classList.remove('fishing-active'); j.style.transition = '';
      return { toast: !!bar && toast.top >= bar.bottom - 1, title: parseFloat(getComputedStyle(document.getElementById('objective-title')).fontSize) >= 12, joy: joy === '0', cream: await (async () => { const o = document.getElementById('objective'); o.classList.add('open'); await w(80); const c = getComputedStyle(o).backgroundColor === 'rgba(255, 249, 235, 0.96)'; o.classList.remove('open'); return c; })() }; });   // R122: cream when open (closed = small moss icon)
    check('dev disabled: no dev button, handle or badge', ok && !leak && !errors.length, errors[0]); await ctx.close();
    // R112: players without DEV get the current HUD by device (phone = HUD D with 5 slots, desktop = HUD E with 10)
    const c2 = await context({ viewport: { width: 1280, height: 720 } }); const d = await startGame(c2, 'daisy', { dev: false });
    const deskHud = d.ok && await d.p.evaluate(() => ({ e: document.body.classList.contains('hud-desktop-e') && !document.body.classList.contains('hud-classic'), slots: [...document.querySelectorAll('.desktop-hotbar-slot')].filter(e => e.getBoundingClientRect().width > 0).length }));
    const deskToast = d.ok && await d.p.evaluate(async () => { const t = document.getElementById('toast'); t.textContent = 'Test'; t.classList.add('show'); await new Promise(r => setTimeout(r, 500)); const bar = document.querySelector('#hud #inventory, #hud .inventory-stack')?.getBoundingClientRect(); return !!bar && t.getBoundingClientRect().top >= bar.bottom - 1; });   // R118
    check('player HUD default (R112): phone gets HUD D (3 slots, R123), desktop gets HUD E (10 slots) without DEV', phoneHud?.d && phoneHud.slots === 3 && deskHud?.e && deskHud.slots === 10 && !d.errors.length, d.errors[0] || JSON.stringify({ phoneHud, deskHud })); await c2.close();
    check('phone HUD fixes (R115/R118): toast below the resource bar (phone + desktop E), quest title >= 12 px, joystick hidden while fishing, cream quest card', phoneFix && phoneFix.toast && phoneFix.title && phoneFix.joy && phoneFix.cream && deskToast, JSON.stringify({ phoneFix, deskToast })); }
} finally {
  await browser.close(); server.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exitCode = failed ? 1 : 0;
}
