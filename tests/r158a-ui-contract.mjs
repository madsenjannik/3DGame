// R158A regression: game systems remain the only source of upgrade/craft truth.
// Executable without a browser; imported before the full smoke suite.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const clean=s=>s.replace(/^import[^\n]*\n/gm,'').replace(/\bexport (?=(class|const|function))/g,'');

const wb=read('js/ui/WorkbenchPanel.js'),viewer=read('js/ui/WorkbenchPreview3D.js'),hud=read('js/ui/Hud.js'),
  game=read('js/core/Game.js'),page=read('game.html'),css=read('styles-r158a.css');
assert(page.includes('styles-r158a.css')&&game.includes('Hud.js?build=CORE-R158A'));
assert(game.includes('WorkbenchPanel.js?build=CORE-R158A'));
assert(game.includes("this.hud?.gear?.classList.contains('open')"));
assert(wb.includes("this.getGreenhouse?.()")&&wb.includes("this.wilds.upgradeWorkshop?.()"),
  'old greenhouse + Workshop action handlers preserved');
assert(wb.includes('data-preview-level')&&wb.includes('data-greenhouse-upgrade')&&wb.includes('data-workshop'));
assert(viewer.includes('visibilitychange')&&viewer.includes('cancelAnimationFrame')&&viewer.includes('powerPreference'));
const glbs=[
  'assets/garden/workshop_l1.glb','assets/garden/workshop_l2.glb','assets/garden/workshop_l3.glb',
  'assets/greenhouses/greenhouse-l1.glb','assets/greenhouses/greenhouse-l2.glb','assets/greenhouses/greenhouse-l3.glb'];
glbs.forEach(g=>{assert(fs.statSync(path.join(ROOT,g)).size>1000,'asset missing '+g);assert(viewer.includes('./'+g),'preview must load the real GLB '+g);});
assert.match(css,/\.r158a-panel\s+\.r158a-workspace/);
assert.match(css,/\.r158a-gear\s+\.bag2-grid/);
assert.match(css,/\(max-height:560px\) and \(orientation:landscape\)/);
assert(!game.includes("R.offer('greenhouse',greenhouse.interaction)"),'no one-tap greenhouse upgrades');

// Run the actual R158A Bag renderer with a minimal interface model.
// All 10 persisted slots remain visible; no fake "drop" or crafting buttons.
const from=hud.indexOf('  renderBag2(){'),to=hud.indexOf('  bag2Click(e){',from);
assert(from>=0&&to>from,'Bag renderer extracted');
const Bag=new Function('return class Bag { '+hud.slice(from,to)+' }')();
const bag=new Bag();bag.gear={innerHTML:''};bag.materialIds=['wood','stone','clay','fiber','amber','shell','wild_seed'];
bag.state={inventory:new Map([['wood',106],['stone',160],['clay',200],['fiber',253],['amber',18]])};
bag.gearItems=()=>[{id:'axe',name:'Stone Axe',kind:'Tool',desc:'Chop wood'}, {id:'seed-tulip',name:'Tulip Seed',kind:'Special Seed',desc:'At Sprouting Ring',bagOnly:true}];
bag.hotbarItems=()=>[{id:'axe',name:'Stone Axe'},...Array(9).fill(null)];
bag.toolArt=x=>'<i class="bag2-art" data-id="'+x.id+'"></i>';
bag.selectedGearId=()=>null;bag._bagFilter='all';
bag.renderBag2();
assert.equal((bag.gear.innerHTML.match(/data-q="[0-9]+"/g)||[]).length,10,'ten quick slots');
assert.match(bag.gear.innerHTML,/data-bag-filter="resources"/);
assert.match(bag.gear.innerHTML,/Stone Axe/);
bag._bagSel='seed-tulip';bag.renderBag2();
assert.match(bag.gear.innerHTML,/Plant at Sprouting Ring/);
assert(!bag.gear.innerHTML.includes('data-act="drop"'),'no fictional drop functionality');
bag._bagFilter='resources';bag.renderBag2();
assert.match(bag.gear.innerHTML,/Wood/);assert.match(bag.gear.innerHTML,/>106</);
assert(!bag.gear.innerHTML.includes('data-act="craft"'),'resources are read-only');
// Selecting a GLB cannot call a buying/upgrading handler; previews are separate.
assert(/data-preview-level/.test(wb)&&/this\.previewLevel=Number/.test(wb));
console.log('PASS  R158A: actual six GLBs, stable Workbench actions, 10 Bag slots, inventory resources, responsive 3D preview lifecycle');
