const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const songRoutes     = require('./routes/songs');
const playlistRoutes = require('./routes/playlists');
const payRoutes      = require('./routes/payments');
const userRoutes     = require('./routes/users');

app.use('/api/auth',      authRoutes);
app.use('/api/songs',     songRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/pay',       payRoutes);
app.use('/api/users',     userRoutes);

// ── Health check ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: '🎵 VibeOrbit API is running',
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error handler ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 VibeOrbit backend running on port ${PORT}`);
});
