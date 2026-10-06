// @ts-nocheck
import { actionIcon, actionIconName } from './actionIcons.js?build=MOBILE-HUD-R83-20261005A';
export class Hud {
  constructor(state){
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
    state.events.on('greenhouse:level-changed',e=>{this.showToast(e.level===1?'Drivhus bygget':'Drivhus opgraderet');});
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
    bag.addEventListener('click',e=>{e.stopPropagation();this.toggleGear();});
    // R74 Test HUD B: the quest is a one-line chip; tap shows the text, the cross hides it to a round button, tap brings it back.
    const x=document.createElement('i');x.className='obj-x';x.setAttribute('role','button');x.setAttribute('aria-label','Hide quest');x.textContent='×';this.objective.appendChild(x);
    const hudB=()=>document.body.classList.contains('hud-test-b');
    x.addEventListener('click',e=>{if(!hudB())return;e.stopPropagation();const o=this.objective;o.classList.add('b-hidden');o.classList.remove('open','pinned');clearTimeout(this._peekT.get(o));});
    const classic=()=>document.body.classList.contains('hud-classic')||(document.body.classList.contains('hud-desktop-e')&&!this.touch());
    this.objective.addEventListener('click',e=>{if(!this.touch()&&!classic())return;e.stopPropagation();if(hudB()&&this.objective.classList.contains('b-hidden')){this.objective.classList.remove('b-hidden','fresh');return;}pin(this.objective);});
    const title=document.getElementById('objective-title');
    if(title)new MutationObserver(()=>{this.setObjectiveIcon(title.textContent);if(this.touch()){this.objective.classList.add('fresh');this.peek(this.objective,5000);}}).observe(title,{childList:true,characterData:true,subtree:true});
  }
  // R84 bag: a small panel under the bag button listing what you carry. gearItems() is set by Game.
  buildGear(){
    const p=document.createElement('div');p.id='gear-panel';p.className='gear-panel';p.setAttribute('aria-label','Bag');document.body.appendChild(p);this.gear=p;
    p.addEventListener('click',e=>e.stopPropagation());
    const q=document.createElement('div');q.id='desktop-hotbar-e';q.className='desktop-hotbar-e';q.setAttribute('aria-label','Quick slots');
    q.innerHTML=Array.from({length:10},(_,i)=>`<span class="desktop-hotbar-slot" data-slot="${i}"><small>${i===9?'0':i+1}</small><i class="slot-icon"></i><em class="slot-fallback"></em></span>`).join('');
    document.body.appendChild(q);this.desktopHotbar=q;
    addEventListener('pointerdown',e=>{if(this.gear?.classList.contains('open')&&!this.gear.contains(e.target)&&e.target!==this.bag)this.toggleGear(false);});
  }
  toggleGear(on=!this.gear?.classList.contains('open')){
    if(!this.gear)return;
    if(on){
      this.renderGear();
      const desktopE=document.body.classList.contains('hud-desktop-e')&&!this.touch(),r=this.bag?.getBoundingClientRect();
      if(desktopE){this.gear.style.left='50%';this.gear.style.top='auto';this.gear.style.bottom='92px';this.gear.style.transform='translateX(-50%)';}
      else if(r){this.gear.style.bottom='';this.gear.style.transform='';this.gear.style.left=`${Math.round(r.left)}px`;this.gear.style.top=`${Math.round(r.bottom+10)}px`;}
    }
    this.gear.classList.toggle('open',on);this.bag?.classList.toggle('active',on);
  }
  renderGear(){
    if(!this.gear)return;const items=this.gearItems?.()||[];
    this.gear.innerHTML='<b class="gear-title">Bag</b>'+(items.length?items.map(it=>`<span class="gear-item">${it.icon?`<i class="ico-mask" style="--ico:url(./brand/icons/svg/icon-${it.icon}.svg)"></i>`:''}<em>${it.name}</em>${it.n!=null?`<small>${it.n}</small>`:''}</span>`).join(''):'<span class="gear-empty">Nothing yet. Craft tools at your workbench.</span>');
  }
  peek(el,ms){if(!el||el.classList.contains('pinned'))return;el.classList.add('open');clearTimeout(this._peekT?.get(el));this._peekT?.set(el,setTimeout(()=>el.classList.remove('open'),ms));}
  setMaterial(id,value){const el=document.getElementById(`${id}-count`);if(el){el.textContent=String(value);el.closest('.material-chip')?.classList.toggle('zero',!value);}}
  setObjective(kicker,goal){
    if(!goal||(this._goalTitle===goal.title&&this.kicker.textContent===kicker))return;
    this._goalTitle=goal.title;this.objective.classList.remove('complete');
    this.kicker.textContent=kicker;this.title.textContent=goal.title;this.copy.textContent=goal.copy;this.setObjectiveIcon(goal.title);
  }
  setTools(tools,water){
    if(this.gear?.classList.contains('open'))this.renderGear();
    const row=document.getElementById('tools-row');if(!row)return;
    for(const el of row.querySelectorAll('[data-tool]'))el.classList.toggle('owned',!!tools[el.dataset.tool]);
    const w=document.getElementById('tool-water');if(w)w.textContent=tools.can?String(water):'';
    if(Object.values(tools).some(Boolean))this.materials.classList.add('show');
  }
  // R75 HUD rule (phones): the main button is always there; with nothing in reach it is Strike (icon only).
  setActionVisible(v,label='Collect',it=null,persistent=false){
    const hudTest=document.body.classList.contains('hud-test-v1'),classic=document.body.classList.contains('hud-classic'),classicTouch=classic&&this.touch(),keep=hudTest||persistent,fallback=keep&&!v;
    const actionLabel=document.getElementById('action-label');
    actionLabel.textContent=classicTouch?'':fallback?(classic?'Swing':hudTest?'Strike':''):(classic&&it?.type==='combat-strike'?'Swing':label);
    this.action.setAttribute('aria-label',fallback?'Strike':label);
    this.action.classList.toggle('show',!!v||keep);this.action.classList.toggle('strike-idle',fallback);
    let visualIt=fallback?(classicTouch?{type:'mobile-default-strike'}:{type:'combat-strike'}):it;
    if(classicTouch&&it?.type==='combat-strike')visualIt={...it,type:'mobile-combat-strike',label};
    const ico=document.getElementById('action-ico');
    if(ico&&(v||keep)){const n=actionIconName(visualIt);if(n!==this._icoName){this._icoName=n;ico.innerHTML=actionIcon(visualIt);this.action.dataset.icon=n;}}
  }
  showToast(text){this.toast.textContent=text;this.toast.classList.add('show');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>this.toast.classList.remove('show'),2200);}
  markMoved(){this.hint.style.opacity='0';}
  ready(){requestAnimationFrame(()=>{this.loading.classList.add('hide');setTimeout(()=>this.loading.remove(),1000);});}
}
