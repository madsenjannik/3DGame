// @ts-nocheck
// R60 GardenBuildSystem data: the private garden as owned plots on one fixed global placement grid.
// Plot ownership -> placement cells -> placed structure transform -> gameplay systems.
// Pure data; GardenBuildSystem interprets it. All lengths in metres, garden space (ground y = 0).

// Fixed forever: cell (gx, gz) has its corner at GRID_ORIGIN + (gx, gz) * CELL. Plots and saved
// placements use these global integers (negative values are fine), so buying a plot never moves anything.
export const CELL = 0.5;
export const GRID_ORIGIN = { x: -12.5, z: -14.0 };

// Owned plots are unions of cell rectangles [gx0, gz0, gx1, gz1) (end exclusive). 'home' is the area
// inside the current fence (x -12.5..12.5, z -14.0..12.0). Future plots are added here with a cost and
// unlocked by adding their id to profile.garden.plots.
export const PLOTS = {
  home: { name: 'Home garden', rects: [[0, 0, 50, 52]] }
};
export const START_PLOTS = ['home'];

// Fixed, never buildable (house, gate approach, pond, the locked seed-choice story spots).
// Garden trees are added at runtime from GardenEnvironment.treeDefs (they block placement in v1).
export const RESERVED = [
  { id: 'house',     kind: 'rect',    x0: -2.5, z0: 2.0, x1: 2.5, z1: 8.0 },      // home + door apron
  { id: 'gate-path', kind: 'rect',    x0: -1.5, z0: 8.0, x1: 1.5, z1: 12.0 },     // gate -> door corridor
  { id: 'pond',      kind: 'ellipse', x: -3.85, z: -1.6, rx: 2.15, rz: 2.85 },     // basin + shore
  { id: 'your-plot', kind: 'circle',  x: -9.35, z: -5.15, r: 1.0 },
  { id: 'community', kind: 'circle',  x: -5.05, z: -5.9, r: 1.0 },
  { id: 'golden-seed', kind: 'circle', x: -7.3, z: -4.9, r: 0.9 }
];
// Thorn-hedge segments (home level 3) stand at fixed spots along the fence; structures keep clear of them.
// Each is [x, z]; segments on the side fences (|x| > 11) run along z, the back ones along x (≈2 m × 0.55 m).
export const FIXED_HEDGE = [[-11.3, -9.5], [-11.3, -5.5], [-11.3, -1.5], [-11.3, 2.5], [-11.3, 6.0], [11.3, -5.0], [11.3, -1.0], [11.3, 3.0], [-7.5, -12.9], [-3.0, -12.9]];
for (const [x, z] of FIXED_HEDGE) {
  const along = Math.abs(x) > 11, hl = 1.0, hd = .3;
  RESERVED.push({ id: 'hedge', kind: 'rect', x0: x - (along ? hd : hl), z0: z - (along ? hl : hd), x1: x + (along ? hd : hl), z1: z + (along ? hl : hd) });
}

// R60.2 garden paths. The spine (gate → house → back of the garden) is fixed and never buildable.
// The greenhouse branch runs from the spine to the greenhouse door and follows the placed greenhouse;
// on its default spot it is the authored branch. Other structures keep clear of the branch.
export const SPINE = { z0: -8.9, z1: 12.0, halfWidth: .85 };
export const spineX = z => Math.sin((10.8 - z) * .34) * .52;       // = GardenEnvironment.pathX
export const SPINE_START_EXCLUDE = { z0: 1.6, z1: 8.4 };              // no branch may start inside the house
export const DEFAULT_BRANCH = [{ x: .05, z: -8.82 }, { x: 5.95, z: -8.82 }];
export const BRANCH = { doorGap: 2.9, clear: .6, structureClear: .7 }; // door-front point (greenhouse-local z), widths

// Reachability is checked from the gate; these must stay reachable too (watering-can refill, door).
export const GATE = { x: 0.2, z: 11.75 };
export const MUST_REACH = [{ id: 'door', x: 0, z: 8.25 }, { id: 'pond-shore', x: -3.85, z: 1.5 }];

// Movable structures. Everything is in the structure's local frame (+z = front), relative to its
// exact transform: footprint/access rects [x0, z0, x1, z1], interaction point + radius (or null).
// defaultAnchor = global cell + quarter-turn rotation; localOffset = authored offset from that cell
// corner, so the default transform is exactly the hand-placed position from before R60.
export const STRUCTURES = {
  greenhouse: {
    name: 'Greenhouse',
    footprint: [-3.0, -2.5, 3.0, 2.52],          // always the full L3 size, so upgrading never collides
    access: [[-1.0, 2.52, 1.0, 3.6]],             // in front of the door
    interact: { x: 0, z: 3.22, r: 1.9 },          // L3 point; the greenhouse system keeps its per-level point
    defaultAnchor: { gx: 38, gz: 6, rot: 0 }, localOffset: { x: 0, z: -0.2 }   // = (6.5, -11.2)
  },
  workshop: {
    name: 'Workshop',
    footprint: [-1.5, -1.2, 1.5, 0.8],
    access: [[-1.0, 0.8, 1.0, 1.8]],
    interact: { x: 0, z: 0, r: 1.9 },
    defaultAnchor: { gx: 37, gz: 43, rot: 3 }, localOffset: { x: 0.1, z: 0 }   // = (6.0, 7.6), front faces -x
  },
  rain: {
    name: 'Rain barrel & compost',
    footprint: [-1.5, -0.5, 0.5, 0.5],
    access: [],                                    // future: tap / compost interaction
    interact: null,
    defaultAnchor: { gx: 12, gz: 30, rot: 0 }, localOffset: { x: -0.1, z: -0.2 } // = (-6.6, 0.8)
  },
  shrine: {
    name: 'Perk Shrine',
    footprint: [-1.5, -1.5, 1.5, 1.5],            // shrine + ceremonial clearing
    access: [],
    interact: null,
    defaultAnchor: { gx: 7, gz: 34, rot: 0 }, localOffset: { x: -0.2, z: -0.2 } // = (-9.2, 2.8)
  }
};
