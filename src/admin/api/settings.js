// api/settings.js
const express = require('express');
const { getGuildSettings, updateGuildSettings } = require('../../bot/database');
const { verifyGuildAccess } = require('../middleware');

const router = express.Router();

router.get('/guilds/:guildId/settings', verifyGuildAccess, (req, res) => {
  res.json(getGuildSettings(req.params.guildId));
});

const EDITABLE_FIELDS = [
  'log_channel_id', 'verification_channel_id', 'verified_role_id', 'quarantine_role_id',
  'protected_role_ids', 'antiraid_enabled', 'antiraid_join_threshold', 'antiraid_join_window_sec',
  'antiraid_min_account_age_hours', 'antiraid_action', 'antispam_enabled', 'antispam_msg_threshold',
  'antispam_window_sec', 'antispam_action', 'automod_enabled', 'automod_blocked_words',
  'automod_block_invites', 'automod_use_ai', 'verification_enabled', 'backup_enabled',
];

router.patch('/guilds/:guildId/settings', verifyGuildAccess, (req, res) => {
  const patch = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in req.body) patch[key] = req.body[key];
  }
  const updated = updateGuildSettings(req.params.guildId, patch);
  res.json(updated);
});

module.exports = router;
