-- ============================================================================
-- ZeusX - Script SQL MASTER per la configurazione completa del database
-- Data: 2026-06-30
-- Compatibilità: Supabase (PostgreSQL 15+)
-- Descrizione: Elimina e ricrea tutte le tabelle, funzioni, trigger e policy RLS
--              per garantire uno stato pulito e corretto del database.
--              Include anche i seed data per i blueprint.
-- ============================================================================

-- ============================================================================
-- 0. PULIZIA COMPLETA (DROP di funzioni, trigger, policy, tabelle)
--    ATTENZIONE: Questo eliminerà tutti i dati esistenti nelle tabelle!
-- ============================================================================

-- Disabilita RLS temporaneamente per facilitare il DROP
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenant_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS blueprints DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS apps DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions DISABLE ROW LEVEL SECURITY;

-- Elimina trigger (ordine inverso di creazione)
DROP TRIGGER IF EXISTS tr_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS tr_app_records_updated_at ON app_records;
DROP TRIGGER IF EXISTS tr_apps_sync_definition ON apps;
DROP TRIGGER IF EXISTS tr_app_definitions_updated_at ON app_definitions;
DROP TRIGGER IF EXISTS tr_apps_updated_at ON apps;
DROP TRIGGER IF EXISTS tr_blueprints_updated_at ON blueprints;
DROP TRIGGER IF EXISTS tr_tenants_updated_at ON tenants;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON profiles;

-- Elimina policy RLS
DROP POLICY IF EXISTS "Users view own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

DROP POLICY IF EXISTS "Tenant members view their tenants" ON tenants;
DROP POLICY IF EXISTS "Tenant owners can update their tenants" ON tenants;
DROP POLICY IF EXISTS "Tenant owners can delete their tenants" ON tenants;
DROP POLICY IF EXISTS "Authenticated users can insert tenants" ON tenants;
DROP POLICY IF EXISTS "tenants_select_member" ON tenants;
DROP POLICY IF EXISTS "tenants_update_owner" ON tenants;
DROP POLICY IF EXISTS "tenants_delete_owner" ON tenants;
DROP POLICY IF EXISTS "tenants_insert_authenticated" ON tenants;

DROP POLICY IF EXISTS "Users view their own memberships" ON tenant_members;
DROP POLICY IF EXISTS "Tenant owners can manage members" ON tenant_members;
DROP POLICY IF EXISTS "tenant_members_select_own" ON tenant_members; -- Questa era la policy problematica
DROP POLICY IF EXISTS "tenant_members_manage_owner" ON tenant_members;

DROP POLICY IF EXISTS "Everyone can view blueprints" ON blueprints;
DROP POLICY IF EXISTS "Service role can manage blueprints" ON blueprints;
DROP POLICY IF EXISTS "blueprints_select_public" ON blueprints;
DROP POLICY IF EXISTS "blueprints_manage_service_role" ON blueprints;

DROP POLICY IF EXISTS "Tenant members access their apps" ON apps;
DROP POLICY IF EXISTS "apps_select_tenant_member" ON apps;
DROP POLICY IF EXISTS "apps_insert_tenant_member" ON apps;
DROP POLICY IF EXISTS "apps_update_tenant_member" ON apps;
DROP POLICY IF EXISTS "apps_delete_tenant_member" ON apps;

DROP POLICY IF EXISTS "Tenant members access their app definitions" ON app_definitions;
DROP POLICY IF EXISTS "app_definitions_select_tenant_member" ON app_definitions;
DROP POLICY IF EXISTS "app_definitions_insert_tenant_member" ON app_definitions;
DROP POLICY IF EXISTS "app_definitions_update_tenant_member" ON app_definitions;
DROP POLICY IF EXISTS "app_definitions_delete_tenant_member" ON app_definitions;

DROP POLICY IF EXISTS "Tenant members access their app records" ON app_records;
DROP POLICY IF EXISTS "app_records_select_tenant_member" ON app_records;
DROP POLICY IF EXISTS "app_records_insert_tenant_member" ON app_records;
DROP POLICY IF EXISTS "app_records_update_tenant_member" ON app_records;
DROP POLICY IF EXISTS "app_records_delete_tenant_member" ON app_records;

DROP POLICY IF EXISTS "Tenant members view their subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role manages subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_tenant_member" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_manage_service_role" ON subscriptions;


-- Elimina tabelle (ordine inverso di dipendenza)
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS app_records CASCADE;
DROP TABLE IF EXISTS app_definitions CASCADE;
DROP TABLE IF EXISTS apps CASCADE;
DROP TABLE IF EXISTS blueprints CASCADE;
DROP TABLE IF EXISTS tenant_members CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Elimina funzioni
DROP FUNCTION IF EXISTS public.sync_app_definition_from_config();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.get_my_tenant_ids(); -- Se questa funzione esiste ancora nel DB

-- ============================================================================
-- 1. FUNZIONI DI UTILITÀ
-- ============================================================================

-- Funzione per aggiornare automaticamente il campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funzione per creare il profilo automatico al primo accesso E il tenant
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
  user_email TEXT;
BEGIN
  -- Inserisci il profilo utente
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  -- Ottieni l'email dell'utente per il nome del tenant
  user_email := NEW.email;

  -- Crea un nuovo tenant di default per l'utente
  INSERT INTO public.tenants (owner_id, name, slug)
  VALUES (NEW.id, user_email || '''s Workspace', REPLACE(user_email, '@', '-') || '-workspace') -- Esempio di nome e slug
  RETURNING id INTO new_tenant_id;

  -- Aggiungi l'utente come owner del nuovo tenant
  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (new_tenant_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per sincronizzare schema da apps.config a app_definitions
CREATE OR REPLACE FUNCTION sync_app_definition_from_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_definitions (app_id, tenant_id, schema, ui_config, is_published)
  VALUES (
    NEW.id,
    NEW.tenant_id,
    COALESCE(NEW.config->'schema', NEW.config->'blueprint'->'schema', '{"tables": []}'::jsonb),
    COALESCE(NEW.config->'ui', NEW.config->'branding', '{}'::jsonb),
    COALESCE((NEW.config->>'is_published')::boolean, false)
  )
  ON CONFLICT (app_id) DO UPDATE SET
    schema = EXCLUDED.schema,
    ui_config = EXCLUDED.ui_config,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. CREAZIONE TABELLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE profiles IS 'Profili utente pubblici associati a Supabase Auth. Creati automaticamente al primo accesso.';
COMMENT ON COLUMN profiles.user_id IS 'Riferimento all''utente Supabase Auth (1:1)';
COMMENT ON COLUMN profiles.email IS 'Email dell''utente (sincronizzata da auth.users)';
COMMENT ON COLUMN profiles.full_name IS 'Nome completo visualizzato dell''utente';

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'business')),
  app_limit INT NOT NULL DEFAULT 1,
  total_apps_created INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE tenants IS 'Organizzazioni/workspace multi-tenant. Ogni utente può appartenere a uno o più tenant.';
COMMENT ON COLUMN tenants.owner_id IS 'Utente proprietario del tenant (creatore)';
COMMENT ON COLUMN tenants.name IS 'Nome dell''organizzazione/tenant';
COMMENT ON COLUMN tenants.slug IS 'Slug univoco per URL e riferimenti';
COMMENT ON COLUMN tenants.plan IS 'Piano di abbonamento: free, starter, pro, business';
COMMENT ON COLUMN tenants.app_limit IS 'Numero massimo di app attive creabili';
COMMENT ON COLUMN tenants.total_apps_created IS 'Contatore permanente di tutte le app create (non decrementa mai)';

CREATE TABLE IF NOT EXISTS tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

COMMENT ON TABLE tenant_members IS 'Associazione molti-a-molti tra utenti e tenant con ruolo.';
COMMENT ON COLUMN tenant_members.tenant_id IS 'Riferimento al tenant';
COMMENT ON COLUMN tenant_members.user_id IS 'Riferimento all''utente';
COMMENT ON COLUMN tenant_members.role IS 'Ruolo nel tenant: owner, admin, member';

CREATE TABLE IF NOT EXISTS blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  ui_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE blueprints IS 'Catalogo di template/blueprint per settori merceologici. Ogni blueprint definisce lo schema dati e la UI di un''app.';
COMMENT ON COLUMN blueprints.sector IS 'Settore in kebab-case (es. oculista, officina, ristorante)';
COMMENT ON COLUMN blueprints.display_name IS 'Nome visualizzato del settore (es. Studio Oculistico)';
COMMENT ON COLUMN blueprints.description IS 'Descrizione del gestionale per questo settore';
COMMENT ON COLUMN blueprints.schema IS 'Schema JSON con definizione tabelle, campi, tipi, relazioni';
COMMENT ON COLUMN blueprints.ui_config IS 'Configurazione UI: primaryColor, sidebar, dashboardCards';

CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  blueprint_id UUID REFERENCES blueprints(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_password TEXT,
  client_email TEXT,
  client_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  expiry_warning_sent BOOLEAN NOT NULL DEFAULT false,
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE apps IS 'App generate dagli utenti a partire dai blueprint. Contiene la configurazione completa e i dati di accesso client.';
COMMENT ON COLUMN apps.tenant_id IS 'Tenant proprietario dell''app';
COMMENT ON COLUMN apps.blueprint_id IS 'Blueprint di origine (può essere NULL se generato da AI)';
COMMENT ON COLUMN apps.name IS 'Nome dell''app';
COMMENT ON COLUMN apps.slug IS 'Slug univoco per URL pubblico (/a/:slug)';
COMMENT ON COLUMN apps.config IS 'Configurazione completa: schema, ui, blueprint, branding, logo, prompt';
COMMENT ON COLUMN apps.client_password IS 'Password per accesso client all''app pubblica';
COMMENT ON COLUMN apps.client_email IS 'Email del cliente principale associato all''app';
COMMENT ON COLUMN apps.client_active IS 'Se true, l''app è attiva e accessibile ai clienti';
COMMENT ON COLUMN apps.expires_at IS 'Data di scadenza dell''abbonamento dell''app';
COMMENT ON COLUMN apps.expiry_warning_sent IS 'Flag: avviso di scadenza già inviato al cliente';
COMMENT ON COLUMN apps.trial_ends_at IS 'Data fine del periodo di prova (default 30 giorni dalla creazione)';
COMMENT ON COLUMN apps.is_active IS 'Se false, l''app è disattivata (non accessibile)';

CREATE TABLE IF NOT EXISTS app_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  schema JSONB NOT NULL DEFAULT '{"tables": []}'::jsonb,
  ui_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id)
);

COMMENT ON TABLE app_definitions IS 'Definizioni di schema e UI per app generate, separato dalla config per versioning e caching.';
COMMENT ON COLUMN app_definitions.app_id IS 'Riferimento all''app (1:1)';
COMMENT ON COLUMN app_definitions.tenant_id IS 'Riferimento al tenant per RLS';
COMMENT ON COLUMN app_definitions.schema IS 'Schema JSON con definizione tabelle, campi, tipi, relazioni';
COMMENT ON COLUMN app_definitions.ui_config IS 'Configurazione UI: colori, layout, sidebar, dashboard cards';
COMMENT ON COLUMN app_definitions.version IS 'Versione incrementale dello schema per tracciare modifiche';
COMMENT ON COLUMN app_definitions.is_published IS 'Se true, la definizione è pubblicata e visibile ai client dell''app';

CREATE TABLE IF NOT EXISTS app_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE app_records IS 'Storage ibrido JSONB per i record delle app generate. Ogni riga rappresenta un record di una tabella dinamica.';
COMMENT ON COLUMN app_records.app_id IS 'Riferimento all''app proprietaria';
COMMENT ON COLUMN app_records.tenant_id IS 'Riferimento al tenant per RLS e isolamento';
COMMENT ON COLUMN app_records.table_name IS 'Nome della tabella logica (es. patients, appointments, vehicles)';
COMMENT ON COLUMN app_records.data IS 'Dati del record in formato JSONB, struttura adattiva allo schema del blueprint';

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN ('free', 'starter', 'pro', 'business', 'incomplete', 'active', 'past_due', 'canceled', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE subscriptions IS 'Abbonamenti Stripe associati ai tenant. Relazione 1:1 con tenants.';
COMMENT ON COLUMN subscriptions.tenant_id IS 'Riferimento al tenant (UNIQUE: 1:1)';
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'ID cliente Stripe (cus_xxx)';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'ID subscription Stripe (sub_xxx)';
COMMENT ON COLUMN subscriptions.status IS 'Stato subscription: incomplete, active, past_due, canceled, trialing';
COMMENT ON COLUMN subscriptions.current_period_start IS 'Inizio del periodo di fatturazione corrente';
COMMENT ON COLUMN subscriptions.current_period_end IS 'Fine del periodo di fatturazione corrente';

-- ============================================================================
-- 3. CREAZIONE INDICI
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_sector ON blueprints(sector);
CREATE INDEX IF NOT EXISTS idx_blueprints_schema ON blueprints USING GIN (schema);
CREATE INDEX IF NOT EXISTS idx_apps_tenant_id ON apps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_apps_blueprint_id ON apps(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_apps_slug ON apps(slug);
CREATE INDEX IF NOT EXISTS idx_apps_client_email ON apps(client_email);
CREATE INDEX IF NOT EXISTS idx_apps_expires_at ON apps(expires_at);
CREATE INDEX IF NOT EXISTS idx_apps_is_active ON apps(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_apps_client_active ON apps(client_active) WHERE client_active = true;
CREATE INDEX IF NOT EXISTS idx_app_definitions_app_id ON app_definitions(app_id);
CREATE INDEX IF NOT EXISTS idx_app_definitions_tenant_id ON app_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_definitions_published ON app_definitions(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_app_definitions_schema ON app_definitions USING GIN (schema);
CREATE INDEX IF NOT EXISTS idx_app_records_app_id ON app_records(app_id);
CREATE INDEX IF NOT EXISTS idx_app_records_tenant_id ON app_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_records_table_name ON app_records(table_name);
CREATE INDEX IF NOT EXISTS idx_app_records_app_table ON app_records(app_id, table_name);
CREATE INDEX IF NOT EXISTS idx_app_records_data ON app_records USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================================================
-- 4. CREAZIONE TRIGGER
-- ============================================================================

-- Trigger updated_at per profiles
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger auto-creazione profilo e tenant su nuovo utente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger updated_at per tenants
CREATE TRIGGER tr_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger updated_at per blueprints
CREATE TRIGGER tr_blueprints_updated_at
  BEFORE UPDATE ON blueprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger updated_at per apps
CREATE TRIGGER tr_apps_updated_at
  BEFORE UPDATE ON apps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger updated_at per app_definitions
CREATE TRIGGER tr_app_definitions_updated_at
  BEFORE UPDATE ON app_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger auto-sync da apps.config a app_definitions
CREATE TRIGGER tr_apps_sync_definition
  AFTER INSERT ON apps
  FOR EACH ROW EXECUTE FUNCTION sync_app_definition_from_config();

-- Trigger updated_at per app_records
CREATE TRIGGER tr_app_records_updated_at
  BEFORE UPDATE ON app_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger updated_at per subscriptions
CREATE TRIGGER tr_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Abilita RLS su tutte le tabelle
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICY RLS: profiles
-- ============================================================================

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- POLICY RLS: tenants
-- ============================================================================

CREATE POLICY "tenants_select_member" ON tenants FOR SELECT USING (id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "tenants_insert_authenticated" ON tenants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());
CREATE POLICY "tenants_update_owner" ON tenants FOR UPDATE USING (id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner')) WITH CHECK (id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner'));
CREATE POLICY "tenants_delete_owner" ON tenants FOR DELETE USING (id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner'));

-- ============================================================================
-- POLICY RLS: tenant_members
-- ============================================================================

CREATE POLICY "tenant_members_select_own" ON tenant_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "tenant_members_manage_owner" ON tenant_members FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================================================
-- POLICY RLS: blueprints
-- ============================================================================

CREATE POLICY "blueprints_select_public" ON blueprints FOR SELECT USING (true);
CREATE POLICY "blueprints_manage_service_role" ON blueprints FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- POLICY RLS: apps
-- ============================================================================

CREATE POLICY "apps_select_tenant_member" ON apps FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "apps_insert_tenant_member" ON apps FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "apps_update_tenant_member" ON apps FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())) WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "apps_delete_tenant_member" ON apps FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- ============================================================================
-- POLICY RLS: app_definitions
-- ============================================================================

CREATE POLICY "app_definitions_select_tenant_member" ON app_definitions FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "app_definitions_insert_tenant_member" ON app_definitions FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "app_definitions_update_tenant_member" ON app_definitions FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())) WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "app_definitions_delete_tenant_member" ON app_definitions FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- ============================================================================
-- POLICY RLS: app_records
-- ============================================================================

CREATE POLICY "app_records_select_tenant_member" ON app_records FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "app_records_insert_tenant_member" ON app_records FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "app_records_update_tenant_member" ON app_records FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())) WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "app_records_delete_tenant_member" ON app_records FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- ============================================================================
-- POLICY RLS: subscriptions
-- ============================================================================

CREATE POLICY "subscriptions_select_tenant_member" ON subscriptions FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "subscriptions_manage_service_role" ON subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. SEED DATA: Blueprint di esempio
-- ============================================================================

-- Blueprint: Studio Oculistico
INSERT INTO blueprints (sector, display_name, description, schema, ui_config)
VALUES (
  'oculista',
  'Studio Oculistico',
  'Gestionale per studi oculistici: pazienti, appuntamenti, refrazioni, prescrizioni lenti.',
  '{"tables": [{"name": "patients", "label": "Paziente", "labelPlural": "Pazienti", "icon": "👁️", "fields": [{"id": "first_name", "type": "text", "label": "Nome", "required": true}, {"id": "last_name", "type": "text", "label": "Cognome", "required": true}, {"id": "phone", "type": "phone", "label": "Telefono", "required": false}, {"id": "email", "type": "email", "label": "Email", "required": false}, {"id": "birth_date", "type": "date", "label": "Data di nascita", "required": false}]}, {"name": "appointments", "label": "Appuntamento", "labelPlural": "Appuntamenti", "icon": "📅", "fields": [{"id": "patient_id", "type": "relation", "label": "Paziente", "target": "patients", "targetLabel": "last_name", "required": true}, {"id": "date", "type": "datetime", "label": "Data e ora", "required": true}, {"id": "type", "type": "select", "label": "Tipo visita", "options": ["Prima visita", "Controllo", "Urgenza", "Lenti a contatto"], "required": true}, {"id": "notes", "type": "textarea", "label": "Note", "required": false}]}]}',
  '{"primaryColor": "#6366f1", "sidebar": ["patients", "appointments"], "dashboardCards": [{"type": "count", "table": "patients", "label": "Pazienti totali"}, {"type": "count", "table": "appointments", "label": "Appuntamenti oggi"}]}'
)
ON CONFLICT (sector) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  schema = EXCLUDED.schema,
  ui_config = EXCLUDED.ui_config,
  updated_at = NOW();

-- Blueprint: Officina Meccanica
INSERT INTO blueprints (sector, display_name, description, schema, ui_config)
VALUES (
  'officina',
  'Officina Meccanica',
  'Gestionale per officine: clienti, veicoli, lavorazioni, preventivi, fatture.',
  '{"tables": [{"name": "customers", "label": "Cliente", "labelPlural": "Clienti", "icon": "👤", "fields": [{"id": "name", "type": "text", "label": "Ragione Sociale", "required": true}, {"id": "phone", "type": "phone", "label": "Telefono", "required": false}, {"id": "email", "type": "email", "label": "Email", "required": false}, {"id": "address", "type": "textarea", "label": "Indirizzo", "required": false}]}, {"name": "vehicles", "label": "Veicolo", "labelPlural": "Veicoli", "icon": "🚗", "fields": [{"id": "customer_id", "type": "relation", "label": "Cliente", "target": "customers", "targetLabel": "name", "required": true}, {"id": "plate", "type": "text", "label": "Targa", "required": true}, {"id": "brand", "type": "text", "label": "Marca", "required": false}, {"id": "model", "type": "text", "label": "Modello", "required": false}, {"id": "year", "type": "number", "label": "Anno", "required": false}]}, {"name": "jobs", "label": "Lavorazione", "labelPlural": "Lavorazioni", "icon": "🔧", "fields": [{"id": "vehicle_id", "type": "relation", "label": "Veicolo", "target": "vehicles", "targetLabel": "plate", "required": true}, {"id": "description", "type": "textarea", "label": "Descrizione", "required": true}, {"id": "status", "type": "select", "label": "Stato", "options": ["In attesa", "In corso", "Completata", "Consegnata"], "required": true}, {"id": "cost", "type": "currency", "label": "Costo", "required": false}]}]}',
  '{"primaryColor": "#f59e0b", "sidebar": ["customers", "vehicles", "jobs"], "dashboardCards": [{"type": "count", "table": "customers", "label": "Clienti"}, {"type": "count", "table": "jobs", "label": "Lavorazioni in corso"}]}'
)
ON CONFLICT (sector) DO UPDATE SET
  display_name = EX