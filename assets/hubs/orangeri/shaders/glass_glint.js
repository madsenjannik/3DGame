// Solglimt på glas – tilføj til three.js MeshStandardMaterial via onBeforeCompile.
// Brug: const U={uT:{value:0}}; applyGlassGlint(mat, 0.55, U); og i loop: U.uT.value = sekunder;
// Anbefalet styrke: OR_Glass 0.55 · OR_Glass_Roof 0.45 · OR_Glass_Cracked 0.20
export function applyGlassGlint(m, amt, U){
  m.onBeforeCompile = s => { s.uniforms.uT = U.uT;
    s.vertexShader = "varying vec3 vWP;\n" + s.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;");
    s.fragmentShader = "uniform float uT;varying vec3 vWP;\n" + s.fragmentShader.replace("#include <dithering_fragment>",
      "#include <dithering_fragment>\n" +
      "float d=dot(vWP,normalize(vec3(1.0,0.45,0.7)));float ph=mod(uT*5.0,70.0)-35.0;\n" +
      "float b=exp(-pow((d-ph)/1.1,2.0))+0.6*exp(-pow((d-ph+2.4)/0.35,2.0));\n" +
      "float sp=step(0.985,fract(sin(dot(floor(vWP*1.3),vec3(12.9,78.2,37.7)))*43758.5))*(0.5+0.5*sin(uT*3.0+vWP.x*2.0));\n" +
      "gl_FragColor.rgb+=vec3(1.0,0.96,0.86)*(b*"+amt.toFixed(2)+"+sp*0.35);gl_FragColor.a=max(gl_FragColor.a,b*"+(amt*0.7).toFixed(2)+");");
  };
  m.needsUpdate = true; return m;
}
