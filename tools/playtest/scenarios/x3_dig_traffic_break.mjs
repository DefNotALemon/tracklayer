// Beta 3.3b x 3.4a: dig a buried car 7 m off a road while traffic drives past (day, night, storm); a car held in the lane
// next to it; reload mid-dig (progress saved? dig stopped?); traffic option off mid-dig. Keyboard.
import { boot, ev, tap, sleep, done, shot, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(50); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; TLXC.cars.forEach(c => { c.wait = 999; }); true`); await sleep(800);
await tap("KeyQ"); for (let i = 0; i < 40 && !(await ev("FOOT.on && !DMT.on")); i++) await sleep(200);
const CI = +(process.env.CAR || 10), RID = process.env.RID || "lebesby";
const S = () => J(`({ dig: !!FOOT.dig, cd: TLXC.dig, use: footUse(), b: TLXC.cars[${CI}].b, cash: GS.cash, hits: TLXT.hits, passes: TLXT.passes, terr: TLXT.tickErr || null, cerr: TLXC.tickErr || null, foot: FOOT.on })`);
const stand = () => ev(`(() => { const c = TLXC.cars[${CI}]; FOOT.x = c.x + Math.cos(c.yaw) * 2.4; FOOT.z = c.z - Math.sin(c.yaw) * 2.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = FOOT.fwd = FOOT.turn = 0; FOOT.dig = false; BOG.on = false; return true; })()`);
const geo = await J(`(() => { const c = TLXC.cars[${CI}], q = TLXR.near(c.x, c.z); return { d: q.d, s: q.s, x: c.x, z: c.z, route: q.route && q.route.id }; })()`);
{ const r = await J(`(() => { const rt = TLXT.routes.find(q => q.id === "${RID}"); let b = { d: 1e9, s: 0 }; for (let s = rt.s0; s < rt.s1; s += 2) { const p = TLXT.lanePt("${RID}", s, 1); const d = Math.hypot(p.cx - ${geo.x}, p.cz - ${geo.z}); if (d < b.d) b = { d, s }; } return b; })()`); geo.s = r.s; geo.dc = r.d; }
console.log("geo", JSON.stringify(geo)); ok(geo.route === RID, "setup: car " + CI + " is by " + RID);
// traffic car drives past in the lane while we dig. dir: which way is "toward" the village end? try both
async function pass(label, dir, startS) {
  await ev(`(() => { const c = TLXT.place("${RID}", ${startS}, ${dir}, 0); c.v = 8; return true; })()`);
  let minW = 1e9, minP = 1e9, st = null, n = 0;
  const t0 = await clock();
  while ((await clock()) - t0 < 22) {
    const r = await J(`(() => { const c = TLXT.cars[0]; return { on: c.on, s: c.s, v: c.v, st: c.st, why: c.why, dw: Math.hypot(c.x - FOOT.x, c.z - FOOT.z), dp: Math.hypot(c.x - ${geo.x}, c.z - ${geo.z}) }; })()`);
    minW = Math.min(minW, r.dw); minP = Math.min(minP, r.dp); st = r; n++; await sleep(150);
    if (Math.abs(r.s - startS) > 120 || !r.on) break;
  }
  const s = await S(); console.log(label, "minDistWalker", minW.toFixed(1), "minDistParked", minP.toFixed(1), "last", JSON.stringify(st), JSON.stringify(s));
  return { minW, minP, s, st };
}
await stand(); await ev(`TLXC.setSnow(${CI}, 0.9); true`); await sleep(500);
await sleep(1500); let s = await S(); console.log("pre", JSON.stringify(s), "fish", await ev("String(FISH.ctxLabel && FISH.ctxLabel())"), await ev("JSON.stringify({fx:FOOT.x,fz:FOOT.z,on:FOOT.on,near:!!TLXC.digNear(),veh:!!(window.VEH&&VEH.cur),bog:BOG.on})")); ok(s.use === "DIG", "1: DIG offered by the road (" + s.use + ")");
await tap("KeyE"); await sleep(500); s = await S(); ok(s.dig, "1: digging");
const b0 = s.b;
// try both directions from 60 m up the road
for (const dir of [1, -1]) {
  const startS = dir > 0 ? Math.max(geo.s - 70, 30) : geo.s + 80;
  const r = await pass("dir " + dir, dir, startS);
  ok(r.minW > 2.5, `2: dir ${dir}: car never within 2.5 m of the digger (min ${r.minW.toFixed(1)})`);
  ok(r.minP > 1.9, `2: dir ${dir}: car never through the parked car (min ${r.minP.toFixed(1)})`);
  ok(r.s.dig || r.s.b === 0, `2: dir ${dir}: dig continues / finished (b ${b0} -> ${r.s.b.toFixed(2)})`);
  ok(!r.s.terr && !r.s.cerr, `2: dir ${dir}: no tick errors`);
  if (!r.s.dig && r.s.b > 0) { await stand(); await tap("KeyE"); await sleep(400); }
}
await shot("x3dt_dig_beside_road");
// night
await ev(`GS.hour = 44; true`); await stand(); await ev(`TLXC.setSnow(${CI}, 0.9); TLXC.cars[${CI}].paid = false; true`); await sleep(500);
if (!(await S()).dig) { await tap("KeyE"); await sleep(400); }
ok((await S()).dig, "3: night: digging");
const rn = await pass("night dir 1", 1, Math.max(geo.s - 70, 30));
ok(rn.minW > 2.5 && rn.minP > 1.9, "3: night pass clear");
await shot("x3dt_night");
// mid-dig reload
await ev(`GS.hour = 34; true`); await stand(); await ev(`TLXC.setSnow(${CI}, 0.8); TLXC.cars[${CI}].paid = false; true`); await sleep(400);
if (!(await S()).dig) { await tap("KeyE"); await sleep(400); }
await waitGame(5); s = await S(); ok(s.dig, "4: digging before reload"); const bBefore = s.b; console.log("b before reload", bBefore);
await ev("save(); true");
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
await reload(sv); await sleep(1500);
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; true`); await sleep(500);
s = await J(`({ dig: !!FOOT.dig, cd: TLXC.dig, b: TLXC.cars[${CI}].b, ready: TLXC.ready, terr: TLXT.tickErr || null, cerr: TLXC.tickErr || null })`);
console.log("after reload", JSON.stringify(s));
ok(s.ready && !s.terr && !s.cerr, "4: reload ok, no tick errors");
ok(!s.dig && s.cd === -1, "4: no phantom dig after reload");
ok(Math.abs(s.b - bBefore) < 0.12, `4: snow left kept across reload (${bBefore.toFixed(3)} -> ${s.b.toFixed(3)})`);
// traffic option off mid-dig
await ev(`FOOT.on = true; true`); await stand(); await ev(`TLXC.setSnow(${CI}, 0.8); true`); await sleep(400);
await tap("KeyE"); await sleep(400); ok((await S()).dig, "5: digging again");
await ev(`TLX.on = (f => id => id === "traffic" ? false : f(id))(TLX.on); true`); await waitGame(3); s = await S();
ok(s.dig && !s.terr && !s.cerr, "5: traffic option off mid-dig: dig unaffected, no errors");
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
