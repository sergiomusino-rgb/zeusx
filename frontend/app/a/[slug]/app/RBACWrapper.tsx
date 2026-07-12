'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/src/lib/AuthContext';

// ============================================================================
// Props
// ============================================================================

interface RBACWrapperProps {
  children: React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export default function RBACWrapper({ children }: RBACWrapperProps) {
  const { role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Estrai lo slug dalla pathname
  const slug = pathname?.match(/\/a\/([^/]+)/)?.[1] || '';

  useEffect(() => {
    // Se l'utente è un agente e si trova nella dashboard principale, reindirizza agli ordini
    if (!loading && role === 'agent' && pathname === `/a/${slug}/app`) {
      router.replace(`/a/${slug}/app/ordini`);
    }
  }, [loading, role, pathname, router, slug]);

  // Mostra loading finché non viene determinato il ruolo
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-slate-400">Caricamento...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}