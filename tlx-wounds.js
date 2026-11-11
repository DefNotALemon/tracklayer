// Tracklayer — wounds, bleeding and bandages (11 Nov 2026, loop/LOOP.md Owner note "minimalist HUD + survival stats + bleed/bandage").
//
// A small, OPTIONAL hazard, not a combat system and NOT the Northern Front (G5): out on the open backcountry, far from every
// village, cabin and the quay, with the tutorial and the licence schools done, there is a very small chance per minute of a
// poacher's pot-shot ringing out. No enemy is drawn: a shot cracks, the screen flashes, and a wound registers. Settings > Options
// switches the whole hazard off ("Poachers on the fell", on by default).
//
//  * GS.health 0-100 (an accessor onto the saved state). Each open wound bleeds BLEED hp/s. At most WOUND_CAP open at once.
//  * The health bar only exists while a wound is open: it pours up from the bottom of the screen like blood pooling, taller for
//    each open wound and filled by the health left. With no wound it is hidden and health creeps back.
//  * A bandage (U, D-pad down, the BANDAGE touch button; BTN.bandage) covers ONE open wound, and only if it is still fresh:
//    BANDAGE_WINDOW seconds after the hit. A wound older than that has soaked through and a bandage alone won't stop it: it
//    keeps bleeding until you reach the quay, the garage or the hospital, which treat everything. The count (BANDAGE_MAX at the
//    start) restocks at the quay; there is no shop row for it in v1.
//  * Health 0 uses the game's own failure path (blackout "tow": the Red Cross crew hauls you back to the quay), same as any other
//    defeat (loop/NORTHERN-FRONT.md section 7: "death/defeat follows the game's existing failure rules").
//
// SAVED under x.sys.wounds: { health, wounds: [{ age }], bandages, cd }. An old save starts with full health and no wounds.
// Test hooks: TLX.wounds.hit() forces a wound (the GOD menu "Take a pot-shot" calls it), TLX.wounds.use() uses a bandage.
(() => {
"use strict";
const WOUND_CAP = 3;               // open wounds at once
const BLEED = 0.55;                // health points lost per second per open wound
const BANDAGE_WINDOW = 6;          // seconds after a hit in which a bandage still works: retune here
const BANDAGE_MAX = 3;             // carried; refilled at the quay
const SHOT_PER_MIN = 0.045;        // chance of a pot-shot per minute while it can happen (about one in 22 min)
const SHOT_COOLDOWN = 150;         // seconds after a hit before another can land
const FAR = 600;                   // metres from every site before the fell is "open backcountry"
const REGEN = 1.5;                 // health per second back with no wound open
const HEAL_RATE = 18;              // health per second at the quay, garage or hospital
let api = null, el = null, flash = null, lastN = -1, lastH = -1;
const S = () => TLX.state("wounds");
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

TLX.option({ id: "wounds", name: "Poachers on the fell", hint: "Rarely, far from town, a shot rings out and you start bleeding: bandage it fast (the bandage control) or reach the quay. Off = never." });

function ui() {
  if (el) return;
  const st = document.createElement("style");
  st.textContent = `
  #hpBar{position:fixed;left:50%;bottom:0;z-index:3;width:min(380px,56vw);transform:translate(-50%,115%);transition:transform .7s cubic-bezier(.2,.9,.25,1.1);pointer-events:none;display:grid;justify-items:center;gap:4px}
  #hpBar.on{transform:translate(-50%,0)}
  #hpBar .tank{position:relative;width:100%;height:18px;border-radius:12px 12px 0 0;background:rgba(40,6,8,.55);box-shadow:0 0 0 1px rgba(255,80,70,.25),0 -6px 24px rgba(180,10,10,.25);overflow:hidden;transition:height .5s ease}
  #hpBar .liq{position:absolute;left:0;top:0;bottom:0;width:100%;transform-origin:left center;transition:transform .35s ease-out;
    background:linear-gradient(180deg,#ff4a3d 0,#b3101a 55%,#6b0710 100%)}
  #hpBar .liq::before{content:"";position:absolute;left:-40px;right:-40px;top:-5px;height:10px;
    background:radial-gradient(circle at 10px 10px,#ff6a5a 0 6px,transparent 7px) 0 0/20px 10px repeat-x;animation:hpWave 1.6s linear infinite}
  @keyframes hpWave{to{transform:translateX(20px)}}
  #hpBar .drips{position:absolute;left:0;right:0;bottom:100%;height:0;pointer-events:none}
  #hpBar .drips i{position:absolute;top:2px;width:5px;height:8px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:#c4141f;opacity:0;animation:hpDrip 1.5s ease-in infinite}
  @keyframes hpDrip{0%{transform:translateY(-4px);opacity:0}15%{opacity:.95}100%{transform:translateY(46px);opacity:0}}
  #hpBar .meta{font:800 10px/1 var(--display,sans-serif);letter-spacing:.16em;color:#ffb3aa;text-shadow:0 1px 6px rgba(0,0,0,.8);padding-bottom:5px;display:flex;gap:10px;align-items:center}
  #hpBar .meta b{color:#fff}
  #hpBar .win{height:2px;width:90px;background:rgba(255,255,255,.15);border-radius:2px;overflow:hidden}#hpBar .win i{display:block;height:100%;background:#ffd24a;width:0}
  #hpFlash{position:fixed;inset:0;z-index:5;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(150,0,0,0) 35%,rgba(170,10,10,.75) 100%)}
  #hpFlash.go{animation:hpFlash 1.1s ease-out}
  @keyframes hpFlash{0%{opacity:.95}100%{opacity:0}}
  body.showroom #hpBar{display:none}`;
  document.head.appendChild(st);
  el = document.createElement("div"); el.id = "hpBar"; el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<div class="meta"><span>BLEEDING</span><span class="win" id="hpWin"><i></i></span><span id="hpBand"></span></div><div class="tank"><div class="liq"></div><div class="drips"></div></div>';
  document.body.appendChild(el);
  flash = document.createElement("div"); flash.id = "hpFlash"; document.body.appendChild(flash);
}
function paint(s) {
  ui();
  const n = s.wounds.length, on = n > 0;
  if (el.classList.contains("on") !== on) el.classList.toggle("on", on);
  if (n !== lastN) { lastN = n; el.querySelector(".tank").style.height = (18 + 10 * n) + "px"; const d = el.querySelector(".drips"); d.textContent = ""; for (let i = 0; i < n * 2; i++) { const g = document.createElement("i"); g.style.left = (12 + (i * 37) % 76) + "%"; g.style.animationDelay = (i * 0.37) + "s"; d.appendChild(g); } }
  const f = clamp(s.health / 100, 0, 1);
  if (Math.abs(f - lastH) > 0.003) { lastH = f; el.querySelector(".liq").style.transform = `scaleX(${f.toFixed(3)})`; }
  if (on) {
    const fresh = Math.min(...s.wounds.map(w => w.age)), left = clamp(1 - fresh / BANDAGE_WINDOW, 0, 1);
    el.querySelector("#hpWin i").style.width = (left * 100).toFixed(0) + "%";
    el.querySelector("#hpBand").innerHTML = `<b>${api.btn("bandage")}</b> · ${s.bandages} ${s.bandages === 1 ? "bandage" : "bandages"}`;
  }
}

// can a pot-shot land here and now?
function exposed() {
  const G = api.GS, W = api.world;
  if (!TLX.on("wounds") || !api.started() || G.dead || api.busy() || !api.tutDone() || api.INT.on || api.HELP.on || G.tour || G.garageOpen) return false;
  const x = api.FOOT.on ? api.FOOT.x : api.P.x, z = api.FOOT.on ? api.FOOT.z : api.P.z;
  for (const s of W.SITES) if (Math.hypot(x - s.x, z - s.z) < FAR) return false;
  return true;
}
function hit(force) {
  const s = S(); if (!s) return false;
  if (s.wounds.length >= WOUND_CAP) { api.toast("Another shot whips past. You're already hurt: dress it.", "bad"); return false; }
  s.wounds.push({ age: 0 }); s.cd = SHOT_COOLDOWN;
  api.P.shake = Math.max(api.P.shake || 0, 1);
  try { api.thud(0.9); } catch (e) { }
  if (flash) { flash.classList.remove("go"); void flash.offsetWidth; flash.classList.add("go"); }
  api.toast(`A shot cracks across the fell. You're hit! ${api.btn("bandage")}: bandage it, quickly.`, "bad");
  if (TLX.hud) TLX.hud.poke(0);
  return true;
}
function use() {
  const s = S(), G = api && api.GS; if (!s || !G || G.dead || !api.started()) return false;
  if (!s.wounds.length) { api.toast("Nothing to dress. You're not bleeding."); return false; }
  if (s.bandages <= 0) { api.toast("No bandages left. The quay restocks you.", "warn"); return false; }
  let i = -1, best = -1;                               // the oldest wound that is still fresh enough: it has the least time left
  s.wounds.forEach((w, k) => { if (w.age <= BANDAGE_WINDOW && w.age > best) { best = w.age; i = k; } });
  if (i < 0) { api.toast("Too late for a bandage: it's soaked through. Get to the quay.", "bad"); return false; }
  s.wounds.splice(i, 1); s.bandages--;
  api.toast(s.wounds.length ? `Bandaged one. ${s.wounds.length} still bleeding.` : "Bandaged. The bleeding stops.", "good");
  paint(s); return true;
}

TLX.register({
  id: "wounds", v: 1,
  state0: () => ({ health: 100, wounds: [], bandages: BANDAGE_MAX, cd: 0 }),
  migrate(st, from) { st.health = typeof st.health === "number" ? st.health : 100; if (!Array.isArray(st.wounds)) st.wounds = []; if (typeof st.bandages !== "number") st.bandages = BANDAGE_MAX; return st; },
  init(a) {
    api = a;
    Object.defineProperty(a.GS, "health", { configurable: true, enumerable: false, get: () => { const s = S(); return s ? s.health : 100; }, set: v => { const s = S(); if (s) s.health = clamp(+v || 0, 0, 100); } });
  },
  tick(dt) {
    const s = S(), G = api && api.GS; if (!s || !G) return;
    ui();
    if (!api.started() || dt <= 0) return;
    if (G.dead) { if (s.wounds.length) { s.wounds = []; s.health = 40; } paint(s); return; }
    const W = api.world, here = G.near && (G.near === W.depot || G.near === W.garage()) || api.hospHere(api.P.x, api.P.z, 22) || (api.FOOT.on && api.hospHere(api.FOOT.x, api.FOOT.z, 22));
    if (here) {
      if (s.bandages < BANDAGE_MAX) { s.bandages = BANDAGE_MAX; api.toast(`Restocked: ${BANDAGE_MAX} bandages.`, "good"); }
      if (s.wounds.length) { s.wounds = []; api.toast("Patched up properly. The bleeding's stopped.", "good"); }
      s.health = Math.min(100, s.health + HEAL_RATE * dt);
    }
    if (s.cd > 0) s.cd -= dt;
    if (s.cd <= 0 && exposed() && Math.random() < SHOT_PER_MIN / 60 * dt) hit();
    if (s.wounds.length) {
      for (const w of s.wounds) w.age += dt;
      s.health -= BLEED * s.wounds.length * dt;
      if (s.health <= 0) { s.health = 0; paint(s); api.blackout("tow"); return; }
    } else if (!here && s.health < 100) s.health = Math.min(100, s.health + REGEN * dt);
    paint(s);
  }
});
TLX.wounds = { hit, use, open: () => { const s = S(); return !!s && s.wounds.length > 0; }, exposed: () => api ? exposed() : false,
  consts: { WOUND_CAP, BLEED, BANDAGE_WINDOW, BANDAGE_MAX, SHOT_PER_MIN, SHOT_COOLDOWN, FAR } };
})();
