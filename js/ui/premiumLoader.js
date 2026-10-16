// R186 (Jannik GO 16/10, ?ring=premium only): the loading cover after 'Continue as …' / Play. A classic script that runs before the game's
// modules arrive: the premium world softly out of focus behind drifting pollen, the chosen character (its portrait) breathing in the middle,
// a sprout that grows one leaf per real loading step and blooms when the premium garden is ready, and a line that says which step it is on.
// The steps are real (no fake percentage): 0 start, 1 the game's systems exist, 2 the world is built, 3 the premium garden is built,
// done() = its bloom is on. CharacterSwapSpot drives it through window.TGW_LOAD; a 30 s failsafe lifts it whatever happens.
(function () {
  try {
    var q = new URLSearchParams(location.search), r = q.get('ring');
    if (!(r === 'premium' || (r !== 'classic' && localStorage.getItem('tgw.ring') === 'premium'))) return;
    var NAMES = { tulip: 'Tulip', daisy: 'Daisy', hyacinth: 'Hyacinth', cactus: 'Cactus', fern: 'Fern', succulent: 'Succulent', spire: 'Spire', swamp: 'Swamp', aloe: 'Aloe Vera' };
    var V2 = { cactus: 1, aloe: 1, swamp: 1 };
    var id = q.get('char'); if (!NAMES[id]) { try { id = (JSON.parse(localStorage.getItem('tgw.lastChar') || 'null') || {}).id; } catch (e) { id = null; } }
    var name = NAMES[id] || 'Your sprout';
    var LINES = ['Waking your garden…', name + ' stretches…', 'The Ring is sprouting…', 'Lighting the lanterns…', 'Welcome home'];
    var css = '#tgw-premium-veil{position:fixed;inset:0;z-index:9000;overflow:hidden;pointer-events:none;background:#dfe6d6;transition:opacity .9s ease;font-family:system-ui,-apple-system,sans-serif}'
      + '#tgw-premium-veil .pl-bg{position:absolute;inset:-40px;background:url(./assets/ui/selector/world_v2.webp?v=R183) center/cover no-repeat;filter:blur(7px) saturate(1.05);transform:scale(1.06);animation:plDrift 26s ease-in-out infinite alternate}'
      + '#tgw-premium-veil .pl-shade{position:absolute;inset:0;background:radial-gradient(55% 60% at 50% 46%,rgba(246,241,226,.55) 0%,rgba(223,230,214,.35) 55%,rgba(40,52,34,.38) 100%)}'
      + '#tgw-premium-veil .pl-mote{position:absolute;bottom:-12px;width:6px;height:6px;border-radius:50%;background:radial-gradient(circle,#fff6d8 0%,rgba(255,236,170,.0) 70%);opacity:0;animation:plMote linear infinite}'
      + '#tgw-premium-veil .pl-col{position:absolute;left:50%;top:50%;transform:translate(-50%,-54%);display:flex;flex-direction:column;align-items:center;gap:14px;width:min(86vw,420px)}'
      + '#tgw-premium-veil .pl-face{width:clamp(112px,19vmin,176px);aspect-ratio:1;border-radius:50%;overflow:hidden;background:#cdd8c0;box-shadow:0 0 0 4px rgba(255,248,230,.85),0 0 0 7px rgba(59,47,34,.28),0 14px 34px rgba(30,40,24,.35);animation:plBreathe 3.2s ease-in-out infinite}'
      + '#tgw-premium-veil .pl-face img{width:100%;height:100%;object-fit:cover;display:block}'
      + '#tgw-premium-veil svg{width:clamp(96px,15vmin,132px);height:auto;overflow:visible;margin-top:10px}'
      + '#tgw-premium-veil .pl-stem{stroke-dasharray:60;stroke-dashoffset:60;transition:stroke-dashoffset 1.1s ease}'
      + '#tgw-premium-veil .pl-leaf{transform-box:fill-box;transform:scale(0);transition:transform .9s cubic-bezier(.3,1.6,.5,1)}'
      + '#tgw-premium-veil .pl-leaf.l0{transform-origin:100% 100%}#tgw-premium-veil .pl-leaf.l1{transform-origin:0% 100%}#tgw-premium-veil .pl-leaf.l2{transform-origin:100% 100%}'
      + '#tgw-premium-veil .pl-bloom{transform-box:fill-box;transform-origin:50% 100%;transform:scale(0);transition:transform 1s cubic-bezier(.3,1.7,.5,1)}'
      + '#tgw-premium-veil .pl-bud{transform-box:fill-box;transform-origin:50% 100%;transform:scale(0);transition:transform .8s ease}'
      + '#tgw-premium-veil .on{transform:scale(1)}#tgw-premium-veil .pl-stem.on{stroke-dashoffset:var(--o,0)}'
      + '#tgw-premium-veil .pl-line{min-height:1.4em;color:#3f4a36;font-weight:800;font-size:12px;letter-spacing:.2em;text-transform:uppercase;text-align:center;text-shadow:0 1px 0 rgba(255,250,236,.7);transition:opacity .45s ease}'
      + '@keyframes plDrift{to{transform:scale(1.12) translate(-1.5%,-1%)}}'
      + '@keyframes plBreathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-5px) scale(1.025)}}'
      + '@keyframes plMote{0%{transform:translate(0,0);opacity:0}15%{opacity:.9}85%{opacity:.6}100%{transform:translate(var(--dx),-105vh);opacity:0}}'
      + '@media (prefers-reduced-motion:reduce){#tgw-premium-veil *{animation:none!important}}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var v = document.createElement('div'); v.id = 'tgw-premium-veil';
    var motes = ''; for (var i = 0; i < 16; i++) { var s = 3 + (i * 7) % 6; motes += '<i class="pl-mote" style="left:' + ((i * 37) % 100) + '%;width:' + s + 'px;height:' + s + 'px;--dx:' + ((i % 2 ? 1 : -1) * (10 + (i * 13) % 50)) + 'px;animation-duration:' + (9 + (i * 5) % 9) + 's;animation-delay:' + (-(i * 1.3) % 12) + 's"></i>'; }
    var src = id ? './assets/ui/selector/' + id + (V2[id] ? '_v2' : '') + '.webp' : '';
    v.innerHTML = '<div class="pl-bg"></div><div class="pl-shade"></div>' + motes
      + '<div class="pl-col">' + (src ? '<div class="pl-face"><img alt="" src="' + src + '" onerror="this.parentNode.style.display=\'none\'"></div>' : '')
      + '<svg viewBox="0 0 100 78" aria-hidden="true">'
      + '<ellipse cx="50" cy="72" rx="30" ry="6" fill="#6b5137" opacity=".85"/><ellipse cx="50" cy="70" rx="24" ry="3.6" fill="#86684a"/>'
      + '<path class="pl-stem" d="M50 70 C50 58 47 48 50 36 C52 28 50 20 50 14" fill="none" stroke="#5f8a3a" stroke-width="3.2" stroke-linecap="round"/>'
      + '<path class="pl-leaf l0" d="M49 58 C40 58 33 53 31 46 C39 45 46 49 49 58Z" fill="#7fae4a"/>'
      + '<path class="pl-leaf l1" d="M51 46 C60 46 68 41 70 33 C61 32 54 37 51 46Z" fill="#8fbd55"/>'
      + '<path class="pl-leaf l2" d="M49 34 C42 33 37 28 36 22 C43 22 48 26 49 34Z" fill="#9ccb5e"/>'
      + '<g class="pl-bud"><ellipse cx="50" cy="12" rx="4" ry="5.5" fill="#e9a35a"/></g>'
      + '<g class="pl-bloom">' + [0, 72, 144, 216, 288].map(function (a) { return '<ellipse cx="50" cy="5" rx="4.6" ry="7.4" fill="#f3c46a" transform="rotate(' + a + ' 50 12)"/>'; }).join('') + '<circle cx="50" cy="12" r="3.6" fill="#c8603a"/></g>'
      + '</svg><div class="pl-line">' + LINES[0] + '</div></div>';
    document.body.appendChild(v);
    var line = v.querySelector('.pl-line'), stem = v.querySelector('.pl-stem'), leaves = v.querySelectorAll('.pl-leaf'), bud = v.querySelector('.pl-bud'), bloom = v.querySelector('.pl-bloom'), at = 0, gone = false;
    var say = function (t) { line.style.opacity = '0'; setTimeout(function () { line.textContent = t; line.style.opacity = '1'; }, 300); };
    var show = function (n) { stem.style.setProperty('--o', String(Math.round(60 - 60 * Math.min(1, (n + 1) / 4)))); stem.classList.add('on'); for (var k = 0; k < leaves.length; k++) if (k < n) leaves[k].classList.add('on'); if (n >= 3) bud.classList.add('on'); };
    requestAnimationFrame(function () { show(0); });
    var lift = function () { if (gone) return; gone = true; v.style.opacity = '0'; setTimeout(function () { v.remove(); }, 1000); };
    window.TGW_LOAD = {
      stage: function (n) { if (gone || n <= at) return; at = n; show(n); say(LINES[Math.min(n, 3)]); },
      done: function () { if (gone) return; window.TGW_LOAD.stage(3); bud.classList.add('on'); bloom.classList.add('on'); say(LINES[4]); setTimeout(lift, 900); }
    };
    setTimeout(lift, 30000);
  } catch (e) { var o = document.getElementById('tgw-premium-veil'); if (o) o.remove(); }
})();
