// @ts-nocheck
// R158A: lightweight, live previews of the game's actual greenhouse/workshop GLBs.
// One offscreen-safe renderer per Workbench panel, one active GLB, no game scene mutations.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const PREVIEW_ASSETS = Object.freeze({
  greenhouse: [
    './assets/greenhouses/greenhouse-l1.glb',
    './assets/greenhouses/greenhouse-l2.glb',
    './assets/greenhouses/greenhouse-l3.glb'
  ],
  workshop: [
    './assets/garden/workshop_l1.glb',
    './assets/garden/workshop_l2.glb',
    './assets/garden/workshop_l3.glb'
  ]
});
const clampLevel = level => Math.min(3, Math.max(1, Number(level) | 0));

export class WorkbenchPreview3D {
  constructor(canvas, statusElement) {
    this.canvas=canvas; this.status=statusElement; this.visible=false; this.token=0;
    this.loader=new GLTFLoader();this.renderer=null;this.model=null;this.mixer=null;
    this.loadedKey='';this.frame=0;this.last=0;this.startAt=0;this.failed=false;
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(33,1,.05,100);
    this.camera.position.set(4.5,2.9,7.1);this.camera.lookAt(0,.92,0);
    this.scene.add(new THREE.HemisphereLight(0xf5f0dd,0x74815e,2.3));
    const key=new THREE.DirectionalLight(0xffe1af,3.0);key.position.set(-3,7,5);this.scene.add(key);
    const rim=new THREE.DirectionalLight(0xc1e5b1,1.6);rim.position.set(4,4,-5);this.scene.add(rim);
    this.ground=new THREE.Mesh(new THREE.CircleGeometry(1.65,48),
      new THREE.MeshBasicMaterial({color:0x1a2118,transparent:true,opacity:.18,depthWrite:false}));
    this.ground.rotation.x=-Math.PI/2;this.ground.position.y=-.06;this.ground.scale.set(1.0,.65,1);
    this.scene.add(this.ground);
    this.reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    this._visibility=()=>{if(document.hidden)this.stop();else if(this.visible)this.start();};
    document.addEventListener('visibilitychange',this._visibility);
  }
  initRenderer(){
    if(this.renderer||this.failed)return !this.failed;
    try{
      this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:!document.body.classList.contains('touch'),
        powerPreference:'low-power',preserveDrawingBuffer:false});
      this.renderer.setClearColor(0x000000,0);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure=1.25;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
      return true;
    }catch(e){this.failed=true;this.setStatus('3D preview unavailable');console.warn('[R158A] WebGL preview unavailable',e);return false;}
  }
  setStatus(message){
    if(!this.status)return;this.status.textContent=message||'';
    this.status.hidden=!message;
  }
  async select(kind,level){
    if(!PREVIEW_ASSETS[kind])return;
    level=clampLevel(level);const file=PREVIEW_ASSETS[kind][level-1];
    if(file===this.loadedKey&&this.model){if(this.visible)this.start();return;}
    if(file===this.requestedKey&&!this.model)return; // Avoid concurrent duplicate GLB fetches during React-less re-renders.
    this.requestedKey=file;
    const token=++this.token;this.setStatus('Loading actual '+kind+' level '+level+'…');
    if(this.model){this.scene.remove(this.model);this.release(this.model);this.model=null;this.mixer=null;}
    this.loadedKey='';
    if(!this.visible)return; // a closed panel must never load another large GLB.
    if(!this.initRenderer())return;
    try{
      const gltf=await this.loader.loadAsync(file);
      if(token!==this.token||!this.visible){
        this.release(gltf.scene);return; // stale GLB can never replace the newer selection
      }
      const root=gltf.scene;
      const box=new THREE.Box3().setFromObject(root);
      if(box.isEmpty())throw Error('Empty GLB model');
      const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
      const scale=Math.min(3.05/Math.max(.1,size.x,size.z),2.5/Math.max(.1,size.y));
      root.scale.setScalar(scale);root.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
      // Use the asset's existing culling/materials; do not alter the authored GLB.
      this.scene.add(root);this.model=root;this.baseY=root.position.y;this.loadedKey=file;this.requestedKey='';
      const idle=(gltf.animations||[]).find(c=>/^idle$/i.test(c.name));
      if(idle){this.mixer=new THREE.AnimationMixer(root);this.mixer.clipAction(idle).play();}
      this.setStatus('');this.start();
    }catch(e){
      if(token===this.token){this.requestedKey='';this.setStatus('Preview unavailable · model kept in game');console.warn('[R158A] Preview model load failed',file,e);}
    }
  }
  release(root){
    root?.traverse(o=>{
      if(!o.isMesh)return;
      o.geometry?.dispose?.();
      for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){
        // Materials/textures are private to this standalone GLTFLoader scene.
        for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap','alphaMap'])m[key]?.dispose?.();
        m.dispose?.();
      }
    });
  }
  show(kind,level){
    this.visible=true;
    this.start();
    void this.select(kind,level);
  }
  hide(){
    this.visible=false;this.token++;this.requestedKey='';this.stop();
    // Release GPU allocations while a potentially long session continues elsewhere.
    if(this.model){this.scene.remove(this.model);this.release(this.model);this.model=null;this.mixer=null;this.loadedKey='';}
    this.setStatus('');
  }
  start(){
    if(!this.visible||document.hidden||!this.initRenderer()||this.frame)return;
    this.last=0;this.startAt=performance.now();
    this.frame=requestAnimationFrame(time=>this.tick(time));
  }
  stop(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.last=0;}
  tick(time){
    this.frame=0;
    if(!this.visible||document.hidden||!this.renderer)return;
    const mobile=document.body.classList.contains('touch');
    // GPU work is capped at 18fps mobile / 24fps desktop while the game continues at its own frame rate.
    const budget=mobile?55:40;if(this.last&&time-this.last<budget){this.frame=requestAnimationFrame(t=>this.tick(t));return;}
    const dt=this.last?Math.min(.08,(time-this.last)/1000):0;this.last=time;
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight;
    if(w>=8&&h>=8){
      const ratio=Math.min(window.devicePixelRatio||1,mobile?1.25:1.65);
      if(this._w!==w||this._h!==h||this._ratio!==ratio){
        this._w=w;this._h=h;this._ratio=ratio;
        this.renderer.setPixelRatio(ratio);this.renderer.setSize(w,h,false);
        this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
      }
      if(this.model){
        if(!this.reduced){
          const t=(time-this.startAt)/1000;
          this.model.position.y=this.baseY+.09+Math.sin(t*1.25)*.045;
          this.model.rotation.y=.28+Math.sin(t*.35)*.17;
          this.mixer?.update(dt);
        }
        this.renderer.render(this.scene,this.camera);
      }else{
        this.renderer.clear();
      }
    }
    // Limit to ~24fps desktop / 18fps phone (game remains on its own renderer).
    this.frame=requestAnimationFrame(t=>this.tick(t));
  }
}
