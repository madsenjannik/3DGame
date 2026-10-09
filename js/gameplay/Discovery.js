// @ts-nocheck
// R154 (open GO 09/10, design review): help the player find what the new economy asks for, without new art.
// - the first Golden Seed ever explains itself (gold toast: feed it to the tree in the Orangery), once per save
// - while you hold a Golden Seed the world map marks the Orangery tree
// - a boss you have come within 35 m of stays on the map (the Seeds tab says 'Defeat the Root Bear'; now you can find it)
// State: profile.seen { golden, giant, bear } on the shared save. Map data only: WorldMap itself is untouched. Fails soft.
const SEEN_R = 35;
export class Discovery {
  constructor(game) { this.g = game; this.t = 0; }
  get seen() { const p = this.g.save?.profile; return p ? (p.seen ||= {}) : {}; }
  sites() {
    const g = this.g, out = [], b = g.combat?.boss?.site, grove = g.world?.sharedLandscape?.bearGrove;
    if (b && Number.isFinite(b.x)) out.push({ id: 'giant', x: b.x, z: b.z, label: 'Wood Giant' });
    if (grove && g.combat?.bear) out.push({ id: 'bear', x: grove.x, z: grove.z, label: 'Root Bear' });
    return out;
  }
  update(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 1;
    const g = this.g, s = this.seen, inv = g.state?.inventory; if (!g.save?.profile || !inv) return;
    if (!s.golden && (inv.get('golden_seed') || 0) > 0) { s.golden = true; g.save.persist(); g.hud?.showToast?.('Golden Seed! Feed it to the community tree in the Orangery', { milestone: true }); }
    const c = g.character?.position; if (!c || g.world?.space === 'garden') return;
    for (const x of this.sites()) if (!s[x.id] && Math.hypot(c.x - x.x, c.z - x.z) < SEEN_R) { s[x.id] = true; g.save.persist(); }
  }
  markers() {
    const g = this.g, s = this.seen, out = [];
    try { const o = g.orangery; if (o?.ready && (g.state.inventory.get('golden_seed') || 0) > 0 && (g.orangeryTree?.t.stage ?? 0) < (g.orangeryTree?.max?.() ?? 10)) out.push({ type: 'quest', x: o.root.position.x, z: o.root.position.z, label: 'Tree' }); } catch {}
    for (const x of this.sites()) if (s[x.id]) out.push({ type: 'boss', x: x.x, z: x.z, label: x.label });
    return out;
  }
}
