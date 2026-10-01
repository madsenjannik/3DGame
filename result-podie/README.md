# Result / Podie / Leaderboard – prototype

Åbn `Ride Result.dc.html` via en lokal webserver (ES-moduler kræver http, ikke file://):

    npx serve .     # eller: python3 -m http.server

## Filer
- `Ride Result.dc.html` – UI-laget (kort, Thora-bobbel, standings-overlay, timeline). Al styling er inline.
- `support.js` – runtime for .dc.html-filen.
- `Result Stage.html` – 3D-scenen (iframe): podie, Thora, konfetti, kridttavle, kamera.
- `stable2.js`, `animals.js`, `mounts.js`, `tack.js` – stald, Thora + hest/cykel, tack.
- `swamp-character.js`, `character-rig.js`, `hop-bake.js`, `characters/*.js` – spiller (Swamp) og rivaler.

## Eksterne afhængigheder (CDN)
- three.js 0.165.0 via importmap (jsdelivr)
- Google Fonts: Manrope, JetBrains Mono

## Kommunikation
UI → scene: `postMessage({resultShot:{…}})` (shot, party, react, podium.slots, board, skip, k).
Scene → UI: `postMessage({thoraHead:{x,y}})` (normaliseret skærmposition til talebobblen).

Ingen billeder/textures – alt er procedural geometri + canvas-textures.
