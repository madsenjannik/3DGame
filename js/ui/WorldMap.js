// worldmap.js — in-game minimap + fullscreen world map (M). No dependencies.
// World coords = SharedLandscape.js coords (x right/east, z down/south, metres). Heading h: forward = (sin h, cos h) = three.js rotation.y.
let W0={x:60,z:-40},WL=-.9,HALF=250,WR=188;
let ORG={x:60,z:-40,rot:0.8685393952858896,r:12},LK={x:95,z:20,r:26},PD={x:30,z:72,r:7},MD={x:78,z:95,r:24},VP={x:-62,z:-70};
let WF={x:18,z:113,dx:-3/Math.hypot(3,8),dz:8/Math.hypot(3,8)},CAB={x:118.2,z:3.1,hx:2.58,hz:3.08,y:.35};CAB.rot=Math.atan2(-(LK.z-CAB.z),LK.x-CAB.x);
let BR={x:65,z:46.5,dx:17/Math.hypot(17,14),dz:14/Math.hypot(17,14),half:5.2,w:.95};
let STREAM=[[18,113],[21,105],[26,96],[27,86],[29,78],[30,72],[34,66],[48,58],[65,46.5],[78,36],[88,28]];
let WALLS=[[[12,46],[28,50],[44,43]],[[56,72],[58,90],[64,108]],[[104,-56],[116,-74],[126,-90]],[[-22,56],[-44,42],[-62,14]],[[140,6],[146,30],[140,52]]];
let PATHS=[[[0,12.25],[.6,18],[1.2,24],[8,34],[25,36],[45,30],[60,12],[70,-14],[92,-40],[118,-62],[134,-80],[151.2,-96]],[[45,30],[55,39],[65,46.5],[72,53],[76,66],[78,84]],[[8,34],[-12,42],[-38,26],[-52,-4],[-58,-38],[-61,-64]],[[76,66],[60,80],[44,92],[33,101],[27,106]],[[92,-40],[110,-22],[124,-4]],[[124,-4],[131,20],[121,46],[104,58],[92,74]],[[78.648,-24.221],[73.1,-29.3],[67.45,-33.75]],[[92,-40],[84,-76],[75,-110],[70,-133],[70,-150]]];
let STB={x:70,z:-165},STC={x:70,z:-172,r:30};
let extHeight=null;
const P=4; // base canvas px per metre (2000×2000)

// Optional: read live values from the running SharedLandscape instance so the map can never drift from the game.
export function configure(L){if(!L)return;
  if(L.W0)W0={...L.W0};if(L.WL!=null)WL=L.WL;if(L.worldRadius)WR=L.worldRadius;
  if(L.orangery)ORG={x:L.orangery.x,z:L.orangery.z,rot:L.orangery.rotation,r:12};
  if(L.lake)LK={...L.lake};if(L.pond)PD={...L.pond};if(L.meadow)MD={...L.meadow};if(L.viewpoint)VP={...L.viewpoint};
  if(L.waterfall)WF={...L.waterfall};if(L.cabin)CAB={...L.cabin,rot:L.cabin.rotation??CAB.rot};if(L.bridge)BR={...L.bridge};
  if(L.stream)STREAM=L.stream;if(L.walls)WALLS=L.walls;if(L.paths)PATHS=L.paths;
  if(L.stable){STB={x:L.stable.x,z:L.stable.z-10};STC={x:L.stable.x,z:L.stable.z-17,r:30};}
  if(typeof L.worldHeight==='function')extHeight=(x,z)=>L.worldHeight(x,z);}

export const LANDMARKS=()=>[['Orangery',ORG],['Cabin',CAB],['Lake',LK],['Bridge',BR],['Pond',PD],['Waterfall',WF],['Meadow',MD],['Lookout',VP],['Stable',STC],['Home Garden',{x:0,z:-2}]];

const clamp01=x=>Math.min(1,Math.max(0,x)),mix=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>v<a?a:v>b?b:v;
const smooth=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
function hash(x,y,z){const h=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return h-Math.floor(h);}
function vnoise(x,y,z){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=fz*fz*(3-2*fz),l=(a,b,t)=>a+(b-a)*t;
  return l(l(l(hash(ix,iy,iz),hash(ix+1,iy,iz),u),l(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),u),v),l(l(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),u),l(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),u),v),w);}
const fbm2=(x,z)=>vnoise(x,.5,z)*.6+vnoise(x*2.1,1.7,z*2.1)*.3+vnoise(x*4.3,3.1,z*4.3)*.1;
function segD(x,z,pts){let m=1e9;for(let i=0;i<pts.length-1;i++){const ax=pts[i][0],az=pts[i][1],vx=pts[i+1][0]-ax,vz=pts[i+1][1]-az,den=vx*vx+vz*vz;let t=den?((x-ax)*vx+(z-az)*vz)/den:0;t=t<0?0:t>1?1:t;const dx=x-ax-vx*t,dz=z-az-vz*t,d=dx*dx+dz*dz;if(d<m)m=d;}return Math.sqrt(m);}
const pathD=(x,z)=>{let m=1e9;for(const p of PATHS)m=Math.min(m,segD(x,z,p));return m;},wallD=(x,z)=>{let m=1e9;for(const w of WALLS)m=Math.min(m,segD(x,z,w));return m;},streamD=(x,z)=>segD(x,z,STREAM);
const dd=(x,z,o)=>Math.hypot(x-o.x,z-o.z);
function localHeight(x,z,pd,sd){
  let amp=smooth(26,60,Math.hypot(x,z));amp*=smooth(30,58,dd(x,z,LK))*smooth(10,26,dd(x,z,PD));amp*=smooth(5,22,sd);amp*=.45+.55*smooth(3,14,pd);
  let h=amp*Math.max(0,fbm2(x*.013+4,z*.013-2)-.32)*22;
  const dv=dd(x,z,VP);h=Math.max(h,Math.min(15,18*Math.exp(-dv*dv/800)));
  const dW=dd(x,z,W0),m=smooth(160,230,dW);h+=(m*m*55+m*(fbm2(x*.03+2,z*.03+7)-.3)*34)*.3;
  const wx=x-WF.x,wz=z-WF.z,wal=wx*WF.dx+wz*WF.dz,wla=Math.abs(wx*WF.dz-wz*WF.dx);
  h=Math.max(h,smooth(5,9.5,wal)*(1-smooth(9,17,wla))*(14+(fbm2(x*.2,z*.2)-.5)*2.5));
  h=mix(h,CAB.y,1-smooth(5,12,dd(x,z,CAB)));h=mix(h,.3,1-smooth(STC.r+6,STC.r+16,dd(x,z,STC)));h=mix(h,.95,1-smooth(18,24,dd(x,z,ORG)));
  const nl=(fbm2(x*.05+1,z*.05-4)-.5)*10;
  h=mix(h,WL-2.6,1-smooth(LK.r-7,LK.r+3,dd(x,z,LK)+nl));h=mix(h,WL-1.4,1-smooth(PD.r-3,PD.r+2,dd(x,z,PD)+nl*.3));
  h=mix(h,WL-.75,1-smooth(1.1,3.4,sd));h=mix(h,WL-1.2,1-smooth(3.5,6,Math.hypot(wx,wz)+nl*.2));
  if(Math.abs(x)<23&&Math.abs(z)<23)h-=.6;return h;}
export function heightAt(x,z){return extHeight?extHeight(x,z):localHeight(x,z,pathD(x,z),streamD(x,z));}
export const waterLevel=()=>WL;

const hx=h=>[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];
const CG={dark:hx(0x4a6430),mid:hx(0x67823c),dry:hx(0x8d9853),soil:hx(0x5e4d36),gravel:hx(0xb4a585),grav2:hx(0x9c8c6c)},CW={meadow:hx(0x93a653),forest:hx(0x3c5328),rock:hx(0x7d7a6e),rock2:hx(0x9a968a),sand:hx(0xa89a74),bed:hx(0x4d5a45)},WATER=hx(0x56747a),FOG=hx(0xcdd2cc);
const lerp3=(c,t,k)=>{c[0]+=(t[0]-c[0])*k;c[1]+=(t[1]-c[1])*k;c[2]+=(t[2]-c[2])*k;};
function worldColor(x,z,y,pd){const n=fbm2(x*.06,z*.06),n2=vnoise(x*.6,5,z*.6),c=CG.dark.slice();lerp3(c,CG.mid,n);lerp3(c,CG.dry,smooth(.55,.85,n2)*.4);lerp3(c,CW.forest,smooth(.48,.6,fbm2(x*.018+9,z*.018-3))*.55);
  lerp3(c,CW.meadow,(1-smooth(MD.r-8,MD.r+4,dd(x,z,MD)))*.75);const rk=CW.rock.slice();lerp3(rk,CW.rock2,n2);lerp3(c,rk,smooth(6,18,y)*smooth(150,185,dd(x,z,W0)));
  lerp3(c,CW.sand,(1-smooth(WL+.15,WL+.8,y))*.85);if(y<WL)lerp3(c,CW.bed,smooth(WL,WL-1.5,y));const d=pd+(n2-.5)*.6;lerp3(c,CG.soil,(1-smooth(1.2,2,d))*.5);
  const gv=CG.gravel.slice();lerp3(gv,CG.grav2,vnoise(x*2,1,z*2));lerp3(c,gv,1-smooth(.9,1.4,d));lerp3(c,CW.rock2,(1-smooth(3,7,dd(x,z,VP)))*.6);return c;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const cx=x=>(x-W0.x+HALF)*P,cz=z=>(z-W0.z+HALF)*P;

function buildTerrain(){const N=500,H=new Float32Array(N*N),PDv=new Float32Array(N*N);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=W0.x-HALF+i+.5,z=W0.z-HALF+j+.5,pd=pathD(x,z),sd=streamD(x,z);PDv[j*N+i]=pd;H[j*N+i]=extHeight?extHeight(x,z):localHeight(x,z,pd,sd);}
  const c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d'),img=g.createImageData(N,N),d=img.data;const L=[-.62,.7,.36],ll=Math.hypot(...L);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=j*N+i,x=W0.x-HALF+i+.5,z=W0.z-HALF+j+.5,y=H[k];let col=worldColor(x,z,y,PDv[k]);
    const hl=H[j*N+Math.max(0,i-1)],hr=H[j*N+Math.min(N-1,i+1)],hu=H[Math.max(0,j-1)*N+i],hd=H[Math.min(N-1,j+1)*N+i];
    const nx=-(hr-hl)/2,nz=-(hd-hu)/2,nl=Math.hypot(nx,1,nz),dot=(nx*L[0]+L[1]+nz*L[2])/(nl*ll);let sh=.62+.5*dot;
    if(y<WL){const dep=clamp01((WL-y)/2.2);col=col.slice();lerp3(col,WATER,.86);col=col.map(v=>v*(1-dep*.12));sh=1;}
    col=col.map(v=>v*sh);lerp3(col,FOG,smooth(175,250,dd(x,z,W0))*.45);
    d[k*4]=clamp(col[0]*255,0,255);d[k*4+1]=clamp(col[1]*255,0,255);d[k*4+2]=clamp(col[2]*255,0,255);d[k*4+3]=255;}
  g.putImageData(img,0,0);return{canvas:c,H,N};}
function buildForest(T){const rand=mulberry32(20260924),items=[];let n=0,tries=0;const sH=(x,z)=>T.H[clamp(Math.floor(z-W0.z+HALF),0,T.N-1)*T.N+clamp(Math.floor(x-W0.x+HALF),0,T.N-1)];
  const forestAt=(x,z,r)=>r>150?1:Math.max(.08,smooth(.44,.56,fbm2(x*.018+9,z*.018-3)));
  while(n<1200&&tries<42000){tries++;const a=rand()*6.283,r=Math.sqrt(rand())*205,x=W0.x+Math.cos(a)*r,z=W0.z+Math.sin(a)*r;if(rand()>forestAt(x,z,r))continue;if(Math.abs(x)<30&&Math.abs(z)<30)continue;
    if(pathD(x,z)<3.5||streamD(x,z)<4)continue;if(dd(x,z,LK)<LK.r+5||dd(x,z,PD)<PD.r+4||dd(x,z,MD)<MD.r+2||dd(x,z,VP)<14||dd(x,z,WF)<11||dd(x,z,CAB)<10||dd(x,z,ORG)<22||dd(x,z,STC)<STC.r+6||wallD(x,z)<2.5)continue;
    const y=sH(x,z);if(y<WL+.4||y>30)continue;const k=rand()<.78?Math.floor(rand()*4):4+Math.floor(rand()*2),s=(.9+rand()*.9)*(r>150?1.35:1);items.push({x,z,k,s});n++;}
  return items.sort((a,b)=>a.z-b.z);}
function poly(g,pts){g.beginPath();pts.forEach(([x,z],i)=>i?g.lineTo(cx(x),cz(z)):g.moveTo(cx(x),cz(z)));g.stroke();}

// Bakes the whole 500×500 m world to a 2000×2000 canvas (4 px/m). ~0.3–0.8 s; call once and cache.
export function bakeBaseMap(){const cv=document.createElement('canvas');cv.width=cv.height=2000;const g=cv.getContext('2d'),T=buildTerrain();
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(T.canvas,0,0,2000,2000);g.lineCap=g.lineJoin='round';
  g.strokeStyle='rgba(150,146,134,.95)';g.lineWidth=.8*P;WALLS.forEach(w=>poly(g,w));
  g.save();g.translate(cx(BR.x),cz(BR.z));g.rotate(Math.atan2(BR.dz,BR.dx));g.fillStyle='#7a5a3c';g.fillRect(-BR.half*P,-BR.w*P,BR.half*2*P,BR.w*2*P);g.strokeStyle='#4f3a26';g.lineWidth=2;g.strokeRect(-BR.half*P,-BR.w*P,BR.half*2*P,BR.w*2*P);g.restore();
  g.save();g.translate(cx(WF.x),cz(WF.z));g.rotate(Math.atan2(WF.dz,WF.dx));const gr=g.createLinearGradient(5*P,0,10*P,0);gr.addColorStop(0,'rgba(240,248,248,.95)');gr.addColorStop(1,'rgba(200,225,228,.5)');g.fillStyle=gr;g.fillRect(4.5*P,-1.3*P,5.6*P,2.6*P);g.restore();
  g.save();g.translate(cx(ORG.x),cz(ORG.z));g.rotate(-ORG.rot);g.fillStyle='rgba(226,226,212,.95)';g.beginPath();g.ellipse(0,0,16*P,10*P,0,0,6.283);g.fill();
    g.fillStyle='#c9d9d4';g.strokeStyle='#6c827c';g.lineWidth=3;g.fillRect(-9*P,-4.5*P,18*P,9*P);g.strokeRect(-9*P,-4.5*P,18*P,9*P);g.beginPath();for(let i=-6;i<=6;i+=3){g.moveTo(i*P,-4.5*P);g.lineTo(i*P,4.5*P);}g.moveTo(-9*P,0);g.lineTo(9*P,0);g.stroke();
    g.fillStyle='#dfe9e5';g.beginPath();g.arc(0,0,3.6*P,0,6.283);g.fill();g.stroke();g.restore();
  g.save();g.translate(cx(CAB.x),cz(CAB.z));g.rotate(-CAB.rot);g.fillStyle='#9a7a55';g.fillRect(2.5*P,-3*P,2*P,6*P);g.fillRect(4.51*P,.88*P,6.58*P,1.44*P);
    g.fillStyle='#7c3a2c';g.fillRect(-CAB.hx*P,-CAB.hz*P,CAB.hx*2*P,CAB.hz*2*P);g.fillStyle='#5e2a20';g.fillRect(-CAB.hx*P,-.2*P,CAB.hx*2*P,.4*P);g.restore();
  g.fillStyle='#8e8a7e';const vr=mulberry32(5);for(let i=0;i<9;i++){const a=i/9*6.283,r=3.2+vr()*2.3;g.beginPath();g.arc(cx(VP.x+Math.cos(a)*r),cz(VP.z+Math.sin(a)*r),(.4+vr()*.5)*P,0,6.283);g.fill();}
  g.fillStyle='#b9b4a6';g.beginPath();g.arc(cx(VP.x),cz(VP.z),.9*P,0,6.283);g.fill();
  g.fillStyle='#86ad5c';g.fillRect(cx(-12.55),cz(-13.55),25.1*P,25.4*P);g.strokeStyle='#7a6448';g.lineWidth=3;g.strokeRect(cx(-12.55),cz(-13.55),25.1*P,25.4*P);
  g.fillStyle='#6b5038';[[-9,-10,5,14],[-2.5,-10,5,14]].forEach(([x,z,w,h])=>g.fillRect(cx(x),cz(z),w*P,h*P));g.fillStyle='#5f8fa0';g.beginPath();g.arc(cx(6),cz(-4),1.6*P,0,6.283);g.fill();
  g.save();g.translate(cx(STB.x),cz(STB.z));g.rotate(Math.PI);g.scale(P,P);
    const stad=r=>{g.beginPath();g.moveTo(-16,8-r);g.lineTo(16,8-r);g.arc(16,8,r,-Math.PI/2,Math.PI/2);g.lineTo(-16,8+r);g.arc(-16,8,r,Math.PI/2,Math.PI*1.5);g.closePath();};
    g.fillStyle='#7f9a4c';stad(19.5);g.fill();g.strokeStyle='#b89a70';g.lineWidth=3.6;stad(16);g.stroke();
    g.fillStyle='#cdb48c';g.fillRect(-9,2,18,12);g.fillStyle='#b89a70';g.fillRect(-1.3,-18,2.6,16);
    g.fillStyle='#a24e36';g.fillRect(-5.5,-15.1,11,5);g.fillStyle='#3e2c1e';g.fillRect(-1.3,-15.1,2.6,5);g.restore();
  const F=buildForest(T);
  g.fillStyle='rgba(24,38,20,.34)';F.forEach(t=>{const r=(t.k<4?1.25:1.45)*t.s;g.beginPath();g.ellipse(cx(t.x+r*.5),cz(t.z+r*.35),r*P*1.05,r*P*.85,0,0,6.283);g.fill();});
  const CON=['#35532c','#3e5e31','#46683a','#2f4a28'],RND=['#6f8c41','#86a24f'];
  F.forEach(t=>{const r=(t.k<4?1.25:1.45)*t.s,X=cx(t.x),Z=cz(t.z);if(t.k<4){g.fillStyle=CON[t.k];g.beginPath();for(let i=0;i<7;i++){const a=i/7*6.283-1.57;g.lineTo(X+Math.cos(a)*r*P,Z+Math.sin(a)*r*P);}g.closePath();g.fill();}
    else{g.fillStyle=RND[t.k-4];g.beginPath();g.arc(X,Z,r*P,0,6.283);g.fill();}});
  return cv;}

export const mapBounds=()=>({minX:W0.x-HALF,minZ:W0.z-HALF,size:HALF*2,pxPerMetre:P});

const INK='#23261f',CREAM='#f4f1e8',GOLD='#e0b85a',RED='#e0694f',FONT='Manrope, system-ui, sans-serif';
const MK={quest:{c:GOLD,r:6,shape:'diamond'},enemy:{c:RED,r:4,shape:'dot'},boss:{c:RED,r:8,shape:'diamond'},poi:{c:CREAM,r:4,shape:'dot'}};
function drawMarker(g,m,x,y,s){const t=MK[m.type]||MK.poi,r=t.r*s;g.fillStyle=t.c;g.strokeStyle=INK;g.lineWidth=2*s;g.beginPath();
  if(t.shape==='diamond'){g.moveTo(x,y-r*1.3);g.lineTo(x+r,y);g.lineTo(x,y+r*1.3);g.lineTo(x-r,y);g.closePath();}else g.arc(x,y,r,0,6.283);g.fill();g.stroke();}
function drawArrow(g,x,y,ang,s){g.save();g.translate(x,y);g.rotate(ang);g.fillStyle=CREAM;g.strokeStyle=INK;g.lineWidth=2.5*s;g.lineJoin='round';
  g.beginPath();g.moveTo(9*s,0);g.lineTo(-6*s,-6.5*s);g.lineTo(-3*s,0);g.lineTo(-6*s,6.5*s);g.closePath();g.fill();g.stroke();g.restore();}
function pill(g,text,x,y,s,bg=INK,fg=CREAM){g.font=`700 ${12*s}px ${FONT}`;const w=g.measureText(text).width+14*s,h=22*s;g.fillStyle=bg;g.beginPath();g.roundRect(x-w/2,y-h/2,w,h,7*s);g.fill();g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';g.fillText(text,x,y+.5*s);}

export class WorldMap{
  constructor(o={}){
    this.o={container:document.body,size:'auto',metresAcross:90,rotate:true,key:'KeyM',overlay:'auto',edgeSoftness:60,...o};
    if(o.landscape)configure(o.landscape);
    this.markers=o.markers||[];this.isOpen=false;this.follow=true;this.dpr=Math.min(2,devicePixelRatio||1);
    this._buildDom();this.base=null;
    this.ready=new Promise(res=>setTimeout(()=>{this.base=o.baseMap||bakeBaseMap();res(this);},0));
    this._key=e=>{if(e.code===this.o.key&&!e.repeat){this.toggle();}else if(e.code==='Escape'&&this.isOpen)this.close();};addEventListener('keydown',this._key);
    this._rs=()=>{this._layout();this._sizeFull();};addEventListener('resize',this._rs);}
  get mobile(){const r=this.o.container.getBoundingClientRect();return r.width<600||matchMedia('(pointer:coarse)').matches;}
  get overlayMode(){return this.o.overlay==='auto'?this.mobile:!!this.o.overlay;}
  _layout(){const s=this.o.size==='auto'?(this.mobile?110:176):this.o.size,m=this.mobile;this._ms=s;
    this.mini.style.width=this.mini.style.height=s+'px';this.mc.width=this.mc.height=s*this.dpr;this.mc.style.width=this.mc.style.height=s+'px';
    this._tag.style.display=m?'none':'block';this._tag.style.right=(16+s-20)+'px';this._tag.style.top=`calc(${16+s-20}px + env(safe-area-inset-top))`;
    const ov=this.overlayMode;this.full.style.background=ov?'rgba(14,16,12,.35)':'#14160f';this.fc.style.opacity=ov?'.9':'1';this.full.style.pointerEvents=ov?'none':'auto';this.fc.style.pointerEvents='auto';
    this.lg.style.display=m?'none':'flex';}
  _buildDom(){const top='calc(16px + env(safe-area-inset-top))',btn=`border:0;border-radius:12px;background:${INK};color:${CREAM};font:700 13px/1 ${FONT};cursor:pointer;pointer-events:auto;`;
    const mini=this.mini=document.createElement('div');mini.style.cssText=`position:absolute;top:${top};right:16px;border-radius:50%;overflow:hidden;background:transparent;border:0;box-shadow:none;cursor:pointer;z-index:20;touch-action:manipulation;`;
    this.mc=document.createElement('canvas');this.mc.style.display='block';mini.appendChild(this.mc);mini.addEventListener('click',()=>this.open());
    const tag=this._tag=document.createElement('div');tag.textContent='M';tag.style.cssText=`position:absolute;width:24px;height:24px;border-radius:7px;background:${INK};color:${CREAM};font:700 11px/24px ${FONT};text-align:center;z-index:21;pointer-events:none;`;
    const full=this.full=document.createElement('div');full.style.cssText=`position:absolute;inset:0;display:none;z-index:40;touch-action:none;`;
    this.fc=document.createElement('canvas');this.fc.style.cssText='position:absolute;inset:0;width:100%;height:100%;cursor:grab;touch-action:none;';full.appendChild(this.fc);
    const bar=document.createElement('div');bar.style.cssText=`position:absolute;left:16px;top:${top};display:flex;align-items:center;height:44px;padding:0 14px;border-radius:12px;background:${INK};color:${CREAM};font:700 13px/1 ${FONT};letter-spacing:.12em;text-transform:uppercase;pointer-events:none;`;bar.textContent='World map';full.appendChild(bar);
    const x=document.createElement('button');x.textContent='✕';x.setAttribute('aria-label','Close map');x.style.cssText=`position:absolute;right:16px;top:${top};width:44px;height:44px;font-size:16px;${btn}`;x.onclick=()=>this.close();full.appendChild(x);
    const ctr=document.createElement('button');ctr.textContent='ME';ctr.setAttribute('aria-label','Center on me');ctr.style.cssText=`position:absolute;right:16px;bottom:calc(20px + env(safe-area-inset-bottom));width:44px;height:44px;padding:0;${btn}background:${GOLD};color:${INK};font:800 12px/1 ${FONT};letter-spacing:.06em;border-radius:50%;box-shadow:0 6px 18px rgba(20,25,15,.3);`;ctr.onclick=()=>{this.follow=true;this._center();};full.appendChild(ctr);
    const lg=this.lg=document.createElement('div');lg.style.cssText=`position:absolute;left:16px;top:calc(70px + env(safe-area-inset-top));flex-direction:column;gap:7px;padding:10px 12px;border-radius:12px;background:${INK};color:${CREAM};font:600 12px/1 ${FONT};pointer-events:none;`;
    lg.innerHTML=[['You',`width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:12px solid ${CREAM};`],['Landmark',`width:9px;height:9px;border-radius:50%;background:${CREAM};box-shadow:0 0 0 2px ${INK};`]].map(([t,st])=>`<div style="display:flex;align-items:center;gap:10px;"><span style="flex:none;${st}"></span>${t}</div>`).join('');
    full.appendChild(lg);
    this._fv={x:0,z:0,s:2};const pts=new Map();let G=null;
    const gest=()=>{const a=[...pts.values()];if(!a.length)return null;const mx=a.reduce((t,p)=>t+p.x,0)/a.length,my=a.reduce((t,p)=>t+p.y,0)/a.length,d=a.length>1?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0;return{mx,my,d,n:a.length};};
    const startG=()=>{const g=gest();G=g&&{...g,vx:this._fv.x,vz:this._fv.z,s:this._fv.s};};
    this.fc.addEventListener('pointerdown',e=>{if(this.overlayMode&&this.mobile&&e.clientX<innerWidth*.48)return;this.fc.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});startG();this.follow=false;this.fc.style.cursor='grabbing';});
    this.fc.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId)||!G)return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const g=gest(),f=this._fv;
      if(g.n>1&&G.d>0){const r=this.fc.getBoundingClientRect(),ox=G.mx-r.left-r.width/2,oy=G.my-r.top-r.height/2,wx=G.vx+ox/G.s,wz=G.vz+oy/G.s;f.s=this._clampS(G.s*g.d/G.d);f.x=wx-(g.mx-r.left-r.width/2)/f.s;f.z=wz-(g.my-r.top-r.height/2)/f.s;}
      else{f.x=G.vx-(g.mx-G.mx)/f.s;f.z=G.vz-(g.my-G.my)/f.s;}this._clampView();});
    const up=e=>{pts.delete(e.pointerId);startG();if(!pts.size)this.fc.style.cursor='grab';};this.fc.addEventListener('pointerup',up);this.fc.addEventListener('pointercancel',up);
    this.fc.addEventListener('wheel',e=>{e.preventDefault();this.follow=false;const r=this.fc.getBoundingClientRect(),mx=e.clientX-r.left-r.width/2,my=e.clientY-r.top-r.height/2,f=this._fv,wx=f.x+mx/f.s,wz=f.z+my/f.s;f.s=this._clampS(f.s*Math.exp(-e.deltaY*.0015));f.x=wx-mx/f.s;f.z=wz-my/f.s;this._clampView();},{passive:false});
    const cont=this.o.container;if(getComputedStyle(cont).position==='static')cont.style.position='relative';cont.appendChild(mini);cont.appendChild(tag);cont.appendChild(full);this._layout();}
  _minS(){const r=this.full.getBoundingClientRect();return Math.max(r.width,r.height)/(2*(WR+8));}
  _clampS(s){return clamp(s,this._minS(),12);}
  _clampView(){const f=this._fv,r=this.full.getBoundingClientRect(),lim=Math.max(0,WR+8-Math.min(r.width,r.height)/2/f.s),dx=f.x-W0.x,dz=f.z-W0.z,d=Math.hypot(dx,dz);if(d>lim){f.x=W0.x+dx/d*lim;f.z=W0.z+dz/d*lim;}}
  _sizeFull(){const r=this.full.getBoundingClientRect();this.fc.width=Math.max(1,r.width*this.dpr);this.fc.height=Math.max(1,r.height*this.dpr);if(this.isOpen){this._fv.s=this._clampS(this._fv.s);this._clampView();}}
  _center(){const p=this._p();this._fv.x=p.x;this._fv.z=p.z;this._clampView();}
  _p(){return this.o.getPlayer?this.o.getPlayer():{x:0,z:12,heading:0};}
  setMarkers(list){this.markers=list||[];}
  open(){if(this.isOpen||this._enabled===false)return;this.isOpen=true;document.body.classList.add('world-map-open');this._layout();this.full.style.display='block';this._sizeFull();const r=this.full.getBoundingClientRect();this._fv.s=this._clampS(Math.min(r.width,r.height)/(this.mobile?140:260));this.follow=true;this._center();this.o.onToggle&&this.o.onToggle(true,this.overlayMode);}
  close(){if(!this.isOpen)return;this.isOpen=false;document.body.classList.remove('world-map-open');this.full.style.display='none';this.o.onToggle&&this.o.onToggle(false,this.overlayMode);}
  toggle(){this.isOpen?this.close():this.open();}
  setVisible(on){this._enabled=!!on;if(!this._enabled&&this.isOpen)this.close();this.mini.style.display=this._enabled?'block':'none';this._tag.style.display=this._enabled&&!this.mobile?'block':'none';}
  update(){if(this._enabled===false||!this.base)return;if(!this.isOpen||this.overlayMode)this._drawMini();if(this.isOpen){if(this.follow)this._center();this._drawFull();}this.mini.style.visibility=this.isOpen&&!this.overlayMode?'hidden':'visible';}
  _drawMini(){const g=this.mc.getContext('2d'),W=this.mc.width,s=this.dpr,p=this._p(),k=W/this.o.metresAcross,view=p.view??p.heading??0,rot=this.o.rotate?view-Math.PI:0;
    g.fillStyle='#14160f';g.fillRect(0,0,W,W);g.save();g.translate(W/2,W/2);g.rotate(rot);g.scale(k/P,k/P);g.imageSmoothingEnabled=true;
    g.drawImage(this.base,-(p.x-W0.x+HALF)*P,-(p.z-W0.z+HALF)*P);g.restore();
    const co=Math.cos(rot),si=Math.sin(rot),ms=W/176,R=W/2-24*ms,toS=(x,z)=>{const dx=(x-p.x)*k,dz=(z-p.z)*k;return[W/2+dx*co-dz*si,W/2+dx*si+dz*co];};
    const[ex,ey]=toS(W0.x,W0.z);this._fog(g,ex,ey,k,W,W);
    for(const m of this.markers){let[x,y]=toS(m.x,m.z);const ox=x-W/2,oy=y-W/2,L=Math.hypot(ox,oy);
      if(L>R){if(m.type==='enemy')continue;x=W/2+ox/L*R;y=W/2+oy/L*R;}drawMarker(g,m,x,y,s*Math.max(.8,ms));}
    drawArrow(g,W/2,W/2,Math.atan2(Math.cos(p.heading||0),Math.sin(p.heading||0))+rot,s*Math.max(.8,ms));
    const na=-Math.PI/2+rot,NR=W/2-10*s*Math.max(.75,ms),Nx=W/2+Math.cos(na)*NR,Ny=W/2+Math.sin(na)*NR;
    g.fillStyle=INK;g.beginPath();g.arc(Nx,Ny,8*s,0,6.283);g.fill();g.fillStyle=CREAM;g.font=`700 ${9*s}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText('N',Nx,Ny+.5*s);
    // R35B: feather the rendered minimap itself. A wide alpha falloff makes the map
    // dissolve into the world instead of reading as a clipped circular widget.
    g.save();g.globalCompositeOperation='destination-in';
    const feather=g.createRadialGradient(W/2,W/2,W*.27,W/2,W/2,W*.50);
    feather.addColorStop(0,'rgba(0,0,0,1)');
    feather.addColorStop(.30,'rgba(0,0,0,1)');
    feather.addColorStop(.50,'rgba(0,0,0,.96)');
    feather.addColorStop(.66,'rgba(0,0,0,.80)');
    feather.addColorStop(.79,'rgba(0,0,0,.52)');
    feather.addColorStop(.89,'rgba(0,0,0,.24)');
    feather.addColorStop(.96,'rgba(0,0,0,.07)');
    feather.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=feather;g.fillRect(0,0,W,W);g.restore();}
  _fog(g,ex,ey,k,W,H){const soft=this.o.edgeSoftness,r0=Math.max(1,(WR-soft*.35)*k),r1=(WR+soft*.65)*k,gr=g.createRadialGradient(ex,ey,r0,ex,ey,r1);
    gr.addColorStop(0,'rgba(14,16,12,0)');gr.addColorStop(.35,'rgba(14,16,12,.28)');gr.addColorStop(.7,'rgba(14,16,12,.78)');gr.addColorStop(1,'rgba(14,16,12,1)');g.fillStyle=gr;g.fillRect(0,0,W,H);}
  _drawFull(){const g=this.fc.getContext('2d'),W=this.fc.width,H=this.fc.height,s=this.dpr,f=this._fv,p=this._p(),k=f.s*s,ov=this.overlayMode;
    g.clearRect(0,0,W,H);g.save();g.translate(W/2,H/2);g.scale(k/P,k/P);g.drawImage(this.base,-(f.x-W0.x+HALF)*P,-(f.z-W0.z+HALF)*P);g.restore();
    const toS=(x,z)=>[W/2+(x-f.x)*k,H/2+(z-f.z)*k],[ex,ey]=toS(W0.x,W0.z);this._fog(g,ex,ey,k,W,H);
    g.strokeStyle='rgba(244,241,232,.18)';g.setLineDash([6*s,6*s]);g.lineWidth=1.5*s;g.beginPath();g.arc(ex,ey,WR*k,0,6.283);g.stroke();g.setLineDash([]);
    const names=f.s>=(this.mobile?2.4:1.9);
    for(const[n,L]of LANDMARKS()){const[x,y]=toS(L.x,L.z);g.fillStyle=CREAM;g.strokeStyle=INK;g.lineWidth=2*s;g.beginPath();g.arc(x,y,3.5*s,0,6.283);g.fill();g.stroke();if(names)pill(g,n,x,y-17*s,s);}
    for(const m of this.markers){const[x,y]=toS(m.x,m.z);drawMarker(g,m,x,y,s*1.3);if(m.label&&m.type!=='enemy'&&(names||m.type==='boss'||m.type==='quest'))pill(g,m.label,x,y+20*s,s,m.type==='quest'?GOLD:RED,INK);}
    const[px,py]=toS(p.x,p.z);g.fillStyle='rgba(244,241,232,.3)';g.beginPath();g.arc(px,py,17*s,0,6.283);g.fill();drawArrow(g,px,py,Math.atan2(Math.cos(p.heading||0),Math.sin(p.heading||0)),s*1.2);}
  dispose(){document.body.classList.remove('world-map-open');removeEventListener('keydown',this._key);removeEventListener('resize',this._rs);this.mini.remove();this._tag.remove();this.full.remove();}
}
