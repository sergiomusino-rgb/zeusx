// Apply app_registry migration to Supabase
const fs = require('fs');
const path = require('path');

// Read the migration file
const migrationPath = path.join(__dirname, '..', 'supabase_migrations', '20260714_create_app_registry_table.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

async function main() {
  const SUPABASE_URL = 'https://ujdyqnzofclzztmppxea.supabase.co';
  const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZHlxbnpvZmNsenp0bXBweGVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY4NzUyMywiZXhwIjoyMDk3MjYzNTIzfQ.3QbM-zGVpzKD7WlAXYpR7kbRdNVa5vFFC05cFeumwpY';

  console.log('📤 Applying app_registry migration to Supabase...');
  console.log('SQL length:', sql.length, 'bytes');

  // Use the Supabase SQL endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  });

  if (response.ok) {
    console.log('✅ Migrazione app_registry eseguita con successo!');
  } else {
    const text = await response.text();
    console.log('❌ Errore:', response.status, text);
    
    // Try alternative: use the database.sql endpoint
    console.log('\n🔄 Tentativo con endpoint alternativo...');
    const altResponse = await fetch(`${SUPABASE_URL}/database.sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (altResponse.ok) {
      console.log('✅ Migrazione eseguita con endpoint alternativo!');
    } else {
      const altText = await altResponse.text();
      console.log('❌ Errore anche con endpoint alternativo:', altResponse.status, altText);
    }
  }
}

main().catch(console.error);