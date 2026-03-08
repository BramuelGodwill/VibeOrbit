'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter }    from 'next/navigation';
import { Lock, ArrowLeft, Check, Eye, EyeOff } from 'lucide-react';
import api  from '@/lib/api';
import Link from 'next/link';

function ResetForm() {
  const searchParams            = useSearchParams();
  const router                  = useRouter();
  const [token,     setToken]   = useState('');
  const [password,  setPass]    = useState('');
  const [confirm,   setConf]    = useState('');
  const [showPass,  setShow]    = useState(false);
  const [loading,   setLoad]    = useState(false);
  const [success,   setOk]      = useState(false);
  const [error,     setErr]     = useState('');

  useEffect(() => {
    // Get token from URL on mount
    const t = searchParams.get('token');
    console.log('Token from URL:', t);
    if (t) {
      setToken(t);
    } else {
      setErr('Invalid reset link. Please request a new one.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');

    if (!token) return setErr('Invalid reset link. Please request a new one.');
    if (password.length < 6) return setErr('Password must be at least 6 characters');
    if (password !== confirm) return setErr('Passwords do not match');

    setLoad(true);
    try {
      await api.post('/auth/reset-password', {
        token:    token,
        password: password,
      });
      setOk(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setErr(err.response?.data?.error || 'Reset failed. Link may have expired.');
    } finally {
      setLoad(false);
    }
  };

  if (success) return (
    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center">
      <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
        <Check size={22} className="text-green-400" />
      </div>
      <p className="text-green-400 font-bold mb-1">Password reset!</p>
      <p className="text-white/50 text-sm">Redirecting you to login...</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {!token && !error && (
        <div className="flex justify-center py-4">
          <div className="spinner" />
        </div>
      )}

      {token && (
        <>
          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-medium">
              New Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={password}
                onChange={e => setPass(e.target.value)}
                disabled={loading}
                className="w-full pl-9 pr-10"
                required
              />
              <button type="button" onClick={() => setShow(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-medium">
              Confirm Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={confirm}
                onChange={e => setConf(e.target.value)}
                disabled={loading}
                className="w-full pl-9"
                required
              />
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {token && (
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              Resetting...
            </span>
          ) : (
            'Reset Password'
          )}
        </button>
      )}

      <Link href="/login"
        className="flex items-center justify-center gap-1.5 text-sm text-white/30 hover:text-white transition-colors mt-2">
        <ArrowLeft size={14} /> Back to login
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-black text-2xl font-black">V</span>
          </div>
          <h1 className="text-2xl font-black">Reset Password</h1>
          <p className="text-white/40 text-sm mt-1">Enter your new password below</p>
        </div>
        <Suspense fallback={<div className="flex justify-center"><div className="spinner" /></div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
