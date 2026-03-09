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

// ── Optional auth (doesn't block if no token) ─────────────────────────────
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

// ── Public routes ─────────────────────────────────────────────────────────
router.get('/', optionalAuth, async(req, res) => {
    const { search } = req.query;
    try {
        let result;
        if (search && search.trim()) {
            result = await pool.query(
                `SELECT * FROM songs
         WHERE title ILIKE $1 OR artist_name ILIKE $1
         ORDER BY play_count DESC, created_at DESC`, [`%${search.trim()}%`]
            );
        } else {
            result = await pool.query(
                'SELECT * FROM songs ORDER BY created_at DESC'
            );
        }
        res.json({ songs: result.rows });
    } catch (err) {
        console.error('GET /songs error:', err);
        res.status(500).json({ error: 'Failed to fetch songs' });
    }
});

router.get('/trending', songs.getTrending);
router.get('/search', songs.searchSongs);

// ── Record a play ─────────────────────────────────────────────────────────
router.post('/:id/play', optionalAuth, async(req, res) => {
    try {
        await pool.query(
            'UPDATE songs SET play_count = play_count + 1 WHERE id = $1', [req.params.id]
        );
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

// ── Auth required ─────────────────────────────────────────────────────────
router.get('/recommendations', authMiddleware, songs.getRecommendations);
router.get('/:id', optionalAuth, songs.getSong);

// ── Admin only ────────────────────────────────────────────────────────────
router.post('/upload', authMiddleware.adminOnly, handleUpload, songs.uploadSong);
router.delete('/:id', authMiddleware.adminOnly, songs.deleteSong);

module.exports = router;