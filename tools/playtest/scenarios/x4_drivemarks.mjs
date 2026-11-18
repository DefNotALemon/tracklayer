// beta fix 0250 #1 (4.2b1 driveways, lane A): a drive part cleared keeps its progress through a reload.
//   A cut 60% of a snowed-in drive: the lengths cut are in the save (mk / ms), the hint counts them.
//   B save, reload: the saved marks are there, nothing in memory yet, the hint reads the same share before a metre is
//     cut, and finishing the rest pays at once; the paid drive has no marks left in the save.
//   C new snow on a part-cleared drive (level up by more than BL.rise) wipes the saved marks too: after a reload the
//     old 60% does not count and the last 40% alone pays nothing.
//   D junk in mk / ms does not throw and is not believed (wrong length, letters, NaN); marks on a clear drive are dropped.
//   E DROP and the customer's own shovel (late) leave no marks behind.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__dv = k => TLXPL.drv.list().find(c => c.key === k);
  window.__st = k => { const s = TLX.state("plow").drv[k]; return s ? JSON.parse(JSON.stringify(s)) : null; };
  window.__dput = (k, t) => { const c = __dv(k), d = TLXPL.bladeOf(TLXV.state().cur), yaw = Math.atan2(c.ux, c.uz), x = c.a[0] + c.ux * (t - d.z), z = c.a[1] + c.uz * (t - d.z);
    BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); P.x = x; P.z = z; P.yaw = yaw; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); return true; };
  window.__foot = () => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); for (let k = -5; k <= 3; k += 0.15) bladeSnow(P.x + fx * k + fz * 1.6, P.z + fz * k - fx * 1.6, P.x + fx * k - fz * 1.6, P.z + fz * k + fx * 1.6, 0.15); P.y = surf(P.x, P.z); return true; };
  window.__dpup = (k, t0, t1) => { const dir = t1 >= t0 ? 1 : -1; let t = t0; window.__pupOn = true; __dput(k, t0); __foot();
    const step = () => { t += dir * 0.07; if ((t - t1) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } const c = __dv(k), d = TLXPL.bladeOf(TLXV.state().cur), yaw = Math.atan2(c.ux, c.uz);
      P.x = c.a[0] + c.ux * (t - d.z); P.z = c.a[1] + c.uz * (t - d.z); P.yaw = yaw; P.y = surf(P.x, P.z); P.vx = c.ux * 2.5 * dir; P.vz = c.uz * 2.5 * dir; requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.drv.step(); } return true; };
  window.__storm = h => { const w = WX.at; WX.at = () => 1; __hrs(h); WX.at = w; return true; };
  window.__ask = k => { const c = __dv(k); return TLXPL.drv.mark(c.a[0] + c.ux * c.L / 2, c.a[1] + c.uz * c.L / 2, false); };   // what the hint would be told at the drive's middle, cutting nothing
  return true; })()`;
const pup = async (k, t0, t1) => { await ev(`__dpup(${JSON.stringify(k)}, ${t0}, ${t1})`); for (let i = 0; i < 400 && (await ev("window.__pupOn")); i++) await sleep(100); await sleep(250); };
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).k = ${dn ? 1 : 0}; TLXPL.rt(TLXV.state().cur).last = null; true`);
const ones = s => (typeof s === "string" ? s.split("1").length - 1 : -1);

await boot(); await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 60000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`), U = JSON.stringify(uid);
await ev(`TLX.state("plow").blades[${U}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); TLXV.swapTo(${U}); FOOT.on = false; true`); await sleep(600);
const L = await J(`TLXPL.drv.list().map(c => ({ key: c.key, L: c.L, name: c.name }))`);
const K = L.map(c => c.key), q = i => JSON.stringify(K[i]), N = i => Math.max(1, Math.round(L[i].L));
ok(L.length >= 4, `${L.length} drives to work with`);
await ev(`for (const k of ${JSON.stringify(K.slice(0, 4))}) TLXPL.drv.take(k); __storm(3); __hrs(1); true`);
const back = async () => { await reload(); await ev(SETUP); await sleep(600); await ev(KIT); await ev(`TLXV.swapTo(${U}); FOOT.on = false; true`); await sleep(500); };

let shareA = 0;
await section("A 60% cut: the marks are in the save", async () => {
  const f = await J(`__st(${q(0)})`);
  ok(f && f.s > 0.4 && f.mk === undefined && f.ms === undefined, "an untouched snowed-in drive saves no marks");
  await blade(true); await pup(K[0], -0.4, L[0].L * 0.62); await blade(false);
  const a = await J(`({ st: __st(${q(0)}), ask: __ask(${q(0)}), mem: TLXPL.drv.marks.has(${q(0)}) })`);
  console.log("  ", JSON.stringify(a));
  shareA = a.ask ? a.ask.k : 0;
  ok(a.st && typeof a.st.mk === "string" && a.st.mk.length === N(0) && /^[01]+$/.test(a.st.mk), `mk is one character a metre (${a.st && a.st.mk})`);
  ok(ones(a.st.mk) >= 0.5 * N(0) && ones(a.st.mk) < 0.8 * N(0) && Math.abs(a.st.ms - a.st.s) < 0.02, `over half of it cut, not yet paid; ms is the level it began at (${a.st.ms})`);
  ok(a.ask && Math.abs(a.ask.k - ones(a.st.mk) / N(0)) < 1e-6 && a.st.n === 0, "the hint's share is the saved share; no pay yet");
});

await section("B reload in the middle: the cut lengths still count", async () => {
  const before = await J(`__st(${q(0)})`);
  await ev(`save(); true`); await back();
  const a = await J(`({ st: __st(${q(0)}), mem: TLXPL.drv.marks.has(${q(0)}), cash: GS.cash })`);
  ok(a.st && a.st.mk === before.mk && a.st.ms === before.ms, "after the reload the save still holds the marks (" + (a.st && a.st.mk) + ")");
  ok(a.mem === false, "nothing in memory until the drive is asked about");
  const h = await J(`__ask(${q(0)})`);
  ok(h && Math.abs(h.k - shareA) < 1e-6 && h.k > 0.5, `the hint reads ${Math.round((h ? h.k : 0) * 100)}% done before a metre is cut`);
  await blade(true); await pup(K[0], L[0].L * 0.58, L[0].L + 0.3); await blade(false);
  const b = await J(`({ st: __st(${q(0)}), cash: GS.cash, mem: TLXPL.drv.marks.has(${q(0)}) })`);
  console.log("  ", JSON.stringify(b));
  ok(b.st && b.st.n === 1 && b.cash > a.cash && b.st.s === 0, `finishing the rest pays ($${b.cash - a.cash})`);
  ok(b.st.mk === undefined && b.st.ms === undefined && !b.mem, "a paid drive has no marks left, in the save or in memory");
});

await section("C new snow wipes saved marks", async () => {
  await blade(true); await pup(K[1], -0.4, L[1].L * 0.62); await blade(false);
  const a = await J(`__st(${q(1)})`);
  ok(a && ones(a.mk) >= 0.5 * N(1), "60% of a second drive cut (" + (a && a.mk) + ")");
  await ev(`__storm(1.5); save(); true`); await back();
  const m = await J(`({ st: __st(${q(1)}), cash: GS.cash })`);
  ok(m.st && m.st.s > a.ms + 0.1 && m.st.mk === a.mk, `the snow is up from ${a.ms.toFixed(2)} to ${m.st.s.toFixed(2)}; the save still carries the old marks until someone looks`);
  const h = await J(`({ ask: __ask(${q(1)}), st: __st(${q(1)}) })`);
  ok(h.ask && h.ask.k === 0 && h.st.mk === undefined && h.st.ms === undefined, "asked: 0% done, the filled-in marks are gone from the save");
  await blade(true); await pup(K[1], L[1].L * 0.58, L[1].L + 0.3); await blade(false);
  const b = await J(`({ st: __st(${q(1)}), cash: GS.cash })`);
  ok(b.st && b.st.n === 0 && b.cash === m.cash && ones(b.st.mk) > 0 && ones(b.st.mk) < 0.6 * N(1), `the last 40% alone pays nothing (${b.st && b.st.mk})`);
});

await section("D junk marks", async () => {
  const r = await J(`(() => { try { const s = TLX.state("plow"), a = s.drv[${q(2)}], b = s.drv[${q(3)}], out = {};
    a.mk = "1111111111111111111111111"; a.ms = a.s; out.long = TLXPL.drv.mark(__dv(${q(2)}).a[0] + __dv(${q(2)}).ux * 3, __dv(${q(2)}).a[1] + __dv(${q(2)}).uz * 3, false);
    a.mk = "1".repeat(${N(2)}); a.ms = "x"; out.nan = __ask(${q(2)});
    a.mk = "xyz"; a.ms = NaN; b.mk = 7; b.ms = null; TLXPL.tidy(); out.a = ["mk" in a, "ms" in a]; out.b = ["mk" in b, "ms" in b];
    a.mk = "1".repeat(${N(2)}); a.ms = a.s; const s0 = a.s; a.s = 0; TLXPL.tidy(); out.clear = ["mk" in a, "ms" in a, a.due]; a.s = s0; TLXPL.tidy();
    TABLET.toggle(true, "plow"); out.txt = /NaN|undefined/.test($("tabS").textContent); TABLET.toggle(false); out.n = a.n; out.ok = true; return out; } catch (e) { return { ok: false, e: String(e) }; } })()`);
  console.log("  ", JSON.stringify(r));
  ok(r.ok, "nothing thrown " + (r.e || ""));
  ok(r.long && r.long.k === 0 && r.nan && r.nan.k === 0 && r.n === 0, "marks of the wrong length or with no level are not believed (0% done, no pay)");
  ok(r.a[0] === false && r.a[1] === false && r.b[0] === false && r.b[1] === false, "tidy drops junk marks");
  ok(r.clear[0] === false && r.clear[1] === false && r.clear[2] === 0 && r.txt === false, "marks on a drive with no snow are dropped; the app renders");
});

await section("E dropped or shovelled by its owner: no marks left", async () => {
  await blade(true); await pup(K[2], -0.4, L[2].L * 0.5); await pup(K[3], -0.4, L[3].L * 0.5); await blade(false);
  const a = await J(`({ a: __st(${q(2)}), b: __st(${q(3)}) })`);
  ok(ones(a.a.mk) > 0 && ones(a.b.mk) > 0, "two more drives part cut");
  await ev(`TLXPL.drv.drop(${q(2)}); __hrs(13); true`); await sleep(300);
  const b = await J(`({ a: __st(${q(2)}), b: __st(${q(3)}), ma: TLXPL.drv.marks.has(${q(2)}), mb: TLXPL.drv.marks.has(${q(3)}) })`);
  console.log("  ", JSON.stringify(b));
  ok(b.a === null && !b.ma, "DROP: the drive and its marks are gone");
  ok(b.b && b.b.s === 0 && b.b.miss === 1 && b.b.mk === undefined && b.b.ms === undefined && !b.mb, "left 13 h: shovelled by hand, a miss, no marks kept");
});

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
await done(fails ? 1 : 0);
