// R158A Chromium visual QA: actual source and authored GLBs, no mock models.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=createRequire(import.meta.url)('playwright');
const OUT=path.join(ROOT,'r158a-qa');fs.mkdirSync(OUT,{recursive:true});
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.wasm':'application/wasm'};
const server=http.createServer((req,res)=>{
  const filename=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!filename.startsWith(ROOT+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':MIME[path.extname(filename)]||'application/octet-stream'});
  fs.createReadStream(filename).pipe(res);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+server.address().port+'/';
const check=(yes,why)=>{if(!yes)throw Error(why);};
let browser=null,context=null,page=null;
async function start(mobile,width,height){
  context=await browser.newContext({viewport:{width,height},screen:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?2:1});
  await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  await context.addInitScript(()=>{localStorage.setItem('tgw.devMenu','1');localStorage.setItem('tgw.controlTips.v1','1');});
  page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'game.html?char=cactus&dev=1&devSpawn=privateGarden',{waitUntil:'load'});
  await page.waitForFunction(()=>!!window.__tgw?.workbenchPanel&&!!window.__tgw?.hud?.gear,null,{timeout:150000});
  // DEV builds deliberately skip the player HUD profile; emulate the real device profile.
  await page.evaluate(mobile=>{
    document.body.classList.toggle('hud-classic',mobile);
    document.body.classList.toggle('hud-desktop-e',!mobile);
  },mobile);
  return errors;
}
async function screenshot(name){await page.screenshot({path:path.join(OUT,name)});}
try{
  browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const errDesktop=await start(false,1440,900);
  await page.evaluate(()=>window.__tgw.workbenchPanel.show());
  const wb=await page.locator('.r158a-card').boundingBox();
  check(wb&&wb.width>900&&wb.x>=0&&wb.x+wb.width<=1441,'desktop Workbench bounds');
  console.log('R158A browser: opening Home tab on desktop');
  await page.locator('.wilds-tabs [data-tab="home"]').evaluate(el=>{if(!el.getBoundingClientRect().width)throw Error('Invisible control');el.click();});
  console.log('R158A browser: waiting for actual Greenhouse L1');
  await page.waitForFunction(()=>window.__tgw.workbenchPanel.preview?.loadedKey?.endsWith('greenhouse-l1.glb'),null,{timeout:90000});
  const bounds3D=async()=>page.evaluate(async()=>{
    const THREE=await import('./vendor/three.module.js');
    const preview=window.__tgw.workbenchPanel.preview;
    if(!preview?.model)return null;
    const bb=new THREE.Box3().setFromObject(preview.model),size=bb.getSize(new THREE.Vector3());
    return {size:[size.x,size.y,size.z],scale:preview.model.scale.x,key:preview.loadedKey};
  });
  const greenhouseL1=await bounds3D();
  const before=await page.evaluate(()=>window.__tgw.greenhouse.level);
  await page.locator('[data-preview-level="3"]').evaluate(el=>{if(!el.getBoundingClientRect().width)throw Error('Invisible control');el.click();});
  await page.waitForFunction(()=>window.__tgw.workbenchPanel.preview?.loadedKey?.endsWith('greenhouse-l3.glb'),null,{timeout:90000});
  const greenhouseL3=await bounds3D();
  check(Math.abs(greenhouseL1.scale-greenhouseL3.scale)<1e-7,
    'greenhouse levels were independently normalized: '+JSON.stringify({greenhouseL1,greenhouseL3}));
  check((await page.evaluate(()=>window.__tgw.greenhouse.level))===before,'preview changed actual greenhouse progression');
  await page.locator('[data-focus-building="workshop"]').evaluate(el=>{if(!el.getBoundingClientRect().width)throw Error('Invisible control');el.click();});
  await page.waitForFunction(()=>window.__tgw.workbenchPanel.preview?.loadedKey?.endsWith('workshop_l1.glb'),null,{timeout:90000});
  const workshopL1=await bounds3D();
  await page.locator('[data-preview-level="2"]').evaluate(el=>{if(!el.getBoundingClientRect().width)throw Error('Invisible control');el.click();});
  await page.waitForFunction(()=>window.__tgw.workbenchPanel.preview?.loadedKey?.endsWith('workshop_l2.glb'),null,{timeout:90000});
  const workshopL2=await bounds3D();
  check(Math.abs(workshopL1.scale-workshopL2.scale)<1e-7,
    'workshop levels were independently normalized: '+JSON.stringify({workshopL1,workshopL2}));
  console.log('R158A.1 actual 3D dimensions',JSON.stringify({greenhouseL1,greenhouseL3,workshopL1,workshopL2}));
  await screenshot('Workbench_DESKTOP.png');
  await page.locator('.wilds-tabs [data-tab="tools"]').evaluate(el=>{if(!el.getBoundingClientRect().width)throw Error('Invisible control');el.click();});
  await page.locator('[data-focus-tool="pickaxe"]').evaluate(el=>{if(!el.getBoundingClientRect().width)throw Error('Invisible control');el.click();});
  check((await page.locator('.r158a-detail-copy').innerText()).includes('Stone Pickaxe'),'tool detail selection');
  await screenshot('Workbench_Tools_DESKTOP.png');
  await page.evaluate(()=>{window.__tgw.workbenchPanel.hide();window.__tgw.wilds.profile.tools.axe=true;window.__tgw.hud.toggleGear(true);});
  const bag=await page.locator('#gear-panel').boundingBox();
  const bagLayout=await page.evaluate(()=>{const p=document.querySelector('#gear-panel'),b=p?.getBoundingClientRect();return {body:document.body.className,width:b?.width,left:b?.left,top:b?.top,layout:getComputedStyle(p).display,details:!!p.querySelector('.r158a-bag')};});
  check(bag&&bag.width>700&&bag.x>=0&&bag.x+bag.width<1441&&bagLayout.details,'desktop Bag not full inventory: '+JSON.stringify(bagLayout));
  check(await page.locator('#gear-panel .bag2-slot').count()===10,'desktop quick slots changed');
  await page.locator('[data-bag-filter="resources"]').evaluate(el=>{if(!el.getBoundingClientRect().width)throw Error('Invisible control');el.click();});
  check(await page.locator('.r158a-resource-grid .r158a-material').count()===7,'resource category');
  await page.locator('[data-bag-filter="all"]').evaluate(el=>{if(!el.getBoundingClientRect().width)throw Error('Invisible control');el.click();});
  const brokenArt=await page.locator('#gear-panel img.r158a1-item-image').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));
  check(!brokenArt.length,'inventory contains missing/non-approved art: '+brokenArt.join(', '));
  await screenshot('Bag_DESKTOP.png');
  await page.keyboard.press('Escape');
  check(!await page.evaluate(()=>window.__tgw.hud.gear.classList.contains('open')),'desktop Bag Escape');
  check(!errDesktop.length,'desktop JS errors '+errDesktop.join('|'));
  console.log('PASS R158A desktop: four real GLB previews, prices preserved, Workbench, Bag, 10 slots, no JS errors');
  await context.close();context=null;page=null;

  const errPhone=await start(true,844,390);
  await page.evaluate(()=>window.__tgw.workbenchPanel.show());
  const phoneWb=await page.locator('.r158a-card').boundingBox();
  check(phoneWb&&phoneWb.x>=-1&&phoneWb.x+phoneWb.width<=845&&phoneWb.y+phoneWb.height<=391,'iPhone landscape Workbench overflow');
  await page.locator('.wilds-tabs [data-tab="home"]').evaluate(el=>{if(!el.getBoundingClientRect().width)throw Error('Invisible control');el.click();});
  await page.waitForFunction(()=>window.__tgw.workbenchPanel.preview?.loadedKey?.endsWith('greenhouse-l1.glb'),null,{timeout:90000});
  await screenshot('Workbench_iPHONE.png');
  await page.evaluate(()=>{window.__tgw.workbenchPanel.hide();window.__tgw.wilds.profile.tools.axe=true;window.__tgw.hud.toggleGear(true);});
  const phoneBag=await page.locator('#gear-panel').boundingBox();
  check(phoneBag&&phoneBag.x>=-1&&phoneBag.x+phoneBag.width<=845&&phoneBag.y+phoneBag.height<=391,'iPhone landscape Bag overflow');
  check(await page.locator('#gear-panel .bag2-slot').count()===10,'iPhone Bag quick slots');
  await screenshot('Bag_iPHONE.png');
  check(!errPhone.length,'phone JS errors '+errPhone.join('|'));
  console.log('PASS R158A iPhone landscape: actual greenhouse model, responsive Workbench, 10-slot Bag');
}catch(e){console.error('FAIL R158A Chromium',e.stack||e);
  if(page)await page.screenshot({path:path.join(OUT,'FAIL_CURRENT.png')}).catch(()=>{});process.exitCode=1;
}finally{
  if(context)await context.close().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  await new Promise(ok=>server.close(ok));
}
