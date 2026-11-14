// Beta (try to break) for 10.1 clothing layers (tlx-gear.js). Prints ok/FAIL per probe; exit 1 on any FAIL.
//  A corrupt saved gear state (null/string states: x10_layers_corrupt1.mjs, one boot each; many reloads in one run exhaust WebGL contexts)  B buy edges (exact cash, fractional cash, junk ids)  C keyboard-only + touch-click buy
//  D death/blackout while wet  E time skip while wet  F HUD feedback of wetness  G shop panel on a phone
import { boot, reload, ev, raw, send, tap, sleep, shot, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const G = () => J(`({ base: TLXG.state().base, mid: TLXG.state().mid, wet: TLXG.state().wet, own: TLXG.state().own, warm: ST.warm, k: TLXG.coldK(), cash: GS.cash })`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(500);

// A: corrupt saved state
const base = await J(`(() => { save(); return JSON.parse(localStorage.getItem("tracklayer.save.v2")); })()`);
for (const [name, g] of [
  ["wet NaN-string", { base: "merino", mid: "down", own: {}, wet: "abc" }],
  ["wet 5", { base: "merino", mid: "down", own: {}, wet: 5 }],
  ["unknown ids", { base: "silk", mid: "parka", own: null, wet: 0.2 }]
]) {
  const s = JSON.parse(JSON.stringify(base)); s.x = s.x || {}; s.x.sys = s.x.sys || {}; s.x.sys.gear = { v: 1, s: g };
  await reload(s); await sleep(600);
  const r = await J(`(() => { try { const s = TLXG.state(); return { ok: true, base: s && s.base, mid: s && s.mid, wet: s && s.wet, warm: ST.warm, k: TLXG.coldK(), nan: !isFinite(ST.warm) || !isFinite(TLXG.coldK()) }; } catch (e) { return { ok: false, err: String(e) }; } })()`);
  console.log("A", name, JSON.stringify(r));
  ok(r.ok && !r.nan, "A: " + name + " loads without NaN/throw");
}

// B: buy edges
await ev(`TLXG.state().own = {}; TLXG.state().base = "cotton"; TLXG.state().mid = "none"; restat(); true`);
await ev(`tutSkip(); crashCancel(); FOOT.on = false; true`);
let r = await J(`(() => { GS.cash = 85; const a = TLXG.buy("base", "merino"); const c1 = GS.cash; GS.cash = 84.5; const b = TLXG.buy("base", "wool"); const bad = [(() => { try { return TLXG.buy("hat", "x"); } catch (e) { return "throws"; } })(), (() => { try { return TLXG.buy("__proto__", "x"); } catch (e) { return "throws"; } })(), TLXG.buy("base", "nope"), TLXG.buy("mid", "__proto__")]; return { a, c1, b, bad, cash: GS.cash, own: Object.keys(TLXG.state().own) }; })()`);
console.log("B", JSON.stringify(r));
ok(r.a === true && r.c1 === 0, "B: exactly-enough cash buys, leaves 0");
ok(r.b === false && r.cash === 84.5, "B: wool refused with $84.5");
ok(r.bad.every(x => x === false), "B: junk slot/ids refused without throwing " + JSON.stringify(r.bad));

// D: death while wet
await ev(`(() => { const s = TLXG.state(); s.wet = 0.9; s.base = "cotton"; s.mid = "down"; restat(); return true; })()`);
const d = await J(`(() => { const out = {}; try { if (typeof blackout === "function") blackout("test"); out.fn = typeof blackout; } catch (e) { out.err = String(e); } return out; })()`);
await sleep(6000);
const d2 = await J(`({ wet: TLXG.state().wet, dead: !!GS.dead, near: GS.near && GS.near.name })`);
console.log("D", JSON.stringify(d), JSON.stringify(d2));
ok(!d.err, "D: blackout while wet doesn't throw");
console.log("INFO D: after blackout/respawn wet =", d2.wet, "near", d2.near);

// E: time skip
await ev(`(() => { GS.dead = false; const s = TLXG.state(); s.wet = 0.9; s.base = "cotton"; return true; })()`);
const h0 = await ev("GS.hour"); await ev(`GS.hour += 48; true`); await sleep(1500);
const e = await J(`({ wet: TLXG.state().wet })`);
console.log("INFO E: wet after +48 h skip outdoors", e.wet);

// F: any visible wetness cue besides the toast?
const f = await J(`(() => { const html = document.body.innerHTML; const tab = (window.TABLET && TABLET.apps || []).map(a => a.id); return { hudWet: /wet|damp|soaked/i.test(document.getElementById("hud") ? document.getElementById("hud").innerHTML : ""), tabs: tab }; })()`);
console.log("INFO F", JSON.stringify(f));

// G: shop on a phone
await ev(`(() => { FOOT.on = true; FOOT.x = FISHSITES.shop.x; FOOT.z = FISHSITES.shop.z; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = FOOT.fwd = 0; GS.cash = 1000; return true; })()`); await sleep(400);
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await ev(`FISH.ctx(); true`); await sleep(400);
await ev(`$("ifShopTabs").querySelector('[data-t="lay_mid"]').click(); true`); await sleep(300);
const g = await J(`(() => { const p = $("ifShop"), r = p.getBoundingClientRect(); const tabs = $("ifShopTabs"); return { sw: p.scrollWidth, cw: p.clientWidth, tabsSw: tabs.scrollWidth, tabsCw: tabs.clientWidth, w: r.width, vis: !p.hidden, btns: [...p.querySelectorAll("button[data-layer]")].map(b => { const q = b.getBoundingClientRect(); return [Math.round(q.width), Math.round(q.height)]; }) }; })()`);
console.log("G", JSON.stringify(g));
ok(g.sw <= g.cw + 1, "G: shop panel doesn't scroll sideways on 390 px");
ok(g.tabsSw <= g.tabsCw + 1, "G: five shop tabs fit/wrap on 390 px (tabs scrollW " + g.tabsSw + " vs " + g.tabsCw + ")");
ok(g.btns.every(b => b[1] >= 36), "G: buy buttons tall enough to tap " + JSON.stringify(g.btns));
await shot("x10b_phone_shop");
await done(fails ? 1 : 0);
