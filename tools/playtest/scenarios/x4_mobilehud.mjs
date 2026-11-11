// Beta break test for the mobile HUD rearrangement (68df8e5, v178): vitals top-left, speedo top-right, zone/minimap hidden on touch.
// Measures every visible HUD element and touch control on phone sizes, riding / on foot / tutorial card / toasts / job bar /
// MORE sheet / bleeding+bandage, and reports overlaps and off-screen parts. Exit 1 on a failure.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x4_mobilehud.mjs [outdir]
import { boot, ev, send, sleep, shot, reload, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
await boot({ width: 390, height: 664 });
await send("Emulation.setUserAgentOverride", { userAgent: UA, platform: "iPhone" });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
const view = async (w, h) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: true }); await ev(`dispatchEvent(new Event("resize")); true`); await sleep(700); };
await view(390, 664); await reload();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GOD.warm = true; true`); await sleep(500);
await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(800);
const IDS = ["vit", "speedo", "job", "tut", "tcSheet", "wnHud", "tabBan", "cpStrip", "tcStick", "tcGas", "tcBrk", "tcHop", "tcLean", "tcHorn", "tcQ", "tcF", "tcWipe", "tcBand", "tcE", "tcUse", "tcOn", "tcX", "tcReel", "tcTablet", "tcMenu", "tcWing", "tcWh", "mailBar", "dist"];
const rects = () => ev(`JSON.stringify([...${JSON.stringify(IDS)}.map(id => document.getElementById(id)), ...document.querySelectorAll("#toasts .toast")].map((e, i) => { const id = e ? (e.id || "toast" + i) : ""; if (!e) return null; const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || e.hidden || +cs.opacity < 0.05) return null; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return null; return { id, x: r.left, y: r.top, w: r.width, h: r.height }; }).filter(Boolean))`).then(JSON.parse);
const overlap = (a, b) => a.x < b.x + b.w - 2 && b.x < a.x + a.w - 2 && a.y < b.y + b.h - 2 && b.y < a.y + a.h - 2;
// pairs that are meant to stack (container over its own children / transparent holders)
const SKIP = new Set(["tcStick|tcGas", "tcStick|tcBrk"]);
async function check(tag, w, h) {
  const r = await rects(); const bad = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i]; if (a.x < -1 || a.y < -1 || a.x + a.w > w + 1 || a.y + a.h > h + 1) bad.push("OFFSCREEN " + a.id);
    for (let j = i + 1; j < r.length; j++) if (!SKIP.has(a.id + "|" + r[j].id) && overlap(a, r[j])) bad.push(a.id + "x" + r[j].id);
  }
  console.log(`  ${tag} ${w}x${h}: ${r.map(x => x.id).join(",")}`);
  ok(bad.length === 0, `${tag} ${w}x${h}: no HUD overlaps/offscreen ${bad.join(" ")}`);
  await shot(`${tag}_${w}x${h}`);
}
const SIZES = [[375, 548], [390, 664], [430, 740], [667, 375], [844, 390]];
const stage = async fn => { await fn(); await sleep(500); };
for (const [w, h] of SIZES) {
  await view(w, h);
  // zone + minimap hidden on touch?
  const gone = await ev(`JSON.stringify(["zone","mapWrap"].map(id => getComputedStyle(document.getElementById(id)).display))`);
  ok(JSON.parse(gone).every(d => d === "none"), `${w}x${h}: zone card and minimap hidden on touch ${gone}`);
  // 1 riding, plain
  await stage(() => ev(`FOOT.on = false; true`)); await check("ride", w, h);
  // 2 riding with a job active + toasts
  await stage(() => ev(`GS.cash = 5000; (typeof toast === "function") && (toast("Test toast one: a longish line that wraps maybe"), toast("Second toast")); true`)); await check("toast", w, h);
  // 3 MORE sheet open
  await stage(() => ev(`(document.getElementById("tcMenu")||{}).click && document.getElementById("tcMenu").dispatchEvent(new PointerEvent("pointerdown", {bubbles:true})); true`));
  await check("more", w, h);
  await ev(`(document.getElementById("tcMenu")).dispatchEvent(new PointerEvent("pointerdown", {bubbles:true})); true`).catch(() => {});
  // 4 on foot
  await stage(() => ev(`FOOT.on = true; true`)); await check("foot", w, h);
  // 5 bleeding with bandage button
  await stage(() => ev(`FOOT.on = false; const s = TLX.state("wounds"); s.wounds = [{ age: 0.5 }]; s.bandages = 3; s.cd = 999; true`)); await check("bleed", w, h);
  await ev(`TLX.state("wounds").wounds = []; GS.health = 100; true`);
  // 6 tutorial card (re-open)
  await ev(`(typeof TUT !== "undefined") && (TUT.stage = 1); true`); await sleep(800); await check("tut", w, h);
  await ev(`tutSkip(); true`); await sleep(400);
}
// vitals low: critical bars flashing don't move layout; long values
await view(390, 664);
await ev(`GS.hunger = 3; GS.thirst = 2; true`); await sleep(600); await check("lowvit", 390, 664);
// speedo big number
await ev(`P.vx = 0; P.vz = 40; true`); await sleep(400);
const sp = JSON.parse(await ev(`JSON.stringify(document.getElementById("speedo").getBoundingClientRect())`));
console.log("  speedo rect", JSON.stringify(sp));
ok(sp.right <= 391 && sp.left >= 0, "speedo stays on screen at speed");
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
