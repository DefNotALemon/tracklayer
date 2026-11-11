# 0104: phone HUD after the v181 fix (737d5c3): cab, tablet open, 320 px wide (main fa0c292, v181)

Focus: newest landed change = "Phones: TABLET/MORE off the speedometer" (the fix for 0101). Reran `x4_mobilehud.mjs`: all passed (5 sizes, riding, toast,
MORE sheet, on foot, bleeding, no fuel, tutorial card, low vitals), page errors none. 0101's findings 1 and 2 are fixed. Then new
`x4_mobilehud2.mjs` (committed) covers what 0101 listed as untested: the pickup's cab, the tablet open, and a 320x568 phone (iPhone SE 1st gen / small
Androids) at 320x568, 390x664, 844x390, 667x375. Exits 1 on the 320 px findings below. 390/667/844 sizes: cab, toast and tablet-open all clean.
Stills: `~/.hermes/cache/scratch/tlloop/reports/0104.jpg`.

## Findings
1. BUG: at 320x568 in the pickup's cab the GARAGE pill (tcE, right edge x~225-303) sits on top of the GET OFF button (tcQ), so the player cannot
   see or tap GET OFF while GARAGE shows (it shows beside the garage, i.e. exactly where you parked). At 390 wide GET OFF sits left of the pad
   and is fine. Suggest at narrow widths stacking GARAGE above the HOP button or pulling GET OFF to the left edge above the stick.
2. POLISH: at 320 wide the steering stick (tcStick) overlaps HORN and WHEELIE (circle x 22-120 vs buttons x 100-146). Taps near the overlap are
   ambiguous. Seen riding the sled and in the cab. Suggest shrinking the stick or moving the HORN/WHEELIE column right by ~20 px under 340 px.
3. POLISH: with the tablet open on the phone in the cab (Jobs app, 390x664) the GARAGE pill is drawn over the tablet card's right edge and covers
   text ("Nov... to ..."), GET OFF sits just below it. The pill should hide while the tablet is open.
4. POLISH: on the sled at 320 wide the open tablet is the 3D dash glass (small); TABLET/MORE overlap its top-right corner and the stack of
   three toasts covers its left half. Readable but cramped; hiding toasts while the tablet is open (as already done for the MORE sheet) would help.
5. Not an issue: `tcSheet x tcFull` overlap flagged on the MORE sheet is the empty cell of the sheet grid (FULL SCREEN button is visible);
   the scenario lists it as a fail only because its rect is a hidden-but-sized container.

Held: GET OFF/GET ON labels correct on touch, Q gets into the pickup with the touch layout, no off-screen controls at any size, no page errors.

Not tested: real notch safe-area insets (CDP cannot emulate env(safe-area-inset-*) simply), pad + touch mixed, trailer/hitch buttons on phone.
