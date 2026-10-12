# R37 — HUD / MINIMAP LAYOUT

Status: LOCKED — runtime/visual approval + explicit LÅS received 2026-09-30
Build ID: HUD-LAYOUT-R37-20260930A
Base: R36 LOCKED

Problem:
The top-right Golden Seed/material status stack can sit behind/under the locked R35B minimap.

Change:
- Desktop/fine pointer: reserve 188 px to the right of the inventory stack.
- Mobile/coarse pointer: reserve 122 px to the right of the inventory stack.
- The minimap itself is untouched.

Runtime test:
1. Normal world: Golden Seed/status boxes sit clearly left of the minimap with no overlap.
2. Materials card, when visible, still reads correctly and does not overlap the minimap.
3. Mobile: minimap and top HUD both fit without clipping.
4. Open/close world map: no HUD jump or map regression.
