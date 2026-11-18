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
// 1: wrong way round
await pup({ of: 0, gap: 30, dir: 1, back: true });
await waitGame(6);
R("1 wrong-way in line", (await info()).you.in);
// 2: on foot
await pup({ of: 0, gap: 30, dir: 1, foot: true });
await waitGame(6);
R("2 walker in line", (await info()).you.in);
// 3: proper, then crash
await pup({ of: 0, gap: 30, dir: 1 });
await waitGame(8, async () => (await info()).you.in);
R("3a in line", (await info()).you.in);
await ev(`(() => { window.__pup.free = true; crashEject("test", 0, 1, 12, null); return true; })()`);
await waitGame(6);
let q = await info(); R("3b after crash 6s", { in: q.you.in, flag: !!q.you.flag, ok: q.you.ok, crash: await J(`CRASH.on`), d: q.you.d });
// 4: back in line, traffic off
await ev(`crashCancel(); true`); await pup({ of: 0, gap: 30, dir: 1 });
await waitGame(8, async () => (await info()).you.in);
R("4a in line again", (await info()).you.in);
await pup({ of: 0, gap: 30, dir: 1, lat: 14 });
await waitGame(6, async () => !!(await info()).you.flag);
R("4b flag set", !!(await info()).you.flag);
await ev(`TLX.setOn("traffic", false); true`); await waitGame(2);
q = await info(); R("4c traffic off", { in: q.you && q.you.in, flag: q.you && !!q.you.flag, st: q.st, legend: /left the convoy/.test(await J(`TLXR.legend()`)), pins: await J(`TABLET.layerPts("marks").length`) });
await ev(`TLX.setOn("traffic", true); true`); await waitGame(3);
q = await info(); R("4d traffic back on", { in: q.you.in, flag: !!q.you.flag, st: q.st, car0: await car(0), err: await J(`({ e: TLXCV.err, t: TLXT.tickErr || null })`) });
// 5: flag then reload
await convoy().catch(() => 0);
await pup({ of: 0, gap: 30, dir: 1, lat: 14 }).catch(() => 0);
await waitGame(6, async () => !!(await info()).you.flag);
const fl = !!(await info()).you.flag;
await ev(`window.__pup = null; true`);
await reload();
await ev(`for (const c of TLXT.cars) c.on = false; true`); await sleep(1500);
q = await info();
R("5 reload with flag (flag before: " + fl + ")", { flag: q.you && !!q.you.flag, in: q.you && q.you.in, st: q.st, legend: /left the convoy/.test(await J(`TLXR.legend()`)), pins: await J(`TABLET.layerPts("marks").length`), err: await J(`TLXCV.err || null`) });
await done(0);
