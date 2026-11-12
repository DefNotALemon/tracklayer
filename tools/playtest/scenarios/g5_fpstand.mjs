// First-person view blocked by your own sled -> the rider stands on the pegs. Probe + asserts + side stills.
// Sweeps look pitch to find where the pane/dash ray hits (CLIMB.hit), asserts CLIMB.block/stand rise when looking down
// and fall back when released, that the default view and the tablet dip never trigger it, and that CLIMB.v is untouched.
import { boot, ev, shot, sideCam, camOff, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
const snap = () => J("({ b: +CLIMB.block.toFixed(3), s: +CLIMB.stand.toFixed(3), v: +CLIMB.v.toFixed(3), hit: +CLIMB.hit.toFixed(2), pitch: +camState.fpPitch.toFixed(2), eyeY: +camera.position.y.toFixed(2) })");
await boot();
await ev("tutSkip(); crashCancel(); FOOT.on = false; VEH.cur = null; MNT.on = false; DMT.on = false; WX.at = () => 0; GS.hour = 12; true"); await sleep(500);
await ev("camMode = 2; camState.init = false; true"); await sleep(1200);
// pin the look offset every few ms (stands in for the right stick held at a given deflection)
await ev("window.__oy = 0; window.__tk = setInterval(() => { CAMPAD.oy = window.__oy; }, 4); true");
const sweep = [];
for (const oy of [0, 0.2, 0.35, 0.45, 0.55, 0.62, 0.7]) {
  await ev(`window.__oy = ${oy}; true`); await waitGame(2.2); const s = await snap(); sweep.push([oy, s]); console.log("oy", oy, JSON.stringify(s));
}
await ev("window.__oy = 0; true"); await waitGame(3.5);
const rest = await snap(); console.log("rest", JSON.stringify(rest));
ok(sweep[0][1].b < 0.02, "default look: not blocked (block " + sweep[0][1].b + ")");
ok(sweep[1][1].b < 0.02 && sweep[2][1].b < 0.02, "moderate look-down (oy<=0.35): still seated");
ok(sweep[sweep.length - 1][1].b > 0.9 && sweep[sweep.length - 1][1].s > 0.35, "full stick down: block ~1, stand ~standH (" + sweep[sweep.length - 1][1].s + ")");
ok(sweep.every(([, s]) => s.v === 0), "CLIMB.v untouched (flat ground): nose lift and chase zoom stay slope-only");
ok(rest.b < 0.02 && rest.s < 0.01, "released: falls back to seated within 3.5 s");
// rise/fall timing
await ev("window.__oy = 0.7; true"); const t0 = await clock(); let tUp = null;
for (let i = 0; i < 80 && tUp === null; i++) { await sleep(100); if ((await snap()).b > 0.9) tUp = (await clock()) - t0; }
await ev("window.__oy = 0; true"); const t1 = await clock(); let tDn = null;
for (let i = 0; i < 120 && tDn === null; i++) { await sleep(100); if ((await snap()).b < 0.1) tDn = (await clock()) - t1; }
console.log("game-time to 90% up", tUp && tUp.toFixed(2), "to <10% down", tDn && tDn.toFixed(2));
ok(tUp !== null && tUp < 2.5 && tDn !== null && tDn < 4, "rises < 2.5 s, falls back < 4 s");
// the tablet dip never counts
await ev("window.__oy = 0.7; true"); await waitGame(2.5);
await ev("TABLET.e = 0.5; true"); const dip = await J("(() => { viewBlockT(); return { hit: CLIMB.hit }; })()"); await ev("TABLET.e = 0; true");
ok(dip.hit === 99, "tablet dip excluded from detection");
// not while on foot / crashed / chase view
await ev("camMode = 1; camState.init = false; true"); await waitGame(3); const chase = await snap();
ok(chase.b < 0.02, "chase view: no stand from look-down (" + chase.b + ")");
await ev("camMode = 2; camState.init = false; window.__oy = 0; true"); await waitGame(3);
// side-on strips: seated -> blocked -> released, ~0.15 s game apart
await sideCam("[P.x, P.y + 1.1, P.z]", 2.1, 0.7, 1.5708);
await ev("(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { V.headAll.forEach(m => m.visible = true); V.furCollar.visible = true; V.fpHide.forEach(o => o.visible = true); _r(s, c); }; return true; })()");
async function strip(tag, n) { for (let i = 0; i < n; i++) { const t = await clock(); await shot(`${tag}_${String(i).padStart(2, "0")}`); const s = await snap(); console.log(tag, i, "t", t.toFixed(2), "block", s.b, "stand", s.s); while ((await clock()) - t < 0.15) await sleep(30); } }
await strip("a_seated", 2);
await ev("window.__oy = 0.7; true"); await strip("b_rise", 14);
await waitGame(1.5); await strip("c_up", 2);
await ev("window.__oy = 0; true"); await strip("d_fall", 16);
await done(fails ? 1 : 0);
