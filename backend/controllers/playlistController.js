const pool = require('../config/db');

// ── CREATE PLAYLIST ───────────────────────────────────────────────────────
exports.create = async (req, res) => {
  const { name, isPublic = true } = req.body;
  if (!name) return res.status(400).json({ error: 'Playlist name is required' });

  try {
    const result = await pool.query(
      'INSERT INTO playlists (name, user_id, is_public) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), req.userId, isPublic]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create playlist' });
  }
};

// ── GET MY PLAYLISTS ──────────────────────────────────────────────────────
exports.getMyPlaylists = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, COUNT(ps.song_id) AS song_count
       FROM playlists p
       LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
};

// ── GET SINGLE PLAYLIST ───────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const playlist = await pool.query(
      'SELECT * FROM playlists WHERE id=$1',
      [req.params.id]
    );
    if (!playlist.rows[0]) return res.status(404).json({ error: 'Playlist not found' });

    const songs = await pool.query(
      `SELECT s.*, a.name AS artist_name, ps.added_at, ps.position
       FROM songs s
       JOIN playlist_songs ps ON s.id = ps.song_id
       LEFT JOIN artists a ON s.artist_id = a.id
       WHERE ps.playlist_id = $1
       ORDER BY ps.position ASC, ps.added_at ASC`,
      [req.params.id]
    );

    res.json({ ...playlist.rows[0], songs: songs.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
};

// ── ADD SONG TO PLAYLIST ──────────────────────────────────────────────────
exports.addSong = async (req, res) => {
  const { playlistId, songId } = req.body;
  if (!playlistId || !songId) return res.status(400).json({ error: 'playlistId and songId required' });

  try {
    // Verify user owns the playlist
    const playlist = await pool.query(
      'SELECT * FROM playlists WHERE id=$1 AND user_id=$2',
      [playlistId, req.userId]
    );
    if (!playlist.rows[0]) return res.status(403).json({ error: 'Playlist not found or unauthorized' });

    // Get current max position
    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), 0) AS max_pos FROM playlist_songs WHERE playlist_id=$1',
      [playlistId]
    );
    const position = posResult.rows[0].max_pos + 1;

    await pool.query(
      'INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, $3) ON CONFLICT (playlist_id, song_id) DO NOTHING',
      [playlistId, songId, position]
    );

    res.json({ message: 'Song added to playlist' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add song' });
  }
};

// ── REMOVE SONG FROM PLAYLIST ─────────────────────────────────────────────
exports.removeSong = async (req, res) => {
  const { playlistId, songId } = req.params;
  try {
    const playlist = await pool.query(
      'SELECT * FROM playlists WHERE id=$1 AND user_id=$2',
      [playlistId, req.userId]
    );
    if (!playlist.rows[0]) return res.status(403).json({ error: 'Unauthorized' });

    await pool.query(
      'DELETE FROM playlist_songs WHERE playlist_id=$1 AND song_id=$2',
      [playlistId, songId]
    );
    res.json({ message: 'Song removed from playlist' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove song' });
  }
};

// ── DELETE PLAYLIST ───────────────────────────────────────────────────────
exports.deletePlaylist = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM playlists WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Playlist not found or unauthorized' });
    res.json({ message: 'Playlist deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
};
