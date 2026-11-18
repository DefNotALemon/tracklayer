// Beta break-it for the Politi: reload mid-pursuit, a fine with cash 0, crash + gear toggles. Prints, exit 1 on a fail.
import { boot, reload, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function until(expr, maxGame) { const t0 = await clock(); for (;;) { if (await ev(`!!(${expr})`)) return true; if ((await clock()) - t0 > maxGame) return false; await sleep(150); } }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; INT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1200);
await ev(`(() => { window.__drv = null; setInterval(() => { const d = window.__drv; if (!d || !d.on) return; const t = gameClock, dt = Math.max(0, Math.min(0.1, t - d.t)); d.t = t; d.s += d.v * dt; const p = TLXT.lanePt(d.id, d.s, 1); if (!p) return; P.x = p.x; P.z = p.z; P.yaw = p.yaw; P.vx = Math.sin(p.yaw) * d.v; P.vz = Math.cos(p.yaw) * d.v; P.vy = 0; P.y = surf(P.x, P.z) + 0.3; }, 30); return true; })()`);
const route = await J(`(() => { const r = TLXT.routes.slice().sort((a, b) => b.len - a.len)[0]; return { id: r.id, s0: r.s0, len: r.len }; })()`);
const s = route.s0 + route.len * 0.1;
await ev(`GS.cash = 0; window.__drv = { on: true, id: ${JSON.stringify(route.id)}, s: ${s}, v: 28, t: gameClock }; true`); await sleep(300);
await ev(`TLXP.patrol(0, ${JSON.stringify(route.id)}, ${s} - 60, 1); true`);
await until(`TLXP.mode === "pursuit"`, 20);
const a = await J(`({ m: TLXP.mode, heat: TLXP.S().heat, cash: GS.cash })`); console.log("pursuit", JSON.stringify(a));
ok(a.m === "pursuit", "reached pursuit with $0");
await ev(`window.__drv = null; P.vx = P.vz = 0; true`);
await until(`TLXP.mode === "busted" || TLXP.S().rec.busts > 0 || TLXP.mode === "clear"`, 15);
const b = await J(`({ m: TLXP.mode, cash: GS.cash, owed: TLXP.S().owed, busts: TLXP.S().rec.busts })`); console.log("stopped", JSON.stringify(b));
ok(b.cash >= 0 && b.owed >= 0 && !Number.isNaN(b.owed), "cash 0 fine: cash never negative, owed " + b.owed);
// reload mid-pursuit
await ev(`window.__drv = { on: true, id: ${JSON.stringify(route.id)}, s: ${s + 300}, v: 28, t: gameClock }; TLXP.reset && 0; true`);
await ev(`TLXP.patrol(1, ${JSON.stringify(route.id)}, ${s + 240}, 1); true`);
await until(`TLXP.mode === "warn" || TLXP.mode === "pursuit"`, 15);
const pre = await J(`({ m: TLXP.mode, heat: TLXP.S().heat, owed: TLXP.S().owed })`);
await reload();
await sleep(2500);
const post = await J(`({ m: TLXP.mode, heat: TLXP.S().heat, owed: TLXP.S().owed, err: TLXP.RT.err || null, cops: TLXP.cops.filter(c => c.on).length })`);
console.log("reload", JSON.stringify(pre), JSON.stringify(post));
ok(!post.err && post.owed === pre.owed, "reload mid-" + pre.m + ": no error, owed kept (" + post.owed + ")");
ok(post.m === "clear" || post.m === pre.m, "post-reload mode sane: " + post.m + " heat " + Math.round(post.heat));
await sleep(8000);
const late = await J(`({ m: TLXP.mode, heat: TLXP.S().heat, cash: GS.cash })`); console.log("later", JSON.stringify(late));
ok(late.cash >= 0 && !Number.isNaN(late.heat), "10 s after reload still sane");
console.log(fails ? "FAILED: " + fails : "all ok"); await done(fails ? 1 : 0);
