'use client';
import { useState } from 'react';
import Link          from 'next/link';
import api           from '@/lib/api';
import { Music2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [message, setMessage] = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMessage('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
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

      <h2 className="text-2xl font-bold mb-1">Forgot password</h2>
      <p className="text-white/40 text-sm mb-8">
        Enter your email and we&apos;ll send you a reset link
      </p>

      {message ? (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg text-sm">
          {message}
          <div className="mt-4">
            <Link href="/login" className="text-white font-medium hover:underline">
              ← Back to login
            </Link>
          </div>
        </div>
      ) : (
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
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      )}

      {!message && (
        <Link href="/login" className="flex items-center gap-1 mt-6 text-sm text-white/30 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Back to login
        </Link>
      )}
    </div>
  );
}
