# R23M - North Stable Mount Grounding + Course + Ghost

Version: v0.3.64
Build ID: NORTH-STABLE-R23M-20260929A

Scope is intentionally limited to the four approved R23L fixes:

1. Normal-mounted horse grounding derives from the four animated hoof meshes while grounded. Intentional jump lift remains authoritative in the air.
2. Birk, Kul, Solvej and the hitching rail are restored inside the Stable compound after the tunnel, using the existing Stable hitch anchor.
3. Jumping is relaid as a readable START -> 1 -> 2 -> 3 -> FINISH course with #3 aligned directly into FINISH.
4. Jumping uses one canonical spawn for player/synthetic ghost; recorded jump ghosts are course-version validated so stale old-layout recordings cannot spawn ahead.

LOCKED / untouched:
- Stable tunnel camera behavior.
- Mounted jump-hit/no-hard-stop behavior: pole hit still penalizes, slows, and allows forward continuation.
