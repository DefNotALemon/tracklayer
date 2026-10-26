# 0067 — v132 roof drip edge at ride distance + white-house grey trim (G3) — main @ 013dc26
Scenario: tools/playtest/scenarios/g3_drip_ride.mjs   Shots: ~/.hermes/cache/scratch/tlloop/reports/0067.jpg

## Verified since last time
- v132 (roof drip edge, 89232a4): **holds up at ride distance.** At 15–20 m (nov_near_15/20, nov_white_15,
  night_near_15/night_white_15) the new dark steel line along the eave/gable fascia reads as a clean, thin
  seam between the white roof-snow cap and the trim — not too faint, not busy/noisy. Matches the builder's
  close-range numbers (0060 F4 was judged only at ~11 m; this confirms it's not a close-up-only effect).
- v132 on white-house grey trim (nov_white_15, a grey corrugated-steel work building near the depot, found
  via `K.trimG` 0xa9b0b7 scene scan): drip edge is visible there too, same crispness as the red-house boards
  — no "merges into the trim" problem distinct to grey.

## Findings (most important first)
1. [G3][low] At **25 m** (nov_white_25) the drip edge has faded into general roofline noise: still legible as
   "there's an edge here" but you can no longer tell it's a *dark steel strip* vs. just AA/shading on the
   roof-wall seam. Expected for a 5.5 cm feature at that range — not a regression, just the useful-distance
   ceiling. Fine to leave; no fix needed unless Lemon wants it readable further out (would mean thickening it,
   which risks "too busy" up close).
2. [G3][low] Night (night_near_15, night_white_15, hour 21, moonlit/aurora-free): the whole eave goes into
   shadow — the drip edge is indistinguishable from the rest of the dark roofline on both the red house and
   the grey shed. Not a regression (the trim and the snow cap are both dim at night anyway); the drip edge
   simply doesn't read at night, same as most roof detail. No action needed.
3. [G3][low, harness note] The nearest `K.trimG` building to the depot turned out to be a grey corrugated
   workShed-style building, not one of the gabled `KIT.house` homes (Naust/Brattli, the SITES-listed white
   houses, are further out at Myrvang/Solbakken-adjacent coordinates and weren't reached this pass). The
   drip-edge read is consistent either way (it's the same `roofTrim()`/`trimVC` path for both), but a future
   pass checking the *actual* white gabled homes (not just a grey shed) would close this out fully.

## Scenario note (for the builder / next playtester)
New `tools/playtest/scenarios/g3_drip_ride.mjs`: finds the nearest ordinary-trim house (`KIT.doors[0]`) and
the nearest grey-trim (`K.trimG`) building to the depot, then shoots both at 15/20/25 m "ride distance" with
a custom camera (vs. the ~11 m up-close shots in `g3_roofs.mjs`). Had to fight a persistent bug while
building it: setting `V.rider.visible = false` once doesn't stick — `tracklayer.js:12366` resets
`rider.visible = !FOOT.on && ...` every frame, so the camera kept landing inside the rider's own helmet mesh
(showed as a dark hood filling the screen). Fix: set `V.rider.visible = false` *inside* the `camOv` render-hook
closure itself (so it re-wins every frame, right before the draw call), not just once at setup. Documented
here so the next camera-override scenario doesn't rediscover it.

## Ideas
- Point `g3_drip_ride.mjs` (or a variant) at the actual SITES white homes (naust/brattli, `s.x - 11, s.z`) to
  confirm the gabled-roof case specifically, not just the grey shed.
- If Lemon ever wants the drip edge to read past 25 m, that's a thickness/contrast tradeoff against the "too
  busy up close" risk raised in 0060 F4 — not free.
