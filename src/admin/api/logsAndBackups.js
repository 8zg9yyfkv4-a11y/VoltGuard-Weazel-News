// api/logsAndBackups.js
const express = require('express');
const { getLogs, getBackups, db } = require('../../bot/database');
const { verifyGuildAccess } = require('../middleware');

const router = express.Router();

router.get('/guilds/:guildId/logs', verifyGuildAccess, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  res.json(getLogs(req.params.guildId, limit));
});

router.get('/guilds/:guildId/backups', verifyGuildAccess, (req, res) => {
  res.json(getBackups(req.params.guildId));
});

router.get('/guilds/:guildId/stats', verifyGuildAccess, (req, res) => {
  const counts = db.prepare('SELECT type, COUNT(*) as n FROM mod_logs WHERE guild_id = ? GROUP BY type')
    .all(req.params.guildId);
  res.json(Object.fromEntries(counts.map(c => [c.type, c.n])));
});

module.exports = router;
