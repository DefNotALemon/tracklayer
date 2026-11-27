// Tracklayer: the hint line (#wnHud) on touch screens keeps clear of everything a thumb presses (LOOP.md backlog,
// builder v299 pass: at 320x568 the box lay over the stick, GET OFF, LEAN, HORN and GAS; on every phone, upright or on
// its side, it lay over at least one control). For each screen size, riding and on foot, with a two-line hint, a use
// pill and a toast up: the box is on screen, holds the whole text, and overlaps no visible touch control, HUD panel
// or toast. Tablets (768x1024, 1024x768) keep the old bottom-centre place and are checked the same way.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x4_mobilehint.mjs [outdir]     (NOSTILLS=1 skips the stills)
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
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(600);
// a stand-in hint and use pill through the same lists the expansion systems use (first in the list wins); the device is
// held on touch (a CDP key or a stray mouse event would flip it back and change the wording)
await ev(`(() => { window.__hint = ""; window.__use = "";
  rideX().unshift(() => window.__hint); rideUseA().unshift({ use: () => window.__use ? { label: window.__use, act() {} } : null });
  footX().unshift({ use: () => window.__use ? { label: window.__use, hint: () => window.__hint, act() {} } : null });
  setInterval(() => { INP.dev = "touch"; }, 50); return 1; })()`);
const SKIP = ["touch", "tcRide", "tcFoot", "tcSys", "wnHint", "wnGauge", "hud"];
const rects = () => J(`[...document.querySelectorAll("#touch *, .hud, #toasts .toast, #camChip, #tut")].map(e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); let vis = cs.visibility !== "hidden" && +cs.opacity > 0.05 && r.width > 2 && r.height > 2; for (let p = e; p && vis; p = p.parentElement) if (p.hidden || getComputedStyle(p).display === "none") vis = false; return vis && (e.id || e.classList.contains("toast")) ? { id: e.id || "toast", x: r.x, y: r.y, w: r.width, h: r.height } : null; }).filter(Boolean)`);
const HINTS = { long: "Stop beside Jonas, or tap GET OFF and walk up", short: "tap TALK" };
const SIZES = [[320, 568], [360, 640], [375, 667], [390, 664], [414, 896], [600, 960], [768, 1024], [568, 320], [667, 375], [844, 390], [1024, 768]];
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
for (const [w, h] of SIZES) {
  if (only && !only.test(`${w}x${h}`)) continue;
  await view(w, h);
  for (const mode of ["ride", "foot"]) for (const kind of ["long", "short"]) {
    await ev(`(() => { FOOT.on = ${mode === "foot"}; if (FOOT.on) { FOOT.x = P.x + 1.6; FOOT.z = P.z; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; } P.vx = P.vz = 0; CRASH.cool = 1; GS.warmth = 100;
      window.__hint = ${JSON.stringify(HINTS[kind])}; window.__use = "HELP UP"; if (${kind === "long"}) toast("A toast line that is here to take up room"); return 1; })()`);
    // poll: the box is up with this hint in it and the right control set is under the thumbs
    let r = [], hud = null, txt = "";
    for (let i = 0; i < 30; i++) {
      await sleep(150); txt = await ev(`$("wnHud").hidden ? "" : $("wnHint").textContent`);
      r = await rects(); hud = r.find(x => x.id === "wnHud");
      if (hud && txt.startsWith(HINTS[kind]) && r.some(x => x.id === (mode === "foot" ? "tcUse" : "tcGas")) && !r.some(x => x.id === (mode === "foot" ? "tcGas" : "tcUse"))) break;
    }
    const tag = `${w}x${h} ${mode} ${kind}`;
    ok(!!hud && txt.startsWith(HINTS[kind]), `${tag}: the hint box is up with the line in it ("${txt}")`);
    if (!hud) continue;
    ok(hud.x >= -1 && hud.y >= -1 && hud.x + hud.w <= w + 1 && hud.y + hud.h <= h + 1, `${tag}: the box is on screen (${Math.round(hud.x)},${Math.round(hud.y)} ${Math.round(hud.w)}x${Math.round(hud.h)})`);
    const over = r.filter(x => x.id !== "wnHud" && !SKIP.includes(x.id) && x.x < hud.x + hud.w - 2 && hud.x < x.x + x.w - 2 && x.y < hud.y + hud.h - 2 && hud.y < x.y + x.h - 2).map(x => x.id);
    ok(over.length === 0, `${tag}: the box overlaps nothing [${over.join(",")}]`);
    const fit = await J(`(() => { const e = $("wnHint"), b = $("wnHud"); return { sw: e.scrollWidth, cw: e.clientWidth, bh: b.getBoundingClientRect().height, fs: parseFloat(getComputedStyle(b).fontSize) }; })()`);
    ok(fit.sw <= fit.cw + 1 && fit.fs >= 12 && fit.bh <= 110, `${tag}: the whole line shows, readable (text ${fit.sw}/${fit.cw} px wide, ${fit.fs} px type, box ${Math.round(fit.bh)} px tall)`);
    ok(r.filter(x => /^tc(Stick|Gas|Brk|Q|Use|On|E)$/.test(x.id)).length >= (mode === "foot" ? 3 : 5), `${tag}: the controls it has to clear are up (${r.filter(x => /^tc[A-Z]/.test(x.id) && !SKIP.includes(x.id)).map(x => x.id).join(",")})`);
    if (!process.env.NOSTILLS && kind === "long") await shot(`hint_${w}x${h}_${mode}`);
  }
}
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
