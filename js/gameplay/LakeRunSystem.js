// @ts-nocheck
// R64 Lake Run, renamed Lake Race in R71: a timed buoy course on the lake for Sigurd's boat.
// R71: the course is hidden until you start a race at the gold circle at the end of Sigurd's dock
// (the old fixed fishing spot; fishing now works anywhere along the shore). The save key stays 'lakeRun'.
// Stable-race principles (checkpoints in order, timer, penalties, PB, ghost, seeded weekly rivals) with
// its own small logic and UI; the Stable race and FishingV1 / Boat stay locked. Like BoatEconomySystem it
// only reads the live boat state (f.boat) and nudges its speed (countdown hold, log hits); the boat's
// own movement, shore collision and docking are untouched.
// Rewards: the first LAKE_RUN.attemptsPerDay finished runs per day pay by medal. A rented boat costs
// rent per trip, an owned one does not, so racing is the reason to buy her.
import * as THREE from 'three';
import { LAKE_RUN, MATERIALS } from '../data/wildsCatalog.js';
import { createHoloIndicator } from '../visual/holo-indicator.js';

const V3 = THREE.Vector3;
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const weekStart = () => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; };
const weekDays = () => { const s = weekStart(), out = []; for (let i = 0; i < 7; i++) { const x = new Date(s); x.setDate(s.getDate() + i); out.push(dayKey(x)); } return out; };
const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const fmt2 = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(2).padStart(5, '0')}`;   // R68 race clock
// R68 HUD icons (inline SVG, game palette)
const ICON = {
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="8" fill="none" stroke="#e9c46a" stroke-width="2.4"/><path d="M12 13.5V9M9.5 3h5M12 3v2.5" stroke="#e9c46a" stroke-width="2.4" stroke-linecap="round"/></svg>',
  flag: '<svg viewBox="0 0 24 24"><path d="M6 21V4" stroke="#fff1b8" stroke-width="2.4" stroke-linecap="round"/><path d="M6 4h11l-2.5 4L17 12H6z" fill="#e9c46a"/></svg>',
  crown: '<svg viewBox="0 0 24 24"><path d="M4 17 3 7l5 4 4-6 4 6 5-4-1 10z" fill="#e9c46a"/></svg>',
  cone: '<svg viewBox="0 0 24 24"><path d="M12 3 5 20h14z" fill="#e8604a"/><path d="M8.3 12h7.4M6.8 16h10.4" stroke="#fff1b8" stroke-width="2"/></svg>',
  leaf: '<svg viewBox="0 0 24 24"><path d="M5 19C5 10 11 5 20 4c0 9-5 15-14 15z" fill="#8fd14f"/><path d="M6 18 15 9" stroke="#3f7a2a" stroke-width="1.6"/></svg>',
  laurel: '<svg viewBox="0 0 40 64"><g fill="#e9c46a"><ellipse cx="14" cy="10" rx="4" ry="7" transform="rotate(-30 14 10)"/><ellipse cx="10" cy="22" rx="4" ry="7" transform="rotate(-15 10 22)"/><ellipse cx="9" cy="35" rx="4" ry="7"/><ellipse cx="11" cy="48" rx="4" ry="7" transform="rotate(20 11 48)"/></g><path d="M24 4C10 20 10 44 26 60" fill="none" stroke="#e9c46a" stroke-width="2.4"/></svg>'
};
const costText = c => Object.entries(c).map(([id, n]) => `${MATERIALS[id]?.name || id} +${n}`).join('  ');
const RIVALS = ['Aloe', 'Cactus', 'Daisy', 'Fern', 'Sigurd', 'Moss', 'Nettle', 'Clover', 'Reed', 'Birch', 'Poppy'];
function rng(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export class LakeRunSystem {
  constructor(game, fishing) {
    this.g = game; this.f = fishing; this.L = game.world.sharedLandscape; this.w = game.wilds;
    const pr = game.save.profile;
    this.p = pr.lakeRun ||= { best: 0, splits: [], ghost: [], runs: [], day: '', attempts: 0, golds: 0, weekGold: '' };
    this.state = 'idle'; this.t = 0; this.cd = 0; this.next = 0; this.pen = 0; this.prevV = 0; this.logCd = 0; this.clock = 0;
    this.seq = [...LAKE_RUN.gates.map(([x, z]) => ({ x, z })), { ...LAKE_RUN.start }];
    this.rec = []; this.recAt = 0; this.splits = []; this.ghost = null;
    this.root = new THREE.Group(); this.root.name = 'WILDS_LAKE_RUN'; this.L.root.add(this.root);
    this.buildCourse(); this.buildUi(); this.root.visible = false; this.buildMarker();
    const orig = this.w.boatGoal; this.w.boatGoal = () => orig?.() || this.goal(); // objective card after the boat is yours
  }

  // ---------- course ----------
  buildCourse() {
    const WL = this.L.WL, pts = [LAKE_RUN.start, ...this.seq];
    const buoyGeo = new THREE.SphereGeometry(.32, 14, 10), poleGeo = new THREE.CylinderGeometry(.035, .035, 1.3, 6), flagGeo = new THREE.PlaneGeometry(.5, .32);
    flagGeo.translate(.25, 0, 0);
    const red = new THREE.MeshStandardMaterial({ color: 0xc8553d, roughness: .6 }), white = new THREE.MeshStandardMaterial({ color: 0xf1eadb, roughness: .6 });
    const pole = new THREE.MeshStandardMaterial({ color: 0x5a4a39, roughness: .9 });
    this.flagOff = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: .8, side: THREE.DoubleSide });
    this.flagNext = new THREE.MeshBasicMaterial({ color: 0xffd76a, side: THREE.DoubleSide });
    this.flagStart = new THREE.MeshStandardMaterial({ color: 0x3d6b4f, roughness: .8, side: THREE.DoubleSide });
    this.gates = [];
    // Gate i faces along the path from the previous point to the next one.
    const gateAt = (q, prev, nxt, isStart) => {
      const dx = nxt.x - prev.x, dz = nxt.z - prev.z, L = Math.hypot(dx, dz) || 1, px = -dz / L, pz = dx / L, hw = LAKE_RUN.gateWidth / 2;
      const grp = new THREE.Group(), flags = [];
      for (const s of [-1, 1]) {
        const b = new THREE.Group(); b.position.set(q.x + px * hw * s, WL, q.z + pz * hw * s);
        const ball = new THREE.Mesh(buoyGeo, s < 0 ? red : white); ball.scale.y = .8; ball.castShadow = true; b.add(ball);
        const pl = new THREE.Mesh(poleGeo, pole); pl.position.y = .75; b.add(pl);
        const fl = new THREE.Mesh(flagGeo, isStart ? this.flagStart : this.flagOff); fl.position.y = 1.25; fl.rotation.y = Math.atan2(dx, dz); b.add(fl); flags.push(fl);
        grp.add(b);
      }
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, LAKE_RUN.gateWidth, 5), white);
      rope.rotation.z = Math.PI / 2; rope.rotation.y = -Math.atan2(pz, px); rope.position.set(q.x, WL + .08, q.z); grp.add(rope);
      const ring = new THREE.Mesh(new THREE.RingGeometry(hw - .35, hw, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      ring.position.set(q.x, WL + .05, q.z); ring.renderOrder = 3; ring.visible = false; grp.add(ring);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 9, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe9a3, transparent: true, opacity: .28, depthWrite: false }));
      beam.position.set(q.x, WL + 4.5, q.z); beam.visible = false; grp.add(beam);
      this.root.add(grp); return { grp, flags, ring, beam, isStart };
    };
    for (let i = 0; i < this.seq.length; i++) {
      const q = this.seq[i], isStart = i === this.seq.length - 1;
      const prev = isStart ? this.seq[i - 1] : pts[i], nxt = isStart ? this.seq[0] : this.seq[i + 1];
      this.gates.push(gateAt(q, prev, nxt, isStart));
    }
    // Start banner: a small sign on the start buoys so the course reads from the dock.
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#3d6b4f'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#fff1b8'; x.font = '800 34px Manrope, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('LAKE RACE', 128, 34);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    // Two-sided board on the start gate's red buoy pole (not over the gate, where it would fill the boat camera).
    const sg = this.gates[this.gates.length - 1].grp.children[0], sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .3), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    sign.position.set(0, 1.62, 0); sign.rotation.y = sg.children[2].rotation.y; sg.add(sign);
    // Drifting logs (obstacles).
    const bark = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: .95 }), cut = new THREE.MeshStandardMaterial({ color: 0xc9a46b, roughness: .9 });
    this.logs = LAKE_RUN.logs.map(([lx, lz, ax, az, amp, per], i) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(.28, .32, 2.4, 9), [bark, cut, cut]); m.rotation.z = Math.PI / 2; m.castShadow = true;
      const o = new THREE.Group(); o.add(m); o.rotation.y = Math.atan2(ax, az) + Math.PI / 2; this.root.add(o);
      return { o, lx, lz, ax, az, amp, per, ph: i * 1.7, x: lx, z: lz, hit: false };
    });
    this.updateLogs(0);
  }

  updateLogs(dt) {
    this.clock += dt;
    for (const l of this.logs) {
      const s = Math.sin(this.clock * 2 * Math.PI / l.per + l.ph) * l.amp; l.x = l.lx + l.ax * s; l.z = l.lz + l.az * s;
      l.o.position.set(l.x, this.L.WL + .02 + .03 * Math.sin(this.clock * 1.7 + l.ph), l.z); l.o.rotation.x = .04 * Math.sin(this.clock * 1.3 + l.ph);
    }
  }

  highlight() {
    const racing = this.state === 'racing' || this.state === 'countdown';
    this.gates.forEach((G, i) => {
      const on = racing && i === this.next, soon = racing && i === this.next + 1;
      for (const fl of G.flags) fl.material = on ? this.flagNext : G.isStart ? this.flagStart : this.flagOff;
      G.ring.visible = on || soon; G.ring.material.opacity = on ? .75 : .22; G.beam.visible = on;
    });
  }

  // ---------- UI ----------
  buildUi() {
    const hud = document.createElement('div'); hud.className = 'lakerun-hud';
    // R68: corner layout like the landscape HUD sheet: clock + split (top left), buoys + best (top centre), penalties.
    hud.innerHTML = `<div class="lr-clock tgw-glass"><i>${ICON.clock}</i><div class="lr-time">00:00.00</div></div><div class="lr-split"></div>`
      + `<div class="lr-pen tgw-glass"><i>${ICON.cone}</i><span><small>PENALTIES</small><b>+0.00</b></span></div>`
      + `<div class="lr-flags"><div class="tgw-glass lr-buoys"><i>${ICON.flag}</i><b class="lr-sub">0 / 7</b></div><div class="tgw-glass lr-best"><i>${ICON.crown}</i><small>BEST</small><b>--:--.--</b></div></div>`;
    const count = document.createElement('div'); count.className = 'lakerun-count';
    const res = document.createElement('div'); res.className = 'lakerun-result';
    res.innerHTML = `<header><b>LAKE RACE COMPLETE</b><i>${ICON.leaf}</i></header>`
      + `<div class="lr-top"><div class="lr-laurel"><i class="l">${ICON.laurel}</i><span class="lr-medal"></span><i class="r">${ICON.laurel}</i></div><div class="lr-times"><div class="lr-big"></div><div class="lr-delta"></div></div></div>`
      + '<div class="lr-info"></div><ol class="lr-board"></ol><div class="lr-reward"></div>'
      + '<div class="lr-btns"><button data-lr="again"><span>↻</span>Try again<em>→</em></button><button data-lr="close"><span>✕</span>Close<em>→</em></button></div>';
    for (const el of [hud, count, res]) document.body.appendChild(el);
    res.addEventListener('click', e => { const a = e.target?.closest?.('[data-lr]')?.dataset?.lr; if (a === 'again') this.again(); else if (a === 'close') this.closeResult(); });
    this.ui = { hud, count, res, time: hud.querySelector('.lr-time'), sub: hud.querySelector('.lr-sub'), split: hud.querySelector('.lr-split'), pen: hud.querySelector('.lr-pen'), penVal: hud.querySelector('.lr-pen b'), best: hud.querySelector('.lr-best b') };
  }
  renderHud() {
    const u = this.ui; u.time.textContent = fmt2(this.t + this.pen);
    u.sub.textContent = `${Math.min(this.next, this.seq.length)} / ${this.seq.length}`;
    u.best.textContent = this.p.best ? fmt2(this.p.best) : '--:--.--';
    u.pen.classList.toggle('show', this.pen > 0); u.penVal.textContent = `+${this.pen.toFixed(2)}`;
  }
  // The split vs your PB stays under the clock until the next buoy; penalties flash the penalty pill.
  flashSplit(text, good) { const s = this.ui.split; s.textContent = text; s.className = `lr-split show ${good ? 'good' : 'bad'}`; }
  flashPenalty() { const p = this.ui.pen; p.classList.remove('flash'); void p.offsetWidth; p.classList.add('flash'); }

  // ---------- state ----------
  inBoat() { const f = this.f; return f.mode === 'boat' && f.boat.on && !f.boat.docking; }
  boatWorld(out = new V3()) { const B = this.f.boat; return this.f.boatLocalToWorld(out.set(B.pos.x, B.homePos.y, B.pos.z), out); }
  busy() { return this.state === 'countdown' || this.state === 'racing'; }
  nearStart() { if (!this.inBoat()) return Infinity; const p = this.boatWorld(); return Math.hypot(p.x - LAKE_RUN.start.x, p.z - LAKE_RUN.start.z); }

  // R71: gold circle at the end of Sigurd's dock (FishingV1's old fixed spot). On foot only.
  buildMarker() {
    const P = this.f.fishingPoint; if (!P) return;
    this.spot = { x: P.x, z: P.z };
    // R72: gold when you may race, grey + LOCKED until Sigurd lends you the boat (3 species + life vest).
    const opt = { radius: .58, height: 1.3, intensity: .48, breath: 2.4, scanSpeed: 2.0, scanDensity: 90, baseRing: true, groundHalo: true, fadeIn: .35 };
    const holo = createHoloIndicator(opt), grey = createHoloIndicator({ ...opt, color: 0x9a9f98, intensity: .34, breath: 4 }); holo.setInstant(false); grey.setInstant(false);   // the right one fades in on the first update
    const tex = (text, col) => { const c = document.createElement('canvas'); c.width = 330; c.height = 78; const x = c.getContext('2d');
      x.font = '800 44px Manrope, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 8; x.fillStyle = col; x.fillText(text, 165, 41);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    this.labelTex = { open: tex('LAKE RACE', '#ffe9a3'), locked: tex('LOCKED', '#d6d8d2') };
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.labelTex.open, transparent: true, depthWrite: false })); label.scale.set(1.8, .43, 1); label.position.y = 1.58;
    const m = new THREE.Group(); m.name = 'WILDS_LAKE_RACE_MARKER'; m.add(holo.group, grey.group, label);
    m.position.set(P.x, this.L.groundHeight(P.x, P.z) + .015, P.z); this.L.root.add(m);
    this.marker = { m, holo, grey, label };
  }
  nearSpot(p) { return this.spot && p ? Math.hypot(p.x - this.spot.x, p.z - this.spot.z) : Infinity; }
  interaction() {
    if (this.state !== 'idle' || this.f.mode !== 'world') return null;
    const d = this.nearSpot(this.g.character?.position); if (d > 1.2) return null;
    if (!this.f.hasBoatAccess()) return { type: 'lakerun-start', label: 'Locked', disabled: true, locked: true, distance: d };   // R72 general rule
    return { type: 'lakerun-start', label: 'Lake Race', distance: d };
  }
  interact(type) { if (type === 'lakerun-start') this.startFromSpot(); }
  // Board Sigurd's boat, put her on the start line and count down. The course only exists while racing.
  startFromSpot() {
    const f = this.f;
    if (!f.hasBoatAccess()) { this.g.hud?.showToast('Sigurd lends you the boat once you have shown him three fish'); return false; }
    if (f.mode === 'world') f.boardBoat();
    if (!this.toStart()) return false;
    return this.begin();
  }
  toStart() {
    const f = this.f; if (!f.boat.object || !this.inBoat()) return false;
    const B = f.boat, s = f.boatWorldToLocal(new V3(LAKE_RUN.start.x, B.homePos.y, LAKE_RUN.start.z)), g1 = f.boatWorldToLocal(new V3(this.seq[0].x, B.homePos.y, this.seq[0].z));
    B.pos.x = s.x; B.pos.z = s.z; B.yaw = Math.atan2(-(g1.z - s.z), g1.x - s.x); B.v = B.w = 0; B.tgt = null; B.left = true;
    f.updateBoatSeat?.();
    return true;
  }

  begin() {
    if (!this.inBoat() || this.busy()) return false;
    this.closeResult(true);
    this.state = 'countdown'; this.cd = LAKE_RUN.countdown; this.t = 0; this.pen = 0; this.next = 0; this.prevV = 0;
    this.rec = []; this.recAt = 0; this.splits = []; for (const l of this.logs) l.hit = false;
    this.ui.hud.classList.add('show'); document.body.classList.add('lakerun-active'); this.renderHud(); this.highlight(); this.ensureGhost();
    return true;
  }
  again() {
    if (this.inBoat() && this.toStart()) return this.begin();
    this.closeResult(); this.g.hud?.showToast('Start a race at the gold circle on Sigurd\'s dock');
    return false;
  }
  cancel(msg) {
    this.state = 'idle'; this.ui.hud.classList.remove('show'); document.body.classList.remove('lakerun-active'); this.ui.count.classList.remove('show'); this.highlight(); if (this.ghost) this.ghost.visible = false;
    if (msg) this.g.hud?.showToast(msg);
  }
  closeResult(silent) { this.ui.res.classList.remove('show'); if (this.state === 'result') this.state = 'idle'; if (!silent) this.highlight(); }

  update(dt) {
    const f = this.f; if (!f?.boat) return;
    const on = this.state !== 'idle'; this.root.visible = on;
    if (this.marker) { const M = this.marker, show = !on && f.mode === 'world', open = f.hasBoatAccess();
      (show && open) ? M.holo.show() : M.holo.hide(); (show && !open) ? M.grey.show() : M.grey.hide(); M.holo.update(this.clock, dt); M.grey.update(this.clock, dt);
      const t = open ? this.labelTex.open : this.labelTex.locked; if (M.label.material.map !== t) { M.label.material.map = t; M.label.material.needsUpdate = true; }
      M.label.visible = show && this.nearSpot(this.g.character?.position) < 9; }
    if (!on) { this.clock += dt; return; }
    this.updateLogs(dt);
    if (this.state === 'result' && !this.inBoat()) this.closeResult();
    if (!this.busy()) return;
    const B = f.boat;
    if (!this.inBoat()) return this.cancel('Lake Race cancelled');
    if (this.state === 'countdown') {
      B.v = 0; B.w = 0; B.tgt = null; this.cd -= dt;
      const n = Math.ceil(this.cd), c = this.ui.count;
      c.textContent = n > 0 ? String(n) : 'GO!'; c.classList.add('show');
      if (this.cd <= 0) { this.state = 'racing'; this.t = 0; setTimeout(() => c.classList.remove('show'), 600); }
      return;
    }
    const p = this.boatWorld(), lake = this.L.lake;
    if (Math.hypot(p.x - lake.x, p.z - lake.z) > lake.r - .3) return this.cancel('Lake Race cancelled: you left the lake');
    this.t += dt;
    // Shore bump: FishingV1 bounces the boat (v → −v/4) when the bow or stern would leave the water.
    if (this.prevV > .35 && B.v < 0) this.penalty('shore');
    // Drifting logs.
    // One penalty per log per contact: it re-arms once the boat is clear of it again.
    for (const l of this.logs) {
      const d = Math.hypot(p.x - l.x, p.z - l.z);
      if (!l.hit && d < LAKE_RUN.logRadius) { l.hit = true; B.v = Math.min(B.v, 0) - .35; B.tgt = null; this.penalty('log'); }
      else if (l.hit && d > LAKE_RUN.logRadius + .9) l.hit = false;
    }
    this.prevV = B.v;
    // Buoys in order.
    const q = this.seq[this.next];
    if (q && Math.hypot(p.x - q.x, p.z - q.z) < LAKE_RUN.gateWidth / 2) {
      this.splits.push(+(this.t + this.pen).toFixed(2));
      const pb = this.p.splits[this.next];
      if (pb) { const d = this.t + this.pen - pb; this.flashSplit(`${d <= 0 ? '−' : '+'} ${fmt2(Math.abs(d))}`, d <= 0); }
      this.next++; this.highlight();
      if (this.next >= this.seq.length) return this.finish();
    }
    // Ghost: record every ghostEvery seconds; play back the PB run.
    if (this.t >= this.recAt) { this.recAt += LAKE_RUN.ghostEvery; this.rec.push(+B.pos.x.toFixed(2), +B.pos.z.toFixed(2), +B.yaw.toFixed(3)); }
    this.playGhost();
    this.renderHud();
  }

  penalty(kind) {
    const s = LAKE_RUN.penalty[kind]; this.pen += s;
    this.flashPenalty(); this.renderHud();
  }

  // Ghost = a see-through clone of the boat in the same parent frame, replaying the PB samples.
  ensureGhost() {
    const b = this.f.boat.object; if (this.ghost || !b?.parent || !this.p.ghost.length) { if (this.ghost) this.ghost.visible = false; return; }
    const gm = new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: .32, depthWrite: false });
    const gh = b.clone(true); gh.name = 'LAKE_RUN_GHOST';
    gh.traverse(o => { if (o.isMesh) { o.material = gm; o.castShadow = o.receiveShadow = false; o.renderOrder = 2; } });
    gh.visible = false; b.parent.add(gh); this.ghost = gh;
  }
  playGhost() {
    const gh = this.ghost, s = this.p.ghost; if (!gh || !s.length) return;
    const n = s.length / 3, k = this.t / LAKE_RUN.ghostEvery, i = Math.floor(k);
    if (i >= n - 1) { gh.visible = false; return; }
    const a = i * 3, u = k - i, B = this.f.boat, H = B.homePos, E = B.homeEuler;
    let dy = s[a + 5] - s[a + 2]; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    gh.position.set(s[a] + (s[a + 3] - s[a]) * u, H.y + .03, s[a + 1] + (s[a + 4] - s[a + 1]) * u);
    gh.rotation.set(E.x, s[a + 2] + dy * u, E.z, 'YXZ'); gh.visible = true;
  }

  finish() {
    const total = +(this.t + this.pen).toFixed(2), p = this.p, today = dayKey(), M = LAKE_RUN.medals;
    this.state = 'result'; this.ui.hud.classList.remove('show'); document.body.classList.remove('lakerun-active'); if (this.ghost) this.ghost.visible = false; this.highlight();
    const medal = total <= M[0] ? 'gold' : total <= M[1] ? 'silver' : total <= M[2] ? 'bronze' : null;
    const prev = p.best, pb = !prev || total < prev;
    if (pb) { p.best = total; p.splits = this.splits.slice(); p.ghost = this.rec.slice(0, 3 * 1500); }
    p.runs.push({ day: today, t: total }); const keep = new Set(weekDays()); p.runs = p.runs.filter(r => keep.has(r.day) || r.t === p.best).slice(-60);
    if (p.day !== today) { p.day = today; p.attempts = 0; }
    const rewarded = p.attempts < LAKE_RUN.attemptsPerDay; if (rewarded) p.attempts++;
    const gains = {};
    const add = c => { for (const [id, n] of Object.entries(c)) gains[id] = (gains[id] || 0) + n; };
    if (rewarded && medal) {
      add(LAKE_RUN.reward[medal]);
      if (medal === 'gold') { if (!p.golds) add(LAKE_RUN.firstGold); const wk = dayKey(weekStart()); if (p.weekGold !== wk) { p.weekGold = wk; add(LAKE_RUN.weeklyGold); } p.golds++; }
    }
    for (const [id, n] of Object.entries(gains)) this.w.give(id, n);
    this.g.save.persist();
    this.showResult({ total, medal, pb, prev, rewarded, gains });
    return { total, medal, pb, gains };
  }

  board() {
    const wk = weekDays(), r = rng(`lakerun|${wk[0]}`), M = LAKE_RUN.medals, pool = RIVALS.slice(), out = [];
    for (let i = 0; i < 6; i++) { const name = pool.splice(Math.floor(r() * pool.length), 1)[0], q = r(); out.push({ name, t: +(M[0] * .95 + (M[2] * 1.08 - M[0] * .95) * q * q).toFixed(1) }); }
    const mine = this.p.runs.filter(x => wk.includes(x.day)).reduce((m, x) => Math.min(m, x.t), Infinity);
    if (Number.isFinite(mine)) out.push({ name: 'You', t: mine, you: true });
    return out.sort((a, b) => a.t - b.t);
  }

  showResult({ total, medal, pb, prev, rewarded, gains }) {
    const r = this.ui.res, left = Math.max(0, LAKE_RUN.attemptsPerDay - this.p.attempts), M = LAKE_RUN.medals;
    r.querySelector('.lr-big').textContent = fmt2(total);
    const dl = r.querySelector('.lr-delta'); dl.innerHTML = prev ? `${ICON.crown}<span>${total <= prev ? '−' : '+'} ${fmt2(Math.abs(prev - total))}</span>` : ''; dl.className = `lr-delta ${prev && total <= prev ? 'good' : 'bad'}`;
    const m = r.querySelector('.lr-medal'); m.className = `lr-medal ${medal || 'none'}`;
    m.textContent = medal ? `${medal[0].toUpperCase()}${medal.slice(1)}` : '–'; r.querySelector('.lr-laurel').className = `lr-laurel ${medal || 'none'}`;
    const pen = this.pen ? ` · penalties +${this.pen} s` : '';
    r.querySelector('.lr-info').textContent = (pb ? (prev ? 'New personal best' : 'First time on the board') : `Personal best ${fmt2(this.p.best)}`) + pen + (medal ? '' : ` · bronze is under ${fmt(M[2])}`);
    const b = this.board(), you = b.findIndex(x => x.you), top = b.slice(0, 5);
    if (you >= 5) top.push(b[you]);
    r.querySelector('.lr-board').innerHTML = top.map(x => `<li class="${x.you ? 'you' : ''}" value="${b.indexOf(x) + 1}"><span>${x.name}</span><span>${fmt(x.t)}</span></li>`).join('');
    const g = Object.keys(gains).length ? costText(gains) : rewarded ? 'No medal, no reward this time' : 'Practice run (3 rewarded runs a day)';
    r.querySelector('.lr-reward').textContent = `${g}${rewarded ? `  ·  ${left} rewarded run${left === 1 ? '' : 's'} left today` : ''}`;
    r.classList.add('show');
    if (Object.keys(gains).length) this.g.hud?.materials?.classList.add('show');
  }

  goal() {
    const owned = this.g.save.profile.boat?.owned; if (!owned || this.p.golds) return null;
    if (!this.p.best) return { title: 'Try the Lake Race', copy: 'Step into the gold circle at the end of Sigurd\'s dock.' };
    return { title: 'Win Lake Race gold', copy: `Your best is ${fmt(this.p.best)}. Gold is under ${fmt(LAKE_RUN.medals[0])}.` };
  }

  // DEV: put the (rented) boat at the start buoys, facing the first buoy.
  devToStart() {
    const f = this.f; if (!f.boat.object) return false;
    if (f.mode !== 'boat') { if (!f.hasBoatAccess()) f.setBoatAccess({ rented: true }); this.g.devMenu?.teleport?.('world', f.boatBerthPoint.x, f.boatBerthPoint.z, 0); f.boardBoat(); }
    return this.toStart();
  }
}
