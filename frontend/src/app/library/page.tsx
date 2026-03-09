'use client';
import { useEffect, useState } from 'react';
import Link       from 'next/link';
import { Plus, Trash2, ListMusic, Music2, X, Check } from 'lucide-react';
import api         from '@/lib/api';

export default function LibraryPage() {
  const [playlists,  setPlaylists]  = useState<any[]>([]);
  const [allSongs,   setAllSongs]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [creating,   setCreating]   = useState(false);
  const [newName,    setNewName]    = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [addingTo,   setAddingTo]   = useState<string | null>(null); // playlist id being added to
  const [added,      setAdded]      = useState<string[]>([]); // song ids already added

  const load = async () => {
    try {
      const [plRes, songRes] = await Promise.all([
        api.get('/playlists/my'),
        api.get('/songs'),
      ]);
      setPlaylists(plRes.data);
      setAllSongs(Array.isArray(songRes.data) ? songRes.data : (songRes.data.songs || []));
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post('/playlists', { name: newName });
      setNewName(''); setShowForm(false);
      load();
    } catch { alert('Failed to create playlist'); }
    finally { setCreating(false); }
  };

  const deletePlaylist = async (id: string) => {
    if (!confirm('Delete this playlist?')) return;
    try {
      await api.delete(`/playlists/${id}`);
      setPlaylists(playlists.filter(p => p.id !== id));
    } catch { alert('Failed to delete'); }
  };

  const addSongToPlaylist = async (playlistId: string, songId: string) => {
    try {
      await api.post('/playlists/add-song', { playlistId, songId });
      setAdded(prev => [...prev, songId]);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add song');
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="spinner" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black">Your Library</h1>
          <p className="text-white/40 text-sm mt-0.5">{playlists.length} playlist{playlists.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus size={16} /> New
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={createPlaylist}
          className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-6 flex gap-3">
          <input type="text" placeholder="Playlist name..." value={newName}
            onChange={(e) => setNewName(e.target.value)} autoFocus required />
          <button type="submit" disabled={creating}
            className="btn-primary text-sm px-4 shrink-0" style={{ width: 'auto' }}>
            {creating ? '...' : 'Create'}
          </button>
          <button type="button" onClick={() => setShowForm(false)}
            className="btn-ghost text-sm px-3 shrink-0" style={{ width: 'auto' }}>
            <X size={16} />
          </button>
        </form>
      )}

      {/* Add songs panel */}
      {addingTo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-bold">Add songs to playlist</h3>
              <button onClick={() => { setAddingTo(null); setAdded([]); }}
                className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-1">
              {allSongs.map(song => {
                const done = added.includes(song.id);
                return (
                  <div key={song.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] cursor-pointer transition-colors"
                    onClick={() => !done && addSongToPlaylist(addingTo, song.id)}>
                    <div className="w-9 h-9 rounded-lg bg-white/10 shrink-0 flex items-center justify-center overflow-hidden">
                      {song.cover_url
                        ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                        : <Music2 size={14} className="text-white/30" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{song.title}</p>
                      <p className="text-xs text-white/40 truncate">{song.artist_name}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      done ? 'bg-green-500' : 'bg-white/10 hover:bg-white/20'
                    }`}>
                      {done ? <Check size={12} className="text-black" /> : <Plus size={12} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Playlists grid */}
      {playlists.length === 0 ? (
        <div className="text-center py-20 text-white/20">
          <ListMusic size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No playlists yet</p>
          <p className="text-sm mt-1">Create your first playlist above</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {playlists.map((p) => (
            <div key={p.id}
              className="group bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] rounded-xl p-3 transition-all relative">
              <Link href={`/playlist/${p.id}`}>
                <div className="w-full aspect-square bg-white/10 rounded-lg flex items-center justify-center mb-3">
                  <ListMusic size={24} className="text-white/20" />
                </div>
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-xs text-white/40 mt-0.5">
                  {p.song_count || 0} song{p.song_count !== '1' ? 's' : ''}
                </p>
              </Link>

              {/* Add songs button */}
              <button
                onClick={() => { setAddingTo(p.id); setAdded([]); }}
                className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg py-1.5 transition-colors">
                <Plus size={12} /> Add songs
              </button>

              <button onClick={() => deletePlaylist(p.id)}
                className="absolute top-2 right-2 p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
