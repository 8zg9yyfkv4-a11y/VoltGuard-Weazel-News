// api/backupActions.js
const express = require('express');
const { saveBackup, getBackupById, addLog, getGuildSettings } = require('../../bot/database');
const { getPlan } = require('../../bot/planLimits');
const { verifyGuildAccess } = require('../middleware');
const discordRest = require('../discordRest');

const router = express.Router();

router.post('/guilds/:guildId/backups', verifyGuildAccess, async (req, res) => {
  const guildId = req.params.guildId;
  try {
    const settings = await getGuildSettings(guildId);
    const plan = getPlan(settings.plan);
    const guild = await discordRest.getGuild(guildId);
    const roles = await discordRest.getRoles(guildId);
    const channels = await discordRest.getChannels(guildId);

    const snapshot = {
      guildName: guild.name,
      takenAt: Date.now(),
      roles: roles.filter(r => r.name !== '@everyone').map(r => ({
        name: r.name, color: r.color, hoist: r.hoist, mentionable: r.mentionable, permissions: r.permissions,
      })),
      channels: channels.map(c => ({ name: c.name, type: c.type, topic: c.topic || null })),
    };

    await saveBackup(guildId, snapshot, plan.maxBackups);
    await addLog(guildId, 'backup', null, req.session.user.id, `Backup creato dal pannello admin: ${snapshot.roles.length} ruoli, ${snapshot.channels.length} canali`);
    res.json({ ok: true, roles: snapshot.roles.length, channels: snapshot.channels.length });
  } catch (err) {
    console.error('[api/backups] errore creazione:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/guilds/:guildId/backups/:backupId/restore', verifyGuildAccess, async (req, res) => {
  const guildId = req.params.guildId;
  const backup = await getBackupById(req.params.backupId);
  if (!backup || backup.guild_id !== guildId) return res.status(404).json({ error: 'Backup non trovato' });

  try {
    const existingRoles = await discordRest.getRoles(guildId);
    const existingChannels = await discordRest.getChannels(guildId);

    let restoredRoles = 0;
    for (const r of backup.data.roles) {
      if (existingRoles.some(x => x.name === r.name)) continue;
      await discordRest.createRole(guildId, r);
      restoredRoles++;
    }

    let restoredChannels = 0;
    for (const c of backup.data.channels) {
      if (existingChannels.some(x => x.name === c.name && x.type === c.type)) continue;
      await discordRest.createChannel(guildId, c);
      restoredChannels++;
    }

    await addLog(guildId, 'backup', null, req.session.user.id, `Ripristino da backup #${backup.id} dal pannello admin: +${restoredRoles} ruoli, +${restoredChannels} canali`);
    res.json({ ok: true, restoredRoles, restoredChannels });
  } catch (err) {
    console.error('[api/backups] errore ripristino:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
