const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const config = require('../config');
const { run } = require('./mysqlClient');

const hashPassword = async (password) => bcrypt.hash(password, 10);

const verifyPassword = async (password, hash) => bcrypt.compare(password, hash);

const issueToken = (payload) =>
  jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.tokenExpiresIn,
    jwtid: nanoid(10),
  });

const verifyToken = (token) => jwt.verify(token, config.auth.jwtSecret);

const createUser = async ({ username, email, password }) => {
  const passwordHash = await hashPassword(password);
  const result = await run(
    `INSERT INTO users (username, email, password_hash)
     VALUES (:username, :email, :passwordHash)`,
    { username, email, passwordHash },
  );
  return { id: result.insertId, username, email };
};

const findUserByEmail = async (email) => {
  const rows = await run(`SELECT id, username, email, password_hash AS passwordHash FROM users WHERE email = :email LIMIT 1`, {
    email,
  });
  return rows[0] || null;
};

const findUserByUsername = async (username) => {
  const rows = await run(
    `SELECT id, username, email, password_hash AS passwordHash FROM users WHERE username = :username LIMIT 1`,
    {
      username,
    },
  );
  return rows[0] || null;
};

const findUserById = async (id) => {
  const rows = await run(
    `SELECT id, username, email, password_hash AS passwordHash FROM users WHERE id = :id LIMIT 1`,
    { id },
  );
  return rows[0] || null;
};

const findUserByOAuth = async (provider, providerUserId) => {
  const rows = await run(
    `SELECT u.id, u.username, u.email, u.password_hash AS passwordHash
       FROM oauth_accounts oa
       JOIN users u ON u.id = oa.user_id
      WHERE oa.provider = :provider AND oa.provider_user_id = :providerUserId
      LIMIT 1`,
    { provider, providerUserId },
  );
  return rows[0] || null;
};

const linkOAuthAccount = async ({ userId, provider, providerUserId }) => {
  await run(
    `INSERT INTO oauth_accounts (user_id, provider, provider_user_id)
     VALUES (:userId, :provider, :providerUserId)
     ON DUPLICATE KEY UPDATE provider_user_id = VALUES(provider_user_id)`,
    { userId, provider, providerUserId },
  );
};

const generateRandomPassword = () => nanoid(32);

const sanitizeUsername = (input) => {
  const base = input.toLowerCase().replace(/[^a-z0-9]/g, '');
  return base || `agent${nanoid(4)}`;
};

const ensureUniqueUsername = async (desired) => {
  let candidate = sanitizeUsername(desired);
  let attempt = 0;
  while (attempt < 10) {
    const existing = await findUserByUsername(candidate);
    if (!existing) return candidate;
    candidate = `${candidate}-${nanoid(4)}`;
    attempt += 1;
  }
  return `${sanitizeUsername(desired)}-${nanoid(6)}`;
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  findUserByOAuth,
  linkOAuthAccount,
  ensureUniqueUsername,
  generateRandomPassword,
  hashPassword,
  verifyPassword,
  issueToken,
  verifyToken,
};
