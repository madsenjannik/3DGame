// @ts-nocheck
import { MATERIALS, TOOLS, HOME_UPGRADES, PERKS, POTS } from '../data/wildsCatalog.js';
import { WORKSHOP_UPGRADES } from '../data/workshopCatalog.js?build=SAVE-R148-20261009A';   // R144

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class WorkbenchPanel {
  constructor({ wilds, state }) {
    this.wilds = wilds; this.state = state; this.open = false;
    const el = document.createElement('div');
    el.className = 'wilds-panel'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'wilds-panel-title');
    el.innerHTML = `<div class="wilds-card">
      <header><div><small>YOUR HOME</small><h2 id="wilds-panel-title">Workbench</h2></div><button type="button" class="wilds-close" aria-label="Close">✕</button></header>
      <div class="wilds-trait"></div>
      <div class="wilds-goal"></div>
      <div class="wilds-tabs" role="tablist"><button type="button" role="tab" data-tab="tools">Tools</button><button type="button" role="tab" data-tab="home">Home</button><button type="button" role="tab" data-tab="seeds">Perks</button><button type="button" role="tab" data-tab="today">Today</button></div>
      <div class="wilds-list"></div>
      <footer class="wilds-inv"></footer>
    </div>`;
    document.body.appendChild(el); this.el = el; this.tab = 'tools';
    // Keep panel touches away from the window-level joystick/look handlers.
    for (const t of ['pointerdown', 'pointermove', 'pointerup']) el.addEventListener(t, e => e.stopPropagation());
    el.addEventListener('click', e => {
      if (e.target === el || e.target.closest('.wilds-close')) return this.hide();
      const tab = e.target.closest('[data-tab]'); if (tab) { this.tab = tab.dataset.tab; return this.render(); }
      const craft = e.target.closest('[data-craft]'); if (craft) { this.wilds.craft(craft.dataset.craft); return; }
      if (e.target.closest('[data-pot]')) { this.wilds.pots.craftPot(); return; }
      const plant = e.target.closest('[data-plant]'); if (plant) { this.wilds.plantSeed(plant.dataset.plant); return; }
      if (e.target.closest('[data-workshop]')) { this.wilds.upgradeWorkshop?.(); return; }   // R144
      if (e.target.closest('[data-upgrade]')) this.wilds.upgradeHome();
      const mv = e.target.closest('[data-move]'); if (mv) { this.hide(); this.onMove?.(mv.dataset.move); }
    });
    addEventListener('keydown', e => { if (this.open && (e.key === 'Escape' || e.code === 'KeyE' && !e.repeat)) { e.stopImmediatePropagation(); e.preventDefault(); this.hide(); } }, true);
    wilds.onChange(() => { if (this.open) this.render(); });
  }

  show() { this.open = true; this.render(); this.el.classList.add('open'); this.el.querySelector('.wilds-close').focus({ preventScroll: true }); }
  hide() { this.open = false; this.el.classList.remove('open'); }

  costHtml(cost) {
    const inv = this.state.inventory;
    return Object.entries(cost).map(([id, n]) => { const have = inv.get(id) || 0; return `<span class="wilds-cost ${have >= n ? 'ok' : 'short'}"><i>${MATERIALS[id].icon}</i>${have}/${n} ${MATERIALS[id].name}</span>`; }).join('');
  }
  affordable(cost) { return Object.entries(cost).every(([id, n]) => (this.state.inventory.get(id) || 0) >= n); }

  nextGoal() { return this.wilds.goal().copy; }


  render() {
    const w = this.wilds;
    const tr = w.passive; this.el.querySelector('.wilds-trait').innerHTML = tr ? `<small>YOUR TRAIT</small><b>${esc(tr.name)}</b><span>${esc(tr.text)}</span>` : '';
    this.el.querySelector('.wilds-goal').innerHTML = `<small>NEXT GOAL</small><span>${esc(this.nextGoal())}</span>`;
    this.el.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === this.tab)));
    let html = '';
    if (this.tab === 'tools') {
      for (const t of TOOLS) {
        const owned = w.has(t.id), can = !owned && this.affordable(t.cost);
        html += `<article class="wilds-item${owned ? ' owned' : ''}"><div class="wilds-icon">${t.icon}</div><div class="wilds-body"><b>${esc(t.name)}</b><p>${esc(t.effect)}</p>${owned ? '' : `<div class="wilds-costs">${this.costHtml(t.cost)}</div>`}</div>
          <button type="button" data-craft="${t.id}" ${can ? '' : 'disabled'}>${owned ? 'Owned' : 'Craft'}</button></article>`;
      }
      const pots = w.pots, n = pots.owned(), full = n >= POTS.max, gh = pots.available(), canPot = gh && !full && this.affordable(POTS.cost);
      html += `<article class="wilds-item${full ? ' owned' : ''}"><div class="wilds-icon">🪴</div><div class="wilds-body"><b>Terracotta Pot · ${n}/${POTS.max}</b><p>${gh ? 'Goes on your greenhouse shelf. Plant Wild Seeds, water from the pond, harvest.' : 'Build your greenhouse first (back of the garden).'}</p>${full ? '' : `<div class="wilds-costs">${this.costHtml(POTS.cost)}</div>`}</div>
        <button type="button" data-pot ${canPot ? '' : 'disabled'}>${full ? 'Full' : 'Craft'}</button></article>`;
    } else if (this.tab === 'seeds') {
      // R148: the Perk Shrine takes amber; the next perk costs more than the last (10 / 15 / 20 / 30)
      const amber = this.state.inventory.get('amber') || 0, shrine = w.profile.homeLevel >= 2, price = w.perkPrice();
      html += `<p class="wilds-note">${shrine ? `Grow a permanent perk for amber. Each new perk costs more than the last. You have <b>${amber}</b> Amber.` : 'Build the Perk Shrine (Home tab) to grow perks for amber.'}</p>`;
      for (const k of PERKS) {
        const owned = !!w.profile.perks[k.id], can = shrine && !owned && amber >= price;
        html += `<article class="wilds-item${owned ? ' owned' : ''}"><div class="wilds-icon">✦</div><div class="wilds-body"><b>${esc(k.name)}</b><p>${esc(k.text)}</p>${owned ? '' : `<div class="wilds-costs">${this.costHtml({ amber: price })}</div>`}</div>
          <button type="button" data-plant="${k.id}" ${can ? '' : 'disabled'}>${owned ? 'Grown' : 'Grow'}</button></article>`;
      }
    } else if (this.tab === 'today') {
      const d = w.daily, view = d.view();
      html += `<p class="wilds-note">New requests every day. Finish all three on consecutive days: every 3rd day gives a Golden Seed. Streak: <b>${d.d.streak}</b></p>`;
      for (const t of view) {
        const reward = Object.entries(t.reward).map(([id, n]) => `${MATERIALS[id].icon} ${n}`).join('  ');
        html += `<article class="wilds-item${t.done ? ' owned' : ''}"><div class="wilds-icon">${t.done ? '✓' : '☀'}</div><div class="wilds-body"><b>${esc(t.text)}</b><p>Reward: ${reward}</p>
          <div class="wilds-bar"><i style="width:${Math.round(t.have / t.goal * 100)}%"></i></div></div><span class="wilds-count">${t.have}/${t.goal}</span></article>`;
      }
    } else {
      // R144: the workshop around the bench (L2/L3 unlocks: padlock placeholder until decided)
      html += `<h3 class="wilds-sub">Workshop</h3>`;
      WORKSHOP_UPGRADES.forEach((u, i) => {
        const lvl = w.profile.workshop | 0, done = lvl > i, isNext = lvl === i, can = isNext && this.affordable(u.cost);
        html += `<article class="wilds-item${done ? ' owned' : ''}${!done && !isNext ? ' locked' : ''}"><div class="wilds-icon">🔨</div><div class="wilds-body"><b>${esc(u.name)}</b><p>${esc(u.effect)}</p>${u.unlocks ? `<p class="wilds-unlock"><i class="ico-mask" style="--ico:url(./brand/icons/svg/icon-lock.svg)"></i>Unlocks: ${esc(u.unlocks)}</p>` : ''}${done ? '' : `<div class="wilds-costs">${this.costHtml(u.cost)}</div>`}</div>
          ${isNext ? `<button type="button" data-workshop ${can ? '' : 'disabled'}>Build</button>` : `<button type="button" disabled>${done ? 'Built' : 'Later'}</button>`}</article>`;
      });
      html += `<h3 class="wilds-sub">Garden upgrades</h3>`;
      HOME_UPGRADES.forEach((u, i) => {
        const done = w.profile.homeLevel > i, isNext = w.profile.homeLevel === i, can = isNext && this.affordable(u.cost);
        html += `<article class="wilds-item${done ? ' owned' : ''}${!done && !isNext ? ' locked' : ''}"><div class="wilds-icon">${['🛢', '✦', '🌿'][i]}</div><div class="wilds-body"><b>${esc(u.name)}</b><p>${esc(u.effect)}</p>${done ? '' : `<div class="wilds-costs">${this.costHtml(u.cost)}</div>`}</div>
          ${isNext ? `<button type="button" data-upgrade ${can ? '' : 'disabled'}>Build</button>` : `<button type="button" disabled>${done ? 'Built' : 'Later'}</button>`}</article>`;
      });
    }
    // R60 step 2: garden layout. Each structure can be moved; the garden remembers it per character.
    if (this.tab === 'home' && this.onMove) {
      html += `<h3 class="wilds-sub">Garden layout</h3><p class="wilds-note">Pick a building, then walk to where it should stand. Rotate, then place.</p><div class="wilds-move">${
        [['greenhouse', 'Greenhouse'], ['workshop', 'Workshop'], ['rain', 'Rain barrel'], ['shrine', 'Perk Shrine']].map(([id, n]) => `<button type="button" data-move="${id}">Move ${n}</button>`).join('')}</div>`;
    }
    this.el.querySelector('.wilds-list').innerHTML = html;
    this.el.querySelector('.wilds-inv').innerHTML = Object.values(MATERIALS).map(m => `<span><i>${m.icon}</i>${this.state.inventory.get(m.id) || 0}</span>`).join('');
  }
}
