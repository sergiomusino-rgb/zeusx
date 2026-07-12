'use client';

import { PropsWithChildren } from 'react';
import { LanguageProvider } from '@/src/lib/LanguageContext';

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  );
}
