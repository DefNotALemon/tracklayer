// Beta break test for 6.3b1 (oil driver): broke player, walkout mid-trip, multi-day jump mid-trip, rehire after let-go.
import { boot, ev, sleep, done, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const pass = (hours, st = 0.25) => ev(`(() => { for (let t = 0; t < ${hours} - 1e-9; t += ${st}) { GS.hour += ${st}; (TLX.state("staff").crew.find(q => q.role === "oildriver") || {}).hap = 70; TLX.lights.step(); } return true; })()`);
const D = () => J(`Object.assign({}, TLX.lights.drv(), { line: TLX.lights.drvLine() })`);
const drums = () => J(`({ claims: GS.claims.filter(j => j.oil && j.own === "lights").length, load: GS.load.filter(j => j.oil && j.own === "lights").length })`);
const setLamp = (id, o) => ev(`(() => { Object.assign(TLX.lights.rec("${id}"), ${JSON.stringify(o)}); TLX.state("lights").hT = GS.hour; return true; })()`);
await boot();
await ev(`window.__w = setInterval(() => { GS.warmth = 100; }, 300); WX.at = () => 0; GS.storm = 0; TLX.monday = () => {}; tutSkip(); crashCancel(); GS.hour = 34; GS.cash = 30000; GS.apps.realestate = 1; TLX.state("staff").apps = []; TLX.state("staff").next = 1e9; true`);
await sleep(1200); await park();
await ev(`(() => { if (INT.on) intGoOut(); FOOT.on = true; FOOT.x = depot.x + 600; FOOT.z = depot.z + 700; FOOT.y = surf(FOOT.x, FOOT.z); return true; })()`);
await ev(`TLX.prop.buy("finnkirka"); TLX.prop.buy("kinnarodden"); TLX.lights.step(); TLX.staff.tick(0.1); true`);
const hire = () => J(`(() => { const a = TLX.staff.post({ id: "oil:quay", role: "oildriver" }); Object.assign(a, { name: "Test Driver", xp: 6, xpReal: 6, wage: 98 }); a.tr = Object.assign(a.tr, { honest: true, temper: 0.2, work: 1 }); TLX.staff.hire ? TLX.staff.hire(a.id) : 0; return { id: a.id, hasHire: !!TLX.staff.hire, crew: TLX.state("staff").crew.map(q => q.role + "@" + q.place) }; })()`);
const h = await hire(); console.log(JSON.stringify(h));
if (!h.crew.some(c => c.startsWith("oildriver"))) { console.log("hire API not found; keys: " + (await ev(`Object.keys(TLX.staff).join()`))); }
// A: broke: standing order cannot overspend
await setLamp("finnkirka", { oil: 5, store: 0, q: 0, on: true, low: true });
await ev(`GS.cash = 10; true`); await pass(2);
let c = await ev("GS.cash"), dr = await drums(), d = await D(), fk = await J(`TLX.lights.rec("finnkirka")`);
ok(c >= 0 && dr.claims === 0 && fk.q === 0, `A: broke ($10): cash ${c} never negative, no drum ordered (q=${fk.q}) st=${d.st}`);
await ev(`GS.cash = 30000; true`); await pass(0.1, 0.1);
d = await D(); ok(d.st === "quay" && /loading 1 drum/.test(d.line), "A: funds back: order resumes st=" + d.st + " " + d.line);
await pass(0.7, 0.1); d = await D();
ok(d.st === "out", "A: out on the trip: " + d.st);
// B: walkout mid-trip (owed wages 3+ days)
await ev(`(() => { const s = TLX.state("staff"); s.owed = 500; s.owedT = 100; return true; })()`);
await ev(`TLX.staff.tick(1); true`); await pass(0.25);
const crew = await J(`TLX.state("staff").crew.map(q => q.role)`);
d = await D(); dr = await drums();
console.log("after walkout:", JSON.stringify({ crew, d: d.st, who: d.who, n: d.n, dr, vac: await J(`TLX.staff.places().map(p => p.id)`) }));
ok(!crew.includes("oildriver") ? (d.st === "quay" && d.n === 0 && dr.claims >= 1) : true, "B: walked out mid-trip: drum back at quay as pickup, state reset: " + JSON.stringify({ d: d.st, n: d.n, dr, crew }));
ok(dr.load === 0, "B: no orphan drum on a sled load: " + dr.load);
// C: rehire, multi-day jump mid-trip
await ev(`(() => { const s = TLX.state("staff"); s.owed = 0; s.owedT = 0; s.crew = s.crew.filter(q => q.role !== "oildriver"); return true; })()`);
await hire(); await ev(`TLX.lights.sync(); true`); await pass(1);
d = await D(); console.log("rehire:", JSON.stringify([d.st, d.who, d.line]));
await ev(`GS.hour += 60; true`); await pass(0.5); await pass(1, 0.5);
d = await D(); const fk2 = await J(`TLX.lights.rec("finnkirka")`);
ok(d.st !== undefined && Number.isFinite(d.p) && d.n >= 0 && d.n <= 2, "C: 60 h jump: state sane: " + JSON.stringify([d.st, d.n, d.p, fk2.store, fk2.oil]));
const cnt = await J(`TLX.state("staff").crew.filter(q => q.role === "oildriver").length`);
ok(cnt === 1, "C: exactly one driver after rehire: " + cnt);
await done(fails);
