// Shared script: hydrate portfolio data, reveal on scroll, cursor glow, 3D tilt

(function () {
  const P = window.PORTFOLIO || {};

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const nameEls = [document.getElementById("heroName"), document.getElementById("footName")];
  nameEls.forEach(el => { if (el && P.fullName) el.textContent = P.fullName; });

  const heroBio = document.getElementById("heroBio");
  if (heroBio && P.bio) heroBio.textContent = P.bio;

  const gh = document.getElementById("linkGithub");
  const li = document.getElementById("linkLinkedin");
  const em = document.getElementById("linkEmail");
  if (gh && P.github) {
    gh.href = P.github;
    const v = gh.querySelector(".value");
    if (v) v.textContent = "@" + (P.github.split("/").filter(Boolean).pop() || "GitHub");
  }
  if (li && P.linkedin) {
    li.href = P.linkedin;
    const v = li.querySelector(".value");
    if (v) v.textContent = "/in/" + (P.linkedin.split("/").filter(Boolean).pop() || "LinkedIn");
  }
  if (em && P.email) {
    em.href = "mailto:" + P.email;
    const v = em.querySelector(".value");
    if (v) v.textContent = P.email;
  }

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));

  // Cursor glow
  const glow = document.getElementById("cursorGlow");
  if (glow) {
    let glowX = window.innerWidth / 2, glowY = window.innerHeight / 2;
    let targetX = glowX, targetY = glowY;
    window.addEventListener("mousemove", (e) => { targetX = e.clientX; targetY = e.clientY; });
    (function frame() {
      glowX += (targetX - glowX) * 0.12;
      glowY += (targetY - glowY) * 0.12;
      glow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`;
      requestAnimationFrame(frame);
    })();
  }

  // Tilt 3D en project cards
  document.querySelectorAll(".project").forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `translateY(-6px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });

  // Ising-model background: a faint, mouse-reactive 2D spin lattice, echoing
  // the Ising Bayesian project. The ambient temperature slowly drifts across
  // the ordered / critical / disordered regimes (real phase-ordering physics,
  // not a scripted pattern) so the texture is sometimes clean large domains,
  // sometimes the fractal clustering seen right at Tc ≈ 2.269, sometimes fine
  // disordered speckle.
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const canvas = document.createElement("canvas");
    canvas.className = "ising-bg";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const CELL = 14;
    const PERIOD = 1100; // ticks for one full temperature cycle (~2 min at 110ms/tick)
    let cols, rows, spins, tick = 0;
    let mouseX = -9999, mouseY = -9999;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.ceil(canvas.width / CELL);
      rows = Math.ceil(canvas.height / CELL);
      spins = new Int8Array(cols * rows);
      for (let i = 0; i < spins.length; i++) spins[i] = Math.random() < 0.5 ? 1 : -1;
    }
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", (e) => { mouseX = e.clientX; mouseY = e.clientY; });

    function step() {
      tick++;
      const phase = (tick % PERIOD) / PERIOD;
      const T = 2.2 + 1.0 * Math.sin(phase * Math.PI * 2); // drifts ~1.2 (ordered) .. 3.2 (disordered) through Tc
      const hotCol = mouseX / CELL, hotRow = mouseY / CELL;
      const sweeps = Math.floor(spins.length / 6);
      for (let n = 0; n < sweeps; n++) {
        const x = (Math.random() * cols) | 0, y = (Math.random() * rows) | 0;
        const i = y * cols + x;
        const left = spins[y * cols + (x - 1 + cols) % cols];
        const right = spins[y * cols + (x + 1) % cols];
        const up = spins[((y - 1 + rows) % rows) * cols + x];
        const down = spins[((y + 1) % rows) * cols + x];
        const dE = 2 * spins[i] * (left + right + up + down);
        const dist = Math.hypot(x - hotCol, y - hotRow);
        const localT = dist < 6 ? T * 1.6 : T;
        if (dE <= 0 || Math.random() < Math.exp(-dE / localT)) spins[i] *= -1;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 0.12;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (spins[y * cols + x] !== 1) continue;
          // cyan with a minority of hot-pink flecks — higher-contrast pairing than cyan/purple
          ctx.fillStyle = (x * 31 + y * 17) % 5 === 0 ? "#f472b6" : "#22d3ee";
          ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
        }
      }
      ctx.globalAlpha = 1;
    }

    setInterval(step, 110);
  }
})();
