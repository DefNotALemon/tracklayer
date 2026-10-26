# 0018 — Verify v75 Aurora E plug-in charging (G2) — main @ ed57feb

Scenario: tools/playtest/scenarios/g2_aurora_plug.mjs (reused, builder's own) for numbers, plus a new
tools/playtest/scenarios/g2_aurora_plug_visual.mjs for stills (garage card, village plug-in toast, quay).
Sheet: ~/.hermes/cache/scratch/tlloop/reports/0018.jpg (01 garage card, 02 village plug-in HUD, 03 quay HUD).

## Findings (most important first)

1. [G2][verified, matches claim] Numbers reproduce PROGRESS exactly on a fresh run: Aurora at Mehamn
   village **+31.0 L of 34 for $23** ($0.75/L), Gartefjellet wind farm **+31.0 L for $23**, pump
   (Kjøllefjord Drivstoff) **+31.0 L for $23** (vs Matriarch's $66 for 27 L at the same pump — the plug
   rate really is under a third of pump price as the card claims). Quay charges free for both sleds
   (+27 L / $0, +31 L / $0). Range Aurora 34÷0.85 = **40.0** vs Matriarch 30÷1.0 = **30.0**, longest on
   the ladder as claimed.

2. [G2][confirmed, vision] Garage card text (shot 01, zoomed) reads correctly: "Plugs in anywhere with a
   stove: every village, cabin, relay and home charges it at $0.75/L (under a third of the pump), so you
   never ride to a pump again. Regen on the downhills makes it 15% thriftier: the longest range on the
   ladder." Green perk line present, no truncation or overlap with the price/stat line above it.

3. [G2][confirmed, vision] Village plug-in toast (shot 02, zoomed) reads "Battery full: 31.0 L of charge
   at Dyfjord ($0.75/L), −$23." — clear, correctly priced, singular toast (no stacked duplicate visible
   in the still, though the text log shows "Plugged in..." and "Battery full..." both fire in sequence,
   which is intentional per `fuelStep`/`fuelEnd`).

4. [G2][confirmed, already filed — no new item] Quay still fires the false "Battery low" warning noted in
   PROGRESS's own follow-up (`GS.near===depot` isn't in the low-fuel-spot check): text log shows it firing
   twice at the quay despite +31 L charging for free there. The backlog already has this exact item
   ("Fuel low/Battery low fires at quay and garage which refill free"); this run just reconfirms it with
   fresh numbers, no new entry needed. (Shot 03's toast had already rotated to "Warm up and refuel" by
   capture time — the low-batt toast is real per the text log, just timed out before the screenshot.)

5. [G2][info] No page errors; smoke-equivalent behaviour (restat, fuelStep, toast queue) all fired cleanly
   across 9 stop visits × 2 sleds with no stuck states or NaN.

## Verified since last time
- v75 Aurora E plug-in charging (ed57feb): lands as claimed. Pricing, range, card text and toasts all
  check out on an independent rerun; the one known rough edge (false low-battery warning at the quay) is
  already on the backlog and unchanged by this landing.

## Ideas
- None new — the Aurora landing closed the "nothing above Summit opens a part/reason" gap for one sled;
  Apex/Matriarch still have no story (already backlog item 1). Next playtester pass should rotate to G1
  or G3 per LOOP.md's own round-robin, since this pass and the prior one (0017) were both G2/G3 verifies —
  G1 (walking) hasn't had a playtest pass since 0015.
