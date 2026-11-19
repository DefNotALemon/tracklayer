// Beta test 2.2: the saved fleet (vehicles.owned / cur) planted hostile, each through a real reload, then board/walk.
import { boot, ev, sleep, done, reload, raw, errors, tap } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);
await ev(`GS.cash = 30000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
await ev(`save(); true`);
const base = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`) || "null");
const vs = base.x.sys.vehicles.s;
console.log("base owned:", vs.owned.length, "cur:", vs.cur, JSON.stringify(vs.owned[0]).slice(0, 300));
const mk = f => { const b = JSON.parse(JSON.stringify(base)); f(b.x.sys.vehicles.s); return b; };
const cases = {
  cur_gone: s => { s.cur = "v999"; },
  cur_number: s => { s.cur = 7; },
  nan_pose: s => { s.owned.forEach(r => { r.x = null; r.z = null; r.yaw = null; r.y = null; }); },
  str_pose: s => { s.owned.forEach(r => { r.x = "10"; r.z = "-4"; r.yaw = "1"; r.fuel = "30"; }); },
  fuel_wild: s => { s.owned[0].fuel = -50; if (s.owned[1]) s.owned[1].fuel = 1e9; },
  far_pose: s => { s.owned.forEach(r => { r.x = 1e9; r.z = -1e9; }); },
  dup_uid: s => { if (s.owned[1]) s.owned[1].uid = s.owned[0].uid; },
  unknown_id: s => { s.owned[0].id = "spaceship"; },
  owned_junk: s => { s.owned.push(null, 5, "x", {}); },
  owned_notarray: s => { s.owned = {}; },
  at_sea: s => { s.owned.forEach(r => { r.x = -99999; r.z = -99999; }); },
};
for (const [name, f] of Object.entries(cases)) {
  const n0 = errors.length;
  await reload(mk(f)); await sleep(1500);
  await ev(`tutSkip(); true`); await sleep(500);
  let r; try { r = await J(`(() => { const s = TLX.state("vehicles"); const o = Array.isArray(s.owned) ? s.owned : []; return { n: o.length, cur: s.cur, bad: o.some(q => !q || typeof q !== "object" || ![q.x, q.z, q.yaw].every(Number.isFinite) || !(q.fuel >= 0 && q.fuel < 1e6)), uids: o.map(q => q && q.uid), nan: [P.x, P.z, P.y, camera.position.x, GS.fuel].some(v => !isFinite(v)) }; })()`); } catch (e) { r = { threw: String(e) }; }
  ok(!r.threw, `${name}: loads`);
  if (!r.threw) {
    ok(!r.bad, `${name}: records sane ${JSON.stringify(r).slice(0, 220)}`);
    ok(!r.nan, `${name}: P/camera finite`);
    ok(new Set(r.uids).size === r.uids.length, `${name}: unique uids`);
    // try boarding the nearest: teleport beside record and Q
    await ev(`(() => { const s = TLX.state("vehicles"); const q = (s.owned||[])[0]; if (!q) return 0; crashCancel(); FOOT.on = true; FOOT.x = q.x + 3; FOOT.z = q.z; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
    await sleep(900); await tap("KeyQ"); await sleep(4500);
    const b = await J(`({ foot: FOOT.on, mnt: MNT.on, cur: TLX.state("vehicles").cur, nan: [P.x, P.z, P.y, camera.position.x, GS.fuel].some(v => !isFinite(v)) })`);
    ok(!b.nan, `${name}: after Q finite (${JSON.stringify(b)})`);
    await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400);
    const txt = await ev(`document.querySelector("#garageBody").textContent`);
    ok(!/NaN|undefined|object Object/.test(txt), `${name}: Trucks tab clean`);
    await ev(`closeGarage(); true`);
  }
  if (errors.length > n0) console.log("  page errors in", name, errors.slice(n0).join(" | ").slice(0, 300));
}
console.log("page errors:", errors.length ? errors.join(" | ").slice(0, 600) : "none");
await done(fails ? 1 : 0);
