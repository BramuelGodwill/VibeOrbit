const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const { cloudinary } = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const songs = require('../controllers/songController');
const pool = require('../config/db');

const audioStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        resource_type: 'video',
        folder: 'vibeorbit/songs',
        allowed_formats: ['mp3', 'wav', 'ogg', 'm4a', 'flac'],
    },
});

const handleUpload = (req, res, next) => {
    const audioUpload = multer({ storage: audioStorage }).single('audio');
    audioUpload(req, res, async(err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (req.body.cover_base64) {
            try {
                const result = await cloudinary.uploader.upload(req.body.cover_base64, {
                    folder: 'vibeorbit/covers',
                    transformation: [{ width: 500, height: 500, crop: 'fill' }],
                });
                req.coverUrl = result.secure_url;
            } catch (e) {
                console.error('Cover upload error:', e.message);
            }
        }
        next();
    });
};

// ── Optional auth middleware (doesn't block if no token) ──────────────────
const optionalAuth = (req, res, next) => {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        try {
            const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
            req.userId = decoded.userId;
            req.userEmail = decoded.email;
        } catch {}
    }
    next();
};

// Public
router.get('/', songs.getAllSongs);
router.get('/trending', songs.getTrending);
router.get('/search', songs.searchSongs);

// ── Record a play — called by frontend when song starts ───────────────────
router.post('/:id/play', optionalAuth, async(req, res) => {
    try {
        // Increment global play count
        await pool.query(
            'UPDATE songs SET play_count = play_count + 1 WHERE id = $1', [req.params.id]
        );
        // Record in listening history if user is logged in
        if (req.userId) {
            await pool.query(
                'INSERT INTO listening_history (user_id, song_id) VALUES ($1, $2)', [req.userId, req.params.id]
            ).catch(() => {});
        }
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to record play' });
    }
});

// Auth required
router.get('/recommendations', authMiddleware, songs.getRecommendations);
router.get('/:id', optionalAuth, songs.getSong);

// Admin only
router.post('/upload', authMiddleware.adminOnly, handleUpload, songs.uploadSong);
router.delete('/:id', authMiddleware.adminOnly, songs.deleteSong);

module.exports = router;