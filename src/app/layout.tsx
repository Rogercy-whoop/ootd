
import type { Metadata } from 'next';
import './globals.css';
import { ClosetProvider } from '@/context/ClosetContext';
import { AuthProvider } from '@/context/AuthContext';
import { AuthWrapper } from '@/components/AuthWrapper';
import { Toaster } from "@/components/ui/toaster"
import { UIProvider } from '@/context/UIContext';
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased h-full" suppressHydrationWarning>
        <ErrorBoundary>
        <AuthProvider>
          <ClosetProvider>
            <UIProvider>
              <AuthWrapper>
                {children}
              </AuthWrapper>
              <Toaster />
            </UIProvider>
          </ClosetProvider>
        </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
