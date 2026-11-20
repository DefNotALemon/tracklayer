// Expansion slice 5.4a2: a plow driver in YOUR truck (tlx-plow.js v22, tlx-staff.js v7, tlx-vehicles.js v31).
// Asserts, exit 1 on a failure.
//   A about half the applicants have no truck; their card and their greeting say so.
//   B hired without a truck assigned: both apps say so, snow on the road is ONE notification and they wait; the card
//     offers the trucks of yours with a blade (not the pickup without one).
//   C ASSIGN (Enter on the focused button): the card names the truck, its litres and its edge; they set out in it and it
//     is gone from its spot (not drawn, no wall, never the nearest vehicle, no Map pin, the garage will not touch it).
//   D both stretches opened: ALL the kommune's pay is yours, the tank and the edge are down by the book; back with you
//     standing on its spot they wait, moved clear it is back where it stood and can be got into again.
//   E RECALL (pad A on the focused button): they turn round, the truck comes home and is off their card.
//   F the tank: empty they do not set out; short they turn back before it runs dry, and say so.
//   G the edge: ragged they do not set out; gone ragged on the first stretch they come home after it.
//   H you in the cab: they wait. You standing beside it: they take it and the sled is yours.
//   I TAKE THE TRUCK BACK (a click, as a touch does): theirs no longer.
//   J slept through: what they could reach is opened and paid in full, the diesel and the edge are charged, the truck is
//     on its spot when you wake.
//   K a reload with the truck out keeps it out and the work goes on; a truck marked out that nobody has comes home.
//   L let go while out: the truck is back. A driver with their own truck has no buttons and never touches yours.
// Time: the clocks are stepped in small steps with the roads' own clock held, as x5_plowdriver. Stills: the cards.
import { boot, ev, sleep, done, reload, shot, tap, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const still = async name => { if (!NOSTILLS) await shot(name); };
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
const notes = () => J(`TABLET.log.map(n => n.title + " | " + n.body)`);
const clearNotes = () => ev(`TABLET.log.length = 0; true`);
const tabText = () => ev(`$("tabS").textContent.replace(/\\s+/g, " ")`);
const app = async id => { await ev(`TABLET.toggle(true, ${JSON.stringify(id)}); TABLET.render(); true`); await sleep(450); return tabText(); };
const btns = () => J(`[...$("tabS").querySelectorAll("[data-act^='stx:']")].map(b => ({ act: b.dataset.act, t: b.textContent, off: b.disabled }))`);

// 5.4b2b: PDR.wayMax = 0 here: the truck is on the road at once, as when this was written (its drive from the spot has its own test, x5_plowdriver_way.mjs)
const SETUP = `TLXPL.PDR.bog.km = 0; /* 5.4c1: no driver bogs in this test (x5_plowdriver_stuck.mjs has that) */ TLXPL.PDR.wayMax = 0; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__q = (h, st) => { st = st || 0.5; for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; };
  window.__con = id => { const c = TLX.state("plow").con[id]; return c ? JSON.parse(JSON.stringify(c)) : null; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__drv = (id, work, xp, hap) => { const m = TLX.staff.at("plow:" + id); m.tr.work = work; m.tr.temper = 0; m.xpReal = xp; m.hap = hap; m.mood = 0; m.wage = TLX.staff.fair(m); return TLXPL.pdr.skill(m, id); };
  window.__tk = uid => { const r = TLXV.state().owned.find(q => q.uid === uid), R = TLXV.runtimeOf(uid); return r ? { out: r.out || null, by: r.outBy || null, fuel: +r.fuel.toFixed(2), x: r.x, z: r.z, yaw: r.yaw, vis: !!(R && R.grp.visible), cond: +TLXPL.condOf(uid).toFixed(2) } : null; };
  window.__door = (x, z, yaw) => { FOOT.on = true; FOOT.x = x + Math.cos(yaw) * 2.1 + Math.sin(yaw) * 2.75; FOOT.z = z - Math.sin(yaw) * 2.1 + Math.cos(yaw) * 2.75; FOOT.y = surf(FOOT.x, FOOT.z); return true; };
  window.__wall = (x, z) => { const q = VEH.block(x, z); return Math.hypot(q[0] - x, q[1] - z) > 0.5; };
  window.__clean = id => { TLXR.setSnow(id, 0); const c = TLX.state("plow").con[id]; c.strikes = 0; c.cover = false; c.due = {}; c.clean = true; TLXPL.con.step(); return true; };
  return true; })()`;
const SEG = 400;

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; true`);
let RID = "dyfjord", I = 0, DID = 0, UID = "", PUID = "", NAME = "";

await section("A applicants without a truck", async () => {
  const routes = await J(`TLXPL.con.routes().map(r => ({ id: r.id, len: Math.round(r.len) }))`);
  console.log("  ", JSON.stringify(routes));
  // the road with a pair of whole stretches furthest up it (the tank test turns round 0.7 km out, short of the snow)
  const pick = await J(`TLXPL.con.routes().map(r => { let b = -1; for (let i = 4; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && r.seg[i - 1].legs.length && r.seg[i + 1].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; if (i >= 5) break; } return { id: r.id, i: b }; }).filter(q => q.i >= 4)`);
  if (pick.length) { RID = (pick.find(q => q.id === RID) || pick[0]).id; I = (pick.find(q => q.id === RID)).i; }
  await ev(`GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); TLXV.buy("pickup"); true`); await sleep(600);
  UID = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`); PUID = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
  ok(I >= 4, "two whole stretches to work with, well up the road: " + (I - 1) + " and " + I);
  ok((await ev(`TLXPL.PDR.mine`)) === 0.5, "half the applicants come without a truck (PDR.mine 0.5)");
  await ev(`TLXPL.PDR.mine = 1; TLXPL.con.sign(${JSON.stringify(RID)}); TLX.staff.tick(); true`); await sleep(300);
  const a = await J(`TLX.state("staff").apps`), A0 = a[0];
  ok(a.length === 1 && A0.role === "plowdriver" && A0.kit === "mine" && A0.wage >= 140 && A0.wage <= 340, "an applicant with no truck: " + JSON.stringify({ name: A0.name, wage: A0.wage, kit: A0.kit }));
  const txt = await app("staff");
  ok(/no truck: drives one of yours, and all they open is paid to you/.test(txt) && !/own truck and blade/.test(txt), "their card says they would drive one of yours");
  await ev(`(() => { const q = TLX.state("staff").apps[0]; q.tr.honest = true; q.xp = q.xpReal = 8; q.tr.temper = 0.1; q.tr.work = 1; q.exp = GS.hour + 400; TLX.staff.interview(q.id); return true; })()`);
  await ev(`TABLET.toggle(true, "staff"); TABLET.render(); true`); await sleep(450);
  const iv = await tabText();
  ok(/I hear you want a driver for the .*\. I have the licence but no truck: I would drive one of yours\./.test(iv) && /A WHITEOUT\?/.test(iv), "and so does their greeting");
  await ev(`TLX.staff.ask(${A0.id}, "why"); true`); await sleep(2100);
  const said = (await J(`TLX.state("staff").apps[0].chat.map(m => m.t)`)).join(" | ");
  ok(!/truck is standing idle|truck's paid for/.test(said) && said.length > 20, "asked why, they do not talk about a truck they do not have: " + said.slice(-90));
  await still("m1_interview"); await ev(`TLX.staff.interview(null); true`);
  await ev(`TLXPL.PDR.mine = 0.5; true`);
  const samp = await J(`(() => { const out = []; for (let i = 0; i < 600; i++) out.push(TLX.staff.post({ id: "plow:" + ${JSON.stringify(RID)}, role: "plowdriver" })); const S = TLX.state("staff"); S.apps = S.apps.filter(q => !out.includes(q)); return { mine: out.filter(q => q.kit === "mine").length, own: out.filter(q => q.kit === "own").length, wmin: Math.min(...out.map(q => q.wage)), wmax: Math.max(...out.map(q => q.wage)) }; })()`);
  ok(samp.mine + samp.own === 600 && samp.mine > 240 && samp.mine < 360 && samp.wmin >= 140 && samp.wmax <= 340, `600 applicants: ${samp.mine} without a truck, ${samp.own} with, wages $${samp.wmin}-${samp.wmax}`);
  DID = A0.id; NAME = A0.name;
});
const rid = JSON.stringify(RID), uid = JSON.stringify(UID);
const mul = () => ev("payMul()");
const cashNow = () => ev("GS.cash");
const snow = (i, v) => ev(`TLXR.setSnow(${rid}, ${v}, ${i}); TLXPL.con.step(); true`);
const full = async () => 2 * Math.round(SEG * 0.25 * (await mul()));
const toRoad = h => `__q(${h.toFixed(3)}, 0.04)`;
const there = () => ((I - 1) * SEG) / 12000 + 0.24, back = () => ((I + 1) * SEG) / 12000 + 0.1;

await section("B hired, no truck assigned", async () => {
  await clearNotes();
  ok((await ev(`TLX.staff.hire(${DID})`)) === true, "hired");
  const k = await ev(`__drv(${rid}, 1, 10, 70)`);
  const m = await J(`TLX.staff.at("plow:" + ${rid})`);
  ok(m && m.kit === "mine" && Math.abs(k - 1) < 0.02, "on the books without a truck of their own, skill " + k.toFixed(2));
  const st = await app("staff"), b = await btns();
  ok(/Plows the .* in a truck of yours \(none assigned\); all the kommune pays is yours, and so are the diesel and the edge: in: no truck of yours is assigned to them/.test(st), "the Staff card says they have no truck");
  ok(b.length === 1 && /^ASSIGN THE NORDTREKK BRØYT 4X2$/.test(b[0].t) && b[0].act === "stx:" + DID + ":a" + UID && !b[0].off, "and offers the truck with a blade, not the pickup without one: " + JSON.stringify(b.map(x => x.t)));
  const pt = await app("plow");
  ok(new RegExp(NAME + " drives it for you: in: no truck of yours is assigned to them").test(pt) && /one without drives a truck of yours that you assign on their card/.test(pt), "the Plow app's card says the same, and its note explains both kinds of driver");
  await ev(`TABLET.toggle(false); true`);
  await snow(I - 1, 0.5); await snow(I, 0.6);
  const c0 = await cashNow();
  await ev(`__q(2, 0.25)`);
  const a = await J(`({ q: __pdr(${rid}), where: TLXPL.pdr.where(${rid}), n: TABLET.log.map(n => n.title + " | " + n.body) })`), hits = a.n.filter(x => / cannot go out \| Snow on the .*, and no truck of yours is assigned to them\. They wait\./.test(x));
  ok(a.q.st === "home" && a.q.w === 0 && hits.length === 1 && (await cashNow()) === c0, "snow and no truck: they wait, with one notification in two hours: " + JSON.stringify(hits));
  ok(a.where === "in, snow on the road: no truck of yours is assigned to them", "and the cards say why (" + a.where + ")");
  await ev(`__clean(${rid})`);
});

await section("C ASSIGN: they take the truck", async () => {
  await clearToasts(); await clearNotes();
  await ev(`TABLET.toggle(true, "staff"); TABLET.render(); TABLET.focus = "stx:${DID}:a${UID}"; TABLET.paintFocus(); true`); await sleep(350);
  await tap("Enter"); await sleep(500);
  let a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}) })`), t = await toasts(), b = await btns(), st = await tabText();
  ok(a.q && a.q.truck === UID && a.q.st === "home" && !a.t.out, "Enter on ASSIGN: the truck is theirs to take, and still on its spot");
  ok(t.some(m => /drives your Nordtrekk Brøyt 4x2 on the .* from now on: they take it when snow lies on the road and bring it back to where it stood\. The diesel and the cutting edge are yours\./.test(m)), "a line says what that means");
  ok(b.length === 1 && b[0].t === "TAKE THE TRUCK BACK" && /in a truck of yours \(the Nordtrekk Brøyt 4x2: 300 L in the tank, the cutting edge at 100%\)/.test(st), "the card names the truck, its litres and its edge, and offers it back: " + JSON.stringify(b.map(x => x.t)));
  await still("m2_assigned"); await ev(`TABLET.toggle(false); true`);
  // walk up to it: it is the nearest vehicle
  const spot = await J(`__tk(${uid})`);
  await ev(`__door(${spot.x}, ${spot.z}, ${spot.yaw})`); await sleep(700);
  const near0 = await J(`({ cur: TLXV.state().cur, hint: ($("wnHint") || {}).textContent || "" })`);
  ok(near0.cur === UID, "standing at its door on foot it is the vehicle you would get into (" + near0.hint.slice(0, 60) + ")");
  await ev(`FOOT.x += 60; FOOT.z += 60; true`); await sleep(500);
  await ev(`FOOT.on = false; TLXV.swapTo(null); true`); await sleep(300);
  await snow(I - 1, 0.5); await snow(I, 0.6);
  await ev(`__q(0.5, 0.25)`);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), where: TLXPL.pdr.where(${rid}) })`);
  ok(a.q.st === "home" && a.q.w > 0.4 && !a.t.out && a.where === "getting the truck out", "half an hour on: getting the truck out, the truck still there");
  await ev(`__q(0.4, 0.2)`); await sleep(400);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), n: TABLET.log.map(n => n.title + " | " + n.body), cur: TLXV.state().cur })`);
  ok(a.q.st === "out" && a.n.some(x => / has set out \| On the .*: 2 stretches under snow\. In your Nordtrekk Brøyt 4x2, 300 L in the tank\./.test(x)), "they set out in it, with a notification: " + JSON.stringify(a.n.filter(x => /set out/.test(x))));
  ok(a.t.out === `with ${NAME} on the ${(await J(`__con(${rid})`)).name}` && a.t.by === "plow" && a.t.vis === false, "the truck is out with them and not drawn at its spot: " + JSON.stringify(a.t));
  // on foot at its spot: nothing there to get into, nothing in the way
  await ev(`__door(${spot.x}, ${spot.z}, ${spot.yaw})`); await sleep(700);
  const g = await J(`({ cur: TLXV.state().cur, blk: __wall(${spot.x}, ${spot.z}) })`);
  ok(g.cur !== UID && g.blk === false, "at its empty spot on foot: that truck is not the one to get into, and there is no wall where it stood");
  await ev(`FOOT.x += 60; FOOT.z += 60; true`); await sleep(300); await ev(`FOOT.on = false; TLXV.swapTo(null); true`); await sleep(200);
  await clearToasts();
  const cnd = await ev(`(() => { TLX.state("plow").blades[${uid}].cond = 60; const r = TLXPL.mend(${uid}); TLX.state("plow").blades[${uid}].cond = 100; return r; })()`), tt = await toasts();
  ok(cnd === false && tt.some(m => /That truck is out with /.test(m)), "the garage will not mend a blade that is out on the road");
  const gar = await ev(`(() => { const d = document.createElement("div"); try { TLXV.state(); VEH.tabs.find(t => t.id === "trucks").render(d, () => { }); } catch (e) { return "THREW " + e.message; } return d.textContent; })()`);
  ok(/Nordtrekk Brøyt 4x2: 100% condition, \d+ of 300 L, out with /.test(gar), "the garage's Trucks tab says where it is: " + (gar.match(/Nordtrekk Brøyt 4x2: [^.]*\./) || [gar.slice(0, 80)])[0]);
  const stt = await app("staff"); b = await btns();
  ok(b.length === 1 && b[0].t === "RECALL" && !b[0].off && /out on it, \d+\.\d km along/.test(stt), "their card offers RECALL while they are out");
  await still("m3_out"); await ev(`TABLET.toggle(false); true`);
});

await section("D opened, paid in full, back on its spot", async () => {
  const c0 = (await cashNow()), spot = await J(`__tk(${uid})`), want = await full();
  await ev(toRoad(there())); await sleep(200);
  let a = await J(`({ q: __pdr(${rid}), sn: [__rt(${rid}).st.s[${I - 1}], __rt(${rid}).st.s[${I}]], c: __con(${rid}), t: __tk(${uid}) })`);
  const c1 = await cashNow();
  console.log("  ", JSON.stringify(a.t), "cash +" + (c1 - c0), "want", want);
  ok(a.sn[0] === 0 && a.sn[1] === 0 && c1 - c0 === want && a.c.strikes === 0, `both stretches open and ALL the kommune's pay is yours: +$${c1 - c0}`);
  ok(Math.abs(a.t.cond - (100 - 2 * SEG / 250)) < 0.05, "the cutting edge wore by the metres cut (800 m, one pass with a 3.5 m blade): " + a.t.cond + "%");
  // by the book: 0.5 L a km x the truck's burn (2.8) on the clean road, 1.2 with the blade cutting, and whatever of the way home is behind them
  const roadKm = ((I - 1) * SEG) / 1000, burnt = 300 - a.t.fuel, homeKm = a.q.st === "back" ? ((I + 1) * SEG - a.q.p) / 1000 : 0, wantF = 2.8 * ((roadKm + homeKm) * 0.5 + 0.8 * 1.2);
  ok(a.q.st === "back" && Math.abs(burnt - wantF) < 0.1, `the tank burnt ${burnt.toFixed(2)} L getting there, cutting and ${Math.round(homeKm * 1000)} m of the way home (by the book ${wantF.toFixed(2)})`);
  // stand the sled on its spot: they cannot put it back
  await clearNotes();
  await ev(`P.x = ${spot.x} + 2; P.z = ${spot.z}; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; true`); await sleep(300);
  await ev(toRoad(back())); await sleep(300);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), where: TLXPL.pdr.where(${rid}), n: TABLET.log.map(n => n.title + " | " + n.body) })`);
  ok(a.q.st === "back" && a.q.hold === true && a.t.out && a.n.filter(x => / is back with the Nordtrekk Brøyt 4x2 \| Something of yours stands on its parking spot/.test(x)).length === 1 && /waiting for you to move clear/.test(a.where), "back with your sled on its spot: they wait, and say so once (" + a.where + ")");
  await ev(`P.x += 40; P.z += 40; P.y = surf(P.x, P.z) + 0.3; __q(0.1, 0.05); true`); await sleep(600);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), n: TABLET.log.map(n => n.title + " | " + n.body), where: TLXPL.pdr.where(${rid}) })`);
  const used = Math.round(300 - a.t.fuel);
  ok(a.q.st === "home" && a.q.truck === UID && !a.t.out && a.t.vis === true && a.t.x === spot.x && a.t.z === spot.z, "moved clear: the truck is back where it stood, drawn again, still assigned");
  ok(a.n.some(x => new RegExp(" is back in \\| 2 stretches of the .* opened · \\$" + want + " all of it yours · " + used + " L of your diesel, the cutting edge at 97%").test(x)), "and the notification counts the pay, the diesel and the edge: " + JSON.stringify(a.n.filter(x => /back in/.test(x))));
  ok(Math.abs((300 - a.t.fuel) - 2.8 * (0.5 * ((I - 1) * SEG + (I + 1) * SEG) / 1000 + 0.8 * 1.2)) < 0.5, "the drive home burnt diesel too: " + (300 - a.t.fuel).toFixed(1) + " L in all");
  await ev(`__door(${spot.x}, ${spot.z}, ${spot.yaw})`); await sleep(700);
  const g = await J(`({ cur: TLXV.state().cur, blk: __wall(${spot.x}, ${spot.z}) })`);
  ok(g.cur === UID && g.blk === true, "and it can be walked up to and got into again");
  await ev(`FOOT.x += 60; FOOT.z += 60; true`); await sleep(500); await ev(`FOOT.on = false; TLXV.swapTo(null); true`); await sleep(200);
});

await section("E RECALL", async () => {
  await clearNotes(); await clearToasts();
  await snow(I - 1, 0.5); await snow(I, 0.6);
  await ev(`__q(0.9, 0.3); __q(0.05, 0.05); true`);
  let a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}) })`);
  ok(a.q.st === "out" && a.t.out && a.q.p > 100, "out again, " + Math.round(a.q.p) + " m along");
  await ev(`TABLET.toggle(true, "staff"); TABLET.render(); TABLET.focus = "stx:${DID}:r"; TABLET.paintFocus(); true`); await sleep(350);
  await padSet({}); await sleep(300); await padSet({ 0: 1 }); await sleep(300); await padSet({}); await sleep(400); await padOff();
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}) })`); const t = await toasts(), b = await btns();
  ok(a.q.st === "back" && a.q.rc === true && a.t.out, "pad A on RECALL: they turn round");
  ok(t.some(m => /is bringing the Nordtrekk Brøyt 4x2 back in\. It is yours alone again once it is on its spot\./.test(m)) && b.length === 1 && b[0].t === "RECALLED" && b[0].off, "a line says so and the button reads RECALLED");
  await ev(`TABLET.toggle(false); __q(0.4, 0.05); true`); await sleep(400);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), sn: __rt(${rid}).st.s[${I}], where: TLXPL.pdr.where(${rid}), n: TABLET.log.map(n => n.title + " | " + n.body) })`);
  ok(a.q.st === "home" && a.q.truck === null && a.q.rc === false && !a.t.out && a.t.vis && a.sn > 0.4, "home, the truck on its spot and off their card, the snow still on the road");
  ok(a.n.some(x => / is back in \| Nothing opened on the .*: you called them in\. The Nordtrekk Brøyt 4x2 is back on its spot\./.test(x)) && /no truck of yours is assigned/.test(a.where), "the notification and the cards say so: " + a.where);
  await ev(`__clean(${rid})`);
});
const assign = () => ev(`TLX.staff.xact(${DID}, "a" + ${uid})`);

await section("F the tank", async () => {
  await clearNotes();
  ok((await assign()) === true, "assigned again");
  await ev(`TLXV.state().owned.find(r => r.uid === ${uid}).fuel = 3.6; true`);
  await snow(I - 1, 0.5); await snow(I, 0.6);
  await ev(`__q(1.5, 0.25)`);
  let a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), n: TABLET.log.map(n => n.title + " | " + n.body) })`);
  ok(a.q.st === "home" && !a.t.out && a.n.filter(x => / cannot go out \| Snow on the .*, and the Nordtrekk Brøyt 4x2's tank is empty\. They wait\./.test(x)).length === 1, "3.6 L in the tank: they do not set out, one notification");
  await clearNotes();
  await ev(`TLXV.state().owned.find(r => r.uid === ${uid}).fuel = 5; __q(0.9, 0.3); true`);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}) })`);
  ok(a.q.st === "out" && a.t.out, "5 L: enough to set out on");
  const c0 = await cashNow();
  await ev(`__q(0.5, 0.02)`); await sleep(500);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), sn: __rt(${rid}).st.s[${I - 1}], n: TABLET.log.map(n => n.title + " | " + n.body) })`);
  console.log("  ", JSON.stringify(a.t), JSON.stringify(a.n));
  ok(a.q.st === "home" && !a.t.out && a.sn > 0.4 && (await cashNow()) === c0, "they turned back short of the snow and are in, nothing opened");
  ok(a.t.fuel > 2 && a.t.fuel < 3.2, "with the spare still in the tank, not run dry: " + a.t.fuel + " L");
  ok(a.n.some(x => / is back in \| Nothing opened on the .*: the tank is nearly dry\. The Nordtrekk Brøyt 4x2 is back on its spot\./.test(x)), "and the notification says the tank is nearly dry");
  await ev(`TLXV.state().owned.find(r => r.uid === ${uid}).fuel = 300; __clean(${rid})`);
});

await section("G the cutting edge", async () => {
  await clearNotes();
  await ev(`TLX.state("plow").blades[${uid}].cond = 29; true`);
  await snow(I - 1, 0.5); await snow(I, 0.6);
  await ev(`__q(1.5, 0.25)`);
  let a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), n: TABLET.log.map(n => n.title + " | " + n.body) })`);
  ok(a.q.st === "home" && !a.t.out && a.n.filter(x => /cannot go out \| Snow on the .*, and the Nordtrekk Brøyt 4x2's cutting edge is worn ragged\. They wait\./.test(x)).length === 1, "a ragged edge: they do not set out, one notification");
  await clearNotes();
  await ev(`TLX.state("plow").blades[${uid}].cond = 31.5; __q(0.9, 0.3); true`);
  const c0 = await cashNow();
  await ev(toRoad(there() + back())); await sleep(500);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), sn: [__rt(${rid}).st.s[${I - 1}], __rt(${rid}).st.s[${I}]], n: TABLET.log.map(n => n.title + " | " + n.body) })`);
  console.log("  ", JSON.stringify(a.t), JSON.stringify(a.n));
  ok(a.sn[0] === 0 && a.sn[1] > 0.4 && (await cashNow()) - c0 === (await full()) / 2, "31.5%: the first stretch is opened and paid, the second is left");
  ok(a.q.st === "home" && !a.t.out && a.t.cond < 30 && a.n.some(x => / is back in \| 1 stretch of the .* opened · .* all of it yours · \d+ L of your diesel, the cutting edge at 29% · the cutting edge is worn ragged/.test(x)), "they came home with the edge ragged and said so");
  await ev(`TLX.state("plow").blades[${uid}].cond = 100; TLXV.state().owned.find(r => r.uid === ${uid}).fuel = 300; __clean(${rid})`);
});

await section("H you and the truck", async () => {
  await clearNotes();
  await ev(`TLXV.swapTo(${uid}); FOOT.on = false; true`); await sleep(400);
  await snow(I, 0.6);
  await ev(`__q(1.5, 0.25)`);
  let a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), n: TABLET.log.map(n => n.title + " | " + n.body), where: TLXPL.pdr.where(${rid}) })`);
  ok(a.q.st === "home" && !a.t.out && a.n.filter(x => /cannot go out \| Snow on the .*, and you are in the Nordtrekk Brøyt 4x2\. They wait\./.test(x)).length === 1 && /you are in the Nordtrekk/.test(a.where), "you in the cab: they wait, one notification (" + a.where + ")");
  // get out and stand beside it: it is still "your" vehicle (the nearest), and they take it
  await ev(`__door(P.x, P.z, P.yaw)`); await sleep(500);
  const ok0 = await J(`({ cur: TLXV.state().cur, why: TLXPL.pdr.kitWhy(${rid}) })`);
  await ev(`__q(0.9, 0.3)`); await sleep(600);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), cur: TLXV.state().cur, fin: [P.x, P.z, GS.fuel].every(Number.isFinite), foot: FOOT.on })`);
  ok(ok0.cur === UID && ok0.why === "" && a.q.st === "out" && a.t.out && a.cur !== UID && a.fin && a.foot, "you on foot beside it: they take it from under your hand, and it is no longer the machine you would get into: " + JSON.stringify({ before: ok0, after: a.cur }));
  await ev(`FOOT.x += 60; FOOT.z += 60; true`); await sleep(300); await ev(`FOOT.on = false; TLXV.swapTo(null); true`); await sleep(200);
  await ev(toRoad(there() + back())); await sleep(500);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), sn: __rt(${rid}).st.s[${I}] })`);
  ok(a.q.st === "home" && !a.t.out && a.sn === 0, "and they bring it back with the stretch open");
  await ev(`__clean(${rid})`);
});

await section("I TAKE THE TRUCK BACK", async () => {
  await clearToasts();
  await app("staff");
  let b = await btns();
  ok(b.length === 1 && b[0].t === "TAKE THE TRUCK BACK", "in, the card offers the truck back");
  await ev(`$("tabS").querySelector("[data-act='stx:${DID}:u']").click(); true`); await sleep(400);
  const a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}) })`), t = await toasts(); b = await btns();
  ok(a.q.truck === null && !a.t.out && t.some(m => /The Nordtrekk Brøyt 4x2 is yours alone again\. .* has no truck to plow the /.test(m)), "a click (as a touch does): theirs no longer, and a line says they have none now");
  ok(b.length === 1 && /^ASSIGN THE NORDTREKK/.test(b[0].t), "and the card offers ASSIGN again");
  // a blade on the pickup: two trucks on offer; given the pickup it cuts each stretch twice
  ok((await ev(`TLXPL.fit(${JSON.stringify(PUID)}, "b23")`)) === true, "a Fjellskjær 2.3 fitted to the pickup"); await sleep(300);
  await ev(`TABLET.render(); true`); await sleep(400); b = await btns();
  ok(b.length === 2 && b.some(x => /ASSIGN THE FJELLVOGN/.test(x.t)) && (await ev(`TLXPL.pdr.passes(${JSON.stringify(PUID)})`)) === 2 && (await ev(`TLXPL.pdr.passes(${uid})`)) === 1, "with a blade on the pickup both trucks are on offer; the pickup's 2.3 m blade takes two passes, the plow truck's one: " + JSON.stringify(b.map(x => x.t)));
  await ev(`TABLET.toggle(false); true`);
  ok((await ev(`TLX.staff.xact(${DID}, "a" + ${JSON.stringify(PUID)})`)) === true, "the pickup assigned");
  await snow(I, 0.6);
  await ev(`__q(0.9, 0.3)`);
  const c0 = await cashNow(), f0 = (await J(`__tk(${JSON.stringify(PUID)})`)).fuel, big0 = (await J(`__tk(${uid})`)).fuel;
  // two passes: the 400 m take twice as long as the plow truck's 0.1 h
  await ev(toRoad((I * SEG) / 12000 + 0.14)); const mid = await J(`({ sn: __rt(${rid}).st.s[${I}], q: __pdr(${rid}) })`);
  await ev(toRoad(0.12 + ((I + 1) * SEG) / 12000 + 0.1)); await sleep(500);
  const e = await J(`({ sn: __rt(${rid}).st.s[${I}], q: __pdr(${rid}), t: __tk(${JSON.stringify(PUID)}), big: __tk(${uid}) })`);
  console.log("  ", JSON.stringify(mid.q), JSON.stringify(e.t));
  ok(mid.sn > 0.4 && mid.q.st === "out" && e.sn === 0 && (await cashNow()) - c0 === (await full()) / 2, "one pass's time on: not yet open; after the second it is, and paid in full");
  ok(Math.abs((100 - e.t.cond) - 2 * SEG / 250) < 0.05 && e.q.st === "home" && !e.t.out && !e.big.out && e.big.fuel === big0, `the pickup's edge wore for 800 m of cutting (${e.t.cond}%), it burnt ${(f0 - e.t.fuel).toFixed(1)} L, and the plow truck never moved`);
  await ev(`TLX.staff.xact(${DID}, "u"); TLX.staff.xact(${DID}, "a" + ${uid}); __clean(${rid})`);
});

await section("J slept through", async () => {
  await clearNotes(); await clearToasts();
  await ev(`__drv(${rid}, 1, 10, 70)`);
  await snow(I, 0.5); await snow(I - 1, 0.6);
  const c0 = await cashNow(), t0 = await J(`__tk(${uid})`), want = await full();
  await ev(`GS.hour += 9; true`); await sleep(500); await ev(`TLXPL.con.step(); true`); await sleep(300); await ev(`TLXPL.con.step(); true`);
  const a = await J(`({ s: [__rt(${rid}).st.s[${I}], __rt(${rid}).st.s[${I - 1}]], c: __con(${rid}), q: __pdr(${rid}), t: __tk(${uid}), n: TABLET.log.map(n => n.title + " | " + n.body) })`), t = await toasts();
  console.log("  ", JSON.stringify(a.t), JSON.stringify(a.n));
  ok(a.s[0] === 0 && a.s[1] === 0 && a.c.strikes === 0 && !t.some(x => /Warning/.test(x)) && (await cashNow()) - c0 === want, "a 9 h sleep: both open when you wake, no warning, all the pay yours");
  ok(a.q.st === "home" && !a.t.out && a.t.vis && a.t.fuel < t0.fuel - 4 && Math.abs((t0.cond - a.t.cond) - 3.2) < 0.05, `the truck is on its spot, ${(t0.fuel - a.t.fuel).toFixed(1)} L lighter, the edge ${(t0.cond - a.t.cond).toFixed(1)} points down`);
  ok(a.n.some(x => / plowed while you were away \| 2 stretches of the .* opened · \$\d+ all of it yours · \d+ L of your diesel, the cutting edge at \d+%/.test(x)), "and the notification counts it up");
  // no truck free at bedtime: the contract's own rule, as with no driver
  await clearToasts();
  await ev(`TLX.staff.xact(${DID}, "u"); true`);
  await snow(I, 0.6);
  const c2 = await cashNow();
  await ev(`GS.hour += 9; true`); await sleep(500); await ev(`TLXPL.con.step(); true`); await sleep(300); await ev(`TLXPL.con.step(); true`);
  const b = await J(`({ c: __con(${rid}) })`), t2 = await toasts();
  ok(b.c.strikes === 1 && (await cashNow()) === c2 && t2.some(x => /lay shut while you were away.*Warning 1 of 3/.test(x)), "slept with no truck assigned: the kommune's truck and a warning, as with no driver at all");
  await ev(`__clean(${rid}); TLX.staff.xact(${DID}, "a" + ${uid}); true`);
});

await section("K reload with the truck out; an orphan", async () => {
  await ev(`__drv(${rid}, 1, 10, 70)`);
  await snow(I - 1, 0.5); await snow(I, 0.5);
  await ev(`__q(0.9, 0.3); __q(0.05, 0.05); save(); true`);
  const b = await J(`({ q: __pdr(${rid}), t: __tk(${uid}) })`);
  ok(b.q.st === "out" && b.t.out && b.q.truck === UID, "saved with the truck out at " + Math.round(b.q.p) + " m");
  await reload(); await ev(SETUP); await sleep(700); await ev(KIT);
  let a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), m: TLX.staff.at("plow:" + ${rid}), cur: TLXV.state().cur })`);
  console.log("   after", JSON.stringify(a.q), JSON.stringify(a.t));
  ok(a.m && a.m.kit === "mine" && a.q && a.q.st === "out" && a.q.truck === UID && a.t.out === b.t.out && a.t.by === "plow" && a.t.vis === false && a.cur !== UID, "a reload keeps the driver, the truck out with them and not at its spot");
  const c0 = await cashNow();
  await ev(toRoad(there() + back() + 0.1)); await sleep(600);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), sn: [__rt(${rid}).st.s[${I - 1}], __rt(${rid}).st.s[${I}]] })`);
  ok(a.sn[0] === 0 && a.sn[1] === 0 && (await cashNow()) > c0 && a.q.st === "home" && !a.t.out && a.t.vis, "the work goes on: both opened, the truck back on its spot");
  const r = await ev(`(() => { try { const t = TLXV.state().owned.find(q => q.uid === ${uid}); t.out = "with nobody"; t.outBy = "plow"; TLXPL.pdr.sweep(); const o1 = t.out; TLXV.setOut(${uid}, "with a stranger", "other"); TLXPL.pdr.sweep(); const o2 = t.out; TLXV.setOut(${uid}, null);
    const s = TLX.state("plow"); s.pdr[${rid}].truck = "v999"; s.pdr[${rid}].st = "out"; TLXPL.tidy(); const q1 = JSON.parse(JSON.stringify(s.pdr[${rid}])); GS.hour += 0.01; TLX.state("roads").h = GS.hour; /* the step needs the clock to have moved: without this the check hung on where in the 0.5 s step cycle it landed */ TLXPL.con.step(); TABLET.toggle(true, "staff"); TABLET.render();
    return JSON.stringify({ o1, o2, q1, q2: s.pdr[${rid}], where: TLXPL.pdr.where(${rid}) }); } catch (e) { return "THREW " + e.message; } })()`);
  console.log("  ", r);
  const q = /^THREW/.test(r) ? null : JSON.parse(r);
  ok(q && q.o1 === null && q.o2 === "with a stranger", "a truck marked out by a plow driver nobody has comes home; one another system took is left alone");
  ok(q && q.q1.truck === null && q.q2.st === "home" && typeof q.where === "string", "a driver out in a truck that no longer exists: tidied, home, nothing thrown (" + (q && q.where) + ")");
  await ev(`TABLET.toggle(false); __clean(${rid}); TLX.staff.xact(${DID}, "a" + ${uid}); true`);
});

await section("L let go while out; a driver with their own truck", async () => {
  await ev(`__drv(${rid}, 1, 10, 70)`);
  await snow(I, 0.6);
  await ev(`__q(0.9, 0.3); __q(0.05, 0.05); true`);
  let a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}) })`);
  ok(a.q.st === "out" && a.t.out, "out in your truck");
  await ev(`TLX.state("staff").owed = 0; TLX.staff.letGo(${DID}); TLXPL.con.step(); true`); await sleep(500);
  a = await J(`({ m: TLX.staff.at("plow:" + ${rid}), q: __pdr(${rid}), t: __tk(${uid}) })`);
  ok(a.m === null && a.q === null && !a.t.out && a.t.vis, "let go while out: the truck is back on its spot, no state left");
  await ev(`__clean(${rid}); TLXPL.PDR.mine = 0; (() => { const S = TLX.state("staff"); S.apps = []; return true; })(); TLX.staff.tick(); true`); await sleep(300);
  const A = (await J(`TLX.state("staff").apps`))[0];
  ok(A && A.kit === "own", "the next applicant has their own truck");
  await ev(`TLX.staff.hire(${A.id}); __drv(${rid}, 1, 10, 70); true`);
  const st = await app("staff"), b = await btns();
  ok(b.length === 0 && /in their own truck and keeps 40%/.test(st), "their card has no truck buttons");
  await ev(`TABLET.toggle(false); true`);
  await snow(I, 0.6);
  const c0 = await cashNow(), f0 = (await J(`__tk(${uid})`)).fuel;
  await ev(`__q(0.9, 0.3)`); await ev(toRoad(there() + back())); await sleep(400);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), sn: __rt(${rid}).st.s[${I}] })`);
  ok(a.sn === 0 && (await cashNow()) - c0 === Math.round(SEG * 0.25 * (await mul()) * 0.6) && !a.t.out && a.t.fuel === f0 && a.q.truck === null, "they open the stretch for their 40% and your truck never moves");
  // the road handed back with a truck-less driver out
  await ev(`TLX.staff.letGo(${A.id}); TLXPL.con.step(); TLXPL.PDR.mine = 1; TLX.state("staff").apps = []; TLX.staff.tick(); true`); await sleep(300);
  const B = (await J(`TLX.state("staff").apps`))[0];
  await ev(`TLX.staff.hire(${B.id}); __drv(${rid}, 1, 10, 70); TLX.staff.xact(${B.id}, "a" + ${uid}); true`);
  await snow(I, 0.6); await ev(`__q(0.9, 0.3); __q(0.05, 0.05); true`);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}) })`);
  await ev(`TLXPL.con.quit(${rid}); TLX.staff.tick(); TLXPL.tidy(); true`); await sleep(400);
  const z = await J(`({ t: __tk(${uid}), pdr: Object.keys(TLX.state("plow").pdr).length, crew: TLX.state("staff").crew.length })`);
  ok(a.q.st === "out" && a.t.out && !z.t.out && z.t.vis && z.pdr === 0 && z.crew === 0, "the road handed back with them out in your truck: it is back on its spot, the driver let go");
});

console.log(fails ? `x5_plowdriver_mine: ${fails} FAILED` : "x5_plowdriver_mine: all ok");
await done(fails ? 1 : 0);
