// Tracklayer — the road kit (G8 RD1, 27 Nov 2026). ONE road model for every road in the game: Kjøllefjord's streets
// (tracklayer.js townRoads) and the roads between places (tlx-roads.js). Loaded before tlx-roads.js; window.TLXRK.
//
// Lemon: "completely redo the road design ... drop the curbs too, make the roads look much nicer, you can make them look
// more worn down, but realistic is my main priority" / "I want the road model entirely replaces" / "no more curbs".
// The old town ribbon + kerbs + caps + grates + canvas texture are gone, and the network roads (which were only a plowed
// snow channel) get their first surface.
//
// WHAT A ROAD IS HERE. A road is a centre line (any kind: "fv" a fylkesvei, "main" / "street" in a village, "lane"), cut
// into a ribbon with a real cross-section, 19 columns across: a crowned asphalt carriageway, a gravel shoulder that falls
// away, then (winter) the plow bank. No kerb exists: the asphalt breaks down into gravel, then the snow. The ribbon is a
// DRAPE over surf(): every column sits within a few cm of the snow/ground surface (never floating, never sunk), the
// centre height is smoothed along the line (no stair steps over terrain cells), the edge columns wobble so no edge is a
// ruler line. All surface detail (aggregate, wheel paths, cracks, sealed cracks, patches, frost heave, markings, sand,
// the winter's packed snow with bare wheel tracks, ice, grit, the plow bank's dirty road side) is made per pixel by one
// shader from WORLD coordinates and road-local (u across, s along) coordinates, so nothing is a tiled texture and nothing
// repeats; every layer fades to its mean as the pixel footprint grows (no moire).
//
// JUNCTIONS. Roads are ranked (kind, then length). A lower road that meets or crosses a higher one is CUT where it
// would lie on the higher road's asphalt, its end is projected onto the higher road's edge line (one continuous
// surface, no overlap) and flared on a corner radius; the higher road's shoulder, bank and edge line open in the mouth.
// A road that just ends gets a rounded turning place and its surface gives way to gravel. A road that runs along
// another (a shared trunk) is cut and tapers away instead of doubling.
//
// HEIGHT LIVES IN THE MESH, so it is re-draped (a few chunks a frame, nearest first) when the melt moves, a stretch's
// road snow changes (TLXRK.touch) or the plow cuts. Beyond ~40 m a vertex rides up to the far terrain's own height
// (far mesh = ground + fresh snow on an 8 m grid, which would bury a plowed trench): the vertex shader eases it.
//
// API: TLXRK.init(api) once; TLXRK.add({ id, kind, pts, snow(s) -> 0..1, mark }); TLXRK.build(); TLXRK.touch(id, s0, s1);
// TLXRK.poles(list) -> InstancedMesh; TLXRK.tick(dt); TLXRK.roads / chunks / stats; TLXRK.ring(road, i) for tests.
(() => {
"use strict";
const RK = { roads: [], chunks: [], meshes: [], junctions: [], ready: false, stats: { rings: 0, verts: 0, chunks: 0, ms: 0, redrapes: 0, cuts: 0, abuts: 0, merges: 0, ends: 0 } };
window.TLXRK = RK;
let api = null, THREE = null, W = null, MAT = null, MATP = null, lowQ = false, poleMat = null;
const DS = 2, CH = 48;                                       // ring spacing (m), rings per chunk
const KINDS = {
  fv:     { hw: 3.1, sh: 0.9, crown: 0.036, pri: 3, R: 6.0, ridge: 0.34, mark: 3 },   // a fylkesvei: 6.2 m of asphalt, centre + edge lines
  main:   { hw: 2.4, sh: 0.5, crown: 0.028, pri: 2, R: 4.5, ridge: 0.26, mark: 1 },   // a village's main street: a faint dashed centre line
  street: { hw: 2.4, sh: 0.5, crown: 0.028, pri: 2, R: 4.5, ridge: 0.26, mark: 0 },   // side streets: no markings
  lane:   { hw: 1.7, sh: 0.4, crown: 0.02, pri: 1, R: 4.0, ridge: 0.2, mark: 0 }
};
RK.KINDS = KINDS;
const OUTER = [0.45, 1.0, 1.55, 2.15, 2.85, 3.6];            // columns beyond the asphalt edge, as a share of the kind's shoulder (first two) then metres past it
const FRAC = [0, 0.34, 0.67, 1.0];
const NC = 1 + 2 * (FRAC.length - 1 + OUTER.length);          // 19
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
function vnoise(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; }
const strHash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h; };

/* ---------------- the surface shader ---------------- */
const GLSL_HELP = `
varying vec4 vRd; varying vec4 vEx; varying vec4 vFx; varying vec3 vWP;
#ifdef RK_PATCH
varying vec4 vPa; varying vec4 vPb;
#endif
uniform float uWinter; uniform float uWet; uniform float uDry;
float rkh(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float rkn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(rkh(i), rkh(i + vec2(1.0, 0.0)), f.x), mix(rkh(i + vec2(0.0, 1.0)), rkh(i + vec2(1.0, 1.0)), f.x), f.y); }
float rkCrisp(float a, float n, float k){ float f = a + (n - 0.5) * k; float w = max(fwidth(f) * 0.8, 0.02); return smoothstep(0.5 - w, 0.5 + w, f); }
#ifndef RK_LOW
vec2 rkv(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 o = vec2(rkh(i + g), rkh(i + g + 17.3)); vec2 r = g + o - f; float d = dot(r, r); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return sqrt(vec2(d1, d2)); }
#endif
vec3 rkPerturb(vec3 sp, vec3 sn, vec2 dh){ vec3 sx = dFdx(sp), sy = dFdy(sp); vec3 r1 = cross(sy, sn), r2 = cross(sn, sx); float det = dot(sx, r1); vec3 g = sign(det) * (dh.x * r1 + dh.y * r2); return normalize(abs(det) * sn - g); }
float rkRough; vec2 rkDH; float rkAlpha;
void rkSurface(inout vec3 col) {
  float U = vRd.x, S = vRd.y, au = abs(U), hw = vRd.w, side = U < 0.0 ? -1.0 : 1.0;
  float sh = vFx.w;
  float st = vRd.z, wk = uWinter;
  vec2 wp = vWP.xz;
  float fp = max(length(fwidth(wp)), 0.0008);                // metres per pixel
  float gF = 1.0 - smoothstep(0.012, 0.06, fp), mF = 1.0 - smoothstep(0.12, 0.7, fp), lF = 1.0 - smoothstep(0.5, 3.0, fp);
  float joint = max(0.0, -vFx.x), endK = max(0.0, vFx.x);
  float jf = 1.0 - joint * 0.9, jc = 1.0 - joint * 0.95;
  float tw = 0.0, wdP = 9.0;
#ifdef RK_PATCH
  // a junction patch: wheel wear follows the turning arcs round each corner fillet (centre and radius per vertex), nothing else of the road-local coordinates
  if (vPa.w > 0.0) { vec2 dc = vPa.xy; float rr = length(dc); vec2 vv = -dc / max(rr, 0.001); vec2 e1 = vPb.xy, e2 = vPb.zw; float tot = acos(clamp(dot(e1, e2), -1.0, 1.0));
    float a1 = acos(clamp(dot(vv, e1), -1.0, 1.0)), a2 = acos(clamp(dot(vv, e2), -1.0, 1.0));
    float ins = 1.0 - smoothstep(tot - 0.02, tot + 0.3, a1 + a2); tw = ins * smoothstep(0.0, 0.3, min(a1, a2) / max(tot, 0.1));
    wdP = min(abs(rr - (vPa.z + 0.5)), abs(rr - (vPa.z + 1.75))); }
  jf = 0.08 + 0.92 * tw;
#endif
  // ---- the edge: broken, never a ruler line
  float nA = rkn(vec2(S * 0.7, side * 3.7)), nB = rkn(vec2(S * 2.7 + 9.0, side * 5.1)), nC = rkn(vec2(S * 8.0 + 3.0, side * 1.3));
  float wob = ((nA - 0.5) * 0.34 + (nB - 0.5) * 0.2 + (rkn(vec2(S * 0.13, side * 6.3 + 1.0)) - 0.5) * 0.36 - smoothstep(0.68, 0.82, nC) * 0.12) * (1.0 - 0.8 * joint);
  float lapN = smoothstep(0.48, 0.78, rkn(vec2(S * 0.23, side * 9.0 + 2.0)) * 0.7 + rkn(vec2(S * 0.9, side * 3.0)) * 0.3);   // snow lapping over the edge, in places
  float lap = lapN * uWinter * (1.0 - 0.6 * joint);
  float o = au - (hw + wob);
  float asphalt = 1.0 - smoothstep(-0.03, 0.07 + fp, o - lap * 0.4 + (nC - 0.5) * 0.08);
  // the fade into the snow is a crisp, irregular outline (noise-thresholded coverage, one pixel of anti-aliasing), never a soft alpha:
  // a soft alpha on the MSAA target (alphaToCoverage) becomes the fixed, regular dither mask of the sample pattern and reads as a screen.
  // Coverage comes first: a fragment that is not road leaves before any of the surface is made.
  float shE = sh + (nB - 0.5) * 0.3;
  float aSh = (1.0 - smoothstep(shE - 0.28, shE + 0.1, o)) * vEx.z;
  float bk = wk * smoothstep(0.05, 0.55, o) * (1.0 - smoothstep(sh + 1.15, sh + 2.55 + nA * 0.5, o)) * vEx.z * (0.75 + 0.25 * smoothstep(0.3, 0.6, rkn(wp * 0.9)));
  float fnA = rkn(wp * 0.7 + 3.0) * 0.55 + rkn(wp * 0.17) * 0.45 + (rkn(wp * 2.6) - 0.5) * 0.3 * (1.0 - smoothstep(0.1, 0.5, fp));
  float aShC = rkCrisp(aSh * (1.0 - 0.6 * wk * smoothstep(0.1, 0.5, o)), fnA, 0.7), bkC = rkCrisp(bk, fnA, 0.9);
  float alpha = max(asphalt, max(aShC, bkC));
  if (endK > 0.0) alpha *= 1.0 - rkCrisp(smoothstep(0.62, 1.0, endK), fnA, 0.9);
  alpha *= 1.0 - rkCrisp(smoothstep(0.6, 1.0, st * wk), fnA, 0.5);
  if (alpha < 0.012) discard;
  // ---- aged asphalt, grey not black
  float tone = rkn(wp * 0.04) * 0.5 + rkn(wp * 0.19) * 0.3 + rkn(wp * 0.83) * 0.2;
  vec3 asp = vec3(0.19, 0.192, 0.2) * (0.66 + tone * 0.74);
  asp = mix(asp, asp * vec3(1.06, 1.0, 0.9), rkn(wp * 0.027));            // oxidised, a warmer grey here and there
  asp *= 1.0 + mF * (rkn(wp * 3.1) - 0.5) * 0.22;
  float g1 = rkh(floor(wp * 210.0)), g2 = rkh(floor(wp * 90.0) + 7.0);
  asp *= 1.0 + gF * ((g1 - 0.5) * 0.4 + (g2 - 0.5) * 0.2);
  asp += gF * step(0.988, g1) * 0.13 + gF * step(0.99, g2) * 0.06;
  // polished darker wheel paths in each lane
  float lc = hw * 0.5, wo = min(0.78, lc - 0.2);                       // lane centre, half the wheel track
  float wom = wo * (0.6 + 0.4 * smoothstep(0.2, 0.8, rkn(vec2(S * 0.045, side * 1.3 + 4.0))));   // the two tracks drift together and apart
  float aw = au + (rkn(vec2(S * 0.09, side * 4.0)) - 0.5) * 0.55 + (rkn(vec2(S * 0.37, side * 2.0 + 8.0)) - 0.5) * 0.22;   // drivers do not hold a line
  float wd = min(abs(aw - (lc - wom)), abs(aw - (lc + wom)));
#ifdef RK_PATCH
  wd = wdP;
#endif
  float polish = exp(-wd * wd / (2.0 * 0.052)) * (0.5 + 0.5 * rkn(vec2(S * 0.3, side * 2.0 + au))) * smoothstep(hw - 0.1, hw - 0.6, au) * jf;
  float oil = exp(-(au - lc) * (au - lc) / (2.0 * 0.02)) * smoothstep(0.45, 0.8, rkn(vec2(S * 0.35, side * 7.0))) * jf;
  asp *= 1.0 - polish * 0.3 * (0.5 + 0.5 * mF) - oil * 0.22;
  asp *= 1.0 + 0.12 * smoothstep(0.0, 0.5, au - lc) * (1.0 - smoothstep(lc + wo, hw, au)) * 0.0;
  // sand, dust and gravel strewn toward the edges
  vec3 grv = vec3(0.37, 0.335, 0.285) * (0.7 + 0.6 * rkn(wp * 4.0) + gF * (rkh(floor(wp * 70.0)) - 0.5) * 0.7);
  float dw = min(1.0, hw * 0.26);                                          // how far in from the edge the sand and gravel reach (a narrow street has less of it)
  float dust = smoothstep(hw - dw, hw + 0.05, au) * (0.3 + 0.6 * nB);
  asp = mix(asp, grv, dust * 0.5 * asphalt);
  asp = mix(asp, grv, step(0.92, rkh(floor(wp * 36.0))) * gF * smoothstep(hw - dw * 1.4, hw, au) * 0.5);
  float crk = 0.0, seal = 0.0, rkPatch = 0.0, pedge = 0.0;
  // ---- cracks (alligator cracking in the wheel paths), sealed long cracks, transverse cracks
#ifndef RK_LOW
  if (fp < 0.45) { vec2 q = wp * 1.15 + 2.2 * vec2(rkn(wp * 0.4), rkn(wp * 0.4 + 5.0)); vec2 vo = rkv(q); float cw = max(0.007, fp * 1.15 * 1.1);
    float line = 1.0 - smoothstep(cw * 0.3, cw, vo.y - vo.x);
    crk = line * smoothstep(0.45, 0.75, rkn(wp * 0.07)) * smoothstep(0.1, 0.8, polish * 1.3 + (rkn(wp * 0.21) - 0.55) * 1.4) * jc * (1.0 - smoothstep(0.12, 0.5, fp)); }
#endif
  if (fp < 1.4) { float ci = floor(S / 17.0), f = S / 17.0 - ci, uc = (rkh(vec2(ci, 3.3)) - 0.5) * hw * 1.7 + (rkn(vec2(S * 0.22, ci)) - 0.5) * 0.9; float d = abs(U - uc), w = 0.03 + 0.03 * rkh(vec2(ci, 5.5));
    seal = (1.0 - smoothstep(w * 0.5, w + fp, d)) * step(0.4, rkh(vec2(ci, 9.1))) * smoothstep(0.0, 0.08, f) * (1.0 - smoothstep(0.82, 0.97, f)) * jc * (1.0 - smoothstep(0.3, 1.2, fp)); }
  if (fp < 1.4) { float ri = floor(S / 8.0), lp = S - ri * 8.0, tg = 1.0 + rkh(vec2(ri, 2.7)) * 6.0, d = abs(lp - tg - U * 0.2 - (rkn(vec2(S * 1.3, U)) - 0.5) * 0.25);
    crk += (1.0 - smoothstep(0.012, 0.03 + fp, d)) * step(0.62, rkh(vec2(ri, 4.4))) * (1.0 - smoothstep(0.5, 1.0, au / hw + rkh(vec2(ri, 6.0)) * 0.5)) * jc * (1.0 - smoothstep(0.3, 1.2, fp)); }
  // ---- rkPatch repairs of a different tone, with a sealed border
  if (fp < 1.6) { float pi_ = floor(S / 12.0), lane = U > 0.0 ? 1.0 : 0.0, k = pi_ + lane * 311.0;
    if (rkh(vec2(k, 1.0)) > 0.7) { float hx = 1.0 + 2.0 * rkh(vec2(k, 2.0)), hy = 0.45 + 0.8 * rkh(vec2(k, 3.0));
      float cs = pi_ * 12.0 + hx + 0.3 + (12.0 - 2.0 * hx - 0.6) * rkh(vec2(k, 4.0)), cu = side * (hw * 0.5 + (rkh(vec2(k, 5.0)) - 0.5) * (hw * 0.7));
      float pr = max(abs(S - cs) / hx, abs(U - cu) / hy) + (rkn(vec2(S * 1.9, U * 1.9)) - 0.5) * 0.28;
      rkPatch = 1.0 - step(1.0, pr); pedge = smoothstep(0.9, 1.0, pr) * (1.0 - step(1.045, pr)); rkPatch *= jc; pedge *= jc; } }
  float rkPt = rkh(vec2(floor(S / 12.0) + (U > 0.0 ? 311.0 : 0.0), 7.0)) < 0.5 ? 0.84 : 1.16;
  asp = mix(asp, asp * rkPt * (1.0 + gF * (g2 - 0.5) * 0.3), rkPatch);
  asp *= 1.0 - 0.5 * (crk * asphalt) * (1.0 - 0.5 * lF) - 0.55 * seal - 0.32 * pedge * (1.0 - smoothstep(0.3, 1.0, fp));
  // ---- faded, partly worn-away markings (a yellow centre line, white edge lines)
  float mk = vEx.w, cov = 0.0; vec3 paint = vec3(0.0);
  if (mk > 0.5) {
    bool solid = (mk > 1.5 && mk < 2.5) || mk > 3.5, edges = mk > 2.5;
    float dashOn = solid ? 1.0 : step(fract(S / 12.0), 0.3);
    float cl = (1.0 - smoothstep(0.06, 0.075 + fp, au)) * dashOn * vFx.z;
    float el = 0.0; if (edges) { float em = U < 0.0 ? vEx.x : vEx.y; el = (1.0 - smoothstep(0.06, 0.075 + fp, abs(au - (hw - 0.3)))) * em; }
    float wear = smoothstep(0.34, 0.66, rkn(vec2(S * 0.33, U * 1.7 + side)) * 0.5 + rkn(wp * 1.6) * 0.3 + rkn(vec2(S * 3.0, U * 3.0)) * 0.2);
    float broke = 0.55 + 0.45 * smoothstep(0.25, 0.6, rkh(floor(wp * 55.0)) + (1.0 - gF) * 0.35);
    cov = max(cl, el) * mix(0.1, 0.8, wear) * broke * (1.0 - 0.7 * polish) * (0.5 + 0.5 * smoothstep(0.2, 0.5, rkn(vec2(S * 0.5, side * 3.0))));
    paint = cl >= el ? vec3(0.56, 0.44, 0.1) : vec3(0.6, 0.6, 0.58);
  }
  asp = mix(asp, paint, cov * 0.78 * (1.0 - 0.35 * crk));
  float rAsp = 0.9 - 0.3 * polish + 0.08 * (rkn(wp * 0.5) - 0.5);
  rAsp = mix(rAsp, 0.36, clamp(seal * 0.8 + pedge * 0.5, 0.0, 1.0));
  asp *= 1.0 - 0.28 * uWet; rAsp = mix(rAsp, 0.24, uWet * (0.75 + 0.25 * polish));
  // ---- the winter: packed snow and ice over the carriageway, bare wheel tracks, a ridge between and at the edges
  float trk = exp(-wd * wd / (2.0 * 0.06)) * (0.55 + 0.45 * rkn(vec2(S * 0.14, side * 2.0 + au) + wp * 0.05)) * jf;
  float cover = 0.5 + (rkn(wp * 0.17) - 0.5) * 0.7 + (rkn(wp * 0.09 + vec2(1.0, 2.0)) - 0.5) * 0.55 + (rkn(vec2(S * 0.07, U * 0.6)) - 0.5) * 0.5 * (1.0 - joint) + st * 0.9;
  float ridgeB = smoothstep(0.36, 0.64, rkn(vec2(S * 0.21, 1.7)) * 0.75 + rkn(wp * 0.5) * 0.3);
  cover += 0.42 * exp(-U * U / 0.3) * ridgeB * (1.0 - 0.9 * joint) + (0.1 + 0.62 * lapN) * smoothstep(hw * 0.5, hw, au);
  cover *= 1.0 - 0.95 * trk * (1.0 - st) * smoothstep(0.2, 0.5, rkn(vec2(S * 0.11, au * 0.8 + side * 5.0)));
  float sm = smoothstep(0.45, 0.62, cover * wk + (rkn(wp * 1.7) - 0.5) * 0.3 * wk + (rkn(wp * 6.0) - 0.5) * 0.08 * mF);
  float grit = gF * smoothstep(0.82, 0.92, rkn(wp * 60.0)) * 0.7;
  vec3 snowC = mix(vec3(0.86, 0.885, 0.93), vec3(0.42, 0.40, 0.38), clamp(0.2 + 0.6 * trk + 0.4 * rkn(wp * 0.55) + grit + 0.3 * smoothstep(hw - 0.9, hw, au) + 0.25 * rkn(vec2(S * 0.9, au * 5.0)) * (1.0 - joint) + joint * 0.34 * (0.35 + 0.65 * rkn(wp * 1.9)), 0.0, 1.0));
  float iceP = smoothstep(0.64, 0.8, rkn(wp * 0.31 + vec2(5.0, 1.0)) * 0.7 + rkn(wp * 1.3) * 0.3) * wk * (1.0 - 0.6 * smoothstep(0.7, 1.0, st));   // glazed ice patches, dark with a sheen
  snowC = mix(snowC, vec3(0.3, 0.33, 0.38), iceP * 0.7);
  float ice = trk * (1.0 - st) * smoothstep(0.3, 0.7, rkn(wp * 0.23)) * wk * (1.0 - sm);
  asp *= 1.0 - 0.3 * ice * (0.6 + 0.4 * wk);
  // ---- shoulder and plow bank, outside the asphalt
  float dirt = 1.0 - smoothstep(0.1, sh + 1.8, o);
  vec3 slush = mix(vec3(0.34, 0.32, 0.30), vec3(0.43, 0.35, 0.26), 0.7 * smoothstep(0.3, 0.8, rkn(wp * 0.37 + 4.0)));
  vec3 bankC = mix(vec3(0.8, 0.83, 0.88), slush, clamp(dirt * (0.75 + 0.55 * rkn(vec2(S * 0.9, o * 3.0) + wp * 0.05)) + dirt * 0.5 * rkn(vec2(S * 0.12, o * 9.0)) + gF * smoothstep(0.8, 0.9, rkn(wp * 55.0)) * 0.5, 0.0, 1.0));
  vec3 outC = mix(grv, bankC, wk * smoothstep(0.0, 0.5, o) * 0.9 + wk * 0.1);
  outC = mix(outC, mix(vec3(0.7, 0.72, 0.76), bankC, 0.4), lap * (1.0 - smoothstep(0.0, 0.9, o)) * 0.85);       // the lap of snow beyond the asphalt edge
  // compose
  vec3 road = mix(asp, snowC, sm);
  float rough = mix(rAsp, 0.74, sm); rough = mix(rough, 0.16, ice); rough = mix(rough, 0.13, iceP * sm * 0.9);
  col = mix(outC, road, asphalt);
  rough = mix(0.88, rough, asphalt);
  // ---- a road that ends fades into a gravel turning place
  if (endK > 0.0) { float eg = smoothstep(0.1, 0.85, endK + (rkn(wp * 1.4) - 0.5) * 0.5); vec3 tp = mix(grv, bankC * 0.9, wk * 0.85); col = mix(col, tp, eg * asphalt); }
  rkRough = rough; rkAlpha = clamp(alpha, 0.0, 1.0);
  // ---- height, for the normal: grain, cracks, rkPatch rims, frost heave, wheel ruts, snow ridges, gravel stones
  float h = 0.0;
  h += (rkn(wp * 0.34) - 0.5) * 0.05 * lF;                                         // frost-heave unevenness
  h += (rkn(wp * 2.3) - 0.5) * 0.006 * mF - polish * 0.0025;
  h += (g1 - 0.5) * 0.0011 * gF;
  h += -crk * 0.004 - seal * 0.002 + rkPatch * 0.004 - pedge * 0.003;
  h += sm * ((rkn(wp * 3.1) - 0.5) * 0.012 + (rkn(wp * 0.7) - 0.5) * 0.035) * mF - trk * 0.015 * wk;
  h += bk * ((rkn(wp * 1.3) - 0.5) * 0.02) * mF;
  h += (1.0 - asphalt) * (1.0 - wk * smoothstep(0.0, 0.6, o)) * (rkn(wp * 38.0) - 0.5) * 0.012 * gF;
  rkDH = vec2(dFdx(h), dFdy(h));
}
`;

function makeMaterial(patchMode) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, transparent: false, depthWrite: true });
  m.alphaToCoverage = true;           // the shoulder and bank fade out as MSAA coverage, in the opaque pass: real blending of the road cost a measured 0.8-1.2 ms a frame in town (HDR MSAA target)
  m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -3;
  m.extensions = { derivatives: true };
  m.defines = lowQ ? { RK_LOW: 1 } : {}; if (patchMode) m.defines.RK_PATCH = 1;
  m.onBeforeCompile = sh => {
    sh.uniforms.uWinter = RK.U.uWinter; sh.uniforms.uWet = RK.U.uWet; sh.uniforms.uDry = RK.U.uDry;
    sh.vertexShader = "attribute vec4 aRd; attribute vec4 aEx; attribute vec4 aFx; varying vec4 vRd; varying vec4 vEx; varying vec4 vFx; varying vec3 vWP;\n#ifdef RK_PATCH\nattribute vec4 aPa; attribute vec4 aPb; varying vec4 vPa; varying vec4 vPb;\n#endif\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vRd = aRd; vEx = aEx; vFx = aFx;
      #ifdef RK_PATCH
      vPa = aPa; vPb = aPb;
      #endif
      float rkD = distance((modelMatrix * vec4(position, 1.0)).xyz, cameraPosition);
      transformed.y += aFx.y * smoothstep(40.0, 105.0, rkD) + 0.0022 * rkD;
      vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader.replace("void main() {", GLSL_HELP + "\nvoid main() {")
      .replace("#include <color_fragment>", `#include <color_fragment>
      #ifdef RK_FLAT
      { diffuseColor.rgb = vec3(0.3); diffuseColor.a = vRd.x > -1.5 && vRd.x < 1.5 ? 1.0 : 0.0; rkRough = 0.9; rkDH = vec2(0.0); }
      #else
      { vec3 rkc = vec3(0.0); rkSurface(rkc); diffuseColor.rgb = rkc; diffuseColor.a = rkAlpha; }
      #endif
      if (diffuseColor.a < 0.012) discard;`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n      roughnessFactor = rkRough;")
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      #ifndef RK_LOW
      normal = rkPerturb(-vViewPosition, normal, rkDH * 1.0);
      #endif`);
  };
  return m;
}

/* ---------------- geometry: rings along a centre line ---------------- */
function catmull(pts, ds) {
  const n = pts.length, out = [];
  if (n < 2) return pts.map(p => ({ x: p[0], z: p[1] }));
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), m = Math.max(1, Math.round(L / ds));
    for (let k = 0; k < m; k++) {
      const t = k / m, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), z: f(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  out.push({ x: pts[n - 1][0], z: pts[n - 1][1] });
  return out;
}
function prep(road) {
  const Q = catmull(road.pts, DS);
  let s = 0;
  for (let i = 0; i < Q.length; i++) { if (i) s += Math.hypot(Q[i].x - Q[i - 1].x, Q[i].z - Q[i - 1].z); Q[i].s = s; }
  road.len = s; road.Q = Q; road.hw = road.K.hw;
  tangents(road);
}
function tangents(road) {
  const Q = road.Q, n = Q.length;
  for (let i = 0; i < n; i++) {
    const a = Q[Math.max(0, i - 1)], b = Q[Math.min(n - 1, i + 1)], L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    Q[i].tx = (b.x - a.x) / L; Q[i].tz = (b.z - a.z) / L; Q[i].nx = -Q[i].tz; Q[i].nz = Q[i].tx;
  }
}
// nearest point on a road's centre line: { d, i, px, pz, tx, tz, side (which side of the road the query is on), s }
function nearest(road, x, z) {
  if (!road.grid) { road.grid = new Map(); road.Q.forEach((q, i) => { const k = Math.floor(q.x / 8) * 100003 + Math.floor(q.z / 8); let a = road.grid.get(k); if (!a) road.grid.set(k, a = []); a.push(i); }); }
  let bi = -1, bd = Infinity; const cx = Math.floor(x / 8), cz = Math.floor(z / 8);
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const a = road.grid.get((cx + dx) * 100003 + cz + dz); if (a) for (const i of a) { const q = road.Q[i], d = (q.x - x) ** 2 + (q.z - z) ** 2; if (d < bd) { bd = d; bi = i; } } }
  if (bi < 0) return null;
  let best = null;
  for (let i = Math.max(0, bi - 1); i <= Math.min(road.Q.length - 2, bi); i++) {
    const a = road.Q[i], b = road.Q[i + 1], ux = b.x - a.x, uz = b.z - a.z, uu = ux * ux + uz * uz || 1, t = clamp(((x - a.x) * ux + (z - a.z) * uz) / uu, 0, 1);
    const px = a.x + ux * t, pz = a.z + uz * t, d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) { const L = Math.sqrt(uu); best = { d, i, t, px, pz, tx: ux / L, tz: uz / L, s: a.s + t * L }; }
  }
  best.side = ((x - best.px) * -best.tz + (z - best.pz) * best.tx) >= 0 ? 1 : -1;
  return best;
}

/* ---------------- junctions: cut, abut, flare ---------------- */
const hwOf = (B, s) => B.hwAt ? B.hwAt(s) : B.hw;
function rank(a, b) { return b.K.pri - a.K.pri || b.len - a.len || a.order - b.order; }
function resolve(roads) {
  const sorted = roads.slice().sort(rank);
  sorted.forEach((r, i) => { r.rank = i; });
  for (const A of sorted) {
    const n0 = A.Q.length; A.cut = new Uint8Array(n0); A.endAt = {}; A.abuts = [];
    // (a road that stops short of another, or crosses it, is a junction node: see findNodes / the patches)
    for (const B of sorted) {
      if (B.rank >= A.rank || B === A) continue;
      for (let i = 0; i < A.Q.length; i++) {
        const q = A.Q[i], nb = nearest(B, q.x, q.z); if (!nb) continue;
        const par = Math.abs(q.tx * nb.tx + q.tz * nb.tz);
        if (par <= 0.72) continue;                                    // crossings are junction nodes, not cuts
        const hwa = hwOf(A, q.s), hwb = hwOf(B, nb.s), lim = (hwa + hwb) * 0.88;
        if (nb.d < lim) { A.cut[i] = 2; (A.cutB || (A.cutB = {}))[i] = B; }
      }
    }
    A.nearCut = A.cutB || {};
  }
}
/* ---------------- junction nodes: one continuous patch where roads meet (RD1b) ----------------
   Two straight ribbons that overlap are not a junction. A node is the point where two roads cross, or where a road that
   stops short of another is carried on to its centre line. Every road through the node is CUT back to the end of its arm
   (the distance at which the corner fillets are tangent to its edges) and one patch mesh fills the gap: the asphalt out to
   a polygon made of each arm's straight edge and a circular fillet (4.5 m streets, 6 m fylkesvei) between neighbouring arms,
   then the gravel shoulder and plow bank wrapped round the outline. The arm ends and the patch share their 19 end-ring
   vertices (copied), so there is no crack, no overlap and no tone step: every road-local feature fades out over the last
   7 m of an arm (jf), and the patch keeps only the world-space tone plus wheel wear that follows the turning arcs. */
function segInt(ax, az, bx, bz, cx, cz, dx, dz) {
  const rx = bx - ax, rz = bz - az, sx = dx - cx, sz = dz - cz, den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((cx - ax) * sz - (cz - az) * sx) / den, u = ((cx - ax) * rz - (cz - az) * rx) / den;
  if (t < -1e-6 || t > 1 + 1e-6 || u < -1e-6 || u > 1 + 1e-6) return null;
  return { t: Math.min(1, Math.max(0, t)), u: Math.min(1, Math.max(0, u)) };
}
function retime(R) {                                           // arc length and tangents after the rings changed
  let s = 0; for (let i = 0; i < R.Q.length; i++) { if (i) s += Math.hypot(R.Q[i].x - R.Q[i - 1].x, R.Q[i].z - R.Q[i - 1].z); R.Q[i].s = s; }
  R.len = s; R.grid = null; tangents(R);
}
function findNodes(roads) {
  const nodes = RK.nodes = []; RK.stats.nodes = 0; RK.stats.nodeDrop = 0;
  for (const r of roads) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const q of r.Q) { if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.z < z0) z0 = q.z; if (q.z > z1) z1 = q.z; } r.bb = [x0 - 30, z0 - 30, x1 + 30, z1 + 30]; }
  const near = (a, b) => !(a.bb[2] < b.bb[0] || b.bb[2] < a.bb[0] || a.bb[3] < b.bb[1] || b.bb[3] < a.bb[1]);
  const fits = (ax, az, bx, bz) => Math.abs(ax * bx + az * bz) <= 0.82;           // not a shallow merge
  const add = (X, Y, x, z) => {
    for (const n of nodes) if ((n.x - x) ** 2 + (n.z - z) ** 2 < 81) {
      const has = [X, Y].filter(r => n.roads.includes(r));
      if (has.length === 1) { const other = X === has[0] ? Y : X, nb = nearest(other, n.x, n.z); if (nb && nb.d < 3.5) { n.roads.push(other); return true; } }     // a third road through the same junction
      RK.stats.nodeDrop++; return false;
    }
    nodes.push({ x, z, roads: [X, Y], arms: [] }); return true;
  };
  // pass 2: roads that cross
  for (let a = 0; a < roads.length; a++) for (let b = a + 1; b < roads.length; b++) {
    const X = roads[a], Y = roads[b]; if (!near(X, Y)) continue;
    for (let i = 0; i < X.Q.length - 1; i++) {
      const p = X.Q[i], q = X.Q[i + 1], nb = nearest(Y, p.x, p.z); if (!nb || nb.d > 16) continue;
      for (let k = Math.max(0, nb.i - 6); k < Math.min(Y.Q.length - 1, nb.i + 6); k++) {
        const c = Y.Q[k], d = Y.Q[k + 1], h = segInt(p.x, p.z, q.x, q.z, c.x, c.z, d.x, d.z); if (!h) continue;
        const dl = Math.hypot(d.x - c.x, d.z - c.z) || 1, pl = Math.hypot(q.x - p.x, q.z - p.z) || 1;
        if (!fits((q.x - p.x) / pl, (q.z - p.z) / pl, (d.x - c.x) / dl, (d.z - c.z) / dl)) continue;
        add(X, Y, p.x + (q.x - p.x) * h.t, p.z + (q.z - p.z) * h.t);
      }
    }
  }
  // pass 1: a road that stops short of another is carried on to the other's centre line
  for (const X of roads) for (const Y of roads) {
    if (X === Y || !near(X, Y)) continue;
    for (const end of [0, 1]) {
      const A = X.Q, e = end ? A[A.length - 1] : A[0]; if (X.ext && X.ext[end]) continue;
      const ox = end ? e.tx : -e.tx, oz = end ? e.tz : -e.tz, nb = nearest(Y, e.x, e.z); if (!nb) continue;
      const hb = hwOf(Y, nb.s); if (nb.d > hb + 17) continue;
      let best = null;
      for (let k = Math.max(0, nb.i - 12); k < Math.min(Y.Q.length - 1, nb.i + 12); k++) {
        const a = Y.Q[k], b = Y.Q[k + 1], h = segInt(e.x, e.z, e.x + ox * 26, e.z + oz * 26, a.x, a.z, b.x, b.z);
        if (h && (!best || h.t < best.t)) best = { t: h.t, k };
      }
      if (!best) continue;
      const ya = Y.Q[best.k], yb = Y.Q[best.k + 1], yl = Math.hypot(yb.x - ya.x, yb.z - ya.z) || 1, dist = 26 * best.t;
      if (!fits(ox, oz, (yb.x - ya.x) / yl, (yb.z - ya.z) / yl) || dist > hb + 17) continue;
      const jx = e.x + ox * dist, jz = e.z + oz * dist;
      let jx2 = jx, jz2 = jz, merged = null;
      for (const n of nodes) if ((n.x - jx) ** 2 + (n.z - jz) ** 2 < 121) { if (n.roads.includes(Y) && !n.roads.includes(X) && ((n.x - e.x) * ox + (n.z - e.z) * oz) / (Math.hypot(n.x - e.x, n.z - e.z) || 1) > 0.9) merged = n; else { merged = false; } break; }
      if (merged === false) { RK.stats.nodeDrop++; continue; }
      if (merged) { jx2 = merged.x; jz2 = merged.z; merged.roads.push(X); } else if (!add(X, Y, jx, jz)) continue;
      const dist2 = Math.hypot(jx2 - e.x, jz2 - e.z), ux = (jx2 - e.x) / (dist2 || 1), uz = (jz2 - e.z) / (dist2 || 1);
      if (dist2 > 0.4) {
        const m = Math.max(1, Math.ceil(dist2 / DS)), add2 = [];
        for (let k = 1; k <= m; k++) { const d = k === m ? dist2 : k * DS; add2.push({ x: e.x + ux * d, z: e.z + uz * d, s: 0 }); }
        if (end) for (const q of add2) A.push(q); else for (const q of add2) A.unshift(q);
        retime(X);
      }
      (X.ext || (X.ext = {}))[end] = true;
    }
  }
  // arms: a road's two halves, each present if the road runs on for 4 m or more
  const fixes = [];
  for (const nd of nodes) {
    let arms = [];
    for (const R of nd.roads) {
      const nb = nearest(R, nd.x, nd.z); if (!nb) continue; const hw = hwOf(R, nb.s);
      let tx = nb.tx, tz = nb.tz; if (Math.hypot(tx, tz) < 0.5) { const a = R.Q[Math.max(0, nb.i - 1)], b = R.Q[Math.min(R.Q.length - 1, nb.i + 2)], l = Math.hypot(b.x - a.x, b.z - a.z) || 1; tx = (b.x - a.x) / l; tz = (b.z - a.z) / l; }
      if (R.len - nb.s > 4) arms.push({ road: R, dir: 1, sJ: nb.s, dx: tx, dz: tz, hw, K: R.K });
      if (nb.s > 4) arms.push({ road: R, dir: -1, sJ: nb.s, dx: -tx, dz: -tz, hw, K: R.K });
      (nd.sJ || (nd.sJ = new Map())).set(R, nb.s); (R.nodeAt0 || (R.nodeAt0 = [])).push({ nd });
    }
    for (let iter = 0; iter < 3 && arms.length >= 3; iter++) {
      arms.forEach(a => { a.ang = Math.atan2(a.dz, a.dx); }); arms.sort((p, q) => p.ang - q.ang);
      const n = arms.length; nd.pairs = [];
      for (let i = 0; i < n; i++) {
        const a = arms[i], b = arms[(i + 1) % n]; let gap = b.ang - a.ang; if (gap <= 0) gap += Math.PI * 2;
        const R = Math.min(a.K.R, b.K.R), pr = { fil: false, R, gap };
        if (gap > 0.45 && gap < 2.6) {
          const nax = -a.dz, naz = a.dx, nbx = b.dz, nbz = -b.dx, b1 = a.hw + R, b2 = b.hw + R, det = nax * nbz - naz * nbx;
          if (Math.abs(det) > 0.05) {
            const cx = (b1 * nbz - naz * b2) / det, cz = (nax * b2 - nbx * b1) / det, alA = cx * a.dx + cz * a.dz, alB = cx * b.dx + cz * b.dz;
            if (alA > 0.5 && alB > 0.5 && alA < 24 && alB < 24) Object.assign(pr, { fil: true, cx, cz, alA, alB });
          }
        }
        nd.pairs.push(pr); a.tCcw = pr.fil ? pr.alA : 0; b.tCw = pr.fil ? pr.alB : 0;
      }
      for (const a of arms) { a.tCw = a.tCw || 0; a.t = Math.max(3.5, a.tCcw || 0, a.tCw || 0) + 0.6; a.nx = -a.dz; a.nz = a.dx; }
      const rem = a => a.dir > 0 ? a.road.len - a.sJ : a.sJ;
      const keep = arms.filter(a => rem(a) >= a.t + 4.6);
      if (keep.length === arms.length) break;
      for (const a of arms) if (!keep.includes(a) && rem(a) > 1.5 && !(a.road.ext && a.road.ext[a.dir > 0 ? 1 : 0])) fixes.push({ R: a.road, end: a.dir > 0 ? 1 : 0, need: a.t + 4.6 - rem(a) + 0.4 });   // a stub too short to hold its arm: the street runs on a few metres
      arms = keep;
    }
    if (arms.length < 3) { nd.dead = true; continue; }
    nd.arms = arms; RK.stats.nodes++;
  }
  if (fixes.length && (RK._fixN = (RK._fixN || 0) + 1) <= 2) {                  // lengthen the stubs and find the nodes again
    const fx = new Map(); for (const f of fixes) { const k = f.R.id + ":" + f.end, o = fx.get(k); if (!o || o.need < f.need) fx.set(k, f); }
    for (const { R, end, need } of fx.values()) { const A = R.Q, e = end ? A[A.length - 1] : A[0], ox = end ? e.tx : -e.tx, oz = end ? e.tz : -e.tz, m = Math.ceil(need / DS), add2 = [];
      for (let k = 1; k <= m; k++) add2.push({ x: e.x + ox * DS * k, z: e.z + oz * DS * k, s: 0 });
      if (end) for (const q of add2) A.push(q); else for (const q of add2) A.unshift(q);
      retime(R); (R.ext || (R.ext = {}))[end] = true; R.nodeAt0 = null; RK.stats.stubs = (RK.stats.stubs || 0) + 1; }
    for (const R of roads) R.nodeAt0 = null;
    return findNodes(roads);
  }
  // a road's rings: exact rings at each arm end, and the cut that the arms leave
  for (const R of roads) {
    const L = R.nodeAt0 || []; if (!L.length) continue;
    const need = [];
    for (const e of L) { if (e.nd.dead) continue; for (const a of e.nd.arms) if (a.road === R) need.push(a.sJ + a.dir * a.t); }
    need.sort((p, q) => p - q);
    for (const sv of need) {
      const Q = R.Q; let k = 0; while (k < Q.length - 2 && Q[k + 1].s <= sv) k++;
      const a0 = Q[k], b0 = Q[k + 1], f = (sv - a0.s) / Math.max(b0.s - a0.s, 1e-6), P = { x: a0.x + (b0.x - a0.x) * f, z: a0.z + (b0.z - a0.z) * f, s: sv };
      if (Math.abs(sv - a0.s) < 0.35) Q[k] = P; else if (Math.abs(b0.s - sv) < 0.35) Q[k + 1] = P; else Q.splice(k + 1, 0, P);
    }
    R.grid = null; tangents(R);
  }
}
// the cut each node leaves in a road: rings strictly between the arm ends
function cutNodes(R) {
  R.nodeAt = {};
  for (const e of R.nodeAt0 || []) {
    if (e.nd.dead) continue;
    const ab = e.nd.arms.find(a => a.road === R && a.dir === -1), af = e.nd.arms.find(a => a.road === R && a.dir === 1), sJ = e.nd.sJ.get(R);
    if (!ab && !af) continue;
    const lo = ab ? sJ - ab.t : -Infinity, hi = af ? sJ + af.t : Infinity;
    for (let i = 0; i < R.Q.length; i++) { const s = R.Q[i].s; if (s > lo + 1e-3 && s < hi - 1e-3) { R.cut[i] = R.cut[i] || 1; R.nodeAt[i] = { nd: e.nd }; } }
  }
}
function spans(A) {
  A.spans = []; A.mouths = A.mouths || []; const Q = A.Q, n = Q.length;
  let i = 0;
  while (i < n) {
    if (A.cut[i]) { i++; continue; }
    let j = i; while (j + 1 < n && !A.cut[j + 1]) j++;
    if (j - i >= 2) {
      const sp = { road: A, i0: i, i1: j, ends: [null, null] };
      for (const [side, idx, nbIdx] of [[0, i, i - 1], [1, j, j + 1]]) {
        if (nbIdx < 0 || nbIdx >= n) { sp.ends[side] = { type: "free" }; RK.stats.ends++; continue; }
        const nn = A.nodeAt && A.nodeAt[nbIdx]; if (nn) { sp.ends[side] = { type: "node", node: nn.nd }; continue; }
        const B = A.nearCut[nbIdx], kind = A.cut[nbIdx], q = Q[idx], nb = B && nearest(B, q.x, q.z);
        if (!B || !nb) { sp.ends[side] = { type: "free" }; RK.stats.ends++; continue; }
        // the through road's normal towards this road, and where
        const ns = nb.side, nx = -nb.tz * ns, nz = nb.tx * ns;
        const dirx = side ? q.tx : -q.tx, dirz = side ? q.tz : -q.tz;
        if (kind === 2 || Math.abs(dirx * nx + dirz * nz) < 0.4) { sp.ends[side] = { type: "merge" }; RK.stats.merges++; continue; }
        sp.ends[side] = { type: "abut", B, px: nb.px, pz: nb.pz, nx, nz, s: nb.s, side: ns, hwB: hwOf(B, nb.s) }; RK.stats.abuts++;
        (B.mouths || (B.mouths = [])).push({ s: nb.s, side: ns, half: hwOf(A, q.s) + A.K.R + 0.8 });
      }
      A.spans.push(sp);
    }
    i = j + 1;
  }
}

/* ---------------- ring attributes ---------------- */
// per-ring width scale, flare, projection, masks, end amount for one span
function spanRings(sp) {
  const A = sp.road, K = A.K, Q = A.Q, m = sp.i1 - sp.i0 + 1, rings = [];
  const seed = A.seed;
  for (let k = 0; k < m; k++) {
    const q = Q[sp.i0 + k];
    rings.push({ q, hs: A.hwAt ? A.hwAt(q.s) / A.hw : 1, mk: A.markAt ? A.markAt(q.s) : K.mark, flare: 0, end: 0, lm: 1, rm: 1, sm: 1, cm: 1, proj: null });
  }
  const sL = Q[sp.i0].s, sR = Q[sp.i1].s;
  for (const side of [0, 1]) {
    const e = sp.ends[side]; if (!e) continue;
    for (let k = 0; k < m; k++) {
      const r = rings[k], d = side ? sR - r.q.s : r.q.s - sL;          // metres from this end
      if (e.type === "free") {
        const capR = A.hw * 1.5 + 1.2, bulb = 2.0, wideAt = x => bulb * sst(9, 3, x);
        // a rounded turning place: widens over the last 9 m, closes in a half circle
        if (d < capR) { const t = (capR - d) / capR; r.hs = (A.hw * r.hs + wideAt(capR)) / A.hw * Math.sqrt(Math.max(0.0, 1 - t * t)) + 0.001; r.flare = 0; }
        else r.flare += wideAt(d);
        r.end = Math.max(r.end, sst(11, 0, d)); r.cm = Math.min(r.cm, sst(0, 3.5, d)); r.lm = Math.min(r.lm, sst(2, 7, d)); r.rm = r.lm;
      } else if (e.type === "merge") {
        r.hs *= 0.12 + 0.88 * sst(0, 11, d); r.cm = Math.min(r.cm, sst(1, 6, d)); r.lm = Math.min(r.lm, sst(2, 8, d)); r.rm = r.lm; r.sm = Math.min(r.sm, sst(0, 9, d));
      } else if (e.type === "node") {
        r.joint = Math.max(r.joint || 0, sst(7, 0, d)); r.cm = Math.min(r.cm, sst(0.2, 4.5, d)); r.lm = Math.min(r.lm, sst(1, 6, d)); r.rm = r.lm;
      } else if (e.type === "abut") {
        const R = K.R, rr = Math.max(d, 0);
        if (rr < R) { const f = R - Math.sqrt(Math.max(0, R * R - (R - rr) * (R - rr))); r.flare += f; }
        r.cm = Math.min(r.cm, sst(0.3, 3.5, d)); r.lm = Math.min(r.lm, sst(1.5, 6, d)); r.rm = r.lm; r.sm = Math.min(r.sm, sst(0.1, R + 2.5, d));
        r.joint = Math.max(r.joint || 0, sst(R + 3, 0, d));
        if (d === 0 || (side ? k === m - 1 : k === 0)) r.proj = e;
      }
    }
  }
  // through roads: the shoulder, bank and edge lines open where a side road comes in
  const ML = (A.mouths || []).slice();
  for (const mo of A.mouthsIn || []) { const nb = nearest(A, mo.x, mo.z); if (!nb || nb.d > 1.6) continue; const nd = nearest(A, mo.dx, mo.dz); ML.push({ s: nb.s, side: nd ? nd.side : 1, half: (mo.half || 1.8) }); }   // driveways: the plow bank opens, the shoulder runs on
  if (ML.length) for (const mo of ML) for (const r of rings) {
    const ds = Math.abs(r.q.s - mo.s); if (ds > mo.half + 3) continue;
    const f = sst(mo.half - 0.5, mo.half + 2.5, ds);
    if (mo.side > 0) { r.rm = Math.min(r.rm, f); r.rsh = Math.min(r.rsh === undefined ? 1 : r.rsh, f); } else { r.lm = Math.min(r.lm, f); r.lsh = Math.min(r.lsh === undefined ? 1 : r.lsh, f); }
  }
  // the edge is never a ruler line: the asphalt width and the shoulder width wander along the road (and settle to the nominal width in a junction)
  for (const r of rings) {
    const sv = r.q.s, jn = r.joint || 0;
    const hv = 1 + ((vnoise(sv * 0.085 + seed * 2.3) - 0.5) * 0.3 + (vnoise(sv * 0.27 + seed) - 0.5) * 0.1) * (A.K.hw > 2.7 ? 0.75 : 1.35);
    r.hs *= 1 + (hv - 1) * (1 - jn);
    r.shw = K.sh * (0.5 + 1.25 * vnoise(sv * 0.055 + seed * 5.0)) * (1 - 0.35 * jn) + 0.02;
    r.bankW = (vnoise(sv * 0.045 + seed * 7.0) - 0.5) * 1.4 * (1 - jn);       // the plow bank wanders in and out
  }
  return rings;
}

/* ---------------- chunks: build and (re)drape ---------------- */
function newChunk(sp, k0, k1) {
  const A = sp.road, nr = k1 - k0 + 1, geo = new THREE.BufferGeometry();
  const pos = new Float32Array(nr * NC * 3), nor = new Float32Array(nr * NC * 3), rd = new Float32Array(nr * NC * 4), ex = new Float32Array(nr * NC * 4), fx = new Float32Array(nr * NC * 4);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("aRd", new THREE.BufferAttribute(rd, 4)); geo.setAttribute("aEx", new THREE.BufferAttribute(ex, 4)); geo.setAttribute("aFx", new THREE.BufferAttribute(fx, 4));
  const idx = [];
  for (let r = 0; r < nr - 1; r++) for (let c = 0; c < NC - 1; c++) { const a = r * NC + c, b = a + 1, d = a + NC, e = d + 1; idx.push(a, b, d, b, e, d); }
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, MAT); mesh.visible = false; mesh.receiveShadow = true; mesh.castShadow = false; mesh.frustumCulled = true; mesh.matrixAutoUpdate = false;
  mesh.userData.roadkit = A.id; mesh.userData.townRoad = undefined;
  const ch = { mesh, sp, k0, k1, nr, wk: -9, v: -1, dirty: true, x: 0, z: 0 };   // (wk -9: never filled)
  const mid = A.Q[sp.i0 + ((k0 + k1) >> 1)]; ch.x = mid.x; ch.z = mid.z;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(mid.x, 0, mid.z), DS * nr * 0.5 + 16);   // y is set at the first fill
  mesh.userData.chunk = ch;
  RK.scene.add(mesh); RK.meshes.push(mesh); RK.chunks.push(ch); (A.chunks || (A.chunks = [])).push(ch);
  RK.stats.chunks++; RK.stats.verts += nr * NC;
  return ch;
}
const _cols = new Float32Array(NC * 2);
function colsFor(K, hwE, flare, hs, shw) {                          // signed offsets of the 19 columns, from the left (-) to the right (+)
  const out = new Float32Array(NC); let c = 0;
  const half = hwE + flare, sc = Math.max(hs, 0.3);
  const side = sg => {
    const l = [];
    for (let k = 1; k < FRAC.length; k++) l.push(sg * FRAC[k] * half);
    l.push(sg * (half + shw * OUTER[0])); l.push(sg * (half + shw * OUTER[1]));
    for (let k = 2; k < OUTER.length; k++) l.push(sg * (half + shw + (OUTER[k] - OUTER[1]) * sc));
    return l;
  };
  const L = side(-1).reverse(), Rr = side(1);
  for (const v of L) out[c++] = v; out[c++] = 0; for (const v of Rr) out[c++] = v;
  return out;
}
const ridgeProf = [0, 0, 0, 0.55, 1.0, 0.45, 0.0, 0, 0, 0];   // (placeholder, set below by column role)
function fill(ch, wk) {
  if (ch.node) return fillPatch(ch, wk);
  const sp = ch.sp, A = sp.road, K = A.K, S = RK.surf, F = RK.farSurf;
  if (!sp.rings) sp.rings = spanRings(sp);
  const R = sp.rings, geo = ch.mesh.geometry, pos = geo.attributes.position.array, nor = geo.attributes.normal.array, rd = geo.attributes.aRd.array, ex = geo.attributes.aEx.array, fx = geo.attributes.aFx.array;
  // smoothed centre height over the whole span (+/- 3 rings of each ring in the chunk)
  const k0 = Math.max(0, ch.k0 - 4), k1 = Math.min(R.length - 1, ch.k1 + 4);
  const raw = [], yc = [];
  for (let k = k0; k <= k1; k++) raw.push(S(R[k].q.x, R[k].q.z));
  for (let k = 0; k < raw.length; k++) { let a = 0, w = 0; for (let d = -3; d <= 3; d++) { const j = k + d; if (j < 0 || j >= raw.length) continue; const ww = 4 - Math.abs(d); a += raw[j] * ww; w += ww; } yc.push(a / w); }
  const nr = ch.nr, P = new Float32Array(nr * NC * 3);
  let ymin = 1e9, ymax = -1e9;
  const seedS = A.seed * 131.7;
  const snow = A.snow;
  for (let r = 0; r < nr; r++) {
    const k = ch.k0 + r, ring = R[k], q = ring.q, y0 = yc[k - k0] + 0.03;
    const hwE = A.hw * ring.hs, shw = ring.shw || K.sh, cols = colsFor(K, hwE, ring.flare, ring.hs, shw);
    const sv = snow ? clamp(snow(q.s), 0, 1) : 0;
    const bw = 0.55 + 0.45 * vnoise(q.s * 0.09 + A.seed);
    for (let c = 0; c < NC; c++) {
      const u = cols[c], au = Math.abs(u), sgn = u < 0 ? -1 : 1;
      const asphaltCol = au <= hwE + ring.flare + 1e-4 + 0.0;
      let uu = u, x = q.x + q.nx * uu, z = q.z + q.nz * uu;
      // the outer columns wobble so no bank or shoulder edge is a ruler line
      const ci = c < (NC >> 1) ? (NC >> 1) - c : c - (NC >> 1);           // 0 centre .. 9 outer
      if (ci >= 5) { const jn = ring.joint || 0, wob = ((vnoise(q.s * 0.31 + ci * 7.3 + A.seed * 3.1 + (sgn > 0 ? 40 : 0)) - 0.5) * (0.25 + 0.12 * (ci - 5)) + (ci >= 6 ? (vnoise(q.s * 0.1 + A.seed * 7.0 + (sgn > 0 ? 40 : 0)) - 0.5) * 2.0 * (ci - 5) / 4 : 0)) * (1 - 0.9 * jn); uu += sgn * wob; x = q.x + q.nx * uu; z = q.z + q.nz * uu; }
      // an abutting end is projected onto the through road's edge line
      if (ring.proj) { const e = ring.proj, T = (k === sp.i1 - sp.i0 && sp.ends[1] === e) ? 1 : -1, dx = T * q.tx, dz = T * q.tz, dn = dx * e.nx + dz * e.nz; if (Math.abs(dn) > 0.35) { const dl = clamp((e.hwB - ((x - e.px) * e.nx + (z - e.pz) * e.nz)) / dn, -1.5, DS * 4); x += dx * dl; z += dz * dl; } }
      const sf = S(x, z);
      let y;
      if (ci <= 3) {                                                        // asphalt: crowned, clamped to the surface a few cm
        const f = Math.min(1, au / Math.max(hwE + ring.flare, 0.1));
        y = y0 + K.crown * (1 - f * f) - 0.03;
        y = clamp(y, sf + 0.012, sf + 0.07);
      } else if (ci <= 5) {                                                 // shoulder falls away
        y = Math.max(y0 - 0.03 - (0.04 * (au - hwE)), sf + 0.012); y = Math.min(y, sf + 0.06);
      } else {                                                              // bank zone: drapes the snow, with the plow ridge on top
        y = sf + 0.045;
        if (wk > 0.02) { const prof = ci === 6 ? 0.45 : ci === 7 ? 1.0 : ci === 8 ? 0.7 : 0.0; y += K.ridge * wk * prof * bw * (0.7 + 0.5 * vnoise(q.s * 0.4 + ci * 3.0 + A.seed * 2.0)) * (Math.min(ring.sm, sgn < 0 ? (ring.lsh === undefined ? 1 : ring.lsh) : (ring.rsh === undefined ? 1 : ring.rsh)) * 0.92 + 0.08); }
      }
      const v = r * NC + c;
      P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z;
      pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
      if (y < ymin) ymin = y; if (y > ymax) ymax = y;
      rd[v * 4] = u; rd[v * 4 + 1] = q.s + seedS; rd[v * 4 + 2] = sv; rd[v * 4 + 3] = hwE + ring.flare;
      ex[v * 4] = ring.lm; ex[v * 4 + 1] = ring.rm; ex[v * 4 + 2] = ci >= 4 ? ring.sm * (sgn < 0 ? (ring.lsh === undefined ? 1 : ring.lsh) : (ring.rsh === undefined ? 1 : ring.rsh)) : 1; ex[v * 4 + 3] = ring.mk;
      fx[v * 4] = ring.end > 0 ? ring.end : -(ring.joint || 0); fx[v * 4 + 1] = Math.max(0, F(x, z) - y) * wk; fx[v * 4 + 2] = ring.cm; fx[v * 4 + 3] = shw;   /* (the far mesh is ground + fresh snow: in summer it is not there to ride on) */
    }
  }
  // normals: across and along
  for (let r = 0; r < nr; r++) for (let c = 0; c < NC; c++) {
    const v = r * NC + c, a = Math.max(0, r - 1), b = Math.min(nr - 1, r + 1), cl = Math.max(0, c - 1), cr = Math.min(NC - 1, c + 1);
    const va = (a * NC + c) * 3, vb = (b * NC + c) * 3, vl = (r * NC + cl) * 3, vr = (r * NC + cr) * 3;
    const sx = P[vb] - P[va], sy = P[vb + 1] - P[va + 1], sz = P[vb + 2] - P[va + 2], ux = P[vr] - P[vl], uy = P[vr + 1] - P[vl + 1], uz = P[vr + 2] - P[vl + 2];
    let nx = sy * uz - sz * uy, ny = sz * ux - sx * uz, nz = sx * uy - sy * ux; if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const L = Math.hypot(nx, ny, nz) || 1; nor[v * 3] = nx / L; nor[v * 3 + 1] = ny / L; nor[v * 3 + 2] = nz / L;
  }
  for (const n of ["position", "normal", "aRd", "aEx", "aFx"]) geo.attributes[n].needsUpdate = true;
  const bs = geo.boundingSphere; bs.center.y = (ymin + ymax) / 2; bs.radius = Math.hypot(DS * nr * 0.5 + 8, (ymax - ymin) / 2 + 3, 4 + A.hw + 5) + 2;
  ch.wk = wk; ch.dirty = false; ch.mesh.visible = true; ch.fills = (ch.fills || 0) + 1; RK.stats.redrapes++;
  if (ch.links) for (const p of ch.links) p.dirty = true;
}

/* ---------------- the junction patch ---------------- */
const LAMS = [1, 0.62, 0.3];
function fringeOffs(shw, sc) { const o = [shw * OUTER[0], shw * OUTER[1]]; for (let k = 2; k < OUTER.length; k++) o.push(shw + (OUTER[k] - OUTER[1]) * sc); return o; }   // ci 4..9: metres beyond the asphalt edge
function buildPatch(nd) {
  const arms = nd.arms, n = arms.length;
  for (const a of arms) {                                           // the ring each arm ends in, and the chunk that holds it
    const sp = a.road.spans.find(q => a.dir < 0 ? q.ends[1] && q.ends[1].type === "node" && q.ends[1].node === nd : q.ends[0] && q.ends[0].type === "node" && q.ends[0].node === nd);
    if (!sp) { nd.bad = "nospan:" + a.road.id + ":" + a.dir + ":" + a.t.toFixed(1) + ":" + a.sJ.toFixed(0) + "/" + a.road.len.toFixed(0); return null; }
    a.sp = sp; a.k = a.dir < 0 ? sp.i1 - sp.i0 : 0;
    a.ch = a.road.chunks.find(c => c.sp === sp && c.k0 <= a.k && a.k <= c.k1); if (!a.ch) { nd.bad = "nochunk"; return null; }
    const rg = sp.rings[a.k], q = rg.q; a.E = [q.x, q.z]; a.ed = [a.dir * q.tx, a.dir * q.tz]; a.en = [-a.ed[1], a.ed[0]];   // the arm's real end ring: where it is and which way it leaves the junction
    a.hwE = a.road.hw * rg.hs + rg.flare; a.flip = (a.en[0] * q.nx + a.en[1] * q.nz) < 0;       // is the arm's CCW side the ribbon's -u side?
  }
  const V = [], I = [], J = { x: nd.x, z: nd.z };
  const addV = v => { V.push(v); return V.length - 1; };
  const quad = (a, b, c, d) => { I.push(a, b, c, a, c, d); };
  const chordC = (a, k) => a.flip ? 12 - k : 6 + k;                // column of the k-th asphalt vertex of a's end chord, CW side to CCW side
  const fringeC = (a, ccw, q) => (ccw !== a.flip) ? 13 + q : 5 - q;   // q = 0..5 (ci 4..9) on the CCW (ccw true) or CW side
  const edgeP = (a, side) => [a.E[0] + a.en[0] * a.hwE * side, a.E[1] + a.en[1] * a.hwE * side];
  // the corner fillets, from the real end rings (the roads bend, so an arm is not a straight line through the node)
  nd.pairs2 = nd.pairs.map((pr, i) => {
    const a = arms[i], b = arms[(i + 1) % n]; if (!pr.fil) return { fil: false };
    const na = a.en, nb = [-b.en[0], -b.en[1]], ea = edgeP(a, 1), eb = edgeP(b, -1), R = pr.R;
    const b1 = na[0] * ea[0] + na[1] * ea[1] + R, b2 = nb[0] * eb[0] + nb[1] * eb[1] + R, det = na[0] * nb[1] - na[1] * nb[0];
    if (Math.abs(det) < 0.05) return { fil: false };
    const cx = (b1 * nb[1] - na[1] * b2) / det, cz = (na[0] * b2 - nb[0] * b1) / det;
    const sa = -((cx - na[0] * R - ea[0]) * a.ed[0] + (cz - na[1] * R - ea[1]) * a.ed[1]), sb = -((cx - nb[0] * R - eb[0]) * b.ed[0] + (cz - nb[1] * R - eb[1]) * b.ed[1]);
    if (sa < 0.1 || sb < 0.1 || sa > 40 || sb > 40) return { fil: false };
    return { fil: true, cx, cz, sa, sb, R, na, nb, ea, eb };
  });
  // ---- arm sectors: the chord's 7 asphalt vertices fanned to the centre
  nd.sec = [];
  for (let i = 0; i < n; i++) {
    const a = arms[i], rows = [];
    for (let li = 0; li < LAMS.length; li++) { const row = []; for (let k = 0; k < 7; k++) { const px = a.E[0] + a.en[0] * a.hwE * (k - 3) / 3, pz = a.E[1] + a.en[1] * a.hwE * (k - 3) / 3, lam = LAMS[li];
      row.push(addV(li === 0 ? { t: "chord", arm: i, c: chordC(a, k), x: px, z: pz } : { t: "fan", x: J.x + (px - J.x) * lam, z: J.z + (pz - J.z) * lam, lam, arm: i, k })); } rows.push(row); }
    const cen = addV({ t: "fan", x: J.x, z: J.z, lam: 0, arm: i, k: 3 });
    for (let li = 0; li < LAMS.length - 1; li++) for (let k = 0; k < 6; k++) quad(rows[li][k], rows[li][k + 1], rows[li + 1][k + 1], rows[li + 1][k]);
    for (let k = 0; k < 6; k++) I.push(rows[LAMS.length - 1][k], rows[LAMS.length - 1][k + 1], cen);
  }
  // ---- corner sectors: from arm i's CCW edge, round the fillet, to arm i+1's CW edge; the shoulder and bank wrap the outline
  for (let i = 0; i < n; i++) {
    const a = arms[i], b = arms[(i + 1) % n], pr = nd.pairs2[i], P = [];
    const nbn = [-b.en[0], -b.en[1]], ea = edgeP(a, 1), eb = edgeP(b, -1);
    P.push({ x: ea[0], z: ea[1], ox: a.en[0], oz: a.en[1] });
    let e1 = [0, 0], e2 = [0, 0], R = 0, C = null;
    if (pr.fil) {
      R = pr.R; C = [pr.cx, pr.cz];
      const ta = { x: C[0] - pr.na[0] * R, z: C[1] - pr.na[1] * R }, tb = { x: C[0] - pr.nb[0] * R, z: C[1] - pr.nb[1] * R };
      P.push({ x: ta.x, z: ta.z, ox: a.en[0], oz: a.en[1] });
      const v1x = ta.x - C[0], v1z = ta.z - C[1], v2x = tb.x - C[0], v2z = tb.z - C[1], ang = Math.atan2(v1x * v2z - v1z * v2x, v1x * v2x + v1z * v2z), m = Math.max(3, Math.ceil(Math.abs(ang) / 0.2)), a0 = Math.atan2(v1z, v1x);
      for (let k = 1; k < m; k++) { const aa = a0 + ang * k / m, ux = Math.cos(aa), uz = Math.sin(aa); P.push({ x: C[0] + ux * R, z: C[1] + uz * R, ox: -ux, oz: -uz }); }
      P.push({ x: tb.x, z: tb.z, ox: nbn[0], oz: nbn[1] });
      e1 = [v1x / R, v1z / R]; e2 = [v2x / R, v2z / R];
    }
    P.push({ x: eb[0], z: eb[1], ox: nbn[0], oz: nbn[1] });
    let cum = 0; P[0].cum = 0; for (let k = 1; k < P.length; k++) { cum += Math.hypot(P[k].x - P[k - 1].x, P[k].z - P[k - 1].z); P[k].cum = cum; }
    P.forEach(p => { p.f = cum > 0 ? p.cum / cum : 0; });
    const wear = pr.fil ? { cx: C[0], cz: C[1], R, e1, e2 } : null;
    // fringe-layer vertices: q 0 is the outline (asphalt edge), 1..6 are ci 4..9
    const F = P.map((p, m) => {
      const col = [];
      for (let q = 0; q <= 6; q++) {
        if (m === 0 && q > 0) col.push(addV({ t: "chord", arm: i, c: fringeC(a, true, q - 1), x: p.x + p.ox * 0.55 * q, z: p.z + p.oz * 0.55 * q }));
        else if (m === P.length - 1 && q > 0) col.push(addV({ t: "chord", arm: (i + 1) % n, c: fringeC(b, false, q - 1), x: p.x + p.ox * 0.55 * q, z: p.z + p.oz * 0.55 * q }));
        else if (q === 0) col.push(m === 0 ? addV({ t: "chord", arm: i, c: a.flip ? 6 : 12, x: p.x, z: p.z }) : m === P.length - 1 ? addV({ t: "chord", arm: (i + 1) % n, c: b.flip ? 12 : 6, x: p.x, z: p.z }) : addV({ t: "edge", p, x: p.x, z: p.z, arm: i, wear }));
        else col.push(addV({ t: "fringe", p, q, i, ai: i, bi: (i + 1) % n, wear, x: p.x + p.ox * 0.55 * q, z: p.z + p.oz * 0.55 * q }));
      }
      return col;
    });
    for (let m = 0; m < P.length - 1; m++) for (let q = 0; q < 6; q++) quad(F[m][q], F[m + 1][q], F[m + 1][q + 1], F[m][q + 1]);
    // the asphalt: fan layers from the outline to the centre (their own vertices, so the wear arcs belong to this sector)
    const rows = [P.map((p, m) => F[m][0])];
    for (let li = 1; li < LAMS.length; li++) rows.push(P.map(p => addV({ t: "fan", x: J.x + (p.x - J.x) * LAMS[li], z: J.z + (p.z - J.z) * LAMS[li], lam: LAMS[li], arm: i, p, wear, w: p.f })));
    const cen = addV({ t: "fan", x: J.x, z: J.z, lam: 0, arm: i, p: P[0], wear, w: 0.5 });
    for (let li = 0; li < LAMS.length - 1; li++) for (let m = 0; m < P.length - 1; m++) quad(rows[li][m], rows[li][m + 1], rows[li + 1][m + 1], rows[li + 1][m]);
    for (let m = 0; m < P.length - 1; m++) I.push(rows[LAMS.length - 1][m], rows[LAMS.length - 1][m + 1], cen);
    nd.sec.push({ P, wear });
  }
  // winding: every triangle faces up
  for (const v of V) { v.wear = v.wear || null; }
  for (let t = 0; t < I.length; t += 3) { const A = V[I[t]], B = V[I[t + 1]], Cc = V[I[t + 2]], ny = (B.z - A.z) * (Cc.x - A.x) - (B.x - A.x) * (Cc.z - A.z); if (ny < 0) { const k = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = k; } }
  return { V, I };
}
function newPatchChunk(nd) {
  const tpl = buildPatch(nd); if (!tpl) return null;
  nd.tpl = tpl; const nv = tpl.V.length, geo = new THREE.BufferGeometry();
  const mk = (name, k) => geo.setAttribute(name, new THREE.BufferAttribute(new Float32Array(nv * k), k));
  mk("position", 3); mk("normal", 3); mk("aRd", 4); mk("aEx", 4); mk("aFx", 4); mk("aPa", 4); mk("aPb", 4);
  geo.setIndex(tpl.I);
  const mesh = new THREE.Mesh(geo, MATP); mesh.visible = false; mesh.receiveShadow = true; mesh.castShadow = false; mesh.frustumCulled = true; mesh.matrixAutoUpdate = false;
  mesh.userData.roadkit = "node"; geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(nd.x, 0, nd.z), 40);
  const ch = { mesh, node: nd, wk: -9, dirty: true, x: nd.x, z: nd.z, nr: 0 }; mesh.userData.chunk = ch;
  RK.scene.add(mesh); RK.meshes.push(mesh); RK.chunks.push(ch); nd.pc = ch;
  for (const a of nd.arms) (a.ch.links || (a.ch.links = [])).push(ch);
  RK.stats.patches = (RK.stats.patches || 0) + 1; RK.stats.verts += nv;
  return ch;
}
function fillPatch(ch, wk) {
  const nd = ch.node, T = nd.tpl, V = T.V, nv = V.length, S = RK.surf, F = RK.farSurf, geo = ch.mesh.geometry, n = nd.arms.length;
  for (const a of nd.arms) if (a.ch.wk < -1 || a.ch.dirty) fill(a.ch, wk);
  const pos = geo.attributes.position.array, nor = geo.attributes.normal.array, rd = geo.attributes.aRd.array, ex = geo.attributes.aEx.array, fx = geo.attributes.aFx.array, pa = geo.attributes.aPa.array, pb = geo.attributes.aPb.array;
  // arm data: ring attributes at the end
  const AI = nd.arms.map(a => { const g = a.ch.mesh.geometry.attributes, r = a.k - a.ch.k0; return { g, r, ring: a.sp.rings[a.k], offs: fringeOffs(a.ring_shw !== undefined ? a.ring_shw : (a.sp.rings[a.k].shw || a.K.sh), 1) }; });
  let ymin = 1e9, ymax = -1e9, st = 0;
  for (let i = 0; i < n; i++) { const A = AI[i], v = (A.r * NC + 9) * 4; st += A.g.aRd.array[v + 2] / n; }
  for (let vi = 0; vi < nv; vi++) {
    const v = V[vi]; let x = v.x, y, z = v.z, hw, U, Sv, shw = 0, sc = 1;
    if (v.t === "chord") {
      const A = AI[v.arm], o = (A.r * NC + v.c);
      x = A.g.position.array[o * 3]; y = A.g.position.array[o * 3 + 1]; z = A.g.position.array[o * 3 + 2];
      pos[vi * 3] = x; pos[vi * 3 + 1] = y; pos[vi * 3 + 2] = z;
      nor[vi * 3] = A.g.normal.array[o * 3]; nor[vi * 3 + 1] = A.g.normal.array[o * 3 + 1]; nor[vi * 3 + 2] = A.g.normal.array[o * 3 + 2];
      for (let k = 0; k < 4; k++) { rd[vi * 4 + k] = A.g.aRd.array[o * 4 + k]; ex[vi * 4 + k] = A.g.aEx.array[o * 4 + k]; fx[vi * 4 + k] = A.g.aFx.array[o * 4 + k]; }
      pa[vi * 4] = pa[vi * 4 + 1] = pa[vi * 4 + 2] = pa[vi * 4 + 3] = 0; pb[vi * 4] = pb[vi * 4 + 1] = pb[vi * 4 + 2] = pb[vi * 4 + 3] = 0;
      if (y < ymin) ymin = y; if (y > ymax) ymax = y; continue;
    }
    const ai = nd.arms[v.arm !== undefined ? v.arm : v.i], aA = nd.arms[v.ai !== undefined ? v.ai : (v.arm || 0)], aB = nd.arms[v.bi !== undefined ? v.bi : (v.arm || 0)];
    const f = v.p ? v.p.f : 0.5, hwv = (aA.hw * (1 - f) + aB.hw * f), K = aA.K, shv = (AI[nd.arms.indexOf(aA)].ring.shw || K.sh) * (1 - f) + (AI[nd.arms.indexOf(aB)].ring.shw || aB.K.sh) * f;
    const seed = aA.road.seed, Sref = (v.p ? v.p.cum : 0) + aA.sJ * 0.37 + seed * 11;
    let ci = 3, lam = 1, off = 0;
    if (v.t === "fringe") { ci = 3 + v.q; const o = fringeOffs(shv, 1); off = o[v.q - 1]; x = v.p.x + v.p.ox * off; z = v.p.z + v.p.oz * off; }
    else if (v.t === "fan") lam = v.lam;
    const sf = S(x, z); let yy;
    if (ci <= 3) yy = sf + 0.035;
    else if (ci <= 5) yy = sf + 0.022;
    else { yy = sf + 0.045; if (wk > 0.02) { const prof = ci === 6 ? 0.45 : ci === 7 ? 1.0 : ci === 8 ? 0.7 : 0.0, bw = 0.55 + 0.45 * vnoise(Sref * 0.09 + seed); yy += K.ridge * wk * prof * bw * (0.7 + 0.5 * vnoise(Sref * 0.4 + ci * 3.0 + seed * 2.0)); } }
    y = yy; pos[vi * 3] = x; pos[vi * 3 + 1] = y; pos[vi * 3 + 2] = z;
    const gx = (S(x + 1.2, z) - S(x - 1.2, z)) / 2.4, gz = (S(x, z + 1.2) - S(x, z - 1.2)) / 2.4, nl = Math.hypot(gx, 1, gz);
    nor[vi * 3] = -gx / nl; nor[vi * 3 + 1] = 1 / nl; nor[vi * 3 + 2] = -gz / nl;
    U = ci <= 3 ? hwv * lam : hwv + off; Sv = Sref;
    rd[vi * 4] = U; rd[vi * 4 + 1] = Sv; rd[vi * 4 + 2] = st; rd[vi * 4 + 3] = hwv;
    ex[vi * 4] = 0; ex[vi * 4 + 1] = 0; ex[vi * 4 + 2] = 1; ex[vi * 4 + 3] = 0;
    fx[vi * 4] = -1; fx[vi * 4 + 1] = Math.max(0, F(x, z) - y) * wk; fx[vi * 4 + 2] = 0; fx[vi * 4 + 3] = shv;
    const w = v.wear;
    if (w) { pa[vi * 4] = w.cx - x; pa[vi * 4 + 1] = w.cz - z; pa[vi * 4 + 2] = w.R; pa[vi * 4 + 3] = 1; pb[vi * 4] = w.e1[0]; pb[vi * 4 + 1] = w.e1[1]; pb[vi * 4 + 2] = w.e2[0]; pb[vi * 4 + 3] = w.e2[1]; }
    else { pa[vi * 4] = pa[vi * 4 + 1] = pa[vi * 4 + 2] = pa[vi * 4 + 3] = 0; pb[vi * 4] = pb[vi * 4 + 1] = pb[vi * 4 + 2] = pb[vi * 4 + 3] = 0; }
    if (y < ymin) ymin = y; if (y > ymax) ymax = y;
  }
  for (const nme of ["position", "normal", "aRd", "aEx", "aFx", "aPa", "aPb"]) geo.attributes[nme].needsUpdate = true;
  const bs = geo.boundingSphere; bs.center.set(nd.x, (ymin + ymax) / 2, nd.z); bs.radius = 30 + (ymax - ymin);
  ch.wk = wk; ch.dirty = false; ch.mesh.visible = true; RK.stats.redrapes++;
}

/* ---------------- public ---------------- */
RK.init = function (a) {
  if (api) return; api = a; THREE = a.THREE; W = a.world; RK.scene = a.scene;
  RK.surf = W.surf; RK.farSurf = W.farSurf || ((x, z) => W.surf(x, z));
  const G = a.GFX || {}; lowQ = !!(G.low || G.phone);
  RK.U = { uWinter: { value: 1 }, uWet: { value: 0 }, uDry: { value: 0 } };
  MAT = makeMaterial(); MATP = makeMaterial(true); RK.mat = MAT; RK.low = lowQ;
};
let order = 0;
RK.add = function (spec) {
  const K = KINDS[spec.kind] || KINDS.street;
  const road = { id: spec.id, kind: spec.kind, K, pts: spec.pts, mouthsIn: spec.mouths || null, snow: spec.snow || null, order: order++, seed: strHash(spec.id || "r") / 9973 * 100, spans: [], chunks: [], meta: spec.meta || null };
  if (spec.hw) road.K = Object.assign({}, K, { hw: spec.hw });
  if (spec.segs && spec.segs.length) {                       // one chain whose width and markings change along it (a road that runs on as a village street)
    const sg = spec.segs.slice().sort((a, b) => a.s0 - b.s0), hwMax = Math.max(...sg.map(g => g.hw || road.K.hw));
    road.K = Object.assign({}, road.K, { hw: hwMax });
    road.hwAt = s => { let w = sg[0].hw || road.K.hw; for (let i = 1; i < sg.length; i++) w += ((sg[i].hw || road.K.hw) - w) * sst(sg[i].s0 - 7, sg[i].s0 + 7, s); return w; };
    road.markAt = s => { let m = sg[0].mark; for (let i = 1; i < sg.length; i++) if (s >= sg[i].s0) m = sg[i].mark; return m; };
  }
  if (spec.mark !== undefined) road.K = Object.assign({}, road.K, { mark: spec.mark });
  if (!road.pts || road.pts.length < 2) return null;
  RK.roads.push(road); RK.ready = false; return road;
};
RK.build = function () {
  const t0 = performance.now();
  for (const r of RK.roads) { if (!r.Q) prep(r); }
  RK.stats.tPrep = Math.round(performance.now() - t0);
  findNodes(RK.roads);
  resolve(RK.roads);
  for (const nd of RK.nodes) {                                    // a node beside a shared-trunk run (the old taper) stays as it was: no patch
    if (nd.dead) continue;
    for (const a of nd.arms) { const R = a.road, lo = a.sJ + a.dir * a.t, hi = lo + a.dir * 9; for (let i = 0; i < R.Q.length; i++) { const s = R.Q[i].s; if (s >= Math.min(lo, hi) - 1e-3 && s <= Math.max(lo, hi) + 1e-3 && R.cut[i] === 2) { nd.dead = "merge"; break; } } if (nd.dead) break; }
    if (nd.dead) RK.stats.nodes--;
  }
  for (const nd of RK.nodes) if (nd.dead === "merge") {           // ... but where two roads cross there, the lower road is cut at the higher one's edge as in RD1 (abut, flared)
    for (const A of nd.roads) for (const B of nd.roads) {
      if (A === B || B.rank >= A.rank) continue;
      for (let i = 0; i < A.Q.length; i++) { const q = A.Q[i]; if ((q.x - nd.x) ** 2 + (q.z - nd.z) ** 2 > 45 * 45) continue; const nb = nearest(B, q.x, q.z); if (!nb) continue; if (nb.d < hwOf(B, nb.s) + 0.25) { A.cut[i] = A.cut[i] || 1; (A.cutB || (A.cutB = {}))[i] = B; } }
      A.nearCut = A.cutB || {};
    }
  }
  for (const A of RK.roads) cutNodes(A);
  RK.stats.tRes = Math.round(performance.now() - t0);
  for (const A of RK.roads) {
    for (let i = 0; i < A.Q.length; i++) if (W.isSea(A.Q[i].x, A.Q[i].z)) A.cut[i] = A.cut[i] || 1;
  }
  for (const A of RK.roads) A.mouths = [];
  for (const A of RK.roads) spans(A);
  for (const A of RK.roads) for (const sp of A.spans) {
    sp.rings = spanRings(sp); const m = sp.rings.length;
    for (let k0 = 0; k0 < m - 1; k0 += CH - 1) newChunk(sp, k0, Math.min(m - 1, k0 + CH - 1));
    RK.stats.rings += m;
  }
  for (const nd of RK.nodes) if (!nd.dead) newPatchChunk(nd);
  RK.stats.tCh = Math.round(performance.now() - t0);
  RK.wk = RK.winterK();
  // the chunks fill lazily, nearest the player first (a few ms a frame): only the ones within 160 m are made at boot
  const P = api.P; let nf = 0;
  for (const ch of RK.chunks) if ((ch.x - P.x) ** 2 + (ch.z - P.z) ** 2 < 220 * 220) { fill(ch, RK.wk); nf++; }
  RK.stats.boot = nf;
  RK.ready = true; RK.stats.ms = Math.round(performance.now() - t0);
};
RK.winterK = () => { const M = api.MELT; return M ? 1 - sst(0.02, 0.6, M.k) : 1; };
// the stretch of a road from s0 to s1 changed (road snow, plow): redrape the chunks over it
RK.touch = function (id, s0, s1) {
  for (const r of RK.roads) if (r.id === id) for (const ch of r.chunks || []) {
    const q0 = r.Q[ch.sp.i0 + ch.k0].s, q1 = r.Q[ch.sp.i0 + ch.k1].s;
    if (q1 >= s0 - 4 && q0 <= s1 + 4) ch.dirty = true;
  }
};
RK.touchAll = () => { for (const ch of RK.chunks) ch.dirty = true; };
RK.tick = function (dt) {
  if (!RK.ready || !api) return;
  const wk = RK.winterK(); RK.U.uWinter.value = wk;
  const M = api.MELT, WX = api.WX, wet = clamp(((M && M.wet) || 0) * 0.8 + (api.GS && api.GS.storm ? 0.0 : 0) + (wk < 0.5 && WX ? clamp(WX.at(api.P.x, api.P.z) * 1.4 - 0.2, 0, 1) * 0.9 : 0), 0, 1);
  RK.U.uWet.value += (wet - RK.U.uWet.value) * Math.min(1, dt * 0.6);
  if (Math.abs(wk - RK.wk) > 0.07) { RK.wk = wk; RK.poleDirty = true; for (const ch of RK.chunks) ch.dirty = true; }
  // fill: one chunk a frame (about 5 ms) while any is dirty within 350 m of the player, one more every 4th frame for the rest
  const P = api.P, t0 = performance.now(); RK.fr = (RK.fr || 0) + 1;
  let best = null, bd = Infinity, far = null, fd = Infinity;
  for (const ch of RK.chunks) { if (!ch.dirty) continue; const d = (ch.x - P.x) ** 2 + (ch.z - P.z) ** 2; if (d < 350 * 350) { if (d < bd) { bd = d; best = ch; } } else if (d < fd) { fd = d; far = ch; } }
  if (best) fill(best, RK.wk); else if (far && RK.fr % 4 === 0) fill(far, RK.wk);
  RK.stats.lastMs = Math.round((performance.now() - t0) * 10) / 10;
  if (RK.poleMesh && RK.poleDirty && !best && !far) poleDrape();
};
// the player's headlight, for the reflectors on the snow poles
RK.head = { p: { value: null }, d: { value: null }, on: { value: 0 }, cos: { value: 0.8 }, vh: { value: 700 }, bc: { value: 1.765 } };

/* ---------------- snow poles (brøytestikker) with reflectors that catch the headlight ---------------- */
function poleDrape() {
  const mesh = RK.poleMesh, L = RK.poleList; if (!mesh) return; RK.poleDirty = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  L.forEach(([x, z, yaw, lx, lz], i) => { e.set(lx, yaw, lz); q.setFromEuler(e); p.set(x, RK.surf(x, z) - 0.12, z); m.compose(p, q, sc); mesh.setMatrixAt(i, m); });
  mesh.instanceMatrix.needsUpdate = true;
}
RK.poles = function (list, H) {
  H = H || 2.3; RK.poleList = list; RK.head.bc.value = H - 0.535;
  // three stacked frusta (red plastic shaft, the white reflector field from 1.0 to 1.14 m, red again to the top), 6 sides each,
  // so the band is a crisp ring of its own vertices (a single tall cylinder has none between its ends)
  const shaft = new THREE.BufferGeometry(), P = [], N = [], C = [], B = [], I = [], red = new THREE.Color(0xe4521a), wht = new THREE.Color(0xf2efe0);
  const rAt = y => 0.0155 - 0.0035 * (y / H), ys = [0, H - 0.62, H - 0.45, H], SEG = 6;   // a 3 cm fibreglass stick, the reflective band 17 cm long, 45 cm below the top
  for (let r = 0; r < ys.length - 1; r++) {                           // each frustum has its own two rings, so the colour change is a hard edge
    const band = r === 1, col = band ? wht : red, base = P.length / 3;
    for (const y of [ys[r], ys[r + 1]]) for (let k = 0; k <= SEG; k++) { const a = k / SEG * Math.PI * 2, rr = rAt(y); P.push(Math.cos(a) * rr, y, Math.sin(a) * rr); N.push(Math.cos(a), 0.0, Math.sin(a)); C.push(col.r, col.g, col.b); B.push(band ? 1 : 0); }
    for (let k = 0; k < SEG; k++) { const a = base + k, b = a + 1, c = a + SEG + 1, d = c + 1; I.push(a, c, b, b, c, d); }
  }
  shaft.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); shaft.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  shaft.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); shaft.setAttribute("aBand", new THREE.Float32BufferAttribute(B, 1)); shaft.setIndex(I);
  if (!poleMat) {
    poleMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 });
    poleMat.onBeforeCompile = sh => {
      sh.uniforms.uHP = RK.head.p; sh.uniforms.uHD = RK.head.d; sh.uniforms.uHOn = RK.head.on; sh.uniforms.uHCos = RK.head.cos; sh.uniforms.uVh = RK.head.vh; sh.uniforms.uBC = RK.head.bc;
      sh.vertexShader = "attribute float aBand; varying float vBand; varying vec3 vRw; uniform float uVh; uniform float uBC;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vBand = aBand;\n { vec3 po = (modelMatrix * instanceMatrix * vec4(0.0, transformed.y, 0.0, 1.0)).xyz; float dd = distance(po, cameraPosition); float px = dd * 2.0 / (projectionMatrix[1][1] * uVh), minR = 1.0 * px; float rr = length(transformed.xz); if (rr > 1e-4) transformed.xz *= max(1.0, minR / rr); if (aBand > 0.5) transformed.y = uBC + (transformed.y - uBC) * max(1.0, 2.6 * px / 0.17); }\n vRw = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = "varying float vBand; varying vec3 vRw; uniform vec3 uHP; uniform vec3 uHD; uniform float uHOn; uniform float uHCos;\n" + sh.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        { vec3 tc = normalize(cameraPosition - vRw); vec3 th = uHP - vRw; float dH = length(th); th /= max(dH, 0.01);
          float cone = smoothstep(uHCos - 0.16, uHCos + 0.03, dot(-th, uHD)); float retro = pow(max(dot(tc, th), 0.0), 10.0) * cone * uHOn;
          totalEmissiveRadiance += vBand * (retro * 8.0 / (1.0 + dH * dH * 0.00003)) * vec3(1.0, 0.93, 0.78); }`);
    };
  }
  if (!RK.head.d.value) { RK.head.d.value = new THREE.Vector3(0, 0, 1); RK.head.p.value = new THREE.Vector3(); }
  const mesh = new THREE.InstancedMesh(shaft, poleMat, Math.max(1, list.length));
  mesh.count = list.length; mesh.frustumCulled = false; mesh.name = "roadPoles"; mesh.castShadow = false;
  RK.poleMesh = mesh; api.scene.add(mesh); poleDrape();
  return mesh;
};
RK.headTick = function () {
  const h = api && api.sled && api.sled.headlight; if (!h) return;
  const p = RK.head.p.value, d = RK.head.d.value;
  h.getWorldPosition(p); h.target.getWorldPosition(d); d.sub(p).normalize();
  RK.head.on.value = h.intensity > 0.5 ? 1 : 0; RK.head.cos.value = Math.cos(h.angle || 0.55) ; RK.head.vh.value = Math.max(200, (window.innerHeight || 720) * 0.85);
};
// tests: the surface of a road at ring k of span j, from the live geometry
RK.probe = function (id, step = 1) {
  const out = [];
  for (const r of RK.roads) if (r.id === id) for (const ch of r.chunks) {
    const pos = ch.mesh.geometry.attributes.position.array;
    for (let k = 0; k < ch.nr; k += step) { const v0 = k * NC; out.push({ x: pos[(v0 + 9) * 3], y: pos[(v0 + 9) * 3 + 1], z: pos[(v0 + 9) * 3 + 2], l: [pos[v0 * 3], pos[v0 * 3 + 1], pos[v0 * 3 + 2]], r: [pos[(v0 + NC - 1) * 3], pos[(v0 + NC - 1) * 3 + 1], pos[(v0 + NC - 1) * 3 + 2]], ea: [pos[(v0 + 6) * 3], pos[(v0 + 6) * 3 + 1], pos[(v0 + 6) * 3 + 2]], eb: [pos[(v0 + 12) * 3], pos[(v0 + 12) * 3 + 1], pos[(v0 + 12) * 3 + 2]] }); }
  }
  return out;
};
RK.NC = NC;
// is a point on a built road's carriageway (inside a ring range that was not cut away, within its half width)?
RK.covered = function (x, z, pad = 0.05) {
  for (const A of RK.roads) { const nb = nearest(A, x, z); if (!nb || nb.d > hwOf(A, nb.s) + pad) continue;
    for (const sp of A.spans) if (nb.i >= sp.i0 - 1 && nb.i <= sp.i1) return true; }
  return RK.inPatch(x, z, 0);                      // a junction patch's asphalt (the roads are cut back from it)
};
RK.inPatch = function (x, z, pad = 0.4) {
  for (const nd of RK.nodes) { if (nd.dead || !nd.tpl || (nd.x - x) ** 2 + (nd.z - z) ** 2 > 900) continue;
    if (!nd.asph) { const V = nd.tpl.V, I = nd.tpl.I; nd.asph = []; for (let i = 0; i < I.length; i += 3) { const v = [V[I[i]], V[I[i + 1]], V[I[i + 2]]]; if (v.some(q => q.t === "fringe" || (q.t === "chord" && (q.c < 6 || q.c > 12)))) continue; nd.asph.push([v[0].x, v[0].z, v[1].x, v[1].z, v[2].x, v[2].z]); } }
    for (const [dx, dz] of pad ? [[0, 0], [pad, 0], [-pad, 0], [0, pad], [0, -pad]] : [[0, 0]]) { const px = x + dx, pz = z + dz;
      for (const t of nd.asph) { const d = (t[2] - t[0]) * (t[5] - t[1]) - (t[4] - t[0]) * (t[3] - t[1]); if (Math.abs(d) < 1e-7) continue; const u = ((px - t[0]) * (t[5] - t[1]) - (t[4] - t[0]) * (pz - t[1])) / d, v = ((t[2] - t[0]) * (pz - t[1]) - (px - t[0]) * (t[3] - t[1])) / d; if (u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6) return true; } } }
  return false;
};
RK.nearest = nearest; RK.hwOf = hwOf;
// is a point on a carriageway (a ribbon's asphalt, a free end's turning place, or a junction patch's asphalt), within pad metres?
RK.onRoad = function (x, z, pad = 0.4) {
  for (const A of RK.roads) { const nb = nearest(A, x, z); if (!nb || nb.d > A.hw * 1.6 + 6) continue;
    for (const sp of A.spans) { if (nb.i < sp.i0 || nb.i > sp.i1) continue; const r = sp.rings[Math.min(sp.rings.length - 1, nb.i - sp.i0)]; if (r && nb.d < A.hw * r.hs + r.flare + pad) return true; } }
  for (const nd of RK.nodes) { if (nd.dead || !nd.tpl || (nd.x - x) ** 2 + (nd.z - z) ** 2 > 900) continue;
    if (!nd.asph) { const V = nd.tpl.V, I = nd.tpl.I; nd.asph = []; for (let i = 0; i < I.length; i += 3) { const v = [V[I[i]], V[I[i + 1]], V[I[i + 2]]]; if (v.some(q => q.t === "fringe" || (q.t === "chord" && (q.c < 6 || q.c > 12)))) continue; nd.asph.push([v[0].x, v[0].z, v[1].x, v[1].z, v[2].x, v[2].z]); } }
    for (const [dx, dz] of [[0, 0], [pad, 0], [-pad, 0], [0, pad], [0, -pad]]) { const px = x + dx, pz = z + dz;
      for (const t of nd.asph) { const d = (t[2] - t[0]) * (t[5] - t[1]) - (t[4] - t[0]) * (t[3] - t[1]); if (Math.abs(d) < 1e-7) continue; const u = ((px - t[0]) * (t[5] - t[1]) - (t[4] - t[0]) * (pz - t[1])) / d, v = ((t[2] - t[0]) * (pz - t[1]) - (px - t[0]) * (t[3] - t[1])) / d; if (u > 0 && v > 0 && u + v < 1) return true; } } }
  return false;
};
// tests: fill every chunk that is dirty or not yet made (the game does this a few a frame, nearest first)
RK.fillAll = function () { const wk = RK.winterK(); RK.wk = wk; let n = 0; for (const ch of RK.chunks) if (ch.dirty || ch.wk < -1) { fill(ch, wk); n++; } return n; };
})();
