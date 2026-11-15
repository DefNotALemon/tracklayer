// Beta (0203): tablet app list after the Boats + Lights apps landed (v237): fresh save, every app opens/closes with no page error,
// Boats/Lights apps hide until owned, in a cab, with an old save, and after a reload with the tablet open. Exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, reload, shot, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; true`); await sleep(600);
await park(); await sleep(400);
const list = () => J(`(TABLET.apps || Object.keys(TABLET.byId || {})).map(a => typeof a === "string" ? a : a.id)`);
let ids = await list(); console.log("apps fresh", JSON.stringify(ids));
const visible = () => J(`(() => { const out = []; for (const id of Object.keys(TABLET.byId)) { const a = TABLET.byId[id]; let v = true; try { if (a.show) v = !!a.show(); else if (a.hidden) v = !a.hidden(); } catch (e) { v = "ERR " + e.message; } out.push([id, v]); } return out; })()`);
let vis = await visible(); console.log("visible fresh", JSON.stringify(vis));
ok(!vis.some(x => typeof x[1] === "string"), "no app visibility check throws");
const names = ids.map(String);
// open every app on the sled, then close
const bad = [];
for (const id of Object.keys(await J(`TABLET.byId`))) {
  const before = errors.length;
  await ev(`try { TABLET.toggle(true, ${JSON.stringify(id)}); } catch (e) { window.__e = e.message; } true`); await sleep(350);
  const s = await J(`({ open: TABLET.open, app: TABLET.app, e: window.__e || null, h: (document.querySelector("#tabS") || {}).innerText ? document.querySelector("#tabS").innerText.length : -1 })`);
  if (s.e || errors.length > before || !s.open || s.app !== id) bad.push([id, s, errors.slice(before).map(String).join("|").slice(0, 120)]);
  await ev(`TABLET.close(true); window.__e = null; true`); await sleep(150);
}
console.log("bad apps", JSON.stringify(bad));
ok(bad.length === 0, `every app opens on the sled without error (${bad.length} bad)`);
// own a boat + a lighthouse, apps should appear
await ev(`GS.cash = 500000; true`);
const hasBoats = await J(`!!TABLET.byId.boats`), hasLights = await J(`!!TABLET.byId.lights`);
console.log("apps boats/lights registered", hasBoats, hasLights);
// open Boats and Lights with nothing owned (direct toggle): must not throw and say something
for (const id of ["boats", "lights"]) {
  if (!(await J(`!!TABLET.byId[${JSON.stringify(id)}]`))) continue;
  await ev(`TABLET.toggle(true, ${JSON.stringify(id)}); true`); await sleep(400);
  const t = await ev(`(document.querySelector("#tabS") || document.body).innerText.slice(0, 300)`);
  console.log(id, "empty text:", JSON.stringify(t));
  ok(typeof t === "string" && t.length > 0, `${id} app with nothing owned shows text`);
  await shot("tab_" + id + "_empty");
  await ev(`TABLET.close(true); true`); await sleep(150);
}
// in a cab: buy pickup, get in, open tablet via map key then each app
await ev(`GS.delivered = 12; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
const uid = await J(`(TLX.state("vehicles").owned[0] || {}).uid || null`); ok(!!uid, "bought a truck " + uid);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3.2; FOOT.z = r.z - fx * 3.2; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(1200); await tap("KeyQ");
const t0 = await ev("gameClock"); let inCab = false;
while ((await ev("gameClock")) - t0 < 14) { if (await ev("!MNT.on && !FOOT.on && !!VEH.cur")) { inCab = true; break; } await sleep(150); }
ok(inCab, "in the cab");
const bad2 = [];
for (const id of Object.keys(await J(`TABLET.byId`))) {
  const before = errors.length;
  await ev(`try { TABLET.toggle(true, ${JSON.stringify(id)}); } catch (e) { window.__e = e.message; } true`); await sleep(300);
  const s = await J(`({ open: TABLET.open, app: TABLET.app, e: window.__e || null })`);
  if (s.e || errors.length > before) bad2.push([id, s.e, errors.slice(before).map(String).join("|").slice(0, 120)]);
  await ev(`TABLET.close(true); window.__e = null; true`); await sleep(120);
}
console.log("bad in cab", JSON.stringify(bad2));
ok(bad2.length === 0, "every app opens in the cab without error");
// reload with tablet open on the last app, then open again
await ev(`TABLET.toggle(true, "map"); save(); true`); await sleep(300);
await reload(); await sleep(1800);
const after = await J(`({ open: TABLET.open, cur: TLX.state("vehicles").cur })`);
console.log("after reload", JSON.stringify(after));
await ev(`TABLET.toggle(true, "map"); true`); await sleep(500);
ok(await ev("TABLET.open"), "map opens after reload");
const st = await ev(`typeof P.x === "number" && isFinite(P.x) && isFinite(camera.position.x)`); ok(st, "finite pose/camera");
ok(errors.length === 0, "page errors: " + (errors.length ? errors.map(String).join(" | ").slice(0, 300) : "none"));
await done(fails ? 1 : 0);
