// Dym Game character contract: glTF binary, Y-up, +Z forward, origin between the feet at ground level,
// one skinned mesh (multi-material) on one skeleton, clips embedded. Preview plays the re-imported GLB.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const smoothstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
// oscillator snapped to whole cycles of the clip length -> seamless loops
export const loopOsc=T=>{const w0=2*Math.PI/T;return (t,f,p=0)=>Math.sin(Math.max(1,Math.round(f/w0))*w0*t+p);};
export const blink=(t,times,d=0.16)=>{let bk=1;for(const b of times){const x=t-b;if(x>=0&&x<=d)bk=Math.min(bk,Math.abs(x-d/2)/(d/2));}return Math.max(0.08,bk);};

/**
 * source: authoring hierarchy (not in scene). bones: [[Object3D, 'BoneName'], ...].
 * Meshes are rigid-weighted to their nearest bone ancestor unless mesh.userData.skin(pLocal) returns [[node, w], ...].
 */
export async function buildCharacter({name,source,bones,feet,rest,clips,fps=30}){
  rest();
  const holder=new THREE.Group(); holder.add(source);
  source.position.set(0,0,0); source.quaternion.identity(); source.scale.set(1,1,1);
  holder.updateMatrixWorld(true);
  const fb=new THREE.Box3(); feet.forEach(f=>fb.expandByObject(f,true));
  const fc=fb.getCenter(new THREE.Vector3());
  source.position.set(-fc.x,-fb.min.y,-fc.z); holder.updateMatrixWorld(true);

  const nodes=[holder,...bones.map(b=>b[0])], names=['Root',...bones.map(b=>b[1])];
  const idx=new Map(nodes.map((n,i)=>[n,i]));
  const up=n=>{let p=n;while(p&&!idx.has(p))p=p.parent;return p?idx.get(p):0;};
  const par=nodes.map((n,i)=>i?up(n.parent):-1);
  const M=new THREE.Matrix4(),IM=new THREE.Matrix4();
  const local=i=>{IM.copy(nodes[par[i]].matrixWorld).invert();return M.multiplyMatrices(IM,nodes[i].matrixWorld);};
  const B=names.map(n=>{const b=new THREE.Bone();b.name=n;return b;});
  for(let i=1;i<nodes.length;i++){local(i).decompose(B[i].position,B[i].quaternion,B[i].scale);B[par[i]].add(B[i]);}

  const meshes=[]; source.traverse(o=>{if(o.isMesh)meshes.push(o);});
  const byMat=new Map(), v=new THREE.Vector3();
  for(const m of meshes){
    const g=m.geometry.clone();
    for(const k of Object.keys(g.attributes)) if(!['position','normal','color'].includes(k)) g.deleteAttribute(k);
    g.morphAttributes={};
    if(!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    if(!g.attributes.normal) g.computeVertexNormals();
    const n=g.attributes.position.count, p=g.attributes.position;
    if(!g.attributes.color) g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(n*3).fill(1),3));
    const si=new Uint16Array(n*4), sw=new Float32Array(n*4), rigid=up(m.parent), fn=m.userData.skin;
    for(let i=0;i<n;i++){
      const inf=fn?fn(v.fromBufferAttribute(p,i)):null;
      if(!inf){si[i*4]=rigid;sw[i*4]=1;continue;}
      const acc=new Map(); for(const [node,w] of inf){if(w>1e-4){const b=up(node);acc.set(b,(acc.get(b)||0)+w);}}
      const arr=[...acc].sort((a,b)=>b[1]-a[1]).slice(0,4), s=arr.reduce((a,b)=>a+b[1],0);
      if(!arr.length){si[i*4]=rigid;sw[i*4]=1;continue;}
      arr.forEach(([b,w],k)=>{si[i*4+k]=b;sw[i*4+k]=w/s;});
    }
    g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));
    g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));
    g.applyMatrix4(m.matrixWorld);
    if(m.matrixWorld.determinant()<0){const ix=g.index.array;for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t;}}
    if(!byMat.has(m.material)) byMat.set(m.material,[]);
    byMat.get(m.material).push(g);
  }
  const mats=[],geos=[];
  for(const [mat,list] of byMat){const mm=mat.clone();mm.vertexColors=true;mats.push(mm);geos.push(list.length>1?mergeGeometries(list,false):list[0]);}
  const merged=mergeGeometries(geos,true);
  const out=new THREE.Group(); out.name=name; out.add(B[0]);
  const skinned=new THREE.SkinnedMesh(merged,mats); skinned.name=name+'_Mesh'; out.add(skinned);
  out.updateMatrixWorld(true);
  skinned.bind(new THREE.Skeleton(B),new THREE.Matrix4());

  // bake clips from the authoring rig
  const rest0=B.map(b=>[b.position.toArray(),b.quaternion.toArray(),b.scale.toArray()]);
  const P=new THREE.Vector3(),Q=new THREE.Quaternion(),S=new THREE.Vector3();
  const samples=clips.map(c=>{
    const N=Math.max(2,Math.round(c.duration*fps)), times=new Float32Array(N+1), data=B.map(()=>[[],[],[]]);
    for(let f=0;f<=N;f++){
      const t=f/N*c.duration; times[f]=t; c.pose(t); holder.updateMatrixWorld(true);
      for(let i=1;i<B.length;i++){
        local(i).decompose(P,Q,S); const d=data[i], q=d[1], L=q.length, ref=L?q.slice(L-4):rest0[i][1];
        if(Q.x*ref[0]+Q.y*ref[1]+Q.z*ref[2]+Q.w*ref[3]<0) Q.set(-Q.x,-Q.y,-Q.z,-Q.w);
        d[0].push(P.x,P.y,P.z); q.push(Q.x,Q.y,Q.z,Q.w); d[2].push(S.x,S.y,S.z);
      }
    }
    return {c,times,data};
  });
  const differs=(arr,ref,n,eps)=>{for(let k=0;k<arr.length;k++)if(Math.abs(arr[k]-ref[k%n])>eps)return true;return false;};
  const keep=B.map(()=>[false,false,false]);
  for(const {data} of samples) for(let i=1;i<B.length;i++) for(let k=0;k<3;k++){
    if(keep[i][k])continue;
    if(k===1){const q=data[i][1],r=rest0[i][1];for(let j=0;j<q.length;j+=4){if(1-Math.abs(q[j]*r[0]+q[j+1]*r[1]+q[j+2]*r[2]+q[j+3]*r[3])>1e-9){keep[i][1]=true;break;}}}
    else keep[i][k]=differs(data[i][k],rest0[i][k],3,1e-6);
  }
  const Types=[[THREE.VectorKeyframeTrack,'position',3],[THREE.QuaternionKeyframeTrack,'quaternion',4],[THREE.VectorKeyframeTrack,'scale',3]];
  const outClips=samples.map(({c,times,data})=>{
    const tracks=[];
    for(let i=1;i<B.length;i++) Types.forEach(([T,prop,n],k)=>{
      if(!keep[i][k])return; if(c.only&&!c.only.test(B[i].name))return; if(c.skip&&c.skip.test(B[i].name))return; const a=data[i][k], first=a.slice(0,n);
      tracks.push(differs(a,first,n,1e-7)?new T(B[i].name+'.'+prop,times,a):new T(B[i].name+'.'+prop,[0,c.duration],[...first,...first]));
    });
    return new THREE.AnimationClip(c.name,c.duration,tracks);
  });
  rest();

  const buffer=await new GLTFExporter().parseAsync(out,{binary:true,trs:true,onlyVisible:false,animations:outClips});
  const gltf=await new GLTFLoader().parseAsync(buffer.slice(0),'');
  const report=validate(gltf,buffer,name,clips.map(c=>c.name));
  console.info('['+name+'] GLB check',report.rows.map(r=>(r.pass?'✓ ':'! ')+r.label+': '+r.value).join('\n'));
  return {name,buffer,gltf,scene:gltf.scene,clips:gltf.animations,report};
}

function validate(gltf,buffer,name,expect){
  const j=gltf.parser.json, rows=[], v=new THREE.Vector3(), row=(label,value,pass)=>rows.push({label,value,pass:!!pass});
  const f3=x=>(Math.abs(x)<5e-4?0:x).toFixed(3);
  row('Format',`glTF ${j.asset.version} binary · ${(buffer.byteLength/1024).toFixed(0)} KB`,new DataView(buffer).getUint32(0,true)===0x46546C67&&j.asset.version==='2.0');
  const skins=j.skins||[]; row('Skin',`${skins.length} skin · ${skins[0]?skins[0].joints.length:0} joints`,skins.length===1);
  const A=gltf.animations; row('Clips',A.map(c=>`${c.name} ${c.duration.toFixed(2)}s`).join(' · ')||'none',expect.every(n=>A.some(c=>c.name===n)));
  let seam=0;
  for(const c of A)for(const tr of c.tracks){const n=tr.getValueSize(),a=tr.values,L=a.length;
    if(/quaternion$/.test(tr.name)){let d=0;for(let k=0;k<4;k++)d+=a[k]*a[L-4+k];seam=Math.max(seam,1-Math.abs(d));}
    else for(let k=0;k<n;k++)seam=Math.max(seam,Math.abs(a[k]-a[L-n+k]));}
  row('Loops',seam<1e-4?'first key = last key':`seam Δ ${seam.toExponential(1)}`,seam<1e-4);
  const meshes=[]; let tris=0; gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o=>{if(o.isMesh){meshes.push(o);tris+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});
  row('Triangles',`${tris.toLocaleString('en')} (target 10–20k)`,tris>=10000&&tris<=20000);
  const imgs=j.images||[]; row('Materials',`${(j.materials||[]).length} embedded · ${imgs.length} textures`,!(j.buffers||[]).some(b=>b.uri)&&imgs.every(im=>im.bufferView!==undefined));
  const box=new THREE.Box3(), fb=new THREE.Box3();
  for(const m of meshes){const g=m.geometry,p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,bones=m.skeleton&&m.skeleton.bones;
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);box.expandByPoint(v);
      if(bones&&sw.getX(i)>0.5&&/^Foot_/.test(bones[si.getX(i)].name))fb.expandByPoint(v);}}
  const s=box.getSize(new THREE.Vector3());
  row('Bounds',`${s.x.toFixed(2)} × ${s.y.toFixed(2)} × ${s.z.toFixed(2)} m · min y ${f3(box.min.y)}`,box.min.y>-0.02);
  const fc=fb.getCenter(new THREE.Vector3()), e=5e-3;
  row('Origin',`feet mid (${f3(fc.x)}, ${f3(fb.min.y)}, ${f3(fc.z)})`,!fb.isEmpty()&&Math.abs(fc.x)<e&&Math.abs(fb.min.y)<e&&Math.abs(fc.z)<e);
  const wp=n=>{const o=gltf.scene.getObjectByName(n);return o?o.getWorldPosition(new THREE.Vector3()):null;};
  const eL=wp('Eye_L'),eR=wp('Eye_R'),hd=wp('Head');
  row('Forward','+Z (face) · _L on +X',eL&&eR&&(eL.z+eR.z)/2>0.1&&eL.x>0&&eR.x<0);
  row('Up','+Y',hd&&hd.y>0.4);
  const top=gltf.scene.getObjectByName(name), root=gltf.scene.getObjectByName('Root');
  const ident=o=>o&&o.position.lengthSq()<1e-10&&Math.abs(Math.abs(o.quaternion.w)-1)<1e-9&&Math.abs(o.scale.x-1)+Math.abs(o.scale.y-1)+Math.abs(o.scale.z-1)<1e-9;
  row('Hierarchy',`${name} › Root + ${name}_Mesh`,ident(top)&&ident(root)&&root&&root.parent===top);
  const ch=['Root','Hips','Spine','Head'].map(n=>gltf.scene.getObjectByName(n)), sp=ch[2];
  row('Spine','Root › Hips › Spine › Head · arms on Spine',ch.every(Boolean)&&ch.slice(1).every((b,i)=>b.parent===ch[i])&&['Arm_L','Arm_R'].every(n=>{const o=gltf.scene.getObjectByName(n);return o&&o.parent===sp;}));
  const tree=[]; (function walk(o,d){if(!o||!o.isBone)return;tree.push({d,n:o.name});o.children.forEach(c=>walk(c,d+1));})(root,0);
  return {rows,tree,tris};
}

export function mountReport(report,btn){
  const el=document.createElement('div');
  el.style.cssText='position:fixed;top:calc(66px + env(safe-area-inset-top));right:calc(18px + env(safe-area-inset-right));width:min(360px,calc(100vw - 36px));max-height:calc(100vh - 110px);overflow:auto;padding:14px 16px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(26,27,25,.78);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:#e9e6dc;font:500 12px/1.45 Manrope,system-ui,sans-serif;display:none;z-index:5';
  const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const rows=report.rows.map(r=>`<div style="display:grid;grid-template-columns:16px 78px minmax(0,1fr);gap:6px;padding:5px 0;border-top:1px solid rgba(255,255,255,.07)"><span style="color:${r.pass?'#bcd08f':'#e3b062'};font-weight:600">${r.pass?'✓':'!'}</span><span style="color:rgba(233,230,220,.6)">${esc(r.label)}</span><span>${esc(r.value)}</span></div>`).join('');
  const tree=report.tree.map(b=>`<div style="padding-left:${b.d*10}px;white-space:nowrap">${esc(b.n)}</div>`).join('');
  el.innerHTML=`<div style="font:600 11px/1 Manrope,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:rgba(233,230,220,.6);margin-bottom:8px">GLB re-import check</div>${rows}<details style="margin-top:8px;border-top:1px solid rgba(255,255,255,.07);padding-top:8px"><summary style="cursor:pointer;color:rgba(233,230,220,.7)">Skeleton (${report.tree.length} bones)</summary><div style="margin-top:6px;font:500 11px/1.5 ui-monospace,Menlo,monospace;color:rgba(233,230,220,.8)">${tree}</div></details>`;
  document.body.appendChild(el);
  if(report.rows.some(r=>!r.pass)) btn.style.borderColor='rgba(227,176,98,.6)';
  btn.onclick=()=>{const on=el.style.display==='none';el.style.display=on?'block':'none';btn.classList.toggle('on',on);};
}
