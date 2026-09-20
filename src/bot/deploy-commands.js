// deploy-commands.js
// Registra (o aggiorna) tutti gli slash command globalmente su Discord.
// Esegui con: npm run deploy-commands
// Nota: le modifiche ai comandi globali possono richiedere fino a 1h per propagarsi.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

function loadCommandData() {
  const commandsDir = path.join(__dirname, 'commands');
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
  const data = [];

  for (const file of files) {
    const mod = require(path.join(commandsDir, file));
    if (mod.commands) {
      mod.commands.forEach(c => data.push(c.data.toJSON()));
    } else if (mod.data) {
      data.push(mod.data.toJSON());
    }
  }
  return data;
}

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!token || !clientId) {
    console.error('Manca DISCORD_TOKEN o DISCORD_CLIENT_ID nel file .env');
    process.exit(1);
  }

  const commands = loadCommandData();
  const rest = new REST({ version: '10' }).setToken(token);

  console.log(`Registrazione di ${commands.length} slash command...`);
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log('✅ Comandi registrati con successo.');
}

main().catch(err => {
  console.error('Errore durante la registrazione dei comandi:', err);
  process.exit(1);
});
