(() => {
  "use strict";

  const root = document.getElementById("window-demo");
  if (!root) return;

  const $ = (id) => document.getElementById(id);
  const LOOP = 18;
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoother = (x) => {
    x = clamp01(x);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };
  const easeInOut = (x) => {
    x = clamp01(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };

  const X0 = 200;
  const X1 = 1430;
  const Y = 500;
  const XDIV = 884;
  const MARK_X = 884;

  function sharedRise(x) {
    if (x <= 706) return 0;
    if (x >= XDIV) return 70;
    return 70 * smoother((x - 706) / (XDIV - 706));
  }

  const LATE = [
    [884, 70],
    [995, 330],
    [1075, 560],
    [1150, 478],
    [1240, 60],
    [1300, -188],
    [1352, -284],
    [1398, -300],
    [1424, -238],
    [1430, -186],
  ];

  function crLate(x) {
    const P = LATE;
    const n = P.length;
    if (x <= P[0][0]) return P[0][1];
    if (x >= P[n - 1][0]) return P[n - 1][1];
    let i = 0;
    while (i < n - 1 && x > P[i + 1][0]) i++;
    const p1 = P[i];
    const p2 = P[i + 1];
    const p0 = P[i - 1] || p1;
    const p3 = P[i + 2] || p2;
    const t = (x - p1[0]) / (p2[0] - p1[0]);
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      0.5 *
      (2 * p1[1] +
        (-p0[1] + p2[1]) * t +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
    );
  }

  const devEarly = (x) =>
    x <= XDIV ? sharedRise(x) : x <= 1060 ? 70 * (1 - smoother((x - XDIV) / (1060 - XDIV))) : 0;
  const devLate = (x) => (x <= XDIV ? sharedRise(x) : crLate(x));

  function trace(devFn, leadX) {
    let d = "";
    let lx = X0;
    let ly = Y;
    const step = 4;
    for (let x = X0; x <= leadX + 0.001; x += step) {
      const xx = Math.min(x, leadX);
      const y = Y - devFn(xx);
      d += (x === X0 ? "M" : "L") + xx.toFixed(1) + "," + y.toFixed(1);
      lx = xx;
      ly = y;
    }
    return { d, x: lx, y: ly };
  }

  const area = (tr) => tr.d + "L" + tr.x.toFixed(1) + "," + Y + " L" + X0 + "," + Y + " Z";

  function leadAt(t) {
    if (t <= 4) return lerp(X0, 884, easeInOut(t / 4));
    if (t <= 8) return lerp(884, 1075, easeInOut((t - 4) / 4));
    if (t <= 12) return lerp(1075, 1330, easeInOut((t - 8) / 4));
    if (t <= 15) return lerp(1330, X1, easeInOut((t - 12) / 3));
    return X1;
  }

  const el = {
    root: $("windowDemoRoot"),
    lineEarly: $("windowDemoLineEarly"),
    fillEarly: $("windowDemoFillEarlyPath"),
    dotEarly: $("windowDemoDotEarly"),
    lineLate: $("windowDemoLineLate"),
    dotLate: $("windowDemoDotLate"),
    nudgeRing: $("windowDemoNudgeRing"),
    nudgeDot: $("windowDemoNudgeDot"),
    missDot: $("windowDemoMissDot"),
    labEarly: $("windowDemoLabEarly"),
    capEarly: $("windowDemoCapEarly"),
    labLate: $("windowDemoLabLate"),
    capLate: $("windowDemoCapLate"),
    through: $("windowDemoThroughline"),
    imps: [...root.querySelectorAll("[data-imp]")],
  };

  function masterAlpha(t) {
    if (t < 0.6) return smoother(t / 0.6);
    if (t > 16.8) return 1 - smoother((t - 16.8) / 1.1);
    return 1;
  }

  const reveal = (t, s, d) => smoother((t - s) / d);

  function render(t) {
    const m = masterAlpha(t);
    el.root.style.opacity = m.toFixed(3);

    const leadX = leadAt(t);
    const te = trace(devEarly, leadX);
    const tl = trace(devLate, leadX);
    el.lineEarly.setAttribute("d", te.d);
    el.fillEarly.setAttribute("d", area(te));
    el.lineLate.setAttribute("d", tl.d);

    const pulse = 0.5 + 0.5 * Math.sin((2 * Math.PI * 2 * t) / LOOP);
    el.dotEarly.setAttribute("cx", te.x.toFixed(1));
    el.dotEarly.setAttribute("cy", te.y.toFixed(1));
    el.dotEarly.setAttribute("r", (5 + pulse * 1.5).toFixed(2));
    el.dotLate.setAttribute("cx", tl.x.toFixed(1));
    el.dotLate.setAttribute("cy", tl.y.toFixed(1));
    el.dotLate.setAttribute("r", (5 + pulse * 1.5).toFixed(2));

    const passed = clamp01((leadX - MARK_X) / 150);
    const my = Y - devEarly(MARK_X);
    el.nudgeDot.setAttribute("cx", MARK_X);
    el.nudgeDot.setAttribute("cy", my.toFixed(1));
    el.nudgeDot.setAttribute("opacity", (passed * m).toFixed(3));
    el.nudgeRing.setAttribute("cx", MARK_X);
    el.nudgeRing.setAttribute("cy", my.toFixed(1));
    el.nudgeRing.setAttribute("r", (8 + passed * 22).toFixed(1));
    el.nudgeRing.setAttribute("opacity", ((1 - passed) * 0.7 * m).toFixed(3));

    const myL = Y - devLate(MARK_X);
    el.missDot.setAttribute("cx", MARK_X);
    el.missDot.setAttribute("cy", myL.toFixed(1));
    el.missDot.setAttribute("opacity", (clamp01((leadX - MARK_X) / 60) * (1 - passed) * 0.6 * m).toFixed(3));

    el.labEarly.setAttribute("opacity", (reveal(t, 0.6, 0.9) * m).toFixed(3));
    el.capEarly.setAttribute("opacity", reveal(t, 4.0, 0.9).toFixed(3));
    el.labLate.setAttribute("opacity", (reveal(t, 9.0, 0.9) * m).toFixed(3));
    el.capLate.setAttribute("opacity", reveal(t, 10.5, 0.9).toFixed(3));
    el.through.setAttribute("opacity", (reveal(t, 12.6, 1.1) * m).toFixed(3));

    el.imps.forEach((n, i) => {
      const s = 6.2 + i * 0.45;
      n.setAttribute("opacity", (reveal(t, s, 0.9) * 0.62 * m).toFixed(3));
    });
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce) {
    render(14.5);
    el.root.style.opacity = 1;
    el.labEarly.setAttribute("opacity", 1);
    el.capEarly.setAttribute("opacity", 1);
    el.labLate.setAttribute("opacity", 1);
    el.capLate.setAttribute("opacity", 1);
    el.through.setAttribute("opacity", 1);
    el.imps.forEach((n) => n.setAttribute("opacity", 0.62));
  } else {
    render(0.0001);
    const t0 = performance.now();
    function frame(now) {
      render(((now - t0) / 1000) % LOOP);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
