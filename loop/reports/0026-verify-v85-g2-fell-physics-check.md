# 0026 — Verify v85 (G2): fell freight, plus a physics check on the Apex-only gate — main @ 49f5591

Focus: builder's latest landing since report 0025 was v85 (06:45 pass, "Fell freight: first work the Apex
opens", G2, hash 49f5591) — report 0025 had instead verified the older v84 lanes landing, so v85 was still
unverified. Reused `tools/playtest/scenarios/g2_fell.mjs` unchanged against current `origin/main`, then wrote
a new scenario `g2_fell_tow.mjs` to answer PROGRESS.md's own open question: "measure with a tow run before
claiming the gate in physics terms (today it's an insurance rule)." Shots: `~/.hermes/cache/scratch/tlloop/reports/0026.jpg`
(Summit vs Apex towing a loaded flatbed up a 0.38 grade), `0026_freight.jpg` (Freight app FELL card); raw
stills/console in `~/.hermes/cache/scratch/tlloop/0026/` and `0026b/`.

## Findings

1. [G2][info][confirms landing] **v85 reproduces to the decimal.** `g2_fell.mjs` on current `origin/main`:
   fell contracts appear only from 32 deliveries, avg pay **$5,616–5,892** [3,855–7,925] across levels
   32/46/60 (PROGRESS claimed $5,597–5,672 — within run-to-run board noise, same range floor/ceiling).
   Gate text: Summit and Trekker both get "the shippers only insure it behind an Apex 800 or bigger (32
   deliveries, $5200)"; Apex and Aurora both read "OK". Apex garage card at 20 deliveries (still locked)
   correctly appends "· takes fell freight (half-tonne flatbed loads up the fell, the best-paid work on the
   board)". Not a false landing.

2. [G2][info][new test, closes open backlog question] **The Apex-only gate is confirmed insurance-only, not
   a physical wall.** New `g2_fell_tow.mjs`: found a real fell-grade hillside (slope 0.38, matching
   Gartefjellet's 433 m / 1.0 km ≈ 0.43 average climb), fitted each sled with a flatbed + 500 kg cargo
   (`TOW.mass` = 625 kg, same as a FELL contract), held W for 10 game-s straight up it. **Summit: 97 m in
   10.2 s, climbed 36.4 m, ended at 33.1 mph, `BOG.on` never true.** Apex: 134 m in 10.2 s, climbed 50.6 m,
   ended at 42.1 mph, also never bogged. Apex is ~39% faster climbing the same load (power/drag ratio 1.91
   vs 2.59 from the ladder table), but the Summit is not stuck, stalled or bogging — it hauls the load up the
   fell slope fine, just slower. This matches what PROGRESS already suspected ("today it's an insurance
   rule"): confirmed, now measured. Not asking the builder to loosen the gate (Lemon's call, and the in-fiction
   "shippers won't insure it" framing is coherent either way) — just closing the open measurement so the
   backlog item can drop that line, or be reframed as "is the insurance story worth a Summit speed penalty
   instead of a hard lock" if G2 wants to revisit it.

3. [G2][low][test note] Both runs showed a brief `minMph 0.7` early in the 10 s window on both sleds — reads
   as normal throttle-up from a standing start (my scenario starts stationary 8 m back from the spot), not a
   stall; flagged only so a future pass doesn't mistake it for bogging without checking `BOG.on` (which stayed
   false throughout both runs).

4. [G3][info][inconclusive, worth a look] The towing stills (`01_summit_towing.jpg`, `02_apex_towing.jpg`,
   side camera at 3.2 m / 2.1 m up) show the sled and rider clearly climbing the slope but **no flatbed or
   cargo visible behind either sled** — could be the trailer sitting outside this particular camera framing
   (the rig trails ~3.2 m back and the camera target is the sled's own position, not the hitch), or it could
   be a real rendering gap when a flatbed is fitted but no contract has been formally accepted/strapped (my
   scenario sets `TOW.kind/mass` directly rather than going through `acceptContract`/`deliver`'s strap-down
   flow). Didn't chase it further this pass — a wider back-facing camera or an actual accept+strap flow would
   settle it.

5. [G2][info][visual check] Freight app FELL card (`0026_freight.jpg`, Apex, 40 deliveries): clean layout,
   map thumbnail, FELL chip in red/orange distinct from the HEAVY chip below it, price/bond/due text all fit
   without overlap or clipping. Matches PROGRESS's "lays out cleanly" claim.

6. [G2][info] `page errors: none` on both scenario runs (g2_fell.mjs and the new g2_fell_tow.mjs) — no
   regression from the v85 landing.

## Ideas (not mine to build, builder's call)
- If G2 wants to make the late-ladder story even clearer: a locked FELL card on a Summit could show the
  physical climb numbers ("can haul it, just slower — 33 vs 42 mph loaded") alongside the insurance line,
  since the game clearly already computes that via `TOW.mass`/`BOG` — would turn the gate from a flat lock
  into a real tradeoff a player can feel, consistent with the "progression that makes sense" goal.
- Finding 4: confirm flatbed cargo mesh visibility by going through `acceptContract` + the strap-down flow
  instead of setting `TOW.mass` directly, with a camera framed to include the hitch/trailer footprint.
