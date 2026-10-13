// R158A.2 — real (not illustrated) Growing Wilds Bag in desktop and landscape mobile Chromium.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=createRequire(import.meta.url)('playwright');
const OUT=path.join(ROOT,'r158a2-qa');fs.mkdirSync(OUT,{recursive:true});
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 const full=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!full.startsWith(ROOT+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'content-type':MIME[path.extname(full)]||'application/octet-stream'});
 fs.createReadStream(full).pipe(res);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+server.address().port+'/';
let browser,context,page;
async function visibleClick(sel){
 await page.waitForFunction(selector=>{const el=document.querySelector(selector);return !!el?.isConnected&&el.getBoundingClientRect().width>0;},sel,{timeout:20000});
 await page.evaluate(selector=>document.querySelector(selector)?.click(),sel);
}
async function start(mobile,width,height){
 context=await browser.newContext({viewport:{width,height},screen:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?2:1});
 await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 await context.addInitScript(()=>{localStorage.setItem('tgw.devMenu','1');localStorage.setItem('tgw.controlTips.v1','1');});
 page=await context.newPage();
 await page.goto(origin+'game.html?char=cactus&dev=1&devSpawn=privateGarden',{waitUntil:'load'});
 await page.waitForFunction(()=>!!window.__tgw?.hud?.gear&&!!window.__tgw?.wilds,null,{timeout:160000});
 await page.evaluate(m=>{document.body.classList.toggle('hud-classic',m);document.body.classList.toggle('hud-desktop-e',!m);const g=window.__tgw;g.wilds.profile.tools.axe=true;g.wilds.profile.tools.pickaxe=true;g.wilds.profile.tools.can=true;g.wilds.profile.tools.sickle=true;if(g.fishing?.own){g.fishing.own.vest=true;g.fishing.own.rodBamboo=1;}g.save.profile.wear.vest=true;g.hud.toggleGear(true);},mobile);
 await page.waitForSelector('#gear-panel .gw2-bag',{state:'visible',timeout:30000});
}
async function checkAssetsAndLayout(width,height){
 await page.waitForFunction(()=>[...document.querySelectorAll('#gear-panel img')].every(i=>i.complete),null,{timeout:20000});
 await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('#gear-panel img')].map(i=>i.decode?.().catch(()=>{})));});
 await page.waitForTimeout(130);
 const report=await page.evaluate(()=>{
   const panel=document.querySelector('#gear-panel'),bag=panel?.querySelector('.gw2-bag');
   const bounded=sel=>{const a=document.querySelector(sel)?.getBoundingClientRect();return a?{x:a.x,y:a.y,width:a.width,height:a.height,right:a.right,bottom:a.bottom}:null;};
   const imgs=[...document.querySelectorAll('#gear-panel img')].map(i=>({src:new URL(i.src).pathname,ok:i.naturalWidth>0,width:i.naturalWidth}));
   const canvas=[...document.querySelectorAll('canvas')].filter(c=>!panel.contains(c)).length;
   return {panel:bounded('#gear-panel'),inventory:bounded('#gear-panel .gw2-inventory'),detail:bounded('#gear-panel .gw2-detail'),footer:bounded('#gear-panel .gw2-footer'),slots:panel.querySelectorAll('.gw2-slot').length,images:imgs,gameCanvas:canvas,worldBackdrop:getComputedStyle(panel).backgroundImage,btns:[...panel.querySelectorAll('.gw2-filters button')].map(b=>({label:b.textContent,width:b.getBoundingClientRect().width}))};
 });
 assert(report.panel&&report.panel.x>=-1&&report.panel.y>=-1&&report.panel.right<=width+1&&report.panel.bottom<=height+1, 'Bag overflows viewport: '+JSON.stringify(report));
 for(const section of ['inventory','detail','footer'])assert(report[section]?.height>30&&report[section]?.right<=report.panel.right+1&&report[section]?.bottom<=report.panel.bottom+1, 'Bag section clipped: '+section+' '+JSON.stringify(report[section]));
 assert.equal(report.slots,10,'must show ten persistent quick slots');
 assert(report.images.length>3,'game assets not rendered');
 assert(report.images.every(i=>i.ok),'failed game artwork: '+JSON.stringify(report.images.filter(i=>!i.ok)));
 assert(report.images.some(i=>i.src.includes('/brand/icons/tool3d/icon-axe.png')),'approved axe not used');
 assert(!report.images.some(i=>/world\.jpg|vest_hero|generated|mockup|unsplash|background/i.test(i.src)),'invented mockup artwork included');
 assert(report.gameCanvas>0,'must overlay the actual game renderer, not an image');
 assert(report.btns.length===5&&report.btns.every(x=>x.width>20),'Bag filters inaccessible');
 console.log('PASS: actual source assets, game renderer behind Bag, responsive bounds, five filters and ten slots '+width+'x'+height);
}
try{
 browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const [mobile,width,height,name] of [[false,1440,900,'DESKTOP'],[true,844,390,'IPHONE'],[true,667,375,'SMALL_PHONE']]){
   const errors=[];
   await start(mobile,width,height);
   page.on('pageerror',e=>errors.push(e.message));
   await checkAssetsAndLayout(width,height);
   await page.screenshot({path:path.join(OUT,'Bag_'+name+'.png')});
   await visibleClick('#gear-panel [data-bag-filter="wear"]');
   assert.equal(await page.locator('#gear-panel [data-item-id="vest"]').count(),1,'owned vest missing');
   await visibleClick('#gear-panel [data-item-id="vest"]');
   await page.waitForFunction(()=>!!document.querySelector('#gear-panel .gw2-real-vest-render'),null,{timeout:40000});
   const vestResult=await page.evaluate(()=>({src:document.querySelector('.gw2-real-vest-render')?.src,worn:document.querySelector('.gw2-pill.active')?.textContent}));
   assert(vestResult.src?.startsWith('data:image/png;base64,'),'Real life-vest GLB did not render to an image');
   assert(vestResult.worn?.includes('Worn'),'Vest worn indicator missing');
   await page.screenshot({path:path.join(OUT,'Bag_LifeVest_'+name+'.png')});
   await visibleClick('#gear-panel [data-act="wear"]');
   assert.equal(await page.evaluate(()=>!!window.__tgw.save.profile.wear.vest),false,'Vest take-off did not change saved equipment state');
   await visibleClick('#gear-panel [data-bag-filter="resources"]');
   assert.equal(await page.locator('#gear-panel .r158a-resource-grid .r158a-material').count(),7,'seven original resource assets in Resources');
   await visibleClick('#gear-panel [data-item-id="resource:wood"]');
   const wood=await page.evaluate(()=>({txt:document.querySelector('#gear-panel .gw2-info')?.textContent,amount:window.__tgw.state.inventory.get('wood')||0}));
   assert(wood.txt?.includes('Wood')&&wood.txt.includes(String(wood.amount)),'live Wood amount did not match current inventory');
   await page.screenshot({path:path.join(OUT,'Bag_Resources_'+name+'.png')});
   await visibleClick('#gear-panel [data-bag-filter="tools"]');
   assert(await page.locator('#gear-panel [data-item-id="axe"]').count()===1,'tools filter hides owned axe');
   await visibleClick('#gear-panel [data-item-id="axe"]');
   const before=await page.evaluate(()=>window.__tgw.save.profile.hotbar?.slots?.indexOf('axe')??-1);
   assert(before>=0,'owned axe is not assigned to the hotbar');
   await visibleClick('#gear-panel [data-act="slot"]');
   assert(await page.locator('#gear-panel .gw2-slot.target').count()===10,'assign-slot target state missing');
   const to=before===6?7:6;
   await visibleClick('#gear-panel [data-q="'+to+'"]');
   const after=await page.evaluate(()=>window.__tgw.save.profile.hotbar?.slots?.indexOf('axe')??-1);
   assert.equal(after,to,'moving Axe quickslot did not persist in profile');
   await page.screenshot({path:path.join(OUT,'Bag_ToolMove_'+name+'.png')});
   await page.evaluate(()=>window.__tgw.hud.toggleGear(false));
   await page.evaluate(()=>window.__tgw.hud.toggleGear(true));
   assert.equal(await page.evaluate(()=>window.__tgw.save.profile.hotbar?.slots?.indexOf('axe')??-1),to,'new quickslot disappears when reopening Bag');
   assert.deepEqual(errors,[],'page JavaScript errors: '+errors.join(' | '));
   console.log('PASS: real Bag filters, resources, tool quickslot movement, reopening '+name);
   await context.close();context=null;page=null;
 }
}catch(e){
 console.error('FAIL R158A.2 Bag browser',e.stack||e);
 if(page)await page.screenshot({path:path.join(OUT,'FAIL_CURRENT.png')}).catch(()=>{});
 process.exitCode=1;
}finally{
 await context?.close().catch(()=>{});
 await browser?.close().catch(()=>{});
 await new Promise(ok=>server.close(ok));
}
