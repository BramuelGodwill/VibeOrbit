'use client';
import './globals.css';
import { usePathname } from 'next/navigation';
import Sidebar   from '@/components/Sidebar';
import PlayerBar from '@/components/PlayerBar';

// Pages that should NOT show the sidebar/player (auth pages)
const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  return (
    <html lang="en">
      <head>
        <title>VibeOrbit — Music. Your way.</title>
        <meta name="description" content="Stream music, create playlists, discover new artists on VibeOrbit." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black text-white">
        {isAuthPage ? (
          /* Auth pages: centered, no sidebar */
          <main className="min-h-screen flex items-center justify-center bg-black px-4">
            {children}
          </main>
        ) : (
          /* App pages: sidebar + scrollable content */
          <>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto pb-28 px-6 pt-6 lg:px-10">
                <div className="max-w-6xl mx-auto page-enter">
                  {children}
                </div>
              </main>
            </div>
            <PlayerBar />
          </>
        )}
      </body>
    </html>
  );
}
