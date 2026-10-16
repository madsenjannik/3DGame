Dym garden plants v2 – GLB (konceptstil)
glTF 2.0 binary · Y op · 1 enhed = 1 m · pivot midt i bunden, jord i y = 0.
Hver fil: to noder <Navn>_LOD0 og <Navn>_LOD1 (samme position).
Materialer: kun "Bark" og "Leaves".
Leaves: bladkort med udskåret kant. alphaMode MASK (cutoff 0.5), dobbeltsidet, ingen blending.
  Tekstur: 1024x256 atlas, 8 kolonner = 8 grønne toner (#3f5a2a -> #86a042). Nederste stribe (v < 0.125) er massiv farve til fyld-kerner og stilke.
Bark: #7a5a40 x 256x512 bark-tekstur + normal map (begge JPEG, indlejret).
Bløde normaler. Bladkort har bøjede normaler (udad fra kronen) for blød, rund belysning.
COLOR_0.r = vind-vægt (0 ved stammens fod -> 1 ved bladspidser). G/B = 0.
  OBS: sæt material.vertexColors = false efter load og læs attributten i vind-shaderen.

Fil                 Højde   LOD0 tris        LOD1 tris      Størrelse
bush_a.glb          0.80 m  2905 / 3000      288 / 300      452 KB
bush_b.glb          1.10 m  2908 / 3000      288 / 300      444 KB
bush_c.glb          1.11 m  2906 / 3000      288 / 300      423 KB
tree_a.glb          5.21 m  7750 / 8000      570 / 600      767 KB
tree_b.glb          5.63 m  7752 / 8000      579 / 600      835 KB
tree_c.glb          4.57 m  7754 / 8000      579 / 600      834 KB
fern_a.glb          0.58 m  1441 / 1500      72 / 150       293 KB
fern_b.glb          0.84 m  1455 / 1500      56 / 150       284 KB
