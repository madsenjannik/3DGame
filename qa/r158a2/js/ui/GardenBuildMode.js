// @ts-nocheck
// R60 step 2: Build / Move mode for private-garden structures (GardenBuildSystem).
// Walk-to-move: the selected structure becomes a see-through ghost that floats in front of you and
// snaps to the 0.5 m grid. Rotate, then Place (only when valid) or Cancel (nothing changes).
// Green = valid, red = blocked (the reason is shown). The grid itself only shows as a faint field
// under the ghost while this mode is open, never in normal play.
import * as THREE from 'three';
import { CELL, GRID_ORIGIN, STRUCTURES } from '../data/gardenCatalog.js';

const OK = 0x8ee59a, BAD = 0xff6b5c, ACCESS_OK = 0xbfe8ff;
const MAX_CELLS = 400;

export class GardenBuildMode {
  constructor({ game }) {
    this.g = game; this.active = false; this.id = null;
    this.matOk = new THREE.MeshBasicMaterial({ color: OK, transparent: true, opacity: .42, depthWrite: false });
    this.matBad = new THREE.MeshBasicMaterial({ color: BAD, transparent: true, opacity: .42, depthWrite: false });
    const tile = new THREE.PlaneGeometry(CELL * .86, CELL * .86).rotateX(-Math.PI / 2);
    this.cells = new THREE.InstancedMesh(tile, new THREE.MeshBasicMaterial({ transparent: true, opacity: .32, depthWrite: false, vertexColors: false }), MAX_CELLS);
    this.cells.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_CELLS * 3), 3);
    this.cells.frustumCulled = false; this.cells.renderOrder = 3;
    this.root = new THREE.Group(); this.root.name = 'WILDS_BUILD_GHOST'; this.root.visible = false; this.root.add(this.cells);
    game.world.privateRoot.add(this.root);
    this.buildUi();
    addEventListener('keydown', e => {
      if (!this.active) return;
      if (e.key === 'r' || e.key === 'R') { this.rotate(); e.preventDefault(); }
      else if (e.key === 'Enter') { this.confirm(); e.preventDefault(); }
      else if (e.key === 'Escape') { this.cancel(); e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
  }

  buildUi() {
    const el = document.createElement('div'); el.className = 'build-bar'; el.setAttribute('role', 'toolbar'); el.setAttribute('aria-label', 'Move building');
    el.innerHTML = `<div class="build-info"><small>MOVE · WALK TO PLACE</small><b class="build-name"></b><span class="build-why"></span></div>
      <div class="build-buttons"><button type="button" data-b="rotate" aria-label="Rotate">⟳ Rotate</button><button type="button" data-b="place" class="build-place">✓ Place</button><button type="button" data-b="cancel" class="build-cancel">✕ Cancel</button></div>`;
    for (const t of ['pointerdown', 'pointermove', 'pointerup']) el.addEventListener(t, e => e.stopPropagation());
    el.addEventListener('click', e => { const b = e.target.closest('[data-b]')?.dataset.b; if (b === 'rotate') this.rotate(); else if (b === 'place') this.confirm(); else if (b === 'cancel') this.cancel(); });
    document.body.appendChild(el); this.el = el; this.nameEl = el.querySelector('.build-name'); this.whyEl = el.querySelector('.build-why'); this.placeBtn = el.querySelector('.build-place');
  }

  // The live object that represents a structure (used for the ghost clone and dimming).
  source(id) {
    const g = this.g, w = g.wilds;
    if (id === 'greenhouse') { const gh = g.greenhouse; return gh?.entries.get(Math.max(1, gh.level)).root || null; }
    if (id === 'workshop') return w.workbench?.root || null;
    if (id === 'rain') return w.upgradeL1 || null;
    if (id === 'shrine') return w.upgradeL2 || null;
    return null;
  }

  start(id) {
    const g = this.g, gb = g.garden;
    if (this.active || !gb?.get(id) || !g.world.isGardenSpace()) return false;
    const src = this.source(id); if (!src) { g.hud?.showToast('That building is still loading'); return false; }
    this.active = true; this.id = id; this.type = gb.get(id).type; this.rot = gb.get(id).rot;
    this.ghost = src.clone(true); this.ghost.visible = true;
    this.ghost.traverse(o => { o.visible = true; if (o.isSprite || o.isLight) o.visible = false; if (o.isMesh) { o.material = this.matOk; o.castShadow = false; o.receiveShadow = false; } });
    this.ghost.position.set(0, 0, 0); this.ghost.rotation.set(0, 0, 0);
    this.root.add(this.ghost); this.root.visible = true;
    this.nameEl.textContent = STRUCTURES[this.type].name; this.el.classList.add('open'); document.body.classList.add('build-mode');
    this.snap = null; this.smooth = null; g.input?.resetTouchPointers?.();
    return true;
  }

  rotate() { if (this.active) { this.rot = (this.rot + 1) & 3; this.snap = null; } }

  stop() {
    this.active = false; this.root.visible = false; if (this.ghost) this.root.remove(this.ghost); this.ghost = null;
    this.el.classList.remove('open'); document.body.classList.remove('build-mode');
  }
  cancel() { if (this.active) { this.stop(); this.g.hud?.showToast('Nothing moved'); } }

  confirm() {
    if (!this.active || !this.snap) return false;
    if (this.snap.why) { this.g.hud?.showToast(this.snap.why); return false; }
    const why = this.g.garden.place(this.id, this.snap.gx, this.snap.gz, this.snap.rot);
    if (why) { this.g.hud?.showToast(why); return false; }
    this.stop(); this.g.hud?.showToast(`${STRUCTURES[this.type].name} moved`);
    return true;
  }

  // Desired spot: in front of the player, far enough that the footprint clears you.
  update(dt, character) {
    if (!this.active) return;
    const g = this.g, gb = g.garden;
    if (!g.world.isGardenSpace()) { this.stop(); return; }
    const [x0, z0, x1, z1] = STRUCTURES[this.type].footprint, reach = Math.max(Math.abs(x0), Math.abs(x1), Math.abs(z0), Math.abs(z1)) + .9;
    const h = character.heading, tx = character.position.x + Math.sin(h) * reach, tz = character.position.z + Math.cos(h) * reach;
    const a = gb.anchorFor(this.type, tx, tz, this.rot);
    if (!this.snap || a.gx !== this.snap.gx || a.gz !== this.snap.gz || a.rot !== this.snap.rot) {
      let why = gb.problem(this.type, a.gx, a.gz, a.rot, this.id);
      const r = gb.footprintRect(this.id, .3, a.gx, a.gz, a.rot), p = character.position;
      if (!why && p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1) why = 'step back a little';
      this.snap = { ...a, why }; this.drawCells();
      this.ghost.traverse(o => { if (o.isMesh) o.material = why ? this.matBad : this.matOk; });
      this.whyEl.textContent = why ? `Blocked: ${why}` : 'Looks good';
      this.placeBtn.disabled = !!why; this.el.classList.toggle('bad', !!why);
    }
    // Ghost glides to the snapped transform (the grid is the truth; the glide only smooths the motion).
    const t = this.transformFor(this.snap);
    this.smooth ||= { x: t.x, z: t.z };
    const k = 1 - Math.exp(-dt * 14); this.smooth.x += (t.x - this.smooth.x) * k; this.smooth.z += (t.z - this.smooth.z) * k;
    this.ghost.position.set(this.smooth.x, .02, this.smooth.z); this.ghost.rotation.y = t.yaw;
  }

  transformFor(s) {
    const def = STRUCTURES[this.type], o = def.localOffset, SC = [[0, 1], [1, 0], [0, -1], [-1, 0]], [sn, c] = SC[s.rot & 3];
    const cx = GRID_ORIGIN.x + s.gx * CELL, cz = GRID_ORIGIN.z + s.gz * CELL, a = (s.rot & 3) * Math.PI / 2;
    return { x: cx + o.x * c + o.z * sn, z: cz - o.x * sn + o.z * c, yaw: a > Math.PI ? a - 2 * Math.PI : a };
  }

  drawCells() {
    const gb = this.g.garden, s = this.snap, def = STRUCTURES[this.type], m = new THREE.Matrix4(), col = new THREE.Color();
    const body = gb.cellsFor(this.type, s.gx, s.gz, s.rot, [def.footprint]), access = gb.cellsFor(this.type, s.gx, s.gz, s.rot, def.access);
    let n = 0;
    for (const [list, color] of [[body, s.why ? BAD : OK], [access, s.why ? BAD : ACCESS_OK]]) for (const [i, k] of list) {
      if (n >= MAX_CELLS) break; const c = gb.cellCenter(i, k);
      m.makeTranslation(c.x, .035, c.z); this.cells.setMatrixAt(n, m); this.cells.setColorAt(n, col.setHex(color)); n++;
    }
    this.cells.count = n; this.cells.instanceMatrix.needsUpdate = true; this.cells.instanceColor.needsUpdate = true;
  }
}
