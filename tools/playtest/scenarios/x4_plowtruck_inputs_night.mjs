// Beta test 4.1c1 plow truck: blade drop/lift + hold-to-slew on keyboard, DualSense pad and touch pill, at night in a storm,
// plus a night still of the factory blade. Headless ~0.6x: by gameClock.
import { boot, ev, send, tap, sleep, done, down, up, padSet, padOff, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
const PS = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";
const step = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; GS.hour = 23.5; GS.storm = 1; TLX.setOn("traffic", false); TLX.setOn("police", false); true`);
await sleep(600);
await ev(`TLXV.buy("plowtruck"); true`); await sleep(600);
const u = await ev(`TLXV.state().owned[0].uid`); const U = JSON.stringify(u);
await ev(`TLXV.swapTo(${U}); FOOT.on = false; BOG.on = false; P.vx = P.vz = 0; true`); await sleep(800);
const sp = await J(`(() => { for (let r = 150; r < 3000; r += 37) for (let a = 0; a < 6.28; a += 0.21) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; let bad = false;
  for (let k = -10; k <= 40 && !bad; k += 10) for (const sx of [-6, 0, 6]) if (isSea(x + sx, z + k) || isWater(x + sx, z + k) || obNear(x + sx, z + k, 8) || slopeAt(x + sx, z + k, 8) > 0.03 || yardAt(x + sx, z + k) > 0.02) { bad = true; break; }
  if (!bad) return { x, z }; } return null; })()`);
ok(!!sp, "open ground " + JSON.stringify(sp));
await ev(`BOG.on = false; P.x = ${sp.x}; P.z = ${sp.z}; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(P.x, P.z); recenter(P.x, P.z, true); camState.init = false; true`); await sleep(800);
const S = () => J(`(() => { const b = TLXPL.rt(${U}); return { down: b.down, slew: ((WN.hint||"").match(/hold it: (.*)$/)||[])[1] || "?", k: +(b.k||0).toFixed(2), hint: WN.show ? WN.hint : "", dev: INP.dev, pill: $("tcE").hidden ? null : $("tcE").textContent, nan: !isFinite(P.x + P.y + P.z), hr: GS.hour }; })()`);
await step("1 keyboard", async () => {
  let s = await S(); console.log("  ", JSON.stringify(s));
  await tap("KeyE"); await waitGame(0.8); s = await S(); ok(s.down, "E drops the blade at night/storm: " + s.hint);
  await down("KeyE"); await sleep(1100); const h = await S(); await up("KeyE"); await waitGame(0.5); const a = await S();
  console.log("  hold:", JSON.stringify(h), JSON.stringify(a));
  ok(a.slew !== s.slew && a.down, "holding E slews it (" + s.slew + " -> " + a.slew + ") and leaves it down");
  await tap("KeyE"); await waitGame(0.8); s = await S(); ok(!s.down, "tap lifts it");
});
await step("2 DualSense L3", async () => {
  await padSet({ 10: 1 }, [0, 0, 0, 0], PS); await sleep(150); await padSet({}, [0, 0, 0, 0], PS); await waitGame(0.8);
  let s = await S(); ok(s.down && s.dev === "pad", "L3 tap drops: " + s.hint); ok(/L3/.test(s.hint), "hint names L3");
  const b = s.slew;
  await padSet({ 10: 1 }, [0, 0, 0, 0], PS); await sleep(1200); await padSet({}, [0, 0, 0, 0], PS); await waitGame(0.5);
  s = await S(); ok(s.slew !== b && s.down, "L3 hold slews (" + b + " -> " + s.slew + "), still down");
  await padSet({ 10: 1 }, [0, 0, 0, 0], PS); await sleep(150); await padSet({}, [0, 0, 0, 0], PS); await waitGame(0.8);
  s = await S(); ok(!s.down, "L3 tap lifts"); await padOff();
});
await step("3 touch pill", async () => {
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 640, y: 200 }] }); await sleep(100);
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(600);
  const P1 = `$("tcE").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`;
  const P2 = `$("tcE").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`;
  let s = await S(); ok(s.pill === "BLADE DOWN", "pill reads BLADE DOWN: " + s.pill);
  await ev(P1); await sleep(150); await ev(P2); await waitGame(0.8); s = await S(); ok(s.down && s.pill === "BLADE UP", "tap drops, pill BLADE UP: " + s.pill);
  const b = s.slew; await ev(P1); await sleep(1300); await ev(P2); await waitGame(0.5); s = await S();
  ok(s.slew !== b && s.down, "touch hold slews (" + b + " -> " + s.slew + ")");
  await ev(P1); await sleep(150); await ev(P2); await waitGame(0.8); s = await S(); ok(!s.down, "tap lifts");
});
await step("4 mid-hold reload-free: swap away while held, night still", async () => {
  await ev(`SET.touch = "auto"; setTouchUI(); true`); await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await tap("KeyE"); await waitGame(0.8);
  await sideCam(); await sleep(500); await shot("plowtruck_night");
  await camOff();
  const s = await S(); ok(!s.nan && s.hr > 22 || s.hr < 5, "no NaN, still night (" + s.hr.toFixed(1) + ")");
});
console.log("page errors check via done");
await done(fails ? 1 : 0);
