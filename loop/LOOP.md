# Tracklayer improvement loop

Two unattended bots work on the web game full time (Lemon's order, Mon 26 Oct 2026):

> "I want the full time opus and sonnet bots playtesting and coding tracklayer to be better, the walking
> easier to traverse, the snowmobile progression make more sense, the visuals to be better"

- **Playtester (Sonnet, cron "Tracklayer playtester")** plays the current `origin/main` in headless Chrome,
  measures, takes stills, judges them, and writes one report per pass to `loop/reports/`. It never edits
  game code.
- **Builder (Opus, cron "Tracklayer builder")** triages new reports into the backlog below, takes the top
  item, builds it in its worktree, verifies it by playing, and lands it on `main` (push to GitHub).

Neither bot asks Lemon anything. Decide, log the reasoning, move on. Lemon steers by editing this file
(the **Owner notes** section wins over everything else here) or by talking to a Hermes session.

## The three goals

### G1 Walking: easier to traverse
On foot is where the game fights you hardest. Make getting around on foot pleasant without losing the
deep-snow feel (powder should still be slower than a packed trail; you should still want the sled).
Baseline measured 26 Oct (smoke.mjs, fresh Frontier save, flat open ground):
fresh powder **1.01 m/s** and tired 0.57 after 8 s; back along your own trench **1.75 m/s**.
Since v58 (g1_walk30.mjs): powder **1.56 m/s**, 30 m in **19.3 s**; trench **2.23 m/s**; tired 0.77 after 30 m.
Since v60 (g1_slope.mjs, 0.85 m powder on a 0.27 grade): up **0.91**, across **1.32**, down **1.49 m/s**.
Since v61 (g1_yards.mjs, 10 m from a standstill toward a door): plowed town yards **2.53 m/s** (was 1.48–1.55
in powder), open powder 1.38. Since v64: shore-road house door square-on from 12 m out **2.42 m/s** (was 1.93).
Since v84 (g1_lanes.mjs): depot yard edge → shore-road doors 24–49 m at **2.62–2.66 m/s** (was 1.80–1.90).
Since v89 (g1_lanesob.mjs): lanes routed round obstacles; lanes crossing an obstacle 8/14 → 1/15; lot9 72 m at 2.65 m/s
(was stuck against the pier freight shed at 32 m).
Since v96 (g1_jog.mjs): Shift jog. 20 m powder 1.48 → **1.79 m/s**, trench 2.32 → **3.04**; plowed lane 3.7–3.8 m/s,
blown after 17 s / 58 m, then walks ~2.1 until breath is back (30 s: 85 m vs 71 walking).
Since v111 (g1_turn.mjs): held A/D pivot ramps 2.2 → 3.6 rad/s over 0.12–0.45 s: 180° on the spot **1.45 → 0.99 s**,
facing a door 90° off while walking 0.72 → 0.54 s; a 70 ms tap still ~8.4°.
Since v113 (g1_snowshoe.mjs): the $120 recovery kit's snowshoes: powder 30 m **19.8 → 14.2 s** (1.52 → 2.11 m/s), sink
0.29 → 0.12 m, trench 2.32 → 2.59; hard pack unchanged (footWade(…, pack 1) = 1).
Directions to explore (measure before and after, by gameClock):
- Base pace in powder and on packed snow, the tiredness curve, how much depth slows you.
- Snagging: trees/rocks/buildings/the sled push you sideways (`footStep` obstacle loop); getting stuck on
  corners, doorways, quay edges, slopes. Steering feel (turn rate 2.2 rad/s, turning on the spot).
- Slopes: walking up/down hills, cliffs, what the camera does on foot.
- Ways to go faster on foot that fit the game: packed paths in town, plowed roads, snowshoes as a cheap
  Bytteboden/shop item, a jog key, gentler start-up when you first press W.
- Clear on-foot prompts (where's my sled, how to get back on, what E does here).
Target: a new player can walk from the sled to a door 30 m away in powder in under ~20 s game time
without fighting the controls, and town/quay walking feels brisk.

### G2 Snowmobile progression that makes sense
The ladder (`SLEDS`: cost + `need` = deliveries), parts (`PARTS`), courier ranks (`RANKS`), jobs and their
gates should tell one clear story: earn → see what the next machine/part opens → buy it → do new work.
Things to check and fix:
- Map the full ladder: every sled's cost, delivery requirement, stats, what jobs it unlocks/suits.
  Is each step a real upgrade for a reason the player can see? Is any sled pointless or a trap?
- Earn rate vs prices: how long (game minutes, number of jobs) from a new save to the first upgrade, the
  second, ... Aim for the first meaningful purchase within ~10–15 min of play and a steady cadence after.
- Does the garage/tablet say what's next, what it costs, what it needs, and why you'd want it?
  Locked items should say how to unlock them. Job cards should say which sled/part they need.
- Starting experience: what does a brand-new player do in the first 5 minutes? Is the first job obvious?
Write the ladder table into this file (section "Progression map") the first time it's audited and keep
it current.

### G3 Visuals
Make it look better at a glance and up close: lighting, snow surface, sky, the sled and rider models,
buildings, trees, towns, UI polish. Judge with stills (contact sheets + vision). Lemon notices boxy
shapes, flat lighting, plastic look and over-bright effects first. Keep frame rate in mind: check with
the FPS readout or `renderer.info` before/after anything heavy, and respect the `GFX` presets.
Day and night both matter (polar night is most of the game's daylight), and so does the first view on
the title screen and at the quay.

## Rules (both bots)
- Work only in your own worktree: builder `~/Documents/GitHub/tracklayer-loop-build` (branch `loop`),
  playtester `~/Documents/GitHub/tracklayer-loop-play` (detached, reset to `origin/main` each pass).
  **Never touch `~/Documents/GitHub/tracklayer`** (Lemon's checkout; other sessions keep uncommitted work
  there, e.g. the spare-seat tour work) or the `settings-desktop` worktree.
- One change per builder pass. Small, finished, verified, landed. A big item gets split.
- Test with `tools/playtest/run.sh <scenario>` only (isolated ports + fresh profile, cleans up after
  itself). `scenarios/smoke.mjs` must pass (exit 0, "page errors: none") before anything lands.
- Player-facing change → update README.md and bump `tracklayer.js?v=N` in index.html.
- Keep the game's canon: one map (tablet Map app, M toggles it, no big map), realism-first handling,
  the tether/crash/rescue systems, Norwegian Finnmark setting. Don't delete features to "simplify".
- Commit messages in plain English saying what the player will notice, ending `; script vN` like the
  existing history. Stage only your own paths. `git fetch` + rebase before push; re-run smoke after a
  rebase that pulled code.
- Disk: if `df -g ~` shows under 20 GB free, skip all Chrome runs that pass and log it.

## Owner notes (Lemon edits here; overrides everything above)
- (none yet)

## Progression map
First audit 26 Oct 01:25 (`scenarios/g2_ladder.mjs`: stats as `stats()` computes them with stock parts; boards
sampled 40× per level). Part `tier` = SLEDS index the part needs (Woodsman = tier 1). p/d = power ÷ powder drag.

| Sled | $ | Deliveries | Power | Drag | Grip | Fuel L | p/d | Opens (parts at its tier) |
|---|---|---|---|---|---|---|---|---|
| Frontier 340 | 0 | 0 | 1.00 | 1.05 | 0.5 | 16 | 0.95 | (zip 1.6: sharp off the line) |
| Woodsman 440 | 600 | 4 | 1.20 | 1.00 | 0.4 | 22 | 1.20 | 22 parts: receiver-heavy, groomer, trailer, elec winch, supercharger |
| Ranger 500 | 900 | 8 | 1.41 | 1.02 | 0.3 | 20 | 1.38 | 18: flatbed, tiller, turbo, paddle track, heavy winch |
| Sprint 580 | 1700 | 13 | 1.58 | 1.12 | 1.1 | 18 | 1.41 | 8: EFI, hybrid track, freight deck; since v114 trail gearing +25% pull on packed/ice (`g2_sprint.mjs`: trail 35.9 m/s vs Summit 30.3, ice 47.6 vs 46.6, powder 19.9 vs 22.4) |
| Summit 600 | 2400 | 18 | 1.68 | 0.88 | 0.8 | 24 | 1.91 | 3: mountain track, stage 3, expedition tank |
| Trekker 550 | 3400 | 24 | 1.61 | 1.00 | 0.6 | 30 | 1.61 | nothing; since v66 built-in touring kit: +2.5 warmth, 2 parcels, burn 0.9 (range 1.39× Summit) |
| Apex 800 | 5200 | 32 | 2.02 | 0.78 | 1.3 | 26 | 2.59 | no parts; since v85 the only class insured for fell freight (rank 32, $3.9–7.6k avg $5.6k) |
| Matriarch 850T | 9800 | 46 | 2.50 | 0.66 | 1.8 | 30 | 3.79 | no parts; since v86 the only sled rated for tonne loads (rank 46, 920–1,050 kg, $9.6–10.4k avg $9.9k) |
| Aurora E | 14500 | 60 | 2.24 | 0.72 | 1.6 | 34 | 3.11 | since v87 the only sled let on NILU clean-air runs (rank 60, quay → 4–5 km out, 110–220 kg trailer, $8.7–11.7k avg $10.2k); since v75 plugs in at any village/cabin/relay/home/pump for $0.75/L, burn 0.85 (range 40 L-eq, longest; Matriarch 30) |

Ranks/contracts (pay = average offered): 3 deliveries grooming ~$900 (needs groomer $700 + receiver $150, both
Woodsman-tier, so really opens at 4); 5 heavy freight ~$1500 (trailer $900 + Freight licence); 12 priority
~$2450; 20 Slettnes expedition ~$3500 (flatbed $2400, Ranger-tier). Board parcels: $145 avg at 0–5 deliveries
(0.6 km), ~$295 at 6–10 (roaming, 2.3 km), ~$370 at 12+; all ≈ **$48–60 per estimated minute at every level**
(sled upgrades only raise it by beating the estimate). First upgrade (Woodsman $600 at 4 deliveries) ≈ 4–5
round-town jobs ≈ 15 game-min: on target. After that a single contract outpays 6 parcels.

## Backlog
Order = priority. Builder keeps it ordered; ties go to whichever goal has had the fewest recent landings.
Format: `- [ ] Gn: what, why (report #, numbers)`. Done items move to `loop/PROGRESS.md`.

- [ ] G3: Daylight slice 8 (v79 warm sun, v77 sheen, v76 blue fill): open backcountry is now warm near / blue far,
      but still low-contrast overall (`g3_day` 05 band b−r spread 13, sd 8.9; luma flat). Next lever is real
      variation, not tint: e.g. denser/larger far drift relief or sun-facing slopes on the far ring catching more
      light (far terrain normals are 8 m-grid smooth). Measure with `g3_day.mjs` + `tlloop/b22/wc.py`/`nf2.py`.
      Report 0022 F1: `imgstats.py` local contrast 05 backcountry **2.70**, 06 March **2.63** (quay 4.56, close-up
      3.89; std 39.8/40.2 vs 43–52): no visible drift shadows or bumps at all; use 2.70 as the before baseline.
      v83 (slice 8a): near-patch sastrugi tilt ×2 → local 05 **2.71 → 2.97**, 06 2.63 → 2.89 (quay 4.54 → 4.64).
      Still open: the 45–150 m band (far `fdH` near term) and global std (40); maybe a mid-scale (2–4 m) dune term.
      Report 0023 F2: `g3_day` 05 local contrast varies 2.97–3.15 run to run (backcountry spot not pinned); pin
      the search start before trusting a <0.2 change.
      v88 (slice 8b): far `near` dunes (×0.35 → 0.8 + a 45×15 m scoop term 0.4) + patch relief fade 28–45 → 34–50 m.
      `g3_midband.mjs` (pinned from SPAWN) + `bandstats.py` strip 3 (horizon→~30 m): Nov 3.29 → 4.69, March 2.93 → 4.29,
      low cam across sun 0.87 → 1.11; away from sun unchanged 0.25 (flat light, expected). Left: the scoops read as
      slightly uniform oval hollows (value-noise blobs); stretch them along the wind / break their outline.
      Report 0028: v88 numbers reproduce (Nov 4.68, March 4.28); at play distance vision sees wind-stretched streaks, no
      oval blobs. Check with a macro camera (20–40 m look) before working the ovals; may already be fine.
      v94 (slice 8c): macro check (`g3_macro.mjs`, 9 m up looking 40 m out) DID show flat blue oval puddles on a facing
      hillside 100–300 m out; near dunes now domain-warped + ridged crests, crest weight faded by dist/cos(view) so
      grazing flats don't barcode. Local 03/04/05 3.01/4.06/3.11 → 3.22/4.16/3.57; midband strip 3 Nov 4.69 → 5.49.
      Still open: global std (~40) / overall low contrast; crests may read a touch sand-dune-like on big facing slopes.
      b41 (09:36, v97) recheck: 05 std 40.3 local 3.07, 06 40.2 / 2.96; vision on 05: ripples and far hills read, but the
      foreground under a 4° sun is evenly lit (no grazing-light shadows on the relief). Next slice idea: stronger
      self-shadow/darker lee sides on near relief when the sun is low, not more tint.
      v100 (slice 8d): near-patch drift shadows marched toward the TRUE sun (`uSunT`, `uMicroK`; 6 taps, 3 on low).
      `g3_driftshadow.mjs` local Nov toward/across-L/across-R/away 3.71/2.77/2.84/2.81 → 3.91/3.00/2.99/3.03; March
      unchanged (sun 11°, few streaks). Vision: long blue lee bands in the foreground, no ring/noise. Still open:
      the shadows end with the patch relief at 34–50 m (far `fdH` has no equivalent; could add a cheap 2-tap version),
      and nothing yet for GPU cost (playtester: compare `renderer.info`/FPS on GFX low vs high in open backcountry).
      v101 (slice 8e): far-terrain lee shadows (`fdSh`, 5 taps 3–48 m toward `uSunT`, 3 on low, fade 1.2–2.2 km).
      `g3_fardrift.mjs` + `bandstats.py` strip 5 (mid band): Nov across 3.44 → 3.99, high across 5.65 → 6.29, high toward
      3.34 → 3.90, March 2.76 → 3.09; near strips unchanged. Still open: GPU cost now 5 extra fdH per far pixel (FPS check
      on GFX low/high is the playtester's job), and the overall global std (~40) is still flat.
      v107 (slice 8f): clear-day haze 0.0017×(1−0.3) → ×(1−0.5) (fog at 1 km 76% → 51%; ring edge still >94% fogged on
      high and low). New `g3_vista.mjs` (25 m up, level, across/toward/away from sun; quay + pinned backcountry, Nov/March)
      + bandstats strips 4–5: back Nov away 0.36/1.26 → 0.37/2.20, toward 4.79/10.40 → 5.58/10.75, quay across 1.51/5.60 →
      1.90/6.05, March away strip 5 0.95 → 1.63. Ground-level g3_day unchanged (far land is a sliver there). Vision: subtle,
      far hills a little more shaped, no seam/pop. Still open: a faint flat pale band where the hazed far ground meets
      the sky in the backcountry vistas (seen before and after); global std ~40.
      Report 0045: v107 numbers reproduce (fog 1 km 0.51, March away strip4 1.63); F2 the AWAY-from-sun view is still the
      flattest (pale featureless basin). v108 (slice 8g): the hard horizon seam was the sky's haze dropping from 100%
      (below the horizon) to 45% in one pixel row; now eases over ~3°. `tools/playtest/horizonstep.py` max 6-row RGB step
      in the sky/ground band: back Nov away 17.4 → 9.1, March away 19.0 → 8.6, toward/across/quay unchanged ±0.5.
      Still open: away-from-sun far terrain lit flat (hemi fill only; maybe a sky-gradient or self-shadow term facing
      away), and the band below the horizon is one flat fog colour (far ring 99% fogged at 2.6 km).
      b53 tried baked terrain-cast hill shadows (512² CPU bake toward the true sun, 1.6 km march, 1.5 ms/frame over 32
      frames; 40% of the map shaded at Nov noon, 15% in March) on the far terrain past ~250 m: NOT landed. Vision saw at
      most faint blue patches; local contrast fell everywhere (g3_vista back Nov across strip 4 5.93 → 5.35, felltop Nov
      across 3.21 → 2.94) because shaded land loses its N·L/drift relief and the hemi fill + haze swamp the rest. Don't
      retry cast shadows as the lever; patch kept at scratch tlloop/b53/hillshadow_v110_experiment.patch. New
      `scenarios/g3_felltop.mjs` (80 m up over the highest spot near SPAWN) for vista work.
      b55 re-look (02_back_nov_away, vision): the near/mid field is well shaped (lee shadows, dunes); only the band past
      ~400 m is a pale wash, and a front-lit anti-sun view under a 4° sun is flat in reality too (the pink Belt of Venus
      band is already there). Diminishing returns: only take this again with a concrete, additive idea.
- [ ] G3 (low, playtest, follow-up to v109 lake skin): `g3_lake.mjs` + `lakestats.py`. Unchecked: the lakes at night /
      polar-night twilight / aurora (ice streaks go through the normal lit path, should be fine), in a storm, during the
      melt (open water from the shore must still win over the streaks), and at rider height whether the near patch → far
      hand-over ~45 m out shows as a faint light band (b52 `01_nov_low` had one soft band; unclear if it's the seam).
      Report 0047 (`g3_lake_conditions.mjs`): night and a strong aurora keep the streaks (std 25/38, aurora 57/36); storm
      washes it flat (3.4/7.4) like all terrain, by design. Still open: melt, and the 45 m seam: `LAKES[].r` isn't the real
      ice mask, so confirm footing (walk on from the shore vantage, check `P.ice`) before placing the camera.
- [ ] G1 (low, playtest, follow-up to v106): sled column over ridges now lifts above the crest (`g1_sledpin_rise.mjs`
      rise 600 m 0 → 14 lit rows); still unchecked: walking over the crest (does the lifted column slide down smoothly
      as the sight line opens?), in trees, next to a delivery/depot beacon, and a rise close to the walker (<25 m
      samples are skipped).
      Report 0044: crestwalk lift 252 → 203 → 0 at 600/500/400 m read as a "snap", but the scenario teleports 100 m
      per sample; the lift is already smoothed (6/s) and `need` falls continuously as the eye climbs. Re-check with a
      continuous walk (hold W over the last ~60 m before the crest, sample every 2 game-s) before building anything;
      watch for a jump when the crest crosses the 25 m skip distance.
- [ ] G1 (low, playtest, report 0036 F2): `g1_jog_player.mjs` hooks `window.toast`, which never sees the game's
      toasts (IIFE-local function); switch it to the MutationObserver on `#toasts` used in `g1_jog_backcountry.mjs`.
- [ ] G2 (low): Late ladder polish (slices 1–3 done: v85 fell/Apex, v86 tonne/Matriarch, v87 clean-air/Aurora,
      `scenarios/g2_fell.mjs`, `g2_cleanair.mjs`; v98 TONNE chip, `g2_tonnechip.mjs`).
      Report 0026 F2: the gates are insurance/rating rules, not physics (Summit hauls 500 kg up a 0.38 grade at 33 mph
      vs Apex 42, never bogs); 0026 idea: the locked card could say "can haul it, just slower" if it stays coherent.
- [ ] G2 (playtest, follow-up to v105): the empty-pace part of `coldRun` is still pessimistic on real routes (laden
      trailer rides ran 17–22 m/s vs 12.6 assumed; Woodsman Gamvik→Ifjord card 321% vs ~128% projected), and the
      depot→Ifjord ride lost warmth at only 0.12/s vs 0.30 modelled (thaw near town?). `g2_coldrun_ride_laden.mjs`
      (LR_SLED/LR_FROM/LR_KIND): ride 3–4 more legs incl. a deep-powder one and a 400+ kg flatbed leg before any
      further retune; check whether snow depth along the line should feed the pace.
      b54: Summit lvl21 210 kg trailer rode 29.6 m/s vs est 20 (card 202% vs projected 107%); Ranger flatbed heavy leg
      again useless (autopilot oscillated 129–258 m along, 2 crashes). Decision: keep the empty pace conservative for now:
      it equals the slowest real leg (0034 Woodsman 12.7 m/s), others run 1.3–1.8× it, and the ≥100% flag was right on
      5/7 ridden legs; only retune with a reliable (hand-steered) Ranger flatbed ride in hand.
      Report 0043: Gamvik→Ifjord light trailer reconfirms (card 321% vs real 137%). Its heavy-flatbed stall (Woodsman,
      265 kg, 2.16 m/s, 2 crashes, card 294% vs 1082%) isn't a card fault yet: flatbed is Ranger-tier (Woodsman can't
      fit it in play) and the scenario's autopilot crashed twice and looped on its own trail. Re-ride on a Ranger with
      the flatbed and hand-steered/hardened nav before treating it as under-warning.
- [ ] G1 (playtest, follow-up to v113 snowshoes): `g1_snowshoe.mjs` covers flat powder. Unchecked: snowshoes on a slope
      (`g1_slope.mjs` with the kit), at night, with a crash (crashGetUp clears FOOT.shoe: you walk back un-shod, intended),
      and whether a new player finds them (garage Parts card note; first-Q-off toast). Also judge the shoe mesh from the
      chase camera at walking pace (b57 stills: grey oval rims read, dark deck barely shows).
- [ ] G2 (playtest, follow-up to v114 Sprint trail gearing): `g2_sprint.mjs` rides 14 game-s from rest, yaw pinned. Check
      by hand: does the Sprint feel twitchy/over-fast on its own tracks at 117 mph, and does it crash more on the lake?
      Also b58 noticed every sled hits 121–137 mph on lake ice from rest in 14 s (Ranger 121): ice top speed may be
      unrealistically high (rolling 140 vs 260 on snow, no extra air drag); worth a realism look on its own.
      (Harness: the Trekker legs in that run parked on a bad spot and crashed at 0.1 s; harden `park` choice per sled.)
- [ ] G3/G1 (low, playtest, follow-up to v112 shoulder slide): walk-away + turn-on-spot verified clean (report 0050).
      Still unchecked: narrow gaps between two houses (second camWallClip on the slid spot).
- [ ] G1 (low, follow-up to v111 turn ramp): door turn + stick twitch verified clean (report 0049). Left: pivot is the same
      in deep powder and on hard pack; judge whether that feels right.
- [ ] G2: First-5-minutes playtest of a new save: the board half is good (report 0007: 6 jobs posted, LOAD
      works first try, route drawn). Report 0021: accept → first delivery 41.2 game-s for 768 m, +$120 (first
      cash is quick). Still open: gameClock from a new save to $600 / the Woodsman (playtester owns: extend
      `g2_first5min.mjs` over ~4 more deliveries).
      Report 0046 (`g2_first5min_chain.mjs`, real claim → pickup → drop): $845 after 5 deliveries at gameClock 214 s
      (~3.6 game-min), 3–4× quicker than the 10–15 min target, but auto-nav drives straight lines at 45–96 mph. The
      Woodsman also needs 4 deliveries, so cash isn't the gate. Don't retune until a hand-paced (or speed-capped ~40 mph)
      run gives a real-player number. (0007 F2 Tab → Home done in v91: Tab opens Parcels on a new save.)
- [ ] G2 (low, playtest, report 0031 F3): `g2_first5min.mjs` auto-nav drives straight into the quay shed on the
      Neset order and then shuffles on foot; harden it (steer round `obNear`, or detect `FOOT.on` after a crash and
      tap Q back on) so first-5-min numbers mean something. Since v93 the first morning is storm-free, so warmth
      there is ~−0.34/s (`g2_coldrate.mjs`).
- [ ] G3 (low, playtest): `g3_beacon.mjs`'s 1200 m spots put the depot behind a hill (beacon foot hidden), so the
      far fade (v71) is only judged at 700 m; pick spots with line of sight and hide the HUD toasts for cleaner stats.
- [ ] G3 (low, playtest, report 0030 F4): `g3_ridge.mjs`'s rock search keeps landing on the same two snow-dominated
      spots, so the v90 per-pixel rock blend itself was never eyeballed; bias the search to a steep thin-snow slope
      50–150 m out so a pass can judge grey scree + snow tongues up close.

Last triaged report: 50
