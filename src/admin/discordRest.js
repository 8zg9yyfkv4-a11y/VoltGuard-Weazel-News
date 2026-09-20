// discordRest.js
// Chiamate dirette alla REST API di Discord usando il token del bot.
// Il pannello admin non mantiene una connessione gateway (ci pensa il processo del bot),
// ma può comunque leggere/scrivere ruoli e canali via REST per backup e ripristino.

const fetch = require('node-fetch');
const API = 'https://discord.com/api/v10';

function botHeaders() {
  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function getGuild(guildId) {
  const res = await fetch(`${API}/guilds/${guildId}`, { headers: botHeaders() });
  if (!res.ok) throw new Error(`Guild non trovata (${res.status})`);
  return res.json();
}

async function getRoles(guildId) {
  const res = await fetch(`${API}/guilds/${guildId}/roles`, { headers: botHeaders() });
  if (!res.ok) throw new Error(`Impossibile leggere i ruoli (${res.status})`);
  return res.json();
}

async function getChannels(guildId) {
  const res = await fetch(`${API}/guilds/${guildId}/channels`, { headers: botHeaders() });
  if (!res.ok) throw new Error(`Impossibile leggere i canali (${res.status})`);
  return res.json();
}

async function createRole(guildId, role) {
  const res = await fetch(`${API}/guilds/${guildId}/roles`, {
    method: 'POST',
    headers: botHeaders(),
    body: JSON.stringify({
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      mentionable: role.mentionable,
      permissions: role.permissions,
    }),
  });
  if (!res.ok) throw new Error(`Impossibile creare il ruolo ${role.name} (${res.status})`);
  return res.json();
}

async function createChannel(guildId, channel) {
  const res = await fetch(`${API}/guilds/${guildId}/channels`, {
    method: 'POST',
    headers: botHeaders(),
    body: JSON.stringify({ name: channel.name, type: channel.type, topic: channel.topic || undefined }),
  });
  if (!res.ok) throw new Error(`Impossibile creare il canale ${channel.name} (${res.status})`);
  return res.json();
}

module.exports = { getGuild, getRoles, getChannels, createRole, createChannel };
