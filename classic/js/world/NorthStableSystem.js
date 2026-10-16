// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  buildStable, ARENA, JUMPS, JUMP_START, JUMP_FINISH, LAP_CHECKPOINTS, HOUSE, RIN, GATE as SOURCE_GATE,
  TRACK, PER, U0, START_X, trackPt, blocked as stableBlocked
} from './StableV2R23G.js?build=NORTH-STABLE-R23O-20260929A';
import { DISC, SCOPES, board, medal, dayKey } from '../gameplay/StableRaceData.js?build=NORTH-STABLE-R23O-20260929A';
import { createHoloIndicator } from '../visual/holo-indicator.js';

const BASE='./assets/stable/';
const ROOT={x:70,z:-155,rotation:Math.PI};
const HORSES=[
  {name:'Birk',node:'Animal_01_horse',prefix:'horse',x:-7.4,z:-4.85},
  {name:'Kul',node:'Animal_02_horse_kul',prefix:'horse_kul',x:-6.0,z:-4.85},
  {name:'Solvej',node:'Animal_03_horse_solvej',prefix:'horse_solvej',x:-4.6,z:-4.85}
];
const THORA_TALK_RADIUS=1.6;
const THORA_POS={x:3.3,z:-14.3};
const TALK_POINT={x:3.3,z:-16.25};
const THORA_SHOP_POS={x:1.72,z:-14.18};
const SHOP_CAMERA={x:3.28,y:1.62,z:-15.55};
const SHOP_ITEMS=[
  {id:'saddle',name:'Classic Saddle',cat:'Horse',sub:'A sturdy leather saddle for long rides.',x:4.65,y:1.16,z:-12.46,scale:1.0},
  {id:'bridle',name:'Leather Bridle',cat:'Horse',sub:'Simple dark leather tack with brass details.',x:3.55,y:1.48,z:-12.43,scale:1.0},
  {id:'blanket',name:'Saddle Blanket',cat:'Horse',sub:'A woven stable blanket in Thora’s practical style.',x:2.55,y:1.03,z:-12.46,scale:1.0},
  {id:'carrots',name:'Carrot Bundle',cat:'Care',sub:'Fresh stable treats. Economy integration comes later.',x:1.62,y:.98,z:-12.44,scale:1.0}
];
const GATE={x:0,z:-15.55,radius:3.1};
const TIPS=['Heels down, eyes up. The horse goes where you look.','Jump from about two strides out. Too close and the poles come down.','On the track, stay near the inner rail. The outside is longer.','The jumps are numbered. Take them in order, or don\'t bother finishing.','Nobody beats a gallop on the track. The bike is for people in a hurry.'];
const REOPEN=['Back for more? Good.','She\'s been asking for you. Horses don\'t lie.','Mind my poles this time.'];
const SAVE_KEY='dym.thoraStable.v1';
const DEF={lent:false,own:false,laps:0,clears:0,runs:[],ghost:{},medals:{},cos:{blanket:'red'}};
const COS={blanket:[['red','Barn red',0x9a3a2e,null],['linen','Linen',0xd8ccb0,'bronze'],['moss','Moss',0x5f7a44,'silver'],['midnight','Midnight',0x2e3a5e,'gold']]};
const MR={bronze:1,silver:2,gold:3};
const HSPD={Walk:1.6,Trot:3.5,Gallop:7};
const LAP_MARKER={x:START_X,z:TRACK.cz-TRACK.R,r:1.7};
const LAP_CP_COUNT=LAP_CHECKPOINTS.length;
const PI=Math.PI;
const ease=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
const fmt=t=>t==null||!isFinite(t)?'–':t<60?t.toFixed(2):Math.floor(t/60)+':'+(t%60).toFixed(2).padStart(5,'0');
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const crossJ=(J,px,pz,x,z)=>{const a1=J.ax==='x'?x-J.x:z-J.z,n0=J.ax==='x'?pz-J.z:px-J.x,n1=J.ax==='x'?z-J.z:x-J.x;return Math.abs(a1)<1.6&&n0!==0&&n1!==0&&Math.sign(n0)!==Math.sign(n1)?Math.sign(n1):0;};
const crossGate=(G,px,pz,x,z)=>{const half=(G.w||3.4)/2,a1=G.ax==='x'?x-G.x:z-G.z,n0=G.ax==='x'?pz-G.z:px-G.x,n1=G.ax==='x'?z-G.z:x-G.x,along=G.ax==='x'?x-G.x:z-G.z;return Math.abs(along)<=half&&n0!==0&&n1!==0&&Math.sign(n0)!==Math.sign(n1)?Math.sign(n1):0;};

// R23N: one east-side START/FINISH and a four-jump loop around the long jumping facility.
const JUMP_COURSE_VERSION='jump-r23n-v1';
const JUMP_SPAWN={x:JUMP_START.x+1.35,z:JUMP_START.z,h:-PI/2};
const _jw=[
  [JUMP_SPAWN.x,JUMP_SPAWN.z],[JUMP_START.x,JUMP_START.z],[16.4,8.2],[15.0,10.3],
  [JUMPS[0].x,JUMPS[0].z-2.0],[JUMPS[0].x,JUMPS[0].z],[JUMPS[0].x,JUMPS[0].z+1.8],
  [9.0,15.5],[JUMPS[1].x+2.4,JUMPS[1].z],[JUMPS[1].x,JUMPS[1].z],[JUMPS[1].x-2.4,JUMPS[1].z],
  [-8.5,15.2],[-13.5,12.2],[JUMPS[2].x,JUMPS[2].z+2.1],[JUMPS[2].x,JUMPS[2].z],[JUMPS[2].x,JUMPS[2].z-2.1],
  [-12.5,3.0],[-6.5,1.2],[JUMPS[3].x-2.4,JUMPS[3].z],[JUMPS[3].x,JUMPS[3].z],[JUMPS[3].x+2.4,JUMPS[3].z],
  [9.5,1.5],[15.5,4.0],[17.5,6.4],[JUMP_FINISH.x-1.4,JUMP_FINISH.z],[JUMP_FINISH.x,JUMP_FINISH.z]
];
const JCURVE=new THREE.CatmullRomCurve3(_jw.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');
const JLEN=JCURVE.getLength();

function deepCopySave(){return JSON.parse(JSON.stringify(DEF));}
function loadSave(key=SAVE_KEY){try{return Object.assign(deepCopySave(),JSON.parse(localStorage.getItem(key))||{});}catch(e){return deepCopySave();}}
function cloneMaterials(root){root.traverse(o=>{if(!o.isMesh)return;if(Array.isArray(o.material))o.material=o.material.map(m=>m.clone());else if(o.material)o.material=o.material.clone();});}
function makeMarkerLabel(text,width=250,height=78){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false});mat.toneMapped=false;mat.opacity=.96;const sprite=new THREE.Sprite(mat);sprite.scale.set(width/320,height/320,1);ctx.clearRect(0,0,width,height);ctx.font=`800 ${Math.round(height*.43)}px Manrope, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='rgba(24,20,12,.68)';ctx.shadowBlur=14;ctx.fillStyle='#fff4d6';ctx.fillText(text,width/2,height/2+1);tex.needsUpdate=true;sprite.userData.baseScale={x:sprite.scale.x,y:sprite.scale.y};return sprite;}

export class NorthStableSystem{
  constructor(scene,{world,state,renderer,saveKey=SAVE_KEY}={}){
    this.saveKey=saveKey;   // R125 (GO 07/10): Stable progress per character
    this.scene=scene;this.world=world;this.state=state;this.renderer=renderer;this.character=null;this.input=null;this.hud=null;this.followCamera=null;
    this.root=new THREE.Group();this.root.name='NORTH_STABLE_ROOT';this.root.position.set(ROOT.x,0,ROOT.z);this.root.rotation.y=ROOT.rotation;this.scene.add(this.root);
    this.loader=new GLTFLoader();this.mixers=[];this.horses=[];this.mount=null;this.ghostHorse=null;this.ready=false;this.mode='world';this.T=0;this._bubbleTimer=0;this._camInit=false;
    this.saveData=loadSave(this.saveKey);this.lent=!!this.saveData.lent;this.access=false;
    this.ride={x:0,z:0,h:0,v:0,y:0,jumpT:-1,mt:0,refused:-99,reserve:1};this.race=null;this.raceScope='day';
    this._setupDisc='lap_horse';this._setupHorseName=HORSES[0].name;this._setupReturnMode='world';
    this.rideCamYaw=PI;this.rideCamPitch=.42;this.rideCamDist=7;this._rideCamInit=false;this._rideCamPos=new THREE.Vector3();this._rideCamTgt=new THREE.Vector3();this._rideDragging=false;this._ridePointer=null;this._rideLastX=0;this._rideLastY=0;
    this.tunnelBlend=0;this.tunnelCamYaw=PI;this._tunnelInit=false;
    this._raceMsgTimer=0;this._sideMode=null;this._shopIndex=0;this.shopDisplays=[];this.shopLight=null;this._shopCamInit=false;this.raceMarkers=[];
    this._camPos=new THREE.Vector3();this._camTgt=new THREE.Vector3();this._dPos=new THREE.Vector3();this._dTgt=new THREE.Vector3();this._tmp=new THREE.Vector3();this._tmp2=new THREE.Vector3();this._hoofBox=new THREE.Box3();
    this.ui={
      root:document.getElementById('stable-talk'),close:document.getElementById('stable-talk-close'),closeL:document.getElementById('stable-talk-close-label'),dlg:document.getElementById('stable-talk-dialog'),bubble:document.getElementById('stable-talk-bubble'),status:document.getElementById('stable-status-bubble'),side:document.getElementById('stable-side-panel'),
      setup:document.getElementById('stable-ride-setup'),setupClose:document.getElementById('stable-setup-close'),setupName:document.getElementById('stable-setup-name'),setupSub:document.getElementById('stable-setup-sub'),setupStats:document.getElementById('stable-setup-stats'),setupHorses:document.getElementById('stable-setup-horses'),setupWard:document.getElementById('stable-setup-wardrobe'),setupStart:document.getElementById('stable-setup-start'),
      raceRoot:document.getElementById('stable-race-ui'),raceTitle:document.getElementById('stable-race-title'),raceName:document.getElementById('stable-race-name'),raceSub:document.getElementById('stable-race-sub'),raceMsg:document.getElementById('stable-race-message'),raceHud:document.getElementById('stable-race-hud'),raceTime:document.getElementById('stable-race-time'),racePenWrap:document.getElementById('stable-race-pen-wrap'),racePen:document.getElementById('stable-race-pen'),raceNextLabel:document.getElementById('stable-race-next-label'),raceNext:document.getElementById('stable-race-next'),raceGhostLabel:document.getElementById('stable-race-ghost-label'),raceGhost:document.getElementById('stable-race-ghost'),raceStamina:document.getElementById('stable-race-stamina'),raceStaminaBar:document.getElementById('stable-race-stamina-bar'),
      restart:document.getElementById('stable-race-restart'),quit:document.getElementById('stable-race-quit'),result:document.getElementById('stable-race-result'),resultKick:document.getElementById('stable-result-kick'),resultMedalLabel:document.getElementById('stable-result-medal-label'),resultMedalPop:document.getElementById('stable-result-medal-pop'),resultRays:document.getElementById('stable-result-rays'),resultFlash:document.getElementById('stable-result-flash'),resultPenalty:document.getElementById('stable-result-penalty'),resultSkip:document.getElementById('stable-result-skip'),resultDisc:document.getElementById('stable-result-disc'),resultTime:document.getElementById('stable-result-time'),resultSub:document.getElementById('stable-result-sub'),resultPb:document.getElementById('stable-result-pb'),resultBest:document.getElementById('stable-result-best'),resultRanks:document.getElementById('stable-result-ranks'),resultTabs:document.getElementById('stable-result-tabs'),resultPodium:document.getElementById('stable-result-podium'),resultList:document.getElementById('stable-result-list'),resultYou:document.getElementById('stable-result-you'),resultGhostNote:document.getElementById('stable-result-ghost-note'),resultBoard:document.getElementById('stable-result-board'),resultBoardScrim:document.getElementById('stable-result-board-scrim'),resultBoardClose:document.getElementById('stable-result-board-close'),resultBoardTitle:document.getElementById('stable-result-board-title'),resultStandings:document.getElementById('stable-result-standings'),resultQuote:document.getElementById('stable-result-quote'),resultUnlock:document.getElementById('stable-result-unlock'),resultStageFrame:document.getElementById('stable-result-stage-frame'),resultSceneDisc:document.getElementById('stable-result-scene-disc'),resultThoraBubble:document.getElementById('stable-result-thora-bubble'),resultThoraMood:document.getElementById('stable-result-thora-mood'),resultBack:document.getElementById('stable-result-back'),resultRaceGhost:document.getElementById('stable-result-race-ghost'),resultBoardDone:document.getElementById('stable-result-board-done'),again:document.getElementById('stable-race-again'),done:document.getElementById('stable-race-done'),jump:document.getElementById('stable-jump')
    };
    this.bindUI();
  }

  bindRuntime({character,renderer,input,hud,followCamera}={}){
    if(character)this.character=character;if(renderer)this.renderer=renderer;if(input)this.input=input;if(hud)this.hud=hud;if(followCamera)this.followCamera=followCamera;
    this.bindRidePointer();return this;
  }

  bindRidePointer(){
    if(this._ridePointerBound||!this.renderer?.domElement)return;this._ridePointerBound=true;const el=this.renderer.domElement;
    // Free-look is available for casual riding only. During a timed race the camera owns its heading and follows the horse.
    el.addEventListener('pointerdown',e=>{if(this.mode!=='ride')return;if(e.target!==el)return;this._ridePointer=e.pointerId;this._rideLastX=e.clientX;this._rideLastY=e.clientY;this._rideDragging=false;});
    addEventListener('pointermove',e=>{if(this.mode!=='ride'||this._ridePointer!==e.pointerId)return;const dx=e.clientX-this._rideLastX,dy=e.clientY-this._rideLastY;if(Math.hypot(dx,dy)>2)this._rideDragging=true;if(this._rideDragging){this.rideCamYaw-=dx*.006;this.rideCamPitch=THREE.MathUtils.clamp(this.rideCamPitch+dy*.004,.12,1.1);this._rideLastX=e.clientX;this._rideLastY=e.clientY;}});
    const end=e=>{if(this._ridePointer===e.pointerId){this._ridePointer=null;this._rideDragging=false;}};addEventListener('pointerup',end);addEventListener('pointercancel',end);
    addEventListener('wheel',e=>{if(this.mode!=='ride')return;this.rideCamDist=THREE.MathUtils.clamp(this.rideCamDist*(1+Math.sign(e.deltaY)*.08),3.5,16);},{passive:true});
  }

  bindUI(){
    this.ui.close?.addEventListener('click',()=>this.closeTalk());
    // R72 phone: Leaderboards / Wardrobe / Shop replace the choices; Back returns to them.
    if(this.ui.root&&!this.ui.sideBack){const b=document.createElement('button');b.type='button';b.id='stable-side-back';b.className='stable-side-back';b.innerHTML='<span>‹</span>Back';b.addEventListener('click',e=>{e.stopPropagation();this.closeSide();});this.ui.root.appendChild(b);this.ui.sideBack=b;}
    this.ui.setupClose?.addEventListener('click',()=>this.closeSetup());
    this.ui.setupStart?.addEventListener('click',()=>this.startFromSetup());
    this.ui.restart?.addEventListener('click',()=>this.race&&(this._devResultMode?this.devShowResult(this.race.disc):this.startRace(this.race.disc,true)));
    this.ui.quit?.addEventListener('click',()=>this.quitRace());
    this.ui.again?.addEventListener('click',()=>this.race&&(this._devResultMode?this.devShowResult(this.race.disc):this.startRace(this.race.disc,true)));
    this.ui.resultStandings?.addEventListener('click',()=>this.toggleResultBoard(true));
    this.ui.resultBoardClose?.addEventListener('click',()=>this.toggleResultBoard(false));
    this.ui.resultBoardScrim?.addEventListener('click',()=>this.toggleResultBoard(false));
    this.ui.resultBack?.addEventListener('click',()=>this.toggleResultBoard(false));
    this.ui.resultRaceGhost?.addEventListener('click',()=>this.race&&(this._devResultMode?this.devShowResult(this.race.disc):this.startRace(this.race.disc,true)));
    this.ui.resultBoardDone?.addEventListener('click',()=>this._devResultMode?location.assign('./dev-hub.html'):this.quitRace());
    this.ui.resultSkip?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();this.skipResultTimeline();});
    if(this.ui.resultStageFrame){const cid=(new URLSearchParams(location.search).get('char')||'swamp').toLowerCase();const want='./result-podie/Result Stage.html?char='+encodeURIComponent(cid);this._resultStageSrc=want;/* R54: loaded on demand (ensureResultStage), not at game start */this.ui.resultStageFrame.addEventListener('load',()=>{if(this.race?.phase==='done')setTimeout(()=>this.postResultStage(!!this.ui.result?.classList.contains('board-open')),40);});}
    if(!this._resultStageMessageBound){this._resultStageMessageBound=true;addEventListener('message',e=>{if(!this.ui.resultStageFrame||e.source!==this.ui.resultStageFrame.contentWindow||!e.data?.thoraHead)return;const p=e.data.thoraHead,b=this.ui.resultThoraBubble;if(!b)return;const w=innerWidth,h=innerHeight;b.style.left=(Math.max(.08,Math.min(.72,p.x))*w)+'px';b.style.top=(Math.max(.16,Math.min(.9,p.y))*h)+'px';});}
    this.ui.done?.addEventListener('click',()=>this._devResultMode?location.assign('./dev-hub.html'):this.quitRace());
    this.ui.jump?.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();this.jump();});
    addEventListener('keydown',e=>{
      if(this.mode==='greet'&&/^Digit[1-9]$/.test(e.code)){const b=this.ui.dlg?.querySelectorAll('button')[+e.code.slice(5)-1];if(b){b.click();e.preventDefault();e.stopPropagation();return;}}
      if(this.mode==='greet'&&this._sideMode==='shop'&&(e.code==='ArrowLeft'||e.code==='KeyA')){this.stepShop(-1);e.preventDefault();e.stopPropagation();return;}
      if(this.mode==='greet'&&this._sideMode==='shop'&&(e.code==='ArrowRight'||e.code==='KeyD')){this.stepShop(1);e.preventDefault();e.stopPropagation();return;}
      if(this.mode==='greet'&&e.code==='Escape'){if(this._sideMode){this.closeSide();}else this.closeTalk();e.preventDefault();e.stopPropagation();return;}
      if(this.mode==='setup'&&e.code==='Escape'){this.closeSetup();e.preventDefault();e.stopPropagation();return;}
      if(this.mode==='setup'&&e.code==='Enter'){this.startFromSetup();e.preventDefault();e.stopPropagation();return;}
      if(this.mode==='ride'&&e.code==='Space'){this.jump();e.preventDefault();return;}
      if(this.mode==='race'){
        if(e.code==='KeyR'&&this.race?.phase!=='done'){this.startRace(this.race?.disc||'lap_horse',true);e.preventDefault();return;}
        if(e.code==='Escape'){if(this.ui.resultBoard?.classList.contains('show'))this.toggleResultBoard(false);else this.quitRace();e.preventDefault();e.stopPropagation();return;}
        if(e.code==='Space'&&this.race?.phase==='run'){this.jump();e.preventDefault();return;}
      }
    },true);
  }

  save(){try{localStorage.setItem(this.saveKey||SAVE_KEY,JSON.stringify(this.saveData));}catch(e){console.warn('[TGW] Stable progress could not be saved',e);}}
  localToWorld(x,z){const c=Math.cos(ROOT.rotation),s=Math.sin(ROOT.rotation);return{x:ROOT.x+c*x+s*z,z:ROOT.z-s*x+c*z};}
  localGroundY(x,z){const w=this.localToWorld(x,z);return (this.world?.groundHeight?.(w.x,w.z)??0)-this.root.position.y;}
  worldToLocal(pos){const c=Math.cos(ROOT.rotation),s=Math.sin(ROOT.rotation),dx=pos.x-ROOT.x,dz=pos.z-ROOT.z;return{x:c*dx-s*dz,z:s*dx+c*dz};}
  localHeadingFromWorld(h){return wrap(h+ROOT.rotation);}
  worldHeadingFromLocal(h){return wrap(h-ROOT.rotation);}

  async init(){
    const mounts=await this.loader.loadAsync(BASE+'mount_assets.glb');
    const stable=buildStable();this.stableData=stable;this.jumpTops=stable.jumpTops||[];this.stable=stable.root;this.stable.name='NORTH_STABLE_ASSET';this.root.add(this.stable);this.stable.getObjectByName('Stable_Grass')?.removeFromParent();
    this.stableMixer=new THREE.AnimationMixer(this.stable);this.mixers.push(this.stableMixer);
    const stableClips=stable.clips();this.doorsClip=stableClips.find(a=>a.name==='Doors_Open')||null;this.hatchClip=stableClips.find(a=>a.name==='Hatch_Open')||null;
    this.doorsAction=this.doorsClip?this.stableMixer.clipAction(this.doorsClip):null;this.hatchAction=this.hatchClip?this.stableMixer.clipAction(this.hatchClip):null;
    if(this.hatchAction){this.hatchAction.reset().setLoop(THREE.LoopOnce,1);this.hatchAction.clampWhenFinished=true;this.hatchAction.play();this.hatchAction.time=this.hatchClip.duration;this.hatchAction.paused=true;this.stableMixer.update(0);}

    const src=mounts.scene;
    for(const H of HORSES){const horse=this.createHorse(src,mounts.animations,H);if(horse)this.horses.push(horse);}
    this.ghostHorse=this.createGhostHorse(src,mounts.animations);

    const thoraSrc=src.getObjectByName('Animal_05_thora');
    if(thoraSrc){
      this.thora=(thoraSrc.children[0]||thoraSrc).clone(true);cloneMaterials(this.thora);this.thora.name='Tidsel_Thora';this.thora.position.set(THORA_POS.x,0,THORA_POS.z);this.thora.rotation.y=Math.PI;this.root.add(this.thora);this.thoraHead=this.thora.getObjectByName('thora_Head')||null;
      this.thoraMixer=new THREE.AnimationMixer(this.thora);this.mixers.push(this.thoraMixer);this.thoraIdle=mounts.animations.find(a=>a.name==='thora_Idle')||null;this.thoraTalk=mounts.animations.find(a=>a.name==='thora_Talk')||null;this.setThoraMotion('idle');
    }
    this.buildShopDisplays();this.buildRaceStartMarkers();this.applyCosmetics();this.setAccess(this.lent,true);this.ready=true;this.syncClasses();this.syncRaceClasses();return this;
  }

  buildRaceStartMarkers(){
    const defs=[
      {disc:'lap_horse',label:'RIDE',x:LAP_MARKER.x,z:LAP_MARKER.z,phase:0,radius:.82,height:1.62},
      {disc:'jump',label:'JUMP',x:JUMP_START.x,z:JUMP_START.z,phase:Math.PI,radius:.82,height:1.62}
    ];
    for(const d of defs){
      const g=new THREE.Group();g.name='StableRaceStart_'+d.disc;const baseY=this.localGroundY(d.x,d.z)+.015;g.position.set(d.x,baseY,d.z);
      const holo=createHoloIndicator({radius:d.radius,height:d.height,intensity:.50,breath:2.4,scanSpeed:2.0,scanDensity:90,baseRing:true,groundHalo:true,fadeIn:.35});holo.setInstant(false);
      g.add(holo.group);
      const label=makeMarkerLabel(d.label,d.label.length>4?286:246,78);label.position.set(0,d.height+.30,0);label.visible=false;g.add(label);
      this.root.add(g);this.raceMarkers.push({...d,g,holo,label,baseY,labelY:d.height+.30});
    }
  }

  updateRaceStartMarkers(time,pos,dt=1/60){
    if(!this.raceMarkers?.length)return;const active=this.access&&(this.mode==='world'||this.mode==='ride');let p=null;
    if(this.mode==='ride')p=this.ride;else if(pos)p=this.worldToLocal(pos);
    for(const m of this.raceMarkers){
      active?m.holo.show():m.holo.hide();m.holo.update(time,dt);
      const dist=p?Math.hypot(p.x-m.x,p.z-m.z):99,near=Math.max(0,1-dist/6.2),lx=.018*Math.sin(time*1.25+m.phase),ly=.035*Math.sin(time*1.85+m.phase*.7),lr=.032*Math.sin(time*1.55+m.phase*.5),ls=1+.028*Math.sin(time*1.75+m.phase*.35);
      m.label.visible=active;m.label.position.set(lx,m.labelY+ly,0);m.label.material.opacity=.78+.18*near;m.label.material.rotation=lr;const bs=m.label.userData.baseScale||{x:m.label.scale.x,y:m.label.scale.y};m.label.scale.set(bs.x*ls,bs.y*(1+.018*Math.cos(time*1.4+m.phase*.4)),1);
    }
  }

  buildShopDisplays(){
    const leather=new THREE.MeshStandardMaterial({name:'StableShop_Leather',color:0x5b3a27,roughness:.82,metalness:.02});
    const leatherDark=new THREE.MeshStandardMaterial({name:'StableShop_LeatherDark',color:0x30251e,roughness:.88});
    const brass=new THREE.MeshStandardMaterial({name:'StableShop_Brass',color:0xb38a48,roughness:.48,metalness:.45});
    const linen=new THREE.MeshStandardMaterial({name:'StableShop_Linen',color:0x9aa36d,roughness:.96});
    const orange=new THREE.MeshStandardMaterial({name:'StableShop_Carrot',color:0xd77a32,roughness:.9});
    const leaf=new THREE.MeshStandardMaterial({name:'StableShop_Green',color:0x587648,roughness:.94});
    const ringMat=new THREE.MeshBasicMaterial({color:0xfff4da,transparent:true,opacity:.92,depthWrite:false,depthTest:true});
    const mkMesh=(geo,mat,parent,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1])=>{const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.rotation.set(...rot);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
    for(const item of SHOP_ITEMS){
      const g=new THREE.Group();g.name='StableShopDisplay_'+item.id;g.position.set(item.x,item.y,item.z);g.scale.setScalar(item.scale||1);
      if(item.id==='saddle'){
        mkMesh(new THREE.SphereGeometry(.42,12,8),leather,g,[0,0,0],[0,0,0],[1.35,.36,.72]);
        mkMesh(new THREE.TorusGeometry(.31,.055,7,18,Math.PI*1.35),leatherDark,g,[0,-.03,.03],[Math.PI/2,0,-.55],[1.15,1,1]);
        mkMesh(new THREE.BoxGeometry(.08,.42,.08),leatherDark,g,[-.34,-.24,.02],[0,0,.15]);
        mkMesh(new THREE.BoxGeometry(.08,.42,.08),leatherDark,g,[.34,-.24,.02],[0,0,-.15]);
        mkMesh(new THREE.CylinderGeometry(.035,.035,.10,8),brass,g,[-.35,-.43,.02],[Math.PI/2,0,0]);
        mkMesh(new THREE.CylinderGeometry(.035,.035,.10,8),brass,g,[.35,-.43,.02],[Math.PI/2,0,0]);
      }else if(item.id==='bridle'){
        mkMesh(new THREE.TorusGeometry(.30,.026,6,20),leatherDark,g,[0,.05,0]);
        mkMesh(new THREE.TorusGeometry(.20,.022,6,18),leather,g,[0,-.08,.015]);
        mkMesh(new THREE.BoxGeometry(.035,.52,.035),leather,g,[-.18,-.27,0],[0,0,.05]);
        mkMesh(new THREE.BoxGeometry(.035,.52,.035),leather,g,[.18,-.27,0],[0,0,-.05]);
        mkMesh(new THREE.TorusGeometry(.055,.012,6,12),brass,g,[-.18,-.5,.01]);
        mkMesh(new THREE.TorusGeometry(.055,.012,6,12),brass,g,[.18,-.5,.01]);
      }else if(item.id==='blanket'){
        const blanket=mkMesh(new THREE.BoxGeometry(.72,.58,.045),linen,g,[0,0,0],[0,0,.04]);
        blanket.geometry.translate(0,0,0);
        mkMesh(new THREE.BoxGeometry(.72,.035,.055),leatherDark,g,[0,.28,.002]);
        mkMesh(new THREE.BoxGeometry(.06,.62,.058),leatherDark,g,[-.33,0,.002]);
        mkMesh(new THREE.BoxGeometry(.06,.62,.058),leatherDark,g,[.33,0,.002]);
      }else if(item.id==='carrots'){
        for(let i=0;i<5;i++){
          const a=(i-2)*.13;
          mkMesh(new THREE.ConeGeometry(.075,.48,7),orange,g,[a,-.03,0],[0,0,(i-2)*.08]);
          for(let j=0;j<3;j++)mkMesh(new THREE.ConeGeometry(.018,.26,5),leaf,g,[a,.27,(j-1)*.025],[0,0,(j-1)*.32]);
        }
        mkMesh(new THREE.TorusGeometry(.15,.022,5,14),leatherDark,g,[0,.08,.02],[0,0,0]);
      }
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.58,.018,8,48),ringMat.clone());ring.name='StableShopRing_'+item.id;ring.position.z=-.07;ring.visible=false;g.add(ring);
      const center=new THREE.Vector3(item.x,item.y,item.z);this.root.add(g);this.shopDisplays.push({item,g,ring,center,baseScale:item.scale||1});
    }
    this.shopLight=new THREE.PointLight(0xffe2b8,0,7,1.6);this.shopLight.position.set(3.3,2.15,-13.65);this.root.add(this.shopLight);this.updateShopSelection();
  }

  updateShopSelection(){
    const active=this._sideMode==='shop';this.shopDisplays.forEach((d,i)=>{const on=active&&i===this._shopIndex;d.ring.visible=on;d.g.scale.setScalar(d.baseScale*(on?1.07:1));});
  }

  stepShop(dir){if(this._sideMode!=='shop'||!this.shopDisplays.length)return;this._shopIndex=(this._shopIndex+dir+this.shopDisplays.length)%this.shopDisplays.length;this.updateShopSelection();this.renderShop();}

  horseHoofMeshes(g,prefix){
    const out=[];for(const leg of['FL','FR','BL','BR']){const shin=g.getObjectByName(prefix+'_Shin'+leg);if(!shin)continue;let hoof=null;for(const c of shin.children)if(c.isMesh&&(!hoof||c.position.y<hoof.position.y))hoof=c;if(hoof)out.push(hoof);}return out;
  }

  createHorse(src,animations,H){
    const n=src.getObjectByName(H.node);if(!n)return null;
    // R23N: separate world grounding from the animated horse visual. The actor root owns world Y;
    // the visual gets one load-time hoof-plane calibration and is never re-grounded from gait animation.
    const g=new THREE.Group(),visual=(n.children[0]||n).clone(true);cloneMaterials(visual);visual.traverse(o=>{if(o.isMesh)o.castShadow=true;});g.name='StableHorse_'+H.name;visual.name='StableHorseVisual_'+H.name;g.add(visual);g.position.set(H.x,this.localGroundY(H.x,H.z),H.z);g.rotation.y=Math.PI;this.root.add(g);
    const riderAnchor=new THREE.Object3D();riderAnchor.name='RiderAnchor_'+H.name;riderAnchor.position.set(0,1.02,-.05);visual.add(riderAnchor);
    const mixer=new THREE.AnimationMixer(g),actions={};for(const gait of['Idle','Walk','Trot','Gallop']){const clip=animations.find(a=>a.name===H.prefix+'_'+gait);if(clip){const a=mixer.clipAction(clip);a.enabled=true;actions[gait]=a;}}
    const h={...H,g,visual,mixer,actions,current:null,mt:0,riderAnchor,hoofMeshes:this.horseHoofMeshes(g,H.prefix),homeX:H.x,homeZ:H.z,visualGroundOffset:0};this.mixers.push(mixer);this.setHorseMotion(h,'Idle',true);mixer.update(0);this.calibrateHorseVisual(h,H.x,H.z);this.groundHorseVisual(h,H.x,H.z,0);return h;
  }

  createGhostHorse(src,animations){
    const n=src.getObjectByName('Animal_01_horse');if(!n)return null;const g=new THREE.Group(),visual=(n.children[0]||n).clone(true);cloneMaterials(visual);g.name='StableRaceGhost';visual.name='StableRaceGhostVisual';g.add(visual);g.visible=false;g.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(!m)continue;m.transparent=true;m.opacity=.34;m.depthWrite=false;m.color?.lerp?.(new THREE.Color(0xffffff),.55);m.emissive=new THREE.Color(0xfff4dc);m.emissiveIntensity=.25;}o.castShadow=false;});this.root.add(g);
    const mixer=new THREE.AnimationMixer(g),actions={};for(const gait of['Idle','Walk','Trot','Gallop']){const clip=animations.find(a=>a.name==='horse_'+gait);if(clip)actions[gait]=mixer.clipAction(clip);}const h={g,visual,mixer,actions,current:null,mt:0,hoofMeshes:this.horseHoofMeshes(g,'horse'),visualGroundOffset:0};this.mixers.push(mixer);this.setHorseMotion(h,'Idle',true);mixer.update(0);this.calibrateHorseVisual(h,0,0);return h;
  }

  setHorseMotion(h,gait,instant=false,timeScale=1){if(!h)return;if(h.current===gait){if(h.currentAction)h.currentAction.timeScale=timeScale;return;}const next=h.actions[gait]||h.actions.Idle;if(!next)return;next.reset().setLoop(THREE.LoopRepeat,Infinity);next.timeScale=timeScale;next.play();if(h.currentAction&&!instant)h.currentAction.crossFadeTo(next,.16,false);else if(h.currentAction)h.currentAction.stop();h.current=gait;h.currentAction=next;}
  setThoraMotion(kind){if(!this.thoraMixer)return;this.thoraMixer.stopAllAction();const clip=kind==='talk'?this.thoraTalk:this.thoraIdle;if(!clip)return;this.thoraMixer.clipAction(clip).reset().setLoop(THREE.LoopRepeat,Infinity).play();}

  bestMedal(ds){return Math.max(0,...ds.map(d=>MR[this.saveData.medals[d]]||0));}
  unlockedBlankets(){return COS.blanket.filter(c=>!c[3]||this.bestMedal(['lap_horse','jump'])>=MR[c[3]]);}
  applyCosmetics(){const c=COS.blanket.find(x=>x[0]===this.saveData.cos?.blanket)||COS.blanket[0];for(const h of this.horses)h.g.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)if(m?.name?.toLowerCase().includes('blanket'))m.color.setHex(c[2]);});}

  setAccess(open,instant=false){
    this.access=!!open;if(!this.doorsAction||!this.doorsClip)return;this.doorsAction.stop();this.doorsAction.reset().setLoop(THREE.LoopOnce,1);this.doorsAction.clampWhenFinished=true;
    if(this.access){this.doorsAction.paused=false;this.doorsAction.play();if(instant){this.doorsAction.time=this.doorsClip.duration;this.doorsAction.paused=true;this.stableMixer.update(0);}}
    else{this.doorsAction.paused=false;this.doorsAction.play();this.doorsAction.time=0;this.doorsAction.paused=true;this.stableMixer.update(0);}
  }

  isBusy(){return this.mode!=='world';}
  usesMovementInput(){return this.mode==='ride'||this.mode==='race';}
  isRiding(){return !!this.mount;}

  interaction(pos){
    if(!this.ready||!pos)return null;const p=this.worldToLocal(pos);
    if(this.mode==='world'){
      if(Math.hypot(p.x-TALK_POINT.x,p.z-TALK_POINT.z)<THORA_TALK_RADIUS)return{type:'stable-thora',label:'Talk to Thora'};
      // R72 general rule: without Thora's permission the same buttons show grey 'Locked' instead of nothing.
      const L=this.access?null:{label:'Locked',disabled:true,locked:true};
      if(this.nearLapStart(p))return{type:'stable-setup',label:'RIDE',disc:'lap_horse',...L};
      if(this.nearJumpStart(p))return{type:'stable-setup',label:'JUMP',disc:'jump',...L};
      const nearest=this.nearestHorse(p);if(nearest&&nearest.d<1.5)return{type:'stable-mount',label:'Mount '+nearest.h.name,horse:nearest.h.name,...L};
    }else if(this.mode==='ride'){
      if(this.nearLapStart(this.ride))return{type:'stable-race',label:'RIDE',disc:'lap_horse'};
      if(this.nearJumpStart(this.ride))return{type:'stable-race',label:'JUMP',disc:'jump'};
      return{type:'stable-dismount',label:'Dismount'};
    }
    return null;
  }

  interact(interaction){
    const x=typeof interaction==='string'?{type:interaction}:interaction;if(!x)return;
    if(x.type==='stable-thora')this.openTalk();
    else if(x.type==='stable-mount')this.mountHorse(this.horses.find(h=>h.name===x.horse));
    else if(x.type==='stable-dismount')this.dismount();
    else if(x.type==='stable-setup')this.openSetup(x.disc);
    else if(x.type==='stable-race')this.startRace(x.disc);
  }

  nearestHorse(p){let best=null;for(const h of this.horses){if(h===this.mount)continue;const d=Math.hypot(p.x-h.g.position.x,p.z-h.g.position.z);if(!best||d<best.d)best={h,d};}return best;}
  nearLapStart(p){return Math.hypot(p.x-LAP_MARKER.x,p.z-LAP_MARKER.z)<LAP_MARKER.r;}
  nearJumpStart(p){return Math.hypot(p.x-JUMP_START.x,p.z-JUMP_START.z)<1.8;}

  openSetup(disc){if(!['world','ride'].includes(this.mode)||!['lap_horse','jump'].includes(disc))return;this._setupReturnMode=this.mode;this._setupDisc=disc;this._setupHorseName=this.mount?.name||this._setupHorseName||HORSES[0].name;this.mode='setup';this.ride.v=0;this.renderSetup();this.syncSetupClasses();this.syncRaceClasses();if(this.input){this.input.actionPressed=false;this.input.hopPressed=false;}}
  closeSetup(){if(this.mode!=='setup')return;this.mode=this._setupReturnMode==='ride'&&this.mount?'ride':'world';this.syncSetupClasses();this.syncRaceClasses();}
  bestOwn(disc){const xs=this.saveData.runs.filter(r=>r.disc===disc).map(r=>r.t);return xs.length?Math.min(...xs):null;}
  renderSetup(){if(!this.ui.setup)return;const disc=this._setupDisc,D=DISC[disc],today=board(disc,'day',this.saveData.runs),best=this.bestOwn(disc),top=today[0]?.t??null;this.ui.setupName.textContent=D.n;this.ui.setupSub.textContent=disc==='jump'?'Long infield course · START/FINISH → 1 → 2 → 3 → 4 → FINISH · poles +4 · refusal +2':'Full gallop stays available · max effort uses Pace Reserve · clean corners preserve speed · 5 checkpoints';this.ui.setupStats.innerHTML=`<div><span>Your best</span><b>${fmt(best)}</b></div><div><span>Today #1</span><b>${fmt(top)}</b></div><div><span>Gold</span><b>${fmt(D.med[0])}</b></div>`;
    this.ui.setupHorses.innerHTML=this.horses.map((h,i)=>`<button data-h="${h.name}" class="stable-setup-choice${h.name===this._setupHorseName?' on':''}"><i>${String(i+1).padStart(2,'0')}</i><span><b>${h.name}</b><small>${h.name===this._setupHorseName?'Selected mount':'Choose horse'}</small></span><em>${h.name===this._setupHorseName?'✓':''}</em></button>`).join('');this.ui.setupHorses.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{this._setupHorseName=b.dataset.h;this.renderSetup();});
    if(this.ui.setupStart)this.ui.setupStart.innerHTML='<span>Start '+D.n+'</span><b>→</b>';
  }
  syncSetupClasses(){const on=this.mode==='setup';document.body.classList.toggle('stable-setup-active',on);this.ui.setup?.classList.toggle('show',on);}
  resetHorseHome(h){if(!h)return;h.g.position.set(h.homeX,this.horseGroundY(h.homeX,h.homeZ),h.homeZ);h.g.rotation.set(0,Math.PI,0);this.setHorseMotion(h,'Idle');this.groundHorseVisual(h,h.homeX,h.homeZ,0);}
  horseGroundY(x,z){return this.localGroundY(x,z);}
  calibrateHorseVisual(h,x,z){
    if(!h?.g||!h.visual||!h.hoofMeshes?.length)return;const ground=this.horseGroundY(x,z);h.g.position.set(x,ground,z);h.visual.position.y=0;this.root.updateMatrixWorld(true);let soleY=Infinity;for(const hoof of h.hoofMeshes){this._hoofBox.setFromObject(hoof,true);if(this._hoofBox.min.y<soleY)soleY=this._hoofBox.min.y;}if(!Number.isFinite(soleY))return;const targetWorldY=ground+this.root.position.y;h.visualGroundOffset=targetWorldY-soleY;h.visual.position.y=h.visualGroundOffset;this.root.updateMatrixWorld(true);
  }
  groundHorseVisual(h,x,z,lift=0){
    if(!h?.g)return;const ground=this.horseGroundY(x,z);h.g.position.set(x,ground+lift,z);
    if(!h.visual)return;h.visual.position.y=h.visualGroundOffset||0;
    // Ground contact is a visual correction only: actor/world Y stays authoritative.
    // This cancels authored gait suspension while grounded without contaminating collision or jump height.
    if(lift<=.001&&h.hoofMeshes?.length){this.root.updateMatrixWorld(true);let soleY=Infinity;for(const hoof of h.hoofMeshes){this._hoofBox.setFromObject(hoof,true);if(this._hoofBox.min.y<soleY)soleY=this._hoofBox.min.y;}if(Number.isFinite(soleY)){const targetWorldY=ground+this.root.position.y,hc=THREE.MathUtils.clamp(targetWorldY-soleY,-.28,.28);h.visual.position.y+=hc;this.root.updateMatrixWorld(true);}}
  }
  startFromSetup(){if(this.mode!=='setup')return;const disc=this._setupDisc,h=this.horses.find(x=>x.name===this._setupHorseName)||this.horses[0];if(this.mount&&this.mount!==h)this.resetHorseHome(this.mount);if(this.mount!==h){this.mount=h;this.ride.x=h.g.position.x;this.ride.z=h.g.position.z;this.ride.h=h.g.rotation.y;}this.mode='ride';this.syncSetupClasses();this.startRace(disc,false);}

  openTalk(){if(this.mode!=='world')return;this.mode='enter';this.T=0;this._camInit=false;this._bubbleTimer=0;this.closeSide();this.renderDialog();this.setThoraMotion('talk');if(this.character){this.character.velocity?.set?.(0,0,0);this.character.currentSpeed=0;}this.syncClasses();}
  closeTalk(){if(this.mode!=='greet')return;this.closeSide();this.mode='exit';this.T=0;this.sayTimer(1.2);this.syncClasses();}
  dialogOptions(){const o=[[this.lent?'tip':'lend',this.lent?'Any riding tips?':'Can I ride the horse?']];o.push(['board','Leaderboards'],['ward','Wardrobe'],['shop','What do you sell?'],['bye','See you']);return o;}
  renderDialog(){if(!this.ui.dlg)return;this.ui.dlg.innerHTML=this.dialogOptions().map(([k,t],i)=>`<button class="fishing-opt${k==='bye'?' quiet':''}" data-k="${k}"><span class="n">${i+1}</span>${t}</button>`).join('');this.ui.dlg.querySelectorAll('.fishing-opt').forEach(b=>b.addEventListener('click',()=>this.choose(b.dataset.k)));}
  choose(k){if(this.mode!=='greet')return;
    if(k==='bye'){this.say(this.lent?'Bring her back in one piece.':'Suit yourself.',2.2);this.closeTalk();return;}
    if(k==='lend'){this.lent=true;this.saveData.lent=true;this.save();this.setAccess(true);this.say('Kul, Birk and Solvej are tied at the rail through the tunnel. Take any of them. The start line is just outside, and the arena is in the middle.',7);this.renderDialog();return;}
    if(k==='tip'){this.say(TIPS[Math.floor(Math.random()*TIPS.length)],5);return;}
    if(k==='board'){this.openSide('board');this.say("Today's names are in chalk. The all-time ones are carved.",3);return;}
    if(k==='ward'){this.openSide('ward');this.say(this.unlockedBlankets().length>1?'Wear it with pride. Or at least wear it straight.':'Medals buy colours. Bronze and up.',3.5);return;}
    if(k==='shop'){this.openSide('shop');this.say('Take a look. Nothing here is cheap, and nothing is broken either.',3.8);return;}
  }

  openSide(kind){this._sideMode=kind;if(!this.ui.side)return;if(kind==='shop'){this._shopIndex=0;this._shopCamInit=false;this.updateShopSelection();}this.ui.side.classList.add('show');this.ui.side.classList.toggle('shop3d',kind==='shop');if(kind==='board')this.renderBoardPanel();else if(kind==='ward')this.renderWardrobe();else this.renderShop();this.syncClasses();}
  closeSide(){const wasShop=this._sideMode==='shop';this._sideMode=null;this._shopCamInit=false;if(this.ui.side){this.ui.side.classList.remove('show','shop3d');this.ui.side.innerHTML='';}if(wasShop){this.updateShopSelection();this.say('Anything else?',60);}this.syncClasses();}
  renderBoardPanel(){if(!this.ui.side)return;const disc=this._boardDisc||'lap_horse',scope=this._boardScope||'day',discs=[['lap_horse','Fastest lap'],['jump','Jumping']];this.ui.side.innerHTML=`<h3>Leaderboards</h3><div class="stable-tabs">${discs.map(([k,n])=>`<button data-d="${k}" class="${k===disc?'on':''}">${n}</button>`).join('')}</div><div class="stable-tabs">${SCOPES.map(([k,n])=>`<button data-s="${k}" class="${k===scope?'on':''}">${n}</button>`).join('')}</div><div class="stable-lb">${this.lbRows(disc,scope)}</div><div class="stable-side-row"><span>Medals</span><span>${DISC[disc].med.map((t,i)=>['Gold','Silver','Bronze'][i]+' '+fmt(t)).join(' · ')}</span></div>`;this.ui.side.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{this._boardDisc=b.dataset.d;this.renderBoardPanel();});this.ui.side.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{this._boardScope=b.dataset.s;this.renderBoardPanel();});}
  renderWardrobe(){if(!this.ui.side)return;const unlocked=this.unlockedBlankets();this.ui.side.innerHTML='<h3>Saddle blanket</h3>'+COS.blanket.map(c=>{const ok=unlocked.includes(c),on=this.saveData.cos.blanket===c[0],hex='#'+c[2].toString(16).padStart(6,'0');return `<button class="stable-ward${on?' on':''}" data-id="${c[0]}" ${ok?'':'disabled'}><i style="background:${hex}"></i>${c[1]}<span>${on?'Equipped':ok?'':c[3][0].toUpperCase()+c[3].slice(1)+' medal'}</span></button>`;}).join('');this.ui.side.querySelectorAll('.stable-ward:not(:disabled)').forEach(b=>b.onclick=()=>{this.saveData.cos.blanket=b.dataset.id;this.save();this.applyCosmetics();this.renderWardrobe();});}
  renderShop(){if(!this.ui.side)return;const d=this.shopDisplays[this._shopIndex],item=d?.item||SHOP_ITEMS[0];this.ui.side.innerHTML=`<div class="stable-shop-3d-card"><div class="stable-shop-head"><small>THORA'S TACK ROOM · ${item.cat}</small><h3>${item.name}</h3><p>${item.sub}</p></div><div class="stable-shop-nav"><button type="button" data-shop-prev aria-label="Previous item">‹</button><span>${String(this._shopIndex+1).padStart(2,'0')} / ${String(this.shopDisplays.length||SHOP_ITEMS.length).padStart(2,'0')}</span><button type="button" data-shop-next aria-label="Next item">›</button></div><div class="stable-shop-foot"><span>Displayed in the tack room</span><b>Economy later</b></div><button type="button" class="stable-shop-back" data-shop-back>Back to Thora</button></div>`;this.ui.side.querySelector('[data-shop-prev]')?.addEventListener('click',()=>this.stepShop(-1));this.ui.side.querySelector('[data-shop-next]')?.addEventListener('click',()=>this.stepShop(1));this.ui.side.querySelector('[data-shop-back]')?.addEventListener('click',()=>this.closeSide());}
  lbRows(disc,scope){const b=board(disc,scope,this.saveData.runs),yi=b.findIndex(e=>e.you),row=(i,e)=>`<div class="${e.you?'you':''}"><i>${i+1}</i><span>${e.name}</span><b>${fmt(e.t)}</b></div>`;let r=b.slice(0,5).map((e,i)=>row(i,e));if(yi>=5)r.push('<span class="gap">…</span>',row(yi,b[yi]));return r.join('')||'<span class="gap">No times yet</span>';}

  say(text,d=2.8){if(!this.ui.bubble)return;this.ui.bubble.innerHTML='<b>Tidsel-Thora</b>'+text;this.ui.bubble.classList.add('show');this._bubbleTimer=d;this.syncClasses();}
  worldSay(text,d=2.8){this.say(text,d);}
  sayTimer(d){this._bubbleTimer=Math.min(this._bubbleTimer,d);}

  syncClasses(){const r=this.ui.root;if(!r)return;r.classList.remove('busy','greet');const talk=['enter','greet','exit'].includes(this.mode),shop=this._sideMode==='shop';const overlay=talk||this._bubbleTimer>0||!!this._sideMode;r.classList.toggle('show',overlay);if(this.mode==='enter'||this.mode==='exit')r.classList.add('busy');if(this.mode==='greet')r.classList.add('greet');if(this.ui.closeL)this.ui.closeL.textContent=shop?'Close':'Close';document.body.classList.toggle('stable-talk-active',talk);document.body.classList.toggle('stable-shop-scene',shop);document.body.classList.toggle('stable-side-open',!!this._sideMode&&this.mode==='greet');}
  syncRaceClasses(){const b=document.body,done=this.mode==='race'&&this.race?.phase==='done';b.classList.toggle('stable-ride-active',this.mode==='ride'||this.mode==='race');b.classList.toggle('stable-race-active',this.mode==='race');b.classList.toggle('stable-race-cine',this.mode==='race'&&this.race?.phase==='intro');b.classList.toggle('stable-race-result-active',done);if(this.ui.raceRoot)this.ui.raceRoot.classList.toggle('show',this.mode==='race');if(this.ui.jump)this.ui.jump.classList.toggle('show',this.mode==='ride'||(this.mode==='race'&&this.race?.phase==='run'));if(!done){this.ui.result?.classList.remove('show','board-open');this.ui.resultBoard?.classList.remove('show');this.ui.resultBoardScrim?.classList.remove('show');}}
  syncPlayerVisibility(){if(!this.character?.root)return;const hide=(this.mode==='enter'&&this.T>1.1)||this.mode==='greet'||(this.mode==='exit'&&this.T<1.2);this.character.root.visible=!hide;}

  scriptPlayerToCounter(dt){if(!this.character)return;const target=this.localToWorld(TALK_POINT.x,TALK_POINT.z),p=this.character.position,dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz),step=1.5*dt;if(d>step&&d>1e-5){p.x+=dx/d*step;p.z+=dz/d*step;}else{p.x=target.x;p.z=target.z;}p.y=this.world.groundHeight(p.x,p.z);const tw=this.localToWorld(THORA_POS.x,THORA_POS.z);this.character.heading=Math.atan2(tw.x-p.x,tw.z-p.z);this.character.root.rotation.y=this.character.heading;this.character.root.position.copy(p);this.character.instance?.updateVisual?.({dt,time:0,speed:d>.04?1.5:0,maxSpeed:this.character.runSpeed,turnRate:0,velocity:new THREE.Vector3(),heading:this.character.heading});if(this.state?.player)this.state.player.position={x:p.x,y:p.y,z:p.z};}

  mountHorse(h){if(!h||this.mode!=='world'||!this.access)return;if(this.mount&&this.mount!==h)this.resetHorseHome(this.mount);this.mount=h;this.ride.x=h.g.position.x;this.ride.z=h.g.position.z;this.ride.h=h.g.rotation.y;Object.assign(this.ride,{v:0,y:0,jumpT:-1,mt:0,reserve:1});this.mode='ride';this.T=0;this.rideCamYaw=this.ride.h+PI;this._rideCamInit=false;this.setHorseMotion(h,'Idle');this.groundHorseVisual(h,this.ride.x,this.ride.z,0);this.syncMountedPlayer(0);this.syncRaceClasses();this.syncClasses();if(this.input){this.input.hopPressed=false;this.input.actionPressed=false;}}
  dismount(){if(!this.mount||this.mode==='race'||this.mode==='setup')return;const R=this.ride,sx=Math.cos(R.h),sz=-Math.sin(R.h);let x=R.x+sx*1.2,z=R.z+sz*1.2;if(this.rideBlocked(x,z,.28,false)){x=R.x-sx*1.2;z=R.z-sz*1.2;}const w=this.localToWorld(x,z),gy=this.localGroundY(R.x,R.z);this.mount.g.position.set(R.x,gy,R.z);this.mount.g.rotation.set(0,R.h,0);this.setHorseMotion(this.mount,'Idle');this.groundHorseVisual(this.mount,R.x,R.z,0);this.mount=null;this.mode='world';if(this.character){this.character.position.set(w.x,this.world.groundHeight(w.x,w.z),w.z);this.character.heading=this.worldHeadingFromLocal(R.h);this.character.velocity.set(0,0,0);this.character.currentSpeed=0;this.character.root.visible=true;this.character.root.position.copy(this.character.position);this.character.root.rotation.y=this.character.heading;this.state.player.position={x:w.x,y:this.character.position.y,z:w.z};}this.followCamera?.snap?.();this.syncRaceClasses();this.syncClasses();}

  jump(){if(!this.mount||!['ride','race'].includes(this.mode))return;if(this.race&&this.mode==='race'&&this.race.phase!=='run')return;if(this.ride.jumpT<0&&this.ride.v>1.2)this.ride.jumpT=0;}
  rideBlocked(x,z,r,poles=true){if(stableBlocked(x,z,r,poles,false))return true;for(const h of this.horses){if(h===this.mount)continue;if(Math.hypot(x-h.g.position.x,z-h.g.position.z)<r+.55)return true;}return false;}
  onTrack(x,z){const dx=Math.max(0,Math.abs(x)-TRACK.L),r=Math.hypot(dx,z-TRACK.cz);return Math.abs(r-TRACK.R)<TRACK.W/2+.4;}
  knock(J){const j=this.jumpTops.find(x=>x.n===J.n);if(j&&j.k===0){j.k=.001;j.t=this.race?0:4;}this.tone(180,.3,.22);this.tone(140,.3,.18,'triangle',.12);}
  onCross(J,s,y){const low=y<.62,race=this.race&&this.race.phase==='run'&&this.race.disc==='jump';if(low){this.knock(J);this.ride.v*=.48;}else if(!race)this.chime();if(race){if(s!==J.dir)return;if(J.n===this.race.next+1){this.race.next++;if(low)this.race.pen+=4;this.split(this.race.next,low?'Pole down +4 · slowed':'Clear '+J.n);}else if(J.n>this.race.next+1)this.dq('Jumped '+J.n+' before '+(this.race.next+1));}else if(!low){this.saveData.clears++;this.save();}}
  onRefusal(){this.tone(110,.25,.28,'sine');if(this.race?.phase==='run'&&this.race.disc==='jump'){this.race.pen+=2;this.big('Refusal +2','#f0a080',1.1);}else this.worldSay('Refusal! Ask for the jump. Space, a stride or two out.',2.5);}

  updateRide(dt,time,lock=false){
    const R=this.ride,m=this.input?.frameMove||{x:0,y:0};let fwd=m.y>0?m.y:0,back=m.y<0?-m.y:0,steer=-m.x;if(lock)fwd=back=steer=0;
    const lapRun=this.race?.phase==='run'&&this.race.disc==='lap_horse',trackNow=this.onTrack(R.x,R.z);
    const reserveFactor=lapRun ? .88+.12*THREE.MathUtils.clamp(R.reserve??1,0,1) : 1;
    let vmax=7.5*(lapRun?(trackNow?1:.62):1)*reserveFactor;
    // R23N ride throttle: W is calm riding, Shift asks for full pace. Releasing input bleeds momentum gradually.
    const fullPace=!!this.input?.runIntent,cruise=Math.min(vmax,3.15),toward=(v,t,step)=>v<t?Math.min(t,v+step):Math.max(t,v-step);
    if(fwd){const target=(fullPace?vmax:cruise)*fwd,rate=R.v<target?(fullPace?2.8:1.8):.95;R.v=toward(R.v,target,rate*dt);}
    else if(back)R.v-=(R.v>0?4.0:1.4)*back*dt;
    else R.v=toward(R.v,0,(lock?2.8:.82)*dt);
    R.v=THREE.MathUtils.clamp(R.v,-1,vmax);
    const av0=Math.abs(R.v);if(lapRun){const maxEffort=fwd>.92&&av0>5.2;if(maxEffort)R.reserve-=dt*(.072+THREE.MathUtils.clamp((av0-5.2)/2.3,0,1)*.035);else if(fwd<.82)R.reserve+=dt*(fwd<.35?.085:.045);const corner=Math.abs(steer)*THREE.MathUtils.clamp((av0-4.3)/3.2,0,1);if(corner>0){R.v-=Math.sign(R.v)*corner*1.85*dt;R.reserve-=corner*.025*dt;}R.reserve=THREE.MathUtils.clamp(R.reserve,0,1);}
    const air=R.jumpT>=0,turn=1.9/(1+Math.abs(R.v)*.12);if(!air){R.y=0;R.h+=steer*turn*dt*(R.v<0?-1:1)*Math.min(1,Math.abs(R.v)*.8+.3);}
    const px=R.x,pz=R.z,nx=R.x+Math.sin(R.h)*R.v*dt,nz=R.z+Math.cos(R.h)*R.v*dt,rad=.55;
    if(!this.rideBlocked(nx,nz,rad,!air)){R.x=nx;R.z=nz;}else if(!this.rideBlocked(nx,R.z,rad,!air)){R.x=nx;R.v*=.9;}else if(!this.rideBlocked(R.x,nz,rad,!air)){R.z=nz;R.v*=.9;}else{if(Math.abs(R.v)>1.5&&!this.rideBlocked(nx,nz,rad,false)&&time-R.refused>1.5){R.refused=time;this.onRefusal();}R.v*=-.2;}
    if(air){R.jumpT+=dt;const u=R.jumpT/.8;R.y=1.1*Math.sin(PI*Math.min(1,u));if(u>=1){R.jumpT=-1;R.y=0;this.tone(110,.2,.18,'sine');}}
    for(const J of JUMPS){const s=crossJ(J,px,pz,R.x,R.z);if(s)this.onCross(J,s,R.y);}
    if(this.race?.phase==='run'){
      if(this.race.disc==='jump'){
        const f=crossGate(JUMP_FINISH,px,pz,R.x,R.z);if(f===JUMP_FINISH.dir){this.race.next<JUMPS.length?this.dq('Missed jump '+(this.race.next+1)):this.finishRace();}
      }else{
        if(this.race.next<LAP_CP_COUNT){const C=LAP_CHECKPOINTS[this.race.next];if(Math.hypot(R.x-C.x,R.z-C.z)<TRACK.W*.62){this.race.next++;this.split(this.race.next,'Checkpoint '+this.race.next);}}
        const afterOnTrack=this.onTrack(R.x,R.z);if(!afterOnTrack){this.race.offTrackTime=(this.race.offTrackTime||0)+dt;R.v*=Math.max(0,1-dt*1.6);if(this.race.offTrackTime>.38&&!this.race.offTrackPenalized){this.race.offTrackPenalized=true;this.race.pen+=2;this.big('Off track +2','#f0a080',1.05);}}else{this.race.offTrackTime=0;this.race.offTrackPenalized=false;}
        const dx=Math.max(0,Math.abs(R.x)-TRACK.L);if(Math.hypot(dx,R.z-TRACK.cz)<RIN-.72)this.dq('Cut inside the track');
        if(this.race&&this.race.phase==='run'&&this.race.next===LAP_CP_COUNT&&px>START_X&&R.x<=START_X&&Math.abs(R.z-(TRACK.cz-TRACK.R))<TRACK.W/2+.6)this.finishRace();
      }
    }
    this.mount.g.rotation.set(air?-.35*Math.cos(PI*R.jumpT/.8):0,R.h,0,'YXZ');const av=Math.abs(R.v);let gait='Idle';if(air||av>5.2)gait='Gallop';else if(av>2.4)gait='Trot';else if(av>.15)gait='Walk';this.setHorseMotion(this.mount,gait,false,gait==='Idle'?1:Math.max(.6,av/(HSPD[gait]||1)));this.groundHorseVisual(this.mount,R.x,R.z,R.y);this.syncMountedPlayer(dt);this.updateReserveUI();
  }

  syncMountedPlayer(dt){if(!this.character||!this.mount)return;const R=this.ride,heading=this.worldHeadingFromLocal(R.h);this.root.updateMatrixWorld(true);if(this.mount.riderAnchor)this.mount.riderAnchor.getWorldPosition(this._tmp);else{const w=this.localToWorld(R.x,R.z);this._tmp.set(w.x,this.world.groundHeight(w.x,w.z)+1.02+R.y,w.z);}this.character.position.copy(this._tmp);this.character.heading=heading;this.character.velocity.set(0,0,0);this.character.currentSpeed=0;this.character.root.visible=true;this.character.root.position.copy(this.character.position);this.character.root.rotation.set(0,heading,0);this.character.instance?.updateVisual?.({dt,time:0,speed:0,maxSpeed:this.character.runSpeed,turnRate:0,velocity:new THREE.Vector3(),heading});if(this.state?.player)this.state.player.position={x:this.character.position.x,y:this.character.position.y,z:this.character.position.z};}
  updateReserveUI(){const pct=Math.round(THREE.MathUtils.clamp(this.ride.reserve??1,0,1)*100);if(this.ui.raceStamina)this.ui.raceStamina.textContent=pct+'%';if(this.ui.raceStaminaBar)this.ui.raceStaminaBar.style.width=pct+'%';}

  profile(t,T,L){const k=.1,v=L/(T*(1-k/2));t=Math.max(0,Math.min(T,t));return t<k*T?[v*t*t/(2*k*T),v*t/(k*T)]:[v*(k*T/2+(t-k*T)),v];}
  synthGhost(name,ft,disc){const g={name,ft,t:ft};if(disc==='jump')g.at=t=>{const [s,v]=this.profile(t,ft,JLEN),u=Math.min(1,s/JLEN),p=JCURVE.getPointAt(u),d=JCURVE.getTangentAt(u);let y=0;for(const J of JUMPS){const dd=Math.hypot(p.x-J.x,p.z-J.z);if(dd<2.4)y=Math.max(y,1.0*Math.cos(dd/2.4*PI/2));}return{x:p.x,z:p.z,y,h:Math.atan2(d.x,d.z),v};};else g.at=t=>{const [s,v]=this.profile(t,ft,PER+3),u=U0+(s-3)/PER,p=trackPt(u),q=trackPt(u+.0005);return{x:p.x,z:p.z,y:0,h:Math.atan2(q.x-p.x,q.z-p.z),v};};g.splits=this.ghostSplits(g,disc);return g;}
  recGhost(name,gh){const pts=gh.pts,n=pts.length;return{name,ft:gh.t,t:(n-1)*.1,splits:gh.splits||[],at(t){const f=Math.max(0,Math.min(n-1,t/.1)),i=Math.min(n-2,Math.floor(f)),k=f-i,a=pts[i],b=pts[i+1];let dh=b[3]-a[3];dh=Math.atan2(Math.sin(dh),Math.cos(dh));return{x:a[0]+(b[0]-a[0])*k,z:a[1]+(b[1]-a[1])*k,y:a[2]+(b[2]-a[2])*k,h:a[3]+dh*k,v:Math.hypot(b[0]-a[0],b[1]-a[1])/.1};}};}
  ghostSplits(g,disc){const sp=[];let nx=0,p=g.at(0);for(let t=.05;t<=g.t+.01;t+=.05){const q=g.at(t);if(disc==='jump'){const J=JUMPS[nx];if(J&&crossJ(J,p.x,p.z,q.x,q.z)===J.dir){nx++;sp.push(t);}}else if(nx<LAP_CP_COUNT&&Math.hypot(q.x-LAP_CHECKPOINTS[nx].x,q.z-LAP_CHECKPOINTS[nx].z)<TRACK.W*.72){nx++;sp.push(t);}p=q;}return sp;}
  validJumpGhost(gh){if(!gh||gh.courseVersion!==JUMP_COURSE_VERSION||!gh.pts||gh.pts.length<3)return false;const p=gh.pts[0];return Array.isArray(p)&&Math.hypot((p[0]??999)-JUMP_SPAWN.x,(p[1]??999)-JUMP_SPAWN.z)<.25;}
  pickGhost(disc){const b=board(disc,'day',this.saveData.runs)[0];if(!b)return null;if(b.you){const gh=this.saveData.ghost[disc],valid=disc==='jump'?this.validJumpGhost(gh):(gh&&gh.pts&&gh.pts.length>2);if(valid&&gh.day===dayKey())return this.recGhost('You',gh);return this.synthGhost('You',b.t,disc);}return this.synthGhost(b.name,b.t,disc);}

  // R54: the Result Stage iframe is a second WebGL renderer + its own assets. Load it when a race
  // starts (ready by the finish) and release it 5 s after the result closes unless another race begins.
  ensureResultStage(){clearTimeout(this._resultStageUnload);const f=this.ui.resultStageFrame;if(f&&this._resultStageSrc&&f.getAttribute('src')!==this._resultStageSrc)f.setAttribute('src',this._resultStageSrc);}
  releaseResultStage(){clearTimeout(this._resultStageUnload);this._resultStageUnload=setTimeout(()=>{if(this.race||this._devResultMode)return;const f=this.ui.resultStageFrame;if(f&&f.getAttribute('src')!=='about:blank')f.setAttribute('src','about:blank');},5000);}
  startRace(disc,quick=false){this.ensureResultStage();if(!this.mount||!['lap_horse','jump'].includes(disc))return;const D=DISC[disc];if(disc==='jump'){this.ride.x=JUMP_SPAWN.x;this.ride.z=JUMP_SPAWN.z;this.ride.h=JUMP_SPAWN.h;}else{const p=trackPt(U0-3/PER),q=trackPt(U0-2.9/PER);this.ride.x=p.x;this.ride.z=p.z;this.ride.h=Math.atan2(q.x-p.x,q.z-p.z);}Object.assign(this.ride,{v:0,y:0,jumpT:-1,mt:0,reserve:1});for(const j of this.jumpTops){j.k=0;j.t=0;j.g.position.y=0;}const g=this.pickGhost(disc);this.race={disc,phase:'intro',t:0,introLen:quick?.8:2.6,time:0,gt:0,pen:0,next:0,splits:[],ghost:g,rec:[],recT:0,dq:null,cs:-1,offTrackTime:0,offTrackPenalized:false};if(this.ghostHorse)this.ghostHorse.g.visible=false;this.mode='race';this._ridePointer=null;this._rideDragging=false;this.rideCamYaw=this.ride.h+PI;this._rideCamInit=false;this.hideRaceResult();this.ui.bubble?.classList.remove('show');this._bubbleTimer=0;if(this.ui.raceName)this.ui.raceName.textContent=D.n;if(this.ui.raceSub)this.ui.raceSub.textContent=disc==='jump'?'START/FINISH → 1 → 2 → 3 → 4 → FINISH':D.m+(g?' · Ghost: '+g.name+' '+fmt(g.ft)+", today's #1":'');if(this.ui.racePenWrap)this.ui.racePenWrap.style.display='';if(this.ui.raceNextLabel)this.ui.raceNextLabel.textContent=disc==='jump'?'Next jump':'Checkpoint';if(this.ui.raceGhostLabel)this.ui.raceGhostLabel.textContent=g?'vs '+g.name:'Ghost';if(this.ui.raceGhost)this.ui.raceGhost.textContent=g?fmt(g.ft):'–';if(this.ui.raceStamina?.parentElement)this.ui.raceStamina.parentElement.style.display=disc==='lap_horse'?'':'none';this.updateReserveUI();this.syncRaceClasses();this.syncClasses();if(!quick)this.tone(523,.5,.1,'triangle');}
  quitRace(){if(this._devResultMode){location.assign('./dev-hub.html');return;}if(!this.race)return;this.race=null;if(this.ghostHorse)this.ghostHorse.g.visible=false;this.mode=this.mount?'ride':'world';this.rideCamYaw=this.ride.h+PI;this.hideRaceResult();this.syncRaceClasses();this.syncClasses();}
  recPt(){return[+this.ride.x.toFixed(2),+this.ride.z.toFixed(2),+this.ride.y.toFixed(2),+this.ride.h.toFixed(3)];}
  split(i,label){if(!this.race)return;this.race.splits.push(this.race.time);const g=this.race.ghost;let dl='';if(g&&g.splits[i-1]!=null){const d=this.race.time-g.splits[i-1],s=(d<0?'−':'+')+Math.abs(d).toFixed(2);dl=`<small>${s} vs ${g.name}</small>`;if(this.ui.raceGhost)this.ui.raceGhost.textContent=s;}this.big((label||(this.race.disc==='jump'?'Jump '+i:'Split '+i))+' · '+fmt(this.race.time)+dl,'#fff',1.4);}
  dq(reason){if(!this.race||this.race.phase!=='run')return;this.race.phase='done';this.race.dq=reason;const quote=this.race.disc==='jump'?"Disqualified. The numbers on the jumps aren't decoration.":'Disqualified. The track goes around, not through.';this.showResult({kick:'Disqualified',cls:'dq',time:null,ride:null,pen:0,sub:reason,ranks:'',unlock:null,quote,pb:'No time recorded',newBest:false,first:false});this.worldSay(quote,5);this.syncRaceClasses();}

  finishRace(){if(!this.race||this.race.phase!=='run')return;this.race.phase='done';this.race.rec.push(this.recPt());const disc=this.race.disc,D=DISC[disc],final=Math.round((this.race.time+this.race.pen)*100)/100,today=dayKey();const prevBest=Math.min(Infinity,...this.saveData.runs.filter(r=>r.disc===disc).map(r=>r.t)),prevTop=board(disc,'all',this.saveData.runs).find(e=>!e.you);this.saveData.runs.push({disc,t:final,day:today});if(this.saveData.runs.length>300)this.saveData.runs.splice(0,this.saveData.runs.length-300);const gh=this.saveData.ghost[disc],staleJumpGhost=disc==='jump'&&!this.validJumpGhost(gh);if(!gh||gh.day!==today||staleJumpGhost||final<gh.t)this.saveData.ghost[disc]={day:today,t:final,pts:this.race.rec,splits:this.race.splits,...(disc==='jump'?{courseVersion:JUMP_COURSE_VERSION}:{})};const md=medal(disc,final),before=this.saveData.medals[disc];let unlock=null;if(md&&(!before||MR[md]>MR[before])){const was=this.unlockedBlankets().map(c=>c[0]);this.saveData.medals[disc]=md;const now=this.unlockedBlankets().filter(c=>!was.includes(c[0]));if(now.length){const c=now[now.length-1];this.saveData.cos.blanket=c[0];this.applyCosmetics();unlock=`Unlocked: ${c[1]} saddle blanket · equipped`;}}if(disc==='lap_horse'){this.saveData.laps++;if(this.saveData.laps>=5&&!this.saveData.own){this.saveData.own=true;unlock=(unlock?unlock+'<br>':'')+'Five laps: the horse is yours now';}}this.save();this.chime();const rk=s=>board(disc,s,this.saveData.runs).findIndex(e=>e.you)+1,rd=rk('day'),rw=rk('week'),ra=rk('all');const n=board(disc,'day',this.saveData.runs).length;let quote;if(ra===1&&(!prevTop||final<prevTop.t))quote="Best time anyone has ridden here. Fine. I'm impressed.";else if(rd===1)quote="Fastest today. Don't let it go to your head.";else if(rd<=3)quote='On the podium today. Not bad.';else if(rd<=Math.ceil(n/2))quote='Middle of the pack. The horse did most of the work.';else quote='Slow. But you finished, which is more than most.';if(this.race.pen>=8)quote+=' And stop knocking my poles down.';const isFirst=!isFinite(prevBest),newBest=!isFirst&&final<prevBest;let kick=md?md[0].toUpperCase()+md.slice(1):'Finished';const pb=isFirst?'First time on the board':newBest?'−'+(prevBest-final).toFixed(2)+' on your best':'+'+(final-prevBest).toFixed(2)+' off your best '+fmt(prevBest);this.showResult({kick,cls:md||'',time:final,ride:this.race.time,pen:this.race.pen,sub:disc==='jump'?('Ride '+fmt(this.race.time)+' · '+(this.race.pen?(Math.max(1,Math.round(this.race.pen/4))+' pole'+(Math.round(this.race.pen/4)===1?'':'s')+' down'):'clear round')):'Standing start, one lap',ranks:`Your best: #${rd} today · #${rw} this week · #${ra} all time`,unlock,quote,pb,newBest,first:isFirst});this.worldSay(quote,6);this.syncRaceClasses();}

  resultBoardState(){
    if(!this.race)return null;const disc=this.race.disc,runs=this.resultRuns(),list=board(disc,this.raceScope,runs),yi=list.findIndex(e=>e.you),D=DISC[disc],scopeName=SCOPES.find(x=>x[0]===this.raceScope)?.[1]||'Today';
    const mapRow=(e,i)=>({rank:i+1,name:e.you?'You':e.name,t:fmt(e.t),you:!!e.you});
    const rows=yi<9?list.slice(0,9).map(mapRow):[...list.slice(0,7).map(mapRow),{gap:true},mapRow(list[yi],yi)];
    return{key:disc+'|'+this.raceScope+'|'+(this._resultSerial||0),title:scopeName+"'s standings",sub:D.n+' · '+D.m,rows};
  }
  resultPodiumState(){
    if(!this.race)return{slots:[]};
    const top=board(this.race.disc,'day',this.resultRuns()).slice(0,3);
    return{slots:top.map((e,i)=>({rank:i+1,name:e.you?'You':e.name,you:!!e.you}))};
  }
  postResultStage(boardOpen=false){
    const f=this.ui.resultStageFrame;if(!f?.contentWindow||!this.race)return;const cls=this._lastResult?.cls||'',disc=this.race.disc;
    const party=['gold','silver','bronze'].includes(cls)?cls:'none';let react='nod';const rd=this.resultRankData()[0]?.n;if(rd===1)react='cheer';else if(typeof rd==='number'&&rd<=3)react='nod';else if(this.race.dq)react='scold';else react='shrug';
    f.contentWindow.postMessage({resultShot:{mount:'horse',shot:disc==='jump'?'jump':'horse_lap',fx:boardOpen?.5:.42,fy:boardOpen?.5:.52,k:disc+'|'+(this._resultSerial||0),skip:this._resultSkipSerial||0,party,react,podium:this.resultPodiumState(),board:boardOpen?this.resultBoardState():null}},'*');
  }
  toggleResultBoard(open){
    if(!this.race||this.race.phase!=='done')return;
    const on=open??!this.ui.resultBoard?.classList.contains('show');
    if(on)this.skipResultTimeline(false);
    this.ui.resultBoard?.classList.toggle('show',!!on);this.ui.result?.classList.toggle('board-open',!!on);
    if(on)this.renderResultBoard();this.postResultStage(!!on);
    if(this.ui.resultThoraMood)this.ui.resultThoraMood.textContent=on?'on her way':(this.resultRankData()[0]?.n===1?'is beaming':'at the podium');
    if(on){
      const yi=board(this.race.disc,this.raceScope,this.resultRuns()).findIndex(e=>e.you),list=board(this.race.disc,this.raceScope,this.resultRuns());
      if(this.ui.resultQuote)this.ui.resultQuote.textContent=yi===0?'Top line. In chalk, for now.':`Find yourself. Then find ${list[0]?.name||'the top'} and pass them.`;
      clearTimeout(this._resultBoardBubbleTimer);this._resultBoardBubbleTimer=setTimeout(()=>{if(this.ui.result?.classList.contains('board-open')){if(this.ui.resultThoraMood)this.ui.resultThoraMood.textContent='at the board';this.ui.resultThoraBubble?.classList.add('show');}},1500);
    }else{
      clearTimeout(this._resultBoardBubbleTimer);if(this.ui.resultQuote)this.ui.resultQuote.textContent=this._lastResult?.quote||'';
    }
    this.ui.resultThoraBubble?.classList.add('show');
  }

  resultEaseOut(x){x=Math.max(0,Math.min(1,x));return 1-Math.pow(1-x,3);}
  resultBump(ms,start,dur){const x=(ms-start)/dur;if(x<=0||x>=1)return 0;return Math.sin(Math.PI*x);}
  cancelResultTimeline(){if(this._resultAnimRaf){cancelAnimationFrame(this._resultAnimRaf);this._resultAnimRaf=0;}clearTimeout(this._resultAnimTimeout);}
  skipResultTimeline(notifyStage=true){
    if(!this._resultTimelineActive)return;this.cancelResultTimeline();this._resultTimelineActive=false;this._resultElapsed=2400;this.applyResultTimeline(2400);
    if(notifyStage){this._resultSkipSerial=(this._resultSkipSerial||0)+1;this.postResultStage(false);}
  }
  startResultTimeline(){
    this.cancelResultTimeline();this._resultTimelineActive=true;this._resultElapsed=0;this._resultSkipSerial=this._resultSkipSerial||0;
    const t0=performance.now();
    const tick=()=>{if(!this._resultTimelineActive)return;const e=Math.min(2400,performance.now()-t0);this._resultElapsed=e;this.applyResultTimeline(e);if(e>=2400){this._resultTimelineActive=false;this._resultAnimRaf=0;return;}this._resultAnimRaf=requestAnimationFrame(tick);};
    this.applyResultTimeline(0);this._resultAnimRaf=requestAnimationFrame(tick);
  }
  applyResultTimeline(e){
    const o=this._lastResult||{},isDQ=o.time==null,done=e>=2400,medIn=e>=(isDQ?550:1250),penIn=e>=1050,stamp=e>=1450,rkIn=e>=1550,unIn=e>=1800,btnIn=e>=1950,bubIn=e>=1300,gold=o.cls==='gold';
    const cl=(a,b,c)=>Math.max(0,Math.min(1,(a-b)/(c-b))),eo=x=>this.resultEaseOut(x);
    if(this.ui.resultDisc)this.ui.resultDisc.style.opacity=e>=80?'1':'0';
    if(this.ui.resultTime&&!isDQ){let tv=(o.ride??o.time)*eo(cl(e,200,950));if((o.pen||0)&&e>=1050)tv=(o.ride??(o.time-o.pen))+(o.pen||0)*cl(e,1050,1180);if(done)tv=o.time;this.ui.resultTime.textContent=fmt(tv);const sc=1+.07*this.resultBump(e,900,220)+.05*this.resultBump(e,1180,200);this.ui.resultTime.style.transform=`scale(${sc})`;this.ui.resultTime.style.color=gold&&medIn?'#7a5f1e':'#2f2a22';}
    if(this.ui.resultPenalty){this.ui.resultPenalty.style.opacity=penIn&&o.pen?'1':'0';this.ui.resultPenalty.style.transform=`scale(${penIn?1:1.9}) rotate(2deg)`;}
    if(this.ui.resultMedalPop){this.ui.resultMedalPop.style.opacity=medIn?'1':'0';this.ui.resultMedalPop.style.transform=`scale(${medIn?1:2.4}) rotate(${medIn?0:-28}deg)`;}
    if(this.ui.resultRays)this.ui.resultRays.style.opacity=(gold&&medIn)?'1':'0';
    if(this.ui.resultFlash)this.ui.resultFlash.style.opacity=gold?(0.9*this.resultBump(e,1250,400)).toFixed(3):'0';
    if(this.ui.resultBest){this.ui.resultBest.style.opacity=stamp&&(o.newBest||o.first)?'1':'0';this.ui.resultBest.style.transform=`scale(${stamp?1:1.8}) rotate(-4deg)`;}
    if(this.ui.resultPb){this.ui.resultPb.style.opacity=stamp?'1':'0';this.ui.resultPb.style.transform=`translateY(${stamp?0:8}px)`;}
    if(this.ui.resultSub){this.ui.resultSub.style.opacity=stamp?'1':'0';this.ui.resultSub.style.transform=`translateY(${stamp?0:8}px)`;}
    if(this.ui.resultRanks){this.ui.resultRanks.style.opacity=rkIn?'1':'0';this.ui.resultRanks.style.transform=`translateY(${rkIn?0:10}px)`;if(!isDQ){const targets=this.resultRankData(),nDay=board(this.race.disc,'day',this.resultRuns()).length,k=eo(cl(e,1550,1900));this.ui.resultRanks.innerHTML=targets.map(x=>{const n=typeof x.n==='number'?Math.max(x.n,Math.round(nDay+4-(nDay+4-x.n)*k)):x.n;return `<span class="chip ${x.n===1?'top':''}"><b>#${n}</b><span>${x.l}</span></span>`;}).join('');}}
    if(this.ui.resultUnlock){this.ui.resultUnlock.style.opacity=unIn?'1':'0';this.ui.resultUnlock.style.transform=`scale(${unIn?1:.6})`;}
    const acts=this.ui.result?.querySelector('.stable-result-actions');if(acts){acts.style.opacity=btnIn?'1':'0';acts.style.transform=`translateY(${btnIn?0:12}px)`;acts.style.pointerEvents=btnIn?'auto':'none';}
    if(this.ui.resultSkip){this.ui.resultSkip.classList.toggle('show',!done&&!this.ui.result?.classList.contains('board-open'));}
    if(this.ui.resultThoraBubble){this.ui.resultThoraBubble.classList.toggle('show',bubIn||this.ui.result?.classList.contains('board-open'));}
    if(this.ui.resultQuote&&!this.ui.result?.classList.contains('board-open')){const q=o.quote||'',n=done?q.length:Math.max(0,Math.floor((e-1300)/12));this.ui.resultQuote.textContent=q.slice(0,n);}
    if(isDQ&&this.ui.resultTime){this.ui.resultTime.textContent='—';this.ui.resultTime.style.transform=`translateX(${e>=500&&e<850?Math.sin(e/14)*12*(1-(e-500)/350):0}px)`;}
  }

  showResult(o){this.ensureResultStage();
    if(!this.race)return;this._lastResult={...o};this._resultSerial=(this._resultSerial||0)+1;const D=DISC[this.race.disc],isDQ=o.time==null;
    const label=isDQ?'DQ':(o.cls?o.cls[0].toUpperCase()+o.cls.slice(1):'Finished');
    if(this.ui.resultKick){this.ui.resultKick.className='stable-result-medal '+(o.cls||'none');if(this.ui.resultMedalPop)this.ui.resultMedalPop.className='stable-result-medal-pop '+(o.cls||'none');if(this.ui.resultMedalLabel)this.ui.resultMedalLabel.textContent=label;else this.ui.resultKick.textContent=label;}
    if(this.ui.resultDisc)this.ui.resultDisc.textContent=D.n+' · '+D.m;if(this.ui.resultSceneDisc)this.ui.resultSceneDisc.textContent=D.n+' · '+D.m;
    if(this.ui.resultTime)this.ui.resultTime.textContent=isDQ?'—':'0.00';
    if(this.ui.resultPenalty){const poles=this.race.disc==='jump'&&o.pen?Math.max(1,Math.round(o.pen/4)):0;const txt=o.pen?(this.race.disc==='jump'?`+${o.pen} · ${poles} pole${poles===1?'':'s'} down`:`+${o.pen} penalty`):'';this.ui.resultPenalty.textContent=txt;this.ui.resultPenalty.style.display=txt?'inline-flex':'none';}
    if(this.ui.resultSub)this.ui.resultSub.textContent=o.sub||'';if(this.ui.resultPb){this.ui.resultPb.textContent=o.pb||'';this.ui.resultPb.classList.toggle('good',!!o.newBest);}if(this.ui.resultBest){this.ui.resultBest.textContent=o.first?'First ride':'New best';this.ui.resultBest.classList.toggle('show',!!(o.newBest||o.first));this.ui.resultBest.classList.toggle('first',!!o.first);}if(this.ui.resultQuote)this.ui.resultQuote.textContent='';if(this.ui.resultUnlock)this.ui.resultUnlock.innerHTML=o.unlock||'';
    this.raceScope='day';if(this.ui.resultBoardTitle)this.ui.resultBoardTitle.textContent=D.n+' · '+D.m;this.renderResultBoard();this.ui.result?.classList.add('show');this.ui.result?.classList.remove('board-open');this.ui.resultBoard?.classList.remove('show');if(this.ui.resultThoraMood)this.ui.resultThoraMood.textContent=this.resultRankData()[0]?.n===1?'is beaming':'at the podium';this.ui.resultThoraBubble?.classList.remove('show');
    this.startResultTimeline();const send=()=>this.postResultStage(false);if(this.ui.resultStageFrame?.contentWindow){send();setTimeout(send,120);setTimeout(send,500);}
  }
  hideRaceResult(){this.releaseResultStage();this.cancelResultTimeline();this._resultTimelineActive=false;clearTimeout(this._resultBoardBubbleTimer);this.ui.result?.classList.remove('show','board-open');this.ui.resultBoard?.classList.remove('show');this.ui.resultBoardScrim?.classList.remove('show');this.ui.resultThoraBubble?.classList.remove('show');this.ui.resultSkip?.classList.remove('show');this.postResultStage(false);}
  resultRuns(){return this._devResultRuns||this.saveData.runs;}
  resultRankData(){if(!this.race)return[];const disc=this.race.disc,runs=this.resultRuns();return[['day','today'],['week','this week'],['all','all time']].map(([s,l])=>{const b=board(disc,s,runs),i=b.findIndex(e=>e.you);return{n:i>=0?i+1:'–',l};});}
  renderResultBoard(){
    if(!this.race||!this.ui.resultTabs)return;const disc=this.race.disc,runs=this.resultRuns(),b=board(disc,this.raceScope,runs),yi=b.findIndex(e=>e.you),D=DISC[disc];
    if(this.ui.resultBoardTitle)this.ui.resultBoardTitle.textContent=D.n+' · '+D.m;this.ui.resultTabs.innerHTML=SCOPES.map(([k,n])=>`<button data-s="${k}" class="${k===this.raceScope?'on':''}">${n}</button>`).join('');this.ui.resultTabs.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{this.raceScope=btn.dataset.s;this.renderResultBoard();this.postResultStage(true);const list=board(this.race.disc,this.raceScope,this.resultRuns()),yi=list.findIndex(e=>e.you);if(this.ui.resultQuote)this.ui.resultQuote.textContent=yi===0?'Top line. In chalk, for now.':`Find yourself. Then find ${list[0]?.name||'the top'} and pass them.`;});
    if(this.ui.resultPodium)this.ui.resultPodium.innerHTML='';if(this.ui.resultList)this.ui.resultList.innerHTML='';
    if(this.ui.resultYou){if(yi>=0){const e=b[yi];this.ui.resultYou.innerHTML=`<span>#${yi+1}</span><span>You · ${this.raceScope==='day'?'today':this.raceScope==='week'?'this week':'all time'}</span><span>${fmt(e.t)}</span>`;}else this.ui.resultYou.innerHTML='<span>–</span><span>Not on this board yet</span><span></span>';}
    const top=board(disc,'day',runs)[0];if(this.ui.resultGhostNote)this.ui.resultGhostNote.textContent=top?(top.you?"Next ride: you race your own ghost, today's #1.":`Next ride: you race ${top.name}'s ghost, today's #1 at ${fmt(top.t)}.`):'';
  }

  raceTick(dt){if(!this.race)return;const R=this.race;if(R.phase==='intro'){R.t+=dt;if(R.t>=R.introLen){R.phase='count';R.t=0;this.syncRaceClasses();}}else if(R.phase==='count'){R.t+=dt;const s=Math.floor(R.t/.85);if(s!==R.cs){R.cs=s;if(s<3){this.big(String(3-s),'#fff',.7,true);this.tone(660,.18,.18,'square');}else{this.big('GO!','#f0cf6a',.9,true);this.tone(990,.4,.2,'square');R.phase='run';R.time=0;R.gt=0;R.recT=0;R.rec=[this.recPt()];this.syncRaceClasses();}}}else if(R.phase==='run'){R.time+=dt;R.recT+=dt;while(R.recT>=.1){R.recT-=.1;R.rec.push(this.recPt());}if(R.time>240)this.dq('Out of time');}if(this.race&&(R.phase==='run'||R.phase==='done'))R.gt+=dt;if(!this.race)return;if(this.ui.raceTime)this.ui.raceTime.textContent=fmt(R.time);if(this.ui.racePen)this.ui.racePen.textContent=R.pen?'+'+R.pen:'0';if(this.ui.raceNext)this.ui.raceNext.textContent=R.disc==='jump'?(R.next<JUMPS.length?String(R.next+1):'FINISH'):(R.next<LAP_CP_COUNT?(R.next+1)+'/'+LAP_CP_COUNT:'FINISH');this.updateReserveUI();this.updateGhost(dt);}

  updateGhost(dt){const R=this.race,g=R?.ghost,gm=this.ghostHorse;if(!R||!gm)return;if(g&&R.phase!=='intro'&&R.gt<=g.t+.3){const p=g.at(Math.min(R.gt,g.t));gm.g.visible=true;gm.g.rotation.set(0,p.h,0);this.groundHorseVisual(gm,p.x,p.z,p.y);const gait=p.v>5.2?'Gallop':p.v>2.4?'Trot':p.v>.15?'Walk':'Idle';this.setHorseMotion(gm,gait,false,gait==='Idle'?1:Math.max(.6,p.v/(HSPD[gait]||1)));}else gm.g.visible=false;}

  big(html,col='#fff',d=1,huge=false){if(!this.ui.raceMsg)return;this.ui.raceMsg.innerHTML=html;this.ui.raceMsg.style.color=col;this.ui.raceMsg.classList.toggle('huge',huge);this.ui.raceMsg.classList.add('show');this._raceMsgTimer=d;}

  tone(f,len,g,type='triangle',delay=0){try{if(!this._ac)this._ac=new(window.AudioContext||window.webkitAudioContext)();if(this._ac.state==='suspended')this._ac.resume();const t=this._ac.currentTime+delay,o=this._ac.createOscillator(),G=this._ac.createGain();o.type=type;o.frequency.value=f;G.gain.setValueAtTime(0,t);G.gain.linearRampToValueAtTime(g,t+.01);G.gain.exponentialRampToValueAtTime(.001,t+len);o.connect(G).connect(this._ac.destination);o.start(t);o.stop(t+len+.05);}catch(e){}}
  chime(){[[784,0],[988,.1],[1318,.2]].forEach(([f,d])=>this.tone(f,.4,.15,'triangle',d));}

  update(dt,time,pos,camera,renderer){
    for(const m of this.mixers)m.update(dt);this.T+=this.mode==='world'?0:dt;
    for(const j of this.jumpTops){if(j.k>0&&j.k<1)j.k=Math.min(1,j.k+dt*2.8);j.g.position.y=-j.drop*j.k*j.k;if(!this.race&&j.k>=1){j.t-=dt;if(j.t<=0){j.k=0;j.g.position.y=0;}}}
    if(this._bubbleTimer>0){this._bubbleTimer-=dt;if(this._bubbleTimer<=0){this.ui.bubble?.classList.remove('show');this.syncClasses();}}
    if(this._raceMsgTimer>0){this._raceMsgTimer-=dt;if(this._raceMsgTimer<=0)this.ui.raceMsg?.classList.remove('show');}
    this.updateRaceStartMarkers(time,pos,dt);
    const shop=this._sideMode==='shop',sk=Math.min(1,dt*2.6);if(this.shopLight)this.shopLight.intensity+=((shop?5.2:0)-this.shopLight.intensity)*sk;
    if(this.thora){const tx=shop?THORA_SHOP_POS.x:THORA_POS.x,tz=shop?THORA_SHOP_POS.z:THORA_POS.z;this.thora.position.x+=(tx-this.thora.position.x)*sk;this.thora.position.z+=(tz-this.thora.position.z)*sk;const ty=shop?2.30:PI;this.thora.rotation.y=wrap(this.thora.rotation.y+wrap(ty-this.thora.rotation.y)*sk);}
    if(this.mode==='enter'){this.scriptPlayerToCounter(dt);if(this.T>1.7){this.mode='greet';this.T=0;this.say(this.lent?REOPEN[Math.floor(Math.random()*REOPEN.length)]:'You want to ride? Everyone wants to ride. Few want to muck out.',60);this.renderDialog();this.syncClasses();}}
    else if(this.mode==='exit'&&this.T>1.9){this.mode='world';this.T=0;this.ui.bubble?.classList.remove('show');this.setThoraMotion('idle');this.syncClasses();}
    else if(this.mode==='ride'){if(this.input?.consumeHop?.())this.jump();this.updateRide(dt,time,false);}
    else if(this.mode==='race'){if(this.input?.consumeHop?.()&&this.race?.phase==='run')this.jump();this.raceTick(dt);this.updateRide(dt,time,!this.race||this.race.phase!=='run');}
    this.syncPlayerVisibility();this.updatePassiveStatus(pos);this.syncRaceClasses();if(camera)this.projectUI(camera,renderer);
  }

  updatePassiveStatus(pos){if(!this.ui.status||!pos||this.access||this.mode!=='world'){this.ui.status?.classList.remove('show');return;}const p=this.worldToLocal(pos),near=Math.hypot(p.x-GATE.x,p.z-GATE.z)<GATE.radius;this.ui.status.innerHTML='<b>STABLE CLOSED</b><span>Talk to Thora</span>';this.ui.status.classList.toggle('show',near);}

  inTunnel(x,z){return Math.abs(x)<HOUSE.aisle+.3&&z>HOUSE.zs-1.6&&z<HOUSE.zn+1.2;}
  usesTunnelCamera(pos=this.character?.position){if(!this.ready||this.mode!=='world'||!pos)return false;const p=this.worldToLocal(pos);return this.inTunnel(p.x,p.z)||this.tunnelBlend>.03;}
  applyCamera(camera,followCamera,dt){
    if(!camera||!followCamera)return;
    if(['enter','greet','exit'].includes(this.mode))return this.applyTalkCamera(camera,followCamera,dt);
    if(this.mode==='ride'||this.mode==='race')return this.applyRideCamera(camera,dt);
    // Claude Stable v2 tunnel camera: automatically align behind the character and
    // compress distance/pitch while crossing the drive-through. No wall cutaway needed.
    const p=this.worldToLocal(this.character?.position||{x:0,z:0}),tun=this.inTunnel(p.x,p.z);this.tunnelBlend+=((tun?1:0)-this.tunnelBlend)*Math.min(1,dt*4);
    if(this.tunnelBlend<.002){this._tunnelInit=false;return;}
    const localHeading=this.localHeadingFromWorld(this.character?.heading||0);
    if(!this._tunnelInit){
      // Convert the normal world-camera yaw to Stable-local yaw. With ROOT rotated PI,
      // adding PI is equivalent to subtracting PI after angle wrapping.
      this.tunnelCamYaw=wrap((followCamera.yaw||0)+ROOT.rotation);
      this._camTgt.copy(followCamera.look||this.character?.position||new THREE.Vector3());
      this._tunnelInit=true;
    }
    // Direct port of Claude Stable v2 lines 400-410: once the player enters the
    // drive-through, align behind heading, compress camera distance to 2.6 m and
    // flatten pitch to 0.1. Do not use Stable wall occlusion/cutaway in this zone.
    const d=wrap((localHeading+PI)-this.tunnelCamYaw);
    this.tunnelCamYaw=wrap(this.tunnelCamYaw+d*Math.min(1,dt*2.5*this.tunnelBlend));
    const baseDist=followCamera.distance?.()??5.2;
    const basePitch=followCamera.pitch??.43;
    const dist=baseDist+(2.6-baseDist)*this.tunnelBlend;
    const pitch=basePitch+(.1-basePitch)*this.tunnelBlend;
    const tgtY=(this.character?.position?.y||0)+1;
    const cpL={x:p.x+Math.sin(this.tunnelCamYaw)*Math.cos(pitch)*dist,z:p.z+Math.cos(this.tunnelCamYaw)*Math.cos(pitch)*dist};
    const cpW=this.localToWorld(cpL.x,cpL.z),tgt=new THREE.Vector3(this.character.position.x,tgtY,this.character.position.z),desired=new THREE.Vector3(cpW.x,tgtY+Math.sin(pitch)*dist,cpW.z);
    camera.position.lerp(desired,Math.min(1,dt*6));
    this._camTgt.lerp(tgt,Math.min(1,dt*8));
    camera.lookAt(this._camTgt);camera.updateMatrixWorld(true);
    // Keep normal camera state synchronized while Stable has hard ownership so the
    // hand-back outside the tunnel is a blend, not a stale third-person snap.
    followCamera.yaw=wrap(this.tunnelCamYaw-ROOT.rotation);followCamera.position.copy(camera.position);followCamera.basePosition.copy(camera.position);followCamera.look.copy(this._camTgt);
  }

  applyTalkCamera(camera,followCamera,dt){if(!this._camInit){this._camPos.copy(camera.position);this._camTgt.copy(followCamera.look||this.character?.position||new THREE.Vector3());this._camInit=true;}const portrait=camera.aspect<.85,shop=this._sideMode==='shop',atCounter=this.mode==='enter'||this.mode==='greet'||(this.mode==='exit'&&this.T<1.5);let fov=portrait?58:40;if(shop){const d=this.shopDisplays[this._shopIndex],center=d?.center||new THREE.Vector3(3.3,1.2,-12.4),cp=this.localToWorld(SHOP_CAMERA.x,portrait?-15.92:SHOP_CAMERA.z),tw=this.localToWorld(center.x,center.z);this._dPos.set(cp.x,portrait?1.66:SHOP_CAMERA.y,cp.z);const thoraW=this.localToWorld(THORA_SHOP_POS.x,THORA_SHOP_POS.z),mix=portrait?.82:.72;this._dTgt.set(THREE.MathUtils.lerp(thoraW.x,tw.x,mix),THREE.MathUtils.lerp(1.28,center.y,mix),THREE.MathUtils.lerp(thoraW.z,tw.z,mix));const k=1-Math.exp(-dt*4.2);this._camPos.lerp(this._dPos,k);this._camTgt.lerp(this._dTgt,k);camera.position.copy(this._camPos);camera.lookAt(this._camTgt);camera.fov+=((portrait?64:52)-camera.fov)*k;camera.near=.06;camera.far=200;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);this.projectUI(camera,this.renderer);return;}if(atCounter){/* R72 phone landscape: frame Thora in the upper half, between her answer bubble and the choices (Sigurd setup) */const ph=!portrait&&document.body.classList.contains('touch');const cp=this.localToWorld(3.3,portrait?-18.95:ph?-18.9:-18.25),tp=this.localToWorld(3.3,-14.25);this._dPos.set(cp.x,portrait?1.55:ph?1.5:1.48,cp.z);this._dTgt.set(tp.x,ph?.72:1.30,tp.z);camera.position.copy(this._dPos);camera.lookAt(this._dTgt);camera.fov=fov;camera.near=.08;camera.far=200;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);this._camPos.copy(this._dPos);this._camTgt.copy(this._dTgt);this.projectUI(camera,this.renderer);return;}this._dPos.copy(followCamera.position);this._dTgt.copy(followCamera.look);fov=camera.aspect<.8?58:48;const k=1-Math.exp(-dt*3.2);this._camPos.lerp(this._dPos,k);this._camTgt.lerp(this._dTgt,k);camera.position.copy(this._camPos);camera.lookAt(this._camTgt);camera.fov+=(fov-camera.fov)*k;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);this.projectUI(camera,this.renderer);}

  applyRideCamera(camera,dt){if(!this.mount)return;const R=this.ride,localHeading=R.h,tun=this.inTunnel(R.x,R.z);this.tunnelBlend+=((tun?1:0)-this.tunnelBlend)*Math.min(1,dt*4);const raceFollow=this.mode==='race'&&this.race?.phase!=='done',intro=this.race?.phase==='intro'&&!raceFollow,done=this.race?.phase==='done',u=intro?ease(Math.min(1,this.race.t/this.race.introLen)):1;if(raceFollow){this._rideDragging=false;const d=wrap((localHeading+PI)-this.rideCamYaw);this.rideCamYaw=wrap(this.rideCamYaw+d*Math.min(1,dt*(4.8+Math.abs(R.v)*.38)));}else if(intro)this.rideCamYaw=R.h+.5+(PI-.5)*u;else if(done){const d=wrap((localHeading+PI+.28)-this.rideCamYaw);this.rideCamYaw=wrap(this.rideCamYaw+d*Math.min(1,dt*3.2));}else if(!this._rideDragging){const d=wrap((localHeading+PI)-this.rideCamYaw);this.rideCamYaw=wrap(this.rideCamYaw+d*Math.min(1,dt*(1.5+Math.abs(R.v)*.3)));}let dist=this.rideCamDist*1.35,pitch=this.rideCamPitch;if(intro){dist=4+(dist-4)*u;pitch=.12+(pitch-.12)*u;}if(done){dist=camera.aspect<.8?5.65:5.15;pitch=camera.aspect<.8?.10:.14;}dist+=(3.4-dist)*this.tunnelBlend;pitch+=(.1-pitch)*this.tunnelBlend;const tgtL={x:R.x,z:R.z},tgtY=this.localGroundY(R.x,R.z)+(done&&camera.aspect<.8?1.28:1.6)+R.y*.5,cpL={x:tgtL.x+Math.sin(this.rideCamYaw)*Math.cos(pitch)*dist,z:tgtL.z+Math.cos(this.rideCamYaw)*Math.cos(pitch)*dist},tw=this.localToWorld(tgtL.x,tgtL.z),cw=this.localToWorld(cpL.x,cpL.z),target=new THREE.Vector3(tw.x,tgtY,tw.z),desired=new THREE.Vector3(cw.x,tgtY+Math.sin(pitch)*dist,cw.z);if(!this._rideCamInit){this._rideCamPos.copy(camera.position);this._rideCamTgt.copy(target);this._rideCamInit=true;}this._rideCamPos.lerp(desired,Math.min(1,dt*(intro?12:6)));this._rideCamTgt.lerp(target,Math.min(1,dt*8));camera.position.copy(this._rideCamPos);camera.lookAt(this._rideCamTgt);camera.fov=camera.aspect<.8?58:48;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}

  projectUI(camera,renderer){const rect=(renderer||this.renderer)?.domElement?.getBoundingClientRect?.()||{left:0,top:0,width:innerWidth,height:innerHeight};if(this.ui.bubble?.classList.contains('show')&&this.thora){if(this.thoraHead)this.thoraHead.getWorldPosition(this._tmp);else new THREE.Box3().setFromObject(this.thora).getCenter(this._tmp);this._tmp.y+=.48;this._tmp.project(camera);const bw=this.ui.bubble.offsetWidth||230,bh=this.ui.bubble.offsetHeight||110,pad=18,lx=rect.left+(this._tmp.x+1)*.5*rect.width,ty=rect.top+(1-this._tmp.y)*.5*rect.height;this.ui.bubble.style.left=THREE.MathUtils.clamp(lx,rect.left+pad+bw*.5,rect.left+rect.width-pad-bw*.5)+'px';let lim=rect.top+rect.height-pad;for(const el of [this.ui.dlg,this.ui.side]){const r=el?.offsetParent&&getComputedStyle(el).opacity>.1?el.getBoundingClientRect():null;if(r&&r.height&&r.top>rect.top+rect.height*.25)lim=Math.min(lim,r.top-10);}/* R72: Thora's answer always sits above the choices, like Sigurd */this.ui.bubble.style.top=THREE.MathUtils.clamp(ty,rect.top+pad+bh,Math.max(rect.top+pad+bh,lim))+'px';}if(this.ui.status?.classList.contains('show')){const g=this.localToWorld(GATE.x,GATE.z);this._tmp.set(g.x,1.65,g.z).project(camera);if(this._tmp.z<-1||this._tmp.z>1||Math.abs(this._tmp.x)>1.15||Math.abs(this._tmp.y)>1.15){this.ui.status.classList.remove('onscreen');return;}const bw=this.ui.status.offsetWidth||180,bh=this.ui.status.offsetHeight||70,pad=14,lx=rect.left+(this._tmp.x+1)*.5*rect.width,ty=rect.top+(1-this._tmp.y)*.5*rect.height;this.ui.status.style.left=THREE.MathUtils.clamp(lx,rect.left+pad+bw*.5,rect.left+rect.width-pad-bw*.5)+'px';this.ui.status.style.top=THREE.MathUtils.clamp(ty,rect.top+pad+bh,rect.top+rect.height-pad)+'px';this.ui.status.classList.add('onscreen');}}

  doorOpenAmount(){if(!this.doorsAction||!this.doorsClip)return this.access?1:0;return THREE.MathUtils.clamp(this.doorsAction.time/Math.max(.001,this.doorsClip.duration),0,1);}
  resolveCollisions(p,radius=.3){
    const c=Math.cos(ROOT.rotation),s=Math.sin(ROOT.rotation),dx=p.x-ROOT.x,dz=p.z-ROOT.z;let x=c*dx-s*dz,z=s*dx+c*dz;
    const pushRect=(x0,x1,z0,z1)=>{if(x<x0-radius||x>x1+radius||z<z0-radius||z>z1+radius)return;const dl=Math.abs(x-(x0-radius)),dr=Math.abs((x1+radius)-x),db=Math.abs(z-(z0-radius)),df=Math.abs((z1+radius)-z),m=Math.min(dl,dr,db,df);if(m===dl)x=x0-radius;else if(m===dr)x=x1+radius;else if(m===db)z=z0-radius;else z=z1+radius;};
    const pushCircle=(cx,cz,extra=.3)=>{const ddx=x-cx,ddz=z-cz,d=Math.hypot(ddx,ddz),need=radius+extra;if(d>=need)return;const nx=d>1e-5?ddx/d:1,nz=d>1e-5?ddz/d:0;x=cx+nx*need;z=cz+nz*need;};
    const segPush=(ax,az,bx,bz,pad=.09)=>{const vx=bx-ax,vz=bz-az,L2=vx*vx+vz*vz;if(L2<1e-8)return;let t=((x-ax)*vx+(z-az)*vz)/L2;t=Math.max(0,Math.min(1,t));const qx=ax+vx*t,qz=az+vz*t,ddx=x-qx,ddz=z-qz,d=Math.hypot(ddx,ddz),need=radius+pad;if(d>=need)return;const nx=d>1e-5?ddx/d:-(bz-az)/Math.sqrt(L2),nz=d>1e-5?ddz/d:(bx-ax)/Math.sqrt(L2);x=qx+nx*need;z=qz+nz*need;};
    pushRect(HOUSE.x0,-HOUSE.aisle,HOUSE.zs,HOUSE.zn);pushRect(HOUSE.aisle,HOUSE.x1,HOUSE.zs,HOUSE.zn);pushRect(-6.8,-6.0,-14.2,-12.2);pushRect(-6.2,-5.5,-11.9,-10.3);pushRect(5.55,6.45,-14.8,-12.7);pushRect(6.9,7.3,-12.4,-10.7);pushRect(8.38,8.62,-15.12,-14.88);pushRect(8.38,8.62,-10.52,-10.28);segPush(-7.7,-3.7,-4.3,-3.7,.08);
    for(const h of this.horses)if(h!==this.mount)pushCircle(h.g.position.x,h.g.position.z,.50);
    const rail=(R,opening)=>{const ax=Math.max(-16,Math.min(16,x)),vx=x-ax,vz=z-8,d=Math.hypot(vx,vz);if(Math.abs(d-R)>=radius+.10)return;if(z<8&&Math.abs(x)<opening)return;const nx=d>1e-5?vx/d:0,nz=d>1e-5?vz/d:-1,target=d<R?R-(radius+.10):R+(radius+.10);x=ax+nx*target;z=8+nz*target;};rail(17.95,5.6);rail(14.05,SOURCE_GATE.w-.05);
    for(const J of JUMPS){const horiz=J.ax==='x',ax=J.x+(horiz?-1.6:0),az=J.z+(horiz?0:-1.6),bx=J.x+(horiz?1.6:0),bz=J.z+(horiz?0:1.6);segPush(ax,az,bx,bz,.10);}const u=this.doorOpenAmount(),a=1.5*u,hingeZ=HOUSE.zs-.03,lEndX=-HOUSE.aisle+HOUSE.aisle*Math.cos(a),lEndZ=hingeZ-HOUSE.aisle*Math.sin(a),rEndX=HOUSE.aisle-HOUSE.aisle*Math.cos(a),rEndZ=hingeZ-HOUSE.aisle*Math.sin(a);segPush(-HOUSE.aisle,hingeZ,lEndX,lEndZ,.055);segPush(HOUSE.aisle,hingeZ,rEndX,rEndZ,.055);p.x=ROOT.x+c*x+s*z;p.z=ROOT.z-s*x+c*z;
  }

  cameraOcclusionDistance(start,end,maxDist,margin=.20){if(!this.ready||this.mode!=='world')return maxDist;const A=this.worldToLocal(start);if(this.inTunnel(A.x,A.z)||this.tunnelBlend>.03)return maxDist;const B=this.worldToLocal(end),dy=end.y-start.y;let best=maxDist;const hitSeg=(ax,az,bx,bz,y0=0,y1=3.0,half=.08)=>{const rx=B.x-A.x,rz=B.z-A.z,sx=bx-ax,sz=bz-az,den=rx*sz-rz*sx;if(Math.abs(den)<1e-7)return;const qx=ax-A.x,qz=az-A.z,t=(qx*sz-qz*sx)/den,u=(qx*rz-qz*rx)/den;if(t<0||t>1||u<0||u>1)return;const y=start.y+dy*t;if(y<y0-margin||y>y1+margin)return;const d=maxDist*t;if(d<best)best=Math.max(0,d-half-margin);};hitSeg(HOUSE.x0,HOUSE.zs,-HOUSE.aisle,HOUSE.zs);hitSeg(HOUSE.aisle,HOUSE.zs,HOUSE.x1,HOUSE.zs);hitSeg(HOUSE.x0,HOUSE.zn,-HOUSE.aisle,HOUSE.zn);hitSeg(HOUSE.aisle,HOUSE.zn,HOUSE.x1,HOUSE.zn);hitSeg(HOUSE.x0,HOUSE.zs,HOUSE.x0,HOUSE.zn);hitSeg(HOUSE.x1,HOUSE.zs,HOUSE.x1,HOUSE.zn);hitSeg(-HOUSE.aisle,HOUSE.zs+.2,-HOUSE.aisle,HOUSE.zn-.2,0,2.6,.08);hitSeg(HOUSE.aisle,HOUSE.tack,HOUSE.aisle,HOUSE.zn-.2,0,2.6,.08);const u=this.doorOpenAmount(),a=1.5*u,hz=HOUSE.zs-.03;hitSeg(-HOUSE.aisle,hz,-HOUSE.aisle+HOUSE.aisle*Math.cos(a),hz-HOUSE.aisle*Math.sin(a),0,2.3,.05);hitSeg(HOUSE.aisle,hz,HOUSE.aisle-HOUSE.aisle*Math.cos(a),hz-HOUSE.aisle*Math.sin(a),0,2.3,.05);return best;}
  cameraCutawayRoot(){return this.stable||null;}
  ensureDevResultBar(){
    let bar=document.getElementById('stable-result-devbar');
    if(!bar){
      bar=document.createElement('div');bar.id='stable-result-devbar';bar.className='stable-result-devbar';
      bar.innerHTML='<span>RESULT QA</span><button type="button" data-dev-disc="jump">Jumping</button><button type="button" data-dev-disc="lap_horse">Fastest lap</button><i></i><button type="button" data-dev-medal="gold">Gold</button><button type="button" data-dev-medal="silver">Silver</button><button type="button" data-dev-medal="bronze">Bronze</button><i></i><button type="button" data-dev-view="result">Result</button><button type="button" data-dev-view="standings">Standings</button><a href="./dev-hub.html">DEV menu</a>';
      document.body.appendChild(bar);
      bar.querySelectorAll('[data-dev-disc]').forEach(btn=>btn.addEventListener('click',()=>this.devShowResult(btn.dataset.devDisc,this._devMedalState||'gold')));
      bar.querySelectorAll('[data-dev-medal]').forEach(btn=>btn.addEventListener('click',()=>{this._devMedalState=btn.dataset.devMedal;this.devShowResult(this.race?.disc||'jump',this._devMedalState);}));
      bar.querySelector('[data-dev-view="result"]')?.addEventListener('click',()=>this.toggleResultBoard(false));
      bar.querySelector('[data-dev-view="standings"]')?.addEventListener('click',()=>this.toggleResultBoard(true));
    }
    bar.querySelectorAll('[data-dev-disc]').forEach(btn=>btn.classList.toggle('on',btn.dataset.devDisc===this.race?.disc));
    bar.querySelectorAll('[data-dev-medal]').forEach(btn=>btn.classList.toggle('on',btn.dataset.devMedal===(this._devMedalState||'gold')));
    bar.classList.add('show');
  }
  devShowResult(disc='jump',award='gold'){
    disc=disc==='lap_horse'?'lap_horse':'jump';award=['gold','silver','bronze'].includes(award)?award:'gold';this._devMedalState=award;const h=this.horses[0];if(!h)return;
    this._devResultMode=true;const g=DISC[disc].med;const final=award==='gold'?Math.max(1,g[0]-.7):award==='silver'?(g[0]+g[1])/2:(g[1]+g[2])/2;const pen=disc==='jump'&&award==='bronze'?4:0,ride=Math.max(1,final-pen);
    this._devResultRuns=[{disc,t:+final.toFixed(2),day:dayKey()}];
    if(this.mode==='world')this.mountHorse(h);else this.mount=h;
    if(disc==='jump'){this.ride.x=JUMP_FINISH.x+1.35;this.ride.z=JUMP_FINISH.z;this.ride.h=PI/2;}else{const z=TRACK.cz-TRACK.R;this.ride.x=START_X-1.35;this.ride.z=z;this.ride.h=-PI/2;}
    Object.assign(this.ride,{v:0,y:0,jumpT:-1,mt:0,reserve:1});this.groundHorseVisual(h,this.ride.x,this.ride.z,0);this.syncMountedPlayer(0);
    this.race={disc,phase:'done',t:0,introLen:0,time:ride,gt:0,pen,next:disc==='jump'?JUMPS.length:LAP_CP_COUNT,splits:[],ghost:null,rec:[],recT:0,dq:null,cs:-1,offTrackTime:0,offTrackPenalized:false};
    this.mode='race';this._ridePointer=null;this._rideDragging=false;this.rideCamYaw=this.ride.h+PI+.28;this._rideCamInit=false;if(this.ghostHorse)this.ghostHorse.g.visible=false;
    this.hideRaceResult();void this.ui.result?.offsetWidth;const D=DISC[disc];if(this.ui.raceName)this.ui.raceName.textContent=D.n;if(this.ui.raceSub)this.ui.raceSub.textContent=D.m;
    const quote=award==='gold'?"Fastest today. Don't let it go to your head.":award==='silver'?'On the podium today. Not bad.':'Medal\'s a medal. Now do it without the wobble.';
    this.showResult({cls:award,time:+final.toFixed(2),ride:+ride.toFixed(2),pen,sub:disc==='jump'?('Ride '+fmt(ride)+' · '+(pen?'1 pole down':'clear round')):'Standing start, one lap',unlock:null,quote,pb:award==='gold'?'−0.72 on your best':'+'+(award==='silver'?'0.84':'2.15')+' off your best',newBest:award==='gold',first:false});
    this.ensureDevResultBar();this.syncRaceClasses();this.syncClasses();
  }
  devPrepare(inside=false){
    this._devResultMode=false;this._devResultRuns=null;document.getElementById('stable-result-devbar')?.remove();
    // DEV routes must be deterministic regardless of saved Stable progress.
    // This is in-memory only: it never clears the player's leaderboard/reward save.
    this.lent=!!inside;this.setAccess(!!inside,true);this.closeSide();if(this.mount)this.resetHorseHome(this.mount);this.mode='world';this.race=null;this.mount=null;this.hideRaceResult();for(const h of this.horses)this.resetHorseHome(h);this.syncSetupClasses();this.syncRaceClasses();this.syncClasses();
  }
  devSpawn(inside=false){const p=this.localToWorld(0,inside?-8:-19);return{x:p.x,z:p.z,heading:inside?0:Math.PI};}
}
