-- 1. Aggiungi la colonna
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS total_apps_created INTEGER NOT NULL DEFAULT 0;

-- 2. Imposta il valore corretto per il tuo account (conta le app esistenti)
UPDATE tenants
SET total_apps_created = (
  SELECT COUNT(*) FROM apps WHERE tenant_id = 'd3eda57f-692a-4904-ac5f-93bdaaec8ce5'
)
WHERE id = 'd3eda57f-692a-4904-ac5f-93bdaaec8ce5';

-- 3. Verifica
SELECT plan, app_limit, total_apps_created, 
       app_limit - total_apps_created as slot_disponibili
FROM tenants 
WHERE id = 'd3eda57f-692a-4904-ac5f-93bdaaec8ce5';
