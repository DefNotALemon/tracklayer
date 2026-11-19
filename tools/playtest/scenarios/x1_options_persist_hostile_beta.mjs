// Beta 1.x: option switches persist through a reload, unknown ids are inert, hostile x blocks load without throwing.
import { boot, ev, sleep, reload, done, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); true`); await sleep(500);
const ids = await J(`TLX.options.map(o => o.id)`);
console.log("options:", ids.length);
ok(ids.length > 10, "options registered: " + ids.length);
ok(await J(`${JSON.stringify(ids)}.every(i => TLX.on(i) === TLX.options.find(o => o.id === i).def)`), "fresh game: every option at its default");
// flip every option, save, reload
await ev(`(() => { for (const o of TLX.options) TLX.setOn(o.id, !o.def); return true; })()`);
const flipped = await J(`Object.fromEntries(TLX.options.map(o => [o.id, TLX.on(o.id)]))`);
await ev(`save && save(); true`); await sleep(500);
await reload();
await sleep(1500);
const after = await J(`Object.fromEntries(TLX.options.map(o => [o.id, TLX.on(o.id)]))`);
const diff = Object.keys(flipped).filter(k => after[k] !== flipped[k]);
ok(diff.length === 0, "all flipped options survive reload (diff: " + diff.join(",") + ")");
// unknown ids inert
const un = await J(`(() => { TLX.setOn("nope_xyz", true); return [TLX.on("nope_xyz"), TLX.dump().opt.nope_xyz]; })()`);
ok(un[0] === false && un[1] == null, "unknown id: off and not saved " + JSON.stringify(un));
// hostile x variants
const hostile = [null, 5, "str", [], { opt: "x", sys: 7 }, { opt: { traffic: "no", police: 0, convoy: null }, sys: { vehicles: 12, roads: [] } }, { region: 42, opt: [true], sys: [1] }, { v: 999, region: "mars", opt: { traffic: false }, sys: { zzz: { v: 1, s: {} } } }];
let i = 0;
for (const x of hostile) {
  const base = JSON.parse(await ev(`JSON.stringify((() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2") || "null"); return s; })())`));
  if (!base) { ok(false, "no base save"); break; }
  base.x = x;
  await reload(base); await sleep(1200);
  const r = await J(`({ mode: TT.mode, tr: TLX.on("traffic"), pol: TLX.on("police"), sys: !!TLX.state("vehicles"), region: TLX.region(), dump: !!TLX.dump() })`);
  ok(r.sys && r.dump, `hostile x #${i} (${JSON.stringify(x)}): loads, ${JSON.stringify(r)}`);
  i++;
}
ok(errors.length === 0, "page errors: " + (errors.length ? errors.slice(0, 3).join(" | ") : "none"));
await done(fails ? 1 : 0);
