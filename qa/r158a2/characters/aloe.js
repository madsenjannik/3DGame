import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function create(){
  const url=new URL('../assets/characters/aloe-vera.glb', import.meta.url).href;
  const gltf=await new GLTFLoader().loadAsync(url);
  const scene=gltf.scene;
  scene.name='aloe';
  scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return {scene,clips:gltf.animations||[]};
}
