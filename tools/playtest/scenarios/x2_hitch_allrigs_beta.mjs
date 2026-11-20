// Beta 2.5: every rig kind (groomer, tiller, trailer, flatbed, akja) hitched to the pickup, driven 5 s, unhitched. Asserts follow, finite, hint/toast.
import { boot, ev, tap, sleep, done, park, shot, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
async function holdFor(code, s) { await down(code); await waitGame(s); await up(code); }
const rel = () => J(`(() => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); const dx = TOW.x - P.x, dz = TOW.z - P.z; return { on: TLXV.rigOn(), kind: TOW.kind, behind: -(dx * fx + dz * fz), side: dx * fz - dz * fx, px: P.x, pz: P.z, use: footUse(), hint: $("wnHint").textContent, nan: [TOW.x, TOW.z, TOW.yaw, TOW.y, P.x, camera.position.x].some(v => !isFinite(v)) }; })()`);
const atTongue = () => ev(`(() => { const t = TLXV.tongueTip(), lx = Math.cos(TOW.yaw), lz = -Math.sin(TOW.yaw); crashCancel(); FOOT.on = true; FOOT.x = t[0] + lx * 0.8; FOOT.z = t[1] + lz * 0.8; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = TOW.yaw + Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const walkerBeside = (off = 3.2) => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; const p = s.cur === r.uid ? P : r; const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
  FOOT.on = true; FOOT.x = p.x + fz * ${off} - fx * 0.3; FOOT.z = p.z - fx * ${off} - fz * 0.3; FOOT.yaw = p.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`); await park(); await sleep(400);
await ev(`(() => { const o = GS.own; for (const k of ["groomer","tiller","trailer","flatbed","akja"]) o.partsOwned["hitch:" + k] = true; o.partsOwned["recv:ball"] = true; o.partsOwned["recv:heavy"] = true; o.parts.recv = "ball"; GS.cash = 90000; restat(); return 1; })()`);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
ok(lane && lane.L > 35, "lane " + (lane && lane.L.toFixed(0)));
for (const kind of ["groomer", "tiller", "trailer", "flatbed", "akja"]) {
  await ev(`crashCancel(); FOOT.on = false; VEH.cur && 0; true`);
  await ev(`(() => { GS.own.parts.hitch = "${kind}"; restat(); return 1; })()`); await waitGame(0.8);
  await ev(`(() => { const L = ${JSON.stringify(lane)}, H = HITCH["${kind}"], ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L, yaw = Math.atan2(ux, uz);
    const s = TLX.state("vehicles"); const r = s.owned[0]; if (s.cur === r.uid) { P.x = L.x + ux * 9; P.z = L.z + uz * 9; P.yaw = yaw; P.vx = P.vz = 0; } r.x = L.x + ux * 9; r.z = L.z + uz * 9; r.yaw = yaw;
    const px = r.x, pz = r.z; const bx = px - ux * 3.1, bz = pz - uz * 3.1, tx = bx - ux * 0.9, tz = bz - uz * 0.9;
    TOW.x = tx - ux * H.len; TOW.z = tz - uz * H.len; TOW.yaw = yaw; TOW.mass = 0;
    const rg = s.rig; rg.on = null; rg.kind = "${kind}"; rg.x = TOW.x; rg.z = TOW.z; rg.yaw = yaw; TOW.kind = "${kind}"; restat();
    recenter(px, pz, true); return 1; })()`);
  await atTongue(); await waitGame(1.0);
  let s = await rel(); console.log(kind, "before E:", s.use, "|", s.hint);
  await ev(`window.__tsaw=[]; if(!window.__ti) window.__ti=setInterval(()=>{for(const m of [...$("toasts").children].map(c=>c.textContent)) if(!window.__tsaw.includes(m)) window.__tsaw.push(m)},80); true`);
  await tap("KeyE"); await waitGame(0.6); s = await rel();
  const toast = await J(`window.__tsaw`);
  console.log(kind, "after E:", s.on, toast.join(" | "));
  ok(s.on === "v1", kind + " hitches to the pickup (" + s.on + ")");
  if (s.on !== "v1") continue;
  await walkerBeside(3.2); await sleep(300); await tap("KeyQ");
  ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), kind + " in truck");
  const a = await rel(); await holdFor("KeyW", 5); const b = await rel();
  const dist = Math.hypot(b.px - a.px, b.pz - a.pz);
  console.log(kind, "drove", dist.toFixed(0), "m, behind", b.behind.toFixed(1), "side", b.side.toFixed(1));
  ok(!b.nan, kind + " finite"); ok(dist > 8, kind + " truck moves with it (" + dist.toFixed(0) + " m)");
  ok(b.on === "v1" && b.behind > 1.5 && b.behind < 10 && Math.abs(b.side) < 3, kind + " trails behind the ball");
  await shot("x2har_" + kind);
  await tap("KeyQ"); await waitUntil("FOOT.on && !DMT.on", 14); await waitGame(0.6);
  await atTongue(); await waitGame(0.8);
  await tap("KeyE"); await waitGame(0.6); s = await rel(); ok(s.on === null, kind + " unhitches (" + s.on + ")");
}
done(fails);
