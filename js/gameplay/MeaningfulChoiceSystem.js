// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { damp, radialTexture } from '../visual/VisualKit.js';
import { loadGLTF } from '../core/AssetManager.js';

const LOTUS_URL='./assets/plants/golden-lotus.glb';
const POT_URL='./assets/props/pot-terracotta.glb';

function labelSprite(text, width = 520) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.userData = { canvas, ctx, texture, text };
  sprite.scale.set(width / 210, .62, 1);
  updateLabel(sprite, text);
  return sprite;
}

function updateLabel(sprite, text) {
  const { canvas, ctx, texture } = sprite.userData;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(25,34,22,.72)';
  const x = 8, y = 18, w = canvas.width - 16, h = 92, r = 34;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#f4f1e8';
  ctx.font = '700 29px Manrope, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, 64);
  texture.needsUpdate = true;
  sprite.userData.text = text;
}

function actionMap(mixer, clips=[]) {
  const map=new Map();
  for(const clip of clips) map.set(clip.name,mixer.clipAction(clip));
  return map;
}

function playOnce(actions,name){
  const action=actions.get(name);if(!action)return null;
  action.reset();action.enabled=true;action.setEffectiveWeight(1);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
  return action;
}

function playLoop(actions,name){
  const action=actions.get(name);if(!action)return null;
  action.reset();action.enabled=true;action.setEffectiveWeight(1);action.setLoop(THREE.LoopRepeat,Infinity);action.clampWhenFinished=false;action.play();
  return action;
}

export class MeaningfulChoiceSystem {
  constructor(scene, { state }) {
    this.scene = scene; this.state = state;
    this.plantProgress = 0; this.plantTarget = 0;
    this.donateProgress = 0; this.donateTarget = 0;
    this.lotusPhase='hidden';this.lotusPhaseT=0;this.pendingPlant=false;
    this.buildPersonalPlot();
    this.buildCommunityProject();
    state.events.on('personal:specimen-planted', () => this.startGoldenLotusPayoff());
    state.events.on('world-project:changed', e => {
      this.donateTarget = e.contributed > 0 ? 1 : 0;
      updateLabel(this.projectLabel, `COMMUNITY BLOOM  ${e.contributed}/${e.target}`);
    });
  }

  async init(){
    await this.loadGoldenLotusPayoff();
    if(this.pendingPlant||this.state.personal.rareSpecimenPlanted)this.startGoldenLotusPayoff();
    return this;
  }

  buildPersonalPlot() {
    const root = new THREE.Group(); root.position.set(-9.35, 0, -5.15); this.scene.add(root); this.personalRoot = root;
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.16, .09, 28), new THREE.MeshStandardMaterial({ color: 0x6e5840, roughness: 1 }));
    soil.position.y = .025; soil.scale.z = .72; soil.receiveShadow = true; root.add(soil);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xa08057, roughness: .9 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.96, .055, 8, 32), rimMat); rim.rotation.x = Math.PI / 2; rim.scale.z = .72; rim.position.y = .09; rim.castShadow = true; root.add(rim);
    const marker = labelSprite('YOUR PLOT'); marker.position.set(0, 1.48, 0); root.add(marker);

    // v0.3.32: authored pot + authored Golden Lotus replace the old procedural specimen.
    this.payoffAnchor=new THREE.Group();this.payoffAnchor.position.y=.09;root.add(this.payoffAnchor);
    const glowTex=radialTexture([[0,'rgba(255,239,181,.72)'],[.24,'rgba(255,215,107,.30)'],[.52,'rgba(255,192,72,.11)'],[1,'rgba(255,180,60,0)']],192);
    this.personalGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}));
    this.personalGlow.material.toneMapped=false;this.personalGlow.position.y=.47;this.personalGlow.scale.setScalar(1.18);root.add(this.personalGlow);
    this.personalLight=new THREE.PointLight(0xffce68,0,2.6,2);this.personalLight.position.set(0,.48,0);root.add(this.personalLight);
  }

  async loadGoldenLotusPayoff(){
    const loader=new GLTFLoader();
    const [potGltf,lotusGltf]=await Promise.all([loadGLTF(POT_URL),loader.loadAsync(LOTUS_URL)]) /* R55: pot shared with greenhouse pots */;

    this.potRoot=potGltf.scene;this.potRoot.name='GoldenLotus_Pot_Terracotta';this.potRoot.visible=false;
    this.potRoot.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    this.payoffAnchor.add(this.potRoot);
    this.potMixer=new THREE.AnimationMixer(this.potRoot);this.potActions=actionMap(this.potMixer,potGltf.animations||[]);
    this.potDur={Place:this.potActions.get('Place')?.getClip()?.duration||.9,PlantSeed:this.potActions.get('PlantSeed')?.getClip()?.duration||1.8};

    this.lotusRoot=lotusGltf.scene;this.lotusRoot.name='GoldenLotus_Payoff';this.lotusRoot.visible=false;
    // Authored asset dimensions are already in real-world scale (~52.7 cm tall).
    this.lotusRoot.position.y=.145;
    this.lotusRoot.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(m&&'emissiveIntensity' in m&&m.emissive){m.userData.baseLotusEmissive=m.emissiveIntensity||1;}}}});
    this.payoffAnchor.add(this.lotusRoot);
    this.lotusMixer=new THREE.AnimationMixer(this.lotusRoot);this.lotusActions=actionMap(this.lotusMixer,lotusGltf.animations||[]);
    this.lotusDur={Grow:this.lotusActions.get('Grow')?.getClip()?.duration||3.4,Celebrate:this.lotusActions.get('Celebrate')?.getClip()?.duration||1.8};

    // Keep both assets at their authored stable pose until the player chooses Plant.
    this.potMixer.update(0);this.lotusMixer.update(0);
    this.payoffReady=true;
  }

  startGoldenLotusPayoff(){
    this.plantTarget=1;
    if(!this.payoffReady){this.pendingPlant=true;return;}
    if(this.lotusPhase!=='hidden')return;
    this.pendingPlant=false;this.lotusPhase='place';this.lotusPhaseT=0;
    this.potRoot.visible=true;this.lotusRoot.visible=false;
    this.potMixer.stopAllAction();this.lotusMixer.stopAllAction();
    playOnce(this.potActions,'Place');
    this.state.events.emit('golden-lotus:payoff-started',{id:'golden_lotus'});
  }

  setLotusPhase(next){
    this.lotusPhase=next;this.lotusPhaseT=0;
    if(next==='plant-seed'){
      this.potMixer.stopAllAction();playOnce(this.potActions,'PlantSeed');
    }else if(next==='grow'){
      this.lotusRoot.visible=true;this.lotusMixer.stopAllAction();playOnce(this.lotusActions,'Grow');
    }else if(next==='celebrate'){
      this.lotusMixer.stopAllAction();playOnce(this.lotusActions,'Celebrate');
      this.state.events.emit('golden-lotus:grown',{id:'golden_lotus'});
    }else if(next==='idle'){
      this.lotusMixer.stopAllAction();playLoop(this.lotusActions,'Idle');
      this.potMixer.stopAllAction();playLoop(this.potActions,'Idle');
    }
  }

  buildCommunityProject() {
    const root = new THREE.Group(); root.position.set(-5.05, 0, -5.9); this.scene.add(root); this.projectRoot = root;
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xa99d82, roughness: .96 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.18,1.3,.14,10),stoneMat); base.position.y=.06;base.scale.z=.72;base.receiveShadow=true;root.add(base);
    this.projectLabel=labelSprite('COMMUNITY BLOOM  0/3',620); this.projectLabel.position.set(0,1.52,0); root.add(this.projectLabel);
    const ringMat = new THREE.MeshStandardMaterial({color:0x718d50,roughness:.9});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.82,.06,8,28),ringMat);ring.rotation.x=Math.PI/2;ring.scale.z=.75;ring.position.y=.16;ring.castShadow=true;root.add(ring);
    this.projectFlower=new THREE.Group();this.projectFlower.position.y=.17;this.projectFlower.scale.setScalar(.001);root.add(this.projectFlower);
    const stemMat=new THREE.MeshStandardMaterial({color:0x56753f,roughness:.78});
    const bloomMat=new THREE.MeshPhysicalMaterial({color:0xe8c866,roughness:.34,clearcoat:.25,emissive:0x80651d,emissiveIntensity:.07});
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.045,.07,.82,9),stemMat);stem.position.y=.41;stem.castShadow=true;this.projectFlower.add(stem);
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2,p=new THREE.Mesh(new THREE.SphereGeometry(.16,10,7),bloomMat);p.scale.set(.58,1.45,.5);p.position.set(Math.cos(a)*.19,.88,Math.sin(a)*.19);p.rotation.z=Math.PI/2;p.rotation.y=-a;p.castShadow=true;this.projectFlower.add(p);}
    const core=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),new THREE.MeshStandardMaterial({color:0x8c6a2d,roughness:.65}));core.position.y=.88;core.castShadow=true;this.projectFlower.add(core);
    this.projectLight=new THREE.PointLight(0xffd778,0,3.2,2);this.projectLight.position.set(0,1.0,0);root.add(this.projectLight);
  }

  update(dt,time) {
    this.potMixer?.update(dt);this.lotusMixer?.update(dt);

    this.plantProgress += (this.plantTarget - this.plantProgress) * damp(4.4,dt);
    if(this.payoffReady&&this.lotusPhase!=='hidden'){
      this.lotusPhaseT+=dt;
      if(this.lotusPhase==='place'&&this.lotusPhaseT>=this.potDur.Place-.02)this.setLotusPhase('plant-seed');
      else if(this.lotusPhase==='plant-seed'&&this.lotusPhaseT>=Math.min(.72,this.potDur.PlantSeed*.42))this.setLotusPhase('grow');
      else if(this.lotusPhase==='grow'&&this.lotusPhaseT>=this.lotusDur.Grow-.02)this.setLotusPhase('celebrate');
      else if(this.lotusPhase==='celebrate'&&this.lotusPhaseT>=this.lotusDur.Celebrate-.02)this.setLotusPhase('idle');

      const active=this.lotusPhase==='grow'||this.lotusPhase==='celebrate';
      const pulse=.5+.5*Math.sin(time*2.25);
      this.personalGlow.material.opacity=active?(.10+.18*pulse):(this.lotusPhase==='idle'?(.045+.035*pulse):.025);
      this.personalGlow.scale.setScalar(1.06+(active ? .14 : .05)*pulse);
      this.personalLight.intensity=active?(.20+.22*pulse):(this.lotusPhase==='idle'?(.08+.05*pulse):0);
    }

    this.donateProgress += (this.donateTarget - this.donateProgress) * damp(4.2,dt);
    if (this.donateTarget) {
      const p=Math.max(.001,this.donateProgress),bounce=1+Math.sin(Math.min(1,p)*Math.PI)*.12;
      this.projectFlower.scale.set(p*bounce,p,p*bounce);
      this.projectFlower.rotation.y = Math.sin(time*.8)*.05;
      this.projectLight.intensity = .55 + Math.sin(time*2.1)*.08;
    }
  }
}
