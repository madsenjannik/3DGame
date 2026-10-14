import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildCharacter, loopOsc, blink, smoothstep, mountReport } from '../character-rig.js';
import { bakeHop, HOP_FX } from '../hop-bake.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
export async function create(){
const scene=new THREE.Group();
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const rand=mulberry32(7351);
const R=(a,b)=>a+(b-a)*rand();
const clamp01=x=>Math.min(1,Math.max(0,x));
const damp=(k,dt)=>1-Math.exp(-k*dt);
const wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a));
const C=h=>new THREE.Color(h);
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const smooth=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};

// ---------- materials (muted desert greens, dusky coral bloom)
const skin=(name,col,o={})=>new THREE.MeshPhysicalMaterial({name,color:col,vertexColors:!!o.vc,roughness:o.rough??0.8,metalness:0,sheen:o.sheen??0.45,sheenRoughness:0.75,sheenColor:C(o.sc??0xe8f0d0)});
const M={
  cactus:skin('cactus',0xffffff,{vc:true,sheen:0.2}),
  areole:skin('areole',0xe8b830,{rough:0.85,sheen:0.15}),
  foot:skin('foot',0x2f5a1e,{sheen:0.2}),
  limb:skin('limb',0x3e7420,{sheen:0.2}),
  hand:skin('hand',0x356a1c,{sheen:0.2}),
  petal:skin('petal',0xffffff,{vc:true,rough:0.7,sheen:0.2,sc:0xffd0b8}),
  stamen:skin('stamen',0xf5b010,{rough:0.9,sheen:0.15}),
  cheek:new THREE.MeshStandardMaterial({name:'cheek',color:0xec7f70,roughness:0.95,transparent:true,opacity:0.5,depthWrite:false}),
  eye:new THREE.MeshPhysicalMaterial({name:'eye',color:0x0f110e,roughness:0.12,clearcoat:1,clearcoatRoughness:0.05}),
  glint:new THREE.MeshBasicMaterial({name:'glint',color:0xffffff}),
  mouth:new THREE.MeshStandardMaterial({name:'mouth',color:0x2e3320,roughness:0.6}),
};
const COL={valley:C(0x2f5c16),base:C(0x4f8a22),crest:C(0x6eaa30),face:C(0xd4d27a)};

// ---------- geometry
function paint(g,fn){const p=g.attributes.position,a=new Float32Array(p.count*3),c=new THREE.Color();for(let i=0;i<p.count;i++){fn(p.getX(i),p.getY(i),p.getZ(i),c,i);a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;}
function smoothSphere(w,h){let g=new THREE.SphereGeometry(1,w,h);g.deleteAttribute('normal');g.deleteAttribute('uv');return mergeVertices(g);}
const mesh=(g,m,name)=>{const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=true;o.receiveShadow=true;return o;};
const alignZ=(obj,dir,up)=>{const z=dir.clone().normalize(),y=up.clone().sub(z.clone().multiplyScalar(up.dot(z))).normalize(),x=new THREE.Vector3().crossVectors(y,z);obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));};

const FACE=V(0,-0.25,1).normalize();
const faceMask=(x,y,z)=>smooth(0.5,0.8,x*FACE.x+y*FACE.y+z*FACE.z);
// ribbed ellipsoid; rib crests along meridians, flattened out over the face
function ribbed(rad,N,amp,face=false,seg=[40,26]){
  const g=smoothSphere(seg[0],seg[1]),p=g.attributes.position,rib=new Float32Array(p.count),fm=new Float32Array(p.count);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),pole=Math.sqrt(Math.max(0,1-y*y));
    const f=face?faceMask(x,y,z):0, r=Math.cos(Math.atan2(x,z)*N)*pole*(1-f*0.9);
    const k=1+amp*r; rib[i]=r; fm[i]=f;
    p.setXYZ(i,x*k*rad.x,y*k*rad.y,z*k*rad.z);
  }
  g.computeVertexNormals();
  return paint(g,(x,y,z,c,i)=>{const r=rib[i];r<0?c.copy(COL.base).lerp(COL.valley,-r):c.copy(COL.base).lerp(COL.crest,r);c.lerp(COL.face,fm[i]*0.9);});
}
const DOT=(()=>{const g=smoothSphere(7,4);g.computeVertexNormals();return g;})();
const AREOLES=[];
function areole(parent,pos,n,s=0.024){AREOLES.push({parent,pos:pos.clone(),n:n.clone()});const d=mesh(DOT,M.areole,'areole');d.position.copy(pos).addScaledVector(n,-0.004);alignZ(d,n,V(0,1,0));d.scale.set(s,s,s*0.42);parent.add(d);return d;}
// dots on rib crests, staggered along each rib
function ribDots(parent,rad,N,amp,phis,skip){
  for(let k=0;k<N;k++){
    const th=k/N*Math.PI*2;
    phis.forEach((ph0,j)=>{
      const ph=ph0+(k%2)*0.13+R(-0.03,0.03), d=V(Math.sin(ph)*Math.sin(th),Math.cos(ph),Math.sin(ph)*Math.cos(th));
      if(skip&&skip(d))return;
      const kk=1+amp*Math.sin(ph), p=V(d.x*rad.x*kk,d.y*rad.y*kk,d.z*rad.z*kk);
      areole(parent,p,V(d.x/rad.x,d.y/rad.y,d.z/rad.z).normalize(),R(0.021,0.027));
    });
  }
}
// round pad (ear / arm) with a few areoles on its outer face
function pad(name,r,side){
  const g=new THREE.Group(); g.name=name;
  const rad=V(r*0.92,r,r*0.96);
  g.add(mesh(ribbed(rad,7,0.04,false,[24,16]),M.cactus,name+'_mesh'));
  const n=13,ga=Math.PI*(3-Math.sqrt(5));
  for(let i=0;i<n;i++){const y=1-(i+0.5)/n*2,rr=Math.sqrt(1-y*y),a=i*ga;const d=V(Math.cos(a)*rr,y,Math.sin(a)*rr);
    if(d.x*side<-0.15||Math.abs(y)>0.85)continue;
    areole(g,V(d.x*rad.x,d.y*rad.y,d.z*rad.z),V(d.x/rad.x,d.y/rad.y,d.z/rad.z).normalize(),R(0.019,0.024));}
  return g;
}
// petal: pivot at base, extends along +z, cupped upward
function petalGeo(w,len,th,cup,cBase,cTip){
  const g=smoothSphere(10,8); g.translate(0,0,1); g.scale(w,th,len/2);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const z=p.getZ(i),x=p.getX(i),u=z/len;p.setY(i,p.getY(i)+cup*u*u*len+Math.pow(x/w,2)*0.012);p.setX(i,x*(0.55+0.45*Math.sin(Math.PI*Math.min(1,u*1.15))));}
  g.computeVertexNormals();
  cBase=C(cBase);cTip=C(cTip); g.userData.len=len;
  return paint(g,(x,y,z,c)=>{c.copy(cBase).lerp(cTip,Math.pow(clamp01(z/len),0.7));});
}

// ---------- character
const char=new THREE.Group(); char.name='Cactus';
const rig=new THREE.Group(); rig.name='rig'; char.add(rig);

// lower tier (pivot at ground so it squashes into the floor)
const BR=V(0.43,0.37,0.4);
const lower=new THREE.Group(); lower.name='lower'; rig.add(lower);
const bodyG=new THREE.Group(); bodyG.position.y=0.44; lower.add(bodyG);
{const b=mesh(ribbed(BR,10,0.05),M.cactus,'body');b.userData.skin=p=>{const w=0.3*smoothstep(0.12,0.38,p.y),ws=(1-w)*0.5*smoothstep(-0.1,0.3,p.y);return [[head,w],[spine,ws],[lower,1-w-ws]];};bodyG.add(b);}
ribDots(bodyG,BR,10,0.05,[0.95,1.35,1.75,2.15,2.5],d=>d.z<-0.55&&d.y<0&&Math.abs(d.x)<0.3);
const tail=mesh(ribbed(V(0.1,0.1,0.09),6,0.04,false,[16,12]),M.cactus,'tail'); tail.position.set(0,-0.1,-0.4); bodyG.add(tail);

const legs=[];
for(const s of [-1,1]){
  const hip=new THREE.Group(); hip.name='leg'; hip.position.set(0.17*s,0.14,0.05);
  const ft=new THREE.Group(); ft.name='foot'; ft.position.set(0,-0.06,0.03); hip.add(ft);
  const f=mesh(smoothSphere(20,14),M.foot,'foot'); f.geometry.computeVertexNormals(); f.scale.set(0.12,0.1,0.14);
  ft.add(f); rig.add(hip); legs.push({hip,ft,s});
}
const arms=[];
for(const s of [-1,1]){
  const sh=new THREE.Group(); sh.name=s<0?'arm_L':'arm_R'; sh.position.set(0.38*s,0.62,0.05);
  const inner=new THREE.Group(); inner.rotation.set(-0.1,0,s*1.35); sh.add(inner);
  const a=mesh(new THREE.CapsuleGeometry(0.088,0.12,6,12),M.limb,'arm'); a.position.y=-0.11; a.userData.skin=p=>{const w=smoothstep(-0.02,-0.14,p.y);return [[mit,w],[sh,1-w]];}; inner.add(a);
  const root=mesh(smoothSphere(18,12),M.limb,'arm_root'); root.geometry.computeVertexNormals(); root.scale.set(0.115,0.13,0.115); root.position.y=0.0; inner.add(root);
  const blend=mesh(smoothSphere(18,12),M.limb,'shoulder'); blend.geometry.computeVertexNormals(); blend.scale.set(0.1,0.14,0.13); blend.position.set(-s*0.05,0.01,-0.01); sh.add(blend);
  for(const [ay,az] of [[-0.07,0.08],[-0.15,0.075]]) areole(inner,V(s*0.03,ay,az),V(s*0.35,0,1).normalize(),0.018);
  const mit=new THREE.Group(); mit.name='mitten'; mit.position.y=-0.22; inner.add(mit);
  const palm=mesh(smoothSphere(18,12),M.hand,'mitten_palm'); palm.geometry.computeVertexNormals(); palm.scale.set(0.085,0.1,0.095); mit.add(palm);
  const th=mesh(smoothSphere(12,8),M.hand,'mitten_thumb'); th.geometry.computeVertexNormals(); th.scale.set(0.04,0.054,0.04); th.position.set(-s*0.02,0.02,0.072); th.rotation.x=0.7; mit.add(th);
  const socket=new THREE.Group(); socket.name=s<0?'hand_socket_L':'hand_socket_R'; socket.position.set(0,-0.06,0.03); mit.add(socket);
  rig.add(sh); arms.push({sh,mit,socket,s});
}

// upper tier
const HR=V(0.42,0.37,0.39);
const HEAD_Y=0.98;
const head=new THREE.Group(); head.name='head'; head.position.set(0,HEAD_Y,0); rig.add(head);
const headSq=new THREE.Group(); head.add(headSq);
headSq.add(mesh(ribbed(HR,10,0.05,true),M.cactus,'head_mesh'));
ribDots(headSq,HR,10,0.05,[0.42,0.8,1.18,1.56,1.94],d=>d.dot(FACE)>0.3||Math.abs(d.x)>0.9&&Math.abs(d.y)<0.35);
function onHead(dir,sink=1){const d=dir.clone().normalize();const t=1/Math.sqrt((d.x/HR.x)**2+(d.y/HR.y)**2+(d.z/HR.z)**2);
  return {p:d.multiplyScalar(t*sink),n:V(dir.x/HR.x**2,dir.y/HR.y**2,dir.z/HR.z**2).normalize()};}

const face=new THREE.Group(); face.name='face'; headSq.add(face);
const eyes=[];
for(const s of [-1,1]){
  const {p,n}=onHead(V(0.5*s,-0.18,1),0.975);
  const e=new THREE.Group(); e.name=s<0?'eye_L':'eye_R'; e.position.copy(p); alignZ(e,n,V(0,1,0));
  const ball=mesh(new THREE.SphereGeometry(0.085,24,16),M.eye,'eyeball'); ball.scale.set(1,1.06,0.5); e.add(ball);
  const g1=new THREE.Mesh(new THREE.SphereGeometry(0.024,10,6),M.glint); g1.name='glint'; g1.position.set(0.028,0.033,0.039); g1.scale.z=0.4; e.add(g1);
  const g2=new THREE.Mesh(new THREE.SphereGeometry(0.011,8,6),M.glint); g2.name='glint'; g2.position.set(-0.03,-0.028,0.041); g2.scale.z=0.4; e.add(g2);
  face.add(e); eyes.push(e);
}
for(const s of [-1,1]){
  const {p,n}=onHead(V(0.82*s,-0.5,1),0.98);
  const ck=new THREE.Mesh(new THREE.SphereGeometry(0.06,14,8),M.cheek); ck.name='cheek'; ck.position.copy(p); alignZ(ck,n,V(0,1,0)); ck.scale.set(1.05,0.66,0.16); face.add(ck);
}
{
  const {p,n}=onHead(V(0,-0.44,1),0.995);
  const m=new THREE.Group(); m.name='mouth'; m.position.copy(p); alignZ(m,n,V(0,1,0));
  const arc=Math.PI*0.7, tg=new THREE.TorusGeometry(0.042,0.009,8,16,arc); tg.rotateZ(-Math.PI/2-arc/2);
  const t=mesh(tg,M.mouth,'smile'); t.scale.z=0.5; t.position.y=0.026; m.add(t); face.add(m);
}

// ears: upper pads, pivot at the head side
const ears=[];
for(const s of [-1,1]){
  const piv=new THREE.Group(); piv.name=s<0?'ear_L':'ear_R'; piv.position.set(0.34*s,0.0,-0.03);
  const p=pad('ear',0.145,s); p.position.set(0.1*s,0.01,0); piv.add(p);
  headSq.add(piv); ears.push({piv,s,ph:R(0,6)});
}

// flower
const flower=new THREE.Group(); flower.name='flower'; flower.position.set(0,HR.y*0.99,-0.01); headSq.add(flower);
const flowerTilt=new THREE.Group(); flower.add(flowerTilt);
const petals=[];
{
  const outer=petalGeo(0.056,0.16,0.016,0.28,0xb8200f,0xf2552c), inner=petalGeo(0.046,0.11,0.014,0.35,0xcc2c14,0xff7440);
  const add=(geo,n,off,open,closed)=>{for(let i=0;i<n;i++){const yaw=new THREE.Group();yaw.rotation.y=i/n*Math.PI*2+off;const tilt=new THREE.Group();yaw.add(tilt);
    const m=mesh(geo,M.petal,'petal');m.position.z=0.012;m.userData.skin=p=>{const w=smoothstep(0,geo.userData.len*0.7,p.z);return [[tilt,w],[flowerTilt,1-w]];};tilt.add(m);flowerTilt.add(yaw);petals.push({tilt,open:open+R(-0.05,0.05),closed:closed+R(-0.04,0.04)});}};
  add(outer,8,0,0.32,1.2); add(inner,6,0.26,0.78,1.42);
  const st=mesh(smoothSphere(12,8),M.stamen,'stamen'); st.geometry.computeVertexNormals(); st.scale.set(0.045,0.03,0.045); st.position.y=0.018; flowerTilt.add(st);
}


// spine: upper body (head, arms, neck leaves) hangs off it
const SPINE_Y=0.55; const spine=new THREE.Group(); spine.name='spine'; spine.position.y=SPINE_Y; rig.add(spine); char.updateMatrixWorld(true);
[head,...arms.map(a=>a.sh),...rig.children.filter(o=>/leaf_/.test(o.name))].forEach(o=>spine.attach(o));
// ---------- rig · clips · export (the preview plays the re-imported GLB)
const WALK_SPEED=1.25, IDLE_T=6.6, WALK_T=4*2*Math.PI/(3+WALK_SPEED*4); // Walk = 4 strides, in place
const BLINKS={Idle:[1.7,4.6],Walk:[1.2]};
function pose(clip,t){
  const W=clip==='Walk',T=W?WALK_T:IDLE_T,osc=loopOsc(T),o=(f,p)=>osc(t,f,p),u=t/T*Math.PI*2,walk=W?1:0,ph=W?4*u:0;
  const breathe=W?0:o(1.9)*0.014;
  const sq=walk*Math.pow(Math.abs(Math.cos(ph-0.35)),8)*0.035, hsq=walk*Math.pow(Math.abs(Math.cos(ph-0.8)),8)*0.03;
  const jig=walk*(0.012+0.008*Math.sin(2*ph-2));
  rig.position.y=Math.abs(Math.sin(ph))*0.03*walk; rig.rotation.set(0.05*walk,0,Math.sin(ph)*0.15*walk);
  lower.scale.set(1+sq*0.8,1-sq+breathe*0.6,1+sq*0.8);
  head.position.y=HEAD_Y*(1-sq*0.85)+breathe*1.5-SPINE_Y;
  headSq.scale.set(1+hsq*0.7,1-hsq,1+hsq*0.7);
  head.rotation.z=W?-Math.sin(ph-0.5)*0.08:o(0.9)*0.03; head.rotation.x=o(1.9,0.6)*0.012;
  legs.forEach(({hip},i)=>{hip.rotation.x=(i?-1:1)*Math.sin(ph)*0.45*walk;hip.position.y=0.14+Math.max(0,Math.sin(ph+(i?Math.PI:0)))*0.05*walk;});
  arms.forEach(({sh,s},i)=>{sh.rotation.x=(i?1:-1)*Math.sin(ph)*0.4*walk;sh.rotation.z=s*(0.03+o(1.9)*0.03+jig*0.05);sh.position.y=0.62*(1-sq*0.6)-SPINE_Y;});
  ears.forEach(e=>{e.piv.rotation.z=e.s*(o(1.4,e.ph)*0.03+jig*0.08+hsq*0.6)+Math.sin(ph)*0.06*walk;e.piv.rotation.y=-e.s*o(1.1,e.ph)*0.03;});
  flowerTilt.rotation.x=o(1.3)*0.015+walk*0.012*Math.sin(2*ph-1.5); flowerTilt.rotation.z=o(0.9,1)*0.015+walk*0.035*Math.sin(ph-0.3);
  const bk=blink(t,BLINKS[clip]); eyes.forEach(e=>e.scale.y=bk);
  const op=1-(1-bk)*0.25;
  for(const p of petals) p.tilt.rotation.x=-(p.closed+(p.open-p.closed)*op)+jig*0.04;
}
const B=[[rig,'Hips'],[spine,'Spine'],[lower,'Body'],[head,'Head'],[headSq,'Head_Squash'],[flower,'Flower'],[flowerTilt,'Flower_Tilt']];
eyes.forEach(e=>B.push([e,'Eye_'+(e.position.x>0?'L':'R')]));
arms.forEach(({sh,mit,socket,s})=>{const k=s>0?'L':'R';B.push([sh,'Arm_'+k],[mit,'Hand_'+k],[socket,'Hand_Socket_'+k]);});
legs.forEach(({hip,ft,s})=>{const k=s>0?'L':'R';B.push([hip,'Leg_'+k],[ft,'Foot_'+k]);});
ears.forEach(e=>B.push([e.piv,'Ear_'+(e.s>0?'L':'R')]));
petals.forEach((p,i)=>B.push([p.tilt,'Petal_'+String(i).padStart(2,'0')]));
const HOP=bakeHop('spines',{host:char,areoles:AREOLES,feet:legs.map(l=>l.ft)}); HOP.bones.forEach(b=>B.push(b));
const built=await buildCharacter({name:'Cactus',source:char,bones:B,feet:legs.map(l=>l.ft),rest:()=>{pose('Idle',0);HOP.hide();},clips:[{name:'Idle',duration:IDLE_T,skip:HOP_FX,pose:t=>{pose('Idle',t);HOP.hide();}},{name:'Walk',duration:WALK_T,skip:HOP_FX,pose:t=>{pose('Walk',t);HOP.hide();}},{name:'Hop',duration:HOP.duration,only:HOP_FX,pose:t=>{pose('Idle',0);HOP.pose(t);}}]});
built.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
return {buffer:built.buffer,scene:built.scene,clips:built.clips,WALK_SPEED};
}
