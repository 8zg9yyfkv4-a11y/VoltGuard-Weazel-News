// antiRaid.js
// Rileva ondate di join anomale (raid) e account troppo giovani/sospetti.
// Mantiene in memoria, per ogni server, i timestamp dei join recenti.

const { getGuildSettings, addLog } = require('../database');
const { logToChannel } = require('../utils/logger');

// guildId -> array di timestamp (ms) dei join recenti
const joinBuckets = new Map();

function recordJoin(guildId) {
  const now = Date.now();
  const arr = joinBuckets.get(guildId) || [];
  arr.push(now);
  joinBuckets.set(guildId, arr);
  return arr;
}

function countRecentJoins(guildId, windowSec) {
  const now = Date.now();
  const arr = (joinBuckets.get(guildId) || []).filter(t => now - t <= windowSec * 1000);
  joinBuckets.set(guildId, arr);
  return arr.length;
}

async function handleGuildMemberAdd(member) {
  const settings = getGuildSettings(member.guild.id);
  if (!settings.antiraid_enabled) return;

  recordJoin(member.guild.id);
  const recentJoins = countRecentJoins(member.guild.id, settings.antiraid_join_window_sec);

  const accountAgeHours = (Date.now() - member.user.createdTimestamp) / 3_600_000;
  const accountTooNew = accountAgeHours < settings.antiraid_min_account_age_hours;

  const raidWaveDetected = recentJoins >= settings.antiraid_join_threshold;

  if (!raidWaveDetected && !accountTooNew) return;

  const reason = raidWaveDetected
    ? `Ondata di join sospetta: ${recentJoins} ingressi negli ultimi ${settings.antiraid_join_window_sec}s`
    : `Account creato solo ${Math.round(accountAgeHours)}h fa (minimo richiesto: ${settings.antiraid_min_account_age_hours}h)`;

  await applyAction(member, settings, reason);
}

async function applyAction(member, settings, reason) {
  const action = settings.antiraid_action;
  try {
    if (action === 'quarantine' && settings.quarantine_role_id) {
      const role = member.guild.roles.cache.get(settings.quarantine_role_id);
      if (role) await member.roles.add(role, `Voltguard anti-raid: ${reason}`);
    } else if (action === 'kick') {
      await member.kick(`Voltguard anti-raid: ${reason}`);
    } else if (action === 'ban') {
      await member.ban({ reason: `Voltguard anti-raid: ${reason}` });
    }
  } catch (err) {
    console.error('[antiRaid] impossibile applicare azione:', err.message);
  }

  addLog(member.guild.id, 'antiraid', member.id, null, reason);
  await logToChannel(member.guild, settings, {
    title: '🛡️ Anti-Raid attivato',
    color: 0xff5d6c,
    description: `**Utente:** <@${member.id}> (${member.user.tag})\n**Azione:** ${action}\n**Motivo:** ${reason}`,
  });
}

module.exports = { handleGuildMemberAdd };
