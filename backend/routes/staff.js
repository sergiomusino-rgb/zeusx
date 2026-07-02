const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

function getSupabaseAuth(token) {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

// Middleware: verifica che l'utente sia admin
async function adminMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  const token = authHeader.substring(7);
  const supabase = getSupabaseAuth(token);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return res.status(401).json({ error: 'Token non valido' });
  }

  // Verifica che l'utente sia admin nella tabella profiles
  const supabaseAdmin = getSupabase();
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, tenant_id')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return res.status(403).json({ error: 'Solo gli admin possono accedere a questa sezione' });
  }

  // Ottieni il tenant di appartenenza
  const { data: membership } = await supabaseAdmin
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  req.user = user;
  req.profile = profile;
  req.tenantId = membership?.tenant_id || profile.company_id;
  req.supabaseAdmin = supabaseAdmin;
  next();
}

// GET /api/staff/members - Lista membri dello staff
router.get('/members', adminMiddleware, async (req, res) => {
  try {
    const { tenantId, supabaseAdmin } = req;

    if (!tenantId) {
      return res.status(400).json({ error: 'Nessun tenant associato' });
    }

    // Ottieni tutti i membri del tenant con i loro profili
    const { data: members, error } = await supabaseAdmin
      .from('tenant_members')
      .select(`
        id,
        role,
        user_id,
        created_at,
        profiles!inner(user_id, email, full_name, role as profile_role, company_id)
      `)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Errore recupero membri:', error);
      return res.status(500).json({ error: error.message });
    }

    // Ottieni le configurazioni dei permessi
    const { data: permissions } = await supabaseAdmin
      .from('permissions_config')
      .select('*');

    // Ottieni i token di accesso per ogni membro
    const memberIds = members.map(m => m.profiles?.user_id).filter(Boolean);
    const { data: tokens } = await supabaseAdmin
      .from('access_tokens')
      .select('profile_id, token, is_used, expires_at, created_at')
      .in('profile_id', memberIds)
      .order('created_at', { ascending: false });

    // Mappa i dati
    const result = members.map(m => {
      const profile = m.profiles || {};
      const userTokens = tokens?.filter(t => t.profile_id === profile.user_id) || [];
      return {
        membershipId: m.id,
        userId: profile.user_id || m.user_id,
        email: profile.email || '',
        fullName: profile.full_name || '',
        role: m.role,
        profileRole: profile.profile_role || 'member',
        createdAt: m.created_at,
        permissions: permissions || [],
        accessTokens: userTokens,
      };
    });

    res.json({ members: result, permissions });
  } catch (err) {
    console.error('GET /members exception:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/staff/permissions - Aggiorna ruolo e permessi di un membro
router.put('/permissions', adminMiddleware, async (req, res) => {
  try {
    const { tenantId, supabaseAdmin } = req;
    const { userId, role, visibleTables, enabledFeatures } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId obbligatorio' });
    }

    // Aggiorna il ruolo nel profilo
    if (role) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ role })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Errore aggiornamento ruolo profilo:', profileError);
        return res.status(500).json({ error: profileError.message });
      }
    }

    // Se vengono specificate tabelle/funzionalità personalizzate, crea/aggiorna permissions_config
    if (visibleTables || enabledFeatures) {
      // Per ora salviamo le preferenze personalizzate in una tabella user_permissions
      // che estende permissions_config
      const { data: existing } = await supabaseAdmin
        .from('user_permissions')
        .select('id')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (existing) {
        await supabaseAdmin
          .from('user_permissions')
          .update({
            visible_tables: visibleTables || [],
            enabled_features: enabledFeatures || [],
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabaseAdmin
          .from('user_permissions')
          .insert({
            user_id: userId,
            tenant_id: tenantId,
            visible_tables: visibleTables || [],
            enabled_features: enabledFeatures || [],
          });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /permissions exception:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff/generate-token - Genera token di accesso
router.post('/generate-token', adminMiddleware, async (req, res) => {
  try {
    const { supabaseAdmin, user } = req;
    const { userId, email } = req.body;

    if (!userId && !email) {
      return res.status(400).json({ error: 'userId o email obbligatorio' });
    }

    let targetUserId = userId;
    let targetProfileId = null;

    if (!targetUserId && email) {
      // Trova utente tramite email nel profilo
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('user_id, id')
        .eq('email', email)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }
      targetUserId = profile.user_id;
      targetProfileId = profile.id;
    } else {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();
      targetProfileId = profile?.id;
    }

    if (!targetProfileId) {
      return res.status(404).json({ error: 'Profilo non trovato' });
    }

    // Verifica che l'utente appartenga allo stesso tenant
    const { data: membership } = await supabaseAdmin
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', targetUserId)
      .limit(1)
      .single();

    if (!membership) {
      return res.status(400).json({ error: 'Utente non appartiene a un tenant' });
    }

    // Genera token univoco
    const token = crypto.randomBytes(32).toString('hex');

    // Salva token
    const { data: accessToken, error } = await supabaseAdmin
      .from('access_tokens')
      .insert({
        token,
        profile_id: targetProfileId,
        tenant_id: membership.tenant_id,
        created_by: user.id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Errore creazione token:', error);
      return res.status(500).json({ error: error.message });
    }

    // Costruisci link di accesso
    const baseUrl = process.env.APP_URL || 'https://zeusx-zwu8.vercel.app';
    const accessLink = `${baseUrl}/auth/token-login?token=${token}`;

    res.json({
      success: true,
      accessToken: accessToken,
      accessLink,
      token,
    });
  } catch (err) {
    console.error('POST /generate-token exception:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/token-login - Login tramite token (redirect alla dashboard)
router.get('/token-login', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.redirect('/login?error=token_mancante');
    }

    const supabaseAdmin = getSupabase();

    // Verifica token
    const { data: accessToken, error } = await supabaseAdmin
      .from('access_tokens')
      .select('*, profiles!inner(user_id)')
      .eq('token', token)
      .single();

    if (error || !accessToken) {
      return res.redirect('/login?error=token_non_valido');
    }

    if (accessToken.is_used) {
      return res.redirect('/login?error=token_già_utilizzato');
    }

    if (new Date(accessToken.expires_at) < new Date()) {
      return res.redirect('/login?error=token_scaduto');
    }

    // Marca come utilizzato
    await supabaseAdmin
      .from('access_tokens')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', accessToken.id);

    // Reindirizza alla pagina di login con email precompilata
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', accessToken.profile_id)
      .single();

    const email = profile?.email || '';
    res.redirect(`/login?email=${encodeURIComponent(email)}&token_used=true`);
  } catch (err) {
    console.error('GET /token-login exception:', err);
    res.redirect('/login?error=errore_verifica_token');
  }
});

module.exports = router;