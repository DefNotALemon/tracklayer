// Beta break test v304: HOOK label at the line-length edge (fairlead distance len-0.6 / len-0.2) and a dig started behind the tablet. Exit 1 on a failure.
import { boot, ev, tap, sleep, done, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const S = async () => JSON.parse(await ev(`JSON.stringify({ foot: FOOT.on, use: footUse(), wn: WN.state, bog: BOG.on, dig: !!FOOT.dig, len: (winchDef() || {}).len || 0, fl: (() => { const f = fairlead(); return [f[0], f[2]]; })() })`));
await boot();
await ev(`tutSkip(); true`); await sleep(500);
await ev(`crashCancel(); FOOT.on = false; GS.own.parts.winch = "elec"; restat(); true`);
await park(); await sleep(1200);
const found = JSON.parse(await ev(`(() => { for (const arr of obGrid.values()) for (const o of arr) { if (o.tree === undefined || o.log || o.down || o.top === -Infinity) continue; if (isSea(o.x, o.z) || isWater(o.x, o.z) || Math.hypot(o.x, o.z) < 300) continue; if (anchorsNear(o.x, o.z, 5).length !== 1) continue; return JSON.stringify({ x: o.x, z: o.z }); } return "null"; })()`));
ok(!!found, "found a tree anchor");
if (found) {
  await ev(`P.x = ${found.x} + 8; P.z = ${found.z}; P.vx = 0; P.vz = 0; true`); await sleep(1500);
  await tap("KeyQ"); for (let i = 0; i < 30 && !(await S()).foot; i++) await sleep(300);
  for (let i = 0; i < 30 && await ev(`!!DMT.on`); i++) await sleep(300); await sleep(500);
  await ev(`BOG.on = true; BOG.dig = 0; WN.state = "out"; WN.snapT = 0; true`);
  const len = (await S()).wd || (await S()).len;
  // sweep: put the sled so the fairlead sits d metres from the tree, report the label and what E does
  for (const d of [len + 1.25, len + 1.65, len + 2.05, len + 2.45]   /* fairlead sits ~1.85 m nearer the tree than P */) {
    await ev(`(() => { const a = ${JSON.stringify(found)}; P.x = a.x + ${d}; P.z = a.z; P.yaw = -Math.PI / 2; FOOT.x = a.x + 1.2; FOOT.z = a.z; WN.state = "out"; WN.snapT = 0; true; })()`); await sleep(500);
    let s = await S(); const fd = Math.hypot(s.fl[0] - found.x, s.fl[1] - found.z);
    await tap("KeyE"); await sleep(400); const s2 = await S();
    console.log(`d=${d.toFixed(2)} fairlead dist ${fd.toFixed(2)} len ${len}: label ${s.use}, after E wn=${s2.wn}`);
    ok((s.use === "HOOK") === (s2.wn === "hooked"), `label ${s.use} agrees with what E did (${s2.wn}) at fairlead ${fd.toFixed(2)} m`);
    await ev(`WN.state = "out"; true`);
  }
  // dig behind the tablet
  await ev(`(() => { const a = ${JSON.stringify(found)}; P.x = FOOT.x + 1.5; P.z = FOOT.z; WN.state = "stowed"; BOG.on = true; FOOT.dig = false; true; })()`); await sleep(400);
  const pre = await S(); console.log("dig pre", JSON.stringify(pre));
  await ev(`TABLET.toggle(true, "map"); true`); await sleep(500);
  await tap("KeyE"); await sleep(400);
  const post = await S(); ok(!post.dig, "tablet open: E does not start digging (dig=" + post.dig + ")");
  await ev(`TABLET.toggle(false); true`); await sleep(500);
  await tap("KeyE"); await sleep(400);
  console.log("dig after tablet away", JSON.stringify(await S()));
}
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
