// Mobile touch scheme: phone layouts (portrait + landscape, SE to Pro Max), stick / gas / on-foot buttons respond,
// Settings > Graphics, the iPhone full-screen card. Asserts, exit 1 on a failure.
import { boot, ev, send, tap, sleep, shot, reload, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
await boot({ width: 390, height: 664 });
await send("Emulation.setUserAgentOverride", { userAgent: UA, platform: "iPhone" });
await send("Page.addScriptToEvaluateOnNewDocument", { source: "for (const k of [\"fullscreenEnabled\", \"webkitFullscreenEnabled\"]) Object.defineProperty(Document.prototype, k, { get: () => false }); Element.prototype.requestFullscreen = undefined;" });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
const view = async (w, h) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: true }); await ev(`dispatchEvent(new Event("resize")); true`); await sleep(700); };
await view(390, 664);
await reload();
await ev(`tutSkip(); true`); await sleep(500);
await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(800);
let s = JSON.parse(await ev(`JSON.stringify({ mobile: GFX.mobile, phone: GFX.phone, ios: GFX.ios, sa: GFX.standalone, tc: TC.on, tip: !$("fsTip").hidden, hidden: $("touch").hidden })`));
console.log(JSON.stringify(s));
ok(s.mobile && s.phone && s.ios && !s.sa, "GFX detects an iPhone (mobile, phone, ios, not standalone)");
ok(s.tc && !s.hidden, "touch controls are on and visible");
ok(!s.tip, "the card is dismissed by launching (it shows on the title menu)");
await ev(`toggleSettings(true); $("fsBtn").click(); true`); await sleep(400);
s = JSON.parse(await ev(`JSON.stringify({ b: $("fsBtn").textContent, bh: $("fsBtn").hidden, tip: !$("fsTip").hidden, how: $("fsHow").textContent })`)); console.log(JSON.stringify(s));
ok(!s.bh && /how/i.test(s.b) && s.tip && /Add to Home Screen/.test(s.how), "iPhone (ios, not standalone, no fullscreen API): Settings > Full screen: how opens the Add to Home Screen card");
await shot("m_tip");
await ev(`$("fsOk").click(); toggleSettings(false); true`);
const rects = () => ev(`JSON.stringify([...document.querySelectorAll("#touch .tc, #touch .pedal")].filter(e => !e.hidden && e.offsetParent !== null && e.closest("#tcSheet") === null).map(e => { const r = e.getBoundingClientRect(); return { id: e.id, x: r.left, y: r.top, w: r.width, h: r.height }; }))`).then(JSON.parse);
const overlap = (a, b) => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
for (const [nm, w, h] of [["se_portrait", 375, 548], ["p390", 390, 664], ["promax_portrait", 430, 740], ["land844", 844, 390], ["land_se", 667, 375], ["land_promax", 932, 430]]) {
  await view(w, h);
  const r = await rects(); const bad = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i]; if (a.x < -1 || a.y < -1 || a.x + a.w > w + 1 || a.y + a.h > h + 1) bad.push("offscreen " + a.id);
    for (let j = i + 1; j < r.length; j++) if (overlap(a, r[j])) bad.push(a.id + "x" + r[j].id);
  }
  console.log(nm, w + "x" + h, r.map(x => x.id).join(","));
  ok(bad.length === 0, `${nm}: ${r.length} ride buttons, none overlap or leave the screen ${bad.join(" ")}`);
  await shot("m_" + nm);
}
await view(390, 664);
const touch = (type, x, y, id = 1) => send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id }] });
const tapEl = async id => { const r = JSON.parse(await ev(`(() => { const r = $("${id}").getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()`)); await touch("touchStart", r.x, r.y, 9); await sleep(120); await touch("touchEnd", r.x, r.y, 9); };
// on foot (tutSkip leaves you beside the sled): the context buttons
await ev(`FOOT.x = P.x + 1.2; FOOT.z = P.z; BOG.on = true; BOG.dig = 0; true`); await sleep(600);
s = JSON.parse(await ev(`JSON.stringify({ foot: FOOT.on, use: $("tcUse").hidden ? null : $("tcUse").textContent, on: $("tcOn").hidden ? null : $("tcOn").textContent, x: $("tcX").hidden ? null : $("tcX").textContent, cap: $("tcStickCap").textContent })`));
console.log(JSON.stringify(s));
ok(s.foot && s.use === "DIG" && s.on === "GET ON" && s.x === "SIZE UP", "on foot beside a bogged sled: DIG / GET ON / SIZE UP");
await touch("touchStart", 90, 540, 3); await touch("touchEnd", 90, 540, 3); await sleep(300);
s = JSON.parse(await ev(`JSON.stringify({ hint: $("wnHint").textContent, dev: INP.dev })`));
ok(s.dev === "touch" && /tap DIG/.test(s.hint) && !/\b[EQX]: /.test(s.hint), "hint speaks in button names: " + s.hint);
await shot("m_foot");
await view(844, 390); await shot("m_foot_land"); await view(390, 664);
await tapEl("tcUse"); await sleep(600); s = JSON.parse(await ev(`JSON.stringify({ dig: !!FOOT.dig, l: $("tcUse").textContent })`)); ok(s.dig && s.l === "STOP", "tcUse starts the dig and reads STOP");
await tapEl("tcUse"); await sleep(400);
await ev(`BOG.on = false; true`); await sleep(400);
const f0 = JSON.parse(await ev(`JSON.stringify([FOOT.x, FOOT.z])`));
await touch("touchStart", 90, 540, 3); await touch("touchMove", 90, 480, 3); await sleep(2500);
const f1 = JSON.parse(await ev(`JSON.stringify([FOOT.x, FOOT.z])`)); await touch("touchEnd", 90, 480, 3);
ok(Math.hypot(f1[0] - f0[0], f1[1] - f0[1]) > 1.5, "stick up walks: moved " + Math.hypot(f1[0] - f0[0], f1[1] - f0[1]).toFixed(1) + " m");
await ev(`FOOT.x = P.x + 1.2; FOOT.z = P.z; true`); await sleep(500);
await tapEl("tcOn"); for (let i = 0; i < 20 && JSON.parse(await ev(`JSON.stringify(FOOT.on)`)); i++) await sleep(400);
ok(!JSON.parse(await ev(`JSON.stringify(FOOT.on)`)), "tcOn (GET ON) climbs back on the sled");
await sleep(500); await shot("m_ride");
// riding: stick steers, gas pedal accelerates
await touch("touchStart", 90, 520); await touch("touchMove", 130, 520); await sleep(300);
s = JSON.parse(await ev(`JSON.stringify({ steer: TC.steer, act: TC.active })`)); ok(s.steer > 0.3 && s.act, "stick drag right steers: " + s.steer.toFixed(2));
await touch("touchEnd", 130, 520); await sleep(200); s = JSON.parse(await ev(`JSON.stringify({ steer: TC.steer })`)); ok(s.steer === 0, "stick released: steer 0");
const g = JSON.parse(await ev(`(() => { const r = $("tcGas").getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height * 0.15 }); })()`));
await touch("touchStart", g.x, g.y, 2); await sleep(3500);
s = JSON.parse(await ev(`JSON.stringify({ thr: TC.thr, v: Math.hypot(P.vx, P.vz) })`)); ok(s.thr > 0.9 && s.v > 2, `gas pedal near top: thr ${s.thr.toFixed(2)}, speed ${s.v.toFixed(1)} m/s`);
await touch("touchEnd", g.x, g.y, 2);
await ev(`P.vx = P.vz = 0; true`);
// settings > graphics
await ev(`toggleSettings(true); true`); await sleep(400);
const labels = [];
for (let i = 0; i < 4; i++) { labels.push(await ev(`$("gfxBtn").textContent`)); await ev(`$("gfxBtn").click(); true`); await sleep(300); }
console.log("graphics cycle:", labels.join(" | ")); ok(new Set(labels).size >= 3 && labels.some(l => /auto/i.test(l)) && labels.some(l => /high/i.test(l)) && labels.some(l => /low/i.test(l)), "Graphics cycles auto / high / low");
await ev(`$("fpsBtn").click(); true`); await sleep(1500);
s = JSON.parse(await ev(`JSON.stringify({ b: $("fpsBtn").textContent, vis: !$("fps").hidden, t: $("fps").textContent })`)); console.log(JSON.stringify(s)); ok(s.vis && s.t.length > 0, "frame-rate readout shows: " + s.t);
await shot("m_settings");
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
