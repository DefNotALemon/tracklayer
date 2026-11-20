// 4.2 Monday statements (beta 0279 #1 / 0356 #1): the Plow app keeps WHOLE weeks on file (the last three), not six lines.
//   A  every road + a drive + a lot held: a week writes N+2 lines and all of them show
//   B  four Mondays: three whole weeks on file, the oldest gone whole, no orphan line; the order inside a week
//   C  a week with only the drives' line still counts as a week
//   D  reload keeps the file as it was
//   E  saves: an old six-line file loads as it is; a damaged 400-line file is cut to whole weeks and the cap
// Asserts, exit 1. Stills: the Statements list (OUT).
import { boot, ev, sleep, done, reload, shot, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
await boot();
await ev(SETUP); await sleep(600);
await ev(`GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); true`);
const roads = (await J(`TLXPL.con.routes().map(r => r.id)`)).slice(0, 5);
console.log("roads", JSON.stringify(roads));
const rows = async () => { await ev(`TABLET.toggle(true, "plow"); true`); await sleep(500); return J(`[...document.querySelectorAll("#tabS .tsm2")].map(e => e.textContent)`); };
const file = () => J(`TLX.state("plow").conLast.map(q => [q.d, q.road])`);
const week = async (label, pay, what = "cdl") => {
  await ev(`(() => { const s = TLX.state("plow"); for (const k of Object.keys(s.con)) { s.con[k].wk = ${pay}; s.con[k].wkM = 800; } for (const k of Object.keys(s.drv)) { s.drv[k].wk = 33; s.drv[k].n = 1; } for (const k of Object.keys(s.lot)) { s.lot[k].wk = 90; s.lot[k].n = 1; } return true; })()`);
  const L = JSON.stringify({ label });
  await ev(`${what.includes("c") ? `TLXPL.con.monday(${L});` : ""} ${what.includes("d") ? `TLXPL.drv.monday(${L});` : ""} ${what.includes("l") ? `TLXPL.lot.monday(${L});` : ""} true`);
};
let N = 0, names = [];
await section("A everything held, one Monday", async () => {
  for (const id of roads) await ev(`TLXPL.con.sign(${JSON.stringify(id)}); true`);
  const drv = await J(`(() => { const c = TLXPL.drv.list()[0]; return c && c.key; })()`), lot = await J(`(() => { const c = TLXPL.lot.list()[0]; return c && c.id; })()`);
  await ev(`TLXPL.drv.take(${JSON.stringify(drv)}); TLXPL.lot.take(${JSON.stringify(lot)}); true`);
  names = await J(`Object.values(TLX.state("plow").con).map(c => c.name)`);
  N = names.length + 2;
  ok(names.length >= 3, "at least three roads held: " + names.length + " (a week writes " + N + " lines)");
  ok(2 * N > 6, "two weeks are more lines than the old cap of six: " + 2 * N);
  await week("Mon 4 Jan", 100);
  const st = await rows(); console.log("  week 1:", JSON.stringify(st));
  ok(st.length === N, "week 1 shows all " + N + " lines: " + st.length);
  ok(names.every((n, i) => st[i] && st[i].includes(n)), "roads first, in the order they were signed");
  ok(/Driveways/.test(st[N - 2] || "") && /Lots/.test(st[N - 1] || ""), "then the drives, then the lots");
});
await section("B four Mondays", async () => {
  await week("Mon 11 Jan", 200);
  let st = await rows();
  ok(st.length === 2 * N, "two weeks: " + st.length + " lines of " + 2 * N);
  ok(st.filter(t => t.includes("4 Jan")).length === N, "week 1 whole after week 2");
  ok(st.slice(0, N).every(t => t.includes("11 Jan")), "the newest week is on top");
  await week("Mon 18 Jan", 300);
  st = await rows();
  ok(st.length === 3 * N, "three weeks: " + st.length + " lines of " + 3 * N);
  await week("Mon 25 Jan", 400);
  st = await rows(); console.log("  after 4:", st.length, "lines; first", JSON.stringify(st[0]), "last", JSON.stringify(st[st.length - 1]));
  ok(st.length === 3 * N, "four Mondays leave three weeks: " + st.length + " lines");
  ok(!st.some(t => t.includes("Mon 4 Jan")), "the oldest week is gone whole, no orphan line");
  for (const d of ["11 Jan", "18 Jan", "25 Jan"]) ok(st.filter(t => t.includes(d)).length === N, d + " is whole");
  const labels = st.map(t => (t.match(/Mon \d+ Jan/) || [""])[0]), runs = labels.filter((d, i) => i === 0 || d !== labels[i - 1]);
  ok(runs.join("|") === "Mon 25 Jan|Mon 18 Jan|Mon 11 Jan", "weeks newest first, each in one block: " + runs.join(" | "));
  for (let w = 0; w < 3; w++) { const b = st.slice(w * N, w * N + N); ok(names.every((n, i) => b[i].includes(n)) && /Driveways/.test(b[N - 2]) && /Lots/.test(b[N - 1]), "block " + (w + 1) + " reads roads, drives, lots"); }
  ok(/\+\$400/.test(st[0]) && /\+\$33/.test(st[N - 2]) && /\+\$90/.test(st[N - 1]), "the pay on the lines is the week's");
  const f = await file(); ok(f.length === 3 * N, "the saved file holds the same " + f.length + " lines");
  await shot("statements_3weeks");
  await ev(`(() => { const e = document.querySelector("#tabS .tsml2"); if (e) e.scrollIntoView({ block: "start" }); return true; })()`); await sleep(300);
  await shot("statements_list");
});
await section("C a week with one line is still a week", async () => {
  await week("Mon 1 Feb", 0, "d");
  const st = await rows();
  ok(st.length === 2 * N + 1, "drives only this Monday: " + st.length + " lines of " + (2 * N + 1));
  ok(/1 Feb/.test(st[0]) && /Driveways/.test(st[0]), "its one line is on top");
  ok(!st.some(t => t.includes("11 Jan")) && st.filter(t => t.includes("18 Jan")).length === N, "11 Jan gone whole, 18 Jan whole");
});
await section("D reload", async () => {
  const before = await file();
  await reload(); await ev(SETUP); await sleep(800);
  const after = await file();
  ok(JSON.stringify(before) === JSON.stringify(after), "the file is the same after a reload: " + after.length + " lines");
  const st = await rows(); ok(st.length === after.length, "and the app shows it: " + st.length);
});
const plant = async f => { await ev(`(() => { const s = TLX.state("plow"); ${f}; save(); return true; })()`); const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`); await reload(sv); await ev(SETUP); await sleep(800); };
await section("E old and damaged saves", async () => {
  const e0 = errors.length;
  await plant(`s.conLast = [0, 1, 2, 3, 4, 5].map(i => ({ d: i < 4 ? "Mon 7 Dec" : "Mon 30 Nov", road: "R" + i, pay: 10 + i, m: 400, w: 0 }))`);
  let f = await file(); console.log("  old six:", JSON.stringify(f));
  ok(f.length === 6 && f[0][1] === "R0" && f[5][1] === "R5", "an old six-line file loads as it was");
  let st = await rows(); ok(st.length === 6 && st[0].includes("R3") && st[3].includes("R0") && st[4].includes("R5"), "and shows by week: " + JSON.stringify(st.map(t => (t.match(/R\d/) || [""])[0])));
  await plant(`s.conLast = [{ road: "no date", pay: 5 }, { road: "no date 2", pay: 5 }, { d: "Mon 7 Dec", road: "A", pay: 1 }]`);
  f = await file(); ok(f.length === 3, "lines without a date are kept as one week: " + f.length);
  st = await rows(); ok(st.length === 3, "and shown: " + st.length);
  await plant(`s.conLast = []; for (let i = 0; i < 400; i++) s.conLast.push({ d: "W" + Math.floor(i / 50), road: "R" + i, pay: 1, m: 1, w: 0 }); s.conLast.splice(3, 0, null, "x", 7, [])`);
  f = await file(); console.log("  damaged:", f.length, "lines, weeks", JSON.stringify([...new Set(f.map(q => q[0]))]));
  ok(f.length === 90, "a 400-line file is cut to the cap: " + f.length);
  ok(new Set(f.map(q => q[0])).size <= 3 && f[0][0] === "W0", "at most three weeks of it, the newest first");
  st = await rows(); ok(st.length === 90, "the app draws it: " + st.length);
  await week("Mon 8 Feb", 50);
  f = await file(); ok(f.length <= 90 && f[0][0] === "Mon 8 Feb", "a Monday on top of it still writes: " + f.length + " lines, top " + f[0][0]);
  ok(errors.length === e0, "no page errors: " + errors.slice(e0).join(" | ").slice(0, 200));
});
await done(fails);
