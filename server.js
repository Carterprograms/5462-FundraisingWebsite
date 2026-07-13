// server.js — Express API + static frontend for the FRC 5462 sponsor call tracker.

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// --- Google Sheet sync (server-side, shared for the whole team) ---

const SHEET_URL_KEY = 'sheetWebhookUrl';
const INVITE_CODE_KEY = 'inviteCode';

async function sendToSheet(payload) {
  try {
    const url = await db.getSetting(SHEET_URL_KEY);
    if (!url) return;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // Never let a Sheet sync failure break the actual request — just log it.
    console.error('Sheet sync failed:', err.message);
  }
}

// --- Auth ---

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password, inviteCode } = req.body;
    if (!username || !username.trim() || !password || password.length < 6) {
      return res.status(400).json({ error: 'Username and a password (6+ characters) are required' });
    }

    const realInviteCode = await db.getSetting(INVITE_CODE_KEY);
    if (!realInviteCode || inviteCode !== realInviteCode) {
      return res.status(403).json({ error: 'Invalid invite code' });
    }

    const existing = await db.getUserByUsername(username.trim());
    if (existing) {
      return res.status(409).json({ error: 'That username is already taken' });
    }

    const userCount = await db.countUsers();
    const role = userCount === 0 ? 'admin' : 'member'; // first-ever account becomes admin

    const passwordHash = await auth.hashPassword(password);
    const user = await db.createUser({
      id: crypto.randomBytes(6).toString('hex'),
      username: username.trim(),
      passwordHash,
      role
    });

    auth.setSessionCookie(res, user);
    res.status(201).json({ username: user.username, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to sign up' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const user = await db.getUserByUsername(username.trim());
    if (!user) {
      return res.status(401).json({ error: 'Incorrect username or password' });
    }
    const valid = await auth.verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect username or password' });
    }
    auth.setSessionCookie(res, user);
    res.json({ username: user.username, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  auth.clearSessionCookie(res);
  res.status(204).end();
});

app.get('/api/auth/me', auth.requireAuth, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role });
});

// --- Businesses (all require login; delete requires admin) ---

app.get('/api/businesses', auth.requireAuth, async (req, res) => {
  try {
    const businesses = await db.listBusinesses();
    res.json(businesses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load businesses' });
  }
});

app.post('/api/businesses', auth.requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Business name is required' });
    }
    const biz = await db.addBusiness(req.body, req.user.username);
    res.status(201).json(biz);
    sendToSheet({ type: 'business', ...biz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add business' });
  }
});

app.delete('/api/businesses/:id', auth.requireAdmin, async (req, res) => {
  try {
    await db.deleteBusiness(req.params.id);
    res.status(204).end();
    sendToSheet({ type: 'delete-business', id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete business' });
  }
});

app.put('/api/businesses/:id', auth.requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Business name cannot be empty' });
    }
    const biz = await db.updateBusiness(req.params.id, req.body, req.user.username);
    res.json(biz);
    sendToSheet({ type: 'update-business', ...biz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update business' });
  }
});

// --- Calls (all require login; delete requires admin) ---

app.get('/api/calls', auth.requireAuth, async (req, res) => {
  try {
    const calls = await db.listCalls();
    res.json(calls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load calls' });
  }
});

app.post('/api/calls', auth.requireAuth, async (req, res) => {
  try {
    const { businessId, caller } = req.body;
    if (!businessId || !caller || !caller.trim()) {
      return res.status(400).json({ error: 'businessId and caller are required' });
    }
    const call = await db.addCall(req.body, req.user.username);
    res.status(201).json(call);
    const businesses = await db.listBusinesses();
    const biz = businesses.find(b => b.id === businessId);
    sendToSheet({ type: 'call', ...call, businessName: biz ? biz.name : '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add call' });
  }
});

app.delete('/api/calls/:id', auth.requireAdmin, async (req, res) => {
  try {
    await db.deleteCall(req.params.id);
    res.status(204).end();
    sendToSheet({ type: 'delete-call', id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete call' });
  }
});

// --- Settings (the shared Google Sheet webhook URL — admin only to change) ---

app.get('/api/settings/sheet-url', auth.requireAuth, async (req, res) => {
  try {
    const url = await db.getSetting(SHEET_URL_KEY);
    res.json({ url: url || '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load setting' });
  }
});

app.post('/api/settings/sheet-url', auth.requireAdmin, async (req, res) => {
  try {
    const { url } = req.body;
    await db.setSetting(SHEET_URL_KEY, url || '');
    res.json({ url: url || '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`FRC 5462 sponsor call tracker running on http://localhost:${PORT}`);
  });
});
