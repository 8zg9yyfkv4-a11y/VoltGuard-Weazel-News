// verification.js
// Verifica utenti tramite bottone: chi entra vede un canale con un solo pulsante
// "Verifica" e riceve il ruolo verificato solo dopo averci cliccato.
// Riduce nettamente join-bot automatici e account usa-e-getta.

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getGuildSettings, addLog } = require('../database');
const { logToChannel } = require('../utils/logger');

const VERIFY_BUTTON_ID = 'voltguard_verify';

async function postVerificationPanel(guild, channel) {
  const embed = new EmbedBuilder()
    .setTitle('🛡️ Verifica il tuo account')
    .setDescription('Clicca il pulsante qui sotto per confermare di essere una persona reale e sbloccare il server.')
    .setColor(0x2f6bff);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(VERIFY_BUTTON_ID).setLabel('✅ Verifica account').setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

async function handleVerifyButton(interaction) {
  const settings = getGuildSettings(interaction.guild.id);
  if (!settings.verification_enabled || !settings.verified_role_id) {
    return interaction.reply({ content: 'La verifica non è configurata su questo server.', ephemeral: true });
  }

  try {
    await interaction.member.roles.add(settings.verified_role_id, 'Voltguard: verifica completata');
    if (settings.quarantine_role_id) {
      await interaction.member.roles.remove(settings.quarantine_role_id).catch(() => {});
    }
    addLog(interaction.guild.id, 'verification', interaction.user.id, null, 'Verifica completata');
    await interaction.reply({ content: '✅ Verifica completata! Benvenuto/a.', ephemeral: true });
    await logToChannel(interaction.guild, settings, {
      title: '✅ Utente verificato',
      color: 0x4cc9f0,
      description: `<@${interaction.user.id}> ha completato la verifica.`,
    });
  } catch (err) {
    console.error('[verification] errore assegnazione ruolo:', err.message);
    await interaction.reply({ content: 'Errore durante la verifica, contatta lo staff.', ephemeral: true });
  }
}

module.exports = { postVerificationPanel, handleVerifyButton, VERIFY_BUTTON_ID };
