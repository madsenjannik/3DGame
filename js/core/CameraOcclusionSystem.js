// @ts-nocheck
import * as THREE from 'three';
import { damp } from '../visual/VisualKit.js';

// R21: global third-person camera collision without changing the accepted chase feel.
// R21C audits the authored camera blockers so traversable interiors never use a giant
// whole-building AABB. Orangery + greenhouse now expose their exact physical wall data.
export class CameraOcclusionSystem {
  constructor({world,homePortal,greenhouse,orangery,stable}={}){
    this.world=world;this.homePortal=homePortal;this.greenhouse=greenhouse;this.orangery=orangery;this.stable=stable;
    this.enabled=true;
    this.margin=.20;
    this.clearance=.24;
    // Emergency close-third-person floor. This is only reached when a real physical
    // blocker leaves no room for the accepted chase distance; it is not a camera mode.
    this.minDistance=.32;
    this.currentDistance=0;
    this.targetDistance=0;
    this.occluded=false;
    // R21A/R21B stability: blocked entry is immediate, release is sticky and calm.
    this.releaseDelay=.14;
    this.releaseTimer=0;
    this.lastBlockedDistance=0;
    this.retractDamping=18;
    this.restoreDamping=4.6;
    // R21D: enclosed/roofed structures can switch to a cutaway presentation before
    // the camera collapses into the character. Solid homes and world obstacles keep
    // the original emergency floor; only audited roofed structures use this floor.
    this.structureMinDistance=1.08;
    this.lastHitSource=null;
    this.lastBlockedSource=null;

    this.dir=new THREE.Vector3();
    this.segment=new THREE.Vector3();
    this.tmp=new THREE.Vector3();
    this.hit=new THREE.Vector3();
    this.ray=new THREE.Ray();
    this.box=new THREE.Box3();
    this.expand=new THREE.Vector3(this.margin,this.margin,this.margin);
  }

  // R21B: initialize collision state from the actual current camera ray.
  prime(start,desired,out){
    out=out||this.tmp;
    const delta=this.segment.copy(desired).sub(start),maxDist=delta.length();
    if(maxDist<1e-5){
      this.currentDistance=0;this.targetDistance=0;this.lastBlockedDistance=0;
      this.occluded=false;this.releaseTimer=0;return out.copy(desired);
    }
    let target=maxDist;
    if(this.enabled){
      const hitDist=this.nearestDistance(start,desired,maxDist);
      if(hitDist<maxDist-.01){
        const floor=this.cutawaySource(this.lastHitSource)?this.structureMinDistance:this.minDistance;
        target=Math.min(maxDist,Math.max(floor,hitDist-this.clearance));
        this.occluded=true;this.lastBlockedDistance=target;this.lastBlockedSource=this.lastHitSource;
      }else{
        this.occluded=false;this.lastBlockedDistance=0;this.lastBlockedSource=null;
      }
    }else{
      this.occluded=false;this.lastBlockedDistance=0;this.lastBlockedSource=null;
    }
    this.releaseTimer=0;this.currentDistance=target;this.targetDistance=target;
    out.copy(start).addScaledVector(delta.multiplyScalar(1/maxDist),target);
    const ground=this.world?.groundHeight?.(out.x,out.z)??-Infinity;
    out.y=Math.max(out.y,ground+.58);
    return out;
  }

  setEnabled(v=true){this.enabled=!!v;}

  rayBoxDistance(start,dir,maxDist,box){
    if(!box||box.isEmpty?.())return maxDist;
    this.box.copy(box);this.box.min.sub(this.expand);this.box.max.add(this.expand);
    // If the stable character chest point is genuinely inside a non-traversable box,
    // retract immediately. R21C removes this test entirely for traversable buildings.
    if(this.box.containsPoint(start))return 0;
    this.ray.set(start,dir);
    const p=this.ray.intersectBox(this.box,this.hit);if(!p)return maxDist;
    const d=start.distanceTo(p);return d>=0&&d<=maxDist?d:maxDist;
  }

  rayCylinderDistance(start,end,maxDist,o){
    if(!o||o.space&&o.space!==this.world.space)return maxDist;
    const radius=(o.r||0)+this.margin;
    const height=o.height||0;
    // Tiny pebbles/posts should not make the camera breathe. Tall or substantial
    // traversal obstacles (trees, rocks, walls) remain valid occluders.
    if(radius<.28&&height<1.15)return maxDist;
    const dx=end.x-start.x,dz=end.z-start.z;
    const ox=start.x-o.x,oz=start.z-o.z;
    const a=dx*dx+dz*dz;if(a<1e-8)return maxDist;
    const b=2*(ox*dx+oz*dz),c=ox*ox+oz*oz-radius*radius;
    const disc=b*b-4*a*c;if(disc<0)return maxDist;
    const s=Math.sqrt(disc),den=2*a;
    const roots=[(-b-s)/den,(-b+s)/den];
    const base=this.world.groundHeight(o.x,o.z)-.12,top=base+height+.32;
    for(const t of roots){
      if(t<0||t>1)continue;
      const y=start.y+(end.y-start.y)*t;
      if(y<base||y>top)continue;
      return Math.min(maxDist,maxDist*t);
    }
    return maxDist;
  }

  activeHomeBox(){return this.homePortal?.cameraOcclusionBox?.()||null;}

  cabinBox(){
    if(this.world?.space!=='world')return null;
    const land=this.world?.sharedLandscape,c=land?.cabin;if(!c)return null;
    // Audited R21C: this is the authored cabin HOUSE only. Pier, boat and water route
    // are deliberately excluded, and the player never traverses the cabin interior.
    const hx=c.hx+.18,hz=c.hz+.18,co=Math.cos(c.rotation),si=Math.sin(c.rotation);
    const corners=[[-hx,-hz],[-hx,hz],[hx,-hz],[hx,hz]];
    let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(const [x,z] of corners){const wx=c.x+co*x+si*z,wz=c.z-si*x+co*z;minX=Math.min(minX,wx);maxX=Math.max(maxX,wx);minZ=Math.min(minZ,wz);maxZ=Math.max(maxZ,wz);}
    const y0=c.rootY+.18,y1=c.rootY+3.45;
    return this.box.set(new THREE.Vector3(minX,y0,minZ),new THREE.Vector3(maxX,y1,maxZ)).clone();
  }

  cutawaySource(source){return source==='cabin'||source==='greenhouse'||source==='orangery'||source==='stable';}

  nearestDistance(start,end,maxDist){
    let d=maxDist,source=null;
    const consider=(value,name)=>{if(value<d-1e-4){d=value;source=name;}};
    const dir=this.dir.copy(end).sub(start);const L=dir.length();if(L<1e-5){this.lastHitSource=null;return maxDist;}dir.multiplyScalar(1/L);

    // Existing physical world obstacles: trees, rocks, stone walls, cairns, etc.
    const obstacles=this.world?.obstacles||[];
    for(const o of obstacles){
      const rr=(o.r||0)+maxDist+this.margin,px=start.x-o.x,pz=start.z-o.z;
      if(px*px+pz*pz>rr*rr)continue;
      consider(this.rayCylinderDistance(start,end,maxDist,o),'world-obstacle');
    }

    // Traversable authored structures use their exact physical walls. R21D also
    // records which structure caused the closest hit so visibility/cutaway logic can
    // react consistently without turning every close encounter into first person.
    if(this.world?.space==='garden'&&this.greenhouse?.cameraOcclusionDistance){
      consider(this.greenhouse.cameraOcclusionDistance(start,end,maxDist,this.margin),'greenhouse');
    }
    if(this.world?.space==='world'&&this.orangery?.cameraOcclusionDistance){
      consider(this.orangery.cameraOcclusionDistance(start,end,maxDist,this.margin),'orangery');
    }
    if(this.world?.space==='world'&&this.stable?.cameraOcclusionDistance){
      consider(this.stable.cameraOcclusionDistance(start,end,maxDist,this.margin),'stable');
    }

    const home=this.activeHomeBox();if(home)consider(this.rayBoxDistance(start,dir,maxDist,home),'home');
    const cabin=this.cabinBox();if(cabin)consider(this.rayBoxDistance(start,dir,maxDist,cabin),'cabin');
    this.lastHitSource=d<maxDist-.01?source:null;
    return d;
  }

  resolve(start,desired,dt,out){
    out=out||this.tmp;
    const delta=this.segment.copy(desired).sub(start),maxDist=delta.length();
    if(maxDist<1e-5){this.currentDistance=0;this.targetDistance=0;this.occluded=false;return out.copy(desired);}
    if(!this.enabled){this.currentDistance=maxDist;this.targetDistance=maxDist;this.occluded=false;return out.copy(desired);}

    const hitDist=this.nearestDistance(start,desired,maxDist);
    const rawBlocked=hitDist<maxDist-.01;
    let target=maxDist;

    if(rawBlocked){
      const floor=this.cutawaySource(this.lastHitSource)?this.structureMinDistance:this.minDistance;
      const rawTarget=Math.min(maxDist,Math.max(floor,hitDist-this.clearance));
      this.releaseTimer=0;
      if(!this.occluded||!this.targetDistance||!Number.isFinite(this.targetDistance)){
        this.targetDistance=rawTarget;
      }else if(rawTarget<this.targetDistance){
        this.targetDistance=rawTarget;
      }else{
        this.targetDistance+=(rawTarget-this.targetDistance)*damp(9,dt);
      }
      this.lastBlockedDistance=this.targetDistance;
      this.lastBlockedSource=this.lastHitSource;
      this.occluded=true;
      target=this.targetDistance;
    }else if(this.occluded){
      this.releaseTimer+=dt;
      if(this.releaseTimer<this.releaseDelay){
        const floor=this.cutawaySource(this.lastBlockedSource)?this.structureMinDistance:this.minDistance;
        target=Math.min(maxDist,Math.max(floor,this.lastBlockedDistance||this.currentDistance||floor));
        this.targetDistance=target;
      }else{
        this.occluded=false;
        this.releaseTimer=0;
        this.lastBlockedSource=null;
        this.targetDistance=maxDist;
        target=maxDist;
      }
    }else{
      this.targetDistance=maxDist;
      target=maxDist;
    }

    if(!this.currentDistance||!Number.isFinite(this.currentDistance))this.currentDistance=maxDist;
    const damping=target<this.currentDistance?this.retractDamping:this.restoreDamping;
    this.currentDistance+=(target-this.currentDistance)*damp(damping,dt);
    if(this.occluded&&this.currentDistance>target+.08)this.currentDistance=target+.08;
    const activeFloor=this.cutawaySource(this.lastHitSource||this.lastBlockedSource)?this.structureMinDistance:this.minDistance;
    this.currentDistance=Math.min(maxDist,Math.max(activeFloor,this.currentDistance));

    out.copy(start).addScaledVector(delta.multiplyScalar(1/maxDist),this.currentDistance);
    const ground=this.world?.groundHeight?.(out.x,out.z)??-Infinity;
    out.y=Math.max(out.y,ground+.58);
    return out;
  }

  snap(){this.currentDistance=0;this.targetDistance=0;this.occluded=false;this.releaseTimer=0;this.lastBlockedDistance=0;this.lastHitSource=null;this.lastBlockedSource=null;}
}
