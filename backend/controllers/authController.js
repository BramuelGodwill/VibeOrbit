const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendResetEmail, sendVerificationEmail } = require('../services/emailService');

const makeToken = (userId, email) =>
    jwt.sign({ userId, email }, process.env.JWT_SECRET, { expiresIn: '7d' });

const generateOTP = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

// ── REGISTER ──────────────────────────────────────────────────────────────
exports.register = async(req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password)
        return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' });

    try {
        const existing = await pool.query(
            'SELECT id, is_verified FROM users WHERE email = $1', [email.toLowerCase()]
        );

        if (existing.rows[0]) {
            // If account exists but not verified, resend OTP
            if (!existing.rows[0].is_verified) {
                const otp = generateOTP();
                const expires = new Date(Date.now() + 10 * 60 * 1000);
                await pool.query(
                    'UPDATE users SET verify_otp=$1, verify_otp_expiry=$2 WHERE email=$3', [otp, expires, email.toLowerCase()]
                );
                await sendVerificationEmail(email, otp);
                return res.status(200).json({
                    requiresVerification: true,
                    email: email.toLowerCase(),
                    message: 'Account exists but not verified. New code sent to your email.',
                });
            }
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hash = await bcrypt.hash(password, 12);
        const otp = generateOTP();
        const expires = new Date(Date.now() + 10 * 60 * 1000);

        const result = await pool.query(
            `INSERT INTO users (email, username, password_hash, is_verified, verify_otp, verify_otp_expiry)
       VALUES ($1, $2, $3, false, $4, $5) RETURNING *`, [email.toLowerCase(), username.trim(), hash, otp, expires]
        );

        await sendVerificationEmail(email, otp);

        res.status(201).json({
            requiresVerification: true,
            email: email.toLowerCase(),
            message: 'Account created! Check your email for a 6-digit verification code.',
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
};

// ── VERIFY OTP ────────────────────────────────────────────────────────────
exports.verifyOTP = async(req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp)
        return res.status(400).json({ error: 'Email and code are required' });

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email=$1 AND verify_otp=$2 AND verify_otp_expiry > NOW()', [email.toLowerCase(), otp]
        );

        if (!result.rows[0])
            return res.status(400).json({ error: 'Invalid or expired code. Try again.' });

        const user = result.rows[0];
        await pool.query(
            'UPDATE users SET is_verified=true, verify_otp=NULL, verify_otp_expiry=NULL WHERE id=$1', [user.id]
        );

        const token = makeToken(user.id, user.email);
        res.json({
            token,
            user: { id: user.id, email: user.email, username: user.username, is_premium: user.is_premium },
        });
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ error: 'Verification failed' });
    }
};

// ── RESEND OTP ────────────────────────────────────────────────────────────
exports.resendOTP = async(req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
        const result = await pool.query(
            'SELECT id FROM users WHERE email=$1 AND is_verified=false', [email.toLowerCase()]
        );
        if (!result.rows[0])
            return res.status(400).json({ error: 'Account not found or already verified' });

        const otp = generateOTP();
        const expires = new Date(Date.now() + 10 * 60 * 1000);
        await pool.query(
            'UPDATE users SET verify_otp=$1, verify_otp_expiry=$2 WHERE email=$3', [otp, expires, email.toLowerCase()]
        );
        await sendVerificationEmail(email, otp);
        res.json({ message: 'New code sent to your email.' });
    } catch (err) {
        console.error('Resend OTP error:', err);
        res.status(500).json({ error: 'Failed to resend code' });
    }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────
exports.login = async(req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password required' });

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1', [email.toLowerCase()]
        );
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid email or password' });

        // Block unverified users
        if (!user.is_verified) {
            const otp = generateOTP();
            const expires = new Date(Date.now() + 10 * 60 * 1000);
            await pool.query(
                'UPDATE users SET verify_otp=$1, verify_otp_expiry=$2 WHERE id=$3', [otp, expires, user.id]
            );
            await sendVerificationEmail(email, otp);
            return res.status(403).json({
                requiresVerification: true,
                email: email.toLowerCase(),
                error: 'Please verify your email first. A new code has been sent.',
            });
        }

        const token = makeToken(user.id, user.email);
        res.json({
            token,
            user: { id: user.id, email: user.email, username: user.username, is_premium: user.is_premium },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
};

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────
exports.forgotPassword = async(req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1', [email.toLowerCase()]
        );
        if (!result.rows[0])
            return res.json({ message: 'If that email exists, a reset link has been sent' });

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000);
        await pool.query(
            'UPDATE users SET reset_token=$1, reset_token_expiry=$2 WHERE email=$3', [token, expires, email.toLowerCase()]
        );
        const resetUrl = (process.env.FRONTEND_URL || 'http://localhost:3000') +
            '/reset-password?token=' + token;
        await sendResetEmail(email, resetUrl);
        res.json({ message: 'Reset link sent! Check your email inbox and spam folder.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Failed to send reset email' });
    }
};

// ── RESET PASSWORD ────────────────────────────────────────────────────────
exports.resetPassword = async(req, res) => {
    const { token, password } = req.body;
    if (!token || !password)
        return res.status(400).json({ error: 'Token and password required' });
    if (password.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' });

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE reset_token=$1 AND reset_token_expiry > NOW()', [token]
        );
        if (!result.rows[0])
            return res.status(400).json({ error: 'Invalid or expired reset token' });

        const hash = await bcrypt.hash(password, 12);
        await pool.query(
            'UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expiry=NULL WHERE reset_token=$2', [hash, token]
        );
        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};