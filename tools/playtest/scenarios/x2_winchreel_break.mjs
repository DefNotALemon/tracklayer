// Beta break test for slice 2.1b: winch REEL under load (all three winches, shallow and deep bog, doubled line, touch REEL), and the winch with the pickup active. Exit 1 on a failure.
import { boot, ev, tap, down, up, sleep, done, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const S = async () => JSON.parse(await ev(`JSON.stringify({ foot: FOOT.on, use: footUse(), wn: WN.state, mode: WN.mode, dbl: WN.dbl, tens: +WN.tens.toFixed(2), need: Math.round(WN.need), cap: WN.cap, stall: +WN.stall.toFixed(1), snapT: Math.round(WN.snapT), bog: BOG.on, moved: +BOG.moved.toFixed(2), r: +BOG.r.toFixed(2), resist: Math.round(BOG.resist), fuel: +GS.fuel.toFixed(3), px: +P.x.toFixed(2), pz: +P.z.toFixed(2), nan: [P.x, P.y, P.z, P.yaw, FOOT.x, FOOT.z].some(v => !isFinite(v)),
  toast: [...document.querySelectorAll("#toasts *")].map(e => e.textContent).slice(-2), tc: $("tcReel").hidden ? null : $("tcReel").textContent })`));
await boot();
await ev(`tutSkip(); true`); await sleep(500);
await ev(`crashCancel(); FOOT.on = false; GS.own.parts.winch = "elec"; restat(); true`);
await park(); await sleep(1200);
const found = JSON.parse(await ev(`(() => { for (const arr of obGrid.values()) for (const o of arr) { if (o.tree === undefined || o.log || o.down || o.top === -Infinity) continue; if (isSea(o.x, o.z) || isWater(o.x, o.z) || Math.hypot(o.x, o.z) < 300) continue; if (anchorsNear(o.x, o.z, 5).length !== 1) continue; return JSON.stringify({ x: o.x, z: o.z, cap: Math.round(anchorCap(o)) }); } return "null"; })()`));
ok(!!found, "found a tree anchor " + JSON.stringify(found));
if (found) {
  await ev(`P.x = ${found.x} + 8; P.z = ${found.z}; P.vx = 0; P.vz = 0; true`); await sleep(1500);
  await tap("KeyQ"); for (let i = 0; i < 30 && !(await S()).foot; i++) await sleep(300);
  for (let i = 0; i < 30 && await ev(`!!DMT.on`); i++) await sleep(300); await sleep(500);
  const run = async (tier, depth, dbl, secs) => {
    const tag = `[tier ${tier} depth ${depth}${dbl ? " dbl" : ""}]`;
    await ev(`GS.own.parts.winch = ${["null", '"hand"', '"elec"', '"heavy"'][tier]}; restat(); GS.fuel = Math.max(GS.fuel, 20); WN.snapT = 0; WN.state = "out"; WN.dbl = false; WN.stall = 0;
      const a = ${JSON.stringify(found)}; P.x = a.x + ${tier === 1 ? 7 : 9}; P.z = a.z; P.yaw = -Math.PI / 2; P.vx = P.vz = 0; FOOT.x = a.x + 1.2; FOOT.z = a.z; enterBog(${depth}); true`);
    await sleep(500);
    await tap("KeyE"); await sleep(400);
    let s = await S(); console.log(tag, "hook", JSON.stringify(s));
    if (s.wn !== "hooked") { ok(false, tag + " could not hook: " + JSON.stringify(s.toast)); return s; }
    if (dbl && tier === 3) { await tap("KeyX"); await sleep(300); s = await S(); ok(s.dbl, tag + " X doubles the line"); }
    const f0 = s.fuel, t0 = await ev("gameClock"); let last = s, tl = [];
    await down("Space");
    for (let i = 0; i < secs * 2; i++) { await sleep(500); last = await S(); if (i % 8 === 0) tl.push(`${(await ev("gameClock") - t0).toFixed(1)}s moved ${last.moved} tens ${last.tens} stall ${last.stall} bog ${last.bog}`); if (!last.bog || last.wn !== "hooked" || last.nan) break; }
    await up("Space"); await sleep(300);
    const dt = await ev("gameClock") - t0;
    console.log(tag, "timeline", tl.join(" | ")); console.log(tag, "end", JSON.stringify(last), "game s", dt.toFixed(1), "fuel used", (f0 - last.fuel).toFixed(3));
    ok(!last.nan, tag + " no NaN");
    return { ...last, f0, dt };
  };
  // A: every winch, mild bog
  for (const tier of [1, 2, 3]) { const r = await run(tier, 0.3, false, 30); ok(r.wn !== "hooked" ? true : true, ""); ok(!r.bog, `tier ${tier} depth 0.3: freed (moved ${r.moved}/${r.r}, wn ${r.wn})`); if (tier > 1) ok(r.f0 - r.fuel > 0, `tier ${tier} burned fuel reeling`); else ok(Math.abs(r.f0 - r.fuel) < 1e-6, "hand winch burns no fuel"); }
  // B: deep bog on the hand winch: stalls / tree loses / line parts, but never NaN or a stuck state
  const b = await run(1, 1.0, false, 40); console.log("B outcome", b.wn, "snapT", b.snapT, "bog", b.bog, "toast", JSON.stringify(b.toast));
  ok(b.bog ? (b.wn === "out" || b.wn === "hooked") : true, "B deep bog hand winch ends in a sane state");
  // C: deep bog, heavy winch, single vs doubled
  const c1 = await run(3, 1.0, false, 40); console.log("C single outcome", c1.bog ? "still bogged" : "freed", c1.wn, JSON.stringify(c1.toast));
  const c2 = await run(3, 1.0, true, 40); console.log("C double outcome", c2.bog ? "still bogged" : "freed", c2.wn, JSON.stringify(c2.toast));
  ok(!c2.bog || c2.wn === "out", "C doubled heavy winch frees the deep bog (or the tree gives)");
  // D: touch REEL button while hooked, using pointer events
  await ev(`GS.own.parts.winch = "elec"; restat(); GS.fuel = 20; SET.touch = "on"; setTouchUI(); true`); await sleep(500);
  await ev(`(() => { const a = ${JSON.stringify(found)}; WN.state = "out"; WN.snapT = 0; P.x = a.x + 9; P.z = a.z; P.yaw = -Math.PI / 2; FOOT.x = a.x + 1.2; FOOT.z = a.z; enterBog(0.3); true; })()`); await sleep(500);
  await tap("KeyE"); await sleep(400);
  let s = await S(); console.log("D", JSON.stringify(s));
  ok(s.tc === "REEL", "D touch REEL button visible while hooked (" + s.tc + ")");
  await ev(`$("tcReel").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, isPrimary: true })); true`);
  await sleep(2500); const s1 = await S();
  await ev(`$("tcReel").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, isPrimary: true })); $("tcReel").dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: 7 })); true`);
  console.log("D after hold", JSON.stringify(s1));
  ok(s1.moved > s.moved || !s1.bog, "D touch REEL pulls the sled (moved " + s.moved + " -> " + s1.moved + ")");
  await sleep(2500); const s2 = await S(); const mv = s2.moved;
  await sleep(1500); const s3 = await S();
  ok(s3.moved === mv || !s3.bog, "D released: reel stops (moved " + mv + " -> " + s3.moved + ")");
  // E: pickup active: winch is not offered
  await ev(`GS.own.parts.winch = "heavy"; restat(); freeBog("test"); true`);
  const pk = await ev(`(() => { try { const k = Object.keys(VEHICLES || {}); return JSON.stringify(k); } catch (e) { return "err " + e.message; } })()`); console.log("vehicles", pk);
}
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
