# R36 — ASSET LOAD AUDIT

Static package audit from the R35B locked baseline. This is evidence for later profiling decisions, not permission to lazy-load these systems.

Largest GLBs in the current package:
- Wildlife animal library: ~3.19 MB
- Greenhouse L3: ~3.01 MB
- Greenhouse L2: ~2.98 MB
- Aloe Vera character: ~2.69 MB
- Orangery ambient FX: ~2.10 MB
- Orangery building: ~1.66 MB
- Greenhouse L1: ~1.57 MB
- Stable mount assets: ~1.51 MB
- Fishing cabin runtime: ~1.48 MB
- Lake cabin: ~1.39 MB
- Fern character: ~1.33 MB
- Orangery milestone tree: ~1.29 MB

Observed startup behavior before R36:
- selected Home shed awaited before Stable
- Stable awaited before selected character
- Golden Seed, Meaningful Choice, Greenhouse and Orangery then awaited serially
- Greenhouse currently loads L1 + L2 + L3 before Game ready
- Orangery loads building, FX and current tree stage before Game ready
- Fishing waits for cabin and then loads its selective overlay + fish poster

R36 changes only scheduling of independent loads. It deliberately does not classify or lazy-load assets yet because the project rule is to measure cold/warm startup first.

Candidate future optimization only if runtime measurements justify it:
- defer non-current Greenhouse levels with safe on-demand/preload handling
- classify Orangery ambient/milestone assets as nearby/optional if measured startup impact is material
- verify whether Wildlife library should stay background-loaded as today
- asset re-export/compression only after size + visual regression measurements
