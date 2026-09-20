async function loadMe() {
  const res = await fetch('/api/me');
  if (!res.ok) { location.href = '/login.html'; return; }
  const user = await res.json();
  document.getElementById('username').textContent = user.username;
}

function initials(name) {
  return name.slice(0, 2).toUpperCase();
}

async function loadGuilds() {
  const res = await fetch('/api/guilds');
  const guilds = await res.json();
  const grid = document.getElementById('guildGrid');

  if (!guilds.length) {
    grid.innerHTML = '<p class="muted">Non gestisci nessun server su Discord (serve il permesso "Gestisci server").</p>';
    return;
  }

  grid.innerHTML = guilds.map(g => `
    <a class="guild-card" href="${g.botPresent ? `guild.html?id=${g.id}` : '#'}"
       ${!g.botPresent ? 'onclick="return inviteFirst(event)"' : ''}>
      ${g.icon ? `<img src="${g.icon}" alt="">` : `<span class="fallback-icon">${initials(g.name)}</span>`}
      <div>
        <div style="font-weight:600">${g.name}</div>
        <span class="badge ${g.botPresent ? 'on' : 'off'}">${g.botPresent ? 'Voltguard attivo' : 'Bot non presente'}</span>
      </div>
    </a>
  `).join('');
}

function inviteFirst(e) {
  e.preventDefault();
  alert('Voltguard non è ancora in questo server. Aggiungilo prima dal sito, poi torna qui.');
  return false;
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/auth/logout', { method: 'POST' });
  location.href = '/login.html';
});

loadMe();
loadGuilds();
