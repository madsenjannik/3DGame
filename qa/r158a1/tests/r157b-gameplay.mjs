// @ts-nocheck
// R157B targeted, deterministic gameplay regressions.
// Run directly: node tests/r157b-gameplay.mjs; also imported by tests/smoke.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const strip=s=>s.replace(/^import[^\n]*\n/gm,'').replace(/\bexport (?=(class|const|function))/g,'');
const { InteractionResolver, gardenInteractionSource, PRIORITY } = new Function(strip(source('js/core/InteractionResolver.js'))+'\nreturn { InteractionResolver, gardenInteractionSource, PRIORITY };')();
const { layoutMapLabels } = new Function(strip(source('js/ui/MapLabelLayout.js'))+'\nreturn {layoutMapLabels};')();

// 1: Pot actions beat greenhouse upgrade only within the pot's actual interaction radius.
// Non-pot Wilds and a growing pot keep established priorities, including home > greenhouse.
const pot=act=>({type:'wilds-pot',act,distance:1.18});
assert.equal(gardenInteractionSource(pot('plant')),'garden-pot');
assert.equal(gardenInteractionSource(pot('water')),'garden-pot');
assert.equal(gardenInteractionSource(pot('harvest')),'garden-pot');
assert.equal(gardenInteractionSource(pot('none')),'wilds');
assert.equal(gardenInteractionSource({...pot('plant'),disabled:true}),'wilds','locked pot does not block greenhouse upgrade');
assert.equal(gardenInteractionSource({...pot('water'),disabled:true}),'wilds','empty watering can does not block upgrade');
assert.equal(gardenInteractionSource({type:'wilds-workbench',distance:.1}),'wilds');
assert(PRIORITY.home > PRIORITY['garden-pot'] && PRIORITY['garden-pot'] > PRIORITY.greenhouse);
const resolver=new InteractionResolver();
resolver.begin();resolver.offer('greenhouse',{type:'greenhouse',distance:.2});
resolver.offer(gardenInteractionSource(pot('plant')),pot('plant'));
assert.equal(resolver.resolve().type,'wilds-pot','the player can plant next to upgrade sign');
resolver.begin();resolver.offer('greenhouse',{type:'greenhouse',distance:.2});
resolver.offer(gardenInteractionSource(pot('none')),pot('none'));
assert.equal(resolver.resolve().type,'greenhouse','growth-only pot must not trap the upgrade action');
resolver.begin();resolver.offer('greenhouse',{type:'greenhouse',distance:.2});
resolver.offer(gardenInteractionSource({...pot('plant'),disabled:true}),{...pot('plant'),disabled:true});
assert.equal(resolver.resolve().type,'greenhouse','disabled plant action does not steal greenhouse upgrade');
resolver.begin();resolver.offer('home',{type:'home-exit',distance:1.5});
resolver.offer(gardenInteractionSource(pot('water')),pot('water'));
assert.equal(resolver.resolve().type,'home-exit','locked home priority stays intact');

// 2: Dense map clusters never draw overlapping labels or labels outside the canvas.
// Quest and boss names get first placement; POI names may be omitted if no room.
const gap=4;
const intersects=(a,b)=>a.left<b.right+gap&&a.right+gap>b.left&&a.top<b.bottom+gap&&a.bottom+gap>b.top;
for(const [width,height,scale] of [[844,390,1],[667,375,1],[1280,720,1],[1688,780,2]]) {
  const centerX=width*.52,centerY=height*.48;
  const labels=Array.from({length:18},(_,i)=>({text:i===0?'Golden Seed':i===1?'Wood Giant':'Marker '+i,x:centerX+(i%3)*4*scale,y:centerY+(i%4)*4*scale,priority:i===0?3:i===1?2:0,preferred:i%2?'above':'below'}));
  const blockers=[{left:centerX-6*scale,right:centerX+6*scale,top:centerY-6*scale,bottom:centerY+6*scale}];
  const place=()=>layoutMapLabels(labels,width,height,scale,text=>text.length*7*scale,blockers);
  const result=place();assert.deepEqual(result,place(),'same input returns stable layout');
  assert(result.length>0 && result.some(x=>x.text==='Golden Seed'),'quest label stays legible');
  for(const x of result) {
    assert(x.bounds.left>=8*scale&&x.bounds.top>=8*scale&&x.bounds.right<=width-8*scale&&x.bounds.bottom<=height-8*scale);
    assert(!intersects(x.bounds,blockers[0]),'no label may cover an icon');
  }
  for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++)assert(!intersects(result[i].bounds,result[j].bounds),'two map labels overlapped');
}

// 3: Exercise actual authored greeting camera code, with minimal Three.js-style stubs.
// A clean sightline must retain the locked camera quaternion; a blocked one must
// be corrected and look at the same original target, without passing through the wall.
const fishing=source('js/gameplay/FishingV1System.js');
const begin=fishing.indexOf('  applyCamera(camera,followCamera,dt){');
const end=fishing.indexOf('  projectUI(camera){',begin);
assert(begin>=0&&end>begin,'actual FishingV1 applyCamera method located');
class Vec {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  distanceToSquared(v){return (this.x-v.x)**2+(this.y-v.y)**2+(this.z-v.z)**2;}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  length(){return Math.hypot(this.x,this.y,this.z);}
  multiplyScalar(k){this.x*=k;this.y*=k;this.z*=k;return this;}
  addScaledVector(v,k){this.x+=v.x*k;this.y+=v.y*k;this.z+=v.z*k;return this;}
}
const TestCam=new Function('V3','THREE','return class TestCam { '+fishing.slice(begin,end)+' }')(Vec,{MathUtils:{}});
const cameraTest=(blocked)=>{
  const sys=new TestCam();
  sys.mode='enter';sys.T=.2;sys.overlayRoot={};sys._camInit=true;
  sys._dPos=new Vec();sys._dTgt=new Vec();sys._tmpC=new Vec();sys._tmpQ={q:0};
  sys._camPos=new Vec();sys._camTgt=new Vec();
  sys.correctGreetCamera=pos=>{if(blocked)pos.x+=1;return pos;};
  sys.projectUI=()=>{};
  sys.land={cabinAsset:{
    sigurdViewCamera:{getWorldPosition(out){out.copy(new Vec(2,3,4));},getWorldQuaternion(q){q.q=15;},userData:{fovDegLandscape:43,near:.08,far:250}},
    sigurdViewTarget:{getWorldPosition(out){out.copy(new Vec(8,9,10));}}
  }};
  const camera={aspect:1.8,position:new Vec(),quaternion:{q:0,copy(q){this.q=q.q;}},
    lookAt(target){this.aim={...target};},updateProjectionMatrix(){},updateMatrixWorld(){}};
  sys.applyCamera(camera,{look:new Vec()},.016);return camera;
};
const clear=cameraTest(false),blocked=cameraTest(true);
assert.equal(clear.position.x,2);assert.equal(clear.quaternion.q,15);assert.equal(clear.aim,undefined);
assert.equal(blocked.position.x,3);assert.equal(blocked.aim.x,8);
assert.equal(clear.fov,43);assert.equal(blocked.fov,43);
assert(fishing.includes('this.correctGreetCamera(this._dPos,this._dTgt);'),'active camera route uses LOS correction');
assert(fishing.includes("'Fishing_Hatch_Facade_R13'"),'rebuilt hatch wall participates in collision sightline');
console.log('PASS  R157B: greenhouse pot actions, dense map labels, authored/obstructed Sigurd camera');
