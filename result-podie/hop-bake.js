// Baked hop effects: every effect is real geometry on its own FX_ bones, animated by an exported "Hop" clip.
// Hop only has tracks for FX_ bones, so it plays on top of Idle/Walk (LoopOnce). At rest every FX_ bone is hidden.
import * as THREE from 'three';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const sm=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
function rng(seed){let a=seed|0;return (lo=0,hi=1)=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return lo+(hi-lo)*(((t^t>>>14)>>>0)/4294967296);};}
export const HOP_FX=/^FX_/;
function avgColor(obj,fb){const c=new THREE.Color(0,0,0);let n=0;
  obj&&obj.traverse(o=>{if(!o.isMesh)return;const ca=o.geometry.attributes.color,mc=[].concat(o.material)[0].color||new THREE.Color(1,1,1);
    if(ca)for(let i=0;i<ca.count;i+=3){c.r+=ca.getX(i)*mc.r;c.g+=ca.getY(i)*mc.g;c.b+=ca.getZ(i)*mc.b;n++;}else{c.r+=mc.r;c.g+=mc.g;c.b+=mc.b;n++;}});
  return n?c.multiplyScalar(1/n):new THREE.Color(fb);}
const drop=(name,col,em,ei)=>new THREE.MeshPhysicalMaterial({name,color:col,roughness:0.04,clearcoat:1,clearcoatRoughness:0.05,transparent:true,opacity:0.8,emissive:em,emissiveIntensity:ei});

// ---------- particle kinds: init(i,A) -> state, step(s,dt), draw(s) -> {p,q,s:Vector3} (all in host space)
const KINDS={
  pollen:{n:24,dur:2.4,geo:()=>new THREE.IcosahedronGeometry(1,0),mat:()=>new THREE.MeshStandardMaterial({name:'fx_pollen',color:0xf2bd2a,emissive:0x7a5200,emissiveIntensity:0.35,roughness:0.7}),
    init(i,A,R){const o=A.pts[0],a=R(0,6.28),r=R(0,0.09);return {p:V(o.x+Math.sin(a)*r,o.y+R(-0.02,0.03),o.z+Math.cos(a)*r),v:V(Math.sin(a)*R(0.15,0.6),R(0.8,1.9),Math.cos(a)*R(0.15,0.6)),sz:0.011*R(0.6,1.5),life:R(1.4,2.3),ph:R(0,6),age:0};},
    step(s,dt){s.age+=dt;s.v.multiplyScalar(1-dt*2.6);s.v.y-=0.25*dt;s.p.addScaledVector(s.v,dt);s.p.x+=Math.sin(s.age*2.5+s.ph)*0.05*dt;s.p.z+=Math.cos(s.age*2.1+s.ph)*0.05*dt;},
    size(s){const k=s.age/s.life;return s.sz*sm(0,0.08,k)*(1-0.4*k)*(1-sm(0.6,1,k));}},
  florets:{n:9,dur:3.6,geo:()=>new THREE.CircleGeometry(1,6),mat:A=>new THREE.MeshStandardMaterial({name:'fx_floret',color:A.color??0x9b6fd6,roughness:0.7,side:THREE.DoubleSide}),
    init(i,A,R){const o=A.pts[Math.min(1,A.pts.length-1)],a=R(0,6.28),r=R(0.12,0.2);return {p:V(o.x+Math.sin(a)*r,o.y+R(-0.18,0.2),o.z+Math.cos(a)*r),v:V(Math.sin(a)*R(0.3,0.6),R(0.5,1.1),Math.cos(a)*R(0.3,0.6)),e:V(R(0,6),R(0,6),R(0,6)),w:V(R(-5,5),R(-5,5),R(-5,5)),sz:0.028,life:R(2.6,3.5),ph:R(0,6),age:0};},
    step:flutter,size(s){return s.sz*sm(0,0.05,s.age)*(1-sm(s.life-0.8,s.life,s.age));}},
  petal:{n:1,dur:3.4,geo:()=>new THREE.SphereGeometry(1,12,8,0,Math.PI*0.7,0.25,Math.PI*0.6).scale(0.7,1,0.7),mat:A=>new THREE.MeshStandardMaterial({name:'fx_petal',color:A.color??0xd8504a,roughness:0.7,side:THREE.DoubleSide}),
    init(i,A,R){const o=A.pts[(R(0,A.pts.length))|0].clone();o.y+=0.2;return {p:o,v:V(R(-0.4,0.4),R(0.8,1.3),R(-0.4,0.4)),e:V(R(-0.3,0.3),R(0,6),R(-0.3,0.3)),w:V(R(-3,3),R(-2,2),R(-3,3)),sz:0.075,life:3.3,ph:R(0,6),age:0};},
    step:flutter,size(s){return s.sz*sm(0,0.05,s.age)*(1-sm(s.life-0.7,s.life,s.age));}},
  gel:{n:12,dur:1.3,geo:()=>new THREE.IcosahedronGeometry(1,0),mat:()=>drop('fx_gel',0xd6f2b4,0x8fd86a,0.4),
    init(i,A,R){return spray(A,R,{up:[0.9,1.9],out:[0.5,1.3],sz:[0.02,0.034],life:[0.7,1.1],delay:[0,0.06]});},step:fall(6.5),size:dropSize},
  water:{n:18,dur:1.5,geo:()=>new THREE.IcosahedronGeometry(1,0),mat:()=>drop('fx_water',0xcfe8f4,0x5c9cc0,0.28),
    init(i,A,R){return spray(A,R,{up:[1.1,2.2],out:[0.5,1.4],sz:[0.014,0.026],life:[0.9,1.4],delay:[0,0.08]});},step:fall(7),size:dropSize},
  dew:{n:12,dur:1.9,geo:()=>new THREE.IcosahedronGeometry(1,0),mat:()=>drop('fx_dew',0xe6f3ea,0x8fc4a8,0.22),
    init(i,A,R){const s=spray(A,R,{up:[0,0],out:[0,0],sz:[0.016,0.026],life:[1.4,1.8],delay:[0,0.3]});s.roll=R(0.35,0.55);s.p0=s.p.clone();s.out=V(s.p.x-A.c.x,0,s.p.z-A.c.z).normalize();if(!isFinite(s.out.x))s.out.set(1,0,0);return s;},
    step(s,dt){s.age+=dt;const a=s.age-s.delay;if(a<0)return;
      if(a<s.roll){const e=sm(0,1,a/s.roll);s.p.copy(s.p0).addScaledVector(s.out,0.02+0.07*e);s.p.y-=0.03*e;if(a+dt>=s.roll)s.v.copy(s.out).multiplyScalar(0.35).setY(-0.15);return;}
      fall(6.5)(s,dt,true);},
    size(s){const a=s.age-s.delay;if(a<0)return 0;if(a<s.roll){const g=sm(0,0.12,a)*s.sz;return V(g,g*(1+0.5*sm(0.6,1,a/s.roll)),g);}return dropSize(s);}},
  fireflies:{n:10,dur:3.6,geo:()=>new THREE.IcosahedronGeometry(1,0),mat:()=>new THREE.MeshStandardMaterial({name:'fx_firefly',color:0xeaff9a,emissive:0xd8ff6a,emissiveIntensity:2.2,roughness:0.4}),
    init(i,A,R){return {o:A.pts[0].clone(),r:R(0.22,0.46),h:R(-0.15,0.32),w:R(2.2,4.2)*(R()<0.5?-1:1),a0:R(0,6.28),ph:R(0,6),bf:R(7,13),wf:R(3,6),end:R(2.2,2.5),dx:R(-1,1),dz:R(-1,1),age:0,p:V()};},
    step(s,dt){s.age+=dt;const t=s.age,out=sm(0,0.45,t),lv=sm(s.end,s.end+1,t),ang=s.a0+s.w*t,r=0.05+s.r*out+lv*0.9;
      s.p.set(s.o.x+Math.cos(ang)*r+Math.sin(t*s.wf+s.ph)*0.04+s.dx*lv*0.6,s.o.y+s.h*out+Math.sin(t*s.wf*1.3+s.ph)*0.06+lv*0.7,s.o.z+Math.sin(ang)*r+Math.cos(t*s.wf+s.ph)*0.04+s.dz*lv*0.6);},
    size(s){const t=s.age;return 0.013*sm(0,0.15,t)*(1-sm(s.end,s.end+1,t))*(0.55+0.45*Math.sin(t*s.bf+s.ph));}},
};
function spray(A,R,o){const src=A.pts[(R(0,A.pts.length))|0],p=src.clone().add(V(R(-0.03,0.03),R(0,0.03),R(-0.03,0.03)));
  const out=V(p.x-A.c.x,0,p.z-A.c.z).normalize();if(!isFinite(out.x))out.set(R(-1,1),0,R(-1,1)).normalize();
  return {p,v:out.multiplyScalar(R(...o.out)).add(V(R(-0.25,0.25),R(...o.up),R(-0.25,0.25))),sz:R(...o.sz),life:R(...o.life),delay:R(...o.delay),age:0,st:0,gy:A.ground};}
function fall(g){return (s,dt,started)=>{if(!started)s.age+=dt;if(s.age<s.delay)return;
  if(s.st===0){s.v.y-=g*dt;s.p.addScaledVector(s.v,dt);if(s.p.y<=s.gy+s.sz*0.3){s.p.y=s.gy+0.002;s.st=1;s.hitAt=s.age;}}};}
function dropSize(s){if(s.age<s.delay||s.age>s.delay+s.life)return 0;const k=1-sm(s.life*0.75,s.life,s.age-s.delay);
  if(s.st===0){const st=1+Math.min(0.7,Math.abs(s.v.y)*0.1);return V(s.sz,s.sz*st,s.sz).multiplyScalar(sm(0,0.04,s.age-s.delay)*k);}
  const h=Math.max(0,1-(s.age-s.hitAt)/0.22),f=1.2+1.4*(1-h);return h>0?V(s.sz*f,s.sz*0.18*h,s.sz*f):0;}
function flutter(s,dt){s.age+=dt;if(!s.down){s.v.y=Math.max(-0.36,s.v.y-2*dt);s.v.x*=1-dt*1.3;s.v.z*=1-dt*1.3;s.p.addScaledVector(s.v,dt);s.p.x+=Math.sin(s.age*3+s.ph)*0.15*dt;
  s.e.addScaledVector(s.w,dt);if(s.p.y<=s.gy+0.004){s.p.y=s.gy+0.004;s.down=true;s.e.set(-Math.PI/2,0,s.e.y);}}}

/**
 * kind: 'pollen'|'florets'|'petal'|'gel'|'water'|'dew'|'fireflies'|'spines'
 * host: authoring root (char). anchors: Object3Ds the effect starts from. feet: foot nodes (ground height).
 * spines: areoles [{parent,pos,n}] recorded at build time.
 * Returns {bones, duration, hide(), pose(t)} — push bones into B, call hide() in rest/Idle/Walk, pose(t) in the Hop clip.
 */
export function bakeHop(kind,{host,anchors=[],feet=[],areoles=[],color,seed=11}){
  if(kind==='spines')return spines(host,areoles);
  const K=KINDS[kind],R=rng(seed),geo=K.geo();geo.deleteAttribute('uv');
  const A={color:color??(kind==='petal'||kind==='florets'?avgColor(anchors[0],kind==='petal'?0xd8504a:0x9b6fd6):undefined)};
  const mat=K.mat(A),parts=[];
  for(let i=0;i<K.n;i++){const b=new THREE.Group();b.name='FX_'+kind+'_'+String(i).padStart(2,'0');const m=new THREE.Mesh(geo,mat);m.name='fx_'+kind;b.add(m);b.scale.setScalar(1e-4);host.add(b);parts.push(b);}
  let table=null;const fps=30,N=Math.round(K.dur*fps);
  function prepare(){host.updateMatrixWorld(true);const inv=host.matrixWorld.clone().invert(),w=V();
    A.pts=anchors.map(a=>a.getWorldPosition(V()).applyMatrix4(inv));if(!A.pts.length)A.pts=[V(0,1,0)];
    A.c=A.pts.reduce((s,p)=>s.add(p),V()).multiplyScalar(1/A.pts.length);A.c.set(0,A.c.y,0);
    const fb=new THREE.Box3();feet.forEach(f=>fb.expandByObject(f,true));A.ground=fb.isEmpty()?0:w.set(0,fb.min.y,0).applyMatrix4(inv).y;
    const st=parts.map((_,i)=>{const s=K.init(i,A,R);s.gy=A.ground;return s;});
    table=[];const q=new THREE.Quaternion(),e=new THREE.Euler();
    for(let f=0;f<=N;f++){table.push(st.map(s=>{let sz=f===0||f===N?0:K.size(s);const sv=sz instanceof THREE.Vector3?sz:V(sz,sz,sz);if(sv.x<1e-4||sv.y<1e-4)sv.setScalar(1e-4);
        return {p:s.p.clone(),q:s.e?q.setFromEuler(e.set(s.e.x,s.e.y,s.e.z)).clone():new THREE.Quaternion(),s:sv};}));
      st.forEach(s=>K.step(s,1/fps));}
    table[N]=table[0];}
  const hide=()=>parts.forEach(b=>{b.scale.setScalar(1e-4);});
  function pose(t){if(!table)prepare();const fr=table[Math.min(N,Math.max(0,Math.round(t*fps)))];parts.forEach((b,i)=>{const r=fr[i];b.position.copy(r.p);b.quaternion.copy(r.q);b.scale.copy(r.s);});}
  return {bones:parts.map(b=>[b,b.name]),duration:K.dur,hide,pose};
}

// ---------- Cactus: needles at every areole. Base rides the body; tip is weighted to a per-region FX_Spines bone.
// At rest (scale 1) tips sit inside the body; scaling the FX bone up pushes every tip out to full length.
function spines(host,areoles){
  const mat=new THREE.MeshStandardMaterial({name:'fx_spine',color:0xf4e8bc,roughness:0.45,emissive:0x3a3010,emissiveIntensity:0.3});
  const groups=new Map();areoles.forEach(a=>{if(!groups.has(a.parent))groups.set(a.parent,[]);groups.get(a.parent).push(a);});
  const exts=[];let gi=0;const R=rng(5),L=0.052,PER=2,RAD=0.0038;
  for(const [par,list] of groups){
    const c=list.reduce((s,a)=>s.add(a.pos),V()).multiplyScalar(1/list.length),an=list.reduce((s,a)=>s.add(a.n),V());
    if(an.length()>0.4*list.length)c.addScaledVector(an.normalize(),-0.07);
    const ext=new THREE.Group();ext.name='FX_Spines_'+(gi++);ext.position.copy(c);par.add(ext);
    let rmin=Infinity;list.forEach(a=>rmin=Math.min(rmin,a.pos.distanceTo(c)));const S=1+1.9*L/Math.max(0.03,rmin);
    const pos=[],idx=[],tips=new Set(),key=p=>Math.fround(p.x)+','+Math.fround(p.y)+','+Math.fround(p.z);
    list.forEach(a=>{for(let j=0;j<PER;j++){
      const d=a.n.clone().add(V(R(-1,1),R(-1,1),R(-1,1)).multiplyScalar(j?0.5:0.12)).normalize(),len=L*(j?R(0.65,0.9):1);
      const base=a.pos.clone().addScaledVector(a.n,-0.002),tipE=a.pos.clone().addScaledVector(d,len),tipC=c.clone().add(tipE.clone().sub(c).multiplyScalar(1/S));
      const u=Math.abs(d.y)<0.9?V(0,1,0):V(1,0,0),t1=u.clone().cross(d).normalize(),t2=d.clone().cross(t1),b0=pos.length/3;
      for(let k=0;k<3;k++){const an2=k/3*Math.PI*2,p=base.clone().addScaledVector(t1,Math.cos(an2)*RAD).addScaledVector(t2,Math.sin(an2)*RAD);pos.push(p.x,p.y,p.z);}
      const tc=tipC.clone().add(V(j*1e-5,0,0));pos.push(tc.x,tc.y,tc.z);tips.add(key(tc));
      for(let k=0;k<3;k++)idx.push(b0+k,b0+(k+1)%3,b0+3);}});
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
    const m=new THREE.Mesh(g,mat);m.name='fx_spines';const tv=V();m.userData.skin=p=>tips.has(key(tv.copy(p)))?[[ext,1]]:null;par.add(m);
    exts.push({ext,S});}
  const hide=()=>exts.forEach(e=>e.ext.scale.setScalar(1));
  function pose(t){const amp=sm(0,0.07,t)*(1-sm(0.5,1.05,t));exts.forEach(({ext,S},i)=>{const q=1+0.2*Math.sin(t*42+i)*Math.exp(-4*t);ext.scale.setScalar(1+(S-1)*amp*q);});}
  return {bones:exts.map(e=>[e.ext,e.ext.name]),duration:1.2,hide,pose};
}
