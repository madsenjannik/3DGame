import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildCharacter, loopOsc, blink, smoothstep } from '../character-rig.js';
import { bakeHop, HOP_FX } from '../hop-bake.js';
export async function create(){
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const rand=mulberry32(7321);
const R=(a,b)=>a+(b-a)*rand();
const clamp01=x=>Math.min(1,Math.max(0,x));
const C=h=>new THREE.Color(h);
const V=(x,y,z)=>new THREE.Vector3(x,y,z);

// ---------- materials
const skin=(name,col,o={})=>new THREE.MeshPhysicalMaterial({name,color:col,vertexColors:!!o.vc,roughness:o.rough??0.78,metalness:0,sheen:o.sheen??0.55,sheenRoughness:0.75,sheenColor:C(o.sc??0xe6eed6)});
const M={
  leaf:skin('leaf',0xffffff,{vc:true,rough:0.5,sheen:0,sc:0xd8e8b0}),
  head:skin('head',0xffffff,{vc:true,sheen:0.3,sc:0xf6e2c6}),
  body:skin('body',0xffffff,{vc:true,sheen:0.08,sc:0xdfe8bc}),
  eye:new THREE.MeshPhysicalMaterial({name:'eye',color:0x0f0e0d,roughness:0.12,clearcoat:1,clearcoatRoughness:0.05}),
  glint:new THREE.MeshBasicMaterial({name:'glint',color:0xffffff}),
  mouth:new THREE.MeshStandardMaterial({name:'mouth',color:0x3a2622,roughness:0.6}),
};

// ---------- geometry helpers
function paint(g,fn){const p=g.attributes.position,a=new Float32Array(p.count*3),c=new THREE.Color();for(let i=0;i<p.count;i++){fn(p.getX(i),p.getY(i),p.getZ(i),c);a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;}
const solid=(g,col)=>paint(g,(x,y,z,c)=>c.set(col));
function smoothSphere(w,h){let g=new THREE.SphereGeometry(1,w,h);g.deleteAttribute('normal');g.deleteAttribute('uv');return mergeVertices(g);}
const flat=g=>{if(g.attributes.uv)g.deleteAttribute('uv');return g.index?g.toNonIndexed():g;};
const mesh=(g,m,name)=>{const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=true;o.receiveShadow=true;return o;};
const alignZ=(obj,dir,up)=>{const z=dir.clone().normalize(),y=up.clone().sub(z.clone().multiplyScalar(up.dot(z))).normalize(),x=new THREE.Vector3().crossVectors(y,z);obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));};

// ---------- aloe leaf (one mesh, used 8x): base at origin, length +z (1), width x, outer face +y
// soft drop profile, round cross-section, slight outward curve, pale spots, edge teeth, yellow tip
const HW=0.36,HT=0.29;
const lw=u=>u<0.36?Math.pow(Math.sin(Math.PI/2*u/0.36),0.42):(t=>(1-t)*(1+1.15*t))((u-0.36)/0.64);
const bend=u=>0.045*u*u;
const LS=(u,a)=>{const w=lw(u),s=Math.sin(a);return V(-Math.cos(a)*HW*w,(s<0?0.86:1)*s*HT*w+bend(u),u);};
function frame(u,a){const e=1e-3,p=LS(u,a),du=LS(Math.min(1,u+e),a).sub(LS(Math.max(0,u-e),a)),da=LS(u,a+e).sub(LS(u,a-e));
  const n=new THREE.Vector3().crossVectors(du,da).normalize();if(n.dot(V(p.x,p.y-bend(u),0))<0)n.negate();return {p,n,t:du.normalize()};}
function placeZY(g,p,z,y){const Z=z.clone().normalize(),X=new THREE.Vector3().crossVectors(y,Z).normalize(),Y=new THREE.Vector3().crossVectors(Z,X);g.applyMatrix4(new THREE.Matrix4().makeBasis(X,Y,Z).setPosition(p));return g;}
function leafGeo(){
  const parts=[];
  const g=smoothSphere(16,12),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const u=(p.getY(i)+1)/2,a=Math.atan2(p.getZ(i),p.getX(i));p.setXYZ(i,...LS(u,a).toArray());}
  g.computeVertexNormals();
  const cb=C(0x3f7d26),cm=C(0x5e9c36),cl=C(0x74b044),cin=C(0x8cbc52),tip=C(0xd8bf4c);
  paint(g,(x,y,z,c)=>{c.copy(cb).lerp(cm,smoothstep(0,0.4,z)).lerp(cl,smoothstep(0.42,0.82,z));if(y-bend(z)<0)c.lerp(cin,0.15);c.lerp(tip,smoothstep(0.86,0.99,z));});
  parts.push(flat(g));
  const pts=[];
  for(let k=0;k<400&&pts.length<12;k++){
    const u=R(0.2,0.84),a=R(0,Math.PI*2),q=LS(u,a);
    if(pts.some(o=>o.distanceTo(q)<0.12))continue; pts.push(q);
    const {p:pp,n,t}=frame(u,a),s=0.75+0.25*lw(u);
    const sg=new THREE.SphereGeometry(1,5,3); sg.scale(0.024*s,0.04*s,0.004);
    parts.push(solid(flat(placeZY(sg,pp.addScaledVector(n,0.0012),n,t)),0xeee0a0));
  }
  return mergeGeometries(parts,false);
}
const LEAF=leafGeo();

// ---------- head
const HR=V(0.54,0.355,0.44);
function onHead(dir,sink=1){const d=dir.clone().normalize();const t=1/Math.sqrt((d.x/HR.x)**2+(d.y/HR.y)**2+(d.z/HR.z)**2);
  return {p:d.multiplyScalar(t*sink),n:V(dir.x/HR.x**2,dir.y/HR.y**2,dir.z/HR.z**2).normalize()};}
function headGeo(){
  const g=smoothSphere(36,24); g.scale(HR.x,HR.y,HR.z); g.computeVertexNormals();
  const cf=C(0xf0d9b0),cb=C(0xe2c596),bl=C(0xee9f90),bk=C(0x4f8e2c),v=new THREE.Vector3();
  const cheeks=[-1,1].map(s=>{const q=onHead(V(0.5*s,-0.32,0.8)).p;return V(q.x/HR.x,q.y/HR.y,q.z/HR.z).normalize();});
  return paint(g,(x,y,z,c)=>{v.set(x/HR.x,y/HR.y,z/HR.z).normalize();c.copy(cf).lerp(cb,smoothstep(-0.2,-0.95,v.y)*0.6);
    for(const k of cheeks)c.lerp(bl,0.72*smoothstep(0.955,0.992,v.dot(k)));});
}

// ---------- character
const char=new THREE.Group(); char.name='AloeVera';
const rig=new THREE.Group(); rig.name='rig'; char.add(rig);
const SPINE_Y=0.5; const spine=new THREE.Group(); spine.name='spine'; spine.position.y=SPINE_Y; rig.add(spine);
const head=new THREE.Group(); head.name='head'; head.position.set(0,1.0-SPINE_Y,0); spine.add(head);
head.add(mesh(headGeo(),M.head,'head_mesh'));

// body: small egg, colour only
{ const g=smoothSphere(28,20),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i),k=0.97+0.2*(-y)+0.06*(1-y*y);p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}
  g.computeVertexNormals();
  const ct=C(0x6aaa38),cb=C(0x52902a),cf=C(0x7eb848);
  paint(g,(x,y,z,c)=>{c.copy(cb).lerp(ct,smoothstep(-0.9,0.6,y)).lerp(cf,0.35*clamp01(z));});
  const body=mesh(g,M.body,'body'); body.scale.set(0.3,0.33,0.27); body.position.set(0,0.42,0); rig.add(body);
  body.userData.skin=p=>{const w=0.25*smoothstep(0.4,1,p.y),ws=(1-w)*smoothstep(-0.5,0.3,p.y);return [[head,w],[spine,ws],[rig,1-w-ws]];};
}
const legs=[];
for(const s of [-1,1]){
  const hip=new THREE.Group(); hip.name='leg'; hip.position.set(0.12*s,0.2,0.01);
  const ft=new THREE.Group(); ft.name='foot'; ft.position.y=-0.2; hip.add(ft);
  const lg=new THREE.CapsuleGeometry(0.095,0.06,6,14);
  paint(lg,(x,y,z,c)=>c.set(0x66a238).lerp(C(0xb8b86a),0.75*smoothstep(-0.05,-0.125,y)));
  const l=mesh(lg,M.body,'leg'); l.position.y=-0.09; l.scale.set(1,1,1.18);
  l.userData.skin=p=>{const wh=0.7*smoothstep(0.0,0.12,p.y),wf=smoothstep(-0.03,-0.11,p.y);return [[rig,wh],[ft,wf],[hip,Math.max(0,1-wh-wf)]];};
  hip.add(l); rig.add(hip); legs.push({hip,ft,s});
}
const arms=[];
for(const s of [-1,1]){
  const sh=new THREE.Group(); sh.name=s<0?'arm_L':'arm_R'; sh.position.set(0.25*s,0.6-SPINE_Y,0.02);
  const inner=new THREE.Group(); inner.rotation.set(-0.1,0,s*0.3); sh.add(inner);
  // soft sausage arm + round hand with a thumb
  const ag=new THREE.CapsuleGeometry(0.078,0.13,8,14);
  {const q=ag.attributes.position;for(let i=0;i<q.count;i++){const y=q.getY(i),k=1+0.08*smoothstep(0.1,-0.1,y);q.setX(i,q.getX(i)*k);q.setZ(i,q.getZ(i)*k);}ag.computeVertexNormals();}
  paint(ag,(x,y,z,c)=>c.set(0x70ac40).lerp(C(0xdcd3a0),0.6*smoothstep(-0.04,-0.12,y)));
  const mit=new THREE.Group(); mit.name='mitten'; mit.position.y=-0.25; inner.add(mit);
  const socket=new THREE.Group(); socket.name='hand_socket'; socket.position.set(0,-0.04,0.03); mit.add(socket);
  const a=mesh(ag,M.body,'arm'); a.position.y=-0.11; a.userData.skin=p=>{const w=smoothstep(-0.06,-0.19,p.y);return [[mit,w],[sh,1-w]];}; inner.add(a);
  const hg=smoothSphere(16,12); hg.computeVertexNormals(); solid(hg,0xeedbb4);
  const hand=mesh(hg,M.body,'hand'); hand.scale.set(0.09,0.1,0.094); hand.position.y=-0.012; mit.add(hand);
  const tg=smoothSphere(10,8); tg.computeVertexNormals(); solid(tg,0xeedbb4);
  const th=mesh(tg,M.body,'thumb'); th.scale.set(0.036,0.052,0.036); th.position.set(-s*0.05,0.012,0.058); th.rotation.set(0.6,0,-s*0.35); mit.add(th);
  spine.add(sh); arms.push({sh,mit,socket,s});
}

// face
{ const {p,n}=onHead(V(0,-0.2,1),0.985); const ng=smoothSphere(12,8); ng.computeVertexNormals(); solid(ng,0xe6cca2);
  const nose=mesh(ng,M.head,'nose'); nose.scale.set(0.032,0.026,0.024); nose.position.copy(p); alignZ(nose,n,V(0,1,0)); head.add(nose); }
const eyes=[];
for(const s of [-1,1]){
  const {p,n}=onHead(V(0.37*s,-0.08,1),0.97);
  const e=new THREE.Group(); e.name=s<0?'eye_L':'eye_R'; e.position.copy(p); alignZ(e,n,V(0,1,0));
  const ball=mesh(new THREE.SphereGeometry(0.084,20,12),M.eye,'eyeball'); ball.scale.z=0.55; e.add(ball);
  const g1=new THREE.Mesh(new THREE.SphereGeometry(0.026,10,6),M.glint); g1.name='glint'; g1.position.set(0.028,0.032,0.043); g1.scale.z=0.4; e.add(g1);
  const g2=new THREE.Mesh(new THREE.SphereGeometry(0.012,8,6),M.glint); g2.name='glint'; g2.position.set(-0.03,-0.028,0.045); g2.scale.z=0.4; e.add(g2);
  head.add(e); eyes.push(e);
}
{
  const {p,n}=onHead(V(0,-0.3,1),0.995);
  const m=new THREE.Group(); m.name='mouth'; m.position.copy(p); alignZ(m,n,V(0,1,0));
  const arc=Math.PI*0.7, tg=new THREE.TorusGeometry(0.036,0.009,8,16,arc); tg.rotateZ(-Math.PI/2-arc/2);
  const t=mesh(tg,M.mouth,'smile'); t.scale.z=0.5; t.position.y=0.022; m.add(t); head.add(m);
}

// 8 identical leaves inserted straight into the head (no connector). [id, azimuth°(0=front, +=left/+X), tilt° from vertical, scale]
const LEN=0.66;
const PLAN=[];
const ring=(n,off,tl,sc,root,skip=0,max=181)=>{for(let k=0;k<n;k++){const az=((off+k*360/n)%360+540)%360-180;if(Math.abs(az)<skip||Math.abs(az)>max)continue;
  PLAN.push(['L'+String(PLAN.length+1).padStart(2,'0'),az+R(-5,5),tl+R(-3,3),sc*R(0.95,1.05),root,0.66]);}};
ring(1,0,4,1.22,4);          // centre, tallest
ring(3,60,17,1.1,15);       // inner crown
ring(6,0,36,1.04,32);       // medium diagonals
ring(8,22.5,60,1.0,60,40,130); // broad lower leaves (face kept clear)
ring(4,135,34,1.0,80);      // low back fill
const leaves=[];
for(const [id,az,tl,sc,root,sink] of PLAN){
  const f=az*Math.PI/180,t=tl*Math.PI/180,rad=V(Math.sin(f),0,Math.cos(f));
  const dir=V(Math.sin(t)*rad.x,Math.cos(t),Math.sin(t)*rad.z);
  const th=root*Math.PI/180, {p}=onHead(V(Math.sin(th)*rad.x,Math.cos(th),Math.sin(th)*rad.z),sink??0.82);
  const pivot=new THREE.Group(); pivot.name='leaf_'+id; pivot.position.copy(p); alignZ(pivot,dir,rad.clone().add(V(0,0.001,0)));
  const sway=new THREE.Group(); sway.name='sway_'+id; pivot.add(sway);
  const L=sc*LEN, tip=new THREE.Group(); tip.name='tip_'+id; tip.position.z=0.5*L; sway.add(tip);
  const lf=mesh(LEAF,M.leaf,'leaf_'+id); lf.scale.setScalar(L); lf.rotation.z=R(-0.06,0.06); sway.add(lf);
  lf.userData.skin=q=>{const wm=smoothstep(0.08,0.45,q.z),wt=smoothstep(0.4,0.88,q.z);return [[head,1-wm],[sway,wm*(1-wt)],[tip,wm*wt]];};
  head.add(pivot); leaves.push({id,sway,tip,ph:R(0,6.28),flex:0.6+tl/70,side:Math.sign(Math.sin(f))||0});
}
char.updateMatrixWorld(true);

// ---------- clips
const WALK_SPEED=1.35, IDLE_T=6.6, WALK_T=4*2*Math.PI/(4+WALK_SPEED*6.2);
const BLINKS={Idle:[1.9,4.8],Walk:[1.1]};
function pose(clip,t){
  const W=clip==='Walk',T=W?WALK_T:IDLE_T,osc=loopOsc(T),o=(f,p)=>osc(t,f,p),u=t/T*Math.PI*2,walk=W?1:0,ph=W?4*u:0;
  const breathe=W?0:o(2.1)*0.016;
  rig.position.y=Math.abs(Math.sin(ph))*0.05*walk; rig.rotation.set(0.05*walk,0,Math.sin(ph)*0.1*walk); rig.scale.set(1,1+breathe,1);
  legs.forEach(({hip},i)=>{hip.rotation.x=(i?-1:1)*Math.sin(ph)*0.6*walk;hip.position.y=0.2+Math.max(0,Math.sin(ph+(i?Math.PI:0)))*0.05*walk;});
  arms.forEach(({sh,s},i)=>{sh.rotation.x=(i?1:-1)*Math.sin(ph)*0.4*walk;sh.rotation.z=s*(0.04+o(2.1)*0.03);});
  head.rotation.z=W?-Math.sin(ph)*0.06:o(0.9)*0.03; head.rotation.x=o(2.1,0.6)*0.014; head.position.y=1.0-SPINE_Y+breathe*1.4;
  for(const l of leaves){
    const bx=walk*Math.sin(2*ph-1.1)*0.07*l.flex, bt=walk*Math.sin(2*ph-2.0)*0.12*l.flex, sy=walk*Math.sin(ph-0.9)*0.05;
    l.sway.rotation.set(o(1.3,l.ph)*0.025+bx, sy+o(0.9,l.ph)*0.015, 0);
    l.tip.rotation.set(o(1.3,l.ph-0.9)*0.045+bt, sy*1.5+o(0.9,l.ph-0.8)*0.025, 0);
  }
  const bk=blink(t,BLINKS[clip]); eyes.forEach(e=>e.scale.y=bk);
}
const B=[[rig,'Hips'],[spine,'Spine'],[head,'Head']];
eyes.forEach(e=>B.push([e,'Eye_'+(e.position.x>0?'L':'R')]));
arms.forEach(({sh,mit,socket,s})=>{const k=s>0?'L':'R';B.push([sh,'Arm_'+k],[mit,'Hand_'+k],[socket,'Hand_Socket_'+k]);});
legs.forEach(({hip,ft,s})=>{const k=s>0?'L':'R';B.push([hip,'Leg_'+k],[ft,'Foot_'+k]);});
leaves.forEach(l=>B.push([l.sway,'Leaf_'+l.id],[l.tip,'Leaf_'+l.id+'_Tip']));
const HOP=bakeHop('gel',{host:char,anchors:leaves.map(l=>l.tip),feet:legs.map(l=>l.hip)}); HOP.bones.forEach(b=>B.push(b));
const built=await buildCharacter({name:'AloeVera',source:char,bones:B,feet:legs.map(l=>l.hip),rest:()=>{pose('Idle',0);HOP.hide();},clips:[{name:'Idle',duration:IDLE_T,skip:HOP_FX,pose:t=>{pose('Idle',t);HOP.hide();}},{name:'Walk',duration:WALK_T,skip:HOP_FX,pose:t=>{pose('Walk',t);HOP.hide();}},{name:'Hop',duration:HOP.duration,only:HOP_FX,pose:t=>{pose('Idle',0);HOP.pose(t);}}]});
built.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
return {scene:built.scene,clips:built.clips,WALK_SPEED,buffer:built.buffer,report:built.report};
}
