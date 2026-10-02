// @ts-nocheck
// Test shortcuts for the wilds/garden loop. Enabled per device from Indstillinger on the start
// screen (localStorage 'tgw.devMenu' = '1'). Works on the player's real save.
import { MATERIALS, TOOLS } from '../data/wildsCatalog.js';
import { PROFILES, CONTROL_PROFILE_KEY, savedProfile, applyControlProfile } from '../core/ControlProfiles.js';

export const DEV_MENU_KEY = 'tgw.devMenu';
export function devMenuEnabled() { try { return localStorage.getItem(DEV_MENU_KEY) === '1'; } catch { return false; } }

const SKIP_MS = 5 * 60 * 1000;

export class DevMenu {
  constructor(game) {
    this.g = game;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'dev-menu-btn'; btn.textContent = 'DEV';
    document.body.appendChild(btn); this.btn = btn;
    const el = document.createElement('div');
    el.className = 'wilds-panel dev-menu'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Dev menu');
    el.innerHTML = `<div class="wilds-card">
      <header><div><small>TEST · RIGTIG SAVE</small><h2>Dev menu</h2></div><button type="button" class="wilds-close" aria-label="Close">✕</button></header>
      <div class="dev-menu-body">
        <section><small>KAMERA & STYRING (kun dev)</small><div class="dev-grid profiles">${Object.entries(PROFILES).map(([id, p]) => `<button data-a="cam:${id}">${p.name}</button>`).join('')}</div><p class="dev-note"></p></section>
        <section><small>MÅLING</small><div class="dev-grid"><button data-a="perf">Performance-HUD til/fra</button><button data-a="metrics">Vis startup-tider</button></div><div class="dev-grid four"><button data-a="q:auto">Auto</button><button data-a="q:mobile-low">Lav</button><button data-a="q:mobile-high">Høj</button><button data-a="q:desktop">Desktop</button></div></section>
        <section><small>RESSOURCER</small><div class="dev-grid">
          <button data-a="mats">+20 materialer</button><button data-a="tools">Alle redskaber</button><button data-a="pots">3 potter + vand</button><button data-a="skip">Spol 5 min frem</button>
        </div></section>
        <section><small>TELEPORT</small><div class="dev-grid">
          <button data-a="tp:bench">Arbejdsbænk</button><button data-a="tp:greenhouse">Drivhus</button><button data-a="tp:pond">Dam</button><button data-a="tp:gate">Havelåge</button>
          <button data-a="tp:world">Verden (hjem)</button><button data-a="tp:node">Nærmeste node</button><button data-a="tp:thorn">Nærmeste tornekrat</button>
        </div></section>
        <section><small>BÅD (R58)</small><div class="dev-grid">
          <button data-a="boat:ready">Stang + 3 fiskearter</button><button data-a="boat:vest">Redningsvest</button><button data-a="boat:trips">+2 vandfaldsture (kan købe)</button><button data-a="boat:reset">Nulstil båd + fiskeri</button><button data-a="tp:dock">Teleport: Sigurd / bro</button>
        </div></section>
        <section><small>KAMP (R61)</small><div class="dev-grid">
          <button data-a="cb:tp">Teleport til Mole</button><button data-a="cb:heal">Fuld liv</button><button data-a="cb:hurt">Tag 1 hjerte skade</button><button data-a="cb:respawn">Respawn moles</button><button data-a="cb:mercy">Nulstil mercy + poser</button><button data-a="cb:arena">Teleport til Wood Giant</button><button data-a="cb:bosslow">Boss: 4 liv tilbage</button><button data-a="cb:bossreset">Boss: klar igen</button>
        </div></section>
        <section><small>HAVE-LAYOUT (R60)</small><div class="dev-grid">
          <button data-a="move:greenhouse">Flyt drivhus</button><button data-a="move:workshop">Flyt workshop</button><button data-a="move:rain">Flyt regntønde</button><button data-a="move:shrine">Flyt shrine</button><button data-a="layout:reset">Nulstil placeringer</button>
        </div></section>
        <section><small>DRIVHUS (genindlæser)</small><div class="dev-grid four">
          <button data-a="gh:0">Intet</button><button data-a="gh:1">L1</button><button data-a="gh:2">L2</button><button data-a="gh:3">L3</button>
        </div></section>
        <section><small>TRUSSEL</small><div class="dev-grid">
          <button data-a="weed">Ukrudt nu</button><button data-a="snail">Snegl nu</button><button data-a="clearthreat">Fjern ukrudt + snegle</button>
        </div></section>
        <section><small>SAVE</small><div class="dev-grid"><button data-a="save:copy">Kopiér save (JSON)</button><button data-a="save:download">Download save</button><button data-a="save:import">Importér save…</button></div></section>
        <section><small>FARE</small><div class="dev-grid"><button data-a="reset" class="danger">Nulstil wilds-save (denne karakter)</button></div></section>
      </div></div>`;
    document.body.appendChild(el); this.el = el; this.open = false;
    this.profile = applyControlProfile(game, savedProfile()); this.markProfile();
    for (const t of ['pointerdown', 'pointermove', 'pointerup']) { el.addEventListener(t, e => e.stopPropagation()); btn.addEventListener(t, e => e.stopPropagation()); }
    btn.addEventListener('click', () => this.show());
    el.addEventListener('click', e => {
      if (e.target === el || e.target.closest('.wilds-close')) return this.hide();
      const a = e.target.closest('[data-a]')?.dataset.a; if (a) this.run(a);
    });
    addEventListener('keydown', e => { if (this.open && e.key === 'Escape') { e.stopImmediatePropagation(); this.hide(); } }, true);
  }

  show() { this.open = true; this.el.classList.add('open'); this.g.input?.resetTouchPointers?.(); }
  hide() { this.open = false; this.el.classList.remove('open'); }
  markProfile() {
    this.el.querySelectorAll('[data-a^="cam:"]').forEach(b => b.classList.toggle('active', b.dataset.a === `cam:${this.profile}`));
    this.el.querySelector('.dev-note').textContent = PROFILES[this.profile]?.text || '';
  }
  toast(t) { this.g.hud?.showToast(t); }

  teleport(space, x, z, heading) {
    const g = this.g, world = g.world;
    if (world.space !== space) { world.setSpace(space); g.wildlife?.setActive?.(space === 'world'); }
    g.character.position.set(x, world.groundHeight(x, z), z);
    g.character.root.position.copy(g.character.position);
    g.character.heading = heading; g.character.root.rotation.y = heading;
    g.character.velocity.set(0, 0, 0); g.character.currentSpeed = 0;
    g.state.player.position = { x, y: g.character.position.y, z };
    g.followCamera.snap();
  }

  run(a) {
    const g = this.g, w = g.wilds, p = w.profile;
    if (a.startsWith('cam:')) {
      const id = a.slice(4); try { localStorage.setItem(CONTROL_PROFILE_KEY, id); } catch {}
      this.profile = applyControlProfile(g, id); this.markProfile(); this.toast(`Kamera: ${PROFILES[this.profile].name}`);
      return;
    }
    if (a.startsWith('q:')) { const id = a.slice(2); g.quality?.set(id === 'auto' ? null : id); this.toast(`Kvalitet: ${id === 'auto' ? 'automatisk (' + g.quality?.id + ')' : id}`); return; }
    if (a.startsWith('save:')) {
      const sv = g.save, op = a.slice(5);
      if (op === 'copy') { const t = sv.exportJSON(); navigator.clipboard?.writeText(t).then(() => this.toast('Save kopieret – indsæt den i chatten'), () => prompt('Kopiér din save:', t)); }
      else if (op === 'download') { const blob = new Blob([sv.exportJSON()], { type: 'application/json' }), url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `tgw-save-${Date.now()}.json`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
      else if (op === 'import') {
        const text = prompt('Indsæt save-JSON (den nuværende gemmes som backup):'); if (!text) return;
        try { const who = sv.importJSON(text); alert('Importeret: ' + who.join(', ') + '. Genindlæser.'); location.reload(); } catch (e) { alert('Kunne ikke importere: ' + e.message); }
      }
      return;
    }
    if (a.startsWith('boat:')) {
      const f = g.fishing, op = a.slice(5); if (!f || !g.boatEco) return this.toast('Fiskeri er ikke indlæst endnu');
      if (op === 'ready') { f.starter = true; f.own.rodBamboo = 1; f.own.worms = 1; for (const id of ['roach', 'perch', 'bream']) f.log[id] ||= { count: 1, best: 20 }; }
      else if (op === 'vest') f.own.vest = 1;
      else if (op === 'trips') p.boat.waterfall += 2;
      else if (op === 'reset') { f.starter = false; for (const k of Object.keys(f.own)) delete f.own[k]; for (const k of Object.keys(f.log)) delete f.log[k]; Object.assign(p.boat, { owned: false, trips: 0, waterfall: 0, lastReward: '' }); f.setBoatAccess({ owned: false, rented: false }); }
      f.renderAll?.(); g.boatEco.persist(); this.toast({ ready: 'Stang + roach, perch, bream', vest: 'Redningsvest', trips: `Vandfaldsture: ${p.boat.waterfall}`, reset: 'Båd og fiskeri nulstillet' }[op]);
      return;
    }
    if (a.startsWith('cb:')) {
      const c = g.combat, op = a.slice(3); if (!c) return this.toast('Kamp er ikke indlæst');
      if (op === 'tp') { const m = c.moles.find(x => x.state !== 'gone') || c.moles[0]; if (!m) return this.toast('Ingen Mole fundet'); this.teleport('world', m.home.x + 4, m.home.z, -Math.PI / 2); return; }
      if (op === 'heal') { c.heal(true); return this.toast('Fuldt liv'); }
      if (op === 'hurt') { this.hide(); c.invuln = 0; if (g.world.space !== 'world') return this.toast('Kun i verden'); const p = g.character.position; c.hurt(2, p.x + .1, p.z); return; }
      if (op === 'respawn') { for (const k of Object.keys(c.p.moles)) c.p.moles[k] = 0; g.save.persist(); return this.toast('Moles kommer tilbage om et øjeblik'); }
      const B = c.boss;
      if (op === 'arena') { if (!B?.site) return this.toast('Ingen arena (model mangler?)'); this.teleport('world', B.site.x, B.site.z + 13, Math.PI); return; }
      if (op === 'bosslow') { if (!B?.fighting()) return this.toast('Start kampen først (gå ind i arenaen)'); B.hp = 4; B.renderUi(); return this.toast('Wood Giant: 4 liv'); }
      if (op === 'bossreset') { if (!B?.giant) return this.toast('Ingen boss'); B.p.defeatedAt = 0; B.end(false); g.save.persist(); return this.toast('Wood Giant er klar igen'); }
      if (op === 'mercy') { c.p.mercyUntil = 0; c.p.pouches = []; c.syncPouches(); g.save.persist(); return this.toast('Mercy og poser nulstillet'); }
      return;
    }
    if (a.startsWith('move:')) { if (!g.world.isGardenSpace()) return this.toast('Gå ind i din have først'); this.hide(); g.buildMode?.start(a.slice(5)); return; }
    if (a === 'layout:reset') { g.garden?.resetToDefaults(); this.toast('Haven er tilbage på standardplaceringer'); return; }
    if (a === 'perf') { g.perfHud?.set(!g.perfHud.on); this.toast(g.perfHud?.on ? 'Performance-HUD til' : 'Performance-HUD fra'); return; }
    if (a === 'metrics') {
      const m = window.__TGW_STARTUP_METRICS__ || {}; const keys = Object.keys(m).filter(k => k.endsWith('Ms'));
      alert('Startup (ms siden init):\n' + keys.map(k => `${k}: ${m[k]}`).join('\n') + '\n\nTungeste GLB:\n' + (m.resources || []).slice(0, 6).map(r => `${r.name} ${r.durationMs}ms`).join('\n'));
      return;
    }
    if (a === 'mats') { for (const id of Object.keys(MATERIALS)) w.give(id, id === 'golden_seed' ? 2 : id === 'wild_seed' ? 5 : 20); g.hud.materials.classList.add('show'); this.toast('+20 materialer, +5 Wild Seeds, +2 Golden Seeds'); }
    else if (a === 'tools') { for (const t of TOOLS) { p.tools[t.id] = true; if (w.rack[t.id]) w.rack[t.id].visible = true; } w.save.persist(); w.emit(); this.toast('Alle redskaber'); }
    else if (a === 'pots') {
      if (!w.pots.available()) return this.toast('Byg drivhuset først (eller sæt L1 herunder)');
      p.pots.count = 3; p.tools.can = true; p.water = 3; w.save.persist(); w.emit(); this.toast('3 potter i drivhuset + fuld vandkande');
    } else if (a === 'skip') {
      for (const k of Object.keys(p.nodes)) p.nodes[k] -= SKIP_MS;
      for (const s of p.pots.slots) if (s?.wet) s.readyAt -= SKIP_MS;
      const th = p.threat; if (th.started) { th.lastSpawn -= SKIP_MS; th.lastSnail -= SKIP_MS; for (const r of th.weeds) r.bornAt -= SKIP_MS; }
      w.save.persist(); this.toast('Tiden er spolet 5 min frem');
    } else if (a.startsWith('tp:')) {
      const t = a.slice(3), hp = g.homePortal;
      // R60: follow the placed structures (front of the workshop / greenhouse door), not fixed coordinates.
      const front = (id, d, fb) => { const t = w.structureAt(id), p = w.at(id, 0, d); return p ? [p.x, p.z, t.yaw + Math.PI] : fb; };
      if (t === 'bench') { const [x, z, h] = front('workshop', 1.3, [4.7, 7.6, Math.PI / 2]); this.teleport('garden', x, z, h); }
      else if (t === 'greenhouse') { const [x, z, h] = front('greenhouse', 1.9, [6.5, -9.3, Math.PI]); this.teleport('garden', x, z, h); }
      else if (t === 'pond') this.teleport('garden', -3.9, 1.15, Math.PI);
      else if (t === 'gate') { const s = hp?.gardenSpawn?.() || { x: 0, z: 9.65, heading: Math.PI }; this.teleport('garden', s.x, s.z, s.heading); }
      else if (t === 'dock') { const sp = g.fishing?.shopPoint; if (!sp) return this.toast('Fiskeri er ikke indlæst endnu'); this.teleport('world', sp.x, sp.z, 0); }
      else if (t === 'world') { const s = hp?.worldSpawn?.() || { x: .1, z: 14.3, heading: 0 }; this.teleport('world', s.x, s.z, s.heading); }
      else {
        const from = g.world.space === 'world' ? g.character.position : { x: 0, z: 14 };
        const list = t === 'node' ? w.nodes.filter(n => n.state === 'ready' && n.root.visible) : w.thorns.filter(x => x.phase === 'wild' || x.phase === 'cleared');
        if (!list.length) return this.toast('Ingen fundet');
        const tgt = list.reduce((b, n) => Math.hypot(n.x - from.x, n.z - from.z) < Math.hypot(b.x - from.x, b.z - from.z) ? n : b);
        const off = t === 'node' ? 1.1 : 2.3;
        this.teleport('world', tgt.x + off, tgt.z, -Math.PI / 2);
      }
      this.hide();
    } else if (a.startsWith('gh:')) {
      try { localStorage.setItem('dym-gh-level', a.slice(3)); } catch {}
      w.save.flush(); location.reload();
    } else if (a === 'weed') {
      if (!w.threat.active()) w.threat.start(Date.now());
      const weed = w.threat.spawnWeed(Date.now() - w.threat.stageMs(), false); w.save.persist();
      this.toast(weed ? 'Ukrudt (stadie 2) spirer i haven' : 'Ingen ledig plads til ukrudt');
    } else if (a === 'snail') {
      if (!w.threat.active()) w.threat.start(Date.now());
      this.toast(w.threat.spawnSnail() ? 'En snegl kryber ind i haven' : 'Snegle kommer kun når en potte har en plante');
    } else if (a === 'clearthreat') {
      for (const x of w.threat.weeds) w.threat.root.remove(x.root); w.threat.weeds = []; p.threat.weeds = [];
      for (const s of w.threat.snails) w.threat.root.remove(s.root); w.threat.snails = [];
      w.save.persist(); this.toast('Ukrudt og snegle fjernet');
    } else if (a === 'reset') {
      if (!confirm('Nulstil al wilds-fremgang for denne karakter? (Drivhus, stald og fiskeri røres ikke.)')) return;
      w.save.resetProfile(); location.reload();
    }
  }
}
