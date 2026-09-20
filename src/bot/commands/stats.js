const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../database');

const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Mostra le statistiche di sicurezza di questo server');

async function execute(interaction) {
  const guildId = interaction.guild.id;
  const counts = db.prepare(`
    SELECT type, COUNT(*) as n FROM mod_logs WHERE guild_id = ? GROUP BY type
  `).all(guildId);

  const byType = Object.fromEntries(counts.map(c => [c.type, c.n]));
  const total = counts.reduce((acc, c) => acc + c.n, 0);

  const embed = new EmbedBuilder()
    .setTitle(`🛡️ Statistiche Voltguard — ${interaction.guild.name}`)
    .setColor(0x2f6bff)
    .addFields(
      { name: 'Minacce totali gestite', value: String(total), inline: false },
      { name: 'Anti-Raid', value: String(byType.antiraid || 0), inline: true },
      { name: 'Anti-Spam', value: String(byType.antispam || 0), inline: true },
      { name: 'Auto-Moderazione', value: String(byType.automod || 0), inline: true },
      { name: 'Verifiche completate', value: String(byType.verification || 0), inline: true },
      { name: 'Azioni manuali staff', value: String(byType.manual || 0), inline: true },
      { name: 'Backup creati', value: String(byType.backup || 0), inline: true },
    )
    .setFooter({ text: 'Dati reali raccolti da quando Voltguard è stato aggiunto a questo server' });

  return interaction.reply({ embeds: [embed] });
}

module.exports = { data, execute };
