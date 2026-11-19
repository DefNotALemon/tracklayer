// Slice 6.3b1 (G4): the oil driver (tlx-lights.js v4, on tlx-staff.js's addRole / addPlaces). One driver at the quay
// hauls the drums you have paid for out to your lights, two a trip, to the light that is lowest; weather holds them
// at the quay or on the trail; with the standing order on they order the drums on your account.
// Asserts, exit 1 on a failure.
//  A. no oil run before you own a light; two lights bought = ONE job, an OIL DRIVER applies, wages $65-190.
//  B. the interview is in the trade's words (WHITEOUT ON THE FELL?), an overseller slips and is caught.
//  C. hired (keyboard Enter on HIRE): the standing order buys a drum for the low light and not for the full one,
//     half an hour to load, the pickup leaves the Jobs app, the driver is a pin on the Map and a line on both
//     cards, PRAISE waits for them to be back; the drum lands in the store with a notification; back to the quay.
//  D. capacity and priority: five drums for two lights go out 2 + 2 + 1, the lowest light first.
//  E. a drum on YOUR sled is yours: the driver leaves it alone.
//  F. weather: over their limit they wait at the quay; a storm on the trail sits them down where they are and the
//     landing says they were late; an old hand rides in what keeps a beginner at the quay.
//  G. wages owed: nothing moves, nothing is ordered, both apps say so; paid, the run starts again. The standing
//     order switches from the Lights card (pad A) and from the Staff card (touch tap).
//  H. a keeper + a driver + the standing order: ten days and the lamp never goes dark, with no input; a night slept
//     through in one clock jump has the drum land before the keeper's round.
//  I. reload mid-trip: the driver's load survives and lands; let go mid-trip: the drums stand at the quay again; a
//     6.3a save (no driver) loads with the job posted.
import { boot, reload, ev, send, tap, sleep, shot, done, padSet, padOff, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(80); } return !!(await ev(expr)); }
const Lr = id => J(`Object.assign({}, TLX.lights.rec("${id}"), { out: TLX.lights.out("${id}"), atQuay: TLX.lights.atQuay("${id}") })`);
const D = () => J(`Object.assign({}, TLX.lights.drv(), { line: TLX.lights.drvLine(), pins: TLX.lights.drvPins() })`);
const crew = id => J(`TLX.state("staff").crew.find(q => q.id === ${id}) || null`);
let PIN = "";
// advance game time in pieces of `st` hours; PIN = a statement run before each piece (keeps happiness where the test put it)
const pass = (hours, st = 0.25) => ev(`(() => { for (let t = 0; t < ${hours} - 1e-9; t += ${st}) { GS.hour += ${st}; ${PIN}; TLX.lights.step(); } return true; })()`);
const page = () => ev(`$("tabV").textContent`);
const app = async id => { await ev(`TABLET.toggle(false); TABLET.toggle(true, "${id}"); TABLET.render(); true`); await sleep(400); return page(); };
const plant = (place, role, o) => J(`(() => { const a = TLX.staff.post({ id: "${place}", role: "${role}" }); Object.assign(a, ${JSON.stringify(o)}); a.tr = Object.assign(a.tr, ${JSON.stringify(o.tr || {})}); return a; })()`);
const goAway = () => ev(`(() => { if (INT.on) intGoOut(); crashCancel(); FOOT.on = true; FOOT.x = depot.x + 600; FOOT.z = depot.z + 700; FOOT.y = surf(FOOT.x, FOOT.z); INT.cd = 0; return true; })()`);
const notesOn = () => ev(`(() => { window.__n = []; if (!window.__no) { window.__no = TABLET.notify.bind(TABLET); TABLET.notify = n => { window.__n.push(n.title + " | " + n.body); return window.__no(n); }; } return true; })()`);
const notes = () => J(`window.__n`);
const warm = () => ev(`window.__warm = window.__warm || setInterval(() => { GS.warmth = 100; }, 300); true`);
// (the haul's LOGIC is tested on a fast clock: 9 and 12 km a game hour, as 6.3b1 shipped. The real pace, a sled's, is x6_oilsled.mjs's)
const calm = () => ev(`WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.lights.DRV.vOut = 9000; TLX.lights.DRV.vBack = 12000; true`);
const drums = () => J(`({ claims: GS.claims.filter(j => j.oil && j.own === "lights").map(j => j.lamp), load: GS.load.filter(j => j.oil && j.own === "lights").map(j => j.lamp), jobs: jobsList().filter(e => /Paraffin drum/.test(e.title || "")).length })`);
const setLamp = (id, o) => ev(`(() => { Object.assign(TLX.lights.rec("${id}"), ${JSON.stringify(o)}); TLX.state("lights").hT = GS.hour; return true; })()`);
// run the clock until the driver is in state st (or `max` hours have gone): hours taken
async function runTo(st, max = 8, piece = 0.25) { let h = 0; while (h < max - 1e-9) { if ((await D()).st === st) return h; await pass(piece, piece); h += piece; } return (await D()).st === st ? h : -1; }
const clearDrums = () => ev(`(() => { for (const id of ["finnkirka", "kinnarodden"]) { const r = TLX.lights.rec(id); r.q = 0; r.store = 0; } GS.claims = GS.claims.filter(j => !(j.oil && j.own === "lights")); GS.load = GS.load.filter(j => !(j.oil && j.own === "lights")); TLX.lights.sync(); const q = TLX.lights.drv(); q.st = "quay"; q.lamp = null; q.n = 0; q.p = 0; q.w = 0; q.held = false; return true; })()`);

await boot(); await warm(); await calm();
await ev(`tutSkip(); crashCancel(); GS.hour = 34; GS.cash = 30000; GS.apps.realestate = 1; TLX.state("staff").apps = []; TLX.state("staff").next = 1e9; true`);
await sleep(1200); await park(); await goAway();

// ---- A: the job exists once a light is yours, and there is one of it
const a0 = await J(`({ roles: Object.keys(TLX.staff.ROLES), places: TLX.staff.places().map(p => p.id), drv: TLX.lights.driver() })`);
ok(a0.roles.includes("oildriver") && !a0.places.includes("oil:quay") && a0.drv === null, "A: no oil run while the lights are Kystverket's: " + JSON.stringify(a0.places));
await ev(`TLX.prop.buy("finnkirka"); TLX.prop.buy("kinnarodden"); TLX.lights.step(); TLX.staff.tick(); true`); await sleep(600);
const a1 = await J(`(() => { const pl = TLX.staff.places(), p = pl.find(q => q.id === "oil:quay"), s = TLX.state("staff"); return { n: pl.filter(q => q.role === "oildriver").length, name: p && p.name, d: p ? Math.hypot(p.x - depot.x, p.z - depot.z) : -1, apps: s.apps.map(q => q.role + "@" + q.place) }; })()`);
ok(a1.n === 1 && a1.name === "oil run" && a1.d < 1 && a1.apps.includes("oildriver@oil:quay"), "A: two lights bought: ONE oil run, at the quay, and someone applies: " + JSON.stringify(a1));
const wages = await J(`(() => { const w = []; for (let i = 0; i < 60; i++) { const a = TLX.staff.post({ id: "oil:quay", role: "oildriver" }); w.push(a.wage); } const s = TLX.state("staff"); s.apps = s.apps.filter(q => q.place !== "oil:quay").slice(0, 2); return { lo: Math.min(...w), hi: Math.max(...w) }; })()`);
ok(wages.lo >= 63 && wages.hi <= 190 && wages.hi > wages.lo + 30, `A: oil drivers ask $${wages.lo}-$${wages.hi} a week (60 applicants)`);

// ---- B: the interview
const rnd = v => ev(`(() => { if (!window.__mr) window.__mr = Math.random; Math.random = ${v === null ? "window.__mr" : `() => ${v}`}; return true; })()`);
const hon = await plant("oil:quay", "oildriver", { name: "Mikkel Utsi", xp: 6, xpReal: 6, wage: 98, tr: { honest: true, temper: 0.2, work: 1 } });
const liar = await plant("oil:quay", "oildriver", { name: "Tor Lie", xp: 15, xpReal: 2, wage: 140, tr: { honest: false, temper: 0.5, work: 0.9 } });
await ev(`TLX.staff.interview(${hon.id}); TABLET.toggle(true, "staff"); TABLET.render(); true`); await sleep(400);
let txt = await page();
ok(/INTERVIEW · OIL DRIVER · OIL RUN/.test(txt) && /a driver for the oil run out to the lights/.test(txt) && /WHITEOUT ON THE FELL\?/.test(txt) && !/COLD-SNAP STOVE|LAMP OUT IN A GALE/.test(txt), "B: the interview is for the oil run and asks about a whiteout on the fell");
for (const q of ["stove", "xp", "why"]) { await ev(`document.querySelector('#tabV [data-stq="${q}"]').click(); true`); await sleep(150); await until(`!TLX.staff.typing(${hon.id})`, 6); await sleep(300); }
txt = await page();
ok(/it closes in to a whiteout/.test(txt) && /dig in on the lee side and wait/.test(txt) && /6 winters on freight/.test(txt) && /steady winter work/.test(txt) && !/guest|cabin outside|mantle/i.test(txt), "B: an honest hand answers like a freight rider (dig in and wait; no guests, no mantles)");
await shot("x6o_b_interview");
await rnd(0); await ev(`TLX.staff.interview(${liar.id}); TABLET.render(); true`); await sleep(300);
await ev(`document.querySelector('#tabV [data-stq="stove"]').click(); true`); await sleep(200); await until(`!TLX.staff.typing(${liar.id})`, 6); await rnd(null); await sleep(300);
txt = await page();
const lr = await J(`TLX.state("staff").apps.find(q => q.id === ${liar.id})`);
ok(lr.caught && /hope I hit the coast/.test(txt) && /CAUGHT OUT: ABOUT 2/.test(txt) && lr.wage === 82, `B: the overseller slips on it and is caught: ask drops to $${lr.wage} (70 + 5 a year + 2)`);

// ---- C: hire by keyboard; the standing order, the load, the trip
await setLamp("finnkirka", { oil: 10, store: 0, q: 0, on: true, low: true }); await setLamp("kinnarodden", { oil: 70, store: 0, q: 0, on: true });
await ev(`TLX.staff.interview(null); TABLET.render(); true`); await sleep(300); await notesOn();
const cash0 = await ev("GS.cash");   // (read before the hire: the game's own once-a-second step can run the standing order before the test's first pass)
await ev(`TABLET.focus = "sta:${hon.id}"; TABLET.paintFocus(); true`); await tap("Enter"); await sleep(400);
let m = await crew(hon.id);
ok(m && m.place === "oil:quay" && m.role === "oildriver" && m.wage === 98, "C: Enter on HIRE: Mikkel is oil driver on the oil run at $98 a week");
PIN = `(TLX.state("staff").crew.find(q => q.id === ${hon.id}) || {}).hap = 70`;
await ev(PIN + "; true");
await pass(0.25);
let d = await D(), nn = await notes(), dr = await drums(), fk = await Lr("finnkirka"), kn = await Lr("kinnarodden");
ok(d.st === "quay" && d.so === true && fk.q === 1 && kn.q === 0 && (await ev("GS.cash")) === cash0 - 45 && dr.claims.join() === "finnkirka" && nn.some(q => /Mikkel Utsi ordered paraffin/.test(q) && /1 drum for Finnkirka lykt on your account \(\$45\)/.test(q)), "C: the standing order buys one drum for the light at 10 lamp hours ($45 off your account, a notification) and none for the one at 70: " + JSON.stringify([d.st, fk.q, kn.q, cash0 - (await ev("GS.cash")), dr.claims]) + " " + nn.join(" || "));
ok(/at the quay, loading 1 drum for Finnkirka/.test(d.line) && d.pins.length === 0 && dr.jobs === 1, "C: it stands at the quay as a pickup while he loads: " + d.line);
await pass(0.25);
const hTake = await ev("GS.hour");
d = await D(); dr = await drums(); fk = await Lr("finnkirka");
ok(d.st === "out" && d.lamp === "finnkirka" && d.n === 1 && dr.claims.length === 0 && dr.jobs === 0 && fk.q === 1 && fk.atQuay === 0 && d.d > 1500, `C: half an hour to load and he is away with it: the pickup has left the quay and the Jobs app (run ${(d.d / 1000).toFixed(1)} km)`);
await pass(0.1, 0.1);
d = await D();
const pinD = await J(`(() => { const p = TLX.lights.drvPins()[0], to = TLX.lights.small("finnkirka").drop; const R = TLX.lights.route("finnkirka"); let off = 1e9; if (p && R) for (const q of R.pts) off = Math.min(off, Math.hypot(q[0] - p.x, q[1] - p.z)); return p ? { name: p.name, off, a: Math.hypot(p.x - depot.x, p.z - depot.z), b: Math.hypot(p.x - to.x, p.z - to.z), ab: Math.hypot(to.x - depot.x, to.z - depot.z) } : null; })()`);
ok(pinD && pinD.name === "MIKKEL · OIL RUN" && pinD.a > 300 && pinD.off < 4 && pinD.a + pinD.b >= pinD.ab - 1 && /on the way to Finnkirka with 1 drum, \d+\.\d km to go/.test(d.line), `C: a pin on the Map, ${Math.round(pinD && pinD.a)} m out along the run: "${d.line}"`);
txt = await app("lights");
ok(/Oil run/.test(txt) && /OIL DRIVER/.test(txt) && /Mikkel Utsi: on the way to Finnkirka with 1 drum/.test(txt) && /Standing order on/.test(txt) && /1 drum paid for, 1 on Mikkel's sled/.test(txt), "C: the Lights app has the Oil run card, and Finnkirka's card says whose sled the drum is on");
await shot("x6o_c_lights");
await ev(`(() => { FOOT.x = depot.x + 4; FOOT.z = depot.z + 3; FOOT.y = surf(FOOT.x, FOOT.z); return true; })()`);
txt = await app("staff");
const pd = await ev(`document.querySelector("[data-act='stp:${hon.id}']").disabled`);
ok(/OIL DRIVER/.test(txt) && /Hauls the paraffin drums out to your lights, 2 a trip: on the way to Finnkirka/.test(txt) && /standing order on/.test(txt) && pd && /Mikkel is out on the run: have a word at the quay once they are back/.test(txt), "C: the Staff card says where he is; PRAISE at the quay waits until he is back");
await shot("x6o_c_staff");
await ev(`TABLET.toggle(true, "map"); true`); await sleep(700); await shot("x6o_c_map"); await ev(`TABLET.toggle(false); true`);
await notesOn();
let hOut = await runTo("back", 4, 0.05);
const tOut = (await ev("GS.hour")) - hTake;
fk = await Lr("finnkirka"); nn = await notes(); d = await D();
const clean = d.d / 9000;
ok(hOut >= 0 && tOut > clean - 0.02 && tOut < clean + 0.12 && fk.store === 60 && fk.q === 0 && d.wkN === 1 && d.wkLate === 0, `C: ${tOut.toFixed(2)} h out for ${(d.d / 1000).toFixed(1)} km at 9 km an hour (${clean.toFixed(2)} h): the drum is in Finnkirka's store`);
ok(nn.some(q => /Mikkel Utsi reached Finnkirka/.test(q) && /1 paraffin drum rolled into the oil store: 1 drum there/.test(q) && /nobody is keeping the lamp: pump one in at the rack/.test(q) && !/late/.test(q)), "C: a notification says so, and that with no keeper the pumping is yours: " + nn.join(" || "));
const hB0 = await ev("GS.hour"); const hBack = await runTo("quay", 4, 0.05); const tBack = (await ev("GS.hour")) - hB0;
txt = await app("staff");
const pd2 = await ev(`document.querySelector("[data-act='stp:${hon.id}']").disabled`);
ok(hBack > 0 && tBack < tOut && tBack > d.d / 12000 - 0.02 && !pd2 && /You're at the quay: you can have a word/.test(txt), `C: back empty in ${tBack.toFixed(2)} h (12 km an hour); at the quay you can have a word`);
await ev(`TABLET.toggle(false); true`); await goAway();

// ---- D: five drums, two lights: 2 + 2 + 1, the lowest first
await ev(`TLX.lights.drv().so = false; true`); await clearDrums();
await setLamp("finnkirka", { oil: 50, on: true }); await setLamp("kinnarodden", { oil: 20, on: true });
await ev(`(() => { for (let i = 0; i < 3; i++) TLX.lights.order("finnkirka"); for (let i = 0; i < 2; i++) TLX.lights.order("kinnarodden"); TLX.lights.order("finnkirka"); return true; })()`);
dr = await drums();
const seq = []; let last = "quay";
for (let h = 0; h < 20 && !(seq.length === 3 && last === "quay"); h += 0.25) { await pass(0.25); d = await D(); if (d.st === "out" && last !== "out") seq.push(d.lamp + ":" + d.n); last = d.st; }
fk = await Lr("finnkirka"); kn = await Lr("kinnarodden"); const dr2 = await drums();
ok(dr.claims.length === 5 && seq.join(" ") === "kinnarodden:2 finnkirka:2 finnkirka:1" && fk.store === 180 && kn.store === 120 && fk.q === 0 && kn.q === 0 && dr2.claims.length === 0, `D: five drums ordered (a sixth refused: three is plenty for a small light) go out as ${seq.join(", ")}: the light with 20 hours before the one with 50`);

// ---- E: a drum on your own sled is yours
await clearDrums(); await setLamp("finnkirka", { oil: 50 });
await ev(`(() => { TLX.lights.order("finnkirka"); const i = GS.claims.findIndex(j => j.oil && j.lamp === "finnkirka"); GS.load.push(GS.claims.splice(i, 1)[0]); TLX.lights.sync(); return true; })()`);
await pass(3);
d = await D(); dr = await drums(); fk = await Lr("finnkirka");
ok(d.st === "quay" && /nothing to haul/.test(d.line) && dr.load.length === 1 && fk.q === 1 && fk.atQuay === 0, "E: three hours with the only drum on YOUR sled: the driver has nothing to haul and leaves it alone");
await clearDrums();

// ---- F: weather
await setLamp("finnkirka", { oil: 50, store: 0 }); await ev(`TLX.lights.order("finnkirka"); WX.at = () => 0.9; true`);
await pass(3);
d = await D(); fk = await Lr("finnkirka");
ok(d.st === "quay" && d.held && fk.atQuay === 1 && /at the quay with 1 drum for Finnkirka, waiting for the weather to ease/.test(d.line), "F: a storm over the quay: three hours and he has not set out: " + d.line);
txt = await app("lights"); ok(/WEATHER/.test(txt) && /waiting for the weather to ease/.test(txt), "F: the Oil run card shows it"); await ev(`TABLET.toggle(false); true`);
await ev(`WX.at = (x, z) => Math.hypot(x - depot.x, z - depot.z) > 800 ? 0.9 : 0; true`); await notesOn();
await pass(1.5, 0.05);
d = await D(); const p0 = d.p;
ok(d.st === "out" && d.held && d.p > 1000 && d.p < d.d && /sitting out the weather \d\.\d km out, 1 drum for Finnkirka aboard/.test(d.line) && d.pins.length === 1, "F: the quay clears and he sets out; the storm on the fell sits him down where he is: " + d.line);
await pass(5); d = await D();
ok(d.st === "out" && d.p === p0, "F: five hours on and he has not moved");
await ev(`WX.at = () => 0; true`); await runTo("back", 3); nn = await notes(); d = await D(); fk = await Lr("finnkirka");
ok(fk.store === 60 && d.wkLate === 1 && nn.some(q => /reached Finnkirka/.test(q) && /\d+ hours? late: held up by the weather/.test(q)), "F: it eases, the drum lands, and the line says how late: " + nn.filter(q => /reached/.test(q)).join(""));
await runTo("quay", 3); await clearDrums(); await setLamp("finnkirka", { oil: 50, store: 0 });
await ev(`(() => { const c = TLX.state("staff").crew.find(q => q.id === ${hon.id}); c.xpReal = 0; TLX.lights.order("finnkirka"); WX.at = () => 0.6; return true; })()`);
const lim0 = await ev(`TLX.lights.drvLimit(TLX.lights.driver())`);
await pass(2); const dB = await D();
await ev(`TLX.state("staff").crew.find(q => q.id === ${hon.id}).xpReal = 10; true`);
const lim1 = await ev(`TLX.lights.drvLimit(TLX.lights.driver())`);
await pass(0.75); const dO = await D();
const hSlow = await runTo("back", 4, 0.05);
ok(Math.abs(lim0 - 0.45) < 1e-6 && Math.abs(lim1 - 0.75) < 1e-6 && dB.st === "quay" && dB.held && dO.st === "out" && !dO.held && hSlow + 0.25 > clean * 1.5, `F: weather 0.6: a beginner (limit ${lim0}) stays at the quay, an old hand (limit ${lim1}) rides, slower (about ${(hSlow + 0.25).toFixed(2)} h against ${clean.toFixed(2)} h clean)`);
await ev(`WX.at = () => 0; TLX.state("staff").crew.find(q => q.id === ${hon.id}).xpReal = 6; true`); await runTo("quay", 3); await clearDrums();

// ---- G: wages owed; the standing order's two switches
await setLamp("finnkirka", { oil: 10, store: 0 }); await setLamp("kinnarodden", { oil: 20, store: 0 });
await ev(`(() => { const s = TLX.state("staff"); s.owed = 55; s.owedT = 0; s.hT = GS.hour; TLX.lights.drv().so = true; TLX.lights.order("finnkirka"); return true; })()`);
const PIN0 = PIN; PIN = PIN0 + `; TLX.state("staff").hT = GS.hour`;
const cashG = await ev("GS.cash");
await pass(6); d = await D(); fk = await Lr("finnkirka");
txt = await app("lights"); const stxt = await app("staff");
ok(d.st === "quay" && fk.atQuay === 1 && fk.q === 1 && (await ev("GS.cash")) === cashG && /not working: wages are owed/.test(d.line) && /NOT WORKING/.test(txt) && /Mikkel Utsi: not working: wages are owed/.test(txt) && /2 a trip: not working: wages are owed/.test(stxt), "G: owed wages: six hours, the drum still at the quay, nothing ordered; both apps say he isn't working");
// the switch from the Staff card, by touch
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
const sb = await J(`(() => { const b = document.querySelector("#tabV [data-act='stx:${hon.id}:so']"); b.scrollIntoView({ block: "center" }); const q = b.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2, t: b.textContent }; })()`);
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: sb.x, y: sb.y }] }); await sleep(60);
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(400);
await send("Emulation.setTouchEmulationEnabled", { enabled: false }); await ev(`INP.dev = "kbm"; true`);
d = await D(); txt = await app("staff");
ok(sb.t === "STOP THE STANDING ORDER" && d.so === false && /START A STANDING ORDER/.test(txt) && /standing order off/.test(txt), "G: a touch tap on the Staff card's STOP THE STANDING ORDER switches it off");
// and back on from the Lights card, with a pad
txt = await app("lights");
ok(/Standing order off: drums are ordered only when you order them/.test(txt), "G: the Lights card says it is off");
await padSet({}); await sleep(300); await ev(`TABLET.focus = "oilrun"; TABLET.paintFocus(); true`);
await padSet({ 0: 1 }); await sleep(400); await padSet({}); await sleep(300); await padOff();
d = await D(); txt = await page();
ok(d.so === true && /STOP THE STANDING ORDER/.test(txt), "G: pad A on the Oil run card switches it back on");
await ev(`TABLET.toggle(false); INP.dev = "kbm"; TLX.staff.payOwed(); true`); PIN = PIN0;
await pass(0.5); d = await D();
ok((await ev(`TLX.state("staff").owed`)) === 0 && d.st === "out" && d.n === 1, "G: wages paid: half an hour later he is away with the drum");
await runTo("quay", 4); await clearDrums();

// ---- H: a keeper, a driver and the standing order: the light runs itself
const kp = await plant("lt:finnkirka", "keeper", { name: "Aslak Sara", xp: 9, xpReal: 9, wage: 78, tr: { honest: true, temper: 0.2, work: 1.2 } });
await ev(`TLX.staff.hire(${kp.id}); true`);
PIN = PIN0 + `; (TLX.state("staff").crew.find(q => q.id === ${kp.id}) || {}).hap = 70; TLX.state("staff").hT = GS.hour`;
await setLamp("finnkirka", { oil: 30, store: 0, q: 0, on: true, low: false, lit: 0, need: 0 }); await setLamp("kinnarodden", { oil: 80, store: 120, on: true });
await notesOn();
let dark = 0; for (let i = 0; i < 60; i++) { await pass(4); const q = await Lr("finnkirka"); if (!q.on) dark++; }
fk = await Lr("finnkirka"); nn = await notes(); d = await D();
const bought = nn.filter(q => /ordered paraffin/.test(q) && /Finnkirka/.test(q)).length, landed = nn.filter(q => /reached Finnkirka/.test(q)).length;
ok(dark === 0 && fk.need > 100 && Math.abs(fk.lit - fk.need) < 0.01 && bought >= 2 && landed >= 2 && !nn.some(q => /Finnkirka lykt is dark/.test(q)), `H: ten days, no input: Finnkirka lit ${fk.lit.toFixed(0)} of ${fk.need.toFixed(0)} dark hours, ${bought} orders on the account, ${landed} landings, never dark`);
ok(nn.some(q => /last drum pumped in/.test(q) && /Mikkel hauls the next ones out from the quay\./.test(q)), "H: the keeper's last-drum line names the driver");
// a night slept through in one jump: the drum lands before the keeper's round
await runTo("quay", 4); await clearDrums(); await ev(`TLX.lights.drv().so = false; true`);
await ev(`(() => { GS.hour = Math.ceil(GS.hour / 24) * 24 + 14; const q = TLX.lights.rec("finnkirka"); q.oil = 9; q.store = 0; q.on = true; q.lit = 0; q.need = 0; q.kT = 0; TLX.state("lights").hT = GS.hour; TLX.state("staff").hT = GS.hour; TLX.lights.order("finnkirka"); return true; })()`);
await ev(`(() => { ${PIN}; GS.hour += 24; ${PIN}; TLX.lights.step(); return true; })()`);
fk = await Lr("finnkirka"); d = await D();
ok(fk.need > 12 && Math.abs(fk.lit - fk.need) < 0.01 && fk.on && fk.oil > 30 && fk.store === 0 && d.st === "quay", `H: one 24 h jump from 9 L: the drum was hauled, pumped in and the lamp burned ${fk.lit.toFixed(1)} of ${fk.need.toFixed(1)} dark hours (tank ${fk.oil.toFixed(0)} L)`);
await ev(`(() => { TLX.lights.drv().wkN = 3; TLX.lights.drv().wkLate = 1; TLX.lights.monday({ label: "Mon" }); return true; })()`); d = await D();
ok(d.wkN === 0 && d.wkLate === 0, "H: Monday starts the driver's week again");

// ---- I: reload mid-trip, let go mid-trip, an older save
await clearDrums(); await setLamp("finnkirka", { oil: 60, store: 0 });
await ev(`TLX.lights.order("finnkirka"); TLX.lights.order("finnkirka"); true`); await pass(0.5); await pass(0.1, 0.1);
d = await D();
await ev(`TLX.state("lights").hT = GS.hour; save(); true`);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
await reload(); await warm(); await calm(); await park(); await goAway(); await sleep(1800);   // (a reload starts you on the sled at the quay, where a waiting drum is loaded onto YOUR sled: park away from it)
const rl = await J(`(() => { const q = TLX.lights.drv(), r = TLX.lights.rec("finnkirka"); return { st: q.st, n: q.n, lamp: q.lamp, p: q.p, who: (TLX.lights.driver() || {}).name, rq: r.q, store: r.store, claims: GS.claims.filter(j => j.oil).length, so: q.so }; })()`);
ok(d.st === "out" && d.n === 2 && sv.x.sys.lights.s.drv.st === "out" && rl.st === "out" && rl.n === 2 && rl.lamp === "finnkirka" && rl.who === "Mikkel Utsi" && rl.rq === 2 && rl.claims === 0 && rl.p >= d.p - 1 && rl.so === false, "I: reload mid-trip: he is still out with both drums, and they are not back at the quay as pickups: " + JSON.stringify(rl));
PIN = `for (const c of TLX.state("staff").crew) c.hap = 70; TLX.state("staff").hT = GS.hour`;
await ev(`TLX.state("staff").next = 1e9; true`);
await runTo("back", 4); fk = await Lr("finnkirka");
ok(fk.store === 120 && fk.q === 0, "I: and they land: two drums in Finnkirka's store");
await runTo("quay", 4);
await ev(`TLX.lights.order("kinnarodden"); true`); await pass(0.5); await pass(0.1, 0.1);
const o1 = await D();
const drvId = await ev(`TLX.lights.driver().id`);
const gone = await ev(`TLX.staff.letGo(${drvId})`); await pass(0.25); await ev(`TLX.lights.sync(); true`); await sleep(300);   // (sync runs once a game second by itself: slow under a loaded machine)
d = await J(`TLX.state("lights").drv`); dr = await drums(); kn = await Lr("kinnarodden");
const vac = await J(`TLX.staff.vacancies().map(q => q.id)`);
ok(o1.st === "out" && o1.lamp === "kinnarodden" && gone && d.st === "quay" && d.n === 0 && d.who === null && dr.claims.join() === "kinnarodden" && kn.q === 1 && kn.atQuay === 1 && vac.includes("oil:quay"), "I: let go mid-trip: the drum stands at the quay as your pickup again, and the job is open: " + JSON.stringify([o1.st, o1.lamp, gone, d.st, d.n, d.who, dr.claims, kn.q, kn.atQuay, vac]));
const old = JSON.parse(JSON.stringify(sv));
old.x.sys.staff.s.crew = old.x.sys.staff.s.crew.filter(q => q.place !== "oil:quay"); old.x.sys.staff.s.apps = []; old.x.sys.staff.s.next = 0;
delete old.x.sys.lights.s.drv; old.x.sys.lights.s.lamps.finnkirka.q = 0;
await reload(old); await warm(); await calm(); await sleep(1500);
await ev(`tutSkip(); TLX.staff.tick(); TLX.lights.step(); true`); await sleep(300);
const ol = await J(`(() => { const s = TLX.state("staff"); let err = ""; try { TABLET.toggle(true, "lights"); TABLET.render(); TABLET.toggle(true, "staff"); TABLET.render(); } catch (e) { err = String(e); } return { own: TLX.lights.owns("finnkirka"), drv: TLX.lights.driver(), raw: TLX.state("lights").drv || null, vac: TLX.staff.vacancies().some(q => q.id === "oil:quay"), app: s.apps.some(q => q.place === "oil:quay" && q.role === "oildriver"), pins: TLX.lights.drvPins().length, keeper: (TLX.lights.keeper("finnkirka") || {}).name, err }; })()`);
await sleep(400); txt = await page();
ok(ol.own && ol.drv === null && ol.vac && ol.app && ol.pins === 0 && ol.keeper === "Aslak Sara" && !ol.err && /OIL DRIVER/.test(txt), "I: a 6.3a save (a keeper, no driver) loads with the oil run posted and the keeper still on the books: " + JSON.stringify(ol));
await shot("x6o_i_oldsave");
await done(fails ? 1 : 0);
