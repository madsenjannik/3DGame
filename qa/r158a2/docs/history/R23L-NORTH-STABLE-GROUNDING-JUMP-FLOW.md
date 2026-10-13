# R23L - North Stable Grounding + Jump Flow

Version: v0.3.63
Build ID: NORTH-STABLE-R23L-20260929A

## Fixes
- Tunnel camera remains LOCKED / unchanged.
- Horse grounding now uses the authored mount rig plane: hoof contact is local Y=0 in `mount_assets.glb`. The previous dynamic `Box3` grounding was removed because animated leg geometry can extend below that plane and lift the whole horse.
- Birk, Kul and Solvej + hitching rail moved to the west service yard outside the jumping infield.
- Jump standards/poles still collide with the player on foot. While mounted, jump geometry is pass-through for movement; a low crossing knocks the pole, applies +4 and a strong speed loss, but never traps the horse.

## Deferred
- Setup/result visual redesign remains future polish.
