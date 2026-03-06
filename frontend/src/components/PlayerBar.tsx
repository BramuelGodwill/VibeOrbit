'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Music2, X,
  Repeat, Repeat1, Share2, Heart, ListPlus
} from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { useAuthStore }   from '@/store/authStore';
import api from '@/lib/api';

function formatTime(secs: number) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function PlayerBar() {
  const { currentSong, isPlaying, togglePlay, playNext, playPrev, volume, setVolume } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();
  const audioRef    = useRef<HTMLAudioElement>(null);
  const [current,   setCurrent]   = useState(0);
  const [duration,  setDuration]  = useState(0);
  const [muted,     setMuted]     = useState(false);
  const [expanded,  setExpanded]  = useState(false);
  const [loop,      setLoop]      = useState<'none' | 'one' | 'all'>('none');
  const [liked,     setLiked]     = useState(false);
  const [shareMsg,  setShareMsg]  = useState('');
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [showPL,    setShowPL]    = useState(false);
  const [addedMsg,  setAddedMsg]  = useState('');

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    // Set preload to auto so browser buffers immediately
    audio.preload    = 'auto';
    audio.src        = currentSong.audio_url;
    audio.loop       = loop === 'one';
    audio.volume     = muted ? 0 : volume;
    setLiked(false);

    // Play as soon as enough data is buffered
    const tryPlay = () => {
      audio.play().catch(() => {});
    };

    // If already have enough data, play now
    if (audio.readyState >= 3) {
      tryPlay();
    } else {
      audio.addEventListener('canplay', tryPlay, { once: true });
    }

    return () => {
      audio.removeEventListener('canplay', tryPlay);
    };
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = loop === 'one';
  }, [loop]);

  useEffect(() => {
    if (currentSong) {
      document.title = `${currentSong.title} — VibeOrbit`;
    } else {
      document.title = 'VibeOrbit — Music. Your way.';
    }
  }, [currentSong]);

  const handleEnded = () => {
    const audio = audioRef.current;
    if (loop === 'one') {
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
      return;
    }
    if (loop === 'all') { playNext(); return; }
    playNext();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = (parseFloat(e.target.value) / 100) * duration;
    audio.currentTime = time;
    setCurrent(time);
  };

  const cycleLoop = () => {
    setLoop(l => l === 'none' ? 'all' : l === 'all' ? 'one' : 'none');
  };

  const handleLike = () => {
    if (!isAuthenticated()) return;
    setLiked(l => !l);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `🎵 Listening to "${currentSong?.title}" by ${currentSong?.artist_name || 'Unknown'} on VibeOrbit`;
    if (navigator.share) {
      try {
        await navigator.share({ title: currentSong?.title, text, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareMsg('Link copied!');
      setTimeout(() => setShareMsg(''), 2000);
    }
  };

  const loadPlaylists = async () => {
    if (!isAuthenticated()) return;
    try {
      const { data } = await api.get('/playlists/my');
      setPlaylists(data);
      setShowPL(true);
    } catch {}
  };

  const addToPlaylist = async (playlistId: string) => {
    if (!currentSong) return;
    try {
      await api.post('/playlists/add-song', {
        playlistId,
        songId: currentSong.id,
      });
      setAddedMsg('Added to playlist!');
      setShowPL(false);
      setTimeout(() => setAddedMsg(''), 2000);
    } catch (err: any) {
      setAddedMsg(err.response?.data?.error || 'Failed to add');
      setTimeout(() => setAddedMsg(''), 2000);
    }
  };

  const progress = duration ? (current / duration) * 100 : 0;

  if (!currentSong) return null;

  const LoopIcon = loop === 'one' ? Repeat1 : Repeat;
  const loopColor = loop !== 'none' ? 'text-white' : 'text-white/30';

  return (
    <>
      {/* ── Playlist picker popup ── */}
      {showPL && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowPL(false)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-xs p-4"
            onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-3 text-sm">Add to playlist</h3>
            {playlists.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-4">No playlists yet. Create one in Library.</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {playlists.map(p => (
                  <button key={p.id} onClick={() => addToPlaylist(p.id)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 text-sm transition-colors">
                    {p.name}
                    <span className="text-white/30 text-xs ml-2">{p.song_count || 0} songs</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowPL(false)}
              className="mt-3 w-full text-xs text-white/30 hover:text-white transition-colors py-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Expanded full screen player ── */}
      {expanded && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-8"
          style={{ background: 'linear-gradient(180deg, #1a1a1a 0%, #000 100%)' }}>
          <button onClick={() => setExpanded(false)}
            className="absolute top-5 right-5 text-white/40 hover:text-white">
            <X size={24} />
          </button>

          {/* Big cover */}
          <div className="w-64 h-64 md:w-72 md:h-72 rounded-2xl overflow-hidden bg-white/10 mb-6 shadow-2xl">
            {currentSong.cover_url
              ? <img src={currentSong.cover_url} alt={currentSong.title} className="w-full h-full object-cover" />
              : <Music2 size={64} className="m-auto mt-24 text-white/20" />
            }
          </div>

          {/* Song info + like/share */}
          <div className="flex items-center justify-between w-full max-w-xs mb-6">
            <div className="min-w-0">
              <h2 className="text-xl font-black truncate">{currentSong.title}</h2>
              <p className="text-white/50 text-sm mt-0.5">{currentSong.artist_name || 'Unknown Artist'}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <button onClick={handleLike}
                className={`transition-all ${liked ? 'text-red-400 scale-110' : 'text-white/30 hover:text-white'}`}>
                <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button onClick={handleShare} className="text-white/30 hover:text-white transition-colors">
                <Share2 size={20} />
              </button>
            </div>
          </div>

          {/* Seek */}
          <div className="w-full max-w-xs mb-5">
            <input type="range" min="0" max="100" value={progress}
              onChange={handleSeek} className="w-full" />
            <div className="flex justify-between text-xs text-white/25 mt-1">
              <span>{formatTime(current)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-7 mb-6">
            <button onClick={cycleLoop} className={`transition-colors ${loopColor}`}>
              <LoopIcon size={20} />
            </button>
            <button onClick={playPrev} className="text-white/50 hover:text-white transition-colors">
              <SkipBack size={28} />
            </button>
            <button onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shadow-xl">
              {isPlaying ? <Pause size={22} fill="black" /> : <Play size={22} fill="black" className="ml-0.5" />}
            </button>
            <button onClick={playNext} className="text-white/50 hover:text-white transition-colors">
              <SkipForward size={28} />
            </button>
            <button onClick={loadPlaylists} className="text-white/30 hover:text-white transition-colors">
              <ListPlus size={20} />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            <button onClick={() => setMuted(!muted)} className="text-white/30 hover:text-white">
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input type="range" min="0" max="1" step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
              className="flex-1" />
          </div>

          {/* Status messages */}
          {(shareMsg || addedMsg) && (
            <p className="mt-4 text-xs text-white/50 bg-white/10 px-4 py-2 rounded-full">
              {shareMsg || addedMsg}
            </p>
          )}
        </div>
      )}

      {/* ── Mini player (mobile) ── */}
      <div className="fixed bottom-0 inset-x-0 z-50 md:hidden">
        <div className="h-[2px] bg-white/10 relative">
          <div className="absolute top-0 left-0 h-full bg-white transition-all duration-300"
            style={{ width: `${progress}%` }} />
        </div>
        <div className="bg-black/97 backdrop-blur-xl border-t border-white/[0.06] px-3 py-2"
          style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
          <audio ref={audioRef}
            preload="auto"
            onTimeUpdate={e => { const a = e.currentTarget; setCurrent(a.currentTime); setDuration(a.duration || 0); }}
            onEnded={handleEnded}
            onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
          />
          <div className="flex items-center gap-2">
            <div onClick={() => setExpanded(true)}
              className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden shrink-0 cursor-pointer">
              {currentSong.cover_url
                ? <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                : <Music2 size={14} className="m-auto mt-3 text-white/20" />}
            </div>
            <div onClick={() => setExpanded(true)} className="flex-1 min-w-0 cursor-pointer">
              <p className="text-sm font-semibold truncate leading-tight">{currentSong.title}</p>
              <p className="text-xs text-white/35 truncate">{currentSong.artist_name}</p>
            </div>
            <button onClick={handleLike}
              className={`p-1.5 transition-all ${liked ? 'text-red-400' : 'text-white/30'}`}>
              <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button onClick={playPrev} className="text-white/40 p-1">
              <SkipBack size={18} />
            </button>
            <button onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
              {isPlaying ? <Pause size={14} fill="black" /> : <Play size={14} fill="black" className="ml-0.5" />}
            </button>
            <button onClick={playNext} className="text-white/40 p-1">
              <SkipForward size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop player bar ── */}
      <div className="hidden md:block fixed bottom-0 inset-x-0 z-50">
        <div className="h-[1px] bg-white/10 relative">
          <div className="absolute top-0 left-0 h-full bg-white transition-all"
            style={{ width: `${progress}%` }} />
        </div>
        <div className="bg-black/97 backdrop-blur-xl border-t border-white/[0.06] px-4 py-3">
          <audio ref={audioRef}
            preload="auto"
            onTimeUpdate={e => { const a = e.currentTarget; setCurrent(a.currentTime); setDuration(a.duration || 0); }}
            onEnded={handleEnded}
            onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
          />
          <div className="flex items-center gap-4 max-w-5xl mx-auto">

            {/* Song info */}
            <div className="flex items-center gap-3 w-64 min-w-0">
              <div className="w-11 h-11 rounded-lg bg-white/10 overflow-hidden shrink-0">
                {currentSong.cover_url
                  ? <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                  : <Music2 size={16} className="m-auto mt-3 text-white/20" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{currentSong.title}</p>
                <p className="text-xs text-white/35 truncate">{currentSong.artist_name || 'Unknown'}</p>
              </div>
              {/* Like */}
              <button onClick={handleLike}
                className={`shrink-0 transition-all ${liked ? 'text-red-400 scale-110' : 'text-white/25 hover:text-white'}`}>
                <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Center controls */}
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-5">
                <button onClick={cycleLoop} title={`Loop: ${loop}`}
                  className={`transition-colors ${loopColor}`}>
                  <LoopIcon size={16} />
                </button>
                <button onClick={playPrev} className="text-white/40 hover:text-white transition-colors">
                  <SkipBack size={18} />
                </button>
                <button onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform">
                  {isPlaying ? <Pause size={15} fill="black" /> : <Play size={15} fill="black" className="ml-0.5" />}
                </button>
                <button onClick={playNext} className="text-white/40 hover:text-white transition-colors">
                  <SkipForward size={18} />
                </button>
                <button onClick={loadPlaylists} title="Add to playlist"
                  className="text-white/25 hover:text-white transition-colors">
                  <ListPlus size={18} />
                </button>
              </div>
              <div className="flex items-center gap-2 w-full max-w-sm">
                <span className="text-[11px] text-white/25 w-7 text-right shrink-0">{formatTime(current)}</span>
                <input type="range" min="0" max="100" value={progress}
                  onChange={handleSeek} className="flex-1" />
                <span className="text-[11px] text-white/25 w-7 shrink-0">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3 w-40 justify-end">
              {/* Share */}
              <div className="relative">
                <button onClick={handleShare} title="Share"
                  className="text-white/25 hover:text-white transition-colors">
                  <Share2 size={16} />
                </button>
                {shareMsg && (
                  <span className="absolute -top-8 right-0 bg-white/10 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap">
                    {shareMsg}
                  </span>
                )}
              </div>
              {addedMsg && (
                <span className="text-xs text-green-400 whitespace-nowrap">{addedMsg}</span>
              )}
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
    </>
  );
}
