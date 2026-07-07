const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

// POST /api/invoices - Crea una nuova fattura con le sue righe
router.post('/api/invoices', async (req, res) => {
  try {
    const {
      tenant_id,
      numero_fattura,
      anno,
      data_emissione,
      cliente_nome,
      cliente_piva,
      cliente_indirizzo,
      stato,
      metodo_pagamento,
      righe
    } = req.body;

    if (!tenant_id || !numero_fattura || !anno || !data_emissione || !cliente_nome || !righe || !Array.isArray(righe) || righe.length === 0) {
      return res.status(400).json({ error: 'Campi obbligatori mancanti o righe non valide' });
    }

    const supabase = getSupabase();

    // Inserisci la fattura
    const { data: fattura, error: fatturaError } = await supabase
      .from('fatture')
      .insert({
        tenant_id,
        numero_fattura,
        anno,
        data_emissione,
        cliente_nome,
        cliente_piva,
        cliente_indirizzo,
        stato: stato || 'bozza',
        metodo_pagamento: metodo_pagamento || null,
      })
      .select()
      .single();

    if (fatturaError || !fattura) {
      console.error('Errore inserimento fattura:', fatturaError);
      return res.status(500).json({ error: fatturaError?.message || 'Errore creazione fattura' });
    }

    // Inserisci le righe collegate
    const righeDaInserire = righe.map((r) => ({
      fattura_id: fattura.id,
      descrizione: r.descrizione,
      quantita: r.quantita,
      prezzo_unitario: r.prezzo_unitario,
      aliquota_iva: r.aliquota_iva || 22,
    }));

    const { data: righeInserite, error: righeError } = await supabase
      .from('righe_fattura')
      .insert(righeDaInserire)
      .select();

    if (righeError) {
      console.error('Errore inserimento righe fattura:', righeError);
      // Opzionale: elimina la fattura se le righe falliscono
      await supabase.from('fatture').delete().eq('id', fattura.id);
      return res.status(500).json({ error: righeError?.message || 'Errore salvataggio righe' });
    }

    return res.status(201).json({
      success: true,
      fattura,
      righe: righeInserite,
    });
  } catch (err) {
    console.error('POST /api/invoices error:', err);
    res.status(500).json({ error: err.message || 'Errore interno' });
  }
});

// GET /api/invoices/:id - Recupera fattura con righe
router.get('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabase();

    const { data: fattura, error: fatturaError } = await supabase
      .from('fatture')
      .select('*')
      .eq('id', id)
      .single();

    if (fatturaError || !fattura) {
      return res.status(404).json({ error: 'Fattura non trovata' });
    }

    const { data: righe, error: righeError } = await supabase
      .from('righe_fattura')
      .select('*')
      .eq('fattura_id', id)
      .order('id', { ascending: true });

    if (righeError) {
      console.error('Errore caricamento righe fattura:', righeError);
      return res.status(500).json({ error: righeError?.message || 'Errore caricamento righe' });
    }

    return res.json({
      success: true,
      fattura,
      righe: righe || [],
    });
  } catch (err) {
    console.error('GET /api/invoices/:id error:', err);
    res.status(500).json({ error: err.message || 'Errore interno' });
  }
});

module.exports = router;