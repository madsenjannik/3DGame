# THE GROWING WILDS v0.3.95 — R45 HOLO INDICATOR CANDIDATE

Build ID: `R45-HOLO-INDICATOR-20261001A`

Scope implemented from the approved Claude Design indicator package:
- Added the supplied `holo-indicator.js` Three.js component unchanged as the runtime indicator primitive.
- Replaced the previous custom RIDE / JUMP / FISH ring/beam marker visuals with the Claude holo indicator.
- Removed the dark label containers entirely; labels are now text-only world-space sprites with subtle outline/glow for readability.
- RIDE is placed at the actual Fastest Lap START/FINISH line center: `START_X`, `TRACK.cz - TRACK.R`, between the authored start posts.
- JUMP and FISH retain their previously approved locations.
- RIDE / JUMP / FISH labels retain soft floating/sway motion.
- Existing on-foot and mounted interaction behavior remains intact; race/fishing timing and gameplay logic are otherwise unchanged.
