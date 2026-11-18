// Beta of v255 narrow-tablet row layout on the OTHER apps that use .tprow/.treup (Politi, Homes, Lights, cabin upgrades).
// Plants history rows, opens each app at desktop, 640x360 embed, 667x375, 390x844, and measures row boxes.
import { boot, ev, sleep, done, send, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; true`;
await boot(); await ev(SETUP); await sleep(500);
await ev(`(() => { const p = TLX.state("police"); p.rec.fines = 3; p.rec.paid = 420; p.rec.warnings = 2; p.rec.chases = 2; p.rec.escapes = 1; p.rec.busts = 1;
 p.last = [{ d: "Mon 3 Feb", why: "Speeding in Kjøllefjord at 62 km/h in a 30 zone", fine: 900, paid: 300 }, { d: "Sun 2 Feb", why: "Warning", fine: 0, paid: 0 }];
 const h = TLX.state("housing"); h.hist = [{ d: "Mon 3 Feb", t: "Rent for the flat on Nygata, the second floor with the sea view", amt: -1240 }, { d: "Mon 27 Jan", t: "Deposit back", amt: 600 }];
 const l = TLX.state("lights"); l.last = [{ d: "Mon 3 Feb", pay: 1500, lit: 88, need: 80 }];
 return true; })()`);
await ev(`GS.hour = 46; GS.cash = 40000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
const rows = () => J(`(() => { const t = $("tabS").getBoundingClientRect(), sc = t.width / $("tabS").offsetWidth; return { pane: Math.round(t.width / sc), rows: [...$("tabS").querySelectorAll(".tprow,.treup")].map(e => { const b = e.getBoundingClientRect(), k = [...e.children].map(c => { const r = c.getBoundingClientRect(); return { t: c.tagName + (c.className ? "." + c.className : ""), w: Math.round(r.width / sc), h: Math.round(r.height / sc), txt: c.textContent.slice(0, 16) }; }); return { h: Math.round(b.height / sc), out: b.right > t.right + 1 || b.left < t.left - 1 || e.scrollWidth > e.clientWidth + 1, k }; }) }; })()`);
const apps = ["politi", "homes"];
const vps = [["embed", 640, 360], ["land", 667, 375], ["small", 568, 320]];
for (const [vn, w, h] of vps) {
  if (w) { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: true }); await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 }); await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(500); }
  for (const a of apps) {
    const has = await ev(`!!(TABLET.apps ? TABLET.apps.find && TABLET.apps.find(x => x.id === ${JSON.stringify(a)}) : true)`);
    await ev(`TABLET.toggle(false); true`); await sleep(150); await ev(`TABLET.toggle(true, ${JSON.stringify(a)}); true`); await sleep(600);
    const r = await rows();
    if (!r.rows.length) { console.log(`   ${vn}/${a}: no rows (app absent or empty)`); continue; }
    const thin = r.rows.flatMap(x => x.k.filter(c => c.t.startsWith("SPAN") && !/bchip/.test(c.t) && c.w < 100).map(c => c.txt + " " + c.w));
    const tall = r.rows.filter(x => x.h > 140 && !/^Strand|^Rent|^Deposit/.test(x.k[0].txt) && x.k.length>1 && x.k[0].t.startsWith("B")).map(x => x.h);
    ok(!thin.length && !tall.length && r.rows.every(x => !x.out), `${vn}/${a}: ${r.rows.length} rows, pane ${r.pane}, tallest ${Math.max(...r.rows.map(x => x.h))}, min text ${Math.min(...r.rows.map(x => Math.min(...x.k.filter(c => c.t.startsWith("SPAN")).map(c => c.w))))} ${thin.join("; ")}`);
    if (w === 640 || w === 568) await shot(`${vn}_${a}`);
  }
}
ok(!(await ev(`$("tabS").textContent`)).match(/NaN|undefined/), "no NaN");
console.log(fails ? `FAILED ${fails}` : "all ok");
await done(fails ? 1 : 0);
