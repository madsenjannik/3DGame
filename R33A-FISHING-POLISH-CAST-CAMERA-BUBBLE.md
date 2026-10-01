# R33A — Fishing Polish: Long Cast + Rear Camera + Living Bubble

Build ID: `FISHING-POLISH-R33A-20260930A`

Status: CANDIDATE — runtime approval required.

Base: R33 Fishing Polish candidate, itself built from R32D LOCKED.

## Approved scope

1. Cast distance
- Previous R33 formula: 1.85 m + 1.45 m × charge = 1.85–3.30 m.
- R33A formula: 2.00 m + 4.60 m × charge = 2.00–6.60 m.
- Charge remains continuous and uses the existing hold/release interaction.

2. Fishing camera
- Charge, cast, wait and reel use a distance-aware rear camera.
- Camera backs away as cast distance increases.
- Target framing uses the character/bobber midpoint or projected charge aim so both remain readable at maximum cast.
- Bite keeps the authored close reaction shot.
- Land/result framing remains the existing R33 presentation.
- Normal shared-world camera is untouched.

3. White action bubble
- Retains the clean white circular TGW control.
- Adds a compact line/core motif rather than text-only presentation.
- Charge animates the casting arc/core.
- Wait animates subtle water ripples/bob motion.
- Strike uses the existing hot pulse plus a stronger living core.
- Reel rotates the small motion motif.
- No arcade-heavy HUD elements were added.

## Explicitly unchanged
- Sigurd conversation/shop/handover.
- Fish species, bite windows, pull/reel tuning, Catch Log and Fish Board.
- Boat controls, boat collision, docking and Cabin → Waterfall → Cabin route.
- SharedLandscape and Summer water vegetation.
- Player movement outside fishing and normal world camera.
- Stable, riding, Jumping, MoveIn and R23O/R24 protected gameplay.
- Save/progression schema.

## Runtime acceptance
1. At low charge, cast remains short and controllable.
2. At full charge, bobber lands about 6.6 m from cast origin.
3. At full charge/cast/wait, character and bobber are visible together.
4. Camera reads as behind the character, not a side shot.
5. White action bubble feels alive in Cast/Wait/Strike/Reel states without becoming visually noisy.
6. Complete a full catch at dock and from boat.
7. Sail Cabin → Waterfall → Cabin and dock normally.
8. Exit fishing and verify normal movement/camera return unchanged.

No lock is granted by this candidate.
