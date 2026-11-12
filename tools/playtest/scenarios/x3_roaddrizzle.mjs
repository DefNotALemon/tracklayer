// Beta fix 0141 #1 (3.2a road snow): a grey drizzle doesn't shut the roads, and the council plow works through light
// snow; a real storm still fills them and keeps the plow in. Asserting, exit 1 on a failure. Numbers only.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function hours(h, step = 0.25) { for (let t = 0; t < h; t += step) { await ev(`GS.hour += ${step}; true`); await waitGame(0.35); } }
const sum = `TLXR.routes.filter(r => !r.closed).map(r => ({ id: r.id, st: TLXR.status(r.id), mx: +Math.max(...r.st.s).toFixed(3), p: Math.round(r.st.p) }))`;
const line = R => R.map(r => `${r.id} ${r.st} max ${r.mx} p ${r.p}`).join(" | ");
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(800);
ok(await J(`TLXR.routes.filter(r => !r.closed).every(r => r.st)`), "roads carry snow state");

// A: drizzle 0.5 for 12 game hours: no road shuts (before: all 5 snowed in, max 0.51)
await ev(`TLXR.setSnow(null, 0); WX.at = () => 0.5; true`);
await hours(12, 0.5);
let A = await J(sum); console.log("A drizzle 0.5 x 12 h:", line(A));
ok(A.every(r => r.st === "open"), "A: a 12 h drizzle leaves every road open (" + A.filter(r => r.st !== "open").length + " snowed in)");
ok(A.every(r => r.mx < 0.1), "A: barely any snow on the roads (max " + Math.max(...A.map(r => r.mx)) + ")");

// B: roads snowed in, then light snow (0.55) carries on: the plow still goes out and opens them
await ev(`TLXR.setSnow(null, 0.6); WX.at = () => 0.55; true`);
let started = false;
for (let t = 0; t < 4; t += 0.25) { await hours(0.25, 0.25); const r = await J(sum); if (r.some(x => x.p >= 0)) started = true; }
let B = await J(sum); console.log("B light snow 0.55, 4 h after the roads shut:", line(B), "plow went out", started);
ok(started, "B: the council plow sets out in light snow");
ok(B.every(r => r.st === "open"), "B: 4 h of light snow later every road is plowed open (" + B.filter(r => r.st !== "open").map(r => r.id).join(",") + ")");

// C: moderate snow (0.75) for 6 h still fills the roads
await ev(`TLXR.setSnow(null, 0); WX.at = () => 0.75; true`);
await hours(6, 0.5);
const C = await J(sum); console.log("C moderate 0.75 x 6 h:", line(C));
ok(C.every(r => r.mx > 0.2), "C: moderate snow still builds on every road (min max " + Math.min(...C.map(r => r.mx)) + ")");

// D: a full storm for 3 h shuts them and keeps the plow in
await ev(`TLXR.setSnow(null, 0); WX.at = () => 1; GS.storm = 1; true`);
await hours(3, 0.25);
const D = await J(sum); console.log("D storm 1 x 3 h:", line(D));
ok(D.every(r => r.st === "snowed in"), "D: 3 storm hours snow every road in");
ok(D.every(r => r.p < 0), "D: no plow out in the storm");
await ev(`WX.at = () => 0; GS.storm = 0; GS.stormPhase = "calm"; true`);
await hours(4, 0.25);
const E = await J(sum); console.log("E 4 h after the storm:", line(E));
ok(E.every(r => r.st === "open"), "E: the plow opens every road once the storm passes");

const errs = await J(`TLXR.err || TLXR.tickErr || null`); ok(!errs, "no road error " + errs);
console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);
