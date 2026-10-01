# The Growing Wilds

Stylized third-person botanical survival adventure, built with plain ES modules and a vendored three.js 0.165.0 (no build step).

## Run locally
- **PC:** `python START-PC.py` (or `START-PC.bat`). Opens the DEV / TEST hub.
- **iPhone on the same network:** `python START-IPHONE.py`.
- Any static file server from the repo root also works; open `index.html` for the normal start flow.

## Layout
- `index.html` → splash + start screen, `selector.html` → character selector, `game.html` → the game.
- `js/` game code, `assets/` GLB models and images, `vendor/` three.js and addons.
- `version.js` is the single source for the public version/build label.
- `docs/MASTER-PROJECT-DOCUMENT.md` holds the project rules and backlog; `docs/HANDOVER.md` the current state. Older round notes live in `docs/history/`.
