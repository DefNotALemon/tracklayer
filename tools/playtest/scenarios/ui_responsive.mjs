// Responsive UI acceptance (v240): title/menu, riding + on-foot HUD, touch controls, modals, tablet, runtime resize and
// orientation flips, over the sizes the game really gets played at. The real itch.io embed is 640x360 CSS, so that size is
// the priority one. ONE page is reused for the whole run (no parallel GPU load); the viewport is changed at runtime, which
// also proves the layout follows innerWidth/innerHeight and not a size read once at boot.
//
// Asserts (exit 1 on any FAIL):
//   * every visible HUD / control / modal box lies inside the viewport
//   * no two HUD boxes overlap; no touch control overlaps another control or a HUD panel
//   * the clear middle of the screen (the world) has no HUD box in it (toasts and the tutorial card are timed, exempt)
//   * zone panel stays permanently off, minimap off in third person riding, on while on foot
//   * HUD text >= 9 px, one panel never bigger than a fixed share of the screen, whole HUD under a share of the area
//   * a modal (settings, garage, title panel) fits or scrolls: overflow auto and the bottom is reachable by scrolling
//   * touch buttons are >= 36 px; touch hints name no keyboard key, keyboard hints still do
// Stills go to $OUT and are sorted into contact sheets ($OUT/sheet_*.jpg).
// Run: tools/playtest/run.sh tools/playtest/scenarios/ui_responsive.mjs [outdir]     (about 4-6 min)
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { boot, ev, raw, send, sleep, shot, OUT, done } from "../lib.mjs";

let fails = 0, checks = 0;
const ok = (c, m) => { checks++; console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

// [name, w, h, touch]
const VP = [
  ["embed640", 640, 360, false], ["embed960", 960, 540, false], ["hd720", 1280, 720, false], ["laptop768", 1366, 768, false],
  ["fhd1080", 1920, 1080, false], ["ultrawide", 2560, 1080, false],
  ["tabletL", 1024, 768, true], ["tabletP", 768, 1024, true], ["tabletPro", 1180, 820, true],
  ["phoneP", 390, 844, true], ["phoneL", 844, 390, true], ["phoneSE", 320, 568, true], ["phoneSEL", 568, 320, true],
  ["embed640t", 640, 360, true]
];

// page-side helpers: visible rects, font sizes, scroll reachability
await boot({ launch: false });
await raw(`window.__ui = {
  vis(e) { if (!e || e.closest("[hidden]") || !e.getClientRects().length) return false; const cs = getComputedStyle(e); return cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.05; },
  box(e) { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; },
  rects(sel) { const out = []; for (const e of document.querySelectorAll(sel)) if (this.vis(e)) { const b = this.box(e); if (b.w > 1 && b.h > 1) out.push({ id: e.id || e.className || e.tagName, ...b }); } return out; },
  minFont(el) { let m = 99; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const p = n.parentElement; if (!this.vis(p)) continue; m = Math.min(m, parseFloat(getComputedStyle(p).fontSize)); } return m; },
  scroll(e) { const cs = getComputedStyle(e), need = e.scrollHeight > e.clientHeight + 1; let reach = true; if (need) { const t = e.scrollTop; e.scrollTo({ top: 99999, behavior: "instant" }); reach = e.scrollTop > 0 && Math.abs(e.scrollTop + e.clientHeight - e.scrollHeight) < 3; e.scrollTo({ top: t, behavior: "instant" }); } return { need, oy: cs.overflowY, reach, sh: e.scrollHeight, ch: e.clientHeight }; }
}; true`);

const overlap = (a, b, t = 1) => a.x < b.x + b.w - t && b.x < a.x + a.w - t && a.y < b.y + b.h - t && b.y < a.y + a.h - t;
const inside = (a, W, H) => a.x >= -0.6 && a.y >= -0.6 && a.x + a.w <= W + 0.6 && a.y + a.h <= H + 0.6;
const fmt = r => `${r.id}[${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.w)}x${Math.round(r.h)}]`;
const SHOTS = [];
async function snap(group, name) { const f = await shot(`${group}_${name}`, 78); SHOTS.push([group, f]); }

let cur = null;
async function view(v) {
  const [name, w, h, touch] = v; cur = v;
  await send("Emulation.setUserAgentOverride", { userAgent: touch && w < 900 ? UA : "", platform: "" });
  await send("Emulation.setTouchEmulationEnabled", { enabled: touch, maxTouchPoints: touch ? 5 : 1 });
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: touch });
  await ev(`SET.touch = ${touch ? '"on"' : '"off"'}; setTouchUI(); true`);
  await sleep(550);
  const sz = await raw("JSON.stringify([innerWidth, innerHeight])");
  ok(sz === JSON.stringify([w, h]), `${name}: viewport is ${w}x${h} (got ${sz})`);
}

// ---- A. title screen (menu and its panels) ----
async function titleChecks() {
  const [name, W, H, touch] = cur, tag = `title ${name} ${W}x${H}`;
  const hasMenu = () => J(`window.__ui.rects("#tMenu .ti, #tCol .tlogo, .tkeys, .tsun").map(r => r)`);
  const items = await hasMenu();
  ok(items.length >= 3, `${tag}: logo + menu visible (${items.length} boxes)`);
  const bad = items.filter(r => !inside(r, W, H));
  ok(!bad.length, `${tag}: menu/logo inside viewport${bad.length ? " OFF " + bad.map(fmt).join(" ") : ""}`);
  const tl = await J(`window.__ui.rects("#tMenu .ti .tl")`);
  const last = tl.reduce((m, r) => Math.max(m, r.y + r.h), 0);
  ok(last <= H - 4, `${tag}: last menu line ends at ${Math.round(last)} <= ${H - 4}`);
  const sc = await J(`document.getElementById("tCol").scrollHeight > innerHeight + 2`);
  ok(!sc, `${tag}: title column fits the height`);
  const foot = await J(`window.__ui.rects(".tkeys, .tsun")`), menu = await J(`window.__ui.rects("#tMenu .ti .tl, #tCol .tlogo")`);
  const clash = []; for (const f of foot) for (const m of menu) if (overlap(f, m, 2)) clash.push(fmt(f) + "x" + fmt(m));
  ok(!clash.length, `${tag}: key legend / sun clock clear of menu ${clash.join(" ")}`);
  const ts = await J(`+getComputedStyle(document.getElementById("title")).getPropertyValue("--ts")`);
  const mf = await J(`window.__ui.minFont(document.getElementById("tMenu"))`);
  ok(mf >= 9, `${tag}: menu text >= 9px (min ${mf}, --ts ${ts})`);
  await snap("title", `${name}`);
  for (const kind of ["howto", "credits"]) {
    await ev(`titlePanel(${JSON.stringify(kind)}); true`); await sleep(500);
    const p = await J(`window.__ui.rects("#tPanel")[0] || null`);
    ok(!!p, `${tag} ${kind}: panel visible`);
    if (p) {
      ok(inside(p, W, H), `${tag} ${kind}: panel inside viewport ${fmt(p)}`);
      const s = await J(`window.__ui.scroll(document.getElementById("tPanel"))`);
      ok(!s.need || ((s.oy === "auto" || s.oy === "scroll") && s.reach), `${tag} ${kind}: panel fits or scrolls to the end (${JSON.stringify(s)})`);
      const x = await J(`window.__ui.rects("#tPanel .tx")[0] || null`);
      ok(x && inside(x, W, H) && x.w >= 36, `${tag} ${kind}: close button reachable ${x ? fmt(x) : "missing"}`);
      const pf = await J(`window.__ui.minFont(document.getElementById("tPanel"))`);
      ok(pf >= 9, `${tag} ${kind}: panel text >= 9px (min ${pf})`);
      const lo = await J(`(() => { const r = document.getElementById("tPanel").getBoundingClientRect(), m = document.getElementById("tMenu").getBoundingClientRect(); return { pl: r.left, mr: m.right, pt: r.top, mb: m.bottom }; })()`);
      if (kind === "howto") await snap("title", `${name}_howto`);
    }
    await ev(`titleBack(); true`); await sleep(300);
  }
}

// ---- B. in-game ----
// every HUD element that can be on screen while riding / walking (zone and help are permanently off in 3rd person)
const HUD_SEL = "#vit, #compass, #speedo, #mapWrap, #zone, #help, #job, #fps";
const CTX_SEL = "#toasts .toast, #tut, #wnHud, #flip";
async function hudChecks(tag, W, H, { foot, touch }) {
  const hud = await J(`window.__ui.rects(${JSON.stringify(HUD_SEL)})`);
  const ctx = await J(`window.__ui.rects(${JSON.stringify(CTX_SEL)})`);
  const ids = hud.map(r => r.id);
  ok(!ids.includes("zone"), `${tag}: zone panel stays off`);
  ok(foot && !touch ? ids.includes("mapWrap") : !ids.includes("mapWrap"), `${tag}: minimap ${foot && !touch ? "on foot: shown" : "hidden (third-person ride, or touch HUD)"}`);
  ok(!touch || !ids.includes("help"), `${tag}: key cheat-sheet is not shown on touch`);
  ok(hud.length >= 2, `${tag}: HUD present (${ids.join(",")})`);
  const off = [...hud, ...ctx].filter(r => !inside(r, W, H));
  ok(!off.length, `${tag}: HUD inside viewport ${off.map(fmt).join(" ")}`);
  const all = [...hud, ...ctx], clash = [];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (overlap(all[i], all[j], 2)) clash.push(fmt(all[i]) + "x" + fmt(all[j]));
  ok(!clash.length, `${tag}: no HUD overlap ${clash.join(" ")}`);
  const cx = { x: W * 0.3, y: H * 0.3, w: W * 0.4, h: H * 0.4 }, inw = hud.filter(r => overlap(r, cx, 1));
  ok(!inw.length, `${tag}: central 40% clear of HUD ${inw.map(fmt).join(" ")}`);
  const big = hud.filter(r => r.h > 0.36 * H || (r.id !== "compass" && r.id !== "vit" && r.w > 0.34 * W));
  ok(!big.length, `${tag}: no oversized panel ${big.map(fmt).join(" ")}`);
  const area = hud.reduce((s, r) => s + r.w * r.h, 0) / (W * H);
  ok(area < (Math.min(W, H) <= 420 ? 0.16 : 0.12), `${tag}: HUD covers ${(area * 100).toFixed(1)}% of the screen`);
  const mins = await J(`${JSON.stringify(ids)}.map(id => [id, window.__ui.minFont(document.getElementById(id))])`);
  const small = mins.filter(([id, f]) => f < 9 && id !== "vit");
  ok(!small.length, `${tag}: HUD text >= 9px ${JSON.stringify(small)}`);
  const toast = ctx.filter(r => r.id === "toast");
  const lowT = toast.filter(r => r.y + r.h > H * 0.5);
  ok(!lowT.length, `${tag}: toasts stay in the upper half ${lowT.map(fmt).join(" ")}`);
}
const TOUCH_IDS = ["tcStick", "tcSys", "tcTablet", "tcMenu", "tcGas", "tcBrk", "tcHop", "tcLean", "tcWh", "tcHorn", "tcQ", "tcWipe", "tcF", "tcBand", "tcE", "tcReel", "tcUse", "tcOn", "tcX", "tcRifle"];
async function touchChecks(tag, W, H, foot) {
  const sel = TOUCH_IDS.filter(i => !["tcSys", "tcStick"].includes(i)).map(i => "#" + i).join(",");
  const btn = await J(`window.__ui.rects(${JSON.stringify(sel)})`);
  const stick = await J(`window.__ui.rects("#tcStick .ring")`);
  const hud = await J(`window.__ui.rects(${JSON.stringify(HUD_SEL)})`);
  ok(btn.length >= (foot ? 3 : 5), `${tag}: touch buttons shown (${btn.map(r => r.id).join(",")})`);
  const off = [...btn, ...stick].filter(r => !inside(r, W, H));
  ok(!off.length, `${tag}: touch controls inside viewport ${off.map(fmt).join(" ")}`);
  const tiny = btn.filter(r => r.w < 36 || r.h < 36);
  ok(!tiny.length, `${tag}: touch buttons >= 36px ${tiny.map(fmt).join(" ")}`);
  const clash = [];
  for (let i = 0; i < btn.length; i++) {
    for (let j = i + 1; j < btn.length; j++) if (overlap(btn[i], btn[j], 2)) clash.push(fmt(btn[i]) + "x" + fmt(btn[j]));
    for (const s of stick) if (overlap(btn[i], s, 2) && !/^(tcGas|tcBrk)$/.test(btn[i].id)) clash.push(fmt(btn[i]) + "x" + fmt(s));
    for (const h of hud) if (overlap(btn[i], h, 2)) clash.push(fmt(btn[i]) + "x" + fmt(h));
  }
  for (const s of stick) for (const h of hud) if (overlap(s, h, 2)) clash.push(fmt(s) + "x" + fmt(h));
  ok(!clash.length, `${tag}: touch controls overlap nothing ${clash.join(" ")}`);
  const cx = { x: W * 0.4, y: H * 0.3, w: W * 0.2, h: H * 0.4 }, inw = btn.filter(r => overlap(r, cx, 1));
  ok(!inw.length, `${tag}: centre (middle 20% x 40%) clear of touch buttons ${inw.map(fmt).join(" ")}`);
}
async function modalChecks(tag, W, H, id, openJs, closeJs, sfx = "") {
  tag += sfx; await ev(openJs); await sleep(650);
  const p = await J(`window.__ui.rects("#${id}")[0] || null`);
  ok(!!p, `${tag} ${id}: opens`);
  if (p) {
    ok(inside(p, W, H) && p.x >= 3 && p.y >= 3 && p.x + p.w <= W - 3 && p.y + p.h <= H - 3, `${tag} ${id}: inside viewport with margin ${fmt(p)}`);
    const s = await J(`window.__ui.scroll(document.getElementById(${JSON.stringify(id)}))`);
    ok(!s.need || ((s.oy === "auto" || s.oy === "scroll") && s.reach), `${tag} ${id}: fits or scrolls to its end ${JSON.stringify(s)}`);
    const mf = await J(`window.__ui.minFont(document.getElementById(${JSON.stringify(id)}))`);
    ok(mf >= 10, `${tag} ${id}: text >= 10px (min ${mf})`);
    const cl = await J(`(() => { const b = document.querySelector("#${id} #closeSet, #${id} #closeGarage, #${id} .xbtn:not([hidden])"); if (!b) return null; const r = b.getBoundingClientRect(), p = document.getElementById("${id}").getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, id: "close", inP: r.top >= p.top - 1 && r.bottom <= p.bottom + 1 }; })()`);
    ok(!cl || (cl.inP && inside(cl, W, H)), `${tag} ${id}: close button on screen ${cl ? fmt(cl) : "(none)"}`);
    await snap("modal", `${cur[0]}_${id}${sfx.replace(/\W+/g, "_")}`);
  }
  await ev(closeJs); await sleep(300);
}

const SETPG = ["top", "game", "graphics", "sound"];
// ===== run =====
console.log("== A. title ==");
await view(VP[2]);
const ts720 = await J(`+getComputedStyle(document.getElementById("title")).getPropertyValue("--ts")`);
for (const v of VP) { await view(v); await titleChecks(); }
// runtime resize on the title: --ts must follow
await view(VP[2]); const tsA = await J(`+getComputedStyle(document.getElementById("title")).getPropertyValue("--ts")`);
await view(VP[0]); const tsB = await J(`+getComputedStyle(document.getElementById("title")).getPropertyValue("--ts")`);
ok(tsA !== tsB, `title scale follows a runtime resize (--ts ${tsA} at 1280x720 -> ${tsB} at 640x360)`);
await view(VP[9]); const tsP = await J(`+getComputedStyle(document.getElementById("title")).getPropertyValue("--ts")`);
await view(VP[10]); const tsL = await J(`+getComputedStyle(document.getElementById("title")).getPropertyValue("--ts")`);
ok(tsP !== tsL, `title relayouts on orientation flip (portrait --ts ${tsP}, landscape ${tsL})`);
// settings / garage opened from the title menu
for (const v of [VP[0], VP[2], VP[9], VP[10], VP[7]]) {
  await view(v); const [, W, H] = v;
  for (const pg of SETPG) await modalChecks(`title ${v[0]}`, W, H, "settings", `toggleSettings(true, "${pg}"); true`, "toggleSettings(false); true", " page " + pg);
}

console.log("== B. launch ==");
await view(VP[2]);
await ev("titleLaunch(); true"); await sleep(3500);
await ev("tutSkip(); crashCancel(); FOOT.on = false; VEH.cur = null; if (window.TLXC) for (const c of TLXC.cars) TLXC.setAway && TLXC.setAway(c.i, false); true"); await sleep(1500);
await ev(`(() => { const t = document.getElementById("tut"); return true; })()`);

for (const v of VP) {
  await view(v); const [name, W, H, touch] = v;
  await ev("crashCancel(); FOOT.on = false; true"); await sleep(1400);
  await ev(`document.getElementById("toasts").innerHTML = ""; TOASTQ = []; toast("Welcome to Kjøllefjord. Next ferry sails 21:00."); toast("Tutorial skipped. Your sled's right beside you."); true`); await sleep(600);
  await hudChecks(`ride ${name} ${W}x${H}`, W, H, { foot: false, touch });
  if (touch) await touchChecks(`ride ${name} ${W}x${H}`, W, H, false);
  await snap("ride", name);
  await ev("FOOT.on = true; true"); await sleep(1500);
  await ev(`document.getElementById("toasts").innerHTML = ""; TOASTQ = []; toast("Welcome to Kjøllefjord. Next ferry sails 21:00."); toast("Tutorial skipped. Your sled's right beside you."); true`); await sleep(600);
  await hudChecks(`foot ${name} ${W}x${H}`, W, H, { foot: true, touch });
  if (touch) await touchChecks(`foot ${name} ${W}x${H}`, W, H, true);
  await snap("foot", name);
  await ev("FOOT.on = false; true");
}

console.log("== C. modals + tablet ==");
for (const v of VP) {
  await view(v); const [name, W, H, touch] = v;
  await ev("crashCancel(); FOOT.on = false; true"); await sleep(600);
  for (const pg of SETPG) await modalChecks(`ride ${name}`, W, H, "settings", `toggleSettings(true, "${pg}"); true`, "toggleSettings(false); true", " page " + pg);   // the top page and each of Game, Graphics, Sound
  await modalChecks(`ride ${name}`, W, H, "garage", "openGarage(); true", "closeGarage(); true");
  await modalChecks(`ride ${name}`, W, H, "garage", `garageTab = "paint"; openGarage(); true`, `closeGarage(); garageTab = "sleds"; true`, " paint shop");
  // tablet map app
  await ev(`TABLET.toggle(true, "map"); true`); await sleep(900);
  const t = await J(`window.__ui.rects("#tabS")[0] || null`);
  ok(!!t && inside(t, W, H), `tablet ${name} ${W}x${H}: inside viewport ${t ? fmt(t) : "not shown"}`);
  if (t) {
    ok(t.w >= Math.min(W, 560) * 0.4 && t.h >= Math.min(H, 300) * 0.4, `tablet ${name}: not collapsed ${fmt(t)}`);
    const sc = await J(`(() => { const e = document.getElementById("tabS"); return { sw: e.scrollWidth, cw: e.clientWidth }; })()`);
    ok(sc.sw <= sc.cw + 2, `tablet ${name}: no sideways overflow ${JSON.stringify(sc)}`);
  }
  await snap("tablet", name);
  await ev(`TABLET.close(true); true`); await sleep(400);
  if (touch) {   // on foot the tablet is the big overlay, which lays itself out clear of the live touch buttons
    await ev(`FOOT.on = true; true`); await sleep(1500); await ev(`TABLET.toggle(true, "map"); true`); await sleep(900);
    const o = await J(`window.__ui.rects("#tabS")[0] || null`);
    ok(!!o && inside(o, W, H), `tablet(on foot) ${name}: inside viewport ${o ? fmt(o) : "not shown"}`);
    if (o) {
      const bt = await J(`window.__ui.rects("#tcStick .ring, #tcUse, #tcOn, #tcX, #tcE, #tcQ, #tcTablet, #tcMenu")`), c = bt.filter(r => overlap(r, o, 3));
      ok(!c.length, `tablet(on foot) ${name}: clear of touch buttons ${c.map(fmt).join(" ")}`);
      ok(o.w >= Math.min(W, 560) * 0.4 && o.h >= Math.min(H, 300) * 0.4, `tablet(on foot) ${name}: not collapsed ${fmt(o)}`);
    }
    await snap("tablet", `${name}_foot`);
    await ev(`TABLET.close(true); FOOT.on = false; true`); await sleep(500);
  }
  // touch: the MORE sheet
  if (touch) {
    await ev(`sheetOpen(true); true`); await sleep(500);
    const s = await J(`window.__ui.rects("#tcSheet")[0] || null`), tiles = await J(`window.__ui.rects("#tcSheet .tile")`);
    ok(!!s && inside(s, W, H), `more-sheet ${name}: inside viewport ${s ? fmt(s) : "missing"}`);
    ok(tiles.every(r => inside(r, W, H) && r.h >= 36), `more-sheet ${name}: tiles on screen and >= 36px`);
    await snap("modal", `${name}_moresheet`);
    await ev(`sheetOpen(false); true`);
  }
}

console.log("== D. adaptive prompts survive ==");
{
  await view(VP[2]); await ev("FOOT.on = true; true"); await sleep(1200);
  const kb = await J(`({ dev: INP.dev, hint: (document.getElementById("wnHint") || {}).textContent || "", on: btn("mount") })`);
  ok(/^[A-Z]/.test(kb.on) && kb.dev !== "touch", `keyboard player gets key names (dev ${kb.dev}, GET ON = "${kb.on}")`);
  await ev(`INP.dev = "pad"; INP.pad = "ps"; true`);
  const ps = await J(`btn("mount")`); ok(ps === "L1", `PlayStation pad gets its own names (GET ON = "${ps}")`);
  await ev(`INP.dev = "kbm"; true`);
  await view(VP[9]); await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 200, y: 300 }] }); await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(900);
  const tc = await J(`({ dev: INP.dev, on: btn("mount"), hint: (document.getElementById("wnHint") || {}).textContent || "" })`);
  ok(tc.dev === "touch" && !/\b[QEFXRNTMHCVBG]\b[:]|Press [A-Z]\b|key/i.test(tc.on + " " + tc.hint), `touch player gets touch wording (dev ${tc.dev}, GET ON = "${tc.on}", hint "${tc.hint}")`);
  await ev("FOOT.on = false; true");
}

console.log("== E. runtime resize / orientation on the live game ==");
{
  const seq = [VP[2], VP[0], VP[9], VP[10], VP[0], VP[7], VP[3], VP[11], VP[1], VP[4], VP[5], VP[2]];
  await ev("crashCancel(); FOOT.on = false; true");
  let n = 0;
  for (const v of seq) {
    await view(v); const [name, W, H, touch] = v; await sleep(700);
    const g = await J(`({ cw: document.getElementById("gl").clientWidth, ch: document.getElementById("gl").clientHeight, asp: camera.aspect, rw: renderer.getSize(new THREE.Vector2()).x, rh: renderer.getSize(new THREE.Vector2()).y })`);
    ok(g.cw === W && g.ch === H && Math.abs(g.asp - W / H) < 0.01 && g.rw === W && g.rh === H, `resize ${++n} -> ${name} ${W}x${H}: canvas ${g.cw}x${g.ch}, renderer ${g.rw}x${g.rh}, aspect ${g.asp.toFixed(3)}`);
    await hudChecks(`resize ${n} ${name} ${W}x${H}`, W, H, { foot: false, touch });
    if (touch) await touchChecks(`resize ${n} ${name} ${W}x${H}`, W, H, false);
    if (n === 3 || n === 4 || n === 5) await snap("resize", `${n}_${name}`);
  }
  // tablet open across a resize: it must re-layout and stay inside
  await view(VP[2]); await ev(`TABLET.toggle(true, "map"); true`); await sleep(700);
  for (const v of [VP[0], VP[9], VP[10], VP[2]]) {
    await view(v); await sleep(700);
    const t = await J(`window.__ui.rects("#tabS")[0] || null`);
    ok(!!t && inside(t, v[1], v[2]), `open tablet follows resize -> ${v[0]} ${v[1]}x${v[2]} ${t ? fmt(t) : "missing"}`);
  }
  await ev(`TABLET.close(true); true`);
}

console.log("== F. HUD scale setting default ==");
{
  const s = await J(`({ ts: typeof SET.hudScale !== "undefined" ? SET.hudScale : null, tsb: typeof SET.uiScale !== "undefined" ? SET.uiScale : null, root: getComputedStyle(document.documentElement).getPropertyValue("--hud") })`);
  console.log("  settings scale fields:", JSON.stringify(s));
  ok(s.ts === null || s.ts <= 1, "HUD scale default is not above 1");
}

// ---- contact sheets ----
// shelf-packed contact sheet (tiles keep their aspect, rows are as tall as their tallest tile), labelled with the file name
const SHEET_PY = `
import os, sys
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
files = sorted(f for f in os.listdir(d) if f.endswith(".jpg"))
TW, ROWW = 420, 1700
tiles = []
for f in files:
    im = Image.open(os.path.join(d, f)).convert("RGB"); h = im.height * TW / im.width
    if h > 640: sc = 640 / h; im = im.resize((int(TW * sc), 640))
    else: im = im.resize((TW, int(h)))
    ImageDraw.Draw(im).rectangle([0, 0, im.width, 14], fill=(0, 0, 0)); ImageDraw.Draw(im).text((4, 2), f[:-4], fill=(255, 255, 0)); tiles.append(im)
rows, row, x = [], [], 0
for t in tiles:
    if x + t.width > ROWW and row: rows.append(row); row, x = [], 0
    row.append(t); x += t.width + 4
rows.append(row)
H = sum(max(t.height for t in r) + 4 for r in rows)
sheet = Image.new("RGB", (ROWW, H), (20, 20, 20)); y = 0
for r in rows:
    x = 0
    for t in r: sheet.paste(t, (x, y)); x += t.width + 4
    y += max(t.height for t in r) + 4
sheet.save(out, quality=84); print(out)
`;
for (const g of [...new Set(SHOTS.map(s => s[0]))]) {
  const d = path.join(OUT, "sheet_" + g); fs.mkdirSync(d, { recursive: true });
  for (const [gg, f] of SHOTS) if (gg === g) fs.copyFileSync(f, path.join(d, path.basename(f)));
  try { console.log("sheet:", execFileSync("/usr/bin/python3", ["-c", SHEET_PY, d, path.join(OUT, `sheet_${g}.jpg`)]).toString().trim()); } catch (e) { console.log("sheet failed", g, String(e).slice(0, 200)); }
}
console.log(`ui_responsive: ${checks - fails}/${checks} checks passed, ${fails} FAILED`);
await done(fails ? 1 : 0);
