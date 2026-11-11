// Beta break test #4 (phone HUD v183): (a) the on-foot hint text after a REAL touch event (must say "tap GET ON", not "Q:"),
// (b) every riding/foot context pill forced visible with CSS (the game re-hides [hidden] each frame, so x4_mobilehud3 only
// saw 12/7 controls) and checked for overlaps at common phone sizes. Exit 1 on a failure.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x4_mobilehud4.mjs [outdir]
import { boot, ev, send, sleep, shot, reload, done } from "../lib.mjs";
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
// (a) real touch, then on-foot hint
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 200, y: 300 }] });
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(300);
await ev(`FOOT.on = true; true`); await sleep(1200);
const hint = await J(`({ dev: INP.dev, hint: (document.getElementById("wnHint") || {}).textContent, tut: (document.getElementById("tut") || {}).textContent })`);
console.log("  hint", JSON.stringify(hint));
ok(!/\bQ\b|\bE\b|key/i.test(hint.hint || "") && hint.dev === "touch", `touch hint has no key name: "${hint.hint}" (dev ${hint.dev})`);
await ev(`FOOT.on = false; true`); await sleep(500);
// (b) force pills visible
await ev(`(() => { const s = document.createElement("style"); s.textContent = "#tcQ,#tcWipe,#tcF,#tcBand,#tcE,#tcReel,#tcUse,#tcOn,#tcX,#tcWing{display:flex !important;visibility:visible !important}"; document.head.appendChild(s); return 1; })()`);
const IDS = ["tcQ", "tcWipe", "tcF", "tcBand", "tcE", "tcReel", "tcStick", "tcGas", "tcBrk", "tcHop", "tcLean", "tcHorn", "tcWh", "tcTablet", "tcMenu", "speedo"];
const overlap = (a, b) => a.x < b.x + b.w - 2 && b.x < a.x + a.w - 2 && a.y < b.y + b.h - 2 && b.y < a.y + a.h - 2;
async function check(tag, w, h) {
  const r = await J(`${JSON.stringify(IDS)}.map(id => { const e = document.getElementById(id); if (!e) return null; const cs = getComputedStyle(e); const b = e.getBoundingClientRect(); return cs.display !== "none" && b.width > 2 && b.height > 2 ? { id, x: b.x, y: b.y, w: b.width, h: b.height } : null; }).filter(Boolean)`);
  const bad = [], skip = new Set(["tcStick|tcGas", "tcStick|tcBrk"]);
  for (let i = 0; i < r.length; i++) {
    const a = r[i]; if (a.x < -1 || a.y < -1 || a.x + a.w > w + 1 || a.y + a.h > h + 1) bad.push("OFF " + a.id);
    for (let j = i + 1; j < r.length; j++) if (!skip.has(a.id + "|" + r[j].id) && overlap(a, r[j])) bad.push(a.id + "x" + r[j].id);
  }
  console.log(`  ${tag} ${w}x${h} shown: ${r.map(x => x.id).join(",")}`);
  ok(bad.length === 0, `${tag} ${w}x${h}: ${bad.join(" ") || "clean"}`);
  await shot(`${tag}_${w}x${h}`);
}
for (const [w, h] of [[320, 568], [360, 640], [390, 844], [667, 375], [844, 390]]) { await view(w, h); await check("allpills", w, h); }
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
