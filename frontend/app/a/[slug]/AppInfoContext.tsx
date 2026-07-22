'use client';

import { createContext, useContext, ReactNode } from 'react';

export type AuthMode = 'legacy' | 'supabase';

export interface AppInfoContextValue {
  appId: string;
  slug: string;
  authMode: AuthMode;
  appName: string;
  config: Record<string, unknown> | null;
}

const AppInfoContext = createContext<AppInfoContextValue | undefined>(undefined);

export function AppInfoProvider({ value, children }: { value: AppInfoContextValue; children: ReactNode }) {
  return <AppInfoContext.Provider value={value}>{children}</AppInfoContext.Provider>;
}

export function useAppInfo() {
  const context = useContext(AppInfoContext);
  if (!context) {
    throw new Error('useAppInfo must be used within AppInfoProvider');
  }
  return context;
}
