// Tracklayer: the Camera (goal G7, loop/HOME.md I6). Lift the phone right where you are (riding, walking, in a cab,
// indoors) and look through it in first person while THE WORLD KEEPS RUNNING: the sled still steers and drives, the
// animals still move, the weather still blows. A reticle names what it is on, the zoom goes to 6x, and each shot is
// scored on the subject, how big it is in the frame, how well centred, what it is doing (an animal on the move or
// feeding beats one standing), the light, and whether it is your first of its kind. Shots go to a roll (kept in the
// save, 30 of them, the worst leaves first) and to anybody listening on TLXCAM.onShot (the Field guide, I7).
//   keyboard  K lifts / lowers · the mouse aims · wheel zooms · click or Enter takes the shot
//   pad       hold the right stick in · right stick aims · d-pad up/down zooms · A takes the shot · B or a tap of the stick lowers
//   touch     CAMERA in the Camera app or the chip · drag aims · + and − zoom · the round button takes the shot
(() => {
"use strict";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, TAU = Math.PI * 2;
let api = null, S = null, W = null;
const X = window.TLXCAM = { on: false, yaw: 0, pitch: 0, zoom: 1, focus: null, err: "", onShot: [], flashT: 0, r3: 0, r3Used: false, MAX: 30, last: null };
const KIND = {
  reindeer: { name: "Reindeer", h: 1.3, rare: 30 }, moose: { name: "Moose", h: 2.0, rare: 58 }, fox: { name: "Fox", h: 0.45, rare: 68 }, hare: { name: "Mountain hare", h: 0.32, rare: 46 },
  lemming: { name: "Lemming", h: 0.1, rare: 50 }, ermine: { name: "Stoat", h: 0.16, rare: 78 }, bear: { name: "Bear", h: 1.3, rare: 92 },
  person: { name: "", h: 1.75, rare: 16 }, skier: { name: "", h: 1.75, rare: 22 }, place: { name: "", h: 14, rare: 12 }, aurora: { name: "Northern lights", h: 0, rare: 55 }, view: { name: "The view", h: 0, rare: 4 }
};
X.KIND = KIND;

/* ---------------- what is in front of the lens ---------------- */
const eye = { x: 0, y: 0, z: 0 }, fwd = { x: 0, y: 0, z: 1 };
function candidates() {
  const out = [];
  try { for (const G of api.wild.groups()) { if (G.state === "dead") continue; const K = KIND[G.kind]; if (!K) continue; for (const q of G.m) { if (q.dead) continue; const s = q.g.scale.x || 1; out.push({ kind: G.kind, name: (s < 0.7 ? (G.kind === "bear" ? "Bear cub" : G.kind === "moose" ? "Moose calf" : K.name) : K.name), x: q.x, z: q.z, h: K.h * s, pose: G.state === "flee" || G.state === "charge" ? "running" : G.state === "warn" ? "facing you" : (q.v || 0) > 0.4 || G.state === "walk" ? "on the move" : (q.graze || 0) > 0.5 ? "feeding" : "standing", grp: G.m.length }); } } } catch (e) { }
  const F = window.TLXFOLK; if (F && F.cast) for (const c of F.cast) out.push({ kind: "person", name: c.p.name || c.p.first, x: c.x, z: c.z, h: 1.75 * (c.sc || 1), pose: c.act === "shovel" ? "shovelling" : c.act === "play" ? "playing" : c.act === "errand" ? "walking" : c.act === "work" ? "working" : "standing", pid: c.p.id });
  const T = window.TLXSK; if (T && T.shown) { try { for (const s of T.shown()) out.push({ kind: "skier", name: s.name || "A skier", x: s.x, z: s.z, h: 1.75, pose: "skiing" }); } catch (e) { } }
  for (const s of W.SITES || []) if (s.x !== undefined && s.name) out.push({ kind: "place", name: s.name, x: s.x, z: s.z, h: s.type === "depot" ? 30 : 12, pose: "", far: true });
  for (const s of W.LOOKOUTS || []) if (s.x !== undefined && s.name) out.push({ kind: "place", name: s.name, x: s.x, z: s.z, h: 10, pose: "", far: true });
  return out;
}
function seen(c, y) {                                                                                       // is the ground in the way?
  for (let i = 1; i < 8; i++) { const k = i / 8, x = lerp(eye.x, c.x, k), z = lerp(eye.z, c.z, k); if (W.surf(x, z) > lerp(eye.y, y, k) + 0.3) return false; } return true;
}
function find() {
  const fovV = api.camera.fov * Math.PI / 180, lim = fovV * 0.34; let best = null, bs = 1e9;
  for (const c of candidates()) {
    const gy = W.surf(c.x, c.z), cy = gy + c.h * 0.55, dx = c.x - eye.x, dy = cy - eye.y, dz = c.z - eye.z, d = Math.hypot(dx, dy, dz); if (d < 0.6 || d > (c.far ? 2500 : 420)) continue;
    const ang = Math.acos(clamp((dx * fwd.x + dy * fwd.y + dz * fwd.z) / d, -1, 1)); if (ang > lim) continue;
    const size = 2 * Math.atan(c.h / 2 / d) / fovV; if (size < (c.far ? 0.03 : 0.022)) continue; if (!seen(c, gy + c.h)) continue;
    const sc = ang / lim + (c.far ? 0.6 : 0) - Math.min(0.4, size); if (sc < bs) { bs = sc; best = Object.assign(c, { dist: d, size, off: ang / lim }); }
  }
  if (!best) { const au = aurora(); if (au > 0.25 && fwd.y > 0.22) best = { kind: "aurora", name: "Northern lights", x: eye.x, z: eye.z, dist: 0, size: 0.5, off: 0, pose: au > 0.6 ? "dancing" : "", au }; }
  return best;
}
function aurora() { try { const a = api.gram.aur(); return a ? +(a.k !== undefined ? a.k : a.on || a.level || 0) || 0 : 0; } catch (e) { return 0; } }
// the score, 0..100, and what made it
function score(f) {
  const el = api.sunEl(api.GS.hour % 24), storm = api.GS.storm || 0, K = KIND[f ? f.kind : "view"], parts = {};
  parts.subject = f ? K.rare : 4;
  parts.size = !f ? 0 : f.kind === "aurora" ? 14 : Math.round(20 * clamp(f.size < 0.3 ? f.size / 0.3 : f.size > 0.85 ? 1 - (f.size - 0.85) * 2 : 1, 0, 1));
  parts.centre = !f ? 0 : Math.round(10 * (1 - clamp(f.off, 0, 1)));
  parts.pose = !f ? 0 : /running|facing|dancing/.test(f.pose) ? 16 : /move|feeding|skiing|shovel|play|working|walking/.test(f.pose) ? 10 : 2;
  parts.light = f && f.kind === "aurora" ? 12 : el > 0 && el < 9 ? 14 : el >= 9 ? 9 : el > -6 ? 7 : aurora() > 0.3 ? 9 : 2; parts.light = Math.round(parts.light * (1 - 0.6 * clamp(storm, 0, 1)));
  parts.first = f && f.kind !== "place" && f.kind !== "person" && f.kind !== "skier" && !S.best[f.kind] ? 12 : f && f.kind === "place" && !S.places[f.name] ? 8 : 0;
  // the subject is worth what you made of it: a speck at the edge of the frame earns little of its rarity
  const made = f ? clamp((parts.size / 20) * 0.75 + (parts.centre / 10) * 0.25, 0.15, 1) : 1;
  const total = clamp(Math.round(parts.subject * 0.42 * made + parts.size + parts.centre + parts.pose + parts.light + parts.first), 1, 100);
  return { total, parts, stars: total >= 80 ? 5 : total >= 62 ? 4 : total >= 44 ? 3 : total >= 26 ? 2 : 1 };
}
X.score = score;

/* ---------------- the lens ---------------- */
function body() {                                                                                           // where your eyes are, and which way your body faces
  const F = api.FOOT, P = api.P, V = api.veh && api.veh.cur;
  if (api.INT && api.INT.on) return null; if (V) return null;
  if (F.on) return { x: F.x, y: Math.max(F.y || 0, W.surf(F.x, F.z) - 0.4) + 1.62, z: F.z, yaw: F.yaw };
  const r = api.sled.root.position; return { x: r.x + Math.sin(P.yaw) * 0.05, y: r.y + 1.52, z: r.z + Math.cos(P.yaw) * 0.05, yaw: P.yaw };
}
const _q = { e: null, base: 0 };
function aim() {
  const cam = api.camera, TH = api.THREE, b = body(); if (!_q.e) _q.e = new TH.Euler(0, 0, 0, "YXZ");
  if (b) { const yaw = b.yaw + X.yaw, cp = Math.cos(X.pitch); fwd.x = Math.sin(yaw) * cp; fwd.y = Math.sin(X.pitch); fwd.z = Math.cos(yaw) * cp; eye.x = b.x; eye.y = b.y; eye.z = b.z; cam.position.set(eye.x, eye.y, eye.z); cam.lookAt(eye.x + fwd.x * 50, eye.y + fwd.y * 50, eye.z + fwd.z * 50); if (api.FOOT.on && api.FOOT.g) api.FOOT.g.visible = false; }
  else { _q.e.setFromQuaternion(cam.quaternion); _q.e.y += X.yaw; _q.e.x = clamp(_q.e.x + X.pitch, -1.2, 1.2); _q.e.z = 0; cam.quaternion.setFromEuler(_q.e); cam.getWorldDirection(_v()); fwd.x = _vv.x; fwd.y = _vv.y; fwd.z = _vv.z; eye.x = cam.position.x; eye.y = cam.position.y; eye.z = cam.position.z; }
  const fov = (b ? 62 : cam.fov) / X.zoom; if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); } cam.updateMatrixWorld();
}
let _vv = null; const _v = () => _vv || (_vv = new api.THREE.Vector3());
X.aimAt = (x, y, z) => { const b = body(); if (!b) return false; const dx = x - b.x, dy = y - b.y, dz = z - b.z; let a = Math.atan2(dx, dz) - b.yaw; while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; X.yaw = a; X.pitch = Math.atan2(dy, Math.hypot(dx, dz)); return true; };

/* ---------------- the overlay ---------------- */
let ov = null, lab = null, hint = null, zl = null, chip = null;
const css = `#camHud{position:fixed;inset:0;z-index:5;pointer-events:none;font:600 12px/1.25 'Barlow Semi Condensed',system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.8)}
#camHud[hidden]{display:none}#camHud .fr{position:absolute;inset:7vh 9vw;border:1px solid rgba(255,255,255,.28);border-radius:4px}
#camHud .cn{position:absolute;width:22px;height:22px;border:2px solid #fff}#camHud .cn.a{left:-1px;top:-1px;border-right:0;border-bottom:0}#camHud .cn.b{right:-1px;top:-1px;border-left:0;border-bottom:0}#camHud .cn.c{left:-1px;bottom:-1px;border-right:0;border-top:0}#camHud .cn.d{right:-1px;bottom:-1px;border-left:0;border-top:0}
#camHud .ret{position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border:1.5px solid rgba(255,255,255,.75);border-radius:50%;transition:border-color .15s,transform .15s}#camHud .ret.on{border-color:#ffb347;transform:scale(1.25)}
#camHud .lab{position:absolute;left:50%;top:calc(50% + 30px);transform:translateX(-50%);white-space:nowrap;font-size:13px;color:#ffd9a0}
#camHud .zl{position:absolute;right:calc(9vw + 8px);top:calc(7vh + 6px);font-size:13px}#camHud .cnt{position:absolute;left:calc(9vw + 8px);top:calc(7vh + 6px);font-size:12px;opacity:.9}
#camHud .hint{position:absolute;left:50%;bottom:calc(7vh + 6px);transform:translateX(-50%);white-space:nowrap;font-size:11.5px;opacity:.92;max-width:80vw;overflow:hidden;text-overflow:ellipsis}
#camHud .res{position:absolute;left:50%;top:calc(50% - 66px);transform:translateX(-50%);padding:4px 10px;border-radius:8px;background:rgba(10,16,22,.78);font-size:13px;white-space:nowrap;opacity:0;transition:opacity .25s}
#camHud .fl{position:absolute;inset:0;background:#fff;opacity:0}
#camHud .tb{position:absolute;pointer-events:auto;border:0;border-radius:50%;background:rgba(255,255,255,.2);color:#fff;font:700 18px system-ui;width:46px;height:46px;-webkit-tap-highlight-color:transparent;touch-action:none}
#camHud .tb.sh{right:max(14px,env(safe-area-inset-right));top:50%;margin-top:-32px;width:64px;height:64px;background:rgba(255,255,255,.85);border:4px solid rgba(255,255,255,.4);background-clip:padding-box}
#camHud .tb.zi{right:max(88px,calc(env(safe-area-inset-right) + 74px));top:50%;margin-top:-52px}#camHud .tb.zo{right:max(88px,calc(env(safe-area-inset-right) + 74px));top:50%;margin-top:6px}#camHud .tb.cl{left:max(14px,env(safe-area-inset-left));top:max(10px,env(safe-area-inset-top));font-size:15px}
#camChip{position:fixed;left:max(10px,env(safe-area-inset-left));top:38%;z-index:4;border:0;border-radius:10px;padding:8px 10px;background:rgba(14,22,30,.6);color:#fff;font:700 11px 'Barlow Semi Condensed',system-ui,sans-serif;letter-spacing:.06em;touch-action:none}#camChip[hidden]{display:none}`;
function build() {
  if (ov) return; const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  ov = document.createElement("div"); ov.id = "camHud"; ov.hidden = true;
  ov.innerHTML = `<div class="fr"><i class="cn a"></i><i class="cn b"></i><i class="cn c"></i><i class="cn d"></i></div><div class="ret"></div><div class="lab"></div><div class="zl"></div><div class="cnt"></div><div class="res"></div><div class="hint"></div><div class="fl"></div><button type="button" class="tb sh" aria-label="Take the picture"></button><button type="button" class="tb zi" aria-label="Zoom in">+</button><button type="button" class="tb zo" aria-label="Zoom out">−</button><button type="button" class="tb cl" aria-label="Put the camera away">✕</button>`;
  document.body.appendChild(ov); lab = ov.querySelector(".lab"); hint = ov.querySelector(".hint"); zl = ov.querySelector(".zl");
  const tap = (sel, f) => ov.querySelector(sel).addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); f(); });
  tap(".sh", shoot); tap(".zi", () => zoomBy(1.35)); tap(".zo", () => zoomBy(1 / 1.35)); tap(".cl", close);
  chip = document.createElement("button"); chip.id = "camChip"; chip.type = "button"; chip.textContent = "CAMERA"; chip.hidden = true; document.body.appendChild(chip); chip.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); open(); });
  // a drag anywhere on the picture aims (touch and mouse-drag); the mouse alone aims by where it is
  let drag = null;
  addEventListener("pointerdown", e => { if (!X.on || e.target.closest("#camHud .tb")) return; if (e.pointerType === "mouse") { if (e.button === 0 && api.INP.dev !== "touch" && !e.target.closest("button,a,input,#tablet")) shoot(); return; } if (e.target.closest(".tc,button")) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; }, true);
  addEventListener("pointermove", e => { if (!X.on) return; if (e.pointerType === "mouse") { X.yaw = -((e.clientX / innerWidth) - 0.5) * 2 * 1.75; X.pitch = -((e.clientY / innerHeight) - 0.5) * 2 * 0.75; return; } if (drag && drag.id === e.pointerId) { const k = 0.0045 / Math.sqrt(X.zoom); X.yaw = clamp(X.yaw - (e.clientX - drag.x) * k, -2.6, 2.6); X.pitch = clamp(X.pitch - (e.clientY - drag.y) * k, -0.9, 1.1); drag.x = e.clientX; drag.y = e.clientY; } }, true);
  addEventListener("pointerup", e => { if (drag && drag.id === e.pointerId) drag = null; }, true); addEventListener("pointercancel", () => { drag = null; }, true);
  addEventListener("wheel", e => { if (!X.on) return; zoomBy(Math.exp(-e.deltaY * 0.0016)); }, { passive: true });
  addEventListener("keydown", e => {
    if (!api || !api.started() || e.repeat || (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
    if (e.code === "KeyK") { if (X.on) close(); else open(); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (!X.on) return;
    if (e.code === "Enter") { shoot(); e.preventDefault(); e.stopImmediatePropagation(); } else if (e.code === "Escape") { close(); e.preventDefault(); e.stopImmediatePropagation(); }
    else if (e.code === "BracketRight" || e.code === "Equal") zoomBy(1.35); else if (e.code === "BracketLeft" || e.code === "Minus") zoomBy(1 / 1.35);
  }, true);
}
const zoomBy = k => { X.zoom = clamp(X.zoom * k, 1, 6); };
const can = () => api.started() && api.tutDone() && !api.GS.dead && !api.busy() && !(api.shopOpen && api.shopOpen()) && !api.GS.garageOpen;
function open() { if (X.on || !can()) return false; build(); if (api.tablet()) api.TABLET.close(true); X.on = true; X.yaw = 0; X.pitch = 0; X.zoom = 1; ov.hidden = false; document.body.classList.add("camon"); return true; }
function close() { if (!X.on) return; X.on = false; X.focus = null; if (ov) ov.hidden = true; document.body.classList.remove("camon"); if (api.FOOT.g && api.FOOT.on) api.FOOT.g.visible = true; }
X.open = open; X.close = close;

/* ---------------- the shot ---------------- */
let thumbCv = null;
function thumb() {
  try { if (!thumbCv) { thumbCv = document.createElement("canvas"); thumbCv.width = 240; thumbCv.height = 135; } const r = api.renderer, src = r.domElement; r.render(api.scene, api.camera); const c = thumbCv.getContext("2d"), a = src.width / src.height, w = a > 16 / 9 ? src.height * 16 / 9 : src.width, h = a > 16 / 9 ? src.height : src.width * 9 / 16; c.drawImage(src, (src.width - w) / 2, (src.height - h) / 2, w, h, 0, 0, 240, 135); return thumbCv.toDataURL("image/jpeg", 0.62); } catch (e) { X.err = "thumb: " + e; return ""; }
}
function click() { try { const a = api.audio(); if (!a || !a.AC) return; const AC = a.AC, t = AC.currentTime, n = AC.sampleRate * 0.05, b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3) * (i < n * 0.25 || i > n * 0.55 ? 1 : 0.15); const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = b; g.gain.value = 0.35; s.connect(g); g.connect(a.master || AC.destination); s.start(t); } catch (e) { } }
function shoot() {
  if (!X.on) return null; const now = performance.now(); if (now - X.flashT < 450) return null; X.flashT = now;
  aim(); const f = find(), sc = score(f), G = api.GS;
  const ph = { id: ++S.n, t: G.hour, kind: f ? f.kind : "view", name: f ? f.name : "The view", pose: f ? f.pose || "" : "", dist: f ? Math.round(f.dist) : 0, score: sc.total, stars: sc.stars, parts: sc.parts, x: Math.round(f && f.kind !== "aurora" ? f.x : eye.x), z: Math.round(f && f.kind !== "aurora" ? f.z : eye.z), zoom: +X.zoom.toFixed(1), img: thumb() };
  if (f && f.pid) ph.pid = f.pid;
  const first = sc.parts.first > 0, prev = S.best[ph.kind];
  if (!prev || ph.score > prev.score) S.best[ph.kind] = { score: ph.score, id: ph.id, t: ph.t }; if (ph.kind === "place") S.places[ph.name] = Math.max(S.places[ph.name] || 0, ph.score);
  S.roll.push(ph); S.taken = (S.taken || 0) + 1;
  while (S.roll.length > X.MAX) { let wi = 0; for (let i = 1; i < S.roll.length - 1; i++) if (!S.roll[i].keep && (S.roll[wi].keep || S.roll[i].score < S.roll[wi].score)) wi = i; S.roll.splice(wi, 1); }
  click(); if (ov) { const fl = ov.querySelector(".fl"), rs = ov.querySelector(".res"); fl.style.transition = "none"; fl.style.opacity = "0.85"; requestAnimationFrame(() => { fl.style.transition = "opacity .35s"; fl.style.opacity = "0"; }); rs.textContent = `${ph.name}${ph.pose ? ", " + ph.pose : ""} · ${"★".repeat(ph.stars)}${"☆".repeat(5 - ph.stars)} ${ph.score}${first ? " · first one!" : prev && ph.score > prev.score ? " · your best" : ""}`; rs.style.opacity = "1"; clearTimeout(X._rt); X._rt = setTimeout(() => { rs.style.opacity = "0"; }, 2600); }
  X.last = ph; for (const cb of X.onShot) { try { cb(ph, f); } catch (e) { X.err = "onShot: " + e; } }
  try { if (window.TLXHAP && TLXHAP.pulse) TLXHAP.pulse(0.25, 0.5, 60); } catch (e) { }
  api.save(); return ph;
}
X.shoot = shoot; X.roll = () => S ? S.roll : []; X.find = () => { aim(); return find(); };

/* ---------------- the pad, and each frame ---------------- */
const pp = {};
function pad(dt) {
  const gp = (api.pads ? api.pads() : (navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []))[0]; if (!gp) { X.r3 = 0; return; }
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), edge = i => { const v = b(i), e = v && !pp[i]; pp[i] = v; return e; };
  // hold the right stick in to lift the camera (a tap still changes the view: the base game asks claimR3 on release)
  if (b(11)) { X.r3 += dt; if (X.r3 > 0.32 && !X.r3Used) { X.r3Used = true; if (X.on) close(); else open(); } } else X.r3 = 0;
  if (!X.on) { pp[0] = b(0); pp[1] = b(1); pp[12] = b(12); pp[13] = b(13); return; }
  const dz = v => Math.abs(v) < 0.14 ? 0 : (v - Math.sign(v) * 0.14) / 0.86, rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0), rate = 1.9 / Math.sqrt(X.zoom);
  X.yaw = clamp(X.yaw - rx * Math.abs(rx) * rate * dt, -2.6, 2.6); X.pitch = clamp(X.pitch - ry * Math.abs(ry) * rate * 0.7 * dt, -0.9, 1.1);
  if (b(12)) zoomBy(1 + 1.6 * dt); if (b(13)) zoomBy(1 - 1.4 * dt);
  if (edge(0)) shoot(); if (edge(1)) close();
}
// the base game asks this when the right stick is let go: true means the camera used that press, so do not change the view
X.claimR3 = () => { if (X.r3Used) { X.r3Used = false; return true; } if (X.on) { close(); return true; } return false; };
function tick(dt) {
  if (chip) chip.hidden = !(api.touch() && can() && !X.on && !api.tablet()); else if (api.touch()) build();
  pad(dt);
  if (!X.on) return; if (!can() || api.tablet()) { close(); return; }
  aim(); X.focus = find();
  const f = X.focus, d = api.INP.dev; ov.querySelector(".ret").classList.toggle("on", !!f);
  lab.textContent = f ? `${f.name}${f.pose ? " · " + f.pose : ""}${f.dist ? " · " + (f.dist < 1000 ? Math.round(f.dist) + " m" : (f.dist / 1000).toFixed(1) + " km") : ""}` : "";
  zl.textContent = X.zoom.toFixed(1) + "x"; ov.querySelector(".cnt").textContent = `${S.roll.length}/${X.MAX}`;
  hint.textContent = d === "touch" ? "drag to aim · + − zoom · the round button takes it" : d === "pad" ? `${api.btn("shutter")}: take it · right stick: aim · d-pad up/down: zoom · B: put it away` : `${api.btn("shutter")}: take it · mouse: aim · wheel: zoom · ${api.btn("camera")}: put it away`;
  for (const el of ov.querySelectorAll(".tb")) el.style.display = d === "touch" ? "" : "none";
}

/* ---------------- the app ---------------- */
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.500-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.600"/></svg>';
const when = h => { const d = Math.floor(h / 24), hh = ((h % 24) + 24) % 24; return `day ${d + 1}, ${String(Math.floor(hh)).padStart(2, "0")}:${String(Math.floor(hh % 1 * 60)).padStart(2, "0")}`; };
function render(el) {
  const Ui = api.ui, R = S.roll.slice().reverse(), bestN = Object.keys(S.best).length;
  let h = Ui.tabHead("CAMERA", `${S.roll.length} of ${X.MAX} on the roll`, `${S.taken || 0} taken`);
  h += `<div class="tnote2" style="margin:4px 0 8px">Lift the camera anywhere and the world keeps going. The reticle names what it is on. <b>${Ui.esc(api.btn("camera"))}</b> lifts it without opening the tablet.</div>`;
  h += `<div style="margin:0 0 10px"><button type="button" class="tbtn" data-tf="cam:open" data-act="cam:open">LIFT THE CAMERA</button></div>`;
  h += Ui.sec("The roll", R.length ? `newest first · the weakest leaves when it is full · ${bestN} ${bestN === 1 ? "kind" : "kinds"} of subject` : "nothing yet");
  h += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:6px">` + R.map(p => `<div class="tcard" data-tf="ph:${p.id}" style="display:block;padding:0;overflow:hidden"><div style="aspect-ratio:16/9;background:#0b1218 center/cover no-repeat;${p.img ? `background-image:url(${p.img})` : ""}"></div><div style="padding:4px 6px 6px"><div style="font-weight:700;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Ui.esc(p.name)}</div><div style="font-size:10.5px;opacity:.8">${"★".repeat(p.stars)}${"☆".repeat(5 - p.stars)} ${p.score} · ${Ui.esc(when(p.t))}</div><div style="margin-top:4px;display:flex;gap:4px"><button type="button" style="padding:2px 7px;font:700 10px inherit;letter-spacing:.05em;border:1px solid rgba(255,255,255,.25);border-radius:6px;background:${p.keep ? "rgba(255,122,58,.35)" : "transparent"};color:inherit" data-act="keep:${p.id}">${p.keep ? "KEPT" : "KEEP"}</button><button type="button" style="padding:2px 7px;font:700 10px inherit;letter-spacing:.05em;border:1px solid rgba(255,255,255,.25);border-radius:6px;background:transparent;color:inherit" data-act="del:${p.id}">DELETE</button></div></div></div>`).join("") + `</div>`;
  el.innerHTML = h;
  for (const b of el.querySelectorAll("[data-act]")) b.addEventListener("click", () => { const [a, id] = b.dataset.act.split(":"); if (a === "cam") { api.TABLET.close(true); setTimeout(open, 60); return; } const i = S.roll.findIndex(p => p.id === +id); if (i < 0) return; if (a === "keep") S.roll[i].keep = !S.roll[i].keep; else if (a === "del") S.roll.splice(i, 1); api.save(); render(el); });
}
TLX.register({
  id: "camera", v: 1, state0: () => ({ roll: [], best: {}, places: {}, n: 0, taken: 0 }),
  init(a) {
    api = a; W = a.world; S = TLX.state("camera"); if (!Array.isArray(S.roll)) S.roll = []; for (const k of ["best", "places"]) if (!S[k] || typeof S[k] !== "object" || Array.isArray(S[k])) S[k] = {}; if (!(S.n >= 0)) S.n = 0;
    S.roll = S.roll.filter(p => p && typeof p === "object" && p.id && typeof p.name === "string");
    a.TABLET.register({ id: "camera", name: "Camera", icon: ICON, order: 1.6, render }); build();
  },
  tick(dt) { try { tick(dt); } catch (e) { if (!X.err) { X.err = String(e && e.stack || e); console.error("TLX camera", e); } } }
});
})();
