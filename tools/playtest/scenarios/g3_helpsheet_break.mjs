// Beta break of v303 help sheet/Menu: small embed (640x360) with pad, Menu with tablet open, Menu in crash, mouse back to kbm.
import { boot, ev, sleep, park, padSet, padOff, tap, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot({ width: 640, height: 360 });
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GOD.warm = true; GS.storm = 0; WX.at = () => 0; $("help").hidden = false; true`);
await park(); await sleep(400);
const st = () => J(`(() => { const h = $("help"), r = h.getBoundingClientRect(); const vis = !h.hidden && getComputedStyle(h).display !== "none";
  const hit = ["mapWrap","job","speedo","vit","toasts","wnHud","flip"].filter(id => { const e = $(id); if (!e || e.hidden || getComputedStyle(e).display === "none") return false; const q = e.getBoundingClientRect(); return q.width > 0 && q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top; });
  return { vis, box: [r.left|0, r.top|0, r.right|0, r.bottom|0], hit, dev: INP.dev, set: !$("settings").hidden, tab: !!(TABLET && TABLET.open), flip: $("flip").textContent }; })()`);
await padSet({ 7: 0.15 }); await sleep(500);
{ const S = await st(); console.log(JSON.stringify(S));
  ok(S.dev === "pad", "pad in hand at 640x360 (" + S.dev + ")");
  ok(!S.vis || (S.box[2] <= 640 && S.box[3] <= 360 && S.hit.length === 0), "small embed: sheet hidden or on screen and clear of HUD " + S.box + " over:" + S.hit); }
await padSet(); await sleep(200);
// Menu (btn 9) with tablet open
await ev(`TABLET.toggle(true, "weather"); true`); await sleep(500);
for (let i = 0; i < 3; i++) { await padSet({ 9: 1 }); await sleep(200); await padSet(); await sleep(250);
  const S = await st(); console.log("menu w/ tablet", i, JSON.stringify({ set: S.set, tab: S.tab })); }
await padSet({ 1: 1 }); await sleep(200); await padSet(); await sleep(300);
const afterB = await st(); ok(!afterB.set, "B closes Settings after menu-with-tablet");
await ev(`TABLET.toggle(false); true`); await sleep(300);
// Menu mid-crash
await ev(`crashEject("test", 0, 1, 15, null); true`); await sleep(500);
await padSet({ 9: 1 }); await sleep(250); await padSet(); await sleep(300);
const c1 = await st(); console.log("crash menu", JSON.stringify(c1));
await padSet({ 1: 1 }); await sleep(200); await padSet(); await sleep(300);
const c2 = await st(); ok(!c2.set, "Settings can be closed with B after menu during crash");
await ev(`crashCancel(); true`);
// mouse back
await ev(`window.dispatchEvent(new MouseEvent("mousemove",{clientX:100,clientY:100,movementX:5,movementY:5})); true`); await sleep(300);
const m = await st(); console.log("after mousemove dev", m.dev);
await tap("KeyG"); await sleep(300);
const k = await st(); ok(k.dev === "kbm", "key press returns to kbm (" + k.dev + ")");
await padOff();
console.log(fails ? "FAILS " + fails : "all ok"); await done(fails ? 1 : 0);
