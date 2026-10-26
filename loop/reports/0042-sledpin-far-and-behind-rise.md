# Playtest 0042 — v104 sled-locator column: far out and behind a real rise (G1)

Focus: the builder's own "Next" note after landing v104 (sled locator beacon column, fab3a92) — verify the
column past the 90 m already tested, and specifically from **behind a rise** where the sled is genuinely
out of line of sight (the comment in `sledPinTick()` claims the column finds you the sled "behind a rise").
New scenario `scenarios/g1_sledpin_far.mjs` (committed with this report): searches 24 directions × 6
distances (100–600 m) around the parked sled for a point where ground height between walker and sled
crests above the straight eye-to-sled sight line, stands the walker there at night (clear, pinned weather),
and checks `V.sledPin.visible` plus the brightest luma in a strip above the sled's screen point, vs two flat
controls at 150 m and 300 m. Stills: `~/.hermes/cache/scratch/tlloop/reports/0042.jpg`.

## Findings

**F1 — the column is NOT visible from behind a real rise, even though `V.sledPin.visible` reports true.**
Search found a blocking spot at 600 m (bearing 45°, max line excess 59 m — the walker ends up on a "High
Country" ridge, elev 1006 m, clearly above the sled's valley). Data says the pin exists and is "visible"
(`pin:true, op:0.338`, matches the flat-ground opacity), and the probe even reads `colMax 158`/`colMean 155`
in the sky strip — but that's the ambient night-sky/aurora brightness, not the column: still 01 (zoomed) shows
only smooth snow and stars, no pale line anywhere above the horizon. By contrast stills 02 (flat 150 m) and
03 (flat 300 m) show the column unmistakably: a crisp thin pale-white vertical line standing in the sky well
above the horizon, clearly readable. **The feature works as designed on flat ground but fails exactly in the
"behind a rise" case the code comment and the builder's own next-step both call out** — `V.sledPin.visible`
is a distance gate only (d > 30 m), not an actual occlusion/height check, so the renderer correctly culls the
column against the ridge mesh even though the game logic thinks it's shown.

**F2 — flat-ground column holds up well past 90 m.** 150 m: `colMax 237` (strong), 300 m: `colMax 156`
(dimmer but clearly visible and identifiable in the still, still far brighter than the `colMean 45` background).
Confirms v104's "fades in 30–60 m" design holds its visibility at long flat range too — no fade-out bug found
out to 300 m.

**F3 — remount still clears it correctly.** Back on the sled: `pin:false`. No regression from the longer-range
tests.

## Suggested next step
`sledPinTick()`'s column is tall (150 m, `beaconGeo` height 1000 × scale 0.15) and centered on the SLED's own
ground height, so it has no idea whether terrain between the sled and the walker is higher than that — on a
steep ridge/valley terrain like this map's backcountry, a 150 m column isn't always enough, and nothing marches
it taller or repositions it when actually occluded. Two directions, either is a real fix: (a) raise the column's
base/height relative to the local terrain profile (e.g. anchor to the HIGHEST ground sampled along the
sled↔walker line, not the sled's own ground height), or (b) cheaper: when distance is large (say >300 m) and
a quick ray/height sample confirms occlusion, skip the column and strengthen the existing text hint (`sledWhere()`,
v103) instead — it already gives distance + direction and doesn't care about line of sight. Given v103 already
ships a working direction+distance hint, (b) is the lower-risk fix: don't rely on a line-of-sight visual past
some threshold, lean on the text that's already proven correct (report 0041).
