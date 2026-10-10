
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sparkles, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isLoginEnabled } from '@/lib/firebase';
import { Button } from './ui/button';
import { useUI } from '@/context/UIContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LoginSignupForm } from './LoginSignupForm';
import { UpgradeModal } from './UpgradeModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/closet', label: 'My Closet' },
  { href: '/inspiration', label: 'Inspiration' },
];

export function Header() {
  const pathname = usePathname() || '';
  const { user, logout } = useAuth();
  const { isLoginModalOpen, setLoginModalOpen } = useUI();

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between sm:space-x-0">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" />
            <div>
              <p className="font-headline text-lg font-bold leading-tight">OOTD</p>
              <p className="text-xs text-muted-foreground leading-tight">outfit of the day</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
             <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                {navLinks.map(link => (
                  <Link key={link.href} href={link.href} className={cn('transition-colors hover:text-primary', pathname === link.href ? 'text-primary' : 'text-foreground/60')}>{link.label}</Link>
                ))}

                {process.env.NODE_ENV !== 'production' && (
                  <DropdownMenu>
                      <DropdownMenuTrigger className={cn(
                          'flex items-center gap-1 transition-colors hover:text-primary focus:outline-none',
                          pathname.startsWith('/debug') ? 'text-primary' : 'text-foreground/60'
                      )}>
                          Debug Tools
                          <ChevronDown className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                          <DropdownMenuItem asChild>
                              <Link href="/debug/models">AI Models</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                              <Link href="/debug/premium">Premium Modal</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                              <Link href="/debug/onboarding">Onboarding Flow</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                              <Link href="/debug/model-preview">3D Model Preview</Link>
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </nav>
            {isLoginEnabled && (user ? (
                <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            ) : (
                <Button onClick={() => setLoginModalOpen(true)}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    Login / Sign Up
                </Button>
            ))}
          </div>
        </div>
        {/* On phones the desktop links are hidden, so show them as a row under the logo. */}
        <nav className="md:hidden flex justify-around border-t text-sm font-medium">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className={cn('flex-1 py-2 text-center transition-colors', pathname === link.href ? 'text-primary font-semibold' : 'text-foreground/60')}>{link.label}</Link>
          ))}
        </nav>
      </header>
      <Dialog open={isLoginModalOpen} onOpenChange={setLoginModalOpen}>
        <DialogContent className="sm:max-w-md">
            <LoginSignupForm onSuccess={() => setLoginModalOpen(false)} />
        </DialogContent>
      </Dialog>
      <UpgradeModal />
    </>
  );
}
