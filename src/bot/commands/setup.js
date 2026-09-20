const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateGuildSettings, getGuildSettings } = require('../database');

const data = new SlashCommandBuilder()
  .setName('voltguard-setup')
  .setDescription('Configura i canali e i ruoli usati da Voltguard')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sc => sc.setName('log-channel').setDescription('Canale dove Voltguard invia i log')
    .addChannelOption(o => o.setName('canale').setDescription('Canale di log').setRequired(true)))
  .addSubcommand(sc => sc.setName('verification-channel').setDescription('Canale dove viene postato il pannello di verifica')
    .addChannelOption(o => o.setName('canale').setDescription('Canale di verifica').setRequired(true)))
  .addSubcommand(sc => sc.setName('verified-role').setDescription('Ruolo assegnato dopo la verifica')
    .addRoleOption(o => o.setName('ruolo').setDescription('Ruolo verificato').setRequired(true)))
  .addSubcommand(sc => sc.setName('quarantine-role').setDescription('Ruolo usato per mettere in quarantena utenti sospetti')
    .addRoleOption(o => o.setName('ruolo').setDescription('Ruolo di quarantena').setRequired(true)))
  .addSubcommand(sc => sc.setName('protected-role').setDescription('Aggiunge un ruolo esente dall\'auto-moderazione (es. staff)')
    .addRoleOption(o => o.setName('ruolo').setDescription('Ruolo protetto').setRequired(true)))
  .addSubcommand(sc => sc.setName('status').setDescription('Mostra la configurazione attuale'));

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === 'log-channel') {
    const channel = interaction.options.getChannel('canale');
    updateGuildSettings(guildId, { log_channel_id: channel.id });
    return interaction.reply({ content: `✅ Canale di log impostato su ${channel}.`, ephemeral: true });
  }

  if (sub === 'verification-channel') {
    const channel = interaction.options.getChannel('canale');
    updateGuildSettings(guildId, { verification_channel_id: channel.id });
    return interaction.reply({ content: `✅ Canale di verifica impostato su ${channel}.`, ephemeral: true });
  }

  if (sub === 'verified-role') {
    const role = interaction.options.getRole('ruolo');
    updateGuildSettings(guildId, { verified_role_id: role.id, verification_enabled: true });
    return interaction.reply({ content: `✅ Ruolo verificato impostato su ${role}. Verifica attivata.`, ephemeral: true });
  }

  if (sub === 'quarantine-role') {
    const role = interaction.options.getRole('ruolo');
    updateGuildSettings(guildId, { quarantine_role_id: role.id });
    return interaction.reply({ content: `✅ Ruolo di quarantena impostato su ${role}.`, ephemeral: true });
  }

  if (sub === 'protected-role') {
    const role = interaction.options.getRole('ruolo');
    const settings = getGuildSettings(guildId);
    const updated = Array.from(new Set([...settings.protected_role_ids, role.id]));
    updateGuildSettings(guildId, { protected_role_ids: updated });
    return interaction.reply({ content: `✅ ${role} è ora esente dall'auto-moderazione.`, ephemeral: true });
  }

  if (sub === 'status') {
    const s = getGuildSettings(guildId);
    const lines = [
      `**Piano:** ${s.plan}`,
      `**Log:** ${s.log_channel_id ? `<#${s.log_channel_id}>` : 'non impostato'}`,
      `**Verifica:** ${s.verification_enabled ? 'attiva' : 'disattiva'} — ruolo: ${s.verified_role_id ? `<@&${s.verified_role_id}>` : '—'}`,
      `**Quarantena:** ruolo ${s.quarantine_role_id ? `<@&${s.quarantine_role_id}>` : '—'}`,
      `**Anti-Raid:** ${s.antiraid_enabled ? 'attivo' : 'disattivo'} — soglia ${s.antiraid_join_threshold} join/${s.antiraid_join_window_sec}s, azione: ${s.antiraid_action}`,
      `**Anti-Spam:** ${s.antispam_enabled ? 'attivo' : 'disattivo'} — soglia ${s.antispam_msg_threshold} msg/${s.antispam_window_sec}s, azione: ${s.antispam_action}`,
      `**Auto-Moderazione:** ${s.automod_enabled ? 'attiva' : 'disattiva'} — ${s.automod_blocked_words.length} parole bloccate, invite: ${s.automod_block_invites ? 'bloccati' : 'consentiti'}, IA: ${s.automod_use_ai ? 'attiva' : 'disattiva'}`,
    ];
    return interaction.reply({ content: lines.join('\n'), ephemeral: true });
  }
}

module.exports = { data, execute };
