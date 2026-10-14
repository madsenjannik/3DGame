# THE GROWING WILDS v0.3.91 — R41 CLAUDE RESULT CHOREOGRAPHY CANDIDATE

Build ID: `STABLE-RESULT-R41-20261001A`
Date: 2026-10-01
Status: **CANDIDATE — PC runtime/visual approval required before lock**
Base: `THE-GROWING-WILDS-v0.3.90-STABLE-RESULT-R40-PODIE-CLAUDE-1TO1-CANDIDATE` (R39 remains last locked canonical baseline)

## R41 scope
- Completes the missing Claude Result choreography while preserving R40's real 3D podium/chalkboard stage and TGW runtime data.
- Ports the 2.4 s reveal timeline: live time count-up, penalty pop, medal overshoot/bounce, metallic shine, ribbon sway, Gold rays/flash, New Best/First Ride stamp, PB/sub reveal, animated rank settle, unlock reveal, button reveal and typed Thora quote.
- Physical podium placement now follows Claude medal semantics: Gold=#1, Silver=#2, Bronze=#3; non-medal/DQ does not place the player on the podium.
- Fixes Today / This week / All time pointer-events so the real TGW chalkboard can be switched interactively.
- Adds DEV-only Gold / Silver / Bronze result-state controls for direct visual QA without racing.
- Keeps Claude's seeded/demo leaderboard data excluded; TGW remains authoritative for times, penalties, PB, ranks, ghost, leaderboard and save/progression.
- No riding physics, race route, checkpoints, save schema, economy, normal-world camera or protected gameplay changes.

## Runtime validation
1. DEV / TEST → Leaderboard / Result → Jumping → Gold: watch the full 2.4 s sequence without clicking.
2. Repeat Silver and Bronze; player must occupy physical podium #2/#3 respectively and medal material/celebration must change.
3. Open Standings and click Today / This week / All time; board must redraw each scope.
4. Verify Thora walk-to-board + speech bubble + chalk writing.
5. Test Fastest lap Gold/Silver/Bronze.
6. Run one real Jumping and one real Fastest Lap; Result still appears only after completion/DQ.
7. Verify click-to-skip, Ride again, Done and Race the ghost.
