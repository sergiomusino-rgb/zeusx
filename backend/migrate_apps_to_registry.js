// Migrate existing apps to app_registry table
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ujdyqnzofclzztmppxea.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZHlxbnpvZmNsenp0bXBweGVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY4NzUyMywiZXhwIjoyMDk3MjYzNTIzfQ.3QbM-zGVpzKD7WlAXYpR7kbRdNVa5vFFC05cFeumwpY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function migrateApps() {
  console.log('🔄 Migrating existing apps to app_registry...');

  // Get all existing apps
  const { data: apps, error: appsError } = await supabase
    .from('apps')
    .select('id, name, slug, tenant_id')
    .not('slug', 'is', null);

  if (appsError) {
    console.error('❌ Error fetching apps:', appsError);
    return;
  }

  console.log(`📊 Found ${apps?.length || 0} apps to migrate`);

  for (const app of apps || []) {
    // Get the tenant owner (reseller)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('owner_id')
      .eq('id', app.tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.log(`⚠️ Skipping app ${app.name} - no tenant found`);
      continue;
    }

    const appUrl = `https://zeusx.vercel.app/a/${app.slug}`;

    // Check if already in app_registry by app_url (more reliable)
    const { data: existing } = await supabase
      .from('app_registry')
      .select('id')
      .eq('app_url', appUrl)
      .single();

    if (existing) {
      console.log(`✅ App ${app.name} already in registry`);
      continue;
    }

    // Insert into app_registry
    const { error: insertError } = await supabase
      .from('app_registry')
      .insert({
        reseller_id: tenant.owner_id,
        app_name: app.name,
        app_url: appUrl,
        status: 'active',
        monthly_fee: 0.00,
        zeusx_share: 0.00,
      });

    if (insertError) {
      console.error(`❌ Error inserting app ${app.name}:`, insertError);
    } else {
      console.log(`✅ Migrated app: ${app.name}`);
    }
  }

  console.log('✅ Migration complete!');
}

migrateApps().catch(console.error);
