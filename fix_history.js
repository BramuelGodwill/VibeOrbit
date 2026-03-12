const fs = require('fs');
const path = 'backend/routes/users.js';
let content = fs.readFileSync(path, 'utf8');

// Find the history route start
const start = content.indexOf("router.get('/history'");

// Find the NEXT router. after the history route to get the exact end
const afterStart = content.indexOf("router.", start + 10);

if (start === -1) { console.log('Not found!'); process.exit(1); }

const newRoute = `router.get('/history', authMiddleware, async(req, res) => {
    try {
        const result = await pool.query(
            \`SELECT s.*, a.name AS artist_name, a.image_url AS artist_image
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.id
       WHERE s.id IN (
         SELECT song_id FROM listening_history WHERE user_id = $1
       )
       ORDER BY (
         SELECT MAX(listened_at) FROM listening_history
         WHERE user_id = $1 AND song_id = s.id
       ) DESC
       LIMIT 20\`, [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// `;

const fixed = content.substring(0, start) + newRoute + content.substring(afterStart);
fs.writeFileSync(path, fixed);
console.log('Fixed! New history section:');
const i = fixed.indexOf("router.get('/history'");
console.log(fixed.substring(i, i + 500));
