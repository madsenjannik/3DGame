// @ts-nocheck
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FoundationSample } from './FoundationSample.js';
import { SharedLandscape } from './SharedLandscape.js?build=DAYNIGHT-R81-20261005A';
import { color, createSkyMaterial, patchMaterial, seededRandom, smooth } from '../visual/VisualKit.js';

function paintGeometry(geometry, hex){
  let g=geometry;
  if(g.index) g=g.toNonIndexed();
  for(const key of ['uv','uv1','uv2']) if(g.attributes[key]) g.deleteAttribute(key);
  if(!g.attributes.normal) g.computeVertexNormals();
  const c=new THREE.Color(hex),a=new Float32Array(g.attributes.position.count*3);
  for(let i=0;i<g.attributes.position.count;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}
  g.setAttribute('color',new THREE.BufferAttribute(a,3));
  return g;
}

function flowerPetalGeometry(length,width,colorHex){
  const s=new THREE.Shape();
  s.moveTo(0,0);
  s.bezierCurveTo(length*.28,width*.82,length*.72,width*.56,length,0);
  s.bezierCurveTo(length*.72,-width*.56,length*.28,-width*.82,0,0);
  const g=new THREE.ShapeGeometry(s,4);g.rotateX(-Math.PI/2);
  return paintGeometry(g,colorHex);
}

function flowerStemGeometry(height,radius=.008){
  const g=new THREE.CylinderGeometry(radius*.72,radius,height,5);g.translate(0,height*.5,0);
  return paintGeometry(g,0x58733a);
}

function daisyGeometry(petalHex,centerHex,height,petals=7){
  const parts=[flowerStemGeometry(height,.009)];
  for(let i=0;i<petals;i++){
    const g=flowerPetalGeometry(.085,.045,petalHex);
    g.rotateZ(-.16);g.translate(.008,height,0);g.rotateY(i/petals*Math.PI*2);parts.push(g);
  }
  const center=paintGeometry(new THREE.IcosahedronGeometry(.027,1),centerHex);center.scale(1,.60,1);center.translate(0,height+.006,0);parts.push(center);
  const leaf=flowerPetalGeometry(.12,.05,0x698744);leaf.scale(.88,1,.88);leaf.rotateZ(-.62);leaf.rotateY(.9);leaf.translate(0,height*.30,0);parts.push(leaf);
  return mergeGeometries(parts,false);
}

function spikeGeometry(colorHex,height){
  const parts=[flowerStemGeometry(height,.007)];
  const c=new THREE.Color(colorHex);
  for(let i=0;i<9;i++){
    const col=c.clone().multiplyScalar(.80+i*.025);
    const g=paintGeometry(new THREE.IcosahedronGeometry(.020*(1-i/14),0),col);
    g.scale(1,1.4,1);g.translate(Math.sin(i*2.4)*.012,height*.61+i*height*.045,Math.cos(i*2.4)*.012);parts.push(g);
  }
  return mergeGeometries(parts,false);
}

function umbelGeometry(colorHex,height){
  const parts=[flowerStemGeometry(height,.008)];
  const c=new THREE.Color(colorHex);
  for(let i=0;i<14;i++){
    const a=i*2.4,r=Math.sqrt(i/14)*.070;
    const g=paintGeometry(new THREE.IcosahedronGeometry(.014,0),c.clone().multiplyScalar(.86+(i%4)*.035));
    g.translate(Math.cos(a)*r,height-r*r*3,Math.sin(a)*r);parts.push(g);
  }
  return mergeGeometries(parts,false);
}

export class GardenEnvironment {
  constructor(scene, { uTime, renderer }) {
    this.hostScene=scene;this.scene=scene;this.uTime=uTime;this.renderer=renderer;this.colliders=[];this.obstacles=[];this.localWaterBodies=[];this.uPlayer={value:new THREE.Vector3()};
    this.space='world';this._collisionSpace='garden';this.homeCollisionResolver=null;this.stableCollisionResolver=null;
    this.bounds={minX:-12.55,maxX:12.55,minZ:-13.55,maxZ:11.85};this.rand=seededRandom(20260924);
    this.isTouch=matchMedia('(pointer: coarse)').matches||('ontouchstart' in window);
    // v0.3.30 authorized greenhouse-progression override: reserve the full future plot
    // while keeping the rest of the locked v0.3.13 world composition unchanged.
    this.greenhouse={x:6.5,z:-11.2,w:4.8,l:3.1};
    this.greenhouseCollision={segments:null,x:this.greenhouse.x,z:this.greenhouse.z};
    this.fenceCollision={shapes:null,x:0,z:0};
    // Gameplay landmarks get soft vegetation clearings so they remain readable
    // without turning the garden into obvious empty circles.
    this.readabilityClearings=[
      {x:.6,z:10.8,r:1.55,cut:.70},
      {x:8.25,z:4.15,r:1.18,cut:.88},
      {x:-8.4,z:2.0,r:1.18,cut:.88},
      {x:8.2,z:-3.5,r:1.18,cut:.88},
      {x:-3.9,z:7.55,r:1.22,cut:.92},
      {x:6.0,z:7.65,r:1.55,cut:.94},
      {x:9.75,z:-4.65,r:1.25,cut:.82}
    ];
    this.treeDefs=[
      {x:-10.1,z:-9.8,s:1.18,t:'round'},{x:-10.8,z:-3.7,s:.96,t:'birch'},
      {x:-9.5,z:5.4,s:1.06,t:'round'},{x:10.6,z:5.7,s:1.02,t:'birch'},
      {x:10.7,z:-1.9,s:1.10,t:'round'},{x:1.8,z:-12.5,s:.92,t:'round'},
      {x:-5.6,z:-12.0,s:.94,t:'birch'},{x:9.9,z:10.0,s:.83,t:'round'}
    ];
    this.buildSky();
    this.privateRoot=new THREE.Group();this.privateRoot.name='PRIVATE_GARDEN_ROOT';this.hostScene.add(this.privateRoot);
    this.scene=this.privateRoot;this._collisionSpace='garden';
    this.buildGround();this.buildPath();this.buildGreenhouse();this.buildFence();
    this.scene=this.hostScene;this._collisionSpace='world';
    this.sharedLandscape=new SharedLandscape(this);this.worldLandmarks=this.sharedLandscape.landmarks;
    this.scene=this.privateRoot;this._collisionSpace='garden';
    this.buildTrees();this.buildBackdropTrees();this.buildWorldContextBackdrop();this.buildBushes();this.buildFeatureBeds();this.buildGrass();this.buildFlowers();this.buildStones();this.buildPollen();
    if(!new URLSearchParams(location.search).has('baseline')) { this.calmVegetation(); this.foundationSample=new FoundationSample(this); this.loadDecorativeFlowers(); }
    this.scene=this.hostScene;this._collisionSpace='world';this.setSpace('world');
  }

  setSpace(space){
    this.space=space==='garden'?'garden':'world';
    if(this.privateRoot)this.privateRoot.visible=this.space==='garden';
    if(this.sharedLandscape?.root)this.sharedLandscape.root.visible=this.space==='world';
  }
  isGardenSpace(){return this.space==='garden';}
  setHomeCollisionResolver(fn){this.homeCollisionResolver=typeof fn==='function'?fn:null;}
  groundHeight(x=0,z=0){return this.space==='garden'?0:(this.sharedLandscape?.groundHeight(x,z)??0);}
  addCollider(x,z,r){this.colliders.push({x,z,r,kind:'static',traversal:'blocked',space:this._collisionSpace||'garden'});}
  addWaterBody(body){this.localWaterBodies.push(body);return body;}
  resolveLocalWaterBody(p,body,radius){
    if(body.kind!=='organic-ellipse')return;const dx=p.x-body.cx,dz=p.z-body.cz,ux=dx/body.rx,uz=dz/body.rz,q=Math.hypot(ux,uz);if(q<1e-6){p.x=body.cx+body.rx+radius;p.z=body.cz;return;}
    const a=Math.atan2(uz,ux),edge=(body.base??.94)+(body.waveA??.015)*Math.sin(a*(body.freqA??5))+(body.waveB??.009)*Math.sin(a*(body.freqB??9)+(body.phaseB??1.4));
    const bx=body.cx+Math.cos(a)*body.rx*edge,bz=body.cz+Math.sin(a)*body.rz*edge,nx=Math.cos(a)/body.rx,nz=Math.sin(a)/body.rz,nl=Math.max(1e-5,Math.hypot(nx,nz)),tx=bx+nx/nl*radius,tz=bz+nz/nl*radius;
    // If the character centre is inside the visible shoreline + body radius, project it to dry ground.
    const targetQ=Math.hypot((tx-body.cx)/body.rx,(tz-body.cz)/body.rz);if(q<targetQ){p.x=tx;p.z=tz;}
  }
  addObstacle({x,z,r,height,kind='obstacle',traversal='blocked'}){
    const obstacle={x,z,r,height,kind,traversal,space:this._collisionSpace||'garden'};
    this.colliders.push(obstacle);
    this.obstacles.push(obstacle);
    return obstacle;
  }
  setGreenhouseCollision(shapes,x=this.greenhouse.x,z=this.greenhouse.z){
    this.greenhouseCollision={shapes:shapes||null,x,z};
  }
  resolveGreenhouseShape(p,gc,shape,radius){
    let lx=p.x-gc.x,lz=p.z-gc.z;
    if(shape.kind==='solid'){
      const minX=shape.minX,maxX=shape.maxX,minZ=shape.minZ,maxZ=shape.maxZ;
      const qx=Math.min(maxX,Math.max(minX,lx)),qz=Math.min(maxZ,Math.max(minZ,lz));
      let dx=lx-qx,dz=lz-qz,d2=dx*dx+dz*dz;
      if(d2>1e-10){
        if(d2>=radius*radius)return;
        const d=Math.sqrt(d2),k=(radius-d)/d;lx+=dx*k;lz+=dz*k;
      }else{
        const dl=Math.abs(lx-minX),dr=Math.abs(maxX-lx),db=Math.abs(lz-minZ),df=Math.abs(maxZ-lz);
        const m=Math.min(dl,dr,db,df);
        if(m===dl)lx=minX-radius;else if(m===dr)lx=maxX+radius;else if(m===db)lz=minZ-radius;else lz=maxZ+radius;
      }
      p.x=gc.x+lx;p.z=gc.z+lz;return;
    }
    const ax=shape.ax,az=shape.az,bx=shape.bx,bz=shape.bz;
    const vx=bx-ax,vz=bz-az,den=vx*vx+vz*vz;
    let t=den>1e-8?((lx-ax)*vx+(lz-az)*vz)/den:0;t=t<0?0:t>1?1:t;
    const cx=ax+vx*t,cz=az+vz*t,dx=lx-cx,dz=lz-cz,d=Math.hypot(dx,dz);
    const rr=radius+(shape.half??.09);
    if(d>=rr)return;
    const len=Math.max(1e-4,Math.hypot(vx,vz));
    const nx=d>1e-4?dx/d:-vz/len,nz=d>1e-4?dz/d:vx/len;
    p.x=gc.x+cx+nx*rr;p.z=gc.z+cz+nz*rr;
  }
  resolveCollisions(p,radius=.30){
    const space=this.space;
    for(const c of this.colliders){
      if((c.space||'garden')!==space)continue;
      const dx=p.x-c.x,dz=p.z-c.z,r=c.r+radius,d2=dx*dx+dz*dz;
      if(d2<r*r){const d=Math.sqrt(d2)||1e-4;p.x=c.x+dx/d*r;p.z=c.z+dz/d*r;}
    }
    if(space==='garden'){
      const gc=this.greenhouseCollision;
      if(gc?.shapes){
        // Multiple passes make connected wall corners stable: resolving one wall
        // cannot leave the character embedded in its neighbour on the same frame.
        for(let pass=0;pass<3;pass++)for(const shape of gc.shapes)this.resolveGreenhouseShape(p,gc,shape,radius);
      }
      const fc=this.fenceCollision;
      if(fc?.shapes){
        for(let pass=0;pass<2;pass++)for(const shape of fc.shapes)this.resolveGreenhouseShape(p,fc,shape,radius);
      }
      for(const body of this.localWaterBodies)this.resolveLocalWaterBody(p,body,radius);
    }else if(this.sharedLandscape)this.sharedLandscape.resolveCollisions(p,radius);
    this.homeCollisionResolver?.(p,radius,space);
    if(space==='world'){this.orangeryCollisionResolver?.(p,radius);this.stableCollisionResolver?.(p,radius);}
  }

  pathX(z){return Math.sin((10.8-z)*.34)*.52;}
  pathDistance(x,z){
    let d=99;
    if(z<=11.5&&z>=-8.9)d=Math.abs(x-this.pathX(z));
    // R60.2: the greenhouse branch follows the placed greenhouse (GardenBuildSystem). null = authored branch.
    const b=this.greenhouseBranch;
    if(!b){if(z>-9.55&&z<-8.05&&x>-0.2&&x<6.8)d=Math.min(d,Math.abs(z+8.8));}
    else for(let i=0;i<b.length-1;i++){const ax=b[i].x,az=b[i].z,vx=b[i+1].x-ax,vz=b[i+1].z-az,L=vx*vx+vz*vz||1;let t=((x-ax)*vx+(z-az)*vz)/L;t=t<0?0:t>1?1:t;d=Math.min(d,Math.hypot(x-ax-vx*t,z-az-vz*t));}
    return d;
  }
  // R60.2: move the greenhouse branch path (stones + ground paint). Default (null) restores the authored path.
  setGreenhouseBranch(points){
    this.greenhouseBranch=points&&points.length>1?points:null;
    for(const m of this.branchStones||[])m.visible=!this.greenhouseBranch;
    for(const m of this.dynamicBranchStones||[])m.parent?.remove(m);
    this.dynamicBranchStones=[];
    if(this.greenhouseBranch){
      let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
      const b=this.greenhouseBranch;let carry=.6;
      for(let i=0;i<b.length-1;i++){
        const ax=b[i].x,az=b[i].z,vx=b[i+1].x-ax,vz=b[i+1].z-az,len=Math.hypot(vx,vz),yaw=Math.atan2(vx,vz);
        for(let s=carry;s<len;s+=.86){const t=s/len,m=this.makePathStone(ax+vx*t+(rnd()-.5)*.08,az+vz*t+(rnd()-.5)*.08,.30+rnd()*.10,.18+rnd()*.07,yaw+Math.PI/2+(rnd()-.5)*.4,rnd);this.dynamicBranchStones.push(m);carry=s+.86-len;}
      }
    }
    this.repaintGround?.();
  }

vegetationBlocked(x,z,pad=0){
  const gh=this.greenhouse;if(Math.abs(x-gh.x)<gh.w+.55+pad&&Math.abs(z-gh.z)<gh.l+.55+pad)return true;
  return this.pathDistance(x,z)<.72+pad;
}

grassReadabilityDensity(x,z){
  let density=1;
  const pd=this.pathDistance(x,z);
  if(pd<1.34){
    const edge=smooth(.72,1.34,pd);
    density*=THREE.MathUtils.lerp(.10,1,edge);
  }
  for(const c of this.readabilityClearings){
    const d=Math.hypot(x-c.x,z-c.z);
    if(d<c.r){
      const center=1-smooth(0,c.r,d);
      density*=1-center*c.cut;
    }
  }
  return THREE.MathUtils.clamp(density,.04,1);
}

bedInfluence(x,z){
  const beds=[[5.1,-8.3,2.3],[7.4,-8.0,1.8],[3.1,-5.6,2.5],[-4.7,6.4,2.7],[-7.6,-6.0,2.5],[8.7,8.4,2.3],[-9.0,8.6,2.2]];
  let k=0;
  for(const [bx,bz,r] of beds){
    const d=Math.hypot(x-bx,z-bz);
    k=Math.max(k,1-smooth(r*.35,r,d));
  }
  return k;
}


buildSky(){
  // Claude Garden Prototype v2 visual baseline.
  const HORIZON=0xdde5d3;this.scene.background=new THREE.Color(HORIZON);this.scene.fog=new THREE.Fog(HORIZON,30,250);
  const sunDir=new THREE.Vector3(-.62,.70,.36).normalize();
  const sky=new THREE.Mesh(new THREE.SphereGeometry(300,32,16),createSkyMaterial(HORIZON,sunDir));sky.frustumCulled=false;sky.renderOrder=-100;this.scene.add(sky);
  if(this.renderer){
    const pm=new THREE.PMREMGenerator(this.renderer),es=new THREE.Scene();es.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),createSkyMaterial(HORIZON,sunDir)));
    this.scene.environment=pm.fromScene(es,.04).texture;this.scene.environmentIntensity=.50;pm.dispose();
  }
  const hemi=new THREE.HemisphereLight(0xd6e5e8,0x5e6a3c,.95);this.scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff0d8,2.7);sun.position.copy(sunDir).multiplyScalar(40);sun.target.position.set(0,0,-1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-21,right:21,top:21,bottom:-21,near:5,far:90});sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;sun.shadow.radius=3;this.scene.add(sun,sun.target);
  this.sky=sky;this.hemi=hemi;this.sun=sun;this.sunDir=sunDir.clone();
}

buildGround(){

    const make=(size,seg,far=false)=>{
      const g=new THREE.PlaneGeometry(size,size,seg,seg);g.rotateX(-Math.PI/2);const p=g.attributes.position;const cols=new Float32Array(p.count*3);
      const dark=color(far?0x667d46:0x4d6d31),mid=color(far?0x7f9156:0x5e793f),dry=color(0x829555),soil=color(0xa56e43),c=new THREE.Color();
      const baseline=new URLSearchParams(location.search).has('baseline');
      // R60.2: the colour pass is a function so a moved greenhouse branch can repaint the soil.
      const shade=()=>{for(let i=0;i<p.count;i++){
        const x=p.getX(i),z=p.getZ(i);const n=(Math.sin(x*.46)+Math.cos(z*.39)+Math.sin((x-z)*1.13)+Math.cos((x+z)*.18))*.125+.50;
        c.copy(dark).lerp(mid,THREE.MathUtils.clamp(n,0,1));
        const dryK=THREE.MathUtils.clamp((Math.sin(x*1.7-z*.8)+1)*.18,0,.28);c.lerp(dry,dryK);
        if(!far){const pd=this.pathDistance(x,z);if(pd<1.18)c.lerp(soil,(1-THREE.MathUtils.smoothstep(pd,.42,1.18))*.84);}
        if(!far&&!baseline){
          // v0.3.8 candidate inherits the recessed pond basin and applies water/path cleanup.
          const pond=Math.hypot((x+3.85)/1.65,(z+1.6)/2.35),organic=pond+.028*Math.sin(x*2+z*3);
          const basin=1-smooth(.72,1.28,organic);
          p.setY(i,-.18*basin);
          // Continuous material blending on the sculpted bank. The outer band remains dry ground.
          const wet=1-smooth(.82,1.08,organic),bank=1-smooth(1.02,1.42,organic);
          c.lerp(color(0x756247),bank*.72);c.lerp(color(0x2b6f8f),wet*.62);
          const path=Math.abs(x-(-6.1+.35*Math.sin(z*1.1)));
          const ends=THREE.MathUtils.smoothstep(z,-4.5,-3.65)*(1-THREE.MathUtils.smoothstep(z,2.75,3.55));
          const trail=(1-THREE.MathUtils.smoothstep(path,.4,.88))*ends;
          c.lerp(color(0xad784b),trail);
        }
        cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
      }};
      shade();
      g.setAttribute('color',new THREE.BufferAttribute(cols,3));
      if(!far)this.repaintGround=()=>{shade();g.attributes.color.needsUpdate=true;};const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0});const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;mesh.position.y=far?-.045:-.02;this.scene.add(mesh);
    };
    make(36,216,false);
  }

  buildPath(){
    const stonePalette=[0x747167,0x817e74,0x908b81,0x6c6a61];
    const makeStone=(x,z,rx,rz,rotY=0,rand=this.rand)=>{
      const g=new THREE.DodecahedronGeometry(1,0);
      const mat=new THREE.MeshStandardMaterial({color:stonePalette[Math.floor(rand()*stonePalette.length)],roughness:.99,flatShading:true});
      const m=new THREE.Mesh(g,mat);
      const sy=.032+rand()*.015;
      m.position.set(x,sy*.58,z);
      m.scale.set(rx,sy,rz);
      m.rotation.set((rand()-.5)*.05,rotY+(rand()-.5)*.22,(rand()-.5)*.04);
      m.castShadow=true;m.receiveShadow=true;this.privateRoot.add(m);return m;
    };
    this.makePathStone=makeStone;this.branchStones=[];
    for(let i=0;i<24;i++){
      const z=10.9-i*.86,x=this.pathX(z)+(this.rand()-.5)*.10;
      makeStone(x,z,.34+this.rand()*.12,.20+this.rand()*.09,this.rand()*.55);
    }
    for(let i=0;i<11;i++){
      const t=i/10,x=.05+(this.greenhouse.x-.55)*t+(this.rand()-.5)*.04,z=-8.82+Math.sin(t*Math.PI)*.10;
      this.branchStones.push(makeStone(x,z,.30+this.rand()*.10,.18+this.rand()*.07,.12+this.rand()*.48));
    }
  }

  buildGreenhouse(){
    // The legacy locked greenhouse mesh is intentionally replaced only within this
    // authorized scope. The real L1/L2/L3 GLBs are owned by GreenhouseProgressionSystem.
    // Keeping an anchor here lets world-generation reserve the final footprint before
    // those assets load, preventing vegetation/interior clipping across upgrades.
    const gh=this.greenhouse,root=new THREE.Group();
    root.name='GREENHOUSE_PROGRESSION_WORLD_ANCHOR';
    root.position.set(gh.x,0,gh.z);
    root.userData.unlockState='progression-system';
    this.greenhouseRoot=root;
    this.scene.add(root);
  }


  buildFence(){
    const wood=new THREE.MeshStandardMaterial({color:0xa99a7a,roughness:.93});
    const postGeo=new THREE.BoxGeometry(.095,.78,.095),railXGeo=new THREE.BoxGeometry(25.8,.075,.065),railZGeo=new THREE.BoxGeometry(.065,.075,25.1);
    const addPost=(x,z)=>{const p=new THREE.Mesh(postGeo,wood);p.position.set(x,.39,z);p.castShadow=true;this.scene.add(p);};
    const gateX=this.pathX(12.25),gateHalf=1.15;
    for(let x=-12.9;x<=12.9;x+=1.15){addPost(x,-13.95);if(Math.abs(x-gateX)>gateHalf)addPost(x,12.25);}
    for(let z=-12.8;z<=11.5;z+=1.15){addPost(-12.95,z);addPost(12.95,z);}
    for(const y of [.27,.58]){
      const a=new THREE.Mesh(railXGeo,wood);a.position.set(0,y,-13.95);a.castShadow=true;this.scene.add(a);
      const leftW=gateX-gateHalf+12.9,rightW=12.9-(gateX+gateHalf);
      if(leftW>.1){const b=new THREE.Mesh(new THREE.BoxGeometry(leftW,.075,.065),wood);b.position.set(-12.9+leftW/2,y,12.25);b.castShadow=true;this.scene.add(b);}
      if(rightW>.1){const b=new THREE.Mesh(new THREE.BoxGeometry(rightW,.075,.065),wood);b.position.set(gateX+gateHalf+rightW/2,y,12.25);b.castShadow=true;this.scene.add(b);}
      const c=new THREE.Mesh(railZGeo,wood);c.position.set(-12.95,y,-.85);c.castShadow=true;this.scene.add(c);const d=c.clone();d.position.x=12.95;this.scene.add(d);
    }
    // WORLD V2: the gate aligns the locked garden path with the Claude-derived shared landscape.
    for(const side of [-1,1])addPost(gateX+side*gateHalf,12.25);
    this.fenceCollision={x:0,z:0,shapes:[
      {kind:'segment',ax:-12.95,az:-13.95,bx:12.95,bz:-13.95,half:.055},
      {kind:'segment',ax:-12.95,az:-13.95,bx:-12.95,bz:12.25,half:.055},
      {kind:'segment',ax:12.95,az:-13.95,bx:12.95,bz:12.25,half:.055},
      {kind:'segment',ax:-12.95,az:12.25,bx:gateX-gateHalf,bz:12.25,half:.055},
      {kind:'segment',ax:gateX+gateHalf,az:12.25,bx:12.95,bz:12.25,half:.055}
    ]};
  }

  buildTrees(){
    const bark=new THREE.MeshStandardMaterial({color:0x675442,roughness:.92}),birchBark=new THREE.MeshStandardMaterial({color:0xd8d2bf,roughness:.9});
    const foliage=patchMaterial(new THREE.MeshStandardMaterial({color:0x718b4e,roughness:.82}),{wind:.035,uTime:this.uTime,rim:0x25341b,rimPower:2.6});
    for(const d of this.treeDefs){
      const birch=d.t==='birch',H=(birch?3.0:2.15)*d.s,trunk=new THREE.Mesh(new THREE.CylinderGeometry((birch?.10:.16)*d.s,(birch?.14:.23)*d.s,H,8),birch?birchBark:bark);
      trunk.position.set(d.x,H/2,d.z);trunk.castShadow=true;this.scene.add(trunk);
      const blobs=birch?5:6;
      for(let i=0;i<blobs;i++){
        const r=(birch?.62:.78)*d.s*(.84+this.rand()*.28),m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),foliage);
        const a=i/blobs*Math.PI*2+this.rand()*.55,spread=(birch?.62:.78)*d.s*(i===0?.25:.72);
        m.position.set(d.x+Math.cos(a)*spread,(birch?2.35:1.95)*d.s+(i%3)*.38*d.s,d.z+Math.sin(a)*spread*.8);m.scale.set(1,.85+this.rand()*.25,.92);m.rotation.y=this.rand()*Math.PI;m.castShadow=true;m.receiveShadow=true;this.scene.add(m);
      }
      this.addCollider(d.x,d.z,.48*d.s);
    }
  }

  buildBackdropTrees(){
    const trunkGeo=new THREE.CylinderGeometry(.08,.12,.85,6),trunkMat=new THREE.MeshStandardMaterial({color:0x514232,roughness:1});
    const coneGeo=new THREE.ConeGeometry(1,1.5,8,2),coneMat=patchMaterial(new THREE.MeshStandardMaterial({color:0x425d34,roughness:.93,flatShading:true}),{wind:.018,uTime:this.uTime,rim:0x22301c,rimPower:2.8});
    const count=this.isTouch?34:46,trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,count),tiers=[0,1,2].map(()=>new THREE.InstancedMesh(coneGeo,coneMat,count));
    const o=new THREE.Object3D();
    let made=0;
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2+(this.rand()-.5)*.16,r=15.7+this.rand()*8.5,s=.95+this.rand()*1.15,x=Math.cos(a)*r,z=Math.sin(a)*r*.92-1.5;
      if(this.sharedLandscape?.pathDistance(x,z)<3.2)continue;
      o.position.set(x,.40*s,z);o.scale.set(s,s,s);o.rotation.y=this.rand()*Math.PI;o.updateMatrix();trunks.setMatrixAt(made,o.matrix);
      for(let k=0;k<3;k++){const rs=(1.12-k*.23)*s,hs=(1.1-k*.06)*s;o.position.set(x,(.72+k*.67)*s,z);o.scale.set(rs,hs,rs);o.rotation.y=this.rand()*Math.PI;o.updateMatrix();tiers[k].setMatrixAt(made,o.matrix);}
      this.addObstacle({x,z,r:1.10*s,height:3.0*s,kind:'backdrop-conifer'});
      made++;
    }
    trunks.count=made;tiers.forEach(m=>m.count=made);trunks.castShadow=true;this.scene.add(trunks);tiers.forEach(m=>{m.castShadow=true;m.receiveShadow=true;this.scene.add(m);});
  }

  buildWorldContextBackdrop(){
    // R21D: the private garden remains a separate gameplay space, but it should still
    // feel embedded in the shared world. This is a static, fog-softened LOD backdrop:
    // no colliders, AI, wildlife, interactions or shared-world update cost.
    const root=new THREE.Group();root.name='PRIVATE_GARDEN_WORLD_CONTEXT_BACKDROP';root.userData.nonInteractive=true;this.privateRoot.add(root);this.worldContextRoot=root;
    const terrainMat=new THREE.MeshStandardMaterial({color:0x718653,roughness:1,transparent:true,opacity:.72});
    const ring=new THREE.Mesh(new THREE.RingGeometry(14.7,92,72,3),terrainMat);ring.rotation.x=-Math.PI/2;ring.position.y=-.08;ring.receiveShadow=false;root.add(ring);

    const trunkMat=new THREE.MeshStandardMaterial({color:0x665842,roughness:1,transparent:true,opacity:.72});
    const crownMat=new THREE.MeshStandardMaterial({color:0x4f6940,roughness:1,flatShading:true,transparent:true,opacity:.62});
    const trunkGeo=new THREE.CylinderGeometry(.10,.16,1.15,6),crownGeo=new THREE.ConeGeometry(.92,1.65,7,1);
    const count=this.isTouch?24:36,trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,count),crowns=new THREE.InstancedMesh(crownGeo,crownMat,count),o=new THREE.Object3D();
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2+this.rand()*.16,r=27+this.rand()*35,scale=.95+this.rand()*1.8,x=Math.cos(a)*r,z=Math.sin(a)*r*.88-4;
      o.position.set(x,.55*scale,z);o.scale.set(scale,scale,scale);o.rotation.y=this.rand()*Math.PI;o.updateMatrix();trunks.setMatrixAt(i,o.matrix);
      o.position.set(x,1.75*scale,z);o.scale.set(1.25*scale,1.55*scale,1.25*scale);o.rotation.y=this.rand()*Math.PI;o.updateMatrix();crowns.setMatrixAt(i,o.matrix);
    }
    trunks.frustumCulled=crowns.frustumCulled=true;root.add(trunks,crowns);

    // Compressed silhouettes of real shared-world landmarks. The backdrop is context,
    // not navigable geometry; positions preserve broad direction from the home gate.
    const gate=this.sharedLandscape?.landmarks?.gate||{x:0,z:14.3},scale=.42;
    const map=(p)=>new THREE.Vector3((p.x-gate.x)*scale,0,(p.z-gate.z)*scale);
    const soft=(hex,opacity=.46)=>new THREE.MeshStandardMaterial({color:hex,roughness:.92,transparent:true,opacity,depthWrite:true});
    const addLake=(p)=>{const m=new THREE.Mesh(new THREE.CircleGeometry(5.4,40),soft(0x71959b,.42));m.rotation.x=-Math.PI/2;m.scale.set(1.55,1,1);m.position.copy(map(p));m.position.y=-.045;root.add(m);};
    const addCabin=(p)=>{const g=new THREE.Group(),wood=soft(0x6b5741,.48),roof=soft(0x465b37,.50),body=new THREE.Mesh(new THREE.BoxGeometry(3.4,1.7,2.7),wood);body.position.y=.85;g.add(body);const r=new THREE.Mesh(new THREE.ConeGeometry(2.45,1.25,4),roof);r.position.y=2.05;r.rotation.y=Math.PI/4;r.scale.z=.82;g.add(r);g.position.copy(map(p));g.scale.setScalar(.78);root.add(g);};
    const addOrangery=(p)=>{const g=new THREE.Group(),glass=soft(0x9bb8a7,.28),frame=soft(0x4d5147,.46);const shell=new THREE.Mesh(new THREE.CylinderGeometry(2.8,3.3,2.25,10),glass);shell.position.y=1.1;g.add(shell);const cap=new THREE.Mesh(new THREE.ConeGeometry(3.0,1.55,10),glass);cap.position.y=3.0;g.add(cap);const stem=new THREE.Mesh(new THREE.CylinderGeometry(.11,.15,3.6,6),frame);stem.position.y=1.8;g.add(stem);g.position.copy(map(p));g.scale.setScalar(.82);root.add(g);};
    const addWaterfall=(p)=>{const g=new THREE.Group(),water=soft(0xb8cdd0,.34),rock=soft(0x77796f,.42);const slab=new THREE.Mesh(new THREE.BoxGeometry(3.6,3.8,.32),water);slab.position.y=1.8;g.add(slab);for(const x of [-2.2,2.2]){const r=new THREE.Mesh(new THREE.DodecahedronGeometry(1.25,0),rock);r.position.set(x,.7,0);g.add(r);}g.position.copy(map(p));g.scale.setScalar(.72);root.add(g);};
    const L=this.sharedLandscape?.landmarks||{};if(L.lake)addLake(L.lake);if(L.cabin)addCabin(L.cabin);if(L.orangery)addOrangery(L.orangery);if(L.waterfall)addWaterfall(L.waterfall);
  }


buildBushes(){
  const geo=new THREE.IcosahedronGeometry(.55,1),mat=patchMaterial(new THREE.MeshStandardMaterial({color:0x668044,roughness:.9}),{wind:.025,uTime:this.uTime,rim:0x26371d,rimPower:2.8});
  const centers=[[-11.8,1.0],[-11.5,-2.2],[-8.3,10.8],[-3.0,11.0],[3.2,11.0],[11.7,8.1],[11.8,-8.8],[8.8,-12.7],[-2.7,-12.8],[3.6,-11.9],[3.8,-7.6],[9.5,-6.6],[5.5,-7.7],[-6.5,6.7],[-8.4,-5.4]];
  const gh=this.greenhouse;
  const activeCenters=centers.filter(([x,z])=>!(Math.abs(x-gh.x)<gh.w+.45&&Math.abs(z-gh.z)<gh.l+.45));
  const count=activeCenters.length*6,inst=new THREE.InstancedMesh(geo,mat,count),o=new THREE.Object3D(),greens=[0x5a783b,0x708c4b,0x859d5a,0x4e6a37,0x96ab6a];let n=0;
  activeCenters.forEach(([cx,cz],ci)=>{for(let j=0;j<6;j++){const a=this.rand()*Math.PI*2,r=this.rand()*.72,s=.60+this.rand()*.62;o.position.set(cx+Math.cos(a)*r,.42*s,cz+Math.sin(a)*r);o.scale.set(s*(.9+this.rand()*.20),s*(.78+this.rand()*.26),s);o.rotation.y=this.rand()*Math.PI;o.updateMatrix();inst.setMatrixAt(n,o.matrix);inst.setColorAt(n,new THREE.Color(greens[(ci+j)%greens.length]));n++;}});
  inst.count=n;inst.castShadow=true;inst.receiveShadow=true;this.scene.add(inst);
  activeCenters.forEach(([x,z])=>this.addCollider(x,z,.64));
}

buildFeatureBeds(){
  const beds=[[5.1,-8.3,2.2],[7.4,-8.0,1.7],[3.1,-5.6,2.5],[-4.7,6.4,2.7],[-7.6,-6.0,2.5],[8.7,8.4,2.2],[-9.0,8.6,2.1]];
  const shrubGeo=new THREE.IcosahedronGeometry(.32,1),shrubMat=patchMaterial(new THREE.MeshStandardMaterial({color:0x6f884c,roughness:.88}),{wind:.03,uTime:this.uTime,rim:0x2c3f1f,rimPower:2.5});
  const shrubCount=beds.length*5,shrubs=new THREE.InstancedMesh(shrubGeo,shrubMat,shrubCount),o=new THREE.Object3D();
  const shrubPal=[0x617f42,0x728f4c,0x88a45e,0x9fb56e];let n=0;
  for(const [cx,cz,r] of beds){
    const placed=[];
    for(let i=0;i<5;i++){
      let x=cx,z=cz,ok=false;
      for(let k=0;k<24;k++){
        const a=this.rand()*Math.PI*2,rr=Math.sqrt(this.rand())*r*.54;x=cx+Math.cos(a)*rr;z=cz+Math.sin(a)*rr;
        if(this.vegetationBlocked(x,z,.10))continue;
        if(placed.some(([px,pz])=>Math.hypot(px-x,pz-z)<.42))continue;
        ok=true;break;
      }
      if(!ok)continue;
      placed.push([x,z]);
      const s=.40+this.rand()*.28;
      o.position.set(x,.19*s,z);o.scale.set(s*(.95+this.rand()*.12),s*(.72+this.rand()*.16),s);o.rotation.y=this.rand()*Math.PI;o.updateMatrix();
      shrubs.setMatrixAt(n,o.matrix);shrubs.setColorAt(n,new THREE.Color(shrubPal[(i+Math.floor(cx*2))%shrubPal.length]));n++;
    }
  }
  shrubs.count=n;shrubs.castShadow=true;shrubs.receiveShadow=true;this.scene.add(shrubs);

  // v0.3.9: remove the oversized white ball flowers from feature beds.
  // Decorative imported flower assets are loaded separately so the beds stay readable.
}

buildGrass(){
    // Readability pass: shorter meadow grass, more negative space and sparse tall accents.
    // The garden should still feel lush, but characters, paths and pickups must read clearly.
    // Five slender, tapering blades share a small root cluster.
    const pos=[],idx=[];
    for(let blade=0;blade<5;blade++){
      const a=blade*2.399,h=.68+(blade%3)*.16,bend=.14+(blade%2)*.09,base=pos.length/3;
      for(let level=0;level<4;level++){
        const t=level/4,w=.018*(1-t)*(.9+(blade%2)*.2),r=bend*t*t,offset=(blade-2)*.012;
        for(const side of [-1,1])pos.push(Math.cos(a)*r+Math.sin(a)*w*side+offset,h*t,Math.sin(a)*r-Math.cos(a)*w*side);
      }
      pos.push(Math.cos(a)*bend+(blade-2)*.012,h,Math.sin(a)*bend);
      for(let j=0;j<3;j++){const v=base+j*2;idx.push(v,v+1,v+2,v+2,v+1,v+3);}idx.push(base+6,base+7,base+8);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
    const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92,side:THREE.DoubleSide});
    mat.onBeforeCompile=shader=>{
      shader.uniforms.uTime=this.uTime;shader.uniforms.uPlayer=this.uPlayer;
      shader.vertexShader='uniform float uTime; uniform vec3 uPlayer;\n'+shader.vertexShader.replace('#include <project_vertex>',`
        vec4 gw=modelMatrix*instanceMatrix*vec4(transformed,1.0);
        float hh=max(position.y,0.0);hh*=hh;
        float wv=sin(uTime*1.6+gw.x*0.35+gw.z*0.25)*0.6+sin(uTime*2.7+gw.x*0.9-gw.z*0.7)*0.25+0.35;
        gw.x+=wv*0.070*hh;gw.z+=wv*0.045*hh;
        vec2 dp=gw.xz-uPlayer.xz;float dl=length(dp);
        float push=(1.0-smoothstep(0.0,0.78,dl))*0.34*hh;
        gw.xz+=normalize(dp+vec2(1e-4))*push;gw.y-=push*0.55;
        vec4 mvPosition=viewMatrix*gw;gl_Position=projectionMatrix*mvPosition;`);
    };
    mat.customProgramCacheKey=()=>'reference-grass-player-push-v1';
    const capacity=this.isTouch?7000:10000,inst=new THREE.InstancedMesh(g,mat,capacity),o=new THREE.Object3D();
    const palette=[0x496d31,0x5c7a38,0x6f8b43,0x82984f,0x96a65e,0xa5ad68];
    let made=0;
    const attempts=this.isTouch?12500:18500;
    for(let i=0;i<attempts&&made<capacity;i++){
      const x=-12.45+this.rand()*24.9,z=-13.35+this.rand()*25.1;
      if(this.vegetationBlocked(x,z,.02))continue;
      const patch=.64+.16*Math.sin(x*.63+z*.21)+.12*Math.cos(z*.87-x*.29)+.08*Math.sin((x+z)*1.31);
      const bed=this.bedInfluence(x,z);
      let density=THREE.MathUtils.clamp((patch+bed*.12)*1.34,.44,1.0)*this.grassReadabilityDensity(x,z);
      if(this.rand()>density)continue;
      const edge=Math.min(x-this.bounds.minX,this.bounds.maxX-x,z-this.bounds.minZ,this.bounds.maxZ-z);
      let h=.18+this.rand()*.23;
      if(this.rand()<.14)h+=.08+this.rand()*.10;
      if(edge<1.35)h*=1.20;
      if(bed>.45)h*=.92;
      const w=.68+this.rand()*.62;
      o.position.set(x,0,z);
      o.rotation.y=this.rand()*Math.PI*2;
      o.rotation.x=(this.rand()-.5)*.14;
      o.rotation.z=(this.rand()-.5)*.08;
      o.scale.set(w,h,w);
      o.updateMatrix();
      inst.setMatrixAt(made,o.matrix);
      inst.setColorAt(made,new THREE.Color(palette[Math.floor(this.rand()*palette.length)]));
      made++;
    }
    inst.count=made;inst.userData.calmType="grass";inst.receiveShadow=true;this.scene.add(inst);

    const wispGeo=new THREE.PlaneGeometry(.055,.58,1,3);wispGeo.translate(0,.29,0);
    const wispMat=patchMaterial(new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,side:THREE.DoubleSide}),{wind:.105,uTime:this.uTime});
    const wispCapacity=this.isTouch?650:950,wisps=new THREE.InstancedMesh(wispGeo,wispMat,wispCapacity);
    const wispPalette=[0x5b7b39,0x6f8b43,0x849950,0x9eaa62];
    made=0;
    for(let i=0;i<wispCapacity*5&&made<wispCapacity;i++){
      const x=-12.2+this.rand()*24.4,z=-13.0+this.rand()*24.3;
      if(this.vegetationBlocked(x,z,.10))continue;
      const density=this.grassReadabilityDensity(x,z);
      const edge=Math.min(x-this.bounds.minX,this.bounds.maxX-x,z-this.bounds.minZ,this.bounds.maxZ-z);
      const bed=this.bedInfluence(x,z);
      const chance=(edge<1.6?.64:.22)+(bed>.48?.18:0);
      if(this.rand()>chance*density)continue;
      o.position.set(x,0,z);o.rotation.y=this.rand()*Math.PI;
      o.rotation.z=(this.rand()-.5)*.18;
      const sy=.56+this.rand()*.55;
      o.scale.set(.72+this.rand()*.45,sy,1);o.updateMatrix();
      wisps.setMatrixAt(made,o.matrix);wisps.setColorAt(made,new THREE.Color(wispPalette[Math.floor(this.rand()*wispPalette.length)]));made++;
    }
    wisps.count=made;wisps.userData.calmType="wisp";this.scene.add(wisps);

    const tallGeo=new THREE.PlaneGeometry(.060,.70,1,3);tallGeo.translate(0,.35,0);
    const tallMat=patchMaterial(new THREE.MeshStandardMaterial({color:0x526f35,roughness:1,side:THREE.DoubleSide}),{wind:.12,uTime:this.uTime});
    const tallCapacity=this.isTouch?210:320,tall=new THREE.InstancedMesh(tallGeo,tallMat,tallCapacity);
    made=0;
    for(let i=0;i<tallCapacity*8&&made<tallCapacity;i++){
      const x=-12.1+this.rand()*24.2,z=-12.9+this.rand()*24.1;
      if(this.vegetationBlocked(x,z,.18))continue;
      const density=this.grassReadabilityDensity(x,z);
      const edge=Math.min(x-this.bounds.minX,this.bounds.maxX-x,z-this.bounds.minZ,this.bounds.maxZ-z);
      const bed=this.bedInfluence(x,z);
      if(edge>2.15&&bed<.54)continue;
      if(this.rand()>(.42+bed*.22)*density)continue;
      o.position.set(x,0,z);o.rotation.y=this.rand()*Math.PI;o.rotation.z=(this.rand()-.5)*.16;
      o.scale.set(.72+this.rand()*.42,.62+this.rand()*.45,1);o.updateMatrix();
      tall.setMatrixAt(made,o.matrix);made++;
    }
    tall.count=made;tall.userData.calmType="tall";this.scene.add(tall);
  }


buildFlowers(){
  // v0.3.12 keeps the reference botanical language and adds player-reactive flower bending:
  // true petal daisies, flower spikes and tiny-headed umbels in deliberate clusters.
  const material=patchMaterial(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72,side:THREE.DoubleSide}),{wind:.070,uTime:this.uTime,uPlayer:this.uPlayer,playerPush:.24,pushRadius:.88,pushDown:.44,pushHeight:.48});
  const species=[
    {name:'daisy-cream',g:daisyGeometry(0xefe8d6,0xd0a23e,.42,7),items:[]},
    {name:'daisy-pink',g:daisyGeometry(0xd4a19c,0x9a6444,.36,6),items:[]},
    {name:'daisy-gold',g:daisyGeometry(0xdcb866,0x7d5230,.46,8),items:[]},
    {name:'spike-purple',g:spikeGeometry(0x9b8fbf,.55),items:[]},
    {name:'umbel-cream',g:umbelGeometry(0xece5d2,.50),items:[]},
    {name:'umbel-pink',g:umbelGeometry(0xcf9fa3,.44),items:[]}
  ];
  const add=(sp,x,z,sc=1)=>{
    if(this.vegetationBlocked(x,z,.08)||this.pathDistance(x,z)<.88)return;
    species[sp].items.push({x,z,s:(.82+this.rand()*.38)*sc,ry:this.rand()*Math.PI*2,rx:(this.rand()-.5)*.16});
  };
  const cluster=(sp,cx,cz,count,rad,sc=1)=>{for(let i=0;i<count;i++){const a=this.rand()*Math.PI*2,r=Math.sqrt(this.rand())*rad;add(sp,cx+Math.cos(a)*r,cz+Math.sin(a)*r,sc);}};

  // Alternating path-edge colonies create the same readable botanical rhythm as the reference.
  const zs=[9.8,8.0,6.1,4.0,2.0,-.2,-2.4,-4.7,-6.7];
  zs.forEach((z,i)=>{
    const side=i%2?1:-1,cx=this.pathX(z)+side*(1.18+.26*this.rand());
    cluster(i%6,cx,z,5+Math.floor(this.rand()*4),.42+.18*this.rand(),.88+this.rand()*.18);
  });
  // Feature-bed accents and quieter secondary colonies.
  cluster(1,4.5,-7.7,7,.52,1.0);cluster(4,6.8,-7.6,8,.48,.95);cluster(3,3.0,-5.7,6,.42,.98);
  cluster(5,-4.8,6.4,7,.54,.92);cluster(0,-7.7,-6.0,6,.48,.96);cluster(2,8.8,8.2,5,.45,1.0);

  const d=new THREE.Object3D();
  for(const sp of species){
    const mesh=new THREE.InstancedMesh(sp.g,material,Math.max(1,sp.items.length));
    sp.items.forEach((it,i)=>{d.position.set(it.x,-.015,it.z);d.rotation.set(it.rx,it.ry,0);d.scale.setScalar(it.s);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);});
    if(!sp.items.length)mesh.count=0;mesh.name=`Reference flowers: ${sp.name}`;mesh.castShadow=false;mesh.receiveShadow=true;this.scene.add(mesh);
  }
}


buildStones(){
    const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.98,flatShading:true}),palette=[0x8f907f,0xa4a493,0x777a6c,0xb2aa94];
    const count=48,geo=new THREE.DodecahedronGeometry(1,0),inst=new THREE.InstancedMesh(geo,mat,count),o=new THREE.Object3D();let made=0;
    while(made<count){
      const x=-11.8+this.rand()*23.6,z=-12.7+this.rand()*23.8;
      if(this.pathDistance(x,z)<.7||this.vegetationBlocked(x,z,.08))continue;
      const r=.08+this.rand()*.22;
      const sx=r*(.9+this.rand()*.5),sy=r*(.45+this.rand()*.35),sz=r*(.8+this.rand()*.4);
      const centerY=sy*.86;
      o.position.set(x,centerY,z);o.rotation.set(this.rand(),this.rand()*Math.PI,this.rand());o.scale.set(sx,sy,sz);o.updateMatrix();
      inst.setMatrixAt(made,o.matrix);inst.setColorAt(made,new THREE.Color(palette[Math.floor(this.rand()*palette.length)]));

      // v0.1.10: stones are physically solid now. The traversal tag is metadata
      // for the future vertical movement system: tiny stones can become step-up,
      // medium rocks jumpable, and tall rocks permanently blocking.
      const height=Math.max(.05,centerY+sy*.98);
      const traversal=height<=.14?'step':(height<=.28?'jump':'blocked');
      const collisionRadius=Math.max(.07,Math.max(sx,sz)*.74);
      this.addObstacle({x,z,r:collisionRadius,height,kind:'stone',traversal});
      made++;
    }
    inst.castShadow=true;inst.receiveShadow=true;this.scene.add(inst);
  }


  buildPollen(){
    const n=this.isTouch?90:150,p=new Float32Array(n*3);for(let i=0;i<n;i++){p[i*3]=-11+this.rand()*22;p[i*3+1]=.45+this.rand()*3.0;p[i*3+2]=-11+this.rand()*21;}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));
    const m=new THREE.PointsMaterial({color:0xfff0bf,size:.025,transparent:true,opacity:.45,depthWrite:false,sizeAttenuation:true});this.pollen=new THREE.Points(g,m);this.scene.add(this.pollen);
  }

  async loadDecorativeFlowers(){
    const root=new THREE.Group();root.name='Imported decorative flowers';this.scene.add(root);this.decorativeFlowerRoot=root;
    try{
      const { GLTFLoader }=await import('three/addons/loaders/GLTFLoader.js');
      const gltf=await new GLTFLoader().loadAsync('./assets/environment/pure-poly/PP_Sunflower_04.glb');
      const base=gltf.scene;base.name='PP_Sunflower_04';
      const patchedMaterials=new Set();
      base.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;const mats=Array.isArray(m.material)?m.material:[m.material];for(const mat of mats){if(!mat||patchedMaterials.has(mat))continue;mat.roughness=Math.max(.82,mat.roughness??.82);mat.metalness=0;patchMaterial(mat,{wind:.035,uTime:this.uTime,uPlayer:this.uPlayer,playerPush:.20,pushRadius:.92,pushDown:.36,pushHeight:.38});patchedMaterials.add(mat);}}});
      const spots=[
        [4.15,-8.70,1.95,.4],[5.80,-8.85,1.78,-.6],[7.75,-8.35,2.08,.7],
        [3.45,-5.95,1.88,-.4],[-4.10,5.65,1.72,-.5],[-7.25,-6.25,1.82,-.2],[8.25,7.95,1.90,-.4]
      ];
      for(let i=0;i<spots.length;i++){
        const [x,z,s,rot]=spots[i];
        if(this.vegetationBlocked(x,z,.12))continue;
        const flower=base.clone(true);
        flower.position.set(x,0,z);
        flower.rotation.y=rot;
        flower.scale.setScalar(s);
        root.add(flower);
      }
      root.userData.source='Pure Poly - PP_Sunflower_04';
      root.userData.activeAssets=['PP_Sunflower_04'];
    }catch(error){console.error('Decorative flowers could not load',error);root.userData.loadError=String(error);}
  }

  calmVegetation(){
    // Deterministic thinning after generation preserves every gameplay/random placement.
    const matrix=new THREE.Matrix4(),pos=new THREE.Vector3(),rot=new THREE.Quaternion(),scale=new THREE.Vector3();
    for(const mesh of this.scene.children){
      const type=mesh.userData.calmType;if(!type)continue;
      if(type==='wisp'||type==='tall'){mesh.count=0;continue;}
      let kept=0;
      for(let i=0;i<mesh.count;i++){
        mesh.getMatrixAt(i,matrix);matrix.decompose(pos,rot,scale);
        const hash=Math.abs(Math.sin(i*127.1+91.7)*43758.5453)%1;
        const clear=this.grassReadabilityDensity(pos.x,pos.z);
        const rate=(type==='flowers'?.23:type==='tall'?.12:.84)*Math.max(.2,clear);
        if(hash>rate)continue;
        if(type!=='flowers')scale.y*=.9;
        matrix.compose(pos,rot,scale);mesh.setMatrixAt(kept,matrix);
        if(mesh.instanceColor){const c=new THREE.Color();mesh.getColorAt(i,c);mesh.setColorAt(kept,c);}
        kept++;
      }
      mesh.count=kept;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    }
  }

  update(dt,time,playerPos){
    if(playerPos){
      this.uPlayer.value.copy(playerPos);
      if(this.sun&&this.sunDir){this.sun.position.copy(this.sunDir).multiplyScalar(40).add(playerPos);this.sun.target.position.copy(playerPos);}
    }
    if(this.space==='world')this.sharedLandscape?.update?.(dt,time,playerPos);
    if(this.space==='garden'&&this.pollen){this.pollen.rotation.y=Math.sin(time*.07)*.04;this.pollen.position.y=Math.sin(time*.32)*.035;}
  }
}
