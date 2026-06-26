SELECT 
  t.id,
  t.plan,
  t.app_limit,
  COUNT(a.id) as apps_create,
  t.app_limit - COUNT(a.id) as slot_disponibili
FROM tenants t
LEFT JOIN apps a ON a.tenant_id = t.id
WHERE t.id = 'd3eda57f-692a-4904-ac5f-93bdaaec8ce5'
GROUP BY t.id, t.plan, t.app_limit;
