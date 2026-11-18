# 0272 — v255 narrow-tablet list rows on the other apps (Politi, Homes) — main @ 5ef1789 (script v255)
Scenario: new `ui_narrowrows_apps_beta.mjs` (headless, touch on, owns a plow truck so the dash tablet is the narrow one; viewports 640x360, 667x375, 568x320, plus 390x844 and desktop in a first run on foot). Existing `x4_plowrows_narrow.mjs` rerun first: all ok, page errors none. Sheet: `~/.hermes/cache/scratch/tlloop/reports/0272.jpg`. Not tested: Lights, Staff, Property, cabin-upgrade (`treup`) rows (apps not installed on a fresh save; no save planted with a depot).

## Findings
No BLOCKER, no BUG.
1. OK — Politi record (Fines/Warnings/Chases) and Recent rows, and the Homes History rows: at pane 265 / 292 / 209 px logical every row's text is >= 149 px wide, tallest row 88 px, nothing sticks out, no NaN. The v255 container rule carries over to apps other than Plow.
2. OK — on the plain on-foot/dash overlay the tablet is 560 px logical in every viewport (390x844 too), so the narrow rule never fires there and rows keep the old two-column layout at 376+ px text width. Fine.
3. POLISH — the tablet header's cash figure breaks in a narrow dash tablet: at 640x360 Politi shows "$23,2 / 00" over two lines, at 568x320 it is clipped to "$23,2". Same header on Homes. Suggest `white-space:nowrap` on the header cash and let the title shrink or ellipsis.
4. POLISH — at the 640x360 embed the opened tablet is mostly covered by three stacked toasts and a weather notification (tutorial-skip/purchase toasts plus "Mon 2 Nov · met office"); in the 209 px pane the weather notification fills the whole screen and the app list is below the fold. Not a regression from v255, but on itch the first screen of an app is often a notification card; suggest auto-collapsing notifications when an app is opened.
5. NOTE — scenario noise: Homes lease cards are tall (200+ px) by design; they are not `.tprow` rows.
