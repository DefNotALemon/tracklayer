// Goal G7 slice H1a: the news bus (tlx-news.js) and the ski trails (tlx-trails.js): routes, furniture, the track, the Løyper app.
// Asserts, exit 1 on a failure.
//   A the news bus: post / since / near / on, the ring caps at 240; the roll: families in real houses (a household per lit door, one home
//     per person, a family shares a surname, each village its own character, the game's own names reused, identical across two boots)
//   B the trails: 6 to 8, every point on land and clear of houses and lakes, grades by distance along the line, loops close,
//     lengths, not along a road (crossings only); the route dump + plot (OUT/h1_routes.png)
//   C furniture: a board per trail, poles every 50 m, lamps on Lysløypa, a gapahuk at each turløype's far end, few draw calls, standing on the snow
//   D taking a trail on: refused without the rank or the groomer (and says why), allowed with both
//   E the track: the drag along a segment sets it (the real tow path); riding it without the drag does not; a sled pass wears it
//   F new snow: a few cm softens, 12 cm buries it; a thaw and a refreeze make it icy; a hard frost after grooming lasts longer
//   G a week: a kept good trail is skied more than a worn one, an untaken one not at all; the week's pay and the statement; the Jobs row
//   H state survives reload(); a save with no x.sys.trails / news loads clean; the app's text under keyboard, pad and touch
//   I snow-free seasons: closed, no visits, the board and the app say so
// Stills (OUT): the trailhead board, the pole line, a gapahuk, the lamps, the Løyper app, the Map.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
import fs from "fs";
import cp from "child_process";
import path from "path";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const still = async name => { if (!NOSTILLS) await shot(name); };
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 400)); } };
const OUT = process.env.OUT || "./shots";

const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); TLXSK.hold = true; true`;
const KIT = `(() => {
  window.__T = id => TLXSK.list.find(t => t.id === id);
  window.__setAll = id => { const t = __T(id); t.st.seg.forEach((g, i) => TLXSK.setSeg(t, i, 2.4)); return true; };
  window.__rider = { step: null };
  window.__camHk = window.__camHk || (() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; return true; })();
  // the sled in place on a trail line, at a pace (the puppet pattern of x4_bladeroad: P is carried, the real tow and tick do the rest)
  window.__pup = (id, s0, s1, v) => { const t = __T(id), dir = s1 >= s0 ? 1 : -1; let s = s0; window.__pupOn = true; BOG.on = false; BOG.acc = 0; BOG.immune = 99; FOOT.on = false; crashCancel();
    const put = () => { const a = TLXSK.at(t, s); P.x = a.x; P.z = a.z; P.yaw = Math.atan2(a.tx * dir, a.tz * dir); P.vx = Math.sin(P.yaw) * v; P.vz = Math.cos(P.yaw) * v; P.vy = 0; P.y = surf(a.x, a.z) + 0.05; };
    put(); recenter(P.x, P.z, true);
    const step = () => { s += dir * v * 0.03; if ((s - s1) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } put(); requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  return true; })()`;
const pup = async (id, s0, s1, v) => { await ev(`__pup(${JSON.stringify(id)}, ${s0}, ${s1}, ${v})`); for (let k = 0; k < 900 && (await ev("window.__pupOn")); k++) await sleep(100); await sleep(300); };
// n game hours on, one at a time; keep(): called each morning at 08:00 with the trail ids to set again
const hours = (n, keep = []) => ev(`(() => { for (let i = 0; i < ${n}; i++) { GS.hour += 1; TLXSK.catchUp(); if (Math.floor(GS.hour % 24) === 8) for (const id of ${JSON.stringify(keep)}) __setAll(id); } return true; })()`);

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; true`); await sleep(300);
let trails = [], sig0 = "";

await section("A the news bus", async () => {
  let a = await J(`({ ready: TLXN.ready, n: TLXN.people.length, ring: TLX.state("news").posts.length, vill: TLXN.villages().map(v => v.id),
    names: TLXN.people.slice(0, 16).map(p => p.first), drv: (window.TLXPL && TLXPL.DRV ? TLXPL.DRV.names : []), p0: TLXN.people[0], fields: TLXN.people.every(p => p.id && p.name && p.age > 0 && p.home && p.handle && p.interests.length >= 2 && p.interests.length <= 3 && p.voice),
    ski: TLXN.people.filter(p => p.interests.includes("ski")).length, homes: [...new Set(TLXN.people.map(p => p.home))], dup: TLXN.people.length - new Set(TLXN.people.map(p => p.name)).size, hdup: TLXN.people.length - new Set(TLXN.people.map(p => p.handle)).size })`);
  console.log("  ", JSON.stringify({ n: a.n, ski: a.ski, homes: a.homes, p0: a.p0 }));
  const hh = await J(`(() => { const W = TLX.api.world, per = {}, hp = {}; for (const h of TLXN.homes) { per[h.village] = per[h.village] || { homes: 0, people: 0 }; per[h.village].homes++; per[h.village].people += h.members.length; }
    const doors = W.doors.map(d => [d.x, d.z]); const atDoor = TLXN.people.every(p => TLXN.homeOf(p) && Math.hypot(TLXN.homeOf(p).x - p.x, TLXN.homeOf(p).z - p.z) < 0.01 && (doors.some(d => Math.hypot(d[0] - p.x, d[1] - p.z) < 0.01) || W.SITES.some(s => s.type === "home" && Math.hypot(s.x - p.x, s.z - p.z) < 16)));
    const once = TLXN.people.every(p => TLXN.homes.filter(h => h.members.includes(p.id)).length === 1);
    const kin = TLXN.homes.every(h => { const m = h.members.map(id => TLXN.person(id)); const non = m.filter(p => p.role !== "lodger"); return non.every(p => p.last === h.surname); });
    const lodgers = TLXN.people.filter(p => p.role === "lodger").length, kids = TLXN.people.filter(p => p.age < 18).length, sizes = TLXN.homes.map(h => h.members.length);
    const villages = TLXN.villages().map(v => v.id), sur = {}; for (const v of villages) sur[v] = [...new Set(TLXN.peopleIn(v).map(p => p.last))].sort().join("/");
    const fam = TLXN.family(TLXN.homes[0].members[0]);
    const reused = TLXN.people.filter(p => p.reused).map(p => p.first + "@" + p.village + ":" + p.reused);
    return { per, doors: W.doors.length, homes: TLXN.homes.length, people: TLXN.people.length, atDoor, once, kin, lodgers, kids, minS: Math.min(...sizes), maxS: Math.max(...sizes), villages, sur, famN: fam.length, reused, sig: JSON.stringify(TLXN.people.map(p => [p.id, p.name, p.age, p.role, p.handle, p.interests.join(), p.voice, p.x.toFixed(2)])) }; })()`);
  console.log("   households and people per village:", JSON.stringify(hh.per));
  console.log("   surnames per village:", JSON.stringify(hh.sur));
  sig0 = hh.sig; fs.writeFileSync(path.join(OUT, "h1_people_sig.txt"), hh.sig);
  ok(hh.homes >= hh.doors && hh.people >= 120 && hh.minS === 1 && hh.maxS <= 6 && hh.maxS >= 4 && hh.kids > 20 && hh.lodgers >= 1, `${hh.homes} households (${hh.doors} lit doors) and ${hh.people} people: families of ${hh.minS} to ${hh.maxS}, ${hh.kids} children, ${hh.lodgers} lodgers`);
  ok(hh.villages.every(v => hh.per[v] && hh.per[v].homes >= 1), "every settlement has households: " + hh.villages.map(v => v + " " + hh.per[v].homes).join(", "));
  ok(hh.atDoor && hh.once, "every person has exactly one home, at a real door (or a standalone home site)");
  ok(hh.kin && hh.famN >= 1, "a family's members share a surname (a lodger keeps their own)");
  const surs = Object.values(hh.sur); ok(new Set(surs).size === surs.length, "each village has its own character: different surname sets");
  ok(hh.reused.length >= 10, `existing names are reused at their real doors (${hh.reused.length}): ` + hh.reused.slice(0, 4).join(", "));
  a = await J(`({ ready: TLXN.ready, n: TLXN.people.length, ski: TLXN.people.filter(p => p.interests.includes("ski")).length, fields: TLXN.people.every(p => p.id && p.name && p.age > 0 && p.role && p.home && p.vid && p.handle && p.interests.length >= 2 && p.interests.length <= 3 && p.voice), dup: TLXN.people.length - new Set(TLXN.people.map(p => p.id)).size, hdup: TLXN.people.length - new Set(TLXN.people.map(p => p.handle)).size })`);
  ok(a.ready && a.fields && a.dup === 0 && a.hdup === 0, "each person has name, age, role, handle, 2-3 interests and a voice; ids and handles are unique");
  ok(a.ski >= 40, `${a.ski} of them ski`);
  await ev(`window.__got = []; window.__off = TLXN.on(p => window.__got.push(p.id)); true`);
  const t0 = await J(`GS.hour`);
  const p1 = await J(`TLXN.post({ kind: "ski", who: TLXN.people[3], x: -1300, z: -385, text: "hello", data: { km: 3 } })`);
  ok(p1 && p1.id > 0 && p1.t === Math.round(t0 * 100) / 100 && p1.kind === "ski" && /^[a-z]{2}\d\d\.\d$/.test(p1.who) && p1.place === "Kjøllefjord", "post stamps t and an id, who becomes the person's id, place is filled from x,z: " + JSON.stringify([p1.id, p1.who, p1.place]));
  await ev(`GS.hour += 5; TLXN.post({ kind: "road", who: "you", x: 3000, z: -3000, text: "far" }); TLXN.post({ kind: "storm", text: "no position" }); true`);
  a = await J(`({ since: TLXN.since(GS.hour - 2).map(p => p.kind), all: TLXN.since(0).length, near: TLXN.near(-1300, -385, 200).map(p => p.kind), near2: TLXN.near(-1300, -385, 200, GS.hour - 2).length, far: TLXN.near(3000, -3000, 50).map(p => p.kind), got: window.__got.length, you: TLXN.all().find(p => p.who === "you").kind })`);
  ok(a.since.join() === "road,storm" && a.all === 3, "since(t) returns the posts at or after t, oldest first: " + a.since.join());
  ok(a.near.join() === "ski" && a.near2 === 0 && a.far.join() === "road", "near(x, z, r, sinceT) filters by distance and time, skips posts with no position");
  ok(a.got === 3, "on(fn) heard every post (" + a.got + ")");
  await ev(`window.__off(); for (let i = 0; i < 300; i++) TLXN.post({ kind: "misc", text: "n" + i }); true`);
  a = await J(`({ n: TLX.state("news").posts.length, first: TLX.state("news").posts[0].text, last: TLX.state("news").posts.at(-1).text, seq: TLX.state("news").seq, got: window.__got.length, ids: TLX.state("news").posts.every((p, i, l) => !i || p.id === l[i - 1].id + 1) })`);
  ok(a.n === 240 && a.first === "n60" && a.last === "n299" && a.ids && a.seq >= 303 && a.got === 3, `the ring is capped at 240 (oldest dropped, ids in order, a stopped listener stays stopped): ${a.n}, first ${a.first}`);
});

await section("B the trails: routes", async () => {
  const dump = await J(`(() => { const W = TLX.api.world, st = 50, n = 164, terrain = { n, st, h: [], s: [] };
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = i * st - 4096 + 25, z = j * st - 4096 + 25; terrain.h.push(Math.round(W.groundAt(x, z) * 10) / 10); terrain.s.push(W.isSea(x, z) ? 2 : W.isWater(x, z) ? 1 : 0); }
    return { ms: TLXSK.ms, diag: TLXSK.diag, terrain, world: { sites: SITES.map(s => [s.id, s.x, s.z]), roads: TLXR.routes.map(r => ({ id: r.id, pts: r.pts })) },
      trails: TLXSK.list.map(t => ({ id: t.id, name: t.name, kind: t.kind, len: t.len, nseg: t.nseg, closed: t.closed, lit: !!t.lit, grade: t.grade, how: t.how, pts: t.pts.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]) })) }; })()`);
  trails = dump.trails;
  fs.writeFileSync(path.join(OUT, "h1_routes.json"), JSON.stringify(dump));
  try { cp.execFileSync("python3", [path.resolve(import.meta.dirname, "../trailsplot.py"), path.join(OUT, "h1_routes.json"), path.join(OUT, "h1_routes.png")], { stdio: "inherit" }); } catch (e) { console.log("  (no plot: " + String(e.message).slice(0, 80) + ")"); }
  console.log("  boot cost " + dump.ms + " ms; " + JSON.stringify(dump.diag));
  ok(trails.length >= 6 && trails.length <= 8, trails.length + " trails: " + trails.map(t => `${t.id} ${(t.len / 1000).toFixed(1)} km (${Math.round(t.grade * 100)}%)`).join(", "));
  ok(dump.ms < 1500, "the build costs " + dump.ms + " ms at boot");
  const chk = await J(`(() => { const W = TLX.api.world, out = []; const gradeOf = (p, win = 50) => { const c = [0]; for (let i = 1; i < p.length; i++) c.push(c[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])); let mx = 0, j = 0; for (let i = 1; i < p.length; i++) { while (j < i - 1 && c[i] - c[j + 1] >= win) j++; const d = c[i] - c[j]; if (d >= win * 0.9) mx = Math.max(mx, Math.abs(W.groundAt(p[i][0], p[i][1]) - W.groundAt(p[j][0], p[j][1])) / d); } return mx; };
    for (const t of TLXSK.list) { let sea = 0, lake = 0, house = 0, onroad = 0, run = 0, maxRun = 0, gap = 0, maxGap = 0;
      for (let i = 0; i < t.pts.length; i++) { const [x, z] = t.pts[i];
        if (W.isSea(x, z) || W.isWater(x, z)) sea++; for (const L of W.LAKES) if (Math.hypot(L.x - x, L.z - z) < L.r) lake++;
        for (const o of W.obstaclesNear(x, z, 8)) { if (o.tree !== undefined || o.log) continue; if (o.top !== undefined && o.top <= 0.3) continue; if (o.rock || (o.r || 0) < 0.5) continue; if (Math.hypot(o.x - x, o.z - z) < (o.r || 0.5) + 2) { house++; if (house < 3) window.__hd = (window.__hd || []).concat([[t.id, i, Math.round(o.x), Math.round(o.z), o.r, !!o.box, o.top > 1e8]]); } }
        const nr = TLXR.near(x, z).d < 8; if (nr) { onroad++; run++; maxRun = Math.max(maxRun, run); } else run = 0;
        if (i) gap = Math.hypot(x - t.pts[i - 1][0], z - t.pts[i - 1][1]), maxGap = Math.max(maxGap, gap); }
      const f = t.pts[0], l = t.pts.at(-1);
      out.push({ id: t.id, sea, lake, house, onroad, maxRun, maxGap: Math.round(maxGap), grade: +gradeOf(t.pts).toFixed(3), roadGrade: +Math.max(0, ...TLXR.grades(t.pts)).toFixed(3), end: Math.round(Math.hypot(f[0] - l[0], f[1] - l[1]) * 10) / 10, n: t.pts.length, len: Math.round(t.len) }); }
    return out; })()`);
  for (const c of chk) console.log("  ", JSON.stringify(c));
  console.log("   near-house hits:", await ev("JSON.stringify(window.__hd || [])"));
  ok(chk.every(c => c.sea === 0 && c.lake === 0), "every point of every trail is on land, off the sea and the lakes");
  ok(chk.every(c => c.house === 0), "every point is clear of houses and buildings");
  ok(chk.every(c => c.grade <= 0.14), "sustained grade (over 50 m, by distance along the line) at most 14%: " + chk.map(c => c.id + " " + Math.round(c.grade * 1000) / 10 + "%").join(", "));
  ok(chk.every(c => c.maxGap <= 30), "points about 25 m apart (largest gap " + Math.max(...chk.map(c => c.maxGap)) + " m)");
  ok(trails.filter(t => t.closed).every(t => { const c = chk.find(q => q.id === t.id); return c.end < 1; }) && trails.some(t => t.kind === "fjell" && !t.closed), "every loop and turløype closes (first point = last); the fjelløype is a line");
  const by = Object.fromEntries(trails.map(t => [t.id, t.len]));
  ok(by.lys > 2000 && by.lys < 3000 && trails.find(t => t.id === "lys").lit, "Lysløypa is a lit loop of about 2.5 km: " + Math.round(by.lys) + " m");
  ok(trails.filter(t => t.kind === "loop").length >= 3 && trails.filter(t => t.kind === "loop" && t.id !== "lys").every(t => t.len > 1000 && t.len < 2600), "family loops of 1 to 2.6 km at Mehamn and two more villages");
  ok(trails.filter(t => t.kind === "tur").length >= 2 && trails.filter(t => t.kind === "tur").every(t => t.len >= 5000 && t.len <= 9000), "turløyper of 5 to 9 km: " + trails.filter(t => t.kind === "tur").map(t => Math.round(t.len)).join(", "));
  ok(trails.filter(t => t.kind === "fjell").length === 1 && trails.find(t => t.kind === "fjell").len > 5000, "one fjelløype between two villages: " + Math.round(trails.find(t => t.kind === "fjell").len) + " m");
  const rr = chk.filter(c => c.maxRun > 4);
  ok(rr.length === 0, "no trail runs along a road (longest stretch within 8 m of one: " + chk.map(c => c.id + " " + c.maxRun * 25 + " m").join(", ") + ")");
});

await section("C furniture", async () => {
  const a = await J(`({ n: TLXSK.FU.n, err: TLXSK.furnErr, meshes: TLXSK.FU.meshes.length, boards: TLXSK.FU.boards.length, gaps: TLXSK.FU.gaps.map(g => g.t.id), lys: TLXSK.FU.lamps.map(l => [l.trail, l.list.length]),
    polesBy: TLXSK.FU.poles.map(p => [p.trail, p.list.length, Math.round(TLXSK.list.find(t => t.id === p.trail).len / 50)]),
    ground: (() => { const p = TLXSK.FU.poles[0], m = new THREE.Matrix4(), v = new THREE.Vector3(); let worst = 0; p.list.forEach(([x, z], i) => { p.mesh.getMatrixAt(i, m); v.setFromMatrixPosition(m); worst = Math.max(worst, Math.abs(v.y + 0.12 - TLX.api.world.surf(x, z))); }); return worst; })(),
    solid: TLX.api.world.obstaclesNear(TLXSK.FU.boards[0].x, TLXSK.FU.boards[0].z, 1.2).filter(o => o.top > 1e8).length,
    gsolid: TLX.api.world.obstaclesNear(TLXSK.FU.gaps[0].x, TLXSK.FU.gaps[0].z, 3).filter(o => o.top > 1e8).length })`);
  console.log("  ", JSON.stringify(a.n), "meshes", a.meshes);
  ok(!a.err && a.boards === trails.length, "a trailhead board per trail (" + a.boards + ")");
  ok(a.polesBy.length >= 6 && a.polesBy.every(([id, n, e]) => n >= e * 0.7 && n <= e + 1), "marker poles every 50 m on each trail: " + a.polesBy.map(p => p.join("/")).join(" "));
  ok(a.lys.length === 1 && a.lys[0][0] === "lys" && a.lys[0][1] >= 45, "lamp posts every 40 m on Lysløypa only: " + JSON.stringify(a.lys));
  ok(a.gaps.length === trails.filter(t => t.kind === "tur").length && a.gaps.every(id => trails.find(t => t.id === id).kind === "tur"), "a gapahuk at each turløype's far end: " + a.gaps.join(", "));
  ok(a.meshes <= 24, "few draw calls for all of it: " + a.meshes + " meshes");
  ok(a.solid >= 1 && a.gsolid >= 2 && a.n.solid > 400, "boards, lamps, poles and gapahuks are solid (" + a.n.solid + " colliders)");
  ok(a.ground < 0.05, "poles stand on the snow surface (worst " + a.ground.toFixed(3) + " m off)");
});

await section("D taking a trail on", async () => {
  await ev(`GS.delivered = 0; GS.own.parts.hitch = "none"; true`);
  let a = await J(`({ why: TLXSK.why(__T("lys")), ok: TLXSK.take("lys"), taken: __T("lys").st.taken })`);
  ok(!a.ok && !a.taken && /Trail crew/.test(a.why), "no rank: refused, and says why: " + a.why);
  await ev(`GS.delivered = 5; true`);
  a = await J(`({ why: TLXSK.why(__T("lys")), ok: TLXSK.take("lys"), taken: __T("lys").st.taken })`);
  ok(!a.ok && !a.taken && /groomer/.test(a.why), "no groomer on the hitch: refused, and says why: " + a.why);
  await ev(`GS.own.parts.hitch = "groomer"; true`);
  a = await J(`({ why: TLXSK.why(__T("lys")), ok: TLXSK.take("lys"), taken: __T("lys").st.taken, word: TLXSK.stat(__T("lys")).word })`);
  ok(a.ok && a.taken === 1 && !a.why && a.word === "not prepared", "rank and groomer: taken on; the track starts not prepared");
});

await section("E the track", async () => {
  // grooming contracts still work untouched: the old hook still stamps
  await ev(`TLXSK.hold = true; true`);
  const len = await J(`__T("lys").len`);
  // riding it with no drag: the hitch is a trailer
  await ev(`GS.own.parts.hitch = "trailer"; true`); await sleep(400);
  await pup("lys", 5, 200, 8);
  let a = await J(`(() => { const t = __T("lys"); return t.st.seg.slice(0, 5).map(g => g[0]); })()`);
  ok(a.every(v => v === 0), "riding along it without the drag sets nothing: " + JSON.stringify(a));
  // the drag
  await ev(`GS.own.parts.hitch = "groomer"; true`); await sleep(500);
  await pup("lys", 3, 175, 5);
  a = await J(`(() => { const t = __T("lys"); return { segs: t.st.seg.slice(0, 5).map(g => Math.round(g[0] * 100) / 100), words: [0, 1, 2, 3, 4].map(i => TLXSK.segWord(t, i)), gp: t.st.gp.n, tow: TOW.kind }; })()`);
  console.log("  ", JSON.stringify(a));
  ok(a.segs[0] === 1 && a.segs[1] === 1 && a.segs[2] === 1 && a.segs[4] === 0, "dragging the groomer along segments 0-2 sets them (the real tow path through api.groomx); 4 is untouched");
  ok(a.words[0] === "freshly set" && a.words[4] === "not prepared", "the plain words: " + a.words.join(", "));
  // across it does not
  const b = await J(`(() => { const t = __T("lys"), q = TLXSK.at(t, 1000), g0 = t.st.seg[20].slice(); const f = TLX.api.groomx[0]; for (let k = 0; k < 40; k++) f(q.x + q.tz * 0 + k * 0.5 * -q.tz, q.z + k * 0.5 * q.tx, Math.atan2(-q.tz, q.tx), 2.4); return { across: t.st.seg[Math.floor(1000 / 50)][0], off: (() => { const g = TLX.api.groomx[0]; for (let k = 0; k < 400; k++) g(q.x + q.tz * 12, q.z - q.tx * 12 + k * 0.1 * q.tx, Math.atan2(q.tx, q.tz), 2.4); return t.st.seg[Math.floor(1000 / 50)][0]; })() }; })()`);
  ok(b.across === 0 && b.off === 0, "a pass across the track, or 12 m off it, sets nothing");
  // the wide pass from the wing tiller
  const w = await J(`(() => { const t = __T("lys"), s = 12 * 50, f = TLX.api.groomx[0]; for (let m = 0; m <= 52; m += 1) { const q = TLXSK.at(t, s + m); f(q.x, q.z, Math.atan2(q.tx, q.tz), 5.8); } return { set: t.st.seg[12][0], wide: t.st.seg[12][5], narrow: t.st.seg[0][5] }; })()`);
  ok(w.set === 1 && w.wide === 1 && w.narrow === 0, "the wing tiller's pass sets it wide (skating lane); the drag's does not");
  // a sled pass wears it
  await ev(`GS.own.parts.hitch = "trailer"; true`); await sleep(400);
  const before = await J(`__T("lys").st.seg[1][0]`);
  for (let k = 0; k < 3; k++) await pup("lys", 40, 140, 12);
  const after = await J(`__T("lys").st.seg[1][0]`);
  ok(after < before - 0.02, `three sled passes at speed wear the set segment: ${before.toFixed(3)} -> ${after.toFixed(3)}`);
  const posts = await J(`TLXN.all().filter(p => p.kind === "groom").map(p => p.text)`);
  await ev(`TLXSK.catchUp(); GS.hour += 2; TLXSK.catchUp(); true`);
  const g = await J(`TLXN.all().filter(p => p.kind === "groom").map(p => p.text)`);
  ok(g.length >= 1 && /Lysløypa/.test(g.at(-1)), "a stopped pass posts a `groom` item to the bus: " + (g.at(-1) || ""));
  // the old contract still stamps the snow: groomJob progress is the game's own
  const oldOk = await J(`(() => { const f = typeof groomProgress === "function"; return f && TLX.api.groomx.length >= 1; })()`);
  ok(oldOk, "the old groomStamp / groomProgress path is still there beside the new listener");
});

await section("F new snow, thaw, frost", async () => {
  await ev(`GS.own.parts.hitch = "groomer"; TLXSK.hold = true; WX.at = () => 0; true`);
  const T = id => `__T(${JSON.stringify(id)})`;
  // a fresh track, the same weather every hour: nothing falls
  await ev(`__setAll("lys"); true`);
  const w0 = await J(`TLXSK.stat(__T("lys")).word`);
  await ev(`WX.at = () => 1; for (let i = 0; i < 2; i++) { GS.hour += 1; TLXSK.catchUp(); } true`);
  const s2 = await J(`(() => { const t = __T("lys"); return { sn: t.st.seg[2][2], q: TLXSK.stat(t).q, word: TLXSK.segWord(t, 2) }; })()`);
  ok(s2.sn > 2 && s2.sn < 8 && s2.word !== "snowed under" && s2.q < 0.9, `two hours of storm (${s2.sn.toFixed(1)} cm) soften it: q ${s2.q.toFixed(2)}, ${s2.word}`);
  await ev(`for (let i = 0; i < 5; i++) { GS.hour += 1; TLXSK.catchUp(); } true`);
  const s7 = await J(`(() => { const t = __T("lys"); return { sn: t.st.seg.map(g => g[2]), word: TLXSK.stat(t).word, segw: TLXSK.segWord(t, 2), q: TLXSK.stat(t).q }; })()`);
  ok(Math.min(...s7.sn) >= 12 && s7.segw === "snowed under" && s7.word === "snowed under", `${Math.min(...s7.sn).toFixed(1)} cm of new snow buries it: the segment and the trail read "snowed under" (was ${w0})`);
  // a job row for it
  const jr = await J(`(() => { const r = jobsList().find(q => q.kind === "trail"); return r ? { title: r.title, tgt: r.tgt, tracked: (jobTrack(r.obj, true), JOBT.sel === r.obj) } : null; })()`);
  ok(jr && /Lysløypa: snowed under, [\d.]+ km to set/.test(jr.title) && Number.isFinite(jr.tgt.x), "a Jobs row for the taken trail that needs work, with a target on its nearest bad segment: " + (jr && jr.title));
  await ev(`JOBT.sel = null; true`);
  await ev(`WX.at = () => 0; true`);
  // set it again: the snow is gone from the track
  await ev(`__setAll("lys"); true`);
  const rs = await J(`({ word: TLXSK.stat(__T("lys")).word, sn: __T("lys").st.seg[2][2] })`);
  ok(rs.sn === 0 && rs.word === "freshly set", "dragging it again clears the new snow: " + rs.word);
  // thaw and refreeze
  await ev(`const _t = WX.temp; window.__temp = _t; WX.temp = () => 1; for (let i = 0; i < 4; i++) { GS.hour += 1; TLXSK.catchUp(); } true`);
  const th = await J(`({ thaw: __T("lys").st.thaw, ice: __T("lys").st.seg[2][1] })`);
  await ev(`WX.temp = () => -9; GS.hour += 1; TLXSK.catchUp(); true`);
  const rf = await J(`({ thaw: __T("lys").st.thaw, ice: __T("lys").st.seg[2][1], set: __T("lys").st.seg[2][0], word: TLXSK.stat(__T("lys")).word, seg: TLXSK.segWord(__T("lys"), 2) })`);
  ok(th.thaw >= 3 && th.ice === 0 && rf.ice >= 0.45 && rf.set > 0.9 && rf.seg === "icy", `a thaw (${th.thaw} h) and a refreeze make it icy (ice ${rf.ice.toFixed(2)}) while the set holds (${rf.set.toFixed(2)}): ${rf.seg}`);
  // a hard frost after grooming makes it last longer: the same fresh track for three days in a hard frost and in a mild, damp spell
  const run = async temp => {
    await ev(`WX.temp = () => ${temp}; GS.hour = 18; TLX.state("trails").h = 18; for (const g of __T("lys").st.seg) { g[0] = 0; g[1] = 0; g[2] = 0; g[3] = 0; } __setAll("lys"); true`);
    await hours(72, []);
    return J(`({ set: __T("lys").st.seg[5][0], hd: __T("lys").st.seg[5][3] })`);
  };
  const cold = await run(-9), mild = await run(-2);
  ok(cold.hd >= 0.9 && mild.hd < 0.3, `a clear night with a hard frost after grooming sets the track hard (hardness ${cold.hd.toFixed(2)}; ${mild.hd.toFixed(2)} in a mild spell)`);
  ok(cold.set > mild.set + 0.03, `a frost-hardened track keeps its set longer: ${cold.set.toFixed(3)} vs ${mild.set.toFixed(3)} after 3 days`);
  await ev(`WX.temp = window.__temp; true`);
});

await section("G a week: visits, pay, statement", async () => {
  // fresh books: Lysløypa kept good every morning, Sandfjorddalen taken on and left worn, Stjernevarden not taken on
  await ev(`(() => { const s = TLX.state("trails"); for (const t of TLXSK.list) { t.st.taken = 0; t.st.seg.forEach(g => { g[0] = 0; g[1] = 0; g[2] = 0; g[3] = 0; g[4] = -1e6; g[5] = 0; }); t.st.tot = { v: 0, km: 0, pay: 0 }; t.st.wk = { v: 0, km: 0, kw: 0, days: 0, low: 0, under: 0 }; t.st.day = { v: 0, km: 0, kw: 0 }; t.st.out = []; t.st.last = []; }
    GS.cash = 1000; GS.delivered = 5; GS.own.parts.hitch = "groomer"; WX.at = () => 0; TLX.state("news").posts.length = 0; GS.hour = 24.02; s.h = 24; s.dd = -1; true; })()`);
  await ev(`TLXSK.take("lys"); TLXSK.take("san"); __setAll("lys"); __T("san").st.seg.forEach(g => { g[0] = 0.4; g[4] = GS.hour; }); true`);
  await sleep(300);
  const cash0 = await J(`GS.cash`);
  await hours(167, ["lys"]);                                                            // Monday 00:00 -> Sunday 23:00
  await ev(`GS.hour = 192; TLXSK.catchUp(); true`);                                     // Monday 00:00: the Sunday is closed
  const w = await J(`(() => { const L = __T("lys").st, S = __T("san").st, J = __T("stj").st; return { lys: { v: L.wk.v, km: L.wk.km, kw: L.wk.kw, days: L.wk.days, low: L.wk.low, under: L.wk.under, out: L.out.length }, san: { v: S.wk.v, km: S.wk.km, set: S.seg[5][0] }, stj: { v: J.tot.v, taken: J.taken },
    words: [...new Set(__T("lys").st.seg.map((g, i) => TLXSK.segWord(__T("lys"), i)))], ski: TLXN.all().filter(p => p.kind === "ski").length, withN: TLXN.all().filter(p => p.kind === "ski").reduce((a, p) => a + p.data.with.length, 0), crowd: TLXN.all().filter(p => p.kind === "skidag" && p.data.what === "done").reduce((a, p) => a + p.data.n, 0), skiWho: [...new Set(TLXN.all().filter(p => p.kind === "ski").map(p => p.who))].length, sample: TLXN.all().filter(p => p.kind === "ski").slice(0, 3).map(p => p.text + " [" + p.who + ", " + p.place + "]") }; })()`);
  console.log("  ", JSON.stringify(w));
  ok(w.lys.v > w.san.v && w.lys.v >= 8, `a kept good trail is skied more than a worn one over a week: Lysløypa ${w.lys.v} visits (${w.lys.km.toFixed(1)} km), Sandfjorddalen ${w.san.v}`);
  ok(w.stj.v === 0 && !w.stj.taken, "a trail nobody has taken on gets no visits");
  ok(w.ski <= w.lys.v + w.san.v && w.ski + w.withN <= w.lys.v + w.san.v && w.lys.v + w.san.v - w.ski - w.withN <= w.crowd &&   // (a skidag crowd is posted as one item for the day, not one per skier)
    w.ski >= 5 && w.skiWho >= 3 && w.sample.every(t => t.length > 10 && /Lysløypa|Sandfjord/.test(t)), `every outing but a skidag crowd's posted a ski item to the bus, in the person's voice (${w.skiWho} people): ` + w.sample[0]);
  ok(w.lys.days === 7 && w.lys.low === 0 && w.lys.under === 0, "a week with no day under good: 7 days counted, none low, none snowed under");
  const exp = await J(`(() => { const t = __T("lys"), p = TLXSK.weekPay(t, true); return { base: p.base, bonus: p.bonus, rate: TLXSK.TR.rate, kw: p.kw }; })()`);
  ok(exp.bonus > 0 && Math.abs(exp.bonus - exp.base * 0.2) < 0.01, `the bonus is 20% of ${Math.round(exp.base)} for a week with no day under good`);
  // the pay: Monday settles
  const contracts = await J(`(() => { GS.contracts = null; makeContracts(depot); const c = []; for (let k = 0; k < 14; k++) { GS.contracts = null; makeContracts(depot); for (const q of GS.contracts || []) if (q.groom) c.push(q.pay); } return c; })()`);
  const net = await J(`(() => { const before = GS.cash; const paid = TLX.systems.find(s => s.id === "trails").monday({ label: "Mon 9 Nov" }); return { before, after: GS.cash, paid, last: __T("lys").st.last, san: __T("san").st.last, wk: __T("lys").st.wk }; })()`);
  console.log("   contracts (14 draws)", Math.min(...contracts), "-", Math.max(...contracts), "week:", JSON.stringify(net.last[0]), "san", JSON.stringify(net.san[0]));
  ok(net.after - net.before === net.paid && net.paid > 0 && net.last.length === 1 && net.last[0].pay > 0 && net.last[0].bonus === true && net.last[0].d === "Mon 9 Nov", `Monday pays ($${net.paid}) and writes a statement line: ${net.last[0].v} visits, ${net.last[0].km} skier-km, +$${net.last[0].pay}, bonus`);
  ok(net.wk.v === 0 && net.wk.days === 0, "the week's books are reset after the statement");
  const refc = contracts.length ? contracts.reduce((a, b) => a + b, 0) / contracts.length : 0;
  console.log(`   a well-kept Lysløypa paid $${net.last[0].pay} for the week; one grooming contract pays ~$${Math.round(refc)} (${Math.min(...contracts)} to ${Math.max(...contracts)})`);
  ok(refc > 0 && net.last[0].pay > refc * 0.6 && net.last[0].pay < refc * 2.2,   // (H1c: that week holds a skidag Sunday and busier weekends)
    "a well-kept Lysløypa pays roughly what one good grooming contract pays a week");
  // a week left to rot: no pay for a day snowed under, no bonus
  await ev(`(() => { const t = __T("lys"); t.st.wk = { v: 4, km: 10, kw: 12, days: 6, low: 0, under: 0 }; t.st.day = { v: 1, km: 2.5, kw: 2.5 }; t.st.noon = "snowed under"; return true; })()`);
  const dead = await J(`(() => { const p = TLXSK.weekPay(__T("lys"), true); return { base: p.base, bonus: p.bonus, kw: p.kw }; })()`);
  ok(dead.kw === 12 && dead.bonus === 0, "a day it lay snowed under pays nothing (today's 2.5 km not counted), and the bonus is gone");
  await ev(`(() => { const t = __T("lys"); t.st.day = { v: 0, km: 0, kw: 0 }; t.st.noon = ""; return true; })()`);
});

await section("H state, old saves, the app", async () => {
  await ev(`TLXSK.take("meh"); __setAll("meh"); __T("san").st.seg[7][2] = 4.5; save(); true`);
  const pre = await J(`(() => { const t = __T("lys"), m = __T("meh"); return { cash: GS.cash, taken: TLXSK.list.filter(q => q.st.taken).map(q => q.id), seg: t.st.seg.slice(0, 6).map(g => g.map(v => Math.round(v * 100) / 100)), last: t.st.last, pay: t.st.tot.pay, mehset: m.st.seg[3][0], sn: __T("san").st.seg[7][2], news: TLX.state("news").posts.length, h: TLX.state("trails").h }; })()`);
  await reload(); await sleep(1500); await ev(SETUP); await sleep(500); await ev(KIT);
  const post = await J(`(() => { const t = __T("lys"), m = __T("meh"); return { ready: TLXSK.ready, cash: GS.cash, taken: TLXSK.list.filter(q => q.st.taken).map(q => q.id), seg: t.st.seg.slice(0, 6).map(g => g.map(v => Math.round(v * 100) / 100)), last: t.st.last, pay: t.st.tot.pay, mehset: m.st.seg[3][0], sn: __T("san").st.seg[7][2], news: TLX.state("news").posts.length, h: TLX.state("trails").h }; })()`);
  const sig1 = await ev(`JSON.stringify(TLXN.people.map(p => [p.id, p.name, p.age, p.role, p.handle, p.interests.join(), p.voice, p.x.toFixed(2)]))`);
  ok(sig0.length > 1000 && sig1 === sig0, `the roll is identical across two boots (${sig0.length} bytes of people)`);
  ok(post.ready && JSON.stringify(pre.taken) === JSON.stringify(post.taken) && JSON.stringify(pre.seg) === JSON.stringify(post.seg) && post.mehset === pre.mehset && Math.abs(post.sn - pre.sn) < 0.02, "a reload keeps which trails are yours and the track state of every segment");
  ok(JSON.stringify(pre.last) === JSON.stringify(post.last) && pre.pay === post.pay && pre.news === post.news && post.cash === pre.cash, `... and the statements, what was paid and the news ring (${post.news} posts): ${JSON.stringify([pre.pay, post.pay, pre.news, post.news, pre.cash, post.cash])}`);
  // an old save: no x.sys.trails, no x.sys.news
  await ev(`save(); true`); const sv = await raw0();
  delete sv.x.sys.trails; delete sv.x.sys.news;
  await reload(sv); await sleep(1500); await ev(SETUP); await sleep(500);
  const old = await J(`({ ready: TLXSK.ready, err: TLXSK.err, taken: TLXSK.list.filter(q => q.st.taken).length, news: TLX.state("news").posts.length, seq: TLX.state("news").seq, people: TLXN.people.length, sys: Object.keys(TLX.dump().sys).filter(k => k === "trails" || k === "news"), cash: GS.cash })`);
  ok(old.ready && !old.err && old.taken === 0 && old.news === 0 && old.people >= 120 && old.sys.length === 2 && old.cash === pre.cash, "a save with no x.sys.trails or news loads clean: fresh trails and an empty ring, the rest of the save intact");
  await ev(KIT);
  // junk in the saved state does not throw
  const bad = JSON.parse(JSON.stringify(sv)); bad.x.sys.trails = { v: 1, s: { h: "x", rs: null, tr: { lys: { taken: 1, seg: [[5, "a", -3], 7, null], out: [{ p: 3 }], last: [null, 4] }, ghost: 1 } } }; bad.x.sys.news = { v: 1, s: { seq: "q", posts: [null, 3, { t: "x" }, { t: 5, kind: "ski", id: 9 }] } };
  await reload(bad); await sleep(1500); await ev(SETUP); await sleep(400); await ev(KIT);
  const jk = await J(`({ ready: TLXSK.ready, err: TLXSK.err, taken: __T("lys").st.taken, seg0: __T("lys").st.seg[0], n: TLX.state("news").posts.filter(q => q.kind === "ski").length, seq: TLX.state("news").seq })`); // the weather/road feeders may post a storm or road line right after boot: only the planted ski post counts
  ok(jk.ready && !jk.err && jk.taken === 1 && jk.seg0[0] === 1 && jk.seg0[1] === 0 && jk.seg0[2] === 0 && jk.n === 1 && jk.seq >= 9, "junk in the saved state is cleaned, never thrown: " + JSON.stringify(jk.seg0));
  // the app's text under keyboard, a pad and touch
  await ev(`GS.delivered = 5; GS.own.parts.hitch = "groomer"; GS.hour = 34; true`);
  const texts = {};
  for (const dev of [["kbm", "xbox"], ["pad", "ps"], ["touch", "xbox"]]) {
    await ev(`INP.dev = ${JSON.stringify(dev[0])}; INP.pad = ${JSON.stringify(dev[1])}; TLXSK.back(); true`);
    await ev(`TABLET.toggle(true, "loyper"); true`); await sleep(500);
    const list = await ev(`document.querySelector("#tabS .tapp").textContent`);
    await ev(`[...document.querySelectorAll("#tabS [data-act^='lyo:']")][0].click(); true`); await sleep(500);
    const page = await ev(`document.querySelector("#tabS .tapp").textContent`);
    await ev(`TABLET.toggle(true, "crew"); true`); await sleep(500);
    const crew = await ev(`document.querySelector("#tabS .tapp").textContent`);
    await ev(`TABLET.close ? TABLET.close() : TABLET.toggle(false); true`); await sleep(200);
    // the groomer's pass over an untaken trail tells you where the app is, in the right words for the device
    await ev(`(() => { const t = __T("stj"); t.st.taken = 0; const q = TLXSK.at(t, 200); GS.hour += 8; window.__tsaw = []; if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); TOASTQ.length = 0; $("toasts").textContent = ""; TLX.api.groomx[0](q.x, q.z, Math.atan2(q.tx, q.tz), 2.4); return true; })()`);
    await sleep(500);
    const toast = await J(`(window.__tsaw || []).filter(m => /Take it on/.test(m))`);
    const hint = await J(`btn("tablet")`);
    texts[dev[0]] = { list, page, crew, toast: toast[0] || "", hint };
    ok(toast.length === 1 && toast[0].includes(hint), `${dev[0]}: the groomer's pass over an untaken trail names the tablet control for this device ("${hint}"): ${toast[0] || "no toast"}`);
  }
  const keys = /\b(Tab|Esc|Shift|Space|Click|WASD|Enter|D-pad|L3|R3|LB|RB|ZR|ZL)\b/;
  ok(Object.values(texts).every(t => !keys.test(t.list) && !keys.test(t.page) && !keys.test(t.crew)), "the app, a trail's page and the Trail Crew card name no control at all (nothing keyboard-only, no hard-coded key)");
  const nt = x => x.replace(/\d\d:\d\d/g, "");
  if (nt(texts.kbm.list) !== nt(texts.pad.list)) { const a = nt(texts.kbm.list), b = nt(texts.pad.list); let i = 0; while (a[i] === b[i]) i++; console.log("   differs at", i, JSON.stringify(a.slice(i - 30, i + 60)), JSON.stringify(b.slice(i - 30, i + 60))); }
  ok(nt(texts.kbm.list) === nt(texts.pad.list) && nt(texts.pad.list) === nt(texts.touch.list) && nt(texts.kbm.page) === nt(texts.touch.page), "the app reads the same under keyboard, a pad and touch");
  ok(/Ski trails/.test(texts.kbm.list) && /Lysløypa/.test(texts.kbm.list) && /Stjernevarden-runden/.test(texts.kbm.list) && /Nobody keeps it/.test(texts.kbm.list), "the list names every trail and says an untaken one is nobody's");
  ok(/TAKE ON|HAND BACK/.test(texts.kbm.page) && /BACK/.test(texts.kbm.page) && /Statements|Visits today|Use/.test(texts.kbm.page), "a trail's page has its buttons: " + texts.kbm.page.slice(0, 160).replace(/\s+/g, " "));
  ok(/Løyper: keep a ski trail/.test(texts.kbm.crew) && /OPEN LØYPER/.test(texts.kbm.crew), "the Trail Crew app has one card pointing at the Løyper app");
  await ev(`INP.dev = "kbm"; true`);
});
async function raw0() { return JSON.parse(await ev(`localStorage.getItem("tracklayer.save.v2")`)); }

// stills: the board, the pole line, a gapahuk, the lamps, the app, the map
if (!NOSTILLS) await section("stills", async () => {
  await ev(`INP.dev = "kbm"; WX.at = () => 0; GS.hour = 34.2; for (const t of TLXSK.list) t.st.taken = 0; TLXSK.take("lys"); TLXSK.take("san"); __setAll("lys"); for (let i = 0; i < 4; i++) TLXSK.setSeg(__T("san"), i, 2.4); TLXSK.boards(); true`);
  const clear = () => ev(`TOASTQ.length = 0; $("toasts").textContent = ""; true`);
  const place = async (x, z) => { await ev(`(() => { FOOT.on = false; P.x = ${x}; P.z = ${z}; P.y = surf(${x}, ${z}) + 0.3; P.vx = P.vz = P.vy = 0; recenter(${x}, ${z}, true); return true; })()`); await sleep(1500); await clear(); };
  const cam = async (expr) => { await ev(`window.camOv = c => { ${expr} }; true`); await sleep(1200); };
  // the board
  const b = await J(`(() => { const g = TLXSK.FU.boards.find(q => q.t.id === "lys"); return { x: g.x, z: g.z, yaw: g.yaw, y: surf(g.x, g.z) }; })()`);
  await place(b.x + Math.sin(b.yaw) * 14, b.z + Math.cos(b.yaw) * 14);
  await cam(`const x = ${b.x} + Math.sin(${b.yaw}) * 3.6, z = ${b.z} + Math.cos(${b.yaw}) * 3.6; c.position.set(x, surf(x, z) + 1.9, z); c.lookAt(${b.x}, surf(${b.x}, ${b.z}) + 1.6, ${b.z});`);
  await shot("h1_board");
  await cam(`const x = ${b.x} + Math.sin(${b.yaw} + 0.5) * 9, z = ${b.z} + Math.cos(${b.yaw} + 0.5) * 9; c.position.set(x, surf(x, z) + 3.2, z); c.lookAt(${b.x}, surf(${b.x}, ${b.z}) + 1.4, ${b.z});`);
  await shot("h1_board_wide");
  // the pole line + lamps on Lysløypa
  const pl = await J(`(() => { const t = __T("lys"), a = TLXSK.at(t, 360), q = TLXSK.at(t, 480); return { a, q }; })()`);
  await place(pl.a.x, pl.a.z);
  await cam(`const t = ${JSON.stringify(pl.a)}, q = ${JSON.stringify(pl.q)}; const x = t.x - t.tx * 7, z = t.z - t.tz * 7; c.position.set(x, surf(x, z) + 2.3, z); c.lookAt(q.x, surf(q.x, q.z) + 1.4, q.z);`);
  await shot("h1_poles_lamps");
  const sp = await J(`(() => { const t = __T("san"), a = TLXSK.at(t, 1500), q = TLXSK.at(t, 1650); return { a, q }; })()`);
  await place(sp.a.x, sp.a.z);
  await cam(`const t = ${JSON.stringify(sp.a)}, q = ${JSON.stringify(sp.q)}; const x = t.x - t.tx * 6, z = t.z - t.tz * 6; c.position.set(x, surf(x, z) + 2.0, z); c.lookAt(q.x, surf(q.x, q.z) + 1.2, q.z);`);
  await shot("h1_poles_fell");
  // a gapahuk
  const gp = await J(`(() => { const g = TLXSK.FU.gaps[0]; return { x: g.x, z: g.z, yaw: g.yaw, id: g.t.id }; })()`);
  await place(gp.x + Math.sin(gp.yaw) * 25, gp.z + Math.cos(gp.yaw) * 25);
  await cam(`const x = ${gp.x} + Math.sin(${gp.yaw} + 0.45) * 8.5, z = ${gp.z} + Math.cos(${gp.yaw} + 0.45) * 8.5; c.position.set(x, surf(x, z) + 2.6, z); c.lookAt(${gp.x}, surf(${gp.x}, ${gp.z}) + 1.2, ${gp.z});`);
  await shot("h1_gapahuk");
  await ev(`window.camOv = null; true`);
  // the app and the map
  await place(b.x + 30, b.z + 30);
  await ev(`GS.delivered = 5; GS.hour = 40; WX.at = () => 0; TLXSK.catchUp(); TLXSK.back(); TABLET.toggle(true, "loyper"); true`); await sleep(700);
  await clear(); await shot("h1_app_list");
  await ev(`[...document.querySelectorAll("#tabS [data-act^='lyo:']")][0].click(); true`); await sleep(700);
  await shot("h1_app_page");
  await ev(`TABLET.toggle(true, "map"); true`); await sleep(1200);
  await ev(`(() => { const m = TABLET.byId.map; try { if (m.spanT !== undefined) m.spanT = 5200; } catch (e) {} return true; })()`); await sleep(1500);
  await shot("h1_map");
  await ev(`TABLET.close ? TABLET.close() : 0; true`);
});

await section("I snow-free seasons", async () => {
  await ev(`(() => { for (const t of TLXSK.list) { t.st.taken = 0; } TLXSK.take("lys"); __setAll("lys"); return true; })()`);
  const open0 = await J(`TLXSK.isOpen()`);
  // summer: the calendar moves on to July
  await ev(`CAL.off = 24 * 250; GS.hour = 40; TLX.state("trails").h = 40; true`);
  await sleep(300);
  const a = await J(`({ open: TLXSK.isOpen(), why: TLXSK.why(__T("san")), take: TLXSK.take("san"), season: CAL.season().id })`);
  ok(open0 === true && a.open === false && a.season === "summer", "open in winter, closed in summer");
  ok(!a.take && /Closed/.test(a.why), "taking a trail on says it is closed: " + a.why);
  await ev(`__T("lys").st.out = []; TLXSK.hold = true; true`);
  const v0 = await J(`__T("lys").st.tot.v`);
  await hours(72, []);
  const v1 = await J(`__T("lys").st.tot.v`);
  ok(v0 === v1, "no visits while the trails are closed (" + v1 + ")");
  await ev(`TABLET.toggle(true, "loyper"); true`); await sleep(500);
  const txt = await ev(`$("tabS").textContent`);
  ok(/Closed: no snow/.test(txt), "the app says the trails are closed");
  const board = await J(`(() => { const b = TLXSK.FU.boards[0]; b.key = ""; TLXSK.boards(); return b.key; })()`);
  ok(/closed/.test(board), "the boards read closed");
  await ev(`TABLET.close ? TABLET.close() : 0; CAL.off = 0; GS.hour = 34; TLX.state("trails").h = 34; true`);
});

done(fails ? 1 : 0);
