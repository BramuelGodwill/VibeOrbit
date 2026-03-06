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
            await pool.query(
                'UPDATE users SET avatar_url=$1 WHERE id=$2', [avatar_url, req.userId]
            );
            res.json({ avatar_url });
        } catch (err) {
            res.status(500).json({ error: 'Failed to save avatar' });
        }
    });
});

// ── GET listening history ─────────────────────────────────────────────────
router.get('/history', authMiddleware, async(req, res) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT ON (s.id) s.*, a.name AS artist_name, lh.listened_at
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.id
       LEFT JOIN artists a ON s.artist_id = a.id
       WHERE lh.user_id = $1
       ORDER BY s.id, lh.listened_at DESC
       LIMIT 20`, [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

module.exports = router;