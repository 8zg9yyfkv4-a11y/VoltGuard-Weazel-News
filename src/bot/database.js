// database.js
// Database PostgreSQL (Neon) condiviso tra il bot e il pannello admin.
// Tutte le funzioni sono async: chi le chiama deve usare await.

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('[database] DATABASE_URL non impostata: aggiungila al file .env');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function query(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function initDb() {
  await pool.query(`
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free',            -- free | pro | enterprise
  log_channel_id TEXT,
  verification_channel_id TEXT,
  verified_role_id TEXT,
  quarantine_role_id TEXT,
  protected_role_ids TEXT NOT NULL DEFAULT '[]', -- JSON array, ruoli che l'automod non può mai toccare
  antiraid_enabled INTEGER NOT NULL DEFAULT 1,
  antiraid_join_threshold INTEGER NOT NULL DEFAULT 8,
  antiraid_join_window_sec INTEGER NOT NULL DEFAULT 10,
  antiraid_min_account_age_hours INTEGER NOT NULL DEFAULT 72,
  antiraid_action TEXT NOT NULL DEFAULT 'quarantine',
  antispam_enabled INTEGER NOT NULL DEFAULT 1,
  antispam_msg_threshold INTEGER NOT NULL DEFAULT 5,
  antispam_window_sec INTEGER NOT NULL DEFAULT 6,
  antispam_action TEXT NOT NULL DEFAULT 'timeout',
  automod_enabled INTEGER NOT NULL DEFAULT 1,
  automod_blocked_words TEXT NOT NULL DEFAULT '[]',
  automod_block_invites INTEGER NOT NULL DEFAULT 1,
  automod_use_ai INTEGER NOT NULL DEFAULT 0,
  verification_enabled INTEGER NOT NULL DEFAULT 0,
  backup_enabled INTEGER NOT NULL DEFAULT 1,
  api_key TEXT,
  updated_at INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
);

CREATE TABLE IF NOT EXISTS guild_admins (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS mod_logs (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  type TEXT NOT NULL,        -- antiraid | antispam | automod | verification | manual | backup
  user_id TEXT,
  moderator_id TEXT,
  detail TEXT,
  created_at INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
);

CREATE TABLE IF NOT EXISTS backups (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON snapshot di ruoli e canali
  created_at INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
);

CREATE TABLE IF NOT EXISTS custom_rules (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  rule_type TEXT NOT NULL,  -- blocked_word | whitelist_user | whitelist_domain
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
);
`);
}

// Promise che tutti i punti d'ingresso possono attendere prima di fare query
const dbReady = initDb().catch(err => {
  console.error('[database] errore inizializzazione:', err.message);
  process.exit(1);
});

const DEFAULTS = {
  plan: 'free',
  log_channel_id: null,
  verification_channel_id: null,
  verified_role_id: null,
  quarantine_role_id: null,
  protected_role_ids: '[]',
  antiraid_enabled: 1,
  antiraid_join_threshold: 8,
  antiraid_join_window_sec: 10,
  antiraid_min_account_age_hours: 72,
  antiraid_action: 'quarantine',
  antispam_enabled: 1,
  antispam_msg_threshold: 5,
  antispam_window_sec: 6,
  antispam_action: 'timeout',
  automod_enabled: 1,
  automod_blocked_words: '[]',
  automod_block_invites: 1,
  automod_use_ai: 0,
  verification_enabled: 0,
  backup_enabled: 1,
  api_key: null,
};

async function getGuildSettings(guildId) {
  await dbReady;
  let row = await one('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
  if (!row) {
    const cols = ['guild_id', ...Object.keys(DEFAULTS)];
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
    await pool.query(`INSERT INTO guild_settings (${cols.join(',')}) VALUES (${placeholders}) ON CONFLICT (guild_id) DO NOTHING`,
      [guildId, ...Object.values(DEFAULTS)]);
    row = await one('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
  }
  row.protected_role_ids = JSON.parse(row.protected_role_ids || '[]');
  row.automod_blocked_words = JSON.parse(row.automod_blocked_words || '[]');
  return row;
}

async function updateGuildSettings(guildId, patch) {
  await getGuildSettings(guildId); // assicura che la riga esista
  const allowed = Object.keys(DEFAULTS);
  const keys = Object.keys(patch).filter(k => allowed.includes(k));
  if (keys.length === 0) return getGuildSettings(guildId);

  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map(k => {
    const v = patch[k];
    if (Array.isArray(v)) return JSON.stringify(v);
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v;
  });
  await pool.query(
    `UPDATE guild_settings SET ${setClause}, updated_at = EXTRACT(EPOCH FROM NOW())::INTEGER WHERE guild_id = $${keys.length + 1}`,
    [...values, guildId]
  );
  return getGuildSettings(guildId);
}

async function addLog(guildId, type, userId, moderatorId, detail) {
  await dbReady;
  await pool.query(
    `INSERT INTO mod_logs (guild_id, type, user_id, moderator_id, detail) VALUES ($1,$2,$3,$4,$5)`,
    [guildId, type, userId || null, moderatorId || null, detail || null]
  );
}

async function getLogs(guildId, limit = 100) {
  await dbReady;
  return query('SELECT * FROM mod_logs WHERE guild_id = $1 ORDER BY id DESC LIMIT $2', [guildId, limit]);
}

async function saveBackup(guildId, dataObj, maxBackups = 10) {
  await dbReady;
  await pool.query('INSERT INTO backups (guild_id, data) VALUES ($1, $2)', [guildId, JSON.stringify(dataObj)]);
  // tiene solo gli ultimi N per server (limite dato dal piano) per non far crescere il db all'infinito
  const ids = (await query('SELECT id FROM backups WHERE guild_id = $1 ORDER BY id DESC', [guildId])).map(r => r.id);
  if (maxBackups !== Infinity && ids.length > maxBackups) {
    const toDelete = ids.slice(maxBackups);
    await pool.query('DELETE FROM backups WHERE id = ANY($1::int[])', [toDelete]);
  }
}

async function getBackups(guildId, limit = 10) {
  await dbReady;
  return query('SELECT id, created_at FROM backups WHERE guild_id = $1 ORDER BY id DESC LIMIT $2', [guildId, limit]);
}

async function getBackupById(id) {
  await dbReady;
  const row = await one('SELECT * FROM backups WHERE id = $1', [id]);
  if (row) row.data = JSON.parse(row.data);
  return row;
}

async function isGuildAdmin(guildId, userId) {
  await dbReady;
  const row = await one('SELECT 1 FROM guild_admins WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
  return !!row;
}

async function addGuildAdmin(guildId, userId) {
  await dbReady;
  await pool.query('INSERT INTO guild_admins (guild_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [guildId, userId]);
}

module.exports = {
  pool,
  query,
  one,
  dbReady,
  getGuildSettings,
  updateGuildSettings,
  addLog,
  getLogs,
  saveBackup,
  getBackups,
  getBackupById,
  isGuildAdmin,
  addGuildAdmin,
};
