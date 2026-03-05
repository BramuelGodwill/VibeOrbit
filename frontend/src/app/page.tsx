'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { usePlayerStore } from '@/store/playerStore';
import { useAuthStore }   from '@/store/authStore';
import {
  Play, Heart, Clock, Flame, Music2, Radio,
  ChevronRight, Headphones
} from 'lucide-react';

const GENRES = ['All','Pop','Hip-Hop','R&B','Afrobeats','Bongo Flava',
                'Gospel','Jazz','Rock','Electronic','Reggae','Classical','Podcast'];

function SongRow({ song, queue, showArtist = true }: { song: any; queue: any[]; showArtist?: boolean }) {
  const { playSong, currentSong, isPlaying } = usePlayerStore();
  const isActive = currentSong?.id === song.id;

  return (
    <div
      onClick={() => playSong(song, queue)}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
        isActive ? 'bg-white/10' : 'hover:bg-white/[0.06]'
      }`}
    >
      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0">
        {song.cover_url
          ? <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
          : <Music2 size={14} className="absolute inset-0 m-auto text-white/20" />
        }
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <Play size={12} fill="white" className="text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-white/90'}`}>
          {song.title}
        </p>
        {showArtist && (
          <p className="text-xs text-white/35 truncate">{song.artist_name || 'Unknown'}</p>
        )}
      </div>
      {isActive && isPlaying && (
        <div className="flex gap-0.5 items-end h-4 shrink-0">
          {[1,2,3].map(i => (
            <div key={i} className="w-0.5 bg-white rounded-full animate-pulse"
              style={{ height: `${40 + i * 20}%`, animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      )}
    </div>
  );
}

function SongCard({ song, queue }: { song: any; queue: any[] }) {
  const { playSong, currentSong, isPlaying } = usePlayerStore();
  const isActive = currentSong?.id === song.id;

  return (
    <div onClick={() => playSong(song, queue)}
      className={`group cursor-pointer rounded-xl p-2.5 transition-all shrink-0 w-36 md:w-40 ${
        isActive ? 'bg-white/10' : 'hover:bg-white/[0.07]'
      }`}>
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white/10 mb-2">
        {song.cover_url
          ? <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
          : <Music2 size={24} className="absolute inset-0 m-auto text-white/20" />
        }
        <div className={`absolute inset-0 flex items-end justify-end p-1.5 transition-opacity ${
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xl">
            {isActive && isPlaying
              ? <span className="w-2.5 h-2.5 bg-black rounded-sm" />
              : <Play size={12} fill="black" className="ml-0.5" />
            }
          </div>
        </div>
      </div>
      <p className="text-xs font-semibold truncate">{song.title}</p>
      <p className="text-[11px] text-white/35 truncate mt-0.5">{song.artist_name || 'Unknown'}</p>
    </div>
  );
}

export default function HomePage() {
  const [allSongs,     setAllSongs]     = useState<any[]>([]);
  const [liked,        setLiked]        = useState<any[]>([]);
  const [recent,       setRecent]       = useState<any[]>([]);
  const [recommended,  setRecommended]  = useState<any[]>([]);
  const [genre,        setGenre]        = useState('All');
  const [loading,      setLoading]      = useState(true);
  const { setQueue, currentSong }       = usePlayerStore();
  const { user }                        = useAuthStore();

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const load = async () => {
      try {
        const [songsRes] = await Promise.all([api.get('/songs')]);
        const songs = songsRes.data;
        setAllSongs(songs);
        setQueue(songs);

        // Liked = songs with highest play count (simulate liked)
        setLiked(songs.slice(0, 6));

        try {
          const recRes = await api.get('/songs/recommendations');
          setRecommended(recRes.data);
        } catch { setRecommended(songs.slice(0, 8)); }

        try {
          const histRes = await api.get('/users/history');
          setRecent(histRes.data.slice(0, 6));
        } catch { setRecent(songs.slice(0, 6)); }

      } catch { }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filteredSongs = genre === 'All'
    ? allSongs
    : allSongs.filter(s => s.genre === genre || s.type === genre.toLowerCase());

  const topThisWeek = [...allSongs].sort((a, b) => b.play_count - a.play_count).slice(0, 6);
  const throwbacks  = allSongs.filter(s => s.genre === 'Classical' || s.genre === 'Jazz' || s.genre === 'Rock').slice(0, 6);
  const podcasts    = allSongs.filter(s => s.type === 'podcast' || s.genre === 'Podcast').slice(0, 4);
  const jumpBack    = currentSong ? [currentSong, ...recent.filter(s => s.id !== currentSong.id)] : recent;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner" />
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-black leading-tight">
            {greeting} 👋
          </h1>
          {user && <p className="text-white/40 text-sm">{user.username}</p>}
        </div>
        {/* Profile picture top right */}
        <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden border border-white/10 shrink-0">
          {(user as any)?.avatar_url
            ? <img src={(user as any).avatar_url} alt="profile"
                className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-white/30 font-bold text-sm">
                {user?.username?.[0]?.toUpperCase() || '?'}
              </div>
          }
        </div>
      </div>

      {/* ── GENRE FILTER ─────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {GENRES.map(g => (
          <button key={g} onClick={() => setGenre(g)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              genre === g
                ? 'bg-white text-black'
                : 'bg-white/[0.07] text-white/60 hover:bg-white/10 hover:text-white'
            }`}>
            {g}
          </button>
        ))}
      </div>

      {/* ── JUMP BACK IN ─────────────────────────────────────── */}
      {jumpBack.length > 0 && genre === 'All' && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-white/40" />
            <h2 className="text-base font-bold">Jump back in</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {jumpBack.slice(0, 4).map(song => (
              <div key={song.id}
                onClick={() => usePlayerStore.getState().playSong(song, jumpBack)}
                className="group flex items-center gap-2.5 bg-white/[0.06] hover:bg-white/10 rounded-xl p-2.5 cursor-pointer transition-all">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0">
                  {song.cover_url
                    ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                    : <Music2 size={14} className="m-auto mt-3 text-white/20" />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{song.title}</p>
                  <p className="text-[11px] text-white/35 truncate">{song.artist_name}</p>
                </div>
                <Play size={14} className="text-white/0 group-hover:text-white/60 transition-colors ml-auto shrink-0" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── LIKED SONGS ──────────────────────────────────────── */}
      {liked.length > 0 && genre === 'All' && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart size={15} className="text-white/40" />
              <h2 className="text-base font-bold">Liked Songs</h2>
            </div>
            <span className="text-xs text-white/30">{liked.length} songs</span>
          </div>
          <div className="space-y-0.5">
            {liked.map(s => <SongRow key={s.id} song={s} queue={liked} />)}
          </div>
        </section>
      )}

      {/* ── YOUR TOP MIXES ───────────────────────────────────── */}
      {recommended.length > 0 && genre === 'All' && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Headphones size={15} className="text-white/40" />
              <h2 className="text-base font-bold">Your Top Mixes</h2>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {recommended.slice(0, 8).map(s => (
              <SongCard key={s.id} song={s} queue={recommended} />
            ))}
          </div>
        </section>
      )}

      {/* ── POPULAR THIS WEEK ────────────────────────────────── */}
      {topThisWeek.length > 0 && genre === 'All' && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Flame size={15} className="text-white/40" />
            <h2 className="text-base font-bold">Popular this week</h2>
          </div>
          <div className="space-y-0.5">
            {topThisWeek.map((s, i) => (
              <div key={s.id}
                onClick={() => usePlayerStore.getState().playSong(s, topThisWeek)}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/[0.06] transition-all">
                <span className="text-sm font-bold text-white/20 w-5 text-right shrink-0">{i + 1}</span>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0">
                  {s.cover_url
                    ? <img src={s.cover_url} alt="" className="w-full h-full object-cover" />
                    : <Music2 size={14} className="m-auto mt-3 text-white/20" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-white/35 truncate">{s.artist_name}</p>
                </div>
                <span className="text-xs text-white/20 shrink-0 hidden sm:block">
                  {s.play_count} plays
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── THROWBACK ────────────────────────────────────────── */}
      {throwbacks.length > 0 && genre === 'All' && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Radio size={15} className="text-white/40" />
            <h2 className="text-base font-bold">Throwback hits</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {throwbacks.map(s => <SongCard key={s.id} song={s} queue={throwbacks} />)}
          </div>
        </section>
      )}

      {/* ── PODCASTS ─────────────────────────────────────────── */}
      {podcasts.length > 0 && genre === 'All' && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Headphones size={15} className="text-white/40" />
            <h2 className="text-base font-bold">Podcasts</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {podcasts.map(s => <SongCard key={s.id} song={s} queue={podcasts} />)}
          </div>
        </section>
      )}

      {/* ── ALL / FILTERED SONGS ─────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold">
            {genre === 'All' ? 'All Songs' : genre}
          </h2>
          <span className="text-xs text-white/30">{filteredSongs.length} songs</span>
        </div>
        {filteredSongs.length === 0 ? (
          <div className="text-center py-16 text-white/20">
            <Music2 size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No {genre} songs yet</p>
          </div>
        ) : (
          <div className="flex gap-3 flex-wrap">
            {filteredSongs.map(s => (
              <SongCard key={s.id} song={s} queue={filteredSongs} />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
