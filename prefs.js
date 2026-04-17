// prefs.js — Apply saved appearance settings on every page
(async function () {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  let settings = {};

  // Server sync removed (Local Only Mode)


  // Fallback to local storage if server settings are empty
  const darkMode = settings.darkMode !== undefined ? settings.darkMode : (localStorage.getItem('atelier_dark_mode') === 'true');
  const fontSize = settings.fontSize || parseInt(localStorage.getItem('atelier_font_size'), 10);

  // ── Dark Mode ──────────────────────────────────────────────
  if (darkMode) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('atelier_dark_mode', 'true');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('atelier_dark_mode', 'false');
  }

  // ── Font Size ──────────────────────────────────────────────
  if (fontSize && fontSize >= 12 && fontSize <= 20) {
    document.documentElement.style.fontSize = fontSize + 'px';
    localStorage.setItem('atelier_font_size', fontSize);
  }
})();

function isAutoTranslateEnabled() {
  return localStorage.getItem('atelier_auto_translate') === 'true';
}

