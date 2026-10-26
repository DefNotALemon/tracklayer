// G1 playtest follow-up to 0035 idea #1/#2: 0035 played the jog on the depot->door lane and never got
// blown (town lanes are too short/packed). This scenario jogs STRAIGHT OUT into open backcountry powder,
// far from any lane, long enough (120+ m target) to get blown more than once, and logs every toast to see
// whether "out of breath" nags or behaves (one toast per blow, 20 s cooldown per PROGRESS v96 notes).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_jog_backcountry.mjs
import { boot, ev, shot, sideCam, camOff, sleep, down, up, tap, done } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; WX.at = () => 0; GS.storm = 0; true");

// find an open-backcountry starting point AND a 140 m straight run (yaw 0, +z) clear of obstacles the
// whole way — not just at the start — so a snag bug doesn't masquerade as "no toast fired".
const spot = JSON.parse(await ev(`JSON.stringify((() => {
  for (let rr = 300; rr < 1200; rr += 50) for (let a = 0; a < 6.28; a += 0.4) {
    const x = depot.x + Math.cos(a) * rr, z = depot.z + Math.sin(a) * rr;
    if (isSea(x, z) || obNear(x, z, 20)) continue;
    const s = slopeAt(x, z, 10);
    if (s > 0.08) continue;
    let clear = true;
    for (let d = 10; d <= 140; d += 10) { if (isSea(x, z + d) || obNear(x, z + d, 15) || slopeAt(x, z + d, 10) > 0.12) { clear = false; break; } }
    if (clear) return { x: +x.toFixed(1), z: +z.toFixed(1), rr, a: +a.toFixed(2) };
  }
  return null;
})())`));
console.log("backcountry spot", JSON.stringify(spot));
if (!spot) { console.log("FAIL: no flat open backcountry spot found"); await done(1); }

await ev(`P.x = ${spot.x} + 5; P.z = ${spot.z}; P.y = surf(P.x, P.z) + 0.3; true`);
await sleep(1200); await tap("KeyQ"); await sleep(3000);
if (!(await ev("!!FOOT.on"))) { console.log("retry Q"); await tap("KeyQ"); await sleep(2500); }
if (!(await ev("!!FOOT.on"))) { console.log("FAIL: not on foot"); await done(1); }
await ev(`FOOT.x = ${spot.x}; FOOT.z = ${spot.z}; FOOT.yaw = 0; FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; camState.init = false; true`);
await sleep(300);
console.log("depth/fresh at start:", await ev(`(() => { const ix = Math.round((FOOT.x + HALF) / CELL), iz = Math.round((FOOT.z + HALF) / CELL); return depthAt(ix, iz).toFixed(2) + "/" + freshAt(ix, iz).toFixed(2); })()`));

// NOTE: `window.toast = ...` does NOT intercept the game's toasts — `toast` is a top-level `function`
// declaration inside tracklayer.js's IIFE, so every in-game call resolves the local binding, not
// window.toast (confirmed by grep: `function toast(msg, kind) { ... document.getElementById("toasts")... }`,
// never assigned to window). g1_jog_player.mjs (report 0035) used this same broken pattern and got 0
// toasts even though it never actually got blown there, so its "can't confirm or deny" was right but for
// the wrong reason. Here a MutationObserver on the real #toasts DOM box catches every toast as it's
// appended, including repeats of the same text (a text-dedup Set would silently drop repeats).
await ev(`(() => {
  window.__toastLog = [];
  const box = document.getElementById("toasts");
  new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) window.__toastLog.push([+gameClock.toFixed(1), n.textContent]); })
    .observe(box, { childList: true });
  true;
})()`);

const S = () => ev(`JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, sp: +FOOT.sp.toFixed(2), wind: +(FOOT.wind||0).toFixed(2), blown: !!FOOT.blown, tired: +FOOT.tired.toFixed(2)})`);

await sideCam(); await shot("00_start_backcountry"); await camOff();

// Jog a long straight line (fresh powder the whole way, never retracing a trench) for up to 90 game-s or 140 m.
const s0 = JSON.parse(await S());
const samples = []; const blowEvents = [];
let wasBlown = false;
await down("KeyW"); await down("ShiftLeft");
try {
  for (;;) {
    await sleep(150);
    const s = JSON.parse(await S());
    const dt = +(s.t - s0.t).toFixed(1), m = +(Math.hypot(s.x - s0.x, s.z - s0.z)).toFixed(1);
    samples.push([dt, m, s.sp, s.wind, s.blown ? 1 : 0]);
    if (s.blown && !wasBlown) blowEvents.push({ t: dt, m });
    wasBlown = s.blown;
    if (dt > 90 || m > 140) break;
  }
} finally { await up("KeyW"); await up("ShiftLeft"); }
await sideCam(); await shot("01_end_backcountry"); await camOff();

const sEnd = samples[samples.length - 1];
console.log("samples [t, m, sp, wind, blown] every 4th:", JSON.stringify(samples.filter((_, i) => i % 4 === 0)));
console.log("blow events [t, m]:", JSON.stringify(blowEvents));
const toastLog = JSON.parse(await ev("JSON.stringify(window.__toastLog || [])"));
console.log("toast log [t, msg]:", JSON.stringify(toastLog));

// gaps between consecutive toasts (expect >= ~20s cooldown, not back-to-back nagging)
const gaps = [];
for (let i = 1; i < toastLog.length; i++) gaps.push(+(toastLog[i][0] - toastLog[i - 1][0]).toFixed(1));
console.log("toast gaps (s):", JSON.stringify(gaps));

console.log(`SUMMARY total ${sEnd[1]} m in ${sEnd[0]} s, blow events: ${blowEvents.length}, toasts: ${toastLog.length}, min gap: ${gaps.length ? Math.min(...gaps) : "n/a"}`);
await done();
