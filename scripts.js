console.log("scripts.js loaded");

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOMContentLoaded fired");

  if (window.AOS) {
    console.log("AOS found");
    console.log("Attempting to initialize AOS");
    AOS.init({ duration: 1000, once: true });
    console.log("AOS initialized");
    window.addEventListener('load', AOS.refresh);
  } else {
    console.warn("AOS not found");
  }

  const countdownEl = document.getElementById("countdown");
  if (!countdownEl) {
    console.warn("Countdown element NOT found");
    return;
  }

  console.log("Countdown element found");

  function updateCountdown() {
    const showDate = new Date("2025-06-14T20:00:00-04:00"); // 8 PM ET
    const now = new Date();
    const diff = showDate - now;

    if (diff <= 0) {
      countdownEl.textContent = "Showtime!";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    console.log(`Updating countdown: ${days}d ${hours}h ${minutes}m ${seconds}s`);

    countdownEl.textContent =
      `Countdown: ${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();
});
