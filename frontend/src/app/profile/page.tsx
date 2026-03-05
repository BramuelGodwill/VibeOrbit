'use client';
import { useEffect, useState, useRef } from 'react';
import { User, Crown, History, Music2, Camera } from 'lucide-react';
import api               from '@/lib/api';
import { useAuthStore }  from '@/store/authStore';
import { usePlayerStore } from '@/store/playerStore';

export default function ProfilePage() {
  const { user, setUser }   = useAuthStore();
  const { playSong }        = usePlayerStore();
  const [history,   setHistory]   = useState<any[]>([]);
  const [phone,     setPhone]     = useState('');
  const [paying,    setPaying]    = useState(false);
  const [payMsg,    setPayMsg]    = useState('');
  const [payError,  setPayError]  = useState('');
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, historyRes] = await Promise.all([
          api.get('/users/me'),
          api.get('/users/history'),
        ]);
        setUser(profileRes.data);
        setHistory(historyRes.data);
      } catch { }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await api.post('/users/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser({ ...(user as any), avatar_url: data.avatar_url });
    } catch {
      alert('Avatar upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError(''); setPayMsg('');
    if (!phone || phone.length < 9) return setPayError('Enter a valid phone number');
    setPaying(true);
    try {
      const { data } = await api.post('/pay/mpesa', { phone, amount: 500 });
      setPayMsg(data.message);
      setPhone('');
    } catch (err: any) {
      setPayError(err.response?.data?.error || 'Payment failed. Try again.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="spinner" /></div>;

  const joinedDate = (user as any)?.created_at
    ? new Date((user as any).created_at).toLocaleDateString() : '—';

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-black mb-6">Profile</h1>

      {/* Avatar + user info */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 mb-6 flex items-center gap-5">
        {/* Avatar with upload button */}
        <div className="relative shrink-0">
          <div className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-white/10 flex items-center justify-center overflow-hidden border-2 border-white/10">
            {(user as any)?.avatar_url
              ? <img src={(user as any).avatar_url} alt="avatar"
                  className="w-full h-full object-cover" />
              : <User size={30} className="text-white/30" />
            }
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
          >
            {uploading
              ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
              : <Camera size={13} className="text-black" />
            }
          </button>
          <input ref={fileRef} type="file" accept="image/*"
            onChange={handleAvatarChange} className="hidden" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold">{user?.username}</h2>
            {user?.is_premium && (
              <span className="flex items-center gap-1 bg-white text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                <Crown size={9} /> Premium
              </span>
            )}
          </div>
          <p className="text-white/40 text-sm truncate">{user?.email}</p>
          <p className="text-white/20 text-xs mt-1">Joined {joinedDate}</p>
          <p className="text-white/20 text-[10px] mt-0.5">
            Tap the camera icon to change your photo
          </p>
        </div>
      </div>

      {/* Premium */}
      {!user?.is_premium && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Crown size={16} />
            <h3 className="font-bold">Go Premium</h3>
          </div>
          <p className="text-white/40 text-sm mb-4">KES 500/month — Unlimited streaming</p>
          <form onSubmit={handlePay} className="flex gap-2 flex-col sm:flex-row">
            <input type="tel" placeholder="Phone e.g. 0793776178"
              value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <button type="submit" disabled={paying}
              className="btn-primary sm:w-auto sm:px-5 whitespace-nowrap">
              {paying ? 'Sending...' : 'Pay KES 500'}
            </button>
          </form>
          {payMsg   && <p className="mt-3 text-sm text-green-400 bg-green-500/10 px-4 py-3 rounded-xl">{payMsg}</p>}
          {payError && <p className="mt-3 text-sm text-red-400 bg-red-500/10 px-4 py-3 rounded-xl">{payError}</p>}
        </div>
      )}

      {/* Listening history */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <History size={16} className="text-white/60" />
          <h3 className="font-bold">Recently Played</h3>
        </div>
        {history.length === 0 ? (
          <div className="text-center py-10 text-white/20">
            <Music2 size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No listening history yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {history.map((song, i) => (
              <div key={`${song.id}-${i}`} onClick={() => playSong(song)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.05] cursor-pointer transition-colors">
                <div className="w-9 h-9 rounded-lg bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                  {song.cover_url
                    ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                    : <Music2 size={14} className="text-white/30" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{song.title}</p>
                  <p className="text-xs text-white/40 truncate">{song.artist_name}</p>
                </div>
                <p className="text-xs text-white/20 shrink-0 hidden sm:block">
                  {song.listened_at ? new Date(song.listened_at).toLocaleDateString() : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer credit */}
      <div className="border-t border-white/[0.06] pt-6 text-center">
        <p className="text-xs text-white/20">
          Made with ❤️ by <span className="text-white/40 font-semibold">Bramuel Godwill</span>
        </p>
        <p className="text-[10px] text-white/10 mt-1">VibeOrbit © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
