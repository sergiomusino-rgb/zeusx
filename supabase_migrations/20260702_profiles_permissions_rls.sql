-- ============================================================================
-- ZeusX - Migrazione: Gerarchia Aziendale, Permessi e RLS Avanzata
-- Data: 2026-07-02
-- Descrizione: 
--   1. Aggiunge colonne role e company_id a profiles
--   2. Crea tabella permissions_config per gestione permessi basati su ruolo
--   3. Seed del ruolo Admin con accesso totale
--   4. Riscrive tutte le policy RLS per delegare i permessi a permissions_config
-- ============================================================================

-- ============================================================================
-- 1. AGGIUNTA COLONNE A profiles
-- ============================================================================

-- Aggiungi colonna role se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'member' 
      CHECK (role IN ('admin', 'manager', 'editor', 'viewer', 'member'));
  END IF;
END $$;

-- Aggiungi colonna company_id se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 2. CREAZIONE TABELLA permissions_config
-- ============================================================================

-- Drop esistente se presente (per idempotenza)
DROP TABLE IF EXISTS permissions_config CASCADE;

CREATE TABLE permissions_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL UNIQUE CHECK (role IN ('admin', 'manager', 'editor', 'viewer', 'member')),
  visible_tables TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  enabled_features TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger per updated_at
CREATE TRIGGER tr_permissions_config_updated_at 
  BEFORE UPDATE ON permissions_config 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. SEED: RUOLI E PERMESSI DEFAULT
-- ============================================================================

-- Admin: accesso totale a tutto
INSERT INTO permissions_config (role, visible_tables, enabled_features, description) VALUES
('admin', 
  ARRAY['profiles', 'tenants', 'tenant_members', 'blueprints', 'apps', 'app_definitions', 'app_records', 'subscriptions', 'permissions_config'],
  ARRAY['create_app', 'edit_app', 'delete_app', 'manage_members', 'manage_billing', 'manage_permissions', 'export_data', 'import_data', 'view_analytics', 'manage_settings', 'manage_company'],
  'Amministratore con accesso completo a tutte le tabelle e funzionalità'
),
('manager',
  ARRAY['profiles', 'tenants', 'tenant_members', 'blueprints', 'apps', 'app_definitions', 'app_records', 'subscriptions'],
  ARRAY['create_app', 'edit_app', 'delete_app', 'manage_members', 'export_data', 'import_data', 'view_analytics', 'manage_settings'],
  'Manager con accesso esteso ma non alla configurazione permessi'
),
('editor',
  ARRAY['profiles', 'apps', 'app_definitions', 'app_records', 'blueprints'],
  ARRAY['create_app', 'edit_app', 'export_data', 'import_data', 'view_analytics'],
  'Editor può creare e modificare app e dati'
),
('viewer',
  ARRAY['profiles', 'apps', 'app_records', 'blueprints'],
  ARRAY['view_analytics', 'export_data'],
  'Solo visualizzazione dati ed esportazione'
),
('member',
  ARRAY['profiles', 'apps', 'app_records'],
  ARRAY['view_analytics'],
  'Membro base con accesso limitato'
)
ON CONFLICT (role) DO UPDATE SET 
  visible_tables = EXCLUDED.visible_tables,
  enabled_features = EXCLUDED.enabled_features,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- 4. FUNZIONE: Verifica permesso su tabella
-- ============================================================================

-- Crea o sostituisce la funzione per verificare se un utente ha accesso a una tabella
CREATE OR REPLACE FUNCTION public.has_table_access(table_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  allowed_tables TEXT[];
  is_admin BOOLEAN;
BEGIN
  -- Ottieni il ruolo dell'utente loggato dalla tabella profiles
  SELECT p.role INTO user_role
  FROM profiles p
  WHERE p.user_id = auth.uid();
  
  -- Se non trovato, nega accesso
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Admin ha sempre accesso a TUTTO
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Ottieni le tabelle visibili per questo ruolo
  SELECT pc.visible_tables INTO allowed_tables
  FROM permissions_config pc
  WHERE pc.role = user_role;
  
  -- Se il ruolo non è configurato, nega accesso
  IF allowed_tables IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verifica se la tabella è nella lista delle tabelle visibili
  RETURN table_name = ANY(allowed_tables);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Crea o sostituisce la funzione per verificare se un utente ha una feature abilitata
CREATE OR REPLACE FUNCTION public.has_feature_access(feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  allowed_features TEXT[];
BEGIN
  -- Ottieni il ruolo dell'utente loggato
  SELECT p.role INTO user_role
  FROM profiles p
  WHERE p.user_id = auth.uid();
  
  -- Se non trovato, nega accesso
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Admin ha sempre accesso a TUTTO
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Ottieni le feature abilitate per questo ruolo
  SELECT pc.enabled_features INTO allowed_features
  FROM permissions_config pc
  WHERE pc.role = user_role;
  
  -- Se il ruolo non è configurato, nega accesso
  IF allowed_features IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verifica se la feature è nella lista delle feature abilitate
  RETURN feature_name = ANY(allowed_features);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 5. NUOVE POLICY RLS - BASATE SU permissions_config
-- ============================================================================

-- Disabilita RLS su tutte le tabelle per ricreare le policy
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenant_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS blueprints DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS apps DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS permissions_config DISABLE ROW LEVEL SECURITY;

-- Drop policy esistenti
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
DROP POLICY IF EXISTS "tenants_select_member" ON tenants;
DROP POLICY IF EXISTS "tenants_insert_authenticated" ON tenants;
DROP POLICY IF EXISTS "tenants_update_owner" ON tenants;
DROP POLICY IF EXISTS "tenants_delete_owner" ON tenants;
DROP POLICY IF EXISTS "tenant_members_select_own" ON tenant_members;
DROP POLICY IF EXISTS "tenant_members_manage_owner" ON tenant_members;
DROP POLICY IF EXISTS "blueprints_select_public" ON blueprints;
DROP POLICY IF EXISTS "blueprints_manage_service_role" ON blueprints;
DROP POLICY IF EXISTS "apps_select_tenant_member" ON apps;
DROP POLICY IF EXISTS "apps_insert_tenant_member" ON apps;
DROP POLICY IF EXISTS "apps_update_tenant_member" ON apps;
DROP POLICY IF EXISTS "apps_delete_tenant_member" ON apps;
DROP POLICY IF EXISTS "app_definitions_select_tenant_member" ON app_definitions;
DROP POLICY IF EXISTS "app_definitions_insert_tenant_member" ON app_definitions;
DROP POLICY IF EXISTS "app_definitions_update_tenant_member" ON app_definitions;
DROP POLICY IF EXISTS "app_definitions_delete_tenant_member" ON app_definitions;
DROP POLICY IF EXISTS "app_records_select_tenant_member" ON app_records;
DROP POLICY IF EXISTS "app_records_insert_tenant_member" ON app_records;
DROP POLICY IF EXISTS "app_records_update_tenant_member" ON app_records;
DROP POLICY IF EXISTS "app_records_delete_tenant_member" ON app_records;
DROP POLICY IF EXISTS "subscriptions_select_tenant_member" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_manage_service_role" ON subscriptions;

-- ==============================
-- POLICY: profiles
-- ==============================
-- Un utente vede solo i profili se ha accesso alla tabella 'profiles' 
-- oppure è il proprio profilo
CREATE POLICY "profiles_select" ON profiles 
  FOR SELECT USING (
    user_id = auth.uid() OR 
    has_table_access('profiles')
  );

CREATE POLICY "profiles_insert" ON profiles 
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    has_table_access('profiles')
  );

CREATE POLICY "profiles_update" ON profiles 
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    has_table_access('profiles')
  ) WITH CHECK (
    user_id = auth.uid() OR 
    has_table_access('profiles')
  );

CREATE POLICY "profiles_delete" ON profiles 
  FOR DELETE USING (
    user_id = auth.uid() OR 
    has_table_access('profiles')
  );

-- ==============================
-- POLICY: tenants
-- ==============================
-- Un utente vede i tenant se è membro oppure ha accesso alla tabella 'tenants'
CREATE POLICY "tenants_select" ON tenants 
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
    has_table_access('tenants')
  );

CREATE POLICY "tenants_insert" ON tenants 
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (owner_id = auth.uid() OR has_table_access('tenants'))
  );

CREATE POLICY "tenants_update" ON tenants 
  FOR UPDATE USING (
    has_table_access('tenants') OR
    (id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner'))
  ) WITH CHECK (
    has_table_access('tenants') OR
    (id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner'))
  );

CREATE POLICY "tenants_delete" ON tenants 
  FOR DELETE USING (
    has_table_access('tenants') OR
    (id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner'))
  );

-- ==============================
-- POLICY: tenant_members
-- ==============================
CREATE POLICY "tenant_members_select" ON tenant_members 
  FOR SELECT USING (
    user_id = auth.uid() OR 
    has_table_access('tenant_members')
  );

CREATE POLICY "tenant_members_insert" ON tenant_members 
  FOR INSERT WITH CHECK (
    has_table_access('tenant_members') OR
    (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner'))
  );

CREATE POLICY "tenant_members_update" ON tenant_members 
  FOR UPDATE USING (
    has_table_access('tenant_members') OR
    (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner'))
  ) WITH CHECK (
    has_table_access('tenant_members') OR
    (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner'))
  );

CREATE POLICY "tenant_members_delete" ON tenant_members 
  FOR DELETE USING (
    has_table_access('tenant_members') OR
    (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner'))
  );

-- ==============================
-- POLICY: blueprints
-- ==============================
-- I blueprint sono pubblici in lettura, ma la gestione richiede permessi
CREATE POLICY "blueprints_select" ON blueprints 
  FOR SELECT USING (
    true  -- I blueprint sono pubblici in lettura
  );

CREATE POLICY "blueprints_insert" ON blueprints 
  FOR INSERT WITH CHECK (
    has_table_access('blueprints')
  );

CREATE POLICY "blueprints_update" ON blueprints 
  FOR UPDATE USING (
    has_table_access('blueprints')
  ) WITH CHECK (
    has_table_access('blueprints')
  );

CREATE POLICY "blueprints_delete" ON blueprints 
  FOR DELETE USING (
    has_table_access('blueprints')
  );

-- ==============================
-- POLICY: apps
-- ==============================
CREATE POLICY "apps_select" ON apps 
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
    has_table_access('apps')
  );

CREATE POLICY "apps_insert" ON apps 
  FOR INSERT WITH CHECK (
    has_feature_access('create_app') AND (
      tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
      has_table_access('apps')
    )
  );

CREATE POLICY "apps_update" ON apps 
  FOR UPDATE USING (
    has_feature_access('edit_app') AND (
      tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
      has_table_access('apps')
    )
  ) WITH CHECK (
    has_feature_access('edit_app') AND (
      tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
      has_table_access('apps')
    )
  );

CREATE POLICY "apps_delete" ON apps 
  FOR DELETE USING (
    has_feature_access('delete_app') AND (
      tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
      has_table_access('apps')
    )
  );

-- ==============================
-- POLICY: app_definitions
-- ==============================
CREATE POLICY "app_definitions_select" ON app_definitions 
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
    has_table_access('app_definitions')
  );

CREATE POLICY "app_definitions_insert" ON app_definitions 
  FOR INSERT WITH CHECK (
    has_feature_access('edit_app') AND (
      tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
      has_table_access('app_definitions')
    )
  );

CREATE POLICY "app_definitions_update" ON app_definitions 
  FOR UPDATE USING (
    has_feature_access('edit_app') AND (
      tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
      has_table_access('app_definitions')
    )
  ) WITH CHECK (
    has_feature_access('edit_app') AND (
      tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
      has_table_access('app_definitions')
    )
  );

CREATE POLICY "app_definitions_delete" ON app_definitions 
  FOR DELETE USING (
    has_feature_access('delete_app') AND (
      tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
      has_table_access('app_definitions')
    )
  );

-- ==============================
-- POLICY: app_records
-- ==============================
CREATE POLICY "app_records_select" ON app_records 
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
    has_table_access('app_records')
  );

CREATE POLICY "app_records_insert" ON app_records 
  FOR INSERT WITH CHECK (
    has_feature_access('edit_app') AND (
      tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
      has_table_access('app_records')
    )
  );

CREATE POLICY "app_records_update" ON app_records 
  FOR UPDATE USING (
    has_feature_access('edit_app') AND (
      tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
      has_table_access('app_records')
    )
  ) WITH CHECK (
    has_feature_access('edit_app') AND (
      tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
      has_table_access('app_records')
    )
  );

CREATE POLICY "app_records_delete" ON app_records 
  FOR DELETE USING (
    has_feature_access('delete_app') AND (
      tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
      has_table_access('app_records')
    )
  );

-- ==============================
-- POLICY: subscriptions
-- ==============================
CREATE POLICY "subscriptions_select" ON subscriptions 
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()) OR
    has_table_access('subscriptions')
  );

CREATE POLICY "subscriptions_insert" ON subscriptions 
  FOR INSERT WITH CHECK (
    has_table_access('subscriptions')
  );

CREATE POLICY "subscriptions_update" ON subscriptions 
  FOR UPDATE USING (
    has_table_access('subscriptions')
  ) WITH CHECK (
    has_table_access('subscriptions')
  );

CREATE POLICY "subscriptions_delete" ON subscriptions 
  FOR DELETE USING (
    has_table_access('subscriptions')
  );

-- ==============================
-- POLICY: permissions_config
-- ==============================
-- Solo admin e chi ha il permesso 'manage_permissions' può gestire questa tabella
CREATE POLICY "permissions_config_select" ON permissions_config 
  FOR SELECT USING (
    has_table_access('permissions_config')
  );

CREATE POLICY "permissions_config_insert" ON permissions_config 
  FOR INSERT WITH CHECK (
    has_feature_access('manage_permissions') AND
    has_table_access('permissions_config')
  );

CREATE POLICY "permissions_config_update" ON permissions_config 
  FOR UPDATE USING (
    has_feature_access('manage_permissions') AND
    has_table_access('permissions_config')
  ) WITH CHECK (
    has_feature_access('manage_permissions') AND
    has_table_access('permissions_config')
  );

CREATE POLICY "permissions_config_delete" ON permissions_config 
  FOR DELETE USING (
    has_feature_access('manage_permissions') AND
    has_table_access('permissions_config')
  );

-- ============================================================================
-- 6. RIABILITA RLS SU TUTTE LE TABELLE
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions_config ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. AGGIORNA PROFILI ESISTENTI: imposta admin per l'utente proprietario
--    (identificato dall'admin userId specificato nell'architectural config)
-- ============================================================================

-- Setta come admin l'utente specificato nella configurazione
UPDATE profiles 
SET role = 'admin' 
WHERE user_id IN (
  SELECT owner_id FROM tenants 
  WHERE owner_id = user_id
)
AND role = 'member';

-- Per i proprietari di tenant (owner in tenant_members), setta ruolo admin
UPDATE profiles 
SET role = 'admin' 
WHERE user_id IN (
  SELECT user_id FROM tenant_members WHERE role = 'owner'
)
AND (role IS NULL OR role = 'member');

-- ============================================================================
-- FINE MIGRAZIONE
-- ============================================================================