// @ts-nocheck
// Three small requests per local day, picked from the date + character so they are stable all day.
// Finishing all three on consecutive days builds a streak; every 3rd day pays a Golden Seed.
import { DAILY, MATERIALS } from '../data/wildsCatalog.js';

const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const prevDay = key => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d - 1)); };
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

export class DailyRequests {
  constructor(wilds) { this.w = wilds; this.d = wilds.profile.daily; this.update(); }

  tasks(key = this.d.date) {
    let seed = hash(key + this.w.state.player.characterId); const pool = DAILY.pool.slice(), out = [];
    while (out.length < DAILY.count && pool.length) { seed = Math.imul(seed ^ seed >>> 13, 1274126177) >>> 0; out.push(pool.splice(seed % pool.length, 1)[0]); }
    return out;
  }

  // Roll over at local midnight.
  update() {
    const today = dayKey();
    if (this.d.date === today) return;
    this.d.date = today; this.d.done = {}; this.d.progress = {};
    if (this.d.lastDate && this.d.lastDate !== prevDay(today)) this.d.streak = 0;
    this.w.save.persist(); this.w.emit?.();
  }

  track(stat, n) {
    this.update();
    let changed = false;
    for (const t of this.tasks()) {
      if (t.stat !== stat || this.d.done[t.id]) continue;
      this.d.progress[t.id] = (this.d.progress[t.id] || 0) + n; changed = true;
      if (this.d.progress[t.id] >= t.goal) this.complete(t);
    }
    if (changed) { this.w.save.persist(); this.w.emit(); }
  }

  complete(t) {
    this.d.done[t.id] = true;
    for (const [id, n] of Object.entries(t.reward)) this.w.give(id, n);
    this.w.hud?.showToast(`Daily request done: ${t.text}  ${Object.entries(t.reward).map(([id, n]) => `${MATERIALS[id].name} +${n}`).join('  ')}`);
    if (this.tasks().every(x => this.d.done[x.id])) {
      this.d.streak = this.d.lastDate === prevDay(this.d.date) ? this.d.streak + 1 : 1;
      this.d.lastDate = this.d.date;
      if (this.d.streak % DAILY.streakBonusEvery === 0) {
        for (const [id, n] of Object.entries(DAILY.streakBonus)) this.w.give(id, n);
        setTimeout(() => this.w.hud?.showToast(`${this.d.streak}-day streak! Golden Seed +1`), 2400);
      } else setTimeout(() => this.w.hud?.showToast(`All requests done · streak ${this.d.streak}`), 2400);
    }
  }

  view() { return this.tasks().map(t => ({ ...t, have: Math.min(t.goal, this.d.progress[t.id] || 0), done: !!this.d.done[t.id] })); }
}
