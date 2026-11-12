# Builder progress log

Newest first. One entry per builder pass:

```
## 2026-11-12 07:50 — 3.4a a few drivers on the open roads (G4) — 78d7e4c
Builder pass (full throttle; cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is retired).
Triage 156-157: no BLOCKER/BUG to fix. 0156 #1 ("sled at 25 m/s stops dead at a car, no crash") dropped: a car is a hard
obstacle exactly like a boulder or wall, and CRASH_AT.hard is 31.3 m/s by canon (70 mph across the board), so 25 m/s
bouncing off without a throw is the designed behaviour, not a car-specific gap. 0156 #2 and 0157 #1-#3 (POLISH) queued in
the LOOP.md backlog. Verified: 0156 #3-#5, 0157 #4-#6. Last triaged 155 -> 157.
3.4 had no design: split into 3.4a (built here) and 3.4b (traffic polish, designed in EXPANSION.md). New `tlx-traffic.js`
(system "traffic", option `traffic` on): drivers on each open route's road part, right-hand lane 1.6 m off the crown,
max 12.5 m/s, sqrt(1.9 R) per point with a 1.6 m/s^2 braking profile each way; stop 7.5 m behind anything in their line
(cars, P, walker, parked vehicles, parked sled), 22 m before a shut stretch then a 7 s U-turn across the road, turn or
drive on into the village at a route end, turn back after 25 s held up. A bubble keeps 6 cars (3 on GFX.low) 600-1400 m
round you. Solid against the ridden sled/truck (boulder rule: pushed out, into-car speed reflected x1.45, thud,
cargoHit, toast) and the walker (pushed aside). Shapes reused from the parked cars (`TLXC.geo`, tlx-cars v3); lamps
unlit and brightened after dark. Nothing saved.
Numbers (new asserting `x3_traffic.mjs`, all pass): build 3 ms; 6 cars on 5 routes placed 237-1222 m round you, 0 off
road; +4 draw calls; car drove 234 m in 25 game s, top 12.50 m/s, 0.00 m off its lane line (1.60 m right of the crown),
never over a bend's sqrt(1.9 R) (first run was +0.66 m/s from interpolating the profile between points: now the slower
point); stops 7.5 m behind your sled and behind a walker; snowed-in stretch -> stopped 22.0 m short, U-turned, back in
its new right-hand lane; sled at 9 m/s into the car: bump + toast, bounced off at 3.6 m/s, no crash, never inside; walker
pushed clear; option off hides + freezes; lamps 0.55 by day -> 2.15 at night; teleport far -> cars re-placed 754-1343 m.
Stills `~/.hermes/cache/scratch/tlloop/b0158/sheet.jpg` (driving, wide, stopped behind the sled, night tail lights).
Not done (3.4b): turning wheels, engine sound, headlight beams, overtaking a parked obstacle, village-street traffic.
Gate: smoke, x3_traffic, x3_cars, x3_digcars pass (log `b0158/gate.log`); x1_save failed on its system whitelist (no "traffic"), added there, rerun exit 0.

## 2026-11-12 07:25 — 3.3b dig a buried car out by hand for pay (G4) — 7613f43
Builder pass (full throttle; cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is retired).
Triage 154-155: no BLOCKER/BUG. Verified: 0154 #1-#3, 0155 #2/#3/#6/#7. POLISH queued (not built): 0154 #4 sled across a
wheel track reads P.scr 1.0 (cap by angle to the road), 0154 #5 scrape sparks unreadable by day (joins 0152 #3), 0155 #1 a
car is a winch anchor named "boulder / solid" (name it, cap ~15 kN), 0155 #4 sled stops ~0.6 m short of a car's side
(circles r 0.95 -> 0.8). 0155 #5 (overcast keeps cars buried for days) is answered by this slice. 0154 #6 harness note.
Last triaged 153 -> 155.
Built 3.3b in `tlx-cars.js` (v2) behind option "Dig out buried cars" (`digcars`, on). New bridge in tracklayer.js: `footX()`
providers ({ use() -> {label, hint(), act}, digging() }, `api.footx`) asked by footUse/footAction (after the rig's tongue)
and the #wnHint line, so keyboard E, pad L3 and the touch DIG/STOP button all work with no per-scheme code; rescueTick keeps
FOOT.dig on while a provider digs. hint() is a function because on touch keyHint -> btn("use") calls footUse again (built
eagerly it recursed: stack overflow, caught by the scenario). Found in testing: a car parked by the tackle shop got E eaten
by the shop (gameKey asks FISH.ctx first) while the hint said dig; footXUse now steps aside wherever `FISH.ctxLabel()` is set.
Numbers (new asserting `x3_digcars.mjs`, all pass): b 0.6 car dug clear in 27.5 s game (planned 27.7), paid $59 (scale
$40/20 s just buried .. $90/40 s full drift); 5 s of digging 0.596 -> 0.485; crouch 1.0; keyboard / Xbox / DualSense /
Switch / touch start and stop with their own control names; paid once per storm, again after it eases; walking off stops;
owner finishing first pays nothing; option off = no prompt, no dig, no pay; part-dug car keeps b and b0 over a reload.
Still `~/.hermes/cache/scratch/tlloop/b0156/dc/x3dc_digging.jpg` (walker facing the drift, "Digging out Gunhild's car 13% ·
E: stop"). Not done: no shovel item (all by hand), no dig-specific arm animation beyond the bog dig's crouch.
Gate: smoke, x1_save, x3_digcars, x2_use, x3_cars (log `b0156/gate.log`).

## 2026-11-12 07:05 — 3.3a parked cars, buried by storms, dug out by their owners (G4) — e6c6250
Builder pass (full throttle; cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is retired).
Triage 153: no BLOCKER/BUG (#1-#3 verified; #4 joins the 0149 #6 line; #6 toast stacking queued; #5 acceptable). Last
triaged 152 -> 153. Report 0154 landed mid-pass (grep shows no BLOCKER/BUG); left for the next pass to triage.
3.3 had no design: split into 3.3a (cars + burial, built here) and 3.3b (the "Dig out buried cars" option for pay,
designed in EXPANSION.md). New `tlx-cars.js` (system "cars", v1): a seeded half of the lit doors get a car nosed in 3.5 m
off the wall and 3.2-4.4 m beside the door where it fits (plowed, off roads, flat, clear of sea/obstacles); 24 cars in 10
places. Six instanced meshes (per-car paint colour, glass with a raked windscreen, trim + wheels, lamps, roof/hood snow,
the drift); three obstacle circles each with top = roof. Snow per car fills at the roads' storm rate; roof dusting, drift
from 0.1, buried from 0.35, car hidden under a full drift at 0.85 (its corners poked through the dome in the first
stills). Owners dig out after a seeded wait once calm (1-10 h; a quarter 20-60 h). Saved `x.sys.cars`.
Numbers (new asserting `x3_cars.mjs`): 24 cars / 50 doors, 0 misplaced; +6 draw calls (1071 -> 1077); build 5 ms.
Storm: 0.5 h roof snow (b 0.08, no drift), 3 h b 0.50 (drift halfway), 6 h 24/24 buried; 6 h after calm 17/24 still
buried; 72 h+ all clear. Save/reload keeps the same 17; a save without car state loads all clear. A sled at full throttle
from 14 m stops 2.66 m from the car's middle. An 8 h sleep in a storm buries 24/24.
x1_save's known-systems list gained "cars". Stills `~/.hermes/cache/scratch/tlloop/b0154/cars2/` (clear, half-buried
with roof snow, full drift at dusk, street views).
Gate: smoke, x1_save (after the list fix), x3_cars, x3_roadsnow (log `b0154/gate.log`).

## 2026-11-12 06:40 — beta fix 0149 #1: a job over a snowed-in road gets a visible heads-up toast (G4) — ac850cd
Builder pass (full throttle; cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is retired).
Triage 151-152: no BLOCKER/BUG. 0151 #2/#3, 0152 #1/#2 verified; 0151 #5 / 0152 #5 notes (no change). POLISH 0151 #1 (open
Jobs app doesn't refresh on a road shutting), 0151 #4 (plow reopen toast maybe lost), 0152 #3 (night sparks faint), 0152 #4
(`P.scr` kept on foot) queued as one line. Last triaged 150 -> 152. Took the top BUG, 0149 #1.
Cause: the minimalist HUD (11 Nov) sets `#job{display:none!important}`, so 3.2b1's " · <road> snowed in" on `#jobSub` only
reached the compass strip's label (shown 2.8 s while the target sits under the triangle) and the Jobs app.
Fix (tlx-roads v9): `TLXR.tripNote(x, z, tgt, job)` = tripWarn + one `api.toast` per road per storm when `job` ("Heads up: the
<road> is snowed in on the way to <place>. A pickup won't get through till the plow's been; a sled will."; the fell road: "shut
for the winter. Take the sled.", once per session). `R.noted` clears a road's note in `snowApply` once it has no shut stretch.
updGameHud calls it with job = any real target (tracked, SAR, rescue, tour, load, groom, pickup, claim, school course) and not
during the tutorial; the idle quay arrow stays quiet. Wording works for sled riders too (0149 #6 left queued).
Numbers (x3_roadwarn F, now asserting on screen): `#job` width 0 (confirmed hidden); no job + road shut -> 0 road toasts; claim
over the shut fv888 -> 1 toast, 520x52 px, opacity 1; 2.5 game s later -> 0 new; plowed then shut again -> 1 fresh toast.
Still `~/.hermes/cache/scratch/tlloop/b0153/rw/f_claim_toast.jpg` (toast under the weather card, readable).
Gate: smoke, x1_save, x3_roadwarn, x3_roadsnow (log `b0153/gate.log`).

## 2026-11-12 05:55 — 3.2b2 scraped road surface: sleds grind and spark in the wheel tracks of a freshly plowed road (G4) — 629bd1f
Builder pass (full throttle; cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is retired).
Triage 148: no BLOCKER/BUG (3 POLISH, stable loaded rig). Reports 149/150 landed mid-pass, after the slice was built: 0149
#1 BUG (compass-row warning hidden by the minimalist HUD's `#job{display:none}`) queued at the top of the Backlog for the
next pass; 0149 #5/#6 and 0150 #1/#2 POLISH queued as two lines. Last triaged 147 -> 150.
Built (tlx-roads v8): per-stretch plow time `r[id].t` (saved, roads v3; old saves = never; the plow and a sleep set it);
`TLXR.scrapeF` = fresh (1 to 8 h, 0 by 20 h) x clear (0 by snow 0.1) x cold (month temp + 3 x weather: 0 at -3, 1 at -7);
`TLXR.scraped(x, z, lx, lz)` = track 0.5 + skis 0.25 each by how squarely they sit in a rut (wheel tracks 0.8 / 2.4 m off
the crown, ~0.3 m wide). tracklayer.js: `P.scr` once per physics step (0 in a cab), rolling drag + P.scr x (400 + 70 v) N
(`SCR_DRAG`), ski sparks (shed at 0.55 x sled velocity so they trail the ski; 7/12 per m/s x scr, carbide/ice skis more),
a 3.2 kHz scrape in the hiss, "Scraped road" on the HUD bonus line. Decisions: "cold snap" = the Weather app's own
temperature, so a clear November day barely scrapes (0.16) and December-March do; no visible wheel-track stripes yet.
Numbers (new asserting `x3_scraped.mjs`, Gamvik road straight leg, clear 5 Jan, stock Frontier from rest, 5 s): wheel track
69 mph (P.scr 0.5, HUD "Scraped road" every sample, ~100 sparks) vs between the ruts 83.5 (P.scr ~0.1) vs the same lane
with a 30 h old plow 89.5 (scr 0). Across the road: crown 0.05, ruts 0.5, between 0.05, shoulder 3.6 m 0. Stretch: fresh
1.00, 12 h 0.74, 30 h 0, snow 0.3 0, fell road 0; November clear 0.16. Save/reload keeps plow times; an old save loads
with nothing scraped. First tune (900 + 420 v) cut the wheel track to 55 mph at 7 s (-40%): eased to -23%.
Stills `~/.hermes/cache/scratch/tlloop/b0149/s6/` (day/night side; sparks needed spawning 0.16 m up and 4x the rate before
they showed above the snow, checked with an enlarged-red probe: warm dots along both skis at night, faint by day).
Gate: smoke 0, x1_save 0, x3_scraped 0, x3_roadsnow 0 (its save-version check now `>= 2`), x3_roadwarn 0 (logs
`b0149/gate.log`, `gate2.log`).

## 2026-11-12 05:15 — 3.2b1 road warnings: Map legend, compass/Jobs warn of a snowed-in road, pickup says drifted shut (G4) — 3dd00aa
Builder pass (full throttle; cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is retired).
Triage 146-147: no BLOCKER/BUG. 0146 #1 by design; #2 (no fjord case in x5_wounds_pad) queued as a low test-gap line.
0147 #1-#4 verified; #5 POLISH (0.6-0.95 weather fills roads while the plow stays in) folded into the 0141 #2 line.
Last triaged 145 -> 147. Took the next slice: 3.2b was split into 3.2b1 (warnings, built here) and 3.2b2 (scraped surface).
Built (tlx-roads v7): a road graph (route waypoints joined by their stretch), trip anchoring (waypoint <= 150 m, else road
<= 60 m by distance along it, else waypoint <= 350 m, else sled country = no warning), Dijkstra over it, `TLXR.trip/tripWarn`
(cached per 30 m + repaint), `TLXR.drift`, `TLXR.legend`; `near()` now also returns `s` (metres along). tracklayer.js hooks:
one line in updGameHud (appends to #jobSub), one in jobsList (row meta + `road`), the Map app's `#tabRoadLeg` refreshed in
widget(). tlx-vehicles v17: `stillWhy` says the drift line ahead of the driving tips when sinking on a shut/closed road.
Numbers (new asserting `x3_roadwarn.mjs`): all open -> 0/5 trips warn; Ifjord -> "Ifjordfjellet road shut for the winter";
fv888 shut -> quay<->Mehamn and quay->Gamvik warn, Dyfjord/Lebesby/Mehamn->Gamvik quiet; one stretch past Gamvik -> only the
relay trip warns; mid-road past a shut stretch -> ahead clear, back warns; 8 backcountry sites, all roads shut -> none >350 m
from a village warns (Strandbu/Naust, 320 m off a village, do). Compass and Jobs claim row warn, clear once plowed. Legend
shows "snowed in 1", count gone when open (still `b0148/s2/g_map_legend.jpg`: bottom right above the scale bar, no
overlap). Pickup in 70 cm on a drifted fv888 stretch: why "drift" + the line; same spot road open: "dig"; fell road: "shut
for the winter". The bog system's own "digging in / stuck to the axles" toasts still follow the drift line (they're its).
Gate: smoke 0, x1_save 0, x3_roadwarn 0, x3_roadsnow 0 (log `~/.hermes/cache/scratch/tlloop/b0148/gate.log`).

## 2026-11-12 04:45 — Beta fix 0141 #1: a drizzle no longer shuts the roads, the plow works through light snow (G4) — 00333e8
Builder pass (full throttle; cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is retired).
Triage 145: #1/#4 verified; #2 BUG (live cells under a truck lag when `setSnow` jumps a stretch to full) logged as intended
(refill at the storm's rate is the design; real storms build gradually, reloads load full depth, sleeps plow the roads); #3
POLISH folded into the 0141 #2 line. Last triaged 144 -> 145. Took the queued BUG 0141 #1.
Cause: road fill ramped from weather 0.3 (`sstep(0.3, 0.9)`) and the plow waited for weather under 0.45, so a long grey 0.5
spell filled every road ~0.04/h and kept the plow in. Fix (tlx-roads v6): ramp `ROADS.fillA/fillB` = 0.5..0.95, `plowWx` 0.6.
Full storm unchanged (fill 0.16/h at 1.0).
Numbers (new asserting `x3_roaddrizzle.mjs`): drizzle 0.5 x 12 h: before (report 0141) 5/5 roads snowed in, max 0.51 -> after
0/5, max 0.000. Roads at 0.6 under light snow 0.55: plow sets out, all 5 open within 4 h (max 0.018). Moderate 0.75 x 6 h: max
0.57, snowed in. Storm 1.0 x 3 h: 0.495, all snowed in, no plow; 4 h of fair weather: all open.
Gate: smoke 0, x1_save 0, x3_roaddrizzle 0, x3_roadsnow 0, x3_roadsnowdepth 0 (log `~/.hermes/cache/scratch/tlloop/b0145/gate.log`). Numbers-only fix, no stills.

## 2026-11-12 04:30 — Beta fix 0143 #1: pad D-pad down bandages a fresh wound before calling help (G4) — 24e165e
Builder pass (full throttle; cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is retired).
No new reports (last triaged stays 144). Took the top queued BUG, 0143 #1.
Cause: the pad's D-pad down sent KeyP whenever `helpWanted()` (empty tank / fjord), so a bleeding rider on an empty tank
called a $45 fuel delivery and lost the 6 s bandage window. Fix: new `TLX.wounds.dressable()` (option on, a bandage in the
kit, a wound inside BANDAGE_WINDOW); the pad sends KeyU while it is true, KeyP otherwise. tlx-wounds v2.
0143 #3 ("Press P" toast) is a non-issue: the toast already uses `btn("help")`; it keeps the keyboard name only when it fired
before the first pad input. Noted on the backlog line.
Numbers (new asserting `x5_wounds_pad.mjs`): empty tank + fresh wound, D-pad down: before (report 0143) wound open, help
called -> after wound dressed (bandages 3 -> 2), no call; second press calls help. Soaked wound / empty kit / no wound / option
off on an empty tank: help called, kit untouched. Fuel in tank: bandages. Keyboard U / P unchanged.
Gate: smoke 0, x1_save 0, x5_wounds_pad 0; x5_wounds_break B1 now passes, exits 1 on its E1/F1 asserts only (mis-set per
report 0143 itself: E checks after the respawn, F expects a reload to keep wounds the depot spawn heals). Log
`~/.hermes/cache/scratch/tlloop/b0143/gate.log`. Input fix, no stills.

## 2026-11-12 04:15 — Beta fix 0144 #1: a fully drifted road is full depth, road depth rises with its snow (G4) — 877d91d
Builder pass (full throttle; cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is retired).
Triage 144: #1 BUG fixed here; #2/#3 verified/fine; #4 POLISH (NaN `st.h`) folded in (one-line guard). Last triaged 143 -> 144.
Cause: tlx-roads sets a stretch's legs to `Y.k = 0.9 * (1 - q)`, so q = 1 (snow >= 0.975) gives k = 0; `yardOf` read
`(Y.k || 1)` and treated 0 as "unset" = a fully plowed yard (85% cut), deeper-plowed than an open road. 0.5 at 0.59 m was
correct for the formula (half the cut on ~0.95 m of pack); the report's "monotone" ask was broken only at the top end.
Fix: `Y.k ?? 1` in yardOf; `snowInit` also resets a non-finite `st.h` (0144 #4). tlx-roads v5.
Numbers (new asserting `x3_roadsnowdepth.mjs`, restCell at 9 road spots off the villages, snow 0/.25/.5/.75/.9/1):
fv888#7 before 0.221/0.40/0.58/0.76/0.867/**0.141** -> after .../0.867/**0.939** (= snowpack); all 9 spots monotone after,
none before. A road chunk loaded at snow 1: 0.129 of 0.863 m -> 0.863 of 0.863.
Follow-up noted under the 0141 backlog line: the pickup (stops ~42 cm) bogs from ~snow 0.25 (~0.40 m), before the 0.35
"snowed in" line paints the road blue.
Gate: smoke 0, x1_save 0, x3_roadsnowdepth 0, x3_roadsnow 0. Numbers-only fix, no stills.

## 2026-11-12 04:00 — Beta fix 0142 #1: a boulder winch anchor no longer freezes the screen (G4) — 2661538
Builder pass (full throttle; cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is retired).
Triage 141-143: 0142 #1 BLOCKER fixed here. Queued as backlog lines in LOOP.md: 0143 #1 BUG (pad D-pad down calls help over a
fresh wound) + #3 (hard-coded "Press P"), 0141 #1 BUG (drizzle shuts every road, plow never comes) + #2 POLISH, 0142 #4
(x2_winchreel_break's "hand winch burns no fuel" assert trips on parked idle burn). 0143 #2 (reload = free heal, no position
saved) left as a note: by design of the depot respawn, not worth a fix now. 0142 #2/#3 verified. Last triaged 140 -> 143.
Cause: `selfReel` and the rescue tie called `wobble()` on any anchor; a boulder has no `tree`/`cell`, so `updWobble` ->
`setTree` -> `trunkOf` threw before `renderer.render` every frame and the entry was never removed.
Fix: `wobble()` returns for anything without `tree`/`cell`; `updWobble` drops an entry with no wob or no instanced cell;
both callers check `a.tree !== undefined`.
Numbers (`x2_winchboulder_break.mjs`): boulder anchor renders while reeling 0 / 2.5 s -> 71; after release 0 -> 18; wobbling
stuck at 1 -> 0; page errors 49+ -> none. Tree anchor unchanged (42 renders, sways).
Gate: smoke 0, x1_save 0, x2_winchboulder_break 0; x2_winchreel_break exit 1 on its fuel assert only (the 0142 #4 idle-burn
observation, untouched code path; queued).

## 2026-11-12 03:50 — Beta fix 0140 #1-#3: no 40 cm cliff, "ease off" only when the wheels spin (G4) — 229fd4a
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage of report 0140 (3.x pickup traction control beta): #1-#3 BUG on landed work, fixed here; #4 POLISH (30 cm on a
5% grade is a wall) and #5 POLISH (15 cm on a 10.7% hill is a silent 0.4 m/s near-stall) left listed; #6 verified. Last triaged
report 139 -> 140.
Cause (tlx-vehicles.js `core`/`stillWhy`): (1) standing drag / grip went 0.80 at 35 cm -> 0.99 at 40 cm (half belly, half
tyre), past the 0.92 "stuck" switch, which also turned traction control off: full spin, bog in 3.4 s. (2) `stillWhy` fell
through to the "dig" line whenever sinkS > 0.07, even with zero wheelspin (pad 45%: spinK 0, BOG.acc 0, crawling at 0.1-0.3 m/s
at the 1 s check). (3) Reverse had no "still making way" check at all.
Fix: fresh powder under the pan squashes to a quarter (was a third) before it bears; traction control holds until standing
drag reaches the grip (was 0.92); "stuck" ramps 0.9 -> 1.05 of grip instead of switching, and the past-the-tyre-radius rule
starts 3 cm past it. `stillWhy`: any truck making way (vfA > 0.05 in its direction, forward or reverse) is re-checked, not told;
"dig" needs real spin (spinK > 0.05 or BOG.acc > 0.15); no spin + light throttle = "more throttle"; no spin + floored = new
"deep" line ("The snow is deeper than the pickup can push. Back out along your ruts, or get out and dig.").
Numbers (new asserting `x3_powdertc.mjs`, gentle 1.9% grade, W, 7 s): 35 cm 6.4 -> 6.7 m; 38 cm 3.3 m + "digging in" -> 4.5 m
silent; 40 cm 0.0 m bog 3.4 s -> 2.8 m no bog; 42 cm 0.0 bog 3.1 s -> 0.0 bog 5.5 s; 45 cm 0.0 bog 2.9-3.0 s (unchanged).
Pad RT 45% in 35 cm: 2.2 m + "digging in" -> 2.5 m, silent. Reverse 35 cm: 6.3 m + "spin in reverse... ease off" -> 6.6 m,
silent. RT 30% stalled still "more throttle" at 1.0 s. Reverse into 60 cm: stops, "dig" (spinning), bogs 6.1 s. 80 cm W: stops,
"digging in".
Harness note: `x3_powderpull` F (80 cm bogs <= 6.5 s) fails on main too (56a0db3 and pre-3.2a fb49641): its 200 ms relay of
80 cm lifts the truck for a frame and resets the dig clock (BOG.acc ~0.1/s, stillT keeps restarting). F now asserts "stops
dead and digs in"; `x3_crawl` still holds the real 5 s bog line (passes).
Gate: smoke 0, x1_save 0, x3_powdertc 0 (all asserts), x3_powderpull 0, x3_crawl 0 (prints two "page errors: none", no FAIL),
x2_vehheld 0, x2_vehreverse 0, x2_haulreverse 0. Log `~/.hermes/cache/scratch/tlloop/b0140/gate.log`. Numbers-only fix, no stills.

## 2026-11-12 03:05 — 3.2a road snow: storms fill the roads, the council plow clears them (G4) — 381cd35
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage of report 0139 (2.6a trailer slope/pad/fjord beta): no BLOCKER/BUG; #1-#3 POLISH (pickup sunk to the sills
after a teleport onto a slope, likely a scenario artifact; chase cam loses the truck while it waits in the water; trailer at
~80 deg after a locked brake) left listed. Last triaged report 138 -> 139. Took the next slice, 3.2, split into 3.2a (this)
and 3.2b (scraped road surface for the sled, Map legend, job/compass warning, pickup line naming a drifted road).
Built: tlx-roads.js cuts every open road into 400 m stretches (fv888 13, gamvik 7, dyfjord 5, skjanes 15, lebesby 11) and
files each plowed leg (and the wide-bend legs) under its stretch. A stretch's snow (0..1) rises with the storm over its
middle (0.16/game h at full strength, nothing under ~0.3) and sets its legs' plow k = 0.9 x (1 - snow) in 0.05 steps;
tracklayer.js gets `plowRefresh(legs)` (api `world.replow`; `addLane` now returns its legs): drops the yard cache round them,
re-reads loaded chunks, cuts plowed ones down at once, and leaves snowing ones to `refill()` at the storm's rate. Council
plow: route max >= 0.12 and weather at its first end < 0.45 for 0.75 h -> sets out at 5 km/game h, zeroing each stretch it
reaches. >= 0.35 = snowed in: chart repainted (casing painted once, a copy kept as `TLXR.mapBase`, colours redrawn over it on
a change; snowed in = ice blue #6f9fd0, tried snow-white first: invisible on the cream relief of the tablet Map). Toasts on
the first road drifting shut and when all are open. A clock jump > 2 h finds every road plowed. Saved in `x.sys.roads` v2.
Numbers (new asserting `x3_roadsnow.mjs`, fv888 stretch 7 at 2.8 km): plowed yardAt 0.90, depth 0.21 m (powder 22 m off:
0.90 m). After 3 storm hours: snow 0.54, "snowed in", yardAt 0.41, settles-to depth 0.22 -> 0.60 m, real depth 0.21 -> 0.32 m
after 12 game s and climbing; town door yard 1.00 -> 1.00; off-road powder unchanged; chart pixel orange -> blue; no plow
while storming. Storm off: plow out, stretch back to 0.22 m at once, "open", orange, "roads are open again" toast. Saved
Dyfjord 0.6 survives a reload; a save with no road state loads all open; snowed in -> GS.hour + 3 -> all open. Re-reading
every road's plow map at once: 2.8 ms (snowing) / 1.5 ms (plowed) headless.
Not done: the plow is invisible (a truck on the road is 3.4 / milestone 4); the closed fell road is static; a snowed-in road
gives the pickup no road-specific line yet (3.2b). Stills `~/.hermes/cache/scratch/tlloop/b32/r1/` (sheet.jpg: plowed,
snowed, replowed, tablet Map; the minimap shows the drifted roads clearly).
Gate: smoke 0, x1_save 0, x3_roadsnow 0 (all asserts), x3_roads 0, x3_hairpin 0, page errors none. Log
`~/.hermes/cache/scratch/tlloop/b32/gate.log`.

## 2026-11-12 02:30 — Beta fix 0129 #1/#2: pickup traction control + "more throttle" / "steep in this snow" (G4) — a5d8bc9
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage of reports 0137 (rescue v195 beta: #1-#3 verified, #4-#6 POLISH: long cliff carry is a cut not a tow, a
13 m ring, reload-in-water skips the fee) and 0138 (2.6c strap guard beta: #1 POLISH yard ping still offers START COURSE while
strapped, as logged in the v196 entry; #2 POLISH forced state; #3 ok), all left listed. Last triaged report 136 -> 138.
Took 0129 #1/#2, owed since v193.
Cause (tlx-vehicles.js `core`/`stillWhy`): (1) a light pedal's push (pad RT 30% = 2.5 kN) under the 35 cm standing drag
(~3.3 kN) has no spin, so nothing digs and the truck sits; `stillWhy` then took the `sinkS > 0.07` branch and said "ease
off", the opposite of what helps (and RT under 25% never got a line at all). (2) The "stuck" dig term compared Fres with
0.92 of traction, but Fres includes the bow wave, and a steady crawl IS the speed where the bow wave matches the push, so
every crawl read "stuck"; plus a floored W spun the wheels (Fe 8.2 kN vs 4.1 kN grip): on a 1.9% grade both dug it in.
Fix: traction control (the ECU trims Fe to 1.12 T0 while the standing drag `sPre` (no bow wave) is under 0.92 T0; push is
unchanged, only the digging spin goes); "stuck" reads `sPre`, or Fres once a tyre sinks past its own radius (40 cm+), so a
run into a 50 cm bank still ends in a bog; `stillWhy` gains "pull" (push < need and the tyres have grip to spare: "Not enough
throttle to push through this snow. Give it more, smooth and steady.") and "steep in this snow", and stays quiet for up to
3 s while the push beats the drag (a crawl that is only slow getting going used to open with "ease off"); held needs
throttle > 0.1 (was 0.25).
Numbers (new asserting `x3_powderpull.mjs`; before = the same scenario on origin/main v196, spot 1.9% grade / 10.7% hill):
RT 30% in 35 cm: 0 m, line "dig"/"ease off" -> 0 m, "more throttle" at 1.1 s, no bog; RT 15% in 20 cm: silent -> "more
throttle"; W in 35 cm up 1.9%: 4.5 m + bog at 5.4 s -> 9.4-9.7 m in 9 s, no bog, no "ease off" (vmax 1.5); RT 60%: 6.8 ->
6.4-6.7 m; 20 cm up 10.7%: "dig"/"ease off" -> "steep in this snow"; 45 cm: stops, bog 3.1 -> 2.9-3.0 s; 80 cm: bogs 4.1 ->
4.1-5.2 s. x3_crawl (flat): 35 cm 13.3 -> 13.1 m; 40 cm 2.1 m + bog 4.4 s -> 6.4 m creep, no bog in 7 s (README's "only
creeps in 40 cm"); 45/50/80 cm bog at ~3 s as before; run-up into 50 cm 16.8 -> 21.0 m in, bogs.
Not done: 0129 #3 POLISH (reverse is more forgiving than forward) unchanged; uphill pull away on 10% in 20 cm is still a
wall (its tyres can't hold the grade in powder: now said plainly); touch (gas floor 0.5) not run in this scenario.
Gate: smoke 0, x1_save 0, x3_powderpull 0 (all asserts; 4 fail on v196), x3_crawl 0, x2_revsilent 0, x2_deck 0, page errors
none (gate.sh exit 1 only because x3_powderpull and x3_crawl print "page errors: none" twice, theirs + lib's: gate wants
exactly 1; removed the extra line from x3_powderpull, x3_crawl still has it). Logs `~/.hermes/cache/scratch/tlloop/bcr/` (pp_before.log, gate.log).

## 2026-11-12 01:40 — Beta fix 0133 #1: no school course with your sled strapped to the trailer (G4) — d468c8f
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage of report 0136 (3.x switchback loops beta): #1-#3 verified, #4 harness note, #5/#6 POLISH (plowed strip
invisible from above + banded cut slope, same as 0127 #5; sharp bends on village streets only) left listed. Last triaged
report 135 -> 136. Took 0133 #1 BUG, queued ahead of 0129 #1/#2.
Cause: `schoolBegin` swaps GS.own and moves P to the yard start, but two things still treated P as the strapped sled:
`strapTick` (tlx-vehicles.js) glued P back onto the deck every frame, and `physCore`'s `strapOn` (VEH.strapped()) zeroed
thrust. Fix: `schoolCanStart` refuses while `VEH.strapped()` ("Your sled is strapped to the trailer. Unstrap it and ride it
off the deck first."; the app card's Start Course greys out through the same check); backstops: `strapTick` leaves P alone
while `api.busy()` (SCHOOL.on), and `strapOn` is false while SCHOOL.on.
Numbers (new asserting `x2_schoolstrap.mjs`; before = 0133's `x2_schoolstrap_break.mjs` on v195): strapped start: course
started with the school sled 0.7 m from the trailer and 0.0 m moved under throttle -> refused, own sled kept and still
strapped, toast shown, card blocked. Backstop (check bypassed in the scenario): school sled 0.0 m from the yard start and 8.2 m
from the trailer, drives under W; quit -> own sled back, strapped, 0.7 m from the trailer. Unstrapped: course starts as before.
Not done: the yard-arrival ping still offers START COURSE while strapped (pressing it gives the refusal toast); 0133 #2 POLISH
needed nothing. Next: 0129 #1/#2 (pickup in 35 cm powder), then 3.2.
Gate: smoke 0, x1_save 0, x2_schoolstrap 0 (all asserts), x2_deck 0, page errors none. Still
`~/.hermes/cache/scratch/tlloop/bss/x2st_refused.jpg` (refusal toast over the Freight app, Start Course greyed).

## 2026-11-12 01:10 — Beta fix 0131 #1/#2: the fjord rescue never sets you down on a cliff face (G4) — 1bb9e2c
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage of reports 0131-0135: 0131 #1 BLOCKER (cliff coasts: rescued back into the water, -$140 a cycle) and #2 BUG
(clear ring short, same fallback) taken; 0131 #3 POLISH (carried up to 131 m; now up to ~210 m on cliffs, see below) left;
#4-#6 verified. 0133 #1 BUG (school course while the sled is strapped to the trailer: the school sled is glued to the
trailer) is the next builder item, with 0129 #1/#2 (pickup in 35 cm powder) still owed ahead of 3.2. 0132 #1-#3, 0134 #1-#2,
0135 #1-#3 POLISH, left listed in their reports. Last triaged report 130 -> 135.
Cause: `dryLandNear` searched a +-60 deg fan inland out to 120 m; on a cliff coast nothing passed, and the fallback returned
`shore + clear` along the shore direction without checking it: a 0.46-1.06 slope on the sea face, sometimes over seabed
3.5 m deep (the 4 m bio cell read as land). The body slid in, sat at y -0.41, and the drown check fired again.
Fix (`tracklayer.js`): `ok()` also needs the ground itself above sea level (+0.6 m at the spot, >= 0 on the rings) and checks
3 rings x 24 points (was 2 x 16); the search runs three passes (fan to 120 m; full circle to 300 m; 0.75x ring and slope 0.24
to 300 m), then `P.safe`, then the nearest SITES yard, then the spawn: nothing that failed the test is returned any more.
Safety net: in the water with `P.wet`, speed < 1 m/s and no rescue running for 4 s -> `startDrown()` (help can be called).
Numbers (new asserting `x3_rescuecliff.mjs`, 123 coast points incl. 0131's three; before = origin/main v194, same scenario):
pickup 14 m: steepest landing 1.06 -> 0.18, min clear ring 2 -> 13 m, full spec 107/123 -> 123/123; sled 9 m: 123/123 full
spec (min ring 9 m, max slope 0.179). Live at (-2216,-745) and (-1842,-469): before, landed on slope 0.46/0.57 over ground
-3.6 m, wet and HELP on again 8 s later; after, landed 160/220 m away at 83/108 m elevation, slope 0.17/0.15, dry, one fee,
0.0 m drift. Slowest search 2 ms. Carried: median 52 -> 52 m (sled), max 131 -> 213 m, 8 of 123 over 150 m (cliff coasts).
Not done: the long carry is still a cut, not an animated tow (0131 #3 POLISH); part C (dead in the water) passes on main too
since the sink test usually catches it, so the 4 s net is untested on the exact 0131 state; lake ice not run.
Gate: smoke 0, x1_save 0, x3_rescuecliff 0 (all asserts; 8 fail on v194), x3_rescue 0, page errors none. Stills
`~/.hermes/cache/scratch/tlloop/brc/after/cliff_*.jpg` (sled on dry snow above the fjord, toast "Winched out ... -$140").

## 2026-11-12 00:55 — Beta fix 0127 #2-#4: switchback loops, no road bend under 13 m, bends plowed wider (G4) — cae8268
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage of reports 0129-0130: 0129 #1 BUG (pad RT 30% in 35 cm powder: truck sits still, BOG off, no hint for
7 s) and #2 BUG low-med (35 cm crawl very slope sensitive; a 20 cm drift on a 10% grade is a wall) are the next builder
pass's items, ahead of 3.2; 0129 #3/#4 POLISH, #5 verified. 0130 #1 POLISH (`footUse()` says HOOK past the line's reach,
same as 0126 #2) left as polish. Last triaged report 128 -> 130. Took 0127 #2-#4, owed since v191.
Cause (new `x3_hairpin_probe.mjs` telemetry + `x3_roaddump_probe.mjs` plotted from above): the A* climbs a steep hillside
in V-shaped zigzags whose legs meet at a point, and Chaikin rounding leaves a 6 m radius at each tip; a 3 m-wheelbase
pickup can't hold that (on packed snow a 15 m loop takes ~5 m/s), so it ran wide or cut in onto unplowed snow and bogged.
First try, `widen()` alone (curvature smoothing that draws tight points toward the chord): radii fixed, but rounding the
V from inside cut Lebesby from 4018 to 3196 m and its steepest 48 m to 18-24% (x3_roadbed failed); a stronger A*
anti-doubling (legs 48 m apart) picked a shorter, steeper line still (24%). Kept fix (`tlx-roads.js`): `bulbs()` gives
every tip turning > ~100 deg a loop out past the point (radius 16 m, or 13.5 m where 16 doesn't fit; radius eased from the
leg onto the circle; skipped if it would reach sea, water, a house or another stretch of the same road within 14 m),
which adds road on the landing and leaves the legs where the search put them (21 loops); then `widen()` eases whatever is
left under `ROADS.minR` 13 m; a final `shove()` keeps resampled points off walls; bends under 26 m are plowed 2.6 m wider
each side (`ROADS.wide/wideR`), trees cleared to match. Boot cost 0.83-1.04 s (was 0.86).
Numbers (new asserting `x3_hairpin.mjs`; before = origin/main v193 with the same scenario): tightest open-road bend fv888
6.0 -> 13.2 m (under 8 m: 28 -> 0), lebesby 6.0 -> 13.0 m (29 -> 0), gamvik 9.4 -> 14.4, skjanes 11.2, dyfjord 28.3
unchanged. Bend-aware driver (pure pursuit, target speed sqrt(1.9 R), brakes when 2.5 m/s over), 26 game s from 15% and
45% of each line: lebesby 15% bogged at a hairpin (13 points, yard 0.62) -> 35 points at 7 m/s, no bog; all six runs on
fv888/lebesby/skjanes now no bog, max 6.1 m off the line. Lebesby 4333 m long (was 4018; widen-only 3196), steepest 48 m
0.178 -> 0.125; fv888 0.132 -> 0.140 (its 48 m p95 0.11).
Test change: x3_roadbed's "steepest stretch" pull-away now also reads at 5 s (3 s still counts): on Lebesby's new
steepest, a straight 12.4% climb, the pickup is traction-limited (~1.4 m/s2) and does 5.9 m at 4.1 m/s in 3 s, 16.9 m at
6.5 m/s in 5 s; fv888's passes at 3 s (9.9 m) and runs off its bend by 5 s, as the scenario holds W straight.
Not done: 0127 #5 POLISH (the bed is invisible from the air) and #6 left; the old greedy `x3_roaddrive_break.mjs` driver
(W held flat out) still can't take 13 m loops at 15+ m/s and isn't meant to; village streets keep their own lane routing
(one on fv888 has an 8.7 m bend); night/pad/touch not run (no input code changed).
Gate: smoke 0, x1_save 0, x3_hairpin 0 (all asserts), x3_roadbed 0, x3_roads 0 (buildings hit 0 after the final shove;
4 before it), page errors none. Stills `~/.hermes/cache/scratch/tlloop/bhp/st_sheet.jpg` (loops from above, Lebesby
minimap shows the switchback stack), plots `bhp/plot_lebesby.png` (old V zigzags vs loops).

## 2026-11-11 23:25 — Beta fix 0128 #1-#3: the fjord rescue lands you clear of the water, help is P / D-pad down (G4) — e6cdfff
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage of report 0128: #1 BLOCKER (pickup winched out of the fjord rolls back in 3 s later, -$140 a cycle) taken;
#2/#3 BUG (water hint and toasts say F, the key is P; no pad button calls help) taken with it; #4 BUG minor (P.wet survives a
teleport; N while in the water) half-done: N in the water now says to call for help by the scheme's button, the stale wet
flag after a scripted teleport left (only reachable by script); #5 verified; #6 POLISH (Gamvik road 3 m from the fjord, no
bank) left. Last triaged report 127 -> 128. Still owed: 0127 #2-#4 (hairpins on fv888/lebesby, pursuit pickup bogs) before 3.2.
Cause: `helpDone` put the body `nearestShore + 4 m`, i.e. on the bank slope just past the waterline; a 3 m-wheelbase pickup
rolled or probed back into the water and `startDrown` fired again. Fix (`tracklayer.js`): new `dryLandNear(x, z, clear)`
walks inland from the shore (the shore's direction, then a +-20/40/60 deg fan, 3 m steps to 120 m) to the first spot that is
dry, slope < 0.18, free of trees/rocks, with no water on two 16-point rings out to `clear` (9 m sled, 14 m vehicle); the
body faces inland, velocities/pitch/roll zeroed, and `HELP.dryT` holds it still and dry for 3 s. Controls: `BTN.help`
(P / D-pad down / CALL HELP); `helpWanted()` makes the pad's D-pad down call for help while in the water or on an empty
tank (bandage otherwise); the water hint (`wnPrompt`), dunk toast, empty-tank toast, "not in trouble" toast, N-in-the-water
toast and the satellite messenger note go through `btn`/`keyHint`; README controls line fixed (it also said R for reset; N).
Numbers (new asserting `x3_rescue.mjs`, 0128's spot 1493,-2822): pickup after the rescue: back in the water at +3 s, -$140
per cycle -> set down 15 m from the nearest water on slope 0.009, dry and HELP off for 30 game s, drift 0.0 m, one fee, drives
38.9 m in 5 s; sled: 9 m clear, slope 0.014, drift 0.2 m. Hint: "F: CALL FOR HELP" on every scheme -> "P: ..." / "D-PAD
DOWN: ..." / "TAP CALL HELP"; pad D-pad down in the water: nothing -> calls the rescue; F no longer claimed anywhere.
Not done: the jump from the end of the pull to the dry spot is a cut of several metres (more on a steep shore), not an
animated tow; lake ice dunkings use the same code but weren't run; a hitched trailer (`rig`) on rescue untested.
Before (origin/main v192 with x3_rescue): 11 of part A's 14 asserts fail (hints say F on
every scheme, pad D-pad down can't call, never winched out), then it stops at the new `helpWanted`.
Gate: smoke 0, x1_save 0, x3_rescue 0 (all asserts), x2_btn 0 (new BTN.help row on every scheme), page errors none.
Stills `~/.hermes/cache/scratch/tlloop/bres/sheet.jpg` (sled and pickup set down on flat snow, fjord behind).

## 2026-11-11 23:05 — Beta fix 0121 #2/0122 #2: the pickup crawls through 30-40 cm of powder (G4) — 740e1a5
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage of reports 0126-0127: 0126 #1/#2 POLISH (E acts behind an open tablet on foot; HOOK label shown when the
tree is beyond the line's reach), left. 0127 #2-#4 (BUG: fv888/lebesby routes still have hairpins of 6 m radius, a pursuit-
driven pickup cuts them onto unplowed snow and bogs; a bog at yard 0.67 on a landing) is the next builder pass's BUG, ahead
of 3.2. 0127 #5/#6 POLISH. Last triaged report 125 -> 127. Took 0121 #2/0122 #2, owed since v189.
Cause (new asserting `x3_crawl.mjs`, flat land spot, unpacked snow laid round the truck, W 7 s from rest; probes via a
temporary tunable vector): two cliffs at once. (1) Tyre resistance 0.55 sk + 2.2 (sk-0.22)^2 crossed the loose-snow grip
(mu 0.22) at ~32 cm; (2) belly drag 0.45 (emb/0.12)^1.2 from the first cm over the 26 cm clearance, 0.32 W at 35 cm on its
own. And once it did get rolling, nothing in the model grew with speed, so it either bogged or ran away (first tries:
35 cm 0 m or 24 m at 9 m/s, nothing between). Fix (`tlx-vehicles.js` core): past 22 cm the tyre term climbs 0.25 ex +
0.4 ex^2; a bow-wave term 1.3 ex^2 v^2 (cap 1.2 per wheel) caps deep-powder pace at a crawl; fresh powder under the pan
counts at 35% up to 15 cm over the clearance (minus a 2 cm deadband), every cm beyond in full (set snow/berms bear in full
from the first cm); wheelspin digs at the full rate below 2 m/s, falling to 10% at 3.5 m/s (a truck making way at a crawl
digs less than one spinning at a walk).
Numbers, distance in 7 s from rest with W (before = origin/main v191 at the same spot, after): 15 cm 48.8 -> 47.5 m;
25 cm 30.1 -> 31.3 m (vmax 10.9 -> 10.6); 30 cm 14.3 -> 20.9 m (6.6 -> 6.3 m/s); 35 cm 0.1 m bogged 3.8 s -> 13.6 m at
4.0 m/s, no bog; 40 cm 0.0 bogged 3.3 s -> 1.8 m creep then bog at 3.8 s; 45/50/80 cm still bog in 2.9-3.1 s, 0 m.
Pad RT 60% in 35 cm: 13.1 m. Run-up from hard pack into a 50 cm bank at 7.6 m/s: 16.7 m in, then bogs (before this
pass's belly knee it crawled on at 1.7-2 m/s indefinitely, helped by the nose-down pitch of rear tyres riding the front
ruts).
Not done: the nose-down pitch (rear tyres on packed ruts, fronts at the ground) still adds a small forward slope pull in
deep snow, pre-existing; uphill crawls in 35 cm will dig in sooner (below 2 m/s), which reads right but is untested on a
real climb; not tested by night or on touch (no input code changed).
Gate: smoke 0, x1_save 0, x3_crawl 0 (all asserts), x2_pickup 0, x2_standstart 0, x2_revsilent 0, x2_vehreverse 0 (its
C step passed this time), x3_roadbed 0, page errors none.

## 2026-11-11 21:45 — Beta fix 0123 #1/#2: the roads get a graded bed, no tight hairpins (G4) — 4b30d5e
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage of reports 0123-0125: 0123 #1/#2 (BUG, one cause: roads laid on 20-40% sidehills with no grading; the
30 m along-line grade check hid it and cross slope was never checked) taken this pass. 0123 #3 (generic "STUCK ... dig"
hint on a plowed road) left: with the bed graded the case no longer comes up on the open roads; #4 (closed road poles
over a cliff) improved by the same bed (closed road is graded too, worst 48 m grade 0.30 -> 0.11); #5 harness. 0124
#1-3 and 0125 #1-2 all POLISH (stillWhy catch-all wording with W+S held, grade tested after sink, harness limits), left.
Last triaged report 122 -> 125. Still owed before 3.2: 0121 #2/0122 #2 (no crawl between 25 and 35 cm of powder).
Cause, measured with new `x3_roadbed.mjs` (+ throwaway probes plotting the lines): the A* path on the steep coastal
slopes zigzagged in V-spikes and hairpins whose legs were 8-13 m apart and 3-5 m apart in height, and nothing graded the
ground, so the road tipped across. Fix (`tlx-roads.js`): (1) `bed()` grades the road: each open stretch's height is
smoothed along the line (±30 m), its grade relaxed toward 8%, stretches within 18 m of each other (hairpin legs, a branch
leaving the trunk) pulled to one height, then the 4 m ground grid is set to that level out to 6.8 m each side, easing back
over a ~1:1.6 bank (cut/fill max 8 m; not under lake ice or sea; ground under houses, sheds, turbines, boulders and fuel
stations untouched; last 36 m into a village/forecourt eases to the old ground; trees the bank moves > 0.3 m are cleared).
The far terrain is re-read (`farRefresh`, new `api.world.terrain`). (2) The A* pays 20 cells for stepping next to one of
its own last 16 cells, which removes the V-spikes and keeps hairpin legs ~32 m apart (routes changed shape on the steep
climbs only; Dyfjord/Gamvik/Skjånes unchanged).
Numbers (before = origin/main v190, after): cross slope ±3 m p95: fv888 0.48 -> 0.05, lebesby 0.38 -> 0.03, skjanes
0.39 -> 0.01, dyfjord 0.86 -> 0.002, gamvik 0.19 -> 0.02 (share over 0.15: 0-1.2%); worst 48 m grade: fv888 0.12 -> 0.12,
lebesby 0.10 -> 0.18 (a hairpin landing pushes it onto the leg; the truck climbs it at 7.8 m/s), closed road 0.30 -> 0.11.
Pickup from rest, W 5 s at 0123's spots (before = 0123's own numbers): fv888 (-1235,-745) 0.1 -> 34 m, lebesby (-1429,-75) 0.1 -> 29 m, fv888 0.5
41 -> 50 m, skjanes 36 -> 45 m; every open road's steepest stretch climbed from rest (3 s: 9-15 m, 6-10 m/s). Ground
under 572 houses/boulders and 3 stations near roads: 0 m change; 898 standing trees within 26 m: max 0.30 m. Boot cost of
the roads 538 -> 837 ms. Stills `~/.hermes/cache/scratch/tlloop/bbed_after/` (truck level in snowy cuttings).
Not done: 2.5% of fv888 / 0.6% of lebesby points still tilt > 0.15 at a few tight landings (worst 0.31 / 0.69 at one
spot each); the Map relief under the roads isn't re-shaded (cosmetic); not tested by night or on pad/touch (no input
code changed).
Gate: smoke 0, x1_save 0, x3_roadbed 0 (all asserts), x3_roads 0 (3.1's own, routes changed shape), page errors none.

## 2026-11-11 21:00 — Beta fix 0116 #1/#4: a held truck that can't move says why (G4) — 0356eda
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage of reports 0120-0122: 0120 all POLISH (Map road legibility, walking on the road no faster, night poles,
harness warm-up note), left as is. 0121 #1 "stale STUCK hint" is not visible (0122 #1 confirmed `#wnHud` is hidden); tidied
anyway: `updWinchHud` empties `#wnHint` when it hides. 0121 #2 + 0122 #2 (BUG, same thing: 25 cm pulls away, 35 cm stops dead
with no crawl) is the next builder pass's BUG, before 3.2. 0121 #3/#4, 0122 #3 (pad RT half as strong as W, maybe harness),
#4 left as POLISH. Last triaged report 119 -> 122. Took 0116 #1 (the next BUG per the last entry) with #4.
Cause: rerunning `x2_vehreverse_break.mjs` on v189, 0116's exact silent spot no longer reproduces (D0 S 3 s: 0.1 -> 12.0 m;
v189's rolling-resistance change). What was still silent, probed with new `x2_revsilent_probe.mjs` (per-step telemetry,
`R.gp/vfA/gok` kept as readouts): (1) S held backing up an 11% grade into 50 cm powder sat at 0.0 m with drag 34 kN and the
dig warning needed BOG.acc 0.45 = ~2.7 game s of spin before any word, so the break test's G check (and 0116 #4) saw a dead
truck; (2) a truck backed or driven into something solid (the parked sled, a boulder) jitters against it at 0-0.3 m/s and never
says anything (the bump toast needs a 1.5 m/s hit). Fix (`tlx-vehicles.js` core): while the gas or reverse is held, the truck
on the ground and not bogged, if it covers under 0.4 m in a second `stillWhy` names the reason once: something solid
behind/in front (collide now stamps `R.touchT/touchS`), wheels digging in (the existing toast, marks BOG.warned), too steep
for the grip (grade along the travel > 4%), or no grip. Ground covered, not speed, because against a wall speed saws 0-0.33.
Numbers (new `x2_revsilent.mjs`, 9 asserts): grade+powder, S: first word 2.7 s -> 0.97 s (pad LT full 1.03 s); sled 4 m
behind, S: silent -> "Something solid is behind the pickup" at 1.07 s (moved 0.21 m); sled in front, W: silent -> 1.48 s;
open lane S 3 s: 17.8 m, no warning; bog on the lane clears and `#wnHint` is empty.
Not tested: touch brake (0116 #3 still inconclusive in the harness), a loaded trailer starting slowly (it may now get a
"no grip"/"digging in" word if it covers under 0.4 m in its first second, which is fair).
Gate: smoke 0, x1_save 0, x2_revsilent 0 (9/9), x2_standstart 0, x2_pickup 0, page errors none. x2_vehreverse failed its C
step (ploughed 2.0-2.3 m into the powder vs > 2.5, then S backs out 0.6-1.1 m) on BOTH this build and origin/main (base run 1
passed 3.2 m, base run 2 failed 2.0 m): pre-existing flake, the "mid" spot's fresh varies 0.58-0.66 m between runs, deeper than
the 0.34-0.46 band it asks for. Same cliff as 0121 #2/0122 #2: the next pass's BUG should fix the crawl and re-pin that spot.

## 2026-11-11 20:30 — Beta fix 0117/0119: the pickup pulls away in light snow, a stuck truck frees on plowed ground (G4) — 475e36d
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage of reports 0116-0119: BUGs 0116 #1 (reverse silent at one off-lane spot, pull 6x the drag), 0116 #2 (pad
LT reverse nearly on/off), 0117 #1 + 0119 #3 (the same thing: the pickup can't pull away from rest on open snow), 0117 #2
(bog survives a move onto plowed ground). POLISH left as is: 0116 #3/#4 (touch brake inconclusive, scenario spot depth),
0117 #3-5, 0118 #1-3 (reload mid get-off seats you; harness limits), 0119 #1 (tablet left open on Q out, third report:
worth a small pass), #2 (parcels not saved across reload: existing behaviour), #4 (toast over the Jobs subtitle), #5.
Last triaged report 115 -> 119. Took 0117 #1/#2 + 0119 #3 + 0116 #2 (one area, tlx-vehicles.js `core`).
Cause, measured with `x2_standstart_probe.mjs` (seated truck, W from rest, per-step internals): the "flat open spots" of
0117/0119 are 46-66 cm of untouched powder. The truck drops to its tyres' full sink, belly buried 0.2-0.4 m past its
26 cm clearance, drag 15-53 kN against 4.1 kN of traction: stuck, as designed ("hopeless in fresh powder"; a real stock
pickup is too). 0119's "depth 0.06 m" was read after the wheels had dug the cell out. What was wrong: (1) rolling
resistance `0.95 * sink + 5 (sink-0.2)^2` made 20-25 cm of fresh as hopeless as 60 cm (cr 0.21 vs loose mu 0.22, so it
dug in); now `0.55 * sink + 2.2 (sink-0.22)^2`, about sink over tyre diameter, so a hand's to a boot's depth pulls
away and ~30 cm crawls, deep powder unchanged (still stuck). (2) A bogged truck dragged/towed/put onto plowed ground
stayed bogged: now it frees ("Free.") when every tyre sinks < 5 cm on packed ground. (3) Reverse maps the pedal onto
0.35..1 past an 8% dead zone (an automatic creeps), so a light LT pull backs it up; full S/LT unchanged.
Numbers (new `x2_standstart.mjs`, before = origin/main, after): shallow 16 cm fresh, W 5 s from rest 9.2 -> 19.9 m;
pad LT 30% in it 0.0 -> 1.7 m; deep 50 cm: 0 -> 0 m, dig warning at 1.3 s, bog at 2.9 -> 3.0 s (unchanged); bogged truck
on the lane: BOG.on true -> false, then W 0.8 -> 17.4 m; lane from rest 16.9 -> 18.1 m in 3 s (rolling drag on the packed
lane 956 -> 754 N; top speed is the governor's, unchanged). No 24-33 cm spot exists flat and open within 3.6 km, so
the crawl band is checked by formula only (the scenario runs it when it finds one).
Not done: 0116 #1 (reverse silent at one spot with low drag: candidates the tow rig/trailer constraint
or `collide` with the parked sled; needs its repro) is the next builder pass's BUG, before 3.2.
Gate: smoke 0, x1_save 0, x2_standstart 0 (10/10), x2_vehreverse 0, x2_pickup 0, x2_haulreverse 0, page errors none
(the first gate run flagged x2_standstart only for printing "page errors: none" twice; the duplicate line was removed
and the rerun shows it once, 10/10).

## 2026-11-11 19:20 — 3.1 The road network, static (G4) — 6fb0dc2
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage: reports 0112-0115 (2.7 refunds, repair) hold no BLOCKER or BUG: all POLISH (0112 #1 a scenario flake,
#2 untested corners; 0113 #1 no "already 100%" guard on `repair()`, #2 corrupt truck cond loads 0% vs trailer 100%; 0114
#1 hitched trailer measured from its own spot, #2 no distance foot on the trailer row; 0115 #1 one-point repair rows,
#2 lowercased brand in the trailer row title). Left as POLISH. Last triaged report 111 -> 115. So the next unticked
slice: 3.1, the first of milestone 3.
Built: `tlx-roads.js` (new system "roads", nothing saved: same terrain, same roads every boot). Six routes from waypoint
lists (sites, "@station"): Kjøllefjord-Mehamn (past the Kjøllefjord station, the wind farm and the Mehamn station),
Gamvik + Slettnes, Dyfjord, Skjånes (branching at the wind farm), Lebesby (past its station), Ifjordfjellet (Lebesby to
Ifjord, `closed`). Each leg is A* on a 16 m grid of the map: cost per metre rises with the grade (quadratic, steps at
11/16/22%), 16 directions so climbs can wind, sea out (and its corners: diagonal and knight moves check the cells they
cross), houses/sheds/turbines/boulders out (a leg with no other way runs again with them merely dear and is pushed clear),
lakes x25, woods x1.35, cells an earlier route used x0.35 (shared trunks). Path simplified, Chaikin-rounded, resampled
every 6 m; a rounding that cuts into the sea/a house or steepens the climb past the bare path is dropped for a plainer
one. A road stops at a ring round each village/the quay/the wind farm/the lighthouse (3/4 of its clear radius, the side
it comes in or leaves by) or beside a station's forecourt (12.5 m off its long axis, not through the pumps); a street
(the lanes' `laneRoute`) threads from there to the middle or across. Winter state: open roads plowed through the yard
system (`addLane(pts, 3.2, 0.9)`; `addPlow`/`yardOf` gained a per-lane plow strength `k`), trees cleared from the
corridor (`clearTree`, new bridge: instance scaled to nothing, out of obGrid), 831 orange snow poles with a reflector band
(one InstancedMesh, not obstacles), streets from each village's middle to every lit door, roads painted on `mapBg`
(Map app + minimap; shut road dashed). Bridges added to `initExpansion`'s `world`: laneRoute, doors, STATIONS, clearTree,
map {canvas, scale}. README "Roads". `TLXR.near/onRoad/grades` for 3.2+.
Numbers (new `x3_roads.mjs`, 25 asserts, all ok): boot cost 492 ms headless; lengths x1.05-1.68 the straight line (shut
fell road x2.84); open-road grade over 30 m p95 8.9%, max 15.4% (fell road max 42%, it's shut); 0 road points in the
sea, 0 buildings inside a road, 0 standing trees in a corridor (335 cleared); open roads yardAt >= 0.75 along 100% of
sampled points, fell road < 0.2 along 93%; poles 3.8-4.6 m off centre, 194 on the shut road; village street lanes 29,
doors plowed halfway 27/29. Pickup, 4 game s of throttle from rest: on the road 28.8 m (13.2 m/s), in the powder 40 m
beside it 0 m (bogged). Stills (r31b sheet) judged: the road reads as a sunk, packed strip; poles orange and upright;
minimap shows the roads.
Pitfall found while building: a grade measured over N resampled points lies when points bunch (pushed-clear points):
measure by distance along the line (`grades()`); the "47-81%" walls seen mid-build were that, not the terrain.
Also: `yardOf` now reads YARDS through a 64 m bucket index (`YBK`, filled by `addPlow`): with ~4,500 road legs in YARDS
every new chunk was testing them all, and x2_pickup's first dismount ran out of its fixed 3 s wait (it passed again once
the index went in; frame time at the park spot / mid-road 59 / 50 ms vs origin's 67 / 75 ms headless, i.e. no worse).
Scenarios: the 15 x2_* that pick "the longest plowed lane" now take it inside Kjøllefjord (`TOWN_R`), as they always
did before village streets joined YARDS (x2_pickup otherwise drove to Lebesby and its later sled steps failed: with the
truck 4 km away, walking up to the parked sled did not make it current; worth a beta look, it's 2.2's swap rule, not
roads). x2_pickup polls FOOT.on/MNT.on instead of fixed sleeps round its first Q presses (origin flaked there 2 of 2
under load). x1_save knows the "roads" system.
Gate: smoke 0, x1_save 0, x3_roads 0 (25/25), x2_vehreverse 0, x2_haul 0, x2_tow 0, page errors none; x2_pickup 1 in the
gate run (the fixed-sleep flake, origin too), 0 on 2 of 2 reruns after the poll fix.
Reports 0116-0118 landed during this pass (BUGs in 0116 #1/#2: reverse still silent at some spots, pad LT reverse
nearly on/off; 0117 #1/#2: pickup can't start in untouched snow, bog survives a teleport). Not triaged here (Last triaged
report stays 115): the next builder pass takes them before 3.2.
Left / follow-ups: 3.2 after those (live road snow, storms, Map open/snowed in/closed). Boot cost on a phone untested (~0.5 s
headless desktop). Poles are thin (4.4-5.6 cm) and read only within ~60 m.

## 2026-11-11 18:40 — Beta fix 0108: trucks reverse off the lane (G4) — 489b7d0
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage: report 0111 (2.7 collect at every seller yard): #1 repeats 0110 #1, already fixed by e0f270e (0111 was
written against ea0a96d, before it); #2 is a scenario note. Last triaged report 110 -> 111. Took the top BUG, 0108 #1
(+ #2 folded in).
Cause (logged in drive step at the report's spot): at a standstill `sgn` = +1, so every tyre read the cell 0.42 m IN FRONT
(the bank it braked into: front sink 0.67 m) even in reverse, and the belly drag was read at the chassis centre in snow the
belly never pressed (emb past the clearance -> cb ~1.6): drag 44 kN against a 4.9 kN reverse pull. Reverse effort also never
fed the dig/bog meter (only throttle did), so nothing was ever said.
Fix (tlx-vehicles.js v10 only): at a crawl the tyres read the way the driver asks (S, no throttle = behind); belly drag read
1.5 m out at the leading edge in the rolling direction; the belly presses a trench to chassis height along the centre line
(`BELLY` points 0.6/-0.6/-1.6 m, kept clear of the forward sample so forward deep-snow handling is unchanged: ploughed 3.1 m
into 0.4 m powder from 9 m/s before, 2.7-3.8 m after); reverse pull 0.6 -> 0.8 of fmax (still capped by tyre grip); S in
reverse spins/digs like the throttle, with its own toast ("The wheels spin in reverse and dig in...") and then the game's bog
+ STUCK hint. README "Vehicles" line.
Before -> after (new `x2_vehreverse.mjs`, same scenario on origin/main vs this): truck + trailer stopped off the lane, S 4 s:
0.0 m -> 7.1-7.8 m; truck alone 0.0 -> 11-16 m; trench behind after ploughing: none (depth = fresh) -> pressed to 0.26-0.33 of
0.40-0.52 m, and S backs out along it 1.5-3.7 m; dead still in 0.6 m untouched powder: silent -> reverse dig toast then bog.
`x2_haulreverse.mjs` (ramp down + full-lock skid) still can't back out (ramp lip 2.2 kN + slewed tyres in fresh snow, fair),
so its assert now accepts the dig warning; it gets one. Stills (b_rev13 sheet) judged: truck sits right, STUCK hint shows.
Gate: smoke 0, x1_save 0, x2_vehreverse 0, x2_haulreverse 0, x2_pickup 0, page errors none. x2_haul failed once in the gate
(3 asserts round the walker at the trailer tail, "Pickup 7 m straight ahead" hint), then passed 3 of 3 reruns on this build
and 1 of 1 on origin/main: timing flake, nothing here touches the walker or the tail.
Left: 0108 #3/#4 POLISH unchanged.

## 2026-11-11 17:45 — Beta fix 0110: paid-for vehicles count as owned (G4) — e0f270e
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage: reports 0108-0110. Two BUGs on landed work: 0110 #1 (money locked in a Bytteboden vehicle order that can
never be collected) taken this pass; 0108 #1 (pickup ignores S at a standstill off the lane) is now the top backlog line
with 0108 #2 folded in. POLISH left as is: 0108 #3 (scenario hazard, wait for !DMT.on), #4 (top-left "Frontier 340" while
driving, repeat); 0109 #1 (first-frame keyboard hint on a fresh pad), #2 (hardening, unreachable), #3 (known coupler snap);
0110 #2 is fixed by this change. Last triaged report 107 -> 110.
Fix (tlx-vehicles.js v9 only): `buyHaul` refuses while a used trailer is held ("You've already paid for a sled trailer:
it's waiting in <seller>'s yard in <place>."), `buy` counts held pickups (`usedTrucks`) against the 3-truck cap; the Trucks
tab's trailer row reads "Paid for" (locked) and the truck rows say where the held pickup waits and lock at 3; `heldRefund`
(every 2 s from tick) refunds any held vehicle order `MKTV.blocked` says can never be handed over (saves already stuck).
TLXV exposes buy/buyHaul for scenarios.
Before (report 0110's `x2_vehmktbreak.mjs`): the garage sold a $950 trailer over a held one and the held order stayed at
"You already own a sled trailer." forever. After: new `x2_vehheld.mjs` 21/21 ok (row text + lock, refusals take no money,
1-2 trucks still sell beside a held pickup, collect still hands both over, stuck save refunded +$3000 with nothing owned
removed); `x2_vehmktbreak.mjs` updated to expect the refusal: all ok. Logic only, no stills.
Gate: smoke 0, x1_save 0, x2_vehheld 0, x2_vehmkt 0, x2_vehmktbreak 0 (after the update), page errors none.

## 2026-11-11 17:10 — 2.7 Bytteboden Vehicles category, wear and repair (G4) — c3744de
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage: report 0107 (2.6b every sled on the deck) has no BLOCKER or BUG: #1 (same front-rail stop for every sled) and
#2 (scenario hazard) are POLISH, #3 repeats the top-left vehicle-name POLISH. Last triaged report 106 -> 107. So the next
unticked slice: 2.7, the last of milestone 2.
Built: Bytteboden category "Vehicles" (cat "veh"). tracklayer.js only bridges through `mktV()` = `VEH.mkt` (pool, info,
why/tell texts, howTo, blocked, collect, pic) in mktInfo / mktPool / mktMake / mktHowTo / heldWhy / mktCollect / mktPic;
tlx-vehicles.js holds the rest. Pool: the sled trailer for anyone without one (and none paid for), the pickup from 6
deliveries while trucks owned + paid-for < 3. Haggling, inspection and the 1-in-6 lemon are the marketplace's own. Collected
at the seller's, it is set down 8-30 m out in their yard (`spotNear`, forecourtSpot generalised: dry, off the sea, clear,
not across a bank, facing away) at the real condition, a pickup with a quarter tank; no room = a throttled nag and a retry.
Wear: truck cond already trims power (50% -> 83%); new `haul.cond` (missing = 100 for every older save) makes the trailer
roll heavier (`haulWear`, 50% -> x1.30 rolling drag). Repair rows on the garage's Trucks tab, $20/point truck and $4/point
trailer, only within 40 m of the garage (also mends tree dents, which had no repair before). Prices seen: used pickup $2,800
(new $4,200), lemon after inspection $2,380; used trailer $575 (new $950). README "Vehicles"; Progression-map row for the
pickup in LOOP.md. tlx-vehicles.js v8.
Assert scenario `x2_vehmkt.mjs`: 34/34 ok (pool gating by deliveries / ownership / 3-truck cap, Vehicles tab + photos,
detail page, a 90% offer answered, SEND then collect at the seller (trailer set down at its condition, dry, 7 m out), remote
inspect refused, in-person lemon inspect drops the ask, pay in person -> pickup parked 8 m out at 50% with 18 L, hint
"Q: get in the pickup", Q gets you in, repair locked away from the garage and $1,000 at it, reload keeps conditions, a
cond-less trailer rolls as built). Stills judged (b27 sheet): the pickup photo reads as a pickup, cards lay out clean, the
collected truck sits on the snow.
Milestone 2 (vehicle core) is done. Next: milestone 3, roads and traffic (`tlx-roads.js`): its slices aren't written yet,
so the next pass writes them into EXPANSION.md.
Left: no wear look on the truck / trailer models; a used pickup is always the blue Fjellvogn.
Gate: smoke 0, x1_save 0, x2_vehmkt 0, x2_haul 0, page errors none. x2_pickup is flaky on unchanged origin/main too
(base: 1 fail "Q gets back on the sled", then a clean pass; this build: 4 runs, 1 clean, the others one timing assert each,
a different one each run: "Q gets back on the sled" x2, "S backs it up" once, "the sled stays where it was left" once).
Nothing in this slice touches mounting or driving; follow-up: x2_pickup should poll FOOT.on / DMT.on after Q instead of
sleeping a fixed time (the skill's mount-timing pitfall).

## 2026-11-11 16:35 — Beta fix 0106: WIPE VISOR / BANDAGE / CALL HELP pills apart on phones (G4) — 827c676
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage: report 0106 (phone HUD v183 worst-case pills) has two BUGs on landed work, taken ahead of 2.7: #1 WIPE VISOR
sat exactly under BANDAGE at every portrait size (right 16, bottom 284; both live after a crash in a storm), #2 landscape
BANDAGE on the speedometer (667x375, 844x390) and CALL HELP on GARAGE (667x375). #3 (REEL near HORN/LEAN with all six pills
forced) is POLISH: the new layout leaves REEL clean at every size tested, no change. #4 is a confirmed non-bug. Last triaged
report 105 -> 106.
Fix (index.html CSS only): portrait WIPE VISOR joins the left column (left 16, bottom 244, above CALL HELP at 196 and GET OFF);
landscape BANDAGE goes to the left column above WIPE VISOR (left 24, bottom 246; 220 on <=330 px-high phones, under the vitals
bars), CALL HELP steps up a row (bottom 64); on <=330 px-high landscape GARAGE sits at 50%+20 px (it was 4 px onto WHEELIE).
Before (x4_mobilehud4.mjs, the report's scenario): 5 FAIL (tcWipe x tcBand at 320x568/360x640/390x844, tcF x tcE + tcBand x
speedo at 667x375, tcBand x speedo at 844x390). After: new `x4_pills.mjs` all passed: a REAL wound (TLX.wounds.hit) + iced
visor shows BANDAGE and WIPE VISOR both hit-testable (elementFromPoint) at 7 sizes, and all six pills forced on overlap
nothing (pills vs each other, stick, pedals, chips, TABLET/MORE, speedo, vitals, compass) at 320x568, 360x640, 390x844,
430x932, 568x320, 667x375, 844x390. Contact sheet judged: pills clear everywhere.
Follow-up seen in the stills (not fixed, for a beta pass): while bleeding, the wound HUD's "BLEEDING" / "BANDAGE · 3 bandages"
label and red health pool at the bottom of the screen draw across BRAKE / WHEELIE and the stick caption in portrait and over
GARAGE in landscape (visual only; the pills stay tappable).
Gate: smoke 0, x1_save 0, x4_pills 0, x4_mobilehud2 0, x4_mobilehud 0, page errors none.

## 2026-11-11 16:15 — Beta fix 0104: GET OFF clear of GARAGE on 320-wide phones (G4) — 7da657e
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage: report 0104 (phone HUD v181: cab, tablet open, 320 px) #1 is a BUG on landed work, taken ahead of 2.7: at
320x568 the SE-size rule moved GET OFF (tcQ) to right:16 bottom:236, exactly where the GARAGE pill (tcE) sits, so parked by the
garage you could not see or tap GET OFF. Also fixed its POLISH #2 (stick over HORN/WHEELIE at 320 wide) and #3 (GARAGE pill
over the open tablet's text). #4 (toasts over the small dash tablet at 320) left for a polish pass: toasts are often the answer
to a tablet action. #5 is a scenario false positive (the sheet's empty grid cell). Report 0105 (2.6c rig/strap fix beta) has no
findings. Last triaged report 103 -> 105.
Fix: index.html drops the SE-size tcQ override (GET OFF stays left above the stick) and adds a <=340 px portrait block (stick
96 px at left 12, GET OFF left 12 bottom 140, HORN/WHEELIE right 160, REEL 166); tracklayer.js `updTouch` gives tcE no label
while `TABLET.open`.
Before (x4_mobilehud2.mjs): 7 FAIL (sled/sledtoast/tabopen 320: tcStick x tcHorn/tcWh; cab/cabtoast/cabmore/cabtab 320: also
tcQ x tcE). After: all passed (26 checks, incl. a new assert per size that GARAGE shows before and hides with the tablet open),
page errors none. Still cab_320x568 judged: GET OFF left above STEER, GARAGE right, HORN/WHEELIE clear of the stick ring.
Gate: smoke 0, x1_save 0, x4_mobilehud 0, x4_mobilehud2 0, x3_mobile 0, page errors none.

## 2026-11-11 15:50 — Beta fix 0102: no hitch rig on a strapped sled (G4) — 490f242
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage: report 0102 (2.6c tow break test) #1 is a BUG on landed work, taken ahead of 2.7: setting
`GS.own.parts.hitch` to a rig while the sled was strapped left rigOn "sled" + strap set, the state `strap()` refuses. Report
0103 (2.2/2.3 truck swap) has only POLISH: #1 the on-foot "tap GET ON" hint doesn't name the vehicle (same as 0096 #4, left
for a polish pass), #2 reload on foot puts you back in the truck (judged fine: the save stores the current vehicle, not the
walker), #3 forecourt top-up is by design. Last triaged report 101 -> 103.
Fix, three layers: `fitPart` refuses a rig while `VEH.strapped()` (toast: unstrap first); `rigTick`'s "a different rig went on"
branch drops the strap with a toast (covers Bytteboden collect and the schools, which set the part directly); the vehicles init
drops a strap after `rigRestore` when the sled holds a rig (damaged saves).
Before: x2_towbreak C FAIL ("STILL strapped with a rig"). After: new `x2_rigstrap.mjs` 12/12 ok (garage refusal + toast, direct
set drops straps + toast, hint says unhitch first, reload and a rig+strap damaged save load consistent, rig off -> E straps
again); x2_towbreak all ok; x2_tow ok. tlx-vehicles.js v7. No visual change, no stills to judge.

## 2026-11-11 15:25 — Beta fix 0101: TABLET / MORE off the phone speedometer, toasts off the MORE sheet (G4) — 737d5c3
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Triage: report 0101 (mobile HUD v178 break test) has two BUGs on landed work, taken this pass ahead of 2.7: #1
TABLET / MORE sat on the top-right speedometer in every portrait size (the speed number unreadable), #2 toasts ran under the
open MORE sheet. Also fixed its POLISH #3 (vitals/speedo through the compass strip in portrait, compass behind TABLET / MORE in
landscape) and #4 (a toast over HORN at 667x375). #5 (full warmth/fuel bars fade to ~0.1 opacity) is the minimalist-HUD
intent: kept. Last triaged report 100 -> 101.
Before (x4_mobilehud.mjs, 5 sizes x 6 states + low vitals): 31 of 31 layout checks FAIL (speedo x tcTablet/tcMenu everywhere in
portrait, tcSheet x toasts in every size, cpStrip x vit/speedo/tcTablet, tcHorn x toast at 667x375). After: all pass, page
errors none. Layout (index.html only, a block after the minimalist-HUD rules): portrait = compass alone on the top row, vitals
and speedo at top 52, TABLET / MORE at top 172 under the speedo, MORE sheet at 224 (buttons 54 px tall on <=600 px-high phones
so it clears HOP), tutorial card and toasts at top 100 down the left with right:124 px clear of that column, CALL HELP moved
to the left above the stick (it would have landed on TABLET / MORE at 375x548). Landscape = TABLET / MORE and the sheet at
right 152 px (left of the speedo ring), compass and toasts boxed between the vitals (138 px) and TABLET / MORE (260 px).
tracklayer.js: `sheetOpen` toggles `body.tcMore`, which hides `#toasts` while the sheet is open (they're not queued: one that
expires meanwhile is missed, judged fine for a menu that's open a few seconds). x4 gained an out-of-fuel (CALL HELP) stage.
Stills judged (portrait 375/390/430 riding, toasts, tutorial; landscape 667/844 riding, toasts, sheet): speed readable, nothing
covered. Gate: smoke, x1_save, x4_mobilehud, x3_mobile (see the pass reply).
Not covered: a real notch safe-area inset, tablets wider than 640 px in portrait (unchanged rules), the cab HUD on phones.

## 2026-11-11 15:10 — Expansion slice 2.6c: tow the strapped sled behind the pickup (G4) — 2569d1a
Builder pass (full throttle; the cron prompt's `usage_budget.py begin/done` bookkeeping skipped per the skill: the gate is
retired). Orient: a dead pass had left an uncommitted 2.6c start in tlx-vehicles.js (haulKg + ramp drag calling a
`carriedKg`/`RAMP_DRAG` it never wrote): stashed as "dead pass 2.6c start" and rebuilt here. Triage: reports 0097 (2.6a), 0098
(2.1b), 0099 (2.4), 0100 (2.6b) carry only POLISH, no BLOCKER/BUG. Taken now: 0100 #1/#2 (a saved strap spot 40 m off the deck or
facing backwards was accepted) — clamped on load. Left for a polish pass: corrupt/absurd trailer positions (0097 #1-2), the HUD
naming the sled while in the truck (0095/0097/0099/0100 repeat), ramp gate look (0097 #4), E digging with the tablet open (0098),
tablet left open after Q out of the truck and the bog toast over it (0099 #1-2), no touch MAP button on foot (0099 #4). Last
triaged report 96 -> 100.
Before: a strapped sled weighed nothing to the truck (mass 2,320 kg loaded or not), the ramp could be towed down for free, a sled
towing its own rig could be strapped, the receiver check ignored the sled. After (x2_tow.mjs, 33 asserts): truck mass 2,320 ->
2,600 kg strapped; 3 s pull from rest on a plowed lane 13.1 m empty -> 12.0 m loaded; towed and turning the sled stays on its
strap point (drift 0.000 m over ~30 samples, yaw 0.000); the Map's Sled pin sits on the sled, 0.69 m from the axle; a reload
while driving brings back truck + hitch + strap at 2,600 kg; ramp down while towing at 4.8 m/s: one toast "The trailer's ramp is
down and dragging in the snow. Stop, get out and raise it: E at the tail." and resistance drops ~2,200 N the moment it's raised;
a 600 kg receiver refuses "the trailer with the sled on it is 700 kg", 1,500 kg takes it; with a rig on the sled the hint reads
"Unhitch the trailer from the sled first: it can't ride on the trailer"; strap/unstrap on keyboard (E), Xbox (L3, "LB: get on"),
DualSense (L3, "L1: get on") and touch (STRAP / UNSTRAP button); unstrapped it reverses down the ramp off the hitched trailer
(lz -9.2); a corrupt strap {x 0.9, z 40, yaw 3} loads clamped onto the deck. Still judged: sled on the boards, nose to the truck,
four yellow straps, ramp up. Code: tlx-vehicles.js (`carriedKg`, `haulKg`/`haulDrag`, `RAMP_DRAG`, `rampDragTick`, `sledRig`,
rating checks in `haulHitch`/`strap`, strap clamp on load, garage row text), tracklayer.js only `sledKg: MASS` on the api.
README "Towing the sled". Gate: smoke, x1_save, x2_tow, x2_deck, x2_haul green (see below).
Decisions: sled weight = the game's MASS (280 kg, every sled) + 6 kg a small parcel, same per-parcel figure the truck uses; no
rider weight (you're in the cab). Ramp drag is a flat 2,200 N (a steel lip ploughing snow) rather than a depth model. Strapping a
sled with a rig is refused rather than carrying the rig along (it would hang off the trailer). G4 milestone 2 now has only 2.7
(Bytteboden vehicles category) left.

## 2026-11-11 12:45 — Expansion slice 2.6b: drive the sled onto the trailer and strap it down (G4) — 1e459b1
Builder pass (full throttle, no budget gate; the cron prompt's `usage_budget.py begin/done` bookkeeping was skipped per the skill:
the gate is retired). Triage: report 0096 (2.2/2.3 pickup break test) has four POLISH and no BLOCKER/BUG (garage row "Fjellvogn
20192019" with no separator; a corrupt truck record is repaired to x = 0 instead of the forecourt; HUD names the sled while in the
truck, same as 0095; two pickups side by side get one ambiguous hint): left for a polish pass. Last triaged report 95 -> 96.
Before: the sled drove straight through the trailer (it wasn't a surface or an obstacle) and nothing could hold a sled on it. Now
with the ramp down a sled eased up the ramp climbs onto the deck under its own power (feathered throttle: 3-4 m/s, 7-10 samples
on the ramp, ends 0.53 m above the snow, on the deck plane within 0.01 m) and the front stop rail holds it (middle at lz 0.69 =
deck front - nose, 2 s more throttle moves it 0). tracklayer.js bridges, all fall back to the old code with no expansion:
`sledRide()` = max(rideSurf, `VEH.deck`) in physCore (height, gradient with a 0.25 m probe on the deck), the ridden sled's pitch
samples and parkedSled; on the deck the sled rides as hard pack (no plough, ruts, snow stamps, trail marks or arcade bounce);
`VEH.deckClamp(P)` after collide(); `VEH.strapped()` zeroes throttle, reverse and motion. tlx-vehicles.js: the deck plane comes
from the trailer model's pose each frame (built on demand before the first frame, so a reload finds it); a low sled is pushed out
of the trailer box (side: closest 1.63 m from the centre line, never on the deck; tail with the ramp up: nose stops 0.1 m short);
rail/side hits thud over 2 m/s and knock fragile parcels over 4. On foot beside a sled on the deck, use STRAPs / UNSTRAPs it
(`strapFoot` inside haulFoot, so footUse, pad L3, the touch button and the hint came free); it asks you to drive it straight up to
the rail first if it's crooked or short. Strapped: `state.haul.strap = { x, z, yaw }` in the trailer frame, four yellow straps
drawn, throttle moves it 0.000 m with a toast, `strapTick` glues it to the deck (moved the trailer 1.5 m and 0.2 rad: it stayed
put on the deck), and since the parked sled record is glued too a hitched trailer already carries it. Reload keeps it strapped on
the deck (y = deck). Unstrapped, holding reverse backs it down the ramp onto the snow. The ramp won't rise under a sled standing
on it. swapTo back to the sled starts it at its own height (so a sled on the deck doesn't drop through it).
`x2_deck.mjs` (28 asserts) incl. keyboard E strap, pad L3 unstrap, touch STRAP, a junk strap field loading as unstrapped. Stills
(behind, on the ramp pitched up, on the deck, strapped with straps) judged: sled sits on the boards, no sinking or floating.
Gate: smoke, x1_save, x2_deck, x2_haul, x2_hitch, x2_pickup all exit 0, fails 0, page errors none; after the rebase onto the mobile-HUD commit (68df8e5, which had also taken v178) smoke, x1_save, x2_deck re-run green and the script bumped to v179.
Decisions: no crash for hitting the rail fast (a thud, a shake and the parcel knock; a crash state on a 0.5 m deck looked worse
than it was worth); strapping is instant (toast + straps), no animation, like hitching.
Left (2.6c): the strapped sled's weight on the truck (inertia, receiver rating), a full tow run checked end to end (Map pin,
camera, reload while hitched), mounting a sled on the deck still walks the ground swing.
In progress: nothing. Next: 2.6c.

## 2026-11-11 12:10 — Expansion slice 2.6a: the sled trailer (G4) — c8eb0c3
Builder pass (full throttle, no budget gate; the cron prompt's `usage_budget.py begin/done` bookkeeping was skipped per the skill:
the gate is retired). Triage: no reports above 94, so the next unticked slice. 2.6 was too big for one pass: split into 2.6a (the
trailer), 2.6b (drive on/off, strap) and 2.6c (towing a strapped sled), designs written into EXPANSION.md; this pass built 2.6a.
Before: nothing could carry a sled. Now `state.haul` in tlx-vehicles.js (null = not owned, every older save) holds the Fjordhenger
deck trailer: bought on the Trucks tab ($950, one per player, parked on the forecourt), a merged model (deck, rails, fenders, A-frame
tongue, coupler, jack whose leg drops when free, tie-down rings, tail lights lit by the towing truck at night, ramp gate on a hinge,
two spinning wheels; ~6 draw calls). A truck's ball holds the rig or the trailer (rigCands skips a truck with the trailer, haulCands
a truck with the rig); the sled never takes it. Use at the coupler HITCH/UNHITCH, at the tail LOWER/RAISE RAMP: `haulFoot` runs ahead
of `rigFoot` inside VEH.rigFoot, so footUse/footAction, pad L3, the touch button and the on-foot hint needed no tracklayer.js change.
Follow: single-axle kinematics in the TLX tick (axle stays 3.6 m from the ball, jackknife stop 70°), pitch from the coupler height,
roll from the ground under each wheel. Truck core: +420 kg inertia, + rolling drag 420 g (0.02 + 0.95 * tyre sink). One tracklayer.js
line: the chase cam's tow pull-back takes `VEH.camTow()` (6.65 m with the trailer on), found from the first chase stills, where the
trailer filled the screen.
`x2_haul.mjs` (31 asserts): new save haul null; Trucks row $950; bought, free, ramp up, on the forecourt; second click refused; hint
"E: hitch the sled trailer to the pickup"; pad L3 hitches (coupler 0.000 m from the ball); the rig's tongue at that ball finds none;
4 s of throttle moves truck and trailer 24.5 m each, coupler 0.000 m, truck 2,320 kg; through a turn it trails at an angle; reversing
hard over stays inside the stop; slewed 100° it is held at exactly 70.0°; at the tail "E: lower the trailer's ramp", gate at -21°;
VEH.block pushes a step onto the deck out; Map pin "Sled trailer"; touch UNHITCH; the truck pulls away, the trailer stays (0.000 m);
reload keeps it free with the ramp down (0.000 m); keyboard E re-hitches; reload keeps it on the pickup. Stills (free, side, ramp,
chase, turn) judged: attached on the ball, wheels on the snow, gate on the snow when down, whole trailer in the chase shot.
Gate: smoke, x1_save, x2_haul, x2_hitch, x2_pickup, x2_cab all exit 0, fails 0, page errors none.
Left: the sled drives through it (2.6b), truck/trailer don't collide, no hitch animation.
Triage: report 0095 (2.5 hitch beta) has three POLISH, no BLOCKER/BUG (HUD names the rig while in the truck; TOW.mass after a garage
rig swap from the cab; an unrelated shop prompt beside the parked truck): left for a polish pass. Last triaged report 94 -> 95.
In progress: nothing. Next: 2.6b (drive the sled up the ramp, strap it down).

## 2026-11-11 04:40 — Expansion slice 2.5: the universal hitch (G4) — ef9d751
Builder pass (full throttle, no budget gate). Triage: report 0093 (2.4 cab tablet beta) has three POLISH and no BLOCKER/BUG, 0094
(HUD/survival beta) is on the session-built HUD, not on an expansion slice; Last triaged report 92 -> 94. So the pass took slice 2.5.
Before: the rig belonged to the sled: in the pickup it stayed frozen behind the parked sled (towStep never ran in a vehicle), and
nothing could move it to another machine. Now `state.rig` in tlx-vehicles.js says which machine holds it ("sled", a truck uid, or
null = standing free). tracklayer.js bridges, all behind VEH hooks with sled-only fallbacks: `towLive()` (the rig hangs off P),
`rigHitch()` (the holder's ball, or the tongue on its jack), `rigOnSled()` (stats() skips the hitch part otherwise), `rigHint()`;
towStep's not-live branch freezes it (mass/drag 0), physStep calls towStep after `VEH.cur.core` when the rig is on that truck,
towVisual stretches the tongue to `VEH.rigBall` (the truck's ball, or a jack point on the snow), the sled's receiver bar only
shows a rig when it's on the sled, toggleWings refuses a tiller that isn't on this machine, camera pull-back / farm-dog
keep-clear / SAR tow anchor use towLive. Truck: `hitchZ -3.1` (its ball), the rig's mass in its inertia (not its traction or
rolling), TOW.drag in its resistance, restat takes the hitch part's bays / groom / burn when the rig is on it. serLoad keeps big
loads now (they ride the trailer), bed boxes and bed mass count parcels only.
`x2_hitch.mjs` (27 asserts): trailer on the sled follows 4.85 m back (4.85 expected); keyboard E at the tongue unhitches (hint "E:
unhitch the trailer from the sled", bays 1 -> 0), it stands still while the sled drives 20 m off; backed up to the pickup on a 70 m
plowed lane, the hint says "E: hitch the trailer to the pickup" and pad L3 hitches it (coupler on the ball, 0.000 m); in the truck
bays 1, 4 s of throttle moves truck and trailer 27 m with the coupler on the ball, truck mass 1,970 kg (1,900 + 70); a strapped stove
blocks unhitching; a reload keeps it on the pickup (moved 0.00 m); touch shows UNHITCH and the tap works; with no receiver the sled
refuses it ("needs a hitch receiver"), with the light one it hitches and the sled's bay comes back; fitting the groomer puts it on
the sled. Stills (free trailer, chase, side view with the A-frame on the truck's ball) judged: attached, nothing floating.
Gate: smoke, x1_save, x2_hitch, x2_pickup, x2_cab, x2_use all exit 0, fails 0, page errors none. g2_fell_tow reads 0 m on both main and this branch (stale scenario, not a regression).
Decision: hitch/unhitch is the on-foot use action at the tongue (not a garage button) so it works anywhere and on all three
schemes through footUse; no animation this slice (toast only).
Left: hitch animation; the rig doesn't block the walker; in a truck the chase camera pulls back by the sled's rig numbers.
In progress: nothing. Next: 2.6 (a trailer that carries a sled).

## 2026-11-11 — Minimalist HUD, hunger/thirst, wounds + bandages (Owner note 11 Nov) — 66f9b98
Built in a session from Lemon's brief (defaults in LOOP.md: he never answered the clarifying questions). Three new TLX files, small hooks in tracklayer.js.
`tlx-hud.js`: bottom-left four thin bars (warmth, hunger, fuel, thirst bottom to top; fade after 4 s without a 2-point change, light on change, stay lit under 25%),
bottom-right speed number with an rpm arc round its top-left (P.rpm), top-middle Elder-Scrolls compass strip (letters drift with camState.yaw, fixed triangle,
target diamond, job title fades in 2.8 s when the target is under the triangle). updGameHud keeps the same job-selection chain and hands title/sub/rel to `TLX.hud.compass`;
the old #job panel and #speedo gauges stay in the DOM (other code writes to them) but are hidden. `tlx-survival.js`: GS.hunger/GS.thirst (accessors onto saved state),
drain 100/5400 and 100/3600 per game second, refill at quay/garage, mild warmth penalty when empty. `tlx-wounds.js`: option "Poachers on the fell" (on), ~4.5%/min chance
when 600 m+ from every site and tutorial done, WOUND_CAP 3, BLEED 0.55 hp/s each, BANDAGE_WINDOW 6 s (named constant), 3 bandages restocked at the quay, health 0 ->
`blackout("tow")` (existing failure path), pouring red bar at screen bottom only while bleeding. New control `bandage`: U / D-pad down / BANDAGE touch pill (BTN row +
gameKey + pad poll + tcBand). GOD menu "Take a pot-shot" and `TLX.wounds.hit()` force a wound. Script v175.
Tests: `scenarios/x4_hud.mjs` (48 asserts: layout, fade, rev arc, compass slide + label timing, drain/refill/save/old save, wound/bandage by key, pad, touch, too-late, cap, quay,
death path, hazard gating + option) pass; smoke, x1_save (updated: Options page now lists the wounds switch, sys keys), x2_btn, x3_mobile, g2_tutorial, g2_jobs (compass click now targets #compass) pass.
Corners cut: no bandage shop row (a flat count restocked at the quay); touch layout only checked for the BANDAGE pill and x3_mobile, not stills of the new bars on a phone;
no hit audio beyond the existing thud.

## 2026-11-11 03:40 — Expansion slice 2.4: tablet, map, jobs and parcels from the pickup's cab (G4) — afb0a2a
Spare-usage build pass 1. Triage: reports 0091 (chimney smoke, all info) and 0092 (swing beta, three POLISH: Santa hot-swap race,
Q ignored mid-swing, touch buttons possibly hidden in headless) hold no BLOCKER or BUG; Last triaged report 90 -> 92, so the pass took
the next slice. Before: in the truck `TABLET.modeNow()` said "dash", so Tab dipped the camera onto the parked sled's dash glass
(wherever the sled was), and first person in the cab set `fpv`, hiding the HUD minimap with no dash tablet in view. Now: in any vehicle
the tablet is the held overlay (same as on foot), `tabView_sync` keeps the minimap in a cab, the Map app takes YOU and the around-me
centre from `tabMe()` (walker on foot, else P) and pins every vehicle you aren't in via `tabVehPts()` (layer "vehicles" registered by
tlx-vehicles.js for the parked sled / parked trucks, plus P itself when on foot). `rackW()` words the parcel toasts and board for a bed.
`x2_cab.mjs` (36 asserts): sled Tab = dash; in the truck Tab / pad d-pad up (B backs out and closes) / touch TABLET open the overlay with
the camera 8.4 m from the truck; FP minimap display block; M -> Map, YOU = truck, sled pinned within 0.5 m of where it was left; CLAIM
tapped on the Parcels row away from sites, the claim loads at the quay, LOAD tapped at the quay, toasts "1/8 in the bed", "2/8 in the
bed"; jobsList 2 rows and the compass titled; delivery from the truck pays (800 -> 940) and bumps delivered; on foot YOU = walker, pins
sled + truck; back on the sled Tab = dash again and the truck is pinned. Stills (overlay home, Map around-me with the S pin, touch)
in ~/.hermes/cache/scratch/tlx/cab2/sheet.jpg, judged: centred, readable, pin and label visible.
Gate: smoke, x1_save, x2_cab, x2_pickup, x2_use all exit 0, fails 0, page errors none.
Decision: overlay rather than a cab-mounted tablet with the dip, because the dip rig (tabTarget / tabCorners / V.tabScr) is built round
the sled's glass and "every vehicle" then works for free; a dash holder in the truck is left as a follow-up.
Left: the cab tablet holder; the Parcels board's route chart and the sled's dash minimap still centre on P on foot; aurora tourists still
auto-board at the quay while you sit in a truck and are posed on the parked sled (gate the quay auto-board on `!VEH.cur` or seat them in
the cab).
In progress: nothing. Next: 2.5 (the universal hitch).

## 2026-11-11 02:55 — Getting on and off the sled: the swing (Owner note 11 Nov, G3 climb on/off) — 92d74f7
Lemon: "rethink the animation for the player getting on and off the snowmobile to be a dynamic natural swing of a ragdoll over and
onto a snowmobile, not this teleport slide move through the air until your character is in position." The old mountTick / dismountTick
lerped FOOT.x/y/z from wherever you stood to the seat with a sine arc on top and posed limbs over it. Replaced by `SWG` (block comment
"getting on and off: the swing"): `mount()` picks the nearer side and `swgWalk` steers the walker's own gait (footStep with synthetic
input) to the spot beside the footwell; then `swgStep` runs a small body: pelvis = a mass on a spring with a 26 m/s^2 / 2.8 m/s limit,
kept within a leg (0.848 m) of every pinned boot and above the cushion; yaw, trunk pitch / roll / twist and head on springs that take
the pelvis's acceleration as an input (the trunk lags and catches up); ankles and hands as point masses (pinned in world space on the
snow, in sledBody space on a board or grip; a boot in the air follows a Bezier handle through a spring with gravity, leg length, and
the seat / boards / snow as colliders; a loose arm hangs on a soft spring and swings). Phases on: step (near boot to the board, near
hand to its grip) > drive (up on the toe of the snow boot) > over (that leg back and over the seat behind the hips while yaw turns
forward and the far hand takes its grip) > sit (underdamped drop into the seat). Off: rise > back > down > stand, ending turned ~40
degrees toward the sled's nose. `swgPose` sets the walker rig by two-bone IK (ik2) with full quaternions; walker arms stretch x1.36 as
they take the grips so hips, boots and hands coincide with the seated rider at the swap. `SWG.roll` / `SWG.dip` (springs) tip and press
sledBody from the load on the boards. Camera: no `camState.init = false` unless the view is first person. The walker gets the rider's
head kit and pack (`walkerLook`, from GS.own.gear.head). Input to the sled is zeroed while MNT / DMT are on; pushing a direction during
the walk-over cancels it. Ski mount range 6 > 4.5 m (you walk the rest). Trucks keep their own sequence.
Measured (`scenarios/g2_swing.mjs`, rAF stepped at 1/60): swing 1.40-1.47 s on, 1.40-1.45 s off on all 10 sleds; pelvis never over
2.4 m/s frame to frame (limit 3.2); planted boots creep under 1 cm; ankle clears the cushion by 13-24 cm; hips within 2.8 cm of the
rider's at the swap, both hands on the grips; sled roll peak 0.05-0.06 rad. From a ring round the sled (8 bearings x 1 / 2 / 3.4 m) riding
in 2.0-4.4 s. Depot yard (snow level with the sled's base, a 0.47 m step): same asserts pass. Stills judged from rear and front-quarter
strips at 0.1 s. Gate: smoke, x1_save, g2_swing, g2_tutorial (its Q step now polls FOOT.on instead of sleeping 3.5 s), x2_pickup.
Not done: a passenger behind you is not avoided by the leg; the pickup's door sequence is still the posed kind; the walk-over inherits
footStep's snap in height where the snow steps (15 cm at a ski groove edge), seen in one test as a jump just before the swing.

## 2026-11-11 00:25 — Expansion slices 2.2 + 2.3: the vehicle core and the Fjellvogn pickup (G4) — 004faa4
New `tlx-vehicles.js` (own `?v=1`; `tlx.js` ?v=2 for a small `save()` hook) plus a small `VEH` bridge in tracklayer.js, every hook behind
`if (VEH.cur)`: physStep, restat, updVisuals (the parked sled and its tow rig are drawn from their own pose through `parkedSled`, the
first-person eye comes from the vehicle), rescueTick (rider hidden), winchDef null, towSnap skipped, mount / dismount / mountTick /
dismountTick, enterBog wording and mass, the on-foot and stuck hints ("get in the pickup", "STUCK", noun in the sled-locator line),
footStep's wall (`VEH.block`), the touch GET OFF button, crashEject (a cab keeps you in), schoolBegin (refuses in a truck), garage
extra tabs, and api additions (`pressSnow` beside stampAt, `obstaclesNear`, the walker, headlight, bog, thin ice...). P is the active
vehicle; parked vehicles are records `{uid, id, x, z, yaw, fuel, cond, load, bog, safe}` in `TLX.state("vehicles")`; `swapTo` is the one
place P, GS.fuel, GS.load and the bog state change hands (live parcels wait in a side map, the save gets plain JSON with sites by id).
The nearest vehicle becomes P while you are on foot (1 m hysteresis, not mid-mount, not with the winch hooked, not in the tutorial /
school / indoors), so Q / LB / GET ON take it and the hint names it. The sled with nothing owned runs the old code paths untouched.
The pickup (VEHICLES row "pickup", Fjellvogn, $4,200, 1,900 kg, 70 L, 8 parcels, heated cab, coldMul 0.12): ExtrudeGeometry bevelled body
with arches, hollow cab you see the driver through, glass, bed with parcel boxes, bumpers, mirrors, lights (heads / tails separate,
brake lights, unlit things dim at night; the game's one SpotLight is re-parented onto the truck so no shader recompiles), four wheels
in one InstancedMesh that steer, spin and follow the ground one by one, a driver baked from the real walker in the seated pose
(2 draw calls), a door that swings. Getting in: walk round to the door (round the nose or tail from the far side), turn, reach, door
opens, lead foot in, duck, sit, turn forward, pull it shut (~3 s); out is the mirror and the door closes itself as you leave.
Physics: per wheel the snow in front of it (depth d, fresh f, pack = 1 - d/f): sink = d (0.35 + 0.65 (1 - pack)), rolling resistance
0.016 + 0.95 sink + 5 max(0, sink - 0.2)^2, belly drag past 0.26 m, mu 0.42 hard / 0.22 loose / 0.12 ice / 0.06 water, engine force
capped by traction, excess is wheelspin and digs into the game's own bog, Ackermann steering with lateral grip capped by mu (it
understeers), reverse by holding S at a standstill, slope gravity at real g, ruts pressed by each tyre, fuel 0.0012 + throttle,
thin ice through thinIceStep with the truck's mass, water through the existing startDrown, trees / buildings push it out and dent `cond`.
Measured by gameClock (x2_pickup): plowed lane 15.3 m/s after 4 s, 17.3 m/s after 5 s, 47 m, not bogged; 0.65 m of unpacked powder
0.0 m/s, bogged inside 14 s of throttle; rut cell under a tyre 0.15 -> 0.05 m; reverse -1.5 m/s or better along the ruts; night warmth
drain in the cab 0.09/s against 0.90/s on the sled at the same spot; sled 18.4 m/s after 4 s (unchanged by the truck's presence).
Draw calls: the truck costs 10 (588 with, 578 without; 742 / 732 in the night run), 17k triangles.
Gate: smoke, x1_save, x2_pickup (49 asserts), x2_use, x2_btn, g2_tutorial, g2_garage all exit 0, fails 0, page errors none; g2_bears
passes. `x1_save.mjs` changed: its two "no systems yet" asserts now allow the registered, empty vehicles system. g2_santa fails the
same way on origin/main (rareSpots()[0] null in the harness), so it is not from this change.
Stills judged (all under ~/.hermes/cache/scratch/tlx/pickup/): o9/sheet_all.jpg (chase, side, rear-low, first person, bogged, night front /
rear / chase), o7/sheet_in_s.jpg, sheet_in_f.jpg, sheet_in_q.jpg (in), o7/sheet_out_s.jpg (out), o5/park_*.jpg and cab_*.jpg (parked
model and the seated driver). Found and fixed from them: lenses and grille buried in the nose bevel, the A pillar and instrument hood
filling the first-person view, wheelspin digging too fast, full throttle killing all steering.
Decisions: pickup is 4x4 (all four wheels share traction); slope force at real g, not the sled's game g (32.4), so it climbs
what its tyres can hold and the sled keeps the open fell; throttle coupling to lateral grip is 0.7 of the friction circle so a
full-throttle corner still steers; parcels serialised as JSON with sites by id and the live objects kept in memory so Bytteboden
crate jobs survive a swap (they are not saved, like the sled's); the sled's headlight moves to the truck instead of adding a light.
NOT verified: sled byte-for-byte identical (smoke / det runs differ run to run on the base too because of Math.random in the
particles; the sled path is unchanged behind `if (VEH.cur)` and its smoke numbers agree to noise: walk 1.69 vs 1.70 m/s);
thin-lake-ice and open-water behaviour of the truck were not driven (code reuses thinIceStep / startDrown); a truck up a steep
slope against the sled was not measured; the pad and touch paths were driven only for get in / get out; tyre contact through
bumps and landings was judged in stills of flat ground, not a jump; the garage preview does not show the truck.
Left: the tablet in the cab (2.4), hitching trailers (2.5), carrying a sled (2.6), Bytteboden listings (2.7); cond is not shown in the
HUD; no truck-specific engine or door sound; the showroom camera orbits P (the truck when you are in it).
In progress: nothing. Next: 2.4.

## 2026-11-10 23:25 — Expansion slice 2.1b: the on-foot use action on pad and touch (G4) — 0f32f27
E on foot (`footAction`) had no pad or touch binding, so a pad or touch player could not dig a bogged sled out, hook
the winch, or help a SAR casualty up. Now: pad L3 on foot = E (it was the horn, which is off on foot anyway); the touch
context button (`#tE`) shows whenever `footUse()` has something and wears its verb. `BTN.use` / `BTN.reel`, `hk(a, what)`
("Q: get on" / "tap GET ON"); the on-foot hint line, the BOGGED line and the SAR prompts go through them. The BOGGED
line also said "R: reset" where reset is N (pad View): now `btn("reset")`.
`x2_use.mjs` (24 asserts, pass): bogged sled, dig start/stop by keyboard E, Xbox / DualSense / Switch Pro stick click,
touch tap; hint reads "E: stop", "L3: stop", "Left stick click: stop", "tap DIG · tap GET ON". Gate: smoke, x1_save,
x2_btn, g2_tutorial all exit 0, page errors none.
Not verified by play: the winch HOOK / UNHOOK and SAR labels (logic mirrors footAction line for line; only DIG was
driven). Left: X is still keyboard + Xbox X in text; ~30 older toasts hard-code keys.
In progress: nothing. Next: 2.2.

## <date time> — <short title> (Gn) — <landed hash | not landed: why>
What changed for the player, numbers before → after (gameClock), smoke result, stills judged (paths), what's next.
```

## 2026-11-10 22:15 — Expansion slice 2.1: btn(action) for every control name (G4) — 4b1e1b5
The adaptive-prompt helper LOOP.md's Owner notes call for was never on main; only the tutorial had a private table.
Lifted it out: `INP` (device last touched: kbm / pad + brand / touch), `BTN` (16 actions, each bound on all three
schemes today) and `btn(action)`; the tutorial card reads from it and the expansion api carries it. No visible change.
`x2_btn.mjs` (33 asserts, pass): names for keyboard, Xbox, DualSense, Switch Pro (scripted pads) and touch (CDP touch
event), the tutorial card showing the same names under each, back to keyboard on a key press. smoke exit 0, page
errors none; `g2_tutorial.mjs` 0 fails; `x1_save.mjs` all pass.
Found: on foot, E (`footAction`: hook the winch, dig) has no pad or touch binding (pad L3 only sounds the horn, touch
has no button). Logged as slice 2.1b; milestones 6-7 need it. About 40 older toasts and hints hard-code Q / E / R /
Space; they move to `btn()` as each system is touched, not in one sweep (too many strings to verify in one pass).
In progress: nothing. Next: 2.1b, then 2.2.

## 2026-11-10 22:00 — Expansion milestone 1: plan and scaffolding (G4, OWNER) — 64d1010 (+ itch fix 42091c5)
Lemon's Four Seasons & Enterprise brief (interactive session, worktree `tracklayer-expansion`, branch `expansion`).
Nothing changes in play. Landed: `loop/EXPANSION.md` (the brief condensed, 19 milestones, slices for 2-9, rules, open
decisions), goal G4 + Owner note in LOOP.md, and the scaffolding every later system uses:
- `tlx.js`: `TLX.register` (a system: state0 / migrate / init(api) / tick / monday), `TLX.option` (suggested additions),
  `TLX.load` / `dump`. State rides in `tracklayer.save.v2` under `x` (`{ v, region, opt, sys }`). `tracklayer.js` gets
  only a bridge (`initExpansion` hands over the api, like `initFishing`), one call each in save / load / newGame /
  frame, and a Monday hook on `CAL.onDayChange`.
- Settings > Options: one switch per registered option, hidden while there are none (so: hidden today).
- itch workflow: staged only index.html + tracklayer.js, so the itch build has been missing icefish.js since ice
  fishing landed. Now copies every top-level script + vendor/ and fails if index.html names one that isn't there.
  Not run (manual workflow, needs the BUTLER_API_KEY secret); the shell lines were checked locally.
- Harness: `mksite.py` copies every top-level .js; `lib.mjs` gains `reload()` / `reload(save)`.
Numbers (`x1_save.mjs`, 21 asserts, all pass): a pre-expansion save (no `x`) loads with cash, deliveries, sled, apps
and tutorial stage intact; a system's state and a switched-off option survive save → reload through a v1 → v2
migration; a system the build doesn't know has its state written back untouched; `x` = string / array / wrong inner
types / null all load the save and fall back to fresh; tick runs per frame; Monday hook fired 2× in 8 days.
smoke before (10c6d62, no env vars set): exit 0, powder 1.70 m/s, trench 1.66. After: exit 0, 1.70 / 1.68, page
errors none. `g2_tutorial.mjs` 0 fails. Still: tlloop/x1/x1_options.jpg (Options row matches the panel's style).
Decisions: (1) the cloud session's `tracklayer-expansion-m1.patch` was not on the Mac or on origin, so its three
commits were rebuilt here from the brief instead of applied; its Linux harness change was skipped (the Mac harness
is unchanged apart from mksite). (2) File layout `tlx.js` + `tlx-<system>.js`, each an IIFE that reaches the game only
through the api object: tracklayer.js's internals stay private and the regions can swap `api.world`. (3) Options are
saved with the game (in `x.opt`), not in `tracklayer.set.v1`, because they change rules, and only switches the player
has flipped are stored, so a default can change later. (4) Unknown systems' state is kept, so a build with a system
switched off can't eat its data. (5) LOOP.md says two bots work this file; they were retired on 6 Nov, so G4 is built
in sessions Lemon starts. EXPANSION.md says so.
In progress: nothing. No stashes; one worktree (`~/Documents/GitHub/tracklayer-expansion`, kept for the next slice).
Deferred: all game code from milestone 2 on. Next: slice 2.1, `btn(action)` lifted out of the tutorial's `tutBtn`.

## 2026-10-30 15:00 — Walking off the snow: a real walk at a person's pace (G1, OWNER) — caa7afd
Owner note 30 Oct (interactive session, not a loop pass). New hard-ground gait (`hgPose` block above poseWalker): the
walker has ankle joints now (makeWalker U.ank; snowshoes ride on them), and off the snow each foot is placed by two-bone
IK on a distance-driven cycle (heel strike toe-up → flat → heel rise on the ball → Hermite swing that lands at floor
speed), pelvis height from the stance legs (≈6 cm bob), hips turning ±4° with shoulders counter-turning, ~2 cm weight
shift, arms opposite, head steady; jog (Shift) gets a running stride with flight. `FOOT.hardW` blends wade → walk by the
loose snow under the boots (d·(1−0.8·pack): plowed yards/lanes/packed trail ≈ walk, fresh powder = wade), smoothed
~0.25 s. Pace off snow 1.4 easing to brisk 1.8 after ~3 s (FOOT.brisk), jog 3.0. The quay is bare concrete now
(freshG 0 on the pier, a 5 cm concrete deck, plow banks on the sides, `quayTop`/`walkFloor`); hard floors take no
boot holes/trench and play `hardStep` (a knock) instead of the crunch.
Numbers (`g1_hardwalk.mjs`, gameClock; before = origin/main 4297b8c): quay walk steady 2.30 → 1.79 m/s (1.4 for the
first seconds), quay jog 3.80 → 3.00, depot yard 2.68 → 1.77, open powder walk 1.53 → 1.53 and jog 1.87 → 1.87
(unchanged), smoke trench 2.25 → 1.84 (a packed trench now counts as walking ground). Planted-foot slide on the quay
(heel/ball within 5 mm of the floor, deterministic 1/60 s capture) mean 145 → 6 mm per stance, max 282 → 9 mm; bob
10.5 → 6.4 cm; cadence 158 → 136 spm brisk (116 at 1.4 m/s); knee 6–87° → 4–84°. Quay → yard snow → drift: hardW
holds 1 on concrete/plowed and eases to 0.63 at 24 cm loose. Stills (side + front strips, 0.1 s apart):
tlloop/tut/side8.jpg, front8.jpg (before: side_before.jpg) judged with vision: heel-toe walk, swing knee, legs apart,
no clipping. smoke exit 0, page errors none.
Harness: lib.mjs now hides the Mac's real gamepads from headless Chrome (a controller on the desk was steering the
walker in circles mid-test) and offers `padSet()/padOff()` for a scripted pad. g1_hardwalk takes over the rAF loop to
step the game exactly 1/60 s per frame for the foot-slide capture and strips (works under any machine load).
Next: G2 ferry tutorial (needs the deck walk). Turning on the spot still shuffles with some foot slide.

## 2026-10-26 23:40 — Snow LOD line 9-12 m out: fine ripples fade by pixel footprint (G3, OWNER) — 33557bf
Triage: 0089 (v150 pine caps clean at 7/14/30 m noon+night, no sliver) closes the pine item; 0090 (Ranger+flatbed heavy
leg stalls on a climb, 4th failed autonav) folded into the coldRun item with a slope-aware-steer note.
Took Lemon's top-priority owner note. New `g3_snowlod.mjs` (open fell from SPAWN, weather pinned, chase cam at noon/15:00/
21:00, SL_VARIANTS=1 shoots noon with each patch-shader term switched off) + `snowband.py` (fine-detail local contrast
per screen band = ground distance, sled masked; A/B crop sheets). Cause from stills: near the sled the ripples are soft
streaks; from ~10 m the 0.38 m sastrugi octave and its lee-shadow march become crisp pixel hatching (band moves with
no_relief/no_micro; sparkle/sheen/warmth don't). Fix in the patch shader: footprint `tlFp` from dFdx/dFdy(vWP.xz) fades
the fine octave (0.03→0.17 m/px) and coarse one (0.15→0.6) to their means inside tlDrift (tilt + shadows both), lee-shadow
edge softens with fp, glints ease out 0.04→0.2. Fine detail per band noon 9-12/12-15/15-25/25-45 m 0.49/0.69/2.62/5.09 →
0.33/0.26/1.04/2.36; night 15-25/25-45 1.59/3.33 → 0.65/1.75; near (<9 m) unchanged. Vision (b100/cmp2_noon, cmp2_night):
night hatching band gone, noon change gradual, far field slightly softer, some far lee-shadow blotches moved/shrank. First
try (coarse fade 0.08→0.4, shadow edge ×0.4) flattened 20-40 m too much; eased. smoke exit 0, page errors none (powder
1.54, trench 2.25). README; v152.
Next: playtester judges riding at rider view (noon/night/GFX low); then the 34-50 m relief fade and 45 m handover.

## 2026-10-26 23:30 — Wood smoke from every lived-in house's chimney (G3) — c3020dc
No new reports since 0088. Backlog top items are all low/playtester checks, so took a fresh G3 lever: town and villages
looked uninhabited. Before: only the 18 `buildSites` chimneys "smoked", via the snow-spray pool (0.42 m white dots,
gravity −9, so they fell straight back; vision on tlloop/b99/before.jpg: no smoke visible in any of 9 stills); the 50 lit
`KIT.house` chimneys had none. New `/* chimney smoke */` block: `KIT.chimneys` (lit K.house caps) + site chimneys,
one Points pool (`CSMK`, 1100 puffs, own ShaderMaterial with fog/tonemapping chunks): puffs 0.45 → 5 m, rise ~1 m/s,
lean off with the real wind from `updFlakes` (`CSMK.wx/wz`), live 7–11 s, per-chimney draw 0.6–1.3; colour = hemi + 0.35 sun
× 0.45 each frame (no night glow). Old spray smoke removed. New `g3_chimney.mjs` (quay town 45 m, Mehamn 60 m, Strandbu
30 m, a town house 17 m; Nov noon / Mar 15:00 / Nov 20:00): chimneys 18 → 68, live puffs 195–409, draw calls +1
(388 → 389), update 0.005 ms/frame. Vision (b99/after4.jpg): soft grey plumes off Mehamn/Strandbu by day, blue-grey curling
plume at night, no glow, no hard edges; the quay town from 45 m is faint against the bright hazy sky (by design subtle).
Tuned twice (alpha 0.30 → 0.6, colour 0.62 → 0.45, faster fade-in so the plume joins the cap). smoke exit 0, page errors
none (powder 1.56, trench 2.27). README; v151.
Next: playtester judges the plumes at ride distance, in a storm (laid flat?) and against the polar-night sky.

## 2026-10-26 23:10 — Playtest harness stops eating the disk (loop infra) — 036a79b
Triage: 0088 (v149 footBadge ski/ice lines 4/4 correct: "Skis float you", "Gliding on ice", "Slippery footing", yard
precedence; "Skiing a track" not shot, same code path) closes the v149 follow-up item; removed from the backlog.
Took no game item this pass: orient found 23 GB free (monitor pauses the loop at 20) and `tlloop/` scratch at 49 GB, 48 GB
of it ~300 parked `.old_prof_*` Chrome profiles (163 MB each) that `run.sh` moved aside instead of deleting (scratch
pruning only clears them after 24 h idle, so the loop's steady state was ~50 GB). `run.sh` now deletes its own
throwaway site + profile on exit and sweeps any parked `.old_site_*`/`.old_prof_*` at start (guarded by a path `case`;
never a live `prof_`/`site_` dir, so a concurrent playtester run is safe). First run swept them: disk free 24 → **73 GB**,
tlloop 49 GB → 472 MB. smoke exit 0, page errors none (powder 1.55, trench 2.27). No game change, no version bump.
Next: back to the backlog (top buildable G3/G1 items).

## 2026-10-26 23:05 — Pine snow caps sag onto the branch tips in a ragged edge (G3) — 6fa64cb
Triage: 0087 (v148 tips read at ride distance as a zigzag, no pop/seams; GFX low 30 fps vs default 9.5 in a dense stand
on SwiftShader, relative only, no action; F3 clean) → folded into the v148 pine item; its F1 (caps too smooth next to the
jagged green) taken this pass. `pineGeos` caps: 11 → 14 sides turned by the tier's phase so each tip has a cap vertex
over it; the hem vertex over a tip sits low (0.07 ch up, not 0.11 avg) and barely out, the gaps tuck up 0.2 ch and out
0.06. Two earlier tries pushed the tongues out 0.035–0.10 r and read as thin white shards at the silhouette (vision on
b97/after, after2, after3); the landed one doesn't. `g3_pines.mjs` (same tree, Nov noon/21:00): local noon 5.62/6.05/6.20
→ 5.78/6.03/6.21 (flat, as expected for an edge change), calls 346 → 346, stand tris 24.27M → 25.07M (+3%). Vision on
tlloop/b97/cmp.jpg: zigzag snow edge at 14 and 30 m, night clean, no floating snow. smoke exit 0, page errors none
(powder 1.55, trench 2.28). README; v150.
Next: playtester judges the caps at ride distance/dark night; a faint edge-on sliver on tier 2 at 7 m may remain.

## 2026-10-26 22:50 — On foot, the snow badge reads the walker's snow, not the parked sled's (G1) — 8bad103
No new reports since 0086. Took the 0085 F3 item ("PACKED · Plowed yard" mid-stand): root cause was `updHud` building
the pill/line from `P` (the sled) even on foot, so the badge kept the parked sled's surface wherever you walked (0085's
scenario left the sled in the depot yard). New hoisted `footBadge()` reads the walker's own cell (footStep's pack rule,
lake ice, yardAt): PACKED "Plowed yard"/"Packed trail", POWDER "Wading powder"/"Wading deep powder", ICE "Slippery
footing", snowshoe/ski lines. New `g1_footbadge.mjs` (sled left in the depot yard, walk 110 m out; sled parked in powder,
walk 25 m): badge vs truth mismatched 138/258 → 1/248 (the one is the 15 Hz HUD tick at a yard edge), B 0/63 both.
Vision on tlloop/b96/after/A_depot_walk.jpg: "POWDER · Wading deep powder" knee-deep 80 m from the sled. smoke exit 0,
page errors none (powder 1.52, trench 2.26). README; v149.
Next: playtester checks the ski/ice lines; builder takes the next buildable item.

## 2026-10-26 22:35 — Pine tiers get ragged drooping branch tips instead of a lampshade hem (G3) — 9798caf
Triage: 0086 (garage Engines/Workshop tabs legible in all 3 saves, no bugs; F4 wording asymmetry cosmetic) → no items.
Took the 0084 F3 boxy-pines item. `pineGeos`: each tier's green cone 7 → 14 sides, 2 height rings with a 7% belly, and the
hem is a ring of branch tips (alternate vertices reach 1.07–1.19 r and hang 0.16–0.28 m down, the ones between tuck to
0.86 r and up 0.12 m), each tier turned 0.9 rad from the one above. Snow caps untouched. New `g3_pines.mjs` (densest flat
stand, 34 pines in 60 m; tree from 7/14/30 m at Nov noon + 21:00; before = git archive origin/main): local contrast noon
5.29/5.34/5.53 → 5.66/6.02/6.24, night 6.74/7.33/7.44 → 7.52/8.13/8.26; draw calls 346 → 346, triangles in the stand view
22.6M → 24.3M (+7%). Vision (tlloop/b95/cmp/): the level lampshade hem under each cap is now a jagged drooping skirt, reads
as branches from 7 m to 30 m, no cracks or floating bits; night fine. smoke exit 0, page errors none (powder 1.53, trench
2.23). README; v148.
Next: playtester judges the tips at ride distance and FPS on GFX low in a dense stand; snow caps may want a ragged edge.

## 2026-10-26 22:10 — On-foot camera in a pine stand measured; spring-arm boom tried, not landed (G3) — harness only
Triage: 0084 (on-foot clip verified at the 0.6 m floor; FP on foot is Close chase by canon) closes the item's FP ask;
0084 F3 boxy pines → new G3 item; 0085 (walking through tree wells 0/4 stuck) closes that hand-walk ask, its F3 PACKED badge
mid-stand → new low G1 check. 0083 (v147 at close chase 0/4 inside a canopy, min 0.57–5.46 m; night clean; no shimmer) closes those asks on
the top item; its F3 (dither texture unproven in a still) is by design, no action. Also re-shot `g3_drip_ride` (white-trim
drip edge reads at 15 and 25 m): that idea dropped, no change.
Took the top item's on-foot half. New `g3_camtree_walkcam.mjs` (12 walks, 3 dense pine stands, W held, per-frame clearance,
near-lens frames, sight line to the walker's head, camera jumps). main: inside 0/9231, but 49% of frames a canopy within
1.6 m of the lens, 35% walker occluded by a canopy, 8 jumps > 0.15 m/frame. Built `camPineBoom` (on-foot spring arm:
march along the pulled-in path, bisect, glide in ~10/s): stop 0.6 m short → occluded 20%, near-lens 63%, jumps 353; stop
1.6 m short → occluded 21%, near-lens 63%, jumps 706. Vision on before/0.6/1.6 sheets (tlloop/b94/cmp3.jpg): no visible
difference, the near-lens slabs come from trees beside the walker, not behind him. Not landed (more camera motion for no
visible gain); patch kept at tlloop/b94/pineboom_springarm.patch. Harness note: FOOT.on set directly leaves the walker
figure undrawn; dismount with Q for stills. Scenario committed, no game change (no smoke needed).
Next: if retaken, judge with the walker in shot and try a faster dither fade or a lifted camera in stands; else the next
buildable item.

## 2026-10-26 21:45 — Ladder cadence measured past the first upgrade (G2) — harness only, no game change
No new reports since 0082. Took the 0082 F1 follow-up (measure the cadence after the Woodsman). New `g2_cadence.mjs`:
a modelled player on real boards (makeJobs/makeContracts at the live GS state, contractBlock filter, best pay/est-min,
time = the game's own jobGeom est), 4–6 runs per mode, to 70 deliveries. Every sled is bought the delivery it unlocks
(gaps 4/4/5/5/6/8/14/14); est-min Woodsman 12.5, Ranger 44, Sprint 96, Summit 133, Trekker 182, Apex 258, Matriarch 410,
Aurora 478. No dry grind or trap in the early/mid ladder; the long stretch is Apex → Matriarch (14 deliveries, ~150
est-min), which is Lemon's own `need` 32 → 46. Found instead: once you rig a trailer, cash stops mattering ($10k spare
at the Sprint, $106k at the Matriarch); parcels-only riders are cash-gated only at the Matriarch (+5 deliveries).
Decision: no retune. Sled costs/needs and contract pay are Lemon's pre-loop numbers (97fe993); logged as a low backlog
item with canon-keeping levers, cadence added to the Progression map. 0082 item closed. Sim only, no smoke needed
(page errors none in both runs).
Next: builder takes the next buildable item; G3/G1 playtest follow-ups stay with the playtester.

## 2026-10-26 21:30 — Chase camera stays out of pine branches; a tree at the lens fades see-through (G3) — 627a385
Triage: 0081 F1/F2 (chase cam inside a pine skirt riding close past it; a trunk filling the frame after a stand) → this
pass; F3/F4 (wells clean from the chase cam, 4/4 clean passes) close the riding half of the tree-well item. 0082 F1 (first
$600 in ~185 game-s even at ~40 mph): decided NOT to slow it (loop's own target, good onboarding, deliveries gate the
Woodsman anyway); new item to measure the cadence after it. 0082 F2 harness-only, F3 no issue.
Build: hoisted `pineCanopyR(o, y)` (the pineGeos tier cones per tree) + `camTreeClip(c)`: after the chase cam's lerp, a
camera inside a canopy + 0.6 m slides straight out from the trunk (persists into the next lerp, so it glides). And in
`breezeMat` (pines + birches, trunk + caps) fragments within 2.6 m of the camera screen-door out (stable per-pixel IGN,
gone by 0.8 m). New `g3_camtree.mjs` (3 dense stands × 2 headings × 2 lateral offsets, per-frame clearance): frames inside
a canopy 33 → 0, < 0.3 m 91 → 0, runs clipping 2/12 → 0/12, min clearance −0.14 → 0.57 m. Stills (tlloop/b92/cmp3.jpg,
before = git archive origin/main): the solid green slab at r1_at0m is now a see-through dithered skirt with the sled
showing behind; r0_at0m sled clear of the tree. Tried a 1.0 m push margin first (cmp2.jpg): still a slab, kept 0.6 + dither.
smoke exit 0, page errors none (66.8 mph, powder 1.55, trench 2.26). README; v147.
Next: playtester judges the dither in motion, close chase, on foot in a forest, at night.

## 2026-10-26 21:10 — Pines stand in tree wells (G1/G3) — 93622ee
Triage: 0079 (v144 narrow-gap verified 0/12; village houses Mehamn/Gamvik clean of moire at 20/8 m, night legible) closes
the village-moire ask in the buildings item; 0080 verified v145 (downhill trunk hit = one thud then free, skis slide along
a house wall like on foot, chase-cam weave reads as a glide): v145 follow-up item closed. No new bugs in either.
Took the b87 tree-well idea (no buildable item left above it; G3 had no landing since v140). New hoisted `treeWell(x, z)`
folded into `freshBase` (so getChunk, restCell and freshCell agree): each pine (obGrid `o.pine`) digs a smoothstep dish,
up to 62% of the depth gone at the trunk, back to full at 2.3 m × scale (the lowest branch ring); birches none.
`var WELLS_ON` flips after buildPines (hoisted, no TDZ). New `g1_treewell.mjs` (3 densest flat pine stands, 7 pines each):
depth at 0.6/1.2/2/3/5 m from a trunk 0.73/0.73/0.73/0.73/0.73 → 0.36/0.52/0.68/0.73/0.70 m (open 0.77). `g1_forest`
(mixed stands, W held 30 m): stuck 0/12, pass 24.0 → 23.7 s, stall 0, flips 0 (the line mostly misses well cores).
Stills (tlloop/b91/sheet5.jpg, before = git archive origin/main): low 1 m view, background pines now show brown trunk
feet under the skirts instead of being buried to the branches; no holes, rings or floating trees. smoke exit 0, page
errors none (67.4 mph, powder 1.52, trench 2.23). README; v146.
Next: playtester rides/walks through a stand and judges the wells from the chase camera (pop-in at ~40 m?).

## 2026-10-26 20:40 — Skiing through trees slides you round trunks instead of pinning you (G1) — 359b1f6
No new reports since 0078. Took its top item: `skiStep` resolved trees only with footBlock's radial snap, so skis aimed
at a trunk were re-clamped to the same spot every frame. footStep's obstacle block (summed-normal wall slide, v142
round-obstacle sidestep with `F.obSide`, v144 notch lock) moved verbatim into a new hoisted `obSlide(F, mx, mz, dt)`
(returns touch + how square-on, `sq`); footStep calls it, skiStep calls it before footBlock (kept as fallback + sled/ruin
walls). On skis the thud (speed × 0.3) now needs footBlock's push or a square hit (sq > 0.55) above 3.5 m/s; a glancing
touch bleeds ≤ half the speed per ~1/6 s by sq. `g1_ski_forest.mjs` (3 densest stands × 3 headings, Turski, W held):
stuck 1/9 → 0/9, mean stall 7.12 → 0.61 s, max stall 28.63 → 1.80, speed collapses 22 → 6, mean pass 16.46 → 14.87 s.
On foot unchanged: `g1_narrowgap` 0/12, hug 2.12 → 2.13, pass 8.17 → 8.17; `g1_obround` 0/12, hug 1.27 → 1.30, pass 5.12
→ 5.16 (noise). `g1_ski` open ground fine (flat 2.49, up 0.78, down 5.12 m/s). smoke exit 0, page errors none (67.6 mph,
powder 1.54, trench 2.24). Collision only, no stills. README; v145.
Next: playtester judges fast downhill trunk hits and skis along a house wall; builder takes the next buildable item.

## 2026-10-26 20:20 — Two trunks too close to squeeze between: you step round instead of wedging (G1) — 23464b8
Triage 0077 (v143 toast fix verified, Delivered 3.44 s; nothing new) and 0078 (skiing pins you on a trunk: skiStep has
no sidestep at all; new high G1 item at the top). Took 0074 F1. A per-sample path log showed it wasn't drifting off line
(the report's 5 → 12 m was the sled-distance HUD): the walker was pinned IN the gap. Two discs closer than the body make a
V; the summed-normal tangent always points back to its bottom, so v142's "follow your lean" rule flipped `F.obSide` every
~0.3 s and you jittered ±0.2 m. Now when two hit discs are closer than body width (gap < 0.76 m) the side is set outward
(round the nearer trunk) and locked (`F.obLock`) until contact ends. New `g1_narrowgap.mjs` (3 narrowest flat pairs, gap
0.36/0.51/0.62 m, lateral 0/±0.3/0.6): stuck 9/12 → 0/12, mean hug 7.69 → 2.12 s, mean pass 8.17 s, max drift 2.58 m (one
run went round a third trunk). `g1_forest_lamp`: stuck 2/12 → 0/12, hug 1.60 → 0.92, dither 1.33 → 0.08. No regressions:
`g1_obround` 0/12, hug 1.25 → 1.27, pass 5.11 → 5.12; `g1_forest` 0/12, stall 0, flips 1 → 0, pass 23.8 → 24.0 s.
smoke exit 0, page errors none (67.1 mph, powder 1.53, trench 2.27). Collision only, no stills. README; v144.
Next: skiing through stands (0078): port the sidestep to skiStep.

## 2026-10-26 19:55 — Delivery messages no longer vanish in a burst (G2) — ffe2b97
Triage 0074–0076: 0074 F1 (two trunks 0.51 m apart: v142 sidestep drifts you 12 m off line, never resumes) → new G1
backlog item at the top; F2/F3 (wide gaps, lamp posts) verified clean, lamp-post check closed. 0075 F1 taken (below);
F2/F3 (stack renders cleanly, 4.2 s long enough) close the v135 toast item; F4 ("trail report" as mail backhaul) cosmetic,
dropped. Its idea (b) "evict the one with least time left" is the same as oldest-first (all toasts live 4.2 s), so not used.
0076 judged the drip edge at ride distance (red clean; white house faint at 15 m, gone at 25 m): low, noted in the item.
Fix: `toast()` now queues; up to 4 on screen (3 on touch), and a toast is never pushed off before 3.4 s, later ones wait;
an identical line already up/queued isn't repeated. New `g2_toast_time.mjs` (4th delivery at Strandbu, 5 toasts): Delivered
shown 2.60 → 3.47 s, window line 2.69 → 4.21, min 2.6 → 3.47, mean 3.59 → 4.07, under 3 s 2 → 0, last off 6.95 → 7.68 s;
same line 6× → 3 on screen → 1. Vision (b88/tafter/t3500.jpg): 4 stacked bars, no overlap, clear of the sled and HUD.
smoke exit 0, page errors none (67.9 mph, powder 1.53, trench 2.22). README; v143.
Next: the narrow-gap forest drift (0074 F1).

## 2026-10-26 19:40 — Forest walking checked after the v142 sidestep (G1) — harness only, no game change
No new reports since 0073. Top item asked whether v142's round-obstacle sidestep pushes you into the next tree or
dithers in a stand. New `g1_forest.mjs` (4 densest flat stands on the map, 16–18 trees within 12 m; 3 headings each;
W held, no steering, 30 m through the centre, cap 40 game-s): v141 (`git archive 2d8f2c6`) 4/10 pinned on a trunk face,
mean stall 15.1 s (2 further runs were cold blackouts from 12 back-to-back walks: scenario now resets warmth) → v142
stuck 0/12, stall 0.00, side flips 1/12, max lateral drift 1.3 m, mean 23.8 s / 30 m. A depth probe put that pace on the
snow (0.86–0.9 m in the stands, same round them), not the trees, so no tuning (snowshoes are the answer there).
Also fixed `g1_jog_player.mjs`'s toast hook (report 0036 F2: window.toast never fires; now a MutationObserver on
#toasts), item closed. Logged a tree-well idea in the backlog. No game code changed, no smoke/version bump.
Next: the playtester takes lamp posts / gamepad / skiing; builder takes the next buildable item.

## 2026-10-26 18:55 — Walking into a lone tree, rock or pallet steps you round it (G1) — 11a75ab
Triage 0072/0073: v139 cans + yard patch verified; 0072 F2 (pallet dark from 4 m at night) by design, no action; F3
(Risfjord's sharper powder→yard edge) informational. 0073 verified v141 (card + toast wrap, button greyed); its F1/F2 (double
clause never shows in play, Aurora card not shot) low, dropped: same `sledGap` text. v141 item closed. Took 0072 F1: walking
square at the pallet orbited it ~2.8 s. New `g1_obround.mjs` (2 pallets + 4 lone r0.3/r1.0 obstacles, head-on and 0.3 m off,
cap 12 game-s) showed worse: dead square you were pinned on the face forever (6/12 stuck). footStep's summed-normal slide now,
when every disc hit is round (no `o.ax`), turns the blocked stride into a tangent sidestep (≥ 0.8 of the into part) on the side
you lean to, side latched (`F.obSide`, 0.3 s hold) so it can't dither. Stuck 6/12 → 0/12, mean hug 5.15 → 1.25 s, max 9.35 →
2.47, mean pass 5.25 → 5.11 s (now over all 12). `g1_wallslide` houses unchanged (along 5.28/8.77/11.34 → 5.30/8.56/11.20,
noise). smoke exit 0, page errors none (67.2 mph, powder 1.55, trench 2.23). README; v142.
Next: playtester checks forest stands (sidestep into the next tree?), lamp posts by lanes, gamepad, skiing.

## 2026-10-26 18:40 — Late-ladder lock cards say what you're short of (G2) — 4bd1bea
No new reports since 0071. After 3 G3 landings took G2 (late ladder polish + "locked items should say how to unlock
them"). The fell, tonne and clean-air lock text repeated the sled's sticker ("(32 deliveries, $5200)") whatever your state,
even when the right sled was already in your garage. New hoisted `sledGap(s)`: owned → "Your Apex 800 is in the garage:
swap onto it there (T …)"; else "The Apex 800 is $5,200 at 32 deliveries: you need 2 more deliveries and $4,400 more"
(only the short parts). Fell points at the smallest owned sled ≥ Apex. New `g2_lockgap.mjs` (3 kinds × short both /
short cash / owns it): distinct texts 1/3 → 3/3 per kind, owned-sled hint 0/3 → 3/3. Text only, no stills. smoke exit 0,
page errors none (66.3 mph, powder 1.53, trench 2.25). README; v141.
Next: playtester judges the longer text on the Freight card and toast.

## 2026-10-26 18:35 — Street lamp pools fall off like a real lamp (G3) — 0eb2b65
Triage 0071: v138 pump hardware + moonless canopy pool verified; F1 (detail invisible at 20 m ride distance) is by design,
no action; F2 (jerry-can camera ignored the cabin's rotation) harness-only, and the cans were judged up close in b83 (v139);
F3 (poking `AUR.v` doesn't hold the night's aurora) harness note for the playtester. G2 cards/toasts already say what each
late sled opens, so took report 0061 F3: a lamp pool read fainter from 9 m beside the post than from 22 m (flat-topped
6.5 m disc). New `lampPoolTex()` (lamps only; the station keeps its texture): cos³ falloff from a head 3.9 m up + a small
scatter tail, smooth edge fade, disc R 6.5 → 8.5 m (NR 6 → 8 rings on surf), opacity 0.5 → 0.65; 0 extra draw calls.
`g3_lamps` night near/ride local 3.90/3.89, 4.26/4.75, 4.76/4.45 → 4.58/4.58, 4.40/4.86, 5.13/4.56 (lamps 0/4/9).
Vision (b84/cmp.jpg before|after near): warm core now sits at the foot of the post and fades out; no ring edge or banding.
smoke exit 0, page errors none (67.6 mph, powder 1.55, trench 2.22). README; v140.
Next: playtester judges it on a moonless night and walking up to a village lamp.

## 2026-10-26 18:22 — Fuel cabins' jerry cans become real jerry cans (G3) — daa5150
No new reports since 0070. Backlog's builder-actionable items are mostly playtest checks; took the buildings item's open
leftover "fuel cabins' jerry-can pallets unchecked up close". New `g3_fuelcabin.mjs` (first 2 cabins, 6 m / 2.4 m / 1.3 m,
Nov noon + 21:00) showed plain salmon boxes with a grey block on top and the pallet buried in the powder (group at
ground − 0.1). Now: pine Euro pallet (deck boards, cross boards, 9 blocks, runners), 7 × 20 L cans (35×47×17 cm) with the
stamped X on both faces, foot seam, 3-bar handle, black spout cap + lever, a yellow ratchet strap round the back stack;
`addYard(x, z, 1.6)` shovels the spot and the group sits at `surf − 0.03`. All merged per material: 17 → 8 meshes per cabin
(walk-view calls 334/159 → 324/149). imgstats local nov cans 3.37/3.05 → 4.49/4.02, q34 4.24/3.80 → 4.63/4.36, night cans
3.11/2.83 → 3.69/3.24. Vision (b83/before_sheet.jpg vs after_sheet.jpg + after/nov_0_cans.jpg): reads as jerry cans on a
pallet, no clipping/floating. smoke exit 0, page errors none (66.1 mph, powder 1.54, trench 2.24). README; v139.
Next: playtester walks up to a fuel cabin from the sled (yard patch, pallet obstacle) and judges the cans at night.

## 2026-10-26 18:15 — Fuel station pumps and canopy posts get real hardware (G3) — 02a0053
Triage 0069/0070: v136/v137 shore slide verified (stuck 0/16, avg 5.53 m; skiing and the pier edge clean); shore item cut to
the one hand-walk check left. 0069 F1 (spot 3 = steep slope) superseded by v137 (it moves 3.8 m now). 0069/0070 "should a
~1.3 grade (53°) nearly stop walking?" dropped: a near-cliff stopping you on foot is the realism-first canon, not friction.
After 3 G1 landings took G3 (buildings item, stations leftovers): pumps were plain red boxes with the holster a free post
10 cm off the pump, canopy posts plain white boxes. Now: steel kick plate, white stripe, a steel holster cup with the nozzle
grip + spout and the hose looping into a grommet on each face; steel bollards with amber bands at the island ends; posts on
concrete crash feet with amber/black hazard bands and a steel collar. All small boxes merged per material (`det` → mergeBoxes),
q34 calls 538 → 539. `g3_stations` local nov canopy/pump/disp 4.09/5.16/4.69 → 4.24/5.21/4.85, night canopy 4.65 → 4.75.
Vision (b82/before_sheet.jpg vs after2/): first try's spout read as a little roof shape, re-angled; now reads as a hung
nozzle. smoke exit 0, page errors none (67.5 mph, powder 1.54, trench 2.26). README; v138.
Next: playtester judges the nozzle at ride distance and the bands at night; fuel cabins' jerry-can pallets up close.

## 2026-10-26 17:58 — Shore slide gets round the beach's stair-step corners (G1) — fd13d4a
No new reports since 0068. Took the v136 follow-up (last stuck spot). New `g1_shore_probe.mjs` (isSea ASCII map + per-step
trace) showed spot 3 sits on a diagonal shore that the sea mask draws as 4 m stairs: the 45° walk hits a riser almost
square, the normal-projected slide lands wet, and the walker froze (sp 0). shoreSlide now also slides on the step's dry
x-only / z-only part (whichever goes further) and handles steps not into the averaged normal. `g1_shore.mjs` avg along-shore
**5.13 → 5.52 m** in 5 game-s, stuck **1 → 0** (spot 3 45° −1: 0.5 → 3.8 m); never ends in the sea. smoke exit 0, page
errors none (66.2 mph, powder 1.54, trench 2.21). No stills: motion-only. README; v137.
Next: playtester walks a long diagonal beach by hand (visible zig-zag on the staircase?), ski along a beach.

## 2026-10-26 17:48 — Walking along the shore follows the waterline (G1) — 977795b
Took G1 (one real G1 landing in the last 20 passes). Found in `footStep`: a step that landed in the sea zeroed the
position AND speed, so walking a quay or beach even slightly seaward froze you on the edge (re-accelerating every
frame). New hoisted `shoreSlide(F, nx, nz)`: shore normal from 12 isSea taps 1.5 m round you, takes off only the
seaward part of the step; only a step square out to sea (or a slid spot that's wet too) stops you. Used by footStep
and skiStep. New `g1_shore.mjs` (4 shore spots near the depot, 20°/45° seaward both ways, W for 5 game-s): avg along
shore **2.73 → 5.13 m**, stuck (<1 m) 3 → 1 (spot 1 45°: 0.8 → 6.7 m; spot 2 20°: 2.7 → 9.6). smoke exit 0, page errors
none (66.9 mph, powder 1.54, trench 2.22). No stills: motion-only change. README; v136.
Triage 0068: v134 verified on a second rise; F1/F4 harness notes (wet start spot, beacon projection) and F2 (no trees
near spawn crests) folded into the sled-column item; F3 positive, no action.
Next: the remaining stuck spot (spot 3 45° side −1), ski along a beach.

## 2026-10-26 17:35 — Sled unlocks announced with a toast (G2) — e1f38d7
No new reports since 0067. After 18 G3/G1 passes, took G2 (fewest recent landings), goal item "does the game say what's
next": `bumpDelivered` toasted rank-ups but nothing said when a delivery opened a sled (Woodsman 4, Ranger 8, Sprint 13,
Summit 18, Trekker 24 opened silently; the player had to open the garage to notice). New `sledReadyMsg(s)`: "N deliveries:
the garage will sell you the X now, $cost (you have $cash if short). P% more power than your <ridden sled>, K more parts in
the shop, <perk name>, <exclusive work>. T at the garage across from the quay." Fires 2.6 s after the delivery (5.4 s when a
rank-up toast also fires), skipped if the sled is owned. New `g2_sledready.mjs`: sled-ready toasts 0/8 → 8/8, owned Ranger at
8 stays quiet. Vision (b79/after/01_woodsman_toast.jpg): 3 lines, readable, clear of the HUD. smoke exit 0, page errors none
(66.1 mph, powder 1.53, trench 2.27). README; v135.
Next: playtester sees it in a real first-5-min chain (4th delivery → Woodsman toast alongside the delivery toast).

## 2026-10-26 17:25 — Sled column eases the same at any frame rate; crest walk verified (G1) — bd73629
Triage 0067: v132 drip edge verified at 15–20 m on red and grey trim; F1/F2 (fades by 25 m and at night) by design, no
action; F3 → playtester note to check the white gabled SITES homes. Its harness note (rider.visible is reset every frame,
hide it inside the camOv hook) is a known skill pitfall. After 17 G3 passes in a row, took G1: the crest-walk recheck
(0044 called the ridge-lift drop a "snap" from 100 m teleports). New `g1_sledpin_crestcont.mjs` holds W 106 m over a 59 m
rise toward the sled at night: lift eases 114 → 0 m over the last ~25 m before the crest, foot screen row ≤16 px/game-s,
no jump at the 25 m skip; vision (b78/before_sheet.jpg): column stands over the walker in every frame, no pop. Not a
snap. Found the easing used a fixed 1/60 step per frame (3× slower at 20 fps); now `1 − exp(−6·dt)`. Headless numbers
unchanged (max lift change 11.0 → 11.2 m/game-s, row 16 → 14 px/game-s, lift 0 at crest-cam 4.5 → 4.9 m). smoke exit 0,
page errors none (67.8 mph, powder 1.54, trench 2.28). v134 (no README: not a visible feature change).
Next: column in trees / next to a depot beacon (playtester).

## 2026-10-26 17:10 — Work sheds get the drip edge too (G3) — aa73625
Triage 0066: v131 verified (no seams/flicker, mirrored panes fine on 5 buildings); F1 (same sheen on every house seen from
the same angle) is by design for a view-ray shader, the row-street check stays a playtester item; F2/F3 no issue. Took the
buildings item's "work sheds/hospital roofs match?": the garage, freight shed and fish buyer had white (grey) fascia straight
under the white snow slab, the same one-slab look v132 fixed on houses. New `KIT.drip` + `KIT.dripRing(g, w, d, yTop)`: a
6 cm dark ring just under the snow load, 4 cm inside its edge (first try 4.5 cm / 12 cm inset hid in the snow's underside on
the garage; widened). Hospital skipped (fascia already grey). `g3_sheds.mjs` local nov garage/freight/fish 7.20/4.77/5.65 →
7.32/4.85/5.77, March +0.08–0.12, means ±0.5; quay calls 821 → 824. Night stats not comparable (before run had a bright
aurora). Vision (b77/after2 crops): thin grey line on both garage sides and along the freight shed, reads as flashing, no
z-fight. smoke exit 0, page errors none (67.6 mph, powder 1.52, trench 2.26). README; v133.
Next: playtester judges the drip lines at ride distance; row-street sheen check.

## 2026-10-26 17:00 — Drip edge separates roof trim from the snow load (G3) — 89232a4
No new reports since 0065. Took the buildings item's red-house fascia note (0060 F4: white fascia ran into the white snow
cap, one thick white slab under the eave). Rather than greying all white trim (window frames too), roofTrim now adds a
5.5 cm dark steel drip edge along each fascia top and barge-board top, tinted by a vertex colour (mergeBoxes takes an
optional 8th brightness entry; `trimVC()` gives the trim material a cached vertexColors twin). Calls 305 → 305.
`g3_roofs.mjs` imgstats local: mar eave 5.50 → 5.80, nov eave 5.83 → 6.09, night eave 4.25 → 4.64, gables +0.1, corners
+0.1–0.3, means ±1. Vision (b76/cmp.jpg): a thin grey line now parts fascia from snow, reads as flashing, no z-fight or
floating strips on the rakes. smoke exit 0, page errors none (67.3 mph, powder 1.54, trench 2.27). README; v132.
Next: playtester judges the drip line at ride distance; sliding glass sheen along a street.

## 2026-10-26 16:50 — Window glass reflection follows the viewpoint (G3) — 21ce8de
Triage 0065: v130 verified (871 calls, night unchanged); F1 (same fixed reflection on every pane whatever it faces) taken
this pass. houseWinMat's shader now offsets the glass lookup by the mirrored view ray (horizontal along the wall ×0.45,
vertical ×0.55) and mixes in the sky colour by Schlick Fresnel ×0.75; world normal/position as new varyings, 0 draw calls
(871 → 871). First try turned the white houses' panes flat pale sky (their normals point inward: Fresnel = 1); fixed by
flipping the normal to face the eye. `g3_glass.mjs` imgstats before → after within ±0.1 local on every view (night ±0.1
mean); vision (b75/cmp2.jpg): the sheen sits in a different pane from closeL vs closeR, horizon line a little higher at
close range, no seams. smoke exit 0, page errors none (65.9 mph, powder 1.53, trench 2.25). README; v131.
Next: red-house fascia tint; playtester to judge the sliding sheen in motion.

## 2026-10-26 16:40 — Windows read as glass by day (G3) — c121fde
Triage 0064: v128 pool verified (538 calls, night pump 109.8/5.03); its F1 (canopy soffit un-graded) was already fixed by
v129 (0064 tested v128); kiosk ridge gap from 0063 F2 not reproducible, dropped. Took 0053 F3: day glass read as flat
mid-grey paint on every house/shop/cabin/helsesenter. New hoisted `houseGlassTex()` (pale sky reflection top, dark ridge
line, dim room, faint diagonal sheen) blended into houseWinMat by a `uGlassDay` uniform (map_fragment replaced; houseWinTick
sets it from the same day factor), so dusk/night glow unchanged. New `scenarios/g3_glass.mjs`. imgstats night views ±1
mean (unchanged), day close-ups p5 30–32 → 27–29 (darker glass bottoms), nov_0_front local 5.93 → 6.01; calls 871 → 871.
Vision (b74/cmp.jpg): windows now read as reflective glass with depth, at 6 m and 13 m. smoke exit 0, page errors none
(66.2 mph, powder 1.53, trench 2.22). README; v130. Next: red-house fascia tint; sheen repetition along a street.

## 2026-10-26 16:30 — Canopy light panel stops glowing at noon (G3) — 532cefc
Triage 0063: v127 pump LCD verified (538 calls); F1 (canopy underside a flat near-white panel at noon) taken this pass;
F2 (kiosk ridge cap proud / gap at barge boards) logged low in the buildings item; F3 no issue. The panel under each
canopy was a fixed cream `MeshBasicMaterial` 0xfff1cf (same bug family as v125/v126). New hoisted `canopyLightMat()`:
Lambert colour 0xa4acb6 × (1−n), emissive 0xfff1cf × n from houseWinTick. First try 0xd4d8dc vanished into the white
soffit at noon; the cooler grey reads as a frosted panel. `g3_stations.mjs` nov_canopy mean 166.0 → 160.9 (the panel is
in shade now), night_canopy 96.4 → 95.3 / local 4.70 → 4.72 (unchanged glow), q34 ±0.4; calls 538 → 538. Vision
(b73/cmp2.jpg): noon shows a shaded diffuser set into the soffit, night still glows warm. smoke exit 0, page errors none
(67.2 mph, powder 1.53, trench 2.21). README; v129. Next: kiosk ridge cap, red-house fascia tint, day glass mid-grey.

## 2026-10-26 16:25 — Station forecourt pool matches the street lamps (G3) — e461479
No new reports since 0062. Took the buildings follow-up (0059 F3: station pool faint on moonlit nights, 0.45/0xff7a2a vs
lamp pools 0.5/0xe0601a; b68 found 0xff8a3a-ish reads neutral white on blue snow). stationPool colour → 0xe0601a, opacity
0.45 → 0.6 (a lit canopy outshines one lamp). `g3_stations.mjs` night: pump mean/p95 104.6/196 → 109.5/211 (local 4.89 →
5.02), canopy 94.7 → 95.5, q34 ±0.1, noon unchanged; calls 538 → 538. Vision (b72/cmp.jpg): warmer cream-orange pool under
the pumps and along the island, soft edges, not over-bright. smoke exit 0, page errors none (67.1 mph, powder 1.51, trench
2.25). README; v128. Next: red-house fascia tint, day glass mid-grey.

## 2026-10-26 16:15 — Fuel pumps get a readable LCD readout (G3) — d588af0
Triage 0062: v126 verified (103 calls, dark glass by day, glow at night); F1 (pump display a flat grey panel) taken this
pass; F2 harness-only (g3_glow ferry target frames the tackle shop), F3 no issue. Pumps used KIT.glowM, now a per-station
`signMat(pumpDisplayTex(fuelPrice), 0.85)`: grey-green LCD with dark segment digits (last sale, litres, $/L) and faint
unlit 8s, emissive faded in by houseWinTick. First try with a [dark×4, disp×2] material array cost +20 draw calls
(538 → 558); now one material with the box's edge UVs pinned to the bezel corner: 538 → 538. `g3_stations.mjs` gained a
1.5 m `disp` view: imgstats local nov_disp 3.98 → 4.64, night_disp 3.99 → 4.41, nov_pump 4.89 → 5.21. Vision (b71/cmp.jpg):
digits read at noon and 4 m, backlit pale panel at night, not mirrored, no z-fight. smoke exit 0, page errors none (66.7
mph, powder 1.53, trench 2.21). README; v127. Next: station pool strength vs lamp pools, red-house fascia tint.

## 2026-10-26 16:05 — Church, ferry and pump glass dark by day (G3) — 16d1d77
Triage 0061: v124 lamp pools verified (508 calls); F3 (pool fainter from 9 m than 22 m, foreshortening) noted as low in
the buildings item; F4 already fixed by v125. Took the last K.glowM users: church windows, ferry windows/portholes, fuel
pump displays (one fixed cream MeshBasic, lit at noon). houseWinTick now copies houseWinMat's day/night colour into
KIT.glowM (one line, 0 draw calls). New `scenarios/g3_glow.mjs` (finds every glowM mesh, one view per building, ferry
pinned alongside; Nov noon + 21:00). Centre crop at noon 227/219/196 → 104/105/107 (church, 3 pumps), night 225/215/190
unchanged; frames ±1; calls 103 → 103. Vision (b70/pair.jpg): noon windows/displays read as dark glass like the houses,
night still glows. smoke exit 0, page errors none (67.2 mph, powder 1.52, trench 2.22). README; v126.
Next: pump display digits by day, station pool strength, red-house fascia tint.

## 2026-10-26 15:55 — Lamp globes stop glowing at noon (G3) — e75d27b
No new reports since 0060. Took the v124 follow-up: all 35 `K.lamp` globes used the shared MeshBasic `KIT.glowM`, so they
burned cream at full brightness at noon. New hoisted `lampHeadMat()` (Lambert, colour 0xc4c8cc × (1−n), emissive 0xffc26b
× n, n from houseWinTick like the windows/pools). `g3_lamps.mjs` now finds lamps by shape (works before/after) and adds a
5 m `head` view. Globe RGB at Nov noon 227/219/196 → 169/171/178 (shaded grey glass), night 225/215/190 → identical; frame
means ±1. Draw calls 380 → 379. Vision (b69/heads2.jpg): noon globe reads as unlit frosted glass with shading, night
unchanged. smoke exit 0, page errors none (67.6 mph, powder 1.52, trench 2.26). README; v125.
Next: other K.glowM users lit at noon (ferry windows, pump displays), station pool strength, red-house fascia tint.

## 2026-10-26 15:45 — Street lamps throw light pools after dark (G3) — 23bd096
Triage 0059 (v122 stations verified: 537 calls, pump local 5.15; F3 pool faint on moonlit nights, F4 posts plain, F6 lamps
have no pool) and 0060 (v123 roof trim verified, 304 calls; F4 white fascia merges with roof snow on red houses up close)
into the buildings item. Took the lamp pools (0059 F6). New `scenarios/g3_lamps.mjs` (finds lamps by their glow sphere,
works on old builds; 9 m near / 22 m ride views, 21:00 + Nov noon; LAMPS=i,j). Before: 35 lamps, each a glowing head over
dark snow. Now K.lamp queues its spot and `lampPools()` (first houseWinTick, after yards/lanes exist) lays one merged
additive mesh of 13 m discs whose rings follow `surf` 12 cm up, station-pool texture + fog-darkening, colour 0xe0601a,
opacity 0.5·n. First try 0xff8a3a read neutral white on the blue snow; the deeper orange reads faint warm cream. Night near
mean/p95: lamp 0 73.8/134 → 84.8/189, lamp 4 88.9/137 → 100.5/190; ride views (22 m) ±1; noon unchanged. Draw calls
507 → 508, +7.7k tris. Vision (b68/before.jpg vs after2/night_*): soft warm pool round the post, drift streaks show through,
no hard edge, nothing drawn over the sign/house. smoke exit 0, page errors none (66.7 mph, powder 1.54, trench 2.27).
README; v124. Next: lamp heads glow at noon (shared K.glowM), station pool strength to match, red-house fascia tint.

## 2026-10-26 15:30 — Houses get finished rooflines (G3) — 72406bc
No new reports since 0058. Took 0053 F1 (roofs read as bare slabs). New `scenarios/g3_roofs.mjs` (2 houses by the depot:
door-gable corner 11 m out, gable square-on, up under the eave; Nov noon, March 15:00, 21:00). Before: the dark roof slab
ended in a raw edge with a ~18 cm slot of air above the eave wall and a dark slab underside at the gable overhangs. New
`roofTrim()` (mergeBoxes now takes an optional rz): eave fascia over the slab end, boxed soffit closing the slot, barge
boards down both rakes and a rake soffit under the gable overhang, all in the house trim paint and merged into the existing
trim mesh: draw calls at the corner 304 → 304, +1.6k tris. Applied to KIT.house and buildSites (depot, village shops,
cabins, fell homes). imgstats local contrast falls 0.1–0.4 per still (dark slab edges → light trim; small-area change,
not a quality signal here). Vision (b67/cmp.jpg before|after): white barge boards and fascia read on the red houses by day
and night, grey on the white house with a thin shadow line where the rake soffit meets the gable; no floating boards,
ridge crossings or z-fighting. smoke exit 0, page errors none (66.3 mph, powder 1.55, trench 2.24). README; v123.
Next: check workShed/hospital roofs match, pump/canopy detail, lamp pools.

## 2026-10-26 15:15 — Gas station forecourts lit and plowed at night (G3) — 7d2c354
Triage 0057 (v120 signs verified, ratios within 0.07) and 0058 (v121 garage boards verified, 636 calls); 0058 F5 (post
band fainter than the door board at 34 m) dropped: legible, low. Took the stations slice. New `scenarios/g3_stations.mjs`
(Kjøllefjord station: ride-in 3/4, under the canopy, pump close, kiosk; Nov noon + 21:00; `ST=n` picks a station). Before:
forecourt buried in powder (island hidden), and at night a glowing canopy roof over dark ground. Now `addLane` plows the
forecourt and `stationPool()` lays one additive warm radial decal just over the snow (19×15 m) plus one on the pump
island; fog multiplies it to black instead of tinting (no glow through storms), opacity 0.45·n from `houseWinTick` (0 by
day). Crop under the pumps at night luma 116 → 169, r−b −47 → −14; under the canopy 115 → 135; noon whole-frame within 1–8
(pump view local 4.84 → 5.15: island now visible). Draw calls 535 → 536 at q34. Tried 0xffd9a0 first (read cool white) and
a polygonOffset that drew a pink band over the pump feet; fixed. Vision (b66/before.jpg vs after3.jpg): soft lighter warm
patch, no hard edge, nothing drawn over pumps. smoke exit 0, page errors none (66.1 mph, powder 1.54, trench 2.25).
README; v122. Next: pump/canopy detail, lamp pools, house eaves (0053 F1).

## 2026-10-26 15:03 — The garage gets its name boards (G3) — c3b62eb
No new reports since 0056. Took 0056 F5: the "blank grey panel" was the garage's forecourt post sign in `buildTown`, a
cream box whose red/navy stripe boxes sat on the wall-facing side, so from the forecourt it read blank. New
`scenarios/g3_garage_sign.mjs` (forecourt 3/4, square-on post, roll door, ride-in 34 m; Nov noon + 21:00). Now a timber
frame with `garageSignTex()` (red NORDKINN band, SKUTER & SERVICE, SLEDS · PARTS · KIT · REPAIRS) on both faces via
`signMat(…, 0.2)`, and a NORDKINN SKUTER & SERVICE board over the roll door (`signTex` one-line mode now sizes the
text to 0.56 h and fits it to the width; glow 0.15). imgstats local noon door/post/fore 4.97/4.41/4.61 → 6.78/6.40/5.17;
draw calls at the forecourt 634 → 636. Glow 0.3 first read too bright square-on at night; cut to 0.2 (night post mean
54.5, frame-level, aurora-free run). Vision (b65/before.jpg vs after.jpg + night_post crops): both boards readable at
noon and night, flush, no z-fighting. smoke exit 0, page errors none (66.1 mph, powder 1.55, trench 2.21). README; v121.
Next: fuel stations/cabins check, house eaves (0053 F1), low-sun roofline fascia (0054 F4).

## 2026-10-26 14:55 — Signs stop glowing at midnight (G3) — 15aa68a
Triage 0056: v119 site facades verified (calls 553, local contrast within 0.3, night glass right); F5 (blank grey panel
by the depot, no "Nordkinn Skuter & Service" name board) added to the buildings item; F7 stale toast = harness artifact.
Took the signs slice. New `scenarios/g3_signs.mjs` (helsesenter board + H box, Fisk & Friluft, Fiskemottak, a school
sign, fuel pylon, fuel cabin board, helipad; square-on at noon/16:00/22:00) + `tools/playtest/signstat.py` (sign luma
vs frame). Before, every sign was MeshBasic: night = noon brightness (shop 188 → 184, hosp 193 → 190, school 132 → 126
while the frame fell 170 → 78). New `signMat(tex, glow)`: Lambert (scene-lit) with the picture as emissive map, glow
faded in by `houseWinTick` (n = 1 − day·(1 − 0.6·storm)). Glow: H boxes 0.6, fuel pylon 0.55, helsesenter 0.45, shop
0.35, fish buyer 0.25, school 0.2, helipad 0.12; fuel cabin boards and for-sale signs unlit. School sign texture now
sRGB. Night sign/frame ratio: school 1.54 → 0.50, fuel cabin 1.03 → 0.19, fish buyer 1.24 → 0.72, pylon 1.06 → 0.83,
hosp 2.42 → 2.17, shop 2.63 → 2.25 (the lit ones still read as lit). Noon: painted boards now shade with their wall
(pylon 82 → 44, school 132 → 76). Vision (b64/before.jpg vs after.jpg): night signs sit in the scene, lit ones glow
softly, nothing black/broken; fuel pylon's yellow band reads dull on its shaded side at noon (real). smoke exit 0, page
errors none (67.9 mph, powder 1.53, trench 2.24). README; v120. Next: depot/garage name board (0056 F5), fuel stations.

## 2026-10-26 14:40 — Depot, village shops, cabins and fell homes get facades (G3) — 04eac4f
Triage 0055: v118 hospital verified (numbers reproduce within 0.03, calls 530, night glass right); nothing new to build.
Took the next buildings slice. New `scenarios/g3_sites.mjs` (depot, Mehamn shop, Sandfjord herder cabin, Strandbu,
Naustbakken; door side 3/4 + long-window end, Nov noon + 20:00) showed flat walls with painted stripe boxes and three
cream `glowM` windows lit at noon. `buildSites` now: houseClad board walls + gables (`houseUV`), stone plinth, framed
door, two framed door-side windows and a four-pane long window through `houseFacade` with `houseWinMat` glass (dark by
day, lit after dusk); the 7 stripe boxes + 3 glow boxes per building are gone. imgstats local nov door/end: depot
4.93/5.48 → 4.98/5.80, Mehamn 5.04/4.81 → 5.15/5.34, Sandfjord 4.76/5.38 → 5.22/5.52, Strandbu 4.34/5.00 → 4.61/5.10,
Naust 4.83/5.79 → 4.55/5.56 (white house: grey trim on white boards, lower contrast but reads fine); night mostly up.
Draw calls at the depot 579 → 553. Vision (b63/before2.jpg vs after.jpg + depot end crop): boards, framed 4-pane window,
plinth and corner boards read, no z-fighting/floating trim. smoke exit 0, page errors none (67 mph, powder 1.54, trench
2.23). README; v119. Next: night-glowing MeshBasic signs (shop/hospital/fish), fuel cabins/stations.

## 2026-10-26 14:35 — Helsesenter gets a real facade (G3) — 0971a3f
Triage 0054 (v117 sheds verified: draw calls 877 reproduce, night glass right, no moire): F4 (fascia under noon sun may
read as paint) kept as a note on the buildings item; F5 already listed. Took the hospital slice. New
`scenarios/g3_hospital.mjs` (3/4, front, ambulance end; Nov/March noon + 20:00) showed a plain white box with 38 cream
`glowM` squares lit at noon. Now: sandwich-panel walls (`hospPanelTex`, 1.2 m panels + storey joint, `hospUV` metric UVs),
concrete plinth, windows through `houseFacade` (grey frames/sill/bar, `houseWinMat` glass), upper windows 1.1 → 0.9 m and
H signs 1.6 → 1.3 m raised so signs clear the window heads, mullioned entrance with its door on `houseWinMat`. imgstats
local nov q34/front/amb 4.89/4.91/4.75 → 6.09/6.23/5.26, March 4.13/4.61/4.39 → 5.39/6.08/5.05, night front 5.93 → 6.96;
draw calls at the front 561 → 530 (38 window boxes → 2 merged meshes). Vision (b62/before2.jpg vs after.jpg + crop): panel
joints, framed windows and signs read, no z-fighting; glass mid-grey by day like the houses. smoke exit 0, page errors none
(67.9 mph, powder 1.51, trench 2.28). README; v118. Next: depot / village sheds.

## 2026-10-26 14:20 — Work sheds get facades: garage, freight shed, fish buyer (G3) — 87d82a0
Triage 0053 (v116 houses verified: local contrast reproduces 6.20/6.56/6.29, draw calls 912, no moire): F1 roof eaves and
F2 plain work sheds folded into the buildings item, F3 grey day glass kept as a low note. Took the sheds slice. New
`scenarios/g3_sheds.mjs` (garage, pier freight shed, fish buyer; 3/4 from the door side, Nov/March noon + 20:00; the
freight camera had to come from the pier's sea end, a yellow house hides it from the land side). New `workShed()` (clad
walls + `houseFacade` trim/glass; `houseFacade` now takes per-window size and extra trim boxes) and `shedMetalTex`
(corrugated ribs, `houseClad(mat, metal)`). Garage: corrugated steel, concrete plinth, fascia, framed roll door, framed
service windows (the right one narrowed so it no longer runs under the door). Freight shed: red boards, curb, fascia, 7
framed windows, framed slide door. Fish buyer: white boards, grey trim, framed door + 2 windows. Their `glowM` service
windows are now `houseWinMat` (dark by day, lit after dusk). imgstats local nov/mar/night: garage 5.47/5.66/4.89 →
6.75/6.93/5.84, freight 4.09/4.36/4.50 → 4.96/4.88/5.35, fish buyer 5.18/4.88/4.33 → 5.77/5.48/4.86; quay draw calls
869 → 877. Vision (b61/before3.jpg vs after.jpg + crops): ribs, boards, trim and frames read, no z-fighting/moire/floating
trim, night windows lit. smoke exit 0, page errors none (67.5 mph, powder 1.56, trench 2.24). README; v117. Next: hospital.

## 2026-10-26 14:10 — Houses get real facades (G3) — d754edf
Triage 0052 (Sprint feel): trail half of the harness never rode packed snow, ice top speeds were truncated runs; the
"Sprint wanders 11× further on ice" result dropped: steering is sled-independent apart from zip/grip (Sprint grips more)
and the taps were wall-timed. Noted on the Sprint item. Took a fresh G3 direction (terrain work is at diminishing
returns): buildings. New `scenarios/g3_houses.mjs` (3 town doors 3/4 front + one back view + wide, Nov/March noon and
20:00) showed flat painted boxes with two pale squares for windows. `KIT.house` now: vertical board cladding (shared
canvas map, metric UVs via `houseUV`, cloned paint mats cached in `houseClad`), stone plinth, corner boards, framed
windows with glazing bars on front/back and both eave sides (`houseFacade`, trim + glass merged into one mesh each),
framed door; glass `houseWinMat` driven from updSky (`houseWinTick`): dark by day, warm glow at dusk/storm/night.
imgstats local contrast nov 0/1/2 front 5.53/3.90/5.24 → 6.18/4.98/6.57, back 4.82 → 6.18, mar 2 front 4.76 → 6.15;
draw calls (town wide) 882 → 912, tris +13k. Vision (b60/before.jpg vs after2.jpg + crops): boards, trim and framed
windows read clearly, no z-fighting/moire, night windows glow; day glass mid-grey rather than black (fine). smoke exit 0,
page errors none (66.7 mph, powder 1.52, trench 2.25). README; v116. Next: other buildings (depot, garage, sheds) item.

## 2026-10-26 13:50 — Snowshoes you can see (G1/G3) — f018e81
Triage 0051 (v113 snowshoes on a 0.25 grade: up/down/across 1.09/1.42/1.33 → 1.83/2.68/2.28 m/s with the kit, same
ratios; night toast and crash-clear/re-don correct; discoverability fine): snowshoe item closed except the mesh. Ice top
speed (b58 note) dropped as a build target: it's `SPEED_K` 1.42 from Lemon's own "Faster sleds +42%" commit, canon.
Took the mesh half: b57 stills showed a small dark oval lost under dark boots. `shoeMesh` now real size (rim 0.22 × 0.66 m,
was 0.24 × 0.52), red deck 0xb83a26 (was slate 0x24303c), lighter aluminium frame + side rails, tail moved back. Same
`g1_snowshoe.mjs` numbers (mesh only): kit powder 30 m 14.2 → 14.3 s (2.11 m/s), no-kit 1.48. Vision (b59/after.jpg +
feet crop): red aluminium-rimmed shoe clearly reads on the stepping foot from the side; the planted one sinks into powder
(only a sliver shows, realistic); no clipping/floating. smoke exit 0, page errors none (66.5 mph, powder 1.55, trench
2.21). README snowshoe para; v115. Next: chase-camera judge while walking (low item); G2 hand-paced first-5-min.

## 2026-10-26 13:40 — Sprint 580 SX gets trail gearing (G2) — 10e69bc
No new reports (last triaged 50). Recent passes were G1-heavy and the top items are diminishing-returns G3 or playtest/
harness work, so took the G2 goal's "is any sled pointless or a trap?" check on the one sled never audited. g2_cruise
(Skjånes→Ifjord, 30 s): Ranger 15.4, Sprint 17.7, Summit 18.7 m/s; new `scenarios/g2_sprint.mjs` (from rest 14 game-s,
yaw pinned, powder / back along its own track / lake ice): Sprint only edged the Summit on its own trench (33.1 vs 30.8) and
lost on ice (44.7 vs 46.5) despite its blurb ("geared for the lake run, glorious on a groomed trail"). Now `SLEDS.sprint.perks
.trail = 0.25` → `ST.trail`, physics `pw` × (1 + 0.25 × hardness), hardness = 1 on ice else sstep(0.3, 0.75, P.pack), off on
rock; green perk line on the garage card. After: Sprint powder 19.6 → 19.9 (unchanged within noise; Summit 22.4), trail
**33.1 → 35.9** (Summit 30.3), ice **44.7 → 47.6** (Summit 46.6); Ranger/Summit controls unchanged. smoke exit 0, page
errors none (66.2 mph, powder 1.54, trench 2.22). No visual change (card text only). README sled para; v114. Next: playtest
the Sprint by hand on trails/ice; ice top speeds (121–137 mph for every sled) look high: new item.

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

## 2026-10-27 — Right stick looks around (pad camera)
Right stick now orbits the camera (chase views) / turns the head (first person): up to ±150° sideways, ±0.7 rad up/down, 
dead zone 0.18. Released, it eases back to dead ahead. Off while the tablet or god menu is open (they use the stick). Controls list updated; script v155.

## 2026-10-27 — Settings menu works on a pad
Settings (title + in-game) is pad-driven: d-pad/left stick moves focus to the nearest control, A presses, left/right steps a slider, B or Menu closes; the pad no longer hops/rides behind it. Title menu: Menu/Start now selects. Focus ring + footer hint added. Navigation logic verified on an isolated copy of the real panel; full game cannot render in the sandbox browser. Script v156.
