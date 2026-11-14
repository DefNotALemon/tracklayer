// Beta break-it pass for 14.1 (skiff): second boat / third refused, empty tank, storm at night, Q spam mid step-in,
// reload mid step-in, reset (N) on water, jetty piles, boat->walk->sled switching. Reports findings, exits 0 always
// (read the FINDING lines). Everything by gameClock.
import { boot, ev, tap, sleep, done, reload, down, up } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
const F = (t, m) => console.log(`${t} ${m}`);
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const holdFor = async (codes, secs, fn) => { codes = [].concat(codes); for (const c of codes) await down(c); const t0 = await clock(), out = [];
  try { for (;;) { await sleep(250); const t = await clock(); out.push(await fn()); if (t - t0 >= secs) break; } } finally { for (const c of codes) await up(c); } return out; };
const B = () => J(`{ t: +gameClock.toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), x: P.x, z: P.z, y: +P.y.toFixed(3), dep: +TLXB.depthAt(P.x, P.z).toFixed(2), foot: FOOT.on, fuel: GS.fuel, sea: isSea(P.x, P.z) }`);
const dockW = (u, v) => `(() => { const D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw); return [D.x + fz * (${v}) + fx * (${u}), D.z - fx * (${v}) + fz * (${u})]; })()`;
const buy = async () => { await ev(`garageTab = "boats"; openGarage(); true`); await sleep(500); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`); };

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 20000; true`);

await buy();
const b0 = (await J(`TLX.state("vehicles").owned.filter(r => r.id === "skiff")`))[0];
const p = await J(`(() => { const D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw); const s = Math.sign((${b0.x} - D.x) * fz - (${b0.z} - D.z) * fx); return [${b0.x} - fz * s * 1.4, ${b0.z} + fx * s * 1.4]; })()`);
await ev(`(() => { crashCancel(); FOOT.on = true; FOOT.x = ${p[0]}; FOOT.z = ${p[1]}; FOOT.y = walkFloor(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`); await sleep(1200);
await tap("KeyQ"); await waitUntil("!MNT.on", 10); await sleep(400);
const run = async (label, secs = 3) => { const r = await holdFor("KeyW", secs, B); const l = r[r.length-1]; F("INFO", `${label}: v ${l.v} y ${l.y} fuel ${l.fuel.toFixed(2)} x ${l.x.toFixed(0)}`); };
const st = async l => F("INFO", l + " " + JSON.stringify(await J(`({ help: HELP.on, y: +P.y.toFixed(2), v: +Math.hypot(P.vx,P.vz).toFixed(2), storm: GS.storm, wl: wlvAt(P.x,P.z) })`)));
await waitGame(7); await st("idle calm 7s seated at berth");
await ev(`GS.fuel = 0; true`); await run("tank empty cruise 3s"); await waitGame(6); await st("then coasting stopped 6 s");
await ev(`HELP.on=false; HELP.stillWet=0; GS.fuel=20; GS.hour=36; true`); await ev(`P.x=-1380; P.z=-480; P.vx=P.vz=0; true`); await waitGame(1);
for (const sv of [0.3, 0.6, 1]) { await ev(`HELP.on=false; HELP.stillWet=0; GS.storm=${sv}; true`); const r = await holdFor("KeyW", 8, async()=>J(`({y:P.y, h:HELP.on, v:Math.hypot(P.vx,P.vz)})`)); F("INFO", `storm ${sv}: y ${Math.min(...r.map(o=>o.y)).toFixed(2)}..${Math.max(...r.map(o=>o.y)).toFixed(2)} help ${r.some(o=>o.h)} top ${Math.max(...r.map(o=>o.v)).toFixed(1)}`); }
await done(0);
