// @ts-nocheck
// R102 desktop hotbar held-item visual.
// Axe / Pickaxe / Sickle / Watering Can use the actual triangle geometry and source materials
// extracted from Jannik's supplied GLBs. They are mounted to the authored Hand_Socket_R,
// not billboard sprites. Fishing keeps its dedicated R80 grip/rod; Lantern keeps its R81 GLB.
import * as THREE from 'three';
import { buildHeldTool } from './HeldToolGeometry.js?build=HOTBAR-HAND-DRAG-R102-20261006A';

const ALIGN={
  axe:{s:1.00,p:[0,0,0],r:[0,Math.PI/2,.08]},
  pickaxe:{s:1.00,p:[0,0,0],r:[0,Math.PI/2,.06]},
  sickle:{s:1.08,p:[0,0,0],r:[0,Math.PI/2,.08]},
  can:{s:1.00,p:[0,0,0],r:[0,Math.PI/2,0]}
};

// R143 (GO 09/10): Hand_Socket_R is authored differently per character (arms down vs T-pose), so one ALIGN only fitted
// Daisy. Each character's right-hand socket in its idle pose, relative to the character root (measured 09/10); a tool is
// turned by inv(handRel[char]) * handRel[daisy] before ALIGN, so every character holds it the way Daisy does, and it
// still follows the hand's animation (strike swings).
const HAND_REL={daisy:[0.1746,-0.6459,0.1524,0.7274],cactus:[-0.0398,-0.0302,-0.6438,0.7635],swamp:[-0.455,-0.0478,-0.1558,0.8755],aloe:[-0.0497,-0.0059,-0.1794,0.9825],tulip:[0.5565,-0.376,-0.2844,0.6841],hyacinth:[0.4514,-0.5258,-0.4179,0.5876],succulent:[-0.455,-0.0477,-0.1558,0.8755],spire:[-0.0651,-0.0376,-0.5545,0.8289],fern:[-0.1342,-0.0236,-0.1995,0.9704]};
const REF=new THREE.Quaternion().fromArray(HAND_REL.daisy);

export class EquippedToolVisual{
  constructor(game){
    this.g=game;this.id=null;this.current=null;this.models=new Map();this.tmpScale=new THREE.Vector3();
    this.hand=game.character?.instance?.socket?.('Hand_Socket_R')||game.character?.instance?.socket?.('Hand_R')||null;
    const rel=HAND_REL[game.state?.player?.characterId];this.fix=rel?new THREE.Quaternion().fromArray(rel).invert().multiply(REF):new THREE.Quaternion();   // R143
  }
  model(id){
    if(!ALIGN[id]||!this.hand)return null;
    let m=this.models.get(id);
    if(!m){
      m=buildHeldTool(id);if(!m)return null;
      m.name=`HOTBAR_HELD_${id.toUpperCase()}_R102`;m.visible=false;
      const a=ALIGN[id];m.position.fromArray(a.p);m.rotation.set(...a.r);m.quaternion.premultiply(this.fix);   // R143: per-character hand fix
      this.hand.add(m);this.models.set(id,m);this.fit(id,m);
    }
    return m;
  }
  fit(id,m){
    const ws=this.hand?.getWorldScale?.(this.tmpScale)?.x||1,a=ALIGN[id];if(!a||!m)return;
    // Source tools are authored in metres with the grip at the origin. Cancel character/socket
    // scaling so the Axe/Pickaxe remain ~0.55-0.65 m in world space and are clearly readable.
    m.scale.setScalar(a.s/ws);
  }
  set(id){
    id=ALIGN[id]?id:null;if(this.id===id)return;
    if(this.current)this.current.visible=false;this.id=id;this.current=id?this.model(id):null;
  }
  update(){
    const world=this.g.world?.space;
    const blocked=this.g.fishing?.isBusy?.()||this.g.stable?.isBusy?.()||this.g.homePortal?.busy||this.g.buildMode?.active||this.g.state?.choice?.open;
    const show=!!(this.current&&(world==='world'||world==='garden')&&!blocked);
    if(this.current){this.fit(this.id,this.current);this.current.visible=show;}
  }
}
