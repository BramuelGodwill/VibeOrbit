'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, Music2, Play, Pause, Radio } from 'lucide-react';
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

const toArray = (data: any): Song[] =>
  Array.isArray(data) ? data : (data?.songs || data?.results || []);

export default function SearchPage() {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayerStore();
  const [query,       setQuery]       = useState('');
  const [deezerSongs, setDeezerSongs] = useState<Song[]>([]);
  const [myMusic,     setMyMusic]     = useState<Song[]>([]);
  const [allMyMusic,  setAllMyMusic]  = useState<Song[]>([]);
  const [allTrending, setAllTrending] = useState<Song[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [tab,         setTab]         = useState<'all' | 'vibeorbit' | 'deezer'>('all');
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load both sources on mount
  useEffect(() => {
    Promise.allSettled([
      api.get('/deezer/trending?limit=20'),
      api.get('/songs'),
    ]).then(([deezerRes, myRes]) => {
      const dz = deezerRes.status === 'fulfilled' ? toArray(deezerRes.value.data) : [];
      const my = myRes.status    === 'fulfilled'  ? toArray(myRes.value.data)     : [];
      setDeezerSongs(dz);
      setMyMusic(my);
      setAllTrending(dz);
      setAllMyMusic(my);
    });
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
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
        setMyMusic(myRes.status        === 'fulfilled'  ? toArray(myRes.value.data)     : []);
      } catch {}
      finally { setLoading(false); }
    }, 400);
  };

  const handlePlay = (song: Song, queue: Song[]) => {
    if (currentSong?.id === song.id) togglePlay();
    else playSong(song as any, queue as any);
  };

  // Combined list for "All" tab — VibeOrbit first, then Deezer
  const combinedQueue = [...myMusic, ...deezerSongs];

  const isEmpty = !loading && query &&
    deezerSongs.length === 0 && myMusic.length === 0;

  return (
    <div className="max-w-3xl mx-auto pb-10">

      {/* ── Search bar ── */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Search songs, artists, albums..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
          autoFocus
          className="w-full pl-11 pr-4 py-3.5 bg-white/[0.06] border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/25"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          </div>
        )}
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

      {/* ── ALL TAB — VibeOrbit section then Deezer section ── */}
      {tab === 'all' && !isEmpty && (
        <>
          {myMusic.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3 px-1">
                On VibeOrbit
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
              <h2 className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3 px-1 flex items-center gap-2">
                <Radio size={12} />
                {query ? 'Deezer Results' : 'Trending on Deezer'}
                <span className="text-white/15 normal-case tracking-normal font-normal">— 30s previews</span>
              </h2>
              <div className="space-y-1">
                {deezerSongs.map(song => (
                  <SongRow
                    key={song.id} song={song}
                    isActive={currentSong?.id === song.id}
                    isPlaying={currentSong?.id === song.id && isPlaying}
                    onPlay={() => handlePlay(song, combinedQueue)}
                    isDeezer
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
          <h2 className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3 px-1">
            On VibeOrbit
          </h2>
          {myMusic.length === 0 && !loading ? (
            <p className="text-white/20 text-sm text-center py-8">
              {query ? 'No VibeOrbit results' : 'No songs yet'}
            </p>
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
          <h2 className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3 px-1 flex items-center gap-2">
            <Radio size={12} />
            {query ? 'Deezer Results' : 'Trending on Deezer'}
            <span className="text-white/15 normal-case tracking-normal font-normal">— 30s previews</span>
          </h2>
          {deezerSongs.length === 0 && !loading ? (
            <p className="text-white/20 text-sm text-center py-8">No results found</p>
          ) : (
            <div className="space-y-1">
              {deezerSongs.map(song => (
                <SongRow
                  key={song.id} song={song}
                  isActive={currentSong?.id === song.id}
                  isPlaying={currentSong?.id === song.id && isPlaying}
                  onPlay={() => handlePlay(song, deezerSongs)}
                  isDeezer
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
          <p className="text-xs mt-1 text-white/10">Try a different search</p>
        </div>
      )}

    </div>
  );
}

// ── Song row ──────────────────────────────────────────────────────
function SongRow({
  song, isActive, isPlaying, onPlay, isDeezer = false,
}: {
  song:      Song;
  isActive:  boolean;
  isPlaying: boolean;
  onPlay:    () => void;
  isDeezer?: boolean;
}) {
  const mins = Math.floor((song.duration || 0) / 60);
  const secs = String((song.duration || 0) % 60).padStart(2, '0');

  return (
    <div onClick={onPlay}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer touch-manipulation transition-colors ${
        isActive ? 'bg-white/10' : 'hover:bg-white/[0.05] active:bg-white/10'
      }`}
    >
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
        <p className="text-xs text-white/40 truncate">{song.artist_name}</p>
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
