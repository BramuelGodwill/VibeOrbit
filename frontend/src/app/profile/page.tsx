'use client';
import { useEffect, useState, useRef } from 'react';
import { User, Crown, History, Music2, Camera, LogOut, Edit2, Check, X } from 'lucide-react';
import api                from '@/lib/api';
import { useAuthStore }   from '@/store/authStore';
import { usePlayerStore } from '@/store/playerStore';
import { useRouter }      from 'next/navigation';

export default function ProfilePage() {
  const { user, setUser, logout }   = useAuthStore();
  const { playSong }                = usePlayerStore();
  const router                      = useRouter();
  const [history,    setHistory]    = useState<any[]>([]);
  const [phone,      setPhone]      = useState('');
  const [paying,     setPaying]     = useState(false);
  const [payMsg,     setPayMsg]     = useState('');
  const [payError,   setPayError]   = useState('');
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [editName,   setEditName]   = useState(false);
  const [newName,    setNewName]    = useState('');
  const [savingName, setSavingName] = useState(false);
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
        setNewName(profileRes.data.username || '');
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  // ── Avatar upload ─────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await api.post('/users/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(Object.assign({}, user, { avatar_url: data.avatar_url }));
    } catch {
      alert('Avatar upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── Save username ─────────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim() === user?.username) {
      setEditName(false);
      return;
    }
    setSavingName(true);
    try {
      const { data } = await api.patch('/users/me', { username: newName.trim() });
      setUser(Object.assign({}, user, { username: data.username }));
      setEditName(false);
    } catch {
      alert('Failed to update username.');
    } finally {
      setSavingName(false);
    }
  };

  // ── M-Pesa payment ────────────────────────────────────────────────────
  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError(''); setPayMsg('');
    const cleaned = phone.trim().replace(/\s+/g, '');
    if (!cleaned || cleaned.length < 9) {
      return setPayError('Enter a valid Safaricom number e.g. 0712345678');
    }
    setPaying(true);
    try {
      const { data } = await api.post('/pay/mpesa', {
        phone:     cleaned,
        amount:    10,
        firstName: user?.username || 'User',
        email:     user?.email    || 'user@vibeorbit.com',
      });
      setPayMsg(data.message || 'Check your phone for the M-Pesa prompt!');
      setPhone('');

      // Poll every 5s for up to 2 minutes to detect payment completion
      if (data.invoiceId) {
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const check = await api.get('/pay/status/' + data.invoiceId);
            if (check.data.status === 'completed') {
              clearInterval(interval);
              setPayMsg('🎉 Payment successful! You are now Premium!');
              const me = await api.get('/users/me');
              setUser(me.data);
            }
          } catch {}
          if (attempts >= 24) clearInterval(interval);
        }, 5000);
      }
    } catch (err: any) {
      setPayError(
        err.response?.data?.error ||
        'Payment failed. Make sure you are using a Safaricom number.'
      );
    } finally {
      setPaying(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) return (
    <div className="flex justify-center pt-20"><div className="spinner" /></div>
  );

  const joinedDate = (user as any)?.created_at
    ? new Date((user as any).created_at).toLocaleDateString('en-KE', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';

  return (
    <div className="max-w-2xl mx-auto pb-16">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-black">Profile</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-red-400 active:scale-95 transition-all px-3 py-1.5 rounded-xl hover:bg-red-500/10"
        >
          <LogOut size={14} /> Log out
        </button>
      </div>

      {/* ── Avatar + info ── */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-4">

          {/* Avatar with camera */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border-2 border-white/10">
              {(user as any)?.avatar_url
                ? <img src={(user as any).avatar_url} alt="avatar" className="w-full h-full object-cover" />
                : <User size={32} className="text-white/30" />
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            >
              {uploading
                ? <div className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                : <Camera size={14} className="text-black" />
              }
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* Name + email */}
          <div className="min-w-0 flex-1">
            {/* Editable username */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {editName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditName(false); }}
                    autoFocus
                    className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-sm font-bold outline-none"
                    style={{ maxWidth: 160 }}
                  />
                  <button onClick={handleSaveName} disabled={savingName}
                    className="text-green-400 hover:text-green-300 active:scale-90 transition-all">
                    {savingName
                      ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      : <Check size={16} />
                    }
                  </button>
                  <button onClick={() => { setEditName(false); setNewName(user?.username || ''); }}
                    className="text-white/30 hover:text-white active:scale-90 transition-all">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold">{user?.username}</h2>
                  <button onClick={() => setEditName(true)}
                    className="text-white/20 hover:text-white active:scale-90 transition-all">
                    <Edit2 size={13} />
                  </button>
                  {user?.is_premium && (
                    <span className="flex items-center gap-1 bg-yellow-400/20 text-yellow-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                      <Crown size={9} /> Premium
                    </span>
                  )}
                </>
              )}
            </div>
            <p className="text-white/40 text-sm truncate">{user?.email}</p>
            <p className="text-white/20 text-xs mt-0.5">Joined {joinedDate}</p>
          </div>
        </div>

        <p className="text-center text-[11px] text-white/15 mt-3">
          Tap the camera icon to change your photo • Tap ✏️ to edit your name
        </p>
      </div>

      {/* ── Premium banner or upgrade ── */}
      {user?.is_premium ? (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <Crown size={22} className="text-yellow-400 shrink-0" />
          <div>
            <p className="font-bold text-sm">You are a Premium member!</p>
            <p className="text-white/40 text-xs mt-0.5">Enjoy unlimited streaming on VibeOrbit</p>
          </div>
        </div>
      ) : (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Crown size={16} className="text-yellow-400" />
            <h3 className="font-bold">Go Premium</h3>
          </div>
          <p className="text-white/40 text-sm mb-4">
            KES 10/week — Unlimited streaming, no interruptions
          </p>

          <form onSubmit={handlePay} className="space-y-3">
            <div>
              <label className="block text-xs text-white/40 mb-1.5 font-medium">
                Safaricom M-Pesa Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 0712345678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                inputMode="numeric"
                disabled={paying}
              />
            </div>
            <button type="submit" disabled={paying} className="btn-primary">
              {paying ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Sending M-Pesa prompt...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Crown size={15} /> Pay KES 10 via M-Pesa
                </span>
              )}
            </button>
          </form>

          {payMsg && (
            <div className="mt-3 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm">
              ✅ {payMsg}
            </div>
          )}
          {payError && (
            <div className="mt-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
              ❌ {payError}
            </div>
          )}

          <p className="text-white/15 text-xs mt-3 text-center">
            You will receive an M-Pesa prompt. Enter your PIN to complete.
          </p>
        </div>
      )}

      {/* ── Recently played ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <History size={16} className="text-white/40" />
          <h3 className="font-bold">Recently Played</h3>
          {history.length > 0 && (
            <span className="text-xs text-white/20 ml-auto">{history.length} songs</span>
          )}
        </div>
        {history.length === 0 ? (
          <div className="text-center py-10 text-white/20">
            <Music2 size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No listening history yet</p>
            <p className="text-xs mt-1 text-white/10">Play some songs to see them here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {history.map((song, i) => (
              <div
                key={song.id + '-' + i}
                onClick={() => playSong(song)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.05] active:bg-white/10 cursor-pointer touch-manipulation transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                  {song.cover_url
                    ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                    : <Music2 size={14} className="text-white/30" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{song.title}</p>
                  <p className="text-xs text-white/40 truncate">{song.artist_name || 'Unknown'}</p>
                </div>
                <p className="text-xs text-white/20 shrink-0 hidden sm:block">
                  {song.listened_at ? new Date(song.listened_at).toLocaleDateString() : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-white/[0.06] pt-6 text-center">
        <p className="text-xs text-white/20">
          Made by <span className="text-white/40 font-semibold">Bramuel Godwill</span>
        </p>
        <p className="text-[10px] text-white/10 mt-1">
          VibeOrbit © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
