const jwt = require('jsonwebtoken');

// ── Regular auth ──────────────────────────────────────────────────────────
module.exports = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// ── Admin only ────────────────────────────────────────────────────────────
module.exports.adminOnly = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        const adminEmail = process.env.ADMIN_EMAIL || 'bramuelgodwill@gmail.com';
        if (decoded.email !== adminEmail) {
            return res.status(403).json({ error: 'Admin access only. Only the founder can upload songs.' });
        }
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};