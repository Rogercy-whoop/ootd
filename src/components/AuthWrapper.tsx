
'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Header } from './Header';

export function AuthWrapper({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // This component no longer enforces authentication.
    // It just shows a loading spinner while auth state is being determined
    // and handles redirecting away from the old, now unused, login page.
    if (loading) return;

    if (pathname === '/login') {
      router.replace('/');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Render the app for both authenticated and guest users
  return (
    <div className="flex flex-col h-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
            <footer className="mt-12 border-t pt-4 text-center text-xs text-muted-foreground">
              <Link href="/privacy" className="underline">Privacy</Link>
            </footer>
        </main>
    </div>
  );
}
