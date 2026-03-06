const jwt = require('jsonwebtoken');

const ADMIN_EMAIL = 'bramuelgodwill7@gmail.com';

// ── Regular auth ──────────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// ── Admin only ────────────────────────────────────────────────────────────
authMiddleware.adminOnly = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        if (decoded.email !== ADMIN_EMAIL) {
            return res.status(403).json({ error: 'Only the founder can do this.' });
        }
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = authMiddleware;