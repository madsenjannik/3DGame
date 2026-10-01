// Wild animals — 12 low-poly garden visitors. Each: build(kit) → model, idle(rig,t) loops on IDLE, act(rig,at,p) one-shot.
// All animation is additive on top of the base pose so it can be sampled and baked into GLB clips.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const PI=Math.PI,TAU=PI*2;
export const IDLE=4;
const W=TAU/IDLE;
const sn=(t,k,p=0)=>Math.sin(t*W*k+p);
const cl=x=>Math.min(1,Math.max(0,x));
const sm=(a,b,x)=>{x=cl((x-a)/(b-a));return x*x*(3-2*x);};
const bump=(t,at,wd=0.12)=>{const d=((t-at)%IDLE+IDLE)%IDLE,dd=Math.min(d,IDLE-d);return dd<wd?Math.cos(dd/wd*PI/2):0;};
const env=(p,a=0.15,b=0.85)=>sm(0,a,p)*(1-sm(b,1,p));
const arc=x=>Math.sin(PI*cl(x));
const seg=(p,a,b)=>cl((p-a)/(b-a));
const S=(r,sx=1,sy=1,sz=1,w=10,h=8)=>new THREE.SphereGeometry(r,w,h).scale(sx,sy,sz);
const C=(r,h,s=7)=>new THREE.ConeGeometry(r,h,s);
const Y=(a,b,h,s=7)=>new THREE.CylinderGeometry(a,b,h,s);
const blink=(r,v)=>{if(r.EyeL){r.EyeL.scale.y-=v;r.EyeR.scale.y-=v;}};

function kit(id){
  const M={},rig={};
  const mat=(n,c,o={})=>M[n]||(M[n]=new THREE.MeshStandardMaterial({name:id+'_'+n,color:c,roughness:o.r??0.85,metalness:o.m??0,flatShading:!o.smooth,
    transparent:o.op!=null,opacity:o.op??1,depthWrite:o.op==null,side:o.ds?THREE.DoubleSide:THREE.FrontSide}));
  const node=(n,p,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{const g=new THREE.Group();g.name=id+'_'+n;g.position.set(x,y,z);g.rotation.set(rx,ry,rz);p.add(g);rig[n]=g;return g;};
  const put=(geo,m,p,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.castShadow=true;p.add(o);return o;};
  const eyes=(p,x,y,z,r,c=0x1a1612)=>[-1,1].forEach(s=>{const E=node(s<0?'EyeL':'EyeR',p,x*s,y,z);
    put(S(r),mat('Eye',c,{r:0.25,smooth:1}),E);put(S(r*0.32,1,1,1,6,4),mat('Shine',0xffffff,{r:0.1,smooth:1}),E,r*0.3*s,r*0.4,r*0.78);});
  const top=new THREE.Group();const R=node('Root',top);
  return {M,rig,mat,node,put,eyes,top,R};
}
const breath=(r,a,k=2)=>{const v=a*sn(r.__t,k);r.Body.scale.x+=v*0.6;r.Body.scale.y+=v;r.Body.scale.z+=v*0.4;};
const wingShape=(pts,s)=>{const sh=new THREE.Shape();pts.forEach(([x,z],i)=>i?sh.lineTo(x*s,-z):sh.moveTo(x*s,-z));const g=new THREE.ShapeGeometry(sh);g.rotateX(-PI/2);return g;};
const disc=(r,sx=1,sz=1,seg=14)=>{const g=new THREE.CircleGeometry(r,seg);g.scale(sx,sz,1);g.rotateX(-PI/2);return g;};

function bird(k,o){
  const {node,put,mat,eyes,R}=k;
  const back=mat('Back',o.back),hd=mat('Head',o.head),ck=mat('Cheek',o.cheek),br=mat('Breast',o.breast),bl=mat('Belly',o.belly),wg=mat('Wing',o.wing),tl=mat('Tail',o.tail),bk=mat('Beak',o.beak,{r:0.5}),lg=mat('Leg',o.leg);
  const B=node('Body',R,0,0.06,0);
  put(S(0.1,0.9,1,1.3),back,B,0,0.1,-0.01,-0.45);
  put(S(0.085,0.92,1,0.95),br,B,0,0.095,0.035,-0.3);
  put(S(0.07,0.85,0.85,0.9),bl,B,0,0.05,0.02);
  if(o.stripe)put(S(0.018,0.8,3.4,0.6),hd,B,0,0.075,0.1,-0.25);
  const H=node('Head',B,0,0.2,0.04);
  put(S(0.072),hd,H);
  if(o.face==='tit')[-1,1].forEach(s=>put(S(0.04,0.45,0.9,1.1),ck,H,0.05*s,-0.012,0.018));
  else put(S(0.062,1,0.95,0.7),ck,H,0,-0.012,0.03);
  put(C(0.016*(o.bw||1),0.05*(o.bl||1),4),bk,H,0,0.002,0.06+0.025*(o.bl||1),PI/2);
  const J=node('Jaw',H,0,-0.008,0.066);put(C(0.012*(o.bw||1),0.034*(o.bl||1),4),bk,J,0,0,0.017*(o.bl||1),PI/2);
  if(o.crest)put(C(0.022,0.07,4),hd,H,0,0.07,-0.02,-0.7);
  eyes(H,0.047,0.016,0.05,0.012);
  [-1,1].forEach(s=>{const Wn=node(s<0?'WingL':'WingR',B,0.074*s,0.13,0,-0.45);put(S(0.06,0.3,0.75,1.6),wg,Wn,0,-0.01,-0.05);});
  const T=node('Tail',B,0,0.05,-0.1,-0.3);put(new THREE.BoxGeometry(0.055,0.01,0.12*(o.tl||1)),tl,T,0,0,-0.06*(o.tl||1));
  const Lg=node('Legs',B,0,0.01,0.015);[-1,1].forEach(s=>{put(Y(0.005,0.005,0.07,4),lg,Lg,0.025*s,-0.035,0);put(S(0.012,1,0.3,2.2),lg,Lg,0.025*s,-0.066,0.01);});
  return k.top;
}
function birdIdle(r,t){r.__t=t;breath(r,0.02,4);
  r.Head.rotation.y+=0.45*Math.tanh(4*sn(t,1,0.3));r.Head.rotation.z+=0.2*Math.tanh(3*sn(t,2,1));
  r.Tail.rotation.x+=0.35*(bump(t,1.5,0.1)+bump(t,3.2,0.1));blink(r,0.9*bump(t,2.6,0.07));}

function water(k,o){
  const {node,put,mat,eyes,R}=k;const bd=mat('Body',o.body),wg=mat('Wing',o.wing),hd=mat('Head',o.head),bl=mat('Bill',o.bill,{r:0.5}),nk=mat('Neck',o.neck),tl=mat('Tail',o.tail),ft=mat('Feet',o.feet);
  const B=node('Body',R,0,0.1,0);put(S(0.16,0.85,0.7,1.35),bd,B,0,0.08,0);
  if(o.breast)put(S(0.1,1.1,0.9,0.7),mat('Breast',o.breast),B,0,0.1,0.13);
  [-1,1].forEach(s=>{const Wn=node(s<0?'WingL':'WingR',B,0.1*s,0.14,0.04);Wn.rotation.order='ZYX';put(S(0.09,0.3,0.5,1.8),wg,Wn,0,0,-0.09);
    if(o.spec)put(S(0.03,0.5,0.5,1.4),mat('Speculum',o.spec,{r:0.4}),Wn,0.012*s,0,-0.05);});
  const T=node('Tail',B,0,0.12,-0.2,-0.5);put(C(0.055,0.12,5),tl,T,0,0,-0.04,-PI/2);
  const N1=node('Neck',B,0,0.12,0.15,o.n1);put(Y(0.034*o.nw,0.046*o.nw,o.nl,7),nk,N1,0,o.nl/2,0);
  if(o.ring)put(Y(0.037*o.nw,0.037*o.nw,0.012,7),mat('Ring',o.ring),N1,0,o.nl*0.85,0);
  const N2=node('Neck2',N1,0,o.nl,0,o.n2);put(Y(0.03*o.nw,0.035*o.nw,o.nl2,7),nk,N2,0,o.nl2/2,0);
  const H=node('Head',N2,0,o.nl2,0,o.hd);put(S(0.052,0.9,0.9,1.25),hd,H,0,0.01,0.01);
  put(S(0.028,1.1,0.4,1.9),bl,H,0,-0.004,0.08);if(o.knob)put(S(0.015,1,1,1.3),mat('Knob',o.knob),H,0,0.012,0.055);
  eyes(H,0.04,0.02,0.03,0.009);
  [-1,1].forEach(s=>{const L=node(s<0?'LegL':'LegR',B,0.05*s,-0.02,0.02);put(Y(0.007,0.007,0.07,4),ft,L,0,-0.035,0);put(S(0.03,1,0.15,1.4),ft,L,0,-0.07,0.02);});
  return k.top;}
function waterIdle(r,t){r.__t=t;breath(r,0.015,2);r.Head.rotation.y+=0.4*Math.tanh(3*sn(t,1,0.6));r.Neck.rotation.x+=0.04*sn(t,1);
  r.Tail.rotation.y+=0.35*(bump(t,1.2,0.08)+bump(t,1.45,0.08));blink(r,0.9*bump(t,2.7,0.07));}
function waterFlap(r,at,p){const e=env(p,0.2,0.8);r.WingL.rotation.y+=1.3*e;r.WingR.rotation.y-=1.3*e;const f=(0.4+0.6*Math.sin(at*9))*e;r.WingR.rotation.z+=f;r.WingL.rotation.z-=f;
  r.Body.rotation.x-=0.25*e;r.Neck.rotation.x-=0.2*e;r.Head.rotation.x+=0.3*e;}

export const ANIMALS=[
{id:'squirrel',n:'Red Squirrel',da:'Egern',tags:['Mammals'],where:'Trees by the fence',when:'Day · busiest in autumn',lure:'Hazelnuts',size:'20 cm + tail',real:0.4,rarity:'Uncommon',
 note:'Buries nuts all over the garden. Some of them sprout.',actName:'Nibble',dur:2.6,
 build(k){const {node,put,mat,eyes,R}=k;const fur=mat('Fur',0xb4552a),bel=mat('Belly',0xefdcc0),dk=mat('Tuft',0x7a3418),nut=mat('Nut',0x9a6a38),ns=mat('Nose',0x2a1a14);
  const B=node('Body',R,0,0.1,0);put(S(0.17,1,1.25,0.95),fur,B,0,0.2,0,-0.2);put(S(0.13,0.85,1.1,0.6),bel,B,0,0.19,0.09,-0.2);
  [-1,1].forEach(s=>{put(S(0.09,0.9,1,1.25),fur,R,0.1*s,0.1,-0.02);put(S(0.05,0.9,0.5,1.7),fur,R,0.1*s,0.03,0.09);});
  const H=node('Head',B,0,0.44,0.05);put(S(0.13,1,0.95,1.05),fur,H);put(S(0.07,1,0.8,1),bel,H,0,-0.03,0.1);put(S(0.022),ns,H,0,0,0.17);eyes(H,0.07,0.03,0.095,0.024);
  [-1,1].forEach(s=>{const E=node(s<0?'EarL':'EarR',H,0.065*s,0.1,-0.01,0,0,-0.15*s);put(C(0.035,0.1,5),fur,E,0,0.05,0);put(C(0.018,0.07,4),dk,E,0,0.12,0);});
  [-1,1].forEach(s=>{const A=node(s<0?'ArmL':'ArmR',B,0.07*s,0.32,0.1,-0.5);put(S(0.03,1,2.2,1),fur,A,0,-0.05,0);});
  const N=node('Nut',B,0,0.25,0.2);put(S(0.035,1,1.15,1),nut,N);put(S(0.03,1,0.5,1),dk,N,0,0.03,0);
  const T1=node('Tail1',R,0,0.12,-0.16,-0.35);put(S(0.1,0.9,1.5,1),fur,T1,0,0.13,-0.03);
  const T2=node('Tail2',T1,0,0.26,-0.04,0.3);put(S(0.12,0.9,1.35,1),fur,T2,0,0.13,0);
  const T3=node('Tail3',T2,0,0.24,0,-1.0);put(S(0.09,0.9,1.3,1),fur,T3,0,0.1,0);return k.top;},
 idle(r,t){r.__t=t;breath(r,0.015);r.Head.rotation.y+=0.25*sn(t,1);r.Head.rotation.z+=0.08*sn(t,2,1);r.Head.rotation.x-=0.15*bump(t,1.3,0.25);
  r.EarL.rotation.z+=0.3*bump(t,2.2,0.08);r.EarR.rotation.z-=0.3*bump(t,2.4,0.08);
  r.Tail1.rotation.x+=0.06*sn(t,1);r.Tail2.rotation.x+=0.1*sn(t,1,0.8);r.Tail3.rotation.x+=0.18*sn(t,1,1.6);r.Tail1.rotation.z+=0.06*sn(t,1,0.4);blink(r,0.9*bump(t,3.1,0.07));},
 act(r,at,p){const e=env(p,0.2,0.8);r.ArmL.rotation.x-=0.75*e;r.ArmR.rotation.x-=0.75*e;r.Nut.position.y+=0.13*e;r.Nut.position.z-=0.01*e;
  r.Head.rotation.x+=(0.22+0.07*Math.sin(at*38))*e;r.Body.rotation.x+=0.08*e;r.Tail3.rotation.x+=0.5*arc(seg(p,0.82,1));}},

{id:'hedgehog',n:'Hedgehog',da:'Pindsvin',tags:['Mammals','Night'],where:'Under hedges and leaf piles',when:'Dusk & night · sleeps in winter',lure:'A leaf pile',size:'25 cm',real:0.25,rarity:'Common',
 note:'Eats snails. A quiet ally against the pests.',actName:'Curl',dur:3.2,
 build(k){const {node,put,mat,eyes,R}=k;const sp=mat('Spine',0x4e3c2c),tp=mat('SpineTip',0xb8a078),sk=mat('Skin',0xc49a6c),fc=mat('Face',0xd9b88c),ns=mat('Nose',0x1e1814);
  const B=node('Body',R,0,0.17,0);put(S(0.26,1,0.72,1.3),sp,B);put(S(0.22,0.95,0.55,1.2),sk,B,0,-0.05,0.02);
  const cg=[],tg=[],up=new THREE.Vector3(0,1,0),N=130;
  for(let i=0;i<N;i++){const y=1-2*(i+0.5)/N,rr=Math.sqrt(1-y*y),a=i*2.39996,x=Math.cos(a)*rr,z=Math.sin(a)*rr;if(y<-0.05||z>0.7)continue;
    const pos=new THREE.Vector3(x*0.26,y*0.187,z*0.338),n=new THREE.Vector3(x/0.26,y/0.187,z/0.338).normalize(),d=n.add(new THREE.Vector3(0,0.15,-0.8)).normalize();
    const q=new THREE.Quaternion().setFromUnitVectors(up,d),L=0.13+0.04*((i*37)%7)/7;
    const g=C(0.028,L,4);g.translate(0,L/2,0);g.applyQuaternion(q);g.translate(pos.x,pos.y,pos.z);cg.push(g);
    if(i%2){const tt=C(0.012,0.045,4);tt.translate(0,L-0.02,0);tt.applyQuaternion(q);tt.translate(pos.x,pos.y,pos.z);tg.push(tt);}}
  put(mergeGeometries(cg),sp,B);put(mergeGeometries(tg),tp,B);
  const H=node('Head',B,0,-0.03,0.27);put(S(0.12,0.95,0.85,1.1),fc,H);put(C(0.065,0.17,7),fc,H,0,-0.02,0.13,PI/2);put(S(0.025),ns,H,0,-0.02,0.22);
  eyes(H,0.06,0.035,0.085,0.018);[-1,1].forEach(s=>put(S(0.03,1,1,0.5),sk,H,0.08*s,0.08,0));
  [-1,1].forEach(s=>[-1,1].forEach(f=>put(S(0.035,1,0.6,1.3),sk,node('Leg'+(f>0?'F':'B')+(s<0?'L':'R'),R,0.12*s,0.03,0.14*f))));return k.top;},
 idle(r,t){r.__t=t;breath(r,0.02);const sf=bump(t,1,0.6);r.Head.position.z+=0.012*sn(t,10)*sf;r.Head.rotation.x+=0.06*sn(t,10,1)*sf;
  r.Head.rotation.y+=0.3*sn(t,1,2);blink(r,0.9*bump(t,2.8,0.07));},
 act(r,at,p){const e=env(p,0.22,0.72);r.Head.position.z-=0.16*e;r.Head.position.y-=0.04*e;r.Head.scale.x-=0.6*e;r.Head.scale.y-=0.6*e;r.Head.scale.z-=0.6*e;
  r.Body.scale.y+=0.32*e;r.Body.scale.z-=0.15*e;r.Body.position.y+=0.04*e;r.Body.rotation.x+=0.2*e;r.Body.rotation.z+=0.03*Math.sin(at*28)*sm(0.3,0.4,p)*(1-sm(0.55,0.65,p));}},

{id:'hare',n:'Brown Hare',da:'Hare',tags:['Mammals'],where:'Open lawn',when:'Early morning',lure:'Clover',size:'55 cm',real:0.55,rarity:'Common',
 note:'Nibbles your carrots if you let it.',actName:'Hop',dur:1.2,
 build(k){const {node,put,mat,eyes,R}=k;const fur=mat('Fur',0xa2865c),bel=mat('Belly',0xe6d8bc),dk=mat('EarTip',0x2a2018),ns=mat('Nose',0x7a4a3e),wh=mat('Tail',0xf2ece2);
  const B=node('Body',R);put(S(0.18,1,0.95,1.35),fur,B,0,0.2,-0.03,-0.35);put(S(0.13,0.8,0.9,1.1),bel,B,0,0.17,0.04,-0.35);
  [-1,1].forEach(s=>{put(S(0.12,0.75,1,1.3),fur,B,0.1*s,0.13,-0.08);put(S(0.045,0.8,0.45,2.4),fur,R,0.1*s,0.025,0.02);
    put(Y(0.022,0.018,0.2,5),fur,B,0.055*s,0.1,0.17);put(S(0.025,1,0.6,1.4),fur,B,0.055*s,0.01,0.18);});
  const T=node('Tail',B,0,0.18,-0.27);put(S(0.05),wh,T);
  const H=node('Head',B,0,0.37,0.17);put(S(0.1,0.95,0.95,1.2),fur,H);put(S(0.055,1,0.85,1),bel,H,0,-0.035,0.09);put(S(0.016),ns,H,0,-0.01,0.14);eyes(H,0.065,0.02,0.05,0.021,0x3a2410);
  [-1,1].forEach(s=>{const E=node(s<0?'EarL':'EarR',H,0.035*s,0.07,-0.03,-0.25,0,-0.12*s);put(S(0.035,0.8,3.6,0.35),fur,E,0,0.12,0);put(S(0.028,0.8,1.6,0.38),dk,E,0,0.225,0);});return k.top;},
 idle(r,t){r.__t=t;breath(r,0.015);r.Head.position.y+=0.004*sn(t,16);r.Head.rotation.y+=0.2*sn(t,1);
  r.EarL.rotation.x+=0.15*sn(t,1);r.EarR.rotation.x+=0.15*sn(t,1,1.5);r.EarR.rotation.z-=0.35*bump(t,2.5,0.25);blink(r,0.9*bump(t,1.8,0.07));},
 act(r,at,p){const c=0.8*arc(seg(p,0,0.28))+0.6*arc(seg(p,0.72,1)),a=arc(seg(p,0.25,0.72)),q=seg(p,0.25,0.72);
  r.Root.position.y+=0.3*a;r.Body.scale.y-=0.12*c;r.Body.rotation.x+=0.28*Math.sin(q*TAU);r.EarL.rotation.x-=0.6*a;r.EarR.rotation.x-=0.6*a;r.Tail.position.y+=0.03*a;}},

{id:'fox',n:'Red Fox',da:'Ræv',tags:['Mammals','Night'],where:'Edge of the woods',when:'Dusk',lure:'Scraps from the cabin',size:'70 cm + tail',real:0.9,rarity:'Rare',
 note:'Hunts moles. The lawn stays tidier while it is around.',actName:'Pounce',dur:2,
 build(k){const {node,put,mat,eyes,R}=k;const fur=mat('Fur',0xc65e28),wh=mat('White',0xf0e6d4),dk=mat('Legs',0x2e2420),ns=mat('Nose',0x1a1412),inn=mat('EarInner',0x3a2a22);
  const B=node('Body',R,0,0.34,0);put(S(0.18,0.85,0.85,1.7),fur,B);put(S(0.11,0.9,1,0.8),wh,B,0,-0.05,0.2);
  const N=node('Neck',B,0,0.06,0.24,0.5);put(Y(0.07,0.09,0.16,7),fur,N,0,0.07,0);
  const H=node('Head',N,0,0.17,0,-0.5);put(S(0.11,1.1,0.9,1),fur,H);put(C(0.06,0.18,6),fur,H,0,-0.03,0.14,PI/2);
  [-1,1].forEach(s=>put(S(0.065,1,0.7,1),wh,H,0.055*s,-0.045,0.06));put(S(0.02),ns,H,0,-0.02,0.23);eyes(H,0.055,0.03,0.085,0.02,0x3a2410);
  [-1,1].forEach(s=>{const E=node(s<0?'EarL':'EarR',H,0.065*s,0.1,-0.02,0,0,-0.2*s);put(C(0.05,0.13,4),fur,E,0,0.06,0,0,PI/4);put(C(0.03,0.08,4),inn,E,0,0.05,0.014,0,PI/4);});
  [['FL',-1,1],['FR',1,1],['BL',-1,-1],['BR',1,-1]].forEach(([n,sx,sz])=>{const L=node('Leg'+n,R,0.07*sx,0.26,0.19*sz);put(S(0.05,0.8,1.4,0.9),fur,L);
    put(Y(0.028,0.022,0.24,6),dk,L,0,-0.12,0);put(S(0.028,1,0.6,1.3),dk,L,0,-0.24,0.01);});
  const T=node('Tail',B,0,0.06,-0.28,-2.1);put(S(0.08,0.9,2.3,0.9),fur,T,0,0.17,0);put(S(0.06,1,1.3,1),wh,T,0,0.35,0);return k.top;},
 idle(r,t){r.__t=t;breath(r,0.015);r.Tail.rotation.z+=0.25*sn(t,1);r.Tail.rotation.x+=0.08*sn(t,2);r.Head.rotation.y+=0.3*sn(t,1,0.5);r.Head.rotation.z+=0.12*sn(t,1,2);
  r.EarL.rotation.x-=0.4*bump(t,0.9,0.08);r.EarR.rotation.x-=0.4*bump(t,2.9,0.08);blink(r,0.9*bump(t,2,0.07));},
 act(r,at,p){const cr=sm(0,0.3,p)*(1-sm(0.35,0.45,p)),a=arc(seg(p,0.38,0.75)),q=seg(p,0.38,0.75),ld=arc(seg(p,0.72,1));
  r.Body.position.y-=0.07*cr+0.05*ld;r.Head.rotation.z+=0.35*cr;r.Head.rotation.x+=0.2*cr;
  r.Root.position.y+=0.42*a;r.Root.position.z+=0.22*sm(0.38,0.75,p)*(1-sm(0.8,1,p));r.Root.rotation.x+=0.9*Math.sin(q*PI)*q;
  r.LegFL.rotation.x-=0.7*a;r.LegFR.rotation.x-=0.7*a;r.LegBL.rotation.x+=0.7*a;r.LegBR.rotation.x+=0.7*a;r.Tail.rotation.x+=0.8*a;}},

{id:'deer',n:'Roe Deer',da:'Rådyr',tags:['Mammals'],where:'Meadow edge',when:'Dawn & dusk',lure:'Fallen apples',size:'110 cm',real:1.1,rarity:'Rare',
 note:'Shy. Walk slowly, or it is gone.',actName:'Graze',dur:5,
 build(k){const {node,put,mat,eyes,R}=k;const fur=mat('Fur',0xa4643a),lt=mat('Belly',0xdcb88c),wh=mat('Rump',0xf0e8da),dk=mat('Nose',0x2a2018),hf=mat('Hoof',0x3a3028),an=mat('Antler',0xd8c8a8);
  const B=node('Body',R,0,0.62,0);put(S(0.2,0.9,0.9,1.75),fur,B);put(S(0.16,0.85,0.6,1.5),lt,B,0,-0.07,0);put(S(0.1,1,1.1,0.5),wh,B,0,0.03,-0.32);
  const T=node('Tail',B,0,0.1,-0.36);put(S(0.03,1,1.4,0.8),wh,T);
  const N=node('Neck',B,0,0.08,0.26,0.35);put(Y(0.06,0.09,0.45,7),fur,N,0,0.2,0);
  const H=node('Head',N,0,0.43,0,-0.1);put(S(0.09,0.9,0.9,1.3),fur,H,0,0,0.03);put(S(0.055,0.85,0.8,1.2),lt,H,0,-0.035,0.13);put(S(0.028,1.1,0.8,0.8),dk,H,0,-0.03,0.19);eyes(H,0.06,0.025,0.07,0.02);
  [-1,1].forEach(s=>{const E=node(s<0?'EarL':'EarR',H,0.06*s,0.07,-0.04,0,0,-0.7*s);put(S(0.035,0.6,1.5,0.3),fur,E,0,0.05,0);
    put(Y(0.008,0.013,0.13,5),an,H,0.03*s,0.12,-0.01,0,0,-0.2*s);put(Y(0.006,0.008,0.05,4),an,H,0.04*s,0.14,0.015,0.8,0,0);});
  [['FL',-1,1],['FR',1,1],['BL',-1,-1],['BR',1,-1]].forEach(([n,sx,sz])=>{const L=node('Leg'+n,R,0.09*sx,0.52,0.24*sz);
    put(Y(0.035,0.028,0.28,6),fur,L,0,-0.12,0);put(Y(0.022,0.018,0.24,6),fur,L,0,-0.36,0);put(S(0.025,1,0.8,1.3),hf,L,0,-0.49,0.005);});return k.top;},
 idle(r,t){r.__t=t;breath(r,0.012);r.EarL.rotation.x+=0.5*bump(t,0.8,0.1);r.EarR.rotation.x+=0.5*bump(t,2.6,0.1);r.EarL.rotation.y+=0.2*sn(t,1);r.EarR.rotation.y-=0.2*sn(t,1,1);
  r.Tail.rotation.x-=0.7*bump(t,1.7,0.08);r.Head.rotation.y+=0.2*sn(t,1);r.Neck.rotation.x+=0.05*sn(t,1,1);blink(r,0.9*bump(t,3.3,0.07));},
 act(r,at,p){const g=sm(0,0.25,p)*(1-sm(0.8,1,p)),ch=sm(0.25,0.3,p)*(1-sm(0.75,0.8,p));
  r.Neck.rotation.x+=2.05*g;r.Head.rotation.x+=-0.7*g+0.07*Math.sin(at*14)*ch;r.Body.rotation.x+=0.15*g;r.Body.position.y-=0.02*g;
  r.EarL.rotation.x-=0.4*bump(at%IDLE,2.4,0.12)*ch;}},

{id:'frog',n:'Common Frog',da:'Butsnudet frø',tags:['Pond'],where:'Pond edge',when:'Evenings · spring rain',lure:'A garden pond',size:'8 cm',real:0.08,rarity:'Common',
 note:'Croaks louder right before it rains.',actName:'Hop',dur:1.1,
 build(k){const {node,put,mat,R}=k;const sk=mat('Skin',0x6e9a3c),dk=mat('Spots',0x3e5a24),bl=mat('Belly',0xe2dc9e),ir=mat('Iris',0xc8a03a,{r:0.3,smooth:1}),pu=mat('Pupil',0x141210,{r:0.2,smooth:1}),sh=mat('Shine',0xffffff,{smooth:1});
  const B=node('Body',R);put(S(0.14,1.1,0.72,1.25),sk,B,0,0.1,-0.01,-0.35);
  [[0.05,0.18,-0.04],[-0.06,0.16,-0.08],[0,0.14,-0.13],[-0.03,0.2,0.02],[0.07,0.13,-0.1]].forEach(q=>put(S(0.025,1,0.4,1),dk,B,...q));
  put(S(0.11,1,0.6,1.1),bl,B,0,0.06,0.03,-0.35);put(S(0.11,1.3,0.6,1.05),sk,B,0,0.14,0.1);
  const Th=node('Throat',B,0,0.09,0.15);put(S(0.06,1.3,0.7,0.9),bl,Th);
  [-1,1].forEach(s=>{const E=node(s<0?'EyeL':'EyeR',B,0.075*s,0.2,0.11);put(S(0.045),sk,E);put(S(0.036),ir,E,0.008*s,0.008,0.018);put(S(0.022,1.4,0.7,0.6),pu,E,0.012*s,0.01,0.05);put(S(0.008,1,1,1,6,4),sh,E,0.02*s,0.022,0.055);
    put(Y(0.018,0.016,0.1,5),sk,B,0.08*s,0.05,0.13,0,0,0.2*s);put(S(0.03,1.4,0.3,1.4),sk,B,0.09*s,0.01,0.16);
    const L=node(s<0?'LegL':'LegR',B,0.1*s,0.07,-0.07);put(S(0.075,0.65,0.6,1.35),sk,L,0.02*s,0,0.02);put(S(0.04,0.5,0.45,1.5),dk,L,0.05*s,-0.03,0.07);put(S(0.035,1.4,0.25,2.4),sk,L,0.05*s,-0.055,0.1);});return k.top;},
 idle(r,t){r.__t=t;breath(r,0.02,3);const c=bump(t,1,0.15)+bump(t,1.4,0.15)+bump(t,3,0.18);r.Throat.scale.x+=0.4*c;r.Throat.scale.y+=0.5*c;r.Throat.scale.z+=0.3*c;blink(r,0.8*bump(t,2.2,0.08));},
 act(r,at,p){const c=0.8*arc(seg(p,0,0.3))+0.6*arc(seg(p,0.72,1)),a=arc(seg(p,0.25,0.75));r.Root.position.y+=0.3*a;r.Body.scale.y-=0.15*c;r.Body.rotation.x-=0.35*a;
  r.LegL.rotation.x+=1.1*a;r.LegR.rotation.x+=1.1*a;r.LegL.scale.z+=0.5*a;r.LegR.scale.z+=0.5*a;}},

{id:'greattit',n:'Great Tit',da:'Musvit',tags:['Birds'],where:'Bird feeder',when:'Day · all year',lure:'Sunflower seeds',size:'14 cm',real:0.14,rarity:'Common',
 note:'First guest at any feeder.',actName:'Peck',dur:1.6,
 build(k){return bird(k,{back:0x7a8a4a,head:0x26262a,cheek:0xf2efe6,breast:0xe6c43a,belly:0xe8d27a,wing:0x6a7a92,tail:0x4e5a70,beak:0x2a2a2e,leg:0x6a6a74,face:'tit',stripe:1});},
 idle:birdIdle,
 act(r,at,p){const g=env(p,0.15,0.85),q=seg(p,0.2,0.8),pk=q>0&&q<1?Math.max(0,Math.sin(q*PI*6)):0;r.Body.rotation.x+=0.55*g+0.35*pk;r.Head.rotation.x+=0.35*g;r.Tail.rotation.x+=0.4*g;
  const f=arc(seg(p,0.82,1));r.WingL.rotation.z-=0.8*f;r.WingR.rotation.z+=0.8*f;}},

{id:'robin',n:'Robin',da:'Rødhals',tags:['Birds'],where:'Freshly dug soil',when:'Day · stays through winter',lure:'Dig a new bed',size:'14 cm',real:0.14,rarity:'Common',
 note:'Follows you around when you dig.',actName:'Sing',dur:2.4,
 build(k){return bird(k,{back:0x7a6448,head:0x7a6448,cheek:0xd8703a,breast:0xd8703a,belly:0xefe6d8,wing:0x6a5640,tail:0x5e4a36,beak:0x2e2620,leg:0x7a5a48,face:'robin'});},
 idle:birdIdle,
 act(r,at,p){const g=env(p,0.15,0.85);r.Head.rotation.x-=0.55*g;r.Jaw.rotation.x+=0.4*g*(0.5+0.5*Math.sin(at*18));r.Body.scale.x+=0.05*g;r.Body.scale.z+=0.04*g;r.Body.rotation.x-=0.1*g;
  r.WingL.rotation.z-=0.12*g;r.WingR.rotation.z+=0.12*g;}},

{id:'owl',n:'Tawny Owl',da:'Natugle',tags:['Birds','Night'],where:'Old trees',when:'Night',lure:'An owl box',size:'38 cm',real:0.38,rarity:'Rare',
 note:'Turns its head the moment you look away.',actName:'Look',dur:3.2,
 build(k){const {node,put,mat,eyes,R}=k;const br=mat('Feather',0x8a6846),db=mat('Wing',0x5e4630),ds=mat('Disc',0xcaa87a),bl=mat('Belly',0xd6c09a),bk=mat('Beak',0x9a8a5a,{r:0.5}),ta=mat('Talon',0xa89a70);
  const B=node('Body',R);put(S(0.19,1,1.3,0.95),br,B,0,0.27,0);put(S(0.15,0.9,1.15,0.6),bl,B,0,0.24,0.08);
  [[0.04,0.3],[-0.05,0.26],[0.02,0.2],[-0.02,0.34],[0.06,0.22],[-0.07,0.32]].forEach(([x,y])=>put(S(0.014,0.6,1.8,0.4),db,B,x,y,0.165));
  const H=node('Head',B,0,0.5,0.01);put(S(0.16,1.1,0.95,0.95),br,H);[-1,1].forEach(s=>put(S(0.075,1,1.15,0.45),ds,H,0.06*s,-0.005,0.11));
  eyes(H,0.06,0.005,0.14,0.038);put(S(0.03,2.2,0.5,0.6),db,H,0,0.05,0.13);put(C(0.02,0.06,4),bk,H,0,-0.045,0.15,PI*0.6);
  const Lg=node('Legs',B,0,0.05,0.06);[-1,1].forEach(s=>{const Wn=node(s<0?'WingL':'WingR',B,0.16*s,0.34,-0.01);put(S(0.1,0.32,1.35,1),db,Wn,0,-0.05,-0.01);put(S(0.035,1.1,0.5,1.2),ta,Lg,0.07*s,-0.03,0.01);});return k.top;},
 idle(r,t){r.__t=t;breath(r,0.015);blink(r,0.9*(bump(t,1.2,0.15)+bump(t,3.4,0.15)));r.Head.rotation.y+=0.12*sn(t,1);r.Body.rotation.z+=0.03*sn(t,1);},
 act(r,at,p){const y=sm(0.05,0.3,p)-sm(0.6,0.9,p);r.Head.rotation.y+=2.6*y;r.Head.rotation.z+=0.25*y*sm(0.3,0.45,p);blink(r,0.9*arc(seg(p,0.42,0.52)));}},

{id:'butterfly',n:'Peacock Butterfly',da:'Dagpåfugleøje',tags:['Insects'],where:'Flower beds',when:'Sunny days · summer',lure:'Nectar flowers',size:'6 cm wingspan',real:0.06,rarity:'Common',
 note:'Flashes its eyespots when startled.',actName:'Flight',dur:4,
 build(k){const {node,put,mat,R}=k;const dk=mat('Body',0x2a2420),wg=mat('Wing',0xa8322a,{ds:1}),ed=mat('WingEdge',0x3a2a26,{ds:1}),ye=mat('SpotYellow',0xe8c060,{ds:1}),bu=mat('SpotBlue',0x3a4a9a,{ds:1}),bk=mat('SpotBlack',0x141210,{ds:1});
  const B=node('Body',R,0,0.35,0);put(Y(0.011,0.007,0.12,6),dk,B,0,0,-0.01,PI/2);put(S(0.015),dk,B,0,0.002,0.058);
  [-1,1].forEach(s=>{const A=node(s<0?'AntL':'AntR',B,0.006*s,0.008,0.06,0.9,0,-0.3*s);put(Y(0.0015,0.0015,0.07,3),dk,A,0,0.035,0);put(S(0.004,1,1,1,6,4),dk,A,0,0.07,0);
    const Wn=node(s<0?'WingL':'WingR',B,0.004*s,0.004,0);
    const fw=[[0,0.02],[0.07,0.075],[0.15,0.085],[0.17,0.05],[0.12,0],[0.02,-0.01]],hw=[[0.01,0],[0.1,-0.02],[0.12,-0.06],[0.08,-0.1],[0.03,-0.07],[0,-0.03]];
    put(wingShape(fw,s),wg,Wn);put(wingShape(hw,s),wg,Wn);const e1=wingShape(fw,s),e2=wingShape(hw,s);e1.scale(1.07,1,1.07);e2.scale(1.07,1,1.07);put(e1,ed,Wn,0,-0.001,0);put(e2,ed,Wn,0,-0.001,0);
    put(disc(0.026),ye,Wn,0.125*s,0.0012,0.055);put(disc(0.016),bu,Wn,0.125*s,0.0018,0.055);put(disc(0.007,1,1,8),bk,Wn,0.125*s,0.0024,0.055);
    put(disc(0.02),bk,Wn,0.08*s,0.0012,-0.06);put(disc(0.011),bu,Wn,0.08*s,0.0018,-0.06);});return k.top;},
 idle(r,t){const f=0.15+0.95*(0.5+0.5*sn(t,12));r.WingR.rotation.z+=f;r.WingL.rotation.z-=f;r.Body.position.y+=0.02*sn(t,12,1.5)+0.03*sn(t,1);r.Body.position.x+=0.02*sn(t,1,1);
  r.Body.rotation.x-=0.15;r.AntL.rotation.x+=0.1*sn(t,2);r.AntR.rotation.x+=0.1*sn(t,2,1);},
 act(r,at,p){const e=env(p,0.1,0.9),a=TAU*p;r.Root.position.x+=0.2*Math.sin(a);r.Root.position.z+=0.12*Math.sin(2*a);r.Root.position.y+=0.1*Math.sin(a)*e;
  r.Root.rotation.y+=0.8*Math.cos(a)*e;const f=0.5*Math.sin(at*TAU*5)*e;r.WingR.rotation.z+=f;r.WingL.rotation.z-=f;}},

{id:'dragonfly',n:'Emperor Dragonfly',da:'Kejserguldsmed',tags:['Insects','Pond'],where:'Pond and reeds',when:'Warm afternoons',lure:'Reeds by the water',size:'8 cm',real:0.08,rarity:'Uncommon',
 note:'Hovers, then gone in a blink.',actName:'Dart',dur:1.6,
 build(k){const {node,put,mat,R}=k;const gr=mat('Thorax',0x4a8a5a,{r:0.5}),bl=mat('Abdomen',0x3a8aa8,{r:0.4,m:0.2}),dk=mat('Rings',0x1e2a2e),ey=mat('Eye',0x2e6a8a,{r:0.2,smooth:1}),wg=mat('Wing',0xe4f0f0,{op:0.38,ds:1,r:0.2,m:0.2});
  const B=node('Body',R,0,0.38,0);put(S(0.028,1,1.05,1.5),gr,B);const Ab=node('Abdomen',B,0,0,-0.035);put(Y(0.011,0.013,0.26,6),bl,Ab,0,0,-0.13,PI/2);
  for(let i=0;i<5;i++)put(Y(0.0138,0.0138,0.008,6),dk,Ab,0,0,-0.03-0.045*i,PI/2);
  put(S(0.022,1.3,1,1),gr,B,0,0.004,0.045);[-1,1].forEach(s=>{put(S(0.019),ey,B,0.017*s,0.012,0.052);
    [['F',0.018],['B',-0.012]].forEach(([n,z])=>{const Wn=node('Wing'+n+(s<0?'L':'R'),B,0.008*s,0.022,z,0,n==='F'?-0.1*s:0.1*s);const g=disc(0.075,1,0.17);g.translate(0.075*s,0,0);put(g,wg,Wn);});});return k.top;},
 idle(r,t){const f=0.35*sn(t,32),h=0.35*sn(t,32,1.6);r.WingFR.rotation.z+=f;r.WingFL.rotation.z-=f;r.WingBR.rotation.z+=h;r.WingBL.rotation.z-=h;
  r.Body.position.y+=0.015*sn(t,4);r.Abdomen.rotation.x+=0.05*sn(t,2);r.Root.rotation.y+=0.15*sn(t,1);},
 act(r,at,p){const m=sm(0.05,0.2,p)-sm(0.55,0.72,p),b=arc(seg(p,0.05,0.2))-arc(seg(p,0.55,0.72));r.Root.position.x+=0.22*m;r.Root.position.y+=0.06*m;r.Root.rotation.z-=0.4*b;r.Root.rotation.y+=0.3*m;}},

{id:'bumblebee',n:'Bumblebee',da:'Humlebi',tags:['Insects'],where:'Flowers',when:'Day · spring to late summer',lure:'Flowers or a bee hotel',size:'2 cm',real:0.025,rarity:'Common',
 note:'Pollinates. Crossbreeding goes faster when it visits.',actName:'Loop',dur:3,
 build(k){const {node,put,mat,R}=k;const bk=mat('Black',0x2a2622),ye=mat('Yellow',0xe8b830),wh=mat('Tail',0xf2ece0),po=mat('Pollen',0xe8a030),sh=mat('Eye',0x0e0c0a,{r:0.15,smooth:1}),wg=mat('Wing',0xe8eef0,{op:0.4,ds:1,r:0.2});
  const B=node('Body',R,0,0.3,0);put(S(0.062,1,0.95,1.15),bk,B,0,-0.005,-0.045);put(S(0.064,1.01,0.96,0.42),ye,B,0,-0.005,-0.035);put(S(0.045,1,1,0.9),wh,B,0,-0.01,-0.1);
  put(S(0.048),bk,B,0,0.005,0.03);put(S(0.05,1.01,1.01,0.45),ye,B,0,0.006,0.045);put(S(0.028,1.1,1,0.9),bk,B,0,-0.005,0.08);
  [-1,1].forEach(s=>{put(S(0.008),sh,B,0.02*s,0,0.095);put(Y(0.002,0.002,0.04,3),bk,B,0.01*s,0.02,0.1,0.8,0,-0.3*s);
    [0.035,0,-0.035].forEach((z,i)=>put(Y(0.004,0.003,0.045,3),bk,B,0.03*s,-0.045,z,0,0,0.4*s));put(S(0.013),po,B,0.04*s,-0.06,-0.035);
    const Wn=node(s<0?'WingL':'WingR',B,0.018*s,0.045,0.03,0,0.4*s);const g=disc(0.045,1,0.45,10);g.translate(0.04*s,0,-0.01);put(g,wg,Wn);});return k.top;},
 idle(r,t){const f=0.6*sn(t,36);r.WingR.rotation.z+=f;r.WingL.rotation.z-=f;r.Body.position.y+=0.02*sn(t,6);r.Body.rotation.z+=0.08*sn(t,5);r.Body.rotation.x+=0.05*sn(t,3,1);},
 act(r,at,p){const a=TAU*p,e=env(p,0.08,0.92),R0=0.12;r.Root.position.x+=R0*Math.sin(a);r.Root.position.z+=-R0*(1-Math.cos(a));r.Root.position.y+=0.04*Math.sin(2*a);
  r.Root.rotation.y+=(PI/2+a)*e;}},

{id:'raven',n:'Raven',da:'Ravn',tags:['Birds'],where:'Cliff ledges',when:'Day · all year',lure:'Shiny things',size:'64 cm',real:0.64,rarity:'Uncommon',
 note:'Remembers faces. Brings trinkets back if you feed it.',actName:'Caw',dur:2,
 build(k){return bird(k,{back:0x22222a,head:0x1c1c22,cheek:0x26262e,breast:0x24242c,belly:0x2a2a32,wing:0x1a1a22,tail:0x1a1a20,beak:0x141418,leg:0x1e1e24,face:'robin',bl:1.7,bw:1.4,tl:1.5});},
 idle:birdIdle,
 act(r,at,p){const g=env(p,0.15,0.85),c=Math.max(0,Math.sin(at*9))*g;r.Head.rotation.x+=0.25*g;r.Jaw.rotation.x+=0.7*c;r.Body.scale.y+=0.06*c;r.Body.rotation.x+=0.2*g;
  r.WingL.rotation.z-=0.25*c;r.WingR.rotation.z+=0.25*c;r.Tail.rotation.x-=0.3*c;}},

{id:'marten',n:'Beech Marten',da:'Stenmår',tags:['Mammals','Night'],where:'Cliffs and old stone walls',when:'Night',lure:'Eggs',size:'45 cm + tail',real:0.7,rarity:'Rare',
 note:'Climbs anything. Keep the henhouse shut.',actName:'Rear up',dur:2.4,
 build(k){const {node,put,mat,eyes,R}=k;const fur=mat('Fur',0x6a4a34),bib=mat('Bib',0xf0ebe0),dk=mat('Legs',0x3e2a1e),ns=mat('Nose',0x1a1412);
  const B=node('Body',R,0,0.16,0);put(S(0.1,0.8,0.75,2.2),fur,B);put(S(0.07,0.9,0.9,0.9),bib,B,0,-0.02,0.16);
  const N=node('Neck',B,0,0.03,0.2,0.6);put(Y(0.045,0.055,0.1,6),fur,N,0,0.05,0);put(S(0.042,1,1.2,0.8),bib,N,0,0.03,0.03);
  const H=node('Head',N,0,0.1,0,-0.6);put(S(0.07,1,0.85,1.1),fur,H);put(C(0.04,0.09,6),fur,H,0,-0.015,0.08,PI/2);put(S(0.012),ns,H,0,-0.012,0.125);eyes(H,0.035,0.02,0.05,0.013);
  [-1,1].forEach(s=>{const E=node(s<0?'EarL':'EarR',H,0.045*s,0.055,-0.01);put(S(0.026,1,1,0.5),fur,E);put(S(0.016,1,1,0.4),bib,E,0,0,0.006);});
  [['FL',-1,1],['FR',1,1],['BL',-1,-1],['BR',1,-1]].forEach(([n,sx,sz])=>{const L=node('Leg'+n,R,0.05*sx,0.12,0.12*sz);put(S(0.035,0.9,1.2,1),fur,L);put(Y(0.02,0.017,0.11,5),dk,L,0,-0.06,0);put(S(0.022,1,0.5,1.3),dk,L,0,-0.112,0.008);});
  const T=node('Tail',B,0,0.02,-0.2,-2.0);put(S(0.05,0.9,3,0.9),fur,T,0,0.14,0);return k.top;},
 idle(r,t){r.__t=t;breath(r,0.015);r.Head.rotation.y+=0.35*Math.tanh(3*sn(t,1));r.Neck.rotation.x+=0.08*sn(t,2,1);r.Tail.rotation.z+=0.3*sn(t,1,0.5);
  r.EarL.rotation.x-=0.4*bump(t,1.4,0.08);r.EarR.rotation.x-=0.4*bump(t,3.1,0.08);blink(r,0.9*bump(t,2.2,0.07));},
 act(r,at,p){const e=env(p,0.25,0.75);r.Root.rotation.x-=0.95*e;r.Root.position.y+=0.1*e;r.Neck.rotation.x+=0.3*e;r.Head.rotation.x+=0.5*e;r.Head.rotation.y+=0.4*Math.sin(at*3)*e;
  r.LegFL.rotation.x-=0.5*e;r.LegFR.rotation.x-=0.5*e;r.LegBL.rotation.x-=0.9*e;r.LegBR.rotation.x-=0.9*e;r.Tail.rotation.x+=0.6*e;}},

{id:'bat',n:'Pipistrelle',da:'Dværgflagermus',tags:['Mammals','Night'],where:'Caves',when:'Dusk',lure:'Moths near a lamp',size:'20 cm wingspan',real:0.2,rarity:'Common',
 note:'Streams out of the caves at dusk.',actName:'Swoop',dur:2,
 build(k){const {node,put,mat,eyes,R}=k;const fur=mat('Fur',0x5a4232),mb=mat('Membrane',0x3a2a24,{ds:1}),dk=mat('Ear',0x2e221c);
  const B=node('Body',R,0,0.3,0);put(S(0.035,1,0.9,1.5),fur,B);
  const H=node('Head',B,0,0.01,0.055);put(S(0.028),fur,H);put(C(0.012,0.03,5),fur,H,0,-0.004,0.03,PI/2);eyes(H,0.014,0.008,0.022,0.006);
  [-1,1].forEach(s=>{const E=node(s<0?'EarL':'EarR',H,0.016*s,0.024,0,0,0,-0.35*s);put(C(0.013,0.04,4),dk,E,0,0.018,0);
    const Wn=node(s<0?'WingL':'WingR',B,0.02*s,0.01,0);put(wingShape([[0,0.03],[0.06,0.045],[0.13,0.04],[0.17,0.01],[0.14,-0.02],[0.12,-0.005],[0.095,-0.04],[0.065,-0.02],[0.035,-0.045],[0,-0.035]],s),mb,Wn);});
  return k.top;},
 idle(r,t){const f=0.15+0.75*sn(t,5);r.WingR.rotation.z+=f;r.WingL.rotation.z-=f;r.Body.position.y+=0.02*sn(t,5,1.6)+0.02*sn(t,1);r.Body.rotation.x+=0.1*sn(t,5,2);
  r.EarL.rotation.z-=0.2*bump(t,1.3,0.1);r.EarR.rotation.z+=0.2*bump(t,1.3,0.1);blink(r,0.9*bump(t,3,0.07));},
 act(r,at,p){const a=TAU*p,e=env(p,0.1,0.9);r.Root.position.z+=0.18*Math.sin(a);r.Root.position.y-=0.12*Math.sin(PI*p);r.Body.rotation.x+=0.7*Math.cos(a)*e;
  const f=0.4*Math.sin(at*TAU*4)*e;r.WingR.rotation.z+=f;r.WingL.rotation.z-=f;}},

{id:'mallard',n:'Mallard',da:'Gråand',tags:['Birds','Pond'],where:'Lake and pond',when:'Day · all year',lure:'Oats (not bread)',size:'58 cm',real:0.58,rarity:'Common',
 note:'Follows the boat if you row slowly.',actName:'Flap',dur:2,
 build(k){return water(k,{body:0xa8a098,wing:0x8a7e70,spec:0x3a4a9a,head:0x2e6a3e,neck:0x2e6a3e,ring:0xf0ece4,breast:0x7a4a34,bill:0xd8b83a,tail:0x2a2a2a,feet:0xe08a3a,nw:1,nl:0.07,nl2:0.03,n1:0.1,n2:0,hd:-0.1});},
 idle:waterIdle,act:waterFlap},

{id:'swan',n:'Mute Swan',da:'Knopsvane',tags:['Birds','Pond'],where:'Lake',when:'Day · all year',lure:'Leave it be',size:'150 cm',real:1.5,rarity:'Rare',
 note:'Hisses if you get close to the nest.',actName:'Flap',dur:3,
 build(k){return water(k,{body:0xf4f2ec,wing:0xeeebe2,head:0xf4f2ec,neck:0xf4f2ec,bill:0xe07a3a,knob:0x1a1a1a,tail:0xeeebe2,feet:0x2a2a2a,nw:1.1,nl:0.18,nl2:0.16,n1:-0.15,n2:0.5,hd:-0.35});},
 idle:waterIdle,act:waterFlap},

{id:'kingfisher',n:'Kingfisher',da:'Isfugl',tags:['Birds','Pond'],where:'Stream and lake edge',when:'Morning',lure:'Clear water with fish',size:'17 cm',real:0.17,rarity:'Rare',
 note:'A flash of blue means fish nearby.',actName:'Dive',dur:1.6,
 build(k){return bird(k,{back:0x2a8ab0,head:0x2a6a98,cheek:0xe0803a,breast:0xe0803a,belly:0xe8904a,wing:0x2a6a98,tail:0x2a8ab0,beak:0x1e1e22,leg:0xd8603a,face:'robin',bl:2.3,tl:0.55,stripe:0});},
 idle:birdIdle,
 act(r,at,p){const d=arc(seg(p,0.2,0.75)),e=env(p,0.1,0.9);r.Body.rotation.x+=1.2*e;r.Head.rotation.x+=0.2*e;r.Root.position.y-=0.08*d;r.Root.position.z+=0.2*d;r.Legs.rotation.x+=1.1*e;
  r.WingL.rotation.z-=0.3*e;r.WingR.rotation.z+=0.3*e;}},

{id:'skylark',n:'Skylark',da:'Sanglærke',tags:['Birds'],where:'Meadow',when:'Spring mornings',lure:'Tall grass',size:'18 cm',real:0.18,rarity:'Common',
 note:'Sings while climbing straight up.',actName:'Sing',dur:2.4,
 build(k){return bird(k,{back:0x8a6e4a,head:0x9a7e5a,cheek:0xc8b08a,breast:0xd8c4a0,belly:0xece0c8,wing:0x7a5e40,tail:0x6a5038,beak:0x9a8a6a,leg:0xb89a78,face:'robin',crest:1,tl:1.2});},
 idle:birdIdle,
 act(r,at,p){const g=env(p,0.15,0.85);r.Head.rotation.x-=0.5*g;r.Jaw.rotation.x+=0.4*g*(0.5+0.5*Math.sin(at*22));r.Body.scale.x+=0.05*g;r.Body.rotation.x-=0.1*g;
  const f=0.5*g*(0.5+0.5*Math.sin(at*14));r.WingL.rotation.z-=f;r.WingR.rotation.z+=f;}},

{id:'badger',n:'Badger',da:'Grævling',tags:['Mammals','Night'],where:'Meadow edge and burrows',when:'Night',lure:'Earthworms after rain',size:'80 cm',real:0.8,rarity:'Uncommon',
 note:'Digs up the lawn looking for worms.',actName:'Dig',dur:2.4,
 build(k){const {node,put,mat,eyes,R}=k;const gr=mat('Fur',0x8a8680),dk=mat('Dark',0x2a2826),wh=mat('White',0xf0ece4),ns=mat('Nose',0x141414);
  const B=node('Body',R,0,0.17,0);put(S(0.17,1,0.72,1.45),gr,B);put(S(0.14,0.95,0.5,1.3),dk,B,0,-0.06,0);
  const H=node('Head',B,0,0.02,0.24);put(S(0.08,1,0.85,1.3),wh,H);put(C(0.05,0.12,6),wh,H,0,-0.01,0.1,PI/2);
  [-1,1].forEach(s=>{put(S(0.026,0.6,0.7,2.4),dk,H,0.036*s,0.014,0.04);const E=node(s<0?'EarL':'EarR',H,0.06*s,0.045,-0.05);put(S(0.022,1,1,0.5),wh,E);});
  eyes(H,0.042,0.022,0.075,0.011);put(S(0.017),ns,H,0,-0.01,0.16);
  [['FL',-1,1],['FR',1,1],['BL',-1,-1],['BR',1,-1]].forEach(([n,sx,sz])=>{const L=node('Leg'+n,R,0.1*sx,0.1,0.14*sz);put(Y(0.035,0.03,0.08,6),dk,L,0,-0.04,0);put(S(0.035,1,0.5,1.3),dk,L,0,-0.09,0.01);});
  const T=node('Tail',B,0,0.03,-0.24,-0.4);put(S(0.035,0.9,0.7,1.6),gr,T,0,0,-0.03);return k.top;},
 idle(r,t){r.__t=t;breath(r,0.015);const sf=bump(t,2,0.8);r.Head.rotation.x+=0.15*sf;r.Head.position.z+=0.008*sn(t,12)*sf;r.Head.rotation.y+=0.2*sn(t,1);blink(r,0.9*bump(t,3.2,0.07));},
 act(r,at,p){const e=env(p,0.15,0.85),s=Math.sin(at*18);r.LegFL.rotation.x+=0.8*s*e;r.LegFR.rotation.x-=0.8*s*e;r.Body.rotation.x+=0.2*e;r.Head.rotation.x+=0.35*e;r.Head.position.y-=0.03*e;r.Tail.rotation.x-=0.3*e;}},
];

// ---- locomotion loops (in place). f(rig, phase 0..1, time)
const cyc=(p,o=0)=>Math.sin(TAU*(p+o));
const OFF={walk:{BL:0,FL:0.25,BR:0.5,FR:0.75},trot:{FL:0,BR:0,FR:0.5,BL:0.5},run:{FL:0,FR:0.1,BL:0.5,BR:0.6}};
const legs=(r,p,o,amp)=>{for(const k in o){const L=r['Leg'+k];if(L)L.rotation.x+=amp*cyc(p,o[k]);}};
const feet=(r,p,o,len,lift)=>{for(const k in o){const L=r['Leg'+k];if(!L)continue;L.position.z+=len*cyc(p,o[k]);L.position.y+=lift*Math.max(0,Math.cos(TAU*(p+o[k])));}};
const hop=(r,p,h,sq)=>{const a=arc(seg(p,0.18,0.82)),c=arc(seg(p,0,0.18))+arc(seg(p,0.82,1));r.Root.position.y+=h*a;r.Body.scale.y-=sq*c;r.Body.scale.x+=sq*0.5*c;return a;};
const flap=(r,p,spread,amp,a='WingL',b='WingR')=>{const f=spread+amp*cyc(p);r[b].rotation.z+=f;r[a].rotation.z-=f;};
const birdMoves={
 Hop:{dur:0.55,f(r,p){const a=hop(r,p,0.05,0.08);r.Body.rotation.x+=0.12*a;r.Tail.rotation.x+=0.35*a;r.Legs.rotation.x+=0.4*a;r.Head.rotation.x-=0.1*a;flap(r,p,0.15*a,0);}},
 Fly:{dur:0.3,f(r,p){r.Root.position.y+=0.18+0.015*cyc(p,0.3);r.Body.rotation.x+=0.75;r.Head.rotation.x-=0.6;r.Legs.rotation.x+=1.1;flap(r,p,1.4,0.75);r.Tail.scale.x+=0.4;r.Tail.rotation.x-=0.2;}}};
const MOVES={
 squirrel:{
  Hop:{dur:0.7,f(r,p){const a=hop(r,p,0.12,0.12),s=Math.sin(TAU*p);r.Body.rotation.x+=0.35*s;r.Head.rotation.x-=0.25*s;r.ArmL.rotation.x-=0.6*a;r.ArmR.rotation.x-=0.6*a;
   r.Tail1.rotation.x+=0.2*cyc(p,0.1);r.Tail2.rotation.x+=0.3*cyc(p,0.25);r.Tail3.rotation.x+=0.4*cyc(p,0.4);}},
  Run:{dur:0.38,f(r,p){const a=hop(r,p,0.09,0.15);r.Body.rotation.x+=0.8+0.3*Math.sin(TAU*p);r.Head.rotation.x-=0.7;r.ArmL.rotation.x-=0.9*a+0.3;r.ArmR.rotation.x-=0.9*a+0.3;
   r.Tail1.rotation.x-=0.7;r.Tail2.rotation.x-=0.1+0.25*cyc(p,0.2);r.Tail3.rotation.x+=0.6+0.35*cyc(p,0.4);}}},
 hedgehog:{
  Walk:{dur:0.9,f(r,p){feet(r,p,OFF.walk,0.035,0.02);r.Body.position.y+=0.006*Math.cos(TAU*2*p);r.Body.rotation.z+=0.035*cyc(p);r.Head.rotation.y+=0.08*cyc(p,0.25);r.Head.position.y+=0.004*cyc(2*p);}},
  Run:{dur:0.42,f(r,p){feet(r,p,OFF.trot,0.05,0.03);r.Body.position.y+=0.012*Math.abs(cyc(2*p));r.Body.rotation.x+=0.04*cyc(2*p);r.Head.position.z+=0.015;}}},
 hare:{
  Hop:{dur:0.8,f(r,p){const a=hop(r,p,0.14,0.1),q=seg(p,0.18,0.82);r.Body.rotation.x+=0.25*Math.sin(q*TAU);r.EarL.rotation.x-=0.5*a;r.EarR.rotation.x-=0.5*a;r.Tail.position.y+=0.02*a;}},
  Run:{dur:0.42,f(r,p){const a=hop(r,p,0.16,0.14),q=seg(p,0.18,0.82);r.Body.scale.z+=0.18*a;r.Body.rotation.x+=0.35*Math.sin(q*TAU);r.EarL.rotation.x-=1;r.EarR.rotation.x-=1;r.Head.rotation.x+=0.15;}}},
 fox:{
  Walk:{dur:1,f(r,p){legs(r,p,OFF.walk,0.4);r.Body.position.y+=0.008*Math.cos(TAU*2*p);r.Body.rotation.z+=0.02*cyc(p);r.Neck.rotation.x+=0.05*cyc(2*p);r.Tail.rotation.z+=0.2*cyc(p);r.Tail.rotation.x+=0.3;}},
  Run:{dur:0.48,f(r,p){legs(r,p,OFF.run,0.95);r.Root.position.y+=0.05*Math.max(0,cyc(p,0.15));r.Body.rotation.x+=0.12*cyc(p,0.3);r.Neck.rotation.x+=0.25+0.08*cyc(p);r.Head.rotation.x-=0.15;r.Tail.rotation.x+=0.8+0.1*cyc(p,0.4);r.EarL.rotation.x-=0.4;r.EarR.rotation.x-=0.4;}}},
 deer:{
  Walk:{dur:1.3,f(r,p){legs(r,p,OFF.walk,0.32);r.Body.position.y+=0.01*Math.cos(TAU*2*p);r.Neck.rotation.x+=0.07*cyc(2*p,0.2);r.Head.rotation.x-=0.05*cyc(2*p,0.2);r.Tail.rotation.x+=0.1*cyc(p);}},
  Run:{dur:0.6,f(r,p){legs(r,p,OFF.run,0.9);r.Root.position.y+=0.12*Math.max(0,cyc(p,0.1));r.Body.rotation.x+=0.15*cyc(p,0.35);r.Neck.rotation.x+=0.3+0.1*cyc(p);r.Head.rotation.x-=0.2;r.Tail.rotation.x-=0.9;r.EarL.rotation.x-=0.3;r.EarR.rotation.x-=0.3;}}},
 frog:{Hop:{dur:0.9,f(r,p){const a=hop(r,p,0.14,0.14);r.Body.rotation.x-=0.35*a;r.LegL.rotation.x+=1.1*a;r.LegR.rotation.x+=1.1*a;r.LegL.scale.z+=0.5*a;r.LegR.scale.z+=0.5*a;}}},
 greattit:birdMoves,robin:birdMoves,raven:birdMoves,kingfisher:birdMoves,skylark:birdMoves,
 marten:{
  Walk:{dur:0.8,f(r,p){legs(r,p,OFF.walk,0.45);r.Body.position.y+=0.005*Math.cos(TAU*2*p);r.Body.rotation.z+=0.03*cyc(p);r.Tail.rotation.z+=0.15*cyc(p);r.Neck.rotation.x+=0.05*cyc(2*p);}},
  Run:{dur:0.4,f(r,p){legs(r,p,{FL:0,FR:0.05,BL:0.5,BR:0.55},1);r.Root.position.y+=0.04*Math.max(0,cyc(p,0.1));r.Body.rotation.x+=0.2*cyc(p,0.35);r.Body.scale.z+=0.08*cyc(p,0.1);r.Tail.rotation.x+=0.6+0.15*cyc(p,0.4);r.Head.rotation.x-=0.1*cyc(p,0.35);}}},
 badger:{
  Walk:{dur:1.1,f(r,p){legs(r,p,OFF.walk,0.4);r.Body.position.y+=0.006*Math.cos(TAU*2*p);r.Body.rotation.z+=0.04*cyc(p);r.Head.rotation.y+=0.1*cyc(p);r.Head.rotation.x+=0.12;}},
  Run:{dur:0.5,f(r,p){legs(r,p,OFF.trot,0.75);r.Body.position.y+=0.012*Math.abs(cyc(2*p));r.Body.rotation.x+=0.05*cyc(2*p);r.Body.rotation.z+=0.05*cyc(p);}}},
 bat:{Fly:{dur:0.3,f(r,p){flap(r,p,0.1,0.95);r.Body.position.y+=0.02*cyc(p,0.3);r.Body.rotation.x+=0.35;r.Head.rotation.x-=0.3;}}},
 mallard:{
  Swim:{dur:1.1,f(r,p,t){r.__t=t;r.LegL.rotation.x+=0.7*cyc(p);r.LegR.rotation.x+=0.7*cyc(p,0.5);r.Body.position.y+=0.005*cyc(2*p);r.Body.rotation.z+=0.03*cyc(p);r.Neck.rotation.x+=0.12*cyc(p,0.2);r.Head.rotation.x-=0.08*cyc(p,0.2);r.Tail.rotation.y+=0.12*cyc(p);}},
  Fly:{dur:0.35,f(r,p){r.Root.position.y+=0.25+0.02*cyc(p,0.3);r.Neck.rotation.x+=0.9;r.Head.rotation.x-=0.9;r.WingL.rotation.y+=1.4;r.WingR.rotation.y-=1.4;flap(r,p,0.1,0.8);r.LegL.rotation.x+=1.2;r.LegR.rotation.x+=1.2;}}},
 swan:{
  Swim:{dur:1.8,f(r,p){r.LegL.rotation.x+=0.6*cyc(p);r.LegR.rotation.x+=0.6*cyc(p,0.5);r.Body.position.y+=0.004*cyc(2*p);r.Body.rotation.z+=0.02*cyc(p);r.Neck.rotation.x+=0.05*cyc(p,0.2);r.Neck2.rotation.x-=0.05*cyc(p,0.3);
   r.WingL.rotation.y+=0.2;r.WingR.rotation.y-=0.2;r.WingL.rotation.z-=0.25;r.WingR.rotation.z+=0.25;}},
  Fly:{dur:0.9,f(r,p){r.Root.position.y+=0.35+0.03*cyc(p,0.3);r.Neck.rotation.x+=1.4;r.Neck2.rotation.x-=0.5;r.Head.rotation.x-=0.9;r.WingL.rotation.y+=1.4;r.WingR.rotation.y-=1.4;flap(r,p,0.1,0.6);r.LegL.rotation.x+=1.2;r.LegR.rotation.x+=1.2;}}},
 owl:{Fly:{dur:0.75,f(r,p){r.Root.position.y+=0.35+0.03*cyc(p,0.25);r.Body.rotation.x+=0.55;r.Head.rotation.x-=0.5;r.Legs.rotation.x+=0.9;flap(r,p,1.5,0.6);}}},
 butterfly:{Fly:{dur:0.4,f(r,p){flap(r,p,0.7,0.6);r.Body.position.y+=0.025*cyc(p,0.35);r.Body.rotation.x+=0.1;r.AntL.rotation.x+=0.15;r.AntR.rotation.x+=0.15;}}},
 dragonfly:{
  Hover:{dur:0.25,f(r,p){flap(r,p,0,0.45,'WingFL','WingFR');flap(r,p+0.25,0,0.45,'WingBL','WingBR');r.Body.position.y+=0.006*cyc(p);r.Body.rotation.x-=0.1;r.Abdomen.rotation.x+=0.1;}},
  Fly:{dur:0.2,f(r,p){flap(r,p,0,0.55,'WingFL','WingFR');flap(r,p+0.25,0,0.55,'WingBL','WingBR');r.Body.position.y+=0.004*cyc(p);r.Body.rotation.x+=0.2;r.Abdomen.rotation.x-=0.1;}}},
 bumblebee:{
  Hover:{dur:0.3,f(r,p){flap(r,2*p,0,0.6);r.Body.position.y+=0.01*cyc(p);r.Body.rotation.x-=0.1;}},
  Fly:{dur:0.3,f(r,p){flap(r,3*p,0,0.65);r.Body.rotation.x+=0.25;r.Body.position.y+=0.012*cyc(p);r.Body.rotation.z+=0.06*cyc(p,0.25);}}},
};
ANIMALS.forEach(A=>A.moves=MOVES[A.id]||{});

export function buildAnimal(A){
  const k=kit(A.id);const top=A.build(k);top.name=A.id+'_Model';
  const rig=k.rig,nodes=Object.values(rig);
  const base=nodes.map(o=>[o.position.clone(),o.rotation.clone(),o.scale.clone()]);
  const reset=()=>nodes.forEach((o,i)=>{o.position.copy(base[i][0]);o.rotation.copy(base[i][1]);o.scale.copy(base[i][2]);});
  const pose=(t,a,mv,mt)=>{reset();rig.__t=t;const Mv=mv&&A.moves[mv];if(Mv){Mv.f(rig,(((mt%Mv.dur)+Mv.dur)%Mv.dur)/Mv.dur,mt);return;}rig.__t=0;A.idle(rig,((t%IDLE)+IDLE)%IDLE);if(a!=null&&a>=0)A.act(rig,Math.min(a,A.dur),Math.min(1,a/A.dur));};
  const clips=()=>{const out=[];
    for(const [nm,dur,act] of [['Idle',IDLE,0],[A.actName,A.dur,1],...Object.entries(A.moves).map(([k,m])=>[k,m.dur,k])]){const n=Math.round(dur*30)+1,times=new Float32Array(n);
      const P=nodes.map(()=>new Float32Array(n*3)),Q=nodes.map(()=>new Float32Array(n*4)),Sc=nodes.map(()=>new Float32Array(n*3));
      for(let i=0;i<n;i++){const t=Math.min(dur,i/30);times[i]=t;act===1?pose(t%IDLE,t):act?pose(0,null,act,t):pose(t,null);
        nodes.forEach((o,j)=>{o.position.toArray(P[j],i*3);o.quaternion.toArray(Q[j],i*4);o.scale.toArray(Sc[j],i*3);});}
      const tr=[];nodes.forEach((o,j)=>tr.push(new THREE.VectorKeyframeTrack(o.name+'.position',times,P[j]),new THREE.QuaternionKeyframeTrack(o.name+'.quaternion',times,Q[j]),new THREE.VectorKeyframeTrack(o.name+'.scale',times,Sc[j])));
      out.push(new THREE.AnimationClip(A.id+'_'+nm,dur,tr).optimize());}
    reset();return out;};
  return {top,rig,reset,pose,clips,mats:Object.values(k.M)};
}

export const H={S,C,Y,disc,wingShape,sn,bump,env,arc,seg,cl,sm,cyc,blink,breath,PI,TAU};
