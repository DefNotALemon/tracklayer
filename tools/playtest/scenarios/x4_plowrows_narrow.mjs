// Beta fix 0269 #1/#2: the Plow app's named rows (Streets, Doors, Statements) in a narrow tablet pane.
// A short landscape phone (667x375) and the itch embed (640x360) squeezed the row's text into a 15-42 px column,
// one word piece per line, the row 263-751 px tall. Asserts: in every viewport no part of a row is under 60 px
// wide, no row is over 130 px tall, nothing sticks out of the pane; on a desktop the row is still one line.
import { boot, ev, sleep, done, send, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const HEAPS = `(() => { const L = TLXPL.str.list(); const q = L.find(q => Math.hypot(q.cx - depot.x, q.cz - depot.z) > 58) || L[0]; const p = heapSnow(q.cx, q.cz, 1.0, 2.5, 0.8); TLXPL.str.lay(q.cx, q.cz, 1.0, p);
  const W = TLXPL.win.list().filter(w => Math.hypot(w.cx - q.cx, w.cz - q.cz) > 30).slice(0, 2); for (const w of W) { const pw = heapSnow(w.cx, w.cz, 0.9, 1.2, 0.8); TLXPL.win.lay(w.cx, w.cz, 0.9, pw); }
  TLX.state("plow").conLast = [{ d: "Mon 3 Feb", road: "the Gamvik road", n: 14, pay: 1240, dn: 6, w: 2, lapsed: true }, { d: "Mon 27 Jan", road: "the Mehamn road", m: 8400, pay: 660 }];
  P.x = depot.x; P.z = depot.z; TLXPL.rt(TLXV.state().cur).last = null; TLXPL.str.step(); TLXPL.win.step(); return true; })()`;
const open = async () => { await ev(`TABLET.toggle(false); true`); await sleep(200); await ev(`TABLET.toggle(true, "plow"); true`); await sleep(700); };
// every .tprow in the app: its box, its children's boxes, and whether the children sit on one line
const rows = () => J(`(() => { const t = $("tabS").getBoundingClientRect(), sc = t.width / $("tabS").offsetWidth; return { tab: [Math.round(t.width), Math.round(t.height)], logical: $("tabS").offsetWidth, rows: [...$("tabS").querySelectorAll(".tprow")].map(e => { const b = e.getBoundingClientRect(), k = [...e.children].map(c => { const r = c.getBoundingClientRect(); return { t: c.classList.contains("bchip") ? "CHIP" : c.tagName, w: Math.round(r.width / sc), h: Math.round(r.height / sc), top: Math.round((r.top - b.top) / sc), left: Math.round((r.left - b.left) / sc), txt: c.textContent.slice(0, 14) }; }); return { tf: e.dataset.tf || "", w: Math.round(b.width / sc), h: Math.round(b.height / sc), out: b.right > t.right + 1 || b.left < t.left - 1 || e.scrollWidth > e.clientWidth + 1, k }; }) }; })()`);
const kind = r => r.tf.startsWith("pls:") ? "street" : r.tf.startsWith("plw:") ? "door" : "statement";
const check = (r, nm) => {
  const by = k => r.rows.filter(x => kind(x) === k);
  ok(by("street").length === 1 && by("door").length === 2 && by("statement").length === 2, `${nm}: 1 Streets row, 2 Doors rows, 2 Statements rows (${by("street").length}/${by("door").length}/${by("statement").length})`);
  const thin = r.rows.flatMap(x => x.k.filter(c => c.t !== "CHIP" && c.w < 60).map(c => `${kind(x)} ${c.t} "${c.txt}" ${c.w}px`));
  ok(!thin.length, `${nm}: no label or text under 60 px wide ${thin.join("; ")}`);
  const hit = (a, b) => a.left < b.left + b.w - 1 && b.left < a.left + a.w - 1 && a.top < b.top + b.h - 1 && b.top < a.top + a.h - 1;
  const lap = r.rows.flatMap(x => x.k.flatMap((a, i) => x.k.slice(i + 1).filter(b => hit(a, b)).map(b => `${kind(x)} ${a.t}/${b.t}`)));
  ok(!lap.length, `${nm}: label, text and chip never overlap ${lap.join("; ")}`);
  ok(r.rows.every(x => x.k.filter(c => c.t === "CHIP").length === 1), `${nm}: every row shows its chip`);
  const tall = r.rows.filter(x => x.h > 130).map(x => `${kind(x)} ${x.h}px`);
  ok(!tall.length, `${nm}: no row over 130 px tall (tallest ${Math.max(...r.rows.map(x => x.h))}) ${tall.join("; ")}`);
  ok(r.rows.every(x => !x.out), `${nm}: no row sticks out of the pane`);
  const txt = r.rows.map(x => x.k.find(c => c.t === "SPAN")).filter(Boolean);
  console.log(`   ${nm}: pane ${r.tab} (logical ${r.logical}), text widths ${txt.map(c => c.w)}, row heights ${r.rows.map(x => x.h)}`);
  return txt;
};
await boot(); await ev(SETUP); await sleep(600);
await ev(`GS.hour = 46; TLX.state("roads").h = 46; GS.cash = 40000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
await ev(HEAPS); await sleep(500);
// stills: keep notifications and toasts off the rows (they cover the list on a phone)
await ev(`(() => { const s = document.createElement("style"); s.textContent = "#tabS .tnote,#toasts{display:none!important}"; document.head.appendChild(s); return true; })()`);
await section("1 desktop: rows stay one line", async () => {
  await open(); const r = await rows(); check(r, "desktop");
  const one = r.rows.every(x => x.k.every(c => Math.abs(c.top + c.h / 2 - x.h / 2) < x.h / 2 && c.top < x.h) && x.k.find(c => c.t === "B").top < x.k.find(c => c.t === "SPAN").top + x.k.find(c => c.t === "SPAN").h);
  const side = r.rows.every(x => { const b = x.k.find(c => c.t === "B"), s = x.k.find(c => c.t === "SPAN"); return b.w >= 100 && b.w <= 108 && s.top < b.top + b.h; });
  ok(one && side, "desktop: the label keeps its 104 px column with the text beside it");
  ok(!/NaN|undefined/.test(await ev(`$("tabS").textContent`)), "text clean");
  await shot("desktop");
});
for (const [nm, w, h] of [["portrait 390x844", 390, 844], ["landscape 667x375", 667, 375], ["embed 640x360", 640, 360], ["landscape 844x390", 844, 390], ["small 568x320", 568, 320]]) {
  await section("2 phone " + nm, async () => {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(500);
    await open(); const r = await rows(); const txt = check(r, nm);
    ok(txt.every(c => c.w >= 130), `${nm}: every row's text is at least 130 px wide (${Math.min(...txt.map(c => c.w))})`);
    const vis = await J(`(() => { const e = document.querySelector("[data-tf^='pls:'].tprow"); e.scrollIntoView({ block: "center" }); const b = e.getBoundingClientRect(), v = $("tabV").getBoundingClientRect(); return { top: Math.round(b.top - v.top), bot: Math.round(v.bottom - b.bottom) }; })()`);
    if (h >= 360) ok(vis.top >= -1 && vis.bot >= -1, `${nm}: the whole Streets row fits in the pane when scrolled to ${JSON.stringify(vis)}`);
    else console.log(`   ${nm}: Streets row against the pane ${JSON.stringify(vis)} (a 134 px tablet: not asserted)`);
    await sleep(200); await shot("phone_" + w + "x" + h);
  });
}
console.log(fails ? `FAILED ${fails}` : "all ok");
await done(fails ? 1 : 0);
