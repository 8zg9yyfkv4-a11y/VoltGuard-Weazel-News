// automod.js
// Auto-moderazione: filtro parole bloccate, link di invito Discord non autorizzati,
// e (facoltativo, se OPENAI_API_KEY è impostata) controllo tossicità via OpenAI Moderation API.

const fetch = require('node-fetch');
const { getGuildSettings, addLog } = require('../database');
const { logToChannel } = require('../utils/logger');

const DISCORD_INVITE_REGEX = /(discord\.gg|discord(?:app)?\.com\/invite)\/[a-zA-Z0-9-]+/i;

async function checkAI(content) {
  if (!process.env.OPENAI_API_KEY) return { flagged: false };
  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ input: content }),
    });
    const json = await res.json();
    const result = json.results?.[0];
    if (result?.flagged) {
      const categories = Object.entries(result.categories)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(', ');
      return { flagged: true, categories };
    }
  } catch (err) {
    console.error('[automod] errore chiamata AI moderation:', err.message);
  }
  return { flagged: false };
}

async function handleMessage(message) {
  if (!message.guild || message.author.bot) return false;

  const settings = getGuildSettings(message.guild.id);
  if (!settings.automod_enabled) return false;

  // i ruoli protetti sono esenti dall'automod (es. staff/moderatori)
  const memberRoles = message.member?.roles.cache.map(r => r.id) || [];
  if (memberRoles.some(id => settings.protected_role_ids.includes(id))) return false;

  const content = message.content || '';
  let violation = null;

  const lower = content.toLowerCase();
  const hitWord = settings.automod_blocked_words.find(w => lower.includes(w.toLowerCase()));
  if (hitWord) {
    violation = `parola bloccata rilevata`;
  } else if (settings.automod_block_invites && DISCORD_INVITE_REGEX.test(content)) {
    violation = `link di invito Discord non autorizzato`;
  } else if (settings.automod_use_ai) {
    const ai = await checkAI(content);
    if (ai.flagged) violation = `contenuto segnalato dall'IA (${ai.categories})`;
  }

  if (!violation) return false;

  try {
    if (message.deletable) await message.delete();
  } catch (err) {
    console.error('[automod] impossibile eliminare il messaggio:', err.message);
  }

  addLog(message.guild.id, 'automod', message.author.id, null, violation);
  await logToChannel(message.guild, settings, {
    title: '🤖 Auto-Moderazione',
    color: 0x2f6bff,
    description: `**Utente:** <@${message.author.id}>\n**Motivo:** ${violation}\n**Canale:** <#${message.channel.id}>`,
  });

  return true;
}

module.exports = { handleMessage };
