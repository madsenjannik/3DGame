// @ts-nocheck
// SaveGame (v3): one versioned save for new progression (load -> migrate -> validate -> hydrate -> persist).
// R57: last-known-good backup ('tgw.save.bak'), build/version stamp, corrupt-save fallback, DEV export/import.
// Older systems (Stable, Greenhouse, MoveIn, Fishing) keep their own locked storage keys;
// they move in here only under a separately approved scope.
// R138 (GO 09/10, Jannik approved the proposals): one shared game for all characters. v4 merges the per-character
// profiles into profiles.shared (the most advanced one wins, ties go to the character played last); the whole v3 save is
// kept once in 'tgw.save.premerge'. data.unlocked lists the characters you may play: the 3 starters + every character
// that had a profile (played before = stays open). The seed unlocks add to it later.
const SAVE_KEY = 'tgw.save', BACKUP_KEY = 'tgw.save.bak', CORRUPT_KEY = 'tgw.save.corrupt', PREMERGE_KEY = 'tgw.save.premerge'; // R113: unreadable text is kept, never overwritten
export const SAVE_VERSION = 4;
export const SHARED_ID = 'shared';
export const STARTERS = ['daisy', 'cactus', 'swamp'];
const ls = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lastPlayed = () => { try { return JSON.parse(ls('tgw.lastChar') || 'null')?.id || ''; } catch { return ''; } };
// How far a profile got: the bosses count most, then the greenhouse (its own key), the garden, tools, pots, Lake Run gold
// and fish species; what was gathered only breaks near-ties.
export function profileScore(p, id) {
  if (!p || typeof p !== 'object') return -1;
  const c = p.combat || {}, n = o => Object.keys(o || {}).length;
  return ((c.giant?.wins | 0) > 0 ? 1000 : 0) + ((c.bear?.wins | 0) > 0 ? 1000 : 0) + (Math.max(0, Math.min(3, parseInt(ls(`dym-gh-level.${id}`) || '0', 10) || 0)) * 120)
    + (p.homeLevel | 0) * 50 + n(p.tools) * 20 + (p.pots?.count | 0) * 20 + ((p.lakeRun?.golds | 0) > 0 ? 40 : 0) + n(p.fishing?.log) * 10 + Math.min(30, (p.stats?.gathered | 0) / 10);
}
export function pickWinner(profiles) {
  const last = lastPlayed(), ids = Object.keys(profiles || {}).filter(k => k !== SHARED_ID && profiles[k] && typeof profiles[k] === 'object');
  return ids.map(id => ({ id, s: profileScore(profiles[id], id) })).sort((a, b) => b.s - a.s || (b.id === last) - (a.id === last))[0]?.id || '';
}

function blankProfile() {
  return {
    inventory: {},        // material id -> count (wood, stone, clay, fiber, amber, shell, golden_seed)
    tools: {},            // tool id -> true
    homeLevel: 0,         // 0..3 garden upgrades (barrel, shrine, hedge)
    workshop: 0,          // R144: 0 = the bench alone, 1..3 = workshop levels around it
    specialSeeds: {},     // R149: character id -> 1 (in the Bag) | 2 (planted at the Sprouting Ring)
    specialHarvest: false, // R151: harvested a special (glowing) pot plant once -> Aloe Seed
    seen: {},             // R154: { golden, giant, bear } first Golden Seed explained / bosses found (map markers)
    tree: { stage: 0, fed: 0 }, // R150: the Orangery's community tree (stage 0..10, seeds fed toward the next)
    pots: { count: 0, slots: [null, null, null], care: [{}, {}, {}] }, // greenhouse pots: slot -> { stage, wet, readyAt, special }; R151 care[i] = { last day watered, streak }
    water: 0,             // watering-can charges
    nodes: {},            // node id -> epoch ms when it has regrown
    thorns: {},           // thornbrush id -> 'cleared' | 'looted'
    stats: { gathered: 0, crafted: 0, weeds: 0, snails: 0 },
    threat: { started: 0, lastSpawn: 0, lastSnail: 0, weeds: [] }, // overgrowth: [{ id, spot, bornAt }]
    perks: {},            // golden-seed perk id -> true
    daily: { date: '', done: {}, progress: {}, streak: 0, lastDate: '' },
    fishing: { starter: false, own: {}, log: {} },   // R58: Sigurd's gear + catch log (was memory-only)
    hotbar: { slots: Array(10).fill(null), selected: -1 }, // R101: persistent desktop quick-slot order + active slot
    boat: { owned: false, trips: 0, waterfall: 0, lastReward: '' }, // R58 boat economy
    combat: { moles: {}, firstMole: false, pouches: [], mercyUntil: 0, giant: { defeatedAt: 0, wins: 0 }, bear: { defeatedAt: 0, wins: 0 } }, // R61/R63/R79 combat
    lakeRun: { best: 0, splits: [], ghost: [], runs: [], day: '', attempts: 0, golds: 0, weekGold: '' }, // R64 Lake Run
    story: { seed: '' },
    wear: { vest: false }, // R125: the Life Vest is worn (on the body), not held  // R119: first Golden Seed choice ('plant' | 'donate'), so the story does not replay
    garden: null          // R60 GardenBuildSystem: { version, plots[], buildings[{ id, type, gx, gz, rot }] }
  };
}

function migrate(raw) {
  if (!raw || typeof raw !== 'object') return { version: SAVE_VERSION, profiles: {}, unlocked: [...STARTERS] };
  const save = { version: raw.version | 0, profiles: raw.profiles && typeof raw.profiles === 'object' ? raw.profiles : {}, unlocked: Array.isArray(raw.unlocked) ? raw.unlocked : [] };
  if (typeof raw.mergedFrom === 'string') save.mergedFrom = raw.mergedFrom;
  // v2: builds moved into the private garden and Planter Beds (old home level 1) became
  // greenhouse pots. Old levels shift down by one; a paid-for bed level becomes one free pot.
  if (save.version < 2) for (const p of Object.values(save.profiles)) {
    if (!p || typeof p !== 'object') continue;
    const old = p.homeLevel | 0; p.homeLevel = Math.max(0, old - 1);
    if (old >= 1) p.pots = { count: 1, slots: [null, null, null] };
  }
  // v3: no data change — adds the meta stamp (build, savedAt) written on every flush.
  // R58 adds profile.fishing + profile.boat, R60 profile.garden; additive with defaults, so no version bump.
  // v4 (R138): one shared profile; every character that had a profile stays open.
  if (save.version < 4) {
    const ids = Object.keys(save.profiles).filter(k => k !== SHARED_ID && save.profiles[k] && typeof save.profiles[k] === 'object');
    save.unlocked = [...save.unlocked, ...ids];
    if (!save.profiles[SHARED_ID] && ids.length) { const w = pickWinner(save.profiles); save.profiles = { [SHARED_ID]: save.profiles[w] }; save.mergedFrom = w; }
    else if (save.profiles[SHARED_ID]) save.profiles = { [SHARED_ID]: save.profiles[SHARED_ID] };
  }
  save.unlocked = [...new Set([...STARTERS, ...save.unlocked.filter(x => typeof x === 'string' && /^[a-z_]{2,24}$/.test(x))])];
  save.version = SAVE_VERSION;
  return save;
}

function validProfile(p) {
  const out = blankProfile();
  if (!p || typeof p !== 'object') return out;
  for (const [k, v] of Object.entries(p.inventory || {})) if (Number.isFinite(v) && v > 0) out.inventory[k] = Math.floor(v);
  for (const [k, v] of Object.entries(p.tools || {})) if (v === true) out.tools[k] = true;
  out.homeLevel = Math.max(0, Math.min(3, p.homeLevel | 0));
  out.workshop = Math.max(0, Math.min(3, p.workshop | 0));   // R144
  for (const [k, v] of Object.entries(p.specialSeeds || {})) if ((v === 1 || v === 2) && /^[a-z_]{2,24}$/.test(k)) out.specialSeeds[k] = v;   // R149
  out.specialHarvest = p.specialHarvest === true;   // R151
  for (const k of ['golden', 'giant', 'bear']) if (p.seen?.[k] === true) out.seen[k] = true;   // R154
  out.tree = { stage: Math.max(0, Math.min(10, p.tree?.stage | 0)), fed: Math.max(0, Math.min(99, p.tree?.fed | 0)) };   // R150
  out.pots.count = Math.max(0, Math.min(3, p.pots?.count | 0));
  if (Array.isArray(p.pots?.slots)) out.pots.slots = [0, 1, 2].map(i => { const s = p.pots.slots[i]; return s && Number.isInteger(s.stage) ? { stage: Math.max(0, Math.min(3, s.stage)), wet: s.wet === true, readyAt: Number.isFinite(s.readyAt) ? s.readyAt : 0, ...(s.special === true ? { special: true } : {}) } : null; });
  if (Array.isArray(p.pots?.care)) out.pots.care = [0, 1, 2].map(i => { const c = p.pots.care[i]; return c && typeof c.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.last) ? { last: c.last, streak: Math.max(0, Math.min(99, c.streak | 0)) } : {}; });   // R151
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
  // R101 desktop hotbar is additive to save v3. Keep known IDs only and never allow duplicates.
  const hb = p.hotbar || {}, hotbarIds = new Set(['axe','pickaxe','sickle','can','rod','vest','lantern']), seenHotbar = new Set();
  if (Array.isArray(hb.slots)) out.hotbar.slots = Array.from({ length: 10 }, (_, i) => {
    const id = hb.slots[i]; if (typeof id !== 'string' || !hotbarIds.has(id) || seenHotbar.has(id)) return null;
    seenHotbar.add(id); return id;
  });
  out.hotbar.selected = Number.isInteger(hb.selected) && hb.selected >= 0 && hb.selected < 10 ? hb.selected : -1;
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
  out.combat.giant = { defeatedAt: Number.isFinite(cb.giant?.defeatedAt) ? cb.giant.defeatedAt : 0, wins: Math.max(0, cb.giant?.wins | 0) };
  out.combat.bear = { defeatedAt: Number.isFinite(cb.bear?.defeatedAt) ? cb.bear.defeatedAt : 0, wins: Math.max(0, cb.bear?.wins | 0) };   // R79
  if (Array.isArray(cb.pouches)) out.combat.pouches = cb.pouches.filter(q => q && typeof q.id === 'string' && Number.isFinite(q.x) && Number.isFinite(q.z) && Number.isFinite(q.until) && q.items && typeof q.items === 'object').slice(-3)
    .map(q => ({ id: q.id, x: q.x, z: q.z, until: q.until, items: Object.fromEntries(Object.entries(q.items).filter(([, n]) => Number.isFinite(n) && n > 0).map(([k, n]) => [k, Math.floor(n)])) }));
  // R64 Lake Run (additive, v3). Ghost = flat [x, z, yaw, ...] samples of the PB run (boat-local).
  const lr = p.lakeRun || {}, num = a => Array.isArray(a) ? a.filter(Number.isFinite) : [];
  out.lakeRun.best = Number.isFinite(lr.best) && lr.best > 0 ? lr.best : 0;
  out.lakeRun.splits = num(lr.splits).slice(0, 16); out.lakeRun.ghost = num(lr.ghost).slice(0, 3 * 1500);
  if (Array.isArray(lr.runs)) out.lakeRun.runs = lr.runs.filter(r => r && typeof r.day === 'string' && Number.isFinite(r.t)).slice(-60).map(r => ({ day: r.day, t: r.t }));
  if (typeof lr.day === 'string') out.lakeRun.day = lr.day;
  out.lakeRun.attempts = Math.max(0, lr.attempts | 0); out.lakeRun.golds = Math.max(0, lr.golds | 0);
  if (typeof lr.weekGold === 'string') out.lakeRun.weekGold = lr.weekGold;
  if (p.story?.seed === 'plant' || p.story?.seed === 'donate') out.story.seed = p.story.seed;   // R119
  out.wear.vest = p.wear?.vest === true;   // R125
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

// R138: the characters you may play (no SaveGame instance needed: the selector and the start guard read it too)
// R152: the Special Seeds state for the selector (id -> 1 in the Bag | 2 planted); {} when there is no save
export function specialSeedState() {
  try { const r = readStore(SAVE_KEY); const s = r.data?.profiles?.[SHARED_ID]?.specialSeeds; return s && typeof s === 'object' ? s : {}; } catch { return {}; }
}
export function unlockedIds() {
  try { const r = readStore(SAVE_KEY); return new Set(r.data ? r.data.unlocked : STARTERS); }
  catch { try { const b = readStore(BACKUP_KEY); return new Set(b.data ? b.data.unlocked : STARTERS); } catch { return new Set(STARTERS); } }
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
        try { const bad = localStorage.getItem(SAVE_KEY); if (bad != null) localStorage.setItem(CORRUPT_KEY, bad); } catch {}
        try { const b = readStore(BACKUP_KEY); if (b.data) { this.data = b.data; this.recovered = true; } }
        catch (e2) { console.warn('[TGW] Backup unreadable too; starting fresh', e2); }
      }
    }
    // R138: the v3 save as it was before the merge is kept once, whatever happens afterwards
    if (!ephemeral && this.loadedRaw && ls(PREMERGE_KEY) == null) try { if ((JSON.parse(this.loadedRaw).version | 0) < 4) localStorage.setItem(PREMERGE_KEY, this.loadedRaw); } catch {}
    this.profile = validProfile(this.data.profiles[SHARED_ID]);
    this.data.profiles[SHARED_ID] = this.profile;
    if (!Array.isArray(this.data.unlocked)) this.data.unlocked = [...STARTERS];
    this.timer = null; this.deleted = false;
    // R113: ask the browser to keep this site's storage (installed iOS web apps get it without a prompt). Fails soft.
    if (!ephemeral) try { navigator.storage?.persist?.()?.catch?.(() => {}); } catch {}
    addEventListener('pagehide', () => this.flush());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.flush(); });
  }

  // R138: playing a character keeps it open (the start guard only lets open characters in, outside DEV)
  unlock(id) { if (typeof id === 'string' && !this.data.unlocked.includes(id)) { this.data.unlocked.push(id); this.persist(); } }
  isUnlocked(id) { return this.data.unlocked.includes(id); }

  // DEV: drop the shared wilds profile (R138: one game for every character); nothing is written afterwards (caller reloads).
  resetProfile() {
    delete this.data.profiles[SHARED_ID]; this.deleted = true; this.flush(); this.ephemeral = true;
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
    if (this.ephemeral || this.readOnly) return;   // R153: readOnly = another tab owns the game (TabGuard)
    clearTimeout(this.timer); this.timer = null;
    try {
      // First write of the session: keep the save we loaded as the last-known-good backup.
      if (!this.backedUp && this.loadedRaw) { localStorage.setItem(BACKUP_KEY, this.loadedRaw); this.backedUp = true; }
      // R113: another tab may have saved other characters since we loaded. Re-read and replace only our own profile,
      // so two open tabs never wipe each other's characters (same character: last write still wins).
      try { const cur = readStore(SAVE_KEY).data; if (cur) { const own = this.data.profiles[SHARED_ID]; this.data.profiles = cur.profiles; if (this.deleted) delete this.data.profiles[SHARED_ID]; else this.data.profiles[SHARED_ID] = own; this.data.unlocked = [...new Set([...(cur.unlocked || []), ...this.data.unlocked])]; } } catch {}
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
