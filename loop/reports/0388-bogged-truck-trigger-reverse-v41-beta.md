# 0388 — bogged truck free on plowed ground + light-trigger reverse (tlx-vehicles v41, 0d59329): beta

Run on origin/main 5e997e0. Reran lane A's `x2_bogstreet`, `x2_vehreverse`, `x2_vehreverse_break`: all exit 0, 0 FAIL, page errors none.

## Results
- Plowed ground: freed on 7 of 7 spots (4 streets, 3 yards). Worst tyre sink 0.084 m, worst mean 0.054 m, lowest pack 0.8. W then drives off (8.0 m in 3 s).
- Deep powder is still a real bog: 0.52 m laid, stays bogged through 5 s W, 4 s S, 3 s idle (sink ~0.55 m, pack 0.11). The fix did not make deep snow free.
- Reverse on 20 cm loose snow: S only 6.1 m; KeyA 1 s standstill 0.55 m, then 10.0 m reverse; KeyD 9.6 m; night 11.6 m; touch BRAKE pedal 11.2 m. All finite, no NaN.
- A key (full pedal) is never told "give it more".
- Flip S -> W while rolling back: 6.1 m/s forward after 2.5 s, rev flag 0.
- Reload keeps the truck owned and unbogged.

## Findings
No BLOCKER or BUG.
1. POLISH: uphill reverse at grade 0.12 goes 0.0 m with the toast "The wheels spin in reverse and dig in. Ease off before it's stuck to the axles." Reasonable, but nothing says to go forward/turn; the hint doesn't name a way out.
2. POLISH: KeyD reverse ends at -1.6 m/s with the rear tyres sunk 0.93-0.98 m (vs 0.06 on KeyA): the lock steers the truck into deeper snow; it still moved 9.6 m.

Not covered: pad trigger at the 30% pull (only via scenario), no still judged, no old save.
