# 0203 — tablet app list with Boats + Lights apps (G4 beta, base tablet) — main @ ff195f5 (script v237)
Scenario: x_tabapps_v237_break.mjs (new). Numbers only, no stills. Not tested: Boats/Lights apps AFTER owning a boat/lighthouse (lanes C/B own those), pad and touch navigation of the longer app list.

## Findings
1. [POLISH] Fresh save registers 15 apps; 6 are hidden until earned (freight, realestate, rescue, boats, staff, lights). Asking the tablet for a hidden app (`TABLET.toggle(true, id)`) opens the App Store instead, with no error, for all six. Fine and consistent; nothing in the game calls it that way today, noted so nobody reads it as a bug.
2. [POLISH] Hidden apps leave no hint in the App Store's Today page on a fresh save (first screen shows Trail Crew, Freight only); Boats and Lights have no install card until you own something. If that is meant to be discovery-by-owning, ignore.

## Held (no bug found)
- Every visible and hidden app opens and closes on the sled with page errors none; same loop inside a bought pickup's cab: 0 errors.
- App visibility checks never throw on a fresh save.
- Reload with the tablet open in the cab: back in the cab (cur v1), map reopens, pose and camera finite, page errors none.
