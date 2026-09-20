// backup.js
// Backup automatico/manuale della struttura del server: ruoli e canali.
// Non fa backup dei messaggi (Discord non lo permette in modo affidabile via API),
// ma permette di ripristinare rapidamente la struttura del server dopo un raid distruttivo.

const { getGuildSettings, saveBackup, getBackupById, addLog } = require('../database');

function snapshotGuild(guild) {
  const roles = guild.roles.cache
    .filter(r => r.id !== guild.id) // esclude @everyone
    .map(r => ({
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      permissions: r.permissions.bitfield.toString(),
      mentionable: r.mentionable,
      position: r.position,
    }));

  const channels = guild.channels.cache.map(c => ({
    name: c.name,
    type: c.type,
    position: c.position,
    parentName: c.parent ? c.parent.name : null,
    topic: c.topic || null,
  }));

  return { guildName: guild.name, takenAt: Date.now(), roles, channels };
}

async function runBackup(guild) {
  const snapshot = snapshotGuild(guild);
  saveBackup(guild.id, snapshot);
  addLog(guild.id, 'backup', null, null, `Backup creato: ${snapshot.roles.length} ruoli, ${snapshot.channels.length} canali`);
  return snapshot;
}

async function restoreBackup(guild, backupId) {
  const backup = getBackupById(backupId);
  if (!backup || backup.guild_id !== guild.id) throw new Error('Backup non trovato per questo server');

  const data = backup.data;
  let restoredRoles = 0;
  let restoredChannels = 0;

  for (const r of data.roles) {
    const exists = guild.roles.cache.find(x => x.name === r.name);
    if (exists) continue;
    await guild.roles.create({
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      mentionable: r.mentionable,
      permissions: BigInt(r.permissions),
    });
    restoredRoles++;
  }

  for (const c of data.channels) {
    const exists = guild.channels.cache.find(x => x.name === c.name && x.type === c.type);
    if (exists) continue;
    await guild.channels.create({ name: c.name, type: c.type, topic: c.topic || undefined });
    restoredChannels++;
  }

  addLog(guild.id, 'backup', null, null, `Ripristino da backup #${backupId}: +${restoredRoles} ruoli, +${restoredChannels} canali`);
  return { restoredRoles, restoredChannels };
}

// Backup automatico ogni 24 ore per i server con backup_enabled attivo.
function scheduleAutoBackups(client) {
  const INTERVAL_MS = 24 * 60 * 60 * 1000;
  setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
      const settings = getGuildSettings(guild.id);
      if (!settings.backup_enabled) continue;
      try {
        await runBackup(guild);
      } catch (err) {
        console.error(`[backup] fallito per ${guild.id}:`, err.message);
      }
    }
  }, INTERVAL_MS);
}

module.exports = { snapshotGuild, runBackup, restoreBackup, scheduleAutoBackups };
