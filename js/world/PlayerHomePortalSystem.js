// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const HOME_Z=4.70;
const WORLD_GATE_LOCAL_Z=6.10;
const GARDEN_GATE_Z=12.25;
const DOOR_RADIUS=2.15;
const HOME_STRUCTURAL_HALF_SIZE=2.0;
const MOVE_IN_STORAGE_VERSION='v1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PREFIX={tulip:'Tulip',daisy:'Daisy',hyacinth:'Hyacinth',cactus:'Cactus',fern:'Fern',succulent:'Succulent',spire:'Spire',swamp:'Swamp',aloe:'Aloe'};

function setShadows(root){root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});}
function resolveSegment(p,s,radius){
  const vx=s.bx-s.ax,vz=s.bz-s.az,den=vx*vx+vz*vz;
  let t=den?((p.x-s.ax)*vx+(p.z-s.az)*vz)/den:0;t=Math.max(0,Math.min(1,t));
  const cx=s.ax+vx*t,cz=s.az+vz*t,dx=p.x-cx,dz=p.z-cz,d=Math.hypot(dx,dz),R=radius+(s.half??.07);
  if(d>=R)return;const len=Math.max(1e-5,Math.hypot(vx,vz)),nx=d>1e-5?dx/d:-vz/len,nz=d>1e-5?dz/d:vx/len;
  p.x=cx+nx*R;p.z=cz+nz*R;
}
function boxSegments(box,half=.08){
  return [
    {ax:box.min.x,az:box.min.z,bx:box.max.x,bz:box.min.z,half},
    {ax:box.min.x,az:box.max.z,bx:box.max.x,bz:box.max.z,half},
    {ax:box.min.x,az:box.min.z,bx:box.min.x,bz:box.max.z,half},
    {ax:box.max.x,az:box.min.z,bx:box.max.x,bz:box.max.z,half}
  ];
}

// R24C: Claude-authored homes share a canonical 4 x 4 m structural shed footprint
// centered on the GLB root. Decorative roofs/leaves/smoke may extend well beyond it,
// so player collision must not be derived from the full visual Box3. Camera occlusion
// still uses the complete visual shed bounds below.
function structuralFootprintSegments(root,halfSize=HOME_STRUCTURAL_HALF_SIZE,half=.07){
  if(!root)return[];root.updateWorldMatrix(true,false);
  const pts=[[-halfSize,-halfSize],[halfSize,-halfSize],[halfSize,halfSize],[-halfSize,halfSize]].map(([x,z])=>root.localToWorld(new THREE.Vector3(x,0,z)));
  return [
    {ax:pts[0].x,az:pts[0].z,bx:pts[1].x,bz:pts[1].z,half},
    {ax:pts[1].x,az:pts[1].z,bx:pts[2].x,bz:pts[2].z,half},
    {ax:pts[2].x,az:pts[2].z,bx:pts[3].x,bz:pts[3].z,half},
    {ax:pts[3].x,az:pts[3].z,bx:pts[0].x,bz:pts[0].z,half}
  ];
}

// R21C: derive world-home fence collision from the actual authored fence mesh.
// Earlier code approximated the entire Yard with an AABB and assumed a centered gate;
// several PT1 homes have an offset/open gate, leaving visible fence sections walk-through.
function buildFenceSegments(yard){
  if(!yard)return[];yard.updateMatrixWorld(true);
  const candidates=[];
  yard.traverse(o=>{
    if(!o.isMesh||!o.geometry?.attributes?.position)return;
    const b=new THREE.Box3().setFromObject(o),size=new THREE.Vector3();b.getSize(size);
    // All nine authored PT1 fence meshes wrap the ~6 x 5.5 m front yard and are
    // roughly 0.8 m tall. The threshold excludes themed plants/props inside the yard.
    if(size.x>=5.6&&size.z>=5.0&&size.y>=.58&&size.y<=1.15)candidates.push({o,b,score:size.x*size.z});
  });
  if(!candidates.length)return[];
  candidates.sort((a,b)=>b.score-a.score);const mesh=candidates[0].o,fb=candidates[0].b;
  mesh.updateWorldMatrix(true,false);
  const h=Math.max(.01,fb.max.y-fb.min.y),planes=[fb.min.y+h*.24,fb.min.y+h*.50,fb.min.y+h*.76];
  const g=mesh.geometry,pos=g.attributes.position,idx=g.index,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),tmp=new THREE.Vector3();
  const raw=[],eps=1e-6;
  const intersectEdge=(p,q,y,pts)=>{
    const dp=p.y-y,dq=q.y-y;if(Math.abs(dp)<eps&&Math.abs(dq)<eps){pts.push({x:p.x,z:p.z});pts.push({x:q.x,z:q.z});return;}
    if(dp*dq>0)return;const den=q.y-p.y;if(Math.abs(den)<eps)return;const t=(y-p.y)/den;if(t<-eps||t>1+eps)return;
    tmp.copy(p).lerp(q,THREE.MathUtils.clamp(t,0,1));pts.push({x:tmp.x,z:tmp.z});
  };
  const triCount=idx?Math.floor(idx.count/3):Math.floor(pos.count/3);
  for(let ti=0;ti<triCount;ti++){
    const ia=idx?idx.getX(ti*3):ti*3,ib=idx?idx.getX(ti*3+1):ti*3+1,ic=idx?idx.getX(ti*3+2):ti*3+2;
    a.fromBufferAttribute(pos,ia).applyMatrix4(mesh.matrixWorld);b.fromBufferAttribute(pos,ib).applyMatrix4(mesh.matrixWorld);c.fromBufferAttribute(pos,ic).applyMatrix4(mesh.matrixWorld);
    const minY=Math.min(a.y,b.y,c.y),maxY=Math.max(a.y,b.y,c.y);
    for(const y of planes){
      if(y<minY-eps||y>maxY+eps)continue;const pts=[];intersectEdge(a,b,y,pts);intersectEdge(b,c,y,pts);intersectEdge(c,a,y,pts);
      const uniq=[];for(const q of pts)if(!uniq.some(r=>Math.hypot(q.x-r.x,q.z-r.z)<1e-5))uniq.push(q);if(uniq.length<2)continue;
      let p1=null,p2=null,best=0;for(let i=0;i<uniq.length;i++)for(let j=i+1;j<uniq.length;j++){const d=Math.hypot(uniq[j].x-uniq[i].x,uniq[j].z-uniq[i].z);if(d>best){best=d;p1=uniq[i];p2=uniq[j];}}
      if(p1&&p2&&best>=.035)raw.push({ax:p1.x,az:p1.z,bx:p2.x,bz:p2.z,half:.055});
    }
  }
  const seen=new Map(),Q=.025;
  for(const seg of raw){
    const p1=[Math.round(seg.ax/Q),Math.round(seg.az/Q)],p2=[Math.round(seg.bx/Q),Math.round(seg.bz/Q)];
    const key=(p1[0]<p2[0]||(p1[0]===p2[0]&&p1[1]<=p2[1]))?`${p1[0]},${p1[1]}:${p2[0]},${p2[1]}`:`${p2[0]},${p2[1]}:${p1[0]},${p1[1]}`;
    if(!seen.has(key))seen.set(key,seg);
  }
  return [...seen.values()];
}

export class PlayerHomePortalSystem{
  constructor(scene,{world,state,characterId,onSpaceChanged,moveInEnabled=true}={}){
    this.scene=scene;this.world=world;this.state=state;this.characterId=characterId||state?.player?.characterId||'succulent';
    this.prefix=PREFIX[this.characterId]||'Succulent';this.onSpaceChanged=onSpaceChanged||(()=>{});
    this.worldHome=null;this.gardenHome=null;this.worldMixer=null;this.gardenMixer=null;this.clips=[];this.busy=false;
    this.moveInEnabled=moveInEnabled!==false;this.moveInKey=`dym.homeMovedIn.${MOVE_IN_STORAGE_VERSION}.${this.characterId}`;this.moveInPending=this.moveInEnabled&&!this.hasMovedIn();this.moveInActive=false;this.moveInPhase='idle';this.moveInElapsed=0;this.moveInDuration=0;this.moveInAction=null;
    this.moveInCameraTarget=new THREE.Vector3();this.moveInCameraDir=new THREE.Vector3();this.moveInCameraPos=new THREE.Vector3();this.moveInExitStartPos=new THREE.Vector3();this.moveInExitStartLook=new THREE.Vector3();this.moveInExitPos=new THREE.Vector3();this.moveInExitLook=new THREE.Vector3();this.moveInCameraDistance=10;
    this.worldDoorPoint=new THREE.Vector3();this.gardenDoorPoint=new THREE.Vector3();this.worldSegments=[];this.gardenSegments=[];this.worldCameraBox=null;this.gardenCameraBox=null;
    // Future access hooks: private by default. The state shape already reserves team,
    // alliance and explicit grants so multiplayer permissions can be connected later
    // without changing the door/space-transition architecture.
    const access=state?.homeAccess||{};
    this.accessPolicy={mode:access.mode||'private',owner:'self',allowTeam:!!access.allowTeam,allowAlliance:!!access.allowAlliance,grants:new Set(access.grants||[])};
    this.fade=this.createFade();
  }

  assetUrl(){return `./assets/homes/shed_${this.characterId}.glb`;}
  hasMovedIn(){try{return localStorage.getItem(this.moveInKey)==='1';}catch{return false;}}
  markMovedIn(){try{localStorage.setItem(this.moveInKey,'1');}catch{}}
  usesMoveInCamera(){return this.moveInActive;}
  canEnter(visitor='self'){
    if(visitor==='self'||visitor?.isOwner)return true;const id=typeof visitor==='string'?visitor:visitor?.id;
    if(id&&this.accessPolicy.grants.has(id))return true;if(this.accessPolicy.allowTeam&&visitor?.isTeam)return true;if(this.accessPolicy.allowAlliance&&visitor?.isAlliance)return true;return false;
  }

  createFade(){
    const root=document.createElement('div');root.id='dym-space-transition';
    root.style.cssText='position:fixed;inset:0;z-index:12000;display:grid;place-items:center;background:#dde4d6;opacity:0;pointer-events:none;transition:opacity .36s ease;';
    const label=document.createElement('div');label.style.cssText='padding:11px 16px;border-radius:12px;background:rgba(35,38,31,.88);color:#f4f1e8;font:700 13px/1.15 Manrope,system-ui,sans-serif;letter-spacing:.03em;opacity:0;transition:opacity .18s ease;';root.appendChild(label);document.body.appendChild(root);
    return {root,label};
  }
  async fadeTo(v,text=''){
    if(text){this.fade.label.textContent=text;this.fade.label.style.opacity='1';}else this.fade.label.style.opacity='0';
    this.fade.root.style.opacity=String(v);await sleep(v?390:370);
  }

  async init(){
    const gltf=await new GLTFLoader().loadAsync(this.assetUrl());this.clips=gltf.animations||[];
    this.worldHome=gltf.scene;this.worldHome.name=`PLAYER_HOME_WORLD_${this.characterId}`;setShadows(this.worldHome);
    this.worldHome.position.set(0,0,HOME_Z);this.worldHome.rotation.y=0;this.world.sharedLandscape.root.add(this.worldHome);

    this.gardenHome=gltf.scene.clone(true);this.gardenHome.name=`PLAYER_HOME_GARDEN_${this.characterId}`;setShadows(this.gardenHome);
    const gyard=this.gardenHome.getObjectByName(`${this.prefix}_Yard`);if(gyard)gyard.visible=false;
    this.world.privateRoot.add(this.gardenHome);

    this.worldMixer=new THREE.AnimationMixer(this.worldHome);this.gardenMixer=new THREE.AnimationMixer(this.gardenHome);
    this.playIdle(this.gardenMixer,this.gardenHome);

    // Build collision/camera data from the authored final pose before R24 can prime the
    // first-arrival MoveIn clip at its tiny frame-zero scale. Collision therefore stays
    // identical to the approved R23O home baseline throughout the cinematic.
    this.alignGardenHome();this.rebuildCollision();this.world.setHomeCollisionResolver((p,radius)=>this.resolveCollisions(p,radius));
    // R24B: all nine homes share the authored yard/gate origin. Start every character
    // at the same canonical point centered between the two front gate posts.
    const start=this.worldSpawn();const sy=this.world.groundHeight(start.x,start.z);
    this.state.player.position={x:start.x,y:sy,z:start.z};
    this.world.setSpace('world');this.onSpaceChanged('world');

    if(this.moveInPending)this.primeMoveIn();
    else this.playIdle(this.worldMixer,this.worldHome);
    return this;
  }

  clip(name){return this.clips.find(c=>c.name===name)||null;}
  playIdle(mixer,root){const c=this.clip('Idle');if(!c)return null;const a=mixer.clipAction(c,root);a.reset().setLoop(THREE.LoopRepeat,Infinity).play();return a;}
  stopIdle(mixer,root){const c=this.clip('Idle');if(c)mixer.clipAction(c,root).stop();}
  stopDoorActions(mixer,root){for(const n of ['Door_Open','Door_Close']){const c=this.clip(n);if(c)mixer.clipAction(c,root).stop();}}
  playOnce(mixer,root,name,{hold=false}={}){const c=this.clip(name);if(!c)return null;if(name.startsWith('Door_'))this.stopDoorActions(mixer,root);const a=mixer.clipAction(c,root);a.reset();a.enabled=true;a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=hold;a.play();return a;}
  setDoorPose(mixer,root,open){const c=this.clip(open?'Door_Open':'Door_Close');if(!c)return;this.stopDoorActions(mixer,root);const a=mixer.clipAction(c,root);a.reset().play();a.time=c.duration;mixer.update(0);a.paused=true;}

  primeMoveIn(){
    const c=this.clip('MoveIn');if(!c){this.moveInPending=false;this.playIdle(this.worldMixer,this.worldHome);return false;}
    this.stopIdle(this.worldMixer,this.worldHome);this.stopDoorActions(this.worldMixer,this.worldHome);
    const a=this.worldMixer.clipAction(c,this.worldHome);a.reset();a.enabled=true;a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();
    this.worldMixer.update(0);a.paused=true;this.moveInAction=a;this.moveInDuration=Math.max(.01,c.duration||3.2);this.busy=true;return true;
  }

  prepareMoveInCamera(camera,character){
    if(!this.moveInPending||!camera||!character)return false;
    // Frame the complete authored home (shed + front yard) from the gate side so the
    // player's first spawn remains in the foreground while the home grows into place.
    const box=this.worldCameraBox?this.worldCameraBox.clone():new THREE.Box3().setFromObject(this.worldHome);
    const yard=this.worldHome.getObjectByName(`${this.prefix}_Yard`);if(yard)box.union(new THREE.Box3().setFromObject(yard));
    const size=new THREE.Vector3(),center=new THREE.Vector3();box.getSize(size);box.getCenter(center);
    this.moveInCameraTarget.copy(center);this.moveInCameraTarget.y=box.min.y+size.y*.43;
    const radius=Math.max(3.2,.5*Math.hypot(size.x,size.y,size.z));
    const vfov=THREE.MathUtils.degToRad(camera.fov||48),aspect=Math.max(.55,camera.aspect||1);
    const fitV=radius/Math.max(.28,Math.sin(vfov*.5)),fitH=radius/Math.max(.28,Math.sin(Math.atan(Math.tan(vfov*.5)*aspect)));
    this.moveInCameraDistance=Math.max(8.5,Math.max(fitV,fitH)*.96);
    this.moveInCameraDir.set(.72,.28,1).normalize();this.applyMoveInCamera(camera,null,0);return true;
  }

  beginMoveIn(character,followCamera,camera,hud){
    if(!this.moveInPending||this.moveInActive)return false;
    if(!this.moveInAction&&!this.primeMoveIn())return false;
    this.busy=true;this.moveInActive=true;this.moveInPhase='build';this.moveInElapsed=0;
    this.stopIdle(this.worldMixer,this.worldHome);this.stopDoorActions(this.worldMixer,this.worldHome);
    const a=this.moveInAction;a.paused=false;a.reset();a.enabled=true;a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();
    hud?.setActionVisible?.(false,'');if(hud?.hint)hud.hint.style.opacity='0';
    this.prepareMoveInCamera(camera,character);
    const finished=e=>{if(e.action!==a)return;this.worldMixer.removeEventListener('finished',finished);this.finishMoveInBuild(character,followCamera,camera);};
    this.worldMixer.addEventListener('finished',finished);this._moveInFinished=finished;return true;
  }

  finishMoveInBuild(character,followCamera,camera){
    if(this.moveInPhase!=='build')return;
    this.moveInAction?.stop();this.moveInAction=null;this.playIdle(this.worldMixer,this.worldHome);this.markMovedIn();this.moveInPending=false;
    this.moveInPhase='outro';this.moveInElapsed=0;
    this.moveInExitStartPos.copy(camera.position);this.moveInExitStartLook.copy(this.moveInCameraTarget);
    followCamera.yaw=followCamera.wantedYaw();followCamera.desired(this.moveInExitPos);
    const h=followCamera.contract?.cameraTargetHeight||.62;this.moveInExitLook.set(character.position.x,character.position.y+h,character.position.z);
  }

  applyMoveInCamera(camera,followCamera,dt=0){
    if(!this.moveInActive&&!this.moveInPending)return false;
    if(this.moveInPhase==='outro'){
      this.moveInElapsed+=dt;const u=THREE.MathUtils.clamp(this.moveInElapsed/.58,0,1),e=u*u*(3-2*u);
      camera.position.lerpVectors(this.moveInExitStartPos,this.moveInExitPos,e);
      const look=new THREE.Vector3().lerpVectors(this.moveInExitStartLook,this.moveInExitLook,e);camera.lookAt(look);
      if(u>=1){this.moveInActive=false;this.moveInPhase='idle';this.busy=false;followCamera?.snap?.();}
      return true;
    }
    if(this.moveInPhase==='build')this.moveInElapsed=Math.min(this.moveInDuration,this.moveInElapsed+dt);
    const u=this.moveInDuration?THREE.MathUtils.clamp(this.moveInElapsed/this.moveInDuration,0,1):0,e=1-Math.pow(1-u,3);
    const angle=.11-.19*e,ca=Math.cos(angle),sa=Math.sin(angle),d=this.moveInCameraDir;
    const dx=d.x*ca+d.z*sa,dz=-d.x*sa+d.z*ca,dist=this.moveInCameraDistance*(1.07-.07*e);
    this.moveInCameraPos.set(this.moveInCameraTarget.x+dx*dist,this.moveInCameraTarget.y+d.y*dist,this.moveInCameraTarget.z+dz*dist);
    camera.position.copy(this.moveInCameraPos);camera.lookAt(this.moveInCameraTarget);return true;
  }

  alignGardenHome(){
    const door=this.gardenHome.getObjectByName(`${this.prefix}_Door`);if(!door)return;
    // The private-garden copy faces inward. Align its door exactly with the existing garden-path opening.
    const gateX=this.world.pathX(GARDEN_GATE_Z);this.gardenHome.rotation.y=Math.PI;
    this.gardenHome.position.set(gateX+door.position.x,0,GARDEN_GATE_Z+door.position.z);
    this.gardenHome.updateMatrixWorld(true);
  }

  rebuildCollision(){
    this.worldHome.updateMatrixWorld(true);this.gardenHome.updateMatrixWorld(true);
    const wshed=this.worldHome.getObjectByName(`${this.prefix}_Shed`),wyard=this.worldHome.getObjectByName(`${this.prefix}_Yard`),wdoor=this.worldHome.getObjectByName(`${this.prefix}_Door`);
    const gshed=this.gardenHome.getObjectByName(`${this.prefix}_Shed`),gdoor=this.gardenHome.getObjectByName(`${this.prefix}_Door`);
    if(wdoor)wdoor.getWorldPosition(this.worldDoorPoint);if(gdoor)gdoor.getWorldPosition(this.gardenDoorPoint);
    this.worldSegments=[];this.gardenSegments=[];
    // Keep the approved full visual bounds for camera retraction, but resolve player
    // collision against the shared 4 x 4 m structural shed footprint. This prevents
    // decorative Aloe/Hyacinth/Tulip/etc. geometry from creating invisible walls.
    if(wshed)this.worldCameraBox=new THREE.Box3().setFromObject(wshed);
    if(gshed)this.gardenCameraBox=new THREE.Box3().setFromObject(gshed);
    this.worldSegments.push(...structuralFootprintSegments(this.worldHome));
    this.gardenSegments.push(...structuralFootprintSegments(this.gardenHome));
    if(wyard){
      const exactFence=buildFenceSegments(wyard);
      if(exactFence.length)this.worldSegments.push(...exactFence);
      else{
        // Defensive fallback only; normal PT1 homes resolve from authored fence geometry.
        const b=new THREE.Box3().setFromObject(wyard),gateX=(b.min.x+b.max.x)/2,gate=.92,front=b.max.z,back=Math.max(b.min.z,wshed?new THREE.Box3().setFromObject(wshed).max.z-.15:b.min.z);
        this.worldSegments.push({ax:b.min.x,az:back,bx:b.min.x,bz:front,half:.055},{ax:b.max.x,az:back,bx:b.max.x,bz:front,half:.055});
        if(gateX-gate>b.min.x)this.worldSegments.push({ax:b.min.x,az:front,bx:gateX-gate,bz:front,half:.055});
        if(gateX+gate<b.max.x)this.worldSegments.push({ax:gateX+gate,az:front,bx:b.max.x,bz:front,half:.055});
      }
    }
  }

  resolveCollisions(p,radius=.3){const list=this.world.space==='garden'?this.gardenSegments:this.worldSegments;for(let pass=0;pass<2;pass++)for(const s of list)resolveSegment(p,s,radius);}
  cameraOcclusionBox(){return this.world.space==='garden'?this.gardenCameraBox:this.worldCameraBox;}

  interaction(position){
    if(this.busy||!position)return null;
    const garden=this.world.space==='garden',door=garden?this.gardenDoorPoint:this.worldDoorPoint,d=Math.hypot(position.x-door.x,position.z-door.z);
    if(d>DOOR_RADIUS)return null;
    if(garden)return {type:'home-exit',label:'Back to the world'};
    if(!this.canEnter('self'))return {type:'home-private',label:'Private garden',disabled:true};
    return {type:'home-enter',label:'Open your shed'};
  }

  worldSpawn({away=false}={}){
    // Canonical shared spawn for all authored sheds: local X=0 is exactly the gate
    // center, and Z=6.10 sits just outside the front fence opening. Derive world
    // position + heading from the home transform so this stays correct if the home
    // root is ever rotated without introducing per-character offsets.
    const p=new THREE.Vector3(0,0,WORLD_GATE_LOCAL_Z);
    if(this.worldHome){this.worldHome.updateWorldMatrix(true,false);this.worldHome.localToWorld(p);}
    else p.set(0,0,HOME_Z+WORLD_GATE_LOCAL_Z);
    const q=new THREE.Quaternion();if(this.worldHome)this.worldHome.getWorldQuaternion(q);
    const dir=new THREE.Vector3(0,0,away?1:-1).applyQuaternion(q);
    return {x:p.x,z:p.z,heading:Math.atan2(dir.x,dir.z)};
  }
  gardenSpawn(){const z=9.65,x=this.world.pathX(z);return {x,z,heading:Math.PI};}
  teleport(character,followCamera,p){
    const y=this.world.groundHeight(p.x,p.z);character.position.set(p.x,y,p.z);character.root.position.copy(character.position);character.heading=p.heading;character.root.rotation.y=p.heading;
    character.velocity.set(0,0,0);character.currentSpeed=0;character.hopOffset=0;character.hopVelocity=0;character.isGrounded=true;character.reverseCameraLatched=false;character.reverseIntentActive=false;
    character.state.player.position={x:p.x,y,z:p.z};followCamera?.snap?.();
  }

  async enter(character,followCamera,hud){
    if(this.busy||this.world.space!=='world')return;this.busy=true;hud?.setActionVisible?.(false,'');
    this.playOnce(this.worldMixer,this.worldHome,'Door_Open',{hold:true});await sleep(280);await this.fadeTo(1,'Opening your garden…');
    this.world.setSpace('garden');this.onSpaceChanged('garden');this.setDoorPose(this.gardenMixer,this.gardenHome,true);this.teleport(character,followCamera,this.gardenSpawn());
    await sleep(70);await this.fadeTo(0);await sleep(110);this.playOnce(this.gardenMixer,this.gardenHome,'Door_Close');hud?.showToast?.('Your private garden');this.busy=false;
  }

  async exit(character,followCamera,hud){
    if(this.busy||this.world.space!=='garden')return;this.busy=true;hud?.setActionVisible?.(false,'');
    this.playOnce(this.gardenMixer,this.gardenHome,'Door_Open',{hold:true});await sleep(280);await this.fadeTo(1,'Back to the shared world…');
    this.world.setSpace('world');this.onSpaceChanged('world');this.setDoorPose(this.worldMixer,this.worldHome,true);this.teleport(character,followCamera,this.worldSpawn({away:true}));
    await sleep(70);await this.fadeTo(0);await sleep(110);this.playOnce(this.worldMixer,this.worldHome,'Door_Close');hud?.showToast?.('Shared world');this.busy=false;
  }

  interact(type,character,followCamera,hud){if(type==='home-enter')return this.enter(character,followCamera,hud);if(type==='home-exit')return this.exit(character,followCamera,hud);}
  update(dt){this.worldMixer?.update(dt);this.gardenMixer?.update(dt);}
}
