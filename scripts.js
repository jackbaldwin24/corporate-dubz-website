async function loadPartials() {
  const targets = Array.from(document.querySelectorAll("[data-include]"));
  const requests = targets.map(async (node) => {
    const src = node.getAttribute("data-include");
    if (!src) return;
    const res = await fetch(src);
    if (!res.ok) {
      node.innerHTML = `<p class="fine-print">Failed to load ${src}</p>`;
      return;
    }
    node.innerHTML = await res.text();
  });
  await Promise.all(requests);
}

window.partialsReady = loadPartials();

async function checkShowRedirect() {
  // Prefer query param for local dev (works even when server lacks SPA fallback).
  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get("show");

  const rawPath = window.location.pathname || "/";
  let path = rawPath.replace(/\/+$/, "").replace(/^\/+/, "");
  const pathSlug = (!path || path.endsWith(".html")) ? "" : path;

  const slug = (querySlug || pathSlug || "").toLowerCase().trim();
  if (!slug) return; // homepage or no slug present

  let shows = [];
  try {
    const res = await fetch("/assets/data/shows.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    shows = await res.json();
  } catch (err) {
    console.warn("Show redirect lookup failed", err);
    return;
  }

  const match = Array.isArray(shows)
    ? shows.find((s) => (s.slug || "").toLowerCase() === slug)
    : null;

  if (match && match.link) {
    window.location.replace(match.link);
  }
}

function handleHeaderShadow() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const toggle = () =>
    header.classList.toggle("is-stuck", window.scrollY > 10);
  toggle();
  window.addEventListener("scroll", toggle, { passive: true });
}

function initAOS() {
  if (!window.AOS) return;
  AOS.init({ duration: 900, once: true, offset: 80 });
  window.addEventListener("load", () => AOS.refresh());
}

async function loadShows() {
  const grid = document.querySelector("[data-shows-grid]");
  const loading = document.querySelector("[data-shows-loading]");
  if (!grid) return;
  if (loading) loading.textContent = "Loading shows…";

  let shows = [];
  try {
    const res = await fetch("assets/data/shows.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    shows = await res.json();
  } catch (err) {
    grid.innerHTML = `<p class="fine-print">Could not load shows right now.</p>`;
    console.warn("Failed to load shows.json", err);
    return;
  }

  grid.innerHTML = "";
  if (!Array.isArray(shows) || !shows.length) {
    grid.innerHTML = `<p class="fine-print">No shows announced yet. Check back soon.</p>`;
    return;
  }

  shows.forEach((show, idx) => {
    const card = document.createElement(show.link ? "a" : "div");
    card.className = "show-card";
    if (show.link) {
      card.href = show.link;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
    }
    if (window.AOS) {
      card.setAttribute("data-aos", "fade-up");
      if (idx) card.setAttribute("data-aos-delay", String(Math.min(180, idx * 60)));
    }

    const media = document.createElement("div");
    media.className = "show-card__media";
    if (show.image) {
      const img = document.createElement("img");
      img.src = show.image;
      img.alt = `${show.title || "Show"} flyer`;
      img.loading = "lazy";
      media.appendChild(img);
    } else {
      media.innerHTML = `<p class="fine-print">Flyer coming soon</p>`;
    }

    const body = document.createElement("div");
    body.className = "show-card__body";
    const head = document.createElement("div");
    head.className = "show-head";
    if (show.date) {
      const date = document.createElement("span");
      date.className = "chip chip--date";
      date.textContent = show.date;
      head.appendChild(date);
    }
    if (show.link) {
      const linkIcon = document.createElement("span");
      linkIcon.className = "show-link-icon";
      linkIcon.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i>`;
      head.appendChild(linkIcon);
    }
    if (head.childNodes.length) body.appendChild(head);

    if (show.promoter) {
      const promoter = document.createElement("p");
      promoter.className = "show-promoter";
      promoter.textContent = `${show.promoter} Presents:`;
      body.appendChild(promoter);
    }
    if (show.title) {
      const title = document.createElement("p");
      title.className = "show-title";
      title.textContent = show.title;
      body.appendChild(title);
    }
    if (show.venue) {
      const venue = document.createElement("p");
      venue.className = "show-venue";
      venue.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${show.venue}`;
      body.appendChild(venue);
    }
    if (show.location) {
      const meta = document.createElement("p");
      meta.className = "show-meta";
      meta.textContent = show.location;
      body.appendChild(meta);
    }
    card.appendChild(media);
    card.appendChild(body);
    grid.appendChild(card);
  });

  if (window.AOS) {
    setTimeout(() => AOS.refresh(), 50);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  checkShowRedirect();
  try {
    await window.partialsReady;
  } catch (err) {
    console.warn("Partial load failed", err);
  }
  await loadShows();
  initAOS();
  handleHeaderShadow();
});
