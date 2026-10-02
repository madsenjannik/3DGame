// Garden transform snapshot (R60). Used by tests/smoke.mjs to prove the GardenBuildSystem migration
// changes nothing in the private garden: every placed structure, collider, interaction point,
// camera wall, pot slot and weed must land on exactly the same numbers as the reference snapshot.
export const SNAPSHOT_SAVE = {
  version: 3,
  profiles: { fern: {
    inventory: { wood: 40, stone: 40, clay: 40, fiber: 40, amber: 10, shell: 10, golden_seed: 2, wild_seed: 3 },
    tools: { axe: true, can: true, pickaxe: true, sickle: true }, homeLevel: 3,
    pots: { count: 3, slots: [{ stage: 1, wet: true, readyAt: 9e12 }, null, { stage: 3, wet: false, readyAt: 0 }] }, water: 2,
    perks: { swift: true },
    threat: { started: 1, lastSpawn: 9e12, lastSnail: 9e12, weeds: [{ id: 'w-a', spot: 0, bornAt: 1 }, { id: 'w-b', spot: 5, bornAt: 1 }, { id: 'w-c', spot: 11, bornAt: 9e12 }] }
  } }
};

// Runs in the page (window.__tgw). Returns plain numbers rounded to 1e-4.
export function collectGardenSnapshot() {
  const g = window.__tgw, w = g.wilds, gh = g.greenhouse, r = v => Math.round(v * 1e4) / 1e4;
  const tr = o => o ? [r(o.position.x), r(o.position.y), r(o.position.z), r(o.rotation.x), r(o.rotation.y), r(o.rotation.z), r(o.scale.x)] : null;
  const wtr = o => { if (!o) return null; o.updateMatrixWorld(true); return o.matrixWorld.elements.map(r); };
  const out = {};
  out.greenhouseRoots = [...gh.entries.values()].map(e => tr(e.root));
  out.greenhouseInteraction = [0, 1, 2, 3].map(l => { const p = gh.interactionPoint(l); return [r(p.x), r(p.z)]; });
  out.greenhouseCollision = JSON.parse(JSON.stringify(g.world.greenhouseCollision, (k, v) => typeof v === 'number' ? r(v) : v));
  const rays = [[[6.5, 1, -6], [6.5, 2, -14]], [[2, 1, -11], [11, 2, -11]], [[4, 1, -9], [9, 2, -13]]];
  out.cameraWalls = rays.map(([a, b]) => r(gh.cameraOcclusionDistance({ x: a[0], y: a[1], z: a[2] }, { x: b[0], y: b[1], z: b[2] }, 10)));
  out.potSlots = [1, 2, 3].map(l => { const keep = gh.level; gh.level = l; w.pots.level = -1; w.pots.placeForLevel(); const s = w.pots.slots.map(v => tr(v.g)); gh.level = keep; w.pots.level = -1; w.pots.placeForLevel(); return s; });
  out.workbench = wtr(w.workbench.root); out.benchModel = wtr(w.benchModel?.root);
  out.rainGroup = wtr(w.upgradeL1); out.rainModel = wtr(w.barrelModel?.root);
  out.shrineGroup = wtr(w.upgradeL2); out.shrineModel = wtr(w.shrineModel?.root);
  out.hedge = (w.hedgeModels || []).map(m => wtr(m.root));
  out.colliders = g.world.colliders.filter(c => (c.space || 'garden') === 'garden').map(c => [c.kind, r(c.x), r(c.z), r(c.r)]);
  out.homeProps = w.homeProps().map(p => [r(p.x), r(p.z), r(p.r)]);
  out.spots = w.threat.spots.map(s => [r(s.x), r(s.z)]);
  out.weeds = w.threat.weeds.map(x => [x.rec.id, r(x.x), r(x.z), r(x.root.position.x), r(x.root.position.z), r(x.root.rotation.y)]);
  return out;
}
