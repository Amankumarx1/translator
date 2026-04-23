const AUTH_USER_KEY = 'atelier_auth_user';
const LOCAL_USERS_KEY = 'atelier_local_users';
const BASE_URL = window.location.origin === 'null' || window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

function getLocalUsers() {
  const raw = localStorage.getItem(LOCAL_USERS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveLocalUsers(users) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

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
    const response = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, passwordHash, username: username.trim() })
    });
    
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Signup Error:', err);
    return { success: false, message: 'Could not connect to the server. Make sure server.js is running.' };
  }
}

async function authenticateUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(password);

  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, passwordHash })
    });
    
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Login Error:', err);
    return { success: false, message: 'Could not connect to the server. Make sure server.js is running.' };
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

