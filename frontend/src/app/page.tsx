'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import SongCard from '@/components/SongCard';
import { usePlayerStore } from '@/store/playerStore';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const [songs,       setSongs]       = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const { setQueue }  = usePlayerStore();
  const { user }      = useAuthStore();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const load = async () => {
      try {
        const [songsRes] = await Promise.all([api.get('/songs')]);
        setSongs(songsRes.data);
        setQueue(songsRes.data);

        // Recommendations only for logged-in users
        try {
          const recRes = await api.get('/songs/recommendations');
          setRecommended(recRes.data);
        } catch {}
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-1">
        {greeting}{user ? `, ${user.username}` : ''}
      </h1>
      <p className="text-white/40 text-sm mb-10">
        {songs.length} songs available to stream
      </p>

      {/* Recommendations */}
      {recommended.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-5">Recommended for you</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {recommended.slice(0, 5).map((s) => (
              <SongCard key={s.id} song={s} queue={recommended} />
            ))}
          </div>
        </section>
      )}

      {/* All Songs */}
      <section>
        <h2 className="text-xl font-bold mb-5">All Songs</h2>
        {songs.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <p className="text-5xl mb-4">🎵</p>
            <p className="font-semibold">No songs yet</p>
            <p className="text-sm mt-1">Be the first to upload a song!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {songs.map((s) => (
              <SongCard key={s.id} song={s} queue={songs} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
