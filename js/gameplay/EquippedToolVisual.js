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

export class EquippedToolVisual{
  constructor(game){
    this.g=game;this.id=null;this.current=null;this.models=new Map();this.tmpScale=new THREE.Vector3();
    this.hand=game.character?.instance?.socket?.('Hand_Socket_R')||game.character?.instance?.socket?.('Hand_R')||null;
  }
  model(id){
    if(!ALIGN[id]||!this.hand)return null;
    let m=this.models.get(id);
    if(!m){
      m=buildHeldTool(id);if(!m)return null;
      m.name=`HOTBAR_HELD_${id.toUpperCase()}_R102`;m.visible=false;
      const a=ALIGN[id];m.position.fromArray(a.p);m.rotation.set(...a.r);
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
