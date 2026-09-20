const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateGuildSettings } = require('../database');

const data = new SlashCommandBuilder()
  .setName('antispam')
  .setDescription('Configura il filtro anti-spam')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sc => sc.setName('toggle').setDescription('Attiva/disattiva l\'anti-spam')
    .addBooleanOption(o => o.setName('attivo').setDescription('Attivo?').setRequired(true)))
  .addSubcommand(sc => sc.setName('soglia').setDescription('Numero di messaggi sospetti nella finestra di tempo')
    .addIntegerOption(o => o.setName('messaggi').setDescription('Numero di messaggi').setRequired(true).setMinValue(2).setMaxValue(50))
    .addIntegerOption(o => o.setName('secondi').setDescription('Finestra in secondi').setRequired(true).setMinValue(1).setMaxValue(120)))
  .addSubcommand(sc => sc.setName('azione').setDescription('Azione da applicare in caso di spam')
    .addStringOption(o => o.setName('tipo').setDescription('Azione').setRequired(true)
      .addChoices(
        { name: 'Elimina solo il messaggio', value: 'delete' },
        { name: 'Timeout 10 minuti', value: 'timeout' },
        { name: 'Kick', value: 'kick' },
      )));

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === 'toggle') {
    const attivo = interaction.options.getBoolean('attivo');
    updateGuildSettings(guildId, { antispam_enabled: attivo });
    return interaction.reply({ content: `✅ Anti-spam ${attivo ? 'attivato' : 'disattivato'}.`, ephemeral: true });
  }

  if (sub === 'soglia') {
    const messaggi = interaction.options.getInteger('messaggi');
    const secondi = interaction.options.getInteger('secondi');
    updateGuildSettings(guildId, { antispam_msg_threshold: messaggi, antispam_window_sec: secondi });
    return interaction.reply({ content: `✅ Soglia impostata: ${messaggi} messaggi in ${secondi}s.`, ephemeral: true });
  }

  if (sub === 'azione') {
    const tipo = interaction.options.getString('tipo');
    updateGuildSettings(guildId, { antispam_action: tipo });
    return interaction.reply({ content: `✅ Azione anti-spam impostata su **${tipo}**.`, ephemeral: true });
  }
}

module.exports = { data, execute };
