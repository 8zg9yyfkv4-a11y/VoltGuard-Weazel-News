const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildSettings } = require('../database');
const { postVerificationPanel } = require('../modules/verification');

const data = new SlashCommandBuilder()
  .setName('verify-panel')
  .setDescription('Pubblica il pannello di verifica in questo canale')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

async function execute(interaction) {
  const settings = await getGuildSettings(interaction.guild.id);
  if (!settings.verified_role_id) {
    return interaction.reply({
      content: '⚠️ Devi prima impostare un ruolo verificato con `/voltguard-setup verified-role`.',
      ephemeral: true,
    });
  }
  await postVerificationPanel(interaction.guild, interaction.channel);
  return interaction.reply({ content: '✅ Pannello di verifica pubblicato.', ephemeral: true });
}

module.exports = { data, execute };
