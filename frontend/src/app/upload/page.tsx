'use client';
import { useState, useRef } from 'react';
import { Upload, Music2, CheckCircle, X, Plus, Image } from 'lucide-react';
import api from '@/lib/api';

const GENRES = [
  'Pop','Hip-Hop','R&B','Afrobeats','Bongo Flava','Gospel','Jazz',
  'Rock','Electronic','Classical','Reggae','Country','Podcast','Other'
];

interface SongEntry {
  id:         string;
  file:       File;
  coverFile:  File | null;
  coverUrl:   string;
  title:      string;
  artistName: string;
  genre:      string;
  duration:   string;
  status:     'pending' | 'uploading' | 'done' | 'error';
  progress:   number;
  error:      string;
}

// Convert file to base64 string
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function UploadPage() {
  const [songs,   setSongs]   = useState<SongEntry[]>([]);
  const [allDone, setAllDone] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newEntries: SongEntry[] = Array.from(files)
      .filter(f => f.type.startsWith('audio/'))
      .map(f => {
        // Auto-detect duration
        const audio = new Audio(URL.createObjectURL(f));
        audio.onloadedmetadata = () => {
          const dur = String(Math.round(audio.duration));
          setSongs(prev => prev.map(s =>
            s.file === f ? { ...s, duration: dur } : s
          ));
        };
        return {
          id:         Math.random().toString(36).slice(2),
          file:       f,
          coverFile:  null,
          coverUrl:   '',
          title:      f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          artistName: '',
          genre:      '',
          duration:   '',
          status:     'pending',
          progress:   0,
          error:      '',
        };
      });
    setSongs(prev => [...prev, ...newEntries]);
  };

  const update = (id: string, patch: Partial<SongEntry>) =>
    setSongs(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const remove = (id: string) =>
    setSongs(prev => prev.filter(s => s.id !== id));

  const handleCoverChange = (id: string, file: File | null) => {
    if (!file) return;
    // Show preview immediately
    const url = URL.createObjectURL(file);
    update(id, { coverFile: file, coverUrl: url });
  };

  const uploadOne = async (song: SongEntry) => {
    update(song.id, { status: 'uploading', progress: 0, error: '' });

    const fd = new FormData();
    fd.append('audio',      song.file);
    fd.append('title',      song.title.trim() || song.file.name);
    fd.append('artistName', song.artistName.trim());
    fd.append('genre',      song.genre);
    fd.append('duration',   song.duration);

    // Convert cover image to base64 so backend can upload it to Cloudinary
    if (song.coverFile) {
      try {
        const base64 = await toBase64(song.coverFile);
        fd.append('cover_base64', base64);
      } catch {
        console.error('Failed to convert cover to base64');
      }
    }

    try {
      await api.post('/songs/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round(((e.loaded || 0) * 100) / (e.total || 1));
          update(song.id, { progress: pct });
        },
      });
      update(song.id, { status: 'done', progress: 100 });
    } catch (err: any) {
      update(song.id, {
        status: 'error',
        error:  err.response?.data?.error || 'Upload failed. Try again.',
      });
    }
  };

  const uploadAll = async () => {
    const pending = songs.filter(s => s.status === 'pending' || s.status === 'error');
    if (!pending.length) return;
    setAllDone(false);
    for (const s of pending) await uploadOne(s);
    setAllDone(true);
  };

  const pendingCount = songs.filter(s => s.status === 'pending' || s.status === 'error').length;
  const doneCount    = songs.filter(s => s.status === 'done').length;

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <h1 className="text-2xl md:text-3xl font-black mb-1">Upload</h1>
      <p className="text-white/40 text-sm mb-6">
        Songs, podcasts, mixes — upload multiple at once.
      </p>

      {/* ── Drop zone ── */}
      <div
        onClick={() => audioInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed border-white/15 hover:border-white/30 rounded-2xl p-10 text-center cursor-pointer transition-all hover:bg-white/[0.02] mb-6"
      >
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <Upload size={36} className="mx-auto mb-3 text-white/20" />
        <p className="font-semibold text-white/60 mb-1">
          Click or drag & drop audio files here
        </p>
        <p className="text-xs text-white/25">
          MP3, WAV, OGG, M4A — select multiple at once
        </p>
      </div>

      {/* ── Song entries ── */}
      {songs.length > 0 && (
        <div className="space-y-4 mb-6">
          {songs.map((song) => {
            const isDone      = song.status === 'done';
            const isUploading = song.status === 'uploading';

            return (
              <div key={song.id}
                className={`rounded-2xl border p-4 transition-all ${
                  isDone
                    ? 'bg-green-500/[0.04] border-green-500/20'
                    : song.status === 'error'
                    ? 'bg-red-500/[0.04] border-red-500/20'
                    : 'bg-white/[0.04] border-white/[0.08]'
                }`}>
                <div className="flex gap-4">

                  {/* ── Cover image picker ── */}
                  <div className="shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id={`cover-${song.id}`}
                      onChange={(e) => handleCoverChange(song.id, e.target.files?.[0] || null)}
                      disabled={isDone || isUploading}
                    />
                    <label
                      htmlFor={`cover-${song.id}`}
                      title="Click to add cover image"
                      className={`w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center border border-white/10 transition-all ${
                        isDone || isUploading
                          ? 'cursor-default opacity-70'
                          : 'cursor-pointer hover:border-white/30 hover:bg-white/5'
                      }`}
                    >
                      {song.coverUrl ? (
                        <img
                          src={song.coverUrl}
                          alt="cover"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="bg-white/[0.06] w-full h-full flex flex-col items-center justify-center gap-1">
                          <Image size={16} className="text-white/20" />
                          <span className="text-[9px] text-white/20 text-center leading-tight px-1">
                            Add cover
                          </span>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* ── Input fields ── */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      type="text"
                      placeholder="Song / Podcast title"
                      value={song.title}
                      onChange={(e) => update(song.id, { title: e.target.value })}
                      disabled={isDone || isUploading}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Artist / Host name"
                        value={song.artistName}
                        onChange={(e) => update(song.id, { artistName: e.target.value })}
                        disabled={isDone || isUploading}
                      />
                      <select
                        value={song.genre}
                        onChange={(e) => update(song.id, { genre: e.target.value })}
                        disabled={isDone || isUploading}
                      >
                        <option value="">Genre / Type</option>
                        {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>

                    {/* File info */}
                    <p className="text-[11px] text-white/20 truncate">
                      📁 {song.file.name} — {(song.file.size / 1024 / 1024).toFixed(1)} MB
                    </p>

                    {/* Cover selected confirmation */}
                    {song.coverFile && !isDone && !isUploading && (
                      <p className="text-[11px] text-white/40 flex items-center gap-1">
                        🖼️ Cover image selected — will upload with song
                      </p>
                    )}

                    {/* Progress bar */}
                    {isUploading && (
                      <div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full transition-all duration-300"
                            style={{ width: `${song.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-white/30 mt-1">
                          Uploading to cloud... {song.progress}%
                        </p>
                      </div>
                    )}

                    {/* Success */}
                    {isDone && (
                      <p className="text-xs text-green-400 flex items-center gap-1.5 font-medium">
                        <CheckCircle size={13} />
                        Uploaded! Cover image saved.
                      </p>
                    )}

                    {/* Error */}
                    {song.status === 'error' && (
                      <p className="text-xs text-red-400">{song.error}</p>
                    )}
                  </div>

                  {/* Remove / Done icon */}
                  {!isUploading && !isDone && (
                    <button
                      onClick={() => remove(song.id)}
                      className="text-white/20 hover:text-red-400 transition-colors shrink-0 self-start"
                    >
                      <X size={16} />
                    </button>
                  )}
                  {isDone && (
                    <CheckCircle size={18} className="text-green-400 shrink-0 self-start mt-0.5" />
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom buttons ── */}
      {songs.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => audioInputRef.current?.click()}
            className="btn-ghost text-sm flex items-center gap-2"
            style={{ width: 'auto', padding: '11px 20px' }}
          >
            <Plus size={16} /> Add More Files
          </button>

          {pendingCount > 0 && (
            <button onClick={uploadAll} className="btn-primary" style={{ flex: 1 }}>
              <Upload size={16} />
              Upload {pendingCount} File{pendingCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* ── All done banner ── */}
      {allDone && doneCount > 0 && songs.every(s => s.status === 'done') && (
        <div className="mt-5 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-4 rounded-2xl text-sm flex items-center gap-3">
          <CheckCircle size={20} />
          <div>
            <p className="font-bold">
              All {doneCount} file{doneCount !== 1 ? 's' : ''} uploaded!
            </p>
            <p className="text-green-400/60 text-xs mt-0.5">
              Go to Home to see them with their cover images.
            </p>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {songs.length === 0 && (
        <div className="text-center py-6 text-white/15">
          <Music2 size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No files selected yet</p>
        </div>
      )}
    </div>
  );
}
