// <char-stage> - one WebGL stage holding all characters. Attributes: index, walk ("1"/"0"), variant ("ring"|"cards").
// Emits 'select' {detail:index} when a character is clicked, 'progress' {detail:loaded}.
import * as THREE from 'three';
export const ROSTER=(globalThis.DYM_CHARACTER_ROSTER||[]).map(c=>c.id);
const SAND=0xe9e2d5, PAPER=0xf6f2ea, TARGET_H=1.5;
const damp=(k,dt)=>1-Math.exp(-k*dt);
class CharStage extends HTMLElement{
  static get observedAttributes(){return['index','walk','variant'];}
  connectedCallback(){
    if(this._r) return;
    this.style.display='block';this.style.position='relative';this.style.width=this.style.width||'100%';this.style.height=this.style.height||'100%';
    this.idx=+(this.getAttribute('index')||0);this.walk=this.getAttribute('walk')==='1';this.variant=this.getAttribute('variant')||'ring';
    const r=this._r=new THREE.WebGLRenderer({antialias:true,alpha:true});const touch=matchMedia('(pointer: coarse)').matches||('ontouchstart' in window);this._touchDevice=touch;r.setPixelRatio(Math.min(devicePixelRatio,touch?1.25:1.75));
    r.toneMapping=THREE.ACESFilmicToneMapping;r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
    Object.assign(r.domElement.style,{position:'absolute',inset:'0',width:'100%',height:'100%',cursor:'grab',touchAction:'none'});
    this.appendChild(r.domElement);
    const s=this.scene=new THREE.Scene();this._sandBg=new THREE.Color(SAND);this._sandFog=new THREE.Fog(SAND,6.5,13);s.background=this._sandBg;s.fog=this._sandFog;
    this.cam=new THREE.PerspectiveCamera(28,1,0.1,60);this.cam.position.set(0,1.3,7);this.cam.lookAt(0,0.8,0);
    s.add(new THREE.HemisphereLight(0xfffaf0,0xb8ab95,1.1));
    const key=new THREE.DirectionalLight(0xfff1e0,2.2);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(touch?1024:1536,touch?1024:1536);
    Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:1,far:25});key.shadow.bias=-0.0003;key.shadow.normalBias=0.02;key.shadow.radius=5;s.add(key);
    const rim=new THREE.DirectionalLight(0xe6eeff,0.9);rim.position.set(3,3,-4);s.add(rim);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshStandardMaterial({color:SAND,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;s.add(floor);this.floor=floor;this._solidFloorMat=floor.material;this._mobileShadowMat=new THREE.ShadowMaterial({color:0x51493f,opacity:0.13});
    this.world=new THREE.Group();s.add(this.world);
    this.slots=ROSTER.map((n,i)=>this._slot(i));this.layout={cx:0.95,sp:1.6,sc:1};
    this.ray=new THREE.Raycaster();this.clock=new THREE.Clock();this.ringA=0;
    this._input();
    new ResizeObserver(()=>this._size()).observe(this);this._size();
    r.setAnimationLoop(()=>this._tick());
    this._load();
  }
  disconnectedCallback(){clearTimeout(this._touchPrefetchTimer);try{this._r?.setAnimationLoop(null);this._r?.dispose();}catch{}}
  attributeChangedCallback(k,o,v){
    if(k==='index'){const n=+v;if(this.slots&&n!==this.idx){this.slots[this.idx].yaw=0;this.slots[n].react=0;}this.idx=n;if(this.slots)this._near();}
    if(k==='walk')this.walk=v==='1';
    if(k==='variant')this.variant=v||'ring';
  }
  _slot(i){
    const g=new THREE.Group();this.world.add(g);
    const plinth=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.66,0.07,64),new THREE.MeshStandardMaterial({color:0xddd3c2,roughness:0.95}));plinth.position.y=0.035;plinth.receiveShadow=true;g.add(plinth);
    const sh=new THREE.Shape(),w=0.78,h=1.08,rr=0.12;
    sh.moveTo(-w+rr,-h);sh.lineTo(w-rr,-h);sh.quadraticCurveTo(w,-h,w,-h+rr);sh.lineTo(w,h-rr);sh.quadraticCurveTo(w,h,w-rr,h);sh.lineTo(-w+rr,h);sh.quadraticCurveTo(-w,h,-w,h-rr);sh.lineTo(-w,-h+rr);sh.quadraticCurveTo(-w,-h,-w+rr,-h);
    const card=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:0.02,bevelEnabled:false,curveSegments:8}),new THREE.MeshStandardMaterial({color:PAPER,roughness:0.9}));
    card.position.set(0,h+0.02,-0.45);card.castShadow=true;card.receiveShadow=true;g.add(card);
    const holder=new THREE.Group();g.add(holder);
    const hit=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,1.7,12),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));hit.position.y=0.85;hit.userData.i=i;g.add(hit);
    return {g,plinth,card,holder,hit,yaw:0,react:9,d:null,fade:1,mats:[],mixer:null,aI:null,aW:null,wW:0,state:0};
  }
  _cd(i){const N=ROSTER.length;let d=((i-this.idx)%N+N)%N;if(d>N/2)d-=N;return d;}
  _near(){if(this._touchDevice){this._ensure(this.idx);if(this.slots[this.idx]?.state===2)this._prefetchTouchNeighbors();return;}[0,1,-1,2,-2].forEach(o=>this._ensure((this.idx+o+ROSTER.length*4)%ROSTER.length));}
  _prefetchTouchNeighbors(){clearTimeout(this._touchPrefetchTimer);const idx=this.idx,N=ROSTER.length;this._touchPrefetchTimer=setTimeout(()=>{if(idx!==this.idx)return;this._ensure((idx+1)%N);setTimeout(()=>{if(idx===this.idx)this._ensure((idx-1+N)%N);},260);},520);}
  async _load(){this._near();}
  async _ensure(i){
    const sl=this.slots[i];if(sl.state)return;sl.state=1;
    try{
      const m=await import('./characters/'+ROSTER[i]+'.js');const c=await m.create();
      const b=new THREE.Box3().setFromObject(c.scene);const k=TARGET_H/Math.max(0.01,b.max.y-b.min.y);
      c.scene.scale.setScalar(k);c.scene.position.y=0.07-b.min.y*k;sl.holder.add(c.scene);
      const seen=new Set();c.scene.traverse(o=>{if(o.isMesh)[].concat(o.material).forEach(mt=>{if(mt.color&&mt.emissive&&!seen.has(mt)){seen.add(mt);sl.mats.push({mt,c:mt.color.clone(),e:mt.emissive.clone(),ei:mt.emissiveIntensity});}});});
      sl.mixer=new THREE.AnimationMixer(c.scene);
      const a=nm=>{const x=sl.mixer.clipAction(c.clips.find(q=>q.name===nm));x.play();return x;};
      sl.aI=a('Idle');sl.aW=a('Walk');sl.aW.setEffectiveWeight(0);sl.aI.time=i*0.8;sl.fade=-1;
    }catch(e){console.warn('character load failed',ROSTER[i],e);}
    sl.state=2;this.loaded=(this.loaded||0)+1;
    const nearReady=this._touchDevice?this.slots[this.idx].state===2:[-1,0,1].every(o=>this.slots[(this.idx+o+ROSTER.length)%ROSTER.length].state===2);
    if(this._touchDevice&&i===this.idx)this._prefetchTouchNeighbors();
    this.dispatchEvent(new CustomEvent('progress',{detail:{loaded:this.loaded,near:nearReady}}));
  }
  async portraits(){
    if(this._pp)return this._pp;this._urls=this._urls||{};
    this._pp=(async()=>{
      const W=320,H=400,r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
      r.setSize(W,H);r.setPixelRatio(1);r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.0;
      r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
      const sc=new THREE.Scene();sc.background=new THREE.Color(0xf1ebe0);
      sc.add(new THREE.HemisphereLight(0xfffaf0,0xb8ab95,1.2));
      const kl=new THREE.DirectionalLight(0xfff1e0,2.2);kl.position.set(-3,6,5);kl.castShadow=true;kl.shadow.mapSize.set(1024,1024);sc.add(kl);
      const rl=new THREE.DirectionalLight(0xe6eeff,0.9);rl.position.set(3,3,-4);sc.add(rl);
      const floor=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.MeshStandardMaterial({color:0xf1ebe0,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-0.005;floor.receiveShadow=true;sc.add(floor);
      const cam=new THREE.PerspectiveCamera(24,W/H,0.05,50);
      const vFov=THREE.MathUtils.degToRad(cam.fov),hFov=2*Math.atan(Math.tan(vFov/2)*cam.aspect),margin=1.18;
      for(let n=0;n<ROSTER.length;n++){
        try{
          const c=await (await import('./characters/'+ROSTER[n]+'.js')).create();
          c.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
          const mx=new THREE.AnimationMixer(c.scene);const cl=c.clips.find(q=>q.name==='Idle');if(cl){mx.clipAction(cl).play();mx.update(0.01);}
          sc.add(c.scene);c.scene.updateMatrixWorld(true);
          let b=new THREE.Box3().setFromObject(c.scene),ctr=b.getCenter(new THREE.Vector3()),sz=b.getSize(new THREE.Vector3());
          c.scene.position.x-=ctr.x;c.scene.position.z-=ctr.z;c.scene.position.y-=b.min.y;c.scene.updateMatrixWorld(true);
          b=new THREE.Box3().setFromObject(c.scene);ctr=b.getCenter(new THREE.Vector3());sz=b.getSize(new THREE.Vector3());
          const fitH=(sz.y*margin)/(2*Math.tan(vFov/2)),fitW=(sz.x*margin)/(2*Math.tan(hFov/2)),dist=Math.max(fitH,fitW)+sz.z*0.5;
          const targetY=b.min.y+sz.y*0.50;
          cam.position.set(0,targetY,dist);cam.lookAt(0,targetY,0);cam.near=Math.max(0.02,dist-sz.z*2);cam.far=dist+sz.z*4+10;cam.updateProjectionMatrix();
          r.render(sc,cam);this._urls[n]=r.domElement.toDataURL('image/jpeg',0.90);sc.remove(c.scene);mx.stopAllAction();
          this.dispatchEvent(new CustomEvent('portrait',{detail:{i:n,url:this._urls[n]}}));
        }catch(e){console.warn('portrait failed',ROSTER[n],e);}
        await new Promise(q=>setTimeout(q,0));
      }
      r.dispose();return this._urls;
    })();
    return this._pp;
  }
  _mobileSwipe(){return typeof matchMedia==='function'&&matchMedia('(max-width:520px) and (orientation:portrait)').matches;}
  _size(){const w=this.clientWidth||1,h=this.clientHeight||1;this._r.setSize(w,h,false);this.cam.aspect=w/h;this.cam.updateProjectionMatrix();
    if(this._mobileSwipe()){
      this._mobileMode=true;this.scene.background=null;this.scene.fog=null;this.floor.material=this._mobileShadowMat;this._r.setClearColor(0x000000,0);this._r.domElement.style.background='transparent';
      this.layout={cx:0,sp:1.32,sc:1.38};return;
    }
    this._mobileMode=false;this.scene.background=this._sandBg;this.scene.fog=this._sandFog;this.floor.material=this._solidFloorMat;this._r.setClearColor(SAND,1);this._r.domElement.style.background='';
    const hw=Math.tan(THREE.MathUtils.degToRad(14))*7*this.cam.aspect,left=-hw+2*hw*Math.min(0.5,(Math.min(340,w*0.36)+Math.min(56,w*0.04)+40)/w),avail=hw-left;
    const sp=avail/3;this.layout={cx:left+avail/2,sp:Math.max(sp,1.35),sc:Math.min(1,sp/1.35)};}
  _swipeDelta(dx,dy,dt,w){
    const ax=Math.abs(dx),ay=Math.abs(dy),horizontal=ax>ay*1.08;
    const threshold=Math.max(42,w*0.14),flick=dt<260&&ax>Math.max(30,w*0.09);
    return horizontal&&(ax>=threshold||flick)?(dx<0?1:-1):0;
  }
  _tapSelect(e,el){
    const rc=el.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2((e.clientX-rc.left)/rc.width*2-1,-(e.clientY-rc.top)/rc.height*2+1),this.cam);
    const h=this.ray.intersectObjects(this.slots.map(s=>s.hit))[0];
    if(h)this.dispatchEvent(new CustomEvent('select',{detail:h.object.userData.i,bubbles:true}));
  }
  _input(){
    const el=this._r.domElement;let down=null;
    const finish=(e,cancel=false)=>{
      if(!down||e.pointerId!==down.id)return;
      el.style.cursor='grab';
      const mobile=this._mobileSwipe();
      const cx=Number.isFinite(e.clientX)?e.clientX:down.cx,cy=Number.isFinite(e.clientY)?e.clientY:down.cy;
      const dx=cx-down.x,dy=cy-down.y,dt=Math.max(1,performance.now()-down.t);
      if(mobile){
        const delta=cancel?0:this._swipeDelta(dx,dy,dt,el.clientWidth||1);
        if(delta){
          const N=ROSTER.length,n=(this.idx+delta+N)%N;
          this.slots[this.idx].yaw=0;this.idx=n;this.slots[n].react=0;this._near();
          this.dispatchEvent(new CustomEvent('select',{detail:n,bubbles:true}));
        }else if(!cancel&&down.moved<8)this._tapSelect(e,el);
        this.dragWorld=0;
      }else if(!cancel&&down.moved<5)this._tapSelect(e,el);
      try{if(el.hasPointerCapture?.(e.pointerId))el.releasePointerCapture(e.pointerId);}catch{}
      down=null;
    };
    el.addEventListener('pointerdown',e=>{
      if(e.isPrimary===false)return;
      down={id:e.pointerId,x:e.clientX,y:e.clientY,cx:e.clientX,cy:e.clientY,lx:e.clientX,moved:0,axis:null,t:performance.now()};
      this.dragWorld=0;
      try{el.setPointerCapture(e.pointerId);}catch{}
      el.style.cursor='grabbing';
    });
    el.addEventListener('pointermove',e=>{
      if(!down||e.pointerId!==down.id)return;
      const dxStep=e.clientX-down.lx;down.lx=e.clientX;down.cx=e.clientX;down.cy=e.clientY;
      if(!this._mobileSwipe()){down.moved+=Math.abs(dxStep);this.slots[this.idx].yaw+=dxStep*0.012;return;}
      const dx=e.clientX-down.x,dy=e.clientY-down.y;down.moved=Math.max(down.moved,Math.hypot(dx,dy));
      if(!down.axis&&down.moved>8)down.axis=Math.abs(dx)>=Math.abs(dy)*1.05?'x':'y';
      if(down.axis==='x'){
        e.preventDefault();
        if(!down.coached){down.coached=true;this.dispatchEvent(new CustomEvent('swipeintent',{bubbles:true}));}
        const span=Math.max(1,(el.clientWidth||1)*0.42),ratio=THREE.MathUtils.clamp(dx/span,-1,1);
        this.dragWorld=ratio*(this.layout?.sp||1.32);
      }
    });
    el.addEventListener('pointerup',e=>finish(e,false));
    el.addEventListener('pointercancel',e=>finish(e,true));
  }
  _tick(){
    const dt=Math.min(0.05,this.clock.getDelta()),cards=this.variant==='cards',L=this.layout,k=damp(6,dt);
    this.world.position.x+=(L.cx-this.world.position.x)*damp(5,dt);this.world.scale.setScalar(L.sc);
    const mobile=!!this._mobileMode;
    this.slots.forEach((sl,i)=>{
      const sel=i===this.idx,d=this._cd(i),vis=mobile?sel:Math.abs(d)<=1,g=sl.g;
      const td=THREE.MathUtils.clamp(d,-2,2);
      if(sl.d===null||Math.abs(td-sl.d)>2.5)sl.d=td;
      sl.d+=(td-sl.d)*k;
      g.visible=mobile?sel:Math.abs(sl.d)<1.9;sl.hit.visible=vis;
      if(!g.visible)return;
      const gx=mobile?(this.dragWorld||0):sl.d*L.sp+(this.dragWorld||0);
      g.position.set(gx,0,mobile?0:-Math.abs(sl.d)*0.35+(cards?0:0));
      g.rotation.y=mobile?0:-sl.d*0.12;
      sl.plinth.visible=!cards;sl.card.visible=cards;
      const tf=sel?0:0.55;if(sl.fade<0)sl.fade=tf;sl.fade+=(tf-sl.fade)*k;
      const f=sl.fade;for(const m of sl.mats){m.mt.color.copy(m.c).multiplyScalar(1-f*0.6);m.mt.emissive.copy(m.e).lerp(this._sand||(this._sand=new THREE.Color(SAND)),f);m.mt.emissiveIntensity=m.ei*(1-f)+0.62*f;}
      if(!sel)sl.yaw*=1-damp(3,dt);
      sl.react+=dt;const t=sl.react;
      sl.holder.position.y=t<0.5?Math.sin(Math.PI*t/0.5)*0.28:0;
      const sq=t<0.5?0:(t<0.72?Math.sin(Math.PI*(t-0.5)/0.22)*0.08:0);
      sl.holder.scale.set(1+sq*0.6,1-sq,1+sq*0.6);
      const spin=t<0.62?(1-Math.pow(1-t/0.62,3))*Math.PI*2:0;
      sl.holder.rotation.y=sl.yaw+spin;
      if(sl.mixer){const wt=sel&&this.walk?1:0;sl.wW+=(wt-sl.wW)*k;sl.aW.setEffectiveWeight(sl.wW);sl.aI.setEffectiveWeight(1-sl.wW);sl.mixer.update(dt);}
    });
    this._r.render(this.scene,this.cam);
  }
}
if(!customElements.get('char-stage'))customElements.define('char-stage',CharStage);
