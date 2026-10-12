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
  return errors;
}
async function screenshot(name){await page.screenshot({path:path.join(OUT,name)});}
try{
  browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const errDesktop=await start(false,1440,900);
  await page.evaluate(()=>window.__tgw.workbenchPanel.show());
  const wb=await page.locator('.r158a-card').boundingBox();
  check(wb&&wb.width>900&&wb.x>=0&&wb.right<=1441,'desktop Workbench bounds');
  await page.locator('.wilds-tabs [data-tab="home"]').click();
  await page.waitForFunction(()=>window.__tgw.workbenchPanel.preview?.loadedKey?.endsWith('greenhouse-l1.glb'),null,{timeout:90000});
  const before=await page.evaluate(()=>window.__tgw.greenhouse.level);
  await page.locator('[data-preview-level="3"]').click();
  await page.waitForFunction(()=>window.__tgw.workbenchPanel.preview?.loadedKey?.endsWith('greenhouse-l3.glb'),null,{timeout:90000});
  check((await page.evaluate(()=>window.__tgw.greenhouse.level))===before,'preview changed actual greenhouse progression');
  await page.locator('[data-focus-building="workshop"]').click();
  await page.waitForFunction(()=>window.__tgw.workbenchPanel.preview?.loadedKey?.endsWith('workshop_l1.glb'),null,{timeout:90000});
  await page.locator('[data-preview-level="2"]').click();
  await page.waitForFunction(()=>window.__tgw.workbenchPanel.preview?.loadedKey?.endsWith('workshop_l2.glb'),null,{timeout:90000});
  await screenshot('Workbench_DESKTOP.png');
  await page.locator('.wilds-tabs [data-tab="tools"]').click();
  await page.locator('[data-focus-tool="pickaxe"]').click();
  check((await page.locator('.r158a-detail-copy').innerText()).includes('Stone Pickaxe'),'tool detail selection');
  await screenshot('Workbench_Tools_DESKTOP.png');
  await page.evaluate(()=>{window.__tgw.workbenchPanel.hide();window.__tgw.wilds.profile.tools.axe=true;window.__tgw.hud.toggleGear(true);});
  const bag=await page.locator('#gear-panel').boundingBox();
  check(bag&&bag.width>700&&bag.right<1441,'desktop Bag is still a small dropdown');
  check(await page.locator('#gear-panel .bag2-slot').count()===10,'desktop quick slots changed');
  await page.locator('[data-bag-filter="resources"]').click();
  check(await page.locator('.r158a-resource-grid .r158a-material').count()===7,'resource category');
  await page.locator('[data-bag-filter="all"]').click();
  await screenshot('Bag_DESKTOP.png');
  await page.keyboard.press('Escape');
  check(!await page.evaluate(()=>window.__tgw.hud.gear.classList.contains('open')),'desktop Bag Escape');
  check(!errDesktop.length,'desktop JS errors '+errDesktop.join('|'));
  console.log('PASS R158A desktop: four real GLB previews, prices preserved, Workbench, Bag, 10 slots, no JS errors');
  await context.close();context=null;page=null;

  const errPhone=await start(true,844,390);
  await page.evaluate(()=>window.__tgw.workbenchPanel.show());
  const phoneWb=await page.locator('.r158a-card').boundingBox();
  check(phoneWb&&phoneWb.x>=-1&&phoneWb.right<=845&&phoneWb.bottom<=391,'iPhone landscape Workbench overflow');
  await page.locator('.wilds-tabs [data-tab="home"]').click();
  await page.waitForFunction(()=>window.__tgw.workbenchPanel.preview?.loadedKey?.endsWith('greenhouse-l1.glb'),null,{timeout:90000});
  await screenshot('Workbench_iPHONE.png');
  await page.evaluate(()=>{window.__tgw.workbenchPanel.hide();window.__tgw.wilds.profile.tools.axe=true;window.__tgw.hud.toggleGear(true);});
  const phoneBag=await page.locator('#gear-panel').boundingBox();
  check(phoneBag&&phoneBag.x>=-1&&phoneBag.right<=845&&phoneBag.bottom<=391,'iPhone landscape Bag overflow');
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
