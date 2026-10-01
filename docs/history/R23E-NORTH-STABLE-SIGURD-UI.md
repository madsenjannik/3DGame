# R23E — Thora uses Sigurd interaction pattern

Base: R23D candidate.

- `E / touch · Talk to Thora` remains the actionable prompt.
- Entering conversation now follows the Sigurd presentation pattern: player settles at the counter, camera moves into an NPC-focused conversation shot, Thora uses the shared `fishing-bubble` visual language, choices use the shared `fishing-dialog` / `fishing-opt` components, and Close/Esc exits the conversation.
- Thora switches to the embedded `thora_Talk` animation while conversation is active and returns to `thora_Idle` after exit.
- The Stable gate remains non-interactive while locked. Its approved passive world-space status `STABLE CLOSED / Talk to Thora` is unchanged.
- No quest or access unlock is implemented in this pass.
