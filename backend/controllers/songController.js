const pool = require('../config/db');

// ── UPLOAD SONG ───────────────────────────────────────────────────────────
exports.uploadSong = async (req, res) => {
  const { title, genre, duration, artistName } = req.body;
  const audio_url = req.file?.path;
  const cover_url = req.body.cover_url || null;

  if (!audio_url) return res.status(400).json({ error: 'No audio file uploaded' });
  if (!title)     return res.status(400).json({ error: 'Song title is required' });

  try {
    // Get or create artist
    let artistId = null;
    if (artistName && artistName.trim()) {
      const existing = await pool.query(
        'SELECT id FROM artists WHERE name = $1',
        [artistName.trim()]
      );
      if (existing.rows[0]) {
        artistId = existing.rows[0].id;
      } else {
        const newArtist = await pool.query(
          'INSERT INTO artists (name) VALUES ($1) RETURNING id',
          [artistName.trim()]
        );
        artistId = newArtist.rows[0].id;
      }
    }

    const result = await pool.query(
      `INSERT INTO songs (title, artist_id, audio_url, cover_url, genre, duration, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title.trim(), artistId, audio_url, cover_url, genre || null, parseInt(duration) || 0, req.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Upload song error:', err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
};

// ── GET ALL SONGS ─────────────────────────────────────────────────────────
exports.getAllSongs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, a.name AS artist_name
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.id
       ORDER BY s.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
};

// ── GET SINGLE SONG ───────────────────────────────────────────────────────
exports.getSong = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, a.name AS artist_name
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Song not found' });

    // Increment play count
    await pool.query(
      'UPDATE songs SET play_count = play_count + 1 WHERE id = $1',
      [req.params.id]
    );

    // Record in listening history
    if (req.userId) {
      await pool.query(
        'INSERT INTO listening_history (user_id, song_id) VALUES ($1, $2)',
        [req.userId, req.params.id]
      ).catch(() => {}); // Non-critical
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch song' });
  }
};

// ── SEARCH SONGS ──────────────────────────────────────────────────────────
exports.searchSongs = async (req, res) => {
  const { q } = req.query;

  if (!q || !q.trim()) return res.json([]);

  try {
    const result = await pool.query(
      `SELECT s.*, a.name AS artist_name
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.id
       WHERE s.title ILIKE $1
          OR a.name  ILIKE $1
          OR s.genre ILIKE $1
       ORDER BY s.play_count DESC
       LIMIT 30`,
      [`%${q.trim()}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
};

// ── GET RECOMMENDATIONS ───────────────────────────────────────────────────
exports.getRecommendations = async (req, res) => {
  try {
    // Find user's top genres from listening history
    const historyResult = await pool.query(
      `SELECT s.genre, COUNT(*) AS listen_count
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.id
       WHERE lh.user_id = $1 AND s.genre IS NOT NULL
       GROUP BY s.genre
       ORDER BY listen_count DESC
       LIMIT 3`,
      [req.userId]
    );

    const genres = historyResult.rows.map(r => r.genre);
    let songs;

    if (genres.length > 0) {
      songs = await pool.query(
        `SELECT s.*, a.name AS artist_name
         FROM songs s
         LEFT JOIN artists a ON s.artist_id = a.id
         WHERE s.genre = ANY($1)
         ORDER BY s.play_count DESC
         LIMIT 15`,
        [genres]
      );
    }

    // Fallback: most played songs
    if (!songs || songs.rows.length === 0) {
      songs = await pool.query(
        `SELECT s.*, a.name AS artist_name
         FROM songs s
         LEFT JOIN artists a ON s.artist_id = a.id
         ORDER BY s.play_count DESC
         LIMIT 15`
      );
    }

    res.json(songs.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
};

// ── GET TRENDING ──────────────────────────────────────────────────────────
exports.getTrending = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, a.name AS artist_name
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
exports.deleteSong = async (req, res) => {
  try {
    const song = await pool.query(
      'SELECT * FROM songs WHERE id=$1 AND uploaded_by=$2',
      [req.params.id, req.userId]
    );
    if (!song.rows[0]) return res.status(404).json({ error: 'Song not found or unauthorized' });

    await pool.query('DELETE FROM songs WHERE id=$1', [req.params.id]);
    res.json({ message: 'Song deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
};
