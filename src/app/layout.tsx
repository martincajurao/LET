
import type { Metadata } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { Navbar } from '@/components/ui/Navbar';
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <Script src="https://js.puter.com/v2/" strategy="afterInteractive" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <Navbar />
          {children}
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
