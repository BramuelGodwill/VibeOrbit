const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { sendResetEmail } = require('../services/emailService');

// ── REGISTER ──────────────────────────────────────────────────────────────
exports.register = async(req, res) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const hash = await bcrypt.hash(password, 12);
        const result = await pool.query(
            `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, is_premium, created_at`, [email.toLowerCase().trim(), username.trim(), hash]
        );

        const user = result.rows[0];
        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ token, user });
    } catch (err) {
        if (err.code === '23505') {
            const field = err.detail.includes('email') ? 'Email' : 'Username';
            return res.status(400).json({ error: `${field} already taken` });
        }
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────
exports.login = async(req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]
        );

        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

        const { password_hash, reset_token, reset_token_expiry, ...safeUser } = user;
        res.json({ token, user: safeUser });
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
        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        const result = await pool.query(
            'UPDATE users SET reset_token=$1, reset_token_expiry=$2 WHERE email=$3 RETURNING id', [token, expiry, email.toLowerCase().trim()]
        );

        // Always return success to prevent email enumeration attacks
        if (result.rows[0]) {
            await sendResetEmail(email, token);
        }

        res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Failed to process request' });
    }
};

// ── RESET PASSWORD ────────────────────────────────────────────────────────
exports.resetPassword = async(req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE reset_token=$1 AND reset_token_expiry > NOW()', [token]
        );

        if (!result.rows[0]) {
            return res.status(400).json({ error: 'Reset link is invalid or has expired' });
        }

        const hash = await bcrypt.hash(newPassword, 12);
        await pool.query(
            'UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expiry=NULL WHERE id=$2', [hash, result.rows[0].id]
        );

        res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Password reset failed' });
    }
};