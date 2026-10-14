// @ts-nocheck
import * as THREE from 'three';
import { color, damp, makeLeaf, patchMaterial, radialTexture, smooth } from './VisualKit.js';

export function createSproutVisual({ uTime }) {
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 0.10; root.add(body);

  const profile = [[0,0],[0.13,0.012],[0.24,0.06],[0.305,0.14],[0.33,0.24],[0.318,0.34],[0.285,0.44],[0.225,0.53],[0.15,0.6],[0.07,0.65],[0,0.665]];
  const pts = new THREE.SplineCurve(profile.map(p=>new THREE.Vector2(p[0],p[1]))).getPoints(32);
  const geo = new THREE.LatheGeometry(pts, 36);
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal;
  const colors = new Float32Array(p.count*3), c = new THREE.Color();
  const bot=color(0x5f6e3a),top=color(0x9db275),bel=color(0xcdd2a0);
  for(let i=0;i<p.count;i++){
    const k=p.getY(i)/0.665;c.copy(bot).lerp(top,smooth(0,0.75,k));
    const b=smooth(0.35,0.95,n.getZ(i))*Math.max(0,1-Math.abs(k-0.33)*2.4);c.lerp(bel,b*0.85);
    colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
  }
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const bodyMat=patchMaterial(new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:0.58,sheen:0.7,sheenColor:0xe3ecb8,sheenRoughness:0.45,emissive:0xffc070,emissiveIntensity:0}),{rim:0x31421c,rimPower:2.2,uTime});
  const bm=new THREE.Mesh(geo,bodyMat);bm.castShadow=true;body.add(bm);

  const eyeMat=new THREE.MeshPhysicalMaterial({color:0x15170e,roughness:0.18,clearcoat:1,clearcoatRoughness:0.1});
  const hiMat=new THREE.MeshBasicMaterial({color:0xfdfbf2});
  const eyes=[];
  [-1,1].forEach(sx=>{
    const a=0.35*sx,r=0.292,y=0.40;const e=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),eyeMat);
    const dir=new THREE.Vector3(Math.sin(a),0.1,Math.cos(a)).normalize();e.position.set(Math.sin(a)*r,y,Math.cos(a)*r);e.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir);e.scale.set(0.04,0.056,0.028);
    const h=new THREE.Mesh(new THREE.SphereGeometry(0.26,10,8),hiMat);h.position.set(0.32,0.42,0.86);e.add(h);body.add(e);eyes.push(e);
  });

  const stem=new THREE.Group();stem.position.set(0,0.64,-0.01);body.add(stem);
  const stemMesh=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.025,0.34,8),new THREE.MeshStandardMaterial({color:0x6a8541,roughness:0.7}));stemMesh.position.y=0.17;stemMesh.rotation.z=-0.06;stemMesh.castShadow=true;stem.add(stemMesh);
  const tip=new THREE.Group();tip.position.set(0.02,0.34,0);stem.add(tip);
  const leafMat=patchMaterial(new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.62,side:THREE.DoubleSide}),{rim:0x2a3a16,rimPower:2.5,uTime});
  const leafGeo=makeLeaf(0.50,0.25);const leaves=[];
  [[-1.25,0.60,1],[1.95,0.5,0.92],[0.20,1.25,0.34]].forEach(([yaw,el,sc])=>{const pivot=new THREE.Group();pivot.rotation.order='YXZ';pivot.rotation.y=yaw;pivot.rotation.x=-el;const m=new THREE.Mesh(leafGeo,leafMat);m.scale.setScalar(sc);m.castShadow=true;pivot.add(m);tip.add(pivot);leaves.push({pivot,yaw,el});});
  const armGeo=makeLeaf(0.22,0.11,0x5a7738,0x94ab62);const arms=[];
  [-1,1].forEach(sx=>{const pivot=new THREE.Group();pivot.position.set(0.29*sx,0.26,0.02);pivot.rotation.order='YXZ';pivot.rotation.y=sx*Math.PI/2;pivot.rotation.x=0.55;const m=new THREE.Mesh(armGeo,leafMat);m.castShadow=true;pivot.add(m);body.add(pivot);arms.push({pivot,sx});});
  const legMat=new THREE.MeshStandardMaterial({color:0x5b5a36,roughness:0.8});
  const legs=[-1,1].map(sx=>{const m=new THREE.Mesh(new THREE.CapsuleGeometry(0.058,0.07,4,10),legMat);m.scale.set(1,1,1.2);m.position.set(0.115*sx,0.09,0);m.castShadow=true;root.add(m);return m;});

  const shadowTex=radialTexture([[0,'rgba(0,0,0,.48)'],[0.55,'rgba(0,0,0,.20)'],[1,'rgba(0,0,0,0)']]);
  const blob=new THREE.Mesh(new THREE.PlaneGeometry(0.95,0.95),new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false,opacity:.84}));blob.rotation.x=-Math.PI/2;root.add(blob);

  let phase=0,walk=0,turn=0,blinkTimer=2.5,blink=1,flash=0;
  let springA=new THREE.Vector2(),springV=new THREE.Vector2(),prevLocalVel=new THREE.Vector2();

  return {
    root,
    updateVisual({dt,time,speed,maxSpeed,turnRate,velocity,heading}) {
      const wTarget=Math.min(1,speed/maxSpeed);walk+=(wTarget-walk)*damp(8,dt);phase+=speed*dt*4.6;turn+=(turnRate-turn)*damp(8,dt);
      const bob=Math.abs(Math.sin(phase))*0.055*walk;body.position.y=0.10+bob;const breath=Math.sin(time*2.1)*0.018*(1-walk);const land=Math.cos(phase*2)*0.035*walk;
      body.scale.set(1-breath*.5+land*.4,1+breath-land,1-breath*.5+land*.4);body.rotation.x=walk*.16+Math.sin(phase*2)*.02*walk;body.rotation.z=THREE.MathUtils.clamp(-turn*.045,-.25,.25)+Math.sin(phase)*.05*walk;body.rotation.y=Math.sin(time*.45)*.18*(1-walk)*Math.sin(time*.13+1);
      legs.forEach((l,i)=>{const p2=phase+i*Math.PI;l.position.z=Math.sin(p2)*.09*walk;l.position.y=.09+Math.max(0,Math.cos(p2))*.06*walk;l.rotation.x=Math.sin(p2)*.5*walk;});
      arms.forEach((a,i)=>{const p2=phase+(i?0:Math.PI);a.pivot.rotation.x=.55+Math.sin(p2)*.35*walk+Math.sin(time*1.8+i)*.06*(1-walk);a.pivot.rotation.z=a.sx*(.1+Math.sin(time*2.1)*.04);});
      const ch=Math.cos(heading),sh=Math.sin(heading);const lvz=velocity.x*sh+velocity.z*ch,lvx=velocity.x*ch-velocity.z*sh;const ax=(lvx-prevLocalVel.x)/Math.max(dt,.001),az=(lvz-prevLocalVel.y)/Math.max(dt,.001);prevLocalVel.set(lvx,lvz);
      const tx=-lvz*.07-az*.018-walk*.05,tz=ax*.02+turn*.03;springV.x+=((tx-springA.x)*95-springV.x*8)*dt;springV.y+=((tz-springA.y)*95-springV.y*8)*dt;springA.x+=springV.x*dt;springA.y+=springV.y*dt;springA.x=THREE.MathUtils.clamp(springA.x,-.7,.7);springA.y=THREE.MathUtils.clamp(springA.y,-.6,.6);
      stem.rotation.x=springA.x+Math.sin(time*1.3)*.035;stem.rotation.z=springA.y+Math.sin(time*.9+1)*.03;leaves.forEach((L,i)=>{L.pivot.rotation.x=-L.el+Math.sin(time*10+i*2)*.07*walk+Math.sin(time*1.6+i)*.05-springV.x*.03*(i===2?.3:1)-walk*.12;L.pivot.rotation.z=Math.sin(time*7+i)*.06*walk+springV.y*.03;L.pivot.rotation.y=L.yaw+Math.sin(time*.8+i*1.7)*.06;});
      blinkTimer-=dt;if(blinkTimer<0){blink=0;blinkTimer=2.2+Math.random()*3;}blink=Math.min(1,blink+dt*9);const bk=blink<.5?1-blink*2:(blink-.5)*2;eyes.forEach(e=>e.scale.y=.056*Math.max(.1,bk));
      flash*=1-damp(3,dt);bodyMat.emissiveIntensity=flash*.5;blob.position.set(0,.018,0);blob.rotation.x=-Math.PI/2;
    },
    flash(){flash=1;}
  };
}
