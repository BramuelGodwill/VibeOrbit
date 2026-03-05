'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, Music2, Play } from 'lucide-react';
import api          from '@/lib/api';
import { usePlayerStore } from '@/store/playerStore';

export default function SearchPage() {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<any[]>([]);
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const { playSong, setQueue, currentSong, isPlaying } = usePlayerStore();
  const timer = useRef<NodeJS.Timeout>();

  // Load ALL songs when page opens
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/songs');
        setAllSongs(data);
        setQueue(data);
      } catch { }
      finally { setLoading(false); }
    };
    loadAll();
  }, []);

  // Search as user types
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timer.current);

    if (!val.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/songs/search?q=${encodeURIComponent(val)}`);
        setResults(data);
        setSearched(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  };

  // Which songs to show — search results OR all songs
  const songsToShow = searched ? results : allSongs;
  const queueToUse  = searched ? results : allSongs;

  return (
    <div>
      <h1 className="text-3xl font-black mb-6">Search</h1>

      {/* Search input */}
      <div className="relative max-w-xl mb-8">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="search"
          placeholder="Search songs, artists, genres..."
          value={query}
          onChange={handleChange}
          className="pl-10"
          autoFocus
        />
      </div>

      {/* Loading spinner */}
      {loading && (
        <div className="flex items-center gap-2 text-white/40 text-sm mb-6">
          <div className="spinner" style={{ width: 16, height: 16 }} />
          Loading...
        </div>
      )}

      {/* No results message */}
      {!loading && searched && results.length === 0 && (
        <div className="text-center py-20 text-white/30">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold">No results for &quot;{query}&quot;</p>
          <p className="text-sm mt-1">Try a different song title or artist name</p>
        </div>
      )}

      {/* Results count */}
      {!loading && searched && results.length > 0 && (
        <p className="text-sm text-white/40 mb-5">
          {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
        </p>
      )}

      {/* All songs label when not searching */}
      {!loading && !searched && allSongs.length > 0 && (
        <p className="text-sm text-white/40 mb-5">
          All songs — {allSongs.length} available
        </p>
      )}

      {/* Songs grid */}
      {!loading && songsToShow.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {songsToShow.map((song: any) => {
            const isActive = currentSong?.id === song.id;
            return (
              <div
                key={song.id}
                onClick={() => playSong(song, queueToUse)}
                className={`group cursor-pointer rounded-xl p-3 transition-all ${
                  isActive
                    ? 'bg-white/10'
                    : 'bg-white/[0.03] hover:bg-white/[0.08]'
                }`}
              >
                {/* Cover art */}
                <div className="relative mb-3 aspect-square rounded-lg overflow-hidden bg-white/10">
                  {song.cover_url
                    ? <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                    : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 size={28} className="text-white/20" />
                      </div>
                    )
                  }
                  {/* Play button overlay */}
                  <div className={`absolute inset-0 flex items-end justify-end p-2 transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
                      {isActive && isPlaying
                        ? <span className="w-3 h-3 bg-black rounded-sm" />
                        : <Play size={14} fill="black" className="ml-0.5" />
                      }
                    </button>
                  </div>
                </div>

                {/* Song info */}
                <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-white/90'}`}>
                  {song.title}
                </p>
                <p className="text-xs text-white/40 truncate mt-0.5">
                  {song.artist_name || 'Unknown Artist'}
                </p>
                {song.genre && (
                  <span className="text-[10px] text-white/25 uppercase tracking-wide">
                    {song.genre}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state — no songs at all */}
      {!loading && !searched && allSongs.length === 0 && (
        <div className="text-center py-20 text-white/20">
          <Music2 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-semibold">No songs uploaded yet</p>
          <p className="text-sm mt-1">Go to Upload to add the first song</p>
        </div>
      )}
    </div>
  );
}
