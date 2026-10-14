// @ts-nocheck
import { MATERIALS, TOOLS, HOME_UPGRADES, PERKS, POTS } from '../data/wildsCatalog.js';
import { WORKSHOP_UPGRADES } from '../data/workshopCatalog.js?build=SAVE-R159-20261014A';   // R144

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class WorkbenchPanel {
  constructor({ wilds, state, getGreenhouse = () => null }) {
    this.wilds = wilds; this.state = state; this.getGreenhouse = getGreenhouse; this.open = false; this.selectedTool='axe';this.previewKind='greenhouse';this.previewLevel=1;this.preview=null;this.previewLoading=false;
    const el = document.createElement('div');
    el.className = 'wilds-panel r158a-panel'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'wilds-panel-title');
    el.innerHTML = `<div class="wilds-card r158a-card">
      <header><div class="r158a-brand"><span class="r158a-brand-icon" aria-hidden="true">⚒</span><div><small>GROWING WILDS · BUILD · UNLOCK · UPGRADE</small><h2 id="wilds-panel-title">Workbench</h2><span class="r158a-wb-level">Your garden workshop</span></div></div><button type="button" class="wilds-close" aria-label="Close Workbench">✕</button></header>
      <div class="wilds-trait"></div><div class="wilds-goal"></div>
      <div class="wilds-tabs" role="tablist" aria-label="Workbench categories">
        <button type="button" role="tab" data-tab="tools"><i class="r158a-tab-ico">⚒</i><span>Tools</span></button>
        <button type="button" role="tab" data-tab="home"><i class="r158a-tab-ico">⌂</i><span>Buildings</span></button>
        <button type="button" role="tab" data-tab="seeds"><i class="r158a-tab-ico">✦</i><span>Perks</span></button>
        <button type="button" role="tab" data-tab="chars"><i class="r158a-tab-ico">❀</i><span>Characters</span></button>
        <button type="button" role="tab" data-tab="today"><i class="r158a-tab-ico">☀</i><span>Daily Requests</span></button>
      </div>
      <div class="r158a-workspace"><div class="r158a-list-pane">
        <div class="r158a-section-head"><small>YOUR COLLECTION</small><h3 class="r158a-section-title">Tools & Crafting</h3></div>
        <div class="wilds-list"></div></div>
        <aside class="r158a-detail" aria-label="Selected Workbench item details">
          <div class="r158a-preview" aria-label="Animated preview of actual game building"><canvas class="r158a-preview-canvas" aria-label="Live 3D GLB building preview"></canvas><div class="r158a-preview-status" role="status" hidden></div><span class="r158a-preview-caption">ACTUAL IN-GAME MODEL</span></div>
          <div class="r158a-detail-copy"></div>
        </aside></div>
      <footer class="wilds-inv"></footer>
    </div>`;
    document.body.appendChild(el); this.el = el; this.tab = 'tools';
    // Keep panel touches away from the window-level joystick/look handlers.
    for (const t of ['pointerdown', 'pointermove', 'pointerup']) el.addEventListener(t, e => e.stopPropagation());
    el.addEventListener('click', e => {
      if (e.target === el || e.target.closest('.wilds-close')) return this.hide();
      const tab = e.target.closest('[data-tab]'); if (tab) { this.tab = tab.dataset.tab; this.render(); return tab.focus?.({ preventScroll: true }); }
      const building=e.target.closest('[data-focus-building]');
      if(building){this.previewKind=building.dataset.focusBuilding;this.previewLevel=(this.previewKind==='workshop'?(this.wilds.profile.workshop|0):(this.getGreenhouse?.()?.level||0))||1;this.render();return;}
      const previewLevel=e.target.closest('[data-preview-level]');
      if(previewLevel){this.previewLevel=Number(previewLevel.dataset.previewLevel)||1;this.renderDetail();return;}
      const focused=e.target.closest('[data-focus-tool]');
      if(focused&&!e.target.closest('button[data-craft],button[data-pot]')){this.selectedTool=focused.dataset.focusTool;this.renderDetail();this.highlightSelection();return;}
      const craft = e.target.closest('[data-craft]'); if (craft) { this.wilds.craft(craft.dataset.craft); return; }
      if (e.target.closest('[data-pot]')) { this.wilds.pots.craftPot(); return; }
      // R157B.1: explicit tap here is the only way to build/upgrade the greenhouse.
      if (e.target.closest('[data-greenhouse-upgrade]')) {
        const gh=this.getGreenhouse?.();
        if (gh && !gh.anim && gh.level < 3 && gh.startUpgrade?.()) this.render();
        return;
      }
      const plant = e.target.closest('[data-plant]'); if (plant) { this.wilds.plantSeed(plant.dataset.plant); return; }
      if (e.target.closest('[data-workshop]')) { this.wilds.upgradeWorkshop?.(); return; }   // R144
      if (e.target.closest('[data-upgrade]')) this.wilds.upgradeHome();
      const mv = e.target.closest('[data-move]'); if (mv) { this.hide(); this.onMove?.(mv.dataset.move); }
    });
    addEventListener('keydown', e => { if (this.open && (e.key === 'Escape' || e.code === 'KeyE' && !e.repeat)) { e.stopImmediatePropagation(); e.preventDefault(); this.hide(); } }, true);
    // R156: Tab stays inside the open panel; arrow keys move between tabs
    addEventListener('keydown', e => {
      if (!this.open) return;
      if ((e.key==='Enter'||e.key===' ')&&e.target?.matches?.('[data-focus-tool]')){e.preventDefault();e.target.click();return;}
      if (e.key === 'Tab') { const f = [...this.el.querySelectorAll('button:not(:disabled)')].filter(b => b.offsetParent !== null); if (!f.length) return; const i = f.indexOf(document.activeElement), n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i + 1) % f.length; e.preventDefault(); f[n].focus(); return; }
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target?.closest?.('[data-tab]')) { const t = [...this.el.querySelectorAll('[data-tab]')], i = t.indexOf(e.target), n = t[(i + (e.key === 'ArrowRight' ? 1 : t.length - 1)) % t.length]; e.preventDefault(); this.tab = n.dataset.tab; this.render(); n.focus(); }
    }, true);
    wilds.onChange(() => { if (this.open) this.render(); });
    // The established greenhouse animation signals start/finish. Keep the hub current.
    for(const event of ['greenhouse:upgrade-started','greenhouse:level-changed']) this.state.events?.on?.(event,()=>{if(this.open)this.render();});
  }

  // R154: open on the tab with something waiting (a Special Seed → Seeds, an affordable perk → Perks), else the last one used
  pickTab() { const w = this.wilds; try { if (w.specialSeeds?.inBag?.().length) return 'chars'; if (w.profile.homeLevel >= 2 && PERKS.some(k => !w.profile.perks[k.id]) && (this.state.inventory.get('amber') || 0) >= w.perkPrice()) return 'seeds'; } catch {} return this.tab; }
  dots() { const w = this.wilds, d = {}; try { d.chars = !!w.specialSeeds?.inBag?.().length; d.seeds = w.profile.homeLevel >= 2 && PERKS.some(k => !w.profile.perks[k.id]) && (this.state.inventory.get('amber') || 0) >= w.perkPrice(); } catch {} return d; }
  show(){this.open=true;this.tab=this.pickTab();this.render();this.el.classList.add('open');requestAnimationFrame(()=>{this.el.querySelector('.wilds-close')?.focus({preventScroll:true});if(this.tab==='home')this.refreshPreview();});}   // R156: focus once visible
  hide(){this.open=false;this.el.classList.remove('open');this.preview?.hide();}

  costHtml(cost) {
    const inv = this.state.inventory;
    return Object.entries(cost).map(([id, n]) => { const have = inv.get(id) || 0; return `<span class="wilds-cost ${have >= n ? 'ok' : 'short'}"><i>${MATERIALS[id].icon}</i>${have}/${n} ${MATERIALS[id].name}</span>`; }).join('');
  }
  affordable(cost) { return Object.entries(cost).every(([id, n]) => (this.state.inventory.get(id) || 0) >= n); }

  nextGoal() { return this.wilds.goal().copy; }


  render() {
    const w = this.wilds;
    const level=this.el.querySelector('.r158a-wb-level');if(level)level.textContent=`Workshop Level ${w.profile.workshop|0} · Crafting & Building`;
    const tr = w.passive; this.el.querySelector('.wilds-trait').innerHTML = tr ? `<small>YOUR TRAIT</small><b>${esc(tr.name)}</b><span>${esc(tr.text)}</span>` : '';
    { const gl = this.wilds.goal(); this.el.querySelector('.wilds-goal').innerHTML = `<small>NEXT GOAL</small><span><b>${esc(gl.title)}</b> · ${esc(gl.copy)}</span>`; }   // R153: the title too (the copy alone read like a fragment)
    const dots = this.dots(); this.el.querySelectorAll('[data-tab]').forEach(b => { b.setAttribute('aria-selected', String(b.dataset.tab === this.tab)); b.classList.toggle('has-dot', !!dots[b.dataset.tab] && b.dataset.tab !== this.tab); });   // R154: a dot where something waits
    let html = '';
    if (this.tab === 'tools') {
      for (const t of TOOLS) {
        const owned = w.has(t.id), can = !owned && this.affordable(t.cost);
        const iconKey=t.id==='can'?'watering-can':t.id;
        const art=['axe','pickaxe','sickle','watering-can'].includes(iconKey)?`<img src="./brand/icons/tool3d/icon-${iconKey}.png" alt="" loading="lazy">`:t.icon;
        html += `<article class="wilds-item r158a-tool-card${owned ? ' owned' : ''}" data-focus-tool="${t.id}" tabindex="0"><div class="wilds-icon">${art}</div><div class="wilds-body"><b>${esc(t.name)}</b><p>${esc(t.effect)}</p>${owned ? '' : `<div class="wilds-costs">${this.costHtml(t.cost)}</div>`}</div>
          <button type="button" data-craft="${t.id}" ${can ? '' : 'disabled'}>${owned ? 'Owned' : 'Craft'}</button></article>`;
      }
      const pots = w.pots, n = pots.owned(), full = n >= POTS.max, gh = pots.available(), canPot = gh && !full && this.affordable(POTS.cost);
      html += `<article class="wilds-item r158a-tool-card${full ? ' owned' : ''}" data-focus-tool="pot" tabindex="0"><div class="wilds-icon">🪴</div><div class="wilds-body"><b>Terracotta Pot · ${n}/${POTS.max}</b><p>${gh ? 'Goes on your greenhouse shelf. Plant Wild Seeds, water from the pond, harvest.' : 'Build your greenhouse first (Workbench → Home).'}</p>${full ? '' : `<div class="wilds-costs">${this.costHtml(POTS.cost)}</div>`}</div>
        <button type="button" data-pot ${canPot ? '' : 'disabled'}>${full ? 'Full' : 'Craft'}</button></article>`;
    } else if (this.tab === 'seeds') {
      // R148: the Perk Shrine takes amber; the next perk costs more than the last (10 / 15 / 20 / 30)
      const amber = this.state.inventory.get('amber') || 0, shrine = w.profile.homeLevel >= 2, price = w.perkPrice();
      html += `<p class="wilds-note">${shrine ? `Grow a permanent perk for amber. Each new perk costs more than the last. You have <b>${amber}</b> Amber.` : 'Build the Perk Shrine (Home tab) to grow perks for amber.'}</p>`;
      for (const k of PERKS) {
        const owned = !!w.profile.perks[k.id], can = shrine && !owned && amber >= price;
        html += `<article class="wilds-item${owned ? ' owned' : ''}"><div class="wilds-icon">✦</div><div class="wilds-body"><b>${esc(k.name)}</b><p>${esc(k.text)}</p>${owned ? '' : `<div class="wilds-costs${shrine ? '' : ' neutral'}">${this.costHtml({ amber: price })}</div>`}</div>
          <button type="button" data-plant="${k.id}" ${can ? '' : 'disabled'}>${owned ? 'Grown' : 'Grow'}</button></article>`;
      }
    } else if (this.tab === 'chars') {
      // R152: the Special Seeds, one per character: grown, waiting in your Bag, or how to earn it
      const rows = w.specialSeeds?.journal?.() || [];
      html += `<p class="wilds-note">Every character grows from its own seed. Plant a seed at the Sprouting Ring in your garden.</p>`;
      for (const d of rows) {
        const st = d.state === 'open' ? 'Grown' : d.state === 'bag' ? 'In your Bag' : 'Locked', who = d.id[0].toUpperCase() + d.id.slice(1);
        const line = d.state === 'bag' ? '<p>Plant it at the Sprouting Ring.</p>' : d.state === 'open' ? `<p>${esc(who)} can be chosen at the Ring.</p>` : `<p class="wilds-unlock"><i class="ico-mask" style="--ico:url(./brand/icons/svg/icon-lock.svg)"></i>${esc(d.how)}</p>`;
        html += `<article class="wilds-item${d.state === 'open' ? ' owned' : ''}${d.state === 'bag' ? ' ready' : ''}"><div class="wilds-icon">${d.state === 'locked' ? '<i class="ico-mask wilds-lock" style="--ico:url(./brand/icons/svg/icon-lock.svg)"></i>' : '🌱'}</div><div class="wilds-body"><b>${esc(d.name)}</b>${line}</div><span class="wilds-count">${st}</span></article>`;
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
      html += `<div class="r158a-building-choices" role="group" aria-label="3D building preview"><button type="button" data-focus-building="greenhouse" aria-pressed="${this.previewKind==='greenhouse'}">Greenhouse · 3D</button><button type="button" data-focus-building="workshop" aria-pressed="${this.previewKind==='workshop'}">Workshop · 3D</button></div>`;
      // R157B.1: use existing free greenhouse level progression from the Workbench.
      const gh=this.getGreenhouse?.(), lvl=gh?.level??0, busy=!!gh?.anim, max=lvl>=3;
      const ghStatus=!gh?'Loading greenhouse…':busy?`Building level ${gh.anim.to}/3`:(lvl===0?'Not built':`Level ${lvl}/3`);
      const ghDetail=max?'All three existing levels are complete.':busy?'Greenhouse animation in progress.':lvl===0?'Build the first greenhouse here. Then craft pots under Tools.':'Unlock the next greenhouse level here. Your plants and saves stay intact.';
      html += `<h3 class="wilds-sub">Greenhouse</h3><article class="wilds-item${max?' owned':''}"><div class="wilds-icon">🏡</div><div class="wilds-body"><b>Greenhouse · ${ghStatus}</b><p>${ghDetail}</p><p>No material cost · existing greenhouse progression</p></div>
      <button type="button" data-greenhouse-upgrade ${!gh||busy||max?'disabled':''}>${!gh?'Loading':busy?'Building…':max?'Complete':lvl===0?'Build':'Upgrade'}</button></article>`;
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
    const title={tools:'Tools & Crafting',home:'Buildings & Upgrades',seeds:'Permanent Perks',chars:'Character Seeds',today:'Daily Requests'}[this.tab];
    const h=this.el.querySelector('.r158a-section-title');if(h)h.textContent=title;
    this.highlightSelection();this.renderDetail();
    // R156: the card the current goal asks for (e.g. 'Craft a pot') is scrolled into view and marked
    try { const t = (this.wilds.goal().title || '').toLowerCase().replace('your first tool', 'stone axe'), list = this.el.querySelector('.wilds-list');
      const name = a => a.querySelector('.wilds-body b')?.textContent.toLowerCase().replace(/ ·.*$/, '').replace(/^terracotta /, '') || '';
      const hit = [...list.querySelectorAll('.wilds-item')].sort((a, b) => name(b).length - name(a).length).find(a => name(a).length > 2 && t.includes(name(a)));   // longest name first (pickaxe before axe)
      if (hit) { hit.classList.add('goal'); requestAnimationFrame(() => hit.scrollIntoView({ block: 'nearest' })); } } catch {}
    this.el.querySelector('.wilds-inv').innerHTML = Object.values(MATERIALS).map(m => `<span title="${esc(m.name)}" aria-label="${esc(m.name)}"><i>${m.icon}</i>${this.state.inventory.get(m.id) || 0}</span>`).join('');   // R155: names on hover / for screen readers
  }
  highlightSelection(){
    this.el.querySelectorAll('[data-focus-tool]').forEach(x=>x.classList.toggle('r158a-selected',x.dataset.focusTool===this.selectedTool));
  }
  renderDetail(){
    const detail=this.el.querySelector('.r158a-detail-copy');if(!detail)return;
    const stage=this.el.querySelector('.r158a-preview');stage?.classList.toggle('visible',this.tab==='home');
    if(this.tab==='tools'){
      this.preview?.hide();
      const t=TOOLS.find(x=>x.id===this.selectedTool),pot=this.selectedTool==='pot',p=this.wilds.pots;
      const owned=t?this.wilds.has(t.id):pot&&p.owned()>=POTS.max;
      const can=t?!owned&&this.affordable(t.cost):(pot&&p.available()&&p.owned()<POTS.max&&this.affordable(POTS.cost));
      const key=t?(t.id==='can'?'watering-can':t.id):'';
      const art=['axe','pickaxe','sickle','watering-can'].includes(key)?`<img src="./brand/icons/tool3d/icon-${key}.png" alt="">`:'<span class="r158a-pot-art">🪴</span>';
      const label=t?t.name:'Terracotta Pot',desc=t?t.effect:'Plant Wild Seeds in your greenhouse, water from the pond and harvest.',cost=t?t.cost:POTS.cost;
      detail.innerHTML=`<small class="r158a-kicker">CRAFTING</small><div class="r158a-detail-art">${art}</div>
        <h3>${esc(label)}</h3><p>${esc(desc)}</p><span class="r158a-state">${owned?'✓ Owned':can?'Ready to craft':'Requires materials'}</span>
        ${owned?'<p class="r158a-detail-note">Already in your collection.</p>':`<div class="r158a-detail-costs">${this.costHtml(cost)}</div>`}
        ${t?`<button type="button" data-craft="${t.id}" ${can?'':'disabled'}>${owned?'Owned':'Craft '+esc(t.name)}</button>`:`<button type="button" data-pot ${can?'':'disabled'}>${owned?'Full':'Craft Pot'}</button>`}`;
    }else if(this.tab==='home'){
      const kind=this.previewKind,gh=this.getGreenhouse?.(),current=kind==='greenhouse'?(gh?.level||0):(this.wilds.profile.workshop|0);
      const level=Math.min(3,Math.max(1,this.previewLevel||current||1)),next=kind==='greenhouse'?null:WORKSHOP_UPGRADES[current],busy=!!gh?.anim&&kind==='greenhouse';
      const done=current>=3,can=kind==='greenhouse'?!!gh&&!busy&&!done:!!next&&this.affordable(next.cost);
      const nextText=kind==='greenhouse'?(current===0?'Build Greenhouse':`Upgrade Greenhouse · Level ${current+1}`):current===0?'Build Workshop':`Upgrade Workshop · Level ${current+1}`;
      const hint=kind==='greenhouse'?'Greenhouse levels retain their original plants, animations and save state.':'Levels 2 and 3 include their original models; new gameplay unlocks are coming soon.';
      detail.innerHTML=`<small class="r158a-kicker">YOUR BUILDING · LEVEL ${current} OF 3</small><h3>${kind==='greenhouse'?'Greenhouse':'Workshop'}</h3>
        <p>${esc(hint)}</p><div class="r158a-levels" role="group" aria-label="Preview levels">${[1,2,3].map(n=>`<button type="button" data-preview-level="${n}" aria-pressed="${level===n}" aria-label="Preview level ${n}">L${n}${n<=current?' ✓':''}</button>`).join('')}</div>
        <small class="r158a-preview-notice">Showing actual Level ${level} GLB · Preview only</small>
        ${done?'<p class="r158a-state">✓ All three levels complete</p>':`<div class="r158a-build-goal"><strong>${esc(nextText)}</strong>${kind==='workshop'?`<div class="r158a-detail-costs">${this.costHtml(next?.cost||{})}</div>`:'<p>No material cost</p>'}</div>
        <button type="button" ${kind==='greenhouse'?'data-greenhouse-upgrade':'data-workshop'} ${can?'':'disabled'}>${busy?'Building…':can?esc(nextText):kind==='greenhouse'?'Unavailable':'Not enough resources'}</button>`}
        <p class="r158a-detail-note">Preview rotation does not alter the building or placement.</p>`;
      const canvas=this.el.querySelector('.r158a-preview canvas');
      if(this.open&&canvas?.tagName==='CANVAS'&&typeof requestAnimationFrame==='function')requestAnimationFrame(()=>this.refreshPreview());
    }else{
      this.preview?.hide();
      const data={seeds:['PERMANENT PROGRESSION','Grow your perks','Perks use amber at the Perk Shrine. Existing unlock costs are unchanged.'],chars:['SPROUTING RING','Grow new characters','Plant Special Seeds at the Sprouting Ring in your garden — not inside Workbench.'],today:['DAILY REQUESTS','Your daily goals','Complete requests for their existing rewards and streak bonuses.']}[this.tab];
      detail.innerHTML=`<small class="r158a-kicker">${data[0]}</small><h3>${data[1]}</h3><p>${data[2]}</p>`;
    }
  }
  async refreshPreview(){
    if(!this.open||this.tab!=='home')return;
    const canvas=this.el.querySelector('.r158a-preview canvas');if(canvas?.tagName!=='CANVAS')return;
    if(!this.preview){
      if(this.previewLoading)return;this.previewLoading=true;
      try{const {WorkbenchPreview3D}=await import('./WorkbenchPreview3D.js?build=CORE-R158A-20261012A');
        if(!this.open||this.tab!=='home')return;
        this.preview=new WorkbenchPreview3D(canvas,this.el.querySelector('.r158a-preview-status'));
      }catch(e){console.warn('[R158A] Optional preview unavailable',e);const st=this.el.querySelector('.r158a-preview-status');if(st){st.hidden=false;st.textContent='3D preview unavailable';}}
      finally{this.previewLoading=false;}
    }
    this.preview?.show(this.previewKind,this.previewLevel||1);
  }
}
