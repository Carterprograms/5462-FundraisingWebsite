// db.js — data access layer for the sponsor call tracker.
//
// Backed by Supabase (hosted Postgres, free tier). Everything that talks to
// storage goes through this one file — the routes in server.js and the
// frontend don't know or care that it's Supabase under the hood.
//
// Requires two environment variables (set in a local .env file, and in
// Render's dashboard under Environment when deployed):
//   SUPABASE_URL       - e.g. https://xxxxxxxx.supabase.co
//   SUPABASE_ANON_KEY  - the "anon" public API key from your Supabase project

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️  SUPABASE_URL and/or SUPABASE_ANON_KEY are not set. ' +
    'Copy .env.example to .env and fill in your Supabase project details.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function uid() {
  return crypto.randomBytes(6).toString('hex');
}

async function init() {
  // Nothing to do at startup — tables are created once via the SQL in
  // supabase-schema.sql, run directly in the Supabase SQL editor.
  // This function is kept so server.js doesn't need to change.
}

// --- Businesses ---

async function listBusinesses() {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map(rowToBusiness);
}

async function addBusiness({ name, contact, phone, email, notes }) {
  const row = {
    id: uid(),
    name: name || '',
    contact: contact || '',
    phone: phone || '',
    email: email || '',
    notes: notes || '',
    created_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('businesses')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return rowToBusiness(data);
}

async function deleteBusiness(id) {
  const { error } = await supabase.from('businesses').delete().eq('id', id);
  if (error) throw error;
}

// --- Calls ---

async function listCalls() {
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return data.map(rowToCall);
}

async function addCall({ businessId, caller, date, outcome, amount, notes }) {
  const row = {
    id: uid(),
    business_id: businessId,
    caller: caller || '',
    date: date || new Date().toISOString().slice(0, 10),
    outcome: outcome || 'Follow-up',
    amount: amount || 0,
    notes: notes || ''
  };
  const { data, error } = await supabase
    .from('calls')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return rowToCall(data);
}

async function deleteCall(id) {
  const { error } = await supabase.from('calls').delete().eq('id', id);
  if (error) throw error;
}

// --- Row shape helpers (snake_case DB columns -> camelCase for the frontend) ---

function rowToBusiness(row) {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    createdAt: row.created_at
  };
}

function rowToCall(row) {
  return {
    id: row.id,
    businessId: row.business_id,
    caller: row.caller,
    date: row.date,
    outcome: row.outcome,
    amount: row.amount,
    notes: row.notes
  };
}

module.exports = {
  init,
  listBusinesses, addBusiness, deleteBusiness,
  listCalls, addCall, deleteCall
};
