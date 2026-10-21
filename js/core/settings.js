// R200 (Jannik GO 19/10): the player's settings, shared by the start screen and the in-game menu. A classic script (not a module) so
// both pages read it before anything else runs. Each setting lives where the game already reads it:
//   graphics  'tgw.qualityForce'            '' = Auto (desktop High; phones adapt), 'desktop' = High, 'mobile-high' = Medium, 'mobile-low' = Low
//   motion    'dymGame.entry.reduceMotion'  '1' = reduce motion
//   sound     'tgw.sound'                   'off' = muted
//   mouse     'tgw.mouseSens'               R212: desktop mouse-look sensitivity, x1 (0.2 to 3)
//   smoothing 'tgw.mouseSmooth'             R212: 'off' = the camera follows the mouse without its soft lag
// Sound: the game has almost no audio yet (a few synthesised tones), so the switch works on the one thing every sound goes through:
// each AudioContext the page makes is suspended while sound is off and resumed when it is turned on again. Future audio follows the
// switch without its own code. Fails soft: no storage = defaults.
(function () {
  var GFX = 'tgw.qualityForce', MOTION = 'dymGame.entry.reduceMotion', SOUND = 'tgw.sound', MOUSE = 'tgw.mouseSens', SMOOTH = 'tgw.mouseSmooth';
  var read = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var write = function (k, v) { try { if (v == null || v === '') localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  var contexts = [], listeners = [];
  var S = window.TGW_SETTINGS = {
    GRAPHICS: [['', 'Auto'], ['desktop', 'High'], ['mobile-high', 'Medium'], ['mobile-low', 'Low']],
    graphics: function () { var v = read(GFX) || ''; return /^(desktop|mobile-high|mobile-low)$/.test(v) ? v : ''; },
    setGraphics: function (v) { write(GFX, v || null); S.emit('graphics', S.graphics()); },
    motion: function () { return read(MOTION) === '1'; },
    setMotion: function (on) { write(MOTION, on ? '1' : null); S.emit('motion', !!on); },
    sound: function () { return read(SOUND) !== 'off'; },
    setSound: function (on) { write(SOUND, on ? null : 'off'); S.applySound(); S.emit('sound', !!on); },
    applySound: function () { var on = S.sound(); contexts.forEach(function (c) { try { if (on) { if (c.state === 'suspended') c.__tgwResume(); } else if (c.state === 'running') c.suspend(); } catch (e) {} }); },
    mouseSens: function () { var v = parseFloat(read(MOUSE)); return isFinite(v) ? Math.min(3, Math.max(.2, v)) : 1; },
    setMouseSens: function (v) { v = Math.min(3, Math.max(.2, +v || 1)); write(MOUSE, Math.abs(v - 1) < .001 ? null : String(Math.round(v * 100) / 100)); S.emit('mouse', S.mouseSens()); },
    mouseSmooth: function () { return read(SMOOTH) !== 'off'; },
    setMouseSmooth: function (on) { write(SMOOTH, on ? null : 'off'); S.emit('smooth', !!on); },
    on: function (fn) { listeners.push(fn); },
    emit: function (k, v) { listeners.forEach(function (fn) { try { fn(k, v); } catch (e) {} }); }
  };
  // the sound gate: every AudioContext made on this page is known, starts suspended while muted and cannot be resumed while muted
  try {
    ['AudioContext', 'webkitAudioContext'].forEach(function (name) {
      var Orig = window[name]; if (!Orig || Orig.__tgw) return;
      var Gated = function (opts) { var c = opts === undefined ? new Orig() : new Orig(opts); var res = c.resume.bind(c); c.__tgwResume = res;
        c.resume = function () { return S.sound() ? res() : Promise.resolve(); }; contexts.push(c); if (!S.sound()) { try { c.suspend(); } catch (e) {} } return c; };
      Gated.prototype = Orig.prototype; Gated.__tgw = true; window[name] = Gated;
    });
  } catch (e) {}
})();
