import type { Metadata } from 'next';
import './globals.css';
import '../styles/mobile-nav.css';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/hooks/use-theme';
import { Navbar } from '@/components/ui/Navbar';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import Script from 'next/script';

export const metadata: Metadata = {
  title: "LET's Prep - Licensure Examination for Teachers Practice",
  description: 'Simulate the LET experience with adaptive testing and performance analysis.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <Script src="https://js.puter.com/v2/" strategy="afterInteractive" />
        {/* Prevent flash of unstyled content */}
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
      <body className="font-body antialiased pb-20 md:pb-16">
        <ThemeProvider>
          <FirebaseClientProvider>
            <Navbar />
            {children}
            <MobileBottomNav />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
