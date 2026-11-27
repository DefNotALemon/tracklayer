// Beta 3.5a semis (v302): a walker standing in a tanker's lane (sampled every 0.5 s of game clock), then option "traffic"
// switched off/on with TLX.setOn while a semi drives, then reload.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(100); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);
const SI = await J(`TLXT.cars.findIndex(c => c.semi)`);
const rid = await J(`TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id`);
const s0 = await J(`TLXT.routes.find(q => q.id === "${rid}").s0 + 700`);
const away = `(() => { crashCancel(); FOOT.on = false; const p = TLXT.lanePt("${rid}", ${s0} - 400, 1); P.x = p.cx + 90; P.z = p.cz + 90; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`;
const start = ty => `(() => { TLXT.cars.forEach((c, i) => { if (i !== ${SI}) c.on = false; }); const c = TLXT.place("${rid}", ${s0}, 1, ${SI}, "${ty}"); c.v = 9; return true; })()`;
for (const ty of ["tank", "haul"]) {
  await ev(away); await ev(start(ty));
  await ev(`(() => { const c = TLXT.cars[${SI}], p = TLXT.lanePt("${rid}", c.s + 110, 1); FOOT.on = true; FOOT.x = p.x; FOOT.z = p.z; FOOT.y = surf(p.x, p.z); FOOT.sp = FOOT.fwd = FOOT.turn = 0; window.__w0 = [p.x, p.z]; return true; })()`);
  const rows = []; let m = 1e9, hits0 = await J(`TLXT.hits`);
  await waitGame(25, async () => { rows.push(await J(`(() => { const c = TLXT.cars[${SI}], s = TLXT.semiInfo(${SI}); let m = 1e9; for (const k of s.circ) m = Math.min(m, Math.hypot(FOOT.x - k[0], FOOT.z - k[1]) - k[2]); return { v: +c.v.toFixed(2), why: c.why, lane: c.lane, pass: c.pass, m: +m.toFixed(2), moved: +Math.hypot(FOOT.x - window.__w0[0], FOOT.z - window.__w0[1]).toFixed(2) }; })()`)); m = Math.min(m, rows.at(-1).m); await sleep(400); return false; });
  console.log(ty, "samples:", rows.filter((_, i) => i % 6 === 0).map(r => JSON.stringify(r)).join("\n  "));
  const hits = (await J(`TLXT.hits`)) - hits0;
  const stopped = rows.some(r => r.v < 0.5), passed = rows.some(r => r.pass), pushed = Math.max(...rows.map(r => r.moved));
  ok(m > 1.0, `${ty}: closest body-to-walker ${m.toFixed(2)} m (bumps ${hits}, walker pushed ${pushed} m)`);
  ok(stopped || passed, `${ty}: it stopped (${stopped}) or pulled out round (${passed}) for a walker in its lane`);
}
// option off / on mid-drive
await ev(away); await ev(start("haul")); await ev(`FOOT.on = false; true`);
await ev(`TLX.setOn("traffic", false); true`); await waitGame(2);
let E = await J(`({ on: TLX.on("traffic"), vis: TLXT.cars.filter(c => c.on).length, err: TLXT.err })`);
console.log("off:", JSON.stringify(E)); ok(!E.on && !E.err, `option off: tick idles (${E.vis} cars keep their flag; the group is hidden), err ${E.err}`);
await ev(`TLX.setOn("traffic", true); true`); await waitGame(4);
E = await J(`({ on: TLX.on("traffic"), vis: TLXT.cars.filter(c => c.on).length, err: TLXT.err, semi: TLXT.cars.findIndex(c => c.semi) })`);
console.log("on:", JSON.stringify(E)); ok(E.on && !E.err, `option on again: ${E.vis} cars on, err ${E.err}`);
await reload();
await sleep(1500);
E = await J(`({ semi: TLXT.cars.findIndex(c => c.semi), err: TLXT.err, on: TLX.on("traffic") })`);
console.log("reload:", JSON.stringify(E)); ok(E.semi >= 0 && !E.err, `reload: semi back (index ${E.semi}), err ${E.err}`);
console.log(fails ? "FAILS " + fails : "all ok");
await done(fails ? 1 : 0);
