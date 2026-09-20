// middleware.js
const { fetchUserGuilds, canManageGuild } = require('./auth');

async function verifyGuildAccess(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Non autenticato' });

  try {
    const guilds = await fetchUserGuilds(req.session.accessToken);
    const target = guilds.find(g => g.id === req.params.guildId);
    if (!target || !canManageGuild(target)) {
      return res.status(403).json({ error: 'Non hai i permessi per gestire questo server' });
    }
    next();
  } catch (err) {
    console.error('[middleware] errore verifica permessi:', err.message);
    res.status(500).json({ error: 'Errore di verifica permessi' });
  }
}

module.exports = { verifyGuildAccess };
