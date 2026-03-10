import { create } from 'zustand';

export interface Song {
  id:          string;
  title:       string;
  artist_name: string;
  audio_url:   string;
  cover_url?:  string;
  genre?:      string;
  duration?:   number;
  source?:     string; // 'deezer' | 'cloudinary' | undefined
  deezer_id?:  number;
  album?:      string;
}

interface PlayerState {
  currentSong: Song | null;
  isPlaying:   boolean;
  queue:       Song[];
  volume:      number;
  playSong:    (song: Song, newQueue?: Song[]) => void;
  togglePlay:  () => void;
  setQueue:    (songs: Song[]) => void;
  setVolume:   (v: number) => void;
  playNext:    () => void;
  playPrev:    () => void;
  stop:        () => void;
}

const recordPlay = (song: Song) => {
  try {
    const token  = typeof window !== 'undefined' ? localStorage.getItem('vb_token') : null;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    if (song.source === 'deezer') {
      fetch(apiUrl + '/deezer/play', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          deezer_id:   song.deezer_id,
          title:       song.title,
          artist_name: song.artist_name,
          cover_url:   song.cover_url,
          audio_url:   song.audio_url,
          album:       song.album,
        }),
      }).catch(() => {});
    } else {
      fetch(apiUrl + '/songs/' + song.id + '/play', {
        method: 'POST',
        headers,
      }).catch(() => {});
    }
  } catch {}
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  isPlaying:   false,
  queue:       [],
  volume:      0.75,

  playSong: (song, newQueue) => {
    const current = get().currentSong;
    if (!current || current.id !== song.id) {
      recordPlay(song);
      // Preload next song silently (non-Deezer only)
      const q   = newQueue ?? get().queue;
      const idx = q.findIndex((s) => s.id === song.id);
      const next = q[idx + 1];
      if (next && next.source !== 'deezer' && typeof window !== 'undefined') {
        const preloadAudio   = new Audio();
        preloadAudio.preload = 'auto';
        preloadAudio.src     = next.audio_url;
      }
    }
    set({
      currentSong: song,
      isPlaying:   true,
      queue:       newQueue ?? get().queue,
    });
  },

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  // setQueue NEVER auto-plays — only updates the queue list
  setQueue: (songs) => set({ queue: songs }),

  setVolume: (volume) => set({ volume }),

  playNext: () => {
    const { queue, currentSong } = get();
    if (!queue.length) return;
    const idx  = queue.findIndex((s) => s.id === currentSong?.id);
    const next = queue[idx + 1];
    if (next) {
      recordPlay(next);
      set({ currentSong: next, isPlaying: true });
    }
  },

  playPrev: () => {
    const { queue, currentSong } = get();
    if (!queue.length) return;
    const idx  = queue.findIndex((s) => s.id === currentSong?.id);
    const prev = queue[idx - 1];
    if (prev) {
      recordPlay(prev);
      set({ currentSong: prev, isPlaying: true });
    }
  },

  stop: () => set({ currentSong: null, isPlaying: false }),
}));
