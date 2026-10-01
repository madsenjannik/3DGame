// @ts-nocheck
import * as THREE from 'three';

export const clamp01 = x => Math.min(1, Math.max(0, x));
export const smooth = (a,b,x) => { const t = clamp01((x-a)/(b-a)); return t*t*(3-2*t); };
export const damp = (k,dt) => 1 - Math.exp(-k*dt);
export const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
export const color = h => new THREE.Color(h);

export function seededRandom(seed = 20260924) {
  let a = seed | 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function radialTexture(stops, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  stops.forEach(([o,col]) => gr.addColorStop(o,col));
  x.fillStyle = gr; x.fillRect(0,0,size,size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function patchMaterial(mat, options = {}) {
  mat.onBeforeCompile = shader => {
    shader.uniforms.uTime = options.uTime;
    if (options.wind && options.uTime) {
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n{
        vec3 wo=modelMatrix[3].xyz;
        #ifdef USE_INSTANCING
          wo+=mat3(modelMatrix)*instanceMatrix[3].xyz;
        #endif
        float hh=max(position.y,0.0)*max(position.y,0.0);
        float ph=uTime*1.35+wo.x*0.38+wo.z*0.31;
        transformed.x+=sin(ph)*${Number(options.wind).toFixed(4)}*hh;
        transformed.z+=cos(ph*0.83+1.7)*${Number(options.wind*0.7).toFixed(4)}*hh;
      }`);
    }
    if (options.playerPush && options.uPlayer) {
      shader.uniforms.uPlayer = options.uPlayer;
      const radius = Number(options.pushRadius || 0.82).toFixed(4);
      const strength = Number(options.playerPush).toFixed(4);
      const down = Number(options.pushDown || 0.42).toFixed(4);
      const height = Number(options.pushHeight || 0.45).toFixed(4);
      shader.vertexShader = 'uniform vec3 uPlayer;\n' + shader.vertexShader.replace('#include <project_vertex>', `
        vec4 gw=modelMatrix*vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          gw=modelMatrix*instanceMatrix*vec4(transformed,1.0);
        #endif
        float phh=smoothstep(0.015,${height},max(position.y,0.0)); phh*=phh;
        vec2 pd=gw.xz-uPlayer.xz; float pdl=length(pd);
        float ppush=(1.0-smoothstep(0.0,${radius},pdl))*${strength}*phh;
        gw.xz+=normalize(pd+vec2(1e-4))*ppush;
        gw.y-=ppush*${down};
        vec4 mvPosition=viewMatrix*gw;
        gl_Position=projectionMatrix*mvPosition;`);
    }
    if (options.rim) {
      shader.uniforms.uRim = { value: color(options.rim) };
      const power = Number(options.rimPower || 2.4).toFixed(4);
      shader.fragmentShader = 'uniform vec3 uRim;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uRim * pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0), ${power}) * 0.12;`);
    }
  };
  mat.customProgramCacheKey = () => JSON.stringify({wind:options.wind||0,rim:options.rim||0,rimPower:options.rimPower||0,playerPush:options.playerPush||0,pushRadius:options.pushRadius||0,pushDown:options.pushDown||0,pushHeight:options.pushHeight||0});
  mat.needsUpdate = true;
  return mat;
}

export function makeLeaf(length, width, c0 = 0x5b7839, c1 = 0xa6ba6d) {
  const shape = new THREE.Shape();
  shape.moveTo(0,0);
  shape.bezierCurveTo(length*0.24,width*0.78,length*0.72,width*0.60,length,0);
  shape.bezierCurveTo(length*0.72,-width*0.60,length*0.24,-width*0.78,0,0);
  const g = new THREE.ShapeGeometry(shape, 16);
  g.rotateX(-Math.PI/2);
  g.translate(0,0.01,0);
  const p = g.attributes.position;
  const colors = new Float32Array(p.count*3);
  const a = color(c0), b = color(c1), c = new THREE.Color();
  for (let i=0;i<p.count;i++) {
    const k = clamp01(p.getX(i)/length);
    c.copy(a).lerp(b,k*0.82);
    colors[i*3]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors,3));
  g.computeVertexNormals();
  return g;
}

export function createSkyMaterial(horizon = 0xdde5d3, sunDir = new THREE.Vector3(-0.62,0.7,0.36).normalize()) {
  return new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{uH:{value:color(horizon)},uZ:{value:color(0x93b6c6)},uG:{value:color(0x7d8a64)},uS:{value:color(0xfff1d6)},uD:{value:sunDir}},
    vertexShader:`varying vec3 vD;void main(){vD=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`,
    fragmentShader:`uniform vec3 uH,uZ,uG,uS,uD;varying vec3 vD;void main(){float h=vD.y;float up=smoothstep(-0.02,0.68,h);vec3 c=mix(uH,uZ,up);float down=1.0-smoothstep(-0.30,0.04,h);c=mix(c,uG,down*0.42);float s=max(dot(vD,uD),0.);c+=uS*(pow(s,6.0)*0.16+pow(s,220.0)*0.9);gl_FragColor=vec4(c,1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`
  });
}
