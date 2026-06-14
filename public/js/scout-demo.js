(() => {
  "use strict";
  const card = document.getElementById("scoutDemoCard");
  if (!card) return;

  const LOOP = 15;
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const ease = (x) => {
    x = clamp01(x);
    return 1 - Math.pow(1 - x, 3);
  };

  const els = {};
  card.querySelectorAll("[data-r]").forEach((n) => {
    els[n.dataset.r] = n;
  });

  const SCHED = {
    head: [0.3, 0.7, 6],
    msg0: [1.1, 0.8, 8],
    msg1: [2.1, 0.8, 8],
    msg2: [3.0, 0.8, 8],
    stat0: [4.4, 0.7, 10],
    stat1: [5.0, 0.7, 10],
    cap: [4.8, 0.8, 0],
    follow: [6.3, 0.8, 10],
    chip0: [7.6, 0.6, 12],
    chip1: [7.9, 0.6, 12],
    chip2: [8.2, 0.6, 12],
  };

  const chips = [els.chip0, els.chip1, els.chip2].map((c) => c.querySelector(".hl"));
  const HL_START = 9.2;
  const HL_STEP = 1.15;
  const HL_DUR = 1.15;

  function reveal(id, t) {
    const [s, d, y] = SCHED[id];
    const p = ease((t - s) / d);
    const e = els[id];
    e.style.opacity = p.toFixed(3);
    if (y) e.style.transform = `translateY(${((1 - p) * y).toFixed(2)}px)`;
  }

  function masterAlpha(t) {
    if (t < 0.5) return ease(t / 0.5);
    if (t > 13.6) return 1 - ease((t - 13.6) / 1.2);
    return 1;
  }

  function render(t) {
    card.style.opacity = masterAlpha(t).toFixed(3);
    for (const id in SCHED) reveal(id, t);

    for (let i = 0; i < chips.length; i++) {
      const cs = HL_START + i * HL_STEP;
      let a = 0;
      if (t >= cs && t < cs + HL_DUR) {
        const u = (t - cs) / HL_DUR;
        a = Math.sin(u * Math.PI);
      }
      chips[i].style.opacity = (a * 0.9).toFixed(3);
    }
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce) {
    card.style.opacity = 1;
    for (const id in SCHED) {
      els[id].style.opacity = 1;
      els[id].style.transform = "none";
    }
    chips.forEach((c) => {
      c.style.opacity = 0;
    });
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
