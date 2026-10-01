// Swamp character: builds the rigged, animated model (Idle + Walk clips). Shared by Swamp Character.html-style viewers and the garden.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildCharacter, loopOsc, blink, smoothstep } from './character-rig.js';
export async function createSwamp(){
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const rand=mulberry32(4417);
const R=(a,b)=>a+(b-a)*rand();
const clamp01=x=>Math.min(1,Math.max(0,x));
const C=h=>new THREE.Color(h);
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
// ---------- materials
const skin=(name,col,o={})=>new THREE.MeshPhysicalMaterial({name,color:col,vertexColors:!!o.vc,roughness:o.rough??0.8,metalness:0,sheen:o.sheen??0.55,sheenRoughness:0.75,sheenColor:C(o.sc??0xfff3e0)});
const M={
  leaf:skin('leaf',0xffffff,{vc:true,sheen:0.15,sc:0xb8cc98}),
  cap:skin('cap',0xffffff,{vc:true,rough:0.72,sheen:0.18,sc:0xffd0b8}),
  spot:skin('spot',0xfaeccc,{rough:0.85,sheen:0.2}),
  head:skin('head',0xffffff,{vc:true,sheen:0.22}),
  body:skin('body',0xe0b67a,{sheen:0.22}),
  limb:skin('limb',0xa9763e,{sheen:0.22}),
  hand:skin('hand',0x986834,{sheen:0.22}),
  cheek:new THREE.MeshStandardMaterial({name:'cheek',color:0xee8570,roughness:0.95,transparent:true,opacity:0.5,depthWrite:false}),
  eye:new THREE.MeshPhysicalMaterial({name:'eye',color:0x0f110e,roughness:0.12,clearcoat:1,clearcoatRoughness:0.05}),
  glint:new THREE.MeshBasicMaterial({name:'glint',color:0xffffff}),
  mouth:new THREE.MeshStandardMaterial({name:'mouth',color:0x3a2c24,roughness:0.6}),
};

// ---------- geometry
function paint(g,fn){const p=g.attributes.position,a=new Float32Array(p.count*3),c=new THREE.Color();for(let i=0;i<p.count;i++){fn(p.getX(i),p.getY(i),p.getZ(i),c,i);a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;}
function smoothSphere(w,h){let g=new THREE.SphereGeometry(1,w,h);g.deleteAttribute('normal');g.deleteAttribute('uv');return mergeVertices(g);}
function leafGeo(cb,cm,ct){
  const g=smoothSphere(12,10),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),u=(y+1)/2,ang=Math.atan2(z,x);
    const pr=Math.pow(Math.max(0,Math.sin(Math.PI*Math.pow(u,1.1))),0.72);
    const X=-Math.cos(ang)*0.4*pr;
    let Y=Math.sin(ang)*0.15*pr*(1-0.3*u); if(Y>0) Y*=0.7;
    const e=X/0.4; Y+=e*e*0.05*pr+0.04*u*u-0.06*Math.abs(e)*0;
    p.setXYZ(i,X,Y,u);
  }
  g.computeVertexNormals();
  cb=C(cb);cm=C(cm);ct=C(ct);
  return paint(g,(x,y,z,c)=>{c.copy(cb).lerp(cm,clamp01(z/0.5));if(z>0.5)c.lerp(ct,clamp01((z-0.5)/0.5));if(y<0.02)c.multiplyScalar(0.86);else c.multiplyScalar(1-0.22*Math.exp(-Math.abs(x)/0.018)*clamp01(z*4)*(1-z*0.6));});
}
const LEAF=leafGeo(0x1c5414,0x3a8a20,0x5eaa2e);
const LEAF_SKIN=(sway,pivot)=>p=>{const w=smoothstep(0.05,0.8,p.z);return [[sway,w],[pivot.parent,1-w]];};

const HR=V(0.42,0.39,0.38); // face/head ellipsoid radii
const FACE=V(0,-0.1,1).normalize();
function onHead(dir,sink=1){const d=dir.clone().normalize();const t=1/Math.sqrt((d.x/HR.x)**2+(d.y/HR.y)**2+(d.z/HR.z)**2);
  return {p:d.multiplyScalar(t*sink),n:V(dir.x/HR.x**2,dir.y/HR.y**2,dir.z/HR.z**2).normalize()};}
function headGeo(){
  const g=smoothSphere(36,24); g.scale(HR.x,HR.y,HR.z); g.computeVertexNormals();
  const cf=C(0xfae6be),cs=C(0xe6c48c),v=new THREE.Vector3();
  return paint(g,(x,y,z,c)=>{v.set(x/HR.x,y/HR.y,z/HR.z).normalize();c.copy(cs).lerp(cf,Math.pow(clamp01((v.dot(FACE)-0.2)/0.6),1.2));});
}
// cap: ellipsoid dome with rolled rim and gilled underside
const CR=0.8, CH=0.62;
function capGeo(){
  const pts=[],DOME=16;
  for(let i=0;i<=DOME;i++){const a=i/DOME*Math.PI/2;pts.push(new THREE.Vector2(Math.max(1e-3,CR*Math.sin(a)),CH*Math.cos(a)));}
  pts.push(new THREE.Vector2(CR*0.995,-0.045),new THREE.Vector2(CR*0.965,-0.085),new THREE.Vector2(CR*0.92,-0.1));
  const G0=pts.length;
  for(let i=1;i<=6;i++){const u=i/6;pts.push(new THREE.Vector2(CR*0.92*(1-u)+0.2*u,-0.1+0.1*Math.pow(u,0.8)));}
  pts.reverse();
  let g=new THREE.LatheGeometry(pts,108); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g=mergeVertices(g);
  const p=g.attributes.position,gill=new Float32Array(p.count);
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,z);
    if(y<-0.02&&r<CR*0.93){const th=Math.atan2(x,z),k=Math.pow(Math.abs(Math.sin(th*18)),0.6);const fade=clamp01((r-0.22)/0.1)*clamp01((CR*0.93-r)/0.05);gill[i]=k*fade;p.setY(i,y+0.03*k*fade);}}
  g.computeVertexNormals();
  const top=C(0xec5a30),rim=C(0xb22c1a),und=C(0xf4dcaa),dk=C(0xc49a60);
  return paint(g,(x,y,z,c,i)=>{const r=Math.hypot(x,z);if(y>-0.01){c.copy(rim).lerp(top,Math.pow(clamp01(y/CH),0.6));}else if(r>CR*0.94){c.copy(rim).lerp(und,0.35);}else{c.copy(dk).lerp(und,gill[i]);c.lerp(dk,1-clamp01((r-0.2)/0.25));}});
}
const mesh=(g,m,name)=>{const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=true;o.receiveShadow=true;return o;};
const alignZ=(obj,dir,up)=>{const z=dir.clone().normalize(),y=up.clone().sub(z.clone().multiplyScalar(up.dot(z))).normalize(),x=new THREE.Vector3().crossVectors(y,z);obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));};

// ---------- character
const char=new THREE.Group(); char.name='Swamp';
const rig=new THREE.Group(); rig.name='rig'; char.add(rig);

const body=mesh(smoothSphere(28,20),M.body,'body'); body.geometry.computeVertexNormals();
body.scale.set(0.4,0.4,0.36); body.position.set(0,0.5,0); rig.add(body);
body.userData.skin=p=>{const w=0.25*smoothstep(0.4,1,p.y),ws=(1-w)*smoothstep(-0.5,0.3,p.y);return [[head,w],[spine,ws],[rig,1-w-ws]];};

const legs=[];
for(const s of [-1,1]){
  const hip=new THREE.Group(); hip.name='leg'; hip.position.set(0.18*s,0.3,0.02);
  const ft=new THREE.Group(); ft.name='foot'; ft.position.y=-0.3; hip.add(ft);
  const l=mesh(new THREE.CapsuleGeometry(0.13,0.1,6,14),M.limb,'leg'); l.position.y=-0.16; l.scale.set(1,1,1.1); l.userData.skin=p=>{const wh=0.7*smoothstep(0.02,0.17,p.y),wf=smoothstep(-0.04,-0.16,p.y);return [[rig,wh],[ft,wf],[hip,Math.max(0,1-wh-wf)]];};
  hip.add(l); rig.add(hip); legs.push({hip,ft,s});
}
const arms=[];
for(const s of [-1,1]){
  const sh=new THREE.Group(); sh.name=s<0?'arm_L':'arm_R'; sh.position.set(0.32*s,0.62,0.05);
  const inner=new THREE.Group(); inner.rotation.set(-0.95,0,s*0.28); sh.add(inner);
  const a=mesh(new THREE.CapsuleGeometry(0.085,0.12,6,12),M.limb,'arm'); a.position.y=-0.11; a.userData.skin=p=>{const w=smoothstep(-0.02,-0.14,p.y);return [[mit,w],[sh,1-w]];}; inner.add(a);
  const mit=new THREE.Group(); mit.name='mitten'; mit.position.y=-0.215; inner.add(mit);
  const socket=new THREE.Group(); socket.name='hand_socket'; socket.position.set(0,-0.06,0.03); mit.add(socket);
  const palm=mesh(smoothSphere(18,12),M.hand,'mitten_palm'); palm.geometry.computeVertexNormals(); palm.scale.set(0.082,0.1,0.092); mit.add(palm);
  const th=mesh(smoothSphere(12,8),M.hand,'mitten_thumb'); th.geometry.computeVertexNormals(); th.scale.set(0.038,0.052,0.038); th.position.set(-s*0.02,0.02,0.07); th.rotation.x=0.7; mit.add(th);
  rig.add(sh); arms.push({sh,mit,socket,s});
}
const tail=mesh(smoothSphere(16,12),M.body,'tail'); tail.geometry.computeVertexNormals(); tail.scale.set(0.11,0.14,0.1); tail.position.set(0,0.36,-0.33); rig.add(tail);

const head=new THREE.Group(); head.name='head'; head.position.set(0,1.02,0); rig.add(head);
head.add(mesh(headGeo(),M.head,'head_mesh'));

// face
const face=new THREE.Group(); face.name='face'; head.add(face);
const eyes=[];
for(const s of [-1,1]){
  const {p,n}=onHead(V(0.42*s,-0.02,1),0.97);
  const e=new THREE.Group(); e.name=s<0?'eye_L':'eye_R'; e.position.copy(p); alignZ(e,n,V(0,1,0));
  const ball=mesh(new THREE.SphereGeometry(0.095,24,16),M.eye,'eyeball'); ball.scale.z=0.5; e.add(ball);
  const g1=new THREE.Mesh(new THREE.SphereGeometry(0.027,10,6),M.glint); g1.name='glint'; g1.position.set(0.031,0.035,0.043); g1.scale.z=0.4; e.add(g1);
  const g2=new THREE.Mesh(new THREE.SphereGeometry(0.012,8,6),M.glint); g2.name='glint'; g2.position.set(-0.034,-0.031,0.045); g2.scale.z=0.4; e.add(g2);
  face.add(e); eyes.push(e);
}
for(const s of [-1,1]){
  const {p,n}=onHead(V(0.98*s,-0.52,1),0.975);
  const ck=new THREE.Mesh(new THREE.SphereGeometry(0.06,14,8),M.cheek); ck.name='cheek'; ck.position.copy(p); alignZ(ck,n,V(0,1,0)); ck.scale.set(1.05,0.68,0.16); face.add(ck);
}
{
  const {p,n}=onHead(V(0,-0.3,1),0.995);
  const m=new THREE.Group(); m.name='mouth'; m.position.copy(p); alignZ(m,n,V(0,1,0));
  const arc=Math.PI*0.72, tg=new THREE.TorusGeometry(0.045,0.01,8,16,arc); tg.rotateZ(-Math.PI/2-arc/2);
  const t=mesh(tg,M.mouth,'smile'); t.scale.z=0.5; t.position.y=0.028; m.add(t); face.add(m);
}

// cap (pivot at its base so it can rock)
const cap=new THREE.Group(); cap.name='cap'; cap.position.set(0,0.23,-0.08); cap.rotation.x=-0.24; head.add(cap);
const capTilt=new THREE.Group(); cap.add(capTilt);
capTilt.add(mesh(capGeo(),M.cap,'cap_mesh'));
{
  const N=24, ga=Math.PI*(3-Math.sqrt(5));
  for(let i=0;i<N;i++){
    const yv=1-(i+0.5)/N*0.82, a=Math.acos(yv), phi=i*ga+R(-0.2,0.2);
    const x=CR*Math.sin(a)*Math.cos(phi), z=CR*Math.sin(a)*Math.sin(phi), y=CH*Math.cos(a);
    const n=V(x/CR**2,y/CH**2,z/CR**2).normalize();
    const s=R(0.055,0.095)*(1-0.25*yv);
    const sp=mesh(smoothSphere(10,6),M.spot,'spot'); sp.geometry.computeVertexNormals();
    sp.position.set(x,y,z).addScaledVector(n,-0.006); alignZ(sp,n,V(0,1,0)); sp.scale.set(s*R(0.9,1.15),s,0.018);
    capTilt.add(sp);
  }
}

// leaf collar at the neck
const leaves=[];
{
  const N=13;
  for(let k=0;k<N;k++){
    const phi=k/N*Math.PI*2+R(-0.08,0.08), rr=V(Math.sin(phi),0,Math.cos(phi));
    const pivot=new THREE.Group(); pivot.name='leaf_'+k; pivot.position.set(rr.x*0.25,0.79+R(-0.012,0.012),rr.z*0.24);
    alignZ(pivot,rr.clone().add(V(0,-0.85,0)),V(0,1,0));
    const sway=new THREE.Group(); pivot.add(sway);
    const L=R(0.27,0.31), lf=mesh(LEAF,M.leaf,'leaf'); lf.scale.set(L*1.1,L,L); lf.rotation.z=R(-0.1,0.1); sway.add(lf); lf.userData.skin=LEAF_SKIN(sway,pivot);
    rig.add(pivot); leaves.push({sway,ph:R(0,6.28),amp:0.03,flex:1.2});
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
  rig.position.y=Math.abs(Math.sin(ph))*0.045*walk; rig.rotation.set(0.06*walk,0,Math.sin(ph)*0.1*walk); rig.scale.set(1,1+breathe,1);
  legs.forEach(({hip},i)=>{hip.rotation.x=(i?-1:1)*Math.sin(ph)*0.55*walk;hip.position.y=0.3+Math.max(0,Math.sin(ph+(i?Math.PI:0)))*0.05*walk;});
  arms.forEach(({sh,s},i)=>{sh.rotation.x=(i?1:-1)*Math.sin(ph)*0.35*walk;sh.rotation.z=s*(0.05+o(2.1)*0.03);});
  head.rotation.z=W?-Math.sin(ph)*0.05:o(0.9)*0.03; head.rotation.x=o(2.1,0.6)*0.012; head.position.y=1.06+breathe*1.4-SPINE_Y;
  for(const l of leaves){l.sway.rotation.x=o(1.6,l.ph)*l.amp+jig*0.05*l.flex+(W?Math.sin(u+l.ph*2)*0.01:0);l.sway.rotation.y=o(1.1,l.ph*1.3)*l.amp*0.6;}
  capTilt.rotation.x=o(1.3)*0.012+walk*0.01*Math.sin(2*ph-1.5); capTilt.rotation.z=o(0.9,1)*0.012+walk*0.03*Math.sin(ph-0.3); capTilt.scale.set(1+jig*0.02,1-jig*0.035,1+jig*0.02);
  const bk=blink(t,BLINKS[clip]); eyes.forEach(e=>e.scale.y=bk);
}
const B=[[rig,'Hips'],[spine,'Spine'],[head,'Head'],[capTilt,'Cap']];
eyes.forEach(e=>B.push([e,'Eye_'+(e.position.x>0?'L':'R')]));
arms.forEach(({sh,mit,socket,s})=>{const k=s>0?'L':'R';B.push([sh,'Arm_'+k],[mit,'Hand_'+k],[socket,'Hand_Socket_'+k]);});
legs.forEach(({hip,ft,s})=>{const k=s>0?'L':'R';B.push([hip,'Leg_'+k],[ft,'Foot_'+k]);});
leaves.forEach((l,i)=>B.push([l.sway,'Leaf_'+String(i).padStart(2,'0')]));
const built=await buildCharacter({name:'Swamp',source:char,bones:B,feet:legs.map(l=>l.hip),rest:()=>pose('Idle',0),clips:[{name:'Idle',duration:IDLE_T,pose:t=>pose('Idle',t)},{name:'Walk',duration:WALK_T,pose:t=>pose('Walk',t)}]});
built.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
return {scene:built.scene,clips:built.clips,WALK_SPEED,height:1.9};
}
