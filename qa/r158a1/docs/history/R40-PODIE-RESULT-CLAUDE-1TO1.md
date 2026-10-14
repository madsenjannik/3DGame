# THE GROWING WILDS v0.3.90 — R40 PODIE / RESULT / CHALKBOARD 1:1 CANDIDATE

Build ID: `STABLE-RESULT-R40-20261001A`
Date: 2026-10-01
Status: **CANDIDATE — PC runtime/visual approval required before lock**
Base: `THE-GROWING-WILDS-v0.3.89-STABLE-RESULT-R39G-THORA-EDGE-CANDIDATE` (R39 remains last locked canonical baseline)

## R40 scope
- Replaces the R39G Result/Standings presentation with a coded port of the uploaded Claude `Result-Podie-Prototype`.
- The exact Claude Three.js stage is shipped in `result-podie/`: physical wooden podium, rival characters, Tidsel-Thora, celebration/confetti, in-world chalkboard, Thora walk-to-board animation and board writing.
- TGW remains source of truth for real result time, penalties, medal, PB, ranks, Today/This week/All time rows, ghost note and completion lifecycle. Claude seeded/demo leaderboard data is not imported.
- Parent TGW UI ports the prototype desktop Result card, Thora speech bubble, compact standings tabs and bottom ghost bar.
- Existing `Leaderboard / Result` DEV QA remains available for direct testing without riding.
- No race route, riding physics, checkpoint, save, progression, economy or normal-world camera changes.

## Runtime validation
1. DEV / TEST → Leaderboard / Result → Jumping Result: compare against supplied Claude podium screenshot.
2. Open Standings: Thora walks from podium to the physical chalkboard; real TGW rows write onto board.
3. Switch Today / This week / All time and confirm chalkboard redraws with corresponding real TGW data.
4. Test Fastest lap Result and Standings.
5. Run one real Jumping and one real Fastest Lap; Result must appear only after completion/DQ.
6. Verify Ride again, Done and Race the ghost actions.

---

