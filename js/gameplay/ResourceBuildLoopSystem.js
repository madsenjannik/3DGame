// @ts-nocheck
import * as THREE from 'three';
import { damp, radialTexture } from '../visual/VisualKit.js';

function labelSprite(text, width = 560) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.userData = { canvas, ctx, texture, text };
  sprite.scale.set(width / 220, .58, 1);
  updateLabel(sprite, text);
  return sprite;
}

function updateLabel(sprite, text) {
  const { canvas, ctx, texture } = sprite.userData;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(25,34,22,.76)';
  const x = 8, y = 18, w = canvas.width - 16, h = 92, r = 34;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#f4f1e8';
  ctx.font = '700 27px Manrope, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, 64);
  texture.needsUpdate = true;
  sprite.userData.text = text;
}

function mesh(geometry, material, position, scale, rotation) {
  const m = new THREE.Mesh(geometry, material);
  if (position) m.position.set(...position);
  if (scale) m.scale.set(...scale);
  if (rotation) m.rotation.set(...rotation);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export class ResourceBuildLoopSystem {
  constructor(scene, { state, resourceCatalog, buildingCatalog, uTime }) {
    this.scene = scene;
    this.state = state;
    this.resourceCatalog = resourceCatalog;
    this.building = buildingCatalog.garden_lookout;
    this.uTime = uTime;
    this.active = false;
    this.lookoutBuilt = false;
    this.lookoutProgress = 0;
    this.lookoutTarget = 0;
    this.hotspotVisible = false;
    this.hotspotCollected = false;
    this.hotspotNear = 0;
    this.currentInteraction = null;
    this.nodePositions = {
      wood: new THREE.Vector3(8.25, 0, 4.15),
      stone: new THREE.Vector3(-8.4, 0, 2.0),
      clay: new THREE.Vector3(8.2, 0, -3.5),
      fiber: new THREE.Vector3(-3.9, 0, 7.55)
    };
    this.lookoutPosition = new THREE.Vector3(6.0, 0, 7.65);
    this.hotspotPosition = new THREE.Vector3(9.75, 0, -4.65);
    this.nodes = [];
    this.buildResourceNodes();
    this.buildLookoutSite();
    this.buildHotspot();
    state.events.on('choice:resolved', () => this.activate());
    if (state.choice.resolved) this.activate();
  }

  activate() {
    if (this.active) return;
    this.active = true;
    for (const node of this.nodes) node.root.visible = true;
    this.lookoutRoot.visible = true;
    this.state.events.emit('resource-loop:activated', { requirements: { ...this.building.requirements } });
  }

  buildResourceNodes() {
    this.nodes = Object.entries(this.nodePositions).map(([id, position]) => {
      const def = this.resourceCatalog[id];
      const root = new THREE.Group();
      root.position.copy(position);
      root.visible = false;
      this.scene.add(root);
      this.addResourceVisual(root, id, def);
      const glowTex = radialTexture([[0,'rgba(255,245,196,.58)'],[.34,'rgba(212,225,153,.22)'],[1,'rgba(212,225,153,0)']]);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .32 }));
      glow.position.y = .42; glow.scale.setScalar(1.55); root.add(glow);
      const ring = new THREE.Mesh(new THREE.RingGeometry(.42,.48,40), new THREE.MeshBasicMaterial({ color: def.worldColor, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI/2; ring.position.y = .025; root.add(ring);
      return { id, def, root, glow, ring, position, status: 'available', near: 0, collectT: 0, startScale: new THREE.Vector3(1,1,1) };
    });
  }

  addResourceVisual(root, id, def) {
    if (id === 'wood') {
      const bark = new THREE.MeshStandardMaterial({ color: 0x7f5f3e, roughness: .94 });
      const cut = new THREE.MeshStandardMaterial({ color: 0xc4a06e, roughness: .88 });
      for (let i = 0; i < 3; i++) {
        const log = mesh(new THREE.CylinderGeometry(.105,.12,.72,9), bark, [(i-1)*.18,.18,0], [1,1,1], [0,0,Math.PI/2 + (i-1)*.07]);
        root.add(log);
        const cap = mesh(new THREE.CylinderGeometry(.106,.106,.012,9), cut, [(i-1)*.18+.355,.18,0], [1,1,1], [0,0,Math.PI/2 + (i-1)*.07]);
        root.add(cap);
      }
    } else if (id === 'stone') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x8e9285, roughness: .98, flatShading: true });
      [[0,.15,0,.28],[-.23,.10,.10,.19],[.22,.095,.07,.18]].forEach(([x,y,z,s],i) => {
        const rock = mesh(new THREE.DodecahedronGeometry(1,0), mat, [x,y,z], [s,s*(.62+i*.04),s*.9], [i*.2,i*.4,0]); root.add(rock);
      });
    } else if (id === 'clay') {
      const mat = new THREE.MeshStandardMaterial({ color: 0xa96f4c, roughness: 1 });
      const mound = mesh(new THREE.SphereGeometry(.42,14,9), mat, [0,.13,0], [1,.42,.86]); root.add(mound);
      const shardMat = new THREE.MeshStandardMaterial({ color: 0xc48a61, roughness: .96 });
      [-.18,.18].forEach((x,i)=>root.add(mesh(new THREE.IcosahedronGeometry(.13,0),shardMat,[x,.2,.05],[1,.55,.82],[i*.4,0,i*.2])));
    } else if (id === 'fiber') {
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x9caf72, roughness: .90 });
      for (let i=0;i<7;i++) {
        const a=(i-3)*.11;
        root.add(mesh(new THREE.CylinderGeometry(.022,.032,.66,6),stemMat,[Math.sin(a)*.15,.34,Math.cos(a)*.05],[1,1,1],[0,0,a]));
      }
      const band = new THREE.MeshStandardMaterial({ color: 0xd2a15f, roughness: .86 });
      root.add(mesh(new THREE.TorusGeometry(.13,.025,7,18),band,[0,.25,0],[1,1,1],[Math.PI/2,0,0]));
    }
  }

  buildLookoutSite() {
    const root = new THREE.Group(); root.position.copy(this.lookoutPosition); root.visible = false; this.scene.add(root); this.lookoutRoot = root;
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x9c927d, roughness: .98 });
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x6e5a42, roughness: 1 });
    const base = mesh(new THREE.CylinderGeometry(.95,1.02,.10,14), soilMat, [0,.035,0], [1,1,.78]); root.add(base);
    const stones = new THREE.Group(); root.add(stones);
    for (let i=0;i<10;i++) {
      const a=i/10*Math.PI*2;
      stones.add(mesh(new THREE.DodecahedronGeometry(.13,0),baseMat,[Math.cos(a)*.78,.12,Math.sin(a)*.60],[1,.62,1],[i*.3,i*.2,0]));
    }
    this.lookoutStructure = new THREE.Group(); this.lookoutStructure.scale.setScalar(.001); root.add(this.lookoutStructure);
    const wood = new THREE.MeshStandardMaterial({ color: 0x80633f, roughness: .92 });
    const leaf = new THREE.MeshStandardMaterial({ color: 0x6f8e4a, roughness: .80 });
    for (const x of [-.48,.48]) for (const z of [-.32,.32]) this.lookoutStructure.add(mesh(new THREE.CylinderGeometry(.055,.075,1.05,8),wood,[x,.52,z]));
    this.lookoutStructure.add(mesh(new THREE.BoxGeometry(1.2,.12,.82),wood,[0,1.05,0]));
    this.lookoutStructure.add(mesh(new THREE.CylinderGeometry(.035,.05,.82,7),wood,[0,1.48,0]));
    const canopy = mesh(new THREE.ConeGeometry(.62,.40,7),leaf,[0,1.85,0],[1,.75,1]); this.lookoutStructure.add(canopy);
    const lens = new THREE.MeshPhysicalMaterial({ color: 0x91b9a1, roughness: .18, clearcoat: .8, clearcoatRoughness: .12 });
    const scope = mesh(new THREE.CylinderGeometry(.11,.14,.54,10),wood,[0,1.45,.10],[1,1,1],[Math.PI/2,0,0]); this.lookoutStructure.add(scope);
    this.lookoutStructure.add(mesh(new THREE.CircleGeometry(.095,16),lens,[0,1.45,.38],[1,1,1],[0,0,0]));
    this.lookoutLabel = labelSprite('GARDEN LOOKOUT  GATHER MATERIALS', 720); this.lookoutLabel.position.set(0,2.35,0); root.add(this.lookoutLabel);
    const tex=radialTexture([[0,'rgba(199,226,143,.55)'],[.35,'rgba(155,190,100,.20)'],[1,'rgba(155,190,100,0)']]);
    this.lookoutGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}));
    this.lookoutGlow.position.set(0,1.2,0);this.lookoutGlow.scale.setScalar(3.0);root.add(this.lookoutGlow);
  }

  buildHotspot() {
    const root = new THREE.Group(); root.position.copy(this.hotspotPosition); root.visible = false; this.scene.add(root); this.hotspotRoot = root;
    const glowTex=radialTexture([[0,'rgba(255,232,163,.9)'],[.22,'rgba(255,198,99,.42)'],[1,'rgba(255,180,80,0)']]);
    this.hotspotGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.72}));this.hotspotGlow.position.y=.68;this.hotspotGlow.scale.setScalar(1.8);root.add(this.hotspotGlow);
    const seedMat=new THREE.MeshPhysicalMaterial({color:0xd39a3b,roughness:.28,clearcoat:.85,clearcoatRoughness:.16,sheen:.45,sheenColor:0xffdda0,emissive:0xb86f16,emissiveIntensity:.36});
    this.hotspotSeed=new THREE.Mesh(new THREE.SphereGeometry(.18,18,12),seedMat);this.hotspotSeed.scale.set(.82,1.25,.82);this.hotspotSeed.position.y=.67;this.hotspotSeed.castShadow=true;root.add(this.hotspotSeed);
    const leafMat=new THREE.MeshStandardMaterial({color:0x78934f,roughness:.72});[-.08,.08].forEach((x,i)=>root.add(mesh(new THREE.SphereGeometry(.075,9,6),leafMat,[x,.83,0],[1.4,.35,.7],[0,0,i?-.45:.45])));
    const ring=new THREE.Mesh(new THREE.RingGeometry(.56,.64,48),new THREE.MeshBasicMaterial({color:0xf4c460,transparent:true,opacity:.48,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;root.add(ring);this.hotspotRing=ring;
    const beamMat=new THREE.MeshBasicMaterial({color:0xe8cf73,transparent:true,opacity:.12,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
    this.hotspotBeam=new THREE.Mesh(new THREE.CylinderGeometry(.05,.30,4.8,16,1,true),beamMat);this.hotspotBeam.position.y=2.4;root.add(this.hotspotBeam);
    this.hotspotLabel=labelSprite('RARE HOTSPOT',460);this.hotspotLabel.position.set(0,1.55,0);root.add(this.hotspotLabel);
  }

  inventoryCount(id) { return this.state.inventory.get(id) || 0; }

  hasMaterials() {
    return Object.entries(this.building.requirements).every(([id, amount]) => this.inventoryCount(id) >= amount);
  }

  materialProgress() {
    const out = {};
    for (const [id, amount] of Object.entries(this.building.requirements)) out[id] = { have: this.inventoryCount(id), need: amount };
    return out;
  }

  emitProgress() {
    const progress = this.materialProgress();
    this.state.events.emit('resource-loop:progress', { progress, ready: this.hasMaterials() });
    if (this.hasMaterials() && !this.lookoutBuilt) {
      updateLabel(this.lookoutLabel, 'GARDEN LOOKOUT  READY TO BUILD');
      this.state.events.emit('lookout:ready', { requirements: { ...this.building.requirements } });
    }
  }

  collectNode(node, character) {
    if (!this.active || node.status !== 'available') return false;
    node.status = 'collecting'; node.collectT = 0; node.startScale.copy(node.root.scale); node.character = character;
    return true;
  }

  buildLookout() {
    if (this.lookoutBuilt || !this.hasMaterials()) return false;
    for (const [id, amount] of Object.entries(this.building.requirements)) this.state.removeItem(id, amount);
    this.lookoutBuilt = true;
    this.lookoutTarget = 1;
    updateLabel(this.lookoutLabel, 'GARDEN LOOKOUT  ONLINE');
    this.state.events.emit('lookout:built', { id: this.building.id });
    setTimeout(() => this.revealHotspot(), 650);
    return true;
  }

  revealHotspot() {
    if (this.hotspotVisible) return;
    this.hotspotVisible = true;
    this.hotspotRoot.visible = true;
    this.state.events.emit('hotspot:revealed', { id: 'rare_seed_hotspot' });
  }

  collectHotspot(character) {
    if (!this.hotspotVisible || this.hotspotCollected || this.hotspotNear < .5) return false;
    this.hotspotCollected = true;
    this.hotspotRoot.visible = false;
    this.state.addItem('rare_seed', 1);
    this.state.events.emit('hotspot:collected', { id: 'rare_seed_hotspot', reward: 'rare_seed' });
    character.flash();
    return true;
  }

  interact(character) {
    const hit = this.currentInteraction;
    if (!hit) return false;
    if (hit.type === 'resource') return this.collectNode(hit.node, character);
    if (hit.type === 'lookout') return this.buildLookout();
    if (hit.type === 'hotspot') return this.collectHotspot(character);
    return false;
  }

  update(dt, time, character) {
    this.currentInteraction = null;
    if (!this.active) return { interaction: null };

    let nearest = null;
    for (const node of this.nodes) {
      const d = Math.hypot(character.position.x-node.position.x, character.position.z-node.position.z);
      const nearTarget = node.status === 'available' && d < node.def.collectibleRadius ? 1 : 0;
      node.near += (nearTarget-node.near)*damp(6,dt);
      if (node.status === 'available') {
        node.root.position.y = Math.sin(time*1.7 + node.position.x)*.025;
        node.root.rotation.y = Math.sin(time*.55 + node.position.z)*.035;
        node.glow.material.opacity = .20 + node.near*.34 + Math.sin(time*2.1)*.03;
        node.glow.scale.setScalar(1.25 + node.near*.24);
        node.ring.material.opacity = .11 + node.near*.38;
        node.ring.rotation.z += dt*.14;
        if (nearTarget && (!nearest || d < nearest.distance)) nearest = { type:'resource', node, distance:d, label:`Gather ${node.def.displayName}` };
      } else if (node.status === 'collecting') {
        node.collectT += dt;
        const p = Math.min(1,node.collectT/.42), e = p*p*(3-2*p);
        node.root.position.y = e*.55;
        node.root.scale.setScalar(1-e*.88);
        node.root.rotation.y += dt*7;
        if (p >= 1) {
          node.status = 'collected'; node.root.visible = false;
          this.state.addItem(node.id, node.def.gatherAmount || 1);
          this.state.events.emit('resource:gathered', { id: node.id, amount: node.def.gatherAmount || 1, displayName: node.def.displayName });
          node.character?.flash();
          this.emitProgress();
        }
      }
    }

    const lookoutDistance = Math.hypot(character.position.x-this.lookoutPosition.x, character.position.z-this.lookoutPosition.z);
    if (!this.lookoutBuilt && this.hasMaterials() && lookoutDistance < 1.65) {
      const candidate = { type:'lookout', distance:lookoutDistance, label:'Build Lookout' };
      if (!nearest || candidate.distance < nearest.distance) nearest = candidate;
    }

    this.lookoutProgress += (this.lookoutTarget-this.lookoutProgress)*damp(3.8,dt);
    if (this.lookoutBuilt) {
      const p=Math.max(.001,this.lookoutProgress),bounce=1+Math.sin(Math.min(1,p)*Math.PI)*.08;
      this.lookoutStructure.scale.set(p*bounce,p,p*bounce);
      this.lookoutGlow.material.opacity=Math.max(0,(1-p)*.55)+.10+Math.sin(time*1.8)*.025;
      this.lookoutGlow.scale.setScalar(2.7+Math.sin(time*1.5)*.08);
    }

    if (this.hotspotVisible && !this.hotspotCollected) {
      const d=Math.hypot(character.position.x-this.hotspotPosition.x,character.position.z-this.hotspotPosition.z);
      const nearTarget=d<1.7?1:0;this.hotspotNear+=(nearTarget-this.hotspotNear)*damp(6,dt);
      this.hotspotSeed.position.y=.67+Math.sin(time*1.9)*.055;this.hotspotSeed.rotation.y+=dt*(.7+this.hotspotNear*1.5);
      this.hotspotGlow.material.opacity=.58+this.hotspotNear*.26+Math.sin(time*2.4)*.05;
      this.hotspotRing.scale.setScalar(1+Math.sin(time*2.0)*.055);
      this.hotspotBeam.material.opacity=.08+Math.sin(time*1.3)*.025;
      if (nearTarget) {
        const candidate={type:'hotspot',distance:d,label:'Collect Rare Seed'};
        if(!nearest||candidate.distance<nearest.distance)nearest=candidate;
      }
    }

    this.currentInteraction = nearest;
    return { interaction: nearest };
  }
}
