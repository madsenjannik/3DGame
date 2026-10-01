// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ASSET_URL='./assets/environment/lake-cabin/lake_cabin.glb';
const SIGURD_PATCH_URL='./assets/environment/lake-cabin/sigurd_hatch_integration.glb';
const BOAT_SURFACE_LIFT=.14; // R4 micro-patch: reveal hull/interior without changing authored X/Z/rotation/scale.
const BOAT_VERTICAL_BOB_SCALE=.15; // R6: keep Boat_Idle rocking, reduce only Y bob from +/-3.5 cm to +/-5.25 mm.
const Y_AXIS=new THREE.Vector3(0,1,0);

function setShadows(root){
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
}

// The exported Cabin_Rope mesh contains both the cabin decorations/rope coil and two
// authored static boat mooring ropes. WORLD V2 has a lower water level, so the boat is
// vertically offset while those static mooring triangles would otherwise stay behind.
// Keep the decorative rope/coil, remove only the two low boat-mooring runs, then rebuild
// those two lines dynamically from the authored attachment points.
function stripStaticBoatMoorings(mesh){
  if(!mesh?.geometry?.attributes?.position)return;
  const src=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  const p=src.attributes.position,keep=[];
  for(let i=0;i<p.count;i+=3){
    const cx=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3;
    const cy=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3;
    const cz=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;
    const isBoatMooring=cx>5&&cz>2&&cy<1.05;
    if(!isBoatMooring)keep.push(i,i+1,i+2);
  }
  const out=new THREE.BufferGeometry();
  for(const [name,a] of Object.entries(src.attributes)){
    const A=a.array.constructor,arr=new A(keep.length*a.itemSize);
    for(let j=0;j<keep.length;j++)for(let k=0;k<a.itemSize;k++)arr[j*a.itemSize+k]=a.array[keep[j]*a.itemSize+k];
    out.setAttribute(name,new THREE.BufferAttribute(arr,a.itemSize,a.normalized));
  }
  out.computeBoundingBox();out.computeBoundingSphere();mesh.geometry=out;src.dispose();
}

function rebuildGeometryWithoutFaces(mesh,keep){
  const src=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  const out=new THREE.BufferGeometry();
  for(const [name,a] of Object.entries(src.attributes)){
    const A=a.array.constructor,arr=new A(keep.length*a.itemSize);
    for(let j=0;j<keep.length;j++)for(let k=0;k<a.itemSize;k++)arr[j*a.itemSize+k]=a.array[keep[j]*a.itemSize+k];
    out.setAttribute(name,new THREE.BufferAttribute(arr,a.itemSize,a.normalized));
  }
  out.computeBoundingBox();out.computeBoundingSphere();mesh.geometry=out;src.dispose();
}

function removeFacadeSheetForHatch(root,mesh){
  if(!root||!mesh?.geometry?.attributes?.position)return 0;
  root.updateMatrixWorld(true);mesh.updateMatrixWorld(true);
  const src=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  const p=src.attributes.position,keep=[];
  const toRoot=new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld);
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  let removed=0;
  for(let i=0;i<p.count;i+=3){
    a.fromBufferAttribute(p,i).applyMatrix4(toRoot);b.fromBufferAttribute(p,i+1).applyMatrix4(toRoot);c.fromBufferAttribute(p,i+2).applyMatrix4(toRoot);
    const minY=Math.min(a.y,b.y,c.y),maxY=Math.max(a.y,b.y,c.y),minZ=Math.min(a.z,b.z,c.z),maxZ=Math.max(a.z,b.z,c.z);
    const onFront=[a,b,c].every(v=>Math.abs(v.x-2.5)<.015);
    const giantFront=onFront&&(maxY-minY)>1.9&&(maxZ-minZ)>5.5;
    if(giantFront){removed++;continue;}
    keep.push(i,i+1,i+2);
  }
  if(removed){rebuildGeometryWithoutFaces(mesh,keep);}else src.dispose();
  return removed;
}

function removeTrianglesFullyInsideBox(root,mesh,box,pad=.001){
  if(!root||!mesh?.geometry?.attributes?.position||!box)return 0;
  root.updateMatrixWorld(true);mesh.updateMatrixWorld(true);
  const src=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  const p=src.attributes.position,keep=[];
  const toRoot=new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld);
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  const min=box.min.clone().addScalar(-pad),max=box.max.clone().addScalar(pad);
  const inside=v=>v.x>=min.x&&v.x<=max.x&&v.y>=min.y&&v.y<=max.y&&v.z>=min.z&&v.z<=max.z;
  let removed=0;
  for(let i=0;i<p.count;i+=3){
    a.fromBufferAttribute(p,i).applyMatrix4(toRoot);b.fromBufferAttribute(p,i+1).applyMatrix4(toRoot);c.fromBufferAttribute(p,i+2).applyMatrix4(toRoot);
    if(inside(a)&&inside(b)&&inside(c)){removed++;continue;}
    keep.push(i,i+1,i+2);
  }
  if(removed){rebuildGeometryWithoutFaces(mesh,keep);}else src.dispose();
  return removed;
}

function createFishingHatchAperture(root,cutBox,frameBox){
  if(!root||!cutBox)return;
  const wall=root.getObjectByName('Cabin_Wall_Tar');
  const back=root.getObjectByName('Cabin_Interior_Emissive');
  const paint=root.getObjectByName('Cabin_Paint');
  const wood=root.getObjectByName('Cabin_Wood_Natural');
  const removedWall=wall?.isMesh?removeFacadeSheetForHatch(root,wall):0;
  const removedBack=back?.isMesh?removeTrianglesFullyInsideBox(root,back,cutBox,.02):0;
  const removedPaint=paint?.isMesh?removeTrianglesFullyInsideBox(root,paint,cutBox,.02):0;
  const removedFrame=wood?.isMesh&&frameBox?removeTrianglesFullyInsideBox(root,wood,frameBox,.002):0;

  // The source front wall is two giant triangles. Rebuild that sheet around Claude's
  // exact CUT_VOLUME instead of leaving the diagonal void produced by triangle removal.
  if(removedWall&&!root.getObjectByName('Fishing_Hatch_Facade_R13')){
    const mat=wall.material?.clone?.()||new THREE.MeshStandardMaterial({color:0x1c1916,roughness:.93,metalness:0});
    mat.name='Fishing_Hatch_Facade_Tar_R13';
    const g=new THREE.Group();g.name='Fishing_Hatch_Facade_R13';
    const x=2.505,t=.05,y0=.5,y1=2.7,z0=-3,z1=3;
    const hy0=THREE.MathUtils.clamp(cutBox.min.y,y0,y1),hy1=THREE.MathUtils.clamp(cutBox.max.y,y0,y1);
    const hz0=THREE.MathUtils.clamp(cutBox.min.z,z0,z1),hz1=THREE.MathUtils.clamp(cutBox.max.z,z0,z1);
    const panel=(h,d,y,z)=>{if(h<=.001||d<=.001)return;const m=new THREE.Mesh(new THREE.BoxGeometry(t,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);};
    panel(hy0-y0,z1-z0,(y0+hy0)/2,(z0+z1)/2);
    panel(y1-hy1,z1-z0,(hy1+y1)/2,(z0+z1)/2);
    panel(hy1-hy0,hz0-z0,(hy0+hy1)/2,(z0+hz0)/2);
    panel(hy1-hy0,z1-hz1,(hy0+hy1)/2,(hz1+z1)/2);
    root.add(g);
  }
  console.info('[DYM] Claude hatch integration carve R13',{removedWall,removedBack,removedPaint,removedFrame,cutMin:cutBox.min.toArray(),cutMax:cutBox.max.toArray()});
}

function prepareSigurdPatch(patchScene){
  if(!patchScene)return null;
  patchScene.name='SIGURD_HATCH_INTEGRATION_R13';
  const cut=patchScene.getObjectByName('SIGURD_HATCH_CUT_VOLUME');
  const frameRoot=patchScene.getObjectByName('SIGURD_HATCH_FRAME_PATCH');
  const frame=patchScene.getObjectByName('SIGURD_HATCH_FRAME_PATCH_Frame_Counter');
  const cam=patchScene.getObjectByName('SIGURD_VIEW_CAMERA');
  const target=patchScene.getObjectByName('SIGURD_VIEW_TARGET');
  if(!cut||!frameRoot||!frame||!cam||!target)throw new Error('sigurd_hatch_integration.glb missing required named objects');
  patchScene.updateMatrixWorld(true);
  const cutBox=new THREE.Box3().setFromObject(cut);
  const frameBox=new THREE.Box3().setFromObject(frame);
  cut.visible=false;
  frameRoot.traverse(o=>{if(/^SIGURD_HATCH_FRAME_PATCH_HatchFlap_Open_/.test(o.name))o.visible=false;});
  frame.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return {patchScene,cutBox,frameBox,cam,target,frame};
}

function addFishingCornerRail(root){
  if(!root||root.getObjectByName('Fishing_Corner_Rail_R13'))return;
  // Same user-approved placement as R12. The source Wood_Natural mesh is vertex-colored;
  // R12 reused that material on uncolored BoxGeometry, which rendered almost black.
  // R13 gives the new geometry the same vertex-color input and material response.
  const source=root.getObjectByName('Cabin_Wood_Natural');
  const mat=source?.material?.clone?.()||new THREE.MeshStandardMaterial({color:0xffffff,roughness:.8,metalness:0,vertexColors:true});
  mat.name='Fishing_Corner_Rail_Wood_R13';mat.vertexColors=true;mat.color.setRGB(1,1,1);mat.roughness=.8;mat.metalness=0;
  const railColor=new THREE.Color(.575,.335,.145); // sampled from the authored terrace railing vertices
  const colorize=(geo)=>{const n=geo.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=railColor.r;a[i*3+1]=railColor.g;a[i*3+2]=railColor.b;}geo.setAttribute('color',new THREE.BufferAttribute(a,3));return geo;};
  const g=new THREE.Group();g.name='Fishing_Corner_Rail_R13';
  const x=4.42,zBridge=2.36,zCorner=2.96;
  const postGeo=colorize(new THREE.BoxGeometry(.08,.95,.08));
  for(const z of [zBridge,zCorner]){const p=new THREE.Mesh(postGeo,mat);p.position.set(x,.975,z);p.castShadow=true;p.receiveShadow=true;g.add(p);}
  const top=new THREE.Mesh(colorize(new THREE.BoxGeometry(.10,.06,zCorner-zBridge)),mat);top.position.set(x,1.45,(zBridge+zCorner)/2);top.castShadow=true;top.receiveShadow=true;g.add(top);
  const mid=new THREE.Mesh(colorize(new THREE.BoxGeometry(.05,.05,zCorner-zBridge)),mat);mid.position.set(x,1.0,(zBridge+zCorner)/2);mid.castShadow=true;mid.receiveShadow=true;g.add(mid);
  root.add(g);
}

function softenBoatVerticalBob(clip,baseY){
  // Runtime-only copy: source GLB/Boat_Idle stays byte-identical. Preserve every
  // rotation keyframe and X/Z translation key; attenuate only Boat.position Y.
  const tracks=clip.tracks.map(src=>{
    const track=new src.constructor(src.name,src.times.slice(),src.values.slice(),src.getInterpolation());
    if(track.name.endsWith('.position')){
      for(let i=1;i<track.values.length;i+=3)track.values[i]=baseY+(track.values[i]-baseY)*BOAT_VERTICAL_BOB_SCALE;
    }
    return track;
  });
  return new THREE.AnimationClip(clip.name,clip.duration,tracks,clip.blendMode);
}

function addBoatInnerFloor(boat){
  if(!boat)return null;
  // R7: the authored open hull exposes WORLD water through its interior. Add one
  // boat-local low-poly floor above the water plane instead of lifting the whole boat.
  // The tapered footprint stays inside the hull and inherits Boat_Idle automatically.
  const wood=boat.getObjectByName('Boat_Boat_Wood');
  const material=wood?.material?.clone?.()||new THREE.MeshStandardMaterial({color:0xb9945f,roughness:.78,metalness:0});
  material.name='Boat_Inner_Floor_Wood_Shadow_R14';
  material.side=THREE.DoubleSide;
  // R14: Boat_Wood is authored with vertex colours. R7's generated floor had no
  // COLOR_0 attribute, so it could read almost black. Feed it the same warm wood
  // family, deliberately ~20% darker to create natural interior shadow/depth.
  material.vertexColors=true;material.color.setRGB(1,1,1);

  const shape=new THREE.Shape();
  shape.moveTo(-1.24,-.15);
  shape.lineTo(-.92,-.31);
  shape.lineTo(.88,-.31);
  shape.lineTo(1.24,-.15);
  shape.lineTo(1.24,.15);
  shape.lineTo(.88,.31);
  shape.lineTo(-.92,.31);
  shape.lineTo(-1.24,.15);
  shape.closePath();

  const geometry=new THREE.ShapeGeometry(shape);
  geometry.rotateX(Math.PI/2);
  const position=geometry.getAttribute('position'),colors=new Float32Array(position.count*3);
  const shadowWood=[.344,.205,.089];for(let i=0;i<position.count;i++)colors.set(shadowWood,i*3);
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const floor=new THREE.Mesh(geometry,material);
  floor.name='Boat_Inner_Floor_R7';
  floor.position.y=.185;
  floor.castShadow=true;
  floor.receiveShadow=true;
  boat.add(floor);
  return floor;
}

function makeRope(root,material,name,count=10,radius=.018){
  const group=new THREE.Group();group.name=name;root.add(group);
  const geometry=new THREE.CylinderGeometry(radius,radius,1,5,1,false),segments=[];
  for(let i=0;i<count;i++){const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;group.add(m);segments.push(m);}
  return {group,segments,count};
}

function updateRope(rope,a,b,sag=.12){
  const pts=[],v=new THREE.Vector3(),dir=new THREE.Vector3(),mid=new THREE.Vector3();
  for(let i=0;i<=rope.count;i++){
    const t=i/rope.count;
    v.copy(a).lerp(b,t);v.y-=sag*4*t*(1-t);pts.push(v.clone());
  }
  for(let i=0;i<rope.count;i++){
    const p0=pts[i],p1=pts[i+1],m=rope.segments[i];dir.copy(p1).sub(p0);const L=Math.max(.001,dir.length());
    mid.copy(p0).add(p1).multiplyScalar(.5);m.position.copy(mid);m.quaternion.setFromUnitVectors(Y_AXIS,dir.normalize());m.scale.set(1,L,1);
  }
}

export class CabinAssetSystem {
  constructor(scene,{x,z,rootY,rotation,waterY,localWaterY=-.18}={}){
    this.scene=scene;this.x=x;this.z=z;this.rootY=rootY;this.rotation=rotation;this.waterY=waterY;this.localWaterY=localWaterY;
    this.root=null;this.boat=null;this.boatInnerFloor=null;this.boatMixer=null;this.boatAction=null;this.boatHome=null;this.boatFree=false;this.doorClip=null;this.hatchClip=null;this.ready=false;this.sigurdIntegration=null;this.sigurdViewCamera=null;this.sigurdViewTarget=null;
    this.mooringDefs=[
      // Exact authored rope endpoints from the Claude cabin export. Boat anchors are
      // expressed in Boat-local space; dock anchors stay fixed in cabin-root space.
      {boat:new THREE.Vector3(-1.50,.44,-.07),dock:new THREE.Vector3(6.84,.30,2.52),sag:.07},
      {boat:new THREE.Vector3(1.50,.50,.07),dock:new THREE.Vector3(10.95,.75,2.25),sag:.13}
    ];
    this.moorings=[];this._tmpWorld=new THREE.Vector3();this._tmpLocal=new THREE.Vector3();
  }

  async init(){
    const loader=new GLTFLoader();
    const [gltf,patchGltf]=await Promise.all([loader.loadAsync(ASSET_URL),loader.loadAsync(SIGURD_PATCH_URL)]);
    const root=gltf.scene;root.name='WORLD_V2_LAKE_CABIN_1TO1';root.position.set(this.x,this.rootY,this.z);root.rotation.y=this.rotation;
    const patch=prepareSigurdPatch(patchGltf.scene);
    createFishingHatchAperture(root,patch.cutBox,patch.frameBox);
    root.add(patch.patchScene);this.sigurdIntegration=patch.patchScene;this.sigurdViewCamera=patch.cam;this.sigurdViewTarget=patch.target;
    setShadows(root);

    // Preserve the authored boat X/Z/rotation/scale exactly. Only translate it vertically
    // so the authored waterline (-0.18 local) lands on WORLD V2 water, then lift 14 cm
    // to expose the hull/interior cleanly at the final in-game waterline.
    const boat=root.getObjectByName('Boat');
    if(boat?.parent){
      const parent=boat.parent,wrap=new THREE.Group();wrap.name='Cabin_Boat_WaterOffset';
      parent.remove(boat);wrap.position.y=this.waterY-(this.rootY+this.localWaterY)+BOAT_SURFACE_LIFT;wrap.add(boat);parent.add(wrap);this.boat=boat;
      this.boatHome={position:boat.position.clone(),quaternion:boat.quaternion.clone(),scale:boat.scale.clone()};
      this.boatInnerFloor=addBoatInnerFloor(boat);
    }

    // Keep cabin hanging-rope details + rope coil, but replace static boat moorings so
    // they follow Boat_Idle after the WORLD water-height correction.
    const ropeMesh=root.getObjectByName('Cabin_Rope');
    if(ropeMesh?.isMesh){
      stripStaticBoatMoorings(ropeMesh);
      const mat=ropeMesh.material?.clone?.()||new THREE.MeshStandardMaterial({color:0xc5ad7a,roughness:1});
      mat.name='Cabin_Rope_Dynamic_Mooring';
      this.moorings=this.mooringDefs.map((d,i)=>({...d,rope:makeRope(root,mat,`Cabin_Mooring_Rope_${i+1}`)}));
    }

    // Retain the authored clips for future fishing-hub gameplay, but keep door and hatch
    // closed/non-interactive in this world pass. No animation action is bound to either.
    this.doorClip=(gltf.animations||[]).find(c=>c.name==='Door_Open')||null;
    this.hatchClip=(gltf.animations||[]).find(c=>c.name==='Hatch_Open')||null;

    const boatClipSource=(gltf.animations||[]).find(c=>c.name==='Boat_Idle');
    if(boatClipSource){
      const boatClip=softenBoatVerticalBob(boatClipSource,this.boat?.position.y??-.42);
      this.boatMixer=new THREE.AnimationMixer(root);this.boatAction=this.boatMixer.clipAction(boatClip);this.boatAction.setLoop(THREE.LoopRepeat,Infinity);this.boatAction.play();
    }

    addFishingCornerRail(root);
    this.scene.add(root);this.root=root;this.ready=true;this.updateMoorings();return this;
  }

  setBoatFree(free){
    free=!!free;if(!this.boat)return;this.boatFree=free;
    if(this.boatAction){
      if(free){this.boatAction.stop();this.boatAction.enabled=false;this.boatAction.paused=true;}
      else{this.boatAction.enabled=true;this.boatAction.paused=false;this.boatAction.reset().play();}
    }
    if(this.boatHome){this.boat.position.copy(this.boatHome.position);this.boat.quaternion.copy(this.boatHome.quaternion);this.boat.scale.copy(this.boatHome.scale);}
    for(const d of this.moorings)d.rope.group.visible=!free;
    this.root?.updateMatrixWorld(true);if(!free)this.updateMoorings();
  }

  updateMoorings(){
    if(!this.root||!this.boat||!this.moorings.length||this.boatFree)return;
    this.root.updateMatrixWorld(true);
    for(const d of this.moorings){
      this._tmpWorld.copy(d.boat);this.boat.localToWorld(this._tmpWorld);
      this._tmpLocal.copy(this._tmpWorld);this.root.worldToLocal(this._tmpLocal);
      updateRope(d.rope,this._tmpLocal,d.dock,d.sag);
    }
  }

  update(dt){
    if(this.boatMixer&&!this.boatFree)this.boatMixer.update(dt);
    this.updateMoorings();
  }
}
