// Beta fix 0106 (phone HUD): every riding context pill forced visible at once (a crash in a storm, out of fuel by the
// garage: CALL HELP, GET OFF, REEL, BANDAGE, WIPE VISOR, GARAGE) must not overlap each other, the stick/pedals/chips,
// TABLET / MORE, the speedo, the vitals or the compass, at 7 phone sizes portrait and landscape. Also a REAL game-state
// check: an open wound + an iced visor show BANDAGE and WIPE VISOR side by side, both tappable (elementFromPoint).
// Exit 1 on a failure. Run: tools/playtest/run.sh tools/playtest/scenarios/x4_pills.mjs [outdir]
import { boot, ev, send, sleep, shot, reload, park, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot({ width: 390, height: 664 });
await send("Emulation.setUserAgentOverride", { userAgent: UA, platform: "iPhone" });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
const view = async (w, h) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: true }); await ev(`dispatchEvent(new Event("resize")); true`); await sleep(500); };
await view(390, 664); await reload();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GOD.warm = true; true`); await sleep(500);
await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(500);
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 200, y: 300 }] });
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(500);

const IDS = ["tcQ", "tcWipe", "tcF", "tcBand", "tcE", "tcReel", "tcStick", "tcGas", "tcBrk", "tcHop", "tcLean", "tcHorn", "tcWh", "tcTablet", "tcMenu", "speedo", "vit", "compass"];
const PILLS = new Set(["tcQ", "tcWipe", "tcF", "tcBand", "tcE", "tcReel"]);
const overlap = (a, b) => a.x < b.x + b.w - 2 && b.x < a.x + a.w - 2 && a.y < b.y + b.h - 2 && b.y < a.y + a.h - 2;
const rects = () => J(`${JSON.stringify(IDS)}.map(id => { const e = document.getElementById(id); if (!e) return null; const cs = getComputedStyle(e); const b = e.getBoundingClientRect(); return cs.display !== "none" && cs.visibility !== "hidden" && b.width > 2 && b.height > 2 ? { id, x: b.x, y: b.y, w: b.width, h: b.height } : null; }).filter(Boolean)`);
// pairs that were never about pills and are judged elsewhere (x4_mobilehud*)
const skip = new Set(["tcStick|tcGas", "tcStick|tcBrk"]);
async function check(tag, w, h, need) {
  const r = await rects(), bad = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i]; if (a.x < -1 || a.y < -1 || a.x + a.w > w + 1 || a.y + a.h > h + 1) bad.push("OFF " + a.id);
    for (let j = i + 1; j < r.length; j++) {
      const b = r[j]; if (!PILLS.has(a.id) && !PILLS.has(b.id)) continue;
      if (!skip.has(a.id + "|" + b.id) && overlap(a, b)) bad.push(a.id + "x" + b.id);
    }
  }
  if (bad.length) console.log("  rects", r.map(o => `${o.id}:${o.x | 0},${o.y | 0},${o.w | 0}x${o.h | 0}`).join(" "));
  const shown = r.map(x => x.id), miss = need.filter(id => !shown.includes(id));
  ok(bad.length === 0 && miss.length === 0, `${tag} ${w}x${h}: ${bad.join(" ") || "clean"}${miss.length ? " missing " + miss.join(",") : ""}`);
  await shot(`${tag}_${w}x${h}`);
}
const SIZES = [[320, 568], [360, 640], [390, 844], [430, 932], [568, 320], [667, 375], [844, 390]];

// (a) real game state: wound + iced visor while riding, away from the depot/garage (they heal you)
await park(); await sleep(800);
await ev(`(() => { GOD.warm = false; if (TLX.wounds && !TLX.wounds.open()) TLX.wounds.hit(); (function hold() { VZ.target = 0.6; VZ.level = Math.max(VZ.level, 0.5); requestAnimationFrame(hold); })(); return 1; })()`); await sleep(600);
const st = await J(`({ band: !document.getElementById("tcBand").hidden, wipe: !document.getElementById("tcWipe").hidden, wound: !!(TLX.wounds && TLX.wounds.open()) })`);
console.log("  game state", JSON.stringify(st));
if (st.band && st.wipe) {
  for (const [w, h] of SIZES) {
    await view(w, h); await ev(`VZ.target = 0.6; VZ.level = 0.5; true`); await sleep(300);
    const t = await J(`["tcBand","tcWipe"].map(id => { const e = document.getElementById(id), b = e.getBoundingClientRect(); const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return id + ":" + (hit && (hit === e || e.contains(hit)) ? "tap" : "covered by " + (hit && hit.id)); })`);
    ok(t.every(s => s.endsWith(":tap")), `real wound+visor ${w}x${h}: ${t.join(" ")}`);
  }
} else ok(false, "real wound+visor: could not raise both pills from game state " + JSON.stringify(st));

// (b) every pill forced visible
await ev(`(() => { const s = document.createElement("style"); s.textContent = "#tcQ,#tcWipe,#tcF,#tcBand,#tcE,#tcReel{display:flex !important;visibility:visible !important}"; document.head.appendChild(s); return 1; })()`);
for (const [w, h] of SIZES) { await view(w, h); await check("allpills", w, h, [...PILLS]); }
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
