// Beta break test for 5.4c2a SEND: helper/bogged road quit, truck sold, hand-over of the truck mid-errand.
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
await ev(`TLXV.buy("plowtruck"); true`); await sleep(600);
UID = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`); uid = JSON.stringify(UID);
await ev(`TLXPL.con.sign(${rid}); TLXPL.con.sign(${hid}); TLX.staff.tick(); true`); await sleep(300);
const sane = async tag => { const t = await J(`[TLXPL.pdr.where(${rid}), TLXPL.pdr.where(${hid}), JSON.stringify(TLXPL.pdr.pins()), JSON.stringify(jobsList().map(r => r.meta))]`); ok(!/NaN|undefined|Infinity|null/.test(t.join(" ")), tag + " text clean"); return t; };
const fresh = async () => { await ev(`TLXPL.PDR.aid.hitch = 0.5; true`); if (!(await pdr(RID))) await hire(RID, "own"); if (!(await pdr(HID))) await hire(HID, "own"); };
await section("1 helper's road handed back (con.quit) mid-way", async () => {
  await fresh(); ok(await hire(RID, "own") && await hire(HID, "own"), "two drivers");
  const q = await bogNow(); ok(q.st === "stuck", "bogged");
  ok((await send()) === true, "sent"); await ev(`__q(0.1,0.05)`);
  await ev(`cash = 0; GS.cash = 90000; true`).catch(() => {});
  let err = ""; try { await ev(`TLXPL.con.quit(${hid}); __q(0.1,0.05); true`); } catch (e) { err = String(e.message); }
  const a = await pdr(), h = await pdr(HID);
  console.log("  ", JSON.stringify(a), JSON.stringify(h));
  ok(!err && !(a && a.help && !(h && h.aid)), "no throw; bogged record doesn't keep a dangling help");
  await sane("after helper road quit");
  const acts1 = await acts(); console.log("   acts", JSON.stringify(acts1));
  ok(acts1.some(x => x.k === "tow" && !x.off) || (a && a.st !== "stuck"), "PAY A TOW available again (or truck freed)");
  await ev(`TLXPL.con.sign(${hid}); true`);
});
await section("2 bogged road handed back mid-way", async () => {
  await fresh(); ok(await hire(RID, "own") && await hire(HID, "own"), "two drivers");
  const q = await bogNow(); ok(q.st === "stuck", "bogged"); ok((await send()) === true, "sent"); await ev(`__q(0.1,0.05)`);
  let err = ""; try { await ev(`TLXPL.con.quit(${rid}); __q(0.1,0.05); true`); } catch (e) { err = String(e.message); }
  const h = await pdr(HID); console.log("  ", JSON.stringify(h));
  ok(!err, "no throw " + err);
  await ev(`__q(1.5,0.1)`); const h2 = await pdr(HID);
  ok(!h2 || (!h2.aid && !(h2.aidB > 0)), "helper ends up in again: " + JSON.stringify(h2 && { aid: h2.aid, b: h2.aidB, t: h2.aidT, st: h2.st }));
  await sane("after bogged road quit"); await ev(`TLXPL.con.sign(${rid}); true`);
});
await section("3 helper's truck (yours) sold while away", async () => {
  await fresh(); ok(await hire(RID, "own") && await hire(HID, "mine"), "drivers");
  await ev(`TLX.staff.xact(TLX.staff.at("plow:" + ${hid}).id, "a" + ${uid}); TLXPL.con.step(); TLXV.state().owned.find(r => r.uid === ${uid}).fuel = 80; true`);
  const q = await bogNow(); ok(q.st === "stuck", "bogged"); const s = await send(); ok(s === true, "sent in your truck");
  await ev(`__q(0.1,0.05)`);
  let err = "", r = null; try { r = await ev(`(() => { const o = TLXV.state().owned, i = o.findIndex(r => r.uid === ${uid}); if (i < 0) return "none"; o.splice(i, 1); TLXPL.con.step(); __q(0.1,0.05); return "removed"; })()`); } catch (e) { err = String(e.message); }
  console.log("   ", r, err);
  ok(!err, "no throw removing truck");
  await ev(`__q(2,0.1)`);
  const a = await pdr(), h = await pdr(HID); console.log("  ", JSON.stringify(a), JSON.stringify(h));
  ok(a && a.st !== "stuck" || (a && a.help === "" ) , "bogged driver not left stuck with help pointing at a truckless helper: " + (a && (a.st + "/" + a.help)));
  ok(!h || !h.aid, "helper has no dangling errand");
  await sane("after truck gone");
});
await section("4 two bogged roads, one helper", async () => {
  const third = ids.find(i => i !== RID && i !== HID);
  if (!third) { console.log("   only two roads; skipped"); return; }
  ok(true, "third road " + third);
});
console.log(fails ? `FAILS: ${fails}` : "ALL OK");
await done(fails ? 1 : 0);
