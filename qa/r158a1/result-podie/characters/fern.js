import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildCharacter, loopOsc, blink, smoothstep, mountReport } from '../character-rig.js';
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

// ---------- materials (fern greens, brown tips, soil roots)
const skin=(name,col,o={})=>new THREE.MeshPhysicalMaterial({name,color:col,vertexColors:!!o.vc,roughness:o.rough??0.8,metalness:0,sheen:o.sheen??0.45,sheenRoughness:0.75,sheenColor:C(o.sc??0xe8f0d0)});
const M={
  body:skin('body',0xffffff,{vc:true,sheen:0.25}),
  frond:new THREE.MeshPhysicalMaterial({name:'frond',color:0xffffff,vertexColors:true,roughness:0.9,sheen:0.25,sheenRoughness:0.8,sheenColor:C(0xc8d8a0),side:THREE.DoubleSide}),
  root:skin('root',0xffffff,{vc:true,rough:0.9,sheen:0.15,sc:0xe8d8c0}),
  limb:skin('limb',0x74904a,{sheen:0.3}),
  hand:skin('hand',0x6d8844,{sheen:0.3}),
  brow:new THREE.MeshStandardMaterial({name:'brow',color:0x2c3a18,roughness:0.8}),
  cheek:new THREE.MeshStandardMaterial({name:'cheek',color:0xd97a62,roughness:0.95,transparent:true,opacity:0.35,depthWrite:false}),
  eye:new THREE.MeshPhysicalMaterial({name:'eye',color:0x0f110e,roughness:0.12,clearcoat:1,clearcoatRoughness:0.05}),
  glint:new THREE.MeshBasicMaterial({name:'glint',color:0xffffff}),
  mouth:new THREE.MeshStandardMaterial({name:'mouth',color:0x26301a,roughness:0.6}),
  soil:new THREE.MeshStandardMaterial({name:'soil',color:0x4e3824,roughness:1}),
};
const COL={dark:C(0x5f7536),green:C(0x7d9747),light:C(0xa2b86a),vein:C(0xa9bb72),face:C(0x9fb270),brown:C(0x8a5a2c),brownDark:C(0x5e4024),root:C(0x7a5836),rootTip:C(0xb08a5e)};

// ---------- geometry helpers
function paint(g,fn){const p=g.attributes.position,a=new Float32Array(p.count*3),c=new THREE.Color();for(let i=0;i<p.count;i++){fn(p.getX(i),p.getY(i),p.getZ(i),c,i);a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;}
function smoothSphere(w,h){let g=new THREE.SphereGeometry(1,w,h);g.deleteAttribute('normal');g.deleteAttribute('uv');return mergeVertices(g);}
const mesh=(g,m,name)=>{const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=true;o.receiveShadow=true;return o;};
const alignZ=(obj,dir,up)=>{const z=dir.clone().normalize(),y=up.clone().sub(z.clone().multiplyScalar(up.dot(z))).normalize(),x=new THREE.Vector3().crossVectors(y,z);obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));};
const alignY=(obj,yd,zh)=>{const y=yd.clone().normalize(),z=zh.clone().sub(y.clone().multiplyScalar(zh.dot(y))).normalize(),x=new THREE.Vector3().crossVectors(y,z);obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));};
// tube along a curve with a radius profile; closed with a cap at the start
function taperTube(curve,seg,rad,radial,f){
  const g=new THREE.TubeGeometry(curve,seg,rad,radial,false),p=g.attributes.position,tt=new Float32Array(p.count);
  for(let i=0;i<=seg;i++){const t=i/seg,c=curve.getPointAt(t),k=f(t);for(let j=0;j<=radial;j++){const idx=i*(radial+1)+j;tt[idx]=t;p.setXYZ(idx,c.x+(p.getX(idx)-c.x)*k,c.y+(p.getY(idx)-c.y)*k,c.z+(p.getZ(idx)-c.z)*k);}}
  g.deleteAttribute('uv');g.deleteAttribute('normal');const out=mergeVertices(g);out.userData.t=tt;out.computeVertexNormals();return out;
}
class FnCurve extends THREE.Curve{constructor(fn){super();this.fn=fn;}getPoint(t,o=new THREE.Vector3()){return o.copy(this.fn(t));}}

// ---------- proportions from the sheet: mochi head on a pear torso, stubby leg block
const BODY={R:0.2,y0:0.1,H:0.5};
const bodyR=v=>BODY.R*Math.pow(Math.sin(Math.PI*(0.04+0.92*v)),0.5)*(1.08-0.45*v);
const bodyY=v=>BODY.y0+BODY.H*v;
const HEAD_Y=0.765, HR=V(0.25,0.2,0.22), FLAT=0.85;
function headPt(lat,lon,sink=1){const d=V(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon));const f=d.y<0?FLAT:1;return {p:V(d.x*HR.x,d.y*HR.y*f,d.z*HR.z).multiplyScalar(sink),n:V(d.x/HR.x,d.y/(HR.y*f),d.z/HR.z).normalize()};}
// broad, soft frond: short stalk, lanceolate blade, rounded tongue-lobes sweeping to the tip, raised midrib
function frondGeo(L,curl,nl){
  const N=48,pts=[],tan=[];let th=0,y=0,z=0;
  for(let i=0;i<=N;i++){const t=i/N;th=curl*Math.pow(t,1.4);pts.push(V(0,y,z));tan.push(V(0,Math.cos(th),Math.sin(th)));y+=L/N*Math.cos(th);z+=L/N*Math.sin(th);}
  const at=t=>{t=Math.min(1,Math.max(0,t));const f=t*N,i=Math.min(N-1,Math.floor(f)),k=f-i;return {p:pts[i].clone().lerp(pts[i+1],k),T:tan[i].clone().lerp(tan[i+1],k).normalize()};};
  const S0=0.02,W=t=>{const b=(t-S0)/(1-S0);return b<=0?0:0.2*L*Math.pow(Math.sin(Math.PI*Math.min(1,0.02+0.97*b)),0.55)*(1-0.22*b);};
  const RN=40,CN=3,pos=[],col=[],idx=[],X=V(1,0,0),c=new THREE.Color();
  for(let i=0;i<=RN;i++){const t=S0+(1-S0)*i/RN;for(let j=-CN;j<=CN;j++){
    const v=j/CN,av=Math.abs(v),b=(t-S0)/(1-S0),lp=((b*nl+av*0.55)%1+1)%1;
    const lobe=THREE.MathUtils.lerp(0.38+0.62*Math.pow(Math.sin(Math.PI*lp),0.45),1,smooth(0.88,1,b))*(0.55+0.45*smooth(0,0.12,b));
    const w=W(t),hw=w*lobe*av,{p,T}=at(t+hw*0.7/L),Nn=new THREE.Vector3().crossVectors(X,T);
    const P=p.clone().addScaledVector(X,Math.sign(v)*hw).addScaledVector(Nn,0.1*hw*av-0.004*(1-smooth(0,0.18,av)));
    pos.push(P.x,P.y,P.z);
    const side=Math.pow(1-Math.abs(Math.cos(Math.PI*lp)),8)*smooth(0.1,0.3,av)*(1-smooth(0.7,0.95,av));
    c.copy(COL.green).lerp(COL.dark,0.1*b).lerp(COL.vein,0.7*(1-smooth(0.03,0.1,av))).lerp(COL.vein,0.25*side).lerp(COL.dark,0.12*smooth(0.3,0.05,Math.sin(Math.PI*lp))*av)
     .lerp(COL.brown,Math.max(0.6*smooth(0.9,1,b),0.3*smooth(0.85,1,av*lobe)*smooth(0.3,0.85,b)));
    col.push(c.r,c.g,c.b);}}
  const C2=2*CN+1;for(let i=0;i<RN;i++)for(let j=0;j<C2-1;j++){const a=i*C2+j,bb=a+C2;idx.push(a,bb,a+1,a+1,bb,bb+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
  const rib=taperTube(new FnCurve(t=>at(t*0.95).p),8,0.011,3,t=>1-0.75*t),rt=rib.userData.t;
  paint(rib,(x,y,z,cc,i)=>{cc.copy(COL.vein).lerp(COL.green,0.35*(1-smooth(0,0.12,rt[i]))).lerp(COL.brown,0.5*smooth(0.85,1,rt[i]));});
  return {geo:mergeGeometries([g,rib]),at};
}
function leafGeo(len,w){
  const g=smoothSphere(10,7),p=g.attributes.position,uu=new Float32Array(p.count);
  for(let i=0;i<p.count;i++){const a=p.getX(i),b=p.getY(i),cc=p.getZ(i),u=(b+1)/2,f=Math.pow(Math.sin(Math.PI*Math.min(1,0.03+0.97*u)),0.5)*(1-0.25*u*u);uu[i]=u;
    p.setXYZ(i,a*w*f,u*len,cc*0.009+a*a*w*f*0.35+u*u*len*0.14);}
  g.computeVertexNormals();
  paint(g,(x,y,z,c,i)=>{c.copy(COL.green).lerp(COL.light,0.3*uu[i]).lerp(COL.vein,0.6*(1-smooth(0.002,0.008,Math.abs(x)))).lerp(COL.brown,0.5*smooth(0.82,1,uu[i]));});
  return g;
}

const char=new THREE.Group(); char.name='Fern';
const rig=new THREE.Group(); rig.name='rig'; char.add(rig);
const lower=new THREE.Group(); lower.name='lower'; rig.add(lower);
const head=new THREE.Group(); head.name='head'; head.position.set(0,HEAD_Y,0); rig.add(head);
const headSq=new THREE.Group(); head.add(headSq);
const SPINE_Y=0.4; const spine=new THREE.Group(); spine.name='spine'; spine.position.y=SPINE_Y; rig.add(spine);
// torso: pear, faint leaf veins
{const pts=[new THREE.Vector2(0,BODY.y0-0.002)];for(let i=0;i<=30;i++){const v=i/30;pts.push(new THREE.Vector2(bodyR(v),bodyY(v)));}pts.push(new THREE.Vector2(0,bodyY(1)+0.003));
 let g=new THREE.LatheGeometry(pts,28);g.deleteAttribute('uv');g.deleteAttribute('normal');g=mergeVertices(g);g.computeVertexNormals();
 paint(g,(x,y,z,c)=>{const v=(y-BODY.y0)/BODY.H,ph=Math.atan2(x,z),vein=Math.pow(Math.max(0,Math.cos(ph*3+v*1.4)),70)*smooth(0.2,0.45,v)*(1-smooth(0.75,0.92,v));
   c.copy(COL.green).lerp(COL.dark,0.3*(1-smooth(0.05,0.35,v))).lerp(COL.light,0.2*smooth(0.3,0.95,Math.cos(ph))*smooth(0.2,0.6,v)).lerp(COL.vein,0.35*vein);});
 const b=mesh(g,M.body,'torso');b.userData.skin=p=>{const w=smoothstep(0.32,0.55,p.y);return [[spine,w],[lower,1-w]];};lower.add(b);}
// head: wide mochi, flatter underside
const LID=skin('lid',0x93a863,{sheen:0.3});
{let g=smoothSphere(20,14);const p=g.attributes.position;
 for(let i=0;i<p.count;i++){const y=p.getY(i),k=(1+0.06*Math.max(0,-y)*(1+y))*(1-0.22*Math.pow(Math.max(0,y),2.2));p.setXYZ(i,p.getX(i)*HR.x*k,y*HR.y*(y<0?FLAT:1.12),p.getZ(i)*HR.z*k);}
 g.computeVertexNormals();
 paint(g,(x,y,z,c)=>{const fc=smooth(0.1,0.8,z/HR.z)*(1-smooth(0.5,0.9,y/HR.y)),ph=Math.atan2(x,z),vein=Math.pow(Math.max(0,Math.cos(ph*4)),90)*smooth(0.25,0.8,y/HR.y);
   c.copy(COL.green).lerp(COL.face,0.85*fc).lerp(COL.dark,0.15*smooth(0.6,1,y/HR.y)).lerp(COL.vein,0.35*vein*(1-fc));});
 headSq.add(mesh(g,M.body,'head_mesh'));}

// face: happy — open eyes, soft raised brows, smile
const face=new THREE.Group(); face.name='face'; headSq.add(face);
const eyes=[];
for(const s of [-1,1]){
  const {p,n}=headPt(-0.04,0.4*s,0.975);
  const e=new THREE.Group(); e.name=s<0?'eye_L':'eye_R'; e.position.copy(p); alignZ(e,n,V(0,1,0));
  const ball=mesh(new THREE.SphereGeometry(0.042,18,12),M.eye,'eyeball'); ball.scale.set(1,0.95,0.5); e.add(ball);
  const g1=new THREE.Mesh(new THREE.SphereGeometry(0.009,10,6),M.glint); g1.name='glint'; g1.position.set(0.012*s,-0.006,0.02); g1.scale.z=0.4; e.add(g1);
  face.add(e); eyes.push(e);
  const bp=headPt(0.35,0.36*s,1.02), br=new THREE.Group(); br.name='brow'; br.position.copy(bp.p); alignZ(br,bp.n,V(0,1,0));
  const bm=mesh(new THREE.CapsuleGeometry(0.012,0.055,4,8),M.brow,'brow_mesh'); bm.rotation.z=Math.PI/2+s*0.22; bm.position.x=-0.006*s; bm.scale.z=0.55; br.add(bm); face.add(br);
}
for(const s of [-1,1]){
  const {p,n}=headPt(-0.26,0.66*s,0.99);
  const ck=new THREE.Mesh(new THREE.SphereGeometry(0.034,14,8),M.cheek); ck.name='cheek'; ck.position.copy(p); alignZ(ck,n,V(0,1,0)); ck.scale.set(1.05,0.6,0.16); face.add(ck);
}
{
  const {p,n}=headPt(-0.4,0,1);
  const m=new THREE.Group(); m.name='mouth'; m.position.copy(p).addScaledVector(n,0.003); alignZ(m,n,V(0,1,0));
  const crv=new THREE.QuadraticBezierCurve3(V(-0.03,0.014,-0.006),V(0,-0.026,0.006),V(0.03,0.014,-0.006));
  m.add(mesh(new THREE.TubeGeometry(crv,20,0.0055,8,false),M.mouth,'frown'));
  for(const u of [0,1]){const c=mesh(new THREE.SphereGeometry(0.0055,10,8),M.mouth,'frown_corner'); c.position.copy(crv.getPoint(u)); m.add(c);}
  face.add(m);
}
// crown base (scalp): thick lobed cap on top of the head; fronds plug into its sockets
const SC=V(0.2,0.065,0.19), SCY=HR.y*0.8;
const curlB=new THREE.Group(); curlB.name='crown_base'; curlB.position.set(0,SCY,-0.01); headSq.add(curlB);
{let g=smoothSphere(28,12);const p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+0.07*Math.cos(6*Math.atan2(x,z))*(1-Math.abs(y));p.setXYZ(i,x*SC.x*k,y*SC.y*(y<0?0.6:1),z*SC.z*k);}
 g.computeVertexNormals(); paint(g,(x,y,z,c)=>{c.copy(COL.green).lerp(COL.dark,0.25).lerp(COL.light,0.2*smooth(0,SC.y,y));});
 }
const sockY=r=>HR.y*Math.sqrt(Math.max(0,1-(r/HR.x)**2))-SCY-0.018;
// fronds per socket map: inner I1–I4 upright, middle M1–M6 arching, outer O1–O6 drooping to the shoulders
const fronds=[];
const FR=[];
for(let i=0;i<4;i++)FR.push([Math.PI/4+i*Math.PI/2,0.03,0.22,0.66,0.5]);
for(let i=0;i<6;i++)FR.push([i*Math.PI/3,0.06,0.62,0.74,0.95]);
for(let i=0;i<6;i++)FR.push([Math.PI/6+i*Math.PI/3,0.09,1.15,0.78,1.6]);
FR.forEach(([phi,r,tilt,L,curl],k)=>{
  const {geo,at}=frondGeo(L,curl,12);
  const base=new THREE.Group(); base.name='frond_'+k;
  const out=V(Math.sin(phi),0,Math.cos(phi)); base.position.copy(out).multiplyScalar(r).setY(sockY(r));
  alignY(base,V(out.x*Math.sin(tilt),Math.cos(tilt),out.z*Math.sin(tilt)),out);
  const mid=new THREE.Group(); mid.position.copy(at(0.45).p); base.add(mid);
  const m=mesh(geo,M.frond,'frond'); m.userData.skin=q=>{const w=smoothstep(L*0.25,L*0.6,q.y+q.z*0.5);return [[mid,w],[base,1-w]];}; base.add(m);
  curlB.add(base); fronds.push({base,mid,k,ph:R(0,6),side:Math.sign(Math.sin(phi)),q0:base.quaternion.clone()});
});
// leaf collar at the neck — same build as Swamp: one ring of broad cupped leaves, each on its own sway bone
function collarLeafGeo(cb,cm,ct){
  const g=smoothSphere(8,6),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),u=(y+1)/2,ang=Math.atan2(z,x);
    const pr=Math.pow(Math.max(0,Math.sin(Math.PI*Math.pow(u,1.1))),0.72);
    const X=-Math.cos(ang)*0.4*pr;
    let Y=Math.sin(ang)*0.15*pr*(1-0.3*u); if(Y>0) Y*=0.7;
    const e=X/0.4; Y+=e*e*0.05*pr+0.04*u*u;
    p.setXYZ(i,X,Y,u);
  }
  g.computeVertexNormals();
  cb=C(cb);cm=C(cm);ct=C(ct);
  return paint(g,(x,y,z,c)=>{c.copy(cb).lerp(cm,Math.min(1,z/0.5));if(z>0.5)c.lerp(ct,Math.min(1,(z-0.5)/0.5));if(y<0.02)c.multiplyScalar(0.86);else c.multiplyScalar(1-0.22*Math.exp(-Math.abs(x)/0.018)*Math.min(1,z*4)*(1-z*0.6));});
}
const CLEAF=collarLeafGeo(0x5a7232,0x7d9747,0x93a863);
const collar=new THREE.Group(); collar.name='collar'; rig.add(collar);
// short neck, same skin as the body; blends into torso and head, leaves grow out of it
{const pts=[];for(let i=0;i<=10;i++){const t=i/10,y=0.54+0.12*t,r=0.082+0.035*Math.pow(1-t,2)+0.015*Math.pow(t,3);pts.push(new THREE.Vector2(r,y));}
 let g=new THREE.LatheGeometry(pts,24);g.deleteAttribute('uv');g.deleteAttribute('normal');g=mergeVertices(g);g.computeVertexNormals();
 paint(g,(x,y,z,c)=>{c.copy(COL.green).lerp(COL.light,0.15*smooth(0.3,0.95,Math.cos(Math.atan2(x,z))));});
 const nk=mesh(g,M.body,'neck'); nk.userData.skin=q=>{const w=smoothstep(0.6,0.7,q.y);return [[head,w],[collar,1-w]];}; collar.add(nk);}
const leaves=[];
{
  const N=13;
  for(let k=0;k<N;k++){
    const phi=k/N*Math.PI*2+R(-0.08,0.08), rr=V(Math.sin(phi),0,Math.cos(phi));
    const pivot=new THREE.Group(); pivot.name='leaf_'+k; pivot.position.set(rr.x*0.088,0.6+R(-0.006,0.006),rr.z*0.088);
    alignZ(pivot,rr.clone().add(V(0,-0.85,0)),V(0,1,0));
    const sway=new THREE.Group(); pivot.add(sway);
    const L=R(0.15,0.17), lf=mesh(CLEAF,M.frond,'collar_leaf'); lf.scale.set(L*1.1,L,L); lf.rotation.z=R(-0.1,0.1); sway.add(lf);
    lf.userData.skin=q=>{const w=smoothstep(0.05,0.8,q.z);return [[sway,w],[collar,1-w]];};
    collar.add(pivot); leaves.push({sway,ph:R(0,6.28),amp:0.03,flex:1.2});
  }
}
// arms: sausage-shaped, hanging slightly forward
const arms=[];
for(const s of [-1,1]){
  const sh=new THREE.Group(); sh.name=s<0?'arm_L':'arm_R'; sh.position.set(0.16*s,0.49,0.03);
  const inner=new THREE.Group(); inner.rotation.set(-0.3,0,s*0.38); sh.add(inner);
  const mit=new THREE.Group(); mit.name='mitten'; mit.position.y=-0.17; inner.add(mit);
  const a=mesh(new THREE.CapsuleGeometry(0.05,0.12,6,14),M.limb,'arm'); a.position.y=-0.09; a.userData.skin=p=>{const w=smoothstep(-0.05,-0.15,p.y);return [[mit,w],[sh,1-w]];}; inner.add(a);
  const socket=new THREE.Group(); socket.name=s<0?'hand_socket_L':'hand_socket_R'; socket.position.set(0,-0.03,0.02); mit.add(socket);
  rig.add(sh); arms.push({sh,mit,socket,s});
}
// legs: short block with two stubby rounded feet
const legs=[];
for(const s of [-1,1]){
  const hip=new THREE.Group(); hip.name='leg'; hip.position.set(0.085*s,0.14,0.0);
  const ft=new THREE.Group(); ft.name='foot'; ft.position.set(0,-0.085,0.02); ft.rotation.y=s*0.1; hip.add(ft);
  const lg=mesh(new THREE.CapsuleGeometry(0.075,0.04,6,14),M.limb,'leg'); lg.position.y=-0.04; lg.userData.skin=p=>{const w=smoothstep(-0.02,-0.08,p.y);return [[ft,w],[hip,1-w]];}; hip.add(lg);
  const f=mesh(smoothSphere(16,10),M.limb,'foot_mesh'); f.geometry.computeVertexNormals(); f.scale.set(0.08,0.05,0.1); f.position.set(0,0.0,0.015); ft.add(f);
  rig.add(hip); legs.push({hip,ft,s});
}


// spine: upper body hangs off it
char.updateMatrixWorld(true);
[head,collar,...arms.map(a=>a.sh)].forEach(o=>spine.attach(o));
char.updateMatrixWorld(true);
const SPORE_MAT=new THREE.MeshStandardMaterial({name:'spore',color:0x7a5530,roughness:0.9});
const sporeB=[];
{const g0=new THREE.IcosahedronGeometry(0.007,0),g1=new THREE.IcosahedronGeometry(0.005,0).translate(0.02,-0.012,0.01),g2=new THREE.IcosahedronGeometry(0.006,0).translate(-0.016,0.008,-0.014);
 const sg=mergeGeometries([g0,g1].map(g=>{g.deleteAttribute('uv');return g;}));
 fronds.forEach((f,i)=>{const b=new THREE.Group();b.name='spore_'+i;const w=f.mid.getWorldPosition(new THREE.Vector3());rig.worldToLocal(w);b.position.copy(w);b.userData.p0=w.clone();
   const out=V(w.x,0,w.z).normalize(),fr=((i*0.618)%1);b.userData.v=out.multiplyScalar(0.28+0.2*fr).add(V(0,0.06+0.14*((i*0.37)%1),0));
   b.scale.setScalar(1e-4);b.add(mesh(sg,SPORE_MAT,'spores'));rig.add(b);sporeB.push(b);});}
// ---------- rig · clips · export (the preview plays the re-imported GLB)
const WALK_SPEED=1.1, IDLE_T=6.6, WALK_T=4*2*Math.PI/(3+WALK_SPEED*4);
const BLINKS={Idle:[2.1,5.2],Walk:[1.3]};
function poseBase(clip,t){
  sporeB.forEach(b=>{b.position.copy(b.userData.p0);b.scale.setScalar(1e-4);});
  const W=clip==='Walk',T=W?WALK_T:IDLE_T,osc=loopOsc(T),o=(f,p)=>osc(t,f,p),walk=W?1:0,ph=W?4*t/T*Math.PI*2:0;
  const breathe=W?0:o(1.9)*0.012;
  const sq=walk*Math.pow(Math.abs(Math.cos(ph-0.35)),8)*0.03, hsq=walk*Math.pow(Math.abs(Math.cos(ph-0.8)),8)*0.025;
  rig.position.y=Math.abs(Math.sin(ph))*0.025*walk; rig.rotation.set(0.04*walk,0,Math.sin(ph)*0.08*walk);
  lower.scale.set(1+sq*0.7,1-sq+breathe*0.5,1+sq*0.7);
  spine.rotation.z=W?-Math.sin(ph)*0.05:o(1,0.4)*0.012;
  head.position.y=HEAD_Y*(1-sq*0.6)+breathe*1.4-SPINE_Y;
  headSq.scale.set(1+hsq*0.6,1-hsq,1+hsq*0.6);
  head.rotation.z=W?-Math.sin(ph-0.5)*0.06:o(0.9)*0.035; head.rotation.x=(W?0.03:0.02)+o(1.9,0.6)*0.012; head.rotation.y=W?0:o(0.6,2)*0.07;
  legs.forEach(({hip},i)=>{hip.rotation.x=(i?-1:1)*Math.sin(ph)*0.4*walk;hip.position.y=0.14+Math.max(0,Math.sin(ph+(i?Math.PI:0)))*0.045*walk;});
  arms.forEach(({sh,s},i)=>{sh.rotation.x=(i?1:-1)*Math.sin(ph)*0.5*walk+o(1.9,0.3)*0.03*(1-walk);sh.rotation.z=s*(0.02+o(1.9)*0.02);sh.position.y=0.49*(1-sq*0.5)-SPINE_Y;});
  fronds.forEach(f=>{const lag=Math.sin(2*ph-1.4-f.k*0.3);
    f.base.quaternion.copy(f.q0).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(o(1.2,f.ph)*0.035+walk*0.04*lag,0,o(0.8,f.ph+1)*0.03+walk*0.03*Math.sin(ph-0.6)*f.side)));
    f.mid.rotation.x=o(1.2,f.ph-0.8)*0.07+o(3,f.ph)*0.015+walk*0.1*Math.sin(2*ph-2.2-f.k*0.3); f.mid.rotation.z=o(0.8,f.ph)*0.05;});
  for(const l of leaves){l.sway.rotation.x=o(1.2,l.ph)*0.06+o(3,l.ph)*0.012+walk*0.09*Math.sin(2*ph-1.6-l.ph*0.3);l.sway.rotation.z=o(0.8,l.ph)*0.04+walk*0.03*Math.sin(ph-0.6+l.ph);}
  curlB.rotation.x=o(1.5,0.5)*0.05+walk*0.08*Math.sin(2*ph-1.8); curlB.rotation.z=o(1,2)*0.04;
  const bk=blink(t,BLINKS[clip]); eyes.forEach(e=>e.scale.y=bk);
}
// Hop clip (exported): fronds + collar drag, spores puff from the fronds, drift, settle, vanish
const HOP_T=1.6;
function pose(clip,t){
  if(clip!=='Hop'){poseBase(clip,t);return;}
  poseBase('Idle',0);
  if(t>=HOP_T-1e-3)return;
  const d=Math.exp(-3.5*t)*Math.sin(7.5*t)*1.2*(1-smooth(1.3,HOP_T,t));
  fronds.forEach(f=>{f.mid.rotation.x+=d*0.45;f.base.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(d*0.2,0,0)));});
  leaves.forEach(l=>{l.sway.rotation.x+=d*0.3;});
  if(t>=HOP_T-1e-3)return;
  const k=2.2,e=1-Math.exp(-k*t),s=smooth(0,0.1,t)*(1-smooth(1.05,1.5,t));
  sporeB.forEach((b,i)=>{const v=b.userData.v;b.position.copy(b.userData.p0).add(V(v.x*e/k+Math.sin(t*4)*e*0.006,v.y*e/k-0.35/k*(t-e/k),v.z*e/k));b.position.y=Math.max(0.01,b.position.y);b.scale.setScalar(Math.max(1e-4,s));});
}
const B=[[rig,'Hips'],[spine,'Spine'],[lower,'Body'],[head,'Head'],[headSq,'Head_Squash'],[curlB,'Crown_Base']];
eyes.forEach(e=>B.push([e,'Eye_'+(e.position.x>0?'L':'R')]));
arms.forEach(({sh,mit,socket,s})=>{const k=s>0?'L':'R';B.push([sh,'Arm_'+k],[mit,'Hand_'+k],[socket,'Hand_Socket_'+k]);});
legs.forEach(({hip,ft,s})=>{const k=s>0?'L':'R';B.push([hip,'Leg_'+k],[ft,'Foot_'+k]);});
fronds.forEach(f=>B.push([f.base,'Frond_'+f.k],[f.mid,'Frond_'+f.k+'_Mid']));
B.push([collar,'Collar']); sporeB.forEach((b,i)=>B.push([b,'Spore_'+String(i).padStart(2,'0')])); leaves.forEach((l,i)=>B.push([l.sway,'Leaf_'+String(i).padStart(2,'0')]));
const built=await buildCharacter({name:'Fern',source:char,bones:B,feet:legs.map(l=>l.ft),rest:()=>pose('Idle',0),clips:[{name:'Idle',duration:IDLE_T,skip:/^Spore_/,pose:t=>pose('Idle',t)},{name:'Walk',duration:WALK_T,skip:/^Spore_/,pose:t=>pose('Walk',t)},{name:'Hop',duration:HOP_T,only:/^Spore_/,pose:t=>pose('Hop',t)}]});
built.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
return {buffer:built.buffer,scene:built.scene,clips:built.clips,WALK_SPEED};
}
