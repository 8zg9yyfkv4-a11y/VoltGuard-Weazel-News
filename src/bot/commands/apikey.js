const crypto = require('crypto');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildSettings, updateGuildSettings } = require('../database');
const { getPlan, primoPianoCon } = require('../planLimits');

const data = new SlashCommandBuilder()
  .setName('apikey')
  .setDescription('Genera una API key per gestire regole personalizzate via API (piano Enterprise)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction) {
  const settings = await getGuildSettings(interaction.guild.id);
  const plan = getPlan(settings.plan);
  if (!plan.apiAccess) {
    return interaction.reply({ content: `⚠️ L'accesso API richiede almeno il piano ${getPlan(primoPianoCon('apiAccess')).label}. Vedi \`/piano-info\` per i dettagli.`, ephemeral: true });
  }
  const key = 'vg_' + crypto.randomBytes(24).toString('hex');
  await updateGuildSettings(interaction.guild.id, { api_key: key });
  return interaction.reply({
    content: `🔑 Nuova API key generata (mostrata una sola volta, conservala):\n\`\`\`${key}\`\`\`\nUsala nell'header \`X-API-Key\` verso il pannello admin per gestire regole personalizzate e whitelist.`,
    ephemeral: true,
  });
}

module.exports = { data, execute };
