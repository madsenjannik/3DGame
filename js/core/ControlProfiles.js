// @ts-nocheck
// Camera/control variants. Since R50.2 'free' is the default on touch devices (Jannik: "A GO");
// desktop keeps 'standard' (no mouse-look yet). Other variants stay DEV-only. They never edit the locked ThirdPersonCamera or
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
  standard: { name: 'Klassisk (R45 / PC-standard)', text: 'Kameraet følger figurens retning. Standard på PC.' },
  free: { name: 'A · Frit kamera (mobil-standard)', text: 'Kameraet drejer kun når du swiper (højre side). Glider selv bag dig efter ~2,5 s gang. Lidt længere væk, mere horisont.' },
  cozy: { name: 'B · Cozy ovenfra', text: 'Fast højt kamera der aldrig drejer. Joysticket matcher skærmen. Kun én tommelfinger.' }
};

export function defaultProfile(isTouch) { return isTouch ? 'free' : 'standard'; }
export function savedProfile(isTouch) { try { return localStorage.getItem(CONTROL_PROFILE_KEY) || defaultProfile(isTouch); } catch { return defaultProfile(isTouch); } }

const ORIGINAL = Symbol('tgwOriginalCamera');

// Shared tail of ThirdPersonCamera.update (position smoothing, look target, occlusion).
function finish(cam, dt, lead = .28) {
  cam.desired(cam.tmp);
  cam.basePosition.lerp(cam.tmp, damp(5.4, dt));
  const p = cam.target.position, v = cam.target.velocity, h = cam.contract.cameraTargetHeight || .62;
  cam._lookTarget ||= new THREE.Vector3();
  cam._lookTarget.set(p.x + v.x * lead, p.y + h, p.z + v.z * lead);
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

export function applyControlProfile(game, id) {
  const cam = game.followCamera; if (!cam) return 'standard';
  if (!cam[ORIGINAL]) cam[ORIGINAL] = { distance: cam.distance, wantedYaw: cam.wantedYaw, applyTouchLook: cam.applyTouchLook, desired: cam.desired, update: cam.update, snap: cam.snap };
  const o = cam[ORIGINAL];
  Object.assign(cam, o);                  // restore standard first
  game.resize?.();                        // standard FOV per aspect
  if (!PROFILES[id] || id === 'standard') { cam.manualYaw = 0; cam.manualPitch = 0; return 'standard'; }

  if (id === 'free') {
    cam.freeYaw = cam.yaw; cam.freePitch = 0; cam.idleLook = 99;
    cam.distance = function () { return this.camera.aspect < .8 ? 7.0 : 5.8; };
    cam.wantedYaw = function () { return this.freeYaw; };
    cam.applyTouchLook = function (delta) {
      if (!delta) return; const dx = +delta.x || 0, dy = +delta.y || 0;
      if (Math.abs(dx) < .01 && Math.abs(dy) < .01) return;
      this.freeYaw = wrapAngle(this.freeYaw - dx * .0062);
      this.freePitch = THREE.MathUtils.clamp(this.freePitch + dy * .0032, -.18, .28);
      this.idleLook = 0;
    };
    cam.desired = function (out) {
      const d = this.distance(), pitch = THREE.MathUtils.clamp(.34 + this.freePitch, .14, .66);
      const p = this.target.position, hz = Math.cos(pitch) * d;
      out.set(p.x + Math.sin(this.yaw) * hz, p.y + .55 + Math.sin(pitch) * d, p.z + Math.cos(this.yaw) * hz);
      out.y = Math.max(out.y, (this.target.world?.groundHeight?.(out.x, out.z) ?? 0) + .7);
      return out;
    };
    cam.update = function (dt) {
      setFov(this, 60, 52);
      this.idleLook += dt;
      // Lazy recenter: only while walking forward-ish and the camera hasn't been touched for 2.5 s.
      const moving = (this.target.currentSpeed || 0) > .6 && !this.target.reverseIntentActive;
      if (moving && this.idleLook > 2.5) this.freeYaw = wrapAngle(this.freeYaw + wrapAngle(this.target.heading + Math.PI - this.freeYaw) * damp(.85, dt));
      this.yaw = wrapAngle(this.yaw + wrapAngle(this.freeYaw - this.yaw) * damp(12, dt));
      finish(this, dt, .34);
    };
    cam.snap = function () { this.freeYaw = wrapAngle(this.target.heading + Math.PI); o.snap.call(this); this.yaw = this.freeYaw; };
    return 'free';
  }

  if (id === 'cozy') {
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
