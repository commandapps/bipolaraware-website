(() => {
  "use strict";

  const root = document.getElementById("share-demo");
  if (!root) return;

  const $ = (id) => document.getElementById(id);
  const LOOP = 15;
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (x) => {
    x = clamp01(x);
    return 1 - Math.pow(1 - x, 3);
  };
  const easeInOut = (x) => {
    x = clamp01(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const bump = (t, a, b) => {
    if (t < a || t > b) return 0;
    return Math.sin((Math.PI * (t - a)) / (b - a));
  };

  function drawSpark(el, data, markLast) {
    if (!el) return;
    const w = 58;
    const h = 20;
    const pad = 2;
    const mn = Math.min(...data);
    const mx = Math.max(...data);
    const rng = mx - mn || 1;
    const pts = data.map((v, i) => {
      const x = pad + (i * (w - 2 * pad)) / (data.length - 1);
      const y = h - pad - ((v - mn) / rng) * (h - 2 * pad);
      return [x, y];
    });
    const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    let svg = `<path d="${d}" stroke="#1AA396" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.9"/>`;
    if (markLast) {
      const lp = pts[pts.length - 1];
      svg += `<circle cx="${lp[0].toFixed(1)}" cy="${lp[1].toFixed(1)}" r="2.4" fill="#E35B76"/>`;
    }
    el.innerHTML = svg;
  }

  drawSpark($("shareDemoSparkSleep"), [6, 5.5, 6, 4, 4.5, 3.5, 2.5, 3], true);
  drawSpark($("shareDemoSparkAct"), [2, 2.5, 2, 3.5, 5, 6, 7.5, 8], true);

  const SCHED = {
    head: [0.3, 0.7, 6],
    prompt: [0.9, 0.8, 8],
    range: [1.9, 0.7, 8],
    stat0: [2.4, 0.7, 10],
    stat1: [2.8, 0.7, 10],
    stat2: [3.2, 0.7, 10],
    pair: [3.9, 0.8, 8],
    toggles: [4.5, 0.7, 8],
    action: [4.9, 0.7, 10],
    caption: [3.6, 0.9, 0],
  };

  const els = {};
  root.querySelectorAll("[data-r]").forEach((n) => {
    els[n.dataset.r] = n;
  });

  const cursor = $("shareDemoCursor");
  const packet = $("shareDemoPacket");
  const ripple = $("shareDemoRipple");
  const shareBtn = $("shareDemoShareBtn");
  const confirm = $("shareDemoConfirm");
  const clinician = $("shareDemoClinician");
  const clinRing = $("shareDemoClinRing");
  const clinCheck = $("shareDemoClinCheck");
  const scene = $("shareDemoScene");
  const card = $("shareDemoCard");
  const lblShare = root.querySelector(".lbl-share");

  let P = null;
  function center(el, s) {
    const r = el.getBoundingClientRect();
    return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
  }
  function measure() {
    const s = scene.getBoundingClientRect();
    const btn = center(shareBtn, s);
    const clin = center(clinician, s);
    P = {
      btn,
      clin,
      start: { x: Math.min(btn.x + 96, s.width - 20), y: Math.min(btn.y + 90, s.height - 16) },
    };
  }

  const CUR_IN = [5.3, 5.8];
  const CUR_MOVE = [5.9, 7.1];
  const PRESS = [7.1, 7.7];
  const CUR_OUT = [7.9, 8.5];
  const PKT = [7.6, 9.1];
  const RECV = 9.05;
  const CONFIRM = [9.5, 10.2];

  function render(t) {
    let m = 1;
    if (t < 0.5) m = easeOut(t / 0.5);
    else if (t > 12.9) m = 1 - easeOut((t - 12.9) / 1.3);
    card.style.opacity = m.toFixed(3);

    for (const id in SCHED) {
      const [s, d, y] = SCHED[id];
      const p = easeOut((t - s) / d);
      els[id].style.opacity = p.toFixed(3);
      if (y) els[id].style.transform = `translateY(${((1 - p) * y).toFixed(2)}px)`;
    }

    if (!P) {
      scene.style.removeProperty("--x");
    } else {
      const cin = easeOut((t - CUR_IN[0]) / (CUR_IN[1] - CUR_IN[0]));
      const cout = easeOut((t - CUR_OUT[0]) / (CUR_OUT[1] - CUR_OUT[0]));
      const cOpacity = clamp01(cin) - clamp01(cout);
      const mv = easeInOut((t - CUR_MOVE[0]) / (CUR_MOVE[1] - CUR_MOVE[0]));
      let cx = lerp(P.start.x, P.btn.x, clamp01(mv));
      let cy = lerp(P.start.y, P.btn.y, clamp01(mv));
      const press = bump(t, PRESS[0], PRESS[1]);
      cy += press * 5;
      const cScale = 1 - press * 0.12;
      cursor.style.opacity = (cOpacity * m).toFixed(3);
      cursor.style.transform = `translate(${(cx - 3).toFixed(1)}px, ${(cy - 3).toFixed(1)}px) scale(${cScale.toFixed(3)})`;

      shareBtn.style.transform = `scale(${(1 - press * 0.035).toFixed(3)})`;
      const rp = bump(t, PRESS[0] + 0.05, PRESS[1] + 0.5);
      ripple.style.opacity = (rp * 0.6).toFixed(3);
      ripple.style.transform = `translate(-50%,-50%) scale(${(rp * 14).toFixed(2)})`;

      const pj = easeInOut((t - PKT[0]) / (PKT[1] - PKT[0]));
      const px = lerp(P.btn.x, P.clin.x, clamp01(pj));
      const py = lerp(P.btn.y, P.clin.y, clamp01(pj));
      const pIn = easeOut((t - PKT[0]) / 0.3);
      const pOut = easeOut((t - (PKT[1] - 0.3)) / 0.3);
      const pOpacity = clamp01(pIn) - clamp01(pOut);
      const pScale = lerp(1, 0.5, clamp01(pj));
      packet.style.opacity = (pOpacity * m).toFixed(3);
      packet.style.transform = `translate(${(px - 37).toFixed(1)}px, ${(py - 15).toFixed(1)}px) scale(${pScale.toFixed(3)})`;

      const recv = clamp01((t - RECV) / 0.5);
      clinician.style.filter = `brightness(${(1 + recv * 0.5).toFixed(2)})`;
      clinician.style.opacity = (lerp(0.62, 1, recv) * m).toFixed(3);
      const ringB = bump(t, RECV, RECV + 0.9);
      clinRing.style.opacity = (ringB * 0.8).toFixed(3);
      clinRing.style.transform = `scale(${(0.7 + ringB * 0.7).toFixed(3)})`;
      const ck = easeOut((t - (RECV + 0.15)) / 0.4);
      clinCheck.style.opacity = clamp01(ck).toFixed(3);
      clinCheck.style.transform = `scale(${lerp(0.4, 1, clamp01(ck)).toFixed(3)})`;

      const cf = easeOut((t - CONFIRM[0]) / (CONFIRM[1] - CONFIRM[0]));
      confirm.style.opacity = clamp01(cf).toFixed(3);
      confirm.style.transform = `translateY(${((1 - clamp01(cf)) * 6).toFixed(2)}px)`;
      if (lblShare) lblShare.parentElement.style.opacity = (1 - clamp01(cf)).toFixed(3);
    }
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function staticResolved() {
    card.style.opacity = 1;
    for (const id in SCHED) {
      els[id].style.opacity = 1;
      els[id].style.transform = "none";
    }
    cursor.style.opacity = 0;
    packet.style.opacity = 0;
    clinician.style.opacity = 1;
    clinician.style.filter = "brightness(1.4)";
    clinCheck.style.opacity = 1;
    clinCheck.style.transform = "scale(1)";
    clinRing.style.opacity = 0;
    confirm.style.opacity = 1;
    confirm.style.transform = "none";
    if (lblShare) lblShare.parentElement.style.opacity = 0;
  }

  function start() {
    measure();
    if (reduce) {
      staticResolved();
      return;
    }
    render(0.0001);
    const t0 = performance.now();
    function frame(now) {
      render(((now - t0) / 1000) % LOOP);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", () => {
    if (P) measure();
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
    setTimeout(() => {
      if (!P) start();
    }, 600);
  } else {
    start();
  }
})();
