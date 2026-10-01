// Tack & wardrobe — unlockable horse tack (saddle, bridle, mane) and rider wear. Sold by Tidsel-Thora at the stable hatch.
// Unlock rules are TBD: `free:true` items are open from the start, everything else stays locked until SV.unl[id] is set.
import * as THREE from 'three';
const PI=Math.PI;
export const TACK_CATS=[['saddle','Saddle'],['bridle','Bridle'],['mane','Mane & tail'],['rider','Rider']];
export const TACK=[
 {id:'saddle_classic',cat:'saddle',n:'Classic leather saddle',sh:'Classic',s:'Brown leather, steel stirrups. Thora oils it every Sunday.',col:0x6a4228,free:true},
 {id:'saddle_felt',cat:'saddle',n:'Nordic felt saddle',sh:'Nordic felt',s:'Moss-green felt seat with sheepskin rolls front and back.',col:0x5e6b4a},
 {id:'bridle_leather',cat:'bridle',n:'Leather bridle',sh:'Leather',s:'Plain noseband and a steel ring. Does the job.',col:0x6a4228,free:true},
 {id:'bridle_rope',cat:'bridle',n:'Rope halter',sh:'Rope',s:'Hand-knotted rust rope halter with a lead.',col:0xb8612e},
 {id:'mane_natural',cat:'mane',n:'Natural mane',sh:'Natural',s:'As the horse grew it. Brushed, not fussed.',col:0xe8dcc0,free:true},
 {id:'mane_braids',cat:'mane',n:'Show braids',sh:'Braids',s:'Seven button braids with red ribbons, and a bound tail.',col:0xa8402c},
 {id:'rider_scarf',cat:'rider',n:'Wool scarf',sh:'Scarf',s:'Barn-red knit. Keeps the wind off on the back straight.',col:0x9a3a2e,free:true},
 {id:'rider_boots',cat:'rider',n:'Riding boots',sh:'Boots',s:'Tall brown boots. Heels down, remember.',col:0x4a3222},
];
export const TACK_DEFAULT={saddle:'saddle_classic',bridle:'bridle_leather',mane:'mane_natural',rider:'rider_scarf'};
export const tackById=Object.fromEntries(TACK.map(t=>[t.id,t]));
export const tackUnlocked=(id,unl={})=>!!(tackById[id]?.free||unl[id]);

const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const put=(g,m,p,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.castShadow=true;p.add(o);return o;};
const sph=(r,sx,sy,sz)=>new THREE.SphereGeometry(r,14,10).scale(sx,sy,sz);
const cyl=(r,h,s=8)=>new THREE.CylinderGeometry(r,r,h,s);
const tube=(a,b,r,s=6)=>{const A=V(...a),d=V(...b).sub(A),L=d.length(),g=new THREE.CylinderGeometry(r,r,L,s);g.translate(0,L/2,0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()));g.translate(A.x,A.y,A.z);return g;};
const mkMat=(list,name,c,o={})=>{let m=list.find(x=>x.name==='Tack_'+name);if(!m){m=new THREE.MeshStandardMaterial({name:'Tack_'+name,color:c,roughness:o.r??0.8,metalness:o.m??0});m.userData.op0=1;m.userData.t0=false;list.push(m);}return m;};
const grp=(p,n)=>{const g=new THREE.Group();g.name='Tack_'+n;g.visible=false;p.add(g);return g;};

// b = buildAnimal() result for a horse; sel = {saddle,bridle,mane}
export function applyHorseTack(b,sel){const r=b.rig;
  if(!b.__tack){const M=b.mats,kids=(n,f)=>n.children.filter(o=>o.isMesh&&f(o)),T={};
    T.saddle0=kids(r.Saddle,o=>!o.material.name.endsWith('_Blanket'));
    T.bridle0=kids(r.Head,o=>o.geometry.type==='TorusGeometry');
    T.mane0=kids(r.Neck,o=>/_(Mane|Points)$/.test(o.material.name));
    const lt=mkMat(M,'Leather',0x5a3822),me=mkMat(M,'Steel',0xb8b4a8,{r:0.35,m:0.7}),red=mkMat(M,'Ribbon',0xa8402c,{r:0.7});
    // Nordic felt saddle
    const fs=T.felt=grp(r.Saddle,'SaddleFelt'),felt=mkMat(M,'Felt',0x5e6b4a,{r:0.95}),wool=mkMat(M,'Sheepskin',0xefe6d2,{r:1});
    put(sph(0.19,1.05,0.26,1.3),felt,fs,0,0.045,0);put(sph(0.17,1.0,0.12,1.2),lt,fs,0,0.02,0);
    put(cyl(0.042,0.22,10),wool,fs,0,0.075,0.2,0,0,PI/2);put(cyl(0.048,0.24,10),wool,fs,0,0.085,-0.19,0,0,PI/2);
    [-1,1].forEach(s=>{put(cyl(0.007,0.34,4),lt,fs,0.3*s,-0.17,0);put(new THREE.TorusGeometry(0.04,0.009,4,8),me,fs,0.3*s,-0.36,0,0,PI/2,0);});
    // Rope halter
    const rh=T.rope=grp(r.Head,'BridleRope'),rope=mkMat(M,'Rope',0xb8612e,{r:0.9});
    put(new THREE.TorusGeometry(0.1,0.014,5,16),rope,rh,0,-0.02,0.25);put(new THREE.TorusGeometry(0.125,0.013,5,16),rope,rh,0,0.02,0.02,0.2,0,0);
    [-1,1].forEach(s=>put(tube([0.095*s,-0.02,0.24],[0.12*s,0.02,0.04],0.011),rope,rh));
    put(sph(0.024,1,1,1),rope,rh,0,-0.12,0.23);put(tube([0,-0.12,0.23],[0,-0.44,0.2],0.01),rope,rh);
    // Show braids + bound tail
    const mane=M.find(m=>m.name.endsWith('_Mane'))||lt,bm=T.braids=grp(r.Neck,'ManeBraids');
    put(new THREE.BoxGeometry(0.04,0.55,0.05),mane,bm,0,0.35,-0.11);
    for(let i=0;i<7;i++){const y=0.1+i*0.08,z=-0.13+i*0.004;put(sph(0.042,1,1.1,0.9),mane,bm,0,y,z);put(new THREE.BoxGeometry(0.09,0.014,0.09),red,bm,0,y,z);}
    const tb=T.tail=grp(r.Tail,'TailBands');put(cyl(0.064,0.035,10),red,tb,0,0.1,0);put(cyl(0.078,0.035,10),red,tb,0,0.2,0);
    b.__tack=T;}
  const T=b.__tack,vis=(a,v)=>a.forEach(o=>o.visible=v);
  const felt=sel.saddle==='saddle_felt',rope=sel.bridle==='bridle_rope',br=sel.mane==='mane_braids';
  vis(T.saddle0,!felt);T.felt.visible=felt;vis(T.bridle0,!rope);T.rope.visible=rope;vis(T.mane0,!br);T.braids.visible=br;T.tail.visible=br;}

// ---- standalone assets for the Mount Assets board (same format as mounts.js: build/idle/act/moves)
const TAU=PI*2,ez=x=>x<0.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
const stirrups=(put,Sd,lt,me)=>[-1,1].forEach(s=>{put(cyl(0.007,0.34,4),lt,Sd,0.3*s,-0.17,0);put(new THREE.TorusGeometry(0.04,0.009,4,8),me,Sd,0.3*s,-0.36,0,0,PI/2,0);});
const BUILD={
 saddle_classic(k){const {node,put,mat,R}=k,wo=mat('Blanket',0x9a3a2e),lt=mat('Leather',0x6a4228),me=mat('Metal',0xb8b4a8,{r:0.35,m:0.7});
  const Sd=node('Saddle',R,0,0.4,0);put(sph(0.31,1.03,0.18,0.62),wo,Sd,0,-0.02,0);put(sph(0.18,1.1,0.32,1.25),lt,Sd,0,0.04,0);put(sph(0.05,1,1,1),lt,Sd,0,0.07,0.2);stirrups(put,Sd,lt,me);},
 saddle_felt(k){const {node,put,mat,R}=k,felt=mat('Felt',0x5e6b4a,{r:0.95}),wool=mat('Sheepskin',0xefe6d2,{r:1}),lt=mat('Leather',0x5a3822),me=mat('Metal',0xb8b4a8,{r:0.35,m:0.7});
  const Sd=node('Saddle',R,0,0.4,0);put(sph(0.19,1.05,0.26,1.3),felt,Sd,0,0.045,0);put(sph(0.17,1.0,0.12,1.2),lt,Sd,0,0.02,0);
  put(cyl(0.042,0.22,10),wool,Sd,0,0.075,0.2,0,0,PI/2);put(cyl(0.048,0.24,10),wool,Sd,0,0.085,-0.19,0,0,PI/2);stirrups(put,Sd,lt,me);},
 bridle_leather(k){const {node,put,mat,R}=k,lt=mat('Leather',0x6a4228),me=mat('Metal',0xb8b4a8,{r:0.35,m:0.7});
  const Bd=node('Bridle',R,0,0.32,0);put(new THREE.TorusGeometry(0.098,0.012,4,16),lt,Bd,0,-0.02,0.13);put(new THREE.TorusGeometry(0.125,0.012,4,16),lt,Bd,0,0.02,-0.1,0.2,0,0);
  put(new THREE.BoxGeometry(0.22,0.025,0.012),lt,Bd,0,0.1,-0.06);[-1,1].forEach(s=>{put(tube([0.095*s,-0.02,0.12],[0.12*s,0.02,-0.09],0.011),lt,Bd);put(new THREE.TorusGeometry(0.03,0.007,4,10),me,Bd,0.1*s,-0.06,0.16,0,PI/2,0);});
  put(cyl(0.006,0.2,4),me,Bd,0,-0.06,0.16,0,0,PI/2);},
 bridle_rope(k){const {node,put,mat,R}=k,rope=mat('Rope',0xb8612e,{r:0.9});
  const Bd=node('Halter',R,0,0.45,0);put(new THREE.TorusGeometry(0.1,0.014,5,16),rope,Bd,0,-0.02,0.13);put(new THREE.TorusGeometry(0.125,0.013,5,16),rope,Bd,0,0.02,-0.1,0.2,0,0);
  [-1,1].forEach(s=>put(tube([0.095*s,-0.02,0.12],[0.12*s,0.02,-0.09],0.011),rope,Bd));put(sph(0.024,1,1,1),rope,Bd,0,-0.12,0.11);
  const L=node('Lead',Bd,0,-0.12,0.11);put(tube([0,0,0],[0,-0.2,0.04],0.01),rope,L);put(tube([0,-0.2,0.04],[0.02,-0.36,0.14],0.01),rope,L);},
 mane_natural(k){const {node,put,mat,R}=k,cr=mat('Mane',0xefe4cc),dk=mat('Stripe',0x3a2e24);
  const Mn=node('Mane',R,-0.12,0.05,0,0.55);put(new THREE.BoxGeometry(0.07,0.6,0.13),cr,Mn,0,0.3,0);put(new THREE.BoxGeometry(0.075,0.6,0.045),dk,Mn,0,0.32,-0.035);
  const T=node('Tail',R,0.2,0.62,-0.1,-0.25);put(sph(0.08,0.9,3.4,0.9),cr,T,0,-0.27,0);put(sph(0.05,0.9,3.6,0.9),dk,T,0,-0.28,0);},
 mane_braids(k){const {node,put,mat,R}=k,cr=mat('Mane',0xefe4cc),red=mat('Ribbon',0xa8402c,{r:0.7});
  const Mn=node('Mane',R,-0.12,0.05,0,0.55);put(new THREE.BoxGeometry(0.04,0.55,0.05),cr,Mn,0,0.3,0);
  for(let i=0;i<7;i++){const y=0.05+i*0.08;put(sph(0.042,1,1.1,0.9),cr,Mn,0,y,-0.02);put(new THREE.BoxGeometry(0.09,0.014,0.09),red,Mn,0,y,-0.02);}
  const T=node('Tail',R,0.2,0.62,-0.1,-0.25);put(sph(0.08,0.9,3.4,0.9),cr,T,0,-0.27,0);put(cyl(0.078,0.035,10),red,T,0,-0.2,0);put(cyl(0.064,0.035,10),red,T,0,-0.1,0);},
 rider_scarf(k){const {node,put,mat,R}=k,kn=mat('Knit',0x9a3a2e,{r:1}),fr=mat('Fringe',0xefe6d2,{r:1});
  const Sc=node('Scarf',R,0,0.08,0);put(new THREE.TorusGeometry(0.3,0.06,8,24),kn,Sc,0,0,0,PI/2,0,0);
  [[0.1,0.2],[-0.06,-0.15]].forEach(([x,a])=>{const E=node('End',Sc,x,-0.02,0.3,0,a,0);put(new THREE.BoxGeometry(0.11,0.03,0.34),kn,E,0,0,0.17);for(let i=0;i<4;i++)put(new THREE.BoxGeometry(0.012,0.012,0.05),fr,E,-0.04+i*0.027,0,0.36);});
  [0.06,0.18].forEach(z=>put(new THREE.TorusGeometry(0.3,0.012,4,24),fr,Sc,0,0.001+z*0,0,PI/2,0,0));},
 rider_boots(k){const {node,put,mat,R}=k,bt=mat('Boot',0x4a3222,{r:0.55}),so=mat('Sole',0x2a2420),cu=mat('Cuff',0x6a4228);
  [-1,1].forEach(s=>{const Bt=node(s<0?'BootL':'BootR',R,0.12*s,0,0,0,0.12*s,0);put(cyl(0.075,0.36,14),bt,Bt,0,0.26,-0.02);put(sph(0.085,1,0.8,1.6),bt,Bt,0,0.07,0.05);
   put(new THREE.BoxGeometry(0.15,0.025,0.3),so,Bt,0,0.012,0.05);put(new THREE.BoxGeometry(0.12,0.05,0.07),so,Bt,0,0.035,-0.06);put(new THREE.TorusGeometry(0.078,0.014,5,16),cu,Bt,0,0.44,-0.02,PI/2,0,0);});},
};
const SIZE={saddle:'0.7 m',bridle:'Horse head',mane:'Mane 0.6 m',rider:'Rider size'};
export const TACK_ASSETS=TACK.map(t=>({id:t.id,n:t.n,da:TACK_CATS.find(c=>c[0]===t.cat)[1]+(t.free?' · starter':' · unlockable'),tags:['Tack'],
  where:"Tack room · Thora's hatch",when:'Cosmetic · no stat change',lure:t.free?'Unlocked from the start':'Locked · unlock TBD',size:SIZE[t.cat],real:t.cat==='saddle'?0.7:0.6,rarity:t.free?'Starter':'Locked',
  note:t.s,actName:'Spin',dur:1.4,moves:{},
  build(k){BUILD[t.id](k);return k.top;},
  idle(r,t2){r.Root.position.y+=0.02*Math.sin(t2*1.6);r.Root.rotation.y+=0.25*Math.sin(t2*0.7);},
  act(r,at,p){r.Root.rotation.y+=TAU*ez(p);r.Root.position.y+=0.14*Math.sin(PI*p);}}));

// root = player character scene (Swamp rig with Head / Foot_L / Foot_R bones); sel.rider = item id
export function applyRiderTack(root,sel){
  if(!root.userData.tack){const T={},mats=[],hd=root.getObjectByName('Head'),fl=root.getObjectByName('Foot_L'),fr=root.getObjectByName('Foot_R');
    const knit=mkMat(mats,'Knit',0x9a3a2e,{r:1}),boot=mkMat(mats,'Boot',0x4a3222,{r:0.55}),sole=mkMat(mats,'Sole',0x2a2420);
    if(hd){const sc=T.scarf=grp(hd,'RiderScarf');put(new THREE.TorusGeometry(0.3,0.06,8,24),knit,sc,0,-0.3,0,PI/2,0,0);
      put(new THREE.BoxGeometry(0.1,0.26,0.035),knit,sc,0.13,-0.44,0.27,0.25,0,0.15);put(new THREE.BoxGeometry(0.09,0.2,0.035),knit,sc,0.03,-0.42,0.3,0.3,0,-0.1);}
    T.boots=[fl,fr].filter(Boolean).map((f,i)=>{const g=grp(f,'RiderBoot_'+(i?'R':'L'));put(cyl(0.085,0.18,12),boot,g,0,0.08,0);put(new THREE.BoxGeometry(0.16,0.03,0.22),sole,g,0,-0.005,0.03);return g;});
    root.userData.tack=T;}
  const T=root.userData.tack;if(T.scarf)T.scarf.visible=sel.rider==='rider_scarf';T.boots.forEach(g=>g.visible=sel.rider==='rider_boots');}
