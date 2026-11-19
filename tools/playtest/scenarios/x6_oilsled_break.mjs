// Beta break test for 6.3b2a (oil driver's sled): storm stop distance, walkout and let-go while out, reload mid-storm,
// 60 h jump mid-trip, interior while the sled runs, finite sled transform throughout.
import { boot, reload, ev, sleep, done, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const pass = (hours, st = 0.25) => ev(`(() => { for (let t = 0; t < ${hours} - 1e-9; t += ${st}) { GS.hour += ${st}; TLX.state("staff").crew.forEach(q => q.hap = 70); TLX.lights.step(); } return true; })()`);
const D = () => J(`Object.assign({}, TLX.lights.drv())`);
const V = () => J(`(() => { const d = TLX.lights.sled(), g = d.g; if (!g) return { built: false }; const p = g.position, r = g.rotation; return { built: true, vis: g.visible, fin: [p.x, p.y, p.z, r.y].every(Number.isFinite), x: p.x, z: p.z, rider: d.rider.visible, n: d.drums.filter(q => q.visible).length, obs: d.obs ? d.obs.length : 0, moving: d.moving, v: d.v }; })()`);
const stand = (x, z) => ev(`(() => { if (INT.on) intGoOut(); crashCancel(); FOOT.on = true; FOOT.x = ${x}; FOOT.z = ${z}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.vx = FOOT.vz = 0; recenter(FOOT.x, FOOT.z, true); return true; })()`);
const hire = () => ev(`(() => { const a = TLX.staff.post({ id: "oil:quay", role: "oildriver" }); Object.assign(a, { name: "Test Driver", xp: 6, xpReal: 6, wage: 98 }); a.tr = Object.assign(a.tr || {}, { honest: true, temper: 0.2, work: 1 }); TLX.staff.hire(a.id); return a.id; })()`);
await boot();
await ev(`window.__w = setInterval(() => { GS.warmth = 100; TLX.state("staff").crew.forEach(q => q.hap = 70); }, 300); WX.at = () => 0; GS.storm = 0; TLX.monday = () => {}; tutSkip(); crashCancel(); GS.hour = 34; GS.cash = 90000; GS.apps.realestate = 1; TLX.state("staff").apps = []; TLX.state("staff").next = 1e9; true`);
await sleep(1200); await park();
await ev(`TLX.prop.buy("finnkirka"); TLX.lights.step(); true`);
const q0 = await J(`TLX.lights.quaySpot()`);
await stand(q0.x + 20, q0.z + 10);
await hire(); await ev(`TLX.lights.sync(); true`);
await ev(`Object.assign(TLX.lights.rec("finnkirka"), { oil: 5, store: 0, q: 0, on: true, low: true }); TLX.state("lights").hT = GS.hour; true`);
await pass(0.5, 0.1); await sleep(500);
let d = await D(); console.log("start", JSON.stringify([d.st, d.n, d.p]));
await pass(1.5, 0.1); await sleep(400); d = await D();
ok(d.st === "out", "A: out on the trip: " + d.st);
await stand(await J(`TLX.lights.sled().at.x + 25`), await J(`TLX.lights.sled().at.z + 5`)); await sleep(800);
let v = await V(); ok(v.built && v.vis && v.fin && v.rider, "A: sled in view, finite, rider up: " + JSON.stringify(v));
// B: storm on/off x4 quickly, check finite and that it resumes
for (let i = 0; i < 4; i++) { await ev(`WX.at = () => 1; true`); await sleep(500); await ev(`WX.at = () => 0; true`); await sleep(500); }
await pass(0.5, 0.1); await sleep(600); v = await V(); d = await D();
ok(v.fin && !d.held, "B: storm flicker x4: finite, not stuck held (held=" + d.held + ")");
// B2: storm: how far does it coast after the hold begins (builder's own F fails at 0.5 m on a clean run)
await ev(`WX.at = () => 1; true`); await sleep(2600);
const s0 = await V(); await sleep(1500); const s1 = await V();
console.log("storm drift", Math.hypot(s1.x - s0.x, s1.z - s0.z).toFixed(2), "v", s0.v, s1.v, "moving", s1.moving);
ok(Math.hypot(s1.x - s0.x, s1.z - s0.z) < 0.5, "B2: storm: sled still at 1.5 s after 2.6 s (drift " + Math.hypot(s1.x - s0.x, s1.z - s0.z).toFixed(2) + " m)");
// C: reload mid-storm
await reload(); await ev(`WX.at = () => 1; TLX.monday = () => {}; true`); await sleep(1200);
await stand(await J(`TLX.lights.sled().at.x + 25`), await J(`TLX.lights.sled().at.z + 5`)); await sleep(1200);
v = await V(); d = await D(); ok(v.fin && v.vis && d.st === "out" && !v.moving, "C: reload mid-storm: " + JSON.stringify([d.st, d.n, v.fin, v.vis]));
await ev(`WX.at = () => 0; true`);
await stand(await J(`TLX.lights.sled().at.x + 25`), await J(`TLX.lights.sled().at.z + 5`));
// D: interior while the sled runs
await pass(0.5, 0.1); await sleep(500);
await ev(`(() => { const b = INT.beacons && INT.beacons[0]; if (b && typeof intEnter === "function") { intEnter(b); } return true; })()`); await sleep(1200);
const inI = await ev(`INT.on`); await pass(1, 0.1); await sleep(500); v = await V();
ok(v.fin, "D: interior (on=" + inI + ") while it runs: sled transform finite");
await ev(`if (INT.on) intGoOut(); true`);
// E: walkout while out
await ev(`(() => { const s = TLX.state("staff"); s.owed = 500; s.owedT = 100; return true; })()`);
await ev(`TLX.staff.tick(1); true`); await pass(0.5, 0.25); await sleep(600);
v = await V(); d = await D();
const crew = await J(`TLX.state("staff").crew.map(q => q.role)`);
console.log("walkout:", JSON.stringify({ crew, d: d.st, v }));
ok(crew.includes("oildriver") || (!v.vis || !v.rider), "E: walkout mid-trip: no phantom rider on a sled with no driver: " + JSON.stringify([crew, v.vis, v.rider, v.n]));
ok(crew.includes("oildriver") || !v.vis || v.obs >= 0, "E2: walkout: sled state " + JSON.stringify(v));
// F: rehire then let go while out
await ev(`(() => { const s = TLX.state("staff"); s.owed = 0; s.owedT = 0; s.crew = s.crew.filter(q => q.role !== "oildriver"); return true; })()`);
await hire(); await ev(`TLX.lights.sync(); Object.assign(TLX.lights.rec("finnkirka"), { oil: 5, store: 0, q: 0, on: true, low: true }); true`);
await pass(2.5, 0.1); await sleep(500); d = await D(); v = await V(); console.log("rehire", JSON.stringify([d.st, d.n, v.vis, v.rider]));
await ev(`GS.hour += 60; true`); await pass(0.5, 0.25); await pass(1, 0.5); await sleep(500);
v = await V(); d = await D(); ok(v.fin && Number.isFinite(d.p), "F: 60 h jump mid-run: finite " + JSON.stringify([d.st, d.p, v.x, v.z]));
const crew2 = await J(`TLX.state("staff").crew.filter(q => q.role === "oildriver").length`);
ok(crew2 === 1, "F: one driver: " + crew2);
await ev(`(() => { const s = TLX.state("staff"); s.crew = s.crew.filter(q => q.role !== "oildriver"); return true; })()`);
await ev(`TLX.lights.sync(); TLX.staff.tick(0.1); true`); await pass(0.25); await sleep(600); v = await V();
ok(!v.built || !v.vis || v.obs === 0, "F: driver removed outright: sled gone/non-solid " + JSON.stringify(v));
await done(fails);
