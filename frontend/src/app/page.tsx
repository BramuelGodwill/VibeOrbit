'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { usePlayerStore } from '@/store/playerStore';
import { useAuthStore }   from '@/store/authStore';
import {
  Play, Heart, Clock, Flame, Music2, Radio,
  Headphones, Crown
} from 'lucide-react';

const GENRES = ['All','Pop','Hip-Hop','R&B','Afrobeats','Bongo Flava',
                'Gospel','Jazz','Rock','Electronic','Reggae','Classical','Podcast'];

function SongRow({ song, queue }: { song: any; queue: any[] }) {
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
        <p className="text-xs text-white/35 truncate">{song.artist_name || 'Unknown'}</p>
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
  const [allSongs,    setAllSongs]    = useState<any[]>([]);
  const [likedSongs,  setLikedSongs]  = useState<any[]>([]);
  const [recent,      setRecent]      = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [popular,     setPopular]     = useState<any[]>([]);
  const [genre,       setGenre]       = useState('All');
  const [loading,     setLoading]     = useState(true);
  const { setQueue }                  = usePlayerStore();
  const { user }                      = useAuthStore();

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const load = async () => {
      try {
        // All songs
        const songsRes = await api.get('/songs');
        const songs: any[] = songsRes.data;
        setAllSongs(songs);
        setQueue(songs);

        // Popular this week — sorted by total play_count across all users
        const sorted = [...songs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
        setPopular(sorted.slice(0, 10));

        // Recommendations (songs this user has been listening to by genre)
        try {
          const recRes = await api.get('/songs/recommendations');
          setRecommended(recRes.data.slice(0, 10));
        } catch {
          setRecommended(sorted.slice(0, 10));
        }

        // User's liked songs — fetched from their likes endpoint
        try {
          const likesRes = await api.get('/users/likes');
          setLikedSongs(likesRes.data.slice(0, 10));
        } catch {
          // Fallback: songs the user has listened to most
          setLikedSongs([]);
        }

        // User's recently played — only THIS user's history
        try {
          const histRes = await api.get('/users/history');
          setRecent(histRes.data.slice(0, 2)); // only 2 for jump back in
        } catch {
          setRecent([]);
        }

      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filteredSongs = genre === 'All'
    ? allSongs
    : allSongs.filter(s => s.genre === genre || s.type === genre.toLowerCase());

  const throwbacks = allSongs.filter(s =>
    s.genre === 'Classical' || s.genre === 'Jazz' || s.genre === 'Rock'
  ).slice(0, 8);

  const podcasts = allSongs.filter(s =>
    s.type === 'podcast' || s.genre === 'Podcast'
  ).slice(0, 6);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner" />
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-black leading-tight">
            {greeting}
          </h1>
          {user && <p className="text-white/40 text-sm truncate">{user.username}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!user?.is_premium && (
            <Link href="/profile"
              className="flex items-center gap-1.5 bg-white text-black text-[11px] font-black px-3 py-1.5 rounded-full hover:opacity-90 active:scale-95 transition-all whitespace-nowrap">
              <Crown size={11} /> Go Premium
            </Link>
          )}
          {user?.is_premium && (
            <span className="flex items-center gap-1 bg-yellow-400/20 text-yellow-400 text-[10px] font-black px-2.5 py-1 rounded-full">
              <Crown size={10} /> Premium
            </span>
          )}
          <Link href="/profile">
            <div className="w-9 h-9 rounded-full bg-white/10 overflow-hidden border border-white/10 flex items-center justify-center">
              {(user as any)?.avatar_url
                ? <img src={(user as any).avatar_url} alt="profile" className="w-full h-full object-cover" />
                : <span className="text-white/40 font-bold text-sm">
                    {user?.username?.[0]?.toUpperCase() || '?'}
                  </span>
              }
            </div>
          </Link>
        </div>
      </div>

      {/* ── GENRE FILTER ── */}
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

      {/* ── JUMP BACK IN — 2 songs side by side ── */}
      {recent.length > 0 && genre === 'All' && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-white/40" />
            <h2 className="text-base font-bold">Jump back in</h2>
          </div>
          {/* Always 2 columns side by side */}
          <div className="grid grid-cols-2 gap-2">
            {recent.slice(0, 2).map(song => (
              <div key={song.id}
                onClick={() => usePlayerStore.getState().playSong(song, recent)}
                className="group flex items-center gap-2.5 bg-white/[0.06] hover:bg-white/10 active:bg-white/15 rounded-xl p-2.5 cursor-pointer transition-all">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0">
                  {song.cover_url
                    ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                    : <Music2 size={14} className="m-auto mt-3 text-white/20" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{song.title}</p>
                  <p className="text-[10px] text-white/35 truncate">{song.artist_name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── LIKED SONGS — only songs the user actually liked ── */}
      {likedSongs.length > 0 && genre === 'All' && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart size={15} className="text-red-400" />
              <h2 className="text-base font-bold">Liked Songs</h2>
            </div>
            <span className="text-xs text-white/30">{likedSongs.length} songs</span>
          </div>
          <div className="space-y-0.5">
            {likedSongs.map(s => <SongRow key={s.id} song={s} queue={likedSongs} />)}
          </div>
        </section>
      )}

      {/* ── YOUR TOP MIXES — personalised by listening history ── */}
      {recommended.length > 0 && genre === 'All' && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Headphones size={15} className="text-white/40" />
            <h2 className="text-base font-bold">Your Top Mixes</h2>
          </div>
          <p className="text-xs text-white/25 -mt-2 mb-3">Based on your listening history</p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {recommended.map(s => (
              <SongCard key={s.id} song={s} queue={recommended} />
            ))}
          </div>
        </section>
      )}

      {/* ── POPULAR THIS WEEK — ranked by total plays from all users ── */}
      {popular.length > 0 && genre === 'All' && (
        <section>
          <div className="flex items-center gap-2 mb-1">
            <Flame size={15} className="text-orange-400" />
            <h2 className="text-base font-bold">Popular this week</h2>
          </div>
          <p className="text-xs text-white/25 mb-3">Most played by everyone on VibeOrbit</p>
          <div className="space-y-0.5">
            {popular.map((s, i) => (
              <div key={s.id}
                onClick={() => usePlayerStore.getState().playSong(s, popular)}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/[0.06] active:bg-white/10 transition-all">
                {/* Rank number */}
                <span className={`text-sm font-black w-5 text-right shrink-0 ${
                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-white/50' : i === 2 ? 'text-orange-400/60' : 'text-white/20'
                }`}>{i + 1}</span>
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
                <div className="text-right shrink-0">
                  <p className="text-xs text-white/30 font-medium">
                    {(s.play_count || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-white/15">plays</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── THROWBACK HITS ── */}
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

      {/* ── PODCASTS ── */}
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

      {/* ── ALL / FILTERED ── */}
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
