(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const nav = $("#nav");
  const progressFill = $("#progressFill");
  const hero = $("#top");
  const heroStage = $("#heroStage");
  const heroCopy = $(".hero__copy");
  const heroBackdrop = $(".hero__backdrop");
  const timelineRail = $(".timeline__rail");
  const timelineFill = $("#timelineFill");
  const timelineItems = $$(".tl");

  /* ---------------- Mobile menu ---------------- */
  const burger = $("#burger");
  const mobileMenu = $("#mobileMenu");
  let menuOpen = false;

  function setMenu(open) {
    menuOpen = open;
    mobileMenu.classList.toggle("is-open", open);
    mobileMenu.setAttribute("aria-hidden", String(!open));
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", open);
    document.body.classList.toggle("no-scroll", open);
    if (open) nav.classList.remove("is-hidden");
  }

  burger.addEventListener("click", () => setMenu(!menuOpen));
  $$("a", mobileMenu).forEach((link) => link.addEventListener("click", () => setMenu(false)));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1000 && menuOpen) setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuOpen) setMenu(false);
  });

  /* ---------------- Scroll render ---------------- */
  let lastY = window.scrollY;
  let queued = false;

  function renderScroll() {
    const vh = window.innerHeight;
    const y = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - vh;

    progressFill.style.width = (docHeight > 0 ? clamp(y / docHeight, 0, 1) * 100 : 0).toFixed(2) + "%";

    nav.classList.toggle("is-solid", y > 42);
    if (!menuOpen) {
      const delta = y - lastY;
      if (y > 720 && delta > 5) nav.classList.add("is-hidden");
      else if (delta < -5 || y < 220) nav.classList.remove("is-hidden");
    }
    lastY = y;

    if (hero && !reduceMotion) {
      const heroRange = Math.max(1, hero.offsetHeight * 0.92);
      const p = clamp(y / heroRange, 0, 1);
      heroStage.style.setProperty("--sy", (-p * 52).toFixed(1) + "px");
      heroStage.style.setProperty("--ss", (1 - p * 0.04).toFixed(3));
      heroCopy.style.transform = `translate3d(0, ${(p * 72).toFixed(1)}px, 0)`;
      heroCopy.style.opacity = String(1 - clamp((p - 0.45) / 0.5, 0, 1));
      heroBackdrop.style.transform = `translate3d(0, ${(p * 90).toFixed(1)}px, 0)`;
    }

    parallaxEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -160 || rect.top > vh + 160) return;
      const center = rect.top + rect.height / 2;
      const range = vh / 2 + rect.height / 2;
      const progress = clamp((vh / 2 - center) / range, -1, 1);
      const speed = parseFloat(el.dataset.speed || "0.08");
      el.style.setProperty("--py", (progress * speed * 220).toFixed(1) + "px");
    });

    if (timelineRail && !reduceMotion) {
      const rect = timelineRail.getBoundingClientRect();
      const p = clamp((vh * 0.6 - rect.top) / Math.max(1, rect.height), 0, 1);
      timelineFill.style.height = (p * 100).toFixed(2) + "%";
    } else if (timelineFill) {
      timelineFill.style.height = "100%";
    }

    let active = -1;
    timelineItems.forEach((item, index) => {
      if (item.getBoundingClientRect().top < vh * 0.64) active = index;
    });
    timelineItems.forEach((item, index) => {
      item.classList.toggle("is-active", index === active);
    });
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      renderScroll();
    });
  }

  const parallaxEls = $$("[data-parallax]");
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", onScroll);
  renderScroll();

  /* ---------------- 3D tilt ---------------- */
  if (finePointer && !reduceMotion) {
    $$("[data-tilt]").forEach((el) => {
      const max = parseFloat(el.dataset.tiltMax || "7");
      const zone = el.id === "heroStage" ? el.closest(".hero") : el;
      if (!zone) return;

      zone.addEventListener("pointermove", (event) => {
        const rect = el.getBoundingClientRect();
        const x = clamp((event.clientX - rect.left) / rect.width, 0, 1) - 0.5;
        const y = clamp((event.clientY - rect.top) / rect.height, 0, 1) - 0.5;
        el.style.setProperty("--rx", (-y * max).toFixed(2) + "deg");
        el.style.setProperty("--ry", (x * max).toFixed(2) + "deg");
      }, { passive: true });

      zone.addEventListener("pointerleave", () => {
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------------- Reveals ---------------- */
  const revealEls = $$("[data-reveal], .reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-in"));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* ---------------- Counters ---------------- */
  function runCounter(el) {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    if (reduceMotion) {
      el.textContent = String(target);
      return;
    }
    const start = performance.now();
    const duration = 1500;
    function step(now) {
      const p = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const counters = $$("[data-count]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    counters.forEach((el) => { el.textContent = el.dataset.count; });
  } else {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        runCounter(entry.target);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => counterObserver.observe(el));
  }

  /* ---------------- Store filters ---------------- */
  const storeCards = $$(".store");
  const chips = $$(".chip");

  const counts = { all: storeCards.length };
  storeCards.forEach((card) => {
    counts[card.dataset.city] = (counts[card.dataset.city] || 0) + 1;
  });
  $$("[data-count-for]").forEach((el) => {
    const key = el.dataset.countFor;
    if (counts[key] !== undefined) el.textContent = String(counts[key]);
  });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const filter = chip.dataset.filter;
      chips.forEach((other) => {
        const on = other === chip;
        other.classList.toggle("is-on", on);
        other.setAttribute("aria-pressed", String(on));
      });
      storeCards.forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.city !== filter;
      });
      onScroll();
    });
  });

  /* ---------------- Live store status (PKT) ---------------- */
  const DAY_SETS = {
    mf: [1, 2, 3, 4, 5],
    ss: [6, 0],
    mt: [1, 2, 3, 4],
    fs: [5, 6, 0],
    st: [0, 1, 2, 3, 4],
    all: [0, 1, 2, 3, 4, 5, 6],
  };
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const pktFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const clockFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  function pktNow() {
    const parts = pktFormatter.formatToParts(new Date());
    let day = 0;
    let hours = 0;
    let minutes = 0;
    parts.forEach((part) => {
      if (part.type === "weekday") day = Math.max(0, WEEKDAYS.indexOf(part.value));
      if (part.type === "hour") hours = Number(part.value);
      if (part.type === "minute") minutes = Number(part.value);
    });
    return { day, min: hours * 60 + minutes };
  }

  function parseSchedule(value) {
    return value.split("|").map((chunk) => {
      const [daysKey, range] = chunk.split(":");
      const [start, end] = range.split("-").map(Number);
      return { days: DAY_SETS[daysKey] || DAY_SETS.all, start, end };
    });
  }

  function storeState(entries, now, day) {
    for (const entry of entries) {
      if (entry.days.includes(day) && now >= entry.start && now < entry.end) {
        return { open: true, end: entry.end };
      }
    }
    const yesterday = (day + 6) % 7;
    for (const entry of entries) {
      if (entry.days.includes(yesterday) && entry.end > 1440) {
        if (now + 1440 >= entry.start && now + 1440 < entry.end) {
          return { open: true, end: entry.end };
        }
      }
    }
    let next = null;
    for (const entry of entries) {
      for (const entryDay of entry.days) {
        let diff = (entryDay - day + 7) % 7;
        let minutesAway = diff * 1440 + entry.start - now;
        if (minutesAway < 0) minutesAway += 7 * 1440;
        if (next === null || minutesAway < next) next = minutesAway;
      }
    }
    const start = next === null ? 480 : (now + next) % 1440;
    return { open: false, next: start, wait: next };
  }

  function formatMinutes(value) {
    const total = ((value % 1440) + 1440) % 1440;
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    const suffix = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return minutes === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
  }

  function updateStoreStatus() {
    const now = pktNow();
    storeCards.forEach((card) => {
      const el = card.querySelector("[data-status]");
      const label = el ? el.querySelector("span") : null;
      if (!el || !label) return;

      if (card.dataset.sched === "24h") {
        el.classList.add("is-open");
        label.textContent = "Open 24h";
        el.title = "Open 24 hours, every day";
        return;
      }

      const entries = parseSchedule(card.dataset.sched || "all:480-1500");
      const state = storeState(entries, now.min, now.day);
      el.classList.toggle("is-open", state.open);
      label.textContent = state.open ? "Open now" : "Closed";
      el.title = state.open
        ? `Open until ${formatMinutes(state.end)} PKT`
        : `Opens ${formatMinutes(state.next)} PKT`;
    });
  }

  const clockEl = $("#pktClock");
  function updateClock() {
    if (clockEl) clockEl.textContent = clockFormatter.format(new Date());
  }

  updateStoreStatus();
  updateClock();
  window.setInterval(updateStoreStatus, 60000);
  window.setInterval(updateClock, 30000);

  /* ---------------- Footer year ---------------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
