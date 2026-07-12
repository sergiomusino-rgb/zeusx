'use client';

import { PropsWithChildren } from 'react';
import { LanguageProvider } from '@/src/lib/LanguageContext';
import { AuthProvider } from '@/src/lib/AuthContext';
import { useParams } from 'next/navigation';

export default function AppLayout({ children }: PropsWithChildren) {
  const params = useParams();
  const slug = params.slug as string;
  
  return (
    <LanguageProvider>
      <AuthProvider slug={slug}>
        {children}
      </AuthProvider>
    </LanguageProvider>
  );
}