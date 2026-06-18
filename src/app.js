require('dotenv').config();
const express = require('express');
const session = require('express-session');
const morgan = require('morgan');
const path = require('path');

const webhookRouter = require('./routes/webhook');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('combined'));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'changeme-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }, // 8 hours
}));

// Auth endpoints (no auth required)
app.use(express.json());

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const validUser = process.env.ADMIN_USERNAME || 'admin';
  const validPass = process.env.ADMIN_PASSWORD || 'admin';
  if (username === validUser && password === validPass) {
    req.session.authenticated = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Auth middleware — protects everything below
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  // AJAX / API calls
  if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.redirect('/login.html');
}

// Webhook route — LINE signature verified separately, no session needed
const { multiChannelMiddleware } = require('./middleware/multiChannel');
app.use('/webhook', express.raw({ type: 'application/json' }), multiChannelMiddleware, webhookRouter);

// login.html is served without auth
app.use('/login.html', express.static(path.join(__dirname, '../web/public/login.html')));

// Everything else requires login
app.use(requireAuth);
app.use('/api', apiRouter);
app.use(express.static(path.join(__dirname, '../web/public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
