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

## The goals

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

### G4 Four Seasons & Enterprise (the expansion)
Lemon's brief of 10 Nov 2026: a year-round life on the Nordkinn with businesses to own (lighthouses, inns, a hotel,
plowing, fire towers, workshops) run from tablet apps and staffed by people; four playable seasons; trucks, trailers,
roads and traffic, boats and bush planes; then two generated regions, Greenland and a Maine-style county.
The plan, the 19 milestones, their slices, the rules and the open decisions are in **`loop/EXPANSION.md`**: read it
before any G4 work and keep its Status table and slice ticks current. New systems go in their own `tlx-<system>.js`
files behind `tlx.js`, never into tracklayer.js. `scenarios/x1_save.mjs` (old saves load) must pass with smoke.
G4's backlog is EXPANSION.md's slice list, taken in order; the Backlog below carries one pointer line for it.

### G5 The Northern Front (the update after G4)
Lemon's brief of 11 Nov 2026: an always-frozen war zone north of Greenland with three abandoned cities, an original
enemy power, gunrunning contracts with ambush chases, enlisting or fighting as a citizen, and a Front tablet app.
The brief, what it waits on and the build rules are in **`loop/NORTHERN-FRONT.md`**. It starts only when G4 has
landed, and it is built the G4 way (`tlx-<system>.js`, options as switches, one slice at a time).

### G6 Living enemy NPCs (the update after G5)
Lemon's brief of 11 Nov 2026, queued right behind the Northern Front: make enemy NPCs feel alive, Gray Zone
Warfare style. Applies to the Directorate combatants G5 introduces (and any other hostile NPC, e.g. the
poacher/hostile-encounter hazard from the 11 Nov HUD slice, if it still exists by then).
- **Idle behaviour**: when not alerted, NPCs run idle task animations instead of standing like statues —
  smoking, drinking, eating, leaning against a wall/vehicle/railing, and eventually nodding off/falling asleep
  on a long idle. Picked by a per-NPC idle-behaviour timer/state, highly realistic animation per the standing
  rule (weight shifts, no snapping between poses).
- **Hearing**: an NPC within earshot of a quiet scene can hear a nearby enemy's death scream if one is
  released (i.e. one of their own silently killed close by) and react — this is the alert trigger, not
  gunfire/vehicle noise (those presumably already alert at longer range; don't touch that if it exists).
  Needs a sound-event system with a radius/volume check per NPC, gated by ambient noise level if the game
  already models one.
- **Memory + investigation**: on losing track of the player, an NPC keeps a vague/fuzzy memory of the
  player's last seen position (not a precise pin — enough to search near, not snap back to the live player).
  A "ballsy" NPC (vs. a cautious one — needs some per-NPC trait or role split) then runs an investigation
  period: moves to investigate the last-known area for a while before giving up and returning to idle/patrol.
  Cautious NPCs might instead fall back, call it in, or just stay alert without approaching — exact split is
  open for whoever plans this slice.
- This is new NPC AI infrastructure, not a one-off: build it so any future enemy/hostile NPC type can plug
  into the same idle/hearing/memory/investigation state machine rather than each getting bespoke code.
- Build it the G4/G5 way: `tlx-<system>.js` behind `tlx.js`, options as Settings > Options switches where it
  makes sense (e.g. a difficulty-flavored toggle for how sharp NPC hearing/memory is), one slice at a time,
  each with an asserting `scenarios/nN_*.mjs` or follow-on numbering, smoke + `x1_save.mjs` before landing.
- Starts only once G5 (The Northern Front) has landed — plan its slices then, the G4/G5 way, probably in its
  own `loop/LIVING-NPCS.md` brief doc mirroring NORTHERN-FRONT.md's shape.

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

- **25 Nov, Lemon: finish what was asked; nothing half done.** "take the time and power now to finish the big updates i've asked for in the past few weeks. i keep finding small things you either half finished or didn't even pick up to work on when i told you to and i want that to end". The single list of open asks is `loop/OPEN.md`: read it first, add every new ask to it at once, remove a line only when it is on main and checked. Same day: the Indoors and Senses update (walk-in places, a word with anybody, furnishing, radio stations with sound and safety cut-ins, DualSense haptics, camera app, field guide, Paths app, save slots, summer hiking and swimming) is slices I1-I10 in `loop/HOME.md`; Gram's Local covers the whole land you are in and Reels the whole world.
- **17 Nov, Lemon: LIVING WORLD, GTA-6-flavoured themes and dynamic world events (release 1 built in v243; the direction stays open).** His words: "in prep for gta 6 i want to start adding gta 6 style themes and dynamic world events, like cop chases, which youre the star of if youre speeding on any type of vehicle, or just being rude on the road, snow, or wheeeever else that mkaes the world more world. maybe add renting apartments for cheap and buyin places expensive", then "also add slumlords". Read the broad scope, not just the three things built: Tracklayer keeps its northern identity (Finnmark, snow, the existing canon) and takes GTA's *feel* (a world that notices you, consequences you can run from, living places to rent and own, people who exploit you), never its IP, names or a reskin. Built in release 1: the Politi (`tlx-police.js`: cruisers that patrol as real traffic cars, witness/sight rules, warn -> pursuit -> search -> escape or fine; limits by place so normal snowmobile travel is never speeding), flats to rent cheaply or buy dearly with persistent tenancies and no double charges (`tlx-housing.js`, Homes app), and slumlords with real state (faults, slow or no repairs, retaliation, complaint to the municipality, deposit kept). Options: `police`, `rentals`, `slumlords`. NEXT, in this spirit (builders: pick up from here, one slice at a time, each behind its own TLX.option and with an asserting scenario): more dynamic world events that make the world feel alive and reactive (a road accident to stop at or help with, a breakdown to tow, a drunk driver the Politi chase, stunt/race meets, a protest or a market day in town, an avalanche warning on the fell, a snowmobile theft you can report or commit), police depth (roadblocks and stingers on the roads, a helicopter in a storm-free chase, a station and a cell, a record that follows you to the job board, bribes and lawyers, a stolen-vehicle flag), housing depth (furnishing and decorating a flat, a landlord who lets you sublet, guests, a flatmate, mortgages instead of paying cash, property tax, a bigger house or a farm to buy, a flat inspection day, eviction fights), more landlords/tenancy scandals (mould that makes you ill, a hidden fee found in the lease, a landlord who enters unannounced, a tenants' group), and the shape of a living town (people with routines, shops that close, a local paper). Not yet built: boats and aircraft are not policed; the Politi don't ticket on foot; no police station interior; flats have no sleeping/time-skip interaction; only one tenancy at a time.
- **16 Nov, Lemon: the UI is far too big and ignores the space it has (done v240).** The itch.io embed is exactly 640x360 CSS px (the screenshot was a 2x retina capture of an old build, `2026.10.15-c90cbe0`, which still showed the zone panel; the live web build never does). Standing rules from this: lay out from `innerWidth`/`innerHeight` (never the screen or DPR); 640x360 is the priority acceptance size, then 960x540, 1280x720, 1366x768, 1920x1080, ultrawide, tablets and phones both ways; compress structure, don't scale everything; keep the middle of the screen clear; the zone panel stays off and third-person riding keeps no minimap. Any HUD/menu/modal change must pass `tools/playtest/scenarios/ui_responsive.mjs` (gate it: `gate.sh ui_responsive`). CSS stays inline in `index.html` (the itch workflow and `mksite.py` copy only index + JS + icons + vendor). itch is MANUAL: Actions > "Push to itch.io" (needs `BUTLER_API_KEY`); GitHub Pages is the live site.
- **14 Nov, Lemon: Kjøllefjord roads, no fences.** His words: "remove the fences from the tracklayer towns, i like
  the idea but i'd rather have the roads visible as roads that still have a slight layer of snow on them and a curb on
  the sides? idk what else could be done that's just my thought as a mainer". Done in v238 (`townRoads()`): picket
  fences gone, the street grid is an asphalt ribbon with a thin snow film, curbs with snow caps (gaps at spurs), storm
  drains. Villages' own streets (`tlx-roads.js`) and the long roads were NOT given the ribbon; follow-on if he wants it.
- **14 Nov, Lemon: guns and Tarkov-style customization, prioritized, frustrated at slow progress.** His
  words: "add in can we add directives to add a lot more rocks... get other agents working on guns and gun
  customization, and gun parts/upgrades like scopes, magazines, better ammos, grips to hold, longer barrels,
  stocks, different handles, different frames, i want tarkov customization with streamlining for on the go
  quick customization. i really want you to get going here, you've had days and produced very little
  progress." This is G4 milestone 11 (EXPANSION.md, lane D), which lane D had not reached yet (still on
  10.2+). Elevated: lane D builds 11 next, AHEAD of finishing 10.2-10.4 (the design, slices 11.1-11.5, is
  written out in EXPANSION.md under milestone 11 now — read it there). 11.1 (core weapon model + gun shop
  shell) and 11.2 (the quick-customize wheel — the actual centerpiece of this ask) were dispatched as an ad
  hoc same-session builder pass on 14 Nov in worktree `tracklayer-guns`, NOT lane D's worktree, so lane D:
  check EXPANSION.md's Status table before starting either slice — if they're landed, start at 11.3. If
  progress still looks slow to Lemon: the platform runs one interactive delegate_task child at a time from a
  live chat session, but the 4 lane crons (A-D) plus 2 beta testers run continuously and independently of
  that — `hermes cron list` shows all of them `[active]`, firing every 10 min, each already landing versioned
  commits (check `git log origin/main` for the pace). If a lane looks stuck, check its own cron's `Last run`/
  failure streak before assuming nothing is happening.
- **14 Nov, Lemon: a lot more visible rocks, with real collision behaviour (built this session).** His words:
  "add a lot more rocks, all of which are visible and pop out of the snow, and if you run over one from now on
  it either bucks you to the other side, or just throw you off if you're going fast enough, usually while
  stopping the sled." Rocks already exist (`rockGeo`/`rm` InstancedMesh near line 1108, placed by `bioAt`/
  elevation with `addOb`) but are sparse away from the fell/tideline and are partly buried (`y = groundAt + fr*0.3`,
  fresh snow can cover them). Scope: (1) far more rocks, spread so riders actually meet them while riding, not
  just on the high fell; (2) every rock sits clearly above the snow surface (no half-buried look); (3) hitting one
  at low/moderate speed "bucks" the sled sideways (a real deflection/kick off the rock face, not a soft glance),
  at high speed it throws the rider (`crashEject`), and either way the sled scrubs hard to a stop (not a hard wall
  stop or a free glide-past). Give rocks their own obstacle flag (don't just reuse generic "hard" — that's shared
  with buildings/posts, which should keep their current full-stop feel) so the tuning is isolated. Keep well clear
  of town/depot/doors/road beds (don't make Kjøllefjord or the road network suddenly full of rock hazards).
- **14 Nov, Lemon: PHYSICAL 3D town redo, towns with real block structure (correction, built this session).**
  His words: "hand draw the map again with much more depth to the towns so they look designed around roads
  with city blocks internally, and plenty of snowmobiling stuff on the outskirts... i want the map to be
  more cozy in towns and realistic" — then, when the first pass only reworked the tablet Map app's chart,
  he corrected it: "i meant the physical map, like the 3d world." So this is NOT a chart/rendering task:
  it's the actual 3D town geometry. `buildTown()` (~line 11597) currently places houses along organic
  depot→door lanes (`buildLanes`, A* routed round obstacles) radiating from the quay — not a street grid.
  Scope: (1) regenerate Kjøllefjord's actual layout so real streets form a grid with interior blocks of
  houses between them (actual road meshes/plowed lanes in the 3D world, not a map overlay); (2) the town
  should feel cozier and more realistic up close (the houses, yards, lighting — whatever reads as "designed"
  rather than scattered); (3) the outskirts (edge of town / backcountry approach) get real 3D snowmobiling
  infrastructure — trailhead signage, a groomer shed/sled parking area, fuel cabins, warming huts — as actual
  placed structures, not map icons. Hard constraint: doors must stay reachable, plow lanes must still clear
  to every door, NPC/traffic routing must still work, and old saves must still load (`x1_save.mjs`). Test
  with a chase-cam/overhead screenshot of Kjøllefjord from above and street-level, judged with vision, not
  just code review. The earlier "hand-drawn map" Owner note above this one landed real value (tablet chart
  detail, v220) but was the wrong layer — leave that landed, this note is the actual follow-up it pointed to.
  **LANDED v227 (14 Nov, same session):** stages (a) cohesion, (b) a real street grid and (c) outskirts snowmobile
  infrastructure all landed. Three E-W + four N-S plowed streets (Kaigata runs to the pier), ~26 houses in regular lots gable to
  the street round back alleys, picket fences/sheds/woodpiles/mailboxes/fairy lights, store on Kaigata, church at the south end,
  street lamps; `buildLanes` now only plows door-apron spurs to the streets (`D.grid`); east edge: sled park (6 sleds), groomer
  shed + groomer, warming hut, jerry-can stand, SKUTERLØYPE arch + groomed trail + stakes. See PROGRESS 14 Nov entry. STILL A
  FOLLOW-UP: the quay-side core (pier, freight shed, racks, garage, depot pen) was not regridded and the grid is axis-aligned so the
  diagonal shore has no houses; no plow banks along streets; streets are plowed lanes, not a road mesh; the old g1_lanesob
  `lot9` walk is dead (that lot is gone); villages (Gamvik, Lebesby...) still use the old village layout with A* streets.
- **14 Nov, Lemon: hand-drawn map redo, towns with real block structure (built this session, landed v220 — see correction above).** His words:
  "hand draw the map again with much more depth to the towns so they look designed around roads with city
  blocks internally, and plenty of snowmobiling stuff on the outskirts... i want the map to be more cozy in
  towns and realistic." Target is the tablet Map app chart (`buildMapBg`/`drawMap`, canon section above — still
  ONE map, no big map): draw it with real depth in Kjøllefjord and any other settlement — a recognisable street
  grid with interior blocks (not the organic depot→door lanes alone), warm/cozy colour and lit-window detail in
  town, and the outskirts dressed with snowmobiling infrastructure (trailheads, groomer parking/shed, fuel
  cabins, warming huts, marked trail lines) rather than empty white. If the underlying `buildTown`/lane layout
  can't be fully regridded this pass without risking the town's working doors/lanes/plow routes, it's fine to
  improve the chart's drawing/legend/detail first and leave a note here for a follow-up pass that reworks the
  actual street layout into blocks. Judge with a Map-app screenshot over Kjøllefjord, zoomed in and out.
- **13 Nov, Lemon: brakes should stop a riderless sled no matter which way it's moving.** Fall off (crash
  eject) and the sled should brake to a stop whether it was moving forward or backward at the moment you came
  off — not just forward. Likely root cause, found while checking the empty-fuel reverse-speed report above:
  the main brake term (~line 3534) is `F -= (vf > 0.6 ? 4200 : 1100) * input.brk;` — this is NOT sign-aware, it
  always subtracts a positive force regardless of `vf`'s sign. When riderless (`CRASH.on` forces `input.brk = 1`
  at ~line 3449) and the sled is already drifting backward (`vf < 0`, e.g. sliding tail-first down a slope), this
  term makes `vf` MORE negative instead of toward zero — i.e. the "brake" accelerates it backward. The `rev`
  branch right above it explicitly excludes `CRASH.on`, so riderless-backward never reaches the reverse-gear
  logic either; it falls straight into this broken term. Fix: make the plain-brake term oppose current motion,
  e.g. `F -= Math.sign(vf) * (Math.abs(vf) > 0.6 ? 4200 : 1100) * input.brk;` (or clamp so it can't push `vf`
  past 0). This is probably the SAME bug as the "gains speed in reverse on empty fuel" report above — check both
  together. Fixed = after a crash/dismount, the riderless sled's speed (either sign) decays to 0 under full brake,
  verified with a scenario that crashes it while moving backward AND while moving forward.

- **13 Nov, Lemon: three reports.**
  1. **Tether rope should clear on dismount.** Get off the sled (Q) and the tether/kill-cord rope should not still
     be visible/attached to the rider. Current code (`ropeTick`, ~16780-16800) only clears `ROPE.clip` on remount
     when `!C.on` (not mid-crash) and `(!FOOT.on || !tetherOn())` — check whether a plain walk-away dismount
     (not via a crash) actually reaches that clear, and whether the rope mesh visibility follows `ROPE.clip`
     reliably in that path. Fixed = rope never shown/attached once you're off the sled on your own feet (not via
     a crash ejection), full stop.
  2. **"X: size it up" prompt has no function.** `rescuePrompt()` (~line 15525) shows `X: size it up · walk the
     line to <name>` when `nv.d < 20` but not yet hooked. Check what pressing X actually does in that state —
     `rescueAssess()` (~line 15503) looks like the intended handler (announces pull direction, anchor, lb needed)
     but verify it's actually wired to the X input while un-hooked; if it isn't reachable there, either wire X to
     call it or drop the prompt text until it is. Playtester: confirm X does something useful in that exact state
     before calling it fixed.
  3. **Gaining speed in reverse with an empty tank.** Fuel at 0 should kill all engine-driven motion (forward and
     reverse). `thrE` zeroes on `GS.fuel <= 0` (~line 3492) and the `rev` reverse-gear flag also requires
     `GS.fuel > 0` (~line 3528), so neither should be pushing speed backward out of fuel — the speed gain reported
     is likely coming from gravity/slope sliding (downhill) with no engine braking available, which may be
     correct physics reading as a bug, or there's a separate path still applying backward force. Playtester:
     reproduce on flat ground AND on a downhill with an empty tank, log speed over time in both, and report which
     one actually gains speed before the builder changes anything — don't "fix" realistic downhill sliding by
     mistake.

- **11 Nov, Lemon: Living enemy NPCs (goal G6), after the Northern Front.** Next on the docket after G5: enemy
  NPCs feel alive, Gray Zone Warfare style — idle task animations when not alerted (smoking, drinking, eating,
  leaning against something, falling asleep); they hear a nearby enemy's death scream if one is released quietly
  and they're in range, and react; and they keep a vague memory of the player's last-seen location with an
  investigation period afterward if that particular NPC is ballsy (cautious ones presumably hang back instead).
  Don't start before G5 lands; don't fold into G5. See goal G6 above for the full brief and build approach.
- **11 Nov 2026, minimalist HUD + survival stats + bleed/bandage (done, v174; tlx-hud.js, tlx-survival.js, tlx-wounds.js, scenarios/x4_hud.mjs; the bandage control is U / D-pad down / BANDAGE button).** Full HUD redesign: bottom-left
  vertical stack (bottom→top) red warmth / brown hunger / yellow fuel / blue thirst bars, each fades out after
  a few idle seconds and fades back in on change; bottom-right speed number with a rev-bar arc around its
  top-left; top-middle an Elder-Scrolls-style compass strip (N/E/S/W letters drifting as you turn, a triangle
  marker under it pointing up, the current job's name appearing under the triangle for a couple seconds when
  you're pointed at it, then fading). Hunger and thirst are NEW stats (confirmed by Lemon 11 Nov, "they're new
  stats") — no existing game data to reuse. Also asked in the same message: getting shot pops up a NEW red
  health bar from the bottom that pours out per hit taken; bandages can cover each hole but you have to apply
  them fast or you keep bleeding. Lemon didn't answer the follow-up clarifying questions (what shoots you,
  drain/refill rates, lethality) before this was built — two clarify() calls timed out — so it was built to
  reasonable scoped defaults: hunger/thirst drain passively like warmth and refill at the quay; a rare, optional
  (Settings > Options togglable) poacher/hostile-encounter hazard out on the backcountry fell is what can "shoot"
  you (no firearms system, no enemy squads); wounds bleed down the new health bar and are lethal if ALL bleed
  out and go unbandaged (same failure path as a crash — towed back, no separate death screen), capped at a few
  wounds at once so it's scary but fair. **This is NOT the Northern Front (G5).** G5 stays exactly as the note
  below says: full firearms/ammo, enemy combatants, gunrunning — gated behind G4, not started. This slice is a
  small standalone hazard + HUD feature built outside that sequencing because Lemon asked for it directly in a
  live session; it must not grow into G5 content (no enemy soldiers, no guns the player carries, no front-line
  system) without a fresh brief. Revisit the defaults above if Lemon corrects them.
- **11 Nov 2026, getting on and off the sled (done, v173):** "rethink the animation for the player getting on and off the snowmobile to be a dynamic natural swing of a ragdoll over and onto a snowmobile, not this teleport slide move through the air until your character is in position." Built as the swing (`SWG` in tracklayer.js, block comment "getting on and off: the swing"): a simulated body with pinned contacts, a walk to the board first, no figure ever moved by a lerp. Keep to it for any later on/off work (passengers, the pickup's door sequence still uses the old posed approach). Test: `scenarios/g2_swing.mjs`.
- **11 Nov, Lemon: The Northern Front (goal G5), after the seasons.** Once the Four Seasons & Enterprise expansion is in, the next update follows my "Northern Front" brief, kept word for word in `loop/NORTHERN-FRONT.md`: the Frozen Front region, the Directorate, gunrunning, snowmobile shooting, enlisting, fighting as a citizen. Don't start it before G4 is done; don't fold it into G4. Gore: I want it, whatever section 7 of the brief says.
- **10 Nov, Lemon: mobile (landed v172: the v167 cloud-session diff, merged onto main's v171).** Asked for: optimise for phones, detect phones, drop graphics until the frame rate is stable, fix the button placement, full screen on his iPhone in Firefox, and "controls meant for mobile when walking around, when doing anything, change up the style entirely". What landed: (1) birches split into 512 m cells and culled by `GFX.treeR` like the pines (they were one 25k-instance mesh drawn at every distance: ~18.7M of ~21M tris/frame on the low preset; now ~2.6M); (2) the sun's shadow map is redrawn every `GFX.shadowEvery` frames (it had been drawn once at boot and never again since aebf53e, so shadows were frozen at the title spot); (3) `QG`, a frame-rate governor on Graphics: auto that walks 7 rungs (render scale, shadow cadence, shadow map size, tree distance) to hold 55 fps, detects a capped frame rate (iPhone Low Power Mode) and holds instead of blurring, backs off failed step-ups; Settings > Graphics (auto / high / low, frame-rate readout, full screen); (4) `GFX.mobile/phone/ios/standalone` + html classes; (5) a new touch scheme (index.html "touch controls: the mobile scheme", tracklayer.js "touch controls"): floating left stick (steer; on foot walk / turn / rim = jog), analog GAS pedal + BRAKE + HOP / LEAN / WHEELIE / HORN arc, on foot one context button named from the wnPrompt hint (STRAP, DIG, UNHOOK...), GET ON / SIZE UP, drag-to-look, TABLET + MORE sheet; phone portrait / landscape layouts that don't overlap from SE to Pro Max, notch-safe; (6) web-app manifest + Apple tags + icons so Add to Home Screen runs full screen on iPhone (iOS WebKit has no element full screen), with a how-to card. Bots: keep these working; new touch controls go through this scheme (ids `tc*`), new on-foot E/X actions get their touch button for free if their prompt uses the "E: verb" / "X: verb" form. **Merge note (11 Nov):** the cloud session's work only survived as diff text, so it was applied with `git am --3way` onto main after the vehicle core (v168-171) landed. Resolved so both survive: the on-foot E button (`tcUse`) reads `footUse()` (the pad and hint line's source of truth) instead of regex on the hint, `touchCtx()` keeps only the X extras (DOUBLE/SINGLE at the strap, SIZE UP when stuck), GET ON (`tcOn`) uses `VEH.cur.nearMount()` so it works at the Fjellvogn, GET OFF (`tcQ`) also shows in any `VEH.cur`, hint text goes through `keyHint`/`btn` (the patch's `touchHint` regexes were dropped), `BTN` touch labels name the stick. `x2_use`/`x2_pickup` scenarios moved to the `tc*` ids; new `x3_mobile.mjs` asserts the phone layouts (SE to Pro Max, both orientations), stick / gas / on-foot buttons and Settings > Graphics. Left for later: a SIZE UP for rescue (`rescueAssess`) on touch, a GET OFF button when riding the sled un-bogged, tuning the governor on real iPhones. Check phone layouts at 390x664, 375x548, 844x340 with touch emulation before landing UI changes.
- **10 Nov, Lemon: Four Seasons & Enterprise (goal G4).** Tracklayer becomes a four-season game with businesses to own, more machines, boats, aircraft and two new regions. My brief is condensed in `loop/EXPANSION.md`, with the build order (19 milestones, landed in order, one slice at a time) and the open decisions and their defaults. The two new regions, Greenland and a Maine-style American county, are my decision: "keep the Norwegian Finnmark setting" still holds for the Nordkinn, which stays hand-built and home. Nothing existing is removed or retuned; a player who only delivers parcels should find the game as good as today. Everything the brief calls a suggested addition is built as a switch on Settings > Options, on by default.
- **6 Nov, Lemon: no more Roblox.** Web game only. This overrides the 30 Oct "web first, then Roblox" rule: don't port anything, don't add PORT.md lines, don't work in tracklayer-roblox.
- **6 Nov, Lemon: Santa's Sled, runaway reindeer and wildlife (landed v163/164, c1c222f).** Built in-session: rare Bytteboden listing (cat "rare"), trailer pickup to the garage, nine harnessed reindeer roaming the map (Rudolph after eight), team pulls the sled once all nine are found; reindeer herds, moose (solid), arctic foxes, mountain hares on the shared IK quadruped rig (`quadMake`/`quadPose`, test `tools/playtest/scenarios/g2_santa.mjs`, gait strips `g2_gaits.mjs`). Follow-ons for the bots: judge the gaits against the realistic-animation rule (turning on the spot, gait blend at walk/trot boundary, hare idle sit-up), a minimap/Map marker or Logbook line for wildlife seen, more creatures (ptarmigan flocks, wolverine), and a sleigh tow/harness pass so traces sag and the team follows the actual path rather than an arc.
- **30 Oct, Lemon: web first, then Roblox (standing rule).** Every change to Tracklayer from now on ships in BOTH games: it is designed and built on the website first, and once it lands on main it is ported to the Roblox alpha (tracklayer-roblox, its own map Ravnøya). Builder: when you land a player-facing change, add a matching line to the Roblox repo's `loop/PORT.md` backlog (`- [ ] PORT web vN <hash>: what the player gets`) so the port loop picks it up.
- **30 Oct, Lemon: highly realistic animation (standing rule for the whole game).** Every animation (walking, wading, climbing on/off, crashes and getting up, skiing, seated poses, hands on the bars, passengers, NPCs) should look highly realistic: a real human gait cycle (heel strike, roll, toe-off, knee flex in swing, hip/pelvis rotation and a small vertical bob, opposite arm swing, head steady), feet planted with no skating or sliding, weight shifts before a step, smooth blends between states (no snapping between poses), momentum and follow-through. New animation work must meet this; existing animations get upgraded over time (backlog item below). Judge from slow-motion still strips (every ~0.1 s of game time) side-on and front-on, not single frames.
- **30 Oct, Lemon: new-player tutorial, arriving on foot on the ferry.** A brand-new save starts aboard the coastal ferry (STEAMER) as she comes into Kjøllefjord: the player is on foot on her deck and can walk around while she berths (the town, quay and depot in view). She ties up, the gangway goes down, the player walks off onto the quay and a short guided tutorial takes them through the basics in order: walk to the depot/garage, meet the sled, climb on, the first short ride, take a parcel and deliver it, the tablet (map, jobs), refuel, and how the ferry/mail clock works. One goal at a time, shown with the compass/arrow and short notes in the game's voice (no walls of text), every control named through the adaptive prompt helper (`btn(action)`), and the player can skip it (title menu / first prompt) and replay it later (Settings). Saved as a flag in GS so old saves never see it. Must work on keyboard+mouse, pad and touch.
- **30 Oct, Lemon: walking on ground without snow (new feature, needed by the tutorial).** On foot on any surface with no snow (the ferry deck, the gangway, the quay/pier planks and concrete, plowed or bare ground, indoors, melted-out ground in spring) the player walks at a normal human pace (~1.4 m/s walk; a brisk ~1.8 if held, a jog only if there is a run input) with a normal, highly realistic walking animation, not the snow-wading high-knee trudge. Blend smoothly between wading and walking as the snow gets shallow (by snow depth under the boots), so stepping from the quay into a drift changes gait gradually. Hard-surface footsteps should sound and look right (no boot prints or trench stamping on planks/concrete). Measure: speed by gameClock on deck, quay and fresh powder; a side-on still strip of one gait cycle on the quay.
- **27 Oct, Lemon: adaptive controls (standing rule for the whole game).** The game detects on its own whether the player is on a controller, mouse+keyboard or touch, switches live when they change, and shows the controls for THAT scheme only (never keyboard hints to a pad or touch player). For a controller it detects the brand/model (PlayStation/DualSense, Xbox, Switch, Steam Deck, generic) and shows that pad's own button names and icons. A dedicated builder (branch `inputprompts`) is building the prompt system now; until it lands, loop builder: stay off readInput/phantomPad, the #help panel, the How-to-play page and the touch-control UI. After it lands, EVERY new or changed player-facing control text (toasts, help, cards, tablet hints) must go through its prompt helper, never a hard-coded key; playtester: check new features under all three schemes.
- **26 Oct 23:40, Lemon: smoother snow LOD (top priority until he's happy).** He likes the visual changes so far, but about 30-40 ft (9-12 m) from the player is the most visible line where the snow changes drastically. Make that transition invisible: no ring, band or sharp change in brightness, ripple detail, sparkle, shading or texture as distance grows; everything should fade gradually over a wide range. Find the real cause from stills first (a still from the chase cam on the open fell at noon AND at night, plus a ground-level shot looking along the snow; crop and zoom on the 8-14 m band; also try each candidate switched off). Candidates: the sastrugi/ripple normal aliasing or its fine octave at grazing angles, the micro drift-shadow march (uMicroK), sparkle/glitter, snow texture mip/anisotropy switch, the sun shadow-map span/cascade edge, the sky-sheen (glancing) term, the 25 cm grid blur. Fix with distance/footprint-based fades (fwidth/derivatives), not by deleting the detail near the player. Re-check the 45 m patch→far-terrain handover too while there. Verify before/after on the same views at several hours, and on the GFX low preset. Playtester: verify every builder attempt at this from the rider's normal view.
- **26 Oct 23:55, Lemon: same LOD problem on mountains.** Mountains look grey from far away, then turn white as you get closer: a distance-based colour/LOD switch, not real lighting. Snow-covered fells should stay snow-white (with honest aerial perspective/haze and shade) at every distance, and the change as you approach must be gradual and unnoticeable. Suspects: far-terrain rock/scree blend (v90 thin-snow rock per pixel), far-terrain material vs near patch colour/albedo mismatch, far shading/drift tint (v74/v88/v101), haze/fog colour, mip-level averaging of the far snow/rock texture. Measure: shoot the same fell from 2000/1000/500/200/100/50 m along one line, sample its mean colour per shot, and make the curve smooth. Part of the same top-priority owner item.

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
| Fjellvogn pickup (G4, v171) | 4200 new; used ~2400–3800 on Bytteboden from 6 (v185) | 0 | 105 kW, 8.2 kN | wheels: sinks in powder | mu 0.42 hard / 0.22 loose / 0.12 ice | 70 | n/a | not a sled: plowed yards, lanes, hard pack only; heated cab (cold 0.12), 8 parcels in the bed, 1,500 kg hitch (rigs, Fjordhenger sled trailer $950, used ~550–850); cond trims power (50% = 83%), repair $20/point at the garage; up to 3 owned |

Ranks/contracts (pay = average offered): 3 deliveries grooming ~$900 (needs groomer $700 + receiver $150, both
Woodsman-tier, so really opens at 4); 5 heavy freight ~$1500 (trailer $900 + Freight licence); 12 priority
~$2450; 20 Slettnes expedition ~$3500 (flatbed $2400, Ranger-tier). Board parcels: $145 avg at 0–5 deliveries
(0.6 km), ~$295 at 6–10 (roaming, 2.3 km), ~$370 at 12+; all ≈ **$48–60 per estimated minute at every level**
(sled upgrades only raise it by beating the estimate). First upgrade (Woodsman $600 at 4 deliveries) ≈ 4–5
round-town jobs ≈ 15 game-min: on target. After that a single contract outpays 6 parcels.
Cadence (b93 `g2_cadence.mjs`, greedy best-$/min player, game's own est-minutes; real riding ran ~2.4x faster than est
on early legs): every sled is bought the delivery it unlocks. Est-min from a new save: Woodsman 12–14, Ranger 40–44,
Sprint 77–96, Summit 124–133, Trekker 172–182, Apex 250–258, Matriarch 410 (parcels-only 418, 5 deliveries late on
cash), Aurora 478 (rig player). Gaps 4/4/5/5/6/8/14/14 deliveries.

## Backlog
- [x] G3 (OWNER, top, fixed v223, beta 0170 #1): riderless sled brake only decelerates forward motion, accelerates backward drift instead of stopping it — see Owner notes 13 Nov (sign-aware brake fix), likely same root cause as the reverse-on-empty-fuel item above.
- [x] G3 (OWNER, top, fixed v298, lane A; checked by scenario and a still, not by Lemon): tether rope stays visible/attached after a plain dismount (not a crash) — should clear. See Owner notes 13 Nov. Found: a plain Q get-off never drew it (0 of 80 frames); the rope on a standing rider was the one left clipped after a crash had thrown you (every frame until you walked 2 m off or got back on). Now it is drawn only while the crash has you. `g3_tether.mjs`.
- [x] G3 (OWNER, top, fixed v297, lane A; not yet tried on a real pad or phone): "X: size it up" prompt near an unhooked rescue victim does nothing — wire it to rescueAssess() or drop it. See Owner notes 13 Nov. Found: X on a keyboard and an Xbox pad did read the job out; on a DualSense the line still said "X" (the button is □, and ✕ does something else), on a Switch pad "X" (it is Y), and on touch there was no button at all. The line now names the control on the device in hand and the SIZE UP button shows on touch. `g3_sizeup.mjs`.
- [x] G3 (OWNER, top, fixed v223: on the flat it was the same brake term; holding the brake on an empty tank while rolling back 4 m/s went to 28 m/s, now stops in <1 s. Downhill sliding with no engine is left as physics): empty tank appears to gain speed in reverse — playtester must confirm flat vs downhill before any fix. See Owner notes 13 Nov.
- [x] G4 (beta 0320 #1 BUG + #2, fixed tlx-vehicles v34, lane A): a feathered pad trigger stalled dead in 25 cm+ of powder (30%: 0.0 m)
      and a trigger at a tenth was told nothing; light pedal now pulls like an automatic in first, and a held-still truck keeps its
      reason in the driving hint. `x3_crawl.mjs` / `x3_crawl_break.mjs` find a spot again (obNear 25/15). New `x3_feather.mjs`.
- [x] G4 2.2 (beta 0364 #1 BUG, fixed tlx-vehicles v37, lane A): a truck with a pump beside the driver's door kept you in the cab
      ("No room to open the door here.", a toast the report missed). Now the passenger door: slide over, out and in on that side.
      `x2_passdoor.mjs`.
- [x] G4 2.2 (beta 0364 #2/#3 POLISH, fixed v292, lane A): the fill toast summed across a move without leaving the pump (115 L
      "pulled" into a 70 L tank): one fill is one tank now (a tank that stands elsewhere, holds a different amount or lost fuel
      closes the count). #3 as reported did not exist (the truck did NOT go on filling on foot: it stopped at the door with
      "Pulled off the pump"); now it does go on filling and billing with you out of it, and says "Tank full". `x2_pumpfoot.mjs`.
- [x] G7 I9 save slots (beta 0366 #1 BUG med, #2 BUG low; base game; fixed v293, lane A, `i9_slotsafe.mjs`):
      two `TLSLOT.go()` calls before the reload (a double click on a slot card) write the game in play over the first slot named
      and that slot's own game is lost: `go` must return at once while `TLSLOT.lock` is set, and the panel's buttons go dead on
      the first click. #2: an imported file is only checked for a `save` object (`cash: "lots"` loads as a string): coerce the
      numeric fields on import and load. Tester's scenario: `i9_slots_break_beta.mjs`.
- [ ] G4 5.4c2b2 (beta 0363 #4 POLISH, lane A): the tow rope on a bogged driver's truck is drawn by which vehicle is current: on
      the sled (`swapTo(null)`, scripted) the rope mesh goes while the tow stays on. Needs a still from a real Q press first.
- [x] G4 (builder, lane A, stale scenarios found gating 0320; fixed tlx-vehicles v41, lane A): `x2_standstart.mjs` and
      `x2_vehreverse_break.mjs` failing on main. Both were part test, part game. Game: (1) a bogged truck set on a plowed street
      stayed bogged on 5 of 7 plowed spots (the rule's limits dated from before the street grid); (2) a pad trigger at 30% in
      reverse sat still in 20 cm of loose snow (0.0 m; now 10 m in 5 s) and was told "too much snow behind" (now "not enough
      pedal" where the full pedal would do it). Test: the reverse test's spot finder found nothing since the street grid and
      never checked, so every step backed the same truck deeper into one drift. New `x2_bogstreet.mjs`.
- [x] G3 (found by the builder writing `g3_helpsheet.mjs`, BUG, base game; fixed v303, lane A): on a pad every second press of Menu
      flashed Settings up for one frame and shut it again (the panel read the press that opened it as its own "Menu closes";
      the stale flag from the time before decided which press worked). The first frame after opening now only notes what is held.
- [x] G4 (beta 0150 #1 POLISH, fixed v303, lane A; #2 was done in v302): the key list in the corner and the STUCK? card name the
      controls in hand (a pad's own list by brand; the card says "press View"); a trigger held at 15% counts as the pad in hand
      (0320's "STUCK? PRESS N" still). `g3_helpsheet.mjs`.
- [ ] G3 (builder v303, POLISH, lane A): a pad has no button that hides the key list (H only) and none for the Map or the next
      job on the compass; LB both gets off the sled and folds a towed tiller's wings (`padLB` and `TOW.padWing` read button 4).
- [ ] G4 (beta 0388 #1/#2, 0389 #1-#3 POLISH, lane A): backing uphill at 12% the "wheels spin in reverse" line names no way out;
      full lock in reverse steers the truck into deeper snow (rear tyres 0.93 m down, it still moved 9.6 m). Tests:
      `x3_semis_break` step 2 predates the 3.4b1 pull-out (assert "stopped, or passed with 1.5 m and no bump"), its step 5 throws
      (`GS.x`, `TLX.optionSet` do not exist: use `TLX.setOn("traffic", false)`), so its steps 5-7 never run.
- [ ] G4 (beta 0319 #1, 0320 #5/#6, 0321 #6, 0322 #3-#5 POLISH, lane A): gritter on + blade up at a shore has no press that only stops
      the spinner; a 2% grade cuts the 35 cm crawl by two thirds; after a trailer hit the "wheels spin in reverse" line competes with
      "hard against something solid"; the grit table's tidy keeps a 200,000-entry / string-hours `h` and `__proto__`-named keys.
      (The "STUCK? PRESS N" to a pad player part is done, v303.)
- [x] G4 (builder 3.4b2a; closed 27 Nov, lane A: not a bug any more): `x3_traffic.mjs` step D failed on origin/main ("stopped
      312.6 m short of the drift"). Run on main today: 37 checks pass, D stops 22.0 m short, turns and drives back. The step was
      reading the moment before the car pulled away from step F's stop; it has since been told to take only a stop within 60 m
      of the drift (16 Nov).
- [ ] G4 (beta 0160 #3/#4, POLISH): a > 9 m/s hit on a car skips the 6 s bump-toast cooldown; 160 km/h into a car still never
      ejects (CRASH_AT.hard canon, same as boulders) - leave unless Lemon asks.
- [x] G4 (beta 0143 #1, BUG, fixed v200): on a pad, D-pad down calls help (empty tank / fjord) instead of bandaging a fresh wound;
      while a wound is younger than BANDAGE_WINDOW, D-pad down bandages first. Also 0143 #3: "Press P for a fuel
      delivery" toast is a hard-coded key, already goes through btn() (the toast reads "Press D-pad down" once the pad is the active input; a toast fired before the first pad press keeps the keyboard name). No change.
- [x] G4 (beta 0141 #1, BUG, fixed tlx-roads v6): 3.2a road snow: a plain 0.5 drizzle shuts every road and the plow (plowWx 0.45) never
      comes; fill ramp now sstep(0.5, 0.95), plow works under 0.6. Still open below: 0141 #2.
- [x] G4 (beta 0149 #1 BUG, fixed v203 / tlx-roads v9: a toast once per road per storm when a real job's way crosses a
      snowed-in stretch; x3_roadwarn asserts it on screen): the 3.2b1 compass-row road warning is never seen: the minimalist HUD (11 Nov) hides
      `#job` (`display:none!important`), so only the Jobs app shows it. Surface it where the player looks (the compass
      strip, or a toast once per road per storm when the tracked job's trip first crosses a snowed-in stretch) and make
      x3_roadwarn assert on a visible element, not `textContent`. Repro: `x3_roadwarn_vis_break.mjs`.
- [ ] G4 (beta 0163 #1 POLISH, dig cars): parked car 23 (-1320, -370) by Nordkinn Fisk & Friluft can never be dug: the
      shop owns E at its dig spot (FISH.ctxLabel). Skip/shift that car in place() or exclude cars whose dig spot the shop
      owns (keep 3.3a's seeded placement for the rest). 0163 #2 (parked cars and traffic never meet) answered by 3.4b2b.
- [ ] G4 (beta 0161 #6 / 0162 #6 POLISH, traffic): `why` reads "end" during a pull-out near a road end (debug field only).
- [ ] G4 (beta 0157 #1-#3, 0158 #1-#4 POLISH, dig cars): pay by the snow left when a part-dug car's dig restarts (set b0 = b when b < b0
      at the start of a dig; 0158 #1 confirms: $75 for a 0.3 car first dug from 0.8); return null from the car provider while MNT.on/DMT.on (hint says "dig"
      mid-swing); #wnHint lags the dig state by a frame after rapid E taps (cosmetic). 0158 #2: the car body has no
      ambient fill at night and the dig has no shovel/arm pose; #3 a storm mid-dig could slow it; #4 bog mid-dig stops silently.
- [ ] G4 (beta 0156 #2 POLISH): README/commit say "a good jump clears" a parked car; a hop doesn't (roof 1.5 m), only a real
      ramp jump. Leave the claim or reword to "a big jump".
- [ ] G4 (beta 0151 #1/#4, 0152 #3/#4 POLISH): an open Jobs app doesn't re-render when a road shuts (key its refresh on
      `TLXR.paints`); the plow's "roads are open again" toast may be lost behind the weather toast; scrape sparks faint at
      night (brighter/longer emissive or a small warm light at the skis); zero `P.scr` while `FOOT.on`.
- [ ] G4 (beta 0149 #5/#6 POLISH): road legend "closed" (faint dashed orange) reads like "open" on a phone: grey or longer
      dashes. Sled riders 20-90 m off a shut road get "road snowed in" (a sled doesn't use roads): consider suppressing on
      the sled, keep it for the pickup. (0153 #4 repeats the sled-rider point.)
- [ ] G4 (beta 0153 #6 POLISH): taking a job over a shut road stacks three toasts within 5 s and the road heads-up comes
      last; give it priority (or delay the shop-coffee line) so the one that matters is on top.
- [x] G4 (beta 0150 #1/#2 POLISH; done: #2 in v302, #1 in v303, see the line above): the H help panel is static keyboard text (pad players see keys); sled-bog toasts at the
      `enterBog` sled branch and job texts ("Q off, walk up and press E") hard-code keys. Route through `btn()`.
- [ ] G4 (beta 0141 #2 POLISH, from the line above): "snowed in" fires at 0.3 m real depth.
      0145 #2 (live cells lag after `setSnow` jumps a stretch to full) logged as intended: loaded cells rise at the
      storm's refill rate by design (plowRefresh comment); a real storm builds gradually, a reload loads full depth via
      the chunk path, and a sleep over 2 h finds the roads plowed. No change.
      Note (0144 fix): a road now settles to f*(1-0.765*(1-snow)), so ~0.40 m at snow 0.25 and ~0.48 m at the 0.35 "snowed
      in" line: the pickup (stops ~42 cm) bogs on a stretch still marked open from ~0.25. Tune with this item if wanted.
      Beta 0147 #5 (POLISH) folded in: weather 0.6-0.95 fills the roads while the plow (under 0.6 only) stays in, so ~13 h
      at 0.62 shuts them; consider sending the plow once snow passes ~0.25 in weather under ~0.8.
- [ ] G4 (beta 0146 #2, low, test gap): `x5_wounds_pad.mjs` has no fjord case (sled in real sea + fresh wound, D-pad down
      dresses first); add one using the 2.x rescue test's sea spot.
- [ ] G4 (beta 0142 #4, low): `x2_winchreel_break` asserts "hand winch burns no fuel" but the parked bogged sled idles
      0.02 L in 7 s; fix the assert (measure winch fuel only) or stop idle burn while on foot winching.
- [x] (OWNER, 11 Nov; built v301, lane A; checked by scenario and stills, not by Lemon) Delivery rewards with flavor dialogue: delivering jobs should sometimes reward snacks,
  spare parts, or sled upgrades to fit at home, handed over with a bit of characterful NPC dialogue. Built as `tlx-gifts.js`
  (option `gifts`): about one on-time hand-over in six, the giver a grown-up of a real household at that door, snacks in a
  pocket eaten when hungry, spares the garage takes in trade, a rare upgrade owned as if bought. `g2_gifts.mjs`. Left: no
  figure stands at the door (hand-overs have none anywhere yet); the pocket shows only in the toast; odds untuned by play.
- [ ] G3 (builder v302, POLISH, seen in a still, not measured): on a 667x375 phone a tablet note at the top (a bog posts to the news bus, and
  Gram's note about it can arrive within seconds) lies over the toast stack, so the bogged toast is half hidden while the note is up.
  Unverified for a single bog in ordinary play (the still came after five test bogs in a row). The hint line stays readable.
- [ ] G3 (beta 0385 #1-#3 POLISH, lane A, gifts): a reload inside the 2.6 s before the words loses the words (the gift is kept); "Take a
  cinnamon bun, still warm for the road" reads as a glitch; fish cakes at a herder cabin (give `herd: 0.3`).
Order = priority. Builder keeps it ordered; ties go to whichever goal has had the fewest recent landings.
Format: `- [ ] Gn: what, why (report #, numbers)`. Done items move to `loop/PROGRESS.md`.

- [ ] G4 (OWNER): the expansion. Take the next unticked slice in `loop/EXPANSION.md` (its Status table says which).
- [ ] G7 (OWNER, 24 Nov): Home on the Nordkinn: the ski trail network villagers use, Gram (feed, reels, local chat), Radio
  Nordkinn with call-ins, whales and seabirds, then the outdoors life, your own land, herding, romance and family.
  Plan and slices in `loop/HOME.md`. Built from chat sessions in worktree `tracklayer-home` (branch `home`), not by a
  lane; lanes leave `tlx-news.js`, `tlx-trails.js`, `tlx-gram.js`, `tlx-radio.js`, `tlx-sealife.js` alone.
- [ ] G5 (OWNER): The Northern Front, after G4 has landed. Plan its slices in `loop/NORTHERN-FRONT.md` first.
- [ ] G6 (OWNER): Living enemy NPCs (idle animations, hearing death screams, last-seen-location memory +
  investigation), after G5 has landed. See goal G6 above and the Owner note for the brief.
- [x] G1 (OWNER, top): walking on snow-free ground at normal pace with a realistic gait, blended by snow depth (Owner notes 30 Oct). Landed caa7afd (v158), see PROGRESS. Left: hard-ground jog judged only by numbers; turning on the spot still shuffles (feet slide while pivoting).
- [ ] G2 (OWNER, top): new-player tutorial starting on foot aboard the ferry into Kjøllefjord (Owner notes 30 Oct). Needs the snow-free walking item.
- [ ] G3 (OWNER): upgrade existing animations to the realistic-animation rule (walker/wader gait, crash/get-up, skier, passengers), one per pass (Owner notes 30 Oct). Climb on/off done 11 Nov (the swing, v173).
- [ ] G3 (OWNER, top): smooth the snow LOD line ~9-12 m from the player (see Owner notes 26 Oct 23:40).
- [ ] G3 (OWNER, top): mountains grey far away, white up close; make snow colour consistent over distance (Owner notes 26 Oct 23:55).
      b100 slice 1 (v152, 33557bf): cause = the patch's sastrugi fine octave (0.38 m) + its lee-shadow march turning
      into crisp pixel-scale hatching from ~10 m out at chase-cam height (switch-off stills in tlloop/b100/before:
      no_relief/no_micro both move the band; sparkle/sheen/warm don't). Fix: per-pixel footprint (dFdx/dFdy of vWP)
      fades the fine octave (fp 0.03→0.17 m) and coarse one (0.15→0.6) to their mean, softens the lee-shadow edge by
      fp, eases glints out (0.04→0.2). `g3_snowlod.mjs` + `snowband.py` (fine detail per band, sled masked) noon
      9-12/12-15/15-25/25-45 m 0.49/0.69/2.62/5.09 → 0.33/0.26/1.04/2.36, night 15-25/25-45 1.59/3.33 → 0.65/1.75.
      Vision: night hatching band gone; noon gradual, far field a little softer. LEFT: (a) playtester judge from the
      rider's normal view while RIDING (motion), noon/night/15:00 and GFX low; (b) the 34-50 m relief fade + 45 m
      patch→far-terrain handover (owner asked to re-check); (c) the low "along the snow" camera in g3_snowlod didn't
      take (camOv not hooked without sideCam first; shots duplicate the chase view) — fix the scenario.
- [ ] G3 (playtest, follow-up to v151 chimney smoke): `g3_chimney.mjs`: 68 chimneys (50 lit KIT.house + 18 sites) now puff a
      wind-leaning grey plume (`CSMK`, 1100-puff Points pool, +1 draw call, 0.005 ms/frame). Unjudged: at ride distance and
      riding through town (does the plume read, any sorting pops against the windows/lamp pools?), in a storm (laid flat
      or a smear?), polar-night twilight and an aurora. The quay town from 45 m reads faint against a bright hazy noon sky;
      if the playtester agrees, consider a little more density near the cap only.

- [ ] G3 (low, follow-up to v147 camera vs pines, report 0081 F1/F2): `g3_camtree.mjs` (3 stands × 2 headings × 2
      offsets, per-frame clearance from the nearest pine canopy envelope): frames inside a canopy 33 → 0, closer than 0.3 m
      91 → 0, runs with a clip 2/12 → 0/12, min clearance −0.14 → 0.57 m. Trees within 2.6 m of the lens now screen-door out
      (breezeMat dither). Report 0083: close chase (`CT_VIEW=1`) 0/4 inside, night clean, no shimmer seen (closed).
      b94 on foot (`g3_camtree_walkcam.mjs`, 12 walks through 3 dense pine stands, main @ b697853): 0 frames inside a canopy,
      but the camera sits pinned at the 0.6 m clip margin, 49% of frames have a canopy within 1.6 m of the lens (a pale
      screen-doored slab over half the screen in stills) and 35% of frames the sight line to the walker's head runs
      through a canopy. Tried an on-foot spring-arm boom (`camPineBoom`, patch kept at scratch
      tlloop/b94/pineboom_springarm.patch): occluded 35% → 20% but near-lens frames 49% → 63% (the camera ends up among
      the trunks round the walker) and camera pumping (>0.15 m/frame jumps 8 → 353); stills showed no visible gain, so
      NOT landed. Next idea if retaken: judge with the walker actually in shot (dismount with Q), and consider fading the
      dither faster (gone by ~1.2 m) or lifting the on-foot camera in a stand rather than shortening the boom.
      Report 0084 agrees (on foot 0 inside, camera held at exactly the 0.6 m floor); First person on foot is Close chase
      by canon (VIEWS fallback), so nothing left to judge there. Birches skipped (bare limbs).
- [ ] G2 (low, owner-canon numbers; b93 `g2_cadence.mjs`): past the Ranger, cash never gates a sled. A player who rigs
      a trailer at rank 5 (licence + receiver + trailer) and takes the best $/min job holds $2.4k left after buying the
      Ranger, $10k after the Sprint, $53k after the Apex, $106k after the Matriarch ($320k at 70 deliveries): heavy
      freight (~$1.5k) and priority (~$2.45k) outpay parcels 5–10x. Sled costs/needs and contract pay are all Lemon's
      pre-loop numbers (97fe993, 27 Sep), so the loop does NOT retune them. Levers that keep canon, if a later pass wants
      one: more things worth buying mid-ladder (depot cabins/Real Estate, engines, Bytteboden), or costs on the big
      jobs (bond losses, wear on the rig). Parcels-only player: cash gates only the Matriarch (+5 deliveries).
      Longest dry stretch is Apex → Matriarch, 14 deliveries / ~150 est-min (Lemon's `need` 32 → 46), unchanged.
- [ ] G1 (low, playtest, follow-up to v146 tree wells): riding through stands judged clean by report 0081 (4/4 passes, no
      pop-in or seams; the dish isn't legible from the chase cam, by design). Report 0085 (`g1_treewell_foot.mjs`): walking
      through 4 stands 0/4 stuck, 24.2 s / 30 m (open-ground pace). Unjudged: a storm (refill fills a well back only to its
      own f, so it should stay).
- [ ] G3 (playtest, follow-up to v148 pine hems): `g3_pines.mjs` (densest stand, 7/14/30 m, noon + 21:00): green hem is now
- [x] G4 4.1b1 (beta 0223 #1 BUG + #2, lane A, fixed tlx-plow v4): holding the use control slewed the blade behind Settings (and behind the tablet). The blade's control now rests under any menu and the tablet; `x4_blademenu.mjs`.
- [x] G4 2.7 (beta 0221 #1, POLISH/BUG, lane A; fixed tlx-vehicles v40 + v295, `x2_sellerdoors.mjs`: `spotNear` keeps a seller's hand-over 11 m from every door ring (Risfjord 5.3 -> 11.5 m, the relay 9.8 -> 11.7 m), the mount control checked there): at 2 of 18 used-truck seller sites (Risfjord, the relay) `spotNear` parks the truck about 5 m from a door ring, so 2.4 m off the truck the hint is the door's, not "get in the pickup" (and `x2_vehmkt.mjs` fails that assert). Keep `spotNear` 9 m+ from `INT.beacons`, or let the get-in hint win when the vehicle is nearer than the ring; check that Q itself works there.
- [x] G4 4.2c1 / 4.2c2a (BUG, beta 0393 #1, lane A; fixed v306, `x4_hospsite.mjs`: the game's, not the tests': RD1b had moved the
      helsesenter 145 m to a street's end, its forecourt across the street): `x4_lots.mjs` fails 7
      (section D "the rest plowed: the lot is clear after 9 of 9 passes", pay $0, then E's pay 55% for 75%): its puppet is off the
      ground 119-144 frames (limit 40), so the forecourt's last squares are never cut. Find whether the puppet's `__foot` no longer
      reaches hard ground there (the roads RD1 model under the helsesenter's forecourt?) or a lot really cannot be cleared by a driven truck.
- [ ] G4 4.1a1 (beta 0222 #2, POLISH, lane A): blade down at 54 km/h on 7 cm, the drag is 150 N flat with single 0.25 s spikes of 2.6-4.3 kN and no depth change (reads like the depth line crossing a windrow or field-edge cell). Not felt as a stall; look if a stutter is reported. 0222 #5: `TLXV.buyHaul()` returned undefined though a haul record existed, so the hitch prompt with a blade fitted is untested.
- [x] G4 4.1b1 (beta 0224 #1/#2, lane A; fixed tlx-plow v36, `x4_backout.mjs`: a skin under 4 cm over what a back-drag leaves is ridden over and reads "nothing to pull"; with reverse asked at a standstill the blade pulls like a back-drag, so the truck backs out of a 1 m drift blade down on keyboard, pad and touch; also found: a bladeful stayed on the blade for good once you got out of the cab, now it is left on the ground): back-dragging over an already plowed yard (6 cm) still pulls 0.3 m3 and leaves a small heap (skip the sweep at or under the plowed level and say "nothing to pull"); blade down IN a 1 m drift the truck will not back out either (the forward drag holds it at 0, so the back-drag branch never starts): use the back-drag drag when the throttle is reverse at a standstill, or word the line "lift it first".
- [x] G4 (beta 0220 #1, lane A, looked at 18 Nov: a TEST artefact, not a game bug. The puppet set the truck down on uncut snow every frame, the truck's physics read that as airborne (`P.gnd` false) and a blade in the air neither cuts nor marks; a driven truck is airborne 0 of 2845 + 1840 frames. Puppet fixed in both scenarios, 0220 #3's E2-E4 now pass): the tester's `x4_bladeroad_break.mjs` puppet marks only 17/40 and 30/40 lengths of a road stretch going out and back (Skjånes stretch 2; Dyfjord 32/10) where the builder's section E marks 40/40. Rerun it (`USEK=1` for Skjånes), find whether lengths are skipped on bends (`n.d <= half` with the blade's middle 3.25 m ahead, or `B.last` resetting) or it is the puppet's own doing; its E2-E4 (short last stretch, re-opening, opened across a reload) wait on this.
- [ ] G4 (test, lane A, seen 18 Nov; the x2_standstart part is done, tlx-vehicles v41, see the ticked line above; the 4.1a1 frame-cost part is still open): `x2_standstart.mjs` fails 2 on main ("bog clears once the truck sits on plowed ground", "then W drives off along the lane"): its "longest town lane" picker takes `Y.r <= 4`, from before the street grid (v227). Allow r up to 5 and check the spot is a street, then confirm the bog really clears on hard pack. Also 4.1a1: whole-frame cost while plowing was not settled in headless (PROGRESS 18 Nov 01:15): measure on a real GPU.
      14 drooping branch tips per tier (was a level 7-sided lampshade); local contrast noon 5.29/5.34/5.53 → 5.66/6.02/6.24,
      calls 346 = 346, tris in the stand view 22.6M → 24.3M (+7%). Report 0087: tips read at ride distance as a zigzag edge
      (no pop/seams); GFX low in a dense stand 30 fps vs default 9.5 (SwiftShader, relative only; treeR 750 vs 1700).
      b97 (v150): snow caps 11 → 14 sides turned with their tier, hem sags onto each branch tip and tucks up between
      (tris 24.27M → 25.07M, calls 346). First tries pushed the tongues outward and read as thin white shards at the
      silhouette; landed version keeps tips inward. Unjudged: a faint sliver can still show edge-on on tier 2 at 7 m
      (b97/after4/noon_close7.jpg); judge at ride distance and on a dark night.
      Idea if the hem still reads star-like: vary tip length per tree (instance colour channel) instead of per tier.
      Report 0089: v150 caps clean at 7/14/30 m, noon + night, no tier-2 sliver (closed; drop this item next edit).
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
      grey-trim house faint at 15 m, gone at 25 m (low; idea: darker drip tint on white-trim houses only). b94 re-shot g3_drip_ride: the white house drip reads as a dark line at 15 m and still at 25 m (tlloop/b94/before), no change made.
      Playtester: judge the sliding sheen in motion along a street for a repeated-stripe look; playtester: judge the pump LCD at ride distance (moire?). Playtester: judge v117 sheds at ride distance and the garage from
      the T-key garage approach. Report 0079: village houses (Mehamn/Gamvik) clean of moire at 20 m and 8 m, night legible
      (closed). Left: corrugated shed sheen with a genuinely moving camera.
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
      Report 0090: Ranger + flatbed 265 kg Ifjord→Gamvik stalled on a climb (31 → 0 mph, world-y 22 → 91, 206 m in 120 s,
      0 crashes, shallow snow); card empty = laden 279% (identical: check coldRun tow term if touched). Fourth failed
      autonav attempt: needs a slope-aware steer (sample slopeAt ahead, nudge round grades) or a flat coastal leg.
      Also worth a look on its own: can a laden Ranger really not restart on its own packed trench on that grade?
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
- [x] G1 (BUG, report 0168 #1, done v226: paintFocus scrolls the strip; #2 was the START HERE card's own white ring, not focus): App Store Today strip: keyboard/pad focus moves onto a feature card scrolled
      off the right edge (`paintFocus` only scrolls `#tabV` vertically); scroll the focused card into view horizontally.
      0168 #2 (ring drawn on the hovered card, not `.tfoc`) likely the same seam: check alongside.
- [ ] G1 (POLISH, 0165 #5): rooms steer tank-style and you come in facing away from the exit; a room hint ("turn round
      and walk into the light to leave", through `btn()`) for keyboard, pad and touch.
- [ ] G4 (POLISH, 0167 #1/#2, 0164 #5): owners-out re-rolls on reload (seed it from the day if wanted); a homing car
      waits for you forever within 120 m with no cue; car beams burn all polar-night day (keyed off dayFactor).
- [ ] G4 (builder 3.5b1, tests): the "longest town lane" picker shared by 26 x2/x3 scenarios (23 edited; x2_deck, x2_deckeverysled, x2_tow word it differently and are untouched) found only 7 m door spurs
      after the v227 street grid (`Y.r > 2` threw the streets out) and failed "a plowed lane to drive on". Widened to
      `Y.r > 5` in those 23; re-run and passing: x2_pickup, x2_hitch. The other 21 are changed but not re-run: a
      scenario may still trip on the street start now being beside a shop door (x2_pickup's touch step did).
- [ ] G1/G3 (POLISH, beta 0183 #2, 0185 #1): from the saddle the plowed town streets are the same white as the lots:
      nothing (packed tint, tyre grooves, berms) shows where the street is. 0183 #1: after tutSkip the "sled's right
      beside you" toast is wrong by 70 m. 0183 #3: retire or update `g1_townlots.mjs` (pre-grid lot offsets).
      0187 #3: the Map chart is a bright cream sheet at night.
- [x] G4 living world (beta 0211 #1, BUG, fixed tlx-police v3, lane A): a second cruiser called to a chase is put on a
      road 380-900 m off at random; ahead on your road it sees you in the search, which is meant, but that counted a
      second chase in the record and heat rose up to 9 a second while nobody saw you. One chase now, heat only while
      seen, "They've seen you again"; x15 section G no longer rolls that dice and a new section stages it.
- [x] G4 living world (beta 0211 #4, not tested): a reload during an active warn or pursuit (0211's attempt landed in
      "clear": the grace after a bust). The code turns any non-clear save into a search from where you are.
      Covered since: `x15_police_break.mjs` zeroes the grace, reloads mid-warn / mid-pursuit and finds a search.
- [ ] G4 living world (POLISH, builder 0211 pass): a chasing cruiser drops to 4-8 m/s on stretches of the road it is
      following (x15 G timeline: v19 -> v5 within 3 s, 140 -> 210 m behind a 100 km/h sled; a second one did 7-8 m/s
      on the road towards you). Stopping with it out of sight can take over 15 game s to be reached, or ends as an
      escape because in a search it drives to where it LAST SAW you, not to you. Look at `extStep`'s heading pick
      and `cap` on a road bend.
- [ ] G4 3.5c2b (POLISH, beta 0212 #4, lane A): the "left the convoy" flag outlives the Road traffic option: with
      `traffic` switched off no convoy can run, so the pin and the legend line stay until you drive out past a gate
      or 6 game hours pass. Clear the flag when `traffic` goes off, as the `convoy` option already does. 0212 #5
      (a crash while in the line) and #6 (a reload with a flag set) were inconclusive in the tester's own setup:
      the "out of your seat 3 s" rule reads the seat, and the flag is documented as unsaved; cover both in
      `x3_convoyline_break.mjs` when this is fixed. (#6 since covered by beta 0218: a reload drops the flag, the pin
      and the legend line, as documented; only the crash case is left.)

- [ ] G4 3.5c2a (POLISH, beta 0216 #2, lane A): the convoy's plow truck waits without end for a walker standing in
      its lane (it stops 9.7 m short, which is right) and the queue with it, and nothing says why. A horn and one line
      ("The plow truck is waiting for you to clear the road") when it first stops for you. 0216 #3 (a walker placed
      close in front of a moving truck) was not tested: the tester's placement used a stale position.
- [ ] G4 4.1a1 (POLISH, beta 0217 #4, lane A): a blade left down stays down when you get out or swap trucks, but a
      reload lifts it. Lift it on getting out / swapping (and spill what it carries), as the reload does. (tlx-plow
      v36: what it carries is now spilled on getting out; the blade itself still stays down, left as it is.) 0217 #5
      (selling a bladed truck) is covered by `x4_blade` B through `tidy()` (a blade whose truck is not owned goes to
      the shed); there is no way to sell a truck in the game yet.
- [ ] G4 4.1b3a (POLISH, beta 0234 #1/#2, lane A): a second used-blade listing whose page is already open can still be paid
      after the first one is bought (it is hidden from the board, but `mktPay` goes through: two blades paid for, one
      pickup; nothing is lost, the second order waits for a second pickup). Re-check the blade rule in `MKB.payWhy`,
      as the 4th-truck fix did for trucks.
- [ ] G4 4.1a (POLISH, builder 4.1a2 pass, lane A): on a plowed road the blade still reads "cutting 18 cm": a road
      is kept at 0.235 of the snowpack and the blade leaves 0.15, so there is always a skim to take and its push.
      Either the blade leaves what the leg under it is plowed to (never below a road's own level), or "nothing to
      cut" under about 10 cm over what it leaves. Seen in `x4_bladeroad`'s stills r3/r4, which are also shot at dusk
      (the drive runs the clock to 16 h): start that scenario at 9 h.

- [ ] G4 4.2 (POLISH, beta 0268 #3 / 0269 #3, lane A): a Doors or Streets row in the Plow app takes pad/touch
      focus but A / a tap does nothing. Tap = track that heap like its Jobs row, or drop the row's `data-tf`.
      Also seen in the 0269 fix's stills: the section label "STREETS" breaks as "STRE / ETS" in a 370 px pane
      (the `sec` head's first column is too narrow for seven letters).

- [x] G4 2.5 (BUG, beta 0285 #1, lane A, fixed tlx-vehicles v33, `x2_trailerhit.mjs`): the sled trailer on a truck's ball (`haulFollow`, tlx-vehicles.js) is never
      tested against obstacles: reversing it into a rock passes through. Give it hull circles like the cab's.
- [x] G4 5.4a1 (BUG, beta 0316 #1, lane A; fixed tlx-plow v34, `x5_savesafe.mjs`): `pdrTidy` takes any finite `p` >= 0; a saved driver position past the
      road's length (a damaged save) leaves the driver "out"/"back" for good. Clamp `p` to the road's length on load.
- [x] G4 2.3 / 5.4a2 (BUG, damaged save only, beta 0301 #1 + 0308 #1, lane A; fixed tlx-vehicles v36 + tlx-plow v34, `x5_savesafe.mjs`): a truck record whose `fuel` is a string
      or NaN loads as is: boarding sets `GS.fuel` to it (no low-fuel warning, no burn) and a plow driver sets out with
      "NaN L in the tank". Coerce `fuel` to a finite number in 0..cap where truck records are tidied on load.
- [x] G4 4.2 (BUG small, beta 0279 #1 / 0356 #1 + #2, lane A; fixed tlx-plow v32, `x4_statements.mjs`): the Plow
      app's Statements list keeps 6 lines but one week of 3 roads + driveways + lots writes 5, so last week shows as
      one orphan line. Now whole weeks, the last 3; a week reads roads (order signed), drives, lots.
- [x] G4 4.1b2a (beta 0296 #1, lane A; looked at 27 Nov: a TEST artefact, not a game bug, no code change): "a ragged
      cutting edge cuts almost nothing on the road-credit pass". The report's puppet sets the truck down on the snow each
      frame; behind a ragged blade 18 cm is left instead of 9, so the puppet's truck read as off the ground and a blade
      in the air neither cuts nor marks. DRIVEN by keys (`x4_raggedroad.mjs`, new): edge 10, 0 of 2423 frames in the
      air, its side 40 of 40 lengths, the lane holds 0.32 of the pack (a good edge 0.15), and the pass back opens the
      stretch with its line. An edge that wears under 30 on the way still finishes.
- [ ] G4 4.1a1 / 2.3 (POLISH, beta 0302 #1/#2 + builder 0305 pass, lane A): a truck parked by teleport in 55 cm of
      settled snow cannot back out although two hints name that exit (no ruts: possibly a test artefact; check whether
      a real drive-in leaves ruts that work), and Q once did not get out of a digging-in truck with no toast. Also:
      the blade-down hint "your wheels stand in snow it has not cut: back up to cleared ground" shows in 25 cm, where
      the plow truck in fact pulls straight away (27 m in 7 s, `x4_bladelake` step A): raise `BL.sunk` per truck or
      show it only once the truck has failed to move.
- [ ] G4 4.1c1 (scenario note, beta 0305, tester): `x4_plowtruck_pad_cut_speed_beta.mjs` picks its flat strip on a
      lake (only a lake is flat under 3% over 200 m), where the use control is ice fishing's: add `bioAt(...) === 1`
      to its `bad` test and loosen the slope/length, or lay the strip along a road, then rerun its pad-at-speed steps.
- [ ] G4 3.4a (POLISH, beta 0333 #2, lane A): a walker set down 1.0 m ahead of a stopped car's centre stays inside it
      (0.14 m from the middle circle): `collide()` in tlx-traffic.js pushes out of each circle in turn and the last
      push shoves back into the one before. Push out of the nearest circle last, or iterate twice.
- [ ] G4 5.4b1 (POLISH, beta 0339 #4, lane A): at night the plow driver's truck is a dark silhouette under its beacon: no
      headlamp pool on the road, no lit cab. Give the seen truck the lamps a truck you drive has (tlx-vehicles' own, or the
      traffic's beam + pool).
- [ ] G4 4.2a (POLISH, damaged save only, beta 0340 #4, lane A): junk in `conWk` made safe leaves a $0 / 0 km Statements
      row for a road that does not exist: drop kept entries with no pay and no metres in `conTidy`.
- [ ] G4 4.1c2 (POLISH, damaged save only, beta 0338 #2-#4, lane A): the gritter's saved table keeps string hours,
      trusts a wrong-length array for reads until the truck spreads, and keeps future hours for good. In the tidy:
      numbers only, `g.h.length === q.n` in `gritAt` / `gritCover`, drop `age < 0`.
- [ ] G4 14.4b1/b2 (POLISH, beta 0332 #5 + 0336 #2, lane C): at the boatyard door the use control still mends the
      hull (and charges) or opens the counter while the tablet is up. Lane C's.
- [ ] G4 6.3b2a (POLISH, beta 0334 #2/#6, lane B): `x6_oilsled` assert F flakes on a loaded machine (0.54 m for
      < 0.5 m); a clock skip pops the oil sled along the line. Lane B's.

- [ ] G4 5.4c2a (POLISH, beta 0352 #3/#4, lane A): at 640x360 SEND / PAY A TOW on a bogged driver's Staff card are
      about 50 x 22 px (a min-height of ~30 px for `.tbtn` rows in a narrow pane), and on a pad they come last in
      the focus order, after the next card's row (16 presses from the card).
- [ ] G4 3.5c (POLISH, beta 0353 #1, lane A): the `convoy` option switched off and on again while a road waits for
      its convoy leaves the road open (the wait is not rebuilt from the road's snow).
- [ ] G4 5.4c2b1 (untested, beta 0354 #2, lane A): SEND pressed while you sit in the very truck the helper would
      take (`kit "mine"`, swapped into before the send). 5.4a2's rule is "you in the cab and they wait"; check that
      SEND is not offered, in a scenario. Also seen while fixing 0354 #1: a helper's truck first drawn part-way along
      its line (a clock put forward, a reload) starts on the centre line and slides into its lane over a second.
- [ ] G4 5.4c2b1 (POLISH, beta 0355 #4, lane A): the helper's truck cannot be hailed and has nothing to say while
      every other driver's truck can. (5.4c2b2 landed without needing a word from it: still open.)
- [ ] G4 5.4c2b1 (untested, beta 0357 #3, lane A): the helper let go mid-trip: does the "nobody is coming" note
      reach the player (Staff / Jobs text, a toast)? Read it in a scenario.

- [ ] G4 2.2 (POLISH, beta 0370 #1, lane A): "Filling stopped" on walking from one machine to another at a pump does
      not say how full the first was left (a sled at 14.2 of 16 L reads as done): add the tank's state to that toast.
- [ ] G7 I9 (POLISH, beta 0372 #1, lane A): a save's `delivered: 1e15` loads untouched while cash and the clock are
      capped: hold it to a sane top (1e9) in `saveClean` with the other counters.
- [ ] G4 2.7 / G7 H1 (POLISH, builder pass 27 Nov, lane A): at Sandfjord a seller's pickup is set down so close to
      the gapahuk that 2.4 m off its side you are within the fire spot's 4.2 m (the hint beside it is "light the fire ·
      get in the pickup"): keep `spotNear` clear of trail shelters too, through a list the systems add to rather than a
      tlx-trails name in tlx-vehicles.
- [ ] G4 4.1b2a (POLISH, beta 0373 #1/#2, lane A): a shed blade whose `shedC` entry is lost (damaged save) refits with
      a new edge for free; an edge of 70.5 is charged 29 points and set to 100. Both harmless, left.
- [ ] G4 2.7 (POLISH, beta 0374 #3/#4, lane A): `x2_sellerdoors` should assert that `spotNear`'s fallback pass (keep = 0)
      was not used (the first spot at Risfjord and the relay has ~4 m spare); unconfirmed: `TLXV.remove(uid)` left one
      truck owned after pickup, pickup, trailer cycles with the walker beside them (the current truck?).
- [x] G3 (builder, v297 pass, lane A; fixed v299, checked by scenario and two stills, not on a real pad or phone): control names still typed out as keys in the search-and-rescue block (the accept
      toast at `sarAccept`: "Q off ... hook on (E) ... hold SPACE", "press E") and the "line parted ... Shovel or R"
      toast (reset is N): route them through `btn()` as the recovery lines were in v297.
- [x] G4/G3 (builder, v297 pass, stale tests or real, lane A; all three were the game's: fixed v300 and v304): three scenarios fail the same way on origin/main at v295
      (run from `git archive`): `x2_winchtouch_break` "beyond line: no HOOK promised" x3 (`footUse()` says HOOK at a
      tree the line cannot reach; `footAction` then refuses: label and act disagree), `x2_winchuse_break` "E tablet
      open (winch hooked): E does nothing behind it" (hooked -> out), `ui_responsive` "foot embed640 640x360: no HUD
      overlap" (the on-foot hint, 234 px wide, runs under the speedo). Find which are the game's.
- [ ] G4 2.7 (POLISH, beta 0375 #2/#3, lane A): beside a pickup with `BOG.on` the line ends "Q: get on" (the bogged
      branch of `wnPrompt` types "get on"; use `VEH.board` if a truck can be the bogged thing); `TLXV.remove` refuses
      the current truck by design, so the mod menu's "Clear spawned machines" leaves the last one: say so there.
- [ ] Steam (POLISH, beta 0376 #4, the Steam session's): the title's QUIT row is cut off at 640x360 (bottom 362 of
      360); unreachable while the shell's minimum is 960x540.
- [ ] G3 (POLISH, beta 0377 #4, lane A): the keyboard line "Sled 8 m on your left · walk back and press Q" types the
      key as "press Q" where the other lines use `keyHint("mount", "get on")` ("Q: get on"); right per device, only
      the wording differs.
- [x] G3 (builder, v299 pass, lane A; fixed v300, `x4_mobilehint.mjs`, checked by rects at 11 screen sizes and by
      stills, not on a real phone; the tlx-folk "E:" was the test's own keyboard device, the line already goes through
      the same rule as `keyHint`): at 320x568 the hint box (`#wnHud`) sits over the ride
      controls whenever a riding hint shows (`x4_mobilehud2` "tabopen" and "footbeside" fail on main at v298; with a
      villager walking past, "sledtoast" too, and since v299 the box also clips the corner of GET OFF). Lift the box
      above the control cluster on narrow portrait screens. Also tlx-folk's riding line reads "E: a word with Anja" on
      touch (the button says TALK): route it through `keyHint`. Other typed keys seen while fixing the rescue lines and
      left: README's Search and rescue section (keyboard names, as the README is written), code comments.
- [ ] G4 (test, beta 0378 #3, lane A): `x4_plowtruck` failed once in 4 runs ("the line names the road and is yours: []",
      "the whole width is cut"; 3 reruns alone passed): make those two reads poll.
- [ ] G7 I6 (POLISH, builder v300 pass, the camera's; lane A may take it): on a 320x568 touch screen the CAMERA chip
      (10,216 61x29) lies on the third toast when three are up (`sledtoast_320x568.jpg` of `x4_mobilehud2`, which does
      not list `camChip` in its ids: add it). Hang the chip under the toasts or move it to the MORE sheet on phones.
- [ ] G3 (note, builder v300 pass, lane A): of the three stale-or-real failures listed above (v297 pass),
      `ui_responsive` "foot embed640" is fixed in v300 (the hint's max-width did not count its padding: 1105/1105 now);
      `x2_winchtouch_break` and `x2_winchuse_break` are still open. Both were the game's and are fixed in v304
      (`footUse` promised HOOK at a tree the line could not reach; the use control acted behind the tablet): all
      three of that line are closed.
- [ ] G3 (POLISH, beta 0390 #1/#2, lane A): a mouse moved after a pad press may leave the control names on the
      pad's (seen with a synthetic `mousemove` only; try `Input.dispatchMouseEvent`); and whether the tablet stays
      open behind Settings when Menu is pressed on a pad with the tablet up was not read (the probe used a wrong flag).
- [x] G3 (POLISH, builder v304 pass, lane A; fixed v305, `x2_tabletx.mjs`): with the tablet up on foot X (size it up)
      acted behind it on keyboard, pad and touch (a line under the tablet; at a strap it changed the line to double or
      back). It rests there now and offers no label. Q (get on) is left live on purpose: getting on with the tablet in
      hand is plain to see and the tablet rides along.
- [ ] G4 2.1b / 4.1b2a (POLISH, beta 0392 #1/#2, lane A): the last 0.4 m of winch line cannot hook (the code's own
      margin) while the hint reads "Line's at its end (26 m)"; boulders at the edge and a dig already running when
      the tablet opens are untested.
- [ ] G4 (test, builder v305 pass, lane A): `x4_bladeroad_edge_span_beta.mjs` section E1 carries a ragged blade by
      puppet and reads the puppet's own airborne frames as "no cut": point it at `x4_raggedroad.mjs`'s keyed driver
      or drop E1.
- [x] G4 4.1a1 (BUG?, beta 0395 #1, lane A): closed without a game change, a test artefact (27 Nov, `x4_fieldpush.mjs`
      A + B). The report's truck was SET DOWN on untouched 0.3 m, so all four wheels stood 0.30 m deep (3.4 kN of snow
      + 1.5 kN on the blade against 4.7 kN of grip), and it read only the blade's own `why` (set from 6 kN): the driving
      hint said "your wheels stand in snow it has not cut: back up to cleared ground and plow in from there" from the
      first second. A truck DRIVEN there by keys stands 0.06 m deep in its own pressed tracks and pushes 0.3 m from a
      standstill (11 m in 4 s, 18 km/h, 7.3 m3 cut), and the hint's way out works for the set-down truck too (lift,
      back 4 m, drop: 22 m in 5 s). Open country holds 0.45-1.0 m, so the game has no natural 0.3 m field. Left: a
      set-down truck held on the pedal with the blade down is "stuck to the axles" after 5 s (as blade up in 40 cm).
- [x] G4 4.1b1 (test, beta 0395 #2, lane A): done 27 Nov, `x4_fieldpush.mjs` C: a square blade carrying 1.15 m3 at
      0.7 m/s, out with the leave control: the blade is empty at once, 1.148 m3 laid of 1.148 cut, the snow on the
      ground round the blade + the bladeful is the same before and after (-0.003 m3), a heap 1.13 m deep.
- [ ] G4 4.2c2a (test, beta 0393 #2, lane A): `x4_lotheap.mjs` has no `ONLY=` filter (a full run is about 7 min).
- [ ] G3 (test, beta 0394 #1, lane A): `x2_tabletx` sets `BOG.on` without `BOG.resist`, so the sized-up line reads
      "about 0 lb": enter a real bog (`enterBog`) and assert the number is above 0.
- [ ] G8 RD (note for the roads builder, from lane A's v306 pass): anything `townBlocks()` used to stand up and
      `townRoads()` now stands up later (the street lamps) is no longer an obstacle to the site searches that run in
      between (`buildFishShops`, `buildHospital`, `buildLanes`, every tlx system's `init`). The helsesenter's search
      reads the queued lamps since v306; check the others when a route or a lamp moves.

Last triaged report: 395
