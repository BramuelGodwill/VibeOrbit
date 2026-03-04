import { create } from 'zustand';

export interface Song {
  id: string;
  title: string;
  artist_name: string;
  audio_url: string;
  cover_url?: string;
  genre?: string;
  duration?: number;
}

interface PlayerState {
  currentSong: Song | null;
  isPlaying:   boolean;
  queue:        Song[];
  volume:       number;
  playSong:    (song: Song, newQueue?: Song[]) => void;
  togglePlay:  () => void;
  setQueue:    (songs: Song[]) => void;
  setVolume:   (v: number) => void;
  playNext:    () => void;
  playPrev:    () => void;
  stop:        () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  isPlaying:   false,
  queue:        [],
  volume:       0.75,

  playSong: (song, newQueue) => {
    set({
      currentSong: song,
      isPlaying:   true,
      queue:        newQueue ?? get().queue,
    });
  },

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  setQueue: (queue) => set({ queue }),

  setVolume: (volume) => set({ volume }),

  playNext: () => {
    const { queue, currentSong } = get();
    if (!queue.length) return;
    const idx = queue.findIndex((s) => s.id === currentSong?.id);
    const next = queue[idx + 1];
    if (next) set({ currentSong: next, isPlaying: true });
  },

  playPrev: () => {
    const { queue, currentSong } = get();
    if (!queue.length) return;
    const idx = queue.findIndex((s) => s.id === currentSong?.id);
    const prev = queue[idx - 1];
    if (prev) set({ currentSong: prev, isPlaying: true });
  },

  stop: () => set({ currentSong: null, isPlaying: false }),
}));
