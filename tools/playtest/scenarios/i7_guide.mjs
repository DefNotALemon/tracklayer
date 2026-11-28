// I7 the Field guide: pages fill in as you meet animals; tracks are in the world and lead to the animal and its den.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 400)); } };
const SETUP = `tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.stormPhase = "calm"; GS.warned = false; GS.warmth = 100; GS.fuel = GS.cap; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXFOLK) TLXFOLK.hold = true; true`;
await boot(); await ev(SETUP); await sleep(1200);
// open fell at noon; the game's own spawner is stopped and one fox group put 300 m off, as the spawner makes them
const pos = await J(`(() => { GS.hour = 100 * 24 + 12; const W = TLX.api.world; let sx = 0, sz = 0; for (let r = 500; r < 3000 && !sx; r += 150) for (let a = 0; a < 6.28; a += 0.4) { const x = W.depot.x + Math.cos(a) * r, z = W.depot.z + Math.sin(a) * r; let good = true; for (let k = 0; k <= 300 && good; k += 30) if (W.isSea(x, z + k) || W.isWater(x, z + k) || W.slopeAt(x, z + k, 6) > 0.3) good = false; if (good && !W.obNear(x, z, 30)) { sx = x; sz = z; break; } }
  FOOT.on = true; FOOT.x = sx; FOOT.z = sz; FOOT.yaw = 0; P.x = sx - 4; P.z = sz; P.vx = P.vz = 0; WILD.max = 0; for (const G of WILD.groups) for (const q of G.m) q.g.visible = false; WILD.groups.length = 0;
  const q = TLX.api.gram.quad.make("fox"); Object.assign(q, { x: sx, z: sz + 300, yaw: 0, v: 0, ox: 0, oz: 0, graze: 0.2, wT: 99 }); q.g.position.set(q.x, W.surf(q.x, q.z), q.z);
  const G = { kind: "fox", sp: null, x: sx, z: sz + 300, yaw: 0, state: "graze", t: 1e9, v: 0, m: [q] }; window.__G = G; window.__held = [G]; const g0 = TLX.api.wild.groups; TLX.api.wild.groups = () => g0().concat(window.__held);
  return { sx, sz, cal: Object.keys(CAL.now()).join(",") + " " + JSON.stringify(CAL.now()).slice(0, 120) }; })()`);
ok(pos.sx !== 0, "open fell found; calendar: " + pos.cal);
await sleep(1500);

await section("A tracks in the world", async () => {
  const t = await J(`(() => { const L = TLXFG.M.paw.list.filter(p => p.kind === "fox"), den = window.__G._den; const ages = L.map(p => GS.hour - p.born); const dG = L.map(p => Math.hypot(p.x - __G.x, p.z - __G.z)); let iN = 0, iF = 0; for (let i = 0; i < L.length; i++) { if (dG[i] < dG[iN]) iN = i; if (dG[i] > dG[iF]) iF = i; }
    return { n: L.length, den: den && { d: Math.hypot(den.x - __G.x, den.z - __G.z), id: den.id }, nearAge: ages[iN], farAge: ages[iF], nearD: dG[iN], farD: dG[iF], farDen: den ? Math.hypot(L[iF].x - den.x, L[iF].z - den.z) : -1, sea: L.filter(p => TLX.api.world.isSea(p.x, p.z)).length, y: Math.max(...L.map(p => Math.abs(p.y - TLX.api.world.surf(p.x, p.z)))), count: TLXFG.M.paw.m.count }; })()`);
  ok(t.n > 30 && t.count === t.n, `the fox already has a trail behind it (${t.n} prints drawn)`);
  ok(t.nearD < 4 && t.nearAge < 0.3 && t.farAge > t.nearAge + 0.5, `fresh at the animal (${t.nearAge.toFixed(2)} h), older further back (${t.farAge.toFixed(1)} h at ${t.farD.toFixed(0)} m)`);
  ok(t.den && t.farDen < 12, `and the trail begins at its den (${t.den ? t.den.d.toFixed(0) : "?"} m from the fox; the oldest print is ${t.farDen.toFixed(1)} m from it)`);
  ok(t.sea === 0 && t.y < 0.1, "prints lie on the snow, none in the sea");
  // the animal moves: new prints behind it
  const n0 = t.n; await ev(`(() => { const q = __G.m[0]; window.__mv = setInterval(() => { q.x += 0.5; __G.x = q.x; q.g.position.set(q.x, TLX.api.world.surf(q.x, q.z), q.z); }, 50); })(); true`); await sleep(2500); await ev(`clearInterval(window.__mv); true`); await sleep(700);
  const m = await J(`(() => { const L = TLXFG.M.paw.list.filter(p => p.kind === "fox" && GS.hour - p.born < 0.04); return { n: L.length, yaw: L.length ? L[L.length - 1].yaw : 0 }; })()`);
  ok(m.n >= 8 && Math.abs(m.yaw - Math.PI / 2) < 0.3, `walking, it leaves new prints pointing the way it went (${m.n} new, heading ${(m.yaw * 57.3).toFixed(0)} degrees)`);
  // reading one
  const rd = await J(`(() => { const L = TLXFG.M.paw.list.filter(p => p.kind === "fox"); let p = L[0]; for (const q of L) if (q.born < p.born) p = q; const mid = L.slice().sort((a, b) => a.born - b.born)[Math.floor(L.length * 0.5)]; FOOT.x = mid.x + 0.4; FOOT.z = mid.z; INP.dev = "kbm"; const u = TLXFG.FOOTX.use(); const hint = u && u.hint(); INP.dev = "pad"; INP.pad = "ps"; const hp = u && u.hint(); INP.dev = "touch"; const ht = u && u.hint(); INP.dev = "kbm"; INP.pad = "xbox"; const r = u && u.act(); return { label: u && u.label, hint, hp, ht, r, yaw: mid.yaw }; })()`);
  ok(rd.label === "TRACKS" && /^E: read the tracks/.test(rd.hint) && !/^E:/.test(rd.hp) && /^tap /.test(rd.ht), `on foot over a print the use control reads it, named per device: ${rd.hint} | ${rd.hp} | ${rd.ht}`);
  ok(rd.r && /Fox tracks/.test(rd.r.text) && /heading (north|south|east|west)/.test(rd.r.text) && rd.r.first, "it says whose, how old and which way: " + (rd.r && rd.r.text));
  ok((await J(`TLX.state("guide").sp.fox.tracks`)) === 1 && (await J(`TLX.state("guide").sp.fox.n`)) === 0, "the tracks are in the guide before you have seen the animal");
  await ev(`(() => { const L = TLXFG.M.paw.list.filter(p => p.kind === "fox").sort((a, b) => b.born - a.born); const p = L[Math.floor(L.length * 0.3)]; FOOT.x = p.x - 2; FOOT.z = p.z - 5; FOOT.yaw = 0.3; })(); true`); await sleep(1200); await shot("guide_tracks", 90);
  // snow covers them
  const s = await J(`(() => { const n0 = TLXFG.M.paw.list.length; WX.at = () => 0.9; GS.storm = 0.9; return n0; })()`); await sleep(700); await ev(`GS.hour += 3; true`); await sleep(1500); const s1 = await J(`TLXFG.M.paw.list.length`); await ev(`WX.at = () => 0; GS.storm = 0; GS.stormPhase = "calm"; true`); await sleep(600);
  ok(s1 < s * 0.3, `three hours of heavy snow covers them (${s} to ${s1})`);
});

await section("B meeting it, its den, the camera", async () => {
  await ev(`(() => { const q = __G.m[0]; FOOT.x = q.x; FOOT.z = q.z - 40; FOOT.yaw = 0; })(); true`); await sleep(2200);
  const r = await J(`TLX.state("guide").sp.fox`);
  ok(r.n === 1 && r.pins.length === 1 && r.hours[4] === 1 && r.months.reduce((a, b) => a + b, 0) === 1 && r.close > 30 && r.close < 50, `seeing it is logged once with where and when, and how close it let you (${r.close} m): ${JSON.stringify(r.areas)}`);
  await sleep(1200); ok((await J(`TLX.state("guide").sp.fox.n`)) === 1, "the same animal is not counted twice");
  const c0 = await J(`TLXFG.count()`); ok(c0.seen === 1 && c0.all >= 14, `the count: ${c0.seen} of ${c0.all} (mammals and fish)`);
  const den = await J(`(() => { const d = __G._den; FOOT.x = d.x + 30; FOOT.z = d.z; return { id: d.id, x: d.x, z: d.z }; })()`); await sleep(1300);
  const vis = await J(`(() => { const d = TLXFG.dens.find(q => q.id === "${den.id}"); return { shown: !!d, found: !!TLX.state("guide").dens["${den.id}"] }; })()`); ok(vis.shown && !vis.found, "its den is there in the world, not yet found from 30 m");
  await ev(`FOOT.x = ${den.x} + 3.5; FOOT.z = ${den.z} + 3.5; FOOT.yaw = -2.4; true`); await sleep(1400);
  ok(!!(await J(`TLX.state("guide").dens["${den.id}"] || null`)), "walk up to it and it is found and pinned"); await shot("guide_den", 90);
  // a photo files itself on the page
  await ev(`(() => { const q = __G.m[0]; FOOT.x = q.x; FOOT.z = q.z - 12; FOOT.yaw = 0; })(); true`); await sleep(600);
  await ev(`TLXCAM.open(); TLXCAM.zoom = 2.5; TLXCAM.aimAt(__G.m[0].x, TLX.api.world.surf(__G.m[0].x, __G.m[0].z) + 0.25, __G.m[0].z); true`); await sleep(500); const ph = await J(`(() => { const p = TLXCAM.shoot(); TLXCAM.close(); return p && { kind: p.kind, score: p.score }; })()`);
  const pg = await J(`TLX.state("guide").sp.fox.photo && { score: TLX.state("guide").sp.fox.photo.score, img: TLX.state("guide").sp.fox.photo.img.length }`);
  ok(ph && ph.kind === "fox" && pg && pg.score === ph.score && pg.img > 2000, `a photograph of it becomes the page's picture (score ${ph && ph.score})`);
});

await section("C the app, and the save", async () => {
  await ev(`TLX.api.TABLET.toggle(true, "guide"); true`); await sleep(700);
  const a = await J(`(() => { const el = document.getElementById("tabS"); return { txt: el.innerText, cards: el.querySelectorAll("[data-tf^='fg:']").length, fish: el.querySelectorAll("[data-tf^='fgf:']").length, q: (el.innerText.match(/\\? \\? \\?/g) || []).length }; })()`);
  ok(a.cards === 7 && a.fish >= 7 && /Fox/.test(a.txt) && !/Moose/.test(a.txt) && a.q >= 6, `the list: ${a.cards} mammals and ${a.fish} fish, the ones not met are not named`);
  await shot("guide_list", 90);
  await ev(`document.querySelector("#tabS [data-act='fg:fox']").click(); true`); await sleep(600);
  const p = await J(`(() => { const el = document.getElementById("tabS"), cv = el.querySelector("[data-fgmap]"); let px = 0; if (cv) { const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] > 240 && d[i + 1] > 100 && d[i + 1] < 140 && d[i + 2] < 80) px++; } return { txt: el.innerText, map: !!cv, px, img: /url\\(/.test(el.innerHTML), back: !!el.querySelector("[data-act='fg:']") }; })()`);
  ok(/Fox/.test(p.txt) && /rev/.test(p.txt) && /Eats/.test(p.txt) && /How close/.test(p.txt) && /Tracks/i.test(p.txt) && /straight line/.test(p.txt) && /earth/i.test(p.txt) && /1 found/.test(p.txt), "the fox's page: what it is, what it eats, how close, its tracks, its earth");
  ok(p.map && p.px > 8 && p.img, `with your photograph and a map with the pins on it (${p.px} orange pixels)`);
  await shot("guide_page", 90);
  await ev(`document.querySelector("#tabS [data-act='fg:']").click(); true`); await sleep(400); ok((await ev(`TLXFG.page`)) === "", "back to the list");
  await ev(`TLX.api.TABLET.toggle(true, "paths"); true`); await sleep(500); ok(/1 of \d+ animals in the field guide/.test(await ev(`document.getElementById("tabS").innerText`)), "the Paths app's village line counts it");
  await ev(`TLX.api.TABLET.close(true); save(); true`); await reload(); await ev(SETUP); await sleep(900);
  const s2 = await J(`({ fox: TLX.state("guide").sp.fox, dens: Object.keys(TLX.state("guide").dens).length })`);
  ok(s2.fox && s2.fox.n === 1 && s2.fox.tracks === 1 && s2.fox.photo && s2.dens === 1, "sightings, tracks, the photograph and the den are in the save");
  ok(!(await ev(`TLXFG.err`)), "no error: " + (await ev(`TLXFG.err`)));
});
console.log(fails ? `FAILS: ${fails}` : "all passed");
await done(fails ? 1 : 0);
