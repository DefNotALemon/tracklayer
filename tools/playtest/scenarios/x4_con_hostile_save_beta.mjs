// Beta, 4.2a road contracts: hostile SAVED con / conRec / conBan state planted through a real reload.
//   strikes huge/negative/string, due with NaN/short/garbage keys, unknown road ids, cover on a road with no snow, conLast junk.
import { boot, ev, sleep, done, reload, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
await boot();
await ev(SETUP); await sleep(500);
const ids = await J(`TLXR.routes.filter(r => !r.closed && !r.convoy && r.seg).map(r => r.id)`);
console.log("roads", JSON.stringify(ids));
const A = ids.find(i => /dyfjord/.test(i)) || ids[0], B = ids.find(i => /gamvik/.test(i)) || ids[1];
const mkSave = async f => { await ev(`(() => { const s = TLX.state("plow"); s.con = {}; s.conRec = {}; s.conBan = {}; s.blades = s.blades || {}; ${f}; save(); return true; })()`); return J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`); };
const cases = {
  strikesHuge: `s.con.${A} = { name: "x", strikes: 99, wk: 0, wkM: 0, clean: true, due: {} }`,
  strikesNeg: `s.con.${A} = { name: "x", strikes: -5, wk: -9, wkM: -9, clean: false, due: {} }`,
  strikesStr: `s.con.${A} = { name: 7, strikes: "2", wk: "1", wkM: "x", due: [] }`,
  dueGarbage: `s.con.${A} = { name: "x", strikes: 1, due: { "0": [null, 1], "1": "no", "999": [5, 1], "2": [NaN, 0], "3": [-4, 1], "-1": [1e12, 1] } }`,
  recGarbage: `s.conRec.${A} = { strikes: 50, due: { "0": [1e9, 1], "7": [2], "q": null } }; s.conRec.nope = { strikes: 1, due: {} }; s.conRec.${B} = 5; s.conRec.zz = []`,
  conAndRec: `s.con.${A} = { name: "x", strikes: 1, due: {} }; s.conRec.${A} = { strikes: 2, due: { "0": [3, 1] } }`,
  banJunk: `s.conBan.${A} = "x"; s.conBan.${B} = 1e15; s.conBan.nope = 3; s.conLast = [1, null, "a", { a: 1 }, {}, {}, {}, {}, {}]; s.conPaid = "lots"; s.conH = "now"`,
  unknownRoad: `s.con.atlantis = { name: "A", strikes: 0, due: { "0": [1, 1] } }; s.con.${A} = null`,
  coverNoSnow: `s.con.${A} = { name: "x", strikes: 0, cover: true, due: { "0": [1, 1] } }`,
};
for (const [name, f] of Object.entries(cases)) {
  const save = await mkSave(f);
  const e0 = errors.length;
  await reload(save); await ev(SETUP); await sleep(900);
  const r = await J(`(() => { const o = { thrown: null }; try { const s = TLX.state("plow"); TLXPL.con.step(); TABLET.toggle(true, "plow"); jobsList(); o.con = JSON.parse(JSON.stringify(s.con)); o.rec = JSON.parse(JSON.stringify(s.conRec)); o.ban = JSON.parse(JSON.stringify(s.conBan)); o.jobs = jobsList().filter(r => r.kind === "plowcon").length; o.hold = TLXR.hold(${JSON.stringify(A)}); } catch (e) { o.thrown = String(e && e.stack || e).slice(0, 300); } return o; })()`);
  await sleep(500);
  const txt = await ev(`$("tabS").textContent`);
  const bad = [];
  for (const [id, c] of Object.entries(r.con || {})) { if (!(Number.isInteger(c.strikes) && c.strikes >= 0 && c.strikes <= 2)) bad.push("strikes " + id + "=" + c.strikes); for (const [k, d] of Object.entries(c.due || {})) if (!Number.isFinite(d[0]) || d[0] < 0) bad.push("due " + id + k); }
  for (const [id, q] of Object.entries(r.rec || {})) { if (!(Number.isInteger(q.strikes) && q.strikes >= 0 && q.strikes <= 2)) bad.push("rec " + id + "=" + q.strikes); }
  const unknown = Object.keys(r.con || {}).filter(i => !ids.includes(i));
  console.log("  ", name, "con", JSON.stringify(r.con), "rec", JSON.stringify(r.rec), "ban", JSON.stringify(r.ban), "jobs", r.jobs, "hold", r.hold);
  ok(!r.thrown && errors.length === e0 && !bad.length && !/NaN|undefined|\[object|Infinity/.test(txt), `${name}: loads, no throw/page error, state sane, app text clean` + (r.thrown ? " " + r.thrown : "") + (bad.length ? " BAD " + bad.join(",") : "") + (errors.length > e0 ? " " + JSON.stringify(errors.slice(e0, e0 + 2)).slice(0, 300) : ""));
  if (unknown.length) console.log("  note: unknown road ids kept in con:", unknown.join(","));
  await ev(`TABLET.toggle(false); true`);
}
// a held contract with a planted state must still sign off cleanly and be signable again
console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
