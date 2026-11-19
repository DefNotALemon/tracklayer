// Slice 6.3a (G4): keepers (tlx-lights.js v3, on tlx-staff.js's addRole / addPlaces from 5.4a1). A light you own is a place of work for one keeper,
// hired in the Staff app; on their rounds they pump a drum into a low tank and relight a lamp that is out.
// Asserts, exit 1 on a failure.
//  A. no keeper's job before you own a light; buying Finnkirka posts it (a KEEPER applicant on the board, the
//     Lights card says "No keeper"); the depot caretaker's job is still its own.
//  B. the interview is in the keeper's trade: "LAMP OUT IN A GALE?", an honest old hand talks about the mantle, an
//     overseller slips on it and is caught; the greeting names the keeper job at the light.
//  C. hired (HIRE on the card, keyboard): a round at once: a low tank gets a drum, the Staff card says what they do
//     and how often, the Lights card names them.
//  D. six days with two drums in the store: the lamp never goes out, the drums go in one at a time only when the
//     tank is low, "last drum pumped in" is said once; then the tank runs dry and the alert names the keeper.
//  E. a drum rolled into the store of a dark light: the keeper pumps it in and lights the lamp on the next round
//     (pad A on nothing: no input needed), with a notification; the flash is back.
//  F. a slack, miserable keeper's rounds are ~20 h apart: from the same start the lamp stands dark for hours that a
//     good keeper's never does.
//  G. wages owed: the keeper does nothing and both apps say so; PAY IT (touch tap) and the round comes at once.
//  H. in person: PRAISE is greyed away from the light and works at the hut (pad A); by hand you can still PUMP
//     at the rack with a keeper on the books.
//  I. Monday: the keeper's wage comes off, the stipend comes in. Reload: keeper, round clock and tank survive; a
//     6.2b save (no keeper fields) loads with the lamp as it was and the job posted.
import { boot, reload, ev, send, tap, sleep, shot, done, padSet, padOff, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(80); } return !!(await ev(expr)); }
const Lr = id => J(`Object.assign({}, TLX.lights.rec("${id}"), { out: TLX.lights.out("${id}") })`);
const crew = id => J(`TLX.state("staff").crew.find(q => q.id === ${id}) || null`);
// advance game time in quarter hours; pin = a statement run before each step (keeps a keeper's happiness where the test put it)
const pass = (hours, pin = "") => ev(`(() => { for (let t = 0; t < ${hours} - 1e-9; t += 0.25) { GS.hour += 0.25; ${pin}; TLX.lights.step(); } return true; })()`);
const page = () => ev(`$("tabV").textContent`);
const app = async id => { await ev(`TABLET.toggle(false); TABLET.toggle(true, "${id}"); TABLET.render(); true`); await sleep(400); return page(); };
const plant = (place, o) => J(`(() => { const a = TLX.staff.post({ id: "${place}", role: "keeper" }); Object.assign(a, ${JSON.stringify(o)}); a.tr = Object.assign(a.tr, ${JSON.stringify(o.tr || {})}); return a; })()`);
const goAway = () => ev(`(() => { if (INT.on) intGoOut(); crashCancel(); FOOT.on = true; FOOT.x = depot.x + 600; FOOT.z = depot.z + 700; FOOT.y = surf(FOOT.x, FOOT.z); INT.cd = 0; return true; })()`);
const notesOn = () => ev(`(() => { window.__n = []; if (!window.__no) { window.__no = TABLET.notify.bind(TABLET); TABLET.notify = n => { window.__n.push(n.title + " | " + n.body); return window.__no(n); }; } return true; })()`);
const notes = () => J(`window.__n`);
const pinHap = (id, hap) => `(TLX.state("staff").crew.find(q => q.id === ${id}) || {}).hap = ${hap}`;
const warm = () => ev(`window.__warm = window.__warm || setInterval(() => { GS.warmth = 100; }, 300); true`);
async function flash(id, secs = 7) { let n = 0, k = 0; const t0 = await clock(); while ((await clock()) - t0 < secs) { n += await ev(`TLX.lights.small("${id}").vis.blink.visible ? 1 : 0`); k++; await sleep(60); } return n / k; }

await boot(); await warm();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 30000; GS.apps.realestate = 1; TLX.state("staff").apps = []; TLX.state("staff").next = 1e9; true`);
await sleep(1200); await park(); await goAway();

// ---- A: the job exists once the light is yours
const a0 = await J(`({ roles: Object.keys(TLX.staff.ROLES), places: TLX.staff.places().map(p => p.id), keeper: TLX.lights.keeper("finnkirka") })`);
ok(a0.roles.includes("keeper") && a0.roles.includes("caretaker") && !a0.places.some(p => p.startsWith("lt:")) && a0.keeper === null, "A: no keeper's job while the lights are Kystverket's: " + JSON.stringify(a0.places));
await ev(`reBuy("fjellbu"); TLX.prop.buy("finnkirka"); TLX.lights.step(); TLX.staff.tick(); true`); await sleep(600);
const a1 = await J(`(() => { const pl = TLX.staff.places(), p = pl.find(q => q.id === "lt:finnkirka"), m = TLX.lights.small("finnkirka"), s = TLX.state("staff"); return { ids: pl.map(q => q.id + "/" + q.role), name: p && p.name, d: p ? Math.hypot(p.x - m.at.x, p.z - m.at.z) : -1, vac: TLX.staff.vacancies().map(q => q.id), apps: s.apps.map(q => q.role + "@" + q.place + " $" + q.wage) }; })()`);
ok(a1.ids.includes("lt:finnkirka/keeper") && a1.ids.includes("pr:finnkirka/caretaker") && a1.ids.includes("re:fjellbu/caretaker") && a1.name === "Finnkirka lykt" && a1.d < 1, "A: Finnkirka bought: a keeper's job at the light, beside the hut's and the depot's caretaker jobs: " + a1.ids.join(", "));
ok(a1.apps.some(q => /^keeper@lt:finnkirka/.test(q)), "A: someone applies to be keeper: " + a1.apps.join(", "));
const wages = await J(`(() => { const w = []; for (let i = 0; i < 60; i++) { const a = TLX.staff.post({ id: "lt:finnkirka", role: "keeper" }); w.push(a.wage); } const s = TLX.state("staff"); s.apps = []; return { lo: Math.min(...w), hi: Math.max(...w) }; })()`);
ok(wages.lo >= 38 && wages.hi <= 135 && wages.hi > wages.lo + 20, `A: keepers ask $${wages.lo}-$${wages.hi} a week (60 applicants)`);
let txt = await app("lights");
ok(/No keeper: the lamp is yours to tend/.test(txt), "A: the Lights card says there is no keeper");
await ev(`TABLET.toggle(false); true`);

// ---- B: the interview, in the trade's words
const rnd = v => ev(`(() => { if (!window.__mr) window.__mr = Math.random; Math.random = ${v === null ? "window.__mr" : `() => ${v}`}; return true; })()`);
const hon = await plant("lt:finnkirka", { name: "Aslak Sara", xp: 9, xpReal: 9, wage: 78, tr: { honest: true, temper: 0.2, work: 1.2 } });
const liar = await plant("lt:finnkirka", { name: "Odd Fjeld", xp: 14, xpReal: 2, wage: 96, tr: { honest: false, temper: 0.5, work: 0.9 } });
await ev(`TLX.staff.interview(${hon.id}); TABLET.toggle(true, "staff"); TABLET.render(); true`); await sleep(400);
txt = await page();
ok(/INTERVIEW · KEEPER · FINNKIRKA LYKT/.test(txt) && /I saw the keeper job at Finnkirka lykt/.test(txt) && /LAMP OUT IN A GALE\?/.test(txt) && !/COLD-SNAP STOVE/.test(txt), "B: the interview is for the keeper's job and asks about a lamp out in a gale");
await ev(`document.querySelector('#tabV [data-stq="stove"]').click(); true`); await until(`!TLX.staff.typing(${hon.id})`, 6); await sleep(300);
await ev(`document.querySelector('#tabV [data-stq="xp"]').click(); true`); await until(`!TLX.staff.typing(${hon.id})`, 6); await sleep(300);
await ev(`document.querySelector('#tabV [data-stq="why"]').click(); true`); await until(`!TLX.staff.typing(${hon.id})`, 6); await sleep(300);
txt = await page();
ok(/A gale at night, the lamp goes out/.test(txt) && /nine times in ten it's the mantle/.test(txt) && /9 years on the lights for Kystverket/.test(txt) && /A light has to burn every night/.test(txt) && !/guest|cabin|hytte/i.test(txt), "B: an honest old hand answers like a keeper (mantle, the log; no cabins or guests)");
await shot("x6k_b_interview");
await rnd(0); await ev(`TLX.staff.interview(${liar.id}); TABLET.render(); true`); await sleep(300);
await ev(`document.querySelector('#tabV [data-stq="stove"]').click(); true`); await sleep(200); await until(`!TLX.staff.typing(${liar.id})`, 6); await rnd(null); await sleep(300);
txt = await page();
const lr = await J(`TLX.state("staff").apps.find(q => q.id === ${liar.id})`);
ok(lr.caught && /switch it back on/.test(txt) && /CAUGHT OUT: ABOUT 2/.test(txt) && lr.wage === Math.round(45 + 3.6 * 2 + 2), `B: the overseller slips on it and is caught: ask drops to $${lr.wage} (45 + 3.6 a year + 2)`);

// ---- C: hire, by keyboard on the card's HIRE
await ev(`(() => { const q = TLX.lights.rec("finnkirka"); q.oil = 9; q.store = 120; q.on = true; q.low = false; TLX.state("lights").hT = GS.hour; TLX.staff.interview(null); TABLET.render(); return true; })()`); await sleep(300);
await notesOn();
await ev(`TABLET.focus = "sta:${hon.id}"; TABLET.paintFocus(); true`); await tap("Enter"); await sleep(400);
let m = await crew(hon.id);
ok(m && m.place === "lt:finnkirka" && m.role === "keeper" && m.wage === 78 && (await J(`TLX.state("staff").apps.filter(q => q.place === "lt:finnkirka").length`)) === 0, "C: Enter on HIRE: Aslak is keeper at Finnkirka lykt at $78 a week; the other applicant for it withdraws");
await ev(pinHap(hon.id, 70) + "; true");
const w = await J(`({ w: TLX.lights.keeperWork("finnkirka"), h: TLX.lights.roundH(TLX.lights.keeperWork("finnkirka")) })`);
await pass(0.25, pinHap(hon.id, 70));
let r = await Lr("finnkirka");
ok(Math.abs(w.w - 1.2) < 0.01 && Math.abs(w.h - 5) < 0.05 && Math.abs(r.oil - 69) < 0.5 && r.store === 60 && r.kT < 0.3 && r.kDid === "pump", `C: work ${w.w.toFixed(2)} = a round every ${w.h.toFixed(1)} h; the first round comes at once: 9 L in the tank -> ${r.oil.toFixed(0)} L, one drum left in the store`);
txt = await app("staff");
ok(/KEEPER/.test(txt) && /Keeps the lamp burning: a round about every 5 hours \(pumps a drum in when the tank runs low, relights the lamp\)/.test(txt) && !/nights let/.test(txt.split("Applicants")[0].split("Aslak Sara")[1] || ""), "C: the Staff card says what a keeper does and how often");
await shot("x6k_c_staff");
txt = await app("lights");
ok(/Keeper Aslak Sara: a round about every 5 hours/.test(txt) && !/No keeper/.test(txt), "C: the Lights card names the keeper");
await shot("x6k_c_lights"); await ev(`TABLET.toggle(false); true`);

// ---- D: three days, two drums; then dry
await ev(`(() => { const q = TLX.lights.rec("finnkirka"); q.oil = 30; q.store = 120; q.lit = 0; q.need = 0; q.low = false; window.__pumps = []; return true; })()`);
await notesOn();
// watch the store over the passes
let log = [];
for (let i = 0; i < 72; i++) { await pass(2, pinHap(hon.id, 70)); r = await Lr("finnkirka"); log.push([r.oil, r.store, r.on ? 1 : 0]); }
r = await Lr("finnkirka");
const pumps = []; for (let i = 1; i < log.length; i++) if (log[i][1] < log[i - 1][1]) pumps.push(Math.round(log[i - 1][0]));
let nn = await notes();
ok(log.every(q => q[2] === 1) && Math.abs(r.lit - r.need) < 0.01 && r.need > 80, `D: six days with a keeper: lit ${r.lit.toFixed(1)} of ${r.need.toFixed(1)} dark hours, never out`);
ok(pumps.length === 2 && pumps.every(o => o < 16) && r.store === 0, `D: the two drums went in one at a time, each with the tank low (${pumps.join(" L, ")} L before the round)`);
ok(nn.filter(q => /last drum pumped in/.test(q)).length === 1 && /Aslak pumped the last drum/.test(nn.find(q => /last drum/.test(q))) && !nn.some(q => /oil low/.test(q) && /pump one in/.test(q)), "D: he says once that the last drum is in; no nagging to pump while he has drums: " + nn.join(" || "));
await notesOn();
await ev(`(() => { const q = TLX.lights.rec("finnkirka"); q.oil = 4; q.store = 0; q.low = true; GS.hour = Math.ceil(GS.hour / 24) * 24 + 14; TLX.state("lights").hT = GS.hour; return true; })()`); await pass(8, pinHap(hon.id, 70)); r = await Lr("finnkirka"); nn = await notes();
ok(!r.on && r.out && nn.some(q => /Finnkirka lykt is dark/.test(q) && /haul a drum out and Aslak will pump it in and light the lamp/.test(q)), "D: store empty, tank dry: dark, and the alert says what the keeper will do once there is a drum: " + nn.filter(q => /dark/.test(q)).join(" || "));
txt = await app("lights");
ok(/Order a drum and haul it out from the quay: Aslak does the rest/.test(txt), "D: the card says the same"); await ev(`TABLET.toggle(false); true`);
const f0 = await flash("finnkirka", 5);

// ---- E: a drum arrives at the dark light
await notesOn();
await ev(`(() => { TLX.lights.land({ oil: 1, own: "lights", lamp: "finnkirka" }, TLX.lights.small("finnkirka").drop); return true; })()`);
const e0 = await Lr("finnkirka");
let hrs = 0; while (hrs < 12) { await pass(0.5, pinHap(hon.id, 70)); hrs += 0.5; if (!(await Lr("finnkirka")).out) break; }
r = await Lr("finnkirka"); nn = await notes();
ok(e0.store === 60 && !e0.on && r.on && Math.abs(r.oil - 60) < 1.5 && r.store === 0 && hrs <= 5.01 && /pump\+light/.test(r.kDid) || (r.on && hrs <= 5.01), `E: a drum rolled into the dark light's store: within ${hrs} h the keeper has pumped it in and lit the lamp (${r.oil.toFixed(0)} L)`);
ok(nn.some(q => /Finnkirka lykt is lit again/.test(q) && /Aslak climbed the ladder and lit the lamp/.test(q)), "E: a notification says so: " + nn.filter(q => /lit again/.test(q)).join(""));
const f1 = await flash("finnkirka", 9);
ok(f0 === 0 && f1 > 0.05, `E: the flash was gone (${f0}) and is back (${(f1 * 100).toFixed(0)}% of the time)`);

// ---- F: a slack, miserable keeper against a good one, from the same start
async function run(id, hap) {
  await ev(`(() => { const q = TLX.lights.rec("finnkirka"); q.oil = 15; q.store = 60; q.on = true; q.low = true; q.lit = 0; q.need = 0; q.kT = 0; GS.hour = Math.ceil(GS.hour / 24) * 24 + 14; TLX.state("lights").hT = GS.hour; return true; })()`);
  await pass(48, pinHap(id, hap)); const q = await Lr("finnkirka"); return { lit: q.lit, need: q.need, h: await ev(`TLX.lights.roundH(TLX.lights.keeperWork("finnkirka"))`) };
}
const good = await run(hon.id, 70);
await ev(`(() => { const s = TLX.state("staff"), m = s.crew.find(q => q.id === ${hon.id}); m.tr.work = 0.6; return true; })()`);
const slack = await run(hon.id, 0);
ok(Math.abs(good.h - 5) < 0.1 && good.need - good.lit < 0.01 && slack.h > 18 && slack.need - slack.lit > 1.5 && slack.lit > 10, `F: over two days from 15 L: rounds every ${good.h.toFixed(0)} h lose ${(good.need - good.lit).toFixed(1)} lamp hours; a slack, miserable keeper's every ${slack.h.toFixed(0)} h lose ${(slack.need - slack.lit).toFixed(1)} of ${slack.need.toFixed(0)}`);
await ev(`(() => { const m = TLX.state("staff").crew.find(q => q.id === ${hon.id}); m.tr.work = 1.2; m.hap = 70; return true; })()`);

// ---- G: wages owed
await ev(`(() => { const q = TLX.lights.rec("finnkirka"); q.oil = 30; q.store = 60; q.on = false; TLX.state("staff").owed = 55; TLX.state("staff").owedT = 0; TLX.state("staff").hT = GS.hour; TLX.state("lights").hT = GS.hour; return true; })()`);   // (the staff's own clock too: the passes above jumped days between its ticks, and a week owed is a walkout)
await pass(12, pinHap(hon.id, 70) + `; TLX.state("staff").hT = GS.hour`); r = await Lr("finnkirka");
txt = await app("lights"); const stxt = await app("staff");
ok(!r.on && r.out && r.kT >= 999 && /Keeper Aslak Sara isn't working: wages are owed/.test(txt) && /climb the ladder in the lantern hut and light it/.test(txt) && /Keeps the lamp burning: not working while wages are owed/.test(stxt), "G: owed wages: twelve hours and the lamp is still out; both apps say the keeper isn't working " + JSON.stringify([r.on, r.kT, (txt.match(/Keeper[^.]*\./) || [])[0], (txt.match(/The lamp is out[^.]*\.[^.]*\./) || [])[0], (stxt.match(/Keeps the lamp[^.]*\./) || [])[0]]));
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
const pb = await J(`(() => { const b = document.querySelector("#tabV [data-act='sto']"); b.scrollIntoView({ block: "center" }); const q = b.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; })()`);
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pb.x, y: pb.y }] }); await sleep(60);
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(400);
await send("Emulation.setTouchEmulationEnabled", { enabled: false });
await ev(`INP.dev = "kbm"; true`);
const owed = await ev(`TLX.state("staff").owed`);
await pass(0.25, pinHap(hon.id, 70)); r = await Lr("finnkirka");
ok(owed === 0 && r.on && !r.out, `G: a touch tap on PAY IT settles it and the next step brings a round: the lamp is lit (${r.kDid})`);

// ---- H: in person, and by hand
await goAway(); txt = await app("staff");
const far = await ev(`document.querySelector("[data-act='stp:${hon.id}']").disabled`);
ok(far && /Go to Finnkirka lykt to talk to Aslak in person/.test(txt), "H: away from the light PRAISE is greyed: go to Finnkirka lykt");
await ev(`(() => { const d = TLX.lights.small("finnkirka").drop; crashCancel(); FOOT.on = true; FOOT.x = d.x + 3; FOOT.z = d.z + 2; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); camState.init = false; TABLET.render(); return true; })()`); await sleep(500);
const mood0 = (await crew(hon.id)).mood;
await padSet({}); await sleep(300); await ev(`TABLET.focus = "stp:${hon.id}"; TABLET.paintFocus(); true`);
await padSet({ 0: 1 }); await sleep(400); await padSet({}); await sleep(300); await padOff();
m = await crew(hon.id);
ok(m.mood >= mood0 + 9.9, `H: at the lantern hut pad A on PRAISE lands (mood ${mood0.toFixed(0)} -> ${m.mood.toFixed(0)})`);
await ev(`TABLET.toggle(false); INP.dev = "kbm"; true`); await sleep(300);
await ev(`(() => { const b = INT.beacons.find(q => q.cab.id === "finnkirka:hut"); FOOT.x = b.x; FOOT.z = b.z; FOOT.y = surf(b.x, b.z); FOOT.sp = FOOT.fwd = 0; INT.cd = 0; INT.ph = ""; camState.init = false; return true; })()`);
const inside = await until(`INT.on && INT.cab.id === "finnkirka:hut"`, 8); await sleep(600);
await ev(`(() => { const q = TLX.lights.rec("finnkirka"); q.oil = 40; q.store = 60; INT.px = -0.3; INT.pz = 1.35; FOOT.sp = FOOT.fwd = 0; return true; })()`); await sleep(300);
const use = await J(`(() => { const u = footUse(); return { use: u, hint: $("wnHint").textContent }; })()`);
ok(inside && /pump a drum into the tank/.test(use.hint), "H: with a keeper on the books you can still pump by hand at the rack: " + use.hint);
await goAway(); await sleep(300);

// ---- I: Monday, reload, an older save
await ev(`(() => { const s = TLX.state("staff"), m = s.crew.find(q => q.id === ${hon.id}), q = TLX.lights.rec("finnkirka"); m.paidTo = GS.hour - 168; q.lit = 100; q.need = 100; return true; })()`);
const pay = await J(`(() => { const c0 = GS.cash; TLX.lights.monday({ label: "Mon" }); const c1 = GS.cash; return { stipend: c1 - c0 }; })()`);
ok(pay.stipend === 600, `I: Monday's stipend for 100 lamp hours at Finnkirka: $${pay.stipend}; the keeper's $78 a week is the Staff app's wage slip`);
await ev(`(() => { const q = TLX.lights.rec("finnkirka"); q.oil = 44; q.store = 60; q.on = true; q.kT = 2.5; TLX.state("lights").hT = GS.hour; save(); return true; })()`);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
await reload(); await warm(); await sleep(1200);
const rl = await J(`(() => { const s = TLX.state("staff"), m = s.crew.find(q => q.place === "lt:finnkirka"), q = TLX.lights.rec("finnkirka"); return { name: m && m.name, role: m && m.role, n: s.crew.length, kT: q.kT, oil: q.oil, w: TLX.lights.keeperWork("finnkirka"), keeper: (TLX.lights.keeper("finnkirka") || {}).name }; })()`);
ok(rl.name === "Aslak Sara" && rl.role === "keeper" && rl.keeper === "Aslak Sara" && rl.kT >= 2.4 && rl.kT < 5 && Math.abs(rl.oil - 44) < 2 && rl.w > 0.5, "I: after a reload the keeper is still on the books at the light, with the round clock and the tank: " + JSON.stringify(rl));
const old = JSON.parse(JSON.stringify(sv));
old.x.sys.staff.s.crew = old.x.sys.staff.s.crew.filter(q => q.place !== "lt:finnkirka"); old.x.sys.staff.s.apps = []; old.x.sys.staff.s.next = 0;
delete old.x.sys.lights.s.lamps.finnkirka.kT; delete old.x.sys.lights.s.lamps.finnkirka.kDid;
await reload(old); await warm(); await sleep(1500);
await ev(`tutSkip(); TLX.staff.tick(); TLX.lights.step(); true`); await sleep(300);
const ol = await J(`(() => { const s = TLX.state("staff"), q = TLX.lights.rec("finnkirka"); let err = ""; try { TABLET.toggle(true, "lights"); TABLET.render(); TABLET.toggle(true, "staff"); TABLET.render(); } catch (e) { err = String(e); } return { own: TLX.lights.owns("finnkirka"), on: q.on, oil: q.oil, kT: q.kT, keeper: TLX.lights.keeper("finnkirka"), vac: TLX.staff.vacancies().some(v => v.id === "lt:finnkirka"), app: s.apps.some(a => a.place === "lt:finnkirka" && a.role === "keeper"), err }; })()`);
ok(ol.own && ol.on && Math.abs(ol.oil - 44) < 2 && ol.kT >= 999 && ol.keeper === null && ol.vac && ol.app && !ol.err, "I: a 6.2b save (no keeper, no round clock) loads with the lamp as it was and the keeper's job posted: " + JSON.stringify(ol));
await sleep(300); await shot("x6k_i_reload");
await done(fails ? 1 : 0);
