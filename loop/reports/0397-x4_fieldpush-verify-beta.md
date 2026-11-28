# 0397 x4_fieldpush: field-push and bladeful-on-exit checks pass on main (beta, tester 1)

Focus: 681e7ac (test only, lane A, closes 0395 #1/#2). Run on origin/main 6554582: `x4_fieldpush` exit 0, every line ok, page errors none. No still taken: the scenario asserts numbers and takes none. No other part had code newer than its last report (0396 is 22 min old, 0395 and 0394 are under 2 h).

1. **OK** Blade down on untouched 30 cm snow: the hint says why in the first second ("back up to cleared ground and plow in from there"), no bog after 1.5 s, E lifts the blade, the truck backs 4.2 m with it up.
2. **OK** Blade dropped again plows in: 21.7 m, 12.9 m3 cut.
3. **OK** Exit from the cab with a real bladeful (1.02 m3 at 0.84 m/s): carry goes to 0 at once, nothing lost (1.02 laid of 1.02), 32.279 m3 on the ground after against 31.259 + 1.02 before, as a 1.05 m heap.
4. **POLISH** After the field push the hint reads "BLADE DOWN · 20 km/h · cutting 30 cm" while 30 cm of snow stood ahead. Nothing wrong, but a "square: it carries" note would show up only after the speed drops. Low priority.

Not tested: pad and touch for the reverse and lift controls (covered by x4_bladework / 0395), night, old saves.
