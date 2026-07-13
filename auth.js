// auth.js — accounts, sessions, and permission checks.
//
// How this works:
//  - Passwords are hashed with bcrypt before ever touching the database —
//    the real password is never stored anywhere.
//  - After login/signup, we hand back a JWT in an httpOnly cookie. The
//    browser can't read or tamper with it (no localStorage involved), and
//    it's sent automatically on every request.
//  - requireAuth() blocks any route unless that cookie is present and valid.
//  - requireAdmin() additionally blocks members (non-admins) — used on the
//    delete routes, since that's the main way someone could sabotage data.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn(
    '⚠️  JWT_SECRET is not set. Set a long random string in your .env ' +
    '(and in Render\'s environment settings) or logins will not work.'
  );
}

const COOKIE_NAME = 'frc5462_session';

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signSession(user) {
  // Only ever put non-secret info in the token — it's readable (not just
  // tamper-proof) by anyone who has the cookie.
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function setSessionCookie(res, user) {
  const token = signSession(user);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid — please log in again' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can do this' });
    }
    next();
  });
}

module.exports = {
  COOKIE_NAME,
  hashPassword, verifyPassword,
  setSessionCookie, clearSessionCookie,
  requireAuth, requireAdmin
};
