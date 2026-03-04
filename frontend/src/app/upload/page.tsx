'use client';
import { useState, useRef } from 'react';
import { Upload, Music2, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

const GENRES = ['Pop','Hip-Hop','R&B','Afrobeats','Bongo Flava','Gospel','Jazz','Rock','Electronic','Classical','Reggae','Country','Other'];

export default function UploadPage() {
  const [title,      setTitle]      = useState('');
  const [artistName, setArtistName] = useState('');
  const [genre,      setGenre]      = useState('');
  const [duration,   setDuration]   = useState('');
  const [file,       setFile]       = useState<File | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('audio/')) {
      setError('Please select an audio file (MP3, WAV, etc.)');
      return;
    }
    setFile(f);
    setError('');
    // Auto-fill duration
    const audio = new Audio(URL.createObjectURL(f));
    audio.onloadedmetadata = () => setDuration(String(Math.round(audio.duration)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError('Please select an audio file');
    if (!title.trim()) return setError('Song title is required');

    setError('');
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('title', title.trim());
    formData.append('artistName', artistName.trim());
    formData.append('genre', genre);
    formData.append('duration', duration);

    try {
      await api.post('/songs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round(((e.loaded || 0) * 100) / (e.total || 1));
          setProgress(pct);
        },
      });

      setSuccess(true);
      setTitle(''); setArtistName(''); setGenre(''); setDuration(''); setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-3xl font-black mb-2">Upload Song</h1>
      <p className="text-white/40 text-sm mb-8">
        Share your music with the world. Supports MP3, WAV, OGG, M4A.
      </p>

      {success && (
        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-4 rounded-xl mb-6">
          <CheckCircle size={18} />
          <div>
            <p className="font-semibold text-sm">Upload successful!</p>
            <p className="text-xs opacity-70">Your song is now available to stream.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File drop area */}
        <div
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
            file ? 'border-white/30 bg-white/[0.04]' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <input ref={inputRef} type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
          {file ? (
            <div>
              <Music2 size={32} className="mx-auto mb-2 text-white/60" />
              <p className="font-semibold text-sm">{file.name}</p>
              <p className="text-xs text-white/40 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div>
              <Upload size={32} className="mx-auto mb-2 text-white/20" />
              <p className="font-medium text-sm">Click to select audio file</p>
              <p className="text-xs text-white/30 mt-1">MP3, WAV, OGG, M4A — max 100MB</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-medium">Song Title *</label>
          <input type="text" placeholder="My Amazing Song" value={title}
            onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-medium">Artist Name</label>
          <input type="text" placeholder="Artist or band name" value={artistName}
            onChange={(e) => setArtistName(e.target.value)} />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-medium">Genre</label>
          <select value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="">Select genre (optional)</option>
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {uploading && (
          <div>
            <div className="flex justify-between text-xs text-white/40 mb-1.5">
              <span>Uploading to cloud...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <button type="submit" disabled={uploading || !file} className="btn-primary">
          {uploading ? `Uploading ${progress}%...` : 'Upload Song'}
        </button>
      </form>
    </div>
  );
}
