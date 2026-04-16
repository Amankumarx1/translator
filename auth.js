const API_URL = 'http://localhost:3000/api/auth';
const AUTH_USER_KEY = 'atelier_auth_user';

function isAuthenticated() {
  return Boolean(sessionStorage.getItem(AUTH_USER_KEY));
}

function requireAuth(redirectTo = 'login.html') {
  if (!isAuthenticated()) {
    window.location.href = redirectTo;
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createUser(email, password, username = '') {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) return { success: false, message: 'Email and password are required.' };
  if (!isValidEmail(normalizedEmail)) return { success: false, message: 'Enter a valid email address.' };

  const passwordHash = await hashPassword(password);

  try {
    const response = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, passwordHash, username: username.trim() })
    });
    return await response.json();
  } catch (err) {
    return { success: false, message: 'Server connection failed.' };
  }
}

async function authenticateUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(password);

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, passwordHash })
    });
    return await response.json();
  } catch (err) {
    return { success: false, message: 'Server connection failed.' };
  }
}

function loginUser(user) {
  const payload = {
    username: user.username || 'Guest',
    email: user.email || '',
    loggedAt: new Date().toISOString()
  };
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload));
}

function logout() {
  sessionStorage.removeItem(AUTH_USER_KEY);
  window.location.href = 'login.html';
}

function getCurrentUser() {
  const raw = sessionStorage.getItem(AUTH_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function initAuthUI() {
  const user = getCurrentUser();
  if (!user) return;
  const initials = getInitials(user.username);
  document.querySelectorAll('.auth-user-name').forEach(el => el.textContent = user.username);
  document.querySelectorAll('.auth-user-email').forEach(el => el.textContent = user.email || '');
  document.querySelectorAll('.auth-user-initials').forEach(el => el.textContent = initials);
}

