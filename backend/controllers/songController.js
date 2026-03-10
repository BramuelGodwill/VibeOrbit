const pool = require('../config/db');

// ── UPLOAD SONG ───────────────────────────────────────────────────────────
exports.uploadSong = async(req, res) => {
    const { title, genre, duration, artistName } = req.body;
    const audio_url = req.file ? req.file.path : null;
    const cover_url = req.coverUrl || req.body.cover_url || null;

    if (!audio_url) return res.status(400).json({ error: 'No audio file uploaded' });
    if (!title) return res.status(400).json({ error: 'Song title is required' });

    try {
        let artistId = null;
        let artistImg = null;

        if (artistName && artistName.trim()) {
            const existing = await pool.query(
                'SELECT id, image_url FROM artists WHERE name = $1', [artistName.trim()]
            );
            if (existing.rows[0]) {
                artistId = existing.rows[0].id;
                artistImg = existing.rows[0].image_url;
            } else {
                const newArtist = await pool.query(
                    'INSERT INTO artists (name) VALUES ($1) RETURNING id', [artistName.trim()]
                );
                artistId = newArtist.rows[0].id;
            }
        }

        const finalCover = cover_url || artistImg || null;

        const result = await pool.query(
            `INSERT INTO songs (title, artist_id, audio_url, cover_url, genre, duration, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [title.trim(), artistId, audio_url, finalCover, genre || null, parseInt(duration) || 0, req.userId]
        );

        const song = result.rows[0];
        const cleanName = artistName ? artistName.trim() : null;
        res.status(201).json({...song, artist_name: cleanName });

    } catch (err) {
        console.error('Upload song error:', err);
        if (err.code === '23505')
            return res.status(400).json({ error: 'A song with this title already exists' });
        res.status(500).json({ error: 'Upload failed', details: err.message });
    }
};

// ── GET ALL SONGS (supports ?search= param) ───────────────────────────────
exports.getAllSongs = async(req, res) => {
    const { search } = req.query;
    try {
        let result;
        if (search && search.trim()) {
            result = await pool.query(
                `SELECT s.*, a.name AS artist_name, a.image_url AS artist_image
         FROM songs s
         LEFT JOIN artists a ON s.artist_id = a.id
         WHERE s.title ILIKE $1
            OR a.name  ILIKE $1
            OR s.genre ILIKE $1
         ORDER BY s.play_count DESC, s.created_at DESC`, [`%${search.trim()}%`]
            );
        } else {
            result = await pool.query(
                `SELECT s.*, a.name AS artist_name, a.image_url AS artist_image
         FROM songs s
         LEFT JOIN artists a ON s.artist_id = a.id
         ORDER BY s.created_at DESC`
            );
        }
        res.json(result.rows);
    } catch (err) {
        console.error('getAllSongs error:', err);
        res.status(500).json({ error: 'Failed to fetch songs' });
    }
};

// ── GET SINGLE SONG ───────────────────────────────────────────────────────
exports.getSong = async(req, res) => {
    try {
        const result = await pool.query(
            `SELECT s.*, a.name AS artist_name, a.image_url AS artist_image
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.id
       WHERE s.id = $1`, [req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Song not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch song' });
    }
};

// ── SEARCH SONGS (legacy ?q= endpoint) ───────────────────────────────────
exports.searchSongs = async(req, res) => {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json([]);
    try {
        const result = await pool.query(
            `SELECT s.*, a.name AS artist_name, a.image_url AS artist_image
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.id
       WHERE s.title ILIKE $1
          OR a.name  ILIKE $1
          OR s.genre ILIKE $1
       ORDER BY s.play_count DESC
       LIMIT 50`, [`%${q.trim()}%`]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Search failed' });
    }
};

// ── GET RECOMMENDATIONS (personal — based on user's listening history) ────
exports.getRecommendations = async(req, res) => {
    try {
        // Step 1: Get user's top genres from their listening history
        const historyResult = await pool.query(
            `SELECT s.genre, COUNT(*) AS listen_count
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.id
       WHERE lh.user_id = $1 AND s.genre IS NOT NULL
       GROUP BY s.genre
       ORDER BY listen_count DESC
       LIMIT 3`, [req.userId]
        );

        const genres = historyResult.rows.map(r => r.genre);

        // No history = return empty so Top Mixes doesn't show
        if (genres.length === 0) return res.json([]);

        // Step 2: Get VibeOrbit songs from those genres
        const vibeorbitSongs = await pool.query(
            `SELECT s.*, a.name AS artist_name, a.image_url AS artist_image,
              'vibeorbit' AS source
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.id
       WHERE s.genre = ANY($1)
       ORDER BY s.play_count DESC
       LIMIT 10`, [genres]
        );

        // Step 3: Get top Deezer songs by platform play count
        const deezerSongs = await pool.query(
            `SELECT
         ('dz_' || deezer_id) AS id,
         deezer_id,
         title,
         artist_name,
         cover_url,
         audio_url,
         play_count,
         'deezer' AS source
       FROM deezer_plays
       ORDER BY play_count DESC
       LIMIT 10`
        );

        // Step 4: Merge both, sort by play_count, return top 20
        const combined = [
            ...vibeorbitSongs.rows,
            ...deezerSongs.rows,
        ].sort((a, b) => (b.play_count || 0) - (a.play_count || 0));

        res.json(combined.slice(0, 20));
    } catch (err) {
        console.error('Recommendations error:', err);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
};

// ── GET TRENDING ──────────────────────────────────────────────────────────
exports.getTrending = async(req, res) => {
    try {
        const result = await pool.query(
            `SELECT s.*, a.name AS artist_name, a.image_url AS artist_image
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.id
       ORDER BY s.play_count DESC
       LIMIT 20`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch trending songs' });
    }
};

// ── DELETE SONG ───────────────────────────────────────────────────────────
exports.deleteSong = async(req, res) => {
    try {
        const song = await pool.query(
            'SELECT * FROM songs WHERE id = $1 AND uploaded_by = $2', [req.params.id, req.userId]
        );
        if (!song.rows[0])
            return res.status(404).json({ error: 'Song not found or unauthorized' });

        await pool.query('DELETE FROM songs WHERE id = $1', [req.params.id]);
        res.json({ message: 'Song deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Delete failed' });
    }
};