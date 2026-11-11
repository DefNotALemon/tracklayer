# 0094: minimalist HUD, hunger/thirst, wounds + bandages: beta break test (main ebced50, v175)

Focus: the v175 HUD/survival/wounds landing (66f9b98). Reran `x4_hud.mjs`: all ok, page errors none. New scenario
`x4_hudbreak.mjs` (committed) tries to break it. Result: no BLOCKER, no BUG, two POLISH. Stills:
`~/.hermes/cache/scratch/tlloop/reports/0094.jpg` (night, two wounds, sled / quay-parked truck / on foot).

## What held
- Mixed-age wounds (8 s, 4.5 s, 2 s): U takes the oldest still-fresh one (4.5), then the 2 s one; a third U on only the soaked wound
  is refused ("too late") and does not burn a bandage (3 -> 2 -> 1 -> 1).
- U with the tablet open dresses a wound (works, no stuck state). Bleeding keeps going with the tablet open (80 -> 78.3 in 3 s of
  game time, about 0.55/s): you can't dodge it by opening a menu. Same with `HELP.on` set (78.3 -> 76.6).
- The save holds `{health, wounds:[{age}], bandages}` exactly (health 55, ages 3 and 9, 1 bandage) after `save()`.
- Hunger and thirst clamp at 0 (no negative), warmth keeps falling (59.8 -> 56.4 in 4 s) with both empty; no toast spam.
- Bleed-out with 3 aged wounds and 0 bandages goes through the tow path once: wounds cleared, health restored, bandages back to
  3, no second blackout loop in the next 12 s.
- Night stills: bars, speed number with rev arc, compass strip, and the red BLEEDING bar are all legible, no overlap with the
  minimap or the tablet/ferry panel.

## Findings
1. POLISH: reload (or closing the tab) is a free full heal. The wounds and ages are saved, but the game restarts you at the quay
   on load, and the quay tick clears wounds, restocks 3 bandages and refills hunger/thirst on the first frame (33/12 -> 78.7/90.4,
   wounds 2 -> 0, health 55 -> 100). Consistent with how fuel already behaves, so probably intended; if wounds are meant to
   matter, either keep the player where they were or don't clear wounds on a load-time quay spawn.
2. POLISH: the lower-centre of the screen gets crowded when it all happens at once (still 07): two stacked "hungry" and "thirsty"
   toasts, the on-foot "E: get off and fish" hint and the BLEEDING bar with its "3 bandages" label sit within about 60 px of each
   other, and the bar's label is small against the red. Suggest moving the bandage count to the right of the tank or enlarging it.
   Hungry and thirsty also trigger as a pair when set low together, which is realistic but doubles the toast count.

## Not tested
- Wounds in a truck away from the quay (the truck stills were taken at the quay, which heals at once, so the HUD in a truck
  with an open wound is unseen).
- The random pot-shot hazard rate in a long ride, touch layout of the bars on a phone, pad brand names on the bandage prompt
  (covered by `x4_hud.mjs` for Xbox only).
