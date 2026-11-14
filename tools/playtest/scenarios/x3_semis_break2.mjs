// Beta 3.5a (semis) break pass v2 (fixed route pick, setOn): : a moving semi vs a sled parked across its lane, vs a walker standing in its lane,
// a sled driven at 18 m/s into the trailer's SIDE (mid-trailer), sled dropped onto the trailer roof, option "traffic"
// toggled off/on while a semi drives, reload (semis come back, no semi state in the save), night headlight check.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(100); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);
const SI = await J(`TLXT.cars.findIndex(c => c.semi)`);
ok(SI >= 0, "semi present at boot (index " + SI + ")");
const rid = await J(`TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id`);
const s0 = await J(`(() => { const r = TLXT.routes.find(q => q.id === "${rid}"); return r.s0 + 400; })()`);
console.log("route", rid, JSON.stringify(await J(`(() => { const r = TLXT.routes.find(q => q.id === "${rid}"); return { len: r.len, s0: r.s0, s1: r.s1 }; })()`)));
const info = `TLXT.semiInfo(${SI})`;
const away = `(() => { crashCancel(); FOOT.on = false; const p = TLXT.lanePt("${rid}", ${s0} - 400, 1); P.x = p.cx + 90; P.z = p.cz + 90; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`;
const start = ty => `(() => { TLXT.cars.forEach((c, i) => { if (i !== ${SI}) c.on = false; }); const c = TLXT.place("${rid}", ${s0}, 1, ${SI}, "${ty}"); c.v = 9; return true; })()`;

// 1: sled parked across the lane 120 m ahead of a moving semi
await ev(away); await ev(start("haul"));
await ev(`(() => { const c = TLXT.cars[${SI}], p = TLXT.lanePt("${rid}", c.s + 120, 1); P.x = p.x; P.z = p.z; P.y = surf(P.x, P.z) + 0.2; P.yaw = p.yaw + Math.PI / 2; P.vx = P.vz = 0; return true; })()`);
let m1 = 1e9; const h0 = await J(`TLXT.hits`);
await waitGame(25, async () => { const q = await J(`(() => { const s = ${info}; let m = 1e9; for (const k of s.circ) m = Math.min(m, Math.hypot(P.x - k[0], P.z - k[1]) - k[2]); return m; })()`); m1 = Math.min(m1, q); return false; });
const A = await J(`({ v: TLXT.cars[${SI}].v, why: TLXT.cars[${SI}].why, hits: TLXT.hits, crash: CRASH.on })`);
console.log("1:", JSON.stringify(A), "closest", m1.toFixed(2));
ok(A.v < 0.5 && A.hits === h0 && m1 > 0.5, `1: semi stops for a sled across its lane (${A.why}, closest ${m1.toFixed(2)} m, bumps ${A.hits - h0})`);

// 2: walker in the lane
await ev(away); await ev(start("tank"));
await ev(`(() => { const c = TLXT.cars[${SI}], p = TLXT.lanePt("${rid}", c.s + 110, 1); FOOT.on = true; FOOT.x = p.x; FOOT.z = p.z; FOOT.y = surf(p.x, p.z); FOOT.sp = FOOT.fwd = FOOT.turn = 0; return true; })()`);
let m2 = 1e9;
await waitGame(25, async () => { const q = await J(`(() => { const s = ${info}; let m = 1e9; for (const k of s.circ) m = Math.min(m, Math.hypot(FOOT.x - k[0], FOOT.z - k[1]) - k[2]); return m; })()`); m2 = Math.min(m2, q); return false; });
const B = await J(`({ v: TLXT.cars[${SI}].v, why: TLXT.cars[${SI}].why, foot: FOOT.on })`);
console.log("2:", JSON.stringify(B), "closest", m2.toFixed(2));
ok(B.v < 0.5 && m2 > 1.5, `2: tanker stops for a walker in its lane (${B.why}, closest ${m2.toFixed(2)} m)`);

// 3: sled at 18 m/s into the trailer's side, semi stopped
await ev(away); await ev(start("dist"));
await ev(`(() => { const c = TLXT.cars[${SI}]; c.hold = 1e9; c.v = 0; return true; })()`); await waitGame(1);
await ev(`(() => { crashCancel(); FOOT.on = false; const s = ${info}, a = s.tyaw + Math.PI / 2, mx = (s.hx + s.ax) / 2, mz = (s.hz + s.az) / 2; P.x = mx + Math.sin(a) * 14; P.z = mz + Math.cos(a) * 14; P.y = surf(P.x, P.z) + 0.3; P.yaw = a + Math.PI; P.vx = -Math.sin(a) * 18; P.vz = -Math.cos(a) * 18; return true; })()`);
let m3 = 1e9;
await waitGame(5, async () => { const q = await J(`(() => { const s = ${info}; let m = 1e9; for (const k of s.circ) m = Math.min(m, Math.hypot(P.x - k[0], P.z - k[1]) - k[2]); return m; })()`); m3 = Math.min(m3, q); return false; });
const C = await J(`({ hits: TLXT.hits, fin: Number.isFinite(P.x) && Number.isFinite(P.y), err: TLXT.err })`);
console.log("3:", JSON.stringify(C), "closest circ", m3.toFixed(2));
ok(C.fin && !C.err && C.hits > h0, `3: side hit at 18 m/s counted and finite (circle clearance min ${m3.toFixed(2)})`);
ok(m3 > -1.0, `3: sled never deep inside the trailer (min ${m3.toFixed(2)} m)`);

// 4: sled dropped onto the trailer roof
await ev(`(() => { crashCancel(); const s = ${info}; P.x = (s.hx + s.ax) / 2; P.z = (s.hz + s.az) / 2; P.y = surf(P.x, P.z) + 4.2; P.vx = P.vz = 0; return true; })()`);
await waitGame(2);
const D = await J(`({ fin: Number.isFinite(P.x) && Number.isFinite(P.y) && Number.isFinite(P.yaw), err: TLXT.err, y: P.y - surf(P.x, P.z) })`);
console.log("4:", JSON.stringify(D));
ok(D.fin && !D.err, `4: dropped on the trailer roof: finite, no tick error (y above snow ${D.y.toFixed(2)})`);

// 5: option off mid-drive, then on
await ev(away); await ev(start("haul"));
await ev(`(() => { TLXT.cars[${SI}].hold = 0; return true; })()`);
await ev(`(() => { TLX.setOn("traffic", false); return true; })()`);
await waitGame(2);
const E = await J(`({ on: TLX.on("traffic"), vis: TLXT.cars.filter(c => c.on).length, err: TLXT.err })`);
console.log("5 off:", JSON.stringify(E));
ok(!E.on && !E.err, `5: option off: ${E.vis} cars still flagged on, no error`);
await ev(`(() => { TLX.setOn("traffic", true); return true; })()`);
await waitGame(3);
const F = await J(`({ on: TLX.on("traffic"), semis: TLXT.cars.filter(c => c.semi && c.on).length, err: TLXT.err })`);
console.log("5 on:", JSON.stringify(F));
ok(F.on && !F.err, `5: option back on, ${F.semis} semi(s) driving, no error`);

// 6: night, headlights
await ev(`GS.hour = 46; true`); await waitGame(2);
await ev(away); await ev(start("haul"));
await waitGame(2);
const G = await J(`(() => { const T = TLXT; return { err: T.err, hasBeam: !!(T.beams || T.beam || T.pool), night: GS.hour } })()`);
console.log("6:", JSON.stringify(G));
ok(!G.err, "6: night with a semi driving, no tick error");

// 7: reload
await ev(`GS.hour = 34; true`);
await reload();
await sleep(1500);
const H = await J(`({ ready: TLXT.ready, err: TLXT.err, ns: TLXT.nSemi, saved: JSON.stringify(GS.x && GS.x.traffic || null).length })`);
console.log("7:", JSON.stringify(H));
ok(H.ready && !H.err && H.ns >= 1, `7: after reload semis exist (${H.ns}), no error (saved traffic state ${H.saved} bytes)`);
await done(fails ? 1 : 0);
