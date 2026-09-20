// api/guilds.js
const express = require('express');
const { fetchUserGuilds, canManageGuild } = require('../auth');
const { db } = require('../../bot/database');

const router = express.Router();

router.get('/guilds', async (req, res) => {
  try {
    const userGuilds = await fetchUserGuilds(req.session.accessToken);
    const manageable = userGuilds.filter(canManageGuild);

    // incrocia con i server in cui Voltguard è effettivamente presente
    const botGuildIds = new Set(db.prepare('SELECT guild_id FROM guild_settings').all().map(r => r.guild_id));

    const result = manageable.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
      botPresent: botGuildIds.has(g.id),
    }));

    res.json(result);
  } catch (err) {
    console.error('[api/guilds] errore:', err.message);
    res.status(500).json({ error: 'Impossibile caricare i server' });
  }
});

module.exports = router;
