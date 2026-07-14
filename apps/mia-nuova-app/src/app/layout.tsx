import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mia Nuova App - ZEUSX',
  description: 'Applicazione generata con ZEUSX Entity Builder',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-slate-950">
        {children}
      </body>
    </html>
  );
}