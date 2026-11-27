// Beta break test for slice 2.1b: winch verbs HOOK/UNHOOK on foot at the range edges, and the tablet-open E check. Exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, padSet, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const S = async () => JSON.parse(await ev(`JSON.stringify({ foot: FOOT.on, use: footUse(), hint: $("wnHint").textContent, wn: WN.state, mode: WN.mode, bog: BOG.on, dig: !!FOOT.dig,
  tc: $("tcUse").hidden ? null : $("tcUse").textContent, wd: (winchDef() || {}).len || 0, toast: [...document.querySelectorAll("#toasts *")].map(e => e.textContent).slice(-2) })`));
const L3 = async () => { await padSet({ 10: 1 }, [0, 0, 0, 0]); await sleep(350); await padSet({}, [0, 0, 0, 0]); await sleep(400); };
await boot();
await ev(`tutSkip(); true`); await sleep(500);
await ev(`crashCancel(); FOOT.on = false; GS.own.parts.winch = "elec"; restat(); true`);
await park(); await sleep(1200);
// find a tree anchor near the parked sled and place the sled so the fairlead is beyond the line
const found = JSON.parse(await ev(`(() => { for (const arr of obGrid.values()) for (const o of arr) { if (o.tree === undefined || o.log || o.down || o.top === -Infinity) continue; if (isSea(o.x, o.z) || isWater(o.x, o.z) || Math.hypot(o.x, o.z) < 300) continue; if (anchorsNear(o.x, o.z, 5).length !== 1) continue; return JSON.stringify({ x: o.x, z: o.z }); } return "null"; })()`));
if (found) { await ev(`P.x = ${found.x} + 8; P.z = ${found.z}; P.vx = 0; P.vz = 0; true`); await sleep(1500); }
console.log("anchor", JSON.stringify(found));
ok(!!found, "found a tree anchor");
if (found) {
  const len = (await S()).wd; console.log("line", len);
  ok(len > 0, "electric winch fitted: winchDef len " + len);
  // sled stuck, dismounted
  await tap("KeyQ"); for (let i = 0; i < 30 && !(await S()).foot; i++) await sleep(300);
  for (let i = 0; i < 30 && await ev(`!!DMT.on`); i++) await sleep(300); await sleep(500);
  await ev(`BOG.on = true; BOG.dig = 0; WN.state = "out"; WN.snapT = 0; true`);
  // A: tree at the edge: walker 1 m from the tree, sled (fairlead) len+3 m away from the tree -> HOOK label but out of reach?
  await ev(`(() => { const a = ${JSON.stringify(found)}; const far = ${len} + 3; P.x = a.x + far; P.z = a.z; P.yaw = -Math.PI / 2; FOOT.x = a.x + 1.2; FOOT.z = a.z; true; })()`); await sleep(500);
  let s = await S(); console.log("A", JSON.stringify(s));
  ok(s.use === null, "A out of reach: no verb promised (" + s.use + ")");
  ok(!/strap the/.test(s.hint), "A out of reach: the hint does not offer the strap: \"" + s.hint + "\"");
  await ev(`window.__ts = []; window.__tsI = window.__tsI || setInterval(() => { for (const e of document.querySelectorAll("#toasts *")) if (!window.__ts.includes(e.textContent)) window.__ts.push(e.textContent); }, 60); true`);
  await tap("KeyE"); await sleep(500); s = await S(); const seenA = JSON.parse(await ev(`JSON.stringify(window.__ts)`));
  ok(s.wn !== "hooked", "A out of reach: E does not hook (wn=" + s.wn + ")");
  ok(seenA.some(t => /out of reach/.test(t)), "A out of reach: E says so " + JSON.stringify(seenA));
  // B: tree in reach: hooks, label flips to UNHOOK, E unhooks
  await ev(`(() => { const a = ${JSON.stringify(found)}; P.x = a.x + 6; P.z = a.z; FOOT.x = a.x + 1.2; FOOT.z = a.z; WN.state = "out"; true; })()`); await sleep(500);
  s = await S(); console.log("B", JSON.stringify(s));
  ok(s.use === "HOOK", "B in reach: label HOOK (" + s.use + ")");
  await tap("KeyE"); await sleep(400); s = await S(); console.log("B hooked", JSON.stringify(s));
  ok(s.wn === "hooked", "B E hooks");
  ok(s.use === "UNHOOK", "B hooked: label UNHOOK (" + s.use + ")");
  // C: walk 4 m away from the strap: UNHOOK must go null, E toasts walk up
  await ev(`FOOT.x += 4; true`); await sleep(400); s = await S(); ok(s.use === null, "C 4 m from strap: no verb (" + s.use + ")");
  await tap("KeyE"); await sleep(300); s = await S(); ok(s.wn === "hooked", "C E far from strap leaves it on"); console.log("C toast", JSON.stringify(s.toast));
  // D: pad L3 at the strap unhooks
  await ev(`FOOT.x -= 4; true`); await sleep(400);
  await L3(); s = await S(); ok(s.wn !== "hooked", "D pad L3 unhooks (wn=" + s.wn + ")");
  // E: hook, then tablet open: E / L3 should not act behind it
  await tap("KeyE"); await sleep(400); s = await S();
  await ev(`TABLET.toggle(true, "map"); true`); await sleep(500);
  const before = (await S()).wn; await tap("KeyE"); await sleep(300); s = await S();
  ok(s.wn === before, "E tablet open (winch hooked): E does nothing behind it (" + before + " -> " + s.wn + ")");
  ok(before === "hooked", "E set-up: hooked before the tablet came up (" + before + ")");
  ok(s.use === null, "E tablet open: no verb offered behind it (" + s.use + ")");
  await L3(); s = await S(); ok(s.wn === before, "E tablet open: pad L3 does nothing behind it (" + s.wn + ")");
  await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(300);
  await ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`); await sleep(300);
  s = await S(); ok(s.wn === before, "E tablet open: the touch button does nothing behind it (" + s.wn + ", button " + s.tc + ")");
  await ev(`SET.touch = "auto"; setTouchUI(); TABLET.toggle(false); true`); await sleep(500);
  s = await S(); ok(s.use === "UNHOOK", "E tablet away: the verb is back (" + s.use + ")");
  await tap("KeyE"); await sleep(400); s = await S(); ok(s.wn !== "hooked", "E tablet away: E unhooks (" + s.wn + ")");
  await tap("KeyE"); await sleep(400); s = await S(); ok(s.wn === "hooked", "E hooked again for the reload check (" + s.wn + ")");
  // F: reload while hooked: no stale hook
  await reload(); await sleep(1500); await ev(`tutSkip(); true`); await sleep(500); s = await S(); console.log("F", JSON.stringify(s));
  ok(s.wn !== "hooked", "F reload while hooked: not hooked after (" + s.wn + ")");
}
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
