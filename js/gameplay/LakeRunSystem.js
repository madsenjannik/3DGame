// @ts-nocheck
// R64 Lake Run: a timed buoy course on the lake for Sigurd's boat.
// Stable-race principles (checkpoints in order, timer, penalties, PB, ghost, seeded weekly rivals) with
// its own small logic and UI; the Stable race and FishingV1 / Boat stay locked. Like BoatEconomySystem it
// only reads the live boat state (f.boat) and nudges its speed (countdown hold, log hits); the boat's
// own movement, shore collision and docking are untouched.
// Rewards: the first LAKE_RUN.attemptsPerDay finished runs per day pay by medal. A rented boat costs
// rent per trip, an owned one does not, so racing is the reason to buy her.
import * as THREE from 'three';
import { LAKE_RUN, MATERIALS } from '../data/wildsCatalog.js';

const V3 = THREE.Vector3;
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const weekStart = () => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; };
const weekDays = () => { const s = weekStart(), out = []; for (let i = 0; i < 7; i++) { const x = new Date(s); x.setDate(s.getDate() + i); out.push(dayKey(x)); } return out; };
const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
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
    this.buildCourse(); this.buildUi();
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
    x.fillStyle = '#3d6b4f'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#fff1b8'; x.font = '800 34px Manrope, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('LAKE RUN', 128, 34);
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
    hud.innerHTML = '<b>Lake Run</b><div class="lr-time">0:00.0</div><div class="lr-sub"></div><div class="lr-split"></div>';
    const count = document.createElement('div'); count.className = 'lakerun-count';
    const res = document.createElement('div'); res.className = 'lakerun-result';
    res.innerHTML = '<b>Lake Run</b><div class="lr-big"></div><div class="lr-medal"></div><div class="lr-info"></div><ol class="lr-board"></ol><div class="lr-reward"></div><div class="lr-btns"><button data-lr="again">Again</button><button data-lr="close">Close</button></div>';
    res.addEventListener('click', e => { const a = e.target?.dataset?.lr; if (a === 'again') this.again(); else if (a === 'close') this.closeResult(); });
    for (const el of [hud, count, res]) document.body.appendChild(el);
    this.ui = { hud, count, res, time: hud.querySelector('.lr-time'), sub: hud.querySelector('.lr-sub'), split: hud.querySelector('.lr-split') };
  }
  renderHud() {
    const u = this.ui; u.time.textContent = fmt(this.t + this.pen);
    u.sub.textContent = `Buoys ${Math.min(this.next, this.seq.length)}/${this.seq.length}${this.pen ? `  ·  +${this.pen} s` : ''}`;
  }
  flashSplit(text, good) { const s = this.ui.split; s.textContent = text; s.className = `lr-split show ${good ? 'good' : 'bad'}`; clearTimeout(this._splitT); this._splitT = setTimeout(() => { s.className = 'lr-split'; }, 1600); }

  // ---------- state ----------
  inBoat() { const f = this.f; return f.mode === 'boat' && f.boat.on && !f.boat.docking; }
  boatWorld(out = new V3()) { const B = this.f.boat; return this.f.boatLocalToWorld(out.set(B.pos.x, B.homePos.y, B.pos.z), out); }
  busy() { return this.state === 'countdown' || this.state === 'racing'; }
  nearStart() { if (!this.inBoat()) return Infinity; const p = this.boatWorld(); return Math.hypot(p.x - LAKE_RUN.start.x, p.z - LAKE_RUN.start.z); }

  interaction() {
    if (this.state !== 'idle') return null;
    const d = this.nearStart(); if (d > LAKE_RUN.startZone) return null;
    return { type: 'lakerun-start', label: 'Start Lake Run', distance: d };
  }
  interact(type) { if (type === 'lakerun-start') this.begin(); }

  begin() {
    if (!this.inBoat() || this.busy()) return false;
    this.closeResult(true);
    this.state = 'countdown'; this.cd = LAKE_RUN.countdown; this.t = 0; this.pen = 0; this.next = 0; this.prevV = 0;
    this.rec = []; this.recAt = 0; this.splits = []; for (const l of this.logs) l.hit = false;
    this.ui.hud.classList.add('show'); this.renderHud(); this.highlight(); this.ensureGhost();
    return true;
  }
  again() {
    if (this.nearStart() <= LAKE_RUN.startZone + 2) return this.begin();
    this.closeResult(); this.g.hud?.showToast(this.inBoat() ? 'Row back to the start buoys' : 'Take the boat out to race');
    return false;
  }
  cancel(msg) {
    this.state = 'idle'; this.ui.hud.classList.remove('show'); this.ui.count.classList.remove('show'); this.highlight(); if (this.ghost) this.ghost.visible = false;
    if (msg) this.g.hud?.showToast(msg);
  }
  closeResult(silent) { this.ui.res.classList.remove('show'); if (this.state === 'result') this.state = 'idle'; if (!silent) this.highlight(); }

  update(dt) {
    const f = this.f; if (!f?.boat) return;
    this.updateLogs(dt);
    if (this.state === 'result' && !this.inBoat()) this.closeResult();
    if (!this.busy()) return;
    const B = f.boat;
    if (!this.inBoat()) return this.cancel('Lake Run cancelled');
    if (this.state === 'countdown') {
      B.v = 0; B.w = 0; B.tgt = null; this.cd -= dt;
      const n = Math.ceil(this.cd), c = this.ui.count;
      c.textContent = n > 0 ? String(n) : 'GO!'; c.classList.add('show');
      if (this.cd <= 0) { this.state = 'racing'; this.t = 0; setTimeout(() => c.classList.remove('show'), 600); }
      return;
    }
    const p = this.boatWorld(), lake = this.L.lake;
    if (Math.hypot(p.x - lake.x, p.z - lake.z) > lake.r - .3) return this.cancel('Lake Run cancelled: you left the lake');
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
      if (pb) { const d = this.t + this.pen - pb; this.flashSplit(`${d <= 0 ? '−' : '+'}${Math.abs(d).toFixed(1)}`, d <= 0); }
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
    this.flashSplit(`+${s} s ${kind === 'log' ? 'log' : 'bump'}`, false); this.renderHud();
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
    this.state = 'result'; this.ui.hud.classList.remove('show'); if (this.ghost) this.ghost.visible = false; this.highlight();
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
    r.querySelector('.lr-big').textContent = fmt(total);
    const m = r.querySelector('.lr-medal'); m.className = `lr-medal ${medal || 'none'}`;
    m.textContent = medal ? `${medal[0].toUpperCase()}${medal.slice(1)}` : `No medal (bronze ${fmt(M[2])})`;
    const pen = this.pen ? ` · penalties +${this.pen} s` : '';
    r.querySelector('.lr-info').textContent = pb ? (prev ? `New personal best (−${(prev - total).toFixed(1)} s)${pen}` : `First time on the board${pen}`) : `Personal best ${fmt(this.p.best)}${pen}`;
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
    if (!this.p.best) return { title: 'Race the Lake Run', copy: 'Row to the buoys off Sigurd\'s dock and start the run.' };
    return { title: 'Win Lake Run gold', copy: `Your best is ${fmt(this.p.best)}. Gold is under ${fmt(LAKE_RUN.medals[0])}.` };
  }

  // DEV: put the (rented) boat at the start buoys, facing the first buoy.
  devToStart() {
    const f = this.f; if (!f.boat.object) return false;
    if (f.mode !== 'boat') { if (!f.hasBoatAccess()) f.setBoatAccess({ rented: true }); this.g.devMenu?.teleport?.('world', f.boatBerthPoint.x, f.boatBerthPoint.z, 0); f.boardBoat(); }
    const B = f.boat, s = f.boatWorldToLocal(new V3(LAKE_RUN.start.x, B.homePos.y, LAKE_RUN.start.z)), g1 = f.boatWorldToLocal(new V3(this.seq[0].x, B.homePos.y, this.seq[0].z));
    B.pos.x = s.x; B.pos.z = s.z; B.yaw = Math.atan2(-(g1.z - s.z), g1.x - s.x); B.v = B.w = 0; B.tgt = null; B.left = true;
    return true;
  }
}
