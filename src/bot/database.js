// database.js
// Database SQLite condiviso tra il bot e il pannello admin.
// Usa WAL mode così i due processi possono leggere/scrivere in sicurezza.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'voltguard.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free',            -- free | pro | enterprise
  log_channel_id TEXT,
  verification_channel_id TEXT,
  verified_role_id TEXT,
  quarantine_role_id TEXT,
  protected_role_ids TEXT NOT NULL DEFAULT '[]', -- JSON array, ruoli che l'automod non può mai toccare
  antiraid_enabled INTEGER NOT NULL DEFAULT 1,
  antiraid_join_threshold INTEGER NOT NULL DEFAULT 8,   -- N join
  antiraid_join_window_sec INTEGER NOT NULL DEFAULT 10, -- in questa finestra di tempo
  antiraid_min_account_age_hours INTEGER NOT NULL DEFAULT 72,
  antiraid_action TEXT NOT NULL DEFAULT 'quarantine',   -- quarantine | kick | ban
  antispam_enabled INTEGER NOT NULL DEFAULT 1,
  antispam_msg_threshold INTEGER NOT NULL DEFAULT 5,
  antispam_window_sec INTEGER NOT NULL DEFAULT 6,
  antispam_action TEXT NOT NULL DEFAULT 'timeout',      -- delete | timeout | kick
  automod_enabled INTEGER NOT NULL DEFAULT 1,
  automod_blocked_words TEXT NOT NULL DEFAULT '[]',     -- JSON array
  automod_block_invites INTEGER NOT NULL DEFAULT 1,
  automod_use_ai INTEGER NOT NULL DEFAULT 0,
  verification_enabled INTEGER NOT NULL DEFAULT 0,
  backup_enabled INTEGER NOT NULL DEFAULT 1,
  api_key TEXT,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS guild_admins (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS mod_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  type TEXT NOT NULL,        -- antiraid | antispam | automod | verification | manual | backup
  user_id TEXT,
  moderator_id TEXT,
  detail TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON snapshot di ruoli e canali
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS custom_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  rule_type TEXT NOT NULL,  -- blocked_word | whitelist_user | whitelist_domain
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
`);

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

function getGuildSettings(guildId) {
  let row = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
  if (!row) {
    const cols = ['guild_id', ...Object.keys(DEFAULTS)];
    const placeholders = cols.map(() => '?').join(',');
    db.prepare(`INSERT INTO guild_settings (${cols.join(',')}) VALUES (${placeholders})`)
      .run(guildId, ...Object.values(DEFAULTS));
    row = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
  }
  row.protected_role_ids = JSON.parse(row.protected_role_ids || '[]');
  row.automod_blocked_words = JSON.parse(row.automod_blocked_words || '[]');
  return row;
}

function updateGuildSettings(guildId, patch) {
  getGuildSettings(guildId); // assicura che la riga esista
  const allowed = Object.keys(DEFAULTS);
  const keys = Object.keys(patch).filter(k => allowed.includes(k));
  if (keys.length === 0) return getGuildSettings(guildId);

  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => {
    const v = patch[k];
    if (Array.isArray(v)) return JSON.stringify(v);
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v;
  });
  db.prepare(`UPDATE guild_settings SET ${setClause}, updated_at = strftime('%s','now') WHERE guild_id = ?`)
    .run(...values, guildId);
  return getGuildSettings(guildId);
}

function addLog(guildId, type, userId, moderatorId, detail) {
  db.prepare(`INSERT INTO mod_logs (guild_id, type, user_id, moderator_id, detail) VALUES (?,?,?,?,?)`)
    .run(guildId, type, userId || null, moderatorId || null, detail || null);
}

function getLogs(guildId, limit = 100) {
  return db.prepare(`SELECT * FROM mod_logs WHERE guild_id = ? ORDER BY id DESC LIMIT ?`).all(guildId, limit);
}

function saveBackup(guildId, dataObj) {
  db.prepare(`INSERT INTO backups (guild_id, data) VALUES (?, ?)`).run(guildId, JSON.stringify(dataObj));
  // tiene solo le ultime 10 per server per non far crescere il db all'infinito
  const ids = db.prepare(`SELECT id FROM backups WHERE guild_id = ? ORDER BY id DESC`).all(guildId).map(r => r.id);
  if (ids.length > 10) {
    const toDelete = ids.slice(10);
    const stmt = db.prepare(`DELETE FROM backups WHERE id = ?`);
    toDelete.forEach(id => stmt.run(id));
  }
}

function getBackups(guildId, limit = 10) {
  return db.prepare(`SELECT id, created_at FROM backups WHERE guild_id = ? ORDER BY id DESC LIMIT ?`).all(guildId, limit);
}

function getBackupById(id) {
  const row = db.prepare(`SELECT * FROM backups WHERE id = ?`).get(id);
  if (row) row.data = JSON.parse(row.data);
  return row;
}

function isGuildAdmin(guildId, userId) {
  return !!db.prepare('SELECT 1 FROM guild_admins WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
}

function addGuildAdmin(guildId, userId) {
  db.prepare('INSERT OR IGNORE INTO guild_admins (guild_id, user_id) VALUES (?, ?)').run(guildId, userId);
}

module.exports = {
  db,
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
