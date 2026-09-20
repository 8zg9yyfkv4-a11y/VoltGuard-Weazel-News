const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getBackups } = require('../database');
const { runBackup, restoreBackup } = require('../modules/backup');

const data = new SlashCommandBuilder()
  .setName('backup')
  .setDescription('Backup e ripristino della struttura del server')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sc => sc.setName('crea').setDescription('Crea un backup ora di ruoli e canali'))
  .addSubcommand(sc => sc.setName('lista').setDescription('Mostra i backup disponibili'))
  .addSubcommand(sc => sc.setName('ripristina').setDescription('Ripristina ruoli e canali mancanti da un backup')
    .addIntegerOption(o => o.setName('id').setDescription('ID del backup (vedi /backup lista)').setRequired(true)));

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === 'crea') {
    await interaction.deferReply({ ephemeral: true });
    const snap = await runBackup(interaction.guild);
    return interaction.editReply(`✅ Backup creato: ${snap.roles.length} ruoli, ${snap.channels.length} canali salvati.`);
  }

  if (sub === 'lista') {
    const backups = await getBackups(guildId);
    if (!backups.length) return interaction.reply({ content: 'Nessun backup disponibile ancora.', ephemeral: true });
    const list = backups.map(b => `**#${b.id}** — ${new Date(b.created_at * 1000).toLocaleString('it-IT')}`).join('\n');
    return interaction.reply({ content: list, ephemeral: true });
  }

  if (sub === 'ripristina') {
    const id = interaction.options.getInteger('id');
    await interaction.deferReply({ ephemeral: true });
    try {
      const result = await restoreBackup(interaction.guild, id);
      return interaction.editReply(`✅ Ripristino completato: +${result.restoredRoles} ruoli, +${result.restoredChannels} canali (vengono ricreati solo gli elementi mancanti).`);
    } catch (err) {
      return interaction.editReply(`❌ Errore: ${err.message}`);
    }
  }
}

module.exports = { data, execute };
