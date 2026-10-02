// @ts-nocheck
// R56 central interaction resolver. Every system offers candidates; exactly one becomes the active
// interaction (E / action button). Higher priority wins; ties go to the nearer candidate.
// The priorities encode the established precedence (locked systems over the wilds loop).
export const PRIORITY = {
  combat: 70,      // R61: strike a Mole / pick up your wilt pouch (a fight beats everything nearby)
  lakerun: 65,     // R64: 'Start Lake Run' at the start buoys beats 'Fish' there (Dock is ~6 m away)
  fishing: 60,     // FishingV1 incl. boat board/dock
  stable: 50,      // Stable doors, Thora, RIDE/JUMP
  home: 45,        // shed door / back to the world
  greenhouse: 35,  // build / upgrade greenhouse
  'first-seed': 30,// first Golden Seed
  wilds: 10        // nodes, thornbrush, workbench, pots, weeds, snails
};

export class InteractionResolver {
  constructor() { this.list = []; this.last = null; }
  begin() { this.list.length = 0; }
  offer(source, interaction) {
    if (!interaction) return;
    this.list.push({ source, priority: PRIORITY[source] ?? 0, distance: Number.isFinite(interaction.distance) ? interaction.distance : 0, interaction });
  }
  resolve() {
    let best = null;
    for (const c of this.list) if (!best || c.priority > best.priority || (c.priority === best.priority && c.distance < best.distance)) best = c;
    this.last = best; return best ? best.interaction : null;
  }
  candidates() { return this.list.map(c => `${c.source}:${c.interaction.type}`); } // DEV inspection
}
