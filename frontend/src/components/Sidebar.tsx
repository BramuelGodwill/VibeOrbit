'use client';
import Link       from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Library, Upload, User, LogOut, Music2, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const NAV = [
  { href: '/',         label: 'Home',     icon: Home     },
  { href: '/search',   label: 'Search',   icon: Search   },
  { href: '/library',  label: 'Library',  icon: Library  },
  { href: '/upload',   label: 'Upload',   icon: Upload   },
  { href: '/profile',  label: 'Profile',  icon: User     },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-56 shrink-0 bg-black border-r border-white/[0.06] flex flex-col py-6 px-3 h-full">
      {/* Logo */}
      <div className="px-3 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Music2 size={16} className="text-black" />
          </div>
          <span className="font-black text-lg tracking-tight">VibeOrbit</span>
        </div>
        <p className="text-[11px] text-white/30 mt-1 ml-10">Music. Your way.</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="pt-4 border-t border-white/[0.06]">
        {user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-semibold text-white truncate">{user.username}</p>
            <p className="text-[11px] text-white/30 truncate">{user.email}</p>
            {user.is_premium && (
              <span className="text-[10px] bg-white text-black font-bold px-2 py-0.5 rounded-full mt-1 inline-block">
                PREMIUM
              </span>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/30 hover:text-white w-full rounded-lg hover:bg-white/[0.06] transition-all"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </aside>
  );
}
