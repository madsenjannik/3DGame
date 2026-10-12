// R157A regression checks. Run standalone: node tests/r157a-save.mjs
// Also imported by tests/smoke.mjs. Test the source modules with mocked browser APIs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const clean = source => source.replace(/^import[^\n]*\n/gm, '').replace(/\bexport (?=(class|const|function))/g, '');
const load = (file, deps, names) => {
  const code = clean(fs.readFileSync(path.join(ROOT,file), 'utf8'));
  return new Function(...Object.keys(deps), code + '\nreturn {' + names.join(',') + '};')(...Object.values(deps));
};
const { DAILY, BOAT, MATERIALS } = load('js/data/wildsCatalog.js', {}, ['DAILY','BOAT','MATERIALS']);
const { DailyRequests } = load('js/gameplay/DailyRequests.js', { DAILY, MATERIALS }, ['DailyRequests']);

// A single daily task set shared by every character.
const d = { date:'',selection:[],done:{},progress:{},streak:0,lastDate:'' };
const w = { profile:{daily:d},state:{player:{characterId:'daisy'}},save:{persist(){}},emit(){},give(){} };
const first = new DailyRequests(w).tasks().map(t=>t.id);
w.state.player.characterId='cactus';
assert.deepEqual(new DailyRequests(w).tasks().map(t=>t.id),first,'switching character must not reroll tasks');
assert.equal(new Set(first).size, DAILY.count);
// Existing R156 saves do not record the task selection; keep actual progress, not just the new character's roll.
const prior = { date:d.date,done:{wood:true},progress:{fiber:2},streak:2,lastDate:'' };
const legacy = new DailyRequests({...w,profile:{daily:prior}});
assert(legacy.tasks().some(t=>t.id==='wood')&&legacy.tasks().some(t=>t.id==='fiber'),'same-day progress retained');
assert.equal(prior.streak,2);

// Save v4 must retain both new fields, and a read-only tab cannot overwrite existing progress.
const mem = new Map(), localStorage = {
  getItem:k=>mem.get(k)??null, setItem:(k,v)=>mem.set(k,String(v)), removeItem:k=>mem.delete(k)
};
const { SaveGame } = load('js/core/SaveGame.js', {
  localStorage, navigator:{storage:{persist:()=>Promise.resolve(false)}},
  document:{addEventListener(){}}, addEventListener(){},
  globalThis:{TGW_VERSION:{build:'SAVE-R157A-20261011A'}}
}, ['SaveGame']);
let save = new SaveGame({characterId:'daisy'});
save.profile.daily.selection=first;save.profile.boat.rented=true;save.flush();
save = new SaveGame({characterId:'cactus'});
assert.deepEqual(save.profile.daily.selection,first);
assert.equal(save.profile.boat.rented,true,'rental persists after reload');
const snapshot=mem.get('tgw.save');
save.readOnly=true;save.profile.inventory.wood=123;save.flush();
assert.equal(mem.get('tgw.save'),snapshot,'losing tab cannot write');
assert.throws(()=>save.importJSON(snapshot),/another game tab/i);

// Paying Sigurd rents exactly one trip; it survives restart and expires when docking.
const { BoatEconomySystem } = load('js/gameplay/BoatEconomySystem.js', {BOAT,MATERIALS}, ['BoatEconomySystem']);
const cash=new Map([['wood',100],['fiber',100],['amber',100],['clay',100]]);
const p={boat:{owned:false,rented:false,trips:0,waterfall:0,lastReward:''},fishing:{starter:true,own:{vest:1},log:{}}};
const wilds={profile:p,save:{persist(){}},inv:()=>cash,pay(cost){
  if(Object.entries(cost).some(([k,n])=>(cash.get(k)||0)<n))return false;
  for(const[k,n]of Object.entries(cost))cash.set(k,cash.get(k)-n);return true;
},give(){}};
const makeFish=()=>({starter:true,mode:'greet',own:{vest:1},log:{},
  boat:{rented:false,owned:false,on:false,reachedWaterfall:false},
  dialogOptions(){return [['boat','Boat']]},choose(){},speciesN(){return 3},
  setBoatAccess(v){Object.assign(this.boat,v)},renderAll(){},renderDialog(){},say(){},markSigurdNod(){}
});
let fish=makeFish(),boat=new BoatEconomySystem({fishing:fish,wilds,hud:{showToast(){}}}).init();
const woodBefore=cash.get('wood');
boat.choose('rent');assert.equal(p.boat.rented,true);assert.equal(cash.get('wood'),woodBefore-BOAT.rentCost.wood);
fish=makeFish();boat=new BoatEconomySystem({fishing:fish,wilds,hud:{showToast(){}}}).init();
assert.equal(fish.boat.rented,true,'paid trip rehydrated');
fish.boat.on=true;boat.update();fish.boat.on=false;fish.boat.rented=false;boat.update();
assert.equal(p.boat.rented,false,'docking consumes rental');assert.equal(p.boat.trips,1);
// Immediate docking must clear the paid trip even if a pagehide occurs before the next update.
p.boat.rented=true;
const directDock=makeFish();directDock.boat.rented=true;directDock.boat.on=true;
directDock.dockNow=function(){this.boat.on=false;this.boat.rented=false;};
const dockEconomy=new BoatEconomySystem({fishing:directDock,wilds,hud:{showToast(){}}}).init();
directDock.dockNow();assert.equal(p.boat.rented,false,'rental clears synchronously at dock');

// Browser-like two-tab test: owner flushes before handoff, then cannot write shared/Stable/Greenhouse saves.
const shared=new Map(), tabs=[], channels=[];
class Channel {
  constructor(){channels.push(this)}
  addEventListener(_type,cb){this.callback=cb}
  postMessage(data){for(const c of channels)if(c!==this&&!c.closed)c.callback?.({data})}
  close(){this.closed=true}
}
function tab(){
  const obj={handlers:{storage:[],pagehide:[]},reloads:0},session=new Map(),elements=new Map();
  const db={getItem:k=>shared.get(k)??null,setItem:(k,v)=>{
    shared.set(k,String(v));
    for(const t of tabs)if(t!==obj)for(const cb of t.handlers.storage)cb({key:k,newValue:String(v)});
  },removeItem:k=>{shared.delete(k);for(const t of tabs)if(t!==obj)for(const cb of t.handlers.storage)cb({key:k,newValue:null})}};
  const sessionStorage={getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,String(v)),removeItem:k=>session.delete(k)};
  const document={getElementById:k=>elements.get(k)||null,createElement:()=>({addEventListener(){},querySelector(){return null}}),
    body:{appendChild(el){elements.set(el.id,el)}}};
  const factory=new Function('localStorage','sessionStorage','document','BroadcastChannel','addEventListener','location','setInterval','clearInterval','setTimeout',
    clean(fs.readFileSync(path.join(ROOT,'js/core/TabGuard.js'),'utf8'))+'\nreturn installTabGuard;');
  const create=factory(db,sessionStorage,document,Channel,(type,cb)=>obj.handlers[type]?.push(cb),
    {reload(){obj.reloads++}},()=>1,()=>{},()=>{});
  obj.game={save:{readOnly:false,flushed:0,flush(){this.flushed++}}};
  tabs.push(obj);obj.guard=create(obj.game);return obj;
}
const a=tab(),b=tab();
assert(a.guard.canWrite()&&!b.guard.canWrite(),'first tab owns');
let sidecarWrites=0;const stable={save(){sidecarWrites++}},greenhouse={persist(){sidecarWrites++}};
a.guard.guardSaveMethod(stable,'save');a.guard.guardSaveMethod(greenhouse,'persist');
stable.save();greenhouse.persist();assert.equal(sidecarWrites,2);
b.guard.requestTakeover();
assert.equal(a.game.save.flushed,1,'owner flushes before acknowledging takeover');
assert.equal(b.reloads,1,'new tab reloads after flush and acknowledgement');
assert(!a.guard.canWrite(),'previous tab cannot continue writing');
stable.save();greenhouse.persist();assert.equal(sidecarWrites,2,'sidecar saves blocked in previous tab');
// A blocked tab must reserve ownership and reload WITHOUT flushing its stale in-memory snapshot.
const c=tab();shared.delete('tgw.activeTab');c.guard.requestTakeover();
assert.equal(c.reloads,1,'orphaned ownership can be recovered by fresh reload');
assert.equal(c.game.save.flushed,0,'stale profile is not saved before fresh reload');
assert(!c.guard.canWrite(),'recovery never makes stale in-memory game writable');
console.log('PASS  R157A: shared daily tasks, legacy progress, save roundtrip, rental/dock, two-tab handoff and sidecar guards');
