'use client';
import { useState }     from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link              from 'next/link';
import api               from '@/lib/api';
import { Music2 }        from 'lucide-react';

export default function ResetPasswordPage() {
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [message,   setMessage]   = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 6)  return setError('Password must be at least 6 characters');
    if (!token)               return setError('Invalid reset link');

    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, newPassword: password });
      setMessage(data.message);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
          <Music2 size={18} className="text-black" />
        </div>
        <span className="text-xl font-black">VibeOrbit</span>
      </div>

      <h2 className="text-2xl font-bold mb-1">Set new password</h2>
      <p className="text-white/40 text-sm mb-8">Choose a strong password</p>

      {message ? (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg text-sm">
          {message} Redirecting to login...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-medium">New Password</label>
            <input type="password" placeholder="Min. 6 characters" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-medium">Confirm Password</label>
            <input type="password" placeholder="Repeat your password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}
      <Link href="/login" className="block mt-6 text-sm text-white/30 hover:text-white transition-colors">
        ← Back to login
      </Link>
    </div>
  );
}
