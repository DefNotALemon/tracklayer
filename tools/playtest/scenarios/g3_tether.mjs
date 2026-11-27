// Owner note 13 Nov #1: the tether (kill cord) rope must never be seen or attached once you are off the sled on
// your own feet. A crash still throws you on the rope (that is what it is for); a plain get-off never shows it.
// A per-frame recorder counts the frames the rope mesh is drawn in each phase. Exit 1 on a failure.
import { boot, ev, tap, down, up, sleep, done, park, shot, sideCam, camOff, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;

await boot();
await ev(`tutSkip(); true`); await sleep(500);
await ev(`(() => { crashCancel(); FOOT.on = false; GS.warmth = 100; GS.storm = 0; WX.at = () => 0; $("help").hidden = true;
  window.__rp = { ph: "", n: {} };
  const f = () => { requestAnimationFrame(f); const R = window.__rp; if (!R.ph) return; window.__tl("(" + (() => {
    const R = window.__rp, o = R.n[R.ph] || (R.n[R.ph] = { fr: 0, vis: 0, clip: 0, footVis: 0, crashVis: 0 });
    const v = !!(ROPE.mesh && ROPE.mesh.visible);
    o.fr++; if (v) o.vis++; if (ROPE.clip) o.clip++; if (v && FOOT.on && !CRASH.on) o.footVis++; if (v && CRASH.on) o.crashVis++;
  }).toString() + ")()"); };
  requestAnimationFrame(f); return true; })()`);
const phase = p => ev(`window.__rp.ph = ${JSON.stringify(p)}; true`);
const got = async p => (await J(`window.__rp.n`))[p] || { fr: 0, vis: 0, clip: 0, footVis: 0, crashVis: 0 };
const S = () => J(`{ foot: FOOT.on, crash: CRASH.on, st: CRASH.st, mnt: MNT.on, dmt: DMT.on, clip: ROPE.clip, vis: !!(ROPE.mesh && ROPE.mesh.visible), tether: tetherOn(), d: +Math.hypot(FOOT.x - P.x, FOOT.z - P.z).toFixed(2), veh: !!VEH.cur }`);
const until = async (fn, secs = 30) => { let s; for (let i = 0; i < secs * 5; i++) { s = await S(); if (fn(s)) return s; await sleep(200); } return s; };
const keep = `GS.warmth = 100; true`;
const reset = async () => { await ev(`(() => { crashCancel(); FOOT.on = false; MNT.on = false; DMT.on = false; CRASH.cool = 0; ROPE.clip = false; GS.warmth = 100; return true; })()`); await park(); for (let i = 0; i < 40; i++) { await sleep(200); if (await J(`!!P.gnd && Math.hypot(P.vx, P.vz) < 0.5`)) break; } await sleep(200); };
const getOff = async () => { await tap("KeyQ"); await sleep(300); return until(s => s.foot && !s.dmt, 20); };
const getOn = async () => { await tap("KeyQ"); return until(s => !s.foot && !s.mnt, 25); };
const walk = async (code, ms) => { await down(code); await sleep(ms); await up(code); await sleep(200); };
// a real crash: the sled moving, the rider thrown by the game's own crashEject
const crash = async (v = 9) => { await ev(`(() => { CRASH.cool = 0; P.vx = Math.sin(P.yaw) * ${v}; P.vz = Math.cos(P.yaw) * ${v}; return crashEject("test", P.vx, 1, P.vz, null); })()`); return until(s => !s.crash && s.foot, 40); };

// ---- 1 a plain get-off, never crashed: no rope in any frame
await reset(); let s = await S(); console.log("start", JSON.stringify(s));
ok(s.tether && !s.foot, "riding, the tether fitted (the default)");
await phase("1 plain off"); s = await getOff(); await walk("KeyW", 2500); await sleep(500);
let n = await got("1 plain off"); console.log("1", JSON.stringify(n), JSON.stringify(await S()));
ok(s.foot, "1: Q gets you off");
ok(n.fr > 20 && n.vis === 0 && n.clip === 0, `1: a plain get-off never draws or clips the rope (${n.vis} of ${n.fr} frames)`);

// ---- 2 a crash on the rope: the rope is drawn while you are thrown (it is what stops you)
await reset(); await phase("2 crash"); s = await crash(9); await phase("");
n = await got("2 crash"); console.log("2", JSON.stringify(n), JSON.stringify(s));
ok(s.foot && !s.crash, "2: thrown, then back on your feet");
ok(n.crashVis > 5, `2: the rope shows while you are thrown (${n.crashVis} frames)`);
ok(s.d < 3.2, `2: the rope held you beside the sled (${s.d} m)`);
if (!NOSTILLS) { await sideCam(undefined, 3.4, 1.6); await sleep(300); await shot("tether_up"); await camOff(); }

// ---- 3 on your feet after it: standing by the sled, the rope is off your belt
await phase("3 up, standing"); await sleep(2500); await ev(keep); await phase("");
n = await got("3 up, standing"); s = await S(); console.log("3", JSON.stringify(n), JSON.stringify(s));
ok(n.fr > 20 && n.footVis === 0, `3: on your feet after the crash the rope is not drawn (${n.footVis} of ${n.fr} frames)`);
ok(!s.clip, "3: and not clipped to you");

// ---- 4 get back on and off again the plain way: no rope
s = await getOn(); ok(!s.foot, "4: Q gets you back on after the crash");
await phase("4 on, then off"); await sleep(600); s = await getOff(); await walk("KeyS", 1500); await walk("KeyW", 1500); await phase("");
n = await got("4 on, then off"); console.log("4", JSON.stringify(n), JSON.stringify(await S()));
ok(s.foot && n.vis === 0 && n.clip === 0, `4: back on, then off: no rope (${n.vis} of ${n.fr} frames)`);

// ---- 5 crash, get up, walk off and come back: no rope, no line about it
await reset(); await crash(12);
await ev(`window.__ts = []; if (!window.__tsI) window.__tsI = setInterval(() => { for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!window.__ts.includes(m)) window.__ts.push(m); }, 80); true`);
await phase("5 walk off"); await walk("KeyS", 4000); const far = await S(); await walk("KeyW", 4000); await sleep(400); await phase("");
n = await got("5 walk off"); s = await S(); const ts = await J(`window.__ts`); console.log("5", JSON.stringify(n), JSON.stringify(far), JSON.stringify(s));
ok(n.footVis === 0 && !s.clip, `5: walking off and back after a crash: no rope (${n.footVis} of ${n.fr} frames)`);
ok(!ts.some(m => /unclip/i.test(m)), `5: nothing says you unclip it (it is already off): ${JSON.stringify(ts.filter(m => /tether|unclip/i.test(m))).slice(0, 200)}`);

// ---- 6 the sled brought to you while on foot after a crash (reset): no rope when you next get off
await reset(); await crash(9); await tap("KeyN"); await sleep(800); s = await S();
if (s.foot) s = await getOn();
await phase("6 after reset"); await sleep(500); await getOff(); await sleep(1500); await phase("");
n = await got("6 after reset"); console.log("6", JSON.stringify(n), JSON.stringify(await S()));
ok(n.vis === 0 && n.clip === 0, `6: after a reset and a get-off: no rope (${n.vis} of ${n.fr} frames)`);

// ---- 7 no tether fitted: a crash never draws one either
await reset(); await ev(`GS.own.parts.tether = "none"; restat(); true`);
await phase("7 untied"); await crash(9); await sleep(800); await phase("");
n = await got("7 untied"); console.log("7", JSON.stringify(n));
ok(n.fr > 10 && n.vis === 0, `7: untied, a crash draws no rope (${n.vis} of ${n.fr} frames)`);

// ---- 8 the line after a tethered crash names the get-on control of the device in your hands
await reset(); await ev(`GS.own.parts.tether = "rope"; restat(); window.__ts = []; true`);
const PS = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";
await padSet({ 5: 1 }, [0, 0, 0, 0], PS); await sleep(350); await padSet({}, [0, 0, 0, 0], PS); await sleep(350);
await crash(9); await sleep(400); await padOff();
const t8 = (await J(`window.__ts`)).filter(m => /tether caught/.test(m)); console.log("8", JSON.stringify(t8).slice(0, 300), await ev(`INP.dev + "/" + INP.pad`));
ok(t8.length > 0 && /Press L1 to get back on/.test(t8[0]) && !/Press Q/.test(t8[0]), `8: on a DualSense the line says Press L1, not Q`);

console.log(fails ? `FAILED ${fails}` : "all tether checks passed");
await done(fails ? 1 : 0);
