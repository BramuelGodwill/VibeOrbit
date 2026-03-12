'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, Music2, Play, Pause, Radio, X, Clock, ExternalLink, TrendingUp } from 'lucide-react';
import api                from '@/lib/api';
import { usePlayerStore } from '@/store/playerStore';

type Song = {
  id:          string;
  title:       string;
  artist_name: string;
  cover_url:   string;
  audio_url:   string;
  duration?:   number;
  source?:     string;
  deezer_id?:  number;
  album?:      string;
};

const GENRES = ['Pop','Hip-Hop','R&B','Afrobeats','Bongo Flava','Gospel','Jazz','Rock','Electronic','Reggae','Classical'];

const toArray = (data: any): Song[] =>
  Array.isArray(data) ? data : (data?.songs || data?.results || []);

const MAX_RECENT = 6;
function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem('vb_recent_searches') || '[]'); } catch { return []; }
}
function saveRecent(q: string) {
  try {
    const prev = getRecent().filter(s => s !== q);
    localStorage.setItem('vb_recent_searches', JSON.stringify([q, ...prev].slice(0, MAX_RECENT)));
  } catch {}
}
function clearRecent() {
  try { localStorage.removeItem('vb_recent_searches'); } catch {}
}

export default function SearchPage() {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayerStore();
  const [query,        setQuery]        = useState('');
  const [deezerSongs,  setDeezerSongs]  = useState<Song[]>([]);
  const [myMusic,      setMyMusic]      = useState<Song[]>([]);
  const [allMyMusic,   setAllMyMusic]   = useState<Song[]>([]);
  const [allTrending,  setAllTrending]  = useState<Song[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [tab,          setTab]          = useState<'all' | 'vibeorbit' | 'deezer'>('all');
  const [genre,        setGenre]        = useState('');
  const [recent,       setRecent]       = useState<string[]>([]);
  const [amackUrls,    setAmackUrls]    = useState<Record<string, string>>({});
  const debounceRef  = useRef<NodeJS.Timeout>();
  const inputRef     = useRef<HTMLInputElement>(null);

  // Load recent searches + initial data
  useEffect(() => {
    setRecent(getRecent());
    Promise.allSettled([
      api.get('/deezer/trending?limit=20'),
      api.get('/songs'),
    ]).then(([deezerRes, myRes]) => {
      const dz = deezerRes.status === 'fulfilled' ? toArray(deezerRes.value.data) : [];
      const my = myRes.status     === 'fulfilled' ? toArray(myRes.value.data)     : [];
      setDeezerSongs(dz);
      setMyMusic(my);
      setAllTrending(dz);
      setAllMyMusic(my);
    });
  }, []);

  // ESC clears search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setQuery(''); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Fetch Audiomack URLs for Deezer results
  useEffect(() => {
    if (deezerSongs.length === 0) return;
    deezerSongs.slice(0, 10).forEach(song => {
      if (amackUrls[song.id]) return;
      api.get('/audiomack/search', { params: { title: song.title, artist: song.artist_name } })
        .then(res => {
          const url = res.data?.result?.url;
          if (url) setAmackUrls(prev => ({ ...prev, [song.id]: url }));
        }).catch(() => {});
    });
  }, [deezerSongs]);

  const handleSearch = (value: string) => {
    setQuery(value);
    setGenre('');
    clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setDeezerSongs(allTrending);
      setMyMusic(allMyMusic);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [deezerRes, myRes] = await Promise.allSettled([
          api.get('/deezer/search?q=' + encodeURIComponent(value) + '&limit=20'),
          api.get('/songs?search='    + encodeURIComponent(value)),
        ]);
        setDeezerSongs(deezerRes.status === 'fulfilled' ? toArray(deezerRes.value.data) : []);
        setMyMusic(myRes.status         === 'fulfilled' ? toArray(myRes.value.data)     : []);
        saveRecent(value.trim());
        setRecent(getRecent());
      } catch {}
      finally { setLoading(false); }
    }, 400);
  };

  const handleGenre = (g: string) => {
    const next = genre === g ? '' : g;
    setGenre(next);
    setQuery('');
    if (!next) {
      setMyMusic(allMyMusic);
      setDeezerSongs(allTrending);
      return;
    }
    setMyMusic(allMyMusic.filter(s => s.source !== 'deezer' &&
      (s as any).genre?.toLowerCase() === next.toLowerCase()
    ));
    setDeezerSongs(allTrending);
  };

  const handlePlay = (song: Song, queue: Song[]) => {
    if (currentSong?.id === song.id) togglePlay();
    else playSong(song as any, queue as any);
  };

  const combinedQueue = [...myMusic, ...deezerSongs];
  const isEmpty = !loading && query && deezerSongs.length === 0 && myMusic.length === 0;
  const showHome = !query && !genre;

  return (
    <div className="max-w-3xl mx-auto pb-10">

      {/* ── Search bar ── */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search songs, artists, albums..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
          autoFocus
          className="w-full pl-11 pr-10 py-3.5 bg-white/[0.06] border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/25"
        />
        {query ? (
          <button onClick={() => handleSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
            <X size={16} />
          </button>
        ) : loading ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          </div>
        ) : null}
      </div>

      {/* ── Genre chips ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide -mx-1 px-1">
        {GENRES.map(g => (
          <button key={g} onClick={() => handleGenre(g)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              genre === g
                ? 'bg-white text-black'
                : 'bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white'
            }`}>
            {g}
          </button>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all',       label: 'All'       },
          { key: 'vibeorbit', label: 'VibeOrbit' },
          { key: 'deezer',    label: '🌍 Deezer' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-black'
                : 'bg-white/[0.06] text-white/50 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Recent searches (shown when bar empty) ── */}
      {showHome && recent.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs text-white/30 uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <Clock size={11} /> Recent searches
            </h2>
            <button onClick={() => { clearRecent(); setRecent([]); }}
              className="text-[10px] text-white/20 hover:text-white/50 transition-colors">
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map(r => (
              <button key={r} onClick={() => handleSearch(r)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/10 rounded-full text-xs text-white/60 hover:text-white transition-all">
                <Clock size={10} className="text-white/20" />
                {r}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── ALL TAB ── */}
      {tab === 'all' && !isEmpty && (
        <>
          {myMusic.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3 px-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {genre ? `${genre} on VibeOrbit` : 'On VibeOrbit'}
                </span>
                <span className="text-white/15 normal-case tracking-normal font-normal">
                  {myMusic.length} songs
                </span>
              </h2>
              <div className="space-y-1">
                {myMusic.map(song => (
                  <SongRow
                    key={song.id} song={song}
                    isActive={currentSong?.id === song.id}
                    isPlaying={currentSong?.id === song.id && isPlaying}
                    onPlay={() => handlePlay(song, combinedQueue)}
                  />
                ))}
              </div>
            </section>
          )}

          {deezerSongs.length > 0 && (
            <section>
              <h2 className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3 px-1 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Radio size={12} />
                  {query ? 'Deezer Results' : 'Trending on Deezer'}
                  <span className="text-white/15 normal-case tracking-normal font-normal">— 30s previews</span>
                </span>
                <span className="text-white/15 normal-case tracking-normal font-normal">
                  {deezerSongs.length} songs
                </span>
              </h2>
              <div className="space-y-1">
                {deezerSongs.map(song => (
                  <SongRow
                    key={song.id} song={song}
                    isActive={currentSong?.id === song.id}
                    isPlaying={currentSong?.id === song.id && isPlaying}
                    onPlay={() => handlePlay(song, combinedQueue)}
                    isDeezer
                    audiomackUrl={amackUrls[song.id]}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── VIBEORBIT TAB ── */}
      {tab === 'vibeorbit' && (
        <section>
          <h2 className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3 px-1 flex items-center justify-between">
            <span>On VibeOrbit</span>
            <span className="text-white/15 normal-case tracking-normal font-normal">{myMusic.length} songs</span>
          </h2>
          {myMusic.length === 0 && !loading ? (
            <div className="text-center py-12">
              <Music2 size={28} className="mx-auto mb-3 text-white/10" />
              <p className="text-white/20 text-sm">{query ? 'No VibeOrbit results' : 'No songs yet'}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {myMusic.map(song => (
                <SongRow
                  key={song.id} song={song}
                  isActive={currentSong?.id === song.id}
                  isPlaying={currentSong?.id === song.id && isPlaying}
                  onPlay={() => handlePlay(song, myMusic)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── DEEZER TAB ── */}
      {tab === 'deezer' && (
        <section>
          <h2 className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3 px-1 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Radio size={12} />
              {query ? 'Deezer Results' : 'Trending on Deezer'}
              <span className="text-white/15 normal-case tracking-normal font-normal">— 30s previews</span>
            </span>
            <span className="text-white/15 normal-case tracking-normal font-normal">{deezerSongs.length} songs</span>
          </h2>
          {deezerSongs.length === 0 && !loading ? (
            <div className="text-center py-12">
              <Radio size={28} className="mx-auto mb-3 text-white/10" />
              <p className="text-white/20 text-sm">No results found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {deezerSongs.map(song => (
                <SongRow
                  key={song.id} song={song}
                  isActive={currentSong?.id === song.id}
                  isPlaying={currentSong?.id === song.id && isPlaying}
                  onPlay={() => handlePlay(song, deezerSongs)}
                  isDeezer
                  audiomackUrl={amackUrls[song.id]}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Empty state ── */}
      {isEmpty && (
        <div className="text-center py-16 text-white/20">
          <Music2 size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No results for "{query}"</p>
          <p className="text-xs mt-1 text-white/10">Try a different search or browse by genre</p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {GENRES.slice(0, 5).map(g => (
              <button key={g} onClick={() => handleGenre(g)}
                className="px-3 py-1 bg-white/[0.06] rounded-full text-xs text-white/40 hover:text-white transition-colors">
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ── Song row ──────────────────────────────────────────────────────────────
function SongRow({
  song, isActive, isPlaying, onPlay, isDeezer = false, audiomackUrl,
}: {
  song:          Song;
  isActive:      boolean;
  isPlaying:     boolean;
  onPlay:        () => void;
  isDeezer?:     boolean;
  audiomackUrl?: string;
}) {
  const mins = Math.floor((song.duration || 0) / 60);
  const secs = String((song.duration || 0) % 60).padStart(2, '0');

  return (
    <div onClick={onPlay}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer touch-manipulation transition-colors ${
        isActive ? 'bg-white/10' : 'hover:bg-white/[0.05] active:bg-white/10'
      }`}>
      <div className="w-11 h-11 rounded-lg bg-white/10 overflow-hidden shrink-0 flex items-center justify-center relative">
        {song.cover_url
          ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
          : <Music2 size={16} className="text-white/30" />
        }
        {isActive && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            {isPlaying
              ? <Pause size={14} className="text-white" fill="white" />
              : <Play  size={14} className="text-white" fill="white" />
            }
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : ''}`}>
          {song.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-white/40 truncate">{song.artist_name}</p>
          {isDeezer && audiomackUrl && (
            <a href={audiomackUrl} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] text-orange-400/70 hover:text-orange-400 transition-colors shrink-0">
              <ExternalLink size={9} />
              Full
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isDeezer && (
          <span className="text-[10px] bg-purple-500/20 text-purple-300/70 px-2 py-0.5 rounded-full">
            30s
          </span>
        )}
        {song.duration ? (
          <span className="text-xs text-white/25">{mins}:{secs}</span>
        ) : null}
      </div>
    </div>
  );
}
