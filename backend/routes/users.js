const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const pool = require('../config/db');
const multer = require('multer');
const { cloudinary } = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const avatarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        resource_type: 'image',
        folder: 'vibeorbit/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 300, height: 300, crop: 'fill' }],
    },
});
const uploadAvatar = multer({ storage: avatarStorage }).single('avatar');

// ── GET profile ───────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async(req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, username, avatar_url, is_premium, created_at FROM users WHERE id=$1', [req.userId]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// ── UPDATE profile ────────────────────────────────────────────────────────
router.patch('/me', authMiddleware, async(req, res) => {
    const { username } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET username=$1 WHERE id=$2 RETURNING id, email, username, avatar_url, is_premium', [username, req.userId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ── UPLOAD avatar ─────────────────────────────────────────────────────────
router.post('/avatar', authMiddleware, (req, res) => {
    uploadAvatar(req, res, async(err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
        try {
            const avatar_url = req.file.path;
            await pool.query('UPDATE users SET avatar_url=$1 WHERE id=$2', [avatar_url, req.userId]);
            res.json({ avatar_url });
        } catch (err) {
            res.status(500).json({ error: 'Failed to save avatar' });
        }
    });
});

// ── LIKE a song ───────────────────────────────────────────────────────────
router.post('/likes/:songId', authMiddleware, async(req, res) => {
    try {
        await pool.query(
            'INSERT INTO liked_songs (user_id, song_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.userId, req.params.songId]
        );
        res.json({ liked: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to like song' });
    }
});

// ── UNLIKE a song ─────────────────────────────────────────────────────────
router.delete('/likes/:songId', authMiddleware, async(req, res) => {
    try {
        await pool.query(
            'DELETE FROM liked_songs WHERE user_id=$1 AND song_id=$2', [req.userId, req.params.songId]
        );
        res.json({ liked: false });
    } catch (err) {
        res.status(500).json({ error: 'Failed to unlike song' });
    }
});

// ── GET liked songs ───────────────────────────────────────────────────────
router.get('/likes', authMiddleware, async(req, res) => {
    try {
        const result = await pool.query(
            `SELECT s.*, a.name AS artist_name, a.image_url AS artist_image
       FROM liked_songs ls
       JOIN songs s ON ls.song_id = s.id
       LEFT JOIN artists a ON s.artist_id = a.id
       WHERE ls.user_id = $1
       ORDER BY ls.created_at DESC`, [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch liked songs' });
    }
});

// ── GET listening history (most recently played first, deduped by song) ───
router.get('/history', authMiddleware, async(req, res) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT ON (s.id) s.*, a.name AS artist_name, a.image_url AS artist_image,
              MAX(lh.listened_at) AS last_played
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.id
       LEFT JOIN artists a ON s.artist_id = a.id
       WHERE lh.user_id = $1
       GROUP BY s.id, a.name, a.image_url
       ORDER BY last_played DESC
       LIMIT 20`, [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// ── SAVE onboarding preferences ───────────────────────────────────────────
router.post('/preferences', authMiddleware, async(req, res) => {
    const { genres, artist_names } = req.body;
    try {
        await pool.query(
            `INSERT INTO user_preferences (user_id, genres, artist_names, completed)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (user_id)
       DO UPDATE SET genres = $2, artist_names = $3, completed = true`, [req.userId, genres || [], artist_names || []]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error('Preferences error:', err);
        res.status(500).json({ error: 'Failed to save preferences' });
    }
});

// ── GET onboarding status ─────────────────────────────────────────────────
router.get('/preferences', authMiddleware, async(req, res) => {
    try {
        const result = await pool.query(
            'SELECT completed FROM user_preferences WHERE user_id = $1', [req.userId]
        );
        res.json({ completed: result.rows[0] ? .completed || false });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

module.exports = router;