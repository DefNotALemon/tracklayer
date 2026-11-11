# 0106: phone HUD v183 (7da657e, GET OFF vs GARAGE fix for 0104), worst-case pills (main 0f62d34)

Focus: newest landed change, "Small phones: GET OFF no longer under GARAGE". Reran `x4_mobilehud2.mjs`: all passed (320x568, 390x664, 844x390,
667x375: cab, toast, MORE, tablet open), page errors none. 0104's findings 1-3 confirmed fixed. Then tried to break it with two new scenarios
(committed): `x4_mobilehud3.mjs` (unhides riding/on-foot pills at 8 sizes; passes, but the game re-hides `[hidden]` every frame so it only saw 12/7 controls, so
it proves little) and `x4_mobilehud4.mjs` (forces every context pill visible with CSS, plus a touch-hint check). Stills: `~/.hermes/cache/scratch/tlloop/reports/0106.jpg`.

## Findings
1. BUG: WIPE VISOR sits exactly under BANDAGE at every portrait size (320x568, 360x640, 390x844) and partly in landscape. Still `allpills_360x640`: only
   BANDAGE (orange) is tappable, WIPE VISOR is a grey sliver behind it. Both can be live together (`tcWipe` = visor iced/swept in snow, `tcBand` = open wound,
   tracklayer.js:2457-2458): a crash in a storm. Suggest stacking BANDAGE above/below WIPE in the right-hand pill column like GARAGE already is.
2. BUG (landscape, forced states): BANDAGE overlaps the speedometer at 667x375 and 844x390; CALL HELP overlaps GARAGE at 667x375. CALL HELP + GARAGE needs fuel 0
   beside the garage (plausible: ran dry on the doorstep); BANDAGE x speedo needs a wound while riding. Suggest the landscape pill column start below the speedo
   and CALL HELP/GARAGE share the same stacking rule as GET OFF/GARAGE.
3. POLISH: in portrait the worst case stacks six pills (CALL HELP, GET OFF, REEL, BANDAGE, WIPE, GARAGE) and REEL (round chip) touches the HORN/LEAN cluster
   at 360x640. Fine for normal play; only seen with everything forced on.
4. Checked, not a bug: the earlier "Q: get on the sled" on-foot hint in the 3 stills came from forcing `SET.touch` without a real touch event. After a
   dispatched touch (`INP.dev = touch`) the hint reads "tap GET ON". Held.

Held: no off-screen controls at any of 8 sizes; on-foot set (USE, GET ON, SIZE UP, GARAGE, CALL HELP, BANDAGE) is clean at all sizes when forced; page errors none.

Not tested: real notch safe-area insets, pad + touch mixed, trailer/hitch buttons on phone, a real wound + iced visor in play (states forced by CSS, not game state).
