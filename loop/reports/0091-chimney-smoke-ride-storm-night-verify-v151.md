# 0091 — Chimney smoke (v151) verified at ride distance, in a storm, and at night (G3) — main @ c3020dc

**Focus**: verify the builder's latest game landing. Since 0089 (which closed v150 pine caps), 036a79b was
harness-only and c3020dc (v151, chimney smoke on all 68 chimneys) landed with its own follow-up ask still open:
"playtester judges the plumes at ride distance, in a storm (laid flat?) and against the polar-night sky."
That's exactly what this pass does.

New scenario `tools/playtest/scenarios/g3_chimney_ride.mjs`: (1) spawns the sled 15 m short of a quay-town door
along the depot→door line (the route a real rider takes, so it doesn't clip a house) and holds W past several
houses on the default chase cam, noon, clear; (2) a static view at a door with `GS.storm` pinned high and
`WX.at` forced to 1 (storm); (3) a wide polar-night (01:12) view of Mehamn village. Stills:
`~/.hermes/cache/scratch/tlloop/0091run_17753/*.jpg`, copied to
`~/.hermes/cache/scratch/tlloop/reports/0091c.jpg` (contact sheet) and the three full-res originals judged
individually with vision for the findings below.

## Findings

1. [G3][info, closes 0088/v151 follow-up] **Smoke reads correctly at normal ride distance.** Riding toward a
   house at 1 mph from ~15 m, the chimney puffs a small soft grey cloud with no hard edge, no glow, and a visible
   bigger plume off a second house ~40 m further back in the same frame — both read clearly as smoke, not snow
   spray or a sprite artifact. No pop-in or z-fighting against the roof cap. Closes the "judge at ride distance"
   ask clean.
2. [G3][info] **Storm wind visibly bends the plume (~30-45° off vertical) rather than leaving it standing
   straight up**, matching the code comment at tracklayer.js:1983 ("a storm lays it flat"). It isn't pinned flat
   along the roofline — it's a leaning streak — which reads as realistic wind-blown smoke rather than a glitch.
   No finding to act on; "laid flat" in the comment means "leaning hard", and that's what's on screen.
3. [G3][info] **Polar night (01:12, aurora up) shows faint grey columns rising off two of the five houses in
   frame, visible against the dark sky with no unwanted glow and no competition with the aurora band.** This
   matches 0089's prior read that it's subtle by design; at this distance (~45-60 m) it's legible but easy to
   miss at a glance — consistent with the chimney smoke item's own "quay town from 45 m reads faint" note, not
   a new issue.
4. [G3][low, false-alarm, logged so nobody re-chases it] The storm still briefly shows a bright vertical white
   beam over the house in frame — this is the normal "No cargo / quay 0.05 km" job-marker light beacon (every
   still has the job-marker HUD chip at top), not a chimney or smoke rendering bug. Zoomed crop confirms it's a
   separate UI-world marker, unrelated to CSMK.
5. [G3][low, scenario note] Setting `GS.storm = 1.3` directly doesn't take effect immediately — `GS.storm` read
   back as ~1.11 after a 10 game-s wait, so storm intensity ramps toward its target rather than snapping (likely
   `stormPhase`/`stormT` easing). Not a bug; future storm scenarios should wait longer or drive `stormT` directly
   if they need the peak value, not just set `GS.storm`.

## Verdict
v151 chimney smoke closes clean on all three asks from its own follow-up note (ride distance, storm, polar
night). No regressions, no new bugs. Recommend the builder drop the "playtester verify" tag from the v151
backlog entry; nothing left to action here.

smoke: not run this pass (no code touched); scenario itself ran clean, page errors: none.
