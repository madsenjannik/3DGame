// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { damp, radialTexture } from '../visual/VisualKit.js';

function beamTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const x = c.getContext('2d');
  x.clearRect(0,0,c.width,c.height);
  const g = x.createLinearGradient(0,0,0,c.height);
  g.addColorStop(0,'rgba(255,235,185,0)');
  g.addColorStop(.16,'rgba(255,230,170,.14)');
  g.addColorStop(.52,'rgba(255,214,120,.70)');
  g.addColorStop(.84,'rgba(255,205,96,.16)');
  g.addColorStop(1,'rgba(255,190,90,0)');
  x.fillStyle = g; x.fillRect(0,0,c.width,c.height);
  x.globalCompositeOperation = 'destination-in';
  const rg = x.createRadialGradient(c.width/2,c.height*0.52,0,c.width/2,c.height*0.52,c.width*0.48);
  rg.addColorStop(0,'rgba(255,255,255,1)');
  rg.addColorStop(.72,'rgba(255,255,255,.7)');
  rg.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle = rg; x.fillRect(0,0,c.width,c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowMaterial({ map = null, color = 0xffffff, opacity = 1 } = {}) {
  const mat = new THREE.MeshBasicMaterial({
    map,
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  mat.toneMapped = false;
  return mat;
}

export class CollectibleSystem {
  constructor(scene,{state,resourceCatalog,uTime,position=new THREE.Vector3(-7.3,0,-4.9)}){
    this.scene=scene;this.state=state;this.def=resourceCatalog.rare_seed;this.uTime=uTime;this.position=position;
    this.status='loading';this.near=0;this.proximity=0;this.awakenT=0;this.collectT=0;this.character=null;
  }
  async init(){await this.build();return this;}
  async build(){
    const source=this.def.source||{};
    const gltf=await new GLTFLoader().loadAsync(source.url);
    this.root=new THREE.Group();
    this.root.name='golden-seed-world-root';
    this.root.position.set(this.position.x,source.hoverHeight??.34,this.position.z);
    this.scene.add(this.root);
    this.home=this.root.position.clone();

    this.visualRoot=gltf.scene;
    this.visualRoot.name=this.visualRoot.name||'GoldenSeed';
    this.visualRoot.scale.setScalar(source.scale||1);
    this.root.add(this.visualRoot);

    this.coreMaterials=[];
    this.visualRoot.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=true;o.receiveShadow=true;
      const mats=Array.isArray(o.material)?o.material:[o.material];
      for(const mat of mats){
        if(!mat)continue;
        const isCore=(o.name||'').toLowerCase().includes('core')||(mat.name||'').toLowerCase().includes('core');
        if(isCore&&'emissiveIntensity' in mat){
          mat.userData.baseSeedEmissive=mat.emissiveIntensity||1;
          this.coreMaterials.push(mat);
        }
      }
    });

    this.mixer=new THREE.AnimationMixer(this.visualRoot);
    this.actions=new Map();
    for(const clip of gltf.animations||[])this.actions.set(clip.name,this.mixer.clipAction(clip));
    this.idleAction=this.actions.get(source.animationMap?.Idle||'Idle');
    this.awakenAction=this.actions.get(source.animationMap?.Awaken||'Awaken');
    this.collectAction=this.actions.get(source.animationMap?.Collect||'Collect');
    this.awakenDuration=this.awakenAction?.getClip()?.duration||2.4;
    this.collectDuration=this.collectAction?.getClip()?.duration||1.3;
    if(this.idleAction){this.idleAction.reset();this.idleAction.setLoop(THREE.LoopRepeat,Infinity);this.idleAction.play();}
    if(this.awakenAction){this.awakenAction.setLoop(THREE.LoopOnce,1);this.awakenAction.clampWhenFinished=true;}
    if(this.collectAction){this.collectAction.setLoop(THREE.LoopOnce,1);this.collectAction.clampWhenFinished=true;}

    const glowTex=radialTexture([[0,'rgba(255,250,214,.96)'],[.18,'rgba(255,226,145,.48)'],[.42,'rgba(255,208,110,.22)'],[1,'rgba(255,190,70,0)']],192);
    this.glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.34}));
    this.glow.material.toneMapped=false;
    this.glow.position.y=.19;this.glow.scale.setScalar(1.02);this.root.add(this.glow);
    this.light=new THREE.PointLight(0xffcf65,.28,3.8,2);this.light.position.y=.24;this.root.add(this.light);

    this.beaconRoot=new THREE.Group();
    this.beaconRoot.name='golden-seed-beacon';
    this.beaconRoot.position.set(this.position.x,0,this.position.z);
    this.scene.add(this.beaconRoot);

    const haloTex=radialTexture([[0,'rgba(255,248,220,0)'],[.28,'rgba(255,238,194,.26)'],[.46,'rgba(255,215,120,.36)'],[.68,'rgba(255,192,82,.14)'],[1,'rgba(255,185,80,0)']],256);
    this.groundHalo=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),glowMaterial({map:haloTex,color:0xffd98e,opacity:.28}));
    this.groundHalo.rotation.x=-Math.PI/2;this.groundHalo.position.y=.018;this.beaconRoot.add(this.groundHalo);

    this.ringInner=new THREE.Mesh(new THREE.RingGeometry(.52,.63,64),glowMaterial({color:0xffdc88,opacity:.34}));
    this.ringInner.rotation.x=-Math.PI/2;this.ringInner.position.y=.03;this.beaconRoot.add(this.ringInner);

    this.ringOuter=new THREE.Mesh(new THREE.RingGeometry(.76,.84,64),glowMaterial({color:0xffc654,opacity:.18}));
    this.ringOuter.rotation.x=-Math.PI/2;this.ringOuter.position.y=.038;this.beaconRoot.add(this.ringOuter);

    this.ringWhisper=new THREE.Mesh(new THREE.RingGeometry(.97,1.01,64),glowMaterial({color:0xffefc0,opacity:.09}));
    this.ringWhisper.rotation.x=-Math.PI/2;this.ringWhisper.position.y=.046;this.beaconRoot.add(this.ringWhisper);

    const beamTex=beamTexture();
    this.beamRoot=new THREE.Group();
    this.beamRoot.position.y=1.08;this.beaconRoot.add(this.beamRoot);
    const beamGeo=new THREE.PlaneGeometry(.62,2.55);
    this.beamA=new THREE.Mesh(beamGeo,glowMaterial({map:beamTex,color:0xffdf8d,opacity:.14}));
    this.beamB=this.beamA.clone();
    this.beamB.material=this.beamA.material.clone();
    this.beamB.rotation.y=Math.PI/2;
    this.beamRoot.add(this.beamA,this.beamB);

    this.sparkOrbit=new THREE.Group();
    this.sparkOrbit.position.y=.055;this.beaconRoot.add(this.sparkOrbit);
    this.sparkles=[];
    const sparkGeo=new THREE.OctahedronGeometry(.035,0);
    for(let i=0;i<4;i++){
      const a=i*Math.PI*.5;
      const m=new THREE.Mesh(sparkGeo,glowMaterial({color:i%2?0xfff0c2:0xffcf6e,opacity:.55}));
      m.position.set(Math.cos(a)*.82,0,Math.sin(a)*.82);
      this.sparkOrbit.add(m);this.sparkles.push(m);
    }

    this.status='available';
  }
  playAwaken(){
    if(this.status!=='available')return;
    this.status='awakening';this.awakenT=0;
    this.idleAction?.stop();
    if(this.awakenAction){this.awakenAction.reset();this.awakenAction.enabled=true;this.awakenAction.setEffectiveWeight(1);this.awakenAction.play();}
    else this.finishAwaken();
  }
  finishAwaken(){
    if(this.status!=='awakening')return;
    this.status='awakened';
    this.state.events.emit('golden-seed:awakened',{id:'rare_seed'});
  }
  canCollect(){return this.status==='awakened'&&this.near>.5;}
  collect(character){
    if(!this.canCollect())return false;
    this.status='collecting';this.collectT=0;this.character=character;
    this.idleAction?.stop();
    if(this.collectAction){
      this.collectAction.reset();this.collectAction.enabled=true;this.collectAction.setEffectiveWeight(1);this.collectAction.play();
      if(this.awakenAction)this.awakenAction.enabled=false;
    }else this.finishCollect();
    return true;
  }
  finishCollect(){
    if(this.status==='collected')return;
    this.status='collected';
    this.root.visible=false;
    if(this.beaconRoot)this.beaconRoot.visible=false;
    this.state.addItem('rare_seed',1);
    this.state.events.emit('golden-seed:collected',{id:'rare_seed'});
    this.state.beginSeedChoice();
    this.character?.flash?.();
  }
  update(dt,time,character){
    this.mixer?.update(dt);
    const d=Math.hypot(character.position.x-this.position.x,character.position.z-this.position.z);
    const collectRadius=this.def.collectibleRadius||1.75;
    const awakenRadius=this.def.awakenRadius||3.4;
    const nearT=(this.status==='awakened'&&d<collectRadius)?1:0;
    this.near+=(nearT-this.near)*damp(8,dt);
    const proxTarget=THREE.MathUtils.clamp(1-(d-collectRadius)/Math.max(.01,awakenRadius-collectRadius),0,1);
    this.proximity+=(proxTarget-this.proximity)*damp(5,dt);

    if(this.status==='available'&&d<awakenRadius)this.playAwaken();
    if(this.status==='awakening'){
      this.awakenT+=dt;
      if(this.awakenT>=this.awakenDuration-.025)this.finishAwaken();
    }else if(this.status==='collecting'){
      this.collectT+=dt;
      if(this.collectT>=this.collectDuration-.025)this.finishCollect();
    }

    const awakened=this.status==='awakening'||this.status==='awakened'||this.status==='collecting';
    const pulse=.5+.5*Math.sin(time*2.35);
    const slowPulse=.5+.5*Math.sin(time*1.35+0.6);
    const quickPulse=.5+.5*Math.sin(time*4.1+1.3);
    const collectFade=this.status==='collecting'?Math.max(0,1-this.collectT/Math.max(.01,this.collectDuration)):1;
    const glowBoost=.86+this.proximity*.52+(awakened?.34:0);
    for(const mat of this.coreMaterials){
      const base=mat.userData.baseSeedEmissive||1;
      mat.emissiveIntensity=base*(glowBoost+.12*pulse);
    }
    if(this.glow){
      this.glow.material.opacity=(.24+this.proximity*.24+(awakened?.18:0)+pulse*.05)*collectFade;
      this.glow.scale.setScalar(.96+this.proximity*.24+(awakened?.18:0)+pulse*.04);
    }
    if(this.light)this.light.intensity=(.22+this.proximity*.34+(awakened?.24:0)+pulse*.06)*collectFade;

    if(this.beaconRoot){
      const beaconStrength=(.32+this.proximity*.46+(awakened?.30:0))*collectFade;
      this.groundHalo.material.opacity=.16+beaconStrength*.22+slowPulse*.045;
      this.groundHalo.scale.setScalar(1.04+this.proximity*.08+slowPulse*.05);

      this.ringInner.material.opacity=.22+beaconStrength*.34+quickPulse*.05;
      this.ringInner.scale.setScalar(1+slowPulse*.03+(awakened?.04:0));

      this.ringOuter.material.opacity=.10+beaconStrength*.24+slowPulse*.04;
      this.ringOuter.scale.setScalar(1.01+quickPulse*.03+this.proximity*.02);

      this.ringWhisper.material.opacity=.06+beaconStrength*.14+quickPulse*.025;
      this.ringWhisper.scale.setScalar(1.02+slowPulse*.05+(awakened?.03:0));

      const beamOpacity=(.05+beaconStrength*.15+slowPulse*.04)*collectFade;
      this.beamA.material.opacity=beamOpacity;
      this.beamB.material.opacity=beamOpacity*.88;
      this.beamRoot.scale.set(1+this.proximity*.06,1+this.proximity*.10+slowPulse*.03,1+this.proximity*.06);
      this.beamRoot.position.y=1.02+slowPulse*.06+(awakened?.04:0);

      this.sparkOrbit.rotation.y=time*.42;
      this.sparkOrbit.position.y=.05+slowPulse*.03;
      this.sparkles.forEach((spark,i)=>{
        spark.material.opacity=(.22+beaconStrength*.42+quickPulse*.12)*collectFade;
        spark.position.y=Math.sin(time*2.1+i*.8)*.018;
        spark.scale.setScalar(.88+quickPulse*.18+(i%2)*.04);
      });
    }
    return {near:this.canCollect(),status:this.status,distance:d};
  }
}
