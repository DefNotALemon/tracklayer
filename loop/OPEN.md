# Open asks: everything Lemon has asked for that is not finished

Lemon, 25 Nov 2026: "take the time and power now to finish the big updates i've asked for in the past few weeks. i keep
finding small things you either half finished or didn't even pick up to work on when i told you to and i want that to
end". This file is the single list. Rules: an ask is added here the moment it is made; a line leaves only when the thing
is on main AND checked by the supervising session (gate re-run, stills looked at); "landed" in a builder's report is not
enough. Every session that works on Tracklayer reads this first and updates it last.

Audit of 25 Nov (from `loop/EXPANSION.md`, `loop/LOOP.md`, `loop/HOME.md`, `loop/REALISM.md`, `loop/NORTHERN-FRONT.md`,
the cron list and the usage governor):

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
| G7 Home on the Nordkinn | 24 Nov | H1 ski trails done; Gram remade core H2R-a live v275 (25 Nov, supervisor gate green); open: visual defects (stuck-sled, groomed-trail, fox, moose-window posts, black night skies, plain faces), reels still the old 12 scenes and repeat (H2R-b), reel draw calls hit 1386 vs 900 budget in one gate run, skier hold-off 0.79 m once; I1-I10 designed; H4-H8 outlined |
| G8 The realistic look | 24 Nov | R1 figures, R2 sleds done; R3 streets to R8 nitpick round not started |
| G9 Armed work and raids: armed courier and guard jobs, tip-offs, shoot-up raids on drug sites, your name gets out | 25 Nov | A1 armed work landed v274 (gate re-run by supervisor clean; its walk-in gait and bare posts are fixes in A2a); A2a building. Left: A2 tip-offs + first raid + places found by chance with suspicious people outside (his add of 25 Nov), A3, A4, A5. Plan `loop/RAIDS.md` |
| New-player tutorial arriving on the ferry on foot (G2) | 30 Oct | not built; needs snow-free walking |
| Upgrade every old animation to the realistic rule (G3) | 30 Oct | only climb on/off done; walker, wader, crash/get-up, skier, passengers left |
| Smooth the snow LOD line 9-12 m out (G3, "top priority until he's happy") | 26 Oct | still open in LOOP.md |
| Mountains grey far away, white up close (G3) | 26 Oct | still open |
| Summer hiking trails and swimming | 25 Nov (he expected it in G4's seasons) | not built: slice I10 |
| Clothing: a real wardrobe, all or nothing | 25 Nov | not started on purpose; waits for his call |
| Cooking | 25 Nov | his later update; I1 and I3 build kitchens ready for it |

## Small things
- Tether rope stays visible after a plain dismount (13 Nov). Open.
- "X: size it up" prompt by an unhooked rescue victim does nothing (13 Nov). Open.
- Delivery rewards with flavour dialogue: snacks and the like (11 Nov). Open.
- About 60 polish and test lines from the beta tester under G4 in `loop/LOOP.md` (pad/touch gaps, toasts, stale
  scenarios `x2_standstart`, `x3_traffic` step D). Open.
- G7 leftovers: two flaky tests under load (`h1_life` fire prompt null, `h2_reels` aurora place), reel defects (lake
  race crowd, white tail lamps, flat gulls), ski rescue odds never measured in real play.
