import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.setOn("police", false); TLX.setOn("traffic", false); true`);
await ev(`GS.cash = 40000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
for (const h of [34, 34 + 24 * 25]) {
  await ev(`GS.hour = ${h}; TLX.state("roads").h = GS.hour; true`); await sleep(1500);
  const r = await ev(`JSON.stringify({ pn: CAL.isPolarNight(), mul: payMul() })`);
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(500);
  const txt = await ev(`$("tabS").textContent.replace(/\\s+/g, " ")`);
  console.log("  hour", h, r, "|", (txt.match(/\$\d+ a 400 m[^$]{0,30}/) || [""])[0]);
  const pn = JSON.parse(r).pn;
  const m = txt.match(/\$(\d+) a 400 m/); const price = m ? +m[1] : 0;
  ok(price === (pn ? 150 : 100), `card price ${price} matches polar night = ${pn}`);
  await ev(`TLXPL.con.sign("dyfjord"); true`); await sleep(300);
  const tt = await ev(`JSON.stringify([...$("toasts").children].map(c => c.textContent))`); console.log("  toast", tt);
  await ev(`TLXPL.con.quit("dyfjord"); TABLET.toggle(false); true`);
}
await done(fails ? 1 : 0);
