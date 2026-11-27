// Beta probe of v300 hint box (#wnHud): any visible fixed/absolute element overlapping it, in states the builder's
// x4_mobilehint does not use: keyboard 640x360 and 960x540, touch phone with a real bogged sled, tablet open, job panel up.
import { boot, ev, send, sleep, shot, reload, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
await boot({ width: 640, height: 360 });
await ev(`tutSkip(); crashCancel(); true`); await sleep(500);
const view = async (w, h, touch) => {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: touch });
  await ev(`dispatchEvent(new Event("resize")); true`); await sleep(500);
};
const over = () => J(`(() => { const h = $("wnHud"); if (h.hidden) return { hidden: true, txt: "" };
  const b = h.getBoundingClientRect(); const out = [];
  for (const e of document.body.querySelectorAll("*")) { if (e === h || h.contains(e) || e.contains(h)) continue;
    let vis = true; for (let p = e; p; p = p.parentElement) { const cs = getComputedStyle(p); if (p.hidden || cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.05) { vis = false; break; } }
    if (!vis) continue; const cs = getComputedStyle(e); if (!/fixed|absolute/.test(cs.position) && !e.closest("#touch, .hud")) continue;
    const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || e.id === "gl" || e.tagName === "CANVAS" && e.id === "gl") continue;
    if (r.right > b.left + 2 && b.right > r.left + 2 && r.bottom > b.top + 2 && b.bottom > r.top + 2 && r.width < innerWidth * 0.9) out.push((e.id || e.className || e.tagName) + ""); }
  return { txt: $("wnHint").textContent, box: [b.x | 0, b.y | 0, b.width | 0, b.height | 0], over: [...new Set(out)] }; })()`);
let fails = 0;
const probe = async (tag, setup) => {
  await ev(setup); await sleep(900);
  const r = await over(); const bad = r.over && r.over.length;
  if (bad) fails++;
  console.log((bad ? "FAIL " : "ok   ") + tag + " " + JSON.stringify(r));
  if (!process.env.NOSTILLS) await shot(tag.replace(/\W+/g, "_"));
};
const foot = `FOOT.on = true; FOOT.x = P.x + 1.6; FOOT.z = P.z; FOOT.y = surf(FOOT.x, FOOT.z); P.vx = P.vz = 0; CRASH.cool = 1; GS.warmth = 100; true`;
const ride = `FOOT.on = false; P.vx = P.vz = 0; CRASH.cool = 1; GS.warmth = 100; true`;
for (const [w, h] of [[640, 360], [960, 540]]) {
  await view(w, h, false);
  await probe(`kb ${w}x${h} foot beside sled`, foot);
  await probe(`kb ${w}x${h} ride`, ride);
  await probe(`kb ${w}x${h} foot + tablet`, foot + `; TABLET.toggle(true, "map"); true`);
  await ev(`TABLET.toggle(false); true`);
}
await send("Emulation.setUserAgentOverride", { userAgent: UA, platform: "iPhone" });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await view(390, 664, true); await reload();
await ev(`tutSkip(); crashCancel(); SET.touch = "on"; setTouchUI(); INP.dev = "touch"; setInterval(() => { INP.dev = "touch"; }, 50); true`); await sleep(600);
for (const [w, h] of [[390, 664], [667, 375], [320, 568]]) {
  await view(w, h, true);
  await probe(`touch ${w}x${h} foot`, foot);
  await probe(`touch ${w}x${h} foot + tablet`, foot + `; TABLET.toggle(true, "map"); true`);
  await ev(`TABLET.toggle(false); true`);
  await probe(`touch ${w}x${h} foot + jobs app`, foot + `; TABLET.toggle(true, "jobs"); true`);
  await ev(`TABLET.toggle(false); true`);
  await probe(`touch ${w}x${h} bogged`, ride + `; typeof enterBog === "function" && enterBog(); true`);
  await ev(`typeof leaveBog === "function" && leaveBog(); true`);
}
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
