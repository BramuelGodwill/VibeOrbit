'use client';
import { useState, useEffect } from 'react';
import {
  Settings, Moon, Sun, Wifi, Shield, Bell,
  HelpCircle, LogOut, ChevronRight, Check,
  Lock, Trash2, Mail, Globe, MessageCircle,
  FileText, Phone, Info
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRouter }    from 'next/navigation';

type Theme   = 'dark' | 'light';
type Quality = 'low' | 'normal' | 'high';

export default function SettingsPage() {
  const { logout, user } = useAuthStore();
  const router           = useRouter();

  const [theme,          setThemeState]    = useState<Theme>('dark');
  const [quality,        setQuality]       = useState<Quality>('normal');
  const [notifications,  setNotifications] = useState(true);
  const [autoPlay,       setAutoPlay]      = useState(true);
  const [privateProfile, setPrivate]       = useState(false);
  const [saved,          setSaved]         = useState('');
  const [mounted,        setMounted]       = useState(false);
  const [showFaq,        setShowFaq]       = useState(false);
  const [showAbout,      setShowAbout]     = useState(false);
  const [showPrivacy,    setShowPrivacy]   = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = (localStorage.getItem('vb_theme')   as Theme)   || 'dark';
    const q = (localStorage.getItem('vb_quality') as Quality) || 'normal';
    const n = localStorage.getItem('vb_notifs')   !== 'false';
    const a = localStorage.getItem('vb_autoplay') !== 'false';
    const p = localStorage.getItem('vb_private')  === 'true';
    setThemeState(t);
    setQuality(q);
    setNotifications(n);
    setAutoPlay(a);
    setPrivate(p);
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

  const flash = (msg: string) => {
    setSaved(msg);
    setTimeout(() => setSaved(''), 2500);
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('vb_theme', t);
    applyTheme(t);
    flash('Theme updated');
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

  if (!mounted) return (
    <div className="flex justify-center pt-20"><div className="spinner" /></div>
  );

  return (
    <div className="max-w-lg mx-auto pb-10">

      {/* ── FAQ Modal ── */}
      {showFaq && (
        <div className="fixed inset-0 z-[80] bg-black/80 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowFaq(false)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-5 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-black mb-4">Help Center — FAQs</h2>
            <div className="space-y-4">
              {[
                {
                  q: 'How do I go Premium?',
                  a: 'Go to your Profile page, scroll to Go Premium, enter your Safaricom M-Pesa number and pay KES 10. You will receive an M-Pesa prompt on your phone.',
                },
                {
                  q: 'Why is my payment being reversed?',
                  a: 'Payments are processed via IntaSend. If reversed, it usually means the payment gateway is being set up. Contact us at vibeorbitsupport@gmail.com and we will manually upgrade your account.',
                },
                {
                  q: 'How do I change my profile photo?',
                  a: 'Go to Profile → tap the camera icon on your avatar → choose a photo from your gallery or take a new one.',
                },
                {
                  q: 'Why does the app take long to load?',
                  a: 'The server may be starting up. Wait 30 seconds and try again. Once loaded it runs smoothly.',
                },
                {
                  q: 'How do I report a problem?',
                  a: 'Email us at vibeorbitsupport@gmail.com and describe the issue. We respond within 24 hours.',
                },
                {
                  q: 'Can I listen offline?',
                  a: 'Offline listening is coming soon for Premium members. Stay tuned!',
                },
                {
                  q: 'How do I create a playlist?',
                  a: 'Go to Library → tap Create Playlist → give it a name. Then add songs by tapping the + icon while a song is playing.',
                },
                {
                  q: 'How do I delete my account?',
                  a: 'Email vibeorbitsupport@gmail.com with subject "Delete My Account" and your registered email. We will delete it within 48 hours.',
                },
              ].map((item, i) => (
                <div key={i} className="border-b border-white/[0.06] pb-4 last:border-0">
                  <p className="text-sm font-bold mb-1">{item.q}</p>
                  <p className="text-xs text-white/50 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowFaq(false)}
              className="mt-4 w-full py-2 text-xs text-white/30 hover:text-white transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Privacy Policy Modal ── */}
      {showPrivacy && (
        <div className="fixed inset-0 z-[80] bg-black/80 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowPrivacy(false)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-5 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-black mb-1">Privacy Policy</h2>
            <p className="text-xs text-white/30 mb-4">Last updated: {new Date().getFullYear()}</p>
            <div className="space-y-4 text-xs text-white/50 leading-relaxed">
              <div>
                <p className="text-white/80 font-bold text-sm mb-1">What we collect</p>
                <p>We collect your email, username, and listening history to personalise your experience. Payment information is handled securely by IntaSend and never stored on our servers.</p>
              </div>
              <div>
                <p className="text-white/80 font-bold text-sm mb-1">How we use your data</p>
                <p>Your listening history is used to recommend songs you will enjoy. We never sell your data to third parties.</p>
              </div>
              <div>
                <p className="text-white/80 font-bold text-sm mb-1">Your rights</p>
                <p>You can delete your account and all associated data at any time by contacting vibeorbitsupport@gmail.com.</p>
              </div>
              <div>
                <p className="text-white/80 font-bold text-sm mb-1">Cookies</p>
                <p>We use local storage to save your preferences such as theme and quality settings. No tracking cookies are used.</p>
              </div>
              <div>
                <p className="text-white/80 font-bold text-sm mb-1">Contact</p>
                <p>For any privacy concerns email vibeorbitsupport@gmail.com.</p>
              </div>
            </div>
            <button onClick={() => setShowPrivacy(false)}
              className="mt-4 w-full py-2 text-xs text-white/30 hover:text-white transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── About Modal ── */}
      {showAbout && (
        <div className="fixed inset-0 z-[80] bg-black/80 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowAbout(false)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm p-5"
            onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-black text-2xl font-black">V</span>
              </div>
              <h2 className="text-lg font-black">VibeOrbit</h2>
              <p className="text-xs text-white/30 mt-1">Version 2.1.0</p>
            </div>
            <div className="space-y-2 text-xs text-white/50 text-center leading-relaxed">
              <p>Music streaming platform built for Kenya and East Africa.</p>
              <p>Stream unlimited music, discover new artists, and enjoy your favourite songs.</p>
              <p className="text-white/30 mt-3">Built by <span className="text-white/60 font-bold">Bramuel Godwill</span></p>
              <p className="text-white/20">© {new Date().getFullYear()} VibeOrbit. All rights reserved.</p>
            </div>
            <button onClick={() => setShowAbout(false)}
              className="mt-4 w-full py-2 text-xs text-white/30 hover:text-white transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
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
            <button onClick={() => setTheme('dark')}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95 ${
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
            <button onClick={() => setTheme('light')}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95 ${
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
              <button key={q}
                onClick={() => {
                  setQuality(q);
                  localStorage.setItem('vb_quality', q);
                  flash('Quality set to ' + q);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all active:scale-[0.98] ${
                  quality === q
                    ? 'border-white/30 bg-white/10'
                    : 'border-white/[0.06] hover:border-white/15'
                }`}>
                <div className="flex items-center gap-3">
                  <Wifi size={15} className={quality === q ? 'text-white' : 'text-white/30'} />
                  <div className="text-left">
                    <p className="text-sm font-medium capitalize">{q}</p>
                    <p className="text-xs text-white/35">
                      {q === 'low'    ? '~64 kbps — saves data'  :
                       q === 'normal' ? '~128 kbps — balanced'   :
                                        '~320 kbps — best quality'}
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
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Email</p>
            <p className="text-xs text-white/40 truncate">{user?.email}</p>
          </div>
        </div>
        <LinkRow
          icon={<Lock size={16} />}
          label="Change Password"
          sub="Update your account password"
          onClick={() => { router.push('/forgot-password'); flash('Redirecting...'); }}
        />
        <LinkRow
          icon={<Globe size={16} />}
          label="Language"
          sub="English (more languages coming soon)"
          onClick={() => flash('More languages coming soon!')}
        />
      </Section>

      {/* ── SUPPORT ── */}
      <Section title="Support">
        <LinkRow
          icon={<HelpCircle size={16} />}
          label="Help Center"
          sub="Frequently asked questions"
          onClick={() => setShowFaq(true)}
        />
        <LinkRow
          icon={<MessageCircle size={16} />}
          label="Contact Us"
          sub="vibeorbitsupport@gmail.com"
          onClick={() => {
            window.open('mailto:vibeorbitsupport@gmail.com?subject=VibeOrbit Support');
            flash('Opening email...');
          }}
        />
        <LinkRow
          icon={<Phone size={16} />}
          label="WhatsApp Support"
          sub="Chat with us on WhatsApp"
          onClick={() => {
            window.open('https://wa.me/254793776178?text=Hi, I need help with VibeOrbit');
            flash('Opening WhatsApp...');
          }}
        />
        <LinkRow
          icon={<FileText size={16} />}
          label="Privacy Policy"
          sub="How we handle your data"
          onClick={() => setShowPrivacy(true)}
        />
        <LinkRow
          icon={<Info size={16} />}
          label="About VibeOrbit"
          sub="Version 2.1.0 — Built by Bramuel Godwill"
          onClick={() => setShowAbout(true)}
        />
      </Section>

      {/* ── ACCOUNT ACTIONS ── */}
      <Section title="Account Actions">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-400/10 active:bg-red-400/20 active:scale-[0.98] transition-all rounded-xl">
          <LogOut size={16} />
          <div className="text-left">
            <p className="text-sm font-medium">Log out</p>
            <p className="text-xs text-red-400/60">Sign out of your account</p>
          </div>
        </button>
        <button
          onClick={() => {
            window.open('mailto:vibeorbitsupport@gmail.com?subject=Delete My Account');
            flash('Email opened — send us your request');
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-400/50 hover:bg-red-400/5 active:bg-red-400/10 active:scale-[0.98] transition-all rounded-xl border-t border-white/[0.04]">
          <Trash2 size={16} />
          <div className="text-left">
            <p className="text-sm font-medium">Delete Account</p>
            <p className="text-xs text-red-400/40">Email us to permanently remove your account</p>
          </div>
        </button>
      </Section>

      <p className="text-center text-xs text-white/15 mt-8">
        VibeOrbit v2.1.0 — Made with ❤️ by Bramuel Godwill
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
  icon:     React.ReactNode;
  label:    string;
  sub:      string;
  value:    boolean;
  onChange: (v: boolean) => void;
  border?:  boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${
      border ? 'border-t border-white/[0.06]' : ''
    }`}>
      <div className="flex items-center gap-3">
        <span className="text-white/40">{icon}</span>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-white/35">{sub}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-all relative shrink-0 active:scale-95 ${
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
  icon:    React.ReactNode;
  label:   string;
  sub:     string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.06] active:bg-white/10 active:scale-[0.98] touch-manipulation transition-all border-t border-white/[0.04] first:border-0">
      <span className="text-white/40 shrink-0">{icon}</span>
      <div className="text-left flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-white/35 truncate">{sub}</p>
      </div>
      <ChevronRight size={15} className="text-white/20 shrink-0" />
    </button>
  );
}
