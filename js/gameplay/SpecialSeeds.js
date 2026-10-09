// @ts-nocheck
// R149 (GO 09/10, Jannik's economy doc): Special Seeds unlock characters. Once a goal is met and the character is still
// locked, its seed lands in the Bag ('Tulip Seed!'). Planting it at the Sprouting Ring grows the character's sprout
// (Pop_<id>) and opens it in the selector. State: profile.specialSeeds { id: 1 = in the Bag, 2 = planted } on the
// shared save; the unlock itself is save.data.unlocked. Checked once a second, so goals reached earlier count too.
import { SPECIAL_SEEDS } from '../data/economyCatalog.js?build=SAVE-R154-20261009A';

export class SpecialSeeds {
  constructor(game) { this.g = game; this.t = 0; }
  get s() { const p = this.g.save?.profile; return p ? (p.specialSeeds ||= {}) : {}; }
  def(id) { return SPECIAL_SEEDS.find(d => d.id === id); }
  inBag() { const s = this.s; return SPECIAL_SEEDS.filter(d => s[d.id] === 1); }
  // R152: every Special Seed with its state for the workbench Seeds tab: 'open' (grown or played before) | 'bag' | 'locked'
  journal() { const s = this.s, sv = this.g.save; return SPECIAL_SEEDS.map(d => ({ ...d, state: s[d.id] === 2 || sv?.isUnlocked?.(d.id) ? 'open' : s[d.id] === 1 ? 'bag' : 'locked' })); }
  update(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 1;
    const sv = this.g.save, p = sv?.profile; if (!p) return;
    const me = this.g.state?.player?.characterId;   // R153: never the seed of the character you are playing (DEV menu play)
    for (const d of SPECIAL_SEEDS) if (d.id !== me && !this.s[d.id] && !sv.isUnlocked(d.id) && d.met(p, this.g)) this.earn(d.id);
  }
  earn(id) {
    const d = this.def(id); if (!d || this.s[id]) return false;
    this.s[id] = 1; this.g.save.persist();
    this.g.hud?.showToast?.(`${d.name}! Plant it at the Sprouting Ring in your garden`, { milestone: true }); this.g.refreshHotbar?.(true);
    return true;
  }
  // plants the first seed in the Bag; returns its def (the Ring plays Pop_<id>)
  plant() {
    const d = this.inBag()[0]; if (!d) return null;
    this.s[d.id] = 2; this.g.save.unlock(d.id); this.g.save.persist(); this.g.refreshHotbar?.(true);
    return d;
  }
}
