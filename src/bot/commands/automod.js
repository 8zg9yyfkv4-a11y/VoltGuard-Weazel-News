const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateGuildSettings, getGuildSettings } = require('../database');

const data = new SlashCommandBuilder()
  .setName('automod')
  .setDescription('Configura l\'auto-moderazione')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sc => sc.setName('toggle').setDescription('Attiva/disattiva l\'auto-moderazione')
    .addBooleanOption(o => o.setName('attivo').setDescription('Attivo?').setRequired(true)))
  .addSubcommand(sc => sc.setName('blocca-invite').setDescription('Blocca/consenti link di invito Discord')
    .addBooleanOption(o => o.setName('blocca').setDescription('Blocca?').setRequired(true)))
  .addSubcommand(sc => sc.setName('parola-aggiungi').setDescription('Aggiunge una parola alla lista bloccata')
    .addStringOption(o => o.setName('parola').setDescription('Parola da bloccare').setRequired(true)))
  .addSubcommand(sc => sc.setName('parola-rimuovi').setDescription('Rimuove una parola dalla lista bloccata')
    .addStringOption(o => o.setName('parola').setDescription('Parola da rimuovere').setRequired(true)))
  .addSubcommand(sc => sc.setName('parole-lista').setDescription('Mostra la lista delle parole bloccate'))
  .addSubcommand(sc => sc.setName('ia').setDescription('Attiva/disattiva il controllo IA aggiuntivo (richiede OPENAI_API_KEY, piano Pro+)')
    .addBooleanOption(o => o.setName('attivo').setDescription('Attivo?').setRequired(true)));

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === 'toggle') {
    const attivo = interaction.options.getBoolean('attivo');
    updateGuildSettings(guildId, { automod_enabled: attivo });
    return interaction.reply({ content: `✅ Auto-moderazione ${attivo ? 'attivata' : 'disattivata'}.`, ephemeral: true });
  }

  if (sub === 'blocca-invite') {
    const blocca = interaction.options.getBoolean('blocca');
    updateGuildSettings(guildId, { automod_block_invites: blocca });
    return interaction.reply({ content: `✅ Link di invito: ${blocca ? 'bloccati' : 'consentiti'}.`, ephemeral: true });
  }

  if (sub === 'parola-aggiungi') {
    const parola = interaction.options.getString('parola').toLowerCase();
    const settings = getGuildSettings(guildId);
    const updated = Array.from(new Set([...settings.automod_blocked_words, parola]));
    updateGuildSettings(guildId, { automod_blocked_words: updated });
    return interaction.reply({ content: `✅ Parola aggiunta alla lista bloccata (${updated.length} totali).`, ephemeral: true });
  }

  if (sub === 'parola-rimuovi') {
    const parola = interaction.options.getString('parola').toLowerCase();
    const settings = getGuildSettings(guildId);
    const updated = settings.automod_blocked_words.filter(w => w !== parola);
    updateGuildSettings(guildId, { automod_blocked_words: updated });
    return interaction.reply({ content: `✅ Parola rimossa (${updated.length} rimanenti).`, ephemeral: true });
  }

  if (sub === 'parole-lista') {
    const settings = getGuildSettings(guildId);
    const list = settings.automod_blocked_words.length ? settings.automod_blocked_words.join(', ') : 'nessuna';
    return interaction.reply({ content: `**Parole bloccate:** ${list}`, ephemeral: true });
  }

  if (sub === 'ia') {
    const attivo = interaction.options.getBoolean('attivo');
    const settings = getGuildSettings(guildId);
    if (attivo && settings.plan === 'free') {
      return interaction.reply({ content: '⚠️ Il controllo IA è disponibile solo sui piani Pro ed Enterprise.', ephemeral: true });
    }
    updateGuildSettings(guildId, { automod_use_ai: attivo });
    return interaction.reply({ content: `✅ Controllo IA ${attivo ? 'attivato' : 'disattivato'}.`, ephemeral: true });
  }
}

module.exports = { data, execute };
