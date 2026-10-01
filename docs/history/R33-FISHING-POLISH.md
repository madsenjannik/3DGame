# R33 — Fishing Polish

Build ID: `FISHING-POLISH-R33-20260930A`

Status: CANDIDATE — runtime approval required.

Base: `THE-GROWING-WILDS-v0.3.75-SUMMER-WATER-VEGETATION-R32D-LOCKED.zip`

## Approved scope

R33 integrates the presentation and interaction direction from Jannik's supplied `Fishing Polish (standalone).html` into the existing Fishing V1 runtime instead of replacing the game's canonical fishing systems.

Integrated presentation:
- visible low-poly Bamboo Rod during fishing;
- hold-to-charge / release-to-cast interaction;
- cast power changes cast distance within the existing fishing direction;
- clearer bobber cast arc and water landing ripple;
- small pre-bite nibbles/ripples;
- bite / strike presentation;
- accessible hold/release reel-tension loop using the existing species pull/reel data;
- caught fish is visible below the water while reeling;
- short water-to-player landing presentation before the result card;
- separate phase camera framing for ready, charge, cast, wait, bite, reel, land and result;
- subtle fishing-only camera shake for bite/surge/landing moments;
- action control redesigned as a white bubble with restrained charge and strike effects.

Preserved canonical systems:
- Sigurd conversation/shop/handover flow;
- Bamboo Rod + Worms ownership flow;
- existing fish species table, catch sizes, weights and Catch Log;
- Fish Board progression;
- dock fishing entry and boat fishing entry;
- boat controls, docking and Boat -> Waterfall navigation;
- SharedLandscape, Summer water vegetation and all R32D grounding/placement;
- player movement outside fishing;
- normal shared-world camera outside fishing;
- Stable, riding, Jumping and R23O/R24 protected systems;
- save/progression schema.

Not imported from the standalone demo:
- demo-only dock/shore/boat spot selector;
- demo session-log replacement;
- demo camera-style toggle;
- demo-only world/cabin/boat positioning;
- demo fish table/state ownership;
- standalone keyboard debug shortcuts.

## Runtime acceptance checks

1. Talk to Sigurd and retain the existing starter rod + worms flow.
2. Enter dock fishing and verify visible Bamboo Rod.
3. Hold Cast, release, and confirm charge feedback + cast arc.
4. Confirm Wait/nibbles do not prematurely trigger a catch.
5. Strike a bite and confirm reel UI, fish visibility and tension behavior.
6. Confirm landing transitions into the existing Catch Result / Catch Log.
7. Repeat from the boat.
8. Exit fishing and confirm normal movement/camera return unchanged.
9. Sail Cabin -> Stream -> Waterfall -> Stream -> Cabin and dock normally.
10. Quick Stable/Thora regression to verify unrelated locked systems remain unchanged.

No lock is granted by this candidate. Jannik runtime approval is required before R33 becomes the working base.
