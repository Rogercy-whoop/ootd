
import type { Metadata } from 'next';
import './globals.css';
import { ClosetProvider } from '@/context/ClosetContext';
import { AuthProvider } from '@/context/AuthContext';
import { AuthWrapper } from '@/components/AuthWrapper';
import { Toaster } from "@/components/ui/toaster"
import { UIProvider } from '@/context/UIContext';
import { UserPreferencesProvider } from '@/context/UserPreferencesContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: {
    default: "OOTD",
    template: `%s | OOTD`
  },
  description: 'AI-powered outfit generation and personal closet management.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Netlify inserts an HTML comment (plus a line break) near the top of <head>.
            React then sees nodes it did not render and abandons hydration with errors
            #418/#423. This runs while the page is still loading, before React starts,
            and removes stray comments and whitespace-only text from <head>. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var h=document.head,n=h&&h.firstChild;while(n){var next=n.nextSibling;if(n.nodeType===8||(n.nodeType===3&&!n.nodeValue.trim()))h.removeChild(n);n=next;}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased h-full" suppressHydrationWarning>
        <ErrorBoundary>
        <AuthProvider>
          <UserPreferencesProvider>
            <ClosetProvider>
              <UIProvider>
                <AuthWrapper>
                  {children}
                </AuthWrapper>
                <Toaster />
              </UIProvider>
            </ClosetProvider>
          </UserPreferencesProvider>
        </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
