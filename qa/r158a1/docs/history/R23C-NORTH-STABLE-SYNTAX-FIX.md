# R23C — North Stable startup syntax fix

Base: R23B candidate. Scope deliberately limited to the startup parse error reported on iPhone/Safari.

- Removed one accidental literal `\\n` token before `buildStableTerrainBlend()` in `js/world/SharedLandscape.js`.
- The intended R23B Stable terrain blend implementation is otherwise unchanged.
- No Stable placement, Thora placement, access logic, DEV menu, camera, movement, quest, riding, race, leaderboard, cosmetics, or other gameplay behavior changed.
