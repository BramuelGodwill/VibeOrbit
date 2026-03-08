'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter }             from 'next/navigation';
import { Mail, RefreshCw }                        from 'lucide-react';
import api        from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

function VerifyForm() {
  const searchParams      = useSearchParams();
  const router            = useRouter();
  const { setAuth }       = useAuthStore();
  const email             = searchParams.get('email') || '';
  const [otp,     setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoad] = useState(false);
  const [error,   setErr]  = useState('');
  const [resent,  setResent] = useState(false);
  const [timer,   setTimer]  = useState(60);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) router.push('/register');
  }, [email]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
    if (next.every(d => d !== '')) handleVerify(next.join(''));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const finalOtp = code || otp.join('');
    if (finalOtp.length !== 6) return setErr('Enter the full 6-digit code');
    setLoad(true); setErr('');
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp: finalOtp });
      setAuth(data.token, data.user);
      router.push('/');
    } catch (err: any) {
      setErr(err.response?.data?.error || 'Invalid code. Try again.');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoad(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-otp', { email });
      setResent(true);
      setTimer(60);
      setTimeout(() => setResent(false), 3000);
    } catch {}
  };

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail size={24} className="text-black" />
        </div>
        <h1 className="text-2xl font-black">Check your email</h1>
        <p className="text-white/40 text-sm mt-2">
          We sent a 6-digit code to
        </p>
        <p className="text-white font-bold text-sm mt-1">{email}</p>
      </div>

      {/* OTP inputs */}
      <div className="flex gap-3 justify-center mb-6">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className="w-12 h-14 text-center text-xl font-black bg-white/[0.06] border border-white/10 rounded-xl focus:border-white/40 focus:outline-none transition-colors"
          />
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-4 text-center">
          {error}
        </div>
      )}

      {resent && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm mb-4 text-center">
          New code sent!
        </div>
      )}

      <button
        onClick={() => handleVerify()}
        disabled={loading || otp.some(d => !d)}
        className="btn-primary w-full mb-4">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            Verifying...
          </span>
        ) : 'Verify Email'}
      </button>

      <div className="text-center">
        {timer > 0 ? (
          <p className="text-white/30 text-sm">
            Resend code in <span className="text-white/50 font-bold">{timer}s</span>
          </p>
        ) : (
          <button onClick={handleResend}
            className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mx-auto">
            <RefreshCw size={13} /> Resend code
          </button>
        )}
      </div>

      <p className="text-center text-xs text-white/20 mt-6">
        Wrong email?{' '}
        <a href="/register" className="text-white/40 hover:text-white transition-colors">
          Go back
        </a>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<div className="spinner" />}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
