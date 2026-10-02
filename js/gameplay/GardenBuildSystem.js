// @ts-nocheck
// R60 GardenBuildSystem (step 1: architecture, no build-mode UI yet).
// Plot ownership -> placement cells -> placed structure transform -> gameplay systems.
// Gameplay asks this system where a structure is (transformOf / toWorld); nothing in the private
// garden keeps its own hard-coded x/z for movable structures any more. Placements are saved per
// character in profile.garden as { id, type, gx, gz, rot } (rot = quarter turns 0..3).
import { CELL, GRID_ORIGIN, PLOTS, START_PLOTS, RESERVED, GATE, MUST_REACH, STRUCTURES } from '../data/gardenCatalog.js';

const HALF_PI = Math.PI / 2;
// Quarter-turn yaw in (-PI, PI] so rotation 3 is exactly -PI/2 (the pre-R60 workbench yaw).
export const yawOf = rot => { const a = (rot & 3) * HALF_PI; return a > Math.PI ? a - 2 * Math.PI : a; };
// Exact quarter-turn sin/cos (no 6e-17 noise from Math.cos(PI/2)).
const SC = [[0, 1], [1, 0], [0, -1], [-1, 0]];

export class GardenBuildSystem {
  constructor({ profile, world }) {
    this.world = world;
    this.p = profile;
    this.listeners = new Set();
    this.migrate();
    this.trees = (world?.treeDefs || []).map(t => ({ x: t.x, z: t.z, r: .5 * (t.s || 1) + .3 }));
    // A stored placement that no longer validates (bad data, catalog change) falls back to its default.
    for (const b of this.p.garden.buildings) {
      if (!this.isValid(b.type, b.gx, b.gz, b.rot, b.id)) { const d = STRUCTURES[b.type].defaultAnchor; Object.assign(b, { gx: d.gx, gz: d.gz, rot: d.rot }); }
    }
  }

  // ---------- save ----------
  // profile.garden is additive (save v3): missing → the exact pre-R60 layout from the catalog defaults.
  migrate() {
    const g = this.p.garden ||= { version: 1, plots: [...START_PLOTS], buildings: [] };
    if (!Array.isArray(g.plots) || !g.plots.length) g.plots = [...START_PLOTS];
    g.plots = g.plots.filter(id => PLOTS[id]);
    for (const [type, def] of Object.entries(STRUCTURES)) {
      if (!g.buildings.some(b => b.type === type)) g.buildings.push({ id: type, type, gx: def.defaultAnchor.gx, gz: def.defaultAnchor.gz, rot: def.defaultAnchor.rot });
    }
    g.buildings = g.buildings.filter(b => STRUCTURES[b.type]);
  }

  // ---------- transforms ----------
  get(id) { return this.p.garden.buildings.find(b => b.id === id) || null; }
  // World transform of a structure: cell corner + rotated authored offset, quarter-turn yaw.
  transformOf(id) {
    const b = this.get(id); if (!b) return null;
    const def = STRUCTURES[b.type], [s, c] = SC[b.rot & 3];
    const cx = GRID_ORIGIN.x + b.gx * CELL, cz = GRID_ORIGIN.z + b.gz * CELL, o = def.localOffset;
    return { x: cx + o.x * c + o.z * s, z: cz - o.x * s + o.z * c, rot: b.rot & 3, yaw: yawOf(b.rot) };
  }
  // Structure-local point (+z = front) to world, matching THREE's rotation.y convention.
  toWorld(id, lx, lz) {
    const t = this.transformOf(id); if (!t) return null;
    const [s, c] = SC[t.rot];
    return { x: t.x + lx * c + lz * s, z: t.z - lx * s + lz * c };
  }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  // ---------- cells ----------
  cellCenter(gx, gz) { return { x: GRID_ORIGIN.x + (gx + .5) * CELL, z: GRID_ORIGIN.z + (gz + .5) * CELL }; }
  owned(gx, gz) {
    for (const id of this.p.garden.plots) for (const [x0, z0, x1, z1] of PLOTS[id].rects) if (gx >= x0 && gx < x1 && gz >= z0 && gz < z1) return true;
    return false;
  }
  reserved(x, z) {
    for (const r of RESERVED) {
      if (r.kind === 'rect' && x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return r.id;
      if (r.kind === 'circle' && Math.hypot(x - r.x, z - r.z) < r.r) return r.id;
      if (r.kind === 'ellipse' && Math.hypot((x - r.x) / r.rx, (z - r.z) / r.rz) < 1) return r.id;
    }
    for (const t of this.trees) if (Math.hypot(x - t.x, z - t.z) < t.r) return 'tree';
    return null;
  }
  // Cells whose centres fall inside local rects of a structure placed at (gx, gz, rot).
  cellsFor(type, gx, gz, rot, rects) {
    const def = STRUCTURES[type], [s, c] = SC[rot & 3], cells = [];
    const cx = GRID_ORIGIN.x + gx * CELL, cz = GRID_ORIGIN.z + gz * CELL, o = def.localOffset;
    const tx = cx + o.x * c + o.z * s, tz = cz - o.x * s + o.z * c;
    for (const [x0, z0, x1, z1] of rects) {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const [lx, lz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
        const wx = tx + lx * c + lz * s, wz = tz - lx * s + lz * c;
        minX = Math.min(minX, wx); maxX = Math.max(maxX, wx); minZ = Math.min(minZ, wz); maxZ = Math.max(maxZ, wz);
      }
      for (let i = Math.floor((minX - GRID_ORIGIN.x) / CELL); i <= Math.ceil((maxX - GRID_ORIGIN.x) / CELL); i++)
        for (let k = Math.floor((minZ - GRID_ORIGIN.z) / CELL); k <= Math.ceil((maxZ - GRID_ORIGIN.z) / CELL); k++) {
          const p = this.cellCenter(i, k);
          if (p.x > minX && p.x < maxX && p.z > minZ && p.z < maxZ) cells.push([i, k]);
        }
    }
    return cells;
  }
  footprintCells(id) { const b = this.get(id); return b ? this.cellsFor(b.type, b.gx, b.gz, b.rot, [STRUCTURES[b.type].footprint]) : []; }

  // ---------- validation ----------
  // Why a placement is invalid (null = valid). ignoreId lets a structure be re-validated / moved.
  problem(type, gx, gz, rot, ignoreId = type) {
    const def = STRUCTURES[type]; if (!def) return 'unknown structure';
    const body = this.cellsFor(type, gx, gz, rot, [def.footprint]), access = this.cellsFor(type, gx, gz, rot, def.access);
    const key = (i, k) => `${i},${k}`, others = new Set();
    for (const b of this.p.garden.buildings) if (b.id !== ignoreId) for (const [i, k] of this.cellsFor(b.type, b.gx, b.gz, b.rot, [STRUCTURES[b.type].footprint])) others.add(key(i, k));
    for (const [i, k] of body) {
      if (!this.owned(i, k)) return 'outside your garden';
      const c = this.cellCenter(i, k), r = this.reserved(c.x, c.z); if (r) return `blocked by ${r}`;
      if (others.has(key(i, k))) return 'overlaps another structure';
    }
    for (const [i, k] of access) {
      if (!this.owned(i, k) || others.has(key(i, k))) return 'entrance is blocked';
      const c = this.cellCenter(i, k), r = this.reserved(c.x, c.z); if (r && r !== 'gate-path') return 'entrance is blocked';
    }
    // Nothing may be walled in: every entrance, the door and the pond shore stay reachable from the gate.
    const blocked = new Set(others); for (const [i, k] of body) blocked.add(key(i, k));
    const walk = (i, k) => {
      if (!this.owned(i, k) || blocked.has(key(i, k))) return false;
      const c = this.cellCenter(i, k), r = this.reserved(c.x, c.z);
      return !r || r === 'gate-path' || r === 'your-plot' || r === 'community' || r === 'golden-seed';
    };
    const seen = new Set(), start = this.cellOf(GATE.x, GATE.z), queue = [start]; seen.add(key(...start));
    while (queue.length) {
      const [i, k] = queue.pop();
      for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nk = k + dk, nkey = key(ni, nk);
        if (seen.has(nkey) || !walk(ni, nk)) continue; seen.add(nkey); queue.push([ni, nk]);
      }
    }
    const targets = [...MUST_REACH.map(m => this.cellOf(m.x, m.z))];
    for (const b of this.p.garden.buildings) if (b.id !== ignoreId) for (const c of this.cellsFor(b.type, b.gx, b.gz, b.rot, STRUCTURES[b.type].access)) targets.push(c);
    targets.push(...access);
    for (const t of targets) if (!seen.has(key(...t))) return 'would block the way from the gate';
    return null;
  }
  isValid(type, gx, gz, rot, ignoreId = type) { return !this.problem(type, gx, gz, rot, ignoreId); }
  cellOf(x, z) { return [Math.floor((x - GRID_ORIGIN.x) / CELL), Math.floor((z - GRID_ORIGIN.z) / CELL)]; }
}
