// @ts-nocheck
// Camera/control variants. Since R50.3 'free' is the default on every device (Jannik: "A GO");
// on desktop it adds right-mouse drag to look and wheel zoom. Other variants stay DEV-only. They never edit the locked ThirdPersonCamera or
// CharacterController code: a variant swaps a few methods on the live camera instance and
// restores the originals for 'standard'. Selected from the Dev menu, remembered per device.
//
// Research basis (mobile third-person conventions):
// - 'free'  : Genshin / Roblox-style. The camera does not turn with the character; the right
//             thumb owns the camera, and it only drifts back behind you after a few seconds of
//             walking without touching it. Movement stays camera-relative, so holding the stick
//             sideways strafes in an arc instead of circling forever.
// - 'cozy'  : Animal Crossing / Pocket Camp-style. Fixed, high three-quarter camera that never
//             rotates; one thumb is enough, directions on the stick always match the screen.
import * as THREE from 'three';
import { damp, wrapAngle } from '../visual/VisualKit.js';

export const CONTROL_PROFILE_KEY = 'tgw.controlProfile';
export const PROFILES = {
  standard: { name: 'Klassisk (R45)', text: 'Det gamle kamera: følger figurens retning.' },
  free: { name: 'A · Frit kamera (standard)', text: 'Kameraet drejer kun når du swiper (højre side). PC: hold højre musetast og træk, hjul zoomer. Glider selv bag dig efter ~2,5 s gang.' },
  cozy: { name: 'B · Cozy ovenfra', text: 'Fast højt kamera der aldrig drejer. Joysticket matcher skærmen. Kun én tommelfinger.' }
};

export function defaultProfile() { return 'free'; }
export function savedProfile() { try { return localStorage.getItem(CONTROL_PROFILE_KEY) || defaultProfile(); } catch { return defaultProfile(); } }

const ORIGINAL = Symbol('tgwOriginalCamera');

// Shared tail of ThirdPersonCamera.update (position smoothing, look target, occlusion).
function finish(cam, dt, lead = .28) {
  cam.desired(cam.tmp);
  cam.basePosition.lerp(cam.tmp, damp(cam.posDamp || 5.4, dt));   // R212: 'Mouse smoothing' off follows faster while the mouse steers
  const p = cam.target.position, v = cam.target.velocity, h = cam.contract.cameraTargetHeight || .62;
  cam._lookTarget ||= new THREE.Vector3();
  cam._lookTarget.set(p.x + v.x * lead, p.y + h + (cam.lookLift || 0), p.z + v.z * lead);   // R212: lookLift tilts the view up past the ground limit
  cam.look.lerp(cam._lookTarget, damp(8.5, dt));
  cam.occlusionStart.set(p.x, p.y + h, p.z);
  if (cam.occlusion) cam.occlusion.resolve(cam.occlusionStart, cam.basePosition, dt, cam.position);
  else cam.position.copy(cam.basePosition);
  cam.camera.position.copy(cam.position);
  cam.camera.lookAt(cam.look);
}

function setFov(cam, portrait, landscape) {
  const f = cam.camera.aspect < .8 ? portrait : landscape;
  if (Math.abs(cam.camera.fov - f) > .01) { cam.camera.fov = f; cam.camera.updateProjectionMatrix(); }
}

// Desktop mouse-look for 'free': hold the RIGHT button and drag (left stays free for UI), wheel zooms.
// Installed once; it only acts while the free profile is active on that camera.
function installMouse(game, cam) {
  if (cam._mouseInstalled) return; cam._mouseInstalled = true;
  const el = game.renderer.domElement; let drag = null;
  const desk = !game.input?.isTouch;
  el.addEventListener('contextmenu', e => { if (cam.profileId === 'free') e.preventDefault(); });
  // R215 (Jannik GO A 21/10): on desktop the cursor aims (AimMarker) and the view turns while the RIGHT mouse button is held. While held,
  // the mouse is captured (pointer lock, the cursor stays where it was) and turns the view at the R212 rate x 'Mouse sensitivity';
  // where the browser refuses the lock, the plain drag below turns it.
  const locked = () => document.pointerLockElement === el;
  el.addEventListener('pointerdown', e => {
    if (cam.profileId !== 'free' || e.pointerType !== 'mouse' || e.button !== 2) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; el.setPointerCapture?.(e.pointerId); e.preventDefault();
    if (desk && el.requestPointerLock) requestLock(el);
  });
  const turn = (dx, dy) => {
    const k = desk ? MOUSE_RAD * sens() : .0045;
    cam.freeYaw = wrapAngle(cam.freeYaw - dx * k);
    const R = cam.wide ? WIDE : NARROW; cam.freePitch = THREE.MathUtils.clamp(cam.freePitch + dy * (desk ? k : .0026), R[0] - REST, R[1] - REST);
    cam.idleLook = 0;
  };
  el.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id || locked()) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; turn(dx, dy);
  });
  document.addEventListener('mousemove', e => { if (drag && locked() && cam.profileId === 'free') turn(e.movementX || 0, e.movementY || 0); });
  const end = e => { if (drag && e.pointerId === drag.id) { drag = null; el.releasePointerCapture?.(e.pointerId); if (locked()) document.exitPointerLock?.(); } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  document.addEventListener('mouseup', e => { if (e.button === 2 && drag) { drag = null; if (locked()) document.exitPointerLock?.(); } });
  document.addEventListener('pointerlockchange', () => { document.body.classList.toggle('tgw-view-turn', locked()); if (!locked()) drag = null; });
  el.addEventListener('wheel', e => {
    if (cam.profileId !== 'free') return; e.preventDefault();
    cam.freeZoom = THREE.MathUtils.clamp((cam.freeZoom || 1) * (e.deltaY > 0 ? 1.08 : 1 / 1.08), .65, 1.45);
  }, { passive: false });
  if (desk) {
    // the cursor for AimMarker: where it is and whether it is over the game view (over the HUD the normal cursor shows)
    const ptr = cam.cursor = { x: innerWidth / 2, y: innerHeight * .4, over: false };
    document.addEventListener('mousemove', e => { if (locked()) return; ptr.x = e.clientX; ptr.y = e.clientY; ptr.over = e.target === el; });
    document.documentElement.addEventListener('mouseleave', () => { ptr.over = false; });
    const applySmooth = () => { const sn = !smooth(); cam.posDamp = sn ? 30 : 0; cam.yawDamp = sn ? 40 : 0; };
    cam.applySmooth = applySmooth; applySmooth();
    try { globalThis.TGW_SETTINGS?.on?.(k => { if (k === 'smooth' && cam.profileId === 'free') applySmooth(); }); } catch {}
  }
}

// R210 pointer lock mouse-look (the mouse turned the view all the time) was replaced in R215 by the cursor aim above (Jannik GO A 21/10).
// R212 (Jannik GO 21/10, 'as close to ARK as possible'): ARK's exact turn rate is not published, so the base is Unreal Engine 4's
// default (0.07 x 2.5 = 0.175 degrees per mouse count, both axes) with raw mouse input where the browser offers it, a 'Mouse
// sensitivity' slider (x0.2 to x3) and 'Mouse smoothing' (on like ARK; off = the camera follows without lag). The tilt range is wide:
// from looking up into the sky (character at the bottom of the frame) to almost straight down (GO for the locked camera, same day).
const MOUSE_RAD = .175 * Math.PI / 180, REST = .34, WIDE = [-.32, 1.2], NARROW = [.14, .66];
const sens = () => { try { return globalThis.TGW_SETTINGS?.mouseSens?.() ?? 1; } catch { return 1; } };
const smooth = () => { try { return globalThis.TGW_SETTINGS?.mouseSmooth?.() !== false; } catch { return true; } };
function requestLock(el) {
  const plain = () => { try { el.requestPointerLock()?.catch?.(() => {}); } catch {} };
  try { const r = el.requestPointerLock({ unadjustedMovement: true }); if (r?.catch) r.catch(plain); } catch { plain(); }   // raw input (no OS acceleration) where supported
}

export function applyControlProfile(game, id) {
  const cam = game.followCamera; if (!cam) return 'standard';
  if (!cam[ORIGINAL]) cam[ORIGINAL] = { distance: cam.distance, wantedYaw: cam.wantedYaw, applyTouchLook: cam.applyTouchLook, desired: cam.desired, update: cam.update, snap: cam.snap };
  const o = cam[ORIGINAL];
  Object.assign(cam, o);                  // restore standard first
  cam.profileId = 'standard';
  cam.lookLift = 0; cam.wide = false; cam.posDamp = 0; cam.yawDamp = 0;   // R212: the mouse-look extras belong to 'free' only
  game.cameraOcclusion?.setFreeRules?.(false); // R45 classic keeps the R21 collision rules
  const hint = document.getElementById('hint'); if (hint) hint.textContent = 'WASD to move · Shift to run · Space to hop · camera follows your back';
  game.resize?.();                        // standard FOV per aspect
  if (!PROFILES[id] || id === 'standard') { cam.manualYaw = 0; cam.manualPitch = 0; return 'standard'; }

  if (id === 'free') {
    cam.profileId = 'free'; installMouse(game, cam); cam.wide = !game.input?.isTouch; cam.applySmooth?.();   // R212: desktop tilts ARK-wide
    game.cameraOcclusion?.setFreeRules?.(true);   // R58.2: ride over low props, pass trunks, lift instead of collapsing
    cam.inBoat = () => game.fishing?.boat?.on && game.fishing.mode === 'boat';
    if (hint) hint.textContent = game.input?.isTouch ? 'WASD to move · Shift to run · Space to hop · left click to strike · hold right mouse to look · wheel to zoom' : 'WASD to move · the mouse aims · left click to strike · hold right mouse to turn the view · wheel to zoom · Esc for the menu';
    cam.freeYaw = cam.yaw; cam.freePitch = 0; cam.idleLook = 99; cam.freeZoom = cam.freeZoom || 1;
    cam.distance = function () { return (this.camera.aspect < .8 ? 7.0 : 5.8) * (this.freeZoom || 1); };
    cam.wantedYaw = function () { return this.freeYaw; };
    cam.applyTouchLook = function (delta) {
      if (!delta) return; const dx = +delta.x || 0, dy = +delta.y || 0;
      if (Math.abs(dx) < .01 && Math.abs(dy) < .01) return;
      this.freeYaw = wrapAngle(this.freeYaw - dx * .0062);
      this.freePitch = THREE.MathUtils.clamp(this.freePitch + dy * .0032, -.18, .28);
      this.idleLook = 0;
    };
    cam.desired = function (out) {
      const R = this.wide ? WIDE : NARROW, want = THREE.MathUtils.clamp(REST + this.freePitch, R[0], R[1]);
      const d = this.distance(), pitch = Math.max(want, this.wide ? .06 : R[0]);   // R212: below this the camera stays low and the view tilts up instead
      const p = this.target.position, hz = Math.cos(pitch) * d;
      out.set(p.x + Math.sin(this.yaw) * hz, p.y + .55 + Math.sin(pitch) * d, p.z + Math.cos(this.yaw) * hz);
      out.y = Math.max(out.y, (this.target.world?.groundHeight?.(out.x, out.z) ?? 0) + .7);
      const h = this.contract?.cameraTargetHeight || .62;
      this.lookLift = want < pitch ? Math.max(0, out.y - (p.y + h) - hz * Math.tan(want)) : 0;
      return out;
    };
    cam.update = function (dt) {
      setFov(this, 60, 52);
      this.idleLook += dt;
      // R58.1: in the boat the character's speed is always 0 (it is seated), so the walking rule
      // never fired and the camera froze at the boarding angle. Boat → always glide back behind
      // the boat; a swipe gives a short look-around (1.2 s) before it returns.
      const boating = this.inBoat?.(), lock = this.lockYaw?.();  // R63.1 boss: glide behind you, facing the Giant
      if (lock != null) { if (this.idleLook > 1.2) this.freeYaw = wrapAngle(this.freeYaw + wrapAngle(lock - this.freeYaw) * damp(2.4, dt)); }
      else if (boating) { if (this.idleLook > 1.2) this.freeYaw = wrapAngle(this.freeYaw + wrapAngle(this.target.heading + Math.PI - this.freeYaw) * damp(2.4, dt)); }
      else {
        // Lazy recenter: only while walking forward-ish and the camera hasn't been touched for 2.5 s. R216: never with the desktop cursor
        // aim (W walks toward the cursor; a camera that turned after the character would move the cursor's ground point and circle).
        const moving = (this.target.currentSpeed || 0) > .6 && !this.target.reverseIntentActive;
        if (moving && this.idleLook > 2.5 && !this.cursorAim) this.freeYaw = wrapAngle(this.freeYaw + wrapAngle(this.target.heading + Math.PI - this.freeYaw) * damp(.85, dt));
      }
      this.yaw = wrapAngle(this.yaw + wrapAngle(this.freeYaw - this.yaw) * damp(this.yawDamp || 12, dt));
      finish(this, dt, .34);
    };
    cam.snap = function () { this.freeYaw = wrapAngle(this.target.heading + Math.PI); o.snap.call(this); this.yaw = this.freeYaw; };
    return 'free';
  }

  if (id === 'cozy') {
    cam.profileId = 'cozy';
    // Keep the current view direction, squared to the nearest 45 degrees, and never rotate again.
    cam.cozyYaw = Math.round(cam.yaw / (Math.PI / 4)) * (Math.PI / 4);
    cam.distance = function () { return this.camera.aspect < .8 ? 11.5 : 9.8; };
    cam.wantedYaw = function () { return this.cozyYaw; };
    cam.applyTouchLook = function () {};   // swipe-up hop still works (handled by InputManager)
    cam.desired = function (out) {
      const d = this.distance(), pitch = .86, p = this.target.position, hz = Math.cos(pitch) * d;
      out.set(p.x + Math.sin(this.yaw) * hz, p.y + .4 + Math.sin(pitch) * d, p.z + Math.cos(this.yaw) * hz);
      return out;
    };
    cam.update = function (dt) {
      setFov(this, 46, 40);
      this.yaw = this.cozyYaw;
      finish(this, dt, .18);
    };
    cam.snap = function () { o.snap.call(this); this.yaw = this.cozyYaw; this.desired(this.basePosition); this.position.copy(this.basePosition); this.camera.position.copy(this.position); };
    cam.yaw = cam.cozyYaw;
    return 'cozy';
  }
}
