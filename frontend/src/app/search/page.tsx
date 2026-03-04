'use client';
import { useState, useRef } from 'react';
import { Search }   from 'lucide-react';
import api           from '@/lib/api';
import SongCard      from '@/components/SongCard';

export default function SearchPage() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched,setSearched]= useState(false);
  const timer = useRef<NodeJS.Timeout>();

  const doSearch = async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/songs/search?q=${encodeURIComponent(q)}`);
      setResults(data);
      setSearched(true);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(val), 400);
  };

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Search</h1>

      {/* Search input */}
      <div className="relative max-w-xl mb-10">
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

      {/* Results */}
      {loading && (
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <div className="spinner" style={{ width: 16, height: 16 }} /> Searching...
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-20 text-white/30">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold">No results for &quot;{query}&quot;</p>
          <p className="text-sm mt-1">Try a different song title or artist name</p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p className="text-sm text-white/40 mb-5">
            {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {results.map((s) => (
              <SongCard key={s.id} song={s} queue={results} />
            ))}
          </div>
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-20 text-white/20">
          <p className="text-5xl mb-4">🎵</p>
          <p>Start typing to search</p>
        </div>
      )}
    </div>
  );
}
