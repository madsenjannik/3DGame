// R187 (Jannik 16/10): no portrait; the sprout and its line sit in the middle.
// R186 (Jannik GO 16/10, ?ring=premium only): the loading cover after 'Continue as …' / Play. A classic script that runs before the game's
// modules arrive: the premium world softly out of focus behind drifting pollen, a sprout that grows one leaf per real loading step and blooms when the premium garden is ready, and a line that says which step it is on.
// The steps are real (no fake percentage): 0 start, 1 the game's systems exist, 2 the world is built, 3 the premium garden is built,
// done() = its bloom is on. CharacterSwapSpot drives it through window.TGW_LOAD; a 30 s failsafe lifts it whatever happens.
(function () {
  try {
    var q = new URLSearchParams(location.search), r = q.get('ring');
    if (!(r === 'premium' || (r !== 'classic' && localStorage.getItem('tgw.ring') === 'premium'))) return;
    var NAMES = { tulip: 'Tulip', daisy: 'Daisy', hyacinth: 'Hyacinth', cactus: 'Cactus', fern: 'Fern', succulent: 'Succulent', spire: 'Spire', swamp: 'Swamp', aloe: 'Aloe Vera' };
    var id = q.get('char'); if (!NAMES[id]) { try { id = (JSON.parse(localStorage.getItem('tgw.lastChar') || 'null') || {}).id; } catch (e) { id = null; } }
    var name = NAMES[id] || 'Your sprout';
    var LINES = ['Waking your garden…', name + ' stretches…', 'The Ring is sprouting…', 'Lighting the lanterns…', 'Welcome home'];
    var css = '#tgw-premium-veil{position:fixed;inset:0;z-index:9000;overflow:hidden;pointer-events:none;background:#dfe6d6;transition:opacity .6s ease;font-family:system-ui,-apple-system,sans-serif}'
      + '#tgw-premium-veil .pl-bg{position:absolute;inset:-40px;background:url(./assets/ui/selector/world_v2.webp?v=R183) center/cover no-repeat;filter:blur(7px) saturate(1.05);transform:scale(1.06);animation:plDrift 26s ease-in-out infinite alternate}'
      + '#tgw-premium-veil .pl-shade{position:absolute;inset:0;background:radial-gradient(55% 60% at 50% 46%,rgba(246,241,226,.55) 0%,rgba(223,230,214,.35) 55%,rgba(40,52,34,.38) 100%)}'
      + '#tgw-premium-veil .pl-mote{position:absolute;bottom:-12px;width:6px;height:6px;border-radius:50%;background:radial-gradient(circle,#fff6d8 0%,rgba(255,236,170,.0) 70%);opacity:0;animation:plMote linear infinite}'
      + '#tgw-premium-veil .pl-col{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:14px;width:min(86vw,420px)}'
      // R207 (Jannik 21/10: 'the flower itself must be smooth too'): each part is its own layer (a div with its own SVG over the same viewBox)
      // animated with transform only, so the compositor runs it smoothly while the game loads (the stem's stroke-dashoffset and the SVG-element
      // scales ran on the busy main thread and stuttered); calm ease-out curves, and a slow sway so it is never quite still
      + '#tgw-premium-veil .pl-sprout{position:relative;width:clamp(120px,19vmin,170px);aspect-ratio:100/78;transform-origin:50% 90%;animation:plSway 5.5s ease-in-out infinite alternate}'
      + '#tgw-premium-veil .pl-part{position:absolute;inset:0;will-change:transform}#tgw-premium-veil .pl-part svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}'
      + '#tgw-premium-veil .pl-stem{transform-origin:50% 89.7%;transform:scaleY(0);transition:transform 1.3s cubic-bezier(.22,1,.36,1)}'
      + '#tgw-premium-veil .pl-leaf{transform:scale(0) rotate(-24deg);transition:transform 1s cubic-bezier(.22,1,.36,1)}'
      + '#tgw-premium-veil .pl-leaf.l0{transform-origin:49% 74.4%}#tgw-premium-veil .pl-leaf.l1{transform-origin:51% 59%;transform:scale(0) rotate(24deg)}#tgw-premium-veil .pl-leaf.l2{transform-origin:49% 43.6%}'
      + '#tgw-premium-veil .pl-bud{transform-origin:50% 22.4%;transform:scale(0);transition:transform 1s cubic-bezier(.22,1,.36,1)}'
      + '#tgw-premium-veil .pl-bloom{transform-origin:50% 15.4%;transform:scale(0) rotate(-40deg);transition:transform 1.2s cubic-bezier(.22,1,.36,1)}'
      + '#tgw-premium-veil .pl-part.on{transform:none}'
      + '@keyframes plSway{from{transform:rotate(-1.6deg)}to{transform:rotate(1.6deg)}}'
      + '#tgw-premium-veil .pl-line{min-height:1.4em;color:#3f4a36;font-weight:800;font-size:12px;letter-spacing:.2em;text-transform:uppercase;text-align:center;text-shadow:0 1px 0 rgba(255,250,236,.7);transition:opacity .45s ease}'
      + '#tgw-premium-veil .pl-t{display:inline-block;animation:plIn .5s cubic-bezier(.33,1,.68,1) both}'
      + '@keyframes plIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}'
      + '@keyframes plDrift{to{transform:scale(1.12) translate(-1.5%,-1%)}}'
      + ''
      + '@keyframes plMote{0%{transform:translate(0,0);opacity:0}15%{opacity:.9}85%{opacity:.6}100%{transform:translate(var(--dx),-105vh);opacity:0}}'
      + '@media (prefers-reduced-motion:reduce){#tgw-premium-veil *{animation:none!important}}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var v = document.createElement('div'); v.id = 'tgw-premium-veil';
    var part = function (cls, inner) { return '<div class="pl-part ' + cls + '"><svg viewBox="0 0 100 78">' + inner + '</svg></div>'; };
    var motes = ''; for (var i = 0; i < 16; i++) { var s = 3 + (i * 7) % 6; motes += '<i class="pl-mote" style="left:' + ((i * 37) % 100) + '%;width:' + s + 'px;height:' + s + 'px;--dx:' + ((i % 2 ? 1 : -1) * (10 + (i * 13) % 50)) + 'px;animation-duration:' + (9 + (i * 5) % 9) + 's;animation-delay:' + (-(i * 1.3) % 12) + 's"></i>'; }
    v.innerHTML = '<div class="pl-bg"></div><div class="pl-shade"></div>' + motes
      + '<div class="pl-col">'
      + '<div class="pl-sprout" aria-hidden="true">'
      + part('', '<ellipse cx="50" cy="72" rx="30" ry="6" fill="#6b5137" opacity=".85"/><ellipse cx="50" cy="70" rx="24" ry="3.6" fill="#86684a"/>')
      + part('pl-stem', '<path d="M50 70 C50 58 47 48 50 36 C52 28 50 20 50 14" fill="none" stroke="#5f8a3a" stroke-width="3.2" stroke-linecap="round"/>')
      + part('pl-leaf l0', '<path d="M49 58 C40 58 33 53 31 46 C39 45 46 49 49 58Z" fill="#7fae4a"/>')
      + part('pl-leaf l1', '<path d="M51 46 C60 46 68 41 70 33 C61 32 54 37 51 46Z" fill="#8fbd55"/>')
      + part('pl-leaf l2', '<path d="M49 34 C42 33 37 28 36 22 C43 22 48 26 49 34Z" fill="#9ccb5e"/>')
      + part('pl-bud', '<ellipse cx="50" cy="12" rx="4" ry="5.5" fill="#e9a35a"/>')
      + part('pl-bloom', [0, 72, 144, 216, 288].map(function (a) { return '<ellipse cx="50" cy="5" rx="4.6" ry="7.4" fill="#f3c46a" transform="rotate(' + a + ' 50 12)"/>'; }).join('') + '<circle cx="50" cy="12" r="3.6" fill="#c8603a"/>')
      + '</div><div class="pl-line"></div></div>';
    document.body.appendChild(v);
    var line = v.querySelector('.pl-line'), stem = v.querySelector('.pl-stem'), leaves = v.querySelectorAll('.pl-leaf'), bud = v.querySelector('.pl-bud'), bloom = v.querySelector('.pl-bloom'), at = 0, gone = false;
    // R196 typed each line letter by letter from a JS timer; while the game loads the main thread is busy, so it reached only a few letters
    // before the next step replaced the line. R206 (Jannik 21/10: 'set a time to show them instead'): each line appears whole with a soft
    // fade + lift (a CSS animation, smooth while JS is busy) and stays at least MIN ms; steps that come faster wait in a queue.
    var MIN = 1300, shownAt = 0, queue = [], wait = null, cur = '';
    var put = function (t) { cur = t; shownAt = performance.now(); line.innerHTML = '<span class="pl-t"></span>'; line.firstChild.textContent = t; var n = LINES.indexOf(t); if (n >= 0) requestAnimationFrame(function () { show(n); }); };   // R207: the sprout grows with the line it shows
    var pump = function () { clearTimeout(wait); wait = null; if (!queue.length) return; var left = MIN - (performance.now() - shownAt); if (left > 0) { wait = setTimeout(pump, left); return; } put(queue.shift()); if (queue.length) wait = setTimeout(pump, MIN); };
    var say = function (t) { if (t === cur || queue[queue.length - 1] === t) return; queue.push(t); if (!wait) pump(); };
    // R207: stem height per step (0: 40 %, 1: 62 %, 2: 82 %, 3+: full), leaf k from step k+1, bud at 3, bloom at 4 ('Welcome home')
    var show = function (n) { stem.style.transform = 'scaleY(' + [.4, .62, .82, 1, 1][Math.min(n, 4)] + ')'; for (var k = 0; k < leaves.length; k++) leaves[k].classList.toggle('on', k < n); bud.classList.toggle('on', n >= 3); bloom.classList.toggle('on', n >= 4); };
    say(LINES[0]);   // R206: the first line at once; R207: put() grows the sprout with it
    var lift = function () { if (gone) return; gone = true; v.style.opacity = '0'; setTimeout(function () { v.remove(); }, 650); };
    window.TGW_LOAD = {
      stage: function (n) { if (gone || n <= at) return; at = n; say(LINES[Math.min(n, 3)]); },
      // R193: bloom, then lift. R206: the steps still queued are skipped; 'Welcome home' comes once the current line has stood 0.6 s and the
      // cover lifts 0.65 s after it (at most ~1 s later than before)
      done: function () { if (gone) return; at = 3; clearTimeout(wait); wait = null; queue = [];
        setTimeout(function () { put(LINES[4]); setTimeout(lift, 900); }, Math.max(0, 600 - (performance.now() - shownAt))); }   // R207: lift once the bloom has opened
    };
    setTimeout(lift, 30000);
  } catch (e) { var o = document.getElementById('tgw-premium-veil'); if (o) o.remove(); }
})();
