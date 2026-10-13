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
const rand=mulberry32(4127);
const R=(a,b)=>a+(b-a)*rand();
const clamp01=x=>Math.min(1,Math.max(0,x));
const damp=(k,dt)=>1-Math.exp(-k*dt);
const wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a));
const C=h=>new THREE.Color(h);
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const smooth=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};

// ---------- materials (olive leaves, lavender face, violet bloom)
const skin=(name,col,o={})=>new THREE.MeshPhysicalMaterial({name,color:col,vertexColors:!!o.vc,roughness:o.rough??0.8,metalness:0,sheen:o.sheen??0.45,sheenRoughness:0.75,sheenColor:C(o.sc??0xece4f6)});
const M={
  body:skin('body',0xffffff,{vc:true,sheen:0.12,sc:0xdfe6c8}),
  face:skin('face',0xa58ee0,{rough:0.72,sheen:0.35}),
  leaf:skin('leaf',0xffffff,{vc:true,rough:0.66,sheen:0}),
  limb:skin('limb',0x5f7028,{sheen:0.1,sc:0xdfe6c8}),
  floret:skin('floret',0xffffff,{vc:true,rough:0.6,sheen:0.25}),
  bud:skin('bud',0x8158c6,{rough:0.62,sheen:0.25}),
  core:skin('core',0x7650bd,{rough:0.8,sheen:0.1}),
  cheek:new THREE.MeshStandardMaterial({name:'cheek',color:0xe07fa8,roughness:0.95,transparent:true,opacity:0.5,depthWrite:false}),
  eye:new THREE.MeshPhysicalMaterial({name:'eye',color:0x0f0e12,roughness:0.12,clearcoat:1,clearcoatRoughness:0.05}),
  glint:new THREE.MeshBasicMaterial({name:'glint',color:0xffffff}),
  mouth:new THREE.MeshStandardMaterial({name:'mouth',color:0x3a2a4a,roughness:0.6}),
};
const COL={green:C(0x55652a),greenMid:C(0x6c7d33),greenTip:C(0x83933f),purple:C(0x8566c4),belly:C(0x9a82d6),streak:C(0x6f7d3a)};

// ---------- geometry
function paint(g,fn){const p=g.attributes.position,a=new Float32Array(p.count*3),c=new THREE.Color();for(let i=0;i<p.count;i++){fn(p.getX(i),p.getY(i),p.getZ(i),c,i);a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;}
function smoothSphere(w,h){let g=new THREE.SphereGeometry(1,w,h);g.deleteAttribute('normal');g.deleteAttribute('uv');return mergeVertices(g);}
const ell=(w,h,s)=>{const g=smoothSphere(w,h);g.scale(s.x,s.y,s.z);g.computeVertexNormals();return g;};
const mesh=(g,m,name)=>{const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=true;o.receiveShadow=true;return o;};
const alignZ=(obj,dir,up)=>{const z=dir.clone().normalize(),y=up.clone().sub(z.clone().multiplyScalar(up.dot(z))).normalize(),x=new THREE.Vector3().crossVectors(y,z);obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));};

// leaf blade: pivot at base, extends along +z, blade normal = local +y
function leafGeo(w,len,th,curl,bend,purple=0,pt=0.7,fold=0,base=0.35){
  const g=smoothSphere(11,10),p=g.attributes.position,xn=new Float32Array(p.count),us=new Float32Array(p.count);
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),u=Math.acos(Math.max(-1,Math.min(1,-y)))/Math.PI,r=Math.hypot(x,z),cx=r>1e-6?x/r:0,cz=r>1e-6?z/r:0;
    const su=Math.sin(Math.PI*u),W=w*Math.pow(su,pt)*(1-0.3*u)*(base+(1-base)*smooth(0,0.3,u)),T=th*Math.pow(su,0.45),X=cx*W,n=X/w;
    xn[i]=n;us[i]=u;p.setXYZ(i,X,cz*T+curl*n*n*w+fold*Math.abs(n)*w*su+bend*u*u*len-0.25*th*(1-Math.abs(n))*su,u*len);}
  g.computeVertexNormals(); g.userData.len=len;
  return paint(g,(x,y,z,c,i)=>{const u=us[i];c.copy(COL.green).lerp(COL.greenMid,smooth(0,0.45,u)).lerp(COL.greenTip,smooth(0.5,1,u)*0.5);
    c.lerp(COL.greenTip,(1-Math.abs(xn[i]))*0.12);if(purple)c.lerp(COL.purple,purple*smooth(0.4,1,u)*(0.6+0.4*Math.abs(xn[i])));});
}
const mkLeaf=(name,parent,pos,dir,nrm,geo)=>{
  const piv=new THREE.Group(); piv.name='leaf_'+name; piv.position.copy(pos); alignZ(piv,dir,nrm);
  const flap=new THREE.Group(); flap.name=name; piv.add(flap);
  const m=mesh(geo,M.leaf,name+'_mesh'); m.userData.skin=p=>{const w=smoothstep(0,geo.userData.len*0.7,p.z);return [[flap,w],[piv,1-w]];}; flap.add(m);
  parent.add(piv); return {piv,flap};
};
// plump, pointed petal; floret = 6 petals round a gold eye
const PETAL=(()=>{const g=smoothSphere(5,3);g.scale(0.042,0.056,0.014);g.translate(0,0.052,0);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const u=clamp01(p.getY(i)/0.108);p.setX(i,p.getX(i)*(1-0.4*smooth(0.6,1,u)));p.setZ(i,p.getZ(i)+0.01*Math.sin(Math.PI*u));}
  g.computeVertexNormals();return g;})();
const FLORET=(()=>{
  const parts=[],cIn=C(0xb495ea),cOut=C(0x8f62d4);
  for(let k=0;k<5;k++){const g=PETAL.clone();paint(g,(x,y,z,c)=>c.copy(cIn).lerp(cOut,clamp01(y/0.1)));g.rotateX(0.25);g.rotateZ(k/5*Math.PI*2);parts.push(g);}
  const ctr=smoothSphere(5,3);ctr.scale(0.018,0.018,0.011);ctr.translate(0,0,0.022);ctr.computeVertexNormals();paint(ctr,(x,y,z,c)=>c.set(0xd6a13c));parts.push(ctr);
  return mergeGeometries(parts);
})();
const BUD=(()=>{const g=smoothSphere(6,4);g.scale(0.04,0.04,0.032);g.computeVertexNormals();return g;})();

// ---------- character
const char=new THREE.Group(); char.name='Hyacinth';
const rig=new THREE.Group(); rig.name='rig'; char.add(rig);
const SPINE_Y=0.52; const spine=new THREE.Group(); spine.name='spine'; spine.position.y=SPINE_Y; rig.add(spine);

// pear body: olive with a lavender belly panel
const BR=V(0.17,0.22,0.155);
const lower=new THREE.Group(); lower.name='lower'; rig.add(lower);
const bodyG=new THREE.Group(); bodyG.position.y=0.36; lower.add(bodyG);
{const g=smoothSphere(20,14),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const y=p.getY(i),k=1+0.12*(1-y)*(1+y)*(-y)+0.08*(-y);p.setXYZ(i,p.getX(i)*BR.x*k,y*BR.y,p.getZ(i)*BR.z*k);}
 g.computeVertexNormals();
 paint(g,(x,y,z,c)=>{const nx=x/BR.x,ny=y/BR.y,nz=z/BR.z,a=Math.atan2(x,z);
   const pu=smooth(0.1,0.55,nz)*(1-smooth(0.2,0.55,Math.abs(nx)))*smooth(-0.85,-0.4,ny);
   c.copy(COL.green).lerp(COL.greenMid,0.35+0.3*smooth(-0.6,0.6,ny)).lerp(COL.belly,pu);
   c.lerp(COL.streak,pu*0.55*Math.pow(0.5+0.5*Math.cos(a*11),5));});
 const b=mesh(g,M.body,'body'); b.userData.skin=p=>{const w=smoothstep(0.05,0.2,p.y)*0.7;return [[spine,w],[lower,1-w]];}; bodyG.add(b);}

const legs=[];
for(const s of [-1,1]){
  const hip=new THREE.Group(); hip.name='leg'; hip.position.set(0.085*s,0.15,0.01);
  const l=mesh(new THREE.CapsuleGeometry(0.074,0.06,4,10),M.limb,'leg_mesh'); l.position.y=-0.03; hip.add(l);
  const ft=new THREE.Group(); ft.name='foot'; ft.position.set(0,-0.095,0.02); hip.add(ft);
  ft.add(mesh(ell(12,9,V(0.084,0.058,0.1)),M.limb,'foot'));
  rig.add(hip); legs.push({hip,ft,s});
}

// short lavender neck strip + wide, short head
const HR=V(0.22,0.175,0.185), HEAD_Y=0.75;
{const n=mesh(new THREE.CapsuleGeometry(0.075,0.08,6,14),M.face,'neck'); n.position.y=0.58-SPINE_Y; n.userData.skin=p=>{const w=smoothstep(-0.03,0.06,p.y);return [[head,w],[spine,1-w]];}; spine.add(n);}
const head=new THREE.Group(); head.name='head'; head.position.y=HEAD_Y-SPINE_Y; spine.add(head);
const headSq=new THREE.Group(); head.add(headSq);
headSq.add(mesh(ell(20,14,HR),M.face,'head_mesh'));
function onHead(dir,sink=1){const d=dir.clone().normalize();const t=1/Math.sqrt((d.x/HR.x)**2+(d.y/HR.y)**2+(d.z/HR.z)**2);
  return {p:d.multiplyScalar(t*sink),n:V(dir.x/HR.x**2,dir.y/HR.y**2,dir.z/HR.z**2).normalize()};}
const face=new THREE.Group(); face.name='face'; headSq.add(face);
const eyes=[];
for(const s of [-1,1]){
  const {p,n}=onHead(V(0.5*s,-0.2,1),0.975);
  const e=new THREE.Group(); e.name=s<0?'eye_L':'eye_R'; e.position.copy(p); alignZ(e,n,V(0,1,0));
  const ball=mesh(new THREE.SphereGeometry(0.044,14,10),M.eye,'eyeball'); ball.scale.set(1,1.08,0.5); e.add(ball);
  const g1=new THREE.Mesh(new THREE.SphereGeometry(0.013,10,6),M.glint); g1.name='glint'; g1.position.set(0.015,0.018,0.021); g1.scale.z=0.4; e.add(g1);
  const g2=new THREE.Mesh(new THREE.SphereGeometry(0.006,8,6),M.glint); g2.name='glint'; g2.position.set(-0.016,-0.015,0.022); g2.scale.z=0.4; e.add(g2);
  face.add(e); eyes.push(e);
}
for(const s of [-1,1]){
  const {p,n}=onHead(V(0.8*s,-0.55,1),0.985);
  const ck=new THREE.Mesh(new THREE.SphereGeometry(0.032,14,8),M.cheek); ck.name='cheek'; ck.position.copy(p); alignZ(ck,n,V(0,1,0)); ck.scale.set(1.05,0.66,0.16); face.add(ck);
}
{
  const {p,n}=onHead(V(0,-0.55,1),0.995);
  const m=new THREE.Group(); m.name='mouth'; m.position.copy(p); alignZ(m,n,V(0,1,0));
  const arc=Math.PI*0.7, tg=new THREE.TorusGeometry(0.024,0.0055,8,16,arc); tg.rotateZ(-Math.PI/2-arc/2);
  const t=mesh(tg,M.mouth,'smile'); t.scale.z=0.5; t.position.y=0.015; m.add(t); face.add(m);
}

// bloom spike worn like a hood: starts below ear level, leaves only the face open; 3-bone chain for sway
const H=0.76, SEG=[0,0.26,0.52], SB=-0.13;
const rT=t=>0.25*Math.pow(Math.sin(Math.PI*Math.min(1,0.32+0.68*Math.max(0,t))),0.45)*(1-0.32*t*t);
const faceOpen=(h,a,cut)=>SB+h<cut&&Math.cos(a)>0.2;
const spikes=[];
{let par=headSq;SEG.forEach((y,k)=>{const g=new THREE.Group();g.name='spike_'+(k+1);g.position.set(0,k?0.26:SB,k?0:-0.015);par.add(g);spikes.push(g);par=g;});}
{
  const g=smoothSphere(16,12),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),t=(y+1)/2,h=t*H,ring=Math.hypot(x,z),a=Math.atan2(x,z);
    const open=smooth(0.1,0.45,Math.cos(a))*(1-smooth(0.2,0.26,h)),k=ring>1e-6?rT(t)*0.9*(1-0.62*open)/ring:0;p.setXYZ(i,x*k,h,z*k);}
  g.computeVertexNormals();
  const m=mesh(g,M.core,'spike_core');
  m.userData.skin=q=>{const h=q.y,w3=smoothstep(0.46,0.58,h),w2=smoothstep(0.2,0.32,h)*(1-w3);return [[spikes[0],1-w2-w3],[spikes[1],w2],[spikes[2],w3]];};
  spikes[0].add(m);
}
function spikePt(t,a,s){const r=rT(t)*s,e=0.01,dr=(rT(t+e)-rT(t-e))/(2*e*H),rd=V(Math.sin(a),0,Math.cos(a));return {p:V(rd.x*r,t*H,rd.z*r),n:V(rd.x,-dr,rd.z).normalize()};}
const onSpike=(o,p)=>{const k=p.y<SEG[1]?0:p.y<SEG[2]?1:2;o.position.copy(p).setY(p.y-SEG[k]);spikes[k].add(o);};
const GA=Math.PI*(3-Math.sqrt(5));
{
  const N=58;
  for(let i=0;i<N;i++){const t=0.03+0.91*(i+0.5)/N,a=i*GA;if(faceOpen(t*H,a,0.13))continue;
    const {p,n}=spikePt(t,a,1.0),f=mesh(FLORET,M.floret,'floret');alignZ(f,n,V(0,1,0));f.rotateZ(R(0,6.28));
    const s=R(0.85,1.0)*(1-0.38*t)*(SB+t*H<0.2&&Math.cos(a)>0?0.72:1);f.scale.set(s,s,s);onSpike(f,p);}
  const NB=78;
  for(let i=0;i<NB;i++){const t=0.01+0.97*(i+0.5)/NB,a=i*GA+1.9;if(faceOpen(t*H,a,0.1))continue;
    const {p,n}=spikePt(t,a,0.97),b=mesh(BUD,M.bud,'bud');alignZ(b,n,V(0,1,0));const s=R(0.85,1.1)*(1-0.4*t);b.scale.set(s,s,s);onSpike(b,p);}
  for(let i=0;i<18;i++){const a=i/18*Math.PI*2;const fr=Math.cos(a)>0.2,t=fr?(0.13-SB)/H:0.015,{p,n}=spikePt(t,a,1.0),b=mesh(BUD,M.bud,'bud');alignZ(b,fr?n.clone().add(V(0,0.3,0)):n.clone().add(V(0,-0.5,0)),V(0,1,0));b.scale.setScalar(R(0.9,1.1));onSpike(b,p);}
  const tip=mesh(BUD,M.bud,'bud_tip');tip.scale.set(0.8,0.8,1.3);tip.rotation.x=-Math.PI/2;onSpike(tip,V(0,H-0.01,0));
}

// the ONLY two leaves: one continuous leaf per side, shaped like a chevron worn as a jacket.
// Upper blade rises past the head (collar), lower blade sweeps down-out to a tip beside the legs;
// the inner edge runs tip -> chest V -> lower tip. Wraps the torso front-mid to back-mid at the shoulder line.
// Grid domain: U -1 (lower tip) .. 0 (shoulder line) .. 1 (upper tip); V -1 (front edge) .. 1 (back edge).
const collar=[], arms=[], skirt=[];
M.leaf.side=THREE.DoubleSide;
const bodyR=(y,th)=>{const ny=Math.max(-0.98,Math.min(0.98,(y-0.36)/BR.y)),k=1+0.12*(1-ny)*(1+ny)*(-ny)+0.08*(-ny),r=Math.sqrt(1-ny*ny)*k;return Math.hypot(Math.sin(th)*BR.x*r,Math.cos(th)*BR.z*r);};
function bigLeaf(s){
  const NU=37,NV=17,sm=smooth;
  const ring=th=>V(s*Math.sin(th)*0.145,0.5+0.03*Math.sin(th),Math.cos(th)*(th<Math.PI/2?0.155:0.14));
  const side=ring(Math.PI/2), TIP=V(s*0.44,0.86,0.03), thTip=1.45, yTip=0.13;
  const outOf=q=>{const o=V(q.x,0,q.z);if(o.lengthSq()<1e-8)o.set(s,0,0);return o.normalize();};
  const prof=x=>Math.pow(Math.max(0,1-x*x),0.35);
  const P=[],T=[],Z=[];
  for(let i=0;i<NU;i++){const U=-1+2*i/(NU-1);
    for(let j=0;j<NV;j++){const v=-1+2*j/(NV-1),f=(v+1)/2;let q,t,z;
      if(U>=0){const u=U,su=Math.sin(Math.PI*u),th=f*Math.PI;q=ring(th).sub(side);const w=(1-u)*(1+1.7*su);
        q.set(q.x*(1-u)*(1+0.6*su),q.y*w,q.z*w).add(side.clone().lerp(TIP,u));
        q.addScaledVector(outOf(q),0.08*su*(1-Math.abs(v))*(1-0.3*u)+0.03*u*u*u);
        t=0.024*Math.pow(1-u,0.45)*prof(v); z={up:1,u,v};}
      else{const tt=-U,st=Math.sin(Math.PI*tt),e=Math.pow(tt,0.8);
        const th=(1-e)*f*Math.PI+e*thTip, y=0.52+(yTip-0.52)*tt+0.02*(f-0.5)*st;
        const R=bodyR(y,th)+0.024+0.3*tt*tt+0.035*st*(1-v*v);
        const cyl=V(s*Math.sin(th)*R,y,Math.cos(th)*R);
        q=ring(th).lerp(cyl,sm(0,0.22,tt));
        t=0.024*Math.pow(1-tt,0.45)*prof(v); z={lo:1,tt,v};}
      P.push(q);T.push(t);Z.push(z);}}
  const at=(i,j)=>P[Math.min(NU-1,Math.max(0,i))*NV+Math.min(NV-1,Math.max(0,j))];
  // arm-hole: cylinder cut along the arm axis, rim snapped to a clean circle, walls stitch the two shells
  const AO=V(0.15*s,0.44,0.03),AD=V(s,-0.12,0.04).normalize(),HR=0.044,tmp=V();
  const axD=p=>{tmp.subVectors(p,AO);const t=tmp.dot(AD);return {t,d:tmp.addScaledVector(AD,-t).length()};};
  let HOLE=null,best=1e9;for(const p of P){const a=axD(p);if(a.t>0&&a.d<best){best=a.d;HOLE=p.clone();}}
  const cut=new Set(),hc=V();
  for(let i=0;i<NU-1;i++)for(let j=0;j<NV-1;j++){const a0=i*NV+j;hc.copy(P[a0]).add(P[a0+NV]).add(P[a0+NV+1]).add(P[a0+1]).multiplyScalar(0.25);
    const a=axD(hc);if(a.d<HR&&hc.distanceTo(HOLE)<0.1)cut.add(a0);}
  const rim=new Set();for(let i=0;i<NU-1;i++)for(let j=0;j<NV-1;j++){const a0=i*NV+j;if(cut.has(a0))continue;
    for(const k of [a0,a0+NV,a0+NV+1,a0+1]){const ci=Math.floor(k/NV),cj=k%NV;for(const [di,dj] of [[0,0],[-1,0],[0,-1],[-1,-1]])if(cut.has((ci+di)*NV+cj+dj))rim.add(k);}}
  for(const k of rim){const p=P[k];tmp.subVectors(p,AO);const t=tmp.dot(AD);const foot=AO.clone().addScaledVector(AD,t);tmp.subVectors(p,foot);if(tmp.lengthSq()>1e-10)p.copy(foot).addScaledVector(tmp.normalize(),HR);}
  const pos=[],col=[],idx=[],W=new Map(),c=new THREE.Color(),du=V(),dv=V(),n=V();
  const key=p=>p.x.toFixed(4)+','+p.y.toFixed(4)+','+p.z.toFixed(4);
  for(const sgn of [1,-1]) for(let i=0;i<NU;i++) for(let j=0;j<NV;j++){const k=i*NV+j,p=P[k],z=Z[k];
    du.subVectors(at(i+1,j),at(i-1,j));dv.subVectors(at(i,j+1),at(i,j-1));n.crossVectors(du,dv);
    if(n.lengthSq()<1e-12)n.copy(outOf(p));n.normalize();
    const q=p.clone().addScaledVector(n,sgn*T[k]);pos.push(q.x,q.y,q.z);
    if(z.up)c.copy(COL.green).lerp(COL.greenMid,sm(0,0.5,z.u)).lerp(COL.greenTip,sm(0.55,1,z.u)*0.5).lerp(COL.greenTip,(1-Math.abs(z.v))*0.14);
    else c.copy(COL.green).lerp(COL.greenMid,sm(0,0.5,z.tt)).lerp(COL.greenTip,(1-Math.abs(z.v))*0.12).lerp(COL.purple,0.6*sm(0.45,1,z.tt)*(0.5+0.5*Math.abs(z.v)));
    col.push(c.r,c.g,c.b);
    if(!W.has(key(q)))W.set(key(q),z);}
  const off=NU*NV;
  const ec=new Map(),ek=(a,b)=>a<b?a+'_'+b:b+'_'+a;
  for(let i=0;i<NU-1;i++)for(let j=0;j<NV-1;j++){const a0=i*NV+j,b0=a0+NV,c0=b0+1,d0=a0+1;if(cut.has(a0))continue;
    idx.push(a0,b0,c0,a0,c0,d0,off+a0,off+c0,off+b0,off+a0,off+d0,off+c0);
    for(const [x,y] of [[a0,b0],[b0,c0],[c0,d0],[d0,a0]]){const kk=ek(x,y),e=ec.get(kk);if(e)e.n++;else ec.set(kk,{x,y,n:1});}}
  // hole wall: duplicated verts so the rim gets its own crisp normals
  for(const {x,y,n:cnt} of ec.values()){if(cnt!==1||!rim.has(x)||!rim.has(y))continue;
    const b=pos.length/3;for(const k of [x,y,off+y,off+x]){pos.push(pos[k*3],pos[k*3+1],pos[k*3+2]);col.push(COL.green.r*0.8,COL.green.g*0.8,COL.green.b*0.8);}
    idx.push(b,b+1,b+2,b,b+2,b+3);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
  const lp=q=>q.clone().setY(q.y-SPINE_Y);
  const cp=new THREE.Group();cp.name='leaf_collar';cp.position.copy(lp(side));spine.add(cp);
  const flapC=new THREE.Group();flapC.name=s>0?'Collar_L':'Collar_R';cp.add(flapC);
  const lpv=new THREE.Group();lpv.name='leaf_low';lpv.position.copy(lp(side));spine.add(lpv);
  const flapL=new THREE.Group();flapL.name='Low_'+(s>0?'L':'R');lpv.add(flapL);
  const m=mesh(g,M.leaf,'leaf');m.position.y=-SPINE_Y;spine.add(m);
  m.userData.skin=p=>{const z=W.get(key(p));if(!z)return [[spine,1]];
    if(z.up){const w=sm(0.04,0.45,z.u);return [[flapC,w],[spine,1-w]];}
    const w=sm(0.1,0.7,z.tt);return [[flapL,w],[spine,1-w]];};
  collar.push({flap:flapC,s,k:collar.length}); skirt.push({flap:flapL});
}
bigLeaf(-1); bigLeaf(1);
// arms: leafy arms coming out of the jacket where the leaf hugs the body (front-side of the shoulder line)
for(const s of [-1,1]){
  const sh=new THREE.Group(); sh.name=s<0?'arm_L':'arm_R'; sh.position.set(0.15*s,0.44-SPINE_Y,0.03);
  const inner=new THREE.Group(); alignZ(inner,V(s,-0.12,0.04),V(0,0.25,1)); sh.add(inner);
  const geo=leafGeo(0.062,0.36,0.042,-0.2,0.04,0.4,0.55,0.1,0.9);
  const mit=new THREE.Group(); mit.name='hand'; mit.position.z=0.26; inner.add(mit);
  const m=mesh(geo,M.leaf,'arm_leaf'); m.userData.skin=p=>{const w=smoothstep(0.06,0.22,p.z);return [[mit,w],[sh,1-w]];}; inner.add(m);
  {const cg=mergeGeometries([new THREE.CylinderGeometry(0.05,0.056,0.13,20,3,true).translate(0,0.035,0),new THREE.CylinderGeometry(0.056,0.082,0.035,20,1,true).translate(0,-0.045,0)]);cg.rotateX(Math.PI/2);cg.translate(0,0,0.045);
   const pc=cg.attributes.position,ca=new Float32Array(pc.count*3),cc=new THREE.Color();
   for(let i=0;i<pc.count;i++){cc.copy(COL.green).lerp(COL.greenMid,smoothstep(0,0.1,pc.getZ(i)));ca.set([cc.r,cc.g,cc.b],i*3);}
   cg.setAttribute('color',new THREE.BufferAttribute(ca,3));cg.computeVertexNormals();
   const cuff=mesh(cg,M.leaf,'arm_cuff');cuff.userData.skin=()=>[[sh,1]];inner.add(cuff);}
  const socket=new THREE.Group(); socket.name=s<0?'hand_socket_L':'hand_socket_R'; socket.position.set(0,0.02,0.02); mit.add(socket);
  spine.add(sh); arms.push({sh,mit,socket,s});
}



// ---------- rig · clips · export (the preview plays the re-imported GLB)
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
  head.rotation.z=W?-Math.sin(ph-0.5)*0.07:o(0.9)*0.03; head.rotation.x=o(1.9,0.6)*0.012;
  legs.forEach(({hip},i)=>{hip.rotation.x=(i?-1:1)*Math.sin(ph)*0.45*walk;hip.position.y=0.15+Math.max(0,Math.sin(ph+(i?Math.PI:0)))*0.045*walk;});
  arms.forEach(({sh,s},i)=>{sh.rotation.y=(i?1:-1)*Math.sin(ph)*0.3*walk;sh.rotation.z=s*(o(1.9)*0.04+walk*0.07*Math.sin(2*ph-1));});
  spikes.forEach((b,k)=>{b.rotation.z=walk*0.05*Math.sin(ph-0.9-0.55*k)+o(0.9,1+k*0.7)*0.012;b.rotation.x=-walk*(0.02+0.018*Math.sin(2*ph-1.8-0.6*k))+o(1.3,k*0.8)*0.01;});
  collar.forEach(({flap,k,s})=>{flap.rotation.z=-s*(o(1.2,k*1.7)*0.02+walk*0.05*Math.sin(2*ph-1.2+k*1.3)+hsq*0.8);flap.rotation.x=walk*0.03*Math.sin(2*ph-0.6+k);});
  skirt.forEach(({flap},k)=>{flap.rotation.x=o(1.5,k*0.9)*0.015+walk*(0.05*Math.sin(2*ph+k*0.9)-sq*0.8);});
  const bk=blink(t,BLINKS[clip]); eyes.forEach(e=>e.scale.y=bk);
}
const B=[[rig,'Hips'],[spine,'Spine'],[lower,'Body'],[head,'Head'],[headSq,'Head_Squash']];
spikes.forEach((b,k)=>B.push([b,'Spike_'+(k+1)]));
eyes.forEach(e=>B.push([e,'Eye_'+(e.position.x>0?'L':'R')]));
arms.forEach(({sh,mit,socket,s})=>{const k=s>0?'L':'R';B.push([sh,'Arm_'+k],[mit,'Hand_'+k],[socket,'Hand_Socket_'+k]);});
legs.forEach(({hip,ft,s})=>{const k=s>0?'L':'R';B.push([hip,'Leg_'+k],[ft,'Foot_'+k]);});
collar.forEach(({flap})=>B.push([flap,'Leaf_'+flap.name]));
skirt.forEach(({flap})=>B.push([flap,'Leaf_'+flap.name]));
const HOP=bakeHop('florets',{host:char,anchors:spikes,color:0x9b6fd6,feet:legs.map(l=>l.ft)}); HOP.bones.forEach(b=>B.push(b));
const built=await buildCharacter({name:'Hyacinth',source:char,bones:B,feet:legs.map(l=>l.ft),rest:()=>{pose('Idle',0);HOP.hide();},clips:[{name:'Idle',duration:IDLE_T,skip:HOP_FX,pose:t=>{pose('Idle',t);HOP.hide();}},{name:'Walk',duration:WALK_T,skip:HOP_FX,pose:t=>{pose('Walk',t);HOP.hide();}},{name:'Hop',duration:HOP.duration,only:HOP_FX,pose:t=>{pose('Idle',0);HOP.pose(t);}}]});
built.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
return {buffer:built.buffer,scene:built.scene,clips:built.clips,WALK_SPEED};
}
