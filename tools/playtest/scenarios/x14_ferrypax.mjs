// Expansion slice 14.5a: the ferry as a passenger (tlx-ferry.js). Asserts, exit 1 on a failure.
//   the option and the system are there; the boarding sign stands on the Kjøllefjord pier and Mehamn has a landing on
//   dry ground by the sea with a shelter and a Map pin; the timetable comes from the steamer's own calls (northbound
//   boards at the pier 08:15-09:30 and is at Mehamn 11:15; southbound boards at Mehamn 17:00-17:45 and lands at the
//   pier 19:45); outside a call the use control reads FERRY and tells the times; during one it reads BOARD, the first
//   press quotes ($80 with the sled within 40 m, $35 on foot), the second goes aboard: fade, the clock runs to her
//   arrival, you stand at the other port with the sled beside you, the fare is taken, the passage is counted and
//   saved; short of cash is refused, except a foot passenger at Mehamn; a cancelled call does not board; pad L3 and
//   the touch button work; nothing under the tablet (here and at the boatyard's door: beta 0332 #5 / 0336 #2); the
//   option off leaves no prompt, shelter or pin. NOSTILLS=1 skips the stills.
import { boot, ev, tap, sleep, done, reload, shot, padSet, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const STILLS = !process.env.NOSTILLS;
const still = async n => { if (STILLS) await shot(n); };
const recOn = () => ev(`(() => { window.__tsaw = []; if (!window.__trec) window.__trec = setInterval(() => { const a = (typeof TOASTQ !== "undefined" ? TOASTQ.map(t => t.msg || t[0] || String(t)) : []).concat([...document.querySelectorAll("#toasts > *")].map(e => e.textContent)); for (const m of a) if (!window.__tsaw.includes(m)) window.__tsaw.push(m); }, 80); return 1; })()`);
const clearToasts = () => ev(`(() => { if (typeof TOASTQ !== "undefined") TOASTQ.length = 0; document.getElementById("toasts").textContent = ""; window.__tsaw = []; return 1; })()`);
const toasts = async () => { await sleep(300); return J(`window.__tsaw || []`); };
const near = (a, b, e) => Math.abs(a - b) <= e;
// stand at a port's sign; the sled `sled` m inland of it (0 = leave it where it is)
const at = async (id, sled = 10) => { await ev(`(() => { const p = TLXF.ports().${id}; crashCancel(); FOOT.on = true; FOOT.g.visible = true; FOOT.x = p.x; FOOT.z = p.z; FOOT.yaw = p.yaw; FOOT.y = surf(p.x, p.z); FOOT.sp = 0;
  if (${sled}) { const x = p.x - p.sea[0] * ${sled}, z = p.z - p.sea[1] * ${sled}; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vy = P.vz = 0; P.safe = { x, z, yaw: P.yaw }; }
  recenter(p.x, p.z, true); return 1; })()`); await sleep(700); };
// the clock, moved quietly: the roads' own clock goes with it, the weather stays calm, every call on time
const hour = async h => { await ev(`(() => { GS.hour = ${h}; const r = TLX.state("roads"); if (r) r.h = GS.hour; STEAMER.memo = {}; return 1; })()`); await sleep(350); };
const use = () => J(`({ use: footUse(), hint: $("wnHint").textContent })`);
const me = () => J(`({ fx: FOOT.x, fz: FOOT.z, on: FOOT.on, px: P.x, pz: P.z, hour: GS.hour, cash: GS.cash, n: TLX.state("ferry").n, pass: !!TLXF.pass(), armed: TLXF.armed(), fade: (document.getElementById("tlxfFade") || { style: { opacity: "0" } }).style.opacity })`);
const waitPass = async () => { for (let i = 0; i < 80; i++) { await sleep(250); if (!(await ev(`!!TLXF.pass()`))) return true; } return false; };

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); WX.at = () => 0; GS.storm = 0; TLX.monday = () => {}; true`);
await hour(36); await recOn();

// ---- A. the option, the system, the two ports
const A = await J(`(() => { const p = TLXF.ports(), q = QUAY, m = SITES.find(s => s.id === "mehamn"); return { opt: TLX.options.find(o => o.id === "ferrypax") || null, on: TLX.on("ferrypax"), st: TLX.state("ferry"), fare: TLXF.PAX.fare, sled: TLXF.PAX.sled,
  q: p.quay && { top: quayTop(p.quay.x, p.quay.z), sea: isSea(p.quay.x, p.quay.z), ob: !!obNear(p.quay.x, p.quay.z, 1.5), ship: Math.hypot(p.quay.x - steamer.userData.x, p.quay.z - steamer.userData.z), grp: !!p.quay.grp },
  m: p.mehamn && { g: groundAt(p.mehamn.x, p.mehamn.z), sea: isSea(p.mehamn.x, p.mehamn.z), wet: isWater(p.mehamn.x, p.mehamn.z), ob: !!obNear(p.mehamn.x, p.mehamn.z, 1.5), vil: Math.hypot(p.mehamn.x - m.x, p.mehamn.z - m.z), toSea: (() => { for (let r = 0; r < 80; r += 2) if (isSea(p.mehamn.x + p.mehamn.sea[0] * r, p.mehamn.z + p.mehamn.sea[1] * r)) return r; return 99; })(), grp: !!(p.mehamn.grp && p.mehamn.grp.visible), obs: p.mehamn.obs.length, yard: yardAt(p.mehamn.x, p.mehamn.z), lane: yardAt(m.x + p.mehamn.sea[0] * 200, m.z + p.mehamn.sea[1] * 200), slope: slopeAt(p.mehamn.x, p.mehamn.z, 4), km: Math.hypot(m.x - depot.x, m.z - depot.z) / 1000 } }; })()`);
console.log("ports:", JSON.stringify(A.q), JSON.stringify(A.m));
ok(A.opt && A.on === true && /Mehamn/.test(A.opt.hint), "the option \"Ferry as a passenger\" is registered, on by default");
ok(A.st && A.st.n === 0 && A.fare === 35 && A.sled === 45, "the ferry system has its saved state (no passages yet); $35 a head, $45 for a sled on deck");
ok(A.q && A.q.top !== null && !A.q.sea && !A.q.ob && A.q.ship < 32 && A.q.grp, `the boarding sign stands on the pier's slab, clear of everything, ${A.q && A.q.ship.toFixed(0)} m from the ship's berth`);
ok(A.m && A.m.g >= 0.9 && !A.m.sea && !A.m.wet && !A.m.ob && A.m.slope < 0.1 && A.m.toSea < 40 && A.m.vil < 600 && A.m.grp && A.m.obs === 2, `Mehamn's landing is on level dry ground (${A.m && A.m.g.toFixed(1)} m up, ${A.m && A.m.toSea} m from the water, ${A.m && A.m.vil.toFixed(0)} m from the village), with its shelter solid`);
ok(A.m && A.m.yard > 0.3 && A.m.lane > 0.3, `the landing and the lane down to it are plowed (${A.m && [A.m.yard, A.m.lane].map(v => (+v).toFixed(2))})`);
const pinsOf = () => J(`(TABLET.layers.marks || []).flatMap(f => f() || []).filter(p => /FERRY/.test(p.name || ""))`);
const pins = await pinsOf();
console.log("pins:", JSON.stringify(pins));
ok(pins.length === 1 && /MEHAMN KAI/.test(pins[0].name) && pins[0].glyph === "F", "the Map has a pin on Mehamn's landing");

// ---- B. the timetable is the steamer's own
const B = await J(`({ q: TLXF.sailings("quay"), m: TLXF.sailings("mehamn"), sq: TLXF.status("quay").now, base: STEAMER.calls })`);
console.log("sailings quay:", JSON.stringify(B.q.slice(0, 2)), "mehamn:", JSON.stringify(B.m.slice(0, 2)));
ok(B.q.length && near(B.q[0].open, 56.25, 0.01) && near(B.q[0].dep, 57.5, 0.01) && near(B.q[0].arr, 59.25, 0.01) && !B.sq, "day 2 at noon: the next northbound boards at the pier 08:15-09:30 tomorrow and is at Mehamn 11:15; nothing is boarding now");
ok(B.m.length && near(B.m[0].open, 41, 0.01) && near(B.m[0].dep, 41.75, 0.01) && near(B.m[0].arr, 43.75, 0.01), "the southbound boards at Mehamn 17:00-17:45 and lands at Kjøllefjord 19:45, as she comes alongside");

// ---- C. outside a call: FERRY, and the times
await at("quay"); await clearToasts();
let u = await use(); console.log("quay, no ship:", JSON.stringify(u));
ok(u.use === "FERRY" && /ferry to Mehamn/.test(u.hint) && /08:15/.test(u.hint), "at the sign with no ship in: the use control reads FERRY, the hint says when she boards");
let m0 = await me(); await tap("KeyE"); let ts = await toasts(), m1 = await me();
console.log("toast:", ts.join(" | ").slice(0, 300));
ok(ts.some(t => /Next ferry for Mehamn/.test(t) && /08:15/.test(t) && /09:30/.test(t) && /11:15/.test(t) && t.includes("$35") && t.includes("$80")) && !m1.pass && !m1.armed && m1.cash === m0.cash, "the use key tells the next sailing, both fares, and takes nothing");
if (STILLS) { await hour(36); await sideCam(); await ev(`window.camOv = c => { const p = TLXF.ports().quay; c.position.set(p.x - p.sea[0] * 9 + p.sea[1] * 3, surf(p.x, p.z) + 2.6, p.z - p.sea[1] * 9 - p.sea[0] * 3); c.lookAt(p.x, surf(p.x, p.z) + 1.4, p.z); }; true`); await sleep(500); await still("f1_quay_sign"); await camOff(); }

// ---- D. the northbound, with the sled: quote, then aboard
await ev(`GS.cash = 500; true`); await hour(56.5); await at("quay", 10); await clearToasts();
u = await use(); console.log("quay, boarding:", JSON.stringify(u));
ok(u.use === "BOARD" && /northbound ferry for Mehamn/.test(u.hint) && /09:30/.test(u.hint) && u.hint.includes("$80") && /with the sled/.test(u.hint), "she is alongside: the use control reads BOARD, $80 with the sled 10 m off");
ok(await ev(`steamerAt(GS.hour).s === "in"`), "and the ship herself is alongside at the pier");
await tap("KeyE"); ts = await toasts(); m1 = await me();
console.log("quote:", ts.join(" | ").slice(0, 300));
ok(ts.some(t => /sails 09:30/.test(t) && /Mehamn about 11:15/.test(t) && t.includes("$80") && /again to go aboard/.test(t)) && m1.armed && !m1.pass && m1.cash === 500 && near(m1.hour, 56.5, 0.05), "the first press quotes the sailing and the fare and asks again: nothing taken, nobody moved");
await clearToasts(); await tap("KeyE"); await sleep(200); m1 = await me();
ok(m1.pass && m1.fade === "1" && m1.cash === 500, "the second press goes aboard: the screen goes dark, the fare is not taken yet");
ok(await waitPass(), "the passage ends");
ts = await toasts(); m1 = await me();
const D = await J(`(() => { const p = TLXF.ports().mehamn; return { d: Math.hypot(FOOT.x - p.x, FOOT.z - p.z), sled: Math.hypot(P.x - FOOT.x, P.z - FOOT.z), ob: !!obNear(P.x, P.z, 1.2), wet: isWater(P.x, P.z) || isSea(P.x, P.z), cur: !!VEH.cur, sp: Math.hypot(P.vx, P.vz) }; })()`);
console.log("arrived:", JSON.stringify(m1), JSON.stringify(D), ts.join(" | ").slice(0, 300));
ok(D.d < 1.5 && m1.on && near(m1.hour, 59.25, 0.02), `you stand on Mehamn's landing at 11:15 (hour ${m1.hour.toFixed(2)})`);
ok(D.sled > 2 && D.sled < 7 && !D.ob && !D.wet && D.sp < 0.1, `the sled is beside you (${D.sled.toFixed(1)} m), on clear dry ground`);
ok(m1.cash === 420 && m1.n === 1 && ts.some(t => /^Mehamn, 11:15/.test(t) && t.includes("$80") && /sled craned off/.test(t) && /southbound for Kjøllefjord boards here from 17:00 and sails 17:45/.test(t)), "$80 taken on arrival, the passage counted, the toast names the boat back");
await sleep(1200); m1 = await me(); ok(m1.fade === "0" && !m1.pass, "the screen is light again");
if (STILLS) { await hour(60); await ev(`camState.init = false; true`); await sleep(900); await still("f2_mehamn_arrived");
  await sideCam(); await ev(`window.camOv = c => { const p = TLXF.ports().mehamn, y = groundAt(p.x, p.z); c.position.set(p.x + p.sea[0] * 13 - p.sea[1] * 4, y + 3.2, p.z + p.sea[1] * 13 + p.sea[0] * 4); c.lookAt(p.x - p.sea[1] * 2.5, y + 1.2, p.z + p.sea[0] * 2.5); }; true`); await sleep(500); await still("f3_mehamn_from_sea");
  await ev(`window.camOv = c => { const p = TLXF.ports().mehamn, y = groundAt(p.x, p.z); c.position.set(p.x - p.sea[0] * 16 + p.sea[1] * 6, y + 4.5, p.z - p.sea[1] * 16 - p.sea[0] * 6); c.lookAt(p.x - p.sea[1] * 2.5, y + 1, p.z + p.sea[0] * 2.5); }; true`); await sleep(500); await still("f4_mehamn_from_land");
  await hour(70); await sleep(600); await still("f5_mehamn_night"); await camOff(); await hour(59.3); }

// ---- E. at Mehamn before her call: FERRY
await hour(59.3); await at("mehamn", 0); await clearToasts();
u = await use(); console.log("mehamn, no ship:", JSON.stringify(u));
ok(u.use === "FERRY" && /ferry to Kjøllefjord/.test(u.hint) && /17:00/.test(u.hint), "at Mehamn's sign before her call: FERRY, boards 17:00");

// ---- F. the southbound: short of cash with the sled, then on foot on what you have
await hour(65.2); await ev(`GS.cash = 50; true`); await at("mehamn", 10); await clearToasts();
u = await use();
ok(u.use === "BOARD" && /southbound ferry for Kjøllefjord/.test(u.hint) && /17:45/.test(u.hint) && u.hint.includes("$80"), "17:12 at Mehamn: BOARD, the southbound, $80 with the sled");
await tap("KeyE"); ts = await toasts(); m1 = await me();
ok(ts.some(t => /With the sled it is \$80 and you have \$50/.test(t) && /On foot it is \$35/.test(t)) && !m1.armed && !m1.pass && m1.cash === 50, "$50 with the sled by the sign: refused, and told what a foot passenger pays");
await ev(`(() => { const p = TLXF.ports().mehamn; P.x = p.x - p.sea[0] * 70; P.z = p.z - p.sea[1] * 70; P.y = surf(P.x, P.z) + 0.3; GS.cash = 20; return 1; })()`); await sleep(300); await clearToasts();
u = await use(); const sled0 = await J(`({ x: P.x, z: P.z })`);
ok(u.use === "BOARD" && u.hint.includes("$35") && !/with the sled/.test(u.hint), "the sled 70 m off: $35, on foot");
await tap("KeyE"); ts = await toasts();
ok(ts.some(t => /\$35 on foot/.test(t) && /your sled stays here/.test(t)), "the quote says the sled stays");
await clearToasts(); await tap("KeyE"); await sleep(200);
ok((await me()).pass && await waitPass(), "$20 in the pocket at Mehamn, on foot: taken aboard all the same");
ts = await toasts(); m1 = await me();
const F = await J(`(() => { const p = TLXF.ports().quay; return { d: Math.hypot(FOOT.x - p.x, FOOT.z - p.z), sx: P.x, sz: P.z, ship: steamerAt(GS.hour).s }; })()`);
console.log("back:", JSON.stringify(m1), JSON.stringify(F), ts.join(" | ").slice(0, 260));
ok(F.d < 1.5 && near(m1.hour, 67.75, 0.02) && F.ship === "in", "you step onto the Kjøllefjord pier at 19:45 with the ship alongside");
ok(m1.cash === 0 && m1.n === 2 && ts.some(t => /^Kjøllefjord, 19:45/.test(t) && t.includes("$20") && /all you had on you/.test(t)), "the purser took the $20 you had; two passages counted");
ok(near(F.sx, sled0.x, 0.5) && near(F.sz, sled0.z, 0.5), "the sled is still at Mehamn");

// ---- G. the southbound out of Kjøllefjord is no passage; short of cash at the pier is refused
u = await use();
ok(u.use === "FERRY", "the southbound lying at the pier is not a boat to Mehamn: FERRY, not BOARD");
await hour(80.5); await ev(`GS.cash = 10; true`); await at("quay", 0); await clearToasts();
u = await use(); await tap("KeyE"); ts = await toasts(); m1 = await me();
ok(u.use === "BOARD" && ts.some(t => /The fare is \$35\. You have \$10/.test(t)) && !m1.armed && !m1.pass && m1.cash === 10, "next morning at the pier with $10: refused, nothing taken");

// ---- H. a cancelled call does not board
await ev(`(() => { const c = steamerCalls(GS.hour - 2, GS.hour + 2, true).find(c => c.dir === "northbound"); c.state = "cancelled"; GS.cash = 500; return 1; })()`); await sleep(300); await clearToasts();
u = await use(); await tap("KeyE"); ts = await toasts();
console.log("cancelled:", JSON.stringify(u), ts.join(" | ").slice(0, 260));
ok(u.use === "FERRY" && ts.some(t => /is cancelled for weather/.test(t) && /Next ferry for Mehamn/.test(t)) && !(await me()).pass, "the call cancelled for weather: FERRY, the toast says so and names the next one");

// ---- I. a pad and the touch button
await hour(104.5); await ev(`GS.cash = 500; true`); await at("quay", 0); await clearToasts();
await padSet({ 10: 1 }); await sleep(150); await padSet({}); ts = await toasts(); m1 = await me();
ok(m1.armed && ts.some(t => /again to go aboard/.test(t)), "pad L3 at the sign: the quote");
await sleep(8600); ok(!(await me()).armed, "the quote lapses after 8 s: a later stray press starts over");
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(800);
const tb = await J(`(() => { const b = $("tcUse"); return { txt: b.textContent, shown: !b.hidden && getComputedStyle(b).display !== "none", hint: $("wnHint").textContent }; })()`);
console.log("touch:", JSON.stringify(tb));
ok(/BOARD/.test(tb.txt) && tb.shown && /tap/i.test(tb.hint), "touch: the use button wears BOARD and the hint says tap");
const tp = () => ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return 1; })()`);
await clearToasts(); await tp(); await sleep(500); ok((await me()).armed, "a tap on it quotes");
await tp(); await sleep(250); ok((await me()).pass && await waitPass(), "a second tap goes aboard and the passage ends");
m1 = await me(); ok(m1.cash === 465 && m1.n === 3 && near(m1.hour, 107.25, 0.02), "on foot by touch: $35, at Mehamn 11:15");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(400);

// ---- J. nothing under the tablet, here or at the boatyard's door
await hour(113.2); await at("mehamn", 0);
ok((await use()).use === "BOARD", "at Mehamn at 17:12: BOARD");
await ev(`TABLET.toggle(true, "map"); true`); await sleep(600);
ok((await use()).use === null, "with the tablet up the sign's use control does nothing");
await ev(`TABLET.toggle(false); true`); await sleep(500);
if (await ev(`!!(window.TLXB && TLXB.yard())`)) {
  await ev(`(() => { const y = TLXB.yard(); FOOT.x = y.door.x; FOOT.z = y.door.z; FOOT.y = TLXB.floorAt(FOOT.x, FOOT.z) ?? surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`); await sleep(600);
  const y0 = (await use()).use; await ev(`TABLET.toggle(true, "map"); true`); await sleep(600); const y1 = (await use()).use; await ev(`TABLET.toggle(false); true`); await sleep(400);
  ok(y0 === "BOATYARD" && y1 === null, `the boatyard's door: ${y0} with the tablet down, nothing with it up (beta 0332 #5 / 0336 #2)`);
}

// ---- K. the option off leaves nothing; on again brings it back
await at("mehamn", 0);
await ev(`TLX.setOn("ferrypax", false); true`); await sleep(500);
const K = await J(`(() => { const p = TLXF.ports().mehamn; return { use: footUse(), grp: p.grp.visible, ob: !!obNear(p.obs[0].x, p.obs[0].z, 0.5), board: TLXF.board("mehamn"), pass: !!TLXF.pass() }; })()`);
ok(K.use === null && K.grp === false && !K.ob && K.board === false && !K.pass && (await pinsOf()).length === 0, "option off: no prompt, no shelter, nothing solid, no pin, no boarding");
await ev(`TLX.setOn("ferrypax", true); true`); await sleep(500);
const K2 = await J(`(() => { const p = TLXF.ports().mehamn; return { use: footUse(), grp: p.grp.visible, ob: !!obNear(p.obs[0].x, p.obs[0].z, 0.5) }; })()`);
ok(K2.use === "BOARD" && K2.grp === true && K2.ob, "option on again: the shelter and the prompt are back");

// ---- L. the passages are saved
await ev(`save(); true`); await reload(); await sleep(600);
ok(await ev(`TLX.state("ferry").n`) === 3, "after a reload the three passages are still counted");

console.log(fails ? `FAILS: ${fails}` : "all ok");
await done(fails ? 1 : 0);
