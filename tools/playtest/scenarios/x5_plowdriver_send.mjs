// Expansion slice 5.4c2a: SEND SOMEONE to a bogged plow driver (tlx-plow.js v30).
// Asserts, exit 1 on a failure.
//   A two roads, two drivers with their own trucks. One bogs: the ping names the second way out, their Staff card has
//     PAY A TOW and SEND <NAME> with the time. Sent: no money, the bogged record's `help` and the helper's `aid`, the
//     button reads <NAME> IS ON THE WAY, a tow cannot be paid on top, the Jobs row / both cards / the hailed driver say
//     so, the helper has a Map pin that starts where their truck stood. Snow on the helper's own road waits. At the
//     hour: the bogged driver plows on (no second bog), the helper heads in, is back, and then does their own road.
//   B help that takes longer than the 6 h: the bogged driver does not walk home while help is coming.
//   C what can go wrong: a tow already paid (no SEND); the helper let go on the way (told nobody is coming, buttons
//     back); the bogged driver let go (the helper turns round and comes in); an abandoned truck (no SEND); a helper who
//     is out on their own road (no SEND).
//   D the helper in a truck of YOURS: it leaves its spot, burns your diesel there and back, nothing to press on their
//     card while away, a reload mid-way keeps all of it (the truck still out), back on its own spot; too little diesel:
//     not offered, and says why.
//   E a night's sleep covers the whole errand; junk in the saved fields is cleaned.
// Still (OUT): the bogged driver's Staff card with the SEND button.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };

const SETUP = `TLXPL.PDR.wayMax = 0; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__q = (h, st) => { st = st || 0.5; for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__drv = (id, work, xp, hap) => { const m = TLX.staff.at("plow:" + id); m.tr.work = work; m.tr.temper = 0; m.xpReal = xp; m.hap = hap; m.mood = 0; m.wage = TLX.staff.fair(m); m.paidTo = GS.hour; return TLXPL.pdr.skill(m, id); };
  window.__clean = id => { TLXR.setSnow(id, 0); const c = TLX.state("plow").con[id]; c.strikes = 0; c.cover = false; c.due = {}; c.clean = true; TLXPL.con.step(); return true; };
  window.__tk = uid => { const r = TLXV.state().owned.find(q => q.uid === uid); return r ? { out: r.out || null, fuel: r.fuel, x: r.x, z: r.z } : null; };
  window.__first = id => { const m = TLX.staff.at("plow:" + id); return m ? String(m.name).split(" ")[0] : ""; };
  if (!window.__rh) window.__rh = setInterval(() => { try { TLX.state("roads").h = GS.hour; } catch (e) { } }, 30);
  return true; })()`;
const SEG = 400;
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
const toasts = async () => { await sleep(300); return J(`window.__tsaw || []`); };
const clearNotes = () => ev(`TABLET.log.length = 0; true`);
const notes = () => J(`TABLET.log.map(n => n.title + " | " + n.body)`);
const btns = () => J(`[...$("tabS").querySelectorAll("[data-act^='stx:']")].map(b => ({ act: b.dataset.act, t: b.textContent, off: b.disabled }))`);

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; true`);
const ids = await J(`TLXPL.con.routes().map(r => r.id)`);
const RID = "dyfjord", HID = ids.find(i => i !== RID), rid = JSON.stringify(RID), hid = JSON.stringify(HID);
console.log("   roads", JSON.stringify(ids), "bogged on", RID, "helper from", HID);
const pdr = (id = RID) => J(`__pdr(${JSON.stringify(id)})`);
const km = v => ev(`TLXPL.PDR.bog.km = ${v}; true`);
const mood = () => ev(`TLX.staff.at("plow:" + ${rid}).mood`);
const acts = (id = RID) => J(`TLXPL.pdr.acts(TLX.staff.at("plow:" + ${JSON.stringify(id)}), TLXPL.pdr.places().find(p => p.road === ${JSON.stringify(id)}))`);
let I = 1, IH = 1, UID = "", uid = "";
const hire = async (road, kit) => {
  const r = JSON.stringify(road);
  await ev(`TLXPL.PDR.mine = ${kit === "mine" ? 1 : 0}; (() => { const m = TLX.staff.at("plow:" + ${r}); if (m) TLX.staff.letGo(m.id); TLXPL.con.step(); return true; })()`); await sleep(200);
  const id = await ev(`(() => { const S = TLX.state("staff"); S.apps = S.apps.filter(a => a.place !== "plow:" + ${r}); const a = TLX.staff.post({ id: "plow:" + ${r}, role: "plowdriver" }); a.tr.honest = true; a.xp = a.xpReal = 10; a.exp = GS.hour + 400; return a.id; })()`);
  const h = await ev(`TLX.staff.hire(${JSON.stringify(id)})`);
  await ev(`__drv(${r}, 1, 10, 70); TLXPL.con.step(); true`); await sleep(300);
  return h === true;
};
const setOut = async v => { await ev(`TLXR.setSnow(${rid}, ${v}, ${I}); TLXPL.con.step(); true`); await ev(`__q(0.74, 0.37)`); let q = await pdr(); for (let n = 0; n < 8 && q.st === "home"; n++) { await ev(`__q(0.1, 0.1)`); q = await pdr(); } return q; };
const until = async (pred, hrs = 1.2, id = RID) => { let q = await pdr(id); for (let t = 0; t < hrs && !pred(q); t += 0.04) { await ev(`__q(0.04, 0.02)`); q = await pdr(id); } return q; };
const bogNow = async () => { await ev(`__clean(${rid}); __clean(${hid}); __drv(${rid}, 1, 10, 70); true`); await ev(`__q(1.6, 0.1)`); await km(1e9); const q0 = await setOut(0.9); return q0.st === "stuck" ? q0 : until(q => q.st === "stuck" || q.st === "home"); };
const send = () => ev(`TLXPL.pdr.send(${rid}, ${hid})`);

let T0 = 0, LEN = 0;
await section("A two drivers with their own trucks: one bogs, the other is sent", async () => {
  await ev(`TLXV.buy("plowtruck"); true`); await sleep(600);
  UID = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`); uid = JSON.stringify(UID);
  await ev(`TLXPL.con.sign(${rid}); TLXPL.con.sign(${hid}); TLX.staff.tick(); true`); await sleep(300);
  const pick = r => ev(`(() => { const r = __rt(${r}); for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && (i + 1) * 400 + 40 <= r.len) return i; return -1; })()`);
  I = await pick(rid); IH = await pick(hid);
  ok(I >= 1 && IH >= 1, `a whole stretch on each road: ${I}, ${IH}`);
  ok((await hire(RID, "own")) && (await hire(HID, "own")), "a driver with their own truck on each road");
  await clearNotes();
  let q = await bogNow();
  ok(q.st === "stuck" && !q.help, "the driver on the Dyfjord road is bogged");
  const ping = (await notes()).find(t => / is stuck \| /.test(t)) || "";
  console.log("   note:", ping);
  ok(/PAY A TOW on their card in the Staff app \(\$\d+\), SEND another driver of yours from the same card \(free, but slower\), or leave them/.test(ping), "the ping names both ways out");
  const H = await ev(`__first(${hid})`), B = await ev(`__first(${rid})`);
  await ev(`TABLET.toggle(true, "staff")`); await sleep(500);
  let b = await btns(); console.log("  ", JSON.stringify(b));
  const sb = b.find(x => x.act.endsWith(":s" + HID));
  ok(b.length === 2 && /^PAY A TOW · \$\d+$/.test(b[0].t) && sb && new RegExp("^SEND " + H.toUpperCase() + " · \\d+ (h|min)$").test(sb.t) && !sb.off, "their Staff card: PAY A TOW and " + (sb && sb.t));
  if (!NOSTILLS) { await sleep(300); await shot("s1_card_send"); }
  ok((await acts(HID)).length === 0, "the other driver's own card has nothing new on it");
  const cash0 = await ev(`GS.cash`); await clearToasts();
  await ev(`[...$("tabS").querySelectorAll("[data-act^='stx:']")].find(x => x.dataset.act.endsWith(":s" + ${hid})).click(); true`);
  const t = await toasts(); q = await pdr(); let h = await pdr(HID); await sleep(400); b = await btns();
  console.log("   toast:", t.join(" / ").slice(0, 300)); console.log("  ", JSON.stringify(h));
  T0 = h.aidT; LEN = h.aidL;
  ok(q.help === HID && h.aid === RID && h.st === "home" && LEN > 50 && T0 <= LEN / 12000 + 0.5 + 1e-6 && T0 > LEN / 12000 + 0.5 - 0.06 && !(h.aidB > 0), `sent: ${(LEN / 1000).toFixed(1)} km by road, ${T0.toFixed(2)} h until the truck is free (the drive + half an hour)`);
  ok((await ev(`GS.cash`)) === cash0 && t.some(s => new RegExp(H + " is on the way out to " + B + " on the Dyfjord road: [\\d.]+ km by road, about .* until the truck is free\\. The .* waits until they are back\\.").test(s)), "it costs no money, and the toast says how far and how long");
  ok(b.length === 1 && b[0].t === H.toUpperCase() + " IS ON THE WAY" && b[0].off, "the card now reads " + (b[0] && b[0].t) + ", spent");
  await ev(`TABLET.toggle(false)`);
  ok((await ev(`TLXPL.pdr.tow(${rid})`)) === false && (await ev(`GS.cash`)) === cash0 && (await send()) === false, "no tow on top, and nobody is sent twice");
  const job = await J(`(() => { const r = jobsList().find(q => q.kind === "plowstuck"); return r ? { meta: r.meta, pay: r.pay, chips: r.chips, hud: r.hud(900) } : null; })()`);
  ok(job && new RegExp(H + " is on the way to pull them out").test(job.meta) && job.pay === "" && /HELP COMING/.test(job.chips) && !/NaN|undefined/.test(JSON.stringify(job)), "the Jobs row: " + (job && job.meta));
  const w1 = await ev(`TLXPL.pdr.where(${rid})`), w2 = await ev(`TLXPL.pdr.where(${hid})`), say = await ev(`TLXPL.pdr.say(${rid})`);
  console.log("   cards:", w1, "|", w2);
  ok(new RegExp("^stuck [\\d.]+ km along, .* now: " + H + " is on the way to pull them out$").test(w1), "the bogged driver's card says who is coming");
  ok(new RegExp("^gone to pull " + B + " out on the Dyfjord road: there in about .*; the .* waits$").test(w2), "the helper's card says where they have gone");
  ok(new RegExp("Bogged to the axles\\. " + H + " is coming out to pull me free").test(say), "hailed, the bogged driver knows: \"" + say.slice(0, 70) + "\"");
  const P = await J(`(() => { const pins = TLXPL.pdr.pins(), a = TLXPL.pdr.aidPos(${hid}), sp = TLXPL.pdr.spot(__rt(${hid})), L = TLXPL.pdr.aidLine(${hid}, ${rid}), st = TLXPL.pdr.pos(__rt(${rid}), TLX.state("plow").pdr[${rid}]), e = L.pts[L.pts.length - 1];
    return { pins: pins.map(p => p.name), d0: Math.hypot(a.x - sp.x, a.z - sp.z), s0: Math.hypot(L.pts[0][0] - sp.x, L.pts[0][1] - sp.z), end: Math.hypot(e[0] - st.x, e[1] - st.z), n: L.pts.length, len: L.len, place: TLXPL.pdr.places().find(p => p.road === ${hid}) }; })()`);
  console.log("  ", JSON.stringify(P));
  ok(P.pins.length === 2 && P.pins.includes(B.toUpperCase() + ": STUCK") && P.pins.includes(H.toUpperCase() + ": GOING TO HELP") && P.s0 < 1 && P.d0 < 600 && P.end < 1 && P.n > 3, `the helper has a Map pin on a line by road from where their truck stood to the bogged truck (${Math.round(P.d0)} m along it already)`);
  ok(P.place.x === null && /away pulling another driver's truck out/.test(P.place.talk), "a word with the helper waits until they are back");
  // their own road waits
  await ev(`TLXR.setSnow(${hid}, 0.5, ${IH}); TLXPL.con.step(); true`);
  const m0 = await mood();
  await ev(`__q(${(T0 * 0.6).toFixed(3)}, 0.05)`); q = await pdr(); h = await pdr(HID);
  const mid = await J(`(() => { const a = TLXPL.pdr.aidPos(${hid}), sp = TLXPL.pdr.spot(__rt(${hid})); return Math.hypot(a.x - sp.x, a.z - sp.z); })()`);
  ok(q.st === "stuck" && h.aid === RID && h.st === "home" && Math.abs(h.aidT - T0 * 0.4) < 0.06 && (await ev(`__rt(${hid}).st.s[${IH}]`)) >= 0.5, "part way: still stuck, the helper still coming, and the snow on the helper's own road waits");
  ok(mid > 20 || LEN < 60, `the pin has moved along the line (${Math.round(mid)} m from where it started)`);
  await clearNotes();
  await ev(`__q(${(T0 * 0.4 + 0.06).toFixed(3)}, 0.03)`); q = await pdr(); h = await pdr(HID);
  let nn = await notes(); const mv = nn.find(s => / is moving again \| /.test(s)) || "";
  console.log("   note:", mv);
  ok(q.st !== "stuck" && !q.help && q.sk === 0 && new RegExp("\\| .* pulled their truck back onto the cut, [\\d.]+ km along the Dyfjord road, and is heading back to the ").test(mv), "at the hour the truck is free and the bogged driver plows on (" + q.st + ")");
  ok(h.aid === RID && h.aidB > 0 && !(h.aidT > 0) && (await J(`TLXPL.pdr.pins()`)).some(p => p.name === H.toUpperCase() + ": HEADING IN") && /^on the way back in from the Dyfjord road/.test(await ev(`TLXPL.pdr.where(${hid})`)), "the helper is on the way back in (pin and card)");
  ok((await mood()) >= m0 - 5 * Math.ceil(T0) - 0.5, "mood: no more than the hours stuck cost");
  await ev(`__q(${(LEN / 12000 + 0.05).toFixed(3)}, 0.03)`); h = await pdr(HID); nn = await notes();
  const bk = nn.find(s => new RegExp("^" + H + ".* is back in \\| Back from the Dyfjord road\\.").test(s)) || "";
  ok(!h.aid && h.aidB === 0 && h.aidL === 0 && bk, "after the drive back they are in: " + bk.slice(0, 90));
  q = await until(q => q.st === "home", 1.5);
  ok(q.st === "home" && (await ev(`__rt(${rid}).st.s[${I}]`)) === 0, "the bogged driver finished the stretch (no second bog in it) and is home");
  await km(0);
  h = await until(q => q.st !== "home", 1.5, HID); ok(h.st === "out" || h.st === "back", "and the helper now goes out on their own road's snow (" + h.st + ")");
  for (let n = 0; n < 60 && (await ev(`__rt(${hid}).st.s[${IH}]`)) > 0; n++) await ev(`__q(0.05, 0.025)`);
  h = await until(q => q.st === "home", 1.5, HID);
  ok(h.st === "home" && (await ev(`__rt(${hid}).st.s[${IH}]`)) === 0, "which they open");
});

await section("B help that is a long time coming: nobody walks home", async () => {
  await ev(`TLXPL.PDR.aid.hitch = 7; true`);
  let q = await bogNow(); ok(q.st === "stuck", "bogged again");
  ok((await send()) === true, "the other driver sent (7 h of roping up, for the test)");
  const m0 = await mood();
  await ev(`__q(6.6, 0.3)`); q = await pdr(); const m1 = await mood();
  ok(q.st === "stuck" && !q.gone && q.help === HID, "6.6 h on: still in the truck, waiting for the help that is coming");
  ok(m1 <= m0 - 20 && m1 >= -30.01, `the hours in the cold still cost mood (${m0.toFixed(1)} -> ${m1.toFixed(1)})`);
  await ev(`__q(1.4, 0.2)`); q = await pdr();
  ok(q.st !== "stuck" && !q.gone, "and then they are pulled out (" + q.st + ")");
  await ev(`TLXPL.PDR.aid.hitch = 0.5; __q(1.5, 0.1); true`);
  const h = await pdr(HID); ok(!h.aid, "the helper is back in");
});

await section("C what can go wrong", async () => {
  // a tow already paid
  let q = await bogNow(); ok(q.st === "stuck", "bogged");
  await ev(`GS.cash = 5000; TLXPL.pdr.tow(${rid}); true`);
  let a = await acts();
  ok(a.length === 1 && a[0].label === "TOW ON ITS WAY" && (await send()) === false && !(await pdr(HID)).aid, "a tow paid: no SEND beside it");
  await ev(`__q(1.1, 0.1)`); q = await until(q => q.st === "home", 1.5); ok(q.st === "home", "towed and home");
  // the helper let go on the way
  q = await bogNow(); ok((await send()) === true, "bogged, the other driver sent");
  await clearNotes();
  await ev(`TLX.staff.letGo(TLX.staff.at("plow:" + ${hid}).id); __q(0.1, 0.05); true`); q = await pdr();
  let nn = await notes(); const no = nn.find(s => /^Nobody is coming for /.test(s)) || "";
  console.log("   note:", no);
  a = await acts();
  ok(q.st === "stuck" && !q.help && /is no longer on the way\. .* is still bogged [\d.]+ km along it: PAY A TOW or SEND SOMEONE/.test(no) && a.length === 1 && /^PAY A TOW/.test(a[0].label) && !a[0].off, "the helper let go on the way: told nobody is coming, PAY A TOW is back");
  ok((await pdr(HID)) === null, "no leftover state for the driver who left");
  // the bogged driver let go: the helper turns round
  ok(await hire(HID, "own"), "a new driver on the other road");
  a = await acts(); ok(a.length === 2 && a[1].k === "s" + HID, "who can be sent at once");
  ok((await send()) === true, "sent");
  await ev(`__q(0.1, 0.05)`); await clearNotes();
  await ev(`TLX.staff.letGo(TLX.staff.at("plow:" + ${rid}).id); __q(0.06, 0.03); true`);
  let h = await pdr(HID); nn = await notes();
  ok(h && h.aid === RID && h.aidB > 0 && h.aidB < 0.2 && !(h.aidT > 0) && nn.some(s => / has turned round \| Nobody is left to pull out on the Dyfjord road/.test(s)), "the bogged driver let go: the helper turns round where they are (" + (h && h.aidB.toFixed(3)) + " h back)");
  await ev(`__q(0.3, 0.05)`); h = await pdr(HID); ok(!h.aid && h.st === "home", "and is in again");
  // an abandoned truck, and a helper who is out
  ok(await hire(RID, "own"), "a new driver on the Dyfjord road");
  q = await bogNow(); await ev(`__q(6.2, 0.4)`); q = await pdr(); a = await acts();
  ok(q.gone && a.length === 1 && a[0].k === "tow" && (await send()) === false, "an abandoned truck: only a tow fetches it, nobody is sent");
  await ev(`GS.cash = 5000; TLXPL.pdr.tow(${rid}); __q(1.1, 0.1); true`);
  q = await bogNow(); ok(q.st === "stuck", "bogged once more");
  await km(0); await ev(`TLXR.setSnow(${hid}, 0.5, ${IH}); TLXPL.con.step(); true`);
  h = await until(q => q.st !== "home", 1.5, HID);
  const why = await ev(`TLXPL.pdr.aidWhy(${hid}, ${rid})`); a = await acts(); await clearToasts();
  const r = await send(), t = await toasts();
  ok(h.st !== "home" && / is out on the /.test(why) && a.length === 1 && r === false && t.some(s => /^Nobody sent: .* is out on the /.test(s)), "a driver who is out on their own road is not offered: \"" + why + "\"");
  await ev(`GS.cash = 5000; TLXPL.pdr.tow(${rid}); __q(3, 0.1); true`);
  q = await pdr(); h = await pdr(HID); ok(q.st === "home" && h.st === "home", "everyone home");
});

let SPOT = null;
await section("D the helper in a truck of yours", async () => {
  ok(await hire(HID, "mine"), "a driver with no truck on the other road");
  await ev(`TLX.staff.xact(TLX.staff.at("plow:" + ${hid}).id, "a" + ${uid}); TLXPL.con.step(); true`); await sleep(300);
  let h = await pdr(HID); ok(h.truck === UID, "your plow truck assigned to them");
  SPOT = await J(`__tk(${uid})`);
  let q = await bogNow(); ok(q.st === "stuck", "the Dyfjord driver bogged");
  // too little diesel
  await ev(`TLXV.state().owned.find(r => r.uid === ${uid}).fuel = 3.5; true`);
  let why = await ev(`TLXPL.pdr.aidWhy(${hid}, ${rid})`), a = await acts();
  ok(/has not the diesel for the drive there and back/.test(why) && a.length === 1, "too little diesel in it: not offered (\"" + why + "\")");
  await ev(`TLXV.state().owned.find(r => r.uid === ${uid}).fuel = 80; true`);
  a = await acts(); ok(a.length === 2, "with diesel in it: SEND is offered");
  ok((await ev(`TLX.staff.xact(TLX.staff.at("plow:" + ${rid}).id, "s" + ${hid})`)) === true, "sent from the card's own action");
  h = await pdr(HID); let t = await J(`__tk(${uid})`); const len = h.aidL, T = h.aidT;
  ok(h.aid === RID && t.out && /on the Dyfjord road/.test(t.out), "your truck has left its spot (\"" + t.out + "\")");
  ok((await acts(HID)).length === 0 && (await ev(`TLX.staff.xact(TLX.staff.at("plow:" + ${hid}).id, "u")`)) === false, "nothing to press on the helper's card while away (no TAKE THE TRUCK BACK)");
  await ev(`__q(${(T * 0.5).toFixed(3)}, 0.05)`);
  // a reload mid-way
  await ev(`save(); true`); const b4 = await pdr(HID), q4 = await pdr();
  await reload(); await ev(SETUP); await sleep(600); await ev(KIT); await km(1e9);
  h = await pdr(HID); q = await pdr(); t = await J(`__tk(${uid})`);
  ok(h && h.aid === RID && Math.abs(h.aidT - b4.aidT) < 0.1 && Math.abs(h.aidL - len) < 1e-6 && q.st === "stuck" && q.help === HID && Math.abs(q.p - q4.p) < 1e-6, "a reload mid-way: still coming, still stuck, the hours kept");
  ok(!!t.out, "and your truck is still out (not swept home by the load)");
  const pin = await J(`TLXPL.pdr.pins().map(p => p.name)`); ok(pin.some(n => /: GOING TO HELP$/.test(n)), "the helper's pin is back on the Map after the reload");
  await clearNotes();
  await ev(`__q(${(T * 0.5 + 0.06).toFixed(3)}, 0.03)`); q = await pdr();
  ok(q.st !== "stuck" && (await notes()).some(s => / is moving again \| .* pulled their truck back onto the cut/.test(s)), "the truck is pulled free");
  await ev(`__q(${(len / 12000 + 0.06).toFixed(3)}, 0.03)`); h = await pdr(HID); t = await J(`__tk(${uid})`);
  const burn = await ev(`(TLXV.VEHICLES.find(v => v.id === "plowtruck").burn || 1)`), want = 2 * len / 1000 * burn * 0.5, used = 80 - t.fuel;
  const bk = (await notes()).find(s => / is back in \| Back from the Dyfjord road: \d+ L of your diesel, and the .* is on its spot again/.test(s)) || "";
  console.log("   note:", bk, "| used", used.toFixed(2), "want", want.toFixed(2));
  ok(!h.aid && !t.out && Math.hypot(t.x - SPOT.x, t.z - SPOT.z) < 0.01 && h.truck === UID, "back in: your truck on its own spot, still theirs to drive");
  ok(Math.abs(used - want) < Math.max(0.3, want * 0.08) && !!bk, `the diesel for both legs was yours (${used.toFixed(1)} L for ${(2 * len / 1000).toFixed(1)} km), and the note says so`);
  await km(0); q = await until(q => q.st === "home", 1.5); ok(q.st === "home", "the Dyfjord driver home");
});

await section("E a night's sleep, and junk in the save", async () => {
  await ev(`TLXV.state().owned.find(r => r.uid === ${uid}).fuel = 80; true`);
  let q = await bogNow(); ok(q.st === "stuck" && (await send()) === true, "bogged and help sent");
  await km(0);
  await ev(`GS.hour += 9; TLX.state("roads").h = GS.hour; TLXPL.con.step(); TLXPL.con.step(); true`);
  q = await pdr(); let h = await pdr(HID); const t = await J(`__tk(${uid})`);
  ok(q.st !== "stuck" && !q.help && !h.aid && !t.out, "slept 9 h: the truck was pulled out and the helper is back in, your truck on its spot (" + q.st + ")");
  await ev(`__q(2.5, 0.1)`); q = await pdr(); ok(q.st === "home", "home");
  const R = await J(`(() => { const s = TLX.state("plow"), q = s.pdr[${rid}], h = s.pdr[${hid}]; const out = [];
    q.help = ${rid}; q.aid = 7; q.aidT = NaN; q.aidB = -4; q.aidL = "x"; h.aid = ${rid}; h.aidT = 1e9; h.aidB = Infinity; h.aidL = 1e12; h.help = ${hid}; TLXPL.tidy();
    out.push({ help: q.help, aid: q.aid, t: q.aidT, b: q.aidB, l: q.aidL }, { help: h.help, aid: h.aid, t: h.aidT, b: h.aidB, l: h.aidL });
    let err = ""; try { __q(0.2, 0.1); for (const id of [${rid}, ${hid}]) { TLXPL.pdr.where(id); TLXPL.pdr.say(id); } TLXPL.pdr.pins(); jobsList(); } catch (e) { err = String(e.message); }
    out.push({ err, aid: s.pdr[${hid}].aid, b: s.pdr[${hid}].aidB }); return out; })()`);
  console.log("  ", JSON.stringify(R));
  ok(R[0].help === "" && R[0].aid === "" && R[0].t === 0 && R[0].b === 0 && R[0].l === 0, "junk on a driver who is home and helping nobody is wiped");
  ok(R[1].help === "" && R[1].aid === RID && R[1].t <= 48 && R[1].b <= 48 && R[1].l <= 2e5, "a wild errand is clamped");
  ok(R[2].err === "" && R[2].aid === "" && R[2].b === 0, "and an errand to a truck that is not bogged turns round and ends, nothing throws");
  const txt = await J(`[TLXPL.pdr.where(${rid}), TLXPL.pdr.where(${hid})]`); ok(!/NaN|undefined|Infinity/.test(txt.join(" ")), "the cards read clean: " + txt.join(" | "));
});

console.log(fails ? `FAILS: ${fails}` : "ALL OK");
await done(fails ? 1 : 0);
