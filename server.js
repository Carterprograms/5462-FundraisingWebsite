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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add business' });
  }
});

app.delete('/api/businesses/:id', async (req, res) => {
  try {
    await db.deleteBusiness(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete business' });
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add call' });
  }
});

app.delete('/api/calls/:id', async (req, res) => {
  try {
    await db.deleteCall(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete call' });
  }
});

db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`FRC 5462 sponsor call tracker running on http://localhost:${PORT}`);
  });
});
