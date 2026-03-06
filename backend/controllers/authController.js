const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendResetEmail } = require('../services/emailService');

const makeToken = (userId, email) =>
    jwt.sign({ userId, email }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ── REGISTER ──────────────────────────────────────────────────────────────
exports.register = async(req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password)
        return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' });

    try {
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1', [email.toLowerCase()]
        );
        if (existing.rows[0])
            return res.status(400).json({ error: 'Email already registered' });

        const hash = await bcrypt.hash(password, 12);
        const result = await pool.query(
            'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING *', [email.toLowerCase(), username.trim(), hash]
        );
        const user = result.rows[0];
        const token = makeToken(user.id, user.email);
        res.status(201).json({
            token,
            user: { id: user.id, email: user.email, username: user.username, is_premium: user.is_premium },
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
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
        if (!result.rows[0]) {
            return res.json({ message: 'If that email exists, a reset link has been sent' });
        }
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