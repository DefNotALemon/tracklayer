// Beta 5.4a1: hostile SAVED pdr record (own-truck driver) through a real reload: st/p/w/n/cash/wkN/wkCash/who junk.
// No throw, no NaN/undefined text, no runaway pay, driver still works afterwards. Exit 1 on failure.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const tabText = () => ev(`$("tabS").textContent.replace(/\\s+/g, " ")`);
const app = async id => { await ev(`TABLET.toggle(true, ${JSON.stringify(id)}); TABLET.render(); true`); await sleep(450); return tabText(); };
const SETUP = `TLXPL.PDR.mine = 0; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__q = (h, st) => { st = st || 0.5; for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__drv = (id, work, xp, hap) => { const m = TLX.staff.at("plow:" + id); m.tr.work = work; m.tr.temper = 0; m.xpReal = xp; m.hap = hap; m.mood = 0; m.wage = TLX.staff.fair(m); return TLXPL.pdr.skill(m, id); };
  return true; })()`;
const BAD = /undefined|NaN|null|Infinity|\[object/;

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 60000; true`);
const RID = "dyfjord", rid = JSON.stringify(RID);
const I = await ev(`(() => { const r = __rt(${rid}); let b = -1; for (let i = 2; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && r.seg[i - 1].legs.length && r.seg[i + 1].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; if (i >= Math.floor(r.seg.length / 2)) break; } return b; })()`);
await ev(`GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(600);
await ev(`TLXPL.con.sign(${rid}); TLX.staff.tick(); true`); await sleep(300);
const DID = (await J(`TLX.state("staff").apps`))[0].id;
await ev(`TLX.staff.hire(${DID}); __drv(${rid}, 1, 10, 70); __q(0.1, 0.1); true`);
console.log("rec", JSON.stringify(await J(`__pdr(${rid})`)), "driver", JSON.stringify(await J(`TLX.staff.at("plow:" + ${rid})`)).slice(0, 120));
console.log("route stretch", I);

const CASES = [
  ["p huge", { st: "out", p: 1e12 }],
  ["p negative", { st: "out", p: -500 }],
  ["p string", { st: "out", p: "abc" }],
  ["st junk", { st: { a: 1 }, p: 200 }],
  ["back huge p", { st: "back", p: 9e9 }],
  ["w huge", { st: "home", w: 1e9 }],
  ["n/cash huge", { st: "out", p: 100, n: 1e9, cash: 1e12 }],
  ["wkCash huge+neg", { wkN: -5, wkCash: -1e9 }],
  ["who wrong", { st: "out", p: 300, who: 99999 }],
  ["truck on own kit", { st: "out", p: 300, truck: "ghost" }],
  ["hold/rc strings", { st: "back", p: 0, hold: "yes", rc: "no" }],
];
let k = 0;
for (const [nm, patch] of CASES) await section(nm, async () => {
  k++;
  await ev(`(() => { const q = TLX.state("plow").pdr[${rid}]; Object.assign(q, ${JSON.stringify(patch)}); save(); return true; })()`);
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const a0 = await J(`__pdr(${rid})`);
  console.log("   loaded", JSON.stringify(a0));
  const fin = v => typeof v === "number" && isFinite(v) && v >= 0;
  ok(a0 && ["home", "out", "back"].includes(a0.st) && ["p", "w", "n", "cash", "wkN", "wkCash"].every(f => fin(a0[f])), nm + ": record tidied to finite non-negative numbers, st valid");
  const len = await ev(`__rt(${rid}).len`);
  ok(a0 && a0.p <= len + 1, nm + ": p within the road (" + (a0 && a0.p) + " <= " + Math.round(len) + ")");
  const c0 = await ev("GS.cash");
  await ev(`TLXR.setSnow(${rid}, 0.5, ${I - 1}); TLXR.setSnow(${rid}, 0.6, ${I}); TLXPL.con.step(); true`);
  const r = await ev(`(() => { try { __q(3, 0.25); TLX.staff.tick(); return "ok"; } catch (e) { return "THREW " + e.message; } })()`);
  ok(r === "ok", nm + ": 3 h on, no exception (" + r + ")");
  const a = await J(`({ q: __pdr(${rid}), m: TLX.staff.at("plow:" + ${rid}), cash: GS.cash, s: __rt(${rid}).st.s.slice(${I - 1}, ${I + 1}) })`);
  const gain = a.cash - c0;
  console.log("   after", JSON.stringify(a.q), "gain", gain, "snow", a.s);
  ok(a.m && a.m.role === "plowdriver", nm + ": driver still on the books");
  ok(gain >= 0 && gain < 400, nm + ": pay sane (+$" + gain + ")");
  ok(a.q && a.q.st === "home" && a.s[0] === 0 && a.s[1] === 0, nm + ": driver worked it and is home, both stretches open (" + JSON.stringify(a.s) + ")");
  const st = await app("staff"), pt = await app("plow");
  ok(!BAD.test(st + pt), nm + ": cards read clean " + ((st + pt).match(/.{20}(undefined|NaN|null|Infinity|\[object).{20}/) || [""])[0]);
  const nt = await J(`TABLET.log.map(n => n.title + " | " + n.body)`);
  ok(!nt.some(x => BAD.test(x)), nm + ": notifications clean " + nt.filter(x => BAD.test(x)).join(" // "));
  if (!NOSTILLS && (nm === "p huge" || nm === "n/cash huge")) await shot("hostile_" + k);
  await ev(`TABLET.toggle(false); TLXR.setSnow(${rid}, 0); true`);
});
console.log(fails ? `x5_plowdriver_pdr_hostile_beta: ${fails} FAILED` : "x5_plowdriver_pdr_hostile_beta: all ok");
await done(fails ? 1 : 0);
