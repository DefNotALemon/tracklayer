// Getting on and off the sled: the swing (SWG). Deterministic (the game's rAF loop is stepped 1/60 s at a time).
// Asserts, for a mount from each side and the dismount after it, and a quick on/off on every sled:
//  - nothing teleports: the pelvis never moves faster than 3.2 m/s between frames, and the hand-over to the seated
//    rider (and from it) leaves the hips within 6 cm of where they were;
//  - planted boots stay planted: a boot pinned to the snow or a board drifts under 2.5 cm while it is pinned;
//  - the leg clears the seat: over the seat's footprint the swinging ankle is never under the cushion top + 8 cm;
//  - it ends: riding within 8 s of game time from 3 m away (the swing itself under 2.2 s), standing beside the
//    sled on the floor after getting off (under 2.2 s).
// Stills: OUT/<tag>/NN.jpg every 0.1 s of the swing from behind and from the front quarter (sheet.py them).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_swing.mjs [outdir]
import { boot, ev, raw, shot, done, sleep, park, OUT } from "../lib.mjs";
import fs from "node:fs";
await boot(); await ev("tutSkip(); GS.hour = 12; WX.at = () => 0; GS.storm = 0; true"); await park(); await sleep(1500);
await raw(`(() => { window.__rq = null; window.__origRAF = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = cb => { window.__rq = cb; return 1; }; return true; })()`);
await sleep(300);
await raw(`(() => { window.__T = window.__tl('last'); window.__adv = (n, ms) => new Promise(res => { let k = 0; const go = () => { window.__T += ms; const cb = window.__rq; window.__rq = null; if (cb) cb(window.__T); if (++k >= n) res(true); else window.__origRAF(go); }; window.__origRAF(go); }); return true; })()`);
await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; for (const el of document.body.children) if (el !== renderer.domElement && !el.contains(renderer.domElement)) el.style.visibility = 'hidden';
  window.__sp = () => { const g = FOOT.g, U = g.userData, S = SWG, K = S.K, v = new THREE.Vector3(); g.updateMatrixWorld(true); sledRoot.updateMatrixWorld(true);
    const A = [0, 1].map(i => { U.ank[i].getWorldPosition(v); const w = [v.x, v.y, v.z]; sledBody.worldToLocal(v); return { w, l: [v.x, v.y, v.z], pin: S.sim ? S.foot[i].pin : -1, fly: S.sim && S.foot[i].fly }; });
    const hip = K ? sledBody.localToWorld(v.set(0, K.qy, K.qz)).toArray() : null;
    return { t: gameClock, mnt: MNT.on, dmt: DMT.on, foot: FOOT.on, sim: S.sim, walk: S.walk, ph: S.ph, vis: g.visible, rider: V.rider.visible, pel: [g.position.x, g.position.y + 0.93, g.position.z], A, hip,
      top: K ? [0, 1].map(i => K.ud.seatTopAt(Math.max(K.ud.zBack, Math.min(0.05, A[i].l[2])))) : null, sw: K ? K.sw : 0, zB: K ? K.ud.zBack : 0, roll: S.roll, dip: S.dip, hands: S.hand.map(h => h.pin), fy: FOOT.y, fl: walkFloor(FOOT.x, FOOT.z), fd: Math.hypot(FOOT.x - P.x, FOOT.z - P.z), P: [P.x, P.y, P.z] }; };
  window.__place = (lx, lz, yawOff) => { crashCancel(); FOOT.on = true; FOOT.ski = false; FOOT.shoe = false; FOOT.dig = false; MNT.on = DMT.on = false; SWG.sim = SWG.walk = false;
    const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), sx = Math.cos(P.yaw), sz = -Math.sin(P.yaw); FOOT.x = P.x + sx * lx + fx * lz; FOOT.z = P.z + sz * lx + fz * lz; FOOT.y = walkFloor(FOOT.x, FOOT.z); FOOT.yaw = P.yaw + yawOff; FOOT.sp = FOOT.go = 0; FOOT.step = 0; P.vx = P.vz = 0; return true; };
  return true; })()`);
const adv = n => raw(`window.__adv(${n}, 1000 / 60)`);
const probe = async () => JSON.parse(await ev("JSON.stringify(window.__sp())"));
const fails = [], note = (ok, msg) => { console.log((ok ? "  ok   " : "  FAIL ") + msg); if (!ok) fails.push(msg); };
const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// run one move frame by frame; returns the frames from the call until it ends
async function run(startExpr, endKey, cap = 900) {
  await ev(startExpr + "; true"); const fr = [];
  for (let i = 0; i < cap; i++) { await adv(1); const p = await probe(); fr.push(p); if (!p[endKey]) break; }
  return fr;
}
function check(tag, fr, kind) {
  const sim = fr.filter(p => p.sim), last = fr[fr.length - 1];
  let vmax = 0, vAt = "", slide = 0, sAt = "", clear = 9; const ref = [null, null];
  for (let i = 1; i < fr.length; i++) { const a = fr[i - 1], b = fr[i]; if (!a.sim || !b.sim) continue; const v = d3(a.pel, b.pel) / Math.max(1e-3, b.t - a.t); if (v > vmax) { vmax = v; vAt = `${a.ph || "walk"}>${b.sim ? b.ph : "end"} #${i}`; } }
  for (const p of sim) for (let i = 0; i < 2; i++) {
    const a = p.A[i];
    if (a.pin > 0) {                                           // a planted boot: once it has settled (0.2 s), how far does it creep? (on the snow: along the ground)
      if (!ref[i] || ref[i].pin !== a.pin) ref[i] = { pin: a.pin, t: p.t, q: null };
      else if (p.t - ref[i].t > 0.2 && p.ph !== "drive") { /* not the push-off: that one rolls up onto its toe */ const q = a.pin === 2 ? a.l : [a.w[0], 0, a.w[2]]; if (!ref[i].q) ref[i].q = q; else { const d = d3(q, ref[i].q); if (d > slide) { slide = d; sAt = `${p.ph} foot ${i} pin ${a.pin}`; } } }
    } else { ref[i] = null; if (a.fly && Math.abs(a.l[0]) < p.sw && a.l[2] > p.zB && a.l[2] < 0.05) clear = Math.min(clear, a.l[1] - p.top[i]); }
  }
  const simT = sim.length ? sim[sim.length - 1].t - sim[0].t : 0, allT = last.t - fr[0].t;
  console.log(`${tag}: ${fr.length} frames, ${allT.toFixed(2)} s in all, swing ${simT.toFixed(2)} s, pelvis max ${vmax.toFixed(2)} m/s, planted drift ${(slide * 100).toFixed(1)} cm, seat clearance ${clear === 9 ? "n/a" : (clear * 100).toFixed(0) + " cm"}, phases ${[...new Set(sim.map(p => p.ph))].join(" > ")}`);
  if (vmax >= 3.2 && process.env.DBG) { const i = +vAt.split("#")[1]; for (let k = Math.max(0, i - 3); k <= Math.min(fr.length - 1, i + 2); k++) console.log("   ", k, fr[k].sim ? fr[k].ph : fr[k].walk ? "walk" : "-", fr[k].pel.map(v => v.toFixed(3)).join(" "), "fy", fr[k].fy.toFixed(3), "fl", fr[k].fl.toFixed(3), "ank", fr[k].A.map(a => a.w.map(v => v.toFixed(2)).join(",")).join(" | ")); }
  note(vmax < 3.2, `${tag}: pelvis never jumps (${vmax.toFixed(2)} m/s at ${vAt})`);
  note(slide < 0.025, `${tag}: planted boots hold (${(slide * 100).toFixed(1)} cm ${sAt})`);
  note(clear > 0.08, `${tag}: the leg clears the seat (${clear === 9 ? "never over it" : (clear * 100).toFixed(0) + " cm"})`);
  note(simT > 0.9 && simT < 2.2, `${tag}: the swing takes ${simT.toFixed(2)} s`);
  if (kind === "on") {
    note(!last.foot && !last.mnt && last.rider, `${tag}: ends riding`);
    const end = sim[sim.length - 1]; note(d3(end.pel, end.hip) < 0.06, `${tag}: hips are on the seat at the hand-over (${(d3(end.pel, end.hip) * 100).toFixed(1)} cm off)`);
    note(end.hands[0] && end.hands[1], `${tag}: both hands on the grips at the hand-over`);
    note(Math.max(...sim.map(p => Math.abs(p.roll))) > 0.02, `${tag}: the sled tips under the boot (${Math.max(...sim.map(p => Math.abs(p.roll))).toFixed(3)} rad)`);
  } else {
    note(last.foot && !last.dmt, `${tag}: ends on foot`);
    note(d3(sim[0].pel, sim[0].hip) < 0.06, `${tag}: starts in the seat (${(d3(sim[0].pel, sim[0].hip) * 100).toFixed(1)} cm off)`);
    note(Math.abs(last.fy - last.fl) < 0.03 && last.fd > 0.6 && last.fd < 1.4, `${tag}: standing on the floor beside the sled (${last.fd.toFixed(2)} m out)`);
  }
  return sim;
}
// a move again with stills every 0.1 s of the swing, from a camera fixed to the sled
async function strip(tag, startExpr, endKey, back, side, up) {
  fs.mkdirSync(`${OUT}/${tag}`, { recursive: true });
  await ev(`window.camOv = c => { const y = P.yaw, fx = Math.sin(y), fz = Math.cos(y), sx = Math.cos(y), sz = -Math.sin(y); c.position.set(P.x - fx * ${back} + sx * ${side}, P.y + ${up}, P.z - fz * ${back} + sz * ${side}); c.lookAt(P.x - fx * 0.3 + sx * 0.25, P.y + 0.95, P.z - fz * 0.3 + sz * 0.25); c.fov = 38; c.updateProjectionMatrix(); }; true`);
  await ev(startExpr + "; true"); let k = 0, n = 0;
  for (let i = 0; i < 900; i++) { await adv(1); const p = await probe(); if (p.sim || (k > 0 && k < 100)) { if (n % 6 === 0) { await sleep(60); await shot(`${tag}/${String(k).padStart(2, "0")}`); k++; } n++; } if (!p[endKey] && (k === 0 || n % 6 === 1)) { if (k > 0) break; } if (i > 880) break; if (!p[endKey] && k > 0 && !p.sim) { await adv(1); await sleep(60); await shot(`${tag}/${String(k).padStart(2, "0")}`); break; } }
}

// ---- the default sled: from the left rear 3 m out, off again, then from the right ----
await ev("__place(2.2, -2.0, 0.6)"); await adv(20);
let fr = await run("mount()", "foot"); check("on, left, from 3 m", fr, "on");
note(fr[fr.length - 1].t - fr[0].t < 8, "on, left: riding within 8 s");
await adv(30);
fr = await run("dismount()", "dmt"); check("off", fr, "off");
await adv(40);
await ev("__place(-1.4, 0.4, 2.5)"); await adv(20);
fr = await run("mount()", "foot"); check("on, right", fr, "on");
await adv(30);
fr = await run("dismount()", "dmt"); check("off again", fr, "off");
await adv(20);
// straight back on from where the dismount left you
fr = await run("mount()", "foot"); check("on, from where you got off", fr, "on");
await adv(30); fr = await run("dismount()", "dmt"); await adv(20);
// ---- every sled ----
const ids = JSON.parse(await ev("JSON.stringify(SLEDS.map(s => s.id))"));
for (const id of ids) {
  await ev(`GS.own.sled = "${id}"; restat(); applyLoadout(); poseRider(); true`); await adv(10);
  await ev("__place(1.1, -0.5, -0.5)"); await adv(10);
  fr = await run("mount()", "foot"); check(`${id} on`, fr, "on"); await adv(20);
  fr = await run("dismount()", "dmt"); check(`${id} off`, fr, "off"); await adv(20);
}
// ---- hard, level ground: the depot's plowed yard (a real step up onto the board, a real step down off it) ----
await ev(`GS.own.sled = "${ids[0]}"; restat(); applyLoadout(); poseRider(); crashCancel(); FOOT.on = false; P.x = depot.x - 10; P.z = depot.z - 6; P.yaw = 0.4; P.vx = P.vy = P.vz = 0; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true); camState.init = false; true`); await adv(90);
console.log("yard: snow beside the sled is", await ev("(walkFloor(P.x + Math.cos(P.yaw) * 0.8, P.z - Math.sin(P.yaw) * 0.8) - P.y).toFixed(2)"), "m above its base");
await ev("__place(1.3, -0.2, -1.2)"); await adv(20);
fr = await run("mount()", "foot"); check("yard on", fr, "on"); await adv(30);
fr = await run("dismount()", "dmt"); check("yard off", fr, "off"); await adv(30);
// ---- stills ----
if (!process.env.NOSTILLS) {
  await ev(`GS.own.sled = "${ids[0]}"; restat(); applyLoadout(); poseRider(); true`); await adv(10);
  for (const [tag, back, side, up] of [["rear", 4.2, 1.2, 1.5], ["front", -3.6, 2.4, 1.5]]) {
    await ev("__place(1.3, -0.2, -1.2)"); await adv(20);
    await strip(`on_${tag}`, "mount()", "foot", back, side, up); await adv(30);
    await strip(`off_${tag}`, "dismount()", "dmt", back, side, up); await adv(30);
  }
}
console.log(fails.length ? `FAILED ${fails.length}:\n` + fails.join("\n") : "ALL OK");
await done(fails.length ? 1 : 0);
