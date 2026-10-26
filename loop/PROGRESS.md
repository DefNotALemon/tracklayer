# Builder progress log

Newest first. One entry per builder pass:

```
## <date time> — <short title> (Gn) — <landed hash | not landed: why>
What changed for the player, numbers before → after (gameClock), smoke result, stills judged (paths), what's next.
```

## 2026-10-26 13:25 — Snowshoes from the recovery kit (G1) — 3827a0b
Triage 0049 (v111 door turn 0.58 s with the real camera, stick ramp scales with deflection: not twitchy) and 0050 (v112
slide eases out on walk-away and holds through a turn): both clean, matching halves of the two follow-up items closed
(narrow-gap camera and powder-vs-pack pivot left as small items). Top G3 daylight item is diminishing returns (b55), the rest
are playtest/harness items, so took an untouched G1 direction from the goals: snowshoes as a cheap item. The garage's
$120 "Shovel, strap & snowshoes" kit (tier 0) already named them; now buying it once (`partsOwned["recovery:kit"]`) puts
them on every non-ski Q off (`FOOT.shoe`, `shoesOwn`, `footWade`): powder wade 0.57 → 0.78 of hard-pack pace, deep-snow drag
0.25 → 0.08, sink ×0.4, depth strain halved; pack 1 unchanged; cleared after a crash. Oval frame + deck + tail mesh under
each boot (`shoeMesh`), one-time toast, Parts card note. New `scenarios/g1_snowshoe.mjs` (same spot type, with/without):
powder 30 m **19.8 → 14.2 game-s** (1.52 → 2.11 m/s), sink 0.29 → 0.12, trench 2.32 → 2.59; no-kit run identical before/
after (1.49, 2.37). Vision (b57/after.jpg + feet crop): grey oval frames under both boots, no clipping/floating; dark deck
barely shows. smoke exit 0, page errors none (powder 1.54, trench 2.24, 66.8 mph). README on-foot para; v113. Next:
playtest snowshoes on slopes/at night/new-player discoverability (new item); G2 hand-paced first-5-min.

## 2026-10-26 13:15 — Over-the-shoulder view on foot with a wall behind you (G3/G1) — 0d66edf
No new reports (last triaged 48). Took the v110 follow-up: with a house right behind you the chase camera sits ~0.6 m back
and the helmet filled the middle of the screen (vision on b56/before.jpg: 6/6 frames mostly helmet). Now, on foot only,
when `camState.wallK` < 0.6 the camera slides up to 0.42 m over the right shoulder (`camState.shK`, eased 6/s; render-only,
undone at the start of the next frame so it can't pile up through the lerp; the slid spot is re-run through camWallClip;
aim shifted 45% of the slide; cleared in first person). New `scenarios/g3_camshoulder.mjs` (8 town doors, rider facing
out): head NDC x **0.00 → −0.47** (left third), head y −0.03 → 0.00, cam→head 0.63 → 0.72 m, inside a building 0/8 → 0/8.
Vision (b56/after.jpg): road, houses and fells readable past the helmet, natural over-the-shoulder, no clipping. smoke exit
0, page errors none (powder 1.56, trench 2.23, 67 mph). README V-key line; v112. Next: playtest walking away/turning with the
slide on (item updated); G2 hand-paced first-5-min.

## 2026-10-26 13:05 — Quicker pivot on foot when you hold A/D (G1) — 60bac72
Triage 0047 (lake at night/aurora keeps its streaks; storm flat like all terrain, by design: dropped; 45 m seam test
inconclusive because `LAKES[].r` isn't the ice mask: hint noted on the lake item) and 0048 (garage + quay shed 0/2 camera
clips; church/shops/cabins are K.house with `.box`): camwall item downgraded to the shoulder-offset idea only. Skipped the
top G3 daylight item after a re-look (b55/before 02_back_nov_away: only the >400 m front-lit anti-sun band is flat, which
is physical; noted as diminishing returns) and took an untouched G1 direction from the goals: steering feel on foot.
`footStep` turned at a flat 2.2 rad/s; now a held A/D ramps to 3.6 rad/s over 0.12–0.45 s (`F.turnT`, `F.turnK`), taps
unchanged, and the on-the-spot step cadence scales with it. New `scenarios/g1_turn.mjs`: 180° on the spot **1.45 → 0.99
game-s**, facing a door 90° off while walking 0.72 → 0.54 s (arrival 15 m unchanged ~9.2 s, walking dominates), 70 ms tap
8.4° → 8.9° avg (frame-pacing jitter 6.3–10.5; ramp starts after 0.12 s so taps are the same code path). Vision
(b55/turn_after.jpg): mid-turn pose stepping, nothing broken. smoke exit 0, page errors none (powder 1.53, trench 2.22,
66.7 mph). README on-foot para; v111. Next: playtest the turn at a door / with a stick (new low item); G2 hand-paced
first-5-min.

## 2026-10-26 12:50 — Chase camera stays out of the house behind you (G3/G1) — 0e665a2
Triage 0046: F1 (time-to-Woodsman 3.6 game-min with auto-nav, 3–4× under target) noted on the first-5-min item, no
retune until a real-pace run (the Woodsman also needs 4 deliveries); F2 "static white streak in the sky" is the
Kjøllefjord pickup beacon seen from km away (leg3_pick_t72 shows it on the quay): dropped, by design; F3 one-off harness
stall, not reproduced: dropped. Its delivery stills (leg0/leg2/zz_final) were a screenful of yellow timber wall: the
camera inside the Strandbu house. Also re-rode the G2 cold-run item first (Summit trailer 29.6 m/s vs est 20; Ranger
flatbed run stuck again) and decided to keep the conservative pace (logged on the item). Took the camera bug instead.
New `camWallClip()`: casts focus → chase camera against obGrid footprints (houses via a real wall box `box` on their
circles, since the circles stop up to 1.5 m short of the walls; other non-tree footprints grown 0.45 m), pulls the camera
in short of the first wall, drops it halfway to shoulder height and aims nearer (`camState.wallK`) so the rider stays in
frame; drone view exempt. New `scenarios/g3_camwall.mjs` (8 town doors, rider on foot / sled parked at the door facing
out): camera inside a building foot **4/8 → 0/8**, sled **8/8 → 0/8** (circle probe; vision on the before sheet saw all 8
inside walls). Vision after (b54/after3.jpg): every tile looks out over town, rider/sled readable; on foot the helmet sits
mid-frame at 0.6 m. smoke exit 0, page errors none (powder 1.54, trench 2.26, 6 s 66 mph). README V-key line; v110.
Next: other buildings' footprints (new low item); G2 hand-paced first-5-min; G3 away-from-sun flatness.

## 2026-10-26 12:40 — Hill-cast shadows on the far fells (G3) — not landed: no visible gain, contrast down
No new reports (last triaged 45). Took the top G3 item (far land flat, esp. away from the sun). Built terrain-cast
hill shadows: `ground` sampled at 16 m into a 512² map, marched toward the TRUE sun (16 m steps, then +6%, to 1.6 km;
soft edge 3 m + 2% of range), baked 16 rows/frame (whole map 43–53 ms ≈ 1.5 ms × 32 frames, re-bake when the sun moves
~1.5°), sampled by the far terrain past 220–480 m (direct ×(1 − 0.65·shadow)), plus a 0.3 dim of the sun when you stand
in a shadow. The bake is right (map dump: shadows fall north of the high southern ground; 40% of the map shaded at Nov
noon, 15% in March). But the look didn't improve: g3_vista bandstats back Nov across strip 4 5.93 → 5.35 (near 0) /
4.96 (near 0.3), toward strip 3 5.59 → 3.90; new `g3_felltop.mjs` (80 m over the highest spot) local Nov across
3.21 → 2.94, toward 3.89 → 3.41, mean |diff| only 1–3 luma (4.4 at strength 0.9, contrast lower still). Vision: faint
bluer patches, no artifacts, no added depth. Shaded land loses its N·L and drift relief while hemi fill + haze swamp
the darkening. Reverted; patch at scratch `tlloop/b53/hillshadow_v110_experiment.patch`; kept g3_felltop.mjs. No game
change, no smoke needed. Next: the away-from-sun lever should ADD light variation (sky-gradient / snow sheen), not
remove direct light; or switch to a G1/G2 item.

## 2026-10-26 12:12 — Frozen lakes look like wind-scoured ice, not a flat grey disc (G3) — f38ad4f
No new reports (last triaged 45). Took the b51 lake item (the top daylight item is open-ended; this one was concrete and
what the vistas showed). Cause: far-terrain lake vertices are a flat 0.62/0.76/0.86 that the drift relief and sky sheen
both skip (gated on vColor.r > 0.8). New shared `LAKE_GLSL` `lkBare()` (streaks ~80×17 m along the north-westerly, bent,
plus 25×4 m fine streaks, ~half bare ice) used by BOTH the snow patch (ice mix 0.3 → 0.08 + 0.72·bare) and the far
terrain (snow 0.88/0.92/0.975 ↔ ice 0.47/0.64/0.77, faded to the mean by pixel footprint so it can't alias; weak 0.12
relief on the snowy streaks; sky sheen on the ice). New `scenarios/g3_lake.mjs` (lake 3, shore 25 m up / ridge vista 120 m
up / rider height on the ice, Nov + March noon) + `tools/playtest/lakestats.py` (lake-only crops). Before → after std/local:
shore Nov 2.86/0.40 → 8.61/1.97, March 2.09/0.26 → 8.10/1.75; vista Nov 4.47/1.32 → 6.76/2.79, March 3.30/0.72 → 5.82/2.17;
low Nov 8.59/1.79 → 11.0/2.46. A first try (relief 0.35) made the lake read as dune-covered land; cut to 0.12 so it stays
flat. Vision (b52/c2_nov.jpg, c2_low.jpg): streaked snow over blue ice, lake outline still clear, no stripes; the old
white-near / grey-far step at rider height is gone. smoke exit 0, page errors none (powder 1.51, trench 2.21, 67.2 mph).
README sky para; v109. Next: playtest the lakes at night/storm/melt (new low item); daylight item (away-from-sun flatness).

## 2026-10-26 11:58 — No hard pale line along the horizon (G3) — ea01f03
No new reports at start (0045 arrived during the pass: v107 verified, numbers reproduce; F2 away view still flattest →
noted on the G3 item; F3/F4 info). Took the top G3 item's open note (pale band where hazed land meets sky). Row profiles of
`g3_vista` away shots showed a 2-row step (sky 195,191,206 → fog 173,184,204): the sky dome is pure fog below the
horizon but only 45% haze just above it. Now the haze eases 100% → the old 45% curve over ~3° (h 0–0.05). New
`tools/playtest/horizonstep.py` (max one-row luma / 6-row RGB step, middle columns, rows 15–65%): back Nov away 7.87/17.4
→ 2.01/9.09, March away 8.02/19.0 → 1.69/8.61; across/toward/quay unchanged ±0.5; bandstats unchanged except the seam's
own strip (away strip 3 0.38 → 0.20). Vision (b51/cmp2.jpg): seam gone to a soft gradient, sun glow toward the sun
intact. smoke exit 0, page errors none (powder 1.55, trench 2.22, 6 s 66.1 mph). README sky para; v108.
Next: frozen lakes read as flat grey discs in vistas (new G3 item); away-from-sun far terrain flat; G1 crest walk.

## 2026-10-26 11:50 — Clear days less hazy: far fells keep their shape (G3) — de022b8
Triage 0043 (light trailer reconfirms the open pessimism note; heavy-flatbed "under-warning" was a Woodsman with a
Ranger-tier flatbed plus an autopilot that crashed twice: noted on the G2 item, re-ride on a Ranger first; F2 cargo
damage on crash = existing design) and 0044 (v106 lift "snaps" 203 → 0 m between 100 m teleports; the lift is smoothed
and falls continuously while walking, so logged as a continuous-walk re-check, not a build). Took the top G3 item
(daylight, global flatness). g3_day stills: the backcountry sky and far hills share one pale wash. Clear-day fog
0.0017×(1−0.3) → ×(1−0.5): fog at 1 km 76% → 51%; ring edge 2.6 km (high) / 1.5 km (low, fogK 1.3) still >94% fogged.
New `scenarios/g3_vista.mjs` (25 m up, level, across/toward/away from the sun, quay + pinned backcountry, Nov + March),
bandstats strip 4/5 before → after: back Nov away 0.36/1.26 → 0.37/2.20, toward 4.79/10.40 → 5.58/10.75, quay across
1.51/5.60 → 1.90/6.05, March away strip 5 0.95 → 1.63; near strips unchanged. g3_day (ground level) unchanged within
0.1 (far land is a sliver there). Vision (b50/cmp.jpg): subtle, far hills/turbines a bit more defined, no seam or
pop-in. smoke exit 0, page errors none (powder 1.53, trench 2.23, 6 s 66.4 mph). README sky para; v107.
Next: the pale flat band where hazed far ground meets the sky in backcountry vistas; G1 continuous crest walk; G2 Ranger flatbed leg.

## 2026-10-26 11:35 — Sled light column rises from behind a ridge (G1) — e4b91c6
No new reports (last triaged 42). Took the top item (0042 F1). `sledPinTick()` now samples the ground at 15 points on
the camera→sled line (25 m+ out) and lifts the column's foot to 10 m under the sight line over the highest crest (crest
hides the foot; smoothed); it also scales ×max(1, d/200) in height and width so the beacon shader's far fade doesn't
shrink it to a stub. New `scenarios/g1_sledpin_rise.mjs` (same spots as g1_sledpin_far, probe = rows where the column
strip beats side controls by 25+ luma over the full height). Before → after: ridge 600 m (59 m crest) **0/85 → 14/85**
rows (max lift 14 → 106; foot raised 301 m, camera 271 m above the sled); flat 300 m 7 → 13; flat 150 m 16 → 16 (foot
stays on the sled). Vision (b49/cmp.jpg): before nothing above the crest; after a thin pale column standing above the
ridge line, not garish. smoke exit 0, page errors none (powder 1.53, trench 2.23, 66.6 mph). README walking para; v106.
Next: playtest walking over the crest / trees / near beacons (new low item); G3 FPS check; G2 laden legs.

## 2026-10-26 11:20 — COLD RUN card stops over-warning on ordinary trailer loads (G2) — 38a902f
Took the v102 follow-up (G2 had the fewest recent landings): ride a laden leg the card flags. New
`scenarios/g2_coldrun_ride_laden.mjs` (card's load really on the hitch, calm, rides LR_SECS game-s of the real leg and
projects: loss/s × leg ÷ along-line pace). Four legs, 210–290 kg towed: Woodsman Mehamn→Ifjord 18.9 m/s, card **497%** vs
projected real **136%**; Gamvik→Ifjord 22.4 m/s, card 532% vs 128%; quay→Ifjord 16.9 m/s, card 223% vs 28%; Aurora clean
air quay→Ifjord 20.3 m/s, card 138% vs 52%. Laden trailer rides beat even the EMPTY estimate (12.6 Woodsman), so the
(1 + kg/320) stretch only added false alarms. Now `(1 + max(0, kg − 300)/250)`: trailer-class loads unstretched, 425 kg
×1.5, 1125 kg ×4.3 (still on the slow side of g2_cruise_laden's powder runs). g2_coldcard_laden before → after: Aurora
stock 09:40 cards ≥100% **14 → 1** (chips 18 → 11 of 25), Ranger lvl21 12 → 7, Woodsman lvl6 6 → 5; night 19 → 17 (night
really is cold); full/mid kit unchanged 0. Model warmth rate matched (0.30/s) except quay→Ifjord at 0.12/s. Not visual.
smoke exit 0, page errors none (powder 1.52, trench 2.26, 6 s 66.5 mph). README cold-run para; v105.
Triage 0042: F1 real (column hidden behind a ridge at 600 m) → new top G1 item; F2/F3 info.
Next: G1 sled column over ridges (top); playtester rides more legs (deep powder, flatbed 400+ kg).

## 2026-10-26 11:00 — Light column over the sled when you're far from it on foot (G1) — fab3a92
Triage 0041 (v103 verified: 6/6 hints, real A/D turn tracks with no camera-trail lag → that half of the follow-up closed;
F4 = this build; F5 narrow-viewport wrapping dropped, desktop-first and the pill fit with room at 1280). Took the other
half of the v103 follow-up: at 90 m the parked sled is a speck (before stills: barely findable by day, invisible in a
night storm). New `sledPinTick()` (end of rescueTick): on foot past 30 m a slim pale-yellow `beaconMat` column (scaled
0.34×0.15×0.34 → ~150 m tall, <1 m wide) stands over the sled, fading in 30–60 m; hidden mounting, in driving school,
dead, and on the sled. New `scenarios/g1_sledpin.mjs` (20/90 m facing the sled, night clear/night storm/day; max luma in
a strip above the sled's screen point): column shown at 90 m **0/3 → 3/3**, at 20 m 0/3 → 0/3; strip max luma night
**128 → 238**, storm **66 → 152**, day 221 → 255; gone after remount. Vision (b47/cmp.jpg): thin soft column with its foot
on the sled in all three, not garish; reads near-white rather than yellow over bright snow. smoke exit 0, page errors
none (powder 1.55, trench 2.25, 6 s 66.5 mph). README walking para; v104.
Next: playtest the column far out / behind a rise (new low item); G2 laden-leg ride; G3 FPS check.

## 2026-10-26 10:50 — On-foot prompt says where the sled is (G1) — d7a5d92
Triage 0040 (tested v101, before v102): its laden ratios (tonne 0.26–0.28, fell 0.51, clean-air 0.73–0.85) are already
covered by v102's (1 + kg/320) stretch (1000 kg → 0.24, 320 kg → 0.50, trailer+190 → ~0.55: safe side everywhere); F4–F6
info. No new items. Took G1 (fewest recent landings; last G1 was v99) from the goal's "clear on-foot prompts" direction:
far from the sled the hint just said "Walk back to the sled and press Q". New `sledWhere()` gives distance (1 m <50 m,
10 m <500 m, 50 m beyond, km past 1 km) + way from the walker's facing (straight ahead/ahead on your left|right/on your
left|right/behind you on your …/behind you). New `scenarios/g1_sledhint.mjs` (25 m out, 6 facings): hints with a distance
**0/6 → 6/6**, all six directions correct by relDeg; still b46/after.jpg: rel +35 → sled on screen left, −35 → right,
prompt legible in the HUD pill, near prompt unchanged "Q: get on the sled". smoke exit 0, page errors none (powder 1.51,
trench 2.26, 6 s 67.6 mph). README walking para; v103.
Next: G3 FPS check of the shadow taps (playtester); G2 ride a flagged laden leg; G1 sled marker when out of sight.

## 2026-10-26 10:40 — COLD RUN estimate counts the towed load (G2) — 4eecc31
Triage 0039 (v101 far shadows verified, numbers exact): info only. Took the G2 laden-trailer coldRun check (two G3 landings
in a row). New `scenarios/g2_cruise_laden.mjs` (g2_cruise harness + a real big load in `GS.load`, so `TOW.mass` is the
game's own): along-line pace ÷ empty pace, 30–40 game-s from rest — 220 kg tow (trailer+150) **0.72–0.81**, 425 kg
(flatbed+300) **0.37–0.55**, 1125 kg (flatbed+1000) **0.24–0.43** (Matriarch best). The card assumed empty pace, so laden
hauls lost ~2× the warmth it showed. `coldRun(f, d, km, towKg)` now stretches ride time by (1 + kg/320) (safe side of every
measurement); `conCard` passes the hitch rig mass + card kg + loads already on. New `scenarios/g2_coldcard_laden.mjs`
(same board, old → new est per card): Aurora stock 09:40 (0027 setup) 220 kg clean-air Gamvik 63% → **119%**, fell 520 kg
Risfjord 84% → **240%**; ≥100% cards 1 → 13 of 24; Woodsman lvl6 chips 6 → 7/8; full/mid kit still 0 chips. Not visual.
smoke exit 0, page errors none (powder 1.52, trench 2.28, 6 s 67.6 mph). README cold-run para; v102.
Next: ride a flagged laden leg to confirm the % and check stock kit isn't now a board-wide trap (new item); G3 FPS check.

## 2026-10-26 10:16 — Far drift lee shadows past 50 m (G3) — 0816c3e
Triage 0038: v99 wall-stride verified (0.0 cycles, go/wind 0), wallslide unchanged; info only, no new items. Took G3
slice 8's open end: v100 shadows stopped with the patch at 34–50 m. The far terrain now marches its own `fdH` height
(×6, same as its normal tilt) toward the true sun (`uSunT`/`uMicroK` declared in the far shader; 5 taps 3–48 m, 3 on
GFX low) and scales directDiffuse/Specular by `fdSh` (up to 85%, fades 1.2–2.2 km). First try (4 taps 4–32 m, 70%)
was barely visible (strip 5 3.44 → 3.76). New `scenarios/g3_fardrift.mjs` (pinned SPAWN spot, calm, eye 1.8 m/9 m
looking 120–150 m out): bandstats strip 5 Nov across **3.44 → 3.99**, high across **5.65 → 6.29**, high toward 3.34 → 3.90,
March 2.76 → 3.09; near strips 6–8 unchanged, imgstats global std unchanged (~40). Vision on b44/cmp2.jpg: deeper blue
bands behind mid-distance swells, no seams/banding/noise. smoke exit 0, page errors none (powder 1.54, trench 2.29,
6 s 66 mph). README; v101.
Next: FPS/GPU check of the shadow taps (GFX low vs high); G2 laden-trailer coldRun check.

## 2026-10-26 10:06 — Drift lee shadows under the low sun (G3) — 96e914c
No new reports (last 37). Took G3 slice 8's own next idea (b41 vision: foreground evenly lit under a 4° sun). The lifted
key light (≥13°) can't throw ripple shadows, so the snow patch now marches `tlDrift` (height ×4) 6 taps toward the TRUE
sun direction (`uSunT` = `_sunV`, set in updSky; `uMicroK` = clear-day sun key, 0 at night/storm/moon) and takes up to
80% of direct light off lee sides, same relief fades (packed/rock/ice/wet/34–50 m). First try (height ×2) shadowed only
thin specks (debug render b43dbg); ×4 gives long bands. New `scenarios/g3_driftshadow.mjs` (pinned weather, 1.6 km out,
eye 1.8 m, 25 m look at 4 azimuths vs sun, Nov + March): local contrast Nov toward/across-L/across-R/away
**3.71/2.77/2.84/2.81 → 3.91/3.00/2.99/3.03**, March 3.50/2.88 → 3.52/2.85 (sun 11°: few shadows, as expected).
`g3_day` (first ×2 try) 05 local 3.05 → 3.09, quay 4.52 → 4.63, nothing worse; not rerun at ×4. Stills b43cmp2.jpg: long cold-blue lee bands behind
swells, soft edges, no ring or noise. smoke exit 0, page errors none (powder 1.51, trench 2.22, 6 s 67.3 mph). README; v100.
Next: far-terrain version of the shadows past 50 m; FPS check on GFX low; G2 laden-trailer coldRun check.

## 2026-10-26 09:52 — Legs stop when you walk square into a wall (G1) — ce212f9
Triage 0036/0037. 0037 (v98 TONNE chip verified) info. 0036 F1 "snag bug" reproduced with new `scenarios/g1_snag0036.mjs`
(start-only clear check, yaw 0 jog → Strandbu-area house, ax 0): it's a dead-square approach (heading vs face 0°), so the
stop itself is correct (wall slide at 10–50° works); the real bug was the walker marching on the spot: before, 25.2 stride
cycles in 17.2 s pressed against the wall, FOOT.sp 2.71, still jogging breath (wind 0.84, blown cycle). New `F.go` = real
ground speed (surge removed, smoothed 10/s) drives the stride clock, pose amplitude, boot puffs, tiredness and jog breath
(min with F.sp). After: **0.0 stride cycles** in 17.1 s, go 0.00, wind 0.00; still b42/cmp.jpg: stands upright at the
wall instead of mid-stride. `g1_wallslide2` unchanged (10° slides hospital 1.63 / freight 1.71 / buyer 1.73 m, was
1.60/1.71/1.75). F2 (toast hook) → low playtester item. F3 dropped: one "Out of breath" toast per sustained jog is the
intended warning (the pose shows every later blow); F4 info (1.02 m powder jogs 1.25 m/s, depth-driven). Blow-twice
item closed by 0036. smoke exit 0, page errors none (powder 1.56, trench 2.22, 6 s 66.7 mph). README walking para; v99.
Next: G3 low-sun self-shadow on near relief; G2 laden-trailer coldRun check.

## 2026-10-26 09:40 — TONNE chip on tonne-load cards (G2) — 13b8803
Triage 0035 (jog played as a real route): F1–F6 info (depot→lot2 48.9 m jogged at 3.79 m/s, never blown; pose reads
as a jog; uphill 0.196 grade 1.83 m/s): G1 jog item closed, follow-up low item for a 120 m backcountry blow-twice
check. G3 slice 8 rechecked (b41before: 05 std 40.3 / local 3.07) but has no small concrete lever this pass, so took
the G2 polish slice: `bigTag` gives tonne loads their own "tonne" tag, `.bchip.tonne` pink (#e79ac9). New
`scenarios/g2_tonnechip.mjs` (50 deliveries, Matriarch, Freight app): before chips FELL/FELL both rgb(143,208,196);
after FELL rgb(143,208,196) + TONNE rgb(231,154,201). Still b41tc_after/01: TONNE legible, distinct from FELL and the
red DUE/COLD RUN chips, layout unchanged. smoke exit 0, page errors none (powder 1.55, trench 2.22, 6 s 67.1 mph).
README rank table; v98.
Next: G3 low-sun self-shadow on near relief; G2 laden-trailer coldRun check; G1 backcountry blow-twice check.

## 2026-10-26 09:30 — COLD RUN estimate uses the speed sleds really hold (G2) — 6b3ddec
Triage 0034 (ride a flagged card): F2 real (Woodsman averaged 12.7 m/s Skjånes→Ifjord vs coldRun's assumed 19.2; −74.7
warmth in 49% of the leg → ≈238% vs the card's 192%), F1/F3/F4/F5 info (stop 288 m off-line is fine). Cold-per-second
already matches (coldRun uses the same formula as the rider), so the gap is speed. New `scenarios/g2_cruise.mjs` (calm,
noon, yaw-to-target, each leg on its own fresh line 70 m apart; the first try rode the previous sled's packed trench
and read 92–147 mph): 40 game-s from rest, along-line m/s — Skjånes→Ifjord Frontier 13.9, Woodsman 14.4, Summit 22.0,
Apex 31.1; depot→Ifjord (climbing) Woodsman 12.6, Ranger 15.5. Fits ≈12×power/drag; old 12+6×power was 0.66–0.77× too
fast for Frontier/Woodsman/Ranger and too slow for Apex. `rideS` now uses min(12+6×power, 10.5×power/drag) (safe side:
laden trailers unmeasured, so top sleds keep the old, slower assumption). `g2_coldcard` (boards random): Woodsman lvl6
same 5.4 km Mehamn card 84% → **129%**, ≥100% cards 3/5 → 4/4; Ranger lvl21 ≥100% 2 → 6; Aurora/Apex/full-kit unchanged
(bound by old formula). smoke exit 0, page errors none (powder 1.53, trench 2.26, 6 s 66.7 mph). Not visual. README; v97.
Next: G3 global contrast; G1 jog playtest; laden-trailer speed check (new low item).

## 2026-10-26 09:08 — Shift to jog on foot (G1) — a2e68c2
No new reports (last 33). G1 had the oldest landing (08:15) and no open backlog item, so took a LOOP.md G1 direction:
a jog key. `footStep` gets `jogK` (×1 + lerp(0.2, 0.5, pack), faded on climbs > 0.1 and steep descents) from Shift / RB /
touch lean (readInput's `lean` → `FOOT.jog` on foot), and a breath meter `F.wind`: +0.045/s on pack, up to +0.115 in deep
powder, +0.08 more uphill; −0.05 walking, −0.12 standing; at 1 you're blown (one toast, 20 s cooldown) and can't jog until
0.35. Stride lengthens while jogging; pose `tired` follows the wind. New `scenarios/g1_jog.mjs` (weather pinned): before
Shift did nothing (powder 1.48/1.54, trench 2.30/2.25, lane 2.6 m/s, 30 s 71 m); after powder walk 1.48 → jog **1.79**
(blown at ~11 s), trench 2.32 → **3.04**, plowed lane **3.8 m/s**, blown at 17 s / 58 m, 30 s **85 m**. Still
after/01_jog_powder: forward-leaning stride, no broken limbs. smoke exit 0, page errors none (powder 1.53, trench 2.21,
6 s 67.7 mph). README (controls + walking paragraph), help panel line, v96.
Next: playtester plays the jog (new item); G3 global contrast; G2 TONNE chip.

## 2026-10-26 08:55 — COLD RUN chip on freight cards (G2) — 8ee52c0
Triage 0033 (verify v94: macro local 2.60/3.22/4.16/3.56 and midband Nov 5.50 / March 5.04 reproduce, vision no
ovals/barcode; global std 38–44 = the open G3 item): all info. G1 hospital 10° notch item dropped after a rerun of
`g1_wallslide2.mjs`: hospital 10° slides 1.60 m vs freight 1.71 / buyer 1.75, closest 0.021 m (never wedged); 4 s of
sliding at sin 10° × ~2 m/s ≈ 1.4 m, so it's the projection, not a notch. Took the G2 long-haul warmth item (0027
F3: −$2,155 blackout on a clean-air run): kept the cold, told the player. New `coldRun(f, d, km)` estimates one leg's
warmth cost with the rider's own cold formula (night now, storm now, ground height along the line, kit coldMul)
over 12 + 6×power m/s; ≥70% puts a COLD RUN chip + "about N% of your warmth one way…, more than you've got. Thaw out
at <site splitting the leg> on the way. Warmer kit…" on the freight card. New `scenarios/g2_coldcard.mjs` (weather
pinned): before **0 warnings on every board**; after Woodsman lvl 6 stock kit noon 5/7 cards flagged (4 ≥100%, Gamvik
9.5 km 210%), Ranger lvl 21 7/18, Aurora lvl 62 stock 09:40 10/25 (0027's Skjånes clean-air ≈90%), same at 20:00
17/26 (14 ≥100%), Aurora full kit 0/23 (max 44%), Apex mid kit 0/16. Still cc_after/01: chip sits beside HEAVY,
text in the note, layout clean. smoke exit 0, page errors none (powder 1.53, trench 2.24, 6 s 67 mph). README; v95.
Next: playtester checks the estimate against a real ride (new item); G3 global contrast; G2 TONNE chip.

## 2026-10-26 08:42 — Sharp wind crests instead of blue oval hollows (G3) — 1e75240
Triage 0032 (verify v93: 0%/0% storms before 13:00, 13%/24% after; coldrate confirms no crash/foot multiplier: all
info, nothing new). G3 had the oldest landing (v90), so did slice 8's macro check with new `scenarios/g3_macro.mjs`
(pinned spot −1637,−1943; eye 1.8 m and 9 m up, 30–40 m look, Nov + March). Before: on a facing hillside 100–300 m out
the v88 scoops read as flat blue oval puddles (05_high_cross2). `fdH`'s near term is now domain-warped (22×9 m at
~30 m scale) and the 0.04×0.11 term folded into a ridged crest (`cr²`); first try striped the grazing far flats into
a barcode, so the crest weight `nc` = near × (1 − ss(350, 900, dist / |cos view|)): crests where a pixel covers little
ground, the old soft bump elsewhere. Vision on b37crop05b (before/after hillside): ovals → wind-sculpted crests;
b37crop04b far band: no barcode, close to before. imgstats local 03 3.01 → 3.22, 04 4.06 → 4.16, 05 3.11 → 3.57, eye
level 01 2.60 → 2.61; `g3_midband` strip 3 Nov 4.69 → **5.49**, March 4.29 → 5.05, across 1.11 → 1.26, away 0.25 → 0.23.
smoke exit 0, page errors none (powder 1.52, trench 2.23, 6 s 67.5 mph). README daylight paragraph; v94.
Next: G1 hospital 10° notch, G2 long-haul warmth after the road rerun, G3 global contrast.

## 2026-10-26 08:28 — A new game's first morning stays clear (G2) — 079d7e5
Triage 0031 (F1 v91 reproduces; F3 harness auto-nav crashes into the quay shed → new low playtester item; F4 info).
F2 "post-crash warmth drains faster than riding" checked with new `scenarios/g2_coldrate.mjs` (weather pinned calm,
Frontier, 09:40): parked −0.340/s, riding 44 mph −0.330, on foot standing −0.318, walking −0.312, after a crash
eject −0.305/−0.302: no crash/foot multiplier exists, the cold formula ignores both. 0031's −1.16/s = a storm
(0.9 × storm ≈ 0.85) on a fresh save. So the real problem is weather on new saves: new `scenarios/g2_newsave_wx.mjs`
(300 seeds, quay + 1 km inland): before **14% of new saves had a storm 09:36–11:00**, 16% 11–13, 19% 13–15;
warmth lost standing out 09:36–13:00 avg 71, **max 175** (blackout). `WX.atT` now holds 1 November clear until 13:00
and eases fronts in over 13–15 (`sstep`, calendar hour, so only a brand-new save sees it; forecast/ferry agree since
they read the same function). After: **0% / 0%** before 13:00, 13% 13–15, 15–18 unchanged 24%; loss avg 52, max 52.
Gave it over softening cold for everyone: the cold stays, the first job just isn't a storm. smoke exit 0, page errors
none (powder 1.53, trench 2.22, 6 s 66.9 mph). Not visual, no stills. README weather paragraph; v93.
Next: daylight slice 8 macro check (G3), G1 hospital 10° notch, G2 long-haul warmth after the road rerun.

## 2026-10-26 08:15 — Flat wall slide on the hospital, pier sheds and drying racks (G1) — bfc0fb6
Triage 0030 (verify v90: pinned −234,676 local 3.98/2.94/2.62, unpinned 3.10/2.10/2.42, vision no teeth: holds; F4 the
rock search never lands on real scree → new low playtest item). G1 had the oldest landing (07:35) and the top G3 item is
a macro check, so took the v73 follow-up: disc-grid buildings without `ax` still had round-post walls. Tagged `ax` on
the hospital (+ ambulance bay, `ax: ry`), the pier freight shed and pier-edge discs (`-qa`), the fish buyer's shed
(`-qa`) and `K.hjell` drying racks (`ry`). New `scenarios/g1_wallslide2.mjs` (6 game-s holding W from 4 m off a face,
along-face metres): hospital back wall 0° sideways drift **0.45 → 0.00**, 20° **1.94 → 3.29**, 35° 4.75 → 5.41;
freight shed 10° **0.05 → 1.67** (was dead stop), 20° 3.26 → 3.44; buyer 20° **1.26 → 3.41**, 35° 5.60 → 5.94; others
within noise; hospital 10° 1.81 → 1.61 (still notches, new low item). Worst penetration −0.02 m (freight 0°).
smoke exit 0, page errors none (powder 1.53, trench 2.23, 6 s 67.7 mph). Not visual, no stills. README walking; v92.
Next: daylight slice 8 macro check, G2 long-haul warmth after the playtester's road rerun.

## 2026-10-26 07:57 — First Tab on a new save opens the Parcels board (G2) — 35d5108
No new reports (last 29). G2 had the fewest recent landings (G3/G1/G3/G2); its open items are playtester-owned
(long-haul road rerun, first-5-min to $600) except 0007 F2, so took that: on a new save the first Tab showed the
Home icon grid, one extra tap before a new player sees any job. `TABLET.toggle` now opens on `parcels` when no app is
remembered and the courier has 0 deliveries, nothing aboard, nothing claimed and no rescue (`GS.jobs` is the posted
board, so it isn't a "has work" signal: first try used it and changed nothing). New `scenarios/g2_firsttab.mjs`:
before new save 1st Tab **Home (NORDKINN)**; after **PARCELS**; veteran (5 deliveries) Home both; new save with a
parcel aboard Home both; close/reopen unchanged. Still after3/01_newsave_tab.jpg: board with 5 jobs + route chart,
clean. smoke exit 0, page errors none (powder 1.53, trench 2.26). `g2_first5min.mjs` comment updated. README; v91.
Next: daylight slice 8 macro check, G2 long-haul warmth after the playtester's road rerun, G1 wall-slide `ax` tags.

## 2026-10-26 07:50 — Rock through thin snow per pixel, no more sawtooth (G3) — 02f3fd7
Triage 0029 (verify v89: lanesob 1/15 lanes 1 sample, lot9 2.66 m/s, g1_lanes 2.66/2.65/2.64/2.66, plowed share 91%:
all reproduce; F4/F5 info, no action). Took the v68 rock-zigzag follow-up over daylight slice 8: slice 8's open part
is a macro check that 0028 says may already be fine, while this was a visible artifact (`g3_ridge.mjs` pinned at
−234,676,0, 03_tele_right before: a regular row of grey/white triangular teeth down the slope under the crest). Cause:
`buildFar` blended rock grey into the vertex colour on the 8 m grid, and the drift/sheen masks (`smoothstep(0.8,0.9,
vColor.r)`) cut that gradient at hard diagonals. Now the vertex colour stays snow; `vRockS` (depth/0.4, land only)
goes to the fragment and `fdRock` thresholds it per pixel with 5–14 m value noise (±0.55), and fdSnow/skyW take
`1 − fdRock` so drifts and sheen stay off the rock. Tried noise ±0.25 first: teeth only got ragged edges → ±0.55.
Vision on b33/cmp.jpg + after2/03 crop: teeth gone, snow reads as organic tongues and patches on grey scree, no
speckle. imgstats pinned spot local 01 3.74 → 4.20, 02 2.91 → 3.22, 03 2.57 → 2.62; unpinned search spot (1700,−379,
little rock) unchanged (3.09/2.10/2.41 → 2.96/2.10/2.43). `g3_midband` strip 3 Nov 4.70 / March 4.28 (= v88, no
regression). smoke exit 0, page errors none (powder 1.51, trench 2.24, 6 s 66.7 mph). README daylight paragraph; v90.
Next: daylight slice 8 (macro check of the scoops), G2 long-haul warmth once the playtester reruns the road route.

## 2026-10-26 07:35 — Town lanes go round obstacles (G1) — 84980a4
Triage 0027 (verify v87: board numbers reproduce; F2 cargo does render on the trailer when the camera frames the hitch
→ the 0026 F4 "no cargo" item dropped; F3 straight-line powder clean-air run blacked out, −$2,155 → new G2 long-haul
warmth item, playtester reruns the road route first; F4 harness note kept on it; F5 info) and 0028 (verify v88: Nov 4.68 /
March 4.28 reproduce; vision sees no oval blobs at play distance → noted on slice 8). G3 just landed, so took the G1
lanes follow-up. New `scenarios/g1_lanesob.mjs` samples every lane leg each 1 m against `obGrid`: before **8 of 14
lanes ran through something** (73 samples: the depot-side posts, the pier freight shed, lamps, woodpile) and walking
lot9's lane jammed at 32 m (STUCK). Lanes are now `buildLanes()` (after every builder in `boot()`, so the fish shops /
sheds are in obGrid): `laneRoute` = 8-way A* on a 1.5 m grid, cells within 1.1 m of an obstacle or on sea cost ×40
(soft, so starts inside a clearance still get out), string-pulled to 1–8 legs. After: **1/15 lanes, 1 sample** (a
grid-corner graze), a new lane to the tackle shop door, lot9 **reached, 72 m in 27.1 s at 2.66 m/s**. `g1_lanes.mjs`
walks now follow the lane's own legs (+ lot9): before lot0/11/3 2.66/2.65/2.63, lot9 NOT reached (0.54 m/s);
after 2.65/2.65/2.64, lot9 **2.65 m/s**. Its straight-line "plowed share" metric drops 96 → 91% because lanes now bend
(expected, not a gap). Overhead stills b32/cmp.jpg: lanes too faint from 30 m up to judge; numbers carry it.
smoke exit 0, page errors none (powder 1.56, trench 2.30, 6 s 66.9 mph). README walking paragraph; v89.
Next: daylight slice 8 (macro check of the ovals first), G2 long-haul warmth once the playtester reruns the road.

## 2026-10-26 07:20 — Mid-distance dunes on the open fell (G3) — 74c3219
No new reports (last 26). G3 was due (last 4: G2/G2/G2/G1). Took the top item, daylight slice 8, as slice 8b: the
45–150 m band. New `scenarios/g3_midband.mjs` (backcountry spot searched from SPAWN, so it's pinned: −1637,−1943;
weather pinned; game cam Nov/March noon + a 2.2 m camera looking 120 m out across/away from the sun) and
`tools/playtest/bandstats.py` (local contrast per horizontal strip). Far shader `fdH`: the close (`near`, <150–450 m)
ripple term ×0.35 → 0.8 plus a new 45×15 m scoop term (0.4) along the wandering north-westerly; patch sastrugi fade
28–45 → 34–50 m so they reach the patch edge; lee tint gentler (×10 → ×6, cap 0.8) so it doesn't blotch. Strip 3
(horizon → ~30 m) local contrast: Nov backcountry **3.29 → 4.69**, March **2.93 → 4.29**, low cam across sun
**0.87 → 1.11**, away from sun 0.25 → 0.25 (flat light); whole-still local 05 3.42 → 4.08, 06 3.28 → 3.52. Stills
b31/c05c.jpg, c06c.jpg (before over after): the flat wash now shows dunes with shaded lee hollows, no seam at the
patch/far handover, no speckle; a few hollows read as similar ovals (follow-up noted on slice 8). Tried 0.6 for the
scoops first: same numbers, blotchier → 0.4. smoke exit 0, page errors none (powder 1.50, trench 2.22, 6 s 68.1 mph).
README daylight paragraph; v88.
Next: top is still daylight slice 8 (oval hollows, global std); G2 first-5-min / G1 lanes follow-ups after.

## 2026-10-26 07:05 — Clean-air runs: first work the Aurora E opens (G2) — 596deae
Triage 0026 (verify v85: reproduces; F2 tow test: Summit hauls 500 kg up a 0.38 grade at 33 mph vs Apex 42, never
bogs → gates are insurance rules, noted on the late-ladder polish item, the "untested" line dropped; F3/F5/F6 info,
dropped; F4 no flatbed in side stills → new low playtest item, unconfirmed). Took the top item (late ladder) as
slice 3. New rank "Clean-air courier" at 60 (`RANKS[7]`) and a `CLEAN_AIR` contract in `makeContracts`: NILU
instruments (soot sampler, ozone monitor, balloon hut, battery bank; 110–220 kg, trailer bays 1) from the quay to an
open site ≥ 4 km out (relay, Skjånes, Gamvik, Ifjord, Risfjord), pay `(3200 + dist + climb·12) × 1.2/1.3`. Gate
`cleanBlock()` = `sledDef().plug` (zero exhaust at the stations), in `contractBlock` + `acceptContract`; CLEAN AIR chip
(`.bchip.clean`); locked card from 46; Aurora garage card work line; Freight app note; accept toast. The 5 km map
makes "range" a weak hook on its own, so the gate is the exhaust rule; the plug-in charging is the flavour.
New `scenarios/g2_cleanair.mjs` (before = origin/main via TL_SRC): kinds at 60/75 **…+tonne → …+tonne+clean**; clean
avg **$10,222 / $10,378** [8,665–11,675] (tonne 9.8k, fell 5.7k); dests spread over all 5 far sites; gate @62 with
trailer: Apex/Matriarch blocked with the NILU line, Aurora OK (before: no such job); Aurora card @50 before: price
only, after: + clean-air line; locked @50 before: none, after: "Clean-air runs — 60 deliveries and the Aurora E".
Still b30/after/02: CLEAN AIR card (soot sampler → Ifjord, $9,390) lays out cleanly, chip readable. smoke exit 0,
page errors none (powder 1.53, trench 2.25, 6 s ride 66.7 mph). README ranks table; v87.
Next: late ladder is done (polish items left low); top is now G3 daylight slice 8.

## 2026-10-26 07:00 — Tonne loads: first work the Matriarch opens (G2) — f580af1
Triage 0025 (verify v84: lane numbers reproduce to the decimal; F2 lot6/church gaps → merged into the lanes
follow-up; F3/F4 info, dropped). Took the top item (late ladder, high) as slice 2. New rank "Fell master" at 46
(`RANKS[6]`) and a tonne contract in `makeContracts` (`FELL_TONNE`, `c.tonne`, `c.sled = TONNE_SLED`): 920–1,050 kg
in one piece (blade set, snowcat cab, built hut, genset) from the quay to the highest open fell site, pay
`(4000 + dist·1.2 + climb·20) × 1.2/1.3`. `fellBlock(id)` now takes the class; tonne loads need exactly the
Matriarch (Aurora is the lighter range machine, its work is slice 3). Locked "Tonne loads" card from 32 deliveries,
Matriarch garage card line, Freight app note, accept toast. `g2_fell.mjs` extended (Matriarch card @36, locked cards,
tonne gate per sled). Before → after (40 boards/level): kinds at 46/60 **…+fell → …+fell+tonne**; tonne avg
**$9,940 / $9,860** [9,600–10,400] vs fell 5,450–5,620 (same quay→wind farm fell trip ≈ $4.2k); gate @50: Summit/
Trekker/Apex/Aurora blocked with the Matriarch line, Matriarch OK; Matriarch card @36 before: price only, after: + tonne
line; board @36 before: no hint, after: "Tonne loads — 46 deliveries and a Matriarch 850T". Still b29/aft3/02: tonne
card (Snowcat cab & tracks, 1050 kg, $9,600) lays out cleanly. smoke exit 0, page errors none (powder 1.53, trench
2.18, 6 s ride 67.1 mph). README ranks table; v86.
Next: slice 3 (Aurora E range work); tow test of the gates in physics terms.

## 2026-10-26 06:45 — Fell freight: first work the Apex opens (G2) — 49f5591
No new reports (last 24). Took the top item (late ladder, high, 0024) as slice 1. New rank "Fell hauler" at 32 deliveries
(`RANKS[5]`) and a `FELL` contract in `makeContracts`: 450–540 kg flatbed loads (bays 2) to the two highest open
non-village cabin sites (wind farm, Risfjord), cargo matched to the place (gearbox → wind farm, hut kit/feed → herder
cabin), from the quay or a village harbour; pay `(1500 + dist·0.6 + climb·8) × 1.2/1.3`. Gated in `contractBlock` +
`acceptContract` by `fellBlock()` (sled tier ≥ Apex). Locked card from 20 deliveries says what it needs; FELL chip
colour; Freight app note and about text; Apex garage card adds "takes fell freight (… best-paid work on the board)".
New `scenarios/g2_fell.mjs` (before = origin/main via TL_SRC), 40 boards per level: contract kinds at 32/46/60
**groom/heavy/prio/exped → + fell**; fell avg **$5,597–5,672** [3,855–7,625] vs exped 3,559–3,604, prio 2,274–2,394;
gate with licence + flatbed: Summit/Trekker blocked with the Apex line, Apex/Aurora OK (before: no such job). Apex card
@20 deliveries before: only the price line; after: + fell freight line. Still 02_freight_app_apex (b28/aft3) judged:
FELL card (Turbine gearbox, 540 kg, $4,175) lays out cleanly. smoke.mjs exit 0, page errors none (powder 1.54,
trench 2.27, 6 s ride 67.2 mph). README ranks table; v85.
Next: late ladder slices 2–3 (Matriarch 46, Aurora 60) and a tow test of Summit vs Apex with 500 kg up the fell.

## 2026-10-26 06:30 — Plowed lanes from the depot to every door in town (G1) — e6673ff
Triage 0023 (verify v83: March 2.89 to the decimal, Nov 3.15 = unpinned-spot noise → note on slice 8; F1 shore-road
point → this item; F3/F4 info, dropped) and 0024 (G2 late ladder flat from 20 to 75 deliveries, cards silent →
merged into the late-sled item, now top/high; F3 tooling note kept on it; F4 info). G1 was due (last 5: G3/G3/G2/G1/G3).
0023 F1's "house cluster" next to (-1250,-420) is the garage's own r=1.5 disc grid: the point is behind the garage,
not on a quay→door path, so no lane there (walk to the forecourt 1.96 → 1.97 m/s, unchanged). The real gap: yards
were discs, and between the depot yard and most doors lay a powder band. `YARDS` entries are now capsules
(`addPlow`; `addYard` = zero-length leg, `addLane(pts, r)` = legs with `LANE_FALL` 2.5 m); `K.house` records its door
in `KIT.doors` and buildTown plows a 3 m lane from the depot yard to every door within `TOWN_R`, via the house's side
when the door faces away. New `scenarios/g1_lanes.mjs` (before = origin/main via TL_SRC): plowed share of the
15 depot→door lines **77% → 96%**, lines with a gap **11 → 3**; walks from the depot yard edge, by gameClock:
lot0 43 m **23.0 → 16.2 s** (1.87 → 2.66 m/s), lot11 49 m **27.5 → 18.8 s** (1.80 → 2.64), lot3 24 m **12.7 → 9.1 s**
(1.90 → 2.62); pack underfoot 0.22–0.32 → 0.85. Stills b27/p1.jpg, p2.jpg (before over after, town from 16 m up):
lanes read as faint pressed paths, no stripes/seams; otherwise identical. smoke.mjs exit 0, page errors none
(powder 1.53, trench 2.24, 6 s ride 68 mph). README walking paragraph; v84.
Next: late-sled jobs/gear (G2, high, 0024). Follow-up: lot9's lane runs under the pier freight shed (bend round obstacles).

## 2026-10-26 06:10 — Powder ripples read in the low sun (G3) — 320693f
No new reports (last 22). Took the top item, daylight slice 8, as a first slice: the patch shader's wind relief
(`tlDrift` sastrugi + swells, per-pixel normal tilt within 45 m) was too faint to see, so its tilt is ×2 (packed
snow, trails, rock, wet snow and the 28–45 m fade unchanged). `g3_day.mjs` + `imgstats.py` local contrast:
05 Nov backcountry **2.71 → 2.97**, 06 March **2.63 → 2.89**, 02 toward sun 3.99 → 4.15, quay 4.54 → 4.64; std/mean
≈ unchanged (40.5 → 39.9). Vision (b26/t1/05, b26/sheet.jpg): ripple light/shade bands clearly visible ahead of the
sled, no noise/grid/seam; town stills identical. smoke.mjs exit 0, page errors none (powder 1.47, trench 2.21,
6 s ride 65.4 mph). README daylight paragraph; v83.
Next: slice 8b (45–150 m band via the far terrain's near term) or late-sled gear/jobs (G2).

## 2026-10-26 06:00 — Top-left badge names the town/place you're in (G3) — 0251872
No new reports at start (last 21); took the low HUD badge item (0004 F3 / 0005 F2) as a small certain G3 win after a
G2/G1/G3/G2 run. 0022 arrived during the pass and was triaged after landing: F1 (backcountry local contrast 2.70 /
March 2.63) added to daylight slice 8 as its baseline; F2 (badge "OPEN BACKCOUNTRY" at the quay) is this fix; F3 info.
`updHud` named the biome at the SLED only. New hoisted `placeBadge(x,z)`: within `TOWN_R` of the quay or 40 m of the
garage → KJØLLEFJORD; within a site's `clear`+10 m → its `shortName` (villages, homes, cabins, wind farm, relay);
schools → their sign; water/lake still win, else the biome line. Reads FOOT's position when on foot. New
`scenarios/g3_zone_badge.mjs`: quay / town edge 95 m / garage / Strandbu / Mehamn / Dyfjord / wind farm / Sandfjord /
Slettnes **OPEN BACKCOUNTRY (wind farm HIGH COUNTRY) → KJØLLEFJORD ×3, STRANDBU, MEHAMN, DYFJORD, GARTEFJELLET,
SANDFJORDDALEN, SLETTNES**; open fell HIGH COUNTRY unchanged; on foot 650 m out with the sled at the quay
OPEN BACKCOUNTRY (sled's) → HIGH COUNTRY (yours). Still 01_quay judged: fits the panel. smoke.mjs exit 0, page errors
none (powder 1.46, trench 2.19, 6 s ride 65.4 mph). README controls section; v82.
Next: daylight slice 8 (G3, baseline 2.70) or late-sled gear/jobs (G2).

## 2026-10-26 05:55 — Parcels redraws on delivery (G2) — 0bee7b8
Triage 0021 (verify v79/v80: both reproduce to the decimal; G2 first-cash leg): F1 (open Parcels goes stale at a
drop-off) taken; F2 (accept → delivered 41.2 game-s / 768 m / +$120) folded into the first-5-min item, which now only
needs the time to $600; F3 (0020 F5 sideCam) left for the playtester. G2 was due (last landings G1/G3/G2/G3/G3).
`deliver()` saved and re-meshed but never called `TABLET.refresh()` (only the roaming branch did), so an open Parcels
page kept "1/1 rack's full · 0 delivered · ABOARD <cargo>" while the toast said paid. Now it refreshes at the end of
`deliver()`, after a Bytteboden crate drop and when the backhaul parcel goes on 1.4 s later. New
`scenarios/g2_tablet_live.mjs` (new save, accept top job, park at its dest with Parcels open, read the screen):
stale **true → false** (before: still listed "A sack of dog food" ABOARD, 1/1; after: 0/1 · 1 slot free · 1 delivered,
cargo gone). Home was already fine. Still parcels_after.jpg judged: coherent. smoke.mjs exit 0, page errors none
(powder 1.47, trench 2.20, 6 s ride 65.5 mph). README tablet paragraph; v81.
Next: daylight slice 8 (G3) or late-sled gear/jobs (G2).

## 2026-10-26 05:45 — Skis feel the real slope, not their own groove (G1) — 61b5e51
No new reports (last 20). G1 was due (last 5 landings G3/G2/G3/G3/G3); took the low skiStep-grade item. `skiStep`
read the grade off `surf`, so the groove the skis cut 0.7 m behind read as a climb. Now it reads the undisturbed snow
top (`groundAt + sampleG(freshG)`, keeps drifts, ignores grooves). New `scenarios/g1_ski.mjs` (Turski, fresh powder):
flat felt grade **0.036 → 0.004** (ground 0.003), avg **2.26 → 2.51 m/s** over 10 s; downhill felt −0.152 → −0.173
(ground −0.19), 4.95 → 5.13 m/s; across 0.012 → −0.028 (ground −0.03), 2.17 → 2.41; uphill unchanged 0.78.
smoke.mjs exit 0, page errors none (powder 1.44, trench 2.20, 6 s ride 65.2 mph). Still 01_flat judged: skier fine.
README skis paragraph; v80. Next: G2 is due (late-sled gear/jobs item) or daylight slice 8.

## 2026-10-26 05:40 — Low sun warms the snow (G3) — 75c52d6
No new reports at start; 0020 arrived during the pass (verify v78: reproduces 0/0/1/1; G1 quay walk) and was triaged
after landing: F1 (pack 0.08 / 0.58 m at -1250,-420) merged into the shore-road lanes item; F2 (quay 2.32 vs 2.71 m/s
steady state = start-up ramp over 20 m), F3 (12 cm looser stop = v73 slide), F4 (6 s window too short), F5
(`g1_town_quay.mjs` sideCam aims at empty snow) dropped as info/tooling for the playtester. Took daylight slice 7.
New `uSunRef` (sun hue at luminance 1 while it's the clear-day key light, white otherwise) + `uSunW` (= sunDir) on
`skyRefU`: snow's `reflectedLight.directDiffuse` (so shadows and N·L are respected) leans toward the sun's colour by
max(0.6 near, fading 40→400 m; 1.2 × smoothstep(0.22, 0.45, N·sun) on faces turned to the sun), same code in the patch
and far terrain. First try (×0.5 flat) was a uniform shift; second (sun-facing only, 0.24–0.6) changed nothing (almost
no face beats the lifted sun's 0.22). `g3_day.mjs` near band (y 480–600) b−r: 05 Nov backcountry **4.9 → −2.8** (warm),
far 11.3 → 4.6, near/far split 6.4 → 7.4, band sd 8.0 → 8.9; 04 sled close-up warm px **23% → 52%** with the blue
shadow kept (p10 −61 both); 06 March ≈ unchanged (near 12.8 → 9.3). Band sat −2..−3.5 (warm cancels blue on average).
Vision (b22/c04, c05, c06): sunlit snow by the sled goes from grey-lavender to a soft peach-cream, shadows stay blue,
no ring where it fades, March still cold. smoke.mjs exit 0, page errors none (powder 1.44, trench 2.15, 6 s ride
65.4 mph). README daylight paragraph; v79. Follow-up filed: slice 8 (backcountry contrast needs relief, not tint).
Next: by goal rotation G1 or G2 is due (last 4 landings G3, G2, G3, G3).

## 2026-10-26 05:20 — No more low-fuel warning spam at the quay/garage (G2) — 2900ee2
Triage 0019 (verify v77 sky sheen: numbers reproduce exactly, no seams, no regressions): no new items. Took the low-fuel
item over daylight slice 7: 3 of the last 4 landings were G3. It was worse than filed: the free quay/garage top-up reset
`lowWarned` every frame before the warn test, so a parked low sled re-toasted every frame until it passed 20%. Now a
`freeFill` flag skips the warning there (it still re-arms). New `scenarios/g2_lowfuel_warn.mjs` (10% tank, 5 game-s
parked): low-warn toasts Frontier quay **16 → 0**, garage **5 → 0**; Aurora quay **24 → 0**, garage **32 → 0**;
backcountry 1 → 1 for both; leaving the quay still low → 1 warning out there (unchanged). smoke.mjs exit 0, page
errors none (powder 1.53, trench 2.25, 6 s ride 65.7 mph). Not visual. README fuel paragraph; v78.
Next: daylight slice 7 (warm sunlit faces).

## 2026-10-26 05:15 — Snow mirrors the clear sky at glancing angles (G3) — ec5e66f
Triage 0018 (verify v75 Aurora plug: numbers reproduce exactly, card/toasts read right; false "Battery low" at the
quay already on the backlog): no new items. Took daylight slice 6. Open backcountry was one pale near-white sheet.
New shared `skyRefU` (uSkyRef = the clear-day hemi fill's hue at luminance 1, set in `updSky`, white when `clr` → 0 so
storms/overcast/night are untouched; uSkyK 0.75): the snow patch and far terrain multiply `outgoingLight` toward it by a
cubed fresnel term on snow only (not rock, bare ground, open water, wet snow ×0.3). Pitfall: r128 has no
`#include <output_fragment>`; hook the literal `gl_FragColor = vec4( outgoingLight, diffuseColor.a );` (regex, as the
sled shader does) — the first run changed nothing. `g3_day.mjs` band (260–1020 × 240–470) sat / blue−red: 05 Nov
backcountry **5.6 → 12.1**, 0.5 → 9.3; 06 March **9.6 → 20.2**, 8.1 → 17.5; 03 28.8 → 36.0; 02 38.6 → 43.6; 01 quay
40.1 → 46.9, −2.8 → 4.3; 04 sled close-up ≈ unchanged. Band luma −2. uSkyK 0.45 was barely visible; 0.75 kept.
Vision (b20/c05b, c06b, c01b): flats grade white at the sled to cold blue-lavender toward the horizon, no seam at the
patch edge, quay yards slightly cooler and natural; March is the strongest, still reads arctic not cartoon.
smoke.mjs exit 0, page errors none (powder 1.48, trench 2.22, 6 s ride 65.2 mph). README daylight paragraph; v77.
Next: slice 7 (warm sunlit faces).

## 2026-10-26 05:00 — Clear-day shade is sky-blue (G3) — b436296
No new reports (last 17). Took daylight slice 5. The sky fill (hemi light) was a grey-lavender (b6c4de at the Nov
noon), so shaded snow and snow turned from the sun went beige-grey like the sunlit faces. `updSky` now pushes the
fill's colour 2.8× further from grey at the same luminance on a clear day (×`clr`, so storms/overcast/night unchanged),
scaled under 1 with hue kept: Nov noon b6c4de → 95bbff, March bbd2eb → 87bfff. A first try at 1.9× was invisible in
stills. `g3_day.mjs` terrain band (260–1020 × 240–470) sat / blue−red: 01 quay **36.3 → 40.1**, −11.8 → −2.8; 02
toward sun **27.4 → 38.5**, 9.3 → 21.3; 03 24.5 → 28.8; 04 33.0 → 35.2; 06 March backcountry **2.7 → 9.5**; 05 Nov
backcountry 9.2 → 5.7 (its warm-grey snow went neutral-cool: hue shift, not flatter). Whole-frame mean luma within ±1.5.
Vision (b19/pair2.jpg): shaded hillsides and house shadows read cooler/bluer, natural, not cartoonish; sled/rider fine.
smoke.mjs exit 0, page errors none (powder 1.48, trench 2.21, 6 s ride 65.3 mph). README daylight paragraph; v76.
Next: daylight slice 6 (backcountry still pale; sky glow, far albedo variation).

## 2026-10-26 04:50 — Aurora E plugs in anywhere (G2) — ed57feb
Triage 0016 (verify v73 wall slide: holds, numbers match) and 0017 (verify v74 drift shading: holds, smaller on
whole-frame stats as expected; slice 5 still wanted): no new items. Took the Aurora item over daylight slice 5: last
two landings were G3/G1 and both reports said G2 is due. The $14500 Aurora was strictly a weaker, pricier Matriarch.
Kept its stats (no retune) and gave it a battery sled's real reason: `SLEDS[].plug` makes `fuelSpot` return
`plugSpot()` — any warm stop of type cabin/home/relay (villages, herder cabins, wind farm, homes) or a pump charges it at
`FUEL.charge` $0.75/L; quay/garage stay free; plus `perks.burn -0.15` (regen). Own toasts ("Plugged in at Mehamn…",
"Battery full…") and a "Battery low" warning naming the nearest plug (`nearestPlug`). Green perk line on the card.
New `scenarios/g2_aurora_plug.mjs` (8 game-s parked nearly flat): Aurora at Mehamn village **+0 L → +31 L for $23**,
wind farm **+0 → +31 L / $23**, pump **$76 → $23** for 31 L; Matriarch unchanged (0/0/27 free at quay/27 for $66).
Range L÷burn **34 → 40** (Matriarch 30, Trekker 33.3). smoke.mjs exit 0, page errors none (powder 1.45, trench 2.17,
6 s ride 65.2 mph). Not visual. README sled paragraph; v75. Follow-up filed: low-fuel warning fires at the free quay.
Next: daylight slice 5.

## 2026-10-26 04:45 — Far snow gets wind-drift shading (G3) — 76a94ea
Triage 0014 (verify v72: holds, no action) and 0015 (F1 wall-stall: fixed by v73 after the report was cut; F2 yard
approaches walk 2.44–2.52 m/s even from pack 0.31 → narrowed the plowed-lanes item to low/looks-only; F3 badge already
on the backlog; F4 info). Built daylight slice 4: past the 50 m snow patch the far terrain was a flat white wash.
`buildFar`'s fragment shader now tilts the per-pixel normal by a coarse wind-drift field (≈90 m swells, ≈30 m
elongated drift ridges along a wandering NW wind, ≈10 m ripples inside 450 m) on snow-covered fell only (not lakes, sea,
rock, bare spring ground), fading out 1.6–3.2 km, and tints the lee sides a faint cold blue. Shading only. Tuned in 3
steps by stills: ×1.6 invisible, ×9 made sunlit oval blobs on the hills facing the low sun, ×6 with weaker swells and
longer ridges reads as drift streaks. `g3_day.mjs`, terrain-band crop (260–1020 × 240–470) local contrast: 05 backcountry
**2.45 → 3.22** (std 10.97 → 11.8), 02 toward the sun **4.64 → 5.59**; whole-frame stats within run noise (toasts).
Vision: 02 hills behind the village now show long sunlit drift streaks, 0700 beacon view the far slope across the lake
gets drift bands; no seam at the patch edge, no grid; night stills (g3_beacon) unchanged/natural. smoke.mjs exit 0,
page errors none (powder 1.44, trench 2.19, 6 s ride 65.4 mph). README daylight paragraph; v74. Stills
`~/.hermes/cache/scratch/tlloop/b17/` (c02.jpg, c1200.jpg, nightsheet.jpg). Next: daylight slice 5 (saturation, sky glow).

## 2026-10-26 04:25 — Walls slide you along instead of wedging you (G1) — 3567c2b
No new reports (last 13). Took the wall-stall item over daylight slice 4: G1 had no landing since v64 and it's
friction a player hits at every door. Cause: house walls are a grid of r 1.35 discs 1.9 m apart, so the walker's
per-disc push-out left a 0.29 m notch between discs (trap for any approach within ~35° of square) and round-post
corners (a 20° approach stopped dead where the corner disc's normal faced the walk). `footStep` now sums the normals of
every disc within a probe 0.3 m wider than the body, takes the into-the-wall part off the step, and pushes out along
that one normal; discs tagged `ax` (building yaw: `KIT.house`, depot buildings, garage) snap their normal to the
nearest face, so walls act flat. Per-disc push kept as fallback. New `scenarios/g1_wallslide.mjs` (6 game-s holding W
from 7.5 m off the shore-road house wall): 20° off square **3.9 m moved / 1.4 m along the wall → 10.2 / 5.4** (slides
and rounds the corner); 0° stops square (sideways drift −0.55 → 0.00 m); 35/50/65° and a lone tree unchanged; never
inside a disc. `g1_yards.mjs` "shore-rd old aim" **0.58 → 1.64 m/s** (10 m in 14.1 → 6.1 s); other rows unchanged.
smoke.mjs exit 0, page errors none (powder 1.44, trench 2.22, 6 s ride 65.2 mph). Not visual, no stills. README walking
paragraph; v73. Follow-up: tag the remaining disc-grid buildings with `ax`. Next: daylight slice 4.

## 2026-10-26 04:00 — Rank-up nag gone once the rig is hitched (G2) — 7fb1d8a
Triage 0013: F1 real bug in v70 — `rankOpens()` returned the raw `RANKS[].opens` (still ending "You'll want a groomer on
the hitch.") when the rig was already fitted, so a rider who had just hitched a groomer was told to go get one. Took it
ahead of daylight slice 4 (small, a just-landed feature telling the player something false). Now the canned nag is always
stripped and `rigNeed()` appended only when something's missing. `g2_rig_wording.mjs` state "Woodsman + receiver +
groomer fitted": rank3 "Grooming contracts are on the board. You'll want a groomer on the hitch." → "Grooming contracts
are on the board."; other 6 states unchanged. F2 (rest of v70 checks out): no action. smoke.mjs exit 0, page errors none
(powder 1.48, trench 2.18, 6 s ride 65.4 mph). Text-only, no README change; v72. Next: daylight slice 4.

## 2026-10-26 03:55 — Far beacons shrink to a soft glow (G3) — 796dc3b
Report 0012 F1: from 0.7–1.2 km the guide beacon was a hard hairline from the roofline to the top of the frame (too few
px wide for v69's silhouette fade). `beaconMat` now passes the camera's ground distance to the pillar (vBD) and blends
by `smoothstep(300, 1100)`: the top fade moves from 450–1000 m of height down to 30–280 m, the foot falloff steepens a
little and strength drops to 0.85×. Inside 300 m nothing changes. `g3_beacon.mjs` now also shoots 700 m. Before → after
(top of pillar in the 1280×720 frame, contrast-boosted strips b14/strip.jpg): 700 m night ran to the HUD at y≈60 → fades
out by y≈130; 700 m day full-height hard line → soft taper fading toward the top; 1200 m day (foot behind a hill) a
faint line at the top of the sky +33 luma at y120 → +11 (gone). 120/350 m unchanged (vision on b14/crop.jpg; row stats
there are dominated by toasts/HUD). smoke.mjs exit 0, page errors none (powder 1.44, trench 2.18, 6 s ride 65.5 mph).
README tablet paragraph; v71. No new reports to triage (last 12). Next: daylight slice 4 (far terrain contrast).

## 2026-10-26 03:45 — Rig gates say what you're missing (G2) — d1a31b7
Rank 3 told a Frontier rider "You'll want a groomer" and the groom card said "the garage sells them", but the groomer
(and the trailer at rank 5) fit only the Woodsman and newer and need a $150 receiver. New hoisted `rigNeed(id)` (tier
lock via `genWhy` with sled price/deliveries, else "the garage sells … ($N)", else "yours is at the garage: hitch it on",
plus the receiver if `recvOk` fails) and `rankOpens(r)`; used by the groom + heavy-freight `contractBlock` lines, both
accept toasts and the rank-up toast. Locked cards now end "(Woodsman+ sleds)". New `scenarios/g2_rig_wording.mjs`
(reads the strings directly at 6 ladder states). Before: every state said "the garage sells them". After, 3 deliveries on
a Frontier: "The tow-behind groomer drag ($700) fits the Woodsman 440 W/T and newer (4 deliveries, $600). It hooks to a
hitch receiver ($150)."; on a Woodsman it drops the sled line, then the receiver line, then is empty once fitted.
Still of the Trail Crew app (b13shot/01): the line fits the card on three small lines, no clipping. smoke.mjs exit 0, page
errors none (powder 1.47, trench 2.24, 6 s ride 65.4 mph). README rank section; v70. Triage 0012: F1 beacon hairline at
1.2 km → new G3 item at top; F2 wall-stall re-confirmed 0.58 m/s (noted); F3/F4 info. Next: beacon distance fade.

## 2026-10-26 03:30 — Guide beacons are soft light columns (G3) — c91d357
Report 0010 F1's "huge uniform grey band" in the night sky was the guide beacon over the quay (empty-handed you get
one over the depot): a 4.4 m × 1 km additive tube at flat opacity 0.2 with no fog, so from 120–350 m it drew a
hard-edged bar from the village to the top of the frame. Kept the beacon (it's how you find your way) and gave all
of them (sites, lookouts, school yards, school checkpoint) one `beaconMat`: a MeshBasic `onBeforeCompile` that fades
alpha to 0 at the silhouette (view·normal²), keeps it strong at the foot and thins it upward, fading out over the top
half instead of a cut. New `scenarios/g3_beacon.mjs` (depot beacon from 120/350/1200 m, midnight + noon, weather
pinned). Before → after (half-max width of the pillar at a mid-sky row, 1280 px frame): 120 m night **22–24 → 16 px**,
day 22 → 16–18; core peak unchanged (+85–100 luma over the sky), so it still reads clearly as a marker. Vision on
shots b12/crop.jpg (before top, after bottom): flat bar → glowing column with soft edges, no artifacts.
smoke.mjs exit 0, page errors none (powder 1.44, trench 2.20, 6 s ride 65.4 mph). README tablet paragraph; v69.
Triage 0011: F1 re-confirms the groomer wording item (moved to top, G2 has had one landing to G3's four); F2 garage
clarity fine (no action); F3 `g2_groomer_gate.mjs` can't read the 3D board (noted on the item). Next: groomer wording.

## 2026-10-26 03:20 — No more cliff rims round the lakes (G3) — d276e89
Took the far-terrain sawtooth item over daylight slice 4 (a visible artifact beats a contrast nudge). Cause was
geometry, not shading: `genWorld` carves each lake basin with `mk = 1 − sstep(0.85, 2.1, t)` but skips cells past
`dd > 1.7 r`; with the noisy t, mk was still up to ~0.5 at that cut, so every lake had a ring of 20–40 m one-cell cliff
steps (probe: 360 → 388 m in 4 m) that the 8 m far terrain drew as a comb of teeth. Fix: mk also fades to 0 from
1.2 r → 1.7 r (ice and banks inside t < 0.97 untouched; icefish depth charts unchanged; lakeside cabins use
`flatSpot` at runtime). New `scenarios/g3_ridge.mjs` (finds the worst view, logs cliff counts, TL_SPOT pins a spot).
Before → after: 4 m edges rising >10 m world-wide **4525 → 683**, within 2 r of a lake **3952 → 110** (rest are sea
cliffs). Pinned spot −234,676 (Røyevatnet, 1.5 km out): vision on shots/b11/cmp.jpg — comb ridge gone, slopes read
as one smooth fell, no new seams; a soft zigzag of shaded triangles where snow thins to rock remains (new low item).
smoke.mjs exit 0, page errors none (powder 1.48, trench 2.21, 6 s ride 65.7 mph). README intro line; script v68.
Triage 0010: F1 night-sky grey diagonal band → new G3 item; F2/F3 night walking fine (no action); F4 quay contrast
variance (ignore unless it recurs). Next: night band (G3) or groomer wording (G2).

## 2026-10-26 03:08 — Wind-sculpted snow relief (G3) — 454630b
Daylight slice 3. First fixed `g3_day.mjs`'s backcountry teleport: its search started at r 300 m, so the first
obstacle-free spot was the town edge; now 1.5 km+ out, 600 m+ from every site, open fell (`bioAt` 0, no frozen lake),
gentle ground, and it logs the distance (1.50 km). Then `patchMat` fragment: fresh untouched snow gets a per-pixel
normal tilt from a world-space height noise (sastrugi ripples stretched across a NW wind, bent by a domain warp,
gathered in patches, plus slow ~10 m drift swells); fades out on packed snow, ice, rock/bare ground, wet spring snow
and from 28 → 45 m (the patch edge). No geometry/physics change; sin-free hash so big world coords don't band.
g3_day before → after (imgstats local contrast / std): backcountry Nov **2.35 → 2.78** / 40.0 → 40.1; March **2.29 →
2.66** / 40.8; quay 4.41 → 4.42, sled close-up 3.78 → 3.83 (yards are plowed so near-unchanged, as intended). A first
try (stronger, uniform ripples) looked like motion-blur streaks at dawn from the chase cam; softened ~35%, warped and
patched; vision on shots/b10/cmp2/sheet.jpg: reads as natural wind-blown snow, no seam where it fades, no artifacts.
smoke.mjs exit 0, page errors none (powder 1.43, trench 2.20, 6 s ride 65.6 mph). README daylight paragraph; v67.
Triage 0009: all confirmations of v66 (no action; the card-height idea noted for the Aurora perk item). Found: a
sawtooth band on far hillsides (new G3 item). Next: daylight slice 4 (far terrain) or the G2 groomer wording.

## 2026-10-26 02:52 — Trekker earns its place: built-in touring kit (G2) — 2e529fb
The Trekker ($3400, 24 deliveries) had less power than the Summit before it and nothing else to show; its 0.9-burn
engine didn't even count (stock engines report burn 1). Decided not to retune its power (it's a touring sled, not a
mountain sled) but to make it the long-haul machine: new `SLEDS[].perks` (added in `stats()` after parts, so it stacks)
and `perk` text shown in green on the garage card. Trekker: +2.5 warmth (heated grips/seat, tall shield), +1 parcel slot
(its rack), burn −0.1. New `scenarios/g2_sledperks.mjs`. Before → after (Trekker): slots 1 → **2**, warmth 5 → **7.5**
(cold drain 100% → 73%), burn 1 → 0.9, range 30 → 33.3 L-equiv = **1.25× → 1.39× the Summit** (Aurora 1.42); 20 s ride
2.29 → 1.78 L/km. Other sleds unchanged. Card text checked in the scenario log. smoke.mjs exit 0, page errors none
(powder 1.49, trench 2.25, 6 s ride 65.6 mph). README garage paragraph; script v66. Did not touch the two-up seat /
tours (Lemon's spare-seat work). Triage 0008: all confirmations (v65 verified, slice 3 + g3_day teleport + HUD badge
already queued). Follow-up: Aurora E vs Matriarch (new item, use perks). Next: daylight slice 3 (G3).

## 2026-10-26 02:45 — Clear-day air: thinner, cool-blue haze (G3) — 5085562
Daylight slice 2, fog part. `updSky`: while the sun is up and the sky clear (`clr` = sun ramp × (1 − storm)) fog
density drops 30% (0.0017 → 0.00119) and its colour (shared with the sky shader's horizon, so no seam) leans 35%
toward a cool blue `C_AIRDAY` (Nov noon fog b5b8c6 → adb8cd); storms and night unchanged. `GFX.fogK` (low preset
1.3×) had no consumer; it now multiplies the density. g3_day.mjs before → after (imgstats std/local/sat): quay
51.1/4.53/37.5 → 52.4/4.41/37.2; backcountry Nov 39.0/2.69/24.8 → 40.2/2.78/25.3; March 40.5/2.62/25.7 → 40.9/2.71/25.8;
sled close-up unchanged. Vision (shots/fog_cmp/sheet.jpg): far headland keeps more shape, sky/fog a cleaner blue
instead of lavender-grey, no terrain/sky seam or far-edge pop. Modest: the flat look is mostly the near snow
(slice 3 queued). smoke.mjs exit 0, page errors none (powder 1.47, trench 2.20, 6 s ride 65.1 mph). README; v65.
Triage 0007: F1/F4 confirm v63 (no action), F2 folded into the first-5-min item (low), F3 5th HUD-badge confirmation.
Found: g3_day's backcountry teleport doesn't leave town (stills 0.31 km from quay), noted in slice 3. Next: Trekker trap (G2,
no G2 landings yet) or daylight slice 3.

## 2026-10-26 02:33 — Plowed apron out from every house door (G1) — f4741a8
Cause of report 0005 F1 (0.58 m/s at the shore-road house): a measurement artifact. New `scenarios/g1_townlots.mjs`
shows all 13 buildTown lots built and fully plowed (yard 1, pack 0.85); the old `g1_yards` aim walked at the
house's middle from the side and stalled against the wall (10 m never reached in 14 s). Re-aimed square-on at
the door (kept the old aim as a row): 1.93 m/s, slower than other yards because `KIT.house`'s disc reaches only
~4 m past the door wall. Fix: lit (doored) `KIT.house` adds a 3.5 m disc 5 m out from the door wall → plowed
~8.5 m out, easing over 6 m. g1_yards before → after: shore-road door 1.93 → **2.42 m/s** (start depth 0.45 →
0.31); depot/garage/Strandbu/Mehamn 2.52–2.55 and open powder 1.38 unchanged. Stills (shots/apron_cmp/sheet.jpg):
no rings or artifacts, packed snow reads the same as the rest of the yard. smoke.mjs exit 0, page errors none
(powder 1.52, trench 2.25, 6 s ride 65.3 mph). README walking paragraph; script v64.
Triage: 0006 F1 confirms daylight slice 2 (already queued, now top), F2 third confirmation of the HUD badge item,
F3 info. Follow-up: walking into a wall at an angle stalls (new G1 item). Next: daylight slice 2 (G3).

## 2026-10-26 02:22 — A clear first ride (G1) — 60e578a
Cause: `buildHospital` picks the flattest lot 75–205 m from the depot and nothing kept it off the spawn's heading
(SPAWN = depot +6 z, yaw π), so it stood 81 m dead ahead (−5°); behind it, the south town-limit sign (12 spokes
round the depot, spoke k=9 is exactly the spawn line) had a post 1.1 m off the lane. Fix: the hospital lot search
skips a 220 m × 80 m corridor ahead of SPAWN; the one sign whose spoke runs down that lane turns 0.11 rad (~12 m)
aside. New `scenarios/g1_start.mjs` (spawn geometry, obstacles in the forward lane, 12 s full throttle, hit log).
Before: lane obstacles at 68–78 m (hospital), ride stopped at 74 m (0.6 mph, nose-in under the sign); after moving
the hospital alone it hit the sign post at 114 m (63.9 → 11.4 mph). After both: lane clear to 120 m, **309 m in
12 s**, top 65.8 mph, no hits; smoke 6 s ride ends at 65.6 mph instead of 1 mph. Hospital now at 82 m, 41° right
of the spawn heading, still in view from the start. Vision (cmp_start/sheet.jpg): spawn view natural, helsesenter
sits to the right behind the houses, ride ends on open snow along the coast. smoke.mjs exit 0, page errors none
(powder 1.42, trench 2.20). README helsesenter line; script v63. No new reports (last triaged 5).
Next: shore-road house yard gap (G1).

## 2026-10-26 02:12 — Daylight has shape (G3) — 10a0dc9
Cause: on 1 Nov the noon sun is 4° up, so at its true angle flat snow got N·L ≈ 0.07 of the key light and the
whole scene was lit by the even sky fill (hemi 0.54, near-white ground bounce) = no shadows, one flat grey.
`updSky`: while the sun is the key light its direction is lifted to y ≥ 0.22 (~13°; sky disc untouched, moon
keeps the old 0.05 floor), sun intensity ramps in over −1.5..4° instead of −1..7° (1.31 → 1.9 at Nov noon),
and by day the hemi fill drops 30% with a slightly bluer ground bounce (`sunK`; 0 at night, so night is
unchanged). New `scenarios/g3_day.mjs` (weather pinned clear, rig numbers logged, Nov + Mar noon) and
`tools/playtest/imgstats.py` (luma mean/std/p5-p95/sat/local contrast). Before (origin/main) → after: quay std
45.0 → 51.3, local 4.19 → 4.63; sun-behind 42.6 → 49.6; sled close-up 44.6 → 51.2; backcountry 36.7 → 39.0;
March 40.2 → 40.5; mean luma ~unchanged (164 → 165). Vision on cmp3 sheet + 01_quay full-res: long blue shadows
from the houses and the sled now lie on the snow (none before), sunlit snow warmer; no black or harsh shading;
backcountry only slightly better. smoke.mjs exit 0, page errors none (powder 1.46, trench 2.18). README daylight
paragraph; script v62. Stills: ~/.hermes/cache/scratch/tlloop/shots/day_b3, day_a3, cmp3/sheet.jpg.
Smoke still shows the sled nose-in at the Helsesenter after 6 s (the v61 "74 m" note was wrong): start item stays.
Triage: 0005 F1 (shore-road house unplowed, 0.58 m/s) → new G1 item #2; F2 merged into the HUD badge item; F3
confirmation. Next: fix the start (G1), then the shore-road gap; daylight slice 2 queued.

## 2026-10-26 01:58 — Plowed yards in town (G1) — 7200a84
New `addYard(x, z, r)` discs (fully plowed inside r, easing to powder over 6 m) around every `KIT.house`, each
site's building + parking (depot 20 m, village shop 13, homes/cabins/relay 10), the garage forecourt, the
helsesenter door and a lane of 6 m discs from the depot down to the quay. `yardOf(cx, cz)` caches a per-chunk
0..1 map; plowed cells start at d = f·(1 − 0.85·y) (pack 0.85), `refill` fills them back only to that level,
`depthAt`/`fillCell` read it for unloaded chunks too (`restCell`). HUD says "Plowed yard" instead of "On your
tracks" there. New `scenarios/g1_yards.mjs` (10 m from a standstill toward the door, before = origin/main copy):
depot yard 1.53 → **2.53 m/s**, garage 1.54 → 2.54, Strandbu home 1.48 → 2.52, Mehamn 1.54 → 2.55 (depth 0.48–0.59
→ 0.07–0.09 m, pack 0 → 0.85); open powder unchanged 1.37/1.38. Stills (yards_b2.jpg vs yards_a2.jpg): soft grey
packed yards round each house, no hard rings, nothing floating; buildings show a bit more wall. smoke.mjs exit
0, page errors none (powder 1.46, trench 2.21; the sled now makes 74 m in 6 s from the yard). README walking
paragraph; script v61. Not measured: FPS cost of the extra Map lookup per unloaded cell in `fillCell` (small).
Triage: 0004 F1+F2 (flat, washed-out daytime; scores quay day 5 / night 8) → new G3 item, now top; the
playtester's `views.mjs` closes the "baseline views" item. F3 (OPEN BACKCOUNTRY badge at the quay) → low item.
Follow-up: plowed lanes along the Kjøllefjord shore road. Next: daytime lighting (G3).

## 2026-10-26 01:40 — Hills count on foot (G1) — b2b786a
`footStep` now reads the ground grade along the way you face (`groundAt` 0.7 m ahead minus behind, not the
snow top, or your own trench reads as a climb; smoothed in `FOOT.grade`). Uphill pace ×(1 − 0.85·grade),
floor 0.5; gentle descent up to +18%; steeper than ~0.3 down it eases off again; climbing adds strain (winds
you sooner). New `scenarios/g1_slope.mjs` (inland hillside 1074,−458, grade 0.27, 0.85 m powder, three
parallel 8 s walks from a standstill): before up 1.20 / across 1.35 / down 1.27 m/s (ratios 0.89 / 0.94, depth
noise only) → after up 0.91 / across 1.32 / down 1.49 (ratios 0.69 / 1.13). Kept the climb penalty mild (first
try 0.95·grade gave the same 0.69 avg incl. ramp; end speeds 0.99 vs 1.40). smoke.mjs exit 0, page errors
none, flat powder 1.45 / trench 2.16 (unchanged within noise). Stills (slope_after2.jpg): wading pose normal
on the hill, no float/sink. README walking paragraph; script v60.
Triage: 0002 F1 (town never packed; backlog's "should be 2.9 m/s" premise was wrong) → replaced the town
measurement item with a packed-town feature item, now top. 0002 F2/F3 (quay obstacle/sea edge clean) are
confirmations; F4 (shore road faster than quay core) dropped as a 20 m ramp artifact. 0003 F1 (groom card
doesn't mention the Woodsman) merged into the rank-3 groomer item; F2 info. Follow-up: skiStep grade uses surf.
Next: packed snow around town/quay/yards.

## 2026-10-26 01:30 — Progression audit + garage says what's next (G2) — 127af07
Audit: new `scenarios/g2_ladder.mjs` (per-sled stats via `stats()`, job boards sampled 40× at 12 delivery
levels, garage text). Ladder table + pay curve written into LOOP.md "Progression map". Worst findings: Trekker
weaker than the Summit before it, Aurora weaker than the Matriarch, nothing above the Summit opens a part,
grooming announced at rank 3 but its gear needs the Woodsman (4), parcels ≈$50/est-min flat at every level.
First upgrade timing is fine (Woodsman ≈ 4–5 round-town jobs ≈ 15 game-min). Each became a backlog item.
Built the slice a player hits first: the garage's locks were unreadable. Before (`g2_garage.mjs`, 2 deliveries,
$450): locked sleds showed only "4 deliveries" (no price), locked parts showed "Gen 2+ / Gen 3+ / Gen 4+ /
Gen 5+" with nothing mapping a generation to a sled. After: lock labels "Woodsman+ / Ranger+ / Sprint+ /
Summit+", each locked part's line ends "Fits the Woodsman 440 W/T and newer (4 deliveries, $600)" (or "switch
sleds" if you own one), locked sled cards add an amber "$600 once you've made 4 deliveries (you have 2) · opens
22 more parts in the shop"; the tier toast in `fitPart` says the same. First try used `<b>`, which picked up
the title style and shouted (vision); changed to an amber span the size of the other text. smoke.mjs exit 0,
page errors none (powder 1.49, trench 2.18). README garage paragraph; script v59. No new reports to triage.
Next: G1 slope on foot, then the Trekker/Aurora sidegrade problem.

## 2026-10-26 01:15 — Walking pace in powder up ~45%, tiredness softer (G1) — 31a0364
Fresh powder: `wade` floor 0.42 → 0.57 and full pace 2.7 → 2.9 m/s in `footStep`; tiredness builds
0.07 → 0.04 ×strain/s and recovers 0.05 → 0.08/s (tired only drives the pose/breathing, not speed).
New scenario `g1_walk30.mjs` (30 m of powder from a standstill, then 25 m back along the trench):
powder 30 m **28.1 s → 19.3 s** (avg 1.07 → 1.56 m/s), tired at 30 m 1.00 → 0.77; trench 1.96 → 2.23 m/s
(trench/powder ratio 1.83 → 1.43, still clearly faster). smoke.mjs: powder 1.01 → 1.51, trench 1.75 → 2.13,
exit 0, page errors none. Stills before/after (side + chase): same stride and trench, after reads less
hunched; no regressions. README walking paragraph updated; script v58.
Triage: report 0001 → finding 1 (no slope term on foot) became a backlog item; findings 2 (obstacle
collision clean) and 3 (turn rate = spec) are confirmations, no item. Reordered: did this G1 pace item ahead
of the G2 audit since it's Lemon's first-named complaint and a direct player win; the audit is next.
Next: G2 ladder audit; then slope on foot; town/quay walking check.
