// Beta break pass for P1 (post chain): odd states a player reaches. Pixel stats are read in one rAF after a frame.
import { boot, ev, shot, sleep, done, tap, park, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev("tutSkip(); FOOT.on = false; VEH.cur = null; true"); await sleep(800);
await ev(`window.__st = () => new Promise(res => requestAnimationFrame(() => { const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, b = new Uint8Array(w*h*4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,b); let s=0,s2=0,n=0,nan=0,clip=0; for (let i=0;i<b.length;i+=16){ const l=b[i]*.2126+b[i+1]*.7152+b[i+2]*.0722; s+=l; s2+=l*l; n++; if (b[i]>250&&b[i+1]>250&&b[i+2]>250) clip++; } const m=s/n; res({w,h,luma:m,std:Math.sqrt(s2/n-m*m),clip:clip/n}); })); true`);
const S = async () => { await ev("window.__r = null; window.__st().then(r => window.__r = r); true"); await sleep(400); return J("window.__r"); };
// A: heavy storm at night
await ev("GS.hour = 34; GS.storm = 1; updSky(); true"); await sleep(1200);
const a = await S(); console.log("storm night", JSON.stringify(a)); await shot("a_storm_night");
ok(a.luma > 3 && a.luma < 200, "storm night frame not black/blown (luma " + a.luma.toFixed(1) + ")");
ok(a.clip < 0.5, "storm night not mostly clipped white (" + (a.clip * 100).toFixed(1) + " %)");
// B: noon clear, sun low-angle at dawn
for (const h of [30, 36, 40, 46]) { await ev(`GS.storm = 0; GS.hour = ${h}; updSky(); true`); await sleep(900); const r = await S(); console.log("hour", h, JSON.stringify(r)); ok(r.std > 3 && r.clip < 0.6, `hour ${h} has contrast, not clipped`); await shot("b_h" + h); }
// C: rapid preset cycling while riding
await ev("GS.hour = 40; true"); await ev("document.getElementById('gfxBtn').click(); true");
let bad = 0; for (let i = 0; i < 12; i++) { await ev("document.getElementById('gfxBtn').click(); true"); await sleep(250); const r = await J("({tp:[TLXPOST.on&&1, GFX.low, GFX.ultra], db:[renderer.getContext().drawingBufferWidth, renderer.getContext().drawingBufferHeight]})"); if (!r.db[0] || r.db[0] < 100) bad++; }
ok(bad === 0, "12 preset flips: buffer never empty"); const c = await S(); ok(c.std > 3, "after flips frame has contrast (" + c.std.toFixed(1) + ")");
// D: resize to phone-size and tiny
for (const [w, h] of [[390, 844], [640, 360], [2560, 1440]]) { await ev(`window.__rz = 1; true`); const { send } = await import("../lib.mjs"); await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false }); await sleep(900); const r = await S(); console.log("viewport", w, h, JSON.stringify(r)); ok(r.w > 0 && r.std > 2, `viewport ${w}x${h} renders (std ${r.std.toFixed(1)})`); }
// E: crash and on-foot, tablet
const { send } = await import("../lib.mjs"); await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false }); await sleep(600);
await ev("FOOT.on = true; true"); await sleep(600); await ev("TABLET.toggle(true, 'map'); true"); await sleep(600); const e = await S(); ok(e.std > 2, "tablet open on foot renders"); await shot("e_tablet"); await ev("TABLET.toggle(false); true");
await ev("FOOT.on = false; GS.hour = 34; true"); await sleep(500);
const dl = await J("(()=>{let n=0;scene.traverse(o=>{ if(o.isPointLight||o.isSpotLight) n++}); return n})()"); console.log("scene lights", dl);
const lastErr = errors.filter(x => !/favicon/.test(String(x))); ok(lastErr.length === 0, "no page errors " + JSON.stringify(lastErr.slice(0, 3)));
await done(fails ? 1 : 0);
