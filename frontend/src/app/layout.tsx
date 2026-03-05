'use client';
import './globals.css';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar   from '@/components/Sidebar';
import PlayerBar from '@/components/PlayerBar';
import MobileNav from '@/components/MobileNav';
import { useAuthStore } from '@/store/authStore';

const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname        = usePathname();
  const router          = useRouter();
  const { isAuthenticated } = useAuthStore();
  const isAuthPage      = AUTH_PAGES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!isAuthPage && !isAuthenticated()) {
      router.replace('/login');
    }
  }, [pathname]);

  return (
    <html lang="en">
      <head>
        <title>VibeOrbit — Music. Your way.</title>
        <meta name="description" content="Stream music, create playlists, discover new artists." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-black text-white">
        {isAuthPage ? (
          <main className="min-h-screen flex items-center justify-center bg-black px-4">
            {children}
          </main>
        ) : (
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
          </>
        )}
      </body>
    </html>
  );
}

