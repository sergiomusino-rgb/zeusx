const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

// POST /api/a/:slug - Client login with password
router.post('/api/a/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password richiesta' });
    }

    const supabase = getSupabase();

    // Find app by slug
    const { data: app, error } = await supabase
      .from('apps')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !app) {
      return res.status(404).json({ error: 'App non trovata' });
    }

    // Check if blocked
    if (app.client_active === false) {
      return res.json({ blocked: true });
    }

    // Check expiry
    if (app.expires_at && new Date(app.expires_at) < new Date()) {
      return res.json({ blocked: true });
    }

    // Check password
    if (app.client_password !== password) {
      return res.status(401).json({ error: 'Password errata' });
    }

    // Return app info with blueprint/config
    const appConfig = app.config || {};
    const appInfo = {
      id: app.id,
      slug: app.slug,
      appName: app.name,
      ...appConfig,
      branding: {
        company_name: appConfig.appName || app.name,
        primary_color: appConfig.branding?.primary_color || appConfig.ui?.primaryColor || '#6366f1',
        logo_url: appConfig.branding?.logo_url || appConfig.logo || '',
        theme: appConfig.branding?.theme || 'dark',
      },
    };

    return res.json({ appInfo });
  } catch (err) {
    console.error('[/api/a/:slug] error:', err);
    res.status(500).json({ error: err.message || 'Errore interno' });
  }
});

// Client auth middleware - uses password instead of JWT
async function clientAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Password mancante' });
  }

  const password = authHeader.substring(7);
  const { appId } = req.params;

  const supabase = getSupabase();

  // Verify app exists and password matches
  const { data: app, error } = await supabase
    .from('apps')
    .select('id, tenant_id, client_password, client_active, expires_at')
    .eq('id', appId)
    .single();

  if (error || !app) {
    return res.status(404).json({ error: 'App non trovata' });
  }

  if (app.client_active === false) {
    return res.status(403).json({ error: 'App bloccata' });
  }

  if (app.expires_at && new Date(app.expires_at) < new Date()) {
    return res.status(403).json({ error: 'App scaduta' });
  }

  if (app.client_password !== password) {
    return res.status(401).json({ error: 'Password errata' });
  }

  req.tenantId = app.tenant_id;
  req.appId = appId;
  req.clientPassword = password;
  next();
}

// GET /api/client/apps/:appId/records?table=clients
router.get('/api/client/apps/:appId/records', clientAuthMiddleware, async (req, res) => {
  try {
    const { table } = req.query;
    if (!table) {
      return res.status(400).json({ error: 'Parametro table obbligatorio' });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('app_records')
      .select('*')
      .eq('app_id', req.appId)
      .eq('tenant_id', req.tenantId)
      .eq('table_name', table)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET client records error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ records: data || [], count: data?.length || 0 });
  } catch (err) {
    console.error('GET client records exception:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/client/apps/:appId/records
router.post('/api/client/apps/:appId/records', clientAuthMiddleware, async (req, res) => {
  try {
    const { table, data } = req.body;
    if (!table || !data) {
      return res.status(400).json({ error: 'table e data obbligatori' });
    }

    const supabase = getSupabase();
    const { data: record, error } = await supabase
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
      console.error('POST client record error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ record });
  } catch (err) {
    console.error('POST client record exception:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/client/apps/:appId/records/:recordId
router.put('/api/client/apps/:appId/records/:recordId', clientAuthMiddleware, async (req, res) => {
  try {
    const { recordId } = req.params;
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'data obbligatorio' });
    }

    const supabase = getSupabase();
    const { data: record, error } = await supabase
      .from('app_records')
      .update({ data: data, updated_at: new Date().toISOString() })
      .eq('id', recordId)
      .eq('app_id', req.appId)
      .eq('tenant_id', req.tenantId)
      .select()
      .single();

    if (error) {
      console.error('PUT client record error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!record) {
      return res.status(404).json({ error: 'Record non trovato' });
    }

    res.json({ record });
  } catch (err) {
    console.error('PUT client record exception:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/client/apps/:appId/records/:recordId
router.delete('/api/client/apps/:appId/records/:recordId', clientAuthMiddleware, async (req, res) => {
  try {
    const { recordId } = req.params;
    const supabase = getSupabase();

    const { error } = await supabase
      .from('app_records')
      .delete()
      .eq('id', recordId)
      .eq('app_id', req.appId)
      .eq('tenant_id', req.tenantId);

    if (error) {
      console.error('DELETE client record error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE client record exception:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
