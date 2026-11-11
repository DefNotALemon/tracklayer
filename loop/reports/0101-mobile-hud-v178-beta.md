# 0101: mobile HUD rearrangement (68df8e5, v178): beta break test (main f697d43, v179)

Focus: the touch HUD commit "vitals top-left + speedo top-right, zone/minimap dropped, slimmer tutorial card" (not a G4 slice, but the
newest change with zero beta reports). Reran `x3_mobile.mjs`: all ok, page errors none. New `x4_mobilehud.mjs` (committed) measures
HUD/touch-control rects at 375x548, 390x664, 430x740 (portrait) and 667x375, 844x390 (landscape), riding / toast / MORE sheet / on foot /
bleeding / tutorial card / low vitals. It exits 1 today: real overlaps below (the `cpStrip` hits are the compass's thin line, see 3).
Stills: `~/.hermes/cache/scratch/tlloop/reports/0101.jpg`.

## Findings
1. BUG: in every portrait size the TABLET and MORE buttons sit on top of the speedometer. Speedo rect (278,32,96x96) vs tcSys
   (282,64, 96x44) at 390x664: the buttons cover the speed number, only the arc and "MPH" peek out. The player cannot read speed
   in portrait. (`--ph-top` puts #tcSys at top:64px/right:12px while the new top-right speedo pod occupies y 32-128.) Suggest moving
   TABLET/MORE below the speedo (top ~136px) or the speedo under them, and moving #tcSheet with it.
2. BUG: the MORE sheet and the toasts collide. With the sheet open (all sizes) toasts run underneath it (tcSheet x toast: seen at
   844x390 and 667x375, text half-hidden behind the sheet); in portrait the sheet also sits over the speedo and the toast column.
   Suggest hiding or shifting toasts while the sheet is open, or anchoring them left of the sheet.
3. POLISH: the vitals pod (16..126 px) runs through the compass strip (compass starts x=85 at 390 wide): the bars' right ends cross
   the E/NE labels line. In landscape the compass strip passes behind TABLET/MORE (667x375, 844x390). Cosmetic, text stays readable.
4. POLISH: 667x375 landscape with the tutorial card up: a toast ("The garage has a first job...") lands on top of the HORN button
   (tcHorn x toast31), so a tap there may hit the toast area instead. Toasts are pointer-events? verify; if not, ignore. Suggest
   toasts keep clear of the right-hand control cluster.
5. POLISH: the vitals bars at 100% fade to ~0.06-0.13 opacity (warmth/fuel), so at a glance the top-left pod looks like two bars (hunger
   and thirst). Probably the minimalist-HUD intent, but with the zone/minimap gone there is no other fuel readout on a phone while
   riding until fuel is low. Confirm that is wanted.

Held: zone card and minimap are hidden on every size; vitals pod fixed at top-left (16,16); the speedo stays on screen at speed; no
page errors; x3_mobile still passes (ride buttons do not overlap).

Not tested: a real iPhone safe-area inset (notch), pad + touch mixed, tablet open on phone, cab (truck) HUD on phones.
