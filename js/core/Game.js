// @ts-nocheck
import * as THREE from 'three';
import { AssetRegistry } from './AssetRegistry.js';
import { CharacterController } from './CharacterController.js?build=MOBILE-GESTURE-R34B-20260930A';
import { GameState } from './GameState.js';
import { InputManager } from './InputManager.js?build=TECH-STARTUP-R36-20260930A';
import { ThirdPersonCamera } from './ThirdPersonCamera.js?build=MOBILE-GESTURE-R34B-20260930A';
import { CameraOcclusionSystem } from './CameraOcclusionSystem.js?build=NORTH-STABLE-R23O-20260929A';
import { StructureVisibilitySystem } from '../visual/StructureVisibilitySystem.js?build=NORTH-STABLE-R23O-20260929A';
import { characterCatalog, resourceCatalog, buildingCatalog } from '../data/assetCatalog.js';
import { CollectibleSystem } from '../gameplay/CollectibleSystem.js';
import { MeaningfulChoiceSystem } from '../gameplay/MeaningfulChoiceSystem.js';
import { GreenhouseProgressionSystem } from '../gameplay/GreenhouseProgressionSystem.js?build=CAMERA-CUTAWAY-CONTEXT-R21D-20260928E';
import { OrangeryHubSystem } from '../gameplay/OrangeryHubSystem.js?build=CAMERA-CUTAWAY-CONTEXT-R21D-20260928E';
import { FishingV1System } from '../gameplay/FishingV1System.js?build=DEV-CLEAN-R16-SLIM-ASSETS-HUB-20260928A';
import { ChoicePanel } from '../ui/ChoicePanel.js';
import { Hud } from '../ui/Hud.js';
import { WorldMap } from '../ui/WorldMap.js?build=WORLD-MAP-R35B-20260930B';
import { GardenEnvironment } from '../world/GardenEnvironment.js?build=CAMERA-CUTAWAY-CONTEXT-R21D-20260928E';
import { WildlifeSystem } from '../world/WildlifeSystem.js?build=CAMERA-CUTAWAY-CONTEXT-R21D-20260928E';
import { PlayerHomePortalSystem } from '../world/PlayerHomePortalSystem.js?build=ENTRY-R29-20260929A';
import { NorthStableSystem } from '../world/NorthStableSystem.js?build=STABLE-R42-20261001A';
import { SaveGame } from './SaveGame.js';
import { WildsLoopSystem } from '../gameplay/WildsLoopSystem.js';
import { WorkbenchPanel } from '../ui/WorkbenchPanel.js';

export class Game {
  async init({characterId='succulent',devMode=false}={}){
    this.state=new GameState();this.state.player.characterId=characterId;this.registry=new AssetRegistry(characterCatalog);this.uTime={value:0};
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.02;
    this.renderer.setClearColor(0xdde5d3,1);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    document.getElementById('app').appendChild(this.renderer.domElement);
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xdde5d3);this.camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,400);
    const startupT0=performance.now();
    this.startupMetrics={build:'TECH-STARTUP-R36-20260930A',characterId:this.state.player.characterId};
    const mark=(name)=>{this.startupMetrics[name]=Math.round((performance.now()-startupT0)*10)/10;};

    this.world=new GardenEnvironment(this.scene,{uTime:this.uTime,renderer:this.renderer});mark('worldConstructedMs');

    // R36: World-critical GLBs are independent. Start them together instead of
    // serially waiting shed -> stable -> character. Gameplay still starts only
    // after every member of this wave is fully ready.
    const homePortalPromise=new PlayerHomePortalSystem(this.scene,{world:this.world,state:this.state,characterId:this.state.player.characterId,moveInEnabled:!devMode,onSpaceChanged:space=>this.wildlife?.setActive?.(space==='world')}).init();
    this.wildlife=new WildlifeSystem(this.scene,{world:this.world,isTouch:this.world.isTouch});this.wildlife.init();
    const stablePromise=new NorthStableSystem(this.scene,{world:this.world,state:this.state,renderer:this.renderer}).init();
    const characterPromise=this.registry.instantiateCharacter(this.state.player.characterId,{uTime:this.uTime});
    [this.homePortal,this.stable]=await Promise.all([homePortalPromise,stablePromise]);
    const instance=await characterPromise;mark('worldCriticalReadyMs');
    this.world.stableCollisionResolver=(p,r)=>this.stable.resolveCollisions(p,r);
    this.scene.add(instance.root);
    this.character=new CharacterController({instance,world:this.world,state:this.state});this.stable.bindRuntime({character:this.character,renderer:this.renderer});
    this.followCamera=new ThirdPersonCamera(this.camera,this.character,instance.definition.contract);this.followCamera.snap();this.homePortal.prepareMoveInCamera?.(this.camera,this.character);

    // R36: Garden/progression systems are also independent at startup. Keep the
    // exact same ready gate, but overlap their asset I/O instead of serialising it.
    const collectiblePromise=new CollectibleSystem(this.world.privateRoot,{state:this.state,resourceCatalog,uTime:this.uTime}).init();
    const choicePromise=new MeaningfulChoiceSystem(this.world.privateRoot,{state:this.state}).init();
    // The old Lookout resource loop is retired: building now happens at the wilds workbench in this garden.
    const greenhousePromise=new GreenhouseProgressionSystem(this.world.privateRoot,{state:this.state,world:this.world}).init();
    const orangeryPromise=new OrangeryHubSystem(this.scene,{state:this.state,world:this.world,uTime:this.uTime}).init();
    [this.collectible,this.choiceWorld,this.greenhouse,this.orangery]=await Promise.all([collectiblePromise,choicePromise,greenhousePromise,orangeryPromise]);mark('progressionSystemsReadyMs');
    this.hud=new Hud(this.state);this.choicePanel=new ChoicePanel(this.state);
    this.input=new InputManager({joy:document.getElementById('joy'),knob:document.getElementById('joy-knob'),actionButton:document.getElementById('action')});
    this.mapBlocking=false;this._mapViewDir=new THREE.Vector3();
    this.worldMap=new WorldMap({
      container:document.body,landscape:this.world.sharedLandscape,rotate:true,metresAcross:90,size:'auto',overlay:'auto',edgeSoftness:60,
      getPlayer:()=>{
        this.camera.getWorldDirection(this._mapViewDir);
        return {x:this.character.position.x,z:this.character.position.z,heading:this.character.heading,view:Math.atan2(this._mapViewDir.x,this._mapViewDir.z)};
      },
      onToggle:(open,overlay)=>{this.mapBlocking=!!(open&&!overlay);if(open)this.input.resetTouchPointers?.();}
    });
    this.stable.bindRuntime({input:this.input,hud:this.hud,followCamera:this.followCamera});
    const fishingPromise=new FishingV1System(this.scene,{state:this.state,world:this.world,input:this.input,hud:this.hud,renderer:this.renderer,character:this.character}).init();
    [this.fishing]=await Promise.all([fishingPromise,this.worldMap.ready]).then(([fishing])=>[fishing]);mark('uiAndFishingReadyMs');
    // Core loop v1 (shared world). DEV routes use a throwaway profile that is never written.
    this.save=new SaveGame({characterId:this.state.player.characterId,ephemeral:devMode});
    this.wilds=new WildsLoopSystem({world:this.world,state:this.state,save:this.save,hud:this.hud,greenhouse:this.greenhouse}).init();
    this.workbenchPanel=new WorkbenchPanel({wilds:this.wilds,state:this.state});
    this.wilds.onOpenWorkbench=()=>{this.workbenchPanel.show();this.input.resetTouchPointers?.();};
    mark('wildsReadyMs');
    this.cameraOcclusion=new CameraOcclusionSystem({world:this.world,homePortal:this.homePortal,greenhouse:this.greenhouse,orangery:this.orangery,stable:this.stable});
    this.followCamera.setOcclusionSystem(this.cameraOcclusion);
    this.structureVisibility=new StructureVisibilitySystem({world:this.world,greenhouse:this.greenhouse,orangery:this.orangery,stable:this.stable,cameraOcclusion:this.cameraOcclusion});
    this.clock=new THREE.Clock();this.time=0;this.lastMoved=false;
    addEventListener('resize',()=>this.resize());this.resize();this.homePortal.prepareMoveInCamera?.(this.camera,this.character);this.renderer.setAnimationLoop(()=>this.frame());
    this.hud.ready();if(this.homePortal.moveInPending)this.homePortal.beginMoveIn(this.character,this.followCamera,this.camera,this.hud);
    mark('gameReadyMs');
    const resources=performance.getEntriesByType?.('resource')||[];
    this.startupMetrics.resources=resources.filter(r=>/\.(glb|gltf)(\?|$)/i.test(r.name)).map(r=>({name:r.name.split('/').pop(),durationMs:Math.round(r.duration*10)/10,transferSize:r.transferSize||0,decodedBodySize:r.decodedBodySize||0})).sort((a,b)=>b.durationMs-a.durationMs).slice(0,24);
    window.__TGW_STARTUP_METRICS__=this.startupMetrics;
    if(new URLSearchParams(location.search).get('perf')==='1')console.table(this.startupMetrics.resources),console.info('[TGW startup]',this.startupMetrics);
    setTimeout(()=>{if(!this.input.moved&&!this.homePortal?.usesMoveInCamera?.())this.hud.hint.style.opacity='0';},9000);
  }

  resize(){this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.fov=this.camera.aspect<.8?58:48;this.camera.updateProjectionMatrix();}
  frame(){
    const dt=Math.min(this.clock.getDelta(),1/20);this.time+=dt;this.uTime.value=this.time;this.input.update();
    if(this.input.moved&&!this.lastMoved){this.lastMoved=true;this.hud.markMoved();}

    const gardenSpace=this.world.isGardenSpace();
    const portalBusy=this.homePortal?.busy||false;
    const fishingBusy=!gardenSpace&&(this.fishing?.isBusy?.()||false);
    const stableBusy=!gardenSpace&&(this.stable?.isBusy?.()||false);
    const specialBusy=fishingBusy||stableBusy;
    const wildsPanel=this.workbenchPanel?.open||false;
    const mapOpen=this.worldMap?.isOpen||false,mapOverlay=mapOpen&&(this.worldMap?.overlayMode||false);
    const touchLook=this.input.isTouch?this.input.consumeLook?.():null;
    if(!this.state.choice.open&&!specialBusy&&!portalBusy&&!mapOpen&&!wildsPanel)this.followCamera.applyTouchLook?.(touchLook);
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
    this.homePortal?.update(dt);this.world.update?.(dt,this.time,this.character.position);

    if(gardenSpace){
      this.choiceWorld.update(dt,this.time);
    }else{
      this.wildlife?.update(dt,this.time,this.character.position);this.orangery?.update(dt,this.time,this.character.position);this.stable?.update(dt,this.time,this.character.position,this.camera,this.renderer);this.fishing?.update(dt,this.time,this.character);if(stableBusy)this.stable?.syncPlayerVisibility?.();
    }

    let seed={near:false},loop={interaction:null},greenhouse={interaction:null};
    if(gardenSpace){
      seed=this.collectible.update(dt,this.time,this.character);
      greenhouse=this.greenhouse.update(dt,this.time,this.character);
      this.greenhouse.applyCamera(this.camera,this.followCamera);
    }

    let interaction=null;
    if(!this.state.choice.open&&!portalBusy&&!wildsPanel){
      if(gardenSpace){
        // Wilds garden props first; the locked seed/greenhouse interactions override where they overlap.
        const gardenHit=this.wilds?.update(dt,this.time,this.character,'garden').interaction;if(gardenHit)interaction=gardenHit;
        if(seed.near)interaction={type:'first-seed',label:'Collect Golden Seed'};
        if(loop.interaction)interaction=loop.interaction;
        if(greenhouse.interaction)interaction=greenhouse.interaction;
      }
      // Wilds go first so locked Stable/Fishing/Home interactions keep priority when they overlap.
      if(!gardenSpace&&!specialBusy){const wildsHit=this.wilds?.update(dt,this.time,this.character,'world').interaction;if(wildsHit)interaction=wildsHit;}
      if(!specialBusy){
        const homeInteraction=this.homePortal?.interaction?.(this.character.position);if(homeInteraction)interaction=homeInteraction;
      }
      if(!gardenSpace){
        // Boat mode intentionally keeps the character controller paused while still
        // exposing FishingV1-owned E interactions such as Fish / Dock.
        const stableInteraction=this.stable?.interaction?.(this.character.position);if(stableInteraction)interaction=stableInteraction;
        const fishInteraction=this.fishing?.interaction?.(this.character.position);if(fishInteraction)interaction=fishInteraction;
      }
    }
    this.hud.setActionVisible(!!interaction,interaction?.label||'Collect');this.hud.action.classList.toggle('wilds-locked',!!(interaction?.disabled&&interaction.type?.startsWith?.('wilds-')));
    const action=this.input.consumeAction();
    if(!this.state.choice.open&&action&&interaction&&!interaction.disabled){
      if(interaction.type==='home-enter'||interaction.type==='home-exit')this.homePortal.interact(interaction.type,this.character,this.followCamera,this.hud);
      else if(interaction.type==='first-seed')this.collectible.collect(this.character);
      else if(interaction.type==='greenhouse')this.greenhouse.interact(this.character);
      else if(interaction.type?.startsWith?.('stable-'))this.stable.interact(interaction);
      else if(interaction.type?.startsWith?.('wilds-'))this.wilds.interact(interaction,this.character);
      else if(['fish-board','fishing-shop','fishing-spot','boat-board','boat-fish','boat-dock'].includes(interaction.type))this.fishing.interact(interaction.type);
    }

    // Fishing owns camera only in the shared world. The private garden keeps the
    // locked third-person/greenhouse camera behavior completely separate.
    if(homeCameraOwner)this.homePortal?.applyMoveInCamera?.(this.camera,this.followCamera,dt);
    else if(!gardenSpace){this.fishing?.applyCamera(this.camera,this.followCamera,dt);this.stable?.applyCamera(this.camera,this.followCamera,dt);}
    // Normal traversal gets a consistent cutaway fallback only when a roofed structure
    // leaves too little room for third-person framing. Fishing-owned special cameras
    // remain visually locked and therefore restore all structure materials.
    this.structureVisibility?.update(dt,{enabled:!specialCameraBusy});
    const mapVisible=!gardenSpace&&!portalBusy&&!specialBusy&&!this.state.choice.open;
    this.worldMap?.setVisible?.(mapVisible);
    this.worldMap?.setMarkers?.(gardenSpace?[]:(this.wilds?.mapMarkers?.()||[]));
    this.worldMap?.update?.();
    this.renderer.render(this.scene,this.camera);
  }
}
