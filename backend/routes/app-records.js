const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const csv = require('csv-parser');
const { stringify } = require('csv-stringify/sync');
const stream = require('stream');

const upload = multer({ storage: multer.memoryStorage() });

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

// Middleware autenticazione
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  const token = authHeader.substring(7);
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return res.status(401).json({ error: 'Token non valido' });
  }

  req.user = user;
  req.supabase = supabase;
  next();
}

// Middleware verifica membership tenant
async function tenantMiddleware(req, res, next) {
  const { appId } = req.params;
  const supabaseAdmin = getSupabase();

  // Recupera app e verifica esista
  const { data: appData, error: appError } = await supabaseAdmin
    .from('apps')
    .select('id, tenant_id')
    .eq('id', appId)
    .single();

  if (appError || !appData) {
    return res.status(404).json({ error: 'App non trovata' });
  }

  // Verifica utente sia membro del tenant
  const { data: membership, error: memberError } = await supabaseAdmin
    .from('tenant_members')
    .select('tenant_id')
    .eq('tenant_id', appData.tenant_id)
    .eq('user_id', req.user.id)
    .single();

  if (memberError || !membership) {
    return res.status(403).json({ error: 'Non autorizzato per questo tenant' });
  }

  req.tenantId = appData.tenant_id;
  req.appId = appId;
  next();
}

// GET /api/apps/:appId/records?table=clients
router.get('/apps/:appId/records', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { table } = req.query;
    if (!table) {
      return res.status(400).json({ error: 'Parametro table obbligatorio' });
    }

    const supabaseAdmin = getSupabase();
    const { data, error } = await supabaseAdmin
      .from('app_records')
      .select('*')
      .eq('app_id', req.appId)
      .eq('tenant_id', req.tenantId)
      .eq('table_name', table)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET records error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ records: data || [], count: data?.length || 0 });
  } catch (err) {
    console.error('GET records exception:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/apps/:appId/records
router.post('/apps/:appId/records', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { table, data } = req.body;
    if (!table || !data) {
      return res.status(400).json({ error: 'table e data obbligatori' });
    }

    const supabaseAdmin = getSupabase();
    const { data: record, error } = await supabaseAdmin
      .from('app_records')
      .insert({
        app_id: req.appId,
        tenant_id: req.tenantId,
        table_name: table,
        data: data,
      })
      .select()
      .single();

    if (error) {
      console.error('POST record error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ record });
  } catch (err) {
    console.error('POST record exception:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/apps/:appId/records/:recordId
router.put('/apps/:appId/records/:recordId', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { recordId } = req.params;
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'data obbligatorio' });
    }

    const supabaseAdmin = getSupabase();
    const { data: record, error } = await supabaseAdmin
      .from('app_records')
      .update({ data: data, updated_at: new Date().toISOString() })
      .eq('id', recordId)
      .eq('app_id', req.appId)
      .eq('tenant_id', req.tenantId)
      .select()
      .single();

    if (error) {
      console.error('PUT record error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!record) {
      return res.status(404).json({ error: 'Record non trovato' });
    }

    res.json({ record });
  } catch (err) {
    console.error('PUT record exception:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/apps/:appId/records/:recordId
router.delete('/apps/:appId/records/:recordId', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { recordId } = req.params;
    const supabaseAdmin = getSupabase();

    const { error } = await supabaseAdmin
      .from('app_records')
      .delete()
      .eq('id', recordId)
      .eq('app_id', req.appId)
      .eq('tenant_id', req.tenantId);

    if (error) {
      console.error('DELETE record error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE record exception:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/apps/:appId/import
router.post('/apps/:appId/import', authMiddleware, tenantMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { table } = req.body;
    if (!table || !req.file) {
      return res.status(400).json({ error: 'table e file obbligatori' });
    }

    const records = [];
    const parser = req.file.buffer.pipe(csv());

    for await (const row of parser) {
      records.push(row);
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'File CSV vuoto' });
    }

    const supabaseAdmin = getSupabase();
    const insertData = records.map(row => ({
      app_id: req.appId,
      tenant_id: req.tenantId,
      table_name: table,
      data: row,
    }));

    const { data, error } = await supabaseAdmin
      .from('app_records')
      .insert(insertData)
      .select();

    if (error) {
      console.error('Import error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ imported: data?.length || 0 });
  } catch (err) {
    console.error('Import exception:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/apps/:appId/export?table=clients
router.get('/apps/:appId/export', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { table } = req.query;
    if (!table) {
      return res.status(400).json({ error: 'Parametro table obbligatorio' });
    }

    const supabaseAdmin = getSupabase();
    const { data, error } = await supabaseAdmin
      .from('app_records')
      .select('data')
      .eq('app_id', req.appId)
      .eq('tenant_id', req.tenantId)
      .eq('table_name', table)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Export query error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Nessun record da esportare' });
    }

    const flatData = data.map(row => row.data);
    const csvOutput = stringify(flatData, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${table}-export.csv`);
    res.send(csvOutput);
  } catch (err) {
    console.error('Export exception:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
