const router         = require('express').Router();
const OAuth          = require('oauth-1.0a');
const crypto         = require('crypto');

const oauth = OAuth({
  consumer: {
    key:    process.env.AUDIOMACK_KEY    || 'vibeorbit',
    secret: process.env.AUDIOMACK_SECRET || 'ffe308915cb6f25b711dc235d2514ddd',
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base, key) {
    return crypto.createHmac('sha1', key).update(base).digest('base64');
  },
});

// ── SEARCH Audiomack by title + artist ───────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { title, artist } = req.query;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const url = 'https://api.audiomack.com/v1/search_onelink';
    const params = { title, titletype: 'song' };
    if (artist) params.artist = artist;

    const requestData = { url, method: 'GET' };
    const authHeader  = oauth.toHeader(oauth.authorize(requestData));

    // Build query string
    const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const fullUrl = `${url}?${qs}`;

    const response = await fetch(fullUrl, {
      headers: { Authorization: authHeader.Authorization },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Audiomack search error:', err);
    res.status(500).json({ error: 'Audiomack search failed' });
  }
});

// ── GET stream URL for a song ─────────────────────────────────────────────
router.get('/stream', async (req, res) => {
  try {
    const { title, artist } = req.query;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const url = 'https://api.audiomack.com/v1/search_onelink';
    const params = { title, titletype: 'song' };
    if (artist) params.artist = artist;

    const requestData = { url, method: 'GET' };
    const authHeader  = oauth.toHeader(oauth.authorize(requestData));

    const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const fullUrl = `${url}?${qs}`;

    const response = await fetch(fullUrl, {
      headers: { Authorization: authHeader.Authorization },
    });
    const data = await response.json();

    if (data.result && data.result.url) {
      res.json({
        stream_url:  data.result.url,
        title:       data.result.title,
        artist_name: data.result.artist_name,
        image:       data.result.image,
        music_id:    data.result.music_id,
      });
    } else {
      res.json({ stream_url: null });
    }
  } catch (err) {
    console.error('Audiomack stream error:', err);
    res.status(500).json({ error: 'Failed to get stream URL' });
  }
});

module.exports = router;
