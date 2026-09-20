// plan.js
// Comando riservato all'owner del bot (OWNER_ID nel .env) per cambiare il piano
// (free | pro | enterprise) di un server. Non è un comando amministrativo del
// server: anche un Amministratore del server target NON può usarlo, perché il
// controllo è sull'ID Discord dell'owner del bot, non sui permessi del server.

const { SlashCommandBuilder } = require('discord.js');
const { getGuildSettings, updateGuildSettings } = require('../database');

const PIANI_VALIDI = ['free', 'pro', 'enterprise'];

const data = new SlashCommandBuilder()
  .setName('piano')
  .setDescription('[Solo owner] Cambia il piano di un server')
  .addStringOption(opt =>
    opt.setName('valore')
      .setDescription('Nuovo piano')
      .setRequired(true)
      .addChoices(
        { name: 'free', value: 'free' },
        { name: 'pro', value: 'pro' },
        { name: 'enterprise', value: 'enterprise' },
      ))
  .addStringOption(opt =>
    opt.setName('server_id')
      .setDescription('ID del server da modificare (default: questo server)')
      .setRequired(false));

async function execute(interaction) {
  const ownerId = process.env.OWNER_ID;
  if (!ownerId) {
    return interaction.reply({
      content: '⚠️ OWNER_ID non è impostato nel `.env`: questo comando è disattivato finché non lo configuri.',
      ephemeral: true,
    });
  }
  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: '⛔ Comando riservato all\'owner del bot.', ephemeral: true });
  }

  const nuovoPiano = interaction.options.getString('valore');
  const guildId = interaction.options.getString('server_id') || interaction.guild?.id;

  if (!guildId) {
    return interaction.reply({ content: '⚠️ Specifica un `server_id` (qui non siamo dentro un server).', ephemeral: true });
  }
  if (!PIANI_VALIDI.includes(nuovoPiano)) {
    return interaction.reply({ content: `⚠️ Piano non valido. Valori ammessi: ${PIANI_VALIDI.join(', ')}.`, ephemeral: true });
  }

  const prima = await getGuildSettings(guildId);
  await updateGuildSettings(guildId, { plan: nuovoPiano });

  return interaction.reply({
    content: `✅ Piano del server \`${guildId}\` aggiornato: **${prima.plan}** → **${nuovoPiano}**.`,
    ephemeral: true,
  });
}

module.exports = { data, execute };
