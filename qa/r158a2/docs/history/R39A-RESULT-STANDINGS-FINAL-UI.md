# R39A — Result / Standings final UI candidate

Base: R39 LOCKED.

Root cause found during debugging: an older duplicate `showResult()` and `renderResultBoard()` remained later in `NorthStableSystem.js`, overriding the premium R39 methods at class-definition time. R39A removes only those legacy duplicate methods so the intended R39 premium renderer is the active implementation.

Mobile styling is then tightened to the approved Claude references: light result card with medal hero, integrated Thora quote, compact rank chips and 3-button footer; standings as a light rounded panel with tabs, podium, ranking list, pinned player row and ghost note.

No race logic, riding physics, scoring, medals, penalties, ghost logic, save data, Stable camera, course geometry or horse grounding is changed.
