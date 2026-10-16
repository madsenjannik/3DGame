Dym garden plants v5 – GLB · LOD-kæde LOD0 / LOD1 / LOD2
glTF 2.0 binary · Y op · 1 enhed = 1 m · pivot midt i bunden, jord i y = 0.
Hver fil: tre noder <Navn>_LOD0, _LOD1, _LOD2 (samme position).
LOD1 er afledt af LOD0 (samme klynger, bladstørrelse og lys). LOD2 = tæt løv til lang afstand.
Anbefalet skift: LOD1 ved 4,5 x højde, LOD2 ved 13 x højde (min. højde 1,5 m), 5 % hysterese, dither-overgang.
Materialer: kun "Bark" og "Leaves".
Leaves: bladkort med udskåret kant. alphaMode MASK (cutoff 0.5), dobbeltsidet, ingen blending.
  Tekstur: 1024x512 atlas. Øverst (v > 0.5): 4 blad-klumper (LOD1). Under: 8 enkeltblade i 8 toner (#3f5a2a -> #86a042, LOD0). Nederste stribe (v < 0.0625) er gradient til kerner og stilke.
Bladkort: lys begge sider med samme normal (vend IKKE normalen på bagsiden), ellers bliver bagsider mørke.
Bark: #7a5a40 x 256x512 bark-tekstur + normal map (begge JPEG, indlejret), gentaget 1x4 via KHR_texture_transform.
TEXCOORD_0 er normaliseret uint16 (0-1).
Bløde normaler. Bladkort har bøjede normaler (udad fra kronen) for blød, rund belysning.
COLOR_0 (RGBA8 normaliseret): R = vind-vægt (0 ved stammens fod -> 1 ved bladspidser). G/B = 0, A = 1.
  OBS: sæt material.vertexColors = false efter load og læs attributten i vind-shaderen.

Fil                 Højde   LOD0 tris     LOD1 tris     LOD2 tris   Størrelse
bush_a.glb          0.80 m  2905/3000     1303/1350     288/300     619 KB
bush_b.glb          1.10 m  2908/3000     1304/1350     286/300     602 KB
bush_c.glb          1.11 m  2906/3000     1305/1350     288/300     596 KB
tree_a.glb          5.21 m  7750/8000     3093/3200     580/600     920 KB
tree_b.glb          5.63 m  7752/8000     3096/3200     578/600     996 KB
tree_c.glb          4.57 m  7754/8000     3093/3200     579/600     1006 KB
fern_a.glb          0.58 m  1441/1500     669/700       72/150      446 KB
fern_b.glb          0.84 m  1455/1500     653/700       56/150      436 KB
