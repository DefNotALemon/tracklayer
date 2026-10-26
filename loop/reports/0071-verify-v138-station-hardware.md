# 0071 — verify v138 pump/canopy-post hardware at close range, ride distance and a moonless night (G3) — main @ 02a0053
Scenario: tools/playtest/scenarios/g3_station_hardware_check.mjs (new, committed with this report)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0071.jpg (contact sheet: bollard_night, jerrycan_day, jerrycan_night,
pool_moonless, ride_day, ride_night)

## Verified since last time
- v138 (02a0053, "fuel station pumps and canopy posts get real hardware"): the pump itself reads clearly up close —
  bollard_night.jpg (meant as a bollard shot, landed on the pump instead, see Findings) shows the steel kick plate,
  white stripe, and the hooked nozzle + hose loop sitting on the pump's front face exactly as the builder's log
  describes; the LCD price display (60.39 / 24.65) is sharp and legible right next to it. No z-fight, no floating
  geometry, no roof-shape misread — this confirms the "nozzle re-angled, now reads as a hung nozzle" fix from report
  0070/PROGRESS holds up from a natural standing-distance camera, not just the builder's own close crop.
- Canopy forecourt pool verified on a moonless, low-aurora night (pool_moonless.jpg, GS.hour≈2:01, AUR.v forced to
  ~0.03, "Clear" weather): the warm light pool under the canopy, the kiosk's lit windows, and the street lamp pool
  are all plainly visible against the dark backcountry — not subtle or washed out at this darkness level. Builder's
  "judge on a dark night" ask (0069/PROGRESS v128) is satisfied.

## Findings
1. [G3][low] At realistic riding distance (~20 m, camera offset (18,14) local from the pump, ride_day.jpg /
   ride_night.jpg) none of the v138 hardware detail (nozzle, bands, bollard stripes) is distinguishable — the whole
   pump island reads as a small red/white blob under the canopy, day or night. This matches how a player actually
   sees the station while riding past (you'd have to park and walk up to notice the hardware), so it's not a defect,
   just confirms the detail work only pays off at stop/close range, as expected for this kind of polish. No action.
2. [G3][harness, not a game finding] jerrycan_day.jpg / jerrycan_night.jpg completely miss the jerry-can pallet:
   the camera in this scenario assumed the fuel cabin's prop group sits at world rotation 0, but `buildFuelCabins`
   picks a random angle `a` per cabin (`g.rotation.y = a`), so the camera ended up square-on to the unlit price board
   instead of the pallet/cans. The jerry-can pallet at a fuel cabin (builder's "unchecked" item from PROGRESS v138)
   is still genuinely unverified — next pass should read the cabin's actual `a`/rotation (or walk FOOT up to it and
   use the game's own follow camera) rather than guessing a fixed offset.
3. [G3][info] AUR.v set to a low value right before a shot doesn't reliably suppress the night's rolled aurora —
   the bollard_night shot's HUD chip read "AURORA · STRONG" even with AUR.v forced to 0.05 moments earlier (a
   different sample a few seconds later in the same run showed AUR.v back near 0 with no chip). Aurora activity
   for the day seems to come from a seeded per-day roll (`AUR`/calendar code) that isn't fully overridden by poking
   `AUR.v`; picking/skipping to a specific low-aurora in-game day (or reading `AUR.v` right before the shot and
   retrying) would make "moonless, aurora-off" tests more reliable than a one-line override.

## Ideas
- Re-run a jerry-can-pallet close shot using the cabin's real `rotation.y` (or the player's own near-site camera
  framing from `siteTick`/`near` logic) so that PROGRESS v138's last open item actually gets judged.
- A true "ride-by" contact sheet (camera following a moving sled at ~15 m, not a static offset) would better match
  what a player actually glimpses of station hardware while passing, if that's ever worth measuring precisely.
