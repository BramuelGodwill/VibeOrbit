const router         = require('express').Router();
const authMiddleware = require('../middleware/auth');
const pl             = require('../controllers/playlistController');

router.use(authMiddleware); // All playlist routes require auth

router.post('/',                              pl.create);
router.get('/my',                             pl.getMyPlaylists);
router.get('/:id',                            pl.getOne);
router.post('/add-song',                      pl.addSong);
router.delete('/:playlistId/songs/:songId',   pl.removeSong);
router.delete('/:id',                         pl.deletePlaylist);

module.exports = router;
