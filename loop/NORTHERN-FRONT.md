# The Northern Front: the update after Four Seasons & Enterprise

Lemon's brief of 11 Nov 2026, kept word for word below. It is goal **G5** in `loop/LOOP.md` and it is the NEXT
update once goal G4 (`loop/EXPANSION.md`) has landed. Nothing here is built yet and nothing here is started
before G4 is done.

## Status
Not started. Waiting on G4.

## Why it waits
The brief extends systems that G4 builds, so each has to be on main first:

| The brief leans on | G4 milestone |
|---|---|
| trucks, side-by-sides, the hitch and tow sleds | 2, 9.4 |
| hired staff keeping properties running | 5 |
| seasons | 9 |
| stores, winter clothing | 10 |
| firearms and ammunition | 11 |
| boats | 14 |
| planes, floatplane contracts | 15 |
| world streaming, travelling off the map | 16 |
| Greenland (the Front lies north of it) | 18 |

Already on main: the tablet apps, the supply-run / contract board, tree-deflect and rock-slide physics, the
auto-quality drop and the touch layer (v172).

## How it is built (same rules as G4)
- Read the codebase first and match it; the brief says so and so does LOOP.md.
- New systems are `tlx-<system>.js` files behind `tlx.js` (`TLX.register`, state under `x` in the save), reaching
  the game through the expansion api. Nothing new goes into tracklayer.js beyond small hooks.
- Section 8's extras are `TLX.option` switches on Settings > Options, on by default.
- The Front is a streamed region like Greenland and the county (milestone 16's streaming), not a second engine.
- "Front" is a tablet app (`TABLET.register`); gunruns are a contract kind with a row in `jobsList()`.
- Every control (fire, aim, mounted gun) is bound on keyboard, pad and touch and named through `btn(action)`.
- One slice at a time, each with an asserting `scenarios/nN_*.mjs`; smoke and `x1_save.mjs` pass before landing.
- Section 9 is the finish line: the full loop scenario, the Pages build updated, no branches or stubs left over,
  and a final report that says what is unfinished.

## To settle when planning starts
- G4 milestone 11 says "people can never be shot". The Front needs enemy soldiers who can be. Default: the rule
  stays everywhere else; only Directorate and Allied combatants inside the Front region can be hit, with no gore.
- Slice order. Default: region and one city first (with the phone frame-rate check), then the Front app and
  gunruns, ambush chases, the front-line system, enlisting, citizen fights, the other two cities, the extras.

## The brief

```
TRACKLAYER — MAJOR UPDATE: "THE NORTHERN FRONT"

Repo: github.com/DefNotALemon/tracklayer (local ~/Documents/GitHub/tracklayer, Pages at defnotalemon.github.io/tracklayer/).
Before writing anything, read the current codebase end to end. It has changed a lot recently, so match its existing architecture, naming, file layout and code style. Do not impose a new one. This update builds on the systems already there: the phone apps, firearms and ammo types, stores, hireable staff, vehicles and the universal hitch, seasons, the procedural Greenland and American regions, flying and boating, and the mobile/touch layer. Extend those systems. Don't duplicate them.

== 1. THE SETTING: THE FROZEN FRONT ==
A new far-north Arctic region that loads in when you travel north past the existing map and Greenland (by sled, vehicle, boat or plane). It's a contested war zone.
- It is ALWAYS cold up here. The season system still runs, but the Arctic ignores the warm months. In "summer" you get grey polar light, wind-scoured snow, ice fog and whiteouts instead of mud or thaw. The warmth/exposure drain is harsher than anywhere else on the map.
- Mountain ranges with full-sized abandoned cities built into the valleys and slopes. These are frozen hellscapes:
  - Soviet-style concrete apartment blocks, factories, rail yards, a radar station, a port with ice-locked ships.
  - Snow drifted up to second-floor windows, collapsed roofs, frozen fountains, burned-out vehicles, icicles, wind-blown snow pouring off rooftops.
  - Buildings are enterable where feasible. Interiors are dark, frosted and littered.
  - Streets are rideable by snowmobile, including alleys, ramps made of rubble and drifts, and frozen rivers through town.
  - At least 3 distinct cities, each with its own landmark and layout. Generate them procedurally from building/block kits with hand-tuned landmarks, so they feel authored rather than random.
- Weather: whiteouts that cut visibility to almost nothing, aurora on clear nights, long polar nights.
- PERFORMANCE IS NON-NEGOTIABLE. The game is played on iPhone in Firefox. Cities must stream in chunks, use aggressive LOD/impostors for distant blocks, instance the repeated buildings, and fall back to fog. The existing auto-quality drop has to keep frame rate stable inside a city.

== 2. THE ENEMY ==
A fictional authoritarian northern power, a Russia-style empire. Name it something original (e.g. "the Vostok Directorate"), led by a fictional strongman (e.g. "Marshal Voronov"). Use no real people, flags or insignia; give it its own original iconography.
- Enemy forces: infantry patrols, snowmobile hunter squads, armored snowcats/APCs, BTR-style wheeled vehicles, mortar teams, snipers in the high-rises, helicopter patrols, checkpoints.
- The front line is a living system. Territory shifts between the Allied side and the Directorate based on battle outcomes (including the player's). Show it on a map.

== 3. GUNRUNNING ==
A new courier job type that extends the existing supply-run system.
- Pick up arms crates at depots (ports, airfields, hidden caches) and deliver them to front-line outposts, partisan cells in the cities, or besieged towns.
- Cargo goes on the sled, in tow sleds via the hitch, in trucks/side-by-sides, by boat, or by plane.
- Weight and fragility matter. Heavy loads hurt handling and fuel economy, and crashes can damage the cargo (explosives especially).
- Pay scales with distance, danger and route (main road vs. backcountry vs. through a city).
- Faction rep goes up with the side you supply.
- Optional smuggling variant: the Directorate also buys guns. It pays more, costs Allied rep, and closes Allied missions off if you go too far.
- Add a "Front" phone app in the existing app style: contracts, the front-line map, rep, your enlistment status and assigned battles.

== 4. SNOWMOBILE SHOOTING SEQUENCES ==
- Every gunrun has a chance of an ambush. The chance scales with cargo value, route danger, proximity to the front and rep with the Directorate.
- Ambush types: hunter snowmobiles chasing you, a roadblock, a helicopter run, a sniper pinning a valley, a convoy intercept.
- While riding: the player can shoot one-handed (pistol/SMG) at reduced accuracy, or an NPC passenger/escort can man a gun.
- Vehicle-mounted guns on upgraded sleds and side-by-sides.
- Enemy sleds can be shot, rammed or run into trees and rocks. The existing tree-deflect and rock-slide physics apply to them too.
- Wheelie (Ctrl) and jumps stay usable mid-chase. Chases should funnel through city streets and mountain passes.
- Touch controls: add a fire button and aim-assist on mobile that fits the new mobile control style.

== 5. ENLISTING ==
- Enlist at a recruitment office in a front-line town.
- Rank and pay progression, plus issued gear (white camo, rifle, ammo, cold-weather kit) that's separate from your own inventory.
- You're assigned battles through the Front app: defend a town, take a city block, raid a supply depot, hold a mountain pass, escort a convoy, clear a high-rise of snipers.
- Battles are scripted objective zones with allied and enemy squads fighting it out.
- You can accept or defer assignments. Ignoring too many lowers standing; desertion is an option with consequences.
- Your properties and businesses keep running while you're deployed, through your hired staff.

== 6. FIGHTING AS A CITIZEN ==
- No enlistment needed. You can drive to the front and join any active fight.
- Allied squads treat you as a volunteer. You can pick up battlefield objectives and get paid in salvage, bounties and rep instead of a salary.
- You use your own gear from the existing gun and winter-clothing stores.
- No rank, but more freedom: you choose where and when to fight.

== 7. COMBAT & SURVIVAL RULES ==
- Use the existing firearms and ammo types. Add a few military weapons only where they fit the existing system.
- Cold matters in combat: lying prone in snow drains warmth, gloves affect handling, and weapons can jam in extreme cold without care.
- Injuries are bandaged or treated at field hospitals. Death/defeat follows the game's existing failure rules (lose the cargo, get towed back, etc.). Don't invent a separate system.
- Keep violence game-appropriate: no gore beyond the game's current tone.

== 8. SUGGESTED EXTRAS (code each as a toggle in the Escape settings menu) ==
- Partisan safehouses in the cities you can stock and upgrade like properties.
- Radio chatter and a propaganda broadcast from the Marshal on captured radios.
- Salvage runs into abandoned cities for parts and loot between battles.
- Medevac-by-plane contracts using the floatplane system.
- An armored or armed snowmobile line at the garage, with mechanics who specialize in it.

== 9. DONE MEANS DONE ==
- Everything builds and runs on desktop AND iPhone Firefox, and the deployed Pages build is updated.
- Test a full loop: travel north → gunrun with a forced ambush → enlist → complete an assigned battle → fight as a citizen in a different battle.
- Work on main, or merge any branches you create, then delete them. No dangling branches, stashes, TODO stubs or half-wired features. If something can't be finished, say so plainly in the final report rather than leaving it hidden.
- The final report says what was built, what's toggleable, and any known issues.
```
