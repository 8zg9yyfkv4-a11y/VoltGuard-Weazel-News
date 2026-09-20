// antiSpam.js
// Rileva flood di messaggi da parte di un singolo utente in una finestra di tempo.

const { getGuildSettings, addLog } = require('../database');
const { logToChannel } = require('../utils/logger');

// "guildId:userId" -> array di timestamp messaggi recenti
const messageBuckets = new Map();

function recordMessage(guildId, userId) {
  const key = `${guildId}:${userId}`;
  const now = Date.now();
  const arr = messageBuckets.get(key) || [];
  arr.push(now);
  messageBuckets.set(key, arr);
  return arr;
}

function countRecent(guildId, userId, windowSec) {
  const key = `${guildId}:${userId}`;
  const now = Date.now();
  const arr = (messageBuckets.get(key) || []).filter(t => now - t <= windowSec * 1000);
  messageBuckets.set(key, arr);
  return arr.length;
}

async function handleMessage(message) {
  if (!message.guild || message.author.bot) return false;

  const settings = getGuildSettings(message.guild.id);
  if (!settings.antispam_enabled) return false;

  recordMessage(message.guild.id, message.author.id);
  const count = countRecent(message.guild.id, message.author.id, settings.antispam_window_sec);

  if (count < settings.antispam_msg_threshold) return false;

  const reason = `${count} messaggi in ${settings.antispam_window_sec}s`;
  const action = settings.antispam_action;

  try {
    if (message.deletable) await message.delete();
    if (action === 'timeout' && message.member?.moderatable) {
      await message.member.timeout(10 * 60 * 1000, `Voltguard anti-spam: ${reason}`);
    } else if (action === 'kick' && message.member?.kickable) {
      await message.member.kick(`Voltguard anti-spam: ${reason}`);
    }
  } catch (err) {
    console.error('[antiSpam] impossibile applicare azione:', err.message);
  }

  addLog(message.guild.id, 'antispam', message.author.id, null, reason);
  await logToChannel(message.guild, settings, {
    title: '🚫 Anti-Spam attivato',
    color: 0xffb020,
    description: `**Utente:** <@${message.author.id}>\n**Azione:** ${action}\n**Motivo:** ${reason}`,
  });

  return true; // messaggio già gestito, non serve passarlo all'automod
}

module.exports = { handleMessage };
