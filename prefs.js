// prefs.js — Apply saved appearance settings on every page & sync with server
const PREFS_BASE_URL = window.location.origin === 'null' || window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

(async function () {
  // Apply dark mode immediately from localStorage (prevents flash)
  const localDark = localStorage.getItem('atelier_dark_mode') === 'true';
  if (localDark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');

  // Try to sync from server
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  let settings = {};

  if (user && user.email) {
    try {
      const response = await fetch(`${PREFS_BASE_URL}/api/user/data?email=${encodeURIComponent(user.email)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          settings = data.settings;
        }
      }
    } catch (err) {
      console.warn('Prefs: Could not sync settings from server:', err.message);
    }
  }

  // Resolve dark mode (server overrides local if present)
  const darkMode = settings.darkMode !== undefined ? settings.darkMode : localDark;
  const fontSize = settings.fontSize || localStorage.getItem('atelier_font_size') || '16';

  if (darkMode) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('atelier_dark_mode', 'true');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('atelier_dark_mode', 'false');
  }

  if (settings.autoTranslate !== undefined) {
    localStorage.setItem('atelier_auto_translate', settings.autoTranslate);
  }

  if (fontSize && parseInt(fontSize) >= 12 && parseInt(fontSize) <= 20) {
    localStorage.setItem('atelier_font_size', fontSize);
  }
})();

function isAutoTranslateEnabled() {
  return localStorage.getItem('atelier_auto_translate') === 'true';
}
