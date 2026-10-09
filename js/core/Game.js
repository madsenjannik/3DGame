// @ts-nocheck
import * as THREE from 'three';
import { AssetRegistry } from './AssetRegistry.js';
import { CharacterController } from './CharacterController.js?build=MOBILE-GESTURE-R34B-20260930A';
import { GameState } from './GameState.js';
import { InputManager } from './InputManager.js?build=SAVE-R140-20261009A';
import { ThirdPersonCamera } from './ThirdPersonCamera.js?build=MOBILE-GESTURE-R34B-20260930A';
import { CameraOcclusionSystem } from './CameraOcclusionSystem.js?build=NORTH-STABLE-R23O-20260929A';
import { StructureVisibilitySystem } from '../visual/StructureVisibilitySystem.js?build=NORTH-STABLE-R23O-20260929A';
import { characterCatalog, resourceCatalog, buildingCatalog } from '../data/assetCatalog.js';
import { CollectibleSystem } from '../gameplay/CollectibleSystem.js?build=SAVE-R140-20261009A';
import { MeaningfulChoiceSystem } from '../gameplay/MeaningfulChoiceSystem.js?build=SAVE-R140-20261009A';
import { GreenhouseProgressionSystem } from '../gameplay/GreenhouseProgressionSystem.js?build=SAVE-R140-20261009A';
import { OrangeryHubSystem } from '../gameplay/OrangeryHubSystem.js?build=CAMERA-CUTAWAY-CONTEXT-R21D-20260928E';
import { FishingV1System } from '../gameplay/FishingV1System.js?build=BAG-NIGHT-R84-20261006A';
import { ChoicePanel } from '../ui/ChoicePanel.js';
import { Hud } from '../ui/Hud.js?build=SAVE-R140-20261009A';
import { WorldMap } from '../ui/WorldMap.js?build=WORLD-MAP-R35B-20260930B';
import { GardenEnvironment } from '../world/GardenEnvironment.js?build=WATER-VEG-R103-20261006A';
import { WildlifeSystem } from '../world/WildlifeSystem.js?build=CAMERA-CUTAWAY-CONTEXT-R21D-20260928E';
import { PlayerHomePortalSystem } from '../world/PlayerHomePortalSystem.js?build=ENTRY-R29-20260929A';
import { NorthStableSystem } from '../world/NorthStableSystem.js?build=SAVE-R140-20261009A';
import { SaveGame, pickWinner } from './SaveGame.js?build=SAVE-R140-20261009A';
import { WildsLoopSystem } from '../gameplay/WildsLoopSystem.js?build=SAVE-R140-20261009A';
import { WorkbenchPanel } from '../ui/WorkbenchPanel.js';
import { DevMenu, devMenuEnabled } from '../ui/DevMenu.js?build=SAVE-R140-20261009A';
import { applyControlProfile, defaultProfile } from './ControlProfiles.js';
import { PerfHud } from '../dev/PerfHud.js';
import { QualityManager, QUALITY } from './Quality.js?build=SAVE-R140-20261009A';
import { InteractionResolver } from './InteractionResolver.js';
import { log, warn } from '../dev/Log.js';
import { LookPass } from '../visual/LookPass.js?build=BAG-NIGHT-R84-20261006A';
import { DayNight } from '../visual/DayNight.js?build=BAG-NIGHT-R84-20261006A';   // R81
import { TOOLS } from '../data/wildsCatalog.js';   // R124 Bag texts (the Workbench's own effect lines)
import { WEAPONS } from '../data/combatCatalog.js';   // R124 strike values
import { VestVisual } from '../gameplay/VestVisual.js?build=SAVE-R140-20261009A';   // R125
import { SpecialHold } from '../ui/SpecialHold.js?build=SAVE-R140-20261009A';   // R126
import { GameMenu } from '../ui/GameMenu.js?build=SAVE-R140-20261009A';   // R121
import { ControlTips } from '../ui/ControlTips.js?build=SAVE-R140-20261009A';   // R120
import { Lantern } from '../gameplay/Lantern.js?build=SAVE-R140-20261009A';     // R81/R101
import { BoatEconomySystem } from '../gameplay/BoatEconomySystem.js';
import { LakeRunSystem } from '../gameplay/LakeRunSystem.js';
import { GardenBuildSystem } from '../gameplay/GardenBuildSystem.js';
import { GardenBuildMode } from '../ui/GardenBuildMode.js';
import { GardenVegetationMask } from '../world/GardenVegetationMask.js';
import { CombatSystem } from '../gameplay/CombatSystem.js?build=SAVE-R140-20261009A';
import { CharacterSwapSpot } from '../gameplay/CharacterSwapSpot.js?build=SAVE-R140-20261009A';   // R138
import { ImpactFx } from '../gameplay/ImpactFx.js?build=SAVE-R140-20261009A';   // R129 FX layer
import { EquippedToolVisual } from '../gameplay/EquippedToolVisual.js?build=HOTBAR-HAND-DRAG-R102-20261006A';

export class Game {
  async init({characterId='succulent',devMode=false}={}){
    this.state=new GameState();this.state.player.characterId=characterId;this.registry=new AssetRegistry(characterCatalog);this.uTime={value:0};
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setSize(innerWidth,innerHeight,false);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.02;
    this.renderer.setClearColor(0xdde5d3,1);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    document.getElementById('app').appendChild(this.renderer.domElement);
    // R114: iPhone can drop the WebGL context (memory pressure, long background). three.js tries to restore it; we save at once
    // and, if it has not come back after 4 s, offer a calm tap-to-reload instead of a frozen screen.
    this.renderer.domElement.addEventListener('webglcontextlost',()=>{try{this.save?.flush();}catch{}clearTimeout(this._glLostT);this._glLostT=setTimeout(()=>{
      if(document.getElementById('gl-lost'))return;const el=document.createElement('button');el.id='gl-lost';el.type='button';el.textContent='The picture was paused by your device. Tap to reload, your progress is saved.';
      el.style.cssText='position:fixed;inset:0;z-index:99999;border:0;background:#dfe6d6;color:#56644d;font:700 13px/1.6 system-ui,sans-serif;letter-spacing:.06em;padding:32px';
      el.addEventListener('click',()=>location.reload());document.body.appendChild(el);},4000);});
    this.renderer.domElement.addEventListener('webglcontextrestored',()=>{clearTimeout(this._glLostT);document.getElementById('gl-lost')?.remove();});
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xdde5d3);this.camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,400);
    const startupT0=performance.now();
    this.startupMetrics={build:'TECH-STARTUP-R36-20260930A',characterId:this.state.player.characterId};
    const mark=(name)=>{this.startupMetrics[name]=Math.round((performance.now()-startupT0)*10)/10;};

    this.world=new GardenEnvironment(this.scene,{uTime:this.uTime,renderer:this.renderer});mark('worldConstructedMs');
    // R52 error boundaries: only the world and the player character are critical. Every other
    // subsystem that fails to initialise (missing/broken GLB, exception) is logged and skipped.
    this.failed=[];
    const optional=(name,make)=>{let p;try{p=Promise.resolve(make());}catch(e){p=Promise.reject(e);}return p.then(v=>{log('LOAD',`${name} ready`);return v;},e=>{warn('LOAD',`${name} failed; the game continues without it`,e);this.failed.push(name);return null;});};

    // R36: World-critical GLBs are independent. Start them together instead of
    // serially waiting shed -> stable -> character. Gameplay still starts only
    // after every member of this wave is fully ready.
    try{this.wildlife=new WildlifeSystem(this.scene,{world:this.world,isTouch:this.world.isTouch});Promise.resolve(this.wildlife.init()).catch(e=>{warn('LOAD','wildlife failed',e);this.failed.push('wildlife');});}catch(e){warn('LOAD','wildlife failed',e);this.failed.push('wildlife');this.wildlife=null;}
    // R125 (GO 07/10; R138 replaces it with the shared keys below): greenhouse level and Stable progress follow the character. The old shared values go once to the
    // character that was played last (Jannik 07/10); everyone else starts fresh. The shared keys are left in place.
    const scoped=k=>`${k}.${characterId}`;
    try{if(!localStorage.getItem('tgw.scope.v1')){const last=JSON.parse(localStorage.getItem('tgw.lastChar')||'null')?.id||characterId;
      for(const k of ['dym-gh-level','dym.thoraStable.v1']){const v=localStorage.getItem(k);if(v!=null&&localStorage.getItem(`${k}.${last}`)==null)localStorage.setItem(`${k}.${last}`,v);}
      localStorage.setItem('tgw.scope.v1',last);}}catch{}
    // R138 (GO 09/10): one shared game. Greenhouse = the highest level any character reached; Stable = the progress of the
    // profile that wins the save merge (else the last played, else any); moved in = any character moved in. The per-character
    // keys stay in place (nothing is deleted); 'tgw.shared.v1' makes the greenhouse/Stable copy happen once.
    try{const keys=Object.keys(localStorage),sh=k=>`${k}.shared`;
      if(!localStorage.getItem('tgw.shared.v1')){
        let gh=-1;for(const k of keys)if((k==='dym-gh-level'||k.startsWith('dym-gh-level.'))&&k!==sh('dym-gh-level'))gh=Math.max(gh,parseInt(localStorage.getItem(k)||'0',10)||0);
        if(gh>=0&&localStorage.getItem(sh('dym-gh-level'))==null)localStorage.setItem(sh('dym-gh-level'),String(Math.min(3,gh)));
        let win='';try{const raw=JSON.parse(localStorage.getItem('tgw.save')||'null');win=raw?.mergedFrom||((raw?.version|0)<4?pickWinner(raw?.profiles):'');}catch{}
        const S='dym.thoraStable.v1',last=JSON.parse(localStorage.getItem('tgw.lastChar')||'null')?.id||'';
        const src=[win,last].map(c=>c?localStorage.getItem(`${S}.${c}`):null).find(v=>v!=null)??keys.filter(k=>k.startsWith(S+'.')&&k!==sh(S)).map(k=>localStorage.getItem(k))[0]??localStorage.getItem(S);
        if(src&&localStorage.getItem(sh(S))==null)localStorage.setItem(sh(S),src);
        localStorage.setItem('tgw.shared.v1',win||last||characterId);}
      const MI='dym.homeMovedIn.v1';if(localStorage.getItem(sh(MI))!=='1'&&keys.some(k=>k.startsWith(MI+'.')&&localStorage.getItem(k)==='1'))localStorage.setItem(sh(MI),'1');}catch{}
    const shared=k=>`${k}.shared`;
    const homePortalPromise=optional('home',()=>new PlayerHomePortalSystem(this.scene,{world:this.world,state:this.state,characterId:this.state.player.characterId,moveInKey:'dym.homeMovedIn.v1.shared',moveInEnabled:!devMode,onSpaceChanged:space=>this.wildlife?.setActive?.(space==='world')}).init());
    const stablePromise=optional('stable',()=>new NorthStableSystem(this.scene,{world:this.world,state:this.state,renderer:this.renderer,saveKey:shared('dym.thoraStable.v1')}).init());
    // Critical: the selected character. If its GLB fails, fall back to the procedural sprout so the game still starts.
    const characterPromise=this.registry.instantiateCharacter(this.state.player.characterId,{uTime:this.uTime}).catch(e=>{warn('LOAD',`character ${this.state.player.characterId} failed; using the fallback sprout`,e);this.failed.push('character');return this.registry.instantiateCharacter('sprout_alpha',{uTime:this.uTime});});
    // R55 staged loading: only home + character gate the first playable frame. Stable, garden
    // progression, Orangery and Fishing keep loading and attach themselves when ready.
    this.homePortal=await homePortalPromise;
    try{this.swapSpot=new CharacterSwapSpot(this);}catch(e){warn('SWAP','character swap spot disabled',e);}   // R138: switch character at home (fails soft)
    const instance=await characterPromise;mark('worldCriticalReadyMs');
    this.scene.add(instance.root);
    this.character=new CharacterController({instance,world:this.world,state:this.state});
    this.followCamera=new ThirdPersonCamera(this.camera,this.character,instance.definition.contract);this.followCamera.snap();this.homePortal?.prepareMoveInCamera?.(this.camera,this.character);

    // R36: Garden/progression systems are also independent at startup. Keep the
    // exact same ready gate, but overlap their asset I/O instead of serialising it.
    const collectiblePromise=optional('golden-seed',()=>new CollectibleSystem(this.world.privateRoot,{state:this.state,resourceCatalog,uTime:this.uTime}).init());
    const choicePromise=optional('seed-choice',()=>new MeaningfulChoiceSystem(this.world.privateRoot,{state:this.state}).init());
    // The old Lookout resource loop is retired: building now happens at the wilds workbench in this garden.
    const greenhousePromise=optional('greenhouse',()=>new GreenhouseProgressionSystem(this.world.privateRoot,{state:this.state,world:this.world,storageKey:shared('dym-gh-level')}).init());
    const orangeryPromise=optional('orangery',()=>new OrangeryHubSystem(this.scene,{state:this.state,world:this.world,uTime:this.uTime}).init());
    this.hud=new Hud(this.state);this.choicePanel=new ChoicePanel(this.state);
    this.input=new InputManager({joy:document.getElementById('joy'),knob:document.getElementById('joy-knob'),actionButton:document.getElementById('action')});
    // R112: players (no DEV menu) get the current HUD by device: touch = HUD D classic, desktop = HUD E. DEV keeps its own switch.
    if(!(devMode||devMenuEnabled())){document.body.classList.toggle('hud-classic',!!this.input.isTouch);document.body.classList.toggle('hud-desktop-e',!this.input.isTouch);}
    this.mapBlocking=false;this._mapViewDir=new THREE.Vector3();this.interactions=new InteractionResolver();
    try{this.worldMap=new WorldMap({   // R114: the map is optional, so its constructor fails soft too
      container:document.body,landscape:this.world.sharedLandscape,rotate:true,metresAcross:90,size:'auto',overlay:'auto',edgeSoftness:60,
      getPlayer:()=>{
        this.camera.getWorldDirection(this._mapViewDir);
        return {x:this.character.position.x,z:this.character.position.z,heading:this.character.heading,view:Math.atan2(this._mapViewDir.x,this._mapViewDir.z)};
      },
      onToggle:(open,overlay)=>{this.mapBlocking=!!(open&&!overlay);if(open)this.input.resetTouchPointers?.();}
    });this.worldMap?.mini?.classList.add('tgw-minimap');}catch(e){this.worldMap=null;this.failed.push('map');warn('MAP','map disabled',e);}   // R69a: styling hook only (no minimap logic touched)

    const fishingPromise=optional('fishing',()=>new FishingV1System(this.scene,{state:this.state,world:this.world,input:this.input,hud:this.hud,renderer:this.renderer,character:this.character}).init());
    if(this.worldMap)optional('map',()=>this.worldMap.ready);
    // Core loop v1 (shared world). DEV routes use a throwaway profile that is never written.
    this.save=new SaveGame({characterId:this.state.player.characterId,ephemeral:devMode});
    if(!devMode&&!devMenuEnabled())try{this.save.unlock(this.state.player.characterId);}catch{}   // R138: played = stays open (DEV play does not unlock)
    // R119 (GO 07/10): the first Golden Seed choice is saved per character and restored on load (no story replay).
    this.state.events.on('choice:resolved',e=>{if(e?.result==='plant'||e?.result==='donate'){this.save.profile.story={seed:e.result};this.save.persist();}});
    this.restoreSeedStory();
    // R60: placed structures (greenhouse, workshop, rain, shrine) come from the GardenBuildSystem.
    this.garden=new GardenBuildSystem({profile:this.save.profile,world:this.world});
    this.wilds=new WildsLoopSystem({world:this.world,state:this.state,save:this.save,hud:this.hud,greenhouse:null,garden:this.garden}).init();
    this.workbenchPanel=new WorkbenchPanel({wilds:this.wilds,state:this.state});
    try{this.combat=new CombatSystem(this);this.wilds.combat=this.combat;}catch(e){warn('COMBAT','combat disabled',e);this.failed.push('combat');}
    try{this.fx=new ImpactFx(this);}catch(e){warn('FX','impact FX disabled',e);}   // R129: hit-stop, telegraph, loot magnet, resource feedback (visual only) // R61 (fails soft); R62 snails hit through it
    // R60 step 2: build/move mode + vegetation under moved structures; every move re-places the systems.
    this.buildMode=new GardenBuildMode({game:this});this.workbenchPanel.onMove=id=>this.buildMode.start(id);
    if(!this.garden.isDefault('greenhouse'))this.world.setGreenhouseBranch?.(this.garden.currentBranch()); // R60.2 path follows a moved greenhouse
    this.vegetationMask=new GardenVegetationMask({world:this.world,garden:this.garden});this.vegetationMask.apply();
    this.garden.onChange(id=>{
      if(id==='greenhouse'&&this.greenhouse){const t=this.garden.transformOf('greenhouse');this.greenhouse.setPlacement(t.x,t.z,t.rot);}
      if(id==='greenhouse')this.world.setGreenhouseBranch?.(this.garden.isDefault('greenhouse')?null:this.garden.currentBranch());
      this.wilds.applyPlacements();this.vegetationMask.apply();this.save.persist();
    });
    this.wilds.onOpenWorkbench=()=>{this.workbenchPanel.show();this.input.resetTouchPointers?.();};
    const syncTools=()=>this.hud.setTools?.(this.wilds.profile.tools,this.wilds.profile.water);this.wilds.onChange(syncTools);syncTools();
    // R101: stable item IDs let the Bag and persistent 1..0 hotbar refer to the same carried gear.
    // R124: kind / desc / strike feed the phone Bag's detail card. desc = the game's own lines (Workbench effect, Sigurd's shop).
    const fx=id=>TOOLS.find(x=>x.id===id)?.effect||'',hit=id=>WEAPONS[id]?`Strike ${WEAPONS[id].dmg} · reach ${WEAPONS[id].reach} m`:'';
    this.hud.gearItems=()=>{const t=this.wilds?.profile?.tools||{},own=this.fishing?.own||{},out=[];
      if(t.axe)out.push({id:'axe',icon:'axe',hotbarIcon:'axe',name:'Stone Axe',kind:'Tool',desc:fx('axe'),strike:hit('axe')});
      if(t.pickaxe)out.push({id:'pickaxe',icon:'pickaxe',hotbarIcon:'pickaxe',name:'Stone Pickaxe',kind:'Tool',desc:fx('pickaxe'),strike:hit('pickaxe')});
      if(t.sickle)out.push({id:'sickle',icon:'sickle',hotbarIcon:'sickle',name:'Sickle',kind:'Tool',desc:fx('sickle'),strike:hit('sickle')});
      if(t.can)out.push({id:'can',icon:'drop',hotbarIcon:'watering-can',name:'Watering Can',n:`${this.wilds.profile.water||0} water`,count:this.wilds.profile.water||0,kind:'Tool',desc:fx('can')});
      if(own.rodBamboo||this.fishing?.starter)out.push({id:'rod',icon:'rod',hotbarIcon:'rod',name:'Bamboo Rod',kind:'Fishing',desc:'Beginner rod with a float. Perch and roach.'});
      if(own.vest)out.push({id:'vest',icon:'vest',name:'Life Vest',kind:'Wear',art:'./brand/icons/tool3d/icon-vest.png?v=R124',desc:'For trips out in the boat.',worn:!!this.vestWorn?.()});   // R111 icon on desktop; R124 3D render in the phone Bag
      if(this.lantern?.ready)out.push({id:'lantern',icon:'lantern',hotbarIcon:'lantern',name:'Lantern',n:'night',kind:'Night',desc:'The lantern only lights at night'});
      return out;};
    this.hud.hotbarItems=()=>this.hotbarItems();this.hud.hotbarSelected=()=>this.save.profile.hotbar?.selected??-1;this.hud.selectedGearId=()=>this.activeHotbarId();
    this.hud.onHotbarSelect=i=>this.equipHotbarSlot(i);this.hud.onHotbarMove=(a,b)=>this.moveHotbarSlot(a,b);this.hud.hotbarEnabled=()=>this.canUseHotbar();this.hud.hotbarEditable=()=>this.canEditHotbar();this.hud.onGearEquip=id=>this.equipGearItem(id);
    // R124 phone Bag actions
    this.hud.onGearPutAway=()=>{const hb=this.syncHotbarLayout();hb.selected=-1;this.save.persist();this.syncHotbarEquipment();this.hud.renderDesktopHotbar?.();};
    this.hud.onBagPlace=(id,q)=>{const hb=this.syncHotbarLayout(),from=hb.slots.indexOf(id);if(from===q)return;if(from<0){hb.slots[q]=id;this.save.persist();this.refreshHotbar(true);}else this.moveHotbarSlot(from,q);};
    this.hud.onLanternToggle=()=>this.lantern?.toggle?.();
    // R125: wear / take off the Life Vest (saved per character; needed to board the boat)
    this.hud.onVestToggle=()=>{if(!this.fishing?.own?.vest)return;const w=this.save.profile.wear||(this.save.profile.wear={vest:false});w.vest=!w.vest;this.save.persist();
      this.vest?.set(w.vest);this.hud.showToast?.(w.vest?'Life Vest on':'Life Vest off');};
    this.hud.onGearOpenChange=open=>{
      if(!this.input?.isTouch)return;
      if(open){
        this.input.resetTouchPointers?.();
        this.input.actionPressed=false;this.input.hopPressed=false;this.input.strikePressed=false;
        this.input.frameMove={x:0,y:0};this.input.moveMagnitude=0;this.input.runIntent=false;
      }
    };
    this.equippedToolVisual=new EquippedToolVisual(this);this.refreshHotbar(true);
    if(devMode||devMenuEnabled()){this.perfHud=new PerfHud(this);this.devMenu=new DevMenu(this);window.__tgw=this;}
    else applyControlProfile(this,defaultProfile()); // R50.3: free camera everywhere (mouse-look on desktop)
    mark('wildsReadyMs');
    this.cameraOcclusion=new CameraOcclusionSystem({world:this.world,homePortal:this.homePortal,greenhouse:this.greenhouse,orangery:this.orangery,stable:this.stable});
    this.followCamera.setOcclusionSystem(this.cameraOcclusion);
    this.cameraOcclusion.setFreeRules(this.followCamera.profileId==='free'); // profile was applied before occlusion existed
    this.structureVisibility=new StructureVisibilitySystem({world:this.world,greenhouse:this.greenhouse,orangery:this.orangery,stable:this.stable,cameraOcclusion:this.cameraOcclusion});
    this.clock=new THREE.Clock();this.time=0;this.lastMoved=false;
    addEventListener('resize',()=>this.resize());visualViewport?.addEventListener('resize',()=>this.resize());addEventListener('orientationchange',()=>setTimeout(()=>this.resize(),250));this.resize();this.homePortal?.prepareMoveInCamera?.(this.camera,this.character);this.renderer.setAnimationLoop(()=>this.frame());
    this.quality=new QualityManager(this,this.input.isTouch);
    // R55 lifecycle contract: hidden page → stop rendering + flush save; visible again → resume
    // without a delta-time jump (timestamp-based systems catch up on their own).
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){this.renderer.setAnimationLoop(null);this.save?.flush?.();log('LIFE','paused (hidden)');}
      else this.syncRun('visible');
    });
    // R67 landscape-only on phones (Jannik 03/10): iOS cannot lock orientation for a home-screen app, so in
    // portrait a 'turn your phone' screen covers the game and the loop pauses (same contract as a hidden page).
    this.setupRotateGate();
    this.hud.ready();mark('firstPlayableMs');
    try{this.tips=new ControlTips(this);}catch(e){warn('TIPS','control tips disabled',e);}
    try{this.menu=new GameMenu(this);}catch(e){warn('MENU','game menu disabled',e);}
    try{this.specialHold=new SpecialHold(this);}catch(e){warn('SPECIAL','hold-to-use disabled',e);}   // R126 phones
    try{this.vest=new VestVisual(this);if(this.vestWorn())this.vest.set(true);}catch(e){warn('VEST','vest visual disabled',e);}   // R125   // R121 in-game menu (fail soft)
    if(!devMode)try{const id=this.state.player.characterId;localStorage.setItem('tgw.lastChar',JSON.stringify({id,name:characterCatalog[id]?.displayName||id}));}catch{}   // R121 Continue   // R120 first-time control tips (fail soft)
    // Attach background systems as they arrive (each is optional; null when it failed).
    const attach=(promise,fn)=>promise.then(v=>{if(v)fn(v);return v;});
    const background=Promise.all([
      attach(stablePromise,s=>{this.stable=s;this.world.stableCollisionResolver=(p,r)=>s.resolveCollisions(p,r);s.bindRuntime({character:this.character,renderer:this.renderer});s.bindRuntime({input:this.input,hud:this.hud,followCamera:this.followCamera});this.cameraOcclusion.stable=s;this.structureVisibility.stable=s;}),
      attach(collectiblePromise,c=>{this.collectible=c;this.restoreSeedStory();}),
      attach(choicePromise,c=>{this.choiceWorld=c;this.restoreSeedStory();}),
      attach(greenhousePromise,g=>{const gt=this.garden.transformOf('greenhouse');g.setPlacement(gt.x,gt.z,gt.rot);this.greenhouse=g;this.wilds.setGreenhouse(g);this.cameraOcclusion.greenhouse=g;this.structureVisibility.greenhouse=g;}),
      attach(orangeryPromise,o=>{this.orangery=o;this.cameraOcclusion.orangery=o;this.structureVisibility.orangery=o;}),
      attach(fishingPromise,f=>{this.fishing=f;if(this.vestWorn())this.vest?.set(true);this.refreshHotbar?.(true);try{this.boatEco=new BoatEconomySystem({fishing:f,wilds:this.wilds,hud:this.hud}).init();}catch(e){warn('BOAT','economy disabled',e);this.failed.push('boat');}try{this.lakeRun=new LakeRunSystem(this,f);}catch(e){warn('LAKERUN','lake run disabled',e);this.failed.push('lakerun');}})
    ]).then(()=>{mark('allSystemsReadyMs');this.vegetationMask?.apply();log('LOAD','background systems ready',this.startupMetrics);if(this.failed.length)this.hud.showToast?.(`Some parts could not load: ${this.failed.join(', ')}`);});
    // DEV routes spawn straight into the Stable/Orangery/Fishing, so they wait for everything as before.
    if(devMode)await background;
    if(this.homePortal?.moveInPending)this.homePortal.beginMoveIn(this.character,this.followCamera,this.camera,this.hud);
    mark('gameReadyMs');
    const resources=performance.getEntriesByType?.('resource')||[];
    this.startupMetrics.resources=resources.filter(r=>/\.(glb|gltf)(\?|$)/i.test(r.name)).map(r=>({name:r.name.split('/').pop(),durationMs:Math.round(r.duration*10)/10,transferSize:r.transferSize||0,decodedBodySize:r.decodedBodySize||0})).sort((a,b)=>b.durationMs-a.durationMs).slice(0,24);
    window.__TGW_STARTUP_METRICS__=this.startupMetrics;log('LOAD','game ready',this.startupMetrics);
    if(new URLSearchParams(location.search).get('perf')==='1')console.table(this.startupMetrics.resources),console.info('[TGW startup]',this.startupMetrics);
    setTimeout(()=>{if(!this.input.moved&&!this.homePortal?.usesMoveInCamera?.())this.hud.hint.style.opacity='0';},9000);
  }

  // R101 desktop hotbar: saved slot order is independent of Bag order.
  hotbarProfile(){
    const p=this.save.profile;return p.hotbar||(p.hotbar={slots:Array(10).fill(null),selected:-1});
  }
  syncHotbarLayout(items=this.hud.gearItems?.()||[]){
    const hb=this.hotbarProfile(),slots=Array.isArray(hb.slots)?hb.slots.slice(0,10):[];while(slots.length<10)slots.push(null);
    const known=new Set(['axe','pickaxe','sickle','can','rod','vest','lantern']),seen=new Set();
    for(let i=0;i<10;i++){const id=slots[i];if(!known.has(id)||seen.has(id))slots[i]=null;else if(id)seen.add(id);}
    // Preserve known saved IDs even while an optional system is still loading. Only truly new carried items fill empty slots.
    for(const it of items){if(!it?.id||seen.has(it.id))continue;const n=slots.indexOf(null);if(n<0)break;slots[n]=it.id;seen.add(it.id);}
    // R123 (phones): only 3 slots show; the vest is worn and the lantern has its own night button, so neither takes one of them.
    if(this.input?.isTouch)for(let i=0;i<3;i++)if(slots[i]==='vest'||slots[i]==='lantern'){const j=slots.indexOf(null,3);if(j<0)break;slots[j]=slots[i];slots[i]=null;if(hb.selected===i)hb.selected=-1;}
    hb.slots=slots;if(!Number.isInteger(hb.selected)||hb.selected<0||hb.selected>9)hb.selected=-1;return hb;
  }
  hotbarItems(){
    const items=this.hud.gearItems?.()||[],byId=new Map(items.map(it=>[it.id,it])),hb=this.syncHotbarLayout(items);
    return hb.slots.map(id=>id?byId.get(id)||null:null);
  }
  activeHotbarItem(){
    const hb=this.hotbarProfile(),i=hb.selected;if(!Number.isInteger(i)||i<0||i>9)return null;
    return this.hotbarItems()[i]||null;
  }
  activeHotbarId(){return this.activeHotbarItem()?.id||null;}
  vestWorn(){return !!(this.save?.profile?.wear?.vest&&this.fishing?.own?.vest);}
  canChangeEquippedGear(){
    return !this.state.choice.open&&!this.homePortal?.busy&&!this.fishing?.isBusy?.()&&!this.stable?.isBusy?.()
      &&!this.workbenchPanel?.open&&!this.buildMode?.active&&!this.worldMap?.isOpen;
  }
  canUseHotbar(){
    return !this.input?.isTouch&&document.body.classList.contains('hud-desktop-e')&&this.canChangeEquippedGear();
  }
  canEditHotbar(){
    const desktop=!this.input?.isTouch&&document.body.classList.contains('hud-desktop-e');
    const mobileTouch=!!this.input?.isTouch&&document.body.classList.contains('hud-classic');
    return (desktop||mobileTouch)&&this.canChangeEquippedGear();
  }
  equipHotbarSlot(i){
    if(!this.canEditHotbar()||!Number.isInteger(i)||i<0||i>9)return false;
    const hb=this.syncHotbarLayout(),was=hb.selected;hb.selected=i;this.save.persist();this.syncHotbarEquipment();this.hud.renderDesktopHotbar?.();
    this.phoneLanternTap(hb.slots[i],was===i);return true;
  }
  // R110 (phones, HUD D): the lantern quick slot replaces the separate lantern button. Choosing it at night lights it;
  // tapping it again puts the light away. By day it only says when it works. Desktop keeps L + its own slot logic.
  phoneLanternTap(id,again){
    if(id!=='lantern'||!this.input?.isTouch||!document.body.classList.contains('hud-classic')||!this.lantern?.ready)return;
    if(!this.lantern.available()){if(again)this.hud.showToast?.('The lantern only lights at night');return;}
    if(again||!this.lantern.on)this.lantern.toggle();
  }
  equipGearItem(id){
    // R104: Bag selection is the touch equivalent of pressing a desktop quick-slot key.
    // It selects the same saved slot and therefore uses the exact same held-tool/combat state.
    if(!this.canChangeEquippedGear()||!id||id==='vest')return false;
    const hb=this.syncHotbarLayout(),i=hb.slots.indexOf(id);if(i<0)return false;
    const was=hb.selected;hb.selected=i;this.save.persist();this.syncHotbarEquipment();this.hud.renderDesktopHotbar?.();this.phoneLanternTap(id,was===i);
    if(this.hud.gear?.classList.contains('open'))this.hud.renderGear?.();return true;
  }
  moveHotbarSlot(from,to){
    if(!this.canEditHotbar()||![from,to].every(i=>Number.isInteger(i)&&i>=0&&i<10)||from===to)return false;
    const hb=this.syncHotbarLayout(),tmp=hb.slots[from];hb.slots[from]=hb.slots[to];hb.slots[to]=tmp;
    if(hb.selected===from)hb.selected=to;else if(hb.selected===to)hb.selected=from;
    this.save.persist();this.refreshHotbar(true);return true;
  }
  // R123 (phones): gathering puts the right owned tool in the hand for a moment, like Stardew; then the slot choice returns.
  autoTool(it){
    if(!this.input?.isTouch||!it?.type)return;const w=this.wilds;let id=null;
    if(it.type==='wilds-gather'){const d=it.node?.def||{};id=d.requires||d.tool||null;}
    else if(it.type==='wilds-cut')id='sickle';
    else if(it.type==='wilds-weed')id='sickle';
    if(!id||!w?.has?.(id))return;
    this._autoToolUntil=performance.now()+1800;this.equippedToolVisual?.set(id);
  }
  syncHotbarEquipment(){
    const id=this.activeHotbarId();if(!(this._autoToolUntil>performance.now()))this.equippedToolVisual?.set(id==='lantern'||id==='vest'?null:id);
    this.lantern?.setEquipped?.(id==='lantern');
  }
  refreshHotbar(force=false){
    const items=this.hud.gearItems?.()||[],sig=items.map(x=>x.id).join('|');this.syncHotbarLayout(items);
    if(force||sig!==this._hotbarGearSig){this._hotbarGearSig=sig;this.hud.renderDesktopHotbar?.();if(this.hud.gear?.classList.contains('open'))this.hud.renderGear?.();}
    this.syncHotbarEquipment();
  }

  isPhone(){return !!this.input?.isTouch&&Math.min(screen.width||innerWidth,screen.height||innerHeight)<600;}
  setupRotateGate(){
    const el=document.createElement('div');el.id='rotate-gate';el.setAttribute('role','alert');
    // R67.1 Growing Wilds style: sun burst + logo, a clay-style phone with a sprout that tips over, drifting leaves.
    el.innerHTML='<div class="rg-burst"></div><div class="rg-leaves">'+'<i></i>'.repeat(7)+'</div>'
      +'<img class="rg-logo" src="./brand/logo/logo-growing-wilds-620w.png" alt="The Growing Wilds">'
      +'<div class="rg-stage"><svg class="rg-arrow" viewBox="0 0 120 120" aria-hidden="true"><path d="M30 96 A46 46 0 0 1 24 40" fill="none" stroke="#fff1b8" stroke-width="7" stroke-linecap="round"/><path d="M10 46 L24 30 L36 50 Z" fill="#fff1b8"/></svg>'
      +'<div class="rg-phone"><div class="rg-screen"><span class="rg-sprout"><s></s><s></s></span></div><i></i></div></div>'
      +'<b class="rg-title">Turn your phone</b><span class="rg-copy">The wilds grow sideways. Rotate to keep playing.</span>';
    document.body.appendChild(el);this.rotateGate=el;
    if(this.isPhone())screen.orientation?.lock?.('landscape').catch(()=>{});   // Android (installed/fullscreen) can lock; iOS cannot
    const check=()=>{const g=this.isPhone()&&innerHeight>innerWidth;if(g!==this.gated){this.gated=g;document.body.classList.toggle('rotate-gated',g);if(g){this.save?.flush?.();this.input?.resetTouchPointers?.();}this.syncRun(g?'portrait':'landscape');}};
    addEventListener('resize',check);addEventListener('orientationchange',()=>setTimeout(check,250));visualViewport?.addEventListener('resize',check);check();
  }
  // One place decides whether the frame loop runs: page visible and not gated by portrait.
  syncRun(why){
    if(document.hidden||this.gated){this.renderer.setAnimationLoop(null);log('LIFE',`paused (${why})`);return;}
    this.clock.getDelta();this.resize();this.renderer.setAnimationLoop(()=>this.frame());log('LIFE',`resumed (${why})`);
  }
  // R66: size from the fixed #app box and let CSS stretch the canvas (inset:0), not window.innerHeight px: iOS home-screen
  // apps can report a shorter innerHeight than the screen, which left a strip under the canvas.
  viewSize(){const a=document.getElementById('app'),r=a?.getBoundingClientRect();const w=Math.round(r?.width||innerWidth),h=Math.round(Math.max(r?.height||0,innerHeight,visualViewport?.height||0));return{w,h};}
  resize(){if(this.quality)this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,QUALITY[this.quality.id].dpr));const{w,h}=this.viewSize();this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.fov=this.camera.aspect<.8?58:48;this.camera.updateProjectionMatrix();}
  restoreSeedStory(){
    const r=this.save?.profile?.story?.seed,s=this.state;if(r!=='plant'&&r!=='donate')return;
    if(!s.choice.resolved){s.choice.open=false;s.choice.resolved=true;s.choice.result=r;s.objective={id:'first_meaningful_choice',stage:'complete',complete:true};
      if(r==='donate')s.worldProject.contributed=Math.max(1,s.worldProject.contributed);}
    if(this.collectible&&!this._seedRestored){this._seedRestored=1;this.collectible.restoreCollected?.();}
    if(this.choiceWorld&&!this._choiceRestored){this._choiceRestored=1;if(r==='plant'){this.choiceWorld.restorePlanted?.();s.personal.rareSpecimenPlanted=true;}else s.events.emit('world-project:changed',{...s.worldProject});}
  }
  // R114: optional systems fail soft per frame too. A system that throws is switched off (warned once) and the loop keeps running.
  run(id,fn){if(this._off?.[id])return undefined;try{return fn();}catch(e){(this._off||(this._off={}))[id]=1;this.failed?.push?.(id);warn('FRAME',`${id} disabled after a frame error`,e);return undefined;}}
  frame(){
    try{this.frameStep();}catch(e){if(!this._frameWarned){this._frameWarned=1;warn('FRAME','frame step failed; rendering continues',e);}}
    this.renderer.render(this.scene,this.camera);
    this.perfHud?.tick();
  }
  frameStep(){
    const rawDt=this.clock.getDelta();this.quality?.sample(rawDt);const dt=Math.min(rawDt,1/20)*(this.run('fxstop',()=>this.fx?.timeScale(rawDt))??1);   /* R129 hit-stop */this.time+=dt;this.uTime.value=this.time;this.input.update();
    if(this.input.moved&&!this.lastMoved){this.lastMoved=true;this.hud.markMoved();}

    const gardenSpace=this.world.isGardenSpace();
    if(!this.look)try{this.look=new LookPass(this);}catch(e){this.look={update(){}};warn('LOOK','look pass disabled',e);}
    this.run('look',()=>this.look.update(gardenSpace));   // R70: shared-world grade on, private garden (greenhouse) untouched
    if(!this.dayNight)try{this.dayNight=new DayNight(this);}catch(e){this.dayNight={update(){},isNight:()=>false};warn('DAYNIGHT','day/night disabled',e);}
    this.run('daynight',()=>this.dayNight.update(gardenSpace));   // R81: 30 min day/night on the shared world only (after the look pass)
    this.hud.setWorldStatus?.(gardenSpace,this.dayNight.isNight?.());   // R88 desktop HUD E status; hidden outside E
    if(!this.lantern&&this.character?.instance)try{this.lantern=new Lantern(this);}catch(e){this.lantern={update(){}};warn('LANTERN','lantern disabled',e);}
    this.run('hotbar',()=>this.refreshHotbar?.());if(!this._vestChecked&&this.boatEco){this._vestChecked=1;if(this.vestWorn())this.vest?.set(true);}   /* R124: the vest's 'own' flag is restored by the boat economy */this.run('lantern',()=>this.lantern?.update(dt));this.run('specialhold',()=>this.specialHold?.update());this.run('toolvisual',()=>this.equippedToolVisual?.update(dt));
    const portalBusy=this.homePortal?.busy||false;
    const fishingBusy=!gardenSpace&&(this.fishing?.isBusy?.()||false);
    const stableBusy=!gardenSpace&&(this.stable?.isBusy?.()||false);
    const specialBusy=fishingBusy||stableBusy;
    const wildsPanel=(this.workbenchPanel?.open||this.devMenu?.open||this.menu?.open)||false;   // R121: the menu blocks movement and actions too
    const building=!!this.buildMode?.active;
    const mapOpen=this.worldMap?.isOpen||false,mapOverlay=mapOpen&&(this.worldMap?.overlayMode||false);
    const touchLook=this.input.isTouch?this.input.consumeLook?.():null;
    // R58.1: in the boat the free camera still takes swipes (a short look-around; it glides back behind the boat).
    const boatLook=!gardenSpace&&this.fishing?.mode==='boat'&&this.followCamera.profileId==='free';
    if(!this.state.choice.open&&(!specialBusy||boatLook)&&!portalBusy&&!mapOpen&&!wildsPanel)this.followCamera.applyTouchLook?.(touchLook);
    if(!this.state.choice.open&&!specialBusy&&!portalBusy&&!this.mapBlocking&&!wildsPanel){this.character.update(dt,this.time,this.input,this.followCamera);}else if(!(stableBusy&&this.stable?.usesMovementInput?.())){this.input.consumeHop?.();}
    // Evaluate the Stable tunnel after character movement so Claude's drive-through
    // camera owns the very first frame that crosses the tunnel boundary.
    const stableTunnelCamera=!gardenSpace&&(this.stable?.usesTunnelCamera?.(this.character?.position)||false);
    const stableCameraOwner=stableBusy||stableTunnelCamera;
    const homeCameraOwner=this.homePortal?.usesMoveInCamera?.()||false;
    const specialCameraBusy=specialBusy||stableTunnelCamera||homeCameraOwner;
    this.followCamera.setOcclusionEnabled(!specialCameraBusy);
    // R23K: tunnel camera remains LOCKED from R23J; Stable still owns it completely in the tunnel and Stable-owned modes.
    // Do not run ThirdPersonCamera first and then fight its result afterwards.
    if(!stableCameraOwner&&!homeCameraOwner)this.followCamera.update(dt);
    this.run('giantcam',()=>this.combat?.boss?.applyCamera(this.camera,this.character));
    this.run('bearcam',()=>this.combat?.bear?.applyCamera?.(this.camera,this.character)); // R79 Root Bear: same low boss camera, kept inside the grove's open core
    const shk=Math.max(gardenSpace?0:Math.max(this.combat?.boss?.shake||0,this.combat?.bear?.shake||0),this.fx?.shakeNow||0);   /* R129: strike shake on top */ if(shk>0){const a=.22*shk;this.camera.position.x+=(Math.random()-.5)*a;this.camera.position.y+=(Math.random()-.5)*a;} // R63 boss impact
    this.homePortal?.update(dt);this.world.update?.(dt,this.time,this.character.position);

    if(gardenSpace){
      this.choiceWorld?.update(dt,this.time);
    }else{
      this.run('wildlife',()=>this.wildlife?.update(dt,this.time,this.character.position));this.run('orangery',()=>this.orangery?.update(dt,this.time,this.character.position));this.run('stable',()=>this.stable?.update(dt,this.time,this.character.position,this.camera,this.renderer));this.run('fishing',()=>this.fishing?.update(dt,this.time,this.character));this.run('boat',()=>this.boatEco?.update());this.run('lakerun',()=>this.lakeRun?.update(dt));if(stableBusy)this.stable?.syncPlayerVisibility?.();
    }

    let seed={near:false},greenhouse={interaction:null};
    if(gardenSpace){
      seed=this.collectible?.update(dt,this.time,this.character)||seed;
      greenhouse=this.greenhouse?.update(dt,this.time,this.character)||greenhouse;
      this.greenhouse?.applyCamera(this.camera,this.followCamera);
    }

    // R56: every system offers candidates; the resolver picks the single active interaction.
    const R=this.interactions;R.begin();
    if(!this.state.choice.open&&!portalBusy&&!wildsPanel){
      if(gardenSpace){
        // Build mode: the garden keeps living, but nothing else can be used until Place/Cancel.
        const gi=this.wilds?.update(dt,this.time,this.character,'garden').interaction;if(!building)R.offer('wilds',gi);
        if(seed.near&&!building)R.offer('first-seed',{type:'first-seed',label:'Collect Golden Seed'});
        if(!building)R.offer('greenhouse',greenhouse.interaction);
        if(!building&&!specialBusy)R.offer('home',this.swapSpot?.interaction?.(this.character.position));   // R138: gold SWITCH circle by the shed
      }
      if(!gardenSpace&&!specialBusy)R.offer('wilds',this.wilds?.update(dt,this.time,this.character,'world').interaction);
      R.offer('combat',this.run('combat',()=>this.combat?.update(dt,this.time,this.character,!specialBusy&&!portalBusy&&!building))?.interaction);
      if(!specialBusy&&!building)R.offer('home',this.homePortal?.interaction?.(this.character.position));
      if(!gardenSpace){
        // Boat mode keeps the controller paused while still exposing FishingV1-owned E interactions.
        R.offer('stable',this.stable?.interaction?.(this.character.position));
        {let li=this.lakeRun?.interaction();if(li?.type==='lakerun-start'&&!li.disabled&&!this.vestWorn())li={...li,disabled:true,reason:'Wear your Life Vest first (Bag)'};R.offer('lakerun',li);}   // R125
        if(!this.lakeRun?.busy()){let fi=this.fishing?.interaction?.(this.character.position);
          // R125: boarding the boat needs the Life Vest on (Bag → Wear)
          if(fi?.type==='boat-board'&&!fi.disabled&&!this.vestWorn())fi={...fi,disabled:true,reason:this.fishing?.own?.vest?'Wear your Life Vest first (Bag)':'You need a Life Vest'};
          R.offer(fi?.type==='fishing-shore'?'shorefish':'fishing',fi);} // R64: no Fish/Dock mid-race; R71 shore Fish yields to everything
      }
    }
    const interaction=R.resolve();
    this.run('tips',()=>this.tips?.update(dt,this.state.choice.open||portalBusy||specialBusy||building||wildsPanel||mapOpen||!!this.lakeRun?.busy?.()||homeCameraOwner||document.body.classList.contains('rotate-gated')));
    if(building)this.buildMode.update(dt,this.character);
    // R58 objective director (1 Hz): show the wilds progression step unless the first Golden Seed
    // story (private garden, until the plant/donate choice) owns the card.
    const nowMs=performance.now();
    if(this.wilds&&nowMs-(this._objAt||0)>1000){this._objAt=nowMs;if(!(gardenSpace&&!this.state.choice.resolved))this.hud.setObjective?.('NEXT STEP',this.wilds.goal());}
    const mainIdle=this.input.isTouch&&!this.state.choice.open&&!specialBusy&&!portalBusy&&!building&&!wildsPanel&&!this.lakeRun?.busy?.()&&!this.mapBlocking; // R75: persistent main button on phones
    this.hud.setActionVisible(!!interaction,interaction?.label||'Collect',interaction,mainIdle);this.hud.action.classList.toggle('locked',!!interaction?.locked);this.hud.action.classList.toggle('wilds-locked',!!(interaction?.disabled&&!interaction?.locked)); // R72: requirement missing = grey 'Locked'; other disabled states (growing) keep their text
    const action=this.input.consumeAction(),click=this.input.consumeStrike?.();
    // R76 desktop: left click on the game view always strikes (never interacts); E interacts.
    if(click&&!this.input.isTouch&&!this.state.choice.open&&!specialBusy&&!portalBusy&&!building&&!wildsPanel&&!this.mapBlocking&&!this.lakeRun?.busy?.())this.combat?.attack?.();
    // R116: pressing a Locked / unavailable action says why instead of doing nothing (once per 1.5 s).
    if(!this.state.choice.open&&action&&interaction?.disabled&&nowMs-(this._whyAt||0)>1500){this._whyAt=nowMs;this.hud.showToast?.(interaction.reason||(interaction.locked?'Not unlocked yet':interaction.label));}
    if(!this.state.choice.open&&action&&interaction&&!interaction.disabled){
      if(interaction.type==='home-swap')this.swapSpot?.interact();   // R138
      else if(interaction.type==='home-enter'||interaction.type==='home-exit')this.homePortal?.interact(interaction.type,this.character,this.followCamera,this.hud);
      else if(interaction.type==='first-seed')this.collectible?.collect(this.character);
      else if(interaction.type==='greenhouse')this.greenhouse?.interact(this.character);
      else if(interaction.type?.startsWith?.('stable-'))this.stable?.interact(interaction);
      else if(interaction.type?.startsWith?.('wilds-')){this.autoTool(interaction);const ok=this.wilds.interact(interaction,this.character);if(ok&&interaction.type==='wilds-snail')this.run('fxhit',()=>this.fx?.hit({kind:'snail',m:interaction.snail,x:interaction.snail.x,z:interaction.snail.z}));}
      else if(interaction.type?.startsWith?.('combat-'))this.combat?.interact(interaction.type);
      else if(interaction.type?.startsWith?.('lakerun-'))this.lakeRun?.interact(interaction.type);
      else if(['fish-board','fishing-shop','fishing-spot','fishing-shore','boat-board','boat-fish','boat-dock'].includes(interaction.type))this.fishing?.interact(interaction.type);
    } else if(mainIdle&&!this.state.choice.open&&action&&!interaction&&!specialBusy&&!portalBusy&&!building&&!wildsPanel){
      // R73.1 DEV HUD test: the persistent action button swings in empty space; contextual interactions still take priority.
      this.combat?.attack?.();
    }

    // Fishing owns camera only in the shared world. The private garden keeps the
    // locked third-person/greenhouse camera behavior completely separate.
    if(homeCameraOwner)this.homePortal?.applyMoveInCamera?.(this.camera,this.followCamera,dt);
    else if(!gardenSpace){this.fishing?.applyCamera(this.camera,this.followCamera,dt);this.stable?.applyCamera(this.camera,this.followCamera,dt);}
    // Normal traversal gets a consistent cutaway fallback only when a roofed structure
    // leaves too little room for third-person framing. Fishing-owned special cameras
    // remain visually locked and therefore restore all structure materials.
    this.run('swapspot',()=>this.swapSpot?.update(this.time,dt));   // R138
    this.run('impactfx',()=>this.fx?.update(dt));   // R129: after combat set the boss telegraphs this frame
    this.run('structures',()=>this.structureVisibility?.update(dt,{enabled:!specialCameraBusy}));
    const mapVisible=!gardenSpace&&!portalBusy&&!specialBusy&&!this.state.choice.open;
    this.run('map',()=>{this.worldMap?.setVisible?.(mapVisible);
    this.worldMap?.setMarkers?.(gardenSpace?[]:(this.wilds?.mapMarkers?.()||[]));
    this.worldMap?.update?.();});
  }
}
