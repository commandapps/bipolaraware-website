(() => {
  "use strict";
  const stage = document.getElementById("signalStage");
  const viewport = document.querySelector(".signal-demo__viewport");
  if (!stage || !viewport) return;

  const $ = (id) => document.getElementById(id);
  const PI = Math.PI;
  const LOOP = 14;

  const Y0 = 128;
  const X_START = 16;
  const X_TODAY = 516;
  const X_END = 838;
  const LEAN = 40;
  const CONE_TILT = 46;
  const CONE_HW = 52;
  const OSC_A = 8.5;

  const TEAL = [26, 163, 150];
  const ROSE = [217, 101, 122];
  const TLITE = [159, 230, 221];
  const MUTED = [159, 182, 180];
  const DARK = [14, 26, 34];

  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (c1, c2, t) =>
    `rgb(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(lerp(c1[2], c2[2], t))})`;
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const smoother = (x) => {
    x = clamp01(x);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };

  function drift(t) {
    if (t < 4) return 0;
    if (t < 8.5) return smoother((t - 4) / 4.5);
    if (t < 9) return 1;
    if (t < 12) return 1 - smoother((t - 9) / 3);
    return 0;
  }
  function warmth(t) {
    if (t < 4.6) return 0;
    if (t < 7.6) return smoother((t - 4.6) / 3.0);
    if (t < 9.3) return 1;
    if (t < 11.6) return 1 - smoother((t - 9.3) / 2.3);
    return 0;
  }
  function scoutEnv(t) {
    if (t < 4.6) return 0;
    if (t < 5.9) return smoother((t - 4.6) / 1.3);
    if (t < 10.0) return 1;
    if (t < 11.5) return 1 - smoother((t - 10.0) / 1.5);
    return 0;
  }
  function chipProg(t) {
    if (t < 5.0) return 0;
    if (t < 6.5) return smoother((t - 5.0) / 1.5);
    if (t < 9.7) return 1;
    if (t < 11.1) return 1 - smoother((t - 9.7) / 1.4);
    return 0;
  }
  function ringEnv(t) {
    if (t < 8.9 || t >= 10.6) return 0;
    return (t - 8.9) / 1.7;
  }

  function osc(u, p) {
    return (
      OSC_A * 0.55 * Math.sin(2 * PI * (1.4 * u) + 2 * PI * 2 * p) +
      OSC_A * 0.32 * Math.sin(2 * PI * (2.6 * u) - 2 * PI * 3 * p + 0.7) +
      OSC_A * 0.22 * Math.sin(2 * PI * (4.1 * u) + 2 * PI * 1 * p + 1.3)
    );
  }
  function leanW(u) {
    return smoother(Math.max(0, (u - 0.5) / 0.5));
  }

  function buildSignal(p, d) {
    const n = 110;
    let path = "";
    let lastY = Y0;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = X_START + u * (X_TODAY - X_START);
      const y = Y0 + osc(u, p) + leanW(u) * d * -LEAN;
      path += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2);
      if (i === n) lastY = y;
    }
    return { path, todayY: lastY };
  }

  function buildCone(yT, p, d) {
    const n = 30;
    const up = [];
    const low = [];
    let center = "";
    let upper = "";
    const breathe = 1 + 0.035 * Math.sin(2 * PI * p);
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const x = X_TODAY + s * (X_END - X_TODAY);
      const c = yT + s * -CONE_TILT * d;
      const hw = (2 + Math.pow(s, 1.2) * CONE_HW) * breathe;
      up.push([x, c - hw]);
      low.push([x, c + hw]);
      center += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + c.toFixed(2);
      upper += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + (c - hw).toFixed(2);
    }
    let fill = "M" + up[0][0].toFixed(2) + "," + up[0][1].toFixed(2);
    for (let i = 1; i < up.length; i++) fill += "L" + up[i][0].toFixed(2) + "," + up[i][1].toFixed(2);
    for (let i = low.length - 1; i >= 0; i--) fill += "L" + low[i][0].toFixed(2) + "," + low[i][1].toFixed(2);
    fill += "Z";
    return { fill, center, upper };
  }

  const el = {
    signal: $("signalLine"),
    coneFill: $("signalConeFill"),
    coneFillWarm: $("signalConeFillWarm"),
    coneCenter: $("signalConeCenter"),
    coneUpper: $("signalConeUpper"),
    todayDot: $("signalTodayDot"),
    todayHalo: $("signalTodayHalo"),
    catchRing: $("signalCatchRing"),
    led: $("signalLed"),
    wordSteady: $("signalWordSteady"),
    wordWatch: $("signalWordWatch"),
    subSteady: $("signalSubSteady"),
    subWatch: $("signalSubWatch"),
    scout: $("signalScoutCard"),
    chips: $("signalChips"),
    chipHl: $("signalChipHl"),
    chipEls: [...stage.querySelectorAll(".signal-demo .chip")],
  };

  let chipGeom = el.chipEls.map((c) => ({ left: c.offsetLeft, w: c.offsetWidth }));

  function measureChips() {
    chipGeom = el.chipEls.map((c) => ({ left: c.offsetLeft, w: c.offsetWidth }));
  }

  function fit() {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    const s = Math.min(w / 1600, h / 700);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
    measureChips();
  }

  function render(t) {
    const p = t / LOOP;
    const d = drift(t);
    const w = warmth(t);
    const col = mix(TEAL, ROSE, w);

    const sig = buildSignal(p, d);
    el.signal.setAttribute("d", sig.path);
    el.signal.setAttribute("stroke", mix(TEAL, ROSE, w * 0.55));

    const cone = buildCone(sig.todayY, p, d);
    el.coneFill.setAttribute("d", cone.fill);
    el.coneFillWarm.setAttribute("d", cone.fill);
    el.coneFillWarm.setAttribute("opacity", (w * 0.9).toFixed(3));
    el.coneCenter.setAttribute("d", cone.center);
    el.coneUpper.setAttribute("d", cone.upper);
    el.coneUpper.setAttribute("stroke", mix(TLITE, ROSE, w * 0.85));

    const pulse = 0.5 + 0.5 * Math.sin(2 * PI * 2 * p);
    el.todayDot.setAttribute("cx", X_TODAY);
    el.todayDot.setAttribute("cy", sig.todayY.toFixed(2));
    el.todayHalo.setAttribute("cx", X_TODAY);
    el.todayHalo.setAttribute("cy", sig.todayY.toFixed(2));
    el.todayHalo.setAttribute("r", (7 + pulse * 10).toFixed(2));
    el.todayHalo.setAttribute("opacity", (0.2 - pulse * 0.15).toFixed(3));

    const r = ringEnv(t);
    if (r > 0) {
      const e = smoother(r);
      el.catchRing.setAttribute("cx", X_TODAY);
      el.catchRing.setAttribute("cy", sig.todayY.toFixed(2));
      el.catchRing.setAttribute("r", (9 + e * 52).toFixed(2));
      el.catchRing.setAttribute("opacity", ((1 - e) * 0.6).toFixed(3));
      el.catchRing.setAttribute("stroke", mix(TLITE, TEAL, e));
    } else {
      el.catchRing.setAttribute("opacity", 0);
    }

    el.led.style.background = col;
    el.led.style.boxShadow = `0 0 10px ${mix(TEAL, ROSE, w)}`;
    el.wordSteady.style.color = col;
    el.wordWatch.style.color = col;
    const watchT = smoother((w - 0.42) / 0.18);
    el.wordSteady.style.opacity = (1 - watchT).toFixed(3);
    el.wordWatch.style.opacity = watchT.toFixed(3);
    el.subSteady.style.opacity = (1 - watchT).toFixed(3);
    el.subWatch.style.opacity = watchT.toFixed(3);

    const cp = chipProg(t);
    const a = chipGeom[1];
    const b = chipGeom[2];
    if (a && b) {
      const left = lerp(a.left, b.left, cp);
      el.chipHl.style.width = a.w + "px";
      el.chipHl.style.transform = `translateX(${left}px)`;
    }
    el.chipEls.forEach((c, i) => {
      const pos = 1 + cp;
      const cover = Math.max(0, 1 - Math.abs(pos - i));
      c.style.color = mix(MUTED, DARK, cover);
    });

    const se = scoutEnv(t);
    const ee = smoother(se);
    el.scout.style.opacity = ee.toFixed(3);
    el.scout.style.transform = `translate(${((1 - ee) * 22).toFixed(2)}px, 0) scale(${(0.97 + ee * 0.03).toFixed(4)})`;
  }

  fit();
  window.addEventListener("resize", fit);

  if ("ResizeObserver" in window) {
    new ResizeObserver(fit).observe(viewport);
  }

  render(0.0001);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) {
    const t0 = performance.now();
    function frame(now) {
      render(((now - t0) / 1000) % LOOP);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
