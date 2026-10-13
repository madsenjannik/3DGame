// R157B.1 standalone UI/gameplay regression checks (no browser/Playwright required).
// Run: node tests/r157b1-ui.mjs. Imported by tests/smoke.mjs as the first UI gate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const strip=s=>s.replace(/^import[^\n]*\n/gm,'').replace(/\bexport (?=(class|const|function))/g,'');
const game=read('js/core/Game.js');
const panelSrc=read('js/ui/WorkbenchPanel.js');
const fish=read('js/gameplay/FishingV1System.js');
const mapSrc=read('js/ui/WorldMap.js');
const input=read('js/core/InputManager.js');

// 1. Greenhouse progression is only triggered from the Workbench panel.
// The locked GreenhouseProgressionSystem still owns the 3 levels, animations and saves.
assert(!game.includes("R.offer('greenhouse',greenhouse.interaction)"),'no direct greenhouse one-tap upgrade');
assert(game.includes('getGreenhouse:()=>this.greenhouse'),'Workbench greenhouse getter is live');
assert(panelSrc.includes('data-greenhouse-upgrade'),'greenhouse action is in Workbench');
const eventHandlers={};
const events={on(type,fn){(eventHandlers[type] ||= []).push(fn)},emit(type){for(const fn of eventHandlers[type]||[])fn()}};
const nodes=new Map(),clickHandlers={};
const fakeNode=()=>({innerHTML:'',classList:{add(){},remove(){},toggle(){}},querySelectorAll(){return[]},scrollIntoView(){}});
const el={
  innerHTML:'',className:'',classList:{add(){},remove(){}},setAttribute(){},
  addEventListener(type,fn){clickHandlers[type]=fn},
  querySelector(sel){if(!nodes.has(sel))nodes.set(sel,fakeNode());return nodes.get(sel)},
  querySelectorAll(){return[]}
};
const document={createElement(){return el},body:{appendChild(){}}};
const env={MATERIALS:{},TOOLS:[],HOME_UPGRADES:[],PERKS:[],POTS:{max:3,cost:{}},WORKSHOP_UPGRADES:[],document,addEventListener(){}};
const {WorkbenchPanel}=new Function(...Object.keys(env),strip(panelSrc)+'\nreturn {WorkbenchPanel};')(...Object.values(env));
const state={inventory:new Map(),events};
const wilds={profile:{workshop:0,homeLevel:0,perks:{}},goal:()=>({title:'Build your greenhouse',copy:'At Workbench → Home'}),
  pots:{owned:()=>0,available:()=>false},onChange(){}};
const greenhouse={level:0,anim:null,started:0,startUpgrade(){
  if(this.anim||this.level>=3)return false;
  this.started++;this.anim={to:this.level+1};events.emit('greenhouse:upgrade-started');return true;
}};
const panel=new WorkbenchPanel({wilds,state,getGreenhouse:()=>greenhouse});
panel.tab='home';panel.open=true;panel.render();
const html=()=>nodes.get('.wilds-list').innerHTML;
assert.match(html(),/Greenhouse · Not built/);
assert.match(html(),/data-greenhouse-upgrade/);
const target={closest:selector=>selector==='[data-greenhouse-upgrade]'?{}:null};
const tap=()=>clickHandlers.click({target});
tap();assert.equal(greenhouse.started,1);assert.match(html(),/Building level 1\/3/);
tap();assert.equal(greenhouse.started,1,'repeated taps during animation cannot double-upgrade');
greenhouse.anim=null;greenhouse.level=1;events.emit('greenhouse:level-changed');
assert.match(html(),/Greenhouse · Level 1\/3/);
greenhouse.level=3;events.emit('greenhouse:level-changed');
assert.match(html(),/Complete/);
tap();assert.equal(greenhouse.started,1,'level 3 is the hard maximum');

// 2. Sigurd replies and selectable choices must coexist and not replace each other.
// Desktop world bubble retains its previous behaviour, phone reply stays until replaced.
const dialogue=fish.slice(fish.indexOf('  renderDialog(){'),fish.indexOf('  choose(k){'));
const speech=fish.slice(fish.indexOf('  say(t,d=2.8){'),fish.indexOf('  sayTimer(d){'));
assert(dialogue.startsWith('  renderDialog(){')&&speech.startsWith('  say(t,d=2.8){'));
const FishingHarness=new Function('return class FishingHarness {\n'+dialogue+'\n'+speech+'\n}')();
const stub=new FishingHarness();
const dlg={innerHTML:'<div id="fishing-reply-text">Keep speaker text</div>'};
let buttonsWired=0;
const opts={innerHTML:'',querySelectorAll(){return [{dataset:{k:'tip'},addEventListener(type,fn){if(type==='click')buttonsWired++;}}]}};
let bubbleShown=false;
stub.ui={dlg,opts,reply:{textContent:''},bubble:{innerHTML:'',classList:{add(type){if(type==='show')bubbleShown=true}}}};
stub.dialogOptions=()=>[['tip',"What's biting today?"],['bye','See you']];
stub.choose=()=>{};stub.renderDialog();
assert.match(opts.innerHTML,/What.s biting today/);assert.match(opts.innerHTML,/See you/);
assert.match(dlg.innerHTML,/Keep speaker text/,'choice rerender does not erase the reply DOM');
assert.equal(buttonsWired,1);
stub.say('The lake is biting today.',.1);
assert.equal(stub.ui.reply.textContent,'The lake is biting today.');
assert(bubbleShown,'desktop timed speech bubble stays available');
stub.say('Bring your catches back.',.1);
assert.equal(stub.ui.reply.textContent,'Bring your catches back.','latest answer persists independently of timer');
const gameHTML=read('game.html'),mobileCSS=read('styles-r157b1.css');
assert(gameHTML.includes('id="fishing-dialog-options"')&&gameHTML.includes('id="fishing-reply-text"'));
assert(mobileCSS.includes('grid-template-columns')&&mobileCSS.includes('fishing-dialog-reply')&&mobileCSS.includes('.fishing-dialog-options'));

// 3. Map owns all gestures; reopening the game restores normal input routing.
assert(game.includes('this.mapBlocking=!!open;'));
assert(game.includes('if(mapOpen)action=false;'));
assert(!game.includes("R.offer('greenhouse',greenhouse.interaction)"));
assert(input.includes("document.body.classList.contains('world-map-open')"));
assert(!mapSrc.includes("if(this.overlayMode&&this.mobile&&e.clientX<innerWidth*.48)return"),
  'panning on left of phone is no longer discarded');
const layoutStart=mapSrc.indexOf('  _layout(){'),layoutEnd=mapSrc.indexOf('  _buildDom(){',layoutStart);
assert(layoutStart>=0&&layoutEnd>layoutStart);
const MockMap=new Function('return class MockMap{get mobile(){return true} get overlayMode(){return true}\n'+mapSrc.slice(layoutStart,layoutEnd)+'}')();
const map=new MockMap();const node=()=>({style:{}});
map.o={size:'auto'};map.dpr=1;map.mini=node();map.mc=node();map._tag=node();map.full=node();map.fc=node();map.lg=node();map._layout();
assert.equal(map.full.style.pointerEvents,'auto','map captures all touch events in overlay mode');
assert.equal(map.fc.style.pointerEvents,'auto');
const inpStart=input.indexOf('  onPointerDown(e){'),inpEnd=input.indexOf('  moveJoy(e){',inpStart);
assert(inpStart>=0&&inpEnd>inpStart);
const prevent=new Function('document','return class TouchTest{\n'+input.slice(inpStart,inpEnd)+'}')({
  body:{classList:{contains:c=>c==='world-map-open'}}
});
const touch=new prevent();touch.onPointerDown({pointerType:'touch',pointerId:4,clientX:80,clientY:90});
assert.equal(touch.joyPointer,undefined,'map pointer cannot arm the joystick');
assert.equal(touch.lookPointer,undefined,'map pointer cannot arm camera look');
assert(mobileCSS.includes('body.touch.world-map-open'),'mobile controls yield to open map');
console.log('PASS  R157B.1: explicit Workbench greenhouse upgrades, persistent Sigurd replies/options, map-only touch input');
