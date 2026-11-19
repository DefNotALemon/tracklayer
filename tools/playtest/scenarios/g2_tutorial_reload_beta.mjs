// Beta: first-ride tutorial through real reloads at each stage, and hostile saved tut/tutA/tutB values.
import { boot, ev, tap, sleep, done, reload } from "../lib.mjs";
await boot();
let fails = 0; const ok = (c, m) => { console.log(c ? "ok  " : "FAIL", m); if (!c) fails++; };
const S = async () => JSON.parse(await ev(`JSON.stringify({ stage: TUT.stage, a: TUT.a, b: TUT.b, onFoot: FOOT.on, sledVis: sledRoot.visible,
  claims: GS.claims.filter(j => j.tut).length, load: GS.load.filter(j => j.tut).length, hidden: tutHidden(),
  card: $("tut").hidden ? null : $("tuTitle").textContent, job: $("jobTitle").textContent, cash: GS.cash,
  nan: [P.x, P.z, FOOT.x, FOOT.z].some(v => !Number.isFinite(v)) })`));
// stage 1 (garage open, Collect row) -> reload
await ev(`FOOT.x = garageSite.x + 6; FOOT.z = garageSite.z; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); true`); await sleep(1000);
await tap("KeyT"); await sleep(800);
let s = await S(); console.log("A", JSON.stringify(s));
await reload(); await sleep(1500); s = await S(); console.log("A reload", JSON.stringify(s));
ok(s.stage === 1 && !s.nan, "reload at stage 1: stays 1 (got " + s.stage + ")");
ok(s.hidden && !s.sledVis, "stage 1 reload: sled still hidden");
// collect -> stage 2, reload
await ev(`FOOT.x = garageSite.x + 6; FOOT.z = garageSite.z; recenter(FOOT.x, FOOT.z, true); true`); await sleep(800);
await tap("KeyT"); await sleep(800);
await ev(`(document.querySelector("#garage .row.tutRow")||{click(){}}).click(); true`); await sleep(1500);
s = await S(); console.log("B", JSON.stringify(s)); ok(s.stage === 2 && s.sledVis, "collected: stage 2");
await reload(); await sleep(1500); s = await S(); console.log("B reload", JSON.stringify(s));
ok(s.stage === 2 && s.sledVis && !s.nan, "reload at stage 2: sled visible, stage 2 (got " + s.stage + ")");
// mount -> stage 3 (claim), reload
await ev(`FOOT.x = P.x + 2; FOOT.z = P.z; FOOT.y = surf(FOOT.x, FOOT.z); true`); await sleep(500);
await tap("KeyQ"); for (let i = 0; i < 40 && await ev("FOOT.on"); i++) await sleep(400); await sleep(500);
s = await S(); console.log("C", JSON.stringify(s)); ok(s.stage === 3 && s.claims === 1, "mounted: stage 3, one tut claim");
await reload(); await sleep(1500); s = await S(); console.log("C reload", JSON.stringify(s));
ok(s.stage === 3 && !s.nan, "reload at stage 3 keeps stage (got " + s.stage + ")");
ok(s.claims === 1, "reload at stage 3: exactly one tut claim (got " + s.claims + ")");
// hostile saves
const base = { cash: 0, delivered: 0 };
for (const [nm, p, chk] of [
  ["tut string", { ...base, tut: "2" }, s => s.stage === 0 || s.stage === 99],
  ["tut 7 (out of range)", { ...base, tut: 7 }, s => [0, 1, 2, 3, 4, 99].includes(s.stage)],
  ["tut -1", { ...base, tut: -1 }, s => [0, 1, 2, 3, 4, 99].includes(s.stage)],
  ["tut NaN-ish null + delivered 0", { ...base, tut: null }, s => [0, 99].includes(s.stage)],
  ["stage 3, tutA/B unknown ids", { ...base, tut: 3, tutA: "nowhere", tutB: "void" }, s => s.stage !== 3 || s.claims === 0],
  ["stage 4, tutA/B null", { ...base, tut: 4 }, s => !s.nan],
  ["stage 3, tutA numbers", { ...base, tut: 3, tutA: 5, tutB: {} }, s => !s.nan],
]) {
  await reload(p); await sleep(1500);
  let r; try { r = await S(); } catch (e) { r = null; }
  console.log(nm, JSON.stringify(r));
  ok(r && chk(r), "hostile: " + nm);
  const t = await ev(`(() => { try { tick && 0; } catch (e) {} return true; })()`);
  if (r && r.stage === 3 || r && r.stage === 4) ok(r.claims + r.load >= 1, nm + ": stage " + r.stage + " has a tutorial package (claims " + r.claims + ", load " + r.load + ")");
}
console.log(fails ? fails + " FAILED" : "ALL PASS");
await done(fails ? 1 : 0);
