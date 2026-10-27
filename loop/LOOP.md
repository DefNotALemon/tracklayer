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

- [ ] G1 (playtest, follow-up to v145 ski obstacle slide): `g1_ski_forest` 0/9 stuck now. Unjudged: skiing into a trunk
      fast downhill (thud threshold sq > 0.55 at > 3.5 m/s: too forgiving / too harsh?), skis along a house wall (o.ax
      slide), and how the sidestep looks from the chase camera at glide speed (a sideways shuffle on skis?).
- [ ] G1 (low, follow-up to v144 notch lock): `g1_narrowgap.mjs` 0/12 stuck now; unjudged: a ring of 3+ trunks all closer
      than body width (does the locked side ever lead into a dead end?), and how the detour looks from the chase camera.
- [ ] G1 (playtest, follow-up to v142 round-obstacle sidestep, report 0072 F1): `g1_obround.mjs` (2 pallets + 4 lone
      rocks/trees, head-on and 0.3 m off) stuck 6/12 → 0/12, mean hug 5.15 → 1.25 s. Forest stands verified by b87
      (`g1_forest.mjs`: 4 densest flat stands, 16–18 trees within 12 m, 3 headings each, W held 30 m through): v141 4/10
      pinned on a trunk face (mean stall 15 s; 2 more runs were harness cold blackouts) → v142 stuck 0/12, stall 0, side
      flips 1 in 12, max lateral drift 1.3 m. Pace there (mean 23.8 s / 30 m) is the 0.86–0.9 m snow, same depth as open
      ground round the stands, not the trees. Lamp posts beside lanes verified clean (report 0074: 0/6 stuck). Left for the
      playtester: the gamepad stick (no CDP gamepad emulation; maybe drive `navigator.getGamepads` with a stub) and
      skiing (skiStep has its own obstacle code, unchanged).
- [ ] G3: Buildings slice 3 (v116 `KIT.house`; v117 `workShed()` did the garage (corrugated steel `shedMetalTex`),
      pier freight shed and fish buyer shed: `g3_sheds.mjs` local contrast garage nov 5.47 → 6.75, freight 4.09 → 4.96,
      fish buyer 5.18 → 5.77; quay draw calls 869 → 877; report 0054 verified). v118 did the hospital (`hospPanelTex`,
      `hospUV`, framed `houseFacade` windows, plinth, mullions; `g3_hospital.mjs` local nov front 4.91 → 6.23).
      Report 0055 verified v118 (local 6.24/6.10/5.26, calls 530). v119 did every `buildSites` building (quay depot,
      village shops, herder/wind-farm cabins, fell homes): houseClad boards, plinth, framed door, framed `houseWinMat`
      windows (`g3_sites.mjs`, depot calls 579 → 553); report 0056 verified (calls 553, local within 0.3).
      v120 did the signs (`signMat(tex, glow)`: Lambert + emissive faded in by houseWinTick; `g3_signs.mjs` + `signstat.py`).
      v121 did the garage name boards (0056 F5: the blank panel was the garage's forecourt post sign, its stripes faced
      the wall): `garageSignTex()` on both faces + an over-door board; `g3_garage_sign.mjs`; report 0058 verified (636 calls).
      v122 gas stations (`g3_stations.mjs`): forecourt plowed (`addLane`) + an additive warm light pool under the canopy
      (`stationPool`, fog-dimmed, opacity from houseWinTick). v138 pump/post hardware (merged per material, +1 call: q34
      538 → 539): steel kick plate, white stripe, holster + nozzle + hose loop per face (old holster floated 10 cm off
      the pump), island bollards, post concrete feet + amber/black bands + collar (`g3_stations` local nov canopy 4.09 →
      4.24, night canopy 4.65 → 4.75). Playtester: judge the nozzle at ride distance and the bands at night. The pool is subtle on moonlit nights (judge on a dark night).
      v139 fuel cabins (`g3_fuelcabin.mjs`, 2 cabins × walk 6 m / q34 / cans 1.3 m, Nov noon + 21:00): Euro pallet + 7 real
      20 L jerry cans (X emboss, 3-bar handle, spout cap) + ratchet strap, on an `addYard(…, 1.6)` shovelled patch (the old
      pallet sat under the powder); 17 → 6+2 meshes per cabin (q calls 334 → 324); local nov cans 3.37/3.05 → 4.49/4.02.
      Playtester: walk-up from the sled (the new yard patch, any snag on the pallet ob), the cans at night by headlamp. Street lamps (`K.lamp`) could get the same pool. The relay
      keeper's house is a KIT.house already. Report 0054 F4: shed fascia may read as a paint line at noon: judge rooflines under a low sun.
      v123 roof trim (`roofTrim()`, merged into the trim mesh, 0 extra draw calls): eave fascia + boxed soffit, barge
      boards + rake soffit on KIT.house and buildSites (`g3_roofs.mjs`: corner/gable/eave, Nov/March 15:00/21:00). Left:
      the work sheds (`workShed`) and the hospital still have their own roofs (check they match), white trim on the
      white snow edge reads a little merged in a close eave view (report 0060 F4: red houses, close range only; idea: a
      slightly grey fascia tint for white trim); day glass still mid-grey (0053 F3, low). Report 0060 verified v123 (304 calls).
      v124 street-lamp pools (`lampPools()`: 35 K.lamp spots, one merged additive surface-following 13 m disc mesh, +1
      draw call, laid on the first houseWinTick; `g3_lamps.mjs` night near mean 73.8 → 84.8, p95 134 → 189). Report 0059
      F3: the station pool (0.45, 0xff7a2a) reads faint on moonlit nights; lamp pools use 0.5 / 0xe0601a; consider
      matching the station to that. v125 lamp heads: own Lambert `lampHeadMat()` (grey frosted glass by day, emissive
      faded in by houseWinTick); noon globe RGB 227/219/196 → 169/171/178, night unchanged. v126: KIT.glowM (church
      windows, ferry windows/portholes, pump displays: its only users) now follows houseWinMat's colour (`g3_glow.mjs`, noon
      centre 227/219/196 → 104/105/107, night unchanged). Report 0061 F3: a lamp pool reads fainter from 9 m beside the
      post than from 22 m (foreshortening; low, idea: brighter near falloff). v140: own `lampPoolTex()` cos³ falloff
      (head 3.9 m up) + scatter tail, disc R 6.5 → 8.5 m, opacity 0.5 → 0.65, 0 extra calls; vision: warm core at the foot
      of the post, no ring edge. Playtester: judge on a moonless night and walking up to a lamp in a village. v127 pump displays: `pumpDisplayTex(price)`
      grey-green LCD ($, L, $/L) via signMat glow 0.85, box edge UVs pinned to the bezel (0 extra calls; `g3_stations.mjs`
      new `disp` view, local nov 3.98 → 4.64, night 3.99 → 4.41). Report 0062 verified v126; its F2 (g3_glow ferry target
      frames the tackle shop) is harness-only. v128: station pool now 0xe0601a like the lamps, opacity 0.45 → 0.6 (night
      pump mean/p95 104.6/196 → 109.5/211, 0 calls). Report 0063 verified v127 (538 calls). v129: canopy light panel (a fixed
      cream MeshBasic, 0063 F1) → `canopyLightMat()` Lambert 0xa4acb6 by day, emissive 0xfff1cf × n (houseWinTick); night
      unchanged, 0 calls. Report 0064 verified v128; kiosk ridge gap (0063 F2) not reproducible there, dropped.
      v130 day glass (0053 F3): `houseGlassTex()` sky-over-dark-room reflection + sheen blended in by `houseWinMat.u`
      (`g3_glass.mjs`, 6 m close views + 13 m fronts; night ±1, calls 871 → 871). Report 0065 verified v130.
      v131 (0065 F1): glass lookup slides with the mirrored view ray (`gR`) + Schlick Fresnel to sky; normal flipped to
      face the eye (white houses are mirrored/inward-normal: first try turned every pane flat sky). v132 (0060 F4): dark
      steel drip edge (vertex-tinted 0.34 in the merged trim, `mergeBoxes` 8th entry + `trimVC`) along every fascia and
      barge-board top, 0 calls (305 → 305); `g3_roofs` eave local mar 5.50 → 5.80, nov 5.83 → 6.09. Playtester: judge
      the drip line at ride distance (too faint/too busy?) and on the white houses' grey trim. v133: the work sheds' flat
      roofs (garage, freight shed, fish buyer) get a `KIT.dripRing` (KIT.drip 0x4f4f4e, 6 cm, 4 cm inside the snow edge;
      +3 draw calls, quay 821 → 824); `g3_sheds` local +0.07–0.12 by day. Hospital skipped: its fascia is already grey
      0x9aa3ab under the snow. Report 0066 verified v131 (no seams; same sheen on 5 houses from the same angle, by design).
      Report 0067 verified v132 drip edge at 15–20 m (red + grey trim); fades into the roofline by 25 m and at night (by
      design, no action). Report 0076 (`g3_drip_ride.mjs`): reads as a crisp line on red houses at 15–20 m; on the white
      grey-trim house faint at 15 m, gone at 25 m (low; idea: darker drip tint on white-trim houses only).
      Playtester: judge the sliding sheen in motion along a street for a repeated-stripe look; playtester: judge the pump LCD at ride distance (moire?). Playtester: judge v117 sheds at ride distance and the garage from
      the T-key garage approach; also v116 houses in the villages (Mehamn/Gamvik) for moire.
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
- [ ] G1 (low, playtest, follow-up to v106): sled column over ridges lifts above the crest. b78 continuous walk
      (`g1_sledpin_crestcont.mjs`, hold W 106 m over a 59 m rise): lift eases 114 → 0 m over the last ~25 m to the crest,
      foot screen row moves ≤16 px/game-s, no jump at the 25 m skip; vision: column visible over the walker every frame.
      Crest walk closed. v134 made the easing frame-rate independent; report 0068 verified it on a second, bigger
      rise (10.5 m/game-s, 18 px/game-s). Still unchecked: in trees (anchor the search on a known forest cell, not
      spawn: none within 600 m of spawn), next to a LIT depot beacon (needs `GS.load` set; call
      `updateMatrixWorld` before projecting `depot.beacon`, 0068 F4).
- [ ] G1 (low, playtest, follow-up to v136/v137 shore slide): stuck 3 → 0, avg 2.73 → 5.53 m (report 0070); skiing and the
      pier edge clean (0069). Only left: a long diagonal beach walked by hand (does the 4 m sea-mask staircase make the
      walker zig-zag visibly?), stills from the chase camera.
- [ ] G3/G1 (idea, b87): tree wells. Snow under a dense pine/spruce stand is as deep as open ground (0.86–0.9 m inside vs
      0.87–0.96 m round it). Real conifers intercept snow: a shallower dish round each trunk (birch barely, it's leafless).
      Would read as real forest snow and give the walker shallower footing by trunks. Needs care: the near deformable
      patch vs far terrain hand-over (pop-in), trunk/cap y placement, and `freshCell` must match `getChunk`.
- [ ] G2 (low): Late ladder polish (slices 1–3 done: v85 fell/Apex, v86 tonne/Matriarch, v87 clean-air/Aurora,
      `scenarios/g2_fell.mjs`, `g2_cleanair.mjs`; v98 TONNE chip, `g2_tonnechip.mjs`).
      Report 0026 F2: the gates are insurance/rating rules, not physics (Summit hauls 500 kg up a 0.38 grade at 33 mph
      vs Apex 42, never bogs); 0026 idea: the locked card could say "can haul it, just slower" if it stays coherent.
      v141 (b85): the lock text now gives the player's own gap (sledGap); the "just slower" line left out on purpose
      (the cards already frame it as insurance/rating, which reads coherent).
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
- [ ] G1/G3 (low, playtest, follow-up to v115 snowshoe mesh): slope/night/crash/discoverability all clean (report 0051).
      v115 made the shoes full-size (22×66 cm) with red decks; side view reads clearly (b59/after.jpg). Left: judge them
      from the real chase camera while walking (b59's chase still framed the walker at the screen edge, feet cut off).
- [ ] G2 (playtest, follow-up to v114 Sprint trail gearing): `g2_sprint.mjs` rides 14 game-s from rest, yaw pinned. Check
      by hand: does the Sprint feel twitchy/over-fast on its own tracks at 117 mph, and does it crash more on the lake?
      Also b58 noticed every sled hits 121–137 mph on lake ice from rest in 14 s (Ranger 121): ice top speed may be
      unrealistically high (rolling 140 vs 260 on snow, no extra air drag); worth a realism look on its own.
      b59 decision: NOT retuning ice top speed. It comes from `SPEED_K = 1.42`, Lemon's own "Faster sleds (+42% top
      speed)" commit (7093330, v47); lowering it would undo his canon. Only revisit if Lemon asks.
      (Harness: the Trekker legs in that run parked on a bad spot and crashed at 0.1 s; harden `park` choice per sled.)
      Report 0052 (`g2_sprint_feel.mjs`): trail half invalid (never on packed snow), ice top speeds truncated runs. Its
      "Sprint wanders 32 m vs Summit 2.9 m on ice" dropped by b60: steering (`tgt`, `P.yr`) is the same for every sled
      except `zip` (neither has one) and `grip` (Sprint grips MORE, 1.1 vs 0.8), and the A/D taps are 90 ms of WALL time
      at a variable frame rate, so steer input differs run to run. Only re-test with game-time-timed input (set
      `input`-level steer for N game-s) before calling the Sprint twitchy.
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

Last triaged report: 78
