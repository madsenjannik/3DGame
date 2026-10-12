// @ts-nocheck
// R157A: single-writer ownership for the shared game and Stable/Greenhouse sidecar saves.
// First live tab owns. A handoff flushes old progress before the new tab reloads.
// Do not modify the locked Stable or Greenhouse internals.
const KEY = 'tgw.activeTab', REQUEST = 'tgw.tabHandoff', ACK = 'tgw.tabHandoffAck';
// A rendering/background tab can miss heartbeats for >12 s without closing.
// Do not auto-steal its save lease. Explicit crash recovery is available only
// after an extended silence and a second player action.
const RECOVERY_AGE_MS = 120000, HEARTBEAT_MS = 2000;
// R157C: handoff ACK can take several seconds behind heavy WebGL startup.
// Do not abandon a pending request after only 2 seconds; that strands the new tab.
const HANDOFF_WAIT_MS = 20000;
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
  const abandoned = v => !!(v && typeof v.id === 'string' && Number.isFinite(v.at) && Date.now() - v.at >= RECOVERY_AGE_MS);
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
    // An expired heartbeat is NOT proof of a closed game; WebGL/background
    // throttling may freeze a live writer for much longer than 12 seconds.
    if (existing && existing.id !== id) return false;
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
    if (existing && existing.id !== id) return false;
    if (!write(KEY, { id, at: Date.now() })) return false;
    reloadWithGrant(); return true;
  };
  // Recovery for a crashed tab is an EXPLICIT second tap, never automatic.
  // A live tab gets the cooperative request/flush/ACK path even if its
  // heartbeat is temporarily stale. Stale writers fail canWrite() on resume.
  const recoverAbandoned = () => {
    const existing = owner();
    if (!existing || existing.id === id) return reserveReload();
    if (!abandoned(existing)) return false;
    if (!write(KEY, { id, at: Date.now() })) return false;
    pending = null; reloadWithGrant(); return true;
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
    if (active) return;
    if (pending) {
      // Do not discard the original request during slow WebGL/background tabs.
      // Re-send the SAME request when the waiting player explicitly taps again;
      // the old writer flushes exactly once, and stale ACKs cannot grant ownership.
      handleAck(read(ACK));
      if (!pending) return;
      if (recoverAbandoned()) { pending = null; return; }
      write(REQUEST, pending); ch?.postMessage({ request: pending });
      return;
    }
    const current = owner();
    if (!current || current.id === id) {
      reserveReload();
      return;
    }
    pending = { from: id, to: current.id, at: Date.now() };
    write(REQUEST, pending); ch?.postMessage({ request: pending });
    setTimeout(() => {
      if (!pending) return;
      // A handoff may have finished while browser task scheduling delayed the ACK event.
      // Only accept the precise matching ACK after the prior writer released our lease.
      handleAck(read(ACK));
      if (!pending) return;
      // Never time out or steal ownership while the previous writer may still
      // be flushing. In WebGL-heavy Chromium, a valid ACK can arrive >20s late.
      // Keep 'pending' alive for that ACK; only an explicit retry may resend or
      // safely recover an expired lease, and never writes the stale game snapshot.
      const hint = document.getElementById('tab-lost')?.querySelector('span');
      if (hint) hint.textContent = abandoned(owner())
        ? 'Other tab has been inactive for 2+ minutes. Tap to recover; unsaved changes there may be lost.'
        : 'Still waiting for the other tab. Tap here to retry safely.';
    }, HANDOFF_WAIT_MS);
  }
  ch?.addEventListener('message', e => {
    if (e.data?.request) handleRequest(e.data.request);
    if (e.data?.ack) handleAck(e.data.ack);
  });
  addEventListener('storage', e => {
    if (e.key === REQUEST && e.newValue) { try { handleRequest(JSON.parse(e.newValue)); } catch {} }
    if (e.key === ACK && e.newValue) { try { handleAck(JSON.parse(e.newValue)); } catch {} }
    if (e.key === KEY) {
      if (active && !canWrite()) lose();
      // KEY may arrive before the ACK event; accept it only after a matching ACK
      // exists and the previous tab has relinquished the lease.
      else if (pending && owner()?.id === id) handleAck(read(ACK));
    }
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
