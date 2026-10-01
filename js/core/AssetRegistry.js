// @ts-nocheck
import * as THREE from 'three';

const GAMEPLAY_CHARACTER_SCALE_MULTIPLIER = 1.10;

export class AssetRegistry {
  constructor(characterCatalog) {
    this.characters = new Map(Object.values(characterCatalog).map(d => [d.id, d]));
  }

  getCharacterDefinition(id) {
    const def = this.characters.get(id);
    if (!def) throw new Error(`Unknown CharacterID: ${id}`);
    return def;
  }

  async instantiateCharacter(id, context = {}) {
    const def = this.getCharacterDefinition(id);
    if (def.source.type === 'procedural') {
      const visual = def.source.factory(context);
      return { definition: def, ...visual };
    }

    if (def.source.type === 'claudeModule') {
      const moduleUrl = new URL(def.source.moduleUrl, document.baseURI).href;
      const sourceModule = await import(moduleUrl);
      const created = await sourceModule.create();
      const visualRoot = created.scene;
      if (def.source.targetHeight) {
        visualRoot.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(visualRoot);
        const height = Math.max(0.001, box.max.y - box.min.y);
        visualRoot.scale.multiplyScalar(def.source.targetHeight / height);
        visualRoot.updateMatrixWorld(true);
        const grounded = new THREE.Box3().setFromObject(visualRoot);
        visualRoot.position.y -= grounded.min.y;
      }
      visualRoot.traverse(o => {
        if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });
      const root = new THREE.Group();root.name=`${def.id}-gameplay-root`;root.add(visualRoot);
      const mixer = new THREE.AnimationMixer(visualRoot);
      const actions = new Map();
      for (const clip of created.clips || []) actions.set(clip.name, mixer.clipAction(clip));
      const idleName=def.source.animationMap?.Idle||'Idle',walkName=def.source.animationMap?.Walk||'Walk';
      const idle=actions.get(idleName),walk=actions.get(walkName);
      idle?.reset().play();walk?.reset().play();idle?.setEffectiveWeight(1);walk?.setEffectiveWeight(0);
      let lean=0;
      return {
        definition: def,
        root,
        updateVisual({ dt, speed, maxSpeed=4.15, turnRate=0 }) {
          const w=THREE.MathUtils.smoothstep(speed,.04,1.35);
          if(idle&&walk){
            idle.setEffectiveWeight(1-w);walk.setEffectiveWeight(w);
            const speedN=THREE.MathUtils.clamp(speed/Math.max(maxSpeed,.001),0,1);
            walk.setEffectiveTimeScale(THREE.MathUtils.clamp(THREE.MathUtils.lerp(.72,1.28,speedN),.55,1.75));
          }
          const targetLean=THREE.MathUtils.clamp(-turnRate*.035,-.20,.20);lean+=(targetLean-lean)*(1-Math.exp(-9*dt));visualRoot.rotation.z=lean;
          mixer.update(dt);
        },
        flash() {}
      };
    }

    if (def.source.type === 'gltf') {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(def.source.url);
      const visualRoot = gltf.scene;
      visualRoot.scale.setScalar((def.source.scale || 1) * GAMEPLAY_CHARACTER_SCALE_MULTIPLIER);
      visualRoot.traverse(o => {
        if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });
      // Gameplay owns the outer root and heading. The inner visual root may lean without affecting movement/collision.
      const root = new THREE.Group();root.name=`${def.id}-gameplay-root`;root.add(visualRoot);
      const mixer = new THREE.AnimationMixer(visualRoot);
      const actions = new Map();
      for (const clip of gltf.animations) actions.set(clip.name, mixer.clipAction(clip));
      const idleName=def.source.animationMap?.Idle||'Idle',walkName=def.source.animationMap?.Walk||'Walk',hopName=def.source.animationMap?.Hop||'Hop';
      const idle=actions.get(idleName),walk=actions.get(walkName),hop=actions.get(hopName);
      idle?.reset().play();walk?.reset().play();idle?.setEffectiveWeight(1);walk?.setEffectiveWeight(0);
      if(hop){hop.setLoop(THREE.LoopOnce,1);hop.clampWhenFinished=false;hop.setEffectiveWeight(1);}
      let lean=0;
      return {
        definition: def,
        root,
        playHop(){if(!hop)return;hop.stop();hop.reset();hop.enabled=true;hop.setLoop(THREE.LoopOnce,1);hop.setEffectiveWeight(1);hop.setEffectiveTimeScale(1);hop.play();},
        updateVisual({ dt, speed, maxSpeed=4.15, turnRate=0 }) {
          const w=THREE.MathUtils.smoothstep(speed,.04,1.35);
          if(idle&&walk){
            idle.setEffectiveWeight(1-w);walk.setEffectiveWeight(w);
            const base=def.source.animationPlaybackRate?.[walkName]||1;
            const speedN=THREE.MathUtils.clamp(speed/Math.max(maxSpeed,.001),0,1);
            walk.setEffectiveTimeScale(THREE.MathUtils.clamp(base*THREE.MathUtils.lerp(.72,1.28,speedN),.55,1.75));
          } else {
            const target=speed>.1?walkName:idleName;
            for(const [name,action] of actions)action.setEffectiveWeight(name===target?1:0);
          }
          const targetLean=THREE.MathUtils.clamp(-turnRate*.035,-.20,.20);lean+=(targetLean-lean)*(1-Math.exp(-9*dt));visualRoot.rotation.z=lean;
          mixer.update(dt);
        },
        flash() {}
      };
    }

    throw new Error(`Unsupported character source: ${def.source.type}`);
  }
}
