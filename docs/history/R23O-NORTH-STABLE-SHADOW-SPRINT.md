# R23O — NORTH STABLE SHADOW + SPRINT

Version: v0.3.66  
Build ID: `NORTH-STABLE-R23O-20260929A`

## Scope

Recovery candidate built directly from R23N.

1. Real Birk/Kul/Solvej horse meshes now cast shadows.
2. Full W+Shift pace is available in Jumping.
3. Full W+Shift pace is available during normal riding outside minigames.
4. Ranked Fastest Lap keeps the existing R23N track/off-track speed cap and locked W/Shift flow.

## Explicitly unchanged / locked

- R23N race camera behavior.
- Ranked-track W/Shift acceleration/deceleration behavior.
- Track geometry/checkpoints.
- Jumping layout/course.
- Horse grounding/Y pipeline.
- Jump-hit/no-hard-stop behavior.
- Tunnel camera.

## Implementation notes

- Real horse visual meshes: `castShadow = true`.
- Max-speed scope changed from `trackNow ? 1 : .62` globally to applying the `.62` off-track factor only while `lap_horse` is actively running.
- No horse Y/grounding constants or transforms changed.
