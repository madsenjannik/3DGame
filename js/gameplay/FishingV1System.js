// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createHoloIndicator } from '../visual/holo-indicator.js';
import { FishingGrip } from './FishingGrip.js?build=FISHGRIP-R80-20261005A';   // R80 rod in the hand

const BUILD='DEV-CLEAN-R16-SLIM-ASSETS-HUB-20260928A';
const OVERLAY_URL=`./assets/environment/lake-cabin/cabin_fishing_runtime.glb?build=${BUILD}`;
const POSTER_URL=`./assets/environment/lake-cabin/cabin_fish_poster.glb?build=${BUILD}`;
const PI=Math.PI;
const V3=THREE.Vector3;

const LOCAL={
  SIG_DESK:new V3(1.6,.5,-.3),
  SIG_SIDE:new V3(.55,.5,1.45),
  SPOT:new V3(3.35,.5,-.3),
  FSPOT:new V3(10.45,.45,1.62),
  CAST:new V3(13.1,-.3,1.62),
  BERTH:new V3(7.8,.45,1.95),
  // Exact Claude standalone greeting shot. Keep these authored values fixed.
  OUT_POS:new V3(4.9,2.05,.35),
  OUT_TGT:new V3(1.6,1.55,-.3),
  SHOP_POS:new V3(2.25,2.02,-.25),
  SHOP_TGT:new V3(-2.3,1.55,.05)
};

const SHOP_ITEMS=[
  {id:'rodBamboo',name:'Bamboo Rod',sub:'Beginner rod with a float. Perch and roach.',object:'Rod_Bamboo'},
  {id:'rodSpin',name:'Spinning Rod',sub:'With a reel, casts far. For pike.',object:'Rod_Spinning'},
  {id:'rodFly',name:'Fly Rod',sub:'Long and light. Trout in the stream.',object:'Rod_Fly'},
  {id:'net',name:'Landing Net',sub:'Land the big ones without losing them.',object:'Landing_Net'},
  {id:'tackle',name:'Tackle Box',sub:'Room for hooks, lures and line.',object:'Tackle_Box'},
  {id:'lures',name:'Spoons & Plugs',sub:'Lures for predators. Reusable.',object:'Lure_Set'},
  {id:'worms',name:'Worms',sub:'A tin of fresh worms. The classic.',object:'Bait_Worms'},
  {id:'corn',name:'Sweetcorn',sub:'Bream and roach love it.',object:'Bait_Corn'},
  {id:'vest',name:'Life Vest',sub:'For trips out in the boat.',object:'Life_Vest'},
  {id:'bucket',name:'Zinc Bucket',sub:'Keeps the catch fresh.',object:'Zinc_Bucket'},
  {id:'creel',name:'Fishing Creel',sub:'Woven basket for the shoulder.',object:'Creel_Basket'}
];

// The visible part selected for each product. Rod line/tip decorations and net
// handles must not pull the highlight away from the product's readable body.
const SHOP_ANCHOR_MESH={
  rodBamboo:'Rod_Bamboo_Bamboo',rodSpin:'Rod_Spinning_Rod_Blank',
  rodFly:'Rod_Fly_Rod_Blank',net:'Landing_Net_Bag',
  tackle:'Tackle_Box_Plastic',lures:'Lure_Set_Wood_Natural',
  worms:'Bait_Worms_Plastic',corn:'Bait_Corn_Metal',
  vest:'Life_Vest_Fabric',bucket:'Zinc_Bucket_Zinc',creel:'Creel_Basket_Wicker'
};

const FISH={
  roach:{id:'roach',name:'Roach',w:30,min:12,max:28,pull:.35,reel:3,ring:1.45,hint:'Common near the dock.'},
  perch:{id:'perch',name:'Perch',w:30,min:15,max:40,pull:.45,reel:3.5,ring:1.4,hint:'Perch hang around the reeds.'},
  bream:{id:'bream',name:'Bream',w:20,min:25,max:55,pull:.55,reel:4.5,ring:1.35,hint:'Deep-bodied and patient.'},
  pike:{id:'pike',name:'Pike',w:7,min:50,max:110,pull:.80,reel:6,ring:1.1,hint:'A rare predator lurks around the old dock.'},
  eel:{id:'eel',name:'Eel',w:8,min:40,max:90,pull:.70,reel:5,ring:1.25,hint:'Sigurd says these are easier after dark.'}
};
const FISH_ORDER=['roach','perch','bream','pike','eel'];
// Claude Fish Board source has 18 discovery slots. R14 intentionally does NOT expand
// the locked fishing pool: only species actually caught by Fishing V1 are revealed.
const FISH_BOARD_SLOTS=[
  {id:'roach',time:'Any time'},{id:'perch',time:'Any time'},{id:'bream',time:'Any time'},
  {id:'pike',time:'Day'},{id:'eel',time:'Night only'},
  {id:null,time:'Dusk'},{id:null,time:'Night'},{id:null,time:'Day'},{id:null,time:'Morning'},
  {id:null,time:'Any time'},{id:null,time:'Any time'},{id:null,time:'Morning'},
  {id:null,time:'Any time'},{id:null,time:'Any time'},{id:null,time:'Day'},
  {id:null,time:'Day'},{id:null,time:'Day'},{id:null,time:'Winter nights'}
];
const TIPS=['Perch hang around the reeds. Worms never fail.','Roach are biting near the dock today.','Bream are slow. Be patient with them.','There is an old pike under the dock. Nobody has landed her yet.','Eels only come out after dark.'];

function rollFish(){
  let sum=FISH_ORDER.reduce((a,id)=>a+FISH[id].w,0)*Math.random();
  for(const id of FISH_ORDER){sum-=FISH[id].w;if(sum<=0){const f=FISH[id];return {f,cm:Math.round(f.min+(f.max-f.min)*Math.pow(Math.random(),1.7))};}}
  return {f:FISH.roach,cm:15};
}

function setShadows(root){root?.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});}
function moveToward(a,b,max){const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d<=max||d<1e-5){a.x=b.x;a.z=b.z;return d;}a.x+=dx/d*max;a.z+=dz/d*max;return d;}
function makeWorldLabel(text,width=246,height=78){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false});mat.toneMapped=false;mat.opacity=.96;const sprite=new THREE.Sprite(mat);sprite.scale.set(width/320,height/320,1);ctx.clearRect(0,0,width,height);ctx.font=`800 ${Math.round(height*.43)}px Manrope, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='rgba(24,20,12,.68)';ctx.shadowBlur=14;ctx.fillStyle='#fff4d6';ctx.fillText(text,width/2,height/2+1);tex.needsUpdate=true;sprite.userData.baseScale={x:sprite.scale.x,y:sprite.scale.y};return sprite;}

export class FishingV1System{
  constructor(scene,{state,world,input,hud,renderer,character}={}){
    this.scene=scene;this.state=state;this.world=world;this.input=input;this.hud=hud;this.renderer=renderer;this.character=character;
    this.land=world?.sharedLandscape;this.mode='world';this.phase='idle';this.T=0;this.starter=false;this.own={};this.log={};this.shopIndex=0;
    this.overlayRoot=null;this.shopRoot=null;this.sigurd=null;this.shopItems=[];this.shopCenters=[];this.fishTemplates=new Map();
    this.fishPoster=null;this.fishPosterPrint=null;this.fishBoardPoint=null;this._fishBoardCanvas=null;this._fishBoardCtx=null;this._fishBoardBaseImage=null;this._fishBoardTexture=null;this._fishThumbs=new Map();
    this.shopPoint=null;this.fishingPoint=null;this._shoreDir=new V3();this._shoreSpot=null;this.castPoint=null;this.castOrigin=new V3();this.castDir=new V3();this.reelNear=new V3();this.boatBerthPoint=null;
    this.marker=null;this.bobber=null;this.line=null;this.heldFish=null;
    this.timer=0;this.waitDur=0;this.biteWindow=0;this.holding=false;this.tension=0;this.progress=0;this.surgeT=0;this.surge=0;this.currentFish=null;this.currentCm=0;
    // R33 fishing presentation state. Core species/progression stays in the existing V1 flow.
    this.castPower=0;this.nibbles=[];this._nibbleIndex=0;this._nibblePulse=0;this.reelFish=null;this.landFishObj=null;this.landFrom=new V3();
    this._rod=null;this._rodJoints=[];this._rodTip=null;this._rodTipWorld=new V3();this._rodAngle=.95;this._rodBend=0;this._fishingShake=0;this._ripples=[];
    this._camInit=false;this._camPos=new V3();this._camTgt=new V3();this._dPos=new V3();this._dTgt=new V3();this._tmpA=new V3();this._tmpB=new V3();this._tmpC=new V3();this._tmpD=new V3();this._tmpQ=new THREE.Quaternion();this._losDir=new V3();this._losRay=new THREE.Raycaster();this._greetOccluders=[];
    this._bubbleTimer=0;this._msgTimer=0;this._lamp=0;this._lampLight=null;this._lampMaterial=null;
    this._hatchMixer=null;this._hatchAction=null;this._hatchClip=null;this._hatchTarget=0;
    this._sig={body:null,head:null,armL:null,armR:null,nodT:-99,waveT:-99,giftT:-99,lookYaw:0};
    this._time=0;this._snapExterior=false;this._giftFlights=[];this._giftRest=[];this._smokePuffs=[];this._smokeRoot=null;this._smokeAnchor=null;
    this.boat={object:null,owned:false,rented:false,on:false,docking:false,left:false,reachedWaterfall:false,pos:new V3(),yaw:0,v:0,w:0,tgt:null,homePos:new V3(),homeQuat:new THREE.Quaternion(),homeEuler:new THREE.Euler(0,0,0,'YXZ')};
    this._boatDir=new V3();this._boatWorldDir=new V3();this._boatSeat=new V3();this._boatWake=[];this._boatWakeClock=0;this._fishingFromBoat=false;this._defaultHint=this.hud?.hint?.textContent||'';
    this._boatWaterPlane=new THREE.Plane(new V3(0,1,0),-(this.land?.WL??0));
    this.ray=new THREE.Raycaster();this.ndc=new THREE.Vector2();this.pointerDown=null;
  }

  async init(){
    if(!this.land?.cabinWorld)throw new Error('Fishing V1 requires SharedLandscape cabin transform');
    await this.land.cabinReady;
    await this.loadSelectiveOverlay();
    await this.loadFishPoster();
    this.setupBoat();this.buildPoints();this.buildFishingVisuals();this.buildBoatWake();this.bindUI();this.bindPointerSelection();this.setupHatch();this.renderAll();
    document.body.classList.add('fishing-v1-ready');
    console.info(`[DYM] ${BUILD} selective fishing overlay ready`,{shop:this.shopRoot?.name,npc:this.sigurd?.name,source:OVERLAY_URL});
    return this;
  }

  async loadSelectiveOverlay(){
    const gltf=await new GLTFLoader().loadAsync(OVERLAY_URL);
    const src=gltf.scene;
    const shop=src.getObjectByName('Cabin_ShopInterior');
    const npc=src.getObjectByName('NPC_SivSigurd');
    if(!shop||!npc)throw new Error('Claude Fishing overlay is missing Cabin_ShopInterior or NPC_SivSigurd');

    // R6 hard admission boundary: only these two branches enter the runtime scene.
    // Diorama_Shore/Lake, duplicate LakeCabin/Boat, Player_Swamp, Bobber,
    // FishingSpot_Marker, BoatSpot_Marker and Fish_Set never enter the scene graph.
    const root=new THREE.Group();root.name='FISHING_V1_R6_SELECTIVE_OVERLAY';
    const locked=this.land.cabinAsset.root;
    root.position.copy(locked.position);root.quaternion.copy(locked.quaternion);root.scale.copy(locked.scale);
    this.shopRoot=shop.clone(true);this.shopRoot.name='Cabin_ShopInterior_R6';
    this.sigurd=npc.clone(true);this.sigurd.name='NPC_SivSigurd_R6';
    setShadows(this.shopRoot);setShadows(this.sigurd);root.add(this.shopRoot,this.sigurd);this.scene.add(root);this.overlayRoot=root;

    // Source-only catch templates. They are cloned on catch result; their authored
    // bridge placements are intentionally discarded.
    for(const id of FISH_ORDER){const t=src.getObjectByName(`Catch_${id}`);if(t){const c=t.clone(true);c.position.set(0,0,0);c.rotation.set(PI/2,0,0);this.fishTemplates.set(id,c);}}

    this.shopItems=SHOP_ITEMS.map((d,i)=>{const obj=this.shopRoot.getObjectByName(d.object);if(obj)obj.userData.fishingShopIndex=i;return {...d,obj};});
    root.updateMatrixWorld(true);
    this.buildShopAnchors();
    const cabinRoot=this.land.cabinAsset?.root;
    this._greetOccluders=['Cabin_Wall_Tar','Cabin_Interior_Emissive'].map(n=>cabinRoot?.getObjectByName(n)).filter(Boolean);

    // Claude's exported point light is intentionally not part of the GLB. Recreate only
    // that light inside the admitted shop overlay, at the exact authored local position.
    const light=new THREE.PointLight(0xffb468,0,7.5,1.5);light.name='FishingShop_PointLight_R6';light.position.set(.4,2.35,-.3);root.add(light);this._lampLight=light;
    this.shopRoot.traverse(o=>{if(o.isMesh&&o.material?.name==='Shop_Lamp'){o.material=o.material.clone();this._lampMaterial=o.material;}});

    this.setupSigurdRig();
    this.setupSigurdEffects();
    this.assertSelectiveBoundary();
  }

  async loadFishPoster(){
    // Load the user's updated Claude export as a SOURCE ONLY and admit exactly the
    // Cabin_FishPoster branch. The locked R13 shop/NPC/fish source remains byte-identical.
    const gltf=await new GLTFLoader().loadAsync(POSTER_URL);
    const authored=gltf.scene.getObjectByName('Cabin_FishPoster');
    if(!authored)throw new Error('R14 Fish Board source is missing Cabin_FishPoster');
    this.fishPoster=authored.clone(true);this.fishPoster.name='Cabin_FishPoster';setShadows(this.fishPoster);this.overlayRoot.add(this.fishPoster);
    this.fixFishPosterPosts();
    this.fishPosterPrint=this.fishPoster.getObjectByName('FishPoster_Print');
    if(!this.fishPosterPrint?.isMesh)throw new Error('R14 Fish Board source is missing FishPoster_Print');
    this.setupFishBoardTexture();
  }

  fixFishPosterPosts(){
    if(!this.fishPoster)return;
    // R15: the Claude board was authored against its own higher waterline. In WORLD V2
    // the post bottoms landed ~15 cm above the lake, which made the board read as floating.
    // Preserve the approved board/top placement and extend only the two post meshes down
    // to the same submerged visual depth as the neighbouring pier supports.
    this.overlayRoot.updateMatrixWorld(true,true);const desiredBottom=(this.land?.WL??-.9)-.55;
    this.fishPoster.traverse(o=>{if(!o.isMesh||!/^FishPoster_Post/.test(o.name))return;const box=new THREE.Box3().setFromObject(o),h=box.max.y-box.min.y,ext=box.min.y-desiredBottom;if(h<.01||ext<=.005)return;const ws=new V3();o.getWorldScale(ws);const factor=(h+ext)/h;o.scale.y*=factor;o.position.y-=ext/(2*Math.max(.0001,Math.abs(ws.y)));});
    this.fishPoster.updateMatrixWorld(true);
  }

  setupFishBoardTexture(){
    const mesh=this.fishPosterPrint,source=mesh.material?.map?.image;
    if(!source)return;
    const canvas=document.createElement('canvas');canvas.width=source.width||1536;canvas.height=source.height||1024;
    const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(source,0,0,canvas.width,canvas.height);
    const mat=mesh.material.clone(),tex=new THREE.CanvasTexture(canvas);tex.name='FishPoster_Runtime_R14';tex.flipY=false;tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
    mat.map=tex;mat.emissiveMap=tex;mesh.material=mat;this._fishBoardCanvas=canvas;this._fishBoardCtx=ctx;this._fishBoardBaseImage=source;this._fishBoardTexture=tex;
    this.renderFishBoard();
  }

  renderFishThumbnail(id){
    if(this._fishThumbs.has(id))return this._fishThumbs.get(id);
    const src=this.fishTemplates.get(id);if(!src||!this.renderer)return null;
    const root=src.clone(true);root.position.set(0,0,0);root.rotation.set(PI/2,0,0);root.scale.setScalar(1);setShadows(root);
    const scene=new THREE.Scene();scene.add(root);scene.add(new THREE.HemisphereLight(0xfff8e8,0x6f725f,2.1));const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(2.5,3.5,4);scene.add(key);
    root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root),center=box.getCenter(new V3()),size=box.getSize(new V3());root.position.sub(center);root.updateMatrixWorld(true);
    const span=Math.max(size.x,size.y,size.z,.1),aspect=2.15;const cam=new THREE.OrthographicCamera(-span*.66,span*.66,span*.66/aspect,-span*.66/aspect,.01,span*12);cam.position.set(0,span*.12,span*3.2);cam.lookAt(0,0,0);
    const w=384,h=178,target=new THREE.WebGLRenderTarget(w,h,{format:THREE.RGBAFormat,type:THREE.UnsignedByteType});target.texture.colorSpace=THREE.SRGBColorSpace;
    const prevTarget=this.renderer.getRenderTarget(),prevColor=this.renderer.getClearColor(new THREE.Color()).clone(),prevAlpha=this.renderer.getClearAlpha();
    this.renderer.setRenderTarget(target);this.renderer.setClearColor(0x000000,0);this.renderer.clear(true,true,true);this.renderer.render(scene,cam);
    const px=new Uint8Array(w*h*4);this.renderer.readRenderTargetPixels(target,0,0,w,h,px);this.renderer.setRenderTarget(prevTarget);this.renderer.setClearColor(prevColor,prevAlpha);target.dispose();
    const out=document.createElement('canvas');out.width=w;out.height=h;const ox=out.getContext('2d'),img=ox.createImageData(w,h);for(let y=0;y<h;y++){const srcOff=(h-1-y)*w*4,dstOff=y*w*4;img.data.set(px.subarray(srcOff,srcOff+w*4),dstOff);}ox.putImageData(img,0,0);this._fishThumbs.set(id,out);return out;
  }

  renderFishBoard(){
    const c=this._fishBoardCanvas,x=this._fishBoardCtx;if(!c||!x||!this._fishBoardBaseImage)return;
    const W=c.width,H=c.height,sx=W/1365,sy=H/1024;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,W,H);x.drawImage(this._fishBoardBaseImage,0,0,W,H);
    // Source texture is vertically stored upside-down for the glTF UV orientation.
    // Draw dynamic content in readable board coordinates, mirrored only on Y.
    x.save();x.translate(0,H);x.scale(sx,-sy);
    const xs=[48,305,562,819,1076],ys=[165,372,578,785],cw=241,ch=191;
    const caught=FISH_BOARD_SLOTS.filter(s=>s.id&&this.log[s.id]).length;
    x.fillStyle='#f4efe4';x.fillRect(1080,30,285,125);x.fillStyle='#342f27';x.textAlign='right';x.font='700 18px Arial, sans-serif';x.fillText('SPECIES CAUGHT',1355,68);x.font='700 62px Arial, sans-serif';x.fillText(`${caught} / 18`,1355,132);x.textAlign='left';
    for(let i=0;i<FISH_BOARD_SLOTS.length;i++){
      const slot=FISH_BOARD_SLOTS[i],entry=slot.id?this.log[slot.id]:null;if(!entry)continue;
      const col=i%5,row=Math.floor(i/5),px=xs[col],py=ys[row],fish=FISH[slot.id];if(!fish)continue;
      x.fillStyle='#e9e2d4';x.beginPath();x.roundRect(px,py,cw,ch,18);x.fill();
      x.fillStyle='#777064';x.font='600 15px Arial, sans-serif';x.fillText(String(i+1).padStart(2,'0'),px+18,py+27);
      const thumb=this.renderFishThumbnail(slot.id);if(thumb)x.drawImage(thumb,px+32,py+34,cw-64,84);
      x.fillStyle='#342f27';x.font='700 21px Arial, sans-serif';x.fillText(fish.name,px+18,py+139);
      x.fillStyle='#777064';x.font='600 12px Arial, sans-serif';x.fillText('TIME',px+18,py+162);x.fillText('BEST',px+183,py+162);
      x.fillStyle='#342f27';x.font='600 17px Arial, sans-serif';x.fillText(slot.time,px+18,py+184);x.textAlign='right';x.fillText(`${entry.best} cm`,px+223,py+184);x.textAlign='left';
    }
    const pct=Math.round(caught/18*100),golden=!!(this.log.goldenPike||this.state?.personal?.goldenPikeCaught),gx=819,gy=785,gw=498,gh=191;
    if(golden){x.fillStyle='#5f4720';x.beginPath();x.roundRect(gx,gy,gw,gh,18);x.fill();x.fillStyle='#d8b968';x.font='700 17px Arial, sans-serif';x.fillText('LEGEND',gx+28,gy+52);x.font='700 40px Arial, sans-serif';x.fillText('Golden Pike',gx+28,gy+102);x.fillStyle='#f0dfaa';x.font='500 17px Arial, sans-serif';x.fillText('The lake legend has been landed.',gx+28,gy+153);}else{
      x.fillStyle='#f4efe4';x.fillRect(gx+22,gy+38,452,125);x.fillStyle='#777064';x.font='600 16px Arial, sans-serif';x.fillText('PROGRESS',gx+28,gy+53);x.fillStyle='#342f27';x.font='700 36px Arial, sans-serif';x.fillText(`${pct}% of the lake`,gx+28,gy+96);x.fillStyle='#d4cec3';x.beginPath();x.roundRect(gx+28,gy+116,442,10,5);x.fill();x.fillStyle='#8a7651';x.beginPath();x.roundRect(gx+28,gy+116,442*(pct/100),10,5);x.fill();x.fillStyle='#777064';x.font='500 16px Arial, sans-serif';x.fillText('One legend is still missing from the board.',gx+28,gy+161);
    }
    x.restore();this._fishBoardTexture.needsUpdate=true;
  }

  buildShopAnchors(){
    this.shopCenters=[];
    for(const item of this.shopItems){
      if(!item.obj)throw new Error(`Missing fishing shop product: ${item.object}`);
      const mesh=item.obj.getObjectByName(SHOP_ANCHOR_MESH[item.id]);
      if(!mesh?.isMesh||!mesh.geometry?.attributes?.position)
        throw new Error(`Missing fishing shop anchor mesh: ${SHOP_ANCHOR_MESH[item.id]}`);
      item.obj.updateWorldMatrix(true,true);
      // Compute actual vertices in PRODUCT space. A rotated world AABB is not a
      // product-local bounding box and becomes inaccurate when the cabin rotates.
      const toItem=new THREE.Matrix4().copy(item.obj.matrixWorld).invert().multiply(mesh.matrixWorld);
      const bounds=new THREE.Box3(),point=new V3(),position=mesh.geometry.attributes.position;
      for(let i=0;i<position.count;i++)bounds.expandByPoint(point.fromBufferAttribute(position,i).applyMatrix4(toItem));
      const anchor=new THREE.Object3D();anchor.name=`Fishing_Anchor_${item.id}`;
      bounds.getCenter(anchor.position);item.obj.add(anchor);
      item.anchor=anchor;item.anchorMesh=mesh;
      this.shopCenters.push(new V3());
    }
    this.updateShopAnchors();
  }

  updateShopAnchors(){
    this.overlayRoot.updateWorldMatrix(true,true);
    for(let i=0;i<this.shopItems.length;i++){
      this.shopItems[i].anchor.getWorldPosition(this.shopCenters[i]);
      this.overlayRoot.worldToLocal(this.shopCenters[i]);
    }
  }

  assertSelectiveBoundary(){
    const forbidden=new Set(['Diorama_Shore','Diorama_Lake','LakeCabin','Player_Swamp','Bobber','FishingSpot_Marker','BoatSpot_Marker','Fish_Set']);
    const bad=[];this.overlayRoot?.traverse(o=>{if(forbidden.has(o.name))bad.push(o.name);});
    if(bad.length)throw new Error(`R6 selective overlay boundary violated: ${bad.join(', ')}`);
    const admitted=(this.overlayRoot?.children||[]).map(o=>o.name);
    console.info(`[DYM] ${BUILD} admission boundary OK`,{admitted});
  }

  setupSigurdRig(){
    const stem=this.sigurd.getObjectByName('Sigurd_Stem'),face=this.sigurd.getObjectByName('Sigurd_Face');
    const arms=[];this.sigurd.traverse(o=>{if(o.name==='Sigurd_Arm'&&o.parent)arms.push(o.parent);});
    this._sig.body=stem?.parent||null;this._sig.head=face?.parent||null;
    arms.sort((a,b)=>a.position.x-b.position.x);this._sig.armR=arms[0]||null;this._sig.armL=arms[arms.length-1]||null;
    this.sigurd.position.copy(LOCAL.SIG_DESK);this.sigurd.rotation.y=PI/2;this.sigurd.scale.setScalar(.82);
  }

  setupSigurdEffects(){
    if(!this.overlayRoot||!this.sigurd)return;
    this._smokeAnchor=this.sigurd.getObjectByName('Sigurd_Ember');
    if(!this._smokeAnchor){console.warn('[DYM] R14 smoke disabled: Sigurd_Ember missing');return;}
    this._smokeRoot=new THREE.Group();this._smokeRoot.name='Sigurd_PipeSmoke_R14';this.scene.add(this._smokeRoot);
    const mat=new THREE.MeshBasicMaterial({color:0xf2f2ec,transparent:true,opacity:.22,depthWrite:false});
    for(let i=0;i<6;i++){
      const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(.07,0),mat.clone());
      puff.visible=false;this._smokeRoot.add(puff);
      this._smokePuffs.push({mesh:puff,phase:i/6,life:.9+Math.random()*.45,scale:.7+Math.random()*.3});
    }
  }

  markSigurdNod(){this._sig.nodT=this._time||0;}
  markSigurdWave(){this._sig.waveT=this._time||0;}
  markSigurdGift(){this._sig.giftT=this._time||0;}

  triggerGiftHandover(ids=['rodBamboo','worms']){
    if(!this.overlayRoot||!this.shopItems?.length)return;
    const rests={
      rodBamboo:{pos:new V3(3.75,.82,.28),rot:new THREE.Euler(0,.03,-.18),scale:1},
      worms:{pos:new V3(2.725,1.458,.18),rot:new THREE.Euler(0,-.10,0),scale:1.18}
    };
    ids.forEach((id,i)=>{
      const item=this.shopItems.find(d=>d.id===id&&d.obj);const rest=rests[id];
      if(!item||!rest)return;
      const clone=item.obj.clone(true);clone.name=`Gift_${id}_R13`;setShadows(clone);
      const startW=new V3(),endW=rest.pos.clone(),midW=new V3(),startS=new V3();
      const startQ=new THREE.Quaternion();
      item.obj.getWorldPosition(startW);item.obj.getWorldQuaternion(startQ);item.obj.getWorldScale(startS);this.overlayRoot.localToWorld(endW);midW.copy(startW).lerp(endW,.5).add(new V3(.12,.28+0.08*i,.08));
      clone.position.copy(startW);clone.quaternion.copy(startQ);clone.scale.copy(startS);
      this.scene.add(clone);
      const endRot=rest.rot.clone();const startRot=clone.rotation.clone();
      const startScale=clone.scale.clone().multiplyScalar(id==='rodBamboo'?1.05:1.1);const endScale=startScale.clone().multiplyScalar(rest.scale||1);
      this._giftFlights.push({id,clone,startW:startW.clone(),midW,endW:endW.clone(),startRot,endRot,startScale,endScale,t:-i*.22,dur:id==='rodBamboo'?1.15:1.0,rest:0});
    });
  }

  updateGiftFlights(dt){
    if(!this._giftFlights.length&&!this._giftRest.length)return;
    for(let i=this._giftFlights.length-1;i>=0;i--){
      const f=this._giftFlights[i];f.t+=dt;if(f.t<0)continue;
      const u=THREE.MathUtils.clamp(f.t/f.dur,0,1),inv=1-u;
      f.clone.position.copy(f.startW).multiplyScalar(inv*inv).addScaledVector(f.midW,2*inv*u).addScaledVector(f.endW,u*u);
      f.clone.rotation.set(
        THREE.MathUtils.lerp(f.startRot.x,f.endRot.x,u),
        THREE.MathUtils.lerp(f.startRot.y,f.endRot.y,u),
        THREE.MathUtils.lerp(f.startRot.z,f.endRot.z,u)
      );
      f.clone.scale.lerpVectors(f.startScale,f.endScale,u);
      if(f.id==='rodBamboo')f.clone.rotation.y+=Math.sin(u*PI)*.06;
      if(u>=1){f.clone.position.copy(f.endW);f.clone.rotation.copy(f.endRot);f.rest=6;this._giftRest.push(f);this._giftFlights.splice(i,1);}
    }
    for(let i=this._giftRest.length-1;i>=0;i--){
      const f=this._giftRest[i];f.rest-=dt;if(f.rest<=0||!['greet','shop','enter'].includes(this.mode)){this.scene.remove(f.clone);this._giftRest.splice(i,1);}
    }
  }

  updatePipeSmoke(t){
    if(!this._smokeRoot||!this._smokePuffs.length||!this._smokeAnchor)return;
    const base=this._tmpA;this._smokeAnchor.getWorldPosition(base);const active=['enter','greet','shop','exit'].includes(this.mode);
    for(const puff of this._smokePuffs){
      const cyc=((t*.40)+puff.phase)%1,rise=cyc*cyc*(.62+puff.life*.24);puff.mesh.visible=active;
      puff.mesh.position.copy(base).add(new V3(.035*Math.sin((cyc+puff.phase)*7.1),.015+rise,.03*Math.cos((cyc+puff.phase)*5.3)));
      const sc=(.58+cyc*1.65)*puff.scale;puff.mesh.scale.setScalar(sc);puff.mesh.material.opacity=active?.21*(1-cyc):0;
    }
  }

  setupBoat(){
    const rig=this.land?.cabinAsset,b=rig?.boat;if(!b){console.warn('[DYM] R15 boat runtime disabled: canonical cabin Boat missing');return;}
    this.boat.object=b;b.rotation.order='YXZ';this.boat.homePos.copy(b.position);this.boat.homeQuat.copy(b.quaternion);this.boat.homeEuler.setFromQuaternion(b.quaternion,'YXZ');this.boat.pos.copy(b.position);this.boat.yaw=this.boat.homeEuler.y;
  }

  setBoatAccess({owned,rented}={}){if(typeof owned==='boolean'){this.boat.owned=owned;if(this.state?.personal)this.state.personal.boatOwned=owned;}if(typeof rented==='boolean'){this.boat.rented=rented;if(this.state?.personal)this.state.personal.boatRented=rented;}return this.hasBoatAccess();}
  hasBoatAccess(){return !!(this.boat.object&&(this.boat.owned||this.boat.rented||this.state?.personal?.boatOwned||this.state?.personal?.boatRented));}
  speciesN(){return FISH_ORDER.filter(id=>this.log[id]).length;}
  boatLocalToWorld(p,out=new V3()){out.copy(p);this.land.cabinAsset.root.localToWorld(out);return out;}
  boatWorldToLocal(p,out=new V3()){out.copy(p);this.land.cabinAsset.root.worldToLocal(out);return out;}

  buildPoints(){
    const w=(p)=>{const q=p.clone();this.overlayRoot.localToWorld(q);return q;};
    this.shopPoint=w(LOCAL.SPOT);this.fishingPoint=w(LOCAL.FSPOT);this.castPoint=w(LOCAL.CAST);this.castOrigin.copy(this.fishingPoint);this.boatBerthPoint=w(LOCAL.BERTH);
    if(this.fishPoster){this.fishBoardPoint=new V3();this.fishPoster.getWorldPosition(this.fishBoardPoint);this.fishBoardPoint.y=this.world.groundHeight(this.fishBoardPoint.x,this.fishBoardPoint.z);}
    const o=w(new V3(0,0,0)),x=w(new V3(1,0,0));this.castDir.copy(x.sub(o)).setY(0).normalize();
    this.reelNear.copy(this.fishingPoint).addScaledVector(this.castDir,.7);this.reelNear.y=this.land.WL;
  }

  buildBoatWake(){
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(.42,.54,24).rotateX(-PI/2),new THREE.MeshBasicMaterial({color:0xe7f2ef,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));m.visible=false;m.renderOrder=3;this.scene.add(m);this._boatWake.push({m,t:1});}
  }
  spawnBoatWake(){const b=this.boat.object;if(!b)return;const w=this._boatWake.find(r=>r.t>=1)||this._boatWake[0];const p=new V3(-1.35,.04,0);b.localToWorld(p);w.t=0;w.m.position.set(p.x,this.land.WL+.018,p.z);w.m.scale.setScalar(.25);w.m.material.opacity=.34;w.m.visible=true;}
  updateBoatWake(dt){for(const w of this._boatWake){if(w.t>=1){w.m.visible=false;continue;}w.t=Math.min(1,w.t+dt/1.15);w.m.scale.setScalar(.25+w.t*1.25);w.m.material.opacity=.34*(1-w.t);}}

  boatOkLocal(x,z){
    const p=this.boatLocalToWorld(new V3(x,this.boat.homePos.y,z),this._tmpA);
    if(this.land?.isBoatNavigableWater&&!this.land.isBoatNavigableWater(p.x,p.z))return false;
    if(!this.land?.isBoatNavigableWater){const lake=this.land?.lake;if(lake&&Math.hypot(p.x-lake.x,p.z-lake.z)>lake.r-1.25)return false;}
    if(this.land?.isCabinHouseFloor?.(p.x,p.z,.35)||this.land?.isCabinDeckFootprint?.(p.x,p.z,.24))return false;return true;
  }
  updateBoatSeat(){
    const b=this.boat.object;if(!b||!this.character)return;b.updateMatrixWorld(true);this._boatSeat.set(-.35,.22,0);b.localToWorld(this._boatSeat);this.character.position.copy(this._boatSeat);this.character.root.position.copy(this._boatSeat);
    const co=Math.cos(this.land.cabin.rotation),si=Math.sin(this.land.cabin.rotation),lx=Math.cos(this.boat.yaw),lz=-Math.sin(this.boat.yaw);this._boatWorldDir.set(co*lx+si*lz,0,-si*lx+co*lz).normalize();
    this.character.heading=Math.atan2(this._boatWorldDir.x,this._boatWorldDir.z);this.character.root.rotation.y=this.character.heading;this.character.velocity.set(this._boatWorldDir.x*this.boat.v,0,this._boatWorldDir.z*this.boat.v);this.character.currentSpeed=0;
    this.character.instance.updateVisual?.({dt:0,time:this._time||0,speed:0,maxSpeed:this.character.runSpeed,turnRate:0,velocity:new V3(),heading:this.character.heading});this.state.player.position={x:this._boatSeat.x,y:this._boatSeat.y,z:this._boatSeat.z};
  }
  showBoatHint(on){if(!this.hud?.hint)return;this.hud.hint.textContent=on?'W/S row · A/D steer · E to fish or dock · click water to row there':this._defaultHint;if(on)this.hud.hint.style.opacity='1';}
  boardBoat(){
    if(this.mode!=='world'||!this.hasBoatAccess())return;const rig=this.land.cabinAsset,b=this.boat.object;rig.setBoatFree?.(true);b.rotation.order='YXZ';this.boat.pos.copy(b.position);this.boat.homeEuler.setFromQuaternion(this.boat.homeQuat,'YXZ');this.boat.yaw=this.boat.homeEuler.y;this.boat.v=this.boat.w=0;this.boat.tgt=null;this.boat.left=false;this.boat.reachedWaterfall=false;this.boat.docking=false;this.boat.on=true;this.mode='boat';this.T=0;this.closePanels();this.character.velocity.set(0,0,0);this.character.currentSpeed=0;this.updateBoatSeat();this.showBoatHint(true);this.hud.showToast('Cast off! Follow the stream to the waterfall');this.syncClasses();
  }
  dockBoat(){if(this.mode!=='boat'||!this.boat.on||!this.boat.left)return;this.boat.docking=true;this.boat.tgt=null;this.hud.showToast('Returning to the dock…');}
  dockNow(){
    const rig=this.land.cabinAsset;this.boat.on=false;this.boat.docking=false;this.boat.left=false;this.boat.v=this.boat.w=0;this.boat.tgt=null;if(!this.boat.owned){this.boat.rented=false;if(this.state?.personal)this.state.personal.boatRented=false;}rig.setBoatFree?.(false);this.mode='world';this.T=0;this._fishingFromBoat=false;this.showBoatHint(false);this.character.position.copy(this.boatBerthPoint);this.character.position.y=this.world.groundHeight(this.character.position.x,this.character.position.z);this.character.root.position.copy(this.character.position);this.character.heading=this.localHeadingToWorld(-PI/2);this.character.root.rotation.y=this.character.heading;this.character.velocity.set(0,0,0);this.character.currentSpeed=0;this.state.player.position={x:this.character.position.x,y:this.character.position.y,z:this.character.position.z};this.syncClasses();this.hud.showToast('Boat tied up');
  }
  updateBoat(dt,t,controls=true){
    const b=this.boat.object;if(!this.boat.on||!b)return;const B=this.boat,H=B.homePos;
    if(B.docking){const k=Math.min(1,dt*1.6);B.pos.x+=(H.x-B.pos.x)*k;B.pos.z+=(H.z-B.pos.z)*k;let a=B.homeEuler.y-B.yaw;a=Math.atan2(Math.sin(a),Math.cos(a));B.yaw+=a*k;B.v*=Math.exp(-dt*4);B.w=0;if(Math.hypot(H.x-B.pos.x,H.z-B.pos.z)<.04&&Math.abs(a)<.02){this.dockNow();return;}}
    else{
      const m=this.input?.frameMove||{x:0,y:0};let thr=0,turn=0;if(controls){thr=m.y>=0?m.y:m.y*.6;turn=-m.x;if(Math.abs(thr)>.05||Math.abs(turn)>.05)B.tgt=null;}
      if(controls&&B.tgt){const dx=B.tgt.x-B.pos.x,dz=B.tgt.z-B.pos.z,d=Math.hypot(dx,dz);if(d<.6)B.tgt=null;else{let a=Math.atan2(-dz,dx)-B.yaw;a=Math.atan2(Math.sin(a),Math.cos(a));turn=Math.max(-1,Math.min(1,a*2));thr=Math.abs(a)<1.1?Math.min(1,d/2.5):.2;}}
      B.v+=thr*1.5*dt;B.v*=Math.exp(-dt*(controls?.55:2.5));B.v=Math.max(-.9,Math.min(2.2,B.v));B.w+=turn*2.4*dt;B.w*=Math.exp(-dt*2.8);B.yaw+=B.w*dt*(.45+Math.min(1,Math.abs(B.v)));
      this._boatDir.set(Math.cos(B.yaw),0,-Math.sin(B.yaw));const nx=B.pos.x+this._boatDir.x*B.v*dt,nz=B.pos.z+this._boatDir.z*B.v*dt;
      if(this.boatOkLocal(nx+this._boatDir.x*1.35,nz+this._boatDir.z*1.35)&&this.boatOkLocal(nx-this._boatDir.x*1.35,nz-this._boatDir.z*1.35)){B.pos.x=nx;B.pos.z=nz;}else{B.v*=-.25;B.tgt=null;}
      if(Math.hypot(B.pos.x-H.x,B.pos.z-H.z)>3)B.left=true;
      if(!B.reachedWaterfall&&this.land?.isBoatAtWaterfall){const wp=this.boatLocalToWorld(new V3(B.pos.x,H.y,B.pos.z),this._tmpB);if(this.land.isBoatAtWaterfall(wp.x,wp.z)){B.reachedWaterfall=true;this.hud.showToast('Waterfall reached');}}
    }
    b.position.set(B.pos.x,H.y+.03*Math.sin(t*1.6),B.pos.z);b.rotation.set(B.homeEuler.x+.025*Math.sin(t*1.6+1.1)-B.w*.05,B.yaw,B.homeEuler.z+.015*Math.sin(t*3.2)+B.v*.012,'YXZ');b.updateMatrixWorld(true);this.updateBoatSeat();
    this._boatWakeClock-=dt;if(Math.abs(B.v)>.35&&this._boatWakeClock<=0){this.spawnBoatWake();this._boatWakeClock=.15;}
  }

  setupHatch(){
    const cabin=this.land.cabinAsset,clip=cabin?.hatchClip;if(!cabin?.root||!clip)return;
    this._hatchClip=clip;this._hatchMixer=new THREE.AnimationMixer(cabin.root);this._hatchAction=this._hatchMixer.clipAction(clip);this._hatchAction.setLoop(THREE.LoopOnce,1);this._hatchAction.clampWhenFinished=true;this._hatchAction.enabled=true;this._hatchAction.paused=true;this._hatchAction.time=0;
  }
  openHatch(){const a=this._hatchAction;if(!a)return;a.enabled=true;a.paused=false;a.timeScale=1;if(a.time>=this._hatchClip.duration-.02)a.time=0;a.play();this._hatchTarget=1;}
  closeHatch(){const a=this._hatchAction;if(!a)return;a.enabled=true;a.paused=false;a.timeScale=-1;if(a.time<=.02)a.time=this._hatchClip.duration;a.play();this._hatchTarget=0;}

  buildFishingVisuals(){
    const marker=new THREE.Group();marker.name='FISHING_V1_RUNTIME_MARKER_R45';
    const holo=createHoloIndicator({radius:.58,height:1.30,intensity:.48,breath:2.4,scanSpeed:2.0,scanDensity:90,baseRing:true,groundHalo:true,fadeIn:.35});holo.setInstant(false);
    marker.add(holo.group);
    const label=makeWorldLabel('FISH');label.position.set(0,1.58,0);label.visible=false;marker.add(label);
    marker.position.copy(this.fishingPoint);marker.position.y=this.world.groundHeight(marker.position.x,marker.position.z)+.015;marker.visible=true;this.scene.add(marker);this.marker=marker;this.markerParts={holo,label,labelY:1.58};

    const bob=new THREE.Group();bob.name='FISHING_V1_RUNTIME_BOBBER_R6';
    const white=new THREE.MeshStandardMaterial({color:0xf2ead9,roughness:.45}),red=new THREE.MeshStandardMaterial({color:0xbc4a34,roughness:.48});
    const b1=new THREE.Mesh(new THREE.SphereGeometry(.055,10,8),white);b1.scale.y=.72;bob.add(b1);
    const b2=new THREE.Mesh(new THREE.SphereGeometry(.055,10,8,0,PI*2,0,PI/2),red);b2.scale.y=.72;b2.position.y=.005;bob.add(b2);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.11,6),red);stem.position.y=.08;bob.add(stem);bob.visible=false;this.scene.add(bob);this.bobber=bob;
    const geo=new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>new V3()));   // R80: 16 points so the line can sag
    this.line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xe9e4d3,transparent:true,opacity:.80}));this.line.visible=false;this.scene.add(this.line);
    this.buildFishingRod();this.buildFishingRipples();
  }

  buildFishingRod(){
    // Claude Fishing Polish reference: a visible low-poly bamboo rod with a responsive tip.
    // Runtime-only visual; it has no collision and does not alter the player's rig.
    const root=new THREE.Group();root.name='FISHING_R33_BAMBOO_ROD';root.visible=false;
    const bamboo=new THREE.MeshStandardMaterial({color:0xcfae63,roughness:.72,metalness:0,flatShading:true});
    const dark=new THREE.MeshStandardMaterial({color:0x5d4a31,roughness:.9,metalness:0,flatShading:true});
    const lengths=[.46,.44,.42,.40,.38],r0=[.020,.017,.014,.011,.008],r1=[.017,.014,.011,.008,.0055];
    let parent=root;this._rodJoints=[];
    for(let i=0;i<lengths.length;i++){
      const joint=new THREE.Group();joint.name=`FishingRod_Joint_${i}`;parent.add(joint);this._rodJoints.push(joint);
      const g=new THREE.CylinderGeometry(r1[i],r0[i],lengths[i],7,1,false);g.translate(0,lengths[i]*.5,0);
      const m=new THREE.Mesh(g,bamboo);m.castShadow=true;m.receiveShadow=true;joint.add(m);
      if(i<lengths.length-1){const node=new THREE.Mesh(new THREE.CylinderGeometry(r1[i]*1.28,r1[i]*1.28,.018,7),dark);node.position.y=lengths[i]-.009;joint.add(node);}
      const next=new THREE.Group();next.position.y=lengths[i];joint.add(next);parent=next;
    }
    const grip=new THREE.Mesh(new THREE.CylinderGeometry(.027,.030,.30,8),dark);grip.position.y=.15;root.add(grip);
    this._rodTip=new THREE.Object3D();this._rodTip.name='FishingRod_Tip_R33';parent.add(this._rodTip);
    this.scene.add(root);this._rod=root;
  }

  buildFishingRipples(){
    const mat=()=>new THREE.MeshBasicMaterial({color:0xf5f0df,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.RingGeometry(.12,.15,30),mat());m.rotation.x=-PI/2;m.visible=false;this.scene.add(m);this._ripples.push({m,t:9,size:1});}
  }

  spawnFishingRipple(pos,size=.65){
    const r=this._ripples.find(x=>x.t>=1)||this._ripples[0];if(!r)return;r.t=0;r.size=size;r.m.visible=true;r.m.position.set(pos.x,this.land.WL+.012,pos.z);r.m.scale.setScalar(.25);r.m.material.opacity=.58;
  }

  updateFishingEffects(dt){
    for(const r of this._ripples){if(r.t>=1)continue;r.t=Math.min(1,r.t+dt/1.05);r.m.scale.setScalar(.25+r.size*r.t*2.2);r.m.material.opacity=.58*(1-r.t);if(r.t>=1)r.m.visible=false;}
  }

  bindUI(){
    const q=id=>document.getElementById(id);this.ui={root:q('fishing-v1'),mini:q('fishing-mini-hud'),gearBtn:q('fishing-gear-btn'),logBtn:q('fishing-log-btn'),gearN:q('fishing-gear-n'),logN:q('fishing-log-n'),gear:q('fishing-gear-panel'),log:q('fishing-log-panel'),close:q('fishing-close'),closeL:q('fishing-close-label'),dlg:q('fishing-dialog'),card:q('fishing-card'),prev:q('fishing-prev'),next:q('fishing-next'),cName:q('fishing-card-name'),cSub:q('fishing-card-sub'),cIdx:q('fishing-card-index'),cState:q('fishing-card-state'),bubble:q('fishing-bubble'),ring:q('fishing-ring'),fwrap:q('fishing-fwrap'),fbtn:q('fishing-fbtn'),fbtnShell:q('fishing-fwrap')?.querySelector('.fishing-fbtn-shell'),fbtnHalo:q('fishing-fwrap')?.querySelector('.fishing-fbtn-halo'),fbL:q('fishing-fbtn-label'),fbS:q('fishing-fbtn-sub'),reel:q('fishing-reel-ui'),tens:q('fishing-tension'),prog:q('fishing-progress'),dist:q('fishing-distance'),bite:q('fishing-bite'),shr:q('fishing-shr'),msg:q('fishing-message'),res:q('fishing-result'),rK:q('fishing-result-kicker'),rN:q('fishing-result-name'),rS:q('fishing-result-size'),rL:q('fishing-result-line'),rB:q('fishing-result-button')};
    this.ui.close?.addEventListener('click',()=>this.closeContext());this.ui.prev?.addEventListener('click',()=>this.stepShop(-1));this.ui.next?.addEventListener('click',()=>this.stepShop(1));this.ui.gearBtn?.addEventListener('click',()=>this.openPanel('gear'));this.ui.logBtn?.addEventListener('click',()=>this.openPanel('log'));this.ui.rB?.addEventListener('click',()=>this.closeResult());
    const press=e=>{e?.preventDefault?.();e?.stopPropagation?.();this.pressFishing();};const release=()=>{this.releaseFishing();this.ui.fbtn?.classList.remove('down');this.updateFishButtonVisual();};
    this.ui.fbtn?.addEventListener('pointerdown',e=>{this.ui.fbtn.classList.add('down');press(e);});for(const ev of['pointerup','pointercancel','pointerleave'])this.ui.fbtn?.addEventListener(ev,release);
    addEventListener('keydown',e=>{if(this.mode==='world')return;if(this.mode==='greet'&&/^Digit[1-9]$/.test(e.code)){const b=this.ui.dlg?.querySelectorAll('button')[+e.code.slice(5)-1];if(b){b.click();e.preventDefault();e.stopPropagation();}}else if(this.mode==='shop'&&(e.code==='ArrowLeft'||e.code==='KeyA')){this.stepShop(-1);e.preventDefault();e.stopPropagation();}else if(this.mode==='shop'&&(e.code==='ArrowRight'||e.code==='KeyD')){this.stepShop(1);e.preventDefault();e.stopPropagation();}else if(e.code==='Escape'){this.closeContext();e.preventDefault();e.stopPropagation();}else if(this.mode==='fishing'&&(e.code==='Space'||e.code==='KeyE')&&!e.repeat){press(e);}},true);
    addEventListener('keyup',e=>{if(this.mode==='fishing'&&(e.code==='Space'||e.code==='KeyE'))release();},true);
    addEventListener('blur',()=>{if(this.mode==='fishing'){this.holding=false;this.ui.fbtn?.classList.remove('down');if(this.phase==='charge'){this.phase='ready';this.timer=0;this.castPower=0;this.setFishingButton('Cast','Hold','');this.syncClasses();}}},true);
  }

  bindPointerSelection(){
    const c=this.renderer?.domElement;if(!c)return;
    c.addEventListener('pointerdown',e=>{if(this.mode==='shop'||this.mode==='boat')this.pointerDown={x:e.clientX,y:e.clientY,id:e.pointerId,mode:this.mode};});
    c.addEventListener('pointerup',e=>{const d=this.pointerDown;this.pointerDown=null;if(!d||d.id!==e.pointerId||Math.hypot(e.clientX-d.x,e.clientY-d.y)>8||!this._activeCamera)return;
      this.ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);this.ray.setFromCamera(this.ndc,this._activeCamera);
      if(d.mode==='boat'&&this.mode==='boat'){const p=new V3();if(this.ray.ray.intersectPlane(this._boatWaterPlane,p)){const q=this.boatWorldToLocal(p,new V3());if(this.boatOkLocal(q.x,q.z))this.boat.tgt=q;}return;}
      if(d.mode!=='shop'||this.mode!=='shop')return;const roots=this.shopItems.map(i=>i.obj).filter(Boolean),hit=this.ray.intersectObjects(roots,true)[0];if(!hit)return;let o=hit.object;while(o&&o.userData.fishingShopIndex==null)o=o.parent;if(o?.userData.fishingShopIndex!=null){this.shopIndex=o.userData.fishingShopIndex;this.renderCard();}},true);
  }

  isBusy(){return this.mode!=='world';}
  interaction(p){
    if(this.mode==='boat'&&this.boat.on){const d=Math.hypot(this.boat.pos.x-this.boat.homePos.x,this.boat.pos.z-this.boat.homePos.z);if(this.boat.left&&d<2)return {type:'boat-dock',label:'Dock'};if(Math.abs(this.boat.v)<.6)return {type:'boat-fish',label:'Fish'};return null;}
    if(this.mode!=='world'||!p)return null;
    if(this.fishBoardPoint&&Math.hypot(p.x-this.fishBoardPoint.x,p.z-this.fishBoardPoint.z)<1.55)return {type:'fish-board',label:'Read Fish Board'};
    if(Math.hypot(p.x-this.shopPoint.x,p.z-this.shopPoint.z)<1.05)return {type:'fishing-shop',label:'Talk to Sigurd'};
    if(this.boatBerthPoint&&Math.hypot(p.x-this.boatBerthPoint.x,p.z-this.boatBerthPoint.z)<1.05)return this.hasBoatAccess()?{type:'boat-board',label:'Board boat'}:{type:'boat-board',label:'Locked',disabled:true,locked:true};   // R72 general rule
    // R71: fish from any shore of the lake, the stream and the waterfall basin (the old fixed dock-end spot is now the Lake Race circle).
    {const d=this.shoreDir(p);if(d)return this.starter?{type:'fishing-shore',label:'Fish',distance:2}:{type:'fishing-shore',label:'Locked',disabled:true,locked:true,distance:2};}   // R72: no rod yet = grey Locked
    return null;
  }
  // R71: unit direction from p towards boat-navigable water 2.4 and 3.4 m out (the side nearest the player's facing), or null.
  shoreDir(p){
    const L=this.land;if(!L?.isBoatNavigableWater||!p)return null;const h=this.character.heading||0;let best=null,bs=-9;
    for(let i=0;i<16;i++){const a=i/16*PI*2,dx=Math.sin(a),dz=Math.cos(a);if(!L.isBoatNavigableWater(p.x+dx*2.4,p.z+dz*2.4)||!L.isBoatNavigableWater(p.x+dx*3.4,p.z+dz*3.4))continue;const sc=Math.cos(a-h)+(L.isBoatNavigableWater(p.x+dx*1.4,p.z+dz*1.4)?.6:0);if(sc>bs){bs=sc;best=this._shoreDir.set(dx,0,dz);}}
    return best;
  }
  interact(type){if(type==='fish-board')this.openFishBoard();else if(type==='fishing-shop')this.openShop();else if(type==='fishing-spot'||type==='fishing-shore')this.enterFish();else if(type==='boat-board')this.boardBoat();else if(type==='boat-fish')this.enterFish();else if(type==='boat-dock')this.dockBoat();}

  openFishBoard(){if(this.mode!=='world'||!this.fishPoster)return;this.renderFishBoard();this.mode='board';this.T=0;this.closePanels();this.character.velocity.set(0,0,0);this.character.currentSpeed=0;this.character.root.visible=false;this.ui.root?.classList.add('show');this.syncClasses();}
  closeFishBoard(){if(this.mode!=='board')return;this.mode='board-exit';this.T=0;this.syncClasses();}
  openShop(){if(this.mode!=='world')return;this.mode='enter';this.T=0;this._snapExterior=true;this.openHatch();this.closePanels();this.ui.root?.classList.add('show','busy');this.syncClasses();this.renderDialog();this.markSigurdWave();this.character.velocity.set(0,0,0);this.character.currentSpeed=0;}
  closeShop(){if(!['greet','shop'].includes(this.mode))return;this.mode='exit';this.T=0;this.closePanels();this.sayTimer(1.2);this.syncClasses();}
  toGreet(){if(this.mode!=='shop')return;this.mode='greet';this.T=0;this._snapExterior=true;this.renderDialog();this.say('Anything else?',60);this.syncClasses();}
  closeContext(){if(this.mode==='board'){this.closeFishBoard();return;}if(this.mode==='shop'){this.toGreet();return;}if(this.mode==='greet'){this.closeShop();return;}if(this.mode==='fishing'){if(this.phase==='ready')this.leaveFish();return;}}

  greetLine(){if(!this.starter)return 'Want to try your luck? Start with the bamboo rod.';const n=Object.values(this.log).reduce((a,e)=>a+(e?.count||0),0);return n?['Back again? How are they biting?','Good day for it. What can I do for you?','Still smelling of fish, I see.'][Math.floor(Math.random()*3)]:'No luck yet? Try any shore. The whole lake bites, and the stream too.';}
  dialogOptions(){return this.starter?[['tip',"What's biting today?"],['boat',this.hasBoatAccess()?'About the boat…':'Can I take the boat out?'],['log','Show me my catches'],['look','Let me look at your gear'],['bye','See you']]:[['gift',"Sure, I'll give it a go"],['look','What else have you got?'],['bye','Maybe later']];}
  renderDialog(){if(!this.ui.dlg)return;this.ui.dlg.innerHTML=this.dialogOptions().map(([k,t],i)=>`<button class="fishing-opt${k==='bye'?' quiet':''}" data-k="${k}"><span class="n">${i+1}</span>${t}</button>`).join('');this.ui.dlg.querySelectorAll('.fishing-opt').forEach(b=>b.addEventListener('click',()=>this.choose(b.dataset.k)));}
  choose(k){if(this.mode!=='greet')return;
    if(k==='bye'){this.say(this.starter?'Tight lines out there.':'The rod will be here.',2);this.closeShop();return;}
    if(k==='tip'){this.say(TIPS[Math.floor(Math.random()*TIPS.length)],5);this.markSigurdNod();return;}
    if(k==='gift'){this.starter=true;this.own.rodBamboo=1;this.own.worms=1;this.markSigurdNod();this.markSigurdGift();this.triggerGiftHandover(['rodBamboo','worms']);this.say('There. My old bamboo rod and a tin of worms. Fish from any shore, then come back and show me.',6);this.hud.showToast('Bamboo Rod + Worms added');this.renderDialog();this.renderAll();return;}
    if(k==='boat'){const n=this.speciesN();if(this.boat.owned){this.say('Your boat is waiting at the dock.',4);return;}if(this.boat.rented){this.say('She is waiting at the dock. Bring her back in one piece.',4);return;}if(n>=3&&this.own.vest){this.setBoatAccess({rented:true});this.markSigurdNod();this.say('You have earned it. She is at the dock. Tie her up when you are done.',5);this.hud.showToast('Boat ready at the dock');this.renderDialog();return;}this.say(`Not yet. Show me three different fish first (${Math.min(n,3)}/3)`+(this.own.vest?'.':', and you will need a life vest. None for sale yet.'),5.5);return;}
    if(k==='log'){this.openPanel('log',true);const best=FISH_ORDER.filter(id=>this.log[id]?.best).sort((a,b)=>this.log[b].best/FISH[b].max-this.log[a].best/FISH[a].max)[0];this.say(best?`Let's see… a ${FISH[best].name.toLowerCase()} of ${this.log[best].best} cm. Not bad at all.`:'Nothing in the book yet? Off to the dock with you.',4.5);this.markSigurdNod();return;}
    this.shopIndex=0;this.renderCard();this.say('Have a look. The rest you will earn in time.',3.4);this.markSigurdNod();this.mode='shop';this.T=0;this.syncClasses();
  }

  stepShop(k){this.shopIndex=(this.shopIndex+k+SHOP_ITEMS.length)%SHOP_ITEMS.length;this.renderCard();}
  renderCard(){const d=SHOP_ITEMS[this.shopIndex];if(!d||!this.ui.cName)return;const own=!!this.own[d.id];this.ui.cName.textContent=d.name;this.ui.cSub.textContent=d.sub;this.ui.cIdx.textContent=`${this.shopIndex+1} / ${SHOP_ITEMS.length}`;this.ui.cState.classList.toggle('own',own);this.ui.cState.innerHTML=own?'Owned':'<span class="fishing-lock">▢</span>Coming soon';}
  renderGear(){const own=Object.keys(this.own);if(this.ui.gearN)this.ui.gearN.textContent=String(own.length);if(this.ui.gear)this.ui.gear.innerHTML='<h3><span>Gear</span></h3>'+(own.length?own.map(id=>{const d=SHOP_ITEMS.find(x=>x.id===id);return `<div class="fishing-row"><span>${d?.name||id}</span><span>${id==='worms'?'Unlimited':'Owned'}</span></div>`;}).join(''):'<div class="fishing-empty">Nothing yet. Sigurd at the hatch has a starter rod for you.</div>');}
  renderLog(){const found=FISH_ORDER.filter(id=>this.log[id]).length;if(this.ui.logN)this.ui.logN.textContent=`${found}/${FISH_ORDER.length}`;if(this.ui.log)this.ui.log.innerHTML=`<h3><span>Catch Log</span><span>${found}/${FISH_ORDER.length}</span></h3>`+FISH_ORDER.map(id=>{const e=this.log[id],f=FISH[id];return e?`<div class="fishing-row"><span>${f.name}</span><span>${e.count} caught · best ${e.best} cm</span></div>`:`<div class="fishing-row unk"><span>???</span><span>${f.hint}</span></div>`;}).join('');}
  renderAll(){this.renderGear();this.renderLog();this.renderCard();}
  openPanel(p,force=false){const el=p==='gear'?this.ui.gear:this.ui.log,other=p==='gear'?this.ui.log:this.ui.gear;if(!el)return;other?.classList.remove('show');el.classList.toggle('show',force||!el.classList.contains('show'));}
  closePanels(){this.ui.gear?.classList.remove('show');this.ui.log?.classList.remove('show');}
  say(t,d=2.8){if(!this.ui.bubble)return;this.ui.bubble.innerHTML='<b>Siv-Sigurd</b>'+t;this.ui.bubble.classList.add('show');this._bubbleTimer=d;}
  sayTimer(d){this._bubbleTimer=Math.min(this._bubbleTimer,d);}

  enterFish(){const fromBoat=this.mode==='boat'&&this.boat.on;if(!this.starter){this.hud.showToast('You need a rod. Talk to Sigurd at the hatch.');return;}this._fishingFromBoat=fromBoat;this.mode='fishing';this.phase='ready';this.T=0;this.timer=0;this.holding=false;this.castPower=0;this.nibbles=[];this._nibbleIndex=0;this.clearReelFish();this.clearLandFish();this.closePanels();this.character.velocity.set(0,0,0);this.character.currentSpeed=0;
    if(fromBoat){const co=Math.cos(this.land.cabin.rotation),si=Math.sin(this.land.cabin.rotation),lx=Math.cos(this.boat.yaw),lz=-Math.sin(this.boat.yaw);this.castDir.set(co*lx+si*lz,0,-si*lx+co*lz).normalize();this.castOrigin.copy(this.character.position);this.castPoint.copy(this.character.position).addScaledVector(this.castDir,2.6);this.reelNear.copy(this.character.position).addScaledVector(this.castDir,.6);this.castPoint.y=this.reelNear.y=this.land.WL;this.character.heading=Math.atan2(this.castDir.x,this.castDir.z);this.showBoatHint(false);}else if(this.shoreDir(this.character.position)){const d=this._shoreDir;this._shoreSpot=this.character.position.clone();this.castDir.copy(d);this.castOrigin.copy(this.character.position);this.castPoint.copy(this.castOrigin).addScaledVector(d,2.6);this.reelNear.copy(this.castOrigin).addScaledVector(d,.7);this.castPoint.y=this.reelNear.y=this.land.WL;this.character.heading=Math.atan2(d.x,d.z);}else{this._shoreSpot=null;this.castOrigin.copy(this.fishingPoint);const o=this.overlayRoot.localToWorld(new V3(0,0,0)),x=this.overlayRoot.localToWorld(new V3(1,0,0));this.castDir.copy(x.sub(o)).setY(0).normalize();this.castPoint.copy(this.overlayRoot.localToWorld(LOCAL.CAST.clone()));this.reelNear.copy(this.fishingPoint).addScaledVector(this.castDir,.7);this.reelNear.y=this.land.WL;this.character.heading=this.localHeadingToWorld(PI/2);}
    this.setFishingButton('Cast','Hold','');this.syncClasses();}
  leaveFish(){if(this.mode!=='fishing'||this.phase!=='ready')return;this.clearHeldFish();this.clearReelFish();this.clearLandFish();if(this._rod)this._rod.visible=false;this.bobber.visible=false;this.line.visible=false;this.mode=this.boat.on?'boat':'world';this.phase='idle';this.syncClasses();this.ui.root?.classList.remove('show');this.character.root.visible=true;this.character.velocity.set(0,0,0);this.character.currentSpeed=0;if(this.boat.on){this._fishingFromBoat=false;this.updateBoatSeat();this.showBoatHint(true);}else this.showBoatHint(false);}
  pressFishing(){if(this.mode!=='fishing')return;if(this.phase==='ready'){this.phase='charge';this.timer=0;this.castPower=0;this.setFishingButton('Release','to cast','charge');this.syncClasses();return;}if(this.phase==='wait'){this.fail('Too early!');return;}if(this.phase==='bite'){if(this.timer<=this.biteWindow){this.phase='reel';this.timer=0;this.tension=.22;this.progress=0;this.surgeT=.65;this.surge=0;this.holding=true;this.showReelFish();this.setFishingButton('Hold','to reel','');this.message('Hooked!');this.spawnFishingRipple(this.bobber.position,.55);this._fishingShake=Math.max(this._fishingShake,.035);this.syncClasses();}else this.fail('It got away…');return;}if(this.phase==='reel'){this.holding=true;this.updateFishButtonVisual();return;}if(this.phase==='result')this.closeResult();}
  releaseFishing(){if(this.mode!=='fishing'){this.holding=false;return;}if(this.phase==='charge')this.launchCast();this.holding=false;this.updateFishButtonVisual();}
  launchCast(){this.phase='cast';this.timer=0;this._castFrom=(this._castFrom||new V3()).copy(this.grip?.active?this.bobber.position:this.castOrigin);   // R80: the float leaves from under the rod tip
    let d=2.0+4.6*this.castPower;if(this._shoreSpot&&!this._fishingFromBoat&&this.land?.isBoatNavigableWater)while(d>2.4&&!this.land.isBoatNavigableWater(this.castOrigin.x+this.castDir.x*d,this.castOrigin.z+this.castDir.z*d))d-=.2;this.castPoint.copy(this.castOrigin).addScaledVector(this.castDir,d);this.castPoint.y=this.land.WL;this.reelNear.copy(this.castOrigin).addScaledVector(this.castDir,.68);this.reelNear.y=this.land.WL;this.setFishingButton('Cast','…','idle');this.syncClasses();}
  fail(t){this.phase='failed';this.timer=0;this.holding=false;this.clearReelFish();this.clearLandFish();this.message(t);this.setFishingButton('…','Resetting','idle');this.syncClasses();}
  startLandFish(){if(!this.currentFish)return;this.phase='land';this.timer=0;this.holding=false;this.landFrom.copy(this.bobber.position);this.bobber.visible=false;this.clearReelFish();this.clearLandFish();const src=this.fishTemplates.get(this.currentFish.id);if(src){this.landFishObj=src.clone(true);this.landFishObj.name=`FISHING_R33_LAND_${this.currentFish.id}`;setShadows(this.landFishObj);this.landFishObj.position.copy(this.landFrom);this.scene.add(this.landFishObj);}this.spawnFishingRipple(this.landFrom,1.0);this._fishingShake=Math.max(this._fishingShake,.045);this.syncClasses();}
  finishLandFish(){const f=this.currentFish,cm=this.currentCm;if(!f)return;const prev=this.log[f.id],first=!prev,record=!!prev&&cm>prev.best;this.log[f.id]={count:(prev?.count||0)+1,best:Math.max(prev?.best||0,cm)};this.phase='result';this.timer=0;this.clearLandFish();this.line.visible=false;this.renderLog();this.renderFishBoard();this.ui.rK.textContent=first?'First catch!':record?'New record!':'Caught';this.ui.rK.classList.toggle('rec',first||record);this.ui.rN.textContent=f.name;this.ui.rS.textContent=`${cm} cm`;const e=this.log[f.id];if(this.ui.rL)this.ui.rL.textContent=`${e.count} caught · best ${e.best} cm`;this.showHeldFish(f.id);this.syncClasses();}
  closeResult(){if(this.mode!=='fishing')return;this.clearHeldFish();this.clearReelFish();this.clearLandFish();this.phase='ready';this.timer=0;this.currentFish=null;this.castPower=0;this.setFishingButton('Cast','Hold','');this.syncClasses();}
  setFishingButton(a,b,c=''){if(this.ui.fbL)this.ui.fbL.textContent=a;if(this.ui.fbS)this.ui.fbS.textContent=b;if(this.ui.fbtn)this.ui.fbtn.classList.remove('hot','idle','charge');this.updateFishButtonVisual();}
  updateFishButtonVisual(){const btn=this.ui?.fbtn,halo=this.ui?.fbtnHalo;if(!btn)return;const p=THREE.MathUtils.clamp(this.phase==='charge'?this.castPower:this.phase==='reel'?this.progress:(this.phase==='bite'||this.phase==='result'?1:0),0,1);let state='ready',scale=1,glow=0;
    if(this.phase==='charge'){state='charge';scale=1+.315*p;glow=p;}
    else if(this.phase==='cast'){state='cast';scale=.94;}
    else if(this.phase==='wait'){state='wait';scale=1;glow=.18+.08*Math.sin(this._time*2.4);}
    else if(this.phase==='bite'){state='bite';const pulse=.5+.5*Math.sin(this._time*14);scale=1+.05*pulse;glow=pulse;}
    else if(this.phase==='reel'){state='reel';scale=1+.315*p+(this.holding?.012*Math.sin(this._time*11):0);glow=.25+.60*p;}
    else if(this.phase==='land'||this.phase==='result'){state='ready';scale=1;glow=0;}
    else if(this.phase==='failed'){state='ready';scale=1;glow=0;}
    btn.classList.remove('fish-ready','fish-charge','fish-cast','fish-wait','fish-bite','fish-reel','fish-caught','holding');btn.classList.add('fish-'+state);if(this.holding)btn.classList.add('holding');
    btn.style.setProperty('--fish-scale',scale.toFixed(4));btn.style.setProperty('--fish-halo',Math.max(0,glow).toFixed(3));btn.style.setProperty('--fish-glow-rgb',state==='bite'?'214,96,70':'176,196,104');btn.style.setProperty('--fish-brightness',(1+Math.max(0,glow)*.35).toFixed(3));btn.style.setProperty('--fish-glow-size',`${(8+34*p).toFixed(1)}px`);btn.style.setProperty('--fish-glow-spread',`${(6*p).toFixed(1)}px`);btn.style.setProperty('--fish-glow-alpha',(0.25+0.6*Math.max(p,glow)).toFixed(3));if(halo){halo.style.setProperty('--fish-scale',scale.toFixed(4));halo.style.setProperty('--fish-halo',Math.max(0,glow).toFixed(3));halo.style.setProperty('--fish-glow-rgb',state==='bite'?'214,96,70':'176,196,104');}}

  message(t){if(!this.ui.msg)return;this.ui.msg.textContent=t;this.ui.msg.classList.remove('show');void this.ui.msg.offsetWidth;this.ui.msg.classList.add('show');this._msgTimer=.95;}

  showReelFish(){this.clearReelFish();const src=this.currentFish&&this.fishTemplates.get(this.currentFish.id);if(!src)return;this.reelFish=src.clone(true);this.reelFish.name=`FISHING_R33_REEL_${this.currentFish.id}`;this.reelFish.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
    // R33G: make the hooked fish readable through the water without changing reel mechanics.
    this.reelFish.scale.multiplyScalar(THREE.MathUtils.clamp(.84+(this.currentCm||25)/165,.92,1.30));this.scene.add(this.reelFish);}
  clearReelFish(){if(this.reelFish){this.scene.remove(this.reelFish);this.reelFish=null;}}
  clearLandFish(){if(this.landFishObj){this.scene.remove(this.landFishObj);this.landFishObj=null;}}
  showHeldFish(id){this.clearHeldFish();const t=this.fishTemplates.get(id);if(!t)return;const fish=t.clone(true),wrap=new THREE.Group();wrap.name=`FISHING_RUNTIME_RESULT_${id}`;fish.name=`FISHING_RUNTIME_RESULT_MESH_${id}`;setShadows(fish);
    // R33I: result fish is presented on its side: horizontal, head-left, broadside to camera.
    // Templates are pre-rotated for in-water use; reset that pose here and flip heading 180 deg.
    fish.rotation.set(0,PI,0);wrap.add(fish);wrap.updateMatrixWorld(true);
    let bx=new THREE.Box3().setFromObject(fish),ct=bx.getCenter(new V3());fish.position.x-=ct.x;fish.position.z-=ct.z;fish.position.y-=bx.max.y;wrap.updateMatrixWorld(true);
    bx=new THREE.Box3().setFromObject(fish);const sz=bx.getSize(new V3()),longest=Math.max(.001,sz.x,sz.y,sz.z),target=THREE.MathUtils.clamp(2.22+(this.currentCm||25)/180,2.28,2.62);wrap.scale.setScalar(target/longest);this._heldFishSize=target;this.heldFish=wrap;this.scene.add(wrap);}
  clearHeldFish(){if(this.heldFish){this.scene.remove(this.heldFish);this.heldFish=null;}this._heldFishSize=0;}

  localHeadingToWorld(h){return h+this.land.cabin.rotation;}

  sigurdFocusWorld(out=this._tmpB){
    if(this._sig.head){this._sig.head.getWorldPosition(out);out.y+=.34;return out;}
    this.sigurd.getWorldPosition(out);out.y+=1.25;return out;
  }

  correctGreetCamera(pos,target){
    if(!this._greetOccluders.length)return pos;
    this._losDir.copy(target).sub(pos);const dist=this._losDir.length();if(dist<.25)return pos;
    this._losDir.multiplyScalar(1/dist);this._losRay.set(pos,this._losDir);this._losRay.near=.02;this._losRay.far=Math.max(.02,dist-.14);
    const hits=this._losRay.intersectObjects(this._greetOccluders,true).filter(h=>h.distance<dist-.14);
    if(!hits.length)return pos;
    const last=hits[hits.length-1];pos.copy(last.point).addScaledVector(this._losDir,.18);return pos;
  }
  scriptPlayerToward(target,dt){const p=this.character.position,d=moveToward(p,target,1.5*dt);p.y=this.world.groundHeight(p.x,p.z);if(d>.04){this.character.heading=Math.atan2(target.x-p.x,target.z-p.z);this.character.root.rotation.y=this.character.heading;}this.character.root.position.copy(p);this.character.instance.updateVisual?.({dt,time:this._time||0,speed:d>.04?1.5:0,maxSpeed:this.character.runSpeed,turnRate:0,velocity:new V3(),heading:this.character.heading});this.state.player.position={x:p.x,y:p.y,z:p.z};return d;}
  syncPlayerVisibility(){if(!this.character?.root)return;const catchHero=this.mode==='fishing'&&(this.phase==='land'||this.phase==='result');const hide=this.mode==='board'||this.mode==='board-exit'||(this.mode==='enter'&&this.T>1.1)||this.mode==='greet'||this.mode==='shop'||(this.mode==='exit'&&this.T<1.2)||catchHero;this.character.root.visible=!hide;}

  animateSigurd(t,dt){const s=this._sig;if(!this.sigurd)return;const target=(this.mode==='shop'?LOCAL.SIG_SIDE:LOCAL.SIG_DESK);this.sigurd.position.lerp(target,Math.min(1,dt*2.2));
    if(s.body){s.body.rotation.z=.035*Math.sin(t*.8);s.body.rotation.x=.025*Math.sin(t*.63+1);}
    if(s.head){const kn=(t-s.nodT)/.8;s.head.rotation.x=kn>0&&kn<1?.3*Math.sin(PI*kn)*Math.sin(PI*kn*2+.4)+.12*Math.sin(PI*kn):0;s.head.rotation.z=-.03*Math.sin(t*.8+.4);s.head.rotation.y=.08*Math.sin(t*.37);}
    const kw=(t-s.waveT)/1.4,wv=kw>0&&kw<1?Math.sin(PI*kw):0;
    const kg=(t-s.giftT)/1.55,gv=kg>0&&kg<1?Math.sin(PI*kg):0;
    if(s.armL){s.armL.rotation.z=.08*Math.sin(t*1.1)+wv*(.9+.25*Math.sin(t*14))-gv*.28;s.armL.rotation.x=-gv*.42;}
    if(s.armR){s.armR.rotation.z=-.08*Math.sin(t*1.1+.6)+gv*.48;s.armR.rotation.x=-gv*.55;}
    if(this._activeCamera&&['enter','greet','shop','exit'].includes(this.mode)){const wp=new V3();this.sigurd.getWorldPosition(wp);const a=Math.atan2(this._activeCamera.position.x-wp.x,this._activeCamera.position.z-wp.z);const local=a-this.land.cabin.rotation;let d=local-this.sigurd.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));this.sigurd.rotation.y+=d*Math.min(1,dt*3);}
  }

  syncClasses(){const r=this.ui.root;if(!r)return;for(const c of['busy','greet','shop','board','fishing','canleave','charging','casting','waiting','biting','reeling','landing','result'])r.classList.remove(c);const overlay=!['world','boat'].includes(this.mode);r.classList.toggle('show',overlay);if(this.mode==='enter'||this.mode==='exit'||this.mode==='board-exit')r.classList.add('busy');if(this.mode==='board'||this.mode==='board-exit')r.classList.add('board');if(this.mode==='greet')r.classList.add('greet');if(this.mode==='shop')r.classList.add('shop');if(this.mode==='fishing'){r.classList.add('fishing');if(this.phase==='ready')r.classList.add('canleave');if(this.phase==='charge')r.classList.add('charging');if(this.phase==='cast')r.classList.add('casting');if(this.phase==='wait')r.classList.add('waiting');if(this.phase==='bite')r.classList.add('biting');if(this.phase==='reel')r.classList.add('reeling');if(this.phase==='land')r.classList.add('landing');if(this.phase==='result')r.classList.add('result');}if(this.ui.closeL)this.ui.closeL.textContent=this.mode==='shop'?'Back to Sigurd':this.mode==='fishing'?(this.boat.on?'Back to boat':'Leave spot'):'Close';document.body.classList.toggle('fishing-active',overlay);document.body.classList.toggle('boating-active',this.mode==='boat');}

  updateFishingRod(dt,t){
    if(!this._rod)return;this._rod.visible=this.mode==='fishing'&&this.phase!=='result';
    // R80: the rod sits in the right hand (FishingGrip); the old floating rod stays only as the fail-soft fallback.
    if(this.grip===undefined){try{this.grip=new FishingGrip(this);}catch(e){console.warn('[TGW] fishing grip unavailable (fails soft)',e);this.grip=null;}}
    if(this.grip?.ok&&this.grip.update(dt,t))return;
    if(!this._rod.visible)return;
    const pp=this._tmpA.set(-this.castDir.z,0,this.castDir.x);this._rod.position.copy(this.character.position).addScaledVector(pp,.20).addScaledVector(this.castDir,.08);this._rod.position.y+=.82;this._rod.rotation.order='YXZ';this._rod.rotation.y=Math.atan2(this.castDir.x,this.castDir.z);
    let angle=.95,bend=.02;
    if(this.phase==='charge'){angle=.62-1.20*this.castPower;bend=-.08-.18*this.castPower;}
    else if(this.phase==='cast'){angle=this.timer<.22?1.38:1.02;bend=this.timer<.22?.16:.04;}
    else if(this.phase==='wait'){angle=1.02+.015*Math.sin(t*1.8);bend=.04+.03*Math.sin(t*2.2);}
    else if(this.phase==='bite'){angle=.92;bend=.30+.10*Math.sin(t*24);}
    else if(this.phase==='reel'){angle=.55+.30*this.tension-.12*this.progress;bend=.32+.72*this.tension+(this.surge>0?.16:0);}
    else if(this.phase==='land'||this.phase==='result'){angle=.42;bend=.42+.06*Math.sin(t*4)*Math.exp(-Math.min(3,this.timer));}
    else if(this.phase==='failed'){angle=.78;bend=.02;}
    const k=1-Math.exp(-dt*(this.phase==='cast'?13:7));this._rodAngle=THREE.MathUtils.lerp(this._rodAngle,angle,k);this._rodBend=THREE.MathUtils.lerp(this._rodBend,bend,k);this._rod.rotation.x=this._rodAngle;
    const n=this._rodJoints.length;for(let i=0;i<n;i++)this._rodJoints[i].rotation.x=this._rodBend*(i/n)*.18;
    this._rod.updateMatrixWorld(true);this._rodTip?.getWorldPosition(this._rodTipWorld);
  }

  updateFishing(dt,t){this.timer+=dt;this._nibblePulse=Math.max(0,this._nibblePulse-dt*3.5);
    if(this.phase==='ready'){this.bobber.visible=this.line.visible=false;this.castPower=0;this.updateFishButtonVisual();return;}
    if(this.phase==='charge'){// R33C: fixed outer ring; the olive button grows inward->outward with the repeating cast-power cycle.
      this.castPower=.5-.5*Math.cos((this.timer/.90)*PI);this.updateFishButtonVisual();return;}
    if(this.phase==='cast'){this.updateFishButtonVisual();
      const u=Math.min(1,this.timer/.72);this.bobber.visible=this.line.visible=true;this.bobber.position.lerpVectors(this._castFrom||this.castOrigin,this.castPoint,u);this.bobber.position.y=(this.grip?.active?(this._castFrom.y+(this.land.WL-this._castFrom.y)*u):this.land.WL)+( .72+1.1*this.castPower)*4*u*(1-u);this.updateLine();if(u>=1){this.phase='wait';this.timer=0;this.waitDur=2.5+Math.random()*3.5;const r=rollFish();this.currentFish=r.f;this.currentCm=r.cm;this.biteWindow=r.f.ring;this.nibbles=[...Array(Math.floor(Math.random()*3))].map(()=>.7+Math.random()*Math.max(.2,this.waitDur-1.4)).sort((a,b)=>a-b);this._nibbleIndex=0;this.spawnFishingRipple(this.castPoint,.72);this.setFishingButton('Wait…','for the bite','idle');this.syncClasses();}
      return;
    }
    if(this.phase==='wait'||this.phase==='bite'){this.updateFishButtonVisual();
      let dy=.012*Math.sin(t*2.3);if(this.phase==='wait'){const nt=this.nibbles[this._nibbleIndex];if(nt!=null&&this.timer>=nt){this._nibbleIndex++;this._nibblePulse=.9;this.spawnFishingRipple(this.castPoint,.26);}if(this._nibblePulse>0)dy-=.035*Math.sin(PI*Math.min(1,this._nibblePulse));if(this.timer>=this.waitDur){this.phase='bite';this.timer=0;this.setFishingButton('Strike!','Tap / E','hot');this.message('Bite!');this.spawnFishingRipple(this.castPoint,.48);this._fishingShake=Math.max(this._fishingShake,.025);this.syncClasses();}}
      if(this.phase==='bite'){dy=-.085+.015*Math.sin(t*28);if(this.timer>=this.biteWindow+.15){this.fail('It got away…');return;}}
      this.bobber.position.set(this.castPoint.x,this.land.WL+dy,this.castPoint.z);this.updateLine();return;
    }
    if(this.phase==='reel'){this.updateFishButtonVisual();
      const f=this.currentFish;this.surgeT-=dt;if(this.surgeT<=0){this.surge=.35;this.surgeT=.7+Math.random()*1.3;this.spawnFishingRipple(this.bobber.position,.35+.25*f.pull);this._fishingShake=Math.max(this._fishingShake,.008+.015*f.pull);}this.surge=Math.max(0,this.surge-dt);
      const extra=this.surge>0?f.pull*1.25*dt:0;if(this.holding){this.tension+=dt*(.18+f.pull*.43)+extra;this.progress+=dt/(f.reel*1.05)*(this.tension<.84?1:.62);}else{this.tension=Math.max(0,this.tension-dt*.82)+extra*.45;this.progress=Math.max(0,this.progress-dt*.022*f.pull);}if(this.tension>=1){this.fail('Snap! The line broke.');return;}if(this.progress>=1){this.startLandFish();return;}
      const pp=this._tmpA.set(-this.castDir.z,0,this.castDir.x),sway=Math.sin(t*5.3)*.32*f.pull*(1-this.progress);this.bobber.position.lerpVectors(this.castPoint,this.reelNear,this.progress);this.bobber.position.addScaledVector(pp,sway);this.bobber.position.y=this.land.WL-.05+.02*Math.sin(t*20);this.updateLine();
      if(this.reelFish){const dir=this._tmpB.subVectors(this.reelNear,this.castPoint).normalize().addScaledVector(pp,Math.cos(t*5.3)*.55*f.pull).normalize();this.reelFish.position.copy(this.bobber.position).addScaledVector(dir,-.08);
        // R33G: keep the hooked fish close enough to the surface to be visible while it fights.
        const fightLift=this.surge>0?.025*Math.sin(t*24):0;this.reelFish.position.y=this.land.WL-(this.surge>0?.012:.055)-.025*(1-this.progress)+fightLift;
        this.reelFish.rotation.set(.07*Math.sin(t*9),Math.atan2(-dir.z,dir.x)+PI+.32*Math.sin(t*13),.16*Math.sin(t*11)+(this.surge>0?.18:0));}
      if(this.ui.tens){this.ui.tens.style.width=(this.tension*100)+'%';this.ui.tens.style.background=this.tension>.84?'#b8402c':this.tension>.62?'#c8913a':'#6b7a3a';}if(this.ui.prog)this.ui.prog.style.width=(this.progress*100)+'%';if(this.ui.dist)this.ui.dist.textContent=((1-this.progress)*this.castOrigin.distanceTo(this.castPoint)).toFixed(1)+' m';return;
    }
    if(this.phase==='land'){const u=Math.min(1,this.timer/.82),e=u*u*(3-2*u),pp=this._tmpA.set(-this.castDir.z,0,this.castDir.x),target=this._tmpB.copy(this.character.position).addScaledVector(this.castDir,.18).addScaledVector(pp,.22);target.y+=1.20;if(this.landFishObj){this.landFishObj.position.lerpVectors(this.landFrom,target,e);this.landFishObj.position.y+=.55*Math.sin(PI*u);this.landFishObj.rotation.y=Math.atan2(this.castDir.x,this.castDir.z)+PI/2;this.landFishObj.rotation.z=.22*Math.sin(t*9)*(1-u);}this.bobber.position.copy(this.landFishObj?.position||target);this.line.visible=true;this.updateLine();if(u>=1)this.finishLandFish();return;}
    if(this.phase==='result'){return;}
    if(this.phase==='failed'&&this.timer>1.15){this.phase='ready';this.timer=0;this.bobber.visible=this.line.visible=false;this.castPower=0;this.setFishingButton('Cast','Hold','');this.syncClasses();}
  }

  updateLine(){if(!this.line.visible)return;const a=(this._rod?.visible&&this._rodTip)?this._rodTipWorld:this._tmpA.copy(this.character.position).setY(this.character.position.y+1.0);const b=this.bobber.position;const p=this.line.geometry.attributes.position,n=p.count;
    // R80: a slack line sags (waiting / dangling), a tight one is straight (reeling, landing).
    const sag=this.phase==='reel'||this.phase==='land'||this.phase==='cast'?0:this.phase==='wait'||this.phase==='bite'?.12:.02,by=b.y+.085;for(let i=0;i<n;i++){const u=i/(n-1);p.setXYZ(i,a.x+(b.x-a.x)*u,a.y+(by-a.y)*u-sag*4*u*(1-u),a.z+(b.z-a.z)*u);}p.needsUpdate=true;this.line.geometry.computeBoundingSphere();}

  update(dt,t,character=this.character){
    this.character=character||this.character;this._time=t;this._hatchMixer?.update(dt);this.T+=this.mode==='world'?0:dt;if(this._bubbleTimer>0){this._bubbleTimer-=dt;if(this._bubbleTimer<=0)this.ui.bubble?.classList.remove('show');}
    const lampOn=['enter','greet','shop','exit'].includes(this.mode)&&!(this.mode==='exit'&&this.T>.9);this._lamp+=(Number(lampOn)-this._lamp)*Math.min(1,dt*(lampOn?6:3));if(this._lampLight)this._lampLight.intensity=this._lamp*5;if(this._lampMaterial)this._lampMaterial.emissiveIntensity=this._lamp*2.4;
    if(this.marker){const on=false,mp=this.markerParts;if(mp){on?mp.holo.show():mp.holo.hide();mp.holo.update(t,dt);const lx=.018*Math.sin(t*1.2),ly=.035*Math.sin(t*1.85+.6),lr=.032*Math.sin(t*1.5+.3),ls=1+.028*Math.sin(t*1.72+.2);mp.label.visible=on;mp.label.position.set(lx,mp.labelY+ly,0);mp.label.material.rotation=lr;const bs=mp.label.userData.baseScale||{x:mp.label.scale.x,y:mp.label.scale.y};mp.label.scale.set(bs.x*ls,bs.y*(1+.018*Math.cos(t*1.4+.2)),1);mp.label.material.opacity=.78+.16*(.5+.5*Math.sin(t*2.4));}}
    if(this.mode==='enter'){this.scriptPlayerToward(this.shopPoint,dt);this.character.heading=this.localHeadingToWorld(-PI/2);this.character.root.rotation.y=this.character.heading;if(this.T>1.7){this.mode='greet';this.T=0;this.markSigurdWave();this.say(this.greetLine(),60);this.renderDialog();this.syncClasses();}}
    else if(this.mode==='board-exit'){if(this.T>.48){this.mode='world';this.T=0;this.ui.root?.classList.remove('show');document.body.classList.remove('fishing-active');this.character.root.visible=true;this.syncClasses();}}
    else if(this.mode==='exit'){if(this.T>.9&&this._hatchTarget!==0)this.closeHatch();if(this.T>1.9){this.mode='world';this.T=0;this.ui.root?.classList.remove('show');document.body.classList.remove('fishing-active');this.character.root.visible=true;this.closePanels();}}
    else if(this.mode==='boat'){this.showBoatHint(true);this.updateBoat(dt,t,true);}
    else if(this.mode==='fishing'){if(this.boat.on)this.updateBoat(dt,t,false);else{this.scriptPlayerToward(this._shoreSpot||this.fishingPoint,dt);this.character.heading=this._shoreSpot?Math.atan2(this.castDir.x,this.castDir.z):this.localHeadingToWorld(PI/2);this.character.root.rotation.y=this.character.heading;}this.updateFishing(dt,t);}
    this.updateFishingRod(dt,t);if(this.grip?.active&&this.mode==='fishing'){if(this.phase==='ready'||this.phase==='charge'){this.grip.dangle(dt);this.line.visible=true;}this.updateLine();}this.updateFishingEffects(dt);this._fishingShake*=Math.exp(-dt*6);
    this.updateBoatWake(dt);this.syncPlayerVisibility();this.animateSigurd(t,dt);this.updateGiftFlights(dt);this.updatePipeSmoke(t);if(this.heldFish){this.heldFish.position.copy(this.character.position).addScaledVector(this.castDir,.48);this.heldFish.position.y+=3.05+.035*Math.sin(t*3);
      // R33J: keep the approved belly-down/back-up pose, then yaw the whole fish 90 deg camera-left so the head points left in the hero shot.
      this.heldFish.rotation.y=Math.atan2(this._activeCamera?.position.x-this.heldFish.position.x,this._activeCamera?.position.z-this.heldFish.position.z)-PI/2;}
    return {busy:this.isBusy()};
  }

  applyCamera(camera,followCamera,dt){
    this._activeCamera=camera;if(this.mode==='world'){this._camInit=false;return;}if(!this.overlayRoot)return;
    if(!this._camInit){this._camPos.copy(camera.position);this._camTgt.copy(followCamera?.look||this.character.position);this._camInit=true;}
    const portrait=camera.aspect<.85,inShop=this.mode==='shop',board=this.mode==='board',boardExit=this.mode==='board-exit',atOut=this.mode==='enter'||this.mode==='greet'||(this.mode==='exit'&&this.T<1.5),boating=this.mode==='boat',fishing=this.mode==='fishing';let fov=portrait?60:46;
    if(board&&this.fishPosterPrint){
      const center=this._dTgt;this.fishPosterPrint.getWorldPosition(center);this.fishPosterPrint.getWorldQuaternion(this._tmpQ);const front=new V3(0,0,1).applyQuaternion(this._tmpQ).normalize();
      const worldScale=new V3();this.fishPosterPrint.getWorldScale(worldScale);const bw=1.6*Math.abs(worldScale.x),bh=1.2*Math.abs(worldScale.y);fov=portrait?56:44;const v=THREE.MathUtils.degToRad(fov),dist=Math.max((bh*.5)/Math.tan(v*.5),(bw*.5)/(Math.tan(v*.5)*Math.max(.35,camera.aspect)))*1.13;
      this._dPos.copy(center).addScaledVector(front,dist);
    }
    else if(boardExit){this._dPos.copy(followCamera.position);this._dTgt.copy(followCamera.look);fov=camera.aspect<.8?58:48;}
    else if(inShop){this.updateShopAnchors();this._dPos.copy(LOCAL.SHOP_POS);this._dTgt.copy(LOCAL.SHOP_TGT);const c=this.shopCenters[this.shopIndex];if(c)this._dTgt.lerp(c,portrait ? .25 : .5);this.overlayRoot.localToWorld(this._dPos);this.overlayRoot.localToWorld(this._dTgt);fov=portrait?74:52;}
    else if(atOut){
      // R13: keep Claude Design's exported camera node as the source of truth. The
      // integration GLB is parented under the canonical cabin transform, so this world
      // transform is the exact authored shot rather than a reconstructed approximation.
      const rig=this.land?.cabinAsset,viewCam=rig?.sigurdViewCamera,viewTarget=rig?.sigurdViewTarget;
      if(viewCam&&viewTarget){
        viewCam.getWorldPosition(this._dPos);viewTarget.getWorldPosition(this._dTgt);viewCam.getWorldQuaternion(this._tmpQ);
        const extras=viewCam.userData||{};
        const portraitCut=Number.isFinite(extras.portraitWhenAspectBelow)?extras.portraitWhenAspectBelow:.85;
        const landFov=Number.isFinite(extras.fovDegLandscape)?extras.fovDegLandscape:(viewCam.fov||42);
        const portraitFov=Number.isFinite(extras.fovDegPortrait)?extras.fovDegPortrait:60;
        fov=camera.aspect<portraitCut?portraitFov:landFov;
        camera.position.copy(this._dPos);camera.quaternion.copy(this._tmpQ);camera.fov=fov;
        camera.near=Number.isFinite(extras.near)?extras.near:(viewCam.near||.08);
        camera.far=Number.isFinite(extras.far)?extras.far:(viewCam.far||200);
        camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
        this._camPos.copy(this._dPos);this._camTgt.copy(this._dTgt);this._snapExterior=false;
        this.projectUI(camera);return;
      }
      // Defensive fallback only if the integration GLB is unavailable.
      this._dPos.copy(LOCAL.OUT_POS);this._dTgt.copy(LOCAL.OUT_TGT);
      this.overlayRoot.localToWorld(this._dPos);this.overlayRoot.localToWorld(this._dTgt);fov=portrait?60:42;
    }
    else if(boating){this._dTgt.copy(followCamera.look);this._dPos.copy(followCamera.position).sub(followCamera.look).multiplyScalar(portrait?1.35:1.55).add(followCamera.look);fov=portrait?58:48;}
    else if(fishing){const c=this.castDir,pp=new V3(-c.z,0,c.x),p=this.character.position,b=this.bobber.position,mid=this._tmpB.copy(p).lerp(b,.5);let spd=3.2;
      const liveCastDist=(this.phase==='charge')?(2.0+4.6*this.castPower):Math.max(2.0,p.distanceTo(this.castPoint||b));
      const rearBack=(portrait?3.0:2.6)+liveCastDist*(portrait?.42:.34),rearHeight=(portrait?1.95:1.55)+liveCastDist*(portrait?.11:.07);
      // R33B: authored over-shoulder view rather than a centered rear shot. The lateral
      // offset scales with camera distance so long casts stay cinematic instead of flattening out.
      const shoulderRatio=portrait?.50:.46,rearSide=rearBack*shoulderRatio;
      const rearShot=(focus,lookY=.38)=>{this._dPos.copy(p).addScaledVector(c,-rearBack).addScaledVector(pp,-rearSide);this._dPos.y=p.y+rearHeight;this._dTgt.copy(focus);this._dTgt.y=Math.max(this.land.WL+lookY,p.y+.28);};
      if(this.phase==='result'||this.phase==='land'){const obj=this.heldFish||this.landFishObj;let focus=this._tmpA.copy(p).setY(p.y+1.55),fishSpan=this._heldFishSize||1.5;if(obj){obj.updateMatrixWorld(true);const bx=new THREE.Box3().setFromObject(obj);if(!bx.isEmpty()){bx.getCenter(focus);const sz=bx.getSize(this._tmpC);fishSpan=Math.max(.55,sz.x,sz.y,sz.z);}}const hero=this.phase==='result',d=Math.max(hero?3.1:2.25,fishSpan*(portrait?(hero?3.25:3.45):(hero?2.75:3.10)));const dir=this._tmpD.copy(pp).multiplyScalar(-1).addScaledVector(c,portrait?-.28:-.18).normalize();this._dPos.copy(focus).addScaledVector(dir,d);this._dPos.y+=d*(portrait?.12:.08);this._dTgt.copy(focus);this._dTgt.y+=hero?fishSpan*(portrait?.05:.09):-d*(portrait?.08:.13);fov=portrait?(hero?50:47):(hero?34:30);spd=this.phase==='land'?2.2:3.0;}
      else if(this.phase==='bite'){this._dPos.copy(b).addScaledVector(c,-1.25).addScaledVector(pp,-.78);this._dPos.y=this.land.WL+.38;this._dTgt.copy(b);this._dTgt.y+=.06;fov=portrait?55:35;spd=5;}
      else if(this.phase==='reel'){rearShot(mid,.48);fov=portrait?63:48;spd=3.4;}
      else if(this.phase==='wait'){rearShot(mid,.40);fov=portrait?63:48;spd=2.0;}
      else if(this.phase==='cast'){const focus=this._tmpA.copy(p).lerp(this.bobber.visible?b:this.castPoint,.54);rearShot(focus,.42);fov=portrait?65:50;spd=3.8;}
      else if(this.phase==='charge'){const aim=this._tmpA.copy(p).addScaledVector(c,liveCastDist*.54);aim.y=this.land.WL;rearShot(aim,.44);fov=portrait?63:48;spd=4;}
      else{const focus=this._tmpA.copy(p).addScaledVector(c,2.25);rearShot(focus,.50);fov=portrait?60:46;}
      this._dPos.y=Math.max(this._dPos.y,this.land.WL+.28);this._fishingCamSpeed=spd;}
    else{this._dPos.copy(followCamera.position);this._dTgt.copy(followCamera.look);fov=camera.aspect<.8?58:48;}
    const camSpeed=fishing?(this._fishingCamSpeed||3.2):(this.mode==='world'?5:3.2),k=1-Math.exp(-dt*camSpeed);this._camPos.lerp(this._dPos,k);this._camTgt.lerp(this._dTgt,k);camera.position.copy(this._camPos);if(fishing&&this._fishingShake>0)camera.position.add(this._tmpA.set(Math.sin(this._time*61),Math.sin(this._time*53+1),Math.sin(this._time*47+2)).multiplyScalar(this._fishingShake));camera.lookAt(this._camTgt);if(atOut)camera.fov=fov;else camera.fov+=(fov-camera.fov)*k;camera.updateProjectionMatrix();
    // lookAt updates the quaternion AFTER its internal matrix refresh. The normal
    // follow camera also ran this frame, so projection otherwise uses its rotation.
    camera.updateMatrixWorld(true);this.projectUI(camera);
  }

  projectUI(camera){
    if((this.mode==='enter'||this.mode==='greet'||this.mode==='shop'||this.mode==='exit')&&this.ui.bubble&&this.sigurd){
      if(this._sig.head)this._sig.head.getWorldPosition(this._tmpA);else new THREE.Box3().setFromObject(this.sigurd).getCenter(this._tmpA);
      this._tmpA.y+=.48;this._tmpA.project(camera);
      const rect=this.renderer?.domElement?.getBoundingClientRect?.()||{left:0,top:0,width:innerWidth,height:innerHeight};
      const bw=this.ui.bubble.offsetWidth||320,bh=this.ui.bubble.offsetHeight||120,pad=18;
      const lx=rect.left+(this._tmpA.x+1)*.5*rect.width,ty=rect.top+(1-this._tmpA.y)*.5*rect.height;
      const x=THREE.MathUtils.clamp(lx,pad+bw*.5,rect.left+rect.width-pad-bw*.5);
      const y=THREE.MathUtils.clamp(ty,pad+bh,rect.top+rect.height-pad);
      this.ui.bubble.style.left=x+'px';this.ui.bubble.style.top=y+'px';
    }
    if(this.mode==='shop'&&this.ui.ring){
      const item=this.shopItems[this.shopIndex],rect=this.renderer.domElement.getBoundingClientRect();
      if(item?.anchor){
        item.anchor.getWorldPosition(this._tmpA).project(camera);
        const visible=this._tmpA.z>=-1&&this._tmpA.z<=1&&Math.abs(this._tmpA.x)<=1&&Math.abs(this._tmpA.y)<=1;
        this.ui.ring.style.left=(rect.left+(this._tmpA.x+1)*.5*rect.width)+'px';
        this.ui.ring.style.top=(rect.top+(1-this._tmpA.y)*.5*rect.height)+'px';
        this.ui.ring.classList.toggle('on',visible);
      }else this.ui.ring.classList.remove('on');
    }else this.ui.ring?.classList.remove('on');
    if(this.phase==='bite'&&this.ui.bite){this._tmpB.copy(this.bobber.position).project(camera);this.ui.bite.style.left=((this._tmpB.x+1)/2*innerWidth)+'px';this.ui.bite.style.top=((1-this._tmpB.y)/2*innerHeight)+'px';const s=THREE.MathUtils.clamp(1-this.timer/Math.max(.001,this.biteWindow),0,1);this.ui.shr.style.transform=`scale(${s})`;}
  }
}
