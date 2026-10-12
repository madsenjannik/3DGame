// @ts-nocheck
// Three small requests per local day, pinned in the shared save across all characters.
// Finishing all three on consecutive days builds a streak; every 3rd day pays a Golden Seed.
import { DAILY, MATERIALS } from '../data/wildsCatalog.js';

const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const prevDay = key => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d - 1)); };
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

export class DailyRequests {
  constructor(wilds) { this.w = wilds; this.d = wilds.profile.daily; this.update(); }

  roll(seedText) {
    let seed = hash(seedText); const pool = DAILY.pool.slice(), out = [];
    while (out.length < DAILY.count && pool.length) { seed = Math.imul(seed ^ seed >>> 13, 1274126177) >>> 0; out.push(pool.splice(seed % pool.length, 1)[0]); }
    return out;
  }

  tasks(key = this.d.date) {
    const ids = key === this.d.date && this.d.selection;
    if (Array.isArray(ids) && ids.length === DAILY.count && ids.every(id => DAILY.pool.some(t => t.id === id)) && new Set(ids).size === ids.length)
      return ids.map(id => DAILY.pool.find(t => t.id === id));
    return this.roll(key);
  }

  legacySelection(today) {
    // R156 stored no selected IDs. Preserve completed/in-progress ones before filling the set.
    const known = new Set(DAILY.pool.map(t => t.id)), selected = [];
    const add = id => { if (known.has(id) && !selected.includes(id) && selected.length < DAILY.count) selected.push(id); };
    for (const id of Object.keys(this.d.done || {})) if (this.d.done[id]) add(id);
    for (const id of Object.keys(this.d.progress || {})) if (this.d.progress[id] > 0) add(id);
    for (const task of this.roll(today + this.w.state.player.characterId)) add(task.id);
    for (const task of this.roll(today)) add(task.id);
    return selected;
  }

  update() {
    const today = dayKey();
    if (this.d.date === today) {
      if (Array.isArray(this.d.selection) && this.d.selection.length === DAILY.count
        && new Set(this.d.selection).size === DAILY.count && this.d.selection.every(id => DAILY.pool.some(t => t.id === id))) return;
      this.d.selection = this.legacySelection(today);
      this.w.save.persist();
      return;
    }
    this.d.date = today; this.d.done = {}; this.d.progress = {};
    this.d.selection = this.roll(today).map(t => t.id);
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
    if (this.tasks().every(x => this.d.done[x.id]) && this.d.lastDate !== this.d.date) {
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
