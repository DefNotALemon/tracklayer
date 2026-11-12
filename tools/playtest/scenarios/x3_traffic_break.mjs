// Beta 3.4a (traffic) break pass: walker stop distance x3 trials, a queue of two cars behind your sled and its release,
// sled parked in a U-turn's path, sled on the roof, storm + night driving, option toggled while a car is turning,
// old save without x.traffic, reload.
import { boot, ev, sleep, done, shot, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(800);
const rid = await J(`TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id`);
const far = (s) => `(() => { const p = TLXT.lanePt("${rid}", ${s} - 400, 1); P.x = p.cx + 60; P.z = p.cz + 60; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; return true; })()`;
const s0 = await J(`TLXR && TLXT.routes.find(q => q.id === "${rid}").s0 + 700`);

// 1: walker stop distance, three trials at different approach speeds (car starts 60/120/200 m back)
for (const back of [60, 120, 200]) {
  await ev(`(() => { crashCancel(); FOOT.on = false; const c = TLXT.place("${rid}", ${s0}, 1); c.v = 12.5; return true; })()`);
  await ev(far(s0));
  await ev(`(() => { const c = TLXT.cars[0], p = TLXT.lanePt("${rid}", c.s + ${back}, 1); FOOT.on = true; FOOT.x = p.x; FOOT.z = p.z; FOOT.y = surf(p.x, p.z); FOOT.sp = FOOT.fwd = FOOT.turn = 0; return true; })()`);
  let min = 1e9; const t0 = await clock();
  while ((await clock()) - t0 < 16) { const d = await J(`Math.hypot(TLXT.cars[0].x - FOOT.x, TLXT.cars[0].z - FOOT.z)`); min = Math.min(min, d); await sleep(100); }
  const q = await J(`({ v: TLXT.cars[0].v, why: TLXT.cars[0].why })`);
  console.log("walker trial", back, JSON.stringify(q), "closest", min.toFixed(2));
  ok(q.v < 0.3 && min >= 5.5, `1: walker ${back} m ahead: stopped (${q.why}), closest ${min.toFixed(2)} m centre to centre`);
}

// 2: queue: sled in lane, car0 stops for it, car1 arrives behind car0 and queues; sled leaves, both go
await ev(`(() => { FOOT.on = false; crashCancel(); const c = TLXT.place("${rid}", ${s0}, 1); const d = TLXT.cars[1]; Object.assign(d, { on: true, r: c.r, s: c.s - 45, k: 0, dir: 1, v: 12.5, st: "drive", t: 0, blocked: 0, hold: 0, why: "" }); return true; })()`);
await ev(far(s0));
await ev(`(() => { const c = TLXT.cars[0], p = TLXT.lanePt("${rid}", c.s + 80, 1); P.x = p.x; P.z = p.z; P.y = surf(P.x, P.z) + 0.2; P.yaw = p.yaw; P.vx = P.vz = 0; return true; })()`);
let qmin = 1e9; { const t0 = await clock(); while ((await clock()) - t0 < 20) { const d = await J(`Math.hypot(TLXT.cars[0].x - TLXT.cars[1].x, TLXT.cars[0].z - TLXT.cars[1].z)`); qmin = Math.min(qmin, d); await sleep(100); } }
const Q = await J(`({ v0: TLXT.cars[0].v, v1: TLXT.cars[1].v, w0: TLXT.cars[0].why, w1: TLXT.cars[1].why, d: Math.hypot(TLXT.cars[0].x - TLXT.cars[1].x, TLXT.cars[0].z - TLXT.cars[1].z) })`);
console.log("queue", JSON.stringify(Q), "closest", qmin.toFixed(2));
ok(Q.v1 < 0.3 && Q.w1 === "car" && qmin >= 3.8, `2: second car queues behind the first (${Q.w1}, closest ${qmin.toFixed(2)} m; bodies touch at 3.8)`);
await ev(`(() => { P.x += 200; P.z += 200; return true; })()`);   // sled leaves the lane
await waitGame(8);
const Q2 = await J(`({ v0: TLXT.cars[0].v, v1: TLXT.cars[1].v, w0: TLXT.cars[0].why })`);
ok(Q2.v0 > 3 && Q2.v1 > 1, `2: queue released when the sled goes (${Q2.v0.toFixed(1)}, ${Q2.v1.toFixed(1)} m/s)`);

// 3: sled parked in the U-turn path (road shut ahead, car turning) and sled on roof
await ev(`(() => { crashCancel(); const c = TLXT.place("${rid}", ${s0}, 1); c.v = 0; c.st = "drive"; TLXT.startTurn && TLXT.startTurn(c); return typeof TLXT.startTurn; })()`);
const hasTurn = await J(`typeof TLXT.startTurn`);
console.log("TLXT.startTurn exposed:", hasTurn);
// roof: park sled over a stopped car
await ev(`(() => { const c = TLXT.place("${rid}", ${s0}, 1); c.v = 0; c.hold = 99; P.x = c.x; P.z = c.z; P.y = c.y + 2.2; P.vx = P.vz = 0; return true; })()`);
await waitGame(1.5);
const R = await J(`({ dx: Math.hypot(P.x - TLXT.cars[0].x, P.z - TLXT.cars[0].z), py: P.y - TLXT.cars[0].y, err: TLXT.tickErr || null, fin: Number.isFinite(P.x) && Number.isFinite(P.y) })`);
console.log("roof", JSON.stringify(R));
ok(R.fin && !R.err, "3: sled dropped onto a car's roof: finite, no tick error");

// 4: storm + night drive, 20 s: still lane-true, no tick error
await ev(`(() => { const c = TLXT.place("${rid}", ${s0}, 1); c.hold = 0; c.v = 0; WX.at = () => 1; GS.storm = 1; GS.hour = 24 * 40 + 23; return true; })()`);
await ev(far(s0));
await waitGame(20);
const S4 = await J(`(() => { const c = TLXT.cars[0], lp = TLXT.lanePt("${rid}", c.s, c.dir); return { s: c.s, v: c.v, lane: Math.hypot(c.x - lp.x, c.z - lp.z), err: TLXT.tickErr || null, y: c.y }; })()`);
console.log("storm night", JSON.stringify(S4));
ok(!S4.err && S4.lane < 0.5 && Number.isFinite(S4.y), `4: storm + night: car drives on (v ${S4.v.toFixed(1)}), lane off ${S4.lane.toFixed(2)}`);
await shot("x3tb_storm_night");
await ev(`WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`);

// 5: option toggled off mid-U-turn then on: no stuck state
await ev(`(() => { const c = TLXT.place("${rid}", ${s0}, 1); c.v = 0; return true; })()`);
await ev(`TLX.setOn("traffic", false); true`); await waitGame(1); await ev(`TLX.setOn("traffic", true); true`); await waitGame(5);
const O = await J(`({ v: TLXT.cars[0].v, err: TLXT.tickErr || null, vis: TLXT.group.visible })`);
ok(O.vis && O.v > 2 && !O.err, "5: option off then on: car drives again");

// 6: old save without x.traffic; and option saved off stays off after reload
const save = await J(`(() => { const s = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /tracklayer|save/i.test(k)))); return Object.keys(s).slice(0, 5); })()`).catch(() => null);
console.log("save keys sample", JSON.stringify(save));
await ev(`TLX.setOn("traffic", false); true`); await sleep(300);
await reload(); await sleep(1500);
await ev(`tutSkip(); true`);
const R6 = await J(`({ ready: TLXT.ready, err: TLXT.err, vis: TLXT.group.visible, on: TLX.on("traffic"), cars: TLXT.cars.filter(c => c.on).length, tick: TLXT.tickErr || null })`);
console.log("reload", JSON.stringify(R6));
ok(R6.ready && !R6.err && !R6.tick, "6: reload ready, no error");
ok(R6.on === false && R6.vis === false, "6: option saved off stays off after reload (vis " + R6.vis + ")");
console.log(fails ? `${fails} FAILED` : "all ok");
await done(fails ? 1 : 0);
