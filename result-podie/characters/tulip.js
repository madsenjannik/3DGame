import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildCharacter, loopOsc, blink, smoothstep, mountReport } from '../character-rig.js';
import { bakeHop, HOP_FX } from '../hop-bake.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
export async function create(){
const scene=new THREE.Group();
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const rand=mulberry32(9311);
const R=(a,b)=>a+(b-a)*rand();
const clamp01=x=>Math.min(1,Math.max(0,x));
const damp=(k,dt)=>1-Math.exp(-k*dt);
const wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a));
const C=h=>new THREE.Color(h);
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const smooth=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};

// ---------- materials (cream clay, olive leaves, cream petals, yellow disc)
const skin=(name,col,o={})=>new THREE.MeshPhysicalMaterial({name,color:col,vertexColors:!!o.vc,roughness:o.rough??0.8,metalness:0,sheen:o.sheen??0.45,sheenRoughness:0.75,sheenColor:C(o.sc??0xfff6e4)});
const M={
  body:skin('body',0xffffff,{vc:true,sheen:0.3}),
  face:skin('face',0xf2e8d2,{rough:0.76,sheen:0.35}),
  leaf:skin('leaf',0xffffff,{vc:true,rough:0.66,sheen:0.1,sc:0xe6efcc}),
  limb:skin('limb',0x74902f,{sheen:0.15,sc:0xe6efcc}),
  petal:skin('petal',0xffffff,{vc:true,rough:0.7,sheen:0.4}),
  disc:skin('disc',0xffffff,{vc:true,rough:0.74,sheen:0.2,sc:0xffe9a0}),
  cheek:new THREE.MeshStandardMaterial({name:'cheek',color:0xf09a92,roughness:0.95,transparent:true,opacity:0.55,depthWrite:false}),
  eye:new THREE.MeshPhysicalMaterial({name:'eye',color:0x0f0e0c,roughness:0.12,clearcoat:1,clearcoatRoughness:0.05}),
  glint:new THREE.MeshBasicMaterial({name:'glint',color:0xffffff}),
  mouth:new THREE.MeshStandardMaterial({name:'mouth',color:0x4a2a20,roughness:0.6}),
  nose:new THREE.MeshStandardMaterial({name:'nose',color:0xe8a88a,roughness:0.55}),
};
M.petal.side=THREE.DoubleSide; M.leaf.side=THREE.DoubleSide;
const COL={green:C(0x5c772a),greenMid:C(0x76913a),greenTip:C(0x90a94b),vein:C(0x4b6322),cream:C(0xf2e9d3),creamWarm:C(0xe6d8b6),coral:C(0xf06a52),coralHi:C(0xf7876c),coralBase:C(0xf6dcc2)};
M.limb.color.set(0x76913a);
// ---------- geometry
function paint(g,fn){const p=g.attributes.position,a=new Float32Array(p.count*3),c=new THREE.Color();for(let i=0;i<p.count;i++){fn(p.getX(i),p.getY(i),p.getZ(i),c,i);a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;}
function smoothSphere(w,h){let g=new THREE.SphereGeometry(1,w,h);g.deleteAttribute('normal');g.deleteAttribute('uv');return mergeVertices(g);}
const ell=(w,h,s)=>{const g=smoothSphere(w,h);g.scale(s.x,s.y,s.z);g.computeVertexNormals();return g;};
const mesh=(g,m,name)=>{const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=true;o.receiveShadow=true;return o;};
const alignZ=(obj,dir,up)=>{const z=dir.clone().normalize(),y=up.clone().sub(z.clone().multiplyScalar(up.dot(z))).normalize(),x=new THREE.Vector3().crossVectors(y,z);obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));};

// blade: pivot at base, extends along +z, face normal = local +y
function bladeGeo(w,len,th,curl,bend,{pt=0.7,fold=0,base=0.35,taper=0.3,res=[11,10],col}){
  const g=smoothSphere(res[0],res[1]),p=g.attributes.position,xn=new Float32Array(p.count),us=new Float32Array(p.count);
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),u=Math.acos(Math.max(-1,Math.min(1,-y)))/Math.PI,r=Math.hypot(x,z),cx=r>1e-6?x/r:0,cz=r>1e-6?z/r:0;
    const su=Math.sin(Math.PI*u),W=w*Math.pow(su,pt)*(1-taper*u)*(base+(1-base)*smooth(0,0.3,u)),T=th*Math.pow(su,0.45),X=cx*W,n=X/w;
    xn[i]=n;us[i]=u;p.setXYZ(i,X,cz*T+curl*n*n*w+fold*Math.abs(n)*w*su+bend*u*u*len-0.25*th*(1-Math.abs(n))*su,u*len);}
  g.computeVertexNormals(); g.userData.len=len;
  return paint(g,(x,y,z,c,i)=>col(c,us[i],xn[i]));
}
const leafCol=(c,u,n)=>{c.copy(COL.green).lerp(COL.greenMid,smooth(0,0.45,u)).lerp(COL.greenTip,smooth(0.5,1,u)*0.5).lerp(COL.greenTip,(1-Math.abs(n))*0.12);
  c.lerp(COL.vein,(1-smooth(0.03,0.12,Math.abs(n)))*0.6*smooth(0.05,0.2,u)*(1-smooth(0.75,1,u)));};
const petalCol=(c,u,n)=>{c.copy(COL.coralBase).lerp(COL.coral,smooth(0.05,0.42,u)).lerp(COL.coralHi,0.35*smooth(0.6,1,u));c.lerp(COL.coral,0.25*Math.pow(1-Math.abs(n),6)*smooth(0.3,0.9,u));};
const CAPE=bladeGeo(0.072,0.46,0.022,-0.55,0.08,{pt:0.8,base:0.3,taper:0.3,res:[14,14],col:leafCol});
const ARMLEAF=bladeGeo(0.068,0.25,0.022,-0.14,0.04,{pt:0.7,base:0.5,taper:0.3,res:[12,10],col:leafCol});
const char=new THREE.Group(); char.name='Tulip';
const rig=new THREE.Group(); rig.name='rig'; char.add(rig);
const SPINE_Y=0.5; const spine=new THREE.Group(); spine.name='spine'; spine.position.y=SPINE_Y; rig.add(spine);

// green bean body
const BR=V(0.155,0.22,0.145);
const lower=new THREE.Group(); lower.name='lower'; rig.add(lower);
const bodyG=new THREE.Group(); bodyG.position.y=0.36; lower.add(bodyG);
{const g=smoothSphere(20,14),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const y=p.getY(i),k=1+0.1*(1-y)*(1+y)*(-y)+0.05*(-y);p.setXYZ(i,p.getX(i)*BR.x*k,y*BR.y,p.getZ(i)*BR.z*k);}
 g.computeVertexNormals();
 paint(g,(x,y,z,c)=>{c.copy(COL.greenMid).lerp(COL.green,0.3*smooth(0.3,-0.9,y/BR.y));});
 const b=mesh(g,M.body,'body'); b.userData.skin=p=>{const w=smoothstep(0.05,0.2,p.y)*0.7;return [[spine,w],[lower,1-w]];}; bodyG.add(b);}

const legs=[];
for(const s of [-1,1]){
  const hip=new THREE.Group(); hip.name='leg'; hip.position.set(0.075*s,0.15,0.01);
  const l=mesh(new THREE.CapsuleGeometry(0.066,0.07,4,10),M.limb,'leg_mesh'); l.position.y=-0.03; hip.add(l);
  const ft=new THREE.Group(); ft.name='foot'; ft.position.set(0,-0.095,0.02); hip.add(ft);
  ft.add(mesh(ell(12,9,V(0.078,0.052,0.095)),M.limb,'foot'));
  for(const dx of [-0.032,0,0.032]){const t=mesh(ell(8,6,V(0.024,0.022,0.028)),M.limb,'toe');t.position.set(dx,-0.022,0.08);ft.add(t);}
  rig.add(hip); legs.push({hip,ft,s});
}

// the bud IS the head: one tulip-shaped lathe, cream face low on the front, petals wrap the rest
const BUD={R:0.245,H:0.6,y0:-0.25}, HEAD_Y=0.82;
const bs=v=>Math.min(0.985,0.02+0.94*Math.pow(Math.max(0,v),0.8));
const budR=v=>BUD.R*Math.pow(Math.sin(Math.PI*bs(v)),0.75);
const budY=v=>BUD.y0+BUD.H*v;
function headPt(v,phi,sink=1){const e=0.002,dr=(budR(v+e)-budR(v-e))/(2*e),rh=V(Math.sin(phi),0,Math.cos(phi));
  return {p:rh.clone().multiplyScalar(budR(v)*sink).setY(budY(v)),n:rh.clone().multiplyScalar(BUD.H).add(V(0,-dr,0)).normalize()};}
const head=new THREE.Group(); head.name='head'; head.position.y=HEAD_Y-SPINE_Y; spine.add(head);
const headSq=new THREE.Group(); head.add(headSq);
{const pts=[new THREE.Vector2(0,BUD.y0-0.002)];for(let i=0;i<=30;i++){const v=i/30;pts.push(new THREE.Vector2(budR(v),budY(v)));}pts.push(new THREE.Vector2(0,budY(1)+0.004));
 let g=new THREE.LatheGeometry(pts,40);g.deleteAttribute('uv');g.deleteAttribute('normal');g=mergeVertices(g);g.computeVertexNormals();
 paint(g,(x,y,z,c)=>{const v=(y-BUD.y0)/BUD.H,ph=Math.atan2(x,z),vt=0.4+0.12*Math.min(1,(ph/0.6)**2),fw=(1-smooth(vt-0.1,vt+0.12,v))*smooth(0.15,0.5,Math.cos(ph));
   c.copy(COL.coralBase).lerp(COL.coral,smooth(0.12,0.5,v)).lerp(COL.coralHi,0.35*Math.pow(Math.abs(Math.cos(1.5*ph)),10)*smooth(0.5,0.9,v)).lerp(COL.cream,fw);});
 headSq.add(mesh(g,M.body,'head_mesh'));}
const face=new THREE.Group(); face.name='face'; headSq.add(face);
const eyes=[];
for(const s of [-1,1]){
  const {p,n}=headPt(0.3,0.42*s,0.985);
  const e=new THREE.Group(); e.name=s<0?'eye_L':'eye_R'; e.position.copy(p); alignZ(e,n,V(0,1,0));
  const ball=mesh(new THREE.SphereGeometry(0.043,16,12),M.eye,'eyeball'); ball.scale.set(1,1.1,0.5); e.add(ball);
  const g1=new THREE.Mesh(new THREE.SphereGeometry(0.012,10,6),M.glint); g1.name='glint'; g1.position.set(0.013,0.017,0.019); g1.scale.z=0.4; e.add(g1);
  const g2=new THREE.Mesh(new THREE.SphereGeometry(0.0055,8,6),M.glint); g2.name='glint'; g2.position.set(-0.014,-0.014,0.02); g2.scale.z=0.4; e.add(g2);
  face.add(e); eyes.push(e);
}
for(const s of [-1,1]){
  const {p,n}=headPt(0.19,0.64*s,0.995);
  const ck=new THREE.Mesh(new THREE.SphereGeometry(0.03,14,8),M.cheek); ck.name='cheek'; ck.position.copy(p); alignZ(ck,n,V(0,1,0)); ck.scale.set(1.05,0.66,0.16); face.add(ck);
}
{
  const {p,n}=headPt(0.15,0,1);
  const m=new THREE.Group(); m.name='mouth'; m.position.copy(p).addScaledVector(n,0.004); alignZ(m,n,V(0,1,0));
  const crv=new THREE.QuadraticBezierCurve3(V(-0.024,0.012,-0.004),V(0,-0.012,0.004),V(0.024,0.012,-0.004));
  m.add(mesh(new THREE.TubeGeometry(crv,24,0.0045,8,false),M.mouth,'smile'));
  for(const u of [0,1]){const c=mesh(new THREE.SphereGeometry(0.0045,10,8),M.mouth,'smile_corner'); c.position.copy(crv.getPoint(u)); m.add(c);}
  face.add(m);
}
{
  const {p,n}=headPt(0.225,0,1);
  const nose=mesh(new THREE.SphereGeometry(0.011,12,8),M.nose,'nose'); nose.scale.set(1.2,0.8,0.6); nose.position.copy(p); alignZ(nose,n,V(0,1,0)); face.add(nose);
}

// petals: shells lying on the bud surface, hinged at their base so they can open
function petalGeo(HA,vS,layer,drift=0){
  const g=smoothSphere(12,18),p=g.attributes.position,vs=new Float32Array(p.count),ns=new Float32Array(p.count);
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),u=Math.acos(Math.max(-1,Math.min(1,-y)))/Math.PI,r=Math.hypot(x,z),cx=r>1e-6?x/r:0,cz=r>1e-6?z/r:0;
    const su=Math.sin(Math.PI*u),n=cx*Math.pow(Math.sin(Math.PI*(0.06+0.94*u)),0.55),v=vS+(1.05-vS)*u,ph=n*HA+drift*smooth(0.3,0.8,v);
    const rr=budR(v)+0.007+layer*0.012+0.014*(1-n*n)*su+0.035*smooth(0.72,1,u)+cz*0.017*Math.pow(su,0.4);
    vs[i]=v;ns[i]=n;p.setXYZ(i,rr*Math.sin(ph),budY(v)+0.012*u,rr*Math.cos(ph));}
  g.computeVertexNormals();
  return paint(g,(x,y,z,c,i)=>petalCol(c,vs[i],ns[i]));
}
const petals=[];
function addPetal(aDeg,HA,vS,layer,name,drift=0){
  const a=aDeg*Math.PI/180,geo=petalGeo(HA,vS,layer,drift),hb=budY(vS),rb=budR(vS)+0.007+layer*0.012;
  const piv=new THREE.Group(); piv.rotation.y=a;
  const flap=new THREE.Group(); flap.name=name; flap.position.set(0,hb,rb); piv.add(flap);
  const m=mesh(geo,M.petal,'petal'); m.position.set(0,-hb,-rb); flap.add(m);
  headSq.add(piv); petals.push({flap,k:petals.length,a,geo});
}
addPetal(72,0.74,0,1,'petal_2',-0.42); addPetal(-72,0.74,0,1,'petal_3',0.42);
addPetal(142,0.8,0,0,'petal_4'); addPetal(-142,0.8,0,0,'petal_5');
addPetal(180,0.8,0,2,'petal_6');
const FALL=petalGeo(0.55,0.35,0).center();

// leaf collar: crossed V front and back, hugging the body, tips flaring out at the shoulders just under the face
const capes=[];
for(const side of [1,-1]) for(const s of [-1,1]){
  const piv=new THREE.Group(); piv.name='cape'; piv.position.set(-s*0.035,0.24-SPINE_Y,side*(0.135+(s>0?0.012:0)));
  const out=V(0,0,side);
  alignZ(piv,V(s*0.8,1,side*0.12),out);
  const flap=new THREE.Group(); piv.add(flap); flap.add(mesh(CAPE,M.leaf,'cape_leaf'));
  spine.add(piv); capes.push({flap,s,side});
}

// arms are pointed leaves angled down and out
const arms=[];
for(const s of [-1,1]){
  const sh=new THREE.Group(); sh.name=s<0?'arm_L':'arm_R'; sh.position.set(0.135*s,0.45-SPINE_Y,0.0);
  const inner=new THREE.Group(); alignZ(inner,V(s,-0.7,0.12),V(0,0.25,1)); sh.add(inner);
  const hand=new THREE.Group(); hand.name='hand'; hand.position.z=0.13; inner.add(hand);
  const am=mesh(ARMLEAF,M.leaf,'arm_leaf'); am.userData.skin=p=>{const w=smoothstep(0.06,0.14,p.z);return [[hand,w],[sh,1-w]];}; inner.add(am);
  const socket=new THREE.Group(); socket.name=s<0?'hand_socket_L':'hand_socket_R'; socket.position.set(0,0,0.03); hand.add(socket);
  spine.add(sh); arms.push({sh,hand,socket,s});
}


// ---------- rig · clips · export
const WALK_SPEED=1.25, IDLE_T=6.6, WALK_T=4*2*Math.PI/(3+WALK_SPEED*4);
const BLINKS={Idle:[1.7,4.6],Walk:[1.2]};
function pose(clip,t){
  const W=clip==='Walk',T=W?WALK_T:IDLE_T,osc=loopOsc(T),o=(f,p)=>osc(t,f,p),u=t/T*Math.PI*2,walk=W?1:0,ph=W?4*u:0;
  const breathe=W?0:o(1.9)*0.012;
  const sq=walk*Math.pow(Math.abs(Math.cos(ph-0.35)),8)*0.035, hsq=walk*Math.pow(Math.abs(Math.cos(ph-0.8)),8)*0.025;
  rig.position.y=Math.abs(Math.sin(ph))*0.03*walk; rig.rotation.set(0.05*walk,0,Math.sin(ph)*0.12*walk);
  lower.scale.set(1+sq*0.8,1-sq+breathe*0.6,1+sq*0.8);
  head.position.y=HEAD_Y*(1-sq*0.7)+breathe*1.5-SPINE_Y;
  headSq.scale.set(1+hsq*0.6,1-hsq,1+hsq*0.6);
  // idle head tilt: slow side-to-side lean with a small nod
  head.rotation.z=W?-Math.sin(ph-0.5)*0.07:o(0.95,0.4)*0.09; head.rotation.x=W?0:o(1.9,0.6)*0.02; head.rotation.y=W?0:o(0.95,1.9)*0.05;
  legs.forEach(({hip},i)=>{hip.rotation.x=(i?-1:1)*Math.sin(ph)*0.45*walk;hip.position.y=0.15+Math.max(0,Math.sin(ph+(i?Math.PI:0)))*0.045*walk;});
  arms.forEach(({sh,s})=>{sh.rotation.y=Math.sin(ph)*0.5*walk;sh.rotation.z=s*(o(1.9)*0.04+walk*0.06*Math.sin(2*ph-1));});
  petals.forEach(({flap,k,a})=>{flap.rotation.x=o(1.9,k*0.7)*0.012+walk*0.04*Math.sin(2*ph-1-0.5*k)+hsq*0.8;flap.rotation.y=walk*0.02*Math.sin(2*ph+k);});
  // capes tilt with the arm on their side
  capes.forEach(({flap,s,side})=>{const sw=Math.sin(ph)*0.5*walk;flap.rotation.x=-side*sw*0.35*s+o(1.9)*0.01;flap.rotation.y=s*(o(1.9)*0.03+walk*0.05*Math.sin(2*ph-1));});
  const bk=blink(t,BLINKS[clip]); eyes.forEach(e=>e.scale.y=bk);
}
const B=[[rig,'Hips'],[spine,'Spine'],[lower,'Body'],[head,'Head'],[headSq,'Head_Squash']];
petals.forEach(({flap,k})=>B.push([flap,'Petal_'+(k+1)]));
capes.forEach(({flap,s,side},i)=>B.push([flap,'Leaf_'+(side>0?'Front_':'Back_')+(s>0?'R':'L')]));
eyes.forEach(e=>B.push([e,'Eye_'+(e.position.x>0?'L':'R')]));
arms.forEach(({sh,hand,socket,s})=>{const k=s>0?'L':'R';B.push([sh,'Arm_'+k],[hand,'Hand_'+k],[socket,'Hand_Socket_'+k]);});
legs.forEach(({hip,ft,s})=>{const k=s>0?'L':'R';B.push([hip,'Leg_'+k],[ft,'Foot_'+k]);});
const HOP=bakeHop('petal',{host:char,anchors:petals.map(p=>p.flap),feet:legs.map(l=>l.ft)}); HOP.bones.forEach(b=>B.push(b));
const built=await buildCharacter({name:'Tulip',source:char,bones:B,feet:legs.map(l=>l.ft),rest:()=>{pose('Idle',0);HOP.hide();},clips:[{name:'Idle',duration:IDLE_T,skip:HOP_FX,pose:t=>{pose('Idle',t);HOP.hide();}},{name:'Walk',duration:WALK_T,skip:HOP_FX,pose:t=>{pose('Walk',t);HOP.hide();}},{name:'Hop',duration:HOP.duration,only:HOP_FX,pose:t=>{pose('Idle',0);HOP.pose(t);}}]});
built.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
return {buffer:built.buffer,scene:built.scene,clips:built.clips,WALK_SPEED};
}
