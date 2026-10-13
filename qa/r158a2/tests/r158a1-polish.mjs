// R158A.1 protection: approved icon sources and shared GLB preview scale.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const icons=read('js/ui/ApprovedItemArt.js');
const {APPROVED_ITEM_ART,approvedItemArt,approvedMaterialText}=new Function(
  icons.replace(/^export /gm,'')+'\nreturn {APPROVED_ITEM_ART,approvedItemArt,approvedMaterialText}'
)();
const expected=['axe','pickaxe','sickle','can','rod','vest','lantern'];
assert.deepEqual(Object.keys(APPROVED_ITEM_ART).sort(),expected.sort(),'whitelist includes seven existing art assets');
for(const [id,asset] of Object.entries(APPROVED_ITEM_ART)){
  assert(asset.startsWith('./brand/icons/tool3d/'));
  assert(fs.statSync(path.join(root,asset)).size>300,'art file missing: '+asset);
  assert.match(approvedItemArt({id}),new RegExp('icon-'+(id==='can'?'watering-can':id)+'\\.png'));
}
const seed=approvedItemArt({id:'seed-hyacinth',name:'Hyacinth Seed'});
assert.match(seed,/>SEED</);assert(!seed.includes('<img'),'no fabricated character seed image');
const unknown=approvedItemArt({id:'unapproved-asset'});
assert.match(unknown,/>ITEM</);assert(!unknown.includes('<img'),'unapproved asset cannot point to guessed URL');
assert.equal(approvedMaterialText('wood'),'Wood');
const viewer=read('js/ui/WorkbenchPreview3D.js');
assert(viewer.includes('scaleForFamily(kind,level,gltf)'),'preview must share family scale');
assert(viewer.includes('PREVIEW_ASSETS[kind][2]'),'L3 reference used');
assert(!viewer.includes('const scale=Math.min(3.05/Math.max(.1,size.x,size.z)'),'per-level normalization removed');
const wb=read('js/ui/WorkbenchPanel.js'),hud=read('js/ui/Hud.js'),page=read('game.html');
assert(wb.includes('approvedItemArt(t.id')&&wb.includes('r158a1-card-state'),'owned UI polished');
assert(wb.includes("this.wilds.upgradeWorkshop?.()")&&wb.includes("gh.startUpgrade?.()"),'real upgrade actions preserved');
assert(hud.includes('return approvedItemArt(it)')&&hud.includes('approvedMaterialText(id)'),'Bag icon mapping whitelisted');
assert(page.includes('styles-r158a1.css')&&page.includes('POLISH-R158A1-20261012A'),'new CSS cache busted');
assert(!hud.includes("const icons={wood:'▰'"),'no unicode pseudo-art in material strip');
console.log('PASS R158A.1: approved item images, explicit seed fallback, L3 reference scale, unchanged upgrades');
