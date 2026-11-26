// Tracklayer: the Gram app's face. Two tabs: Local (the land's posts, one per screen, snap scrolling, newest first) and Reels (full height in the same phone column).
// Pictures are drawn ahead of the reader (the next two posts) by the shot engine in tlx-gram.js; until one is ready a blurred painted gradient of the same recipe holds its place, so nothing jumps.
(() => {
"use strict";
const UI = { ready: false };
let api = null, G = null, hooked = false;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TABH = 38;
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1" fill="currentColor"/></svg>';
const CSS = `#tabS .gcol{margin:0 auto;display:flex;flex-direction:column;overflow:hidden;position:relative;background:#0b141d}
#tabS .gtabs{display:flex;gap:6px;padding:4px 6px;height:${TABH}px;box-sizing:border-box;flex:none;background:#0e1a25;align-items:center}#tabS .gtabs .tml{flex:1;text-align:center;padding:5px 4px}#tabS .gtabs .tml.on{background:var(--band);border-color:var(--bandline)}#tabS .gtabs .ghint{font-size:10px;color:var(--frost2);text-align:right;flex:2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tabS .gsn{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scroll-snap-type:y mandatory;overscroll-behavior:contain;touch-action:pan-y;scrollbar-width:none}#tabS .gsn::-webkit-scrollbar{display:none}
#tabS .gpo{height:100%;scroll-snap-align:start;scroll-snap-stop:always;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;position:relative}
#tabS .gph{display:flex;align-items:center;gap:8px;padding:5px 8px;flex:none}#tabS .gav{flex:none;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.4)}
#tabS .gwho{min-width:0;flex:1}#tabS .gwho b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#tabS .gwho span{display:block;font-size:11px;color:var(--frost2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#tabS .gchip{font-style:normal;font-size:9px;letter-spacing:.06em;margin-left:6px;padding:1px 5px;border-radius:99px;background:rgba(160,210,255,.16);color:#bfe2ff;vertical-align:1px}
#tabS .gpw{flex:none;position:relative;overflow:hidden;background:#0c1620}#tabS .gpw canvas{display:block;width:100%;height:100%}#tabS .gpw canvas.ph{filter:blur(7px);transform:scale(1.08)}
#tabS .gtx{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:16px;box-sizing:border-box;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.35)}#tabS .gtx i{font-style:normal;font-size:30px;margin-bottom:10px}#tabS .gtx p{margin:0;font-size:17px;line-height:1.3;font-weight:600}
#tabS .gft{flex:1;min-height:0;padding:4px 9px 6px;overflow:hidden}#tabS .glk{font-size:12px;font-weight:700;color:#e8f1f8}#tabS .gcap{font-size:12px;line-height:1.3;margin-top:2px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
#tabS .gcm{font-size:11px;line-height:1.25;color:var(--frost2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#tabS .gcm b{color:#cfe0ee}
#tabS .gall{display:inline-block;margin-top:2px;padding:1px 0;border:0;background:none;color:#8fc4f0;font:inherit;font-size:11px;cursor:pointer}#tabS .gall.tfoc{outline:1px solid var(--bandline);outline-offset:2px;border-radius:4px}
#tabS .gsheet{position:absolute;left:0;right:0;bottom:0;top:${TABH}px;background:#0b141d;display:flex;flex-direction:column;z-index:3}#tabS .gsheet .gshl{flex:1;overflow-y:auto;padding:4px 10px}#tabS .gsheet .gshh{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;font-size:12px;font-weight:700}
#tabS .gmsg{display:flex;gap:8px;margin:7px 0}#tabS .gmb b{font-size:12px}#tabS .gmb i{font-style:normal;font-size:10px;color:var(--frost2);margin-left:6px}#tabS .gmb p{margin:1px 0 0;font-size:12px;line-height:1.3}#tabS .gmb .gre{font-size:10px;color:var(--frost2)}
#tabS .gempty{padding:22px;text-align:center;color:var(--frost2);font-size:13px}`;
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const who = id => G.who(id);
function avatar(p) {
  if (!p) return `<span class="gav" style="background:#46586a">N</span>`;
  const ini = ((p.first || "?")[0] + ((p.last || "")[0] || "")).toUpperCase(), hue = p.id === "you" ? 205 : Math.floor(G.hash01("av" + p.id) * 360);
  return `<span class="gav" style="background:hsl(${hue},48%,40%)">${esc(ini)}</span>`;
}
function ago(t) { const d = api.GS.hour - t; if (d < 0.02) return "now"; if (d < 1) return Math.max(1, Math.round(d * 60)) + " min ago"; if (d < 24) return Math.round(d) + " h ago"; const D = Math.floor(d / 24); return D < 2 ? "yesterday" : D + " d ago"; }
UI.ago = ago;

/* ---- pictures ---- */
function makePic(post) {
  const [w, h] = G.dims(), cv = document.createElement("canvas"); cv.width = w; cv.height = h; let real = false; const t0 = performance.now();
  if (!api.GFX.low && !G.forcePaint && post.rc) { try {
    let r = G.shotInto(post.rc, cv, post.lb || 0), m = r && G.measure(cv, r.E);                                 // the real picture is measured too: too dark is re-lit, still too dark is dropped, never posted
    for (const b of [1.8, 2.6]) { if (!r || (m.mean >= G.FLOOR.mean + 3 && m.sub >= G.FLOOR.sub - 8)) break; r = G.shotInto(post.rc, cv, b); m = r && G.measure(cv, r.E); if (r && m.mean >= G.FLOOR.mean + 3) post.lb = b; }
    if (r && m.mean < G.FLOOR.mean) { post.dead = 1; G.lumDrops = (G.lumDrops || 0) + 1; r = null; }
    real = !!r; } catch (e) { real = false; console.error("TLX gram shot", e); G.err = String(e && e.stack || e); } }
  if (!real) { cv.getContext("2d").clearRect(0, 0, w, h); G.paintPic(post, cv); G.painted = (G.painted || 0) + 1; } else { G.renders = (G.renders || 0) + 1; (G.renderMs = G.renderMs || []).push(Math.round(performance.now() - t0)); if (G.renderMs.length > 80) G.renderMs.shift(); }
  const e = { cv, real, id: post.id, w, h }; G.cache.set(post.id, e); if (G.cache.size > 40) G.cache.delete(G.cache.keys().next().value); return e;
}
const isText = p => p.k.slice(0, 4) === "txt:";

/* ---- layout ---- */
const inner = el => { const cs = getComputedStyle(el), f = k => parseFloat(cs[k]) || 0; return [(el.clientWidth || 360) - f("paddingLeft") - f("paddingRight"), (el.clientHeight || 400) - f("paddingTop") - f("paddingBottom")]; };
function geom(el) {
  const [iw, ih] = inner(el), H = Math.max(240, Math.floor(ih)), W = Math.max(200, Math.floor(iw)), avail = H - TABH, ph0 = avail - 38 - 84;
  const pw = Math.floor(clamp(Math.min(W, ph0 * 0.8), 170, 430)), ph = Math.floor(pw * 1.25);
  return { H, W, avail, pw, ph };
}
const hint = () => `${esc(api.btn("scroll"))}: scroll · ${esc(api.btn("pick"))}: comments`;
const tabsHTML = tab => `<div class="gtabs"><button type="button" class="tml${tab === "local" ? " on" : ""}" data-tf="gt:local" data-gt="local">Local${G.unseen() ? ` <b>${G.unseen()}</b>` : ""}</button><button type="button" class="tml${tab === "reels" ? " on" : ""}" data-tf="gt:reels" data-gt="reels">Reels${window.TLXRL && TLXRL.unseen() ? ` <b>${TLXRL.unseen()}</b>` : ""}</button><span class="ghint">${hint()}</span></div>`;
function list() {
  // newest first by the hour; within an hour the posts nearest the player come first. Then the order is eased so that the same kind, the same family three times, or the same place
  // does not sit close together (a feed ranks, it does not just sort): each pick is the earliest of the next 14 that does not repeat what was just shown.
  const P = api.P || {}, px = P.x || 0, pz = P.z || 0, d = p => p.rc && p.rc.x ? Math.hypot(p.rc.x - px, p.rc.z - pz) : 99999;
  const src = G.localPosts().slice().sort((a, b) => Math.floor(b.t) - Math.floor(a.t) || d(a) - d(b) || b.t - a.t || b.id - a.id).slice(0, 110), out = [], fam = p => { const r = window.TLXGK && TLXGK.kinds[p.k]; return r ? r.fam : "text"; };
  while (src.length && out.length < 90) {
    const rk = out.slice(-5).map(p => p.k), rp = out.slice(-4).map(p => p.place).filter(Boolean), rf = out.slice(-2).map(fam), rc = out.slice(-60).map(p => p.cap), tx = out.slice(-4).filter(p => p.k.slice(0, 4) === "txt:").length;
    const rf5 = out.slice(-5).map(fam); let pick = -1, first = -1; for (let i = 0; i < Math.min(14, src.length); i++) { const p = src[i]; if (rk.includes(p.k) || (p.place && rp.includes(p.place)) || rc.includes(p.cap) || (tx >= 2 && p.k.slice(0, 4) === "txt:") || (rf.length > 1 && rf[0] === rf[1] && fam(p) === rf[0] && fam(p) !== "text")) continue; if (first < 0) first = i; if (fam(p) === "text" || !rf5.includes(fam(p))) { pick = i; break; } }
    if (pick < 0) pick = first;
    if (pick < 0) pick = 0; out.push(src.splice(pick, 1)[0]);
  }
  return out;
}
UI.list = list;
function postHTML(p, g, i) {
  const per = p.who === "you" ? null : who(p.who), handle = per ? "@" + per.handle : "@nordkinn", row = window.TLXGK && TLXGK.kinds[p.k], chip = row ? row.chip : "";
  const head = `<div class="gph">${avatar(per)}<div class="gwho"><b>${esc(handle)}${chip ? `<i class="gchip">${esc(chip)}</i>` : ""}</b><span>${esc(p.place || "the Nordkinn")} · ${ago(p.t)}</span></div></div>`;
  let pic;
  if (isText(p)) { const hue = p.tx ? p.tx.h : 200; pic = `<div class="gpw gtx" style="width:${g.pw}px;height:${g.ph}px;background:linear-gradient(155deg,hsl(${hue},55%,38%),hsl(${(hue + 40) % 360},60%,22%))"><i>${esc(p.tx ? p.tx.i : "")}</i><p>${esc(p.cap)}</p></div>`; }
  else pic = `<div class="gpw" style="width:${g.pw}px;height:${g.ph}px"><canvas class="ph" data-gp="${p.id}" width="36" height="45"></canvas></div>`;
  const cm = p.cm.slice(0, 2).map(([pid, t]) => { const c = who(pid); return `<div class="gcm"><b>${esc(c ? c.first : "?")}</b> ${esc(t)}</div>`; }).join("");
  const cap = isText(p) ? "" : `<div class="gcap"><b>${esc(per ? per.first : "Nordkinn")}</b> ${esc(p.cap)}</div>`;
  return `<section class="gpo" data-id="${p.id}" data-i="${i}">${head}<div style="margin:0 auto">${pic}</div><div class="gft"><div class="glk">♥ ${p.lk || 0}</div>${cap}${cm}${p.cm.length ? `<button type="button" class="gall" data-tf="gc:${p.id}" data-gc="${p.id}">View all ${p.cm.length} comments</button>` : ""}</div></section>`;
}

/* ---- the Local tab ---- */
function paintHolder(cv, p) { try { cv.width = 36; cv.height = 45; G.paintPic(p, cv, true); } catch (e) { } }
function setCur(i) {
  const L = UI.cur; if (!L || !L.length) return; i = clamp(i, 0, L.length - 1); const ch = i !== G.view.cur; G.view.cur = i;
  const p = L[i], s = G.S(); if (s && p) { const mx = Math.max(...L.slice(0, i + 1).map(q => q.id)); if (mx > s.seen) s.seen = mx; }
  if (ch && p && api.TABLET.open && p.cm.length) api.TABLET.focus = "gc:" + p.id;
  if (ch) { const f = api.TABLET.focusables(); f.forEach(el => el.classList.toggle("tfoc", el.dataset.tf === api.TABLET.focus)); }
}
function renderLocal(el) {
  const g = geom(el), L = list(); UI.cur = L; UI.g = g; G.view.cur = clamp(G.view.cur || 0, 0, Math.max(0, L.length - 1));
  const body = L.length ? L.map((p, i) => postHTML(p, g, i)).join("") : `<div class="gempty">Nothing posted yet. Give the morning a minute.</div>`;
  el.innerHTML = `<div class="gcol" style="height:${g.H}px;width:${Math.min(g.W, g.pw)}px">${tabsHTML("local")}<div class="gsn" id="gSn">${body}</div></div>`;
  const sn = el.querySelector("#gSn"); if (!sn) return; UI.sn = sn;
  for (const cv of sn.querySelectorAll("canvas[data-gp]")) { const p = L.find(q => q.id === +cv.dataset.gp); if (p) { const e = G.picOf(p.id); if (e) fillCv(cv, e); else paintHolder(cv, p); } }
  sn.scrollTop = G.view.cur * sn.clientHeight; UI.h = sn.clientHeight;
  let raf = 0; sn.addEventListener("scroll", () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const h = sn.clientHeight || 1; UI.h = h; UI.lastScroll = performance.now();
    if (UI.tgt !== undefined && performance.now() - UI.tgtT < 1800) { if (Math.abs(sn.scrollTop - UI.tgt * h) < 3) { const t = UI.tgt; UI.tgt = undefined; setCur(t); } return; }   // a key's smooth scroll is in flight: the post it is heading for is already current, the ones it passes are not
    UI.tgt = undefined; setCur(Math.round(sn.scrollTop / h)); }); });
  for (const b of el.querySelectorAll("[data-gc]")) b.addEventListener("click", () => openSheet(+b.dataset.gc));
  for (const b of el.querySelectorAll("[data-gt]")) b.addEventListener("click", () => UI.setTab(b.dataset.gt));
  const p = L[G.view.cur]; if (p && p.cm.length) api.TABLET.focus = "gc:" + p.id;
  if (G.view.sheet) openSheet(G.view.sheet, true);
}
function fillCv(cv, e) { cv.width = e.w; cv.height = e.h; cv.getContext("2d").drawImage(e.cv, 0, 0); cv.classList.remove("ph"); cv.dataset.done = e.real ? "real" : "paint"; }
function openSheet(id) {
  const col = document.querySelector("#tabS .gcol"), p = G.posts().find(q => q.id === id); if (!col || !p) return;
  const old = col.querySelector(".gsheet"); if (old) old.remove(); G.view.sheet = id; const per = p.who === "you" ? null : who(p.who);
  const cms = p.cm.map(([pid, t, re]) => { const c = who(pid), rp = re >= 0 && p.cm[re] ? who(p.cm[re][0]) : null; return `<div class="gmsg">${avatar(c)}<div class="gmb"><b>${esc(c ? c.first + " " + (c.last || "") : "?")}</b>${rp ? `<div class="gre">↩ ${esc(rp.first)}</div>` : ""}<p>${esc(t)}</p></div></div>`; }).join("");
  const d = document.createElement("div"); d.className = "gsheet"; d.innerHTML = `<div class="gshh"><span>${esc(per ? "@" + per.handle : "")} · ${p.cm.length} comments</span><button type="button" class="tml" data-tf="gs:close" id="gsClose">Close</button></div><div class="gshl" id="gShl"><div class="gcap" style="margin:4px 0 8px;-webkit-line-clamp:unset">${esc(p.cap)}</div>${cms}</div>`;
  col.appendChild(d); d.querySelector("#gsClose").addEventListener("click", closeSheet); api.TABLET.focus = "gs:close"; api.TABLET.paintFocus(false);
}
function closeSheet() { const d = document.querySelector("#tabS .gsheet"); if (d) d.remove(); const id = G.view.sheet; G.view.sheet = 0; if (id > 0) api.TABLET.focus = "gc:" + id; else if (id < 0) api.TABLET.focus = "rl:v"; api.TABLET.paintFocus(false); }
UI.openSheet = openSheet; UI.closeSheet = closeSheet;
UI.scrollTo = (i, smooth) => { const sn = UI.sn; if (!sn || !document.body.contains(sn)) return false; const L = UI.cur || []; i = clamp(i, 0, L.length - 1); UI.tgt = smooth === false ? undefined : i; UI.tgtT = performance.now(); sn.scrollTo({ top: i * sn.clientHeight, behavior: smooth === false ? "auto" : "smooth" }); return true; };
UI.go = n => { const L = UI.cur || [], i = clamp(G.view.cur + n, 0, L.length - 1); if (i === G.view.cur) return false; UI.scrollTo(i); setCur(i); return true; };
UI.setTab = tab => { if (window.TLXRL && tab !== "reels") TLXRL.stop(); G.view.tab = tab; G.view.sheet = 0; if (api.TABLET.open && api.TABLET.app === "gram") { api.TABLET.focus = tab === "reels" ? "rl:v" : null; api.TABLET.render(); } };

/* ---- the Reels tab (the player is in tlx-reels.js) ---- */
function renderReels(el) {
  const [iw, ih] = inner(el), H = Math.max(240, Math.floor(ih)), W = Math.max(200, Math.floor(iw)), bw = Math.min(W, Math.floor((H - TABH) * 9 / 16));
  if (window.TLXRL && TLXRL.ready) { el.innerHTML = ""; const box = document.createElement("div"); el.appendChild(box); TLXRL.renderTab(box, { tabs: tabsHTML("reels"), tabsH: TABH, height: H, avatar, ago }); const c = box.querySelector(".gcol"); if (c) c.style.width = bw + "px"; for (const b of box.querySelectorAll("[data-gt]")) b.addEventListener("click", () => UI.setTab(b.dataset.gt)); return; }
  el.innerHTML = `<div class="gcol" style="height:${H}px">${tabsHTML("reels")}<p class="gempty">Reels are not available.</p></div>`;
  for (const b of el.querySelectorAll("[data-gt]")) b.addEventListener("click", () => UI.setTab(b.dataset.gt));
}
function render(el) { if (G.view.tab === "reels") renderReels(el); else renderLocal(el); }

/* ---- drawing pictures ahead ---- */
let busy = false, gap = 0;
const calm = () => { const P = api.P || {}, sp = Math.hypot(P.vx || 0, P.vz || 0); return !(api.MNT && api.MNT.on) && !(api.DMT && api.DMT.on) && !(api.HELP && api.HELP.on) && !(api.INT && api.INT.on) && (api.FOOT.on || sp < 14); };
UI.wantPics = () => api.TABLET.open && api.TABLET.app === "gram" && G.view.tab === "local" && !!UI.sn;
UI.renderNext = () => {
  const sn = UI.sn, L = UI.cur; if (!sn || !L) return false;
  for (let i = G.view.cur; i <= G.view.cur + 2 && i < L.length; i++) {
    const p = L[i]; if (isText(p)) continue; const cv = sn.querySelector(`canvas[data-gp="${p.id}"]`); if (!cv || cv.dataset.done) continue;
    const e = G.picOf(p.id) || makePic(p); fillCv(cv, e); return true;
  }
  return false;
};
UI.tick = dt => {
  if (!UI.wantPics() || busy) return; gap -= dt; if (gap > 0) return; if (!calm()) return; if (G.fpsOk === false) return;
  busy = true; gap = 0.12; try { UI.renderNext(); } catch (e) { console.error("TLX gram render", e); G.err = String(e && e.stack || e); } busy = false;
};
UI.onPost = () => { UI.dirty = true; };
UI.makePic = makePic;

/* ---- the app ---- */
UI.install = a => {
  api = a; G = window.TLXGR; G.ui = UI;
  if (!document.getElementById("gramCss")) { const st = document.createElement("style"); st.id = "gramCss"; st.textContent = CSS; document.head.appendChild(st); }
  if (hooked) return; hooked = true;
  const TB = a.TABLET, mv = TB.move;
  TB.move = function (dx, dy) {
    try {
      if (this.open && this.app === "gram" && dy) {
        if (G.view.sheet) { const l = document.getElementById("gShl"); if (l) { l.scrollTop += dy * 60; return; } }
        else if (G.view.tab === "local") { UI.go(dy > 0 ? 1 : -1); return; }
      }
    } catch (e) { console.error("TLX gram nav", e); }
    return mv.call(this, dx, dy);
  };
  TB.register({ id: "gram", name: "Gram", icon: ICON, order: 5.7, hidden: () => !G.ready, badge: () => G.unseen() || "",
    render, onOpen() { G.view.sheet = 0; G.view.cur = 0; UI.dirty = false; },
    onBack() { if (G.view.sheet) { closeSheet(); return true; } return false; } });
};
UI.afterInit = () => { };
window.TLXGRUI = UI;
})();
