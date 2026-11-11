// Beta break test #3 for the v183 phone HUD fix (GET OFF vs GARAGE at 320 wide): worst case, every context pill at once.
// Un-hides the riding pills (GET OFF, WIPE VISOR, CALL HELP, BANDAGE, GARAGE, REEL) together, and the on-foot buttons
// (USE, GET ON, SIZE UP, GARAGE, CALL HELP, BANDAGE), at common phone sizes in portrait and landscape. Reports overlaps
// among touch controls and with the stick/pedals. Exit 1 on a failure.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x4_mobilehud3.mjs [outdir]
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
const RIDE = ["tcQ", "tcWipe", "tcF", "tcBand", "tcE", "tcReel", "tcStick", "tcGas", "tcBrk", "tcHop", "tcLean", "tcHorn", "tcWh", "tcTablet", "tcMenu", "speedo", "vit", "cpStrip"];
const FOOTS = ["tcUse", "tcOn", "tcX", "tcE", "tcF", "tcBand", "tcStick", "tcTablet", "tcMenu", "speedo", "vit", "cpStrip"];
const overlap = (a, b) => a.x < b.x + b.w - 2 && b.x < a.x + a.w - 2 && a.y < b.y + b.h - 2 && b.y < a.y + a.h - 2;
async function check(tag, ids, w, h) {
  await ev(`${JSON.stringify(ids)}.forEach(id => { const e = document.getElementById(id); if (e && e.hidden) e.hidden = false; }); true`);
  await sleep(300);
  const r = await J(`${JSON.stringify(ids)}.map(id => { const e = document.getElementById(id); if (!e) return null; const cs = getComputedStyle(e); const b = e.getBoundingClientRect(); return cs.display !== "none" && b.width > 2 && b.height > 2 ? { id, x: b.x, y: b.y, w: b.width, h: b.height } : null; }).filter(Boolean)`);
  const bad = [];
  const skip = new Set(["tcStick|tcGas", "tcStick|tcBrk"]);
  for (let i = 0; i < r.length; i++) {
    const a = r[i]; if (a.x < -1 || a.y < -1 || a.x + a.w > w + 1 || a.y + a.h > h + 1) bad.push("OFF " + a.id);
    for (let j = i + 1; j < r.length; j++) if (!skip.has(a.id + "|" + r[j].id) && overlap(a, r[j])) bad.push(a.id + "x" + r[j].id);
  }
  ok(bad.length === 0, `${tag} ${w}x${h} (${r.length} shown): ${bad.join(" ") || "clean"}`);
  await shot(`${tag}_${w}x${h}`);
}
const sizes = [[320, 568], [360, 640], [375, 667], [390, 844], [568, 320], [667, 375], [844, 390], [740, 360]];
for (const [w, h] of sizes) { await view(w, h); await check("ridepills", RIDE, w, h); }
await ev(`FOOT.on = true; true`); await sleep(600);
for (const [w, h] of sizes) { await view(w, h); await check("footpills", FOOTS, w, h); }
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
