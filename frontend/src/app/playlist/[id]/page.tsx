'use client';
import { useEffect, useState } from 'react';
import { useParams }  from 'next/navigation';
import Link           from 'next/link';
import { ArrowLeft, Play, Trash2, Music2 } from 'lucide-react';
import api            from '@/lib/api';
import { usePlayerStore } from '@/store/playerStore';

export default function PlaylistPage() {
  const params = useParams();
  const id     = params.id as string;

  const [playlist, setPlaylist] = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const { playSong, setQueue }  = usePlayerStore();

  const load = async () => {
    try {
      const { data } = await api.get(`/playlists/${id}`);
      setPlaylist(data);
    } catch { alert('Playlist not found'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const removeSong = async (songId: string) => {
    try {
      await api.delete(`/playlists/${id}/songs/${songId}`);
      setPlaylist((p: any) => ({ ...p, songs: p.songs.filter((s: any) => s.id !== songId) }));
    } catch { alert('Failed to remove song'); }
  };

  const playAll = () => {
    if (!playlist?.songs?.length) return;
    setQueue(playlist.songs);
    playSong(playlist.songs[0], playlist.songs);
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="spinner" /></div>;
  if (!playlist) return null;

  return (
    <div>
      <Link href="/library" className="flex items-center gap-1 text-sm text-white/30 hover:text-white mb-6 transition-colors w-fit">
        <ArrowLeft size={14} /> Back to Library
      </Link>

      {/* Header */}
      <div className="flex items-end gap-6 mb-10">
        <div className="w-40 h-40 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
          <Music2 size={48} className="text-white/20" />
        </div>
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Playlist</p>
          <h1 className="text-4xl font-black mb-2">{playlist.name}</h1>
          <p className="text-white/40 text-sm">{playlist.songs?.length || 0} songs</p>
          {playlist.songs?.length > 0 && (
            <button onClick={playAll}
              className="mt-4 flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-full text-sm hover:opacity-85 transition-opacity">
              <Play size={14} fill="black" />Play All
            </button>
          )}
        </div>
      </div>

      {/* Songs */}
      {playlist.songs?.length === 0 ? (
        <div className="text-center py-20 text-white/20">
          <p>No songs in this playlist yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {playlist.songs.map((song: any, i: number) => (
            <div key={song.id}
              className="group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer"
              onClick={() => playSong(song, playlist.songs)}>
              <span className="text-sm text-white/20 w-5 text-right">{i + 1}</span>
              <div className="w-9 h-9 rounded-lg bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                {song.cover_url
                  ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                  : <Music2 size={14} className="text-white/30" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{song.title}</p>
                <p className="text-xs text-white/40 truncate">{song.artist_name}</p>
              </div>
              {song.genre && <span className="text-xs text-white/20 hidden sm:block">{song.genre}</span>}
              <button
                onClick={(e) => { e.stopPropagation(); removeSong(song.id); }}
                className="p-1.5 rounded text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
