// server.js — Express API + static frontend for the FRC 5462 sponsor call tracker.

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Google Sheet sync (server-side, shared for the whole team) ---

const SHEET_URL_KEY = 'sheetWebhookUrl';

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

// --- Businesses ---

app.get('/api/businesses', async (req, res) => {
  try {
    const businesses = await db.listBusinesses();
    res.json(businesses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load businesses' });
  }
});

app.post('/api/businesses', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Business name is required' });
    }
    const biz = await db.addBusiness(req.body);
    res.status(201).json(biz);
    sendToSheet({ type: 'business', ...biz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add business' });
  }
});

app.delete('/api/businesses/:id', async (req, res) => {
  try {
    await db.deleteBusiness(req.params.id);
    res.status(204).end();
    sendToSheet({ type: 'delete-business', id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete business' });
  }
});

app.put('/api/businesses/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Business name cannot be empty' });
    }
    const biz = await db.updateBusiness(req.params.id, req.body);
    res.json(biz);
    sendToSheet({ type: 'update-business', ...biz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update business' });
  }
});

// --- Calls ---

app.get('/api/calls', async (req, res) => {
  try {
    const calls = await db.listCalls();
    res.json(calls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load calls' });
  }
});

app.post('/api/calls', async (req, res) => {
  try {
    const { businessId, caller } = req.body;
    if (!businessId || !caller || !caller.trim()) {
      return res.status(400).json({ error: 'businessId and caller are required' });
    }
    const call = await db.addCall(req.body);
    res.status(201).json(call);
    const businesses = await db.listBusinesses();
    const biz = businesses.find(b => b.id === businessId);
    sendToSheet({ type: 'call', ...call, businessName: biz ? biz.name : '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add call' });
  }
});

app.delete('/api/calls/:id', async (req, res) => {
  try {
    await db.deleteCall(req.params.id);
    res.status(204).end();
    sendToSheet({ type: 'delete-call', id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete call' });
  }
});

// --- Settings (the shared Google Sheet webhook URL, set once for the whole team) ---

app.get('/api/settings/sheet-url', async (req, res) => {
  try {
    const url = await db.getSetting(SHEET_URL_KEY);
    res.json({ url: url || '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load setting' });
  }
});

app.post('/api/settings/sheet-url', async (req, res) => {
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
