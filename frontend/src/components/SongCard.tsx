'use client';
import { Play, Music2 } from 'lucide-react';
import { usePlayerStore, Song } from '@/store/playerStore';

interface Props {
  song:   Song;
  queue?: Song[];
}

export default function SongCard({ song, queue }: Props) {
  const { playSong, currentSong, isPlaying } = usePlayerStore();
  const isActive = currentSong?.id === song.id;

  return (
    <div
      onClick={() => playSong(song, queue)}
      className={`group cursor-pointer rounded-xl p-3 transition-all ${
        isActive ? 'bg-white/10' : 'bg-white/[0.03] hover:bg-white/[0.08]'
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
        {/* Play overlay */}
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

      {/* Info */}
      <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-white/90'}`}>
        {song.title}
      </p>
      <p className="text-xs text-white/40 truncate mt-0.5">
        {song.artist_name || 'Unknown Artist'}
      </p>
      {song.genre && (
        <span className="text-[10px] text-white/25 uppercase tracking-wide">{song.genre}</span>
      )}
    </div>
  );
}
