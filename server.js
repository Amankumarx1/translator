const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data', 'users');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve frontend files

// Helpers
function getUserDir(email) {
  return path.join(DATA_DIR, email.replace(/[^a-zA-Z0-9.@_-]/g, '_'));
}

// ── Authentication ──────────────────────────────────────────

app.post('/api/auth/signup', (req, res) => {
  const { email, passwordHash, username } = req.body;
  if (!email || !passwordHash) return res.status(400).json({ success: false, message: 'Email and password are required.' });

  const userDir = getUserDir(email);
  if (fs.existsSync(userDir)) return res.status(400).json({ success: false, message: 'User already exists.' });

  fs.mkdirSync(userDir, { recursive: true });
  const profile = { email, passwordHash, username, createdAt: new Date().toISOString() };
  fs.writeFileSync(path.join(userDir, 'profile.json'), JSON.stringify(profile, null, 2));
  
  // Initialize empty data
  fs.writeFileSync(path.join(userDir, 'history.json'), JSON.stringify([], null, 2));
  fs.writeFileSync(path.join(userDir, 'settings.json'), JSON.stringify({}, null, 2));
  fs.writeFileSync(path.join(userDir, 'palette.json'), JSON.stringify([], null, 2));

  res.json({ success: true, user: { email, username } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, passwordHash } = req.body;
  const userDir = getUserDir(email);
  const profilePath = path.join(userDir, 'profile.json');

  if (!fs.existsSync(profilePath)) return res.status(404).json({ success: false, message: 'Account not found.' });

  const profile = JSON.parse(fs.readFileSync(profilePath));
  if (profile.passwordHash !== passwordHash) return res.status(401).json({ success: false, message: 'Incorrect password.' });

  res.json({ success: true, user: { email: profile.email, username: profile.username } });
});

// ── User Data ───────────────────────────────────────────────

app.get('/api/user/data', (req, res) => {
  const { email } = req.query;
  const userDir = getUserDir(email);
  if (!fs.existsSync(userDir)) return res.status(404).json({ success: false });

  const history = JSON.parse(fs.readFileSync(path.join(userDir, 'history.json')));
  const settings = JSON.parse(fs.readFileSync(path.join(userDir, 'settings.json')));
  const palettePath = path.join(userDir, 'palette.json');
  const palette = fs.existsSync(palettePath) ? JSON.parse(fs.readFileSync(palettePath)) : [];

  res.json({ success: true, history, settings, palette });
});

app.post('/api/user/save-history', (req, res) => {
  const { email, entry } = req.body;
  const userDir = getUserDir(email);
  const historyPath = path.join(userDir, 'history.json');

  if (!fs.existsSync(historyPath)) return res.status(404).json({ success: false });

  const history = JSON.parse(fs.readFileSync(historyPath));
  history.unshift(entry);
  if (history.length > 50) history.splice(50);

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  res.json({ success: true });
});

app.post('/api/user/save-settings', (req, res) => {
  const { email, settings } = req.body;
  const userDir = getUserDir(email);
  const settingsPath = path.join(userDir, 'settings.json');

  if (!fs.existsSync(settingsPath)) return res.status(404).json({ success: false });

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  res.json({ success: true });
});

app.post('/api/user/save-palette', (req, res) => {
  const { email, palette } = req.body;
  const userDir = getUserDir(email);
  if (!fs.existsSync(userDir)) return res.status(404).json({ success: false });

  fs.writeFileSync(path.join(userDir, 'palette.json'), JSON.stringify(palette, null, 2));
  res.json({ success: true });
});

app.get('/api/user/palette', (req, res) => {
  const { email } = req.query;
  const userDir = getUserDir(email);
  const palettePath = path.join(userDir, 'palette.json');
  if (!fs.existsSync(palettePath)) return res.json({ success: true, palette: [] });

  const palette = JSON.parse(fs.readFileSync(palettePath));
  res.json({ success: true, palette });
});

app.listen(PORT, () => {
  console.log(`The Linguistic Atelier server running at http://localhost:${PORT}`);
});
