# THE GROWING WILDS — R29 NORMAL START / IPHONE STABILIZATION

Build ID: `ENTRY-R29-20260929A`
Candidate: `THE-GROWING-WILDS-v0.3.72-NORMAL-START-IPHONE-R29-CANDIDATE.zip`

Authorized scope:
- Preserve approved splash/title/START/current-world visual direction.
- Stabilize Normal Start, especially Safari via a-Shell Mini on iPhone.
- Serialize splash -> current world -> START camera -> selector.
- Remove splash authoring/export/re-import runtime and all CDN Three.js dependencies.
- Use a presentation-only current world rather than hidden Private Garden + full gameplay-heavy systems.
- Do not decode selector characters during the START camera fly-in.
- Touch selector loads the active character first, then staggers only the two immediate neighbours instead of decoding five characters at once.
- Pause/dispose entry-world when selector owns the screen.
- No locked gameplay-system behavior changes.
