// @ts-nocheck
// R71 contextual action icons, R72: Jannik's SVG set (brand/icons/svg, currentColor glyphs). They are drawn as a
// CSS mask so the HUD decides the colour (cream; grey when locked). Locked = a requirement is missing (tool,
// resource, quest, purchase, access): the button stays visible, grey, says 'Locked' and shows the lock.
const NAMES = ['fist', 'hammer', 'axe', 'pickaxe', 'sickle', 'rod', 'boat', 'flag', 'lock', 'sword', 'bag', 'chest', 'drop', 'seed', 'leaf', 'door', 'horseshoe', 'talk', 'info'];
const TOOL_FOR = { wood: 'axe', stone: 'pickaxe', clay: 'pickaxe', fiber: 'sickle' };

export function actionIconName(it) {
  const t = it?.type || '';
  if (it?.locked) return 'lock';
  if (t === 'mobile-default-strike') return 'fist';
  if (t === 'mobile-combat-strike') {
    const l = String(it?.label || '').toLowerCase();
    if (l.includes('pickaxe')) return 'pickaxe';
    if (l.includes('sickle')) return 'sickle';
    if (l.includes('axe')) return 'axe';
    return 'fist';
  }
  if (t === 'wilds-workbench' || t === 'greenhouse') return 'hammer';
  if (t === 'wilds-gather') return TOOL_FOR[it.node?.kind] || 'leaf';
  if (t === 'wilds-cut' || t === 'wilds-weed') return 'sickle';
  if (t === 'wilds-cache') return 'chest';
  if (t === 'wilds-pot') return it.act === 'water' ? 'drop' : it.act === 'plant' ? 'seed' : 'leaf';
  if (t === 'wilds-snail' || t === 'combat-strike' || t === 'combat-fight') return 'sword';
  if (t === 'combat-pouch') return 'bag';
  if (t === 'fishing-shore' || t === 'fishing-spot' || t === 'boat-fish') return 'rod';
  if (t === 'boat-board' || t === 'boat-dock') return 'boat';
  if (t === 'fishing-shop' || t === 'stable-thora') return 'talk';
  if (t === 'fish-board') return 'info';
  if (t.startsWith('lakerun-')) return 'flag';
  if (t.startsWith('stable-')) return 'horseshoe';
  if (t.startsWith('home-')) return 'door';
  if (t === 'first-seed') return 'seed';
  return 'leaf';
}
// R142 (GO 09/10): on desktop, work done with a tool or your fists is a left click (like a strike); E is for the rest
export const isToolJob = it => !!it && (['wilds-gather', 'wilds-cut', 'wilds-weed', 'wilds-snail', 'combat-strike'].includes(it.type) || (it.type === 'wilds-pot' && it.act === 'water'));
export const actionIcon = it => { const n = actionIconName(it); return `<span class="ico-mask" style="--ico:url(./brand/icons/svg/icon-${NAMES.includes(n) ? n : 'leaf'}.svg?v=127)"></span>`; };
