# R34B MOBILE TEST LOCK

Date: 2026-09-30
Package: `THE-GROWING-WILDS-v0.3.77-MOBILE-GESTURE-CONTROLS-R34B-MOBILE-TEST-LOCKED.zip`
Base: `THE-GROWING-WILDS-v0.3.76-FISHING-POLISH-R33J-LOCKED.zip`

Status: **MOBILE-TEST LOCKED — PENDING FINAL MOBILE RUNTIME APPROVAL**

This lock freezes the approved R34B implementation for continued project work, but it is not the final mobile-control runtime lock until Jannik has completed real-device mobile testing.

Protected behavior:
- floating left-side movement zone on touch;
- right-side camera drag;
- upward flick on the right side for Jump;
- automatic run at full movement input;
- mobile-only turn-speed moderation;
- no fixed permanent Jump button;
- desktop controls unchanged;
- all R33J locked Fishing, Boat, Stable, MoveIn and world behavior preserved.

Important:
- Do not silently retune R34B mobile controls while other scopes are being implemented.
- If mobile testing exposes a control problem, open a new isolated R34 patch and obtain explicit GO.
- Until final mobile runtime approval, document R34B as `MOBILE-TEST LOCKED`, not `FINAL LOCKED`.
