# R51 — PERFORMANCE INSTRUMENTATION + BASELINE

- Dev menu → **MÅLING**: *Performance-HUD til/fra* (FPS, frame ms + worst, draw calls, triangles, textures, geometries,
  DPR, quality profile, live WebGL contexts, JS heap where available) and *Vis startup-tider*.
- `js/dev/Log.js`: `log('LOAD'|'SAVE'|'WORLD'|'GARDEN'|'STABLE'|'FISH'|'PERF'|'LIFE', …)` — prints only with the dev menu / dev route.

## Baseline (headless Chromium, 844×390 touch, software GL)
| Metric | Value |
|---|---|
| Bytes before first playable frame | 29.0 MB (102 requests, 22 GLBs) |
| Startup | world-critical 4.4 s · game ready 8.8 s |
| Per frame at home gate | 465 draw calls · 464k triangles |
| GPU memory objects | 11 textures · 491 geometries |
| Result Stage iframe | loaded at startup, own WebGL renderer (rAF throttled while hidden) |

Next measured hotspots: Result Stage iframe (load on race), startup wave (stable/fishing/orangery before play),
draw calls/triangles (shadows, vegetation, wildlife).
