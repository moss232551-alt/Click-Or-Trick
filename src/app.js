const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const challengeRoutes = require('./routes/challengeRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const levelRoutes = require('./routes/levelRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { healthCheck } = require('./controllers/challengeController');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', healthCheck);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/challenges', challengeRoutes);

const maybeServeFrontend = () => {
  if (process.env.SERVE_FRONTEND === 'false') return;
  const distPath = process.env.FRONTEND_DIST_PATH || path.join(__dirname, '..', 'public');
  if (!fs.existsSync(distPath)) return;
  app.use(express.static(distPath));
  app.get(/^\/(?!api\/).*$/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
};

maybeServeFrontend();

app.use(notFound);
app.use(errorHandler);

module.exports = app;
