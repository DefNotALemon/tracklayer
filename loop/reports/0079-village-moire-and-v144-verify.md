# 0079 — village houses (Mehamn, Gamvik) at ride distance for moire; verify v144 narrow-gap lock (G3/G1) — main @ fb72d60

Two-part pass: (1) verified the builder's latest landing (v144, narrow-gap notch lock) before picking a new
focus; (2) G3 rotation — buildings slice 3's last open "Playtester: ... v116 houses in the villages
(Mehamn/Gamvik) for moire" ask (LOOP.md line ~130), never checked before.

## Part 1 — verify v144 (narrow-gap notch lock, report 0074 F1)
Re-ran `tools/playtest/scenarios/g1_narrowgap.mjs` (builder's own scenario, no change needed) on current
`origin/main` (fb72d60): **stuck 0/12**, mean pass 8.16 s, mean hug 2.07 s, max drift 2.58 m — matches the
landed commit's own numbers (0/12, pass 8.17, hug 2.12, drift 2.58) within run-to-run noise. `page errors:
none`. v144 holds. Nothing new to add; not re-flagging.

## Part 2 — village cladding moire at ride distance (G3)
Scenario: `tools/playtest/scenarios/g3_village_moire.mjs` (new, committed with this report). Picked 3 houses
each in Mehamn (650,-3150) and Gamvik (2250,-3350) via `KIT.doors` filtered to within 150 m of each village
seed, ≥10 m apart. Shot each at ride distance (20 m, front-on) and close (8 m) at Nov noon, plus 2 at
21:00/dark. Shots: `~/.hermes/cache/scratch/tlloop/reports/0079.jpg` (14-still contact sheet).

## Findings
1. [G3][low, closed] **No moire on village house cladding at ride distance.** All 6 houses (3 Mehamn: tan,
   cream-white, brown; 3 Gamvik: pale grey-blue, red, dark brown) show clean, straight, evenly-spaced
   vertical board lines at both 20 m ride distance and 8 m close-up — no shimmer, no wavy/zigzag banding, no
   interference stripes, in gamvik_4_ride20.jpg (red) and mehamn_0_ride20.jpg (tan) under direct vision zoom.
   This was the last unchecked line in the buildings-slice-3 backlog item (LOOP.md "v116 houses in the
   villages for moire") — closing it, no action needed. Note: a single still can only show spatial aliasing,
   not temporal shimmer from camera motion; if Lemon ever flags moire by eye while actually riding past, a
   moving-camera capture would be the next step, but nothing here suggests that's needed.
2. [G3][low] Night shots (mehamn_0_night20, mehamn_1_night20) read well: warm lit windows against a dark
   sky with a faint aurora band, houses still read as distinct shapes via roofline/window glow rather than
   going flat — consistent with report 0071's canopy-pool finding on the same general "is dark-night lighting
   legible" question, now confirmed on plain houses too.
3. [G3][info] One Gamvik door normal pointed the camera at a neighboring building instead of open ground
   (gamvik_4_ride20's background shows a second house closer than expected) — cosmetic only, didn't affect
   judging the foreground wall; not a scenario bug worth fixing since the main house still fills the frame.
4. [G3][info] Draw calls 718 → 98 across the run (scenario resets camera/scene state between far-apart
   villages); informational only, no comparison baseline taken.

## Verified since last time
- v144 (narrow-gap notch lock, 23464b8): confirmed per Part 1 above.

## Ideas
- Buildings slice 3's backlog item (LOOP.md ~line 130) can now drop both outstanding playtester sub-asks
  it still listed as open (sheen-in-motion and village moire) — moire is closed by this report; the
  sliding-sheen-on-metal-in-motion ask (sheds/garage corrugated texture, distinct from the already-verified
  window-glass sheen in 0066) is still unchecked and worth a future pass with a genuinely moving camera
  rather than a static ride-distance shot.
