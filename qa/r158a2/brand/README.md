# The Growing Wilds · brand-assets

Alle PNG-filer har gennemsigtig baggrund. Den eneste undtagelse er app-ikonet, som er full-bleed, fordi App Store og Play Store selv lægger hjørnerne på.

## Indhold
```
logo/
  logo-growing-wilds.png          1240×660   primær, uden "THE" (låst 5b)
  logo-growing-wilds-620w.png     620×330
  logo-growing-wilds-310w.png     310×165
  logo-growing-wilds-burst.png    1520×860   med solstråler bagved (splash/hero)
app-icon/
  app-icon-1024.png               App Store / Play Store master
  app-icon-512/192/180/120/48.png
icons/
  icon-*.png                      512×512   8 stk. 3D-ikoner i ler
  128/ og 64/                     nedskalerede versioner
preview-*.png                     kontaktark (ikke til brug)
```
Ikonerne er: seed (frø/valuta), leaf (liv), drop (vand), sun (dag), moon (nat), map (kort), bag (taske) og info.

## Fonte
| Rolle | Font | Vægt | Hvor |
|---|---|---|---|
| Titel / logo | **Lilita One** | 400 | Logo, splash, store øjeblikke (level-up, "Quest fuldført!") |
| UI / brødtekst | **Manrope** | 500 · 600 · 700 · 800 | Alt andet: HUD, quest-kort, menuer, knapper |

Begge fonte er gratis på Google Fonts (SIL Open Font License):
`https://fonts.googleapis.com/css2?family=Lilita+One&family=Manrope:wght@500;600;700;800&display=swap`

Newsreader udgår af splash og bruges ikke sammen med det nye logo.

## Logo-konstruktion (hvis det skal genskabes i kode)
- Linje 1 er "GROWING", og linje 2 er "WILDS!". Ordet "THE" er fjernet.
- Begge linjer er sat i Lilita One. Størrelsesforholdet er GROWING 98 og WILDS! 118, linjehøjde 0,95.
- Hele logoet er roteret −5°.
- Konturen er 5 px #2B2A24 (ved 98 px font) og laves med text-shadow i 8 retninger.
- Under konturen er der en ekstrudering på 0 9px 0 #2B2A24 og en blød skygge på 0 18px 22px rgba(0,0,0,.35).
- To blade sidder over W'et. Det ene er #8FD14F og roteret −30°, det andet er #5FAE3A og roteret 20°. Begge har 3 px kontur.
- Hold en frizone omkring logoet på mindst højden af "W".
- Logoet skal mindst være 160 px bredt. Under den størrelse bruges app-ikonet.

## Farver
| Navn | Hex | Brug |
|---|---|---|
| Titelgul | #FFD45A | GROWING, W i app-ikon |
| Vildgrøn | #8FD14F | WILDS!, blade |
| Bladmørk | #5FAE3A | andet blad |
| Kontur | #2B2A24 | alle konturer og ekstrudering |
| Himmel | #5AB8CC | app-ikon-baggrund (gradient #A6E0E8 → #3F9CB8) |
| Guldfrø | #E2B552 | primære handlinger (START, Hop), holo-indikator |
| Oliven | #3A3B33 | UI-glas, mørke flader |
| Salvie | #DFE5D3 | lyse flader |

## App-ikon
- Brug `app-icon-1024.png` som master, så hver platform kan generere resten.
- iOS lægger selv hjørner på, så filen er firkantet.
- På Android (adaptive icon) bruges himmel-gradienten med stråler som baggrund og W med blad som forgrund. W'et ligger inden for de midterste 66 %, så det er sikkert.

## 3D-ikoner
- Ikonerne er renderet med three.js, og koden ligger i `icons3d.js` i designprojektet.
- I spillet kan de bruges live, så de drejer og følger fingeren, eller som PNG'erne her.
- Under 48 px bliver detaljerne mudrede. Brug derfor mindst 64 px.
