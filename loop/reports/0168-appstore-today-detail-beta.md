# 0168 — App Store rebuild (Today page + product pages, v216-218) beta — main @ fe60bdc
Newest landed player-facing slice with no beta report. Reran `g7_appstore_detail.mjs` (22 asserts ok, page errors none), then wrote `tools/playtest/scenarios/g7_appstore_break.mjs` (new): keyboard arrows, pad d-pad/A/B, all apps installed, broke, bad `STO.sel`, reload on a product page, night, landscape phone. Still: `~/.hermes/cache/scratch/tlloop/reports/0168.jpg`.

## Verified
- Enter on a card opens its page; Escape/pad B returns to Today; the tablet stays open. Pad d-pad down + A opens a page.
- All four installed: no START HERE, every card INSTALLED, every pill OPEN, badge empty; OPEN on each product page goes to the right app (crew, freight, realestate, rescue).
- Broke: Rescue pill shows "GET · $90" with the poor style; the other pills read OPEN. An unknown `STO.sel` falls back to Today. Reload while on a page reopens on Today. No page errors.

## Findings
1. [BUG] Keyboard/pad focus can sit on a feature card that is scrolled out of view. The card row is a horizontal strip (scrollWidth 1392 vs 986 visible). Arrow-right from Trail Crew moves focus Freight → Real Estate → Rescue, but `scrollLeft` ends at 18 and Rescue spans 1026-1356 px, entirely off the right edge. `paintFocus` only scrolls `#tabV` vertically. A pad player pressing A there opens a page they can't see highlighted. Suggested fix: in `paintFocus`, also `scrollIntoView({inline:"nearest", block:"nearest"})` for focus inside `.stcards`, or `scrollLeft`-adjust the strip. Pad user can still use the Top apps rows below, which are all visible.
2. [POLISH] In the focus_rescue still the white focus ring is drawn on the Freight card although `TABLET.focus` and `.tfoc` are on Rescue (JS read taken right before the shot). Possibly a stale mouse-hover focus (`pointerover` sets focus), or two cards styled `tfoc`. Not chased; worth a glance with a real pad.
3. [POLISH] Enter on the focused big GET pill on a product page buys at once (Freight $120 taken, cash 1000 → 880) with no confirm. Same as mouse click, and the price is shown on the pill, so consistent with the app's design; flagging because pad users hit it by pressing A twice (open page, then A on the first live control).
4. [POLISH] Landscape phone (844x390): the product page's scroll area is only 193 px high against 893 px of content, so the page is mostly scrolling. Nothing is clipped horizontally (two descendants flagged by my 1 px check are the banner glow, not content).
5. [POLISH, coverage gap] Not tested: real touch swipe on the card strip, a pad with the tablet closed mid-purchase, and old saves with `GS.apps` undefined (the loader already defaults it, `x1_save` passes).
