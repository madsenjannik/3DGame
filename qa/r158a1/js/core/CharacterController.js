// @ts-nocheck
import * as THREE from 'three';
import { damp, wrapAngle } from '../visual/VisualKit.js';

export class CharacterController {
  constructor({ instance, world, state }) {
    this.instance = instance;
    this.root = instance.root;
    this.world = world;
    this.state = state;

    this.position = new THREE.Vector3(state.player.position.x, 0, state.player.position.z);
    this.velocity = new THREE.Vector3();
    this.heading = Math.PI;
    this.turnRate = 0;

    this.walkSpeed = 2.05;
    this.runSpeed = 4.15;
    this.maxSpeed = this.runSpeed;
    this.radius = instance.definition.contract.colliderRadius || .3;
    this.currentSpeed = 0;

    // v0.3.17: normalized gameplay hop. Species share identical physics;
    // the GLB Hop clip contributes FX only and never owns world movement.
    this.hopOffset = 0;
    this.hopVelocity = 0;
    this.isGrounded = true;
    this.hopLaunchSpeed = 4.0;
    this.hopGravity = 13.0;

    // Camera-relative movement. W+A / W+D stays continuous as the camera follows.
    // Rearward input is special: the creature turns immediately toward the camera,
    // while the camera pauses before slowly chasing around to the creature's back.
    this.reverseBasisYaw = 0;
    this.reverseLocked = false;
    this.reverseIntentActive = false;
    this.reverseHoldDuration = 0;
    this.reverseCameraDelay = .42;
    this.reverseCameraHoldYaw = 0;
    this.reverseCameraLatched = false;
    this.lateralSteeringIntensity = 0;
    this.worldMove = new THREE.Vector3();

    this.root.position.copy(this.position);
    this.root.rotation.y = this.heading;
  }

  update(dt, time, input, followCamera) {
    const m = input.frameMove || { x: 0, y: 0 };
    const magnitude = Math.min(1, input.moveMagnitude || Math.hypot(m.x, m.y));
    // R65.3: a big combat hit (Stomp/Slam) takes control for ~0.45 s while you are thrown back.
    if (this.controlLock > 0) this.controlLock -= dt;
    const active = magnitude > .05 && !(this.controlLock > 0);
    const wasReverseActive = this.reverseIntentActive;
    this.reverseIntentActive = false;

    if (input.consumeHop?.() && this.isGrounded) {
      this.isGrounded = false;
      this.hopVelocity = this.hopLaunchSpeed;
      this.instance.playHop?.();
    }

    let headingDelta = 0;

    if (active) {
      const inputDir = new THREE.Vector2(m.x, m.y).normalize();
      const rearwardIntent = inputDir.y < -.55 && Math.abs(inputDir.y) >= Math.abs(inputDir.x);
      this.lateralSteeringIntensity = rearwardIntent ? 0 : Math.abs(inputDir.x);

      if (rearwardIntent) {
        if (!wasReverseActive) {
          // Freeze the movement/camera basis at the exact moment S/back is pressed.
          this.reverseBasisYaw = followCamera?.yaw ?? wrapAngle(this.heading + Math.PI);
          this.reverseCameraHoldYaw = this.reverseBasisYaw;
          this.reverseHoldDuration = 0;
          this.reverseCameraLatched = false;
        }
        this.reverseLocked = true;
        this.reverseIntentActive = true;
        this.reverseHoldDuration += dt;
      } else {
        // Any deliberate non-rearward movement returns to the normal live
        // camera-relative steering model and releases a short-S camera hold.
        this.reverseLocked = false;
        this.reverseCameraLatched = false;
        this.reverseHoldDuration = 0;
      }

      const y = this.reverseLocked
        ? this.reverseBasisYaw
        : (followCamera?.yaw ?? wrapAngle(this.heading + Math.PI));

      // Camera forward on the ground points from camera toward the player.
      const fx = -Math.sin(y), fz = -Math.cos(y);
      const rx =  Math.cos(y), rz = -Math.sin(y);
      const dx = fx * inputDir.y + rx * inputDir.x;
      const dz = fz * inputDir.y + rz * inputDir.x;

      this.worldMove.set(dx, 0, dz).normalize();
      const desiredHeading = Math.atan2(this.worldMove.x, this.worldMove.z);
      const previousHeading = this.heading;
      headingDelta = wrapAngle(desiredHeading - previousHeading);

      if (rearwardIntent) {
        // S/back keeps the approved v0.1.10 behavior: the creature turns 180 degrees
        // immediately, while the camera uses its separate delayed chase behavior.
        this.heading = desiredHeading;
      } else {
        // Normal steering reacts immediately but no longer snaps to the requested
        // heading. The body rotates progressively toward it, which also gives the
        // chase camera a continuously changing target rather than a 45/90-degree jump.
        const turnDamping = THREE.MathUtils.lerp(10.5, 8.25, this.lateralSteeringIntensity);
        this.heading = wrapAngle(this.heading + headingDelta * damp(turnDamping, dt));

        // Travel follows the creature's actual in-between heading while it turns.
        // This makes W+A / W+D and lateral steering describe a physical arc instead
        // of instantly changing the velocity vector before the body has rotated.
        this.worldMove.set(Math.sin(this.heading), 0, Math.cos(this.heading));
      }

      const actualTurn = wrapAngle(this.heading - previousHeading);
      const rawTurnRate = THREE.MathUtils.clamp(actualTurn / Math.max(dt, .001), -7, 7);
      this.turnRate += (rawTurnRate - this.turnRate) * damp(18, dt);
    } else {
      this.reverseLocked = false;
      this.lateralSteeringIntensity = 0;
      this.turnRate *= 1 - damp(7, dt);
    }

    // Releasing S before the delay leaves the camera in front of the creature.
    // If S was held past the delay, the camera is allowed to keep finishing its
    // slow chase to the behind-the-back position.
    if (wasReverseActive && !this.reverseIntentActive) {
      this.reverseCameraLatched = this.reverseHoldDuration < this.reverseCameraDelay;
      if (!this.reverseCameraLatched) this.reverseHoldDuration = 0;
    }

    const runBlend = input.isTouch
      ? THREE.MathUtils.smoothstep(magnitude, .72, .97)
      : (input.runIntent ? 1 : 0);
    const baseSpeed = THREE.MathUtils.lerp(this.walkSpeed, this.runSpeed, runBlend);
    // R34B mobile-native steering: full-stick still reaches run pace on straights,
    // but turning intentionally sheds speed so direction changes feel controllable
    // instead of skating at full run speed around every arc. Desktop remains locked.
    const mobileTurnSeverity = input.isTouch && active
      ? THREE.MathUtils.clamp(Math.max(Math.abs(this.turnRate)/5.2, Math.abs(headingDelta)/1.25), 0, 1)
      : 0;
    const turnSpeedFactor = input.isTouch ? THREE.MathUtils.lerp(1, .68, mobileTurnSeverity) : 1;
    const targetSpeed = active ? baseSpeed * magnitude * turnSpeedFactor : 0;
    this.currentSpeed += (targetSpeed - this.currentSpeed) * damp(targetSpeed === 0 ? 10 : 7.5, dt);

    const tx = active ? this.worldMove.x * this.currentSpeed : 0;
    const tz = active ? this.worldMove.z * this.currentSpeed : 0;
    const directionChange = Math.abs(headingDelta);
    const response = directionChange > Math.PI * .45 ? 17 : 10;
    const k = damp(active ? response : 12, dt);
    this.velocity.x += (tx - this.velocity.x) * k;
    this.velocity.z += (tz - this.velocity.z) * k;

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.world.resolveCollisions(this.position, this.radius);
    const groundY = this.world.groundHeight(this.position.x, this.position.z);
    if (!this.isGrounded) {
      this.hopVelocity -= this.hopGravity * dt;
      this.hopOffset += this.hopVelocity * dt;
      if (this.hopOffset <= 0) {
        this.hopOffset = 0;
        this.hopVelocity = 0;
        this.isGrounded = true;
      }
    }
    this.position.y = groundY + this.hopOffset;

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    this.root.position.copy(this.position);
    this.root.rotation.y = this.heading;
    this.instance.updateVisual?.({
      dt, time, speed, maxSpeed: this.runSpeed, turnRate: this.turnRate,
      velocity: this.velocity, heading: this.heading
    });
    this.state.player.position = { x: this.position.x, y: this.position.y, z: this.position.z };
  }

  flash() { this.instance.flash?.(); }
}
