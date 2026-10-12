// R157C: delayed real-world BroadcastChannel/storage handoff regression.
// Simulates browser event-loop lag: request arrives after 3.1 s, ACK after another
// 1.35 s. The old 2 s timeout stranded the waiting tab. Never enable both writers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const source=fs.readFileSync(path.join(ROOT,'js/core/TabGuard.js'),'utf8').replace(/^export /gm,'');

let now=10000;
const timers=[],schedule=(fn,ms=0)=>{timers.push({at:now+ms,fn});return timers.length};
const advance=target=>{
  let n=0;
  while(true){
    timers.sort((a,b)=>a.at-b.at);
    if(!timers.length||timers[0].at>target)break;
    if(++n>1000)throw Error('runaway timers');
    const t=timers.shift();now=t.at;t.fn();
  }
  now=target;
};
const shared=new Map(),tabs=[],channels=[];
let requestDelay=3100,ackDelay=1350;
class Channel{
  constructor(){this.closed=false;channels.push(this);}
  addEventListener(_,cb){this.handler=cb;}
  postMessage(data){for(const peer of channels)if(peer!==this&&!peer.closed)
    schedule(()=>peer.handler?.({data}),data?.request?requestDelay:ackDelay);
  }
  close(){this.closed=true;}
}
const date={now:()=>now};
function tab(){
  const obj={handlers:{storage:[],pagehide:[]},reloads:0};
  const session=new Map(),elements=new Map();
  const deliver=(key,value)=>{
    const delay=key==='tgw.tabHandoff'?requestDelay:
      key==='tgw.tabHandoffAck'||key==='tgw.activeTab'?ackDelay:0;
    for(const other of tabs)if(other!==obj)for(const fn of other.handlers.storage)
      schedule(()=>fn({key,newValue:value}),delay);
  };
  const localStorage={
    getItem:k=>shared.get(k)??null,
    setItem(k,value){shared.set(k,String(value));deliver(k,String(value));},
    removeItem(k){shared.delete(k);deliver(k,null);}
  };
  const sessionStorage={
    getItem:k=>session.get(k)??null,
    setItem:(k,v)=>session.set(k,String(v)),
    removeItem:k=>session.delete(k)
  };
  const document={
    getElementById:k=>elements.get(k)||null,
    createElement:()=>({listeners:{},addEventListener(k,fn){this.listeners[k]=fn;},querySelector(){return null;}}),
    body:{appendChild(el){elements.set(el.id,el);}}
  };
  const create=new Function('localStorage','sessionStorage','document',
    'BroadcastChannel','addEventListener','location','setInterval','clearInterval',
    'setTimeout','Date',source+'\nreturn installTabGuard;')(
    localStorage,sessionStorage,document,Channel,
    (type,cb)=>obj.handlers[type]?.push(cb),
    {reload(){obj.reloads++;}},
    ()=>1,()=>{},schedule,date
  );
  obj.game={save:{readOnly:false,flushed:0,flush(){this.flushed++;}}};
  tabs.push(obj);obj.guard=create(obj.game);return obj;
}
const owner=tab(),waiter=tab();
assert(owner.guard.canWrite()&&!waiter.guard.canWrite(),'only first tab may write');
assert(waiter.game.save.readOnly,'waiting tab remains read-only');
waiter.guard.requestTakeover();
advance(12500); // old 2-second handler would have abandoned the pending ACK
assert.equal(waiter.reloads,0,'delayed request must not cause premature reload');
assert(owner.guard.canWrite(),'owner must remain writer until it flushes/relinquishes');
advance(16500); // request delivered and ACK delivered >4.45 sec after click
assert.equal(owner.game.save.flushed,1,'original owner flushes before handoff');
assert(!owner.guard.canWrite()&&owner.game.save.readOnly,'old owner loses write permission');
assert.equal(waiter.reloads,1,'waiting tab reloads on matching delayed acknowledgement');
assert(!waiter.guard.canWrite(),'new tab may not write until fresh reload/rehydration');
assert.equal(JSON.parse(shared.get('tgw.activeTab')).id,waiter.guard.id,'lease assigned only to new tab');
advance(35000); // late timeout must not undo completed handoff
assert.equal(waiter.reloads,1,'completed handoff must not trigger a second reload');
assert(!owner.guard.canWrite(),'old owner remains read-only after grace timeout');
console.log('PASS  R157C delayed handoff: 3.1s request + 1.35s ACK -> one flush, one safe reload, no duplicate writer');

// A very busy rendering tab may process the request AFTER the old 20-second
// grace period. We must not auto-take ownership or drop the pending request.
timers.length=0;tabs.length=0;channels.length=0;shared.clear();now=40000;
requestDelay=24000;ackDelay=1300;
const slowOwner=tab(),slowWaiter=tab();
slowWaiter.guard.requestTakeover();
advance(61000);
assert.equal(slowWaiter.reloads,0,'do not reload without owner flush/ack');
assert(slowOwner.guard.canWrite(),'delayed owner still controls the save before handoff');
assert.equal(JSON.parse(shared.get('tgw.activeTab')).id,slowOwner.guard.id,'no premature lease takeover after 20s');
advance(70000);
assert.equal(slowOwner.game.save.flushed,1,'very late request must still flush old progress');
assert(slowOwner.game.save.readOnly&&!slowOwner.guard.canWrite(),'very late old owner must become read-only');
assert.equal(slowWaiter.reloads,1,'ACK after >20s must still be accepted');
assert(!slowWaiter.guard.canWrite(),'fresh reload is required before new writer activates');
console.log('PASS  R157C very late handoff: 24s request + 1.3s ACK -> no timeout theft, safe takeover after ACK');

// R157C.1 regression: a live WebGL tab can miss 25s of heartbeats.
// A newly opened tab must NEVER take its save without the live owner's
// synchronous flush/ACK, even though the old 12s lease has timed out.
timers.length=0;tabs.length=0;channels.length=0;shared.clear();now=80000;
requestDelay=3100;ackDelay=1350;
const frozenOwner=tab();
now+=25000;timers.length=0; // freeze scheduled heartbeats, not the owner's save
const newPlayer=tab();
assert(frozenOwner.guard.canWrite(),'a throttled tab must retain ownership until it cooperates');
assert(!newPlayer.guard.canWrite()&&newPlayer.game.save.readOnly,'stale timestamp cannot auto-grant save access');
assert.equal(JSON.parse(shared.get('tgw.activeTab')).id,frozenOwner.guard.id,'lease stays with frozen owner');
newPlayer.guard.requestTakeover();
newPlayer.guard.requestTakeover(); // explicit early retry must also NOT steal
assert.equal(newPlayer.reloads,0,'no reload before the previous save is flushed');
assert.equal(JSON.parse(shared.get('tgw.activeTab')).id,frozenOwner.guard.id,'retry cannot steal a 25s stale lease');
advance(now+6000);
assert.equal(frozenOwner.game.save.flushed,1,'frozen writer flushes exactly once');
assert(!frozenOwner.guard.canWrite()&&frozenOwner.game.save.readOnly,'previous owner stops writing');
assert.equal(newPlayer.reloads,1,'matching ACK makes the waiting tab reload once');
assert.equal(JSON.parse(shared.get('tgw.activeTab')).id,newPlayer.guard.id,'handoff reserves only the approved ID');
console.log('PASS  R157C.1: 25s blocked heartbeat does not steal a live save; one safe flush/ACK');

// Abandoned/crashed tab recovery requires an explicit second tap after 2+min.
// The original in-memory writer must become fenced from the shared save.
timers.length=0;tabs.length=0;channels.length=0;shared.clear();now=200000;
requestDelay=240000;ackDelay=350;
const deadOwner=tab();
now+=121000;timers.length=0;
const recoverPlayer=tab();
assert(!recoverPlayer.guard.canWrite()&&recoverPlayer.game.save.readOnly,'long-stale writer is never auto-claimed');
recoverPlayer.guard.requestTakeover();
assert.equal(recoverPlayer.reloads,0,'first click requests voluntary handoff, even after 2min');
recoverPlayer.guard.requestTakeover();
assert.equal(recoverPlayer.reloads,1,'explicit second click recovers a crashed writer');
assert(!deadOwner.guard.canWrite(),'old writer is fenced immediately by owner-id mismatch');
assert.equal(JSON.parse(shared.get('tgw.activeTab')).id,recoverPlayer.guard.id,'recovered lease reserves new owner ID');
console.log('PASS  R157C.1: 2min abandoned lease recovery is explicit and the old save is fenced');
