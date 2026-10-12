# R39B — Result / Standings mobile fidelity correction

Status: CANDIDATE
Build ID: STABLE-RESULT-R39B-20260930A

Scope approved by Jannik after mobile runtime comparison against the final Claude references.

Changes:
- Result card reduced to the intended compact mobile composition instead of near-full-width.
- Medal is forced to a true circular badge despite legacy `#stable-result-kick` specificity, with simple ribbon treatment.
- Result typography, rank chips, Thora note and action row are scaled to the reference hierarchy.
- Result camera no longer slowly orbits away from rider/horse after finish; it settles into a stable rear three-quarter finish framing.
- Standings becomes a centered compact card rather than an oversized full-width bottom sheet.
- Opening Standings hides the underlying result medal/card so they cannot bleed through above the leaderboard.
- Podium/list/player row spacing is reduced to the approved reference proportions.

Not changed:
- race timing, penalties, medals, PB logic, ghosts, leaderboard data, save/progression, riding physics, course geometry, tunnel camera, normal race camera or Stable collision.

Future test-tooling note:
- Add a DEV-menu shortcut that opens Stable Result / Standings directly with non-persistent test data. Do not implement unless separately approved.
