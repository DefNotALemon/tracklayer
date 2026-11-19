// Beta 4: 5.4a2 truck-assigned driver x two plow trucks, cab, swap, reload, record lost while out
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
const SETUP = `TLXPL.PDR.wayMax = 0; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
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
const RID = "dyfjord";
const pick = await J(`TLXPL.con.routes().map(r => { let b = -1; for (let i = 4; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && r.seg[i - 1].legs.length && r.seg[i + 1].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; if (i >= 5) break; } return { id: r.id, i: b }; }).filter(q => q.i >= 4)`);
const R0 = pick.find(q => q.id === RID) || pick[0];
const rid = JSON.stringify(R0.id), I = R0.i;
await ev(`GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); TLXV.buy("plowtruck"); true`); await sleep(700);
const trucks = await J(`TLXV.state().owned.filter(r => r.id === "plowtruck").map(r => r.uid)`);
console.log("trucks", trucks);
const UID = trucks[0], uid = JSON.stringify(UID), UID2 = trucks[1];
await ev(`TLXPL.PDR.mine = 1; TLXPL.con.sign(${rid}); TLX.staff.tick(); true`); await sleep(300);
const DID = (await J(`TLX.state("staff").apps`))[0].id;
await ev(`TLX.staff.hire(${DID}); __drv(${rid}, 1, 10, 70); true`);
const snow = (i, v) => ev(`TLXR.setSnow(${rid}, ${v}, ${i}); TLXPL.con.step(); true`);

await section("A assign while you sit in that truck's cab", async () => {
  await ev(`TLXV.swapTo(${uid}); true`); await sleep(500);
  const cur = await ev(`TLXV.state().cur`);
  console.log("  cur", cur);
  const r = await ev(`TLX.staff.xact(${DID}, "a" + ${uid})`);
  const a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), cur: TLXV.state().cur, n: TABLET.log.map(n => n.title + " | " + n.body).slice(-3), tx: [...$("toasts").children].map(c=>c.textContent) })`);
  console.log("  ", JSON.stringify({ r, a }));
  ok(a.q.truck === UID && a.cur === UID, "assigning the truck you sit in: allowed, driver stays home (truck=" + a.q.truck + ", cur=" + a.cur + ")");
  await snow(I - 1, 0.5); await snow(I, 0.6);
  await ev(`__q(2, 0.25); true`);
  const b = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), cur: TLXV.state().cur })`);
  ok(/you are in/.test(b.q.told), "and after a while the card says why: " + b.q.told);
  console.log("  after 2h with you inside", JSON.stringify(b));
  ok(!(b.q.st === "out" && b.cur === UID), "driver is not out in the truck while you are in its cab");
  await ev(`TLXV.swapTo(null); FOOT.on = false; true`); await sleep(300);
});

await section("B truck out, you take the other plow truck over the same road", async () => {
  await ev(`TLX.staff.xact(${DID}, "r"); __clean(${rid}); true`); await ev(`__q(0.6, 0.1); true`);
  console.log("  state after recall", JSON.stringify(await J(`__pdr(${rid})`)));
  await ev(`TLX.staff.xact(${DID}, "a" + ${uid}); true`);
  await snow(I - 1, 0.5); await snow(I, 0.6);
  await ev(`__q(0.9, 0.3); __q(0.05, 0.05); true`);
  let a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}) })`);
  ok(a.q.st === "out" && a.t.out, "driver out in truck 1: " + JSON.stringify(a.q));
  await ev(`TLXV.swapTo(${JSON.stringify(UID2)}); true`); await sleep(500);
  const cur = await ev(`TLXV.state().cur`);
  ok(cur === UID2, "swapped into truck 2 while truck 1 is out");
  const t1 = await J(`__tk(${uid})`);
  ok(t1.out && !t1.vis, "truck 1 stays out, undrawn after the swap");
  // reload with it out, still swapped state
  await reload();
  await ev(SETUP); await sleep(500); await ev(KIT);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), cur: TLXV.state().cur })`);
  console.log("  after reload", JSON.stringify(a));
  ok(a.t && a.t.out && a.q && a.q.truck === UID, "reload with truck 1 out and truck 2 current keeps both");
});

await section("C truck record removed while OUT on the road", async () => {
  await ev(`__q(0.1, 0.05); true`);
  let a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}) })`);
  console.log("  pre", JSON.stringify(a));
  const r = await ev(`(() => { try { const s = TLXV.state(); s.owned = s.owned.filter(r => r.uid !== ${uid}); TLXPL.con.step(); TLX.staff.tick(); for (let i=0;i<8;i++) { GS.hour += 0.25; TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return "ok"; } catch (e) { return "THREW " + e.message; } })()`);
  a = await J(`({ q: __pdr(${rid}), m: TLX.staff.at("plow:" + ${rid}) && 1, n: TABLET.log.map(n => n.title + " | " + n.body).slice(-2) })`);
  console.log("  post", r, JSON.stringify(a));
  ok(r === "ok", "no exception when the truck out vanishes");
  ok(!a.q || a.q.truck !== UID, "driver no longer holds the missing truck: " + JSON.stringify(a.q));
  const txt = await app("staff"); const plow = await app("plow");
  ok(!/undefined|NaN|null/.test(txt + plow), "cards read clean after the loss");
});

console.log(fails ? `x5_plowdriver_mine_beta: ${fails} FAILED` : "x5_plowdriver_mine_beta: all ok");
await done(fails ? 1 : 0);
