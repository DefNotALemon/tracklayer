// Beta break-it for 3.5c2b (you in the convoy's line). Not asserting-exit: prints findings, exit 0 unless page errors.
//  1. facing the wrong way behind the car: never falls in      2. walker (FOOT.on) on the road: not in the line
//  3. in the line, crash: leaves after the grace, flag/no error  4. in the line, "traffic" switched off: cleared, no error
//  5. in the line with a flag, reload: no stale pin/legend      6. in the line, switch convoy option off/on: state sane
import { boot, ev, sleep, done, reload } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(120); } return false; }
const R = (k, v) => console.log("RESULT " + k + ": " + JSON.stringify(v));
await boot();
await ev(`GS.hour = 34; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLXT.hold = true; for (const c of TLXT.cars) c.on = false; true`); await sleep(1000);
const RID = "lebesby";
const info = () => J(`TLXCV.info("${RID}")`);
const car = i => J(`(() => { const c = TLXT.cars[${i}]; return { on: c.on, s: c.s, v: c.v, gq: !!c.gq }; })()`);
await ev(`(() => { window.__pup = null; window.__pupI = setInterval(() => { const u = window.__pup; if (!u) return; try {
  const c = TLXT.cars[u.of], s = c.s - u.dir * u.gap, p = TLXT.lanePt("${RID}", s, u.dir), a = p.yaw + Math.PI / 2, lat = u.lat || 0, yaw = u.back ? p.yaw + Math.PI : p.yaw;
  P.x = p.x + Math.sin(a) * lat; P.z = p.z + Math.cos(a) * lat; P.y = surf(P.x, P.z) + 0.3; P.yaw = yaw; P.vx = Math.sin(yaw) * c.v; P.vz = Math.cos(yaw) * c.v;
  if (!u.free) { if (CRASH.on) crashCancel(); FOOT.on = !!u.foot; }
} catch (e) { window.__pupErr = String(e); } }, 16); return true; })()`);
const pup = async o => { await ev(`(() => { window.__pup = ${JSON.stringify(o)}; return true; })()`); await sleep(150); await ev(`recenter(P.x, P.z, true); true`); };
const q0 = await info(); const GA = q0.gates[0].s, GB = q0.gates[1].s;
const GI = Math.ceil((GA + 20) / 400);
async function convoy() {          // put the line on the road and start it, car 0 leading
  await ev(`(() => { for (const c of TLXT.cars) c.on = false; window.__pup = null; TLXR.setSnow("${RID}", 1, ${GI}); TLXR.setSnow("${RID}", 0.2, 0); return true; })()`);
  await waitGame(1);
  await ev(`(() => { TLXT.put(TLXT.cars[0], "${RID}", ${GA} - 110, 1); return true; })()`);
  await waitGame(60, async () => (await car(0)).gq);
  await ev(`GS.hour += 0.8; true`); await waitGame(1.2);
  const q = await info(); await ev(`GS.hour = ${q.at} - 0.003; true`);
  await waitGame(6, async () => (await info()).st === "run");
}
await convoy();
await waitGame(60, async () => (await car(0)).s > GA + 60);
await pup({ of: 0, gap: 30, dir: 1 });
await waitGame(8, async () => (await info()).you.in);
R("a in line", (await info()).you.in);
await pup({ of: 0, gap: 30, dir: 1, lat: 14 });
await waitGame(8, async () => !!(await info()).you.flag);
let q = await info(); R("b flag set (car s-GA=" + ((await car(0)).s - GA).toFixed(0) + ")", { you: q.you, flag: !!q.you.flag, st: q.st, pins: await J(`TABLET.layerPts("marks").length`) });
// pad: the hint line text while in the line
await pup({ of: 0, gap: 30, dir: 1 }); await waitGame(8, async () => (await info()).you.in);
R("c hint (keyboard)", await J(`(document.querySelector("#rideHint")||document.querySelector("#hint")||{}).textContent || null`));
await ev(`window.__pup = null; true`);
const before = (await info()).you && (await info()).you.flag;
await reload();
await ev(`for (const c of TLXT.cars) c.on = false; true`); await sleep(2000);
q = await info();
R("d after reload", { st: q.st, you: q.you, legend: /left the convoy/.test(await J(`TLXR.legend()`)), pins: await J(`TABLET.layerPts("marks").length`), err: await J(`({e:TLXCV.err||null,t:TLXT.tickErr||null})`) });
await waitGame(6);
R("e 6s later", { st: (await info()).st, you: (await info()).you });
await done(0);
