'use client';
import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music2 } from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';

function formatTime(secs: number) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function PlayerBar() {
  const { currentSong, isPlaying, togglePlay, playNext, playPrev, volume, setVolume } = usePlayerStore();
  const audioRef    = useRef<HTMLAudioElement>(null);
  const [current, setCurrent]   = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted]       = useState(false);

  // Load new song when currentSong changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    audio.src    = currentSong.audio_url;
    audio.volume = volume;
    audio.muted  = muted;
    if (isPlaying) audio.play().catch(() => {});
  }, [currentSong]);

  // Play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => {});
    else           audio.pause();
  }, [isPlaying]);

  // Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = (parseFloat(e.target.value) / 100) * duration;
    audio.currentTime = time;
    setCurrent(time);
  };

  const progress = duration ? (current / duration) * 100 : 0;

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50">
      {/* Top progress line */}
      <div className="h-[1px] bg-white/10 relative">
        <div className="absolute top-0 left-0 h-full bg-white transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="bg-black/95 backdrop-blur-xl border-t border-white/[0.06] px-4 py-3">
        <audio
          ref={audioRef}
          onTimeUpdate={(e) => {
            const a = e.currentTarget;
            setCurrent(a.currentTime);
            setDuration(a.duration || 0);
          }}
          onEnded={playNext}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        />

        <div className="flex items-center gap-4 max-w-5xl mx-auto">

          {/* Song info */}
          <div className="flex items-center gap-3 w-56 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
              {currentSong.cover_url
                ? <img src={currentSong.cover_url} alt="cover" className="w-full h-full object-cover" />
                : <Music2 size={16} className="text-white/40" />
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{currentSong.title}</p>
              <p className="text-xs text-white/40 truncate mt-0.5">{currentSong.artist_name || 'Unknown'}</p>
            </div>
          </div>

          {/* Controls + seek bar */}
          <div className="flex-1 flex flex-col items-center gap-2">
            {/* Buttons */}
            <div className="flex items-center gap-5">
              <button onClick={playPrev} className="text-white/40 hover:text-white transition-colors">
                <SkipBack size={18} />
              </button>
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
              >
                {isPlaying
                  ? <Pause size={15} fill="black" />
                  : <Play  size={15} fill="black" className="ml-0.5" />
                }
              </button>
              <button onClick={playNext} className="text-white/40 hover:text-white transition-colors">
                <SkipForward size={18} />
              </button>
            </div>

            {/* Seek bar */}
            <div className="flex items-center gap-2 w-full max-w-sm">
              <span className="text-[11px] text-white/30 w-7 text-right shrink-0">
                {formatTime(current)}
              </span>
              <input
                type="range" min="0" max="100"
                value={progress}
                onChange={handleSeek}
                className="flex-1 h-1 appearance-none bg-white/20 rounded cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                           [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-white"
              />
              <span className="text-[11px] text-white/30 w-7 shrink-0">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 w-32 justify-end">
            <button onClick={() => setMuted(!muted)} className="text-white/40 hover:text-white transition-colors shrink-0">
              {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range" min="0" max="1" step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (muted && v > 0) setMuted(false);
              }}
              className="w-20 h-1 appearance-none bg-white/20 rounded cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                         [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:bg-white"
            />
          </div>

        </div>
      </div>
    </div>
  );
}
