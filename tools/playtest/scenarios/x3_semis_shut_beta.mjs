// Beta 3.5a (semis): each lorry type meets a snowed-in stretch: stops short of the drift, waits (never U-turns), trailer stays finite,
// goes again when the stretch opens; then a 1.5 h clock step while it waits and reload with the stretch shut.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(100); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);
const SI = await J(`TLXT.cars.findIndex(c => c.semi)`);
ok(SI >= 0, "semi present (index " + SI + ")");
const rid = await J(`TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id`);
const s0 = await J(`TLXT.routes.find(q => q.id === "${rid}").s0 + 500`);
const info = `TLXT.semiInfo(${SI})`;
const away = `(() => { crashCancel(); FOOT.on = false; const p = TLXT.lanePt("${rid}", ${s0} - 500, 1); P.x = p.cx + 90; P.z = p.cz + 90; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`;
for (const ty of ["dist", "haul", "tank"]) {
  await ev(away); await ev(`TLXR.setSnow(null, 0); true`);
  await ev(`(() => { TLXT.cars.forEach((c, i) => { if (i !== ${SI}) c.on = false; }); const c = TLXT.place("${rid}", ${s0}, 1, ${SI}, "${ty}"); c.v = 9; return true; })()`);
  const D0 = await J(`(() => { const c = TLXT.cars[${SI}], seg = TLXR.ROADS.seg, gs = c.r.rt.seg; let gi = -1;
    for (const g of gs) { if (!g.legs.length) continue; if (c.dir > 0 ? g.a > c.s + 120 : g.a + seg < c.s - 120) { if (gi < 0 || (c.dir > 0 ? g.a < gs[gi].a : g.a > gs[gi].a)) gi = g.i; } }
    if (gi >= 0) TLXR.setSnow("${rid}", 1, gi); return { gi, dir: c.dir, s: c.s, edge: gi < 0 ? null : (c.dir > 0 ? gs[gi].a : gs[gi].a + seg), shut: gi >= 0 && gs[gi].shut }; })()`);
  ok(D0.gi >= 0 && D0.shut, ty + ": stretch " + D0.gi + " shut ahead");
  let stop = null, uturn = false, nan = false, maxArt = 0, pastEdge = false;
  await waitGame(60, async () => {
    await ev(`TLXR.setSnow("${rid}", 1, ${D0.gi}); true`);   // the council plow reopens an unheld stretch in ~45 game s (probe x3_semis_shut_probe)
    const q = await J(`(() => { const c = TLXT.cars[${SI}], s = ${info}; return { s: c.s, v: c.v, why: c.why, st: c.st, w: !!c.waiting, art: s.art, tx: s.ax, ty: s.az, dir: c.dir }; })()`);
    if (!Number.isFinite(q.art) || !Number.isFinite(q.tx)) nan = true; else maxArt = Math.max(maxArt, Math.abs(q.art));
    if (q.st === "turn" || q.dir !== D0.dir) uturn = true;
    if (D0.dir > 0 ? q.s > D0.edge : q.s < D0.edge) pastEdge = true;
    if (!stop && q.v < 0.2 && q.why === "shut") stop = q;
    return false; });
  const short = stop ? Math.abs(D0.edge - stop.s) : -1;
  const F = await J(`(() => { const c = TLXT.cars[${SI}]; return { v: c.v, w: !!c.waiting, on: c.on, s: c.s }; })()`);
  console.log(ty, JSON.stringify({ stop, short, uturn, maxArt: +maxArt.toFixed(2), F }));
  ok(!!stop && short >= 12 && short <= 32, ty + `: stopped ${short.toFixed(1)} m short of the drift`);
  ok(!pastEdge, ty + ": never entered the drifted stretch");
  ok(!uturn, ty + ": waits, does not U-turn on the road");
  ok(!nan && maxArt < 1.6, ty + `: trailer finite, articulation max ${maxArt.toFixed(2)} rad`);
  // opens
  await ev(`TLXR.setSnow(null, 0); true`);
  const s1 = F.s; let went = false;
  await waitGame(40, async () => { const v = await J(`TLXT.cars[${SI}].v`); if (v > 3) { went = true; return true; } return false; });
  ok(went, ty + ": drives on once the road is open again");
}
// clock step while one waits, then reload with the stretch shut
await ev(away); await ev(`(() => { TLXT.cars.forEach((c, i) => { if (i !== ${SI}) c.on = false; }); const c = TLXT.place("${rid}", ${s0}, 1, ${SI}, "haul"); c.v = 9; const seg = TLXR.ROADS.seg, gs = c.r.rt.seg; for (const g of gs) { if (g.legs.length && g.a > c.s + 120) { TLXR.setSnow("${rid}", 1, g.i); break; } } return true; })()`);
await waitGame(30);
for (let k = 0; k < 3; k++) { await ev(`GS.hour += 1.5; true`); await sleep(500); }
const E = await J(`(() => { const s = ${info}; return { fin: Number.isFinite(s.x) && Number.isFinite(s.ax) && Number.isFinite(s.art), v: s.v, why: s.why, err: TLXT.err }; })()`);
console.log("after 4.5h", JSON.stringify(E));
ok(E.fin && !E.err, "clock step with a lorry waiting: finite, no tick error");
await shot("semi_shut_after_skip");
await reload();
await sleep(1500);
const R = await J(`({ semis: TLXT.cars.filter(c => c.semi).length, err: TLXT.err, ok: TLXT.cars.filter(c => c.semi).every(c => !c.on || (Number.isFinite(c.x) && Number.isFinite(c.ax))) })`);
console.log("reload", JSON.stringify(R));
ok(R.semis >= 1 && !R.err && R.ok, "reload: semis back and finite");
await done(fails ? 1 : 0);
