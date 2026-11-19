// Beta on v255 (0269 fix, "every other app's label/text/chip row"): open EVERY tablet app at phone / itch sizes and
// look at every .tprow / .treup row: text column under 60 px, row over 140 px tall, row sticking out of the pane.
import { boot, ev, sleep, done, send, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); GS.cash = 90000; true`);
await sleep(500);
await ev(`for (const a of TABLET.apps) { a.hidden = () => false; a.locked = false; } true`);
const PL = `(() => { const out = {}; const t = id => { try { return TLX.state(id); } catch (e) { return null; } };
  const h = t("housing"), l = t("lights"), pr = t("property"), po = t("police");
  if (h) h.hist = [1,2,3].map(i => ({ d: "Mon " + i + " Feb", t: "Rent from the flat above the shop on Storgata, paid in full after a long week", amt: 4200 * i }));
  if (l) l.last = [1,2].map(i => ({ d: "Mon " + i + " Feb", pay: 900, lit: 40 - i * 9, need: 45 }));
  if (pr) pr.last = [1,2].map(i => ({ d: "Mon " + i + " Feb", rent: 3100, rented: 4, nights: 7 }));
  if (po) po.last = [1,2].map(i => ({ d: "Mon " + i + " Feb", why: "Speeding through Kjøllefjord past the school with a trailer on the hitch", fine: 600, paid: 200 }));
  return { h: !!h, l: !!l, pr: !!pr, po: !!po }; })()`;
console.log("planted", JSON.stringify(await J(PL)));
const apps = await J(`TABLET.apps.map(a => a.id)`);
console.log("apps:", apps.join(","));
const scan = () => J(`(() => { const t = $("tabS").getBoundingClientRect(), sc = t.width / $("tabS").offsetWidth; return [...$("tabS").querySelectorAll(".tprow,.treup")].map(e => { const b = { height: e.offsetHeight * sc }; const sp = [...e.children].filter(c => c.tagName === "SPAN" && !c.classList.contains("bchip")).map(c => c.offsetWidth); return { h: Math.round(b.height / sc), sp, out: e.scrollWidth > e.clientWidth + 1, txt: e.textContent.slice(0, 30) }; }); })()`);
for (const [w, h] of [[640, 360], [667, 375], [568, 320], [390, 844]]) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: true });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(400);
  let n = 0;
  for (const id of apps) {
    await ev(`TABLET.toggle(false); true`); await sleep(120);
    await ev(`TABLET.toggle(true, ${JSON.stringify(id)}); true`); await sleep(450);
    const rs = await scan(); n += rs.length;
    const bad = rs.filter(r => r.sp.some(x => x < 60) || r.h > 140 || r.out);
    const kinds = await J(`[...new Set([...$("tabS").querySelectorAll("[class]")].map(e => e.className).filter(c => /row|tr/.test(c)))].slice(0,6)`);
    ok(!bad.length, `${w}x${h} ${id}: ${rs.length} rows [${kinds}]` + (bad.length ? " BAD " + JSON.stringify(bad.slice(0, 3)) : ""));
    if (bad.length) await shot(`bad_${w}x${h}_${id}`);
  }
  console.log(`   ${w}x${h}: ${n} rows scanned`);
}
await done(fails);
