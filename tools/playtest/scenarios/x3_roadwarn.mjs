// 3.2b1 (road snow, what it means for a trip): the compass row and the Jobs app warn when a job's way by road runs over a
// snowed-in stretch (or the shut fell road), and only then; the Map app carries a road legend (open / snowed in / closed,
// with the count snowed in); the pickup stuck in a drifted road says "The road's drifted shut. Wait for the plow or take
// the sled." (and on the fell road, that it's shut for the winter), not a driving tip. Asserting, exit 1 on a failure.
import { boot, ev, sleep, done, down, up, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 9000; true`); await sleep(800);
ok(await J(`TLXR.ready && !!TLXR.trip`), "roads built, trip check present");
const site = id => `(${JSON.stringify(id)} === "depot" ? depot : SITES.find(s => s.id === ${JSON.stringify(id)}))`;
const trip = (from, to) => J(`(() => { const a = ${site(from)}, b = ${site(to)}; return TLXR.tripWarn(a.x, a.z, b); })()`);

// A: the graph. All roads open: no warning anywhere
await ev(`TLXR.setSnow(null, 0); true`);
const A = await J(`["mehamn", "gamvik", "dyfjord", "skjanes", "lebesby"].map(id => TLXR.tripWarn(depot.x, depot.z, SITES.find(s => s.id === id)))`);
console.log("A open:", JSON.stringify(A));
ok(A.every(w => w === ""), "A: every road open, no trip warns");
const ifj = await trip("depot", "ifjord"); console.log("A to Ifjord:", ifj);
ok(/Ifjordfjellet road shut for the winter/.test(ifj), "A: a trip to Ifjord warns the fell road is shut (" + ifj + ")");
// B: the Kjøllefjord–Mehamn road snowed in end to end
await ev(`TLXR.setSnow("fv888", 0.6); true`);
const B = { meh: await trip("depot", "mehamn"), gam: await trip("depot", "gamvik"), dyf: await trip("depot", "dyfjord"), leb: await trip("depot", "lebesby"), back: await trip("mehamn", "depot"), mg: await trip("mehamn", "gamvik") };
console.log("B fv888 shut:", JSON.stringify(B));
ok(/Kjøllefjord–Mehamn road snowed in/.test(B.meh) && /Kjøllefjord–Mehamn road snowed in/.test(B.back), "B: quay <-> Mehamn warns of the Mehamn road both ways");
ok(/Mehamn road snowed in/.test(B.gam), "B: quay -> Gamvik warns (the way runs over the Mehamn road)");
ok(B.dyf === "" && B.leb === "" && B.mg === "", "B: Dyfjord, Lebesby and Mehamn -> Gamvik stay quiet");
// C: only the far end of the Gamvik road shut
await ev(`TLXR.setSnow(null, 0); (() => { const rt = TLXR.routes.find(r => r.id === "gamvik"); TLXR.setSnow("gamvik", 0.6, rt.seg.length - 2); })(); true`);
const C = { meh: await trip("depot", "mehamn"), gam: await trip("depot", "relay") };
console.log("C gamvik far stretch shut:", JSON.stringify(C));
ok(C.meh === "" && /Gamvik road snowed in/.test(C.gam), "C: a shut stretch past Gamvik warns only the trip that runs over it");
// D: the rider already past a shut stretch: only trips back over it warn
await ev(`TLXR.setSnow(null, 0); TLXR.setSnow("fv888", 0.6, 1); true`);
const D = await J(`(() => { const rt = TLXR.routes.find(r => r.id === "fv888"); const i = rt.cum.findIndex(c => c > rt.len * 0.6), p = rt.pts[i]; const meh = SITES.find(s => s.id === "mehamn"); return { s1: rt.seg[1].shut, ahead: TLXR.tripWarn(p[0], p[1], meh), back: TLXR.tripWarn(p[0], p[1], depot) }; })()`);
console.log("D mid-road past stretch 1:", JSON.stringify(D));
ok(D.s1 && D.ahead === "" && /Mehamn road snowed in/.test(D.back), "D: from mid-road, ahead is clear and the way back warns");
// E: sled country: a place far from every road and village never warns
const E = await J(`(() => { const far = SITES.filter(s => s.x !== undefined && TLXR.near(s.x, s.z).d > 400 && !TLXR.ROADS.routes.some(r => r.via.includes(s.id))); TLXR.setSnow(null, 1); const w = far.map(s => ({ id: s.id, w: TLXR.tripWarn(depot.x, depot.z, s), d: Math.round(TLXR.near(s.x, s.z).d), dn: Math.round(Math.min(...SITES.filter(q => TLXR.ROADS.routes.some(r => r.via.includes(q.id))).map(q => Math.hypot(q.x - s.x, q.z - s.z)))) })); console.log(JSON.stringify(w)); return { n: far.length, warned: w.filter(q => q.w && q.dn > TLXR.ROADS.reach).length, list: w }; })()`);
console.log("E backcountry sites:", JSON.stringify(E));
ok(E.n > 0 && E.warned === 0, `E: ${E.n} backcountry places, none further than ${350} m from a village warns with every road shut (${E.warned})`);

// F: the compass row and the Jobs app, standing in Mehamn with the Mehamn road shut
await ev(`TLXR.setSnow(null, 0); TLXR.setSnow("fv888", 0.6); (() => { const m = SITES.find(s => s.id === "mehamn"); P.x = m.x + 6; P.z = m.z + 6; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.1; recenter(P.x, P.z, true); })(); true`);
await waitGame(1);
const F1 = await J(`$("jobSub").textContent`); console.log("F compass (no job, quay is the target):", F1);
ok(/Mehamn road snowed in/.test(F1), "F: the compass row warns the road back to the quay is snowed in");
// beta 0149 #1: the minimalist HUD hides #job, so the warning has to reach the player some other way: a visible toast
const clrT = `document.getElementById("toasts").innerHTML = ""; if (TOASTQ) TOASTQ.length = 0; true`;
const roadToasts = () => J(`[...$("toasts").children].filter(c => /snowed in on the way|shut for the winter\\. Take/.test(c.textContent)).map(c => { const b = c.getBoundingClientRect(), cs = getComputedStyle(c); return { t: c.textContent, w: Math.round(b.width), h: Math.round(b.height), op: +cs.opacity, disp: cs.display, vis: cs.visibility }; }).concat((TOASTQ || []).filter(t => /snowed in on the way|shut for the winter\\. Take/.test(t.msg)).map(t => ({ t: t.msg, queued: 1 })))`);
const shown = a => a.filter(q => !q.queued && q.w > 40 && q.h > 8 && q.op > 0.3 && q.disp !== "none" && q.vis !== "hidden");
const jobVis = await J(`(() => { const b = document.getElementById("job").getBoundingClientRect(); return Math.round(b.width); })()`);
console.log("F #job width (minimalist HUD hides it):", jobVis);
await ev(clrT); await waitGame(1);
const F1t = await roadToasts(); console.log("F no job toasts:", JSON.stringify(F1t));
ok(F1t.length === 0, "F: no job, no road toast (the idle quay arrow doesn't nag)");
await ev(`(() => { const j = Object.assign({}, GS.jobs[0] || {}); j.from = depot; if (!j.dest) j.dest = SITES.find(s => s.id === "dyfjord"); if (!j.cargo) j.cargo = "Test crate"; if (!j.pay) j.pay = 50; GS.claims.push(j); })(); true`);
await waitGame(0.6);
const F2 = await J(`(() => { const r = jobsList().find(e => e.kind === "claim"); return r ? { meta: r.meta, road: r.road || "" } : null; })()`);
console.log("F Jobs app claim row:", JSON.stringify(F2));
ok(F2 && /Mehamn road snowed in/.test(F2.meta), "F: the Jobs app row for a quay pickup warns");
await waitGame(0.4);
const F2t = await roadToasts(); console.log("F claim toasts:", JSON.stringify(F2t));
ok(shown(F2t).length === 1 && /Kjøllefjord–Mehamn road is snowed in on the way to/.test(F2t[0].t), "F: taking a job over the shut road shows one visible toast naming the road");
await shot("f_claim_toast");
await ev(clrT); await waitGame(2.5);
const F2r = await roadToasts(); console.log("F later toasts:", JSON.stringify(F2r));
ok(F2r.length === 0, "F: the toast comes once per road per storm, not every frame");
await ev(`TLXR.setSnow(null, 0); true`); await waitGame(0.8);
const F3 = await J(`({ sub: $("jobSub").textContent, meta: (jobsList().find(e => e.kind === "claim") || {}).meta })`);
console.log("F roads plowed:", JSON.stringify(F3));
ok(!/snowed in/.test(F3.sub) && !/snowed in/.test(F3.meta || ""), "F: plowed open, the warning goes");
await ev(`TLXR.setSnow("fv888", 0.6); true`); await ev(clrT); await waitGame(1.2);
const F4t = await roadToasts(); console.log("F next storm toasts:", JSON.stringify(F4t));
ok(shown(F4t).length === 1, "F: the next storm shuts the road again and the job is warned afresh");
await ev(`TLXR.setSnow(null, 0); GS.claims.length = 0; true`); await waitGame(0.4);

// G: the Map app's legend
await ev(`TLXR.setSnow("fv888", 0.6); TABLET.toggle(true, "map"); true`); await waitGame(1.6);
const G = await J(`(() => { const l = document.getElementById("tabRoadLeg"); return l ? { t: l.textContent, hid: l.hidden, w: l.getBoundingClientRect().width } : null; })()`);
console.log("G legend:", JSON.stringify(G));
ok(G && !G.hid && G.w > 20 && /open/.test(G.t) && /snowed in\s*1/.test(G.t) && /closed/.test(G.t), "G: the Map shows the road legend with 1 road snowed in");
await shot("g_map_legend");
await ev(`TLXR.setSnow(null, 0); true`); await waitGame(1.4);
const G2 = await J(`document.getElementById("tabRoadLeg").textContent`); console.log("G legend after plow:", G2);
ok(/snowed in/.test(G2) && !/snowed in\s*\d/.test(G2), "G: the count goes once the roads are open");
await ev(`TABLET.toggle(false); true`); await sleep(400);

// H: the pickup stuck in a drifted road
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await down("KeyQ"); await sleep(70); await up("KeyQ");
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "seated in the pickup");
const layAt = (cx, cz, d, w = 18) => ev(`(() => { for (let ix = Math.floor((${cx} - ${w} + HALF) / CELL); ix <= Math.ceil((${cx} + ${w} + HALF) / CELL); ix++) for (let iz = Math.floor((${cz} - ${w} + HALF) / CELL); iz <= Math.ceil((${cz} + ${w} + HALF) / CELL); iz++) { const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = ${d}; c.d[k] = ${d}; writeCell(ix, iz, d0, ${d}, ${d}); } recenter(P.x, P.z, true); return 1; })()`);
// a flat-ish point on a road, away from villages, facing along it
const spot = id => J(`(() => { const rt = TLXR.routes.find(r => r.id === ${JSON.stringify(id)}); let best = null; for (let i = 8; i < rt.pts.length - 8; i += 3) { const [x, z] = rt.pts[i], [x2, z2] = rt.pts[i + 2]; if (SITES.some(s => Math.hypot(s.x - x, s.z - z) < 300) || Math.hypot(depot.x - x, depot.z - z) < 300 || obNear(x, z, 12)) continue; const yaw = Math.atan2(x2 - x, z2 - z), g = Math.abs(surf(x2, z2) - surf(x, z)) / Math.hypot(x2 - x, z2 - z); if (!best || g < best.g) best = { x, z, yaw, g, s: rt.cum[i] }; if (g < 0.02) break; } return best; })()`);
const place = s => ev(`(() => { crashCancel(); FOOT.on = false; BOG.on = false; BOG.acc = 0; BOG.immune = 0; BOG.warned = false; P.x = ${s.x}; P.z = ${s.z}; P.yaw = ${s.yaw}; P.vx = P.vz = 0; P.y = surf(${s.x}, ${s.z}) + 0.1; recenter(${s.x}, ${s.z}, true); document.getElementById("toasts").innerHTML = ""; if (TOASTQ) TOASTQ.length = 0; const R = TLXV.rt(); R.stillTold = false; R.stillT = 0; R.why = ""; R.hold0 = null; return 1; })()`);
async function stuck(label, s, d, secs = 6) {
  await place(s); await layAt(s.x, s.z, d); await waitGame(1.2);
  await ev(`document.getElementById("toasts").innerHTML = ""; if (TOASTQ) TOASTQ.length = 0; TLXV.rt().why = ""; TLXV.rt().stillTold = false; TLXV.rt().stillT = 0; window.__t0 = [P.x, P.z]; true`);
  await down("KeyW"); const t0 = await clock(); const seen = []; let why = "";
  while ((await clock()) - t0 < secs) {
    await sleep(200); await layAt(s.x, s.z, d);
    const q = await J(`{ w: TLXV.rt().why || "", ts: (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent)) }`);
    for (const m of q.ts) if (!seen.includes(m)) seen.push(m); if (q.w && !why) why = q.w;
  }
  await up("KeyW");
  const mv = await J(`Math.hypot(P.x - __t0[0], P.z - __t0[1])`);
  console.log(`${label}: moved ${mv.toFixed(1)} m, why "${why}", toasts ${JSON.stringify(seen)}`);
  return { why, ts: seen, mv };
}
const s1 = await spot("fv888"); console.log("H fv888 spot", JSON.stringify(s1));
ok(!!s1, "H: found a road spot");
const si = await J(`Math.floor(${s1.s} / TLXR.ROADS.seg)`);
await ev(`TLXR.setSnow(null, 0); TLXR.setSnow("fv888", 1, ${si}); true`);
const h1 = await stuck("H1 drifted road, 70 cm", s1, 0.7);
ok(h1.why === "drift" && h1.ts.some(t => /drifted shut\. Wait for the plow or take the sled/.test(t)), `H1: stuck in a drifted road says it's drifted shut (why "${h1.why}")`);
ok(!h1.ts.some(t => /Back out along your ruts|Give it more/.test(t)), "H1: no driving tip instead");
await ev(`TLXR.setSnow(null, 0); true`);
const h2 = await stuck("H2 same spot, road open, 70 cm laid by hand", s1, 0.7);
ok(h2.why !== "drift" && !h2.ts.some(t => /drifted shut/.test(t)), `H2: an open road never says drifted shut (why "${h2.why}")`);
const s3 = await spot("ifjordfjellet"); console.log("H fell spot", JSON.stringify(s3));
if (s3) {
  const h3 = await stuck("H3 fell road, 70 cm", s3, 0.7);
  ok(h3.why === "drift" && h3.ts.some(t => /shut for the winter/.test(t)), `H3: stuck on the fell road says it's shut for the winter (why "${h3.why}")`);
} else ok(false, "H3: found a fell road spot");

const errs = await J(`TLXR.err || TLXR.tickErr || null`); ok(!errs, "no road error " + errs);
console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);
