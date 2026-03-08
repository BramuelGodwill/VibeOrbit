'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter }             from 'next/navigation';
import { Mail, RefreshCw }                        from 'lucide-react';
import api              from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

function VerifyForm() {
  const searchParams        = useSearchParams();
  const router              = useRouter();
  const { setAuth }         = useAuthStore();
  const [email, setEmail]   = useState('');
  const [otp,   setOtp]     = useState(['', '', '', '', '', '']);
  const [loading, setLoad]  = useState(false);
  const [error,   setErr]   = useState('');
  const [resent,  setResent] = useState(false);
  const [timer,   setTimer]  = useState(60);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const e = searchParams.get('email');
    if (e) setEmail(e);
  }, [searchParams]);

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
    if (next.every(d => d !== '')) submitOtp(next.join(''));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setOtp(next);
      inputs.current[5]?.focus();
      submitOtp(pasted);
    }
  };

  const submitOtp = async (code: string) => {
    if (code.length !== 6) return;
    setLoad(true); setErr('');
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp: code });
      setAuth(data.token, data.user);
      router.push('/');
    } catch (err: any) {
      setErr(err.response?.data?.error || 'Invalid code. Try again.');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } finally {
      setLoad(false);
    }
  };

  const handleVerifyBtn = () => submitOtp(otp.join(''));

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-otp', { email });
      setResent(true);
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
      setTimeout(() => setResent(false), 3000);
    } catch {
      setErr('Failed to resend. Try again.');
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-black">Check your email</h1>
        <p className="text-white/40 text-sm mt-2">
          We sent a 6-digit code to
        </p>
        <p className="text-white font-bold text-sm mt-1 break-all">{email}</p>
        <p className="text-white/25 text-xs mt-2">
          Check your inbox and spam folder
        </p>
      </div>

      {/* OTP boxes */}
      <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
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
            disabled={loading}
            className="w-12 h-14 text-center text-2xl font-black rounded-xl transition-all outline-none"
            style={{
              background: digit ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              border: digit ? '2px solid rgba(255,255,255,0.4)' : '2px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-4 text-center">
          {error}
        </div>
      )}

      {/* Resent confirmation */}
      {resent && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm mb-4 text-center">
          ✅ New code sent! Check your email.
        </div>
      )}

      {/* Verify button */}
      <button
        onClick={handleVerifyBtn}
        disabled={loading || otp.some(d => !d)}
        className="btn-primary w-full mb-4">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            Verifying...
          </span>
        ) : 'Verify Email'}
      </button>

      {/* Resend */}
      <div className="text-center mb-6">
        {timer > 0 ? (
          <p className="text-white/30 text-sm">
            Resend code in <span className="text-white/60 font-bold">{timer}s</span>
          </p>
        ) : (
          <button
            onClick={handleResend}
            className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mx-auto active:scale-95">
            <RefreshCw size={13} /> Resend code
          </button>
        )}
      </div>

      {/* Manual code entry fallback */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-4">
        <p className="text-xs text-white/30 text-center mb-3">
          Or type your code manually
        </p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter 6-digit code"
          onChange={e => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
            const next = val.split('').concat(Array(6).fill('')).slice(0, 6);
            setOtp(next);
            if (val.length === 6) submitOtp(val);
          }}
          className="w-full text-center text-lg font-bold tracking-widest rounded-xl px-4 py-3 outline-none"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
          }}
        />
      </div>

      <p className="text-center text-xs text-white/20">
        Wrong email?{' '}
        <a href="/signup" className="text-white/40 hover:text-white transition-colors">
          Go back and register again
        </a>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="flex justify-center pt-20">
          <div className="spinner" />
        </div>
      }>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
