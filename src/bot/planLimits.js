// planLimits.js
// Definizione centralizzata di cosa include ciascun piano (free | pro | enterprise).
// Sia il bot (comandi, moduli) sia il pannello admin leggono da qui, così i limiti
// e i messaggi di upgrade sono sempre coerenti ovunque, invece di essere sparsi
// e ripetuti (e magari disallineati) in più file.

const PLANS = {
  free: {
    label: 'Free',
    automodAI: false,
    autoBackupDaily: false,
    maxBackups: 3,
    maxBlockedWords: 25,
    maxProtectedRoles: 3,
    apiAccess: false,
  },
  pro: {
    label: 'Pro',
    automodAI: true,
    autoBackupDaily: true,
    maxBackups: 15,
    maxBlockedWords: 150,
    maxProtectedRoles: 15,
    apiAccess: false,
  },
  enterprise: {
    label: 'Enterprise',
    automodAI: true,
    autoBackupDaily: true,
    maxBackups: 50,
    maxBlockedWords: Infinity,
    maxProtectedRoles: Infinity,
    apiAccess: true,
  },
};

const PLAN_ORDER = ['free', 'pro', 'enterprise'];

/** Restituisce sempre un piano valido: se il nome non esiste, ricade su "free". */
function getPlan(name) {
  return PLANS[name] || PLANS.free;
}

/** Righe usate per mostrare la tabella comparativa (comando /piano-info e pannello). */
const FEATURE_ROWS = [
  { key: 'automodAI', label: 'Controllo IA nell\'automod', kind: 'bool' },
  { key: 'autoBackupDaily', label: 'Backup automatico giornaliero', kind: 'bool' },
  { key: 'maxBackups', label: 'Backup conservati', kind: 'number' },
  { key: 'maxBlockedWords', label: 'Parole bloccabili in automod', kind: 'number' },
  { key: 'maxProtectedRoles', label: 'Ruoli protetti dall\'automod', kind: 'number' },
  { key: 'apiAccess', label: 'Accesso API pubblica', kind: 'bool' },
];

/** Nome del piano più economico che include una certa feature (per i messaggi "richiede almeno..."). */
function primoPianoCon(featureKey) {
  return PLAN_ORDER.find(name => PLANS[name][featureKey] === true || PLANS[name][featureKey] === Infinity);
}

function formatLimite(value) {
  return value === Infinity ? 'Illimitati' : String(value);
}

module.exports = { PLANS, PLAN_ORDER, getPlan, FEATURE_ROWS, primoPianoCon, formatLimite };
