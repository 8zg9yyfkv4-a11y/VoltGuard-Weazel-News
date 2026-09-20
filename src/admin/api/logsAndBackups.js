// api/logsAndBackups.js
const express = require('express');
const { getLogs, getBackups, query } = require('../../bot/database');
const { verifyGuildAccess } = require('../middleware');

const router = express.Router();

router.get('/guilds/:guildId/logs', verifyGuildAccess, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  res.json(await getLogs(req.params.guildId, limit));
});

router.get('/guilds/:guildId/backups', verifyGuildAccess, async (req, res) => {
  res.json(await getBackups(req.params.guildId));
});

router.get('/guilds/:guildId/stats', verifyGuildAccess, async (req, res) => {
  const counts = await query(
    'SELECT type, COUNT(*) as n FROM mod_logs WHERE guild_id = $1 GROUP BY type',
    [req.params.guildId]
  );
  res.json(Object.fromEntries(counts.map(c => [c.type, Number(c.n)])));
});

module.exports = router;
