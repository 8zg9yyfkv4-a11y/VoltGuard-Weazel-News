const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateGuildSettings } = require('../database');

const data = new SlashCommandBuilder()
  .setName('antiraid')
  .setDescription('Configura l\'anti-raid intelligente')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sc => sc.setName('toggle').setDescription('Attiva/disattiva l\'anti-raid')
    .addBooleanOption(o => o.setName('attivo').setDescription('Attivo?').setRequired(true)))
  .addSubcommand(sc => sc.setName('soglia').setDescription('Numero di join sospetti nella finestra di tempo')
    .addIntegerOption(o => o.setName('join').setDescription('Numero di join').setRequired(true).setMinValue(2).setMaxValue(100))
    .addIntegerOption(o => o.setName('secondi').setDescription('Finestra in secondi').setRequired(true).setMinValue(2).setMaxValue(300)))
  .addSubcommand(sc => sc.setName('eta-minima').setDescription('Età minima account in ore per non essere sospetto')
    .addIntegerOption(o => o.setName('ore').setDescription('Ore minime').setRequired(true).setMinValue(0).setMaxValue(720)))
  .addSubcommand(sc => sc.setName('azione').setDescription('Azione da applicare quando viene rilevato un raid')
    .addStringOption(o => o.setName('tipo').setDescription('Azione').setRequired(true)
      .addChoices(
        { name: 'Quarantena', value: 'quarantine' },
        { name: 'Kick', value: 'kick' },
        { name: 'Ban', value: 'ban' },
      )));

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === 'toggle') {
    const attivo = interaction.options.getBoolean('attivo');
    await updateGuildSettings(guildId, { antiraid_enabled: attivo });
    return interaction.reply({ content: `✅ Anti-raid ${attivo ? 'attivato' : 'disattivato'}.`, ephemeral: true });
  }

  if (sub === 'soglia') {
    const join = interaction.options.getInteger('join');
    const secondi = interaction.options.getInteger('secondi');
    await updateGuildSettings(guildId, { antiraid_join_threshold: join, antiraid_join_window_sec: secondi });
    return interaction.reply({ content: `✅ Soglia impostata: ${join} join in ${secondi}s.`, ephemeral: true });
  }

  if (sub === 'eta-minima') {
    const ore = interaction.options.getInteger('ore');
    await updateGuildSettings(guildId, { antiraid_min_account_age_hours: ore });
    return interaction.reply({ content: `✅ Età minima account impostata a ${ore}h.`, ephemeral: true });
  }

  if (sub === 'azione') {
    const tipo = interaction.options.getString('tipo');
    await updateGuildSettings(guildId, { antiraid_action: tipo });
    return interaction.reply({ content: `✅ Azione anti-raid impostata su **${tipo}**.`, ephemeral: true });
  }
}

module.exports = { data, execute };
