// planInfo.js
// Comando informativo (chiunque abbia "Gestisci server" può usarlo) che mostra
// il piano attuale del server e una tabella comparativa con gli altri piani,
// cosí chi modera capisce subito cosa ha e cosa otterrebbe con un upgrade.

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('../database');
const { PLANS, PLAN_ORDER, FEATURE_ROWS, formatLimite } = require('../planLimits');

const data = new SlashCommandBuilder()
  .setName('piano-info')
  .setDescription('Mostra il piano attuale del server e le funzioni incluse in ciascun piano')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

function segno(riga, nomePiano) {
  const valore = PLANS[nomePiano][riga.key];
  if (riga.kind === 'bool') return valore ? '✅' : '❌';
  return formatLimite(valore);
}

async function execute(interaction) {
  const settings = await getGuildSettings(interaction.guild.id);
  const pianoAttuale = PLANS[settings.plan] ? settings.plan : 'free';

  const righe = FEATURE_ROWS.map(riga => {
    const valori = PLAN_ORDER.map(p => `**${PLANS[p].label}:** ${segno(riga, p)}`).join('  ·  ');
    return `**${riga.label}**\n${valori}`;
  });

  const embed = new EmbedBuilder()
    .setTitle('📦 Piani Voltguard')
    .setColor(0x2f6bff)
    .setDescription(`Questo server è sul piano **${PLANS[pianoAttuale].label}**.\n\n${righe.join('\n\n')}`)
    .setFooter({ text: 'Per cambiare piano contatta chi gestisce il servizio.' });

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { data, execute };
