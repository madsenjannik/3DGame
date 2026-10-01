// @ts-nocheck
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { patchMaterial, smooth } from '../visual/VisualKit.js';
import { CabinAssetSystem } from './CabinAssetSystem.js?build=DEV-CLEAN-R16-SLIM-ASSETS-HUB-20260928A';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// WORLD V2 is an adaptation of the user-supplied Claude Garden Prototype v2.
// The visual layout/palette/density are intentionally kept close to that source;
// gameplay systems remain owned by the locked DYM baseline.
const clamp01=x=>Math.min(1,Math.max(0,x));
const mix=(a,b,t)=>a+(b-a)*t;
const C=h=>new THREE.Color(h);
function hash(x,y,z){const h=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return h-Math.floor(h);}
function vnoise(x,y,z){
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=fz*fz*(3-2*fz),l=(a,b,t)=>a+(b-a)*t;
  return l(l(l(hash(ix,iy,iz),hash(ix+1,iy,iz),u),l(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),u),v),l(l(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),u),l(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),u),v),w);
}
const fbm2=(x,z)=>vnoise(x,.5,z)*.6+vnoise(x*2.1,1.7,z*2.1)*.3+vnoise(x*4.3,3.1,z*4.3)*.1;
function segD(x,z,pts){let m=1e9;for(let i=0;i<pts.length-1;i++){const ax=pts[i][0],az=pts[i][1],vx=pts[i+1][0]-ax,vz=pts[i+1][1]-az,den=vx*vx+vz*vz;let t=den?((x-ax)*vx+(z-az)*vz)/den:0;t=t<0?0:t>1?1:t;const dx=x-ax-vx*t,dz=z-az-vz*t,d=dx*dx+dz*dz;if(d<m)m=d;}return Math.sqrt(m);}
function closestOnSegments(x,z,pts){let best={d:1e9,x:0,z:0,nx:0,nz:1};for(let i=0;i<pts.length-1;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1],vx=bx-ax,vz=bz-az,den=vx*vx+vz*vz;let t=den?((x-ax)*vx+(z-az)*vz)/den:0;t=Math.max(0,Math.min(1,t));const cx=ax+vx*t,cz=az+vz*t,dx=x-cx,dz=z-cz,d=Math.hypot(dx,dz);if(d<best.d){const len=Math.max(1e-5,Math.hypot(vx,vz));best={d,x:cx,z:cz,nx:-vz/len,nz:vx/len};}}return best;}
function prep(g,col){if(g.index)g=g.toNonIndexed();for(const k of ['uv','uv1','uv2'])if(g.attributes[k])g.deleteAttribute(k);if(!g.attributes.normal)g.computeVertexNormals();if(!g.attributes.color){const c=C(col??0xffffff),n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));}return g;}
function shadeAO(g,dark,light,o={}){const p=g.attributes.position,n=g.attributes.normal;g.computeBoundingBox();const hMin=o.hMin??g.boundingBox.min.y,hMax=o.hMax??g.boundingBox.max.y,hw=o.hw??.35,jit=o.jit??.08,sd=o.seed??0,pw=o.pow??1,cd=C(dark),cl=C(light),c=new THREE.Color(),a=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const hy=(p.getY(i)-hMin)/Math.max(1e-4,hMax-hMin);let k=(n.getY(i)*.5+.5)*(1-hw)+hy*hw;k=Math.pow(clamp01(k),pw)+(vnoise(p.getX(i)*2.3+sd,p.getY(i)*2.3,p.getZ(i)*2.3)-.5)*jit;c.copy(cd).lerp(cl,clamp01(k));a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;}
function blobGeo(r,detail,seed,amp=.22,freq=1.6,sy=.88){let g=new THREE.IcosahedronGeometry(1,detail);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);const p=g.attributes.position,v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).normalize();const n=vnoise(v.x*freq+seed,v.y*freq+seed*1.3,v.z*freq-seed)*.7+vnoise(v.x*freq*2.8+seed,v.y*freq*2.8,v.z*freq*2.8)*.3;v.multiplyScalar(r*(1+(n-.5)*2*amp));v.y*=sy;p.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();return g;}
function stoneGeo(seed,detail=1){let g=blobGeo(1,detail,seed,.28,1.3,.62);g=g.toNonIndexed();g.computeVertexNormals();return g;}
function trunkGeo(H,r0,bend,seed,birch=false){const pts=[];for(let i=0;i<=12;i++){const t=i/12;pts.push(new THREE.Vector2(r0*(.58+.62*Math.pow(1-t,4))*(1-.4*t),t*H-.15));}const g=new THREE.LatheGeometry(pts,8),p=g.attributes.position,a=new Float32Array(p.count*3),c=new THREE.Color(),b0=C(birch?0xd8d2c0:0x5b4a39),b1=C(birch?0xe8e3d4:0x7a6650);for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i),t=Math.max(0,y/H),nn=1+(vnoise(x*6+seed,y*3,z*6)-.5)*.25;x*=nn;z*=nn;x+=bend*t*t;z+=bend*.35*t*t*Math.sin(seed);p.setXYZ(i,x,y,z);c.copy(b0).lerp(b1,clamp01(t*1.3+vnoise(x*4,y*9,z*4)*.3));a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));g.computeVertexNormals();return g;}
function radialTex(stops,size=96){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d'),gr=x.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);stops.forEach(([o,col])=>gr.addColorStop(o,col));x.fillStyle=gr;x.fillRect(0,0,size,size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}

export class SharedLandscape {
  constructor(world){
    this.world=world;this.root=new THREE.Group();this.root.name='WORLD_SHARED_ROOT';(world.hostScene||world.scene).add(this.root);this.scene=this.root;this.rand=world.rand;this.uTime=world.uTime;this.isTouch=world.isTouch;
    this.W0={x:60,z:-40};this.WL=-.9;this.worldRadius=188;
    this.orangery={x:60,z:-40,y:.95,rotation:0.8685393952858896,clearance:22};
    this.stable={x:70,z:-155,y:0,rotation:Math.PI,clearance:50};
    this.lake={x:95,z:20,r:26};this.pond={x:30,z:72,r:7};this.meadow={x:78,z:95,r:24};this.viewpoint={x:-62,z:-70};
    this.waterfall={x:18,z:113};this.cabin={x:118.2,z:3.1,hx:2.58,hz:3.08,y:.35};
    {const dx=this.lake.x-this.cabin.x,dz=this.lake.z-this.cabin.z;this.cabin.rotation=Math.atan2(-dz,dx);this.cabin.rootY=this.cabin.y-.40;}
    const q=Math.hypot(3,8);this.waterfall.dx=-3/q;this.waterfall.dz=8/q;
    this.stream=[[18,113],[21,105],[26,96],[27,86],[29,78],[30,72],[34,66],[48,58],[65,46.5],[78,36],[88,28]];
    this.walls=[[[12,46],[28,50],[44,43]],[[56,72],[58,90],[64,108]],[[104,-56],[116,-74],[126,-90]],[[-22,56],[-44,42],[-62,14]],[[140,6],[146,30],[140,52]]];
    this.paths=[[[0,12.25],[.6,18],[1.2,24],[8,34],[25,36],[45,30],[60,12],[70,-14],[92,-40],[118,-62],[134,-80],[151.2,-96]],[[45,30],[55,39],[65,46.5],[72,53],[76,66],[78,84]],[[8,34],[-12,42],[-38,26],[-52,-4],[-58,-38],[-61,-64]],[[76,66],[60,80],[44,92],[33,101],[27,106]],[[92,-40],[110,-22],[124,-4]],[[124,-4],[131,20],[121,46],[104,58],[92,74]],[[78.648,-24.221],[73.1,-29.3],[67.45,-33.75]],[[118,-62],[104,-84],[91,-108],[78,-128],[70,-138]]];
    this.bridge={x:65,z:46.5,dx:17/Math.hypot(17,14),dz:14/Math.hypot(17,14),half:5.2,w:.95};
    this.pathSamples=this.paths.map(P=>new THREE.CatmullRomCurve3(P.map(([x,z])=>new THREE.Vector3(x,0,z))).getSpacedPoints(260));
    const cabinEntry=this.cabinWorld(-1.31,6.25),cabinDock=this.cabinWorld(4.15,1.60);
    this.landmarks={gate:{x:.1,z:14.3,heading:0},lake:{x:72,z:28,heading:Math.PI/2},bridge:{x:65,z:46.5,heading:.88},meadow:{x:77,z:78,heading:0},viewpoint:{x:-60,z:-62,heading:Math.PI},cabin:{x:cabinEntry.x,z:cabinEntry.z,heading:this.cabin.rotation+Math.PI},cabinDock:{x:cabinDock.x,z:cabinDock.z,heading:this.cabin.rotation-Math.PI/2},waterfall:{x:28,z:103,heading:Math.PI},orangery:{x:69.2,z:-32.3,heading:this.orangery.rotation+Math.PI},stable:{x:70,z:-136,heading:Math.PI}};
    this.dynamic=[];this.treeXY=[];this.staticColliders=[];this.waterfallBoatRocks=[];
    this.bridgeCollisionSegments=[];this.waterBoundarySegments=[];this.waterCollisionGrid=new Map();this.waterCollisionCell=8;this.solidRects=[];this.slopeSafe=new WeakMap();
    this.cabinCollisionSegments=[];this.cabinDoorSegment=null;this.cabinDoorProgress=0;this.cabinAsset=null;this.cabinReady=null;
    this.buildTerrain();this.buildWater();this.buildSummerWaterVegetation();this.buildBridge();this.buildWaterCollision();this.buildForest();this.buildMeadow();this.buildViewpoint();this.buildWalls();this.buildCabin();this.buildPlots();this.buildSigns();this.buildWaterfall();this.buildAmbientLife();
  }

  pathDistance(x,z){let m=1e9;for(const P of this.paths)m=Math.min(m,segD(x,z,P));return m;}
  wallDistance(x,z){let m=1e9;for(const W of this.walls)m=Math.min(m,segD(x,z,W));return m;}
  streamDistance(x,z){return segD(x,z,this.stream);}
  isBoatNavigableWater(x,z){
    // R31: boat navigation is intentionally separate from player shoreline collision.
    // The authored lake already connects to the stream; this envelope follows that
    // visible water route to the waterfall basin without making disconnected ponds
    // or the global water plane boat-accessible.
    if(Math.hypot(x-this.lake.x,z-this.lake.z)<=this.lake.r-1.15)return true;
    if(this.streamDistance(x,z)<=2.05)return !this.waterfallBoatRocks.some(r=>Math.hypot(x-r.x,z-r.z)<r.r+.62);
    if(Math.hypot(x-this.waterfall.x,z-this.waterfall.z)<=4.55)return !this.waterfallBoatRocks.some(r=>Math.hypot(x-r.x,z-r.z)<r.r+.62);
    return false;
  }
  isBoatAtWaterfall(x,z){return Math.hypot(x-this.waterfall.x,z-this.waterfall.z)<=5.2;}

  cabinLocal(x,z){const c=this.cabin,dx=x-c.x,dz=z-c.z,co=Math.cos(c.rotation),si=Math.sin(c.rotation);return {x:co*dx-si*dz,z:si*dx+co*dz};}
  cabinWorld(lx,lz){const c=this.cabin,co=Math.cos(c.rotation),si=Math.sin(c.rotation);return {x:c.x+co*lx+si*lz,z:c.z-si*lx+co*lz};}
  isCabinHouseFloor(x,z,pad=0){const q=this.cabinLocal(x,z);return Math.abs(q.x)<=2.50+pad&&Math.abs(q.z)<=3.00+pad;}
  // R3: authored top-board envelopes measured directly from lake_cabin.glb.
  // Terrace boards: x 2.5075..4.4925 / z -3.0000..3.0000 at local y 0.50.
  // Pier boards:    x 4.5100..11.0900 / z 0.8809..2.3199 at local y 0.45.
  // These two physical footprints replace R2's oversized invisible walk corridor.
  isCabinTerraceDeck(x,z,pad=0){const q=this.cabinLocal(x,z);return q.x>=2.5075-pad&&q.x<=4.4925+pad&&q.z>=-3.0000-pad&&q.z<=3.0000+pad;}
  isCabinPierDeck(x,z,pad=0){const q=this.cabinLocal(x,z);return q.x>=4.5100-pad&&q.x<=11.0900+pad&&q.z>=0.8809-pad&&q.z<=2.3199+pad;}
  isCabinDeckFootprint(x,z,pad=0){return this.isCabinTerraceDeck(x,z,pad)||this.isCabinPierDeck(x,z,pad);}
  isCabinWalkableSurface(x,z,pad=0){return this.isCabinHouseFloor(x,z,pad)||this.isCabinDeckFootprint(x,z,pad);}
  cabinDeckHeight(x,z){if(this.isCabinHouseFloor(x,z,.02)||this.isCabinTerraceDeck(x,z,.02))return this.cabin.rootY+.50;if(this.isCabinPierDeck(x,z,.02))return this.cabin.rootY+.45;return -1e9;}
  cabinAccessBlendHeight(x,z,baseH){
    // R3 local land ramp: blend only the cabin's front/land-side terrain into the
    // terrace edge. No stairs, teleport or controller exception is introduced.
    const q=this.cabinLocal(x,z),centerX=3.15,deckY=this.cabin.rootY+.50;
    if(q.z<2.98||q.z>6.35||Math.abs(q.x-centerX)>1.50)return baseH;
    const along=1-smooth(3.02,6.20,q.z),across=1-smooth(.68,1.42,Math.abs(q.x-centerX)),w=along*across;
    return Math.max(baseH,mix(baseH,deckY-.015,w));
  }

  bridgeLocal(x,z){const b=this.bridge,lx=x-b.x,lz=z-b.z;return {u:lx*b.dx+lz*b.dz,v:-lx*b.dz+lz*b.dx};}
  isBridgeWalkCorridor(x,z,pad=0){const q=this.bridgeLocal(x,z),b=this.bridge;return Math.abs(q.u)<=b.half+1.15+pad&&Math.abs(q.v)<=Math.max(.12,b.w-.27)+pad;}
  resolveBarrierSegment(p,s,rr){
    const vx=s.bx-s.ax,vz=s.bz-s.az,den=vx*vx+vz*vz;let t=den?((p.x-s.ax)*vx+(p.z-s.az)*vz)/den:0;t=Math.max(0,Math.min(1,t));
    const cx=s.ax+vx*t,cz=s.az+vz*t,dx=p.x-cx,dz=p.z-cz,d=Math.hypot(dx,dz),R=rr+(s.half??0);
    if(d>=R)return;const len=Math.max(1e-5,Math.hypot(vx,vz)),nx=d>1e-5?dx/d:-vz/len,nz=d>1e-5?dz/d:vx/len;p.x=cx+nx*R;p.z=cz+nz*R;
  }
  resolveWaterSegment(p,s,rr){
    const vx=s.bx-s.ax,vz=s.bz-s.az,den=vx*vx+vz*vz;let t=den?((p.x-s.ax)*vx+(p.z-s.az)*vz)/den:0;t=Math.max(0,Math.min(1,t));
    const cx=s.ax+vx*t,cz=s.az+vz*t,d=Math.hypot(p.x-cx,p.z-cz),R=rr+(s.half??.025);if(d>=R)return;
    // Waterline segments carry an explicit normal that always points toward visible dry terrain.
    p.x=cx+s.nx*R;p.z=cz+s.nz*R;
  }
  indexWaterSegment(s){
    const c=this.waterCollisionCell,minX=Math.floor((Math.min(s.ax,s.bx)-1)/c),maxX=Math.floor((Math.max(s.ax,s.bx)+1)/c),minZ=Math.floor((Math.min(s.az,s.bz)-1)/c),maxZ=Math.floor((Math.max(s.az,s.bz)+1)/c);
    for(let ix=minX;ix<=maxX;ix++)for(let iz=minZ;iz<=maxZ;iz++){const k=ix+','+iz,a=this.waterCollisionGrid.get(k)||[];a.push(s);this.waterCollisionGrid.set(k,a);}
  }
  waterSegmentsNear(x,z){
    const c=this.waterCollisionCell,ix=Math.floor(x/c),iz=Math.floor(z/c),set=new Set();for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const s of this.waterCollisionGrid.get((ix+dx)+','+(iz+dz))||[])set.add(s);return set;
  }
  buildWaterCollision(){
    // Derive traversal from the same terrain-vs-water-plane relation that makes water visible.
    // This replaces the old lake circle / stream-radius approximations.
    const minX=4,maxX=132,minZ=-16,maxZ=128,step=.72,level=this.WL+.015;
    const F=(x,z)=>this.worldHeight(x,z)-level;
    const cross=(a,b,va,vb)=>{const d=va-vb,t=Math.abs(d)<1e-8?.5:va/d;return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];};
    const add=(A,B)=>{const dx=B[0]-A[0],dz=B[1]-A[1],L=Math.hypot(dx,dz);if(L<1e-4)return;let nx=-dz/L,nz=dx/L,mx=(A[0]+B[0])*.5,mz=(A[1]+B[1])*.5;if(F(mx+nx*.28,mz+nz*.28)<0){nx=-nx;nz=-nz;}const s={ax:A[0],az:A[1],bx:B[0],bz:B[1],nx,nz,half:.025,kind:'waterline'};this.waterBoundarySegments.push(s);this.indexWaterSegment(s);};
    for(let x=minX;x<maxX;x+=step)for(let z=minZ;z<maxZ;z+=step){
      const p0=[x,z],p1=[x+step,z],p2=[x+step,z+step],p3=[x,z+step],v0=F(...p0),v1=F(...p1),v2=F(...p2),v3=F(...p3),hits=[];
      if((v0<0)!=(v1<0))hits.push(cross(p0,p1,v0,v1));if((v1<0)!=(v2<0))hits.push(cross(p1,p2,v1,v2));if((v2<0)!=(v3<0))hits.push(cross(p2,p3,v2,v3));if((v3<0)!=(v0<0))hits.push(cross(p3,p0,v3,v0));
      if(hits.length===2)add(hits[0],hits[1]);else if(hits.length===4){const vc=F(x+step*.5,z+step*.5);if(vc<0){add(hits[0],hits[3]);add(hits[1],hits[2]);}else{add(hits[0],hits[1]);add(hits[2],hits[3]);}}
    }
    const b=this.bridge,toWorld=(u,v)=>({x:b.x+b.dx*u-b.dz*v,z:b.z+b.dz*u+b.dx*v});
    // The visible side rails/posts are physical. The deck and both ends remain open.
    for(const v of[-.95,.95]){const A=toWorld(-4.65,v),B=toWorld(4.65,v);this.bridgeCollisionSegments.push({ax:A.x,az:A.z,bx:B.x,bz:B.z,half:.055,kind:'bridge-rail'});}
  }
  resolveSharedWater(p,radius){
    if(this.isBridgeWalkCorridor(p.x,p.z,.04)||this.isCabinDeckFootprint(p.x,p.z,.035))return;
    for(let pass=0;pass<3;pass++)for(const s of this.waterSegmentsNear(p.x,p.z))this.resolveWaterSegment(p,s,radius);
  }
  resolveWaterfallFlow(p,radius){
    const W=this.waterfall,dx=p.x-W.x,dz=p.z-W.z,al=dx*W.dx+dz*W.dz,la=dx*W.dz-dz*W.dx,R=1.32+radius;
    if(al<4.8||al>10.2||Math.abs(la)>=R)return;const side=la>=0?1:-1,delta=side*R-la;p.x+=W.dz*delta;p.z-=W.dx*delta;
  }
  resolveSolidRect(p,r,radius){
    const qx=Math.min(r.maxX,Math.max(r.minX,p.x)),qz=Math.min(r.maxZ,Math.max(r.minZ,p.z)),dx=p.x-qx,dz=p.z-qz,d2=dx*dx+dz*dz;if(d2>radius*radius)return;
    if(d2>1e-9){const d=Math.sqrt(d2),k=(radius-d)/d;p.x+=dx*k;p.z+=dz*k;return;}
    const dl=Math.abs(p.x-r.minX),dr=Math.abs(r.maxX-p.x),db=Math.abs(p.z-r.minZ),df=Math.abs(r.maxZ-p.z),m=Math.min(dl,dr,db,df);if(m===dl)p.x=r.minX-radius;else if(m===dr)p.x=r.maxX+radius;else if(m===db)p.z=r.minZ-radius;else p.z=r.maxZ+radius;
  }
  terrainSlope(x,z){const e=.42,hx0=this.terrainHeight(x-e,z),hx1=this.terrainHeight(x+e,z),hz0=this.terrainHeight(x,z-e),hz1=this.terrainHeight(x,z+e);return Math.hypot((hx1-hx0)/(2*e),(hz1-hz0)/(2*e));}
  resolveSteepSlope(p){
    const core=Math.max(Math.abs(p.x)-18.5,Math.abs(p.z)-18.5,0);if(core<=0||this.isBridgeWalkCorridor(p.x,p.z,.2)||this.isCabinWalkableSurface(p.x,p.z,.25)||Math.hypot(p.x-this.orangery.x,p.z-this.orangery.z)<25||Math.hypot(p.x-this.cabin.x,p.z-this.cabin.z)<9){this.slopeSafe.set(p,{x:p.x,z:p.z});return;}
    const slope=this.terrainSlope(p.x,p.z),safe=this.slopeSafe.get(p);if(slope>1.70&&safe&&Math.hypot(p.x-safe.x,p.z-safe.z)<1.2){p.x=safe.x;p.z=safe.z;return;}if(slope<=1.70||!safe||Math.hypot(p.x-safe.x,p.z-safe.z)>2.5)this.slopeSafe.set(p,{x:p.x,z:p.z});
  }

  worldHeight(x,z){
    let amp=smooth(26,60,Math.hypot(x,z));
    amp*=smooth(30,58,Math.hypot(x-this.lake.x,z-this.lake.z))*smooth(10,26,Math.hypot(x-this.pond.x,z-this.pond.z));
    const sd=this.streamDistance(x,z);amp*=smooth(5,22,sd);amp*=.45+.55*smooth(3,14,this.pathDistance(x,z));
    let h=amp*Math.max(0,fbm2(x*.013+4,z*.013-2)-.32)*22;
    const dv=Math.hypot(x-this.viewpoint.x,z-this.viewpoint.z);h=Math.max(h,Math.min(15,18*Math.exp(-dv*dv/800)));
    const dW=Math.hypot(x-this.W0.x,z-this.W0.z),m=smooth(160,230,dW);h+=(m*m*55+m*(fbm2(x*.03+2,z*.03+7)-.3)*34)*.3;
    const wx=x-this.waterfall.x,wz=z-this.waterfall.z,wal=wx*this.waterfall.dx+wz*this.waterfall.dz,wla=Math.abs(wx*this.waterfall.dz-wz*this.waterfall.dx);
    h=Math.max(h,smooth(5,9.5,wal)*(1-smooth(9,17,wla))*(14+(fbm2(x*.2,z*.2)-.5)*2.5));
    h=mix(h,this.cabin.y,1-smooth(5,12,Math.hypot(x-this.cabin.x,z-this.cabin.z)));
    h=mix(h,this.orangery.y,1-smooth(18,24,Math.hypot(x-this.orangery.x,z-this.orangery.z)));
    h=mix(h,this.stable.y,1-smooth(43,52,Math.hypot(x-this.stable.x,z-this.stable.z)));
    const nl=(fbm2(x*.05+1,z*.05-4)-.5)*10;
    h=mix(h,this.WL-2.6,1-smooth(this.lake.r-7,this.lake.r+3,Math.hypot(x-this.lake.x,z-this.lake.z)+nl));
    h=mix(h,this.WL-1.4,1-smooth(this.pond.r-3,this.pond.r+2,Math.hypot(x-this.pond.x,z-this.pond.z)+nl*.3));
    h=mix(h,this.WL-.75,1-smooth(1.1,3.4,sd));
    h=mix(h,this.WL-1.2,1-smooth(3.5,6,Math.hypot(wx,wz)+nl*.2));
    return this.cabinAccessBlendHeight(x,z,h);
  }

  bridgeDeck(x,z){const b=this.bridge,lx=x-b.x,lz=z-b.z,u=lx*b.dx+lz*b.dz,v=-lx*b.dz+lz*b.dx;if(Math.abs(u)>b.half||Math.abs(v)>b.w)return -1e9;return .12+.5*Math.cos(u/b.half*Math.PI/2);}
  // R20: the full private garden no longer occupies the shared map. Keep only a
  // compact, rounded home pad under the character shed/front yard and blend quickly
  // back into natural WORLD terrain. The large R19 garden-sized flat square is gone.
  terrainHeight(x,z){
    const qx=Math.abs(x)-4.45,qz=Math.abs(z-5.15)-7.70;
    const ox=Math.max(qx,0),oz=Math.max(qz,0),signed=Math.hypot(ox,oz)+Math.min(Math.max(qx,qz),0);
    if(signed<=0)return 0;const h=this.worldHeight(x,z),blend=smooth(0,7.5,signed);return mix(0,h,blend);
  }
  groundHeight(x,z){return Math.max(this.terrainHeight(x,z),this.bridgeDeck(x,z),this.cabinDeckHeight(x,z));}

  worldColor(x,z,y,c){
    const CG={dark:C(0x4a6430),mid:C(0x67823c),dry:C(0x8d9853),soil:C(0x5e4d36),gravel:C(0xb4a585),grav2:C(0x9c8c6c)};
    const CW={meadow:C(0x93a653),forest:C(0x3c5328),rock:C(0x7d7a6e),rock2:C(0x9a968a),sand:C(0xa89a74),bed:C(0x4d5a45)};
    const n=fbm2(x*.06,z*.06),n2=vnoise(x*.6,5,z*.6);c.copy(CG.dark).lerp(CG.mid,n);c.lerp(CG.dry,smooth(.55,.85,n2)*.4);c.lerp(CW.forest,smooth(.48,.6,fbm2(x*.018+9,z*.018-3))*.55);c.lerp(CW.meadow,(1-smooth(this.meadow.r-8,this.meadow.r+4,Math.hypot(x-this.meadow.x,z-this.meadow.z)))*.75);c.lerp(CW.rock.clone().lerp(CW.rock2,n2),smooth(6,18,y)*smooth(150,185,Math.hypot(x-this.W0.x,z-this.W0.z)));c.lerp(CW.sand,(1-smooth(this.WL+.15,this.WL+.8,y))*.85);if(y<this.WL)c.lerp(CW.bed,smooth(this.WL,this.WL-1.5,y));const d=this.pathDistance(x,z)+(n2-.5)*.6;c.lerp(CG.soil,(1-smooth(1.2,2,d))*.5);c.lerp(CG.gravel.clone().lerp(CG.grav2,vnoise(x*2,1,z*2)),1-smooth(.9,1.4,d));c.lerp(CW.rock2,(1-smooth(3,7,Math.hypot(x-this.viewpoint.x,z-this.viewpoint.z)))*.6);return c;
  }

  buildTerrain(){
    const S=500,N=this.isTouch?220:300,g=new THREE.PlaneGeometry(S,S,N,N);g.rotateX(-Math.PI/2);g.translate(this.W0.x,0,this.W0.z);const p=g.attributes.position,a=new Float32Array(p.count*3),c=new THREE.Color();
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),z=p.getZ(i),y=this.terrainHeight(x,z);
      // PRIVATE_GARDEN_ROOT is hidden while the shared world is active, so the old
      // garden-ground underlap is no longer needed and the world surface stays exact.
      p.setY(i,y);this.worldColor(x,z,y,c);a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;
    }
    g.setAttribute('color',new THREE.BufferAttribute(a,3));g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0}));m.receiveShadow=true;m.name='WORLD_V2_CLAUDE_TERRAIN';this.scene.add(m);this.terrain=m;
    this.buildCabinTerrainBlend();this.buildStableTerrainBlend();
  }

  buildCabinTerrainBlend(){
    // The global touch terrain is intentionally low-poly. Add a cabin-local high-resolution
    // terrain patch so the analytic access blend and the rendered surface stay aligned on iPhone.
    const cx=3.15,cz=4.66,w=3.10,d=3.42,g=new THREE.PlaneGeometry(w,d,12,16);g.rotateX(-Math.PI/2);
    const p=g.attributes.position,a=new Float32Array(p.count*3),c=new THREE.Color();
    for(let i=0;i<p.count;i++){const lx=p.getX(i)+cx,lz=p.getZ(i)+cz,q=this.cabinWorld(lx,lz),y=this.worldHeight(q.x,q.z)+.008;p.setXYZ(i,q.x,y,q.z);this.worldColor(q.x,q.z,y,c);a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}
    g.setAttribute('color',new THREE.BufferAttribute(a,3));g.computeVertexNormals();
    const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0}));m.receiveShadow=true;m.name='WORLD_V2_CABIN_TERRAIN_BLEND_R3';this.scene.add(m);this.cabinTerrainBlend=m;
  }

  buildStableTerrainBlend(){
    // R23B: iPhone/global terrain is intentionally low-poly. The north approach
    // crosses the Stable flatten transition, where analytic character grounding
    // can otherwise sit above the visibly interpolated terrain. Render a local
    // high-resolution patch from the world approach through the Stable entrance
    // using the exact same terrainHeight() function as character grounding.
    const cx=82,cz=-124,w=46,d=58,g=new THREE.PlaneGeometry(w,d,30,40);g.rotateX(-Math.PI/2);
    const p=g.attributes.position,a=new Float32Array(p.count*3),c=new THREE.Color();
    for(let i=0;i<p.count;i++){
      const x=p.getX(i)+cx,z=p.getZ(i)+cz,y=this.terrainHeight(x,z)+.009;
      p.setXYZ(i,x,y,z);this.worldColor(x,z,y,c);a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;
    }
    g.setAttribute('color',new THREE.BufferAttribute(a,3));g.computeVertexNormals();
    const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0}));
    m.receiveShadow=true;m.name='WORLD_V2_STABLE_TERRAIN_BLEND_R23B';this.scene.add(m);this.stableTerrainBlend=m;
  }

  buildWater(){const g=new THREE.PlaneGeometry(500,500);g.rotateX(-Math.PI/2);const water=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x56747a,roughness:.08,metalness:.2,transparent:true,opacity:.86,envMapIntensity:1.4}));water.position.set(this.W0.x,this.WL,this.W0.z);water.receiveShadow=true;water.name='WORLD_V2_CLAUDE_WATER';this.scene.add(water);this.water=water;}

  buildSummerWaterVegetation(){
    // R32C: visual-only Summer water vegetation. It deliberately owns no collision,
    // progression, season state or gameplay logic. Placement follows the canonical
    // SharedLandscape lake / pond / stream / waterfall geometry.
    const url='./assets/environment/water/vegetation_10_summer.glb';
    this.waterVegetationRoot=new THREE.Group();this.waterVegetationRoot.name='WORLD_SUMMER_WATER_VEGETATION';this.scene.add(this.waterVegetationRoot);
    this.waterVegetationReady=new GLTFLoader().loadAsync(url).then(gltf=>{
      const catalog=gltf.scene,src={};
      // Claude's exported GLB wraps the ten Plant_XX_* catalog entries inside an
      // outer scene group, so inspect the full hierarchy rather than scene.children.
      catalog.traverse(n=>{const m=/^Plant_\d+_(.+)$/.exec(n.name||'');if(m&&n.children[0])src[m[1]]=n.children[0];});
      const seed=(()=>{let a=0x32a7f19d;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();
      const bridgeClear=(x,z)=>{const q=this.bridgeLocal(x,z),b=this.bridge;return Math.abs(q.u)<=b.half+1.8&&Math.abs(q.v)<=b.w+2.1;};
      const surfaceKinds=new Set(['lily','duckweed']);
      const add=(kind,x,z,targetY,scale=1,ry=0)=>{
        const base=src[kind];if(!base)return;if(Math.hypot(x-this.cabin.x,z-this.cabin.z)<12||bridgeClear(x,z))return;
        const o=base.clone(true);o.name='SummerWater_'+kind;o.position.set(x,0,z);o.rotation.y=ry;o.scale.setScalar(scale);
        o.traverse(q=>{if(q.isMesh){q.castShadow=true;q.receiveShadow=true;}});
        // R32D: ground by the clone's actual transformed bounds instead of assuming every
        // catalog plant has the same authored pivot. Rooted plants get a small geometry-
        // relative embed so low-poly terrain interpolation cannot leave a visible air gap.
        o.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(o),h=Math.max(.001,box.max.y-box.min.y);
        const embed=surfaceKinds.has(kind)?.012:Math.min(.11,Math.max(.025,h*.035));
        o.position.y+=targetY-box.min.y-embed;
        this.waterVegetationRoot.add(o);
      };
      const ring=(c,r,kinds,count,water=false)=>{for(let i=0;i<count;i++){const a=(i/count)*Math.PI*2+(seed()-.5)*.35,rr=r+(seed()-.5)*2.2,x=c.x+Math.cos(a)*rr,z=c.z+Math.sin(a)*rr,kind=kinds[i%kinds.length];
        // Lily/duckweed are surface plants. Pondweed/hornwort are rooted aquatic plants
        // and must use the actual bed height rather than being placed at the water surface.
        const y=water&&surfaceKinds.has(kind)?this.WL:this.worldHeight(x,z);add(kind,x,z,y,.78+seed()*.42,seed()*6.283);}};
      const tallCluster=(cx,cz,count=4,spread=1.25)=>{for(let j=0;j<count;j++){const a=seed()*Math.PI*2,r=Math.sqrt(seed())*spread,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r,roll=seed(),kind=roll<.48?'reed':roll<.78?'bulrush':roll<.9?'meadowsweet':'marigold';add(kind,x,z,this.worldHeight(x,z),.78+seed()*.34,seed()*6.283);}};
      const shoreClusters=(c,r,count)=>{for(let i=0;i<count;i++){const a=(i/count)*Math.PI*2+(seed()-.5)*.65,rr=r+(seed()-.5)*1.6,cx=c.x+Math.cos(a)*rr,cz=c.z+Math.sin(a)*rr;tallCluster(cx,cz,3+Math.floor(seed()*3),1.05+seed()*.55);}};
      ring(this.lake,this.lake.r-5.0,['lily','duckweed'],12,true);
      shoreClusters(this.lake,this.lake.r-.9,7);
      ring(this.pond,this.pond.r-2.0,['lily','duckweed','pondweed'],8,true);
      shoreClusters(this.pond,this.pond.r-.35,4);
      for(let i=1;i<this.stream.length-1;i++){const [x,z]=this.stream[i],p=this.stream[i-1],n=this.stream[i+1],dx=n[0]-p[0],dz=n[1]-p[1],L=Math.max(.001,Math.hypot(dx,dz)),nx=-dz/L,nz=dx/L;for(const side of[-1,1]){if(seed()<.3)continue;const off=3.05+seed()*.9,cx=x+nx*off*side,cz=z+nz*off*side;if(bridgeClear(cx,cz))continue;tallCluster(cx,cz,2+Math.floor(seed()*3),.72+seed()*.5);}}
      const W=this.waterfall,ax=W.dx,az=W.dz,lx=az,lz=-ax;for(let i=0;i<12;i++){const al=1.2+seed()*7.2,side=i%2?-1:1,la=side*(3.1+seed()*1.6),x=W.x+ax*al+lx*la,z=W.z+az*al+lz*la;add(i%4===0?'mossrock':i%3===0?'fern':i%2?'meadowsweet':'reed',x,z,this.worldHeight(x,z),.72+seed()*.38,seed()*6.283);}
      return this.waterVegetationRoot;
    }).catch(err=>{console.warn('Summer water vegetation failed to load',err);return null;});
  }

  buildBridge(){
    const b=this.bridge,bp=[],ry=-Math.atan2(b.dz,b.dx),deck=u=>.12+.5*Math.cos(u/b.half*Math.PI/2),slope=u=>-.5*Math.PI/(2*b.half)*Math.sin(u/b.half*Math.PI/2);
    const box=(w,hh,d,u,y,v,rz=0)=>{const g=new THREE.BoxGeometry(w,hh,d);g.rotateZ(rz);g.rotateY(ry);g.translate(b.x+b.dx*u-b.dz*v,y,b.z+b.dz*u+b.dx*v);bp.push(g);};
    for(let u=-b.half+.16;u<b.half;u+=.33)box(.29,.07,1.9,u,deck(u)-.035,0,Math.atan(slope(u)));
    for(const v of [-.62,.62])for(let u=-b.half;u<b.half-.01;u+=1.3){const u2=u+1.3,um=(u+u2)/2;box(1.34,.12,.12,um,deck(um)-.12,v,Math.atan((deck(u2)-deck(u))/1.3));}
    const posts=[-4.6,-1.6,1.6,4.6];for(const v of [-.95,.95]){posts.forEach(u=>box(.1,.85,.1,u,deck(u)+.38,v));for(let i=0;i<posts.length-1;i++){const a=posts[i],bb=posts[i+1],um=(a+bb)/2;box(bb-a+.1,.07,.07,um,(deck(a)+deck(bb))/2+.76,v,Math.atan((deck(bb)-deck(a))/(bb-a)));}}
    const bm=new THREE.Mesh(mergeGeometries(bp),new THREE.MeshStandardMaterial({color:0x8b7862,roughness:.85}));bm.castShadow=bm.receiveShadow=true;bm.name='WORLD_V2_CLAUDE_BRIDGE';this.scene.add(bm);this.bridgeMesh=bm;
  }

  coniferGeo(seed,low=false){const parts=[],tr=prep(new THREE.CylinderGeometry(.08,.14,1,low?4:6),0x4a3b2c);tr.translate(0,.4,0);parts.push(tr);const tiers=low?[[1.2,2.2,.55],[.75,2.3,2.05]]:[[1.25,1.45,.55],[.98,1.45,1.33],[.71,1.45,2.11],[.44,1.45,2.89]];tiers.forEach(([r,hh,y],k)=>{let g=new THREE.ConeGeometry(r,hh,low?7:9,low?1:3);if(!low){g.deleteAttribute('uv');g.deleteAttribute('normal');g=mergeVertices(g);const p=g.attributes.position;for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),q=1+(vnoise(px*2+seed+k,py*2,pz*2)-.5)*.35;p.setXYZ(i,px*q,py-(py<-hh*.4?vnoise(px*3,k,pz*3)*.25:0),pz*q);}g.computeVertexNormals();}shadeAO(g,0x24361f,0x5a7040,{hw:.5,jit:.1,seed:seed+k});g.translate(0,y+hh*.5,0);parts.push(prep(g));});return mergeGeometries(parts);}
  roundGeo(seed,low=false){const tr=prep(new THREE.CylinderGeometry(.12,.2,2.2,low?5:7),0x5a4632);tr.translate(0,1.1,0);if(low){const g=blobGeo(1.5,0,seed,.18,1.6);shadeAO(g,0x354d25,0x8ba35a,{hw:.4,jit:.08});g.translate(0,2.6,0);return mergeGeometries([tr,prep(g)]);}const bl=[];for(let k=0;k<4;k++){const g=blobGeo(.9+this.rand()*.4,1,seed+k,.22,1.6);g.translate((this.rand()-.5)*1.4,1.9+.1+this.rand()*.9,(this.rand()-.5)*1.4);bl.push(prep(g));}const cg=mergeGeometries(bl);shadeAO(cg,0x354d25,0x8ba35a,{hw:.4,jit:.12,pow:1.2});return mergeGeometries([tr,cg]);}

  buildForest(){
    const T=[this.coniferGeo(1.3),this.coniferGeo(8.1),this.coniferGeo(15.7),this.coniferGeo(22.9),this.roundGeo(31),this.roundGeo(47)],items=T.map(()=>[]),MAX=this.isTouch?760:1200;let n=0,tries=0;
    const forestAt=(x,z,r)=>r>150?1:Math.max(.08,smooth(.44,.56,fbm2(x*.018+9,z*.018-3)));
    while(n<MAX&&tries<42000){tries++;const a=this.rand()*6.283,r=Math.sqrt(this.rand())*205,x=this.W0.x+Math.cos(a)*r,z=this.W0.z+Math.sin(a)*r;if(this.rand()>forestAt(x,z,r))continue;if(Math.abs(x)<10.5&&z>-7&&z<19)continue;if(this.pathDistance(x,z)<3.5||this.streamDistance(x,z)<4)continue;if(Math.hypot(x-this.lake.x,z-this.lake.z)<this.lake.r+5||Math.hypot(x-this.pond.x,z-this.pond.z)<this.pond.r+4||Math.hypot(x-this.meadow.x,z-this.meadow.z)<this.meadow.r+2||Math.hypot(x-this.viewpoint.x,z-this.viewpoint.z)<14||Math.hypot(x-this.waterfall.x,z-this.waterfall.z)<11||Math.hypot(x-this.cabin.x,z-this.cabin.z)<10||Math.hypot(x-this.orangery.x,z-this.orangery.z)<this.orangery.clearance||Math.hypot(x-this.stable.x,z-this.stable.z)<this.stable.clearance||this.wallDistance(x,z)<2.5)continue;const y=this.worldHeight(x,z);if(y<this.WL+.4||y>30)continue;const k=this.rand()<.78?Math.floor(this.rand()*4):4+Math.floor(this.rand()*2),s=(.9+this.rand()*.9)*(r>150?1.35:1);items[k].push({x,y:y-.1,z,ry:this.rand()*6.28,s});this.treeXY.push(x,z);if(r<185)this.world.addObstacle({x,z,r:(k<4?1.22:.28)*s,height:3.2*s,kind:k<4?'world-conifer':'world-tree'});n++;}
    const mat=patchMaterial(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}),{wind:.012,uTime:this.uTime,rim:0x223314,rimPower:2.7}),o=new THREE.Object3D();
    T.forEach((g,k)=>{if(!items[k].length)return;const inst=new THREE.InstancedMesh(g,mat,items[k].length);items[k].forEach((it,i)=>{o.position.set(it.x,it.y,it.z);o.rotation.y=it.ry;o.scale.setScalar(it.s);o.updateMatrix();inst.setMatrixAt(i,o.matrix);});inst.castShadow=true;inst.receiveShadow=true;inst.name='WORLD_V2_CLAUDE_FOREST';this.scene.add(inst);});
  }

  buildMeadow(){const st=prep(new THREE.CylinderGeometry(.006,.008,.3,3),0x5f7a3a);st.translate(0,.15,0);const hd=prep(new THREE.IcosahedronGeometry(.035,0),0xffffff);hd.translate(0,.31,0);const fl=mergeGeometries([st,hd]),pal=[0xf4f1e6,0xf0d35a,0xb89bd6,0xe9a3a8,0xf4f1e6].map(C),fi=[];for(let i=0;i<(this.isTouch?2600:4200);i++){const a=this.rand()*6.283,r=Math.sqrt(this.rand())*(this.meadow.r+3),x=this.meadow.x+Math.cos(a)*r,z=this.meadow.z+Math.sin(a)*r;if(this.pathDistance(x,z)<1.2)continue;const y=this.worldHeight(x,z);if(y<this.WL+.3)continue;fi.push({x,y,z,ry:this.rand()*6.28,rx:(this.rand()-.5)*.3,s:.8+this.rand()*.6,c:pal[Math.floor(this.rand()*pal.length)]});}const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8}),inst=new THREE.InstancedMesh(fl,m,fi.length),o=new THREE.Object3D();fi.forEach((it,i)=>{o.position.set(it.x,it.y,it.z);o.rotation.set(it.rx,it.ry,0);o.scale.setScalar(it.s);o.updateMatrix();inst.setMatrixAt(i,o.matrix);inst.setColorAt(i,it.c);});inst.name='WORLD_V2_CLAUDE_MEADOW';this.scene.add(inst);}

  buildViewpoint(){const sm=new THREE.MeshStandardMaterial({color:0x8e8a7e,roughness:.9,flatShading:true}),vy=this.worldHeight(this.viewpoint.x,this.viewpoint.z);for(let i=0;i<9;i++){const a=i/9*6.283+(this.rand()-.5)*.4,r=3.2+this.rand()*2.3,x=this.viewpoint.x+Math.cos(a)*r,z=this.viewpoint.z+Math.sin(a)*r,s=.35+this.rand()*.55,m=new THREE.Mesh(new THREE.IcosahedronGeometry(s,0),sm);m.position.set(x,this.worldHeight(x,z)+s*.2,z);m.scale.y=.6;m.rotation.set(this.rand()*3,this.rand()*3,0);m.castShadow=m.receiveShadow=true;this.scene.add(m);this.world.addObstacle({x,z,r:s*.9,height:s,kind:'viewpoint-rock'});}let cy=vy-.05;for(const s of [.55,.44,.34,.24]){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(s,0),sm);m.position.set(this.viewpoint.x+(this.rand()-.5)*.1,cy+s*.55,this.viewpoint.z);m.scale.y=.62;m.rotation.y=this.rand()*3;m.castShadow=true;this.scene.add(m);cy+=s*1.1*.62;}this.world.addObstacle({x:this.viewpoint.x,z:this.viewpoint.z,r:.6,height:1.6,kind:'viewpoint-cairn'});}

  buildWalls(){const sg=prep(stoneGeo(3.3,1),0xffffff),items=[],moss=C(0x6f7d4c),wr=(()=>{let a=99;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();for(const W of this.walls)for(let i=0;i<W.length-1;i++){const [ax,az]=W[i],[bx,bz]=W[i+1],L=Math.hypot(bx-ax,bz-az),ry=Math.atan2(bx-ax,bz-az);let k=0;for(let s=0;s<L;s+=.55,k++){const q=s/L,x=ax+(bx-ax)*q+(wr()-.5)*.15,z=az+(bz-az)*q+(wr()-.5)*.15;if(this.pathDistance(x,z)<2.4||this.streamDistance(x,z)<3.5)continue;const y=this.worldHeight(x,z);if(y<this.WL+.2)continue;const g=.5+wr()*.25,c=new THREE.Color().setRGB(g,g*.98,g*.92).lerp(moss,wr()*.3);items.push({x,y:y+.1,z,ry:ry+wr()*3,rx:(wr()-.5)*.4,sv:[.42+wr()*.12,.34+wr()*.08,.36+wr()*.1],c});if(wr()<.82)items.push({x:x+(wr()-.5)*.2,y:y+.42,z:z+(wr()-.5)*.2,ry:wr()*6,sv:[.3+wr()*.1,.22+wr()*.06,.28+wr()*.08],c:c.clone().multiplyScalar(1.08)});if(k%2===0)this.world.addObstacle({x,z,r:.48,height:.7,kind:'dry-stone-wall'});}}const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:true}),inst=new THREE.InstancedMesh(sg,mat,items.length),o=new THREE.Object3D();items.forEach((it,i)=>{o.position.set(it.x,it.y,it.z);o.rotation.set(it.rx||0,it.ry||0,0);o.scale.set(...it.sv);o.updateMatrix();inst.setMatrixAt(i,o.matrix);inst.setColorAt(i,it.c);});inst.castShadow=true;inst.receiveShadow=true;inst.name='WORLD_V2_CLAUDE_DRY_STONE_WALLS';this.scene.add(inst);}

  buildCabin(){
    // Cabin 1:1 replacement: exact user-supplied GLB, authored at scale 1.
    // Local +X is the pier direction and is rotated toward the existing lake.
    const X=2.58,Z=3.08,doorL=-1.90,doorR=-.70;
    this.cabinCollisionSegments=[
      {ax:-X,az:-Z,bx:X,bz:-Z,half:.055,kind:'cabin-wall'},
      {ax:-X,az:-Z,bx:-X,bz:Z,half:.055,kind:'cabin-wall'},
      {ax:X,az:-Z,bx:X,bz:Z,half:.055,kind:'cabin-wall'},
      {ax:-X,az:Z,bx:doorL,bz:Z,half:.055,kind:'cabin-front'},
      {ax:doorR,az:Z,bx:X,bz:Z,half:.055,kind:'cabin-front'},
      // R5: invisible traversal guards follow the authored pier deck envelope exactly.
      // Keep the terrace connection open; only the two water-facing long sides and outer end
      // are blocked so a running player cannot leave the deck directly into deep water.
      {ax:4.3800,az:.8809,bx:11.0900,bz:.8809,half:.035,kind:'cabin-pier-edge'},
      {ax:4.5100,az:2.3199,bx:11.0900,bz:2.3199,half:.025,kind:'cabin-pier-edge'},
      {ax:11.0900,az:.8809,bx:11.0900,bz:2.3199,half:.025,kind:'cabin-pier-end'},
      // R12: user-marked rail is on the +Z terrace corner, from the outside corner
      // inward to the pier opening. The lower pier seam stays protected by the extended
      // pier-edge segment above; this collision follows the visible new rail exactly.
      {ax:4.4200,az:2.3200,bx:4.4200,bz:3.0000,half:.055,kind:'cabin-corner-rail'},
      // Fishing R7: visible terrace handrails/posts measured from lake_cabin.glb.
      {ax:2.7250,az:-2.9500,bx:4.4750,bz:-2.9500,half:.055,kind:'cabin-rail'},
      {ax:4.4200,az:-2.9700,bx:4.4200,bz:.6200,half:.055,kind:'cabin-rail'},
      {ax:2.7000,az:1.2650,bx:2.7000,bz:2.7950,half:.055,kind:'cabin-rail'}
    ];
    this.cabinDoorSegment={ax:doorL,az:Z,bx:doorR,bz:Z,half:.04,kind:'cabin-door'};
    this.cabinAsset=new CabinAssetSystem(this.scene,{x:this.cabin.x,z:this.cabin.z,rootY:this.cabin.rootY,rotation:this.cabin.rotation,waterY:this.WL,localWaterY:-.18});
    this.cabinReady=this.cabinAsset.init().catch(err=>{console.error('Lake cabin asset failed to load',err);return null;});
  }

  resolveCabinCollisions(p,radius){
    if(Math.hypot(p.x-this.cabin.x,p.z-this.cabin.z)>18)return;
    const q=this.cabinLocal(p.x,p.z);
    for(let pass=0;pass<2;pass++){
      for(const seg of this.cabinCollisionSegments)this.resolveBarrierSegment(q,seg,radius);
      if(this.cabinDoorSegment)this.resolveBarrierSegment(q,this.cabinDoorSegment,radius);
    }
    const w=this.cabinWorld(q.x,q.z);p.x=w.x;p.z=w.z;
  }

  updateCabin(dt,playerPos){
    // Cabin R2: door + hatch intentionally stay closed/non-interactive until the
    // fishing-hub gameplay/interior exists. Authored clips remain stored in the asset.
    this.cabinDoorProgress=0;
    this.cabinAsset?.update(dt);
  }

  buildPlots(){const PLOTS=[],pr=(()=>{let a=4242;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();let tries=0;while(PLOTS.length<30&&tries<16000){tries++;const a=pr()*6.283,r=Math.sqrt(pr())*160,x=this.W0.x+Math.cos(a)*r,z=this.W0.z+Math.sin(a)*r;if(Math.hypot(x-this.lake.x,z-this.lake.z)<this.lake.r+22||Math.hypot(x-this.pond.x,z-this.pond.z)<this.pond.r+22||Math.hypot(x-this.meadow.x,z-this.meadow.z)<this.meadow.r+14||Math.hypot(x-this.viewpoint.x,z-this.viewpoint.z)<30||Math.hypot(x-this.waterfall.x,z-this.waterfall.z)<28||Math.hypot(x-this.cabin.x,z-this.cabin.z)<26||Math.hypot(x-this.orangery.x,z-this.orangery.z)<34||Math.hypot(x-this.stable.x,z-this.stable.z)<58)continue;if(this.streamDistance(x,z)<22||this.pathDistance(x,z)<18||this.wallDistance(x,z)<18||Math.hypot(x,z)<44||PLOTS.some(P=>Math.hypot(x-P.x,z-P.z)<34))continue;PLOTS.push({x,z});}this.plots=PLOTS;const post=prep(new THREE.CylinderGeometry(.045,.055,1,6),0x9a8468);post.translate(0,.5,0);const tape=prep(new THREE.CylinderGeometry(.06,.06,.1,6),0xd9a441);tape.translate(0,.86,0);const g=mergeGeometries([post,tape]),it=[],o=new THREE.Object3D();for(const P of PLOTS)for(const [sx,sz] of[[-1,-1],[1,-1],[1,1],[-1,1]]){const x=P.x+sx*14,z=P.z+sz*14;it.push({x,y:this.worldHeight(x,z)-.05,z,ry:hash(z,2,x)*6,rz:(hash(x,1,z)-.5)*.12});}const inst=new THREE.InstancedMesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}),it.length);it.forEach((q,i)=>{o.position.set(q.x,q.y,q.z);o.rotation.set(0,q.ry,q.rz);o.updateMatrix();inst.setMatrixAt(i,o.matrix);});inst.castShadow=true;inst.name='WORLD_V2_CLAUDE_RESERVED_PLOTS';this.scene.add(inst);}

  buildSigns(){const SIGNS=[{at:[8,34],to:[['Home',1.2,24],['Viewpoint',-12,42],['Lake',25,36]]},{at:[45,30],to:[['Meadow',55,39],['Far garden',60,12],['Home',25,36]]},{at:[76,66],to:[['Meadow',78,84],['Waterfall',60,80],['Bridge',72,53]]},{at:[92,-40],to:[['Orangery',60,-40],['Cabin',110,-22],['Far garden',118,-62],['Home',70,-14]]},{at:[124,-4],to:[['Cabin',this.cabin.x,this.cabin.z],['Meadow',131,20],['Far garden',110,-22]]}],wood=new THREE.MeshStandardMaterial({color:0x5a4a39,roughness:.9});for(const S of SIGNS){let px=S.at[0],pz=S.at[1];for(let k=0;k<16;k++){const a=k/16*6.283,x=S.at[0]+Math.cos(a)*2.4,z=S.at[1]+Math.sin(a)*2.4;if(this.pathDistance(x,z)>1.9&&this.worldHeight(x,z)>this.WL+.3){px=x;pz=z;break;}}const y=this.worldHeight(px,pz),post=new THREE.Mesh(new THREE.BoxGeometry(.12,1.9,.12),wood);post.position.set(px,y+.9,pz);post.castShadow=true;this.scene.add(post);this.world.addObstacle({x:px,z:pz,r:.14,height:1.9,kind:'signpost'});S.to.forEach(([lab,tx,tz],i)=>{const c=document.createElement('canvas');c.width=512;c.height=112;const x=c.getContext('2d');x.fillStyle='#4a3d2f';x.fillRect(0,0,512,112);x.fillStyle='#efe8d8';x.font='600 50px Manrope, system-ui, sans-serif';x.textBaseline='middle';x.textAlign='right';x.fillText(lab,426,58);x.beginPath();x.moveTo(448,34);x.lineTo(472,56);x.lineTo(448,78);x.lineWidth=9;x.strokeStyle='#efe8d8';x.lineJoin='round';x.lineCap='round';x.stroke();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const g=new THREE.BoxGeometry(1.15,.25,.04),m=new THREE.Mesh(g,[wood,wood,wood,wood,new THREE.MeshStandardMaterial({map:t,roughness:.85}),new THREE.MeshStandardMaterial({map:t,roughness:.85})]);m.position.set(px,y+1.62-i*.3,pz);m.rotation.y=Math.atan2(-(tz-pz),tx-px);m.castShadow=true;this.scene.add(m);});}}

  buildWaterfall(){const WF=this.waterfall,ax=WF.dx,az=WF.dz,lx=az,lz=-ax,N=18,pos=[],uv=[],idx=[];for(let i=0;i<=N;i++){const q=i/N,al=5+q*4.9,cx=WF.x+ax*al,cz=WF.z+az*al,y=Math.max(this.worldHeight(cx,cz),this.WL-.05),o=.45+Math.sin(q*Math.PI)*.3;for(let j=0;j<=1;j++){const s=(j*2-1)*1.3*(.85+.15*q);pos.push(cx-ax*o+lx*s,y,cz-az*o+lz*s);uv.push(j,q);}}for(let i=0;i<N;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);const mat=new THREE.MeshStandardMaterial({color:0x9fbcc0,transparent:true,opacity:.72,roughness:.18,metalness:.06,side:THREE.DoubleSide,depthWrite:false}),wm=new THREE.Mesh(g,mat);wm.renderOrder=2;wm.name='WORLD_V2_CLAUDE_WATERFALL';this.scene.add(wm);const fc={x:WF.x+ax*4.2,z:WF.z+az*4.2},foam=new THREE.Mesh(new THREE.CircleGeometry(2.4,32),new THREE.MeshBasicMaterial({color:0xeef2ef,transparent:true,opacity:.30,depthWrite:false}));foam.rotation.x=-Math.PI/2;foam.position.set(fc.x,this.WL+.03,fc.z);this.scene.add(foam);const rm=new THREE.MeshStandardMaterial({color:0x7e7a70,roughness:.95,flatShading:true});[[3.6,-2.2,.9],[3.2,2.4,1.1],[6,-2.3,1],[6.8,2.4,.9],[8.6,-2.1,.8],[9.3,2.2,.95]].forEach(([al,la,s],i)=>{const x=WF.x+ax*al+lx*la,z=WF.z+az*al+lz*la,m=new THREE.Mesh(stoneGeo(i*3.7+1),rm);m.scale.setScalar(s);m.position.set(x,this.worldHeight(x,z)+s*.15,z);m.rotation.y=i;m.castShadow=m.receiveShadow=true;this.scene.add(m);const r=s*.9;this.waterfallBoatRocks.push({x,z,r});this.world.addObstacle({x,z,r,height:s*1.2,kind:'waterfall-rock'});});const glowTex=radialTex([[0,'rgba(228,238,240,.8)'],[1,'rgba(228,238,240,0)']]);const mn=this.isTouch?22:34,mp=new Float32Array(mn*3),ml=new Float32Array(mn);for(let i=0;i<mn;i++)ml[i]=this.rand()*2;const mg=new THREE.BufferGeometry();mg.setAttribute('position',new THREE.BufferAttribute(mp,3));const mist=new THREE.Points(mg,new THREE.PointsMaterial({map:glowTex,color:0xe4eef0,size:1.3,transparent:true,opacity:.22,depthWrite:false}));mist.frustumCulled=false;this.scene.add(mist);this.waterfallFx={mist,mp,ml,mn,fc};}

  duckGeo(male){const body=blobGeo(1,1,male?3:7,.06,1.4,1);body.scale(.16,.11,.25);body.translate(0,.05,0);const tail=new THREE.ConeGeometry(.07,.14,5);tail.rotateX(-Math.PI/2+.5);tail.translate(0,.1,-.25);const head=new THREE.SphereGeometry(.075,10,8);head.translate(0,.2,.17);const beak=new THREE.BoxGeometry(.05,.022,.08);beak.translate(0,.19,.26);return mergeGeometries([prep(body,male?0x8f877a:0x8a6b4a),prep(tail,male?0x3a3a38:0x6d5238),prep(head,male?0x2e5a40:0x7a5c3e),prep(beak,male?0xd6b24a:0xc88a3a)]);}
  buildAmbientLife(){const dm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7}),G=[this.duckGeo(true),this.duckGeo(false)];this.ducks=[];const add=(c,R1,R2,n)=>{for(let i=0;i<n;i++){const m=new THREE.Mesh(G[i%2],dm);m.castShadow=true;this.scene.add(m);this.ducks.push({m,c,R1:R1*(.6+this.rand()*.4),R2:R2*(.6+this.rand()*.4),s:(.018+this.rand()*.012)*(this.rand()<.5?-1:1),ph:this.rand()*6.28});}};add(this.lake,12,11,5);add(this.pond,2.6,2.6,2);for(const d of this.ducks)d.s*=12/Math.max(d.R1,3);
    const glowTex=radialTex([[0,'rgba(255,244,220,.95)'],[1,'rgba(255,244,220,0)']]);const n=this.isTouch?28:42,p=new Float32Array(n*3),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));const pts=new THREE.Points(g,new THREE.PointsMaterial({map:glowTex,size:.10,color:0xf1d982,transparent:true,opacity:.65,depthWrite:false}));pts.frustumCulled=false;this.scene.add(pts);const a=[];for(let i=0;i<n;i++){const r=this.rand(),G=r<.6?{x:this.meadow.x,z:this.meadow.z,r:18}:{x:0,z:0,r:9};a.push({x:G.x+(this.rand()-.5)*G.r,z:G.z+(this.rand()-.5)*G.r,r:1.5+this.rand()*2.5,f1:.15+this.rand()*.2,f2:.15+this.rand()*.2,ph:this.rand()*6.28,ph2:this.rand()*6.28});}this.butterflies={pts,p,a,n};}

  update(dt,t,playerPos){this.updateCabin(dt,playerPos);for(const d of this.ducks){const a=t*d.s+d.ph,p={x:d.c.x+Math.cos(a)*d.R1+Math.sin(a*3)*.4,z:d.c.z+Math.sin(a)*d.R2},q={x:d.c.x+Math.cos(a+.01*Math.sign(d.s))*d.R1,z:d.c.z+Math.sin(a+.01*Math.sign(d.s))*d.R2};d.m.position.set(p.x,this.WL-.03+Math.sin(t*2+d.ph)*.012,p.z);d.m.rotation.y=Math.atan2(q.x-p.x,q.z-p.z);}if(this.waterfallFx){const W=this.waterfallFx;for(let i=0;i<W.mn;i++){W.ml[i]+=dt;if(W.ml[i]>2.2)W.ml[i]=0;const l=W.ml[i],a=i*2.4;W.mp[i*3]=W.fc.x+Math.cos(a)*(.6+l*.9);W.mp[i*3+1]=this.WL+.2+l*.9;W.mp[i*3+2]=W.fc.z+Math.sin(a)*(.6+l*.9)-this.waterfall.dz*l*.8;}W.mist.geometry.attributes.position.needsUpdate=true;}if(this.butterflies){const B=this.butterflies;for(let i=0;i<B.n;i++){const b=B.a[i],x=b.x+Math.sin(t*b.f1+b.ph)*b.r+Math.sin(t*1.3+b.ph2)*.4,z=b.z+Math.cos(t*b.f2+b.ph2)*b.r+Math.cos(t*1.1+b.ph)*.4,y=this.groundHeight(x,z)+.65+Math.sin(t*1.7+b.ph)*.3;B.p[i*3]=x;B.p[i*3+1]=y;B.p[i*3+2]=z;}B.pts.geometry.attributes.position.needsUpdate=true;}}

  resolveCollisions(p,radius=.30){
    // World Physics Pass 1: geometry-aligned traversal.
    for(let pass=0;pass<2;pass++)for(const s of this.bridgeCollisionSegments)this.resolveBarrierSegment(p,s,radius);
    for(const r of this.solidRects)this.resolveSolidRect(p,r,radius);
    this.resolveCabinCollisions(p,radius);
    this.resolveWaterfallFlow(p,radius);
    this.resolveSharedWater(p,radius);
    const wx=p.x-this.W0.x,wz=p.z-this.W0.z,d=Math.hypot(wx,wz);if(d>this.worldRadius-radius){const k=(this.worldRadius-radius)/Math.max(d,1e-4);p.x=this.W0.x+wx*k;p.z=this.W0.z+wz*k;}
    this.resolveSteepSlope(p);
  }
}
