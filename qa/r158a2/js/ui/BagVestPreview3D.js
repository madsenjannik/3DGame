// R158A.2 — one-shot render of the REAL in-repository Life Vest GLB.
// Does not add a second persistent Three.js render loop to the game.
export async function renderRealVestImage(){
  const THREE=await import('three');
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;
  let renderer=null,root=null;
  try{
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
    renderer.setPixelRatio(1);renderer.setSize(320,320,false);
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.3;
    const scene=new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff0d1,0x819679,2.4));
    const key=new THREE.DirectionalLight(0xffe3b2,3.1);
    key.position.set(-4,7,6);scene.add(key);
    const rim=new THREE.DirectionalLight(0xcee7b3,1.4);
    rim.position.set(4,3,-5);scene.add(rim);
    const asset=await new GLTFLoader().loadAsync('./assets/props/life-vest.glb');
    root=asset.scene;
    const bounds=new THREE.Box3().setFromObject(root);
    if(bounds.isEmpty())throw Error('Life Vest GLB has no visible geometry');
    const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const scale=Math.min(2.65/Math.max(.01,size.y),2.5/Math.max(.01,size.x,size.z));
    root.scale.setScalar(scale);
    root.position.set(-center.x*scale,-center.y*scale,-center.z*scale);
    scene.add(root);
    const camera=new THREE.PerspectiveCamera(33,1,.05,40);
    camera.position.set(2.5,1.6,5.6);camera.lookAt(0,0,0);
    renderer.render(scene,camera);
    const image=canvas.toDataURL('image/png');
    if(!image.startsWith('data:image/png;base64,'))throw Error('Life Vest renderer did not return an image');
    return image;
  }finally{
    renderer?.dispose();
    renderer?.forceContextLoss?.();
    root?.traverse(node=>{
      if(!node.isMesh)return;
      node.geometry?.dispose?.();
      for(const m of (Array.isArray(node.material)?node.material:[node.material]).filter(Boolean)){
        for(const k of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap'])m[k]?.dispose?.();
        m.dispose?.();
      }
    });
  }
}
