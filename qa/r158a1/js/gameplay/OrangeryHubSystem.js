// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyGlassGlint } from '../../assets/hubs/orangeri/shaders/glass_glint.js';

const BASE='./assets/hubs/orangeri/';
const DEFAULT_STAGE=5; // Candidate presentation stage: fills the dome, lantern still intact.
const BREAK_STAGE=6;
const BODY_Y_MIN=.30;
const BODY_Y_MAX=1.72;
// R4 building collision: horizontal slices through the actual GLB at body height.
// One low slice catches the stone/plinth; one torso slice catches visible glass/frames.
const BUILDING_SLICE_Y=[.34,1.15];
const DOOR_PORTAL={minX:-1.74,maxX:1.74,minZ:7.68,maxZ:8.44};

function setShadow(root){
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
}

function setNamedVisibility(root,name,visible){
  const n=root.getObjectByName(name);if(n)n.visible=visible;
}

function pointSegmentPush(p,ax,az,bx,bz,rr){
  const vx=bx-ax,vz=bz-az,den=vx*vx+vz*vz;
  let t=den>1e-8?((p.x-ax)*vx+(p.z-az)*vz)/den:0;t=Math.max(0,Math.min(1,t));
  const cx=ax+vx*t,cz=az+vz*t,dx=p.x-cx,dz=p.z-cz,d=Math.hypot(dx,dz);
  if(d>=rr)return false;
  const len=Math.max(1e-4,Math.hypot(vx,vz)),nx=d>1e-4?dx/d:-vz/len,nz=d>1e-4?dz/d:vx/len;
  p.x=cx+nx*rr;p.z=cz+nz*rr;return true;
}

function segmentIntersectionT2D(ax,az,bx,bz,cx,cz,dx,dz){
  const rx=bx-ax,rz=bz-az,sx=dx-cx,sz=dz-cz;
  const den=rx*sz-rz*sx;if(Math.abs(den)<1e-8)return null;
  const qx=cx-ax,qz=cz-az;
  const t=(qx*sz-qz*sx)/den,u=(qx*rz-qz*rx)/den;
  if(t<0||t>1||u<0||u>1)return null;
  return t;
}

function hasAncestorNamed(o,prefix){
  for(let n=o;n;n=n.parent)if((n.name||'').startsWith(prefix))return true;
  return false;
}

function splitSegmentOutsideRect(ax,az,bx,bz,rect,minLen=.05){
  const dx=bx-ax,dz=bz-az,ts=[0,1],eps=1e-7;
  if(Math.abs(dx)>eps)for(const x of [rect.minX,rect.maxX]){const t=(x-ax)/dx;if(t>eps&&t<1-eps)ts.push(t);}
  if(Math.abs(dz)>eps)for(const z of [rect.minZ,rect.maxZ]){const t=(z-az)/dz;if(t>eps&&t<1-eps)ts.push(t);}
  ts.sort((a,b)=>a-b);const uniq=[];for(const t of ts)if(!uniq.length||Math.abs(t-uniq[uniq.length-1])>1e-6)uniq.push(t);
  const out=[];
  for(let i=0;i<uniq.length-1;i++){
    const t0=uniq[i],t1=uniq[i+1];if(t1-t0<1e-6)continue;const tm=(t0+t1)*.5,xm=ax+dx*tm,zm=az+dz*tm;
    const inside=xm>=rect.minX-1e-6&&xm<=rect.maxX+1e-6&&zm>=rect.minZ-1e-6&&zm<=rect.maxZ+1e-6;
    if(inside)continue;
    const x0=ax+dx*t0,z0=az+dz*t0,x1=ax+dx*t1,z1=az+dz*t1;if(Math.hypot(x1-x0,z1-z0)>=minLen)out.push([x0,z0,x1,z1]);
  }
  return out;
}

export class OrangeryHubSystem {
  constructor(scene,{world,state,uTime,position={x:60,z:-40},rotation=THREE.MathUtils.degToRad(49.7636416907)}={}){
    this.scene=scene;this.world=world;this.state=state;this.uTime=uTime;
    this.position={x:position.x,z:position.z};this.rotation=rotation;this.baseY=world.groundHeight(position.x,position.z);
    this.root=new THREE.Group();this.root.name='ORANGERY_SHARED_HUB';this.root.position.set(this.position.x,this.baseY,this.position.z);this.root.rotation.y=this.rotation;
    this.scene.add(this.root);
    this.loader=new GLTFLoader();this.stage=DEFAULT_STAGE;this.stageRoot=null;this.stageMixer=null;this.fxMixer=null;this.fxRoot=null;this.ambientRoot=null;this.ambientMixer=null;
    this.glintU={uT:{value:0}};
    this.ready=false;this.shatterPlayed=false;this.buildingCollisionSegments=[];this.treeCollisionSegments=[];this.doorLeaves=[];this.collisionDebugEnabled=false;this.collisionDebugGroup=null;
  }

  async init(){
    const manifest=await fetch(BASE+'manifest.json').then(r=>{if(!r.ok)throw new Error(`Orangery manifest ${r.status}`);return r.json();});
    this.manifest=manifest;
    const building=await this.loader.loadAsync(BASE+manifest.building);
    this.building=building.scene;this.building.name='ORANGERY_A_BUILDING_RUNTIME';setShadow(this.building);
    for(const clip of building.animations||[]){if(clip.name==='DoorOpen'){this.doorMixer=new THREE.AnimationMixer(this.building);this.doorAction=this.doorMixer.clipAction(clip);this.doorAction.setLoop(THREE.LoopOnce,1);this.doorAction.clampWhenFinished=true;}}
    this.applyGlassMaterials(this.building);
    setNamedVisibility(this.building,'OR_Lantern',true);setNamedVisibility(this.building,'OR_Lantern_Broken',false);
    this.root.add(this.building);
    this.root.updateMatrixWorld(true);

    // R4: exact horizontal cross-sections of the visible building geometry.
    // Projecting triangle edges (R2/R3) created false invisible walls and holes.
    // The explicit portal clips any static slice out of the authored double-door opening.
    this.buildingCollisionSegments=this.buildSliceCollisionSegments(this.building,{
      materialNames:new Set(['OR_Glass','OR_Glass_Cracked','OR_Stone','OR_Iron_Aged']),
      planes:BUILDING_SLICE_Y,portalRect:DOOR_PORTAL,
      exclude:o=>hasAncestorNamed(o,'OR_Door_')
    });
    this.prepareDoorLeaves();

    const [shatter,ambient]=await Promise.all([
      this.loader.loadAsync(BASE+manifest.fx.lanternShatter.file),
      this.loader.loadAsync(BASE+manifest.fx.ambient.file)
    ]);
    this.fxRoot=shatter.scene;this.fxRoot.name='ORANGERY_LANTERN_SHATTER_FX';this.fxRoot.visible=false;setShadow(this.fxRoot);this.root.add(this.fxRoot);
    this.fxMixer=new THREE.AnimationMixer(this.fxRoot);this.fxAction=shatter.animations?.find(c=>c.name===manifest.fx.lanternShatter.clip)?this.fxMixer.clipAction(shatter.animations.find(c=>c.name===manifest.fx.lanternShatter.clip)):null;
    if(this.fxAction){this.fxAction.setLoop(THREE.LoopOnce,1);this.fxAction.clampWhenFinished=true;}

    this.ambientRoot=ambient.scene;this.ambientRoot.name='ORANGERY_AMBIENT_FX';this.root.add(this.ambientRoot);
    this.ambientMixer=new THREE.AnimationMixer(this.ambientRoot);const ac=ambient.animations?.find(c=>c.name===manifest.fx.ambient.clip);
    if(ac){this.ambientAction=this.ambientMixer.clipAction(ac);this.ambientAction.setLoop(THREE.LoopRepeat,Infinity);this.ambientAction.play();}

    const query=new URLSearchParams(location.search),dev=query.get('dev')==='1';const requested=dev?Number.parseInt(query.get('treeStage')||'',10):NaN;
    const initial=Number.isFinite(requested)?THREE.MathUtils.clamp(requested,0,manifest.stages.length-1):DEFAULT_STAGE;
    await this.setStage(initial,{playShatter:false});

    this.world.orangeryCollisionResolver=(p,r)=>this.resolveCollisions(p,r);
    this.ready=true;
    return this;
  }

  applyGlassMaterials(root){
    const strength=this.manifest?.fx?.glassGlint?.materials||{OR_Glass:.55,OR_Glass_Roof:.45,OR_Glass_Cracked:.2};
    const done=new Set();
    root.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(!m||done.has(m))continue;done.add(m);if(strength[m.name]!=null)applyGlassGlint(m,strength[m.name],this.glintU);}});
  }

  buildSliceCollisionSegments(source,{materialNames=null,planes=BUILDING_SLICE_Y,portalRect=null,exclude=null}={}){
    this.root.updateMatrixWorld(true);source.updateMatrixWorld(true);
    const invRoot=new THREE.Matrix4().copy(this.root.matrixWorld).invert(),mx=new THREE.Matrix4();
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),tmp=new THREE.Vector3();
    const raw=[],eps=1e-6;
    const emit=(p1,p2)=>{
      const len=Math.hypot(p2.x-p1.x,p2.z-p1.z);if(len<.05)return;
      const pieces=portalRect?splitSegmentOutsideRect(p1.x,p1.z,p2.x,p2.z,portalRect):[[p1.x,p1.z,p2.x,p2.z]];
      for(const s of pieces)raw.push(s);
    };
    const intersectEdge=(p,q,y,pts)=>{
      const dp=p.y-y,dq=q.y-y;
      if(Math.abs(dp)<eps&&Math.abs(dq)<eps){pts.push({x:p.x,z:p.z});pts.push({x:q.x,z:q.z});return;}
      if(dp*dq>0)return;const den=q.y-p.y;if(Math.abs(den)<eps)return;
      const t=(y-p.y)/den;if(t<-eps||t>1+eps)return;tmp.copy(p).lerp(q,THREE.MathUtils.clamp(t,0,1));pts.push({x:tmp.x,z:tmp.z});
    };
    source.traverse(o=>{
      if(!o.isMesh||exclude?.(o))return;
      const mats=Array.isArray(o.material)?o.material:[o.material];if(materialNames&&!mats.some(m=>m&&materialNames.has(m.name)))return;
      o.updateWorldMatrix(true,false);mx.multiplyMatrices(invRoot,o.matrixWorld);const g=o.geometry,pos=g?.attributes?.position;if(!pos)return;const idx=g.index;
      const triCount=idx?Math.floor(idx.count/3):Math.floor(pos.count/3);
      for(let t=0;t<triCount;t++){
        const ia=idx?idx.getX(t*3):t*3,ib=idx?idx.getX(t*3+1):t*3+1,ic=idx?idx.getX(t*3+2):t*3+2;
        a.fromBufferAttribute(pos,ia).applyMatrix4(mx);b.fromBufferAttribute(pos,ib).applyMatrix4(mx);c.fromBufferAttribute(pos,ic).applyMatrix4(mx);
        const minY=Math.min(a.y,b.y,c.y),maxY=Math.max(a.y,b.y,c.y);
        for(const y of planes){
          if(y<minY-eps||y>maxY+eps)continue;const pts=[];intersectEdge(a,b,y,pts);intersectEdge(b,c,y,pts);intersectEdge(c,a,y,pts);
          const uniq=[];for(const p of pts)if(!uniq.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<1e-5))uniq.push(p);if(uniq.length<2)continue;
          let bestA=null,bestB=null,bestD=0;for(let i=0;i<uniq.length;i++)for(let j=i+1;j<uniq.length;j++){const d=Math.hypot(uniq[j].x-uniq[i].x,uniq[j].z-uniq[i].z);if(d>bestD){bestD=d;bestA=uniq[i];bestB=uniq[j];}}
          if(bestA&&bestB)emit(bestA,bestB);
        }
      }
    });
    const seen=new Map(),Q=.03;
    for(const s of raw){
      const p1=[Math.round(s[0]/Q),Math.round(s[1]/Q)],p2=[Math.round(s[2]/Q),Math.round(s[3]/Q)];
      const k=(p1[0]<p2[0]||(p1[0]===p2[0]&&p1[1]<=p2[1]))?`${p1[0]},${p1[1]}:${p2[0]},${p2[1]}`:`${p2[0]},${p2[1]}:${p1[0]},${p1[1]}`;
      if(!seen.has(k))seen.set(k,{ax:s[0],az:s[1],bx:s[2],bz:s[3],minX:Math.min(s[0],s[2]),maxX:Math.max(s[0],s[2]),minZ:Math.min(s[1],s[3]),maxZ:Math.max(s[1],s[3])});
    }
    return [...seen.values()];
  }

  buildCollisionSegments(source,{materialNames=null,nodeNames=null,yMin=BODY_Y_MIN,yMax=BODY_Y_MAX,exclude=null}={}){
    this.root.updateMatrixWorld(true);source.updateMatrixWorld(true);
    const invRoot=new THREE.Matrix4().copy(this.root.matrixWorld).invert(),mx=new THREE.Matrix4();
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3(),n=new THREE.Vector3();
    const raw=[];
    const pushEdge=(p1,p2)=>{const dx=p2.x-p1.x,dz=p2.z-p1.z;if(Math.hypot(dx,dz)<.12)return;raw.push([p1.x,p1.z,p2.x,p2.z]);};
    source.traverse(o=>{
      if(!o.isMesh||exclude?.(o))return;
      if(nodeNames&&!nodeNames.has(o.name))return;
      const mats=Array.isArray(o.material)?o.material:[o.material];
      if(materialNames&&!mats.some(m=>m&&materialNames.has(m.name)))return;
      o.updateWorldMatrix(true,false);mx.multiplyMatrices(invRoot,o.matrixWorld);
      const g=o.geometry,pos=g?.attributes?.position;if(!pos)return;const idx=g.index;
      const triCount=idx?Math.floor(idx.count/3):Math.floor(pos.count/3);
      for(let t=0;t<triCount;t++){
        const ia=idx?idx.getX(t*3):t*3,ib=idx?idx.getX(t*3+1):t*3+1,ic=idx?idx.getX(t*3+2):t*3+2;
        a.fromBufferAttribute(pos,ia).applyMatrix4(mx);b.fromBufferAttribute(pos,ib).applyMatrix4(mx);c.fromBufferAttribute(pos,ic).applyMatrix4(mx);
        if(Math.max(a.y,b.y,c.y)<yMin||Math.min(a.y,b.y,c.y)>yMax)continue;
        ab.subVectors(b,a);ac.subVectors(c,a);n.crossVectors(ab,ac);const nl=n.length();if(nl<1e-7||Math.abs(n.y/nl)>.55)continue;
        pushEdge(a,b);pushEdge(b,c);pushEdge(c,a);
      }
    });
    const seen=new Map(),Q=.03;
    for(const s of raw){
      const p1=[Math.round(s[0]/Q),Math.round(s[1]/Q)],p2=[Math.round(s[2]/Q),Math.round(s[3]/Q)];
      const k=(p1[0]<p2[0]||(p1[0]===p2[0]&&p1[1]<=p2[1]))?`${p1[0]},${p1[1]}:${p2[0]},${p2[1]}`:`${p2[0]},${p2[1]}:${p1[0]},${p1[1]}`;
      if(!seen.has(k))seen.set(k,{ax:s[0],az:s[1],bx:s[2],bz:s[3],minX:Math.min(s[0],s[2]),maxX:Math.max(s[0],s[2]),minZ:Math.min(s[1],s[3]),maxZ:Math.max(s[1],s[3])});
    }
    return [...seen.values()];
  }

  prepareDoorLeaves(){
    this.doorLeaves=[];
    for(const name of ['OR_Door_L','OR_Door_R']){
      const node=this.building.getObjectByName(name);if(!node)continue;
      node.updateMatrixWorld(true);const invNode=new THREE.Matrix4().copy(node.matrixWorld).invert(),mx=new THREE.Matrix4();
      let minX=Infinity,maxX=-Infinity;
      node.traverse(o=>{if(!o.isMesh)return;o.updateWorldMatrix(true,false);mx.multiplyMatrices(invNode,o.matrixWorld);const p=o.geometry?.attributes?.position;if(!p)return;const v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mx);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);}});
      const freeX=Math.abs(minX)>Math.abs(maxX)?minX:maxX;
      this.doorLeaves.push({node,freeX:Number.isFinite(freeX)?freeX:(name.endsWith('_L')?1.58:-1.58)});
    }
  }

  async setStage(index,{playShatter=true}={}){
    if(!this.manifest)return;
    const next=THREE.MathUtils.clamp(Math.round(index),0,this.manifest.stages.length-1),def=this.manifest.stages[next],prev=this.stage;
    const gltf=await this.loader.loadAsync(BASE+def.file);const incoming=gltf.scene;incoming.name=`COMMUNITY_TREE_STAGE_${String(next).padStart(2,'0')}`;setShadow(incoming);
    incoming.scale.setScalar(1);incoming.traverse(o=>{if(o.isMesh&&o.material){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(m.name==='OR_Tree_glow'){m.transparent=true;m.opacity=Math.min(1,m.opacity??1);}}}});
    this.root.add(incoming);this.root.updateMatrixWorld(true);
    // Tree collision is sourced only from the visible physical seed/sprout/bark,
    // never from canopy, flowers, fruit, glow, or a generic stage bounding radius.
    this.treeCollisionSegments=this.buildCollisionSegments(incoming,{
      nodeNames:new Set(['OR_Tree_seed','OR_Tree_sprout','OR_Tree_bark']),yMin:.05,yMax:1.72
    });
    if(this.collisionDebugEnabled)this.setCollisionDebug(true);
    incoming.scale.setScalar(.92);
    const old=this.stageRoot;this.stageRoot=incoming;this.stage=next;
    const start=performance.now();const duration=480;
    const animate=()=>{if(this.stageRoot!==incoming)return;const t=Math.min(1,(performance.now()-start)/duration),e=1-Math.pow(1-t,3),s=.92+(.08*Math.sin(e*Math.PI))*1.0;incoming.scale.setScalar(s);if(t<1)requestAnimationFrame(animate);else incoming.scale.setScalar(1);};requestAnimationFrame(animate);
    if(old){old.traverse(o=>{if(o.isMesh&&o.material){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){m.transparent=true;}}});setTimeout(()=>{if(old.parent)old.parent.remove(old);},260);}
    const broken=!!def.lanternBroken;
    if(broken&&playShatter&&prev<BREAK_STAGE&&!this.shatterPlayed)this.playLanternShatter();
    else{setNamedVisibility(this.building,'OR_Lantern',!broken);setNamedVisibility(this.building,'OR_Lantern_Broken',broken);}
    this.state?.events?.emit('orangery:tree-stage',{index:next,name:def.name,growth:def.growth,milestone:def.milestone});
  }

  playLanternShatter(){
    if(this.shatterPlayed)return;this.shatterPlayed=true;
    setNamedVisibility(this.building,'OR_Lantern',false);setNamedVisibility(this.building,'OR_Lantern_Broken',true);
    if(this.fxRoot&&this.fxAction){this.fxRoot.visible=true;this.fxMixer.stopAllAction();this.fxAction.reset().play();setTimeout(()=>{if(this.fxRoot)this.fxRoot.visible=false;},6200);}
    this.state?.events?.emit('orangery:lantern-shatter',{stage:this.stage});
  }

  setDoorOpen(open=true){
    if(!this.doorAction)return;this.doorAction.paused=false;if(open){this.doorAction.timeScale=1;this.doorAction.reset().play();}else{this.doorAction.time=this.doorAction.getClip().duration;this.doorAction.timeScale=-1;this.doorAction.play();}
  }

  update(dt,time,playerPosition){
    if(!this.ready)return;this.glintU.uT.value=time;this.doorMixer?.update(dt);this.fxMixer?.update(dt);this.ambientMixer?.update(dt);
    if(playerPosition){
      // Shared Three.js world/local transform for the visible hub, door trigger and collision map.
      const local=this.worldToHubLocal(playerPosition.x,playerPosition.z);
      const near=Math.hypot(local.x,local.z-8.1)<5.8;
      if(near!==this.doorNear){this.doorNear=near;this.setDoorOpen(near);}
    }
  }

  worldToHubLocal(x,z,y=this.baseY){const v=new THREE.Vector3(x,y,z);this.root.worldToLocal(v);return v;}
  toWorldLocal(x,z,y=0){const v=new THREE.Vector3(x,y,z);this.root.localToWorld(v);return v;}

  devSpawn(){
    const p=this.toWorldLocal(0,14.4,0);return{x:p.x,z:p.z,heading:this.rotation+Math.PI};
  }

  // R21C: camera collision uses the same authored wall map as character traversal.
  // The previous whole-building Box3 also contained gravel/floor/empty interior and
  // therefore looked like a giant solid volume when the player merely approached it.
  cameraOcclusionDistance(start,end,maxDist,margin=.20){
    if(!this.ready||this.world?.space!=='world')return maxDist;
    const dx=start.x-this.position.x,dz=start.z-this.position.z;
    if(dx*dx+dz*dz>42*42)return maxDist;
    const a=this.worldToHubLocal(start.x,start.z,start.y),b=this.worldToHubLocal(end.x,end.z,end.y);
    let best=maxDist;
    const test=(seg,minY,maxY)=>{
      const t=segmentIntersectionT2D(a.x,a.z,b.x,b.z,seg.ax,seg.az,seg.bx,seg.bz);if(t==null)return;
      const y=a.y+(b.y-a.y)*t;if(y<minY-margin||y>maxY+margin)return;
      best=Math.min(best,Math.max(0,maxDist*t));
    };
    // Visible glass/iron/stone shell behaves as a vertical camera blocker, while the
    // actual double-door portal remains absent from these pre-clipped segments.
    for(const seg of this.buildingCollisionSegments)test(seg,-.10,6.8);
    // Only the physical seed/sprout/bark footprint of the community tree is included.
    for(const seg of this.treeCollisionSegments)test(seg,-.10,9.5);
    // Closed door leaves are dynamic and are only camera blockers while actually closed.
    if(!this.doorNear&&this.doorLeaves.length){
      this.root.updateMatrixWorld(true);const invRoot=new THREE.Matrix4().copy(this.root.matrixWorld).invert(),hinge=new THREE.Vector3(),tip=new THREE.Vector3();
      for(const leaf of this.doorLeaves){
        leaf.node.updateWorldMatrix(true,false);hinge.set(0,0,0).applyMatrix4(leaf.node.matrixWorld).applyMatrix4(invRoot);tip.set(leaf.freeX,0,0).applyMatrix4(leaf.node.matrixWorld).applyMatrix4(invRoot);
        test({ax:hinge.x,az:hinge.z,bx:tip.x,bz:tip.z},-.10,3.2);
      }
    }
    return best;
  }

  setCollisionDebug(enabled=true){
    this.collisionDebugEnabled=!!enabled;
    if(this.collisionDebugGroup){this.root.remove(this.collisionDebugGroup);this.collisionDebugGroup.traverse(o=>{o.geometry?.dispose?.();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m?.dispose?.());}});this.collisionDebugGroup=null;}
    if(!this.collisionDebugEnabled)return;
    const group=new THREE.Group();group.name='ORANGERY_COLLISION_DEBUG';
    const add=(segments,color,y)=>{if(!segments.length)return;const pts=[];for(const s of segments)pts.push(s.ax,y,s.az,s.bx,y,s.bz);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));const m=new THREE.LineBasicMaterial({color,depthTest:false,transparent:true,opacity:.95});const l=new THREE.LineSegments(g,m);l.renderOrder=999;group.add(l);};
    add(this.buildingCollisionSegments,0xff3344,.10);add(this.treeCollisionSegments,0xffc83d,.13);
    const r=DOOR_PORTAL,portal=[{ax:r.minX,az:r.minZ,bx:r.maxX,bz:r.minZ},{ax:r.maxX,az:r.minZ,bx:r.maxX,bz:r.maxZ},{ax:r.maxX,az:r.maxZ,bx:r.minX,bz:r.maxZ},{ax:r.minX,az:r.maxZ,bx:r.minX,bz:r.minZ}];add(portal,0x35ff77,.16);
    this.root.add(group);this.collisionDebugGroup=group;
  }

  collideSegments(q,segments,rr,passes=2){
    for(let pass=0;pass<passes;pass++)for(const s of segments){
      if(q.x<s.minX-rr||q.x>s.maxX+rr||q.z<s.minZ-rr||q.z>s.maxZ+rr)continue;
      pointSegmentPush(q,s.ax,s.az,s.bx,s.bz,rr);
    }
  }

  collideClosedDoors(q,rr){
    if(this.doorNear||!this.doorLeaves.length)return;
    this.root.updateMatrixWorld(true);const invRoot=new THREE.Matrix4().copy(this.root.matrixWorld).invert(),hinge=new THREE.Vector3(),end=new THREE.Vector3();
    for(const leaf of this.doorLeaves){
      leaf.node.updateWorldMatrix(true,false);hinge.set(0,0,0).applyMatrix4(leaf.node.matrixWorld).applyMatrix4(invRoot);end.set(leaf.freeX,0,0).applyMatrix4(leaf.node.matrixWorld).applyMatrix4(invRoot);
      pointSegmentPush(q,hinge.x,hinge.z,end.x,end.z,rr);
    }
  }

  resolveCollisions(p,radius=.30){
    const dx=p.x-this.position.x,dz=p.z-this.position.z;
    // Nothing in this system can affect the player outside the hub footprint.
    if(dx*dx+dz*dz>34*34)return;
    const local=this.worldToHubLocal(p.x,p.z),q={x:local.x,z:local.z},rr=radius+.035;

    this.collideSegments(q,this.buildingCollisionSegments,rr,3);
    if(q.x*q.x+q.z*q.z<6.5*6.5)this.collideSegments(q,this.treeCollisionSegments,rr,2);
    this.collideClosedDoors(q,rr);

    const world=this.toWorldLocal(q.x,q.z,0);p.x=world.x;p.z=world.z;
  }
}
