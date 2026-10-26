// G3 baseline contact sheet: a fixed set of views to score the look of the game and track visual passes
// over time. Title screen, quay by day, quay by night, open backcountry, a sled close-up, rider on foot.
// Run: tools/playtest/run.sh tools/playtest/scenarios/views.mjs
import { boot, ev, raw, shot, sideCam, camOff, sleep, tap, down, up, done } from "../lib.mjs";

// Note: boot() always drives past the title into a fresh ride (titleLaunch), so there is no title-only
// shot here; the quay-at-spawn view below is the first thing a new player actually sees.
await boot();

// Quay by day: teleport near the quay/town (use GS/P defaults near spawn, which is the quay area).
await ev("GS.hour = 12; camState.init = false; true");
await sleep(800);
await shot("01_quay_day");

// Quay by night
await ev("GS.hour = 23; camState.init = false; true");
await sleep(800);
await shot("02_quay_night");

// Open backcountry: move far from town to open snow
await ev(`(() => {
  for (let r = 300; r < 3000; r += 50) for (let a = 0; a < 6.28; a += 0.4) {
    const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
    if (isSea(x, z) || obNear(x, z, 60)) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.5; recenter(x, z, true);
    return true;
  }
  return false;
})()`);
await ev("GS.hour = 12; camState.init = false; true");
await sleep(800);
await shot("03_backcountry_day");

// Sled close-up: custom camera close on the machine
await sideCam("[P.x, P.y + 0.4, P.z]", 3.2, 1.9, 0.9);
await shot("04_sled_closeup");
await camOff();

// Rider on foot: dismount and frame from the side
await tap("KeyQ"); await sleep(2500);
await sideCam(); // default foot-centric camera
await shot("05_rider_on_foot");
await camOff();

console.log("views captured");
await done();
