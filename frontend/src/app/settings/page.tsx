'use client';
import { useState, useEffect } from 'react';
import {
  Settings, Moon, Sun, Wifi, Shield, Bell,
  HelpCircle, LogOut, ChevronRight, Check,
  Lock, Trash2, Mail, Globe
} from 'lucide-react';
import { useAuthStore }  from '@/store/authStore';
import { useRouter }     from 'next/navigation';

type Theme   = 'dark' | 'light';
type Quality = 'low' | 'normal' | 'high';

export default function SettingsPage() {
  const { logout, user } = useAuthStore();
  const router           = useRouter();

  const [theme,        setThemeState]  = useState<Theme>('dark');
  const [quality,      setQuality]     = useState<Quality>('normal');
  const [notifications,setNotifications] = useState(true);
  const [autoPlay,     setAutoPlay]    = useState(true);
  const [privateProfile, setPrivate]   = useState(false);
  const [saved,        setSaved]       = useState('');

  // Load saved settings
  useEffect(() => {
    const t = localStorage.getItem('vb_theme')   as Theme   || 'dark';
    const q = localStorage.getItem('vb_quality') as Quality || 'normal';
    const n = localStorage.getItem('vb_notifs')  !== 'false';
    const a = localStorage.getItem('vb_autoplay') !== 'false';
    const p = localStorage.getItem('vb_private') === 'true';
    setThemeState(t); setQuality(q);
    setNotifications(n); setAutoPlay(a); setPrivate(p);
    applyTheme(t);
  }, []);

  const applyTheme = (t: Theme) => {
    if (t === 'light') {
      document.documentElement.style.setProperty('--bg',       '#ffffff');
      document.documentElement.style.setProperty('--fg',       '#000000');
      document.documentElement.style.setProperty('--border',   '#e5e5e5');
      document.documentElement.style.setProperty('--card',     '#f5f5f5');
      document.documentElement.style.setProperty('--input-bg', '#f0f0f0');
      document.body.style.background = '#ffffff';
      document.body.style.color      = '#000000';
    } else {
      document.documentElement.style.setProperty('--bg',       '#000000');
      document.documentElement.style.setProperty('--fg',       '#ffffff');
      document.documentElement.style.setProperty('--border',   '#222222');
      document.documentElement.style.setProperty('--card',     '#111111');
      document.documentElement.style.setProperty('--input-bg', '#0d0d0d');
      document.body.style.background = '#000000';
      document.body.style.color      = '#ffffff';
    }
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('vb_theme', t);
    applyTheme(t);
    flash('Theme updated');
  };

  const flash = (msg: string) => {
    setSaved(msg);
    setTimeout(() => setSaved(''), 2000);
  };

  const toggle = (key: string, val: boolean, setter: (v: boolean) => void) => {
    setter(val);
    localStorage.setItem(key, String(val));
    flash('Saved');
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="max-w-lg mx-auto pb-10">
      <div className="flex items-center gap-3 mb-8">
        <Settings size={22} />
        <h1 className="text-2xl font-black">Settings</h1>
        {saved && (
          <span className="ml-auto text-xs text-green-400 flex items-center gap-1 bg-green-500/10 px-3 py-1 rounded-full">
            <Check size={11} /> {saved}
          </span>
        )}
      </div>

      {/* ── APPEARANCE ── */}
      <Section title="Appearance">
        <div className="p-4">
          <p className="text-sm font-medium mb-3">Theme</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'border-white/40 bg-white/10'
                  : 'border-white/10 hover:border-white/20'
              }`}>
              <Moon size={18} />
              <div className="text-left">
                <p className="text-sm font-semibold">Dark</p>
                <p className="text-xs text-white/40">Default</p>
              </div>
              {theme === 'dark' && <Check size={14} className="ml-auto text-white" />}
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                theme === 'light'
                  ? 'border-white/40 bg-white/10'
                  : 'border-white/10 hover:border-white/20'
              }`}>
              <Sun size={18} />
              <div className="text-left">
                <p className="text-sm font-semibold">Light</p>
                <p className="text-xs text-white/40">Bright mode</p>
              </div>
              {theme === 'light' && <Check size={14} className="ml-auto" />}
            </button>
          </div>
        </div>
      </Section>

      {/* ── PLAYBACK ── */}
      <Section title="Playback">
        <ToggleRow
          icon={<Bell size={16} />}
          label="Autoplay"
          sub="Automatically play next song"
          value={autoPlay}
          onChange={v => toggle('vb_autoplay', v, setAutoPlay)}
        />
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <p className="text-sm font-medium mb-3">Streaming Quality</p>
          <div className="space-y-2">
            {(['low', 'normal', 'high'] as Quality[]).map(q => (
              <button key={q} onClick={() => { setQuality(q); localStorage.setItem('vb_quality', q); flash('Saved'); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                  quality === q
                    ? 'border-white/30 bg-white/10'
                    : 'border-white/[0.06] hover:border-white/15'
                }`}>
                <div className="flex items-center gap-3">
                  <Wifi size={15} className={quality === q ? 'text-white' : 'text-white/30'} />
                  <div className="text-left">
                    <p className="text-sm font-medium capitalize">{q}</p>
                    <p className="text-xs text-white/35">
                      {q === 'low' ? '~64 kbps — saves data' : q === 'normal' ? '~128 kbps — balanced' : '~320 kbps — best quality'}
                    </p>
                  </div>
                </div>
                {quality === q && <Check size={14} className="text-white" />}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── PRIVACY ── */}
      <Section title="Privacy">
        <ToggleRow
          icon={<Shield size={16} />}
          label="Private profile"
          sub="Hide your listening activity from others"
          value={privateProfile}
          onChange={v => toggle('vb_private', v, setPrivate)}
        />
        <ToggleRow
          icon={<Bell size={16} />}
          label="Notifications"
          sub="Get notified about new music"
          value={notifications}
          onChange={v => toggle('vb_notifs', v, setNotifications)}
          border
        />
      </Section>

      {/* ── ACCOUNT ── */}
      <Section title="Account">
        <div className="px-4 py-3 flex items-center gap-3">
          <Mail size={16} className="text-white/40 shrink-0" />
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-xs text-white/40">{user?.email}</p>
          </div>
        </div>
        <LinkRow icon={<Lock size={16} />} label="Change Password"
          sub="Update your password"
          onClick={() => router.push('/forgot-password')} />
        <LinkRow icon={<Globe size={16} />} label="Language"
          sub="English" onClick={() => flash('Coming soon')} />
      </Section>

      {/* ── SUPPORT ── */}
      <Section title="Support">
        <LinkRow icon={<HelpCircle size={16} />} label="Help Center"
          sub="FAQs and guides"
          onClick={() => window.open('mailto:support@vibeorbit.com')} />
        <LinkRow icon={<Mail size={16} />} label="Contact Us"
          sub="support@vibeorbit.com"
          onClick={() => window.open('mailto:support@vibeorbit.com')} />
        <LinkRow icon={<Shield size={16} />} label="Privacy Policy"
          sub="How we handle your data"
          onClick={() => flash('Coming soon')} />
      </Section>

      {/* ── DANGER ZONE ── */}
      <Section title="Account Actions">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-400/10 transition-colors rounded-xl">
          <LogOut size={16} />
          <div className="text-left">
            <p className="text-sm font-medium">Log out</p>
            <p className="text-xs text-red-400/60">Sign out of your account</p>
          </div>
        </button>
        <button onClick={() => flash('Contact support to delete account')}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-400/50 hover:bg-red-400/5 transition-colors rounded-xl border-t border-white/[0.04]">
          <Trash2 size={16} />
          <div className="text-left">
            <p className="text-sm font-medium">Delete Account</p>
            <p className="text-xs text-red-400/40">Permanently remove your account</p>
          </div>
        </button>
      </Section>

      <p className="text-center text-xs text-white/15 mt-8">
        VibeOrbit v1.0.0 — Made by Bramuel Godwill
      </p>
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold mb-2 px-1">
        {title}
      </p>
      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ToggleRow({ icon, label, sub, value, onChange, border = false }: {
  icon: React.ReactNode; label: string; sub: string;
  value: boolean; onChange: (v: boolean) => void; border?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${border ? 'border-t border-white/[0.06]' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="text-white/40">{icon}</span>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-white/35">{sub}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${
          value ? 'bg-white' : 'bg-white/15'
        }`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-black shadow transition-all ${
          value ? 'left-[22px]' : 'left-0.5'
        }`} />
      </button>
    </div>
  );
}

function LinkRow({ icon, label, sub, onClick }: {
  icon: React.ReactNode; label: string; sub: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors border-t border-white/[0.04] first:border-0">
      <span className="text-white/40 shrink-0">{icon}</span>
      <div className="text-left flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-white/35">{sub}</p>
      </div>
      <ChevronRight size={15} className="text-white/20 shrink-0" />
    </button>
  );
}
