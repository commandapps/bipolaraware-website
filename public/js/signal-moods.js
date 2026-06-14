(() => {
  "use strict";
  const root = document.getElementById("signalMoodsRoot");
  if (!root) return;

  const $ = (id) => document.getElementById(id);
  const PI = Math.PI;
  const LOOP = 18;
  const CYCLES = 5;

  const Y0 = 370;
  const X_START = 180;
  const X_TODAY = 950;
  const X_END = 1440;
  const CONE_HW = 80;

  const WHITE = [244, 251, 250];
  const lerp = (a, b, t) => a + (b - a) * t;
  const mixA = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
  const rgb = (c) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
  const rgba = (c, a) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const smoother = (x) => {
    x = clamp01(x);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };

  const STATES = {
    steady: { offset: 0, amp: 14, freq: 1.05, tempo: 1.0, tint: [26, 163, 150], word: "Steady" },
    wired: { offset: -78, amp: 24, freq: 1.75, tempo: 1.55, tint: [217, 101, 122], word: "Wired" },
    low: { offset: 58, amp: 9, freq: 0.7, tempo: 0.66, tint: [110, 114, 192], word: "Low" },
  };

  const KEYS = [
    { t: 0.0, s: "steady" },
    { t: 2.0, s: "steady" },
    { t: 4.5, s: "wired" },
    { t: 6.5, s: "wired" },
    { t: 9.0, s: "steady" },
    { t: 11.0, s: "steady" },
    { t: 13.5, s: "low" },
    { t: 15.5, s: "low" },
    { t: 18.0, s: "steady" },
  ];

  function paramsAt(t) {
    let i = 0;
    while (i < KEYS.length - 1 && t >= KEYS[i + 1].t) i++;
    const a = KEYS[i];
    const b = KEYS[Math.min(i + 1, KEYS.length - 1)];
    const span = Math.max(1e-6, b.t - a.t);
    const e = smoother((t - a.t) / span);
    const A = STATES[a.s];
    const B = STATES[b.s];
    const weights = { steady: 0, wired: 0, low: 0 };
    weights[a.s] += 1 - e;
    weights[b.s] += e;
    return {
      offset: lerp(A.offset, B.offset, e),
      amp: lerp(A.amp, B.amp, e),
      freq: lerp(A.freq, B.freq, e),
      tempo: lerp(A.tempo, B.tempo, e),
      tint: mixA(A.tint, B.tint, e),
      weights,
    };
  }

  const PSTEPS = 2400;
  const integ = new Float64Array(PSTEPS + 1);
  (function buildPhase() {
    let acc = 0;
    integ[0] = 0;
    const dt = LOOP / PSTEPS;
    for (let i = 1; i <= PSTEPS; i++) {
      const t = i * dt;
      acc += paramsAt(t).tempo * dt;
      integ[i] = acc;
    }
    const total = integ[PSTEPS] || 1;
    for (let i = 0; i <= PSTEPS; i++) integ[i] = (2 * PI * CYCLES * integ[i]) / total;
  })();

  function phaseAt(t) {
    const x = (t / LOOP) * PSTEPS;
    const i = Math.floor(x);
    const f = x - i;
    if (i >= PSTEPS) return integ[PSTEPS];
    return lerp(integ[i], integ[i + 1], f);
  }

  const swayW = (u) => smoother(u * u);

  function wave(u, P, amp, freq) {
    return (
      amp *
      (0.6 * Math.sin(2 * PI * freq * u + P) +
        0.3 * Math.sin(2 * PI * 1.8 * freq * u - 2 * P + 0.7) +
        0.14 * Math.sin(2 * PI * 3.1 * freq * u + 3 * P + 1.3))
    );
  }

  function buildSignal(P, pr) {
    const n = 120;
    let path = "";
    let lastY = Y0;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = X_START + u * (X_TODAY - X_START);
      const y = Y0 + swayW(u) * pr.offset + wave(u, P, pr.amp, pr.freq) * (0.25 + 0.75 * u);
      path += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2);
      if (i === n) lastY = y;
    }
    return { path, todayY: lastY };
  }

  function buildCone(yT, P, pr) {
    const tilt = pr.offset * 0.92;
    const breathe = 1 + 0.035 * Math.sin(P * 0.5);
    const up = [];
    const low = [];
    let center = "";
    let upper = "";
    const n = 30;
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const x = X_TODAY + s * (X_END - X_TODAY);
      const c = yT + s * tilt;
      const hw = (3 + Math.pow(s, 1.2) * CONE_HW) * breathe;
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
    signal: $("signalMoodsLine"),
    coneFill: $("signalMoodsConeFill"),
    coneCenter: $("signalMoodsConeCenter"),
    coneUpper: $("signalMoodsConeUpper"),
    cone0: $("signalMoodsCone0"),
    cone1: $("signalMoodsCone1"),
    todayDot: $("signalMoodsTodayDot"),
    todayHalo: $("signalMoodsTodayHalo"),
    stateDot: $("signalMoodsStateDot"),
    wordSteady: $("signalMoodsWordSteady"),
    wordWired: $("signalMoodsWordWired"),
    wordLow: $("signalMoodsWordLow"),
  };

  function render(t) {
    const pr = paramsAt(t);
    const P = phaseAt(t);
    const tintLt = mixA(pr.tint, WHITE, 0.45);

    const sig = buildSignal(P, pr);
    el.signal.setAttribute("d", sig.path);
    el.signal.setAttribute("stroke", rgb(pr.tint));
    el.signal.style.filter = `drop-shadow(0 0 7px ${rgba(pr.tint, 0.45)})`;

    const cone = buildCone(sig.todayY, P, pr);
    el.coneFill.setAttribute("d", cone.fill);
    el.coneCenter.setAttribute("d", cone.center);
    el.coneUpper.setAttribute("d", cone.upper);
    el.cone0.setAttribute("stop-color", rgb(pr.tint));
    el.cone1.setAttribute("stop-color", rgb(pr.tint));
    el.coneCenter.setAttribute("stroke", rgb(tintLt));
    el.coneUpper.setAttribute("stroke", rgb(tintLt));

    const dotFill = mixA(WHITE, pr.tint, 0.18);
    const pulse = 0.5 + 0.5 * Math.sin(2 * PI * 3 * (t / LOOP));
    el.todayDot.setAttribute("cx", X_TODAY);
    el.todayDot.setAttribute("cy", sig.todayY.toFixed(2));
    el.todayDot.setAttribute("fill", rgb(dotFill));
    el.todayHalo.setAttribute("cx", X_TODAY);
    el.todayHalo.setAttribute("cy", sig.todayY.toFixed(2));
    el.todayHalo.setAttribute("r", (9 + pulse * 12).toFixed(2));
    el.todayHalo.setAttribute("fill", rgb(pr.tint));
    el.todayHalo.setAttribute("opacity", (0.22 - pulse * 0.15).toFixed(3));

    el.stateDot.setAttribute("fill", rgb(pr.tint));
    el.wordSteady.setAttribute("opacity", pr.weights.steady.toFixed(3));
    el.wordWired.setAttribute("opacity", pr.weights.wired.toFixed(3));
    el.wordLow.setAttribute("opacity", pr.weights.low.toFixed(3));
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
