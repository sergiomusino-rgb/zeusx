import { NextRequest, NextResponse } from 'next/server';

// Dati di esempio per le fatture (stessi di route.ts)
const mockFatture = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    numero_fattura: '001',
    anno: 2026,
    data_emissione: '2026-07-01',
    cliente_nome: 'Rossi Srl',
    cliente_piva: 'IT01234567890',
    cliente_indirizzo: 'Via Roma 1, Milano',
    stato: 'emessa',
    metodo_pagamento: 'bonifico',
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-07-01T10:00:00Z',
  },
  {
    id: '2',
    tenant_id: 'tenant-1',
    numero_fattura: '002',
    anno: 2026,
    data_emissione: '2026-07-02',
    cliente_nome: 'Bianchi Spa',
    cliente_piva: 'IT09876543210',
    cliente_indirizzo: 'Via Milano 2, Roma',
    stato: 'pagata',
    metodo_pagamento: 'f24',
    created_at: '2026-07-02T10:00:00Z',
    updated_at: '2026-07-02T10:00:00Z',
  },
  {
    id: '3',
    tenant_id: 'tenant-1',
    numero_fattura: '003',
    anno: 2026,
    data_emissione: '2026-07-03',
    cliente_nome: 'Verdi & Co',
    cliente_piva: 'IT11223344556',
    cliente_indirizzo: 'Via Napoli 3, Torino',
    stato: 'bozza',
    metodo_pagamento: null,
    created_at: '2026-07-03T10:00:00Z',
    updated_at: '2026-07-03T10:00:00Z',
  },
];

// Righe di esempio
const mockRighe: Record<string, any[]> = {
  '1': [
    { id: '1', fattura_id: '1', descrizione: 'Servizio A', quantita: 10, prezzo_unitario: 50, aliquota_iva: 22 },
    { id: '2', fattura_id: '1', descrizione: 'Prodotto B', quantita: 5, prezzo_unitario: 100, aliquota_iva: 22 },
  ],
  '2': [
    { id: '3', fattura_id: '2', descrizione: 'Consulenza', quantita: 20, prezzo_unitario: 75, aliquota_iva: 22 },
  ],
  '3': [
    { id: '4', fattura_id: '3', descrizione: 'Servizio C', quantita: 1, prezzo_unitario: 500, aliquota_iva: 22 },
  ],
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    // Verifica autorizzazione
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token di autorizzazione mancante' },
        { status: 401 }
      );
    }

    const fatturaId = params.id;
    const fattura = mockFatture.find(f => f.id === fatturaId);

    if (!fattura) {
      return NextResponse.json(
        { error: 'Fattura non trovata' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      fattura,
      righe: mockRighe[fatturaId] || [],
    });
  } catch (error) {
    console.error('Errore API fattura:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}