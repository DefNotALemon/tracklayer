// Village house types (KIT.HT, KIT.house, KIT.village). Asserts, exit 1 on a failure. Stills in $OUT (xH_*.jpg); NOSTILLS=1 skips them.
//  A. five types exist, with different pitches (steep 35-45 deg ... low 25-30 deg), paint schemes and trim colours
//  B. every village deals its houses different types: neighbours never match, and when the village has <= 5 houses all differ
//  C. across the map every type shows up, with extras: porches, garages/sheds, woodpiles, flagstaffs, shutters, 1/2/4-window patterns
//  D. the typed houses' footprints sit inside the Finnmark ranges (4-12 m wide, 4-8 m deep, 2.5-4 m walls), chimneys vary in height
//  E. rough stone foundations are merged (a handful of meshes per house, not one per block): draw calls at a village stay sane
//  F. stills of three villages and one close-up per type; the town's own houses (no type) keep the original look
import { boot, ev, sleep, shot, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 36; true`);

// A
const A = await J(`KIT.HT.map(t => ({ id: t.id, a: t.a, scheme: t.scheme, trim: t.trim.color.getHex(), roof: t.roof.color.getHex(), wins: t.wins, deg: t.a * 180 / Math.PI }))`);
console.log("A", JSON.stringify(A.map(t => t.id + ":" + t.deg.toFixed(0) + "deg")));
ok(A.length === 5 && new Set(A.map(t => t.id)).size === 5, "A: five house types");
ok(new Set(A.map(t => t.scheme)).size === 5 && new Set(A.map(t => t.a)).size >= 4, "A: five paint schemes, at least four different pitches");
const deg = id => A.find(t => t.id === id).deg;
ok(deg("blue") >= 35 && deg("blue") <= 40 && deg("white") >= 35 && deg("white") <= 45 && deg("ochre") >= 25 && deg("ochre") <= 30 && deg("red") >= 30 && deg("red") <= 35, "A: blue 35-40, red 30-35, ochre 25-30, white 35-45 degrees");
ok(new Set(A.map(t => t.trim)).size >= 3 && new Set(A.map(t => t.wins)).size >= 3, "A: trim colours and window patterns differ between types");
const tex = await J(`KIT.HT.map(t => { const m = KIT.typeClad(t); return { map: !!m.map, w: m.map.image.width }; })`);
ok(tex.every(t => t.map && t.w === 256), "A: each type has its own canvas cladding texture");

// B, F
const V = await J(`KIT.vlog.map(v => ({ site: v.site, types: v.types }))`);
console.log("B", JSON.stringify(V));
const withHouses = V.filter(v => v.types.length >= 2);
ok(V.length >= 3 && withHouses.length >= 3, "B: " + V.length + " villages built, " + withHouses.length + " with 2+ houses");
const bad = V.filter(v => v.types.some((t, i) => i && t === v.types[i - 1]) || (v.types.length > 1 && v.types.length <= 5 && new Set(v.types).size !== v.types.length) || (v.types.length > 2 && v.types[0] === v.types[v.types.length - 1]));
ok(bad.length === 0, "B: no two neighbouring houses share a type" + (bad.length ? " (" + JSON.stringify(bad) + ")" : ""));
const types = await J(`[...new Set(KIT.foot.map(f => f.type).filter(Boolean))]`);
ok(types.length === 5, "C: all five types are standing somewhere on the map: " + types.join(","));

// C, D
const H = await J(`KIT.foot.filter(f => f.type).map(f => ({ type: f.type, x: f.x, z: f.z, ry: f.ry, w: f.w, d: f.d, ex: f.ex }))`);
const any = k => H.some(f => f.ex[k]);
console.log("C", JSON.stringify({ n: H.length, porch: H.filter(f => f.ex.porch).length, garage: H.filter(f => f.ex.garage === "garage").length, shed: H.filter(f => f.ex.garage === "shed").length, wood: H.filter(f => f.ex.wood).length, flag: H.filter(f => f.ex.flag).length, shut: H.filter(f => f.ex.shutters).length }));
ok(H.length >= 10, "C: " + H.length + " typed village houses");
ok(any("porch") && H.some(f => f.ex.garage === "garage") && H.some(f => f.ex.garage === "shed") && any("wood") && any("flag") && any("shutters"), "C: porches, garages, sheds, woodpiles, flagstaffs and shutters all appear");
ok(new Set(H.map(f => f.ex.wins)).size >= 3, "C: window counts vary between houses (" + [...new Set(H.map(f => f.ex.wins))].sort((a, b) => a - b).join("/") + ")");
ok(H.every(f => f.w >= 4 && f.w <= 12 && f.d >= 4 && f.d <= 8 && f.ex.h >= 2.5 && f.ex.h <= 4), "D: every footprint 4-12 x 4-8 m, walls 2.5-4 m");
const ch = [...new Set(H.map(f => f.ex.chTop))];
ok(ch.length >= 6 && Math.max(...ch) - Math.min(...ch) > 0.6, "D: chimney heights vary (" + Math.min(...ch) + "-" + Math.max(...ch) + " m over the wall, " + ch.length + " distinct)");
ok(H.every(f => f.ex.stones > 30), "D: every typed house has a rough stone foundation (" + Math.min(...H.map(f => f.ex.stones)) + "+ blocks)");
const HC = await J(`({ old: KIT.foot.filter(f => !f.type).length })`);
ok(HC.old > 0, "F: the town's own houses (" + HC.old + ") keep the untyped original look");

// E: pick the village with the most houses, stand beside it, count draw calls and house-group meshes
const vil = await J(`(() => { let best = null; for (const s of SITES.filter(s => s.kind === "village")) { const n = KIT.foot.filter(f => f.type && Math.hypot(f.x - s.x, f.z - s.z) < 50).length; if (!best || n > best.n) best = { id: s.id, x: s.x, z: s.z, n }; } return best; })()`);
console.log("E village", JSON.stringify(vil));
const where = async (x, z, h, dist, ry, yawOff = 0, up = 3.4, at = 2) => {   // camera in front of a house (door side), looking at it
  await ev(`(() => { const x = ${x}, z = ${z}; P.x = x + 14; P.z = z + 14; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0; recenter(x, z, true); FOOT.on = false; return true; })()`);
  await ev(`if (!window.__camHk) { window.__camHk = true; const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; }
    window.camOv = c => { const a = ${ry} + ${yawOff}; const gy = surf(${x}, ${z}); c.position.set(${x} + Math.sin(a) * ${dist}, gy + ${up}, ${z} + Math.cos(a) * ${dist}); c.lookAt(${x}, gy + ${at}, ${z}); c.updateMatrixWorld(); }; true`);
  await sleep(1500);
};
const first = H.find(f => Math.hypot(f.x - vil.x, f.z - vil.z) < 50);
await where(first.x, first.z, 0, 14, first.ry, 0.5);
const E = await J(`({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles })`);
console.log("E", JSON.stringify(E));
ok(E.calls < 900, "E: " + E.calls + " draw calls at a village (< 900)");
const meshes = await J(`(() => { let n = 0; scene.traverse(o => { if (o.isMesh && o.name === "kitBaked") n++; }); return n; })()`);
console.log("E baked kit meshes:", meshes);

// G stills
if (!process.env.NOSTILLS) {
  const villages = V.filter(v => v.types.length >= 3).slice(0, 3);
  let vi = 0;
  for (const v of villages) {
    const s = await J(`(() => { const s = SITES.find(s => s.id === "${v.site}"); return { x: s.x, z: s.z }; })()`);
    const hs = H.filter(f => Math.hypot(f.x - s.x, f.z - s.z) < 50);
    if (!hs.length) continue;
    await ev(`(() => { P.x = ${s.x} - 8; P.z = ${s.z} + 40; P.y = surf(P.x, P.z) + 0.3; recenter(${s.x}, ${s.z}, true); true })()`);
    await ev(`window.camOv = c => { const gy = surf(${s.x}, ${s.z}); c.position.set(${s.x} + 6, gy + 34, ${s.z} + 60); c.lookAt(${s.x}, gy + 0, ${s.z}); c.updateMatrixWorld(); }; true`);
    await sleep(1800); await shot("xH_village" + (++vi) + "_" + v.site);
  }
  for (const t of types) {
    const f = H.find(f => f.type === t);
    await where(f.x, f.z, 0, f.d / 2 + 9, f.ry, 0.55, 2.6, 2.2);
    await shot("xH_type_" + t);
  }
  await ev(`window.camOv = null; true`);
}
await done(fails ? 1 : 0);
