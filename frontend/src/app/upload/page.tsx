'use client';
import { useState, useRef } from 'react';
import { Upload, Music2, CheckCircle, X, Plus } from 'lucide-react';
import api from '@/lib/api';

const GENRES = ['Pop','Hip-Hop','R&B','Afrobeats','Bongo Flava','Gospel','Jazz',
                'Rock','Electronic','Classical','Reggae','Country','Other'];

interface SongEntry {
  id:         string;
  file:       File;
  title:      string;
  artistName: string;
  genre:      string;
  duration:   string;
  status:     'pending' | 'uploading' | 'done' | 'error';
  progress:   number;
  error:      string;
}

export default function UploadPage() {
  const [songs,   setSongs]   = useState<SongEntry[]>([]);
  const [allDone, setAllDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newEntries: SongEntry[] = Array.from(files)
      .filter(f => f.type.startsWith('audio/'))
      .map(f => ({
        id:         Math.random().toString(36).slice(2),
        file:       f,
        title:      f.name.replace(/\.[^.]+$/, ''),
        artistName: '',
        genre:      '',
        duration:   '',
        status:     'pending',
        progress:   0,
        error:      '',
      }));
    setSongs(prev => [...prev, ...newEntries]);
  };

  const update = (id: string, patch: Partial<SongEntry>) =>
    setSongs(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const remove = (id: string) =>
    setSongs(prev => prev.filter(s => s.id !== id));

  const uploadOne = async (song: SongEntry) => {
    update(song.id, { status: 'uploading', progress: 0, error: '' });
    const fd = new FormData();
    fd.append('audio',      song.file);
    fd.append('title',      song.title.trim() || song.file.name);
    fd.append('artistName', song.artistName.trim());
    fd.append('genre',      song.genre);
    fd.append('duration',   song.duration);
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
        error: err.response?.data?.error || 'Upload failed. Try again.',
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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-black mb-2">Upload Songs</h1>
      <p className="text-white/40 text-sm mb-6">
        Upload multiple songs at once. Supports MP3, WAV, OGG, M4A.
      </p>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed border-white/15 hover:border-white/30 rounded-2xl p-8 text-center cursor-pointer transition-colors mb-6"
      >
        <input ref={inputRef} type="file" accept="audio/*" multiple
          onChange={(e) => handleFiles(e.target.files)} className="hidden" />
        <Upload size={32} className="mx-auto mb-2 text-white/20" />
        <p className="font-semibold text-sm text-white/60">
          Click or drag & drop audio files here
        </p>
        <p className="text-xs text-white/25 mt-1">
          You can select multiple files at once
        </p>
      </div>

      {/* Song list */}
      {songs.length > 0 && (
        <div className="space-y-3 mb-6">
          {songs.map((song) => (
            <div key={song.id}
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Music2 size={18} className="text-white/30 mt-1 shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <input type="text" placeholder="Song title"
                    value={song.title}
                    onChange={(e) => update(song.id, { title: e.target.value })}
                    disabled={song.status === 'uploading' || song.status === 'done'}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Artist name"
                      value={song.artistName}
                      onChange={(e) => update(song.id, { artistName: e.target.value })}
                      disabled={song.status === 'uploading' || song.status === 'done'}
                    />
                    <select value={song.genre}
                      onChange={(e) => update(song.id, { genre: e.target.value })}
                      disabled={song.status === 'uploading' || song.status === 'done'}>
                      <option value="">Genre</option>
                      {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  {/* Progress bar */}
                  {song.status === 'uploading' && (
                    <div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all"
                          style={{ width: `${song.progress}%` }} />
                      </div>
                      <p className="text-xs text-white/30 mt-1">Uploading {song.progress}%...</p>
                    </div>
                  )}

                  {song.status === 'done' && (
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle size={13} /> Uploaded successfully
                    </p>
                  )}

                  {song.status === 'error' && (
                    <p className="text-xs text-red-400">{song.error}</p>
                  )}
                </div>

                {song.status !== 'uploading' && song.status !== 'done' && (
                  <button onClick={() => remove(song.id)}
                    className="text-white/20 hover:text-red-400 transition-colors shrink-0">
                    <X size={16} />
                  </button>
                )}
                {song.status === 'done' && (
                  <CheckCircle size={18} className="text-green-400 shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <button onClick={() => inputRef.current?.click()}
          className="btn-ghost text-sm flex items-center gap-2" style={{ width: 'auto', padding: '11px 20px' }}>
          <Plus size={16} /> Add More
        </button>
        {pendingCount > 0 && (
          <button onClick={uploadAll} className="btn-primary" style={{ flex: 1 }}>
            Upload {pendingCount} Song{pendingCount !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {allDone && songs.every(s => s.status === 'done') && (
        <div className="mt-4 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle size={16} /> All songs uploaded! Go to Home to see them.
        </div>
      )}
    </div>
  );
}
