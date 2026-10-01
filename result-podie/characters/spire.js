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
const rand=mulberry32(4417);
const R=(a,b)=>a+(b-a)*rand();
const clamp01=x=>Math.min(1,Math.max(0,x));
const damp=(k,dt)=>1-Math.exp(-k*dt);
const wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a));
const C=h=>new THREE.Color(h);
const V=(x,y,z)=>new THREE.Vector3(x,y,z);

// ---------- materials
const skin=(name,col,o={})=>new THREE.MeshPhysicalMaterial({name,color:col,vertexColors:!!o.vc,roughness:o.rough??0.8,metalness:0,sheen:o.sheen??0.55,sheenRoughness:0.75,sheenColor:C(o.sc??0xeef4d8)});
const M={
  leaflet:skin('leaflet',0xffffff,{vc:true,rough:0.72,sheen:0.15,sc:0xc8dca0}),
  collar:skin('collar',0xffffff,{vc:true,sheen:0.18,sc:0xc8dca0}),
  stem:skin('stem',0x376a18,{rough:0.8,sheen:0.18}),
  head:skin('head',0xffffff,{vc:true,sheen:0.18,sc:0xc8dca0}),
  body:skin('body',0xffffff,{vc:true,sheen:0.18,sc:0xc8dca0}),
  limb:skin('limb',0x2c6016,{sheen:0.2}),
  cheek:new THREE.MeshStandardMaterial({name:'cheek',color:0xee8472,roughness:0.95,transparent:true,opacity:0.55,depthWrite:false}),
  eye:new THREE.MeshPhysicalMaterial({name:'eye',color:0x0f110e,roughness:0.12,clearcoat:1,clearcoatRoughness:0.05}),
  glint:new THREE.MeshBasicMaterial({name:'glint',color:0xffffff}),
  mouth:new THREE.MeshStandardMaterial({name:'mouth',color:0x33402a,roughness:0.6}),
};
const COL={side:C(0x559824),belly:C(0x86ba38),hSide:C(0x62a42a),face:C(0xdcd67e)};

// ---------- geometry
function paint(g,fn){const p=g.attributes.position,a=new Float32Array(p.count*3),c=new THREE.Color();for(let i=0;i<p.count;i++){fn(p.getX(i),p.getY(i),p.getZ(i),c,i);a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;}
function smoothSphere(w,h){let g=new THREE.SphereGeometry(1,w,h);g.deleteAttribute('normal');g.deleteAttribute('uv');return mergeVertices(g);}
const mesh=(g,m,name)=>{const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=true;o.receiveShadow=true;return o;};
const alignZ=(obj,dir,up)=>{const z=dir.clone().normalize(),y=up.clone().sub(z.clone().multiplyScalar(up.dot(z))).normalize(),x=new THREE.Vector3().crossVectors(y,z);obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));};
// small pointed collar leaf: base at origin, length +z
function leafGeo(cb,cm,ct){
  const g=smoothSphere(12,10),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),u=(y+1)/2,ang=Math.atan2(z,x);
    const pr=Math.pow(Math.max(0,Math.sin(Math.PI*Math.pow(u,1.1))),0.72);
    const X=-Math.cos(ang)*0.4*pr; let Y=Math.sin(ang)*0.15*pr*(1-0.3*u); if(Y>0) Y*=0.7;
    const e=X/0.4; Y+=e*e*0.05*pr+0.04*u*u;
    p.setXYZ(i,X,Y,u);
  }
  g.computeVertexNormals(); cb=C(cb);cm=C(cm);ct=C(ct);
  return paint(g,(x,y,z,c)=>{c.copy(cb).lerp(cm,clamp01(z/0.5));if(z>0.5)c.lerp(ct,clamp01((z-0.5)/0.5));if(y<0.02)c.multiplyScalar(0.88);else c.multiplyScalar(1-0.2*Math.exp(-Math.abs(x)/0.018)*clamp01(z*4)*(1-z*0.6));});
}
const LEAF=leafGeo(0x2a6a16,0x4c9a22,0x78ba30);
const LEAF_SKIN=(sway,pivot)=>p=>{const w=smoothstep(0.05,0.8,p.z);return [[sway,w],[pivot.parent,1-w]];};
// clover leaflet: true heart outline (point at the stem, notch outward), plump lens section, V-fold + grooved midrib
const LL=0.8, TH=0.075;
const HEART=(()=>{const P=[];let zmax=-1e9;for(let i=0;i<2000;i++){const t=i/2000*Math.PI*2,x=16*Math.sin(t)**3,y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);P.push([x,y+17]);zmax=Math.max(zmax,y+17);}
  const S=LL/zmax, cz=0.5*zmax*S, N=720, R=new Float32Array(N);
  for(const [x,z] of P){const X=x*S,Z=z*S-cz,a=Math.atan2(Z,X),b=((Math.round((a+Math.PI)/(2*Math.PI)*N))%N+N)%N;R[b]=Math.max(R[b],Math.hypot(X,Z));}
  for(let k=0;k<N;k++)if(!R[k]){let a=k,b=k;while(!R[(a+N-1)%N])a--;while(!R[(b+1)%N])b++;R[k]=(R[(a+N-1)%N]+R[(b+1)%N])/2;}
  return {cz,notch:(5+17)*S,w:16*S,r:a=>{const f=(a+Math.PI)/(2*Math.PI)*N,i=Math.floor(f),u=f-i;return R[((i%N)+N)%N]*(1-u)+R[(((i+1)%N)+N)%N]*u;}};})();
function leafletGeo(){
  const g=smoothSphere(48,16),p=g.attributes.position,rib=new Float32Array(p.count),ed=new Float32Array(p.count);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),rho=Math.hypot(x,z),a=Math.atan2(z,x),R=HEART.r(a);
    const X=Math.cos(a)*rho*R, Z=HEART.cz+Math.sin(a)*rho*R, e=Math.abs(X)/HEART.w;
    const r=Math.exp(-Math.pow(X/0.014,2))*(1-smoothstep(HEART.notch*0.8,HEART.notch*0.97,Z));
    const lobe=Math.exp(-(((Math.abs(X)-HEART.w*0.5)/(HEART.w*0.42))**2)-(((Z-LL*0.62)/(LL*0.3))**2));
    let Y=y*TH*(0.4+0.6*Math.sqrt(Math.max(0,1-rho*rho)))*(0.55+0.6*lobe)+(y>0?TH*0.35*lobe:0)+Math.abs(X)*0.42-0.08*(Z/LL)**2-0.05*(X/HEART.w)**2*(Z/LL);
    if(y>0) Y-=0.008*r;
    p.setXYZ(i,X,Y,Z); rib[i]=y>0?r:0; ed[i]=e;
  }
  g.computeVertexNormals();
  const cb=C(0x1a5010),cm=C(0x347c1a),ce=C(0x56a02a),cr=C(0x14400c);
  return paint(g,(x,y,z,c,i)=>{c.copy(cb).lerp(cm,smoothstep(0,0.22,z));c.lerp(ce,ed[i]*0.55*smoothstep(0.1,0.35,z));c.lerp(cr,rib[i]*0.8);if(y<Math.abs(x)*0.42-0.08*(z/LL)**2)c.multiplyScalar(0.88);});
}
// bulb head: round wide jowls, tapering up into the stem
const HR=V(0.37,0.32,0.34);
const FACE=V(0,-0.1,1).normalize();
function headGeo(){
  const g=smoothSphere(40,28),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),v=p.getY(i),z=p.getZ(i);
    const k=(1+0.12*Math.exp(-(((v+0.3)/0.45)**2)))*(1-0.2*smoothstep(0.1,0.85,v));
    p.setXYZ(i,x*k*HR.x,(v<0?v*0.92:v*(1+0.06*v*v))*HR.y,z*k*HR.z);
  }
  g.computeVertexNormals(); const v=new THREE.Vector3();
  return paint(g,(x,y,z,c)=>{v.set(x/HR.x,y/HR.y,z/HR.z).normalize();c.copy(COL.hSide).lerp(COL.face,Math.pow(clamp01((v.dot(FACE)-0.15)/0.65),1.2));});
}
const HEAD_GEO=headGeo(), HEAD_TOP=HR.y*1.06;
const onHead=(()=>{const m=new THREE.Mesh(HEAD_GEO,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),rc=new THREE.Raycaster();
  return (dir,sink=1)=>{rc.set(new THREE.Vector3(),dir.clone().normalize());const h=rc.intersectObject(m)[0];return {p:h.point.multiplyScalar(sink),n:h.face.normal.clone()};};})();
function bodyGeo(){
  const g=smoothSphere(28,20),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i),k=1+0.18*(-y)+0.03;p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}
  g.computeVertexNormals();
  return paint(g,(x,y,z,c)=>{c.copy(COL.side).lerp(COL.belly,smoothstep(0.1,0.85,z)*(1-smoothstep(0.55,0.95,y)));});
}
const solid=(g,col)=>{g.computeVertexNormals();const c0=C(col);return paint(g,(x,y,z,c)=>c.copy(c0));};

// ---------- character
const char=new THREE.Group(); char.name='Spire';
const rig=new THREE.Group(); rig.name='rig'; char.add(rig);

const body=mesh(bodyGeo(),M.body,'body'); body.scale.set(0.33,0.35,0.3); body.position.set(0,0.495,0); rig.add(body);
body.userData.skin=p=>{const w=0.25*smoothstep(0.4,1,p.y),ws=(1-w)*smoothstep(-0.5,0.3,p.y);return [[head,w],[spine,ws],[rig,1-w-ws]];};
const tail=mesh(solid(smoothSphere(16,12),0x9aae24),M.body,'tail'); tail.scale.set(0.09,0.09,0.08); tail.position.set(0,0.385,-0.3); rig.add(tail);

const LEG_GEO=(()=>{const pr=[[-0.275,0.001],[-0.275,0.07],[-0.27,0.098],[-0.255,0.112],[-0.235,0.114],[-0.21,0.106],[-0.18,0.092],[-0.15,0.086],[-0.11,0.089],[-0.06,0.097],[-0.01,0.104],[0.03,0.104],[0.06,0.09],[0.08,0.05],[0.088,0.001]];
  let g=new THREE.LatheGeometry(pr.map(([y,r])=>new THREE.Vector2(r,y)),16);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
  const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),f=smoothstep(-0.15,-0.25,y);let z=p.getZ(i);z=z*(1+0.3*f)+(z>0?0.03*f:0.008*f);p.setZ(i,z*1.06);}
  g.computeVertexNormals();return g;})();
const legs=[];
for(const s of [-1,1]){
  const hip=new THREE.Group(); hip.name='leg'; hip.position.set(0.13*s,0.265,0.02);
  const ft=new THREE.Group(); ft.name='foot'; ft.position.set(0,-0.25,0.02); hip.add(ft);
  const l=mesh(LEG_GEO,M.limb,'leg');
  l.userData.skin=p=>{const wh=0.7*smoothstep(-0.02,0.06,p.y),wf=smoothstep(-0.13,-0.22,p.y);return [[rig,wh],[ft,wf],[hip,Math.max(0,1-wh-wf)]];};
  hip.add(l); rig.add(hip); legs.push({hip,ft,s});
}
const arms=[];
const ARM_GEO=(()=>{const pts=[new THREE.Vector2(0.001,0.07),new THREE.Vector2(0.06,0.06)];
  for(let i=0;i<=10;i++){const v=i/10,y=0.04-v*0.33;pts.push(new THREE.Vector2(0.1+(0.064-0.1)*smoothstep(0,0.7,v)+0.008*smoothstep(0.7,1,v),y));}
  for(let k=1;k<=6;k++){const a=k/6*Math.PI/2;pts.push(new THREE.Vector2(Math.max(0.001,0.07*Math.cos(a)),-0.29-0.075*Math.sin(a)));}
  let g=new THREE.LatheGeometry(pts.reverse(),14);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);g.computeVertexNormals();return g;})();
for(const s of [-1,1]){
  const sh=new THREE.Group(); sh.name='arm'; sh.position.set(0.21*s,0.695,0.0);
  const inner=new THREE.Group(); inner.rotation.set(-0.15,0,s*1.12); sh.add(inner);
  const mit=new THREE.Group(); mit.name='hand'; mit.position.y=-0.33; inner.add(mit);
  const a=mesh(ARM_GEO,M.limb,'arm'); a.scale.z=0.9;
  a.userData.skin=p=>{const wb=smoothstep(-0.06,0.03,p.y),wh=smoothstep(-0.22,-0.32,p.y);return [[spine,wb],[mit,wh*(1-wb)],[sh,Math.max(0,1-wb-wh*(1-wb))]];};
  inner.add(a);
  for(const k of [-1,0,1]){const f=mesh(smoothSphere(12,8),M.limb,'finger'); f.geometry.computeVertexNormals(); f.scale.set(0.027,0.034,0.027); f.position.set(k*0.034,-0.045+Math.abs(k)*0.01,0.004); mit.add(f);}
  const th=mesh(smoothSphere(12,8),M.limb,'thumb'); th.geometry.computeVertexNormals(); th.scale.set(0.026,0.05,0.024); th.position.set(0,-0.012,0.036); th.rotation.x=0.95; mit.add(th);
  const socket=new THREE.Group(); socket.name='hand_socket'; socket.position.set(0,-0.05,0.03); mit.add(socket);
  rig.add(sh); arms.push({sh,mit,socket,s});
}

const head=new THREE.Group(); head.name='head'; head.position.set(0,1.075,0); rig.add(head);
head.add(mesh(HEAD_GEO,M.head,'head_mesh'));
const face=new THREE.Group(); face.name='face'; head.add(face);
const eyes=[];
for(const s of [-1,1]){
  const {p,n}=onHead(V(0.36*s,-0.14,1),0.985);
  const e=new THREE.Group(); e.name='eye'; e.position.copy(p); alignZ(e,n,V(0,1,0));
  const ball=mesh(new THREE.SphereGeometry(0.07,24,16),M.eye,'eyeball'); ball.scale.set(1,1.08,0.5); e.add(ball);
  const g1=new THREE.Mesh(new THREE.SphereGeometry(0.02,10,6),M.glint); g1.name='glint'; g1.position.set(0.023,0.028,0.032); g1.scale.z=0.4; e.add(g1);
  const g2=new THREE.Mesh(new THREE.SphereGeometry(0.009,8,6),M.glint); g2.name='glint'; g2.position.set(-0.025,-0.024,0.034); g2.scale.z=0.4; e.add(g2);
  face.add(e); eyes.push(e);
}
for(const s of [-1,1]){
  const {p,n}=onHead(V(0.72*s,-0.5,1),0.99);
  const ck=new THREE.Mesh(new THREE.SphereGeometry(0.05,14,8),M.cheek); ck.name='cheek'; ck.position.copy(p); alignZ(ck,n,V(0,1,0)); ck.scale.set(1.05,0.66,0.16); face.add(ck);
}
{
  const {p,n}=onHead(V(0,-0.44,1),0.998);
  const m=new THREE.Group(); m.name='mouth'; m.position.copy(p); alignZ(m,n,V(0,1,0));
  const arc=Math.PI*0.8, tg=new THREE.TorusGeometry(0.052,0.009,8,18,arc); tg.rotateZ(-Math.PI/2-arc/2);
  const t=mesh(tg,M.mouth,'smile'); t.scale.z=0.5; t.position.y=0.033; m.add(t); face.add(m);
}

// crown: stem + three leaflets, each leaflet on its own bone (flap) under a static orientation pivot
const stem=new THREE.Group(); stem.name='stem'; stem.position.set(0,HEAD_TOP*0.94,-0.01); stem.rotation.x=-0.12; head.add(stem);
{const sg=new THREE.CylinderGeometry(0.016,0.03,0.1,10,3); sg.translate(0,0.05,0); stem.add(mesh(sg,M.stem,'stem_mesh'));}
const LEAFLET=leafletGeo(), crown=[];
for(const [k,dir,up] of [['Top',V(0,1,-0.26),V(0,0.2,1)],['L',V(1,-0.08,-0.34),V(0,0.15,1)],['R',V(-1,-0.08,-0.34),V(0,0.15,1)]]){
  const piv=new THREE.Group(); piv.name='leaflet_pivot'; piv.position.set(0,0.085,0); alignZ(piv,dir,up); stem.add(piv);
  const flap=new THREE.Group(); flap.name='leaflet'; piv.add(flap);
  const m=mesh(LEAFLET,M.leaflet,'leaflet_mesh'); m.position.z=0.0; m.userData.skin=p=>{const w=smoothstep(0.01,0.08,p.z);return [[flap,w],[stem,1-w]];}; flap.add(m);
  crown.push({flap,k,s:k==='L'?1:k==='R'?-1:0,ph:R(0,6.28)});
}

// leaf collar at the neck
const leaves=[];
{
  const N=7;
  for(let k=0;k<N;k++){
    const phi=k/N*Math.PI*2+Math.PI/N+R(-0.08,0.08), rr=V(Math.sin(phi),0,Math.cos(phi));
    const pivot=new THREE.Group(); pivot.name='leaf_'+k; pivot.position.set(rr.x*0.17,0.825+R(-0.01,0.01),rr.z*0.16);
    alignZ(pivot,rr.clone().add(V(0,-1.35,0)),V(0,1,0));
    const sway=new THREE.Group(); pivot.add(sway);
    const L=R(0.22,0.25), lf=mesh(LEAF,M.collar,'leaf'); lf.scale.set(L*1.3,L*1.4,L); lf.rotation.z=R(-0.1,0.1); sway.add(lf); lf.userData.skin=LEAF_SKIN(sway,pivot);
    rig.add(pivot); leaves.push({sway,ph:R(0,6.28),amp:0.03,flex:1.3});
  }
}


// spine: upper body (head, arms, neck leaves) hangs off it
const SPINE_Y=0.55; const spine=new THREE.Group(); spine.name='spine'; spine.position.y=SPINE_Y; rig.add(spine); char.updateMatrixWorld(true);
[head,...arms.map(a=>a.sh),...rig.children.filter(o=>/leaf_/.test(o.name))].forEach(o=>spine.attach(o));
// ---------- rig · clips · export (the preview plays the re-imported GLB)
const WALK_SPEED=1.5, IDLE_T=6.6, WALK_T=4*2*Math.PI/(4+WALK_SPEED*5.5); // Walk = 4 strides, in place
const BLINKS={Idle:[1.9,4.8],Walk:[1.1]};
function pose(clip,t){
  const W=clip==='Walk',T=W?WALK_T:IDLE_T,osc=loopOsc(T),o=(f,p)=>osc(t,f,p),u=t/T*Math.PI*2,walk=W?1:0,ph=W?4*u:0;
  const breathe=W?0:o(2.1)*0.016, jig=walk*(0.011+0.006*Math.sin(2*ph-2));
  const land=walk*Math.pow(Math.abs(Math.cos(ph)),6)*0.05, lag=Math.sin(2*ph-1.9)*walk;
  rig.position.y=Math.pow(Math.abs(Math.sin(ph)),0.8)*0.07*walk; rig.rotation.set(0.05*walk,0,Math.sin(ph)*0.06*walk); rig.scale.set(1+land*0.6,1-land+breathe,1+land*0.6);
  legs.forEach(({hip},i)=>{hip.rotation.x=(i?-1:1)*Math.sin(ph)*0.6*walk;hip.position.y=0.265+Math.max(0,Math.sin(ph+(i?Math.PI:0)))*0.06*walk;});
  arms.forEach(({sh,s},i)=>{sh.rotation.x=(i?1:-1)*Math.sin(ph)*0.35*walk;sh.rotation.z=s*(0.04+o(2.1)*0.03+walk*0.08*Math.sin(2*ph-1));});
  head.rotation.z=W?-Math.sin(ph)*0.04:o(0.9)*0.03; head.rotation.x=o(2.1,0.6)*0.012-walk*0.04*Math.sin(2*ph-0.8); head.position.y=1.075+breathe*1.4-SPINE_Y;
  stem.rotation.x=-0.12-0.05*lag+o(1.3)*0.02; stem.rotation.z=o(0.9,1)*0.025+walk*0.04*Math.sin(ph-0.7);
  for(const c of crown){c.flap.rotation.x=o(1.2,c.ph)*0.03+0.05*lag; c.flap.rotation.y=c.s?c.s*(o(1.6,c.ph)*0.03-0.12*lag):o(1.4,c.ph)*0.035+walk*0.03*Math.sin(ph-1);}
  for(const l of leaves){l.sway.rotation.x=o(1.6,l.ph)*l.amp+jig*0.05*l.flex+(W?Math.sin(u+l.ph*2)*0.01:0);l.sway.rotation.y=o(1.1,l.ph*1.3)*l.amp*0.6;}
  const bk=blink(t,BLINKS[clip]); eyes.forEach(e=>e.scale.y=bk);
}
const B=[[rig,'Hips'],[spine,'Spine'],[head,'Head'],[stem,'Stem']];
crown.forEach(c=>B.push([c.flap,'Leaflet_'+c.k]));
eyes.forEach(e=>B.push([e,'Eye_'+(e.position.x>0?'L':'R')]));
arms.forEach(({sh,mit,socket,s})=>{const k=s>0?'L':'R';B.push([sh,'Arm_'+k],[mit,'Hand_'+k],[socket,'Hand_Socket_'+k]);});
legs.forEach(({hip,ft,s})=>{const k=s>0?'L':'R';B.push([hip,'Leg_'+k],[ft,'Foot_'+k]);});
leaves.forEach((l,i)=>B.push([l.sway,'Leaf_'+String(i).padStart(2,'0')]));
const HOP=bakeHop('water',{host:char,anchors:crown.map(c=>c.flap),feet:legs.map(l=>l.hip)}); HOP.bones.forEach(b=>B.push(b));
const built=await buildCharacter({name:'Spire',source:char,bones:B,feet:legs.map(l=>l.hip),rest:()=>{pose('Idle',0);HOP.hide();},clips:[{name:'Idle',duration:IDLE_T,skip:HOP_FX,pose:t=>{pose('Idle',t);HOP.hide();}},{name:'Walk',duration:WALK_T,skip:HOP_FX,pose:t=>{pose('Walk',t);HOP.hide();}},{name:'Hop',duration:HOP.duration,only:HOP_FX,pose:t=>{pose('Idle',0);HOP.pose(t);}}]});
built.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
return {buffer:built.buffer,scene:built.scene,clips:built.clips,WALK_SPEED};
}
