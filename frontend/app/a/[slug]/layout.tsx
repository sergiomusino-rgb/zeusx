'use client';

import { PropsWithChildren, useEffect } from 'react';
import { LanguageProvider } from '@/src/lib/LanguageContext';
import { AuthProvider } from '@/src/lib/AuthContext';
import { useParams } from 'next/navigation';

export default function AppLayout({ children }: PropsWithChildren) {
  const params = useParams();
  const slug = params.slug as string;
  
  // Ascolta il custom event per aggiornare il tema
  useEffect(() => {
    const handleThemeChange = () => {
      // Forza il refresh della pagina per applicare il nuovo tema
      window.location.reload();
    };
    
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);
  
  return (
    <LanguageProvider>
      <AuthProvider slug={slug}>
        {children}
      </AuthProvider>
    </LanguageProvider>
  );
}
