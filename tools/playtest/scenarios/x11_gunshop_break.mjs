// Beta break test for 11.1a gun shop: planted saves (corrupt guns entry, old save) must load with TLXGUN alive.
import { boot, ev, sleep, done, reload, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); true`); await sleep(300);
const mk = async (mut) => J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); const g = (s.x.sys.guns = s.x.sys.guns || {}); g.s = ${mut}; return s; })()`);
await ev(`save(); true`);
const variants = {
  "baseline-corrupt": `{ owned: [{ frame: "bolt308", parts: { sight: "laser", barrel: 7 }, rounds: 99 }, { frame: "nope" }, null], cur: 9, parts: { "sight:laser": 1, "barrel:std22": 1 }, ammo: "lots", licence: "yes" }`,
  "proto-key": `JSON.parse('{"owned":[],"cur":-1,"parts":{"__proto__":1,"sight:scope39":1},"ammo":0,"licence":false}')`,
  "parts-array": `{ owned: [], cur: -1, parts: [1,2], ammo: 5, licence: true }`,
  "owned-object": `{ owned: { a: 1 }, cur: "x", parts: null, ammo: -5, licence: 1 }`,
  "null-state": `null`,
  "string-state": `"junk"`,
  "nan-ammo": `{ owned: [{ frame: "bolt308", parts: null, rounds: "x" }], cur: NaN, parts: {}, ammo: 1e99, licence: true }`,
};
for (const [name, mut] of Object.entries(variants)) {
  const plant = await mk(mut);
  errors.length = 0;
  await reload(plant); await sleep(700);
  const alive = await ev(`typeof TLXGUN !== "undefined" && !!TLXGUN.shop.b`).catch(e => "ERR " + e.message.slice(0, 200));
  const st = alive === true ? await J(`(() => { const s = TLXGUN.state(); return { n: s.owned.length, cur: s.cur, ammo: s.ammo, lic: s.licence }; })()`) : null;
  console.log(name, alive, JSON.stringify(st), errors.slice(0, 2).join(" || "));
  ok(alive === true && !errors.length, name + ": loads clean");
}
await done(fails ? 1 : 0);
