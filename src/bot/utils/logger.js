// logger.js
// Invia embed di log nel canale configurato dal server (log in tempo reale).

const { EmbedBuilder } = require('discord.js');

async function logToChannel(guild, settings, { title, description, color }) {
  if (!settings.log_channel_id) return;
  const channel = guild.channels.cache.get(settings.log_channel_id);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color || 0x2f6bff)
    .setTimestamp()
    .setFooter({ text: 'Voltguard' });

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('[logger] impossibile inviare log:', err.message);
  }
}

module.exports = { logToChannel };
