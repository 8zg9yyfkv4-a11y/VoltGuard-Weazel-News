// server.js
// Pannello admin di Voltguard: login con Discord, gestione impostazioni per server,
// visualizzazione log, backup/ripristino, e API pubblica per il piano Enterprise.

require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const { getAuthorizeUrl, exchangeCode, fetchUser } = require('./auth');
const guildsRouter = require('./api/guilds');
const settingsRouter = require('./api/settings');
const logsRouter = require('./api/logsAndBackups');
const backupActionsRouter = require('./api/backupActions');
const publicApiRouter = require('./api/publicApi');
const planRouter = require('./api/plan');

const app = express();
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'voltguard-dev-secret-cambiami',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// ============ AUTH ============
app.get('/auth/login', (req, res) => res.redirect(getAuthorizeUrl()));

app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.redirect('/login.html?error=missing_code');

    const tokenData = await exchangeCode(code);
    const user = await fetchUser(tokenData.access_token);

    req.session.accessToken = tokenData.access_token;
    req.session.user = { id: user.id, username: user.username, avatar: user.avatar };

    res.redirect('/dashboard.html');
  } catch (err) {
    console.error('[auth/callback] errore:', err.message);
    res.redirect('/login.html?error=auth_failed');
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non autenticato' });
  res.json(req.session.user);
});

// ============ API AMMINISTRATIVE (richiedono login) ============
app.use('/api', guildsRouter);
app.use('/api', settingsRouter);
app.use('/api', logsRouter);
app.use('/api', backupActionsRouter);
app.use('/api', planRouter);

// ============ API PUBBLICA (piano Enterprise, richiede X-API-Key) ============
app.use('/api', publicApiRouter);

// ============ FRONTEND STATICO ============
app.use(express.static(path.join(__dirname, 'public')));

// Route principale (root)
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        res.redirect('/dashboard.html');
    } else {
        res.redirect('/login.html');
    }
});

// 404 - Pagina non trovata
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'login.html')); // o crea un 404.html
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(500).send('Errore interno del server');
});

const PORT = process.env.ADMIN_PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Pannello admin Voltguard online su ${process.env.ADMIN_BASE_URL || `https://voltguard-weazel-news.onrender.com/`}`);
});
