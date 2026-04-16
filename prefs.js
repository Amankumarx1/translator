// prefs.js — Apply saved appearance settings on every page
(function () {
  // ── Dark Mode ──────────────────────────────────────────────
  if (localStorage.getItem('atelier_dark_mode') === 'true') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // ── Font Size ──────────────────────────────────────────────
  const savedSize = parseInt(localStorage.getItem('atelier_font_size'), 10);
  if (savedSize && savedSize >= 12 && savedSize <= 20) {
    document.documentElement.style.fontSize = savedSize + 'px';
  }
})();

// ── Auto-Translate helper (read anywhere) ─────────────────────
function isAutoTranslateEnabled() {
  return localStorage.getItem('atelier_auto_translate') === 'true';
}
