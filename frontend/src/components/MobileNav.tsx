'use client';
import Link        from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, Upload, User, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function MobileNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuthStore();
  const admin = isAdmin();

  const NAV = [
    { href: '/',         label: 'Home',     icon: Home     },
    { href: '/search',   label: 'Search',   icon: Search   },
    { href: '/library',  label: 'Library',  icon: Library  },
    ...(admin
      ? [{ href: '/upload', label: 'Upload', icon: Upload }]
      : []
    ),
    { href: '/profile',  label: 'Profile',  icon: User     },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-16 inset-x-0 z-40 bg-black/95 backdrop-blur-xl border-t border-white/10 pb-safe md:hidden">
      <div className="flex items-center justify-around px-1 py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all ${
                active ? 'text-white' : 'text-white/35'
              }`}>
              <div className={`p-1.5 rounded-lg ${active ? 'bg-white/15' : ''}`}>
                <Icon size={20} />
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
