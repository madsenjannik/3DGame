// @ts-nocheck
import { actionIcon, actionIconName, isToolJob } from './actionIcons.js?build=SAVE-R156-20261010A';
import { approvedItemArt, approvedMaterialText } from './ApprovedItemArt.js?build=POLISH-R158A1-20261012A';
export class Hud {
  constructor(state){
    this.state=state;this._bagFilter='all';
    this.seed=document.getElementById('seed-count');this.action=document.getElementById('action');this.toast=document.getElementById('toast');this.objective=document.getElementById('objective');this.kicker=document.getElementById('objective-kicker');this.title=document.getElementById('objective-title');this.copy=document.getElementById('objective-copy');this.hint=document.getElementById('hint');this.loading=document.getElementById('loading');this.materials=document.getElementById('materials');
    this.materialIds=['wood','stone','clay','fiber','amber','shell','wild_seed'];
    this.setObjectiveIcon(this.title?.textContent);
    this.buildTopRow(state);
    this.seed.textContent=String(state.inventory.get('rare_seed')||0);
    this.materialIds.forEach(id=>this.setMaterial(id,state.inventory.get(id)||0));
    // Golden Seeds from the wilds (golden_seed) and the first-discovery seed share one counter.
    state.events.on('inventory:changed',e=>{if(e.id==='rare_seed'||e.id==='golden_seed')this.seed.textContent=String((state.inventory.get('rare_seed')||0)+(state.inventory.get('golden_seed')||0));if(this.materialIds.includes(e.id))this.setMaterial(e.id,e.amount);});
    state.events.on('golden-seed:awakened',()=>{
      this.objective.classList.remove('complete');this.kicker.textContent='DISCOVERY';this.title.textContent='The Golden Seed is awake';this.copy.textContent='Step closer and collect it.';this.showToast('The seed awakened');
    });
    state.events.on('choice:opened',()=>{
      this.objective.classList.remove('complete');this.kicker.textContent='GOLDEN DISCOVERY';this.title.textContent='Choose what the Golden Seed becomes';this.copy.textContent='Keep it for your own garden, or help the shared world project.';this.showToast('Golden Seed collected');
    });
    state.events.on('objective:complete',e=>{
      if(e.id!=='first_meaningful_choice')return;
      this.objective.classList.add('complete');
      if(e.result==='plant'){this.title.textContent='Something is growing';this.copy.textContent='Your Golden Seed is becoming a Golden Lotus in your plot.';this.showToast('Golden Seed planted');}
      else{this.title.textContent='The shared world changed';this.copy.textContent='Your Golden Seed advanced Community Bloom to 1/3.';this.showToast('Community project advanced');}
    });
    state.events.on('resource-loop:activated',()=>{
      this.materials.classList.add('show');this.objective.classList.remove('complete');this.kicker.textContent='RESOURCE TO BUILD LOOP';this.title.textContent='Gather for the Garden Lookout';this.copy.textContent='Find Wood, Stone, Clay and Fiber around the garden.';
    });
    state.events.on('resource:gathered',e=>{this.showToast(`${e.displayName} gathered +${e.amount}`);});
    state.events.on('resource-loop:progress',e=>{
      if(e.ready){this.title.textContent='Materials ready';this.copy.textContent='Return to the Garden Lookout foundation and build it.';return;}
      const p=e.progress;this.copy.textContent=`Wood ${p.wood.have}/${p.wood.need}  Stone ${p.stone.have}/${p.stone.need}  Clay ${p.clay.have}/${p.clay.need}  Fiber ${p.fiber.have}/${p.fiber.need}`;
    });
    state.events.on('lookout:ready',()=>{this.title.textContent='Build the Garden Lookout';this.copy.textContent='The foundation is ready for your materials.';this.showToast('Lookout ready to build');});
    state.events.on('lookout:built',()=>{this.title.textContent='Lookout online';this.copy.textContent='Something rare has appeared elsewhere in the garden.';this.showToast('Garden Lookout built');});
    state.events.on('hotspot:revealed',()=>{this.kicker.textContent='DISCOVERY';this.title.textContent='A rare hotspot appeared';this.copy.textContent='Follow the golden beacon and investigate it.';this.showToast('Rare hotspot revealed');});
    state.events.on('hotspot:collected',()=>{this.objective.classList.add('complete');this.title.textContent='Hotspot secured';this.copy.textContent='The Lookout revealed a Golden Seed that would otherwise stay hidden.';this.showToast('Golden Seed secured');});
    state.events.on('golden-lotus:payoff-started',()=>{this.kicker.textContent='GROWTH';this.title.textContent='The Golden Lotus is awakening';this.copy.textContent='Watch what your Golden Seed becomes.';});
    state.events.on('golden-lotus:grown',()=>{this.objective.classList.add('complete');this.kicker.textContent='GOLDEN GROWTH';this.title.textContent='Golden Lotus';this.copy.textContent='Your first rare payoff plant has bloomed.';this.showToast('Golden Lotus bloomed');});
    state.events.on('greenhouse:level-changed',e=>{this.showToast(e.level===1?'Greenhouse built':'Greenhouse upgraded');   /* R154: English (was Danish) */});
  }
  // R69a unified landscape HUD (Jannik's HUD concept 03/10): one top row = objective chip, Golden Seed chip, resource
  // chips; the minimap stays top right. Replaces R66's hidden/peek phone HUD. A chip pulses briefly when its count rises.
  buildTopRow(state){
    const hud=document.getElementById('hud'),inv=document.getElementById('inventory');
    if(hud&&this.objective&&this.objective.parentElement!==hud)hud.insertBefore(this.objective,inv||hud.firstChild);
    const chip=id=>id==='golden_seed'||id==='rare_seed'?document.querySelector('.seed-card'):document.querySelector(`.material-chip.${id}`);
    const last={};const ids=['wood','stone','clay','fiber','amber','shell','wild_seed','golden_seed','rare_seed'];for(const id of ids)last[id]=state.inventory.get(id)||0;
    state.events.on('inventory:changed',e=>{if(!ids.includes(e.id))return;const up=(e.amount||0)>last[e.id];last[e.id]=e.amount||0;const c=chip(e.id);if(up&&c){c.classList.remove('bump');void c.offsetWidth;c.classList.add('bump');if(this.touch())this.peek(inv,2600);}});
    this.buildCollapse(hud,inv);
  }
  // R71 phone HUD: the quest card and the resources fold away to two round buttons (top left); only the map
  // icon stays top right. Tap to open/close; a new quest step or a gain opens them briefly by itself.
  touch(){return document.body.classList.contains('touch');}
  objectiveIconName(title=''){
    const t=String(title||'').toLowerCase();
    if(/craft|build|workbench|greenhouse|pot/.test(t))return 'hammer';
    if(/water|fill/.test(t))return 'drop';
    if(/golden seed|wild seed|plant|lotus/.test(t))return 'seed';
    if(/thorn|overgrowth|weed/.test(t))return 'sickle';
    if(/boat|lake race|waterfall/.test(t))return 'boat';
    if(/fish/.test(t))return 'rod';
    if(/stable|ride|horse/.test(t))return 'horseshoe';
    if(/cache|hotspot/.test(t))return 'chest';
    if(/gather|material/.test(t))return 'bag';
    return 'leaf';
  }
  setObjectiveIcon(title){
    if(!this.objective)return;
    const n=this.objectiveIconName(title);
    this.objective.dataset.objectiveIcon=n;
    this.objective.style.setProperty('--objective-icon',`url(./brand/icons/svg/icon-${n}.svg)`);
  }
  buildCollapse(hud,inv){
    if(!hud||!inv||!this.objective)return;
    const bag=document.createElement('button');bag.type='button';bag.id='hud-bag';bag.className='hud-fold-btn';bag.setAttribute('aria-label','Bag');
    hud.insertBefore(bag,inv);this.bag=bag;this._peekT=new Map();
    const pin=(el,btn)=>{const on=!el.classList.contains('pinned');el.classList.toggle('pinned',on);el.classList.toggle('open',on);btn?.classList.toggle('active',on);el.classList.remove('fresh');clearTimeout(this._peekT.get(el));};
    // R84 (Jannik 06/10): resources are always visible on phones too; the bag holds what you carry (tools, rod, vest, lantern).
    const always=()=>{if(this.touch()&&!inv.classList.contains('always'))inv.classList.add('open','pinned','always');};always();
    new MutationObserver(always).observe(document.body,{attributes:true,attributeFilter:['class']});   // 'touch' is set on body after the HUD is built
    this.buildGear();
    bag.addEventListener('click',e=>{e.stopPropagation();if(this.touch()&&!this.objective.classList.contains('open'))this.anchorMobileTop();this.toggleGear();});
    // R74 Test HUD B: the quest is a one-line chip; tap shows the text, the cross hides it to a round button, tap brings it back.
    const classic=()=>document.body.classList.contains('hud-classic')||(document.body.classList.contains('hud-desktop-e')&&!this.touch());
    this.objective.addEventListener('click',e=>{if(!this.touch()&&!classic())return;e.stopPropagation();pin(this.objective);if(this.touch())requestAnimationFrame(()=>this.anchorMobileTop());});
    const title=document.getElementById('objective-title');
    if(title)new MutationObserver(()=>{this.setObjectiveIcon(title.textContent);if(this.touch()){if(!this.objective.classList.contains('open'))this.anchorMobileTop();this.objective.classList.add('fresh');this.peek(this.objective,5000);}}).observe(title,{childList:true,characterData:true,subtree:true});
  }
  // R104: on phones the Bag button must not move when the quest expands.
  // Capture the quest's COLLAPSED natural width, pin Bag beside that footprint, then let the quest grow downward.
  anchorMobileTop(){
    // R109: mobile Bag belongs to the bottom player cluster, so no quest-relative positioning is needed.
  }
  // R101: Bag stays the carried-item list; desktop hotbar has its own persistent slot order.
  buildGear(){
    const p=document.createElement('div');p.id='gear-panel';p.className='gear-panel r158a-gear';p.setAttribute('aria-label','Bag');document.body.appendChild(p);this.gear=p;
    for(const type of ['pointerdown','pointermove','pointerup'])p.addEventListener(type,e=>e.stopPropagation());
    addEventListener('keydown',e=>{if(e.key==='Escape'&&this.gear?.classList.contains('open')){e.preventDefault();e.stopImmediatePropagation();this.toggleGear(false);}},true);
    p.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.gear?.classList.contains('open')){e.preventDefault();e.stopImmediatePropagation();this.toggleGear(false);return;}if((e.key==='Enter'||e.key===' ')&&e.target?.matches?.('[role=button][tabindex]')){e.preventDefault();e.target.click();}});   // R156: keyboard on Bag rows
    p.addEventListener('click',e=>{
      e.stopPropagation();
      if(e.target.closest?.('.gear-close')){this.toggleGear(false);return;}
      if(this.bag2Mode()){this.bag2Click(e);return;}   // R124 phone Bag
      if(e.target.closest?.('.gear-item[data-wear="1"]')){this.onVestToggle?.();this.renderGear();return;}   // R146: the desktop Bag wears the Life Vest too
      const row=e.target.closest?.('.gear-item[data-equip="1"]');if(!row)return;
      const ok=this.onGearEquip?.(row.dataset.itemId);if(ok===false)return;
      this.renderGear();if(this.touch())setTimeout(()=>this.toggleGear(false),110);
    });
    const q=document.createElement('div');q.id='desktop-hotbar-e';q.className='desktop-hotbar-e';q.setAttribute('aria-label','Quick slots 1 to 0. Drag items to rearrange.');
    q.innerHTML=Array.from({length:10},(_,i)=>`<span class="desktop-hotbar-slot" data-slot="${i}" role="button" tabindex="-1" aria-label="Slot ${i===9?'0':i+1}"><small>${i===9?'0':i+1}</small><i class="slot-icon"></i><em class="slot-fallback"></em></span>`).join('');
    document.body.appendChild(q);this.desktopHotbar=q;this._hotbarPointer=null;this._hotbarGhost=null;
    // R102: real mouse hold + pointer drag. Native HTML5 drag was unreliable because the HUD parent
    // intentionally used pointer-events:none. A short press still equips; movement >= 5px becomes a drag.
    const slotAt=(x,y)=>document.elementFromPoint(x,y)?.closest?.('.desktop-hotbar-slot');
    const clearHover=()=>q.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));
    const finishPointer=(e,cancel=false)=>{
      const d=this._hotbarPointer;if(!d||e.pointerId!==d.id)return;
      this._hotbarPointer=null;
      if(d.drag&&!cancel&&d.target&&d.target!==d.source){
        const to=Number(d.target.dataset.slot);if(Number.isInteger(to))this.onHotbarMove?.(d.from,to);
      }else if(!d.drag&&!cancel){
        const ok=this.onHotbarSelect?.(d.from);
        if(ok!==false&&this.touch()&&document.body.classList.contains('mobile-bag-open'))setTimeout(()=>this.toggleGear(false),110);
      }
      d.source.classList.remove('dragging');clearHover();this._hotbarGhost?.remove();this._hotbarGhost=null;
      try{q.releasePointerCapture?.(d.id);}catch{}
    };
    q.addEventListener('pointerdown',e=>{
      const mobileTouch=this.touch()&&document.body.classList.contains('hud-classic'),mobileBag=mobileTouch&&document.body.classList.contains('mobile-bag-open');
      if((this.touch()&&!mobileTouch)||(e.pointerType==='mouse'&&e.button!==0))return;const slot=e.target.closest?.('.desktop-hotbar-slot');
      const from=Number(slot?.dataset?.slot);
      // R109: phone gameplay exposes only quick slots 1–5. Bag still exposes all 10.
      if(!slot||!slot.classList.contains('filled')||(!mobileBag&&mobileTouch&&from>4)||(this.hotbarEditable?.()===false))return;
      e.preventDefault();e.stopPropagation();
      this._hotbarPointer={id:e.pointerId,from,source:slot,target:slot,x:e.clientX,y:e.clientY,drag:false};
      try{q.setPointerCapture?.(e.pointerId);}catch{}
    });
    q.addEventListener('pointermove',e=>{
      const d=this._hotbarPointer;if(!d||e.pointerId!==d.id)return;
      if(!d.drag&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>=5){
        d.drag=true;d.source.classList.add('dragging');
        const r=d.source.getBoundingClientRect(),g=d.source.cloneNode(true);g.classList.remove('dragging','selected','empty-selected');g.classList.add('hotbar-drag-ghost');
        g.style.width=`${r.width}px`;g.style.height=`${r.height}px`;document.body.appendChild(g);this._hotbarGhost=g;
      }
      if(!d.drag)return;e.preventDefault();
      if(this._hotbarGhost)this._hotbarGhost.style.transform=`translate3d(${e.clientX-25}px,${e.clientY-25}px,0) scale(1.06)`;
      clearHover();const target=slotAt(e.clientX,e.clientY);d.target=target&&q.contains(target)?target:null;d.target?.classList.add('drag-over');
    });
    q.addEventListener('pointerup',e=>finishPointer(e,false));
    q.addEventListener('pointercancel',e=>finishPointer(e,true));
    q.addEventListener('lostpointercapture',e=>{if(this._hotbarPointer&&e.pointerId===this._hotbarPointer.id)finishPointer(e,true);});
    this._hotbarKey=e=>{
      if(e.repeat||this.touch()||!document.body.classList.contains('hud-desktop-e'))return;
      const a=document.activeElement;if(a&&(a.isContentEditable||/INPUT|TEXTAREA|SELECT/.test(a.tagName||'')))return;
      if(e.code==='KeyB'){if(this.hotbarEnabled?.()===false)return;e.preventDefault();this.toggleGear();return;}
      let i=-1;if(/^Digit[1-9]$/.test(e.code))i=Number(e.code.slice(5))-1;else if(e.code==='Digit0')i=9;else if(/^Numpad[1-9]$/.test(e.code))i=Number(e.code.slice(6))-1;else if(e.code==='Numpad0')i=9;
      if(i<0||this.hotbarEnabled?.()===false)return;e.preventDefault();this.onHotbarSelect?.(i);
      { const it=(this.hotbarItems?.()||[])[i];if(it&&this.selectedGearId?.()===it.id&&it.id!=='vest')this.showToast(it.name); }   // R156: say what you now hold
    };
    addEventListener('keydown',this._hotbarKey);
    const w=document.createElement('div');w.id='desktop-world-status';w.className='desktop-world-status';
    w.innerHTML='<i aria-hidden="true"></i><span><small>DAY</small><b>THE WILDS</b></span>';
    document.body.appendChild(w);this.worldStatus=w;
    // R147 desktop HUD (Jannik's approved mockup 09/10): quiet key hints bottom left (CSS shows them on desktop HUD E only)
    const kh=document.createElement('div');kh.id='desk-hints';kh.setAttribute('aria-hidden','true');
    kh.innerHTML='<div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move · <kbd>Shift</kbd> Run</div><div><i class="ms r"></i> Look · <i class="ms l"></i> Strike · tools</div><div><kbd>E</kbd> Interact · <kbd>Space</kbd> Hop</div>';
    document.body.appendChild(kh);
    addEventListener('pointerdown',e=>{if(this.gear?.classList.contains('open')&&!this.gear.contains(e.target)&&e.target!==this.bag){this.toggleGear(false);e.tgwClosedGear=true;}});   // R117: InputManager skips the strike for this click
  }
  toggleGear(on=!this.gear?.classList.contains('open')){
    if(!this.gear)return;
    const mobile=this.touch()&&document.body.classList.contains('hud-classic');
    if(on){
      this.renderGear();
      if(mobile){
        // R105: Bag is a dedicated phone inventory screen, not a dropdown.
        Object.assign(this.gear.style,{left:'0',right:'0',top:'0',bottom:'0',transform:'none'});
      }else{
        const desktopE=document.body.classList.contains('hud-desktop-e')&&!this.touch(),r=this.bag?.getBoundingClientRect();
        if(desktopE){this.gear.style.left='50%';this.gear.style.right='auto';this.gear.style.top='50%';this.gear.style.bottom='auto';this.gear.style.transform='translate(-50%,-50%)';}
        else if(r){this.gear.style.right='auto';this.gear.style.bottom='';this.gear.style.transform='';this.gear.style.left=`${Math.round(r.left)}px`;this.gear.style.top=`${Math.round(r.bottom+10)}px`;}
      }
    }
    this.gear.classList.toggle('open',on);this.bag?.classList.toggle('active',on);
    document.body.classList.toggle('mobile-bag-open',!!on&&mobile);
    document.body.classList.toggle('r158a-bag-open',!!on);
    this.onGearOpenChange?.(!!on&&mobile);
    if(on)requestAnimationFrame(()=>this.gear.querySelector('.gear-close')?.focus({preventScroll:true}));
    else this.bag?.focus?.({preventScroll:true});
  }
  // R124 (GO 07/10, phones): the Bag is a grid of tools on the left, a detail card on the right (big art, name, kind,
  // strike, the game's own text, actions) and the 3 quick slots below. Tap = select; Hold / Add to slot / Wear / Light.
  bag2Mode(){return !this.touch()||(this.touch()&&document.body.classList.contains('hud-classic'));} // R158A: desktop inventory is unified in both player and DEV HUD profiles
  toolArt(it){return approvedItemArt(it);}
  renderBag2() {
    const escape = v => String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const gear = this.gearItems?.() || [], held = this.selectedGearId?.() || null;
    const slots=(this.hotbarItems?.()||[]).slice(0,10);
    while(slots.length<10)slots.push(null);
    const inventory=this.state.inventory;
    const materialIds=['wood','stone','clay','fiber','amber','shell','wild_seed'];
    const resources=materialIds.map(id=>({id:'resource:'+id,resourceId:id,name:approvedMaterialText(id),kind:'Material',count:inventory.get(id)||0,desc:id==='wild_seed'?'A seed collected in the wilds.':'A gathered material used by your existing crafting and upgrades.'}));
    const filter=this._bagFilter||'all';
    const items=filter==='resources'?resources:filter==='all'?[...gear,...resources]:gear.filter(x=>filter==='tools'?['Tool','Fishing','Night'].includes(x.kind):filter==='gear'?x.kind==='Wear':filter==='special'?x.kind==='Special Seed':true);
    if(!items.some(x=>x.id===this._bagSel))this._bagSel=items[0]?.id||null;
    const it=items.find(x=>x.id===this._bagSel)||null;
    if(it?.resourceId||it?.bagOnly)this._bagPick=false;
    const pick=!!this._bagPick&&!!it&&!it.resourceId&&!it.bagOnly&&it.id!=='vest';
    const position=id=>slots.findIndex(x=>x?.id===id);
    const resArt=id=>`<img class="gw2-resource-art" alt="" loading="eager" draggable="false" src="./brand/icons/resources/icon-${escape(id==='wild_seed'?'wild-seed':id)}.png">`;
    const art=x=>x?.resourceId?resArt(x.resourceId):this.toolArt(x);
    const tile=x=>{
      const selected=it?.id===x.id,slot=x.resourceId?-1:position(x.id);
      const st=x.id===held?'HELD':x.worn?'WORN':'';
      return `<button type="button" class="bag2-tile gw2-tile${selected?' selected':''}" data-item-id="${escape(x.id)}" aria-label="${escape(x.name)}${st?', '+st.toLowerCase():''}" aria-pressed="${selected}">
        ${st?`<span class="gw2-tile-tag">${st}</span>`:''}${slot>=0?`<span class="gw2-index">${slot===9?'0':slot+1}</span>`:''}
        <span class="gw2-tile-art">${art(x)}</span><span class="gw2-tile-name">${escape(x.name)}</span>
        ${x.resourceId||x.count!=null?`<span class="gw2-amount">${x.count||0}</span>`:''}
      </button>`;
    };
    const resourceTiles=resources.map(x=>`<span class="r158a-material" data-resource="${x.resourceId}" aria-label="${escape(x.name)} ${x.count}">${tile(x)}</span>`).join('');
    const listMarkup=filter==='resources'?`<div class="r158a-resource-grid gw2-resource-grid">${resourceTiles}</div>`:
      items.map(x=>x.resourceId?`<span class="gw2-material-tile" data-resource="${x.resourceId}">${tile(x)}</span>`:tile(x)).join('')+
      (items.length<8?'<span class="gw2-tile-empty" aria-hidden="true"></span>'.repeat(8-items.length):'');
    const status=it=>{
      if(it.resourceId)return`<span class="gw2-pill">Owned · ${it.count}</span>`;
      const states=['<span class="gw2-pill">Owned</span>'];
      if(it.id===held)states.push('<span class="gw2-pill active">Held</span>');
      if(it.worn)states.push('<span class="gw2-pill active">Worn</span>');
      const q=position(it.id);
      if(q>=0)states.push(`<span class="gw2-pill">Slot ${q===9?'0':q+1}</span>`);
      return states.join('');
    };
    let actions='',message='';
    if(it?.resourceId){message=`<p class="gw2-resource-total">In your Bag <strong>${it.count}</strong></p>`;}
    else if(it?.bagOnly){message='<p class="gw2-note">Plant at Sprouting Ring in your garden.</p>';}
    else if(it?.id==='vest'){
      actions=`<button type="button" class="gw2-action main" data-act="wear">${it.worn?'Take Off':'Wear Life Vest'}</button>`;
      message='<p class="gw2-note">Must remain worn while on the water.</p>';
    }else if(it?.id==='lantern'){
      const night=document.body.classList.contains('lantern-ready');
      actions=`<button type="button" class="gw2-action main" data-act="light"${night?'':' disabled'}>${night?(document.body.classList.contains('lantern-lit')?'Put Away':'Light Lantern'):'Night Only'}</button>`;
      actions+='<button type="button" class="gw2-action alt" data-act="slot">Assign / Move Slot</button>';
    }else if(it){
      if(position(it.id)>=0)actions=`<button type="button" class="gw2-action main" data-act="hold">${it.id===held?'Put Away':'Hold'}</button>`;
      actions+=`<button type="button" class="gw2-action ${actions?'alt':'main'}" data-act="slot">${position(it.id)>=0?'Move Slot':'Assign Slot'}</button>`;
    }
    if(pick){
      actions='<button type="button" class="gw2-action alt" data-act="cancel-slot">Cancel</button>';
      message=`<p class="gw2-choose" role="status">Choose a quick slot for ${escape(it.name)} below.</p>`;
    }
    const detail=it?`<div class="gw2-hero"><div class="gw2-hero-art">${art(it)}</div></div>
        <div class="gw2-info"><span class="gw2-eyebrow">${it.resourceId?'MATERIAL':it.kind||'ITEM'}</span>
          <h3>${escape(it.name)}</h3><div class="gw2-states">${status(it)}</div>
          <p class="gw2-description">${escape(it.desc||'Carried in your Bag.')}</p>
          ${message}${actions?`<div class="gw2-actions">${actions}</div>`:''}
        </div>`:'<p class="gw2-blank">No items in this category yet.</p>';
    const tabs=[['all','All'],['tools','Tools'],['gear','Wear'],['special','Special'],['resources','Resources']].map(([k,label])=>
      `<button type="button" data-bag-filter="${k}" aria-pressed="${k===filter}">${label}</button>`).join('');
    const allSlots=slots.map((item,i)=>`<button type="button" class="bag2-slot gw2-slot${item?.id===held?' on':''}${pick?' target':''}" data-q="${i}" aria-pressed="${!!item&&item.id===held}" aria-label="Slot ${i===9?'0':i+1}${item?': '+escape(item.name):': empty'}"><small>${i===9?'0':i+1}</small>
      ${item?art(item):'<span class="gw2-plus" aria-hidden="true">+</span>'}</button>`).join('');
    const previous=this.gear?.querySelector?.('.gw2-tiles'),scroll=(this._gw2LastFilter===filter?previous?.scrollTop:0)||0;
    this._gw2LastFilter=filter;
    this.gear.innerHTML=`<div class="bag2 r158a-bag gw2-bag">
      <header class="bag2-head gw2-head">
        <div class="gw2-brand"><img src="./brand/icons/64/icon-bag.png" alt="" draggable="false"><div><h2>Bag</h2><small>INVENTORY &amp; EQUIPMENT</small></div></div>
        <nav class="r158a-bag-filters gw2-filters" aria-label="Inventory filters">${tabs}</nav>
        <button type="button" class="gear-close gw2-close" aria-label="Close Bag">×</button>
      </header>
      <main class="gw2-body">
        <section class="gw2-inventory" aria-label="Carried items and materials">
          <div class="gw2-inventory-label"><strong>${filter==='resources'?'Materials':'Your collection'}</strong><span>${items.length} items</span></div>
          <div class="bag2-grid gw2-tiles">${listMarkup||'<p class="gw2-blank">No items collected yet.</p>'}</div>
        </section>
        <section class="bag2-detail gw2-detail" aria-label="Selected item">${detail}</section>
      </main>
      <footer class="bag2-slots gw2-footer">
        <div class="gw2-footer-title"><b>Quick Slots</b><small>${pick?'Choose a slot':'Saved automatically'}</small></div>
        <div class="gw2-hotbar">${allSlots}</div>
      </footer>
    </div>`;
    const scroller=this.gear?.querySelector?.('.gw2-tiles');
    if(scroller)scroller.scrollTop=scroll;
  }
  bag2Click(e){
    const t=e.target.closest?.('[data-item-id],[data-bag-filter],[data-act],[data-q]');if(!t)return;
    if(t.dataset.bagFilter){this._bagFilter=t.dataset.bagFilter;this._bagPick=false;this.renderBag2();return;}
    if(t.classList.contains('bag2-tile')){this._bagSel=t.dataset.itemId;this._bagPick=false;}
    else if(t.dataset.q!=null){const q=+t.dataset.q;if(this._bagPick&&this._bagSel){this.onBagPlace?.(this._bagSel,q);this._bagPick=false;}else this.onHotbarSelect?.(q);}
    else if(t.dataset.act==='hold'){if(this.selectedGearId?.()===this._bagSel)this.onGearPutAway?.();else this.onGearEquip?.(this._bagSel);}
    else if(t.dataset.act==='slot'){this._bagPick=true;}
    else if(t.dataset.act==='cancel-slot'){this._bagPick=false;}
    else if(t.dataset.act==='wear'){this.onVestToggle?.();}
    else if(t.dataset.act==='light'){this.onLanternToggle?.();this.toggleGear(false);return;}
    this.renderBag2();this.renderDesktopHotbar();
  }
  renderGear(){
    if(!this.gear)return;if(this.bag2Mode())return this.renderBag2();const items=this.gearItems?.()||[],selected=this.selectedGearId?.()||null,toolArt=new Set(['axe','pickaxe','sickle','watering-can','rod','lantern']);
    const rows=items.length?items.map(it=>{
      const key=it.hotbarIcon||(it.name==='Watering Can'?'watering-can':(it.icon||it.id||'')),art=toolArt.has(key)
        ?`<i class="gear-item-art" style="--gear-art:url(./brand/icons/tool3d/icon-${key}.png?v=R105-20261006)"></i>`
        :(it.icon?`<i class="ico-mask" style="--ico:url(./brand/icons/svg/icon-${it.icon}.svg)"></i>`:`<i class="gear-item-fallback">${it.name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}</i>`);
      const wear=it.id==='vest',equip=it.id&&!wear&&!it.bagOnly,on=selected===it.id||(wear&&it.worn),n=wear?(it.worn?'Worn · click to take off':'Click to wear'):it.bagOnly?'Plant at the Sprouting Ring':it.n;
      return `<span class="gear-item${on?' selected':''}${equip||wear?' equippable':''}" data-item-id="${it.id||''}" data-equip="${equip?'1':'0'}"${wear?' data-wear="1"':''}${equip||wear?' tabindex="0"':''} role="${equip||wear?'button':'listitem'}" aria-pressed="${equip||wear?(on?'true':'false'):'false'}">${art}<span class="gear-item-copy"><em>${it.name}</em>${n!=null?`<small>${n}</small>`:''}</span></span>`;
    }).join(''):'<span class="gear-empty">Nothing yet. Craft tools at your workbench.</span>';
    this.gear.innerHTML=`<div class="gear-head"><div><b class="gear-title">Bag</b><small class="gear-subtitle">Carried gear</small></div><button class="gear-close" type="button" aria-label="Close Bag">×</button></div><div class="gear-section-title">Inventory</div><div class="gear-grid">${rows}</div><div class="gear-hotbar-label"><b>Quick slots</b><span>Tap to equip · hold + drag to move</span></div>`;
    this.renderDesktopHotbar();
  }
  renderDesktopHotbar(){
    if(!this.desktopHotbar)return;
    const items=this.hotbarItems?.()||this.gearItems?.()||[],selected=Number.isInteger(this.hotbarSelected?.())?this.hotbarSelected():-1,slots=[...this.desktopHotbar.querySelectorAll('.desktop-hotbar-slot')];
    slots.forEach((slot,i)=>{
      const it=items[i]||null,icon=slot.querySelector('.slot-icon'),fallback=slot.querySelector('.slot-fallback'),key=it?.hotbarIcon||(it?.name==='Watering Can'?'watering-can':(it?.icon||it?.id||''));
      slot.classList.toggle('filled',!!it);slot.classList.toggle('selected',selected===i);slot.classList.toggle('empty-selected',selected===i&&!it);
      slot.draggable=false;slot.dataset.icon=key;slot.dataset.itemId=it?.id||'';slot.title=it?`${i===9?'0':i+1} · ${it.name} · drag to move`:`${i===9?'0':i+1} · Empty slot`;
      slot.setAttribute('aria-label',it?`Slot ${i===9?'0':i+1}: ${it.name}`:`Slot ${i===9?'0':i+1}: empty`);slot.setAttribute('aria-pressed',selected===i?'true':'false');
      icon.style.setProperty('--slot-ico',it?.icon?`url(./brand/icons/svg/icon-${it.icon}.svg)`:'none');fallback.textContent=it&&!it.icon?it.name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase():'';
    });
  }
  setWorldStatus(garden=false,night=false){
    if(!this.worldStatus)return;const key=`${garden?'garden':'world'}:${night?'night':'day'}`;if(this._worldStatusKey===key)return;this._worldStatusKey=key;
    this.worldStatus.classList.toggle('night',!!night);this.worldStatus.querySelector('small').textContent=night?'NIGHT':'DAY';
    this.worldStatus.querySelector('b').textContent=garden?'HOME GARDEN':'THE WILDS';
  }
  peek(el,ms){if(!el||el.classList.contains('pinned'))return;el.classList.add('open');clearTimeout(this._peekT?.get(el));this._peekT?.set(el,setTimeout(()=>el.classList.remove('open'),ms));}
  setMaterial(id,value){const el=document.getElementById(`${id}-count`);if(el){el.textContent=String(value);el.closest('.material-chip')?.classList.toggle('zero',!value);}}
  setObjective(kicker,goal){
    if(!goal||(this._goalTitle===goal.title&&this.kicker.textContent===kicker))return;
    this._goalTitle=goal.title;this.objective.classList.remove('complete');
    this.kicker.textContent=kicker;this.title.textContent=goal.title;this.copy.textContent=goal.copy;this.setObjectiveIcon(goal.title);
  }
  setTools(tools,water){
    if(this.gear?.classList.contains('open'))this.renderGear();this.renderDesktopHotbar?.();
    const row=document.getElementById('tools-row');if(!row)return;
    for(const el of row.querySelectorAll('[data-tool]'))el.classList.toggle('owned',!!tools[el.dataset.tool]);
    const w=document.getElementById('tool-water');if(w)w.textContent=tools.can?String(water):'';
    if(Object.values(tools).some(Boolean))this.materials.classList.add('show');
  }
  // R75 HUD rule (phones): the main button is always there; with nothing in reach it is Strike (icon only).
  setActionVisible(v,label='Collect',it=null,persistent=false){
    const classic=document.body.classList.contains('hud-classic'),classicTouch=classic&&this.touch(),desktopE=document.body.classList.contains('hud-desktop-e')&&!this.touch();
    if(desktopE&&it?.type==='combat-strike')v=false; // R89: desktop strike is mouse-driven; E remains interaction-only
    const keep=persistent,fallback=keep&&!v;
    const actionLabel=document.getElementById('action-label');
    actionLabel.textContent=classicTouch?'':fallback?(classic?'Swing':''):(classic&&it?.type==='combat-strike'?'Swing':label);
    this.action.setAttribute('aria-label',fallback?'Strike':label);
    this.action.classList.toggle('show',!!v||keep);this.action.classList.toggle('strike-idle',fallback);
    let visualIt=fallback?(classicTouch?{type:'mobile-default-strike'}:{type:'combat-strike'}):it;
    if(classicTouch&&it?.type==='combat-strike')visualIt={...it,type:'mobile-combat-strike',label};
    // R142: desktop shows a left-click mouse instead of 'E' for tool work
    const key=this.action.querySelector('.key');if(key){const mouse=!this.touch()&&isToolJob(it);if(key._mouse!==mouse){key._mouse=mouse;key.classList.toggle('mouse',mouse);key.innerHTML=mouse?'<i class="kh-mouse left" aria-label="Left click"></i>':'E';}}
    const ico=document.getElementById('action-ico');
    if(ico&&(v||keep)){const n=actionIconName(visualIt);if(n!==this._icoName){this._icoName=n;ico.innerHTML=actionIcon(visualIt);this.action.dataset.icon=n;}}
  }
  // R116: toasts queue (max 3) instead of overwriting each other; the same text again just stays up longer.
  // R153: milestone toasts (seed earned, planted, tree grows, golden plant) go first, are never dropped, show in gold;
  // every toast stays up longer the longer it is (2.2 to 6 s).
  showToast(text,opts={}){
    if(text&&typeof text==='object'){opts=text;text=text.text;}
    const q=this._toastQ||(this._toastQ=[]),ms=!!opts.milestone;
    if(this.toast.classList.contains('show')&&text!==this.toast.textContent){
      if(ms){if(!q.some(x=>(x?.text||x)===text))q.unshift({text,milestone:true});}else if(q.length<3&&!q.includes(text))q.push(text);
      return;}
    this.toast.textContent=text;this.toast.classList.toggle('milestone',ms);this.toast.classList.add('show');clearTimeout(this.toastTimer);
    const dur=Math.max(2200,Math.min(6000,1800+40*String(text).length));
    this.toastTimer=setTimeout(()=>{this.toast.classList.remove('show');if(q.length)this.toastTimer=setTimeout(()=>this.showToast(q.shift()),450);},dur);
  }
  markMoved(){this.hint.style.opacity='0';}
  ready(){this.renderDesktopHotbar?.();requestAnimationFrame(()=>{this.anchorMobileTop?.(true);this.loading.classList.add('hide');setTimeout(()=>this.loading.remove(),1000);});}
}
