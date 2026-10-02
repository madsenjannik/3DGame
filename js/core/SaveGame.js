// @ts-nocheck
// SaveGame (v3): one versioned save for new progression (load -> migrate -> validate -> hydrate -> persist).
// R57: last-known-good backup ('tgw.save.bak'), build/version stamp, corrupt-save fallback, DEV export/import.
// Older systems (Stable, Greenhouse, MoveIn, Fishing) keep their own locked storage keys;
// they move in here only under a separately approved scope.
const SAVE_KEY = 'tgw.save', BACKUP_KEY = 'tgw.save.bak';
export const SAVE_VERSION = 3;

function blankProfile() {
  return {
    inventory: {},        // material id -> count (wood, stone, clay, fiber, amber, shell, golden_seed)
    tools: {},            // tool id -> true
    homeLevel: 0,         // 0..3 garden upgrades (barrel, shrine, hedge)
    pots: { count: 0, slots: [null, null, null] }, // greenhouse pots: slot -> { stage, wet, readyAt }
    water: 0,             // watering-can charges
    nodes: {},            // node id -> epoch ms when it has regrown
    thorns: {},           // thornbrush id -> 'cleared' | 'looted'
    stats: { gathered: 0, crafted: 0, weeds: 0, snails: 0 },
    threat: { started: 0, lastSpawn: 0, lastSnail: 0, weeds: [] }, // overgrowth: [{ id, spot, bornAt }]
    perks: {},            // golden-seed perk id -> true
    daily: { date: '', done: {}, progress: {}, streak: 0, lastDate: '' },
    fishing: { starter: false, own: {}, log: {} },   // R58: Sigurd's gear + catch log (was memory-only)
    boat: { owned: false, trips: 0, waterfall: 0, lastReward: '' }, // R58 boat economy
    combat: { moles: {}, firstMole: false, pouches: [], mercyUntil: 0 }, // R61 combat: mole respawns, wilt pouches
    garden: null          // R60 GardenBuildSystem: { version, plots[], buildings[{ id, type, gx, gz, rot }] }
  };
}

function migrate(raw) {
  if (!raw || typeof raw !== 'object') return { version: SAVE_VERSION, profiles: {} };
  const save = { version: raw.version | 0, profiles: raw.profiles && typeof raw.profiles === 'object' ? raw.profiles : {} };
  // v2: builds moved into the private garden and Planter Beds (old home level 1) became
  // greenhouse pots. Old levels shift down by one; a paid-for bed level becomes one free pot.
  if (save.version < 2) for (const p of Object.values(save.profiles)) {
    if (!p || typeof p !== 'object') continue;
    const old = p.homeLevel | 0; p.homeLevel = Math.max(0, old - 1);
    if (old >= 1) p.pots = { count: 1, slots: [null, null, null] };
  }
  // v3: no data change — adds the meta stamp (build, savedAt) written on every flush.
  // R58 adds profile.fishing + profile.boat, R60 profile.garden; additive with defaults, so no version bump.
  save.version = SAVE_VERSION;
  return save;
}

function validProfile(p) {
  const out = blankProfile();
  if (!p || typeof p !== 'object') return out;
  for (const [k, v] of Object.entries(p.inventory || {})) if (Number.isFinite(v) && v > 0) out.inventory[k] = Math.floor(v);
  for (const [k, v] of Object.entries(p.tools || {})) if (v === true) out.tools[k] = true;
  out.homeLevel = Math.max(0, Math.min(3, p.homeLevel | 0));
  out.pots.count = Math.max(0, Math.min(3, p.pots?.count | 0));
  if (Array.isArray(p.pots?.slots)) out.pots.slots = [0, 1, 2].map(i => { const s = p.pots.slots[i]; return s && Number.isInteger(s.stage) ? { stage: Math.max(0, Math.min(3, s.stage)), wet: s.wet === true, readyAt: Number.isFinite(s.readyAt) ? s.readyAt : 0 } : null; });
  out.water = Math.max(0, Math.min(9, p.water | 0));
  for (const [k, v] of Object.entries(p.nodes || {})) if (Number.isFinite(v)) out.nodes[k] = v;
  for (const [k, v] of Object.entries(p.thorns || {})) if (v === 'seen' || v === 'cleared' || v === 'looted') out.thorns[k] = v;
  out.stats.gathered = Math.max(0, p.stats?.gathered | 0);
  out.stats.crafted = Math.max(0, p.stats?.crafted | 0);
  out.stats.weeds = Math.max(0, p.stats?.weeds | 0);
  out.stats.snails = Math.max(0, p.stats?.snails | 0);
  const t = p.threat || {};
  out.threat.started = Number.isFinite(t.started) ? t.started : 0;
  out.threat.lastSpawn = Number.isFinite(t.lastSpawn) ? t.lastSpawn : 0;
  out.threat.lastSnail = Number.isFinite(t.lastSnail) ? t.lastSnail : 0;
  // Weeds: pre-R60 records carry a spot index, R60+ records also carry their own x/z (both formats load).
  if (Array.isArray(t.weeds)) out.threat.weeds = t.weeds.filter(w => w && typeof w.id === 'string' && Number.isFinite(w.bornAt) && (Number.isInteger(w.spot) || (Number.isFinite(w.x) && Number.isFinite(w.z))))
    .slice(0, 24).map(w => { const r = { id: w.id, bornAt: w.bornAt }; if (Number.isInteger(w.spot)) r.spot = w.spot; if (Number.isFinite(w.x) && Number.isFinite(w.z)) { r.x = w.x; r.z = w.z; } return r; });
  for (const [k, v] of Object.entries(p.perks || {})) if (v === true) out.perks[k] = true;
  const d = p.daily || {};
  if (typeof d.date === 'string') out.daily.date = d.date;
  if (typeof d.lastDate === 'string') out.daily.lastDate = d.lastDate;
  out.daily.streak = Math.max(0, d.streak | 0);
  for (const [k, v] of Object.entries(d.done || {})) if (v === true) out.daily.done[k] = true;
  for (const [k, v] of Object.entries(d.progress || {})) if (Number.isFinite(v)) out.daily.progress[k] = Math.max(0, Math.floor(v));
  const f = p.fishing || {};
  out.fishing.starter = f.starter === true;
  for (const [k, v] of Object.entries(f.own || {})) if (Number.isFinite(v) && v > 0) out.fishing.own[k] = 1;
  for (const [k, v] of Object.entries(f.log || {})) if (v && Number.isFinite(v.count) && Number.isFinite(v.best)) out.fishing.log[k] = { count: Math.max(0, v.count | 0), best: Math.max(0, +v.best) };
  const b = p.boat || {};
  out.boat.owned = b.owned === true;
  out.boat.trips = Math.max(0, b.trips | 0);
  out.boat.waterfall = Math.max(0, b.waterfall | 0);
  if (typeof b.lastReward === 'string') out.boat.lastReward = b.lastReward;
  // R61 combat (additive, v3).
  const cb = p.combat || {};
  for (const [k, v] of Object.entries(cb.moles || {})) if (Number.isFinite(v)) out.combat.moles[k] = v;
  out.combat.firstMole = cb.firstMole === true;
  out.combat.mercyUntil = Number.isFinite(cb.mercyUntil) ? cb.mercyUntil : 0;
  if (Array.isArray(cb.pouches)) out.combat.pouches = cb.pouches.filter(q => q && typeof q.id === 'string' && Number.isFinite(q.x) && Number.isFinite(q.z) && Number.isFinite(q.until) && q.items && typeof q.items === 'object').slice(-3)
    .map(q => ({ id: q.id, x: q.x, z: q.z, until: q.until, items: Object.fromEntries(Object.entries(q.items).filter(([, n]) => Number.isFinite(n) && n > 0).map(([k, n]) => [k, Math.floor(n)])) }));
  // R60 GardenBuildSystem placements (absent = catalog defaults = the pre-R60 layout).
  const g = p.garden;
  if (g && typeof g === 'object') {
    out.garden = { version: 1, plots: Array.isArray(g.plots) ? g.plots.filter(x => typeof x === 'string').slice(0, 32) : [], buildings: [] };
    if (Array.isArray(g.buildings)) for (const x of g.buildings.slice(0, 64)) if (x && typeof x.id === 'string' && typeof x.type === 'string' && Number.isInteger(x.gx) && Number.isInteger(x.gz) && Number.isInteger(x.rot)) out.garden.buildings.push({ id: x.id, type: x.type, gx: x.gx, gz: x.gz, rot: x.rot & 3 });
  }
  return out;
}

function readStore(key) {
  const raw = localStorage.getItem(key);
  if (raw == null) return { raw: null, data: null };
  const parsed = JSON.parse(raw);                       // throws on corrupt JSON
  if (!parsed || typeof parsed !== 'object' || typeof parsed.profiles !== 'object') throw new Error('not a TGW save');
  return { raw, data: migrate(parsed) };
}

export class SaveGame {
  // ephemeral: DEV routes play with a throwaway profile and never write storage.
  constructor({ characterId, ephemeral = false }) {
    this.characterId = characterId;
    this.ephemeral = ephemeral;
    this.data = { version: SAVE_VERSION, profiles: {} };
    this.warned = false; this.loadedRaw = null; this.backedUp = false; this.recovered = false;
    if (!ephemeral) {
      try { const r = readStore(SAVE_KEY); if (r.data) { this.data = r.data; this.loadedRaw = r.raw; } }
      catch (e) {
        console.warn('[TGW] Save is unreadable; trying the last-known-good backup', e);
        try { const b = readStore(BACKUP_KEY); if (b.data) { this.data = b.data; this.recovered = true; } }
        catch (e2) { console.warn('[TGW] Backup unreadable too; starting fresh', e2); }
      }
    }
    this.profile = validProfile(this.data.profiles[characterId]);
    this.data.profiles[characterId] = this.profile;
    this.timer = null;
    addEventListener('pagehide', () => this.flush());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.flush(); });
  }

  // DEV: drop this character's wilds profile; nothing is written afterwards (caller reloads).
  resetProfile() {
    delete this.data.profiles[this.characterId]; this.flush(); this.ephemeral = true;
  }

  // Coalesce bursts of changes (gathering several nodes) into one write.
  persist() {
    if (this.ephemeral) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 400);
  }

  serialize() {
    return JSON.stringify({ ...this.data, version: SAVE_VERSION, meta: { build: globalThis.TGW_VERSION?.build || '', version: globalThis.TGW_VERSION?.version || '', savedAt: Date.now() } });
  }

  flush() {
    if (this.ephemeral) return;
    clearTimeout(this.timer); this.timer = null;
    try {
      // First write of the session: keep the save we loaded as the last-known-good backup.
      if (!this.backedUp && this.loadedRaw) { localStorage.setItem(BACKUP_KEY, this.loadedRaw); this.backedUp = true; }
      const out = this.serialize(); JSON.parse(out); // never write something we cannot read back
      localStorage.setItem(SAVE_KEY, out);
    } catch (e) { if (!this.warned) { this.warned = true; console.warn('[TGW] Progress could not be saved', e); } }
  }

  // DEV export/import (whole save, all characters).
  exportJSON() { return JSON.stringify(JSON.parse(this.serialize()), null, 2); }
  importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.profiles !== 'object') throw new Error('Not a Growing Wilds save');
    const data = migrate(parsed);
    for (const k of Object.keys(data.profiles)) data.profiles[k] = validProfile(data.profiles[k]);
    const cur = localStorage.getItem(SAVE_KEY); if (cur) localStorage.setItem(BACKUP_KEY, cur);
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, version: SAVE_VERSION, meta: { importedAt: Date.now() } }));
    this.ephemeral = true; // caller reloads; nothing from this session may overwrite the import
    return Object.keys(data.profiles);
  }
}
