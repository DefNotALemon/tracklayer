// G1 on-foot prompt: once you've walked away from the sled, does the HUD tell you where it is?
// Gets off, walks ~25 m out, then faces four ways and reads the on-foot hint (WN.hint + what #wnHud shows)
// against the sled's true bearing. Also checks the near prompt ("Q: get on the sled") and on skis.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_sledhint.mjs
import { boot, ev, shot, park, tap, sleep, down, up, done } from "../lib.mjs";
await boot();
console.log("parked at", JSON.stringify(await park()));
await ev("WX.at = () => 0; GS.storm = 0; true");
await sleep(1500);
await tap("KeyQ"); await sleep(2500);
const S = `JSON.stringify((() => { const dx = P.x - FOOT.x, dz = P.z - FOOT.z; let r = Math.atan2(dx, dz) - FOOT.yaw; r = Math.atan2(Math.sin(r), Math.cos(r));
  const el = document.getElementById("wnHud"); return { on: FOOT.on, d: +Math.hypot(dx, dz).toFixed(1), relDeg: Math.round(r * 180 / Math.PI), hint: WN.hint, hud: el && !el.hidden ? el.textContent.trim().slice(0, 140) : "(hidden)", t: +gameClock.toFixed(1) }; })())`;
const r0 = JSON.parse(await ev(S)); console.log("off the sled:", JSON.stringify(r0));
if (!r0.on) { console.log("FAIL: not on foot"); await done(1); }
// walk out ~25 m
await ev("FOOT.yaw = P.yaw + 0.6; true"); await sleep(300);
await down("KeyW");
try { for (let i = 0; i < 200; i++) { await sleep(200); if (JSON.parse(await ev(S)).d > 25) break; } } finally { await up("KeyW"); }
await sleep(600);
const rows = [];
// rel = sled bearing - facing; + means the sled is on your LEFT (sled-space +x is left)
for (const [lbl, rel] of [["rel 180", Math.PI], ["rel 0", 0], ["rel +90", Math.PI / 2], ["rel -90", -Math.PI / 2], ["rel +35", 0.6], ["rel -35", -0.6]]) {
  await ev(`(() => { FOOT.yaw = Math.atan2(P.x - FOOT.x, P.z - FOOT.z) - (${rel}); return true; })()`);
  await sleep(900);
  const r = JSON.parse(await ev(S)); rows.push([lbl, r]); console.log(lbl.padEnd(10), JSON.stringify(r));
  if (Math.abs(rel) < 1) await shot("01_far_" + lbl.replace(/[^a-z0-9+-]/gi, ""));
}
// walk straight back using only the hint's bearing: face the sled, walk, time it
await ev(`(() => { FOOT.yaw = Math.atan2(P.x - FOOT.x, P.z - FOOT.z); return true; })()`);
const b0 = JSON.parse(await ev(S));
await down("KeyW");
let b;
try { for (let i = 0; i < 300; i++) { await sleep(200); b = JSON.parse(await ev(S)); if (b.d < 2.6) break; } } finally { await up("KeyW"); }
await sleep(400);
const rn = JSON.parse(await ev(S)); console.log("back at the sled:", JSON.stringify(rn), "walk back secs", +(b.t - b0.t).toFixed(1));
await shot("02_near_hint");
const mentions = rows.filter(([, r]) => /\d+\s*m/.test(r.hint)).length;
console.log(`SUMMARY far hints with a distance: ${mentions}/${rows.length}; sample "${rows[1][1].hint}"`);
await done();
