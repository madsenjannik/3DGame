// @ts-nocheck
// R58 Boat economy. Discover → requirement → rent → use → own:
//   Sigurd's boat needs 3 caught species + a Life Vest (he stitches it from Fiber + Snail Shell),
//   each trip is rented for a few materials, reaching the waterfall pays a daily reward, and after
//   enough waterfall trips Sigurd sells you the boat (no more rent).
// FishingV1 / Boat → Waterfall stay locked: this system only swaps a few methods on the live
// fishing instance (same pattern as ControlProfiles) and reads its public boat state.
// It also persists Sigurd's gear + catch log in the wilds save; before R58 they were memory-only.
import { BOAT, MATERIALS } from '../data/wildsCatalog.js';

const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const costText = cost => Object.entries(cost).map(([id, n]) => `${n} ${MATERIALS[id]?.name || id}`).join(', ');

export class BoatEconomySystem {
  constructor({ fishing, wilds, hud }) {
    this.f = fishing; this.w = wilds; this.hud = hud;
    this.p = wilds.profile; this.wasOn = false; this.wasFall = false; this.snap = ''; this.tick = 0;
  }

  init() {
    const f = this.f, fp = this.p.fishing;
    // Hydrate: the saved profile wins over the fresh in-memory fishing state.
    if (fp.starter) f.starter = true;
    Object.assign(f.own, fp.own); Object.assign(f.log, fp.log);
    if (this.p.boat.owned) f.setBoatAccess({ owned: true });
    f.renderAll?.();
    this.snap = this.key();
    const self = this, origOptions = f.dialogOptions.bind(f), origChoose = f.choose.bind(f);
    f.dialogOptions = function () {
      const o = origOptions(); if (!this.starter) return o;
      const i = o.findIndex(([k]) => k === 'boat'); if (i < 0) return o;
      o.splice(i, 1, ...self.options());
      return o;
    };
    f.choose = function (k) {
      if (this.mode === 'greet' && ['boat', 'vest', 'rent', 'buyboat'].includes(k)) return self.choose(k);
      return origChoose(k);
    };
    this.w.boatGoal = () => this.goal();
    return this;
  }

  species() { return this.f.speciesN(); }
  missing(cost) { const inv = this.w.inv(); return Object.entries(cost).filter(([id, n]) => (inv.get(id) || 0) < n); }
  canBuy() { return !this.p.boat.owned && this.p.boat.waterfall >= BOAT.buyAfterTrips; }

  options() {
    const f = this.f, b = this.p.boat, o = [];
    if (b.owned) return [['boat', 'About my boat…']];
    if (!f.own.vest) o.push(['vest', 'Could you make me a life vest?']);
    if (f.boat.rented) o.push(['boat', 'About the boat…']);
    else o.push(['rent', 'Can I take the boat out?']);
    if (this.canBuy()) o.push(['buyboat', 'Would you sell me the boat?']);
    return o;
  }

  choose(k) {
    const f = this.f, b = this.p.boat, say = (t, d = 5) => { f.say(t, d); f.markSigurdNod(); };
    if (k === 'boat') {
      if (b.owned) say(`Your boat is waiting at the dock. ${b.waterfall} trips to the waterfall so far.`, 4);
      else say('She is waiting at the dock. Bring her back in one piece.', 4);
      return;
    }
    if (k === 'vest') {
      if (f.own.vest) return say('You already have one. Wear it.', 3);
      const miss = this.missing(BOAT.vestCost);
      if (miss.length) return say(`I can stitch you one from ${costText(BOAT.vestCost)}. Bring me what is missing.`, 5.5);
      this.w.pay(BOAT.vestCost); f.own.vest = 1; f.renderAll?.(); f.renderDialog(); this.persist();
      this.hud?.showToast('Life Vest added');
      return say('There. Snail shell buttons, grass weave. It floats, I promise.', 5);
    }
    if (k === 'rent') {
      const n = this.species();
      if (n < BOAT.speciesNeeded || !f.own.vest) {
        const need = [];
        if (n < BOAT.speciesNeeded) need.push(`show me ${BOAT.speciesNeeded} different fish (${Math.min(n, BOAT.speciesNeeded)}/${BOAT.speciesNeeded})`);
        if (!f.own.vest) need.push('wear a life vest');
        return say(`Not yet. First ${need.join(' and ')}.`, 5.5);
      }
      if (this.missing(BOAT.rentCost).length) return say(`A trip costs ${costText(BOAT.rentCost)}. For the oars and the tar.`, 5);
      this.w.pay(BOAT.rentCost); f.setBoatAccess({ rented: true }); f.renderDialog();
      this.hud?.showToast(`Boat rented (−${costText(BOAT.rentCost)})`);
      return say('She is at the dock. Follow the stream to the waterfall, and tie her up when you are done.', 5.5);
    }
    if (k === 'buyboat') {
      if (!this.canBuy()) return say(`Take her to the waterfall a few more times first (${b.waterfall}/${BOAT.buyAfterTrips}).`, 4.5);
      if (this.missing(BOAT.buyCost).length) return say(`She is yours for ${costText(BOAT.buyCost)}.`, 6);
      this.w.pay(BOAT.buyCost); b.owned = true; f.setBoatAccess({ owned: true }); f.renderDialog(); this.persist();
      this.hud?.showToast('The boat is yours. No more rent.');
      return say('Take good care of her. She has more lakes in her than I do.', 5.5);
    }
  }

  // Polled from the frame loop (cheap): waterfall reward, trip end, catch-log persistence.
  update() {
    const f = this.f, B = f.boat, b = this.p.boat;
    if (B.on && B.reachedWaterfall && !this.wasFall) {
      b.waterfall++;
      const first = b.waterfall === 1, today = dayKey();
      const parts = [];
      if (first) for (const [id, n] of Object.entries(BOAT.firstWaterfall)) { this.w.give(id, n); parts.push(`${MATERIALS[id].name} +${n}`); }
      if (b.lastReward !== today) { b.lastReward = today; for (const [id, n] of Object.entries(BOAT.waterfallReward)) { this.w.give(id, n); parts.push(`${MATERIALS[id].name} +${n}`); } }
      if (parts.length) { this.hud?.materials?.classList.add('show'); setTimeout(() => this.hud?.showToast(`Waterfall finds: ${parts.join('  ')}`), 1600); }
      if (this.canBuy()) setTimeout(() => this.hud?.showToast('Sigurd might sell you the boat now'), 4200);
      this.persist();
    }
    if (!B.on && this.wasOn) { b.trips++; this.persist(); }
    this.wasOn = B.on; this.wasFall = B.on && B.reachedWaterfall;
    if (++this.tick % 30) return;           // catch-log diff ~2×/s is plenty
    const k = this.key(); if (k !== this.snap) { this.snap = k; this.persist(); }
  }

  key() { const f = this.f; return `${f.starter}|${Object.keys(f.own).join(',')}|${JSON.stringify(f.log)}`; }
  persist() {
    const f = this.f, fp = this.p.fishing;
    fp.starter = !!f.starter; fp.own = {}; for (const k of Object.keys(f.own)) fp.own[k] = 1;
    fp.log = JSON.parse(JSON.stringify(f.log)); this.w.save.persist();
  }

  // Objective card hook (WildsLoopSystem.goal falls back to this before "Keep your garden growing").
  goal() {
    const f = this.f, b = this.p.boat, g = (title, copy) => ({ title, copy });
    if (b.owned) return null;
    if (!f.starter) return g('Visit Sigurd at the lake cabin', 'He has an old rod for you, and a boat.');
    if (this.species() < BOAT.speciesNeeded) return g(`Catch ${BOAT.speciesNeeded} kinds of fish`, `Sigurd lends the boat to real anglers (${this.species()}/${BOAT.speciesNeeded}).`);
    if (!f.own.vest) return g('Get a Life Vest', `Sigurd stitches one from ${costText(BOAT.vestCost)}.`);
    if (this.canBuy()) return g('Buy the boat', `Sigurd will sell her for ${costText(BOAT.buyCost)}.`);
    return g('Row to the waterfall', `Rent the boat from Sigurd (${costText(BOAT.rentCost)}) and follow the stream.`);
  }
}
