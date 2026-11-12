// Beta probe for 2.3: the pickup, seated at a standstill, W held 5 s at several flat open spots 600+ m from the garage
// (a player driving out of town into the backcountry). Logs distance moved, snow depth under it, bog flag and any toast.
import { boot, ev, tap, sleep, done, down, up, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 9000; true`);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ");
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "seated");
const spots = JSON.parse(await ev(`JSON.stringify((() => { const o = [], x0 = P.x, z0 = P.z; for (let r = 600; r < 2500 && o.length < 6; r += 130) for (let k = 0; k < 40; k++) { const x = x0 + Math.sin(k * 0.157 + r) * r, z = z0 + Math.cos(k * 0.157 + r) * r; if (!isSea(x, z) && !isWater(x, z) && !obNear(x, z, 40) && slopeAt(x, z, 8) < 0.05) { o.push([x, z]); break; } } return o; })())`));
console.log("spots", spots.length);
for (const [x, z] of spots) {
  await ev(`(() => { BOG.on = false; P.x = ${x}; P.z = ${z}; P.vx = P.vz = 0; P.y = surf(${x}, ${z}) + 0.3; recenter(${x}, ${z}, true); return 1; })()`);
  await waitGame(1.5);
  const d = await ev(`JSON.stringify({ d: depthAt ? 0 : 0, surfMinusGround: surf(P.x, P.z) - groundH(P.x, P.z), slope: slopeAt(P.x, P.z, 8) })`).catch(() => "{}");
  await ev(`window.__t0 = [P.x, P.z]; true`);
  await down("KeyW"); await waitGame(5); await up("KeyW");
  const r = JSON.parse(await ev(`JSON.stringify({ mv: Math.hypot(P.x - __t0[0], P.z - __t0[1]), bog: BOG.on, v: Math.hypot(P.vx, P.vz), hint: $("wnHint").textContent, toast: Array.from(document.querySelectorAll("#toasts *")).map(e => e.textContent).join(" | ") })`));
  console.log(`spot ${x.toFixed(0)},${z.toFixed(0)} ${d}: moved ${r.mv.toFixed(1)} m, bog ${r.bog}, v ${r.v.toFixed(1)}, hint "${r.hint}", toast "${r.toast}"`);
  ok(r.mv > 8 || (r.bog && r.toast.length > 0), `spot ${x.toFixed(0)}: it drove or said why`);
}
console.log("page errors:", errors.length ? errors.join(" | ") : "none");
await done(fails ? 1 : 0);
