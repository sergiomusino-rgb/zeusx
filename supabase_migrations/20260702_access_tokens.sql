-- ============================================================================
-- ZeusX - Migrazione: Access Tokens per Staff Manager
-- Data: 2026-07-02
-- Descrizione: Tabella per i token di accesso generati dallo Staff Manager
-- ============================================================================

-- Drop esistente se presente
DROP TABLE IF EXISTS access_tokens CASCADE;

CREATE TABLE access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

-- Indice per ricerca veloce token
CREATE INDEX idx_access_tokens_token ON access_tokens(token);
CREATE INDEX idx_access_tokens_profile ON access_tokens(profile_id);