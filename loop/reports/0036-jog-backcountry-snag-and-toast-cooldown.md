# 0036 — G1 open-backcountry jog: a snag bug, and the toast cooldown vs the blow cycle — main @ a2e68c2 (script v96)

Follow-up to 0035's idea #2 (0035 only tested the jog on in-town plowed lanes, never got blown there).
New scenario `tools/playtest/scenarios/g1_jog_backcountry.mjs` (committed with this report): find a flat,
obstacle-clear 140 m straight line out in open backcountry, far from any lane, and jog it continuously for
90 game-s holding Shift. Woodsman, fresh save, noon, weather pinned calm. Ran it twice: once with an
obstacle-clear check that only looked at the *start* point (hit a bug, see F1), once with the check
extended along the whole planned path (clean run, F2/F3). Stills in `~/.hermes/cache/scratch/tlloop/0036/`
and `tools/playtest/scenarios/`'s two run dirs; contact sheet `~/.hermes/cache/scratch/tlloop/reports/0036.jpg`
(not retained in the repo).

## Findings

1. [G1][high][bug] **Jogging straight into open backcountry can walk you into a building with your legs
   still animating and zero progress, silently, for most of a run.** First attempt picked a spot whose
   *immediate* surroundings were obstacle-free (`obNear(x,z,25)`) but didn't check 60+ m further along the
   line the scenario then jogs. Jogging that line for 90 s: distance climbed to 63.3 m by t≈37 s, then
   **froze at exactly 63.3 m for the rest of the run** (through t=90 s) while `FOOT.sp` kept reporting
   0.47–3.95 (never zero) and the location badge flipped to "STRANDBU" (a building). Stills
   `00_snag_run_start.jpg` / `01_snag_run_stuck.jpg`: the walker is pressed flat against a red building
   wall, legs mid-stride, clearly not a deliberate stop. That's **41%+ of a 90 s jog spent stuck against a
   wall the player never chose to walk at** (it's straight ahead, off-screen at the start). The existing
   wallslide fix (v92: hospital, pier freight shed, fish buyer's shed, drying rack) evidently doesn't cover
   whatever building class Strandbu is, or doesn't apply outdoors on the fell. Rerunning with the obstacle
   check extended 140 m down the path (not just the start point) found a genuinely clear line and ran clean
   (F2/F3 below) — so this isn't universal, but it means **any open stretch with a building further down
   the line can silently eat a player's walk**, not just the already-known town-building cases.
   Suggested fix: extend the v92 wallslide treatment to whatever Strandbu's collision type is (or make it
   general to all `K.house`-class obstacles rather than a named list), and/or give `footBlock` a general
   "slide along the surface normal" fallback instead of a per-building allowlist, so no new building type
   can reintroduce the stuck case.

2. [G1][medium][methodology] **The toast-capture pattern used by this scenario's ancestor (0035's
   `g1_jog_player.mjs`) cannot work and its "0 toasts" result was not evidence of anything.** `toast` is a
   top-level `function toast(msg, kind) {...}` declaration inside tracklayer.js's IIFE (`grep -n "^function
   toast"` → line 5355); `window.toast = yourFn` creates an unrelated global property and never shadows the
   in-game calls, which all resolve the local binding. Confirmed by running the same override in this
   scenario while `FOOT.blown` genuinely flipped true 5 times — the hook logged 0 toasts both times. Fixed
   here with a `MutationObserver` on the real `#toasts` DOM box, which does catch every toast as it's
   appended (see F3). **Builder: if any future scenario reuses the old pattern from `g1_jog_player.mjs`,
   its toast conclusions are unverified — worth a quick patch of that scenario to use the MutationObserver
   approach instead.**

3. [G1][medium][info] **With the MutationObserver fix, the clean 90 s / 112.7 m backcountry jog (depth
   1.02 m, deeper than the standard 0.85 m test depth) got blown 5 times (`t` ≈ 8.9, 27.8, 47.1, 66.4,
   85.6 s) but only toasted ONCE, at t≈14 s.** The gaps between consecutive blow events are 18.9, 19.3,
   19.3, 19.2 s — every one of them lands just *under* the 20 s `F.blownT` toast cooldown (`tracklayer.js`
   line 11067), so the cooldown silently swallows every "Out of breath" toast after the first one for the
   whole rest of the jog. This isn't spam (the backlog worry) — it's the opposite: in a sustained deep-powder
   jog the natural blow-recovery cycle (~19.2 s) sits close enough to the cooldown (20 s) that the warning
   effectively tells you once and then goes quiet even though you keep getting blown every ~19 s after that.
   Whether that's fine (you already know you're winded) or worth a lower cooldown / re-arm when `F.wind`
   dips below some threshold and climbs back to 1 is a judgment call — flagging the number because the
   near-coincidence (19.2 vs 20) looked like it could be coded intentionally but isn't referenced anywhere
   in the jogK/wind comments, so it reads like an unexamined interaction rather than a design choice.

4. [G1][low][info] **Deep powder (1.02 m) jog pace cycles 1.15–1.47 m/s with the blow/recover rhythm**,
   averaging 1.25 m/s over the 112.7 m / 90.1 s run — notably slower than PROGRESS's quoted "powder jog
   1.79 m/s" because that baseline used the standard ~0.85 m test depth; this run's spot happened to be in
   noticeably deeper snow. Not a bug, just a reminder that `wade` (depth-based drag) dominates jog pace more
   than jog's own speed boost once depth climbs past the usual test case — worth sampling a few more depths
   if G1 revisits jog pacing numbers.

5. [info] Harness note: the `obstacle-clear-at-spawn-only` check pattern (checking `obNear` only at the
   chosen (x,z), not along the direction a scenario is about to travel) is an easy trap for any new
   backcountry scenario — worth calling out in the `tracklayer` skill's testing-pitfalls section if the
   builder confirms F1 as a real game bug (not just a scenario-picking miss).

6. [info] Both runs: page errors: none, exit 0.

## Ideas
- Builder: F1 (wall-snag outdoors near Strandbu) looks like the highest-value pick — it's a concrete,
  reproducible "getting stuck" case matching G1's long-standing backlog direction ("Snagging:
  trees/rocks/buildings... getting stuck on corners"), and it's outside the v92 wallslide fix's coverage.
  Reproduce with this report's first (unpatched-check) scenario run, or by placing `FOOT` directly at
  Strandbu's wall.
- F3's cooldown-vs-cycle number is worth a quick look even if no code changes: confirm with the design
  comment at line ~11060 whether 20 s was meant to always catch repeat blows, or whether silence after the
  first warning is intended.
- Fix `g1_jog_player.mjs`'s toast hook (F2) so 0035-style player-route scenarios get real toast data next
  time they're reused.
