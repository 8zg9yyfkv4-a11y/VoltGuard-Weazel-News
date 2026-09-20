// index.js
// Entry point del bot Voltguard.
 
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
 
const antiRaid = require('./modules/antiRaid');
const antiSpam = require('./modules/antiSpam');
const automod = require('./modules/automod');
const verification = require('./modules/verification');
const { scheduleAutoBackups } = require('./modules/backup');
const { getGuildSettings } = require('./database');
 
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.GuildMember, Partials.Channel],
});
 
// Carica tutti i comandi in una Collection: name -> { data, execute }
client.commands = new Collection();
const commandsDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'))) {
  const mod = require(path.join(commandsDir, file));
  if (mod.commands) {
    mod.commands.forEach(c => client.commands.set(c.data.name, c));
  } else if (mod.data) {
    client.commands.set(mod.data.name, mod);
  }
}
 
client.once('ready', () => {
  console.log(`✅ Voltguard online come ${client.user.tag} — al servizio di ${client.guilds.cache.size} server.`);
  client.user.setActivity('il tuo server | /voltguard-setup status');
 
  // Copre il caso in cui il bot sia stato invitato mentre era offline:
  // in quel caso non scatta guildCreate, quindi verifichiamo qui ogni guild già presente
  client.guilds.cache.forEach(guild => {
    getGuildSettings(guild.id);
  });
 
  scheduleAutoBackups(client);
});
 
// Assicura che ogni server in cui il bot è presente abbia una riga di config
client.on('guildCreate', guild => {
  getGuildSettings(guild.id);
  console.log(`➕ Voltguard aggiunto al server: ${guild.name} (${guild.id})`);
});
 
// ============ ANTI-RAID ============
client.on('guildMemberAdd', async member => {
  try {
    await antiRaid.handleGuildMemberAdd(member);
  } catch (err) {
    console.error('[guildMemberAdd] errore:', err);
  }
});
 
// ============ ANTI-SPAM + AUTO-MODERAZIONE ============
client.on('messageCreate', async message => {
  try {
    if (!message.guild || message.author.bot) return;
    const handledBySpam = await antiSpam.handleMessage(message);
    if (handledBySpam) return; // se già gestito dall'anti-spam, non serve automod
    await automod.handleMessage(message);
  } catch (err) {
    console.error('[messageCreate] errore:', err);
  }
});
 
// ============ SLASH COMMAND + BOTTONI ============
client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }
 
    if (interaction.isButton() && interaction.customId === verification.VERIFY_BUTTON_ID) {
      await verification.handleVerifyButton(interaction);
      return;
    }
  } catch (err) {
    console.error('[interactionCreate] errore:', err);
    const payload = { content: '❌ Si è verificato un errore durante l\'esecuzione del comando.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});
 
client.login(process.env.DISCORD_TOKEN);
 