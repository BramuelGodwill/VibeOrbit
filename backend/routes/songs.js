const router          = require('express').Router();
const authMiddleware  = require('../middleware/auth');
const { uploadAudio } = require('../config/cloudinary');
const songs           = require('../controllers/songController');

router.get('/',                songs.getAllSongs);
router.get('/trending',        songs.getTrending);
router.get('/search',          songs.searchSongs);
router.get('/recommendations', authMiddleware, songs.getRecommendations);
router.get('/:id',             authMiddleware, songs.getSong);
router.post('/upload',         authMiddleware, uploadAudio.single('audio'), songs.uploadSong);
router.delete('/:id',          authMiddleware, songs.deleteSong);

module.exports = router;
