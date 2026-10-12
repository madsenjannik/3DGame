// R157C: real Playwright two-tab handoff. Both tabs MUST be non-ephemeral.
// Local DevMenu setting exposes QA handles without disabling the save guard.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.glb':'model/gltf-binary','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(ROOT,'.'+pathname);
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':MIME[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const B='http://127.0.0.1:'+server.address().port+'/';
let browser=null,ctx=null;
const fail=(message,diagnostics)=>{throw Error(message+' '+JSON.stringify(diagnostics||{}));};
try{
  browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  ctx=await browser.newContext({viewport:{width:1280,height:720}});
  await ctx.route('**/*',route=>route.request().url().startsWith(B)?route.continue():route.abort());
  await ctx.addInitScript(()=>{
    localStorage.setItem('tgw.devMenu','1'); // exposes window.__tgw without ?dev=1
    localStorage.setItem('tgw.controlTips.v1','1');
    localStorage.setItem('dym.homeMovedIn.v1.cactus','1');
  });
  const errors=[],p=await ctx.newPage();p.on('pageerror',e=>errors.push('first: '+e.message));
  await p.goto(B+'game.html?char=cactus',{waitUntil:'load'});
  const owner=await p.waitForFunction(()=>!!window.__tgw?.tabGuard?.canWrite()&&!window.__tgw?.save.readOnly,{},{timeout:90000}).then(()=>true,()=>false);
  if(!owner)fail('first tab did not acquire save ownership',{errors});
  const q=await ctx.newPage();q.on('pageerror',e=>errors.push('second: '+e.message));
  await q.goto(B+'game.html?char=cactus',{waitUntil:'load'});
  const blocked=await q.waitForFunction(()=>!!window.__tgw?.tabGuard && window.__tgw.save.readOnly && !window.__tgw.tabGuard.canWrite() && !!document.getElementById('tab-lost'),{},{timeout:90000}).then(()=>true,()=>false);
  if(!blocked)fail('second tab was not blocked by active owner',{first:await p.evaluate(()=>({owner:window.__tgw?.tabGuard?.canWrite(),readonly:window.__tgw?.save.readOnly})),second:await q.evaluate(()=>({guard:!!window.__tgw?.tabGuard,readonly:window.__tgw?.save?.readOnly,blocked:!!document.getElementById('tab-lost')})),errors});
  const buttonVisible=await q.evaluate(()=>{const b=document.getElementById('tab-lost'); const rect=b?.getBoundingClientRect(); const style=b&&getComputedStyle(b); const shown=!!b&&style.display!=='none'&&style.visibility!=='hidden'&&rect.width>=44&&rect.height>=44; if(shown)b.click(); return shown;});
  if(!buttonVisible)fail('handoff control not visibly available',{errors});
  const takeover=await q.waitForFunction(()=>!!window.__tgw?.tabGuard?.canWrite()&&!window.__tgw?.save.readOnly,{},{timeout:90000}).then(()=>true,()=>false);
  const oldReadOnly=await p.evaluate(()=>!!window.__tgw?.save?.readOnly && !window.__tgw?.tabGuard?.canWrite() && !!document.getElementById('tab-lost'));
  if(!takeover||!oldReadOnly)fail('ownership transfer incomplete',{takeover,oldReadOnly,errors});
  const noStaleWrite=await p.evaluate(()=>{const g=window.__tgw,before=localStorage.getItem('tgw.save');g.save.profile.inventory.wood=4242;g.save.flush();return before===localStorage.getItem('tgw.save');});
  if(!noStaleWrite||errors.length)fail('stale tab wrote progress or page exception occurred',{noStaleWrite,errors});
  console.log('PASS R157C real Chromium: first owner -> blocked second tab -> safe takeover -> old tab read-only -> stale save protected');
}finally{
  if(ctx)await ctx.close().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
}
