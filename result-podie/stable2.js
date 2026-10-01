// Thora's stable v2 — the stable IS the gate. Half-timbered building sits in the south side of the oval with a
// drive-through tunnel (boxes on both sides, tack room + hatch at the outer end). Outer fence joins the building,
// so the only way onto the track is through the tunnel. Jumping arena sits inside the oval. Units m, front faces -z (south).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const PI=Math.PI,TAU=PI*2;
export const TRACK={cx:0,cz:8,L:16,R:16,W:3.6};
export const PER=4*TRACK.L+2*PI*TRACK.R;
export const HOUSE={x0:-5.5,x1:5.5,zs:-15.1,zn:-10.1,aisle:1.3,tack:-12.2};
export const RIN=TRACK.R-TRACK.W/2-0.15,ROUT=TRACK.R+TRACK.W/2+0.15;
export const GATE={w:2.4};
export const ARENA={x0:-9,x1:9,z0:2,z1:14,g0:-1.6,g1:1.6};
export const JUMPS=[{n:1,x:-5,z:6,ax:'x',dir:1,cross:true},{n:2,x:0,z:11.5,ax:'z',dir:1},{n:3,x:5,z:6,ax:'x',dir:-1}];
export const START_X=-4;
export const U0=(3*TRACK.L+PI*TRACK.R-START_X)/PER;
export const SPOTS={thora:{x:3.3,z:-14.3},talk:{x:3.3,z:-16.3},hitch:{x:-6,z:-3.7},bike:{x:7.8,z:-14.2},spawn:{x:0,z:-32}};
export function trackPt(u,off=0){const {cz,L,R}=TRACK;let d=((u%1)+1)%1*PER;
  if(d<2*L)return{x:-L+d,z:cz+R+off};d-=2*L;
  if(d<PI*R){const a=PI/2-d/R;return{x:L+Math.cos(a)*(R+off),z:cz+Math.sin(a)*(R+off)};}d-=PI*R;
  if(d<2*L)return{x:L-d,z:cz-R-off};d-=2*L;const a=-PI/2-d/R;return{x:-L+Math.cos(a)*(R+off),z:cz+Math.sin(a)*(R+off)};}
export const jSeg=J=>J.ax==='x'?[J.x-1.6,J.z,J.x+1.6,J.z]:[J.x,J.z-1.6,J.x,J.z+1.6];
const {x0:X0,x1:X1,zs:ZS,zn:ZN,aisle:A,tack:TK}=HOUSE;
const RECTS=[[X0-0.05,-A,ZS-0.02,ZN+0.02],[A,X1+0.05,ZS-0.02,ZN+0.02],
  [-1.42,-1.18,ZS-1.35,ZS],[1.18,1.42,ZS-1.35,ZS],
  [-6.8,-6.0,-14.2,-12.2],[-6.2,-5.5,-11.9,-10.3],[-8.4,-3.6,-4.7,-4.5],
  [5.55,6.45,-14.8,-12.7],[6.9,7.3,-12.4,-10.7],[8.44,8.56,-15.06,-14.94],[8.44,8.56,-10.46,-10.34]];
const SEGS=[[ARENA.x0,ARENA.z0,ARENA.g0,ARENA.z0],[ARENA.g1,ARENA.z0,ARENA.x1,ARENA.z0],[ARENA.x0,ARENA.z1,ARENA.x1,ARENA.z1],[ARENA.x0,ARENA.z0,ARENA.x0,ARENA.z1],[ARENA.x1,ARENA.z0,ARENA.x1,ARENA.z1]];
const segD=(x,z,[ax,az,bx,bz])=>{const vx=bx-ax,vz=bz-az;let t=((x-ax)*vx+(z-az)*vz)/(vx*vx+vz*vz);t=Math.max(0,Math.min(1,t));return Math.hypot(x-ax-vx*t,z-az-vz*t);};
export function blocked(x,z,r,poles=true){
  if(Math.hypot(x,z-6)>44)return true;
  for(const [a,b,c,d] of RECTS)if(x>a-r&&x<b+r&&z>c-r&&z<d+r)return true;
  const dx=Math.max(0,Math.abs(x)-TRACK.L),rr=Math.hypot(dx,z-TRACK.cz);
  if(Math.abs(rr-ROUT)<r+0.08&&!(z<TRACK.cz&&Math.abs(x)<X1+0.1))return true;
  if(Math.abs(rr-RIN)<r+0.08&&!(z<TRACK.cz&&Math.abs(x)<GATE.w-r))return true;
  for(const s of SEGS)if(segD(x,z,s)<r+0.08)return true;
  for(const J of JUMPS){const s=jSeg(J);if(Math.hypot(x-s[0],z-s[1])<r+0.12||Math.hypot(x-s[2],z-s[3])<r+0.12)return true;if(poles&&segD(x,z,s)<r+0.1)return true;}
  return false;}

export function buildStable(){
  const root=new THREE.Group();root.name='Stable';
  const M={},mat=(n,c,o={})=>M[n]||(M[n]=new THREE.MeshStandardMaterial({name:'Stable_'+n,color:c,roughness:o.r??0.88,metalness:o.m??0,flatShading:true,emissive:o.e??0,emissiveIntensity:0}));
  const G={},prep=geo=>{geo=geo.index?geo.toNonIndexed():geo;for(const k of['uv1','uv2'])if(geo.attributes[k])geo.deleteAttribute(k);return geo;};
  const add=(m,geo,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{geo=prep(geo);if(rz)geo.rotateZ(rz);if(rx)geo.rotateX(rx);if(ry)geo.rotateY(ry);geo.translate(x,y,z);(G[m]=G[m]||[]).push(geo);};
  const B=(w,h,d)=>new THREE.BoxGeometry(w,h,d),Cy=(a,b,h,s=7)=>new THREE.CylinderGeometry(a,b,h,s);
  const barG=(ax,ay,az,bx,by,bz,t)=>{const d=new THREE.Vector3(bx-ax,by-ay,bz-az),L=d.length(),g=prep(B(t,L,t));g.translate(0,L/2,0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));g.translate(ax,ay,az);return g;};
  const bar=(m,...a)=>(G[m]=G[m]||[]).push(barG(...a));
  mat('Plaster',0xf0e9da);mat('Timber',0x3e2c1e);mat('Tile',0xa24e36);mat('TileDark',0x86402c);mat('Stone',0x9a968a);mat('Cobble',0x8a8478);mat('Wood',0x8a6440);mat('Plank',0x6b4a30);
  mat('Straw',0xd8c078);mat('Glow',0x3a2e24,{e:0xffbe6a});mat('Lamp',0xfff2c8,{e:0xffc070});mat('Iron',0x3a3834,{r:0.5,m:0.6});mat('Water',0x5c8784,{r:0.2});mat('Grass',0x86a24f);
  mat('Sand',0xcdb58a);mat('Dirt',0xa8875e);mat('Gravel',0xbfae8e);mat('Rail',0xe8e2d4);mat('PoleRed',0xb8402e);mat('PoleWhite',0xf2eee4);mat('Leather',0x6a4228);mat('Metal',0xb8b4a8,{r:0.35,m:0.7});
  const H=2.6,RY=4.4,SZ=(ZS+ZN)/2,D=ZN-ZS,T=0.12;

  // ---- ground, track, rails
  add('Grass',new THREE.CircleGeometry(46,48),0,0,6,-PI/2);
  add('Sand',B(ARENA.x1-ARENA.x0,0.04,ARENA.z1-ARENA.z0),0,0.02,(ARENA.z0+ARENA.z1)/2);
  {const N=120,o=[],h=[];for(let i=0;i<N;i++){const p=trackPt(i/N,TRACK.W/2),q=trackPt(i/N,-TRACK.W/2);o.push(new THREE.Vector2(p.x,-p.z));h.push(new THREE.Vector2(q.x,-q.z));}
    const sh=new THREE.Shape(o);sh.holes.push(new THREE.Path(h.reverse()));add('Dirt',new THREE.ShapeGeometry(sh),0,0.025,0,-PI/2);}
  const railRing=(off,N,ex,hw)=>{const us=[...Array(N)].map((_,i)=>i/N);ex.forEach(x=>us.push((3*TRACK.L+PI*TRACK.R-x)/PER));us.sort((a,b)=>a-b);
    const pts=us.map(u=>trackPt(u,off)),sk=p=>p.z<TRACK.cz&&Math.abs(p.x)<hw;
    pts.forEach(p=>{if(!sk(p))add('Rail',B(0.08,1.0,0.08),p.x,0.5,p.z);});
    for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if(sk(a)||sk(b)||Math.hypot(a.x-b.x,a.z-b.z)<0.05)continue;[0.5,0.9].forEach(y=>bar('Rail',a.x,y,a.z,b.x,y,b.z,0.06));}};
  railRing(-(TRACK.W/2+0.15),64,[-GATE.w,GATE.w],GATE.w-0.05);
  railRing(TRACK.W/2+0.15,76,[-(X1+0.12),X1+0.12],X1+0.1);
  [-1,1].forEach(s=>add('Timber',B(0.16,1.3,0.16),s*GATE.w,0.65,TRACK.cz-RIN));
  {const zc=TRACK.cz-TRACK.R;add('PoleWhite',B(0.3,0.03,TRACK.W),START_X,0.045,zc);
    [zc-(TRACK.W/2+0.15),zc+(TRACK.W/2+0.15)].forEach(z=>add('Timber',B(0.16,3.2,0.16),START_X,1.6,z));
    for(let i=0;i<8;i++)add(i%2?'PoleWhite':'PoleRed',B(0.06,0.42,(TRACK.W+0.3)/8),START_X,3.0,zc-(TRACK.W+0.3)/2+(i+0.5)*(TRACK.W+0.3)/8);}
  // paths
  add('Gravel',B(2.6,0.03,22.9),0,0.03,-26.55);add('Gravel',B(12,0.03,3.4),0,0.035,-16.8);add('Gravel',B(2.6,0.03,7.8),0,0.035,-1.9);

  // ---- building
  [[X0-0.15,-A],[A,X1+0.15]].forEach(([a,b])=>{add('Stone',B(b-a,0.3,D+0.3),(a+b)/2,0.15,SZ);add('Straw',B(b-a-0.4,0.05,D-0.5),(a+b)/2,0.33,SZ);});
  add('Cobble',B(2*A,0.04,D+0.3),0,0.02,SZ);
  function wall(axis,wp,out,u0,u1,opens,step=1.4){
    const P=(u,y,w)=>axis==='z'?[u,y,wp+out*w]:[wp+out*w,y,u];
    const box=(m,cu,cy,cw,du,dy,dw)=>{const [x,y,z]=P(cu,cy,cw);add(m,axis==='z'?B(du,dy,dw):B(dw,dy,du),x,y,z);};
    const br=(a,y0,b,y1)=>{const p=P(a,y0,0.02),q=P(b,y1,0.02);bar('Timber',...p,...q,T);};
    const inO=u=>opens.find(o=>u>o[0]+0.02&&u<o[1]-0.02);
    let us=[u0,u1];opens.forEach(o=>us.push(o[0],o[1]));
    for(let u=u0+step;u<u1-0.4;u+=step)if(!inO(u)&&!opens.some(o=>Math.abs(u-o[0])<0.4||Math.abs(u-o[1])<0.4))us.push(u);
    us=[...new Set(us.map(u=>Math.round(u*1000)/1000))].sort((a,b)=>a-b);
    for(let i=0;i<us.length-1;i++){const a=us[i],b=us[i+1],m=(a+b)/2,w=b-a;if(w<0.01)continue;const o=inO(m),door=o&&o[2]<0.2;
      (o?[[0.3,o[2]],[o[3],H]]:[[0.3,H]]).forEach(([y0,y1])=>{if(y1-y0>0.02)box('Plaster',m,(y0+y1)/2,-0.1,w,y1-y0,0.2);});
      if(o){box('Timber',m,o[3],0.02,w+0.12,T,T);if(!door){box('Timber',m,o[2],0.02,w+0.12,T,T);
          if(!o[4]){box('Timber',m,(o[2]+o[3])/2,0.03,0.05,o[3]-o[2],0.05);box('Timber',m,(o[2]+o[3])/2,0.03,w,0.05,0.05);box('Glow',m,(o[2]+o[3])/2,-0.12,w,o[3]-o[2],0.02);}}}
      else{box('Timber',m,1.45,0.02,w,T,T);if(w>0.7){i%2?br(a,0.42,b,1.4):br(a,1.4,b,0.42);br(a,1.5,b,H-0.1);}}
      if(!door)box('Timber',m,0.36,0.02,w,T,T);}
    us.forEach(u=>{if(!inO(u))box('Timber',u,(0.3+H)/2,0.02,T,H-0.3,T);});
    box('Timber',(u0+u1)/2,H-0.06,0.02,u1-u0+0.12,T,T);}
  const HAT=[2.5,4.1,0.95,1.95];
  wall('z',ZS,-1,X0,X1,[[-A,A,0,2.3],[HAT[0],HAT[1],HAT[2],HAT[3],1],[-4.2,-2.6,1.2,1.9]]);
  wall('z',ZN,1,X0,X1,[[-A,A,0,2.3],[-4.2,-2.6,1.2,1.9],[2.6,4.2,1.2,1.9]]);
  wall('x',X0,-1,ZS,ZN,[[SZ-1.3,SZ-0.1,1.2,1.9]]);
  wall('x',X1,1,ZS,ZN,[]);
  [[X0,-1],[X1,1]].forEach(([xw,out])=>{const sh=new THREE.Shape([new THREE.Vector2(ZS,0),new THREE.Vector2(ZN,0),new THREE.Vector2(SZ,RY-H)]);
    const g=new THREE.ExtrudeGeometry(sh,{depth:0.2,bevelEnabled:false});g.rotateY(-PI/2);add('Plaster',g,out>0?xw:xw+0.2,H,0);
    const x=xw+out*0.02;bar('Timber',x,H,ZS,x,RY,SZ,T);bar('Timber',x,H,ZN,x,RY,SZ,T);bar('Timber',x,H,SZ,x,RY-0.1,SZ,T);bar('Timber',x,H,SZ-1.25,x,3.3,SZ-0.3,T);bar('Timber',x,H,SZ+1.25,x,3.3,SZ+0.3,T);});
  {const ov=0.55,hz=D/2+ov,drop=RY-H+0.1,sl=Math.atan2(drop,hz),rl=Math.hypot(hz,drop);
    [-1,1].forEach(s=>{add('Tile',B(X1-X0+0.9,0.14,rl+0.1),0,(RY+H-0.1)/2+0.08,SZ+s*hz/2,s*sl);
      for(let i=1;i<6;i++){const u=i/6;add('TileDark',B(X1-X0+0.92,0.04,0.08),0,RY-drop*(1-u)+0.16,SZ+s*hz*(1-u),s*sl);}});
    add('TileDark',B(X1-X0+1,0.18,0.3),0,RY+0.14,SZ);}
  add('Plank',B(X1-X0-0.3,0.08,D-0.3),0,H-0.02,SZ);
  // aisle walls: boxes with bars; tack room solid
  const boxFront=(x,z0,z1,face)=>{const L=z1-z0,zc=(z0+z1)/2;add('Plank',B(0.1,1.3,L),x,0.65,zc);add('Wood',B(0.12,0.08,L),x,1.32,zc);add('Wood',B(0.12,0.08,L),x,2.1,zc);
    for(let z=z0+0.15;z<z1-0.05;z+=0.2)add('Iron',Cy(0.012,0.012,0.78,4),x,1.71,z);add('Plaster',B(0.15,H-2.14,L),x,(2.14+H)/2,zc);
    add('Wood',B(0.05,1.2,1.1),x+face*0.07,0.68,zc);bar('Wood',x+face*0.1,0.15,zc-0.5,x+face*0.1,1.2,zc+0.5,0.06);add('Iron',B(0.04,0.05,0.14),x+face*0.1,0.9,zc+0.46);};
  boxFront(-A-0.05,ZS+0.2,SZ,1);boxFront(-A-0.05,SZ,ZN-0.2,1);boxFront(A+0.05,TK,ZN-0.2,-1);
  add('Plaster',B(0.15,H,TK-ZS-0.2),A+0.05,H/2,(ZS+0.2+TK)/2);add('Plank',B(0.04,1.9,0.9),A-0.03,0.95,(ZS+TK)/2);
  add('Wood',B(-A-X0-0.2,1.3,0.08),(X0+0.2-A)/2,0.95,SZ);for(let x=X0+0.35;x<-A-0.1;x+=0.22)add('Iron',Cy(0.012,0.012,0.7,4),x,1.95,SZ);
  add('Plaster',B(X1-A-0.2,H-0.3,0.14),(A+X1-0.2)/2+0.1,(0.3+H)/2,TK);
  // tack room interior
  add('Wood',B(1.8,0.07,0.4),3.3,0.95,ZS+0.3);add('Glow',B(3.6,1.7,0.02),3.4,1.45,TK-0.09);
  // shop fittings (the tack itself is placed by the page): saddle racks, bridle hooks, low bench
  [4.9,4.0].forEach(x=>{add('Wood',B(0.08,0.08,0.42),x,1.3,TK-0.28);add('Wood',B(0.14,0.14,0.04),x,1.3,TK-0.09);});
  [3.15,2.45].forEach(x=>{add('Iron',B(0.03,0.03,0.14),x,2.12,TK-0.14);add('Iron',B(0.03,0.07,0.03),x,2.15,TK-0.2);});
  add('Wood',B(2.1,0.06,0.42),2.55,0.8,TK-0.3);[3.5,1.6].forEach(x=>add('Wood',B(0.06,0.42,0.36),x,0.56,TK-0.3));
  // lanterns
  const lantern=(x,y,z,out)=>{add('Iron',B(0.18,0.03,0.18),x,y+0.2,z+out*0.2);add('Iron',B(0.03,0.03,0.22),x,y+0.25,z+out*0.1);add('Lamp',B(0.13,0.2,0.13),x,y+0.08,z+out*0.2);add('Iron',B(0.16,0.03,0.16),x,y-0.03,z+out*0.2);};
  lantern(-1.75,2.0,ZS,-1);lantern(1.75,2.0,ZS,-1);lantern(4.55,1.75,ZS,-1);lantern(-1.75,2.0,ZN,1);lantern(1.75,2.0,ZN,1);
  add('Iron',Cy(0.01,0.01,0.3,4),0,H-0.17,SZ);add('Lamp',B(0.14,0.2,0.14),0,H-0.42,SZ);add('Iron',B(0.18,0.03,0.18),0,H-0.3,SZ);
  // trough, hay rack, hitching rail
  add('Plank',B(0.8,0.55,2.0),-6.4,0.28,-13.2);add('Water',B(0.6,0.02,1.8),-6.4,0.5,-13.2);
  add('Wood',B(0.12,1.3,1.6),-5.58,1.2,-11.1);for(let i=0;i<7;i++){const z=-11.8+i*0.23;bar('Wood',-5.6,0.9,z,-6.1,1.7,z,0.04);}add('Wood',B(0.6,0.06,1.6),-5.85,1.7,-11.1);
  add('Straw',new THREE.SphereGeometry(0.5,8,6).scale(0.55,0.7,1.5),-5.85,1.3,-11.1);
  [-8.1,-6,-3.9].forEach(x=>add('Wood',Cy(0.06,0.07,1.1,6),x,0.55,-4.6));add('Wood',Cy(0.05,0.05,4.4,6),-6,1.05,-4.6,0,0,PI/2);
  // bike corner lean-to on the east wall
  [[8.5,-15.0],[8.5,-10.4]].forEach(([x,z])=>add('Timber',B(0.12,2.2,0.12),x,1.1,z));add('Tile',B(3.2,0.1,5.0),7.1,2.35,-12.7,0,0,-0.18);
  add('Wood',B(0.8,0.08,2.0),6.0,0.9,-13.75);[[5.7,-14.6],[6.3,-14.6],[5.7,-12.9],[6.3,-12.9]].forEach(([x,z])=>add('Wood',B(0.06,0.9,0.06),x,0.45,z));
  add('Wood',B(0.04,0.9,1.8),5.62,1.65,-13.75);[[1.5,-14.4],[1.75,-14.0],[1.5,-13.6],[1.8,-13.2]].forEach(([y,z],i)=>add(i%2?'Iron':'Wood',B(0.04,0.3,0.05),5.66,y,z));
  add('Plank',B(0.4,0.3,0.3),6.0,1.09,-14.5);add('Metal',Cy(0.12,0.12,0.03,10),6.05,0.96,-13.2,0,0,PI/2);
  for(let i=0;i<3;i++)add('Metal',new THREE.TorusGeometry(0.28,0.02,4,10,PI),7.1,0.1,-12.1+i*0.6,0,PI/2);
  // arena fence + jumps
  const fp=(x,z)=>add('Wood',B(0.12,1.2,0.12),x,0.6,z),rail=(ax,az,bx,bz)=>[0.55,1.05].forEach(y=>bar('Rail',ax,y,az,bx,y,bz,0.07));
  for(let x=ARENA.x0;x<=ARENA.x1+0.01;x+=2){fp(x,ARENA.z1);if(x<=ARENA.g0||x>=ARENA.g1)fp(x,ARENA.z0);}for(let z=ARENA.z0+2;z<ARENA.z1;z+=2){fp(ARENA.x0,z);fp(ARENA.x1,z);}
  fp(ARENA.g0,ARENA.z0);fp(ARENA.g1,ARENA.z0);SEGS.forEach(s=>rail(...s));
  const jumpTops=[],plates=[];
  JUMPS.forEach(J=>{const s=jSeg(J);[[s[0],s[1]],[s[2],s[3]]].forEach(([x,z])=>{add('PoleWhite',B(0.14,1.3,0.14),x,0.65,z);add('Wood',B(0.5,0.08,0.5),x,0.04,z);});
    const TGm={PoleRed:[],PoleWhite:[]};
    const pole=(dst,y0,y1,dn)=>{const nx=J.ax==='x'?0:dn,nz=J.ax==='x'?dn:0;for(let i=0;i<6;i++){const u0=i/6,u1=(i+1)/6,m=i%2?'PoleWhite':'PoleRed';
      const g=barG(s[0]+nx+(s[2]-s[0])*u0,y0+(y1-y0)*u0,s[1]+nz+(s[3]-s[1])*u0,s[0]+nx+(s[2]-s[0])*u1,y0+(y1-y0)*u1,s[1]+nz+(s[3]-s[1])*u1,0.08);dst?TGm[m].push(g):(G[m]=G[m]||[]).push(g);}};
    if(J.cross){pole(1,0.2,0.9,0.03);pole(1,0.9,0.2,-0.03);}else{pole(1,0.75,0.75,0);pole(0,0.35,0.35,0);}
    const top=new THREE.Group();top.name='Stable_JumpTop'+J.n;root.add(top);
    for(const k in TGm)if(TGm[k].length){const me=new THREE.Mesh(mergeGeometries(TGm[k]),M[k]);me.castShadow=true;top.add(me);}
    jumpTops.push({g:top,n:J.n,drop:J.cross?0.45:0.68,k:0,t:0});
    const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#f2eee4';x.beginPath();x.arc(64,64,60,0,TAU);x.fill();x.lineWidth=8;x.strokeStyle='#3e2c1e';x.stroke();
    x.fillStyle='#3e2c1e';x.font='800 78px Manrope, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(J.n),64,70);
    const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;const pm=new THREE.MeshStandardMaterial({name:'Stable_JumpNo'+J.n,map:tx,roughness:0.9,transparent:true});
    [[s[0],s[1]],[s[2],s[3]]].forEach(([px,pz])=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(0.36,0.36),pm);p.name='Stable_JumpNo'+J.n;
      if(J.ax==='x'){p.position.set(px,1.05,pz-J.dir*0.09);p.rotation.y=J.dir>0?PI:0;}else{p.position.set(px-J.dir*0.09,1.05,pz);p.rotation.y=J.dir>0?-PI/2:PI/2;}root.add(p);plates.push(p);});});
  // merge statics
  let tris=0;for(const k in G){const m=new THREE.Mesh(mergeGeometries(G[k]),M[k]);m.name='Stable_'+k;m.castShadow=!['Grass','Sand','Dirt','Gravel','Glow','Water','Cobble'].includes(k);m.receiveShadow=true;root.add(m);tris+=m.geometry.attributes.position.count/3;}
  root.traverse(o=>{if(o.isMesh&&o.parent!==root)tris+=o.geometry.attributes.position.count/3;});tris+=plates.length*2;
  const sign=(txt,w,h,x,y,z,sub)=>{const c=document.createElement('canvas');c.width=640;c.height=Math.round(640*h/w);const g=c.getContext('2d');g.fillStyle='#3e2c1e';g.fillRect(0,0,c.width,c.height);
    g.strokeStyle='#d8c078';g.lineWidth=6;g.strokeRect(8,8,c.width-16,c.height-16);g.fillStyle='#f0e9da';g.textAlign='center';g.textBaseline='middle';
    g.font='800 '+Math.round(c.height*(sub?0.36:0.5))+'px Manrope, sans-serif';g.fillText(txt,c.width/2,c.height*(sub?0.4:0.54));
    if(sub){g.font='600 '+Math.round(c.height*0.2)+'px Manrope, sans-serif';g.fillStyle='#d8c078';g.fillText(sub,c.width/2,c.height*0.74);}
    const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({name:'Stable_Sign',map:tx,roughness:0.9}));
    s.name='Stable_Sign';s.position.set(x,y,z);s.rotation.y=PI;root.add(s);tris+=2;};
  sign("THORA'S STABLE",2.3,0.28,0,2.45,ZS-0.09);
  add('Timber',B(0.14,1.8,0.14),2.2,0.9,-24);{const m=new THREE.Mesh(mergeGeometries([prep(B(0.14,1.8,0.14)).translate(2.2,0.9,-24)]),M.Timber);m.castShadow=true;root.add(m);}
  sign("THORA'S STABLE",1.3,0.6,2.2,1.55,-24.09,'Riding · Timed rides');
  // moving parts: tunnel doors (south) + tack-room hatch
  const nodes={},hinge=(n,x,y,z)=>{const g=new THREE.Group();g.name='Stable_'+n;g.position.set(x,y,z);root.add(g);nodes[n]=g;return g;};
  const door=(g,w,h,cx,cy)=>{const ms=[new THREE.Mesh(B(w,h,0.06),M.Plank),new THREE.Mesh(B(w-0.1,0.1,0.075),M.Wood),new THREE.Mesh(B(w-0.1,0.1,0.075),M.Wood)];ms[1].position.y=h/2-0.15;ms[2].position.y=-h/2+0.15;
    const br=new THREE.Mesh(B(0.08,Math.hypot(w,h)*0.82,0.075),M.Wood);br.rotation.z=-Math.sign(cx)*Math.atan2(w,h);ms.push(br);
    ms.forEach(o=>{o.position.x+=cx;o.position.y+=cy;o.castShadow=o.receiveShadow=true;g.add(o);tris+=12;});};
  door(hinge('TunnelDoorL',-A,0,ZS-0.03),A,2.25,A/2,1.15);door(hinge('TunnelDoorR',A,0,ZS-0.03),A,2.25,-A/2,1.15);
  {const h=hinge('Hatch',(HAT[0]+HAT[1])/2,HAT[3],ZS-0.03);const m=new THREE.Mesh(B(HAT[1]-HAT[0],HAT[3]-HAT[2],0.06),M.Plank);m.position.y=-(HAT[3]-HAT[2])/2;m.castShadow=true;h.add(m);tris+=12;}
  const applyPose=({doors=0,hatch=0})=>{nodes.TunnelDoorL.rotation.y=1.5*doors;nodes.TunnelDoorR.rotation.y=-1.5*doors;nodes.Hatch.rotation.x=1.35*hatch;};
  const setNight=n=>{M.Glow.emissiveIntensity=1.3*n;M.Lamp.emissiveIntensity=0.3+2.2*n;};
  const clips=()=>{const q=e=>new THREE.Quaternion().setFromEuler(new THREE.Euler(...e)).toArray();
    return[new THREE.AnimationClip('Doors_Open',1.2,[new THREE.QuaternionKeyframeTrack('Stable_TunnelDoorL.quaternion',[0,1.2],[...q([0,0,0]),...q([0,1.5,0])]),new THREE.QuaternionKeyframeTrack('Stable_TunnelDoorR.quaternion',[0,1.2],[...q([0,0,0]),...q([0,-1.5,0])])]),
      new THREE.AnimationClip('Hatch_Open',1.4,[new THREE.QuaternionKeyframeTrack('Stable_Hatch.quaternion',[0,1.4],[...q([0,0,0]),...q([1.35,0,0])])])];};
  applyPose({});setNight(0);
  return{root,applyPose,setNight,clips,jumpTops,lampPos:[[-1.75,2.1,ZS-0.6],[1.75,2.1,ZS-0.6],[0,2.1,SZ],[3.3,2.1,-13.3]],stats:{tris:Math.round(tris),materials:Object.keys(M).length+2}};
}
