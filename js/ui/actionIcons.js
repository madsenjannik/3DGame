// @ts-nocheck
// R71 contextual action icons: the action button shows what the interaction does (a hammer at the
// workbench, a rod at the shore, a flag at the Lake Race circle ...). Inline SVG in the game palette,
// same style as the Lake Race HUD icons; no new image files.
const S = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const WOOD = '#b98552', DARK = '#3a2e22', STEEL = '#d9dfdc', GOLD = '#e9c46a', CREAM = '#fff1b8', GREEN = '#8fd14f';
const ICONS = {
  hammer: S(`<path d="M13.2 9.6 4.4 18.4a1.6 1.6 0 0 0 2.3 2.3l8.8-8.8z" fill="${WOOD}" stroke="${DARK}" stroke-width="1.2" stroke-linejoin="round"/><path d="M10.4 6.2 14.6 2l2.6 1.2 3.6 3.6-1.6 1.6-1.4-.6-3 3-3.6-3.6z" fill="${STEEL}" stroke="${DARK}" stroke-width="1.2" stroke-linejoin="round"/>`),
  axe: S(`<path d="M15.6 4.8 4.6 19.4" stroke="${WOOD}" stroke-width="2.6" stroke-linecap="round"/><path d="M12.2 3.4c3.2-1.6 7 .2 8.6 3.4l-4.4 3.2-5.2-3.8z" fill="${STEEL}" stroke="${DARK}" stroke-width="1.2" stroke-linejoin="round"/>`),
  pickaxe: S(`<path d="M15.2 6.4 4.8 19.6" stroke="${WOOD}" stroke-width="2.6" stroke-linecap="round"/><path d="M5.6 6.6C9.4 2.6 15 2 20 4.2c-1.6-.2-3.2 0-4.6.8l1.2 1.8C15 5.6 11.6 4.8 5.6 6.6z" fill="${STEEL}" stroke="${DARK}" stroke-width="1.2" stroke-linejoin="round"/>`),
  sickle: S(`<path d="M6.4 17.6 3.6 20.4" stroke="${WOOD}" stroke-width="2.8" stroke-linecap="round"/><path d="M7.2 16.8C5 11 8.4 4.4 15 3.6c3-.4 5.4 1 5.4 1-5-.2-8.8 2.4-9.8 6.6-.6 2.4-.2 4.2.4 5.6z" fill="${STEEL}" stroke="${DARK}" stroke-width="1.2" stroke-linejoin="round"/>`),
  rod: S(`<path d="M3.6 20.4 16.8 3.2" stroke="${WOOD}" stroke-width="2.2" stroke-linecap="round"/><path d="M16.8 3.2c2.6 3 3 7 2.4 10.6" fill="none" stroke="${CREAM}" stroke-width="1.1"/><path d="M19.2 13.8v3.4a1.8 1.8 0 0 1-3.6 0" fill="none" stroke="${STEEL}" stroke-width="1.6" stroke-linecap="round"/><circle cx="6.6" cy="16.6" r="1.6" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>`),
  boat: S(`<path d="M2.8 13.6h18.4l-2.6 5.2a2 2 0 0 1-1.8 1.2H7.2a2 2 0 0 1-1.8-1.2z" fill="${WOOD}" stroke="${DARK}" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 3v10.6" stroke="${DARK}" stroke-width="1.4"/><path d="M12.6 3.8 19 12H12.6z" fill="${CREAM}" stroke="${DARK}" stroke-width="1" stroke-linejoin="round"/>`),
  flag: S(`<path d="M6 21V4" stroke="${CREAM}" stroke-width="2.4" stroke-linecap="round"/><path d="M6 4h11l-2.5 4L17 12H6z" fill="${GOLD}" stroke="${DARK}" stroke-width="1" stroke-linejoin="round"/>`),
  sword: S(`<path d="M19.6 3.2 9.4 13.4l1.2 1.2L20.8 4.4z" fill="${STEEL}" stroke="${DARK}" stroke-width="1.1" stroke-linejoin="round"/><path d="M6.2 13.2 10.8 17.8" stroke="${GOLD}" stroke-width="2.4" stroke-linecap="round"/><path d="M8.4 15.6 4 20" stroke="${WOOD}" stroke-width="2.6" stroke-linecap="round"/>`),
  bag: S(`<path d="M7 8.4h10l1.6 10.4a2 2 0 0 1-2 2.2H7.4a2 2 0 0 1-2-2.2z" fill="${WOOD}" stroke="${DARK}" stroke-width="1.2" stroke-linejoin="round"/><path d="M9 8.4C9 5.6 10.4 4 12 4s3 1.6 3 4.4" fill="none" stroke="${DARK}" stroke-width="1.4"/><circle cx="12" cy="14" r="2" fill="${GOLD}"/>`),
  chest: S(`<rect x="3.4" y="9.6" width="17.2" height="10" rx="1.6" fill="${WOOD}" stroke="${DARK}" stroke-width="1.2"/><path d="M3.4 10c0-3 2.4-5.4 5.4-5.4h6.4c3 0 5.4 2.4 5.4 5.4z" fill="${WOOD}" stroke="${DARK}" stroke-width="1.2" stroke-linejoin="round"/><rect x="10.4" y="9" width="3.2" height="4" rx=".8" fill="${GOLD}" stroke="${DARK}" stroke-width="1"/>`),
  drop: S(`<path d="M12 3.2c3.6 4.4 6 7.8 6 10.8a6 6 0 0 1-12 0c0-3 2.4-6.4 6-10.8z" fill="#7cc4e8" stroke="${DARK}" stroke-width="1.2" stroke-linejoin="round"/><path d="M9.4 14.2a2.8 2.8 0 0 0 2.4 2.8" fill="none" stroke="${CREAM}" stroke-width="1.4" stroke-linecap="round"/>`),
  seed: S(`<path d="M12 3.4c4 2.6 5.8 6 5.8 9.6a5.8 5.8 0 0 1-11.6 0c0-3.6 1.8-7 5.8-9.6z" fill="${GOLD}" stroke="${DARK}" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 8v9" stroke="${CREAM}" stroke-width="1.4" stroke-linecap="round"/>`),
  leaf: S(`<path d="M5 19C5 10 11 5 20 4c0 9-5 15-14 15z" fill="${GREEN}" stroke="${DARK}" stroke-width="1.1" stroke-linejoin="round"/><path d="M6 18 15 9" stroke="#3f7a2a" stroke-width="1.6"/>`),
  door: S(`<path d="M5.4 21V5.4A2.4 2.4 0 0 1 7.8 3h8.4a2.4 2.4 0 0 1 2.4 2.4V21z" fill="${WOOD}" stroke="${DARK}" stroke-width="1.2" stroke-linejoin="round"/><circle cx="15.2" cy="12.6" r="1.2" fill="${GOLD}"/><path d="M3.4 21h17.2" stroke="${DARK}" stroke-width="1.4" stroke-linecap="round"/>`),
  horseshoe: S(`<path d="M6.4 20.4 5.2 12a6.8 6.8 0 0 1 13.6 0l-1.2 8.4h-3l1.2-8.4a3.8 3.8 0 0 0-7.6 0l1.2 8.4z" fill="${STEEL}" stroke="${DARK}" stroke-width="1.2" stroke-linejoin="round"/><circle cx="7.4" cy="15" r=".8" fill="${DARK}"/><circle cx="16.6" cy="15" r=".8" fill="${DARK}"/>`),
  talk: S(`<path d="M4 6.4A2.4 2.4 0 0 1 6.4 4h11.2A2.4 2.4 0 0 1 20 6.4v7.2a2.4 2.4 0 0 1-2.4 2.4H10l-4.4 4v-4A2.4 2.4 0 0 1 4 13.6z" fill="${CREAM}" stroke="${DARK}" stroke-width="1.2" stroke-linejoin="round"/><circle cx="8.6" cy="10" r="1.1" fill="${DARK}"/><circle cx="12" cy="10" r="1.1" fill="${DARK}"/><circle cx="15.4" cy="10" r="1.1" fill="${DARK}"/>`),
  info: S(`<rect x="4" y="3.4" width="16" height="17.2" rx="2" fill="${CREAM}" stroke="${DARK}" stroke-width="1.2"/><path d="M7.6 8h8.8M7.6 12h8.8M7.6 16h5.6" stroke="${WOOD}" stroke-width="1.6" stroke-linecap="round"/>`)
};
const TOOL_FOR = { wood: 'axe', stone: 'pickaxe', clay: 'pickaxe', fiber: 'sickle' };

export function actionIconName(it) {
  const t = it?.type || '';
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
export const actionIcon = it => ICONS[actionIconName(it)] || ICONS.leaf;
