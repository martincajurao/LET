import type { Metadata, Viewport } from 'next';
import './globals.css';
import '../styles/mobile-nav.css';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/hooks/use-theme';
import { Navbar } from '@/components/ui/Navbar';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { WebViewBridge } from '@/components/webview-bridge';
import { AutoUpdateChecker } from '@/components/auto-update-checker-firestore';
import { PageTransition } from '@/components/page-transition';
import { SessionPersistence } from '@/components/session-persistence';
import Script from 'next/script';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: "LET's Prep - Professional Teacher Practice",
  description: 'Simulate the LET experience with Android-native fluidity and AI pedagogical analysis.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "LET's Prep"
  },
};

export const viewport: Viewport = {
  themeColor: '#a7d9ed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WebViewBridge>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
          <Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    var stored = localStorage.getItem('darkMode');
                    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (stored === 'true' || (stored === null && prefersDark)) {
                      document.documentElement.classList.add('dark');
                    }
                  } catch (e) {}
                })();
              `,
            }}
          />
        </head>
        <body className="font-body antialiased selection:bg-primary/30 selection:text-primary-foreground min-h-screen">
          <ThemeProvider>
            <FirebaseClientProvider>
              <Suspense fallback={null}>
                <SessionPersistence />
              </Suspense>
              <AutoUpdateChecker checkOnMount={true} checkInterval={24 * 60 * 60 * 1000} autoDownload={true} />

              <Suspense fallback={null}>
                <Navbar />
              </Suspense>
              
              <main className="pt-safe pb-safe min-h-screen">
                <PageTransition>
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
                    {children}
                  </Suspense>
                </PageTransition>
              </main>

              <Suspense fallback={null}>
                <MobileBottomNav />
              </Suspense>
            </FirebaseClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </WebViewBridge>
  );
}
