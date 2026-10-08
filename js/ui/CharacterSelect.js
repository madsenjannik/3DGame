// @ts-nocheck
// R132 (GO 08/10): character select in the style of Jannik's reference (cards over a map of our own world).
// TEST PAGE ONLY (selector-wilds.html); the live selector.html and every save stay untouched. Assets are the game's
// own: the world render, portraits rendered from the character GLBs, the brand logo and the specials' icons.
// Starters Daisy, Cactus, Swamp are open; the other six show how they are grown (decisions 08/10).
import { SPECIAL } from '../data/combatCatalog.js?build=DAYNIGHT-R81-20261005A';

const ROSTER = globalThis.DYM_CHARACTER_ROSTER || [];
const ORDER = ['daisy', 'cactus', 'swamp', 'aloe', 'tulip', 'hyacinth', 'succulent', 'spire', 'fern'];
const STARTERS = new Set(['daisy', 'cactus', 'swamp']);
const ENERGY = { daisy: 4, cactus: 3 };                                  // decision 1a: the starters are not all slow
const UNLOCK = {
  aloe: 'Gro mig: første høst i drivhuset', tulip: 'Gro mig: besejr Wood Giant', hyacinth: 'Gro mig: besejr Root Bear',
  succulent: 'Gro mig: fang alle 3 fiskearter', spire: 'Gro mig: guld i Lake Run', fern: 'Gro mig: Den mørke skov (kommer)'
};
// One line per special, from its data in combatCatalog (kind, damage, effect)
const ABILITY = {
  line: 'Skyder en torn, der går gennem alle fjender på en lang linje.',
  chain: 'Kaster en stjerne, der hopper videre til 3 fjender.',
  lob: { aloe: 'Kaster en gelbombe. Pølen gør fjender langsomme.', hyacinth: 'Kaster en duftsky, der skader alle, der står i den.', swamp: 'Kaster mudder i et område og lammer fjender i 1,5 s.' },
  boomerang: 'Kaster et blad, der flyver ud og kommer tilbage.',
  fan: 'Kaster tre blade i en vifte.',
  pearl: 'Skyder en vandperle, der skubber fjender væk.',
  roll: 'Ruller en løgknold gennem fjenderne.'
};
const STATS = [   // personality axes (approved effects table 08/10); R135 makes them real in the game
  { key: 'Fart', icon: 'hop', cls: 'blue', fx: v => v === 3 ? 'Normal fart' : `${v > 3 ? '+' : '−'}${Math.abs(v - 3) * 4} % fart` },
  { key: 'Mod', icon: 'sword', cls: 'red', fx: v => v >= 5 ? '−10 % skade' : v === 4 ? '−5 % skade' : v === 1 ? '+1 s usårlig' : v === 2 ? '+0,5 s usårlig' : 'Afbalanceret' },
  { key: 'Social', icon: 'leaf', cls: 'green', fx: v => v <= 1 ? 'Ingen bonus' : `${(v - 1) * 5} % ekstra fund` },
  { key: 'Stil', icon: 'fist', cls: 'gold', fx: v => v <= 2 ? 'Special på 5 slag' : v === 4 ? '8 % kritisk slag' : v >= 5 ? '15 % kritisk slag' : 'Special på 6 slag' }
];

const chr = id => {
  const d = ROSTER.find(r => r.id === id) || { id, name: id, role: '', desc: '', personality: [3, 3, 3, 3] }, p = [...d.personality];
  if (ENERGY[id]) p[0] = ENERGY[id];
  const sp = SPECIAL.chars[id] || {}, ab = ABILITY[sp.kind];
  return { ...d, personality: p, open: STARTERS.has(id), special: sp, ability: typeof ab === 'object' ? ab[id] : ab || '' };
};
const art = id => `./assets/ui/selector/${id}.webp?v=R132`;

export function mountCharacterSelect() {
  const $ = s => document.querySelector(s), list = ORDER.map(chr);
  let i = Math.max(0, ORDER.indexOf(new URLSearchParams(location.search).get('char') || 'cactus')), busy = 0;
  const card = (c, pos) => `<button type="button" class="cs-card ${pos}${c.open ? '' : ' locked'}" data-i="${list.indexOf(c)}" aria-label="${c.name}">
      <span class="cs-art" style="--art:url(${art(c.id)})"></span>${c.open ? '' : '<span class="cs-lock" aria-hidden="true"></span>'}
      <span class="cs-plate"><b>${c.name}</b><small>${c.role}</small></span></button>`;
  const render = dir => {
    const n = list.length, c = list[i], prev = list[(i - 1 + n) % n], next = list[(i + 1) % n];
    const row = $('#cs-cards'); row.innerHTML = card(prev, 'side prev') + card(c, 'main') + card(next, 'side next');
    if (dir) { row.classList.remove('slide-l', 'slide-r'); void row.offsetWidth; row.classList.add(dir > 0 ? 'slide-l' : 'slide-r'); }
    $('#cs-thumbs').innerHTML = list.map((t, k) => `<button type="button" class="cs-thumb${k === i ? ' on' : ''}${t.open ? '' : ' locked'}" data-i="${k}" aria-label="${t.name}"><span style="--art:url(${art(t.id)})"></span></button>`).join('');
    $('#cs-name').textContent = c.name; $('#cs-role').textContent = c.role;
    $('#cs-desc').textContent = c.open ? c.desc : (UNLOCK[c.id] || 'Låst');
    $('#cs-ab-icon').style.backgroundImage = `url(./assets/combat/specials/icon_${c.special.file || c.id}.png)`;
    $('#cs-ab-name').textContent = c.special.name || 'Special'; $('#cs-ab-text').textContent = c.ability;
    $('#cs-stats').innerHTML = STATS.map((s, k) => { const v = c.personality[k]; return `<div class="cs-stat"><i class="cs-ico" style="--ico:url(./brand/icons/svg/icon-${s.icon}.svg)"></i><b>${s.key}</b><span class="cs-bar ${s.cls}"><em style="width:${v * 20}%"></em></span><small>${s.fx(v)}</small></div>`; }).join('');
    const play = $('#cs-play'); play.disabled = !c.open; play.innerHTML = c.open ? `<i class="cs-tri"></i><span>Spil som ${c.name}</span>` : '<span>Låst · gro i drivhuset</span>';
    document.body.classList.toggle('cs-is-locked', !c.open);
  };
  const go = (k, dir) => { if (k === i) return; const n = list.length; i = (k + n) % n; render(dir || 1); };
  let swiped = -1e9;   // no swipe yet: the very first click must count
  document.addEventListener('click', e => {
    if (performance.now() - swiped < 350) return;   // the click a browser sends after a swipe
    const t = e.target.closest('[data-i]'); if (t) { const k = +t.dataset.i; return go(k, k > i || (i === list.length - 1 && k === 0) ? 1 : -1); }
    if (e.target.closest('#cs-prev')) go(i - 1, -1); else if (e.target.closest('#cs-next')) go(i + 1, 1);
    else if (e.target.closest('#cs-play') && list[i].open) location.href = `./game.html?char=${encodeURIComponent(list[i].id)}`;
  });
  addEventListener('keydown', e => { if (e.key === 'ArrowLeft') go(i - 1, -1); else if (e.key === 'ArrowRight') go(i + 1, 1); else if (e.key === 'Enter' && list[i].open) $('#cs-play').click(); });
  let sx = null; const area = $('#cs-stage');
  area.addEventListener('pointerdown', e => { sx = e.clientX; }); area.addEventListener('pointerup', e => { if (sx != null && Math.abs(e.clientX - sx) > 40) { swiped = performance.now(); go(i + (e.clientX < sx ? 1 : -1), e.clientX < sx ? 1 : -1); } sx = null; });
  render(0); window.__cs = { get i() { return i; }, list, go }; document.body.classList.add('cs-ready');
}
