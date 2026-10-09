// @ts-nocheck
// R150 (GO 09/10, Jannik: Golden Seeds go to community things, the tree in the big Orangery, fed from stage 0 as a
// long-term goal). The tree in the Orangery starts as soil and grows one stage each time it has been fed enough
// Golden Seeds (economyCatalog.TREE_COSTS). E at the tree feeds one seed. State: profile.tree { stage, fed } on the
// shared save; until there is a server it is your own tree on this device. Uses OrangeryHubSystem.setStage (its
// collision rebuild and lantern shatter at stage 6 come with it). DEV ?treeStage still wins. Fails soft.
import { TREE_COSTS } from '../data/economyCatalog.js?build=SAVE-R151-20261009A';

const NEAR = 3.2;
export class OrangeryTree {
  constructor(game) { this.g = game; this.applied = false; }
  get t() { const p = this.g.save?.profile; if (!p) return { stage: 0, fed: 0 }; const t = p.tree ||= { stage: 0, fed: 0 }; return t; }
  max() { return TREE_COSTS.length; }
  need() { return TREE_COSTS[this.t.stage] ?? 0; }
  update() {
    const o = this.g.orangery; if (this.applied || !o?.ready) return; this.applied = true;
    if (/[?&]treeStage=/.test(location.search) && /[?&]dev=1/.test(location.search)) return;   // DEV preview stays as asked
    if (o.stage !== this.t.stage) o.setStage(this.t.stage, { playShatter: false });
  }
  interaction(pos) {
    const o = this.g.orangery; if (!o?.ready || !pos || this.g.world?.space === 'garden') return null;
    const d = Math.hypot(pos.x - o.root.position.x, pos.z - o.root.position.z); if (d > NEAR) return null;
    const t = this.t; if (t.stage >= this.max()) return { type: 'orangery-feed', label: 'The tree is fully grown', distance: d, disabled: true };
    const seeds = this.g.state.inventory.get('golden_seed') || 0, prog = `${t.fed}/${this.need()}`;
    if (seeds < 1) return { type: 'orangery-feed', label: 'Locked', distance: d, disabled: true, locked: true, reason: `Feed the tree a Golden Seed (${prog} to the next stage)` };
    return { type: 'orangery-feed', label: `Feed the tree · ${prog}`, distance: d };
  }
  feed() {
    const t = this.t, W = this.g.wilds; if (t.stage >= this.max() || !W?.pay?.({ golden_seed: 1 })) return false;
    t.fed++; let grew = false;
    if (t.fed >= this.need()) { t.stage++; t.fed = 0; grew = true; this.g.orangery?.setStage(t.stage, { playShatter: true }); }
    this.g.save.persist();
    const name = this.g.orangery?.manifest?.stages?.[t.stage]?.name;
    this.g.hud?.showToast?.(grew ? `The tree grows · stage ${t.stage}${name ? ' · ' + name : ''}` : `The tree drinks the seed · ${t.fed}/${this.need()}`);
    return true;
  }
}
