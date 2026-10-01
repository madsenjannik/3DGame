# Pure Poly environment asset provenance

## Source

- Package: Pure Poly - Free Low Poly Nature Forest
- Uploaded source file: `Free Low Poly Nature Forest(1).unitypackage`
- Unity Asset Store product ID: 205742
- Package content path: `Assets/Pure Poly/Free Low Poly Nature Pack/`
- Runtime use in this candidate: static environment geometry only
- License basis: Unity Asset Store standard EULA as supplied with the licensed asset package. This project file is not a standalone asset redistribution package.

The raw FBX source files are intentionally not included in the current game candidate ZIP. Only the GLB forms required by this game candidate are packaged.

## Conversion contract

- FBX binary version: 7.4
- Source coordinate system: Y-up
- Source unit scale: centimeters
- Runtime unit scale: meters
- Normals: preserved from FBX per polygon vertex
- UVs: preserved from FBX
- Texture: source `PP_Color_Palette.png` embedded into each GLB
- Mesh processing: polygon fan triangulation fallback, no geometry simplification
- Runtime loader: existing local Three.js GLTFLoader

## Original source SHA-256

- `PP_Color_Palette.png`: `0eca4545953390c4ede5d652fa010f09a05795c7c449f17339b9293a4086fe4a`
- `PP_Grass_11.fbx`: `77df03a4abd5c37169d52215ea6bb2b086c6a67438912c47c2a8d7527036e408`
- `PP_Lake_Ground_04.fbx`: `08ea6644cfc9d6e8c2e8d2889ffc0480485b1dae03a0b5444068b498b3adc295`
- `PP_Meadow_Path_05.fbx`: `98c9c57f463022f00bb75ea3d5f37e3da00c1c7c5cfe3999c986c9ca0a571bf5`
- `PP_Rock_Moss_Grown_09.fbx`: `69cb3d278c4baffafae0d4c7dc9c3c972767ad27b908282eb4f09b6c015c4f3b`
- `PP_Tree_02.fbx`: `320dd7ba6fdfa3adcd50989a10faf0875327dc82c5b94663b36722b29cbf7fdb`

## Derived GLB SHA-256

- `PP_Grass_11.glb`: `511c0bef8c90c45b50a3ae3bf0483a7345a61ffdde03071d10c5316c48a93bab`
- `PP_Lake_Ground_04.glb`: `4433262eb7d5ea80e7e68148b7a77f537d4103fdc417674d507e9b009b2197c4`
- `PP_Meadow_Path_05.glb`: `f7b8214b8f293ad5ba4d536c7042c663dec534855daa88d668f544f29bc3056b`
- `PP_Rock_Moss_Grown_09.glb`: `2344cf8ab4eb6f6cfa10887c04ac33cb66c36b1a1852b2f704fbccdfe7576bf4`
- `PP_Tree_02.glb`: `bc4e9c2498705c177ad82e8c0031110cbce40d9d4ad883cd2476cbcb64626a7f`

- PP_Sunflower_04.glb — extracted from the uploaded `Free Low Poly Nature Forest(1).unitypackage` and converted from FBX using the same local conversion pipeline as the other Pure Poly assets.
