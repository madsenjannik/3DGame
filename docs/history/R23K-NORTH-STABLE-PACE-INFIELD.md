# R23K - North Stable Pace Infield

Version: v0.3.62
Build ID: NORTH-STABLE-R23L-20260929A

## Locked / unchanged
- R23J tunnel camera is locked and unchanged.
- Thora dialogue/access, result functionality, Stable placement and existing outer-track collisions remain.

## Ride Setup
- Only Birk, Kul and Solvej are selectable.
- Wardrobe/cosmetic progression stays with Thora.
- Setup/result visual redesign is deferred.

## Horse grounding
- Mounted horses are corrected from their current animated visible mesh bounds every frame so the lowest hoof meets shared-world ground before jump lift is applied.
- Rider position continues to follow the horse rider anchor.

## Jumping
- Removed the cramped rectangular secondary arena fence.
- The oval track inner rail now defines the open jumping infield.
- Expanded sand infield and re-laid the course as START -> 1 -> 2 -> 3 -> FINISH with wider approaches/recovery arcs.
- Pole/refusal/order penalties remain.

## Fastest Lap
- Replaced recovery-at-trot stamina with Pace Reserve.
- Full gallop remains available at 0% reserve.
- Sustained maximum effort gradually reduces available top-end speed to 88% at empty reserve rather than forcing a slower gait.
- Easing throttle below max effort can recover reserve without requiring walk/trot.
- High-speed cornering continues to cost speed and a small amount of reserve.
- Checkpoints, off-track penalties, shortcut DQ, ghosts and leaderboards remain.
