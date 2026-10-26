# 0044 — Verify v106: sled beacon column crossing the ridge (G1) — main @ 4c3ddb8
Scenario: tools/playtest/scenarios/g1_sledpin_crestwalk.mjs (new)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0044.jpg

## Findings (most important first)
1. [G1][med] v106's ridge-lift (report 0042/e4b91c6, `sledPinTick` lifting the column's foot over the highest
   crest on the camera→sled sight line) **snaps instead of easing** when the sight line clears: walking toward
   the sled from behind a 59 m-over rise at 600 m, `pinFoot` (lift height) read **252 m → 203 m → 0 m** at
   600/500/400 m out — a 203 m drop happens within a single ~100 m step (1/6 of the whole crossing), then stays
   at 0 for the rest of the approach (300/200/100 m all `pinFoot=0`). Stills (0044.jpg frames 00/01/02) confirm
   it visually: frame 01 (500 m) still shows a tall thin column rising well above the walker; frame 02 (400 m)
   shows only a short, ground-level pale streak near the sled on the horizon — a visible pop between two
   consecutive samples, not a fade. This is the open item from 0042/PROGRESS v106 ("does the lifted column
   slide down smoothly as the sight line opens") — answer: no, it's a hard cut the moment the ray-march no
   longer finds a blocking sample. Suggested fix: ease `pinFoot` toward its target (lerp per frame, e.g.
   `pinFoot += (target - pinFoot) * k*dt`) instead of setting it directly from the per-frame crest search.
2. [G1][info] Everything else about v106 checks out on this crossing: column visible and correctly positioned
   at every sampled distance while the rise still blocked line of sight (`pin:true` at 600/500/400/300/200/100 m,
   `colMax` 133–252, comfortably above the ~70–100 background), it goes to `pin:false` right at the sled
   (d=0.7 m, as expected — walker is about to mount), and it's fully hidden after remounting
   (`hiddenAfterRemount:true`, foot:false). No page errors, no visual garbage (ring/banding) in any frame.
3. [G1][low] Not yet covered (same rise/sled pair, time-boxed this pass): the column over trees, next to a
   delivery/depot beacon, and a rise close to the walker (<25 m, skipped by the search per the backlog note).
   Still open for a future pass — g1_sledpin_crestwalk.mjs's rise-finder + step-walk can be reused by swapping
   the search radius down for the <25 m case.

## Verified since last time
- v106 (e4b91c6, sled light column rises from behind a ridge): the lift itself works as landed (column reads
  clearly over a hidden sled at 600/500/400/300/200/100 m here, matching 0042's rise-spot numbers) — this pass
  only adds the "does it ease" check, which it fails (finding 1).

## Ideas
- Reuse `g1_sledpin_crestwalk.mjs`'s rise-finder for the trees/beacon/<25 m cases from the backlog instead of
  writing new search logic each time.
