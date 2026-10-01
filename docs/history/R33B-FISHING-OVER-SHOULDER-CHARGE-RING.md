# R33B — Fishing: Over-Shoulder Camera + Oscillating Cast Ring

Build ID: `FISHING-POLISH-R33B-20260930A`

Status: CANDIDATE — runtime approval required.

Base: R33A Fishing Polish candidate, itself rooted in R32D LOCKED.

## Approved scope

1. Over-shoulder fishing camera
- Replaces the centered rear fishing framing used by R33A with a deliberately angled rear/over-shoulder view.
- Camera remains behind the character but gains a lateral offset proportional to its distance from the character.
- Charge/cast/wait/reel framing still uses the character + projected aim/bobber as the shared composition target.
- Long-cast portrait FOV is widened slightly so the 6.60 m maximum cast remains readable together with the character.
- Bite and land/result cameras remain unchanged.
- Normal shared-world camera remains untouched.

2. Oscillating cast-power ring
- Holding Cast no longer fills once and parks at maximum.
- Charge continuously breathes: minimum -> maximum -> minimum -> repeat.
- The white bubble itself stays stable; the outer ring expands/contracts as the direct visual representation of current cast power.
- Releasing at the outermost ring gives the longest cast; releasing as it returns inward gives a shorter cast.
- Cast range remains R33A's 2.00-6.60 m; only the way charge cycles is changed.

## Explicitly unchanged
- Fish species, bite windows, tension/reel tuning, Catch Log and Fish Board.
- Sigurd conversation/shop/handover.
- Boat controls, boat collision, docking and Cabin -> Waterfall -> Cabin route.
- SharedLandscape/Summer vegetation.
- Player movement outside fishing and normal world camera.
- Stable, riding, Jumping, MoveIn and R23O/R24 protected gameplay.
- Save/progression schema.

## Runtime acceptance
1. Fishing camera visibly reads as angled over-shoulder rather than centered directly behind the character.
2. Character, rod direction and bobber remain readable at a full 6.60 m cast.
3. Holding Cast makes the outer white ring expand to max, contract back inward, and repeat continuously.
4. Releasing at different ring sizes produces visibly different cast distances.
5. The center white bubble stays stable while the outer ring supplies the charge feedback.
6. Complete one dock catch and one boat catch.
7. Confirm Cabin -> Waterfall -> Cabin boat navigation remains unchanged.

No lock is granted by this candidate.
