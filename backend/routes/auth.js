const router = require('express').Router();
const auth   = require('../controllers/authController');

router.post('/register',       auth.register);
router.post('/login',          auth.login);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password',  auth.resetPassword);

module.exports = router;
