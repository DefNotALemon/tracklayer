// Weather app radar: a front over the map, the loop at NOW / +3 h / +6 h, and SHOW NOW.
import { boot, ev, shot, sleep, done } from "../lib.mjs";
await boot();
console.log(await ev(`(() => { GS.hour = 34; CAL.tick && CAL.tick(); const T = CAL.abs(GS.hour), D = Math.floor(T / 24);
  WX.dayFronts(D).push({ t0: T - 0.6, dx: 0.94, dz: 0.34, v: 2400, L: 5000, s: 0.85, from: "W", polar: false });
  WX.dayFronts(D).push({ t0: T + 2.5, dx: 0.2, dz: 0.98, v: 2000, L: 4000, s: 0.65, from: "N", polar: true });
  WX.fc = null; TABLET.toggle(true, "weather"); return JSON.stringify({ hour: GS.hour, here: WX.at(P.x, P.z) }); })()`));
await sleep(2500);
for (const [nm, t] of [["now", 0.2], ["p3", 1.2 + 3.5], ["p6", 1.2 + 7 + 0.5]]) {
  await ev(`(WXR.play = true, WXR.t = ${t}, WXR.dt = 1, wxRadarTick(0), 1)`); await sleep(150);
  await ev(`(WXR.t = ${t}, WXR.dt = 1, wxRadarTick(0), 1)`);
  console.log(nm, await ev(`wxRadarOffset().toFixed(2)`)); await shot("wx_" + nm);
}
await ev(`($("wxLoop").click(), 1)`); await sleep(400);
console.log("play after click", await ev("WXR.play"), await ev(`$("wxLoop").textContent`)); await shot("wx_live");
const r = await ev(`(() => { const c = WXR.cv, d = c.toDataURL("image/png"); return d; })()`);
(await import("node:fs")).writeFileSync(process.env.OUT + "/radar_live.png", Buffer.from(r.split(",")[1], "base64"));
for (const [nm, t] of [["c_now", 0.2], ["c_p3", 4.7], ["c_p6", 8.7]]) { await ev(`(WXR.play = true, WXR.t = ${t}, WXR.dt = 1, wxRadarTick(0), 1)`); const d = await ev(`WXR.cv.toDataURL("image/png")`); (await import("node:fs")).writeFileSync(process.env.OUT + "/" + nm + ".png", Buffer.from(d.split(",")[1], "base64")); }
console.log(await ev(`JSON.stringify({ here: WX.at(P.x, P.z), cw: WXR.cv.width, ch: WXR.cv.height })`));
await done();
