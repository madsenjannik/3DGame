// @ts-nocheck
// R132/R133 (GO 08/10): character select in the style of Jannik's reference (cards over a render of our own world).
// R135 (GO A 08/10): this is now the game's selector (selector.html; the old one is gone). Saves stay untouched.
// Until the rare-seed unlocks are built (R136) all 9 characters are open; ?locks=1 previews the locked design.
// Assets are the game's own: the world render, portraits rendered from the character GLBs, the brand logo and the specials' icons.
// R133: English everywhere, a live 3D character (its own GLB, Idle) on the centre card, WebAudio sounds in the
// Stable's chime style, and locked characters kept a mystery: no readable silhouette, no texts, no stats.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadGLTF } from '../core/AssetManager.js';
import { SPECIAL } from '../data/combatCatalog.js?build=DAYNIGHT-R81-20261005A';

const ROSTER = globalThis.DYM_CHARACTER_ROSTER || [];
const ORDER = ['daisy', 'cactus', 'swamp', 'aloe', 'tulip', 'hyacinth', 'succulent', 'spire', 'fern'];
const STARTERS = new Set(['daisy', 'cactus', 'swamp']);
const LOCKS = new URLSearchParams(location.search).get('locks') === '1';   // R135: locks come with the seeds (R136)
const ENERGY = { daisy: 4, cactus: 3 };                                  // decision 1a: the starters are not all slow
const GLB = { aloe: 'aloe-vera' };
const EN = {
  daisy: ['Meadow Friend', 'Calm and kind. Turns her face to the sun and gets everyone else to do the same.'],
  cactus: ['Desert Wanderer', 'Patient and tough. Gets by on very little and blooms when no one expects it.'],
  swamp: ['Giant of the Bog', 'Heavy and soft as the wetlands it comes from. Slow, but it moves for no one.'],
  aloe: ['The Healer', 'Prickly outside, soft inside. Looks after the others when the sun has been too harsh.'],
  tulip: ['Herald of Spring', 'The first colour in the bed. Curious, light on its feet and always on its way somewhere.'],
  hyacinth: ['Scent Master', 'Dense, full and a little proud. Felt before it is seen.'],
  succulent: ['The Little Collector', 'Compact and round. Saves water for hard times and gladly shares it.'],
  spire: ['The New Shoot', 'Just out of the ground. Quick, slender and full of energy.'],
  fern: ['Keeper of the Forest Floor', 'Thrives in the shade. Quiet, old and always one step ahead.']
};
const UNLOCK = {
  aloe: 'Grow me: your first greenhouse harvest', tulip: 'Grow me: defeat the Wood Giant', hyacinth: 'Grow me: defeat the Root Bear',
  succulent: 'Grow me: catch all 3 fish species', spire: 'Grow me: win gold in the Lake Run', fern: 'Grow me: the Dark Forest (coming soon)'
};
// One line per special, from its data in combatCatalog (kind, damage, effect)
const ABILITY = {
  line: 'Fires a thorn that pierces every enemy in a long line.',
  chain: 'Throws a star that bounces on to 3 enemies.',
  lob: { aloe: 'Throws a gel bomb. The puddle slows enemies down.', hyacinth: 'Throws a scent cloud that hurts everyone standing in it.', swamp: 'Throws mud over an area and stuns enemies for 1.5 s.' },
  boomerang: 'Throws a leaf that flies out and comes back.',
  fan: 'Throws three leaves in a fan.',
  pearl: 'Fires a water pearl that pushes enemies away.',
  roll: 'Rolls a bulb straight through the enemies.'
};
const STATS = [   // personality axes (approved effects table 08/10); R135 makes them real in the game
  { key: 'Speed', icon: 'hop', cls: 'blue', fx: v => v === 3 ? 'Normal speed' : `${v > 3 ? '+' : '−'}${Math.abs(v - 3) * 4}% speed` },
  { key: 'Courage', icon: 'vest', cls: 'red', fx: v => v >= 5 ? '−10% damage taken' : v === 4 ? '−5% damage taken' : v === 1 ? '+1 s safe after a hit' : v === 2 ? '+0.5 s safe after a hit' : 'Balanced' },   // R134: the game's own vest (protection), not a sword
  { key: 'Social', icon: 'leaf', cls: 'green', fx: v => v <= 1 ? 'No bonus' : `${(v - 1) * 5}% bonus finds` },
  { key: 'Style', icon: 'fist', cls: 'gold', fx: v => v <= 2 ? 'Special in 5 hits' : v === 4 ? '8% critical hits' : v >= 5 ? '15% critical hits' : 'Special in 6 hits' }
];

const chr = id => {
  const d = ROSTER.find(r => r.id === id) || { id, name: id, personality: [3, 3, 3, 3] }, p = [...d.personality];
  if (ENERGY[id]) p[0] = ENERGY[id];
  const sp = SPECIAL.chars[id] || {}, ab = ABILITY[sp.kind], [role, desc] = EN[id] || ['', ''];
  return { id, name: d.name, role, desc, personality: p, open: LOCKS ? STARTERS.has(id) : d.playable !== false, special: sp, ability: typeof ab === 'object' ? ab[id] : ab || '' };
};
const art = id => `./assets/ui/selector/${id}.webp?v=R132`;

// ---- sound: soft WebAudio tones, the same voice as the Stable's chime ----
const Sound = {
  ac: null,
  tone(f, len, g, type = 'triangle', delay = 0, slide = 0) {
    try {
      const ac = this.ac || (this.ac = new (window.AudioContext || window.webkitAudioContext)()); if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime + delay, o = ac.createOscillator(), v = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + len);
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + .012); v.gain.exponentialRampToValueAtTime(.0001, t + len);
      o.connect(v).connect(ac.destination); o.start(t); o.stop(t + len + .05);
    } catch {}
  },
  swap() { this.tone(520, .12, .07, 'triangle', 0, 1.5); this.tone(1040, .09, .03, 'sine', .03); },
  locked() { this.tone(196, .22, .08, 'triangle', 0, .8); },
  select() { [[523, 0], [659, .08], [784, .16], [1047, .26]].forEach(([f, d]) => this.tone(f, .5, .11, 'triangle', d)); }
};

// ---- live 3D character on the centre card ----
class LiveCard {
  constructor(host) {
    this.host = host; this.cache = new Map(); this.cur = null; this.clock = new THREE.Clock();
    const touch = matchMedia('(pointer:coarse)').matches;
    const c = this.canvas = document.createElement('canvas'); c.className = 'cs-live'; host.appendChild(c);
    const r = this.r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, touch ? 1.6 : 2)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.08; r.setClearColor(0, 0);
    const s = this.s = new THREE.Scene(); s.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), .04).texture; s.environmentIntensity = .45;
    s.add(new THREE.HemisphereLight(0xfaf4e2, 0x6c7a44, 1.0));                                      // same light rig as the portraits
    const key = new THREE.DirectionalLight(0xffe2b8, 2.8); key.position.set(-2.5, 3.5, 4); s.add(key);
    const rim = new THREE.DirectionalLight(0xcfe6ff, 2.2); rim.position.set(3, 2.5, -3); s.add(rim);
    this.cam = new THREE.PerspectiveCamera(30, 1, .05, 50);
    const loop = () => { requestAnimationFrame(loop); if (!document.hidden && this.cur) { const dt = Math.min(this.clock.getDelta(), 1 / 20); this.cur.mixer.update(dt); this.cur.root.rotation.y = -.38 + Math.sin(performance.now() / 2600) * .12; this.r.render(this.s, this.cam); } };
    loop();
  }
  async load(id) {
    if (this.cache.has(id)) return this.cache.get(id);
    const p = loadGLTF(`./assets/characters/${GLB[id] || id}.glb`).then(g => {
      const root = g.scene, mixer = new THREE.AnimationMixer(root), idle = g.animations.find(a => a.name === 'Idle');
      if (idle) mixer.clipAction(idle).play();
      const b = new THREE.Box3().setFromObject(root), c = b.getCenter(new THREE.Vector3()); root.position.sub(new THREE.Vector3(c.x, b.min.y, c.z));
      return { id, root, mixer, h: b.getSize(new THREE.Vector3()).y };
    });
    this.cache.set(id, p); return p;
  }
  // place the canvas over the centre card's art box and show this character there
  async show(id, box) {
    this.want = id; const c = this.canvas;
    if (!id) { c.classList.remove('on'); return false; }
    Object.assign(c.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
    this.r.setSize(box.width, box.height, false); this.cam.aspect = box.width / box.height; this.cam.updateProjectionMatrix();
    let m; try { m = await this.load(id); } catch (e) { console.warn('[TGW] live card falls back to the portrait', e); return false; }
    if (this.want !== id) return false;
    if (this.cur && this.cur !== m) this.s.remove(this.cur.root);
    this.cur = m; this.s.add(m.root);
    const h = m.h, dist = (h * .5) / Math.tan(THREE.MathUtils.degToRad(15)) * 1.1;              // the portraits' framing
    this.cam.position.set(0, h * .58, dist); this.cam.lookAt(0, h * .5, 0);
    c.classList.add('on'); return true;
  }
}

export function mountCharacterSelect() {
  const $ = s => document.querySelector(s), list = ORDER.map(chr);
  let want = new URLSearchParams(location.search).get('char');
  if (!want) try { want = JSON.parse(localStorage.getItem('tgw.lastChar') || 'null')?.id; } catch {}   // R135: open on the last played character (as the old selector did)
  let i = Math.max(0, ORDER.indexOf(want || 'cactus')), live = null;
  try { live = new LiveCard($('#cs-stage')); } catch (e) { console.warn('[TGW] no WebGL: portraits only', e); }
  const card = (c, pos) => `<button type="button" class="cs-card ${pos}${c.open ? '' : ' locked'}" data-i="${list.indexOf(c)}" aria-label="${c.open ? c.name : 'Locked character'}">
      <span class="cs-art" style="--art:url(${art(c.id)})"></span>${c.open ? '' : '<span class="cs-lock" aria-hidden="true"></span><span class="cs-q" aria-hidden="true">?</span>'}
      <span class="cs-plate"><b>${c.name}</b><small>${c.open ? c.role : 'Locked'}</small></span></button>`;
  const placeLive = () => {
    if (!live) return; const c = list[i], art = $('.cs-card.main .cs-art'), stage = $('#cs-stage').getBoundingClientRect();
    if (!c.open || !art) return live.show(null);
    const r = art.getBoundingClientRect();
    live.show(c.id, { left: r.left - stage.left, top: r.top - stage.top, width: r.width, height: r.height }).then(ok => { if (ok && list[i].id === c.id) $('.cs-card.main')?.classList.add('live'); });
  };
  const render = dir => {
    const n = list.length, c = list[i], prev = list[(i - 1 + n) % n], next = list[(i + 1) % n];
    const row = $('#cs-cards'); row.innerHTML = card(prev, 'side prev') + card(c, 'main') + card(next, 'side next');
    if (dir) { row.classList.remove('slide-l', 'slide-r'); void row.offsetWidth; row.classList.add(dir > 0 ? 'slide-l' : 'slide-r'); }
    live?.show(null); clearTimeout(render.t); render.t = setTimeout(placeLive, dir ? 340 : 0);   // after the slide settles
    $('#cs-thumbs').innerHTML = list.map((t, k) => `<button type="button" class="cs-thumb${k === i ? ' on' : ''}${t.open ? '' : ' locked'}" data-i="${k}" aria-label="${t.open ? t.name : 'Locked character'}">${t.open ? `<span style="--art:url(${art(t.id)})"></span>` : '<em>?</em>'}</button>`).join('');
    $('#cs-name').textContent = c.name; $('#cs-role').textContent = c.open ? c.role : 'Locked';
    $('#cs-desc').textContent = c.open ? c.desc : (UNLOCK[c.id] || 'Locked');
    $('#cs-ab-icon').style.backgroundImage = `url(./assets/combat/specials/icon_${c.special.file || c.id}.png)`;
    $('#cs-ab-name').textContent = c.special.name || 'Special'; $('#cs-ab-text').textContent = c.open ? c.ability : '';
    $('#cs-stats').innerHTML = c.open ? STATS.map((s, k) => { const v = c.personality[k]; return `<div class="cs-stat"><i class="cs-ico" style="--ico:url(./brand/icons/svg/icon-${s.icon}.svg)"></i><b>${s.key}</b><span class="cs-bar ${s.cls}"><em style="width:${v * 20}%"></em></span><small>${s.fx(v)}</small></div>`; }).join('')
      : '<div class="cs-mystery"><i aria-hidden="true"></i><b>Personality unknown</b><small>Grow it to find out</small></div>';
    const play = $('#cs-play'); play.disabled = !c.open; play.innerHTML = c.open ? `<i class="cs-tri"></i><span>Play as ${c.name}</span>` : '<span>Locked · grow it in the greenhouse</span>';
    document.body.classList.toggle('cs-is-locked', !c.open);
  };
  const go = (k, dir) => { if (k === i) return; const n = list.length; i = (k + n) % n; render(dir || 1); list[i].open ? Sound.swap() : Sound.locked(); };
  let swiped = -1e9;   // no swipe yet: the very first click must count
  document.addEventListener('click', e => {
    if (performance.now() - swiped < 350) return;   // the click a browser sends after a swipe
    const t = e.target.closest('[data-i]'); if (t) { const k = +t.dataset.i; return go(k, k > i || (i === list.length - 1 && k === 0) ? 1 : -1); }
    if (e.target.closest('#cs-prev')) go(i - 1, -1); else if (e.target.closest('#cs-next')) go(i + 1, 1);
    else if (e.target.closest('#cs-play') && list[i].open) { Sound.select(); document.body.classList.add('cs-go'); setTimeout(() => { location.href = `./game.html?char=${encodeURIComponent(list[i].id)}`; }, 520); }
  });
  addEventListener('keydown', e => { if (e.key === 'ArrowLeft') go(i - 1, -1); else if (e.key === 'ArrowRight') go(i + 1, 1); else if (e.key === 'Enter' && list[i].open) $('#cs-play').click(); });
  let sx = null; const area = $('#cs-stage');
  area.addEventListener('pointerdown', e => { sx = e.clientX; }); area.addEventListener('pointerup', e => { if (sx != null && Math.abs(e.clientX - sx) > 40) { swiped = performance.now(); go(i + (e.clientX < sx ? 1 : -1), e.clientX < sx ? 1 : -1); } sx = null; });
  addEventListener('resize', () => { clearTimeout(render.t); render.t = setTimeout(placeLive, 120); });
  render(0); window.__cs = { get i() { return i; }, list, go, live }; document.body.classList.add('cs-ready');
  setTimeout(() => { for (const id of STARTERS) live?.load(id); }, 600);   // warm the three starters
}
