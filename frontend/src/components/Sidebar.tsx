'use client';
import Link       from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Library, Upload, User, LogOut, Music2, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function Sidebar() {
  const pathname          = usePathname();
  const router            = useRouter();
  const { user, logout, isAdmin } = useAuthStore();

  const admin = isAdmin();

  const NAV = [
    { href: '/',         label: 'Home',     icon: Home    },
    { href: '/search',   label: 'Search',   icon: Search  },
    { href: '/library',  label: 'Library',  icon: Library },
    ...(admin
      ? [{ href: '/upload', label: 'Upload', icon: Upload }]
      : []
    ),
    { href: '/profile',  label: 'Profile',  icon: User    },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="hidden md:flex flex-col w-56 shrink-0 h-screen bg-black border-r border-white/[0.06] px-3 py-5">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-8">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <Music2 size={16} className="text-black" />
        </div>
        <span className="font-black text-lg">VibeOrbit</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-white/[0.06] pt-4 mt-4">
        <div className="flex items-center gap-2 px-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
            {(user as any)?.avatar_url
              ? <img src={(user as any).avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-xs font-bold text-white/50">
                  {user?.username?.[0]?.toUpperCase()}
                </span>
            }
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{user?.username}</p>
            <p className="text-[10px] text-white/30 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/[0.06] transition-all w-full">
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </div>
  );
}

