const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const { cloudinary } = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const songs = require('../controllers/songController');

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

// Public routes
router.get('/', songs.getAllSongs);
router.get('/trending', songs.getTrending);
router.get('/search', songs.searchSongs);

// Auth required
router.get('/recommendations', authMiddleware, songs.getRecommendations);
router.get('/:id', authMiddleware, songs.getSong);

// Admin only
router.post('/upload', authMiddleware.adminOnly, handleUpload, songs.uploadSong);
router.delete('/:id', authMiddleware.adminOnly, songs.deleteSong);

module.exports = router;