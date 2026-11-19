// Expansion slice 5.4c1: a plow driver gets stuck, the ping, PAY A TOW (tlx-plow.js v29, tlx-staff.js v9).
// Asserts, exit 1 on a failure.
//   A the risk: none on a stretch the blade copes with (the plow truck's 1.15 m blade at 0.5 / 0.6), some on one drifted
//     deeper, more for the pickup's low blade, more for a slow driver, more on a grade while it snows; PDR.bog.km 0 = never.
//   B their own truck, you far off: with the risk at 0 they open a deep stretch as before; with it certain they bog INSIDE
//     the stretch: st "stuck", the stretch not opened, a notification, a Jobs row to the truck, the Map pin STUCK, the
//     cards say so, the road's clock runs on, an hour stuck is a mood hit.
//   C PAY A TOW: the button on the Staff card with its price ($120 + $20 a km from the garage); not enough cash: refused;
//     paid: cash down, TOW ON ITS WAY, still stuck half an hour later, moving again after the hour, the stretch opened and
//     paid, no second bog in that stretch, home.
//   D left alone: after 6 h they walk home (gone, mood down 30, a word is at the garage again, nobody to hail), the truck
//     stays; a night's sleep changes nothing; a tow then brings it in: home, ready to go out again.
//   E a truck of YOURS: stuck it stays out (not on its spot), burns nothing, no RECALL; towed with the driver in: plowing
//     on; abandoned and towed: back on its own spot, still assigned.
//   F beside it: the truck stands still off its lane toward the windrow, driver at the wheel, beacon lit; a hail gets
//     "Bogged"; abandoned: nobody at the wheel, lamps off, no hail. A reload keeps all of it.
// Stills (OUT): the bogged truck with its driver, the abandoned truck.
import { boot, ev, sleep, done, reload, shot, park } from "../lib.mjs";
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
  window.__tk = uid => { const r = TLXV.state().owned.find(q => q.uid === uid), R = TLXV.runtimeOf(uid); return r ? { out: r.out || null, fuel: r.fuel, x: r.x, z: r.z, vis: !!(R && R.grp.visible) } : null; };
  window.__me = (x, z) => { crashCancel(); FOOT.on = false; if (VEH.cur) TLXV.swapTo(null); P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vz = P.vy = 0; P.yaw = 0; recenter(x, z, true); return true; };
  window.__z = id => { const Z = TLXPL.pdr.seen.get(id); if (!Z || !Number.isFinite(Z.x)) return null; const n = TLXR.near(Z.x, Z.z), r = __rt(id), p = TLXPL.pdr.pt(r, n.s); let dy = Z.yaw - Math.atan2(p.tx, p.tz); while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    return { x: Z.x, z: Z.z, v: Z.v, off: Z.off, roadD: n.d, dyaw: dy, drv: Z.R.drvBody.visible, lit: !!Z.lit, bc: Z.bc.userData.mat.color.r, vis: Z.R.grp.visible, hail: Z.hail || 0, gh: Z.gh }; };
  if (!window.__rh) window.__rh = setInterval(() => { try { TLX.state("roads").h = GS.hour; } catch (e) { } }, 30);
  if (!window.__camHk) { window.__camHk = true; const rr = renderer.render.bind(renderer); renderer.render = (sc, cam) => { const o = window.__cam; if (o && sc === scene) { cam.position.set(o.x, o.y, o.z); cam.lookAt(o.tx, o.ty, o.tz); cam.updateMatrixWorld(); } rr(sc, cam); }; }
  window.__look = (id, dist, h, side) => { const Z = TLXPL.pdr.seen.get(id); if (!Z || !Number.isFinite(Z.x)) { window.__cam = null; return false; } const fx = Math.sin(Z.yaw), fz = Math.cos(Z.yaw); const cx = Z.x + fx * dist * 0.75 + fz * side, cz = Z.z + fz * dist * 0.75 - fx * side; window.__cam = { x: cx, z: cz, y: Math.max(surf(cx, cz), surf(Z.x, Z.z)) + h, tx: Z.x, ty: surf(Z.x, Z.z) + 1.4, tz: Z.z }; return true; };
  return true; })()`;
const SEG = 400;
const still = async (name, rid, dist = 11, h = 3.4, side = -7) => { if (NOSTILLS) return; if (!(await ev(`__look(${rid}, ${dist}, ${h}, ${side})`))) return; await sleep(400); await shot(name); await ev(`window.__cam = null; true`); };
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
const toasts = async () => { await sleep(300); return J(`window.__tsaw || []`); };
const clearNotes = () => ev(`TABLET.log.length = 0; true`);
const notes = () => J(`TABLET.log.map(n => n.title + " | " + n.body)`);
const btns = () => J(`[...$("tabS").querySelectorAll("[data-act^='stx:']")].map(b => ({ act: b.dataset.act, t: b.textContent, off: b.disabled }))`);

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; true`);
const RID = "dyfjord", rid = JSON.stringify(RID);
const pdr = () => J(`__pdr(${rid})`);
const z = () => J(`__z(${rid})`);
const snow = (i, v) => ev(`TLXR.setSnow(${rid}, ${v}, ${i}); TLXPL.con.step(); true`);
const km = v => ev(`TLXPL.PDR.bog.km = ${v}; true`);
const mood = () => ev(`TLX.staff.at("plow:" + ${rid}).mood`);
let I = 1, UID = "", uid = "";
const hire = async kit => {
  await ev(`TLXPL.PDR.mine = ${kit === "mine" ? 1 : 0}; (() => { const m = TLX.staff.at("plow:" + ${rid}); if (m) TLX.staff.letGo(m.id); TLXPL.con.step(); return true; })()`); await sleep(200);
  const id = await ev(`(() => { const S = TLX.state("staff"); S.apps = S.apps.filter(a => a.place !== "plow:" + ${rid}); const a = TLX.staff.post({ id: "plow:" + ${rid}, role: "plowdriver" }); a.tr.honest = true; a.xp = a.xpReal = 10; a.exp = GS.hour + 400; return a.id; })()`);
  const h = await ev(`TLX.staff.hire(${JSON.stringify(id)})`);
  await ev(`__drv(${rid}, 1, 10, 70); TLXPL.con.step(); true`); await sleep(400);
  return h === true;
};
const far = async () => { await ev(`crashCancel(); FOOT.on = false; true`); await park("P.x + 2600", "P.z + 2600"); await sleep(300); };
// snow on stretch I, the driver sets out; then run the clock until they are stuck or home again (the clock's pace: 0.02 h steps)
const setOut = async v => { await snow(I, v); await ev(`__q(0.74, 0.37)`); let q = await pdr(); for (let n = 0; n < 8 && q.st === "home"; n++) { await ev(`__q(0.1, 0.1)`); q = await pdr(); } return q; };
const until = async (pred, hrs = 1.2) => { let q = await pdr(); for (let t = 0; t < hrs && !pred(q); t += 0.04) { await ev(`__q(0.04, 0.02)`); q = await pdr(); } return q; };
const bogNow = async () => { await ev(`__clean(${rid})`); await ev(`__q(1.6, 0.1)`); await km(1e9); const q0 = await setOut(0.9); return q0.st === "stuck" ? q0 : until(q => q.st === "stuck" || q.st === "home"); };

await section("A the risk", async () => {
  await ev(`TLXV.buy("plowtruck"); true`); await sleep(600);
  UID = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`); uid = JSON.stringify(UID);
  await ev(`TLXPL.PDR.mine = 0; TLXPL.con.sign(${rid}); TLX.staff.tick(); true`); await sleep(300);
  I = await ev(`(() => { const r = __rt(${rid}); let b = -1; for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; break; } return b; })()`);
  ok(I >= 1, "a whole stretch to work with: " + I);
  const R = await J(`(() => { const r = __rt(${rid}), q = { p: ${I} * 400 + 100 }, BL = TLXPL.pdr.bogRisk, low = { h: 0.65 }, s0 = r.st.s[${I}], at = v => { r.st.s[${I}] = v; return BL(r, q, ${I}, 1, null); };
    const o = { a50: at(0.5), a60: at(0.6), a90: at(0.9), a100: at(1), low50: (r.st.s[${I}] = 0.5, BL(r, q, ${I}, 1, low)), low30: (r.st.s[${I}] = 0.3, BL(r, q, ${I}, 1, low)), slow: (r.st.s[${I}] = 0.9, BL(r, q, ${I}, 0.5, null)) };
    const wx = WX.at; r.st.s[${I}] = 0.5; let hill = 0, flat = 1; WX.at = () => 0.5; for (let p = 20; p < r.len - 20; p += 20) { const v = BL(r, { p }, ${I}, 1, null); if (v > hill) hill = v; if (v < flat) flat = v; } WX.at = () => 0; o.hill = hill; o.flat = flat; o.dry = BL(r, q, ${I}, 1, null); WX.at = wx;
    const k0 = TLXPL.PDR.bog.km; TLXPL.PDR.bog.km = 0; o.off = at(1); TLXPL.PDR.bog.km = k0; r.st.s[${I}] = s0; return o; })()`);
  console.log("  ", JSON.stringify(R));
  ok(R.a50 === 0 && R.a60 === 0, "the plow truck's blade copes with a stretch at 0.5 and 0.6 of the snowpack: no risk");
  ok(R.a90 > 0 && R.a100 > R.a90 && Math.abs(R.a100 - 0.3) < 1e-6, `drifted deeper it can bog: ${R.a90.toFixed(3)} a km at 0.9, ${R.a100.toFixed(3)} drifted level`);
  ok(R.low50 > 0 && R.low30 === 0, `the pickup's low blade bogs sooner (${R.low50.toFixed(3)} a km at 0.5, none at 0.3)`);
  ok(Math.abs(R.slow - 2 * R.a90) < 1e-6, "a driver of half the skill bogs twice as often");
  ok(R.dry === 0 && R.hill > 0.02 && R.hill > R.flat, `a grade while it snows adds risk where the snow alone gives none (up to ${R.hill.toFixed(3)} a km on this road, ${R.flat.toFixed(3)} on its flattest)`);
  ok(R.off === 0, "PDR.bog.km 0: never");
});

let COST = 0, P0 = 0;
await section("B their own truck, you far off: bogged in the drift", async () => {
  ok(await hire("own"), "a driver with their own truck hired");
  await far();
  await km(0);
  let q = await setOut(0.9); ok(q.st === "out", "risk off: they set out on a stretch at 0.9 (" + q.st + ")");
  q = await until(q => q.st === "home", 1.5);
  ok(q.st === "home" && (await ev(`__rt(${rid}).st.s[${I}]`)) === 0, "and open it and come home as before");
  await clearNotes(); const cash0 = await ev(`GS.cash`);
  q = await bogNow();
  P0 = q.p;
  console.log("  ", JSON.stringify(q));
  ok(q.st === "stuck" && q.p > I * SEG && q.p < (I + 1) * SEG - 2 && q.bogI === I && q.sk < 0.2 && !q.gone && !(q.tow > 0), `risk certain: stuck ${Math.round(q.p)} m along, inside stretch ${I}`);
  ok((await ev(`__rt(${rid}).st.s[${I}]`)) > 0.8 && (await ev(`GS.cash`)) === cash0, "the stretch is not opened, nothing paid");
  const nn = await notes(), ping = nn.find(t => / is stuck \| /.test(t)) || "";
  console.log("   note:", ping);
  ok(/Bogged in the drift [\d.]+ km along the Dyfjord road/.test(ping) && /PAY A TOW/.test(ping) && /\$\d+/.test(ping) && /6 h/.test(ping) && !/NaN|undefined/.test(ping), "the ping: a notification with where, the tow's price and what happens if left");
  const job = await J(`(() => { const r = jobsList().find(q => q.kind === "plowstuck"), p = TLXPL.pdr.pos(__rt(${rid}), TLX.state("plow").pdr[${rid}]); return r ? { title: r.title, meta: r.meta, pay: r.pay, d: Math.hypot(r.tgt.x - p.x, r.tgt.z - p.z), hud: r.hud(1200), n: jobsList().filter(q => q.kind === "plowstuck").length } : null; })()`);
  console.log("   job:", JSON.stringify(job));
  ok(job && job.n === 1 && / is stuck on the Dyfjord road$/.test(job.title) && job.d < 8 && /^tow \$\d+/.test(job.pay) && /walks home after 6 h/.test(job.meta) && !/NaN|undefined/.test(JSON.stringify(job)), "a row in Jobs whose target is the truck");
  const pins = await J(`TLXPL.pdr.pins()`), where = await ev(`TLXPL.pdr.where(${rid})`);
  ok(pins.length === 1 && /: STUCK$/.test(pins[0].name) && pins[0].col === "#e05a3a", "the Map pin reads " + (pins[0] && pins[0].name));
  ok(/^stuck [\d.]+ km along, .* now: PAY A TOW on their Staff card$/.test(where), "the cards: \"" + where + "\"");
  COST = await ev(`TLXPL.pdr.towCost(${rid})`);
  ok(COST >= 120 && COST % 5 === 0 && COST < 400, "the tow: $" + COST + " ($120 + $20 a km from the garage)");
  // the clocks: the road's runs on, the driver's mood drops by the hour
  const d0 = await J(`TLX.state("plow").con[${rid}].due[${I}]`), m0 = await mood();
  await ev(`__q(0.9, 0.3)`); const m1 = await mood();
  await ev(`__q(0.2, 0.1)`); const m2 = await mood(), d1 = await J(`TLX.state("plow").con[${rid}].due[${I}]`); q = await pdr();
  ok(m1 === m0 && Math.abs(m2 - (m0 - 5)) < 0.3, `an hour stuck in the cold is a mood hit (${m0.toFixed(1)} -> ${m2.toFixed(1)}), not before the hour`);
  ok(d1 && d0 && d1[0] > d0[0] + 0.9 && q.st === "stuck" && Math.abs(q.p - P0) < 1e-6 && q.sk > 1, `the road's clock runs on (${d0[0].toFixed(2)} -> ${d1[0].toFixed(2)} h), the truck where it bogged`);
});

await section("C PAY A TOW", async () => {
  await ev(`TABLET.toggle(true, "staff")`); await sleep(500);
  let b = await btns(); console.log("  ", JSON.stringify(b));
  const tw = b.find(x => /:tow$/.test(x.act));
  ok(tw && tw.t === "PAY A TOW · $" + COST && !tw.off && b.length === 1, "the Staff card has PAY A TOW with its price, and nothing else for a driver with their own truck");
  await ev(`GS.cash = ${COST - 1}; true`); await clearToasts();
  await ev(`$("tabS").querySelector("[data-act$=':tow']").click(); true`); let t = await toasts(), q = await pdr();
  ok(!(q.tow > 0) && (await ev(`GS.cash`)) === COST - 1 && t.some(s => /A tow out on the Dyfjord road is \$/.test(s)), "a dollar short: refused, and told the price");
  await ev(`GS.cash = 5000; true`); await clearToasts(); await sleep(300);
  await ev(`$("tabS").querySelector("[data-act$=':tow']").click(); true`); t = await toasts(); q = await pdr(); await sleep(400); b = await btns();
  ok(q.tow > 0.95 && q.tow <= 1 && (await ev(`GS.cash`)) === 5000 - COST && t.some(s => /paid\. The tow truck is on its way/.test(s)), "paid: $" + COST + " off the cash, the tow is an hour out");
  ok(b.length === 1 && b[0].t === "TOW ON ITS WAY" && b[0].off, "the button reads TOW ON ITS WAY and is spent");
  ok((await ev(`TLXPL.pdr.tow(${rid})`)) === false && (await ev(`GS.cash`)) === 5000 - COST, "it cannot be paid twice");
  const job = await J(`(() => { const r = jobsList().find(q => q.kind === "plowstuck"); return r ? { meta: r.meta, pay: r.pay } : null; })()`);
  ok(job && /tow truck is on its way/.test(job.meta) && job.pay === "", "the Jobs row says the tow is coming");
  await ev(`TABLET.toggle(false)`);
  await ev(`__q(0.5, 0.25)`); q = await pdr();
  ok(q.st === "stuck" && Math.abs(q.tow - 0.5) < 0.04, "half an hour on: still stuck, the tow half an hour out");
  await clearNotes();
  await ev(`__q(0.55, 0.11)`); q = await pdr();
  const nn = await notes();
  ok(q.st !== "stuck" && !(q.tow > 0) && nn.some(s => / is moving again \| The tow truck pulled their truck back onto the cut/.test(s)), "after the hour they are moving again, and say so (" + q.st + ")");
  q = await until(q => q.st === "home", 1.5);
  const sn = await ev(`__rt(${rid}).st.s[${I}]`), last = (await notes())[0];
  ok(q.st === "home" && sn === 0 && (await ev(`jobsList().filter(q => q.kind === "plowstuck").length`)) === 0 && (await J(`TLXPL.pdr.pins()`)).length === 0, "risk still certain: no second bog in that stretch; it is open, they are home, the row and the pin are gone");
  ok(/is back in \| 1 stretch of the Dyfjord road opened/.test(last), "the trip's own report: " + last.slice(0, 90));
});

await section("D left alone: they walk home, the truck stays", async () => {
  await ev(`__drv(${rid}, 1, 10, 70); true`);
  let q = await bogNow(); P0 = q.p;
  ok(q.st === "stuck" && q.bogI === I, "a new trip can bog in the same stretch again");
  await clearNotes(); const m0 = await mood();
  await ev(`__q(5.9, 0.5)`); q = await pdr();
  ok(q.st === "stuck" && !q.gone && Math.abs((await mood()) - (m0 - 25)) < 2.5, `5.9 h: still in the truck, mood ${m0.toFixed(1)} -> ${(await mood()).toFixed(1)}`);
  await ev(`__q(0.3, 0.1)`); q = await pdr();
  const nn = await notes(), w = nn.find(s => / has walked home \| /.test(s)) || "";
  console.log("   note:", w);
  ok(q.st === "stuck" && q.gone === true && Math.abs(q.p - P0) < 1e-6 && /Their truck stands [\d.]+ km along it until a tow fetches it: PAY A TOW/.test(w), "after 6 h they walk home; the truck stays where it bogged, and the notification says so");
  const pl = await J(`TLXPL.pdr.places().find(p => p.road === ${rid})`), g = await J(`(() => { const p = TLXPL.pdr.places().find(p => p.road === ${rid}); return { spot: p.spot, pts: p.pts || null }; })()`);
  const pins = await J(`TLXPL.pdr.pins()`), where = await ev(`TLXPL.pdr.where(${rid})`), job = await J(`(() => { const r = jobsList().find(q => q.kind === "plowstuck"); return r ? { title: r.title, meta: r.meta } : null; })()`);
  ok(g.spot === "the garage" && !g.pts, "a word with them is had at the garage again (their truck is not at the road's end)");
  ok(pins.length === 1 && /'S TRUCK: STUCK$/.test(pins[0].name) && /^walked home after 6 h/.test(where) && job && /'s truck is stuck on the Dyfjord road$/.test(job.title) && /left there until a tow fetches it/.test(job.meta), "pin, card and Jobs row say the truck is left there: " + pins[0].name);
  const m6 = await mood(); await ev(`__q(2, 0.5)`);
  ok((await mood()) >= m6 - 0.01, "no more mood lost once they are home");
  // a night's sleep: one jump of 9 h
  await ev(`GS.hour += 9; TLX.state("roads").h = GS.hour; TLXPL.con.step(); true`); q = await pdr();
  ok(q.st === "stuck" && q.gone && Math.abs(q.p - P0) < 1e-6, "slept 9 h: the truck is still out there");
  await ev(`GS.cash = 5000; true`);
  ok((await ev(`TLXPL.pdr.tow(${rid})`)) === true, "PAY A TOW for the abandoned truck");
  await clearNotes();
  await ev(`__q(1.05, 0.35)`); q = await pdr();
  const n2 = await notes();
  ok(q.st === "home" && q.p === 0 && !q.gone && q.sk === 0 && n2.some(s => /The tow truck has brought .*'s truck in \| Fetched from/.test(s)), "an hour later the tow has brought it in: home (" + (n2[0] || "").slice(0, 80) + ")");
  await ev(`__clean(${rid}); __drv(${rid}, 1, 10, 70); true`); await km(0);
  q = await setOut(0.5);
  ok(q.st === "out", "and they go out again on the next snow");
  q = await until(q => q.st === "home", 1.5); ok(q.st === "home", "home");
});

let SPOT = null;
await section("E a truck of yours", async () => {
  ok(await hire("mine"), "a driver with no truck hired");
  await ev(`TLX.staff.xact(TLX.staff.at("plow:" + ${rid}).id, "a" + ${uid}); TLXPL.con.step(); true`); await sleep(300);
  let q = await pdr(); ok(q.truck === UID, "your plow truck assigned");
  SPOT = await J(`__tk(${uid})`);
  q = await bogNow(); P0 = q.p;
  let t = await J(`__tk(${uid})`); const f0 = t.fuel;
  const ping = (await notes()).find(s => / is stuck \| /.test(s)) || "";
  ok(q.st === "stuck" && t.out && /in your Nordtrekk/.test(ping), "bogged in your truck: it stays out (\"" + t.out + "\"), the ping names it");
  await ev(`__q(0.6, 0.2)`); t = await J(`__tk(${uid})`);
  ok(Math.abs(t.fuel - f0) < 1e-9, "standing bogged it burns no diesel");
  const acts = await J(`TLXPL.pdr.acts(TLX.staff.at("plow:" + ${rid}), TLXPL.pdr.places().find(p => p.road === ${rid}))`);
  ok(acts.length === 1 && acts[0].k === "tow" && (await ev(`TLX.staff.xact(TLX.staff.at("plow:" + ${rid}).id, "r")`)) === false, "their card: PAY A TOW only, no RECALL while stuck");
  ok((await ev(`TLXPL.pdr.kitWhy(${rid})`)).includes("is out"), "and the truck cannot be had meanwhile");
  ok((await ev(`TLX.staff.xact(TLX.staff.at("plow:" + ${rid}).id, "tow")`)) === true, "a tow paid from the card's own action");
  await ev(`__q(1.04, 0.26)`); q = await pdr();
  ok(q.st === "out" || q.st === "back", "towed with the driver in: on with the work (" + q.st + ")");
  q = await until(q => q.st === "home", 1.5); t = await J(`__tk(${uid})`);
  ok(q.st === "home" && !t.out && t.fuel < f0, "the stretch done, the truck back on its spot");
  // abandoned, then fetched
  await ev(`__drv(${rid}, 1, 10, 70); true`);
  q = await bogNow(); ok(q.st === "stuck", "bogged again on a new trip");
  await ev(`__q(6.2, 0.4)`); q = await pdr(); t = await J(`__tk(${uid})`);
  const w = (await notes()).find(s => / has walked home \| /.test(s)) || "";
  ok(q.gone && t.out && /Your Nordtrekk/.test(w), "left 6 h: they walk home, your truck stays out there");
  await ev(`GS.cash = 5000; TLXPL.pdr.tow(${rid}); __q(1.05, 0.35); true`); q = await pdr(); t = await J(`__tk(${uid})`);
  const n = (await notes()).find(s => /The tow truck has brought your /.test(s)) || "";
  ok(q.st === "home" && !t.out && Math.hypot(t.x - SPOT.x, t.z - SPOT.z) < 0.01 && q.truck === UID && /back on its spot/.test(n), "the tow brings your truck back to its own spot, still theirs to drive");
});

await section("F beside it", async () => {
  ok(await hire("own"), "a driver with their own truck again");
  await km(0); await ev(`__clean(${rid}); __q(1.6, 0.1); true`);
  // stand beside the road where they will bog, then let the clock put them there
  await km(1e9);
  let q = await setOut(0.9); q = q.st === "stuck" ? q : await until(q => q.st === "stuck" || q.st === "home");
  ok(q.st === "stuck", "bogged (you far off)");
  const me = await J(`(() => { const p = TLXPL.pdr.pt(__rt(${rid}), ${q.p} - 14); return { x: p.x - p.tz * -9, z: p.z + p.tx * -9 }; })()`);
  await ev(`__me(${me.x}, ${me.z})`); await sleep(1500);
  let a = await z(); for (let n = 0; n < 30 && !(a && a.v < 0.05 && Math.abs(a.off - 2.7) < 0.1); n++) { await sleep(400); a = await z(); } console.log("  ", JSON.stringify(a));
  ok(a && a.vis && a.v < 0.3 && a.drv && a.lit, "the truck is there, standing still, the driver at the wheel, lamps on");
  ok(a && Math.abs(a.off - 2.7) < 0.15 && a.dyaw < -0.2 && a.dyaw > -0.4, `off its lane toward the windrow (${a ? a.off.toFixed(2) : "?"} m right of the crown) and nosed ${a ? (-a.dyaw * 57.3).toFixed(0) : "?"} degrees into it`);
  await still("k1_bogged", rid);
  // on foot: the hail
  await ev(`(() => { const Z = TLXPL.pdr.seen.get(${rid}); FOOT.on = true; FOOT.x = Z.x - Math.cos(Z.yaw) * 6; FOOT.z = Z.z + Math.sin(Z.yaw) * 6; FOOT.y = surf(FOOT.x, FOOT.z); return true; })()`); await sleep(500);
  const u = await J(`(() => { const o = TLXPL.pdr.prov.use(); return o ? { label: o.label, hint: o.hint() } : null; })()`);
  await clearToasts(); const h = await ev(`TLXPL.pdr.hail(${rid})`); const t = await toasts();
  console.log("   hail:", t.join(" / ").slice(0, 260));
  ok(u && u.label === "HAIL" && h === true && t.some(s => /winds the window down: "Bogged to the axles\. I need a pull out of this: .* I have sat here\."/.test(s)) && !t.some(s => /pulls up/.test(s)), "hailed, they wind the window down and say they are bogged");
  await clearToasts(); await ev(`TLXPL.pdr.wave(${rid})`); const t2 = await toasts();
  ok(t2.some(s => /winds the window up/.test(s)) && !t2.some(s => /drives on/.test(s)), "waved on, they do not \"drive on\"");
  // a reload: all of it kept
  await ev(`save(); true`); const before = await pdr();
  await reload(); await ev(SETUP); await sleep(600); await ev(KIT); await km(1e9);
  q = await pdr();
  ok(q && q.st === "stuck" && Math.abs(q.p - before.p) < 1e-6 && Math.abs(q.sk - before.sk) < 0.2 && q.bogI === I, "a reload: still stuck, in the same place, the hours kept");
  await ev(`__me(${me.x}, ${me.z})`); await sleep(2500);
  // abandoned
  await ev(`__q(6.1, 0.5)`); await sleep(1200); q = await pdr(); a = await z();
  console.log("  ", JSON.stringify(a));
  ok(q.gone && a && a.vis && !a.drv && !a.lit && a.bc < 0.3, "left 6 h: the truck still stands there, nobody at the wheel, lamps and beacon dark");
  await ev(`(() => { const Z = TLXPL.pdr.seen.get(${rid}); FOOT.on = true; FOOT.x = Z.x - Math.cos(Z.yaw) * 6; FOOT.z = Z.z + Math.sin(Z.yaw) * 6; FOOT.y = surf(FOOT.x, FOOT.z); return true; })()`); await sleep(400);
  ok((await ev(`TLXPL.pdr.prov.use() === null && TLXPL.pdr.hail(${rid}) === false`)) === true, "nobody in it to hail");
  await ev(`FOOT.on = false; true`);
  await still("k2_abandoned", rid);
  await ev(`save(); true`); await reload(); await ev(SETUP); await sleep(600); await ev(KIT);
  q = await pdr(); ok(q && q.st === "stuck" && q.gone === true, "a reload keeps the abandoned truck out there");
  await ev(`GS.cash = 5000; TLXPL.pdr.tow(${rid}); __q(1.05, 0.35); true`); q = await pdr();
  ok(q.st === "home", "and a tow still fetches it");
});

console.log(fails ? `FAILS: ${fails}` : "ALL OK");
await done(fails ? 1 : 0);
