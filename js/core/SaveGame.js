// @ts-nocheck
// SaveGameV1: one versioned save for new progression (load -> migrate -> hydrate -> persist).
// Older systems (Stable, Greenhouse, MoveIn, Fishing) keep their own locked storage keys;
// they move in here only under a separately approved scope.
const SAVE_KEY = 'tgw.save';
export const SAVE_VERSION = 1;

function blankProfile() {
  return {
    inventory: {},        // material id -> count (wood, stone, clay, fiber, amber, shell, golden_seed)
    tools: {},            // tool id -> true
    homeLevel: 0,         // 0..4 home garden upgrades
    nodes: {},            // node id -> epoch ms when it has regrown
    thorns: {},           // thornbrush id -> 'cleared' | 'looted'
    stats: { gathered: 0, crafted: 0, weeds: 0, snails: 0 },
    threat: { started: 0, lastSpawn: 0, lastSnail: 0, weeds: [] }, // overgrowth: [{ id, spot, bornAt }]
    perks: {},            // golden-seed perk id -> true
    daily: { date: '', done: {}, progress: {}, streak: 0, lastDate: '' }
  };
}

function migrate(raw) {
  if (!raw || typeof raw !== 'object') return { version: SAVE_VERSION, profiles: {} };
  const save = { version: raw.version | 0, profiles: raw.profiles && typeof raw.profiles === 'object' ? raw.profiles : {} };
  // Future: if (save.version < 2) { ...; save.version = 2; }
  save.version = SAVE_VERSION;
  return save;
}

function validProfile(p) {
  const out = blankProfile();
  if (!p || typeof p !== 'object') return out;
  for (const [k, v] of Object.entries(p.inventory || {})) if (Number.isFinite(v) && v > 0) out.inventory[k] = Math.floor(v);
  for (const [k, v] of Object.entries(p.tools || {})) if (v === true) out.tools[k] = true;
  out.homeLevel = Math.max(0, Math.min(4, p.homeLevel | 0));
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
  if (Array.isArray(t.weeds)) out.threat.weeds = t.weeds.filter(w => w && typeof w.id === 'string' && Number.isInteger(w.spot) && Number.isFinite(w.bornAt)).slice(0, 24);
  for (const [k, v] of Object.entries(p.perks || {})) if (v === true) out.perks[k] = true;
  const d = p.daily || {};
  if (typeof d.date === 'string') out.daily.date = d.date;
  if (typeof d.lastDate === 'string') out.daily.lastDate = d.lastDate;
  out.daily.streak = Math.max(0, d.streak | 0);
  for (const [k, v] of Object.entries(d.done || {})) if (v === true) out.daily.done[k] = true;
  for (const [k, v] of Object.entries(d.progress || {})) if (Number.isFinite(v)) out.daily.progress[k] = Math.max(0, Math.floor(v));
  return out;
}

export class SaveGame {
  // ephemeral: DEV routes play with a throwaway profile and never write storage.
  constructor({ characterId, ephemeral = false }) {
    this.characterId = characterId;
    this.ephemeral = ephemeral;
    this.data = { version: SAVE_VERSION, profiles: {} };
    this.warned = false;
    if (!ephemeral) {
      try { this.data = migrate(JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')); }
      catch (e) { console.warn('[TGW] Save could not be read; starting fresh', e); }
    }
    this.profile = validProfile(this.data.profiles[characterId]);
    this.data.profiles[characterId] = this.profile;
    this.timer = null;
    addEventListener('pagehide', () => this.flush());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.flush(); });
  }

  // Coalesce bursts of changes (gathering several nodes) into one write.
  persist() {
    if (this.ephemeral) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 400);
  }

  flush() {
    if (this.ephemeral) return;
    clearTimeout(this.timer); this.timer = null;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...this.data, savedAt: Date.now() })); }
    catch (e) { if (!this.warned) { this.warned = true; console.warn('[TGW] Progress could not be saved', e); } }
  }
}
