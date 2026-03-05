const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const { cloudinary } = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const songs = require('../controllers/songController');

// ── Audio storage ──────────────────────────────────────────────────────────
const audioStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        resource_type: 'video',
        folder: 'vibeorbit/songs',
        allowed_formats: ['mp3', 'wav', 'ogg', 'm4a', 'flac'],
    },
});

// ── Cover image storage ────────────────────────────────────────────────────
const coverStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        resource_type: 'image',
        folder: 'vibeorbit/covers',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'fill' }],
    },
});

// ── Multer for both fields ─────────────────────────────────────────────────
const uploadFields = multer({
    storage: multer.memoryStorage(), // temp, we upload each field separately
}).fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
]);

// ── Custom middleware to handle audio + optional cover ─────────────────────
const handleUpload = (req, res, next) => {
    const audioUpload = multer({ storage: audioStorage }).single('audio');
    audioUpload(req, res, async(err) => {
        if (err) return res.status(400).json({ error: err.message });

        // If cover image provided, upload it separately
        if (req.body.cover_base64) {
            try {
                const result = await cloudinary.uploader.upload(req.body.cover_base64, {
                    folder: 'vibeorbit/covers',
                    transformation: [{ width: 500, height: 500, crop: 'fill' }],
                });
                req.coverUrl = result.secure_url;
            } catch (e) {
                console.error('Cover upload error:', e);
            }
        }
        next();
    });
};

// ── Routes ─────────────────────────────────────────────────────────────────
router.get('/', songs.getAllSongs);
router.get('/trending', songs.getTrending);
router.get('/search', songs.searchSongs);
router.get('/recommendations', authMiddleware, songs.getRecommendations);
router.get('/:id', authMiddleware, songs.getSong);
router.post('/upload', authMiddleware, handleUpload, songs.uploadSong);
router.delete('/:id', authMiddleware, songs.deleteSong);

module.exports = router;