'use client';
import { useEffect, useState } from 'react';
import Link       from 'next/link';
import { Plus, Trash2, ListMusic } from 'lucide-react';
import api         from '@/lib/api';

export default function LibraryPage() {
  const [playlists,   setPlaylists]   = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [creating,    setCreating]    = useState(false);
  const [newName,     setNewName]     = useState('');
  const [showForm,    setShowForm]    = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/playlists/my');
      setPlaylists(data);
    } catch { console.error('Failed to load playlists'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post('/playlists', { name: newName });
      setNewName('');
      setShowForm(false);
      load();
    } catch { alert('Failed to create playlist'); }
    finally { setCreating(false); }
  };

  const deletePlaylist = async (id: string) => {
    if (!confirm('Delete this playlist?')) return;
    try {
      await api.delete(`/playlists/${id}`);
      setPlaylists(playlists.filter((p) => p.id !== id));
    } catch { alert('Failed to delete'); }
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="spinner" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Your Library</h1>
          <p className="text-white/40 text-sm mt-1">{playlists.length} playlist{playlists.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="btn-ghost px-4 py-2 text-sm flex items-center gap-2" style={{ width: 'auto' }}>
          <Plus size={16} />New Playlist
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={createPlaylist}
          className="bg-white/[0.04] border border-white/10 rounded-xl p-5 mb-8 flex gap-3">
          <input type="text" placeholder="Playlist name..." value={newName}
            onChange={(e) => setNewName(e.target.value)} autoFocus required />
          <button type="submit" disabled={creating}
            className="btn-primary text-sm px-5 shrink-0" style={{ width: 'auto' }}>
            {creating ? '...' : 'Create'}
          </button>
          <button type="button" onClick={() => setShowForm(false)}
            className="btn-ghost text-sm px-4 shrink-0" style={{ width: 'auto' }}>
            Cancel
          </button>
        </form>
      )}

      {/* Playlists grid */}
      {playlists.length === 0 ? (
        <div className="text-center py-24 text-white/20">
          <ListMusic size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-semibold">No playlists yet</p>
          <p className="text-sm mt-1">Create your first playlist above</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {playlists.map((p) => (
            <div key={p.id}
              className="group bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] rounded-xl p-4 transition-all relative">
              <Link href={`/playlist/${p.id}`}>
                <div className="w-full aspect-square bg-white/10 rounded-lg flex items-center justify-center mb-3">
                  <ListMusic size={28} className="text-white/20" />
                </div>
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-xs text-white/40 mt-0.5">
                  {p.song_count || 0} song{p.song_count !== '1' ? 's' : ''}
                </p>
              </Link>
              <button onClick={() => deletePlaylist(p.id)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
