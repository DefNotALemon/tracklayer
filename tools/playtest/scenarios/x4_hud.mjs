// Minimalist HUD + survival stats + wounds/bandages (loop/LOOP.md Owner note 11 Nov 2026). Asserts, exit 1 on a failure.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x4_hud.mjs [outdir]     (NOSTILLS=1 skips the stills)
//  1 HUD layout: four vitals bars stacked warmth < hunger < fuel < thirst bottom-left, speed number bottom-right with a rev arc,
//    compass strip top-middle, old #job panel and gauges not shown
//  2 bars fade after VB_IDLE s without change and come back on a change; rev arc follows the throttle
//  3 compass: letters slide as the camera yaw turns; the tracked target's title shows under the triangle only when pointed at it, then fades
//  4 hunger/thirst drain over game time away from the quay and refill at the quay; old save (no x) starts full; state saves and reloads
//  5 wounds: forced hit -> bar appears, health bleeds; bandage by key, pad and touch stops ONE wound inside the window; too late = no effect;
//    cap; quay clears; health 0 -> the game's blackout path; the option switches the random hazard off; hazard fires only far from sites
import { boot, reload, ev, raw, tap, hold, sleep, shot, padSet, send, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const STILLS = !process.env.NOSTILLS;
const still = async n => { if (STILLS) await shot(n); };
const cs = id => raw(`(() => { const e = document.getElementById(${JSON.stringify(id)}); const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return JSON.stringify({ x: r.x, y: r.y, w: r.width, h: r.height, op: +c.opacity, disp: c.display, vis: c.visibility, cls: e.className }); })()`).then(JSON.parse);

await boot();
await ev(`tutSkip(); FOOT.on = false; GOD.warm = true; GOD.fuel = false; true`);
await sleep(1500);

// 1 layout
const W = 1280, H = 720;
const bars = {}; for (const k of ["Warm", "Hunger", "Fuel", "Thirst"]) bars[k] = await cs("vb" + k);
console.log("1 bars", JSON.stringify(Object.fromEntries(Object.entries(bars).map(([k, v]) => [k, Math.round(v.y)]))));
ok(bars.Warm.y > bars.Hunger.y && bars.Hunger.y > bars.Fuel.y && bars.Fuel.y > bars.Thirst.y, "bars stack bottom to top: warmth, hunger, fuel, thirst");
ok(bars.Warm.x < 40 && bars.Warm.y > H - 60 && bars.Warm.h <= 8 && bars.Warm.w > 60, "bars are thin and bottom-left");
const sp = await cs("speedo"), cp = await cs("compass"), job = await cs("job"), rev = await cs("rev");
ok(sp.x > W / 2 && sp.y > H / 2 && sp.disp !== "none", `speed number sits bottom-right (${Math.round(sp.x)},${Math.round(sp.y)})`);
ok(rev.x < sp.x + 4 && rev.y < sp.y, "rev arc starts up and left of the number");
ok(Math.abs(cp.x + cp.w / 2 - W / 2) < 3 && cp.y < 40 && cp.disp !== "none", "compass strip is top-middle");
ok(job.disp === "none", "the old #job panel is not shown");
const gaugeShown = await raw(`[...document.querySelectorAll("#speedo .gauge, #speedo #drag, #speedo #state")].some(e => getComputedStyle(e).display !== "none")`);
ok(!gaugeShown, "the old fuel/warmth/temp gauges and drag/state rows are hidden");
const mapR = await raw(`(() => { const m = document.getElementById("mapWrap"), r = m.getBoundingClientRect(), s = document.getElementById("speedo").getBoundingClientRect(); return JSON.stringify({ mx: r.x, sr: s.right, mw: r.width }); })()`).then(JSON.parse);
ok(mapR.sr <= mapR.mx + 1, `speed doesn't overlap the minimap (speed right ${Math.round(mapR.sr)} <= map left ${Math.round(mapR.mx)})`);
await still("01_hud_idle");

// 2 fading + rev arc
await ev(`GS.warmth = 80; GS.hunger = 90; GS.thirst = 90; GS.fuel = GS.cap * 0.8; true`);
await sleep(600);
await ev(`GOD.warm = false; true`);
await sleep(7000);   // idle: no change except the slow drain, under the 2-point step
let o = {}; for (const k of ["Warm", "Hunger", "Fuel", "Thirst"]) o[k] = (await cs("vb" + k)).op;
console.log("2 idle opacities", JSON.stringify(o));
ok(Object.values(o).every(v => v < 0.25), "every bar fades to near-invisible after a few idle seconds");
await ev(`GS.thirst -= 12; true`); await sleep(400);
o = {}; for (const k of ["Warm", "Hunger", "Fuel", "Thirst"]) o[k] = (await cs("vb" + k)).op;
console.log("2 after thirst change", JSON.stringify(o));
ok(o.Thirst > 0.6 && o.Hunger < 0.25, "only the bar that changed fades back in");
await ev(`GS.warmth = 15; true`); await sleep(500);
ok((await cs("vbWarm")).op > 0.6, "a low bar (<25%) stays lit");
await ev(`GS.warmth = 80; GOD.warm = true; true`);
const arc0 = await raw(`document.getElementById("revArc").getAttribute("stroke-dasharray")`);
await hold("KeyW", 3000);
const arc1 = await raw(`document.getElementById("revArc").getAttribute("stroke-dasharray")`);
console.log("2 rev arc idle/throttle", arc0, arc1);
ok(parseFloat(arc1) > parseFloat(arc0) + 5, "rev arc grows with the throttle");
await ev(`input.thr = 1; true`);
await still("02_hud_riding"); await ev(`input.thr = 0; true`);

// 3 compass
const place = (x, z, yaw) => ev(`(() => { P.x = ${x}; P.z = ${z}; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = ${yaw}; recenter(P.x, P.z, true); camState.init = false; camState.yaw = ${yaw}; towSnap(); return true; })()`);
const dep = await J(`({ x: depot.x, z: depot.z })`);
await ev(`GS.load = []; GS.claims = []; GS.groomJob = null; GS.tour = null; JOBT.sel = null; true`);
// 200 m south of the quay (north is -z), pointing at it: the target is straight ahead
const ang = Math.atan2(0, dep.z - (dep.z + 200));  // dx = 0, dz = -200
await place(dep.x, dep.z + 200, ang);
await sleep(1500);
const nPos = async () => raw(`(() => { const b = [...document.querySelectorAll("#cpStrip b.c")].find(e => e.textContent === "N"); return b ? parseFloat(b.style.left) : null; })()`);
const l0 = await cp0();
async function cp0() { return await raw(`JSON.stringify({ head: TLX.hud.cp.head, offs: TLX.hud.cp.offs, lbl: document.getElementById("cpLbl").className, t: document.getElementById("cpT").textContent })`).then(JSON.parse).catch(() => null); }
const a = await J(`({ head: TLX.hud.cp.head, offs: TLX.hud.cp.offs, on: document.getElementById("cpLbl").classList.contains("on"), t: document.getElementById("cpT").textContent, s: document.getElementById("cpS").textContent })`);
console.log("3 pointed at depot", JSON.stringify(a));
ok(Math.abs(a.offs) < 5, "target under the triangle when you face it (offset " + a.offs.toFixed(1) + "°)");
ok(a.on && a.t.length > 2, `title fades in under the triangle: "${a.t}" / "${a.s}"`);
await still("03_compass_label");
await sleep(3600);
const b = await J(`({ on: document.getElementById("cpLbl").classList.contains("on") })`);
await sleep(700);
const bo = (await cs("cpLbl")).op;
ok(!b.on && bo < 0.2, "the title fades out again after a few seconds even while you keep facing it");
await place(dep.x, dep.z + 200, ang + Math.PI * 0.7);
await sleep(1500);
const c = await J(`({ head: TLX.hud.cp.head, offs: TLX.hud.cp.offs, on: document.getElementById("cpLbl").classList.contains("on") })`);
ok(Math.abs(c.offs) > 30 && !c.on, "facing away: no label (offset " + c.offs.toFixed(0) + "°)");
const nA = await nPos();
await place(dep.x, dep.z + 200, Math.PI - 0.25); await sleep(1200);
const nA2 = await nPos();
await place(dep.x, dep.z + 200, Math.PI + 0.25); await sleep(1200);
const nB = await nPos();
console.log("3 N letter x at heading +14° / -14°:", nA2, nB);
ok(nA2 !== null && nB !== null && Math.abs(nA2 - nB) > 20 && nA2 < nB, "compass letters slide as the camera yaw changes (N drifts left as you turn right of north)");
const dh = await J(`({ w: TLX.hud.cp.strip.clientWidth })`);
// heading = 180 - yaw: facing -z (north) is yaw PI -> heading 0
await place(dep.x, dep.z + 200, Math.PI); await sleep(1200);
const hN = await J(`TLX.hud.cp.head`);
ok(Math.abs(hN) < 3, "facing -z reads heading 0 (north)  [" + hN.toFixed(1) + "]");
await ev(`TLX.hud.compass(Math.PI, 0.5, "x", "y", "")`);   // synthetic: N is dead centre when heading 0
const nC = await nPos(); ok(Math.abs(nC - dh.w / 2) < 2, "N sits at the strip centre when heading north");

// 4 hunger / thirst
const far = await J(`(() => { for (let r = 900; r < 3000; r += 100) for (let a = 0; a < 6.28; a += 0.3) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; if (Math.abs(x) > HALF - 200 || Math.abs(z) > HALF - 200) continue; if (isSea(x, z) || isWater(x, z) || obNear(x, z, 30)) continue; if (SITES.some(s => Math.hypot(x - s.x, z - s.z) < 800)) continue; if (slopeAt(x, z, 8) > 0.08) continue; return { x, z }; } return null; })()`);
console.log("far spot", JSON.stringify(far));
ok(!!far, "found open backcountry 800 m from every site");
await place(far.x, far.z, 0);
await ev(`GOD.warm = true; GS.hunger = 100; GS.thirst = 100; GS.load = []; true`);
const t0 = await J(`({ t: gameClock, h: GS.hunger, w: GS.thirst })`);
await sleep(16000);
const t1 = await J(`({ t: gameClock, h: GS.hunger, w: GS.thirst })`);
const dtc = t1.t - t0.t, rh = (t0.h - t1.h) / dtc, rw = (t0.w - t1.w) / dtc;
console.log(`4 drain over ${dtc.toFixed(1)} s game: hunger ${rh.toFixed(4)}/s (want ${(100 / 5400).toFixed(4)}), thirst ${rw.toFixed(4)}/s (want ${(100 / 3600).toFixed(4)})`);
ok(Math.abs(rh - 100 / 5400) < 0.004 && Math.abs(rw - 100 / 3600) < 0.004 && rh > 0 && rw > rh, "hunger and thirst drain slowly with game time (thirst faster)");
await ev(`GS.hunger = 20; GS.thirst = 10; true`);
await place(dep.x, dep.z + 6, 0); await sleep(5000);
const t2 = await J(`({ h: GS.hunger, w: GS.thirst, near: GS.near === depot })`);
console.log("4 at the quay", JSON.stringify(t2));
ok(t2.near && t2.h > 40 && t2.w > 40, "hunger and thirst climb at the quay");
await sleep(14000);
const t3 = await J(`({ h: GS.hunger, w: GS.thirst })`);
ok(t3.h > 99 && t3.w > 99, "and fill up there (" + t3.h.toFixed(0) + "/" + t3.w.toFixed(0) + ")");
// old save and a round trip
await ev(`GS.hunger = 61; GS.thirst = 47; save(); true`);
const sv = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`));
ok(sv.x.sys.survival && Math.round(sv.x.sys.survival.s.hunger) === 61 && sv.x.sys.wounds, "survival + wounds state is in the save");
await reload(sv);
let r = await J(`({ h: Math.round(GS.hunger), w: Math.round(GS.thirst), hp: GS.health })`);
ok(r.h >= 61 && r.w >= 47, "hunger/thirst survive a reload (they only climb: the game restarts you at the quay) " + r.h + "/" + r.w);
const old = Object.assign({}, sv); delete old.x;
await reload(old);
r = await J(`({ h: GS.hunger, w: GS.thirst, hp: GS.health, b: TLX.state("wounds").bandages, n: TLX.state("wounds").wounds.length })`);
ok(r.h === 100 && r.w === 100 && r.hp === 100 && r.b === 3 && r.n === 0, "an old save (no x) starts full: hunger/thirst/health 100, 3 bandages");
await ev(`tutSkip(); FOOT.on = false; GOD.warm = true; true`);

// 5 wounds
const hidden0 = await cs("hpBar");
ok(hidden0.y >= H - 2 && !hidden0.cls.includes("on"), "health bar is off-screen with no wound");
await place(far.x, far.z, 0); await sleep(500);
ok(await ev(`TLX.wounds.exposed()`), "the far spot counts as exposed");
await ev(`TLX.wounds.hit(); true`); await sleep(1200);
let w = await J(`({ n: TLX.state("wounds").wounds.length, hp: GS.health })`);
const bar = await cs("hpBar");
ok(w.n === 1 && bar.cls.includes("on") && bar.y < H - 10, "a hit opens a wound and the health bar rises from the bottom");
await still("05_wound_bar");
await sleep(2000);
const w2 = await J(`({ hp: GS.health })`);
ok(w2.hp < w.hp - 0.5, `the wound bleeds health (${w.hp.toFixed(1)} -> ${w2.hp.toFixed(1)})`);
const rate = await (async () => { const a1 = await J(`({ t: gameClock, h: GS.health })`); await sleep(3000); const a2 = await J(`({ t: gameClock, h: GS.health })`); return (a1.h - a2.h) / (a2.t - a1.t); })();
ok(Math.abs(rate - 0.55) < 0.12, "one wound bleeds ~0.55 hp per game second (" + rate.toFixed(2) + ")");
// bandage by keyboard inside the window
await ev(`TLX.state("wounds").wounds[0].age = 0; true`);
await tap("KeyU"); await sleep(300);
w = await J(`({ n: TLX.state("wounds").wounds.length, b: TLX.state("wounds").bandages })`);
ok(w.n === 0 && w.b === 2, "the bandage key (U) removes the wound inside the window and uses one bandage");
await sleep(1200); ok(!(await cs("hpBar")).cls.includes("on"), "the health bar goes away once nothing is bleeding");
// too late
await ev(`TLX.wounds.hit(); TLX.state("wounds").wounds[0].age = TLX.wounds.consts.BANDAGE_WINDOW + 1; true`);
await tap("KeyU"); await sleep(300);
w = await J(`({ n: TLX.state("wounds").wounds.length, b: TLX.state("wounds").bandages })`);
ok(w.n === 1 && w.b === 2, "too slow: the bandage does nothing to a soaked-through wound (and isn't spent)");
// cap + pad + touch
await ev(`TLX.state("wounds").cd = 0; for (let i = 0; i < 6; i++) TLX.wounds.hit(); TLX.state("wounds").wounds.forEach(w => w.age = 0); true`);
w = await J(`({ n: TLX.state("wounds").wounds.length })`);
ok(w.n === 3, "open wounds are capped at 3");
await still("05_wounds_three");
await padSet({ 13: 1 }); await sleep(250); await padSet(); await sleep(300);
w = await J(`({ n: TLX.state("wounds").wounds.length, b: TLX.state("wounds").bandages, lbl: btn("bandage"), dev: INP.dev })`);
ok(w.n === 2 && w.b === 1, "D-pad down on a pad dresses one wound");
// touch
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(800);
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 5, y: 5 }] }); await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await ev(`TLX.state("wounds").wounds.forEach(w => w.age = 0); true`); await sleep(500);
const tb = await J(`({ hid: document.getElementById("tcBand").hidden, txt: document.getElementById("tcBand").textContent, name: btn("bandage"), dev: INP.dev })`);
console.log("5 touch", JSON.stringify(tb));
ok(!tb.hid && tb.txt === "BANDAGE", "the BANDAGE touch button shows while a wound is open");
await raw(`document.getElementById("tcBand").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" })); true`); await sleep(400);
w = await J(`({ n: TLX.state("wounds").wounds.length, b: TLX.state("wounds").bandages, name: btn("bandage") })`);
ok(w.n === 1 && w.b === 0, "tapping BANDAGE dresses one wound; prompt reads \"" + w.name + "\" under touch");
await ev(`INP.dev = "pad"; INP.pad = "ps"; true`); ok(await ev(`btn("bandage")`) === "D-pad down", "prompt reads D-pad down on a pad");
await ev(`INP.dev = "kbm"; true`); ok(await ev(`btn("bandage")`) === "U", "prompt reads U on keyboard");
await tap("KeyU"); await sleep(300);
w = await J(`({ n: TLX.state("wounds").wounds.length, b: TLX.state("wounds").bandages })`);
ok(w.n === 1 && w.b === 0, "no bandages left: nothing happens");
// the quay clears wounds and restocks
await place(dep.x, dep.z + 6, 0); await sleep(2500);
w = await J(`({ n: TLX.state("wounds").wounds.length, b: TLX.state("wounds").bandages })`);
ok(w.n === 0 && w.b === 3, "the quay patches you up and restocks 3 bandages");
// death: health 0 goes through blackout
await place(far.x, far.z, 0); await sleep(500);
await ev(`TLX.state("wounds").cd = 0; TLX.wounds.hit(); GS.health = 0.3; true`);
await sleep(1500);
w = await J(`({ dead: GS.dead, black: !document.getElementById("black").hidden, msg: document.getElementById("blackMsg").textContent.slice(0, 40) })`);
ok(w.dead && w.black, "health 0 -> the existing blackout/rescue path (" + w.msg + ")");
await sleep(5000);
w = await J(`({ dead: GS.dead, n: TLX.state("wounds").wounds.length, hp: GS.health, atQuay: Math.hypot(P.x - depot.x, P.z - depot.z) < 200 })`);
ok(!w.dead && w.n === 0 && w.hp > 0 && w.atQuay, "afterwards you're back at the quay with no open wounds");
// random hazard: only far from sites, and the option switches it off
await ev(`tutSkip(); GOD.warm = true; true`);
await place(far.x, far.z, 0);
await ev(`window.__rnd = Math.random; Math.random = () => 0; TLX.state("wounds").cd = 0; TLX.state("wounds").wounds = []; true`);
await sleep(1500);
w = await J(`({ n: TLX.state("wounds").wounds.length })`);
ok(w.n >= 1, "far from every site, the random hazard can fire");
await ev(`TLX.state("wounds").wounds = []; TLX.state("wounds").cd = 0; TLX.setOn("wounds", false); true`); await sleep(1500);
w = await J(`({ n: TLX.state("wounds").wounds.length })`);
ok(w.n === 0, "with the Options switch off the hazard never fires");
await ev(`TLX.setOn("wounds", true); TLX.state("wounds").cd = 0; true`);
await place(dep.x, dep.z + 120, 0); await sleep(1500);
w = await J(`({ n: TLX.state("wounds").wounds.length })`);
ok(w.n === 0, "near town it never fires");
await ev(`Math.random = window.__rnd; true`);
const opt = await J(`TLX.options.some(o => o.id === "wounds")`);
ok(opt, "Settings > Options lists the Poachers switch");
await done(fails ? 1 : 0);
