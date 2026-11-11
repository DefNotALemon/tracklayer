// Beta break test #2 for the v181 phone HUD: the cases 0101 did not cover. In the pickup's cab, with the tablet open, on a
// 320x568 (iPhone SE 1st gen) and with a safe-area notch inset, plus a long job title. Measures HUD/touch rects for overlaps
// and off-screen parts. Exit 1 on a failure.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x4_mobilehud2.mjs [outdir]
import { boot, ev, send, sleep, tap, shot, reload, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot({ width: 390, height: 664 });
await send("Emulation.setUserAgentOverride", { userAgent: UA, platform: "iPhone" });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
const view = async (w, h) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: true }); await ev(`dispatchEvent(new Event("resize")); true`); await sleep(500); };
await view(390, 664); await reload();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GOD.warm = true; true`); await sleep(500);
await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(800);
const IDS = ["vit", "speedo", "job", "tut", "wnHud", "cpStrip", "tcStick", "tcGas", "tcBrk", "tcHop", "tcLean", "tcHorn", "tcQ", "tcF", "tcWipe", "tcBand", "tcE", "tcUse", "tcOn", "tcTablet", "tcMenu", "tcWh", "tcWing", "tcReel", "tcX", "tcFull", "mapWrap", "tab"];
const rects = () => J(`[...${JSON.stringify(IDS)}.map(id => document.getElementById(id)), ...document.querySelectorAll("#toasts .toast")].map((e, i) => { const id = e ? (e.id || "toast" + i) : "?"; if (!e) return null; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); const vis = cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0.05 && r.width > 2 && r.height > 2 && !e.hidden; return vis ? { id, x: r.x, y: r.y, w: r.width, h: r.height } : null; }).filter(Boolean)`);
const overlap = (a, b) => a.x < b.x + b.w - 2 && b.x < a.x + a.w - 2 && a.y < b.y + b.h - 2 && b.y < a.y + a.h - 2;
const SKIP = new Set(["tcStick|tcGas", "tcStick|tcBrk", "tab|tcStick", "tab|tcGas", "tab|tcBrk"]);
async function check(tag, w, h, ignoreTab = false) {
  const r = (await rects()).filter(x => !(ignoreTab && x.id === "tab")); const bad = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i]; if (a.x < -1 || a.y < -1 || a.x + a.w > w + 1 || a.y + a.h > h + 1) bad.push("OFFSCREEN " + a.id + `(${Math.round(a.x)},${Math.round(a.y)},${Math.round(a.w)}x${Math.round(a.h)})`);
    for (let j = i + 1; j < r.length; j++) if (!SKIP.has(a.id + "|" + r[j].id) && overlap(a, r[j])) bad.push(a.id + "x" + r[j].id);
  }
  console.log(`  ${tag} ${w}x${h}: ${r.map(x => x.id).join(",")}`);
  ok(bad.length === 0, `${tag} ${w}x${h}: no overlaps/offscreen ${bad.join(" ")}`);
  await shot(`${tag}_${w}x${h}`);
}
const stage = async fn => { await fn(); await sleep(600); };
// ---- A: small phone, sled
await view(320, 568);
await check("sled", 320, 568);
await stage(() => ev(`toast("Test toast one: a longish line that wraps maybe"); toast("Second toast"); true`)); await check("sledtoast", 320, 568);
await stage(() => ev(`TABLET.toggle(true, "map"); true`));
const t = await J(`({ open: TABLET.open, mode: TABLET.mode, r: document.getElementById("tab").getBoundingClientRect() })`);
console.log("  tablet", JSON.stringify(t));
await check("tabopen", 320, 568, false);
const sys = await J(`(() => { const e = document.getElementById("tcTablet"); const r = e.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { id: top && top.id, cls: top && top.className }; })()`);
console.log("  element at TABLET button centre with tablet open:", JSON.stringify(sys));
await ev(`TABLET.close(true); true`); await sleep(300);
// ---- B: pickup cab on phone
await ev(`GS.cash = 5000; P.vx = P.vz = 0; true`); await sleep(300);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`closeGarage(); true`); await sleep(300);
const s0 = await J(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(r => r.uid === "v1"); return r ? { x: r.x, z: r.z, yaw: r.yaw } : null; })()`);
console.log("  pickup record", JSON.stringify(s0));
if (s0) {
  await ev(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(r => r.uid === "v1"); const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); FOOT.on = true; FOOT.x = r.x + fz * 3.2 - fx * 0.3; FOOT.z = r.z - fx * 3.2 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
  await sleep(1200); await check("footbeside", 320, 568);
  await tap("KeyQ");
  let got = false; for (let i = 0; i < 60 && !got; i++) { await sleep(250); got = await ev(`!MNT.on && !FOOT.on && !!VEH.cur`); }
  ok(got, "got into the pickup (touch layout)");
  await sleep(600);
  for (const [w, h] of [[320, 568], [390, 664], [844, 390], [667, 375]]) {
    await view(w, h); await check("cab", w, h);
    await stage(() => ev(`toast("Test toast one: a longish line that wraps maybe"); toast("Second toast"); true`)); await check("cabtoast", w, h);
    await stage(() => ev(`(document.getElementById("tcMenu")).dispatchEvent(new PointerEvent("pointerdown", {bubbles:true})); true`)); await check("cabmore", w, h);
    await ev(`(document.getElementById("tcMenu")).dispatchEvent(new PointerEvent("pointerdown", {bubbles:true})); true`);
    await stage(() => ev(`TABLET.toggle(true, "jobs"); true`)); await check("cabtab", w, h);
    await ev(`TABLET.close(true); true`); await sleep(300);
  }
  await ev(`GS.fuel = 0; true`); await sleep(600); await view(390, 664); await check("cabnofuel", 390, 664); await ev(`GS.fuel = 40; true`);
}
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
