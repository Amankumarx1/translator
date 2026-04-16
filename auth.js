const AUTH_USER_KEY = 'atelier_auth_user';
const USER_STORE_KEY = 'atelier_users';

function isAuthenticated() {
  return Boolean(sessionStorage.getItem(AUTH_USER_KEY));
}

function requireAuth(redirectTo = 'login.html') {
  if (!isAuthenticated()) {
    window.location.href = redirectTo;
  }
}

function getSavedUsers() {
  return JSON.parse(localStorage.getItem(USER_STORE_KEY) || '{}');
}

function saveUsers(users) {
  localStorage.setItem(USER_STORE_KEY, JSON.stringify(users));
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
  if (!normalizedEmail || !password) {
    return { success: false, message: 'Email and password are required.' };
  }
  if (!isValidEmail(normalizedEmail)) {
    return { success: false, message: 'Enter a valid email address.' };
  }

  const users = getSavedUsers();
  if (users[normalizedEmail]) {
    return { success: false, message: 'This email is already registered.' };
  }

  const passwordHash = await hashPassword(password);
  const displayName = username.trim() || normalizedEmail.split('@')[0].replace(/[^A-Za-z0-9]/g, '') || normalizedEmail;

  users[normalizedEmail] = {
    email: normalizedEmail,
    username: displayName,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  saveUsers(users);
  return { success: true, user: users[normalizedEmail] };
}

async function authenticateUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const users = getSavedUsers();
  const account = users[normalizedEmail];
  if (!account) {
    return { success: false, message: 'No account found with this email.' };
  }
  const passwordHash = await hashPassword(password);
  if (passwordHash !== account.passwordHash) {
    return { success: false, message: 'Incorrect password.' };
  }
  return { success: true, user: account };
}

function loginUser(user) {
  let payload;
  if (typeof user === 'string') {
    payload = { username: user.trim() || 'Guest' };
  } else {
    payload = {
      username: user.username ? String(user.username).trim() : 'Guest',
      email: user.email ? String(user.email).trim() : ''
    };
  }
  payload.loggedAt = new Date().toISOString();
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
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function initAuthUI() {
  const user = getCurrentUser();
  if (!user) return;
  const initials = getInitials(user.username);
  document.querySelectorAll('.auth-user-name').forEach(el => {
    el.textContent = user.username;
  });
  document.querySelectorAll('.auth-user-email').forEach(el => {
    el.textContent = user.email || '';
  });
  document.querySelectorAll('.auth-user-initials').forEach(el => {
    el.textContent = initials;
  });
}
