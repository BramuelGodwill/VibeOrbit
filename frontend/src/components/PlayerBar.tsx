'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Music2, X,
  Repeat, Repeat1, Share2, Heart, ListPlus, Radio, ExternalLink
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
  const {
    currentSong, isPlaying, togglePlay,
    playNext, playPrev, volume, setVolume,
  } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();

  const audioRef   = useRef<HTMLAudioElement>(null);
  const [current,  setCurrent]  = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted,    setMuted]    = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loop,     setLoop]     = useState<'none' | 'one' | 'all'>('none');
  const [liked,    setLiked]    = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [playlists,setPlaylists]= useState<any[]>([]);
  const [showPL,   setShowPL]   = useState(false);
  const [addedMsg, setAddedMsg] = useState('');
  const [amackUrl, setAmackUrl] = useState<string | null>(null);

  const isDeezer = currentSong?.source === 'deezer';

  // ── Fetch Audiomack URL when Deezer song plays ─────────────────────────
  useEffect(() => {
    setAmackUrl(null);
    if (!isDeezer || !currentSong) return;
    api.get('/audiomack/search', {
      params: {
        title:  currentSong.title,
        artist: currentSong.artist_name,
      },
    }).then(res => {
      const url = res.data?.result?.url;
      if (url) setAmackUrl(url);
    }).catch(() => {});
  }, [currentSong?.id]);

  // ── Load + play new song ───────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    const tryPlay = () => { audio.play().catch(() => {}); };

    audio.pause();
    audio.preload     = 'auto';
    audio.src         = currentSong.audio_url;
    audio.loop        = false;
    audio.volume      = muted ? 0 : volume;
    audio.currentTime = 0;
    setLiked(false);
    setCurrent(0);
    setDuration(0);

    if (audio.readyState >= 3) {
      tryPlay();
    } else {
      audio.addEventListener('canplay', tryPlay, { once: true });
    }

    return () => { audio.removeEventListener('canplay', tryPlay); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.id]);

  // ── Play / pause toggle ───────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => {});
    else           audio.pause();
  }, [isPlaying]);

  // ── Volume / mute ────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // ── Document title ───────────────────────────────────────────────────
  useEffect(() => {
    document.title = currentSong
      ? `${currentSong.title} — VibeOrbit`
      : 'VibeOrbit — Music. Your way.';
  }, [currentSong]);

  // ── Song ended ───────────────────────────────────────────────────────
  const handleEnded = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (loop === 'one') {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }

    const { queue, currentSong: cs } = usePlayerStore.getState();
    const idx  = queue.findIndex(s => s.id === cs?.id);
    const next = queue[idx + 1];

    if (next) {
      usePlayerStore.getState().playSong(next, queue);
    } else if (loop === 'all') {
      const first = queue[0];
      if (first) usePlayerStore.getState().playSong(first, queue);
    } else {
      audio.currentTime = 0;
      usePlayerStore.setState({ isPlaying: false });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = (parseFloat(e.target.value) / 100) * duration;
    audio.currentTime = time;
    setCurrent(time);
  };

  const cycleLoop = () =>
    setLoop(l => l === 'none' ? 'all' : l === 'all' ? 'one' : 'none');

  const handleLike = async () => {
    if (!isAuthenticated() || !currentSong || isDeezer) return;
    const newLiked = !liked;
    setLiked(newLiked);
    try {
      if (newLiked) await api.post('/users/likes/' + currentSong.id);
      else          await api.delete('/users/likes/' + currentSong.id);
    } catch {
      setLiked(!newLiked);
    }
  };

  const handleShare = async () => {
    const url  = window.location.origin;
    const text = `🎵 Listening to "${currentSong?.title}" by ${currentSong?.artist_name || 'Unknown'} on VibeOrbit`;
    if (navigator.share) {
      try { await navigator.share({ title: currentSong?.title, text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(text + '\n' + url).catch(() => {});
      setShareMsg('Link copied!');
      setTimeout(() => setShareMsg(''), 2000);
    }
  };

  const loadPlaylists = async () => {
    if (!isAuthenticated() || isDeezer) {
      setAddedMsg(isDeezer ? 'Only full songs can be added to playlists' : '');
      setTimeout(() => setAddedMsg(''), 2500);
      return;
    }
    try {
      const { data } = await api.get('/playlists/my');
      setPlaylists(data);
      setShowPL(true);
    } catch {}
  };

  const addToPlaylist = async (playlistId: string) => {
    if (!currentSong) return;
    try {
      await api.post('/playlists/add-song', { playlistId, songId: currentSong.id });
      setAddedMsg('Added!');
      setShowPL(false);
      setTimeout(() => setAddedMsg(''), 2000);
    } catch (err: any) {
      setAddedMsg(err.response?.data?.error || 'Failed');
      setTimeout(() => setAddedMsg(''), 2000);
    }
  };

  const progress  = duration ? (current / duration) * 100 : 0;
  const LoopIcon  = loop === 'one' ? Repeat1 : Repeat;
  const loopColor = loop !== 'none' ? 'text-white' : 'text-white/30';

  if (!currentSong) return null;

  // ── Deezer preview badge ──────────────────────────────────────────────
  const DeezerBadge = () => (
    <span className="inline-flex items-center gap-1 text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-medium shrink-0">
      <Radio size={9} /> 30s preview
    </span>
  );

  // ── Audiomack button ──────────────────────────────────────────────────
  const AudiomackBtn = ({ size = 'sm' }: { size?: 'sm' | 'lg' }) => {
    if (!isDeezer || !amackUrl) return null;
    return (
      <a href={amackUrl} target="_blank" rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-semibold rounded-full transition-all ${
          size === 'lg'
            ? 'text-xs px-3 py-1.5'
            : 'text-[10px] px-2.5 py-1'
        }`}>
        <ExternalLink size={size === 'lg' ? 11 : 9} />
        Full song on Audiomack
      </a>
    );
  };

  const audioEl = (
    <audio
      ref={audioRef}
      preload="auto"
      onTimeUpdate={e => {
        const a = e.currentTarget;
        setCurrent(a.currentTime);
        setDuration(a.duration || 0);
      }}
      onEnded={handleEnded}
      onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
    />
  );

  return (
    <>
      {/* ── Playlist picker ── */}
      {showPL && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowPL(false)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-xs p-4"
            onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-3 text-sm">Add to playlist</h3>
            {playlists.length === 0
              ? <p className="text-white/40 text-sm text-center py-4">No playlists yet.</p>
              : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {playlists.map(p => (
                    <button key={p.id} onClick={() => addToPlaylist(p.id)}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 text-sm transition-colors">
                      {p.name}
                      <span className="text-white/30 text-xs ml-2">{p.song_count || 0} songs</span>
                    </button>
                  ))}
                </div>
              )
            }
            <button onClick={() => setShowPL(false)}
              className="mt-3 w-full text-xs text-white/30 hover:text-white py-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Full-screen expanded player (mobile) ── */}
      {expanded && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-8"
          style={{ background: 'linear-gradient(180deg, #1a1a1a 0%, #000 100%)' }}>
          <button onClick={() => setExpanded(false)}
            className="absolute top-5 right-5 text-white/40 hover:text-white p-2">
            <X size={24} />
          </button>

          {/* Cover */}
          <div className="w-64 h-64 md:w-72 md:h-72 rounded-2xl overflow-hidden bg-white/10 mb-6 shadow-2xl">
            {currentSong.cover_url
              ? <img src={currentSong.cover_url} alt={currentSong.title} className="w-full h-full object-cover" />
              : <Music2 size={64} className="m-auto mt-24 text-white/20" />
            }
          </div>

          {/* Title + badge + like/share */}
          <div className="flex items-center justify-between w-full max-w-xs mb-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black truncate">{currentSong.title}</h2>
              <p className="text-white/50 text-sm mt-0.5">{currentSong.artist_name || 'Unknown Artist'}</p>
              {isDeezer && <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <DeezerBadge />
                <AudiomackBtn size="sm" />
              </div>}
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <button onClick={handleLike}
                className={`transition-all active:scale-90 ${
                  isDeezer ? 'text-white/15 cursor-not-allowed' :
                  liked    ? 'text-red-400 scale-110' : 'text-white/30'
                }`}>
                <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button onClick={handleShare} className="text-white/30 active:scale-90 transition-all">
                <Share2 size={20} />
              </button>
            </div>
          </div>

          {/* Audiomack CTA for Deezer songs */}
          {isDeezer && amackUrl && (
            <div className="w-full max-w-xs mb-3">
              <AudiomackBtn size="lg" />
            </div>
          )}

          {isDeezer && !amackUrl && (
            <p className="text-white/25 text-xs text-center mb-4 max-w-xs">
              This is a 30-second Deezer preview. Search on VibeOrbit for full songs.
            </p>
          )}

          {/* Seek bar */}
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
            <button onClick={cycleLoop}
              className={`transition-colors active:scale-90 ${loopColor}`}>
              <LoopIcon size={20} />
            </button>
            <button onClick={playPrev}
              className="text-white/50 hover:text-white active:scale-90 transition-all">
              <SkipBack size={28} />
            </button>
            <button onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl">
              {isPlaying
                ? <Pause size={22} fill="black" />
                : <Play  size={22} fill="black" className="ml-0.5" />
              }
            </button>
            <button onClick={playNext}
              className="text-white/50 hover:text-white active:scale-90 transition-all">
              <SkipForward size={28} />
            </button>
            <button onClick={loadPlaylists}
              className={`transition-all active:scale-90 ${isDeezer ? 'text-white/15 cursor-not-allowed' : 'text-white/30 hover:text-white'}`}>
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
              onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
              className="flex-1" />
          </div>

          {(shareMsg || addedMsg) && (
            <p className="mt-4 text-xs text-white/50 bg-white/10 px-4 py-2 rounded-full">
              {shareMsg || addedMsg}
            </p>
          )}
        </div>
      )}

      {/* ── MOBILE mini bar ── */}
      <div className="fixed bottom-0 inset-x-0 z-50 md:hidden">
        <div className="h-[2px] bg-white/10 relative">
          <div className="absolute inset-y-0 left-0 bg-white transition-all duration-300"
            style={{ width: `${progress}%` }} />
        </div>
        <div className="bg-black/97 backdrop-blur-xl border-t border-white/[0.06] px-3 py-2"
          style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
          {audioEl}
          <div className="flex items-center gap-2">
            <div onClick={() => setExpanded(true)}
              className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden shrink-0 cursor-pointer active:opacity-70 relative">
              {currentSong.cover_url
                ? <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                : <Music2 size={14} className="m-auto mt-3 text-white/20" />
              }
              {isDeezer && (
                <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-purple-400" />
              )}
            </div>

            <div onClick={() => setExpanded(true)} className="flex-1 min-w-0 cursor-pointer">
              <p className="text-sm font-semibold truncate leading-tight">{currentSong.title}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-white/35 truncate">{currentSong.artist_name || 'Unknown'}</p>
                {isDeezer && amackUrl
                  ? <AudiomackBtn size="sm" />
                  : isDeezer && <DeezerBadge />
                }
              </div>
            </div>

            <button onClick={handleLike}
              className={`p-1.5 active:scale-90 transition-all ${
                isDeezer ? 'text-white/15' :
                liked    ? 'text-red-400'  : 'text-white/30'
              }`}>
              <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button onClick={playPrev} className="p-1.5 text-white/40 active:scale-90 transition-all">
              <SkipBack size={18} />
            </button>
            <button onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 active:scale-90 transition-transform">
              {isPlaying
                ? <Pause size={14} fill="black" />
                : <Play  size={14} fill="black" className="ml-0.5" />
              }
            </button>
            <button onClick={playNext} className="p-1.5 text-white/40 active:scale-90 transition-all">
              <SkipForward size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP player bar ── */}
      <div className="hidden md:block fixed bottom-0 inset-x-0 z-50">
        <div className="h-[1px] bg-white/10 relative">
          <div className="absolute inset-y-0 left-0 bg-white transition-all"
            style={{ width: `${progress}%` }} />
        </div>
        <div className="bg-black/97 backdrop-blur-xl border-t border-white/[0.06] px-4 py-3">
          {audioEl}
          <div className="flex items-center gap-4 max-w-5xl mx-auto">

            {/* Song info + like */}
            <div className="flex items-center gap-3 w-64 min-w-0">
              <div className="w-11 h-11 rounded-lg bg-white/10 overflow-hidden shrink-0 relative">
                {currentSong.cover_url
                  ? <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                  : <Music2 size={16} className="m-auto mt-3 text-white/20" />
                }
                {isDeezer && (
                  <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-purple-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{currentSong.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <p className="text-xs text-white/35 truncate">{currentSong.artist_name || 'Unknown'}</p>
                  {isDeezer && amackUrl
                    ? <AudiomackBtn size="sm" />
                    : isDeezer && <DeezerBadge />
                  }
                </div>
              </div>
              <button onClick={handleLike}
                className={`shrink-0 transition-all ${
                  isDeezer      ? 'text-white/15 cursor-not-allowed' :
                  liked         ? 'text-red-400 scale-110'           :
                                  'text-white/25 hover:text-white'
                }`}>
                <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Center controls + seek */}
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-5">
                <button onClick={cycleLoop} title={'Loop: ' + loop}
                  className={'transition-colors ' + loopColor}>
                  <LoopIcon size={16} />
                </button>
                <button onClick={playPrev} className="text-white/40 hover:text-white transition-colors">
                  <SkipBack size={18} />
                </button>
                <button onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
                  {isPlaying
                    ? <Pause size={15} fill="black" />
                    : <Play  size={15} fill="black" className="ml-0.5" />
                  }
                </button>
                <button onClick={playNext} className="text-white/40 hover:text-white transition-colors">
                  <SkipForward size={18} />
                </button>
                <button onClick={loadPlaylists}
                  className={`transition-colors ${isDeezer ? 'text-white/15 cursor-not-allowed' : 'text-white/25 hover:text-white'}`}>
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

            {/* Right: share + volume */}
            <div className="flex items-center gap-3 w-40 justify-end">
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
                onChange={e => { setVolume(parseFloat(e.target.value)); if (muted) setMuted(false); }}
                className="w-20" />
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
