// Probe: a driver already OUT on the road when wages go unpaid (owed): does the driver finish, turn round, or freeze?
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`); await sleep(600);
await ev(`(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__q = (h, st) => { for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); TLX.staff.tick(); } return true; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__mid = id => { const r = __rt(id); for (let i = 2; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && r.seg[i - 1].legs.length && (i + 1) * 400 + 40 <= r.len) return i; return -1; };
  return true; })()`);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; TLXPL.PDR.mine = 0; true`);
const R = (await J(`TLXPL.con.routes().map(r => r.id)`))[0], r = JSON.stringify(R);
await ev(`GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(500);
await ev(`TLXPL.con.sign(${r}); TLX.staff.tick(); const a = TLX.staff.post({ id: "plow:" + ${r}, role: "plowdriver" }); a.kit = "own"; a.exp = GS.hour + 500; TLX.staff.hire(a.id); const m = TLX.staff.at("plow:" + ${r}); m.tr.work = 1; m.tr.temper = 0; m.xpReal = 10; m.hap = 70; true`);
const I = await ev(`__mid(${r})`);
await ev(`TLXR.setSnow(${r}, 0.6, ${I}); TLXPL.con.step(); __q(0.85, 0.05); true`);
let q = await J(`__pdr(${r})`); console.log("  out?", JSON.stringify(q));
ok(q && q.st === "out", "driver out on the road");
await ev(`GS.cash = 0; TLX.state("staff").owed = 80; true`);
for (let k = 0; k < 6; k++) {
  await ev(`__q(0.5, 0.1)`);
  const a = await J(`({ q: __pdr(${r}), s: __rt(${r}).st.s[${I}], where: TLXPL.pdr.where(${r}), cash: GS.cash })`);
  console.log("  t+" + (k + 1) * 0.5 + "h", JSON.stringify(a));
}
const f = await J(`({ s: __rt(${r}).st.s[${I}], q: __pdr(${r}) })`);
ok(f.s === 0, "the out driver finishes the stretch they are on even while wages are owed (snow " + f.s + ")");
await done(fails ? 1 : 0);
