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
})();
