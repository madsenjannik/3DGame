// @ts-nocheck
export class Hud {
  constructor(state){
    this.seed=document.getElementById('seed-count');this.action=document.getElementById('action');this.toast=document.getElementById('toast');this.objective=document.getElementById('objective');this.kicker=document.getElementById('objective-kicker');this.title=document.getElementById('objective-title');this.copy=document.getElementById('objective-copy');this.hint=document.getElementById('hint');this.loading=document.getElementById('loading');this.materials=document.getElementById('materials');
    this.materialIds=['wood','stone','clay','fiber','amber','shell','wild_seed'];
    this.buildQuick(state);
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
  // R66 minimal phone HUD (CSS applies it on .touch only; desktop keeps the full HUD). Always on screen: the minimap
  // plus two small buttons under it. Bag = materials, tools and Golden Seeds; the goal button shows the objective.
  // A changed material peeks for 2.5 s ("▰ Wood +2"), a new objective peeks for 5 s.
  buildQuick(state){
    const q=document.createElement('div');q.id='hud-quick';
    // R68: the game's own clay icons (brand/icons) instead of glyphs.
    q.innerHTML='<button type="button" id="hud-goal" aria-label="Objective"><img src="./brand/icons/64/icon-leaf.png" alt=""></button><button type="button" id="hud-bag" aria-label="Bag"><img src="./brand/icons/64/icon-bag.png" alt=""></button>';
    const peek=document.createElement('div');peek.id='hud-peek';
    document.body.append(q,peek);this.peekEl=peek;
    const tap=(el,fn)=>el.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();fn();});
    tap(q.querySelector('#hud-bag'),()=>this.toggleBag());
    tap(q.querySelector('#hud-goal'),()=>this.showGoal(!document.body.classList.contains('goal-peek'),6000));
    const names={wood:'Wood',stone:'Stone',clay:'Clay',fiber:'Fiber',amber:'Amber',shell:'Snail Shell',wild_seed:'Wild Seed',golden_seed:'Golden Seed',rare_seed:'Golden Seed'};
    const icons={wood:'▰',stone:'◆',clay:'●',fiber:'≋',amber:'⬣',shell:'◎',wild_seed:'❀',golden_seed:'✦',rare_seed:'✦'};
    this._last={};for(const id of Object.keys(names))this._last[id]=state.inventory.get(id)||0;
    state.events.on('inventory:changed',e=>{if(!(e.id in names))return;const d=(e.amount||0)-(this._last[e.id]||0);this._last[e.id]=e.amount||0;if(d>0)this.peek(`${icons[e.id]} ${names[e.id]} +${d}`);});
  }
  peek(text){const p=this.peekEl;if(!p)return;p.textContent=text;p.classList.add('show');clearTimeout(this._peekT);this._peekT=setTimeout(()=>p.classList.remove('show'),2500);}
  toggleBag(on=!document.body.classList.contains('hud-bag-open')){document.body.classList.toggle('hud-bag-open',on);if(on)this.showGoal(false);clearTimeout(this._bagT);if(on)this._bagT=setTimeout(()=>this.toggleBag(false),8000);}
  showGoal(on,ms=5000){document.body.classList.toggle('goal-peek',on);clearTimeout(this._goalT);if(on){document.getElementById('hud-goal')?.classList.remove('new');document.body.classList.remove('hud-bag-open');this._goalT=setTimeout(()=>this.showGoal(false),ms);}}
  setMaterial(id,value){const el=document.getElementById(`${id}-count`);if(el)el.textContent=String(value);}
  setObjective(kicker,goal){
    if(!goal||(this._goalTitle===goal.title&&this.kicker.textContent===kicker))return;
    this._goalTitle=goal.title;this.objective.classList.remove('complete');
    this.kicker.textContent=kicker;this.title.textContent=goal.title;this.copy.textContent=goal.copy;
    document.getElementById('hud-goal')?.classList.add('new');this.showGoal(true,5000);   // R66: a new step peeks on phones
  }
  setTools(tools,water){
    const row=document.getElementById('tools-row');if(!row)return;
    for(const el of row.querySelectorAll('[data-tool]'))el.classList.toggle('owned',!!tools[el.dataset.tool]);
    const w=document.getElementById('tool-water');if(w)w.textContent=tools.can?String(water):'';
    if(Object.values(tools).some(Boolean))this.materials.classList.add('show');
  }
  setActionVisible(v,label='Collect'){document.getElementById('action-label').textContent=label;this.action.classList.toggle('show',!!v);}
  showToast(text){this.toast.textContent=text;this.toast.classList.add('show');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>this.toast.classList.remove('show'),2200);}
  markMoved(){this.hint.style.opacity='0';}
  ready(){requestAnimationFrame(()=>{this.loading.classList.add('hide');setTimeout(()=>this.loading.remove(),1000);});}
}
