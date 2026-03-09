const router = require('express').Router();
const https = require('https');

const deezerGet = (path) =>
    new Promise((resolve, reject) => {
        https.get('https://api.deezer.com' + path, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });

// ── Search songs ──────────────────────────────────────────────
router.get('/search', async(req, res) => {
    const { q, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    try {
        const data = await deezerGet(
            `/search?q=${encodeURIComponent(q)}&limit=${limit}&output=json`
        );
        const songs = (data.data || []).map(track => ({
            id: 'dz_' + track.id,
            deezer_id: track.id,
            title: track.title,
            artist_name: track.artist.name,
            cover_url: track.album.cover_medium,
            audio_url: track.preview, // 30-second preview MP3
            duration: track.duration,
            album: track.album.title,
            source: 'deezer',
        }));
        res.json(songs);
    } catch (err) {
        console.error('Deezer search error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

// ── Trending / chart ──────────────────────────────────────────
router.get('/trending', async(req, res) => {
    const { genre = 'all', limit = 20 } = req.query;
    try {
        const path = genre === 'all' ?
            `/chart/0/tracks?limit=${limit}` :
            `/chart/0/tracks?limit=${limit}`;
        const data = await deezerGet(path);
        const songs = (data.data || []).map(track => ({
            id: 'dz_' + track.id,
            deezer_id: track.id,
            title: track.title,
            artist_name: track.artist.name,
            cover_url: track.album.cover_medium,
            audio_url: track.preview,
            duration: track.duration,
            album: track.album.title,
            source: 'deezer',
        }));
        res.json(songs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch trending' });
    }
});

module.exports = router;