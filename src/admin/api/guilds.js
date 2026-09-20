// api/guilds.js
const express = require('express');
const { fetchUserGuilds, canManageGuild } = require('../auth');
const { query } = require('../../bot/database');

const router = express.Router();

router.get('/guilds', async (req, res) => {
  try {
    const userGuilds = await fetchUserGuilds(req.session.accessToken);
    const manageable = userGuilds.filter(canManageGuild);

    // incrocia con i server in cui Voltguard è effettivamente presente
    const rows = await query('SELECT guild_id FROM guild_settings');
    const botGuildIds = new Set(rows.map(r => r.guild_id));

    // Voltguard deve stare in un solo server: mostriamo solo quello dove è già presente
    const result = manageable
      .filter(g => botGuildIds.has(g.id))
      .map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
        botPresent: true,
      }));

    res.json(result);
  } catch (err) {
    console.error('[api/guilds] errore:', err.message);
    res.status(500).json({ error: 'Impossibile caricare i server' });
  }
});

module.exports = router;
