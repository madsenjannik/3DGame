// Physical-Safari preview shipping gate: runtime loads from nested QA path,
// and preview storage never overwrites live browser saves on the same origin.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=createRequire(import.meta.url)('playwright');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  const candidate=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!candidate.startsWith(ROOT+path.sep)||!fs.existsSync(candidate)||!fs.statSync(candidate).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':mime[path.extname(candidate)]||'application/octet-stream'});
  fs.createReadStream(candidate).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port+'/';
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
  const ctx=await browser.newContext({viewport:{width:844,height:390},screen:{width:844,height:390},isMobile:true,hasTouch:true});
  await ctx.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  const raw=await ctx.newPage();
  await raw.goto(origin+'qa/r158a2/qa-storage-unavailable.html');
  const liveSave=JSON.stringify({version:4,profiles:{shared:{inventory:{wood:17}}},unlocked:['cactus','daisy','swamp']});
  await raw.evaluate(data=>{
    localStorage.setItem('tgw.save',data);
    localStorage.setItem('tgw.lastChar',JSON.stringify({id:'cactus'}));
    localStorage.setItem('tgw.activeTab',JSON.stringify({id:'live-owner',at:Date.now()}));
    localStorage.setItem('third-party-entry','not-the-game');
    sessionStorage.setItem('tgw.tabGrant','live-grant');
  },liveSave);
  const qa=await ctx.newPage();
  await qa.goto(origin+'qa/r158a2/index.html',{waitUntil:'domcontentloaded'});
  const snap=await qa.evaluate(()=>{
    const l=window.localStorage,s=window.sessionStorage;
    const result={
      isolated:window.__TGW_QA_ISOLATED__===true,
      copied:l.getItem('tgw.save'),
      liveLeaseImported:l.getItem('tgw.activeTab'),
      outsideKey:l.getItem('third-party-entry'),
      existingGrant:s.getItem('tgw.tabGrant'),
      keys:Object.keys(l)
    };
    l.setItem('tgw.save','QA-changed');
    l.setItem('tgw.activeTab',JSON.stringify({id:'qa-owner',at:Date.now()}));
    l.setItem('tgw.devMenu','1');
    s.setItem('tgw.tabGrant','qa-grant');
    result.afterChange=l.getItem('tgw.save');
    return result;
  });
  assert.equal(snap.isolated,true,'QA storage sandbox did not initialize on preview start');
  assert.equal(snap.copied,liveSave,'QA should start with a one-time COPY of live progress');
  assert.equal(snap.liveLeaseImported,null,'live single-writer ownership was incorrectly copied');
  assert.equal(snap.outsideKey,null,'QA may not see unrelated origin storage');
  assert.equal(snap.existingGrant,null,'QA may not inherit a live sessionStorage grant');
  assert.equal(snap.afterChange,'QA-changed');
  assert(!snap.keys.includes('third-party-entry'));
  const unchanged=await raw.evaluate(()=>({
    save:localStorage.getItem('tgw.save'),
    lease:JSON.parse(localStorage.getItem('tgw.activeTab'))?.id,
    outside:localStorage.getItem('third-party-entry'),
    grant:sessionStorage.getItem('tgw.tabGrant')
  }));
  assert.equal(unchanged.save,liveSave,'QA overwrote the live save!');
  assert.equal(unchanged.lease,'live-owner','QA overwrote live tab ownership!');
  assert.equal(unchanged.outside,'not-the-game','QA overwrote unrelated site data!');
  assert.equal(unchanged.grant,'live-grant','QA overwrote live session grant!');
  console.log('PASS: isolated preview localStorage + sessionStorage and a read-only copy of live progress');
  // Restore a valid saved snapshot to exercise the real non-ephemeral game.
  await qa.evaluate(data=>{
    localStorage.setItem('tgw.save',data);
    localStorage.removeItem('tgw.activeTab');
    sessionStorage.removeItem('tgw.tabGrant');
    localStorage.setItem('tgw.controlTips.v1','1');
  },liveSave);
  await qa.goto(origin+'qa/r158a2/game.html?char=cactus',{waitUntil:'load'});
  const errors=[];qa.on('pageerror',e=>errors.push(e.message));
  await qa.waitForFunction(()=>!!window.__tgw?.workbenchPanel&&!!window.__tgw?.save&&!!window.__tgw?.tabGuard,null,{timeout:180000});
  const active=await qa.evaluate(()=>{
    const g=window.__tgw;
    return {
      sandbox:window.__TGW_QA_ISOLATED__===true,
      version:window.TGW_VERSION?.version,
      canWrite:g.tabGuard.canWrite(),
      readOnly:g.save.readOnly,
      bagSlots:g.save.profile.hotbar?.slots?.length,
      hasPolish:!!document.querySelector('link[href*="styles-r158a2-bag.css"]')
    };
  });
  assert(active.sandbox&&active.canWrite&&!active.readOnly,'QA should use its own writable in-memory save');
  assert.equal(active.version,'0.8.163','preview is not the approved R158A.2 release');
  assert(active.hasPolish,'candidate stylesheet missing on nested page');
  await qa.evaluate(()=>{const g=window.__tgw;g.save.profile.inventory.wood=987;g.save.flush();});
  await raw.reload();
  assert.equal(await raw.evaluate(()=>localStorage.getItem('tgw.save')),liveSave,'QA gameplay wrote to LIVE progress!');
  assert.equal(await raw.evaluate(()=>JSON.parse(localStorage.getItem('tgw.activeTab'))?.id),'live-owner');
  console.log('PASS: nested R158A.2 real game initializes and QA save flush cannot modify live progress');
  if(errors.length)throw Error('Preview page JS errors: '+errors.join('; '));
  await qa.close();await raw.close();await ctx.close();
  console.log('PASS: no preview JavaScript page errors');
}catch(err){console.error('FAIL preview QA:',err);process.exitCode=1;}
finally{await browser?.close();server.close();}
