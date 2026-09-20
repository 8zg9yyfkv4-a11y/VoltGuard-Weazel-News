// api/settings.js
const express = require('express');
const { getGuildSettings, updateGuildSettings } = require('../../bot/database');
const { getPlan, primoPianoCon } = require('../../bot/planLimits');
const { verifyGuildAccess } = require('../middleware');

const router = express.Router();

router.get('/guilds/:guildId/settings', verifyGuildAccess, async (req, res) => {
  res.json(await getGuildSettings(req.params.guildId));
});

const EDITABLE_FIELDS = [
  'log_channel_id', 'verification_channel_id', 'verified_role_id', 'quarantine_role_id',
  'protected_role_ids', 'antiraid_enabled', 'antiraid_join_threshold', 'antiraid_join_window_sec',
  'antiraid_min_account_age_hours', 'antiraid_action', 'antispam_enabled', 'antispam_msg_threshold',
  'antispam_window_sec', 'antispam_action', 'automod_enabled', 'automod_blocked_words',
  'automod_block_invites', 'automod_use_ai', 'verification_enabled', 'backup_enabled',
];

router.patch('/guilds/:guildId/settings', verifyGuildAccess, async (req, res) => {
  const settings = await getGuildSettings(req.params.guildId);
  const plan = getPlan(settings.plan);

  const patch = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in req.body) patch[key] = req.body[key];
  }

  // Coerenza con i limiti del piano: le stesse regole valgono qui, nei comandi
  // Discord e nell'API pubblica, cosí non si aggira il limite passando dal pannello.
  if (patch.automod_use_ai === true && !plan.automodAI) {
    return res.status(403).json({ error: `Il controllo IA richiede almeno il piano ${getPlan(primoPianoCon('automodAI')).label}.` });
  }
  if (patch.backup_enabled === true && !plan.autoBackupDaily) {
    return res.status(403).json({ error: `Il backup automatico giornaliero richiede almeno il piano ${getPlan(primoPianoCon('autoBackupDaily')).label}. Puoi comunque creare backup manuali quando vuoi.` });
  }
  if (Array.isArray(patch.automod_blocked_words) && patch.automod_blocked_words.length > plan.maxBlockedWords) {
    return res.status(403).json({ error: `Il piano ${plan.label} permette al massimo ${plan.maxBlockedWords} parole bloccate.` });
  }

  const updated = await updateGuildSettings(req.params.guildId, patch);
  res.json(updated);
});

module.exports = router;
