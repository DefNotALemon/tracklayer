# Open asks: everything Lemon has asked for that is not finished

Lemon, 25 Nov 2026: "take the time and power now to finish the big updates i've asked for in the past few weeks. i keep
finding small things you either half finished or didn't even pick up to work on when i told you to and i want that to
end". This file is the single list. Rules: an ask is added here the moment it is made; a line leaves only when the thing
is on main AND checked by the supervising session (gate re-run, stills looked at); "landed" in a builder's report is not
enough. Every session that works on Tracklayer reads this first and updates it last.

Audit of 25 Nov (from `loop/EXPANSION.md`, `loop/LOOP.md`, `loop/HOME.md`, `loop/REALISM.md`, `loop/NORTHERN-FRONT.md`,
the cron list and the usage governor):

## Build order (Lemon, 27 Nov 2026: "i wanat the older asks done first")
The chat builder (one at a time) takes the oldest open asks before any newer direction, oldest first:
1. FIX (a defect, not a feature): get rid of the visible line 9-12 m out where the snow changes; no ring or band at any distance (26 Oct).
2. FIX (a defect, not a feature): mountains now look grey from far and turn white up close; they must stay the same snow colour at every distance (26 Oct; Lemon 27 Nov: "the mountains should stay the same color ... those two are bad things").
3. Upgrade every old animation to the realistic rule: walker, wader, crash/get-up, skier, passengers (30 Oct).
4. New-player tutorial arriving on the ferry on foot (30 Oct).
5. The small things of 11-13 Nov (tether rope, "size it up" prompt, delivery rewards with flavour).
3a. ROADS REDONE (Lemon, 27 Nov, placed here by the supervisor right after the two snow fixes because he asked for it
   by name today; move it if he says so): "completely redo the road design, the roads themselves, re place them around
   the map, drop the curbs too, make the roads look much nicer, you can make them look more worn down, but realistic
   is my main priority." And the same day: "I want the road model entirely replaces": the old road mesh, its
   material and textures and the kerb pieces are deleted and a new road model is built from nothing; re-skinning or
   patching the old one does not count. Scope: every road on the map (town streets AND the roads between places), new routes laid
   out the way real Finnmark roads run (follow the shore and the valley floors, honest junctions, every building on
   a street), no kerbs anywhere, a real road surface (worn asphalt, patches, cracks, faded and partly missing
   markings, gravel shoulders, packed snow and ruts in winter, plow banks instead of kerbs). Realism outranks the
   worn look. This replaces R3's road part in `loop/REALISM.md`. Nothing built yet.
0. STEAM RELEASE (Lemon, 27 Nov: "i want to register a steam page for tracklayer", then "start on all of those ...
   get me plenty of optionss for store pages"). Placed first by the supervisor because it has outside deadlines
   (Valve's waiting periods) and he asked for it by name today; move it if he says so. Target 27 Jan 2027. Plan and
   slice table `loop/STEAM.md`. S1 desktop shell and S2 store page options building; S3 final assets wait on his
   pick; S4 waits on his Steamworks App ID.
Then back to the newer directions (G9 the raid, I7 field guide, G8 houses). The expansion lanes (G4) keep
running beside this under the governor.

## Why the big updates stalled
- The four expansion builder lanes and the beta tester have been **paused since 19 Nov 23:00** (cron jobs paused, flag
  `~/.hermes/usage-budget.pause` = "night_shift"). Lane D (stores, guns and hunting, fire watch, sap and berries) died
  earlier, on 14 Nov, after nine failed runs in a row. Nothing has built G4 for six days.
- The usage governor only releases "spare" Claude usage, and Lemon's own use has left none (week 56% used with 5 days
  left on 25 Nov), so even unpaused it would hold. Building needs his say to spend the week on it.

## Big updates
| Ask | Date | State |
|---|---|---|
| G4 Four Seasons & Enterprise, 19 milestones | 10 Nov | 1, 2, 3, 9 done. Part done: 4 plowing, 5 staff (options left), 6 upkeep and lighthouses (6.3 keepers and oil drivers left), 10 stores (10.3, 10.4 left), 11 guns and hunting (11.1 only), 14 boats (part). **Not started: 7 inns and hotel, 8 a garage to own, 12 fire watch and trails, 13 sap and berries, 15 aircraft and bush mail, 16 world streaming, 17 the Maine-style county, 18 Greenland, 19 balance pass.** |
| Guns with Tarkov-style customisation ("frustrated at slow progress") | 14 Nov | 11.1a/b landed; the rest of milestone 11 stopped when lane D died |
| Living world, GTA-flavoured events | 17 Nov | release 1 in v243; direction open, nothing since |
| G5 The Northern Front | 11 Nov | not started (waits on G4 by his own rule) |
| G6 Living enemy NPCs | 11 Nov | not started (after G5) |
| G7 Home on the Nordkinn | 24 Nov | H1 ski trails done. Gram remade and done v284 (supervisor ran h2_gram, h2_reels, gram_scroll at polar night and spring green on the final tree, 26 Nov). Gram leftovers: low-preset painted pictures are generic blobs; gapahuk-fire photo washes out in daylight; kicksled post can show only a wall; `doorwall`, `skipole` kinds off; reel start-up and new-game frame numbers measured by a builder but never written down; reel p95 spikes under machine load not isolated. I1-I10: I1 building. H4-H8 outlined. |
| Settings menu split into separate Game, Graphics and Sound menus; painting taken out of the menu, you get painted at the garage you are doing repairs at (his words: "make tracklayers settings menu into a seperated settings menu with a game menu, a graphics menu, a sound menu, and move the painting out of the menu and make it so you get painted at the garage you're doing repairs at") | 27 Nov | not started |
| Roads completely redone: new design, re-placed around the whole map, no kerbs, much nicer, worn is fine, realistic first | 27 Nov | not started; build order 3a above |
| G8 The realistic look, bar raised 26 Nov to "photoreal, or as close as ultra graphics roblox games go", with builders on it continuously | 24 Nov, 26 Nov | R1 figures, R2 sleds done. P1 the picture (post chain, contact shade, bloom, sky, sky light, shadows, Ultra preset) done v291 (supervisor re-ran the gate and compared before/after stills, 27 Nov; a step up, not photoreal: no clouds, flat blue shade, no light spill on snow). Town roads (26 Nov: "fix the very shittily placed roads to be nice and actually look like a town"): the half-lane strip beside Kaigata is fixed (v286); the layout itself (roads out of town joining the grid, streets to the quay and sites, no dead-end rectangle) is R3's first part, next after P1. Sleds (26 Nov: "i can see through the middle of the sled"): the seat's row of holes is fixed (v286); every asset slice now gets checked from the game's own cameras. Then R3 streets, R4 houses, R5 vehicles and props, R6 nature, R7 viewport second pass, R8 nitpick round: none started. Plan `loop/REALISM.md` |
| G9 Armed work and raids: armed courier and guard jobs, tip-offs, shoot-up raids on drug sites, your name gets out | 25 Nov | A1 armed work (v274) and A2a done: drug sites in the world with a crew outside on suspicious routines, found by watching them or by a tip. Left: A2b the raid itself (fight, cash, Politi clock; plus dog, tub carriers, purple light fixes). then A3, A4, A5. Plan `loop/RAIDS.md` |
| New-player tutorial arriving on the ferry on foot (G2) | 30 Oct | not built; needs snow-free walking |
| Upgrade every old animation to the realistic rule (G3) | 30 Oct | only climb on/off done; walker, wader, crash/get-up, skier, passengers left |
| Smooth the snow LOD line 9-12 m out (G3, "top priority until he's happy") | 26 Oct | still open in LOOP.md |
| Mountains grey far away, white up close (G3) | 26 Oct | still open |
| Summer hiking trails and swimming | 25 Nov (he expected it in G4's seasons) | not built: slice I10 |
| Clothing: a real wardrobe, all or nothing | 25 Nov | not started on purpose; waits for his call |
| Cooking | 25 Nov | his later update; I1 and I3 build kitchens ready for it |

## Needs Lemon's hands
- I5 haptics (v285): open the tablet's Controller app, click CONNECT DUALSENSE (Chrome or Edge), ride. Say what feels wrong (too strong, wrong trigger, light bar); the DualSense path has never run on real hardware.
- I4 radio: listen to all six stations (tablet > Radio). Say which sound wrong or grating; the music has only been checked by meter, never by ear. No quick key for next station yet (tablet only).

## Small things
- Tether rope stays visible after a plain dismount (13 Nov). Open.
- "X: size it up" prompt by an unhooked rescue victim does nothing (13 Nov). Open.
- Delivery rewards with flavour dialogue: snacks and the like (11 Nov). Open.
- About 60 polish and test lines from the beta tester under G4 in `loop/LOOP.md` (pad/touch gaps, toasts, stale
  scenarios `x2_standstart`, `x3_traffic` step D). Open.
- G7 leftovers: two flaky tests under load (`h1_life` fire prompt null, `h2_reels` aurora place), reel defects (H2R-b), ski rescue odds never measured in real play.
