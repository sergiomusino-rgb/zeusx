const { Pool } = require('pg');
const fs = require('fs');

const sql = fs.readFileSync('c:/Users/sermu/zeusx/supabase_migrations/20260704_create_fatture_tables.sql', 'utf8');

async function run() {
  // Use direct DB connection parameters (NOT connection string which has encoding issues)
  const pool = new Pool({
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.ujdyqnzofclzztmppxea',
    password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZHlxbnpvZmNsenp0bXBweGVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY4NzUyMywiZXhwIjoyMDk3MjYzNTIzfQ.3QbM-zGVpzKD7WlAXYpR7kbRdNVa5vFFC05cFeumwpY',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to Supabase PostgreSQL');
    
    await client.query(sql);
    console.log('✅ Migration executed successfully!');
    
    // Verify
    const { rows } = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('fatture','righe_fattura')"
    );
    console.log('Tables created:', rows.map(r => r.table_name).join(', '));
    
    client.release();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  await pool.end();
}

run();