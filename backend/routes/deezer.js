const router = require('express').Router();
const https = require('https');
const pool = require('../config/db');

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

// ── Search songs ──────────────────────────────────────────────────────────
router.get('/search', async(req, res) => {
    const { q, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    try {
        const data = await deezerGet(`/search?q=${encodeURIComponent(q)}&limit=${limit}&output=json`);
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
        console.error('Deezer search error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

// ── Trending / chart ──────────────────────────────────────────────────────
router.get('/trending', async(req, res) => {
    const { limit = 20 } = req.query;
    try {
        const data = await deezerGet(`/chart/0/tracks?limit=${limit}`);
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

// ── Track Deezer song plays ───────────────────────────────────────────────
router.post('/play', async(req, res) => {
    const { deezer_id, title, artist_name, cover_url, audio_url, album } = req.body;
    if (!deezer_id) return res.status(400).json({ error: 'deezer_id required' });
    try {
        await pool.query(
            `INSERT INTO deezer_plays (deezer_id, title, artist_name, cover_url, audio_url, album, play_count)
       VALUES ($1, $2, $3, $4, $5, $6, 1)
       ON CONFLICT (deezer_id)
       DO UPDATE SET
         play_count  = deezer_plays.play_count + 1,
         title       = EXCLUDED.title,
         artist_name = EXCLUDED.artist_name,
         cover_url   = EXCLUDED.cover_url`, [deezer_id, title, artist_name, cover_url, audio_url, album]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error('Deezer play track error:', err);
        res.status(500).json({ error: 'Failed to track play' });
    }
});

// ── Top played Deezer songs (fresh URLs from Deezer API) ─────────────────
router.get('/top-plays', async(req, res) => {
    try {
        const result = await pool.query(
            `SELECT deezer_id, title, artist_name, cover_url, play_count
       FROM deezer_plays
       ORDER BY play_count DESC
       LIMIT 20`
        );
        if (result.rows.length === 0) return res.json([]);

        const songs = await Promise.all(
            result.rows.map(async(row) => {
                try {
                    const track = await deezerGet(`/track/${row.deezer_id}`);
                    return {
                        id: 'dz_' + row.deezer_id,
                        deezer_id: row.deezer_id,
                        title: row.title,
                        artist_name: row.artist_name,
                        cover_url: track.album?.cover_medium || row.cover_url,
                        audio_url: track.preview,
                        play_count: row.play_count,
                        source: 'deezer',
                    };
                } catch {
                    return null;
                }
            })
        );

        res.json(songs.filter(Boolean));
    } catch (err) {
        console.error('Deezer top plays error:', err);
        res.status(500).json({ error: 'Failed to fetch top plays' });
    }
});

module.exports = router;