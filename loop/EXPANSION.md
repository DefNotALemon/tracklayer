# Four Seasons & Enterprise: the expansion plan

Lemon's brief of 10 Nov 2026, condensed, with the plan for building it. This file is the working copy: the brief's
intent lives in the "What it is" and "Rules" sections, the build order in "Milestones", and the state of the work
in "Status". `loop/LOOP.md` goal G4 and its Owner note point here. Owner notes in LOOP.md win over this file.

What comes after this expansion is already decided: The Northern Front, `loop/NORTHERN-FRONT.md` (goal G5).

## Status

| # | Milestone | State |
|---|---|---|
| 1 | Plan and scaffolding | **landed** (v167): this file, `tlx.js`, save key `x`, Options page, itch fix, `x1_save.mjs` |
| 2 | Vehicle core | 2.1, 2.1b landed (v169); 2.2, 2.3 landed (v171); 2.4 landed (v174); 2.5 landed (v176); 2.6a landed (v177); 2.6b landed (v178); 2.6c landed (v180); 2.7 landed (v185): milestone 2 done |
| 3 | Roads and traffic | 3.1 landed (v188); beta fix 0117/0119 standing start (v189); beta fix 0116 #1/#4 a held truck says why it won't move (v190); beta fix 0123 #1/#2 graded road bed + no tight hairpins (v191); beta fix 0121 #2/0122 #2 the pickup crawls through 30-40 cm of powder (v192); beta fix 0127 #2-#4 switchback loops (no bend under 13 m) + bends plowed wider (v194); beta fix 0131 #1/#2 the fjord rescue never lands you on a cliff face (v195); beta fix 0133 #1 no school course with your sled strapped to the trailer (v196); beta fix 0129 #1/#2 pickup traction control + "more throttle" / "steep in this snow" hints (tlx-vehicles v15); 3.2a road snow: storms fill the roads, the council plow clears them, saved, Map shows snowed in (v197); beta fix 0140 #1-#3 no 40 cm cliff, "ease off" only when the wheels spin (tlx-vehicles v16); next: 3.2b (scraped road surface, legend, job warnings) |
| 4-19 | everything else | not started |

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
- [ ] 3.2b Road surface and the pickup: a sled on a freshly plowed road in a cold snap rides scraped bare in the wheel
      tracks (more drag, a "Scraped road" bonus line, sparks off the skis' carbides) vs hard pack on the shoulders;
      the Map app gets a small legend (open / snowed in / closed) and the Jobs/compass row warns when a job's road is
      snowed in; the pickup's stuck line names a snowed-in road ("The road's drifted shut. Wait for the plow or take
      the sled.").
- [ ] 3.3 Parked cars, some buried after a storm. Option: dig a buried car out for pay.
- [ ] 3.4 A few drivers: slow, predictable, stop at an unplowed road. Counts tuned for the low preset.
- [ ] 3.5 Semis in a few sizes with their own coupling. Option: storm closures and convoys on the fell road.

### 4. Plowing solo (`tlx-plow.js`)
- [ ] 4.1 The blade (Bytteboden / garage) and the plow truck: drop it, clear a lane, leave windrows.
- [ ] 4.2 Plow app: municipal routes, driveways, lots, the hotel forecourt; pay by metres and promptness; a
      contract at risk when left unplowed. Jobs app rows.

### 5. Staff (`tlx-staff.js`)
- [ ] 5.1 Staff app: applicants (name, village, wage, experience; traits hidden), expiry, hire.
- [ ] 5.2 Interviews in the haggling chat; overselling about one in six.
- [ ] 5.3 Happiness, raises, praise/criticism in person, notice and quitting, Monday wages.
- [ ] 5.4 Plow drivers: own truck or mine, present in the world, get stuck, ping; tow them, send someone, pay a tow.
- [ ] Options: unpaid-wage penalty, staff improve with time, returning applicants show their record.

### 6. Upkeep and lighthouses (`tlx-property.js`, `tlx-lights.js`)
- [ ] 6.1 Real Estate sells new property types; dust and grit, sweeping and dusting, cleaning kits.
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
      clothing layers that matter; camping gear; provisions (option).
- [ ] 11 Firearms and hunting: weapons, ammunition, seasons and quotas, butcher; people can never be shot.
      Options: hunter's licence school, game warden.
- [ ] 12 Fire watch and trails: towers, fire finder, smoke reports, care packages, trails laid by walking
      (option), hikers, parking lots.
- [ ] 13 Birch sap and berries; first balance pass; property table + cadence scenario in LOOP.md.

### 14-15
- [ ] 14 Boats and docks: skiff first, docks, sea and lake handling, water deliveries, open-water fishing, Boats
      app, boatyard. Options: rowboat, canoe, ferry as a passenger.
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
