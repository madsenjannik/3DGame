// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ASSET_URL='./assets/wildlife/animal_assets_20.glb';
const PERIODS=['day','dusk','night'];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const angleLerp=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;

// targetSize is a The Growing Wilds visual size in metres-ish world units. The source GLB
// was authored as an asset sheet with display-normalized scales, so runtime size
// is deliberately normalized per species here instead of inheriting sheet scale.
// Aquatic grounding: waterOffset is the model-root draft relative to WORLD water.
// Negative values intentionally place feet/legs below the surface so waterfowl read as floating/swimming.
const SPECIES={
  squirrel:{top:'Animal_01_squirrel',targetSize:.46,habitats:['grass','tree'],periods:['day','dusk'],periodWeights:{day:1,dusk:.62},weight:1.15,max:2,action:['Nibble',0],move:['Hop',0],flee:['Run',0],speed:.75,fleeSpeed:2.2,reaction:3.1,pathClearance:1.45},
  hedgehog:{top:'Animal_02_hedgehog',targetSize:.32,habitats:['grass','bush'],periods:['day','dusk','night'],periodWeights:{day:.05,dusk:.72,night:1},weight:.72,max:1,action:['Curl',0],move:['Walk',0],flee:['Run',0],speed:.35,fleeSpeed:1.05,reaction:2.2,pathClearance:2.35,maxCoverDistance:10.5},
  hare:{top:'Animal_03_hare',targetSize:.58,habitats:['grass','meadow'],periods:['day','dusk'],periodWeights:{day:.72,dusk:1},weight:.82,max:1,action:['Hop',0],move:['Hop',1],flee:['Run',0],speed:1.0,fleeSpeed:2.7,reaction:4.0,pathClearance:2.55},
  fox:{top:'Animal_04_fox',targetSize:.90,habitats:['forest','grass'],periods:['day','dusk','night'],periodWeights:{day:.05,dusk:1,night:.72},weight:.42,max:1,action:['Pounce',0],move:['Walk',0],flee:['Run',0],speed:.62,fleeSpeed:2.2,reaction:5.2,avoidBuildings:14,pathClearance:5.25,maxCoverDistance:11.5,coverBias:.55},
  deer:{top:'Animal_05_deer',targetSize:1.55,habitats:['forest','meadow'],periods:['day','dusk','night'],periodWeights:{day:.42,dusk:1,night:.48},weight:.34,max:2,action:['Graze',0],move:['Walk',0],flee:['Run',0],speed:.55,fleeSpeed:2.55,reaction:6.8,avoidBuildings:18,pathClearance:6.0},
  frog:{top:'Animal_06_frog',targetSize:.23,habitats:['shore'],periods:['day','dusk','night'],weight:.72,max:2,action:['Hop',0],move:['Hop',1],flee:['Hop',1],speed:.38,fleeSpeed:.95,reaction:2.0},
  greattit:{top:'Animal_07_greattit',targetSize:.22,habitats:['tree','bush','grass'],periods:['day','dusk'],weight:1.00,max:2,action:['Peck',0],move:['Hop',0],flee:['Fly',0],speed:.42,fleeSpeed:2.8,reaction:3.0,bird:true,flightHeight:1.45},
  robin:{top:'Animal_08_robin',targetSize:.23,habitats:['tree','bush','grass'],periods:['day','dusk'],weight:1.12,max:2,action:['Sing',0],move:['Hop',0],flee:['Fly',0],speed:.40,fleeSpeed:2.7,reaction:2.8,bird:true,flightHeight:1.35},
  owl:{top:'Animal_09_owl',targetSize:.52,habitats:['tree','forest'],periods:['night'],weight:.68,max:1,action:['Look',0],move:['Fly',0],flee:['Fly',0],speed:1.35,fleeSpeed:2.6,reaction:4.2,bird:true,airRoam:true,flightHeight:1.8},
  butterfly:{top:'Animal_10_butterfly',targetSize:.18,habitats:['grass','flower','meadow'],periods:['day'],weight:1.35,max:3,action:['Flight',0],move:['Fly',0],flee:['Fly',0],speed:.52,fleeSpeed:1.35,reaction:1.5,hover:true,airHeight:.62},
  dragonfly:{top:'Animal_11_dragonfly',targetSize:.20,habitats:['shore','water'],periods:['day','dusk'],weight:.88,max:2,action:['Dart',0],move:['Hover',0],flee:['Fly',0],speed:.75,fleeSpeed:1.9,reaction:1.8,hover:true,airHeight:.72},
  bumblebee:{top:'Animal_12_bumblebee',targetSize:.14,habitats:['grass','flower','meadow'],periods:['day'],weight:1.35,max:3,action:['Loop',0],move:['Hover',0],flee:['Fly',0],speed:.42,fleeSpeed:1.25,reaction:1.4,hover:true,airHeight:.55},
  raven:{top:'Animal_13_raven',targetSize:.52,habitats:['tree','forest','grass'],periods:['day','dusk'],weight:.48,max:1,action:['Caw',0],move:['Hop',0],flee:['Fly',0],speed:.42,fleeSpeed:3.0,reaction:4.2,bird:true,flightHeight:1.8,avoidBuildings:7},
  marten:{top:'Animal_14_marten',targetSize:.58,habitats:['forest','tree'],periods:['dusk','night'],periodWeights:{dusk:.62,night:1},weight:.52,max:1,action:['Rear up',0],move:['Walk',0],flee:['Run',0],speed:.62,fleeSpeed:2.0,reaction:4.0,avoidBuildings:10,pathClearance:4.25,maxCoverDistance:8.5},
  bat:{top:'Animal_15_bat',targetSize:.36,habitats:['forest','tree','grass'],periods:['night'],weight:.86,max:2,action:['Swoop',0],move:['Fly',0],flee:['Fly',0],speed:1.7,fleeSpeed:3.0,reaction:2.4,hover:true,airHeight:1.8},
  mallard:{top:'Animal_16_mallard',targetSize:.58,habitats:['water'],periods:['day','dusk'],weight:.86,max:2,action:['Flap',0],move:['Swim',0],flee:['Swim',0],speed:.40,fleeSpeed:.85,reaction:3.2,water:true,waterOffset:-.085,waterBob:.006},
  swan:{top:'Animal_17_swan',targetSize:1.12,habitats:['water'],periods:['day','dusk'],weight:.40,max:1,action:['Flap',0],move:['Swim',0],flee:['Swim',0],speed:.32,fleeSpeed:.65,reaction:4.2,water:true,waterOffset:-.155,waterBob:.008},
  kingfisher:{top:'Animal_18_kingfisher',targetSize:.28,habitats:['shore','water'],periods:['day','dusk'],weight:.56,max:1,action:['Dive',0],move:['Hop',0],flee:['Fly',0],speed:.45,fleeSpeed:3.2,reaction:3.1,bird:true,flightHeight:1.4},
  skylark:{top:'Animal_19_skylark',targetSize:.24,habitats:['grass','meadow'],periods:['day'],weight:.78,max:1,action:['Sing',0],move:['Hop',0],flee:['Fly',0],speed:.42,fleeSpeed:2.7,reaction:3.1,bird:true,flightHeight:1.55},
  badger:{top:'Animal_20_badger',targetSize:.76,habitats:['forest','bush'],periods:['dusk','night'],periodWeights:{dusk:.55,night:1},weight:.44,max:1,action:['Dig',0],move:['Walk',0],flee:['Run',0],speed:.45,fleeSpeed:1.65,reaction:3.7,avoidBuildings:12,pathClearance:4.75,maxCoverDistance:10.5}
};

function pointSegmentDistance(x,z,s){
  const vx=s.bx-s.ax,vz=s.bz-s.az,den=vx*vx+vz*vz;
  let t=den?((x-s.ax)*vx+(z-s.az)*vz)/den:0;t=clamp(t);
  return Math.hypot(x-(s.ax+vx*t),z-(s.az+vz*t));
}

export class WildlifeSystem{
  constructor(scene,{world,isTouch=false}={}){
    this.scene=scene;this.world=world;this.isTouch=isTouch;this.shared=world?.sharedLandscape;
    this.library=null;this.templates=new Map();this.animals=[];this.period='day';this.ready=false;this.loadError=null;
    this.maxActive=isTouch?7:12;this.spawnClock=0;this.spawnEvery=isTouch?1.15:.82;this.instanceNo=0;
    this._seed=0xD1A2026;this._dev=false;this._devEl=null;this._devUiClock=0;this.active=true;
    // R20: PRIVATE_GARDEN_ROOT trees are hidden on the shared map, so world wildlife
    // must derive cover only from actual shared-world trees.
    this.treePoints=[];const xy=this.shared?.treeXY||[];for(let i=0;i<xy.length;i+=2)this.treePoints.push([xy[i],xy[i+1]]);
  }

  rand(){let t=this._seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}

  async init(){
    try{
      const gltf=await new GLTFLoader().loadAsync(ASSET_URL);this.library=gltf;
      for(const [id,cfg] of Object.entries(SPECIES)){
        const top=gltf.scene.getObjectByName(cfg.top);if(!top||!top.children.length){console.warn('Wildlife template missing',id,cfg.top);continue;}
        const model=top.children[0];
        const clips=(gltf.animations||[]).filter(c=>c.name.startsWith(id+'_'));
        this.templates.set(id,{model,clips});
      }
      this.ready=this.templates.size>=18;
      if(this.ready)this.disableLegacyAmbient();
      console.info(`DYM Wildlife V1 ready · ${this.templates.size}/20 species · ${gltf.animations?.length||0} clips`);
    }catch(error){this.loadError=error;console.error('DYM Wildlife V1 could not load',error);}
    return this;
  }

  disableLegacyAmbient(){
    // Keep R16's procedural ambient life as a fallback if the real wildlife GLB fails.
    // Once Wildlife V1 is confirmed loaded, hide the duplicate ducks/butterfly points.
    const s=this.shared;if(!s)return;
    for(const d of s.ducks||[])if(d.m)d.m.visible=false;
    if(s.butterflies?.pts)s.butterflies.pts.visible=false;
  }

  enableDevMode(){
    if(this._dev)return;this._dev=true;
    const el=document.createElement('div');el.style.cssText='position:fixed;left:14px;top:14px;z-index:9999;padding:9px 11px;border-radius:11px;background:rgba(20,28,20,.78);color:#f1eedf;font:600 11px/1.4 system-ui,sans-serif;letter-spacing:.02em;pointer-events:none;white-space:pre;backdrop-filter:blur(8px)';document.body.appendChild(el);this._devEl=el;
    addEventListener('keydown',e=>{if(!this._dev)return;if(e.code==='KeyV'){this.setPeriod(PERIODS[(PERIODS.indexOf(this.period)+1)%PERIODS.length]);}else if(e.code==='KeyR'){this.clear();this.spawnClock=99;}else if(e.code==='KeyK'){this.clear();}});
    this.updateDevOverlay();
  }

  setPeriod(period){if(!PERIODS.includes(period))return;this.period=period;for(const a of [...this.animals])if(!a.cfg.periods.includes(period))this.despawn(a);this.spawnClock=99;this.updateDevOverlay();}
  clear(){for(const a of [...this.animals])this.despawn(a);}
  setActive(active){this.active=!!active;if(!this.active)this.clear();else this.spawnClock=99;if(this._devEl)this._devEl.style.display=this.active?'block':'none';}

  nearestTreeDistance(x,z,max=18){let best=max;for(const p of this.treePoints){const dx=x-p[0],dz=z-p[1];if(Math.abs(dx)>best||Math.abs(dz)>best)continue;const d=Math.hypot(dx,dz);if(d<best)best=d;}return best;}

  habitatAt(x,z){
    const s=this.shared;if(!s)return null;
    const wh=s.worldHeight(x,z),gh=this.world.groundHeight(x,z),water=wh<s.WL+.02&&!s.isCabinWalkableSurface?.(x,z,.1)&&!s.isBridgeWalkCorridor?.(x,z,.1);
    let shore=99;for(const seg of s.waterSegmentsNear?.(x,z)||[])shore=Math.min(shore,pointSegmentDistance(x,z,seg));
    const td=this.nearestTreeDistance(x,z,18),homeYard=Math.abs(x)<4.2&&z>1.5&&z<12.8,meadow=Math.hypot(x-s.meadow.x,z-s.meadow.z)<s.meadow.r+4;
    const sharedPath=s.pathDistance(x,z),path=sharedPath;
    const forest=td<7.5,grass=!water&&gh>s.WL+.16&&path>1.0,building=Math.min(Math.hypot(x-s.cabin.x,z-s.cabin.z),Math.hypot(x-s.orangery.x,z-s.orangery.z));
    return {x,z,wh,gh,water,shore,tree:td<8,bush:grass&&(homeYard||td<10),forest,grass,meadow,flower:grass&&(homeYard||meadow),path,building,treeDistance:td};
  }

  habitatScore(cfg,h){
    if(!h)return 0;
    if(cfg.avoidBuildings&&h.building<cfg.avoidBuildings)return 0;
    // R19 naturalism: large/shy ground wildlife should not choose the visible path
    // as habitat. Small birds remain free to hop/land on paths because they do not
    // carry a pathClearance rule.
    if(cfg.pathClearance&&h.path<cfg.pathClearance)return 0;
    if(cfg.maxCoverDistance&&h.treeDistance>cfg.maxCoverDistance)return 0;
    let best=0;
    for(const type of cfg.habitats){
      if(type==='water'&&h.water)best=Math.max(best,h.shore>1.0?1:.72);
      else if(type==='shore'&&!h.water&&h.shore<2.8)best=Math.max(best,1-clamp((h.shore-.3)/3)*.25);
      else if(type==='tree'&&h.tree)best=Math.max(best,.76+.24*(1-h.treeDistance/8));
      else if(type==='forest'&&h.forest)best=Math.max(best,.82+.18*(1-h.treeDistance/7.5));
      else if(type==='meadow'&&h.meadow&&h.grass)best=Math.max(best,1);
      else if(type==='flower'&&h.flower)best=Math.max(best,.9);
      else if(type==='bush'&&h.bush)best=Math.max(best,.86);
      else if(type==='grass'&&h.grass)best=Math.max(best,.70+(h.meadow?.2:0)+(h.tree?.08:0));
    }
    if(best>0&&cfg.coverBias){
      const cover=1-clamp((h.treeDistance-2)/Math.max(1,(cfg.maxCoverDistance||14)-2));
      best*=THREE.MathUtils.lerp(1-cfg.coverBias,1,cover);
    }
    return clamp(best);
  }

  periodWeight(cfg){return cfg.periodWeights?.[this.period]??(cfg.periods.includes(this.period)?1:0);}
  speciesCount(id){let n=0;for(const a of this.animals)if(a.id===id)n++;return n;}
  eligibleSpecies(){return Object.entries(SPECIES).filter(([id,c])=>this.templates.has(id)&&this.periodWeight(c)>0&&this.speciesCount(id)<c.max);}

  chooseSpecies(){
    const list=this.eligibleSpecies();if(!list.length)return null;let sum=0;for(const [,c] of list)sum+=c.weight*this.periodWeight(c);let r=this.rand()*sum;
    for(const e of list){r-=e[1].weight*this.periodWeight(e[1]);if(r<=0)return e;}return list[list.length-1];
  }

  sampleNearPlayer(cfg,player,minR=10,maxR=34,tries=42){
    const s=this.shared;if(!s)return null;
    for(let i=0;i<tries;i++){
      const a=this.rand()*Math.PI*2,r=minR+Math.sqrt(this.rand())*(maxR-minR),x=player.x+Math.cos(a)*r,z=player.z+Math.sin(a)*r;
      if(Math.hypot(x-s.W0.x,z-s.W0.z)>s.worldRadius-4)continue;
      const h=this.habitatAt(x,z),score=this.habitatScore(cfg,h);if(score<=0||this.rand()>score)continue;
      if(cfg.water&&!h.water)continue;if(!cfg.water&&h.water&&!cfg.hover)continue;
      const y=cfg.water?s.WL+(cfg.waterOffset||0):h.gh;
      return {x,y,z,h};
    }
    return null;
  }

  clipFor(a,spec){
    if(!spec)return null;const [suffix,occ=0]=spec,name=a.id+'_'+suffix,all=a.template.clips.filter(c=>c.name===name);return all[occ]||all[0]||null;
  }

  play(a,role){
    const spec=role==='idle'?['Idle',0]:a.cfg[role];const clip=this.clipFor(a,spec);if(!clip)return;
    const next=a.mixer.clipAction(clip);if(a.action===next&&next.isRunning())return;
    if(a.action){a.action.fadeOut(.12);}
    next.reset().fadeIn(.12);const once=role==='action';next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);next.clampWhenFinished=once;next.enabled=true;next.play();a.action=next;a.role=role;
    if(once)a.decision=Math.max(.45,clip.duration+.12);
  }

  createAnimal(id,cfg,pos){
    const template=this.templates.get(id);if(!template)return null;
    const wrapper=new THREE.Group();wrapper.name=`Wildlife_${id}_${++this.instanceNo}`;
    const visual=template.model.clone(true);visual.position.set(0,0,0);visual.rotation.set(0,0,0);visual.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(visual),size=new THREE.Vector3();box.getSize(size);const maxDim=Math.max(size.x,size.y,size.z,.001);visual.scale.multiplyScalar(cfg.targetSize/maxDim);
    visual.traverse(o=>{if(o.isMesh){o.castShadow=cfg.targetSize>.30;o.receiveShadow=cfg.targetSize>.34;o.frustumCulled=true;}});
    wrapper.add(visual);wrapper.position.set(pos.x,pos.y,pos.z);wrapper.rotation.y=this.rand()*Math.PI*2;this.scene.add(wrapper);
    const a={id,cfg,template,root:wrapper,visual,mixer:new THREE.AnimationMixer(visual),action:null,role:'idle',decision:1.2+this.rand()*3,target:null,start:null,startDist:0,moveTime:0,moveDuration:0,fleeing:false,seed:this.rand()*100};
    if(cfg.hover&&!cfg.water)wrapper.position.y=this.world.groundHeight(pos.x,pos.z)+(cfg.airHeight||.6);
    this.animals.push(a);this.play(a,'idle');return a;
  }

  despawn(a){const i=this.animals.indexOf(a);if(i>=0)this.animals.splice(i,1);a.mixer.stopAllAction();a.root.removeFromParent();}

  chooseMoveTarget(a,player,{flee=false}={}){
    const cfg=a.cfg,origin=a.root.position;let best=null;
    for(let i=0;i<30;i++){
      let ang,dist;if(flee){const away=Math.atan2(origin.z-player.z,origin.x-player.x);ang=away+(this.rand()-.5)*1.15;dist=8+this.rand()*8;}else{ang=this.rand()*Math.PI*2;dist=3+this.rand()*8;}
      const x=origin.x+Math.cos(ang)*dist,z=origin.z+Math.sin(ang)*dist,h=this.habitatAt(x,z),score=this.habitatScore(cfg,h);if(score<=.25||this.rand()>score)continue;if(cfg.water&&!h.water)continue;if(!cfg.water&&h.water&&!cfg.hover)continue;
      best={x,y:cfg.water?this.shared.WL+(cfg.waterOffset||0):h.gh,z};break;
    }
    if(!best)return false;
    a.start=a.root.position.clone();a.target=new THREE.Vector3(best.x,best.y,best.z);a.startDist=Math.max(.01,a.root.position.distanceTo(a.target));a.moveTime=0;
    const speed=flee?cfg.fleeSpeed:cfg.speed;a.moveDuration=a.startDist/Math.max(.15,speed);a.fleeing=flee;
    this.play(a,flee?'flee':'move');return true;
  }

  settle(a){a.target=null;a.start=null;a.fleeing=false;a.decision=1.4+this.rand()*4.2;this.play(a,'idle');}

  updateAnimal(a,dt,time,player){
    a.mixer.update(dt);const cfg=a.cfg,dx=a.root.position.x-player.x,dz=a.root.position.z-player.z,pd=Math.hypot(dx,dz);
    if(pd<cfg.reaction&&!a.fleeing){if(this.chooseMoveTarget(a,player,{flee:true}))a.decision=4;}
    if(a.target){
      a.moveTime+=dt;const tx=a.target.x-a.root.position.x,tz=a.target.z-a.root.position.z,d=Math.hypot(tx,tz),speed=a.fleeing?cfg.fleeSpeed:cfg.speed;
      if(d<.12||a.moveTime>a.moveDuration+1.2){this.settle(a);}else{
        const step=Math.min(d,speed*dt),nx=tx/Math.max(d,.0001),nz=tz/Math.max(d,.0001);a.root.position.x+=nx*step;a.root.position.z+=nz*step;
        a.root.rotation.y=angleLerp(a.root.rotation.y,Math.atan2(nx,nz),Math.min(1,dt*7));
        const ground=this.world.groundHeight(a.root.position.x,a.root.position.z),p=clamp(a.moveTime/Math.max(.01,a.moveDuration));
        if(cfg.water)a.root.position.y=this.shared.WL+(cfg.waterOffset||0)+Math.sin(time*1.7+a.seed)*(cfg.waterBob??.012);
        else if(cfg.hover)a.root.position.y=ground+(cfg.airHeight||.6)+Math.sin(time*2.1+a.seed)*.10;
        else if(cfg.bird&&(a.role==='flee'||cfg.airRoam))a.root.position.y=ground+Math.sin(p*Math.PI)*(cfg.flightHeight||1.4);
        else a.root.position.y=ground;
      }
      return;
    }
    if(cfg.hover&&!cfg.water)a.root.position.y=this.world.groundHeight(a.root.position.x,a.root.position.z)+(cfg.airHeight||.6)+Math.sin(time*2+a.seed)*.08;
    else if(cfg.water)a.root.position.y=this.shared.WL+(cfg.waterOffset||0)+Math.sin(time*1.4+a.seed)*(cfg.waterBob??.012);
    else a.root.position.y=this.world.groundHeight(a.root.position.x,a.root.position.z);
    a.decision-=dt;if(a.decision>0)return;
    const r=this.rand();if(r<.38&&a.cfg.action){this.play(a,'action');a.decision=Math.max(a.decision,1.5+this.rand()*2);}else if(r<.84){if(!this.chooseMoveTarget(a,player))a.decision=1+this.rand()*2;}else{this.play(a,'idle');a.decision=1.8+this.rand()*4;}
  }

  spawnOne(player){const pick=this.chooseSpecies();if(!pick)return false;const [id,cfg]=pick,pos=this.sampleNearPlayer(cfg,player);if(!pos)return false;return !!this.createAnimal(id,cfg,pos);}

  update(dt,time,player){
    if(!this.active||!this.ready||!player)return;
    for(const a of [...this.animals]){
      const d=Math.hypot(a.root.position.x-player.x,a.root.position.z-player.z);if(d>58||this.periodWeight(a.cfg)<=0){this.despawn(a);continue;}this.updateAnimal(a,dt,time,player);
    }
    this.spawnClock+=dt;if(this.animals.length<this.maxActive&&this.spawnClock>=this.spawnEvery){this.spawnClock=0;for(let k=0;k<3&&this.animals.length<this.maxActive;k++)if(this.spawnOne(player))break;}
    if(this._dev){this._devUiClock+=dt;if(this._devUiClock>.25){this._devUiClock=0;this.updateDevOverlay();}}
  }

  updateDevOverlay(){
    if(!this._devEl)return;const counts={};for(const a of this.animals)counts[a.id]=(counts[a.id]||0)+1;
    const line=Object.entries(counts).map(([k,v])=>`${k}${v>1?'×'+v:''}`).join(' · ')||'none';
    this._devEl.textContent=`WILDLIFE DEV · ${this.period.toUpperCase()} · ${this.animals.length}/${this.maxActive}\n${line}\nV period · R respawn · K clear`;
  }
}
