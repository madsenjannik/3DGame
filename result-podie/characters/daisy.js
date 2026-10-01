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
const COL={green:C(0x5c772a),greenMid:C(0x76913a),greenTip:C(0x90a94b),vein:C(0x4b6322),cream:C(0xf2e9d3),creamWarm:C(0xe6d8b6),petal:C(0xfbf6e8),petalBase:C(0xeee2bf),yellow:C(0xe9a916),yellowHi:C(0xf6c832)};

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
const petalCol=(c,u,n)=>{c.copy(COL.petalBase).lerp(COL.petal,smooth(0,0.4,u));c.lerp(COL.petalBase,0.3*Math.pow(0.5+0.5*Math.cos(n*Math.PI*3.5),10)*smooth(0.1,0.45,u)*(1-smooth(0.85,1,u)));};
const PETAL=bladeGeo(0.092,0.46,0.028,0.3,0.03,{pt:0.45,base:0.28,taper:-0.08,res:[16,14],col:petalCol});
const COLLAR_A=bladeGeo(0.072,0.19,0.02,-0.25,-0.03,{pt:0.75,base:0.3,res:[9,8],col:leafCol});
const COLLAR_B=bladeGeo(0.08,0.23,0.02,-0.25,-0.04,{pt:0.75,base:0.3,res:[9,8],col:leafCol});
const ARM_LEAF=bladeGeo(0.048,0.15,0.016,-0.2,0.03,{pt:0.75,base:0.3,res:[9,8],col:leafCol});
const SEPAL=bladeGeo(0.036,0.12,0.014,-0.1,0.02,{pt:0.8,base:0.4,res:[9,8],col:leafCol});

// ---------- character
const char=new THREE.Group(); char.name='Daisy';
const rig=new THREE.Group(); rig.name='rig'; char.add(rig);
const SPINE_Y=0.52; const spine=new THREE.Group(); spine.name='spine'; spine.position.y=SPINE_Y; rig.add(spine);

// cream pear body, olive seat at the back
const BR=V(0.17,0.21,0.155);
const lower=new THREE.Group(); lower.name='lower'; rig.add(lower);
const bodyG=new THREE.Group(); bodyG.position.y=0.36; lower.add(bodyG);
{const g=smoothSphere(20,14),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const y=p.getY(i),k=1+0.12*(1-y)*(1+y)*(-y)+0.08*(-y);p.setXYZ(i,p.getX(i)*BR.x*k,y*BR.y,p.getZ(i)*BR.z*k);}
 g.computeVertexNormals();
 paint(g,(x,y,z,c)=>{const ny=y/BR.y,nz=z/BR.z,gw=smooth(-0.3,-0.75,ny)*(1-smooth(-0.15,0.45,nz));
   c.copy(COL.cream).lerp(COL.creamWarm,0.35*smooth(0.4,-0.9,ny)).lerp(COL.greenMid,gw);});
 const b=mesh(g,M.body,'body'); b.userData.skin=p=>{const w=smoothstep(0.05,0.2,p.y)*0.7;return [[spine,w],[lower,1-w]];}; bodyG.add(b);}

const legs=[];
for(const s of [-1,1]){
  const hip=new THREE.Group(); hip.name='leg'; hip.position.set(0.085*s,0.15,0.01);
  const l=mesh(new THREE.CapsuleGeometry(0.074,0.06,4,10),M.limb,'leg_mesh'); l.position.y=-0.03; hip.add(l);
  const ft=new THREE.Group(); ft.name='foot'; ft.position.set(0,-0.095,0.02); hip.add(ft);
  ft.add(mesh(ell(12,9,V(0.084,0.058,0.1)),M.limb,'foot'));
  for(const dx of [-0.036,0,0.036]){const t=mesh(ell(8,6,V(0.026,0.024,0.03)),M.limb,'toe');t.position.set(dx,-0.024,0.085);ft.add(t);}
  rig.add(hip); legs.push({hip,ft,s});
}

// round cream head
const HR=V(0.27,0.2,0.22), HEAD_Y=0.77;
{const n=mesh(new THREE.CapsuleGeometry(0.075,0.05,6,14),M.face,'neck'); n.position.y=0.59-SPINE_Y; n.userData.skin=p=>{const w=smoothstep(-0.03,0.06,p.y);return [[head,w],[spine,1-w]];}; spine.add(n);}
const head=new THREE.Group(); head.name='head'; head.position.y=HEAD_Y-SPINE_Y; spine.add(head);
const headSq=new THREE.Group(); head.add(headSq);
// mochi head: wide, flattened crown, chubby lower cheeks
{const g=smoothSphere(26,18),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const y=p.getY(i),k=1+0.09*Math.max(0,-y)*(1+y)-0.05*Math.max(0,y);p.setXYZ(i,p.getX(i)*HR.x*k,y*HR.y*(y>0?0.92:1),p.getZ(i)*HR.z*k);}
 g.computeVertexNormals(); headSq.add(mesh(g,M.face,'head_mesh'));}
function onHead(dir,sink=1){const d=dir.clone().normalize();const t=1/Math.sqrt((d.x/HR.x)**2+(d.y/HR.y)**2+(d.z/HR.z)**2);
  return {p:d.multiplyScalar(t*sink),n:V(dir.x/HR.x**2,dir.y/HR.y**2,dir.z/HR.z**2).normalize()};}
const face=new THREE.Group(); face.name='face'; headSq.add(face);
const eyes=[];
for(const s of [-1,1]){
  const {p,n}=onHead(V(0.5*s,-0.2,1),0.975);
  const e=new THREE.Group(); e.name=s<0?'eye_L':'eye_R'; e.position.copy(p); alignZ(e,n,V(0,1,0));
  const ball=mesh(new THREE.SphereGeometry(0.052,14,10),M.eye,'eyeball'); ball.scale.set(1,1.1,0.5); e.add(ball);
  const g1=new THREE.Mesh(new THREE.SphereGeometry(0.014,10,6),M.glint); g1.name='glint'; g1.position.set(0.016,0.02,0.022); g1.scale.z=0.4; e.add(g1);
  const g2=new THREE.Mesh(new THREE.SphereGeometry(0.006,8,6),M.glint); g2.name='glint'; g2.position.set(-0.017,-0.016,0.023); g2.scale.z=0.4; e.add(g2);
  face.add(e); eyes.push(e);
}
for(const s of [-1,1]){
  const {p,n}=onHead(V(0.82*s,-0.55,1),0.985);
  const ck=new THREE.Mesh(new THREE.SphereGeometry(0.034,14,8),M.cheek); ck.name='cheek'; ck.position.copy(p); alignZ(ck,n,V(0,1,0)); ck.scale.set(1.05,0.66,0.16); face.add(ck);
}
{
  const {p,n}=onHead(V(0,-0.52,1),0.995);
  const m=new THREE.Group(); m.name='mouth'; m.position.copy(p).addScaledVector(n,0.012); alignZ(m,n,V(0,1,0));
  const crv=new THREE.QuadraticBezierCurve3(V(-0.03,0.028,-0.006),V(0,-0.012,0.012),V(0.03,0.028,-0.006));
  const t=mesh(new THREE.TubeGeometry(crv,24,0.0055,8,false),M.mouth,'smile'); t.scale.z=0.5; m.add(t);
  for(const u of [0,1]){const c=mesh(new THREE.SphereGeometry(0.0055,10,8),M.mouth,'smile_corner'); c.position.copy(crv.getPoint(u)); c.scale.z=0.5; m.add(c);}
  face.add(m);
}
{
  const {p,n}=onHead(V(0,-0.34,1),0.995);
  const nose=mesh(new THREE.SphereGeometry(0.014,12,8),M.nose,'nose'); nose.scale.set(1.2,0.8,0.7); nose.position.copy(p); alignZ(nose,n,V(0,1,0)); face.add(nose);
}

// yellow disc dome on the crown, packed with bumps
const DC=V(0,0.135,0.035), DR=V(0.165,0.11,0.155);
const domeG=new THREE.Group(); domeG.position.copy(DC); domeG.quaternion.setFromUnitVectors(V(0,1,0),V(0,1,0.5).normalize()); headSq.add(domeG);
const pollenSock=new THREE.Group(); pollenSock.name='pollen_socket'; pollenSock.position.set(0,DR.y,0); domeG.add(pollenSock);
{
  const parts=[],base=ell(16,10,DR);paint(base,(x,y,z,c)=>c.copy(COL.yellow));parts.push(base);
  const N=104,bump=(()=>{const g=new THREE.IcosahedronGeometry(1,0);g.deleteAttribute('normal');g.deleteAttribute('uv');return mergeVertices(g);})();
  for(let i=0;i<N;i++){const y=1-0.92*(i+0.5)/N,r=Math.sqrt(1-y*y),a=i*Math.PI*(3-Math.sqrt(5));
    const d=V(r*Math.sin(a)*DR.x,y*DR.y,r*Math.cos(a)*DR.z),s=R(0.017,0.022)*(0.8+0.2*y),b=bump.clone();
    b.scale(s,s*0.8,s);b.rotateY(R(0,6));b.translate(d.x,d.y,d.z);b.computeVertexNormals();
    const tint=R(0,1);paint(b,(x,yy,z,c)=>c.copy(COL.yellow).lerp(COL.yellowHi,0.35+0.5*tint));parts.push(b);}
  domeG.add(mesh(mergeGeometries(parts),M.disc,'disc'));
}

// 11 petals in a halo behind the head, cone tilted back; each petal is its own bone
const PC=V(0,0.13,-0.1), PN=V(0,0.35,1).normalize(), PX=V(1,0,0), PY=V(0,PN.z,-PN.y);
const petals=[];
for(let i=0;i<11;i++){
  const th=Math.PI/2+i/11*Math.PI*2, r=PX.clone().multiplyScalar(Math.cos(th)).addScaledVector(PY,Math.sin(th));
  const piv=new THREE.Group(); piv.position.copy(PC).addScaledVector(r,0.06).addScaledVector(PN,-0.004*(i%2));
  const low=Math.max(0,-Math.sin(th)),ear=low*Math.abs(Math.cos(th))*2,tuck=low*(1-Math.abs(Math.cos(th)));
  alignZ(piv,r.clone().addScaledVector(PN,-0.12+0.3*ear-0.35*tuck).addScaledVector(V(0,-1,0),0.25*ear),PN);
  const flap=new THREE.Group(); flap.name='petal_'+(i+1); piv.add(flap);
  const sc=R(0.94,1.04); const m=mesh(PETAL,M.petal,'petal'); m.scale.set(sc,1,sc); flap.add(m);
  headSq.add(piv); petals.push({flap,k:i,th});
}
// green calyx on the back of the head, sepals radiating behind the petals
{
  const CC=V(0,0.15,-0.2);
  const g=ell(18,14,V(0.14,0.14,0.11));g.translate(CC.x,CC.y,CC.z);
  paint(g,(x,y,z,c)=>{c.copy(COL.greenMid).lerp(COL.vein,0.7*(1-smooth(0.004,0.014,Math.abs(x)))*smooth(-0.24,-0.29,z)).lerp(COL.greenTip,0.25*smooth(0,0.12,y-CC.y));});
  headSq.add(mesh(g,M.leaf,'calyx'));
  for(let i=0;i<14;i++){const th=Math.PI/2+(i+0.5)/14*Math.PI*2,r=PX.clone().multiplyScalar(Math.cos(th)).addScaledVector(PY,Math.sin(th));
    const piv=new THREE.Group(); piv.position.copy(CC).addScaledVector(r,0.12).addScaledVector(PN,0.015);
    alignZ(piv,r.clone().addScaledVector(PN,-0.22),PN.clone().negate()); piv.add(mesh(SEPAL,M.leaf,'sepal')); headSq.add(piv);}
}

// two-layer leaf collar over the shoulders
const collarF=new THREE.Group(); collarF.name='collar_front'; collarF.position.set(0,0.56-SPINE_Y,0.04); spine.add(collarF);
const collarB=new THREE.Group(); collarB.name='collar_back'; collarB.position.set(0,0.56-SPINE_Y,-0.04); spine.add(collarB);
function ring(n,y,rad,drop,geo,off,skipFront=0){
  for(let i=0;i<n;i++){const a=(i+off)/n*Math.PI*2,out=V(Math.sin(a),0,Math.cos(a)*0.92);if(Math.cos(a)>1-skipFront)continue;
    const piv=new THREE.Group(); const par=Math.cos(a)>=0?collarF:collarB;
    piv.position.set(out.x*rad,y,out.z*rad).sub(par.position).sub(V(0,SPINE_Y,0));
    alignZ(piv,out.clone().add(V(0,-drop,0)),out.clone().add(V(0,1/drop,0)));
    piv.rotateZ(R(-0.15,0.15)); const m=mesh(geo,M.leaf,'collar_leaf'); const s=R(0.9,1.08); m.scale.setScalar(s); piv.add(m); par.add(piv);}
}
ring(11,0.6,0.1,1.1,COLLAR_A,0);
ring(13,0.55,0.135,1.8,COLLAR_B,0.5);
ring(11,0.47,0.155,2.6,COLLAR_B,0,0.55);

// smooth arms with a leaf sleeve
const arms=[];
for(const s of [-1,1]){
  const sh=new THREE.Group(); sh.name=s<0?'arm_L':'arm_R'; sh.position.set(0.13*s,0.5-SPINE_Y,0.01);
  const inner=new THREE.Group(); alignZ(inner,V(s,-0.55,0.12),V(0,1,0)); sh.add(inner);
  const cg=new THREE.CapsuleGeometry(0.05,0.15,4,10); cg.rotateX(Math.PI/2); cg.translate(0,0,0.1);
  const hand=new THREE.Group(); hand.name='hand'; hand.position.z=0.2; inner.add(hand);
  const am=mesh(cg,M.limb,'arm'); am.userData.skin=p=>{const w=smoothstep(0.1,0.18,p.z);return [[hand,w],[sh,1-w]];}; inner.add(am);
  const hm=mesh(ell(10,8,V(0.058,0.05,0.062)),M.limb,'hand_mesh'); hm.position.z=0.02; hand.add(hm);
  for(const [a,rot] of [[1.35,0.1],[1.9,-0.15]]){const piv=new THREE.Group();piv.position.set(Math.cos(a)*0.042,Math.sin(a)*0.042,0.02);
    alignZ(piv,V(Math.cos(a)*0.1,Math.sin(a)*0.1,1),V(Math.cos(a),Math.sin(a),0));piv.rotateZ(rot);piv.add(mesh(ARM_LEAF,M.leaf,'arm_leaf'));inner.add(piv);}
  const socket=new THREE.Group(); socket.name=s<0?'hand_socket_L':'hand_socket_R'; socket.position.set(0,0,0.04); hand.add(socket);
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
  const fold=W?0.04:0.15*(0.5+0.5*o(0.95,-1.2));
  petals.forEach(({flap,k,th})=>{flap.rotation.x=-fold+o(1.9,k*0.57)*0.015+walk*0.07*Math.sin(2*ph-1-0.45*k)-hsq*1.2*Math.sin(th);flap.rotation.y=walk*0.03*Math.sin(2*ph+k);});
  collarF.rotation.x=walk*0.035*Math.sin(2*ph-0.6)+o(1.9)*0.01; collarB.rotation.x=-walk*0.035*Math.sin(2*ph-0.9)-o(1.9)*0.01;
  const bk=blink(t,BLINKS[clip]); eyes.forEach(e=>e.scale.y=bk);
}
const B=[[rig,'Hips'],[spine,'Spine'],[lower,'Body'],[head,'Head'],[headSq,'Head_Squash'],[pollenSock,'Pollen_Socket']];
petals.forEach(({flap,k})=>B.push([flap,'Petal_'+(k+1)]));
B.push([collarF,'Collar_Front'],[collarB,'Collar_Back']);
eyes.forEach(e=>B.push([e,'Eye_'+(e.position.x>0?'L':'R')]));
arms.forEach(({sh,hand,socket,s})=>{const k=s>0?'L':'R';B.push([sh,'Arm_'+k],[hand,'Hand_'+k],[socket,'Hand_Socket_'+k]);});
legs.forEach(({hip,ft,s})=>{const k=s>0?'L':'R';B.push([hip,'Leg_'+k],[ft,'Foot_'+k]);});
const HOP=bakeHop('pollen',{host:char,anchors:[pollenSock],feet:legs.map(l=>l.ft)}); HOP.bones.forEach(b=>B.push(b));
const built=await buildCharacter({name:'Daisy',source:char,bones:B,feet:legs.map(l=>l.ft),rest:()=>{pose('Idle',0);HOP.hide();},clips:[{name:'Idle',duration:IDLE_T,skip:HOP_FX,pose:t=>{pose('Idle',t);HOP.hide();}},{name:'Walk',duration:WALK_T,skip:HOP_FX,pose:t=>{pose('Walk',t);HOP.hide();}},{name:'Hop',duration:HOP.duration,only:HOP_FX,pose:t=>{pose('Idle',0);HOP.pose(t);}}]});
built.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
return {buffer:built.buffer,scene:built.scene,clips:built.clips,WALK_SPEED};
}
