const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildSettings, addLog } = require('../database');
const { logToChannel } = require('../utils/logger');

const kick = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Espelle un utente dal server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName('utente').setDescription('Utente da espellere').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo')),
  async execute(interaction) {
    const target = interaction.options.getMember('utente');
    const motivo = interaction.options.getString('motivo') || 'Nessun motivo specificato';
    if (!target?.kickable) return interaction.reply({ content: '❌ Non posso espellere questo utente.', ephemeral: true });
    await target.kick(`${motivo} (da ${interaction.user.tag})`);
    addLog(interaction.guild.id, 'manual', target.id, interaction.user.id, `Kick: ${motivo}`);
    const settings = getGuildSettings(interaction.guild.id);
    await logToChannel(interaction.guild, settings, {
      title: '👢 Kick manuale',
      color: 0xffb020,
      description: `**Utente:** <@${target.id}>\n**Moderatore:** <@${interaction.user.id}>\n**Motivo:** ${motivo}`,
    });
    return interaction.reply({ content: `✅ ${target.user.tag} espulso.`, ephemeral: true });
  },
};

const ban = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banna un utente dal server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('utente').setDescription('Utente da bannare').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo')),
  async execute(interaction) {
    const target = interaction.options.getUser('utente');
    const motivo = interaction.options.getString('motivo') || 'Nessun motivo specificato';
    await interaction.guild.members.ban(target.id, { reason: `${motivo} (da ${interaction.user.tag})` });
    addLog(interaction.guild.id, 'manual', target.id, interaction.user.id, `Ban: ${motivo}`);
    const settings = getGuildSettings(interaction.guild.id);
    await logToChannel(interaction.guild, settings, {
      title: '🔨 Ban manuale',
      color: 0xff5d6c,
      description: `**Utente:** <@${target.id}>\n**Moderatore:** <@${interaction.user.id}>\n**Motivo:** ${motivo}`,
    });
    return interaction.reply({ content: `✅ ${target.tag} bannato.`, ephemeral: true });
  },
};

const quarantine = {
  data: new SlashCommandBuilder()
    .setName('quarantine')
    .setDescription('Mette in quarantena un utente sospetto')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('utente').setDescription('Utente da mettere in quarantena').setRequired(true)),
  async execute(interaction) {
    const settings = getGuildSettings(interaction.guild.id);
    if (!settings.quarantine_role_id) {
      return interaction.reply({ content: '⚠️ Imposta prima un ruolo di quarantena con `/voltguard-setup quarantine-role`.', ephemeral: true });
    }
    const target = interaction.options.getMember('utente');
    await target.roles.add(settings.quarantine_role_id, `Quarantena manuale da ${interaction.user.tag}`);
    addLog(interaction.guild.id, 'manual', target.id, interaction.user.id, 'Quarantena manuale');
    return interaction.reply({ content: `✅ ${target.user.tag} messo in quarantena.`, ephemeral: true });
  },
};

const unquarantine = {
  data: new SlashCommandBuilder()
    .setName('unquarantine')
    .setDescription('Rimuove un utente dalla quarantena')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('utente').setDescription('Utente da liberare').setRequired(true)),
  async execute(interaction) {
    const settings = getGuildSettings(interaction.guild.id);
    if (!settings.quarantine_role_id) {
      return interaction.reply({ content: '⚠️ Nessun ruolo di quarantena configurato.', ephemeral: true });
    }
    const target = interaction.options.getMember('utente');
    await target.roles.remove(settings.quarantine_role_id, `Fine quarantena da ${interaction.user.tag}`);
    addLog(interaction.guild.id, 'manual', target.id, interaction.user.id, 'Fine quarantena manuale');
    return interaction.reply({ content: `✅ ${target.user.tag} rimosso dalla quarantena.`, ephemeral: true });
  },
};

module.exports = { commands: [kick, ban, quarantine, unquarantine] };
