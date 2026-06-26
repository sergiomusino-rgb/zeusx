-- Verifica stato attuale delle app
SELECT 
  a.id,
  a.name,
  a.created_at,
  a.trial_ends_at,
  a.is_active
FROM apps a
WHERE a.tenant_id = 'd3eda57f-692a-4904-ac5f-93bdaaec8ce5'
ORDER BY a.created_at DESC;

-- Conteggio totale
SELECT COUNT(*) as totale_app FROM apps WHERE tenant_id = 'd3eda57f-692a-4904-ac5f-93bdaaec8ce5';

-- Verifica limite piano
SELECT id, plan, app_limit FROM tenants WHERE id = 'd3eda57f-692a-4904-ac5f-93bdaaec8ce5';
