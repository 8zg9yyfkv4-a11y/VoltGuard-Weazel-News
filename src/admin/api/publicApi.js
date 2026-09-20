// api/publicApi.js
// API pubblica (piano Enterprise) per gestire regole personalizzate e whitelist
// via chiave API generata con /apikey nel bot. Autenticazione: header X-API-Key.
// Documentata nella pagina "API" del pannello admin.

const express = require('express');
const { db, getGuildSettings, updateGuildSettings } = require('../../bot/database');

const router = express.Router();

function requireApiKey(req, res, next) {
  const key = req.header('X-API-Key');
  if (!key) return res.status(401).json({ error: 'Header X-API-Key mancante' });

  const row = db.prepare('SELECT guild_id, plan FROM guild_settings WHERE api_key = ?').get(key);
  if (!row) return res.status(401).json({ error: 'API key non valida' });
  if (row.plan !== 'enterprise') return res.status(403).json({ error: 'API disponibile solo sul piano Enterprise' });

  req.guildId = row.guild_id;
  next();
}

router.use('/v1', requireApiKey);

// Regole personalizzate: parole bloccate, whitelist utenti/domini
router.get('/v1/rules', (req, res) => {
  const rules = db.prepare('SELECT id, rule_type, value, created_at FROM custom_rules WHERE guild_id = ?').all(req.guildId);
  res.json(rules);
});

router.post('/v1/rules', (req, res) => {
  const { rule_type, value } = req.body;
  const allowed = ['blocked_word', 'whitelist_user', 'whitelist_domain'];
  if (!allowed.includes(rule_type) || !value) {
    return res.status(400).json({ error: `rule_type deve essere uno tra: ${allowed.join(', ')}` });
  }
  const info = db.prepare('INSERT INTO custom_rules (guild_id, rule_type, value) VALUES (?,?,?)').run(req.guildId, rule_type, value);

  // se è una parola bloccata, sincronizzala anche nel filtro automod attivo
  if (rule_type === 'blocked_word') {
    const settings = getGuildSettings(req.guildId);
    const words = Array.from(new Set([...settings.automod_blocked_words, value.toLowerCase()]));
    updateGuildSettings(req.guildId, { automod_blocked_words: words });
  }

  res.status(201).json({ id: info.lastInsertRowid, rule_type, value });
});

router.delete('/v1/rules/:id', (req, res) => {
  const rule = db.prepare('SELECT * FROM custom_rules WHERE id = ? AND guild_id = ?').get(req.params.id, req.guildId);
  if (!rule) return res.status(404).json({ error: 'Regola non trovata' });
  db.prepare('DELETE FROM custom_rules WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Sola lettura delle impostazioni correnti del server (utile per integrazioni esterne)
router.get('/v1/settings', (req, res) => {
  res.json(getGuildSettings(req.guildId));
});

module.exports = router;
