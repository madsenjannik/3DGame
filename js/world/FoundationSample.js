// @ts-nocheck
import * as THREE from 'three';
import { seededRandom, patchMaterial } from '../visual/VisualKit.js';

// Environment-only prototype. No inventory, harvesting or economy coupling.
export class FoundationSample {
  static contains(x,z) { return x>-8.8 && x<-1.6 && z>-5.4 && z<3.4; }
  constructor(world) {
    this.world=world; this.scene=world.scene; this.rand=seededRandom(70324);
    this.root=new THREE.Group();this.root.name='World foundation sample';
    this.clearExisting();this.scene.add(this.root);
    this.bark=this.material(0x694631);this.rockMat=new THREE.MeshStandardMaterial({color:0x777b75,roughness:1,flatShading:true});
    this.buildEarth();this.buildTree();this.buildPine();this.buildRocks();this.buildGroundcover();this.buildWater();this.loadPurePolySample();
  }
  material(color){return new THREE.MeshStandardMaterial({color,roughness:.94});}
  add(geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;this.root.add(m);return m;}
  clearExisting(){
    const o=new THREE.Object3D(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
    for(const m of [...this.scene.children]){
      if(m.isInstancedMesh){for(let i=0;i<m.count;i++){m.getMatrixAt(i,o.matrix);o.matrix.decompose(p,q,s);if(FoundationSample.contains(p.x,p.z) && !(m.userData.calmType==='grass' && Math.hypot((p.x+3.85)/1.65,(p.z+1.6)/2.35)>1.22 && Math.abs(p.x-(-6.1+.35*Math.sin(p.z*1.1)))>.82)){o.position.copy(p);o.quaternion.copy(q);o.scale.setScalar(0);o.updateMatrix();m.setMatrixAt(i,o.matrix);}}m.instanceMatrix.needsUpdate=true;}
      else if(m.isMesh&&FoundationSample.contains(m.position.x,m.position.z)){this.scene.remove(m);}
    }
    this.world.colliders=this.world.colliders.filter(c=>!FoundationSample.contains(c.x,c.z));
    this.world.obstacles=this.world.obstacles.filter(c=>!FoundationSample.contains(c.x,c.z));
  }
  buildEarth(){
    // Earth colors are blended directly into the shared ground mesh. No overlay plane.
    for(let i=0;i<8;i++){const z=2.7-i*.85,x=-6.1+.35*Math.sin(z*1.1);const m=this.rock(x,z,.40,.045,.30);m.position.y=.045;m.castShadow=false;}
  }
  branch(points,r1,r2){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const g=new THREE.TubeGeometry(curve,14,1,8,false),pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){const t=Math.floor(i/9)/14,center=curve.getPointAt(t),r=THREE.MathUtils.lerp(r1,r2,t);const v=new THREE.Vector3().fromBufferAttribute(pos,i).sub(center).multiplyScalar(r).add(center);pos.setXYZ(i,v.x,v.y,v.z);}
    g.computeVertexNormals();this.add(g,this.bark);
  }
  buildTree(){
    const x=-7.2,z=-3.05;
    this.branch([[x,0,z],[x-.16,.8,z],[x+.05,1.7,z-.05],[x+.35,2.7,z]],.29,.085);
    const tips=[];
    for(let i=0;i<8;i++){
      const a=i*2.399,r=1.05+(i%3)*.18,y=2.05+(i%3)*.43;
      const tip=[x+Math.cos(a)*r,y,z+Math.sin(a)*r];tips.push(tip);
      this.branch([[x,1.1+i*.12,z],[x+Math.cos(a)*.6,y-.45,z+Math.sin(a)*.5],tip],.13,.024);
    }
    for(let i=0;i<6;i++){const a=i*Math.PI/3;this.branch([[x,.28,z],[x+Math.cos(a)*.45,.1,z+Math.sin(a)*.45],[x+Math.cos(a)*.95,.03,z+Math.sin(a)*.95]],.13,.012);}
    this.world.addObstacle({x,z,r:.37,height:3.7,kind:'foundation-tree'});
    // Broad overlapping crown masses keep the silhouette calm at gameplay distance.
    const g=new THREE.IcosahedronGeometry(1,1);
    const vertices=g.attributes.position;
    for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i);const k=1+.11*Math.sin(x*5+z*3)*Math.cos(y*4);vertices.setXYZ(i,x*k,y*k,z*k);}g.computeVertexNormals();
    const mat=patchMaterial(new THREE.MeshStandardMaterial({color:0xffffff,roughness:.94,flatShading:true}),{wind:.018,uTime:this.world.uTime});
    const crown=new THREE.InstancedMesh(g,mat,11),o=new THREE.Object3D();
    const groups=[[-.85,2.4,.2,.85,.55,.75],[.05,2.85,.15,1.0,.66,.8],[.85,2.45,-.2,.85,.59,.7],[-.35,2.35,-.85,.85,.6,.73],[.45,2.75,-.6,.78,.62,.7],[-.95,2.6,-.6,.62,.5,.58],[.65,2.25,.65,.8,.52,.64],[-.3,2.25,.82,.86,.5,.62],[.0,3.23,-.15,.76,.45,.62],[-.62,2.98,.35,.64,.47,.55],[.57,3.0,.35,.62,.43,.59]];
    groups.forEach(([dx,y,dz,sx,sy,sz],i)=>{o.position.set(x+dx,y,z+dz);o.rotation.set(0,i*.8,(i%3-1)*.12);o.scale.set(sx,sy,sz);o.updateMatrix();crown.setMatrixAt(i,o.matrix);crown.setColorAt(i,new THREE.Color([0x426b36,0x5e803e,0x6d8b44][i%3]));});
    crown.castShadow=true;crown.receiveShadow=true;this.root.add(crown);
  }

  buildPine(){
    // Small layered silhouette at the rear edge, distinct from the broadleaf tree.
    const x=-8.15,z=-4.7;
    this.branch([[x,0,z],[x+.09,1.5,z],[x,3.6,z]],.13,.025);
    const mat=new THREE.MeshStandardMaterial({color:0x34593d,roughness:1,flatShading:true});
    for(let tier=0;tier<5;tier++){
      const y=1+tier*.5,r=.88-tier*.135,positions=[],indices=[];
      positions.push(.04,y+.93,.02);
      for(let j=0;j<10;j++){const a=j/10*Math.PI*2,rr=r*(j%2?.9:1.12);positions.push(Math.cos(a)*rr,y+(j%3)*.055,Math.sin(a)*rr);}
      for(let j=0;j<10;j++)indices.push(0,1+j,1+(j+1)%10);
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
      const m=this.add(g,mat,x,0,z);m.rotation.y=tier*.37;
    }
    this.world.addObstacle({x,z,r:.98,height:3.9,kind:'foundation-pine'});
  }

  rock(x,z,sx,sy,sz){
    const g=new THREE.IcosahedronGeometry(1,1),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+.09*Math.sin(x*8+z*4)*Math.cos(y*7);p.setXYZ(i,x*r,y*r,z*r);}g.computeVertexNormals();
    const m=this.add(g,this.rockMat,x,sy*.63,z);m.scale.set(sx,sy,sz);m.rotation.y=this.rand()*6.28;return m;
  }
  buildRocks(){
    for(const [rx,rz,sx,sy,sz] of [[-2.65,-3.6,.7,.5,.6],[-2.3,-2.7,.36,.27,.45],[-5.0,-3.9,.5,.35,.4],[-3.0,.4,.47,.27,.34],[-5.35,-.1,.39,.21,.3],[-7.65,1.6,.68,.44,.5],[-8,1,.35,.23,.3]]){
      // Keep the approved rock forms, but nudge any rock that intersects the new waterline onto the dry bank.
      let x=rx,z=rz;const ex=(x+3.85)/1.65,ez=(z+1.6)/2.35,d=Math.hypot(ex,ez);
      if(d<1.18){const k=1.18/Math.max(d,.001);x=-3.85+ex*k*1.65;z=-1.6+ez*k*2.35;}
      this.rock(x,z,sx,sy,sz);this.world.addObstacle({x,z,r:Math.max(sx,sz)*.85,height:sy*1.6,kind:'foundation-rock'});
    }
    for(let i=0;i<8;i++){const a=this.rand()*6.28,r=1.20+this.rand()*.13;const x=-3.85+Math.cos(a)*1.65*r,z=-1.6+Math.sin(a)*2.35*r,s=.055+this.rand()*.1;this.rock(x,z,s,.06,s*.8);}
  }
  buildGroundcover(){
    // One recognizable pinnate fern mesh, repeated at six deliberate edge locations.
    const positions=[],colors=[];const dark=new THREE.Color(0x39653c),light=new THREE.Color(0x72954b);
    const triangle=(a,b,c,t)=>{for(const v of [a,b,c]){positions.push(...v);const col=dark.clone().lerp(light,t);colors.push(col.r,col.g,col.b);}};
    for(let f=0;f<7;f++){
      const angle=f*2.399,span=.46+(f%3)*.075,height=.30+(f%2)*.08;
      const point=(t,side=0)=>{const r=span*t;return [Math.cos(angle)*r-Math.sin(angle)*side,Math.sin(t*Math.PI*.83)*height+.045,Math.sin(angle)*r+Math.cos(angle)*side];};
      // Narrow central stem follows the rising, arching frond.
      for(let j=0;j<9;j++){const t=j/9,u=(j+1)/9;triangle(point(t,-.007),point(t,.007),point(u,.005),.35);triangle(point(t,-.007),point(u,.005),point(u,-.005),.35);}
      for(let j=1;j<9;j++){
        const t=j/10,w=.125*Math.pow(Math.sin(Math.PI*t),.7)*(1-.45*t);
        for(const side of [-1,1]){
          const base=point(t-.025),rear=point(t+.055,side*w*.52),tip=point(t+.125,side*w),front=point(t+.005,side*w*.60),ridge=point(t+.045,side*w*.55);ridge[1]+=.012;
          triangle(base,front,ridge,.35+t*.3);triangle(front,tip,ridge,.55);triangle(tip,rear,ridge,.7);triangle(rear,base,ridge,.45);
        }
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
    const mat=patchMaterial(new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.95}),{wind:.025,uTime:this.world.uTime,playerPush:.25,uPlayer:this.world.uPlayer,pushRadius:.92,pushDown:.40,pushHeight:.28});
    const plants=new THREE.InstancedMesh(geo,mat,6),o=new THREE.Object3D();
    [[-8.0,-2],[-8.0,.8],[-7.7,1.9],[-5,-4.4],[-2.05,-2.8],[-2.4,1.3]].forEach(([x,z],i)=>{o.position.set(x,0,z);o.rotation.y=i*1.3;o.scale.setScalar(.78+(i%3)*.12);o.updateMatrix();plants.setMatrixAt(i,o.matrix);});
    plants.castShadow=true;plants.receiveShadow=true;plants.name='Six pinnate ferns';this.root.add(plants);
  }
  buildWater(){
    // v0.3.13: single-surface pond. The previous stacked underlay + transparent surface could sort/intersect
    // against the sculpted bank. This inset, opaque blue surface eliminates the layer/sorting glitch.
    const segments=72,positions=[0,0,0],indices=[];
    for(let i=0;i<segments;i++){
      const a=i/segments*Math.PI*2;
      const r=.94+.015*Math.sin(a*5)+.009*Math.sin(a*9+1.4);
      positions.push(Math.cos(a)*1.65*r,0,Math.sin(a)*2.35*r);
    }
    for(let i=0;i<segments;i++)indices.push(0,1+i,1+((i+1)%segments));
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
    const waterMat=new THREE.MeshPhysicalMaterial({color:0x43aee8,roughness:.20,metalness:0,clearcoat:.50,clearcoatRoughness:.10,side:THREE.DoubleSide,depthWrite:true,transparent:false,envMapIntensity:.18});
    waterMat.toneMapped=false;
    const m=this.add(geo,waterMat,-3.85,-.055,-1.6);m.name='POND_WATER_SINGLE_SURFACE';m.castShadow=false;m.receiveShadow=false;m.renderOrder=5;this.waterMesh=m;
    // Exact traversal boundary uses the same organic ellipse formula as the visible water mesh.
    this.world.addWaterBody({kind:'organic-ellipse',cx:-3.85,cz:-1.6,rx:1.65,rz:2.35,base:.94,waveA:.015,freqA:5,waveB:.009,freqB:9,phaseB:1.4});
  }


  async loadPurePolySample(){
    // v0.3.13 visual candidate only. Static environment meshes converted from the uploaded Pure Poly package.
    // No resource IDs, harvesting, movement, camera or gameplay logic is coupled to these assets.
    const root=new THREE.Group();root.name='Pure Poly import sample';this.root.add(root);this.purePolyRoot=root;
    try{
      const { GLTFLoader }=await import('three/addons/loaders/GLTFLoader.js');const loader=new GLTFLoader();
      const load=async name=>{const gltf=await loader.loadAsync(`./assets/environment/pure-poly/${name}.glb`);const o=gltf.scene;o.name=name;o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;if(m.material){m.material.roughness=Math.max(.72,m.material.roughness??.72);m.material.metalness=0;}}});return o;};
      const [tree,grass]=await Promise.all([
        load('PP_Tree_02'),load('PP_Grass_11')
      ]);

      tree.position.set(-4.90,0,2.85);tree.rotation.y=.55;tree.scale.setScalar(.49);root.add(tree);
      this.world.addObstacle({x:-4.90,z:2.85,r:.62,height:3.5,kind:'purepoly-tree'});

      // Replace the ambiguous moss-white Pure Poly rock with an approved house-style gray stone.
      this.rock(-2.23,-4.58,.44,.24,.34);this.world.addObstacle({x:-2.23,z:-4.58,r:.38,height:.46,kind:'foundation-rock'});
      // PP_Lake_Ground_04 remains disabled in v0.3.13. The visible pond uses one inset opaque blue surface.

      const spots=[[-7.85,-4.82,.8],[-6.88,-4.70,1.0],[-5.92,-4.82,.75],[-2.12,-3.55,.8],[-2.02,-2.82,.9],[-5.80,2.88,.8],[-4.05,2.86,1.0],[-2.35,1.72,.85],[-7.55,-1.05,.9],[-6.72,-.35,.8]];
      for(let i=0;i<spots.length;i++){const [x,z,sc]=spots[i],g=grass.clone(true);g.position.set(x,-.015,z);g.rotation.y=(i*.91)%6.28;g.scale.setScalar(sc);g.traverse(m=>{if(m.isMesh){m.castShadow=false;m.receiveShadow=true;}});root.add(g);}
      root.userData.source='Pure Poly - Free Low Poly Nature Forest';root.userData.activeAssets=['PP_Tree_02','PP_Grass_11'];
    }catch(error){console.error('Pure Poly sample could not load',error);root.userData.loadError=String(error);}
  }

}
