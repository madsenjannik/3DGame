// Mounts — Fjord horse, garden bike, and stable keeper NPC Tidsel-Thora. Same format as animals.js (build/idle/act/moves).
import * as THREE from 'three';
import { H, IDLE } from './animals.js?v=4';
const {S,C,Y,sn,bump,env,arc,seg,sm,cyc,blink,breath,PI,TAU}=H;
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const tube=(a,b,r,s=6)=>{const A=V(...a),d=V(...b).sub(A),L=d.length(),g=new THREE.CylinderGeometry(r,r,L,s);g.translate(0,L/2,0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()));g.translate(A.x,A.y,A.z);return g;};
const BOX=(x,y,z)=>new THREE.BoxGeometry(x,y,z);
const OFF={walk:{BL:0,FL:0.25,BR:0.5,FR:0.75},trot:{FL:0,BR:0,FR:0.5,BL:0.5},gallop:{BL:0,BR:0.1,FL:0.4,FR:0.5}};
const legsK=(r,p,o,amp,kb)=>{for(const k in o){const ph=TAU*(p+o[k]);r['Leg'+k].rotation.x+=amp*Math.sin(ph);r['Shin'+k].rotation.x+=kb*Math.max(0,-Math.cos(ph))*(k[0]==='F'?1:-0.7);}};

const horse=o=>({id:o.id,n:o.n,da:o.da,tags:['Mounts'],where:'Hitching rail inside the track',when:'Walk 1.6 · trot 3.5 · gallop 7 m/s',lure:'Free to ride from the start',size:'1.4 m at withers',real:2.2,rarity:'Mount',
 note:o.note,actName:'Rear',dur:2.4,
 build(k){const {node,put,mat,eyes,R}=k;const fur=mat('Coat',o.coat),dk=mat('Points',o.pts),cr=mat('Mane',o.mane),ns=mat('Muzzle',o.muz),wh=mat('White',0xf4efe4),hf=mat('Hoof',0x2a2420),lt=mat('Leather',0x6a4228),wo=mat('Blanket',0x9a3a2e),me=mat('Metal',0xb8b4a8,{r:0.35,m:0.7});
  const B=node('Body',R,0,1.02,0);put(S(0.3,0.95,1,2.3),fur,B);put(S(0.27,1,1.05,1),fur,B,0,0.02,0.45);put(S(0.29,1,1,1.1),fur,B,0,0.04,-0.45);
  put(BOX(0.02,0.02,1.1),dk,B,0,0.3,-0.05);
  const Nk=node('Neck',B,0,0.12,0.55,0.55);put(Y(0.13,0.2,0.62,8),fur,Nk,0,0.28,0);if(o.trait==='braid'){for(let i=0;i<7;i++)put(S(0.04,1,1.2,0.9),cr,Nk,0,0.1+i*0.08,-0.13+i*0.004);put(BOX(0.04,0.55,0.05),cr,Nk,0,0.35,-0.11);}else{put(BOX(0.07,0.6,0.13),cr,Nk,0,0.33,-0.12);put(BOX(0.075,0.6,0.045),o.stripe?dk:cr,Nk,0,0.35,-0.155);}
  const Hd=node('Head',Nk,0,0.6,0.02,0.1);put(S(0.12,0.9,1,1.9),fur,Hd,0,0,0.12);put(S(0.095,0.95,0.9,1.2),ns,Hd,0,-0.03,0.33);put(BOX(0.09,0.07,0.1),cr,Hd,0,0.1,0.02);if(o.trait==='blaze'){put(BOX(0.05,0.03,0.2),wh,Hd,0,0.085,0.2,0.28);put(S(0.028,1,0.4,1.4),wh,Hd,0,0.03,0.36,0.5);}if(o.trait==='forelock')put(BOX(0.07,0.2,0.04),cr,Hd,0,0.0,0.12,0.5);
  put(new THREE.TorusGeometry(0.098,0.012,4,12),lt,Hd,0,-0.02,0.26);put(new THREE.TorusGeometry(0.02,0.006,4,8),me,Hd,0.1,-0.05,0.3,0,PI/2,0);
  eyes(Hd,0.1,0.05,0.12,0.022);[-1,1].forEach(s=>{const E=node(s<0?'EarL':'EarR',Hd,0.06*s,0.1,0.0,0,0,-0.15*s);put(C(0.035,0.13,4),fur,E,0,0.06,0);});
  [['FL',-1,1],['FR',1,1],['BL',-1,-1],['BR',1,-1]].forEach(([n,sx,sz])=>{const L=node('Leg'+n,R,0.17*sx,0.86,0.5*sz);put(S(0.09,0.9,1.5,1.1),fur,L,0,-0.06,0);put(Y(0.07,0.055,0.38,7),fur,L,0,-0.21,0);
    const Sh=node('Shin'+n,L,0,-0.42,0);put(Y(0.045,0.05,0.34,6),dk,Sh,0,-0.17,0);if(o.trait==='socks')put(Y(0.052,0.058,0.2,7),wh,Sh,0,-0.27,0);put(Y(0.065,0.07,0.08,7),hf,Sh,0,-0.4,0.005);});
  const T=node('Tail',B,0,0.14,-0.68,-2.8);put(S(0.08,0.9,3.4,0.9),cr,T,0,0.27,0);put(S(0.05,0.9,3.6,0.9),dk,T,0,0.28,0);
  const Sd=node('Saddle',B,0,0.27,0.08);put(S(0.31,1.03,0.18,0.62),wo,Sd,0,-0.02,0);put(S(0.18,1.1,0.32,1.25),lt,Sd,0,0.04,0);put(S(0.05,1,1,1),lt,Sd,0,0.07,0.2);
  [-1,1].forEach(s=>{put(Y(0.006,0.006,0.34,3),lt,Sd,0.3*s,-0.17,0);put(new THREE.TorusGeometry(0.04,0.009,4,8),me,Sd,0.3*s,-0.36,0,0,PI/2,0);});return k.top;},
 idle(r,t){r.__t=t;breath(r,0.012);r.Tail.rotation.z+=0.3*Math.sin(t*1.6*PI)*bump(t,1.3,0.6);r.Tail.rotation.x+=0.04*sn(t,1);
  r.EarL.rotation.x-=0.5*bump(t,0.7,0.1);r.EarR.rotation.x-=0.5*bump(t,2.4,0.1);r.EarR.rotation.z+=0.3*bump(t,3.3,0.2);
  r.Neck.rotation.x+=0.06*sn(t,1);r.Head.rotation.y+=0.15*sn(t,1,1);blink(r,0.9*bump(t,2,0.07));},
 act(r,at,p){const e=env(p,0.25,0.75),w=Math.sin(at*8)*e;r.Root.rotation.x-=0.75*e;r.Root.position.y+=0.38*e;r.Root.position.z-=0.35*e;
  r.LegFL.rotation.x-=(0.8+0.25*w)*e;r.LegFR.rotation.x-=(0.8-0.25*w)*e;r.ShinFL.rotation.x+=1.4*e;r.ShinFR.rotation.x+=1.4*e;r.LegBL.rotation.x-=0.7*e;r.LegBR.rotation.x-=0.7*e;
  r.Neck.rotation.x-=0.3*e;r.Head.rotation.x+=0.2*e;r.Tail.rotation.x+=0.5*e;r.EarL.rotation.x-=0.6*e;r.EarR.rotation.x-=0.6*e;},
 moves:{
  Walk:{dur:1.2,f(r,p){legsK(r,p,OFF.walk,0.3,0.5);r.Body.position.y+=0.012*Math.cos(TAU*2*p);r.Neck.rotation.x+=0.07*cyc(2*p,0.1);r.Head.rotation.x-=0.03*cyc(2*p,0.1);r.Tail.rotation.z+=0.1*cyc(p);}},
  Trot:{dur:0.7,f(r,p){legsK(r,p,OFF.trot,0.45,1.1);r.Root.position.y+=0.035*Math.abs(cyc(2*p));r.Neck.rotation.x+=0.04*cyc(2*p);r.Tail.rotation.x+=0.25;r.EarL.rotation.x+=0.1;r.EarR.rotation.x+=0.1;}},
  Gallop:{dur:0.55,f(r,p){legsK(r,p,OFF.gallop,0.85,1.5);r.Root.position.y+=0.1*Math.max(0,cyc(p,0.6));r.Root.rotation.x+=0.07*cyc(p,0.35);r.Neck.rotation.x+=0.3+0.15*cyc(p,0.2);
   r.Head.rotation.x-=0.2;r.Tail.rotation.x+=0.9+0.15*cyc(p,0.4);r.EarL.rotation.x-=0.3;r.EarR.rotation.x-=0.3;}}}});
export const MOUNTS=[
horse({id:'horse',n:'Birk',da:'Fjordhest · blakket',coat:0xc9a877,pts:0x3a2e24,mane:0xefe4cc,muz:0x5a4a3e,stripe:1,note:'Calm and sure-footed. Trait: two-tone mane, cut upright with a dark stripe.'}),
horse({id:'horse_kul',n:'Kul',da:'Fjordhest · sort',coat:0x2c2826,pts:0x1c1a18,mane:0x3a3430,muz:0x4a4440,trait:'braid',note:'Coal black and a little proud. Trait: braided mane.'}),
horse({id:'horse_solvej',n:'Solvej',da:'Fjordhest · palomino',coat:0xd6a860,pts:0xb88a48,mane:0xf3e8c8,muz:0x8a6a48,trait:'socks',note:'Golden coat, flaxen mane. Trait: four white socks.'}),
{id:'bike',n:'Garden Bike',da:'Havecykel',tags:['Mounts'],where:'World asset · unlocks later, parks anywhere',when:'Ride 4 · fast 6 m/s',lure:'Built in the shed from wood and parts',size:'1.8 m',real:1.8,rarity:'Vehicle',
 note:'Wicker basket fits one harvest crate. Faster than walking, slower than the horse, and never needs feeding.',actName:'Bell',dur:1.2,
 build(k){const {node,put,mat,R}=k;const fr=mat('Frame',0x7a9a7a,{r:0.45,m:0.3}),ti=mat('Tire',0x2a2826),me=mat('Chrome',0xc8c4bc,{r:0.3,m:0.8}),lt=mat('Leather',0x7a4a2a),wk=mat('Wicker',0xb08a5a),gl=mat('Lamp',0xfff2c8),
    fe=mat('Fender',0xe8dcc0,{r:0.5});
  const W=(n,p)=>{const Wn=node(n,p,0,0,0);const t=new THREE.TorusGeometry(0.33,0.028,6,26);t.rotateY(PI/2);put(t,ti,Wn);const rim=new THREE.TorusGeometry(0.3,0.01,4,26);rim.rotateY(PI/2);put(rim,me,Wn);
    for(let i=0;i<8;i++)put(Y(0.003,0.003,0.6,3),me,Wn,0,0,0,i*PI/8);put(Y(0.025,0.025,0.1,8),me,Wn,0,0,0,0,0,PI/2);return Wn;};
  const Rw=node('RearAxle',R,0,0.33,-0.52),WB=W('WheelB',Rw);
  const bb=[0,0.3,-0.04],st=[0,0.84,-0.22],hb=[0,0.7,0.44],ra=[0,0.33,-0.52];
  [[bb,st,0.022],[hb,bb,0.024],[[0,0.76,0.42],[0,0.5,-0.14],0.02],[[0.05,0.3,-0.04],[0.05,0.33,-0.52],0.013],[[-0.05,0.3,-0.04],[-0.05,0.33,-0.52],0.013],[[0.04,0.8,-0.2],[0.05,0.33,-0.52],0.012],[[-0.04,0.8,-0.2],[-0.05,0.33,-0.52],0.012]]
    .forEach(([a,b,r])=>put(tube(a,b,r),fr,R));
  put(tube(st,[0,0.95,-0.25],0.013),me,R);put(S(0.08,0.9,0.4,1.5),lt,R,0,0.98,-0.26);
  const rf=new THREE.TorusGeometry(0.37,0.03,3,12,PI*0.55);rf.rotateY(PI/2);rf.rotateX(-PI*0.05);put(rf,fe,Rw);put(BOX(0.28,0.02,0.24),fr,R,0,0.72,-0.6);
  const Sd=node('Stand',R,0.06,0.3,-0.12,0.35);put(Y(0.008,0.008,0.3,4),me,Sd,0,-0.15,0);
  const Cr=node('Crank',R,...bb);const cr=new THREE.TorusGeometry(0.09,0.012,4,16);cr.rotateY(PI/2);put(cr,me,Cr,0.06,0,0);
  [['PedalL',-1,1],['PedalR',1,-1]].forEach(([n,s,d])=>{put(BOX(0.018,0.17,0.03),me,Cr,0.09*s,0.085*d,0);const P=node(n,Cr,0.13*s,0.17*d,0);put(BOX(0.1,0.02,0.05),ti,P);});
  const St=node('Steer',R,0,0.8,0.45,0,0,0);
  put(tube([0,-0.1,0],[0,0.12,-0.03],0.026),fr,St);put(tube([0,0.12,-0.03],[0,0.24,-0.08],0.014),me,St);
  [-1,1].forEach(s=>{put(tube([0,0.24,-0.08],[0.24*s,0.26,-0.2],0.012),me,St);put(Y(0.018,0.018,0.1,6),lt,St,0.27*s,0.265,-0.21,0,0,PI/2);put(tube([0.035*s,-0.1,0],[0.04*s,-0.47,0.08],0.013),fr,St);});
  const Fw=node('FrontAxle',St,0,-0.47,0.08),WF=W('WheelF',Fw);const ff=new THREE.TorusGeometry(0.37,0.03,3,12,PI*0.5);ff.rotateY(PI/2);ff.rotateX(PI*0.2);put(ff,fe,Fw);
  put(BOX(0.36,0.22,0.28),wk,St,0,0.1,0.2);put(BOX(0.38,0.03,0.3),lt,St,0,0.215,0.2);put(Y(0.035,0.04,0.06,8),me,St,0,-0.02,0.07,PI/2);put(S(0.028,1,1,0.4),gl,St,0,-0.02,0.1);
  const Bl=node('Bell',St,0.16,0.28,-0.16);put(S(0.025,1,0.7,1),me,Bl);return k.top;},
 idle(r,t){r.Root.rotation.z-=0.06;r.Steer.rotation.y+=0.35;},
 act(r,at,p){const e=env(p,0.1,0.7);r.Bell.rotation.y+=0.9*Math.sin(at*40)*e;r.Bell.scale.setScalar(1+0.25*e);r.Root.rotation.z-=0.06;r.Steer.rotation.y+=0.35+0.05*Math.sin(at*30)*e;},
 moves:{
  Ride:{dur:1.1,f(r,p){const w=TAU*2*p,c=TAU*p;r.WheelF.rotation.x+=w;r.WheelB.rotation.x+=w;r.Crank.rotation.x+=c;r.PedalL.rotation.x-=c;r.PedalR.rotation.x-=c;
   r.Stand.rotation.x+=1.2;r.Root.rotation.z+=0.02*cyc(p);r.Steer.rotation.y+=0.03*cyc(p,0.25);}},
  Fast:{dur:0.55,f(r,p){const w=TAU*2*p,c=TAU*p;r.WheelF.rotation.x+=w;r.WheelB.rotation.x+=w;r.Crank.rotation.x+=c;r.PedalL.rotation.x-=c;r.PedalR.rotation.x-=c;
   r.Stand.rotation.x+=1.2;r.Root.rotation.z+=0.045*cyc(p);r.Steer.rotation.y+=0.05*cyc(p,0.25);r.Root.rotation.x+=0.03;}}}},

{id:'thora',n:'Tidsel-Thora',da:'Staldforvalter',tags:['NPC'],where:'Stable · top of the map',when:'Day · closes at dusk',lure:'Bring carrots to earn her trust',size:'1.5 m',real:1.5,rarity:'NPC',
 note:'A gruff old thistle in a riding helmet. Stern but fair: she lends you the horse, but you learn to trot before she lets you gallop.',actName:'Wave',dur:2.2,
 build(k){const {node,put,mat,eyes,R}=k;const wd=mat('Bucket',0x9c7650),ir=mat('Hoop',0x4a4640,{r:0.4,m:0.6}),hy=mat('Hay',0xd8c078),stm=mat('Stem',0x6f8a3c),lf=mat('Leaf',0x7f9a48),sp=mat('Spike',0xd8d0a8),
    fc=mat('Face',0x8aa856),br=mat('Bract',0x5e7a38),pu=mat('Tuft',0x9a4a9a),pu2=mat('TuftLight',0xb870b8),hm=mat('Helmet',0x23201e,{r:0.6}),bw=mat('Brush',0x8a6440),bb=mat('Bristle',0x3a3028),stk=mat('Stock',0xefe8d8);
  put(Y(0.26,0.22,0.34,12),wd,R,0,0.17,0);[0.08,0.3].forEach(y=>{const t=new THREE.TorusGeometry(0.25+y*0.04,0.012,4,16);t.rotateX(PI/2);put(t,ir,R,0,y,0);});put(S(0.24,1,0.28,1),hy,R,0,0.34,0);
  const B=node('Body',R,0,0.34,0);put(Y(0.05,0.07,0.75,7),stm,B,0,0.375,0);
  [0,2.1,4.2].forEach(a=>{const L=new THREE.Group();L.position.set(Math.cos(a)*0.08,0.18,Math.sin(a)*0.08);L.rotation.set(Math.sin(a)*0.4,0,-Math.cos(a)*0.4);B.add(L);
    put(S(0.1,0.35,1.7,0.8),lf,L);for(let i=0;i<5;i++){const y=-0.12+i*0.06;[-1,1].forEach(s=>put(C(0.01,0.05,3),sp,L,0.032*s,y,0,0,0,-1.3*s));}});
  put(C(0.11,0.1,6),stk,B,0,0.69,0.02,PI);
  const Hd=node('Head',B,0,0.78,0);put(S(0.15,1,1.05,0.95),fc,Hd,0,0.13,0);eyes(Hd,0.055,0.15,0.11,0.02);
  const Bw=node('Brows',Hd,0,0.2,0.13);[-1,1].forEach(s=>put(BOX(0.06,0.016,0.02),br,Bw,0.052*s,0,0,0,0,0.35*s));
  for(let i=0;i<16;i++){const a=i/16*TAU,y=0.02+(i%2)*0.04,c=Math.cos(a),s=Math.sin(a);put(C(0.025,0.08,3),br,Hd,s*0.14,y,c*0.13,c*1.9,0,-s*1.9);}
  for(let i=0;i<22;i++){const a=PI*0.55+i/21*PI*0.9,j=i%3,c=Math.cos(a),s=Math.sin(a);put(C(0.018,0.16+j*0.04,3),j?pu:pu2,Hd,s*0.12,0.24+j*0.02,c*0.1,c*0.9-0.2,0,-s*0.9);}
  const Ht=node('Hat',Hd,0,0.25,0,-0.12);put(new THREE.SphereGeometry(0.165,12,6,0,TAU,0,PI/2),hm,Ht);put(S(0.1,1,0.15,0.9),hm,Ht,0,0,0.15);
  put(new THREE.TorusGeometry(0.11,0.008,4,10,PI),hm,Ht,0,-0.02,0,0,PI/2,0);
  [['ArmL',1],['ArmR',-1]].forEach(([n,s])=>{const A=node(n,B,0.06*s,0.58,0,0,0,0.35*s);put(S(0.04,0.8,3.6,0.6),lf,A,0,-0.14,0);for(let i=0;i<3;i++)put(C(0.008,0.04,3),sp,A,0.03*s,-0.06-i*0.07,0,0,0,-1.3*s);put(S(0.035),stm,A,0,-0.28,0);});
  const Br=node('Brush',k.rig.ArmR,0,-0.3,0.03);put(BOX(0.06,0.04,0.13),bw,Br);put(BOX(0.05,0.03,0.12),bb,Br,0,-0.03,0);return k.top;},
 idle(r,t){r.__t=t;breath(r,0.015);r.Body.rotation.z+=0.02*sn(t,1);r.Head.rotation.y+=0.25*Math.tanh(3*sn(t,1,2));r.ArmL.rotation.z+=0.04*sn(t,1);r.ArmR.rotation.z-=0.04*sn(t,1,0.5);
  r.Brows.position.y-=0.012*bump(t,2.2,0.3);r.Brows.rotation.z+=0.15*bump(t,3.4,0.15);blink(r,0.9*(bump(t,1.4,0.07)+bump(t,3.6,0.07)));},
 act(r,at,p){const e=env(p,0.18,0.82);r.ArmR.rotation.z-=2.2*e+0.3*Math.sin(at*9)*e;r.Head.rotation.x+=0.12*arc(seg(p,0.25,0.5));r.Brows.position.y+=0.012*e;r.Hat.rotation.x-=0.1*arc(seg(p,0.2,0.45));},
 moves:{
  Brush:{dur:1.2,f(r,p){r.ArmR.rotation.x-=1.1;r.ArmR.rotation.z+=0.4*cyc(p);r.Body.rotation.y+=0.12*cyc(p,0.1);r.Body.rotation.x+=0.08;r.Head.rotation.x+=0.15;r.ArmL.rotation.z+=0.1*cyc(p,0.5);r.Brows.position.y-=0.01;}},
  Talk:{dur:1.6,f(r,p){r.Head.rotation.x+=0.1*cyc(2*p);r.Head.rotation.z+=0.05*cyc(p);r.ArmL.rotation.z+=0.6+0.3*cyc(p);r.ArmL.rotation.x-=0.4;r.Body.rotation.y+=0.08*cyc(p,0.3);r.Brows.position.y-=0.01*(1+cyc(2*p));}}}},
];
