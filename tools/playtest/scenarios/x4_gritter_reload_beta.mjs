// Beta 4.1c2 gritter through save + reload: hopper kg, gritted lengths, spinner flag, aging after reload, burial by new snow.
import { boot, ev, sleep, done, reload, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } GS.cash = 200000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`);
await sleep(800);
const U = JSON.stringify(await ev(`TLXV.state().owned.find(o => o.id === "plowtruck").uid`));
await ev(`TLXV.swapTo(${U}); FOOT.on = false; TLXPL.fill(${U}); true`); await sleep(800);
// a straight-ish road stretch: pick the first route with a long segment, put the truck at s=60 facing along it
const pl = await J(`(() => { const R = TLXR.routes.find(r => !r.closed && r.st && r.len > 500 && !r.convoy) || TLXR.routes.find(r => !r.closed && r.st && r.len > 300); if (!R) return null;
  const at = s => { const n = R.pts ? null : null; return null; }; return { id: R.id, name: R.name, len: R.len, hasPts: !!R.pts, keys: Object.keys(R).join(",") }; })()`);
console.log("  route", JSON.stringify(pl));
if (!pl) { ok(false, "no road route found"); await done(1); }
await ev(`window.__rt = id => TLXR.routes.find(r => r.id === id); window.__lane = (id, s) => { const r = __rt(id), c = r.cum, p = r.pts; let i = 1; while (i < c.length - 1 && c[i] < s) i++; const a = p[i - 1], b = p[i], L = c[i] - c[i - 1] || 1, t = (s - c[i - 1]) / L; return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, yaw: Math.atan2(b[0] - a[0], b[1] - a[1]) }; }; true`);
const RID = JSON.stringify(pl.id);
await ev(`(() => { const q = __lane(${RID}, 40); P.x = q.x; P.z = q.z; P.yaw = q.yaw; P.vx = 0; P.vz = 0; P.y = surf(P.x, P.z); return true; })()`); await sleep(500);
await ev(`if (!TLXPL.rt(${U}).grit) TLXPL.gritToggle(${U}); true`);
await down("KeyW");
for (let i = 0; i < 60; i++) { await ev(`(() => { const n = TLXR.near(P.x, P.z), q = __lane(${RID}, n.s + 8); const e = Math.atan2(q.x - P.x, q.z - P.z); P.yaw = e; return true; })()`); await sleep(120); }
await up("KeyW"); await sleep(300);
const snap = () => J(`(() => { const p = TLX.state("plow"), b = TLXPL.rt(${U}); const keys = Object.keys(p.grit); const k = keys[0]; const g = k && p.grit[k]; const back = TLXPL.gritSpot(P.x - Math.sin(P.yaw) * 8, P.z - Math.cos(P.yaw) * 8);
  return { hop: Math.round(p.blades[${U}].hop), kg: Math.round(p.gritKg), grit: !!b.grit, keys: keys.length, key: k, n: g ? g.h.filter(h => h > 0).length : 0, gAtBehind: back ? +TLXPL.gritAt(P.x - Math.sin(P.yaw) * 8, P.z - Math.cos(P.yaw) * 8).toFixed(3) : null, hour: GS.hour, v: Math.round(Math.hypot(P.vx, P.vz)) }; })()`);
const pre = await snap(); console.log("  before", JSON.stringify(pre));
ok(pre.n >= 3 && pre.hop < 3000 && pre.gAtBehind > 0.5, "A drove and gritted a stretch");
const spot = await J(`(() => ({ x: P.x - Math.sin(P.yaw) * 8, z: P.z - Math.cos(P.yaw) * 8 }))()`);
await ev(`save(); true`);
const saved = JSON.parse(await ev(`localStorage.getItem("tracklayer.save.v2")`));
const sg = saved.x && saved.x.sys && saved.x.sys.plow && saved.x.sys.plow.s && saved.x.sys.plow.s.grit;
ok(sg && Object.keys(sg).length === pre.keys, "B grit table is in the save: " + (sg ? Object.keys(sg).length : "none"));
await reload(saved); await sleep(1500); await ev(`tutSkip(); WX.at = () => 0; GS.storm = 0; true`); await sleep(800);
const post = await J(`(() => { const p = TLX.state("plow"), u = TLXV.state().owned.find(o => o.id === "plowtruck").uid; const b = TLXPL.rt(u); return { u, hop: Math.round(p.blades[u].hop), kg: Math.round(p.gritKg), grit: !!b.grit, keys: Object.keys(p.grit).length, at: +TLXPL.gritAt(${spot.x}, ${spot.z}).toFixed(3), hour: GS.hour }; })()`);
console.log("  after", JSON.stringify(post));
ok(Math.abs(post.hop - pre.hop) <= 2 && Math.abs(post.kg - pre.kg) <= 2, `C hopper and total survive: ${pre.hop}->${post.hop}, ${pre.kg}->${post.kg}`);
ok(post.grit === false, "D spinner is off after reload (not left spreading on foot)");
ok(post.keys === pre.keys && post.at > 0.5, `E gritted length still live at the spot: ${post.at}`);
// F age past 10 h -> gone, and a reload of that
await ev(`GS.hour = GS.hour + 1.4; true`); await sleep(300);
await ev(`GS.hour = GS.hour + 1.4; true`); await sleep(300);
await ev(`GS.hour = GS.hour + 1.4; true`); await sleep(300);
const sn = await J(`(() => { const q = TLXPL.gritSpot(${spot.x}, ${spot.z}); return q ? { sn: q.sn, s0: TLX.state("plow").grit[q.key] && TLX.state("plow").grit[q.key].s0 } : null; })()`); console.log("  snow vs s0", JSON.stringify(sn));
const mid = await J(`+TLXPL.gritAt(${spot.x}, ${spot.z}).toFixed(3)`);
await ev(`GS.hour = GS.hour + 1.4; true`); await sleep(300);
await ev(`GS.hour = GS.hour + 1.4; true`); await sleep(300);
await ev(`GS.hour = GS.hour + 1.4; true`); await sleep(300);
await ev(`GS.hour = GS.hour + 1.4; true`); await sleep(300);
await ev(`GS.hour = GS.hour + 1.4; true`); await sleep(300);
const late = await J(`+TLXPL.gritAt(${spot.x}, ${spot.z}).toFixed(3)`);
console.log("  aging 4.2h", mid, "11.2h", late);
ok(mid > 0 && mid < post.at + 0.001, "F still biting at 4.2 h, not stronger");
ok(late === 0, "G gone after 11 h");
await ev(`save(); true`);
const s2 = JSON.parse(await ev(`localStorage.getItem("tracklayer.save.v2")`));
const left = s2.x.sys.plow.s.grit ? Object.keys(s2.x.sys.plow.s.grit).length : -1;
console.log("  grit keys in save after expiry", left);
ok(left === 0 || left === post.keys, "H expired grit forgotten or harmless in the save: " + left);
// I corrupt hopper in a planted save
const bad = JSON.parse(JSON.stringify(s2)); bad.x.sys.plow.s.blades[post.u].hop = "lots"; bad.x.sys.plow.s.gritKg = null;
await reload(bad); await sleep(1500); await ev(`tutSkip(); true`); await sleep(600);
const r = await J(`(() => { const u = TLXV.state().owned.find(o => o.id === "plowtruck").uid; return { hop: TLXPL.hopOf(u), hint: typeof TLXPL.hint() }; })()`);
console.log("  bad", JSON.stringify(r));
ok(Number.isFinite(r.hop) && r.hop >= 0, "I string hopper reads as a number");
console.log(fails ? "FAILS " + fails : "ALL PASSED");
await done(fails ? 1 : 0);
