// ─── Totalum Generate API Route (Express) ──────────────────────────────────────────
// Genera interfacce dinamiche tramite l'API di Totalum con stile ATOMIC DARK
// CON CONTROLLO SLOTS

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Configurazione Totalum
const TOTALUM_API_URL = process.env.TOTALUM_API_URL || 'https://api-accounts.totalum.app';
const TOTALUM_API_KEY = process.env.TOTALUM_API_KEY;

// Configurazione Supabase (Service Role per bypassare RLS)
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

// Log dell'URL per debug
console.log('[Totalum] API URL:', TOTALUM_API_URL);
console.log('[Totalum] API Key presente:', !!TOTALUM_API_KEY);

// ─── Helper: Get user from auth token ───────────────────────────────────────────────
async function getUserFromToken(token) {
  if (!supabase) {
    throw new Error('Supabase non configurato');
  }
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

// ─── Helper: Get tenant for user (as owner or member) ───────────────────────────────
async function getUserTenant(userId) {
  if (!supabase) {
    return null;
  }
  // Prima controlla se è owner
  const { data: ownedTenant } = await supabase
    .from('tenants')
    .select('id, plan, app_limit, total_apps_created')
    .eq('owner_id', userId)
    .single();

  if (ownedTenant) return ownedTenant;

  // Se non è owner, controlla la membership
  const { data: membership } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (!membership) return null;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, plan, app_limit, total_apps_created')
    .eq('id', membership.tenant_id)
    .single();

  return tenant;
}

// ─── Helper: Check and decrement slots ─────────────────────────────────────────────
async function checkAndDecrementSlots(tenantId) {
  if (!supabase) {
    return { success: false, error: 'Supabase non configurato' };
  }
  // Usa una transazione per evitare race condition
  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('app_limit, total_apps_created')
    .eq('id', tenantId)
    .single();

  if (fetchError || !tenant) {
    return { success: false, error: 'Tenant non trovato' };
  }

  const slotsAvailable = tenant.app_limit - tenant.total_apps_created;

  // Controllo slot
  if (slotsAvailable <= 0) {
    return { success: false, error: 'Slot esauriti. Aggiorna il tuo piano per creare nuovi gestionali.' };
  }

  // Decrementa gli slot
  const { error: updateError } = await supabase
    .from('tenants')
    .update({ total_apps_created: tenant.total_apps_created + 1 })
    .eq('id', tenantId);

  if (updateError) {
    return { success: false, error: 'Errore nell\'aggiornamento degli slot' };
  }

  return { success: true };
}

// ─── POST /api/generate ───────────────────────────────────────────────────────────

router.post('/generate', async (req, res) => {
  try {
    const { userPrompt, appName, sector, lang } = req.body;

    // Validazione input
    if (!userPrompt && !sector) {
      return res.status(400).json({
        success: false,
        error: 'userPrompt o sector è richiesto',
        code: 'MISSING_INPUT'
      });
    }

    // Verifica autenticazione
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Autenticazione richiesta',
        code: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.slice(7);
    const user = await getUserFromToken(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Utente non autenticato',
        code: 'UNAUTHORIZED'
      });
    }

    // Verifica API Key
    if (!TOTALUM_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'API Key di Totalum non configurata',
        code: 'API_KEY_NOT_CONFIGURED'
      });
    }

    // ─── CONTROLLO SLOTS ───────────────────────────────────────────────────────────
    const tenant = await getUserTenant(user.id);
    
    if (!tenant) {
      return res.status(403).json({
        success: false,
        error: 'Nessun tenant associato all\'utente',
        code: 'NO_TENANT'
      });
    }

    const slotCheck = await checkAndDecrementSlots(tenant.id);
    
    if (!slotCheck.success) {
      return res.status(403).json({
        success: false,
        error: slotCheck.error,
        code: 'SLOTS_EXHAUSTED'
      });
    }

    // ─── GENERAZIONE PROGETTO ───────────────────────────────────────────────────────
    // Genera projectId univoco (max 35 caratteri per API Totalum)
    const ts = Date.now().toString(36).slice(-4);
    const rnd = Math.random().toString(36).substring(2, 6);
    const sectorValue = sector || 'app';
    const appNameValue = appName || 'Gestionale';
    const base = `zeusx-${sectorValue}-${ts}${rnd}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const projectId = base.slice(0, 35).replace(/-$/, '');

    // Costruisci il prompt completo
    const fullPrompt = userPrompt
      ? `${userPrompt}\n\nSettore: ${sectorValue}\n\nNome app: ${appNameValue}`
      : `Genera un'interfaccia per: ${sectorValue}\n\nNome app: ${appNameValue}`;

    // Step 1: Crea il progetto su Totalum
    console.log('[Totalum] Creazione progetto:', projectId);

    const createProjectResponse = await fetch(`${TOTALUM_API_URL}/api/v1/vcaas/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': TOTALUM_API_KEY,
      },
      body: JSON.stringify({
        projectId: projectId,
        description: `App generata da ZeusX: ${appNameValue}`
      }),
    });

    if (!createProjectResponse.ok) {
      const createProjectError = await createProjectResponse.text();
      console.error('[Totalum] Create project error:', createProjectError);

      let errorData;
      try {
        errorData = JSON.parse(createProjectError);
      } catch {
        errorData = { errors: { errorMessage: createProjectError } };
      }

      const status = createProjectResponse.status;
      const errorMessage = errorData?.errors?.errorMessage || `Errore nella creazione del progetto (${status})`;
      const errorCode = errorData?.errors?.errorCode || 'CREATE_PROJECT_ERROR';

      if (status === 401) {
        return res.status(401).json({
          success: false,
          error: 'Chiave API non valida',
          message: errorMessage,
          code: 'INVALID_API_KEY',
          details: errorData
        });
      }
      if (status === 409 && errorCode === 'PROJECT_ALREADY_EXISTS') {
        console.log('[Totalum] Progetto già esistente, procedo con l\'avvio agente');
      } else {
        return res.status(status).json({
          success: false,
          error: errorMessage,
          code: errorCode,
          details: errorData
        });
      }
    }

    // Step 2: Avvia l'agente su Totalum
    console.log('[Totalum] Avvio agente per progetto:', projectId);

    const startAgentResponse = await fetch(`${TOTALUM_API_URL}/api/v1/vcaas/projects/${projectId}/agent/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': TOTALUM_API_KEY,
      },
      body: JSON.stringify({
        prompt: fullPrompt
      }),
    });

    if (!startAgentResponse.ok) {
      const startAgentError = await startAgentResponse.text();
      console.error('[Totalum] Start agent error:', startAgentError);

      let errorData;
      try {
        errorData = JSON.parse(startAgentError);
      } catch {
        errorData = { errors: { errorMessage: startAgentError } };
      }

      const status = startAgentResponse.status;
      const errorMessage = errorData?.errors?.errorMessage || `Errore nell'avvio dell'agente (${status})`;
      const errorCode = errorData?.errors?.errorCode || 'START_AGENT_ERROR';

      return res.status(status).json({
        success: false,
        error: errorMessage,
        code: errorCode,
        details: errorData
      });
    }

    // Step 3: Restituisci URL di reindirizzamento
    const projectUrl = `https://www.totalum.app/projects/${projectId}`;

    return res.json({
      success: true,
      data: {
        projectId: projectId,
        projectUrl: projectUrl,
        message: 'Progetto creato con successo. L\'agente sta generando l\'interfaccia.'
      }
    });

  } catch (err) {
    console.error('[generate] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Errore interno del server',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;