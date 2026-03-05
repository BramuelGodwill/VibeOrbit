'use client';
import { useState } from 'react';
import Link          from 'next/link';
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMessage('Reset link sent! Check your email inbox and spam folder.');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
          <Music2 size={18} className="text-black" />
        </div>
        <span className="text-xl font-black">VibeOrbit</span>
      </div>

      <h2 className="text-2xl font-bold mb-1">Forgot password</h2>
      <p className="text-white/40 text-sm mb-6">
        Enter your email and we&apos;ll send you a reset link
      </p>

      {message ? (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm">
          <p className="font-semibold mb-1">✅ Email sent!</p>
          <p>{message}</p>
          <Link href="/login" className="block mt-4 text-white font-medium hover:underline">
            ← Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-medium">Email address</label>
            <input type="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
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
