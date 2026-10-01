# R35B LOCK — WORLD MAP + FEATHERED MINIMAP EDGE

Date: 2026-09-30
Build ID: WORLD-MAP-R35B-20260930B
Status: LOCKED — runtime/visual approval + explicit LÅS received.

Locked scope:
- R35 live SharedLandscape world map/minimap integration.
- Circular top-right minimap with live player position/heading and real TGW landmarks.
- Tap/M overview map, pan/zoom and ME recentering.
- R35B feathered canvas-alpha edge so the minimap dissolves into the world instead of reading as a hard/static dark circle.
- No fake quests, enemies or bosses; no fast travel, waypoint system, multiplayer markers or fog-of-war progression.

Protected status:
- R34B remains MOBILE-TEST LOCKED, pending final real-device mobile approval.
- R33J Fishing and earlier locked Boat, vegetation, Stable/riding and MoveIn systems remain protected.

NEXT HANDOVER TASK:
Reposition the HUD/status boxes that currently sit behind/underlap the top-right minimap. This is a separate layout-only scope. Do not alter map visuals/data/controls or gameplay while fixing the HUD placement.
