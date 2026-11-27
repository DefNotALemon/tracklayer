# 0367 — G8 P1 the picture (v291): break pass — main @ d99ebad
Scenario: tools/playtest/scenarios/p1_picture_break_beta.mjs (new)   Sheet: ~/.hermes/cache/scratch/tlloop/reports/0367.jpg

Reran the builder's `p1_picture.mjs` (NOSTILLS=1): ALL OK, page errors none; added cost town -0.9 ms, fell +1.8 ms (limit 2.5).

## Findings
1. [POLISH] `GS.storm = 1` with `updSky()` gives no visible storm in the new picture: far houses stay crisp and the frame is bright (luma 117, std 58, 0 % clipped). The still labelled "storm night" (GS.hour 34) reads as a clear overcast morning, not weather. May be my forcing (storms come from `WX` fronts, not `GS.storm`); not confirmed. Worth one look with a real front injected (`GS.hour` set first, per the weather-test note) to check the new haze/bloom doesn't flatten storm fog.
2. Verified fine (no BLOCKER/BUG found):
   - Frames at four hours of day/dusk/night: contrast std 41-63, 0 % clipped, no black patches, no halo rims at the sky/terrain edge in the stills.
   - 12 rapid Graphics-button flips while riding: drawing buffer never empty, picture intact after.
   - Viewports 390x844, 640x360, 1280x720, 2560x1440 (live resize): chain follows the buffer, frames render with contrast.
   - Map tablet open on foot renders; scene keeps 2 dynamic lights at night.
3. Not covered: real touch device / iOS Safari, an old save loaded under Ultra, real GPU frame cost on Lemon's M1 Max (headless numbers only).

## Verified since last time
- v291 post chain: builder scenario passes; no page errors in either run.
