'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseBrowser } from '@/src/lib/supabase-browser';

// ─── Types ────────────────────────────────────────────────────────────────

export interface UserPermissions {
  role: string;
  profileRole: string;
  visibleTables: string[];
  enabledFeatures: string[];
  tenantId?: string;
  companyId?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function usePermissions() {
  const [permissions, setPermissions] = useState<UserPermissions>({
    role: 'member',
    profileRole: 'member',
    visibleTables: [],
    enabledFeatures: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        setPermissions({
          role: 'member',
          profileRole: 'member',
          visibleTables: [],
          enabledFeatures: [],
        });
        setLoading(false);
        return;
      }

      // Recupera il profilo dell'utente
      const { data: profile, error: profileError } = await supabaseBrowser
        .from('profiles')
        .select('role, company_id')
        .eq('user_id', session.user.id)
        .single();

      if (profileError || !profile) {
        console.error('Errore recupero profilo:', profileError);
        setPermissions({
          role: 'member',
          profileRole: 'member',
          visibleTables: [],
          enabledFeatures: [],
        });
        setLoading(false);
        return;
      }

      const userRole = profile.role || 'member';

      // Recupera il tenant_id
      const { data: membership } = await supabaseBrowser
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', session.user.id)
        .limit(1)
        .single();

      const tenantId = membership?.tenant_id;

      // Recupera i permessi dal ruolo (da permissions_config)
      const { data: rolePerms } = await supabaseBrowser
        .from('permissions_config')
        .select('visible_tables, enabled_features')
        .eq('role', userRole)
        .single();

      // Recupera i permessi personalizzati (da user_permissions)
      let customPerms = null;
      if (tenantId) {
        const { data } = await supabaseBrowser
          .from('user_permissions')
          .select('visible_tables, enabled_features')
          .eq('user_id', session.user.id)
          .eq('tenant_id', tenantId)
          .single();
        customPerms = data;
      }

      // Combina i permessi: i custom sovrascrivono quelli del ruolo
      const visibleTables = customPerms?.visible_tables || rolePerms?.visible_tables || [];
      const enabledFeatures = customPerms?.enabled_features || rolePerms?.enabled_features || [];

      setPermissions({
        role: userRole,
        profileRole: userRole,
        visibleTables,
        enabledFeatures,
        tenantId,
        companyId: profile.company_id,
      });
    } catch (err) {
      console.error('Errore caricamento permessi:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carica i permessi all'avvio
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // ─── Helper Functions ────────────────────────────────────────────────────

  const hasTableAccess = useCallback((tableName: string): boolean => {
    if (permissions.role === 'admin') return true;
    return permissions.visibleTables.includes(tableName);
  }, [permissions.role, permissions.visibleTables]);

  const hasFeatureAccess = useCallback((featureName: string): boolean => {
    if (permissions.role === 'admin') return true;
    return permissions.enabledFeatures.includes(featureName);
  }, [permissions.role, permissions.enabledFeatures]);

  const canAccessTable = useCallback((tableName: string): boolean => {
    return hasTableAccess(tableName);
  }, [hasTableAccess]);

  const canAccessFeature = useCallback((featureName: string): boolean => {
    return hasFeatureAccess(featureName);
  }, [hasFeatureAccess]);

  return {
    permissions,
    loading,
    error,
    refresh: loadPermissions,
    hasTableAccess,
    hasFeatureAccess,
    canAccessTable,
    canAccessFeature,
  };
}