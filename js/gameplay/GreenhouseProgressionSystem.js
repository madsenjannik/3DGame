// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { damp } from '../visual/VisualKit.js';

const STORAGE_KEY='dym-gh-level';
const ROOT_X=6.5;
const ROOT_Z=-11.2;
const FRONT=[0.86,0.86,1.65,2.52];
const INTERACTION_PAD=.70;
const INTERACTION_RADIUS=1.90;

const wall=(ax,az,bx,bz,half=.09)=>({kind:'wall',ax,az,bx,bz,half});
const solid=(minX,minZ,maxX,maxZ)=>({kind:'solid',minX,minZ,maxX,maxZ});

// v0.3.31: exact greenhouse collision derived from the authored L1/L2/L3
// module dimensions. Outer glass/frame walls are continuous solid wall zones;
// only the actual authored door openings remain passable. Interior props that
// were collidable in v0.3.30 remain simple solids/walls.
const COLLISION=[
  null,
  (()=>{const hw=.86,hd=.86,DP=.42,ix=hw-.4;return[
    wall(-hw,-hd, hw,-hd),
    wall(-hw,-hd,-hw, hd),
    wall( hw,-hd, hw, hd),
    wall(-hw, hd,-DP, hd),
    wall( DP, hd, hw, hd),
    // authored shelf/support footprint
    wall(-ix,-hd,-ix,hd,.055),wall(ix,-hd,ix,hd,.055),wall(-ix,-hd+.4,ix,-hd+.4,.055)
  ];})(),
  (()=>{const hw=1.254,hd=1.65,DP=.46,BX=hw+.46,BZ=hd-.5;return[
    wall(-hw,-hd, hw,-hd),
    wall(-hw,-hd,-hw, hd),
    wall( hw,-hd, hw, hd),
    wall(-hw, hd,-DP, hd),
    wall( DP, hd, hw, hd),
    // authored plant table / planter / barrel footprints
    wall(-hw+.06,-1.43,-hw+.66,-1.43,.06),
    wall(-hw+.66,-1.43,-hw+.66,.99,.06),
    wall(-hw+.66,.99,-hw+.06,.99,.06),
    wall(hw-.06,-1.43,hw-.61,-1.43,.06),
    wall(hw-.61,-1.43,hw-.61,.99,.06),
    wall(hw-.61,.99,hw-.06,.99,.06),
    solid(BX-.3,BZ-.3,BX+.3,BZ+.3)
  ];})(),
  (()=>{const X=3,ZB=-2.5,ZF=1.5,ZC=2.52,HC=2,DW=.97,LW=.958,sw=Math.PI-1.9;return[
    wall(-X,ZB, X,ZB),
    wall(-X,ZB,-X,ZF),wall(X,ZB,X,ZF),
    wall(-X,ZF,-HC,ZF),wall(X,ZF,HC,ZF),
    wall(-HC,ZF,-HC,ZC),wall(HC,ZF,HC,ZC),
    wall(-HC,ZC,-DW,ZC),wall(DW,ZC,HC,ZC),
    // authored double doors rest open outward in Idle and remain physical
    wall(-DW,ZC,-DW-LW*Math.cos(sw),ZC+LW*Math.sin(sw),.06),
    wall( DW,ZC, DW+LW*Math.cos(sw),ZC+LW*Math.sin(sw),.06),
    // bistro furniture footprint
    solid(.8,-1.75,2.7,-.85)
  ];})()
];

const ASSETS={
  1:'./assets/greenhouses/greenhouse-l1.glb',
  2:'./assets/greenhouses/greenhouse-l2.glb',
  3:'./assets/greenhouses/greenhouse-l3.glb'
};

// Camera uses only the exterior authored shell. Interior shelves/furniture remain
// traversal collision where appropriate but must never collapse the chase camera.
const CAMERA_COLLISION=[null,COLLISION[1].slice(0,5),COLLISION[2].slice(0,5),COLLISION[3].slice(0,9)];

function segmentIntersectionT2D(ax,az,bx,bz,cx,cz,dx,dz){
  const rx=bx-ax,rz=bz-az,sx=dx-cx,sz=dz-cz;
  const den=rx*sz-rz*sx;if(Math.abs(den)<1e-8)return null;
  const qx=cx-ax,qz=cz-az;
  const t=(qx*sz-qz*sx)/den,u=(qx*rz-qz*rx)/den;
  if(t<0||t>1||u<0||u>1)return null;
  return t;
}

function clipAction(entry,name){return entry.actions.get(name)||null;}

export class GreenhouseProgressionSystem {
  constructor(scene,{state,world}){
    this.scene=scene;this.state=state;this.world=world;
    this.entries=new Map();this.level=0;this.anim=null;this.cameraExtra=0;this.interaction=null;
    this.origin=new THREE.Vector3(ROOT_X,0,ROOT_Z);
    const params=new URLSearchParams(location.search);
    this.devMode=params.get('dev')==='1';
    this.devEphemeral=this.devMode&&params.get('ghpersist')!=='1'&&params.has('ghlevel');
    this.levelOverride=this.devMode&&params.has('ghlevel');
  }

  async init(){
    await Promise.all([1,2,3].map(level=>this.load(level)));
    this.level=this.readInitialLevel();
    this.applyStableLevel(this.level);
    this.syncCollision();
    return this;
  }

  readInitialLevel(){
    const params=new URLSearchParams(location.search);
    if(this.devMode&&params.get('ghreset')==='1'){
      try{localStorage.removeItem(STORAGE_KEY);}catch(e){console.warn('[TGW] Greenhouse save could not be cleared',e);}
      return 0;
    }
    const query=this.devMode?params.get('ghlevel'):null;
    if(query!==null)return THREE.MathUtils.clamp(parseInt(query,10)||0,0,3);
    try{return THREE.MathUtils.clamp(parseInt(localStorage.getItem(STORAGE_KEY)||'0',10)||0,0,3);}catch(_){return 0;}
  }

  async load(level){
    const gltf=await new GLTFLoader().loadAsync(ASSETS[level]);
    const root=gltf.scene;
    root.name=`GreenhouseProgression_L${level}`;
    root.position.copy(this.origin);
    root.visible=false;
    root.traverse(o=>{
      if(!o.isMesh)return;
      const glassy=/Cover|Door_Panel|Door_Roll|Ghost|Glass|Roof|Lights/i.test(o.name||'');
      o.castShadow=!glassy;
      o.receiveShadow=true;
    });
    this.scene.add(root);
    const mixer=new THREE.AnimationMixer(root);
    const actions=new Map();
    for(const clip of gltf.animations||[]){
      const action=mixer.clipAction(clip);
      actions.set(clip.name,action);
    }
    root.updateMatrixWorld(true);
    const entry={level,root,mixer,actions,clips:gltf.animations||[],cameraBox:new THREE.Box3().setFromObject(root)};
    this.entries.set(level,entry);
  }

  hideAll(){for(const e of this.entries.values()){e.root.visible=false;e.mixer.stopAllAction();}}

  playLoop(entry,name){
    entry.mixer.stopAllAction();
    const action=clipAction(entry,name);if(!action)return null;
    action.reset();action.enabled=true;action.setEffectiveWeight(1);action.setLoop(THREE.LoopRepeat,Infinity);action.clampWhenFinished=false;action.play();
    entry.mixer.update(0);
    return action;
  }

  playOnce(entry,name){
    entry.mixer.stopAllAction();
    const action=clipAction(entry,name);if(!action)return null;
    action.reset();action.enabled=true;action.setEffectiveWeight(1);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
    entry.mixer.update(0);
    return action;
  }

  applyStableLevel(level){
    this.hideAll();
    const shown=level===0?1:level;
    const entry=this.entries.get(shown);if(!entry)return;
    entry.root.visible=true;
    if(level===0)this.playLoop(entry,'Locked');
    else this.playLoop(entry,'Idle');
  }

  persist(){if(this.devEphemeral||this.levelOverride)return;try{localStorage.setItem(STORAGE_KEY,String(this.level));}catch(e){console.warn('[TGW] Greenhouse progress could not be saved',e);}}

  startUpgrade(){
    if(this.anim||this.level>=3)return false;
    const from=this.level,to=from+1,entry=this.entries.get(to);if(!entry)return false;
    const previous=this.entries.get(from===0?1:from);
    if(previous&&previous!==entry){previous.root.visible=false;previous.mixer.stopAllAction();}
    entry.root.visible=false;
    const action=this.playOnce(entry,'Unlock');
    const duration=action?.getClip()?.duration||[0,3.7,4.8,5.6][to];
    entry.root.visible=true;
    this.anim={from,to,entry,action,t:0,duration};
    this.state.events.emit('greenhouse:upgrade-started',{from,to,duration});
    this.syncCollision();
    return true;
  }

  finishUpgrade(){
    const a=this.anim;if(!a)return;
    this.level=a.to;
    this.anim=null;
    this.persist();
    this.applyStableLevel(this.level);
    this.syncCollision();
    this.state.events.emit('greenhouse:level-changed',{level:this.level,from:a.from});
  }

  interactionPoint(level=this.level){
    return {x:ROOT_X,z:ROOT_Z+FRONT[level]+INTERACTION_PAD};
  }

  collisionLevel(){
    if(!this.anim)return this.level;
    return this.anim.t>this.anim.duration*.85?this.anim.to:this.anim.from;
  }

  syncCollision(){
    const level=this.collisionLevel();
    this.world.setGreenhouseCollision?.(COLLISION[level],ROOT_X,ROOT_Z);
  }

  update(dt,time,character){
    for(const e of this.entries.values())if(e.root.visible)e.mixer.update(dt);
    if(this.anim){
      this.anim.t+=dt;
      this.syncCollision();
      if(this.anim.t>=this.anim.duration-.025)this.finishUpgrade();
    }
    const targetCamera=this.anim?2.4:0;
    this.cameraExtra+=(targetCamera-this.cameraExtra)*damp(1.5,dt);

    this.interaction=null;
    if(!this.anim&&this.level<3&&character){
      const p=this.interactionPoint();
      const d=Math.hypot(character.position.x-p.x,character.position.z-p.z);
      if(d<INTERACTION_RADIUS)this.interaction={type:'greenhouse',label:this.level===0?'Byg drivhus':'Opgrader drivhus',distance:d};
    }
    return {interaction:this.interaction,level:this.level,animating:!!this.anim,cameraExtra:this.cameraExtra};
  }

  interact(){return this.startUpgrade();}

  // R21C: exact exterior-wall camera proxy. The old whole-model Box3 made the
  // traversable greenhouse interior behave like one solid camera blocker.
  cameraOcclusionDistance(start,end,maxDist,margin=.20){
    if(this.world?.space!=='garden')return maxDist;
    const shown=this.anim?.to||(this.level===0?1:this.level),shapes=CAMERA_COLLISION[shown]||[];
    const ax=start.x-ROOT_X,az=start.z-ROOT_Z,bx=end.x-ROOT_X,bz=end.z-ROOT_Z;
    let best=maxDist;
    for(const shape of shapes){
      if(shape.kind!=='wall')continue;
      const t=segmentIntersectionT2D(ax,az,bx,bz,shape.ax,shape.az,shape.bx,shape.bz);if(t==null)continue;
      const y=start.y+(end.y-start.y)*t;
      if(y<-.10-margin||y>4.2+margin)continue;
      best=Math.min(best,Math.max(0,maxDist*t));
    }
    return best;
  }

  // Retained for compatibility/debug tooling; normal traversal camera no longer uses it.
  cameraOcclusionBox(){
    const shown=this.anim?.to||(this.level===0?1:this.level);
    return this.entries.get(shown)?.cameraBox||null;
  }

  applyCamera(camera,followCamera){
    if(this.cameraExtra<.005||!followCamera)return;
    const away=new THREE.Vector3().subVectors(camera.position,followCamera.look);
    const len=away.length();if(len<1e-4)return;
    away.multiplyScalar(this.cameraExtra/len);
    camera.position.add(away);
    camera.lookAt(followCamera.look);
  }
}
