# 0185 — Town redo (v228): sled down every street, parked cars, storm, reload — base game, main @ c28a3fd
Scenario: g1_towngrid_cars_drive.mjs (new; exit 0, page errors none)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0185.jpg
Follow-up to 0183's "Not tested" list.

## Findings
1. [POLISH] The street-level view (sled on the depot street, noon, storm just cleared) shows no visible road: the plowed street is the same white as the lots beside it, so the sled sits on an undifferentiated snowfield between houses. Same as 0183 #2, confirmed from the saddle. Suggest packed-snow tint or berms.
2. [POLISH] Driving legs end at 36-39 m/s on a 96-134 m street (my steer-to-point driver, W held): at that speed a 4 m junction is gone in 0.1 s. Not a bug, but there is no speed dampening in town; worth a look only if Lemon wants town to feel like a town.
3. [POLISH] Retiring g1_townlots.mjs is still open (0183 #3).

## Held up
- 7 street legs driven end to end on the sled (3 east-west, 4 north-south): no crash, no collider hit at the leg end (obNear 1.2 m false at every stop), no stuck at under 16 m/s except leg 3, which ended 52 m past its target (overshoot, not a stall). Two legs "not reached" were overshoot too.
- Storm (WX forced to 1, 1.5 s): yardAt on the depot street 0.9 and 1.0, streets stay plowed.
- All 17 parked cars (TLXC) are in the villages: 0 within town radius, so the new lots cannot collide with them; count 17 before and after reload.
- Reload: no page errors.

## Not tested
Old save with owned depot cabins/parked rigs placed by the old layout (no position of the sled is saved in the base game, so only x.* records matter), touch/pad driving, a real multi-hour storm refill.
