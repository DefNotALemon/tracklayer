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
let api = null, THREE = null, W = null, MAT = null, lowQ = false, poleMat = null;
const DS = 2, CH = 48;                                       // ring spacing (m), rings per chunk
const KINDS = {
  fv:     { hw: 3.1, sh: 0.9, crown: 0.036, pri: 3, R: 6.0, ridge: 0.34, mark: 3 },   // a fylkesvei: 6.2 m of asphalt, centre + edge lines
  main:   { hw: 2.4, sh: 0.5, crown: 0.028, pri: 2, R: 4.5, ridge: 0.26, mark: 1 },   // a village's main street: a faint dashed centre line
  street: { hw: 2.4, sh: 0.5, crown: 0.028, pri: 2, R: 4.5, ridge: 0.26, mark: 0 },   // side streets: no markings
  lane:   { hw: 1.7, sh: 0.4, crown: 0.02, pri: 1, R: 3.0, ridge: 0.2, mark: 0 }
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
uniform float uWinter; uniform float uWet; uniform float uDry;
float rkh(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float rkn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(rkh(i), rkh(i + vec2(1.0, 0.0)), f.x), mix(rkh(i + vec2(0.0, 1.0)), rkh(i + vec2(1.0, 1.0)), f.x), f.y); }
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
  vec2 wp = vWP.xz;
  float fp = max(length(fwidth(wp)), 0.0008);                // metres per pixel
  float gF = 1.0 - smoothstep(0.012, 0.06, fp), mF = 1.0 - smoothstep(0.12, 0.7, fp), lF = 1.0 - smoothstep(0.5, 3.0, fp);
  float joint = max(0.0, -vFx.x), endK = max(0.0, vFx.x);
  float jf = 1.0 - joint * 0.55;
  // ---- the edge: broken, never a ruler line
  float nA = rkn(vec2(S * 0.7, side * 3.7)), nB = rkn(vec2(S * 2.7 + 9.0, side * 5.1)), nC = rkn(vec2(S * 8.0 + 3.0, side * 1.3));
  float wob = (nA - 0.5) * 0.36 + (nB - 0.5) * 0.2 - smoothstep(0.68, 0.82, nC) * 0.09;
  float o = au - (hw + wob);
  float asphalt = 1.0 - smoothstep(-0.03, 0.07 + fp, o + (nC - 0.5) * 0.08);
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
  float aw = au + (rkn(vec2(S * 0.09, side * 4.0)) - 0.5) * 0.5;               // the tracks wander a little: drivers do not hold a line
  float wd = min(abs(aw - (lc - wo)), abs(aw - (lc + wo)));
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
    crk = line * smoothstep(0.45, 0.75, rkn(wp * 0.07)) * smoothstep(0.1, 0.8, polish * 1.3 + (rkn(wp * 0.21) - 0.55) * 1.4) * jf * (1.0 - smoothstep(0.12, 0.5, fp)); }
#endif
  if (fp < 1.4) { float ci = floor(S / 17.0), f = S / 17.0 - ci, uc = (rkh(vec2(ci, 3.3)) - 0.5) * hw * 1.7 + (rkn(vec2(S * 0.22, ci)) - 0.5) * 0.9; float d = abs(U - uc), w = 0.03 + 0.03 * rkh(vec2(ci, 5.5));
    seal = (1.0 - smoothstep(w * 0.5, w + fp, d)) * step(0.4, rkh(vec2(ci, 9.1))) * smoothstep(0.0, 0.08, f) * (1.0 - smoothstep(0.82, 0.97, f)) * jf * (1.0 - smoothstep(0.3, 1.2, fp)); }
  if (fp < 1.4) { float ri = floor(S / 8.0), lp = S - ri * 8.0, tg = 1.0 + rkh(vec2(ri, 2.7)) * 6.0, d = abs(lp - tg - U * 0.2 - (rkn(vec2(S * 1.3, U)) - 0.5) * 0.25);
    crk += (1.0 - smoothstep(0.012, 0.03 + fp, d)) * step(0.62, rkh(vec2(ri, 4.4))) * (1.0 - smoothstep(0.5, 1.0, au / hw + rkh(vec2(ri, 6.0)) * 0.5)) * jf * (1.0 - smoothstep(0.3, 1.2, fp)); }
  // ---- rkPatch repairs of a different tone, with a sealed border
  if (fp < 1.6) { float pi_ = floor(S / 12.0), lane = U > 0.0 ? 1.0 : 0.0, k = pi_ + lane * 311.0;
    if (rkh(vec2(k, 1.0)) > 0.7) { float hx = 1.0 + 2.0 * rkh(vec2(k, 2.0)), hy = 0.45 + 0.8 * rkh(vec2(k, 3.0));
      float cs = pi_ * 12.0 + hx + 0.3 + (12.0 - 2.0 * hx - 0.6) * rkh(vec2(k, 4.0)), cu = side * (hw * 0.5 + (rkh(vec2(k, 5.0)) - 0.5) * (hw * 0.7));
      float pr = max(abs(S - cs) / hx, abs(U - cu) / hy) + (rkn(vec2(S * 1.9, U * 1.9)) - 0.5) * 0.28;
      rkPatch = 1.0 - step(1.0, pr); pedge = smoothstep(0.9, 1.0, pr) * (1.0 - step(1.045, pr)); rkPatch *= jf; pedge *= jf; } }
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
  float st = vRd.z, wk = uWinter;
  float trk = exp(-wd * wd / (2.0 * 0.06)) * (0.55 + 0.45 * rkn(vec2(S * 0.14, side * 2.0 + au) + wp * 0.05)) * jf;
  float cover = 0.5 + (rkn(wp * 0.17) - 0.5) * 0.7 + (rkn(vec2(S * 0.07, U * 0.6)) - 0.5) * 0.9 + st * 0.9;
  cover += 0.4 * exp(-U * U / 0.3) + 0.35 * smoothstep(hw * 0.55, hw, au);
  cover *= 1.0 - 0.95 * trk * (1.0 - st) * smoothstep(0.2, 0.5, rkn(vec2(S * 0.11, au * 0.8 + side * 5.0)));
  float sm = smoothstep(0.45, 0.62, cover * wk + (rkn(wp * 1.7) - 0.5) * 0.3 * wk + (rkn(wp * 6.0) - 0.5) * 0.08 * mF);
  float grit = gF * smoothstep(0.82, 0.92, rkn(wp * 60.0)) * 0.7;
  vec3 snowC = mix(vec3(0.86, 0.885, 0.93), vec3(0.42, 0.40, 0.38), clamp(0.2 + 0.6 * trk + 0.4 * rkn(wp * 0.55) + grit + 0.3 * smoothstep(hw - 0.9, hw, au) + 0.25 * rkn(vec2(S * 0.9, au * 5.0)), 0.0, 1.0));
  float ice = trk * (1.0 - st) * smoothstep(0.3, 0.7, rkn(wp * 0.23)) * wk * (1.0 - sm);
  asp *= 1.0 - 0.3 * ice * (0.6 + 0.4 * wk);
  // ---- shoulder and plow bank, outside the asphalt
  float shE = sh + (nB - 0.5) * 0.3;
  float aSh = (1.0 - smoothstep(shE - 0.28, shE + 0.1, o)) * vEx.z;
  float bk = wk * smoothstep(0.05, 0.55, o) * (1.0 - smoothstep(sh + 1.15, sh + 2.55 + nA * 0.5, o)) * vEx.z * (0.75 + 0.25 * smoothstep(0.3, 0.6, rkn(wp * 0.9)));
  float dirt = 1.0 - smoothstep(0.1, sh + 1.8, o);
  vec3 bankC = mix(vec3(0.8, 0.83, 0.88), vec3(0.34, 0.32, 0.30), clamp(dirt * (0.75 + 0.55 * rkn(vec2(S * 0.9, o * 3.0) + wp * 0.05)) + dirt * 0.5 * rkn(vec2(S * 0.12, o * 9.0)) + gF * smoothstep(0.8, 0.9, rkn(wp * 55.0)) * 0.5, 0.0, 1.0));
  vec3 outC = mix(grv, bankC, wk * smoothstep(0.0, 0.5, o) * 0.9 + wk * 0.1);
  // compose
  vec3 road = mix(asp, snowC, sm);
  float rough = mix(rAsp, 0.74, sm); rough = mix(rough, 0.16, ice);
  col = mix(outC, road, asphalt);
  rough = mix(0.88, rough, asphalt);
  float alpha = max(asphalt, max(aSh * (1.0 - 0.6 * wk * smoothstep(0.1, 0.5, o)), bk));
  // ---- a road that ends fades into a gravel turning place
  if (endK > 0.0) { float eg = smoothstep(0.1, 0.85, endK + (rkn(wp * 1.4) - 0.5) * 0.5); vec3 tp = mix(grv, bankC * 0.9, wk * 0.85); col = mix(col, tp, eg * asphalt); alpha *= 1.0 - smoothstep(0.86, 1.0, endK + (rkn(wp * 2.0) - 0.5) * 0.12); }
  // a snowed-in stretch is simply snow again
  alpha *= 1.0 - smoothstep(0.82, 1.0, st * wk);
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

function makeMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, transparent: false, depthWrite: true });
  m.alphaToCoverage = true;           // the shoulder and bank fade out as MSAA coverage, in the opaque pass: real blending of the road cost a measured 0.8-1.2 ms a frame in town (HDR MSAA target)
  m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -3;
  m.extensions = { derivatives: true };
  m.defines = lowQ ? { RK_LOW: 1 } : {};
  m.onBeforeCompile = sh => {
    sh.uniforms.uWinter = RK.U.uWinter; sh.uniforms.uWet = RK.U.uWet; sh.uniforms.uDry = RK.U.uDry;
    sh.vertexShader = "attribute vec4 aRd; attribute vec4 aEx; attribute vec4 aFx; varying vec4 vRd; varying vec4 vEx; varying vec4 vFx; varying vec3 vWP;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vRd = aRd; vEx = aEx; vFx = aFx;
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
    for (const B of sorted) {
      if (B.rank >= A.rank || B === A) continue;
      // a road that stops just short of a higher road is carried on to its edge
      for (const end of [0, 1]) {
        const e = end ? A.Q[A.Q.length - 1] : A.Q[0], nb = nearest(B, e.x, e.z);
        if (!nb) continue; const hb = hwOf(B, nb.s); if (nb.d <= hb + 0.3 || nb.d > hb + 9) continue;
        const ox = end ? e.tx : -e.tx, oz = end ? e.tz : -e.tz, dx = nb.px - e.x, dz = nb.pz - e.z, dl = Math.hypot(dx, dz) || 1;
        if ((ox * dx + oz * dz) / dl < 0.55) continue;
        const add = Math.ceil((nb.d - hb + 1) / DS);
        for (let k = 1; k <= add; k++) { const q = { x: e.x + ox * DS * k, z: e.z + oz * DS * k, s: 0 }; if (end) A.Q.push(q); else A.Q.unshift(q); }
        // (rings change: re-derive arc length and the cut array below)
        let s = 0; for (let i = 0; i < A.Q.length; i++) { if (i) s += Math.hypot(A.Q[i].x - A.Q[i - 1].x, A.Q[i].z - A.Q[i - 1].z); A.Q[i].s = s; } A.len = s; tangents(A);
        const c2 = new Uint8Array(A.Q.length); c2.set(A.cut.subarray(0, Math.min(A.cut.length, c2.length)), end ? 0 : add); A.cut = c2;
      }
    }
    for (const B of sorted) {
      if (B.rank >= A.rank || B === A) continue;
      for (let i = 0; i < A.Q.length; i++) {
        const q = A.Q[i], nb = nearest(B, q.x, q.z); if (!nb) continue;
        const par = Math.abs(q.tx * nb.tx + q.tz * nb.tz);
        const hwa = hwOf(A, q.s), hwb = hwOf(B, nb.s), lim = par > 0.72 ? (hwa + hwb) * 0.88 : hwb + 0.25;
        if (nb.d < lim) { A.cut[i] = par > 0.72 ? 2 : 1; (A.cutB || (A.cutB = {}))[i] = B; }
      }
    }
    A.nearCut = A.cutB || {};
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
  if (A.mouths) for (const mo of A.mouths) for (const r of rings) {
    const ds = Math.abs(r.q.s - mo.s); if (ds > mo.half + 3) continue;
    const f = sst(mo.half - 0.5, mo.half + 2.5, ds);
    if (mo.side > 0) { r.rm = Math.min(r.rm, f); r.rsh = Math.min(r.rsh === undefined ? 1 : r.rsh, f); } else { r.lm = Math.min(r.lm, f); r.lsh = Math.min(r.lsh === undefined ? 1 : r.lsh, f); }
  }
  // centre line: solid on bends, dashed on straights (the shader chooses by mark code)
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
function colsFor(K, hwE, flare, hs) {                          // signed offsets of the 19 columns, from the left (-) to the right (+)
  const out = new Float32Array(NC); let c = 0;
  const half = hwE + flare, sc = Math.max(hs, 0.3);
  const side = sg => {
    const l = [];
    for (let k = 1; k < FRAC.length; k++) l.push(sg * FRAC[k] * half);
    l.push(sg * (half + K.sh * OUTER[0])); l.push(sg * (half + K.sh * OUTER[1]));
    for (let k = 2; k < OUTER.length; k++) l.push(sg * (half + K.sh + (OUTER[k] - OUTER[1]) * sc));
    return l;
  };
  const L = side(-1).reverse(), Rr = side(1);
  for (const v of L) out[c++] = v; out[c++] = 0; for (const v of Rr) out[c++] = v;
  return out;
}
const ridgeProf = [0, 0, 0, 0.55, 1.0, 0.45, 0.0, 0, 0, 0];   // (placeholder, set below by column role)
function fill(ch, wk) {
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
    const hwE = A.hw * ring.hs, cols = colsFor(K, hwE, ring.flare, ring.hs);
    const sv = snow ? clamp(snow(q.s), 0, 1) : 0;
    const bw = 0.55 + 0.45 * vnoise(q.s * 0.09 + A.seed);
    for (let c = 0; c < NC; c++) {
      const u = cols[c], au = Math.abs(u), sgn = u < 0 ? -1 : 1;
      const asphaltCol = au <= hwE + ring.flare + 1e-4 + 0.0;
      let uu = u, x = q.x + q.nx * uu, z = q.z + q.nz * uu;
      // the outer columns wobble so no bank or shoulder edge is a ruler line
      const ci = c < (NC >> 1) ? (NC >> 1) - c : c - (NC >> 1);           // 0 centre .. 9 outer
      if (ci >= 5) { const wob = (vnoise(q.s * 0.31 + ci * 7.3 + A.seed * 3.1 + (sgn > 0 ? 40 : 0)) - 0.5) * (0.25 + 0.12 * (ci - 5)); uu += sgn * wob; x = q.x + q.nx * uu; z = q.z + q.nz * uu; }
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
        if (wk > 0.02) { const prof = ci === 6 ? 0.45 : ci === 7 ? 1.0 : ci === 8 ? 0.7 : 0.0; y += K.ridge * wk * prof * bw * (0.7 + 0.5 * vnoise(q.s * 0.4 + ci * 3.0 + A.seed * 2.0)) * (ring.sm * 0.8 + 0.2); }
      }
      const v = r * NC + c;
      P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z;
      pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
      if (y < ymin) ymin = y; if (y > ymax) ymax = y;
      rd[v * 4] = u; rd[v * 4 + 1] = q.s + seedS; rd[v * 4 + 2] = sv; rd[v * 4 + 3] = hwE + ring.flare;
      ex[v * 4] = ring.lm; ex[v * 4 + 1] = ring.rm; ex[v * 4 + 2] = ci >= 4 ? ring.sm * (sgn < 0 ? (ring.lsh === undefined ? 1 : ring.lsh) : (ring.rsh === undefined ? 1 : ring.rsh)) : 1; ex[v * 4 + 3] = ring.mk;
      fx[v * 4] = ring.end > 0 ? ring.end : -(ring.joint || 0); fx[v * 4 + 1] = Math.max(0, F(x, z) - y) * wk;   // (the far mesh is ground + fresh snow: in summer it is not there to ride on) fx[v * 4 + 2] = ring.cm; fx[v * 4 + 3] = K.sh;
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
}

/* ---------------- public ---------------- */
RK.init = function (a) {
  if (api) return; api = a; THREE = a.THREE; W = a.world; RK.scene = a.scene;
  RK.surf = W.surf; RK.farSurf = W.farSurf || ((x, z) => W.surf(x, z));
  const G = a.GFX || {}; lowQ = !!(G.low || G.phone);
  RK.U = { uWinter: { value: 1 }, uWet: { value: 0 }, uDry: { value: 0 } };
  MAT = makeMaterial(); RK.mat = MAT; RK.low = lowQ;
};
let order = 0;
RK.add = function (spec) {
  const K = KINDS[spec.kind] || KINDS.street;
  const road = { id: spec.id, kind: spec.kind, K, pts: spec.pts, snow: spec.snow || null, order: order++, seed: strHash(spec.id || "r") / 9973 * 100, spans: [], chunks: [], meta: spec.meta || null };
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
  // rings in the sea are no road at all: cut them out of every road
  resolve(RK.roads);
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
RK.head = { p: { value: null }, d: { value: null }, on: { value: 0 } };

/* ---------------- snow poles (brøytestikker) with reflectors that catch the headlight ---------------- */
function poleDrape() {
  const mesh = RK.poleMesh, L = RK.poleList; if (!mesh) return; RK.poleDirty = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  L.forEach(([x, z, yaw, lx, lz], i) => { e.set(lx, yaw, lz); q.setFromEuler(e); p.set(x, RK.surf(x, z) - 0.12, z); m.compose(p, q, sc); mesh.setMatrixAt(i, m); });
  mesh.instanceMatrix.needsUpdate = true;
}
RK.poles = function (list, H) {
  H = H || 2.3; RK.poleList = list;
  // three stacked frusta (red plastic shaft, the white reflector field from 1.0 to 1.14 m, red again to the top), 6 sides each,
  // so the band is a crisp ring of its own vertices (a single tall cylinder has none between its ends)
  const shaft = new THREE.BufferGeometry(), P = [], N = [], C = [], B = [], I = [], red = new THREE.Color(0xd8501a), wht = new THREE.Color(0xeeece2);
  const rAt = y => 0.026 - 0.006 * (y / H), ys = [0, 1.0, 1.14, H], SEG = 6;
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
      sh.uniforms.uHP = RK.head.p; sh.uniforms.uHD = RK.head.d; sh.uniforms.uHOn = RK.head.on;
      sh.vertexShader = "attribute float aBand; varying float vBand; varying vec3 vRw;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vBand = aBand; vRw = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = "varying float vBand; varying vec3 vRw; uniform vec3 uHP; uniform vec3 uHD; uniform float uHOn;\n" + sh.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        { vec3 tc = normalize(cameraPosition - vRw); vec3 th = uHP - vRw; float dH = length(th); th /= max(dH, 0.01);
          float cone = smoothstep(0.5, 0.86, dot(-th, uHD)); float retro = pow(max(dot(tc, th), 0.0), 36.0) * cone * uHOn;
          totalEmissiveRadiance += vBand * (retro * 7.0 / (1.0 + dH * dH * 0.0011)) * vec3(1.0, 0.92, 0.75); }`);
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
  RK.head.on.value = h.intensity > 0.5 ? 1 : 0;
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
  return false;
};
RK.nearest = nearest; RK.hwOf = hwOf;
// tests: fill every chunk that is dirty or not yet made (the game does this a few a frame, nearest first)
RK.fillAll = function () { const wk = RK.winterK(); RK.wk = wk; let n = 0; for (const ch of RK.chunks) if (ch.dirty || ch.wk < -1) { fill(ch, wk); n++; } return n; };
})();
