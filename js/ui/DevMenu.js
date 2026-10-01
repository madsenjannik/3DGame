// @ts-nocheck
// Test shortcuts for the wilds/garden loop. Enabled per device from Indstillinger on the start
// screen (localStorage 'tgw.devMenu' = '1'). Works on the player's real save.
import { MATERIALS, TOOLS } from '../data/wildsCatalog.js';

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
        <section><small>RESSOURCER</small><div class="dev-grid">
          <button data-a="mats">+20 materialer</button><button data-a="tools">Alle redskaber</button><button data-a="pots">3 potter + vand</button><button data-a="skip">Spol 5 min frem</button>
        </div></section>
        <section><small>TELEPORT</small><div class="dev-grid">
          <button data-a="tp:bench">Arbejdsbænk</button><button data-a="tp:greenhouse">Drivhus</button><button data-a="tp:pond">Dam</button><button data-a="tp:gate">Havelåge</button>
          <button data-a="tp:world">Verden (hjem)</button><button data-a="tp:node">Nærmeste node</button><button data-a="tp:thorn">Nærmeste tornekrat</button>
        </div></section>
        <section><small>DRIVHUS (genindlæser)</small><div class="dev-grid four">
          <button data-a="gh:0">Intet</button><button data-a="gh:1">L1</button><button data-a="gh:2">L2</button><button data-a="gh:3">L3</button>
        </div></section>
        <section><small>TRUSSEL</small><div class="dev-grid">
          <button data-a="weed">Ukrudt nu</button><button data-a="snail">Snegl nu</button><button data-a="clearthreat">Fjern ukrudt + snegle</button>
        </div></section>
        <section><small>FARE</small><div class="dev-grid"><button data-a="reset" class="danger">Nulstil wilds-save (denne karakter)</button></div></section>
      </div></div>`;
    document.body.appendChild(el); this.el = el; this.open = false;
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
      if (t === 'bench') this.teleport('garden', 4.7, 7.6, Math.PI / 2);
      else if (t === 'greenhouse') this.teleport('garden', 6.5, -9.3, Math.PI);
      else if (t === 'pond') this.teleport('garden', -3.9, 1.15, Math.PI);
      else if (t === 'gate') { const s = hp.gardenSpawn(); this.teleport('garden', s.x, s.z, s.heading); }
      else if (t === 'world') { const s = hp.worldSpawn(); this.teleport('world', s.x, s.z, s.heading); }
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
