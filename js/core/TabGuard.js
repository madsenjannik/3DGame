// @ts-nocheck
// R157A: single-writer ownership for the shared game and Stable/Greenhouse sidecar saves.
// First live tab owns. A handoff flushes old progress before the new tab reloads.
// Do not modify the locked Stable or Greenhouse internals.
const KEY = 'tgw.activeTab', REQUEST = 'tgw.tabHandoff', ACK = 'tgw.tabHandoffAck';
const LEASE_MS = 12000, HEARTBEAT_MS = 2000;
const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export function installTabGuard(game) {
  // A new page gets a fresh ID; only a deliberately handed-off reload keeps its ID.
  let id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  try {
    const grant = sessionStorage.getItem('tgw.tabGrant');
    sessionStorage.removeItem('tgw.tabGrant');
    if (grant && read(KEY)?.id === grant) id = grant;
  } catch {}
  let active = false, heartbeat = null, pending = null, ch = null;
  try { ch = new BroadcastChannel('tgw-tabs'); } catch {}
  const owner = () => read(KEY);
  const fresh = v => !!(v && typeof v.id === 'string' && Number.isFinite(v.at) && Date.now() - v.at < LEASE_MS);
  const canWrite = () => active && owner()?.id === id;
  game.save.canWrite = canWrite;
  const stop = () => { if (heartbeat !== null) clearInterval(heartbeat); heartbeat = null; };
  const lose = () => {
    if (!active && game.save.readOnly && document.getElementById('tab-lost')) return;
    active = false; stop(); game.save.readOnly = true;
    if (document.getElementById('tab-lost')) return;
    const b = document.createElement('button'); b.id = 'tab-lost'; b.type = 'button';
    b.innerHTML = '<b>The Growing Wilds is open in another tab</b><span>Your progress stays in the active tab. Tap here to switch safely.</span>';
    b.addEventListener('click', requestTakeover); document.body.appendChild(b);
  };
  const claim = () => {
    const existing = owner();
    if (fresh(existing) && existing.id !== id) return false;
    if (!write(KEY, { id, at: Date.now() })) return false;
    active = true; game.save.readOnly = false; stop();
    heartbeat = setInterval(() => {
      if (!canWrite()) { lose(); return; }
      write(KEY, { id, at: Date.now() });
    }, HEARTBEAT_MS);
    return true;
  };
  const reloadWithGrant = () => {
    try { sessionStorage.setItem('tgw.tabGrant', id); } catch {}
    location.reload();
  };
  // A waiting tab must NEVER activate its old in-memory save before rehydrating.
  // Reserving the lease for a reload (without setting active=true) prevents pagehide
  // from flushing stale progress over the previous owner's newer snapshot.
  const reserveReload = () => {
    const existing = owner();
    if (fresh(existing) && existing.id !== id) return false;
    if (!write(KEY, { id, at: Date.now() })) return false;
    reloadWithGrant(); return true;
  };
  const handleAck = ack => {
    if (!pending || ack?.from !== id || ack?.at !== pending.at || owner()?.id !== id) return;
    pending = null; reloadWithGrant();
  };
  const handleRequest = req => {
    if (!req || req.to !== id || req.from === id || !Number.isFinite(req.at) || !canWrite()) return;
    game.save.flush(); // old owner flushes synchronously before releasing the lease
    lose();
    if (!write(KEY, { id: req.from, at: Date.now() })) return;
    const ack = { from: req.from, at: req.at };
    write(ACK, ack); ch?.postMessage({ ack });
  };
  function requestTakeover() {
    if (active || pending) return;
    const current = owner();
    if (!fresh(current) || current.id === id) {
      reserveReload();
      return;
    }
    pending = { from: id, to: current.id, at: Date.now() };
    write(REQUEST, pending); ch?.postMessage({ request: pending });
    setTimeout(() => {
      if (!pending) return;
      if (!fresh(owner()) && reserveReload()) { pending = null; return; }
      pending = null;
      const hint = document.getElementById('tab-lost')?.querySelector('span');
      if (hint) hint.textContent = 'Close the other tab, then tap here to try again.';
    }, 2000);
  }
  ch?.addEventListener('message', e => {
    if (e.data?.request) handleRequest(e.data.request);
    if (e.data?.ack) handleAck(e.data.ack);
  });
  addEventListener('storage', e => {
    if (e.key === REQUEST && e.newValue) { try { handleRequest(JSON.parse(e.newValue)); } catch {} }
    if (e.key === ACK && e.newValue) { try { handleAck(JSON.parse(e.newValue)); } catch {} }
    if (e.key === KEY && active && !canWrite()) lose();
  });
  addEventListener('pagehide', () => {
    if (canWrite()) {
      game.save.flush();
      try { if (owner()?.id === id) localStorage.removeItem(KEY); } catch {}
    }
    active = false; stop(); ch?.close();
  });
  // Integrate externally; neither locked subsystem must change.
  const guardSaveMethod = (target, method) => {
    if (!target || typeof target[method] !== 'function') return;
    const original = target[method];
    target[method] = function (...args) { if (canWrite()) return original.apply(this, args); };
  };
  if (!claim()) lose();
  return { id, canWrite, lose, guardSaveMethod, requestTakeover };
}
