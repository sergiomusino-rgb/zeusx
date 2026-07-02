-- ============================================================================
-- ZeusX - Migrazione: User Permissions personalizzate
-- Data: 2026-07-02
-- Descrizione: Tabella per permessi personalizzati per singolo utente
-- ============================================================================

DROP TABLE IF EXISTS user_permissions CASCADE;

CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  visible_tables TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  enabled_features TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Trigger per updated_at
CREATE TRIGGER tr_user_permissions_updated_at 
  BEFORE UPDATE ON user_permissions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_permissions_select" ON user_permissions 
  FOR SELECT USING (
    user_id = auth.uid() OR 
    has_table_access('profiles')
  );

CREATE POLICY "user_permissions_insert" ON user_permissions 
  FOR INSERT WITH CHECK (
    has_table_access('profiles')
  );

CREATE POLICY "user_permissions_update" ON user_permissions 
  FOR UPDATE USING (
    has_table_access('profiles')
  ) WITH CHECK (
    has_table_access('profiles')
  );

CREATE POLICY "user_permissions_delete" ON user_permissions 
  FOR DELETE USING (
    has_table_access('profiles')
  );