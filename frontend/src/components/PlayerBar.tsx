'use client';
import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music2, X } from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';

function formatTime(secs: number) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function PlayerBar() {
  const { currentSong, isPlaying, togglePlay, playNext, playPrev, volume, setVolume, stop } = usePlayerStore();
  const audioRef    = useRef<HTMLAudioElement>(null);
  const [current,  setCurrent]  = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted,    setMuted]    = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    audio.src    = currentSong.audio_url;
    audio.volume = volume;
    if (isPlaying) audio.play().catch(() => {});
  }, [currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => {});
    else           audio.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // Update browser tab title with song name
  useEffect(() => {
    if (currentSong) {
      document.title = `${currentSong.title} — VibeOrbit`;
    } else {
      document.title = 'VibeOrbit — Music. Your way.';
    }
  }, [currentSong]);

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
    <>
      {/* ── EXPANDED FULL SCREEN (mobile tap to expand) ── */}
      {expanded && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center px-8"
          style={{ background: 'linear-gradient(180deg, #111 0%, #000 100%)' }}>
          <button onClick={() => setExpanded(false)}
            className="absolute top-5 right-5 text-white/40 hover:text-white">
            <X size={24} />
          </button>

          {/* Big cover art */}
          <div className="w-64 h-64 md:w-72 md:h-72 rounded-2xl overflow-hidden bg-white/10 mb-8 shadow-2xl">
            {currentSong.cover_url
              ? <img src={currentSong.cover_url} alt={currentSong.title} className="w-full h-full object-cover" />
              : <Music2 size={64} className="m-auto mt-24 text-white/20" />
            }
          </div>

          <div className="text-center mb-8 w-full max-w-xs">
            <h2 className="text-xl font-black truncate">{currentSong.title}</h2>
            <p className="text-white/50 mt-1">{currentSong.artist_name || 'Unknown Artist'}</p>
          </div>

          {/* Seek bar */}
          <div className="w-full max-w-xs mb-6">
            <input type="range" min="0" max="100" value={progress}
              onChange={handleSeek} className="w-full" />
            <div className="flex justify-between text-xs text-white/30 mt-1">
              <span>{formatTime(current)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-8">
            <button onClick={playPrev} className="text-white/50 hover:text-white transition-colors">
              <SkipBack size={28} />
            </button>
            <button onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-xl">
              {isPlaying ? <Pause size={22} fill="black" /> : <Play size={22} fill="black" className="ml-0.5" />}
            </button>
            <button onClick={playNext} className="text-white/50 hover:text-white transition-colors">
              <SkipForward size={28} />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 mt-8 w-full max-w-xs">
            <button onClick={() => setMuted(!muted)} className="text-white/30 hover:text-white">
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input type="range" min="0" max="1" step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
              className="flex-1" />
          </div>
        </div>
      )}

      {/* ── MINI PLAYER BAR (always visible at bottom) ── */}
      <div className="fixed bottom-0 inset-x-0 z-50">
        {/* Mobile: tap to expand */}
        <div className="md:hidden">
          <div className="h-[1px] bg-white/10 relative">
            <div className="absolute top-0 left-0 h-full bg-white transition-all duration-300"
              style={{ width: `${progress}%` }} />
          </div>
          <div className="bg-black/95 backdrop-blur-xl border-t border-white/[0.06] px-3 py-2.5"
            style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
            <div className="flex items-center gap-3">
              {/* Cover — tap to expand */}
              <div onClick={() => setExpanded(true)}
                className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden shrink-0 cursor-pointer">
                {currentSong.cover_url
                  ? <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                  : <Music2 size={14} className="m-auto mt-3 text-white/20" />}
              </div>
              {/* Song info — tap to expand */}
              <div onClick={() => setExpanded(true)} className="flex-1 min-w-0 cursor-pointer">
                <p className="text-sm font-semibold truncate">{currentSong.title}</p>
                <p className="text-xs text-white/35 truncate">{currentSong.artist_name}</p>
              </div>
              {/* Controls */}
              <button onClick={playPrev} className="text-white/40 hover:text-white p-1">
                <SkipBack size={18} />
              </button>
              <button onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                {isPlaying
                  ? <Pause size={14} fill="black" />
                  : <Play size={14} fill="black" className="ml-0.5" />}
              </button>
              <button onClick={playNext} className="text-white/40 hover:text-white p-1">
                <SkipForward size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop player bar */}
        <div className="hidden md:block">
          <div className="h-[1px] bg-white/10 relative">
            <div className="absolute top-0 left-0 h-full bg-white transition-all"
              style={{ width: `${progress}%` }} />
          </div>
          <div className="bg-black/95 backdrop-blur-xl border-t border-white/[0.06] px-4 py-3">
            <audio
              ref={audioRef}
              onTimeUpdate={(e) => { const a = e.currentTarget; setCurrent(a.currentTime); setDuration(a.duration || 0); }}
              onEnded={playNext}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            />
            <div className="flex items-center gap-4 max-w-5xl mx-auto">
              {/* Song info */}
              <div className="flex items-center gap-3 w-56 min-w-0">
                <div className="w-11 h-11 rounded-lg bg-white/10 overflow-hidden shrink-0">
                  {currentSong.cover_url
                    ? <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                    : <Music2 size={16} className="m-auto mt-3.5 text-white/20" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{currentSong.title}</p>
                  <p className="text-xs text-white/35 truncate">{currentSong.artist_name || 'Unknown'}</p>
                </div>
              </div>

              {/* Center controls */}
              <div className="flex-1 flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-5">
                  <button onClick={playPrev} className="text-white/40 hover:text-white transition-colors">
                    <SkipBack size={18} />
                  </button>
                  <button onClick={togglePlay}
                    className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform">
                    {isPlaying
                      ? <Pause size={15} fill="black" />
                      : <Play size={15} fill="black" className="ml-0.5" />}
                  </button>
                  <button onClick={playNext} className="text-white/40 hover:text-white transition-colors">
                    <SkipForward size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-2 w-full max-w-sm">
                  <span className="text-[11px] text-white/25 w-7 text-right shrink-0">{formatTime(current)}</span>
                  <input type="range" min="0" max="100" value={progress}
                    onChange={handleSeek} className="flex-1" />
                  <span className="text-[11px] text-white/25 w-7 shrink-0">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2 w-32 justify-end">
                <button onClick={() => setMuted(!muted)} className="text-white/40 hover:text-white shrink-0">
                  {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input type="range" min="0" max="1" step="0.05"
                  value={muted ? 0 : volume}
                  onChange={(e) => { setVolume(parseFloat(e.target.value)); if (muted) setMuted(false); }}
                  className="w-20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audio element for mobile */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => { const a = e.currentTarget; setCurrent(a.currentTime); setDuration(a.duration || 0); }}
        onEnded={playNext}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        className="hidden"
      />
    </>
  );
}
