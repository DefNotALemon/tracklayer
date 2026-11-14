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
| 3 | Roads and traffic | 3.1 landed (v188); beta fix 0117/0119 standing start (v189); beta fix 0116 #1/#4 a held truck says why it won't move (v190); beta fix 0123 #1/#2 graded road bed + no tight hairpins (v191); beta fix 0121 #2/0122 #2 the pickup crawls through 30-40 cm of powder (v192); beta fix 0127 #2-#4 switchback loops (no bend under 13 m) + bends plowed wider (v194); beta fix 0131 #1/#2 the fjord rescue never lands you on a cliff face (v195); beta fix 0133 #1 no school course with your sled strapped to the trailer (v196); beta fix 0129 #1/#2 pickup traction control + "more throttle" / "steep in this snow" hints (tlx-vehicles v15); 3.2a road snow: storms fill the roads, the council plow clears them, saved, Map shows snowed in (v197); beta fix 0140 #1-#3 no 40 cm cliff, "ease off" only when the wheels spin (tlx-vehicles v16); beta fix 0141 #1 a drizzle no longer shuts the roads, the plow works through light snow (tlx-roads v6); 3.2b1 road warnings: Map legend, compass/Jobs warn of a snowed-in road on the way, pickup says the road's drifted shut (v201); 3.2b2 scraped road surface: sleds grind and spark in the wheel tracks of a freshly plowed road in a cold snap (v202); beta fix 0149 #1 a job over a snowed-in road gets a visible heads-up toast (v203); 3.3a parked cars, buried by storms, dug out by their owners (v204); 3.3b dig a buried car out by hand for pay, option digcars (v205); 3.4a a few drivers on the open roads, option traffic (v206); 3.4b1 drivers pull out round a sled or walker standing in their lane, wheels turn, a hard stop for someone stepping out close (tlx-traffic v2); 3.4b2a headlight beams + a pool of light on the road at night, a passing car's engine hum (v207, tlx-traffic v3; the "sunk cars" finding was a probe artifact); 3.4b2b a car now and then drives a village street home and parks as one of the parked cars, owners out leave empty spots (v208, tlx-traffic v4); 3.5a semis on the roads in three sizes, trailer on a tractrix coupling (tlx-semis v1, tlx-traffic v5); 3.5b1 the tractor unit you buy and drive, Freight licence, no trailer yet (tlx-vehicles v19); next: 3.5b2 (semitrailers and the fifth-wheel coupling) |
| 5 | Staff | 5.1 landed (v221): Staff app, applicants for caretaker jobs at your depot cabins, hire, let go, Monday wages pro rata, wages owed; 5.2 landed (tlx-staff v2): interviews in a chat, oversellers slip and get caught, references check out, wage offers and patience; beta 0173 #1 null entries fixed; 5.3 landed (tlx-staff v3): happiness, praise/criticism in person, raises and raise requests, notice and quitting, option walkout; next: milestone 6 (lane B; 5.4 plow drivers is lane A's) |
| 6 | Upkeep and lighthouses (lane B) | 6.1a landed (v229, tlx-property v1): dust and grit at your depots, sweeping and dusting by hand, cleaning kits, caretakers clean; beta fix 0186 #1 the broom is one 1.45 m length instead of stretching 1.5-1.9 m with each stroke (tlx-property v2); 6.1b landed (v235, tlx-property v3): Real Estate has a page per property type, Slettnes lighthouse station is for sale (keeper's house + tower room, each room its own dirt, let by the night, caretaker); 6.1 done; next: 6.2 (the lamp, oil, Lights app, stipend) |
| 4-19 | everything else | not started (split across lanes A-D, see Lanes) |
| 10 | Stores and gear (lane D) | 10.1 layers (v222), 10.2 winter store Sport & Vinter (v225, tlx-gear v2) landed; next for lane D: milestone 11 (Owner 14 Nov), then 10.3-10.4 |
| 11 | Firearms and hunting (lane D) | 11.1a rifle model + gun shop Jakt & Våpen (tlx-guns v1; fills 10.5) landed; 11.1b in the field (v231, tlx-guns v2): shoulder / aim / fire on foot, clean-kill range, spooked herds, people and houses never down-range, dress the animal, the Game tab pays; 11.2 landed (v232, tlx-gunwheel v1, an ad hoc session): hold R / D-pad left / GUN opens the quick-customize wheel; 11.3 landed (v233, tlx-guns v3, tlx-gunwheel v2): four loads for the .308 (soft point, surplus ball, match, subsonic), one load in the magazine at a time, changed at the counter or from the wheel's sixth slot; beta fix 0188 #1 the wheel shuts when the tablet comes up; beta fix 0190 #1 + 0192 #1 (tlx-guns v4): nothing fires under Settings and Settings slings the rifle, the pack stays at 120 when rounds come back out of the magazine; next: 11.1c the rifle seen on you, 11.4 parts + a second frame |
| 14 | Boats and docks (lane C) | 14.1 landed (v224, tlx-boats v1): the skiff, the jetty below the quay, water handling, getting in/out; 14.2a landed (v228, tlx-boats v2): jetties at Dyfjord, Lebesby, Ifjord, parcels hand over and pickups load at a jetty, compass to the jetty, Map anchor pins; beta 0178 #1 storm no longer sinks the skiff (v228); 14.2b landed (v230, tlx-boats v3): sea freight BY BOAT on the Parcels board for skiff owners, +35% when the road is shut, a jetty's warmth and the quay jetty's fuel: 14.2 done; 14.3 landed (v234, tlx-seafish v1): a handline from the skiff over 4 m+ of water, six sea species by depth, tugs, runs that part the line, the catch in ice fishing's cooler and sold at the Fiskemottak; next: 14.4 (Boats app, boatyard), then 0178 #2/#3 and 0182 #1/#2 POLISH |

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
- [ ] 3.5 Semis in a few sizes with their own coupling. Option: storm closures and convoys on the fell road. Split 14 Nov
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
  - [ ] 3.5b A semi you drive. Split 14 Nov (lane A) into three passes:
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
    - [ ] 3.5b2 Semitrailers and the coupling (new `tlx-rig.js`, state id `rig`): two or three semitrailers (TLXS
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
          pad and touch for the legs.
    - [ ] 3.5b3 Trailer freight: Freight board rows for trailer runs between the road villages (pick the loaded
          trailer up at one yard, drop it in the other's), paid by road distance and weight, Jobs app rows, compass
          to the trailer then the yard. Used tractors on Bytteboden "Vehicles". Optional: a class CE course on a
          school lorry in place of the Freight-licence gate.
  - [ ] 3.5c Option "Storm closures and convoys" (`convoy`, on): when a storm shuts the fell road (TLXR seg shut on the
        Kjøllefjord-Lebesby leg), traffic queues at the barrier; once the plow opens it, a convoy leaves behind the plow
        at fixed times (the real Norwegian kolonnekjøring): semis and cars in line, 30-40 km/h, gaps 30 m. The player can
        join at the back; leaving the line before the end is allowed but flagged on the Map. Map/compass show the
        barrier and the next convoy time.

### 4. Plowing solo (`tlx-plow.js`)
- [ ] 4.1 The blade (Bytteboden / garage) and the plow truck: drop it, clear a lane, leave windrows.
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
- [ ] 6.2 Slettnes buyable: oil tank (about three game days), oil drums hauled from town, lamp state, Lights app,
      Monday stipend by lamp hours. Two smaller lights on other headlands.
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
        (hull repairs, condition from groundings, winter haul-out).
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
