// 4.2b2 doors, beta: the Plow app's Doors list under touch (phone viewport) and pad, a storm clock at night,
// a sold blade with complaints standing. Heaps laid with heapSnow + win.lay as x4_bladedoors does.
import { boot, ev, sleep, done, send, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__z = k => TLXPL.win.list().find(q => q.key === k);
  window.__e = k => { const e = TLX.state("plow").win[k]; return e ? JSON.parse(JSON.stringify(e)) : null; };
  window.__pose = (x, z, yaw) => { BOG.on = false; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.yaw = yaw; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); return true; };
  window.__heap = (k, v) => { const q = __z(k), p = heapSnow(q.cx, q.cz, 0.9, v, 0.8); TLXPL.win.lay(q.cx, q.cz, 0.9, p); return p; };
  window.__away = () => { __pose(depot.x, depot.z, 0); TLXPL.rt(TLXV.state().cur).last = null; TLXPL.win.step(); return true; };
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.drv.step(); TLXPL.win.step(); } return true; };
  return true; })()`;
await boot({ width: 844, height: 390, dsf: 2 });
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
const DR = await J(`TLXPL.drv.list().map(c => ({ key: c.key, name: c.name }))`);
const k1 = DR[0].key + ":w", k2 = DR[1].key + ":w";

await section("A two doors blocked, Plow app on a phone", async () => {
  await ev(`__heap(${JSON.stringify(k1)}, 0.9); __heap(${JSON.stringify(k2)}, 1.4); __away(); true`); await sleep(500);
  ok((await J(`Object.keys(TLX.state("plow").win).length`)) === 2, "two complaints standing");
  await ev(`SET.touch = "on"; setTouchUI(); TABLET.toggle(true, "plow"); true`); await sleep(800);
  const r = await J(`(() => { const s = $("tabS"); const rows = [...s.querySelectorAll('[data-tf^="plw:"]')]; const b = s.getBoundingClientRect();
    return { n: rows.length, sw: s.scrollWidth, cw: s.clientWidth, rows: rows.map(e => { const q = e.getBoundingClientRect(); return { h: Math.round(q.height), l: Math.round(q.left), r: Math.round(q.right), t: e.textContent.slice(0, 70) }; }), tab: { l: Math.round(b.left), r: Math.round(b.right), w: innerWidth } }; })()`);
  console.log("  ", JSON.stringify(r));
  ok(r.n === 2, "Doors lists both households");
  ok(r.sw <= r.cw + 2, "no sideways scroll in the app (" + r.sw + " vs " + r.cw + ")");
  ok(r.rows.every(q => q.h >= 28 && q.l >= r.tab.l - 1 && q.r <= r.tab.r + 1), "rows are touch sized and inside the tablet");
  const sel0 = await ev(`JSON.stringify(JOBT.sel ? { x: JOBT.sel.tgt && JOBT.sel.tgt.x } : null)`);
  const rect = await J(`(() => { const e = $("tabS").querySelector('[data-tf^="plw:"]'); e.scrollIntoView({ block: "center" }); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; })()`);
  await sleep(200);
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: rect.x, y: rect.y }] }); await sleep(80);
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(500);
  const sel1 = await ev(`JSON.stringify(JOBT.sel ? { x: JOBT.sel.tgt && JOBT.sel.tgt.x, kind: JOBT.sel.kind } : null)`);
  console.log("   sel before/after a tap on a Doors row:", sel0, sel1);
  ok(true, "(info) tap on a Doors row " + (sel0 !== sel1 ? "tracks it" : "does nothing"));
});
await section("B pad: focus reaches Doors rows, A does what", async () => {
  await ev(`TABLET.toggle(false); TABLET.toggle(true, "plow"); true`); await sleep(500);
  const seen = new Set();
  for (let i = 0; i < 14; i++) { await padSet({ 13: 1 }); await sleep(100); await padSet(); await sleep(180); seen.add(await ev(`TABLET.focus || ""`)); }
  console.log("   focus keys seen:", [...seen].join(" | "));
  ok([...seen].some(k => /^plw:/.test(k)), "d-pad focus reaches a Doors row");
  await ev(`TABLET.focus = ${JSON.stringify("plw:" + k1)}; true`);
  await padSet({ 0: 1 }); await sleep(120); await padSet(); await sleep(500);
  console.log("   after pad A:", await ev(`JSON.stringify({ sel: JOBT.sel && JOBT.sel.kind, app: TABLET.app || null })`));
  await padOff();
});
await section("C night storm: clocks stand; 3h clear: both dug out", async () => {
  await ev(`TABLET.toggle(false); GS.hour = 46; TLX.state("roads").h = 46; TLX.state("plow").winH = 46; true`);
  await ev(`(() => { const w = WX.at; WX.at = () => 1; __hrs(6); WX.at = w; return true; })()`);
  const a = await J(`({ a: __e(${JSON.stringify(k1)}), b: __e(${JSON.stringify(k2)}) })`);
  console.log("   after 6 h storm at night:", JSON.stringify(a));
  ok(a.a && a.b && a.a.h < 0.5 && a.b.h < 0.5, "storm hours do not run the clocks");
  await ev(`__hrs(3.2); true`);
  const c = await J(`({ w: Object.keys(TLX.state("plow").win).length, c: TLX.state("plow").winC })`);
  ok(c.w === 0 && c.c === 2, "after clear hours: both dug out, 2 complaints " + JSON.stringify(c));
});
await section("D sell/unfit the blade with a complaint standing", async () => {
  await ev(`__heap(${JSON.stringify(k1)}, 1.1); __away(); true`); await sleep(300);
  const r = await ev(`(() => { try { TLXPL.unfit(TLXV.state().cur); TLXPL.win.step(); TABLET.toggle(true, "plow"); return "fine"; } catch (e) { return String(e); } })()`); await sleep(500);
  const t = await ev(`$("tabS").textContent`);
  ok(r === "fine" && !/NaN|undefined/.test(t), "unfit blade with a complaint standing: app still renders " + r);
  console.log("   standing after unfit:", JSON.stringify(await J(`__e(${JSON.stringify(k1)})`)));
});
console.log(fails ? `FAILED ${fails}` : "all ok");
await done(fails ? 1 : 0);
