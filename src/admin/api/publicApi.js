// api/publicApi.js
// API pubblica (piano Enterprise) per gestire regole personalizzate e whitelist
// via chiave API generata con /apikey nel bot. Autenticazione: header X-API-Key.
// Documentata nella pagina "API" del pannello admin.

const express = require('express');
const { query, one, getGuildSettings, updateGuildSettings } = require('../../bot/database');
const { getPlan } = require('../../bot/planLimits');

const router = express.Router();

async function requireApiKey(req, res, next) {
  const key = req.header('X-API-Key');
  if (!key) return res.status(401).json({ error: 'Header X-API-Key mancante' });

  const row = await one('SELECT guild_id, plan FROM guild_settings WHERE api_key = $1', [key]);
  if (!row) return res.status(401).json({ error: 'API key non valida' });
  if (!getPlan(row.plan).apiAccess) return res.status(403).json({ error: 'API non disponibile su questo piano' });

  req.guildId = row.guild_id;
  next();
}

router.use('/v1', requireApiKey);

// Regole personalizzate: parole bloccate, whitelist utenti/domini
router.get('/v1/rules', async (req, res) => {
  const rules = await query('SELECT id, rule_type, value, created_at FROM custom_rules WHERE guild_id = $1', [req.guildId]);
  res.json(rules);
});

router.post('/v1/rules', async (req, res) => {
  const { rule_type, value } = req.body;
  const allowed = ['blocked_word', 'whitelist_user', 'whitelist_domain'];
  if (!allowed.includes(rule_type) || !value) {
    return res.status(400).json({ error: `rule_type deve essere uno tra: ${allowed.join(', ')}` });
  }
  const inserted = await one(
    'INSERT INTO custom_rules (guild_id, rule_type, value) VALUES ($1,$2,$3) RETURNING id',
    [req.guildId, rule_type, value]
  );

  // se è una parola bloccata, sincronizzala anche nel filtro automod attivo
  if (rule_type === 'blocked_word') {
    const settings = await getGuildSettings(req.guildId);
    const words = Array.from(new Set([...settings.automod_blocked_words, value.toLowerCase()]));
    await updateGuildSettings(req.guildId, { automod_blocked_words: words });
  }

  res.status(201).json({ id: inserted.id, rule_type, value });
});

router.delete('/v1/rules/:id', async (req, res) => {
  const rule = await one('SELECT * FROM custom_rules WHERE id = $1 AND guild_id = $2', [req.params.id, req.guildId]);
  if (!rule) return res.status(404).json({ error: 'Regola non trovata' });
  await query('DELETE FROM custom_rules WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// Sola lettura delle impostazioni correnti del server (utile per integrazioni esterne)
router.get('/v1/settings', async (req, res) => {
  res.json(await getGuildSettings(req.guildId));
});

module.exports = router;
