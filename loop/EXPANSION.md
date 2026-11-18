# Four Seasons & Enterprise: the expansion plan

Lemon's brief of 10 Nov 2026, condensed, with the plan for building it. This file is the working copy: the brief's
intent lives in the "What it is" and "Rules" sections, the build order in "Milestones", and the state of the work
in "Status". `loop/LOOP.md` goal G4 and its Owner note point here. Owner notes in LOOP.md win over this file.

What comes after this expansion is already decided: The Northern Front, `loop/NORTHERN-FRONT.md` (goal G5).

## Status

| # | Milestone | State |
|---|---|---|
| 1 | Plan and scaffolding | **landed** (v167): this file, `tlx.js`, save key `x`, Options page, itch fix, `x1_save.mjs` |
| 2 | Vehicle core | 2.1, 2.1b landed (v169); 2.2, 2.3 landed (v171); 2.4 landed (v174); 2.5 landed (v176); 2.6a landed (v177); 2.6b landed (v178); 2.6c landed (v180); 2.7 landed (v185): milestone 2 done; beta fix 0142 #1 a boulder winch anchor no longer freezes the screen (v198) |
| 3 | Roads and traffic | 3.1 landed (v188); beta fix 0117/0119 standing start (v189); beta fix 0116 #1/#4 a held truck says why it won't move (v190); beta fix 0123 #1/#2 graded road bed + no tight hairpins (v191); beta fix 0121 #2/0122 #2 the pickup crawls through 30-40 cm of powder (v192); beta fix 0127 #2-#4 switchback loops (no bend under 13 m) + bends plowed wider (v194); beta fix 0131 #1/#2 the fjord rescue never lands you on a cliff face (v195); beta fix 0133 #1 no school course with your sled strapped to the trailer (v196); beta fix 0129 #1/#2 pickup traction control + "more throttle" / "steep in this snow" hints (tlx-vehicles v15); 3.2a road snow: storms fill the roads, the council plow clears them, saved, Map shows snowed in (v197); beta fix 0140 #1-#3 no 40 cm cliff, "ease off" only when the wheels spin (tlx-vehicles v16); beta fix 0141 #1 a drizzle no longer shuts the roads, the plow works through light snow (tlx-roads v6); 3.2b1 road warnings: Map legend, compass/Jobs warn of a snowed-in road on the way, pickup says the road's drifted shut (v201); 3.2b2 scraped road surface: sleds grind and spark in the wheel tracks of a freshly plowed road in a cold snap (v202); beta fix 0149 #1 a job over a snowed-in road gets a visible heads-up toast (v203); 3.3a parked cars, buried by storms, dug out by their owners (v204); 3.3b dig a buried car out by hand for pay, option digcars (v205); 3.4a a few drivers on the open roads, option traffic (v206); 3.4b1 drivers pull out round a sled or walker standing in their lane, wheels turn, a hard stop for someone stepping out close (tlx-traffic v2); 3.4b2a headlight beams + a pool of light on the road at night, a passing car's engine hum (v207, tlx-traffic v3; the "sunk cars" finding was a probe artifact); 3.4b2b a car now and then drives a village street home and parks as one of the parked cars, owners out leave empty spots (v208, tlx-traffic v4); 3.5a semis on the roads in three sizes, trailer on a tractrix coupling (tlx-semis v1, tlx-traffic v5); 3.5b1 the tractor unit you buy and drive, Freight licence, no trailer yet (tlx-vehicles v19); 3.5b2a semitrailers in road lay-bys, fifth-wheel coupling, landing legs, the trailer's weight and off-tracking (tlx-rig v1, tlx-vehicles v20); 3.5b2b1 the trailer is solid (walker, sled, pickup, the tractor's nose; road drivers stop behind its tail), the jackknife holds the lorry and says so, straight reversing asserted over 20 m (tlx-rig v2, tlx-vehicles v21, tlx-traffic v6); 3.5b2b2 a rig left standing keeps its trailer and gets a warning triangle, a sold lorry leaves the trailer on its legs, the curtainsider outside Mehamn, marker lamps lit only while coupled, low gears with a trailer on (tlx-rig v3, tlx-vehicles v22); 3.5b3a trailer runs: loaded trailers posted in Freight for tractor owners, hauled lay-by to lay-by, paid by tonnes and road km, Jobs row and the compass by itself (v241, tlx-rig v4, tlx-roads v10); 3.5b3b used tractor units on Bytteboden, standing in the lay-by nearest the seller (v242, tlx-vehicles v23): 3.5b done; 3.5c1 storm closures: a barrier at each end of the Lebesby and Mehamn roads comes down while the road is snowed in, traffic queues at it and leaves as a convoy on the hour once the plow has been, the return convoy after, board / Map legend / compass give the time, option convoy (tlx-convoy v1, tlx-traffic v7, tlx-roads v11); 3.5c2a the council's plow truck stands inside the boom, leads the convoy with its blade down and opens the snowed-in road as it goes, turns at the far gate and leads the return convoy (tlx-convoy v2, tlx-traffic v8, tlx-roads v12); 3.5c2b you in the convoy: fall in behind the line, the riding hint gives speed and gap, the convoy waits for you, leaving it between the barriers flags the Map (v244, tlx-convoy v3): 3.5 done, milestone 3 done; beta fix 0228 #1 (v248, tlx-vehicles v26): Bytteboden refuses a used truck or trailer listing that would be a 4th truck or a 2nd trailer BEFORE the cash moves (`TLXV.mkt.payWhy`), the listing's page says why, a boat no longer counts as a truck when an order is collected; next: milestone 4 (plowing solo) |
| 4 | Plowing solo (lane A) | design for 4.1 written 18 Nov, split into 4.1a / 4.1b / 4.1c; 4.1a1 landed (v245, tlx-plow v1, tlx-vehicles v24): the Fjellskjær 2.3 on the Fjellvogn (garage Plow tab, $1,450, shed), use control drops/lifts it on all three schemes, cut lane + windrow on the right, the push on the blade (30 cm ~20 km/h, 60 cm ~12 km/h, a drift over the blade stops it and says so), hints, save; 4.1a2 landed (tlx-plow v2, tlx-roads v13): the road credit: a snowed-in 400 m road stretch plowed on both sides of its centre line (out on one side, back on the other, 80% of each) is open for good, a line names the road, the hint counts both sides: 4.1a done; 4.1b split in three (18 Nov); 4.1b1 landed (v246, tlx-plow v3): HOLD the use control with the blade down to slew it (throw right / throw left / square, on keyboard, pads and touch, saved), a square blade carries and stacks, reversing with it down back-drags; beta fix 0223 #1/#2 (tlx-plow v4): the blade's control rests while Settings, the garage, the god panel or the tablet is up (no drop, lift or slew; a menu over a held press cancels it); 4.1b2 split in two; 4.1b2a landed (tlx-plow v5): the cutting edge wears with the metres cut (a point every 250 m), under 30 the cut is ragged (twice the snow left, a line, the hint), the garage's Plow tab mends it at $6 a point, a shed blade keeps its edge; beta 0220 #1 closed (a test puppet artefact, not a game bug); 4.1b2b landed (v247, tlx-plow v6, tlx-vehicles v25): the blade is solid (one more hull circle, 80 cm ahead of the bumper), option `plowtrip`: blade down over 14 km/h a rock, a log or a parked car trips it (folds over it, the truck keeps 60% of its speed, the edge loses 2-8 points), a scrape by speed and snow depth, clunks, sparks on a scraped road stretch; beta 0227 #1/#2 fixed: 4.1b2 done; 4.1b3 split in two; 4.1b3a landed (tlx-plow v7, tlx-vehicles v27): used blades on Bytteboden under Vehicles (the listing's condition is the cutting edge, collected in a pickup: bolted on at the seller's door, or to the shed if that pickup has one), through a new `TLXV.addMkt` hook for foreign Vehicles items; 4.1c split in three; 4.1c1 landed (tlx-plow v8, tlx-vehicles v28): the plow truck, Nordtrekk Brøyt 4x2 ($16,800, Freight licence, one of the three trucks) with its own 3.5 m blade from the factory (never comes off, never sold apart): 60 cm at 26 km/h against the pickup's 12, a 90 cm drift at a run, one pass down the middle opens a snowed-in road stretch; 4.1c2 landed (v249, tlx-plow v9, tlx-vehicles v29): the gritter: a 3 t hopper filled at the garage ($50 a tonne), HOLD the use control with the blade up to start/stop the spinner, 0.4 kg a metre, a gritted 10 m of road grips 35% better under any truck you drive for 6-10 h or until new snow buries it (the plow truck stops from 50 km/h in 17.9 m instead of 20.7); next: 4.1c3 (a used plow truck on Bytteboden), 4.1b3b (door counting, maybe as 4.2's first part), then 4.2 |
| 5 | Staff | 5.1 landed (v221): Staff app, applicants for caretaker jobs at your depot cabins, hire, let go, Monday wages pro rata, wages owed; 5.2 landed (tlx-staff v2): interviews in a chat, oversellers slip and get caught, references check out, wage offers and patience; beta 0173 #1 null entries fixed; 5.3 landed (tlx-staff v3): happiness, praise/criticism in person, raises and raise requests, notice and quitting, option walkout; next: milestone 6 (lane B; 5.4 plow drivers is lane A's) |
| 6 | Upkeep and lighthouses (lane B) | 6.1a landed (v229, tlx-property v1): dust and grit at your depots, sweeping and dusting by hand, cleaning kits, caretakers clean; beta fix 0186 #1 the broom is one 1.45 m length instead of stretching 1.5-1.9 m with each stroke (tlx-property v2); 6.1b landed (v235, tlx-property v3): Real Estate has a page per property type, Slettnes lighthouse station is for sale (keeper's house + tower room, each room its own dirt, let by the night, caretaker); 6.1 done; 6.2a landed (v236, tlx-lights v1): the lamp at Slettnes burns paraffin while the sun is down, 180 L tank, drums ordered in the Lights app and hauled from the quay, pumped in by hand, relit by hand, Monday stipend by lamp hours; 0196 #3 dropped (no save holds a position: every reload, from anywhere, starts on the sled at the quay; a base-game design question, not a 6.1b bug); 6.2b landed (tlx-lights v2, tlx-property v4): two smaller sea lights for sale, Finnkirka ($4,400) and Kinnarodden ($5,200), a lantern hut each with its own flash, 80 L tank, $6 / $7 a lamp hour, drums ordered and hauled per light: 6.2 done; next: 6.3 (keepers and oil drivers) |
| 4-19 | everything else | not started (split across lanes A-D, see Lanes) |
| 10 | Stores and gear (lane D) | 10.1 layers (v222), 10.2 winter store Sport & Vinter (v225, tlx-gear v2) landed; next for lane D: milestone 11 (Owner 14 Nov), then 10.3-10.4 |
| 11 | Firearms and hunting (lane D) | 11.1a rifle model + gun shop Jakt & Våpen (tlx-guns v1; fills 10.5) landed; 11.1b in the field (v231, tlx-guns v2): shoulder / aim / fire on foot, clean-kill range, spooked herds, people and houses never down-range, dress the animal, the Game tab pays; 11.2 landed (v232, tlx-gunwheel v1, an ad hoc session): hold R / D-pad left / GUN opens the quick-customize wheel; 11.3 landed (v233, tlx-guns v3, tlx-gunwheel v2): four loads for the .308 (soft point, surplus ball, match, subsonic), one load in the magazine at a time, changed at the counter or from the wheel's sixth slot; beta fix 0188 #1 the wheel shuts when the tablet comes up; beta fix 0190 #1 + 0192 #1 (tlx-guns v4): nothing fires under Settings and Settings slings the rifle, the pack stays at 120 when rounds come back out of the magazine; next: 11.1c the rifle seen on you, 11.4 parts + a second frame |
| 14 | Boats and docks (lane C) | 14.1 landed (v224, tlx-boats v1): the skiff, the jetty below the quay, water handling, getting in/out; 14.2a landed (v228, tlx-boats v2): jetties at Dyfjord, Lebesby, Ifjord, parcels hand over and pickups load at a jetty, compass to the jetty, Map anchor pins; beta 0178 #1 storm no longer sinks the skiff (v228); 14.2b landed (v230, tlx-boats v3): sea freight BY BOAT on the Parcels board for skiff owners, +35% when the road is shut, a jetty's warmth and the quay jetty's fuel: 14.2 done; 14.3 landed (v234, tlx-seafish v1): a handline from the skiff over 4 m+ of water, six sea species by depth, tugs, runs that part the line, the catch in ice fishing's cooler and sold at the Fiskemottak; 14.4a landed (v237, tlx-boats v5): the Boats app (hull, fuel and range, where she lies, MARK ON MAP, the jetties by sea) and the tow home ($40 + $30 a km by sea, x1.5 in a blow; aboard you ride along and the clock moves on; an empty tank at sea calls it with the help control); 14.4b1 landed (tlx-boats v6): the boatyard beside the quay jetty (a boathouse on piles, a slip with a hull on the cradle, a plank walk from the jetty to its door) and hull repairs at $8 a point from the Boats app's Boatyard card or the shed door's use control; next: 14.4b2 (tackle), 14.4b3 (winter haul-out, storm wear option), then 0178 #2/#3 and 0182 #1/#2 POLISH |

Checked against main at 10c6d62 (v166) on the Mac, 10 Nov:
- `smoke.mjs` passes with no environment variables set (exit 0, page errors none), before and after milestone 1.
- The cloud session's `tracklayer-expansion-m1.patch` never reached the Mac (not on disk, no branch on origin), so
  its three commits were rebuilt here from the brief: this file + G4 + Owner note, the itch fix, and the harness
  change (here: `mksite.py` copies every top-level script; the Linux-only part was not needed and is not done).
  If the patch turns up, do not apply it: it will conflict with this.
- `btn(action)` was not on main at v166 (only the tutorial's private `TUT_L` / `tutBtn` table). Slice 2.1 (v168)
  made it the general helper.
- The old full-time builder and playtester loops are retired (Lemon, 6 Nov). Since 11 Nov Lemon has this expansion
  built, and every small part beta-tested, on the Claude usage he is forecast not to spend that week: a governor
  (`~/.hermes/scripts/usage_budget.py`) opens one pass at a time, a Sonnet beta tester and an Opus builder taking
  turns. Beta reports land in `loop/reports/` (title starts with the slice id; findings marked BLOCKER, BUG or
  POLISH); a BLOCKER or BUG on landed work is fixed before the next slice. Sessions Lemon starts still build here
  too, in the same worktree `~/Documents/GitHub/tracklayer-expansion` (branch `expansion`, lands on main): fetch
  and rebase before a push, and check `usage_budget.py status` for a running pass before editing.

## Lanes (Lemon, 14 Nov 2026: "use much more of my plan")

Up to four builders work at once, each in its own worktree and branch, each landing on main. A usage governor
(`~/.hermes/scripts/tl_lanes.py`, no AI) switches lanes on and off so the Claude week is spent by its reset
without locking Lemon out. A pass builds only from its own lane's list, in order.

| Lane | Worktree (`~/Documents/GitHub/`) | Branch | Owns, in this order |
|---|---|---|---|
| A | `tracklayer-expansion` | `expansion` | 3.5, then milestone 4 (plowing), then 5.4 (plow drivers) |
| B | `tracklayer-expansion-b` | `expansion-b` | 5.1-5.3 (staff), then 6, 7, 8 (property, lodging, workshops) |
| C | `tracklayer-expansion-c` | `expansion-c` | 14 (boats), then 15 (aircraft) |
| D | `tracklayer-expansion-d` | `expansion-d` | 10, 11, 12, 13 (stores, hunting, fire watch, sap and berries) |

Unowned: 9 (four seasons) and 16-19 (streaming, the new lands, final balance). They cut across everything, so
only ONE lane works on them at a time: the first lane to finish its list writes its letter beside the milestone
in this table's "Owns" column (commit that claim alone and push it before building) and takes it. A lane whose
list is done and that finds the unowned work claimed helps by taking the last milestone of the longest other
lane's list, again by writing the claim here first.

Lane rules:
- Beta BLOCKERs and BUGs go to the lane that owns the system; lane A also takes any on milestones 1-3 and on the
  base game. A lane leaves another lane's findings alone.
- A slice that needs something another lane has not landed yet (staff for 6.3, plow for 5.4) builds against the
  default it would have without it, or the lane moves to its next slice and notes the dependency here.
- Shared lines collide: the `tracklayer.js?v=` bump and script tags in index.html, the `api` in
  `initExpansion()`, this file's Status table, README. Keep bridge edits small, always fetch and rebase just
  before landing, resolve conflicts by keeping both sides, take the `?v=` one past origin's, then re-run smoke
  and your scenario. `loop/PROGRESS.md` merges by union (`.gitattributes`): both entries are kept.
- `scripts/gate.sh` and `scripts/land.py` work on `TL_WT`: lanes B-D run them as
  `TL_WT=~/Documents/GitHub/tracklayer-expansion-b bash .../gate.sh ...` (land.py pushes the worktree's branch).
- Status: each lane keeps its own milestone's row in the Status table; never rewrite another lane's row.

## What it is

Tracklayer becomes a year-round life on the Nordkinn. You still start as a courier with one old sled. Money now
buys places and machines that earn while you ride, and each one is also a job you can do by hand.

1. **Enterprise.** Lighthouses, inns, a hotel, a plowing company, fire watch towers, workshops. Run each by hand,
   hand it to staff, or mix.
2. **Four seasons.** Winter stays the heart. Mud season, summer and autumn become playable; the skip stays a choice.
3. **More machines.** Trucks, vans, cars, four-wheelers, side-by-sides, golf carts, semis, trailers, roads that need
   plowing, boats, bush planes.
4. **Two new lands.** Greenland and a Maine-style American county, generated in chunks, wilder the further out.

Must not change: snow is the main mechanic, handling is realism-first, nothing existing is removed, and a player
who ignores all of it and delivers parcels finds the game as good as today. The Nordkinn stays hand-built and home.

## Rules for this work (on top of LOOP.md)

- **Finish what you start.** A slice lands complete or is reverted and logged "not landed" with the reason. No
  half-wired features on main, no orphan branches, worktrees or stashes.
- **One change per pass, verified by playing it**: a scenario written for the feature (`tools/playtest/scenarios/
  xN_*.mjs`, asserting, exit 1 on a failure), then `smoke.mjs` exit 0 with "page errors: none".
- **Player-facing change**: README.md, script version bump, commit message saying what the player notices, ending
  `; script vN`.
- **Controls**: every prompt through `btn(action)` (keyboard, each pad brand, touch); every feature fully usable on
  all three. Mount/dismount stays Q / LB / GET ON and takes the nearest vehicle; the on-foot prompt names it.
- **Animation**: new people and animals meet the realistic-animation rule (LOOP.md Owner note 30 Oct).
- **Performance**: frame time and draw calls before and after anything heavy, on the low preset too.
- **Old saves always load.** `x1_save.mjs` must keep passing.
- **Canon numbers stay**: sled prices, delivery requirements, contract pay, top speed.
- **Decide and log.** Only the open decisions below wait for Lemon, and each has a default to build meanwhile.
- **Suggested additions ship as options**: each behind its own `TLX.option` switch on Settings > Options, saved
  with the game, on by default. Off must leave no trace in play.
- **When you stop**, leave a report in PROGRESS.md: what landed (hashes), what is in progress and where, what is
  deferred and why.

## How it is built

**One file per big system**, after the `icefish.js` precedent: `tlx.js` is the core, each system is
`tlx-<system>.js`, loaded by index.html between `tlx.js` and `tracklayer.js`. `tracklayer.js` grows only by bridges.
`mksite.py` and the itch workflow pick up every top-level `.js` on their own.

**A system** calls `TLX.register({ id, v, state0, migrate, init(api), tick(dt), monday(week) })` at load and reads
its state with `TLX.state(id)`. It reaches the game only through the `api` that `initExpansion()` in
`tracklayer.js` hands to `TLX.boot`: add to that api when a system needs more; never reach for a global.

**The save**: one key, `x`, in `tracklayer.save.v2`:
`x: { v, region, opt: { id: bool }, sys: { id: { v, s } } }`. No `x` (every save before v167) means every system
starts from `state0`. Fields `state0` has and the save lacks are filled in; `migrate` handles real changes. State
for a system the build doesn't know is written back untouched. `TLX.load` never throws.

**Tunables**: one table per system at the top of its file, laid out like `SLEDS`, `RE_CABINS`, `RANKS`.

**Regions**: no system reads a Nordkinn constant. Place comes from `api.world` (ground, snow, sea, sites, latitude)
and anything tied to a place is keyed by `TLX.region()`. Milestone 16 swaps `api.world` per region.

**Money**: weekly money goes through `monday(week)` (called from `CAL.onDayChange` on Mondays, beside the rent) and
over the summer through `SEASON.addBill`. Milestone 9 must make the skip settle every skipped Monday.

**What already exists to build on**: `TABLET.register` + `STORE` (apps), `RE_CABINS` / `RE_UPS` / `SEASON.addBill`
(weekly property), `INT` (walk-in rooms), `addYard` / `addLane` / `buildLanes` (plowed ground, static today),
`HITCH` / `TOW` (towing), `MKT_CATS` / `MKT` (used goods, haggling chat, lemons), `BOG` / `WINCH` (stuck),
`CAL` / `MELT` / `seasonTurn` (calendar, melt, summer skip), `quadMake` / `WILD` (animals), `SCHOOLS` (licences),
`mount` / `dismount`, `jobsList()` (anything trackable needs a row).

## Milestones and slices

Land in order. Each milestone is playable and complete when it lands. 2 to 8 all work in today's winter.

### 1. Plan and scaffolding — landed
- [x] 1.1 `tlx.js` core, save key `x`, Options page, `initExpansion` bridge, Monday hook, itch workflow copies every
      script and checks index.html against the build, `mksite.py` likewise, `reload()` in lib.mjs, `x1_save.mjs`.
- [x] 1.2 This file, LOOP.md G4 + Owner note.

### 2. Vehicle core (`tlx-vehicles.js`)
- [x] 2.1 `btn(action)` (v168): the tutorial's label table lifted into `INP` / `BTN` / `btn(action)` (keyboard, Xbox,
      PlayStation, Nintendo, touch), the tutorial card uses it, the api carries it. `x2_btn.mjs`. No visible change.
- [x] 2.1b (v169) "use" on all three schemes: on foot, pad L3 and a touch button that wears the verb (`footUse()`:
      DIG / STOP / HOOK / UNHOOK / STRAP / HELP UP / LOAD / RIG TOW) do what E does; `BTN.use`, `BTN.reel`, `hk()`;
      the on-foot hint line, bogged line and rescue prompts name the right control. `x2_use.mjs`.
      Left: X (size it up / double the line) is keyboard + Xbox X only in text; about 30 older toasts still
      hard-code keys (crash, bog, rescue call-out, help). Move each when its system is next touched.
- [x] 2.2 (v171) The vehicle interface: `tlx-vehicles.js`, a `VEHICLES` table and a driver object (core, restat, visual,
      eye, mount, dismount, mountTick, dismountTick, nearMount) behind a small `VEH` bridge in tracklayer.js, every hook
      behind `if (VEH.cur)`. P is the active vehicle; parked ones are records in `TLX.state("vehicles")`; `swapTo` is the one
      place P, GS.fuel, GS.load and the bog state change hands. The nearest vehicle becomes P while you are on foot (1 m
      hysteresis), so Q / LB / GET ON and the hint ("get in the pickup" / "get on the sled") talk about it. The sled is
      untouched with nothing owned. `x2_pickup.mjs`.
- [x] 2.3 (v171) One pickup, the Fjellvogn ($4,200, 1,900 kg, 70 L, 8 parcels, heated cab): extruded bevelled body, glass,
      bed, four wheels that steer, spin and ride the ground one by one (one InstancedMesh), a seated driver baked from the real
      walker (2 draw calls), lights that follow night, door that swings, walk-up / step-in / sit / pull-shut and the reverse.
      Wheeled physics on the snow field (sink from depth and pack, rolling resistance, belly drag, mu-limited traction and
      grip, Ackermann, wheelspin digs into the game's own bog, ruts pressed by each tyre via `pressSnow`, thin ice with the
      truck's mass, water through the existing dunk), trees and buildings dent it instead of ejecting you. Garage "Trucks"
      tab, parked on the plowed forecourt, saved with fuel / cond / parcels, reload while seated returns you to the seat.
      About ten draw calls for the truck. `x2_pickup.mjs`.
      Left over (not done, not hidden from the player): the garage preview does not show the truck (the showroom orbits P);
      `cond` only trims engine power a little and is not shown in the HUD; no engine or door sound of its own (the sled's
      engine note plays); tyre tracks and spray are the sled's particles; the mount animation was judged from stills at
      0.1 s, not tuned further; steering wheel hands are baked static (the arms sway a little with the wheel).
- [x] 2.4 (v174) Tablet, map, jobs and parcels from the pickup's cab. In any vehicle (`VEH.cur`) the tablet is the held
      overlay (`modeNow()`), since the dash glass belongs to the parked sled and the dip would fly the camera to it; first
      person in a cab keeps the HUD minimap (`tabView_sync`). Map: `tabMe()` (the walker on foot, else P) for YOU and the
      around-me centre, `tabVehPts()` pins every vehicle you aren't in (layer "vehicles" from tlx-vehicles.js + P when on
      foot). Parcel toasts / board say "in the bed" in a truck (`rackW()`). `x2_cab.mjs` (keyboard, pad, touch, claim,
      quay load, Jobs, delivery, on foot, back on the sled).
      Left: a cab-mounted tablet with the dip (a holder on the truck's dash) instead of the overlay; the Parcels board's
      own route chart and the sled's dash minimap still centre on P (the vehicle) when on foot; aurora tourists still
      auto-board at the quay in a truck and are posed on the parked sled's seat.
- [x] 2.5 (v176) The universal hitch: one small coupling for sled, pickup and every small trailer; receivers stay as
      weight ratings. The five existing rigs hook to the pickup. `state.rig = { on: "sled" | uid | null, kind, x, z, yaw }`
      in tlx-vehicles.js (default "sled" = every older save). On foot at the tongue, use (E / L3 / touch) UNHITCHes it (it
      stands on its jack) or HITCHes it to whichever machine's ball is within 1.6 m of the coupler; `footUse`/`footAction`
      branches + the on-foot hint. Ratings: the sled's receiver part (`recvOk`), the pickup's `hitchKg` 1,500. `towStep` runs
      for whichever machine is P when the rig is on it (physStep calls it after `VEH.cur.core`), the truck adds the rig's
      mass (inertia only) and drag; `stats()` skips the hitch part when the rig is off the sled and the truck's `restat`
      takes its bays / groom / burn. Big loads ride with the trailer (serLoad keeps them now) and block unhitching, as does a
      casualty in the toboggan. A rig fitted at the garage (or bought on Bytteboden) goes on the sled. `x2_hitch.mjs`.
      Left: no hitch/unhitch animation (the walker stands at the tongue, the coupler drops on: a toast says what happened);
      the rig doesn't block the walker; a parked truck's big loads don't show on the trailer while you're on the sled until
      you drive it (they're there: drawn from GS.load); camera pull-back while towing uses the sled's numbers in a truck too.
- [x] 2.6 A trailer that carries a sled: ramp, drive on, strap down, tow behind the pickup, drive off. Split 11 Nov
      (too big for one pass) into:
  - [x] 2.6a (v177) The sled trailer itself: the Fjordhenger deck trailer ($950, 420 kg, one per player) on the garage's
        Trucks tab, parked on the forecourt. Single axle, 3.9 m deck at 0.55 m, A-frame tongue to a coupler 3.6 m ahead
        of the axle, jack, fenders, tie-down rings, tail lights, a full-width ramp gate hinged at the deck's tail. It is a
        second thing a truck's ball can hold (not a `GS.own.parts.hitch` rig: the sled can't tow its own carrier): a truck
        holds the rig OR the trailer, never both, and the sled never takes it. On foot at its coupler, use (E / L3 / touch)
        HITCHes it to a truck whose ball is within 1.6 m, or UNHITCHes it (stands on its jack); at its tail, use LOWERs or
        RAISEs the ramp (only unhitched or with the truck parked). Behind a truck it follows by single-axle trailer
        kinematics (axle stays 3.6 m from the ball, jackknife stop at ±70°), pitch from the coupler height, roll from the
        ground under each wheel; the truck carries its 420 kg (inertia) and its rolling drag (sink of its tyres in the
        snow). The walker is stopped by it; a Map pin "Sled trailer" when you aren't towing it. Saved as
        `state.haul = { on: truck uid | null, x, z, yaw, ramp }` in tlx-vehicles.js (null = not owned; every older
        save). Assert scenario `x2_haul.mjs`.
        Left: the sled drives through it (2.6b makes ramp + deck a ride surface); the truck and the trailer don't collide
        (jackknife stop only); no hitch animation (toast); no trailer tyre tracks.
  - [x] 2.6b (v178) Drive on and off: with the ramp down the ramp and deck are a ride surface for the sled (the sled climbs
        them under its own power; skis on the deck), a stop at the front rail; on foot beside a sled on the deck use
        STRAPs it down (and UNSTRAPs it). Strapped, it cannot be ridden off (throttle does nothing, a hint says so).
        Built: `VEH.deck(x, z, yRef)` (deck plane from the drawn trailer pose, ramp from the hinge at its own angle; a step
        over 0.35 m isn't climbable) read through `sledRide()` in physCore, the sled's pitch and a parked sled; on the deck
        the sled rides as hard pack (no plough, ruts, stamps or bounce). `VEH.deckClamp(P)` after collide(): the front stop
        rail, and a low sled is pushed out of the trailer's box (sides, front, tail with the ramp up); a hit over 2 m/s
        thuds, over 4 knocks fragile parcels. `state.haul.strap = { x, z, yaw }` (trailer frame) or null: strapped,
        physCore gives no throttle or motion and `strapTick` glues the sled (P or its parked record) to the deck, so a
        hitched trailer already carries it; four yellow straps drawn; a toast on throttle. The ramp refuses to rise
        under a sled on it. `x2_deck.mjs` (28 asserts).
        Left for 2.6c: the strapped sled's weight on the truck (inertia, hitch rating), towing it at speed checked
        end to end (pin, camera, reload while hitched), mounting a sled on the deck still uses the ground swing.
  - [x] 2.6c (v180) Towing it: a strapped sled is weight on the truck's ball (`carriedKg`: the sled's 280 kg + 6 kg a parcel
        in its rack) as inertia and through the trailer's tyres as rolling drag, and it counts against the receiver's rating
        when you hitch (or strap onto a hitched trailer). Towed with the ramp gate down its lip drags (`RAMP_DRAG` 2,200 N) and
        a toast says so once per tow. A sled towing its own rig can't be strapped (the hint says to unhitch it first). A
        saved strap spot is clamped onto the deck, nose forward (report 0100). Already working from 2.6b and now asserted end
        to end: sled glued to its strap point while towing and turning, the Map's Sled pin rides with it, reload while
        driving keeps truck + hitch + strap, unstrap/strap on keyboard, Xbox, DualSense and touch, backing off the ramp of a
        hitched trailer. `x2_tow.mjs` (33 asserts). README "Towing the sled".
        Left: mounting a sled that stands on the deck still uses the ground swing (the walker climbs on from the snow
        beside the deck); no hitch / strap animations (toasts); the trailer has no tyre tracks.
- [x] 2.7 (v185) Bytteboden "Vehicles" category: used Fjellvogn pickups (from 6 deliveries, up to 3 trucks counting paid-for
      ones) and a used Fjordhenger sled trailer (anyone without one). tracklayer.js only bridges (`MKT_CATS` "veh" + `mktV()`
      branches in mktInfo / mktPool / mktMake / mktHowTo / heldWhy / mktCollect / mktPic); tlx-vehicles.js answers through
      `VEH.mkt` (pool, info, why/tell texts, howTo, blocked, collect, pic). Wear, haggling and the 1-in-6 lemon are the
      marketplace's own. Collected at the seller's, the machine is set down in their yard (`spotNear`, generalised from
      forecourtSpot: 8-30 m out, dry, clear, level, facing away) at the real condition, a pickup with a quarter tank; you walk
      over and get in. Wear: a truck's cond already trims power (50% = 83%); the trailer now has `haul.cond` (missing = 100,
      every older save) and rolls heavier (`haulWear`, 50% = +30% rolling drag). Repair on the garage's Trucks tab ($20 / point
      truck, $4 / point trailer) within 40 m of the garage, which also mends tree dents. README "Vehicles"; Progression-map
      row for the pickup in LOOP.md. `x2_vehmkt.mjs` (34 asserts).
      Left: no wear look on the truck or trailer models (the listing photo shows specks); no Workshop-style "wear marks stay";
      a used pickup is always the blue Fjellvogn.

#### Design notes for 2.2 to 2.6 (worked out 10 Nov from reading the code; follow unless the code proves them wrong)
**P is the vehicle you are using.** The whole game reads `P` (camera, HUD, site detection, warmth, deliveries, bog,
reset, minimap), so a second vehicle does not get its own body: the *active* vehicle owns `P`, and every other owned
vehicle is a parked record `{ uid, id, x, z, yaw, fuel, cond, load }` in `TLX.state("vehicles")`. Swapping vehicles
= write P's pose, `GS.fuel` and `GS.load` into the record of the one you leave, read the other's into P / GS,
`restat()`. `VEH.cur` (in tracklayer.js) is `null` for the sled or the driver object of the active vehicle.
- **Nearest vehicle wins, on foot**: each frame on foot, if another owned vehicle is nearer to the walker than P
  (1 m hysteresis; not mid-mount, not with the winch line hooked, not in the tutorial, not indoors), swap to it. Then
  `mount()`, the on-foot hint, dig, GS.near and the sled pin all refer to the nearest vehicle with no other change,
  and Q / LB / GET ON keep working as they are. The hint names it: `keyHint("mount", "get in the pickup")`.
- **Hooks tracklayer.js needs** (keep them few, all behind `if (VEH.cur)`): `physStep` → `VEH.cur.core(dt)` instead
  of `physCore`; `restat()` → `VEH.cur.restat(ST)` overrides (fuel, burn, slots, coldMul for a heated cab);
  `updVisuals` → draw `sledRoot` and `towVisual` at the sled's parked pose (swap P's pose fields in and out round
  those lines), call `VEH.cur.visual(dt)`, take the first-person eye from `VEH.cur.eye()`; `rider.visible` false;
  `winchDef()` → null (the winch is the sled's); `towStep` skipped (the sled's rig stays with the sled until 2.5);
  `enterBog` / hint text say "stuck to the axles" not "bogged to the skis"; mount / dismount animations are the
  vehicle's (`VEH.cur.mountTick`), the sled's stay as they are.
- **Wheels on the snow field** (realism-first, the sled keeps the fell): per wheel read depth `d` and fresh `f`
  (`depthAt` / `freshAt`); sink = `d * (0.35 + 0.65 * (1 - pack))`. Rolling resistance rises with sink; past ground
  clearance (about 0.24 m) the belly drags hard. Traction is `mu * M * G` with mu about 0.4 on plowed or hard-packed
  ground, 0.22 in loose snow, 0.15 on ice. Ackermann steering from wheelbase, lateral grip capped by mu (it
  understeers on ice). Engine force beyond traction is wheelspin: it digs, and enough of it calls the game's own
  `enterBog` so digging (use), reset and the stuck UI all work unchanged. Each wheel presses a rut (a new small
  `pressSnow(x, z, r, k)` helper beside `stampAt`), so reversing out along your own ruts works, as in life.
  Thin lake ice goes through `thinIceStep` with the truck's mass. Open water sinks it: the existing dunk and rescue.
  Trees and buildings stop it (no ejection in a cab: damage to `cond`, shake, thud).
- **Tunables** in a `VEHICLES` table at the top of `tlx-vehicles.js` (id, name, cost, mass, power, fuel, burn,
  wheelbase, track, clearance, tyre radius, mu table, bed slots, cab warmth, hitch rating).
- **Model**: an extruded side silhouette with a bevel (not a stack of boxes), glass, four wheels that turn, steer
  and ride the ground one by one, lights that follow `updSky` like every unlit thing, a seated driver built with
  `makeWalker`. Getting in: walk to the driver's door, door opens, step up, sit, door shuts (realistic-animation
  rule: judge from still strips).
- **Price**: the pickup is a mid-ladder buy (about the Trekker, $3,400 to $5,200): in today's winter it is only good
  on plowed yards, lanes and hard pack, and it comes into its own with roads (milestone 3) and summer.

### 3. Roads and traffic (`tlx-roads.js`)
- [x] 3.1 (v188) The network: streets in Kjøllefjord and the villages, roads between towns on sensible lines (graph +
      meshes), shown on the Map. Static first. `tlx-roads.js`: six routes (Kjøllefjord-Mehamn past the wind farm,
      Gamvik + Slettnes, Dyfjord, Skjånes, Lebesby, and the Ifjordfjellet fell road, shut for the winter) worked out at
      boot by A* on a 16 m grid (grade-shaped cost, 16 directions, sea/houses/boulders out, lakes dear, shared trunks),
      rounded, ending at a village's edge or beside a station's forecourt with a street to the middle. Winter state:
      plowed (yard hard pack at k 0.9, 3.2 m each side) except the fell road; trees cleared from the corridor; 831
      orange snow poles (one instanced mesh); village streets to every lit door; painted on the Map chart (shut road
      dashed). Nothing saved (same terrain, same roads). `TLXR.near/onRoad` for later slices. Test `x3_roads.mjs`.
      Not done here (later slices or follow-ups): no road surface mesh of its own (the plowed snow is the road), poles
      are not obstacles, no bridges (the Gamvik leg finds a land neck), the Kjøllefjord-to-station hop is a street.
      Beta fix 0123 (v191): the road bed is graded (`bed()`: profile smoothed + grade relaxed to 8%, side-by-side
      stretches share a height, 4 m ground grid cut/filled level to 6.8 m each side with ~1:1.6 banks, max 8 m, not
      under houses/boulders/stations/ice/sea, far mesh re-read via `api.world.terrain.refresh`), and the A* pays 20
      cells for a cell next to one of its last 16 (no V-spikes or hairpin legs closer than ~32 m). Test `x3_roadbed.mjs`.
      Beta fix 0127 (v194): a switchback tip turning > ~100 deg gets a loop of 16 m (or 13.5 m) radius out past the
      point (`bulbs()`: the legs stay put, road is added on the landing, so the climb isn't shortened; rounding the V
      inside was tried first and cut Lebesby by 800 m to 18-24%); `widen()` then eases any bend left under 13 m;
      bends under 26 m are plowed 2.6 m wider each side. Test `x3_hairpin.mjs` (min radius per route + a driver who
      slows for bends on fv888/lebesby/skjanes, no bog).
- [x] 3.2a (v197) Dynamic road snow: each open road is cut into 400 m stretches with their own snow (0 plowed .. 1 level
      with the snowpack), filled by the storm over each stretch (`WX.at` at its middle, 0.16 per game hour at full
      strength, nothing under ~0.3), setting how hard its legs are plowed (k = 0.9 x (1 - snow), 0.05 steps, re-read
      through the new `api.world.replow` = `plowRefresh` in tracklayer.js; `addLane` returns its legs). Refill lets the
      snow drift in at the storm's rate; the council plow (waits 0.75 h after the weather eases under 0.45 at the
      road's first end, then 5 km per game hour) cuts each stretch back at once. Snowed in at 0.35+: the chart repaints
      that stretch ice blue (casing painted once, a copy kept, colours redrawn over it on a change), a toast when the
      first road goes and when they're all open. A clock jump over 2 h (sleep, skip) finds them plowed. Saved in
      `x.sys.roads` (v2: `{ r: { id: { s, p, w } }, h, warned }`); yards, streets and the quay stay plowed. Test
      `x3_roadsnow.mjs`.
- [x] 3.2b1 (v201, tlx-roads v7, tlx-vehicles v17) Road warnings: the road graph (each route's waypoints joined by its
      stretch between them) finds a trip's way by road; each end anchors to a waypoint within 150 m, else the road
      within 60 m (at its distance along it), else a waypoint within 350 m, else it's sled country and never warns. A
      snowed-in stretch (or the shut fell road) on that way is appended to the compass row and the Jobs app row
      (`TLXR.trip/tripWarn`, cached per 30 m and per repaint). The Map app has a road legend (open / snowed in + count /
      closed, `TLXR.legend`, refreshed with the widget). The pickup's stuck line in snow on a drifted stretch, or on the
      fell road, is `TLXR.drift` ("The road's drifted shut. Wait for the plow or take the sled."), ahead of the driving
      tips in `stillWhy`. Test `x3_roadwarn.mjs`.
- [x] 3.2b2 (v202, tlx-roads v8) Scraped road surface: a stretch the plow cut (saved per stretch: `r[id].t`, the game
      hour it was last plowed; a sleep marks what it cleared) stays scraped while fresh (full to 8 h, gone by 20 h), clear
      of new snow (gone by 0.1) and cold (month temperature + 3 x weather, as the Weather app reads it: 0 at -3, full at
      -7: a clear November day 0.16, December to March clear 1). Wheel tracks are 0.8 and 2.4 m off the crown, ~0.3 m
      wide; between the ruts and the shoulders stay hard pack. `TLXR.scraped(x, z, lx, lz)` = track 0.5 + each ski 0.25
      by how squarely each sits in a rut -> `P.scr`: rolling drag + P.scr x (400 + 70 x speed) N (`SCR_DRAG`), sparks
      off the skis' front halves (carbide/ice skis more), a higher scrape in the hiss, "Scraped road" on the HUD. Old
      saves: never plowed, nothing scraped. Test `x3_scraped.mjs`. Not done: no visible dark wheel-track stripes on the
      road (the plowed snow is the road mesh); the pickup is unaffected (a scraped road is good for tyres).
- [x] 3.3a (v204, tlx-cars v1) Parked cars: `tlx-cars.js`. About half the lit doors (seeded per door, 24 on the
      Nordkinn across 10 places) get a car nosed in toward the house, 3.5 m out from the wall and 3.2-4.4 m to one side
      of the door, only where it fits (plowed ground yardAt >= 0.3, 5.8 m+ off a road, slope < 14%, clear of the sea
      and every obstacle). Eleven Norwegian colours, a third taller estates. Six instanced meshes for all of them
      (paint with per-car colour, glass, dark trim + wheels, lamps, roof/hood snow, drift): +6 draw calls. Three
      obstacle circles each (`o.car`, top = the roof, a jump clears one). Snow per car `b`: the storm fills it at the
      roads' rate (0.16/h at full, ramp 0.5-0.95); a dusting shows on roof and hood, a drift (flattened hemisphere)
      from 0.1, "buried" from 0.35, at 0.85 the car is hidden under a full drift. Owners dig out after their own wait
      once the weather at the car is under 0.45 (seeded: 1-10 h, a quarter 20-60 h), so after a storm some stand clear
      and some are still drifts. Clock jumps over 2 h are stepped through at the weather of the moment (72 h cap).
      Saved `x.sys.cars` = `{ h, c: { "x_z": [b, waited] } }` for snowed cars; older saves: all clear. `TLXC` for
      tests. Test `x3_cars.mjs`. Decisions: cars aren't on the Map; no cars at the stations/quay (doors only).
- [x] 3.3b (v205, tlx-cars v2) Option "Dig out buried cars" (`TLX.option digcars`, on by default). On foot within
      1.45 drift radii (1.95 x 3.15 m half-axes) of a car with b >= 0.35 the use control offers "dig out <owner>'s car
      (about $N)". It's the first `api.footx` provider: tracklayer.js `footX()` holds { use() -> {label, hint(), act},
      digging() }, asked by footUse / footAction (after the rig's tongue) and the #wnHint line, only with the sled free
      and never where the tackle shop / fish buyer own E (`FISH.ctxLabel()`: gameKey hands them E first). Use = FOOT.dig
      (the bog dig's crouch, no walking); use again, walking off, getting on or the option off stops it. b falls from b0
      (snow when you started) to 0 in 20 s (just buried) .. 40 s (full drift) game time; pay $40-90 on the same scale,
      owner's name in the toast, cash to GS.cash. Once per car per storm (`paid` until the weather there drops under
      0.45). An owner whose wait runs out mid-dig finishes it: no pay. Saved: `x.sys.cars.c[key]` gained [.., b0, paid]
      (older saves: none). Decisions: no shovel item exists yet, so all by hand (a later shovel can shorten digT); no
      Jobs row; owners are first names (seeded per door). Test `x3_digcars.mjs`.
- [x] 3.4a (v206, tlx-traffic v1, tlx-cars v3) A few drivers: `tlx-traffic.js`, option "Road traffic" (`traffic`, on).
      Cars drive the open roads' road part (first to last non-street point of each route; a street hop in the middle
      at 6 m/s on the crown) in the right-hand lane 1.6 m off the crown, at most 12.5 m/s, each point capped at
      sqrt(1.9 R) with a 1.6 m/s^2 braking profile both ways. A driver stops 7.5 m (centre to centre) behind anything
      within 2.3 m of its line ahead (cars, P, the walker, parked vehicles and the parked sled); 22 m short of a shut
      stretch (TLXR seg.shut), waits 10 s and U-turns (7 s half-ellipse across the road, 5.5 m forward swing); at a
      route end waits 4 s and U-turns, or out of sight (> 300 m) drives on into the village and respawns; held up 25 s
      by something that doesn't move: U-turns. The bubble: 6 cars (3 on GFX.low) placed on open, unshut road 600-1400
      m from you (220-1300 at boot), dropped and replaced past 1800 m. Solid: three r 0.95 circles; the sled/truck is
      pushed out and its into-car speed reflected x1.45 like a boulder (thud, cargoHit, a toast over 4 m/s, the car
      sits 3 s); the walker is pushed aside. 4 instanced meshes reusing the parked cars' shapes (`TLXC.geo`); lamps
      unlit, brightened by night from dayFactor. Nothing saved. `TLXT` for tests. Test `x3_traffic.mjs`.
      Not done (3.4b): wheels don't turn (merged into the trim mesh), no engine sound or headlight beams, cars don't
      pull out round a parked sled (they wait, then turn back), no crashes into you at speed (they always stop), no
      traffic on village streets, cars not on the Map.
- [x] 3.4b Traffic polish, split 12 Nov:
  - [x] 3.4b1 (tlx-traffic v2, tlx-cars v4) Pull out round a stopped obstacle + turning wheels + the hard stop (beta
        0159 #1/#7). A car stopped TRAF.passWait (3 s) behind something that isn't moving (your sled, a walker, a parked
        truck, a stopped car; never for the road's end or a drift, never on a street hop) checks the other lane
        (`laneClear`: nothing from 8 m behind to 110 m ahead, cars either way, you, walkers, parked things) and that the
        road's own limits leave room (obstacle + 9 + 12 m), then moves over at 1.4 m/s (angled into it, 1.5 m/s forward
        until most of the way over), creeps past at 5 m/s and moves back 9 m beyond it once its own lane is clear
        (stretches the pass for a queue). Met by something in the other lane mid-pass it stops; after 6 s it moves back
        in. No U-turn while passing. stopAhead looks down the lane it's heading for (`sh` = target lane - lane).
        Braking: max(3.2, 1.15 x v^2/2d) up to 8 m/s^2, so a walker 45 m in front of a car at 12.5 m/s gets 7.49 m
        (was 5.7). Wheels: a fifth instanced mesh (4 per car, rim + dark cross, faces flush with the body side at
        x 0.8) turned by the distance rolled (`c.roll`); the trim mesh lost its wheels (`TLXC.geo.trim/wheel`).
        `TLXT.place(id, s, dir, i)` places any car (car 0 still hides the rest), `TLXT.startTurn`, `TLXT.passes`.
        Test `x3_pass.mjs`; `x3_traffic.mjs` holds passWait off for its stop steps.
        Found, not fixed: from a low side view the driven cars look sunk to the sills: the near snow mesh's CPU
        heights read ~0.74 m above `surf()` on the open road (`x3_carsink2_probe.mjs`), so the lower body and most
        of the wheels are under the drawn snow (3.4a stills show it too; from above the wheels read). First item of
        3.4b2.
  - [x] 3.4b2a (v207, tlx-traffic v3) Beams, hum, and the sunk-car question. The "~0.7 m above surf()" reading was the
        probe's mistake, not the game's: the near snow patch's CPU positions are a flat y=0 grid (the vertex shader lifts
        each vertex to the snowTex height), so a raycast against it measures nothing. `x3_carsink3_probe.mjs` compares
        the patch's drawn heights (pdata = ground + depth, what the shader reads) with surf() over the whole 256 m patch
        and under a car: 0 of 10201 cells off by > 5 cm, before and after a natural recenter. Low stills
        (`x3_carsink_look.mjs`) show the cars on the snow with whole wheels; from a camera out past the plowed berm
        (0.47 m higher 3 m off the lane) the berm hides the lower wheels, which is real. Nothing to fix.
        Beams: a sixth instanced mesh, two soft additive cones from the headlamps (17 m, front faces only, vertex-colour
        fall-off, faint at the lamp) + `T.pool`, one mesh for all cars: an 11 x 15 grid per car laid on surf() each night
        frame 1.2-20 m ahead (follows rises and dips; a flat sheet sank into the first rise). Brightness = darkness
        (dayFactor 0.75 -> 0.3) x camera distance (full to 260 m, 0 by 520: additive light would glow through fog).
        Hidden by day (no draw calls). Hum: one voice on the game's audio master (mute/volume apply), the loudest car
        within 150 m: sawtooth + triangle through a low-pass at 32 + 4.4 v Hz, plus band-passed noise for tyre crunch,
        gain 0.11 x (1 - d/150)^2 x (0.45 + 0.55 v/12.5), x0.25 indoors; a watchdog fades it if the tick stops (option
        off, season card). api gained `audio()`. Test `x3_beams.mjs`.
  - [x] 3.4b2b (v208, tlx-traffic v4, tlx-cars v5) A car now and then on a village street to a door, then parked
        there as one of 3.3a's cars. At boot `homesPrep()` finds the parked cars a driver can reach (19 of 24 on
        Nordkinn): the nearest route street point (of up to 4 tried) in front of the spot, W.laneRoute from it to 5.5 m
        out in front of the spot (the lane 3.1's streets() plowed), then the straight nose-in; kept only if the whole
        drive (from the road's end, or 25 m up a street hop both ways, Chaikin-rounded) keeps the car's three r 0.95
        circles >= -0.06 m from every house, shed, tree and other parked car (the body's half width is 0.88). About 30%
        of those owners are out (`TLXC.setAway`: hidden, obstacle circles out of the grid via the new `world.dropOb`, no
        snow, no DIG, not counted buried). A driver nearing the road's end at street speed (or on a street hop, 8-30 m
        before the branch) takes a free spot there with chance 0.5; and every 110-220 game s, with you within 420 m of a
        free spot, a car bound for it is put on the road in 170-300 m back and >= 160 m from you (never over a shut
        stretch). Home drive: street speed 6 m/s, sqrt(1.9 R) round the corners, eases to a stop on the spot
        (1 m/s^2), stops 5.5 m behind someone in front (things beyond the spot ignored); held up 30 s with you > 120 m
        off it parks (or gives up if the spot itself is taken). Arrival: the parked car is back, the traffic car goes
        and turns up elsewhere 20 s later. It's the owner's car on the way (colour + size). Option "traffic" off: every
        owner home. Nothing saved (a reload picks who's out afresh; never a car under saved snow or paid this storm).
        Harness: `lib.mjs` launch() brings every owner home unless `process.env.TL_AWAY` is set (older scenarios pick
        parked cars by index). Not done: owners never drive OFF (a parked car
        pulling out and heading for the road); no cars on Kjøllefjord's own lanes beyond the routes' streets. Test
        `x3_home.mjs`.
- [x] 3.5 Semis in a few sizes with their own coupling. Option: storm closures and convoys on the fell road. Split 14 Nov
      (lane A) into three passes:
  - [x] 3.5a (tlx-semis v1, tlx-traffic v5) Semis on the roads: `tlx-semis.js` holds the sizes and their shapes, the road
        driver in `tlx-traffic.js` drives them. Three sizes inside the Norwegian 4.0 m / 16.5 m rules: `dist` (2-axle day
        cab + 10.5 m reefer box, 14.0 m), `haul` (3-axle high-roof sleeper + 13.6 m curtainsider, 16.5 m), `tank` (3-axle
        day cab + 11.6 m fuel tanker, 15.1 m); cab and trailer colours picked per lorry. TRAF.semi.n = 1 (low) / 2 (else)
        extra drivers after the cars (car indices unchanged). Same driver as a car but max 11 m/s, bends at 0.88x the car
        speed, pull-away 0.6 m/s^2, stopping with its bumper (`c.fro`) the gap short. The coupling: the kingpin sits on the
        tractor's fifth wheel just ahead of its drive axles, and each frame the trailer's axle point is pulled straight
        toward the kingpin until it is the trailer's wheelbase behind it (a tractrix), so it cuts inside a bend and
        straightens after; steer wheels turn from the yaw rate (Ackermann). Others see a semi as three points (tractor
        middle, trailer middle, a car-centre just ahead of its tail) so a car stops short of the TAIL and passes it whole;
        solid along its length (circles r 1.27 over tractor and trailer). A semi never U-turns on a two-lane road: at the
        end, a drift or something that won't move, it waits and is gone once you're 250 m off; it pulls out round a
        stopped thing moving back in only once its trailer is past; it never drives home to a parked spot. Lower, slower
        diesel note in the hum; "lorry" bump toasts. API: `TLXT.semiInfo(i)`, `TLXT.place(id, s, dir, i, type)`, `TLXS`.
        Test `x3_semis.mjs`.
  - [x] 3.5b A semi you drive. Split 14 Nov (lane A) into three passes:
    - [x] 3.5b1 (tlx-vehicles v19) The tractor unit, bobtail. NOT a `TLXV.addKind` kind: it is a second row in
          `VEHICLES` on the pickup's own wheeled physics (snow sink, traction, bog, ruts, the "why won't it move"
          toasts all carry over), because a kind with its own impl would have had to copy all of that. The row's extra
          fields are the pickup's old constants: `model` (builder), `dualX` (twin rear tyres, 6 wheel instances),
          `rimK`, `bed`, `brakeN`, `aero`, `lock`, `circles`, `belly`, `lamp`, `cab` (seat and door against the
          pickup's; the baked driver, steering wheel and door keyframes are offset by it, hips rising 0.9 m up the
          steps), `lic`, `fifthZ`. "Nordtrekk 4x2", $11,500, 7.2 t, 250 kW, 20 kN, limited to 25 m/s, 300 L at 2.4x
          the pickup's burn, 2 parcels in the cab, no ball (`hostPose` returns null without `hitchKg`). Licence: the
          Freight licence (`GS.lic.freight`), not a new CE school: SCHOOLS courses are flown on the school's sleds, a
          lorry course needs the trailer first, so a CE course is listed under 3.5b3. Not on Bytteboden yet. The
          model is `buildTractor` in tlx-vehicles.js (its own cab interior for first person), not TLXS's traffic
          tractor, whose cab is a closed box. Measured (`x3_tractor.mjs`): 8.6 m/s at 4 s (pickup 14.0 on the same
          road), 20 m/s at 12 s, 20 -> 0 in 46 m (3.9 m/s2), reverse 3.7 m/s, 0.5 m of powder: 0 m and bogged.
    - [x] 3.5b2 Semitrailers and the coupling (new `tlx-rig.js`, state id `rig`): two or three semitrailers (TLXS
          trailer shapes: box, curtainsider, tanker) stand on their landing legs at the Kjøllefjord quay and the fuel
          depot. Back the tractor's fifth wheel (`fifthZ`) under the kingpin (within 0.4 m and 10 deg, under 1.5 m/s):
          it locks with a clunk; on foot at the legs, use winds them up (and down again to unhook, anywhere flat
          enough). Coupled: the trailer follows on 3.5a's tractrix (`TLXT`'s follow rule, lifted into TLXS so both
          use it), reversing included, where it swings the other way; past 60 deg of articulation the tractor is held
          ("jackknifed: pull forward"). Its mass and rolling drag go into the tractor's `core` through the two hooks
          the sled trailer already has (`haulKg`, `haulDrag`: generalise them to "what is on this truck"), brakes
          scale with the trailer's axles, the chase camera backs off (`VEH.camTow`), the walker and the sled are
          stopped by it, the Map pins it, the save keeps where each trailer stands and what it is coupled to. Asserts:
          couple / refuse (too fast, too crooked, legs down = no drive), off-tracking on a bend, straight reversing
          holds for 20 m with small corrections, jackknife stop, uncouple and drive away, reload coupled and parked,
          pad and touch for the legs. Split 14 Nov (lane A) into two passes:
      - [x] 3.5b2a (tlx-rig v1, tlx-vehicles v20) The trailers, the coupling, the legs, the follow rule, the
            weight. As built it differs from the line above in four places. WHERE: not the quay or the fuel depot
            (no room to back a 14 m rig there) but plowed lay-bys beside the road, found at boot by `findBay`
            (first straight, level, clear 37 m of shoulder; `RIG.spots`): a box trailer (`kj`, TLXS `dist`, 7.2 t)
            257 m out on fv888, a tanker (`lb`, `tank`, 6.4 t) 150 m from Lebesby's end; the curtainsider row
            exists in `TRAILERS` with no spot yet. CATCH: 0.45 m, 10 deg, under 2.0 m/s (1.5 was hard to hold on
            a keyboard's all-or-nothing reverse); it re-arms once the fifth wheel has been 1.2 m clear. FOLLOW: the
            tractrix lives in tlx-rig.js (8 lines), not lifted into TLXS: traffic's copy works on route
            parameters, this one on the tractor's pose. HOOKS: not `haulKg`/`haulDrag` generalised but a second,
            general one beside them, `TLXV.addLoad(fn)` -> `{ kg, pin, drag, brakeN, hold }` per truck uid (whole
            mass as inertia, 24% of it on the tractor's tyres, the axles' rolling by their snow sink, 16 kN of
            brake per axle capped at 0.4 g of the axle weight, `hold` = legs down = parked); `TLXV.pose(uid)` gives
            a truck's pose whether or not you are in it. Legs are an `api.footx` provider (LEGS UP / UNCOUPLE),
            uncoupling refused on more than 8% of grade. Chase camera through `VEH.camTow`, Map pins on the
            vehicles layer, state `rig.t[spot] = { x, z, yaw, on, legs }`; a save naming a tractor that is gone
            loads with the trailer on its legs. Articulation is clamped at 60 deg (the trailer binds on the cab)
            but nothing tells the driver yet. Measured (`x3_rig.mjs`, 38 asserts): 14,400 kg coupled; 3.2 m/s
            after 4 s on a road with 10 cm of snow (bobtail 8.6); trailer drag 3.5 kN on 9.7 cm of sink.
      - [x] 3.5b2b The rest. Split 14 Nov (lane A) into two passes:
        - [x] 3.5b2b1 (tlx-rig v2, tlx-vehicles v21, tlx-traffic v6) Solid, jackknife, reversing. SOLID: each
              trailer is 6 circles (r 1.3, at most 1.9 m apart, nose to tail) in the game's own obstacle grid
              (`api.world.addOb` / `dropOb`, as the parked cars), moved with the trailer whenever it has moved
              3 cm, so the walker, the sled, the pickup and anything else that reads the grid meet it with no
              code of their own. tlx-vehicles' `collide` asks `TLXRIG.pass(o, uid, def)`: the lorry a trailer is
              coupled to passes all of its circles (the jackknife rule keeps the cab off it), another tractor
              unit passes only the front ones (within `RIG.frontPass` 3.6 m of the kingpin) and only while it is
              in line ahead of the kingpin, backing in. Road drivers: `TLXRIG.bodies(out)` adds the body's
              middle and a point 1.5 m ahead of the tail to tlx-traffic's `bodies()`, moving with your lorry.
              JACKKNIFE: past `RIG.jack` (60 deg) while backing up, the tractor is put back where it stood a
              frame ago and loses its rearward speed (`T.jkT`, view `jk`), toast "Jackknifed: ... Pull forward";
              the load hook's new `held` flag stops the lorry's own "can't find grip backing up" line. Going
              forward it stays the clamp (the trailer is dragged round; holding there would trap the player).
              Measured (`x3_rigsolid.mjs`, 20 asserts): walker 1.39 m from the centre line, sled stopped at
              2.82 m, tractor's centre at 4.45 m; 20 m straight back in 12 s with 19 taps of steering from a
              4 deg start, never past 4 deg; held within 0.04 m at 60.0 deg; a car stops 6.0 m behind the tail.
              Not done: a moving trailer is not itself stopped by houses or parked cars (only the tractor is);
              traffic does not collide with the body, it only stops for it.
        - [x] 3.5b2b2 (tlx-rig v3, tlx-vehicles v22; `x3_rigleft.mjs`) A rig left standing, the third trailer,
              lamps, numbers. LEFT: `left(T)` = away from its own lay-by (`RIG.triHome` 4 m) and nobody at its
              lorry's wheel (on its legs, or coupled to a lorry you swapped away from); such a trailer has a red
              warning triangle `RIG.triBack` 12 m behind its tail (nearer if that is water or an obstacle), and
              leaving a coupled rig toasts once per leaving. It STAYS COUPLED (decision: dropping it on its legs
              on a swap would strand it on a slope and undo the player's work). A lorry gone from the save
              (sold) leaves the trailer on its legs and says so. THIRD TRAILER: `mh`, the curtainsider (haul,
              6.8 t), at the Mehamn end of fv888; `findBay` now also wants the bay level along the trailer
              (`bayGrade` 5%; kj and lb did not move). LAMPS: unlit material driven from dayFactor in pose():
              0.55 by day, 2.15 after dark while coupled, 0.12 after dark on its legs. NUMBERS (asserted): the
              14.4 t rig reaches 21 m/s (76 km/h) on the most level 900 m of cleared road (13.3 at 10 s);
              at the bare tractor's 20 kN it could not start on a 9% road, so the row has `fmaxLow` 30 kN,
              used only with a semitrailer on: standing start on 9% makes 64 m in 14 s, on the steepest 80 m
              of open road (fv888, 12.5%) 60 m in 19 s; taken at 12 m/s it never drops under 7.3 m/s.
              Not done: the triangle is not an obstacle (traffic stops for the trailer's tail, 3.5b2b1), no
              pad/touch-specific text (the toasts name no control). 0206 #5 POLISH (a car vs a trailer on its
              legs in a lay-by) stays open. Original line, kept for reference:
            jackknife = the tractor held with "jackknifed: pull forward" (today only the clamp);
            the trailer as a solid thing (walker, sled, traffic and the tractor's own cab corners stopped by it:
            circles along its length as TLXT does for traffic semis, registered with whatever the parked cars
            use); straight reversing asserted over 20 m; a coupled trailer left behind when you swap vehicles or
            sell the tractor (today `hostOf` drops it on its legs only when the record is gone); a third trailer
            (curtainsider) at Mehamn or Ifjord; coupled rig top speed and hill numbers by script; the trailer's
            marker lamps at night (they take scene light only). Asserts as listed above for jackknife, reversing
            and solidity.
    - [x] 3.5b3 Trailer freight: Freight board rows for trailer runs between the road villages (pick the loaded
          trailer up at one yard, drop it in the other's), paid by road distance and weight, Jobs app rows, compass
          to the trailer then the yard. Used tractors on Bytteboden "Vehicles". Optional: a class CE course on a
          school lorry in place of the Freight-licence gate. Split 16 Nov (lane A) into two passes:
      - [x] 3.5b3a (v241, tlx-rig v4, tlx-roads v10; `x3_rigrun.mjs`, 40 asserts) Trailer runs. The "yards" are
            the three lay-bys (`T.bay`: the middle of the 22 m of plowed room in front of the lay-by's own
            trailer; `RIG.spots[].bay` names them). `offerFor(T)`: one run per trailer, from where it stands to a
            lay-by more than `RUN.minD` 300 m away, lay-by and cargo (`CARGO` by trailer type, 2.6-4.0 t) picked
            by a hash of trailer id, day and runs done; pay = `RUN.base` $150 + `RUN.perTKm` $26 x tonnes x km
            of road (`TLXR.tripDist`, new: the trip graph's distance), to $5. Measured: kj -> lb 4.2 km $495,
            lb -> mh 8.7 km $1,010, mh -> kj 4.5 km $625. Posted in the Freight app's new "Trailer runs"
            section (licence + an owned tractor; licence alone shows a note; no licence, nothing); TAKE, one
            run at a time, GIVE UP for nothing. The cargo's kg rides on the trailer (`loadOf`: inertia, pin
            share, axle drag and brake grip). Delivered when the trailer stands uncoupled within `RUN.dropR`
            40 m of the far bay; +10% (`RUN.bonus`) with both ends `RUN.clear` 4.3 m off the road's centre
            line. `left()` no longer puts a triangle behind a trailer stood clear of the road in ANY lay-by.
            Saved in `rig`: `run { id, to, cargo, kg, m, pay } | null`, `done`, `told` (one tablet notice);
            a run naming an unknown trailer or bay loads as no run. BRIDGES (tracklayer.js, general): `jobX()`
            (api.jobx: functions returning a `jobsList()` row; a row with `auto` leads the compass when
            nothing of the base game's is on: `ax` in `updGameHud`), `appX(id)` (api.appx: `{ html(), bind(el)
            }` sections, rendered by the Freight app above "Posted"), api.payMul / licensed / fmtTime.
            Loaded numbers (17.6 t, on a rail): standing start on 9% 27 m in 14 s; on the steepest 80 m
            (fv888, 12.5%) it does NOT get away ("Too steep to climb in this snow"); taken at 12 m/s it is
            over, never under 3.3 m/s. Decision: left as is (cargo kept to 4 t so the run-up always works);
            a beta tester should try stopping on that stretch mid-run. Not done: runs do not expire or come
            due; no condition/bond; the delivered trailer never goes home by itself; the tanker and
            curtainsider were not driven loaded; no pad/touch-specific text (cards are tablet buttons, the
            legs are the existing footx provider).
      - [x] 3.5b3b (v242, tlx-vehicles v23, tlx-rig v5; `x3_usedlorry.mjs`, 42 asserts) Used tractor units on
            Bytteboden "Vehicles". `MKTV.pool` lists item `tractor` for a Freight licence holder with
            `MKT_LORRY.need` 6 deliveries, under MAX_OWNED trucks (held orders of either truck now count), none
            already paid for; weight 0.6, 0.12 once you own one. WHERE (decision): a lorry can't be dug out of
            a cabin yard and the spots `spotNear` finds are unplowed, so a used one stands in the semitrailer
            lay-by nearest its seller (`TLXRIG.bays()`, which now carry `yaw`): `MKTV.sitesFor(item, sites)`
            keeps only sellers within `MKT_LORRY.r` 1500 m of a lay-by (11 of the seller sites today: 9 round
            Kjøllefjord 136-1105 m, Lebesby 172 m, Mehamn 504 m), and `collect` stands it in the bay's line,
            facing out, at the first of `MKT_LORRY.slots` (5, -3, 8, 1 m ahead of the bay's middle) that is
            clear of obstacles (the trailers are in the obstacle grid) and 7 m from your other machines; so
            two fit, and with none free the seller says the lay-by is full (`MKTV.noRoom`) and the
            marketplace retries as for a blocked yard. You still settle up at the seller's door; the howTo
            line, the paid toast and the keys toast name the lay-by and the distance, and the lorry is on the
            Map's vehicles layer like any truck. Price from the marketplace's own formula on $11,500: seen
            $6,100-$10,300. Photo: a drawn cab-over. BRIDGES (tracklayer.js): `mktMake` asks `VEH.mkt.sitesFor`
            (no site = no listing), `mktCollect`'s no-room nag asks `VEH.mkt.noRoom`. The garage's Nordtrekk
            row and `buy` know about a paid-for used one. Measured: it pulls out of the lay-by 15.7 m in 5 s.
            NOT built (both were optional): a class CE course on a school lorry (the Freight licence stays
            the gate), runs with a due time. Not done: no pad/touch-specific work (no new control: tablet
            buttons and the existing get-in); nobody drove one home by hand from Mehamn.
  - [x] 3.5c Option "Storm closures and convoys" (`convoy`, on): when a storm shuts the fell road (TLXR seg shut on the
        Kjøllefjord-Lebesby leg), traffic queues at the barrier; once the plow opens it, a convoy leaves behind the plow
        at fixed times (the real Norwegian kolonnekjøring): semis and cars in line, 30-40 km/h, gaps 30 m. The player can
        join at the back; leaving the line before the end is allowed but flagged on the Map. Map/compass show the
        barrier and the next convoy time. Split 16 Nov (lane A) into two passes:
    - [x] 3.5c1 (tlx-convoy v1, tlx-traffic v7, tlx-roads v11; `x3_convoy.mjs`) The barriers, the queue, the convoy
          times, the line. New `tlx-convoy.js` (state id `convoy`, nothing saved: the state follows from the saved
          road snow). CONVOY ROADS: a route row with `convoy: [end name, end name]` in tlx-roads' table: `lebesby`
          and `fv888` (decision: the Mehamn road crosses the same fell). GATES: found at boot by `findGate`, the
          first spot `CV.inset` 420 m or more in from each end of the road part that is driven at full speed for
          48 m either side (falls back to 9, then 6.5 m/s), off the streets, 45 m from any other road's line, 70 m
          from a lay-by; measured: lebesby 756 m and 840 m in, 2331 m apart; fv888 684 m and 540 m in, 3753 m
          apart. STATES per road: `open` -> `shut` (a stretch between the gates at TLXR's shut level) -> `wait`
          (plowed; `at` = the next full game hour at least 0.2 h off) -> `run` (dir = the side with the longer
          queue; its gate admits for `CV.joinT` 30 s, the far gate stays down; ends when no member is left between
          the gates, or after length / 10 m/s x 1.6 + 60 s) -> a second `run` the other way if the far side has a
          queue (`back`) -> `open`. Nobody queued at the convoy time: straight to `open`. TRAFFIC (hooks in
          tlx-traffic.js): `stopAhead` asks `TLXCV.stopFor(route, s, dir)` (why "gate", 7 m short of the boom; a
          driver already past the line, or leaving from inside, is not stopped); a driver standing at a gate, or
          behind one who is, has `c.gq` and neither pulls out nor turns round nor gives up; `spawn` skips
          `TLXCV.barred` (between lowered gates, 120 m either side); a member (`c.cv`) keeps to `CV.v` 10 m/s and
          `CV.gap` 30 m behind the member ahead (a floor: more than 4 m further back it may do `CV.close` 1.2x to
          close up, but everyone slows for the bends in turn; measured 44 m between two cars after 56 s on lebesby). `stopAhead` now also returns the car it stops for (`o`). SEEN:
          per gate a cabinet, a 7.9 m striped boom on a pivot (lifts for a driver leaving from inside), two unlit
          red lamps driven from dayFactor that flash in turn while it is down, a board with a canvas face (CLOSED /
          14:00 next convoy / NOW convoy leaving / WAIT convoy coming / OPEN); drawn within 520 m. TOLD: a toast
          within 80 m of a gate, once per state; the Map legend line and a red dot per lowered gate (tlx-roads:
          `R.paintX` painters, `R.repaint()`); `R.trip` gives why "convoy" with the note when the way crosses a
          plowed road whose gates are still down (snowed in keeps its own warning). Not built here (3.5c2): the
          plow truck at the head, the player as a counted member, the Map flag for leaving the line. Not done: the
          boom is not solid and nothing checks that the player waits; a driver between the gates when they close
          carries on to the drift and turns round as before; a convoy that meets a fresh drift mid-run crawls or
          stops at it by the old rules; nobody watched a full 2.3 km crossing (the scenario moves the line up).
    - [x] 3.5c2a (tlx-convoy v2, tlx-traffic v8, tlx-roads v12; `x3_plowlead.mjs`) The plow truck at the head.
          Split 17 Nov (lane A) from 3.5c2. THE TRUCK is one more `TLXT.cars` entry per convoy road (`plow: true`,
          after the semis, so car and semi indices are unchanged): tlx-traffic's road driver drives it, tlx-convoy
          decides where it is and draws it (a cab-over, a gritter body, an angled mouldboard on a push frame that
          drops 0.32 m while it leads, steered front wheels, twin rears, work lamps and tail lamps by dayFactor, two
          amber beacons flashing in turn on duty). The bubble never places, drops or sends it home; it ignores
          drifts and barriers, stops where `c.stopD` says, keeps under `c.vcap`, turns wider and slower
          (`turnT` 10 s, `bulge` 6.5 m), is seen by others at two points and is solid as four 1.3 m circles;
          a convoy member never pulls out round its plow. `T.put(car, routeId, s, dir)` places a car without the
          test hold. RULES. `shut` -> `wait` as soon as TLXR's council plow has set out since the road shut
          (`rt.outH`, or `st.p >= 0` after a reload) and the weather on the fell is under `CV.storm` 0.8: the road
          need not be plowed first, and while its gates are down TLXR leaves the stretches between them alone
          (`TLXCV.keeps`, asked in `snowStep`). In `wait` the truck is posted `CV.plowIn` 16 m inside gate 0,
          or gate 1 if you are within `CV.plowSee` 320 m of gate 0's spot (it never appears or vanishes in
          sight unless the convoy time forces it). CONVOY TIME: weather `CV.storm` or worse with the road still
          snowed in puts it back an hour; nobody queued and the road already clear: open as before; else `run`
          from the longer queue's side if the truck is there or can be moved there unseen, otherwise from where
          it stands (the other side gets the return run). LEADING: `CV.v` 10 m/s, `CV.vPlow` 7 m/s in a stretch
          it found at `plowAt` or more; `TLXR.plowSeg(id, s)` cuts the stretch `CV.plowAhead` 6 m ahead of its
          middle and stamps the plowed hour. 16 m short of the far boom it stops, U-turns across the road and
          is posted there facing back; the run ends when the cars are out AND the truck is posted; a queue on
          that side then gets the return run behind it. A run that times out (`len / vPlow x 1.6 + 90 s`) with
          the road still shut goes back to `wait` for the next hour. Road open: the truck is `free`, drives off
          along the road like a car and is gone `CV.plowGone` 300 m from you. UNSEEN PACE: a game hour is 50 s
          of play, so a truck driven at 7 m/s would keep a road shut seven to eleven game hours where TLXR's
          council plow (5 km a game hour) took about one. So while it leads no cars and is more than
          `CV.plowFar` 900 m from you it is moved by the clock at TLXR's `plowV`, cutting what it passes, never
          to within 900 m of you, and posted at the far gate without the turn; a clock put forward `CV.skip`
          0.02 h or more in one tick moves it wherever you are. Near you, or with cars behind it, it is driven.
          `CV.plow = 0` or the traffic option off: no truck, 3.5c1's rules (x3_convoy.mjs runs that way; x3_roadsnow
          and x3_roadwarn run with the convoy option off, they test TLXR's own plow). Measured: cut with the truck 6.0 m
          short of the drift's edge, 7.00 m/s in it, 9.6 m/s after, first car never nearer than 28.7 m (centre
          to centre) nor under 5 m/s once rolling, the stop 16.0 m short of the far boom; unseen it came on 1158 m
          in 16 s of play and stopped being moved 900 m from the player. From Kjøllefjord's quay both roads were
          open 1.5 to 1.75 game hours after they shut (x3_roaddrizzle's 4 h budget holds). KNOWN: with you in
          Kjøllefjord (the gates are 355 and 404 m from the quay) the truck's first few hundred metres are
          driven, so a road opens about a game hour later than before this slice; TLXR's council plow keeps
          setting out again while the kept stretches wait (harmless). NOT built: any snow
          thrown by the blade (no plume, no windrow: the stretch is cut whole, 400 m at a time, as TLXR's
          stretches are); the truck for milestone 4 to drive (this one is the council's). Not done: nobody
          watched a whole 2.3 km crossing (the scenario moves the line up); the U-turn of a 7.4 m truck on a
          6.4 m road swings its nose over the bank; fv888's truck is built the same way but only lebesby's was
          driven.
    - [x] 3.5c2b (tlx-convoy v3, script v244; `x3_convoyline.mjs`) The player in the line. Built 17 Nov (lane A).
          WHO IS IN: in any vehicle (not on foot), within `CV.youOff` 6 m of the road's centre line, facing the
          convoy's way (`Y.f * dir > 0.3`), within `CV.youJoin` 60 m behind someone in the line (`youJoin0` 90 m
          while the entry boom is up; the truck counts while it leads): "You fall in behind the car / lorry / plow
          truck", any time during a run, not only when the boom lifts. `youOn(G)` projects you on the route every
          tick the road is not open (a full scan of its points; two roads). COUNTED: the run's end test is
          `n === 0 && !Y.in`, so the far boom stays down for the return queue until you are `CV.youPast` 15 m
          out past it ("You are through with the convoy"); the boom lifts for you driving out from inside as it
          does for a car. With nobody left ahead you have `CV.youOut` 45 s to drive out. `G.tMax` still ends a
          run whatever you do. LEFT: more than `CV.youLeave` 80 m behind the one ahead, off the road or out of
          your seat, for `CV.youT` 3 s; or past the head of the line (the one you followed is still in it, behind
          you, nobody ahead); changing places inside the line is not leaving. Between the gates that sets
          `Y.flag {x, z, h}`: a flag pin "left the convoy" on the Map app (new generic `marks` layer:
          `TABLET.addLayer("marks", fn)` -> `{ x, z, name, col, glyph }`, drawn sharp at any zoom; a first
          version painted it into the chart and read as a smudge zoomed in), a legend line "<road>: you left the
          convoy", until your place along the road is outside the gates, you fall in again, `CV.flagH` 6 game
          hours pass or the option goes off; before the entry gate it is only a toast. Not saved. QUEUE OF ONE:
          standing (under 3 m/s) on the road within `CV.youQ` 60 m outside a lowered boom, facing in, you add one
          to that side's queue at the convoy time and when a return run is decided: alone at the far gate of a
          snowed-in road the truck comes through, turns and leads a return convoy for you. HINT: new bridge
          `rideX()` / `api.ridex` in tracklayer.js (a list of functions for the riding / driving hint line, after
          the base game's own): "CONVOY to Lebesby · 24 km/h (the line: 36) · 30 m behind the car · hold it
          there" (drop back under 18 m, close up over 45 m, "close up or lose the line" over 60 m; "the line is
          through: drive on out past the barrier"). No control is named, so nothing is scheme-specific.
          DECIDED: a lowered boom stops nobody, truck or sled (the default; the drift stops a truck). Nothing
          happens to a flagged player beyond the flag (no fine): left for Lemon if he wants a consequence.
          KNOWN: a car that comes up behind you at a lowered boom pulls out round you (3.4b1's rule) and queues
          ahead; the truck's U-turn at the far gate sweeps both lanes for 10 s with you 30-60 m behind it.
          Not done: you are moved by a puppet in the scenario (placed on the lane each 16 ms), nobody steered a
          sled or a pickup through a whole convoy by hand; fv888 runs the same code but only lebesby was tested;
          on foot / in a boat untested beyond the rule; no pad or touch run (the hint names no control).

### 4. Plowing solo (`tlx-plow.js`)
- [ ] 4.1 The blade (Bytteboden / garage) and the plow truck: drop it, clear a lane, leave windrows.
      Design written 18 Nov (lane A), split into three passes. Nothing below is built yet.

      **What the code gives us (read 18 Nov, main at v244).**
      - Snow is two numbers per 25 cm cell: `f` the snowpack and `d` what stands now; `pack = 1 - d/f`. A yard or a
        road leg holds its cells at `f x (1 - YARD_K x y)` (0.15 f in a yard), and `refill()` eases every loaded
        cell back to that target (1/360 a second in calm, 1/45 in a full storm; a third of that where `c.g` is set).
        Chunks are not saved: a reload starts every cell at its target. So a cut that is to last must be a LEG
        whose `Y.k` is saved by its owner (road stretches in `x.sys.roads`), not cells.
      - `pressSnow` only presses down and only round a point; nothing raises `d` above `f` today. `packOf` and the
        wheel code clamp `1 - d/f`, so `d > f` reads as loose snow that deep, which is what a windrow is. The builder
        greps every reader of `c.d` / `depthAt` once (footStep, the sled's sink, `surf`, the snow shader's pack
        channel) before relying on it.
      - A wheel reads the cell 0.42 m ahead of it and the belly reads 1.5 m ahead of `P`. A blade that cuts ahead of
        the bumper therefore removes the sink and the belly drag without touching `core()`: the truck's limit
        becomes the push on the blade.
      - `TLXV.addLoad(fn)` already feeds `core()` a `{ kg, pin, drag, brakeN, hold }` per truck uid (the semitrailer
        uses it): `drag` is taken off the push and counted in the "stuck" test, `pin` adds weight on the tyres.
        `xLoad` returns the FIRST load that answers, so two loads on one truck would need it to sum (not needed
        while blades go on pickups and trailers on tractors).
      - `VEH.cur.use()` / `useLabel()` / `useHint()` are already asked by E, pad L3 and the touch pill `#tcE` (the
        boat's handline uses them); a wheeled truck's driver has none, so E in a pickup falls through to the horn.
      - `TLXR.plowSeg(id, s)` cuts a 400 m road stretch at once, stamps the scraped hour and repaints the Map
        (3.5c2a). `TLXR.near(x, z)` gives `{ route, d, s }`: the nearest route, the distance from its line (unsigned)
        and the metres along it; `ROADS.half` is 3.2 m.
      - `api.veh.tabs` is a list: a system adds a garage tab without editing tlx-vehicles.js.

      **Decided.**
      - New `tlx-plow.js`, state id `plow` (add it to x1_save's list): `{ v: 1, blades: { truckUid: { id, cond } },
        shed: [bladeId...], m: metres cut in all }`. The blade's up/down is not saved: a reload finds it UP. A blade
        whose truck is gone (sold, an old save) moves to `shed`.
      - No `TLX.option`: the blade is milestone content, not a suggested addition. The one option in this milestone
        is 4.1b's `plowtrip` (below).
      - Control: the truck's use control (`btn("use")`: E / L3 / the touch pill, which reads BLADE DOWN or BLADE UP)
        drops and lifts it. Cost: in a truck WITH a blade the horn is gone from that control (a bladeless truck
        keeps it). No new `BTN` row. The throw side (4.1b) is a HOLD of the same control, so every scheme has it.
      - Cells for the look and the grip now, road stretches for what lasts. Off a road a cut snows in again at the
        game's own rate and a reload forgets it and the windrows: accepted for 4.1, and why 4.2's driveways and lots
        are legs with their own saved `k`, like road stretches.
      - No pay in 4.1 (that is 4.2). Canon numbers untouched; the pickup without a blade drives exactly as before
        (`addLoad` answers null).

    - [x] 4.1a The blade on the Fjellvogn: buy and fit it, drop it, cut a lane, leave a windrow, feel the push,
          open a snowed-in road stretch. Scenario `x4_blade.mjs`. Split in two when built (18 Nov):
          - [x] 4.1a1 landed v245 (`tlx-plow.js` v1): everything below EXCEPT "ROAD CREDIT". Scenarios
            `x4_blade.mjs` (mechanics) and `x4_bladectl.mjs` (control on three schemes, save, frame time, stills).
            AS BUILT, where it differs from the text below. `BLADES.z` is 3.25 m ahead of the truck's CENTRE (the
            bumper is at 2.66; the text's 1.15 m ahead of the axle would put it inside the bumper). `BL.v2` is
            0.15, not 0.035: at 0.035 the truck's 8.2 kN ran 30 cm at 36 km/h; 0.15 gives 30 cm 5.5 m/s, 40 cm
            4.5 m/s, 60 cm 3.4 m/s (measured). New `BL.over` 9000 N per m2 of snow face above the mouldboard's top:
            without it a 1.0 m drift was 5.3 kN, inside the grip, and the truck pushed through; with it the drift
            stops it 1 m in. The windrow is three rows (`BL.rows` 0.8 / 0.6 / 0.35 m over the pack, each 0.8 m
            wide), what one can't take rolling to the next: one 0.8 m row read as a wall in the stills. The face
            depth is read 0.35 m AHEAD of the blade, so the push is there at a standstill. `stillWhy` says the
            blade's own line (a load may answer `why`). A truck standing IN deep snow with its blade dropped
            is stuck where it sits (its wheels are in snow the blade never reached; with the blade up 40 cm
            creeps 6 m, with it down the extra 1.9 kN bogs it): the hint says to start from cleared ground, and
            dropping it on the move in 30 cm works. Open for Lemon: is that too harsh a first minute with the blade?
            The blade-up prompt uses the depth over what the blade would leave (8 cm+), so a plowed street doesn't
            nag. No lift sound (sound is 4.1b).
          - [x] 4.1a2 landed (tlx-plow v2, tlx-roads v13): ROAD CREDIT. Scenario `x4_bladeroad.mjs` (driven
            out and back with the keys; the counting rules by a puppet). AS BUILT, where it differs from "ROAD
            CREDIT" below. The lane is the SIDE of the route's centre line the blade's middle is on (the route's
            own segment gives the side; `near` was not needed for it), not the way you are heading: heading would
            have credited a second pass over the very same strip. 80% is asked of EACH side, not of the two
            together (together, the stretch opened three fifths of the way back). A length is marked by the blade
            passing over it down and rolling forward, whether or not there was snow left to cut there (a part
            already bare must not make a stretch impossible to finish). `TLXR.plowSeg(id, s, quiet)`: quiet keeps
            the roads' own "the plow's been round" line from being said for the player's work and resets its
            `warned` flag. The hint shows the two sides as a share of what opens the stretch (80% marked reads
            100%). State gains `opened` (stretches opened; the Plow tab's foot line shows it). Marks are wiped by
            new snow (the stretch's level 0.1 over the lowest seen since they began) or when the level is 0.
            MEASURED (Dyfjord road, snowpack about 0.9 m): a stretch at 0.5 stands 57 cm on the crown and the
            pickup plows its 400 m in 104 game s at 15 km/h, back in the same; opened 93 m short of the end of
            the way back; after it the whole 5.6 m is at d/f 0.24 or under. A stretch at 0.9 (76-88 cm) stops the
            pickup 21 m in with the blade's own line, as the design meant: that road is 4.1c's truck's. Not
            asserted at 0.9 for that reason (`DEEP=1` prints it). What the cut cells do on a still-shut stretch:
            `refill` eases them back toward the stretch's level at a third of the calm rate, so the first side is
            still clearly cut when you come back (seen in the stills), and `plowSeg` -> `replow` cuts every
            loaded cell of the width at once.
            Open for Lemon (default built): a U-turn at the end of a stretch is left to the player (the road is
            6.4 m wide; the pickup needs a three-point turn or a lay-by).
          TABLE `BLADES`: `{ id: "b23", name: "Fjellskjær 2.3", fits: ["pickup"], cost: 1450, kg: 280, w: 2.3,
          h: 0.65, ang: 0.49 (28 degrees, so it clears 2.03 m: the pickup is 1.96 wide), z: 1.15 (m ahead of the
          front axle), leave: 0.15 (of f: the yard level) }`. `BL` tunables: `face` 2600 N per m2 of snow face
          (depth x cut width), `v2` 0.035 (the face term grows by 1 + v2 x v^2), `carryN` 900 N per m3 on the
          blade, `carryMax` 1.2 m3, `rowW` 0.75 m, `rowMax` 0.9 m over f, `backN` 300 N reversing with it down.
          Reasoning for the numbers: the pickup's grip is about 7.8 kN on hard pack plus the blade's 280 kg on the
          front tyres; 30 cm of powder is a 0.61 m2 face, 1.6 kN standing and 3.0 kN at 18 km/h (steady work);
          60 cm is 3.2 kN standing and 5 kN at 14 km/h (a crawl); a 90 cm drift with a full blade is past the grip
          (take bites, or it is the plow truck's job). Tune to those three outcomes, not to the constants.
          GARAGE: a "Plow" tab (`api.veh.tabs.push`): per owned pickup "Fit the Fjellskjær 2.3" with the price, or
          "Take it off" (to the shed, refit free); the truck must stand within 60 m of the garage, and the row says
          so when it does not; no pickup: one line pointing at the Trucks tab. `api.garageRefresh()` after.
          BRIDGES. tracklayer.js: two hoisted functions beside `pressSnow`, both in `api.world`:
          `bladeSnow(ax, az, bx, bz, leave)` cuts every cell within 0.75 x CELL of the segment a-b down to
          `f x leave`, sets `c.g` (slow refill), returns the m3 removed; `heapSnow(x, z, r, vol, cap)` raises the
          cells in a disc by `vol` shared out, never past `f + cap`, sets `c.g`, returns the m3 placed. tlx-vehicles.js
          (bump its `?v=`): `TLXV.addUse({ use(R), label(R), hint(R) })` asked by a wheeled driver's new
          `use` / `useLabel` / `useHint`, `TLXV.onModel(fn(R))` called when a truck's model is built (and at once
          for those already built), `TLXV.runtimeOf(uid)`.
          EACH FRAME (tlx-plow `tick`), for the truck you are in with its blade down, on the ground, moving forward
          over 0.3 m/s: sweep the blade's line from where it was last frame to where it is now in steps of half a
          cell and `bladeSnow` each; the removed volume joins `carry`; all of `carry` that fits is laid with
          `heapSnow` just outside the blade's trailing end (the right-hand side, as the council's truck throws),
          `rowW` wide; what does not fit (cap reached) stays on the blade up to `carryMax` and the rest spills
          straight ahead of it. Lifting the blade, or stopping, drops the carry as a pile in front. The load it
          reports to `addLoad`: `kg` and `pin` 280 whenever fitted; `drag` = face term (mean depth over the cut
          line, read BEFORE the cut) + carry term while cutting, `backN` reversing with it down, 0 with it up.
          A plume off the trailing end with `api.emit`, more of it over 8 m/s.
          ROAD CREDIT. While cutting within the road's half-width of a `TLXR` route line, mark a 10 m bin of the
          stretch for the LANE you are in (`near` has no side, so the lane is the way you are heading along the
          route: up it or down it; a blade clearing 3 m or more marks both).
          A stretch with 80% of its lane-bins marked is `TLXR.plowSeg`'d (snow 0, scraped hour, Map repaint) with a
          toast naming the road. So the pickup opens a stretch by going out and coming back, and 4.1c's truck in
          one pass. Bins are not saved and are cleared when the stretch is credited or its snow rises again.
          A convoy road counts too: the convoy rules already open a road they find clear.
          SEEN: built in tlx-plow.js onto the truck's group: an A-frame from under the bumper, a lift arm and ram,
          a curved mouldboard in three strips with a steel cutting edge, two marker rods with orange tips, two plow
          lamps on a bar over the bonnet (unlit materials driven from `dayFactor`, never glowing by day or dark
          when the truck is parked). Down is 0.3 m lower, eased over 0.5 s. Parked trucks show their blade too.
          TOLD: a line on `api.ridex` in a bladed truck: blade up, standing or slow in 8 cm+ of snow:
          `keyHint("use", "drop the blade")`; down: "BLADE DOWN · 14 km/h · cutting 32 cm" with
          `keyHint("use", "lift it")`, and "the blade is full: lift it or ease off" at `carryMax`.
          ASSERTS for `x4_blade.mjs` (exit 1 on any): fresh game has the state and no blade; fitting takes $1,450
          once, refit is free, the model is on the truck; blade UP into a 40 cm field the truck stops or bogs
          within the distance x2's tests show today (base line unchanged); blade DOWN beside it, 40 m or more in
          the same game time at 3-7 m/s; behind it the centre line and both wheel tracks are at or under 0.2 f
          with `packOf` 0.9+ across 1.9 m; right of the cut, 1.2-2.2 m off the line, `d - f` is 0.10 m or more;
          left of it within 0.02 of before; volume laid within 25% of volume cut while nothing is capped; steady
          speed falls from plowed lane to 30 cm to 60 cm; a 1.0 m drift from a standstill moves it under 3 m in
          6 game s and no bog toast lies about why; one pass along a stretch set to 0.9 leaves it shut with about
          half its lane-bins, the pass back opens it (`s[i]` 0, `t[i]` stamped, status open, the toast recorded as
          it shows); blade up along another stretch changes nothing; the control under all three schemes (E, pad
          button 10 on an Xbox and a DualSense id, the pill pressed with a PointerEvent and reading BLADE DOWN /
          BLADE UP) and the hint naming `btn("use")` for each; a bladeless truck still sounds the horn; reload
          with it fitted and down: fitted and up; a save with no `x.sys.plow` loads; frame time blade down vs up
          printed, on the low preset too. Stills, looked at before landing: the truck side-on and three-quarter
          front, blade up and down, noon and night; the cut and its windrow from a tilted high camera
          (ground-relative height, 35 degrees or more off vertical) and from the cab.
          NOT in 4.1a: the throw side, a solid blade, wear, sound, the plow truck, used blades, pay.
    - [ ] 4.1b Working it properly. Split in three when built (18 Nov, lane A):
          - [x] 4.1b1 landed v246 (tlx-plow v3): THE THROW AND THE BACK-DRAG. Scenario `x4_bladework.mjs`.
            AS BUILT. A press with the blade down is no longer decided at once: `toggle` notes the time and
            `tick` decides it, lifting when the control is let go inside `BL.holdT` (0.5 s, wall clock) and
            slewing once when it is held that long (`slew`: r -> l -> s -> r, a toast, saved as
            `blades[uid].throw`; what rides on the blade drops as it swings). The held state is one new api
            field, `useHeld()` (E in `keys`, a pad's L3, the touch pill's `on` class): the only tracklayer.js
            change. So a tap lifts on RELEASE, a frame or so later than before. The mouldboard is its own
            group on a pivot (`B.S`, built square, eased over `BL.slewT`); the cut, the depth line and the
            windrow use the eased angle `B.a`, so a blade in mid-swing cuts what it covers. SQUARE: holds
            `BL.carrySq` 2.4 m3 (a slewed blade 1.2), the excess off both ends in one 0.8 m row each side; on
            a stop (1.2 s) or a lift the load is a heap `BL.stackR` 0.9 m across and up to 1.2 m over the pack
            just ahead of the blade (two fifths of it over the middle, so it is a heap and not a puck; the
            design's 1.2 m3 "straight carries everything" would have filled in 2.4 m of 30 cm snow). The
            truck will not push through its own heap (the over-the-blade term): back off and stack beside it.
            BACK-DRAG: reversing over 0.3 m/s with it down cuts the cells the blade passes to `BL.backLeave`
            0.49 of the pack (a level, so a second pass over the same cell takes nothing more: "60%" as a
            share per pass would have converged on the full cut), pulls up to 1.2 m3, then rides over the
            rest; the drag is `backN` + half the face term + the carry. The pulled snow is laid when the truck
            stops, lifts or drives forward, as a heap centred 0.45 m AHEAD of the blade's line (physically it
            lies behind the blade; laid there, the front wheels would climb into it on the way out and the
            blade could not reach it: accepted simplification). Open for Lemon (default built): the pill
            still reads BLADE UP while down, with the hold named only in the hint line.
            MEASURED (30 cm field): throw left 34 m in 8 game s at 5.5 m/s, windrow crest 0.8 m over the pack
            1.45-1.95 m LEFT of the line, the right untouched, 18.8 m3 cut = laid; square fills to 2.4 m3 in
            about 5 m, then 0.5 m rows off both ends, 4.0 m/s, a 1.2 m heap on stopping; back-drag 5 m pulls
            0.62 m3, the strip behind the blade left at 0.49 of the pack, a 0.86 m heap under the blade.
            BETA FIX 0223 #1/#2 (tlx-plow v4, `x4_blademenu.mjs`): `busy()` (Settings, the garage, the god
            panel, the death card, the tablet) makes `toggle` do nothing and `tick` drop a pending press.
            Open for Lemon (default built): with the TABLET up the blade can't be worked on any scheme (touch
            already had no pill there); the other reading is to let keyboard and pad drop/lift it behind the Map.
          - [x] 4.1b2 The solid blade and its wear. Split in two when built (18 Nov, lane A):
            - [x] 4.1b2a landed (tlx-plow v5): THE CUTTING EDGE. Scenario `x4_bladewear.mjs`. AS BUILT.
              `blades[uid].cond` (100 new) loses a point every `BL.wearM` 250 m of CUTTING (forward or
              back-dragging, only while snow comes off: `vol > 0`; rolling with the blade down over a cut
              lane costs nothing). Under `BL.ragged` 30, `leaveOf` gives `BL.raggedLeave` 0.3 of the pack
              instead of the blade's 0.15 (the back-drag's 0.49 is over both, so unchanged); one toast on
              crossing 30 and " · worn edge, a ragged cut: mend it at the garage" in the BLADE DOWN hint
              from then on. Plow tab: the Take-off row gives "Cutting edge N%"; a "Mend the cutting edge"
              row appears from one whole point of wear, `BL.mend` $6 a point (0 to 100 is $600), within
              60 m of the garage like fitting, and with less cash than the whole job it mends the points
              the cash covers. The shed keeps each blade's edge in `shedC`, beside `shed` (same order;
              `tidy` keeps them in step and clamps 0-100; an old save's shed blades are whole). No
              `plowtrip` yet, so trips do not wear it. Numbers picked, not canon (open for Lemon, default
              built): 250 m a point means about 17 km of cutting from new to ragged, or six road stretches
              out and back per $100 of edge.
              MEASURED: 38.9 m cut = 0.1555 points; a good edge's lane d/f 0.157, a ragged edge's 0.303.
            - [x] 4.1b2b landed (v247, tlx-plow v6, tlx-vehicles v25): THE SOLID BLADE, ITS TRIP AND ITS SOUND.
              Scenario `x4_bladetrip.mjs`. AS BUILT. SOLID: `TLXV.addHull(fn(R))` (new, tlx-vehicles) lets a
              system add one hull circle to the truck you drive, with `pass(R, o)` and `hit(R, hit, o, nx, nz)`
              hooks; the blade's is 2.13 m across (what the slewed blade clears + 10 cm) and reaches 3.75 m
              ahead of the truck's middle (the bumper: 2.98), blade up or down. TRIP, option `plowtrip` (on):
              blade fully down, over `BL.tripV` 4 m/s, closing at 1.5 m/s or more on an obstacle flagged
              `rock`, `log` or `car` -> the truck keeps `BL.tripKeep` 0.6 of its speed, the edge loses
              2 + 0.75 per m/s over 4 (8 at most), a thud, shake, ten sparks, one line (2.5 game s apart)
              naming the thing and the speed; `B.trip` then makes the circle let rocks, logs and cars through,
              so the thing meets the BUMPER at the speed left (the truck's own dent rule applies there), the
              mouldboard is drawn folded 0.6 rad forward, cuts nothing, and the hint says to back off; it
              springs back (a clunk) 0.45 s after nothing trippable overlaps the circle. Anything else (walls,
              trees, posts, a sled, a semitrailer), a slower truck, a lifted blade or the option off: plain
              hull. NOT built: the "kerb" of the original text (Kjøllefjord's curbs carry no obstacle, so
              there is nothing to trip on; a blade down a curbed street just plows it). SOUND: one looped
              noise voice on the game's audio (`api.audio()`, as the traffic hum), gain and band by speed, by
              the snow under the edge (`B.cut`: bare = loud and high, 25 cm+ = dull) and by `TLXR.scrapeF`;
              `api.thud` clunks when the blade lands, comes up, or springs back. SPARKS: new api field
              `spark` (the sled's ski sparks); on a stretch where `TLXR.scrapeF` is over 0.05, `BL.sparkN`
              5 a metre x the scrape factor, along the edge. Also beta 0227 #1/#2: the Plow tab floors the
              percentage under 30 (29.6 no longer reads "30%: worn ragged") and `condOf` clamps 0-100.
              MEASURED: rock at 9.1 m/s: 9.10 -> 5.54 m/s, edge 100 -> 94.1, truck 100 -> 97.6% (the bumper
              at 5.5); option off, same run: stopped at the blade, edge untouched, truck 97.6 -> 91.8%. At
              3.6 m/s: stopped at the blade, nothing lost. Scrape 2.1 kHz at 1.3 m/s to 2.5 kHz at 6.6 m/s
              on bare ground (gain 0.02 -> 0.10), 1.0 kHz gain 0.03 into 26 cm, 4.2 kHz on a scraped stretch.
              Open for Lemon (defaults built): the trip numbers (4 m/s, 60%, 2-8 points) are picked; with the
              option off the blade's own hits dent the TRUCK by the ordinary rule.
          - [ ] 4.1b3 Doors and used blades. Split in two when built (18 Nov, lane A):
            - [x] 4.1b3a landed (tlx-plow v7, tlx-vehicles v27): USED BLADES ON BYTTEBODEN. Scenario
              `x4_bladeused.mjs`. AS BUILT. The hook is `TLXV.addMkt(handler)` (tlx-vehicles): a handler
              `owns(item)` and then answers pool / info / why / tell / howTo / blocked / payWhy / noRoom /
              collect / pic / sitesFor for it; `MKTV` hands every question about such an item over, and
              leaves it out of the three-truck count and of `heldRefund` (a foreign item's `blocked` means
              "not right now", never "refund it"). No tracklayer.js change. tlx-plow's `MKB` lists item
              `blade:b23` while you own a pickup, have 6 deliveries, and own fewer blades (fitted + shed +
              paid for) than pickups; weight 0.7 inside Vehicles. The listing's condition IS the cutting
              edge (`edgeOf`: 0.72 = 72%), so the marketplace's own lemon rule (real 42-60% against 65-90%
              advertised) is a worn edge, its "It's 45%, not 80%" line is true of the edge, and the card
              prices the mend ("a new edge is $168 at the garage"). Asking price by the marketplace's own
              rule: about 65-76% of $1,450. COLLECTED in a truck it fits (`blocked` otherwise: "It weighs
              280 kg and bolts to a truck's frame: come in the Fjellvogn", so on the sled the Jobs app and
              the compass do not send you there): a bladeless pickup gets it bolted on at the door; a
              bladed one takes it to the shed (`shed` + `shedC`). A blade with `factory: true` (4.1c's) is
              never listed. Open for Lemon (defaults built): the blade reaches the shed at once from a
              bladed pickup (no "load in the bed, drive it to the garage" leg); a player with a blade for
              every pickup never sees one (no spare-blade collecting).
            - [ ] 4.1b3b Doors: a windrow laid across a door spur (`KIT.doors` lanes) is counted per door
              for 4.2's complaints. Nothing a player sees until 4.2 reads it, so it may be built as the
              first part of 4.2 (decide when 4.2's design is written). Scenario `x4_bladedoors.mjs`.
            ORIGINAL TEXT: a windrow laid across a door spur (`KIT.doors` lanes) is counted
            per door for 4.2's complaints; used blades on Bytteboden under Vehicles (a hook in tlx-vehicles'
            `MKTV` for foreign items: pool, info, collect at the seller's door into the truck you came in).
            Scenario `x4_bladeused.mjs`.
          ORIGINAL TEXT (18 Nov design): HOLD the use control 0.5 s with the blade down to change the throw: right ->
          left -> straight (straight carries everything and stacks it where you lift: for yards). Back-dragging:
          reversing with it down cuts at 60% and pulls the snow with it (away from a door). The blade is solid
          (one more hull circle while fitted) and, option `plowtrip` (on): at over 4 m/s a rock, kerb or parked car
          trips it: a thud, the truck checked, `cond` down. `cond` wears with metres cut and trips, shows on the
          Plow tab, is mended at the garage per point; under 30 it leaves a ragged cut (`leave` 0.3). A scrape
          sound by depth and speed, sparks on a scraped road stretch. A windrow laid across a door spur
          (`KIT.doors` lanes) is counted per door for 4.2's complaints. Used blades on Bytteboden under Vehicles
          (a hook in tlx-vehicles' `MKTV` for foreign items: pool, info, collect at the seller's door into the
          truck you came in). Scenario `x4_bladework.mjs`.
    - [ ] 4.1c The plow truck. Split in three when built (18 Nov, lane A):
          - [x] 4.1c1 landed (tlx-plow v8, tlx-vehicles v28): THE TRUCK AND ITS BLADE. Scenario
            `x4_plowtruck.mjs`. AS BUILT. `VEHICLES` row `plowtruck` "Nordtrekk Brøyt 4x2": the tractor's
            chassis and cab through `buildTractor` (the fifth wheel is drawn only when the row has `fifthZ`;
            `body: "gritter"` adds a hopper, tail board, spinner and beacon bar in the council truck's
            proportions), so the first-person cab is a real room. NOT the convoy's `buildPlow` meshes exported:
            those are loose meshes with no cab interior, door or baked parts, which `runtime()` needs. No
            `fifthZ`, so nothing couples to it or treats it as a tractor unit. 9.8 t, 330 kW, 40 kN at the
            wheels, top 22 m/s, Freight licence, $16,800, one of the three trucks. `BLADES` row `b35`
            "Brøytskjær 3.5" (`factory: true`, fits it only, 900 kg, 3.5 m clearing 3.1 m, mouldboard 1.15 m,
            `z` 4.5): per-blade `rows` (four, 1.15 / 0.95 / 0.65 / 0.4 m over the pack), `carry` 3 m3 (6 square),
            `whyN` 32 kN, `mz` (where its push frame meets the truck). `tidy()` gives every owned plow truck
            its blade (also next frame after buying: `tick` re-tidies when the truck count changes) and a
            factory blade never goes to the shed; `fit` / `unfit` refuse it; the Plow tab shows it "Fitted"
            and offers the mend; `MKB.pool` already skipped `factory`. The model is the pickup's blade drawn
            K = h / 0.65 times taller on a wider frame with a push plate and no lamp bar. One pass marks both
            sides (`BL.both` 3 m against the 3.09 m it clears). No tracklayer.js change.
            MEASURED: 60 cm 7.2 m/s (26 km/h; the pickup 3.3 m/s), 30 cm 9.7 m/s (35 km/h); the 60 cm lane
            cut to 0.15 of the pack across 2.5 m+, windrow 1.14 m over the pack and 2 m wide on the right,
            left untouched, 103.5 m3 cut = laid; a 12 m drift of 90 cm met at 13.3 m/s: through, slowest
            6.9 m/s; Dyfjord road stretch at 0.9 (85 cm on the crown): driven down the middle at a mean
            5.6 m/s, opened 306 m along it in the ONE pass; blade up in 40 cm: 5.5 m in 8 s; turning circle
            11.2 m at the truck's middle (about 16 m between banks with the blade).
            Open for Lemon (defaults built): the horn is gone from the use control on this truck for good
            (its blade never comes off); the numbers (9.8 t, 330 kW, $16,800 from the design) are picked.
          - [x] 4.1c2 landed (v249, tlx-plow v9, tlx-vehicles v29): THE GRITTER. Scenario `x4_gritter.mjs`.
            AS BUILT. `BLADES` row b35 gets `hop: 3000` (kg; the hopper belongs to the truck, and the plow
            system knows the truck by its factory blade), `GRT` holds the numbers. Saved: `blades[uid].hop`,
            `grit: { "routeId:stretch": { h: [game hour each 10 m length was last gritted], s0 } }`, `gritKg`.
            The control: on a truck with a hopper a press with the blade UP is now decided like one with it
            down: let go inside 0.5 s the blade drops (on release, not on press), held it starts / stops the
            spinner; blade down, the hold slews as before (so the gritter is switched with the blade up and
            runs on while you plow). NOT the design's "the hold cycles throw -> grit": that would put the
            gritter behind three slews and stop it being used with the blade up, which is how a hard road is
            gritted. Spreading: 0.4 kg a metre rolled (over 1 m/s, wheels on the ground), stamped on the 10 m
            length under the spinner (3.4 m behind the truck's centre) when that is on a road stretch whose
            snow level is 0.3 or less, or any level with the blade down and cutting. Grip: `TLXV.addGrip`
            (new, tlx-vehicles.js: a factor on `muS` once a frame, `R.grip`), 1.35 on a fresh length, full
            for 6 h, gone at 10 h, and faded out by new snow on the stretch (+0.03 to +0.1 of its level).
            DEVIATION: "raises mu on ice and scraped stretches" is built as "raises mu on any gritted road
            length": a scraped stretch costs a truck no grip today (3.2b2 touches only sleds) and lake ice
            is not a road stretch. Hopper: filled on the Plow tab by the kilo ($50 a tonne, what the cash
            covers, 60 m rule), empty on a new truck (so 4.1c1's numbers stand), its kg ride on the truck
            (`load()`), the heap in the hopper follows the level and the disc turns (both moved from the
            baked model into tlx-plow's), grit flies as `api.muck` (new bridge: `emitMuck`). The spinner
            stops when the hopper is empty or you leave the cab; not saved. Hint: `gritHint`.
            MEASURED (Dyfjord road, hard): 172 m driven with the keys laid 69 kg (0.4 kg/m) and stamped 19
            lengths, none ahead, none beside the road; the plow truck (300 kg aboard) from 14 m/s: 20.7 m
            -> 17.9 m (13% shorter; its brakes, 52 kN, cap the gain: with a FULL hopper the gain is small);
            a pickup from 12 m/s: 15.1 m -> 12.5 m (18%); 1 / 1 / 0.5 / 0 at 0 / 5 / 8 / 10.5 h; 0.61 with
            6 points of new snow, 0 with 12.
            NOT DONE: no pay (4.2); sleds and AI traffic feel nothing; no sound for the spinner; no mark on
            the road or the Map (the hint's share is the only read-out); the council's plow does not scrape
            grit off; one grip factor for the whole truck, read at its centre.
            Open for Lemon (defaults built): the control (hold with the blade up) and the numbers (3 t,
            $50 a tonne, 0.4 kg/m, +35% for 6-10 h).
          - [ ] 4.1c3 USED ON BYTTEBODEN by the lorry rules (a lay-by, the Freight licence), through `addMkt`.
          ORIGINAL TEXT: A `VEHICLES` row (wheeled, the tractor's defaults): "Nordtrekk Brøyt 4x2", licence
          `freight`, about 9.8 t, its 3.5 m blade and gritter body from the factory, $16,800 new on the Trucks tab
          (above the tractor's $11,500 and the Aurora E: it is a company's capital), used on Bytteboden by the
          lorry rules (a lay-by, the Freight licence). Model: the council truck's geometry from tlx-convoy.js's
          `buildPlow`, exported and repainted, not copied. Its blade is a `BLADES` row (`w` 3.5, fits it only, not
          sold apart) and marks both lanes; the same drag terms against four times the grip give 60 cm at
          25 km/h. The gritter: a second use (the HOLD cycles throw -> grit on/off) lays grit that raises `mu` on
          ice and scraped stretches for some hours (a per-stretch value in this system's state). Counts against
          the three-truck limit. Scenario `x4_plowtruck.mjs`: one pass opens a stretch; a 90 cm drift taken at a
          run; the U-turn room it needs; all three schemes.
- [ ] 4.2 Plow app: municipal routes, driveways, lots, the hotel forecourt; pay by metres and promptness; a
      contract at risk when left unplowed. Jobs app rows.

### 5. Staff (`tlx-staff.js`)
- [x] 5.1 Staff app: applicants (name, village, wage, experience; traits hidden), expiry, hire.
      Design (lane B, 14 Nov): `tlx-staff.js`, saved `x.sys.staff` = `{ seq, next, apps: [...], crew: [...], owed,
      last: [weekly statements] }`. Applicants apply for a VACANCY, not into a pool: a vacancy is a workplace you own
      with no one in its role. Until milestones 6-8 add lighthouses, inns and garages the only workplace is an owned
      Real Estate depot cabin, role "caretaker" (keeps it aired, warm and booked: +3-12% let, by real experience x the
      hidden work trait; table `ROLES` at the top of the file, later slices add rows + a `places()` source). The app
      shows once Real Estate is installed (or anyone is on the books). An applicant: name, home village (the world's
      villages + the quay town), weekly wage ($30-90, more for experience), experience in years (shown), hidden traits
      `tr: { work 0.6-1.3, temper 0-1, honest }` and `xpReal` (one in six oversell: real < shown; 5.2's interview finds
      out). Each posts for 2-5 game days then withdraws; a vacancy gets one applicant at once and another every 6-20 game
      hours, up to 3 per vacancy, 6 on the board. HIRE fills the vacancy (the others for it withdraw), LET GO frees it
      (only with no wages owing). Wages: Monday, pro rata from the hire hour; short of cash = wages owing, and staff
      owed money don't work (no bonus) until it's paid (PAY button). Summer skip: `SEASON.addBill` charges the wages.
      Not in 5.1: interviews (5.2), happiness/raises/quitting (5.3), the unpaid-wage penalty option (5.3).
      Test `x5_staff.mjs`.
- [x] 5.2 Interviews in the haggling chat; overselling about one in six.
      Design (lane B, 14 Nov): INTERVIEW on an applicant card opens a chat view in the Staff app (Bytteboden's
      `.tmkth` bubbles, a 0.7-1.6 s typing pause). Four questions, each once: experience, a cold-snap stove that won't
      draw, a reference you can ring, why this job; two offers (85%, 92% of the ask) and HIRE AT. Honest applicants
      never slip; an overseller slips with chance xp 0.3 / stove 0.6 / ref 0.85 and is CAUGHT (card: "says N years,
      really about M"; ask drops to 30 + 3.2 x xpReal + 2 if lower; +1 patience). An honest reference sets `chk`
      (chip). Tone shows temper (> 0.66 curt, < 0.3 warm); "why" shows work (>= 1.1 keen, <= 0.8 easy hours).
      Patience 3-6 turns (3 + 3 x (1 - temper)); offer >= floor (wage x (0.82 + 0.1 temper)) = deal; under 93% of
      floor costs 2 patience and a short-tempered one stops negotiating (mute: no questions/offers, HIRE stays).
      Saved per applicant: chat, pat, floor, ref, asked, caught, chk, deal, mute (5.1 applicants get them lazily);
      caught/chk ride onto the crew record. Also beta 0173 #1: null applicant/crew entries are dropped on load and
      in the board tick. Test `x5_interview.mjs`.
- [x] 5.3 Happiness, raises, praise/criticism in person, notice and quitting, Monday wages.
      Design (lane B, 14 Nov): each crew record gets `hap` (0-100, hidden as a number; the card shows a word: Happy
      >= 70, Content >= 50, Fed up >= 30, Miserable), `mood` (what you said lately, -30..+30, fades 6 a game day),
      `lowT`, `notice`, `ask`, `talk`, `push`; 5.1/5.2 crew get them lazily (hap 65). hap eases toward a target at
      8 points a game day (16 while owed and falling): 64 + wage fairness (wage vs the fair wage for their REAL
      experience, (w/fair - 1) x 90 clamped -25..+18) + mood - 10 x temper + 1 a week served (max 6) - 35 while
      wages are owed. Work: the occupancy lift x (0.5 + hap/140, 0.5..1.15), x1.2 for 3 game days after a criticism
      that landed, x0.8 while on notice. IN PERSON: PRAISE and CRITICISE work only within 30 m of their workplace
      (else the button says where to go), once per 12 game hours each person. Praise: mood +10 (+4 if praised in the
      last 2 days). Criticism: mood -(8 + 10 x temper); with hap >= 35 they knuckle down (the x1.2), under that a
      temper > 0.5 hands in notice on the spot. RAISE (anywhere): +10% (min $3), mood +12 (+5 if already paid over
      1.3 x fair). Asking: hap < 50, hired 5+ game days, no ask in 7 days, not on notice -> they ask for +12-20%
      (notification); GIVE = wage + mood +15, REFUSE = mood -(6 + 10 x temper), and a hot one under 40 hands in
      notice. Notice: 24 game hours under 25 -> one week's notice (notification); hap back to 50 withdraws it;
      at the end they leave, paid pro rata (short = owed) and the job is posted again. Option `walkout`
      ("Unpaid staff walk out", on): wages owed for 72 game hours and everyone walks out (the debt stays).
      Monday wages unchanged from 5.1 (the slip now counts the unhappy). Test `x5_mood.mjs`.
- [ ] 5.4 Plow drivers: own truck or mine, present in the world, get stuck, ping; tow them, send someone, pay a tow.
- [ ] Options: unpaid-wage penalty (done in 5.3: `walkout`), staff improve with time, returning applicants show their record.

### 6. Upkeep and lighthouses (`tlx-property.js`, `tlx-lights.js`)
- [x] 6.1 Real Estate sells new property types; dust and grit, sweeping and dusting, cleaning kits. Split (lane B, 14 Nov):
  - [x] 6.1a Dust and grit at the depot cabins you own (`tlx-property.js`, saved `x.sys.prop` = `{ cab: { id: { grit,
        dust } }, kit, hT }`). Both 0-100, stepped by game hour (a jump over 60 days is capped): grit +6 a game day
        while you're away (guests track it in; 0.4x while you're there), dust +4 a day. A caretaker (5.x) cleans 11 a day
        x their work (`TLX.staff.work(cab)`: work trait x happiness factor, 0 while owed). Occupancy: +3% while both are
        under 15, falling linearly to -12% at 100 (`TLX.prop.occ(id)`, a bridge in `reOcc`). By hand, inside your own
        cabin's room with a cleaning kit (Real Estate app, $40, 8 cleans; a finished sweep or a finished dusting uses
        one): SWEEP (use control) puts a broom in both hands and slows the walk (`INT.slow` 0.45, a bridge in `intStep`);
        the floor is a 0.6 m grid of free cells with grit decals, the cells under the broom head and your feet are
        swept, grit falls with the share swept, 85% swept = clean. DUST facing a piece of furniture within 0.55 m: a 2.6
        game-second wipe with one arm (you stand still), dust falls by 1/N of the pieces; all done = clean. Walking off
        stops it. The in-room hint (bridge in `intDoorHint`) and the use control read the same provider (footUse /
        footAction mirror). The RE app shows each depot's floor/shelves and the kit row. No option: it's the brief's core.
        Test `x6_clean.mjs`.
  - [x] 6.1b Real Estate sells new property types (the start of 6.2's lighthouse listing and 7's inns): a listings
        page by type, rooms with their own dirt.
        Design (lane B, 14 Nov; v235, tlx-property v3, tlx-staff v5): `tlx-property.js` keeps two tables, `TYPES`
        (depot, light, inn, hotel, garage: the app's pages, in order) and `LISTINGS`, filled with
        `TLX.prop.addListing({ id, type, name, short, sign, chip, price, rent, occ, blurb, rooms: [{ id, name, door,
        jig, build(R, K), warm }], place(W) -> { x, z, y, rooms: { id: { x, z, ry } }, sign, dress() } })`. 6.2, 7
        and 8 add theirs the same way (from their own files: `TLX.prop` exists before boot). A type shows in the
        app's strip only once it has a placed listing, so there are no empty tabs. The depot page stays
        tracklayer.js's own (bridge: `rePage()` early in the app's render, `reTabs()` under its sub-line); every
        other type's page is drawn here (yours with a row per room, statements, for sale, BUY IT).
        Each room is its own interior (`api.intAdd`, `def.prop` = listing id, `def.id` = "listing:room" = its key in
        `s.cab`), so sweeping, dusting, decals and the use control work unchanged per room (`inMine()` reads
        `cab.prop`). `allRooms()` is what the clock steps: depots (one room) + every owned listing's rooms; a
        listing's caretaker (Staff place `pr:<id>`, `TLX.staff.workAt/occAt`) cleans each of n rooms at 1.7/n of a
        depot's rate. Bought rooms start grit 12 / dust 34 (stood empty). Lets: `nights()` (from `step()`, by
        `CAL.dayIndex`, at most 3 nights per clock jump) rolls `occP` = bare + 0.12 polar night + the rooms' mean
        dirt term + caretaker, only with you > 120 m off and not in one of its rooms; `monday()` pays `acc`, files
        a statement (4 kept); the summer skip bills 50% through `SEASON.addBill`. Saved: `own: { id: { since, acc,
        nights, rented } }`, `dT`, `last` (state0 grows; 6.1a saves load with nothing owned).
        The first listing: **Slettnes lighthouse station**, $12,500, $110 a night, 46% bare (about $350 a week:
        the lamp's stipend in 6.2 is what makes it pay like the economy targets say). Rooms: the keeper's house
        (the lit door nearest the `relay` site: two beds, kitchen, soapstone stove, the keeper's desk) and the
        tower room (a door added to the foot of the tower, 5 x 5 m: iron stair, paraffin drums, the lamp bench).
        Before you buy you can walk into both ("have a look"); a for-sale sign by the house turns into SLETTNES
        FYR. Pin on the Map's depots layer. No option: it's the brief's core. `INTK` gained bed/bunk/wood/fire,
        `api.ui` gained fmtMi. Test `x6_types.mjs`.
        Left for 6.2: the lamp, oil tank and drums, Lights app, stipend, the two smaller lights (each an
        `addListing` of type "light"). Not done here: upgrades for a listing, a fuel cache at the station.
- [x] 6.2 Slettnes buyable: oil tank (about three game days), oil drums hauled from town, lamp state, Lights app,
      Monday stipend by lamp hours. Two smaller lights on other headlands. Split (lane B, 14 Nov):
  - [x] 6.2a The lamp at Slettnes (`tlx-lights.js` v1, saved `x.sys.lights` = `{ lamps: { id: { oil, store, on, lit,
        need, low } }, quay, hT, last }`; v236). `LAMPS` rows name the tlx-property listing that owns the lamp, the
        interior with the oil store, the rack and stair boxes in it, and the SITE that flashes. Tunables in `LIGHTS`:
        tank 180 L, burn 2.5 L a lamp hour (72 h = three game days of polar night), drum 60 L / $45, at most 6 drums
        on order + in store, stipend $12 a lamp hour, 45 L in the tank with the keys. The lamp burns only while
        `api.sunEl(hour) < -2` (a sun valve; new api field), stepped by game hour in quarter-hour pieces (a 24 h
        clock jump burns the same as small steps; jumps capped at 14 days). `need` counts dark hours, `lit` the
        ones it burned. Dry tank: `on` false, alert, the tower's blink and beam stop (bridge: `TLX.lights.out(id)`
        in the relay blink line; only YOUR lamp can be dark) and it stays out until there is oil AND you LIGHT it
        at the stair. Drums: `order()` takes $45 and pushes a claim `{ oil, own: "lights", lamp, from: depot, dest:
        the relay site, pay: 0 }`, so the quay pickup, parcel slots, Jobs row and compass are the parcel system's
        own; bridge in `deliver()`: loads with `j.own` for this site come off first and go to
        `TLX[j.own].land(j, site)` with no pay and no delivery counted (any later system's own goods can use it).
        `s.quay` is what's paid for and not yet at a light; `sync()` rebuilds the claims after a reload (GS.load
        isn't saved: a drum that was aboard waits at the quay again) and writes off a drum lost with the load.
        Tower room: a `footx` provider ahead of sweeping: PUMP at the rack (5 game seconds standing at it, one
        drum into the tank, use again = STOP with nothing moved), LIGHT at the stair, LAMP/OIL explain what's
        missing; keyboard, pad L3 and the touch button all read it. Lights app (hidden until you own a light,
        badge "!" while one is dark): a card per lamp (LIT / SUN VALVE SHUT / DARK, OIL LOW, tank, lamp hours left,
        this week's hours and stipend so far, oil store, drums on the way, ORDER A DRUM), the last 4 statements.
        `monday()` pays round(lit x 12) and files the statement. A save with the station owned and no `lights`
        state gets its lamp lit with 45 L. Economy at the December start: 133 dark hours a week = $1,596 stipend
        for 333 L (6 drums, $270): with the lets about $1,700 a week on $12,500. No option: the brief's core.
        Test `x6_lamp.mjs` (44 asserts A-I).
        Not done: a hand-pump prop and a climb-the-stair animation (LIGHT is a toast), the tank drawn as a gauge
        in the room, summer skip (the midnight sun burns nothing, so nothing to bill).
  - [x] 6.2b Two smaller lights on other headlands (tlx-lights v2, tlx-property v4; no tracklayer.js change).
        Design (lane B, 14 Nov): table `SMALL` in tlx-lights.js, one row a light: **Finnkirka light** ($4,400, seed
        -3740/-820: the headland at the mouth of the Kjøllefjord, 2.4 km west of the quay) and **Kinnarodden
        light** ($5,200, seed -1060/-3820: the north tip). Each row carries its region (`nordkinn`; another world
        places none), and `placeSmall()` searches 140 m round the seed for the flattest open ground with the most
        sea about it (never a Nordkinn constant beyond the seed); the door faces inland. Each is a
        `TLX.prop.addListing` of type "light" from tlx-lights.js with ONE room (`<id>:hut`, 4.2 m square: bunk,
        stove, two drums on the rack, the ladder to the hatch), let at $35 a night (28% bare), and a `LAMPS` row
        with its own numbers (`N(lp, key)`: the row's or `LIGHTS`'s): tank 80 L, burn 1 L a lamp hour (80 h, about
        four December days), stipend $6 (Finnkirka) / $7 (Kinnarodden), 20 L with the keys, 3 drums at most.
        Economy at the December start: 128 dark hours a week = $767 / $894 stipend for 128 L (3 drums, $135) plus
        about $70 in lets: five to six weeks on the price, for a ride out every four days.
        Outside: a whitewashed hut on a stone footing, pyramid roof, gallery, a banded iron column, the lantern
        (`buildSmall`, 26 meshes, one hard obstacle r 2 m), a blink sphere and an additive halo sprite at night (no
        PointLight: adding lights recompiles every material). `flash` per row: Finnkirka two 0.6 s flashes in 8 s,
        Kinnarodden occulting (4.2 s on in 6). `flashTick()` shows it unless it is YOURS and out.
        They are not SITES (nothing else should start treating a lantern hut as a village): a drum's `dest` is the
        light's own drop point (`m.drop`, 6 m inland of the hut, `type: "light"`), and `dropTick()` calls
        `api.deliver(drop)` when the active vehicle is stopped (< 4 m/s) within 22 m, so the 6.2a bridge in
        `deliver()` does the rest; the skiff can land drums too if it gets that close.
        Drums per light: each lamp record has `q` (paid for, at the quay or aboard); `order(id)`, `stock`, `land`
        and `sync()` work per lamp (sync rebuilds each light's claims after a reload, with that light's dest).
        6.2a's single `quay` count is folded into Slettnes's `q` on load and dropped from the state. App: the
        sub-line lists the rates ("$12 / $6 a lamp hour"), each card its own tank, rate and drums; the texts say
        "ladder" / "the lantern hut" for a small light. Real Estate cards say "1 ROOM" for one room.
        Test `x6_smalllights.mjs` (A-I); `x6_lamp.mjs` reads the per-lamp count.
        Not done: a chart glyph for the small lights on the Map (they pin on the Depots layer once owned), a
        plowed apron at the door, a climb animation (LIGHT is still a toast, as in 6.2a).
- [ ] 6.3 Keepers and oil drivers. Options: lens polishing, passing ships, extra upkeep tasks.

### 7. Lodging (`tlx-lodging.js`)
- [ ] 7.1 Two village inns: rooms, bookings, cleanliness, walk-up-and-hold tasks, Lodging app, upgrades.
- [ ] 7.2 The Kjøllefjord hotel: manager who hires and schedules, extra floors.

### 8. Workshops and mechanics
- [ ] 8.1 A garage to own; mechanics with specialties and an honest experience rating; repair and upgrade queue.
- [ ] Options: mechanics gain experience, outside repair work.

### 9. Four seasons
- [ ] 9.1 Snow-free world (bare ground, heather, open lakes, streams, birches in leaf) without the snow shader's
      cost; autumn colour and frost. 9.2 Mud-season roads. 9.3 Playable summer and autumn; the skip from the
      Calendar on any later day, settling staff and property for the skipped weeks. 9.4 Four-wheelers,
      side-by-sides, golf carts. Year-round parcels and freight.

### 10-13
- [ ] 10 Stores and gear: gun shop, clothing, winter store, outdoor store grown from Nordkinn Fisk & Friluft;
      clothing layers that matter; camping gear; provisions (option). Lane D. Slices (design below):
  - [x] 10.1 Clothing layers that matter (`tlx-gear.js`): base + mid layer under the riding kit, sold on new tabs at
        Fisk & Friluft; sweat from on-foot work, damp layers chill, down loses loft wet, stoves dry you. `x10_layers.mjs`.
  - [x] 10.2 The winter store (v225, `x10_store.mjs`): a walk-in clothing / winter store in Kjøllefjord (INT room, door ring, shop counter) that
        sells the riding kit (GEAR, today garage-only; the garage keeps its Kit tab) and the layers, plus spare
        gloves/socks (a dry pair swaps out damp ones on the trail: carried count, used from the tablet or a key).
  - [ ] 10.3 Camping gear at Fisk & Friluft (outdoor tab): tent, sleeping bag, a camp stove + fuel. Pitch the tent
        off-grid on foot (footUse branch), crawl in to thaw and dry (warmth cap by the bag's rating), sleep to pass
        the night (CAL skip to morning, blocked within N m of a site). Carried on the sled (a cargo slot or the rack).
  - [ ] 10.4 Provisions (option "provisions", Decision 3 default: a light food-and-water need, off-grid only):
        rations and a water flask carried, bought at the store; off-grid they refill the tlx-survival bars on the
        spot (a key / tablet / touch), so hunger and thirst only bite on long trips. Off = today's quay refill only.
  - [ ] 10.5 The gun shop (Kjøllefjord, a small INT room): the shell milestone 11 fills; built with 11.1.

#### Design notes for 10 (lane D, 14 Nov)
- Every store is a counter panel in the icefish shop style (`.ifpanel`, tabs, cards, `panelFocus` for pads): reuse that
  look. Fisk & Friluft grows by `TLX.shopTabs` (a list of `{ id, label, note, render(cash), bind(root, rerender) }`
  that icefish.js `renderShop` appends to its tabs); new stores get their own panel built the same way.
- Layers (10.1): `LAYERS.base/mid` table at the top of `tlx-gear.js` (warm, wick, dry, fade, sweat). Warmth goes into
  `stats()` (ST.warm); the wet chill multiplies the cold drain (`TLXG.coldK()`), so it costs nothing while dry. A new
  game's free layers add 0 warmth: a player who never shops plays today's game. Sweat only from on-foot exertion
  (`FOOT.dig`, wading `FOOT.strain`, jog `FOOT.runW`), so riding parcel routes never wets you.
- Store (10.2): `api.intAdd(def)` adds a walk-in room from a tlx system (beacon + `def.build(R, K)` with the int* kit,
  `def.hint()`, `def.enter()`, `def.jig`); `api.shop(store, tab)` opens icefish.js's shop panel as another store
  (`TLX.stores[id] = { eyebrow, title, foot }`; a shop tab lists its `stores`, default `["fisk"]`); `api.kit` buys/wears
  GEAR. The gun shop (10.5 / 11.1) should use the same three: its own room via intAdd, its panel via `api.shop("guns")`.
  Sport & Vinter takes the lit town door nearest 30 m from the depot, >= 14 m from Fisk & Friluft (seeded town: the
  same house every game). Spares: $24 a pair, 4 carried, DRY PAIR (footx) offered on foot outdoors at wet >= 0.2,
  takes 0.3 off the wet.
- [ ] 11 Firearms and hunting: weapons, ammunition, seasons and quotas, butcher; people can never be shot.
      Options: hunter's licence school, game warden. **Lemon, 14 Nov: wants Tarkov-style depth** — "guns and
      gun customization, and gun parts/upgrades like scopes, magazines, better ammos, grips to hold, longer
      barrels, stocks, different handles, different frames... Tarkov customization with streamlining for on
      the go quick customization." Elevated ahead of 10.2-10.4 in lane D's queue (Owner note in LOOP.md);
      build 11 before finishing the rest of 10. Slices (design below): 11.1 core weapon model + gun shop
      shell (fills 10.5) + a hunting loop; 11.2 the quick-customize wheel (THE centerpiece of this ask); 11.3
      ammo variety; 11.4 more part variety + a second frame; 11.5 the original milestone's seasons/quotas/
      game warden/butcher. 11.1-11.2 were built in an ad hoc session pass (not lane D) on 14 Nov — check
      Status before starting either so lane D doesn't duplicate it.
  - [x] 11.1a (tlx-guns v1, lane D) The model and the shop. No ad hoc `tracklayer-guns` pass ever landed (no worktree, no
        branch, no tlx-guns.js on origin when lane D checked, 14 Nov), so lane D built it. FRAMES (bolt-action .308,
        $1,450), PARTS 3 per slot (barrel std22/carb18/heavy24, stock walnut/synth/adjust, grip plain/rubber/bipod,
        magazine int3/det5/det10, sight iron/red1/scope39; slot 0 = the free stock part), `stats(gun)` (spread MOA,
        recoil, handling, kg, noise, range, cap, zoom), `fit(slot,id)` = the free swap 11.2's wheel calls. Gun shop
        Jakt & Våpen: INT room via api.intAdd (door ~55 m from the quay, >= 14 m from every other ring; rifle rack,
        glass case, antlers, ammo shelf, stove, counter), panel `api.shop("guns")` with tabs Licence / Rifles / Parts
        (stat-delta chips per card) / Ammunition ($38 for 20, 120 max). Option `huntlic` (on): the course ($180) gates
        buying a rifle. Saved x.sys.guns {owned, cur, parts, ammo, licence}, sanitized on load. Test x11_gunshop.mjs.
  - [x] 11.1b (v231, tlx-guns v2, lane D) In the field: shoulder, aim, fire, dress, sell. `btn("rifle")` (L / pad A on foot /
        touch RIFLE-LOWER) shoulders it on foot outdoors, refused within townR + 40 m of the depot or 70 m of a site.
        Shouldered = first person down the rifle (view model built from the fitted parts; irons / red-dot window / scope
        ring + fov 52 / zoom), boots planted, the walk controls swing the aim (readInput hands FOOT.turn / fwd to AIM), sway
        that settles in ~2 s still and scales with the spread stat and breath. Trigger = the use control (footx FIRE).
        Bolt cycle 0.95 s x recoil, auto top-up from the pack a round at a time. Shot = ray + spread, stops at the first
        hill, takes the first live WILD animal whose chest it crosses; inside stats.range it drops, past it a miss that
        says why. Noise: herds within 420 m x noise flee (bears don't). PEOPLE NEVER: `unsafe()` refuses the shot (no
        round spent, toast, ON SAFE) with a rider / rescue case / the dog / a traffic car within 6 m + 3% of the line out
        to 700 m, or the town, a site (45 m) or a lit door (22 m) on it. DRESS at the carcass (footx), tally
        x.sys.guns.game, 260 kg carried, sold on the shop's Game tab (reindeer $230, moose $620, fox $85, hare $22; a
        grizzly / lemming / ermine pays nothing: 11.5's warden decides what a grizzly costs you). Bridges: BTN.rifle + its
        key / pad / touch, the aim capture in readInput, api.wild / people / crack. Test x11_hunt.mjs.
  - [ ] 11.1c The rifle seen on you: slung across the walker's back and on the sled's rack while you own one (third
        person), trees stopping a bullet (today only hills do), and mouse-look aim for keyboard players (today A / D / W / S).
  - [ ] 11.1 Core weapon model + gun shop shell. New `tlx-guns.js` (`TLX.register({id:"guns",...})`, state
        `x.sys.guns = { owned: [...], parts: [...] }`). A **frame** (`FRAMES`: start with one, a bolt-action
        hunting rifle, `id, name, slots:["barrel","stock","grip","magazine","sight"], base stats`) is the
        base weapon; an owned gun instance is `{frame, parts:{barrel,stock,grip,magazine,sight}, ammo}` with
        every slot filled by a default (free, stock) part so a bought rifle works immediately. Carry it on
        the sled rack (reuse the existing rack/cargo-slot pattern from camping gear/skis) or holstered on
        foot. Gun shop: a small INT room in Kjøllefjord (the 10.5 shell), counter panel in the icefish/`.ifpanel`
        style, sells the frame and starting parts. Hunting: fire (keyboard/pad/touch, through `btn(action)`)
        at the existing wildlife (`quadMake` reindeer/moose/hare/fox — reuse `WILD`, don't fork a new animal
        system), a clean hit drops the animal for a pelt/meat sale; people can never be targeted (gate fire
        input off entirely when aimed at a human-shaped target, no exceptions). Hunter's licence school
        option (Settings > Options, on by default per G4 rule) gates hunting until taken, a short tutorial
        card like the existing school courses.
  - [x] 11.2 (landed v232, tlx-gunwheel v1, calls `TLXGUN.fit`; built in an ad hoc session on top of lane D's 11.1a/b) The quick-customize wheel (the ask's centerpiece: "streamlining for on the go quick
        customization"). A radial/wheel overlay bound to one key/button/touch gesture (hold, don't tap — like
        a weapon wheel in other games) that opens INSTANTLY over gameplay (no tablet app, no deep menu,
        works on foot or on the sled, pauses nothing): five slot icons (barrel/stock/grip/magazine/sight)
        around the rifle's own silhouette in the middle; picking a slot shows only the parts the PLAYER
        ALREADY OWNS for that slot (bought at the gun shop ahead of time — swapping is instant and free,
        buying is still a shop trip) as a short horizontal strip, pick one and it snaps on with a sound/haptic
        and the wheel closes. Stat deltas (accuracy spread, recoil recovery time, handling/ADS speed, weight
        -> sled cargo weight, noise -> animal spook radius) apply live and show as small +/- bars while a
        slot is open, same idea as a sled part's garage card. Adaptive prompts throughout (`btn()`, no
        hard-coded key names); works on keyboard, pad (face buttons round a wheel) and touch (tap the slot
        then the part, since there's no analog stick to spin on all touch devices). This is purely a swap of
        ALREADY-OWNED parts; the gun shop remains the only place to buy a new part outright.
  - [x] 11.3 Ammo variety. 2-3 cartridge grades for the rifle's calibre (e.g. budget/standard/premium: price
        vs. accuracy spread and clean-kill chance at range) bought at the gun shop, loaded into the magazine
        slot's capacity (a bigger magazine part = more rounds before reload, a real Tarkov-style trade-off:
        more capacity usually costs more and weighs more).
        As built (v233): `AMMOS` in tlx-guns.js, four loads, 20 a box: soft point $38 (the standard), surplus ball
        $24 (spread +0.6 MOA, reach x0.8), match $74 (spread -0.5, reach x1.15, recoil +0.05), subsonic $58 (noise
        x0.4 so herds bolt within 168 m not 420 m, reach x0.55, recoil -0.3). A load's `d` is a part-style delta
        with `*stat` multipliers, applied last in `stats()`. `gun.ammo` = the ONE load in the magazine; `loadAmmo`
        empties the magazine back into the pack and it refills from the new load; `feed()` moves on to the next
        load carried when one runs dry (never mixes into a part-used magazine). Pack: 120 rounds all loads
        together; saved `s.ammo` (soft points, as before) + `s.alt {id: n}`, sanitized. Counter: one card per load
        with delta chips and "Load these"; wheel: sixth slot Ammo (carried loads + counts). Test x11_ammo.mjs.
        Not done: rounds weigh nothing, and wind/drop are not modelled (reach is a clean-kill cut-off).
  - [ ] 11.4 Part variety + a second frame. 3-4 real options per slot with genuine trade-offs (short/long
        barrel: handling vs. range and noise; bipod-grip vs. standard: steadier aim vs. slower ADS; wood vs.
        synthetic stock: weight vs. cold-weather grip feel; iron sight/low-power scope/long-range scope: FOV
        vs. effective range). Add a second frame (e.g. a lever-action carbine or shotgun) with its own slot
        set so "different frames" (Lemon's words) is real, not just skins.
  - [ ] 11.5 The original milestone: hunting seasons and species quotas (tie into the Calendar), a game
        warden option who can fine/confiscate over quota or hunting a protected/out-of-season species, and a
        butcher step (dress the animal for meat/pelt value, time cost on foot, a knife item if one doesn't
        exist yet).

- [ ] 12 Fire watch and trails: towers, fire finder, smoke reports, care packages, trails laid by walking
      (option), hikers, parking lots.
- [ ] 13 Birch sap and berries; first balance pass; property table + cadence scenario in LOOP.md.

### 14-15
- [ ] 14 Boats and docks: skiff first, docks, sea and lake handling, water deliveries, open-water fishing, Boats
      app, boatyard. Options: rowboat, canoe, ferry as a passenger. Slices (lane C, written 14 Nov):
  - [x] 14.1 (v224) The skiff and the small-boat jetty (`tlx-boats.js`). A 4.6 m aluminium skiff with a 20 hp tiller
        outboard (Kjøllefjord Båt & Motor, $2,600: about the Sprint-to-Summit rung), bought from a Boats tab in the
        garage and moored at a new timber jetty (småbåthavn) on piles off the lowest stretch of shore near the quay
        (the concrete quay stands ~9 m above the water: no one climbs into a skiff from that). The jetty is a
        `DOCKS` record ({x, z, yaw, len, wid, y}); the walker walks out along it (`VEH.floor(x, z)` in `walkFloor` and
        past the sea wall in `footStep`, the only tracklayer.js hooks besides a map glyph). The skiff is a vehicle like
        the pickup (owns `P` while you're in it, a parked record otherwise) through a small kind registry in
        tlx-vehicles.js (`TLXV.addKind(row, impl)`: runtime / driver / tick / dist / reset), so swap, save, reload,
        the nearest-vehicle rule, mount key and hints work unchanged; boats don't count against the forecourt's three
        trucks. Water model: displacement hull with a planing hump (power-limited thrust, drag ~ k v^3 at speed so
        20 hp tops out near 9-10 m/s with one aboard), keel damping on sideways slip, tiller yaw that needs flow
        (thrust or speed), reverse at 40%, waves from the weather (0.1 m crest to trough calm, ~0.7 m in a storm; the hull
        heaving, pitching and rolling over the swell, slamming at speed in a sea), the shallows ground it (bow depth
        under the 0.32 m draft: stops, a scrape, damage above 2.5 m/s; back off with reverse), lake ice and land are
        land. Getting in or out: from the jetty or any low shore (dry ground within 2.6 m of the gunwale, under 1.3 m
        above the water): walk to the gunwale, step down in, weight across, second foot, turn aft, sit at the tiller
        (and the reverse), the boat heeling as you step. A reset or a bad pose that puts it on land puts it back on its
        last water. Open boat: 1.25x the cold of the sled's baseline. 25 L tank, burn against throttle, 4 parcels in
        the boat (they ride along; coastal deliveries are 14.2). Saved in `x.vehicles` with the trucks. Test
        `x14_skiff.mjs`.
        As built: the coast near Kjøllefjord stands 2-4 m above the water almost everywhere, so the jetty root is a
        gangway with a handrail at ~1:3 from the shore (4.1 m up, 90 m from the depot) down to a level deck at 0.95 m,
        15 m long over 5.6 m of water, a berth each side of the outer end (`siteDock`: shore 0.25-4.5 m, a straight run
        of sea to 1.6 m depth). Measured (x14_skiff, gameClock): 7.5 m/s at 3.5 s, 8.7 m/s (19 mph) at 9 s and still
        creeping up; tiller 1.8 rad in 3 s at speed; reverse stops her from 8.7 m/s in 3 s, then 2.3 m/s astern; she
        floats within +-0.1 m of the waterline in calm. Most of this shore is too high to step onto (the steep shore
        grounds her bow on the rocks in deep water): Q there says so and keeps you aboard. `TLXV.addKind` impls:
        init (run first in the vehicles init, so a reload straight into the boat works), runtime, driver, tick, reset,
        dist, tab. Not done: no mooring lines; the walker's sled hint/pin shows "B" on the Map only; the ferry ignores
        the skiff (no collision); the boat isn't in Bytteboden's used market.
  - [x] 14.2 Docks at every village harbour (same jetty, sited by the same low-shore search) and water deliveries:
        parcels for a coastal site hand over at its dock; a few sea jobs on the board for skiff owners; Jobs row.
        Split (lane C, 14 Nov) into:
    - [x] 14.2a (v228, tlx-boats v2) Village jetties and handing over at a jetty. At boot every village and the lighthouse gets the same
          jetty `siteDock` builds for the quay (search 30-260 m from the site, then out to 520 m for a harbour set
          back from the shore, avoiding other jetties), kept only if a sea flood fill (16 m cells, 4-connected) joins
          its outer end to the quay jetty's, so every jetty can be reached by water. `D.site` = the SITES record
          (the quay jetty's is the depot), `D.name` = "<place> jetty". Seated in the boat, slower than 2.5 m/s and
          alongside a jetty (from its root to 4 m past the end, within ~4 m of the planks), the jetty works as the
          site: parcels for that site are delivered through the game's own `deliver(site)` (pay, lateness, fragile,
          the backhaul and the fuel top-up all unchanged), pickups waiting there load through `collectClaims(site)`,
          and the quay jetty takes depot-bound backhauls and loads the quay's claims. Arriving with nothing to do
          there says the jetty's name once. The compass, in the boat only, aims at the target's jetty when it has one
          ("· to its jetty"), or says "no jetty there" when it hasn't; the tablet's Map draws every jetty as an anchor
          pin (label when zoomed in). New boats still moor at the quay jetty. Bridges: `api.deliver`,
          `api.collectClaims`, an `aim` line in `updGameHud`, a `docks` map layer. Test `x14_docks.mjs`.
          As built: only Dyfjord, Lebesby and Ifjord get a jetty. The Nordkinn's land runs to the map's north and south
          edges, so the east coast (Mehamn, Gamvik, Skjånes, Slettnes) is a second sea the quay's water never joins
          (flood fill: 42,019 cells from the quay; Mehamn also has no low shore within 520 m). Their jetties wait for a
          way to get a boat there (a boat trailer behind the pickup, 14.4/14.5) or for 16's streaming. Beta 0178 #1
          fixed in the same landing: the game's drown test skips P while the current vehicle `floats` (a storm at speed
          dipped the hull to -0.41 m and called the sea rescue).
    - [x] 14.2b (v230, tlx-boats v3) Sea jobs on the board for skiff owners, a BY BOAT tag, the warmth of a village when
          tied up at its jetty. Design (lane C, 14 Nov): a sea job is an ordinary parcel with `j.sea` (so pay, fragile
          knocks, the Jobs row, the compass and the hand-over are the game's own), `from` and `dest` both places with a
          jetty. tlx-boats.js posts them from its tick once a skiff is owned: up to 2 on the board, 90 game s between
          postings, the first from the jetty nearest the boat, never the same pair twice, at most a boatful (4) posted
          plus claimed. The board is rebuilt wholesale by the game (new day, roaming drop-off, ferry freight), so
          untaken sea jobs are remembered and put back; `tabWork` refills the ordinary board when only sea jobs are
          left on it. Boat only: taking one is always a claim (its own cap of 4, not the sled rack's), and
          `collectClaims` / `deliver` skip `j.sea` unless the current vehicle floats (`afloat()`), so it loads and hands
          over only through `dockWork` alongside a jetty. Pay = (45 + 130 per sea km) x cargo, x1.35 when
          `TLXR.tripWarn(from, dest)` names a snowed-in or winter-shut road at posting (`j.shut`, chip ROAD SHUT +35%).
          Sea km: a 4-connected count over the quay's sea flood fill from jetty to jetty, x0.8 for the diagonals, never
          under the crow's line (`TLXB.seaKm`). `VEH.cur.shore()` = the site whose jetty the boat is tied up at (seated
          alongside, or stood on its planks with her moored there): the warmth tick treats it as a village, and the
          quay jetty also fills the tank like the quay. In the boat the compass no longer appends road warnings.
          As built (x14_seajobs): quay-Dyfjord 2.1 km, quay-Lebesby 5.8, quay-Ifjord 8.2, Lebesby-Ifjord 3.3 by sea;
          quay to Ifjord pays $1,420 with the Ifjordfjellet road shut for the winter ($1,065 open). Not done: sea jobs
          are not saved while posted or claimed (no parcel is); a sea parcel cannot be moved from the boat to a truck;
          on foot on the planks the compass still gives no cue (0182 #2).
  - [x] 14.3 (v234, tlx-seafish.js v1, tlx-boats v4, icefish v42) Open-water fishing from the boat (jig and handline;
        the Fiskemottak buys; reuses icefish.js's catch). Design (lane C, 14 Nov): its own file, plugged into the
        skiff through `TLXB.addOn({ init, tick, use, useLabel, useHint, grab, stop, pose })` (tlx-boats.js calls
        them; the driver gains `use / useLabel / useHint / grab`), no TLX.register and nothing of its own saved.
        Seated, under 0.8 m/s, 4 m+ under the keel, storm under 0.65: the use control (E / L3 / the touch pill, which
        reads FISH then STOW) puts a handline over the side. tracklayer.js bridges: E and L3 fall through
        `FISH.ctx()` to `VEH.cur.use()` before the horn; the touch pill takes `VEH.cur.useLabel()`; the ride hint
        takes `VEH.cur.useHint()`; `readInput` offers gas and brake to `VEH.cur.grab(thr, brk)` and zeroes them when
        it takes them (so the motor, and its sound, get nothing). Line: brake pays out 3 m/s to the bottom, gas
        hauls 1.5 m/s; a lift after a drop or a pause is a jig stroke (+0.4 "worked", decaying 0.22/s). Six species
        added to icefish's `SPECIES` through the new `TLFish.addSpecies` (never in a lake's mix): saithe, cod,
        haddock, wolffish, redfish, halibut, each with the bottom depths it lives over, how far off the bottom it
        feeds, how hard it wants the pilk worked, price per kg and pull. Bites per second = 0.045 x the takers'
        weights x (0.3 + 1.4 x the mark) x time of day; the marks are a fixed value-noise pattern over the sea
        (`TLXSF.markAt`). A tug gives 1.5 s to haul. The fight: the fish runs for 1.1-2.2 s between rests; hauling on
        a run takes the line past its limit and 1 s of that parts it (pilk gone, 5 s to tie on another); slack for
        3.5 s may shake the hook; under 0.5 m it is aboard. The catch is a cooler row like any lake fish
        (`{sp, kg, cm, v, t, lake: "the fjord off <place>"}`), counted in the logbook; a full cooler (10) logs it and
        lets it go. icefish.js: the buyer's board lists the sea prices, the logbook gains "From the boat" once
        there is a sea best, `TLFish.coolerMax()`. The helmsman half turns on the thwart and hauls hand over hand
        (phase from the line's speed), a line runs from the hands over the gunwale into the water, the fish comes
        over the gunwale on it. Test `x14_fishing.mjs` (52 asserts).
        As built: off the quay the fjord is 21 m deep (cod, haddock, wolffish, saithe); the 40 m+ water for
        redfish is further out (the sea runs to 75 m). On the best mark near the quay jetty a tug came after 9
        and 22 game s of jigging; a 9 kg cod is 92 cm and $38, a cooler of ten mixed fish is about $150-250
        (a 30 kg halibut alone is ~$390). Not done: no tackle to buy (the handline comes with the boat; better
        lines / a gaff can go with the boatyard in 14.4); no fish box model in the boat; the marks are not shown
        (no gulls, no sounder); fish are not sold from the boat at the quay jetty (walk or ride to the pier).
  - [ ] 14.4 Boats app (your boats, fuel, where they're moored, a tow home for a fee) and the boatyard at the quay
        (hull repairs, condition from groundings, winter haul-out). Split (lane C, 14 Nov) into:
    - [x] 14.4a (v237, tlx-boats v5) The Boats app and the tow home. Design: a tablet app registered from
          tlx-boats.js's init (`TABLET.register`, hidden until a boat is owned, a "!" badge while one has a dry tank),
          no TLX.register and nothing new saved. A card per boat: chips ABOARD / MOORED / AFLOAT, NO FUEL / LOW FUEL,
          HULL n% once dented; where she lies ("at the Dyfjord jetty", "afloat, 930 m off the quay jetty") and how far
          that is by sea from the quay jetty; fuel and the range it gives flat out (from the burn in `core`); what the
          dents cost (the 25% of power `core` already takes at 0%); parcels aboard. MARK ON MAP (not aboard) puts the
          Map's marker (`WP`, bridge `api.mark`) on her, so the compass leads to her when nothing else is tracked.
          TOW HOME: the harbour boat brings her to a free berth at the quay jetty for $40 + $30 per km by sea
          (`TLXB.seaKmAt(dock, x, z)`: the sea jobs' flood-fill distance, now from a jetty to any point), x1.5 with
          the storm over 0.5. Refused at the quay jetty, with no free berth there, mid-step in or out, in the school
          or a rescue, or without the cash. Not aboard: she is moved at once and you make your own way. Aboard: the
          handline comes in, the tablet goes down, the screen fades (`#tlxbFade`), she and you are on the berth and
          the clock has moved on by km / 11 km/h. Parcels aboard stay aboard. An empty tank at sea: the game's
          warning reads "for a tow to the quay jetty ($n)" and the help control calls this tow instead of sending a
          fuel sled over the water (bridges: `VEH.cur.help()` in `callForHelp`, `VEH.cur.helpText()` in the warning),
          lenient: it takes what cash you have and never refuses for want of it. Under the cards, every jetty with its
          distance by sea from your first boat, what it gives (fuel and berths / warmth) and the sea jobs waiting on
          it. Test `x14_boatsapp.mjs` (47 asserts).
          As built: Dyfjord to the quay is 2.0 km and $100; Lebesby 5.8 km and $215; a tow from Dyfjord aboard moves
          the clock 13 game minutes; a full tank reads 42 km flat out. Not done: the tow is a fade, no harbour boat is
          seen; a boat fetched while you stand beside her just goes; warmth is not charged for the time under tow; the
          app does not show the fishing marks or the cooler; no repair here (14.4b).
    - [ ] 14.4b (b1 landed, b2-b3 open) The boatyard at the quay: a slip and a shed by the quay jetty, hull repairs there ($ per condition
          point like the garage's, the boat within reach of the slip), a REPAIR line on the Boats card that says where
          to bring her, tackle for the handline (14.3's "not done"), and the winter haul-out (a fee to have her
          lifted out and stored: no storm wear while she is out; storm wear on a boat left afloat is part of this
          slice and ships as an option). Split (lane C, 14 Nov) into:
      - [x] 14.4b1 (tlx-boats v6) The yard itself and hull repairs. Design: `siteYard(D)` puts the yard beside the
            quay jetty at boot (nothing saved). The shore there is a bank 4-9 m high (a first cut with the shed on the
            bank came out with its floor at 9.9 m and a 43 m slip on stilts: thrown away), so the yard is a naust on
            piles over the water's edge: a strip parallel to the jetty, 9.5 m or more to one side, the floor one
            step (0.25 m) above the jetty's deck, starting where the bank has dropped clear of the floor and the
            jetty's deck has levelled. The shed is 6.4 x 9.6 m, falu red, snow on the roof, double doors and a sign
            ("BÅT & MOTOR · SLIPP") to seaward, a window and a lamp on the jetty side that light as the day goes
            (emissive by `api.dayFactor`, set in a mesh's `onBeforeRender`: boats.js has no tick without a boat).
            From the doors two rails on timber bents run down at 1:4 to 0.8 m under water (1 m+ of depth at the
            foot, nothing of the sea bed in the way), with a cradle on them and a hull on the cradle, bow to the
            shed. A plank walk on piles with a rail each side crosses from the jetty's deck to the shed's side door,
            landward of the berthed hulls; `floorAt` (so `VEH.floor`) makes it walkable. `yardPush` (after
            `dockPush` in `core`) keeps the skiff out of three rectangles in the jetty's frame: the shed, the slip
            down to where the rails are 0.35 m under, the walk. Repair: `YARD.perPt` $8 a point of hull (least $20;
            a wreck is $800 against $2,600 new), back to 100% at once, with the boat within `YARD.reach` 45 m of the
            slip's foot (the quay berths are 15 and 18 m from it) and nobody sat in her. Two ways to order it: the
            Boats app grows a "Boatyard · hull repair" card under a dented boat (AT THE SLIP / NOT HERE, the price,
            REPAIR HULL, the reason when it can't) and at the shed's door the on-foot use control (an `api.footx`
            provider: use key, pad L3, the touch button) reads REPAIR with the price when a dented boat of yours is
            in reach, otherwise BOATYARD and says what the yard does or where to bring her. No bridge in
            tracklayer.js. Test `x14_yard.mjs` (50 asserts).
            As built: the yard took the side away from the depot, 9.5 m off the jetty; the shed starts 6.9 m along
            it over 5.9 m of water, the slip is 8 m, its foot in 8.6 m of water, the walk is 5.3 m. Not done: the
            repair takes no time and nothing is seen of it (she is not hauled out: the hull on the cradle is
            scenery); no pin on the Map (it sits on the quay jetty's anchor); the walker can't go inside; the other
            jetties have no yard; parked boats are not pushed, only the one you drive.
      - [ ] 14.4b2 Tackle at the boatyard for the handline (14.3's "not done": a stronger line, a gaff, a second
            pilk), sold at the shed door through the store panel (`api.shop`), saved with the boat's state.
      - [ ] 14.4b3 Winter haul-out and storm wear: a fee to have her lifted out and stood on the cradle / the hard
            by the shed (no wear while she is out, launched again from the app or the door); storm wear on a boat
            left afloat in a blow ships as an option (`TLX.option`), on by default.
  - [ ] 14.5 Options: rowboat (oars, no fuel), canoe (lakes once they open), ferry as a passenger (the coastal steamer
        between quays for a fare).
- [ ] 15 Aircraft and Bush Mail: bush plane (floats / skis / wheels), flight model on all three control schemes,
      Mehamn airfield, plateau strip, quay seaplane dock, Bush Mail / Aircraft / Hangar apps. Options: pilot's
      licence school, preheating, own airstrip, inspections.

### 16-19
- [ ] 16 World streaming, proven on a bare test region; the Nordkinn loads and plays exactly as before; sea west.
- [ ] 17 The Maine-style county. 18 Greenland. 19 Final balance pass and full regression.

## Economy targets

Depot cabins cost $3,800 to $6,800. Inn above them, lighthouse above that, hotel at the top, past the $14,500
Aurora E. First boat about a mid-ladder sled; first aircraft in the range of the hotel. A well-run, fully staffed
property pays back in four to six game weeks; by hand it earns more per week and eats time. Wages and upkeep
continue when income stops. An hour of active work always clearly beats an hour standing still.

## Decisions

**Decided by Lemon, 10 Nov.** Birch sap and berries on the Nordkinn, sugar maples in the Maine-style county.
Every applicant shows experience; interviewing is optional. Flying west reaches Greenland, further west America;
the ship carries vehicles. The two new regions change the "Norwegian Finnmark setting" canon on purpose (it still
holds for the Nordkinn).

**Open, with the default being built** (ask nothing else):
1. Fire this far north: fire watch on the Nordkinn tied to dry, windy spells; the bigger game in Maine.
2. Firearms never harm people.
3. Provisions: a light food-and-water need, off-grid only.
4. Year length: keep the 20-minute day, rely on the skip.
5. Nordkinn counts: three lighthouses, two inns, one hotel, three fire towers.
6. Regions gated only by an aircraft with the range or the ship's fare.
7. Invented settlements on a real-feeling Greenland coast; an invented county that is Maine in all but name.
8. Maine first, by ship; Greenland follows and opens the flight west.
9. North, east and south edges: sea or fell to the horizon, a radio warning, turned back at a cost.
10. Planes only; no helicopters yet.
11. Nordkinn Skuter & Service stays public and is not for sale; a garage I buy is a separate building.

**Decided while building** (reasons in PROGRESS.md):
- Expansion files are `tlx.js` + `tlx-<system>.js`; state rides in save key `x` (milestone 1).
- Options are stored with the save, not with the look-and-sound settings, because they change the game's rules.
