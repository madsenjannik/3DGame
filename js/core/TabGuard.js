// @ts-nocheck
// R153: since R138 every character shares one save, so two open game tabs would overwrite each other's progress
// (last flush wins: a planted seed comes back, spent Golden Seeds return). The newest tab owns the game: it announces
// itself on a BroadcastChannel (storage event as fallback); an older tab stops saving and shows 'Play here', which
// reloads it so it takes the game back. Fails soft: without both channels nothing changes.
export function installTabGuard(game) {
  const id = Math.random().toString(36).slice(2), KEY = 'tgw.activeTab';
  let ch = null; try { ch = new BroadcastChannel('tgw-tabs'); } catch {}
  const lose = () => {
    if (game.save) game.save.readOnly = true;
    if (document.getElementById('tab-lost')) return;
    const b = document.createElement('button'); b.id = 'tab-lost'; b.type = 'button';
    b.innerHTML = '<b>The Growing Wilds is open in another tab</b><span>Your progress is safe there. Play here instead</span>';
    b.addEventListener('click', () => location.reload()); document.body.appendChild(b);
  };
  const claim = () => { try { localStorage.setItem(KEY, JSON.stringify({ id, at: Date.now() })); } catch {} ch?.postMessage({ claim: id }); };
  ch?.addEventListener('message', e => { if (e.data?.claim && e.data.claim !== id) lose(); });
  addEventListener('storage', e => { if (e.key !== KEY || !e.newValue) return; try { if (JSON.parse(e.newValue).id !== id) lose(); } catch {} });
  claim();
  return { id, lose };
}
