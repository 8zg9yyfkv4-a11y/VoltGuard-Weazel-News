// auth.js
// Login OAuth2 con Discord per il pannello admin.
// Un utente può gestire un server solo se: ha permesso "Manage Guild" su quel server su Discord
// E Voltguard è presente in quel server.

const fetch = require('node-fetch');

const OAUTH_SCOPES = ['identify', 'guilds'];

function getAuthorizeUrl() {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: `${process.env.ADMIN_BASE_URL}/auth/callback`,
    response_type: 'code',
    scope: OAUTH_SCOPES.join(' '),
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${process.env.ADMIN_BASE_URL}/auth/callback`,
  });

  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Scambio token fallito: ${res.status}`);
  return res.json(); // { access_token, refresh_token, ... }
}

async function fetchUser(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Impossibile ottenere l'utente: ${res.status}`);
  return res.json();
}

async function fetchUserGuilds(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Impossibile ottenere i server: ${res.status}`);
  return res.json(); // array di guild con campo "permissions" (bitfield stringa)
}

const MANAGE_GUILD = 0x20n; // bit per il permesso "Manage Guild"

function canManageGuild(guild) {
  try {
    const perms = BigInt(guild.permissions);
    return guild.owner === true || (perms & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login.html');
  next();
}

module.exports = { getAuthorizeUrl, exchangeCode, fetchUser, fetchUserGuilds, canManageGuild, requireAuth };
