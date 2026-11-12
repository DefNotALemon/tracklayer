// Beta repro for 2.1b: reeling the winch against a BOULDER anchor (no o.tree) throws in updWobble every frame; does the screen stop drawing? Counts renderer.render calls. Exit 1 if frames stop.
import { boot, ev, tap, down, up, sleep, done, park, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
await boot(); await ev(`tutSkip(); true`); await sleep(500);
await ev(`crashCancel(); FOOT.on = false; GS.own.parts.winch = "elec"; restat(); window.__rc = 0; const _r = renderer.render.bind(renderer); renderer.render = (...a) => { window.__rc++; return _r(...a); }; true`);
await park(); await sleep(1200);
const pick = kind => ev(`(() => { for (const arr of obGrid.values()) for (const o of arr) { if (o.log || o.down || o.top === -Infinity) continue; if (${kind === "tree"} !== (o.tree !== undefined)) continue; if (isSea(o.x, o.z) || isWater(o.x, o.z) || Math.hypot(o.x, o.z) < 300) continue; if (anchorsNear(o.x, o.z, 5).length !== 1) continue; return JSON.stringify({ x: o.x, z: o.z }); } return "null"; })()`).then(JSON.parse);
const frames = async ms => { const a = await ev("window.__rc"); await sleep(ms); return (await ev("window.__rc")) - a; };
for (const kind of ["tree", "boulder"]) {
  const a = await pick(kind); if (!a) { console.log("no", kind); continue; }
  await ev(`WN.state = "out"; WN.snapT = 0; GS.fuel = 20; const a = ${JSON.stringify(a)}; P.x = a.x + 7; P.z = a.z; P.yaw = -Math.PI / 2; P.vx = P.vz = 0; FOOT.on = true; FOOT.x = a.x + 1.2; FOOT.z = a.z; enterBog(1.0); true`);
  await sleep(600); await tap("KeyE"); await sleep(400);
  console.log(kind, "hooked", await ev("WN.state + ' ' + (WN.anchor && WN.anchor.tree)"));
  const idle = await frames(1500);
  await down("Space"); await sleep(300);
  const f = await frames(2500);
  await shot("reel_" + kind);
  await up("Space"); await sleep(500);
  console.log(kind, "frames idle/1.5s", idle, " frames while reeling/2.5s", f, " wobbling", await ev("wobbling.length"));
  ok(f > 20, kind + " anchor: the game keeps drawing while reeling (" + f + " renders in 2.5 s)");
  await ev(`WN.state = "out"; WN.anchor = null; freeBog("test"); true`); await sleep(500);
  console.log(kind, "frames after release/1.5s", await frames(1500), "wobbling", await ev("wobbling.length"));
}
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
