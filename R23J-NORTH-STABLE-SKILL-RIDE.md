# R23J - North Stable Skill Ride

Version: v0.3.61
Build ID: NORTH-STABLE-R23J-20260929A
Status: candidate for human visual/gameplay QA

## Scope implemented

### Tunnel camera
Stable owns the camera completely while the player is in the drive-through tunnel. The normal ThirdPersonCamera update is skipped for those frames. The Stable camera uses the Claude Stable-v2 tunnel behavior (behind-heading alignment, compact distance and low pitch), then synchronizes the normal follow-camera state before handing control back outside the tunnel.

### Ride Setup
Both Timed Ride start locations open an explicit setup overlay from E/touch. The player can choose Kul, Birk or Solvej, select an unlocked saddle blanket, see current best / today #1 / gold target, start the discipline or exit. Ranked horse performance is intentionally equal.

### Grounded mount
Horse world height is sampled from the same shared-world groundHeight used by the rest of THE GROWING WILDS. Jump height is applied on top of terrain height. The player follows a rider anchor attached to the selected horse.

### Jumping
The arena course is now a real closed sequence:
START -> Jump 1 -> Jump 2 -> Jump 3 -> FINISH.
The finish is inside the arena. The course is laid out for readable approaches and turns rather than the former ride-out-of-the-fold finish. Pole down = +4 s, refusal = +2 s, wrong order / missed jump = DQ.

### Fastest Lap
Fastest Lap now rewards driving/riding skill rather than holding forward:
- five ordered checkpoint gates,
- gallop stamina drain and recovery at lower effort/speed,
- high-speed cornering costs speed and stamina,
- off-track riding is strongly slowed and penalized per excursion,
- cutting the inside of the oval is disqualified,
- ghost, splits, medals and leaderboards remain active.

### Results
Race completion opens a dedicated result/leaderboard overlay instead of requiring a click on a white screen. It includes final time, penalties, medal/new-best context, leaderboard tabs, unlocks, Ride Again and Exit.

## Preserved / deferred
- Existing Thora dialogue/access flow is preserved.
- Existing Stable collision pass is preserved.
- Bike gameplay is deferred.
- The planned Thora quest remains deferred; it will later replace the temporary direct access approval without requiring the ride/minigame systems to be rebuilt.
