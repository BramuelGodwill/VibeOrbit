'use client';
import { useState }   from 'react';
import Link            from 'next/link';
import { useRouter }   from 'next/navigation';
import api             from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Music2 }      from 'lucide-react';

export default function SignupPage() {
  const [email,    setEmail]    = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const { setAuth } = useAuthStore();
  const router      = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    setLoading(true);

    try {
      const { data } = await api.post('/auth/register', { email, username, password });
      setAuth(data.token, data.user);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
          <Music2 size={18} className="text-black" />
        </div>
        <div>
          <h1 className="text-xl font-black leading-none">VibeOrbit</h1>
          <p className="text-[11px] text-white/30">Music. Your way.</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-1">Create account</h2>
      <p className="text-white/40 text-sm mb-8">Start streaming for free</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-medium">Email</label>
          <input type="email" placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-medium">Username</label>
          <input type="text" placeholder="cooluser123" value={username}
            onChange={(e) => setUsername(e.target.value)} required minLength={3} />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-medium">Password</label>
          <input type="password" placeholder="Min. 6 characters" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-white/40 text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-white hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
