# 0072 — Fuel cabin walk-up: yard patch, pallet obstacle, cans at night (G3) — main @ daa5150
Scenario: tools/playtest/scenarios/g3_fuelcabin_walkup.mjs   Shots: ~/.hermes/cache/scratch/tlloop/reports/0072.jpg

## Verified since last time
- v139 fuel-cabin jerry cans (daa5150): walked 12 m straight at the pallet at both Dyfjord and the Risfjord
  herder cabin. The shovelled yard patch works as intended — at the pallet centre pack reads **0.85** at both
  cabins vs **0** at the Risfjord approach spot 12 m out (fresh powder) and 0.85 already at Dyfjord's approach
  (that cabin's yard happens to sit in an already-packed area). Visually the cans read clearly as jerry cans on
  a pallet from 6 m (00_day_walkup_6m.jpg) and up close (02_night_cans_close.jpg), no clipping/floating, matches
  report 0054/PROGRESS's description.

## Findings (most important first)
1. [G3][med] Walking straight at the pallet, the walker doesn't slide past it cleanly — it gets caught orbiting
   the obstacle disc at a near-constant **1.37–1.41 m** radius for **2.8 game-s** (Dyfjord: `d` frozen at 1.41 m
   from t=4.47 to t=7.28 in the scenario's TRACE) while `FOOT.sp` stays pinned at 2.69 m/s the whole time — so
   it's not a hard stop (sp never drops), it's a smooth circle round the 1.0 m-radius `addOb` disc instead of a
   quick deflect-and-continue like a house wall gets (`g1_wallslide`'s summed-normal slide). A player walking
   square at the pallet to reach the cans would feel like they're stuck swinging round it for ~3 real seconds
   before breaking free. Suggested fix: give circular obstacles (the fuel-cabin pallet, likely other `addOb`
   discs with no paired neighbour) the same "push the into-the-obstacle part off the step, then go straight
   along the tangent" treatment as the wall-slide code, instead of (or in addition to) the per-step radial push,
   so a single disc resolves in one or two steps rather than orbiting.
2. [G3][low] Night visibility (`02_night_cans_close.jpg`, hour 22): the cans and pallet are actually legible up
   close — no dedicated headlamp exists on foot (grepped, confirmed), but ambient moonlight + the cabin's own
   lit window carry it fine at point-blank range. From chase distance (`03_night_chase_cans.jpg`, ~4 m) the
   pallet goes flat dark blue and is hard to pick out against the snow; only the lit house window and the price
   sign catch the eye. Not a regression (the whole scene is dim by design at night), just notes that "judge the
   cans at night" reads as fine close-up, weaker from a few metres back.
3. [G3][low] Risfjord herder cabin's 12-m approach spot sits in deep fresh powder (`startDepth 0.97, pack 0`)
   right up to the yard edge, a sharper powder→packed transition than Dyfjord's (already-packed approach). Not
   a bug, just a sharper contrast player's feet will feel between the two cabins' surroundings — worth knowing
   if the yard radius (1.6 m) is ever tuned, since Risfjord shows the shovelled-patch effect best.

## Ideas
- The circling-obstacle pattern (finding 1) is probably not unique to fuel-cabin pallets — any standalone round
  `addOb` a player can walk dead square into (trash cans, posts, rocks) likely has the same orbit risk; worth a
  quick general check once this one's fixed.
