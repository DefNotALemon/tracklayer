# Four Seasons & Enterprise: the expansion plan

Lemon's brief of 10 Nov 2026, condensed, with the plan for building it. This file is the working copy: the brief's
intent lives in the "What it is" and "Rules" sections, the build order in "Milestones", and the state of the work
in "Status". `loop/LOOP.md` goal G4 and its Owner note point here. Owner notes in LOOP.md win over this file.

What comes after this expansion is already decided: The Northern Front, `loop/NORTHERN-FRONT.md` (goal G5).

## Status

| # | Milestone | State |
|---|---|---|
| 1 | Plan and scaffolding | **landed** (v167): this file, `tlx.js`, save key `x`, Options page, itch fix, `x1_save.mjs` |
| 2 | Vehicle core | 2.1, 2.1b landed (v169); 2.2, 2.3 landed (v171); next: 2.4 |
| 3-19 | everything else | not started |

Checked against main at 10c6d62 (v166) on the Mac, 10 Nov:
- `smoke.mjs` passes with no environment variables set (exit 0, page errors none), before and after milestone 1.
- The cloud session's `tracklayer-expansion-m1.patch` never reached the Mac (not on disk, no branch on origin), so
  its three commits were rebuilt here from the brief: this file + G4 + Owner note, the itch fix, and the harness
  change (here: `mksite.py` copies every top-level script; the Linux-only part was not needed and is not done).
  If the patch turns up, do not apply it: it will conflict with this.
- `btn(action)` was not on main at v166 (only the tutorial's private `TUT_L` / `tutBtn` table). Slice 2.1 (v168)
  made it the general helper.
- The builder and playtester loops are retired (Lemon, 6 Nov: no AI runs unless he asks). Nothing pushes to main
  unattended any more. This expansion is built in sessions Lemon starts, one slice at a time, in the worktree
  `~/Documents/GitHub/tracklayer-expansion` (branch `expansion`, lands on main). Fetch and rebase before a push
  anyway: Lemon and other sessions still commit.

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
- [ ] 2.4 Tablet, map, jobs and parcels from the pickup's cab (the tablet must open in every vehicle and on foot).
- [ ] 2.5 The universal hitch: one small coupling for sled, pickup and every small trailer; receivers stay as
      weight ratings. The five existing rigs hook to the pickup.
- [ ] 2.6 A trailer that carries a sled: ramp, drive on, strap down, tow behind the pickup, drive off.
- [ ] 2.7 Bytteboden "vehicles" category (wear, haggling, lemons), README, Progression-map row for the pickup.

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
- [ ] 3.1 The network: streets in Kjøllefjord and the villages, roads between towns on sensible lines (graph +
      meshes), shown on the Map. Static first.
- [ ] 3.2 Dynamic road snow: per-segment depth through the same snow field, storms fill it, saved; yards stay
      as they are. Map shows open / snowed in / closed. Sled on hard pack vs scraped bare.
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
