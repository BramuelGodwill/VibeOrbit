'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar        from '@/components/Sidebar';
import PlayerBar      from '@/components/PlayerBar';
import MobileNav      from '@/components/MobileNav';
import OnboardingModal from '@/components/OnboardingModal';
import { useAuthStore } from '@/store/authStore';

// Keep backend awake — ping every 10 minutes
if (typeof window !== 'undefined') {
  const ping = () => {
    fetch((process.env.NEXT_PUBLIC_API_URL || '').replace('/api', '') + '/health')
      .catch(() => {});
  };
  ping();
  setInterval(ping, 10 * 60 * 1000);
}

const AUTH_PAGES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname            = usePathname();
  const router              = useRouter();
  const { isAuthenticated } = useAuthStore();
  const isAuthPage          = AUTH_PAGES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!isAuthPage && !isAuthenticated()) {
      router.replace('/login');
    }
  }, [pathname]);

  if (isAuthPage) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black px-4">
        {children}
      </main>
    );
  }

  return (
    <>
      {/* DESKTOP */}
      <div className="hidden md:flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-28 px-6 pt-6 lg:px-10">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
      {/* MOBILE */}
      <div className="md:hidden min-h-screen pb-40">
        <main className="px-4 pt-5">{children}</main>
        <MobileNav />
      </div>
      <PlayerBar />
      <OnboardingModal />
    </>
  );
}
