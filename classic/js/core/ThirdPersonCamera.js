// @ts-nocheck
import * as THREE from 'three';
import { damp, wrapAngle } from '../visual/VisualKit.js';

export class ThirdPersonCamera {
  constructor(camera, target, contract) {
    this.camera = camera;
    this.target = target;
    this.contract = contract;

    this.yaw = wrapAngle(target.heading + Math.PI);
    // Match the accepted Garden Prototype camera composition.
    this.pitch = .43;

    this.position = new THREE.Vector3();
    this.basePosition = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.occlusionStart = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.resolved = new THREE.Vector3();
    this.occlusion = null;
    this.manualYaw = 0; this.manualPitch = 0;
  }

  setOcclusionSystem(system){
    this.occlusion=system||null;
    if(this.occlusion){
      this.occlusionStart.set(this.target.position.x,this.target.position.y+(this.contract.cameraTargetHeight||.62),this.target.position.z);
      this.occlusion.prime?.(this.occlusionStart,this.basePosition,this.position);
      this.camera.position.copy(this.position);this.camera.lookAt(this.look);
    }
  }
  setOcclusionEnabled(enabled=true){this.occlusion?.setEnabled?.(enabled);}

  distance() {
    return this.camera.aspect < .8 ? 6.30 : 5.20;
  }

  wantedYaw() {
    return wrapAngle(this.target.heading + Math.PI + this.manualYaw);
  }

  applyTouchLook(delta){
    if(!delta)return;
    const dx=Number(delta.x)||0,dy=Number(delta.y)||0;
    if(Math.abs(dx)<.01&&Math.abs(dy)<.01)return;
    this.manualYaw=wrapAngle(this.manualYaw-dx*.0048);
    this.manualPitch=THREE.MathUtils.clamp(this.manualPitch+dy*.0028,-.16,.20);
  }

  desired(out) {
    const d = this.distance();
    const pitch=THREE.MathUtils.clamp(this.pitch+this.manualPitch,.20,.63);
    const horizontal = Math.cos(pitch) * d;
    const vertical = Math.sin(pitch) * d;
    const p = this.target.position;

    out.set(
      p.x + Math.sin(this.yaw) * horizontal,
      p.y + .55 + vertical,
      p.z + Math.cos(this.yaw) * horizontal
    );

    const ground = this.target.world?.groundHeight?.(out.x, out.z) ?? 0;
    out.y = Math.max(out.y, ground + .70);
    return out;
  }

  update(dt) {
    const normalWantedYaw = this.wantedYaw();
    let targetYaw = normalWantedYaw;
    let yawDamping = 3.15;

    if (this.target.reverseIntentActive) {
      if (this.target.reverseHoldDuration <= this.target.reverseCameraDelay) {
        // Short S/back press: character faces the camera, but the camera angle
        // stays where it was instead of immediately orbiting behind the creature.
        targetYaw = this.target.reverseCameraHoldYaw;
        yawDamping = 14;
      } else {
        // Held S/back: after the brief pause, deliberately make the 180-degree
        // chase slower and readable instead of snapping around the character.
        targetYaw = normalWantedYaw;
        yawDamping = 1.18;
      }
    } else if (this.target.reverseCameraLatched) {
      // A released short tap keeps the front-facing composition until the player
      // deliberately chooses another movement direction.
      targetYaw = this.target.reverseCameraHoldYaw;
      yawDamping = 14;
    }
    else if (this.target.lateralSteeringIntensity > .12) {
      // A/D and diagonal steering should feel like a calm chase camera rather
      // than a camera glued rigidly to the creature's back. Movement remains
      // unchanged; only camera catch-up is softened while steering sideways.
      const lateral = THREE.MathUtils.clamp((this.target.lateralSteeringIntensity - .12) / .88, 0, 1);
      yawDamping = THREE.MathUtils.lerp(3.15, 1.75, lateral);
    }

    this.yaw = wrapAngle(
      this.yaw + wrapAngle(targetYaw - this.yaw) * damp(yawDamping, dt)
    );

    this.desired(this.tmp);
    this.basePosition.lerp(this.tmp, damp(5.4, dt));

    const p = this.target.position;
    const v = this.target.velocity;
    // Garden Prototype aims around 0.62 m above the feet. Keep the existing
    // per-character contract so short/tall species retain consistent framing.
    const targetHeight = this.contract.cameraTargetHeight || .62;
    const lookTarget = new THREE.Vector3(
      p.x + v.x * .28,
      p.y + targetHeight,
      p.z + v.z * .28
    );

    this.look.lerp(lookTarget, damp(8.5, dt));
    // Collision starts at the character's stable chest point, not at the
    // velocity-led visual look target. When the player pushes straight into a
    // wall the controller velocity can remain non-zero even though collision
    // resolution holds the body in place; using that velocity-led point for the
    // camera ray was the one-time "first contact" collapse seen on iPhone.
    this.occlusionStart.set(p.x,p.y+targetHeight,p.z);
    if(this.occlusion)this.occlusion.resolve(this.occlusionStart,this.basePosition,dt,this.position);
    else this.position.copy(this.basePosition);
    this.camera.position.copy(this.position);
    this.camera.lookAt(this.look);
  }

  snap() {
    this.yaw = this.wantedYaw();
    this.desired(this.basePosition);
    this.position.copy(this.basePosition);
    this.occlusion?.snap?.();
    const targetHeight=this.contract.cameraTargetHeight||.62;
    this.look.set(
      this.target.position.x,
      this.target.position.y + targetHeight,
      this.target.position.z
    );
    this.occlusionStart.copy(this.look);
    if(this.occlusion)this.occlusion.prime?.(this.occlusionStart,this.basePosition,this.position);
    this.camera.position.copy(this.position);
    this.camera.lookAt(this.look);
  }
}
