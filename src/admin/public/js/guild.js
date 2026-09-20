const guildId = new URLSearchParams(location.search).get('id');
let currentSettings = null;
let planInfo = null; // { current, order, plans, features } da /api/guilds/:id/plan

async function loadMe() {
  const res = await fetch('/api/me');
  if (!res.ok) { location.href = '/login.html'; return; }
  const user = await res.json();
  document.getElementById('username').textContent = user.username;
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/auth/logout', { method: 'POST' });
  location.href = '/login.html';
});

// --- tabs ---
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
  });
});

function fillForm(s) {
  currentSettings = s;
  document.getElementById('antiraid_enabled').checked = !!s.antiraid_enabled;
  document.getElementById('antiraid_join_threshold').value = s.antiraid_join_threshold;
  document.getElementById('antiraid_join_window_sec').value = s.antiraid_join_window_sec;
  document.getElementById('antiraid_min_account_age_hours').value = s.antiraid_min_account_age_hours;
  document.getElementById('antiraid_action').value = s.antiraid_action;

  document.getElementById('antispam_enabled').checked = !!s.antispam_enabled;
  document.getElementById('antispam_msg_threshold').value = s.antispam_msg_threshold;
  document.getElementById('antispam_window_sec').value = s.antispam_window_sec;
  document.getElementById('antispam_action').value = s.antispam_action;

  document.getElementById('automod_enabled').checked = !!s.automod_enabled;
  document.getElementById('automod_block_invites').checked = !!s.automod_block_invites;
  document.getElementById('automod_use_ai').checked = !!s.automod_use_ai;
  renderWords(s.automod_blocked_words);

  document.getElementById('verification_enabled').checked = !!s.verification_enabled;
  document.getElementById('backup_enabled').checked = !!s.backup_enabled;
}

function renderWords(words) {
  const el = document.getElementById('wordsList');
  el.innerHTML = words.length
    ? words.map(w => `<span class="word-chip">${w} <button onclick="removeWord('${w}')">&times;</button></span>`).join('')
    : '<span class="muted">Nessuna parola bloccata</span>';
}

function addWord() {
  const input = document.getElementById('newWord');
  const word = input.value.trim().toLowerCase();
  if (!word) return;
  const max = planInfo ? planInfo.plans[planInfo.current].maxBlockedWords : Infinity;
  if (!currentSettings.automod_blocked_words.includes(word) && currentSettings.automod_blocked_words.length >= max) {
    alert(`⚠️ Hai raggiunto il limite di ${max} parole bloccate del tuo piano. Guarda la scheda "Piano" per i dettagli.`);
    return;
  }
  if (!currentSettings.automod_blocked_words.includes(word)) {
    currentSettings.automod_blocked_words.push(word);
    renderWords(currentSettings.automod_blocked_words);
  }
  input.value = '';
}

function removeWord(word) {
  currentSettings.automod_blocked_words = currentSettings.automod_blocked_words.filter(w => w !== word);
  renderWords(currentSettings.automod_blocked_words);
}

// --- Piano: blocchi coerenti sulle funzioni non incluse + tabella comparativa ---
function applyPlanLocks() {
  if (!planInfo) return;
  const plan = planInfo.plans[planInfo.current];

  const iaCheckbox = document.getElementById('automod_use_ai');
  const iaLock = document.getElementById('ia-lock');
  iaCheckbox.disabled = !plan.automodAI;
  iaLock.style.display = plan.automodAI ? 'none' : 'inline';
  if (!plan.automodAI) iaCheckbox.checked = false;

  const backupCheckbox = document.getElementById('backup_enabled');
  const backupLock = document.getElementById('backup-lock');
  backupCheckbox.disabled = !plan.autoBackupDaily;
  backupLock.style.display = plan.autoBackupDaily ? 'none' : 'inline';
  if (!plan.autoBackupDaily) backupCheckbox.checked = false;
}

function renderPlanTable() {
  if (!planInfo) return;
  const { order, plans, features, current } = planInfo;

  document.getElementById('planCurrent').innerHTML =
    `<h3>Piano attuale: <span class="badge on">${plans[current].label}</span></h3>
     <p class="muted">Confronto delle funzioni incluse in ciascun piano. Per cambiare piano contatta chi gestisce il servizio.</p>`;

  document.getElementById('planTableHead').innerHTML =
    `<th>Funzione</th>` + order.map(p => `<th>${plans[p].label}${p === current ? ' (attuale)' : ''}</th>`).join('');

  document.getElementById('planTableBody').innerHTML = features.map(f => {
    const celle = order.map(p => {
      const v = plans[p][f.key];
      const testo = f.kind === 'bool' ? (v ? '✅' : '❌') : (v === Infinity ? 'Illimitati' : v);
      return `<td>${testo}</td>`;
    }).join('');
    return `<tr><td>${f.label}</td>${celle}</tr>`;
  }).join('');
}

async function loadPlan() {
  const res = await fetch(`/api/guilds/${guildId}/plan`);
  if (!res.ok) return;
  planInfo = await res.json();
  applyPlanLocks();
  renderPlanTable();
}

async function saveSettings() {
  const patch = {
    antiraid_enabled: document.getElementById('antiraid_enabled').checked,
    antiraid_join_threshold: parseInt(document.getElementById('antiraid_join_threshold').value),
    antiraid_join_window_sec: parseInt(document.getElementById('antiraid_join_window_sec').value),
    antiraid_min_account_age_hours: parseInt(document.getElementById('antiraid_min_account_age_hours').value),
    antiraid_action: document.getElementById('antiraid_action').value,

    antispam_enabled: document.getElementById('antispam_enabled').checked,
    antispam_msg_threshold: parseInt(document.getElementById('antispam_msg_threshold').value),
    antispam_window_sec: parseInt(document.getElementById('antispam_window_sec').value),
    antispam_action: document.getElementById('antispam_action').value,

    automod_enabled: document.getElementById('automod_enabled').checked,
    automod_block_invites: document.getElementById('automod_block_invites').checked,
    automod_use_ai: document.getElementById('automod_use_ai').checked,
    automod_blocked_words: currentSettings.automod_blocked_words,

    verification_enabled: document.getElementById('verification_enabled').checked,
    backup_enabled: document.getElementById('backup_enabled').checked,
  };

  const res = await fetch(`/api/guilds/${guildId}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (res.ok) {
    fillForm(await res.json());
    applyPlanLocks();
    alert('✅ Impostazioni salvate.');
  } else {
    const data = await res.json().catch(() => ({}));
    alert(`❌ ${data.error || 'Errore nel salvataggio.'}`);
  }
}

async function loadStats() {
  const res = await fetch(`/api/guilds/${guildId}/stats`);
  const stats = await res.json();
  const labels = { antiraid: 'Anti-Raid', antispam: 'Anti-Spam', automod: 'Automod', verification: 'Verifiche', manual: 'Manuali', backup: 'Backup' };
  const tiles = Object.keys(labels).map(k => `
    <div class="stat-tile"><div class="n">${stats[k] || 0}</div><div class="l">${labels[k]}</div></div>
  `).join('');
  document.getElementById('statTiles').innerHTML = tiles;
}

async function loadLogs() {
  const res = await fetch(`/api/guilds/${guildId}/logs?limit=100`);
  const logs = await res.json();
  document.getElementById('logsBody').innerHTML = logs.map(l => `
    <tr>
      <td>${new Date(l.created_at * 1000).toLocaleString('it-IT')}</td>
      <td><span class="tag-pill">${l.type}</span></td>
      <td>${l.user_id ? `<@${l.user_id}>`.replace('<@', '').replace('>', '') : '—'}</td>
      <td class="muted">${l.detail || ''}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="muted center">Nessun log ancora</td></tr>';
}

async function loadBackups() {
  const res = await fetch(`/api/guilds/${guildId}/backups`);
  const backups = await res.json();
  document.querySelector('#backupsTable tbody').innerHTML = backups.map(b => `
    <tr>
      <td>#${b.id}</td>
      <td>${new Date(b.created_at * 1000).toLocaleString('it-IT')}</td>
      <td><button class="btn btn-sm" onclick="restoreBackup(${b.id})">Ripristina</button></td>
    </tr>
  `).join('') || '<tr><td colspan="3" class="muted center">Nessun backup ancora</td></tr>';
}

async function createBackup() {
  const res = await fetch(`/api/guilds/${guildId}/backups`, { method: 'POST' });
  const data = await res.json();
  if (res.ok) {
    alert(`✅ Backup creato: ${data.roles} ruoli, ${data.channels} canali.`);
    loadBackups();
  } else {
    alert(`❌ ${data.error}`);
  }
}

async function restoreBackup(id) {
  if (!confirm('Ripristinare i ruoli e canali mancanti da questo backup?')) return;
  const res = await fetch(`/api/guilds/${guildId}/backups/${id}/restore`, { method: 'POST' });
  const data = await res.json();
  if (res.ok) {
    alert(`✅ Ripristinati +${data.restoredRoles} ruoli, +${data.restoredChannels} canali.`);
  } else {
    alert(`❌ ${data.error}`);
  }
}

async function init() {
  await loadMe();
  const res = await fetch(`/api/guilds/${guildId}/settings`);
  if (!res.ok) { document.getElementById('guildTitle').textContent = 'Accesso negato a questo server'; return; }
  const settings = await res.json();
  document.getElementById('guildTitle').textContent = `Gestione server · piano ${settings.plan}`;
  fillForm(settings);
  await loadPlan();
  if (planInfo) {
    document.getElementById('guildTitle').textContent = `Gestione server · piano ${planInfo.plans[planInfo.current].label}`;
  }
  loadStats();
  loadLogs();
  loadBackups();
}

init();