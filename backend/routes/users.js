const router         = require('express').Router();
const pool           = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { uploadAvatar } = require('../config/cloudinary');

// ── Get current user profile ──────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, avatar_url, is_premium, created_at FROM users WHERE id=$1',
      [req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── Get listening history ─────────────────────────────────────────────────
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, a.name AS artist_name, lh.listened_at
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.id
       LEFT JOIN artists a ON s.artist_id = a.id
       WHERE lh.user_id = $1
       ORDER BY lh.listened_at DESC
       LIMIT 30`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ── Update profile ────────────────────────────────────────────────────────
router.patch('/me', authMiddleware, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  try {
    const result = await pool.query(
      `UPDATE users SET username=$1 WHERE id=$2
       RETURNING id, email, username, avatar_url, is_premium`,
      [username.trim(), req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username already taken' });
    res.status(500).json({ error: 'Update failed' });
  }
});

// ── Upload avatar ─────────────────────────────────────────────────────────
router.post('/avatar', authMiddleware, uploadAvatar.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  try {
    await pool.query(
      'UPDATE users SET avatar_url=$1 WHERE id=$2',
      [req.file.path, req.userId]
    );
    res.json({ avatar_url: req.file.path });
  } catch (err) {
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

module.exports = router;
