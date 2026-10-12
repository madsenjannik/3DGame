// R158A.1: whitelist the actual in-repository, previously used game item art.
// No guessed URLs or unrelated fallbacks. Individual Special Seed art is not
// approved; show a distinct text label instead of a misleading illustration.
export const APPROVED_ITEM_ART = Object.freeze({
  axe: './brand/icons/tool3d/icon-axe.png',
  pickaxe: './brand/icons/tool3d/icon-pickaxe.png',
  sickle: './brand/icons/tool3d/icon-sickle.png',
  can: './brand/icons/tool3d/icon-watering-can.png',
  rod: './brand/icons/tool3d/icon-rod.png',
  vest: './brand/icons/tool3d/icon-vest.png',
  lantern: './brand/icons/tool3d/icon-lantern.png'
});
export const APPROVED_NAV_ART = Object.freeze({
  tools:'./brand/icons/svg/icon-hammer.svg',
  home:'./brand/icons/svg/icon-door.svg',
  seeds:'./brand/icons/svg/icon-leaf.svg',
  chars:'./brand/icons/svg/icon-seed.svg',
  today:'./brand/icons/svg/icon-flag.svg'
});
const escapeText = s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function approvedItemArt(item,cssClass='bag2-art'){
  const key = typeof item==='string'?item:item?.id||'';
  const path = APPROVED_ITEM_ART[key];
  if(path)return '<img class="'+escapeText(cssClass)+' r158a1-item-image" src="'+path+'" alt="" draggable="false" loading="lazy">';
  const short = key.startsWith('seed-') ? 'SEED' : 'ITEM';
  return '<span class="'+escapeText(cssClass)+' r158a1-art-label" aria-hidden="true">'+short+'</span>';
}
export function approvedMaterialText(id){
  return ({wood:'Wood',stone:'Stone',clay:'Clay',fiber:'Fiber',amber:'Amber',shell:'Shell',wild_seed:'Wild Seed',golden_seed:'Golden Seed'})[id]||String(id);
}
