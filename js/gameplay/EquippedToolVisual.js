// @ts-nocheck
// R101 desktop hotbar held-item visual.
// The exact approved hotbar renders are reused as small world-space sprites at the right hand.
// This keeps the held item visually faithful without inventing replacement geometry; Fishing and
// Lantern continue to own their existing dedicated in-hand presentation.
import * as THREE from 'three';

const ART={
  axe:'./brand/icons/tool3d/icon-axe.png?v=R101-20261006',
  pickaxe:'./brand/icons/tool3d/icon-pickaxe.png?v=R101-20261006',
  sickle:'./brand/icons/tool3d/icon-sickle.png?v=R101-20261006',
  can:'./brand/icons/tool3d/icon-watering-can.png?v=R101-20261006',
  rod:'./brand/icons/tool3d/icon-rod.png?v=R101-20261006'
};
const SCALE={axe:.50,pickaxe:.54,sickle:.47,can:.42,rod:.54};

export class EquippedToolVisual{
  constructor(game){
    this.g=game;this.id=null;this.maps=new Map();this.loader=new THREE.TextureLoader();this.tmp=new THREE.Vector3();
    this.hand=game.character?.instance?.socket?.('Hand_R')||game.character?.instance?.socket?.('Hand_Socket_R')||null;
    const mat=this.mat=new THREE.SpriteMaterial({transparent:true,depthTest:true,depthWrite:false,alphaTest:.04,toneMapped:false});
    const sprite=this.sprite=new THREE.Sprite(mat);sprite.name='HOTBAR_HELD_ITEM_R101';sprite.visible=false;sprite.renderOrder=3;
    game.scene.add(sprite);
    for(const [id,url] of Object.entries(ART))this.loader.load(url,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,game.renderer?.capabilities?.getMaxAnisotropy?.()||1);this.maps.set(id,t);if(this.id===id)this.apply();},undefined,()=>{});
  }
  set(id){if(this.id===id)return;this.id=id||null;this.apply();}
  apply(){
    const t=this.maps.get(this.id);if(t){this.mat.map=t;this.mat.needsUpdate=true;}
    const s=SCALE[this.id]||0;this.sprite.scale.set(s,s,1);
  }
  update(){
    const id=this.id,world=this.g.world?.space;
    const blocked=this.g.fishing?.isBusy?.()||this.g.stable?.isBusy?.()||this.g.homePortal?.busy||this.g.buildMode?.active||this.g.state?.choice?.open;
    const show=!!(this.hand&&ART[id]&&this.maps.get(id)&&(world==='world'||world==='garden')&&!blocked);
    this.sprite.visible=show;if(!show)return;
    this.hand.getWorldPosition(this.tmp);this.tmp.y+=id==='can'?.10:.17;this.sprite.position.copy(this.tmp);
  }
}
