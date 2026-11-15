// Slice 6.2a (G4): the lamp at Slettnes once the station is yours (tlx-lights.js): oil tank, paraffin drums hauled
// from the quay, the Lights app, Kystverket's Monday stipend by lamp hours. Asserts, exit 1 on a failure.
//  A. before you buy: no Lights app, the lighthouse flashes as it always did, nothing to do at the rack or the stair.
//  B. buying the station: the lamp is lit with a part-full tank, the Lights app appears with its card.
//  C. the lamp burns only while the sun is down (lit hours = dark hours, 2.5 L each); a full tank lasts about 3 days.
//  D. the tank runs dry: the lamp goes out and STAYS out (the tower stops flashing), an alert, dark hours earn nothing.
//  E. ordering drums in the app: blocked without the money, $45 each, a claimed pickup at the quay in the Jobs list,
//     a cap on how many.
//  F. hauling: stopping at the quay loads them (parcel slots), stopping at the lighthouse rolls them into the oil
//     store with no pay and no delivery counted.
//  G. in the tower room: PUMP at the rack (keyboard) moves a drum into the tank; LIGHT at the stair (pad L3) relights
//     the lamp and the tower flashes again; touch: the use button reads PUMP, starts it, STOP stops it with no oil
//     moved; away from the rack a dirty floor still offers SWEEP.
//  H. Monday: the stipend is $12 x lamp hours, with a statement in the app.
//  I. the lamp survives a reload; a drum that was aboard waits at the quay again; a drum lost with the load is gone;
//     a save from before 6.2a with the station owned gets its lamp.
import { boot, reload, ev, tap, sleep, shot, sideCam, camOff, done, padSet, padOff, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(80); } return !!(await ev(expr)); }
const Lr = () => J(`Object.assign({}, TLX.lights.rec("slettnes"), { quay: TLX.lights.rec("slettnes").q, out: TLX.lights.out("slettnes") })`);
// run the clock on by `hours` in `step`-hour steps, far from the station
const pass = (hours, step = 0.5) => ev(`(() => { for (let t = 0; t < ${hours} - 1e-9; t += ${step}) { GS.hour += ${step}; TLX.lights.step(); } return true; })()`);
const goAway = () => ev(`(() => { if (INT.on) intGoOut(); const l = TLX.prop.listing("slettnes"); crashCancel(); FOOT.on = true; FOOT.x = l.at.x - 700; FOOT.z = l.at.z + 500; FOOT.y = surf(FOOT.x, FOOT.z); INT.cd = 0; return true; })()`);
const U = () => J(`(() => { const u = footUse(); return { use: u, hint: $("wnHint").textContent, tE: $("tcUse").hidden ? null : $("tcUse").textContent, on: INT.on, pump: TLX.lights.PUMP.on, sw: TLX.prop.SW.on }; })()`);
const page = () => ev(`$("tabV").textContent`);
const app = async () => { await ev(`TABLET.toggle(false); TABLET.toggle(true, "lights"); TABLET.render(); true`); await sleep(400); return page(); };
async function stepIn(room) {
  await ev(`(() => { if (INT.on) intGoOut(); const b = INT.beacons.find(q => q.cab.id === "slettnes:${room}"); crashCancel(); FOOT.on = true; FOOT.x = b.x; FOOT.z = b.z; FOOT.y = surf(b.x, b.z); FOOT.sp = FOOT.fwd = 0; INT.cd = 0; INT.ph = ""; camState.init = false; return true; })()`);
  const inside = await until(`INT.on && INT.cab.id === "slettnes:${room}"`, 8); await sleep(600); return inside;
}
const at = (x, z, yaw = 0) => ev(`(() => { INT.px = ${x}; INT.pz = ${z}; FOOT.yaw = ${yaw}; FOOT.sp = FOOT.fwd = 0; return true; })()`);
const RACK = [-0.75, 1.75], STAIR = [1.2, 0.2], MID = [0, -1.2];
// is the tower's lamp seen flashing at all over a few flash periods?
async function flashes() { let n = 0; for (let i = 0; i < 40; i++) { if (await ev(`SITES.find(s => s.type === "relay").blink.visible`)) n++; await sleep(120); } return n; }

const warm = () => ev(`window.__warm = window.__warm || setInterval(() => { GS.warmth = 100; }, 300); true`);   // stood outdoors for minutes: never let the cold black the walker out mid-check
await boot(); await warm();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 20000; GS.apps.realestate = 1; TLX.state("staff").apps = []; TLX.state("staff").next = 1e9; true`);
await sleep(1200);
console.log("sled parked out of the way", JSON.stringify(await park()));   // off the quay: a sled standing there loads claimed drums at once

// ---- A: before you buy
const a0 = await J(`({ reg: !!TABLET.byId.lights, hidden: TABLET.byId.lights.hidden(), out: TLX.lights.out("slettnes"), lamps: Object.keys(TLX.state("lights").lamps).length, api: typeof TLX.api.sunEl })`);
ok(a0.reg && a0.hidden && !a0.out && a0.lamps === 0 && a0.api === "function", "A: no Lights app before you own a light: " + JSON.stringify(a0));
ok((await flashes()) > 0, "A: Kystverket's lamp flashes as it always did");
ok(await stepIn("tower"), "A: into the tower room (for sale, have a look)");
await at(...RACK); await sleep(250); let s = await U(); const aRack = s.use;
await at(...STAIR); await sleep(250); s = await U();
ok(aRack === null && s.use === null, "A: not yours: nothing to do at the rack or the stair");

// ---- B: buy the station
await goAway(); await sleep(300);
const bought = await ev(`TLX.prop.buy("slettnes")`); await sleep(1500);
let r = await Lr();
ok(bought && r.on && Math.abs(r.oil - 45) < 0.5 && r.store === 0 && !r.out, `B: the station is yours and its lamp is lit with ${r.oil.toFixed(0)} L in the tank`);
let txt = await app();
ok(!(await ev(`TABLET.byId.lights.hidden()`)) && /LIGHTS · KYSTVERKET/.test(txt) && /Slettnes fyr/.test(txt) && /Tank 45 of 180 L · about 18 lamp hours/.test(txt) && /\$12 a lamp hour/.test(txt) && /ORDER A DRUM/.test(txt) && /Oil store: empty/.test(txt), "B: the Lights app shows the lamp, the tank and the drum order");
ok(/LIT|SUN VALVE SHUT/.test(txt) && !/DARK/.test(txt), "B: the card says the lamp is lit (or resting by day)");
await shot("x6l_b_app");
await ev(`TABLET.toggle(false); true`); await sleep(300);

// ---- C: it burns while the sun is down
await ev(`(() => { const q = TLX.lights.rec("slettnes"); q.oil = 180; q.lit = 0; q.need = 0; GS.hour = Math.ceil(GS.hour / 24) * 24; TLX.state("lights").hT = GS.hour; return true; })()`);
const darkH = await ev(`(() => { let n = 0; for (let t = 0.125; t < 24; t += 0.25) if (TLX.lights.dark(GS.hour + t)) n += 0.25; return n; })()`);
await pass(24, 0.25); r = await Lr();
ok(darkH > 6 && Math.abs(r.need - darkH) < 0.6 && Math.abs(r.lit - r.need) < 0.01 && Math.abs((180 - r.oil) - r.lit * 2.5) < 0.05, `C: over a day the sun is down ${darkH} h: the lamp burned ${r.lit.toFixed(2)} h and ${(180 - r.oil).toFixed(1)} L (2.5 L an hour)`);
ok(180 / 2.5 / 24 === 3, "C: a full tank is three game days of burning");
// one big clock jump burns the same as small steps
await ev(`(() => { const q = TLX.lights.rec("slettnes"); q.oil = 180; q.lit = 0; q.need = 0; GS.hour = Math.ceil(GS.hour / 24) * 24; TLX.state("lights").hT = GS.hour; GS.hour += 24; TLX.lights.step(); return true; })()`);
const rj = await Lr();
ok(Math.abs(rj.lit - darkH) < 0.6 && rj.on, `C: one 24 h jump of the clock burns the same (${rj.lit.toFixed(2)} h)`);

// ---- D: the tank runs dry
await ev(`(() => { const q = TLX.lights.rec("slettnes"); q.oil = 10; q.lit = 0; q.need = 0; q.low = false; window.__n = []; const o = TABLET.notify.bind(TABLET); TABLET.notify = n => { window.__n.push(n.title + " | " + n.body); return o(n); }; return true; })()`);
await pass(48, 0.25); r = await Lr();
const notes = await J(`window.__n`);
ok(!r.on && r.oil === 0 && r.out && Math.abs(r.lit - 4) < 0.01 && r.need > r.lit + 4, `D: 10 L is 4 lamp hours: then the lamp is out (lit ${r.lit.toFixed(2)} h of ${r.need.toFixed(1)} dark)`);
ok(notes.some(n => /oil low/.test(n)) && notes.some(n => /Slettnes fyr is dark/.test(n) && /haul a drum out/.test(n)), "D: a low-oil warning, then the alert that it's dark: " + notes.join(" || "));
const fl = await flashes(), dbg = await J(`(() => { const s = SITES.find(q => q.type === "relay"); return { vis: s.blink.visible, beam: s.beam.intensity, out: TLX.lights.out("slettnes"), dead: !!GS.dead, card: !!SEASON.card, gc: gameClock }; })()`);
console.log("D dbg", fl, JSON.stringify(dbg));
ok(fl === 0 && dbg.beam === 0, "D: the tower no longer flashes");
txt = await app();
ok(/DARK/.test(txt) && /dry/.test(txt) && /The lamp is out, the tank is dry and the oil store is empty/.test(txt) && (await ev(`TABLET.byId.lights.badge()`)) === "!", "D: the app says so, with a badge");
await shot("x6l_d_dark");

// ---- E: order drums
const blocked = await J(`(() => { GS.cash = 30; TABLET.render(); const b = document.querySelector('#tabV [data-act="lord:slettnes"]'); const bl = b.classList.contains("blocked"); b.click(); return { bl, cash: GS.cash, quay: TLX.lights.rec("slettnes").q }; })()`);
ok(blocked.bl && blocked.cash === 30 && blocked.quay === 0, "E: ORDER A DRUM is blocked with $30 and takes nothing");
await ev(`GS.cash = 1000; TABLET.render(); true`); await sleep(200);
const ord = await J(`(() => { const d0 = GS.delivered; for (let i = 0; i < 3; i++) document.querySelector('#tabV [data-act="lord:slettnes"]').click(); const cl = GS.claims.filter(j => j.oil); return { cash: GS.cash, quay: TLX.lights.rec("slettnes").q, n: cl.length, from: cl[0] && cl[0].from === depot, dest: cl[0] && cl[0].dest.type, rows: jobsList().filter(q => /Paraffin drum/.test(q.title)).map(q => q.title + " / " + q.meta), d0 }; })()`);
ok(ord.cash === 1000 - 135 && ord.quay === 3 && ord.n === 3 && ord.from && ord.dest === "relay", `E: three drums at $45: $${1000 - ord.cash} paid, three claims from the quay to the lighthouse`);
ok(ord.rows.length === 3 && /Pick up: Paraffin drum/.test(ord.rows[0]) && /waiting at/.test(ord.rows[0]), "E: the Jobs list tracks them: " + ord.rows[0]);
txt = await page(); ok(/3 drums paid for, at the quay or aboard/.test(txt), "E: the card counts them");
const cap = await J(`(() => { for (let i = 0; i < 6; i++) TLX.lights.order("slettnes"); return { quay: TLX.lights.rec("slettnes").q, n: GS.claims.filter(j => j.oil).length, cash: GS.cash }; })()`);
ok(cap.quay === 6 && cap.n === 6 && cap.cash === 1000 - 270, "E: six on order is the limit: " + JSON.stringify(cap));
await ev(`(() => { const s = TLX.state("lights"); GS.claims = GS.claims.filter(j => !j.oil).concat(GS.claims.filter(j => j.oil).slice(0, 3)); TLX.lights.rec("slettnes").q = 3; TABLET.toggle(false); return true; })()`);

// ---- F: haul them out
const slots = await ev(`(() => { GS.own.sled = SLEDS[SLEDS.length > 3 ? 3 : SLEDS.length - 1].id; restat(); return ST.slots; })()`);
const want = Math.min(3, slots);
await ev(`(() => { crashCancel(); FOOT.on = false; VEH.cur = null; GS.load = []; P.x = depot.x - 5; P.z = depot.z + 3; P.y = surf(P.x, P.z); P.vx = P.vz = 0; GS.fuel = GS.cap; camState.init = false; return true; })()`);
const loaded = await until(`GS.load.filter(j => j.oil).length >= ${want}`, 30); await sleep(300);
let hl = await J(`({ ab: GS.load.filter(j => j.oil).length, cl: GS.claims.filter(j => j.oil).length, quay: TLX.lights.rec("slettnes").q, row: jobsList().filter(q => /Paraffin drum/.test(q.title)).map(q => q.title)[0] })`);
ok(loaded && hl.ab === want && hl.ab + hl.cl === 3 && hl.quay === 3, `F: stopped at the quay, ${hl.ab} of 3 drums go on (${slots} parcel slots); still 3 paid for (${hl.row})`);
await shot("x6l_f_loaded");
const before = await J(`({ cash: GS.cash, del: GS.delivered })`);
await ev(`(() => { window.__t = []; const s = SITES.find(q => q.type === "relay"); P.x = s.x - 3; P.z = s.z + 8; P.y = surf(P.x, P.z); P.vx = P.vz = 0; camState.init = false; return true; })()`);
const landed = await until(`GS.load.filter(j => j.oil).length === 0`, 20); await sleep(900);
r = await Lr();
const toasts = await J(`[...document.querySelectorAll("#toasts > *")].map(e => e.textContent).concat(typeof TOASTQ !== "undefined" ? TOASTQ.map(t => t.msg || t.text || String(t)) : [])`);
const afterD = await J(`({ cash: GS.cash, del: GS.delivered })`);
ok(landed && r.store === want * 60 && r.quay === 3 - want && afterD.cash === before.cash && afterD.del === before.del, `F: at the lighthouse ${want} drums roll into the oil store (${r.store} L); no pay, no delivery counted; ${r.quay} still at the quay`);
ok(toasts.some(t => /rolled into the oil store at Slettnes/.test(t)), "F: and the toast says so: " + (toasts.find(t => /oil store/.test(t)) || toasts.join(" | ")));
await ev(`(() => { GS.claims = GS.claims.filter(j => !j.oil); TLX.lights.rec("slettnes").q = 0; TLX.lights.rec("slettnes").store = 120; return true; })()`);

// ---- G: the tower room: pump, light
await ev(`(() => { for (const id of ["house", "tower"]) { const q = TLX.prop.rec("slettnes:" + id); q.grit = 50; q.dust = 0; } TLX.state("prop").kit = 8; FOOT.on = true; return true; })()`);
ok(await stepIn("tower"), "G: into the tower room");
await at(...MID); await sleep(300); s = await U();
ok(s.use === "SWEEP", "G: mid-room with a gritty floor the use control is still SWEEP (" + s.hint + ")");
await at(...STAIR); await sleep(300); s = await U();
ok(s.use === "LAMP" && /The lamp is out and the tank is dry: pump a drum in at the rack first/.test(s.hint), "G: at the stair with a dry tank: " + s.hint);
await at(...RACK); await sleep(300); s = await U();
ok(s.use === "PUMP" && /E: pump a drum into the tank · tank 0 of 180 L · 2 full drums here/.test(s.hint), "G: at the rack: PUMP (" + s.hint + ")");
await tap("KeyE"); await sleep(500);
const p1 = await J(`({ on: TLX.lights.PUMP.on, slow: INT.slow, yaw: FOOT.yaw })`); s = await U();
ok(p1.on && p1.slow === 0 && s.use === "STOP" && /Pumping \d+%/.test(s.hint), "G: the use key starts the hand pump; you stand at it (" + s.hint + ")");
await sideCam("[INT.room.g.position.x + INT.px, (INT.py || 0) + 1.0, INT.room.g.position.z + INT.pz]", 2.2, 0.6, 2.4); await shot("x6l_g_pump"); await sleep(250); await shot("x6l_g_pump2"); await camOff();
await until(`!TLX.lights.PUMP.on`, 9); await sleep(300); r = await Lr();
ok(r.oil === 60 && r.store === 60 && !r.on && (await ev(`INT.slow`)) === 1, `G: one drum pumped in: tank ${r.oil} L, ${r.store} L left in the store; the lamp is still out`);
await at(...STAIR); await sleep(300); s = await U();
ok(s.use === "LIGHT" && /climb up and light the lamp · tank 60 of 180 L/.test(s.hint), "G: at the stair now: LIGHT (" + s.hint + ")");
await shot("x6l_g_stair");
await padSet({ 10: 1 }); await sleep(350); await padSet({}); await sleep(400);
r = await Lr(); const padHint = (await U()).hint;
ok(r.on && !r.out, "G: Xbox L3 at the stair lights the lamp");
await padOff(); await sleep(200);
ok((await flashes()) > 0, "G: and the tower flashes again");
await at(...STAIR); await sleep(250); s = await U();
ok(s.use === "SWEEP", "G: lit: the stair has nothing more to offer (use " + s.use + ")");
// touch
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(500);
await at(...RACK); await sleep(350); s = await U();
ok(s.tE === "PUMP" && /tap PUMP/.test(s.hint), "G: touch: the use button reads PUMP (" + s.hint + ")");
const tapUse = () => ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`);
await tapUse(); await sleep(500); s = await U();
ok(s.pump && s.tE === "STOP", "G: tapping it starts the pump; the button reads STOP");
await tapUse(); await sleep(400); s = await U(); r = await Lr();
ok(!s.pump && Math.abs(r.oil - 60) < 1 && r.store === 60 && s.tE === "PUMP", "G: STOP stops it with no oil moved");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(200);
// a full tank: nothing to pump
await ev(`TLX.lights.rec("slettnes").oil = 180; true`); await sleep(250); s = await U();
ok(s.use === "SWEEP" || s.use === "DUST", "G: with a full tank the rack offers no pump (use " + s.use + ")");

// ---- H: Monday
await goAway();
await ev(`(() => { const q = TLX.lights.rec("slettnes"); q.oil = 180; q.lit = 0; q.need = 0; q.on = true; TLX.state("lights").hT = GS.hour; return true; })()`);
const pay = await J(`(() => { for (let t = 0; t < 48; t += 0.25) { GS.hour += 0.25; TLX.lights.step(); } TLX.state("lights").last = []; const c = GS.cash, q = TLX.lights.rec("slettnes"), lit = q.lit; TLX.lights.monday({ label: "Mon 8 Dec" }); return { got: GS.cash - c, lit, left: q.lit, need: q.need, last: TLX.state("lights").last }; })()`);
ok(pay.lit > 12 && pay.got === Math.round(pay.lit * 12) && pay.left === 0 && pay.need === 0 && pay.last.length === 1 && pay.last[0].pay === pay.got && pay.last[0].d === "Mon 8 Dec", `H: Monday pays $12 x ${pay.lit.toFixed(1)} lamp hours = $${pay.got}, with a statement ${JSON.stringify(pay.last[0])}`);
const wk = await ev(`(() => { let n = 0; for (let t = 0.125; t < 168; t += 0.25) if (TLX.lights.dark(GS.hour + t)) n += 0.25; return n; })()`);
console.log(`H: this week has ${wk} dark hours: a lamp kept burning earns $${Math.round(wk * 12)} and burns ${Math.round(wk * 2.5)} L (${Math.ceil(wk * 2.5 / 60)} drums, $${Math.ceil(wk * 2.5 / 60) * 45})`);
txt = await app();
ok(/Stipend statements/.test(txt) && /Mon 8 Dec/.test(txt) && /PAID/.test(txt), "H: the app lists the statement");
await shot("x6l_h_statement"); await ev(`TABLET.toggle(false); true`); await sleep(300);

// ---- I: saved
console.log("sled parked out of the way", JSON.stringify(await park("depot.x + 500", "depot.z - 400")));
await ev(`(() => { const q = TLX.lights.rec("slettnes"), s = TLX.state("lights"); q.oil = 77; q.store = 60; q.lit = 5; q.need = 6; GS.cash = 500; TLX.lights.order("slettnes"); TLX.lights.order("slettnes"); const c = GS.claims.find(j => j.oil); GS.claims.splice(GS.claims.indexOf(c), 1); GS.load.push(c); TLX.lights.sync(); save(); return true; })()`);
const pre = await J(`({ quay: TLX.lights.rec("slettnes").q, ab: GS.load.filter(j => j.oil).length, cl: GS.claims.filter(j => j.oil).length })`);
await reload(); await warm(); await sleep(900);
const sv = await J(`(() => { const q = TLX.lights.rec("slettnes"), s = TLX.state("lights"), ab0 = GS.load.filter(j => j.oil).length + GS.claims.filter(j => j.oil).length * 0; TLX.lights.sync(); return { oil: q.oil, store: q.store, on: q.on, lit: q.lit, quay: q.q, ab: GS.load.filter(j => j.oil).length, cl: GS.claims.filter(j => j.oil).length, last: s.last.length, own: TLX.lights.owns("slettnes") }; })()`);
ok(pre.quay === 2 && pre.ab === 1 && pre.cl === 1, "I: before the reload: one drum aboard, one at the quay " + JSON.stringify(pre));
ok(sv.own && Math.abs(sv.oil - 77) < 1.5 && sv.store === 60 && sv.on && sv.lit >= 5 && sv.last >= 1 && sv.quay === 2 && sv.ab + sv.cl === 2, "I: the lamp, its oil, the week and the statement survive a reload; both drums are waiting to be picked up again: " + JSON.stringify(sv));
// a drum aboard goes down with the load
await ev(`tutSkip(); true`); await park("depot.x + 500", "depot.z - 400");
await ev(`(() => { GS.load = GS.load.filter(j => !j.oil); GS.claims = GS.claims.filter(j => !j.oil); TLX.lights.sync(); TLX.lights.rec("slettnes").q = 2; TLX.lights.sync(); const c = GS.claims.find(j => j.oil); GS.claims.splice(GS.claims.indexOf(c), 1); GS.load.push(c); TLX.lights.sync(); GS.load = []; TLX.lights.sync(); return true; })()`);
const lost = await J(`({ quay: TLX.lights.rec("slettnes").q, cl: GS.claims.filter(j => j.oil).length })`);
ok(lost.quay === 1 && lost.cl === 1, "I: a drum lost with the load is gone; the one at the quay still waits: " + JSON.stringify(lost));
const old = await J(`(() => { save(); const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); delete s.x.sys.lights; return s; })()`);
await reload(old); await warm(); await sleep(1800);
const ov = await J(`(() => { const q = TLX.lights.rec("slettnes"), s = TLX.state("lights"); return { own: TLX.lights.owns("slettnes"), oil: q.oil, on: q.on, store: q.store, quay: q.q, hidden: TABLET.byId.lights.hidden() }; })()`);
ok(ov.own && ov.on && ov.oil > 40 && ov.oil <= 45 && ov.store === 0 && ov.quay === 0 && !ov.hidden, "I: a save from before 6.2a with the station owned gets its lamp, lit: " + JSON.stringify(ov));
await done(fails ? 1 : 0);
