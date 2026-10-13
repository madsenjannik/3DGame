// @ts-nocheck
import * as THREE from 'three';
import { damp } from './VisualKit.js';

function cloneFadeMaterials(root,predicate,floor=.06){
  const records=[];
  if(!root)return records;
  root.traverse(o=>{
    if(!o.isMesh||!predicate(o))return;
    const src=Array.isArray(o.material)?o.material:[o.material];
    const clones=src.map(m=>m?.clone?.()||m);
    o.material=Array.isArray(o.material)?clones:clones[0];
    records.push({mesh:o,floor,mats:clones.map(m=>({m,opacity:m?.opacity??1,transparent:!!m?.transparent,depthWrite:m?.depthWrite!==false}))});
  });
  return records;
}

function applyFade(records,amount){
  amount=THREE.MathUtils.clamp(amount,0,1);
  for(const r of records)for(const st of r.mats){
    const m=st.m;if(!m)continue;
    m.opacity=st.opacity*THREE.MathUtils.lerp(1,r.floor,amount);
    const transparent=st.transparent||amount>.002,depthWrite=amount>.015?false:st.depthWrite;
    if(m.transparent!==transparent||m.depthWrite!==depthWrite){m.transparent=transparent;m.depthWrite=depthWrite;m.needsUpdate=true;}
  }
}

export class StructureVisibilitySystem{
  constructor({world,greenhouse,orangery,stable,cameraOcclusion}={}){
    this.world=world;this.greenhouse=greenhouse;this.orangery=orangery;this.stable=stable;this.cameraOcclusion=cameraOcclusion;
    this.cabinRecords=[];this.greenhouseRecords=[];this.orangeryRecords=[];this.stableRecords=[];
    this.cabinRoot=null;this.boundGreenhouse=false;this.boundOrangery=false;this.boundStable=false;
    this.amount={cabin:0,greenhouse:0,orangery:0,stable:0};
  }

  bind(){
    const cabin=this.world?.sharedLandscape?.cabinAsset?.root;
    if(cabin&&cabin!==this.cabinRoot){
      this.cabinRoot=cabin;
      // Cabin is the only opaque enclosed structure in current normal traversal.
      // Fade roof + tar facade/interior backing as a cutaway when the camera has no
      // physical room, while wood framing/props stay visible for spatial context.
      this.cabinRecords=cloneFadeMaterials(cabin,o=>/Cabin_(Grass_Roof|Wall_Tar|Interior_Emissive)/i.test(o.name||''),.05);
    }
    if(!this.boundOrangery&&this.orangery?.building){
      this.orangeryRecords=cloneFadeMaterials(this.orangery.building,o=>/Orangeri_A_Roof/i.test(o.name||''),.07);
      this.boundOrangery=true;
    }
    if(!this.boundGreenhouse&&this.greenhouse?.entries?.size){
      const roofRE=/(Roof|Rafter|Ridge|Eave|Gable|Alu_Top_|Valley|Vent_)/i;
      for(const e of this.greenhouse.entries.values())this.greenhouseRecords.push(...cloneFadeMaterials(e.root,o=>roofRE.test(o.name||''),.06));
      this.boundGreenhouse=true;
    }
    if(!this.boundStable&&this.stable?.cameraCutawayRoot?.()){
      const sr=this.stable.cameraCutawayRoot();
      this.stableRecords=cloneFadeMaterials(sr,o=>/^Stable_(Tile|TileDark)$/i.test(o.name||''),.06);
      this.boundStable=true;
    }
  }

  update(dt,{enabled=true}={}){
    this.bind();
    if(!enabled){
      this.amount.cabin=this.amount.greenhouse=this.amount.orangery=this.amount.stable=0;
      applyFade(this.cabinRecords,0);applyFade(this.greenhouseRecords,0);applyFade(this.orangeryRecords,0);applyFade(this.stableRecords,0);return;
    }
    const occ=this.cameraOcclusion;
    const source=enabled&&occ?.occluded?(occ.lastHitSource||occ.lastBlockedSource):null;
    const close=Math.min(occ?.currentDistance||99,occ?.targetDistance||99)<1.45;
    const targets={
      cabin:source==='cabin'&&close?1:0,
      greenhouse:source==='greenhouse'&&close?1:0,
      orangery:source==='orangery'&&close?1:0,
      stable:source==='stable'&&close?1:0
    };
    for(const key of ['cabin','greenhouse','orangery','stable']){
      const rate=targets[key]>this.amount[key]?12:5.5;
      this.amount[key]+=(targets[key]-this.amount[key])*damp(rate,dt);
    }
    applyFade(this.cabinRecords,this.amount.cabin);
    applyFade(this.greenhouseRecords,this.amount.greenhouse);
    applyFade(this.orangeryRecords,this.amount.orangery);
    applyFade(this.stableRecords,this.amount.stable);
  }
}
