-- VibeOrbit Database Schema
-- Run this in your Neon SQL Editor at neon.tech
-- Go to your project → SQL Editor → paste everything → click Run

-- ── Enable UUID extension ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Users ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email               VARCHAR(255) UNIQUE NOT NULL,
  username            VARCHAR(100) UNIQUE NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  avatar_url          TEXT,
  is_premium          BOOLEAN      DEFAULT false,
  reset_token         VARCHAR(255),
  reset_token_expiry  TIMESTAMP,
  created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ── Artists ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artists (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) UNIQUE NOT NULL,
  bio        TEXT,
  image_url  TEXT,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ── Songs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS songs (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(255) NOT NULL,
  artist_id    UUID         REFERENCES artists(id) ON DELETE SET NULL,
  audio_url    TEXT         NOT NULL,
  cover_url    TEXT,
  duration     INTEGER      DEFAULT 0,
  genre        VARCHAR(100),
  play_count   INTEGER      DEFAULT 0,
  uploaded_by  UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ── Playlists ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS playlists (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  user_id    UUID         REFERENCES users(id) ON DELETE CASCADE,
  cover_url  TEXT,
  is_public  BOOLEAN      DEFAULT true,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ── Playlist Songs (many-to-many) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS playlist_songs (
  id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id  UUID      REFERENCES playlists(id) ON DELETE CASCADE,
  song_id      UUID      REFERENCES songs(id)     ON DELETE CASCADE,
  position     INTEGER   DEFAULT 0,
  added_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(playlist_id, song_id)
);

-- ── Listening History ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listening_history (
  id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID      REFERENCES users(id) ON DELETE CASCADE,
  song_id      UUID      REFERENCES songs(id) ON DELETE CASCADE,
  listened_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Subscriptions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID           REFERENCES users(id) ON DELETE CASCADE,
  phone_number    VARCHAR(20),
  mpesa_receipt   VARCHAR(100),
  amount          DECIMAL(10, 2),
  status          VARCHAR(50)    DEFAULT 'pending', -- pending | completed | failed
  created_at      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes for performance ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_songs_genre        ON songs(genre);
CREATE INDEX IF NOT EXISTS idx_songs_play_count   ON songs(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_listening_user     ON listening_history(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_user      ON playlists(user_id);

-- ── Verify all tables created ──────────────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
