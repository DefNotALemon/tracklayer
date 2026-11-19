// Beta test 2.4 (tablet from a cab) in the TRACTOR UNIT with a loaded trailer coupled and a trailer run under way (3.5b3a).
// Tab/Map/Jobs/Freight from the cab, rolling with the tablet open, Q out with it open, reload with it open, pad + touch.
import { boot, ev, tap, sleep, done, shot, down, up, padSet, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 14) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const tab = () => J(`({ open: TABLET.open, mode: TABLET.mode, app: TABLET.app, cur: TLX.state("vehicles").cur, foot: FOOT.on, camNaN: !isFinite(camera.position.x + camera.quaternion.x), v: Math.hypot(P.vx || 0, P.vz || 0), txt: ($("tabS").innerText || "").slice(0, 300) })`);
const tr = id => J(`TLXRIG.list().find(t => t.id === "${id}")`);
const spd = () => J(`({ vf: +(P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)).toFixed(2) })`);
const tapB = id => `(() => { const b = $("${id}"); if (!b) return 0; b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return 1; })()`;

await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.cash = 90000; GS.apps.freight = 1; GS.signed.freight = true; GS.lic = GS.lic || {}; GS.lic.freight = true; true`);
await ev(`TLXV.buy("tractor"); true`); await sleep(600);
const tk = await J(`TLX.state("vehicles").owned.find(r => r.id === "tractor")`);
ok(!!tk, "tractor bought");
await ev(`TLXRIG.take("kj"); true`); await sleep(300);
ok(!!(await J("TLXRIG.run()")), "run taken");
await ev(`TLXV.swapTo(${JSON.stringify(tk.uid)}); FOOT.on = false; true`); await sleep(1300);
await ev(`(() => { const t = TLXRIG.list().find(t => t.id === "kj"), yaw = t.yaw + 0.02, fz = TLXV.rt().def.fifthZ;
  const fx = t.kx + Math.sin(t.yaw) * 1.6, fzz = t.kz + Math.cos(t.yaw) * 1.6;
  P.x = fx - Math.sin(yaw) * fz; P.z = fzz - Math.cos(yaw) * fz; P.yaw = yaw; P.vx = P.vz = 0; P.vy = 0; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; FOOT.on = false; FOOT.g.visible = false; recenter(P.x, P.z, true); camState.init = false; return 1; })()`);
await waitGame(0.6);
let coupled = false; { const t0 = await clock(); while ((await clock()) - t0 < 25) { if ((await tr("kj")).on) { coupled = true; break; } if ((await spd()).vf > -1.0) { await down("KeyS"); await sleep(120); await up("KeyS"); } await sleep(120); } }
ok(coupled, "trailer coupled"); await sleep(300);
await ev(`(() => { const t = TLXRIG.list().find(t => t.id === "kj"), l = TLXRIG.legsPt("kj"); P.vx = P.vz = 0; FOOT.on = true; FOOT.g.visible = true; FOOT.x = l[0] + Math.cos(t.yaw) * 1.9; FOOT.z = l[1] - Math.sin(t.yaw) * 1.9; FOOT.yaw = t.yaw - 1.57; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; return 1; })()`); await sleep(350);
await ev(`(() => { const r = footXUse(); if (r) r.act(); return 1; })()`); await sleep(400);
await ev(`FOOT.on = false; FOOT.g.visible = false; true`); await sleep(300);
console.log("  legs after use:", (await tr("kj")).legs);

// 1 keyboard
await tap("Tab"); await waitGame(0.9); let t = await tab();
ok(t.open && t.mode === "overlay" && !t.camNaN, "Tab in tractor cab (coupled): overlay " + t.mode);
for (const app of ["map", "jobs", "freight", "parcels"]) {
  await ev(`TABLET.toggle(true, "${app}"); true`); await sleep(500); t = await tab();
  ok(t.open && t.app === app && !t.camNaN && t.txt.length > 0, `${app} app opens in the tractor cab (${JSON.stringify(t.txt.slice(0, 80))})`);
  if (app === "jobs") ok(/trailer run|box trailer/i.test(t.txt), "Jobs lists the trailer run");
  if (app === "freight") ok(/UNDER WAY|GIVE UP/i.test(await ev(`$("tabS").innerText`)), "Freight shows run under way");
  await shot("tr_" + app);
}
await ev(`TABLET.close(true); true`); await waitGame(0.4);

// 2 roll with tablet open while coupled
await tap("Tab"); await waitGame(0.5); await down("KeyW"); await waitGame(4); t = await tab();
ok(t.open && !t.camNaN && t.v > 0.5, "tablet open while rolling with a trailer on (v " + t.v.toFixed(1) + ")");
const hud = await ev(`$("jobTitle").textContent + " / " + $("jobSub").textContent`); console.log("  compass:", JSON.stringify(hud));
await up("KeyW"); await tap("Tab"); await waitGame(0.4);
await down("KeyS"); const st = await waitUntil("Math.hypot(P.vx, P.vz) < 0.3", 25); await up("KeyS"); ok(st, "stopped with S");
ok((await tr("kj")).on, "still coupled after the roll");

// 3 reload with the tablet open in the cab
await ev(`TABLET.toggle(true, "map"); true`); await sleep(500);
await ev(`save && save(); true`).catch(() => 0);
await reload(); await sleep(1500);
t = await tab(); const cur = await ev(`TLX.state("vehicles").cur`); const run = await J("TLXRIG.run()");
ok(!t.camNaN, `reload with tablet open: camera finite (open=${t.open}, cur=${cur}, foot=${t.foot})`);
ok(!!run, "run survives the reload: " + JSON.stringify(run && { id: run.id, to: run.to }));
console.log("  coupled after reload:", (await tr("kj")).on);

// 4 pad
await ev(`TABLET.open && TABLET.close(true); INP.dev = "pad"; true`);
await padSet({ 12: 1 }, [0, 0, 0, 0]); await sleep(150); await padSet(); await waitGame(0.8); t = await tab();
console.log("  pad d-pad up:", JSON.stringify({ open: t.open, app: t.app, foot: t.foot }));
ok(!t.camNaN, "pad d-pad up: camera finite");
for (let i = 0; i < 3 && (await tab()).open; i++) { await padSet({ 1: 1 }, [0, 0, 0, 0]); await sleep(150); await padSet(); await waitGame(0.6); }
ok(!(await tab()).open, "pad B closes the tablet");
await ev(`INP.dev = "kbm"; true`);

// 5 Q out with tablet open
await ev(`TABLET.toggle(true, "freight"); true`); await sleep(400);
await tap("KeyQ"); await waitGame(3); t = await tab();
console.log("  after Q with tablet open:", JSON.stringify({ open: t.open, foot: t.foot, cur: t.cur }));
ok(!t.camNaN, "Q with tablet open: camera finite");
await ev(`TABLET.open && TABLET.close(true); true`);
await shot("tr_end");
console.log("page errors listed by harness below");
await done(fails ? 1 : 0);
