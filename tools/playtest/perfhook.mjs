// GPU-timer hook for perf scenarios. install(ev) wraps renderer.render with EXT_disjoint_timer_query_webgl2 (true GPU ms per frame,
// unlike gl.finish() which headless Chrome returns early from) and records CPU ms around the render call plus the frame's
// pre-render (update) ms. collect(ev, secs) -> {gpuMed, gpuP90, cpuUpdMed, cpuRenderMed, calls, tris, frames, fps}.
export async function install(ev) {
  await ev(`(() => {
    const gl = renderer.getContext(), ext = renderer.extensions.get('EXT_disjoint_timer_query_webgl2');
    const P = window.__pf = { on: false, gpu: [], upd: [], rcpu: [], pend: [], calls: [], tris: [], t0: 0, frames: 0, w0: 0, ext: !!ext };
    const qt = QG.tick; QG.tick = function (ms) { P.t0 = performance.now(); return qt.call(this, ms); };
    const r0 = renderer.render.bind(renderer);
    renderer.render = (s, c) => {
      const a = performance.now(); let q = null;
      if (P.on && ext) { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); }
      r0(s, c);
      if (q) gl.endQuery(ext.TIME_ELAPSED_EXT);
      const b = performance.now();
      if (P.on) { P.frames++; P.upd.push(a - P.t0); P.rcpu.push(b - a); P.calls.push(renderer.info.render.calls); P.tris.push(renderer.info.render.triangles); if (q) P.pend.push(q); }
      for (let i = P.pend.length - 1; i >= 0; i--) { const k = P.pend[i];
        if (gl.getQueryParameter(k, gl.QUERY_RESULT_AVAILABLE)) { if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) P.gpu.push(gl.getQueryParameter(k, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(k); P.pend.splice(i, 1); } }
    };
    return true; })()`);
}
export async function collect(ev, secs, sleep) {
  await ev("(() => { const P = window.__pf; P.gpu = []; P.upd = []; P.rcpu = []; P.calls = []; P.tris = []; P.frames = 0; P.w0 = performance.now(); P.on = true; return 1 })()");
  await sleep(secs * 1000);
  return JSON.parse(await ev(`JSON.stringify((() => { const P = window.__pf; P.on = false; const w = (performance.now() - P.w0) / 1000;
    const med = a => { if (!a.length) return -1; const s = a.slice().sort((x, y) => x - y); return +s[s.length >> 1].toFixed(2); }, p10 = a => { if (!a.length) return -1; const s = a.slice().sort((x, y) => x - y); return +s[Math.floor(s.length * 0.1)].toFixed(2); }, p90 = a => { if (!a.length) return -1; const s = a.slice().sort((x, y) => x - y); return +s[Math.floor(s.length * 0.9)].toFixed(2); };
    return { frames: P.frames, fps: +(P.frames / w).toFixed(1), gpuMed: med(P.gpu), gpuP10: p10(P.gpu), gpuP90: p90(P.gpu), updMed: med(P.upd), rcpuMed: med(P.rcpu), calls: med(P.calls), tris: med(P.tris), pr: +renderer.getPixelRatio().toFixed(2) }; })())`));
}
