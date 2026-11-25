// How cool is Gram to scroll. Plays ordinary days through the director at a named date, then scrolls Local (the whole land, one feed) and Reels as a player would, on the real UI,
// writes every screen as a still, builds contact sheets, prints the numbers and asserts the floor from loop/HOME.md ("Testing how cool it is"). Exit 1 under the floor.
//   GRAM_DATE=polarnight|sunreturn|spring (default polarnight)   GRAM_DAYS=3   GRAM_N=30 (Local posts scrolled)   GRAM_R=8 (reels)   OUT=dir for the stills
import { boot, ev, sleep, done, send, tap, OUT } from "../lib.mjs";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const DATE = process.env.GRAM_DATE || "polarnight", DAYS = +(process.env.GRAM_DAYS || 3), N = +(process.env.GRAM_N || 30), NR = +(process.env.GRAM_R || 8);
const DAY0 = { polarnight: 40, sunreturn: 85, spring: 165 }[DATE]; if (DAY0 === undefined) throw new Error("GRAM_DATE: polarnight|sunreturn|spring");
await boot({ width: 1280, height: 720 });
await ev(`tutSkip(); crashCancel(); FOOT.on = false; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); true`); await sleep(1500);
for (let i = 0; i < 160 && (await J(`!!TLXGR.bl`)); i++) await sleep(250);   // the new game's two days of posts are made a few hours a frame
const H0 = DAY0 * 24 + 5.4;
await ev(`GS.hour = ${H0}; WX.force = null; true`); await sleep(500);
await ev(`TLXGR.hold = true; true`); const t0 = Date.now(); const before = await J(`TLXGR.localPosts().length`);
for (let h = 0; h < DAYS * 24; h++) { await ev(`(() => { const H = ${H0} + ${h}; WX.force = ${h % 29 === 7 || h % 29 === 8} ? { v: 1, until: H + 1 } : null; GS.hour = H; TLXGR.genHour(H + 0.4); if (window.TLXRL) TLXRL.tick(0); return 1; })()`); if (h % 6 === 0) await sleep(60); }
await ev(`WX.force = null; GS.hour = ${H0 + DAYS * 24 - 0.5}; TLXGR.hold = false; true`); await sleep(600);
console.log(`date ${DATE} day ${DAY0}, ${DAYS} days played in ${((Date.now() - t0) / 1000).toFixed(0)} s; director errors: ${await ev("TLXGR.err || ''")}`);
const all = await J(`TLXGR.localPosts().map(p => ({ id: p.id, k: p.k, vid: p.vid, place: p.place, cap: p.cap, t: p.t, sh: p.sh || 0, lm: p.lm || 0, rg: p.rg, cm: p.cm.length, fam: TLXGR.H ? 0 : 0 }))`);
const perDay = {}; for (const p of all) { const d = Math.floor(p.t / 24); perDay[d] = (perDay[d] || 0) + 1; }
console.log("Local posts per game day (from the days played):", JSON.stringify(Object.entries(perDay).filter(([d]) => d >= DAY0).map(([d, n]) => n)), "reels per day:", JSON.stringify(await J(`(() => { const o = {}; for (const r of TLXRL.list()) { const d = Math.floor(r.t / 24); if (d >= ${DAY0}) o[d] = (o[d] || 0) + 1; } return Object.values(o); })()`)));
await ev(`FOOT.on = true; TLXGR.fpsOk = true; TLX.api.TABLET.toggle(true, "gram"); TLXGR.setTab("local"); true`); await sleep(1500);
const quiet = () => ev(`(() => { const T = TLX.api.TABLET; for (const n of T.notes.slice()) n.dismiss(); T.updBanner && T.updBanner(); for (const e of document.querySelectorAll("#toast, .toast, #toasts, #banner, #tabBanner")) e.style.display = "none"; return 1; })()`);
const clip = async name => { await quiet(); const r = await J(`(() => { const b = (document.querySelector("#tabS .gcol") || document.getElementById("tabS")).getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; })()`); const s = await send("Page.captureScreenshot", { format: "jpeg", quality: 90, clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1.5 } }); fs.writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(s.data, "base64")); };
console.log("screen:", JSON.stringify(await J(`(() => { const b = document.getElementById("tabV").getBoundingClientRect(); const c = document.querySelector("#tabS .gcol").getBoundingClientRect(); return { tabV: [b.width|0, b.height|0], col: [c.width|0, c.height|0] }; })()`)));
const shown = [], sigs = [];
const sample = `(() => { const sn = document.getElementById("gSn"), i = TLXGR.view.cur, sec = sn.children[i]; const cv = sec && sec.querySelector("canvas[data-gp]"); if (!cv) return { text: 1, i }; const t = document.createElement("canvas"); t.width = 8; t.height = 10; const g = t.getContext("2d", { willReadFrequently: true }); g.drawImage(cv, 0, 0, 8, 10); const d = g.getImageData(0, 0, 8, 10).data; const sig = []; for (let k = 0; k < 80; k++) sig.push(d[k * 4], d[k * 4 + 1], d[k * 4 + 2]); const t2 = document.createElement("canvas"); t2.width = 32; t2.height = 40; const g2 = t2.getContext("2d", { willReadFrequently: true }); g2.drawImage(cv, 0, 0, 32, 40); const e = g2.getImageData(0, 0, 32, 40).data, L = []; for (let k = 0; k < 1280; k++) L.push(0.2126 * e[k * 4] + 0.7152 * e[k * 4 + 1] + 0.0722 * e[k * 4 + 2]); const s = L.slice().sort((a, b) => a - b); return { i, done: cv.dataset.done || "", sig, mean: L.reduce((a, b) => a + b, 0) / 1280, contrast: s[1216] - s[64] }; })()`;
const posts = await J(`UI_LIST = TLXGRUI.cur.map(p => ({ id: p.id, k: p.k, place: p.place, vid: p.vid, cap: p.cap, sh: p.sh || 0, lm: p.lm || 0, fam: (TLXGK.kinds[p.k] || {}).fam || "text", cm: p.cm.length }))`.replace("UI_LIST = ", ""));
let steps = 0, wrong = 0;
for (let i = 0; i < Math.min(N, posts.length); i++) {
  let m = null; for (let k = 0; k < 160; k++) { m = await J(sample); if (m.text || m.done) break; await sleep(150); }
  const cur = await J(`TLXGR.view.cur`); if (cur !== i) wrong++;
  shown.push(Object.assign({ idx: i }, posts[i], m)); await clip(`local_${String(i).padStart(2, "0")}`);
  await tap("ArrowDown"); steps++; for (let k = 0; k < 60; k++) { if ((await J(`TLXGR.view.cur`)) === i + 1) break; if (k === 30) await tap("ArrowDown"); await sleep(100); } await sleep(250);   // a key lost to a stalled frame under load is pressed once more
}
const n = shown.length;
ok(n >= 30 || N < 30, `Local has ${n} posts to scroll (asked ${N})`);
const photos = shown.filter(s => !s.text), kindsN = new Set(shown.map(s => s.k)).size, fams = new Set(shown.map(s => s.fam).filter(f => ["people", "action", "animals", "sea", "weather", "cosy", "funny"].includes(f)));
ok(kindsN >= 12, `kinds per ${n} posts: ${kindsN} (floor 12)`);
ok(fams.size >= 6, `families: ${[...fams].join(",")} (${fams.size}, floor 6)`);
let kr = 0, pr = 0; for (let i = 0; i < n; i++) { for (let j = Math.max(0, i - 5); j < i; j++) if (shown[j].k === shown[i].k) kr++; for (let j = Math.max(0, i - 4); j < i; j++) if (shown[j].place && shown[j].place === shown[i].place) pr++; }
ok(kr === 0, `no kind within 5 posts: ${kr} repeats`); ok(pr === 0, `no place within 4 posts: ${pr} repeats`);
const caps = posts.map(p => p.cap), dup = caps.filter((c, i) => caps.indexOf(c) !== i && i < 60).length; ok(dup === 0, `no caption twice in 60: ${dup} repeats`);
const villages = new Set(shown.map(s => s.vid)); ok(villages.size >= 5, `villages in ${n} posts: ${villages.size} (${[...villages].join(",")}), at least 5`);
ok(shown.every(s => s.text || s.sh >= 0.15), `every picture's subject at least 15% of the frame (smallest ${Math.min(...photos.map(s => s.sh)).toFixed(2)}; the kinds ask 17-30%; too small: ${shown.filter(s => !s.text && s.sh < 0.15).map(s => s.k + "#" + s.id + "@" + s.idx).join(" ") || "none"})`);
const dark = photos.filter(s => s.done === "real" && (s.mean < 34 || s.contrast < 24)); ok(dark.length === 0, `no real picture under the luminance floor: ${dark.map(s => s.k + ":" + Math.round(s.mean) + "/" + Math.round(s.contrast)).join(" ") || "none"}`);
const dists = []; for (let i = 1; i < n; i++) if (shown[i].sig && shown[i - 1].sig) { let d = 0; for (let k = 0; k < 240; k++) d += Math.abs(shown[i].sig[k] - shown[i - 1].sig[k]); dists.push(d / 240 / 255); }
ok(dists.every(d => d > 0.03), `adjacent pictures differ: min thumbnail distance ${Math.min(...dists).toFixed(3)} (floor 0.03)${dists.map((d, i) => d <= 0.03 ? " [" + (i) + "-" + (i + 1) + " " + shown[i].k + "/" + shown[i + 1].k + " ids " + shown[i].id + "," + shown[i + 1].id + " done " + shown[i].done + "," + shown[i + 1].done + "]" : "").join("")}`);
ok(wrong === 0, `each Down key moved exactly one post (${steps} steps, ${wrong} off)`);
const real = photos.filter(s => s.done === "real").length; ok(real >= photos.length * 0.9, `real pictures: ${real}/${photos.length}`);
const cost = await J(`TLXGR.renderMs`); const avg = cost.length ? Math.round(cost.reduce((a, b) => a + b, 0) / cost.length) : 0;
console.log(`metrics: kinds ${kindsN}, families ${fams.size}, text posts ${n - photos.length}, painted ${photos.length - real}, mean sub ${Math.round(photos.reduce((a, s) => a + (s.mean || 0), 0) / Math.max(1, photos.length))}, mean contrast ${Math.round(photos.reduce((a, s) => a + (s.contrast || 0), 0) / Math.max(1, photos.length))}, render ms avg ${avg} max ${Math.max(0, ...cost)}`);
console.log("run:", shown.map(s => `${s.idx}:${s.k}@${s.vid}`).join(" "));
// Reels
await ev(`TLXRL.force = "real"; TLXGR.setTab("reels"); true`); await sleep(2500);
const rn = Math.min(NR, await J(`TLXRL.list().length`)); const rk = [];
for (let i = 0; i < rn; i++) { await sleep(2400); await clip(`reel_${String(i).padStart(2, "0")}_a`); rk.push(await J(`(() => { const r = TLXRL.current(); return { ty: r.ty, rg: r.rg, cap: r.cap }; })()`)); await sleep(1200); await clip(`reel_${String(i).padStart(2, "0")}_b`); await tap("ArrowDown"); await sleep(1200); }
ok(rn >= NR, `Reels has ${rn} to scroll (asked ${NR})`); console.log("reels:", rk.map(r => `${r.ty}@${r.rg}`).join(" "));
ok(rk.every(r => r.rg === "nordkinn"), "every reel carries its land (nordkinn)");
console.log("errors:", await ev("TLXGR.err || ''"), "|", await ev("(TLXRL.err || '')"));
for (const pre of ["local", "reel"]) try { console.log(execFileSync("python3", [new URL("../gramsheet.py", import.meta.url).pathname, OUT, pre, pre === "local" ? "6" : "8", pre === "local" ? "18" : "16"]).toString().trim()); } catch (e) { console.log("sheet failed", String(e).slice(0, 200)); }
console.log(fails ? `GRAM SCROLL: ${fails} below the floor` : "GRAM SCROLL: floor passed");
await done(fails ? 1 : 0);
