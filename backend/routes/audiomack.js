const router = require('express').Router();
const crypto = require('crypto');

const CONSUMER_KEY    = process.env.AUDIOMACK_KEY    || 'vibeorbit';
const CONSUMER_SECRET = process.env.AUDIOMACK_SECRET || 'ffe308915cb6f25b711dc235d2514ddd';

function buildOAuthHeader(method, baseUrl, extraParams = {}) {
  const oauthParams = {
    oauth_consumer_key:     CONSUMER_KEY,
    oauth_nonce:            crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_version:          '1.0',
  };

  // Merge all params for signature base
  const allParams = { ...extraParams, ...oauthParams };

  // Sort and encode
  const sortedParams = Object.keys(allParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join('&');

  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(baseUrl),
    encodeURIComponent(sortedParams),
  ].join('&');

  // Sign with consumer secret + empty token secret
  const signingKey = `${encodeURIComponent(CONSUMER_SECRET)}&`;
  const signature  = crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');

  oauthParams.oauth_signature = signature;

  const headerValue = 'OAuth ' + Object.keys(oauthParams)
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ');

  return headerValue;
}

// ── SEARCH Audiomack ──────────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { title, artist } = req.query;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const baseUrl    = 'https://api.audiomack.com/v1/search_onelink';
    const queryParams = { title, titletype: 'song' };
    if (artist) queryParams.artist = artist;

    const authHeader = buildOAuthHeader('GET', baseUrl, queryParams);
    const qs         = Object.entries(queryParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

    const response = await fetch(`${baseUrl}?${qs}`, {
      headers: { Authorization: authHeader },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Audiomack search error:', err);
    res.status(500).json({ error: 'Audiomack search failed' });
  }
});

// ── GET stream URL ────────────────────────────────────────────────────────
router.get('/stream', async (req, res) => {
  try {
    const { title, artist } = req.query;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const baseUrl     = 'https://api.audiomack.com/v1/search_onelink';
    const queryParams = { title, titletype: 'song' };
    if (artist) queryParams.artist = artist;

    const authHeader = buildOAuthHeader('GET', baseUrl, queryParams);
    const qs         = Object.entries(queryParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

    const response = await fetch(`${baseUrl}?${qs}`, {
      headers: { Authorization: authHeader },
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
      res.json({ stream_url: null, raw: data });
    }
  } catch (err) {
    console.error('Audiomack stream error:', err);
    res.status(500).json({ error: 'Failed to get stream URL' });
  }
});

module.exports = router;
