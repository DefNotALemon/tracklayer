# 0043 — COLD RUN card vs real risk, light trailer + heavy flatbed (G2) — main @ 3e396b3
Scenario: tools/playtest/scenarios/g2_coldrun_ride_laden.mjs (default + LR_HITCH=flatbed LR_KIND=heavy)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0043.jpg

## Findings (most important first)
1. [G2][high] Heavy flatbed tow (265 kg on the hitch, Woodsman) on an open-backcountry leg (Ifjord→Skjånes, 7.5 km)
   stalled to a crawl: along-line pace collapsed from an initial run to **2.16 m/s** (paceMs), 2 crashes in 120 game-s,
   final speed 2 mph "Packed / On your tracks" (minimap shows the sled looping over its own trail instead of
   progressing — still `02_flatbed_heavy.jpg`). Real projected warmth risk **1082%** of the leg's safe margin vs the
   card's **294%** — the card under-warns by ~4x exactly when a heavy flatbed gets bogged. This is the opposite
   failure from what v105 just fixed (card over-warning on ordinary 140-300 kg loads): the new
   `(1 + max(0, kg-300)/250)` stretch never engages here (towKg 265 < 300 cutoff) so the card shows the unstretched
   empty-pace estimate, but real pace on this terrain was far worse than empty-pace, not better. Suggested fix: the
   stretch threshold is keyed to mass alone; feed it (or `coldRun`) a terrain/drag signal (e.g. recent along-line pace
   from telemetry, or snow depth under the tow) so a stalled/bogged leg re-flags even under 300 kg.
2. [G2][med] Same flatbed run: 2 crashes dropped cargo condition to **0%** (HUD "0% condition unbroken") by the time
   the ride ended — confirms crashing with a flatbed load is economically costly (likely fails/penalizes delivery),
   which the COLD RUN warmth-only card doesn't surface at all; a player trusting a "safe" 294% card could still lose
   the whole payout to crash damage before warmth is even the binding constraint.
3. [G2][low] Light trailer run (210 kg tow, Gamvik→Ifjord 9.5 km, powder/High Country) rode cleanly at up to 92 mph,
   0 crashes, pace 21.4 m/s. Card still shows **321%** (unstretched, as expected under the new 300 kg cutoff) vs
   measured real risk **137%** — matches the open backlog note (v105 Next: "empty-pace part of coldRun still
   pessimistic on real routes") almost exactly; this is not new, just reconfirmed with a fresh leg (Gamvik, not yet
   covered by earlier samples).

## Verified since last time
- v105 (38a902f, COLD RUN card stops over-warning on ordinary trailer loads): confirmed the intended effect — a
  plain 140 kg / 210 kg-tow trailer load no longer gets an inflated multiplier (empty == laden estimate, 321% both),
  matching the PROGRESS log. But finding 1 above shows the fix's flip side wasn't covered: heavy flatbed loads that
  physically bog the sled can have the model under-warn instead of over-warn.

## Ideas
- A "stuck" detector (speed near 0 while throttle held, or repeated crashes within N seconds) could itself drive a
  COLD RUN warning multiplier, independent of towed mass — closer to what actually threatens a player on a bad leg.
